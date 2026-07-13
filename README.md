# PT Suite

Commission Tracker + Budget Planner, deployable to Vercel.

## What's new

- **Commission Tracker syncs with a Google Sheet** — reads your client list on
  load, and pushes every change (new client, new session, edited/deleted
  session, edited client) straight back to the sheet.
- **Editable session history** — expand a client's "sessions" panel to change
  or delete the date on any past session, not just the most recent one, and
  to log a session for any date (not only today).
- **Two more packages**: Nutrition Consultation (17.7 KWD/session) and Normal
  Consultation (10 KWD/session), alongside the original three.
- **Sorting** — A–Z, price per session, or session count, low to high.
- Budget Planner is unchanged from before (still local-storage based; see
  below if you also want that synced somewhere).

## Google Sheets setup (one-time)

The sheet sync uses a Google **service account** — a robot account that only
has access to sheets you explicitly share with it. Nothing here uses your
personal Google login.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a project (or use an existing one).
2. Enable the **Google Sheets API** for that project (APIs & Services →
   Enable APIs and Services → search "Google Sheets API" → Enable).
3. Create a service account: APIs & Services → Credentials → Create
   Credentials → Service Account. Give it any name.
4. Open the service account → Keys tab → Add Key → Create new key → JSON.
   This downloads a `.json` file — keep it private, don't commit it.
5. Open your Google Sheet, click **Share**, and paste in the service
   account's email address (the `client_email` field in that JSON file,
   looks like `something@your-project.iam.gserviceaccount.com`). Give it
   **Editor** access.
6. In your sheet, make sure there's a tab to sync against (e.g. rename one to
   `Clients`, or leave the default and set `GOOGLE_SHEET_TAB` to match). The
   app owns columns A–D on that tab (Name, Phone, Package, Session Dates) —
   don't put other data in those columns on that tab.
7. In Vercel: Project → Settings → Environment Variables, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY` — the `private_key` from the JSON, pasted as-is
     (Vercel handles the `\n` line breaks fine)
   - `GOOGLE_SHEET_ID` — the long ID in your sheet's URL, e.g.
     `1pFHJ0DXm2nDZNFzpVQCeEA0mjcOlz6IWTzv82qxvGTM`
   - `GOOGLE_SHEET_TAB` — the tab name (optional, defaults to `Clients`)
8. Redeploy. The tracker's header will show "Synced" once it's working, or
   "Sheet not connected" if something's missing — tap the retry icon after
   fixing env vars.

`.env.example` in this repo shows the same variables for local development
(`npm run dev` — copy it to `.env.local` and fill in your values; Vite +
Vercel's dev server picks these up automatically via `vercel dev`, or you can
deploy straight to Vercel and set them there instead).

## Data storage (Budget Planner + local cache)

The Budget Planner still uses the browser's `localStorage` (see
`src/storage.js`), so its data stays on whichever device it's opened on. The
Commission Tracker also keeps a local cache this way as an offline fallback,
but the Google Sheet is the source of truth whenever it's reachable.

## Run locally

```bash
npm install
npm run dev
```

Note: the `/api/sheet` serverless function needs the Vercel dev server to
run (`npm i -g vercel && vercel dev`) rather than plain `vite dev`, since
plain Vite doesn't execute the `/api` folder.

## Deploy to Vercel

**Option A — via GitHub (recommended)**
1. Push this folder to a new GitHub repo.
2. Go to vercel.com → **Add New... → Project** → import that repo.
3. Vercel auto-detects Vite. Leave build command (`vite build`) and output
   directory (`dist`) as default.
4. Add the environment variables from the Google Sheets setup section above.
5. Click **Deploy**.

**Option B — via CLI**
```bash
npm install -g vercel
vercel
```
Follow the prompts, then add the env vars via `vercel env add` or the
dashboard, and redeploy.

## Structure

```
api/
  sheet.js               # serverless function: reads/writes the Google Sheet
src/
  main.jsx                # routes: / , /commission , /budget
  Home.jsx                # landing page with links to both tools
  CommissionTracker.jsx   # client list, sessions, sheet sync, sorting
  BudgetPlanner.jsx       # income, expenses, savings goals
  tiers.js                # shared package/tier definitions
  sheetSync.js            # client-side helpers that call /api/sheet
  storage.js              # localStorage polyfill for window.storage
```
