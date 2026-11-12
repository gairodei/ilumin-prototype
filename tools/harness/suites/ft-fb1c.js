// FB1 — Fees & Payment Plans simplification on the client demo (suites.sh runs it with FIXTURE=client; a real reload, then Reset).
// The demo's financial records are exactly what they were before FB1 (deposit amounts, pinned schedules, deposits, admission figures);
// its programme deposit is now set on each fee option; Step 5 without the removed controls; a new fee option's unanswered deposit
// choice survives a reload; Reset brings back the demo exactly.
(async function () {
  const SS = window.sessionStorage, K = 'ft-fb1c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), q = s => $1('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const main = () => ($1('main') || document.body).textContent;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const pr = () => cdPr(), id = () => cdPr().id;
  const byName = n => { const v = learnerAccounts().find(x => { const w = STORE.worlds[x]; return w.me && w.me.first === n; }); return v && STORE.worlds[v]; };
  const pl = w => (w.plans || []).find(p => p.e === 'nvq');
  // The demo's financial records as they were before FB1 (the same build without FB1, recorded on 10 Nov 2026)
  const rowsOf = w => pl(w).rows.map(r => `${r.amount}@${String(r.due).slice(0, 10)}:${r.status}`).join(',');
  const fin = () => J(['Amira', 'Dev', 'Sam', 'Tom'].map(n => { const w = byName(n), P = cb9Pin(w), ad = w.admission && w.admission.deposit, p = pl(w);
    return [n, P.planV, P.dep.mode, P.dep.eff, !!w.signup.plan.depOff, w.signup.plan.deposit, ad && ad.min, ad && ad.balance, rowsOf(w), p.deposit ? `${p.deposit.amount}:${p.deposit.status}` : '-', J(w.signup.pin)]; }));
  const BEFORE = [['Amira', 2, 'default', 300, false, 300, 300, 1500, '300@2026-12-03:Paid,300@2027-02-03:Pending,300@2027-04-03:Pending,300@2027-06-03:Pending,300@2027-08-03:Pending,300@2027-10-03:Pending', '-'],
    ['Dev', 2, 'default', 300, false, 300, 300, 2300, '433.33@2026-12-03:Paid,433.33@2027-02-03:Pending,433.33@2027-04-03:Pending,433.33@2027-06-03:Pending,433.33@2027-08-03:Pending,433.35@2027-10-03:Pending', '-'],
    ['Sam', 3, 'own', 100, false, 100, 100, 1500, '300@2026-11-01:Paid,300@2027-02-03:Pending,300@2027-04-03:Pending,300@2027-06-03:Pending,300@2027-08-03:Pending,300@2027-10-03:Pending', '100:Paid'],
    ['Tom', 3, 'own', 100, false, 100, 100, 1800, '300@2026-11-01:Pending,300@2027-02-03:Pending,300@2027-04-03:Pending,300@2027-06-03:Pending,300@2027-08-03:Pending,300@2027-10-03:Pending', '100:Awaiting confirmation by Finance']];
  const finCore = () => J(JSON.parse(fin()).map(x => x.slice(0, 10)));

  if (PH === 0) {
    await T('FB1C-1 the demo after FB1', async () => {
      ok('FB1C-1 the client demo builds: its programme, batch and learners', typeof cdOn === 'function' && cdOn());
      ok('FB1C-2 every learner\'s financial record is exactly as before FB1 (deposits, admission figures, schedules, payments)', finCore() === J(BEFORE), finCore());
      const vs = s4Plans(id()).filter(p => p.pkg), v2 = vs.find(p => p.v === 2), v3 = vs.find(p => p.v === 3);
      ok('FB1C-3 plan version 2: each fee option answered Yes — the Academy default (£300), the deposit it inherited before', !!v2 && v2.pkg.opts.every(o => o.dep && o.dep.mode === 'default' && o.dep.eff === 300));
      ok('FB1C-4 plan version 3: the programme\'s £100 deposit is on each fee option (cdDeposit); the Academy default stays £300', !!v3 && v3.pkg.opts.filter(o => o.status === 'Active').every(o => o.dep && o.dep.mode === 'own' && o.dep.eff === 100) && S4().cfg.deposit === 300 && cdDepOk(id(), 100));
      as('aca'); go('a-programmes', { id: id(), tab: 'payments' });
      ok('FB1C-5 Step 5: no "Dated examples from", pricing-method line or programme deposit editor; two cards answered Yes (£100 custom)', !q('.cbr2-fees .cb8-sample') && !q('.cbr2-pm') && !q('.cbr2-pdep') && qa('.fb1-dep').length === 2 && qa('.fb1-dep').every(d => d.dataset.ans === 'yes' && d.querySelector('input[data-k="own"]').checked && d.querySelector('input[data-k="amount"]').value === '100'));
      ok('FB1C-6 the demo\'s due-date previews are illustrative (sample batch start)', qa('details.cb8-ex > summary').length > 0 && qa('details.cb8-ex > summary').every(s => /^Illustrative due dates — sample batch start/.test(s.textContent)));
      // PD-FB1-10: an Academy default change on the demo, whose package uses only its own £100 deposits — nothing to re-approve, no new version
      const v0 = s4Plans(id()).length, f0 = fin(); as('fin'); ACT.s4CfgEdit(); $1('#cf-d').value = '320'; $1('#cf-h').value = '28'; const tr = $1('#rsn'); if (tr) tr.value = 'FB1C default'; const ca = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (ca) ca.fn(); closeModal();
      ok('FB1C-6b the Academy default changes to £320: the demo package (own £100 on each option) keeps its approval and gets no new version; learners unchanged', S4().cfg.deposit === 320 && s4Plans(id()).length === v0 && cb8Wf(pr()).status === 'Approved' && fin() === f0, J([S4().cfg.deposit, s4Plans(id()).length - v0, cb8Wf(pr()).status]));
      as('aca'); go('a-programmes', { id: id(), tab: 'payments' });
      // a new fee option, unanswered, then saved and reloaded
      ACT.cb8Opt({ dataset: { p: id(), o: '', mode: 'Self-Paced' } }); $1('#modal-root #c8-l').value = 'Self-Paced — FB1 reload'; $1('#modal-root #c8-f').value = '1700'; $1('#modal-root #c8-m').value = 'Self-Paced';
      ['#c8-wp', '#c8-off'].forEach(k => { const e = $1('#modal-root ' + k); if (e && !e.disabled) e.value = '50'; });
      const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); a.fn(); closeModal();
      const o = cb8Work(pr()).opts.find(x => x.label === 'Self-Paced — FB1 reload'); go('a-programmes', { id: id(), tab: 'payments' });
      ok('FB1C-7 a new fee option on the demo programme starts "Not answered" and blocks submission', !!o && fb1Ask(o) && !!q(`.cbr2-opt[data-o="${o.id}"] .fb1-dep[data-ans="none"]`) && cb8Issues(pr(), cb8Work(pr())).some(x => x.o === o.id && /Allow Deposit/.test(x.msg)));
      SS.setItem(K + 'snap', J({ oid: o && o.id, fin: fin(), plans: J(s4Plans(id())) })); fcpSave();
    });
    return next(1);
  }
  if (PH === 1) {
    const s = JSON.parse(SS.getItem(K + 'snap') || '{}');
    await T('FB1C-8 after a reload', async () => {
      const o = cb8Work(pr()).opts.find(x => x.id === s.oid);
      ok('FB1C-8 after a reload the new option is still "Not answered" (not turned into No or the programme setting)', !!o && !o.dep && fb1Ask(o));
      ok('FB1C-9 …and every financial record and plan version is unchanged; the £320 Academy default is still in force', fin() === s.fin && J(s4Plans(id())) === s.plans && S4().cfg.deposit === 320);
      as('aca'); go('a-programmes', { id: id(), tab: 'payments' }); click(q(`.cbr2-opt[data-o="${s.oid}"] .fb1-yn input[data-k="no"]`), 'No');
      ok('FB1C-10 answered No with the real control after the reload', J(cb8Work(pr()).opts.find(x => x.id === s.oid).dep) === J({ mode: 'none', amount: null }));
      ACT.resetDemo(); closeModal();
      ok('FB1C-11 Reset demo: the added option is gone and the demo\'s records are as before FB1 again', !cb8Work(pr()).opts.some(x => x.label === 'Self-Paced — FB1 reload') && !FB1().ask[s.oid] && finCore() === J(BEFORE) && S4().cfg.deposit === 300, finCore());
      ok('FB1C-12 after Reset the demo options are answered (Yes, £100) — none "Not answered"', cb8Work(pr()).opts.filter(x => x.status === 'Active').every(x => !fb1Ask(x) && x.dep && x.dep.mode === 'own' && x.dep.amount === 100));
    });
    [K + 'phase', K + 'R', K + 'snap'].forEach(k => SS.removeItem(k));
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
