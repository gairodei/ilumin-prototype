// OC1 (PD-OC1-*), legacy fixture: learners whose version has no Required Observations keep the existing observation flow; the
// publication message for "required but no Observation outcome"; a seeded programme's Learning Outcome type change is reviewed;
// signed legacy records are unchanged.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'OC1L test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const radio = (n, v) => { const x = $1(`#modal-root input[name="${n}"][value="${v}"]`); if (x) x.checked = true; };
  const settings = (id, req, wp, off) => { ACT.n5Settings({ dataset: { p: id } }); if (!MODAL) return false; if (req) radio('n5-req', req); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };

  await T('OC1L-A legacy learners keep the existing observation flow', async () => {
    const w = STORE.worlds.C, sig0 = J((w.observations || []).filter(o => o.status === 'Completed').map(o => o.report));
    ok('OC1L-A1 the seeded learner\'s version has no Required Observations (the existing flow applies)', !dCtx(w));
    TCH(Object.keys(TAS_USERS).find(k => TAS_USERS[k].name === chEff(w.me.id, 'obs')) || 'S'); ACT.obPropose({ dataset: { l: w.me.id } }); const lf = $1('#modal-root #op-l');
    ok('OC1L-A2 the proposal dialog keeps its NVQ scope list and shows no plan or visit-scope picker', !!MODAL && $a('#modal-root .op-c').length > 0 && !$1('#modal-root #oc1-scope') && !$1('#modal-root #d-ev-s'), lf && lf.value);
    closeModal();
    ok('OC1L-A3 signed legacy observation reports are unchanged', J((w.observations || []).filter(o => o.status === 'Completed').map(o => o.report)) === sig0);
    const o = (w.observations || []).find(x => x.status === 'Completed'); ok('OC1L-A4 legacy records carry no OC1 scope (nothing back-filled)', !!o && !o.dScope && !o.dFu);
  });

  await T('OC1L-B publication message and type-change review', async () => {
    SA(); const n1 = ADMIN.programmes.find(p => p.id === 'NV-N1'); settings('NV-N1', 'yes', 'Permitted', 'Available');
    const b = ch8Check(n1).block.find(x => /no qualification observation criteria/.test(x)) || '';
    ok('OC1L-B1 "required, but no Observation outcome": blocking, naming both corrections (outcome type in Curriculum & Outcomes, or "Observation required" No in Course Details)', /Curriculum & Outcomes/.test(b) && /Course Details/.test(b) && /never converted automatically/.test(b), b);
    settings('NV-N1', 'no'); ok('OC1L-B2 "not required": no observation blocker (no Observation outcome is forced)', !ch8Check(n1).block.some(x => /^Observations/.test(x)));
    const L3 = ADMIN.programmes.find(p => p.id === 'NV-L3'); ACT.s3Sc28Edit(); SA();
    const dv = n5DraftV(L3), t = s3Draft('NV-L3').tree, obsLo = t.flatMap(u => u.mods.flatMap(m => m.los.map(l => ({ u, m, l })))).find(x => critKind(x.l.type) === 'Observation');
    INP.loType({ value: 'Knowledge', dataset: { p: 'NV-L3', u: obsLo.u.code, lo: obsLo.l.code } }); reason('OC1L: type change');
    const rv = n5Check(L3).review.find(x => /changed from .* to Knowledge since Version/.test(x)) || '';
    ok('OC1L-B3 a seeded programme\'s new version: an outcome\'s type change is listed for review with its criteria; learners keep their version; nothing remapped', !!dv && new RegExp(obsLo.u.code + ' ' + obsLo.m.code + ' ' + obsLo.l.code).test(rv) && /nothing is remapped/.test(rv), rv || J(n5Check(L3).review));
    ok('OC1L-B4 the published version\'s structure is unchanged by the draft', ((s3PubTree(L3, L3.version) || []).flatMap(u => u.mods.flatMap(m => m.los)).find(l => l.code === obsLo.l.code && l.crit[0] && obsLo.l.crit[0] && l.crit[0].code === obsLo.l.crit[0].code) || {}).type !== 'Knowledge');
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
