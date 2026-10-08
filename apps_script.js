// =================================================================
// HARVESTERS CROYDON – Member Outreach & Calling App Backend
// Google Apps Script — Paste this into your Google Sheet's
// Extensions → Apps Script editor
// Compatible with: Harvesters Croydon Member Data (Sheet1)
// =================================================================

// TARGET SHEET TAB
// Target tab containing Croydon member data (490 contacts)
const TARGET_SHEET_NAME = 'Sheet1';
const CAMPAIGNS_SHEET_NAME = 'Campaigns';

// COLUMN MAPPING (1-indexed, matching Croydon Sheet1)
// Existing data in Sheet1:
// A (1) = First Name
// B (2) = Last Name
// C (3) = Email
// D (4) = PHONE_NO
//
// Outreach Tracking Columns:
// E (5) = Call Status (will-attend, unsure, not-attend, no-answer, wrong-number)
// F (6) = Call Agent (Caller volunteer name)
// G (7) = Feedback & Notes (Member feedback, prayer requests, tags)
// H (8) = Campaign (Active campaign name or ID)
// I (9) = Called At (ISO timestamp)

const COL_FIRST_NAME = 1; // Column A
const COL_LAST_NAME  = 2; // Column B
const COL_EMAIL      = 3; // Column C
const COL_PHONE      = 4; // Column D

const COL_STATUS     = 5; // Column E: Call Status
const COL_CALLER     = 6; // Column F: Call Agent
const COL_NOTES      = 7; // Column G: Feedback & Notes
const COL_CAMPAIGN   = 8; // Column H: Campaign
const COL_TIME       = 9; // Column I: Called At

/** Get the primary member data sheet */
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

/** Ensure headers exist on Sheet1 and Campaigns sheet */
function ensureHeaders() {
  const sheet = getSheet();
  const lastCol = Math.max(sheet.getLastColumn(), 9);
  const row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const headerE = String(row1[COL_STATUS - 1] || '').trim();

  // If columns E to I are not present or named, add them
  if (!headerE || !headerE.toLowerCase().includes('status')) {
    sheet.getRange(1, COL_STATUS, 1, 5).setValues([[
      'Call Status',
      'Call Agent',
      'Feedback & Notes',
      'Campaign',
      'Called At'
    ]]);
    SpreadsheetApp.flush();
  }

  // Ensure Campaigns tab is initialized
  getCampaignsSheet();
}

/** Initialize default Croydon church campaigns in the Campaigns sheet */
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
      'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR',
      'Every Sunday · 10:00 AM',
      "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName}, and I’m calling from Harvesters Croydon. I hope you're having a blessed week!",
      "We're having our Sunday Celebration Service this coming Sunday at 10:00 AM, and we would love for you to be with us. Will you be able to join us?",
      "That is wonderful! We look forward to welcoming you. Feel free to come along with family and friends — parking is free on-site!",
      "No problem at all, {FirstName}. I wanted to personally connect and let you know you're in our thoughts. Would you like me to send you the details on WhatsApp, and is there any prayer request we can stand with you in?",
      "That is completely fine, {FirstName}. Thank you for your time! You can also join our livestream online, and we pray God blesses your week abundantly.",
      "Thank you so much for your time, {FirstName}. Have a wonderful and victorious week, and God bless you!",
      "Hi {FirstName}! 👋 This is {CallerName} from Harvesters Croydon.\n\nHere are the details for our Sunday Celebration Service:\n📍 The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR\n🗓️ This Sunday\n🕙 10:00 AM\n🚗 Free parking available on-site\n\nWe look forward to seeing you! Let us know if you need transport assistance or prayer. Have a blessed week! 🙏",
      'true',
      new Date().toISOString()
    ],
    [
      'member-care',
      'Member Care & Welfare Check-in',
      'Pastoral Care & Prayer Support',
      'Harvesters Croydon Campus & Online',
      'Ongoing Church Care Outreach',
      "Hello {FirstName}, this is {CallerName} from Harvesters Croydon! I'm calling to check in on you, see how you are doing, and let you know the church family is thinking of you.",
      "How has life, family, and work been with you recently? We'd love to know how the church can best support and pray for you right now.",
      "Thank you so much for sharing, {FirstName}. It is well with you! I will record this note so our pastoral and prayer team can uphold you in prayer.",
      "We understand, {FirstName}. Please remember our pastoral care team is always here for you whenever you need support or a listening ear.",
      "Thank you for taking my call today, {FirstName}. May the peace and favor of God surround you and your household.",
      "Thank you for your time, {FirstName}. God bless you richly!",
      "Hi {FirstName}, this is {CallerName} from Harvesters Croydon. Just wanted to send some love and remind you that you are valued and prayed for! If there is ever anything you need prayer or support with, please reply here. 🙏✨",
      'false',
      new Date().toISOString()
    ],
    [
      'revival-encounter',
      'Special Miracle & Word Encounter',
      'Breakthrough & Spiritual Renewal',
      'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR',
      'Special Weekend Gathering',
      "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName} from Harvesters Croydon. We have a powerful upcoming Miracle Encounter gathering and wanted to specially invite you!",
      "It is going to be an extraordinary time of breakthrough prayer, deep worship, and the supernatural word. Will you be able to make it?",
      "Glory to God! We can't wait to see you there. Come with an expectation for a life-transforming encounter.",
      "No worries at all! I'd love to send you the flyer and timings on WhatsApp so you have them in case your schedule opens up.",
      "Understood, {FirstName}! We pray God's blessing and protection over you, and hope to see you at our upcoming weekly services.",
      "Have a blessed day, {FirstName}, and God bless you richly!",
      "Hi {FirstName}! 👋 Here are the details for our Miracle & Word Encounter at Harvesters Croydon:\n📍 The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR\n✨ Expect miracles, healing, and supernatural breakthrough!\nSee you there! 🔥",
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

// ──────────────────────────────────────────────────────────────────
// HTTP ENTRY POINTS
// ──────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    ensureHeaders();
    const p = (e && e.parameter) ? e.parameter : {};
    switch (p.action) {
      case 'next':              return handleNext(p.caller, p.campaign);
      case 'submit':            return handleSubmit(p);
      case 'submit_next':       return handleSubmitAndNext(p);
      case 'whatsapp_sent':     return handleWhatsAppSent(p);
      case 'contacts':          return handleContacts();
      case 'dashboard':         return handleDashboard();
      case 'get_campaigns':     return handleGetCampaigns();
      case 'save_campaign':     return handleSaveCampaign(p);
      case 'set_active_campaign': return handleSetActiveCampaign(p.id);
      case 'ping':              return jsonResp({ success: true, message: 'Harvesters Croydon Call Campaign API online' });
      default:                  return jsonResp({ error: 'Unknown action: ' + (p.action || 'none') });
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
// HELPER: Extract and normalize Croydon contact data from row
// ──────────────────────────────────────────────────────────────────

function extractContact(row, rowNumber) {
  const firstName = String(row[COL_FIRST_NAME - 1] || '').trim();
  const lastName  = String(row[COL_LAST_NAME - 1] || '').trim();
  const fullName  = (firstName + ' ' + lastName).trim() || 'Church Member';

  return {
    id: rowNumber,
    row: rowNumber,
    contactId: 'HC-' + ('000' + (rowNumber - 1)).slice(-3),
    firstName: firstName || fullName.split(/\s+/)[0] || 'Member',
    lastName: lastName,
    name: fullName,
    email: String(row[COL_EMAIL - 1] || '').trim(),
    phone: String(row[COL_PHONE - 1] || '').trim(),
    status: String(row[COL_STATUS - 1] || '').trim() || null,
    calledBy: String(row[COL_CALLER - 1] || '').trim() || null,
    notes: String(row[COL_NOTES - 1] || '').trim() || '',
    campaign: String(row[COL_CAMPAIGN - 1] || '').trim() || '',
    calledAt: row[COL_TIME - 1] || null
  };
}

// ──────────────────────────────────────────────────────────────────
// ACTION: NEXT  –  Claim and return the next available contact
// ──────────────────────────────────────────────────────────────────

function handleNext(caller, campaign) {
  if (!caller) return jsonResp({ error: 'Caller name required' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const total = Math.max(0, data.length - 1);
    let called  = 0;

    // Pass 1: Check if caller already has a claimed-but-unsubmitted contact (search from bottom up)
    for (let i = data.length - 1; i >= 1; i--) {
      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (status) { called++; continue; }
      if (calledBy.toLowerCase() === caller.toLowerCase()) {
        return jsonResp({
          success: true,
          contact: extractContact(data[i], i + 1),
          stats: { total: total, called: called, pending: total - called }
        });
      }
    }

    // Pass 2: Find first completely unclaimed contact starting from bottom of sheet upwards
    for (let i = data.length - 1; i >= 1; i--) {
      const status   = String(data[i][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[i][COL_CALLER - 1] || '').trim();
      if (!status && !calledBy) {
        const row = i + 1;
        sheet.getRange(row, COL_CALLER).setValue(caller);
        if (campaign) {
          sheet.getRange(row, COL_CAMPAIGN).setValue(campaign);
        }
        SpreadsheetApp.flush();
        return jsonResp({
          success: true,
          contact: extractContact(data[i], row),
          stats: { total: total, called: called, pending: total - called - 1 }
        });
      }
    }

    // All contacts called or claimed
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
// ACTION: SUBMIT  –  Record response & feedback for a contact
// ──────────────────────────────────────────────────────────────────

function handleSubmit(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet();
    const row   = parseInt(p.row, 10);
    if (!row || row < 2) return jsonResp({ error: 'Invalid row: ' + p.row });

    const notes = p.notes || '';
    const campaign = p.campaign || '';
    const timestamp = p.timestamp || new Date().toISOString();

    sheet.getRange(row, COL_STATUS).setValue(p.status);
    sheet.getRange(row, COL_CALLER).setValue(p.caller);
    sheet.getRange(row, COL_NOTES).setValue(notes);
    if (campaign) sheet.getRange(row, COL_CAMPAIGN).setValue(campaign);
    sheet.getRange(row, COL_TIME).setValue(timestamp);

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

    // 1. Write the response atomically
    const notes = p.notes || '';
    const campaign = p.campaign || '';
    const timestamp = p.timestamp || new Date().toISOString();

    sheet.getRange(row, COL_STATUS, 1, 5).setValues([[
      p.status,
      p.caller,
      notes,
      campaign,
      timestamp
    ]]);

    SpreadsheetApp.flush();

    // 2. Find next contact from bottom of sheet upwards
    const data  = sheet.getDataRange().getValues();
    const total = Math.max(0, data.length - 1);
    let called = 0;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COL_STATUS - 1] || '').trim()) called++;
    }

    for (let j = data.length - 1; j >= 1; j--) {
      const status   = String(data[j][COL_STATUS - 1] || '').trim();
      const calledBy = String(data[j][COL_CALLER - 1] || '').trim();
      if (!status && !calledBy) {
        const nextRow = j + 1;
        sheet.getRange(nextRow, COL_CALLER).setValue(p.caller);
        if (campaign) sheet.getRange(nextRow, COL_CAMPAIGN).setValue(campaign);
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
// ACTION: WHATSAPP_SENT  –  Log a WhatsApp DM dispatch
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
// ACTION: CONTACTS  –  Return all contacts with status & feedback
// ──────────────────────────────────────────────────────────────────

function handleContacts() {
  const sheet    = getSheet();
  const data     = sheet.getDataRange().getValues();
  const contacts = [];

  for (let i = 1; i < data.length; i++) {
    const contact = extractContact(data[i], i + 1);
    contacts.push(contact);
  }

  return jsonResp({ success: true, contacts: contacts });
}

// ──────────────────────────────────────────────────────────────────
// ACTION: DASHBOARD  –  Aggregated stats, leaderboard, & feedbacks
// ──────────────────────────────────────────────────────────────────

function handleDashboard() {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const total = Math.max(0, data.length - 1);

  let called = 0, willAttend = 0, notAttend = 0, unsure = 0, noAnswer = 0, wrongNumber = 0;
  const callerMap = {};
  const campaignMap = {};
  const log = [];
  const feedbacks = [];

  for (let i = 1; i < data.length; i++) {
    const status = String(data[i][COL_STATUS - 1] || '').trim().toLowerCase();
    if (!status) continue;

    called++;

    const isWillAttend = (status === 'will attend' || status === 'will-attend' || status === 'yes');
    const isNotAttend  = (status === 'not attend' || status === 'not-attend' || status === 'no');
    const isUnsure     = (status === 'unsure' || status === 'tbc');
    const isWrongNum   = (status === 'wrong number' || status === 'wrong-number' || status === 'invalid');
    const isNoAnswer   = !isWillAttend && !isNotAttend && !isUnsure && !isWrongNum;

    if (isWillAttend)       willAttend++;
    else if (isNotAttend)   notAttend++;
    else if (isUnsure)      unsure++;
    else if (isWrongNum)    wrongNumber++;
    else                    noAnswer++;

    const caller = String(data[i][COL_CALLER - 1] || '').trim();
    if (caller) {
      if (!callerMap[caller]) callerMap[caller] = { total: 0, willAttend: 0, notAttend: 0, unsure: 0, noAnswer: 0 };
      callerMap[caller].total++;
      if (isWillAttend) callerMap[caller].willAttend++;
      else if (isNotAttend) callerMap[caller].notAttend++;
      else if (isUnsure) callerMap[caller].unsure++;
      else callerMap[caller].noAnswer++;
    }

    const campaign = String(data[i][COL_CAMPAIGN - 1] || '').trim();
    if (campaign) {
      if (!campaignMap[campaign]) campaignMap[campaign] = 0;
      campaignMap[campaign]++;
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
      campaign:  campaign,
      calledAt:  c.calledAt || ''
    };

    log.push(entry);

    if (c.notes) {
      feedbacks.push(entry);
    }
  }

  log.reverse();       // Most recent calls first
  feedbacks.reverse(); // Most recent feedback first

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
      na: noAnswer,
      wrongNumber: wrongNumber
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
    const headers = data[0].map(h => String(h).trim());

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
