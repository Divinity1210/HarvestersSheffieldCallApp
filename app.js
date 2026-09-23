// =====================================================
// HARVESTERS BIRMINGHAM – Awakening Call Campaign App
// Mobile-First Frontend Logic — Backed by Google Sheets API
// =====================================================

// ===== CONFIGURATION =====
const API_URL = 'https://script.google.com/macros/s/AKfycbxQhZHOa5OfG7WM4460paNpZ1j96F4yGuNB97RFwPKcjMvhgMps28WcEet5UOuCQ80szA/exec';

// ===== APP STATE =====
let APP = {
  contacts: [],            // Cached contacts (for search & lookup)
  currentCaller: null,
  currentContact: null,    // Currently claimed contact from API
  totalContacts: 0,
  calledCount: 0,
  selectedResponse: null,
  scriptExpanded: true,
  currentFilter: 'all',
  phoneRevealed: false,
  revealTimeout: null,
  lookupOpen: false,
  modalContact: null,
  modalSelectedResponse: null,
  _lastDashboardLog: null  // Cached for filter/search re-renders
};

// Storage key for caller persistence
const STORAGE_KEY_CALLER = 'harvesters_birmingham_awakening_caller';

// ===== UI HELPERS =====
function $(id) { return document.getElementById(id); }

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

function showToast(msg, duration) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration || 2500);
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

// ===== API CLIENT =====
async function api(params) {
  if (!API_URL) throw new Error('API not configured');
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

// ===== PHONE HELPERS & GDPR =====
function cleanDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function maskPhone(phone) {
  if (!phone) return '••••';
  const str = String(phone).trim();
  if (str.length <= 4) return '••••';
  return '•••• •••• ' + str.slice(-4);
}

function formatPhoneForDisplay(phone, revealed) {
  if (!revealed) return maskPhone(phone);

  const raw = String(phone || '').trim();
  const digits = cleanDigits(raw);

  // UK standard international: 447... (12 digits)
  if (digits.startsWith('447') && digits.length === 12) {
    return '+44 ' + digits.slice(2, 6) + ' ' + digits.slice(6);
  }
  // UK standard local: 07... (11 digits)
  if (digits.startsWith('07') && digits.length === 11) {
    return digits.slice(0, 5) + ' ' + digits.slice(5);
  }
  // UK mobile without leading 0: 7... (10 digits)
  if (digits.startsWith('7') && digits.length === 10) {
    return '0' + digits.slice(0, 4) + ' ' + digits.slice(4);
  }
  // Nigeria international: 234... (13 digits)
  if (digits.startsWith('234') && digits.length >= 12) {
    return '+234 ' + digits.slice(3, 6) + ' ' + digits.slice(6, 9) + ' ' + digits.slice(9);
  }

  // Fallback: simple spaced digits
  if (digits.length > 7) {
    return digits.slice(0, Math.ceil(digits.length / 2)) + ' ' + digits.slice(Math.ceil(digits.length / 2));
  }
  return raw;
}

function getTelHref(phone) {
  const digits = cleanDigits(phone);
  if (!digits) return '#';
  if (digits.startsWith('0')) {
    return 'tel:+44' + digits.slice(1);
  }
  if (!digits.startsWith('+')) {
    return 'tel:+' + digits;
  }
  return 'tel:' + digits;
}

function getWhatsAppHref(phone, contactName) {
  let digits = cleanDigits(phone);
  if (!digits) return '#';
  if (digits.startsWith('0')) {
    digits = '44' + digits.slice(1);
  }

  const firstName = (contactName || 'Friend').split(/\s+/)[0];
  const callerName = APP.currentCaller || 'A volunteer';

  const text =
    `Hi ${firstName}, this is ${callerName} from Harvesters Birmingham!\n\n` +
    `Here are the details for Awakening (Breakthrough & Spiritual Renewal):\n` +
    `📍 Park Regis, 160 Broad St, Birmingham B15 1DT\n` +
    `🗓️ Saturday 26th & Sunday 27th September\n` +
    `🕙 09:00am - 03:00pm\n` +
    `🚗 Free parking and on street parking available\n\n` +
    `We would really love to have you with us!`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// ===== CLIPBOARD COPY =====
function copyPhone(phone) {
  const raw = cleanDigits(phone);
  const textToCopy = raw.startsWith('0') ? raw : (raw.startsWith('44') ? '+' + raw : raw);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('📋 Phone copied: ' + textToCopy);
    }).catch(() => fallbackCopy(textToCopy));
  } else {
    fallbackCopy(textToCopy);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('📋 Phone copied: ' + text);
  } catch (e) {
    showToast('⚠️ Could not copy phone');
  }
  document.body.removeChild(ta);
}
window.copyPhone = copyPhone;

// ===== PHONE REVEAL TOGGLE =====
function toggleReveal(phone) {
  const display = $('phoneDisplay');
  const btn = $('revealBtn');
  if (!display || !btn) return;

  if (APP.phoneRevealed) {
    display.textContent = formatPhoneForDisplay(phone, false);
    display.classList.remove('revealed');
    btn.textContent = '👁️ Reveal';
    APP.phoneRevealed = false;
    clearTimeout(APP.revealTimeout);
  } else {
    display.textContent = formatPhoneForDisplay(phone, true);
    display.classList.add('revealed');
    btn.textContent = '🙈 Hide';
    APP.phoneRevealed = true;
    // Auto-hide after 30 seconds for GDPR data protection
    APP.revealTimeout = setTimeout(() => {
      if (display) {
        display.textContent = formatPhoneForDisplay(phone, false);
        display.classList.remove('revealed');
      }
      if (btn) btn.textContent = '👁️ Reveal';
      APP.phoneRevealed = false;
    }, 30000);
  }
}
window.toggleReveal = toggleReveal;

// ===== SCRIPT BRANCH SELECTION =====
function selectScriptBranch(branch) {
  // Update branch tab buttons
  document.querySelectorAll('.m-branch-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.branch === branch);
  });
  // Update branch text display
  document.querySelectorAll('.m-branch-content').forEach(c => {
    c.classList.toggle('active-branch', c.dataset.branch === branch);
  });

  // Pre-select corresponding response button
  const targetBtn = document.querySelector(`.response-btn[data-response="${branch}"]`);
  if (targetBtn) {
    document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
    targetBtn.classList.add('selected');
    APP.selectedResponse = branch;

    const submitBtn = $('submitBtn');
    if (submitBtn) submitBtn.disabled = false;

    // Show prayer section for will-attend
    const prayerSection = $('prayerSection');
    if (prayerSection) {
      if (branch === 'will-attend') {
        prayerSection.classList.add('visible');
      } else {
        prayerSection.classList.remove('visible');
      }
    }
  }
}
window.selectScriptBranch = selectScriptBranch;

// ===== QUICK NOTE CHIPS =====
function addQuickTag(tag) {
  const notesInput = $('notesInput');
  if (!notesInput) return;

  if (tag.includes('Prayer')) {
    const prayerSection = $('prayerSection');
    if (prayerSection) prayerSection.classList.add('visible');
    const prayerInput = $('prayerRequestInput');
    if (prayerInput) prayerInput.focus();
  }

  const current = notesInput.value.trim();
  if (!current) {
    notesInput.value = tag;
  } else if (!current.includes(tag)) {
    notesInput.value = current + ' | ' + tag;
  }
  showToast('Added note: ' + tag, 1200);
}
window.addQuickTag = addQuickTag;

// ===== SCREEN NAVIGATION =====
function showView(viewId) {
  const loginView = $('loginView');
  const mainView = $('mainView');
  const bottomNav = $('bottomNav');

  if (viewId === 'loginView') {
    if (loginView) loginView.classList.add('active');
    if (mainView) mainView.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    return;
  }

  if (viewId === 'mainView' || viewId === 'callView' || viewId === 'dashboardView') {
    if (loginView) loginView.classList.remove('active');
    if (mainView) mainView.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'flex';

    const targetSubView = (viewId === 'mainView') ? 'callView' : viewId;

    const cv = $('callView');
    const dv = $('dashboardView');
    if (cv) cv.classList.toggle('active', targetSubView === 'callView');
    if (dv) dv.classList.toggle('active', targetSubView === 'dashboardView');

    // Update active nav button
    document.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === targetSubView);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetSubView === 'dashboardView') {
      renderDashboard();
    }
  }
}

// ===== FLYER MODAL =====
function openFlyerModal() {
  const modal = $('flyerModal');
  if (modal) modal.classList.add('active');
}

function closeFlyerModal() {
  const modal = $('flyerModal');
  if (modal) modal.classList.remove('active');
}

// ===== RENDER: CALLER BAR =====
function renderCallerBar() {
  const topAvatar = $('topAvatarBtn');
  if (topAvatar) topAvatar.textContent = getInitials(APP.currentCaller);

  const callerDisplay = $('callerDisplayName');
  if (callerDisplay) callerDisplay.textContent = APP.currentCaller || 'Volunteer';

  const scriptCaller = $('scriptCallerName');
  if (scriptCaller) scriptCaller.textContent = APP.currentCaller || 'A Volunteer';
}

// ===== RENDER: PROGRESS BAR =====
function renderProgress() {
  const total = APP.totalContacts || APP.contacts.length || 0;
  const called = APP.calledCount || 0;
  const callerCalls = APP.contacts.filter(c =>
    c.calledBy && c.calledBy.toLowerCase() === (APP.currentCaller || '').toLowerCase() && c.status
  ).length;

  const progressText = $('progressText');
  if (progressText) {
    progressText.textContent = `${callerCalls} by you · ${called}/${total} total`;
  }

  const progressFill = $('progressFill');
  if (progressFill) {
    progressFill.style.width = (total > 0 ? Math.min(100, (called / total) * 100) : 0) + '%';
  }

  const pendingBadge = $('pendingBadge');
  if (pendingBadge) {
    pendingBadge.textContent = Math.max(0, total - called);
  }
}

// ===== RENDER: CONTACT CARD =====
function renderContactCard() {
  const area = $('contactArea');
  const responseArea = $('responseArea');
  APP.phoneRevealed = false;
  APP.selectedResponse = null;

  // Reset response buttons
  document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
  const submitBtn = $('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  const notesInput = $('notesInput');
  if (notesInput) notesInput.value = '';

  // Reset prayer section
  const prayerSection = $('prayerSection');
  if (prayerSection) {
    prayerSection.classList.remove('visible');
    const prayerInput = $('prayerRequestInput');
    if (prayerInput) prayerInput.value = '';
  }

  if (!APP.currentContact) {
    area.innerHTML = `
      <div class="m-contact-card" style="text-align:center;padding:36px 20px;">
        <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
        <h3 style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:6px;">All Awakening Calls Completed!</h3>
        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;">Every contact in the database has been reached. Check the Stats tab for campaign results.</p>
      </div>
    `;
    if (responseArea) responseArea.style.display = 'none';
    return;
  }

  const contact = APP.currentContact;
  const total = APP.totalContacts || APP.contacts.length || 1816;
  const called = APP.calledCount || 0;

  const fullName = contact.name || 'Friend';
  const firstName = contact.firstName || fullName.split(/\s+/)[0] || 'Friend';
  const initials = getInitials(fullName);

  const telHref = getTelHref(contact.phone);
  const waHref = getWhatsAppHref(contact.phone, fullName);

  area.innerHTML = `
    <div class="m-contact-card">
      <div class="m-contact-header">
        <div class="m-contact-avatar">${initials}</div>
        <div class="m-contact-identity">
          <div class="m-contact-num-badge">Contact #${called + 1} of ${total} ${contact.contactId ? '· ' + escapeHtml(contact.contactId) : ''}</div>
          <div class="m-contact-name" title="${escapeHtml(fullName)}">${escapeHtml(fullName)}</div>
        </div>
      </div>

      <div class="m-phone-row">
        <span class="m-phone-val" id="phoneDisplay">${formatPhoneForDisplay(contact.phone, false)}</span>
        <div class="m-phone-actions">
          <button class="m-icon-btn" id="revealBtn" onclick="toggleReveal('${escapeHtml(contact.phone)}')">
            👁️ Reveal
          </button>
        </div>
      </div>

      <div class="m-action-hub">
        <a href="${telHref}" class="m-hero-call-btn" id="heroCallBtn">
          📞 Call Now
        </a>
        <div class="m-secondary-action-row">
          <a href="${waHref}" target="_blank" rel="noopener" class="m-whatsapp-btn" id="waBtn">
            💬 WhatsApp Details
          </a>
          <button class="m-copy-btn" onclick="copyPhone('${escapeHtml(contact.phone)}')">
            📋 Copy Number
          </button>
        </div>
      </div>
    </div>
  `;

  // Personalize script with contact name
  const scriptGreeting = $('scriptContactName');
  if (scriptGreeting) scriptGreeting.textContent = fullName;
  const scriptFirstName = $('scriptContactFirstName');
  if (scriptFirstName) scriptFirstName.textContent = firstName;

  if (responseArea) responseArea.style.display = 'block';
}

// ===== STATUS NORMALIZATION =====
function normalizeStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'will attend' || s === 'will-attend' || s === 'yes') return 'will-attend';
  if (s === 'unsure' || s === 'tbc') return 'unsure';
  if (s === 'not attend' || s === 'not-attend' || s === 'no') return 'not-attend';
  if (s === 'no answer' || s === 'no-answer' || s === 'not picking' || s === 'voice mail' || s === 'didnt ring') return 'no-answer';
  return s || 'pending';
}

function getStatusBadgeHtml(status) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'will-attend':
      return '<span class="log-response-badge badge-yes">✅ Will Attend</span>';
    case 'unsure':
      return '<span class="log-response-badge badge-unsure">⏳ Unsure</span>';
    case 'not-attend':
      return '<span class="log-response-badge badge-no">❌ Not Attend</span>';
    case 'no-answer':
      return '<span class="log-response-badge badge-no-answer">📵 No Answer</span>';
    default:
      return '<span class="log-response-badge" style="background:rgba(255,255,255,0.08);color:var(--text-muted)">⏳ Pending</span>';
  }
}

// ===== DASHBOARD RENDERING =====
async function renderDashboard() {
  // If we already have cached dashboard data, render it immediately in 0ms!
  if (APP._cachedDashboard) {
    renderStats(APP._cachedDashboard.stats || {});
    renderDonut(APP._cachedDashboard.stats || {});
    renderLeaderboard(APP._cachedDashboard.callers || {});
    renderCallLog(APP._cachedDashboard.log || []);
  }

  if (!API_URL) {
    if (!APP._cachedDashboard) {
      // Local demo / preview fallback
      const stats = {
        total: APP.totalContacts || 1816,
        called: APP.calledCount || 142,
        pending: Math.max(0, (APP.totalContacts || 1816) - (APP.calledCount || 142)),
        willAttend: 58,
        unsure: 34,
        notAttend: 26,
        noAnswer: 24
      };
      const callers = {
        'Volunteer Demo': { total: 42, willAttend: 22, unsure: 10, notAttend: 6, noAnswer: 4 },
        'Sister Mary': { total: 38, willAttend: 18, unsure: 8, notAttend: 8, noAnswer: 4 },
        'Brother John': { total: 34, willAttend: 12, unsure: 10, notAttend: 8, noAnswer: 4 },
        'Deacon David': { total: 28, willAttend: 6, unsure: 6, notAttend: 4, noAnswer: 12 }
      };
      renderStats(stats);
      renderDonut(stats);
      renderLeaderboard(callers);
      renderCallLog(APP._lastDashboardLog || []);
    }
    return;
  }

  // Only show a loading spinner on the first load if no cache exists
  if (!APP._cachedDashboard) {
    showLoading('Loading Awakening stats...');
  }

  try {
    const data = await api({ action: 'dashboard' });
    APP._cachedDashboard = data;
    APP._lastDashboardLog = data.log || [];
    renderStats(data.stats || {});
    renderDonut(data.stats || {});
    renderLeaderboard(data.callers || {});
    renderCallLog(data.log || []);
  } catch (e) {
    console.error('Dashboard error:', e);
    if (!APP._cachedDashboard) showToast('⚠️ Failed to load dashboard');
  } finally {
    hideLoading();
  }
}

function renderStats(stats) {
  const total = stats.total || 0;
  const called = stats.called || 0;
  const pending = stats.pending !== undefined ? stats.pending : Math.max(0, total - called);
  const willAttend = stats.willAttend !== undefined ? stats.willAttend : (stats.yes || 0);
  const unsure = stats.unsure !== undefined ? stats.unsure : (stats.tbc || 0);
  const notAttend = stats.notAttend !== undefined ? stats.notAttend : (stats.no || 0);
  const noAnswer = stats.noAnswer !== undefined ? stats.noAnswer : (stats.na || 0);

  const grid = $('statsGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="m-kpi-card"><div class="m-kpi-num white">${total}</div><div class="m-kpi-label">Total Contacts</div></div>
    <div class="m-kpi-card"><div class="m-kpi-num gold">${called}</div><div class="m-kpi-label">Total Called</div></div>
    <div class="m-kpi-card"><div class="m-kpi-num purple">${pending}</div><div class="m-kpi-label">Pending</div></div>
    <div class="m-kpi-card"><div class="m-kpi-num green">${willAttend}</div><div class="m-kpi-label">Will Attend</div></div>
    <div class="m-kpi-card"><div class="m-kpi-num orange">${unsure}</div><div class="m-kpi-label">Unsure</div></div>
    <div class="m-kpi-card"><div class="m-kpi-num red">${notAttend}</div><div class="m-kpi-label">Not Attend</div></div>
  `;
}

function renderDonut(stats) {
  const willAttend = stats.willAttend !== undefined ? stats.willAttend : (stats.yes || 0);
  const unsure = stats.unsure !== undefined ? stats.unsure : (stats.tbc || 0);
  const notAttend = stats.notAttend !== undefined ? stats.notAttend : (stats.no || 0);
  const noAnswer = stats.noAnswer !== undefined ? stats.noAnswer : (stats.na || 0);
  const total = willAttend + notAttend + unsure + noAnswer;

  const totalElem = $('totalCalled');
  if (totalElem) totalElem.textContent = total;

  const wrap = $('donutSvgWrap');
  if (wrap) {
    const r = 54;
    const c = 2 * Math.PI * r; // ~339.292
    const strokeWidth = 16;

    if (total === 0) {
      wrap.innerHTML = `
        <svg class="m-donut-svg" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="${strokeWidth}" />
        </svg>
      `;
    } else {
      const segments = [
        { value: willAttend, color: '#10b981' },
        { value: unsure, color: '#f59e0b' },
        { value: notAttend, color: '#ef4444' },
        { value: noAnswer, color: '#6366f1' }
      ];

      let currentOffset = 0;
      let circlesHtml = `
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="${strokeWidth}" />
      `;

      segments.forEach(seg => {
        if (seg.value <= 0) return;
        const dashLength = (seg.value / total) * c;
        const gapLength = c - dashLength;
        circlesHtml += `
          <circle
            cx="70" cy="70" r="${r}"
            fill="none"
            stroke="${seg.color}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${dashLength.toFixed(2)} ${gapLength.toFixed(2)}"
            stroke-dashoffset="${(-currentOffset).toFixed(2)}"
            stroke-linecap="round"
          />
        `;
        currentOffset += dashLength;
      });

      wrap.innerHTML = `<svg class="m-donut-svg" viewBox="0 0 140 140">${circlesHtml}</svg>`;
    }
  }

  const legend = $('chartLegend');
  if (legend) {
    legend.innerHTML = `
      <div class="m-legend-item"><span class="m-dot" style="background:#10b981"></span><span class="m-legend-label">Will Attend</span><span class="m-val">${willAttend}</span></div>
      <div class="m-legend-item"><span class="m-dot" style="background:#f59e0b"></span><span class="m-legend-label">Unsure</span><span class="m-val">${unsure}</span></div>
      <div class="m-legend-item"><span class="m-dot" style="background:#ef4444"></span><span class="m-legend-label">Not Attend</span><span class="m-val">${notAttend}</span></div>
      <div class="m-legend-item"><span class="m-dot" style="background:#6366f1"></span><span class="m-legend-label">No Answer</span><span class="m-val">${noAnswer}</span></div>
    `;
  }
}

function renderLeaderboard(callers) {
  const board = $('leaderboard');
  if (!board) return;

  const sorted = Object.entries(callers || {}).sort((a, b) => b[1].total - a[1].total);

  if (sorted.length === 0) {
    board.innerHTML = '<div class="leaderboard-item" style="justify-content:center;color:var(--text-muted);font-size:0.85rem;padding:26px;">No calls recorded yet for Awakening</div>';
    return;
  }

  board.innerHTML = sorted.map((entry, i) => {
    const name = entry[0], data = entry[1];
    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
    const attendingCount = data.willAttend || data.yes || 0;
    return `
      <div class="leaderboard-item">
        <span class="lb-rank ${i < 3 ? 'top' : ''}">${rank}</span>
        <div class="lb-avatar">${getInitials(name)}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(name)}</div>
          <div class="lb-meta">
            <span>✅ ${attendingCount} attending</span>
          </div>
        </div>
        <div class="lb-calls">${data.total}</div>
      </div>
    `;
  }).join('');
}

function renderCallLog(log) {
  const container = $('logList');
  if (!container) return;

  if (!log || log.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:36px;color:var(--text-muted);font-size:0.85rem">No calls logged yet</div>';
    return;
  }

  let filtered = log;
  if (APP.currentFilter && APP.currentFilter !== 'all') {
    filtered = filtered.filter(item => normalizeStatus(item.status) === APP.currentFilter);
  }

  const searchTerm = ($('logSearch') ? $('logSearch').value.trim().toLowerCase() : '');
  if (searchTerm) {
    filtered = filtered.filter(item =>
      (item.name && item.name.toLowerCase().includes(searchTerm)) ||
      (item.calledBy && item.calledBy.toLowerCase().includes(searchTerm)) ||
      (item.phone && String(item.phone).includes(searchTerm))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:36px;color:var(--text-muted);font-size:0.85rem">No matching calls found</div>';
    return;
  }

  container.innerHTML = filtered.map(item => {
    const norm = normalizeStatus(item.status);
    const timeStr = item.calledAt ? new Date(item.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div class="log-item">
        <div class="log-status-dot ${norm}"></div>
        <div class="log-details">
          <div class="log-contact-name">${escapeHtml(item.name)}</div>
          <div class="log-phone-masked">${maskPhone(item.phone)}</div>
          ${item.notes ? '<div class="log-notes-text">' + escapeHtml(item.notes) + '</div>' : ''}
        </div>
        <div class="log-right">
          ${getStatusBadgeHtml(item.status)}
          <div class="log-caller-name">by ${escapeHtml(item.calledBy || 'Caller')}</div>
          ${timeStr ? '<div class="log-time">' + timeStr + '</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== BOTTOM SHEET SEARCH LOOKUP =====
function openLookupSheet() {
  const sheet = $('lookupSheet');
  const input = $('lookupInput');
  if (sheet) sheet.classList.add('active');
  if (input) {
    input.focus();
    if (APP.contacts.length === 0) loadContactsCache();
  }
}

function closeLookupSheet() {
  const sheet = $('lookupSheet');
  if (sheet) sheet.classList.remove('active');
}

function setupLookup() {
  const sheet = $('lookupSheet');
  const closeBtn = $('lookupSheetClose');
  const input = $('lookupInput');
  const results = $('lookupResults');

  if (closeBtn) closeBtn.addEventListener('click', closeLookupSheet);

  if (sheet) {
    sheet.addEventListener('click', e => {
      if (e.target === sheet) closeLookupSheet();
    });
  }

  if (input && results) {
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        results.innerHTML = `
          <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">
            Search across 1,816 contacts by name or last 4 digits
          </div>
        `;
        return;
      }

      const matches = APP.contacts.filter(c => {
        const nameMatch = c.name && c.name.toLowerCase().includes(query);
        const phoneMatch = c.phone && String(c.phone).includes(query);
        const idMatch = c.contactId && c.contactId.toLowerCase().includes(query);
        return nameMatch || phoneMatch || idMatch;
      }).slice(0, 20);

      if (matches.length === 0) {
        results.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.8rem">No contacts matching "${escapeHtml(query)}"</div>`;
        return;
      }

      results.innerHTML = matches.map(c => {
        const norm = normalizeStatus(c.status);
        const badgeClass = norm === 'will-attend' ? 'badge-yes' :
                           norm === 'not-attend' ? 'badge-no' :
                           norm === 'unsure' ? 'badge-unsure' :
                           norm === 'no-answer' ? 'badge-no-answer' : 'pending';
        const badgeText = norm === 'will-attend' ? 'Will Attend' :
                          norm === 'not-attend' ? 'Not Attend' :
                          norm === 'unsure' ? 'Unsure' :
                          norm === 'no-answer' ? 'No Answer' : 'Pending';

        return `
          <div class="lookup-item" data-contact-id="${c.id}">
            <div class="li-info">
              <div class="li-name">${escapeHtml(c.name)}</div>
              <div class="li-phone">${maskPhone(c.phone)}${c.calledBy ? ' · called by ' + escapeHtml(c.calledBy) : ''}</div>
            </div>
            <div class="li-status">
              <span class="li-badge ${badgeClass}">${badgeText}</span>
            </div>
          </div>
        `;
      }).join('');

      results.querySelectorAll('.lookup-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = parseInt(el.dataset.contactId, 10);
          const contact = APP.contacts.find(c => c.id === id);
          if (contact) {
            closeLookupSheet();
            openLookupModal(contact);
          }
        });
      });
    });
  }
}

function openLookupModal(contact) {
  APP.modalContact = contact;
  APP.modalSelectedResponse = null;

  $('modalContactName').textContent = contact.name;
  $('modalContactPhone').textContent = formatPhoneForDisplay(contact.phone, true);

  const norm = normalizeStatus(contact.status);
  const statusText = norm === 'will-attend' ? '✅ Will Attend' :
                     norm === 'not-attend' ? '❌ Not Attend' :
                     norm === 'unsure' ? '⏳ Unsure' :
                     norm === 'no-answer' ? '📵 No Answer' : '⏳ Pending / Not Called';
  const statusMeta = contact.calledBy ? ' (by ' + contact.calledBy + ')' : '';

  $('modalCurrentStatus').innerHTML = `
    <div><strong>${statusText}</strong> ${escapeHtml(statusMeta)}</div>
    ${contact.notes ? '<div style="margin-top:4px;color:var(--text-secondary);font-size:0.78rem;">Notes: ' + escapeHtml(contact.notes) + '</div>' : ''}
  `;

  document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(b => {
    b.classList.remove('selected');
    if (b.dataset.modalResponse === norm) {
      b.classList.add('selected');
      APP.modalSelectedResponse = b.dataset.modalResponse;
    }
  });

  $('modalNotesInput').value = contact.notes || '';
  $('lookupModalOverlay').classList.add('active');
}

function closeLookupModal() {
  const overlay = $('lookupModalOverlay');
  if (overlay) overlay.classList.remove('active');
  APP.modalContact = null;
  APP.modalSelectedResponse = null;
}

// ===== CONTACTS CACHE =====
async function loadContactsCache() {
  try {
    const data = await api({ action: 'contacts' });
    APP.contacts = data.contacts || [];
    APP.totalContacts = APP.contacts.length;
    APP.calledCount = APP.contacts.filter(c => c.status).length;
    renderProgress();
  } catch (e) {
    console.error('Failed to load contacts cache:', e);
  }
}

// ===== CSV EXPORT =====
async function exportCSV() {
  showLoading('Preparing Awakening CSV export...');
  try {
    const data = await api({ action: 'contacts' });
    const contacts = data.contacts || [];

    const headers = ['ID', 'Contact ID', 'Name', 'Phone', 'Awakening Attendance', 'Awakening Caller', 'Awakening Feedback / Prayer Notes', 'CalledAt'];
    const rows = contacts.map(c => [
      c.id,
      c.contactId || '',
      '"' + (c.name || '').replace(/"/g, '""') + '"',
      c.phone || '',
      c.status || '',
      '"' + (c.calledBy || '').replace(/"/g, '""') + '"',
      '"' + (c.notes || '').replace(/"/g, '""') + '"',
      c.calledAt || ''
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(',')].concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = 'Harvesters_Birmingham_Awakening_Calls_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Awakening CSV exported successfully!');
  } catch (e) {
    console.error('Export error:', e);
    showToast('⚠️ Export failed. Please try again.');
  } finally {
    hideLoading();
  }
}

// ===== EVENT HANDLERS =====
function setupEvents() {
  // ──── TOP BAR & BRAND ────
  const topFlyerBtn = $('topFlyerBtn');
  if (topFlyerBtn) topFlyerBtn.addEventListener('click', openFlyerModal);

  const brandHeaderTrigger = $('brandHeaderTrigger');
  if (brandHeaderTrigger) brandHeaderTrigger.addEventListener('click', openFlyerModal);

  const loginFlyerTrigger = $('loginFlyerTrigger');
  if (loginFlyerTrigger) loginFlyerTrigger.addEventListener('click', openFlyerModal);

  const flyerCloseBtn = $('flyerCloseBtn');
  if (flyerCloseBtn) flyerCloseBtn.addEventListener('click', closeFlyerModal);

  const flyerModal = $('flyerModal');
  if (flyerModal) {
    flyerModal.addEventListener('click', e => {
      if (e.target === flyerModal) closeFlyerModal();
    });
  }

  // ──── BOTTOM NAVIGATION TABS ────
  const navCallBtn = $('navCallBtn');
  if (navCallBtn) navCallBtn.addEventListener('click', () => showView('callView'));

  const navSearchBtn = $('navSearchBtn');
  if (navSearchBtn) navSearchBtn.addEventListener('click', openLookupSheet);

  const navDashBtn = $('navDashBtn');
  if (navDashBtn) navDashBtn.addEventListener('click', () => showView('dashboardView'));

  const navFlyerBtn = $('navFlyerBtn');
  if (navFlyerBtn) navFlyerBtn.addEventListener('click', openFlyerModal);

  // ──── LOGIN ────
  const loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('callerNameInput').value.trim();
      if (!name) return;

      APP.currentCaller = name;
      localStorage.setItem(STORAGE_KEY_CALLER, name);

      showLoading('Claiming your first contact for Awakening...');
      try {
        const result = await api({ action: 'next', caller: name });
        APP.currentContact = result.contact;
        if (result.stats) {
          APP.totalContacts = result.stats.total;
          APP.calledCount = result.stats.called;
        }

        loadContactsCache();

        showView('mainView');
        renderCallerBar();
        renderContactCard();
        renderProgress();
      } catch (err) {
        showToast('⚠️ Failed to connect. Check API URL.');
        console.error('Login error:', err);
      } finally {
        hideLoading();
      }
    });
  }

  // ──── LOGOUT ────
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      APP.currentCaller = null;
      APP.currentContact = null;
      localStorage.removeItem(STORAGE_KEY_CALLER);
      showView('loginView');
      const nameInput = $('callerNameInput');
      if (nameInput) nameInput.value = '';
    });
  }

  // ──── SCRIPT COLLAPSE TOGGLE ────
  const scriptToggle = $('scriptToggle');
  if (scriptToggle) {
    scriptToggle.addEventListener('click', () => {
      const body = $('scriptBody');
      const chevron = $('scriptChevron');
      APP.scriptExpanded = !APP.scriptExpanded;
      if (body) {
        body.classList.toggle('expanded', APP.scriptExpanded);
        body.classList.toggle('collapsed', !APP.scriptExpanded);
      }
      if (chevron) chevron.classList.toggle('open', APP.scriptExpanded);
    });
  }

  // ──── RESPONSE BUTTONS ────
  document.querySelectorAll('.response-btn[data-response]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      APP.selectedResponse = btn.dataset.response;

      const submitBtn = $('submitBtn');
      if (submitBtn) submitBtn.disabled = false;

      // Sync branch script tab if applicable
      const branchBtn = document.querySelector(`.m-branch-btn[data-branch="${APP.selectedResponse}"]`);
      if (branchBtn) {
        document.querySelectorAll('.m-branch-btn').forEach(b => b.classList.remove('active'));
        branchBtn.classList.add('active');
        document.querySelectorAll('.m-branch-content').forEach(c => {
          c.classList.toggle('active-branch', c.dataset.branch === APP.selectedResponse);
        });
      }

      // Show prayer section for will-attend
      const prayerSection = $('prayerSection');
      if (prayerSection) {
        if (APP.selectedResponse === 'will-attend') {
          prayerSection.classList.add('visible');
        } else {
          prayerSection.classList.remove('visible');
        }
      }
    });
  });

// ===== FIND NEXT UNCALLED CONTACT (Optimistic Finder - Bottom Up) =====
function findNextUncalledContact(excludeId) {
  if (!APP.contacts || APP.contacts.length === 0) return null;
  // Prioritize from the bottom of the sheet upwards (highest row / newest first)
  for (let i = APP.contacts.length - 1; i >= 0; i--) {
    const c = APP.contacts[i];
    if (c.id !== excludeId && !c.status) {
      return c;
    }
  }
  return null;
}

  // ──── SUBMIT & NEXT ────
  const submitBtn = $('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (!APP.selectedResponse || !APP.currentContact) return;

      const contact = APP.currentContact;
      const response = APP.selectedResponse;
      let notes = $('notesInput') ? $('notesInput').value.trim() : '';

      // Append prayer request if provided
      const prayerInput = $('prayerRequestInput');
      if (prayerInput && prayerInput.value.trim()) {
        const prayerText = 'PRAYER: ' + prayerInput.value.trim();
        notes = notes ? (prayerText + ' | ' + notes) : prayerText;
      }

      // 1. OPTIMISTIC INSTANT UPDATE (0ms latency - NO freezing spinner!)
      const idx = APP.contacts.findIndex(c => c.id === contact.id);
      if (idx >= 0) {
        APP.contacts[idx].status = response;
        APP.contacts[idx].calledBy = APP.currentCaller;
        APP.contacts[idx].notes = notes;
        APP.contacts[idx].calledAt = new Date().toISOString();
      }
      APP.calledCount = (APP.calledCount || 0) + 1;

      // Find next uncalled contact from bottom upwards immediately
      const nextContact = findNextUncalledContact(contact.id);
      APP.currentContact = nextContact;
      APP.selectedResponse = null;

      const emojis = { 'will-attend': '✅', 'unsure': '⏳', 'not-attend': '❌', 'no-answer': '📵' };
      showToast((emojis[response] || '✓') + ' Saved response for ' + contact.name, 1600);

      // Render next contact card immediately without ANY waiting!
      renderContactCard();
      renderProgress();

      // 2. Background async save to Google Sheets (non-blocking)
      if (API_URL) {
        api({
          action: 'submit_next',
          row: contact.row,
          status: response,
          caller: APP.currentCaller,
          notes: notes,
          timestamp: new Date().toISOString()
        }).then(result => {
          if (result && result.stats) {
            APP.totalContacts = result.stats.total;
            APP.calledCount = result.stats.called;
            renderProgress();
          }
        }).catch(err => {
          console.warn('Background save sync warning:', err);
        });
      }
    });
  }

  // ──── SKIP ────
  const skipBtn = $('skipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (!APP.currentContact) return;

      const contact = APP.currentContact;

      // 1. OPTIMISTIC INSTANT ADVANCE (0ms latency!)
      const idx = APP.contacts.findIndex(c => c.id === contact.id);
      if (idx >= 0) {
        APP.contacts[idx].status = 'no-answer';
        APP.contacts[idx].calledBy = APP.currentCaller;
        APP.contacts[idx].notes = 'Skipped - will retry later';
        APP.contacts[idx].calledAt = new Date().toISOString();
      }

      const nextContact = findNextUncalledContact(contact.id);
      APP.currentContact = nextContact;

      showToast('⏭️ Contact skipped for later', 1400);
      renderContactCard();
      renderProgress();

      // 2. Background async skip to Google Sheets
      if (API_URL) {
        api({
          action: 'submit_next',
          row: contact.row,
          status: 'no-answer',
          caller: APP.currentCaller,
          notes: 'Skipped - will retry later',
          timestamp: new Date().toISOString()
        }).then(result => {
          if (result && result.stats) {
            APP.totalContacts = result.stats.total;
            APP.calledCount = result.stats.called;
            renderProgress();
          }
        }).catch(err => {
          console.warn('Background skip sync warning:', err);
        });
      }
    });
  }

  // ──── LOOKUP MODAL BUTTONS ────
  const modalClose = $('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeLookupModal);

  const modalCancelBtn = $('modalCancelBtn');
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeLookupModal);

  document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      APP.modalSelectedResponse = btn.dataset.modalResponse;
    });
  });

  const modalSubmitBtn = $('modalSubmitBtn');
  if (modalSubmitBtn) {
    modalSubmitBtn.addEventListener('click', async () => {
      if (!APP.modalContact || !APP.modalSelectedResponse) return;

      const contact = APP.modalContact;
      const response = APP.modalSelectedResponse;
      const notes = $('modalNotesInput') ? $('modalNotesInput').value.trim() : '';

      // Offline / Demo Mode Local Handling
      if (!API_URL) {
        contact.status = response;
        contact.calledBy = APP.currentCaller || 'Volunteer Demo';
        contact.notes = notes;
        contact.calledAt = new Date().toISOString();
        const idx = APP.contacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) APP.contacts[idx] = contact;
        closeLookupModal();
        showToast('✓ Updated response for ' + contact.name);
        return;
      }

      showLoading('Updating contact response...');
      try {
        await api({
          action: 'submit',
          row: contact.row,
          status: response,
          caller: APP.currentCaller,
          notes: notes,
          timestamp: new Date().toISOString()
        });

        contact.status = response;
        contact.calledBy = APP.currentCaller;
        contact.notes = notes;
        contact.calledAt = new Date().toISOString();

        const idx = APP.contacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) APP.contacts[idx] = contact;

        closeLookupModal();
        showToast('✓ Updated response for ' + contact.name);

        const input = $('lookupInput');
        if (input && input.value.trim().length >= 2) {
          input.dispatchEvent(new Event('input'));
        }
      } catch (err) {
        showToast('⚠️ Failed to update. Please try again.');
        console.error('Modal submit error:', err);
      } finally {
        hideLoading();
      }
    });
  }

  // ──── DASHBOARD FILTERS & SEARCH ────
  document.querySelectorAll('#logFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#logFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      APP.currentFilter = chip.dataset.filter;
      if (APP._lastDashboardLog) renderCallLog(APP._lastDashboardLog);
    });
  });

  const logSearch = $('logSearch');
  if (logSearch) {
    logSearch.addEventListener('input', () => {
      if (APP._lastDashboardLog) renderCallLog(APP._lastDashboardLog);
    });
  }

  // ──── EXPORT BUTTON ────
  const exportBtn = $('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  setupLookup();
}

// ===== INITIALIZATION =====
async function init() {
  setupEvents();

  // Check for returning caller
  const caller = localStorage.getItem(STORAGE_KEY_CALLER);
  if (caller) {
    APP.currentCaller = caller;
    showLoading('Welcome back! Loading Awakening calls...');
    try {
      const result = await api({ action: 'next', caller: caller });
      APP.currentContact = result.contact;
      if (result.stats) {
        APP.totalContacts = result.stats.total;
        APP.calledCount = result.stats.called;
      }

      loadContactsCache();

      showView('mainView');
      renderCallerBar();
      renderContactCard();
      renderProgress();
    } catch (err) {
      console.error('Auto-login error:', err);
      APP.currentCaller = null;
      localStorage.removeItem(STORAGE_KEY_CALLER);
      showView('loginView');
    } finally {
      hideLoading();
    }
  }
}

// ===== DEMO / PREVIEW MODE =====
function enableDemoMode() {
  APP.currentCaller = 'Volunteer Demo';
  APP.totalContacts = 1816;
  APP.calledCount = 142;

  // Demo contacts starting from bottom of sheet (1816 upwards)
  APP.contacts = [
    { id: 1817, row: 1817, contactId: 'HB - 1816', name: 'Zainab Zubairu', firstName: 'Zainab', phone: '447512984120', status: null, calledBy: null },
    { id: 1816, row: 1816, contactId: 'HB - 1815', name: 'Victor Williams', firstName: 'Victor', phone: '447814529331', status: null, calledBy: null },
    { id: 1815, row: 1815, contactId: 'HB - 1814', name: 'Tolulope Vincent', firstName: 'Tolulope', phone: '447910248192', status: null, calledBy: null },
    { id: 1814, row: 1814, contactId: 'HB - 1813', name: 'Simisola Udoh', firstName: 'Simisola', phone: '447401928374', status: 'will-attend', calledBy: 'Volunteer Demo' },
    { id: 1813, row: 1813, contactId: 'HB - 1812', name: 'Samuel Thompson', firstName: 'Samuel', phone: '447384910293', status: 'unsure', calledBy: 'Sister Mary' }
  ];

  APP.currentContact = APP.contacts[0];

  APP._lastDashboardLog = [
    { id: 4, name: 'Rianat Abbas', phone: '447803507267', status: 'will-attend', calledBy: 'Volunteer Demo', notes: 'Attending both days with 2 friends', calledAt: new Date().toISOString() },
    { id: 5, name: 'Obomate Abbey', phone: '447407649117', status: 'unsure', calledBy: 'Sister Mary', notes: 'Checking work rota, call back Friday', calledAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 6, name: 'Yusra Abdulazeez', phone: '447437353244', status: 'will-attend', calledBy: 'Brother John', notes: 'PRAYER: Safe delivery and family blessing', calledAt: new Date(Date.now() - 7200000).toISOString() }
  ];

  showView('mainView');
  renderCallerBar();
  renderContactCard();
  renderProgress();

  showToast('🚀 Preview Demo Mode Activated');
}
window.enableDemoMode = enableDemoMode;

// Boot
document.addEventListener('DOMContentLoaded', init);
