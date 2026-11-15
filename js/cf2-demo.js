/* ============================================================
   Client Feedback 2.0 — client demo additions (15 Nov 2026; PD-CF2-E* in PROVISIONAL-DECISIONS.md). Loads last.
   The starting client demo builds DEMO-L3-JAN27 with the schedule template "Mixed delivery" (step 1, set in the builder through
   CF2_PRESET). Demo controls → "Load Client Feedback 2.0 examples" then runs these steps through the screens' own handlers, as their roles:
   1. Scheduling: DEMO-L3-JAN27 is created with the schedule template "Mixed delivery" (weekly class for the Fully Assisted fee option,
      fortnightly check-in for the Self-Paced option, monthly shared classroom workshop) — set in the builder by the build (CF2_PRESET);
      the build's two "Add session" sessions are the extra classes added after creation; one Self-Paced check-in is rescheduled by a day
      (reason recorded, learners told). A second, Planned batch DEMO-L3-SP27 accepts only the Self-Paced fee option and is built from
      "Self-Paced support" — no learners.
   2. Assignments: the Academic Admin switches the programme to "Criteria as Questions", publishes Assignment 4 (module scope, mapped to
      both knowledge criteria) to DEMO-L3-JAN27, then sets the programme back to "Questions + Criteria" (both changes recorded): Amira and
      Dev have Assignments 1–2 as questions and Assignment 4 as criteria. Assignment 3 stays a draft.
   3. Observations: Dev Patel enters his workplace; the workplace contact grants permission through the secure link (the one simulated
      external action — labelled and audited); his Coordinator chooses the workplace for the required observation; the observation
      assessor (James Pryce) proposes a date and Dev accepts it. Nothing is recorded or signed off: the observation is only scheduled.
   No submission, marking, attendance or observation outcome is created. A step that fails is recorded in STORE.cf2.demoErr (Demo
   controls still load the rest of the demo).
   ============================================================ */
'use strict';

const CF2_SP_B = 'DEMO-L3-SP27', CF2_A4 = 'Assignment 4 — Evidence against the criteria';
function cf2DemoBuild() {
  const errs = (CF2().demoErr = []), step = (n, f) => { try { f(); } catch (e) { errs.push(n + ': ' + e.message); } closeModal(); };
  const put = o => Object.entries(o).forEach(([k, v]) => { const e = $(k); if (!e) throw new Error('Missing field ' + k); e.value = v; });
  const ok1 = r => { const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !a.fn) throw new Error('No dialog to confirm'); if (r !== undefined) { const t = $('#rsn'); if (t) t.value = r; } let res = a.fn(), g = 0; while (res === false && MODAL && g++ < 3) res = a.fn(); if (res === false) throw new Error((MODAL && MODAL.title) + ': ' + ($$('#modal-root .err').map(e => e.textContent).join(' ') || 'refused')); if (MODAL) closeModal(); return res; };
  const aca = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const pr = cdPr(), b = cdBatch(); if (!pr || !b) return;
  const id = pr.id;

  // 2. Assignment 4 in "Criteria as Questions" (programme setting changed, used, then restored — both changes recorded)
  step('Assignment 4', () => {
    aca(); const setMode = (m, r) => { go('a-programmes', { id, tab: 'assessments' }); const x = $(`main input[name="cf2-dm"][value="${m}"]`); if (!x) throw new Error('No display-mode setting'); x.checked = true; ACT.cf2DispSave({ dataset: { p: id } }); ok1(r); };
    setMode('cq', 'Client demo — Assignment 4 shows its criteria as the questions');
    go('a-programmes', { id, tab: 'assessments' }); ACT.cbrAsgNew({ dataset: { p: id, lvl: 'mod', u: 'U001', m: 'M1' } }); put({ '#cna-t': CF2_A4 }); ok1();
    const d = s2Defs().find(x => x.title === CF2_A4); if (!d) throw new Error('Assessment not created');
    ACT.s2QAdd({ dataset: { id: d.id } }); put({ '#aq-t': 'Using one example from your workplace, show how you put person-centred values into practice when agreeing a care plan.', '#aq-ev': 'A real, anonymised example from your workplace', '#aq-n': '2' }); $$('#modal-root .aq-ty').forEach(x => { x.checked = x.value === 'PDF'; }); ok1();
    ['001 1.1', '001 1.2'].forEach(c => INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c } }));
    go('a-programmes', { id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); $$('#modal-root .s2-pb').forEach(x => { x.checked = x.value === CD_B; }); const dl = $(`#modal-root #cr-pd-${CD_B}`); if (dl) dl.value = cdLondon(D(140).slice(0, 10), 17); ok1('Client demo — deadline for ' + CD_B);
    if (d.status !== 'Published' || d.dispMode !== 'cq') throw new Error('Assignment 4 not published in Criteria as Questions');
    setMode('qc', 'Client demo — later assignments use the default presentation; Assignment 4 keeps the mode it was published with');
  });

  // 1b. A Self-Paced-only batch (Planned, no learners), built from the "Self-Paced support" template
  step('Self-Paced-only batch', () => {
    aca(); go('a-batches'); ACT.newBatch(); put({ '#nb-c': CF2_SP_B }); const co = $('#modal-root #nb-co'); co.value = CD_T; INP.n2NbCourse(co); $('#modal-root #nb-m').value = 'Online';
    $$('#modal-root .m-m').forEach(x => { x.checked = x.value === 'Self-Paced'; INP.mModeTick(x); });
    const nx = () => { const a = MODAL.actions.find(x => /primary/.test(x.cls)); return a.fn(); };
    if (nx() === false) throw new Error('Create batch step 1: ' + $('#modal-root').textContent.slice(0, 160));
    const coord = ADMIN.staff.find(s => s.status === 'Active' && s.name === 'Dr Helen Carter') ? 'Dr Helen Carter' : ''; $('#modal-root #nb-ac').value = coord;
    $$('#modal-root .nb-t').forEach(i => { i.checked = i.value === CD_TEACHER; }); $$('#modal-root .nb-a').forEach(i => { i.checked = i.value === CD_ASSESSOR; });
    CF2_PRESET = { tpl: 'TPL-4' }; try { nx(); nx(); nx(); nx(); } finally { CF2_PRESET = null; }
    const sp = ADMIN.batches.find(x => x.code === CF2_SP_B); if (!sp) throw new Error('Not created');
  });

  // 1c. Reschedule one Self-Paced check-in of the main batch by a day (the existing edit: reason, history, notices)
  step('Reschedule', () => {
    aca(); const s = s4bSess(CD_B).filter(x => x.cf2 && /Self-Paced check-in/.test(x.title) && x.status === 'Scheduled').sort((x, y) => x.start.localeCompare(y.start))[0]; if (!s) throw new Error('No Self-Paced check-in');
    go('a-batches', { id: CD_B, tab: 'schedule' }); ACT.s4bSessEdit({ dataset: { b: CD_B, id: s.id } }); if (!MODAL) throw new Error('Edit session refused');
    put({ '#se-d': new Date(new Date(s.start).getTime() + DAY).toISOString().slice(0, 16), '#se-r': 'Client demo — the teacher is away that evening; moved to the next day' }); ok1();
    if (!s.hist.some(h => h[2] === 'Changed')) throw new Error('Not rescheduled');
  });

  // 3. Dev Patel's workplace observation: scheduled (proposed and accepted), not recorded
  step('Workplace observation', () => {
    const k = 'CD2', w = STORE.worlds[k]; if (!w) throw new Error('No Dev'); const lid = w.me.id;
    cdAs(k); setUi('wpEdit', true); go('observations', { tab: 'workplace' });
    const f = { '#wp-name': 'Elm House Care Home (demo)', '#wp-addr': '9 Example Way, Leicester', '#wp-pc': 'LE1 0ZZ', '#wp-cn': 'Ms Priya Nair', '#wp-ce': 'p.nair@elmhouse.example', '#wp-cp': '0116 496 0123', '#wp-role': 'Care assistant', '#wp-shift': 'Days, Monday to Friday' };
    Object.entries(f).forEach(([s, v]) => { const e = $(s); if (e) e.value = v; }); SUBMIT.wpSave();
    if (w.workplace.perm !== 'Permission Pending') throw new Error('Workplace details not saved');
    wpcSync(); const l = STORE.wpc.links.find(x => x.v === k && x.kind === 'perm' && x.status === 'Active'); if (!l) throw new Error('No permission link');
    STORE.wpc.drafts[l.token] = { name: 'Ms Priya Nair', title: 'Manager', titleOther: '', home: 'Elm House Care Home (demo)', auth: true, agree: true, sig: 'Priya Nair', cond: '' };
    SUBMIT.wpcGrant({ dataset: { t: l.token } }); if (w.workplace.perm !== 'Granted') throw new Error('Permission not granted');
    logA('Observations', `${chFullName(w)} (${lid})`, 'Demo step: workplace permission granted through the secure link', 'Pending', 'Granted', 'Client demo — the workplace contact\'s decision is simulated');
    const coo = Object.keys(COO_USERS).find(c => COO_USERS[c].name === mcOf(lid)); if (!coo) throw new Error('No Coordinator');
    S.coo.v = coo; cooEnter(); S.signedIn = true; S.ui = {}; go('c-learner', { id: lid, tab: 'observations' }); const sel = $('#d-loc-EV-1'); if (!sel) throw new Error('No location choice'); sel.value = 'workplace'; ACT.dObsLoc({ dataset: { l: lid, e: 'EV-1' } });
    const tk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === chEff(lid, 'obs')); if (!tk) throw new Error('No observation assessor');
    S.tas.v = tk; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-obs'); ACT.obPropose({ dataset: { l: lid } }); if (!MODAL) throw new Error('Propose refused');
    const lf = $('#modal-root #op-l'); if (lf) { lf.value = lid; INP.obPerm(lf); } const ev = $('#modal-root #d-ev-s'); if (ev) { ev.value = 'EV-1'; INP.dEvPick(ev); }
    put({ '#op-d': D(80, '10:00').slice(0, 16) }); const n = $('#modal-root #op-n'); if (n) n.value = 'Please arrange cover so we can observe a care-plan review with an individual (no names recorded).';
    const a = MODAL.actions.find(x => x.label === 'Send proposal'); if (!a || a.fn() === false) throw new Error('Proposal refused'); closeModal();
    const o = w.observations.find(x => x.dEv === 'EV-1' && x.status === 'Proposed'); if (!o) throw new Error('Not proposed');
    cdAs(k); go('observations'); ACT.obsAccept({ dataset: { id: o.id } }); ok1(); if (o.status !== 'Confirmed') throw new Error('Not confirmed');
  });
  closeModal(); S.ui = {};
}
const _cdBuildCF2 = cdBuild;
cdBuild = function () { CF2_PRESET = { tpl: 'TPL-3' }; try { return _cdBuildCF2.apply(this, arguments); } finally { CF2_PRESET = null; } };
// Demo controls: the CF2 examples are loaded on request (they change the demo's batches, assignments and Dev Patel's observations and
// fees, which the starting demo — PD-DR-02 / PD-FX — keeps minimal). Reset demo removes them.
const cf2ExOn = () => !!(STORE.cf2 && STORE.cf2.examples);
if (typeof drPanel === 'function') { const _drPanelCF2 = drPanel; drPanel = function () {
  const h = _drPanelCF2.apply(this, arguments); if (typeof drOn === 'function' && !drOn()) return h;
  const ctl = `<div class="dr-ctl cf2-ex">${cf2ExOn() ? `<p class="small">${chip('Client Feedback 2.0 examples loaded', 'green')}</p>` : `<button class="btn" data-act="cf2Examples">${ic('plus', 15)} Load Client Feedback 2.0 examples</button>`}<p class="xs muted">Adds, through the normal screens: Assignment 4 shown as criteria, a Self-Paced-only batch, a rescheduled Self-Paced check-in and Dev Patel's confirmed workplace observation. Reset demo removes them.</p></div>`;
  return h.replace('<div class="dr-ctl dr-devl">', ctl + '<div class="dr-ctl dr-devl">'); }; }
ACT.cf2Examples = () => {
  if (typeof drOn === 'function' && !drOn()) { toast('Load the client demo first (Reset demo).', 'err'); return false; }
  if (cf2ExOn()) { toast('The examples are already loaded.', 'info'); return; }
  confirmDlg({ title: 'Load the Client Feedback 2.0 examples?', ok: 'Load examples', body: `<p class="small">Adds Assignment 4 (criteria as questions, published to DEMO-L3-JAN27), the Planned batch DEMO-L3-SP27 (Self-Paced only), one rescheduled Self-Paced check-in and Dev Patel's confirmed workplace observation (his observation fee follows the programme's terms, as for any confirmed observation). Each step runs through the normal screens and is audited. You are signed out afterwards.</p>`,
    onOk: () => { const run = () => cf2DemoBuild(); if (typeof fxQuiet === 'function') fxQuiet(run); else run(); STORE.cf2.examples = true; S.demoOpen = false; signOut();
      const e = CF2().demoErr || []; toast(e.length ? 'Examples loaded with problems: ' + e.join('; ') : 'Client Feedback 2.0 examples loaded. Choose a demo identity to continue.', e.length ? 'err' : 'info'); } });
};

UXC.push(['CF2-E', 'Client Feedback 2.0 — client demo additions (15 Nov 2026)', [
  'DEMO-L3-JAN27 is built with the "Mixed delivery" schedule template: Dev (Fully Assisted) has a weekly class, Amira (Self-Paced) a fortnightly check-in, both a monthly classroom workshop and the batch\'s added sessions.',
  'Demo controls → "Load Client Feedback 2.0 examples" (on request; Reset demo removes them) adds the rest: one Self-Paced check-in rescheduled by a day (reason recorded, learners told);',
  'DEMO-L3-SP27 (Planned, no learners) accepts only the Self-Paced fee option; its timetable comes from "Self-Paced support".',
  'Assignment 4 was published while the programme showed criteria as questions: Amira and Dev answer 001 1.1 and 001 1.2 directly, with References. Assignments 1–2 keep questions; the programme setting is back to the default.',
  'Dev Patel has a confirmed workplace observation (Elm House Care Home, demo) with James Pryce — ready to record in the Observation Book.']]);
