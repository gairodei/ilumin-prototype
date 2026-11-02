/* ============================================================
   AG-1 — Agency bundle discoverability and seat-to-learner connections (2 Nov 2026; PD-AG1-* in PROVISIONAL-DECISIONS.md).
   Loads after co1-competency.js.
   A1  Business Admin: a saved bundle says it is a Draft that agencies can't see, the steps still needed before it can be published
       (minimum-price approval, Finance VAT approval), a Publish button where the steps are, and a confirmation once it is published.
       The rules are unchanged: only Published bundles reach Buy Bundles, customised ones only their agency.
   A2  One identity: a learner's portal account is found from the learner record's ID (agyWorldKey, agency.js). Was: only through
       the record's "v", which the client demo's learners, sign-ups and learners the Academy activates don't have.
   A3  Short-course seat: the enrolment is built from the course's own definition (the Browse purchase path, without a payment) in
       the learner's own account, once; the learner is notified. A learner without an active account keeps the seat as assigned and
       the course is added when the account is activated. A learner already enrolled (self-funded or sponsored), with a payment
       pending, or already applying for the programme gets no seat — no conversion.
   A4  NVQ seat: its admission application is opened at the assignment, from the learner's own record (empty document checklist,
       no reviewer, delivery option and batch not chosen). Was: cloned from another applicant the first time Admissions was read.
   A5  Activation (agency link or the Academy's activation link) binds the learner's own portal account and then delivers the
       assigned seats. The agency's "Continue" opens that account (was: the persona Daniel Okafor).
   ============================================================ */
'use strict';

/* ---------- A1: Business Admin — Draft, the steps before publication, Publish, confirmation ---------- */
const ag1Scope = p => p.agency ? `${p.agency} only` : 'every agency';
function ag1Steps(p) {
  const pr = priceOf(p), f = p.floor || {}, q = f.qid ? f.qid : '', out = [];
  out.push(['Saved', 'done', p.status === 'Draft' ? `Draft, version ${p.version}` : `Version ${p.version}`]);
  if (!pr.below) out.push(['Minimum price', 'done', 'Above the minimum price — no approval needed']);
  else out.push(['Minimum price', f.state === 'Approved' ? 'done' : f.state === 'Pending' ? 'wait' : 'todo', f.state === 'Approved' ? `Below the minimum price — approved by the System Administrator${q ? ' (' + q + ')' : ''}` : f.state === 'Pending' ? `Awaiting System Administrator approval${q ? ' (' + q + ')' : ''}` : f.state === 'Rejected' ? 'Below the minimum price — rejected. Change the price, or resubmit' : 'Below the minimum price — submit it for System Administrator approval']);
  out.push(['VAT', p.vatPending ? 'wait' : 'done', p.vatPending ? `VAT change awaiting Finance approval${p.vatPending.qid ? ' (' + p.vatPending.qid + ')' : ''}` : (typeof chVatTxt === 'function' ? chVatTxt(p.vat) : 'No VAT')]);
  out.push(['Publish', p.status === 'Published' ? 'done' : p.status === 'Retired' ? 'na' : ag1Ready(p) ? 'todo' : 'wait', p.status === 'Published' ? `Published — visible to ${ag1Scope(p)} in Buy Bundles` : p.status === 'Retired' ? 'Retired — removed from Buy Bundles' : ag1Ready(p) ? 'Ready to publish' : 'After the steps above']);
  return out;
}
const ag1Ready = p => p.status === 'Draft' && !p.vatPending && (!priceOf(p).below || (p.floor || {}).state === 'Approved');
const ag1Next = p => ag1Steps(p).filter(s => s[1] === 'todo' || s[1] === 'wait').map(s => s[2]);
function ag1PubCard(p) {
  const vis = p.status === 'Published', pub = vis && [...p.history].reverse().find(h => h[3] === 'Published'), ST = { done: ['check', 'done'], wait: ['clock', 'cur'], todo: ['chev', 'cur'], na: ['x', ''] };
  return `<section class="card ag1-pub" aria-label="Publication"><div class="row-b"><h2>Publication</h2>${chip(vis ? 'Visible to agencies' : 'Not visible to agencies', vis ? 'green' : 'grey')}</div>
    ${vis ? `<div class="note b-green" role="status">${ic('check')}<div class="small"><strong>Published${pub ? ' on ' + fdt(pub[1]) + ' by ' + esc(pub[2]) : ''}.</strong> Version ${p.version} is in Buy Bundles for ${esc(ag1Scope(p))} now — no reset or reload needed. Existing purchases keep their terms.</div></div>`
      : p.status === 'Retired' ? '' : `<p class="small">${p.status === 'Pending approval' ? 'Pending approval' : 'Saved as Draft'} — not yet visible to agencies. Agencies see a bundle only once it is published.</p>`}
    <ol class="tl">${ag1Steps(p).map(([l, st, t]) => `<li class="${ST[st][1]}"><span class="tl-d">${ic(ST[st][0], 12)}</span><div class="small"><strong>${esc(l)}</strong><div class="xs muted">${esc(t)}</div></div></li>`).join('')}</ol>
    ${ag1Ready(p) ? `<button class="btn btn-primary" data-act="bPublish" data-id="${p.id}">${ic('check', 15)}Publish to ${esc(ag1Scope(p))}</button>` : ''}</section>`;
}
const _pdAG1 = productDetail;
productDetail = function (id) {
  const h = _pdAG1.apply(this, arguments), p = STORE.biz.products.find(x => x.id === id); if (!p || !/Version history/.test(h)) return h;
  return h.replace(/(<div class="note b-blue">[^]*?<strong>Version \d+\.<\/strong>)/, ag1PubCard(p) + '$1');
};
// The catalogue: who sees what, and Publish beside Open for a bundle that is ready
const _ptAG1 = productTable;
productTable = function (rows, id) {
  let h = _ptAG1.apply(this, arguments);
  (rows || []).filter(ag1Ready).forEach(p => { h = h.replace(`<button class="btn btn-sm" data-go="a-bundles" data-id="${p.id}" data-tab="catalogue">Open</button>`, `<button class="btn btn-sm" data-go="a-bundles" data-id="${p.id}" data-tab="catalogue">Open</button><button class="btn btn-sm btn-primary" data-act="bPublish" data-id="${p.id}">Publish</button>`); });
  return `<p class="small muted ag1-vis">${ic('info', 12)} Agencies see <strong>Published</strong> bundles only (customised ones only their agency). Draft and Pending approval bundles are not visible to agencies.</p>` + h;
};
// Save: say plainly that it is a Draft agencies can't see, and what is still needed (the handler's own messages are kept for VAT)
const _saveAG1 = saveProduct;
saveProduct = function (st) {
  const id0 = st && st.d && st.d.id, n0 = STORE.biz.products.length, msgs = [], t0 = toast; let r;
  toast = (m, k) => { msgs.push([m, k]); };
  try { r = _saveAG1.apply(this, arguments); } finally { toast = t0; }
  const p = r === false ? null : id0 ? STORE.biz.products.find(x => x.id === id0) : STORE.biz.products.length > n0 ? STORE.biz.products[STORE.biz.products.length - 1] : null;
  if (!p) { msgs.forEach(([m, k]) => toast(m, k)); return r; }
  const vat = msgs.filter(([m]) => /VAT/.test(m)).map(([m]) => m).join(' '), next = ag1Next(p).filter(t => t !== 'After the steps above');
  const head = p.status === 'Pending approval' ? 'Submitted for System Administrator approval — not yet visible to agencies.' : `Saved as Draft${id0 ? ' (version ' + p.version + ')' : ''} — not yet visible to agencies.`;
  toast(`${head}${next.length ? ' Next: ' + next.join('; ') + '.' : ''}${vat ? ' ' + vat : ''}`, 'info');
  return r;
};
// Publish: the published bundle's confirmation (the handler's own checks and audit apply)
const _pubAG1 = ACT.bPublish;
ACT.bPublish = el => {
  const p = STORE.biz.products.find(x => x.id === (el && el.dataset && el.dataset.id)), was = p && p.status, r = _pubAG1(el);
  const a = MODAL && MODAL.actions && MODAL.actions.find(x => x.cls === 'btn-primary' && x.fn);
  if (p && a && !a._ag1) { const f = a.fn; a._ag1 = true; a.fn = (...x) => { const t0 = toast; let res; toast = () => { }; try { res = f(...x); } finally { toast = t0; } if (p.status === 'Published' && was !== 'Published') toast(`Published — ${p.name} is now visible to ${ag1Scope(p)} in Buy Bundles.`); return res; }; }
  return r;
};

/* ---------- A2/A3: duplicate enrolment, seat delivery ---------- */
const AG1_ENDED = ['Completed', 'Withdrawn', 'Discontinued', 'Cancelled', 'Unassigned', 'Expired', 'Expired-Incomplete', 'Rejected'];
// Why this learner can't take a seat on this course ('' = can): an enrolment in their own account (self-funded or sponsored, a
// payment pending included), an NVQ application or sign-up for the programme, or an open agency NVQ application
function agySeatDupWhy(L, course) {
  if (!L || !course) return '';
  const k = agyWorldKey(L), w = k && STORE.worlds[k], nvq = /Diploma/.test(course);
  if (w) {
    const e = (w.enrolments || []).find(x => sameCourse(x.base || x.title, course) && !AG1_ENDED.includes(x.status));
    if (e) return `${L.name} is already enrolled on ${course}${e.status === 'Payment Pending' ? ' (payment pending)' : e.sponsor ? '' : ' (self-funded)'}`;
    if (nvq && w.flags && w.flags.nvq && w.nvq && sameCourse(w.nvq.title, course)) return `${L.name} has already applied for ${course}`;
  }
  const ap = (ADMIN.apps || []).find(x => x.lid === L.id && sameCourse(x.programme, course) && !['Rejected', 'Withdrawn'].includes(x.status));
  return ap ? `${L.name} already has an application for ${course} (${ap.id})` : '';
}
const _assignAG1 = agyDoAssign;
agyDoAssign = function (b, course, ids, quiet) {
  // A bundle that isn't the agency's or a learner off its roster: the e-sec.js guard underneath refuses and logs it
  if (!b || !Array.isArray(ids) || !agyBundles().some(x => x.id === b.id) || ids.some(id => !inRoster(id))) return _assignAG1.apply(this, arguments);
  const keep = [], why = [];
  ids.forEach(id => { const d = agySeatDupWhy(learnerById(id), course); if (d) why.push(d); else keep.push(id); });
  if (why.length) { w0Log('Agency seats', `${b.id} · ${course}`, 'Blocked: assign seats (already enrolled)', '—', 'No change', why.join('; ')); if (!quiet) toast(`Already enrolled — no seat used: ${why.join('; ')}.`, 'err'); }
  if (!keep.length) return 0;
  return _assignAG1.call(this, b, course, keep, quiet);
};
// Called by agyDoAssign for each new seat
function agySeatDeliver(a, L, b) {
  if (a.kind === 'nvq') return ag1NvqApp(a, L, b);
  const k = agyWorldKey(L);
  if (!k || L.acct !== 'Active') { a.awaitAct = true; return null; } // delivered when the account is activated (ag1Activated)
  return ag1ShortEnrol(k, a, b);
}
// The enrolment from the course's own definition (setup-s1.js s1Enrol, without a payment: the agency's seat pays for it)
function ag1ShortEnrol(k, a, b) {
  const w = STORE.worlds[k]; if (!w) return null;
  const old = w.enrolments.find(e => e.agyAssign === a.id); if (old) return old; // once per seat
  const row = (ADMIN.courses || []).find(c => c.title === a.course), at = a.at, id = 'sp' + a.id.slice(3);
  let e;
  if (row && typeof s1Spec === 'function') {
    const sp = s1Spec(row), items = sp.items.filter(i => i.status === 'Active');
    const content = items.map(it => ({ id: it.id, kind: it.kind, title: it.title, dur: it.dur || '', state: 'Not opened', dl: it.dl !== undefined ? it.dl : it.kind === 'doc', watch: 0, resume: '0:00', score: 0, src: it.src || '' }));
    const modules = s1Mods(row).filter(m => m.status === 'Active').map(m => { const qs = s1ActQs(m).map(q => [q.text, q.opts.slice(), q.correct]); return { id: m.id, title: m.title, items: m.items.filter(x => content.some(c => c.id === x)), quiz: { q: Math.min(m.quiz.q, qs.length) || qs.length, limit: m.quiz.limit, pass: m.quiz.pass, max: m.quiz.max, attempts: [], qs } }; });
    const pass = modules.length ? Math.min(...modules.map(m => m.quiz.pass)) : 80, reqs = S1_RULES.filter(([r]) => sp.rules[r]).map(([r, l]) => [r === 'quiz' ? `${l} with ${pass}% or more` : l, false]);
    e = { topic: sp.topic, desc: sp.desc, reqs, content, modules, validity: row.validity, courseId: row.id, fields: null, certTpl: { ...sp.cert, fields: sp.cert.fields.slice() }, remind: sp.remind };
    row.enrol = (row.enrol || 0) + 1;
  } else { const c = CATALOGUE.find(x => x.kind === 'short' && x.title === a.course) || { topic: '' }; e = { topic: c.topic, desc: c.desc || '', reqs: [['Open all documents', false], ['Pass the final quiz', false]], content: freshContent(c.topic), modules: shModules({ topic: c.topic }), validity: c.validity }; }
  Object.assign(e, { id, kind: 'short', type: 'Short course', title: a.course + ' — ' + new Date(now()).getFullYear(), base: a.course, status: 'Active', enrolled: at, start: at, end: a.end || b.validity, progress: 0, price: null, sponsor: b.agency, agyAssign: a.id });
  w.enrolments.unshift(e); a.enrolId = e.id; a.awaitAct = false; w.unassigned = null;
  notifyLearner(k, 'Courses', 'New course from ' + b.agency, `${b.agency} assigned you a seat on ${e.title}. Access until ${fd(e.end)}.`, 'course.' + e.id);
  return e;
}

/* ---------- A4: an NVQ seat opens its admission application at the assignment ---------- */
const AG1_DOCS = ['Passport', 'Right to work', 'Proof of address', 'Enhanced DBS certificate', 'Highest qualification certificate', 'CV'];
function ag1AppId(a) { let id = 'APP-4' + String(a.id).replace(/\D/g, ''), n = 0; const used = new Set((ADMIN.apps || []).map(x => x.id)); while (used.has(id)) id = 'APP-4' + String(a.id).replace(/\D/g, '') + '-' + (++n); return id; }
// The applications list, seeded by its own code first when it hasn't been yet (admin-a.js allApplications); agylink's copy step is off
function ag1Apps() { if (!ADMIN.apps) { ADMIN._agyApps = true; _appsAG1(); } return ADMIN.apps || (ADMIN.apps = []); }
const ag1AppOf = a => (ADMIN.apps || []).find(x => x.agySeat === a.id) || null;
function ag1NvqApp(a, L, b, seeded) {
  const apps = ag1Apps(), old = apps.find(x => x.agySeat === a.id); if (old) return old;
  const list = (ADMIN.checklist || []).filter(r => r[6] === 'Active' && r[1]).map(r => [r[0], r[2], r[3]]), docs = (list.length ? list : AG1_DOCS.map(n => [n, 'PDF, JPG or PNG', '5 MB'])).map(([n, f, m], k) => ({ id: 'sd' + k, name: n, mand: true, status: 'Pending', file: null, versions: [], uploaded: null, expires: null, formats: f, max: m }));
  const ap = { id: ag1AppId(a), name: L ? L.name : a.learner, lid: a.lid, programme: a.course, ref: 'Agency — ' + a.agency, agency: a.agency, applied: a.at, status: a.status === 'Under review' ? 'Under Review' : 'Pending — Documents Required', reviewer: '— Unassigned', days: 0, docsOk: 0, docsAll: docs.length, escalated: false, docs, agySeat: a.id, agyBundle: b ? b.id : a.bundle, mode: null, batch: null, fees: `Covered by the agency seat${b ? ' (' + b.name + ')' : ''}` };
  apps.push(ap); if (seeded) return ap; // a seeded seat's application: no new event, no audit row
  ADMIN.audit.unshift({ id: 'AU-AG1-' + a.id, actor: a.by || a.agency, role: 'Agency Administrator', at: now().toISOString(), module: 'Admissions', entity: ap.id, action: 'Application opened from an agency NVQ seat', before: '—', after: ap.status, reason: `${a.agency} · ${a.id} · ${a.course}`, ip: '86.12.44.10' });
  const k = L && agyWorldKey(L); if (k && L.acct === 'Active') notifyLearner(k, 'Account', 'Admission application opened', `${a.agency} assigned you a seat on ${a.course}. The Academy's admission process applies: documents and review.`, 'dashboard');
  return ap;
}
// Every agency NVQ seat waiting on admission has its own application (the seeded ones too) — never a copy of another applicant
function ag1EnsureApps() { if (!ADMIN || !STORE.agy || !STORE.agy.assign) return; ADMIN._agyApps = true; STORE.agy.assign.filter(x => x.kind === 'nvq' && ['Admission pending', 'Under review'].includes(x.status)).forEach(x => { if (!ag1AppOf(x)) ag1NvqApp(x, learnerById(x.lid), ADMIN.bundles.find(b => b.id === x.bundle), true); }); }
const _appsAG1 = allApplications;
allApplications = function () { if (ADMIN && STORE.agy && !ADMIN._ag1Busy) { ADMIN._ag1Busy = true; try { ADMIN._agyApps = true; ag1EnsureApps(); } finally { ADMIN._ag1Busy = false; } } return _appsAG1.apply(this, arguments); };
const _baAG1 = buildAdmin; buildAdmin = function () { const r = _baAG1.apply(this, arguments); try { ag1EnsureApps(); } catch (e) { /* seeded before the agency store */ } return r; };
const _isAG1 = initStore; initStore = function () { const r = _isAG1.apply(this, arguments); try { ag1EnsureApps(); } catch (e) { /* idem */ } return r; };
// Application detail: the delivery option and batch are not chosen by the seat (client decision)
const _apScrAG1 = SCREENS['a-admissions'];
SCREENS['a-admissions'] = p => {
  const h = _apScrAG1(p), ap = p && p.id && (ADMIN.apps || []).find(x => x.id === p.id && x.agySeat); if (!ap) return h;
  const note = `<div class="note b-blue ag1-app">${ic('info')}<div class="small"><strong>Agency NVQ seat (${esc(ap.agency)}, ${esc(ap.agySeat)}).</strong> Fees: ${esc(ap.fees)}. Delivery option and batch: <strong>not yet chosen</strong> — the agency seat doesn't set them (awaiting the Academy's policy). The normal admission review applies; admission is never granted by the seat.</div></div>`;
  const i = h.indexOf('<section'); return i >= 0 ? h.slice(0, i) + note + h.slice(i) : note + h;
};

/* ---------- A5: activation binds the learner's own account, then the assigned seats arrive ---------- */
function ag1Activated(L) {
  if (!L || L.acct !== 'Active') return; // an incomplete activation delivers nothing
  const k = agyWorldKey(L) || (typeof lnPortal === 'function' ? (lnPortal(L), agyWorldKey(L)) : null); if (!k) return;
  if (STORE.acct) STORE.acct[k] = 'Active';
  STORE.agy.assign.filter(a => a.lid === L.id && a.kind === 'short' && a.status === 'Active' && !a.enrolId).forEach(a => { const b = ADMIN.bundles.find(x => x.id === a.bundle); if (b) ag1ShortEnrol(k, a, b); });
}
const _setAG1 = SUBMIT.agyLearnerSet;
SUBMIT.agyLearnerSet = function () { const L = learnerById(S.agyNewLearner), r = _setAG1.apply(this, arguments); if (L && L.acct === 'Active') { if (typeof lnPortal === 'function' && !agyWorldKey(L)) lnPortal(L); ag1Activated(L); } return r; };
const _goAG1 = ACT.agyLearnerGo;
ACT.agyLearnerGo = () => { const L = learnerById(S.agyNewLearner), k = L && agyWorldKey(L); if (!k) return _goAG1(); S.agyNewLearner = null; S.portal = 'learner'; S.edge = 'none'; setVariant(k); S.signedIn = true; S.auth = 'signin'; go('dashboard'); };
const _authAG1 = authView;
authView = function () { const h = _authAG1.apply(this, arguments); return S.auth === 'agyLearnerDone' ? h.replace('In this prototype the learner portal opens as our sponsored demo learner, Daniel Okafor.', 'Continue opens your own learner portal, with the courses your agency assigned you.') : h; };
const _fsAG1 = SUBMIT.firstSet;
SUBMIT.firstSet = function () { const id = S.lnAct, r = _fsAG1.apply(this, arguments); if (id) ag1Activated(ADMIN.learners.find(x => x.id === id)); return r; };

/* ---------- Agency views: the seat's progress from the learner's enrolment; seats waiting for activation ---------- */
const _asgAG1 = agyAssign;
agyAssign = function () {
  const rows = _asgAG1.apply(this, arguments);
  rows.forEach(a => { if (!a.enrolId) return; const k = agyWorldKey(learnerById(a.lid)), e = k && STORE.worlds[k].enrolments.find(x => x.id === a.enrolId); if (!e) return; a.progress = e.progress || 0; if (e.status === 'Completed' && a.status === 'Active') a.status = 'Completed'; });
  return rows;
};
const AG1_SEAT_NOTE = `<div class="note b-grey ag1-seatnote">${ic('info')}<div class="small"><strong>Seat, entitlement and access.</strong> Assigning a seat uses one paid seat from the bundle for that learner (the entitlement). <strong>Short course:</strong> the learner can open it once their own account is active — at once if it already is, otherwise when they set their password. <strong>NVQ:</strong> the seat opens an admission application; the programme opens only after the Academy's admission decision and batch placement.</div></div>`;
const _seatsAG1 = SCREENS['g-seats'];
SCREENS['g-seats'] = p => {
  const h = _seatsAG1(p).replace('<div class="note b-blue">', AG1_SEAT_NOTE + '<div class="note b-blue">'), w = agyAssign().filter(a => a.awaitAct && a.status === 'Active'); if (!w.length) return h;
  return h.replace(AG1_SEAT_NOTE, `<div class="note b-amber ag1-await" role="status">${ic('clock')}<div class="small"><strong>${w.length} seat${w.length === 1 ? ' is' : 's are'} waiting for the learner to activate their account:</strong> ${w.map(a => `${esc(a.learner)} (${esc(a.course)})`).join(', ')}. The course appears in their portal when they set their password.</div></div>` + AG1_SEAT_NOTE);
};

/* ---------- Client demo: one published bundle, made by the Business Admin through the real handlers (PD-AG1-11) ----------
   The kept short course at its approved list price, 5 seats (below the first volume rate, so no discount), no VAT, available to every
   agency. Nothing is bought: no purchase, payment, seat or learner is created. */
const AG1_DEMO = 'Moving and Handling People — 5 seats (demo)';
function ag1DemoBundle() {
  const c = (ADMIN.courses || []).find(x => x.status === 'Published' && x.id === FX_SHORT); if (!c || STORE.biz.products.some(p => p.name === AG1_DEMO)) return;
  const keep = { portal: S.portal, signedIn: S.signedIn, route: S.route, params: S.params, av: ADMIN.av, biz: ADMIN.biz, ctx: S.bizCtx };
  try {
    bizEnter('BA'); ACT.newBundle(); $('#bp-n').value = AG1_DEMO; $$('#modal-root .bp-c').forEach(x => { x.checked = x.value === c.title; }); $('#bp-s').value = '5'; $('#bp-v').value = '365'; INP.bpCalc();
    const n0 = STORE.biz.products.length; MODAL.actions.find(x => x.label === 'Save and continue').fn(); if (MODAL) closeModal();
    const p = STORE.biz.products[n0]; if (!p || !ag1Ready(p)) throw new Error('Demo bundle not ready to publish');
    ACT.bPublish({ dataset: { id: p.id } }); $('#rsn').value = 'Client demo: the published short course at its list price (no discount, no VAT)'; const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a.fn() !== false && MODAL) closeModal();
    if (p.status !== 'Published') throw new Error('Demo bundle not published');
  } finally { closeModal(); if (!keep.biz) setAdminIdentity(keep.av || 'A'); Object.assign(S, { portal: keep.portal, signedIn: keep.signedIn, route: keep.route, params: keep.params, bizCtx: keep.biz ? keep.ctx : null }); }
}
const _cdBuildAG1 = cdBuild;
cdBuild = function () { const r = _cdBuildAG1.apply(this, arguments); ag1DemoBundle(); return r; };
