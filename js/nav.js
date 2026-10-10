/* ============================================================
   UX polish v2 — Phase 3: navigation and wayfinding.
   Presentation only: no flow, rule, permission or status change. Every screen stays reachable
   (rarely used sidebar items move under "More", which is part of the page).
     sidebars     grouped by frequency per role, one label per route, "More" above ~10 items
     breadcrumbs  automatic on detail pages that had none
     back         browser back and in-app back return to the list with filters, page and scroll position
     dead ends    notifications, banners, role switches and links lead somewhere real
     search       admin search grouped by type, typeahead, "/" to focus, Esc to close, recent searches
     dashboards   "Needs your attention" first; "You're all caught up" when empty
     role switch  multi-role users land on the equivalent page
     demo panel   Roles → Variants → Edge states → Demo-only → Inboxes → Demo Scenarios → Reset
   Loads after ds.js.
   ============================================================ */
'use strict';

/* ---------- One label per route (sidebars and breadcrumbs) ---------- */
const NAV_LABEL = { 'a-bundles': 'Bundles & Pricing', 'a-referrals': 'Referrals', 'a-scheduling': 'Scheduling', 'a-attendance': 'Attendance', 'a-records': 'Assessment Records', 'a-reports': 'Reports', 'a-me': 'My Profile', 'f-agency': 'Agency Payments', 'f-learners': 'Learner Accounts', 'f-exceptions': 'Payment Exceptions', 'f-plans': 'Payment Plans', 't-approvals': 'My Requests', 'k-calendar': 'Calendar Monitoring' };
// Super / System Admin get a Notifications page like every other admin role
if (typeof ANAV !== 'undefined' && !ANAV.some(([, it]) => it.some(x => x[0] === 'a-notifications'))) ANAV[0][1].push(['a-notifications', 'Notifications', 'bell']);

/* ---------- Sidebar groups, ordered by how often each role uses them; the rest under "More" ---------- */
const NAV_GROUPS = {
  learner: [['Learn', ['dashboard', 'courses', 'assignments', 'admission', 'progress', 'calendar']], ['Account', ['payments', 'certificates', 'requests', 'messages', 'notifications']]],
  admin: [['Daily', ['a-dashboard', 'a-queue', 'a-notifications', 'a-messages']], ['People', ['a-learners', 'a-admissions', 'a-staff']], ['Programmes', ['a-batches', 'a-records']], ['Money', ['a-finance', 'a-agencies']]],
  fin: [['Daily', ['f-dashboard', 'a-queue', 'f-notifications', 'f-messages']], ['Money', ['f-overdue', 'f-ledger', 'f-plans', 'f-refunds', 'f-deposits']]],
  aca: [['Daily', ['k-dashboard', 'a-queue', 'k-notifications', 'a-messages']], ['Learners', ['a-learners', 'a-admissions', 'a-batches', 'a-scheduling']], ['Quality', ['a-records', 'a-observations']]],
  biz: [['Daily', ['b-dashboard', 'a-queue', 'b-notifs', 'b-messages']], ['Commercial', ['a-agencies', 'a-bundles', 'b-licences', 'a-referrals']]],
  iqa: [['Quality', ['q-records', 'q-findings', 'q-sets', 'q-portfolios']], ['Me', ['q-notifs', 'a-me']]],
  coord: [['Daily', ['c-dashboard', 'c-release', 'c-submissions', 'c-learners']], ['Batches', ['c-batches', 'c-timeline', 'c-progress', 'c-obs']], ['Communication', ['c-messages', 'c-notifications']]],
  staff: [['Marking', ['t-dashboard', 't-queue', 't-students', 't-obs', 't-pd']], ['Delivery', ['t-sessions', 't-calendar', 't-assign']], ['Communication', ['t-messages', 't-notifications']]],
  teach: [['Teaching', ['t-dashboard', 't-sessions', 't-students', 't-assign', 't-calendar']], ['Communication', ['t-messages', 't-announcements', 't-notifications']]],
  agency: [['Daily', ['g-dashboard', 'g-learners', 'g-seats', 'g-certs']], ['Buying', ['g-bundles', 'g-buy', 'g-purchases']], ['Communication', ['g-messages', 'g-notifs']]],
};
function navKey() {
  if (S.portal === 'learner') return 'learner';
  if (S.portal === 'coord') return 'coord';
  if (S.portal === 'agency') return 'agency';
  if (S.portal === 'staff') return typeof CAN === 'function' && CAN('mark') === 'no' ? 'teach' : 'staff';
  if (S.portal === 'admin') return (typeof isIqa === 'function' && isIqa()) ? 'iqa' : (typeof isBiz === 'function' && isBiz()) ? 'biz' : (typeof isAca === 'function' && isAca()) ? 'aca' : (typeof isFin === 'function' && isFin()) ? 'fin' : 'admin';
  return null;
}
function navRegroup() {
  const key = navKey(), cfg = NAV_GROUPS[key]; if (!cfg || !S.signedIn) return;
  const nav = document.querySelector(key === 'learner' ? '#app nav.side' : '#app nav.adm-side'); if (!nav) return;
  if (nav.querySelector('.nav-groups')) return;
  const lis = [...nav.querySelectorAll('ul > li')].filter(li => !li.closest('.dd'));
  if (!lis.length) return;
  const route = li => { const a = li.querySelector('[data-go]'); return a ? a.dataset.go : ''; };
  lis.forEach(li => { const l = NAV_LABEL[route(li)], sp = li.querySelector(':scope > a > span:not(.cnt):not(.nav-tag)'); if (l && sp) sp.textContent = l; });
  const first = lis[0].closest('.adm-group') || lis[0].parentElement;
  const holders = new Set(lis.map(li => li.closest('.adm-group') || li.parentElement));
  const ulCls = key === 'learner' ? 'nav' : '';
  const box = document.createElement('div'); box.className = 'nav-groups';
  const used = new Set();
  const mk = (label, items) => { const g = document.createElement('div'); g.className = 'adm-group nav-grp'; g.innerHTML = `<h2 class="nav-gh">${esc(label)}</h2>`; const ul = document.createElement('ul'); if (ulCls) ul.className = ulCls; items.forEach(li => ul.appendChild(li)); g.appendChild(ul); return g; };
  cfg.forEach(([label, routes]) => { const items = routes.map(r => lis.find(li => route(li) === r && !used.has(li))).filter(Boolean); items.forEach(li => used.add(li)); if (items.length) box.appendChild(mk(label, items)); });
  const rest = lis.filter(li => !used.has(li));
  if (rest.length) {
    const cur = rest.some(li => li.querySelector('a[aria-current="page"]'));
    const d = document.createElement('details'); d.className = 'nav-more'; if (cur || S.ui.navMore) d.open = true;
    d.innerHTML = `<summary class="nav-gh" data-act="navMore">More <span class="xs">(${rest.length})</span></summary>`;
    const ul = document.createElement('ul'); if (ulCls) ul.className = ulCls; rest.forEach(li => ul.appendChild(li)); d.appendChild(ul); box.appendChild(d);
  }
  first.before(box); holders.forEach(h => { if (h !== box && !h.querySelector('li')) h.remove(); });
}
// The shared click handler prevents the default action, so the "More" summary opens and closes itself here
ACT.navMore = el => { const d = el.closest('details'); if (!d) return; d.open = !d.open; setUi('navMore', d.open); };
AFTER.push(navRegroup);

/* ---------- Breadcrumbs on every detail page ---------- */
const LIST_OF = { 'a-learner': 'a-learners', course: 'courses', quiz: 'courses', assignment: 'assignments', thread: 'messages', 'c-learner': 'c-learners', 'c-sub': 'c-submissions', 'q-record': 'q-records', 'q-finding': 'q-findings', 'g-learner': 'g-learners', 'g-bundle': 'g-bundles', 'g-purchase': 'g-purchases', 't-mark': 't-queue', 't-obsrec': 't-obs' };
function navLabelOf(r) {
  if (NAV_LABEL[r]) return NAV_LABEL[r];
  const lists = [typeof NAV !== 'undefined' ? NAV : [], typeof CNAV !== 'undefined' ? CNAV : [], typeof TNAV !== 'undefined' ? TNAV : [], typeof GNAV !== 'undefined' ? GNAV : [], ...(typeof ANAV !== 'undefined' ? ANAV.map(g => g[1]) : []), ...(typeof KNAV !== 'undefined' ? KNAV.map(g => g[1]) : []), ...(typeof BNAV !== 'undefined' ? BNAV.map(g => g[1]) : []), ...(typeof QNAV !== 'undefined' ? QNAV.map(g => g[1]) : []), ...(typeof FNAV !== 'undefined' ? FNAV.map(g => g[1]) : [])];
  for (const l of lists) { const x = (l || []).find(y => Array.isArray(y) && y[0] === r); if (x) return x[1]; }
  return null;
}
const _pageHeadNav = pageHead;
pageHead = function (title, sub, actions, crumbs) {
  if (!crumbs && S.params && S.params.id && S.signedIn) {
    const list = LIST_OF[S.route] || S.route, label = navLabelOf(list);
    const plain = String(title || '').replace(/<[^>]+>/g, '').trim();
    if (label && plain && plain !== label && !/^Good (morning|afternoon|evening)/.test(plain)) crumbs = [[label, list], [plain]];
  }
  return _pageHeadNav(title, sub, actions, crumbs);
};

/* ---------- Back keeps the list as you left it: filters and page live in the table state; scroll is remembered here ---------- */
const NAV_SCROLL = {};
const navTok = () => routeTok(S.route, S.params || {});
const _goNav = go;
go = function (route, params = {}) {
  const from = navTok(); NAV_SCROLL[from] = window.scrollY;
  const r = _goNav(route, params), to = navTok();
  if (NAV_SCROLL[to] && !(params && params.id)) window.scrollTo(0, NAV_SCROLL[to]);
  return r;
};
window.addEventListener('popstate', () => { const y = NAV_SCROLL[navTok()]; if (y) setTimeout(() => window.scrollTo(0, y), 0); });

/* ---------- Dead ends ---------- */
// The integration banner links only for roles that can open Integrations; others are told who was notified (the seeded
// "SMS integration failing" notification goes to the Super Administrator — no new alert is sent)
function canIntegrations() {
  if (!ADMIN || !ADMIN.me) return false;
  if ([typeof isFin === 'function' && isFin(), typeof isAca === 'function' && isAca(), typeof isBiz === 'function' && isBiz(), typeof isIqa === 'function' && isIqa()].some(Boolean)) return false;
  return ADMIN.me.roles.some(r => r === 'Super Administrator' || r === 'System Administrator');
}
// Related-record links to a-learners.<id> open Learner 360 (the list ignored the id)
if (SCREENS['a-learners'] && SCREENS['a-learner']) { const _al = SCREENS['a-learners']; SCREENS['a-learners'] = p => (p && p.id && typeof learnerById === 'function' && learnerById(p.id)) ? SCREENS['a-learner'](p) : _al(p); }
// Teacher dashboard KPIs open the matching queue tab
if (SCREENS['t-queue']) { const _tq = SCREENS['t-queue']; SCREENS['t-queue'] = p => { if (p && p.tab && typeof MQ_TABS !== 'undefined' && MQ_TABS[p.tab]) setUi('mqTab', p.tab); return _tq(p); }; }
// Teacher-only users: notifications only for screens they can open (the bell count follows)
if (typeof tasNotifs === 'function') { const _tn = tasNotifs; tasNotifs = function () { return _tn().filter(n => { const r = String(n.go || '').split('.')[0]; const cap = typeof T_ROUTE_CAP !== 'undefined' && T_ROUTE_CAP[r]; return !cap || CAN(cap) !== 'no'; }); }; }
// Learner "To do" tab matches the Assignments badge (closed items stay under All)
if (typeof ASG_TABS !== 'undefined') ASG_TABS.todo[1] = a => ['Not Started', 'Resubmission Required'].includes(a.status) && !a.closed;
// "View feedback" opens the assignment at the feedback
AFTER.push(() => { if (S.route === 'assignment' && S.params && S.params.tab === 'feedback') { const h = [...document.querySelectorAll('#main h2')].find(x => /Overall comment|feedback/i.test(x.textContent)); if (h && !h.dataset.navScrolled) { h.dataset.navScrolled = '1'; h.scrollIntoView({ block: 'start' }); } } });
// Coordinator notifications open the learner or submission they are about
if (typeof cooNotifs === 'function') {
  const _cn = cooNotifs;
  cooNotifs = function () {
    const L = typeof myLearners === 'function' ? myLearners() : [], subs = typeof mySubmissions === 'function' ? mySubmissions() : [];
    return _cn().map(n => {
      if (!['c-learners', 'c-submissions', 'c-progress'].includes(n.go)) return n;
      const who = L.find(l => (n.b || '').startsWith(l.name)); if (!who) return n;
      const s = n.go === 'c-submissions' && subs.find(x => x.L.lid === who.lid && (n.b || '').includes(x.a.title.split(' —')[0]));
      return { ...n, go: s ? 'c-sub.' + s.key : 'c-learner.' + who.lid };
    });
  };
}

/* ---------- Notifications page for Super / System Admin; "View all" in every admin bell ---------- */
SCREENS['a-notifications'] = () => {
  const list = ADMIN.myNotifs || [];
  return `${pageA('Notifications', 'Everything sent to you, newest first.', `<button class="btn" data-act="aMarkRead">Mark all read</button>`)}${nfList('A', list, (n, k) => `<li class="li">${n.unread ? '<span class="unread-dot"></span><span class="sr">Unread</span>' : '<span class="read-dot"></span>'}<div class="li-b"><strong class="small">${esc(n.t)}</strong><span class="xs muted">${esc(n.b)} · ${fdt(n.at)}</span></div>${n.go ? `<button class="btn btn-sm" data-act="aOpenNotif" data-i="${list.indexOf(n)}">Open</button>` : ''}</li>`, {})}`;
};
const notifRoute = () => ({ iqa: 'q-notifs', biz: 'b-notifs', aca: 'k-notifications', fin: 'f-notifications' }[navKey()] || 'a-notifications');
AFTER.push(() => { const dd = document.querySelector('#app .dd[aria-label="Notifications"]'); if (dd && S.portal === 'admin' && !dd.querySelector('.dd-all') && SCREENS[notifRoute()]) dd.insertAdjacentHTML('beforeend', `<div class="dd-all"><button class="linklike small" data-go="${notifRoute()}">View all notifications</button></div>`); });

/* ---------- Admin search: grouped by type, typeahead, "/" to focus, Esc to close, recent searches ---------- */
const SEARCH_ORDER = ['Learner', 'Queue item', 'Staff', 'Agency', 'Batch', 'Course', 'Certificate', 'Transaction'];
// Same sources and matching as before (admin-core.js), grouped by type with up to 5 results each instead of 10 overall
searchResults = function (q) {
  q = q.toLowerCase(); const r = [];
  allLearners().forEach(l => { if ((l.name + l.id + l.email).toLowerCase().includes(q)) r.push(['Learner', l.name + ' · ' + l.id, 'a-learner.' + l.id]); });
  allQueue().forEach(i => { if (i.id.toLowerCase().includes(q)) r.push(['Queue item', i.id + ' · ' + i.type, 'a-queue.' + i.id]); });
  ADMIN.staff.forEach(s => { if ((s.name + s.email).toLowerCase().includes(q)) r.push(['Staff', s.name, 'a-staff.' + s.id]); });
  ADMIN.agencies.forEach(a => { if (a.name.toLowerCase().includes(q)) r.push(['Agency', a.name, 'a-agencies.' + a.id]); });
  ADMIN.batches.forEach(b => { if ((b.code + b.label).toLowerCase().includes(q)) r.push(['Batch', b.label + ' — ' + b.code, 'a-batches.' + b.code]); });
  ADMIN.courses.forEach(c => { if (c.title.toLowerCase().includes(q)) r.push(['Course', c.title, 'a-courses.' + c.id]); });
  allCerts().forEach(c => { if (c.no.toLowerCase().includes(q)) r.push(['Certificate', c.no + ' · ' + c.learner, 'a-certificates.' + c.key]); });
  allTx().forEach(t => { if (t.ref.toLowerCase().includes(q)) r.push(['Transaction', t.ref + ' · ' + t.payer, 'a-finance']); });
  const groups = SEARCH_ORDER.map(g => [g, r.filter(x => x[0] === g)]).filter(([, l]) => l.length);
  const li = x => `<li><button class="dd-item" data-act="goTok" data-t="${x[2]}"><span class="typebadge">${x[0]}</span><span class="small">${esc(x[1])}</span></button></li>`;
  return `<div class="dd adm-sr" style="left:0;right:auto;top:42px;width:min(520px,90vw)">${groups.length ? groups.map(([g, l]) => `<div class="sr-grp"><div class="sr-gh xs">${esc(g)}${l.length > 5 ? ` · showing 5 of ${l.length}` : ''}</div><ul class="dd-list">${l.slice(0, 5).map(li).join('')}</ul></div>`).join('') : '<ul class="dd-list"><li class="dd-item small muted">No matches. Try a name, an ID, an email or a reference.</li></ul>'}<p class="xs muted sr-hint">Press <kbd>/</kbd> to search from anywhere · <kbd>Esc</kbd> to close</p></div>`;
};
const recentSearch = () => (S.ui.recentSearch = S.ui.recentSearch || []);
document.addEventListener('click', e => { const b = e.target.closest('.adm-sr .dd-item[data-t]'); if (!b) return; const r = recentSearch(), lbl = (b.querySelector('.small') || b).textContent.trim(); const x = { t: b.dataset.t, l: lbl, k: (b.querySelector('.typebadge') || {}).textContent || '' }; S.ui.recentSearch = [x, ...r.filter(y => y.t !== x.t)].slice(0, 5); }, true);
document.addEventListener('focusin', e => { if (e.target && e.target.id === 'asearch' && !S.aq && recentSearch().length && !document.querySelector('.adm-sr')) { e.target.insertAdjacentHTML('afterend', `<div class="dd adm-sr" style="left:0;right:auto;top:42px;width:min(520px,90vw)"><div class="sr-gh xs">Recent searches</div><ul class="dd-list">${recentSearch().map(x => `<li><button class="dd-item" data-act="goTok" data-t="${esc(x.t)}"><span class="typebadge">${esc(x.k)}</span><span class="small">${esc(x.l)}</span></button></li>`).join('')}</ul></div>`); } });
document.addEventListener('focusout', e => { if (e.target && e.target.id === 'asearch' && !S.aq) setTimeout(() => { const d = document.querySelector('.adm-sr'); if (d && !d.contains(document.activeElement)) d.remove(); }, 150); });
// One check for every keyboard shortcut: no shortcut acts while focus is in a box you type or choose in
const inTypingField = t => !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]'));
document.addEventListener('keydown', e => {
  const inField = inTypingField(e.target);
  if (e.key === '/' && !inField && !e.ctrlKey && !e.metaKey && !e.altKey) { const i = document.querySelector('#asearch, #csearch, #tsearch, #gsearch'); if (i) { e.preventDefault(); const box = i.closest('.hdr-search'); if (box) box.classList.add('show'); i.focus(); } }
  if (e.key === 'Escape' && e.target && ['asearch', 'csearch', 'tsearch', 'gsearch'].includes(e.target.id)) {
    if (e.target.id === 'asearch' && S.aq) { S.aq = ''; render(); const i = $('#asearch'); if (i) i.focus(); }
    else { const d = document.querySelector('.adm-sr'); if (d) d.remove(); }
    const box = document.querySelector('.hdr-search.show'); if (box) box.classList.remove('show');
  }
});
// Phones: a search button opens the header search (it was hidden below 860px with no replacement)
AFTER.push(() => { const s = document.querySelector('#app .adm-search'); if (!s || document.querySelector('#app .adm-search-btn')) return; const right = document.querySelector('#app .hdr-right'); if (right) right.insertAdjacentHTML('afterbegin', `<button class="icon-btn adm-search-btn" data-act="navSearch" aria-label="Search">${ic('search')}</button>`); });
ACT.navSearch = () => { const box = document.querySelector('#app .adm-search'); if (!box) return; box.classList.toggle('show'); const i = box.querySelector('input'); if (i && box.classList.contains('show')) i.focus(); };

/* ---------- Dashboards: "Needs your attention" first ---------- */
const ATTN = { 'a-dashboard': /^My approvals$/, 'f-dashboard': /^Awaiting my approval$/, 'c-dashboard': /^Needs attention$/, 'g-dashboard': /^Needs attention$/, 'b-dashboard': /^Awaiting me$/, 'k-dashboard': /^Awaiting my decision$/ };
function attentionFirst(h, re) {
  const t = document.createElement('template'); t.innerHTML = h; const root = t.content;
  const h2 = [...root.querySelectorAll('h2')].find(x => re.test(x.textContent.trim())); if (!h2) return h;
  let block = h2; while (block.parentNode && block.parentNode !== root) block = block.parentNode;
  const head = root.querySelector('.page-h'); if (!head || block === head) return h;
  let after = head; while (after.nextElementSibling && after.nextElementSibling.matches('.note, .banner') && after.nextElementSibling !== block) after = after.nextElementSibling;
  const orig = h2.textContent.trim(), tn = [...h2.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
  if (tn) tn.textContent = 'Needs your attention'; else h2.append('Needs your attention');
  h2.insertAdjacentHTML('afterend', `<span class="xs muted attn-sub">${esc(orig)}</span>`);
  if (after.nextElementSibling !== block) after.after(block);
  const box = document.createElement('div'); box.appendChild(root.cloneNode(true)); return box.innerHTML;
}
Object.keys(ATTN).forEach(r => { const f = SCREENS[r]; if (!f) return; SCREENS[r] = p => { const h = f(p); try { return attentionFirst(h, ATTN[r]); } catch (e) { return h; } }; });
// IQA lands on Assessment Records: an attention strip leads the page
if (SCREENS['q-records']) {
  const _qr = SCREENS['q-records'];
  SCREENS['q-records'] = p => {
    const h = _qr(p); if (p && p.id) return h;
    const open = (ADMIN.iqa || []).filter(f => (f.status || 'Open') === 'Open'), sets = (ADMIN.sampleSets || ADMIN.qSets || []).filter(s => !/Closed|Completed/i.test(s.status || ''));
    const items = [];
    if (open.length) items.push(`<li class="li"><div class="li-b"><strong class="small">${plural(open.length, 'finding')} awaiting the assessor's acknowledgement</strong><span class="xs muted">Oldest ${fd(open.map(f => f.at || f.raised || now().toISOString()).sort()[0])}</span></div><button class="btn btn-sm" data-go="q-findings">Open findings</button></li>`);
    if (sets.length) items.push(`<li class="li"><div class="li-b"><strong class="small">${plural(sets.length, 'sample set')} in progress</strong></div><button class="btn btn-sm" data-go="q-sets">Open sample sets</button></li>`);
    const strip = `<section class="card attn-strip"><h2>${ic('flag')}Needs your attention</h2>${items.length ? `<ul class="list">${items.join('')}</ul>` : emptyState({ icon: 'check', title: 'You\'re all caught up', why: 'No open findings or sample sets need you right now.' })}</section>`;
    return afterHeader(h, strip); // after the header element, not inside its actions row
  };
}

/* ---------- Learner: agency consent requests sit inside "Action needed" and count ---------- */
if (SCREENS.dashboard) {
  const _ld = SCREENS.dashboard;
  SCREENS.dashboard = p => {
    const h = _ld(p), i = h.indexOf('<div class="hello">'); if (i <= 0) return h;
    const notes = h.slice(0, i), rest = h.slice(i), n = (notes.match(/data-act="consentDo"[^>]*data-y="1"/g) || []).length; if (!n) return h;
    let r = rest.replace(/(\d+) (action|actions) needed/, (m, k) => plural(+k + n, 'action') + ' needed');
    if (r.includes('class="action-panel"')) return r.replace(/<span class="small strong">(\d+) (item|items)<\/span>/, (m, k) => `<span class="small strong">${plural(+k + n, 'item')}</span>`).replace('</ul></section>', `</ul><div class="ap-consent">${notes}</div></section>`);
    return r.replace('</div>', `</div><section class="action-panel" aria-labelledby="ap-h"><div class="ap-h"><h2 id="ap-h" class="row">${ic('flag')}Action needed</h2><span class="small strong">${plural(n, 'item')}</span></div><div class="ap-consent">${notes}</div></section>`);
  };
}

/* ---------- Role switch: real portals for every option, and the equivalent page ---------- */
// Learner variant E (Tom Whitfield) also teaches Croydon Cohort 4; Coordinator C (Dr Helen Carter) is also a Teacher with no teaching allocation yet
if (typeof TAS_USERS !== 'undefined') {
  // Plain data (setup code assigns batches on every user at load and on Reset — never use getters or frozen values here)
  TAS_USERS.W = { key: 'W', name: 'Tom Whitfield', first: 'Tom', email: 'tom.whitfield@illumin-academy.example', roles: ['Teacher'], label: 'W · Teacher (also a learner)', batches: [], multi: true, alt: 'learner', quals: '', reg: '' };
  TAS_USERS.H = { key: 'H', name: 'Dr Helen Carter', first: 'Helen', email: 'helen.carter@illumin-academy.example', roles: ['Teacher'], label: 'H · Teacher (also Academic Coordinator)', batches: [], multi: true, alt: 'coord', quals: '', reg: '' };
  // Tom's batch is looked up after the admin data is (re)built. ADMIN.batches and their labels come from buildAdmin()
  // (Reset runs initStore() and then buildAdmin()), and the Academic set-up then restores every teacher's batches from
  // STORE.aca.tasOrig — so the value is set after buildAdmin and recorded in that snapshot as well.
  const navSetW = () => {
    const b = (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches || []).find(x => x.label === 'Croydon Cohort 4');
    TAS_USERS.W.batches = b ? [b.code] : [];
    if (typeof STORE !== 'undefined' && STORE.aca && STORE.aca.tasOrig) STORE.aca.tasOrig.W = TAS_USERS.W.batches.slice();
  };
  const _baNav = buildAdmin; buildAdmin = function (av) { const r = _baNav(av); navSetW(); return r; };
  const _isNav = initStore; initStore = function () { _isNav(); navSetW(); };
  if (typeof ADMIN !== 'undefined' && ADMIN) navSetW();
}
const EQUIV = [['messages', 'c-messages', 't-messages', 'f-messages', 'a-messages', 'g-messages', 'b-messages'], ['notifications', 'c-notifications', 't-notifications', 'f-notifications', 'a-notifications', 'k-notifications', 'b-notifs', 'q-notifs', 'g-notifs'], ['calendar', 'c-timeline', 't-calendar', 'a-scheduling'], ['profile', 'c-profile', 't-profile', 'a-me', 'g-profile'], ['c-learners', 't-students', 'a-learners'], ['a-queue'], ['announcements', 'c-announcements', 't-announcements', 'a-announcements']];
function equivRoute(from) { const g = EQUIV.find(x => x.includes(from)); if (!g) return null; const have = new Set([...document.querySelectorAll('#app nav.side a[data-go], #app nav.adm-side a[data-go]')].map(a => a.dataset.go)); return g.find(r => r !== from && have.has(r)) || (have.has(from) ? from : null); }
const keepPage = fn => function (el) { const from = S.route, p0 = S.portal; const r = fn.apply(this, arguments); const eq = equivRoute(from); if (eq && eq !== S.route && (S.portal !== p0 || !/dashboard|records$/.test(eq))) go(eq); return r; };
['sCtx', 'finCtx', 'bCtx', 'mCtx', 'kCtx', 'qCtx'].forEach(k => { if (INP[k]) INP[k] = keepPage(INP[k]); });
const _role = INP.role;
INP.role = keepPage(el => { if (/Teacher/.test(el.value) && TAS_USERS.W) { S.role = 'Learner'; S.tas.v = 'W'; S.portal = 'staff'; S.signedIn = true; go('t-dashboard'); toast('Viewing as Tom Whitfield — Teacher', 'info'); return; } _role(el); });
const _cooCtx = INP.cooCtx;
INP.cooCtx = keepPage(el => { if (el.value === 'Teacher' && TAS_USERS.H) { S.coo.ctx = 'Academic Coordinator'; S.tas.v = 'H'; S.portal = 'staff'; S.signedIn = true; go('t-dashboard'); toast('Role: Teacher (Dr Helen Carter)', 'info'); return; } _cooCtx(el); });
const _tasCtx = INP.tasCtx;
INP.tasCtx = keepPage(el => {
  const me = TAS_USERS[S.tas.v] || {};
  if (me.alt === 'learner' && el.value === 'Learner') { S.portal = 'learner'; S.role = 'Learner'; setVariant('E'); S.signedIn = true; go('dashboard'); toast('Viewing as Tom Whitfield — Learner', 'info'); return; }
  if (me.alt === 'coord' && el.value === 'Academic Coordinator') { S.coo.v = 'C'; S.coo.ctx = 'Academic Coordinator'; S.portal = 'coord'; S.signedIn = true; go('c-dashboard'); toast('Role: Academic Coordinator (Dr Helen Carter)', 'info'); return; }
  return _tasCtx(el);
});
// The staff header shows the right "other role" for W (Learner) and H (Academic Coordinator)
AFTER.push(() => { if (S.portal !== 'staff') return; const me = TAS_USERS[S.tas.v] || {}, sel = document.querySelector('#tctx'); if (!sel || !me.alt) return; sel.innerHTML = `<option selected>Teacher</option><option>${me.alt === 'learner' ? 'Learner' : 'Academic Coordinator'}</option>`; });

/* ---------- Demo panel: one order, a line for every section, the current role on the button ---------- */
const DEMO_ORDER = [['Roles', /^(role|portal|sign in as|switch)/i, 'Switch to any of the 12 role views. All share one data store.'], ['Variants', /variant|identity|identities|user$|users$|agency$|learner$/i, 'Different people and situations within the current role.'], ['Edge states', /edge|session|sign-in|state/i, 'Error, empty, locked and timeout states for this view.'], ['Demo-only controls', /demo only|demo-only|simulat|sub-states|controls|time|nvq|view/i, 'Prototype-only actions that stand in for things that happen outside the app.'], ['Inboxes', /inbox|email/i, 'The emails and codes this prototype "sends".'], ['Demo Scenarios', /scenario/i, 'The 17 end-to-end scenarios, step by step.'], ['Reset', /reset/i, 'Put every demo record back to its starting state.']];
function demoWho() {
  if (!S.signedIn) return 'Signed out';
  if (S.portal === 'learner') return `Learner · ${W && W.me ? W.me.first + ' ' + W.me.last : ''} · variant ${S.variant}`;
  if (S.portal === 'coord' && typeof CME === 'function') return `Academic Coordinator · ${CME().name}`;
  if (S.portal === 'staff' && typeof TME === 'function') return `${TME().roles.join(' + ')} · ${TME().name}`;
  if (S.portal === 'agency' && typeof AGN === 'function') return `Agency · ${AGN()}`;
  if (S.portal === 'admin' && ADMIN && ADMIN.me) return `${ADMIN.me.roles[0]} · ${ADMIN.me.name}`;
  return S.portal || '';
}
function demoTidy() {
  const fab = document.querySelector('#demo-root .demo-fab .fab-l'); if (fab) fab.textContent = 'Demo controls · ' + demoWho();
  // Safe to run again: the Demo Scenarios section is added by a later render hook
  const p = document.querySelector('#demo-root .demo-panel'); if (!p) return;
  // Reset buttons get their own section (last)
  const resets = [...p.querySelectorAll('[data-act*="eset"]')].filter(b => /reset/i.test(b.textContent) && !b.closest('fieldset.demo-reset'));
  if (resets.length) { let f = p.querySelector(':scope > fieldset.demo-reset'); if (!f) { f = document.createElement('fieldset'); f.className = 'demo-reset'; f.innerHTML = '<legend>Reset — demo only</legend><div class="btns"></div>'; p.appendChild(f); } resets.forEach(b => f.querySelector('.btns').appendChild(b)); }
  const sets = [...p.querySelectorAll(':scope > fieldset')].filter(f => f.querySelector(':scope > :not(legend):not(.demo-desc)')); if (!sets.length) return;
  p.querySelectorAll(':scope > fieldset').forEach(f => { if (!sets.includes(f)) f.remove(); });
  const rank = f => { if (f.classList.contains('demo-reset')) return 6; const l = ((f.querySelector('legend') || {}).textContent || '').trim().replace(/\s*—\s*demo only$/i, ''); /* the 'demo only' label doesn't change where a section sits */ const k = DEMO_ORDER.findIndex(([, re]) => re.test(l)); return k < 0 ? 3 : k; };
  const sorted = sets.map((f, i) => ({ f, i, r: rank(f) })).sort((a, b) => a.r - b.r || a.i - b.i);
  const anchor = p.querySelector(':scope > .row-b') || p.firstElementChild;
  let cur = p.querySelector(':scope > .demo-now'); if (!cur) { cur = document.createElement('p'); cur.className = 'xs demo-now'; anchor.after(cur); } cur.innerHTML = `<strong>Now:</strong> ${esc(demoWho())}`;
  let prev = cur;
  sorted.forEach(({ f, r }) => { if (!f.querySelector('.demo-desc')) { const lg = f.querySelector('legend'); if (lg) lg.insertAdjacentHTML('afterend', `<p class="xs muted demo-desc">${DEMO_ORDER[r][2]}</p>`); } prev.after(f); prev = f; });
  // Role buttons: a one-line description each (the visible label stays the button text)
  p.querySelectorAll('[data-act="switchRole"], [data-act="demoSignInAs"]').forEach(b => { if (!b.title) b.title = 'Open this role view — ' + b.textContent.trim(); });
  const idx = p.querySelector('[data-act="openIndex"]'); if (idx) p.appendChild(idx);
}
const _renderDemoNav = renderDemo;
renderDemo = function () { _renderDemoNav(); try { demoTidy(); } catch (e) { /* demo panel stays as built */ } };
AFTER.push(() => { try { demoTidy(); } catch (e) { /* demo panel stays as built */ } });

/* ---------- UX Changelog ---------- */
UXC.push(['Phase 3', 'UX polish v2 — navigation and wayfinding', [
  'Sidebars (every role): grouped under short section labels in order of use, each role\'s top tasks first; roles with more than about 10 items keep the rest under "More" (it opens by itself when you are on one of those pages). The current page stays highlighted. One label per route everywhere: Bundles & Pricing, Referrals, Scheduling, Attendance, Assessment Records, Reports, My Profile; Finance labels shortened (Agency Payments, Learner Accounts, Payment Exceptions, Payment Plans); Teacher "My Approvals & Corrections" → "My Requests".',
  'Super and System Admin: new Notifications page (all notifications, grouped and searchable); every admin bell has "View all notifications".',
  'Breadcrumbs on every detail page (added automatically where a page had none). Back: browser back and in-app back return to the list with its filters, page and scroll position.',
  'Dead ends removed: the integration banner says "The Super Administrator has been notified — nothing for you to do" with no link for Academic, Finance, Business and IQA (true of the existing data: the Super Administrator has the "SMS integration failing" notification; no new alert is created) (it opened a page they can\'t use and logged a false security event); "Related record" links open Learner 360 instead of the Learners list; the Release queue "Not your batch" page and the not-yet-confirmed observation record have a way back; learner variant E "Viewing as: Teacher (staff)" opens the Teacher portal as Tom Whitfield (he teaches Croydon Cohort 4 in the data); Coordinator C "Role: Teacher" opens the Teacher portal as Dr Helen Carter (no teaching allocation yet, so it says so) instead of "not yet built"; both can switch back from the header.',
  'Teacher-only users: no "To mark" header button, no notifications for screens they can\'t open (the bell count follows), no "Open" links to marking or portfolios, no "Go to item" for assessor-only calendar events.',
  'Coordinator dashboard: "Needs your attention" first, now including feedback waiting for release (→ Release queue) and every at-risk learner. Coordinator notifications open the learner or submission they mention.',
  'Dashboards lead with "Needs your attention" (Super / System Admin, Finance, Coordinator, Agency, Business, Academic); IQA gets an attention strip on Assessment Records. Super Admin shows "Oldest awaiting you" with a Decide button, lists the oldest first, and the "Assigned to me" count equals the list ("View all"). System Admin lists oldest first and shows data requests nearing their deadline. Academic Admin gets a reactivation tile, so tiles add up to the badge.',
  'Badges: learner "To do" tab now equals the Assignments badge (closed items stay under All); the header Approvals Queue pill shows "escalated" only to the Super Administrator, who decides those items.',
  'Admin search: results grouped by type (Learner, Queue item, Staff, Agency, Batch, Course, Certificate, Transaction; up to 5 each), "/" focuses search from anywhere, Esc closes, recent searches show when the box is empty; phones get a search button (search was hidden below 860px).',
  'Role switch: every multi-role control keeps an equivalent page open (Messages → Messages, Notifications → Notifications, Calendar → Calendar…) instead of always jumping to the dashboard.',
  'Shortcuts to the right place: Agency "Assign seats" starts the wizard; learner "View feedback" opens at the feedback; a failed last quiz attempt offers "Request more attempts"; the agency consent request sits inside "Action needed" and counts (Approve / Decline still one click); a workplace manager reopening a used grant link can withdraw permission there; Teacher dashboard KPIs open the matching queue tab.',
  'Demo panel: sections in one order — Roles → Variants → Edge states → Demo-only controls → Inboxes → Demo Scenarios → Reset — each with a one-line description; the button shows the current role and person ("Demo controls · Learner · Aisha Rahman · variant C"); scenarios and steps unchanged.',
  'Performance: table rows get a "row-link" class instead of a CSS :has() selector; tools/harness/profile.sh compares crawl cost between versions (tag pre-ux-pass = the prototype before P0).',
  'Fix (phase3 regression): a teacher identity added for the role switch used a read-only getter for its batches; the Academic Admin set-up assigns batches on every teacher at load and on Reset, so it threw and every later portal\'s data set-up was skipped. Batches are now plain data, filled in after set-up. New boot test ft-boot.js (runs first) checks that loading and Reset build every portal store.',
  'Tests changed in Phase 3: none. Tests added: ft-boot.js, ft-phase3.js.',
]]);
