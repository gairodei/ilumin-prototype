// CBR correction batch 1 on the client demo (suites.sh runs it with FIXTURE=client; real page reloads of the saved demo).
// Phase 0: a Draft whose observation answer was never recorded keeps it unanswered through an unrelated Save draft; a new version of the
// published demo programme starts "Not answered" with "Version 1: Yes" beside it; "Dated examples from" previews due dates from the
// demo batch without changing any learner's schedule. Phase 1 (after a refresh): all of that is still so; No is chosen for the version.
// Phase 2 (after a refresh): No is kept, the published version still says Yes; Reset demo.
(async function () {
  const SS = window.sessionStorage, K = 'ft-cbc1c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s), qa = s => $a('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const step = (id, k) => go('a-programmes', { id, tab: k });
  const type = (sel, v) => { const e = q(sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const pins = () => J(Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, w.signup && w.signup.pin || null, (w.plans || []).map(p => p.rows.map(r => [r.due, r.amount, r.status]))]; }));
  const P = () => cdPr(), pub = () => (n5PubCur(P()) || {}).required;

  if (PH === 0) {
    await T('CBC1C-0 not answered, new version, preview', async () => {
      SA(); const pr = P();
      ok('CBC1C setup: the demo programme is published with "Observation required: Yes"', !!pr && pr.status !== 'Draft' && pub() === true && !n5DraftV(pr), pr && pr.status);
      // a Draft course whose answer was never recorded (as on programmes from before the question existed)
      go('a-programmes'); ACT.chProgNew(); type('#np-t', 'CBC1C draft'); type('#np-r', 'QN 610/9177/1'); type('#np-d', '12'); type('#cbc3-dd-n', '12'); q('#np-l').value = 'Level 3'; INP.r1NpLevel(q('#np-l'));
      const r = qa('.r1-np-row')[0]; r.querySelector('.r1-np-l').value = 'FA'; r.querySelector('.r1-np-f').value = '2000'; r.querySelector('.r1-np-m').value = 'Fully Assisted';
      qa('.cr-dm-c').forEach(x => { x.checked = true; }); click(q('#cbr2-obs-yes')); click(q('[data-act="cbDetCreate"]')); closeModal();
      const d = (STORE.chNewProgs || []).slice(-1)[0]; N5().draft[d.id].required = null; // setup: no answer recorded
      step(d.id, 'details'); type('#np-q-glh', '271'); click(qa('[data-act="cbDetSave"]').find(b => !b.dataset.next));
      ok('CBC1C-1 an unrelated Save draft (real click) keeps "not answered"', cbObsOf(d) === null && (d.qual || {}).glh === 271);
      // a new version of the published programme
      ACT.s3WizVersion({ dataset: { id: pr.id } }); const t = $1('#rsn'); if (t) { t.value = 'CBC1C version'; click($a('#modal-root [data-mi]').find(x => /btn-primary|btn-danger/.test(x.className))); }
      step(pr.id, 'details');
      ok('CBC1C-2 the new version starts "Not answered" with "Version 1: Yes" beside it (N5a: each version answers again)', !!n5DraftV(pr) && cbObsOf(pr) === null && !q('input[name="cbr2-obs"]:checked') && new RegExp(`Version ${pr.version}: Yes`).test(q('.cbr2-obs').textContent) && pub() === true, q('.cbr2-obs') && q('.cbr2-obs').textContent);
      // the payment-date preview from the demo batch
      // FB1: Step 5 no longer has the selector; the one in Offer Letters (payment wording) still chooses the batch the previews use
      step(pr.id, 'payments'); const noSel = !q('.cbr2-fees .cb8-sample'); step(pr.id, 'documents'); const sel = q('.cb8-lt .cb8-sample select'), b = ADMIN.batches.find(x => x.course === pr.title && new Date(x.start) > now());
      ok('CBC1C-3 Step 5 has no "Dated examples from"; the Offer Letters selector lists the sample start and the programme\'s upcoming batch', noSel && !!sel && !!b && [...sel.options].some(o => o.value === b.code), b && b.code);
      const p0 = pins(), first = () => { step(pr.id, 'payments'); return (q('.cbr2-pl .cb8-dates li .cb8-dd') || {}).textContent; };
      const d0 = first(); step(pr.id, 'documents'); const sel2 = q('.cb8-lt .cb8-sample select'); sel2.value = b.code; sel2.dispatchEvent(new Event('change', { bubbles: true }));
      ok('CBC1C-4 choosing the batch re-dates every preview from its start (payment 1 on the batch start), labelled as a preview', first() === cbFd(cbYmdOf(b.start)) && first() !== d0 && qa('.cbr2-pl summary').every(s => new RegExp(`^Example due dates — batch ${b.code}, starting `).test(s.textContent)) /* FB1 label */, `${d0} → ${first()}`);
      ok('CBC1C-5 no learner\'s pinned terms or schedule changed', pins() === p0);
      SS.setItem(K + 'd', d.id); SS.setItem(K + 'pins', pins()); fcpSave();
    });
    return next(1);
  }
  if (PH === 1) {
    await T('CBC1C-1 after a refresh', async () => {
      SA(); const pr = P(), d = cbPr(SS.getItem(K + 'd'));
      ok('CBC1C-6 after a refresh the Draft is still "not answered", with its saved GLH', !!d && cbObsOf(d) === null && (d.qual || {}).glh === 271 && (step(d.id, 'details'), !q('input[name="cbr2-obs"]:checked') && !!q('.cbr2-obs-na')));
      step(pr.id, 'details'); ok('CBC1C-7 …the new version still "Not answered", the published version still Yes', cbObsOf(pr) === null && pub() === true && !!q('.cbr2-obs-na'));
      click(q('#cbr2-obs-no')); ok('CBC1C-8 choosing No for the version records it and hides its Observations step', cbObsOf(pr) === false && !cbrSteps(pr).some(s => s[0] === 'observations'));
      ok('CBC1C-9 learners\' pinned terms and schedules unchanged', pins() === SS.getItem(K + 'pins'));
      fcpSave();
    });
    return next(2);
  }
  if (PH === 2) {
    await T('CBC1C-2 after a second refresh', async () => {
      SA(); const pr = P(); step(pr.id, 'details');
      ok('CBC1C-10 after a refresh the version\'s No is kept (and shown chosen); the published version still says Yes', cbObsOf(pr) === false && q('#cbr2-obs-no').checked && pub() === true);
      ACT.resetDemo && ACT.resetDemo(); closeModal();
    });
    SS.removeItem(K + 'phase'); SS.removeItem(K + 'R');
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
