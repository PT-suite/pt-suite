import { google } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google service account env vars are not set");
  return new google.auth.JWT(email, null, key, ["https://www.googleapis.com/auth/spreadsheets"]);
}

const DATA_RANGE_ROWS = 500; // generous headroom for client list growth
const HEADER = ["Name", "Phone", "Package", "Session Dates"];

export default async function handler(req, res) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB || "Clients";
  if (!spreadsheetId) {
    return res.status(500).json({ error: "GOOGLE_SHEET_ID is not set" });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    if (req.method === "GET") {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!A2:D${DATA_RANGE_ROWS + 1}`,
      });
      return res.status(200).json({ values: result.data.values || [] });
    }

    if (req.method === "POST") {
      const { rows } = req.body || {};
      if (!Array.isArray(rows)) return res.status(400).json({ error: "rows must be an array" });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A1:D1`,
        valueInputOption: "RAW",
        requestBody: { values: [HEADER] },
      });

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${tab}!A2:D${DATA_RANGE_ROWS + 1}`,
      });

      if (rows.length) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tab}!A2`,
          valueInputOption: "RAW",
          requestBody: { values: rows },
        });
      }

      return res.status(200).json({ ok: true, synced: rows.length });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error("sheet api error:", e);
    return res.status(500).json({ error: e.message });
  }
}
