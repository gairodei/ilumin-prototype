/* Illumin Academy learner portal prototype — core: helpers, state, router, shell, auth, demo controls. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Time (fixed "today" so the mock data stays coherent) ---------- */
const BOOT = Date.now();
const NOW = new Date('2026-10-04T08:15:00Z');
const DAY = 864e5;
const now = () => new Date(NOW.getTime() + (Date.now() - BOOT));
// D(days, 'HH:MM[:SS]') → ISO string, time given in UTC
const D = (days, hm = '09:00') => { const [h, m, s] = hm.split(':').map(Number); return new Date(Date.UTC(2026, 9, 4 + days, h, m, s || 0)).toISOString(); };

// Every date shows in the viewer's local time: staff portals (admin, coordinator, teacher/assessor) and public pages use the
// browser's own zone; learners see their country's zone; agencies see their own zone.
// The browser's zone is read once (Intl lookups are slow and dates are formatted thousands of times per page).
const VIEWER_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'; } catch (e) { return 'Europe/London'; } })();
const viewerTZ = () => VIEWER_TZ;
const curTZ = () => /^(v-|w-)/.test(S.route || '') ? VIEWER_TZ : ['coord', 'staff', 'admin'].includes(S.portal) ? VIEWER_TZ : S.portal === 'agency' && typeof AGY_TZ === 'function' ? AGY_TZ() : W.me.tz;
// Formatters are reused per zone + options (building an Intl.DateTimeFormat costs as much as ~50 formats)
const DTF_CACHE = new Map();
const dtf = o => { const k = JSON.stringify(o); let f = DTF_CACHE.get(k); if (!f) { f = new Intl.DateTimeFormat('en-GB', o); DTF_CACHE.set(k, f); } return f; };
// House style "14 Oct 2026": fixed three-letter months (the browser's en-GB gives "Sept")
const fmt = (iso, o) => dtf({ timeZone: curTZ(), ...o }).format(new Date(iso)).replace(/\bSept\b/, 'Sep');
function tzl(iso) {
  const p = dtf({ timeZone: curTZ(), timeZoneName: 'short' }).formatToParts(new Date(iso || now())).find(x => x.type === 'timeZoneName');
  const v = p ? p.value : '';
  return v === 'GMT+4' ? 'GST' : v === 'GMT+5:30' ? 'IST' : v === 'GMT+0' ? 'GMT' : v; // UK winter: "GMT" (some browsers give "GMT+0")
}
const fd = iso => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });
const fdl = iso => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fds = iso => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
const ft = iso => fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ' + tzl(iso);
const fts = iso => fmt(iso, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' (' + tzl(iso) + ')';
const fdt = iso => fd(iso) + ', ' + ft(iso);
const daysTo = iso => Math.ceil((new Date(iso) - now()) / DAY);
// Overdue days are whole calendar days in the learner's own time zone (their country), not elapsed hours
const COUNTRY_TZ = { 'United Kingdom': 'Europe/London', 'United Arab Emirates': 'Asia/Dubai', India: 'Asia/Kolkata' };
const tzOfLearner = l => (l && (l.tz || COUNTRY_TZ[l.country] || (l.region === 'UAE' ? 'Asia/Dubai' : null))) || 'Europe/London';
const localYmd = (iso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const workDaysSince = iso => { const d = new Date(iso); d.setUTCHours(0, 0, 0, 0); const end = new Date(now()); end.setUTCHours(0, 0, 0, 0); let n = 0; while (d < end) { d.setUTCDate(d.getUTCDate() + 1); const g = d.getUTCDay(); if (g !== 0 && g !== 6) n++; } return n; };
const calDaysLate = (iso, tz) => Math.round((Date.parse(localYmd(now().toISOString(), tz)) - Date.parse(localYmd(iso, tz))) / DAY);
function rel(iso) {
  const ms = new Date(iso) - now(), d = Math.round(ms / DAY);
  if (Math.abs(ms) < 36e5) { const m = Math.round(ms / 6e4); return m >= 0 ? `in ${m} min` : `${-m} min ago`; }
  if (d === 0) return ms > 0 ? 'later today' : 'today';
  if (d === 1) return 'tomorrow'; if (d === -1) return 'yesterday';
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}
const money = (n, cur) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur || W.me.cur }).format(n);
function cdown(ms) {
  if (ms <= 0) return '0d 00:00:00';
  const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;

/* ---------- Icons ---------- */
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13v-3M8 7h7',
  clip: 'M9 3h6v4H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  chart: 'M4 20V11M10 20V4M16 20v-7M2 20h20',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  cal: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  checksq: 'M4 4h16v16H4zM8 12l3 3 5-6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14L7 22l5-3 5 3-1.5-8',
  msg: 'M4 5h16v11H9l-5 4z',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  pkg: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  pin: 'M12 17v5M5 17h14l-2-4V4H7v9z',
  map: 'M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  wifioff: 'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M12 20h.01M5 12.5a10 10 0 0 1 5-2.4M19 12.5a10 10 0 0 0-2-1.5M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  clip2: 'M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  zoom: 'M3 7h12v10H3zM15 11l6-4v10l-6-4',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  plus: 'M12 5v14M5 12h14',
  building: 'M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01',
  key: 'M14 10a5 5 0 1 0-4.6 5H11v2h2v2h3v-3l-2-2.1A5 5 0 0 0 14 10zM8 10h.01',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  phone: 'M5 3h14v18H5zM10 18h4',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  flag: 'M5 21V4h11l-2 4 2 4H5',
};
function ic(n, s = 18, extra = '') {
  const sw = n === 'more' ? 3 : 1.8;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}><path d="${ICONS[n] || ICONS.info}"/></svg>`;
}
const LOGO = `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#2563EB"/><circle cx="17" cy="21" r="7" fill="#FFFFFF"/><path d="M17 5v5M8 9l3 3.5M26 9l-3 3.5M5 17h4M25 17h4" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/><rect x="6" y="21" width="22" height="7" fill="#2563EB"/><path d="M8 24h18" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;

/* ---------- Status vocabulary (identical wording everywhere) ---------- */
const TONE = {
  'Not Started': 'grey', 'In Progress': 'blue', 'Action Required': 'redor', 'Added to PD': 'purple', 'Achieved': 'green',
  'Payment Pending': 'amber', 'Active': 'blue', 'Completed': 'green', 'Expired-Incomplete': 'redor', 'Discontinued': 'red', 'Expired': 'grey',
  'Not opened': 'grey', 'Opened': 'blue', 'New': 'teal', 'Locked': 'grey',
  'Submitted': 'blue', 'Under Review': 'purple', 'Feedback Received': 'teal', 'Resubmission Required': 'red', 'Marked': 'green',
  'Pending — Documents Required': 'amber', 'Approved': 'green', 'Rejected': 'red', 'Withdrawn': 'grey', 'Pending': 'amber', 'Waitlisted': 'amber',
  'Permission Pending': 'amber', 'Granted': 'green', 'Declined': 'red', 'Not entered': 'grey',
  'Proposed': 'amber', 'Confirmed': 'blue', 'Cancelled': 'red', 'Rescheduled': 'purple',
  'Present': 'green', 'Late': 'amber', 'Partial': 'redor', 'Absent': 'red',
  'Paid': 'green', 'Overdue': 'red', 'Partially paid': 'amber', 'Refunded': 'purple', 'Failed': 'red', 'Succeeded': 'green',
  'Valid': 'green', 'Expiring soon': 'amber', 'Revoked': 'red', 'Processing': 'blue', 'Superseded': 'grey',
  'Requested': 'amber', 'Re-purchase Required': 'redor',
  'Open': 'purple', 'Returned to Action Required': 'redor',
  'Pass': 'green', 'Fail': 'red', 'Done': 'green', 'To do': 'grey',
  'Observed': 'green', 'Not Yet Observed': 'grey', 'Competent': 'green', 'Not Yet Competent': 'redor',
};
const GLYPH = { green: '✓', red: '✕', redor: '!', amber: '!', blue: '◐', grey: '○', purple: '◆', teal: '●' };
function chip(label, tone) { tone = tone || TONE[label] || 'grey'; return `<span class="chip t-${tone}"><span class="chip-i" aria-hidden="true">${GLYPH[tone] || '●'}</span>${esc(label)}</span>`; }
const FIVE = [['Not Started', 'grey', 'No evidence submitted yet'], ['In Progress', 'blue', 'Evidence submitted or observation planned, not yet judged'], ['Action Required', 'redor', 'Assessor needs more evidence or rework from you'], ['Added to PD', 'purple', 'Will be covered in your Professional Discussion — no rework needed'], ['Achieved', 'green', 'Criterion met and signed off']];
const RAGL = { R: 'Not met', A: 'Partially met', G: 'Met' };
const rag = r => `<span class="rag rag-${r}"><span aria-hidden="true">${ic(r === 'G' ? 'check' : r === 'R' ? 'x' : 'alert', 12)}</span>${RAGL[r]}</span>`;
// One placeholder-tag style and tooltip for every open client item (the visible text never changes)
const TBD_TIP = 'Waiting on the client — content or behaviour may change.';
const tbd = (code) => `<span class="tbd" title="${TBD_TIP}">TBD – pending client confirmation${code ? ' · ' + code : ''}</span>`;
function bar(p, label, cls = '') { return `<div class="bar-row"><div class="bar ${cls}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label || 'Progress')}"><span style="width:${Math.max(0, Math.min(100, p))}%"></span></div><span class="small strong num">${p}%</span></div>`; }
function fiveBar(c, cls = '') {
  const tot = FIVE.reduce((a, [k]) => a + (c[k] || 0), 0) || 1;
  const t = FIVE.map(([k]) => `${k}: ${c[k] || 0}`).join(', ');
  return `<div class="five ${cls}" role="img" aria-label="${t}">${FIVE.map(([k, tone]) => c[k] ? `<span class="f-${tone}" style="width:${c[k] / tot * 100}%"></span>` : '').join('')}</div>`;
}
const fiveLegend = (c, full) => `<div class="five-legend">${FIVE.map(([k]) => `${chip(k + (c ? ` · ${c[k] || 0}` : ''), TONE[k])}`).join('')}</div>`;
// S3-06: assessment types are configurable (setup-s3.js replaces these): the name shown, the types offered, and the rule a type follows
let critTypeLabel = t => t === 'Knowledge' ? 'Knowledge' : 'Observation / Competency';
let critTypeNames = cur => ['Knowledge', 'Observation'];
let critKind = t => t;
const critType = t => `<span class="crit-type" title="Assessment type inherited from the Learning Outcome">${esc(critTypeLabel(t))}</span>`;
function qr(seed, size = 76) {
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = 21; let r = '';
  const fp = (x, y) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let on;
    if (fp(x, y)) { const lx = x > 13 ? x - 14 : x, ly = y > 13 ? y - 14 : y; on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx > 1 && lx < 5 && ly > 1 && ly < 5); }
    else { h = (h * 1103515245 + 12345) >>> 0; on = (h >> 16) & 1; }
    if (on) r += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg class="qr" width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" role="img" aria-label="QR code for verification" shape-rendering="crispEdges"><path d="${r}" fill="#111"/></svg>`;
}

/* ---------- State ---------- */
const S = {
  signedIn: false, auth: 'signin', authMsg: null, failCount: 0, authEmail: '',
  variant: 'C', edge: 'none', route: 'dashboard', params: {}, returnTo: null,
  menu: null, drawer: false, demoOpen: false, offline: false, serverError: false, saveFail: false,
  role: 'Learner', theme: 'system', frame: 'auto', ui: {},
};
let W = null;
const SCREENS = {};
const ACT = {};
const INP = {};
const TIMERS = {};
function timer(k, fn, ms, repeat = true) { clearTimer(k); TIMERS[k] = { id: repeat ? setInterval(fn, ms) : setTimeout(fn, ms), repeat }; }
function clearTimer(k) { const t = TIMERS[k]; if (t) { t.repeat ? clearInterval(t.id) : clearTimeout(t.id); delete TIMERS[k]; } }
const ui = (k, d) => (S.ui[k] === undefined ? d : S.ui[k]);
const setUi = (k, v) => { S.ui[k] = v; };

/* ---------- Toast / modal ---------- */
function toast(msg, tone = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + tone;
  el.innerHTML = ic(tone === 'err' ? 'alert' : tone === 'info' ? 'info' : 'check', 18) + `<div>${msg}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
let MODAL = null;
function openModal(m) { if (!MODAL) m.prevFocus = document.activeElement; else m.prevFocus = MODAL.prevFocus; MODAL = { dismissable: true, actions: [], ...m }; renderModal(); }
function renderModal() {
  const root = $('#modal-root');
  if (!MODAL) { root.innerHTML = ''; return; }
  const m = MODAL;
  root.innerHTML = `<div class="scrim" data-act="modalScrim"></div>
  <div class="modal ${m.size || ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-h"><div class="stack" style="gap:4px"><h2 id="modal-title">${m.title}</h2>${m.sub ? `<p class="small muted">${m.sub}</p>` : ''}</div>
    ${m.dismissable ? `<button class="icon-btn" data-act="modalClose" aria-label="Close dialog">${ic('x')}</button>` : ''}</div>
    <div class="modal-b">${m.body}</div>
    ${m.actions.length ? `<div class="modal-f">${m.actions.map((a, i) => `<button class="btn ${a.cls || 'btn-ghost'}" data-mi="${i}" ${a.disabled ? 'disabled' : ''} ${a.id ? `id="${a.id}"` : ''}>${a.label}</button>`).join('')}</div>` : ''}
  </div>`;
  const f = root.querySelector('[autofocus]') || root.querySelector('.modal-b input, .modal-b textarea, .modal-b select') || root.querySelector('.modal-f .btn:last-child') || root.querySelector('.modal');
  setTimeout(() => f && f.focus(), 0);
  if (m.onOpen) m.onOpen(root.querySelector('.modal'));
}
function closeModal() { const m = MODAL; MODAL = null; renderModal(); if (m && m.onClose) m.onClose(); if (m && m.prevFocus && document.contains(m.prevFocus)) m.prevFocus.focus(); }
function confirmDlg({ title, body, ok = 'Confirm', danger, onOk, cancel = 'Cancel' }) {
  openModal({ title, body, actions: [{ label: cancel, cls: 'btn-ghost' }, { label: ok, cls: danger ? 'btn-danger' : 'btn-primary', fn: onOk }] });
}
const mval = (sel) => { const el = $('#modal-root ' + sel); return el ? el.value.trim() : ''; };
function fieldErr(sel, msg) {
  const el = $(sel); if (!el) return;
  el.setAttribute('aria-invalid', 'true');
  const f = el.closest('.field'); if (f && !f.querySelector('.err')) f.insertAdjacentHTML('beforeend', `<span class="err" role="alert">${ic('alert', 14)}${msg}</span>`);
  el.focus();
}

/* ---------- Router ---------- */
const SECTION = { course: 'courses', quiz: 'courses', assignment: 'assignments', thread: 'messages' };
function routeTok(r, p = {}) { const parts = [r, p.id || '', p.tab || '']; while (parts.length > 1 && !parts[parts.length - 1]) parts.pop(); return parts.join('.'); }
function setRoute(tok) { const [r, id, tab] = (tok || 'dashboard').split('.'); S.route = r || 'dashboard'; S.params = { id: id || undefined, tab: tab || undefined }; }
function go(route, params = {}) {
  S.menu = null; S.drawer = false;
  setRoute(routeTok(route, params));
  try { history.pushState(null, '', '#' + routeTok(route, params)); } catch (e) { /* sandboxed */ }
  render(); window.scrollTo(0, 0);
  const h = $('#main h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
window.addEventListener('popstate', () => { setRoute(location.hash.slice(1)); render(); });

/* ---------- Navigation model ---------- */
const NAV = [
  ['dashboard', 'Dashboard', 'home'], ['courses', 'My Courses', 'book'], ['admission', 'Admission & Documents', 'clip', 1],
  ['assignments', 'Assignments', 'edit', 1], ['progress', 'Progress & Gap Analysis', 'chart', 1], ['observations', 'Observations & Workplace', 'eye', 1],
  ['resources', 'Learning Resources', 'layers'], ['calendar', 'Calendar', 'cal'], ['attendance', 'Attendance', 'checksq'],
  ['payments', 'Payments', 'card'], ['certificates', 'Certificates', 'award'], ['messages', 'Messages', 'msg'],
  ['notifications', 'Notifications', 'bell'], ['requests', 'My Requests', 'inbox'], ['browse', 'Browse Courses', 'search'],
  ['profile', 'Profile & Settings', 'user'], ['help', 'Help / Contact Academy', 'help'],
];
const B_OPEN = ['dashboard', 'admission', 'browse', 'profile', 'messages', 'thread', 'notifications', 'help', 'index'];
const PAUSE_LOCK = ['course', 'quiz', 'assignments', 'assignment', 'resources', 'progress', 'observations'];
function lockFor(r) {
  const f = W.flags;
  if (['admission', 'assignments', 'assignment', 'progress', 'observations'].includes(r) && !f.nvq)
    return { title: 'This area is for NVQ/RQF learners', msg: 'You are not enrolled on an NVQ/RQF programme. You can apply for one from Browse Courses.', cta: ['browse', 'Browse Courses'] };
  if (S.edge === 'archived' && !['dashboard', 'courses', 'course', 'certificates', 'profile', 'notifications', 'help', 'index'].includes(r))
    return { title: 'Your account is archived', msg: 'Archived accounts are read-only. You can still view your course history, certificates and profile.' };
  if (f.nvq && W.signup && !W.signup.done && !B_OPEN.includes(r)) // CH-10: content opens when the sign-up is complete, not on admission approval
    return { title: 'Finish your sign-up', msg: 'Programme content opens as soon as you finish your sign-up: documents, offer letter and payment. The Academy reviews your application while you learn.', cta: ['admission', 'Continue sign-up'] };
  if ((S.edge === 'paused' || W.accessPaused) && PAUSE_LOCK.includes(r))
    return { title: 'Access paused', msg: `Your access is paused because ${(po => `${po.label.toLowerCase()} is ${po.days} days overdue`)(pausedRow())}. Pay the overdue amount and your access comes back straight away — your work and progress are kept. Payments, Messages, Profile, Certificates and Notifications stay available.`, cta: ['payments', 'Go to Payments'], tone: 'red' };
  return null;
}
function navCounts() {
  return {
    assignments: W.flags.nvq ? W.assignments.filter(a => ['Not Started', 'Resubmission Required'].includes(a.status) && !a.closed).length : 0,
    messages: W.threads.filter(t => t.unread).length,
    notifications: W.notifs.filter(n => n.unread).length,
  };
}
function navItems() {
  return NAV.filter(([, , , nvq]) => !nvq || W.flags.nvq);
}
function isLockedNav(r) { return !!lockFor(r); }

/* ---------- Shell ---------- */
function initials() { return (W.me.first[0] + W.me.last[0]).toUpperCase(); }
function header() {
  const c = navCounts();
  return `<header class="hdr">
    <a class="logo" href="#dashboard" data-go="dashboard" aria-label="Illumin Academy — Dashboard">${LOGO}<div><b>Illumin Academy</b><span>Learner portal</span></div></a>
    <div class="hdr-right">
      ${W.flags.multiRole ? `<div class="role-switch"><label for="roleSel">Viewing as</label><select id="roleSel" data-onchange="role"><option ${S.role === 'Learner' ? 'selected' : ''}>Learner</option><option ${S.role === 'Teacher (staff)' ? 'selected' : ''}>Teacher (staff)</option></select></div>` : ''}
      <button class="icon-btn" data-act="menu" data-m="bell" aria-label="Notifications, ${c.notifications} unread" aria-expanded="${S.menu === 'bell'}">${ic('bell', 20)}${c.notifications ? `<span class="badge">${c.notifications}</span>` : ''}</button>
      <button class="icon-btn" data-go="messages" aria-label="Messages, ${c.messages} unread">${ic('msg', 20)}${c.messages ? `<span class="badge">${c.messages}</span>` : ''}</button>
      <button class="avatar-btn" data-act="menu" data-m="avatar" aria-expanded="${S.menu === 'avatar'}" aria-label="Account menu"><span class="avatar">${initials()}</span><span class="nm small strong">${esc(W.me.first)}</span></button>
    </div>
    ${S.menu === 'bell' ? bellMenu() : ''}${S.menu === 'avatar' ? avatarMenu() : ''}
  </header>`;
}
function bellMenu() {
  const items = W.notifs.slice(0, 5);
  return `<div class="dd" role="dialog" aria-label="Latest notifications">
    <div class="dd-h"><h3>Notifications</h3><button class="linklike small" data-act="markAllRead">Mark all read</button></div>
    <ul class="dd-list">${items.map(n => `<li><button class="dd-item" data-act="openNotif" data-id="${n.id}">${n.unread ? '<span class="unread-dot" aria-label="Unread"></span>' : '<span class="read-dot" aria-label="Read"></span>'}<span class="stack" style="gap:2px"><span class="small ${n.unread ? 'strong' : ''}">${esc(n.title)}</span><span class="xs muted">${esc(n.body)}</span><span class="xs muted">${rel(n.at)}</span></span></button></li>`).join('')}</ul>
    <div class="dd-f"><button class="btn btn-sm" data-go="notifications">View all notifications</button></div></div>`;
}
function avatarMenu() {
  return `<div class="dd" style="width:260px" role="menu" aria-label="Account">
    <div class="dd-h"><div><div class="strong">${esc(W.me.first + ' ' + W.me.last)}</div><div class="xs muted">${esc(W.me.email)}</div></div></div>
    <ul class="menu-list">
      <li><button data-go="profile" role="menuitem">${ic('user')}Profile</button></li>
      <li><button data-act="changePw" role="menuitem">${ic('key')}Change password</button></li>
      <li><button data-go="help" role="menuitem">${ic('help')}Help / Contact Academy</button></li>
      <li><button data-act="logout" role="menuitem">${ic('logout')}Log out</button></li>
    </ul></div>`;
}
function sidebar() {
  const c = navCounts(), sec = SECTION[S.route] || S.route;
  return `<nav class="side" aria-label="Main"><ul class="nav">${navItems().map(([r, l, i]) => {
    const lk = isLockedNav(r) && r !== 'admission';
    const n = c[r];
    return `<li><a href="#${r}" data-go="${r}" ${sec === r ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${lk ? `<span class="lk" title="Locked">${ic('lock', 14)}<span class="sr">(locked)</span></span>` : n ? `<span class="cnt" aria-label="${n} items">${n}</span>` : r === 'attendance' ? '' : ''}</a></li>${r === 'resources' || r === 'requests' ? '<li class="nav-sep" role="separator"></li>' : ''}`;
  }).join('')}</ul></nav>`;
}
function bottomNav() {
  const c = navCounts(), sec = SECTION[S.route] || S.route;
  const items = [['dashboard', 'Home', 'home'], ['courses', 'Courses', 'book'], [W.flags.nvq ? 'assignments' : 'calendar', W.flags.nvq ? 'Assignments' : 'Calendar', W.flags.nvq ? 'edit' : 'cal'], ['messages', 'Messages', 'msg']];
  return `<nav class="bnav" aria-label="Main (mobile)">${items.map(([r, l, i]) => `<button data-go="${r}" ${sec === r ? 'aria-current="page"' : ''}>${ic(i, 22)}${l}${c[r] ? `<span class="badge">${c[r]}</span>` : ''}</button>`).join('')}
    <button data-act="drawer" aria-expanded="${S.drawer}">${ic('menu', 22)}More</button></nav>
    <div class="drawer ${S.drawer ? 'open' : ''}" ${S.drawer ? '' : 'hidden'}><div class="scrim" data-act="drawer"></div><div class="d-panel" role="dialog" aria-label="All sections"><div class="row-b" style="padding:0 6px 8px"><h2>All sections</h2><button class="icon-btn" data-act="drawer" aria-label="Close">${ic('x')}</button></div>
    <ul class="nav">${navItems().map(([r, l, i]) => `<li><a href="#${r}" data-go="${r}" ${sec === r ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${isLockedNav(r) && r !== 'admission' ? `<span class="lk">${ic('lock', 14)}<span class="sr">(locked)</span></span>` : c[r] ? `<span class="cnt">${c[r]}</span>` : ''}</a></li>`).join('')}</ul></div></div>`;
}
function footer() {
  return `<footer class="foot"><span>© 2026 Illumin Academy</span>${['Privacy policy', 'Terms of use', 'Accessibility statement', 'Contact'].map(l => `<button data-act="policy" data-p="${l}">${l}</button>`).join('')}<span class="spacer"></span><span>Times shown in ${esc(W.me.tz.replace('_', ' '))} (${tzl()})</span></footer>`;
}
function banner(tone, icon, html, acts = '') { return `<div class="banner b-${tone}" role="${tone === 'red' ? 'alert' : 'status'}">${ic(icon)}<div class="b-body">${html}</div>${acts ? `<div class="b-act">${acts}</div>` : ''}</div>`; }
function globalBanners() {
  const out = [];
  if (S.offline) out.push(banner('grey', 'wifioff', `<strong>You're offline.</strong> We'll keep trying to reconnect. Anything you type is saved on this device and synced when you're back online.`, `<button class="btn btn-sm" data-act="toggleOffline">Retry now</button>`));
  if (S.edge === 'archived') out.push(banner('grey', 'lock', `<strong>Your account is archived — read-only access.</strong> You can view your certificates and course history.`));
  if (S.edge === 'paused' || W.accessPaused) { const po = pausedRow(); out.push(banner('red', 'lock', `<strong>Access paused — pay to restore.</strong> ${esc(po.label)} (${money(po.amount, po.cur)}) is ${po.days} days overdue. Course content, assignments and resources are locked until it's paid. As soon as you pay, your access comes back straight away — your work and progress are all kept.`, `<button class="btn btn-sm btn-primary" data-act="payInst" data-e="${po.e}" data-n="${po.n}">Pay ${money(po.amount, po.cur)} now</button>`)); }
  else if (W.payOverdue && S.edge !== 'arrangement' && !W.arrangeUntil) out.push(banner('amber', 'alert', `<strong>Payment overdue.</strong> ${esc(W.payOverdue.label)} (${money(W.payOverdue.amount)}) was due on ${fd(W.payOverdue.due)}. Pay by ${fd(D(15))} to avoid your access being paused.`, `<button class="btn btn-sm" data-act="payInst" data-e="${W.payOverdue.e}" data-n="${W.payOverdue.n}">Pay now</button>`));
  if (S.edge === 'arrangement' || (W.arrangeUntil && !W.accessPaused)) out.push(banner('green', 'check', `<strong>Payment arrangement agreed.</strong> Access restored until ${fd(W.arrangeUntil || D(14))}. Your next payment of ${money(350)} is due on that date.`, `<button class="btn btn-sm" data-go="payments">View plan</button>`));
  if (W.admission && ['Pending — Documents Required'].includes(W.admission.status) && W.docs.some(d => d.mand && d.status !== 'Approved' && d.status !== 'Submitted'))
    out.push(banner('blue', 'clip', `<strong>Documents required.</strong> ${W.docs.filter(d => d.mand && ['Pending', 'Rejected', 'Resubmission Required'].includes(d.status)).length} mandatory documents still need your action before your application can be reviewed.`, `<button class="btn btn-sm" data-go="admission">Upload documents</button>`));
  const exp = W.docs && W.docs.find(d => d.expires && daysTo(d.expires) <= 30 && daysTo(d.expires) > 0 && d.status === 'Approved');
  if (exp && S.variant !== 'B') out.push(banner('purple', 'user', `<strong>Account action needed.</strong> Your ${esc(exp.name.toLowerCase())} expires on ${fd(exp.expires)}. Upload a replacement to keep your enrolment active.`, `<button class="btn btn-sm" data-go="admission">Replace document</button>`));
  return out.length ? `<div class="banners">${out.join('')}</div>` : '';
}
function pageHtml() {
  if (S.serverError) return errorPage();
  if (S.role !== 'Learner') return `<div class="lockpage"><div class="lock-ic">${ic('users', 30)}</div><h1>Teacher (staff) workspace</h1><p class="muted">The staff side of the LMS is outside this prototype. Switch back to <strong>Learner</strong> in the header to continue.</p><button class="btn btn-primary" data-act="roleBack">Switch to Learner</button></div>`;
  const lock = lockFor(S.route);
  if (lock) return lockedPage(lock);
  const fn = SCREENS[S.route];
  if (!fn) return notFound();
  try { return fn(S.params); } catch (err) { console.error(err); return errorPage(); }
}
function lockedPage(l) {
  return `<div class="lockpage"><div class="lock-ic" ${l.tone === 'red' ? 'style="background:var(--red-bg);color:var(--red)"' : ''}>${ic('lock', 30)}</div><h1>${l.title}</h1><p class="muted">${l.msg}</p>${l.tbd ? tbd(l.tbd) : ''}${l.cta ? `<button class="btn btn-primary" data-go="${l.cta[0]}">${l.cta[1]}</button>` : ''}</div>`;
}
function notFound() {
  return `<div class="lockpage"><div class="lock-ic">${ic('search', 30)}</div><p class="eyebrow">Error 404</p><h1>We can't find that page</h1><p class="muted">The link may be out of date, or the item may have been removed. Check the address or go back to your dashboard.</p><div class="row" style="justify-content:center"><button class="btn btn-primary" data-go="dashboard">Go to dashboard</button><button class="btn" data-go="index">Screen index</button></div></div>`;
}
function errorPage() {
  return `<div class="lockpage"><div class="lock-ic" style="background:var(--red-bg);color:var(--red)">${ic('alert', 30)}</div><p class="eyebrow">Error 500</p><h1>Something went wrong on our side</h1><p class="muted">We couldn't load this page. Your work is saved. Try again in a moment — if it keeps happening, contact the Academy and quote reference <span class="mono">ERR-7F3A-2210</span>.</p><button class="btn btn-primary" data-act="retryServer">${ic('refresh', 16)}Try again</button></div>`;
}
function pageHead(title, sub, actions = '', crumbs) {
  return `<div class="page-h"><div class="stack" style="gap:2px">${crumbs ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([l, r, id]) => r ? `<a href="#${r}" data-go="${r}" ${id ? `data-id="${id}"` : ''}>${l}</a><span aria-hidden="true">/</span>` : `<span>${l}</span>`).join('')}</nav>` : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
}
function tabs(list, cur, act, label = 'Sections') {
  return `<div class="tabs" role="tablist" aria-label="${label}">${list.map(([k, l, n]) => `<button class="tab" role="tab" aria-selected="${k === cur}" data-act="${act}" data-k="${k}">${l}${n !== undefined ? `<span class="cnt">${n}</span>` : ''}</button>`).join('')}</div>`;
}
function subtabs(list, cur, route, id) {
  return `<div class="subtabs" role="tablist" aria-label="Sections">${list.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${k === cur}" data-go="${route}" ${id ? `data-id="${id}"` : ''} data-tab="${k}">${l}</button>`).join('')}</div>`;
}

/* ---------- Render ---------- */
function render() {
  document.body.classList.toggle('frame-mobile', S.frame === 'mobile');
  const app = $('#app');
  if (S.signedIn && S.portal === 'admin' && typeof adminRender === 'function') { adminRender(); renderDemo(); afterRender(); return; }
  if (!S.signedIn) { app.innerHTML = authView(); }
  else {
    app.innerHTML = `<button class="skip btn btn-primary" data-act="skip">Skip to main content</button>${header()}
    <div class="frame">${sidebar()}<main id="main" class="main" tabindex="-1">${globalBanners()}<div class="page">${pageHtml()}</div>${footer()}</main></div>${bottomNav()}`;
  }
  renderDemo();
  afterRender();
}
const AFTER = [];
function afterRender() { AFTER.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }

/* ---------- Auth ---------- */
function authShell(inner) {
  return `<div class="auth"><aside class="auth-side"><a class="logo" style="color:#fff">${LOGO}<div><b style="color:#fff">Illumin Academy</b></div></a>
    <div class="stack-lg"><h2>Training for people who care for others.</h2><p>Short courses and NVQ/RQF qualifications in health and social care, for learners across the UK and UAE.</p></div>
    <div class="facts"><div><b>Level 2–5</b>NVQ / RQF diplomas</div><div><b>40+</b>CPD short courses</div><div><b>UK · UAE</b>learners</div></div><div class="ray"></div></aside>
    <main class="auth-main" id="main"><div class="auth-card">${inner}</div></main></div>`;
}
function pwPolicy(id) {
  return `<ul class="policy" id="${id}" aria-live="polite">${[['len', 'At least 12 characters'], ['up', 'An upper-case letter'], ['lo', 'A lower-case letter'], ['num', 'A number'], ['sym', 'A symbol (e.g. ! ? # @)']].map(([k, l]) => `<li data-r="${k}"><span class="pi" aria-hidden="true">○</span><span>${l}</span><span class="sr"> — not met</span></li>`).join('')}<li data-r="match"><span class="pi" aria-hidden="true">○</span><span>Both passwords match</span><span class="sr"> — not met</span></li></ul>`;
}
const PW_RULES = { len: v => v.length >= 12, up: v => /[A-Z]/.test(v), lo: v => /[a-z]/.test(v), num: v => /\d/.test(v), sym: v => /[^A-Za-z0-9]/.test(v) };
INP.pw = (el) => {
  const form = el.closest('form'); const p = form.querySelector('[data-pw="new"]').value, c = form.querySelector('[data-pw="confirm"]').value;
  let all = true;
  form.querySelectorAll('.policy li').forEach(li => {
    const r = li.dataset.r, ok = r === 'match' ? (p.length > 0 && p === c) : PW_RULES[r](p);
    if (!ok) all = false;
    li.classList.toggle('ok', ok); li.querySelector('.pi').textContent = ok ? '✓' : '○'; li.querySelector('.sr').textContent = ok ? ' — met' : ' — not met';
  });
  const btn = form.querySelector('[data-pwsubmit]'); if (btn) btn.disabled = !all;
};
function pwField(id, label, kind, auto = 'new-password') {
  return `<div class="field"><label for="${id}">${label}</label><div class="pw-wrap"><input class="input" id="${id}" type="password" autocomplete="${auto}" ${kind ? `data-pw="${kind}" data-oninput="pw"` : ''}><button type="button" class="btn btn-sm btn-ghost" data-act="pwToggle" data-for="${id}" aria-pressed="false">Show</button></div></div>`;
}
function authView() {
  const a = S.auth, m = S.authMsg;
  if (a && a.startsWith('tfa') && typeof tfaView === 'function') return tfaView();
  const msgBox = m ? `<div class="note b-${m.tone || 'red'}" role="alert">${ic(m.tone === 'blue' ? 'info' : 'alert')}<div>${m.html}</div></div>` : '';
  if (a === 'signin') return authShell(`<div class="stack" style="gap:6px"><h1>Sign in to your learner portal</h1><p class="muted">Use the email address you registered with.</p></div>${msgBox}
    <form class="stack" data-submit="signin" novalidate>
      <div class="field"><label for="si-email">Email</label><input class="input" id="si-email" type="email" autocomplete="username" value="${esc(S.authEmail || '')}" placeholder="name@example.com"></div>
      ${pwField('si-pw', 'Password', '', 'current-password')}
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      <div class="row-b"><button type="button" class="linklike" data-act="authGo" data-a="forgot">Forgot password?</button><button type="button" class="linklike" data-act="regStart">Create an account</button></div>
    </form>
    <div class="demo-hint"><strong>Prototype:</strong> any email + password signs in. To see error states, include <code>wrong</code>, <code>locked</code>, <code>unverified</code> or <code>inactive</code> in the email. Five wrong attempts also lock the account.<div class="row" style="margin-top:6px"><button type="button" class="btn btn-sm" data-act="demoSignInAs" data-r="learner">Sign in as Learner (Aisha)</button><button type="button" class="btn btn-sm" data-act="demoSignInAs" data-r="admin">Sign in as Super Admin (demo)</button></div></div>`);
  if (a === 'forgot') return authShell(`<button class="linklike small" data-act="authGo" data-a="signin">← Back to sign in</button><div class="stack" style="gap:6px"><h1>Reset your password</h1><p class="muted">Enter your email and we'll send you a link to set a new password.</p></div>
    <form class="stack" data-submit="forgot" novalidate><div class="field"><label for="fp-email">Email</label><input class="input" id="fp-email" type="email" autocomplete="username" value="${esc(S.authEmail)}"></div><button class="btn btn-primary btn-block" type="submit">Send reset link</button></form>`);
  if (a === 'forgotSent') return authShell(`<div class="lock-ic" style="background:var(--green-bg);color:var(--green)">${ic('send', 28)}</div><h1>Check your email</h1><p>If an account exists for <strong>${esc(S.authEmail || 'this email')}</strong>, we've sent a reset link. The link is valid for 7 days.</p><p class="small muted">Didn't get it? Check your spam folder, or wait a few minutes and request another.</p>
    <div class="stack"><button class="btn btn-primary" data-act="authGo" data-a="reset">Open the reset link (simulated email)</button><button class="btn" data-act="authGo" data-a="signin">Back to sign in</button></div>`);
  if (a === 'reset' || a === 'first') {
    const first = a === 'first';
    return authShell(`${first ? `<p class="eyebrow">Your account was created by ${S.staffFlow ? 'the System Administrator' : W.me.sponsor ? esc(W.me.sponsor) : 'Illumin Academy'}</p><h1>Welcome to Illumin Academy, ${esc(S.staffFlow && typeof ADMIN !== 'undefined' ? ADMIN.me.first : W.me.first)}</h1><p class="muted">Set a password to finish setting up your account.</p>` : `<h1>Choose a new password</h1><p class="muted">Signing in as <strong>${esc(W.me.email)}</strong></p>`}
    <form class="stack" data-submit="${first ? 'firstSet' : 'resetSet'}" novalidate>${pwField('np1', 'New password', 'new')}${pwField('np2', 'Confirm new password', 'confirm')}${pwPolicy('pol')}
      <button class="btn btn-primary btn-block" type="submit" data-pwsubmit disabled>${first ? 'Set password and continue' : 'Update password'}</button></form>
    <button class="linklike small" data-act="authGo" data-a="${first ? 'firstExpired' : 'resetExpired'}">Prototype: show the expired-link state</button>`);
  }
  if (a === 'resetDone') return authShell(`<div class="lock-ic" style="background:var(--green-bg);color:var(--green)">${ic('check', 28)}</div><h1>Password updated</h1><p>You can now sign in with your new password. For your security, we've signed you out on all other devices.</p><button class="btn btn-primary btn-block" data-act="authGo" data-a="signin">Sign in</button>`);
  if (a === 'resetExpired' || a === 'firstExpired') return authShell(`<div class="lock-ic" style="background:var(--amber-bg);color:var(--amber)">${ic('clock', 28)}</div><h1>This link has expired</h1><p>${a === 'firstExpired' ? 'Set-password links are valid for 7 days. Request a new one and we\'ll email it to you.' : 'This reset link has expired or has already been used. Request a new one.'}</p><button class="btn btn-primary btn-block" data-act="${a === 'firstExpired' ? 'newSetLink' : 'authGo'}" data-a="forgot">${a === 'firstExpired' ? 'Request a new link' : 'Request a new link'}</button><button class="btn" data-act="authGo" data-a="signin">Back to sign in</button>`);
  if (a === 'welcome') return authShell(`<div class="lock-ic" style="background:var(--gold-soft);color:var(--gold-ink)">${ic('sun', 30)}</div><h1>You're all set, ${esc(W.me.first)}</h1><p>${S.regV ? 'Your account is ready.' : 'Your password is saved.'} Here's what you'll find in your portal:</p><ul class="stack small" style="padding-left:18px;margin:0"><li>Your courses, progress and deadlines on the dashboard</li><li>Assignments, feedback and your Professional Discussion plan (NVQ learners)</li><li>Payments, certificates and messages to your Academy team</li></ul><button class="btn btn-primary btn-block" data-act="finishWelcome">Go to my dashboard</button>`);
  if (a === 'verify') return authShell(`<div class="lock-ic" style="background:var(--blue-bg);color:var(--blue)">${ic('send', 28)}</div><h1>Please verify your account</h1><p>We sent a verification link to <strong>${esc(S.authEmail || W.me.email)}</strong>. Open it to activate your account, then sign in.</p><button class="btn btn-primary btn-block" data-act="resendVerify">Resend link</button><button class="btn" data-act="authGo" data-a="signin">Back to sign in</button><p class="small muted">Verification links expire after 7 days.</p>`);
  return authShell('');
}
ACT.authGo = el => { S.auth = el.dataset.a; S.authMsg = null; render(); };
ACT.pwToggle = el => { const i = $('#' + el.dataset.for); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.textContent = show ? 'Hide' : 'Show'; el.setAttribute('aria-pressed', show); };
ACT.resendVerify = () => toast('Verification link sent. It is valid for 7 days.');
ACT.newSetLink = () => { toast('A new set-password link has been emailed to you.'); S.auth = 'first'; render(); };
ACT.finishWelcome = () => { S.signedIn = true; S.auth = 'signin'; go('dashboard'); toast(`Welcome to Illumin Academy, ${W.me.first}`); };
const SUBMIT = {};
SUBMIT.signin = (form) => {
  const email = $('#si-email').value.trim(), pw = $('#si-pw').value;
  S.authEmail = email;
  if (!email || !pw) { S.authMsg = { html: !email ? 'Enter your email address.' : 'Enter your password.' }; render(); return; }
  const e = email.toLowerCase();
  if (e.includes('locked') || S.failCount >= 5) { S.authMsg = { html: '<strong>Your account is temporarily locked</strong> after several unsuccessful attempts. Try again in 15 minutes, or reset your password.' }; render(); return; }
  if (e.includes('wrong')) { S.failCount++; S.authMsg = { html: `<strong>Email or password is incorrect.</strong> Check them and try again.${S.failCount >= 3 ? ` ${5 - S.failCount} attempts left before your account is locked for 15 minutes.` : ''}` }; if (S.failCount >= 5) S.authMsg = { html: '<strong>Your account is temporarily locked</strong> after 5 unsuccessful attempts. Try again in 15 minutes.' }; render(); return; }
  if (typeof staffSignin === 'function' && staffSignin(e)) return;
  if (e.includes('unverified') || S.edge === 'unverified') { S.auth = 'verify'; S.authMsg = null; render(); return; }
  if (e.includes('inactive') || S.edge === 'deactivated') { S.authMsg = { html: '<strong>Your account is inactive — contact the Academy.</strong> ' + academyContact() }; render(); return; }
  if (typeof learnerGate === 'function' && learnerGate()) return;
  S.portal = 'learner';
  S.signedIn = true; S.failCount = 0; S.authMsg = null;
  const back = S.returnTo; S.returnTo = null;
  if (back) { setRoute(back); render(); toast('Signed in. We\'ve brought you back to where you were — your draft is safe.', 'info'); }
  else go('dashboard');
};
SUBMIT.forgot = () => { S.authEmail = $('#fp-email').value.trim(); if (!S.authEmail) { fieldErr('#fp-email', 'Enter your email address'); return; } S.auth = 'forgotSent'; render(); };
SUBMIT.resetSet = () => { S.auth = 'resetDone'; render(); };
SUBMIT.firstSet = () => { S.auth = S.staffFlow ? 'tfa-setup' : 'welcome'; render(); };
function signOut(reason) {
  clearTimer('sess'); clearTimer('quiz'); clearTimer('undo');
  if (MODAL) { MODAL = null; renderModal(); }
  $('#undo-root').innerHTML = '';
  S.signedIn = false; S.auth = 'signin'; S.menu = null;
  if (reason === 'expired') { S.returnTo = routeTok(S.route, S.params); S.authMsg = { tone: 'blue', html: '<strong>Your session expired</strong> after 30 minutes of inactivity. Sign in again to return to the page you were on — your draft was saved.' }; }
  else if (reason === 'inactive') S.authMsg = { html: '<strong>Your account is inactive — contact the Academy.</strong>' };
  else S.authMsg = reason === 'out' ? { tone: 'blue', html: 'You have signed out.' } : null;
  render();
}
ACT.logout = () => signOut('out');

/* ---------- Session timeout ---------- */
ACT.sessionWarn = () => {
  if (!S.signedIn) { toast('Sign in first to see the session warning.', 'info'); return; }
  let left = 120;
  openModal({
    title: 'Your session is about to expire', dismissable: false,
    body: `<p>For your security, you'll be signed out in <strong class="countdown" id="sess-left">2:00</strong> because you haven't been active.</p><div class="note b-green">${ic('check')}<div>Your drafts were auto-saved at ${ft(now())}.</div></div><button class="linklike small" data-act="sessExpireNow">Prototype: skip to expiry</button>`,
    actions: [{ label: 'Sign out', cls: 'btn', fn: () => { clearTimer('sess'); signOut('out'); } }, { label: 'Stay signed in', cls: 'btn-primary', fn: () => { clearTimer('sess'); toast('You\'re still signed in.'); } }],
  });
  timer('sess', () => { left--; const el = $('#sess-left'); if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (left <= 0) { clearTimer('sess'); signOut('expired'); } }, 1000);
};
ACT.sessExpireNow = () => { clearTimer('sess'); signOut('expired'); };

/* ---------- Demo panel ---------- */
const VARIANT_INFO = {
  A: ['B2C short-course learner', 'Daniel Okafor · Manchester · pays personally · no NVQ tabs'],
  B: ['NVQ applicant (signing up)', 'Priya Raman · Dubai · sign-up step 2 of 5'],
  C: ['Active NVQ learner', 'Aisha Rahman · Leicester · every tab'],
  D: ['Agency-sponsored learner', 'Grace Mensah · Croydon · sponsored by BrightCare Staffing'],
  E: ['Multi-role user', 'Tom Whitfield · staff + learner · role switcher in header'],
  F: ['Learner who is a Welfare Buddy', 'Fatima Al Mansoori · Abu Dhabi · referral code'],
};
/* List upgrade B3: month + year selector and "Go to date" for calendars. Jumps directly; the current view (month/week/day/agenda) stays. */
function calJump(key, anchor) {
  const [y, m] = anchor.split('-').map(Number), Y = now().getFullYear(), months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = []; for (let i = Y - 6; i <= Y + 2; i++) years.push(i); if (!years.includes(y)) { years.push(y); years.sort(); }
  return `<span class="row cal-jump"><label class="sr" for="cj-m-${key}">Month</label><select class="select cal-sel" id="cj-m-${key}" data-onchange="calJumpMY" data-k="${key}">${months.map((l, i) => `<option value="${i + 1}" ${i + 1 === m ? 'selected' : ''}>${l}</option>`).join('')}</select><label class="sr" for="cj-y-${key}">Year</label><select class="select cal-sel" id="cj-y-${key}" data-onchange="calJumpMY" data-k="${key}">${years.map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select><label class="xs" for="cj-d-${key}">Go to date</label><input class="input cal-go" type="date" id="cj-d-${key}" value="${anchor}" data-onchange="calJumpD" data-k="${key}"></span>`;
}
INP.calJumpMY = el => { const k = el.dataset.k, m = $('#cj-m-' + k).value, y = $('#cj-y-' + k).value; setUi(k, `${y}-${String(m).padStart(2, '0')}-01`); render(); };
INP.calJumpD = el => { if (el.value) { setUi(el.dataset.k, el.value); render(); } };
/* List upgrade B4: notifications — grouped by date (Today / Yesterday / This week / Earlier this month / Older),
   search, Unread only, Date filter, most recent 30 then "Load older". Item markup, deep links and Mark all read are each page's own. */
function nfList(key, list, item, opts = {}) {
  const st = S.ui['nf-' + key] = S.ui['nf-' + key] || { q: '', unread: false, p: 'all', from: '', to: '', n: 30, open: { Today: 1 } };
  const txt = n => [n.t, n.title, n.b, n.body, n.cat].filter(Boolean).join(' ').toLowerCase();
  const [a, b] = typeof dtRange === 'function' ? dtRange(st.p, st.from, st.to) : [null, null];
  const rows = list.filter(n => (!st.unread || n.unread) && (!st.q || txt(n).includes(st.q.toLowerCase())) && ((!a && !b) || (n.at && (!a || new Date(n.at) >= a) && (!b || new Date(n.at) < b)))).slice().sort((x, y) => (y.at || '') > (x.at || '') ? 1 : (y.at || '') < (x.at || '') ? -1 : 0);
  const shown = rows.slice(0, st.n), n0 = now(), d0 = new Date(n0.getFullYear(), n0.getMonth(), n0.getDate()), day = 864e5;
  const wk = new Date(+d0 - ((d0.getDay() + 6) % 7) * day), mo = new Date(n0.getFullYear(), n0.getMonth(), 1);
  const grp = n => { const t = new Date(n.at); return t >= d0 ? 'Today' : t >= new Date(+d0 - day) ? 'Yesterday' : t >= wk ? 'This week' : t >= mo ? 'Earlier this month' : 'Older'; };
  const G = ['Today', 'Yesterday', 'This week', 'Earlier this month', 'Older'].map(g => [g, shown.filter(n => grp(n) === g)]).filter(([, l]) => l.length);
  const presets = (typeof DT_PRESETS !== 'undefined' ? DT_PRESETS : [['all', 'All time']]);
  const bar = `<div class="dt-bar nf-bar"><div class="field dt-q"><label class="sr" for="nfq-${key}">Search notifications</label><input class="input" type="search" id="nfq-${key}" placeholder="Search notifications…" value="${esc(st.q)}" data-oninput="nfQ" data-k="${key}"></div>
    <label class="check small"><input type="checkbox" ${st.unread ? 'checked' : ''} data-onchange="nfU" data-k="${key}"> Unread only</label>
    <div class="field"><label class="sr" for="nfp-${key}">Date</label><select class="select dt-sel" id="nfp-${key}" data-onchange="nfP" data-k="${key}">${presets.map(([k, l]) => `<option value="${k}" ${st.p === k ? 'selected' : ''}>${k === 'all' ? 'Date: all time' : l}</option>`).join('')}</select></div>
    ${st.p === 'custom' ? `<div class="field"><label class="sr" for="nff-${key}">From</label><input class="input" type="date" id="nff-${key}" value="${st.from}" max="${dtLocalDay(now())}" data-onchange="nfD" data-k="${key}" data-w="from"></div><div class="field"><label class="sr" for="nft-${key}">To</label><input class="input" type="date" id="nft-${key}" value="${st.to}" max="${dtLocalDay(now())}" data-onchange="nfD" data-k="${key}" data-w="to"></div>${st.err ? `<span class="err small" role="alert">${esc(st.err)}</span>` : ''}` : ''}
    <span class="xs muted" role="status">${rows.length} of ${list.length}</span></div>`;
  if (!rows.length) return bar + (list.length ? `<div class="card"><div class="empty">${ic('filter', 30)}<strong>No notifications match these filters</strong><button class="btn btn-sm" data-act="nfClr" data-k="${key}">Clear filters</button></div></div>` : (opts.empty || `<div class="card"><div class="empty">${ic('bell', 30)}<strong>No notifications</strong></div></div>`));
  return bar + `<section class="card pad0 nf-groups">${G.map(([g, l]) => `<details class="nf-g" ${st.open[g] ? 'open' : ''}><summary data-act="nfG" data-k="${key}" data-g="${g}"><span class="strong">${g}</span> <span class="xs muted">(${l.length})</span></summary><ul class="list" style="padding:0 16px">${l.map(item).join('')}</ul></details>`).join('')}</section>
  <div class="row-b small">${rows.length > st.n ? `<button class="btn btn-sm" data-act="nfMore" data-k="${key}">Load older</button>` : `<span class="muted">You've reached the beginning</span>`}</div>`;
}
const nfS = k => S.ui['nf-' + k];
INP.nfQ = el => { nfS(el.dataset.k).q = el.value; nfS(el.dataset.k).n = 30; render(); const i = $('#nfq-' + el.dataset.k); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
INP.nfU = el => { nfS(el.dataset.k).unread = el.checked; nfS(el.dataset.k).n = 30; render(); };
INP.nfP = el => { const s = nfS(el.dataset.k); s.p = el.value; s.err = ''; if (el.value !== 'custom') { s.from = ''; s.to = ''; } s.n = 30; render(); };
INP.nfD = el => { const s = nfS(el.dataset.k), v = { from: s.from, to: s.to, [el.dataset.w]: el.value }; if (v.from && v.to && v.from > v.to) { s.err = '"From" must not be after "To".'; render(); return; } s.from = v.from; s.to = v.to; s.err = ''; render(); };
ACT.nfG = el => { const s = nfS(el.dataset.k); s.open[el.dataset.g] = s.open[el.dataset.g] ? 0 : 1; render(); };
ACT.nfMore = el => { nfS(el.dataset.k).n += 30; render(); };
ACT.nfClr = el => { const s = nfS(el.dataset.k); Object.assign(s, { q: '', unread: false, p: 'all', from: '', to: '', err: '', n: 30 }); render(); };
/* Placeholder for content the client will supply (TBD tag style, labelled "Client to supply") */
const c2s = t => `<span class="tbd" title="${TBD_TIP}">Client to supply: ${esc(t)}</span>`;
const pend = t => `<span class="tbd" title="${TBD_TIP}">Pending client: ${esc(t)}</span>`;
const EDGES = [
  ['none', 'None (normal state)'],
  ['unverified', '1 · Pending verification', 'A', 'auth'],
  ['paypending', '2 · Payment pending', 'A'],
  ['underreview', '3 · Admission under review', 'B'],
  ['rejected', '4 · Admission rejected', 'B'],
  ['withdrawn', '5 · Application withdrawn', 'B'],
  ['paused', '6 · Access paused (overdue fees)', 'C'],
  ['discontinued', '7 · Discontinued (one course)', 'C'],
  ['expired', '8 · Expired-Incomplete', 'A'],
  ['unassigned', '9 · Seat unassigned by agency', 'D'],
  ['cancelRefund', '11a · Batch cancelled — refund', 'C'],
  ['cancelMoved', '11b · Batch cancelled — moved batch', 'C'],
  ['archived', '12 · Archived account', 'A'],
  ['deactivated', '13 · Deactivated account', 'A', 'auth'],
  ['arrangement', 'Payment arrangement (access restored)', 'C'],
  ['qualified', 'Qualification requirements met', 'C'],
  ['seatReleased', '14 · Deposit — seat released (balance unpaid)', 'B'],
];
function setVariant(v, keepRoute) {
  S.variant = v; W = (typeof STORE !== 'undefined' && STORE.worlds) ? (STORE.worlds[v] = STORE.worlds[v] || makeWorld(v)) : makeWorld(v); applyEdge(); S.role = 'Learner';
  if (!keepRoute) S.route = 'dashboard', S.params = {};
}
function setEdge(e) {
  const def = EDGES.find(x => x[0] === e);
  S.edge = e;
  if (def && def[2] && def[2] !== S.variant) S.variant = def[2];
  W = makeWorld(S.variant); if (typeof STORE !== 'undefined' && STORE.worlds) STORE.worlds[S.variant] = W; applyEdge();
  if (def && def[3] === 'auth') { signOut(); if (e === 'unverified') { S.auth = 'verify'; S.authEmail = W.me.email; } else S.authMsg = { html: '<strong>Your account is inactive — contact the Academy.</strong> ' + academyContact() }; }
}
function renderDemo() {
  const root = $('#demo-root');
  root.innerHTML = `<button class="demo-fab" data-act="demoToggle" aria-expanded="${S.demoOpen}">${ic('target', 16)}<span class="fab-l">Demo controls</span></button>
  ${S.demoOpen && S.portal === 'admin' && typeof adminDemoPanel === 'function' ? adminDemoPanel() : ''}
  ${S.demoOpen && S.portal !== 'admin' ? `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls">
    <div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>
    ${typeof roleSwitchHtml === 'function' ? roleSwitchHtml() : ''}
    <fieldset><legend>Learner variant — demo only</legend>${Object.entries(VARIANT_INFO).map(([k, [l, d]]) => `<label class="vopt"><input type="radio" name="dv" value="${k}" ${S.variant === k ? 'checked' : ''} data-onchange="variant"><span><strong>${k} · ${l}</strong><br><span class="xs muted">${d}</span></span></label>`).join('')}</fieldset>
    <fieldset><legend>Edge state (§7) — demo only</legend><label class="sr" for="edgeSel">Edge state</label><select class="select" id="edgeSel" data-onchange="edge">${EDGES.map(([k, l, v]) => `<option value="${k}" ${S.edge === k ? 'selected' : ''}>${l}${v ? ` (variant ${v})` : ''}</option>`).join('')}</select>
      <div class="btns"><button class="btn btn-sm" data-act="demo404">404 page</button><button class="btn btn-sm" data-act="toggleOffline">${S.offline ? 'Go online' : 'Offline banner'}</button><button class="btn btn-sm" data-act="demoServer">Server error</button></div></fieldset>
    ${W.flags.nvq ? `<fieldset><legend>NVQ sub-states — demo only</legend>
      <label class="lbl" for="permSel">Workplace permission</label><select class="select" id="permSel" data-onchange="perm">${['Not entered', 'Permission Pending', 'Granted', 'Declined', 'Expired'].map(p => `<option ${W.workplace.perm === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <div class="btns">${S.variant === 'B' ? `<button class="btn btn-sm" data-act="approveAllDocs">Reviewer approves all documents</button><button class="btn btn-sm" data-act="approveAdmission">Approve admission</button>` : ''}<label class="check small"><input type="checkbox" ${S.saveFail ? 'checked' : ''} data-onchange="saveFail">Simulate auto-save failure</label></div></fieldset>` : ''}
    <fieldset><legend>Session &amp; sign-in — demo only</legend><div class="btns">
      <button class="btn btn-sm" data-act="sessionWarn">Session timeout warning</button><button class="btn btn-sm" data-act="sessExpireNow">Session expired</button>
      <button class="btn btn-sm" data-act="demoAuth" data-a="signin">Sign in</button><button class="btn btn-sm" data-act="demoAuth" data-a="forgot">Forgot password</button><button class="btn btn-sm" data-act="demoAuth" data-a="reset">Reset page</button><button class="btn btn-sm" data-act="demoAuth" data-a="resetExpired">Reset link expired</button><button class="btn btn-sm" data-act="demoAuth" data-a="first">First-time set password</button><button class="btn btn-sm" data-act="demoAuth" data-a="firstExpired">First-time link expired</button></div></fieldset>
    <fieldset><legend>View — demo only</legend><div class="btns">
      <div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div>
</div></fieldset>
    <button class="btn btn-primary" data-act="openIndex">Open screen index</button>
  </div>` : ''}`;
}
ACT.demoToggle = () => { S.demoOpen = !S.demoOpen; renderDemo(); };
INP.variant = el => { S.edge = 'none'; setVariant(el.value); if (!S.signedIn) S.signedIn = true; render(); toast(`Switched to variant ${el.value} · ${VARIANT_INFO[el.value][0]}`, 'info'); };
INP.edge = el => {
  setEdge(el.value);
  if (S.signedIn || !EDGES.find(x => x[0] === el.value)?.[3]) {
    S.signedIn = true;
    const target = { paypending: 'courses', underreview: 'admission', rejected: 'admission', withdrawn: 'admission', discontinued: 'courses', expired: 'course.mh26', unassigned: 'courses', cancelRefund: 'courses.nvq', cancelMoved: 'course.nvq', qualified: 'progress', arrangement: 'payments' }[el.value];
    if (target) { const [r, id] = target.split('.'); if (r === 'courses' && id) go('course', { id }); else go(r, { id }); return; }
  }
  render();
};
INP.perm = el => { W.workplace.perm = el.value; render(); };
INP.saveFail = el => { S.saveFail = el.checked; };
INP.role = el => { S.role = el.value; render(); toast(`Viewing as ${el.value}`, 'info'); };
ACT.roleBack = () => { S.role = 'Learner'; render(); };
ACT.demo404 = () => { if (!S.signedIn) S.signedIn = true; go('missing-page'); };
ACT.demoServer = () => { if (!S.signedIn) S.signedIn = true; S.serverError = true; render(); };
ACT.retryServer = () => { S.serverError = false; render(); toast('Page loaded.'); };
ACT.toggleOffline = () => { S.offline = !S.offline; render(); if (!S.offline) toast('You\'re back online. Changes synced.'); };
ACT.demoAuth = el => { signOut(); S.auth = el.dataset.a; S.authMsg = null; render(); };
ACT.frame = el => { S.frame = el.dataset.f; render(); };
ACT.theme = el => { S.theme = el.dataset.t; if (S.theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', S.theme); renderDemo(); };
ACT.openIndex = () => { S.demoOpen = false; S.signedIn = true; go('index'); };

/* ---------- Generic UI actions ---------- */
ACT.menu = el => { S.menu = S.menu === el.dataset.m ? null : el.dataset.m; render(); };
ACT.drawer = () => { S.drawer = !S.drawer; render(); };
ACT.skip = () => { const m = $('#main'); m && m.focus(); };
ACT.modalClose = () => closeModal();
ACT.modalScrim = () => { if (MODAL && MODAL.dismissable) closeModal(); };
ACT.policy = el => openModal({ title: el.dataset.p, body: `<p>${el.dataset.p === 'Contact' ? 'Illumin Academy · ' + chOfficeTxt() /* CH-34 */ + ' · ' + academyContact() : `The full ${el.dataset.p.toLowerCase()} opens here. This prototype shows a placeholder.`}</p><p class="small muted">Version 3.2 · published 1 Aug 2026</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });

/* ---------- Event delegation ---------- */
document.addEventListener('click', e => {
  const mi = e.target.closest('[data-mi]');
  if (mi && MODAL) {
    const a = MODAL.actions[+mi.dataset.mi]; const m = MODAL;
    const r = a.fn ? a.fn($('#modal-root .modal')) : undefined;
    if (r !== false && MODAL === m) closeModal();
    return;
  }
  const el = e.target.closest('[data-go],[data-act]');
  if (!el) { if (S.menu && !e.target.closest('.dd')) { S.menu = null; render(); } return; }
  if (el.dataset.go !== undefined && el.dataset.go !== '') { e.preventDefault(); if (MODAL && el.closest('#modal-root')) { MODAL = null; renderModal(); } go(el.dataset.go, { id: el.dataset.id, tab: el.dataset.tab }); return; }
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-oninput]'); if (el && INP[el.dataset.oninput]) INP[el.dataset.oninput](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-onchange]'); if (el && INP[el.dataset.onchange]) INP[el.dataset.onchange](el, e); });
document.addEventListener('submit', e => { const f = e.target.closest('[data-submit]'); if (f) { e.preventDefault(); SUBMIT[f.dataset.submit] && SUBMIT[f.dataset.submit](f, e); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (MODAL && MODAL.dismissable) closeModal(); else if (S.menu) { S.menu = null; render(); } else if (S.drawer) { S.drawer = false; render(); } else if (S.demoOpen) { S.demoOpen = false; renderDemo(); } else if ($('.pop')) $('.pop').remove(); }
  if (e.key === 'Tab' && MODAL) {
    const f = $$('#modal-root .modal button:not([disabled]), #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal [contenteditable], #modal-root .modal a[href]');
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
window.addEventListener('offline', () => { S.offline = true; S.signedIn && render(); });
window.addEventListener('online', () => { S.offline = false; S.signedIn && render(); });

/* ---------- Clipboard ---------- */
function copyText(txt, msg = 'Copied to clipboard') {
  try { navigator.clipboard.writeText(txt).then(() => toast(msg), () => toast('Copy blocked by your browser — select the text and copy it manually.', 'info')); }
  catch (e) { toast('Copy blocked by your browser — select the text and copy it manually.', 'info'); }
}

const App = {
  boot() {
    if (typeof initStore === 'function') initStore(); else { W = makeWorld(S.variant); applyEdge(); }
    const h = location.hash.slice(1);
    if (h) { setRoute(h); if (h !== 'signin') S.returnTo = h; }
    render();
  },
};
