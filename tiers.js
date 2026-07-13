export const TIER_INFO = {
  t1: { label: "1–10 / mo", full: "1–10 Sessions", rate: 10, color: "#F2A93B" },
  t2: { label: "11–20 / mo", full: "11–20 Sessions", rate: 8.5, color: "#47C9B6" },
  t3: { label: "21+ / mo", full: "21+ Sessions", rate: 7.5, color: "#7C93F2" },
  premium: { label: "Premium", full: "Premium Consultation", rate: 15, color: "#E85D75" },
  nutrition: { label: "Nutrition", full: "Nutrition Consultation", rate: 17.7, color: "#8BD17C" },
  consult: { label: "Consultation", full: "Normal Consultation", rate: 10, color: "#9AA5B1" },
};

export const TIER_ORDER = ["t1", "t2", "t3", "premium", "nutrition", "consult"];

export function tierKeyFromLabel(label) {
  const entry = Object.entries(TIER_INFO).find(([, v]) => v.full === label);
  return entry ? entry[0] : "t1";
}
