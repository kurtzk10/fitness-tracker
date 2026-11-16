/**
 * Full-Body Tracker API (Google Apps Script, bound to the sheet).
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me   |   Who has access: Anyone
 * Then paste the /exec URL and the TOKEN below into the app's Connection box.
 */
const TOKEN = 'CHANGE-ME-to-a-long-random-string';

const LOG_FIRST = 4;          // first data row on Log
const LIB_LAST = 30;          // Library lookups read rows 3..30

function doGet() { return out_({ ok: true, msg: 'Full-Body Tracker API is running' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const b = JSON.parse(e.postData.contents);
    if (b.token !== TOKEN) return out_({ ok: false, error: 'Wrong token' });
    return out_(sync_(b));
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sync_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const log = ss.getSheetByName('Log'), lib = ss.getSheetByName('Library'), app = ss.getSheetByName('App_Library');

  // 1) new exercises
  (b.plan || []).forEach(p => addExercise_(app, lib, p));

  // 2) deletes (by app id), bottom-up so row numbers stay valid
  const del = new Set(b.del || []);
  if (del.size) {
    const ids = log.getRange(LOG_FIRST, 15, Math.max(1, log.getLastRow() - LOG_FIRST + 1), 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) if (del.has(ids[i][0])) log.deleteRow(LOG_FIRST + i);
  }

  // 3) new log rows (skip ids already stored, so retries are safe)
  const rowsIn = b.rows || [];
  if (rowsIn.length) {
    const have = new Set(allIds_(log));
    rowsIn.forEach(r => {
      if (have.has(r.id)) return;
      ensureLibrary_(lib, r.exercise, r.muscle, r.load);
      const row = nextRow_(log);
      ensureFormulas_(log, row);
      const n = v => (v === '' || v == null) ? '' : Number(v);
      log.getRange(row, 1, 1, 2).setValues([[Utilities.parseDate(r.date, tz, 'yyyy-MM-dd'), r.plan || '']]);
      log.getRange(row, 4, 1, 6).setValues([[n(r.day), r.exercise,
        /^\d+(\.\d+)?$/.test(String(r.load)) ? Number(r.load) : (r.load || 'BW'), n(r.s1), n(r.s2), n(r.s3)]]);
      log.getRange(row, 14, 1, 2).setValues([[r.notes || '', r.id]]);
    });
  }
  SpreadsheetApp.flush();

  // 4) return full state
  const mus = {};
  app.getRange(2, 1, Math.max(1, app.getLastRow() - 1), 5).getValues().forEach(x => { if (x[0]) mus[x[0]] = x[1]; });
  const last = log.getLastRow();
  const vals = last >= LOG_FIRST ? log.getRange(LOG_FIRST, 1, last - LOG_FIRST + 1, 15).getValues() : [];
  const rows = [], stamp = [];
  vals.forEach((v, i) => {
    if (v[4] === '' || v[4] == null) return;
    let id = v[14];
    if (!id) { id = Utilities.getUuid(); stamp.push([LOG_FIRST + i, id]); }   // row typed by hand in the sheet
    const m = (v[9] && v[9] !== '?') ? v[9] : (mus[v[4]] || '');
    rows.push({
      id, date: v[0] instanceof Date ? Utilities.formatDate(v[0], tz, 'yyyy-MM-dd') : String(v[0]),
      plan: v[1], day: v[3], exercise: v[4], load: v[5], s1: v[6], s2: v[7], s3: v[8], muscle: m, notes: v[13]
    });
  });
  stamp.forEach(s => log.getRange(s[0], 15).setValue(s[1]));

  const lr = app.getLastRow();
  const plan = lr < 2 ? [] : app.getRange(2, 1, lr - 1, 5).getValues().filter(x => x[0])
    .map(x => ({ exercise: x[0], muscle: x[1], sets: x[2], reps: String(x[3]), load: String(x[4]) }));
  return { ok: true, rows, plan };
}

function allIds_(log) {
  const n = log.getLastRow() - LOG_FIRST + 1;
  return n < 1 ? [] : log.getRange(LOG_FIRST, 15, n, 1).getValues().map(r => r[0]).filter(String);
}

// first row whose Exercise (col E) is empty
function nextRow_(log) {
  const n = Math.max(1, log.getLastRow() - LOG_FIRST + 1);
  const e = log.getRange(LOG_FIRST, 5, n, 1).getValues();
  let k = e.length; while (k > 0 && (e[k - 1][0] === '' || e[k - 1][0] == null)) k--;
  return LOG_FIRST + k;
}

// keep the Log formulas (Week of, Muscle, Sets, Total reps, Volume) running past the original 200 rows
function ensureFormulas_(log, row) {
  if (row > log.getMaxRows()) log.insertRowsAfter(log.getMaxRows(), row - log.getMaxRows() + 50);
  if (log.getRange(row, 3).getFormula()) return;
  const P = SpreadsheetApp.CopyPasteType.PASTE_FORMULA;
  log.getRange(LOG_FIRST, 3).copyTo(log.getRange(row, 3), P, false);
  log.getRange(LOG_FIRST, 10, 1, 4).copyTo(log.getRange(row, 10, 1, 4), P, false);
}

function addExercise_(app, lib, p) {
  const lr = app.getLastRow();
  const names = lr < 2 ? [] : app.getRange(2, 1, lr - 1, 1).getValues().map(r => String(r[0]).toLowerCase());
  if (names.indexOf(String(p.exercise).toLowerCase()) >= 0) return;
  app.appendRow([p.exercise, p.muscle, p.sets || 3, p.reps || '10-12', p.load || 'BW']);
  ensureLibrary_(lib, p.exercise, p.muscle, p.load);
}

// Library tab (A:C) feeds the Muscle lookup on Log; it only reads rows 3..30
function ensureLibrary_(lib, name, muscle, load) {
  const a = lib.getRange(3, 1, LIB_LAST - 2, 1).getValues();
  for (let i = 0; i < a.length; i++) if (String(a[i][0]).toLowerCase() === String(name).toLowerCase()) return;
  for (let i = 0; i < a.length; i++) if (a[i][0] === '') {
    lib.getRange(3 + i, 1, 1, 3).setValues([[name, muscle, /bw/i.test(String(load)) ? 'Bodyweight' : 'Dumbbell']]);
    return;
  }
}
