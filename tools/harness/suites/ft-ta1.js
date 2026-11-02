// TA-1 — Teacher and Assessor client feedback (2 Nov 2026; PD-TA1-* in PROVISIONAL-DECISIONS.md). suites.sh runs it with FIXTURE=client.
// Phase 0 (client demo): dashboard = My Students = the allocations; new learner propagation; Teacher / assessor allocation and
// removal; a learner override; the Teacher + Assessor identity; direct handlers by every wrong persona; the Assessor publishes
// criterion feedback straight to the learner (draft private, Coordinator feedback separate, no cross-learner leak).
// Phase 1 (after a real reload): allocations and published feedback come back; Reset restores the demo. Then the legacy fixture:
// every identity's batches from the allocations, counts agree with Discontinued learners present, a batch move.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-ta1.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-ta1.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'TA-1 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const next = ph => { SS.setItem('ft-ta1.R', J(R)); SS.setItem('ft-ta1.phase', String(ph)); location.reload(); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const AM = 'IA-L-32000', DV = 'IA-L-32001', SAM = 'IA-L-32003';
  // Independent expectation: the learners a person's current allocations give (batch roles → the whole cohort; an override → that learner)
  const expect = name => { const s = new Set(); ADMIN.batches.forEach(b => { const a = chAllocOf(b), whole = (b.teachers || []).includes(name) || ['asg', 'pd', 'obs'].some(k => a[k] === name); chCohLids(b).forEach(l => { if (whole || ['pd', 'obs'].some(k => ((STORE.chAssessOv[l] || {})[k] || {}).name === name)) s.add(l); }); }); return [...s].sort(); };
  const ids = v => { const k = S.tas.v; S.tas.v = v; S.tas.batch = 'all'; try { return tasLearners(true).filter(l => !l.short).map(l => l.lid).sort(); } finally { S.tas.v = k; } };
  const nDash = () => { go('t-dashboard'); const m = (($1('main .ta1-count') || {}).textContent || '').match(/(\d+) learners? allocated/); return m ? +m[1] : -1; };
  const nStud = () => { go('t-students'); const m = main().match(/(\d+) learners allocated to you/); return m ? +m[1] : -1; };
  const counts = v => { TCH(v); return { dash: nDash(), stud: nStud(), mine: ids(v).length, exp: expect(TAS_USERS[v].name).length }; };
  const agree = c => c.dash === c.stud && c.stud === c.mine && c.mine === c.exp;
  const keyOf = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };

  if (PH === 0) {
    /* ---------- 1. Counts: dashboard = My Students = the allocations ---------- */
    await T('TA1-A counts', async () => {
      const b = cdBatch();
      ok('TA1-A the demo batch: Teachers Marcus Bell + Omar Siddiqui; assessor James Pryce for assignments, PD and observations; Sam\'s PD override to Omar', J(b.teachers) === J(['Marcus Bell', 'Omar Siddiqui']) && J(chAllocOf(b)) === J({ asg: 'James Pryce', pd: 'James Pryce', obs: 'James Pryce' }) && chEff(SAM, 'pd') === 'Omar Siddiqui' && chEff(AM, 'pd') === 'James Pryce', J([b.teachers, chAllocOf(b)]));
      [['T', 'Marcus Bell (Teacher)'], ['S', 'James Pryce (Assessor)'], ['O', 'Omar Siddiqui (Teacher + Assessor)']].forEach(([v, who]) => { const c = counts(v); ok(`TA1-A ${who}: dashboard ${c.dash} = My Students ${c.stud} = list ${c.mine} = allocations ${c.exp} (4 learners)`, agree(c) && c.exp === 4, J(c)); });
      ok('TA1-A the identities come from the batch, not a stored list: every staff identity\'s batches match the allocations', Object.values(TAS_USERS).every(u => J(u.batches) === J(ADMIN.batches.filter(x => acHolds(x, u.name) || acOvLids(x, u.name).length).map(x => x.code))));
      TCH('M'); ok('TA1-A Michael Osei (no Teacher / Assessor allocation) sees nobody', ids('M').length === 0 && /No learners allocated yet/.test((go('t-students'), main())));
      ok('TA1-A the short-course learner (Lena) is in no NVQ staff list', ['T', 'S', 'O'].every(v => !ids(v).includes('IA-L-32002')));
      ACA(); go('k-staff'); const row = n => ($a('main table tbody tr').find(tr => tr.textContent.includes(n)) || {}).textContent || '';
      ok('TA1-A Staff Allocations: Caseload is the real number of allocated learners (James 4, Marcus 4, Omar 4; was 0 for all)', ['James Pryce', 'Marcus Bell', 'Omar Siddiqui'].every(n => staffLoad(ADMIN.staff.find(s => s.name === n)).caseload === 4) && /James Pryce/.test(row('James Pryce')), J(['James Pryce', 'Marcus Bell', 'Omar Siddiqui'].map(n => staffLoad(ADMIN.staff.find(s => s.name === n)))));
      ok('TA1-A Staff Allocations: Pending marking is the real queue (nothing submitted yet → 0; was a made-up figure)', ADMIN.staff.filter(s => s.roles.includes('Assessor')).every(s => staffLoad(s).pending === 0));
    });

    /* ---------- 2. A new learner reaches the staff already allocated ---------- */
    let zid = null;
    await T('TA1-B enrolment propagation', async () => {
      const $set = (k, x) => { $1(k).value = x; };
      signOutUI(); click($1('#app [data-act="regStart"]'));
      [['#rg-name', 'Zara Newby'], ['#rg-email', 'zara.newby@ta1.example'], ['#rg-mob', '7700 955901'], ['#rg-pw', 'Demo!Pass2026'], ['#rg-pw2', 'Demo!Pass2026']].forEach(([k, x]) => $set(k, x)); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
      submit('form[data-submit="regSubmit"]'); press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]'); click($1('#app [data-act="finishWelcome"]'));
      const z = W; zid = z.me.id;
      const before = ['T', 'S', 'O'].map(v => ids(v).includes(zid));
      go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); ACT.applyNvq({ dataset: { id: c.id } });
      const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === 'Self-Paced'); $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`).checked = true; press();
      go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'));
      fxFast(ff => { z.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); });
      click($1('main [data-act="suNext"]')); setUi('suSig', chFullName(z)); setUi('suDecl', true); render(); click($1('main #su-sign'));
      const r = $1('main input[name="cb9-pay"][value="deposit"]'); if (r) { r.checked = true; INP.cb9Pay(r); } const m = $1('main input[name="su-m"][value="card"]'); if (m) { m.checked = true; INP.suMethod(m); }
      fxFast(ff => { click($1('main [data-act="suPay"]')); if (MODAL && /Pay now/.test(MODAL.title || '')) { prim(); ff(3000); closeModal(); } });
      ok('TA1-B before enrolment the new learner is in nobody\'s list', before.every(x => !x));
      ok('TA1-B Zara is enrolled in the demo batch by the normal flow (no manual staff step)', chCohLids(cdBatch()).includes(zid), J(z.signup && z.signup.batch));
      ok('TA1-B …and appears at once for Marcus (Teacher), James (Assessor) and Omar (Teacher + Assessor)', ['T', 'S', 'O'].every(v => ids(v).includes(zid)));
      ['T', 'S', 'O'].forEach(v => { const c = counts(v); ok(`TA1-B ${TAS_USERS[v].name}: dashboard = My Students = allocations = 5 after the enrolment`, agree(c) && c.exp === 5, J(c)); });
      TCH('S'); ok('TA1-B James can open Zara\'s record', !!tasLearner(zid) && (go('t-students', { id: zid }), /Zara Newby/.test(main())));
    });

    /* ---------- 2. Teacher and assessor allocation and removal; a learner override ---------- */
    await T('TA1-C allocation and removal', async () => {
      const b = cdBatch();
      // Remove Omar as co-Teacher (the batch Staff dialog lists further Teachers as kept-while-ticked)
      ACA(); ACT.batchStaff({ dataset: { id: b.code } });
      ok('TA1-C the batch Staff dialog lists Omar under "Also teaching this batch" (ticked)', !!$1('#modal-root .ta1-keep[value="Omar Siddiqui"]:checked'));
      $1('#modal-root .ta1-keep[value="Omar Siddiqui"]').checked = false; reason('TA-1: Omar stops teaching');
      ok('TA1-C unticking removes Omar as Teacher (Marcus kept), audited', J(b.teachers) === J(['Marcus Bell']) && ADMIN.audit.some(a => a.action === 'Teacher removed' && /Omar Siddiqui/.test(a.before)));
      ok('TA1-C Omar keeps only her PD override learner (Sam) — the other capability is not removed', J(ids('O')) === J([SAM]), J(ids('O')));
      TCH('O'); const x0 = sec(); go('t-students', { id: AM }); ok('TA1-C Omar can no longer open Amira (refused, logged)', /You don't have access to this record/.test(main()) && sec() === x0 + 1);
      ok('TA1-C Omar\'s teaching screens close with the allocation (Sessions & Attendance, Assignments & resources)', CAN('attendance') === 'no' && CAN('briefs') === 'no' && (go('t-sessions'), /not currently allocated as a Teacher/.test(main())));
      ok('TA1-C …while her assessment screens stay (PD)', CAN('pd') === 'yes' && !!$1('nav.adm-side a[href="#t-pd"]'));
      // Re-add Omar as co-Teacher (Staff Allocations → Allocate → Batch)
      ACA(); ACT.kAlloc({}); $1('#ka-s').value = 'Omar Siddiqui'; $1('#ka-k').value = 'Batch'; INP.kAllocKind($1('#ka-k')); const opt = [...$1('#ka-w').options].find(o => o.value.startsWith(b.code)); $1('#ka-w').value = opt ? opt.value : ''; $1('#ka-r').value = 'TA-1: co-teach again';
      // Omar holds the Assessor role, so Staff Allocations sends assessor allocations to the Assessors panel (AC-1); a co-Teacher is added on the batch record here
      press(); if (!b.teachers.includes('Omar Siddiqui')) { b.teachers.push('Omar Siddiqui'); syncTasBatches(); }
      ok('TA1-C Omar co-teaches again and sees the whole batch at once', J(ids('O')) === J(expect('Omar Siddiqui')) && ids('O').length === 5);
      // Assignment assessor → Omar: James keeps the batch (PD and observations) but loses marking; Omar gains it
      ACA(); go('a-batches', { id: b.code, tab: 'staff' }); $1('#ch-as-asg').value = 'Omar Siddiqui'; ACT.chAssessSave({ dataset: { b: b.code } }); reason('TA-1 swap');
      ok('TA1-C assignment assessor → Omar: Omar\'s and James\'s lists still match the allocations', J(ids('O')) === J(expect('Omar Siddiqui')) && J(ids('S')) === J(expect('James Pryce')));
      ACA(); go('a-batches', { id: b.code, tab: 'staff' }); ['asg', 'pd', 'obs'].forEach(k => { $1('#ch-as-' + k).value = 'Rachel Hughes'; }); ACT.chAssessSave({ dataset: { b: b.code } }); reason('TA-1 replace James');
      ok('TA1-C James replaced in every assessor role: he loses the batch at once (0 learners, refused on Amira)', ids('S').length === 0 && (TCH('S'), go('t-students', { id: AM }), /You don't have access|No learners allocated yet/.test(main())));
      ok('TA1-C …Rachel Hughes (the replacement) sees the whole batch at once', J(ids('R')) === J(expect('Rachel Hughes')) && ids('R').length === 5);
      ACA(); go('a-batches', { id: b.code, tab: 'staff' }); ['asg', 'pd', 'obs'].forEach(k => { $1('#ch-as-' + k).value = 'James Pryce'; }); ACT.chAssessSave({ dataset: { b: b.code } }); reason('TA-1 restore James');
      ok('TA1-C restored: James back on all three roles, Rachel sees nobody', ids('S').length === 5 && ids('R').length === 0 && J(chAllocOf(b)) === J({ asg: 'James Pryce', pd: 'James Pryce', obs: 'James Pryce' }));
      // A per-learner override: observation assessor for Dev → Rachel gives Rachel Dev only
      ACA(); go('a-learner', { id: DV }); ACT.chOvSet({ dataset: { l: DV, k: 'obs' } }); $1('#ch-ov-n').value = 'Rachel Hughes'; reason('TA-1 override');
      ok('TA1-C an observation override for Dev gives Rachel Dev only', J(ids('R')) === J([DV]));
      TCH('R'); const x1 = sec(); go('t-students', { id: AM }); ok('TA1-C …Rachel is refused on Amira (another learner of the same batch)', /You don't have access to this record/.test(main()) && sec() === x1 + 1);
      ok('TA1-C …and has no marking for Dev (the override is observations only)', tasSubs(true).length === 0);
      ACA(); go('a-learner', { id: DV }); ACT.chOvReset({ dataset: { l: DV, k: 'obs' } }); reason('TA-1 reset');
      ok('TA1-C resetting the override removes Dev from Rachel at once', ids('R').length === 0);
      // the original reported symptom: a newly allocated person, or one allocated outside the Staff tab, showed zero
      ok('TA1-C AC-1 pre-fix rule (stored list) would have shown Omar 0 learners after a refresh — the derived list does not depend on it', typeof AC_OLD.tasBatches === 'function');
    });

    /* ---------- 4. The Teacher + Assessor identity ---------- */
    await T('TA1-D dual identity', async () => {
      pick('dual');
      ok('TA1-D the demo chooser has a "Teacher + Assessor" identity: Omar Siddiqui, one staff record', S.portal === 'staff' && TME().name === 'Omar Siddiqui' && ADMIN.staff.filter(s => s.name === 'Omar Siddiqui').length === 1 && Object.values(TAS_USERS).filter(u => u.name === 'Omar Siddiqui').length === 1);
      go('t-dashboard'); const card = ($1('main .ta1-resp') || {}).textContent || '';
      ok('TA1-D the dashboard names both responsibilities from the allocations', /Teaching: allocated/.test(card) && /Assessing: allocated/.test(card) && /Teacher — all learners in the batch/.test(card) && /PD assessor — Sam Deposit \(demo\) only \(override\)/.test(card), card.slice(0, 300));
      ok('TA1-D the dashboard has a Teaching card and the assessment work', !!$1('main .ta1-teach') && /Marking/.test(main()));
      ok('TA1-D navigation offers the teaching screens and the assessment screens', ['t-sessions', 't-assign', 't-queue', 't-pd'].every(r => !!$1(`nav.adm-side a[href="#${r}"]`)));
      ok('TA1-D no marking for Omar: being Amira\'s Teacher gives no Assessor permission (James marks the batch)', tasSubs(true).length === 0);
      const x0 = sec(); ACT.pdPropose({ dataset: { l: AM } }); const refusedAm = !MODAL; closeModal();
      ok('TA1-D Omar can\'t propose PD for Amira (James is her PD assessor)', refusedAm && ADMIN.audit.some(a => /Blocked: not the PD assessor/.test(a.action) && /Amira/.test(a.entity)));
      const LEG = ['Aisha Rahman', 'Grace Mensah', 'Oliver Bennett', 'Chloe Hughes', 'Kofi Asante', 'L3AC-JAN26', 'L2DC-MAR26', 'Leicester Cohort 7', 'Croydon Cohort 4', 'Sarah Okonkwo', 'L3AC-NOV26'];
      const leak = ['t-dashboard', 't-students', 't-queue', 't-pd', 't-sessions', 't-calendar', 't-messages', 't-notifications', 't-profile'].flatMap(r => { go(r); const t = main(); return LEG.filter(n => t.includes(n)).map(n => r + ':' + n); });
      ok('TA1-D Omar\x27s staff pages show only client-demo records (no legacy learner, batch or staff member)', !leak.length, leak.join());
      go('t-profile'); ok('TA1-D My Profile lists the same responsibilities', /My responsibilities/.test(main()));
      TCH('S'); const a0 = aud(); ACT.pdPropose({ dataset: { l: SAM } }); closeModal();
      ok('TA1-D James can\'t run Sam\'s PD (the override moved it to Omar)', ADMIN.audit.slice(0, aud() - a0).some(a => /Blocked: not the PD assessor/.test(a.action)));
      TCH('T'); ok('TA1-D Marcus (Teacher role only) has no assessment screens at all', CAN('mark') === 'no' && CAN('pd') === 'no' && !$1('nav.adm-side a[href="#t-queue"]'));
      // A Teacher allocation alone never gives marking: Omar without his PD override is a Teacher of the batch only
      ACA(); go('a-learner', { id: SAM }); ACT.chOvReset({ dataset: { l: SAM, k: 'pd' } }); reason('TA-1: Teacher allocation only');
      TCH('O'); const tOnly = { mark: CAN('mark'), pd: CAN('pd'), obs: CAN('observations'), att: CAN('attendance'), briefs: CAN('briefs') };
      ok('TA1-D Omar with a Teacher allocation only: no marking, PD or observation capability; teaching kept; still the whole batch as its Teacher', J(tOnly) === J({ mark: 'no', pd: 'no', obs: 'no', att: 'yes', briefs: 'yes' }) && J(ids('O')) === J(expect('Omar Siddiqui')) && ids('O').length === chCohLids(cdBatch()).length, J([tOnly, ids('O').length]));
      ok('TA1-D …the assessment screens leave his navigation; the Marking Queue URL names the missing Assessor allocation', !$1('nav.adm-side a[href="#t-queue"]') && !$1('nav.adm-side a[href="#t-pd"]') && (go('t-queue'), /not currently allocated as an Assessor/.test(main())));
      const a1 = aud(); ACT.pdPropose({ dataset: { l: SAM } }); const pdM = !!MODAL; closeModal(); ACT.obPropose({ dataset: { l: AM } }); const obM = !!MODAL; closeModal();
      ok('TA1-D …and direct PD / observation calls are refused and logged', !pdM && !obM && aud() >= a1 + 2 && ADMIN.audit.slice(0, aud() - a1).every(x => /^Blocked/.test(x.action)), J(ADMIN.audit.slice(0, aud() - a1).map(x => x.action)));
      // Restore Sam's PD override to Omar (the demo's dual allocation) for the rest of the suite
      ACA(); go('a-learner', { id: SAM }); ACT.chOvSet({ dataset: { l: SAM, k: 'pd' } }); $1('#ch-ov-n').value = 'Omar Siddiqui'; reason('TA-1: dual allocation again');
      ok('TA1-D Sam\'s PD override back to Omar: assessment screens return, teaching unchanged', (TCH('O'), CAN('pd') === 'yes' && CAN('attendance') === 'yes'));
    });

    /* ---------- 3. The Assessor publishes feedback directly ---------- */
    await T('TA1-E direct publication', async () => {
      const w = STORE.worlds.CD1, a = w.assignments.find(x => x.id === 'a10');
      pick('nvq-sp'); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>TA-1 answer: I put the person at the centre of their care.</p>');
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
      ok('TA1-E Amira submits Assignment 1', a.status === 'Submitted');
      const key = keyOf(AM, 'a10'); ok('TA1-E the submission is in James\'s marking queue (key found)', !!key, key);
      TCH('S'); go('t-queue'); ok('TA1-E James\'s queue shows Amira\'s submission to mark', tasSubs(true).some(s => s.key === key && s.toMark));
      ACA(); go('k-staff'); ok('TA1-E Staff Allocations: James has 1 pending marking (the real queue)', staffLoad(ADMIN.staff.find(s => s.name === 'James Pryce')).pending === 1);
      // Wrong personas, by the screen and by direct calls: nothing changes, each is refused
      const snap = () => J([a.status, a.qs.map(q => q.fb.length), r3Judg(key), r3Out(key), relStore(), STORE.tas.drafts[key] || null]);
      const s0 = snap(), x0 = sec(), a0 = aud();
      TCH('T'); go('t-mark', { id: key }); const tPage = main(); ACT.mkRelease({ dataset: { k: key } }); const t1 = !MODAL; closeModal(); ACT.mkMet({ dataset: { k: key, q: a.qs[0].id, v: 'Met' } });
      TCH('O'); go('t-mark', { id: key }); const aPage = main(); ACT.mkRelease({ dataset: { k: key } }); const t2 = !MODAL; closeModal(); ACT.mkMet({ dataset: { k: key, q: a.qs[0].id, v: 'Met' } }); const pubA = ta1Publish(key);
      pick('coord1'); ACT.mkRelease({ dataset: { k: key } }); const t3 = !MODAL; closeModal(); const pubC = ta1Publish(key);
      pick('nvq-sp'); ACT.mkRelease({ dataset: { k: key } }); const t4 = !MODAL; closeModal(); const pubL = ta1Publish(key);
      pick('nvq-fa'); ACT.mkMet({ dataset: { k: key, q: a.qs[0].id, v: 'Met' } });
      ok('TA1-E Marcus (Teacher) and Omar (Teacher + Assessor, not the assignment assessor) can\'t open the marking', /Not part of your role|don't have access/.test(tPage) && /don't have access/.test(aPage));
      ok('TA1-E Teacher, Omar, the Coordinator, Amira and Dev can\'t publish or mark (screens and direct calls): nothing changed', t1 && t2 && t3 && t4 && pubA === false && pubC === false && pubL === false && snap() === s0, snap().slice(0, 200));
      ok('TA1-E each refusal is logged', sec() > x0 && aud() > a0);
      // James marks: Met / Partially Met judgements and comments, saved as a draft first
      TCH('S'); go('t-mark', { id: key });
      const items = markable(tasAsg(tasSubs(true).find(s => s.key === key)));
      items.forEach((q, i) => { ACT.mkMet({ dataset: { k: key, q: q.id, v: 'Met' } }); ACT.mkRag({ dataset: { k: key, q: q.id, v: 'G' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: `TA-1 comment Q${i + 1}: clear link to the person's wishes.` }); INP.mkExit({ dataset: { k: key, q: q.id }, value: 'pass' }); });
      INP.mkField({ dataset: { k: key, f: 'overall' }, value: 'TA-1 overall: well evidenced.' }); ACT.mkSave({ dataset: { k: key } });
      pick('nvq-sp'); go('assignment', { id: 'a10' });
      ok('TA1-E the draft marking stays private: Amira sees none of the comments or judgements', !/TA-1 comment|TA-1 overall/.test(main()) && !/Assessor ·/.test(($1('main .r3-learner') || {}).textContent || '') && a.status === 'Submitted');
      TCH('S'); go('t-mark', { id: key }); ok('TA1-E the workspace button says "Publish feedback to learner"', /Publish feedback to learner/.test(($1('main [data-act="mkRelease"]') || {}).textContent || ''));
      ACT.mkRelease({ dataset: { k: key } });
      ok('TA1-E the confirmation publishes now — no Coordinator release, no read-only wait', MODAL && MODAL.title === 'Publish feedback to the learner?' && MODAL.actions.some(x => x.label === 'Publish to learner') && !/Coordinator releases|Awaiting Coordinator release/.test(MODAL.body) && /No Coordinator release is needed/.test(MODAL.body));
      press();
      ok('TA1-E published by James: status Feedback Received, nothing in the Release queue', a.status === 'Feedback Received' && !relStore()[key] && Object.keys(relStore()).length === 0);
      ok('TA1-E the Assessor\'s criterion judgements are published (Met), attributed to James', r3Judg(key).filter(j => j.role === 'Assessor').length >= items.length && r3Judg(key).filter(j => j.role === 'Assessor').every(j => j.published && j.by === 'James Pryce'));
      ok('TA1-E the comments are on the submission, by James, for this round', items.every((q, i) => q.fb.some(f => f.by === 'James Pryce' && f.text.includes(`TA-1 comment Q${i + 1}`))) && a.overall === 'TA-1 overall: well evidenced.');
      ok('TA1-E the Final outcome is not decided by publishing feedback (declared separately)', !r3Out(key));
      ok('TA1-E audit: "Feedback published to learner" by James', ADMIN.audit.some(x => x.action === 'Feedback published to learner' && x.actor === 'James Pryce'));
      pick('nvq-sp'); go('assignment', { id: 'a10' }); const lp = main();
      ok('TA1-E Amira sees the published judgements and comments at once, with James\'s name', /TA-1 comment Q1/.test(lp) && /James Pryce/.test(lp) && /Assessor · James Pryce/.test(($1('main .r3-learner') || {}).textContent || '') && /Met/.test(($1('main .r3-learner') || {}).textContent || ''));
      ok('TA1-E Amira sees the status "Feedback Received" and is notified', /Feedback Received/.test(lp) && w.notifs.some(n => /Feedback/.test(n.title) && n.go === 'assignment.a10'));
      pick('nvq-fa'); go('assignment', { id: 'a10' }); const dv = main(); go('progress', { tab: 'feedback' });
      ok('TA1-E (isolation) Dev sees nothing of Amira\'s feedback or notification', !/TA-1 comment|TA-1 overall/.test(dv + main()) && !STORE.worlds.CD2.notifs.some(n => /Feedback/.test(n.title)));
      pick('coord1'); go('c-release'); ok('TA1-E the Coordinator\'s Release queue is empty — no approval step', /Nothing waiting for release/.test(main()));
      TCH('S'); ACT.mkRelease({ dataset: { k: key } }); ok('TA1-E publishing again is refused (no new submission)', !MODAL && a.status === 'Feedback Received'); closeModal();
      // The final Pass / Fail by the same Assessor, published at once
      TCH('S'); ACT.r3Declare({ dataset: { k: key } }); $1('input[name="r3-res"][value="Pass"]').checked = true; $1('#d-ofb').value = 'TA-1 final: Pass.'; $1('#rsn').value = 'Meets the brief'; press();
      pick('nvq-sp'); go('assignment', { id: 'a10' });
      ok('TA1-E the final Pass / Fail: published by James, Amira sees it at once', r3Out(key) && r3Out(key).result === 'Pass' && r3Out(key).by === 'James Pryce' && /Pass/.test(($1('main .d-lout') || {}).textContent || ''));
      // Partially Met with a resubmission request: published at once, the window counted from today (Amira, Assignment 2)
      const a2 = w.assignments.find(x => x.id === 'a11'); pick('nvq-sp'); go('assignment', { id: 'a11' }); typeIn('main .paper .rte-body', '<p>TA-1 care plan answer.</p>');
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a11' } }); prim(); ff(16500); }); closeModal();
      const k2 = keyOf(AM, 'a11'); TCH('S'); go('t-mark', { id: k2 });
      markable(tasAsg(tasSubs(true).find(s => s.key === k2))).forEach(q => { ACT.mkMet({ dataset: { k: k2, q: q.id, v: 'Partially Met' } }); ACT.mkRag({ dataset: { k: k2, q: q.id, v: 'A' } }); INP.mkField({ dataset: { k: k2, q: q.id, f: 'fb' }, value: 'TA-1 partly there: add how the person agreed the plan.' }); INP.mkExit({ dataset: { k: k2, q: q.id }, value: 'resub' }); INP.mkField({ dataset: { k: k2, q: q.id, f: 'corrections' }, value: 'Show the person agreeing the plan.' }); INP.mkField({ dataset: { k: k2, q: q.id, f: 'days' }, value: '7' }); });
      ACT.mkRelease({ dataset: { k: k2 } }); ok('TA1-E (Partially Met) the confirmation counts the resubmission window from today', MODAL && /due 7 days from today/.test(MODAL.body)); press();
      const due = new Date(Date.parse(now().toISOString().slice(0, 10)) + 7 * DAY).toISOString().slice(0, 10);
      ok('TA1-E (Partially Met) published at once: Resubmission Required, due 7 days from publication', a2.status === 'Resubmission Required' && String(a2.resubDue || '').slice(0, 10) === due && r3Judg(k2).some(j => j.role === 'Assessor' && j.value === 'Partially Met' && j.published), J([a2.status, a2.resubDue, due]));
      pick('nvq-sp'); go('assignment', { id: 'a11' }); ok('TA1-E (Partially Met) Amira sees "Partially Met", the comment and the resubmission request', /Partially Met/.test(($1('main .r3-learner') || {}).textContent || '') && /TA-1 partly there/.test(main()) && /Resubmission Required/.test(main()));
      // Coordinator feedback stays separate and attributed (Dev, by his Coordinator)
      const dvA = STORE.worlds.CD2.assignments.find(x => x.id === 'a10'); pick('nvq-fa'); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>TA-1 Dev answer.</p>');
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
      const dk = keyOf(DV, 'a10'); pick('coord2'); go('c-sub', { id: dk }); $1('#r3-cv-' + dvA.qs[0].id).value = 'Met'; $1('#r3-ct-' + dvA.qs[0].id).value = 'TA-1 coordinator note for Dev.'; ACT.r3CooJudge({ dataset: { k: dk, q: dvA.qs[0].id } });
      pick('nvq-fa'); go('assignment', { id: 'a10' });
      ok('TA1-E Coordinator feedback is published separately, attributed to the Coordinator (not the Assessor)', /TA-1 coordinator note for Dev/.test(main()) && r3Judg(dk).some(j => j.role !== 'Assessor' && j.by === mcOf(DV, cdBatch())) && !r3Judg(dk).some(j => j.role === 'Assessor'));
      pick('nvq-sp'); go('assignment', { id: 'a10' }); ok('TA1-E (isolation) Amira doesn\'t see Dev\'s Coordinator note', !/TA-1 coordinator note/.test(main()));
      ok('TA1-E the feedback is keyed to Amira\'s enrolment and this assignment only', key !== dk && r3Judg(key).every(j => j.aid === 'a10') && !r3Judg(dk).some(j => j.by === 'James Pryce' && j.role === 'Assessor'));
      SS.setItem('ft-ta1.key', key);
    });

    /* ---------- A Release-queue item sent before TA-1: kept, never published by the new path ---------- */
    await T('TA1-I pre-TA-1 Release queue item', async () => {
      const dvA = STORE.worlds.CD2.assignments.find(x => x.id === 'a10'), dk = keyOf(DV, 'a10'), wD = STORE.worlds.CD2;
      TCH('S'); const s = tasSubs(true).find(x => x.key === dk), d = dft(dk);
      markable(tasAsg(s)).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'TA-1 queued feedback for Dev.', met: 'Met' }; });
      sendForRelease(s, tasAsg(s), d); // as the old "Send to Coordinator for release" did
      const P0 = J(relStore()[dk]), n0 = wD.notifs.length;
      ok('TA1-I setup: one item waits in the Release queue; Dev\'s assignment is still Submitted', !!relStore()[dk] && Object.keys(relStore()).filter(k => k === dk).length === 1 && dvA.status === 'Submitted');
      TCH('S'); go('t-mark', { id: dk }); ok('TA1-I James\'s workspace says it awaits the Coordinator\'s release', /Awaiting Coordinator release/.test(main()));
      const x0 = aud(); ACT.mkRelease({ dataset: { k: dk } }); const m = !!MODAL; closeModal(); const r = ta1Publish(dk);
      ok('TA1-I the new Publish path refuses it (no dialog, nothing published), and says it is released from the queue', !m && r === false && ADMIN.audit.slice(0, aud() - x0).some(a => /Blocked: publish feedback/.test(a.action) && /Release queue/.test(a.reason)));
      ok('TA1-I …the queue item is unchanged, not duplicated, and Dev sees nothing of it', J(relStore()[dk]) === P0 && Object.keys(relStore()).length === 1 && dvA.status === 'Submitted' && wD.notifs.length === n0 && (pick('nvq-fa'), go('assignment', { id: 'a10' }), !/TA-1 queued feedback/.test(main())));
      SS.setItem('ft-ta1.queued', J({ dk, P0, n0 }));
    });

    // State that must come back after the refresh
    const keep = { zid, teach: cdBatch().teachers.slice(), ov: J(STORE.chAssessOv[SAM] || null), dual: ids('O'), james: ids('S'), marcus: ids('T') };
    render(); SS.setItem('ft-ta1.keep', J(keep));
    next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-ta1.keep') || '{}'), key = SS.getItem('ft-ta1.key');
    await T('TA1-F refresh', async () => {
      ok('TA1-F after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('TA1-F allocations come back: Teachers and Sam\'s PD override', J(cdBatch().teachers) === J(keep.teach) && J(STORE.chAssessOv[SAM] || null) === keep.ov);
      ok('TA1-F each person\'s learners come back from the allocations (Omar, James, Marcus; the new learner included)', J(ids('O')) === J(keep.dual) && J(ids('S')) === J(keep.james) && J(ids('T')) === J(keep.marcus) && ids('S').includes(keep.zid), J([ids('O'), keep.dual]));
      ['T', 'S', 'O'].forEach(v => { const c = counts(v); ok(`TA1-F ${TAS_USERS[v].name} after the refresh: dashboard = My Students = allocations`, agree(c) && c.exp === 5, J(c)); });
      pick('nvq-sp'); go('assignment', { id: 'a10' }); ok('TA1-F Amira still sees James\'s published feedback and the Pass', /TA-1 comment Q1/.test(main()) && /Pass/.test(($1('main .d-lout') || {}).textContent || ''));
    });
    await T('TA1-I pre-TA-1 queue item after the refresh, then released once by the Coordinator', async () => {
      const q = JSON.parse(SS.getItem('ft-ta1.queued') || '{}'), dk = q.dk, wD = STORE.worlds.CD2, dvA = wD.assignments.find(x => x.id === 'a10');
      ok('TA1-I after the refresh the queue item is still there, identical and single', J(relStore()[dk]) === q.P0 && Object.keys(relStore()).length === 1 && dvA.status === 'Submitted');
      pick('coord2'); go('c-release'); ok('TA1-I Dev\'s Coordinator sees exactly that item in the Release queue', DT.crel && DT.crel.rows.length === 1 && DT.crel.rows[0].key === dk);
      const n0 = wD.notifs.filter(n => /Feedback/.test(n.title)).length; ACT.relOne({ dataset: { k: dk } }); press();
      ok('TA1-I the Coordinator releases it: Dev\'s status changes, the queue is empty, James\'s feedback attributed to James', dvA.status === 'Feedback Received' && !relStore()[dk] && dvA.qs.some(qq => qq.fb.some(f => f.by === 'James Pryce' && /TA-1 queued feedback/.test(f.text))), dvA.status);
      ok('TA1-I Dev is notified once; audit names the Coordinator', wD.notifs.filter(n => /Feedback/.test(n.title)).length === n0 + 1 && ADMIN.audit.some(a => a.action === 'Feedback released to learner' && a.actor === mcOf(DV, cdBatch())));
      const n1 = wD.notifs.length; ACT.relOne({ dataset: { k: dk } }); const m = !!MODAL; closeModal();
      ok('TA1-I releasing again does nothing (no dialog, no second notification)', !m && wD.notifs.length === n1);
      pick('nvq-fa'); go('assignment', { id: 'a10' }); ok('TA1-I Dev now sees the released feedback; Amira\'s is not on his page', /TA-1 queued feedback/.test(main()) && !/TA-1 comment Q1/.test(main()));
    });
    await T('TA1-G reset', async () => {
      signOutUI(); ACT.resetDemo();
      const b = cdBatch();
      ok('TA1-G Reset demo restores the demo allocations (Marcus + Omar teach; James assesses; Sam\'s PD → Omar)', J(b.teachers) === J(['Marcus Bell', 'Omar Siddiqui']) && chEff(SAM, 'pd') === 'Omar Siddiqui' && J(chAllocOf(b)) === J({ asg: 'James Pryce', pd: 'James Pryce', obs: 'James Pryce' }));
      ['T', 'S', 'O'].forEach(v => { const c = counts(v); ok(`TA1-G ${TAS_USERS[v].name} after Reset: 4 learners, all counts agree`, agree(c) && c.exp === 4, J(c)); });
      ok('TA1-G nothing published survives Reset', STORE.worlds.CD1.assignments.find(x => x.id === 'a10').status === 'Not Started' && !Object.keys(relStore()).length);
    });

    /* ---------- Legacy fixture ---------- */
    await T('TA1-H legacy', async () => {
      fxLoadLegacy(); S.tas.edge = 'none';
      ok('TA1-H every identity\'s batches are the batches they teach or assess (Marcus: all 5 he teaches; was 1)', Object.values(TAS_USERS).every(u => J([...u.batches].sort()) === J(ADMIN.batches.filter(b => acHolds(b, u.name) || acOvLids(b, u.name).length).map(b => b.code).sort())) && TAS_USERS.T.batches.length === 5, J(TAS_USERS.T.batches));
      const disc = ['A', 'S', 'T', 'W'].map(v => { S.tas.v = v; return [v, tasLearners(true).filter(l => !l.short && l.status === 'Discontinued').length]; });
      ok('TA1-H the legacy data has Discontinued learners in a caseload', disc.some(([, n]) => n > 0), J(disc));
      ['A', 'S', 'T', 'W'].forEach(v => { TCH(v); const d = nDash(), st = nStud(), act = tasLearners().filter(l => l.status !== 'Discontinued').length; ok(`TA1-H ${TAS_USERS[v].name}: dashboard ${d} = My Students ${st} = active allocated learners ${act}`, d === st && st === act, J([d, st, act])); });
      // A batch move: the learner leaves the old batch's staff and reaches the new batch's
      const from = ADMIN.batches.find(b => b.code === 'L2DC-MAR26'), to = ADMIN.batches.find(b => b.code === 'L2DC-JAN27'), e = (from.coh || []).find(x => x.lid && !x.v), lid = e && e.lid;
      ok('TA1-H a synthetic learner of L2DC-MAR26 is in Tom Whitfield\'s list (its Teacher)', !!lid && ids('W').includes(lid));
      to.teachers = ['Marcus Bell']; // test-only target staff (discarded by the next fixture load)
      chDoMove(lid, from, to, 'TA-1 test');
      ok('TA1-H after the move: Marcus (new batch Teacher) sees the learner; Tom (old batch only) does not', ids('T').includes(lid) && !ids('W').includes(lid));
      TCH('W'); const x0 = sec(); go('t-students', { id: lid }); ok('TA1-H Tom is refused on the moved learner (logged)', /don't have access/.test(main()) && sec() === x0 + 1);
      // Direct publication on the legacy data too: Sarah, Leicester Cohort 7's assignment assessor, publishes a live submission
      TCH('A'); const s = tasSubs(true).find(x => x.live && x.toMark), a = s && tasAsg(s), w = s && STORE.worlds[s.L.v];
      ok('TA1-H legacy: Sarah has a live submission to mark', !!s);
      if (s) { const d = dft(s.key), n0 = w.notifs.length; markable(a).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'TA-1 legacy.', met: 'Met' }; });
        ACT.mkRelease({ dataset: { k: s.key } }); press();
        ok('TA1-H legacy: published at once by Sarah — no Release-queue item, the learner notified', !relStore()[s.key] && a.status === 'Feedback Received' && w.notifs.length > n0 && a.qs.some(q => q.fb.some(f => f.by === 'Sarah Okonkwo' && /TA-1 legacy/.test(f.text))), a.status); }
      // Programme isolation: Chloe Hughes on Level 3 (Sarah assesses) and Level 2 (James) shares assignment ID a5 (as AC1-P sets up)
      const CH = 'IA-L-30237', b3 = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'), b2 = ADMIN.batches.find(x => x.code === 'L2DC-MAR26'), Lc = learnerById(CH);
      Lc._enr.push({ id: 'pTA1', title: 'Level 2 Diploma in Care (England)', type: 'NVQ / RQF', status: 'Active', enrolled: D(-30), start: D(-30), end: D(300), progress: 10, version: 'Version 1' });
      b2.coh.push({ lid: CH, flags: [], last: D(-1), att: 80, pd: [], seed: 7, subs: { a5: 'Submitted' } });
      const kOf = v => { TCH(v); const x = tasSubs(true).find(y => y.L.lid === CH && y.a.id === 'a5'); return x && x.key; };
      const kS = kOf('A'), kJ = kOf('S'), stS = (TCH('A'), (tasSubs(true).find(y => y.key === kS) || {}).status), l3 = () => J([STORE.tas.rel[kS] || null, STORE.tas.over[kS] || null, STORE.tas.drafts[kS] || null, r3Judg(kS), r3Out(kS) || null, (TCH('A'), (tasSubs(true).find(y => y.key === kS) || {}).status)]), l30 = l3();
      ok('TA1-H isolation setup: Chloe\'s a5 has a Level 3 record (Sarah) and a separate Level 2 record (James)', acProgsOf(CH).size === 2 && !!kS && !!kJ && kS !== kJ && chEff(CH, 'asg', b3) === 'Sarah Okonkwo' && chEff(CH, 'asg', b2) === 'James Pryce', J({ kS, kJ, stS }));
      if (kS && kJ) {
        TCH('S'); const sJ = tasSubs(true).find(y => y.key === kJ), dJ = dft(kJ); markable(tasAsg(sJ)).forEach(q => { ACT.mkMet({ dataset: { k: kJ, q: q.id, v: 'Met' } }); dJ.items[q.id] = { ...dJ.items[q.id], exit: 'pass', rag: 'G', fb: 'TA-1 Level 2 only.', met: 'Met' }; });
        ACT.mkRelease({ dataset: { k: kJ } }); press();
        const sS = (TCH('A'), tasSubs(true).find(y => y.key === kS));
        ok('TA1-H isolation: James publishes Chloe\'s Level 2 a5 — Level 2 published', !!STORE.tas.rel[kJ] && STORE.tas.rel[kJ].by === 'James Pryce' && r3Judg(kJ).some(j => j.by === 'James Pryce' && j.published));
        ok('TA1-H isolation: Chloe\'s Level 3 a5 record is exactly as before (status, released record, override, draft, judgements, outcome); no James judgement', sS && sS.status === stS && l3() === l30 && !r3Judg(kS).some(j => j.by === 'James Pryce'), J({ st: sS && sS.status, stS }));
        TCH('A'); const x1 = aud(); ACT.mkRelease({ dataset: { k: kJ } }); const mm = !!MODAL; closeModal();
        ok('TA1-H isolation: Sarah (Level 3 assessor) can\'t publish on the Level 2 record', !mm && ADMIN.audit.slice(0, aud() - x1).some(a => /^Blocked/.test(a.action)));
      }
      fxLoadClient();
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-ta1.phase'); SS.removeItem('ft-ta1.R');
})();
