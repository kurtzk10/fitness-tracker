# Full-Body Tracker: Setup

A standalone workout tracker for PC and phone. The app (`index.html`) saves entries on your device first, then syncs them through a small Google Apps Script to a Google Sheet, which acts as the database.

```
index.html  <-->  Apps Script web app (Code.gs)  <-->  Google Sheet (Log + App_Library)
```

## Files

| File | Purpose |
|---|---|
| `index.html` | The app (HTML, CSS and JS in one file) |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | Make it installable and available offline |
| `Code.gs` | The Apps Script backend (paste into the sheet) |
| `full_body_tracker_template.xlsx` | The starter database: empty Log, plus a library of 54 exercises with their regions |

## 1. Create the database

1. Upload `full_body_tracker_template.xlsx` to Google Drive.
2. Open it with Google Sheets, then **File → Save as Google Sheets**.
3. Rename it however you like. Keep the two tab names exactly: **Log** and **App_Library**.
4. In **Log**, click cell **P3** (header "Region"). Its note holds a formula. Replace the cell with this one:

   ```
   ={"Region";ARRAYFORMULA(IF(E4:E="","",IFERROR(VLOOKUP(E4:E,App_Library!$A$2:$F$499,6,FALSE)&"","?")))}
   ```

   It fills the whole column by itself. **Never type anything below it in column P**, or P3 shows `#REF!`.

Do not move or rename columns. The app writes to fixed positions.

- **Log** (header on row 3, data from row 4): one row per exercise logged. Formula columns (Week of, Muscle, Sets done, Total reps, Volume, Region) fill themselves in.
- **App_Library** (header on row 1): `Exercise | Muscle | Sets | Reps | Load | Region`. It comes pre-filled with 54 exercises for light dumbbells (6, 11 and 16 lb), bodyweight and one chair. Edit it to match your equipment, or add exercises from the app.
- Keep the **Reps** column plain text, or `10-12` turns into a date.
- **Region** is for your own analysis in the sheet. The app keeps its own region list (`REGIONS` in `index.html`) and does not read this column. Exercises added from the app get a blank Region until you type one. A few shoulder moves are blank on purpose.

## 2. Add the backend

1. In the sheet: **Extensions → Apps Script**.
2. Delete any existing code and paste in `Code.gs`.
3. Change `TOKEN` (top of the file) to a long random string only you know.
4. Click **Save**.

`Code.gs` only touches columns A to O of Log and A to E of App_Library, so the Region columns need no backend change.

## 3. Deploy it

1. **Deploy → New deployment → Web app** (gear icon → choose "Web app").
2. Execute as: **Me**. Who has access: **Anyone**.
3. Click **Deploy** and approve the permissions. Google may show an "unverified app" screen. Choose Advanced, then continue. It's your own script.
4. Copy the **Web app URL** (ends in `/exec`).
5. Test it: open the URL in a browser. You should see `{"ok":true,"msg":"Full-Body Tracker API is running"}`.

**After any later edit to `Code.gs`:** Deploy → Manage deployments → pencil icon → Version: **New version** → Deploy. The URL stays the same. Saving alone does not update the live version. Do not choose "New deployment" again: it creates a new URL and breaks the saved connection.

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
4. Phone: use **Add to Home Screen** (Android Chrome: menu → Install app; iOS Safari: Share → Add to Home Screen).

To change the URL or token later, use the **Connection** button under the Log.

## What the app does

- **Two routines:** Full Body, or Push / Pull / Legs. Switch with the routine select. In PPL mode the app picks the day that was trained longest ago, or you can pick Push, Pull or Legs yourself for today.
- **Recommended list:** today's exercises, built from your logged history and weekly set targets per muscle. It stays fixed during the day. Exercises you log get ticked and dimmed. Picks rotate between regions of a muscle (for example upper, middle and lower chest).
- **Deload week:** tick the Deload box for 7 days. It suggests one familiar exercise per muscle, 2 sets at the low end of the rep range.
- **Rest timer:** a circular countdown with 1 and 2 minute presets, +1:00, pause and reset. An auto-start option starts it each time you add an entry. It beeps and vibrates at zero.
- **Progression:** flags exercises that are ready to progress (same load twice, every set at the top of the range) and exercises that have stalled, with a suggested next step.
- **Consistency and hotspots:** weekly streak, a month calendar, weekly progress per muscle, and a muscle breakdown with tap-to-open region chips.
- **Log editing:** the pencil button edits a row, the X button deletes it. **Export CSV** downloads the whole log.

Tunable settings (equipment loads, weekly targets, routine days per week, streak goals, progression ladder, region lists) are constants near the top of the script in `index.html`, each with a comment.

## How syncing behaves

- Entries save on the device immediately and sync when you're online. Offline use is fine.
- The app syncs on open, after each change, when you return to the tab, and when you tap **Sync now**.
- Deleting an entry in the app also deletes its row in the sheet.
- Rows you type directly into the Log sheet show up in the app after the next sync.
- The sheet is the source of truth. If two devices differ, sync both.
- The Log has formulas for 200 rows, and the script extends them automatically as you go past that.
- Exercises built into the app are added to your library on first load and appear in the sheet after the next sync.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Wrong token" | The token in the app must match `TOKEN` in `Code.gs` exactly. After editing it, redeploy a new version. |
| `Cannot read properties of null (reading 'getRange')` | The saved `/exec` URL is stale or points at a script not bound to your sheet. Paste the current Web app URL into the Connection box. |
| Sign-in page or HTML instead of JSON when opening the URL | Deploy → Manage deployments → set access to **Anyone**. |
| "Script function not found: doGet" | `Code.gs` wasn't saved or redeployed. Re-paste, save, deploy a new version. |
| Sync fails with an error mentioning a missing sheet | Tab names must be exactly `Log` and `App_Library`. |
| A code change had no effect | You saved but didn't deploy a new version (see step 3). |
| Stale app after an update | Reload twice, or clear site data for the page. |
| Rep ranges like `10-12` turn into dates | Keep the **Reps** column in `App_Library` formatted as plain text. |
| `#REF!` in Log P3 | Something was typed in column P below the header. Clear `P4:P` and re-enter the formula from step 1. |
| Region column shows `?` | The exercise name isn't in App_Library. Blank means it is, but has no region. |
| No "Progression" section | Normal. It needs two sessions at the same load, every set at the top of the range, and the latest session within 21 days. It is also hidden during deload. |

## Security notes

- The URL plus the token is the only thing protecting the sheet. Don't commit your real token, and don't share the URL.
- The token is stored in your browser, not in the repo. `Code.gs` in the repo should keep the placeholder value.
- To rotate the token: change `TOKEN`, deploy a new version, then update the Connection box on each device.
- Back up occasionally with **File → Download → Microsoft Excel** in Google Sheets, or use **Export CSV** in the app.
