// Polyfills the window.storage API (get/set/delete/list) that the components
// were originally built against inside Claude, using the browser's
// localStorage instead. This means each tool's data lives in the browser
// it's opened in — it won't sync across your phone and laptop unless you
// swap this file out for a real backend (e.g. Vercel KV, Supabase) later.

const PREFIX = "ptsuite:";

function fullKey(key, shared) {
  return `${PREFIX}${shared ? "shared" : "personal"}:${key}`;
}

export const storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(fullKey(key, shared));
    if (raw === null) throw new Error(`key not found: ${key}`);
    return { key, value: raw, shared };
  },
  async set(key, value, shared = false) {
    localStorage.setItem(fullKey(key, shared), value);
    return { key, value, shared };
  },
  async delete(key, shared = false) {
    localStorage.removeItem(fullKey(key, shared));
    return { key, deleted: true, shared };
  },
  async list(prefix = "", shared = false) {
    const scanPrefix = fullKey(prefix, shared);
    const stripLen = fullKey("", shared).length;
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith(scanPrefix))
      .map((k) => k.slice(stripLen));
    return { keys, prefix, shared };
  },
};

if (typeof window !== "undefined") {
  window.storage = storage;
}
