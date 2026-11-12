// CMA stability — "Not submitted yet" on the client demo, with per-question (Assignment 1) and whole-assessment (Assignment 3) mapping.
// Nothing submitted: the Coordinator's review and the Assessor's marking page show "Not submitted yet" — no date, no criterion panels
// (per question or whole assessment), no comment, PD or marking controls; direct calls are refused. Once Dev submits, the normal review
// returns. Other roles and a Coordinator outside the batch are refused. A real reload keeps it; Reset returns the starting demo.
(async function () {
  const SS = window.sessionStorage, K = 'ft-nosubc.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'NOSUB test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
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
  const subm = (p, id, html = '<p>NOSUB answer.</p>') => { pick(p); go('assignment', { id }); typeIn('main .paper .rte-body', html); fxFast(ff => { ACT.reviewSubmit({ dataset: { id } }); prim(); ff(16500); }); closeModal(); };
  const AM = 'IA-L-32000', DV = 'IA-L-32001', C1 = '001 1.1', C2 = '001 1.2';
  const keyOf = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };
  const bare = () => { const t = main(); return /Not submitted yet/.test(t) && !/1970/.test(t) && !q('.r3-coo') && !q('.cma-coo') && !q('.cma-mk') && !q('.cma-ro') && !q('[data-act="cfPost"]') && !q('[data-act^="r3Coo"]') && !q('.co1-pd') && !q('.met-pick') && !q('.paper'); };

  if (PH === 0) {
    let kA12, kA10, kD12;
    await T('NSC-0 setup', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); click(q('details.cbr2-a[data-id="a12"] > summary'), 'open Assignment 3');
      click(q('details.cbr2-a[data-id="a12"] input[data-onchange="cmaMode"][value="assessment"]'), 'Whole assessment'); click(mbtn(/^Change mapping$/), 'confirm');
      click(q(`details.cbr2-a[data-id="a12"] .cbr2-amap input[data-c="${C1}"]`), C1); click(q(`details.cbr2-a[data-id="a12"] .cbr2-amap input[data-c="${C2}"]`), C2);
      click(q('details.cbr2-a[data-id="a12"] [data-act="pubAsg"]'), 'Publish'); crPd(); reason('Publish whole-assessment mapping');
      kA12 = keyOf(AM, 'a12'); kA10 = keyOf(AM, 'a10'); kD12 = keyOf(DV, 'a12');
      ok('NSC-0 Assignment 3 is published as a whole assessment; Assignment 1 is per question; nothing is submitted yet', s2Def('a12').status === 'Published' && asgWhole(s2Def('a12')) && !asgWhole(s2Def('a10')) && !!kA12 && !!kA10 && !!kD12);
    });
    await T('NSC-1 nothing submitted', async () => {
      pick('coord1'); go('c-sub', { id: kA12 }); ok('NSC-1 Coordinator, whole assessment: "Not submitted yet" — no criterion panels, comment or PD', bare(), main().slice(0, 200));
      go('c-sub', { id: kA10 }); ok('NSC-1 Coordinator, per question: "Not submitted yet" — no question panels', bare(), main().slice(0, 200));
      const s0 = sec(), j0 = r3Judg(kA12).length; ACT.r3CooJudge({ dataset: { k: kA12, q: '__asg_0' } }); ACT.cfPost({ dataset: { k: kA12 } }); closeModal();
      ok('NSC-1 criterion feedback and a comment on it are refused by direct call (logged)', r3Judg(kA12).length === j0 && sec() === s0 + 2);
      TCH('S'); go('t-mark', { id: kA12 }); ok('NSC-1 Assessor, whole assessment: "Not submitted yet", no whole-assessment card', bare(), main().slice(0, 200));
      go('t-mark', { id: kA10 }); ok('NSC-1 Assessor, per question: "Not submitted yet"', bare());
      const s1 = sec(); ACT.cmaMet({ dataset: { k: kA12, c: C1, v: 'Met' } }); ok('NSC-1 a whole-assessment judgement on it is refused (logged)', sec() === s1 + 1 && !(((STORE.tas.drafts[kA12] || {}).items || {}).__asg));
    });
    await T('NSC-2 submitted', async () => {
      subm('nvq-fa', 'a12'); pick('coord1'); go('c-sub', { id: kD12 });
      ok('NSC-2 once Dev submits, the Coordinator\'s review returns, with the whole-assessment criteria', !/Not submitted yet/.test(main()) && $a('main .cma-coo .r3-crit').length === 2 && !!q('[data-act="cfPost"]') && !/1970/.test(main()));
      TCH('S'); go('t-mark', { id: kD12 }); ok('NSC-2 …and the Assessor\'s marking page, with the whole-assessment card', !!q('.cma-mk') && !/Not submitted yet/.test(main()));
      pick('coord1'); go('c-sub', { id: kA12 }); ok('NSC-2 Amira (not submitted) still shows "Not submitted yet"', bare());
    });
    await T('NSC-3 unauthorised', async () => {
      pick('coord2'); const me2 = CME().name, s = mySubmissions(true).find(x => x.key === kA12), b = s && s.L.batch, keep = b && mcList(b).slice();
      if (b) b.coords = keep.filter(c => c !== me2); const s0 = sec(); go('c-sub', { id: kA12 }); const t = main(); if (b) b.coords = keep;
      ok('NSC-3 a Coordinator outside the batch doesn\'t get the record — not the review, not "Not submitted yet", not the learner', !/Not submitted yet/.test(t) && !/Amira/.test(t) && !q('[data-act="cfPost"]') && !q('[data-act^="r3Coo"]'), t.slice(0, 160));
      for (const p of ['nvq-fa', 'iqa', 'aca']) { pick(p); go('c-sub', { id: kA12 }); ok(`NSC-3 ${p} opening the Coordinator review gets neither the review nor its controls`, !/Not submitted yet/.test(main()) && !q('[data-act="cfPost"]') && !q('[data-act^="r3Coo"]')); }
      TCH('T'); go('t-mark', { id: kA12 }); ok('NSC-3 a Teacher gets no marking controls on it', !q('.met-pick') && !q('.cma-mk [data-act="cmaMet"]') && !q('[data-act="mkRelease"]'));
    });
    SS.setItem(K + 'keys', J([kA12, kD12])); signOutUI(); return next(1);
  }

  if (PH === 1) {
    const [kA12, kD12] = JSON.parse(SS.getItem(K + 'keys') || '[]');
    await T('NSC-R refresh and Reset', async () => {
      ok('NSC-R after a real reload the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      pick('coord1'); go('c-sub', { id: kA12 }); ok('NSC-R Amira\'s unsubmitted whole assessment still shows "Not submitted yet"', bare());
      go('c-sub', { id: kD12 }); ok('NSC-R Dev\'s submitted one still opens the review', $a('main .cma-coo .r3-crit').length === 2);
      ACT.resetDemo(); closeModal(); pick('coord1'); go('c-sub', { id: kD12 });
      ok('NSC-R after Reset, Assignment 3 is a Draft again: Dev\'s old submission link is denied, without a crash', s2Def('a12').status === 'Draft' && /don't have access/.test(main()), main().slice(0, 160));
      const kR = (mySubmissions(true).find(x => x.L.lid === DV && (synthAsg(x) || {}).id === 'a10') || {}).key; go('c-sub', { id: kR });
      ok('NSC-R …and Dev\'s unsubmitted Assignment 1 shows "Not submitted yet" (no date)', !!kR && bare(), main().slice(0, 200));
    });
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'keys');
})();
