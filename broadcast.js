// =====================================================
// HARVESTERS BIRMINGHAM – Awakening WhatsApp Broadcast
// Private Admin Console Logic
// =====================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxQhZHOa5OfG7WM4460paNpZ1j96F4yGuNB97RFwPKcjMvhgMps28WcEet5UOuCQ80szA/exec';
const ADMIN_PIN = '1210';
const STORAGE_PIN_KEY = 'hb_awakening_admin_auth';
const STORAGE_SENT_KEY = 'hb_awakening_wa_sent_ids';
const STORAGE_TEMPLATE_KEY = 'hb_awakening_wa_template';

const DEFAULT_TEMPLATE = 
`Hi {{FirstName}}, this is Harvesters Birmingham! 🌟

We specially invite you to Awakening — our 2-day power gathering for Breakthrough and Spiritual Renewal!

📍 Venue: Park Regis, 160 Broad St, Birmingham B15 1DT
🗓️ Dates: Saturday 26th & Sunday 27th September
🕙 Time: 09:00am - 03:00pm
🚗 Parking: Free parking available on-site and on-street

We would really love to have you with us! Will you be able to make it?`;

// App State
let STATE = {
  rawContacts: [],
  filteredQueue: [],
  currentIndex: 0,
  sentIds: new Set(),
  audience: 'uncalled',
  sortOrder: 'bottom-up',
  template: DEFAULT_TEMPLATE,
  searchQuery: ''
};

// UI Helper
function $(id) { return document.getElementById(id); }

function showToast(msg, duration) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration || 2500);
}

function showLoading(msg) {
  const overlay = $('loadingOverlay');
  const text = $('loadingText');
  if (overlay) overlay.classList.add('active');
  if (text) text.textContent = msg || 'Loading...';
}

function hideLoading() {
  const overlay = $('loadingOverlay');
  if (overlay) overlay.classList.remove('active');
}

function getInitials(name) {
  if (!name) return 'HB';
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===== API HELPER =====
async function api(params) {
  if (!API_URL) throw new Error('API URL not configured');
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ===== PHONE HELPERS =====
function cleanDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function formatE164(phone) {
  let digits = cleanDigits(phone);
  if (!digits) return '';

  // UK standard local: 07... -> 447...
  if (digits.startsWith('0') && digits.length === 11) {
    return '44' + digits.slice(1);
  }
  // UK mobile without 0: 7... (10 digits) -> 447...
  if (digits.startsWith('7') && digits.length === 10) {
    return '44' + digits;
  }
  // Nigeria international: 234...
  if (digits.startsWith('234') && digits.length >= 12) {
    return digits;
  }
  // Already has 44
  if (digits.startsWith('44')) {
    return digits;
  }
  return digits;
}

function isValidMobile(phone) {
  const e164 = formatE164(phone);
  if (!e164 || e164.length < 10) return false;
  // UK mobile check: 447... (12 digits)
  if (e164.startsWith('447') && e164.length === 12) return true;
  // Nigeria mobile check: 234... (13 digits)
  if (e164.startsWith('234') && e164.length >= 12) return true;
  // Generic mobile fallback
  return e164.length >= 10 && e164.length <= 15;
}

function formatDisplayPhone(phone) {
  const e164 = formatE164(phone);
  if (!e164) return String(phone || '');
  if (e164.startsWith('447') && e164.length === 12) {
    return '+44 ' + e164.slice(2, 6) + ' ' + e164.slice(6);
  }
  if (e164.startsWith('234') && e164.length >= 12) {
    return '+234 ' + e164.slice(3, 6) + ' ' + e164.slice(6, 9) + ' ' + e164.slice(9);
  }
  return '+' + e164;
}

// ===== TEMPLATE BUILDER =====
function renderPersonalizedMessage(template, contact) {
  const fullName = contact.name || 'Friend';
  const firstName = contact.firstName || fullName.split(/\s+/)[0] || 'Friend';

  return template
    .replace(/\{\{FirstName\}\}/g, firstName)
    .replace(/\{\{FullName\}\}/g, fullName);
}

function insertToken(token) {
  const textarea = $('messageTemplate');
  if (!textarea) return;

  const start = textarea.selectionStart || textarea.value.length;
  const end = textarea.selectionEnd || textarea.value.length;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + token + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + token.length;
  textarea.focus();

  onTemplateChange();
}
window.insertToken = insertToken;

function onTemplateChange() {
  const textarea = $('messageTemplate');
  STATE.template = textarea.value;
  localStorage.setItem(STORAGE_TEMPLATE_KEY, STATE.template);

  // Update live preview
  updateLivePreview();
}

function updateLivePreview() {
  const sampleContact = STATE.filteredQueue[STATE.currentIndex] || 
    STATE.rawContacts[0] || { name: 'Praise Adeyemi', firstName: 'Praise' };

  const nameElem = $('previewRecipientName');
  if (nameElem) nameElem.textContent = sampleContact.name;

  const bubbleElem = $('livePreviewBubble');
  if (bubbleElem) {
    bubbleElem.textContent = renderPersonalizedMessage(STATE.template, sampleContact);
  }
}

// ===== QUEUE FILTERING & SORTING =====
function rebuildQueue() {
  let list = STATE.rawContacts.filter(c => isValidMobile(c.phone));

  // Filter by audience
  if (STATE.audience === 'uncalled') {
    list = list.filter(c => !c.status);
  } else if (STATE.audience === 'unsure') {
    list = list.filter(c => String(c.status || '').toLowerCase().includes('unsure'));
  } else if (STATE.audience === 'will-attend') {
    list = list.filter(c => String(c.status || '').toLowerCase().includes('attend') || String(c.status || '').toLowerCase() === 'yes');
  }

  // Sort order (bottom-up default)
  if (STATE.sortOrder === 'bottom-up') {
    list.sort((a, b) => b.row - a.row); // Higher row number (bottom of sheet) first
  } else {
    list.sort((a, b) => a.row - b.row);
  }

  STATE.filteredQueue = list;
  if (STATE.currentIndex >= list.length) {
    STATE.currentIndex = Math.max(0, list.length - 1);
  }

  renderMetrics();
  renderCurrentQueueCard();
  renderContactsTable();
  updateLivePreview();
}

// ===== RENDER: CURRENT QUEUE CARD =====
function renderCurrentQueueCard() {
  const card = $('queueCard');
  const posBadge = $('queuePositionBadge');

  if (STATE.filteredQueue.length === 0) {
    posBadge.textContent = '0 Contacts';
    card.innerHTML = `
      <div style="text-align:center;padding:28px 14px;">
        <div style="font-size:2.5rem;margin-bottom:10px;">🎉</div>
        <h3 style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:4px;">No Contacts In Queue</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);">Try changing the Audience filter above or resetting the queue.</p>
      </div>
    `;
    return;
  }

  const contact = STATE.filteredQueue[STATE.currentIndex];
  const total = STATE.filteredQueue.length;
  const currentPos = STATE.currentIndex + 1;
  const isSent = STATE.sentIds.has(contact.id);

  posBadge.textContent = `Contact ${currentPos} of ${total}`;

  card.innerHTML = `
    <div class="queue-target-header">
      <div class="queue-avatar">${getInitials(contact.name)}</div>
      <div class="queue-identity">
        <div class="queue-index-pill">
          Target #${currentPos} of ${total} · Row ${contact.row}
          ${isSent ? '<span style="color:var(--accent-green);font-weight:900;">(Sent ✓)</span>' : ''}
        </div>
        <div class="queue-name" title="${escapeHtml(contact.name)}">${escapeHtml(contact.name)}</div>
        <div class="queue-phone">${formatDisplayPhone(contact.phone)}</div>
      </div>
    </div>

    <button class="btn-hero-wa" id="dispatchBtn">
      💬 Open WhatsApp &amp; Advance →
    </button>

    <div class="queue-actions-row">
      <button class="btn-sub-action" id="prevBtn" ${STATE.currentIndex === 0 ? 'disabled style="opacity:0.4"' : ''}>⏮️ Previous</button>
      <button class="btn-sub-action" id="skipBtn">Skip ⏭️</button>
    </div>

    <label class="auto-advance-wrap">
      <input type="checkbox" id="autoAdvanceToggle">
      <span>Auto-focus next contact after click</span>
    </label>
  `;

  // Bind buttons
  const dispatchBtn = $('dispatchBtn');
  if (dispatchBtn) dispatchBtn.addEventListener('click', dispatchCurrentContact);

  const prevBtn = $('prevBtn');
  if (prevBtn) prevBtn.addEventListener('click', prevContact);

  const skipBtn = $('skipBtn');
  if (skipBtn) skipBtn.addEventListener('click', skipContact);
}

// ===== DISPATCH CURRENT CONTACT =====
function dispatchCurrentContact() {
  if (STATE.filteredQueue.length === 0) return;

  const contact = STATE.filteredQueue[STATE.currentIndex];
  const e164 = formatE164(contact.phone);
  if (!e164) {
    showToast('⚠️ Invalid phone number for this contact');
    skipContact();
    return;
  }

  const text = renderPersonalizedMessage(STATE.template, contact);
  const waUrl = `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;

  // Open WhatsApp in new tab/window
  window.open(waUrl, '_blank');

  // Mark as sent locally
  STATE.sentIds.add(contact.id);
  saveSentIds();

  // Async log to Google Sheet backend
  logWhatsAppSentToSheet(contact.row);

  showToast(`💬 Opened WhatsApp for ${contact.name}!`, 1800);

  // Advance to next contact
  if (STATE.currentIndex < STATE.filteredQueue.length - 1) {
    STATE.currentIndex++;
  } else {
    showToast('🏁 Reached the end of the queue!');
  }

  renderMetrics();
  renderCurrentQueueCard();
  renderContactsTable();
  updateLivePreview();
}

function prevContact() {
  if (STATE.currentIndex > 0) {
    STATE.currentIndex--;
    renderCurrentQueueCard();
    renderContactsTable();
    updateLivePreview();
  }
}

function skipContact() {
  if (STATE.currentIndex < STATE.filteredQueue.length - 1) {
    STATE.currentIndex++;
    renderCurrentQueueCard();
    renderContactsTable();
    updateLivePreview();
  } else {
    showToast('End of queue');
  }
}

// ===== ASYNC LOG TO GOOGLE SHEET =====
async function logWhatsAppSentToSheet(rowNumber) {
  if (!API_URL) return;
  try {
    await api({
      action: 'whatsapp_sent',
      row: rowNumber,
      note: '[WhatsApp Broadcast Sent]'
    });
  } catch (err) {
    console.warn('Could not log WhatsApp sent to sheet:', err);
  }
}

// ===== RENDER: METRICS =====
function renderMetrics() {
  const total = STATE.filteredQueue.length;
  const sentCount = STATE.filteredQueue.filter(c => STATE.sentIds.has(c.id)).length;
  const pending = Math.max(0, total - sentCount);
  const percent = total > 0 ? Math.round((sentCount / total) * 100) : 0;

  $('kpiTotal').textContent = total;
  $('kpiSent').textContent = sentCount;
  $('kpiPending').textContent = pending;
  $('kpiSuccessRate').textContent = percent + '%';
}

// ===== RENDER: CONTACTS DIRECTORY TABLE =====
function renderContactsTable() {
  const container = $('contactsListContainer');
  const countElem = $('filteredCount');
  if (!container) return;

  let list = STATE.filteredQueue;
  if (STATE.searchQuery) {
    const q = STATE.searchQuery.toLowerCase();
    list = list.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && String(c.phone).includes(q)) ||
      (c.status && String(c.status).toLowerCase().includes(q))
    );
  }

  if (countElem) countElem.textContent = list.length;

  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:26px;color:var(--text-muted);font-size:0.8rem;">No matching contacts found</div>';
    return;
  }

  const currentContactId = STATE.filteredQueue[STATE.currentIndex]?.id;

  container.innerHTML = list.map((c, i) => {
    const isSent = STATE.sentIds.has(c.id);
    const isCurrent = c.id === currentContactId;
    const e164 = formatE164(c.phone);
    const msg = renderPersonalizedMessage(STATE.template, c);
    const waHref = `https://wa.me/${e164}?text=${encodeURIComponent(msg)}`;

    return `
      <div class="contact-row-item ${isCurrent ? 'current-queue' : ''}" data-id="${c.id}">
        <div class="row-meta">
          <div class="row-name">${escapeHtml(c.name)}</div>
          <div class="row-phone">${formatDisplayPhone(c.phone)} · Row ${c.row}</div>
        </div>
        <div class="row-actions">
          <span class="row-badge ${isSent ? 'sent' : 'pending'}">${isSent ? 'Sent ✓' : 'Pending'}</span>
          <a href="${waHref}" target="_blank" rel="noopener" class="btn-row-wa" onclick="markRowSent(${c.id}, ${c.row})">
            💬 Send
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function markRowSent(id, row) {
  STATE.sentIds.add(id);
  saveSentIds();
  logWhatsAppSentToSheet(row);
  setTimeout(() => {
    renderMetrics();
    renderCurrentQueueCard();
    renderContactsTable();
  }, 400);
}
window.markRowSent = markRowSent;

// ===== STORAGE HELPERS =====
function loadSentIds() {
  try {
    const raw = localStorage.getItem(STORAGE_SENT_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      STATE.sentIds = new Set(arr);
    }
  } catch (e) {
    console.error('Error loading sent IDs:', e);
  }
}

function saveSentIds() {
  try {
    localStorage.setItem(STORAGE_SENT_KEY, JSON.stringify(Array.from(STATE.sentIds)));
  } catch (e) {
    console.error('Error saving sent IDs:', e);
  }
}

// ===== VCARD (.VCF) EXPORT HELPER =====
function downloadVCard() {
  const list = STATE.filteredQueue;
  if (list.length === 0) {
    showToast('⚠️ No contacts in current queue to export');
    return;
  }

  showLoading('Generating WhatsApp vCard (.vcf)...');
  try {
    const vcfEntries = list.map(c => {
      const e164 = formatE164(c.phone);
      const name = c.name || 'Friend';
      const firstName = c.firstName || name.split(/\s+/)[0] || 'Friend';
      const surname = c.surname || '';

      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:Awakening - ${name}`,
        `N:${surname};${firstName};;;`,
        `TEL;TYPE=CELL:+${e164}`,
        'NOTE:Harvesters Birmingham Awakening 2026',
        'END:VCARD'
      ].join('\r\n');
    }).join('\r\n');

    const blob = new Blob([vcfEntries], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Harvesters_Awakening_WhatsApp_Contacts_${new Date().toISOString().slice(0, 10)}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`📇 Exported ${list.length} contacts as vCard!`);
  } catch (err) {
    console.error('vCard error:', err);
    showToast('⚠️ Export failed');
  } finally {
    hideLoading();
  }
}

// ===== COPY NUMBERS HELPER =====
function copyPhoneNumbers() {
  const list = STATE.filteredQueue;
  if (list.length === 0) {
    showToast('⚠️ No contacts to copy');
    return;
  }

  const numbers = list.map(c => '+' + formatE164(c.phone)).filter(Boolean);
  const text = numbers.join(', ');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`📋 Copied ${numbers.length} numbers to clipboard!`);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`📋 Copied ${numbers.length} numbers!`);
  }
}

// ===== PIN SECURITY AUTH =====
function setupPinAuth() {
  const pinGate = $('pinGate');
  const mainApp = $('mainApp');
  const pinInput = $('pinInput');
  const pinBtn = $('pinSubmitBtn');
  const lockBtn = $('lockBtn');

  function unlock() {
    pinGate.style.display = 'none';
    mainApp.style.display = 'flex';
    sessionStorage.setItem(STORAGE_PIN_KEY, 'authorized');
    loadContacts();
  }

  function lock() {
    sessionStorage.removeItem(STORAGE_PIN_KEY);
    pinGate.style.display = 'flex';
    mainApp.style.display = 'none';
    pinInput.value = '';
    pinInput.focus();
  }

  pinBtn.addEventListener('click', () => {
    if (pinInput.value.trim() === ADMIN_PIN) {
      unlock();
    } else {
      showToast('❌ Incorrect Passcode. Try again.');
      pinInput.value = '';
      pinInput.focus();
    }
  });

  pinInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') pinBtn.click();
  });

  if (lockBtn) lockBtn.addEventListener('click', lock);

  // Check existing session
  if (sessionStorage.getItem(STORAGE_PIN_KEY) === 'authorized') {
    unlock();
  }
}

// ===== LOAD CONTACTS =====
async function loadContacts() {
  showLoading('Loading contacts for WhatsApp broadcast...');
  try {
    let contacts = [];
    if (!API_URL) {
      // Demo contacts fallback
      contacts = [
        { id: 1817, row: 1817, name: 'Zainab Zubairu', firstName: 'Zainab', phone: '447512984120', status: null },
        { id: 1816, row: 1816, name: 'Victor Williams', firstName: 'Victor', phone: '447814529331', status: null },
        { id: 1815, row: 1815, name: 'Tolulope Vincent', firstName: 'Tolulope', phone: '447910248192', status: null },
        { id: 1814, row: 1814, name: 'Simisola Udoh', firstName: 'Simisola', phone: '447401928374', status: 'will-attend' },
        { id: 1813, row: 1813, name: 'Samuel Thompson', firstName: 'Samuel', phone: '447384910293', status: 'unsure' }
      ];
    } else {
      const data = await api({ action: 'contacts' });
      contacts = data.contacts || [];
    }

    STATE.rawContacts = contacts;
    rebuildQueue();
  } catch (err) {
    console.error('Failed to load contacts:', err);
    showToast('⚠️ Could not load contacts. Using offline cache.');
  } finally {
    hideLoading();
  }
}

// ===== EVENT LISTENERS =====
function setupEvents() {
  // Template Input
  const textarea = $('messageTemplate');
  const savedTemplate = localStorage.getItem(STORAGE_TEMPLATE_KEY);
  if (savedTemplate) STATE.template = savedTemplate;
  if (textarea) {
    textarea.value = STATE.template;
    textarea.addEventListener('input', onTemplateChange);
  }

  // Audience & Sort Selects
  const audSelect = $('audienceSelect');
  if (audSelect) {
    audSelect.addEventListener('change', () => {
      STATE.audience = audSelect.value;
      STATE.currentIndex = 0;
      rebuildQueue();
    });
  }

  const sortSelect = $('sortOrderSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      STATE.sortOrder = sortSelect.value;
      STATE.currentIndex = 0;
      rebuildQueue();
    });
  }

  // Reset Template
  const resetBtn = $('resetTemplateBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      STATE.template = DEFAULT_TEMPLATE;
      if (textarea) textarea.value = DEFAULT_TEMPLATE;
      localStorage.removeItem(STORAGE_TEMPLATE_KEY);
      onTemplateChange();
      showToast('Invite template reset to default');
    });
  }

  // Restart Queue
  const restartBtn = $('restartQueueBtn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      STATE.currentIndex = 0;
      renderCurrentQueueCard();
      renderContactsTable();
      updateLivePreview();
      showToast('Queue restarted from #1');
    });
  }

  // Table Search
  const searchInput = $('contactSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      STATE.searchQuery = searchInput.value.trim();
      renderContactsTable();
    });
  }

  // Tools: vCard & Copy
  const vcfBtn = $('downloadVcfBtn');
  if (vcfBtn) vcfBtn.addEventListener('click', downloadVCard);

  const copyBtn = $('copyNumbersBtn');
  if (copyBtn) copyBtn.addEventListener('click', copyPhoneNumbers);

  // Keyboard shortcut: Spacebar or Enter to dispatch
  window.addEventListener('keydown', e => {
    // Only dispatch if not typing in textarea or search input
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      dispatchCurrentContact();
    }
  });
}

// ===== INIT =====
function init() {
  loadSentIds();
  setupPinAuth();
  setupEvents();
}

document.addEventListener('DOMContentLoaded', init);
