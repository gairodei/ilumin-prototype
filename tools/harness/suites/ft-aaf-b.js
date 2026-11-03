// AA-FINAL Workstream B — batches, staff and sessions (AA-05, AA-06 / D13, AA-07, AA-15, AA-19 / D7 D8 D12, AA-21, g2 Lows).
// suites.sh runs it with FIXTURE=client; phase 1 is a real refresh, then Reset demo, then the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aaf-b.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aaf-b.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-aaf-b.R', J(R)); SS.setItem('ft-aaf-b.phase', String(ph)); location.reload(); };
  const reason = (r = 'AAF-B test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const change = el => { el.dispatchEvent(new Event('change', { bubbles: true })); };
  const sec = () => ADMIN.security.length, lastAud = () => ADMIN.audit[0] || {};
  const lastToast = () => (($a('#toasts .toast').pop() || {}).textContent || '').trim();
  const CB = 'DEMO-L3-JAN27', B = () => ADMIN.batches.find(x => x.code === CB), LENA = 'IA-L-32002';
  const before = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
  // Wrong roles: the action is refused inside the handler (no dialog) and logged
  const denied = (p, call) => { pick(p); const s0 = sec(), a0 = ADMIN.audit.length; let m = false; try { call(); m = !!MODAL; } finally { closeModal(); } return !m && (sec() > s0 || (ADMIN.audit.length > a0 && /^Blocked/.test(lastAud().action))); };

  if (PH === 0) {
    /* ---------- AA-05 several Academic Coordinators ---------- */
    await T('AAFB-05 Coordinators', async () => {
      const b = B();
      ok('AAFB-05 demo: the client demo batch has two Academic Coordinators', J(mcList(b)) === J(['Dr Helen Carter', 'Michael Osei']), J(mcList(b)));
      pick('aca'); go('a-batches', { id: CB, tab: 'staff' }); click($1(`main [data-act="batchStaff"][data-id="${CB}"]`));
      ok('AAFB-05 Change allocations: no single "Academic Coordinator" replacement select; both Coordinators named; points to the panel', !$1('#modal-root select#bs-c') && $1('#modal-root #bs-c').type === 'hidden' && /Dr Helen Carter, Michael Osei/.test(mtxt()) && /Academic Coordinators panel/.test(mtxt()));
      closeModal(); click($1(`main [data-act="mcAdd"][data-id="${CB}"]`));
      const boxes = $a('#modal-root .aafb-mc-c'); ok('AAFB-05 Add Coordinator is a tick list (not a single select) offering only Coordinators not on the batch', boxes.length >= 1 && !$1('#modal-root select#mc-add') && boxes.every(i => !mcHas(b, i.value)), J(boxes.map(i => i.value)));
      const n0 = mcList(b).length; ok('AAFB-05 (negative) nothing ticked: refused, nothing added', reason() === false && mcList(b).length === n0); closeModal();
      click($1(`main [data-act="mcAdd"][data-id="${CB}"]`)); $1('#modal-root .aafb-mc-c').insertAdjacentHTML('afterend', '<input type="checkbox" class="aafb-mc-c" value="James Pryce" checked>');
      $a('#modal-root .aafb-mc-c').forEach(i => { i.checked = true; }); const s0 = sec();
      ok('AAFB-05 (negative) a crafted non-Coordinator among the ticks: refused before anything is added, logged', reason() === false && mcList(b).length === n0 && /^Blocked: add an Academic Coordinator/.test(lastAud().action), J([lastAud().action, sec() - s0])); closeModal();
      click($1(`main [data-act="mcAdd"][data-id="${CB}"]`)); $a('#modal-root .aafb-mc-c').forEach(i => { i.checked = i.value === 'Laura Kemp'; }); reason('Third Coordinator for the demo');
      ok('AAFB-05 Laura Kemp added: three Coordinators, audited', J(mcList(b)) === J(['Dr Helen Carter', 'Michael Osei', 'Laura Kemp']) && ADMIN.audit.some(a => a.action === 'Academic Coordinator added' && a.after === 'Laura Kemp'));
      ok('AAFB-05 PD-MC-14: every learner still has exactly one designated Coordinator, one of the batch\'s', mcLids(b).length > 0 && mcLids(b).every(l => mcHas(b, mcOf(l, b))));
      ok('AAFB-05 P-33 / CH-17 unchanged: no Coordinator is the batch\'s assessor', !mcList(b).some(c => Object.values(chAllocOf(b)).includes(c)));
      go('a-batches', { id: CB, tab: 'staff' }); ok('AAFB-05 the panel lists three Coordinators with Remove', /Academic Coordinators \(3\)/.test(main()) && $a(`main [data-act="mcRemove"][data-id="${CB}"]`).length === 3);
      for (const p of ['coord1', 'teacher', 'assessor', 'fin']) ok(`AAFB-05 (negative) ${p}: Add Coordinator refused in the handler and logged`, denied(p, () => ACT.mcAdd({ dataset: { id: CB } })));
      ok('AAFB-05 (negative) coord1: Change allocations refused in the handler', denied('coord1', () => ACT.batchStaff({ dataset: { id: CB } })));
      pick('sys'); ACT.mcAdd({ dataset: { id: CB } }); ok('AAFB-05 the System Administrator may manage Coordinators (batch administrator)', !!MODAL); closeModal();
    });

    /* ---------- AA-06 / D13 batch codes ---------- */
    await T('AAFB-06 batch codes', async () => {
      const b = B(); pick('aca'); go('a-batches');
      ok('AAFB-06 demo batch: no awarding body code recorded — shown as "Not recorded", nothing invented', b.abCode == null && /DEMO-L3-JAN27\s*Awarding body batch code: Not recorded/.test(main()), (main().match(/DEMO-L3-JAN27.{0,60}/) || [''])[0]);
      go('a-batches', { id: CB }); ok('AAFB-06 batch detail: Batch code and Awarding body batch code, each explained', /Batch code DEMO-L3-JAN27 · Awarding body batch code: Not recorded/.test(main()) && /the Academy's own identifier/.test(main()) && /the awarding body's own reference/.test(main()));
      click($1(`main [data-act="crAbcEdit"][data-id="${CB}"]`)); $1('#ab-abc').value = 'NCFE-AAFB/01'; reason('Issued by the awarding body');
      ok('AAFB-06 recorded separately: the Academy code is unchanged and still the only identifier', b.abCode === 'NCFE-AAFB/01' && b.code === CB && chBatch(CB) === b && !chBatch('NCFE-AAFB/01'));
      go('a-batches'); ok('AAFB-06 Batches list (Academic Admin) shows both codes', /DEMO-L3-JAN27\s*Awarding body batch code: NCFE-AAFB\/01/.test(main()));
      pick('super'); go('a-batches'); ok('AAFB-06 Batches list (Super Admin) shows both codes', /Awarding body batch code: NCFE-AAFB\/01/.test(main()));
      pick('coord1'); ok('AAFB-06 D13: the demo batch is mixed-mode', !n2ModeOf(b));
      go('c-batches', { id: CB }); ok('AAFB-06 D13 Coordinator overview of the mixed-mode batch: Batch code and Awarding body batch code', /Batch code\s*DEMO-L3-JAN27\s*Awarding body batch code\s*NCFE-AAFB\/01/.test(main()), (main().match(/Intake.{0,160}/) || [''])[0]);
      go('c-batches'); ok('AAFB-06 Coordinator batch list shows the awarding body code', /Awarding body batch code: NCFE-AAFB\/01/.test(main()));
      pick('teacher'); const s0 = sec(); ACT.crAbcEdit({ dataset: { id: CB } }); ok('AAFB-06 (negative) a Teacher cannot record the code', !MODAL && b.abCode === 'NCFE-AAFB/01'); closeModal();
    });

    /* ---------- AA-07 Add learner ---------- */
    await T('AAFB-07 Add learner', async () => {
      const b = B(), e0 = b.enrolled; pick('aca'); go('a-batches', { id: CB, tab: 'roster' }); click($1(`main [data-act="addToBatch"][data-id="${CB}"]`));
      ok('AAFB-07 learner first: search and learner, then eligibility, then fee-option group, then the confirmation', before($1('#modal-root #ab-q'), $1('#modal-root #aafb-ab-e')) && before($1('#modal-root #aafb-ab-e'), $1('#modal-root #r2-ab-o')) && before($1('#modal-root #r2-ab-o'), $1('#modal-root #aafb-ab-s')));
      const sel = $1('#ab-l'); sel.value = 'IA-L-32004'; change(sel);
      ok('AAFB-07 eligibility up front: a learner already in this batch is shown as not addable before pressing Add', /can't be added/.test($1('#aafb-ab-e').textContent) && /Already in DEMO-L3-JAN27/.test($1('#aafb-ab-e').textContent));
      const q = $1('#ab-q'); q.value = 'lena'; INP.abFind(q);
      ok('AAFB-07 search (AA-1) selects Lena; she can be added; the summary names her and says no fee is created', sel.value === LENA && /can be added/.test($1('#aafb-ab-e').textContent) && /Lena Hart \(demo\)/.test($1('#aafb-ab-s').textContent) && /No fee or payment is created here/.test($1('#aafb-ab-s').textContent) && /Not chosen yet/.test($1('#aafb-ab-s').textContent));
      ok('AAFB-07 (negative) no fee-option group chosen: refused, nothing added', prim() === false && b.enrolled === e0);
      const fo = $1('#r2-ab-o'); fo.value = [...fo.options].find(o => /Fully Assisted/.test(o.textContent)).value; change(fo);
      ok('AAFB-07 the summary follows the fee-option group', /Fully Assisted \(demo fee\)/.test($1('#aafb-ab-s').textContent));
      const r = prim(); ok('AAFB-07 Add: Lena joins with the Fully Assisted group recorded; one Coordinator allocated', r !== false && b.enrolled === e0 + 1 && mcLids(b).includes(LENA) && b.r2 && b.r2[LENA] && b.r2[LENA].opt === fo.value && mcHas(b, mcOf(LENA, b)), J([b.enrolled, b.r2 && b.r2[LENA]]));
      ok('AAFB-07 g2 Low: the success toast is not marked "Demo only:" because of the learner\'s "(demo)" name', /Lena Hart \(demo\) added to DEMO-L3-JAN27/.test(lastToast()) && !/^Demo only:/.test(lastToast()), lastToast());
      toast('Statement downloaded (demo).'); ok('AAFB-07 …a real prototype marker still reads "Demo only:"', /^Demo only: Statement downloaded\./.test(lastToast()), lastToast()); closeModal();
      ACT.addToBatch({ dataset: { id: CB } }); $1('#ab-l').value = LENA; change($1('#ab-l')); const fo2 = $1('#r2-ab-o'); fo2.value = fo2.options[1].value;
      ok('AAFB-07 (negative) the same learner again: shown and refused, no duplicate', /Already in DEMO-L3-JAN27/.test($1('#aafb-ab-e').textContent) && prim() === false && b.enrolled === e0 + 1 && mcLids(b).filter(l => l === LENA).length === 1); closeModal();
      go('a-learner', { id: LENA }); ok('AAFB-07 g2 Low: Learner 360 "Current batch" shows the batch from the roster', /Current batch\s*DEMO-L3-JAN27 — DEMO-L3-JAN27 \(batch roster\)/.test(main()), (main().match(/Current batch.{0,60}/) || [''])[0]);
      pick('fin'); go('f-learners'); ok('AAFB-07 g2 Low: Finance shows the roster batch and that no programme fee is recorded', /Lena Hart \(demo\).{0,120}DEMO-L3-JAN27\s*Batch roster — no programme fee recorded/.test(main()), (main().match(/Lena Hart \(demo\).{0,160}/) || [''])[0]);
      for (const p of ['coord1', 'teacher', 'fin']) ok(`AAFB-07 (negative) ${p}: Add learner refused in the handler`, denied(p, () => ACT.addToBatch({ dataset: { id: CB } })));
    });

    /* ---------- AA-15 Add session ---------- */
    await T('AAFB-15 Add session', async () => {
      const b = B(), n0 = s4bSess(CB).length; pick('aca'); ACT.addSession({ dataset: {} });
      ok('AAFB-15 opened without a batch: the Batch field asks for one (nothing preselected)', !!MODAL && $1('#modal-root select#se-b').value === '' && /Batch \(required\)/.test(mtxt()) && /No batch chosen yet/.test(mtxt()));
      $1('#se-n').value = 'AAF-B check-in'; $1('#se-d').value = D(10, '11:00').slice(0, 16); $1('#se-m').value = '60';
      ok('AAFB-15 (negative) saving without a batch is refused', prim() === false && s4bSess(CB).length === n0 && /Choose the batch for this session/.test(mtxt()));
      const sb = $1('#se-b'); sb.value = CB; change(sb);
      ok('AAFB-15 choosing the batch names it in the dialog (line and subtitle)', /Selected batch\s*DEMO-L3-JAN27 · 3 Dec 2026/.test(mtxt()) && /Batch: DEMO-L3-JAN27/.test(mtxt()));
      const og = $1('#modal-root #se-t optgroup'), first = og ? [...og.querySelectorAll('option')].map(o => o.value) : [];
      ok('AAFB-15 the Teacher list starts with the batch\'s teaching staff, dual-role Teacher + Assessor included', /Teaching staff of DEMO-L3-JAN27/.test(og ? og.label : '') && first.includes('Marcus Bell') && first.includes('Omar Siddiqui') && $1('#se-t').value === 'Marcus Bell', J(first));
      $a('#modal-root .r2-g').forEach(x => { x.checked = true; });
      let r = prim(); if (r === false && /Conflict/.test(mtxt())) r = prim();
      ok('AAFB-15 the session is added to the chosen batch', s4bSess(CB).length === n0 + 1 && s4bSess(CB).slice(-1)[0].title === 'AAF-B check-in', mtxt().slice(0, 200));
      pick('sys'); ACT.addSession({ dataset: {} }); ok('AAFB-15 the System Administrator may add sessions and also has to choose the batch', !!MODAL && $1('#modal-root select#se-b').value === ''); closeModal(); pick('aca');
      ACT.addSession({ dataset: { b: CB } }); ok('AAFB-15 from the batch: the dialog names the batch', /Batch: DEMO-L3-JAN27/.test(mtxt()) && /DEMO-L3-JAN27 · 3 Dec 2026/.test(mtxt()));
      $1('#se-n').value = 'AAF-B clash'; $1('#se-d').value = D(10, '11:00').slice(0, 16); $1('#se-m').value = '60'; $1('#se-t').value = 'Marcus Bell'; $a('#modal-root .r2-g').forEach(x => { x.checked = true; });
      ok('AAFB-15 conflict detection kept: the same time asks for a second press', prim() === false && /Conflict/.test(mtxt()) && s4bSess(CB).length === n0 + 1); closeModal();
      for (const p of ['coord1', 'teacher', 'assessor', 'fin']) ok(`AAFB-15 (negative) ${p}: Add session refused in the handler`, denied(p, () => ACT.addSession({ dataset: { b: CB } })));
    });

    /* ---------- AA-19 Staff Allocations ---------- */
    await T('AAFB-19 Staff Allocations', async () => {
      const b = B(); pick('aca'); go('k-staff');
      ok('AAFB-19 the page explains Teacher / Academic Coordinator / Assessor responsibilities', /Who does what on a batch/.test(main()) && /Teacher\s*Runs the batch's classes/.test(main()) && /Academic Coordinator\s*One or more per batch/.test(main()) && /allocated by role on the batch's Assessors panel/.test(main()));
      ok('AAFB-19 D12: no "Re-allocate learners" with fixed legacy names', !$1('main [data-act="kRealloc"]') && !/Oliver Bennett|Chloe Hughes/.test(main()));
      go('k-staff', { tab: 'workload' }); ok('AAFB-19 g2 Low: Workload has no invented "% of target"', !/% of target/.test(main()) && /No workload target is defined/.test(main()));
      go('k-staff', { tab: 'allocs' }); ok('AAFB-19 Allocations shows each batch\'s Teachers, Coordinators and assessors from the batch record', /DEMO-L3-JAN27/.test(main()) && /Marcus Bell, Omar Siddiqui/.test(main()) && /Dr Helen Carter, Michael Osei/.test(main()));
      click($1('main [data-act="kAlloc"]'));
      ok('AAFB-19 D7: Allocate offers a Teacher-to-batch allocation only (no Course / Programme / Learner kinds)', !$1('#modal-root select#ka-k') && $1('#modal-root #ka-k').value === 'Batch' && /Teacher of the batch/.test(mtxt()) && ![...$1('#ka-s').options].some(o => o.value === 'James Pryce'));
      const a0 = STORE.aca.alloc.length, nt = (STORE.tas.notifs || []).length; $1('#ka-k').value = 'Course'; $1('#ka-r').value = 'crafted';
      ok('AAFB-19 D7 (negative) a crafted Course allocation is refused: no row, no notification, logged', prim() === false && STORE.aca.alloc.length === a0 && (STORE.tas.notifs || []).length === nt && /^Blocked: allocation/.test(lastAud().action)); closeModal();
      ACT.kAlloc(); $1('#ka-s').value = 'Omar Siddiqui'; $1('#ka-w').value = [...$1('#ka-w').options].find(o => o.value.startsWith(CB)).value; $1('#ka-r').value = 'x';
      ok('AAFB-19 (negative) someone who already teaches the batch: refused, nothing recorded', prim() === false && STORE.aca.alloc.length === a0 && /already teaches DEMO-L3-JAN27/.test(mtxt())); closeModal();
      const t0 = b.teachers.slice(), as0 = b.assessors.slice(); ACT.kAlloc(); $1('#ka-s').value = 'Sarah Okonkwo'; $1('#ka-w').value = [...$1('#ka-w').options].find(o => o.value.startsWith(CB)).value; $1('#ka-r').value = 'Cover teaching';
      prim(); closeModal();
      ok('AAFB-19 D8: dual-role Sarah Okonkwo (Teacher + Assessor) is allocated as Teacher — not added as an assessor', b.teachers.includes('Sarah Okonkwo') && J(b.assessors) === J(as0) && J(chAllocOf(b)) === J({ asg: 'James Pryce', pd: 'James Pryce', obs: 'James Pryce' }), J([b.teachers, b.assessors]));
      ok('AAFB-19 the allocation is real: Sarah\'s caseload now includes the batch', ta1Load('Sarah Okonkwo').caseload > 0 && ta1Load('Sarah Okonkwo').caseload === ta1Load('Marcus Bell').caseload, J(ta1Load('Sarah Okonkwo')));
      ACT.kAlloc(); const ks = $1('#ka-s'); ks.insertAdjacentHTML('beforeend', '<option>James Pryce</option>'); ks.value = 'James Pryce'; $1('#ka-w').value = [...$1('#ka-w').options].find(o => o.value.startsWith(CB)).value; $1('#ka-r').value = 'x';
      ok('AAFB-19 CH-17 kept: an Assessor-only person (crafted) is sent to the Assessors panel, not allocated', prim() === false && !b.teachers.includes('James Pryce') && /Assessors panel/.test(mtxt())); closeModal();
      b.teachers = t0; syncTasBatches();
      const s0 = J([b.teachers, b.assessors, STORE.tas.removed]); ACT.kRealloc(); ok('AAFB-19 D12: a direct Re-allocate call opens guidance only and changes nothing', !!MODAL && /Nothing is changed from this dialog/.test(mtxt()) && !$1('#modal-root .kr-n')); prim(); closeModal();
      ok('AAFB-19 …nothing changed', J([b.teachers, b.assessors, STORE.tas.removed]) === s0);
      for (const p of ['coord1', 'teacher', 'assessor', 'fin']) ok(`AAFB-19 (negative) ${p}: Allocate refused in the handler`, denied(p, () => ACT.kAlloc()));
      ok('AAFB-19 (negative) teacher: Re-allocate refused in the handler', denied('teacher', () => ACT.kRealloc()));
    });

    /* ---------- AA-21 batch dates ---------- */
    await T('AAFB-21 dates', async () => {
      const b = B(); pick('aca'); go('a-batches', { id: CB }); ok('AAFB-21 batch detail: dates editable until the start', /Start and end dates can be edited until the batch starts \(3 Dec 2026\)/.test(main()));
      ACT.s4bBatchEdit({ dataset: { id: CB } }); ok('AAFB-21 Edit details (before start): the date fields say they are editable until the start', /Editable until the batch starts \(3 Dec 2026\)/.test(mtxt()) && !$1('#bd-s').disabled);
      $1('#bd-e').value = '2027-12-10'; $1('#bd-r').value = 'Longer programme'; prim();
      ok('AAFB-21 end date only: the impact says payment dates don\'t change because the start is unchanged', /payment dates don't change \(the start date is unchanged\)/.test($1('#bd-i').textContent) && !/payment plans don't change/.test($1('#bd-i').textContent)); closeModal();
      ACT.s4bBatchEdit({ dataset: { id: CB } }); $1('#bd-s').value = '2026-12-17'; $1('#bd-r').value = 'Later start'; prim(); const imp = $1('#bd-i').textContent;
      ok('AAFB-21 D-Low: a start-date change no longer says payment plans don\'t change — unpaid payment dates move', /Unpaid payment dates move with the new start date/.test(imp) && !/payment plans don't change/.test(imp) && /unpaid payment dates move with it/.test(imp), imp.slice(0, 300)); closeModal();
      ok('AAFB-21 nothing was saved by previewing', b.start.slice(0, 10) === '2026-12-03');
    });

    signOutUI(); SS.setItem('ft-aaf-b.keep', J({ coords: mcList(B()), abc: B().abCode, lena: mcLids(B()).includes(LENA) })); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-aaf-b.keep') || '{}');
    await T('AAFB-R refresh', async () => {
      ok('AAFB-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('AAFB-R three Coordinators, the awarding body code and Lena\'s place come back', J(mcList(B())) === J(keep.coords) && keep.coords.length === 3 && B().abCode === 'NCFE-AAFB/01' && mcLids(B()).includes(LENA), J([mcList(B()), B().abCode]));
      pick('aca'); go('a-batches'); ok('AAFB-R the list still shows the awarding body code', /Awarding body batch code: NCFE-AAFB\/01/.test(main()));
      go('a-learner', { id: LENA }); ok('AAFB-R Learner 360 still shows the roster batch', /Current batch\s*DEMO-L3-JAN27/.test(main()));
    });
    await T('AAFB-S Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('AAFB-S Reset: two Coordinators, no awarding body code, Lena not in the batch', J(mcList(B())) === J(['Dr Helen Carter', 'Michael Osei']) && B().abCode == null && !mcLids(B()).includes(LENA));
      pick('aca'); go('a-batches'); ok('AAFB-S Reset: the list reads "Not recorded" again', /Awarding body batch code: Not recorded/.test(main()));
    });
    await T('AAFB-L legacy', async () => {
      fxLoadLegacy(); signOutUI(); S.portal = 'admin'; acaEnter('KA'); S.signedIn = true; S.ui = {};
      const b = ADMIN.batches.find(x => x.code === 'L3AC-NOV26');
      ok('AAFB-L a single-Coordinator legacy batch', mcList(b).length === 1, J(mcList(b)));
      ACT.batchStaff({ dataset: { id: b.code } }); ok('AAFB-L AA-05 Change allocations: no replacement select on a single-Coordinator batch either', !$1('#modal-root select#bs-c') && /Academic Coordinators panel/.test(mtxt())); closeModal();
      ACT.mcAdd({ dataset: { id: b.code } }); const two = $a('#modal-root .aafb-mc-c').map(i => i.value).filter(n => !Object.values(chAllocOf(b)).includes(n) && !chRoleOn(b, n)).slice(0, 2);
      $a('#modal-root .aafb-mc-c').forEach(i => { i.checked = two.includes(i.value); }); reason('Shared cohort');
      ok('AAFB-L AA-05 two Coordinators added in one action', two.length === 2 && mcList(b).length === 3 && two.every(n => mcHas(b, n)), J([two, mcList(b)]));
      ok('AAFB-L every learner keeps one designated Coordinator', mcLids(b).every(l => mcHas(b, mcOf(l, b))));
      const nb = ADMIN.batches.find(x => ['Open', 'Planned'].includes(x.status) && !(typeof w1L3 === 'function' && w1L3(x)) && S4B_LIVE(x) && !(crShowReady(x) && !crReadyAny(x)));
      if (nb) {
        const l = ADMIN.learners.find(x => x.acct === 'Active' && x.rec === 'Active' && !ADMIN.batches.some(y => batchRoster(y).some(r => r[1] === x.id)) && !eEligWhy(nb, x.id));
        const add = () => { ACT.addToBatch({ dataset: { id: nb.code } }); if (!MODAL) return 'no dialog'; $1('#ab-l').value = l.id; change($1('#ab-l')); const r = prim(); closeModal(); return r; };
        const r1 = add(), n1 = batchRoster(nb).filter(r => r[1] === l.id).length, r2 = add(), n2 = batchRoster(nb).filter(r => r[1] === l.id).length;
        ok('AAFB-L AA-07 a non-Level-3 batch: the same learner is never added twice', r1 !== false && n1 === 1 && r2 === false && n2 === 1 && /already in this batch/.test(lastAud().action), J([nb.code, l && l.id, r1, n1, r2, n2]));
      } else ok('AAFB-L a non-Level-3 open batch exists', false);
      ACT.addSession({ dataset: { b: 'L3AC-JAN26' } }); const og = $1('#modal-root #se-t optgroup');
      ok('AAFB-L AA-15 legacy batch: the Teacher list starts with its own teaching staff; other teachers listed as cover', !!og && /Teaching staff of L3AC-JAN26/.test(og.label) && /cover/.test(($a('#modal-root #se-t optgroup')[1] || {}).label || ''));
      closeModal(); go('k-staff', { tab: 'workload' }); ok('AAFB-L no "% of target" in the legacy fixture either', !/% of target/.test(main()));
      const run = ADMIN.batches.find(x => x.status === 'In Progress' && S4B_LIVE(x)); go('a-batches', { id: run.code });
      ok('AAFB-L AA-21 a started batch: the detail says its dates are locked', /Dates locked: the batch started on/.test(main()));
      ACT.s4bBatchEdit({ dataset: { id: run.code } }); ok('AAFB-L AA-21 Edit details after the start: dates disabled, and the dialog explains why (no running-batch extension)', $1('#bd-s').disabled && $1('#bd-e').disabled && /start and end dates are locked/.test(mtxt()) && /Extending or shortening a running batch isn.t available/.test(mtxt()));
      const st = run.start, en = run.end; $1('#bd-e').disabled = false; $1('#bd-e').value = '2031-01-31'; $1('#bd-d').value = 'AAF-B tamper'; $1('#bd-r').value = 'x'; prim(); prim(); closeModal();
      ok('AAFB-L AA-21 (negative) a re-enabled end date field still does not move a started batch', run.start === st && run.end === en);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aaf-b.phase'); SS.removeItem('ft-aaf-b.R');
})();
