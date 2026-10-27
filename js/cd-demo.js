/* ============================================================
   Client demo preset (26 Oct 2026; PD-CD-01…05 in PROVISIONAL-DECISIONS.md). Demo controls → "Client demo".
   An additive, guided example built on top of the seeded data through the real workflows — nothing seeded is hidden, deleted or
   rewritten, and no approval, signature, payment or outcome is invented:
   - Reset first (a predictable start), then, as the Academic Admin, Course Builder creates a Level 3 programme priced by fee options by
     delivery mode (Self-Paced and Fully Assisted), with its structure, observation configuration, assignments (drafts) and offer letter;
     the payment terms are submitted to Finance, a Finance Admin approves them in the Approvals Queue, and the programme is published.
   - Create batch (the wizard) makes one mixed-mode batch with two Academic Coordinators; Add learner registers four learners labelled
     "(demo)" (they receive activation links). The one simulated learner action is their activation (setting a password from the link —
     there is no admin step for it; audited as a demo step). Add to batch then enrols two on each mode's fee option; the Coordinators'
     allocation is the batch's own balanced allocation. Two assignments are published to the batch with batch deadlines; one stays a draft.
   - Learners' sign-ups, offer letters, payments, submissions and observations are NOT simulated: those states need the live workflow
     (the learner portal and the existing Demo Scenarios). The start panel links to the records and to the seeded examples.
   The 101-learner / 10-Coordinator demo stays a separate preset; neither loads the other.
   Everything is held in this browser tab's memory: reloading the page or Reset demo returns to the starting data.
   Loads last.
   ============================================================ */
'use strict';

const CD_T = 'Level 3 Diploma in Care Practice (client demo)', CD_B = 'DEMO-L3-JAN27';
const CD_LEARNERS = [['Amira Shah (demo)', 'Self-Paced'], ['Ben Holloway (demo)', 'Self-Paced'], ['Chloe Adeyemi (demo)', 'Fully Assisted'], ['Dev Patel (demo)', 'Fully Assisted']];
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
  [1, 2, 3].forEach(() => MODAL.actions.find(a => /primary/.test(a.cls)).fn()); MODAL.actions.find(a => /primary/.test(a.cls)).fn(); closeModal();
  const b = cdBatch(); if (!b) throw new Error('Create batch: not created');
  // 10. Open the batch for enrolment
  go('a-batches', { id: CD_B }); const life = $('main [data-act="batchLife"]'); if (life) { ACT.batchLife(life); if (MODAL) ok1('Client demo — open for enrolment'); }
  // 11. Learners: registered through Add learner (activation links sent) and added to the batch on their mode's fee option
  const optOf = m => r1Opts(id).find(o => o.status === 'Active' && o.mode === m);
  CD_LEARNERS.forEach(([name, m], k) => {
    go('a-learners'); ACT.addLearner(); put({ '#nl-name': name, '#nl-email': `demo.learner${k + 1}@demo.example`, '#nl-mob': '+44 7700 9001' + String(k + 10) }); ok1();
    const l = ADMIN.learners.find(x => x.name === name); if (!l) throw new Error('Add learner: ' + name);
    // the one simulated learner action: the learner sets their password from the activation link (there is no admin step for it; audited, labelled)
    if (l.acct === 'Pending Verification') { l.acct = 'Active'; logA('Learners', l.id, 'Account activated', 'Pending Verification', 'Active', 'Demo step: the learner used the activation link (client demo)'); }
    go('a-batches', { id: CD_B }); ACT.addToBatch({ dataset: { id: CD_B } }); put({ '#ab-l': l.id }); const s = $('#modal-root #r2-ab-o'); if (s) s.value = optOf(m).id; ok1();
  });
  // 12. Assignment deadlines for the batch: two published, one left as a draft
  asgs.slice(0, 2).forEach((a, k) => { go('a-programmes', { id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: a.id } }); $$('#modal-root .s2-pb').forEach(x => { x.checked = x.value === CD_B; }); const dl = $(`#modal-root #cr-pd-${CD_B}`); if (dl) dl.value = cdLondon(D(70 + k * 35).slice(0, 10), 17); ok1('Client demo — deadline for ' + CD_B); });
  // 13. Sessions for the batch (Schedule → Add session): a class for everyone, and a Self-Paced check-in for the Self-Paced fee option only
  [['Client demo — mixed class (all learners)', 75, null], ['Client demo — Self-Paced check-in', 76, 'Self-Paced']].forEach(([t, n, m]) => {
    go('a-batches', { id: CD_B, tab: 'schedule' }); ACT.addSession({ dataset: { b: CD_B } }); if (!MODAL) throw new Error('Add session refused');
    put({ '#se-n': t, '#se-d': cdLondon(D(n).slice(0, 10), 10), '#se-m': '60' }); const te = $('#modal-root #se-t'); if (te) te.value = te.options[1] ? te.options[1].value : te.value;
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
  if (t === 'list') { go('a-programmes'); ['kprogs', 'progs'].forEach(k => { const st = dts(k); if (st) { st.q = 'client demo'; st.page = 0; } }); return render(); } // the list's own search box, filled in (visible; clear it to see every programme)
  if (t === 'queue') { const wf = pr && cb8Wf(pr); return go('a-queue', wf && wf.qid ? { id: wf.qid } : {}); }
};

/* ---------- Demo controls: the presets and what they are ---------- */
const CD_NOTE = 'Demo only: everything lives in this browser tab. Reloading the page or "Reset demo" returns to the starting data; nothing is saved.';
function cdPanel() {
  const on = cdOn(), b = cdBatch(), n = on ? batchRoster(b).length : 0;
  return `<fieldset class="cd-demo"><legend>Demo presets</legend><p class="xs muted cd-note">${esc(CD_NOTE)}</p>
    <div class="btns"><button class="btn btn-sm btn-primary" data-act="cdLoad">Load clean client demo</button><button class="btn btn-sm" data-act="mcDemoLoad">Load 101-learner Coordinator demo</button><button class="btn btn-sm" data-act="resetDemo">Reset demo</button></div>
    <p class="xs muted">${on ? `Client demo loaded: ${esc(CD_T)} · batch ${CD_B} (${n} demo learners, two Coordinators). Seeded records stay in the lists.` : 'The client demo resets the data, then builds a small example through the real screens; the 101-learner demo is separate.'}</p>
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

/* ---------- Learner-portal identities for the four demo learners (CD learner views; PD-CD-06…08) ----------
   Each demo learner record gets a learner-portal account bound to the same learner ID (no new person). The learner then starts the
   real NVQ sign-up for the demo programme from Browse, choosing the fee option the batch already records for them, and is placed in
   that batch: they stand at the sign-up's own pending steps (documents, offer letter signature, payment choice). Nothing is signed,
   paid, approved or assessed for them; screens that need those steps show the learner's pending state through the normal gates.
   Switching to a demo learner is a prototype demonstration action (Demo controls), not a sign-in; other learners' worlds are untouched. */
const CD_KEYS = ['CD1', 'CD2', 'CD3', 'CD4'];
const cdKeyOf = lid => CD_KEYS.find(k => STORE.worlds && STORE.worlds[k] && STORE.worlds[k].me && STORE.worlds[k].me.id === lid) || null;
function cdClear() {
  CD_KEYS.forEach(k => { delete VARIANT_INFO[k]; delete PERSONAS[k]; delete VARIANTS[k]; });
  if (CD_KEYS.includes(S.variant)) S.variant = 'C';
}
const _isCD = initStore; initStore = function () { cdClear(); const r = _isCD.apply(this, arguments); if (CD_KEYS.includes(S.variant) || !STORE.worlds[S.variant]) S.variant = 'C'; return r; };
function cdWorld(key, L, m) {
  const keepW = W, keepV = S.variant, [first, ...rest] = L.name.replace(/ \(demo\)$/, '').split(' ');
  PERSONAS[key] = { id: L.id, first, last: rest.join(' ') + ' (demo)', email: L.email, mobile: L.mobile, dob: '', address: '', postcode: '' /* the learner enters them at sign-up */, country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: fd(now().toISOString()), referral: 'Demonstration data — client demo', sponsor: null };
  VARIANTS[key] = { nvq: false, fresh: true };
  const w = makeWorld(key); W = keepW; S.variant = keepV;
  // a new account has no history: the template's short-course records, payments, certificates, requests, messages, notifications,
  // events and attendance are removed (as the 101-learner demo does), so nothing is shown that this learner didn't do
  Object.assign(w, { enrolments: [], plan: [], observations: [], docs: [], tx: [], plans: [], certs: [], requests: [], threads: [], attendance: [], events: [], notifs: [], drafts: {}, payOverdue: null, referral: null, pd: { items: [], session: { status: 'Not scheduled', at: null, mode: '—', loc: '', with: '' } } });
  if (w.workplace) Object.assign(w.workplace, { perm: 'Not entered', name: '', address: '', postcode: '', ctitle: '', cname: '', cemail: '', cphone: '' });
  STORE.worlds[key] = w; if (STORE.acct) STORE.acct[key] = 'Active';
  VARIANT_INFO[key] = [`Client demo learner — ${m}`, `${L.name} · ${CD_B} · demonstration data (sign-up pending)`];
  return w;
}
// the learner starts the NVQ sign-up (their own action in the portal) on the option the batch records for them; placed in the batch
function cdSignupStart(key, b, optId) {
  S.variant = key; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse');
  const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); if (!c) throw new Error('Browse: the demo programme is not listed');
  ACT.applyNvq({ dataset: { id: c.id } }); const r = $(`#modal-root input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true;
  const a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a && a.fn && a.fn() === false) throw new Error('Sign-up: ' + $('#modal-root').textContent.slice(0, 160)); closeModal();
  const w = STORE.worlds[key]; if (!w.signup) throw new Error('Sign-up not started for ' + key);
  chSetBatch(w, b);
}
function cdLearners() {
  const b = cdBatch(); if (!b) return;
  CD_LEARNERS.forEach(([name, m], k) => {
    const L = ADMIN.learners.find(x => x.name === name), key = CD_KEYS[k]; if (!L) return;
    cdWorld(key, L, m); cdSignupStart(key, b, (b.r2 && b.r2[L.id] || {}).opt);
  });
}
const _buildCD = cdBuild;
cdBuild = function () { const r = _buildCD.apply(this, arguments); cdLearners(); return r; };
// Demo controls: open a demo learner's portal (a demonstration identity switch, not authentication)
ACT.cdCoord = el => { const k = el.dataset.k; S.coo.v = k; cooEnter(); S.signedIn = true; S.demoOpen = false; go('c-batches', { id: CD_B, tab: 'roster' }); renderDemo(); toast(`Prototype demonstration: viewing the Coordinator portal as ${COO_USERS[k].name}.`, 'info'); };
ACT.cdLearner = el => {
  const key = el.dataset.k; if (!STORE.worlds[key]) return toast('Load the client demo first.', 'info');
  S.variant = key; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.demoOpen = false; go('dashboard'); renderDemo();
  toast(`Prototype demonstration: viewing the learner portal as ${chFullName(STORE.worlds[key])} — an identity switch for the demo, not a sign-in.`, 'info');
};
// the panel: the learners with their mode and Coordinator, and the cohort's figures counted from the four records
const cdCohort = () => { const b = cdBatch(); if (!b) return null; const ls = mcLids(b).map(id => ({ id, name: (ADMIN.learners.find(x => x.id === id) || {}).name, mode: r2LidInfo(id, CD_B).mode, coord: mcOf(id, b), key: cdKeyOf(id) })); return ls; };
const _cdPanelL = cdPanel;
cdPanel = function () {
  const h = _cdPanelL.apply(this, arguments), ls = cdOn() ? cdCohort() : null; if (!ls) return h;
  const by = f => Object.entries(ls.reduce((o, l) => { o[f(l)] = (o[f(l)] || 0) + 1; return o; }, {})).map(([k, n]) => `${esc(k)} ${n}`).join(' · ');
  return h.replace('</fieldset>', `<p class="xs muted cd-cohort">Counted from the batch's records: ${ls.length} learners · ${by(l => l.mode)} · Coordinators: ${by(l => l.coord)}.</p>
    <p class="xs"><strong>Learner portal (prototype demonstration — an identity switch, not a sign-in):</strong></p><div class="btns cd-learners">${ls.map(l => `<button class="btn btn-sm" data-act="cdLearner" data-k="${l.key}">${esc(l.name)} · ${esc(l.mode)} · ${esc(l.coord)}</button>`).join('')}</div>
    <p class="xs muted">They stand at their own sign-up: documents, offer letter and payment are pending, so programme content stays locked for them (the normal gate) and their Coordinator appears once it opens. Each Coordinator sees their own allocated learners:</p><div class="btns cd-coords">${[...new Set(ls.map(l => l.coord))].map(n => { const k = Object.keys(COO_USERS).find(x => COO_USERS[x].name === n && !COO_USERS[x].multi); return k ? `<button class="btn btn-sm" data-act="cdCoord" data-k="${k}">Coordinator: ${esc(n)}</button>` : ''; }).join('')}</div></fieldset>`);
};

/* ---------- The admin dashboard says which figures are demonstration values (PD-CD-09) ----------
   Average progress, completion rate and part of the overdue, pending-marking and revenue figures are fixed demonstration values; they
   aren't calculated from the records, and never from the client demo cohort (whose figures are counted in Demo controls). A note says so,
   directly under the figures; the figures themselves are unchanged (no dashboard rewrite). */
const CD_DASH_NOTE = 'Demonstration figures: average progress, completion rate and part of the overdue, pending-marking and revenue totals are fixed example values, not calculated from the records (nor from the client demo). Registered learners, enrolments and active learners are counted.';
const _dashCD = SCREENS['a-dashboard'];
SCREENS['a-dashboard'] = function () {
  const h = _dashCD.apply(this, arguments); if (typeof h !== 'string' || !h.includes('adm-kpis') || h.includes('cd-dash-note')) return h;
  return h.replace(/(<div class="kpis adm-kpis">[\s\S]*?<\/div>\s*)(<section class="card"><h3>Enrolments by course)/, (x, a, b) => `${a}<p class="xs muted cd-dash-note">${ic('info', 12)} ${CD_DASH_NOTE}</p>${b}`);
};


/* ---------- Guided sign-up for the client demo (PD-CD-10…13) ----------
   Demo controls → "Guided sign-up": step buttons that switch to the right person and open the right screen; the presenter does each
   action there with the existing controls — personal details, the sample-document uploads ("demo" files), the offer-letter signature,
   the prototype checkout (simulated card payment; no card is charged), then the Academic Admin reviews each document and approves the
   admission. Nothing is completed by the buttons themselves. Suggested learners: Amira Shah (Self-Paced, Dr Helen Carter) and Dev Patel
   (Fully Assisted, Michael Osei); any of the four can be used. */
const CD_GUIDE = [['CD1', 'Self-Paced'], ['CD4', 'Fully Assisted']];
ACT.cdGuide = el => {
  const k = el.dataset.k, st = el.dataset.s, w = STORE.worlds[k]; if (!w) return toast('Load the client demo first.', 'info');
  if (st === 'review') { acaEnter('KA'); S.signedIn = true; S.demoOpen = false; go('a-admissions', { id: 'APP-' + k }); renderDemo(); return toast(`Academic Admin: review each document of ${chFullName(w)} (Approve), then "Approve admission".`, 'info'); }
  S.variant = k; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.demoOpen = false;
  if (st === 'signup') { go('admission'); renderDemo(); return toast(`Prototype demonstration as ${chFullName(w)}: complete each sign-up step — details, documents ("Use a sample file"), offer letter, then the simulated checkout.`, 'info'); }
  go(st === 'pay' ? 'payments' : st === 'course' ? 'course' : 'dashboard', st === 'course' ? { id: 'nvq' } : {}); renderDemo();
};
const cdStage = w => (!w || !w.signup ? '—' : w.admission && w.admission.status === 'Approved' ? 'Enrolled — admission approved' : w.signup.done ? 'Signed up and paid — awaiting admission review' : `Sign-up step ${w.signup.step} of 5`);
const _cdPanelG = cdPanel;
cdPanel = function () {
  const h = _cdPanelG.apply(this, arguments); if (!cdOn()) return h;
  const rows = CD_GUIDE.map(([k, m]) => { const w = STORE.worlds[k]; if (!w) return ''; return `<div class="cd-g-row" data-k="${k}"><p class="xs"><strong>${esc(chFullName(w))}</strong> · ${m} · <span class="cd-stage">${esc(cdStage(w))}</span></p><div class="btns">
    <button class="btn btn-sm" data-act="cdGuide" data-k="${k}" data-s="signup">1 · Sign-up (learner)</button>
    <button class="btn btn-sm" data-act="cdGuide" data-k="${k}" data-s="review">2 · Admissions review (Academic Admin)</button>
    <button class="btn btn-sm" data-act="cdGuide" data-k="${k}" data-s="dash">3 · Learner dashboard</button>
    <button class="btn btn-sm" data-act="cdGuide" data-k="${k}" data-s="course">Your people</button>
    <button class="btn btn-sm" data-act="cdGuide" data-k="${k}" data-s="pay">Payment schedule</button></div></div>`; }).join('');
  return h.replace(/<\/fieldset>$/, `<p class="xs cd-guide-h"><strong>Guided sign-up (prototype demonstration):</strong> each button switches to the person and opens the screen; you do the step there with the normal controls. Documents use the "sample file" (demonstration documents); payment uses the prototype checkout (simulated — no card is charged).</p>${rows}</fieldset>`);
};
// The prototype checkout says it is simulated, for the client-demo learners; the payment is recorded as a demonstration event
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
