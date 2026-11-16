# Full-Body Tracker: Setup

A standalone workout tracker for PC and phone. The app (`index.html`) saves entries on your device first, then syncs them through a small Google Apps Script to a Google Sheet, which acts as the database.

```
index.html  <-->  Apps Script web app (Code.gs)  <-->  Google Sheet (Log + App_Library)
```

## Files

| File | Purpose |
|---|---|
| `index.html` | The app |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | Make it installable and available offline |
| `Code.gs` | The Apps Script backend (paste into the sheet) |
| `full_body_tracker_template.xlsx` | The empty database to import into Google Sheets |

## 1. Create the database

1. Upload `full_body_tracker_template.xlsx` to Google Drive.
2. Open it with Google Sheets, then **File → Save as Google Sheets**.
3. Rename it however you like. Keep the two tab names exactly: **Log** and **App_Library**.

Do not move or rename columns. The app writes to fixed positions.

- **Log**: one row per exercise logged. Formula columns (Week of, Muscle, Sets done, Total reps, Volume) fill themselves in.
- **App_Library**: your exercise list (name, muscle, sets, reps, load). Edit it here or add exercises from the app.

## 2. Add the backend

1. In the sheet: **Extensions → Apps Script**.
2. Delete any existing code and paste in `Code.gs`.
3. Change `TOKEN` (top of the file) to a long random string only you know.
4. Click **Save**.

## 3. Deploy it

1. **Deploy → New deployment → Web app** (gear icon → choose "Web app").
2. Execute as: **Me**. Who has access: **Anyone**.
3. Click **Deploy** and approve the permissions. Google may show an "unverified app" screen. Choose Advanced, then continue. It's your own script.
4. Copy the **Web app URL** (ends in `/exec`).
5. Test it: open the URL in a browser. You should see `{"ok":true,"msg":"Full-Body Tracker API is running"}`.

**After any later edit to `Code.gs`:** Deploy → Manage deployments → pencil icon → Version: **New version** → Deploy. The URL stays the same. Saving alone does not update the live version.

## 4. Host the app

The app needs an HTTPS address for phone install and offline use. Any static host works:

- **GitHub Pages:** put the files in a repo, then Settings → Pages → deploy from your branch. A free account needs a public repo. This is fine because the repo contains no secrets.
- **Netlify Drop:** drag the folder onto netlify.com/drop.
- **Cloudflare Pages:** connect the repo, no build command.

On a PC you can also just open `index.html` from disk.

## 5. Connect and install

1. Open the app. A **Connect Google Sheets** box appears.
2. Paste the Web app URL and your token, then tap **Save & sync**. The status line should say "Synced ✓".
3. Add a test workout and check that a row appears in the Log tab.
4. Phone: use **Add to Home Screen** (iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app).

To change the URL or token later, use the **Connection** button under the Log.

## How it behaves

- Entries save on the device immediately and sync when you're online. Offline use is fine.
- The app syncs on open, after each change, when you return to the tab, and when you tap **Sync now**.
- Deleting an entry in the app also deletes its row in the sheet.
- Rows you type directly into the Log sheet show up in the app after the next sync.
- The sheet is the source of truth. If two devices differ, sync both.
- The Log has formulas for 200 rows, and the script extends them automatically as you go past that.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Wrong token" | The token in the app must match `TOKEN` in `Code.gs` exactly. After editing it, redeploy a new version. |
| Sign-in page or HTML instead of JSON when opening the URL | Deploy → Manage deployments → set access to **Anyone**. |
| "Script function not found: doGet" | `Code.gs` wasn't saved or redeployed. Re-paste, save, deploy a new version. |
| Sync fails with an error mentioning a missing sheet | Tab names must be exactly `Log` and `App_Library`. |
| A code change had no effect | You saved but didn't deploy a new version (see step 3). |
| Stale app after an update | Reload twice, or clear site data for the page. |
| Rep ranges like `10-12` turn into dates | Keep the **Reps** column in `App_Library` formatted as plain text. |

## Security notes

- The URL plus the token is the only thing protecting the sheet. Don't commit your real token, and don't share the URL.
- The token is stored in your browser, not in the repo. `Code.gs` in the repo should keep the placeholder value.
- To rotate the token: change `TOKEN`, deploy a new version, then update the Connection box on each device.
- Back up occasionally with **File → Download → Microsoft Excel** in Google Sheets.
