// CMA follow-up — whole-assessment mapping through the rest of the academic workflow, client demo (suites.sh runs it with
// FIXTURE=client; a real reload, then Reset). Draft "Assignment 3" is switched to whole-assessment mapping (001 1.1, 001 1.2) by clicking
// and published; Dev submits it. The Coordinator saves a draft and publishes criterion feedback (seen by the learner at once, no Assessor
// approval, no outcome); other roles are refused. The Assessor sees it, overrides one judgement, verifies, sends Q1 to PD and releases:
// the open criterion joins the PD checklist once (never the achieved one, never a blank). The question-level path is checked beside it
// (Coordinator feedback and PD on the per-question Assignment 1). Mappings are fixed once learners have submitted, even by direct calls.
(async function () {
  const SS = window.sessionStorage, K = 'ft-cmad.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CMA test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`), 'sign in ' + p); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const typeIn = (sel, html) => { const b = $1(sel); if (!b) throw new Error('missing editor ' + sel); b.innerHTML = html; INP.rteInput(b); };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const sec = () => ADMIN.security.length;
  const crPd = (v = '2026-12-20T21:59') => $a('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const subm = (p, id, html = '<p>CMA answer.</p>') => { pick(p); go('assignment', { id }); typeIn('main .paper .rte-body', html); fxFast(ff => { ACT.reviewSubmit({ dataset: { id } }); prim(); ff(16500); }); closeModal(); };
  const keyFor = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };
  const crit = (v, code) => withW(v, () => allCrit()).find(c => c.code === code) || {};
  const DV = 'IA-L-32001', C1 = '001 1.1', C2 = '001 1.2';
  const copy = (v, id = 'a12') => STORE.worlds[v].assignments.find(x => x.id === id);
  const cooJ = (k, c) => r3Judg(k).filter(j => j.role === 'Academic Coordinator' && j.crit === c);
  const setSel = (sel, v) => { const e = q(sel); if (!e) throw new Error('missing ' + sel); e.value = v; };
  const W2 = () => STORE.worlds.CD2;

  if (PH === 0) {
    let key, k10;
    await T('CMAD-0 setup', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); click(q('details.cbr2-a[data-id="a12"] > summary'), 'open Assignment 3');
      click(q('details.cbr2-a[data-id="a12"] input[data-onchange="cmaMode"][value="assessment"]'), 'Whole assessment'); click(mbtn(/^Change mapping$/), 'confirm');
      click(q(`details.cbr2-a[data-id="a12"] .cbr2-amap input[data-c="${C1}"]`), C1); click(q(`details.cbr2-a[data-id="a12"] .cbr2-amap input[data-c="${C2}"]`), C2);
      click(q('details.cbr2-a[data-id="a12"] [data-act="pubAsg"]'), 'Publish'); crPd(); reason('Publish whole-assessment mapping');
      ok('CMAD-0 Assignment 3 published, mapped as a whole to 001 1.1 and 001 1.2', s2Def('a12').status === 'Published' && J(s2Def('a12').acrit) === J([C1, C2]) && copy('CD2').mapMode === 'assessment');
      subm('nvq-fa', 'a12'); key = keyFor(DV, 'a12');
      ok('CMAD-0 Dev submitted it', copy('CD2').status === 'Submitted' && !!key, J([copy('CD2').status, key]));
      ok('CMAD-0 Dev has a PD checklist (the existing PD workflow)', !!(W2() && W2().pd && Array.isArray(W2().pd.items)));
    });
    await T('CMAD-1 Coordinator feedback', async () => {
      pick('coord1'); go('c-sub', { id: key });
      ok('CMAD-1 the Coordinator gets a criterion panel for each whole-assessment criterion (not per question)', $a('main .cma-coo .r3-crit').map(x => x.dataset.crit).join() === `${C1},${C2}` && !!q('#r3-cv-__asg_0') && !!q('#r3-cv-__asg_1') && !!q('.r3-cq .cma-cp'));
      setSel('#r3-cv-__asg_0', 'Partially Met'); setSel('#r3-ct-__asg_0', 'Add a care-plan example.'); click(q('.cma-coo [data-act="r3CooDraft"][data-q="__asg_0"]'), 'Save draft');
      ok('CMAD-2 a draft is saved for the criterion and is not published', !cooJ(key, C1).length && /Draft saved/.test(q(`.cma-coo .r3-crit[data-crit="${C1}"]`).textContent));
      pick('nvq-fa'); go('assignment', { id: 'a12' });
      ok('CMAD-2 …the learner doesn\'t see the draft', !/Add a care-plan example/.test(main()));
      pick('coord1'); go('c-sub', { id: key }); click(q('.cma-coo [data-act="r3CooJudge"][data-q="__asg_0"]'), 'Publish to learner');
      const j = cooJ(key, C1)[0];
      ok('CMAD-3 published straight away: a Coordinator judgement against the whole assessment (qid __asg), not a question', !!j && j.published && j.qid === '__asg' && j.value === 'Partially Met' && j.role === 'Academic Coordinator' && j.text === 'Add a care-plan example.', J(j));
      ok('CMAD-3 the Coordinator\'s judgement sets no final outcome and doesn\'t change the criterion or the assignment status', !r3Out(key) && crit('CD2', C1).st === 'In Progress' && copy('CD2').status === 'Submitted', J([r3Out(key), crit('CD2', C1).st, copy('CD2').status]));
      pick('nvq-fa'); go('assignment', { id: 'a12' }); const l = main();
      ok('CMAD-4 the learner sees it at once, with no Assessor approval', /Feedback on each criterion/.test(l) && /001 1\.1[^]*Partially Met[^]*Add a care-plan example/.test(l) && !r3Judg(key).some(x => x.role === 'Assessor'));
      pick('coord1'); go('c-sub', { id: key }); setSel('#r3-cv-__asg_1', 'Not Met'); setSel('#r3-ct-__asg_1', 'No supervision example.'); click(q('.cma-coo [data-act="r3CooDraft"][data-q="__asg_1"]'), 'draft 1.2');
      click(q('[data-act="r3CooPubAll"]'), 'Publish all drafts'); ok('CMAD-5 "Publish all drafts" lists the whole-assessment criterion', !!MODAL && /001 1\.2/.test($1('#modal-root').textContent)); press();
      ok('CMAD-5 …and publishes it', cooJ(key, C2).length === 1 && cooJ(key, C2)[0].published && cooJ(key, C2)[0].value === 'Not Met');
    });
    await T('CMAD-6 refusals', async () => {
      const n0 = r3Judg(key).length;
      for (const p of ['aca', 'nvq-fa', 'iqa']) { pick(p); const s0 = sec(); ACT.r3CooJudge({ dataset: { k: key, q: '__asg_0' } }); ok(`CMAD-6 ${p} cannot publish Coordinator criterion feedback — refused and logged`, r3Judg(key).length === n0 && sec() === s0 + 1); }
      TCH('S'); let s0 = sec(); ACT.r3CooJudge({ dataset: { k: key, q: '__asg_0' } }); ok('CMAD-6 the Assessor cannot publish as the Coordinator', r3Judg(key).length === n0 && sec() === s0 + 1);
      TCH('T'); s0 = sec(); ACT.r3CooDraft({ dataset: { k: key, q: '__asg_0' } }); ok('CMAD-6 the Teacher cannot save a Coordinator draft', sec() === s0 + 1);
      // coord2 co-coordinates Dev's batch in the demo (MC); taken off the batch for this check, so the Coordinator is genuinely outside it
      pick('coord2'); const me2 = CME().name, sub = mySubmissions(true).find(x => x.key === key), b = sub && sub.L.batch, keep = b && mcList(b).slice();
      if (b) b.coords = keep.filter(c => c !== me2); const sees = mySubmissions(true).some(x => x.key === key); s0 = sec(); ACT.r3CooJudge({ dataset: { k: key, q: '__asg_0' } }); ACT.r3CooDraft({ dataset: { k: key, q: '__asg_0' } });
      ok('CMAD-6 a Coordinator outside the learner\'s batch can\'t see the submission, publish or save a draft — refused and logged', !!b && !sees && r3Judg(key).length === n0 && sec() === s0 + 2, J([!!b, sees, sec() - s0]));
      if (b) b.coords = keep;
      pick('coord1'); ACT.r3CooJudge({ dataset: { k: key, q: '__asg_7' } }); ACT.r3CooJudge({ dataset: { k: key, q: '__asg' } });
      ok('CMAD-6 a criterion index that isn\'t mapped publishes nothing', r3Judg(key).length === n0);
    });
    await T('CMAD-7 Assessor, override, PD', async () => {
      TCH('S'); go('t-mark', { id: key }); const card = q('.cma-mk');
      ok('CMAD-7 the Assessor sees the Coordinator\'s published judgement beside each criterion, with Override', /Coordinator's published judgement[^]*Partially Met/.test(card.querySelector(`[data-crit="${C1}"]`).textContent) && !!card.querySelector('[data-act="dOverride"][data-q="__asg_0"]'));
      ok('CMAD-7 …and nothing is pre-filled from it (the Assessor\'s judgement is separate)', !((((STORE.tas.drafts[key] || {}).items || {}).__asg || {}).cj || {})[C1]);
      click(card.querySelector('[data-act="dOverride"][data-q="__asg_0"]'), 'Override'); const r = $1('#modal-root input[name="d-ov"][value="Met"]'); r.checked = true; reason('Evidence covers it across Q1');
      const ov = r3Judg(key).find(x => x.override && x.crit === C1);
      ok('CMAD-8 the override is a new Assessor judgement; the Coordinator\'s record is unchanged', !!ov && ov.role === 'Assessor' && ov.qid === '__asg' && ov.value === 'Met' && !ov.published && cooJ(key, C1).length === 1 && cooJ(key, C1)[0].value === 'Partially Met', J(ov));
      go('t-mark', { id: key }); click(q(`.cma-mk [data-act="cmaVerify"][data-c="${C1}"]`), 'verify 1.1'); press();
      click(q(`.cma-mk [data-act="cmaMet"][data-c="${C2}"][data-v="Not Met"]`), 'Not Met 1.2');
      ACT.mkRag({ dataset: { k: key, q: 'q1', v: 'A' } }); INP.mkField({ dataset: { k: key, q: 'q1', f: 'fb' }, value: 'Cover in PD' }); INP.mkExit({ dataset: { k: key, q: 'q1' }, value: 'pd' }); INP.mkField({ dataset: { k: key, q: 'q1', f: 'pdReason' }, value: 'Discuss supervision in the PD' });
      // PDS: the whole assessment's PD criteria are chosen once, in its card — 001 1.1 (verified Met in this marking) can't be chosen
      go('t-mark', { id: key }); const pb = () => q('.cma-mk .pds-pick[data-q="__asg"]');
      ok('CMAD-9 "Added to PD" points to the whole-assessment card, which offers the PD criteria: 001 1.1 excluded (verified Met in this marking), 001 1.2 open', /choose which of its criteria go to the PD under "Whole-assessment criteria"/.test(main()) && !!pb() && pb().querySelector(`input[data-c="${C1}"]`).disabled && /verified Met in this marking/.test(pb().textContent) && !pb().querySelector(`input[data-c="${C2}"]`).disabled);
      click(pb().querySelector(`input[data-c="${C2}"]`), 'PD 1.2');
      const pd0 = W2().pd.items.length; ACT.mkRelease({ dataset: { k: key } }); press();
      const its = W2().pd.items.filter(i => i.go === 'assignment.a12');
      ok('CMAD-10 released: 001 1.1 achieved and locked (the Assessor\'s override, verified); not sent to PD', crit('CD2', C1).st === 'Achieved' && !its.some(i => i.ref === C1), J([crit('CD2', C1).st, its.map(i => i.ref)]));
      ok('CMAD-10 the open criterion 001 1.2 joins the PD checklist once, from the whole assessment (Q1), with the Assessor\'s reason', its.length === 1 && its[0].ref === C2 && /whole assessment \(Q1\)/.test(its[0].from) && its[0].reason === 'Discuss supervision in the PD' && its[0].status === 'Open' && its[0].by === 'James Pryce' && crit('CD2', C2).st === 'Added to PD', J(its));
      ok('CMAD-10 no blank or duplicated PD item is added', W2().pd.items.length === pd0 + 1 && W2().pd.items.every(i => i.ref));
      ok('CMAD-10 no final Pass / Fail is inferred', !r3Out(key) && copy('CD2').status === 'Feedback Received');
      const pub = r3Judg(key).filter(j => j.role === 'Assessor' && j.published).map(j => j.crit + ':' + j.value).sort().join();
      ok('CMAD-10 the Assessor\'s judgements are published on release, the Coordinator\'s kept beside them', pub === `${C1}:Met,${C2}:Not Met` && r3Judg(key).find(j => j.role === "Assessor" && j.crit === C1).override && cooJ(key, C1).length === 1 && cooJ(key, C2).length === 1, pub);
    });
    await T('CMAD-11 PD views', async () => {
      TCH('S'); go('t-mark', { id: key }); ok('CMAD-11 the Assessor\'s PD panel lists 001 1.2 from the whole assessment', $a('main .co1-pd .co1-pd-row').map(x => x.dataset.crit).join() === C2);
      pick('coord1'); go('c-sub', { id: key }); ok('CMAD-11 the Coordinator\'s PD panel lists it too (read-only)', $a('main .co1-pd .co1-pd-row').map(x => x.dataset.crit).join() === C2 && !q('.co1-pd button'));
      pick('nvq-fa'); go('assignment', { id: 'a12' }); ok('CMAD-11 the learner\'s assignment page lists the criterion carried into their PD', $a('main .cma-pd-l [data-crit]').map(x => x.dataset.crit).join() === C2);
      go('progress', { tab: 'pd' }); ok('CMAD-11 …and their PD checklist has it', /001 1\.2[^]*whole assessment \(Q1\)/.test(main()));
      pick('iqa'); go('q-record', { id: 'L-CD2-a12' }); const t = q('.cma-ro') ? q('.cma-ro').textContent : '';
      ok('CMAD-12 IQA sees the Assessor\'s and the Coordinator\'s judgements side by side, read-only', /Assessor:[^]*Met[^]*verified by James Pryce/.test(t) && /Coordinator:[^]*Partially Met/.test(t) && /Coordinator:[^]*Not Met/.test(t) && !q('.cma-ro button'), t.slice(0, 300));
    });
    await T('CMAD-13 question-level beside it', async () => {
      const c10 = copy('CD2', 'a10'); if (c10 && c10.status === 'Not Started') subm('nvq-fa', 'a10'); k10 = keyFor(DV, 'a10'); const a10 = copy('CD2', 'a10'), q1 = a10.qs[0], qc = qCrits(q1);
      ok('CMAD-13 Assignment 1 (per question) has a submission', !!k10 && a10.status !== 'Not Started', J([k10, a10.status]));
      pick('coord1'); go('c-sub', { id: k10 }); setSel(`#r3-cv-${q1.id}`, 'Met'); setSel(`#r3-ct-${q1.id}`, 'Good per-question answer.'); click(q(`.r3-cq [data-act="r3CooJudge"][data-q="${q1.id}"]`), 'publish q1');
      const j = r3Judg(k10).find(x => x.role === 'Academic Coordinator'); ok('CMAD-13 question-level Coordinator feedback still publishes against the question', !!j && j.qid === q1.id && j.crit === qc[0] && j.published && !q('.cma-coo'), J(j));
      if (a10.status === 'Submitted') { TCH('S'); go('t-mark', { id: k10 });
        // PDS: Q1's criterion (001 1.1) was achieved and locked by Assignment 3 above — it can't be referred; a question with an open criterion is
        const sub = tasSubs(true).find(x => x.key === k10), A = tasAsg(sub), its = markable(A), cand = its.find(x => pdsOk(sub, A, dft(k10), x).length) || null;
        INP.mkExit({ dataset: { k: k10, q: q1.id }, value: 'pd' }); go('t-mark', { id: k10 }); S.tas.qi = 0; render();
        const box = q(`.pds-pick[data-q="${q1.id}"]`), s0 = sec(); INP.pdsPick({ checked: true, dataset: { k: k10, q: q1.id, c: C1 } });
        ok('CMAD-13 Q1\'s only criterion is achieved and locked: shown disabled with the reason, and a direct choice is refused', !!box && box.querySelector(`input[data-c="${C1}"]`).disabled && /already achieved and locked/.test(box.textContent) && !(dft(k10).items[q1.id].pdCrit || []).length);
        its.forEach(x => { ACT.mkRag({ dataset: { k: k10, q: x.id, v: 'A' } }); INP.mkField({ dataset: { k: k10, q: x.id, f: 'fb' }, value: 'Noted' }); INP.mkExit({ dataset: { k: k10, q: x.id }, value: x === cand ? 'pd' : 'pass' }); });
        if (cand) { INP.mkField({ dataset: { k: k10, q: cand.id, f: 'pdReason' }, value: 'Per-question PD' }); INP.pdsPick({ checked: true, dataset: { k: k10, q: cand.id, c: pdsOk(sub, A, dft(k10), cand)[0] } }); }
        ok('CMAD-13 the per-question marking page has no whole-assessment card', !q('.cma-mk'));
        ACT.mkRelease({ dataset: { k: k10 } }); press();
        const it = W2().pd.items.find(i => i.go === 'assignment.a10' && i.reason === 'Per-question PD');
        ok('CMAD-13 question-level PD carries the chosen criterion of the referred question (none when every criterion is already achieved)', cand ? !!it && qCrits(cand).includes(it.ref) && new RegExp('· Q' + (A.qs.indexOf(cand) + 1) + '$').test(it.from) : !it && copy('CD2', 'a10').status === 'Feedback Received', J([it, cand && cand.id]));
      } else ok('CMAD-13 (Assignment 1 already marked in this demo — PD path covered by CO-1 suites)', true);
    });
    await T('CMAD-14 historical protection', async () => {
      pick('aca'); const d10 = s2Def('a10'), m0 = J(d10.qs.map(x => x.crit)), cp0 = J(copy('CD2', 'a10').qs.map(x => [x.crit, x.crits])), q0 = d10.qs.find(x => x.status === 'Active'), other = [C1, C2].find(c => !q0.crit.includes(c));
      ok('CMAD-14 Assignment 1 has learner submissions', s2HasSubs(d10));
      go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); setUi('cbr2A.a10', '1'); render();
      ok('CMAD-14 the builder shows its per-question mapping fixed (disabled), with what to do instead', $a('main details.cbr2-a[data-id="a10"] .cbr2-map input[data-onchange="mapChange"]').every(x => x.disabled) && /add a new assessment to this programme[^]*Version [0-9]+, the current version[^]*Create new version/.test(q('details.cbr2-a[data-id="a10"] .cma-subs').textContent));
      const log0 = ADMIN.audit.length; INP.mapChange({ checked: true, dataset: { id: 'a10', q: q0.id, c: other } }); INP.mapChange({ checked: false, dataset: { id: 'a10', q: q0.id, c: q0.crit[0], subs: '' } });
      ok('CMAD-14 direct calls (adding, and removing without the submissions flag) are refused and logged; definition and learner copies unchanged', J(d10.qs.map(x => x.crit)) === m0 && J(copy('CD2', 'a10').qs.map(x => [x.crit, x.crits])) === cp0 && ADMIN.audit.slice(0, ADMIN.audit.length - log0).filter(x => x.action === "Blocked: change a mapping after submissions").length === 2, J(ADMIN.audit.slice(0, 3).map(x => x.action)));
      go('a-assignments', { id: 'a10', tab: 'mapping' }); const bx = $a('main input[data-onchange="mapChange"]');
      ok('CMAD-14 the Assignments page mapping is fixed too', !bx.length || bx.every(x => x.disabled));
      const d12 = s2Def('a12'), a0 = J(d12.acrit); INP.cmaACrit({ checked: false, dataset: { id: 'a12', c: C1 } }); INP.cmaMode({ dataset: { id: 'a12' }, value: 'question' }); closeModal(); ACT.s2Unpublish({ dataset: { id: 'a12' } }); closeModal();
      ok('CMAD-14 the whole assessment\'s criteria, mode and publication stay fixed (direct calls refused)', J(d12.acrit) === a0 && asgWhole(d12) && d12.status === 'Published' && J(copy('CD2').acrit) === a0);
    });
    SS.setItem(K + 'key', key || ''); signOutUI(); return next(1);
  }

  if (PH === 1) {
    const key = SS.getItem(K + 'key');
    await T('CMAD-R refresh', async () => {
      ok('CMAD-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('CMAD-R Coordinator and Assessor judgements, the override and the PD item are kept', cooJ(key, C1).length === 1 && cooJ(key, C2).length === 1 && r3Judg(key).some(j => j.override && j.crit === C1) && W2().pd.items.filter(i => i.go === 'assignment.a12').map(i => i.ref).join() === C2 && crit('CD2', C2).st === 'Added to PD');
      pick('nvq-fa'); go('assignment', { id: 'a12' }); ok('CMAD-R the learner still sees the Coordinator\'s feedback and the PD criterion', /Partially Met/.test(main()) && !!q('.cma-pd-l'));
      ACT.resetDemo(); closeModal();
      ok('CMAD-R Reset restores the starting demo: Assignment 3 is a per-question Draft; no CMA judgements or PD items remain', s2Def('a12').status === 'Draft' && !asgWhole(s2Def('a12')) && !r3Judg(key).length && !STORE.worlds.CD2.pd.items.some(i => i.go === 'assignment.a12'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'key');
})();
