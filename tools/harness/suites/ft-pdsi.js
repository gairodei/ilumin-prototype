// PDS final integrity — client demo (FIXTURE=client; real reload, Reset). (1) IQA: a learner's completed PD outcomes appear as a read-only
// "Professional Discussion outcome" record (version, PD assessor, outcome, session, history) within the IQA's batch allocation only; nothing
// before an outcome exists. (2) Recall: marking queued for Coordinator release without a PD choice is recalled to the Assessor's draft
// (unchanged), the choice is made, it is published; others and released marking are refused. (3) References: a chosen criterion code is
// bound to the learner's pinned version — a draft curriculum edit doesn't move it; an ambiguous, removed or re-pinned reference is refused.
(async function () {
  const SS = window.sessionStorage, K = 'ft-pdsi.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'PDSI test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`), 'sign in ' + p); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length, since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const subm = (p, id) => { pick(p); go('assignment', { id }); $a('main .paper .rte-body').forEach((b, k) => { b.innerHTML = `<p>PDSI answer ${k + 1}.</p>`; INP.rteInput(b); }); fxFast(ff => { ACT.reviewSubmit({ dataset: { id } }); prim(); ff(16500); }); closeModal(); };
  const keyOf = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };
  const codes = tr => J(tr.map(u => [u.code, u.mods.map(m => [m.code, m.los.map(l => l.crit.map(c => c.code))])]));
  const crit = (v, code) => withW(v, () => allCrit()).find(c => c.code === code) || {};
  const AM = 'IA-L-32000', DV = 'IA-L-32001';
  const copy = (v, id) => STORE.worlds[v].assignments.find(x => x.id === id);
  const its = (v, id) => STORE.worlds[v].pd.items.filter(i => i.go === 'assignment.' + id);
  const recs = () => allIqaRecords().map(r => r.id);
  // mark every open answer of a submission: the first "Added to PD" (with a reason), the others passed
  const markPd = key => { const a = tasAsg(r3StaffSub(key)); markable(a).forEach((x, n) => { ACT.mkRag({ dataset: { k: key, q: x.id, v: 'A' } }); INP.mkField({ dataset: { k: key, q: x.id, f: 'fb' }, value: 'PDSI feedback ' + n }); INP.mkExit({ dataset: { k: key, q: x.id }, value: n ? 'pass' : 'pd' }); }); const q0 = markable(a)[0]; INP.mkField({ dataset: { k: key, q: q0.id, f: 'pdReason' }, value: 'PDSI referral' }); return q0; };

  if (PH === 0) {
    let kD10, kA10, kA11, q0D, c0;
    await T('PDSI-0 setup', async () => {
      subm('nvq-fa', 'a10'); subm('nvq-sp', 'a10'); subm('nvq-sp', 'a11'); kD10 = keyOf(DV, 'a10'); kA10 = keyOf(AM, 'a10'); kA11 = keyOf(AM, 'a11');
      ok('PDSI-0 Dev submitted Assignment 1; Amira Assignments 1 and 2', copy('CD2', 'a10').status === 'Submitted' && copy('CD1', 'a10').status === 'Submitted' && copy('CD1', 'a11').status === 'Submitted');
      ok('PDSI-0 no PD outcome record exists before any outcome (nothing invented)', !recs().some(id => /^L-CD\d-pd$/.test(id)));
    });
    await T('PDSI-1 IQA PD outcome records', async () => {
      TCH('S'); q0D = markPd(kD10); c0 = qCrits(q0D)[0]; INP.pdsPick({ checked: true, dataset: { k: kD10, q: q0D.id, c: c0 } }); ACT.mkRelease({ dataset: { k: kD10 } }); press();
      ok('PDSI-1 Dev\'s answer referred to PD (one item, open)', its('CD2', 'a10').length === 1 && its('CD2', 'a10')[0].status === 'Open');
      pick('iqa'); ok('PDSI-1 an open PD item alone makes no IQA PD outcome record', !recs().includes('L-CD2-pd'));
      TCH('S'); ACT.pdOutcome({ dataset: { l: DV } }); const k = $a('#modal-root .card.flat').findIndex(x => x.textContent.includes(c0)); $1(`#modal-root input[name="pdo-${k}"][value="Met"]`).checked = true; $1(`#pdn-${k}`).value = 'PDSI: clear practice example'; $1('#pd-sign').checked = true; press();
      ok('PDSI-1 the PD assessor recorded the outcome (Met, signed off)', its('CD2', 'a10')[0].status === 'Achieved' && !!its('CD2', 'a10')[0].outcome);
      pick('iqa'); const r = recById('L-CD2-pd');
      ok('PDSI-2 IQA now has Dev\'s PD outcome record, in its PD outcomes list', !!r && r.kind === 'pd' && J(r.crit) === J([c0]) && r.exit === 'Met' && r.assessor === 'James Pryce' && !!r.pv, J(r && { crit: r.crit, exit: r.exit, assessor: r.assessor, pv: r.pv, batch: r.batch }));
      go('q-records'); setUi('qrT', 'pd'); render(); ok('PDSI-2 …listed on the IQA records page (PD outcomes)', /Dev Patel/.test(main()) && /Professional Discussion outcome/.test(main()));
      go('q-record', { id: 'L-CD2-pd' }); const t = q('.pds-iqa') ? q('.pds-iqa').textContent : '';
      ok('PDSI-3 the record shows version, allocated PD assessor, assignment, outcome, notes and sign-off — read-only', new RegExp('Version ' + r.pv).test(t) && /James Pryce/.test(t) && /Assignment 1 · Q1/.test(t) && /PDSI: clear practice example/.test(t) && /signed off by James Pryce/.test(t) && !$a('main [data-act^="mk"], main [data-act="pdOutcome"], main [data-act="pdsPick"]').length, t.slice(0, 300));
      // scope: an IQA not allocated to the batch doesn't see it (allocation moved for the check, then restored)
      const me = ADMIN.me.name, rows = iqbRows().filter(x => x.name === me), keep = rows.map(x => x.batch); rows.forEach(x => { x.batch = 'NO-SUCH-BATCH'; });
      const seen = recs().includes('L-CD2-pd'); go('q-record', { id: 'L-CD2-pd' }); const t2 = main(); rows.forEach((x, n) => { x.batch = keep[n]; });
      ok('PDSI-4 outside the IQA\'s batch allocation the record isn\'t listed and can\'t be opened', !seen && !/PD evidence and history/.test(t2), t2.slice(0, 160));
      for (const p of ['nvq-fa', 'coord1']) { pick(p); go('q-record', { id: 'L-CD2-pd' }); ok(`PDSI-4 ${p} doesn't get the IQA record`, !/PD evidence and history/.test(main())); }
    });
    await T('PDSI-5 recall', async () => {
      // (setup) Amira's Assignment 1 marking queued for Coordinator release before direct publication, with an answer added to PD and no choice
      TCH('S'); const qA = markPd(kA10), d = dft(kA10); d.items[qA.id].met = 'Partially Met'; d.items[qA.id].note = 'PDSI note kept'; d.overall = 'PDSI overall kept'; mkSaved(d);
      const cooBefore = J(r3Judg(kA10).filter(j => j.role === 'Academic Coordinator')), snap = J(d);
      relStore()[kA10] = { key: kA10, draft: JSON.parse(J(d)), by: 'James Pryce', tasV: 'S', sentAt: now().toISOString(), offs: {}, learner: 'Amira Shah (demo)', lid: AM, v: 'CD1', batch: 'DEMO-L3-JAN27', batchLabel: 'DEMO-L3-JAN27', aid: 'a10', title: copy('CD1', 'a10').title, round: 'Sub 1', live: true };
      delete STORE.tas.drafts[kA10];
      pick('coord1'); ok('PDSI-5 the Coordinator can\'t release it (no PD choice) and is told the Assessor can recall it', releaseNow(kA10) === false && !!relStore()[kA10]);
      const s0 = sec(); ACT.pdsRecall({ dataset: { k: kA10 } }); closeModal(); ok('PDSI-6 the Coordinator can\'t recall it (refused, security log)', sec() === s0 + 1 && !!relStore()[kA10]);
      pick('nvq-sp'); ACT.pdsRecall({ dataset: { k: kA10 } }); closeModal(); TCH('T'); ACT.pdsRecall({ dataset: { k: kA10 } }); closeModal();
      ok('PDSI-6 the learner and the Teacher can\'t either', sec() === s0 + 3 && !!relStore()[kA10]);
      TCH('S'); go('t-mark', { id: kA10 }); ok('PDSI-7 the Assessor\'s read-only queued page says why it can\'t be released, with "Recall to draft"', !!q('.pds-recall [data-act="pdsRecall"]') && /choose at least one criterion/.test(q('.pds-recall').textContent) && !q('.pds-pick'));
      click(q('.pds-recall [data-act="pdsRecall"]'), 'Recall'); ok('PDSI-7 recall asks for a reason', !!MODAL && /Recall to your draft/.test(MODAL.title)); const a0 = aud(); reason('Choose PD criteria');
      const dr = STORE.tas.drafts[kA10];
      ok('PDSI-8 recalled: off the queue, back in the Assessor\'s draft exactly as sent (feedback, exits, judgement, note, overall, PD reason)', !relStore()[kA10] && J(dr) === snap && copy('CD1', 'a10').status === 'Submitted' && since(a0).some(x => x.action === 'Recalled to draft (PD criteria needed)' && /Choose PD criteria/.test(x.reason)));
      ok('PDSI-8 the Coordinator\'s published feedback is untouched; the Coordinator is told', J(r3Judg(kA10).filter(j => j.role === 'Academic Coordinator')) === cooBefore && STORE.coo.notifs.some(n => /marking recalled/.test(n.t)));
      const a1 = aud(); ACT.mkRelease({ dataset: { k: kA10 } }); closeModal(); ok('PDSI-9 publishing still needs the PD choice', since(a1).some(x => x.action === 'Blocked: publish feedback' && /choose at least one criterion/.test(x.reason)) && copy('CD1', 'a10').status === 'Submitted');
      go('t-mark', { id: kA10 }); S.tas.qi = copy('CD1', 'a10').qs.findIndex(x => x.id === qA.id); render(); click(q(`.pds-pick[data-q="${qA.id}"] input:not([disabled])`), 'choose');
      ACT.mkRelease({ dataset: { k: kA10 } }); press();
      ok('PDSI-9 chosen and published: Feedback Received, the chosen criterion referred, the recalled feedback is what the learner gets', copy('CD1', 'a10').status === 'Feedback Received' && its('CD1', 'a10').length === 1 && copy('CD1', 'a10').qs[0].fb.slice(-1)[0].text === 'PDSI feedback 0' && copy('CD1', 'a10').overall === 'PDSI overall kept');
      const s1 = sec(), a2 = aud(); ACT.pdsRecall({ dataset: { k: kA10 } }); closeModal();
      ok('PDSI-10 once released it can\'t be recalled (refused, logged)', since(a2).some(x => x.action === 'Blocked: recall marking to draft' && /released/.test(x.reason)) && !MODAL);
      // queued marking that has its choice is released by the Coordinator, not recalled
      TCH('S'); const qB = markPd(kA11); INP.pdsPick({ checked: true, dataset: { k: kA11, q: qB.id, c: qCrits(qB)[0] } }); const dB = dft(kA11);
      relStore()[kA11] = { key: kA11, draft: JSON.parse(J(dB)), by: 'James Pryce', tasV: 'S', sentAt: now().toISOString(), offs: {}, learner: 'Amira Shah (demo)', lid: AM, v: 'CD1', batch: 'DEMO-L3-JAN27', batchLabel: 'DEMO-L3-JAN27', aid: 'a11', title: copy('CD1', 'a11').title, round: 'Sub 1', live: true }; delete STORE.tas.drafts[kA11];
      const a3 = aud(); ACT.pdsRecall({ dataset: { k: kA11 } }); closeModal();
      ok('PDSI-11 queued marking with a valid PD choice isn\'t recalled (the Coordinator releases it)', !!relStore()[kA11] && since(a3).some(x => /valid PD criteria/.test(x.reason || '')));
      pick('coord1'); ok('PDSI-11 …and the Coordinator releases it', releaseNow(kA11) === true && copy('CD1', 'a11').status === 'Feedback Received' && its('CD1', 'a11').length === 1);
    });
    await T('PDSI-12 references', async () => {
      // a new submission on Dev's Assignment 2 to choose against
      subm('nvq-fa', 'a11'); const k = keyOf(DV, 'a11'); TCH('S'); const qq = markPd(k), c = qCrits(qq)[0], w = STORE.worlds.CD2, tree0 = J(w.tree);
      INP.pdsPick({ checked: true, dataset: { k, q: qq.id, c } }); const x = dft(k).items[qq.id];
      ok('PDSI-12 the choice records the learner\'s pinned version with the code', J(x.pdCrit) === J([c]) && x.pdV === w.nvq.progVersion && x.pdV != null, J([x.pdCrit, x.pdV, w.nvq.progVersion]));
      // an editable curriculum change (a new draft version, the criterion renamed and renumbered there) doesn't move the learner's reference
      pick('aca'); const P = cdPr(); ACT.s3WizVersion({ dataset: { id: P.id } }); reason('PDSI version'); const dv = n5DraftV(P), dt = cbTree(P, dv), dc = dt && dt.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))).find(z => z.code === c);
      if (dc) { dc.code = c + '9'; dc.d = 'Changed in the draft version'; }
      ok('PDSI-13 a draft version edit (code and text changed there) leaves the learner\'s pinned curriculum and the choice as they were', !!dc && J(w.tree) === tree0 && J(dft(k).items[qq.id].pdCrit) === J([c]), J([!!dc, dv]));
      TCH('S'); ok('PDSI-13 …and the choice still resolves to the pinned criterion', !pdsProblems(r3StaffSub(k), tasAsg(r3StaffSub(k)), dft(k)).length);
      // corrupted / migrated data: the pinned criterion code used twice, or missing, or the learner re-pinned to another version
      const lo = w.tree[0].mods[0].los[0], dup = { ...lo.crit.find(z => z.code === c) || lo.crit[0], code: c }; lo.crit.push(dup);
      const p1 = pdsProblems(r3StaffSub(k), tasAsg(r3StaffSub(k)), dft(k)), s0 = sec(); INP.pdsPick({ checked: false, dataset: { k, q: qq.id, c } }); INP.pdsPick({ checked: true, dataset: { k, q: qq.id, c } });
      ok('PDSI-14 an ambiguous reference (the code twice in the learner\'s curriculum) blocks publishing and can\'t be chosen again', p1.some(m => /ambiguous in the learner's programme version \(code used twice\)\) is no longer eligible/.test(m)) && !(dft(k).items[qq.id].pdCrit || []).includes(c), J(p1));
      lo.crit.pop(); INP.pdsPick({ checked: true, dataset: { k, q: qq.id, c } }); const rm = w.tree.flatMap(u => u.mods.flatMap(m => m.los)).find(l => l.crit.some(z => z.code === c)), at = rm.crit.findIndex(z => z.code === c), gone = rm.crit.splice(at, 1)[0];
      const p2 = pdsProblems(r3StaffSub(k), tasAsg(r3StaffSub(k)), dft(k)); S.tas.dirty = false; go('t-mark', { id: k }); S.tas.qi = tasAsg(r3StaffSub(k)).qs.findIndex(z => z.id === qq.id); render();
      ok('PDSI-15 a removed reference (not in the learner\'s pinned curriculum) blocks publishing and is shown as such', p2.some(m => /not in the learner's programme version\) is no longer eligible/.test(m)) && /not in the learner's programme version/.test((q('.pds-pick') || {}).textContent || ''), J(p2));
      rm.crit.splice(at, 0, gone); const v0 = w.nvq.progVersion; w.nvq.progVersion = v0 + 1; const p3 = pdsProblems(r3StaffSub(k), tasAsg(r3StaffSub(k)), dft(k)); w.nvq.progVersion = v0;
      ok('PDSI-16 a learner re-pinned to another version since the choice: blocked, "choose them again" (never redirected)', p3.some(m => /programme version changed since the PD criteria were chosen/.test(m)), J(p3));
      ACT.mkRelease({ dataset: { k } }); press(); const it = its('CD2', 'a11');
      ok('PDSI-17 restored, it publishes; the PD item records the code and the pinned version', copy('CD2', 'a11').status === 'Feedback Received' && it.length === 1 && it[0].ref === c && it[0].pv === v0 && codes(w.tree) === codes(JSON.parse(tree0)), J(it));
      SS.setItem(K + 'k', J([kA10, c0]));
    });
    signOutUI(); return next(1);
  }

  if (PH === 1) {
    await T('PDSI-R refresh and Reset', async () => {
      ok('PDSI-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      pick('iqa'); const r = recById('L-CD2-pd'); go('q-record', { id: 'L-CD2-pd' });
      ok('PDSI-R the IQA PD outcome record is still there with its history', !!r && !!q('.pds-iqa') && /PDSI: clear practice example/.test(q('.pds-iqa').textContent));
      ok('PDSI-R the recalled-and-published marking and its PD item are kept; nothing is queued', its('CD1', 'a10').length === 1 && copy('CD1', 'a10').status === 'Feedback Received' && !Object.keys(relStore()).length);
      ACT.resetDemo(); closeModal(); pick('iqa');
      ok('PDSI-R Reset restores the starting demo: no client PD outcome records', !recs().some(id => /^L-CD\d-pd$/.test(id)) && !its('CD2', 'a10').length);
    });
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'k');
})();
