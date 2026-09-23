// =================================================================
// HARVESTERS BIRMINGHAM – Awakening Call Campaign Backend
// Google Apps Script — Paste this into your Google Sheet's
// Extensions → Apps Script editor
// =================================================================

// TARGET SHEET TAB
// The database spreadsheet has multiple sheets (Sheet1, Sheet3, Will Attend).
// Sheet3 contains 1,816 contacts.
const TARGET_SHEET_NAME = 'Sheet3';

// COLUMN MAPPING (1-indexed, matching Sheet3)
// Existing data in Sheet3:
// A (1) = ID (e.g. SIA - 001)
// B (2) = Name (Full name, e.g. Praise A)
// C (3) = Phone (e.g. 447459250775)
// D (4) = Name of Call Agent (August Big Sunday)
// E (5) = Sunday Attendance (August Big Sunday)
// F (6) = Feedback (August Big Sunday)
//
// New Awakening Campaign columns (preserves August data in D–F):
// G (7) = Awakening Attendance (Call Status)
// H (8) = Awakening Call Agent (Caller Name)
// I (9) = Awakening Feedback (Notes / Prayer requests)
// J (10) = Awakening CalledAt (Timestamp)

const COL_ID     = 1;  // Column A
const COL_NAME   = 2;  // Column B
const COL_PHONE  = 3;  // Column C

const COL_STATUS = 7;  // Column G: Awakening Attendance
const COL_CALLER = 8;  // Column H: Awakening Caller
const COL_NOTES  = 9;  // Column I: Awakening Notes & Feedback
const COL_TIME   = 10; // Column J: Awakening CalledAt

/** Get the target sheet in the spreadsheet (fallback to first sheet if name differs) */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TARGET_SHEET_NAME) || ss.getSheets()[0];
}

/** Add Awakening column headers G–J if they don't exist yet */
function ensureHeaders() {
  const sheet = getSheet();
  const lastCol = sheet.getLastColumn();
  const row1 = sheet.getRange(1, 1, 1, Math.max(lastCol, 10)).getValues()[0];
  const headerG = String(row1[COL_STATUS - 1] || '').trim();

  if (!headerG || !headerG.toLowerCase().includes('awakening')) {
    sheet.getRange(1, COL_STATUS, 1, 4).setValues([[
      'Awakening Attendance',
      'Awakening Call Agent',
      'Awakening Feedback',
      'Awakening CalledAt'
    ]]);
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
    const p = (e && e.parameter) ? e.parameter : {};
    switch (p.action) {
      case 'next':        return handleNext(p.caller);
      case 'submit':      return handleSubmit(p);
      case 'submit_next':   return handleSubmitAndNext(p);
      case 'whatsapp_sent': return handleWhatsAppSent(p);
      case 'contacts':      return handleContacts();
      case 'dashboard':   return handleDashboard();
      case 'ping':        return jsonResp({ success: true, message: 'Harvesters Birmingham Awakening API online' });
      default:            return jsonResp({ error: 'Unknown action: ' + (p.action || 'none') });
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
// HELPER: Extract and normalize contact data from row
// ──────────────────────────────────────────────────────────────────

function extractContact(row, rowNumber) {
  var fullName = String(row[COL_NAME - 1] || '').trim();
  var parts = fullName.split(/\s+/);
  var firstName = parts[0] || '';
  var surname = parts.slice(1).join(' ') || '';

  return {
    id: rowNumber,
    row: rowNumber,
    contactId: String(row[COL_ID - 1] || '').trim() || ('CON-' + rowNumber),
    name: fullName || 'Friend',
    firstName: firstName,
    surname: surname,
    phone: String(row[COL_PHONE - 1] || '').trim()
  };
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
    const total = Math.max(0, data.length - 1);
    let called  = 0;

    // Pass 1 — check if this caller already has a claimed-but-unsubmitted contact (search from bottom up)
    for (let i = data.length - 1; i >= 1; i--) {
      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (status) { called++; continue; }
      if (calledBy.toLowerCase() === caller.toLowerCase()) {
        // Resume this claimed contact
        return jsonResp({
          success: true,
          contact: extractContact(data[i], i + 1),
          stats: { total: total, called: called, pending: total - called }
        });
      }
    }

    // Pass 2 — find first completely unclaimed contact starting from the BOTTOM of the sheet upwards
    for (let i = data.length - 1; i >= 1; i--) {
      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (!status && !calledBy) {
        var row = i + 1;
        sheet.getRange(row, COL_CALLER).setValue(caller);
        SpreadsheetApp.flush();
        return jsonResp({
          success: true,
          contact: extractContact(data[i], row),
          stats: { total: total, called: called, pending: total - called - 1 }
        });
      }
    }

    // All contacts are called or claimed
    return jsonResp({
      success: true,
      contact: null,
      done: true,
      stats: { total: total, called: called, pending: 0 }
    });

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
    if (!row || row < 2) return jsonResp({ error: 'Invalid row: ' + p.row });

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
// ACTION: SUBMIT_NEXT  –  Record response + claim next (atomic from bottom)
// ──────────────────────────────────────────────────────────────────

function handleSubmitAndNext(p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet();
    var row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row' });

    // 1. Write the response atomically in one call (4x faster)
    sheet.getRange(row, COL_STATUS, 1, 4).setValues([[
      p.status,
      p.caller,
      p.notes || '',
      p.timestamp || new Date().toISOString()
    ]]);

    // 2. Re-read data and find next contact from the BOTTOM of the sheet upwards
    SpreadsheetApp.flush();
    var data  = sheet.getDataRange().getValues();
    var total = Math.max(0, data.length - 1);
    var called = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][COL_STATUS - 1] || '').trim()) called++;
    }

    for (var j = data.length - 1; j >= 1; j--) {
      var status   = String(data[j][COL_STATUS - 1] || '').trim();
      var calledBy = String(data[j][COL_CALLER - 1] || '').trim();
      if (!status && !calledBy) {
        var nextRow = j + 1;
        sheet.getRange(nextRow, COL_CALLER).setValue(p.caller);
        SpreadsheetApp.flush();
        return jsonResp({
          success: true,
          next: extractContact(data[j], nextRow),
          stats: { total: total, called: called, pending: Math.max(0, total - called - 1) }
        });
      }
    }

    return jsonResp({
      success: true,
      next: null,
      done: true,
      stats: { total: total, called: called, pending: 0 }
    });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: WHATSAPP_SENT  –  Log a WhatsApp broadcast DM
// ──────────────────────────────────────────────────────────────────

function handleWhatsAppSent(p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet();
    var row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row: ' + p.row });

    var currentNotes = String(sheet.getRange(row, COL_NOTES).getValue() || '');
    var tag = p.note || '[WhatsApp Broadcast Sent]';
    var newNotes = currentNotes ? (currentNotes + ' | ' + tag) : tag;

    sheet.getRange(row, COL_NOTES).setValue(newNotes);

    var currentCaller = String(sheet.getRange(row, COL_CALLER).getValue() || '').trim();
    if (!currentCaller) {
      sheet.getRange(row, COL_CALLER).setValue('WhatsApp Broadcast');
    }

    SpreadsheetApp.flush();
    return jsonResp({ success: true, row: row });
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
    var contact = extractContact(data[i], i + 1);
    contacts.push({
      id:        contact.id,
      row:       contact.row,
      contactId: contact.contactId,
      name:      contact.name,
      firstName: contact.firstName,
      surname:   contact.surname,
      phone:     contact.phone,
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
  var total = Math.max(0, data.length - 1);

  var called = 0, willAttend = 0, notAttend = 0, unsure = 0, noAnswer = 0;
  var callerMap = {};
  var log = [];

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][COL_STATUS - 1] || '').trim().toLowerCase();
    if (!status) continue;

    called++;

    var isWillAttend = (status === 'will attend' || status === 'will-attend' || status === 'yes');
    var isNotAttend  = (status === 'not attend' || status === 'not-attend' || status === 'no');
    var isUnsure     = (status === 'unsure' || status === 'tbc');
    var isNoAnswer   = (status === 'no answer' || status === 'no-answer' || status === 'not picking' || status === 'voice mail' || status === 'didnt ring');

    if (isWillAttend)      willAttend++;
    else if (isNotAttend)  notAttend++;
    else if (isUnsure)     unsure++;
    else                   noAnswer++;

    var caller = String(data[i][COL_CALLER - 1] || '').trim();
    if (caller) {
      if (!callerMap[caller]) callerMap[caller] = { total: 0, willAttend: 0, notAttend: 0, unsure: 0, noAnswer: 0 };
      callerMap[caller].total++;
      if (isWillAttend)      callerMap[caller].willAttend++;
      else if (isNotAttend)  callerMap[caller].notAttend++;
      else if (isUnsure)     callerMap[caller].unsure++;
      else                   callerMap[caller].noAnswer++;
    }

    var c = extractContact(data[i], i + 1);
    log.push({
      id:        i + 1,
      name:      c.name,
      contactId: c.contactId,
      phone:     c.phone,
      status:    data[i][COL_STATUS - 1],
      calledBy:  caller,
      notes:     String(data[i][COL_NOTES - 1] || ''),
      calledAt:  data[i][COL_TIME - 1] || ''
    });
  }

  log.reverse(); // Most recent first

  return jsonResp({
    success: true,
    stats: {
      total: total,
      called: called,
      pending: Math.max(0, total - called),
      willAttend: willAttend,
      yes: willAttend,
      notAttend: notAttend,
      no: notAttend,
      unsure: unsure,
      tbc: unsure,
      noAnswer: noAnswer,
      na: noAnswer
    },
    callers: callerMap,
    log: log
  });
}
