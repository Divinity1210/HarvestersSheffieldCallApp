// =================================================================
// HARVESTERS CROYDON – Member Outreach & Calling App
// Mobile-First Frontend Logic with Dynamic Campaign & Feedback Engine
// =================================================================

// ===== CONFIGURATION =====
// Default Croydon Google Apps Script Web App URL
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbyE3pdMRs4s3mDVTbECZURQyS_Q0rT2WP8_SRVYlqocOcj-24lG4BEnFdAxlY8zHQPncA/exec';
const OLD_BIRMINGHAM_URL = 'https://script.google.com/macros/s/AKfycbxQhZHOa5OfG7WM4460paNpZ1j96F4yGuNB97RFwPKcjMvhgMps28WcEet5UOuCQ80szA/exec';

const STORAGE_KEY_API_URL = 'harvesters_croydon_api_url';
const STORAGE_KEY_CALLER = 'harvesters_croydon_caller';
const STORAGE_KEY_CAMPAIGNS = 'harvesters_croydon_campaigns';
const STORAGE_KEY_ACTIVE_CAMPAIGN = 'harvesters_croydon_active_campaign';
const STORAGE_KEY_LOCAL_CALLS = 'harvesters_croydon_local_calls';

// Auto-migrate: If browser still holds the legacy Birmingham URL, point to Croydon
let initialApiUrl = localStorage.getItem(STORAGE_KEY_API_URL);
if (!initialApiUrl || initialApiUrl.includes('AKfycbxQhZHOa5OfG7WM4460paNpZ1j96F4yGuNB97RFwPKcjMvhgMps28WcEet5UOuCQ80szA')) {
  initialApiUrl = DEFAULT_API_URL;
  localStorage.setItem(STORAGE_KEY_API_URL, DEFAULT_API_URL);
}

// ===== DEFAULT CAMPAIGNS =====
const DEFAULT_CAMPAIGNS = [
  {
    id: 'sunday-service',
    name: 'Sunday Celebration Service',
    theme: 'Worship, Word & Miracles',
    venue: 'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR',
    dateTime: 'Every Sunday · 10:00 AM',
    parking: 'Free on-site parking available',
    mapUrl: 'https://maps.google.com/?q=The+Legacy+Centre+14+Imperial+Way+Croydon+CR0+4RR',
    scriptIntro: "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName}, and I’m calling from Harvesters Croydon. I hope you're having a blessed week!",
    theAsk: "We're having our Sunday Celebration Service this coming Sunday at 10:00 AM, and we would love for you to be with us. Will you be able to join us?",
    branchYes: "That is wonderful! We look forward to welcoming you. Feel free to come along with family and friends — parking is free on-site!",
    branchUnsure: "No problem at all, {FirstName}! I wanted to personally connect and let you know you're in our prayers. Can I send you the details on WhatsApp, and is there any prayer request we can stand with you in this week?",
    branchNo: "That is completely fine, {FirstName}! Thank you for your time. You can also join our livestream online, and we pray God blesses your week abundantly.",
    closing: "Thank you so much for your time, {FirstName}. Have a wonderful and victorious week, and God bless you!",
    whatsappTemplate: "Hi {FirstName}! 👋 This is {CallerName} from Harvesters Croydon.\n\nHere are the details for our Sunday Celebration Service:\n📍 The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR\n🗓️ This Sunday\n🕙 10:00 AM\n🚗 Free parking on-site\n\nWe look forward to seeing you! Let us know if you need transport assistance or prayer. Have a blessed week! 🙏",
    isActive: true
  },
  {
    id: 'member-care',
    name: 'Member Care & Welfare Check-in',
    theme: 'Pastoral Care & Prayer Support',
    venue: 'Harvesters Croydon Campus & Online',
    dateTime: 'Ongoing Church Care Outreach',
    parking: 'Croydon Campus & Pastoral Lines',
    mapUrl: 'https://maps.google.com/?q=Croydon+London',
    scriptIntro: "Hello {FirstName}, this is {CallerName} from Harvesters Croydon! I'm calling to check in on you, see how you are doing, and let you know the church family is thinking of you.",
    theAsk: "How has life, family, and work been with you recently? We'd love to know how the church can best support and pray for you right now.",
    branchYes: "Thank you so much for sharing, {FirstName}. It is well with you! I will record this note so our pastoral and prayer team can uphold you in prayer.",
    branchUnsure: "We understand, {FirstName}. Please remember our pastoral care team is always here for you whenever you need support or a listening ear.",
    branchNo: "Thank you for taking my call today, {FirstName}. May the peace and favor of God surround you and your household.",
    closing: "Thank you for your time, {FirstName}. God bless you richly!",
    whatsappTemplate: "Hi {FirstName}, this is {CallerName} from Harvesters Croydon. Just wanted to send some love and remind you that you are valued and prayed for! If there is ever anything you need prayer or support with, please reply right here. 🙏✨",
    isActive: false
  },
  {
    id: 'revival-encounter',
    name: 'Special Miracle & Word Encounter',
    theme: 'Breakthrough & Spiritual Renewal',
    venue: 'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR',
    dateTime: 'Special Weekend Gathering',
    parking: 'Free parking on-site and surrounding streets',
    mapUrl: 'https://maps.google.com/?q=The+Legacy+Centre+14+Imperial+Way+Croydon+CR0+4RR',
    scriptIntro: "Hello, may I speak with {FirstName}? Hi {FirstName}, my name is {CallerName} from Harvesters Croydon. We have a powerful upcoming Miracle Encounter gathering and wanted to specially invite you!",
    theAsk: "It is going to be an extraordinary time of breakthrough prayer, deep worship, and the supernatural word. Will you be able to make it?",
    branchYes: "Glory to God! We can't wait to see you there. Come with an expectation for a life-transforming encounter.",
    branchUnsure: "No worries at all! I'd love to send you the flyer and timings on WhatsApp so you have them in case your schedule opens up.",
    branchNo: "Understood, {FirstName}! We pray God's blessing and protection over you, and hope to see you at our upcoming weekly services.",
    closing: "Have a blessed day, {FirstName}, and God bless you richly!",
    whatsappTemplate: "Hi {FirstName}! 👋 Here are the details for our Miracle & Word Encounter at Harvesters Croydon:\n📍 The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR\n✨ Expect miracles, healing, and supernatural breakthrough!\nSee you there! 🔥",
    isActive: false
  }
];

// ===== APP STATE =====
let APP = {
  contacts: [],              // Full list of 490 Croydon members
  currentCaller: null,       // Logged in volunteer
  currentContact: null,      // Contact currently being called
  totalContacts: 490,
  calledCount: 0,
  selectedResponse: null,    // will-attend, unsure, not-attend, no-answer, wrong-number
  selectedTags: new Set(),   // Selected feedback category chips
  isPastoralFlagged: false,  // Urgent pastoral follow-up flag
  scriptExpanded: true,
  currentFilter: 'all',
  feedbackFilter: 'all',
  phoneRevealed: false,
  revealTimeout: null,
  lookupOpen: false,
  modalContact: null,
  modalSelectedResponse: null,
  _lastDashboardLog: null,
  _lastDashboardFeedbacks: null,

  // Campaign System
  campaigns: [],
  activeCampaign: null,

  // API Mode
  isLiveApi: false,
  apiUrl: initialApiUrl
};
window.APP = APP;

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
  if (!name) return 'HC';
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===== API CLIENT =====
async function api(params) {
  const apiUrl = APP.apiUrl;
  if (!apiUrl) throw new Error('API URL not configured');

  const url = new URL(apiUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    console.log('[Croydon API Request]', params.action, params);
    const resp = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    console.log('[Croydon API Response]', data);
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[Croydon API Error]', params.action, err);
    throw err;
  }
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
  // UK mobile without 0: 7... (10 digits)
  if (digits.startsWith('7') && digits.length === 10) {
    return '0' + digits.slice(0, 4) + ' ' + digits.slice(4);
  }
  // Nigeria international: 234... (13 digits)
  if (digits.startsWith('234') && digits.length >= 12) {
    return '+234 ' + digits.slice(3, 6) + ' ' + digits.slice(6, 9) + ' ' + digits.slice(9);
  }

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

  const firstName = (contactName || 'Member').split(/\s+/)[0];
  const callerName = APP.currentCaller || 'A church volunteer';
  const campaign = APP.activeCampaign || DEFAULT_CAMPAIGNS[0];

  let text = campaign.whatsappTemplate || DEFAULT_CAMPAIGNS[0].whatsappTemplate;
  text = text.replace(/{FirstName}/g, firstName)
             .replace(/{CallerName}/g, callerName)
             .replace(/{ChurchName}/g, 'Harvesters Croydon')
             .replace(/{Venue}/g, campaign.venue || '')
             .replace(/{DateTime}/g, campaign.dateTime || '');

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function getSmsHref(phone, contactName) {
  let digits = cleanDigits(phone);
  if (!digits) return '#';
  if (digits.startsWith('0')) {
    digits = '+44' + digits.slice(1);
  } else if (!digits.startsWith('+')) {
    digits = '+' + digits;
  }

  const firstName = (contactName || 'Member').split(/\s+/)[0];
  const callerName = APP.currentCaller || 'Harvesters Team';
  const campaign = APP.activeCampaign || DEFAULT_CAMPAIGNS[0];

  let text = campaign.whatsappTemplate || DEFAULT_CAMPAIGNS[0].whatsappTemplate;
  text = text.replace(/{FirstName}/g, firstName)
             .replace(/{CallerName}/g, callerName)
             .replace(/{ChurchName}/g, 'Harvesters Croydon')
             .replace(/{Venue}/g, campaign.venue || '')
             .replace(/{DateTime}/g, campaign.dateTime || '');

  const isIOS = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream;
  const separator = isIOS ? '&body=' : '?body=';
  return `sms:${digits}${separator}${encodeURIComponent(text)}`;
}


function toggleReveal(phone) {
  const phoneDisplay = $('phoneDisplay');
  const revealBtn = $('revealBtn');
  if (!phoneDisplay) return;

  APP.phoneRevealed = !APP.phoneRevealed;
  phoneDisplay.textContent = formatPhoneForDisplay(phone, APP.phoneRevealed);

  if (revealBtn) {
    revealBtn.innerHTML = APP.phoneRevealed ? '🔒 Hide' : '👁️ Reveal';
  }

  if (APP.phoneRevealed) {
    if (APP.revealTimeout) clearTimeout(APP.revealTimeout);
    APP.revealTimeout = setTimeout(() => {
      APP.phoneRevealed = false;
      if (phoneDisplay) phoneDisplay.textContent = formatPhoneForDisplay(phone, false);
      if (revealBtn) revealBtn.innerHTML = '👁️ Reveal';
    }, 15000); // Auto-hide after 15s for GDPR safety
  }
}
window.toggleReveal = toggleReveal;

function copyPhone(phone) {
  const digits = cleanDigits(phone);
  if (!digits) {
    showToast('No phone number available');
    return;
  }
  navigator.clipboard.writeText(digits).then(() => {
    showToast('✓ Copied: ' + digits);
  }).catch(() => {
    showToast('Number: ' + digits);
  });
}
window.copyPhone = copyPhone;

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
}

function saveCampaignsLocally() {
  localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(APP.campaigns));
  if (APP.activeCampaign) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CAMPAIGN, APP.activeCampaign.id);
  }
}

function selectActiveCampaign(campaignId) {
  const target = APP.campaigns.find(c => c.id === campaignId);
  if (!target) return;

  APP.campaigns.forEach(c => c.isActive = (c.id === campaignId));
  APP.activeCampaign = target;
  saveCampaignsLocally();

  renderActiveCampaign();
  renderContactCard();
  closeCampaignModal();
  showToast(`✓ Active campaign: ${target.name}`);

  // Sync to API if connected
  if (APP.isLiveApi) {
    api({ action: 'set_active_campaign', id: campaignId }).catch(console.error);
  }
}
window.selectActiveCampaign = selectActiveCampaign;


function renderScriptContent() {
  const campaign = APP.activeCampaign || DEFAULT_CAMPAIGNS[0];
  const contact = APP.currentContact;
  const firstName = contact ? (contact.firstName || (contact.name ? contact.name.split(/\s+/)[0] : 'Member')) : 'Member';
  const fullName = contact ? (contact.name || firstName) : 'Member';
  const callerName = APP.currentCaller || 'Harvesters Outreach Team';

  const formatText = (text) => {
    if (!text) return '';
    return text
      .replace(/{FirstName}/g, `<span class="highlight-name">${escapeHtml(firstName)}</span>`)
      .replace(/{Name}/g, `<span class="highlight-name">${escapeHtml(fullName)}</span>`)
      .replace(/{CallerName}/g, `<strong class="highlight-caller">${escapeHtml(callerName)}</strong>`)
      .replace(/{ChurchName}/g, '<strong>Harvesters Croydon</strong>')
      .replace(/{Venue}/g, escapeHtml(campaign.venue || 'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR'))
      .replace(/{DateTime}/g, escapeHtml(campaign.dateTime || 'Every Sunday · 10:00 AM'));
  };

  const scriptGreeting = $('scriptGreetingText');
  if (scriptGreeting) {
    scriptGreeting.innerHTML = `"Hello, may I speak with <span class="highlight-name" id="scriptContactName">${escapeHtml(firstName)}</span>?"`;
  }

  const scriptIntro = $('scriptIntroBody');
  if (scriptIntro) {
    const rawIntro = campaign.scriptIntro || DEFAULT_CAMPAIGNS[0].scriptIntro;
    scriptIntro.innerHTML = `"${formatText(rawIntro)}"`;
  }

  const scriptVenue = $('scriptVenueText');
  if (scriptVenue) scriptVenue.textContent = campaign.venue || 'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR';

  const scriptDateTime = $('scriptDateTimeText');
  if (scriptDateTime) scriptDateTime.textContent = campaign.dateTime || 'Every Sunday · 10:00 AM';

  const scriptParking = $('scriptParkingText');
  if (scriptParking) scriptParking.textContent = campaign.parking || 'Free on-site parking available';

  const scriptMapBtn = $('scriptMapBtn');
  if (scriptMapBtn) scriptMapBtn.href = campaign.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(campaign.venue || 'Croydon')}`;

  const scriptTheAsk = $('scriptTheAsk');
  if (scriptTheAsk) {
    const rawAsk = campaign.theAsk || DEFAULT_CAMPAIGNS[0].theAsk;
    scriptTheAsk.innerHTML = `"${formatText(rawAsk)}"`;
  }

  const branchYes = $('branchYesText');
  if (branchYes) {
    const rawYes = campaign.branchYes || DEFAULT_CAMPAIGNS[0].branchYes;
    branchYes.innerHTML = `<strong>If they say YES:</strong><br>"${formatText(rawYes)}"`;
  }

  const branchUnsure = $('branchUnsureText');
  if (branchUnsure) {
    const rawUnsure = campaign.branchUnsure || DEFAULT_CAMPAIGNS[0].branchUnsure;
    branchUnsure.innerHTML = `<strong>If they are UNSURE:</strong><br>"${formatText(rawUnsure)}"`;
  }

  const branchNo = $('branchNoText');
  if (branchNo) {
    const rawNo = campaign.branchNo || DEFAULT_CAMPAIGNS[0].branchNo;
    branchNo.innerHTML = `<strong>If they say NO:</strong><br>"${formatText(rawNo)}"`;
  }

  const scriptClosing = $('scriptClosingText');
  if (scriptClosing) {
    const rawClosing = campaign.closing || DEFAULT_CAMPAIGNS[0].closing;
    scriptClosing.innerHTML = `"${formatText(rawClosing)}"`;
  }
}
window.renderScriptContent = renderScriptContent;

function renderActiveCampaign() {
  const campaign = APP.activeCampaign || DEFAULT_CAMPAIGNS[0];

  // Update Top Banner
  const bannerName = $('activeCampaignName');
  if (bannerName) bannerName.textContent = campaign.name;
  const bannerTheme = $('activeCampaignTheme');
  if (bannerTheme) bannerTheme.textContent = `${campaign.theme || 'Church Outreach'} · ${campaign.venue || 'Croydon'}`;

  // Update Script Header
  const scriptTitle = $('scriptTitleHeader');
  if (scriptTitle) scriptTitle.textContent = `📋 Call Script (${campaign.name})`;

  // Update Script Content Dynamically
  renderScriptContent();

  const loggingTag = $('loggingCampaignTag');
  if (loggingTag) loggingTag.textContent = campaign.name;
}

// ===== SCRIPT BRANCH TAB SELECTION =====
function selectScriptBranch(branch) {
  document.querySelectorAll('.m-branch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.branch === branch);
  });
  document.querySelectorAll('.m-branch-content').forEach(c => {
    c.classList.toggle('active-branch', c.dataset.branch === branch);
  });
}
window.selectScriptBranch = selectScriptBranch;

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
          📍 ${escapeHtml(c.venue || 'Croydon')} · 🗓️ ${escapeHtml(c.dateTime || 'Sundays')}
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
  $('editCampaignVenue').value = 'The Legacy Centre, 14 Imperial Way, Croydon CR0 4RR';
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
    parking: 'Free parking on-site',
    mapUrl: `https://maps.google.com/?q=${encodeURIComponent($('editCampaignVenue').value.trim() || 'Croydon')}`,
    scriptIntro: $('editScriptIntro').value.trim(),
    theAsk: $('editTheAsk').value.trim(),
    branchYes: $('editBranchYes').value.trim(),
    branchUnsure: $('editBranchUnsure').value.trim(),
    branchNo: $('editBranchNo').value.trim(),
    closing: $('editClosing').value.trim(),
    whatsappTemplate: $('editWhatsAppTemplate').value.trim(),
    isActive: true
  };

  const existingIdx = APP.campaigns.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    APP.campaigns[existingIdx] = updated;
  } else {
    APP.campaigns.push(updated);
  }

  // Set as active
  APP.campaigns.forEach(c => c.isActive = (c.id === id));
  APP.activeCampaign = updated;
  saveCampaignsLocally();

  renderActiveCampaign();
  renderContactCard();
  closeCampaignModal();
  showToast('✓ Campaign & Script saved and applied!');

  // Sync to backend Google Sheet if connected
  if (APP.isLiveApi) {
    api({
      action: 'save_campaign',
      ...updated,
      isActive: 'true'
    }).catch(console.error);
  }
}

// ===== FEEDBACK RECORDING & QUICK TAGS =====
function toggleQuickTag(tag) {
  if (APP.selectedTags.has(tag)) {
    APP.selectedTags.delete(tag);
  } else {
    APP.selectedTags.add(tag);
  }

  // Update visual state of chips
  document.querySelectorAll('.m-tag-chip').forEach(chip => {
    const chipTag = (chip.dataset.tag || chip.textContent).trim();
    chip.classList.toggle('active', APP.selectedTags.has(chipTag));
  });

  // Prayer card toggle
  const prayerCard = $('prayerCard');
  if (prayerCard) {
    const isPrayer = APP.selectedTags.has('🙏 Prayer Request');
    prayerCard.classList.toggle('visible', isPrayer);
    if (isPrayer) {
      const input = $('prayerRequestInput');
      if (input) input.focus();
    }
  }
}
window.toggleQuickTag = toggleQuickTag;

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

    window.scrollTo(0, 0);

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

// ===== RENDER CALLER BAR & PROGRESS =====
function renderCallerBar() {
  const topAvatar = $('topAvatarBtn');
  if (topAvatar) topAvatar.textContent = getInitials(APP.currentCaller);

  const callerDisplay = $('callerDisplayName');
  if (callerDisplay) callerDisplay.textContent = APP.currentCaller || 'Volunteer';

  const scriptCaller = $('scriptCallerName');
  if (scriptCaller) scriptCaller.textContent = APP.currentCaller || 'A Volunteer';
}

function renderProgress() {
  const total = APP.totalContacts || APP.contacts.length || 490;
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

// ===== RENDER CONTACT CARD =====
function renderContactCard() {
  const area = $('contactArea');
  const responseArea = $('responseArea');
  APP.phoneRevealed = false;
  APP.selectedResponse = null;
  APP.selectedTags.clear();
  APP.isPastoralFlagged = false;

  // Reset form elements
  document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.m-tag-chip').forEach(c => c.classList.remove('active'));

  const submitBtn = $('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  const remarksInput = $('feedbackRemarksInput');
  if (remarksInput) remarksInput.value = '';

  const prayerCard = $('prayerCard');
  if (prayerCard) {
    prayerCard.classList.remove('visible');
    const prayerInput = $('prayerRequestInput');
    if (prayerInput) prayerInput.value = '';
  }

  const flagCheckbox = $('pastoralFlagCheckbox');
  if (flagCheckbox) flagCheckbox.checked = false;

  if (!APP.currentContact) {
    area.innerHTML = `
      <div class="m-contact-card" style="text-align:center;padding:36px 20px;">
        <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
        <h3 style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:6px;">All Croydon Members Reached!</h3>
        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;">Every contact on the member list has been called for this outreach. Check the Stats tab to view the results and member feedbacks.</p>
      </div>
    `;
    if (responseArea) responseArea.style.display = 'none';
    return;
  }

  const contact = APP.currentContact;
  const total = APP.totalContacts || APP.contacts.length || 490;
  const called = APP.calledCount || 0;

  const fullName = contact.name || 'Member';
  const firstName = contact.firstName || fullName.split(/\s+/)[0] || 'Member';
  const initials = getInitials(fullName);

  const telHref = getTelHref(contact.phone);
  const waHref = getWhatsAppHref(contact.phone, fullName);
  const smsHref = getSmsHref(contact.phone, fullName);

  area.innerHTML = `
    <div class="m-contact-card">
      <div class="m-contact-header">
        <div class="m-contact-avatar">${initials}</div>
        <div class="m-contact-identity">
          <div class="m-contact-num-badge">Member #${called + 1} of ${total} · ${escapeHtml(contact.contactId || 'HC')}</div>
          <div class="m-contact-name" title="${escapeHtml(fullName)}">${escapeHtml(fullName)}</div>
          ${contact.email ? `<div class="m-contact-email">✉️ ${escapeHtml(contact.email)}</div>` : ''}
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
          <a href="${smsHref}" class="m-sms-btn" id="smsBtn">
            ✉️ Send SMS
          </a>
        </div>
        <div style="margin-top:8px;">
          <button class="m-copy-btn" onclick="copyPhone('${escapeHtml(contact.phone)}')" style="width:100%;min-height:36px;font-size:0.75rem;">
            📋 Copy Number
          </button>
        </div>
      </div>
    </div>
  `;

  // Personalize script with member name & caller details dynamically
  renderScriptContent();

  if (responseArea) responseArea.style.display = 'block';
}

// ===== SUBMIT & NEXT LOGIC =====
async function submitCall(isSkip) {
  if (!APP.currentContact) return;

  const contact = APP.currentContact;
  const caller = APP.currentCaller || 'Volunteer';
  const campaignName = APP.activeCampaign ? APP.activeCampaign.name : 'Sunday Celebration Service';

  if (isSkip) {
    claimNextContactLocally(true);
    renderContactCard();
    renderProgress();
    showToast('Skipped to next member →');
    return;
  }

  if (!APP.selectedResponse) {
    showToast('Please select a response outcome');
    return;
  }

  // Compile formatted feedback notes
  const remarks = ($('feedbackRemarksInput') ? $('feedbackRemarksInput').value.trim() : '');
  const prayer = ($('prayerRequestInput') ? $('prayerRequestInput').value.trim() : '');
  const tags = Array.from(APP.selectedTags);
  const pastoralFlag = $('pastoralFlagCheckbox') ? $('pastoralFlagCheckbox').checked : false;

  let noteParts = [];
  if (remarks) noteParts.push(remarks);
  if (prayer) noteParts.push(`[Prayer: ${prayer}]`);
  if (tags.length > 0) noteParts.push(`[Tags: ${tags.join(', ')}]`);
  if (pastoralFlag) noteParts.push(`[⚠️ Flagged for Pastoral Care]`);

  const compiledNotes = noteParts.join(' | ');
  const timestamp = new Date().toISOString();

  showLoading('Saving member response & loading next...');

  // Update in local memory cache
  contact.status = APP.selectedResponse;
  contact.calledBy = caller;
  contact.notes = compiledNotes;
  contact.campaign = campaignName;
  contact.calledAt = timestamp;

  const idx = APP.contacts.findIndex(c => c.id === contact.id);
  if (idx >= 0) APP.contacts[idx] = contact;

  saveLocalCalls();

  // Try API submit
  let syncedToSheet = false;
  if (APP.apiUrl) {
    try {
      const result = await api({
        action: 'submit_next',
        row: contact.row || contact.id,
        status: APP.selectedResponse,
        caller: caller,
        notes: compiledNotes,
        campaign: campaignName,
        timestamp: timestamp
      });

      syncedToSheet = true;
      APP.isLiveApi = true;

      if (result.next) {
        APP.currentContact = result.next;
      } else {
        claimNextContactLocally(false);
      }

      if (result.stats) {
        APP.totalContacts = result.stats.total;
        APP.calledCount = result.stats.called;
      } else {
        updateStatsLocally();
      }

      showToast(`✓ Response saved to Google Sheet for ${contact.name}!`, 3500);
      renderContactCard();
      renderProgress();
      hideLoading();
      return;
    } catch (err) {
      console.error('API submit failed, fallback to local:', err);
      showToast(`⚠️ Google Sheet sync error: ${err.message}. Response saved locally!`, 5000);
    }
  }

  // Local fallback (if offline or API error)
  claimNextContactLocally(false);
  updateStatsLocally();
  if (!syncedToSheet && !APP.apiUrl) {
    showToast(`✓ Response recorded locally for ${contact.name}`);
  }
  renderContactCard();
  renderProgress();
  hideLoading();
}
window.submitCall = submitCall;

function claimNextContactLocally(skipCurrent) {
  const caller = APP.currentCaller || '';
  const currentId = APP.currentContact ? APP.currentContact.id : null;

  // Pass 1: find uncalled contact for caller from bottom upwards
  for (let i = APP.contacts.length - 1; i >= 0; i--) {
    const c = APP.contacts[i];
    if (skipCurrent && c.id === currentId) continue;
    if (!c.status && (!c.calledBy || c.calledBy.toLowerCase() === caller.toLowerCase())) {
      c.calledBy = caller;
      APP.currentContact = c;
      return;
    }
  }

  // Pass 2: find any unclaimed uncalled contact
  for (let i = APP.contacts.length - 1; i >= 0; i--) {
    const c = APP.contacts[i];
    if (skipCurrent && c.id === currentId) continue;
    if (!c.status && !c.calledBy) {
      c.calledBy = caller;
      APP.currentContact = c;
      return;
    }
  }

  // All finished
  APP.currentContact = null;
}
window.claimNextContactLocally = claimNextContactLocally;

function updateStatsLocally() {
  const total = APP.contacts.length;
  const called = APP.contacts.filter(c => !!c.status).length;
  APP.totalContacts = total;
  APP.calledCount = called;
}

function saveLocalCalls() {
  const logs = APP.contacts.filter(c => !!c.status);
  localStorage.setItem(STORAGE_KEY_LOCAL_CALLS, JSON.stringify(logs));
}

// ===== DASHBOARD & FEEDBACK INTELLIGENCE =====
async function renderDashboard() {
  const statsGrid = $('statsGrid');
  const donutSvg = $('donutSvgWrap');
  const chartLegend = $('chartLegend');
  const leaderboard = $('leaderboard');
  const feedbackList = $('feedbackList');
  const logList = $('logList');

  let dashboardData = null;

  if (APP.isLiveApi) {
    showLoading('Loading Croydon outreach analytics...');
    try {
      dashboardData = await api({ action: 'dashboard' });
    } catch (err) {
      console.warn('API dashboard fetch failed, rendering local analytics:', err);
    } finally {
      hideLoading();
    }
  }

  if (!dashboardData) {
    dashboardData = buildLocalDashboardData();
  }

  const stats = dashboardData.stats || {};
  APP._lastDashboardLog = dashboardData.log || [];
  APP._lastDashboardFeedbacks = dashboardData.feedbacks || [];

  // 1. KPI Cards
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="m-kpi-card">
        <div class="m-kpi-num">${stats.called || 0}</div>
        <div class="m-kpi-label">Calls Made (${Math.round((stats.called || 0) / (stats.total || 1) * 100)}%)</div>
      </div>
      <div class="m-kpi-card">
        <div class="m-kpi-num" style="color:var(--status-attend);">${stats.willAttend || 0}</div>
        <div class="m-kpi-label">Attending (Yes)</div>
      </div>
      <div class="m-kpi-card">
        <div class="m-kpi-num" style="color:var(--status-unsure);">${stats.unsure || 0}</div>
        <div class="m-kpi-label">Unsure / Call Back</div>
      </div>
      <div class="m-kpi-card">
        <div class="m-kpi-num" style="color:var(--accent-gold);">${dashboardData.feedbacks ? dashboardData.feedbacks.length : 0}</div>
        <div class="m-kpi-label">Feedbacks Logged</div>
      </div>
    `;
  }

  // 2. Donut Chart
  const totalCalled = stats.called || 0;
  if ($('totalCalled')) $('totalCalled').textContent = totalCalled;

  renderDonutChart(stats);

  // 3. Leaderboard
  if (leaderboard) {
    const callers = dashboardData.callers || {};
    const sorted = Object.entries(callers).sort((a, b) => b[1].total - a[1].total);

    if (sorted.length === 0) {
      leaderboard.innerHTML = `<div class="leaderboard-item" style="justify-content:center;color:var(--text-muted);font-size:0.85rem;padding:20px;">No calls logged yet</div>`;
    } else {
      leaderboard.innerHTML = sorted.map(([name, data], idx) => `
        <div class="leaderboard-item">
          <div class="leaderboard-rank">#${idx + 1}</div>
          <div class="leaderboard-name">${escapeHtml(name)}</div>
          <div class="leaderboard-counts">${data.total} calls (${data.willAttend} ✅)</div>
        </div>
      `).join('');
    }
  }

  // 4. Feedbacks Hub
  renderFeedbacksList(APP._lastDashboardFeedbacks);

  // 5. Activity Log
  renderCallLog(APP._lastDashboardLog);
}

function buildLocalDashboardData() {
  const total = APP.contacts.length || 490;
  let called = 0, willAttend = 0, notAttend = 0, unsure = 0, noAnswer = 0, wrongNumber = 0;
  const callerMap = {};
  const log = [];
  const feedbacks = [];

  APP.contacts.forEach(c => {
    if (!c.status) return;
    called++;

    const s = String(c.status).toLowerCase();
    if (s.includes('will') || s === 'yes') willAttend++;
    else if (s.includes('unsure') || s === 'tbc') unsure++;
    else if (s.includes('not') || s === 'no') notAttend++;
    else if (s.includes('wrong')) wrongNumber++;
    else noAnswer++;

    const caller = c.calledBy || 'Volunteer';
    if (!callerMap[caller]) callerMap[caller] = { total: 0, willAttend: 0, notAttend: 0, unsure: 0, noAnswer: 0 };
    callerMap[caller].total++;
    if (s.includes('will') || s === 'yes') callerMap[caller].willAttend++;

    const entry = {
      id: c.id,
      name: c.name,
      contactId: c.contactId,
      phone: c.phone,
      status: c.status,
      calledBy: caller,
      notes: c.notes || '',
      campaign: c.campaign || (APP.activeCampaign ? APP.activeCampaign.name : ''),
      calledAt: c.calledAt || new Date().toISOString()
    };

    log.push(entry);
    if (c.notes && c.notes.trim()) {
      feedbacks.push(entry);
    }
  });

  log.reverse();
  feedbacks.reverse();

  return {
    stats: {
      total: total,
      called: called,
      pending: Math.max(0, total - called),
      willAttend: willAttend,
      unsure: unsure,
      notAttend: notAttend,
      noAnswer: noAnswer,
      wrongNumber: wrongNumber
    },
    callers: callerMap,
    log: log,
    feedbacks: feedbacks
  };
}

function renderDonutChart(stats) {
  const wrap = $('donutSvgWrap');
  const legend = $('chartLegend');
  if (!wrap || !legend) return;

  const total = (stats.willAttend || 0) + (stats.unsure || 0) + (stats.notAttend || 0) + (stats.noAnswer || 0) + (stats.wrongNumber || 0);

  const data = [
    { label: 'Attending (Yes)', count: stats.willAttend || 0, color: '#10b981' },
    { label: 'Unsure', count: stats.unsure || 0, color: '#f59e0b' },
    { label: 'Not Attend', count: stats.notAttend || 0, color: '#ef4444' },
    { label: 'No Answer', count: stats.noAnswer || 0, color: '#6366f1' },
    { label: 'Wrong Number', count: stats.wrongNumber || 0, color: '#9ca3af' }
  ];

  legend.innerHTML = data.map(d => `
    <div class="m-legend-item">
      <div class="m-legend-dot" style="background:${d.color}"></div>
      <span>${d.label}: <strong>${d.count}</strong></span>
    </div>
  `).join('');

  if (total === 0) {
    wrap.innerHTML = `
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="56" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>
      </svg>
    `;
    return;
  }

  const radius = 56;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  const paths = data.map(d => {
    if (d.count === 0) return '';
    const slice = (d.count / total) * circ;
    const path = `
      <circle cx="75" cy="75" r="${radius}" fill="none" stroke="${d.color}" stroke-width="18"
              stroke-dasharray="${slice} ${circ - slice}" stroke-dashoffset="-${offset}"
              transform="rotate(-90 75 75)" style="transition: stroke-dasharray 0.5s ease;"/>
    `;
    offset += slice;
    return path;
  }).join('');

  wrap.innerHTML = `
    <svg width="150" height="150" viewBox="0 0 150 150">
      ${paths}
    </svg>
  `;
}

function renderFeedbacksList(feedbacks) {
  const container = $('feedbackList');
  if (!container) return;

  const filter = APP.feedbackFilter || 'all';
  const query = ($('feedbackSearch') ? $('feedbackSearch').value.toLowerCase().trim() : '');

  const filtered = (feedbacks || []).filter(item => {
    const text = (item.notes || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    if (query && !text.includes(query) && !name.includes(query)) return false;

    if (filter === 'prayer') return text.includes('prayer');
    if (filter === 'transport') return text.includes('transport') || text.includes('ride');
    if (filter === 'pastoral') return text.includes('pastoral') || text.includes('flag');
    if (filter === 'work') return text.includes('work') || text.includes('shift');
    if (filter === 'relocated') return text.includes('relocated') || text.includes('moved');
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">No feedbacks match the selected filter.</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="m-feedback-item">
      <div class="m-feedback-top">
        <div class="m-feedback-name">${escapeHtml(item.name)}</div>
        <div class="m-feedback-meta">${escapeHtml(item.calledBy || 'Volunteer')} · ${new Date(item.calledAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
      </div>
      <div style="font-size:0.72rem;color:var(--accent-amber);font-weight:700;margin-bottom:6px;">
        🏷️ ${escapeHtml(item.campaign || 'Campaign')} · Status: ${escapeHtml(item.status || 'Done')}
      </div>
      <div class="m-feedback-text">
        ${escapeHtml(item.notes)}
      </div>
    </div>
  `).join('');
}

function renderCallLog(log) {
  const list = $('logList');
  if (!list) return;

  const filter = APP.currentFilter || 'all';
  const query = ($('logSearch') ? $('logSearch').value.toLowerCase().trim() : '');

  const filtered = (log || []).filter(item => {
    const s = String(item.status || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const caller = String(item.calledBy || '').toLowerCase();
    const phone = String(item.phone || '').toLowerCase();

    if (query && !name.includes(query) && !caller.includes(query) && !phone.includes(query)) return false;

    if (filter === 'will-attend') return (s.includes('will') || s === 'yes');
    if (filter === 'unsure') return (s.includes('unsure') || s === 'tbc');
    if (filter === 'not-attend') return (s.includes('not') || s === 'no');
    if (filter === 'no-answer') return (!s.includes('will') && !s.includes('unsure') && !s.includes('not'));
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">No activity found.</div>`;
    return;
  }

  list.innerHTML = filtered.slice(0, 80).map(item => {
    let badgeClass = 'm-badge-no-answer';
    let label = 'No Answer';
    const s = String(item.status || '').toLowerCase();

    if (s.includes('will') || s === 'yes') {
      badgeClass = 'm-badge-will-attend';
      label = 'Attend';
    } else if (s.includes('unsure') || s === 'tbc') {
      badgeClass = 'm-badge-unsure';
      label = 'Unsure';
    } else if (s.includes('not') || s === 'no') {
      badgeClass = 'm-badge-not-attend';
      label = 'No';
    } else if (s.includes('wrong')) {
      badgeClass = 'm-badge-wrong-number';
      label = 'Wrong';
    }

    return `
      <div class="m-log-item">
        <div class="m-log-info">
          <div class="m-log-name">${escapeHtml(item.name)}</div>
          <div class="m-log-sub">By ${escapeHtml(item.calledBy || 'Volunteer')} · ${item.notes ? '💬 Notes recorded' : 'No notes'}</div>
        </div>
        <span class="m-badge ${badgeClass}">${label}</span>
      </div>
    `;
  }).join('');
}

// ===== EXPORT TO CSV =====
function exportCSV() {
  const log = APP._lastDashboardLog || APP.contacts.filter(c => !!c.status);
  if (!log || log.length === 0) {
    showToast('No calls to export yet');
    return;
  }

  const headers = ['Member Name', 'Phone', 'Call Status', 'Call Agent', 'Feedback & Notes', 'Campaign', 'Called At'];
  const rows = log.map(item => [
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${item.phone || ''}"`,
    `"${item.status || ''}"`,
    `"${(item.calledBy || '').replace(/"/g, '""')}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
    `"${(item.campaign || '').replace(/"/g, '""')}"`,
    `"${item.calledAt || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Harvesters_Croydon_Calls_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Calls CSV exported!');
}

function exportFeedbackCSV() {
  const feedbacks = APP._lastDashboardFeedbacks || APP.contacts.filter(c => !!c.notes);
  if (!feedbacks || feedbacks.length === 0) {
    showToast('No feedback recorded to export yet');
    return;
  }

  const headers = ['Member Name', 'Phone', 'Call Status', 'Call Agent', 'Member Feedback & Prayer Notes', 'Campaign', 'Called At'];
  const rows = feedbacks.map(item => [
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${item.phone || ''}"`,
    `"${item.status || ''}"`,
    `"${(item.calledBy || '').replace(/"/g, '""')}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
    `"${(item.campaign || '').replace(/"/g, '""')}"`,
    `"${item.calledAt || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Harvesters_Croydon_Member_Feedback_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Feedback Report exported!');
}

// ===== SEARCH / LOOKUP SHEET =====
function setupLookup() {
  const sheet = $('lookupSheet');
  const input = $('lookupInput');
  const results = $('lookupResults');
  const closeBtn = $('lookupSheetClose');

  if (closeBtn) closeBtn.addEventListener('click', () => sheet.classList.remove('active'));

  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (q.length < 2) {
        results.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">Type at least 2 characters to search across 490 Croydon members...</div>`;
        return;
      }

      const matches = APP.contacts.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      ).slice(0, 30);

      if (matches.length === 0) {
        results.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">No members found matching "${escapeHtml(q)}"</div>`;
        return;
      }

      results.innerHTML = matches.map(c => `
        <div class="m-sheet-item" onclick="openContactModal(${c.id})">
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#fff;">${escapeHtml(c.name)}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">
              ${maskPhone(c.phone)} · ${c.status ? `<span style="color:var(--accent-gold);font-weight:800;">${escapeHtml(c.status)}</span>` : 'Pending'}
            </div>
          </div>
          <span style="font-size:0.8rem;color:var(--accent-gold);">➔</span>
        </div>
      `).join('');
    });
  }
}

function openContactModal(contactId) {
  const contact = APP.contacts.find(c => c.id === contactId);
  if (!contact) return;

  APP.modalContact = contact;
  const overlay = $('lookupModalOverlay');
  if (!overlay) return;

  $('modalContactName').textContent = contact.name;
  $('modalContactPhone').textContent = formatPhoneForDisplay(contact.phone, true);
  $('modalCurrentStatus').innerHTML = `
    Status: <strong>${contact.status ? escapeHtml(contact.status) : 'Uncalled'}</strong>
    ${contact.calledBy ? ` · Agent: <strong>${escapeHtml(contact.calledBy)}</strong>` : ''}
    ${contact.campaign ? ` · Campaign: <strong>${escapeHtml(contact.campaign)}</strong>` : ''}
  `;
  $('modalNotesInput').value = contact.notes || '';

  APP.modalSelectedResponse = contact.status || null;
  document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.modalResponse === APP.modalSelectedResponse);
  });

  overlay.classList.add('active');
}
window.openContactModal = openContactModal;

function closeContactModal() {
  const overlay = $('lookupModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

// ===== API / GOOGLE SHEET SETTINGS MODAL =====
function openConfigModal() {
  const modal = $('configModal');
  if (!modal) return;

  const urlInput = $('apiUrlInput');
  if (urlInput) urlInput.value = APP.apiUrl || '';

  const badge = $('syncStatusBadge');
  if (badge) {
    if (APP.isLiveApi) {
      badge.textContent = '🟢 Connected to Google Apps Script Web App';
      badge.style.color = '#34d399';
    } else {
      badge.textContent = '🟡 Local Seed Mode (490 Croydon Members Loaded)';
      badge.style.color = '#fbbf24';
    }
  }

  modal.classList.add('active');
}

function closeConfigModal() {
  const modal = $('configModal');
  if (modal) modal.classList.remove('active');
}

async function saveApiConfig() {
  const urlInput = $('apiUrlInput');
  const url = (urlInput ? urlInput.value.trim() : '');

  if (!url) {
    showToast('Please enter a Web App URL');
    return;
  }

  showLoading('Testing connection to Harvesters Croydon API...');
  APP.apiUrl = url;
  localStorage.setItem(STORAGE_KEY_API_URL, url);

  try {
    const res = await api({ action: 'ping' });
    APP.isLiveApi = true;
    showToast('✓ ' + (res.message || 'Connected successfully!'));
    closeConfigModal();

    // Reload contacts from live sheet
    loadLiveContacts();
  } catch (err) {
    showToast('⚠️ Could not connect to API: ' + err.message);
    APP.isLiveApi = false;
  } finally {
    hideLoading();
  }
}

// ===== LOAD CONTACT DATA (SEED & LIVE) =====
async function loadSeedContacts() {
  try {
    const resp = await fetch('./croydon_contacts_seed.json');
    if (resp.ok) {
      APP.contacts = await resp.json();
      APP.totalContacts = APP.contacts.length;

      // Restore any local calls stored in localStorage
      const localCalls = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_CALLS) || '[]');
      localCalls.forEach(item => {
        const match = APP.contacts.find(c => c.id === item.id || (c.name === item.name && c.phone === item.phone));
        if (match) {
          match.status = item.status;
          match.calledBy = item.calledBy;
          match.notes = item.notes;
          match.campaign = item.campaign;
          match.calledAt = item.calledAt;
        }
      });

      updateStatsLocally();
      return true;
    }
  } catch (err) {
    console.warn('Seed load error:', err);
  }
  return false;
}

async function loadLiveContacts() {
  if (!APP.apiUrl) return;
  try {
    const res = await api({ action: 'contacts' });
    if (res.contacts && res.contacts.length > 0) {
      APP.contacts = res.contacts;
      APP.totalContacts = res.contacts.length;
      APP.isLiveApi = true;
      updateStatsLocally();
      renderProgress();
      renderContactCard();
    }
  } catch (err) {
    console.warn('Live contacts fetch failed:', err);
  }
}

// ===== EVENTS SETUP =====
function setupEvents() {
  // Login Form
  const loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('callerNameInput').value.trim();
      if (!name) return;

      APP.currentCaller = name;
      localStorage.setItem(STORAGE_KEY_CALLER, name);

      showLoading('Signing in volunteer...');

      // Try API claim
      if (APP.isLiveApi) {
        try {
          const res = await api({
            action: 'next',
            caller: name,
            campaign: APP.activeCampaign ? APP.activeCampaign.name : ''
          });
          if (res.contact) APP.currentContact = res.contact;
          if (res.stats) {
            APP.totalContacts = res.stats.total;
            APP.calledCount = res.stats.called;
          }
        } catch (err) {
          console.warn('Login next call failed:', err);
          claimNextContactLocally();
        }
      } else {
        claimNextContactLocally();
      }

      hideLoading();
      document.documentElement.classList.add('has-session');
      showView('mainView');
      renderCallerBar();
      renderActiveCampaign();
      renderContactCard();
      renderProgress();
    });
  }

  // Logout
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      APP.currentCaller = null;
      localStorage.removeItem(STORAGE_KEY_CALLER);
      document.documentElement.classList.remove('has-session');
      showView('loginView');
      showToast('Signed out');
    });
  }

  // Bottom Navigation
  document.querySelectorAll('.m-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const navTarget = btn.dataset.nav;
      if (navTarget === 'searchSheet') {
        const sheet = $('lookupSheet');
        if (sheet) sheet.classList.add('active');
        const input = $('lookupInput');
        if (input) input.focus();
        return;
      }
      if (navTarget === 'campaignModal') {
        openCampaignModal();
        return;
      }
      if (navTarget === 'flyerModal') {
        openFlyerModal();
        return;
      }
      showView(navTarget);
    });
  });

  // Campaign Buttons
  const openCampBtn = $('openCampaignModalBtn');
  if (openCampBtn) openCampBtn.addEventListener('click', openCampaignModal);
  const closeCampBtn = $('campaignModalClose');
  if (closeCampBtn) closeCampBtn.addEventListener('click', closeCampaignModal);
  const campForm = $('campaignEditForm');
  if (campForm) campForm.addEventListener('submit', saveCampaignFromForm);

  // Config Modal
  const configBtn = $('topConfigBtn');
  if (configBtn) configBtn.addEventListener('click', openConfigModal);
  const closeConfig = $('configModalClose');
  if (closeConfig) closeConfig.addEventListener('click', closeConfigModal);
  const saveApi = $('saveApiBtn');
  if (saveApi) saveApi.addEventListener('click', saveApiConfig);
  const resetApi = $('resetApiBtn');
  if (resetApi) {
    resetApi.addEventListener('click', () => {
      APP.isLiveApi = false;
      localStorage.removeItem(STORAGE_KEY_API_URL);
      closeConfigModal();
      showToast('Switched to local seed mode');
    });
  }

  // Flyer Modals
  const topFlyer = $('topFlyerBtn');
  if (topFlyer) topFlyer.addEventListener('click', openFlyerModal);
  const loginFlyer = $('loginFlyerTrigger');
  if (loginFlyer) loginFlyer.addEventListener('click', openFlyerModal);
  const flyerClose = $('flyerCloseBtn');
  if (flyerClose) flyerClose.addEventListener('click', closeFlyerModal);

  // Script Toggle
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

  // Quick Feedback Tag Chips click listeners
  document.querySelectorAll('.m-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = (chip.dataset.tag || chip.textContent).trim();
      toggleQuickTag(tag);
    });
  });

  // Modal & Sheet Backdrop dismissals
  const lookupSheet = $('lookupSheet');
  if (lookupSheet) {
    lookupSheet.addEventListener('click', (e) => {
      if (e.target === lookupSheet) lookupSheet.classList.remove('active');
    });
  }

  const lookupModalOverlay = $('lookupModalOverlay');
  if (lookupModalOverlay) {
    lookupModalOverlay.addEventListener('click', (e) => {
      if (e.target === lookupModalOverlay) closeContactModal();
    });
  }

  const campaignModal = $('campaignModal');
  if (campaignModal) {
    campaignModal.addEventListener('click', (e) => {
      if (e.target === campaignModal) closeCampaignModal();
    });
  }

  const configModal = $('configModal');
  if (configModal) {
    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) closeConfigModal();
    });
  }

  const flyerModal = $('flyerModal');
  if (flyerModal) {
    flyerModal.addEventListener('click', (e) => {
      if (e.target === flyerModal) closeFlyerModal();
    });
  }

  // Escape key closes open modals/sheets
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lookupSheet && lookupSheet.classList.contains('active')) lookupSheet.classList.remove('active');
      if (lookupModalOverlay && lookupModalOverlay.classList.contains('active')) closeContactModal();
      if (campaignModal && campaignModal.classList.contains('active')) closeCampaignModal();
      if (configModal && configModal.classList.contains('active')) closeConfigModal();
      if (flyerModal && flyerModal.classList.contains('active')) closeFlyerModal();
    }
  });

  // Response Buttons (Outcome Selection)
  document.querySelectorAll('.response-btn[data-response]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.response-btn[data-response]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      APP.selectedResponse = btn.dataset.response;

      const submitBtn = $('submitBtn');
      if (submitBtn) submitBtn.disabled = false;

      // Sync branch script tab
      if (APP.selectedResponse === 'will-attend') selectScriptBranch('will-attend');
      else if (APP.selectedResponse === 'unsure') selectScriptBranch('unsure');
      else if (APP.selectedResponse === 'not-attend') selectScriptBranch('not-attend');
    });
  });

  // Submit & Skip Buttons
  const submitBtn = $('submitBtn');
  if (submitBtn) submitBtn.addEventListener('click', () => submitCall(false));
  const skipBtn = $('skipBtn');
  if (skipBtn) skipBtn.addEventListener('click', () => submitCall(true));

  // Modal Contact Submit
  const modalSubmit = $('modalSubmitBtn');
  if (modalSubmit) {
    modalSubmit.addEventListener('click', () => {
      if (!APP.modalContact || !APP.modalSelectedResponse) {
        showToast('Please select a response');
        return;
      }
      const contact = APP.modalContact;
      contact.status = APP.modalSelectedResponse;
      contact.notes = ($('modalNotesInput') ? $('modalNotesInput').value.trim() : '');
      contact.calledBy = APP.currentCaller || 'Volunteer';
      contact.calledAt = new Date().toISOString();
      contact.campaign = APP.activeCampaign ? APP.activeCampaign.name : '';

      const idx = APP.contacts.findIndex(c => c.id === contact.id);
      if (idx >= 0) APP.contacts[idx] = contact;

      saveLocalCalls();
      updateStatsLocally();
      renderProgress();
      if (APP.currentContact && APP.currentContact.id === contact.id) {
        APP.currentContact = contact;
        renderContactCard();
      }
      const dv = $('dashboardView');
      if (dv && dv.classList.contains('active')) {
        renderDashboard();
      }
      const lookupInput = $('lookupInput');
      if (lookupInput && lookupInput.value.trim().length >= 2) {
        lookupInput.dispatchEvent(new Event('input'));
      }
      closeContactModal();

      if (APP.apiUrl) {
        showLoading(`Saving ${contact.name} to Google Sheet...`);
        api({
          action: 'submit',
          row: contact.row || contact.id,
          status: contact.status,
          caller: contact.calledBy,
          notes: contact.notes,
          campaign: contact.campaign,
          timestamp: contact.calledAt
        }).then(() => {
          APP.isLiveApi = true;
          showToast(`✓ Synced update for ${contact.name} to Google Sheet!`, 3500);
        }).catch(err => {
          console.error('Modal API submit failed:', err);
          showToast(`⚠️ Updated locally. Sheet sync failed: ${err.message}`, 5000);
        }).finally(() => {
          hideLoading();
        });
      } else {
        showToast(`✓ Updated ${contact.name} locally`);
      }
    });
  }

  const modalCancel = $('modalCancelBtn');
  if (modalCancel) modalCancel.addEventListener('click', closeContactModal);
  const modalClose = $('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeContactModal);

  document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#lookupModalOverlay .response-btn').forEach(btn => btn.classList.remove('selected'));
      b.classList.add('selected');
      APP.modalSelectedResponse = b.dataset.modalResponse;
    });
  });

  // Dashboard Filters & Exports
  document.querySelectorAll('#logFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#logFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      APP.currentFilter = chip.dataset.filter;
      if (APP._lastDashboardLog) renderCallLog(APP._lastDashboardLog);
    });
  });

  document.querySelectorAll('#feedbackFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#feedbackFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      APP.feedbackFilter = chip.dataset.feedbackFilter;
      if (APP._lastDashboardFeedbacks) renderFeedbacksList(APP._lastDashboardFeedbacks);
    });
  });

  const feedbackSearch = $('feedbackSearch');
  if (feedbackSearch) {
    feedbackSearch.addEventListener('input', () => {
      if (APP._lastDashboardFeedbacks) renderFeedbacksList(APP._lastDashboardFeedbacks);
    });
  }

  const logSearch = $('logSearch');
  if (logSearch) {
    logSearch.addEventListener('input', () => {
      if (APP._lastDashboardLog) renderCallLog(APP._lastDashboardLog);
    });
  }

  const exportBtn = $('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  const exportFeedbackBtn = $('exportFeedbackBtn');
  if (exportFeedbackBtn) exportFeedbackBtn.addEventListener('click', exportFeedbackCSV);

  setupLookup();
}

// ===== DEMO MODE =====
function enableDemoMode() {
  APP.currentCaller = 'Sister Mary (Demo)';
  document.documentElement.classList.add('has-session');
  claimNextContactLocally();
  showView('mainView');
  renderCallerBar();
  renderActiveCampaign();
  renderContactCard();
  renderProgress();
  showToast('🚀 Preview Demo Mode (490 Members Active)');
}
window.enableDemoMode = enableDemoMode;

// ===== INITIALIZATION =====
async function init() {
  loadCampaigns();
  setupEvents();

  // Load Seed Contacts (490 Croydon members)
  await loadSeedContacts();

  // Check API health
  if (APP.apiUrl) {
    api({ action: 'ping' }).then(res => {
      APP.isLiveApi = true;
      console.log('API Connected:', res);
      loadLiveContacts();
    }).catch(err => {
      APP.isLiveApi = false;
      console.log('Using local seed contacts');
    });
  }

  // Auto-login returning caller
  const caller = localStorage.getItem(STORAGE_KEY_CALLER);
  if (caller) {
    APP.currentCaller = caller;
    claimNextContactLocally();
    showView('mainView');
    renderCallerBar();
    renderActiveCampaign();
    renderContactCard();
    renderProgress();
  }
}

document.addEventListener('DOMContentLoaded', init);
