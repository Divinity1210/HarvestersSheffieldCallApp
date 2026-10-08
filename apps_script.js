// =================================================================
// HARVESTERS BIRMINGHAM – Member Outreach & Calling App Backend
// Google Apps Script — Paste this into your Google Sheet's
// Extensions → Apps Script editor
// Compatible with: Harvesters Birmingham Member Database (Sheet3 / Sheet1)
// Supports: Dynamic Multi-Campaigns, Weekly Follow-ups, Call Audit Log,
//           GDPR Do-Not-Call Suppression / Record Deletion,
//           and Double-Call Prevention per Campaign.
// =================================================================

// TARGET SHEET TABS
const TARGET_SHEET_NAME  = 'Sheet3';
const CAMPAIGNS_SHEET_NAME = 'Campaigns';
const CALL_LOG_SHEET_NAME  = 'Call_Log';
const OPT_OUT_SHEET_NAME   = 'DoNotCall';

// COLUMN MAPPING (1-indexed, matching Birmingham Sheet3)
// Existing data in Sheet3:
// A (1) = ID (e.g. SIA - 001)
// B (2) = Name (Full name, e.g. Praise A)
// C (3) = Phone (e.g. 447459250775)
// D (4) = August Call Agent
// E (5) = August Sunday Attendance
// F (6) = August Feedback
//
// Outreach Tracking Columns:
// G (7)  = Call Status (will-attend, unsure, not-attend, no-answer)
// H (8)  = Call Agent (Volunteer name)
// I (9)  = Feedback & Notes (Prayer requests, transport, comments)
// J (10) = Called At (ISO timestamp)
// K (11) = Campaign (Active campaign ID or name)

const COL_ID       = 1;  // Column A
const COL_NAME     = 2;  // Column B
const COL_PHONE    = 3;  // Column C

const COL_STATUS   = 7;  // Column G: Call Status
const COL_CALLER   = 8;  // Column H: Call Agent
const COL_NOTES    = 9;  // Column I: Feedback & Notes
const COL_TIME     = 10; // Column J: Called At
const COL_CAMPAIGN = 11; // Column K: Campaign

/** Get the primary member data sheet (fallback to first sheet if name differs) */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TARGET_SHEET_NAME) || ss.getSheets()[0];
}

/** Get or create the Campaigns sheet */
function getCampaignsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CAMPAIGNS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CAMPAIGNS_SHEET_NAME);
    initDefaultCampaigns(sheet);
  }
  return sheet;
}

/** Get or create the Call_Log sheet */
function getCallLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CALL_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CALL_LOG_SHEET_NAME);
    const headers = [
      'Timestamp', 'Contact ID', 'Row', 'Name', 'Phone',
      'Campaign ID', 'Campaign Name', 'Call Status', 'Call Agent', 'Notes & Feedback'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    SpreadsheetApp.flush();
  }
  return sheet;
}

/** Get or create the DoNotCall (Opt-Out) sheet */
function getDoNotCallSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OPT_OUT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(OPT_OUT_SHEET_NAME);
    const headers = [
      'OptOut Timestamp', 'Contact ID', 'Original Row', 'Name', 'Phone',
      'Logged By Caller', 'Reason / Notes', 'Campaign'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    SpreadsheetApp.flush();
  }
  return sheet;
}

/** Ensure column headers G–K and helper sheets exist */
function ensureHeaders() {
  const sheet = getSheet();
  const lastCol = Math.max(sheet.getLastColumn(), 11);
  const row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const headerG = String(row1[COL_STATUS - 1] || '').trim();

  if (!headerG || !headerG.toLowerCase().includes('status')) {
    sheet.getRange(1, COL_STATUS, 1, 5).setValues([[
      'Call Status',
      'Call Agent',
      'Feedback & Notes',
      'Called At',
      'Campaign'
    ]]);
    SpreadsheetApp.flush();
  }

  // Ensure helper sheets are initialized
  getCampaignsSheet();
  getCallLogSheet();
  getDoNotCallSheet();
}

/** Initialize default Harvesters Birmingham campaigns */
function initDefaultCampaigns(sheet) {
  const headers = [
    'id', 'name', 'theme', 'venue', 'dateTime',
    'scriptIntro', 'theAsk', 'branchYes', 'branchUnsure',
    'branchNo', 'closing', 'whatsappTemplate', 'isActive', 'updatedAt'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const defaultCampaigns = [
    [
      'sunday-service',
      'Sunday Celebration Service',
      'Worship, Word & Miracles',
      'Park Regis, 160 Broad St, Birmingham B15 1DT',
      'Every Sunday · 10:00 AM',
      "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName}, and I’m calling from Harvesters Birmingham. I hope you're having a blessed week!",
      "We're having our Sunday Celebration Service this coming Sunday at 10:00 AM at Park Regis, and we would love for you and your family to join us. Will you be able to make it?",
      "That is wonderful! We look forward to welcoming you. Feel free to come along with family and friends — parking is available on-site and on-street.",
      "No problem at all, {FirstName}. I just wanted to personally connect and invite you. Would you like me to send you the details on WhatsApp, and is there any prayer request we can stand with you in?",
      "That is completely fine, {FirstName}. Thank you so much for your time. You can also join our livestream online, and we pray God blesses your week abundantly.",
      "Thank you so much for your time, {FirstName}. Have a wonderful and victorious week, and God bless you!",
      "Hi {FirstName}! 👋 This is {CallerName} from Harvesters Birmingham.\n\nHere are the details for our Sunday Celebration Service:\n📍 Park Regis, 160 Broad St, Birmingham B15 1DT\n🗓️ This Sunday\n🕙 10:00 AM\n🚗 Free & on-street parking available\n\nWe look forward to seeing you! Let us know if you need transport directions or prayer. Have a blessed week! 🙏",
      'true',
      new Date().toISOString()
    ],
    [
      'awakening-2026',
      'Awakening 2026 – Breakthrough & Renewal',
      'Breakthrough & Spiritual Renewal',
      'Park Regis, 160 Broad St, Birmingham B15 1DT',
      'Weekend Gathering · 09:00 AM - 03:00 PM',
      "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName}, and I’m calling from Harvesters Birmingham. I hope you’re doing well!",
      "I’m calling to specially invite you to Awakening, our power-packed gathering focused on breakthrough and spiritual renewal. It’s going to be a powerful time of prayer, worship and the word, and we would really love for you to be part of it. Will you be able to join us?",
      "That’s great! We look forward to welcoming you. Feel free to invite your family and friends too — parking is available on-site and on-street.",
      "No problem at all. I just wanted to personally invite you and make sure you’re aware of it. We’d love to have you with us if you’re able to make it. Is there any prayer request you'd like us to agree with you on?",
      "I completely understand. Thank you so much for your time today. We’ll be praying for you, and we hope to see you at another of our upcoming gatherings.",
      "Thank you so much, {FirstName}. Have a wonderful rest of your day, and God bless you richly!",
      "Hi {FirstName}! 👋 This is {CallerName} from Harvesters Birmingham.\n\nHere are the details for Awakening:\n📍 Park Regis, 160 Broad St, Birmingham B15 1DT\n🗓️ Weekend Gathering\n🕙 09:00 AM - 03:00 PM\n🚗 Free & on-street parking available\n\nWe look forward to welcoming you! Feel free to invite your family and friends. Have a blessed week! 🙏",
      'false',
      new Date().toISOString()
    ],
    [
      'newcomers-welcome',
      'Newcomers & First-Timers Follow-Up',
      'Welcome to the Harvesters Family',
      'Park Regis, 160 Broad St, Birmingham B15 1DT',
      'Weekly Follow-up Check-in',
      "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName} from Harvesters Birmingham. I’m just calling to personally thank you for worshipping with us recently and check how your week has been!",
      "We want you to know how blessed we were to have you with us! We would love to welcome you again this Sunday at 10:00 AM. Will you be able to join us?",
      "Praise God! We are truly excited to see you again. If you have any questions or need anything at all, we are here for you.",
      "No worries at all, {FirstName}! We are praying with you, and you are always part of our family whenever you are able to join us.",
      "Thank you so much for your time, {FirstName}. We appreciate you and pray God's favor over your work and family.",
      "God bless you, {FirstName}, have a joyful and victorious week ahead!",
      "Hi {FirstName}! 👋 Thank you for connecting with Harvesters Birmingham. We were so blessed to have you worship with us! We'd love to see you again this Sunday at 10:00 AM at Park Regis (160 Broad St, B15 1DT). Let us know if you need prayer or transport assistance! 🙏",
      'false',
      new Date().toISOString()
    ]
  ];

  sheet.getRange(2, 1, defaultCampaigns.length, headers.length).setValues(defaultCampaigns);
  SpreadsheetApp.flush();
}

/** JSON response helper */
function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Clean phone number for matching */
function cleanPhone(num) {
  return String(num || '').replace(/\D/g, '');
}

// ──────────────────────────────────────────────────────────────────
// HTTP ENTRY POINTS
// ──────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    ensureHeaders();
    const p = (e && e.parameter) ? e.parameter : {};
    switch (p.action) {
      case 'next':                return handleNext(p.caller, p.campaign);
      case 'submit':              return handleSubmit(p);
      case 'submit_next':         return handleSubmitAndNext(p);
      case 'opt_out':             return handleOptOut(p);
      case 'whatsapp_sent':       return handleWhatsAppSent(p);
      case 'contacts':            return handleContacts();
      case 'dashboard':           return handleDashboard(p.campaign);
      case 'get_campaigns':       return handleGetCampaigns();
      case 'save_campaign':       return handleSaveCampaign(p);
      case 'set_active_campaign': return handleSetActiveCampaign(p.id);
      case 'ping':                return jsonResp({ success: true, message: 'Harvesters Birmingham Multi-Campaign API online' });
      default:                    return jsonResp({ error: 'Unknown action: ' + (p.action || 'none') });
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

function extractContact(row, rowNumber, currentCampaign) {
  var fullName = String(row[COL_NAME - 1] || '').trim();
  var parts = fullName.split(/\s+/);
  var firstName = parts[0] || '';
  var surname = parts.slice(1).join(' ') || '';

  return {
    id:        rowNumber,
    row:       rowNumber,
    contactId: String(row[COL_ID - 1] || '').trim() || ('CON-' + rowNumber),
    name:      fullName || 'Friend',
    firstName: firstName,
    surname:   surname,
    phone:     String(row[COL_PHONE - 1] || '').trim(),
    status:    String(row[COL_STATUS - 1] || '').trim() || null,
    calledBy:  String(row[COL_CALLER - 1] || '').trim() || null,
    notes:     String(row[COL_NOTES - 1] || ''),
    calledAt:  row[COL_TIME - 1] || null,
    campaign:  String(row[COL_CAMPAIGN - 1] || '').trim() || currentCampaign || ''
  };
}

/** Get Set of phones and IDs that are on the DoNotCall list */
function getDoNotCallSet() {
  const sheet = getDoNotCallSheet();
  const data = sheet.getDataRange().getValues();
  const set = new Set();
  for (let i = 1; i < data.length; i++) {
    const phone = cleanPhone(data[i][4]);
    const cid = String(data[i][1] || '').trim();
    if (phone) set.add('phone:' + phone);
    if (cid) set.add('id:' + cid);
  }
  return set;
}

/** Get Set of contacts already called for a specific campaign from Call_Log */
function getCalledSetForCampaign(campaignId) {
  if (!campaignId) return new Set();
  const sheet = getCallLogSheet();
  const data = sheet.getDataRange().getValues();
  const set = new Set();
  const targetCampaign = campaignId.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const loggedCampId = String(data[i][5] || '').toLowerCase().trim();
    if (loggedCampId === targetCampaign) {
      const cid = String(data[i][1] || '').trim();
      const phone = cleanPhone(data[i][4]);
      if (cid) set.add('id:' + cid);
      if (phone) set.add('phone:' + phone);
    }
  }
  return set;
}

// ──────────────────────────────────────────────────────────────────
// ACTION: NEXT  –  Claim next available contact for a campaign
// ──────────────────────────────────────────────────────────────────

function handleNext(caller, campaign) {
  if (!caller) return jsonResp({ error: 'Caller name required' });
  const campaignId = (campaign || 'sunday-service').trim();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const total = Math.max(0, data.length - 1);

    const dncSet = getDoNotCallSet();
    const calledSet = getCalledSetForCampaign(campaignId);

    // Pass 1: Check if this caller already has an unfinished claimed contact for this campaign
    for (let i = data.length - 1; i >= 1; i--) {
      const contact = extractContact(data[i], i + 1, campaignId);
      const phoneKey = 'phone:' + cleanPhone(contact.phone);
      const idKey = 'id:' + contact.contactId;

      if (dncSet.has(phoneKey) || dncSet.has(idKey)) continue;

      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      const rowCamp  = String(data[i][COL_CAMPAIGN - 1] || '').trim().toLowerCase();

      // If claimed by this caller for this campaign and not submitted yet
      if (!status && calledBy.toLowerCase() === caller.toLowerCase() && rowCamp === campaignId.toLowerCase()) {
        return jsonResp({
          success: true,
          contact: contact,
          stats: { total: total, called: calledSet.size, pending: Math.max(0, total - calledSet.size) }
        });
      }
    }

    // Pass 2: Find next uncalled & unclaimed contact for this campaign (bottom up)
    for (let i = data.length - 1; i >= 1; i--) {
      const contact = extractContact(data[i], i + 1, campaignId);
      const phoneKey = 'phone:' + cleanPhone(contact.phone);
      const idKey = 'id:' + contact.contactId;

      // Skip opted-out
      if (dncSet.has(phoneKey) || dncSet.has(idKey)) continue;

      // Double-call prevention: skip if already logged as called for this campaign
      if (calledSet.has(phoneKey) || calledSet.has(idKey)) continue;

      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      const rowCamp  = String(data[i][COL_CAMPAIGN - 1] || '').trim().toLowerCase();

      // If row has status for this exact campaign, skip
      if (status && rowCamp === campaignId.toLowerCase()) continue;

      // If currently claimed by another volunteer for this campaign, skip
      if (calledBy && !status && rowCamp === campaignId.toLowerCase()) continue;

      // Found an eligible contact for this campaign!
      const row = i + 1;
      sheet.getRange(row, COL_CALLER).setValue(caller);
      sheet.getRange(row, COL_CAMPAIGN).setValue(campaignId);
      sheet.getRange(row, COL_STATUS).setValue(''); // clear status for new campaign call

      SpreadsheetApp.flush();
      return jsonResp({
        success: true,
        contact: contact,
        stats: { total: total, called: calledSet.size, pending: Math.max(0, total - calledSet.size - 1) }
      });
    }

    // No contacts left for this campaign
    return jsonResp({
      success: true,
      contact: null,
      done: true,
      stats: { total: total, called: calledSet.size, pending: 0 }
    });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: SUBMIT  –  Record response & feedback for a contact
// ──────────────────────────────────────────────────────────────────

function handleSubmit(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row: ' + p.row });

    const status    = p.status || '';
    const caller    = p.caller || '';
    const notes     = p.notes || '';
    const campaign  = p.campaign || 'sunday-service';
    const timestamp = p.timestamp || new Date().toISOString();

    // 1. Update active sheet row
    sheet.getRange(row, COL_STATUS).setValue(status);
    sheet.getRange(row, COL_CALLER).setValue(caller);
    sheet.getRange(row, COL_NOTES).setValue(notes);
    sheet.getRange(row, COL_TIME).setValue(timestamp);
    sheet.getRange(row, COL_CAMPAIGN).setValue(campaign);

    // 2. Append to Call_Log
    const contactRow = sheet.getRange(row, 1, 1, 3).getValues()[0];
    const contactId = String(contactRow[COL_ID - 1] || ('CON-' + row));
    const contactName = String(contactRow[COL_NAME - 1] || 'Friend');
    const contactPhone = String(contactRow[COL_PHONE - 1] || '');

    const logSheet = getCallLogSheet();
    logSheet.appendRow([
      timestamp, contactId, row, contactName, contactPhone,
      campaign, p.campaignName || campaign, status, caller, notes
    ]);

    SpreadsheetApp.flush();
    return jsonResp({ success: true, row: row });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: SUBMIT_NEXT  –  Atomically submit response + claim next
// ──────────────────────────────────────────────────────────────────

function handleSubmitAndNext(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row' });

    const status    = p.status || '';
    const caller    = p.caller || '';
    const notes     = p.notes || '';
    const campaign  = (p.campaign || 'sunday-service').trim();
    const timestamp = p.timestamp || new Date().toISOString();

    // 1. Atomically write response to the contact's row
    sheet.getRange(row, COL_STATUS, 1, 5).setValues([[
      status,
      caller,
      notes,
      timestamp,
      campaign
    ]]);

    // 2. Append to permanent Call_Log
    const contactRow = sheet.getRange(row, 1, 1, 3).getValues()[0];
    const contactId = String(contactRow[COL_ID - 1] || ('CON-' + row));
    const contactName = String(contactRow[COL_NAME - 1] || 'Friend');
    const contactPhone = String(contactRow[COL_PHONE - 1] || '');

    const logSheet = getCallLogSheet();
    logSheet.appendRow([
      timestamp, contactId, row, contactName, contactPhone,
      campaign, p.campaignName || campaign, status, caller, notes
    ]);

    SpreadsheetApp.flush();

    // 3. Find next uncalled contact for this campaign (bottom up)
    const data = sheet.getDataRange().getValues();
    const total = Math.max(0, data.length - 1);
    const dncSet = getDoNotCallSet();
    const calledSet = getCalledSetForCampaign(campaign);

    for (let j = data.length - 1; j >= 1; j--) {
      const nextRow = j + 1;
      if (nextRow === row) continue;

      const nextContact = extractContact(data[j], nextRow, campaign);
      const phoneKey = 'phone:' + cleanPhone(nextContact.phone);
      const idKey = 'id:' + nextContact.contactId;

      if (dncSet.has(phoneKey) || dncSet.has(idKey)) continue;
      if (calledSet.has(phoneKey) || calledSet.has(idKey)) continue;

      const cStatus   = String(data[j][COL_STATUS - 1] || '').trim();
      const cCalledBy = String(data[j][COL_CALLER - 1] || '').trim();
      const cCamp     = String(data[j][COL_CAMPAIGN - 1] || '').trim().toLowerCase();

      if (cStatus && cCamp === campaign.toLowerCase()) continue;
      if (cCalledBy && !cStatus && cCamp === campaign.toLowerCase()) continue;

      // Lock row for this caller and campaign
      sheet.getRange(nextRow, COL_CALLER).setValue(caller);
      sheet.getRange(nextRow, COL_CAMPAIGN).setValue(campaign);
      sheet.getRange(nextRow, COL_STATUS).setValue('');
      SpreadsheetApp.flush();

      return jsonResp({
        success: true,
        next: nextContact,
        stats: { total: total, called: calledSet.size, pending: Math.max(0, total - calledSet.size - 1) }
      });
    }

    return jsonResp({
      success: true,
      next: null,
      done: true,
      stats: { total: total, called: calledSet.size, pending: 0 }
    });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: OPT_OUT  –  Permanently delete member record from database
// ──────────────────────────────────────────────────────────────────

function handleOptOut(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row: ' + p.row });

    const caller    = p.caller || '';
    const campaign  = p.campaign || '';
    const reason    = p.reason || p.notes || 'Member requested to be removed from database (Do Not Call)';
    const timestamp = p.timestamp || new Date().toISOString();

    // 1. Read details before removing
    const contactRow = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), 3)).getValues()[0];
    const contactId = String(contactRow[COL_ID - 1] || ('CON-' + row));
    const contactName = String(contactRow[COL_NAME - 1] || 'Friend');
    const contactPhone = String(contactRow[COL_PHONE - 1] || '');

    // 2. Log in DoNotCall suppression sheet
    const dncSheet = getDoNotCallSheet();
    dncSheet.appendRow([
      timestamp, contactId, row, contactName, contactPhone,
      caller, reason, campaign
    ]);

    // 3. Delete row off the active calling database so nobody calls them again
    sheet.deleteRow(row);
    SpreadsheetApp.flush();

    // 4. Atomically claim next contact for this caller
    const data = sheet.getDataRange().getValues();
    const total = Math.max(0, data.length - 1);
    const dncSet = getDoNotCallSet();
    const calledSet = getCalledSetForCampaign(campaign);

    for (let j = data.length - 1; j >= 1; j--) {
      const nextRow = j + 1;
      const nextContact = extractContact(data[j], nextRow, campaign);
      const phoneKey = 'phone:' + cleanPhone(nextContact.phone);
      const idKey = 'id:' + nextContact.contactId;

      if (dncSet.has(phoneKey) || dncSet.has(idKey)) continue;
      if (calledSet.has(phoneKey) || calledSet.has(idKey)) continue;

      const cStatus   = String(data[j][COL_STATUS - 1] || '').trim();
      const cCalledBy = String(data[j][COL_CALLER - 1] || '').trim();
      const cCamp     = String(data[j][COL_CAMPAIGN - 1] || '').trim().toLowerCase();

      if (cStatus && cCamp === campaign.toLowerCase()) continue;
      if (cCalledBy && !cStatus && cCamp === campaign.toLowerCase()) continue;

      sheet.getRange(nextRow, COL_CALLER).setValue(caller);
      sheet.getRange(nextRow, COL_CAMPAIGN).setValue(campaign);
      sheet.getRange(nextRow, COL_STATUS).setValue('');
      SpreadsheetApp.flush();

      return jsonResp({
        success: true,
        deleted: true,
        next: nextContact,
        stats: { total: total, called: calledSet.size, pending: Math.max(0, total - calledSet.size - 1) }
      });
    }

    return jsonResp({
      success: true,
      deleted: true,
      next: null,
      done: true,
      stats: { total: total, called: calledSet.size, pending: 0 }
    });

  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────
// ACTION: WHATSAPP_SENT  –  Log WhatsApp message dispatch
// ──────────────────────────────────────────────────────────────────

function handleWhatsAppSent(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet();
    const row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row: ' + p.row });

    const currentNotes = String(sheet.getRange(row, COL_NOTES).getValue() || '');
    const tag = p.note || '[WhatsApp Details Sent]';
    const newNotes = currentNotes ? (currentNotes + ' | ' + tag) : tag;

    sheet.getRange(row, COL_NOTES).setValue(newNotes);

    const currentCaller = String(sheet.getRange(row, COL_CALLER).getValue() || '').trim();
    if (!currentCaller) {
      sheet.getRange(row, COL_CALLER).setValue('WhatsApp Dispatch');
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
// ACTION: CONTACTS  –  Return all active contacts with status & notes
// ──────────────────────────────────────────────────────────────────

function handleContacts() {
  const sheet    = getSheet();
  const data     = sheet.getDataRange().getValues();
  const contacts = [];
  const dncSet   = getDoNotCallSet();

  for (let i = 1; i < data.length; i++) {
    const contact = extractContact(data[i], i + 1);
    const cleanPh = cleanPhone(contact.phone);
    if ((cleanPh && dncSet.has('phone:' + cleanPh)) || (contact.contactId && dncSet.has('id:' + contact.contactId))) {
      continue; // suppress opted-out members
    }
    contacts.push(contact);
  }

  return jsonResp({ success: true, contacts: contacts });
}

// ──────────────────────────────────────────────────────────────────
// ACTION: DASHBOARD  –  Aggregated stats, leaderboard, and feedback
// ──────────────────────────────────────────────────────────────────

function handleDashboard(filterCampaign) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const total = Math.max(0, data.length - 1);

  const logSheet = getCallLogSheet();
  const logData = logSheet.getDataRange().getValues();

  let called = 0, willAttend = 0, notAttend = 0, unsure = 0, noAnswer = 0;
  const callerMap = {};
  const campaignMap = {};
  const log = [];
  const feedbacks = [];

  const targetCamp = filterCampaign ? filterCampaign.trim().toLowerCase() : '';

  // Process calls from Call_Log (or sheet data fallback if Call_Log empty)
  if (logData.length > 1) {
    for (let i = 1; i < logData.length; i++) {
      const campId = String(logData[i][5] || '').trim();
      const status = String(logData[i][7] || '').trim().toLowerCase();
      const caller = String(logData[i][8] || '').trim();
      const notes  = String(logData[i][9] || '').trim();

      if (campId) {
        if (!campaignMap[campId]) campaignMap[campId] = 0;
        campaignMap[campId]++;
      }

      if (targetCamp && campId.toLowerCase() !== targetCamp) {
        continue;
      }

      called++;
      const isWillAttend = (status === 'will attend' || status === 'will-attend' || status === 'yes');
      const isNotAttend  = (status === 'not attend' || status === 'not-attend' || status === 'no');
      const isUnsure     = (status === 'unsure' || status === 'tbc');
      const isNoAnswer   = !isWillAttend && !isNotAttend && !isUnsure;

      if (isWillAttend)      willAttend++;
      else if (isNotAttend)  notAttend++;
      else if (isUnsure)     unsure++;
      else                   noAnswer++;

      if (caller) {
        if (!callerMap[caller]) callerMap[caller] = { total: 0, willAttend: 0, notAttend: 0, unsure: 0, noAnswer: 0 };
        callerMap[caller].total++;
        if (isWillAttend)      callerMap[caller].willAttend++;
        else if (isNotAttend)  callerMap[caller].notAttend++;
        else if (isUnsure)     callerMap[caller].unsure++;
        else                   callerMap[caller].noAnswer++;
      }

      const entry = {
        id:        i,
        name:      String(logData[i][3] || ''),
        contactId: String(logData[i][1] || ''),
        phone:     String(logData[i][4] || ''),
        status:    logData[i][7],
        calledBy:  caller,
        notes:     notes,
        campaign:  campId,
        calledAt:  logData[i][0] || ''
      };

      log.push(entry);
      if (notes) feedbacks.push(entry);
    }
  } else {
    // Fallback: Read directly from Sheet3
    for (let i = 1; i < data.length; i++) {
      const status = String(data[i][COL_STATUS - 1] || '').trim().toLowerCase();
      if (!status) continue;

      const camp = String(data[i][COL_CAMPAIGN - 1] || '').trim();
      if (camp) {
        if (!campaignMap[camp]) campaignMap[camp] = 0;
        campaignMap[camp]++;
      }

      if (targetCamp && camp.toLowerCase() !== targetCamp) continue;

      called++;
      const isWillAttend = (status === 'will attend' || status === 'will-attend' || status === 'yes');
      const isNotAttend  = (status === 'not attend' || status === 'not-attend' || status === 'no');
      const isUnsure     = (status === 'unsure' || status === 'tbc');
      const isNoAnswer   = !isWillAttend && !isNotAttend && !isUnsure;

      if (isWillAttend)      willAttend++;
      else if (isNotAttend)  notAttend++;
      else if (isUnsure)     unsure++;
      else                   noAnswer++;

      const caller = String(data[i][COL_CALLER - 1] || '').trim();
      if (caller) {
        if (!callerMap[caller]) callerMap[caller] = { total: 0, willAttend: 0, notAttend: 0, unsure: 0, noAnswer: 0 };
        callerMap[caller].total++;
        if (isWillAttend)      callerMap[caller].willAttend++;
        else if (isNotAttend)  callerMap[caller].notAttend++;
        else if (isUnsure)     callerMap[caller].unsure++;
        else                   callerMap[caller].noAnswer++;
      }

      const c = extractContact(data[i], i + 1);
      const entry = {
        id:        i + 1,
        name:      c.name,
        contactId: c.contactId,
        phone:     c.phone,
        status:    data[i][COL_STATUS - 1],
        calledBy:  caller,
        notes:     c.notes,
        campaign:  camp,
        calledAt:  c.calledAt || ''
      };

      log.push(entry);
      if (c.notes) feedbacks.push(entry);
    }
  }

  log.reverse();
  feedbacks.reverse();

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
    campaigns: campaignMap,
    log: log,
    feedbacks: feedbacks
  });
}

// ──────────────────────────────────────────────────────────────────
// CAMPAIGN MANAGEMENT: Read, Save, and Set Active Campaigns
// ──────────────────────────────────────────────────────────────────

function handleGetCampaigns() {
  const sheet = getCampaignsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResp({ success: true, campaigns: [] });
  }

  const headers = data[0].map(h => String(h).trim());
  const campaigns = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, idx) => {
      item[h] = row[idx];
    });
    item.isActive = (String(item.isActive).toLowerCase() === 'true');
    campaigns.push(item);
  }

  return jsonResp({ success: true, campaigns: campaigns });
}

function handleSaveCampaign(p) {
  if (!p.id || !p.name) return jsonResp({ error: 'Campaign id and name are required' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getCampaignsSheet();
    const data = sheet.getDataRange().getValues();

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(p.id).trim()) {
        targetRow = i + 1;
        break;
      }
    }

    const rowData = [
      p.id,
      p.name || '',
      p.theme || '',
      p.venue || '',
      p.dateTime || '',
      p.scriptIntro || '',
      p.theAsk || '',
      p.branchYes || '',
      p.branchUnsure || '',
      p.branchNo || '',
      p.closing || '',
      p.whatsappTemplate || '',
      p.isActive === 'true' || p.isActive === true ? 'true' : 'false',
      new Date().toISOString()
    ];

    if (targetRow > 1) {
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    SpreadsheetApp.flush();
    return jsonResp({ success: true, id: p.id, savedAt: new Date().toISOString() });
  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleSetActiveCampaign(campaignId) {
  if (!campaignId) return jsonResp({ error: 'Campaign id is required' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getCampaignsSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResp({ error: 'No campaigns found' });

    for (let i = 1; i < data.length; i++) {
      const isMatch = (String(data[i][0]).trim() === String(campaignId).trim());
      sheet.getRange(i + 1, 13).setValue(isMatch ? 'true' : 'false');
    }

    SpreadsheetApp.flush();
    return jsonResp({ success: true, activeId: campaignId });
  } catch (err) {
    return jsonResp({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}
