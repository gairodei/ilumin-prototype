// 1A — NVQ commencement gate, full legacy test data (FIXTURE=legacy): every seeded learner and demo state is historical (no rule,
// the same locks as the chain before 1A on every page, normal / paused / archived); a learner who starts a new sign-up is governed.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const routes = NAV.map(n => n[0]).concat(['assignment', 'quiz', 'thread', 'course']);

  await T('N1AL-A seeded learners unchanged', async () => {
    fresh(); const keys = Object.keys(STORE.worlds).filter(k => STORE.worlds[k] && STORE.worlds[k].me);
    ok('N1AL-A1 no seeded learner carries the commencement rule', keys.every(k => !(STORE.worlds[k].signup && STORE.worlds[k].signup.startRule) && !n1aApplies(STORE.worlds[k])));
    const diff = [];
    ['A', 'B', 'C', 'D', 'E', 'F', 'H'].filter(v => STORE.worlds[v]).forEach(v => ['none', 'paused', 'archived'].forEach(edge => {
      learner(v); S.edge = edge; [undefined, 'nvq'].forEach(id => [undefined, 'workplace'].forEach(tab => { S.params = { id, tab }; routes.forEach(r => { if (J(lockFor(r)) !== J(n1aBase(r))) diff.push(v + '/' + edge + '/' + r + '/' + (id || '') + '/' + (tab || '')); }); }));
    }));
    S.edge = 'none'; S.params = {};
    ok('N1AL-A2 every page, every seeded learner, normal / paused / archived: the same lock as before 1A', diff.length === 0, diff.slice(0, 8).join(', '));
    learner('B'); S.edge = 'underreview'; applyEdge(); const w = W, b = chBatch(w.signup.batch);
    ok('N1AL-A3 a demo state built on a seeded sign-up (Priya, batch not started): content open at sign-up as before (CH-10 / CH-11)', w.signup.done && !w.signup.startRule && !!b && Date.parse(b.start) > now().getTime() && !lockFor('assignments') && !lockFor('observations'), b && b.start);
  });

  await T('N1AL-B a new sign-up on the legacy data is governed', async () => {
    fresh(); learner('B'); S.edge = 'none'; const w = W;
    // Priya's seeded sign-up stays historical; a re-application after withdrawing starts a new one
    ok('N1AL-B1 the seeded in-progress sign-up is historical', !!w.signup && !w.signup.startRule);
    const pr = (STORE.chNewProgs || [])[0] || null;
    if (pr) {
      const v = Object.keys(STORE.worlds).find(k => STORE.worlds[k] && STORE.worlds[k].me && !STORE.worlds[k].flags.nvq && !STORE.worlds[k].admission);
      if (v) { learner(v); ch8StartSignup(W, pr); ok('N1AL-B2 a sign-up a learner starts now records the rule (frozen)', !!W.signup.startRule && Object.isFrozen(W.signup.startRule) && n1aApplies(W)); }
      else ok('N1AL-B2 (no learner without an NVQ in the legacy data — covered by ft-n1a)', true);
    } else {
      const keep = N1A_SEED; ok('N1AL-B2 outside a fixture build no seeding is in progress', keep === 0);
    }
  });

  Clock.unfreeze();
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
