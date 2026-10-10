/* ============================================================
   UX polish v2 — Phase 5: interaction quality, accessibility, mobile.
   Presentation and navigation only; decisions, rules and statuses are unchanged.
     speed        Marking Workspace shortcuts (+ "?" help) and "Next submission"; Release & next; Approvals "Next oldest"
     focus        keyboard focus stays on the control you used when the page redraws
     mobile       tables become cards, filters open as a bottom sheet, grouped "More" sheet, learner and Teacher bottom bars
     deferred P3  IQA source list and breadcrumb, Release-queue batch scope, notification categories, System Admin limits
   Loads after clarity.js, before guard.js.
   ============================================================ */
'use strict';

/* ---------- Focus stays where you were when the page redraws ----------
   The control is found again by its tag and attributes (no CSS escaping), at the same position among identical
   controls, and only if it is visible — a hidden copy of a control can't take focus. */
const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
function focusSig(el) {
  if (!el || el === document.body || !el.closest || !el.closest('#app')) return null;
  const a = {}; el.getAttributeNames().forEach(n => { if (n === 'id' || n === 'name' || n === 'value' || n.startsWith('data-')) a[n] = el.getAttribute(n); });
  if (!Object.keys(a).length) return null;
  const same = sig => [...document.querySelectorAll('#app ' + sig.tag)].filter(x => Object.entries(sig.a).every(([k, v]) => x.getAttribute(k) === v));
  const sig = { tag: el.tagName.toLowerCase(), a, same }; sig.idx = same(sig).indexOf(el); return sig;
}
function focusBack(sig) {
  const all = sig.same(sig), el = (all[sig.idx] && visible(all[sig.idx]) && all[sig.idx]) || all.find(visible);
  if (el && !el.disabled) { el.focus({ preventScroll: true }); return document.activeElement === el; }
  return false;
}
// Diagnostics (off by default): with window.__DEBUG_REDRAW = true, or ?debug=redraw in the address, every redraw records
// what had focus, the post-render steps in order (and any that moved focus), and whether the restore ran.
// window.__redrawLog keeps the last 10. Nothing is recorded when the flag is off.
const redrawDebug = () => !!window.__DEBUG_REDRAW || /[?&#]debug=redraw/.test(location.search + location.hash);
const desc = el => !el ? 'none' : el === document.body ? 'BODY' : el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.dataset && el.dataset.act ? '[' + el.dataset.act + (el.dataset.v ? '=' + el.dataset.v : '') + ']' : '');
const stepName = f => (String(f).replace(/s+/g, ' ').match(/(navRegroup|glossaryPass|demoTidy|fiveLegend|inkLegend|dt-cards|nav-ro|cd-end|SYS_LIMITS|scOpen|dd-all|adm-search-btn|tctx)/) || [String(f).replace(/s+/g, ' ').slice(0, 40)])[0];
let REDRAW = null; window.__redrawLog = [];
afterRender = function () {
  AFTER.forEach((f, i) => { const before = REDRAW && document.activeElement; try { f(); } catch (e) { console.error(e); } if (REDRAW) REDRAW.steps.push(i + ':' + stepName(f) + (document.activeElement !== before ? ' (moved focus to ' + desc(document.activeElement) + ')' : '')); });
};
// The control last clicked or keyed counts as "the one you used" even if something blurred it before the redraw
let lastUsed = null;
['pointerdown', 'click', 'keydown'].forEach(t => document.addEventListener(t, e => { const c = e.target && e.target.closest && e.target.closest('#app button, #app [role="button"], #app input, #app select, #app textarea, #app a[href]'); if (c) lastUsed = { sig: focusSig(c), at: Date.now() }; }, true));
let redrawDepth = 0;
const _renderFin = render;
render = function () {
  const act = document.activeElement, sig = focusSig(act) || (lastUsed && Date.now() - lastUsed.at < 2000 ? lastUsed.sig : null), modal = !!MODAL;
  const outer = redrawDepth === 0; redrawDepth++;
  if (outer && redrawDebug()) REDRAW = { before: desc(act), sig: sig ? sig.tag + ' ' + JSON.stringify(sig.a) : null, modal, modalTitle: modal ? String(MODAL.title || '') : '', steps: [] };
  let r; try { r = _renderFin.apply(this, arguments); } finally { redrawDepth--; }
  if (outer) {
    // the very last step of the redraw: restore once (never while a dialog is open — focus belongs to the dialog)
    let res = { ran: false };
    if (sig && !modal && (!document.activeElement || document.activeElement === document.body)) { const all = sig.same(sig); res = { ran: true, matches: all.length, visible: all.filter(visible).length, ok: focusBack(sig) }; }
    if (REDRAW) { REDRAW.restore = res; REDRAW.end = desc(document.activeElement); window.__redrawLog.push(REDRAW); if (window.__redrawLog.length > 10) window.__redrawLog.shift(); REDRAW = null; }
  }
  return r;
};

/* ---------- Marking Workspace: keyboard shortcuts and "?" help ---------- */
const MK_KEYS = [['J / K', 'Next / previous question'], ['M / U', 'Criterion Met / Not Met'], ['R / A / G', 'Set RAG: red, amber, green'], ['1 / 2 / 3', 'Choose the exit: first, second or third option'], ['S', 'Send to Coordinator for release'], ['N', 'Next submission (after sending)'], ['?', 'Show these shortcuts']];
function mkClick(sel) { const b = document.querySelector('#main ' + sel); if (b && !b.disabled) { b.click(); return true; } return false; }
document.addEventListener('keydown', e => {
  if (S.portal !== 'staff' || S.route !== 't-mark' || e.ctrlKey || e.metaKey || e.altKey || MODAL) return;
  if (inTypingField(e.target)) return; // typing is never hijacked (same check as the "/" shortcut)
  const k = e.key, qi = S.tas.qi || 0; let done = false;
  if (k === '?') { mkHelp(); done = true; }
  else if (k === 'j' || k === 'J') done = mkClick(`[data-act="mkQ"][data-i="${qi + 1}"]`);
  else if (k === 'k' || k === 'K') done = mkClick(`[data-act="mkQ"][data-i="${qi - 1}"]`);
  else if (k === 'm' || k === 'M') done = mkClick('[data-act="mkMet"][data-v="Met"]');
  else if (k === 'u' || k === 'U') done = mkClick('[data-act="mkMet"][data-v="Not Met"]');
  else if (/^[rag]$/i.test(k)) done = mkClick(`[data-act="mkRag"][data-v="${k.toUpperCase()}"]`);
  else if (/^[123]$/.test(k)) { const r = [...document.querySelectorAll('#main input[type="radio"][name^="exit-"]:not([disabled])')][+k - 1]; if (r) { r.click(); done = true; } }
  else if (k === 's' || k === 'S') done = mkClick('[data-act="mkRelease"]');
  else if (k === 'n' || k === 'N') done = mkClick('[data-act="mkNext"]');
  if (done) e.preventDefault();
});
function mkHelp() { openModal({ title: 'Keyboard shortcuts — Marking Workspace', body: `<p class="small">They work when you are not typing in a box.</p><dl class="kv">${MK_KEYS.map(([k, d]) => `<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(d)}</dd>`).join('')}</dl>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); }
ACT.mkHelp = () => mkHelp();
if (SCREENS['t-mark']) {
  const _tm = SCREENS['t-mark'];
  SCREENS['t-mark'] = p => {
    let h = _tm(p);
    // After sending: one click to the next submission to mark (oldest first)
    if (p && p.id && typeof relStore === 'function' && relStore()[p.id]) {
      const next = tasSubs().filter(s => s.toMark && s.key !== p.id).sort((a, b) => (b.waiting || 0) - (a.waiting || 0))[0];
      h = h.replace(/(Awaiting Coordinator release<\/strong>[\s\S]*?<\/div>)(<\/div>)/, `$1${next ? `<div class="b-act"><button class="btn btn-sm btn-primary" data-act="mkNext" data-k="${next.key}">Next submission: ${esc(next.L.name)}</button></div>` : '<div class="small">Nothing else is waiting for you to mark.</div>'}$2`);
    }
    return h + (CAN('mark') === 'yes' && p && p.id ? `<p class="xs muted mk-keys">Keyboard: <button class="linklike xs" data-act="mkHelp">press ? for shortcuts</button></p>` : '');
  };
}
ACT.mkNext = el => { if (el.dataset.k) { S.tas.qi = 0; go('t-mark', { id: el.dataset.k }); } };

/* ---------- Release queue: "Release & next"; batch scope "Show all my batches" ---------- */
ACT.cooScopeAll = () => { S.coo.batch = 'all'; render(); };
ACT.relNext = el => {
  const key = el.dataset.k, rest = myRel().filter(P => P.key !== key);
  relConfirm([key]); if (!MODAL) return;
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a) return;
  const f = a.fn; a.label = rest.length ? 'Release and open the next' : 'Release to learner';
  a.fn = (...x) => { const r = f(...x); if (rest.length) setTimeout(() => go('c-release', { id: rest[0].key }), 10); return r; };
  renderModal();
};
if (typeof relDetail === 'function') {
  const _rd = relDetail;
  relDetail = key => { const h = _rd(key), more = myRel().filter(P => P.key !== key).length; return more ? h.replace(/(<button class="btn btn-primary" data-act="relOne" data-k="[^"]*">Release to learner<\/button>)/, `$1<button class="btn" data-act="relNext" data-k="${key}">Release &amp; next (${more} more)</button>`) : h; };
}

/* ---------- Approvals Queue: next oldest item awaiting you ---------- */
const _qdFin = queueDetail;
queueDetail = function (id) {
  const h = _qdFin(id), next = allQueue().filter(x => x.id !== id && isOpen(x) && awaitingMe(x)).sort((a, b) => new Date(a.raised) - new Date(b.raised))[0];
  if (!next) return h;
  const i = qItem(id), done = i && !isOpen(i);
  // Always one full-width block below the header (both forms carry .q-next, so the wrapping rule applies to both)
  const btn = `<button class="btn btn-sm ${done ? 'btn-primary' : ''} q-next-btn" data-go="a-queue" data-id="${next.id}">Next oldest awaiting you: <span class="mono">${next.id}</span> · ${esc(qLbl(next.type))} →</button>`;
  const bar = done ? `<div class="q-next note b-green" role="status">${ic('check')}<div class="small"><strong>Decided.</strong> ${btn}</div></div>` : `<div class="q-next">${btn}</div>`;
  return afterHeader(h, bar);
};

/* ---------- IQA: a record opened from Findings, a Sample set or a Portfolio keeps that list ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('#main [data-go="q-record"][data-id]'); if (!a || S.portal !== 'admin') return;
  const ids = [...new Set([...document.querySelectorAll('#main [data-go="q-record"][data-id]')].map(x => x.dataset.id))];
  S.iqa.list = ids; S.iqa.from = { r: S.route, id: (S.params || {}).id, label: ((document.querySelector('#main h1') || {}).textContent || '').trim() };
}, true);
if (SCREENS['q-record']) {
  const _qrec = SCREENS['q-record'];
  SCREENS['q-record'] = p => { const h = _qrec(p), f = S.iqa && S.iqa.from; if (!f || !p || !p.id || !(S.iqa.list || []).includes(p.id)) return h; return h.replace(/<a href="#q-records" data-go="q-records"\s*>Assessment Records<\/a>/, `<a href="#${f.r}${f.id ? '.' + esc(f.id) : ''}" data-go="${f.r}" ${f.id ? `data-id="${esc(f.id)}"` : ''}>${esc(f.label || 'Back')}</a>`); };
}

/* ---------- System Admin: the Super-Admin-only parts are marked in the sidebar ---------- */
const SYS_LIMITS = { 'a-queue': 'Escalated items and the final Data Correction approval are decided by the Super Administrator.', 'a-roles': 'The Super Administrator role can\'t be granted or changed by a System Administrator.', 'a-staff': 'Super Administrator accounts are locked for System Administrators.', 'a-config': 'The bundle minimum price is set by the Super Administrator.' };
AFTER.push(() => {
  if (!(typeof isSys === 'function' && isSys())) return;
  Object.entries(SYS_LIMITS).forEach(([r, why]) => { const a = document.querySelector(`#app nav.adm-side a[data-go="${r}"]`); if (a && !a.querySelector('.nav-ro')) a.insertAdjacentHTML('beforeend', `<span class="nav-ro" title="${esc(why)}">${ic('lock', 12)}<span class="sr">Partly Super Administrator only: ${esc(why)}</span></span>`); });
});

/* ---------- Mobile: tables become cards (labels from the column headers), grouped "More" sheet ---------- */
AFTER.push(() => {
  document.querySelectorAll('#app .dt table.tbl').forEach(t => {
    const hd = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, k) => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', hd[k] || ''); }));
    t.classList.add('dt-cards');
  });
  // learner "More" sheet: same groups as the sidebar, everything listed
  const panel = document.querySelector('#app .drawer .d-panel'); if (!panel || panel.querySelector('.nav-groups') || S.portal !== 'learner') return;
  const ul = panel.querySelector('ul.nav'); if (!ul) return;
  const lis = [...ul.children], route = li => (li.querySelector('[data-go]') || { dataset: {} }).dataset.go;
  const box = document.createElement('div'); box.className = 'nav-groups'; const used = new Set();
  NAV_GROUPS.learner.concat([['More', lis.map(route)]]).forEach(([label, rs]) => { const items = rs.map(r => lis.find(li => route(li) === r && !used.has(li))).filter(Boolean); if (!items.length) return; items.forEach(li => used.add(li)); const g = document.createElement('div'); g.className = 'nav-grp'; g.innerHTML = `<h2 class="nav-gh">${esc(label)}</h2>`; const u = document.createElement('ul'); u.className = 'nav'; items.forEach(li => u.appendChild(li)); g.appendChild(u); box.appendChild(g); });
  ul.replaceWith(box);
});

/* ---------- Learner bottom bar: the top tasks ---------- */
const _bnavFin = bottomNav;
bottomNav = function () {
  const h = _bnavFin(), c = navCounts(), sec = SECTION[S.route] || S.route;
  const items = W.flags.nvq ? [['dashboard', 'Home', 'home'], ['assignments', 'Assignments', 'edit'], ['payments', 'Payments', 'card'], ['messages', 'Messages', 'msg']] : [['dashboard', 'Home', 'home'], ['courses', 'Courses', 'book'], ['certificates', 'Certificates', 'award'], ['messages', 'Messages', 'msg']];
  const btns = items.map(([r, l, i]) => `<button data-go="${r}" ${sec === r ? 'aria-current="page"' : ''}>${ic(i, 22)}${l}${c[r] ? `<span class="badge">${c[r]}</span>` : ''}</button>`).join('');
  return h.replace(/<nav class="bnav" aria-label="Main \(mobile\)">[\s\S]*?(<button data-act="drawer")/, `<nav class="bnav" aria-label="Main (mobile)">${btns}$1`);
};

/* ---------- UX Changelog ---------- */
UXC.push(['Phase 5', 'UX polish v2 — interaction, accessibility, mobile', [
  'Minimum price: the System Configuration setting "Bundle price floor" is now "Bundle minimum price", and the internal item type uses the agreed name "Bundle price below minimum", so the old word no longer appears anywhere for this rule (two mock sentences about a care-home floor are about an actual floor and stay). The crawl now fails any page that uses it.',
  'Marking Workspace: keyboard shortcuts — J/K next and previous question, M/U Met / Not Met, R/A/G set RAG, 1/2/3 choose the exit, S send to Coordinator, N next submission, ? shows the list. Shortcuts never act while you are typing. After sending, "Next submission: <name>" opens the next one to mark (oldest first).',
  'Release queue: "Release & next (N more)" releases with the same confirmation and opens the next item. The queue honours the header "Batch in scope" like every other Coordinator page ("Showing 2 of 5 for the batch in scope · Show all my batches"); the sidebar badge stays the total.',
  'Approvals Queue item: "Next oldest awaiting you: <ID> · <type> →" at the top; after a decision it becomes "Decided. Next oldest awaiting you…".',
  'Focus: after any control redraws the page (Met, RAG, exits, seat ticks, observation toggles…), keyboard focus returns to that control instead of being lost.',
  'IQA: a record opened from Findings, a Sample set or a Portfolio keeps that list for Previous / Next, and its breadcrumb goes back there; a header-search hit for an assessor or assignment now opens Assessment Records with that filter applied (it was wiped).',
  'Notifications: Coordinator gets a "Release" tab; the learner gets Requests, Enrolment, Account and Other tabs when they have notifications (they were only under All).',
  'System Admin sidebar: Approvals Queue, Roles & Capabilities, Staff & Users and System Configuration carry a lock with the Super-Admin-only part named ("Super Administrator accounts are locked for System Administrators" …).',
  'Mobile: shared tables turn into cards under 640px (each value labelled with its column); filters open as a bottom sheet; learner bottom bar Home · Assignments · Payments · Messages · More (short-course learners: Home · Courses · Certificates · Messages · More); Teacher-only bar Home · Sessions · Students · Calendar · More; the learner "More" sheet is grouped like the sidebar.',
  'Accessibility: touch targets at least 44 × 44 px on touch screens; muted text on grey surfaces darkened (table headers, sidebar headings, badges); the 15-second Undo bar is announced once, not every second.',
]]);
UXC.find(x => x[0] === 'Phase 5')[2].push('Fix (phase5a regression): the phone card layout had let wide cells (IDs, emails, chips, row actions) push the page sideways at 390 px; cards now put each label above its value, everything wraps, and the table wrapper still scrolls as a last resort. The "Next oldest awaiting you" button wraps too. Focus return now finds the control by its attributes and position and only focuses a visible copy.');

/* ---------- Insert content right after the page header (as a sibling, never inside its flex row) ---------- */
function afterHeader(h, ins) {
  const t = document.createElement('template'); t.innerHTML = h; const head = t.content.querySelector('.page-h');
  if (!head) return ins + h;
  head.insertAdjacentHTML('afterend', ins);
  const box = document.createElement('div'); box.appendChild(t.content.cloneNode(true)); return box.innerHTML;
}
UXC.find(x => x[0] === 'Phase 5')[2].push('Fix (phase5b): the "Next oldest awaiting you" bar and the IQA attention strip were inserted inside the page header\'s actions row (the header has a status chip or button there), which overflowed at 390 px; both now go right after the header. Focus restore runs once, as the very last step of every redraw, and also remembers the control you clicked or keyed even if it lost focus first. The crawl now names the element that overflows on any page that does.');
UXC.find(x => x[0] === 'Phase 5')[2].push('Fix (phase5c): the "Next oldest awaiting you" bar is always a full-width block below the header and its button label wraps (the "Decided." form had missed the wrapping rule). Redraw diagnostics are off by default (window.__DEBUG_REDRAW or ?debug=redraw).');
