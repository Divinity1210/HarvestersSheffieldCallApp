// =================================================================
// HARVESTERS SHEFFIELD – Call Campaign Backend
// Google Apps Script — Paste this into your Google Sheet's
// Extensions → Apps Script editor
// =================================================================

// Column mapping (1-indexed, matching the Google Sheet layout)
// A=Contact ID  B=First Name  C=Surname  D=Email  E=Mobile Phone  F=Call Status  G=Caller Email  H=Notes  I=CalledAt
const COL_CONTACT_ID = 1;
const COL_FIRST_NAME = 2;
const COL_SURNAME    = 3;
const COL_EMAIL      = 4;
const COL_PHONE      = 5;
const COL_STATUS     = 6;
const COL_CALLER     = 7;
const COL_NOTES      = 8;
const COL_TIME       = 9;

/** Get the first sheet in the spreadsheet */
function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

/** Add column headers H–I if they don't exist yet */
function ensureHeaders() {
  const sheet = getSheet();
  const lastCol = sheet.getLastColumn();
  const row1 = sheet.getRange(1, 1, 1, Math.max(lastCol, 9)).getValues()[0];
  if (!row1[COL_NOTES - 1] || String(row1[COL_NOTES - 1]).trim() !== 'Notes') {
    sheet.getRange(1, COL_NOTES, 1, 2).setValues([['Notes', 'CalledAt']]);
    SpreadsheetApp.flush();
  }
}

/** JSON response helper */
function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────────────────────
// HTTP ENTRY POINTS
// ──────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    ensureHeaders();
    const p = e.parameter;
    switch (p.action) {
      case 'next':        return handleNext(p.caller);
      case 'submit':      return handleSubmit(p);
      case 'submit_next': return handleSubmitAndNext(p);
      case 'contacts':    return handleContacts();
      case 'dashboard':   return handleDashboard();
      default:            return jsonResp({ error: 'Unknown action: ' + p.action });
    }
  } catch (err) {
    return jsonResp({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return doGet({ parameter: data });
  } catch (err) {
    return jsonResp({ error: err.toString() });
  }
}

// ──────────────────────────────────────────────────────────────────
// HELPER: Build full name from First Name + Surname
// ──────────────────────────────────────────────────────────────────

function getFullName(row) {
  var first = String(row[COL_FIRST_NAME - 1] || '').trim();
  var surname = String(row[COL_SURNAME - 1] || '').trim();
  return (first + ' ' + surname).trim();
}

// ──────────────────────────────────────────────────────────────────
// ACTION: NEXT  –  Claim and return the next available contact
// ──────────────────────────────────────────────────────────────────

function handleNext(caller) {
  if (!caller) return jsonResp({ error: 'Caller name required' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const total = data.length - 1;
    let called  = 0;

    // Pass 1 — check if this caller already has a claimed-but-unsubmitted contact
    for (let i = 1; i < data.length; i++) {
      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (status) { called++; continue; }
      if (calledBy === caller) {
        // Resume this claimed contact
        return jsonResp({
          success: true,
          contact: {
            id: i + 1,
            row: i + 1,
            name: getFullName(data[i]),
            firstName: String(data[i][COL_FIRST_NAME - 1] || '').trim(),
            surname: String(data[i][COL_SURNAME - 1] || '').trim(),
            phone: String(data[i][COL_PHONE - 1])
          },
          stats: { total: total, called: called, pending: total - called }
        });
      }
    }

    // Pass 2 — find first completely unclaimed contact
    for (let i = 1; i < data.length; i++) {
      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (!status && !calledBy) {
        var row = i + 1;
        sheet.getRange(row, COL_CALLER).setValue(caller);
        SpreadsheetApp.flush();
        return jsonResp({
          success: true,
          contact: {
            id: row,
            row: row,
            name: getFullName(data[i]),
            firstName: String(data[i][COL_FIRST_NAME - 1] || '').trim(),
            surname: String(data[i][COL_SURNAME - 1] || '').trim(),
            phone: String(data[i][COL_PHONE - 1])
          },
          stats: { total: total, called: called, pending: total - called - 1 }
        });
      }
    }

    // All contacts are called or claimed
    return jsonResp({ success: true, contact: null, done: true, stats: { total: total, called: called, pending: 0 } });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: SUBMIT  –  Record a response (used by search-modal updates)
// ──────────────────────────────────────────────────────────────────

function handleSubmit(p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet();
    var row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row' });

    // Write status to column F and caller to column G
    sheet.getRange(row, COL_STATUS).setValue(p.status);
    sheet.getRange(row, COL_CALLER).setValue(p.caller);
    sheet.getRange(row, COL_NOTES).setValue(p.notes || '');
    sheet.getRange(row, COL_TIME).setValue(p.timestamp || new Date().toISOString());
    SpreadsheetApp.flush();
    return jsonResp({ success: true });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: SUBMIT_NEXT  –  Record response + claim next (one atomic op)
// ──────────────────────────────────────────────────────────────────

function handleSubmitAndNext(p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet();
    var row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row' });

    // 1. Write the response
    sheet.getRange(row, COL_STATUS).setValue(p.status);
    sheet.getRange(row, COL_CALLER).setValue(p.caller);
    sheet.getRange(row, COL_NOTES).setValue(p.notes || '');
    sheet.getRange(row, COL_TIME).setValue(p.timestamp || new Date().toISOString());

    // 2. Re-read data and find next contact
    SpreadsheetApp.flush();
    var data  = sheet.getDataRange().getValues();
    var total = data.length - 1;
    var called = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][COL_STATUS - 1] || '').trim()) called++;
    }

    for (var i = 1; i < data.length; i++) {
      var status   = String(data[i][COL_STATUS - 1] || '').trim();
      var calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (!status && !calledBy) {
        var nextRow = i + 1;
        sheet.getRange(nextRow, COL_CALLER).setValue(p.caller);
        SpreadsheetApp.flush();
        return jsonResp({
          success: true,
          next: {
            id: nextRow,
            row: nextRow,
            name: getFullName(data[i]),
            firstName: String(data[i][COL_FIRST_NAME - 1] || '').trim(),
            surname: String(data[i][COL_SURNAME - 1] || '').trim(),
            phone: String(data[i][COL_PHONE - 1])
          },
          stats: { total: total, called: called, pending: total - called - 1 }
        });
      }
    }

    return jsonResp({ success: true, next: null, done: true, stats: { total: total, called: called, pending: 0 } });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: CONTACTS  –  Return all contacts with statuses (search cache)
// ──────────────────────────────────────────────────────────────────

function handleContacts() {
  var sheet    = getSheet();
  var data     = sheet.getDataRange().getValues();
  var contacts = [];

  for (var i = 1; i < data.length; i++) {
    contacts.push({
      id:        i + 1,
      row:       i + 1,
      name:      getFullName(data[i]),
      firstName: String(data[i][COL_FIRST_NAME - 1] || '').trim(),
      surname:   String(data[i][COL_SURNAME - 1] || '').trim(),
      phone:     String(data[i][COL_PHONE - 1] || ''),
      status:    String(data[i][COL_STATUS - 1] || '').trim() || null,
      calledBy:  String(data[i][COL_CALLER - 1] || '').trim() || null,
      notes:     String(data[i][COL_NOTES - 1] || ''),
      calledAt:  data[i][COL_TIME - 1] || null
    });
  }

  return jsonResp({ success: true, contacts: contacts });
}

// ──────────────────────────────────────────────────────────────────
// ACTION: DASHBOARD  –  Aggregated stats, leaderboard, and call log
// ──────────────────────────────────────────────────────────────────

function handleDashboard() {
  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();
  var total = data.length - 1;

  var called = 0, yes = 0, no = 0, tbc = 0, na = 0;
  var callerMap = {};
  var log = [];

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][COL_STATUS - 1] || '').trim().toLowerCase();
    if (!status) continue;

    called++;
    if (status === 'yes')        yes++;
    else if (status === 'no')    no++;
    else if (status === 'tbc')   tbc++;
    else if (status === 'no-answer') na++;

    var caller = String(data[i][COL_CALLER - 1] || '').trim();
    if (caller) {
      if (!callerMap[caller]) callerMap[caller] = { total: 0, yes: 0, no: 0, tbc: 0, na: 0 };
      callerMap[caller].total++;
      if (status === 'yes')        callerMap[caller].yes++;
      else if (status === 'no')    callerMap[caller].no++;
      else if (status === 'tbc')   callerMap[caller].tbc++;
      else                         callerMap[caller].na++;
    }

    log.push({
      id:       i + 1,
      name:     getFullName(data[i]),
      phone:    String(data[i][COL_PHONE - 1] || ''),
      status:   status,
      calledBy: caller,
      notes:    String(data[i][COL_NOTES - 1] || ''),
      calledAt: data[i][COL_TIME - 1] || ''
    });
  }

  log.reverse(); // Most recent first

  return jsonResp({
    success: true,
    stats:   { total: total, called: called, pending: total - called, yes: yes, no: no, tbc: tbc, na: na },
    callers: callerMap,
    log:     log
  });
}
