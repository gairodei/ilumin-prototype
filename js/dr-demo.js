/* ============================================================
   Demo identities and Demo controls of the client demo (DR, 31 Oct 2026; PD-DR-01… in PROVISIONAL-DECISIONS.md).
   The client demo is one small dataset (fx-fixtures.js + cd-demo.js): one published Level 3 programme, one mixed-mode batch, two
   NVQ learners (Self-Paced / Fully Assisted, one per Coordinator), one short-course learner, and the staff who work on them.
   - Sign-in page: one chooser of demo identities, each described from the records it opens (name, course, batch, mode,
     Coordinator, allocation). Choosing one is a prototype demonstration switch, not authentication: the role's normal portal and
     restrictions apply (Finance, System and Super Administrators still pass the two-step code). The email form signs in a demo
     identity by its email address.
   - Demo controls: Switch demo user (the same chooser), Reset demo (confirmed; restores the starting data), and a separate
     developer mode for internal test data (the 101-learner Coordinator demo, the full legacy fixture, edge states, scenarios).
   - Consistency: the admin, Finance and certificate views read the demo learners' own records (their learner record lists their
     enrolments; the ledger, the batch roster and the certificate register include them).
   The full legacy fixture (the harness pins it) is unchanged: none of this applies while it is loaded.
   Loads last.
   ============================================================ */
'use strict';

const drOn = () => typeof fxClient === 'function' && fxClient();
const drDev = () => !!S.drDev;
const drStaff = id => (ADMIN.staff || []).find(s => s.id === id) || {};
const drB = () => (typeof cdBatch === 'function' && cdBatch()) || null;
const drMine = name => { const b = drB(); return b ? mcLids(b).filter(l => mcOf(l, b) === name).map(l => (ADMIN.learners.find(x => x.id === l) || {}).name || l) : []; };
const drLearnerW = k => STORE.worlds && STORE.worlds[k];

/* ---------- The demo identities (each described from the records it opens) ---------- */
// [id, group, role label, name(), detail(), sign in, is current()]
function drPersonas() {
  const b = drB(), code = b ? b.code : '—', pr = typeof cdPr === 'function' && cdPr(), pt = pr ? pr.title : 'the demo programme';
  const L = (id, k, role) => [id, 'Learners', role, () => (drLearnerW(k) ? chFullName(drLearnerW(k)) : '—'), () => {
    const w = drLearnerW(k); if (!w) return 'Not in this dataset';
    if (role.startsWith('NVQ')) { const m = (w.signup && w.signup.plan && w.signup.plan.opt && w.signup.plan.opt.mode) || '—'; return `${pt} · ${code} · ${m} · Coordinator: ${(b && mcOf(w.me.id, b)) || '—'}`; }
    const e = w.enrolments.find(x => x.kind === 'short'); return e ? `${e.base} · short course · enrolled` : 'No enrolment';
  }, () => drLearnerIn(k), () => S.portal === 'learner' && S.variant === k];
  const C = (id, k, role) => [id, 'Academic staff', role, () => COO_USERS[k].name, () => { const m = drMine(COO_USERS[k].name); return `${code} · ${m.length} allocated learner${m.length === 1 ? '' : 's'}${m.length ? ': ' + m.join(', ') : ''}`; },
    () => { S.coo.v = k; cooEnter(); S.signedIn = true; go('c-dashboard'); }, () => S.portal === 'coord' && S.coo.v === k];
  const T = (id, v, role, what) => [id, 'Academic staff', role, () => TAS_USERS[v].name, () => `${what} ${b && (b.teachers || []).concat(b.assessors || []).includes(TAS_USERS[v].name) ? code : '(no batch)'}`,
    () => ACT.demoSignInAsTas({ dataset: { v } }), () => S.portal === 'staff' && S.tas.v === v];
  const A = (id, grp, role, sid, detail, fn) => [id, grp, role, () => drStaff(sid).name || '—', () => detail, fn, () => S.portal === 'admin' && ADMIN && ADMIN.me && ADMIN.me.name === drStaff(sid).name && ADMIN.me.roles.join() === (drStaff(sid).roles || []).join()];
  return [
    L('nvq-sp', 'CD1', 'NVQ Learner — Self-Paced'), L('nvq-fa', 'CD2', 'NVQ Learner — Fully Assisted'), L('short', 'CD3', 'Short-Course Learner'),
    C('coord1', 'A', 'Academic Coordinator 1'), C('coord2', 'B', 'Academic Coordinator 2'),
    T('teacher', 'T', 'Teacher', 'Teaches'), T('assessor', 'S', 'Assessor', 'Assesses'),
    A('aca', 'Academic staff', 'Academic Administrator', 'ST-009', 'Programmes, batches, admissions and assignments', () => ACT.demoSignInAsAca({ dataset: { v: 'KA' } })),
    A('fin', 'Administration', 'Finance Administrator', 'ST-011', 'Fee approvals, payment schedules and the ledger · two-step code 123456', () => ACT.demoSignInAsFin({ dataset: { v: 'FA' } })),
    A('sys', 'Administration', 'System Administrator', 'ST-003', 'Every programme, batch, learner and staff account · two-step code 123456', () => ACT.demoSignInAsSys({ dataset: { v: 'SY' } })),
    ['super', 'Administration', 'Super Administrator', () => ADMIN_VARIANTS.A.me, () => 'Full access, including final approvals · two-step code 123456', () => { setAdminIdentity('A'); ACT.demoSignInAs({ dataset: { r: 'admin' } }); }, () => S.portal === 'admin' && ADMIN && ADMIN.av === 'A' && !ADMIN.aca && !ADMIN.fin && !ADMIN.sysRole && !ADMIN.iqaRole && !ADMIN.biz],
    A('iqa', 'Other roles', 'Internal Quality Assurer', 'ST-008', 'Sampling of marked work — nothing has been marked yet', () => ACT.demoSignInAsIqa({ dataset: { v: 'QA' } })),
    ['agency', 'Other roles', 'Agency', () => ((ADMIN.agencies || [])[0] || {}).name || '—', () => 'Agency portal — no sponsored learners yet', () => ACT.switchRole({ dataset: { r: 'agyA' } }), () => S.portal === 'agency'],
    A('biz', 'Other roles', 'Business Administrator', 'ST-013', 'Agencies, products and announcements', () => ACT.demoSignInAsBiz({ dataset: { v: 'BA' } })),
  ];
}
const drFind = id => drPersonas().find(p => p[0] === id);
function drLearnerIn(k) {
  if (!drLearnerW(k)) return toast('This demo learner is not in the loaded data. Reset demo restores it.', 'info');
  S.edge = 'none'; setVariant(k); S.portal = 'learner'; S.signedIn = true; S.auth = 'signin'; S.authMsg = null; S.serverError = false; go('dashboard');
}
function drWhoHtml() {
  const ps = drPersonas(), groups = ['Learners', 'Academic staff', 'Administration', 'Other roles'];
  const btn = p => `<button type="button" class="dr-id" data-act="drAs" data-p="${p[0]}"><span class="dr-id-r">${esc(p[2])}</span><span class="dr-id-n">${esc(p[3]())}</span><span class="dr-id-d">${esc(p[4]())}</span></button>`;
  const sec = g => { const l = ps.filter(p => p[1] === g); return g === 'Other roles' ? `<details class="dr-grp dr-more"><summary>${g} (${l.length})</summary><div class="dr-ids">${l.map(btn).join('')}</div></details>` : `<div class="dr-grp"><h3>${g}</h3><div class="dr-ids">${l.map(btn).join('')}</div></div>`; };
  return `<div class="dr-who">${groups.map(sec).join('')}</div>`;
}
ACT.drAs = el => {
  const p = drFind(el.dataset.p); if (!p) return;
  closeModal(); S.demoOpen = false; if (S.signedIn) signOut();
  p[5]();
  if (S.signedIn) toast(`Demo identity: ${p[3]()} — ${p[2]}. A prototype demonstration switch, not a real sign-in.`, 'info');
};

/* ---------- Sign-in page: the chooser replaces the list of sample sign-in buttons ---------- */
const _authDR = authView;
authView = function () {
  const h = _authDR.apply(this, arguments);
  if (!drOn() || drDev() || S.auth !== 'signin' || typeof h !== 'string') return h;
  const k = h.indexOf('<div class="demo-hint">'), e = h.lastIndexOf('</div></main></div>'); if (k < 0 || e < k) return h;
  return h.slice(0, k) + `<section class="dr-signin" aria-labelledby="dr-h"><div class="row-b"><h2 id="dr-h">Demo identities</h2><span class="typebadge">Prototype only</span></div>
    <p class="xs muted">Choose who to sign in as. Every identity works on the same demo records: one Level 3 programme, one batch, two NVQ learners and one short-course learner. You can also type an identity's email address above (any password).</p>${drWhoHtml()}</section>` + h.slice(e);
};
// The email form: a demo identity's email signs in as that identity; other addresses are not demo accounts (the error-state words still work)
const _siDR = SUBMIT.signin;
SUBMIT.signin = form => {
  if (!drOn() || drDev()) return _siDR(form);
  const e = (($('#si-email') || {}).value || '').trim().toLowerCase(), pw = ($('#si-pw') || {}).value;
  if (!e || !pw || /wrong|locked|unverified|inactive|suspended|deactivated/.test(e) || S.returnTo) return _siDR(form);
  const lk = learnerAccounts().find(k => (drLearnerW(k).me.email || '').toLowerCase() === e); // any learner account, by its email (DR-A)
  if (lk && STORE.acct[lk] === 'Pending Verification') { S.authEmail = e; S.authMsg = { html: '<strong>This account is not activated yet.</strong> Open the activation link in your email to set your password first.' }; render(); return; }
  if (lk) { S.authEmail = e; setVariant(lk); return _siDR(form); }
  const p = drPersonas().find(x => x[1] !== 'Learners' && x[0] !== 'agency' && x[0] !== 'super' && [...Object.values(COO_USERS), ...Object.values(TAS_USERS), ...ADMIN.staff].some(s => (s.email || '').toLowerCase() === e && s.name === x[3]()));
  if (p) { S.authEmail = e; ACT.drAs({ dataset: { p: p[0] } }); return; }
  S.authEmail = e; S.authMsg = { tone: 'blue', html: '<strong>That email isn\'t one of the demo accounts.</strong> Choose a demo identity below, or type its email address.' }; render();
};

/* ---------- Demo controls: Switch demo user, Reset demo, and a separate developer mode ---------- */
function drCurrent() { if (!S.signedIn) return null; const p = drPersonas().find(x => { try { return x[6](); } catch (e) { return false; } }); return p ? `${p[3]()} — ${p[2]}` : null; }
function drPanel() {
  const cur = drCurrent();
  return `<div class="demo-panel dr-panel" role="dialog" aria-label="Demo controls"><div class="row-b"><h2>Demo controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>
    <p class="small dr-cur">${cur ? `Viewing as <strong>${esc(cur)}</strong>` : S.signedIn ? 'Viewing as a role outside the demo identities.' : 'Not signed in.'}</p>
    <div class="dr-ctl"><button class="btn btn-primary" data-act="drSwitch">${ic('users', 15)} Switch demo user</button><p class="xs muted">Sign in as another demo identity — the same list as the sign-in page.</p></div>
    <div class="dr-ctl"><button class="btn" data-act="drReset">${ic('refresh', 15)} Reset demo</button><p class="xs muted">Restores the starting demo data and signs everyone out. Discards every change made in this browser tab.</p></div>
    <div class="dr-ctl dr-devl"><button class="linklike xs" data-act="drDevOn">Developer mode (internal test data)…</button></div></div>`;
}
// the Demo controls button names the person, not the internal variant key ("variant CD1")
const _whoDR = demoWho;
demoWho = function () { const r = _whoDR.apply(this, arguments); return drOn() && !drDev() ? r.replace(/ · variant \S+$/, '') : r; };
const _rdDR = renderDemo;
renderDemo = function () {
  if (!drOn() || drDev()) {
    const r = _rdDR.apply(this, arguments);
    if (drDev()) { const p = document.querySelector('#demo-root .demo-panel'), h = p && p.querySelector('.row-b'); if (h && !p.querySelector('.dr-dev-note')) h.insertAdjacentHTML('afterend', `<div class="note b-red dr-dev-note" role="status">${ic('alert')}<div class="small"><strong>Developer mode — internal test data and tools.</strong> Not for client demonstrations. <button class="linklike" data-act="drDevOff">Exit developer mode</button></div></div>`); }
    return r;
  }
  $('#demo-root').innerHTML = `<button class="demo-fab" data-act="demoToggle" aria-expanded="${S.demoOpen}">${ic('target', 16)}<span class="fab-l">Demo controls</span></button>${S.demoOpen ? drPanel() : ''}`;
};
ACT.drSwitch = () => { S.demoOpen = false; renderDemo(); openModal({ title: 'Switch demo user', sub: 'Prototype demonstration — every identity works on the same demo records', size: 'lg', body: drWhoHtml(), actions: [{ label: 'Cancel' }] }); };
ACT.drReset = () => confirmDlg({ title: 'Reset the demo?', ok: 'Reset demo', danger: true,
  body: '<p>This restores the starting demo data: one Level 3 programme, one batch, two NVQ learners and one short-course learner.</p><p><strong>Everything changed in this browser tab is discarded</strong> — new learners, batches, submissions, payments and decisions. Everyone is signed out.</p>',
  onOk: () => { S.drDev = false; S.demoOpen = false; ACT.resetDemo(); signOut(); toast('Demo reset: the starting demo data is loaded. Choose a demo identity to continue.', 'info'); } });
ACT.drDevOn = () => confirmDlg({ title: 'Open developer mode?', ok: 'Open developer mode',
  body: '<p>Developer mode shows the internal testing tools: the 101-learner Coordinator demo, the full legacy test data, edge states and the Demo Scenarios. They are for internal testing, not client demonstrations.</p><p class="small muted">Exit developer mode, or Reset demo, to return to the client view.</p>',
  onOk: () => { S.drDev = true; S.demoOpen = true; render(); } });
ACT.drDevOff = () => { S.drDev = false; render(); toast(drOn() ? 'Developer mode closed.' : 'Developer mode closed. The legacy test data is still loaded — Reset demo returns to the client demo.', 'info'); };
// the full fixture is internal: loading it keeps developer mode on, so its own controls stay available
const _fxLegDR = ACT.fxLegacy; ACT.fxLegacy = el => { S.drDev = true; return _fxLegDR(el); };

/* ---------- Screen indexes are internal documentation: not in the client view's navigation ---------- */
AFTER.push(() => {
  if (!drOn() || drDev() || !S.signedIn) return;
  $$('#app nav a, #app nav button').filter(a => /screen index$/i.test(a.textContent.trim())).forEach(a => (a.closest('li') || a.closest('.adm-group') || a).remove());
});

/* ---------- DR-A (PD-DR-14): a learner added by the Academy activates their own portal account ----------
   Add learner creates the learner record and "sends" the activation / set-password link; until now nothing could follow that link, so
   the record had no portal account. The record's page (while Pending Verification) offers "Open the activation link (prototype —
   simulated email)": it binds a learner-portal account to the record's ID — the same mapping the client demo's learners and a sign-up
   use (one person, one ID) — and opens the existing set-password screen for it. Setting the password activates the account (audited as
   the learner's action). Nothing else is granted: the learner starts with no enrolment and must sign up (details, documents, offer
   letter, payment) and be admitted as any learner. Works on both fixtures. */
const lnKey = L => 'AL' + String(L.id).replace(/\D/g, '');
function lnPortal(L, key) {
  key = key || lnKey(L); if (STORE.worlds[key]) return STORE.worlds[key];
  const keepW = W, keepV = S.variant, [first, ...rest] = String(L.name).split(' ');
  PERSONAS[key] = { id: L.id, first, last: rest.join(' '), email: L.email, mobile: L.mobile || '', dob: L.dob || '', address: L.address || '', postcode: L.postcode || '', country: L.country || 'United Kingdom', tz: L.country === 'United Arab Emirates' ? 'Asia/Dubai' : 'Europe/London', cur: 'GBP', joined: L.joined || fd(now().toISOString()), referral: L.referral || 'Created by admin', sponsor: L.agency || null };
  VARIANTS[key] = { nvq: false, fresh: true };
  const w = makeWorld(key); W = keepW; S.variant = keepV;
  // a new account has no history: the template's records are removed, so nothing is shown that this learner didn't do
  Object.assign(w, { enrolments: [], plan: [], observations: [], docs: [], tx: [], plans: [], certs: [], requests: [], threads: [], attendance: [], events: [], notifs: [], announcements: [], drafts: {}, payOverdue: null, referral: null, pd: { items: [], session: { status: 'Not scheduled', at: null, mode: '—', loc: '', with: '' } } });
  if (w.workplace) Object.assign(w.workplace, { perm: 'Not entered', name: '', address: '', postcode: '', ctitle: '', cname: '', cemail: '', cphone: '' });
  STORE.worlds[key] = w; STORE.acct = STORE.acct || {}; STORE.acct[key] = L.acct === 'Active' ? 'Active' : 'Pending Verification';
  if (!VARIANT_INFO[key]) VARIANT_INFO[key] = ['Learner added by the Academy', `${L.name} · ${L.id}`];
  return w;
}
ACT.lnActLink = el => {
  const L = ADMIN.learners.find(x => x.id === el.dataset.id); if (!L) return;
  if (L.acct !== 'Pending Verification') return toast('This activation link has already been used — the account is active. The learner signs in with their email.', 'info');
  const key = lnKey(L); lnPortal(L, key); closeModal(); S.demoOpen = false; if (S.signedIn) signOut();
  S.edge = 'none'; setVariant(key); S.portal = 'learner'; S.staffFlow = false; S.lnAct = L.id; S.auth = 'first'; S.authMsg = null; render();
};
const _fsLN = SUBMIT.firstSet;
SUBMIT.firstSet = function () {
  const id = S.lnAct, r = _fsLN.apply(this, arguments); if (!id) return r;
  const L = ADMIN.learners.find(x => x.id === id); S.lnAct = null;
  if (L && L.acct === 'Pending Verification') {
    L.acct = 'Active'; STORE.acct[lnKey(L)] = 'Active';
    logA('Learners', L.id, 'Account activated', 'Pending Verification', 'Active', 'The learner set their password from the activation link (prototype — simulated email)');
    Object.assign(ADMIN.audit[0], { actor: L.name, role: 'Learner' });
  }
  return r;
};
const _avLN = authView;
authView = function () {
  const h = _avLN.apply(this, arguments); if (S.auth !== 'first' || !S.lnAct || typeof h !== 'string') return h;
  return h.replace('<div class="auth-card">', `<div class="auth-card"><div class="note b-purple ln-sim" role="note">${ic('info')}<div class="small"><strong>Prototype — simulated activation email.</strong> This is the page the activation link opens; no email was sent.</div></div>`);
};
// the record's page offers the link while the account is pending
const _alLN = SCREENS['a-learner'];
SCREENS['a-learner'] = function (p) {
  const h = _alLN.apply(this, arguments), L = p && p.id && ADMIN.learners.find(x => x.id === p.id);
  if (!L || L.acct !== 'Pending Verification' || typeof h !== 'string') return h;
  const note = `<div class="note b-blue ln-act">${ic('send')}<div class="small"><strong>Pending activation.</strong> An activation / set-password link was sent to ${esc(L.email)}. The learner sets a password from it, then signs in to their own portal (no course access until they sign up and are admitted). <button class="btn btn-sm" data-act="lnActLink" data-id="${esc(L.id)}">Open the activation link (prototype — simulated email)</button></div></div>`;
  const k1 = h.indexOf('</h1>'), end = k1 < 0 ? -1 : h.indexOf('</div>', k1);
  return end < 0 ? note + h : h.slice(0, end + 6) + note + h.slice(end + 6);
};
// a reset removes the accounts with the rest of the data (their persona entries too)
const _isLN = initStore;
initStore = function () { Object.keys(VARIANT_INFO).concat(Object.keys(PERSONAS)).filter(k => /^AL\d+$/.test(k)).forEach(k => { delete VARIANT_INFO[k]; delete PERSONAS[k]; delete VARIANTS[k]; }); if (/^AL\d+$/.test(S.variant)) S.variant = 'C'; return _isLN.apply(this, arguments); };

/* ---------- The demo learners' records, read the same way by every view ---------- */
// A learner record lists what its portal account is enrolled on (it was registered before they enrolled, by Add learner) — both fixtures
function drSyncCourses(w) {
  if (!w || !w.me || typeof ADMIN === 'undefined' || !ADMIN) return; const l = ADMIN.learners.find(x => x.id === w.me.id); if (!l) return;
  l.courses = [...new Set(w.enrolments.map(e => e.base || e.title))];
}
const _chCompleteDR = chComplete; chComplete = function (w) { const r = _chCompleteDR.apply(this, arguments); drSyncCourses(w); return r; };
const _s1EnrolDR = s1Enrol; s1Enrol = function () { const r = _s1EnrolDR.apply(this, arguments); drSyncCourses(W); return r; };
// One admin row per person: a learner with a learner record is listed from that record (not again from their portal account)
const _dlDR = demoLearners;
demoLearners = function () { const l = _dlDR.apply(this, arguments); if (!drOn()) return l; const ids = new Set(ADMIN.learners.map(x => x.id)); return l.filter(x => !ids.has(x.id)); };
// The batch roster: its members (the sample rows the legacy roster adds are legacy data)
const _brDR = batchRoster;
batchRoster = function (b) { if (!drOn()) return _brDR.apply(this, arguments); const ids = mcLids(b); return ids.map(id => { const l = learnerById(id) || {}; return [l.name || id, id, l.agency || 'Self-funded']; }).concat((b.roster || []).filter(r => !ids.includes(r[1]))); };
// The ledger and the certificate register: the demo learners' payments and certificates (the legacy worlds A–F are not learners here)
const _txDR = allTx;
allTx = function () {
  const t = _txDR.apply(this, arguments); if (!drOn()) return t;
  const mine = learnerAccounts().flatMap(v => drLearnerW(v).tx.map(x => { const ref = String(x.ref || ''), gw = !/Bank/.test(x.method || '');
    return { ...x, payer: VNAME(v), cur: x.cur || 'GBP', mode: gw ? 'Gateway' : 'Bank transfer', status: TXST[x.status] || x.status, course: x.desc, v, amount: Math.abs(x.amount), refund: x.amount < 0, payerType: 'Learner', source: gw ? 'Gateway (auto)' : 'Manual', gref: gw ? 'pi_3P' + ref.replace(/\D/g, '') + 'Lm' : '—', receipt: x.status === 'Succeeded' ? 'RCP-' + ref.replace(/\D/g, '').slice(-5) : '—' }; }));
  return t.concat(mine).sort((a, b) => new Date(b.at) - new Date(a.at));
};
const _certDR = allCerts;
allCerts = function () { const out = _certDR.apply(this, arguments); if (!drOn()) return out; learnerAccounts().forEach(v => drLearnerW(v).certs.forEach(c => out.push({ key: v + ':' + c.id, v, c, no: c.no, learner: VNAME(v), course: c.course, issued: c.issued, expires: c.expires, status: c.status, tpl: 'v' + (c.supersedes ? 3 : 2), sponsor: '—', lineage: !!c.supersedes }))); return out; };

/* ---------- UX Changelog ---------- */
UXC.push(['DR', 'One small, consistent client demo (31 Oct 2026)', [
  'The client demo holds one published Level 3 programme (approved Self-Paced and Fully Assisted demonstration fees), one Open batch accepting both modes with two Academic Coordinators, a Teacher and an Assessor, two NVQ learners — Amira Shah (Self-Paced, Dr Helen Carter) and Dev Patel (Fully Assisted, Michael Osei) — admitted through the real sign-up, simulated checkout and Academic Admin approval, and one short-course learner, Lena Hart, enrolled on Moving and Handling People through Browse and the simulated checkout.',
  'Sign-in page: the sample sign-in buttons (19, several pointing at records the client demo doesn\'t contain — "Aisha" opened an empty account) are replaced by one list of demo identities, each described from the records it opens. The email form signs in a demo identity by its address.',
  'Demo controls: Switch demo user, Reset demo (confirmed, signs everyone out) and a separate developer mode for the internal test data (101-learner demo, legacy fixture, edge states, Demo Scenarios). Screen indexes leave the client view\'s navigation.',
  'Consistency: the learners\' records list their enrolments; the batch counts each learner once; the ledger, the batch roster, the certificate register and the Approvals Queue read the demo learners\' own records.',
  'Final corrections (both fixtures): a learner\'s message reaches their designated Coordinator (and staff inboxes read every learner account, not worlds A–F); a learner added by the Academy can open their activation link (prototype — simulated email), set a password and use their own portal, still needing sign-up and admission; a learner whose batch hasn\'t started is "Not started", not At risk (and viewing never writes the flag); Batches lists every Coordinator; a new short-course enrolment starts at 0 % (no inherited progress).']]);
