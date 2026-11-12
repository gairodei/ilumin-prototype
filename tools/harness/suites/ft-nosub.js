// CMA stability — a submission row with nothing submitted, legacy test data (a live learner record and a recorded learner without one).
// The Coordinator's review and the Assessor's marking page open on "Not submitted yet": no date formatted or invented (was a crash, or
// "1 Jan 1970"), no answers, criterion feedback, comment, PD panel or marking controls. Direct calls (comment, criterion feedback,
// marking, release, outcome) are refused and logged. Submitted and resubmitted reviews are unchanged. A real reload keeps all of it.
(async function () {
  const SS = window.sessionStorage, K = 'ft-nosub.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const COO = v => { closeModal(); S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TCH = v => { closeModal(); S.tas.dirty = false; S.tas.v = v; tasEnter(); S.signedIn = true; };
  const sec = () => ADMIN.security.length;
  const tick = () => new Promise(r => setTimeout(r, 40));
  // the "Not submitted yet" page and nothing a submission would add
  const bare = () => { const t = main(); return /Not submitted yet/.test(t) && !/1970/.test(t) && !q('.r3-coo') && !q('[data-act="cfPost"]') && !q('[data-act^="r3Coo"]') && !q('.co1-pd') && !q('.cma-coo') && !q('.met-pick') && !q('[data-act="mkRelease"]') && !q('.paper'); };

  const run = async (tag) => {
    let live, rec, sub, resub, mk;
    await T(tag + '-1 Coordinator, nothing submitted', async () => {
      COO('A'); const rows = mySubmissions(true); live = rows.find(s => s.live && !s.at); rec = rows.find(s => !s.live && !s.at);
      sub = rows.find(s => s.live && s.at && s.status !== 'Not Started'); resub = rows.find(s => s.at && /Resub [1-9]/.test(s.round || ''));
      ok(`${tag}-1 there are unsubmitted rows with and without a learner record, a submitted one and a resubmitted one`, !!live && !!rec && !!sub && !!resub, J([live && live.key, rec && rec.key, sub && sub.key, resub && resub.key]));
      location.hash = '#c-sub.' + live.key; await tick(); if (S.route !== 'c-sub') go('c-sub', { id: live.key });
      ok(`${tag}-1 direct navigation to a live learner's unsubmitted assignment: "Not submitted yet", no crash, nothing to review or feed back on`, S.route === 'c-sub' && bare(), main().slice(0, 240));
      go('c-sub', { id: rec.key }); ok(`${tag}-1 a recorded learner's unsubmitted assignment: no invented date ("1 Jan 1970" before)`, bare(), main().slice(0, 240));
    });
    await T(tag + '-2 Coordinator direct calls', async () => {
      COO('A'); const s0 = sec(), fb0 = J(STORE.coo.fb), j0 = r3Judg(live.key).length;
      ACT.cfPost({ dataset: { k: live.key } }); ok(`${tag}-2 posting a comment on it is refused and logged`, sec() === s0 + 1 && !MODAL && J(STORE.coo.fb) === fb0); closeModal();
      ok(`${tag}-2 typing a comment saves no draft`, INP.cfInput({ dataset: { k: live.key }, innerHTML: 'x', innerText: 'x' }) === false);
      const qid = (synthAsg(live).qs[0] || {}).id; ACT.r3CooJudge({ dataset: { k: live.key, q: qid } }); ACT.r3CooDraft({ dataset: { k: live.key, q: qid } });
      ok(`${tag}-2 criterion feedback on it is refused and logged`, r3Judg(live.key).length === j0 && sec() === s0 + 3, String(sec() - s0));
    });
    await T(tag + '-3 submitted and resubmitted', async () => {
      COO('A'); go('c-sub', { id: sub.key }); const t = main();
      ok(`${tag}-3 a submitted assignment opens the review as before (answers, criterion panel, comment), with its real date`, !!q('.r3-coo') && !!q('[data-act="cfPost"]') && /submitted \d/.test(t) && !/Not submitted yet/.test(t) && !/1970/.test(t));
      go('c-sub', { id: resub.key }); ok(`${tag}-3 a resubmitted assignment opens the review with its rounds`, !!q('.r3-coo') && /Resub/.test(main()) && !/Not submitted yet/.test(main()));
    });
    await T(tag + '-4 Assessor', async () => {
      for (const v of ['A', 'S']) { TCH(v); mk = tasSubs(true).find(s => !s.at && r3StaffSub(s.key)); if (mk) break; }
      ok(`${tag}-4 an allocated Assessor has an unsubmitted row`, !!mk);
      go('t-mark', { id: mk.key }); ok(`${tag}-4 the marking page says "Not submitted yet", with no marking controls`, bare(), main().slice(0, 200));
      const s0 = sec(), st0 = mk.status, a = tasAsg(mk), qid = (a.qs[0] || {}).id;
      const dl = []; const st = f => { const n = sec(); f(); closeModal(); dl.push(sec() - n); }; st(() => ACT.mkRelease({ dataset: { k: mk.key } })); st(() => ACT.mkRag({ dataset: { k: mk.key, q: qid, v: "G" } })); st(() => INP.mkExit({ dataset: { k: mk.key, q: qid }, value: "pass" })); st(() => ACT.r3Declare({ dataset: { k: mk.key } }));
      const now_ = tasSubs(true).find(s => s.key === mk.key);
      ok(`${tag}-4 release (refused by its own check, audited), marking and the final outcome (refused, security log) by direct call; nothing changes`, J(dl) === J([0, 1, 1, 1]) && ADMIN.audit.some(x => x.action === "Blocked: publish feedback" && x.entity === mk.key) && now_.status === st0 && !STORE.tas.marked[mk.key] && !r3Out(mk.key) && !((STORE.tas.drafts[mk.key] || {}).items || {})[qid], J([dl, now_.status, ADMIN.security[0].detail]));
      TCH('T'); go('t-mark', { id: mk.key }); ok(`${tag}-4 a Teacher gets no marking controls either`, !q('.met-pick') && !q('[data-act="mkRelease"]'));
    });
    await T(tag + '-5 unauthorised', async () => {
      COO('A'); const s0 = sec(); go('c-sub', { id: 'IA-L-99999~a3' }); ok(`${tag}-5 a submission outside the Coordinator's batches is denied (logged), not shown as "Not submitted yet"`, /don't have access/.test(main()) && !/Not submitted yet/.test(main()) && sec() === s0 + 1);
    });
    return live.key;
  };

  if (PH === 0) { const k = await run('NS'); SS.setItem(K + 'key', k || ''); return next(1); }
  if (PH === 1) {
    await T('NS-R refresh', async () => {
      COO('A'); const k = SS.getItem(K + 'key'); go('c-sub', { id: k });
      ok('NS-R after a real reload the unsubmitted assignment still opens on "Not submitted yet"', bare());
    });
    await run('NSR');
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'key');
})();
