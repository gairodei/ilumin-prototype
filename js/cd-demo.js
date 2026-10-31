/* ============================================================
   Client demo preset (26 Oct 2026; PD-CD-01…05 in PROVISIONAL-DECISIONS.md). Demo controls → "Client demo".
   An additive, guided example built on top of the seeded data through the real workflows — nothing seeded is hidden, deleted or
   rewritten, and no approval, signature, payment or outcome is invented:
   - Reset first (a predictable start), then, as the Academic Admin, Course Builder creates a Level 3 programme priced by fee options by
     delivery mode (Self-Paced and Fully Assisted), with its structure, observation configuration, assignments (drafts) and offer letter;
     the payment terms are submitted to Finance, a Finance Admin approves them in the Approvals Queue, and the programme is published.
   - Create batch (the wizard) makes one mixed-mode batch with two Academic Coordinators; Add learner registers the demo learners labelled
     "(demo)" (they receive activation links). The one simulated learner action is their activation (setting a password from the link —
     there is no admin step for it; audited as a demo step). Two assignments are published to the batch with batch deadlines; one stays a draft.
   - DR (31 Oct 2026, PD-DR-02/03): the two NVQ learners then sign up in their own portal (the sign-up places them in the batch) and an
     Academic Admin admits them; the short-course learner buys the short course. Their payments go through the prototype checkout and are
     labelled and audited as simulated. Submissions, marking, observations and certificates are NOT simulated.
   The 101-learner / 10-Coordinator demo stays a separate preset; neither loads the other.
   Everything is held in this browser tab's memory: reloading the page or Reset demo returns to the starting data.
   Loads last.
   ============================================================ */
'use strict';

const CD_T = 'Level 3 Diploma in Care Practice (client demo)', CD_B = 'DEMO-L3-JAN27';
const CD_TEACHER = 'Marcus Bell', CD_ASSESSOR = 'James Pryce'; // demo staff accounts: Teacher only / Assessor only (TAQA)
// DR (PD-DR-02): two NVQ learners (one per delivery mode, one per Coordinator) and one short-course learner — nobody else
const CD_LEARNERS = [['Amira Shah (demo)', 'Self-Paced'], ['Dev Patel (demo)', 'Fully Assisted'], ['Lena Hart (demo)', 'Short course']];
const CD_SIGNUP = { 'Amira Shah (demo)': ['1992-03-14', '12 Demo Street, London'], 'Dev Patel (demo)': ['1988-11-02', '4 Example Road, Leicester'] }; // synthetic
const cdPr = () => (ADMIN.programmes || []).find(p => p.title === CD_T) || null;
const cdBatch = () => (ADMIN.batches || []).find(b => b.code === CD_B) || null;
const cdOn = () => !!(cdPr() && cdBatch());

// The steps run through the screens' own handlers (their checks, permissions and audit apply); a step that is refused stops the build
function cdBuild() {
  const put = o => Object.entries(o).forEach(([k, v]) => { const e = $(k); if (!e) throw new Error('Missing field ' + k); e.value = v; });
  const ok1 = r => { const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !a.fn) return undefined; if (r !== undefined) { const t = $('#rsn'); if (t) t.value = r; } const res = a.fn(); if (res === false) throw new Error((MODAL && MODAL.title) + ': ' + ($$('#modal-root .err').map(e => e.textContent).join(' ') || 'refused')); if (MODAL) closeModal(); return res; };
  const tick = (sel, vals) => $$('#modal-root ' + sel).forEach(x => { if (!x.disabled) x.checked = vals.includes(x.value); });
  const aca = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; }, fin = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  // 1. Course Details: Level 3, fee options by delivery mode (demonstration fees)
  aca(); go('a-programmes'); ACT.chProgNew();
  put({ '#np-t': CD_T, '#np-l': 'Level 3', '#np-r': 'QN 610/0001/0 (demo)', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel($('#np-l')); $('#np-obs-yes').checked = true;
  [['Self-Paced', 1800], ['Fully Assisted', 2600]].forEach(([m, f], k) => { if (k) ACT.r1NpAdd(); const r = $$('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = m + ' (demo fee)'; r.querySelector('.r1-np-f').value = String(f); r.querySelector('.r1-np-m').value = m; });
  const pr = ACT.cbDetCreate(); closeModal(); if (!pr || !pr.id) throw new Error('Course Details: ' + $$('main .err').map(e => e.textContent).join(' '));
  const id = pr.id;
  // 2. Curriculum: one unit with a knowledge outcome and an observed outcome
  go('a-programmes', { id, tab: 'structure' });
  ACT.ch8AddUnit({ dataset: { id } }); put({ '#u-t': 'Person-centred care' }); ok1();
  ACT.ch8AddMod({ dataset: { id, u: 0 } }); put({ '#m-t': 'Core practice', '#m-ab': 'D/650/0001' }); ok1();
  ACT.ch8AddLo({ dataset: { id, u: 0, m: 0 } }); put({ '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); ok1();
  ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 0 } }); put({ '#c-d': 'Explain person-centred values', '#c-e': 'Written account' }); ok1();
  ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 0 } }); put({ '#c-d': 'Describe how to agree a care plan', '#c-e': 'Written account' }); ok1();
  ACT.ch8AddLo({ dataset: { id, u: 0, m: 0 } }); put({ '#lo-t': 'Work in a person-centred way', '#lo-y': 'Observation' }); ok1();
  ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 1 } }); put({ '#c-d': 'Support an individual to make choices', '#c-e': 'Direct observation in the workplace' }); ok1();
  // 3. Observations: workplace and Academy office, assessor notes, one event
  go('a-programmes', { id, tab: 'observations' }); ACT.n5Settings({ dataset: { p: id } });
  [['n5-req', 'yes'], ['n5-wp', 'Permitted'], ['n5-off', 'Available']].forEach(([n, v]) => { const x = $(`#modal-root input[name="${n}"][value="${v}"]`); if (x) x.checked = true; }); ok1();
  const d = n5Draft(pr), nvq = n5NvqOk(pr, d).map(x => x.code), ia = (d.ia || []).filter(x => x.status === 'Active').map(x => x.code);
  nvq.forEach(c => { ACT.n5NvqEv({ dataset: { p: id, c } }); tick('.n5-ev', ['notes']); ok1(); });
  ia.forEach(c => { ACT.n5IaEdit({ dataset: { p: id, c } }); tick('.n5-ev', ['notes']); tick('.n5-map', [nvq[0]]); ok1(); });
  ACT.cbObsEv({ dataset: { p: id, e: '' } }); put({ '#ev-n': 'Workplace or Academy-office observation' }); tick('.ev-l', ['workplace', 'office']); tick('.ev-c', nvq.concat(ia)); tick('.ev-e', ['notes']); ok1();
  // 4. Assignments (drafts until the batch has its deadlines)
  const kcrit = s2 => s2Crit(s2).filter(c => c.type === 'Knowledge').map(c => c.code);
  const asgs = ['Assignment 1 — Person-centred values', 'Assignment 2 — Agreeing a care plan', 'Assignment 3 — Reflective account'].map((t, k) => {
    go('a-programmes', { id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: id } }); put({ '#cna-t': t }); ok1(); const a = s2Defs().find(x => x.title === t);
    ACT.s2QAdd({ dataset: { id: a.id } }); put({ '#aq-t': 'Answer the brief using an example from your workplace.', '#aq-ev': 'A real example from your workplace', '#aq-n': '2' }); tick('.aq-ty', ['PDF']); ok1();
    INP.mapChange({ checked: true, dataset: { id: a.id, q: a.qs[0].id, c: kcrit(a)[Math.min(k, kcrit(a).length - 1)] } }); return a;
  });
  // 5. Fees & Payments: observation fees (the Academy's configured rates) and six monthly payments for each option
  go('a-programmes', { id, tab: 'fees' });
  cb8Work(pr).opts.filter(o => o.status === 'Active').map(o => o.id).forEach(oid => { const o = cb8Work(pr).opts.find(x => x.id === oid), rate = String(chFeeAmt(o.mode === 'Self-Paced' ? 'Self-paced' : 'Fully assisted'));
    ACT.cb8Opt({ dataset: { p: id, o: oid } }); [['#c8-wp', rate], ['#c8-off', rate]].forEach(([k, v]) => { const e = $('#modal-root ' + k); if (e && !e.value) e.value = v; }); ok1(); });
  cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: id, o: o.id, k: '6' } }));
  // 6. Offer letter (the sample template)
  go('a-programmes', { id, tab: 'letter' }); ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); ok1('Client demo — first version');
  // 7. Finance: the Academic Admin submits; a Finance Admin approves in the Approvals Queue
  go('a-programmes', { id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: id } }); if (MODAL) ok1(); const wf = cb8Wf(pr); if (!wf || !wf.qid) throw new Error('Fees & Payments: ' + cb8Issues(pr, cb8Work(pr)).map(x => x.msg).join('; '));
  fin(); go('a-queue', { id: wf.qid }); ACT.e1Decide({ dataset: { id: wf.qid, a: 'approve' } }); if (MODAL) ok1('Checked against the demonstration price list');
  // 8. Review & Publish
  aca(); go('a-programmes', { id, tab: 'review' }); const why = cbRvChecks(pr).block.map(x => x.msg); if (why.length) throw new Error('Review & Publish: ' + why.join('; '));
  ACT.cbPublish({ dataset: { id } }); ok1('Client demo — ready for intake'); if (pr.status !== 'Active') throw new Error('Publish refused');
  // 9. Create batch: both modes, two Academic Coordinators
  const coords = ADMIN.staff.filter(s => s.status === 'Active' && s.roles.includes('Academic Coordinator')).map(s => s.name).sort((a, b) => (b === 'Dr Helen Carter') - (a === 'Dr Helen Carter'));
  go('a-batches'); ACT.newBatch(); put({ '#nb-c': CD_B }); const co = $('#modal-root #nb-co'); co.value = CD_T; INP.n2NbCourse(co); $('#modal-root #nb-m').value = 'Blended';
  $$('#modal-root .m-m').forEach(x => { x.checked = true; INP.mModeTick(x); }); if (MODAL.actions.find(a => /primary/.test(a.cls)).fn() === false) throw new Error('Create batch: ' + $('#modal-root').textContent.slice(0, 200));
  $('#modal-root #nb-ac').value = coords[0]; const two = $$('#modal-root .mc-nb-c').find(i => i.value === coords[1]); if (two) two.checked = true;
  // FX (PD-FX-09): one Teacher-only and one Assessor-only account on the same Staff step (neither is a Coordinator — roles stay separate)
  $$('#modal-root .nb-t').forEach(i => { i.checked = i.value === CD_TEACHER; }); $$('#modal-root .nb-a').forEach(i => { i.checked = i.value === CD_ASSESSOR; });
  [1, 2, 3].forEach(() => MODAL.actions.find(a => /primary/.test(a.cls)).fn()); MODAL.actions.find(a => /primary/.test(a.cls)).fn(); closeModal();
  const b = cdBatch(); if (!b) throw new Error('Create batch: not created');
  // 10. Open the batch for enrolment
  go('a-batches', { id: CD_B }); const life = $('main [data-act="batchLife"]'); if (life) { ACT.batchLife(life); if (MODAL) ok1('Client demo — open for enrolment'); }
  // 11. Learners: registered through Add learner (activation links sent). They join the batch through their own sign-up (cdLearners
  // below), which places them in it — DR (PD-DR-03): no admin "Add to batch" as well, which counted each learner twice
  CD_LEARNERS.forEach(([name], k) => {
    go('a-learners'); ACT.addLearner(); put({ '#nl-name': name, '#nl-email': `demo.learner${k + 1}@demo.example`, '#nl-mob': '+44 7700 9001' + String(k + 10) }); ok1();
    const l = ADMIN.learners.find(x => x.name === name); if (!l) throw new Error('Add learner: ' + name);
    // the one simulated learner action: the learner sets their password from the activation link (there is no admin step for it; audited, labelled)
    if (l.acct === 'Pending Verification') { l.acct = 'Active'; logA('Learners', l.id, 'Account activated', 'Pending Verification', 'Active', 'Demo step: the learner used the activation link (client demo)'); }
  });
  // 12. Assignment deadlines for the batch: two published, one left as a draft
  asgs.slice(0, 2).forEach((a, k) => { go('a-programmes', { id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: a.id } }); $$('#modal-root .s2-pb').forEach(x => { x.checked = x.value === CD_B; }); const dl = $(`#modal-root #cr-pd-${CD_B}`); if (dl) dl.value = cdLondon(D(70 + k * 35).slice(0, 10), 17); ok1('Client demo — deadline for ' + CD_B); });
  // 13. Sessions for the batch (Schedule → Add session): a class for everyone, and a Self-Paced check-in for the Self-Paced fee option only
  [['Client demo — mixed class (all learners)', 75, null], ['Client demo — Self-Paced check-in', 76, 'Self-Paced']].forEach(([t, n, m]) => {
    go('a-batches', { id: CD_B, tab: 'schedule' }); ACT.addSession({ dataset: { b: CD_B } }); if (!MODAL) throw new Error('Add session refused');
    put({ '#se-n': t, '#se-d': cdLondon(D(n).slice(0, 10), 10), '#se-m': '60' }); const te = $('#modal-root #se-t'); if (te) te.value = CD_TEACHER; // the batch's Teacher (FX, PD-FX-09)
    if (m) $$('#modal-root .r2-g').forEach(x => { x.checked = (r1Opt(x.value) || {}).mode === m; });
    let r = ok1(), g = 0; while (r === false && MODAL && g++ < 3) r = ok1(); closeModal();
  });
  return { pr, b };
}
// A UK-local time on a date, as the value the date-time fields take (UTC): 17:00 London is 17:00 UTC in winter, 16:00 UTC in summer
function cdLondon(day, h) {
  for (const u of [h, h - 1]) { const iso = `${day}T${String(u).padStart(2, '0')}:00`, d = new Date(iso + ':00Z');
    if (+new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(d) === h) return iso; }
  return `${day}T${String(h).padStart(2, '0')}:00`;
}

ACT.cdLoad = () => {
  const keep = { av: ADMIN.av, portal: S.portal };
  ACT.resetDemo(); let res, err;
  try { res = cdBuild(); } catch (e) { err = e; }
  closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; void keep;
  if (err) { render(); toast('The client demo could not be built: ' + err.message, 'err'); return; }
  logA('Demo', CD_B, 'Client demo loaded', '—', `${CD_T} · ${CD_B}`, 'Demo controls');
  S.demoOpen = true; go('a-batches', { id: CD_B }); renderDemo(); toast('Client demo loaded: a published Level 3 programme with Self-Paced and Fully Assisted fee options, one mixed-mode batch with two Coordinators and four demo learners.', 'info');
};
ACT.cdOpen = el => { const t = el.dataset.t; setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; const pr = cdPr();
  if (t === 'prog' && pr) return go('a-programmes', { id: pr.id, tab: 'details' });
  if (t === 'batch') return go('a-batches', { id: CD_B });
  if (t === 'new') { go('a-batches'); return ACT.newBatch(); }
  if (t === 'list') return go('a-programmes'); // FX: the client demo has one programme; the list needs no filter
  if (t === 'queue') { const wf = pr && cb8Wf(pr); return go('a-queue', wf && wf.qid ? { id: wf.qid } : {}); }
};

/* ---------- Demo controls: the datasets (FX, PD-FX-04: the client demo is the default; "Load clean client demo" is gone) ---------- */
const CD_NOTE = 'Demo only: everything lives in this browser tab. Reloading the page or "Reset demo" returns to the client demo dataset; nothing is saved.';
function cdPanel() {
  const on = cdOn(), b = cdBatch(), n = on ? batchRoster(b).length : 0, legacy = typeof fxClient === 'function' && !fxClient();
  return `<fieldset class="cd-demo"><legend>Demo data</legend><p class="xs muted cd-note">${esc(CD_NOTE)}</p>
    ${legacy ? `<div class="note b-amber fx-legacy-note" role="status">${ic('alert')}<div class="small"><strong>Full legacy test data is loaded — internal testing data, not client data.</strong> Reset demo returns to the client demo.</div></div>` : ''}
    <div class="btns"><button class="btn btn-sm btn-primary" data-act="resetDemo">Reset demo</button><button class="btn btn-sm" data-act="mcDemoLoad">Load 101-learner Coordinator demo</button><button class="btn btn-sm fx-legacy-btn" data-act="fxLegacy">Load full legacy test data (internal — not client data)</button></div>
    <p class="xs muted">${on ? `Client demo dataset: ${esc(CD_T)} · batch ${CD_B} (${n} demo learners, two Coordinators). Its fees, Finance approval and activations are simulated demonstration records.` : 'The client demo dataset is not loaded.'}</p>
    ${on ? `<div class="btns cd-links"><button class="btn btn-sm" data-act="cdOpen" data-t="list">Programme list</button><button class="btn btn-sm" data-act="cdOpen" data-t="prog">Programme</button><button class="btn btn-sm" data-act="cdOpen" data-t="batch">Batch</button><button class="btn btn-sm" data-act="cdOpen" data-t="new">Create batch</button><button class="btn btn-sm" data-act="cdOpen" data-t="queue">Finance approval</button></div>` : ''}</fieldset>`;
}
const _rdCD = renderDemo;
renderDemo = function () { const r = _rdCD.apply(this, arguments); const p = document.querySelector('#demo-root .demo-panel'); if (p && !p.querySelector('.cd-demo')) { const h = p.querySelector('.row-b'); if (h) h.insertAdjacentHTML('afterend', cdPanel()); } return r; };

/* ---------- The programme list counts what it can see (it showed stored figures) ----------
   Batches: the batches of the course. Learners: for a programme made in Course Builder, the learners on its batches' rosters (they all
   have records); a seeded programme keeps its seeded total, which includes learners the demo has no record for. */
const cdBatchN = p => (ADMIN.batches || []).filter(b => b.course === p.title).length;
const cdLearnerN = p => new Set((ADMIN.batches || []).filter(b => b.course === p.title).flatMap(b => batchRoster(b).map(r => r[1]))).size;
const cdCol = c => (c.k === 'batches' ? { ...c, h: x => String(cdBatchN(x)), v: x => String(cdBatchN(x)), s: x => cdBatchN(x) }
  : c.k === 'learners' ? { ...c, h: x => (x.chNew ? `v${x.version}: ${cdLearnerN(x)}` : c.h ? c.h(x) : String(x.learners || 0)), v: x => (x.chNew ? cdLearnerN(x) : x.learners) } : c);
const _dtCD = dt;
dt = function (o) { if (o && (o.id === 'kprogs' || o.id === 'progs') && Array.isArray(o.cols)) o = { ...o, cols: o.cols.map(cdCol) }; return _dtCD.call(this, o); };

/* ---------- The demo learners' portal accounts and enrolments (DR, 31 Oct 2026; PD-DR-02…05; supersedes PD-CD-06…13) ----------
   Each learner record (Add learner, step 11) gets a learner-portal account bound to the same learner ID — no second person. Then,
   in that account, through the screens' own handlers:
   - the two NVQ learners sign up from Browse on their delivery mode's fee option: personal details (synthetic), the mandatory
     documents ("Use a sample file" — demonstration documents), the typed offer-letter signature, the first of six instalments
     through the prototype checkout (simulated; no card is charged; audited "Demonstration: simulated payment"). The sign-up places
     them in the batch; the batch's Coordinator allocation assigns them. An Academic Admin then approves each document and the
     admission in Admissions — no capability is bypassed (a Finance Admin still can't approve it).
   - the short-course learner buys the published short course from Browse through the same simulated checkout.
   Nothing is marked, observed, certified or paid beyond that; the learners start at 0% with their real deadlines and sessions.
   The checkout and upload timers are fast-forwarded during the build (fxFast in fx-fixtures.js) — the same callbacks run. */
const CD_KEYS = ['CD1', 'CD2', 'CD3'];
const cdKeyOf = lid => CD_KEYS.find(k => STORE.worlds && STORE.worlds[k] && STORE.worlds[k].me && STORE.worlds[k].me.id === lid) || null;
function cdClear() {
  CD_KEYS.forEach(k => { delete VARIANT_INFO[k]; delete PERSONAS[k]; delete VARIANTS[k]; });
  if (CD_KEYS.includes(S.variant)) S.variant = 'C';
}
const _isCD = initStore; initStore = function () { cdClear(); const r = _isCD.apply(this, arguments); if (CD_KEYS.includes(S.variant) || !STORE.worlds[S.variant]) S.variant = 'C'; return r; };
const CD_VI = { 'Self-Paced': 'NVQ learner — Self-Paced', 'Fully Assisted': 'NVQ learner — Fully Assisted', 'Short course': 'Short-course learner' };
// DR-A (PD-DR-14): the same account mapping as a learner the Academy adds and activates (lnPortal, dr-demo.js): one world bound to the record's ID
function cdWorld(key, L, m) {
  const w = lnPortal(L, key); VARIANT_INFO[key] = [CD_VI[m], `${L.name} · demonstration data`];
  return w;
}
// the learner's own portal session for a build step (the demonstration identity switch the sign-in page uses)
const cdAs = key => { S.edge = 'none'; S.variant = key; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
const cdPress = () => { const a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); return a && a.fn ? a.fn() : undefined; };
const cdErr = (w, what) => new Error(`${what} (${chFullName(w)}): ` + ($$('#modal-root .err, main .err').map(e => e.textContent).join(' ') || ($('#toast-root') || {}).textContent || 'refused'));
// NVQ: sign-up from Browse on the mode's fee option, details, documents, offer letter, first instalment (simulated checkout)
function cdSignup(key, m, ff) {
  const w = STORE.worlds[key], [dob, addr] = CD_SIGNUP[w.me.first + ' ' + w.me.last] || ['1990-01-01', '1 Demo Street, London'];
  cdAs(key); go('browse');
  const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); if (!c) throw new Error('Browse: the demo programme is not listed');
  const opt = r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === m); if (!opt) throw new Error('No approved ' + m + ' fee option');
  ACT.applyNvq({ dataset: { id: c.id } }); const r = $(`#modal-root input[name="r1-opt"][value="${opt.id}"]`); if (r) r.checked = true;
  if (cdPress() === false) throw cdErr(w, 'Sign-up'); closeModal(); if (!w.signup) throw cdErr(w, 'Sign-up not started');
  go('admission'); const fill = (s, v) => { const e = $(s); if (!e) throw cdErr(w, 'Sign-up details: missing ' + s); e.value = v; };
  fill('#su-dob', dob); fill('#su-ad', addr); ACT.suNext(); if (w.signup.step !== 2) throw cdErr(w, 'Sign-up details');
  w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000);
  if (!w.docs.filter(d => d.mand).every(d => d.status === 'Submitted')) throw cdErr(w, 'Documents');
  ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); if (!w.signup.sig) throw cdErr(w, 'Offer letter');
  setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); render(); ACT.suPay(); if (cdPress() !== false) throw cdErr(w, 'Checkout'); ff(3000); closeModal();
  if (!w.signup.done || w.signup.batch !== CD_B) throw cdErr(w, 'Payment');
}
// Admissions (Academic Admin): each mandatory document approved, then the admission
function cdAdmit(key) {
  const w = STORE.worlds[key], id = 'APP-' + key; acaEnter('KA'); S.signedIn = true; S.ui = {}; go('a-admissions', { id });
  const ap = allApplications().find(a => a.id === id); if (!ap) throw cdErr(w, 'Admissions: no application');
  ap.docs.filter(d => d.mand).forEach(d => ACT.docDec({ dataset: { a: id, d: d.id, s: 'Approved' } }));
  go('a-admissions', { id }); ACT.appApprove({ dataset: { id } }); const t = $('#rsn'); if (t) t.value = 'Documents checked against the sample files (client demo)'; cdPress(); closeModal();
  if (w.admission.status !== 'Approved') throw cdErr(w, 'Admission');
}
// Short course: Browse → Buy now → (the course's own questions, if any) → simulated checkout
function cdShort(key, ff) {
  const w = STORE.worlds[key]; cdAs(key); go('browse');
  const c = CATALOGUE.find(x => x.kind === 'short' && x.course === FX_SHORT); if (!c) throw new Error('Browse: the demo short course is not listed');
  ACT.buyCourse({ dataset: { id: c.id } });
  if (MODAL && /About you/.test(MODAL.title || '')) { $$('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'Demonstration answer'; }); cdPress(); }
  if (!MODAL || !/Pay now/.test(MODAL.title || '')) throw cdErr(w, 'Buy now'); cdPress(); ff(3000); closeModal();
  if (!w.enrolments.some(e => e.kind === 'short' && e.courseId === FX_SHORT && e.status === 'Active')) throw cdErr(w, 'Short-course enrolment');
}
function cdLearners() {
  if (!cdBatch()) return;
  fxFast(ff => {
    CD_LEARNERS.forEach(([name, m], k) => { const L = ADMIN.learners.find(x => x.name === name); if (!L) throw new Error('No learner record: ' + name); cdWorld(CD_KEYS[k], L, m); });
    CD_LEARNERS.forEach(([, m], k) => { if (m === 'Short course') cdShort(CD_KEYS[k], ff); else cdSignup(CD_KEYS[k], m, ff); });
    CD_LEARNERS.forEach(([, m], k) => { if (m !== 'Short course') cdAdmit(CD_KEYS[k]); });
  });
}
const _buildCD = cdBuild;
cdBuild = function () { const r = _buildCD.apply(this, arguments); cdLearners(); return r; };


/* ---------- The admin dashboard says which figures are demonstration values (PD-CD-09) ----------
   Average progress, completion rate and part of the overdue, pending-marking and revenue figures are fixed demonstration values; they
   aren't calculated from the records, and never from the client demo cohort (whose figures are counted in Demo controls). A note says so,
   directly under the figures; the figures themselves are unchanged (no dashboard rewrite). */
const CD_DASH_NOTE = 'Demonstration figures: average progress, completion rate and part of the overdue, pending-marking and revenue totals are fixed example values, not calculated from the records (nor from the client demo). Registered learners, enrolments and active learners are counted.';
const CD_DASH_NOTE_FX = 'Client demo data: every figure here is counted from the demo records. Average progress shows “—” until a learner has started.';
const _dashCD = SCREENS['a-dashboard'];
SCREENS['a-dashboard'] = function () {
  const h = _dashCD.apply(this, arguments); if (typeof h !== 'string' || !h.includes('adm-kpis') || h.includes('cd-dash-note')) return h;
  return h.replace(/(<div class="kpis adm-kpis">[\s\S]*?<\/div>\s*)(<section class="card"><h3>Enrolments by course)/, (x, a, b) => `${a}<p class="xs muted cd-dash-note">${ic('info', 12)} ${typeof fxClient === 'function' && fxClient() ? CD_DASH_NOTE_FX : CD_DASH_NOTE}</p>${b}`);
};


/* ---------- Simulated payments of the demo learners (PD-CD-12; DR) ----------
   The prototype checkout says it is simulated for the demo learners, and each payment is audited as a demonstration event — the
   NVQ instalment (chComplete) and a short-course purchase (s1Enrol) alike, in the build and when a presenter pays live. */
const _coCD = checkout;
checkout = function (o) {
  const r = _coCD.apply(this, arguments);
  if (W && CD_KEYS.includes(W.v) && MODAL && /Pay now/.test(MODAL.title || '') && typeof MODAL.body === 'string' && !MODAL.body.includes('cd-sim')) { MODAL.body = `<div class="note b-purple cd-sim">${ic('info')}<div class="small"><strong>Prototype demonstration — simulated payment.</strong> No card is charged; the payment is recorded as a demonstration event.</div></div>` + MODAL.body; renderModal(); }
  return r;
};
const _chCompleteCD = chComplete;
chComplete = function (w) {
  const had = !!(w && w.signup && w.signup.done), r = _chCompleteCD.apply(this, arguments);
  if (w && CD_KEYS.includes(w.v) && !had && w.signup && w.signup.done && w.signup.pay) logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Demonstration: simulated payment', '—', `${money(w.signup.pay.amount, 'GBP')} · ${w.signup.pay.ref || ''}`, 'Client demo — prototype checkout, no card charged');
  return r;
};
const _s1EnrolCD = s1Enrol;
s1Enrol = function (c) {
  const r = _s1EnrolCD.apply(this, arguments);
  if (W && CD_KEYS.includes(W.v)) { const t = W.tx[0]; logA('Finance', `${chFullName(W)} (${W.me.id})`, 'Demonstration: simulated payment', '—', `${money(W.amt(c.price), 'GBP')} · ${(t && t.ref) || ''}`, 'Client demo — prototype checkout, no card charged'); }
  return r;
};
