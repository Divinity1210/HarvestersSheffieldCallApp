// =====================================================
// HARVESTERS SHEFFIELD – Call Campaign App
// Frontend Logic — Backed by Google Sheets API
// =====================================================

// ===== CONFIGURATION =====
// After deploying the Google Apps Script, paste the Web App URL below:
const API_URL = 'https://script.google.com/macros/s/AKfycbwNTStykNSMyVLwg5xkMhN-xQp0mRQDKwstWqbNBG30fqmUj73LlwxAvS-3kk2rryd96Q/exec';  // ← PASTE YOUR APPS SCRIPT WEB APP URL HERE

// ===== APP STATE =====
let APP = {
  contacts: [],            // Cached contacts (for search)
  currentCaller: null,
  currentContact: null,     // Currently claimed contact from API
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
  _lastDashboardLog: null   // Cached for filter/search re-renders
};

// ===== LOADING OVERLAY =====
function showLoading(msg) {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  if (overlay) overlay.classList.add('active');
  if (text) text.textContent = msg || 'Loading...';
}
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('active');
}

// ===== API HELPER =====
async function api(params) {
  if (!API_URL) throw new Error('API not configured');
  const url = new URL(API_URL);
  Object.entries(params).forEach(function ([k, v]) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ===== PHONE MASKING (GDPR) =====
function maskPhone(phone) {
  if (!phone) return '***';
  var str = String(phone);
  if (str.length <= 4) return '****';
  return '\u2022'.repeat(str.length - 4) + str.slice(-4);
}
function formatPhoneForDisplay(phone, revealed) {
  if (revealed) {
    var str = String(phone);
    // UK mobile: 07xxx xxxxxx or 7xxx xxxxxx
    if (str.length === 11 && str.startsWith('0')) {
      return str.slice(0, 5) + ' ' + str.slice(5);
    }
    if (str.length === 10 && str.startsWith('7')) {
      return '0' + str.slice(0, 4) + ' ' + str.slice(4);
    }
    if (str.length === 13 && str.startsWith('+44')) {
      return str.slice(0, 3) + ' ' + str.slice(3, 7) + ' ' + str.slice(7);
    }
    return str;
  }
  return maskPhone(phone);
}

// ===== UI HELPERS =====
function $(id) { return document.getElementById(id); }
function showView(viewId) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  $(viewId).classList.add('active');
}
function showToast(msg, duration) {
  var toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function () { toast.classList.remove('show'); }, duration || 2500);
}
function getInitials(name) {
  return name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
}
function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== RENDER: CALLER BAR =====
function renderCallerBar() {
  $('callerAvatar').textContent = getInitials(APP.currentCaller);
  $('callerDisplayName').textContent = APP.currentCaller;
  $('scriptCallerName').textContent = APP.currentCaller;
}

// ===== RENDER: PROGRESS BAR =====
function renderProgress() {
  var total = APP.totalContacts || APP.contacts.length || 0;
  var called = APP.calledCount || 0;
  var callerCalls = APP.contacts.filter(function (c) {
    return c.calledBy === APP.currentCaller && c.status;
  }).length;

  $('progressText').textContent = callerCalls + ' calls made \u00b7 ' + called + '/' + total + ' total';
  $('progressFill').style.width = (total > 0 ? (called / total) * 100 : 0) + '%';
  $('pendingBadge').textContent = total - called;
}

// ===== RENDER: CONTACT CARD =====
function renderContactCard() {
  var area = $('contactArea');
  var responseArea = $('responseArea');
  APP.phoneRevealed = false;
  APP.selectedResponse = null;

  // Reset response buttons
  document.querySelectorAll('.response-btn[data-response]').forEach(function (b) { b.classList.remove('selected'); });
  $('submitBtn').disabled = true;
  $('notesInput').value = '';
  // Reset prayer request checkbox
  var prayerSection = $('prayerSection');
  if (prayerSection) {
    prayerSection.classList.remove('visible');
    prayerSection.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
  }

  if (!APP.currentContact) {
    area.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-icon">\uD83C\uDF89</div>' +
      '<h3 class="empty-title">All Calls Completed!</h3>' +
      '<p class="empty-text">Every contact has been called. Check the Dashboard for results.</p>' +
      '</div>';
    responseArea.style.display = 'none';
    return;
  }

  var contact = APP.currentContact;
  var total = APP.totalContacts || APP.contacts.length;
  var called = APP.calledCount || 0;
  var displayTitle = contact.surname ? 'Mr./Mrs. ' + contact.surname : contact.name;

  area.innerHTML =
    '<div class="contact-indicator">' +
    'Contact <span class="current">#' + (called + 1) + '</span> of ' + total +
    '</div>' +
    '<div class="contact-card">' +
    '<div class="label">Contact Name</div>' +
    '<div class="contact-name">' + escapeHtml(contact.name) + '</div>' +
    '<div class="label">Phone Number (GDPR Protected)</div>' +
    '<div class="phone-display">' +
    '<span class="phone-number" id="phoneDisplay">' + formatPhoneForDisplay(contact.phone, false) + '</span>' +
    '<button class="reveal-btn" id="revealBtn" onclick="toggleReveal(\'' + contact.phone + '\')">' +
    '\uD83D\uDC41 Reveal' +
    '</button>' +
    '<a href="tel:' + contact.phone + '" class="call-btn" id="callNowBtn">' +
    '\uD83D\uDCF1 Call' +
    '</a>' +
    '</div>' +
    '</div>';

  // Update script with contact surname for personalisation
  var scriptGreeting = $('scriptContactName');
  if (scriptGreeting) {
    scriptGreeting.textContent = displayTitle;
  }

  responseArea.style.display = 'block';
}

// ===== PHONE REVEAL TOGGLE =====
function toggleReveal(phone) {
  var display = $('phoneDisplay');
  var btn = $('revealBtn');

  if (APP.phoneRevealed) {
    display.textContent = formatPhoneForDisplay(phone, false);
    display.classList.remove('revealed');
    btn.textContent = '\uD83D\uDC41 Reveal';
    APP.phoneRevealed = false;
    clearTimeout(APP.revealTimeout);
  } else {
    display.textContent = formatPhoneForDisplay(phone, true);
    display.classList.add('revealed');
    btn.textContent = '\uD83D\uDE48 Hide';
    APP.phoneRevealed = true;
    // Auto-hide after 30 seconds
    APP.revealTimeout = setTimeout(function () {
      display.textContent = formatPhoneForDisplay(phone, false);
      display.classList.remove('revealed');
      btn.textContent = '\uD83D\uDC41 Reveal';
      APP.phoneRevealed = false;
    }, 30000);
  }
}

// ===== DASHBOARD =====
async function renderDashboard() {
  showLoading('Loading dashboard...');
  try {
    var data = await api({ action: 'dashboard' });
    APP._lastDashboardLog = data.log;
    renderStats(data.stats);
    renderDonut(data.stats);
    renderLeaderboard(data.callers);
    renderCallLog(data.log);
  } catch (e) {
    console.error('Dashboard error:', e);
    showToast('\u26A0\uFE0F Failed to load dashboard');
  } finally {
    hideLoading();
  }
}

function renderStats(stats) {
  $('statsGrid').innerHTML =
    '<div class="stat-card"><div class="stat-number white">' + stats.total + '</div><div class="stat-label">Total</div></div>' +
    '<div class="stat-card"><div class="stat-number gold">' + stats.called + '</div><div class="stat-label">Called</div></div>' +
    '<div class="stat-card"><div class="stat-number purple">' + stats.pending + '</div><div class="stat-label">Pending</div></div>' +
    '<div class="stat-card"><div class="stat-number green">' + stats.yes + '</div><div class="stat-label">Yes</div></div>' +
    '<div class="stat-card"><div class="stat-number red">' + stats.no + '</div><div class="stat-label">No</div></div>' +
    '<div class="stat-card"><div class="stat-number orange">' + (stats.tbc + stats.na) + '</div><div class="stat-label">TBC / NA</div></div>';
}

function renderDonut(stats) {
  var yes = stats.yes, no = stats.no, tbc = stats.tbc, na = stats.na;
  var total = yes + no + tbc + na;

  $('totalCalled').textContent = total;

  var canvas = $('donutCanvas');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = 160 * dpr;
  canvas.height = 160 * dpr;
  ctx.scale(dpr, dpr);

  var cx = 80, cy = 80, radius = 60, lineWidth = 16;
  var segments = [
    { value: yes, color: '#10b981' },
    { value: no, color: '#ef4444' },
    { value: tbc, color: '#f59e0b' },
    { value: na, color: '#6366f1' }
  ];

  ctx.clearRect(0, 0, 160, 160);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else {
    var startAngle = -Math.PI / 2;
    segments.forEach(function (d) {
      if (d.value === 0) return;
      var sweep = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      startAngle += sweep;
    });
  }

  $('chartLegend').innerHTML =
    '<div class="legend-item"><span class="legend-dot" style="background:#10b981"></span>Yes<span class="legend-value">' + yes + '</span></div>' +
    '<div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>No<span class="legend-value">' + no + '</span></div>' +
    '<div class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>TBC<span class="legend-value">' + tbc + '</span></div>' +
    '<div class="legend-item"><span class="legend-dot" style="background:#6366f1"></span>No Answer<span class="legend-value">' + na + '</span></div>';
}

function renderLeaderboard(callers) {
  var sorted = Object.entries(callers).sort(function (a, b) { return b[1].total - a[1].total; });

  if (sorted.length === 0) {
    $('leaderboard').innerHTML = '<div class="leaderboard-item" style="justify-content:center;color:var(--text-muted);font-size:0.85rem;padding:30px;">No calls recorded yet</div>';
    return;
  }

  $('leaderboard').innerHTML = sorted.map(function (entry, i) {
    var name = entry[0], data = entry[1];
    var rank = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : '#' + (i + 1);
    return '<div class="leaderboard-item">' +
      '<span class="lb-rank ' + (i < 3 ? 'top' : '') + '">' + rank + '</span>' +
      '<div class="lb-avatar">' + getInitials(name) + '</div>' +
      '<div class="lb-info">' +
      '<div class="lb-name">' + escapeHtml(name) + '</div>' +
      '<div class="lb-meta">' +
      '<span style="color:var(--success)">\u2713' + data.yes + '</span>' +
      '<span style="color:var(--danger)">\u2717' + data.no + '</span>' +
      '<span style="color:var(--warning)">?' + data.tbc + '</span>' +
      '<span style="color:var(--info)">\uD83D\uDCF5' + data.na + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="lb-calls">' + data.total + '</div>' +
      '</div>';
  }).join('');
}

function renderCallLog(log) {
  var filter = APP.currentFilter;
  var search = ($('logSearch') ? $('logSearch').value : '').toLowerCase();

  var filtered = log.slice();
  if (filter !== 'all') {
    filtered = filtered.filter(function (l) { return l.status === filter; });
  }
  if (search) {
    filtered = filtered.filter(function (l) {
      return l.name.toLowerCase().indexOf(search) >= 0 ||
        (l.calledBy || '').toLowerCase().indexOf(search) >= 0;
    });
  }

  if (filtered.length === 0) {
    $('logList').innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No calls to show</div>';
    return;
  }

  $('logList').innerHTML = filtered.map(function (l) {
    var time = l.calledAt ? new Date(l.calledAt) : new Date();
    var timeStr = time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    var badgeClass = l.status === 'no-answer' ? 'badge-no-answer' : ('badge-' + l.status);
    var responseLabel = l.status === 'no-answer' ? 'No Answer' : (l.status || '').toUpperCase();

    return '<div class="log-item">' +
      '<div class="log-status-dot ' + l.status + '"></div>' +
      '<div class="log-details">' +
      '<div class="log-contact-name">' + escapeHtml(l.name) + '</div>' +
      '<div class="log-phone-masked">' + maskPhone(l.phone) + '</div>' +
      (l.notes ? '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;font-style:italic;">"' + escapeHtml(l.notes) + '"</div>' : '') +
      '</div>' +
      '<div class="log-right">' +
      '<div class="log-response-badge ' + badgeClass + '">' + responseLabel + '</div>' +
      '<div class="log-caller-name">by ' + escapeHtml(l.calledBy || 'Unknown') + '</div>' +
      '<div class="log-time">' + timeStr + '</div>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ===== LOOKUP / SEARCH =====
function renderLookupResults(query) {
  var isDigits = /^\d+$/.test(query);
  var results = APP.contacts.filter(function (c) {
    if (isDigits) {
      return String(c.phone).indexOf(query) >= 0;
    } else {
      return c.name.toLowerCase().indexOf(query) >= 0;
    }
  }).slice(0, 20);

  if (results.length === 0) {
    $('lookupResults').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No contacts found</div>';
    return;
  }

  $('lookupResults').innerHTML = results.map(function (c) {
    var statusHtml;
    if (c.status) {
      var cls = c.status === 'no-answer' ? 'badge-no-answer' : ('badge-' + c.status);
      var lbl = c.status === 'no-answer' ? 'No Answer' : c.status.toUpperCase();
      statusHtml = '<span class="li-badge ' + cls + '">' + lbl + '</span>';
    } else if (c.calledBy) {
      statusHtml = '<span class="li-badge" style="background:rgba(99,102,241,0.15);color:#818cf8;">In Progress</span>';
    } else {
      statusHtml = '<span class="li-badge pending">Pending</span>';
    }

    return '<div class="lookup-item" onclick="openLookupModal(' + c.id + ')">' +
      '<div class="li-info">' +
      '<div class="li-name">' + escapeHtml(c.name) + '</div>' +
      '<div class="li-phone">' + maskPhone(c.phone) + '</div>' +
      '</div>' +
      '<div class="li-status">' + statusHtml + '</div>' +
      '</div>';
  }).join('');
}

function openLookupModal(contactId) {
  var contact = APP.contacts.find(function (c) { return c.id === contactId; });
  if (!contact) return;

  APP.modalContact = contact;
  APP.modalSelectedResponse = null;

  document.querySelectorAll('[data-modal-response]').forEach(function (b) { b.classList.remove('selected'); });
  $('modalSubmitBtn').disabled = true;
  $('modalNotesInput').value = '';

  $('modalContactName').textContent = contact.name;
  $('modalContactPhone').textContent = maskPhone(contact.phone);

  if (contact.status) {
    var badgeClass = contact.status === 'no-answer' ? 'badge-no-answer' : ('badge-' + contact.status);
    var label = contact.status === 'no-answer' ? 'No Answer' : contact.status.toUpperCase();
    var time = contact.calledAt ? new Date(contact.calledAt) : null;
    var timeStr = time
      ? time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';

    $('modalCurrentStatus').innerHTML =
      '<div class="status-label">Current Status</div>' +
      '<span class="log-response-badge ' + badgeClass + '">' + label + '</span>' +
      '<span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">by ' +
      escapeHtml(contact.calledBy || 'Unknown') + ' \u00b7 ' + timeStr + '</span>' +
      (contact.notes ? '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;font-style:italic;">"' + escapeHtml(contact.notes) + '"</div>' : '');
    $('modalCurrentStatus').style.display = 'block';
    $('modalNotesInput').value = contact.notes || '';
  } else {
    $('modalCurrentStatus').innerHTML =
      '<div class="status-label">Current Status</div>' +
      '<span style="color:var(--text-muted);font-size:0.82rem;">Not yet called</span>';
    $('modalCurrentStatus').style.display = 'block';
  }

  $('lookupModalOverlay').classList.add('active');
}

function closeLookupModal() {
  $('lookupModalOverlay').classList.remove('active');
  APP.modalContact = null;
  APP.modalSelectedResponse = null;
}

// ===== CSV EXPORT =====
function exportCSV() {
  var called = APP.contacts.filter(function (c) { return c.status; });
  if (called.length === 0) {
    showToast('\u26A0\uFE0F No data to export');
    return;
  }

  var headers = ['Contact Name', 'Phone (Masked)', 'Response', 'Notes', 'Caller', 'Date/Time'];
  var rows = called.map(function (c) {
    return [
      '"' + c.name + '"',
      '"' + maskPhone(c.phone) + '"',
      c.status === 'no-answer' ? 'No Answer' : (c.status || '').toUpperCase(),
      '"' + (c.notes || '').replace(/"/g, '""') + '"',
      '"' + (c.calledBy || '') + '"',
      c.calledAt ? new Date(c.calledAt).toLocaleString('en-GB') : ''
    ];
  });

  var csv = [headers.join(',')].concat(rows.map(function (r) { return r.join(','); })).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Harvesters_Sheffield_Calls_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('\u2705 CSV exported successfully!');
}

// ===== BACKGROUND CONTACTS CACHE (for search) =====
async function loadContactsCache() {
  try {
    var data = await api({ action: 'contacts' });
    APP.contacts = data.contacts;
    APP.totalContacts = data.contacts.length;
    APP.calledCount = data.contacts.filter(function (c) { return c.status; }).length;
  } catch (e) {
    console.error('Failed to load contacts cache:', e);
  }
}

// ===== EVENT HANDLERS =====
function setupEvents() {

  // ──── LOGIN ────
  $('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = $('callerNameInput').value.trim();
    if (!name) return;

    APP.currentCaller = name;
    localStorage.setItem('harvesters_sheffield_caller', name);

    showLoading('Getting your next contact...');
    try {
      var result = await api({ action: 'next', caller: name });
      APP.currentContact = result.contact;
      if (result.stats) {
        APP.totalContacts = result.stats.total;
        APP.calledCount = result.stats.called;
      }

      // Load full contacts list in background for search
      loadContactsCache();

      showView('mainView');
      renderCallerBar();
      renderContactCard();
      renderProgress();
    } catch (err) {
      showToast('\u26A0\uFE0F Failed to connect. Please try again.');
      console.error('Login error:', err);
    } finally {
      hideLoading();
    }
  });

  // ──── LOGOUT ────
  $('logoutBtn').addEventListener('click', function () {
    APP.currentCaller = null;
    APP.currentContact = null;
    localStorage.removeItem('harvesters_sheffield_caller');
    showView('loginView');
    $('callerNameInput').value = '';
  });

  // ──── NAV TABS ────
  document.querySelectorAll('.nav-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var viewId = tab.dataset.view;
      $('callView').classList.remove('active');
      $('dashboardView').classList.remove('active');
      $(viewId).classList.add('active');
      if (viewId === 'dashboardView') renderDashboard();
    });
  });

  // ──── RESPONSE BUTTONS (call view only) ────
  document.querySelectorAll('.response-btn[data-response]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.response-btn[data-response]').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      APP.selectedResponse = btn.dataset.response;
      $('submitBtn').disabled = false;

      // Show/hide prayer request section for YES responses
      var prayerSection = $('prayerSection');
      if (prayerSection) {
        if (APP.selectedResponse === 'yes') {
          prayerSection.classList.add('visible');
        } else {
          prayerSection.classList.remove('visible');
          prayerSection.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
        }
      }
    });
  });

  // ──── SUBMIT & NEXT ────
  $('submitBtn').addEventListener('click', async function () {
    if (!APP.selectedResponse || !APP.currentContact) return;

    var contact = APP.currentContact;
    var response = APP.selectedResponse;
    var notes = $('notesInput').value.trim();

    // Collect prayer request info if YES was selected
    if (response === 'yes') {
      var prayerInput = $('prayerRequestInput');
      if (prayerInput && prayerInput.value.trim()) {
        var prayerStr = 'PRAYER REQUEST: ' + prayerInput.value.trim();
        notes = notes ? (prayerStr + ' | ' + notes) : prayerStr;
      }
    }

    showLoading('Saving response...');
    try {
      var result = await api({
        action: 'submit_next',
        row: contact.row,
        status: response,
        caller: APP.currentCaller,
        notes: notes,
        timestamp: new Date().toISOString()
      });

      // Update local cache
      var idx = APP.contacts.findIndex(function (c) { return c.id === contact.id; });
      if (idx >= 0) {
        APP.contacts[idx].status = response;
        APP.contacts[idx].calledBy = APP.currentCaller;
        APP.contacts[idx].notes = notes;
        APP.contacts[idx].calledAt = new Date().toISOString();
      }

      APP.currentContact = result.next || null;
      if (result.stats) {
        APP.totalContacts = result.stats.total;
        APP.calledCount = result.stats.called;
      }
      APP.selectedResponse = null;

      var emojis = { yes: '\u2705', no: '\u274C', tbc: '\u23F3', 'no-answer': '\uD83D\uDCF5' };
      showToast((emojis[response] || '') + ' Response recorded for ' + contact.name);

      renderContactCard();
      renderProgress();
    } catch (err) {
      showToast('\u26A0\uFE0F Failed to save. Please try again.');
      console.error('Submit error:', err);
    } finally {
      hideLoading();
    }
  });

  // ──── SKIP ────
  $('skipBtn').addEventListener('click', async function () {
    if (!APP.currentContact) return;

    var contact = APP.currentContact;

    showLoading('Skipping...');
    try {
      var result = await api({
        action: 'submit_next',
        row: contact.row,
        status: 'no-answer',
        caller: APP.currentCaller,
        notes: 'Skipped - will retry later',
        timestamp: new Date().toISOString()
      });

      var idx = APP.contacts.findIndex(function (c) { return c.id === contact.id; });
      if (idx >= 0) {
        APP.contacts[idx].status = 'no-answer';
        APP.contacts[idx].calledBy = APP.currentCaller;
        APP.contacts[idx].notes = 'Skipped - will retry later';
        APP.contacts[idx].calledAt = new Date().toISOString();
      }

      APP.currentContact = result.next || null;
      if (result.stats) {
        APP.totalContacts = result.stats.total;
        APP.calledCount = result.stats.called;
      }

      showToast('\u23ED Skipped ' + contact.name);
      renderContactCard();
      renderProgress();
    } catch (err) {
      showToast('\u26A0\uFE0F Failed to skip. Please try again.');
      console.error('Skip error:', err);
    } finally {
      hideLoading();
    }
  });

  // ──── SCRIPT TOGGLE ────
  $('scriptToggle').addEventListener('click', function () {
    var body = $('scriptBody');
    var chevron = $('scriptChevron');
    APP.scriptExpanded = !APP.scriptExpanded;
    if (APP.scriptExpanded) {
      body.classList.remove('collapsed');
      body.classList.add('expanded');
      chevron.classList.add('open');
    } else {
      body.classList.remove('expanded');
      body.classList.add('collapsed');
      chevron.classList.remove('open');
    }
  });

  // ──── LOOKUP / SEARCH ────
  $('lookupToggle').addEventListener('click', function () {
    APP.lookupOpen = !APP.lookupOpen;
    var panel = $('lookupPanel');
    var toggle = $('lookupToggle');
    if (APP.lookupOpen) {
      panel.classList.add('active');
      toggle.classList.add('active');
      toggle.innerHTML = '\u2715 Close Search';
      $('lookupInput').focus();
      loadContactsCache(); // Refresh cache when opening search
    } else {
      panel.classList.remove('active');
      toggle.classList.remove('active');
      toggle.innerHTML = '\uD83D\uDD0D Search Contact (callback / lookup)';
      $('lookupInput').value = '';
      $('lookupResults').innerHTML = '';
    }
  });

  $('lookupInput').addEventListener('input', function (e) {
    var query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
      $('lookupResults').innerHTML = '';
      return;
    }
    renderLookupResults(query);
  });

  // ──── MODAL EVENTS ────
  $('modalClose').addEventListener('click', closeLookupModal);
  $('modalCancelBtn').addEventListener('click', closeLookupModal);
  $('lookupModalOverlay').addEventListener('click', function (e) {
    if (e.target === $('lookupModalOverlay')) closeLookupModal();
  });

  document.querySelectorAll('[data-modal-response]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-modal-response]').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      APP.modalSelectedResponse = btn.dataset.modalResponse;
      $('modalSubmitBtn').disabled = false;
    });
  });

  $('modalSubmitBtn').addEventListener('click', async function () {
    if (!APP.modalContact || !APP.modalSelectedResponse) return;
    var contact = APP.modalContact;

    showLoading('Updating response...');
    try {
      await api({
        action: 'submit',
        row: contact.row || contact.id,
        status: APP.modalSelectedResponse,
        caller: APP.currentCaller,
        notes: $('modalNotesInput').value.trim(),
        timestamp: new Date().toISOString()
      });

      // Update local cache
      var idx = APP.contacts.findIndex(function (c) { return c.id === contact.id; });
      if (idx >= 0) {
        APP.contacts[idx].status = APP.modalSelectedResponse;
        APP.contacts[idx].calledBy = APP.currentCaller;
        APP.contacts[idx].notes = $('modalNotesInput').value.trim();
        APP.contacts[idx].calledAt = new Date().toISOString();
      }

      var emojis = { yes: '\u2705', no: '\u274C', tbc: '\u23F3', 'no-answer': '\uD83D\uDCF5' };
      showToast((emojis[APP.modalSelectedResponse] || '') + ' Response updated for ' + contact.name);

      APP.modalSelectedResponse = null;
      closeLookupModal();
      renderContactCard();
      renderProgress();

      var query = $('lookupInput') ? $('lookupInput').value.trim().toLowerCase() : '';
      if (query && query.length >= 2) renderLookupResults(query);
    } catch (err) {
      showToast('\u26A0\uFE0F Failed to update. Please try again.');
      console.error('Modal submit error:', err);
    } finally {
      hideLoading();
    }
  });

  // ──── LOG FILTERS ────
  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      APP.currentFilter = chip.dataset.filter;
      if (APP._lastDashboardLog) renderCallLog(APP._lastDashboardLog);
    });
  });

  // ──── LOG SEARCH ────
  if ($('logSearch')) {
    $('logSearch').addEventListener('input', function () {
      if (APP._lastDashboardLog) renderCallLog(APP._lastDashboardLog);
    });
  }

  // ──── EXPORT ────
  $('exportBtn').addEventListener('click', exportCSV);
  $('exportFullBtn').addEventListener('click', exportCSV);
}

// ===== INIT =====
async function init() {
  // Check API configuration
  if (!API_URL) {
    var loginView = $('loginView').querySelector('.login-view');
    if (loginView) {
      loginView.innerHTML =
        '<div class="login-icon"><img src="flier.png" alt="Harvesters Sheffield"></div>' +
        '<h2 class="login-title" style="color:var(--warning);">\u2699\uFE0F Setup Required</h2>' +
        '<p class="login-subtitle">The Google Sheets backend has not been configured yet.</p>' +
        '<div style="margin-top:20px;padding:16px;background:var(--glass);border:1px solid var(--glass-border);border-radius:12px;text-align:left;font-size:0.82rem;color:var(--text-secondary);line-height:1.8;">' +
        '<strong style="color:var(--text-primary);">Setup Steps:</strong><br>' +
        '1. Open your Google Sheet<br>' +
        '2. Go to <strong>Extensions \u2192 Apps Script</strong><br>' +
        '3. Paste the code from <strong>apps_script.js</strong><br>' +
        '4. Click <strong>Deploy \u2192 New deployment</strong><br>' +
        '5. Type: <strong>Web app</strong>, Access: <strong>Anyone</strong><br>' +
        '6. Copy the URL into <strong>app.js</strong> line 8<br>' +
        '7. Push to GitHub \u2192 auto-deploys to Vercel' +
        '</div>';
    }
    return;
  }

  setupEvents();

  // Check for returning caller
  var caller = localStorage.getItem('harvesters_sheffield_caller');
  if (caller) {
    APP.currentCaller = caller;
    showLoading('Welcome back! Loading...');
    try {
      var result = await api({ action: 'next', caller: caller });
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
      localStorage.removeItem('harvesters_sheffield_caller');
      showView('loginView');
    } finally {
      hideLoading();
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
