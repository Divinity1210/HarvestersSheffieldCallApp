// =====================================================
// HARVESTERS BIRMINGHAM – Member Outreach & Calling App
// Mobile-First Dynamic Campaign Engine & Follow-up Platform
// Supports: Weekly Follow-ups, Event Campaigns, GDPR Do-Not-Call Suppression,
//           Call Audit Tracking, and Double-Call Prevention per Campaign.
// =====================================================

// ===== CONFIGURATION =====
const API_URL = 'https://script.google.com/macros/s/AKfycbxQhZHOa5OfG7WM4460paNpZ1j96F4yGuNB97RFwPKcjMvhgMps28WcEet5UOuCQ80szA/exec';

// Storage keys
const STORAGE_KEY_CALLER = 'harvesters_birmingham_caller_v2';
const STORAGE_KEY_CAMPAIGNS = 'hb_campaigns_list_v2';
const STORAGE_KEY_ACTIVE_CAMPAIGN = 'hb_active_campaign_id_v2';

// ===== DEFAULT CAMPAIGNS =====
const DEFAULT_CAMPAIGNS = [
  {
    id: 'sunday-service',
    name: 'Sunday Celebration Service',
    theme: 'Worship, Word & Miracles',
    venue: 'Park Regis, 160 Broad St, Birmingham B15 1DT',
    dateTime: 'Every Sunday · 10:00 AM',
    parking: 'Free & on-street parking available',
    mapUrl: 'https://maps.google.com/?q=Park+Regis+160+Broad+St+Birmingham+B15+1DT',
    scriptIntro: "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName}, and I’m calling from Harvesters Birmingham. I hope you're having a blessed week!",
    theAsk: "We're having our Sunday Celebration Service this coming Sunday at 10:00 AM at Park Regis, and we would love for you and your family to join us. Will you be able to make it?",
    branchYes: "That is wonderful! We look forward to welcoming you. Feel free to come along with family and friends — parking is available on-site and on-street.",
    branchUnsure: "No problem at all, {FirstName}. I just wanted to personally connect and invite you. Would you like me to send you the details on WhatsApp, and is there any prayer request we can stand with you in?",
    branchNo: "That is completely fine, {FirstName}. Thank you so much for your time. You can also join our livestream online, and we pray God blesses your week abundantly.",
    closing: "Thank you so much for your time, {FirstName}. Have a wonderful and victorious week, and God bless you!",
    whatsappTemplate: "Hi {FirstName}! 👋 This is {CallerName} from Harvesters Birmingham.\n\nHere are the details for our Sunday Celebration Service:\n📍 Park Regis, 160 Broad St, Birmingham B15 1DT\n🗓️ This Sunday\n🕙 10:00 AM\n🚗 Free & on-street parking available\n\nWe look forward to seeing you! Let us know if you need transport directions or prayer. Have a blessed week! 🙏",
    isActive: true
  },
  {
    id: 'awakening-2026',
    name: 'Awakening 2026 – Breakthrough & Renewal',
    theme: 'Breakthrough & Spiritual Renewal',
    venue: 'Park Regis, 160 Broad St, Birmingham B15 1DT',
    dateTime: 'Weekend Gathering · 09:00 AM - 03:00 PM',
    parking: 'Free & on-street parking available',
    mapUrl: 'https://maps.google.com/?q=Park+Regis+160+Broad+St+Birmingham+B15+1DT',
    scriptIntro: "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName}, and I’m calling from Harvesters Birmingham. I hope you’re doing well!",
    theAsk: "I’m calling to specially invite you to Awakening, our two day gathering focused on breakthrough and spiritual renewal. It’s going to be a powerful time of prayer, worship and the word, and we would really love for you to be part of it. Will you be able to join us?",
    branchYes: "That’s great! We look forward to welcoming you. Feel free to invite your family and friends too — parking is available on-site and on-street.",
    branchUnsure: "No problem at all. I just wanted to personally invite you and make sure you’re aware of it. We’d love to have you with us if you’re able to make it. Is there any prayer request you'd like us to agree with you on?",
    branchNo: "I completely understand. Thank you so much for your time today. We’ll be praying for you, and we hope to see you at another of our upcoming gatherings.",
    closing: "Thank you so much, {FirstName}. Have a wonderful rest of your day, and God bless you richly!",
    whatsappTemplate: "Hi {FirstName}! 👋 This is {CallerName} from Harvesters Birmingham.\n\nHere are the details for Awakening:\n📍 Park Regis, 160 Broad St, Birmingham B15 1DT\n🗓️ Weekend Gathering\n🕙 09:00 AM - 03:00 PM\n🚗 Free & on-street parking available\n\nWe look forward to welcoming you! Feel free to invite your family and friends. Have a blessed week! 🙏",
    isActive: false
  },
  {
    id: 'newcomers-welcome',
    name: 'Newcomers & First-Timers Follow-Up',
    theme: 'Welcome to the Harvesters Family',
    venue: 'Park Regis, 160 Broad St, Birmingham B15 1DT',
    dateTime: 'Weekly Follow-up Check-in',
    parking: 'Free & on-street parking available',
    mapUrl: 'https://maps.google.com/?q=Park+Regis+160+Broad+St+Birmingham+B15+1DT',
    scriptIntro: "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName} from Harvesters Birmingham. I’m just calling to personally thank you for worshipping with us recently and check how your week has been!",
    theAsk: "We want you to know how blessed we were to have you with us! We would love to welcome you again this Sunday at 10:00 AM. Will you be able to join us?",
    branchYes: "Praise God! We are truly excited to see you again. If you have any questions or need anything at all, we are here for you.",
    branchUnsure: "No worries at all, {FirstName}! We are praying with you, and you are always part of our family whenever you are able to join us.",
    branchNo: "Thank you so much for your time, {FirstName}. We appreciate you and pray God's favor over your work and family.",
    closing: "God bless you, {FirstName}, have a joyful and victorious week ahead!",
    whatsappTemplate: "Hi {FirstName}! 👋 Thank you for connecting with Harvesters Birmingham. We were so blessed to have you worship with us! We'd love to see you again this Sunday at 10:00 AM at Park Regis (160 Broad St, B15 1DT). Let us know if you need prayer or transport directions! 🙏",
    isActive: false
  }
];

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
  campaigns: DEFAULT_CAMPAIGNS,
  activeCampaign: DEFAULT_CAMPAIGNS[0],
  _lastDashboardLog: null,
  _cachedDashboard: null,
  _statsCampaignFilter: 'all'
};

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

  if (digits.startsWith('447') && digits.length === 12) {
    return '+44 ' + digits.slice(2, 6) + ' ' + digits.slice(6);
  }
  if (digits.startsWith('07') && digits.length === 11) {
    return digits.slice(0, 5) + ' ' + digits.slice(5);
  }
  if (digits.length >= 10) {
    return '+' + digits.slice(0, 2) + ' ' + digits.slice(2, 6) + ' ' + digits.slice(6);
  }
  return raw || 'No Phone';
}

function getTelHref(phone) {
  let digits = cleanDigits(phone);
  if (!digits) return '#';
  if (digits.startsWith('0')) {
    digits = '44' + digits.slice(1);
  }
  return 'tel:+' + digits;
}

function getWhatsAppHref(phone, contactName) {
  let digits = cleanDigits(phone);
  if (!digits) return '#';
  if (digits.startsWith('0')) {
    digits = '44' + digits.slice(1);
  }

  const firstName = (contactName || 'Friend').split(/\s+/)[0];
  const callerName = APP.currentCaller || 'A church volunteer';
  const campaign = APP.activeCampaign || DEFAULT_CAMPAIGNS[0];

  let text = campaign.whatsappTemplate || DEFAULT_CAMPAIGNS[0].whatsappTemplate;
  text = text.replace(/{FirstName}/g, firstName)
             .replace(/{CallerName}/g, callerName)
             .replace(/{ChurchName}/g, 'Harvesters Birmingham')
             .replace(/{Venue}/g, campaign.venue || 'Park Regis')
             .replace(/{DateTime}/g, campaign.dateTime || 'Sunday 10:00 AM')
             .replace(/{Theme}/g, campaign.theme || 'Church Outreach');

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
    APP.revealTimeout = setTimeout(() => {
      if (display) {
        display.textContent = formatPhoneForDisplay(phone, false);
        display.classList.remove('revealed');
      }
      if (btn) btn.textContent = '👁️ Reveal';
      APP.phoneRevealed = false;
    }, 20000); // Auto-hide after 20s for GDPR safety
  }
}
window.toggleReveal = toggleReveal;

// ===== SCRIPT BRANCH SELECTION =====
function selectScriptBranch(branch) {
  document.querySelectorAll('.m-branch-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.branch === branch);
  });
  document.querySelectorAll('.m-branch-content').forEach(c => {
    c.classList.toggle('active-branch', c.dataset.branch === branch);
  });

  const targetBtn = document.querySelector(`.response-btn[data-response="${branch}"]`);
  if (targetBtn) {
    document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
    targetBtn.classList.add('selected');
    APP.selectedResponse = branch;

    const submitBtn = $('submitBtn');
    if (submitBtn) submitBtn.disabled = false;

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

    document.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === targetSubView);
    });

    if (targetSubView === 'dashboardView') {
      renderDashboard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ===== CAMPAIGN & SCRIPT MANAGEMENT ENGINE =====
function loadCampaigns() {
  const saved = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
  if (saved) {
    try {
      APP.campaigns = JSON.parse(saved);
    } catch (e) {
      APP.campaigns = DEFAULT_CAMPAIGNS;
    }
  } else {
    APP.campaigns = DEFAULT_CAMPAIGNS;
  }

  const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_CAMPAIGN);
  const found = APP.campaigns.find(c => c.id === activeId);
  APP.activeCampaign = found || APP.campaigns[0] || DEFAULT_CAMPAIGNS[0];

  // Silently check remote backend for updated campaigns
  if (API_URL) {
    api({ action: 'get_campaigns' }).then(res => {
      if (res && res.campaigns && res.campaigns.length > 0) {
        APP.campaigns = res.campaigns;
        const active = res.campaigns.find(c => c.isActive) || APP.campaigns.find(c => c.id === activeId) || res.campaigns[0];
        APP.activeCampaign = active;
        saveCampaignsLocally();
        renderActiveCampaign();
        populateStatsCampaignSelect();
      }
    }).catch(err => {
      console.warn('Campaign sync note:', err);
    });
  }
}

function saveCampaignsLocally() {
  localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(APP.campaigns));
  if (APP.activeCampaign) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CAMPAIGN, APP.activeCampaign.id);
  }
}

async function selectActiveCampaign(campaignId) {
  const target = APP.campaigns.find(c => c.id === campaignId);
  if (!target) return;

  APP.campaigns.forEach(c => c.isActive = (c.id === campaignId));
  APP.activeCampaign = target;
  saveCampaignsLocally();

  renderActiveCampaign();
  closeCampaignModal();
  populateStatsCampaignSelect();
  showToast(`✓ Active campaign: ${target.name}`);

  // Fetch exclusive next contact for this newly activated campaign
  if (API_URL && APP.currentCaller) {
    showLoading(`Loading calls for ${target.name}...`);
    try {
      const res = await api({ action: 'next', caller: APP.currentCaller, campaign: target.id });
      APP.currentContact = res.contact || null;
      if (res.stats) {
        APP.totalContacts = res.stats.total;
        APP.calledCount = res.stats.called;
      }
      renderContactCard();
      renderProgress();
    } catch (e) {
      console.error('Campaign switch error:', e);
    } finally {
      hideLoading();
    }
  } else {
    renderContactCard();
  }
}
window.selectActiveCampaign = selectActiveCampaign;

function renderActiveCampaign() {
  const campaign = APP.activeCampaign || DEFAULT_CAMPAIGNS[0];

  // Update Top Banner
  const bannerName = $('activeCampaignName');
  if (bannerName) bannerName.textContent = campaign.name;
  const bannerTheme = $('activeCampaignTheme');
  if (bannerTheme) bannerTheme.textContent = `${campaign.theme || 'Church Outreach'} · ${campaign.venue || 'Park Regis'}`;

  // Update Script Header
  const scriptTitle = $('scriptTitleHeader');
  if (scriptTitle) scriptTitle.textContent = `📋 Call Script (${campaign.name})`;

  // Update Script Content
  const scriptGreeting = $('scriptGreetingText');
  if (scriptGreeting) scriptGreeting.innerHTML = `"Hello, may I speak with <span class="highlight-name" id="scriptContactName">[Name]</span>?"`;

  const scriptIntro = $('scriptIntroBody');
  if (scriptIntro) {
    const contact = APP.currentContact;
    const firstName = contact ? (contact.firstName || 'Friend') : '[Name]';
    const callerName = APP.currentCaller || '[Your Name]';
    let intro = campaign.scriptIntro || DEFAULT_CAMPAIGNS[0].scriptIntro;
    intro = intro.replace(/{FirstName}/g, `<span class="highlight-name" id="scriptContactFirstName">${escapeHtml(firstName)}</span>`)
                 .replace(/{CallerName}/g, `<strong id="scriptCallerName">${escapeHtml(callerName)}</strong>`)
                 .replace(/{ChurchName}/g, '<strong>Harvesters Birmingham</strong>');
    scriptIntro.innerHTML = `"${intro}"`;
  }

  const scriptVenue = $('scriptVenueText');
  if (scriptVenue) scriptVenue.textContent = campaign.venue || 'Park Regis, 160 Broad St, Birmingham B15 1DT';

  const scriptDateTime = $('scriptDateTimeText');
  if (scriptDateTime) scriptDateTime.textContent = campaign.dateTime || 'Every Sunday · 10:00 AM';

  const scriptParking = $('scriptParkingText');
  if (scriptParking) scriptParking.textContent = campaign.parking || 'Free on-site & on-street parking';

  const scriptMapBtn = $('scriptMapBtn');
  if (scriptMapBtn) scriptMapBtn.href = campaign.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(campaign.venue || 'Birmingham')}`;

  const scriptTheAsk = $('scriptTheAsk');
  if (scriptTheAsk) scriptTheAsk.textContent = `"${campaign.theAsk || DEFAULT_CAMPAIGNS[0].theAsk}"`;

  const branchYes = $('branchYesText');
  if (branchYes) branchYes.innerHTML = `<strong>If they say YES:</strong><br>"${escapeHtml(campaign.branchYes || DEFAULT_CAMPAIGNS[0].branchYes)}"`;

  const branchUnsure = $('branchUnsureText');
  if (branchUnsure) branchUnsure.innerHTML = `<strong>If they are UNSURE:</strong><br>"${escapeHtml(campaign.branchUnsure || DEFAULT_CAMPAIGNS[0].branchUnsure)}"`;

  const branchNo = $('branchNoText');
  if (branchNo) branchNo.innerHTML = `<strong>If they say NO:</strong><br>"${escapeHtml(campaign.branchNo || DEFAULT_CAMPAIGNS[0].branchNo)}"`;

  const scriptClosing = $('scriptClosingText');
  if (scriptClosing) scriptClosing.textContent = `"${campaign.closing || DEFAULT_CAMPAIGNS[0].closing}"`;
}

// ===== CAMPAIGN MODAL & SCRIPT EDITOR =====
function openCampaignModal() {
  const modal = $('campaignModal');
  if (modal) {
    modal.classList.add('active');
    renderCampaignList();
    switchCampaignTab('list');
  }
}
window.openCampaignModal = openCampaignModal;

function closeCampaignModal() {
  const modal = $('campaignModal');
  if (modal) modal.classList.remove('active');
}
window.closeCampaignModal = closeCampaignModal;

function switchCampaignTab(tab) {
  const listTab = $('campaignListTab');
  const editTab = $('campaignEditTab');
  const listBtn = $('tabCampaignListBtn');
  const editBtn = $('tabCampaignEditBtn');

  if (tab === 'list') {
    if (listTab) listTab.style.display = 'block';
    if (editTab) editTab.style.display = 'none';
    if (listBtn) listBtn.classList.add('active');
    if (editBtn) editBtn.classList.remove('active');
  } else {
    if (listTab) listTab.style.display = 'none';
    if (editTab) editTab.style.display = 'block';
    if (listBtn) listBtn.classList.remove('active');
    if (editBtn) editBtn.classList.add('active');
  }
}
window.switchCampaignTab = switchCampaignTab;

function renderCampaignList() {
  const container = $('campaignCardsContainer');
  if (!container) return;

  container.innerHTML = APP.campaigns.map(c => {
    const isActive = (c.id === (APP.activeCampaign ? APP.activeCampaign.id : ''));
    return `
      <div style="background:rgba(255,255,255,0.03);border:1.5px solid ${isActive ? 'var(--accent-gold)' : 'var(--border-subtle)'};border-radius:var(--radius-sm);padding:12px;position:relative;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <div>
            <div style="font-size:0.92rem;font-weight:800;color:#fff;">${escapeHtml(c.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">${escapeHtml(c.theme || '')}</div>
          </div>
          ${isActive ? '<span style="background:rgba(16,185,129,0.2);border:1px solid #10b981;color:#34d399;font-size:0.65rem;font-weight:800;padding:2px 8px;border-radius:12px;">ACTIVE</span>' : ''}
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:10px;">
          📍 ${escapeHtml(c.venue || 'Birmingham')} · 🗓️ ${escapeHtml(c.dateTime || 'Sundays')}
        </div>
        <div style="display:flex;gap:6px;">
          ${!isActive ? `<button type="button" class="flyer-pill-btn" onclick="selectActiveCampaign('${c.id}')" style="background:var(--accent-gold);color:#000;border:none;">Activate</button>` : ''}
          <button type="button" class="flyer-pill-btn" onclick="editCampaign('${c.id}')">✏️ Edit Script</button>
        </div>
      </div>
    `;
  }).join('');
}

function editCampaign(campaignId) {
  const c = APP.campaigns.find(item => item.id === campaignId) || APP.activeCampaign;
  if (!c) return;

  $('editCampaignId').value = c.id;
  $('editCampaignName').value = c.name || '';
  $('editCampaignTheme').value = c.theme || '';
  $('editCampaignVenue').value = c.venue || '';
  $('editCampaignDateTime').value = c.dateTime || '';
  $('editScriptIntro').value = c.scriptIntro || '';
  $('editTheAsk').value = c.theAsk || '';
  $('editBranchYes').value = c.branchYes || '';
  $('editBranchUnsure').value = c.branchUnsure || '';
  $('editBranchNo').value = c.branchNo || '';
  $('editClosing').value = c.closing || '';
  $('editWhatsAppTemplate').value = c.whatsappTemplate || '';

  switchCampaignTab('edit');
}
window.editCampaign = editCampaign;

function startNewCampaign() {
  const newId = 'campaign-' + Date.now();
  $('editCampaignId').value = newId;
  $('editCampaignName').value = '';
  $('editCampaignTheme').value = '';
  $('editCampaignVenue').value = 'Park Regis, 160 Broad St, Birmingham B15 1DT';
  $('editCampaignDateTime').value = 'This Sunday · 10:00 AM';
  $('editScriptIntro').value = DEFAULT_CAMPAIGNS[0].scriptIntro;
  $('editTheAsk').value = DEFAULT_CAMPAIGNS[0].theAsk;
  $('editBranchYes').value = DEFAULT_CAMPAIGNS[0].branchYes;
  $('editBranchUnsure').value = DEFAULT_CAMPAIGNS[0].branchUnsure;
  $('editBranchNo').value = DEFAULT_CAMPAIGNS[0].branchNo;
  $('editClosing').value = DEFAULT_CAMPAIGNS[0].closing;
  $('editWhatsAppTemplate').value = DEFAULT_CAMPAIGNS[0].whatsappTemplate;

  switchCampaignTab('edit');
}
window.startNewCampaign = startNewCampaign;

function saveCampaignFromForm(e) {
  e.preventDefault();
  const id = $('editCampaignId').value || ('campaign-' + Date.now());
  const name = $('editCampaignName').value.trim();
  if (!name) {
    showToast('Campaign name is required');
    return;
  }

  const updated = {
    id: id,
    name: name,
    theme: $('editCampaignTheme').value.trim(),
    venue: $('editCampaignVenue').value.trim(),
    dateTime: $('editCampaignDateTime').value.trim(),
    parking: 'Free & on-street parking available',
    mapUrl: `https://maps.google.com/?q=${encodeURIComponent($('editCampaignVenue').value.trim() || 'Birmingham')}`,
    scriptIntro: $('editScriptIntro').value.trim(),
    theAsk: $('editTheAsk').value.trim(),
    branchYes: $('editBranchYes').value.trim(),
    branchUnsure: $('editBranchUnsure').value.trim(),
    branchNo: $('editBranchNo').value.trim(),
    closing: $('editClosing').value.trim(),
    whatsappTemplate: $('editWhatsAppTemplate').value.trim(),
    isActive: (APP.activeCampaign && APP.activeCampaign.id === id)
  };

  const existingIdx = APP.campaigns.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    APP.campaigns[existingIdx] = updated;
  } else {
    APP.campaigns.push(updated);
  }

  if (!APP.activeCampaign || APP.activeCampaign.id === id) {
    APP.activeCampaign = updated;
  }

  saveCampaignsLocally();
  renderActiveCampaign();
  renderCampaignList();
  populateStatsCampaignSelect();
  switchCampaignTab('list');
  showToast('💾 Campaign script saved successfully!');

  // Sync to Google Apps Script
  if (API_URL) {
    api({
      action: 'save_campaign',
      id: updated.id,
      name: updated.name,
      theme: updated.theme,
      venue: updated.venue,
      dateTime: updated.dateTime,
      scriptIntro: updated.scriptIntro,
      theAsk: updated.theAsk,
      branchYes: updated.branchYes,
      branchUnsure: updated.branchUnsure,
      branchNo: updated.branchNo,
      closing: updated.closing,
      whatsappTemplate: updated.whatsappTemplate,
      isActive: updated.isActive ? 'true' : 'false'
    }).catch(err => {
      console.warn('Campaign remote save warning:', err);
    });
  }
}

// ===== OPT-OUT / DO-NOT-CALL SUPPRESSION & DELETION =====
function openOptOutModal() {
  if (!APP.currentContact) {
    showToast('No active contact selected');
    return;
  }

  const modal = $('optOutModal');
  if (!modal) return;

  $('optOutContactName').textContent = APP.currentContact.name || 'Member';
  $('optOutContactPhone').textContent = formatPhoneForDisplay(APP.currentContact.phone, true);
  $('optOutReasonInput').value = 'Member requested to be taken off church database (Do Not Call)';

  modal.classList.add('active');
}
window.openOptOutModal = openOptOutModal;

function closeOptOutModal() {
  const modal = $('optOutModal');
  if (modal) modal.classList.remove('active');
}
window.closeOptOutModal = closeOptOutModal;

async function confirmOptOut() {
  if (!APP.currentContact) return;
  const contact = APP.currentContact;
  const reason = $('optOutReasonInput').value.trim() || 'Member requested removal';

  closeOptOutModal();
  showLoading('Removing member record permanently from database...');

  // 1. Local handling
  if (!API_URL) {
    APP.contacts = APP.contacts.filter(c => c.id !== contact.id);
    APP.totalContacts = Math.max(0, (APP.totalContacts || 1) - 1);
    const nextContact = APP.contacts.find(c => !c.status) || null;
    APP.currentContact = nextContact;

    hideLoading();
    showToast(`🚫 ${contact.name} permanently removed from database`, 2500);
    renderContactCard();
    renderProgress();
    return;
  }

  // 2. Server-side deletion via LockService & DoNotCall logging
  try {
    const result = await api({
      action: 'opt_out',
      row: contact.row,
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      caller: APP.currentCaller,
      campaign: APP.activeCampaign ? APP.activeCampaign.id : '',
      reason: reason,
      timestamp: new Date().toISOString()
    });

    // Remove from local contacts cache so search/broadcast also excludes them
    APP.contacts = APP.contacts.filter(c => c.id !== contact.id);
    if (result.stats) {
      APP.totalContacts = result.stats.total;
      APP.calledCount = result.stats.called;
    }

    APP.currentContact = result.next || null;
    showToast(`🚫 ${contact.name} permanently removed from database`, 2500);
    renderContactCard();
    renderProgress();
  } catch (err) {
    showToast('⚠️ Could not remove record. Please try again.');
    console.error('Opt-out error:', err);
  } finally {
    hideLoading();
  }
}
window.confirmOptOut = confirmOptOut;

// ===== CALLER BAR & PROGRESS =====
function renderCallerBar() {
  const display = $('callerDisplayName');
  if (display) display.textContent = APP.currentCaller || 'Volunteer';
  const avatar = $('topAvatarBtn');
  if (avatar) avatar.textContent = getInitials(APP.currentCaller);
}

function renderProgress() {
  const text = $('progressText');
  const fill = $('progressFill');
  const pendingBadge = $('pendingBadge');

  const total = APP.totalContacts || APP.contacts.length || 0;
  const called = APP.calledCount || 0;
  const pct = total > 0 ? Math.min(100, Math.round((called / total) * 100)) : 0;

  if (text) {
    text.textContent = `${called} / ${total} Calls (${pct}%)`;
  }
  if (fill) {
    fill.style.width = pct + '%';
  }
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

  const prayerSection = $('prayerSection');
  if (prayerSection) {
    prayerSection.classList.remove('visible');
    const prayerInput = $('prayerRequestInput');
    if (prayerInput) prayerInput.value = '';
  }

  if (!APP.currentContact) {
    const campName = APP.activeCampaign ? APP.activeCampaign.name : 'this campaign';
    area.innerHTML = `
      <div class="m-contact-card" style="text-align:center;padding:36px 20px;">
        <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
        <h3 style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:6px;">All Contacts Reached for ${escapeHtml(campName)}!</h3>
        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;">Every available member for this campaign has been reached. You can switch or create another campaign using the button above.</p>
        <button type="button" class="btn-primary-mobile" onclick="openCampaignModal()" style="margin-top:16px;height:42px;font-size:0.84rem;">
          ⚙️ Change / Create Campaign
        </button>
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

// ===== DASHBOARD RENDERING & CAMPAIGN FILTER =====
function populateStatsCampaignSelect() {
  const select = $('statsCampaignSelect');
  if (!select) return;

  const currentVal = APP._statsCampaignFilter || 'all';
  select.innerHTML = '<option value="all">📊 All Campaigns (Combined)</option>' +
    APP.campaigns.map(c => `
      <option value="${escapeHtml(c.id)}" ${c.id === currentVal ? 'selected' : ''}>
        ${escapeHtml(c.name)}
      </option>
    `).join('');
}

async function renderDashboard() {
  populateStatsCampaignSelect();
  const selectedCamp = APP._statsCampaignFilter || 'all';

  if (!API_URL) {
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
    return;
  }

  showLoading('Loading campaign stats...');
  try {
    const data = await api({
      action: 'dashboard',
      campaign: selectedCamp !== 'all' ? selectedCamp : ''
    });
    APP._cachedDashboard = data;
    APP._lastDashboardLog = data.log || [];
    renderStats(data.stats || {});
    renderDonut(data.stats || {});
    renderLeaderboard(data.callers || {});
    renderCallLog(data.log || []);
  } catch (e) {
    console.error('Dashboard error:', e);
    showToast('⚠️ Failed to load dashboard');
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
    const c = 2 * Math.PI * r;
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

  const list = Object.entries(callers || {}).map(([name, data]) => ({
    name,
    total: typeof data === 'object' ? data.total : data,
    willAttend: typeof data === 'object' ? (data.willAttend || 0) : 0
  })).sort((a, b) => b.total - a.total);

  if (list.length === 0) {
    board.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.8rem;">No calls logged for this selection yet.</div>';
    return;
  }

  board.innerHTML = list.map((c, i) => {
    const medal = (i === 0) ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `#${i + 1}`));
    return `
      <div class="lb-row">
        <div class="lb-rank">${medal}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(c.name)}</div>
          <div class="lb-meta">${c.willAttend} attending</div>
        </div>
        <div class="lb-calls">${c.total}</div>
      </div>
    `;
  }).join('');
}

function renderCallLog(logs) {
  const listEl = $('logList');
  if (!listEl) return;

  const filter = APP.currentFilter || 'all';
  const query = ($('logSearch') ? $('logSearch').value.trim().toLowerCase() : '');

  let filtered = (logs || []).filter(item => {
    const norm = normalizeStatus(item.status);
    if (filter !== 'all' && norm !== filter) return false;
    if (query) {
      const matchName = (item.name || '').toLowerCase().includes(query);
      const matchCaller = (item.calledBy || '').toLowerCase().includes(query);
      const matchNotes = (item.notes || '').toLowerCase().includes(query);
      return matchName || matchCaller || matchNotes;
    }
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.8rem;">No activity matching filter.</div>';
    return;
  }

  listEl.innerHTML = filtered.slice(0, 50).map(c => {
    const norm = normalizeStatus(c.status);
    return `
      <div class="log-item">
        <div class="log-status-dot ${norm}"></div>
        <div class="log-details">
          <div class="log-contact-name">${escapeHtml(c.name || 'Friend')}</div>
          <div class="log-phone-masked">${maskPhone(c.phone)} ${c.campaign ? '· <span style="color:var(--accent-gold);">' + escapeHtml(c.campaign) + '</span>' : ''}</div>
          ${c.notes ? `<div class="log-notes-text">"${escapeHtml(c.notes)}"</div>` : ''}
        </div>
        <div class="log-right">
          ${getStatusBadgeHtml(c.status)}
          <div class="log-caller-name">${escapeHtml(c.calledBy || 'Volunteer')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== SEARCH / LOOKUP SHEET & MODAL =====
function setupLookup() {
  const input = $('lookupInput');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const results = $('lookupResults');
    if (!results) return;

    if (q.length < 2) {
      results.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">Type at least 2 characters or phone digits</div>';
      return;
    }

    const matches = APP.contacts.filter(c => {
      const name = (c.name || '').toLowerCase();
      const phone = cleanDigits(c.phone);
      return name.includes(q) || phone.includes(q);
    }).slice(0, 25);

    if (matches.length === 0) {
      results.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">No members found matching "' + escapeHtml(q) + '"</div>';
      return;
    }

    results.innerHTML = matches.map(c => `
      <div class="lookup-item" onclick="openLookupModal(${c.id})">
        <div style="flex:1;min-width:0;">
          <div class="li-name">${escapeHtml(c.name)}</div>
          <div class="li-phone">${maskPhone(c.phone)}</div>
        </div>
        <div>
          ${getStatusBadgeHtml(c.status)}
        </div>
      </div>
    `).join('');
  });
}

function openLookupSheet() {
  const sheet = $('lookupSheet');
  if (sheet) {
    sheet.classList.add('active');
    const input = $('lookupInput');
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}

function closeLookupSheet() {
  const sheet = $('lookupSheet');
  if (sheet) sheet.classList.remove('active');
}

function openLookupModal(contactId) {
  const contact = APP.contacts.find(c => c.id === contactId);
  if (!contact) return;

  APP.modalContact = contact;
  APP.modalSelectedResponse = null;

  $('modalContactName').textContent = contact.name || 'Friend';
  $('modalContactPhone').textContent = maskPhone(contact.phone);
  $('modalCurrentStatus').innerHTML = '<strong>Current Status:</strong> ' + getStatusBadgeHtml(contact.status);
  $('modalNotesInput').value = contact.notes || '';

  document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(b => b.classList.remove('selected'));
  if (contact.status) {
    const btn = document.querySelector(`#lookupModalOverlay .response-btn[data-modal-response="${normalizeStatus(contact.status)}"]`);
    if (btn) {
      btn.classList.add('selected');
      APP.modalSelectedResponse = normalizeStatus(contact.status);
    }
  }

  const overlay = $('lookupModalOverlay');
  if (overlay) overlay.classList.add('active');
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
  showLoading('Preparing CSV export...');
  try {
    const data = await api({ action: 'contacts' });
    const contacts = data.contacts || [];

    const headers = ['ID', 'Contact ID', 'Name', 'Phone', 'Call Status', 'Call Agent', 'Feedback / Notes', 'Campaign', 'CalledAt'];
    const rows = contacts.map(c => [
      c.id,
      c.contactId || '',
      '"' + (c.name || '').replace(/"/g, '""') + '"',
      c.phone || '',
      c.status || '',
      '"' + (c.calledBy || '').replace(/"/g, '""') + '"',
      '"' + (c.notes || '').replace(/"/g, '""') + '"',
      '"' + (c.campaign || '').replace(/"/g, '""') + '"',
      c.calledAt || ''
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(',')].concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = 'Harvesters_Birmingham_Calls_' + (APP.activeCampaign ? APP.activeCampaign.id : 'export') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Calls CSV exported successfully!');
  } catch (e) {
    console.error('Export error:', e);
    showToast('⚠️ Export failed. Please try again.');
  } finally {
    hideLoading();
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

// ===== EVENT HANDLERS =====
function setupEvents() {
  // Top bar triggers
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

  // Campaign management triggers
  const openCampaignBtn = $('openCampaignModalBtn');
  if (openCampaignBtn) openCampaignBtn.addEventListener('click', openCampaignModal);

  const campaignModalClose = $('campaignModalClose');
  if (campaignModalClose) campaignModalClose.addEventListener('click', closeCampaignModal);

  const campaignModal = $('campaignModal');
  if (campaignModal) {
    campaignModal.addEventListener('click', e => {
      if (e.target === campaignModal) closeCampaignModal();
    });
  }

  const campaignEditForm = $('campaignEditForm');
  if (campaignEditForm) campaignEditForm.addEventListener('submit', saveCampaignFromForm);

  // Opt-out triggers
  const optOutBtn = $('optOutBtn');
  if (optOutBtn) optOutBtn.addEventListener('click', openOptOutModal);

  const optOutModalClose = $('optOutModalClose');
  if (optOutModalClose) optOutModalClose.addEventListener('click', closeOptOutModal);

  const cancelOptOutBtn = $('cancelOptOutBtn');
  if (cancelOptOutBtn) cancelOptOutBtn.addEventListener('click', closeOptOutModal);

  const confirmOptOutBtn = $('confirmOptOutBtn');
  if (confirmOptOutBtn) confirmOptOutBtn.addEventListener('click', confirmOptOut);

  // Bottom navigation
  const navCallBtn = $('navCallBtn');
  if (navCallBtn) navCallBtn.addEventListener('click', () => showView('callView'));

  const navSearchBtn = $('navSearchBtn');
  if (navSearchBtn) navSearchBtn.addEventListener('click', openLookupSheet);

  const navDashBtn = $('navDashBtn');
  if (navDashBtn) navDashBtn.addEventListener('click', () => showView('dashboardView'));

  const navFlyerBtn = $('navFlyerBtn');
  if (navFlyerBtn) navFlyerBtn.addEventListener('click', openFlyerModal);

  // Stats campaign select
  const statsCampaignSelect = $('statsCampaignSelect');
  if (statsCampaignSelect) {
    statsCampaignSelect.addEventListener('change', () => {
      APP._statsCampaignFilter = statsCampaignSelect.value;
      renderDashboard();
    });
  }

  // Login
  const loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('callerNameInput').value.trim();
      if (!name) return;

      APP.currentCaller = name;
      localStorage.setItem(STORAGE_KEY_CALLER, name);

      showLoading(`Claiming your contact for ${APP.activeCampaign ? APP.activeCampaign.name : 'Awakening'}...`);
      try {
        const result = await api({
          action: 'next',
          caller: name,
          campaign: APP.activeCampaign ? APP.activeCampaign.id : 'sunday-service'
        });
        APP.currentContact = result.contact;
        if (result.stats) {
          APP.totalContacts = result.stats.total;
          APP.calledCount = result.stats.called;
        }

        loadContactsCache();

        showView('mainView');
        renderCallerBar();
        renderActiveCampaign();
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

  // Logout
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

  // Script collapse toggle
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

  // Response buttons
  document.querySelectorAll('.response-btn[data-response]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      APP.selectedResponse = btn.dataset.response;

      const submitBtn = $('submitBtn');
      if (submitBtn) submitBtn.disabled = false;

      const branchBtn = document.querySelector(`.m-branch-btn[data-branch="${APP.selectedResponse}"]`);
      if (branchBtn) {
        document.querySelectorAll('.m-branch-btn').forEach(b => b.classList.remove('active'));
        branchBtn.classList.add('active');
        document.querySelectorAll('.m-branch-content').forEach(c => {
          c.classList.toggle('active-branch', c.dataset.branch === APP.selectedResponse);
        });
      }

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

  // SUBMIT & NEXT
  const submitBtn = $('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!APP.selectedResponse || !APP.currentContact) return;

      const contact = APP.currentContact;
      const response = APP.selectedResponse;
      let notes = $('notesInput') ? $('notesInput').value.trim() : '';

      const prayerInput = $('prayerRequestInput');
      if (prayerInput && prayerInput.value.trim()) {
        const prayerText = 'PRAYER: ' + prayerInput.value.trim();
        notes = notes ? (prayerText + ' | ' + notes) : prayerText;
      }

      const campId = APP.activeCampaign ? APP.activeCampaign.id : 'sunday-service';
      const campName = APP.activeCampaign ? APP.activeCampaign.name : '';

      // Demo Mode
      if (!API_URL) {
        const idx = APP.contacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) {
          APP.contacts[idx].status = response;
          APP.contacts[idx].calledBy = APP.currentCaller || 'Volunteer Demo';
          APP.contacts[idx].notes = notes;
          APP.contacts[idx].campaign = campId;
          APP.contacts[idx].calledAt = new Date().toISOString();
        }
        APP.calledCount = (APP.calledCount || 0) + 1;
        const nextContact = APP.contacts.find(c => !c.status) || null;
        APP.currentContact = nextContact;
        APP.selectedResponse = null;

        const emojis = { 'will-attend': '✅', 'unsure': '⏳', 'not-attend': '❌', 'no-answer': '📵' };
        showToast((emojis[response] || '✓') + ' Saved response for ' + contact.name);

        renderContactCard();
        renderProgress();
        return;
      }

      // Synchronous server claim via Google Sheets LockService
      // Guarantees no double calls to invitees per campaign!
      showLoading('Saving & getting next contact...');
      try {
        const result = await api({
          action: 'submit_next',
          row: contact.row,
          status: response,
          caller: APP.currentCaller,
          notes: notes,
          campaign: campId,
          campaignName: campName,
          timestamp: new Date().toISOString()
        });

        const idx = APP.contacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) {
          APP.contacts[idx].status = response;
          APP.contacts[idx].calledBy = APP.currentCaller;
          APP.contacts[idx].notes = notes;
          APP.contacts[idx].campaign = campId;
          APP.contacts[idx].calledAt = new Date().toISOString();
        }

        APP.currentContact = result.next || null;
        if (result.stats) {
          APP.totalContacts = result.stats.total;
          APP.calledCount = result.stats.called;
        }
        APP.selectedResponse = null;

        const emojis = { 'will-attend': '✅', 'unsure': '⏳', 'not-attend': '❌', 'no-answer': '📵' };
        showToast((emojis[response] || '✓') + ' Saved response for ' + contact.name);

        renderContactCard();
        renderProgress();
      } catch (err) {
        showToast('⚠️ Failed to save. Please try again.');
        console.error('Submit error:', err);
      } finally {
        hideLoading();
      }
    });
  }

  // SKIP
  const skipBtn = $('skipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', async () => {
      if (!APP.currentContact) return;

      const contact = APP.currentContact;
      const campId = APP.activeCampaign ? APP.activeCampaign.id : 'sunday-service';
      const campName = APP.activeCampaign ? APP.activeCampaign.name : '';

      // Demo Mode
      if (!API_URL) {
        const idx = APP.contacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) {
          APP.contacts[idx].status = 'no-answer';
          APP.contacts[idx].calledBy = APP.currentCaller || 'Volunteer Demo';
          APP.contacts[idx].notes = 'Skipped - will retry later';
          APP.contacts[idx].campaign = campId;
          APP.contacts[idx].calledAt = new Date().toISOString();
        }
        const nextContact = APP.contacts.find(c => !c.status) || null;
        APP.currentContact = nextContact;
        showToast('⏭️ Contact skipped for later');
        renderContactCard();
        renderProgress();
        return;
      }

      showLoading('Skipping & claiming next contact...');
      try {
        const result = await api({
          action: 'submit_next',
          row: contact.row,
          status: 'no-answer',
          caller: APP.currentCaller,
          notes: 'Skipped - will retry later',
          campaign: campId,
          campaignName: campName,
          timestamp: new Date().toISOString()
        });

        const idx = APP.contacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) {
          APP.contacts[idx].status = 'no-answer';
          APP.contacts[idx].calledBy = APP.currentCaller;
          APP.contacts[idx].notes = 'Skipped - will retry later';
          APP.contacts[idx].campaign = campId;
          APP.contacts[idx].calledAt = new Date().toISOString();
        }

        APP.currentContact = result.next || null;
        if (result.stats) {
          APP.totalContacts = result.stats.total;
          APP.calledCount = result.stats.called;
        }

        showToast('⏭️ Contact skipped for later');
        renderContactCard();
        renderProgress();
      } catch (err) {
        showToast('⚠️ Skip failed. Please try again.');
        console.error('Skip error:', err);
      } finally {
        hideLoading();
      }
    });
  }

  // Lookup modal
  const modalClose = $('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeLookupModal);

  const modalCancelBtn = $('modalCancelBtn');
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeLookupModal);

  const lookupSheetClose = $('lookupSheetClose');
  if (lookupSheetClose) lookupSheetClose.addEventListener('click', closeLookupSheet);

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
      const campId = APP.activeCampaign ? APP.activeCampaign.id : 'sunday-service';

      if (!API_URL) {
        contact.status = response;
        contact.calledBy = APP.currentCaller || 'Volunteer Demo';
        contact.notes = notes;
        contact.campaign = campId;
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
          campaign: campId,
          timestamp: new Date().toISOString()
        });

        contact.status = response;
        contact.calledBy = APP.currentCaller;
        contact.notes = notes;
        contact.campaign = campId;
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

  // Dashboard Filters & Search
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

  const exportBtn = $('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  setupLookup();
}

// ===== INITIALIZATION =====
async function init() {
  loadCampaigns();
  setupEvents();
  renderActiveCampaign();

  const caller = localStorage.getItem(STORAGE_KEY_CALLER);
  if (caller) {
    APP.currentCaller = caller;
    showLoading(`Welcome back! Loading calls for ${APP.activeCampaign ? APP.activeCampaign.name : 'Harvesters'}...`);
    try {
      const result = await api({
        action: 'next',
        caller: caller,
        campaign: APP.activeCampaign ? APP.activeCampaign.id : 'sunday-service'
      });
      APP.currentContact = result.contact;
      if (result.stats) {
        APP.totalContacts = result.stats.total;
        APP.calledCount = result.stats.called;
      }

      loadContactsCache();

      showView('mainView');
      renderCallerBar();
      renderActiveCampaign();
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

  APP.contacts = [
    { id: 1817, row: 1817, contactId: 'HB - 1816', name: 'Zainab Zubairu', firstName: 'Zainab', phone: '447512984120', status: null, calledBy: null },
    { id: 1816, row: 1816, contactId: 'HB - 1815', name: 'Victor Williams', firstName: 'Victor', phone: '447814529331', status: null, calledBy: null },
    { id: 1815, row: 1815, contactId: 'HB - 1814', name: 'Tolulope Vincent', firstName: 'Tolulope', phone: '447910248192', status: null, calledBy: null },
    { id: 1814, row: 1814, contactId: 'HB - 1813', name: 'Simisola Udoh', firstName: 'Simisola', phone: '447401928374', status: 'will-attend', calledBy: 'Volunteer Demo', campaign: 'sunday-service' },
    { id: 1813, row: 1813, contactId: 'HB - 1812', name: 'Samuel Thompson', firstName: 'Samuel', phone: '447384910293', status: 'unsure', calledBy: 'Sister Mary', campaign: 'sunday-service' }
  ];

  APP.currentContact = APP.contacts[0];

  APP._lastDashboardLog = [
    { id: 4, name: 'Rianat Abbas', phone: '447803507267', status: 'will-attend', calledBy: 'Volunteer Demo', campaign: 'sunday-service', notes: 'Attending with 2 friends', calledAt: new Date().toISOString() },
    { id: 5, name: 'Obomate Abbey', phone: '447407649117', status: 'unsure', calledBy: 'Sister Mary', campaign: 'sunday-service', notes: 'Checking work rota, call back Friday', calledAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 6, name: 'Yusra Abdulazeez', phone: '447437353244', status: 'will-attend', calledBy: 'Brother John', campaign: 'awakening-2026', notes: 'PRAYER: Family breakthrough', calledAt: new Date(Date.now() - 7200000).toISOString() }
  ];

  showView('mainView');
  renderCallerBar();
  renderActiveCampaign();
  renderContactCard();
  renderProgress();

  showToast('🚀 Preview Demo Mode Activated');
}
window.enableDemoMode = enableDemoMode;

// Boot
document.addEventListener('DOMContentLoaded', init);
