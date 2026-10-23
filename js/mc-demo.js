/* ============================================================
   MC demo — a reproducible multi-Coordinator batch (23 Oct 2026; PD-MC-16…). DEMONSTRATION DATA ONLY.
   Demo controls (every portal) → "Multi-Coordinator demo" → Load: creates batch DEMO-MC101 (Level 2 Diploma in Care) with 10 demo
   Academic Coordinators and 101 demo learners, enrolled in that order, so the existing allocation gives nine Coordinators 10 learners
   and the first 11. Three of the learners get learner-portal accounts (DL1, DL5, DL10 — the first learner of Coordinators 1, 5 and
   10) so their "Your people" can be opened. Everything uses the normal records (staff, learners, batch, cohort, learner worlds) and
   the normal screens and permission checks.
   Not created: documents, signatures, payments, payment plans, observations, marks or outcomes. A quarter of the learners have
   Assignment 1 submitted and not yet marked, so there is academic work to comment on. Every record is marked demo: names carry
   "(demo)", emails use demo.example, the batch is labelled "demo data". Seed records are not touched. Reset demo removes it all.
   Loads after mc-coords.js.
   ============================================================ */
'use strict';

const MCD_CODE = 'DEMO-MC101', MCD_COURSE = 'Level 2 Diploma in Care (England)', MCD_N = 101;
const MCD_COORDS = ['Amara Okoye', 'Ben Hartley', 'Chloe Sandhu', 'David Mensah', 'Elena Petrova', 'Faisal Rahim', 'Grace Lindqvist', 'Hannah Achebe', 'Imran Qureshi', 'Julia Moretti'].map((n, k) => ({ k: k + 1, name: n + ' (demo)', email: n.toLowerCase().replace(/ /g, '.') + '.demo@illumin-academy.example' }));
const MCD_FIRST = ['Aaliyah', 'Bilal', 'Carys', 'Dev', 'Erin', 'Femi', 'Gemma', 'Harvey', 'Isabel', 'Jamal', 'Keira', 'Liam', 'Maya', 'Nathan', 'Orla', 'Pavel', 'Rosa', 'Samir', 'Tara', 'Usman'];
const MCD_LAST = ['Adams', 'Baker', 'Chowdhury', 'Davies', 'Evans', 'Fletcher', 'Green', 'Hughes', 'Iqbal', 'James', 'Khan', 'Lewis', 'Morgan', 'Nowak', 'Owen', 'Patel', 'Quinn', 'Roberts', 'Singh', 'Turner', 'Walsh', 'Young', 'Zielinski'];
// Unique first/last pairs for k = 0…100 (same first name → last names 21 places apart, never equal mod 23)
const mcdLearnerName = k => [MCD_FIRST[k % 20], MCD_LAST[(k + Math.floor(k / 20)) % 23]];
const MCD_WORLDS = [['DL1', 1], ['DL5', 5], ['DL10', 10]];
const mcdBatch = () => (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches || []).find(b => b.code === MCD_CODE) || null;
const mcdOn = () => !!(STORE && STORE.mcDemo && mcdBatch());

// Demo staff accounts and Coordinator personas (re-added after an admin rebuild, which re-creates staff from the seed)
function mcdStaff() {
  MCD_COORDS.forEach(c => {
    if (!ADMIN.staff.some(s => s.name === c.name)) ADMIN.staff.push({ id: 'ST-DM' + String(c.k).padStart(2, '0'), name: c.name, email: c.email, roles: ['Academic Coordinator'], status: 'Active', tfa: 'Not required', last: D(-1, '09:00'), alloc: 0, mobile: '', quals: 'Demonstration account', reg: '', tz: 'Europe/London', demo: true });
    COO_USERS['DM' + c.k] = { key: 'DM' + c.k, name: c.name, first: c.name.split(' ')[0], email: c.email, roles: ['Academic Coordinator'], label: `Demo Coordinator ${c.k} — ${c.name}`, demo: true };
  });
}
// A clean learner-portal account for one demo learner: the Level 2 programme with nothing done yet
function mcdWorld(key, L, b) {
  const keepW = W, keepV = S.variant, t = makeWorld('D'), [first, last] = [L.first, L.last];
  PERSONAS[key] = { id: L.id, first, last, email: L.email, mobile: L.mobile, dob: '—', address: '—', postcode: '—', country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: fd(b.start), referral: 'Demonstration data', sponsor: null };
  VARIANTS[key] = { nvq: false, fresh: true };
  const w = makeWorld(key); W = keepW; S.variant = keepV;
  const c = JSON.parse(JSON.stringify({ tree: t.tree, assignments: t.assignments, iaCriteria: t.iaCriteria, workplace: t.workplace, resources: t.resources }));
  c.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(x => Object.assign(x, { st: 'Not Started', src: null, date: null, ev: null, obs: null })))));
  c.assignments.forEach(a => { Object.assign(a, { status: 'Not Started', round: 'Sub 1', resubUsed: 0, submittedAt: null, timeline: [], overall: null, assessor: null, coordAll: [], closed: false }); delete a.coord; delete a.limit; a.qs.forEach(q => { q.rounds = []; q.fb = []; delete q.state; delete q.pdReason; }); });
  Object.assign(c.workplace, { perm: 'Not entered', name: '', address: '', postcode: '', ctitle: '', cname: '', cemail: '', cphone: '' });
  const nvq = { ...t.nvq, title: MCD_COURSE, level: 'Level 2', batch: `${b.label} — ${b.code}`, batchStart: b.start, batchEnd: b.end, start: b.start, end: b.end, enrolled: b.start, status: 'Active', version: 'Version 1 — demo enrolment', sponsor: null, people: [], mode: b.mode }; // the delivery channel of the batch
  Object.assign(w, c, { flags: { nvq: true, admitted: true, demo: true }, nvq, enrolments: [nvq], pd: { items: [], session: { status: 'Not scheduled', at: b.end, mode: '—', loc: '', with: chAllocOf(b).pd } }, plan: [], observations: [], docs: [], tx: [], plans: [], certs: [], requests: [], threads: [], attendance: [], events: [], announcements: [], drafts: {}, payOverdue: null, referral: null,
    admission: { status: 'Approved', reviewer: '—', history: [['Demonstration data — no admission record', b.start]], deposit: { min: 0, paid: false, paidAt: null, holdUntil: null, balance: 0 }, batch: nvq.batch, batchStart: b.start },
    signup: { step: 5, done: true, batch: b.code, demo: true, pay: null },
    notifs: [{ id: 'nmcd', cat: 'Account', title: 'Demonstration account', body: `${b.label}: demo data for the multi-Coordinator scenario.`, at: now().toISOString(), unread: true, go: 'courses' }] });
  STORE.worlds[key] = w; if (STORE.acct) STORE.acct[key] = 'Active';
  VARIANT_INFO[key] = [`Demo learner — Coordinator ${MCD_WORLDS.find(x => x[0] === key)[1]}`, `${first} ${last} · ${b.code} · demo data`];
  return w;
}
function mcDemoLaunch() {
  if (mcdBatch()) return mcdBatch();
  mcdStaff();
  const start = D(-21, '09:00'), end = D(344, '17:00'), b = mcNorm({ code: MCD_CODE, label: 'Demo cohort · 10 Coordinators (demo data)', course: MCD_COURSE, start, end, cap: 110, enrolled: MCD_N, mode: 'Online', dmode: 'Fully Assisted', dmodeSrc: 'demo', coord: MCD_COORDS[0].name, teachers: ['Tom Whitfield'], assessors: ['James Pryce'], status: 'In Progress', wait: 0, roster: [], coh: [], intake: 'Manual', created: start, demo: true });
  b.coords = MCD_COORDS.map(c => c.name); b.coordHistory = b.coords.map(n => [n, start, null]);
  ADMIN.batches.push(b);
  for (let k = 0; k < MCD_N; k++) {
    const [first, last] = mcdLearnerName(k), n = String(k + 1).padStart(3, '0'), id = 'IA-L-D' + n, name = `${first} ${last} (demo)`;
    ADMIN.learners.push({ id, name, email: `${first}.${last}.${n}@demo.example`.toLowerCase(), mobile: '+44 7700 900' + String(100 + k).slice(-3), agency: null, courses: [MCD_COURSE], acct: 'Active', rec: 'Active', region: 'UK', last: D(-1 - (k % 9)), flags: [], dob: '—', address: '—', postcode: '—', country: 'United Kingdom', joined: fd(start), referral: 'Demonstration data', cur: 'GBP', demo: true,
      _enr: [{ id: 'x0', title: MCD_COURSE, type: 'NVQ / RQF', status: 'Active', enrolled: start, start, end, progress: 0, sponsor: null, version: 'Version 1' }] });
    const subs = Object.fromEntries(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].map(a => [a, a === 'a1' && k % 4 === 0 ? 'Submitted' : 'Not Started']));
    b.coh.push({ lid: id, flags: ['On track'], last: D(-1 - (k % 9)), att: null, subs, pd: [], seed: hashN(id + MCD_CODE), demo: true });
  }
  mcSync(b); // enrolment order → balanced allocation (the existing rule; nothing is placed by hand)
  // Learner-portal accounts for the first learner of Coordinators 1, 5 and 10
  MCD_WORLDS.forEach(([key, ck]) => {
    const lid = mcLids(b).find(l => mcOf(l, b) === MCD_COORDS[ck - 1].name), L = ADMIN.learners.find(x => x.id === lid), [first, ...rest] = L.name.replace(' (demo)', '').split(' ');
    mcdWorld(key, { id: lid, first, last: rest.join(' ') + ' (demo)', email: L.email, mobile: L.mobile }, b);
    const e = b.coh.find(x => x.lid === lid); e.v = key; delete e.subs;
    mcPeopleSync(STORE.worlds[key]);
    const w = STORE.worlds[key], a = chAllocOf(b); w.nvq.people = w.nvq.people.filter(([r]) => r === 'Academic Coordinator').concat([['Teacher', 'Tom Whitfield'], ['Assessor (assignments)', a.asg], ['Assessor (PD)', a.pd], ['Assessor (observations)', a.obs]]);
  });
  STORE.mcDemo = { at: now().toISOString(), code: MCD_CODE };
  logA('Batches', `${b.label} (${b.code})`, 'Demo scenario loaded', '—', `${MCD_COORDS.length} Coordinators · ${MCD_N} learners`, 'Demonstration data, from Demo controls');
  if (typeof syncTasBatches === 'function') syncTasBatches();
  return b;
}
// Demo reset: remove every demo persona and account (the data itself goes with the reset of ADMIN and STORE)
function mcdClear() {
  Object.keys(COO_USERS).filter(k => COO_USERS[k].demo).forEach(k => delete COO_USERS[k]);
  MCD_WORLDS.forEach(([k]) => { delete VARIANT_INFO[k]; delete PERSONAS[k]; delete VARIANTS[k]; });
  if (S.coo && COO_USERS[S.coo.v] === undefined) S.coo.v = 'A';
  if (MCD_WORLDS.some(([k]) => k === S.variant)) { S.variant = 'C'; }
}
const _isMCD = initStore; initStore = function () { mcdClear(); const r = _isMCD.apply(this, arguments); if (MCD_WORLDS.some(([k]) => k === S.variant) || !STORE.worlds[S.variant]) S.variant = 'C'; return r; };
const _baMCD = buildAdmin; buildAdmin = function () { const r = _baMCD.apply(this, arguments); if (typeof STORE !== 'undefined' && STORE.mcDemo && mcdBatch()) mcdStaff(); return r; };

/* ---------- Demo controls: load the scenario and open its views ---------- */
const mcdGoCoord = k => { S.coo.v = 'DM' + k; S.coo.batch = 'all'; cooEnter(); S.signedIn = true; go('c-batches', { id: MCD_CODE, tab: 'roster' }); toast(`Viewing as ${MCD_COORDS[k - 1].name} — Demo Coordinator ${k}.`, 'info'); };
ACT.mcDemoLoad = () => { const had = !!mcdBatch(); mcDemoLaunch(); render(); toast(had ? 'The demo batch is already loaded.' : `Loaded ${MCD_CODE}: 10 demo Coordinators and 101 demo learners (demo data). Reset demo removes it.`, 'info'); };
ACT.mcDemoOpen = el => {
  if (!mcdBatch()) mcDemoLaunch();
  const t = el && el.dataset && el.dataset.t, k = +(el.dataset.k || 0);
  if (t === 'admin') { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches', { id: MCD_CODE, tab: 'staff' }); return; }
  if (t === 'coord') return mcdGoCoord(k);
  if (t === 'learner') { const key = 'DL' + k; S.variant = key; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('course', { id: 'nvq' }); toast(`Viewing as ${chFullName(STORE.worlds[key])} — a learner of Demo Coordinator ${k}.`, 'info'); }
};
function mcdPanel() {
  const on = !!mcdBatch(), b = mcdBatch();
  const cnt = on ? (() => { const c = {}; mcLids(b).forEach(l => { const d = mcOf(l, b); c[d] = (c[d] || 0) + 1; }); return MCD_COORDS.map(x => c[x.name] || 0).join(' · '); })() : '';
  return `<fieldset class="mc-demo"><legend>Multi-Coordinator demo — demonstration data</legend>
    <p class="xs muted">${on ? `${MCD_CODE} is loaded: 10 demo Coordinators, ${mcLids(b).length} demo learners (learners per Coordinator: ${cnt}). Reset demo removes it.` : 'Loads a Level 2 batch with 10 demo Academic Coordinators and 101 demo learners, allocated by the normal rule. No documents, payments or outcomes are created.'}</p>
    <div class="btns">${on ? '' : '<button class="btn btn-sm btn-primary" data-act="mcDemoLoad">Load the 10-Coordinator demo batch</button>'}
      <button class="btn btn-sm" data-act="mcDemoOpen" data-t="admin">Admin: batch Coordinators</button>
      ${[1, 5, 10].map(k => `<button class="btn btn-sm" data-act="mcDemoOpen" data-t="coord" data-k="${k}">Coordinator ${k}</button>`).join('')}
      ${[1, 5, 10].map(k => `<button class="btn btn-sm" data-act="mcDemoOpen" data-t="learner" data-k="${k}">Learner of Coordinator ${k}</button>`).join('')}</div></fieldset>`;
}
const _rdMCD = renderDemo;
renderDemo = function () { const r = _rdMCD.apply(this, arguments); const p = document.querySelector('#demo-root .demo-panel'); if (p && !p.querySelector('.mc-demo')) { const h = p.querySelector('.row-b'); if (h) h.insertAdjacentHTML('afterend', mcdPanel()); } return r; };

/* ---------- The demo batch says it is demo data wherever it appears ---------- */
const MCD_NOTE = `<div class="note b-purple mc-demo-note">${ic('info')}<div class="small"><strong>Demonstration data.</strong> This batch, its 10 Coordinators and its 101 learners were loaded from Demo controls → Multi-Coordinator demo. They have no documents, payments or outcomes. Reset demo removes them.</div></div>`;
const mcdNote = (h, code) => code === MCD_CODE && mcdBatch() ? chAfterHead(h, MCD_NOTE) : h;
const _aBMCD = SCREENS['a-batches']; SCREENS['a-batches'] = p => mcdNote(_aBMCD(p), p && p.id);
const _cBMCD = SCREENS['c-batches']; SCREENS['c-batches'] = p => mcdNote(_cBMCD(p), p && p.id);

// Avatars: initials of a demo name without the "(demo)" marker (the shared avatar code takes the last two words)
const mcdInit = n => String(n).replace(/\s*\(demo\)/, '').split(' ').filter(Boolean).slice(-2).map(x => x[0]).join('').toUpperCase();
const _phMCD = pageHtml;
pageHtml = function () { const h = _phMCD.apply(this, arguments); return h.replace(/(<span class="avatar"[^>]*>)[^<]*(<\/span><div class="li-b"><span class="strong">)([^<]*\(demo\))(<\/span>)/g, (m, a, b, n, c) => a + mcdInit(n) + b + n + c); };
AFTER.push(() => { if (S.portal !== 'coord' || !CME().demo) return; const a = document.querySelector('[data-m="cavatar"] .avatar'); if (a) a.textContent = mcdInit(CME().name); });
// A PD session that isn't scheduled shows "Not scheduled" with no date (display only; the stored record is unchanged).
// Only the demo learners have this status; every other session renders as before.
const mcdUnsched = s => !!(s && s.status === 'Not scheduled');
const _pdSecMCD = pdSection;
pdSection = function () {
  const s = W && W.pd && W.pd.session; if (!mcdUnsched(s)) return _pdSecMCD.apply(this, arguments);
  return `<div class="grid-2"><section class="card"><h2>PD consolidation checklist</h2>${(W.pd.items || []).length ? '' : '<p class="small muted">Nothing has been added to your Professional Discussion yet.</p>'}</section>
    <section class="card mc-pd-none"><div class="row-b"><h2>PD session</h2>${chip('Not scheduled', 'grey')}</div><p class="small">Your Professional Discussion hasn't been scheduled. ${s.with ? esc(s.with) + ', your PD assessor,' : 'Your PD assessor'} will propose a date when you are ready for it.</p></section></div>`;
};
const _obsSecMCD = obsSection;
obsSection = function (bs) {
  let h = _obsSecMCD.apply(this, arguments);
  (bs || []).forEach(b => (b.coh || []).forEach(e => { const s = e.v && STORE.worlds[e.v] && STORE.worlds[e.v].pd && STORE.worlds[e.v].pd.session; if (mcdUnsched(s)) h = h.split(`${fdt(s.at)} ${chip(s.status, 'blue')}`).join(chip('Not scheduled', 'grey')); }));
  return h;
};
// A demo learner has no admission record: the status says so rather than "verified"
const _admMCD = mcAdmStatus;
mcAdmStatus = function (lid) { const L = ADMIN.learners.find(x => x.id === lid); return L && L.demo ? ['No admission record — demo data', 'grey'] : _admMCD.apply(this, arguments); };

/* ---------- Records ---------- */
UXC.push(['MC demo', 'Multi-Coordinator demo scenario and clearer Coordinator screens (23 Oct 2026)', [
  'Demo controls (every portal) → "Multi-Coordinator demo — demonstration data": Load creates DEMO-MC101 (Level 2 Diploma in Care) with 10 demo Academic Coordinators and 101 demo learners, allocated by the normal rule (11 / 10 × 9). Buttons open the batch\'s Coordinators panel, the roster as Coordinator 1, 5 or 10, and the programme page of a learner of Coordinator 1, 5 or 10. No documents, payments or outcomes; names carry "(demo)"; Reset demo removes it.',
  'Create batch step 2: one "Academic Coordinators (required — choose one or more)" checkbox list with a live count and the names selected; Review & create lists every Coordinator with the number.',
  'Coordinator roster (My Batches → batch → Roster, and Learners): My learners is the default view; Total batch learners, My learners and Other Coordinators\' learners are shown as figures above the list.']]);
