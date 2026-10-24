// CB1 — Unified course builder shell (20 Oct 2026, PD-CB-01). One programme page with seven sections for every NVQ programme;
// old tab and step addresses open the matching section; existing controls render under their section with their own permissions;
// retired programmes are read-only (also for direct calls); programme-administrator actions without a role check now refuse other
// roles; leaving a section with unsaved changes asks first. Each check acts through the screen (clicks) or the handler, then checks
// the page or the record, and includes the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB1 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const LEARNER = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const open = (id, tab) => go('a-programmes', tab ? { id, tab } : { id });
  const cur = () => (q('.cb-sec.cur') || {}).dataset ? q('.cb-sec.cur').dataset.tab : null;
  const pan = () => { const p = q('.cb-panels .tab[aria-selected="true"]'); return p ? p.dataset.tab : null; };
  const oldNav = () => qa('.subtabs, ol.ch8-steps, .ch-nav').length;
  const blocked = (a0, re) => ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const state = () => JSON.stringify({ p: ADMIN.programmes.map(p => [p.id, p.status, p.version, !!p.nextDraft, p.title]), t: STORE.chProgTree, d: STORE.s3 && STORE.s3.drafts, l: STORE.chLetters, s: chSupports(), r1: STORE.r1, ck: STORE.s4 && STORE.s4.lists, n5: STORE.n5 && STORE.n5.draft });
  const SECS = ['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review'];
  const WRITE = CB_WRITE.concat(CB_HIDE_RO);

  await T('CB1-A create-programme entry point', async () => {
    fresh();
    [['Super Admin', SA], ['System Admin', SYS], ['Academic Admin', ACA]].forEach(([who, enter]) => { enter(); go('a-programmes'); ok(`CB1-A ${who}: "New NVQ programme" on the list`, !!q('[data-act="chProgNew"]')); });
    // CB2 (PD-CB-14) supersedes the dialog checks: "New NVQ programme" opens Section 1 — Course Details of an unsaved course;
    // "Save and continue" (was the dialog's "Create draft") creates the Draft and opens Curriculum
    SYS(); go('a-programmes'); q('[data-act="chProgNew"]').click();
    ok('CB1-A "New NVQ programme" opens Section 1 — Course Details of an unsaved course (no dialog, no "Step 1 of 6")', !MODAL && S.params.id === 'new' && cur() === 'details' && !/Step 1 of/.test(main()));
    const set = (s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('#np-l', 'Level 4'); set('#np-t', 'Level 4 CB1 programme'); set('#np-r', 'QN 610/7777/1'); set('#np-d', '12'); set('#np-du', 'months'); set('#np-p', '2400'); q('.cr-dm-c[value="Fully Assisted"]').click(); q('#np-obs-no').click(); // CR (PD-CR-06, PD-CR-01): no course code; the modes offered are required
    q('[data-act="cbDetCreate"]').click(); const pr = (STORE.chNewProgs || []).slice(-1)[0];
    ok('CB1-A "Save and continue" opens the new programme in the course builder (Curriculum, as before), seven sections, Draft, Version 1', !!pr && pr.title === 'Level 4 CB1 programme' && S.params.id === pr.id && cur() === 'curriculum' && qa('.cb-nav .cb-sec').length === 7 && /Draft/.test(q('.page-h').textContent) && /Version 1/.test(q('.page-h').textContent));
    ok('CB1-A header: title, level, reference, status, version and "Version history"', q('.page-h h1').textContent === pr.title && /Level 4/.test(q('.page-h').textContent) && /QN 610\/7777\/1/.test(q('.page-h').textContent) && !!q('.page-h [data-tab="versions"]'));
    ok('CB1-A no old step bar or tab bar anywhere', oldNav() === 0);
    q('.cb-sec[data-tab="details"]').click(); ok('CB1-A Course Details: the details form, editable while Draft (CB2: "Save details" / "Save and continue")', cur() === 'details' && !!q('#np-t') && !!q('[data-act="cbDetSave"]'));
    // CB8 (PD-CB-48, PD-CB-52) supersedes "the creator's payment-terms proposal (Save draft / Submit to Finance)" in the Payment plan panel:
    // the creator edits the financial package in "Fees & payment options" and submits it with "Submit to Finance for review"
    q('.cb-sec[data-tab="payments"]').click(); ok('CB1-A Fees & Payments: the creator\'s financial package (Submit to Finance for review), Draft — not yet sent to Finance', pan() === 'fees' && !!q('[data-act="cb8Submit"]') && !!q('[data-act="cb8PayAdd"]') && /Draft — not yet sent to Finance/.test(main()));
    FA(); go('a-programmes'); ok('CB1-A (negative) Finance can\'t open NVQ Programmes (unchanged)', /permission/i.test(main()) && !q('[data-act="chProgNew"]') && !q('.cb-nav'));
  });

  await T('CB1-B seeded Level 2/3/4/5 programmes', async () => {
    fresh(); SA();
    ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5'].forEach(id => {
      const pr = s3Pr(id); open(id);
      // CB4 (PD-CB-26) supersedes "Hierarchy" (the S3 card title): one curriculum editor for every programme, titled "Curriculum structure"
      ok(`CB1-B ${id} (${pr.status}): the list link opens the course builder on Curriculum (the curriculum hierarchy)`, cur() === 'curriculum' && pan() === 'structure' && /Curriculum structure/.test(main()) && !!q('.cb-cur-tree'));
      const seen = SECS.map(k => { q(`.cb-sec[data-tab="${k}"]`).click(); return cur() === k && q('.cb-sec.cur').getAttribute('aria-current') === 'page' && main().trim().length > 200 && !/undefined|We can't find that page/.test(main()) && oldNav() === 0; });
      ok(`CB1-B ${id}: each of the seven sections opens by clicking, current and marked, with content, no old navigation`, seen.every(Boolean), seen.join());
    });
    // CB2 (PD-CB-15) supersedes "says editing arrives in CB2": seeded programmes' details stay read-only and say why
    open('NV-L3', 'details'); ok('CB1-B published seeded Course Details: read-only (no inputs) with the reason; nothing promised for CB2', !qa('.cb-body input, .cb-body select, .cb-body textarea').length && /existed before the course builder are read-only/.test(q('.cb-body').textContent) && !/planned for CB2/.test(main()) && /QN 603\/2851\/9/.test(main()));
    // CB5 (PD-CB-34) supersedes the read-only list ("authoring arrives in CB5", "Open" → Assignments & Criteria Mapping): assignments are
    // authored in Section 3; "Open" opens the assignment in place
    open('NV-L3', 'assessments'); ok('CB1-B Assessments: the programme\'s assignments listed with New assignment; not marked read-only for the Super Admin; nothing promised for CB5', qa('.cb-assess tbody tr').length >= 5 && !!q('.cb-assess [data-act="cbAsgNew"]') && !/planned for CB5/.test(main()) && !q('.cb-sec[data-tab="assessments"] .cb-badge'));
    q('.cb-assess [data-act="cbAsgOpen"][data-id]').click(); ok('CB1-B …"Open" opens that assignment in Section 3 (Details, Questions, Criteria mapping)', S.route === 'a-programmes' && !!q('.cb-asg-ed') && qa('.cb-asg-tabs .tab').length === 3 && !/We can't find that page/.test(main()));
  });

  await T('CB1-C existing drafts', async () => {
    fresh(); SA(); open('NV-L3D', 'observations');
    ok('CB1-C seeded Draft (NV-L3D): Draft chip; Observations editable (Edit settings); the version bar says Draft and links to Review & Publish', /Draft/.test(q('.page-h').textContent) && !!q('.cb-body [data-act="n5Settings"]') && !!q('.cb-ver [data-tab="review"]') /* CB12 (PD-CB-79): was the version area's own "Publish programme" (kPubProg); publishing is in Section 7 */);
    ok('CB1-C …the observation blocker is shown on the section that fixes it (Course Details — the Yes/No answer) and on Review', /* CB11 (PD-CB-73): was the Observations section badge */ !!q('.cb-sec[data-tab="details"] .cb-badge.bad') && !!q('.cb-sec[data-tab="review"] .cb-badge.bad'));
    q('.cb-sec[data-tab="review"]').click(); ok('CB1-C …Review & Publish lists the observation check under Before publishing with a link to fix it', /* CB11 (PD-CB-73): was "Observation checks for Version 1" and "planned for CB11" */ /Before publishing/.test(main()) && /Blocking/.test(q('.cb-body').textContent) && /choose whether observation is required/i.test(q('.cb-rv-todo').textContent) && !!q('.cb-rv-fix') && !/planned for CB11/.test(main()));
    SYS(); open('NV-N1');
    ok('CB1-C new-programme Draft (NV-N1): opens on Course Details (as before) with its form', cur() === 'details' && !!q('#np-t'));
    const has = (sec, panel, acts) => { open('NV-N1', panel || sec); return acts.every(a => !!q(`.cb-body [data-act="${a}"]`)); };
    ok('CB1-C …Curriculum keeps Add unit / module / Learning Outcome / criterion', has('curriculum', 'structure', ['ch8AddUnit', 'ch8AddMod', 'ch8AddLo', 'ch8AddCrit']));
    ok('CB1-C …Observations keeps Edit settings', has('observations', 'obs', ['n5Settings']));
    ok('CB1-C …Fees & Payments: its existing Payment plan step (NV-N1 predates E1 terms: read-only, set by Finance or the Super Admin, as before)', has('payments', 'plan', []) && !!q('.e1-plan .e1-sumbox') && /Set by Finance or the Super Admin/.test(q('.e1-plan').textContent));
    // CB3 (PD-CB-22) supersedes "ch8SaveDocs": the Required enrolment documents list (s4CkAdd) is the one checklist editor
    ok('CB1-C …Offer Letter & Documents: Upload offer letter, and the document checklist', has('documents', 'letter', ['chLetterUp']) && has('documents', 'docs', ['s4CkAdd']));
    open('NV-N1', 'review'); ok('CB1-C …Review & Publish: the existing review with Publish disabled while items are blocking; the blockers shown on their sections', !!q('[data-act="cbPublish"][disabled]') /* CB11 (PD-CB-77): was ch8Publish */ && !!q('.cb-sec[data-tab="documents"] .cb-badge.bad') && !!q('.cb-sec[data-tab="review"] .cb-badge.bad'));
  });

  await T('CB1-D published programme', async () => {
    fresh(); SA(); open('NV-L3', 'curriculum');
    ok('CB1-D published (NV-L3): Active, Version 2, "Create new version" in the version area', /Active/.test(q('.page-h').textContent) && /Version 2/.test(q('.page-h').textContent) && !!q('.cb-ver [data-act="newProgVersion"]'));
    open('NV-L3', 'observations'); ok('CB1-D Observations read-only for the published version (no edit controls)', !!q('.n5-head') && !q('[data-act="n5Settings"], [data-act="n5IaEdit"], [data-act="n5NvqEv"]'));
    open('NV-L3', 'payments'); ok('CB1-D Fees & Payments: Fee options first, then Payment plan, then Observation fee rate', qa('.cb-panels .tab').map(t => t.dataset.tab).join() === 'fees,plan,support' && pan() === 'fees' && !!q('.r1-opts [data-act="r1OptAdd"]'));
    q('.cb-panels [data-tab="plan"]').click(); ok('CB1-D Payment plan: the plan in force read-only (version and payment summary), owned by Finance', !!q('.cb-plan .e1-sum') && /Version \d+ in force/.test(q('.cb-plan').textContent) && /Finance → Payment Plans/.test(q('.cb-plan').textContent) && !/planned for CB/.test(q('.cb-plan').textContent) /* CB12 (PD-CB-81): was "planned for CB8" — the placeholder is removed */ && !qa('.cb-plan input').length);
    q('.cb-panels [data-tab="support"]').click(); ok('CB1-D Observation fee rate: the existing control (Fully assisted selected)', document.querySelector('input[name="ch-sup"][value="Fully assisted"]').checked && !!q('[data-act="chSupSave"]'));
    open('NV-L3', 'documents'); ok('CB1-D Offer Letter & Documents: offer letter current version and Upload new version', pan() === 'letter' && /Current version/.test(main()) && !!q('[data-act="chLetterUp"]'));
    q('.cb-panels [data-tab="docs"]').click(); ok('CB1-D …Enrolment documents: the programme\'s versioned checklist with Add item', !!q('.s4-ck') && !!q('[data-act="s4CkAdd"]'));
    // CB3 (PD-CB-20) supersedes the CB1 "no separate learner contract yet" card: the client confirmed the course contract IS the offer letter
    q('.cb-panels [data-tab="letter"]').click(); ok('CB1-D …the offer letter is stated as the course contract; no separate contract card', !q('.cb-contract') && /This offer letter is the course contract/.test(q('.cb-contract-note').textContent) && !/Learner contract/.test(main()));
    open('NV-L3', 'review'); ok('CB1-D Review & Publish: says Version 2 is published and how to change it', /Version 2 is published/.test(q('.cb-body').textContent));
    q('.page-h [data-tab="versions"]').click(); ok('CB1-D Version history: the versions with the current one, and a way back', /Version 2 \(current\)/.test(main()) && !q('.cb-nav') && !!q('.cb-sh [data-tab="curriculum"]'));
    q('.cb-sh [data-tab="curriculum"]').click(); ok('CB1-D …"Back to the course builder" returns to Curriculum', cur() === 'curriculum');
    SA(); const pr = (() => { go('a-programmes'); ACT.chProgNew(); const f = (s, v) => { document.querySelector(s).value = v; }; f('#np-t', 'Level 3 CB1 options'); f('#np-l', 'Level 3'); INP.r1NpLevel(document.querySelector('#np-l')); f('#np-r', 'QN 603/7777/3'); f('#np-d', '6'); f('#np-du', 'months'); const r = document.querySelector('main .r1-np-row'); r.querySelector('.r1-np-l').value = 'Self-Paced'; r.querySelector('.r1-np-f').value = '1800'; r.querySelector('.r1-np-m').value = 'Self-Paced'; document.querySelector('#np-obs-yes').checked = true; (document.querySelector('#np-code') || {}).value = 'CB1-L3'; crT(ACT.cbDetCreate)(); return (STORE.chNewProgs || []).slice(-1)[0]; })(); // CB2 (PD-CB-14): the Course Details page, not the dialog
    // CB8 (PD-CB-48) supersedes the panels "plan, fees, support" and the R1 options card for a new programme: "Fees & payment options"
    // (one card per fee option, with its observation fees and payment options), "Financial versions", and the legacy rate
    open(pr.id, 'payments'); ok('CB1-D new Level 3 programme: Fees & Payments shows its fee options, its financial versions and the observation fee rate', qa('.cb-panels .tab').map(t => t.dataset.tab).join() === 'fees,payhist,support');
    q('.cb-panels [data-tab="fees"]').click(); ok('CB1-D …its fee option is a card with its ID', !!q('.cb8-opt') && main().includes(pr.id + '-FO-001'));
    q('.cb-panels [data-tab="support"]').click(); document.querySelector('input[name="ch-sup"][value="Self-paced"]').checked = true; ACT.chSupSave({ dataset: { id: pr.id } }); reason('CB1 rate');
    ok('CB1-D …the observation fee rate it was silently given can now be seen and changed (audited), in the same store CH-38 reads', chSupportOf(pr.id) === 'Self-paced' && chFeeAmt(chSupportOf(pr.id)) === 100 && ADMIN.audit[0].action === 'Support type changed');
  });

  await T('CB1-E retired programme read-only', async () => {
    fresh(); SA(); open('NV-L3O');
    ok('CB1-E retired (NV-L3O): the version area is one read-only historical-record note (Version 4 the last version; nothing can be saved; no new version)', !!q('.cb-ver .cb-hist') && q('.cb-ver').children.length === 1 && /read-only historical record/.test(q('.cb-hist').textContent) && /Version 4 was the last version/.test(q('.cb-hist').textContent) && /Retired/.test(q('.page-h').textContent));
    // Final review: no wording on a retired programme may tell the reader how to save or change it
    const misleading = /Saving creates Version|Create new version|create a new version|Changes apply to new applicants|Migrating a cohort|planned for CB|needs configuration|created and edited in|assessment type set here/;
    const said = ['details', 'structure', 'types', 'assessments', 'obs', 'library', 'plan', 'support', 'letter', 'docs', 'review', 'versions'].map(t => { open('NV-L3O', t); const m = q('.cb').textContent.match(misleading); return m ? t + ': "' + m[0] + '"' : ''; }).filter(Boolean);
    ok('CB1-E no section, panel or version history of the retired programme says how to save, edit or create a version', !said.length, said.join(' | '));
    const every = [];
    ['details', 'structure', 'types', 'assessments', 'obs', 'library', 'plan', 'support', 'letter', 'docs', 'review', 'versions'].forEach(t => { open('NV-L3O', t);
      const acts = qa('[data-act]').filter(b => b.closest('.cb')).map(b => b.dataset.act).filter(a => WRITE.includes(a)), live = qa('.cb-body input, .cb-body select, .cb-body textarea').filter(f => !f.disabled && !f.closest('.dt, .dt-filt'));
      every.push(t + ':' + acts.length + '/' + live.length); });
    ok('CB1-E no write control and no enabled form field in any section or panel', every.every(x => /:0\/0$/.test(x)), every.join(' '));
    const tries = [['chSupSave', { id: 'NV-L3O' }], ['chLetterUp', { id: 'NV-L3O' }], ['s4CkAdd', { p: 'NV-L3O' }], ['s4CkRetire', { p: 'NV-L3O', i: '0' }], ['newProgVersion', { id: 'NV-L3O' }], ['kPubProg', { id: 'NV-L3O' }]];
    tries.forEach(([a, ds]) => { const s0 = state(), a0 = ADMIN.audit.length; const r = document.createElement('input'); r.type = 'radio'; r.name = 'ch-sup'; r.value = 'Self-paced'; r.checked = true; document.body.appendChild(r); ACT[a]({ dataset: ds }); r.remove();
      ok(`CB1-E direct call ${a} on the retired programme: refused, logged, nothing changed`, !MODAL && state() === s0 && blocked(a0, /retired/i)); closeModal(); });
    const a0 = ADMIN.audit.length; ACT.n5Settings({ dataset: { p: 'NV-L3O' } });
    ok('CB1-E …the N5a actions keep their own refusal (logged "Retired programme")', !MODAL && ADMIN.audit.length > a0 && ADMIN.audit[0].action === 'Blocked: change observation settings' && ADMIN.audit[0].reason === 'Retired programme');
  });

  await T('CB1-F navigation between sections and panels', async () => {
    fresh(); SA(); open('NV-L3', 'details');
    const walk = []; for (let i = 0; i < 6; i++) { q('.cb-foot .btn-primary').click(); walk.push(cur()); }
    ok('CB1-F the "next" button walks the seven sections in order', walk.join() === SECS.slice(1).join(), walk.join());
    ok('CB1-F …no "next" on the last section; "previous" goes back', !q('.cb-foot .btn-primary') && (q('.cb-foot .btn').click(), cur() === 'documents'));
    open('NV-L3', 'curriculum'); q('.cb-panels [data-tab="types"]').click(); ok('CB1-F a panel switches within its section', cur() === 'curriculum' && pan() === 'types' && /Assessment types/.test(q('.cb-body').textContent));
    ok('CB1-F the address follows the section or panel (old links stay meaningful)', location.hash === '#a-programmes.NV-L3.types');
  });

  await T('CB1-G old links and deep links', async () => {
    fresh(); SA();
    const seeded = [['tree', 'curriculum', 'structure'], ['types', 'curriculum', 'types'], ['versions', null, 'versions'], ['library', 'observations', 'library'], ['obs', 'observations', 'obs'], ['letter', 'documents', 'letter'], ['support', 'payments', 'support'], ['fees', 'payments', 'fees']];
    seeded.forEach(([t, s, p]) => { open('NV-L3', t); ok(`CB1-G seeded #a-programmes.NV-L3.${t} → ${s || 'Version history'}${p ? ' / ' + p : ''}`, (s ? cur() === s : !q('.cb-nav') && /Version history/.test(main())) && (pan() === p || (!q('.cb-panels') && p === 'versions')), cur() + '/' + pan()); });
    SYS(); const wiz = [['details', 'details'], ['structure', 'curriculum'], ['obs', 'observations'], ['letter', 'documents'], ['docs', 'documents'], ['plan', 'payments'], ['review', 'review']];
    wiz.forEach(([t, s]) => { open('NV-N1', t); ok(`CB1-G new-programme step #a-programmes.NV-N1.${t} → ${s}`, cur() === s); });
    open('NV-N1', 'nonsense'); ok('CB1-G an unknown tab opens Course Details of a new programme (as before)', cur() === 'details');
    location.hash = '#a-programmes.NV-L5.letter'; await new Promise(r => setTimeout(r, 30)); ok('CB1-G typing an old address (hash change) opens the section', S.params.id === 'NV-L5' && cur() === 'documents' && pan() === 'letter');
    open('NV-L2', 'plan'); ok('CB1-G Finance\'s "Edit plan" address for a new programme (tab "plan") still opens its plan', cur() === 'payments' && pan() === 'plan');
  });

  await T('CB1-H existing fee configuration and Finance', async () => {
    fresh(); SA(); open('NV-L3', 'fees'); ok('CB1-H Super Admin: Level 3 fee options with Add / Edit / Retire', !!q('[data-act="r1OptAdd"]') && !!q('[data-act="r1OptEdit"]'));
    SYS(); open('NV-L3', 'fees'); ok('CB1-H System Admin: fee options read-only ("Finance Admin / Super Admin only"), as before', !q('[data-act="r1OptAdd"]') && /Finance Admin \/ Super Admin only/.test(main()));
    const a0 = ADMIN.audit.length; ACT.r1OptAdd({ dataset: { p: 'NV-L3' } }); ok('CB1-H (negative) System Admin calling Add fee option directly: refused and logged (R1 guard unchanged)', !MODAL && blocked(a0));
    FA(); go('f-plans', { tab: 'templates' }); ok('CB1-H Finance → Payment Plans still has the fee options card (unchanged)', !!q('.r1-opts [data-act="r1OptAdd"]'));
    open('NV-L3', 'fees'); ok('CB1-H (negative) Finance still can\'t open the programme page', /permission/i.test(main()) && !q('.cb-nav'));
  });

  await T('CB1-K authorization of programme actions (direct calls)', async () => {
    const cases = [['ch8AddUnit', { id: 'NV-N1' }], ['ch8AddMod', { id: 'NV-N1', u: '0' }], ['ch8AddLo', { id: 'NV-N1', u: '0', m: '0' }], ['ch8AddCrit', { id: 'NV-N1', u: '0', m: '0', l: '0' }], ['ch8Key', { id: 'NV-N1', u: '0', m: '0' }], ['ch8SaveDetails', { id: 'NV-N1' }], ['chSupSave', { id: 'NV-L3' }], ['s3WizVersion', { id: 'NV-N2' }], ['s3WizPublish', { id: 'NV-N2' }], ['ch8Publish', { id: 'NV-N1' }], ['kPubProg', { id: 'NV-L3D' }], ['chLetterUp', { id: 'NV-L3' }], ['s4CkAdd', { p: 'NV-L3' }], ['newProgVersion', { id: 'NV-L3' }]];
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', LEARNER]].forEach(([who, enter]) => {
      const bad = [];
      cases.forEach(([a, ds]) => { fresh(); enter(); if (a === 'chSupSave') { const r = document.createElement('input'); r.type = 'radio'; r.name = 'ch-sup'; r.value = 'Self-paced'; r.checked = true; document.body.appendChild(r); }
        const s0 = state(); ACT[a]({ dataset: ds }); if (MODAL) reason('direct'); if (state() !== s0) bad.push(a); closeModal(); document.querySelectorAll('body > input[name="ch-sup"]').forEach(x => x.remove()); });
      ok(`CB1-K ${who}: none of the builder's programme actions changes anything when called directly`, !bad.length, bad.join());
    });
    fresh(); FA(); let a0 = ADMIN.audit.length; ACT.ch8AddUnit({ dataset: { id: 'NV-N1' } });
    ok('CB1-K Finance: Add unit refused before any dialog, logged ("Blocked: change the structure")', !MODAL && blocked(a0, /change the structure/));
    BA(); a0 = ADMIN.audit.length; const r = document.createElement('input'); r.type = 'radio'; r.name = 'ch-sup'; r.value = 'Self-paced'; r.checked = true; document.body.appendChild(r); ACT.chSupSave({ dataset: { id: 'NV-L3' } }); r.remove();
    ok('CB1-K Business Admin: observation fee rate refused, logged, unchanged', !MODAL && blocked(a0, /observation fee rate/) && chSupportOf('NV-L3') === 'Fully assisted');
    SYS(); ACT.ch8AddUnit({ dataset: { id: 'NV-N1' } }); ok('CB1-K (positive) the System Admin still adds a unit to a Draft', !!MODAL && /Add unit/.test(MODAL.title)); closeModal();
    ACA(); ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); ok('CB1-K (positive) the Academic Admin still creates a new version of a published new programme', !!MODAL && /Create new version/.test(MODAL.title)); closeModal();
  });

  await T('CB1-P the 12 newly protected actions: authorized and unauthorized', async () => {
    // Each action, called directly: refused (no dialog, nothing changed, "Blocked: …" logged) for Finance, Business and a learner;
    // allowed for the programme administrators (it opens its dialog or saves, with no refusal logged)
    const key = () => { s3Keys('NV-L3')['U301 M1'] = [{ file: 'cb1-key.pdf', at: now().toISOString(), by: 'CB1 test' }]; };
    const radio = () => { const r = document.createElement('input'); r.type = 'radio'; r.name = 'ch-sup'; r.value = 'Self-paced'; r.checked = true; document.body.appendChild(r); };
    const ACTS = [['ch8SaveDetails', { id: 'NV-N1' }, () => { open('NV-N1', 'details'); q('#np-t').value = 'NV-N1 renamed by CB1-P'; }, () => s3Pr('NV-N1').title === 'NV-N1 renamed by CB1-P'],
      ['ch8AddUnit', { id: 'NV-N1' }], ['ch8AddMod', { id: 'NV-N1', u: '0' }], ['ch8AddLo', { id: 'NV-N1', u: '0', m: '0' }], ['ch8AddCrit', { id: 'NV-N1', u: '0', m: '0', l: '0' }], ['ch8Key', { id: 'NV-N1', u: '0', m: '0' }],
      ['s3WRename', { id: 'NV-N1', u: '0' }], ['s3WRemove', { id: 'NV-N1', u: '0' }], ['s3KeyRemove', { p: 'NV-L3', k: 'U301 M1' }, key], ['s3WizVersion', { id: 'NV-N2' }],
      ['s3WizPublish', { id: 'NV-N2' }, () => { s3Pr('NV-N2').nextDraft = true; }], ['chSupSave', { id: 'NV-L3' }, radio]];
    ok('CB1-P the protected list is exactly these 12 actions', Object.keys(CB_ROLE).sort().join() === ACTS.map(a => a[0]).sort().join(), Object.keys(CB_ROLE).join());
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', LEARNER]].forEach(([who, enter]) => ACTS.forEach(([a, ds, prep]) => {
      fresh(); SYS(); if (prep) prep(); enter(); const s0 = state(), a0 = ADMIN.audit.length; ACT[a]({ dataset: ds });
      ok(`CB1-P ${a} by ${who}: refused — no dialog, nothing changed, "Blocked" logged`, !MODAL && state() === s0 && blocked(a0, new RegExp('Blocked: ' + CB_ROLE[a]))); closeModal(); document.querySelectorAll('body > input[name="ch-sup"]').forEach(x => x.remove()); }));
    [['System Admin', SYS], ['Academic Admin', ACA], ['Super Admin', SA]].forEach(([who, enter]) => {
      const res = ACTS.map(([a, ds, prep, saved]) => { fresh(); enter(); if (prep) prep(); const a0 = ADMIN.audit.length; ACT[a]({ dataset: ds }); const r = (!!MODAL || (saved && saved())) && !blocked(a0); closeModal(); document.querySelectorAll('body > input[name="ch-sup"]').forEach(x => x.remove()); return r ? '' : a; }).filter(Boolean);
      ok(`CB1-P ${who}: all 12 actions still open or save (no refusal)`, !res.length, res.join());
    });
  });

  await T('CB1-Q seeded and new programmes keep their data', async () => {
    // Opening every section and panel of every programme (as the Super Admin and the System Admin) changes no programme record
    fresh(); SA(); const keep = () => JSON.stringify({ p: ADMIN.programmes, t: STORE.chProgTree, tr: STORE.s3 && STORE.s3.trees, d: STORE.s3 && STORE.s3.drafts, l: STORE.chLetters, s: chSupports(), r1: STORE.r1, ck: STORE.s4 && STORE.s4.lists, pl: STORE.s4 && STORE.s4.plans, e1: STORE.e1, n5: STORE.n5 && [STORE.n5.pub, STORE.n5.draft], s2: STORE.s2Defs, docs: STORE.chProgDocs });
    s2Defs(); // the assignment definitions are seeded lazily on first use (S2), as when Assignments is first opened — not a change
    const before = keep(), tabs =['details', 'structure', 'types', 'assessments', 'obs', 'library', 'plan', 'fees', 'support', 'letter', 'docs', 'review', 'versions'];
    [SA, SYS].forEach(enter => { enter(); ADMIN.programmes.map(p => p.id).forEach(id => tabs.forEach(t => open(id, t))); });
    ok('CB1-Q visiting every section of every programme leaves programmes, structures, drafts, letters, checklists, plans, fee options, terms, observation configuration and assignments unchanged', keep() === before);
  });

  await T('CB1-L unsaved changes', async () => {
    // CB2 (PD-CB-16) supersedes the Course Details case: its typed values are now kept across sections (tested in ft-cb2). The prompt
    // still protects the other sections' forms — CB3 (PD-CB-22): the CH-8 checklist boxes are gone, so here the observation fee rate
    fresh(); SA(); open('NV-L3', 'support'); const was = chSupportOf('NV-L3'), box = q('input[name="ch-sup"][value="Self-paced"]');
    box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true }));
    q('.cb-sec[data-tab="curriculum"]').click();
    ok('CB1-L leaving a section with an unsaved change asks first, and stays on the section', !!MODAL && MODAL.title === 'Leave without saving?' && /Fees & Payments/.test(document.querySelector('#modal-root').textContent) && cur() === 'payments');
    closeModal(); ok('CB1-L "Stay and save" keeps the chosen rate', q('input[name="ch-sup"][value="Self-paced"]').checked);
    q('.cb-sec[data-tab="curriculum"]').click(); prim(); ok('CB1-L "Leave without saving" goes to the section and saves nothing', cur() === 'curriculum' && chSupportOf('NV-L3') === was);
    open('NV-L3', 'support'); const b2 = q('input[name="ch-sup"][value="Self-paced"]'); b2.checked = true; b2.dispatchEvent(new Event('change', { bubbles: true })); ACT.chSupSave({ dataset: { id: 'NV-L3' } }); reason('CB1-L');
    q('.cb-sec[data-tab="curriculum"]').click(); ok('CB1-L after saving, leaving doesn\'t ask', !MODAL && cur() === 'curriculum' && chSupportOf('NV-L3') === 'Self-paced');
    open('NV-L3', 'observations'); const s = document.querySelector('main .dt input, main .dt-filt input'); if (s) { s.value = 'x'; s.dispatchEvent(new Event('input', { bubbles: true })); }
    q('.cb-sec[data-tab="review"]').click(); ok('CB1-L (negative) typing in a table search box doesn\'t count as unsaved work', !MODAL && cur() === 'review');
  });

  await T('CB1-M no data copies: builder changes reach the existing consumers', async () => {
    fresh(); SA(); open('NV-L3', 'docs'); const n0 = s4List('NV-L3').items.length;
    q('[data-act="s4CkAdd"]').click(); document.querySelector('#ck-n').value = 'CB1 document'; reason('CB1');
    ok('CB1-M a checklist item added in the builder is in the programme\'s versioned checklist (what sign-up copies)', s4List('NV-L3').items.length === n0 + 1 && s4List('NV-L3').items.some(i => i.name === 'CB1 document'));
    open('NV-L3', 'letter'); const v0 = chLetterCur('NV-L3').v; q('[data-act="chLetterUp"]').click(); ACT.chLetterSample(); reason('CB1 letter');
    ok('CB1-M an offer letter uploaded in the builder is the current letter version (what applicants sign)', chLetterCur('NV-L3').v === v0 + 1);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
