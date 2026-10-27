/* ============================================================
   Fixtures (FX, 27 Oct 2026; PD-FX-01… in PROVISIONAL-DECISIONS.md). Two datasets, one loaded at a time:
   - Client demo (the default): what a fresh start and "Reset demo" load. The Academy's configuration (staff accounts and roles,
     settings, integrations, fee rates, offices, the observation library, templates) with NO seeded records, then one coherent
     example built through the real screens (cdBuild in cd-demo.js): a published Level 3 programme with approved Self-Paced and
     Fully Assisted fee options (demonstration fees), one mixed-mode batch with two Academic Coordinators, four demo learners,
     assignments, sessions and observation configuration. Plus one published short course and one agency account.
   - Full legacy test data: everything initStore() seeds (8 programmes, 14 batches, 72+ learners, the approvals, ledgers, IQA
     samples, Demo Scenarios…). The regression suites load it explicitly — the harness sets window.ILM_FIXTURE = 'legacy' before
     App.boot(), and every suite resets with initStore(), which is this fixture, unchanged. Demo controls can load it for internal
     testing; it is labelled non-client data while loaded.
   The client demo is made by removing the legacy records from a fresh store — the record lists themselves become empty (no CSS or
   list filter), so lists, counts, dashboards, search and selectors read the same reduced data. Persona learner worlds A–F/H stay
   in memory only as templates that older code reads (the NVQ tree, criteria wording); they are no learners: no list, count, search
   or selector includes them in the client demo.
   Loads last.
   ============================================================ */
'use strict';

const FX = { mode: 'legacy', at: null };
const FX_AGENCY = 'AG-02', FX_SHORT = 'SC-01'; // the agency account and the short course the client demo keeps
const fxPin = () => (typeof window !== 'undefined' && window.ILM_FIXTURE) || null; // the harness pins 'legacy'
const fxClient = () => FX.mode === 'client';

// Globals the client demo narrows (the course catalogue, learner variants) are restored from their state at load before every reset
const FX_GLOBALS = { cat: CATALOGUE.slice(), vi: { ...VARIANT_INFO }, coo: Object.fromEntries(Object.entries(COO_USERS).map(([k, u]) => [k, u.label])) };
function fxRestoreGlobals() {
  CATALOGUE.splice(0, CATALOGUE.length, ...FX_GLOBALS.cat);
  Object.assign(VARIANT_INFO, FX_GLOBALS.vi);
  Object.entries(FX_GLOBALS.coo).forEach(([k, l]) => { if (COO_USERS[k]) COO_USERS[k].label = l; });
}
const _isFX = initStore;
initStore = function () { FX.mode = 'legacy'; fxRestoreGlobals(); return _isFX.apply(this, arguments); };

/* ---------- Remove the legacy records ---------- */
const fxEmpty = o => { Object.keys(o).forEach(k => { const v = o[k]; if (Array.isArray(v)) o[k] = []; else if (v && typeof v === 'object' && v.constructor === Object) o[k] = {}; }); };
function fxPrune() {
  const A = ADMIN, St = STORE;
  FX.seedAudit = new Set((A.audit || []).map(a => a.id)); // an identity switch re-creates these rows; they're filtered out again
  ['learners', 'programmes', 'batches', 'bundles', 'ledger', 'referrals', 'queue', 'iqa', 'audit', 'security', 'archiveAccess', 'notifLog', 'announcements', 'threads', 'dsr', 'exportsLog', 'sessions', 'unmatched', 'resources', 'myNotifs', 'apps'].forEach(k => { A[k] = []; });
  A.chBankPending = null; A.tplAtt = {}; A.manualTx = []; A.certErrors = []; A.reg = {}; // (lists the screens seed on first use)
  A.agencies = A.agencies.filter(a => a.id === FX_AGENCY);
  A.courses = A.courses.filter(c => c.id === FX_SHORT).map(c => ({ ...c, enrol: 0, comp: null }));
  A.staff.forEach(s => { s.alloc = 0; });
  // the seeded SMS outage is a demonstration incident (a banner on every admin page), not configuration
  A.integrations.forEach(i => { if (i.status === 'Failing') Object.assign(i, { status: 'Connected', error: null }); });
  // per-programme configuration of the legacy programmes
  [St.n5 && St.n5.pub, St.n5 && St.n5.draft, St.r1 && St.r1.opts, St.r1 && St.r1.n, St.s4 && St.s4.plans, St.s3 && St.s3.trees, St.s3 && St.s3.drafts, St.s3 && St.s3.hist, St.s3 && St.s3.keys, St.s3 && St.s3.snap,
    St.chLetters, St.chSupport, St.chProgTree, St.chProgDocs, St.e1 && St.e1.terms, St.cb8 && St.cb8.work, St.cb8 && St.cb8.wf].forEach(o => { if (o) Object.keys(o).forEach(k => delete o[k]); });
  if (St.n5) St.n5.mig = [];
  St.chNewProgs = []; St.s2Defs = []; St.s2Ext = {}; St.sRows = {};
  if (St.sSpec) Object.keys(St.sSpec).forEach(k => { if (k !== FX_SHORT) delete St.sSpec[k]; });
  // record stores: every list and keyed record emptied (settings, templates and the observation library stay)
  ['tas', 'coo', 'iqa', 'agy', 'wpc', 'sys'].forEach(k => { if (St[k]) fxEmpty(St[k]); });
  if (St.fin) Object.keys(St.fin).forEach(k => { if (k !== 'templates' && Array.isArray(St.fin[k])) St.fin[k] = []; });
  if (St.aca) ['notifs', 'drafts', 'alloc', 'schedLog', 'conflicts'].forEach(k => { St.aca[k] = []; });
  if (St.aca) St.aca.tasOrig = {};
  if (St.biz) { St.biz.notifs = []; St.biz.anns = []; St.biz.notes = {}; St.biz.products = (St.biz.products || []).filter(p => fxShortTitle(p)); }
  if (St.s4b) { St.s4b.res = []; St.s4b.sess = {}; St.s4b.evx = {}; }
  if (St.s5d) { St.s5d.log = []; St.s5d.refs = {}; }
  ['chAlloc', 'chAssessOv', 'chAsgSeed', 'chPause', 'chCourseMods', 'evOver', 'qNotes'].forEach(k => { St[k] = {}; });
  ['chBank', 'chFees', 'chOffReq', 'mcDocReview'].forEach(k => { St[k] = []; });
  // the course catalogue: the kept short course only (the client programme joins it when it is published)
  const keep = CATALOGUE.filter(c => c.kind === 'short' && c.title === fxShortName());
  CATALOGUE.splice(0, CATALOGUE.length, ...keep);
  // learner variants: the persona templates aren't learners of the client demo (the four demo learners are added by cdBuild). Their
  // records go: what stays is the structure older code reads from them (the qualification tree, IA criteria wording, identity fields)
  Object.keys(VARIANT_INFO).forEach(k => delete VARIANT_INFO[k]);
  // The scrubbed persona is a copy: the original stays untouched in FX.tpl, for an admin rebuild's seed steps (buildAdmin below)
  FX.tpl = { ...St.worlds };
  Object.keys(St.worlds).forEach(k => {
    const w = St.worlds[k];
    St.worlds[k] = { ...w, enrolments: [], plan: [], observations: [], docs: [], plans: [], tx: [], certs: [], requests: [], threads: [], announcements: [], notifs: [], events: [], attendance: [], consents: [], assignments: [],
      drafts: {}, profilePending: {}, payOverdue: null, referral: null, admission: null, signup: null, fxTemplate: true,
      pd: w.pd ? { items: [], session: { status: 'Not scheduled', at: null, mode: '—', loc: '', with: '' } } : w.pd, flags: w.flags ? { ...w.flags, nvq: false, admitted: false } : w.flags };
  });
  St.acct = {};
  // Agency products named the legacy short courses; plan templates named the legacy programmes
  if (St.biz) St.biz.products = [];
  if (St.fin && St.fin.templates) St.fin.templates = St.fin.templates.filter(t => t.course === fxShortName());
  // Discount rates: the rates in force stay; their history cited legacy approvals (one current version, no approval reference)
  [A.discount, St.discount].forEach(d => { if (d && d.versions && d.versions.length) { const cur = d.versions[d.versions.length - 1]; d.versions = [{ ...cur, v: 1, reason: 'Rates in force (client demo configuration)' }]; d.requests = []; } });
  // Coordinator personas: their labels counted the legacy batches
  Object.values(COO_USERS).forEach(u => { if (!u.demo && /— \d+ batch/.test(u.label)) u.label = u.label.replace(/— \d+ batch(es)?/, '— client demo'); });
}
const fxShortName = () => ((ADMIN.courses || []).find(c => c.id === FX_SHORT) || {}).title || 'Moving and Handling People';
const fxShortTitle = p => JSON.stringify(p).includes(fxShortName());

/* ---------- Admin dashboard of the client demo: every figure counted from its records ---------- */
function fxDashKpis(subs, rev) {
  const progs = ADMIN.programmes.filter(p => p.status === 'Active').length, open = ADMIN.batches.filter(b => ['Open', 'In Progress'].includes(b.status)).length;
  return `${kpi('Published programmes', progs, `${ADMIN.batches.length} batch${ADMIN.batches.length === 1 ? '' : 'es'} · ${open} open or running`, 'a-programmes')}
    ${kpi('Average progress', '—', 'No learner has started yet', 'a-reports..progress')}
    ${kpi('Overdue submissions', subs.filter(s => s.overdue).length, 'Deadline passed, nothing submitted', 'a-records')}
    ${kpi('Pending markings', subs.filter(s => ['Submitted'].includes(s.status)).length, 'Submitted, awaiting marking', 'a-records')}
    ${kpi('Revenue this month', money(rev('GBP'), 'GBP'), 'Recorded payments · GBP', 'a-finance..reports')}`;
}
// learners per course: each learner record's courses (the four demo learners are on the Level 3 programme)
function fxByCourse() {
  const n = {}; allLearners().forEach(l => (l.courses || []).forEach(c => { const t = c.replace(/ (applicant)$/, ''); n[t] = (n[t] || 0) + 1; }));
  ADMIN.programmes.concat(ADMIN.courses).forEach(c => { if (!(c.title in n)) n[c.title] = 0; });
  return Object.entries(n).sort((a, b) => b[1] - a[1]);
}
// the next sessions and assignment deadlines of the batches, from their records
function fxUpcoming() {
  const t0 = now().getTime(), rows = [];
  (typeof S4B === 'function' ? Object.values(S4B().sess || {}).flat() : []).forEach(s => { if (s && s.at && new Date(s.at).getTime() >= t0 && s.status !== 'Cancelled') rows.push([s.at, 'Session', `${s.title} · ${s.batch}`]); });
  s2Defs().filter(d => d.status === 'Published').forEach(d => ADMIN.batches.forEach(b => { const due = typeof crDue === 'function' && crDue(d, b.code); if (due && new Date(due).getTime() >= t0) rows.push([due, 'Deadline', `${d.title} · ${b.code}`]); }));
  rows.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  return `<section class="card"><h2>Upcoming</h2>${rows.length ? `<ul class="list small">${rows.slice(0, 5).map(([at, k, t]) => `<li class="li"><span class="typebadge">${k}</span><div class="li-b">${esc(t)} · ${fdt(at)}</div></li>`).join('')}</ul>` : '<p class="small muted">Nothing scheduled.</p>'}</section>`;
}
function fxDashAlerts(a) {
  ADMIN.integrations.filter(i => i.status === 'Failing').forEach(i => a.push(['red', `Integration failure: ${i.name}`, i.error, 'a-integrations']));
  const sec = ADMIN.security.filter(s => !s.reviewed).length; if (sec) a.push(['red', 'Security events', sec + ' unreviewed', 'a-audit..security']);
  const ex = expiringDocs().length; if (ex) a.push(['blue', 'Expiring learner documents', ex + ' within 30 days', 'a-admissions..expiring']);
  ADMIN.batches.filter(b => b.status === 'Open' && b.enrolled >= b.cap).forEach(b => a.push(['amber', 'Batch full', `${b.label || b.code} (${b.enrolled}/${b.cap})`, 'a-batches.' + b.code]));
  if (!a.length) a.push(['blue', 'No alerts', 'Nothing needs attention in the client demo data.', 'a-dashboard']);
  return a;
}

/* ---------- Load a fixture ---------- */
// The build runs through the screens (go() renders and records history): the address bar and the browser history are left as they were
function fxQuiet(f) {
  const push = history.pushState, url = location.href; let r;
  history.pushState = function () { };
  try { r = f(); } finally { history.pushState = push; try { history.replaceState(null, '', url); } catch (e) { /* sandboxed */ } }
  return r;
}
function fxLoadClient() {
  const av = (ADMIN && (ADMIN._saAv || ADMIN.av)) || 'A';
  initStore(); buildAdmin(['A', 'B', 'C'].includes(av) ? av : 'A');
  fxPrune(); FX.mode = 'client';
  let err = null;
  fxQuiet(() => { try { cdBuild(); } catch (e) { err = e; } closeModal(); });
  FX.at = now().toISOString();
  if (STORE.worlds.CD1) S.variant = 'CD1';
  W = STORE.worlds[S.variant] || W;
  return err;
}
function fxLoadLegacy() { initStore(); buildAdmin('A'); FX.mode = 'legacy'; FX.at = now().toISOString(); }

// The UI state a load changes (identity, route, open panels) is put back after a boot-time load
const FX_UI = ['signedIn', 'auth', 'authMsg', 'route', 'params', 'returnTo', 'portal', 'demoOpen', 'ui', 'menu', 'drawer', 'role'];
const _bootFX = App.boot;
App.boot = function () {
  const r = _bootFX.apply(this, arguments);
  if (fxPin() === 'legacy') return r;
  const keep = Object.fromEntries(FX_UI.map(k => [k, S[k]]));
  const err = fxLoadClient();
  Object.assign(S, keep); if (S.portal === 'admin' && ADMIN) setAdminIdentity('A');
  render(); if (err) toast('The client demo could not be built: ' + err.message, 'err');
  return r;
};
// Reset demo: back to the client demo (the harness, pinned to the legacy data, resets to the legacy data as before)
const _resetFX = ACT.resetDemo;
ACT.resetDemo = function () {
  if (fxPin() === 'legacy') return _resetFX.apply(this, arguments);
  const err = fxLoadClient();
  S.edge = 'none'; S.ui = {}; setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
  go('a-dashboard'); renderDemo();
  toast(err ? 'The client demo could not be built: ' + err.message : 'Demo reset: the client demo dataset is loaded.', err ? 'err' : 'info');
};
ACT.fxLegacy = () => {
  fxLoadLegacy(); S.edge = 'none'; S.ui = {}; setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
  go('a-dashboard'); renderDemo(); toast('Full legacy test data loaded — internal testing data, not client data. Reset demo returns to the client demo.', 'info');
};
// The client demo dataset, loaded on purpose (tests and the guided links use it; there is no separate button — Reset demo is it)
ACT.cdLoad = () => {
  const err = fxLoadClient(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
  if (err) { render(); return toast('The client demo could not be built: ' + err.message, 'err'); }
  S.demoOpen = true; go('a-batches', { id: CD_B }); renderDemo();
};

/* ---------- Demo controls: one Reset demo (the role switcher's own "Reset demo data" button repeated it) ---------- */
const _rshFX = roleSwitchHtml;
roleSwitchHtml = function () { return _rshFX.apply(this, arguments).replace(/<button class="btn btn-sm" data-act="resetDemo">Reset demo data<\/button>/, ''); };

/* ---------- Screens that showed fixed example rows: in the client demo they count its records ---------- */
// Coverage of each published or draft programme: its knowledge criteria against the questions of its assignments
const fxCovNU = pr => { if (!pr || !pr.chNew || typeof cbRvCoverage !== 'function') return [0, 0]; const c = cbRvCoverage(pr, ch8Tree(pr.id)); return [c.all.length, c.un.length]; };
function fxCoverage() {
  const ps = ADMIN.programmes.filter(p => p.status !== 'Retired');
  return `${pageA('Coverage analytics', 'Knowledge criteria covered by assignment questions', '', [['Assignments & Criteria Mapping', 'a-assignments'], ['Coverage']])}
  <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Programme</th><th class="r">Knowledge criteria</th><th class="r">Covered</th><th class="r">Uncovered</th></tr></thead><tbody>${ps.map(p => { const [n, u] = fxCovNU(p); return `<tr><td>${esc(p.title)}</td><td class="r">${n}</td><td class="r">${n - u}</td><td class="r">${u ? `<strong style="color:var(--red)">${u}</strong>` : 0}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">No programmes.</td></tr>'}</tbody></table></div>`;
}
// Progress drill-down: one row per batch, from its learners (no one has started in the client demo)
const fxDrill = lvl => lvl ? [] : ADMIN.batches.map(b => [b.label || b.code, 0, 'Not started']);
function fxFinAlerts() {
  const F = STORE.fin || {}, rows = [];
  ADMIN.integrations.filter(i => i.status === 'Failing').forEach(i => rows.push(['red', `Integration failure: ${i.name}`, i.error || '', 'a-integrations']));
  const dups = (F.dups || []).filter(d => d.status === 'Unresolved').length; if (dups) rows.push(['amber', 'Duplicate payments', dups + ' unresolved', 'f-exceptions..duplicates']);
  const q = ADMIN.queue.filter(i => typeof isOpen === 'function' && isOpen(i) && /Refund|Fee|Payment|Discount/i.test(i.type)).length; if (q) rows.push(['amber', 'Finance approvals open', q + ' in the Approvals Queue', 'a-queue']);
  if (!rows.length) return '<li class="li"><div class="li-b"><span class="small muted">No alerts — nothing needs attention in the client demo data.</span></div></li>';
  return rows.map(a => `<li class="li">${chip(a[0] === 'red' ? 'High' : 'Medium', a[0] === 'red' ? 'red' : 'amber')}<div class="li-b"><strong>${a[1]}</strong><span class="xs muted">${a[2]}</span></div><button class="btn btn-sm" data-act="goTok" data-t="${a[3]}">Open</button></li>`).join('');
}

/* ---------- An admin rebuild (identity switch) re-creates the seeded identity data: the client demo keeps none of it ---------- */
// The rebuild's seed steps read the persona learners' records: they run on the untouched personas (FX.tpl), and every store is put
// back afterwards — the client demo's data is carried into the rebuilt ADMIN as before (S5e), the seeded copies are dropped.
const _baFX = buildAdmin;
buildAdmin = function () {
  if (!fxClient() || !FX.tpl || !STORE.worlds) return _baFX.apply(this, arguments);
  const keep = { ...STORE }, scrub = {}; Object.keys(FX.tpl).forEach(k => { scrub[k] = STORE.worlds[k]; STORE.worlds[k] = FX.tpl[k]; });
  let r; try { r = _baFX.apply(this, arguments); } finally {
    Object.assign(STORE.worlds, scrub); Object.keys(STORE).forEach(k => { if (!(k in keep)) delete STORE[k]; }); Object.assign(STORE, keep);
  }
  if (ADMIN) {
    ADMIN.myNotifs = []; ADMIN.staff.forEach(s => { s.alloc = 0; });
    if (FX.seedAudit) ADMIN.audit = ADMIN.audit.filter(a => !FX.seedAudit.has(a.id));
    const codes = new Set(ADMIN.batches.map(b => b.code)); // the seed steps also allocate staff to the seeded batches in place
    ['chAlloc', 'chAsgSeed', 'evOver'].forEach(k => { if (STORE[k]) Object.keys(STORE[k]).forEach(c => { if (!codes.has(c)) delete STORE[k][c]; }); });
  }
  return r;
};

/* ---------- Demo controls in the client demo: only what works on its data ---------- */
// Variant pickers, edge states and simulations that act on the legacy records (other agencies, the IQA correction AQ-7001, a
// resubmission by a legacy learner…) and the 30 Demo Scenarios need the full legacy test data: they are offered there only.
const FX_LEGACY_SETS = /^(Agency variant|Agency edge states|IQA edge states|Coordinator edge state|Edge state \(§7\)|Demo only|Registration)/;
const _rdFX = renderDemo;
renderDemo = function () {
  const r = _rdFX.apply(this, arguments); if (!fxClient()) return r;
  const root = document.getElementById('demo-root'); if (!root) return r;
  root.querySelectorAll('fieldset').forEach(fs => {
    const lg = ((fs.querySelector('legend') || {}).textContent || '').trim();
    if (FX_LEGACY_SETS.test(lg) && !/Edge state \(§7\)/.test(lg)) return fs.remove();
    if (/^Edge state/.test(lg)) { fs.querySelectorAll('select').forEach(s => { const l = fs.querySelector(`label[for="${s.id}"]`); if (l) l.remove(); s.remove(); }); }
    if (/^Multi-Coordinator demo/.test(lg)) { const b = fs.querySelector('[data-act="mcDemoLoad"]'); if (b) b.remove(); } // its loader is in Demo data (the view buttons stay)
    if (/^Demo Scenarios/.test(lg)) fs.innerHTML = `<legend>${esc(lg)}</legend><p class="xs muted fx-sc-note">The 30 Demo Scenarios walk through the full legacy test data (internal). Load it from Demo data → "Load full legacy test data" to use them.</p>`;
    if (/^Teacher \/ Assessor variant/.test(lg)) fs.querySelectorAll('.vopt .xs.muted').forEach(s => { s.textContent = s.textContent.split(' · ')[0]; }); // (the notes named legacy batches)
  });
  root.querySelectorAll('[data-act="switchRole"][data-r="agyB"]').forEach(b => b.remove()); // that agency isn't in the client demo
  return r;
};

/* ---------- Screen indexes (internal documentation): their example record links point into the legacy test data ---------- */
Object.keys(SCREENS).filter(k => /(^|-)index$/.test(k)).forEach(k => {
  const f = SCREENS[k];
  SCREENS[k] = function () {
    const h = f.apply(this, arguments); if (!fxClient() || typeof h !== 'string') return h;
    const note = `<div class="note b-amber fx-idx-note">${ic('info')}<div class="small"><strong>Internal documentation.</strong> The example record links on this page open records of the full legacy test data, which the client demo doesn't contain — load it from Demo controls → "Load full legacy test data" to follow them.</div></div>`;
    const k1 = h.indexOf('</h1>'), end = k1 < 0 ? -1 : h.indexOf('</div>', k1); // after the page heading block
    return end < 0 ? note + h : h.slice(0, end + 6) + note + h.slice(end + 6);
  };
});

/* ---------- UX Changelog ---------- */
UXC.push(['FX', 'The client demo dataset is the default (27 Oct 2026)', [
  'A fresh start and Reset demo load a small client demo dataset: one published Level 3 programme with approved Self-Paced and Fully Assisted fee options (demonstration fees), one Open batch accepting both modes with two Academic Coordinators, a Teacher and an Assessor, four demo learners (two per mode, two per Coordinator), two published assignments with batch deadlines and one draft, two batch sessions, observation configuration, one published short course and one agency account. It is built through the real screens; its fees, Finance approval and learner activations are labelled simulated demonstration records.',
  'The legacy records (8 programmes, 14 batches, 72 learners, approvals, ledgers, IQA samples…) are not in it: the record lists are empty, so lists, counts, the dashboards, global search and selectors read the same reduced data. Screens that showed fixed example rows or figures count the client demo\'s records instead.',
  'Demo controls → Demo data: Reset demo, Load 101-learner Coordinator demo (on the client demo programme), and Load full legacy test data (internal — not client data; labelled while loaded). "Load clean client demo" and the duplicate Reset buttons are gone; controls that act on legacy records (other agencies, legacy edge states, the Demo Scenarios) are offered with the legacy data.',
  'The regression suites load the legacy fixture explicitly; a new suite checks the client demo dataset from a fresh start, including Create batch by clicking the real controls.',
  'Defects fixed: the first NVQ programme, assignment or approval-queue item created in an empty list got no ID; Finance → Plans with no payment plans and the Academic Admin screen index without the legacy batch crashed; Coordinator notifications named every new session "Leicester Cohort 7".']]);
