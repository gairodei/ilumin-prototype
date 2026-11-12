// CBR correction batch 2 on the client demo (suites.sh runs it with FIXTURE=client; real page reloads of the saved demo).
// Phase 0: a new version of the demo programme changes its Required Observation and adds one in the draft; the learners on Version 1 keep
// Version 1's definition — the Coordinator's location choice and the Assessor's proposal use it.
// Phase 1 (after a refresh): the draft's definitions and the learner's choice are kept; Reset demo returns the starting demo.
// Phase 2 (after Reset and a refresh): the starting demo — Version 1's single Required Observation, no draft.
(async function () {
  const SS = window.sessionStorage, K = 'ft-cbc2c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const mclick = re => click($a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim())));
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const P = () => cdPr(), step4 = () => go('a-programmes', { id: P().id, tab: 'observations' });
  let VK = SS.getItem(K + 'vk'); const w1 = () => STORE.worlds[VK], v1 = () => cbObsEventsFor(P().id, 1);
  if (!VK) { as('nvq-sp'); VK = S.variant; SS.setItem(K + 'vk', VK); }

  if (PH === 0) {
    await T('CBC2C-0 a draft changes the definitions; learners keep Version 1', async () => {
      SA(); const e0 = v1();
      ok('CBC2C setup: Version 1 is published with one Required Observation; CD1 is on Version 1 with it', e0.length === 1 && !!dCtx(w1()) && dCtx(w1()).v === 1 && J(dCtx(w1()).evs) === J(e0), J(e0.map(e => e.name)));
      ACT.s3WizVersion({ dataset: { id: P().id } }); const t = $1('#rsn'); if (t) { t.value = 'CBC2C version 2'; click($a('#modal-root [data-mi]').find(x => /btn-primary|btn-danger/.test(x.className))); }
      go('a-programmes', { id: P().id, tab: 'details' }); click(q('#cbr2-obs-yes')); step4();
      ok('CBC2C-1 Version 2 (draft) starts with Version 1\'s Required Observation (same ID), editable', !!n5DraftV(P()) && cbEvOf(n5Draft(P())).map(e => e.id).join() === e0.map(e => e.id).join() && !!q(`.cbr2-ro[data-e="${e0[0].id}"] [data-act="cbObsEv"]`));
      click(q(`.cbr2-ro[data-e="${e0[0].id}"] [data-act="cbObsEv"]`)); $1('#ev-n').value = 'Draft title'; mclick(/^Save$/);
      step4(); click(q('.cbr2-req [data-act="cbObsEv"][data-e=""]')); $1('#ev-n').value = 'Draft extra'; $a('#modal-root .ev-l, #modal-root .ev-c').forEach(x => { if (!x.disabled) x.checked = true; }); mclick(/^Add Required Observation$/);
      ok('CBC2C-2 the draft now has two definitions; Version 1 still has its own one, unchanged', cbEvOf(n5Draft(P())).length === 2 && J(v1()) === J(e0));
      ok('CBC2C-3 the learner\'s requirements are still Version 1\'s (booking uses the pinned version)', J(dCtx(w1()).evs) === J(e0) && !dCtx(w1()).evs.some(e => /Draft/.test(e.name)));
      const lid = w1().me.id; as('coord1'); go('c-learner', { id: lid, tab: 'observations' });
      const sel = $1('#d-loc-' + e0[0].id); ok('CBC2C-4 the Coordinator chooses the location of Version 1\'s observation (by its published name)', !!sel && new RegExp(e0[0].name.replace(/[()]/g, '.')).test(q('.d-obs, main').textContent));
      if (sel) { sel.value = 'workplace'; ACT.dObsLoc({ dataset: { l: lid, e: e0[0].id } }); }
      ok('CBC2C-4 …recorded for Version 1', !!dSel(w1(), e0[0].id) && dSel(w1(), e0[0].id).v === 1 && dSel(w1(), e0[0].id).loc === 'workplace', J(dSel(w1(), e0[0].id)));
      as('assessor'); ACT.obPropose({ dataset: { l: lid } }); const l = $1('#op-l'); if (l) { l.value = lid; INP.obPerm && INP.obPerm(l); }
      const evSel = $1('#d-ev-s'), opts = evSel ? [...evSel.options].map(o => o.textContent) : [];
      ok('CBC2C-5 the Assessor\'s proposal offers Version 1\'s observation — not the draft\'s', !!MODAL && (opts.length ? opts.some(o => o.includes(e0[0].name)) && !opts.some(o => /Draft/.test(o)) : /Draft/.test($1('#modal-root').textContent) === false), J(opts));
      ok('CBC2C-5 the evidence record for it is Version 1\'s criteria and evidence', J(dCtx(w1()).evs[0].crit) === J(e0[0].crit) && J(dCtx(w1()).evs[0].ev) === J(e0[0].ev));
      closeModal(); SS.setItem(K + 'e0', J(e0)); fcpSave();
    });
    return next(1);
  }
  if (PH === 1) {
    await T('CBC2C-1 after a refresh, then Reset', async () => {
      SA(); const e0 = JSON.parse(SS.getItem(K + 'e0'));
      ok('CBC2C-6 after a refresh the draft\'s definitions are kept, Version 1 unchanged', J(cbEvOf(n5Draft(P())).map(e => e.name)) === J(['Draft title', 'Draft extra']) && J(v1()) === J(e0));
      ok('CBC2C-6 …and the learner\'s location choice for Version 1', !!dSel(w1(), e0[0].id) && dSel(w1(), e0[0].id).v === 1);
      step4(); ok('CBC2C-6 the step lists both draft rows', $a('main .cbr2-ro').length === 2);
      ACT.resetDemo(); closeModal();
      ok('CBC2C-7 Reset demo: no draft, Version 1\'s single Required Observation', !n5DraftV(P()) && J(v1()) === J(e0));
    });
    return next(2);
  }
  if (PH === 2) {
    await T('CBC2C-2 after Reset and a refresh', async () => {
      SA(); const e0 = JSON.parse(SS.getItem(K + 'e0'));
      ok('CBC2C-8 the starting demo: Version 1\'s Required Observation, no draft, no location choice kept', !n5DraftV(P()) && J(v1()) === J(e0) && !dSel(w1(), e0[0].id));
      step4(); ok('CBC2C-8 the step shows it read-only ("Frozen with Version 1")', $a('main .cbr2-ro').length === 1 && /Frozen with Version 1/.test(q('.cbr2-req').textContent) && !q('[data-act="cbObsEv"]'));
    });
    [K + 'phase', K + 'R', K + 'e0', K + 'vk'].forEach(k => SS.removeItem(k));
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
