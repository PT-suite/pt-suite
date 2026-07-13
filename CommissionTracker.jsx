import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Phone, Trash2, Pencil, ChevronLeft, ChevronRight, Download, X, Check, Dumbbell, History, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { TIER_INFO, TIER_ORDER } from "./tiers";
import { fetchClientsFromSheet, pushClientsToSheet } from "./sheetSync";

function pad(n) { return String(n).padStart(2, "0"); }
function toKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtShort(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
function fmtFull(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

function getCycle(offset, ref) {
  const day = ref.getDate();
  let cycleMonth = ref.getMonth() + (day >= 19 ? 0 : -1);
  cycleMonth += offset;
  const start = new Date(ref.getFullYear(), cycleMonth, 19);
  const end = new Date(ref.getFullYear(), cycleMonth + 1, 18);
  return { start, end };
}

function inRange(dateKey, start, end) {
  const d = fromKey(dateKey);
  return d >= start && d <= end;
}

function seedClients() {
  const raw = [
    ["Abdulrahman S KH Almutairi", "97323202", "t2", 5],
    ["Fahad Alfulaij", "55858877", "t3", 8],
    ["Mustafa Muwafaq Almanee", "95512282", "t2", 3],
    ["Fuad Ali Almatrouk", "55396104", "t3", 5],
    ["Yahya Adnan Sadeqi", "98828829", "t1", 0],
    ["Faisal Aujan", "96000800", "t3", 2],
    ["Ali Hussain Yaqoub Bahzad", "99408255", "t3", 7],
    ["Abdulaziz Al Babtain", "55888811", "t2", 7],
    ["Abdulwahab Alkhulaifi", "60718578", "t2", 11],
    ["Mohammad Naseeb", "97528695", "premium", 1],
    ["Ebrahim Albader Albader", "90015910", "t2", 3],
    ["Hamad Sadiqi", "96716266", "t2", 3],
    ["Bader Yousef Alawadhi", "98866304", "t3", 3],
  ];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = toKey(yesterday);
  return raw.map(([name, phone, tier, sessions], i) => ({
    id: `seed-${i}`,
    name,
    phone,
    tier,
    log: Array.from({ length: sessions }, (_, j) => ({ id: `seed-${i}-${j}`, date: yKey })),
  }));
}

const inputStyle = { background: "#1B1F27", border: "1px solid #2C323E", color: "#F4F1EA" };
const SORT_OPTIONS = [
  { key: "name", label: "A–Z" },
  { key: "price", label: "Price / session" },
  { key: "sessions", label: "Sessions" },
];

export default function CommissionTracker() {
  const [clients, setClients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cycleOffset, setCycleOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [addDateDraft, setAddDateDraft] = useState({});
  const [sortKey, setSortKey] = useState("name");
  const [form, setForm] = useState({ name: "", phone: "", tier: "t1" });
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error | unconfigured
  const [lastSynced, setLastSynced] = useState(null);
  const didInitialLoad = useRef(false);

  useEffect(() => {
    (async () => {
      let localClients = null;
      try {
        const res = await window.storage.get("clients", false);
        localClients = res && res.value ? JSON.parse(res.value) : null;
      } catch (e) {
        localClients = null;
      }

      setSyncStatus("syncing");
      try {
        const sheetClients = await fetchClientsFromSheet();
        if (sheetClients.length > 0) {
          setClients(sheetClients);
          window.storage.set("clients", JSON.stringify(sheetClients), false).catch(() => {});
          setSyncStatus("synced");
          setLastSynced(new Date());
        } else {
          setClients(localClients || seedClients());
          setSyncStatus("synced");
          setLastSynced(new Date());
        }
      } catch (e) {
        setClients(localClients || seedClients());
        setSyncStatus("unconfigured");
      }
      setLoading(false);
      didInitialLoad.current = true;
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setClients(next);
    try {
      await window.storage.set("clients", JSON.stringify(next), false);
    } catch (e) {
      console.error("local storage error", e);
    }
    setSyncStatus("syncing");
    try {
      await pushClientsToSheet(next);
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (e) {
      console.error("sheet sync error", e);
      setSyncStatus("error");
    }
  }, []);

  async function retrySync() {
    if (!clients) return;
    setSyncStatus("syncing");
    try {
      await pushClientsToSheet(clients);
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (e) {
      setSyncStatus("error");
    }
  }

  const cycle = useMemo(() => getCycle(cycleOffset, new Date()), [cycleOffset]);
  const isCurrentCycle = cycleOffset === 0;

  const rows = useMemo(() => {
    if (!clients) return [];
    const withCommission = clients.map((c) => {
      const sessions = c.log.filter((e) => inRange(e.date, cycle.start, cycle.end)).length;
      const rate = TIER_INFO[c.tier].rate;
      return { ...c, sessions, commission: +(sessions * rate).toFixed(3) };
    });
    const sorted = [...withCommission];
    if (sortKey === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "price") sorted.sort((a, b) => TIER_INFO[a.tier].rate - TIER_INFO[b.tier].rate);
    if (sortKey === "sessions") sorted.sort((a, b) => a.sessions - b.sessions);
    return sorted;
  }, [clients, cycle, sortKey]);

  const totalCommission = useMemo(() => +rows.reduce((s, r) => s + r.commission, 0).toFixed(3), [rows]);
  const totalSessions = useMemo(() => rows.reduce((s, r) => s + r.sessions, 0), [rows]);

  function addSessionToday(clientId) {
    if (!isCurrentCycle) return;
    addSessionForDate(clientId, toKey(new Date()));
  }

  function addSessionForDate(clientId, dateStr) {
    if (!dateStr) return;
    const next = clients.map((c) =>
      c.id === clientId ? { ...c, log: [...c.log, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: dateStr }] } : c
    );
    persist(next);
  }

  function updateEntryDate(clientId, entryId, newDate) {
    if (!newDate) return;
    const next = clients.map((c) =>
      c.id === clientId ? { ...c, log: c.log.map((e) => (e.id === entryId ? { ...e, date: newDate } : e)) } : c
    );
    persist(next);
    setEditingEntry(null);
  }

  function deleteLogEntry(clientId, entryId) {
    const next = clients.map((c) => (c.id === clientId ? { ...c, log: c.log.filter((e) => e.id !== entryId) } : c));
    persist(next);
  }

  function openAdd() {
    setForm({ name: "", phone: "", tier: "t1" });
    setEditingClient(null);
    setShowAdd(true);
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone, tier: c.tier });
    setEditingClient(c.id);
    setShowAdd(true);
  }

  function saveForm() {
    if (!form.name.trim()) return;
    if (editingClient) {
      persist(clients.map((c) => (c.id === editingClient ? { ...c, ...form } : c)));
    } else {
      persist([...clients, { id: `${Date.now()}`, ...form, log: [] }]);
    }
    setShowAdd(false);
  }

  function deleteClient(id) {
    persist(clients.filter((c) => c.id !== id));
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const header = ["Client", "Contact No.", "Package", "Sessions This Cycle", "Rate (KWD)", "Commission (KWD)"];
    const data = rows.map((r) => [r.name, r.phone, TIER_INFO[r.tier].full, r.sessions, TIER_INFO[r.tier].rate, r.commission]);
    data.push([]);
    data.push(["TOTAL", "", "", totalSessions, "", totalCommission]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commission");
    XLSX.writeFile(wb, `commission_${toKey(cycle.start)}_to_${toKey(cycle.end)}.xlsx`);
  }

  if (loading) {
    return (
      <div style={{ background: "#12151A", minHeight: "100vh" }} className="flex items-center justify-center">
        <div style={{ color: "#8B93A1" }}>Loading…</div>
      </div>
    );
  }

  const syncLabel = {
    syncing: "Syncing…",
    synced: lastSynced ? `Synced ${fmtShort(lastSynced)} ${pad(lastSynced.getHours())}:${pad(lastSynced.getMinutes())}` : "Synced",
    error: "Sync failed — tap to retry",
    unconfigured: "Sheet not connected — using local data",
    idle: "",
  }[syncStatus];

  return (
    <div style={{ background: "#12151A", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.03em; }
        .plate {
          border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          border: 3px solid rgba(255,255,255,0.15);
        }
        .grid-floor {
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>

      <div className="grid-floor" style={{ borderBottom: "1px solid #232833" }}>
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Dumbbell size={20} color="#F2A93B" />
              <span style={{ color: "#8B93A1", fontSize: 13, letterSpacing: "0.08em" }}>PT COMMISSION</span>
            </div>
            <button
              onClick={syncStatus === "error" ? retrySync : undefined}
              style={{ color: syncStatus === "synced" ? "#47C9B6" : syncStatus === "error" ? "#E85D75" : "#8B93A1" }}
              className="flex items-center gap-1 text-[11px]"
            >
              {syncStatus === "syncing" ? <RefreshCw size={11} className="animate-spin" /> : syncStatus === "unconfigured" ? <CloudOff size={11} /> : <Cloud size={11} />}
              {syncLabel}
            </button>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="display-font" style={{ color: "#F4F1EA", fontSize: 52, lineHeight: 1 }}>
                {totalCommission.toFixed(3)} <span style={{ fontSize: 24, color: "#8B93A1" }}>KWD</span>
              </div>
              <div style={{ color: "#8B93A1", fontSize: 13, marginTop: 4 }}>
                {totalSessions} sessions completed this cycle
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCycleOffset((o) => o - 1)} style={{ color: "#8B93A1" }} className="p-2 hover:text-white">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center" style={{ minWidth: 150 }}>
                <div style={{ color: "#F4F1EA", fontSize: 13, fontWeight: 600 }}>
                  {fmtShort(cycle.start)} – {fmtFull(cycle.end)}
                </div>
                {!isCurrentCycle && <div style={{ color: "#F2A93B", fontSize: 11 }}>past cycle</div>}
              </div>
              <button
                onClick={() => setCycleOffset((o) => Math.min(o + 1, 0))}
                disabled={isCurrentCycle}
                style={{ color: isCurrentCycle ? "#3A404C" : "#8B93A1" }}
                className="p-2 hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-2.5 flex-wrap">
            {TIER_ORDER.map((t) => (
              <div key={t} className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: "#8B93A1" }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: TIER_INFO[t].color, display: "inline-block" }} />
                {TIER_INFO[t].label} · {TIER_INFO[t].rate}KD
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel} style={{ color: "#8B93A1", border: "1px solid #2C323E" }} className="p-2 rounded-lg hover:text-white flex items-center gap-1 text-xs">
              <Download size={14} /> Export
            </button>
            {isCurrentCycle && (
              <button onClick={openAdd} style={{ background: "#F2A93B", color: "#12151A" }} className="px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-semibold">
                <Plus size={16} /> Client
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          <span style={{ color: "#8B93A1", fontSize: 11 }}>Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              style={{
                background: sortKey === opt.key ? "#F2A93B22" : "transparent",
                border: `1px solid ${sortKey === opt.key ? "#F2A93B" : "#2C323E"}`,
                color: sortKey === opt.key ? "#F2A93B" : "#8B93A1",
              }}
              className="px-2.5 py-1 rounded-md text-[11px]"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {rows.map((c) => {
            const tier = TIER_INFO[c.tier];
            const expanded = expandedId === c.id;
            const cycleEntries = c.log
              .filter((e) => inRange(e.date, cycle.start, cycle.end))
              .sort((a, b) => (a.date < b.date ? 1 : -1));
            return (
              <div key={c.id} style={{ background: "#1B1F27", border: "1px solid #232833" }} className="rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className="plate"
                    style={{ width: 44, height: 44, background: tier.color + "22", color: tier.color, borderColor: tier.color + "55", fontSize: 14, flexShrink: 0 }}
                  >
                    {tier.rate}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: "#F4F1EA", fontWeight: 600, fontSize: 14.5 }} className="truncate">{c.name}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <a href={`tel:${c.phone}`} style={{ color: "#8B93A1", fontSize: 12 }} className="flex items-center gap-1 hover:text-white">
                        <Phone size={11} /> {c.phone}
                      </a>
                      <span style={{ color: tier.color, fontSize: 11 }}>{tier.label}</span>
                    </div>
                  </div>
                  <div className="text-right" style={{ minWidth: 70 }}>
                    <div className="display-font" style={{ color: "#F4F1EA", fontSize: 22 }}>{c.sessions}</div>
                    <div style={{ color: "#8B93A1", fontSize: 10.5 }}>{c.commission.toFixed(2)} KD</div>
                  </div>
                  {isCurrentCycle && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => addSessionToday(c.id)} style={{ background: "#232833", color: "#F2A93B" }} className="w-7 h-7 rounded-md flex items-center justify-center text-lg leading-none">+</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 pl-14">
                  <button onClick={() => setExpandedId(expanded ? null : c.id)} style={{ color: "#8B93A1", fontSize: 11 }} className="flex items-center gap-1 hover:text-white">
                    <History size={11} /> {expanded ? "hide" : "sessions"} ({c.log.length})
                  </button>
                  <button onClick={() => openEdit(c)} style={{ color: "#8B93A1", fontSize: 11 }} className="flex items-center gap-1 hover:text-white">
                    <Pencil size={11} /> edit
                  </button>
                  <button onClick={() => deleteClient(c.id)} style={{ color: "#8B93A1", fontSize: 11 }} className="flex items-center gap-1 hover:text-red-400">
                    <Trash2 size={11} /> remove
                  </button>
                </div>
                {expanded && (
                  <div className="pl-14 mt-2">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {c.log.length === 0 && <span style={{ color: "#8B93A1", fontSize: 11 }}>No sessions logged yet.</span>}
                      {[...c.log].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e) => (
                        <span key={e.id} style={{ background: "#232833" }} className="flex items-center gap-1 px-2 py-1 rounded-md">
                          {editingEntry === e.id ? (
                            <input
                              type="date"
                              autoFocus
                              defaultValue={e.date}
                              onBlur={(ev) => updateEntryDate(c.id, e.id, ev.target.value)}
                              onChange={(ev) => updateEntryDate(c.id, e.id, ev.target.value)}
                              style={{ background: "transparent", color: "#F4F1EA", fontSize: 10.5, border: "none", outline: "none", width: 110 }}
                            />
                          ) : (
                            <button onClick={() => setEditingEntry(e.id)} style={{ color: "#8B93A1", fontSize: 10.5 }}>
                              {fmtShort(fromKey(e.date))}
                            </button>
                          )}
                          <button onClick={() => deleteLogEntry(c.id, e.id)} style={{ color: "#5A6270" }}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={addDateDraft[c.id] || toKey(new Date())}
                        onChange={(e) => setAddDateDraft({ ...addDateDraft, [c.id]: e.target.value })}
                        style={inputStyle}
                        className="rounded-md px-2 py-1 text-xs outline-none"
                      />
                      <button
                        onClick={() => addSessionForDate(c.id, addDateDraft[c.id] || toKey(new Date()))}
                        style={{ background: "#232833", color: "#F2A93B" }}
                        className="px-2.5 py-1 rounded-md text-xs flex items-center gap-1"
                      >
                        <Plus size={11} /> add session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ color: "#8B93A1" }} className="text-center py-10 text-sm">No clients yet. Add your first one.</div>}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}>
          <div style={{ background: "#1B1F27", border: "1px solid #2C323E" }} className="rounded-xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div style={{ color: "#F4F1EA", fontWeight: 600 }}>{editingClient ? "Edit Client" : "Add Client"}</div>
              <button onClick={() => setShowAdd(false)} style={{ color: "#8B93A1" }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label style={{ color: "#8B93A1", fontSize: 12 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 text-sm outline-none" />
              </div>
              <div>
                <label style={{ color: "#8B93A1", fontSize: 12 }}>Contact No.</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 text-sm outline-none" />
              </div>
              <div>
                <label style={{ color: "#8B93A1", fontSize: 12 }}>Package</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {TIER_ORDER.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, tier: t })}
                      style={{
                        background: form.tier === t ? TIER_INFO[t].color + "22" : "#12151A",
                        border: `1px solid ${form.tier === t ? TIER_INFO[t].color : "#2C323E"}`,
                        color: form.tier === t ? TIER_INFO[t].color : "#8B93A1",
                      }}
                      className="rounded-lg py-2 text-xs"
                    >
                      {TIER_INFO[t].full} · {TIER_INFO[t].rate}KD
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={saveForm} style={{ background: "#F2A93B", color: "#12151A" }} className="w-full rounded-lg py-2.5 mt-5 font-semibold flex items-center justify-center gap-1 text-sm">
              <Check size={16} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
