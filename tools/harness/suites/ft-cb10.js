// CB10 — Simulated payment reminders (PD-CB-67…72). Reminders come only from learners' pinned schedules: upcoming (7 days before), due,
// Day 15 and Day 30 overdue; each (learner, payment, kind) once across re-renders, rebuilds and identity switches; none for paid rows,
// deposit balances or learners on older terms; advancing the simulated date gives upcoming → due → overdue in order; every entry and
// notice is labelled simulated; notification and audit histories are only appended to.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s);
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB10 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const J = o => JSON.stringify(o);
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const rebuildA = () => { INP.adminVariant({ value: Object.keys(ADMIN_VARIANTS).find(k => k !== 'A') }); INP.adminVariant({ value: 'A' }); };
  // A published Level 4 package programme (in full, 4 or 6 payments over 6 months) with a batch starting 13 Nov 2026
  const prog = () => {
    SA(); go('a-programmes'); ACT.chProgNew();
    fill({ '#np-t': 'CB10 Level 4 course', '#np-l': 'Level 4', '#np-r': 'QN 610/4500/4', '#np-d': '6', '#np-du': 'months', '#np-p': '2400' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-code').value = 'CB10C'; document.querySelector('#np-obs-no').checked = true; const pr = ACT.cbDetCreate(); closeModal(); const id = pr.id;
    go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U101', '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/1010' }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    const o = cb8Work(pr).opts[0].id; [1, 4].forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o, k: String(k) } })); ACT.cb8SaApprove({ dataset: { p: id } }); reason('Terms');
    ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal();
    ADMIN.batches.push({ code: 'CB10-NOV26', label: 'CB10 November batch', course: pr.title, start: D(40, '09:00'), end: D(240, '17:00'), cap: 20, enrolled: 0, mode: 'Online', coord: '', teachers: [], assessors: [], status: 'Open', wait: [], roster: [] });
    return { pr, bt: chBatch('CB10-NOV26') };
  };
  const enrol = (v, P, k) => {
    learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === P.pr.title); ACT.applyNvq({ dataset: { id: c.id } }); prim(); closeModal();
    const w = STORE.worlds[v]; chSetBatch(w, P.bt); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, P.bt);
    setUi('cb9Pay', String(k)); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-CB10'); closeModal();
    return w;
  };
  const adv = d => { FA(); ACT.cb10Advance({ dataset: { d: String(d) } }); };
  const log = (lid, kind) => STORE.cbRem.log.filter(x => x.lid === lid && (!kind || x.kind === kind));
  const notes = w => w.notifs.filter(n => /\(simulated\)$/.test(n.title));

  await T('CB10-A only pinned schedules', async () => {
    fresh(); const P = prog(); render();
    ok('CB10-A no reminder before anyone has an agreed schedule; the seeded learners (Aisha\'s overdue instalments, older terms) get none', !STORE.cbRem.log.length && !notes(STORE.worlds.C).length);
    const w = enrol('A', P, 4); render(); render();
    ok('CB10-A (setup) Daniel pays payment 1 of 4 (13 Nov 2026); the next is due 28 Dec 2026', J(w.plans.find(p => p.e === 'nvq').rows.map(r => [cbYmdOf(r.due), r.status])) === J([['2026-11-13', 'Paid'], ['2026-12-28', 'Pending'], ['2027-02-11', 'Pending'], ['2027-03-28', 'Pending']]));
    ok('CB10-A today (4 Oct): nothing to remind — payment 1 is paid, the next is more than 7 days away', !log(w.me.id).length);
    const dep = (() => { learner('F'); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === P.pr.title); ACT.applyNvq({ dataset: { id: c.id } }); prim(); closeModal(); const f = STORE.worlds.F; chSetBatch(f, P.bt); ACT.suNext(); f.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', f.me.first + ' ' + f.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(f, P.bt); setUi('cb9Pay', 'deposit'); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-DEP'); closeModal(); return f; })();
    adv(60); ok('CB10-A (negative) a deposit learner\'s balance row (no dated schedule) gets no simulated reminder', !log(dep.me.id).length && dep.plans.find(p => p.e === 'nvq').plan === 'Deposit and balance');
  });

  await T('CB10-B upcoming → due → Day 15 → Day 30, once each', async () => {
    fresh(); const P = prog(), w = enrol('A', P, 4), n0 = w.notifs.length, a0 = ADMIN.audit.length;
    adv(78); ok('CB10-B simulated to 21 Dec 2026 (7 days before 28 Dec): one "upcoming" reminder for payment 2', cb10Sim() === '2026-12-21' && log(w.me.id).length === 1 && log(w.me.id, 'upcoming')[0].n === 2 && log(w.me.id, 'upcoming')[0].on === '2026-12-21');
    ok('CB10-B the learner gets one in-app notice, labelled simulated, saying no email or SMS is sent', notes(w).length === 1 && /Upcoming payment reminder \(simulated\)/.test(notes(w)[0].title) && /no email or SMS is sent/.test(notes(w)[0].body) && w.notifs.length === n0 + 1);
    render(); render(); rebuildA(); FA(); render(); learner('A'); render(); ACA(); render();
    ok('CB10-B re-renders, an admin rebuild and identity switches add nothing', log(w.me.id).length === 1 && notes(w).length === 1);
    adv(7); ok('CB10-B 28 Dec: "Payment due today" for payment 2', log(w.me.id, 'due').length === 1 && log(w.me.id, 'due')[0].on === '2026-12-28');
    adv(15); ok('CB10-B 12 Jan 2027: "Overdue reminder (Day 15)"', log(w.me.id, 'od15').length === 1 && log(w.me.id, 'od15')[0].on === '2027-01-12');
    adv(15); ok('CB10-B 27 Jan 2027: "Overdue reminder (Day 30)"; the order is upcoming → due → Day 15 → Day 30', log(w.me.id, 'od30').length === 1 && J(log(w.me.id).slice().reverse().filter(x => x.n === 2).map(x => x.kind)) === J(['upcoming', 'due', 'od15', 'od30']));
    ok('CB10-B payment statuses and the real date don\'t change (the simulation is labelled, not applied)', w.plans.find(p => p.e === 'nvq').rows[1].status === 'Pending' && cbToday() === '2026-10-04');
    ok('CB10-B audit: each advance recorded ("Reminder simulation advanced"); nothing removed from notifications or the audit', ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Reminder simulation advanced').length === 4 && w.notifs.length === n0 + 4);
  });

  await T('CB10-C paid rows, big jumps and reset', async () => {
    fresh(); const P = prog(), w = enrol('A', P, 4), pl = w.plans.find(p => p.e === 'nvq');
    adv(78); Object.assign(pl.rows[1], { status: 'Paid', paid: pl.rows[1].amount }); adv(60);
    ok('CB10-C (negative) payment 2 paid after its upcoming reminder: no "due" or overdue reminders for it', log(w.me.id).filter(x => x.n === 2).map(x => x.kind).join() === 'upcoming');
    ok('CB10-C payment 3 (11 Feb 2027) got its upcoming and due reminders on their days during the 60-day jump', J(log(w.me.id).filter(x => x.n === 3).map(x => [x.kind, x.on]).reverse()) === J([['upcoming', '2027-02-04'], ['due', '2027-02-11']]));
    const k0 = J(STORE.cbRem.log); FA(); ACT.cb10Reset(); render(); adv(78);
    ok('CB10-C "Back to today" keeps the log; advancing again sends nothing twice', J(STORE.cbRem.log) === k0);
    adv(366); const ks = STORE.cbRem.log.map(x => x.key);
    ok('CB10-C a year ahead: every unpaid payment\'s reminders, each once (no duplicate keys)', new Set(ks).size === ks.length && log(w.me.id, 'od30').length === 2);
  });

  await T('CB10-D Finance view, manual reminder and roles', async () => {
    fresh(); const P = prog(), w = enrol('A', P, 4); adv(78); setUi('fpL', 'A'); go('f-plans');
    ok('CB10-D Finance → Payment Plans: "Payment reminders — Simulated", the simulated date, the controls and the log', /Payment reminders/.test(q('.cb10').textContent) && /Simulated/.test(q('.cb10').textContent) && /No email or SMS is sent/.test(q('.cb10').textContent) && /21 Dec 2026/.test(q('.cb10').textContent) && !!q('[data-act="cb10Advance"]') && /Upcoming payment reminder/.test(q('.cb10-log').textContent));
    const a0 = ADMIN.audit.length; ACT.finRemind();
    ok('CB10-D "Send payment reminder now" for a learner with an agreed schedule: a manual reminder, recorded and labelled simulated', log(w.me.id, 'manual').length === 1 && notes(w).some(n => n.title === 'Payment reminder (simulated)') && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Payment reminder sent (simulated)'));
    setUi('fpL', 'C'); const l0 = STORE.cbRem.log.length; ACT.finRemind(); ok('CB10-D (negative) a learner on older terms (Aisha): the existing button behaviour, nothing simulated recorded', STORE.cbRem.log.length === l0);
    learner('A'); go('payments'); ok('CB10-D the learner\'s Payments page lists the reminders, labelled simulated', /Reminders/.test(q('.cb10-mine').textContent) && /Simulated/.test(q('.cb10-mine').textContent) && /Upcoming payment reminder/.test(q('.cb10-mine').textContent));
    [['an Academic Admin', ACA], ['a Business Admin', BA], ['a learner', () => learner('A')]].forEach(([who, enter]) => { enter(); const o0 = STORE.cbRem.offset, n0 = STORE.cbRem.log.length, b0 = ADMIN.audit.length; ACT.cb10Advance({ dataset: { d: '30' } }); ACT.cb10Reset();
      ok(`CB10-D (negative) ${who} can't advance or reset the simulation (refused, logged)`, STORE.cbRem.offset === o0 && STORE.cbRem.log.length === n0 && ADMIN.audit.slice(0, ADMIN.audit.length - b0).filter(x => /^Blocked/.test(x.action)).length === 2); });
    SA(); ACT.cb10Advance({ dataset: { d: '1' } }); ok('CB10-D the Super Administrator can run it', STORE.cbRem.offset === 79);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
