// CMA — whole-assessment mapping end to end on the client demo (suites.sh runs it with FIXTURE=client; a real reload of the saved demo).
// The Academic Admin switches Draft "Assignment 3" (Q1 mapped per question) to whole-assessment mapping by clicking (confirmation
// listing the mapping), ticks two criteria and publishes; learners get the criteria (not the answer key); Dev submits; the allocated
// Assessor judges each criterion once (other roles refused); release applies only those judgements; no final outcome is inferred;
// the Coordinator, IQA and the learner see the judgements; existing published per-question assessments are untouched; reload.
(async function () {
  const SS = window.sessionStorage, K = 'ft-cmac.', PH = +(SS.getItem(K + 'phase') || 0);
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
  const DV = 'IA-L-32001', C1 = '001 1.1', C2 = '001 1.2', OBS = '001 2.1';
  const copy = v => STORE.worlds[v].assignments.find(x => x.id === 'a12');

  if (PH === 0) {
    let key, pub0;
    await T('CMAC-1 switch and map', async () => {
      pick('aca'); pub0 = J(['a10', 'a11'].map(id => s2Def(id).qs.map(x => x.crit)));
      go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); click(q('details.cbr2-a[data-id="a12"] > summary'), 'open Assignment 3');
      ok('CMAC-1 Draft Assignment 3 is mapped per question (Q1 → 001 1.2), with the mode choice', J(s2Def('a12').qs[0].crit) === J([C2]) && !!q('details.cbr2-a[data-id="a12"] input[data-onchange="cmaMode"][value="question"]:checked'));
      click(q('details.cbr2-a[data-id="a12"] input[data-onchange="cmaMode"][value="assessment"]'), 'Whole assessment');
      ok('CMAC-2 the switch lists the existing mapping and asks', !!MODAL && /Q1: 001 1\.2/.test($1('#modal-root').textContent)); click(mbtn(/^Change mapping$/), 'confirm');
      const d = s2Def('a12'); ok('CMAC-2 …confirmed: whole assessment, Q1 no longer mapped (not converted)', asgWhole(d) && !d.qs[0].crit.length && J(d.acrit) === J([]));
      const offered = $a('main details.cbr2-a[data-id="a12"] .cbr2-amap input[data-onchange="cmaACrit"]').map(x => x.dataset.c);
      ok('CMAC-3 the unit\'s knowledge criteria are offered, not the observation criterion', J(offered) === J([C1, C2]) && !offered.includes(OBS), J(offered));
      click(q(`details.cbr2-a[data-id="a12"] .cbr2-amap input[data-c="${C1}"]`), C1); click(q(`details.cbr2-a[data-id="a12"] .cbr2-amap input[data-c="${C2}"]`), C2);
      ok('CMAC-3 whole assessment → two criteria', J(s2Def('a12').acrit) === J([C1, C2]));
      const ta = q('details.cbr2-a[data-id="a12"] textarea[data-onchange="cbr2Key"]'); ta.value = 'CMA confidential model answer'; ta.dispatchEvent(new Event('change', { bubbles: true }));
      click(q('details.cbr2-a[data-id="a12"] [data-act="pubAsg"]'), 'Publish'); crPd(); reason('Publish whole-assessment mapping');
      ok('CMAC-4 published', s2Def('a12').status === 'Published' && s2Def('a12').copies.length >= 1, J([s2Def('a12').status, s2Def('a12').copies]));
      const c = copy('CD2'); ok('CMAC-4 the learner copy carries the whole-assessment criteria; its question has none; no answer key', c && c.mapMode === 'assessment' && J(c.acrit) === J([C1, C2]) && J(c.crit.map(x => x[0])) === J([C1, C2]) && c.qs[0].crit === '' && J(c.qs[0].crits) === J([]) && !/confidential model answer/.test(J(c)), c && J([c.mapMode, c.acrit, c.qs[0].crit]));
      go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); setUi('cbr2A.a12', '1'); render();
      ok('CMAC-5 published: mode and criteria read-only', $a('main details.cbr2-a[data-id="a12"] input[data-onchange="cmaMode"], main details.cbr2-a[data-id="a12"] .cbr2-amap input').every(x => x.disabled));
      ok('CMAC-6 existing published per-question assessments are untouched', J(['a10', 'a11'].map(id => s2Def(id).qs.map(x => x.crit))) === pub0 && !asgWhole(s2Def('a10')) && !asgWhole(s2Def('a11')));
    });
    await T('CMAC-7 learner', async () => {
      pick('nvq-fa'); go('assignment', { id: 'a12' }); const t = main();
      ok('CMAC-7 the learner sees the criteria the assignment covers and that Q1 is assessed with the whole assignment — never the answer key', /001 1\.1/.test(t) && /001 1\.2/.test(t) && /Assessed with the whole assignment/.test(t) && !/confidential model answer/.test(t));
      subm('nvq-fa', 'a12'); key = keyFor(DV, 'a12');
      ok('CMAC-7 submitted: both criteria In Progress', copy('CD2').status === 'Submitted' && crit('CD2', C1).st === 'In Progress' && crit('CD2', C2).st === 'In Progress', J([copy('CD2').status, crit('CD2', C1).st, crit('CD2', C2).st]));
    });
    await T('CMAC-8 Assessor marking', async () => {
      TCH('S'); go('t-mark', { id: key }); const t = main();
      ok('CMAC-8 the Assessor sees "Whole-assessment criteria" with Met / Partially Met / Not Met for each, and no per-question criterion decision', !!q('.cma-mk') && $a('main .cma-mk [data-act="cmaMet"]').map(b => b.dataset.c + ':' + b.dataset.v).join() === `${C1}:Met,${C1}:Partially Met,${C1}:Not Met,${C2}:Met,${C2}:Partially Met,${C2}:Not Met` && !/<h3>Criterion decision/.test(q('.mk-grid').innerHTML) && /mapped as a whole/.test(t));
      ok('CMAC-8 the brief pane lists the whole-assessment criteria', /Mapped as a whole assessment/.test(q('.cma-crits').textContent));
      const slot = () => (((STORE.tas.drafts[key] || {}).items || {}).__asg || {}).cj;
      for (const p of ['coord1', 'aca', 'nvq-fa']) { pick(p); const s0 = sec(); try { ACT.cmaMet({ dataset: { k: key, c: C1, v: 'Met' } }); INP.cmaNote({ dataset: { k: key, c: C1 }, value: 'rogue' }); } catch (e) { /* refused */ } ok(`CMAC-9 ${p} cannot judge a whole-assessment criterion — refused and logged`, !slot() && sec() >= s0 + 1, J([slot(), sec() - s0])); }
      TCH('T'); const s1 = sec(); ACT.cmaMet({ dataset: { k: key, c: C1, v: 'Met' } }); ok('CMAC-9 the Teacher cannot judge it', !slot() && sec() === s1 + 1);
      TCH('S'); ACT.cmaMet({ dataset: { k: key, c: OBS, v: 'Met' } }); ok('CMAC-9 a criterion not mapped to the assessment is refused', !slot() && !r3Judg(key).some(j => j.crit === OBS));
      go('t-mark', { id: key }); ACT.mkRag({ dataset: { k: key, q: 'q1', v: 'G' } }); INP.mkField({ dataset: { k: key, q: 'q1', f: 'fb' }, value: 'Clear answer' }); INP.mkExit({ dataset: { k: key, q: 'q1' }, value: 'pass' });
      go('t-mark', { id: key }); ok('CMAC-10 unjudged whole-assessment criteria are pointed out before sending', /Whole assessment: criterion 001 1\.1 has no judgement yet/.test(main()) && /Whole assessment: criterion 001 1\.2 has no judgement yet/.test(main()));
      click(q(`.cma-mk [data-act="cmaMet"][data-c="${C1}"][data-v="Met"]`), 'Met 1.1'); click(q(`.cma-mk [data-act="cmaVerify"][data-c="${C1}"]`), 'verify 1.1'); press();
      click(q(`.cma-mk [data-act="cmaMet"][data-c="${C2}"][data-v="Not Met"]`), 'Not Met 1.2'); const n = q(`.cma-mk input[data-oninput="cmaNote"][data-c="${C2}"]`); n.value = 'Care-plan step missing'; n.dispatchEvent(new Event('input', { bubbles: true }));
      ok('CMAC-10 judgements recorded once per criterion for the whole assessment (qid __asg), no question judgement invented', J(Object.keys(slot())) === J([C1, C2]) && slot()[C1].verified && slot()[C2].met === 'Not Met' && !(dft(key).items.q1 || {}).met && r3Judg(key).filter(j => j.qid === '__asg').map(j => j.crit + ':' + j.value).join() === `${C1}:Met,${C2}:Not Met`);
      ACT.mkRelease({ dataset: { k: key } }); press();
      const c = copy('CD2'), pub = r3Judg(key).filter(j => j.role === 'Assessor' && j.published && j.qid === '__asg').map(j => j.crit + ':' + j.value);
      ok('CMAC-11 released: 001 1.1 Achieved and locked by the Assessor, 001 1.2 Action Required, both judgements published', crit('CD2', C1).st === 'Achieved' && (crit('CD2', C1).lock || {}).by === 'James Pryce' && crit('CD2', C2).st === 'Action Required' && pub.join() === `${C1}:Met,${C2}:Not Met` && c.acj[C1].verified && c.acj[C2].met === 'Not Met', J([crit('CD2', C1).st, crit('CD2', C2).st, pub, c.acj]));
      ok('CMAC-11 the question\'s own exit decided the status; no final Pass / Fail is inferred', c.status === 'Feedback Received' && !r3Out(key), J([c.status, r3Out(key)]));
      ok('CMAC-11 Amira\'s (CD1) criteria are untouched', crit('CD1', C1).st !== 'Achieved');
    });
    await T('CMAC-12 Coordinator, IQA and learner views', async () => {
      pick('coord1'); go('c-sub', { id: key }); const t = main();
      ok('CMAC-12 the Coordinator\'s review shows each whole-assessment criterion with the Assessor\'s published judgement (and the Coordinator\'s own form)', $a('main .cma-coo .r3-crit').map(x => x.dataset.crit).join() === `${C1},${C2}` && /Met[^]*Assessor · James Pryce/.test(q(`.cma-coo .r3-crit[data-crit="${C1}"] .r3-pub`).textContent) && /Not Met[^]*Assessor · James Pryce/.test(q(`.cma-coo .r3-crit[data-crit="${C2}"] .r3-pub`).textContent) && !!q('.cma-coo [data-act="r3CooJudge"]') && /Assessed with the whole assignment/.test(t));
      pick('iqa'); go('q-record', { id: 'L-CD2-a12' }); const u = main();
      ok('CMAC-13 IQA: the record shows the whole-assessment criteria with judgements and verification', !!q('.cma-ro') && /Care-plan step missing/.test(q('.cma-ro').textContent) && /verified by James Pryce/.test(q('.cma-ro').textContent), (u.match(/Whole-assessment criteria.{0,200}/) || [''])[0]);
      pick('nvq-fa'); go('assignment', { id: 'a12' }); const l = main();
      ok('CMAC-14 the learner sees the released judgement for each criterion, never the answer key', /Feedback on each criterion/.test(l) && /001 1\.1[^]*Met/.test(l) && /001 1\.2[^]*Not Met/.test(l) && !/confidential model answer/.test(l));
    });
    SS.setItem(K + 'key', key || ''); signOutUI(); return next(1);
  }

  if (PH === 1) {
    const key = SS.getItem(K + 'key');
    await T('CMAC-R refresh', async () => {
      ok('CMAC-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      const d = s2Def('a12'), c = copy('CD2');
      ok('CMAC-R the definition keeps its whole-assessment mapping and version', asgWhole(d) && J(d.acrit) === J([C1, C2]) && d.status === 'Published' && !d.qs[0].crit.length);
      ok('CMAC-R the learner copy keeps its criteria and released judgements', c.mapMode === 'assessment' && J(c.acrit) === J([C1, C2]) && c.acj[C1].met === 'Met' && crit('CD2', C1).st === 'Achieved' && crit('CD2', C2).st === 'Action Required');
      ok('CMAC-R the judgement history is kept', r3Judg(key).filter(j => j.qid === '__asg' && j.published).length === 2);
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); setUi('cbr2A.a12', '1'); render();
      ok('CMAC-R the builder shows it as whole assessment, read-only', !!q('details.cbr2-a[data-id="a12"] input[data-onchange="cmaMode"][value="assessment"]:checked:disabled') && $a('main details.cbr2-a[data-id="a12"] .cbr2-amap input:checked').length === 2);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'key');
})();
