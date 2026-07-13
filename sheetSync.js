import { TIER_INFO, tierKeyFromLabel } from "./tiers";

// Sheet layout (tab set by GOOGLE_SHEET_TAB, defaults to "Clients"):
//   A: Name   B: Phone   C: Package (full label)   D: Session Dates (comma-separated YYYY-MM-DD)
// Row 1 is a header row; data starts at row 2.

export async function fetchClientsFromSheet() {
  const res = await fetch("/api/sheet");
  if (!res.ok) throw new Error(`sheet read failed (${res.status})`);
  const { values } = await res.json();
  return (values || [])
    .filter((row) => row && row[0])
    .map((row, i) => {
      const [name, phone = "", packageLabel = "", datesCell = ""] = row;
      const tier = tierKeyFromLabel(packageLabel);
      const dates = datesCell
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      return {
        id: `sheet-${i}-${name}`,
        name,
        phone,
        tier,
        log: dates.map((date, j) => ({ id: `sheet-${i}-${j}`, date })),
      };
    });
}

export async function pushClientsToSheet(clients) {
  const rows = clients.map((c) => [
    c.name,
    c.phone,
    TIER_INFO[c.tier] ? TIER_INFO[c.tier].full : c.tier,
    c.log.map((e) => e.date).join(","),
  ]);
  const res = await fetch("/api/sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(`sheet write failed (${res.status})`);
  return res.json();
}
