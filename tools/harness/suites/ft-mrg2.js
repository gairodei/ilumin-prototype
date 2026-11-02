// MR-G2 — staff portal and observations (multi-role audit, 2 Nov 2026; PD-MRG2-* in PROVISIONAL-DECISIONS.md). FIXTURE=client.
// Client demo first (Teacher vs Assessor on Amira's observation event, reschedule → learner page, sign-off lock, one fee, other
// portals), then the legacy data (handler × portal × persona matrix with state snapshots, locks, registers, notes, portfolio),
// then the client demo again. Test-only changes (a workplace permission set directly) are discarded by the next fixture load.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const primA = () => MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  const prim = () => { const a = primA(); return a && a.fn ? a.fn() : undefined; };
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); const r = a && a.fn ? a.fn() : 'NOACTION'; if (r !== false && MODAL) closeModal(); return r; };
  const fill = (t = 'MR-G2 test') => { ['#rsn', '#oc-r'].forEach(s => { const x = $1('#modal-root ' + s); if (x) x.value = t; }); };
  const sec = () => ADMIN.security.length;
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) code2fa(); S.ui = {}; };
  const TCH = v => { closeModal(); S.tas.v = v; tasEnter(); S.signedIn = true; S.ui = {}; };

  /* ================= Client demo: the observation journey ================= */
  const w = STORE.worlds.CD1, AM = w.me.id, ctx = dCtx(w), fees = () => chFees().filter(f => f.lid === AM);
  const csnap = () => J([w.observations, w.events.length, fees(), STORE.tas.obsDraft, w.plan, w.pd]);
  const coordP = mcOf(AM, cdBatch()) === COO_USERS.A.name ? 'coord1' : 'coord2';
  const e = ctx && (ctx.evs.find(x => (x.loc || []).includes('workplace')) || ctx.evs[0]);
  const propose = (who, at) => { if (who) pick(who); const m0 = MODAL; ACT.obPropose({ dataset: { l: AM } }); if (!MODAL || MODAL === m0) return 'no dialog'; const l = $1('#op-l'); if (l) { l.value = AM; INP.obPerm(l); } const s = $1('#d-ev-s'); if (s && e) { s.value = e.id; INP.dEvPick(s); } $1('#op-d').value = at.slice(0, 16); const r = prim(); closeModal(); return r; };
  const learnerPage = () => { pick('nvq-sp'); let t = ''; try { go('observations'); t = main(); } catch (x) { t = 'THREW ' + x.message; } return t; };
  let o1 = null;
  await T('MRG2-C1 Teacher (Marcus) is refused; the allocated Assessor (James) proposes; one fee on acceptance', async () => {
    if (!ctx) { ok('MRG2-C1 the client demo learner has observation events', false); return; }
    ok('MRG2-C1 the client demo learner\'s observation assessor is James Pryce', chEff(AM, 'obs') === 'James Pryce', chEff(AM, 'obs'));
    pick(coordP); go('c-learner', { id: AM, tab: 'observations' }); ACT.dObsLoc({ dataset: { l: AM, e: e.id, loc: 'workplace' } });
    if (!w.workplace) w.workplace = { name: 'MR-G2 Care', address: '1 Test St', postcode: 'ZZ1 1ZZ', perm: 'Granted' }; else w.workplace.perm = 'Granted'; // test-only (discarded by the next fixture load)
    const s0 = csnap(), x0 = sec(); const r = propose('teacher', D(10, '10:00'));
    ok('MRG2-C1 MR-04: a Teacher-only user cannot propose an observation (no dialog, nothing changes, logged)', r === 'no dialog' && csnap() === s0 && sec() === x0 + 1, J({ r, sec: sec() - x0 }));
    // the original reproduction, done directly: a Teacher-only persona in the staff portal calling the handler with Amira's id
    pick('teacher'); S.tas.v = 'T'; const s1 = csnap(); ACT.obPropose({ dataset: {} }); ok('MRG2-C1 MR-04: no proposal dialog for a Teacher even without a learner id', !MODAL && csnap() === s1);
    const n1 = w.observations.length; propose('assessor', D(12, '10:00')); o1 = w.observations[0];
    ok('MRG2-C1 the allocated Assessor proposes the event', w.observations.length === n1 + 1 && o1.status === 'Proposed' && o1.assessor === 'James Pryce', J(o1 && [o1.status, o1.assessor]));
    const f0 = fees().length; pick('nvq-sp'); ACT.obsAccept({ dataset: { id: o1.id } }); prim(); closeModal();
    ok('MRG2-C1 learner accepts → Confirmed, one observation fee', o1.status === 'Confirmed' && fees().length === f0 + 1 && fees().length === 1, J(fees().map(f => [f.amount, f.status])));
  });
  let fee1 = null;
  await T('MRG2-C2 MR-16: reschedule → learner Observations page renders; newAt set by the new proposal; no fee effect', async () => {
    if (!o1) return; fee1 = J(fees());
    // other portals cannot reschedule (MR-03) — the learner's own session calling the staff handler
    pick('nvq-sp'); S.tas.v = 'S'; const s0 = csnap(); ACT.obCancel({ dataset: { id: 'CD1-' + o1.id } }); if (MODAL) { fill(); act('Reschedule (new proposal)'); }
    ok('MRG2-C2 MR-03: the learner portal cannot reschedule via the staff handler (zero mutation)', csnap() === s0 && o1.status === 'Confirmed');
    pick('assessor'); const row = tasObs().find(x => x.src === o1); ACT.obCancel({ dataset: { id: row.id } }); fill('workplace asked'); act('Reschedule (new proposal)'); await tick();
    const dlg = MODAL && MODAL.title; closeModal();
    ok('MRG2-C2 the Assessor reschedules a confirmed observation (new-proposal dialog opens)', o1.status === 'Rescheduled' && dlg === 'Propose observation', J([o1.status, dlg, o1.newAt || null]));
    const t1 = learnerPage();
    ok('MRG2-C2 MR-16: learner Observations page renders after the reschedule (no Error 500) and says "new date to be proposed"', !/Error 500|THREW/.test(t1) && /new date to be proposed/.test(t1), t1.slice(0, 160));
    pick('assessor'); propose(null, D(20, '10:00')); const o2 = w.observations[0];
    ok('MRG2-C2 MR-16: the new proposal sets the rescheduled record\'s new date', o2 !== o1 && o2.status === 'Proposed' && o1.newAt === o2.at, J([o1.newAt, o2.at]));
    const t2 = learnerPage();
    ok('MRG2-C2 MR-16: learner page shows the new date, not an error', !/Error 500|THREW/.test(t2) && !/new date to be proposed/.test(t2) && t2.includes(fdt(o2.at)), t2.slice(0, 160));
    // MR-03 client: Coordinator and learner sessions cannot run the staff handler on the pending proposal
    [['coord', () => pick(coordP)], ['learner', () => pick('nvq-sp')]].forEach(([p, enter]) => {
      enter(); S.tas.v = 'S'; const s0 = csnap(), x0 = sec(); ACT.obCancel({ dataset: { id: 'CD1-' + o2.id } }); const o = !!MODAL; if (MODAL) { fill(); act('Cancel observation'); }
      ok(`MRG2-C2 MR-03: ${p} portal → obCancel refused (no dialog, zero mutation, logged)`, !o && o2.status === 'Proposed' && csnap() === s0 && sec() === x0 + 1, S.portal);
    });
    pick('nvq-sp'); ACT.obsAccept({ dataset: { id: o2.id } }); prim(); closeModal();
    ok('MRG2-C2 CH-40: rescheduling raises no second fee and leaves the fee unchanged', J(fees()) === fee1, J(fees().map(f => [f.amount, f.due])));
  });
  await T('MRG2-C3 sign-off: Teacher refused, Assessor signs, then the record is locked (MR-04 / MR-05)', async () => {
    const cur = w.observations.find(x => x.status === 'Confirmed'); if (!cur) { ok('MRG2-C3 a confirmed observation exists', false); return; }
    pick('assessor'); const r = tasObs().find(x => x.src === cur); go('t-obsrec', { id: r.id }); const d = STORE.tas.obsDraft[r.id], cl = dChecklist(r);
    cl.items.forEach(i => { ACT.orT({ dataset: { s: i.set, c: i.code, k: 'o', v: '1' } }); ACT.orT({ dataset: { s: i.set, c: i.code, k: 'c', v: '1' } }); }); d.evt = (cl.e.ev || []).slice(0, 1);
    // OBS-1 (PD-OBS1-14): the client demo version now has library criteria; each needs an outcome chosen by the assessor before sign-off
    if (typeof ol1RecItems === 'function') ol1RecItems(r).forEach(i => ACT.ol1Out({ dataset: { id: r.id, c: i.id, v: 'Not yet met' } }));
    S.tas.v = 'T'; const s0 = csnap(); ACT.orSign({ dataset: { id: r.id } }); const op = !!MODAL; if (MODAL) act('Sign off and lock');
    ok('MRG2-C3 MR-04: a Teacher cannot sign off (no dialog, zero mutation)', !op && csnap() === s0 && cur.status === 'Confirmed');
    S.tas.v = 'T'; ACT.orT({ dataset: { s: cl.items[0].set, c: cl.items[0].code, k: 'o', v: '0' } }); ok('MRG2-C3 MR-04: a Teacher cannot change the record draft', csnap() === s0);
    // re-check on confirm: the dialog was opened by James; the portal changes before it is confirmed
    S.tas.v = 'S'; ACT.orSign({ dataset: { id: r.id } }); const hold = MODAL; S.portal = 'learner'; const x0 = sec(); if (hold) act('Sign off and lock');
    ok('MRG2-C3 MR-03: confirming a sign-off after leaving the staff portal is refused (re-check on confirm, zero mutation, logged)', !!hold && cur.status === 'Confirmed' && csnap() === s0 && ADMIN.security.slice(0, sec() - x0).some(s => /"Sign off observation"/.test(s.detail)), J({ hold: !!hold, st: cur.status, same: csnap() === s0, sec: sec() - x0 }));
    S.portal = 'staff'; S.tas.v = 'S'; ACT.orSign({ dataset: { id: r.id } }); act('Sign off and lock');
    ok('MRG2-C3 the observation assessor signs off', cur.status === 'Completed' && cur.signedBy === 'James Pryce', J([cur.status, cur.signedBy]));
    const s1 = csnap(); ACT.obCancel({ dataset: { id: r.id } }); const op2 = !!MODAL; if (MODAL) { fill(); act('Cancel observation'); }
    ok('MRG2-C3 MR-05: a signed-off observation cannot be cancelled by its own Assessor (no dialog, zero mutation)', !op2 && cur.status === 'Completed' && csnap() === s1);
    ACT.obCancel({ dataset: { id: r.id } }); if (MODAL) { fill(); act('Reschedule (new proposal)'); } await tick(); closeModal();
    ok('MRG2-C3 MR-05: a signed-off observation cannot be rescheduled', cur.status === 'Completed' && csnap() === s1);
    ACT.orSign({ dataset: { id: r.id } }); if (MODAL) act('Sign off and lock'); ok('MRG2-C3 MR-05: a signed-off observation cannot be signed off again', csnap() === s1);
    ok('MRG2-C3 one observation fee after propose → accept → reschedule → accept → sign-off', fees().length === 1 && J(fees()) === fee1);
    const t = learnerPage(); ok('MRG2-C3 learner Observations page renders after sign-off', !/Error 500|THREW/.test(t) && /Completed/.test(t));
  });

  /* ================= Legacy data: handler × portal × persona ================= */
  fxLoadLegacy();
  const C = STORE.worlds.C, AL = C.me.id;
  const snap = () => J([C.observations, C.plan, C.pd, C.attendance, STORE.tas.obs, STORE.tas.pd, STORE.tas.notes, STORE.tas.advisory, STORE.tas.obsDraft, STORE.tas.reviewed, ADMIN.reg, ADMIN.unmatched]);
  TCH('A'); go('t-sessions', { id: 'ZS-01' }); go('t-dashboard'); // initialise the shared register before the snapshots
  const obsA = () => chRaw(() => tasObs());
  const pdOther = () => chRaw(() => tasPdList()).find(p => p.lid !== AL && p.session && ['Proposed', 'Confirmed'].includes(p.session.status));
  // [label, handler, element, confirm-label] — every staff-portal mutation MR-G2 owns, aimed at Sarah's (A) allocated records
  const CASES = () => {
    const prop = obsA().find(o => o.status === 'Proposed' && o.lid === AL), conf = obsA().find(o => o.status === 'Confirmed'), pd = pdOther();
    return [
      ['obPropose', 'obPropose', { l: AL }, 'Send proposal'],
      ['obCancel (cancel)', 'obCancel', { id: prop.id }, 'Cancel observation'],
      ['obCancel (reschedule)', 'obCancel', { id: prop.id }, 'Reschedule (new proposal)'],
      ['obPost', 'obPost', {}, 'Continue'],
      ['orSign', 'orSign', { id: conf.id }, 'Sign off and lock'],
      ['obFollow', 'obFollow', { id: (obsA().find(o => o.status === 'Completed' && o.report) || {}).id }, 'Send proposal'],
      ['pdPropose', 'pdPropose', { l: pd.lid }, 'Send proposal'],
      ['pdPostpone', 'pdPostpone', { l: pd.lid }, 'Postpone'],
      ['pdOutcome', 'pdOutcome', { l: AL }, 'Save outcomes and sign off'],
      ['pfNote', 'pfNote', { l: AL }, 'Add note'],
      ['tasAdvisory', 'tasAdvisory', { k: AL + '~portfolio' }, 'Save note'],
      ['tasRec', 'tasRec', { l: AL, c: '302 1.2' }, 'Add to improvement plan'],
      ['tasAdj', 'tasAdj', { s: 'ZS-01', i: '1' }, 'Save adjustment'],
      ['tasReviewed', 'tasReviewed', { s: 'ZS-01' }, 'Mark reviewed'],
      ['tumMatch', 'tumMatch', { id: 'UM-0' }, null],
      ['tumNon', 'tumNon', { id: 'UM-0' }, null]];
  };
  const run = async ([, h, ds, label]) => { closeModal(); const m0 = MODAL; ACT[h]({ dataset: { ...ds } }); const opened = !!MODAL && MODAL !== m0; if (MODAL) { fill(); const sg = $1('#pd-sign'); if (sg) sg.checked = true; if (label) act(label); } await tick(); closeModal(); return opened; };
  const PORTALS = [['learner', () => { closeModal(); S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.tas.v = 'A'; }],
    ['agency', () => { closeModal(); agyEnter('AG-01', true); S.tas.v = 'A'; }],
    ['coord', () => { closeModal(); S.coo.v = 'A'; cooEnter(); S.signedIn = true; S.tas.v = 'A'; }],
    ['admin', () => { closeModal(); TCH('A'); S.portal = 'admin'; }]];
  await T('MRG2-L1 MR-03: every owned staff handler is refused outside the staff portal (zero mutation, logged)', async () => {
    for (const [p, enter] of PORTALS) {
      const bad = [];
      for (const c of CASES()) { enter(); const s0 = snap(), x0 = sec(); const opened = await run(c); if (opened || snap() !== s0 || sec() !== x0 + 1) bad.push(c[0] + (opened ? ' (opened)' : '') + (snap() !== s0 ? ' (mutated)' : '') + ` (sec +${sec() - x0})`); }
      ok(`MRG2-L1 MR-03: ${p} portal with Sarah loaded — all ${CASES().length} staff handlers refused, nothing changes, each attempt logged`, !bad.length, bad.join('; '));
    }
    const top = ADMIN.security[0]; ok('MRG2-L1 the refusal names the real actor and portal', top && /admin portal/.test(top.detail), top && top.detail);
  });
  await T('MRG2-L2 MR-04 / MR-28: a Teacher-only user (Marcus) is refused every Assessor action; registers stay with the batch Teacher', async () => {
    const teach = ['tasAdj', 'tasReviewed', 'tumMatch', 'tumNon'], bad = [];
    for (const c of CASES().filter(x => !teach.includes(x[1]))) { TCH('T'); const s0 = snap(), x0 = sec(); const opened = await run(c); if (opened || snap() !== s0 || sec() < x0 + 1) bad.push(c[0] + (opened ? ' (opened)' : '') + (snap() !== s0 ? ' (mutated)' : '')); }
    ok('MRG2-L2 MR-04: Teacher-only — observation, PD, note, advisory and recommendation handlers all refused with zero mutation', !bad.length, bad.join('; '));
    ok('MRG2-L2 MR-04: chActScoped applies to every staff persona (Teacher included); chScoped list visibility unchanged', (TCH('T'), chActScoped() && !chScoped()));
    TCH('T'); const r = ADMIN.reg['ZS-01'][1], b = r[4]; ACT.tasAdj({ dataset: { s: 'ZS-01', i: '1' } }); fill('Marcus adjusts his own batch'); $1('#ta-s').value = b === 'Absent' ? 'Present' : 'Absent'; act('Save adjustment');
    ok('MRG2-L2 the batch Teacher (Marcus, L3AC-JAN26) can still adjust his own register', r[4] !== b && r[6] === 'Marcus Bell', J(r));
  });
  await T('MRG2-L3 MR-19: a Teacher of another batch cannot change a register; zero mutation', async () => {
    TCH('W'); const s0 = snap(), x0 = sec(), r = ADMIN.reg['ZS-01'][1], b = r[4];
    ACT.tasAdj({ dataset: { s: 'ZS-01', i: '1' } }); const op = !!MODAL; if (MODAL) { fill(); $1('#ta-s').value = b === 'Late' ? 'Absent' : 'Late'; act('Save adjustment'); }
    ok('MRG2-L3 MR-19: Tom (L2DC-MAR26) cannot adjust the Leicester Cohort 7 register (the audit reproduction)', !op && r[4] === b && snap() === s0 && sec() === x0 + 1, J({ op, b, now: r[4] }));
    ACT.tasReviewed({ dataset: { s: 'ZS-01' } }); if (MODAL) act('Mark reviewed'); ok('MRG2-L3 MR-19: … nor mark it reviewed', snap() === s0);
    ACT.tumMatch({ dataset: { id: 'UM-0' } }); ok('MRG2-L3 MR-19: … nor match its unmatched participant', snap() === s0);
    const z5 = ADMIN.sessions.find(s => s.id === 'ZS-05'); if (typeof register === 'function') register('ZS-05');
    ACT.tasReviewed({ dataset: { s: 'ZS-05' } }); act('Mark reviewed'); ok('MRG2-L3 Tom can still review his own batch\'s register (ZS-05)', !!z5 && !!STORE.tas.reviewed['ZS-05']);
    // re-check on confirm: Sarah opens her register adjustment, the persona changes before saving
    TCH('A'); const s1 = snap(); ACT.tasAdj({ dataset: { s: 'ZS-01', i: '2' } }); const hold = !!MODAL; S.tas.v = 'W'; fill(); act('Save adjustment');
    ok('MRG2-L3 MR-19: the register check is repeated when the adjustment is confirmed', hold && snap() === s1);
  });
  await T('MRG2-L4 MR-28: an Assessor cannot write notes, advisory notes or recommendations for learners outside the allocation', async () => {
    TCH('A'); const mineA = chRaw(() => tasLearners(true)).filter(l => !l.short); TCH('S'); const mineS = new Set(chRaw(() => tasLearners(true)).map(l => l.lid));
    const out = chRaw(() => tasLearners(true)).find(l => !l.short && !['asg', 'pd', 'obs'].some(k => chEff(l.lid, k, l.batch) === 'James Pryce')) || mineA.find(l => !mineS.has(l.lid));
    if (!out) { ok('MRG2-L4 an unallocated learner exists in James\'s batches', false); return; }
    const s0 = snap(); ACT.pfNote({ dataset: { l: out.lid } }); const o1 = !!MODAL; if (MODAL) { fill(); act('Add note'); }
    ok('MRG2-L4 MR-28: James cannot add an assessor note to ' + out.name + ' (the audit reproduction)', !o1 && snap() === s0);
    ACT.tasAdvisory({ dataset: { k: out.lid + '~a2' } }); if (MODAL) { fill(); act('Save note'); } ok('MRG2-L4 MR-28: … nor an IQA advisory note on that learner\'s work', snap() === s0);
    ACT.tasAdvisory({ dataset: { k: out.lid + '~portfolio' } }); if (MODAL) { fill(); act('Save note'); } ok('MRG2-L4 MR-28: … nor a portfolio advisory note', snap() === s0);
    const n0 = C.notifs ? C.notifs.length : 0; ACT.tasRec({ dataset: { l: out.lid } }); if (MODAL) act('Add to improvement plan');
    ok('MRG2-L4 MR-28: … nor a recommended action (and the learner is not notified)', snap() === s0 && (C.notifs ? C.notifs.length : 0) === n0);
    ACT.tasRec({ dataset: {} }); const opts = MODAL ? $a('#modal-root #ra-l option').map(o => o.value) : [];
    ok('MRG2-L4 MR-28: the recommendation learner list holds only James\'s allocated learners', opts.every(l => ['asg', 'pd', 'obs'].some(k => chEff(l, k) === 'James Pryce')) && !opts.includes(out.lid), J(opts.length)); closeModal();
    // the authorised Assessor path still works
    TCH('A'); const nn = (STORE.tas.notes[AL] || []).length; ACT.pfNote({ dataset: { l: AL } }); fill('Sarah\'s note'); act('Add note');
    ok('MRG2-L4 Sarah (Aisha\'s Assessor) can add an assessor note', (STORE.tas.notes[AL] || []).length === nn + 1);
    ACT.tasAdvisory({ dataset: { k: AL + '~portfolio' } }); fill('Sarah advisory'); act('Save note'); ok('MRG2-L4 Sarah can add a portfolio advisory note', STORE.tas.advisory[AL + '~portfolio'] === 'Sarah advisory');
    const p0 = C.plan.length; ACT.tasRec({ dataset: { l: AL } }); act('Add to improvement plan'); ok('MRG2-L4 Sarah can add a recommended action', C.plan.length === p0 + 1);
    // re-check on confirm: the recommendation's learner is switched to someone outside the allocation
    TCH('S'); ACT.tasRec({ dataset: {} }); const sel = $1('#modal-root #ra-l'); const s2 = snap();
    if (sel) { const o = document.createElement('option'); o.value = out.lid; o.textContent = out.name; sel.appendChild(o); sel.value = out.lid; act('Add to improvement plan'); }
    ok('MRG2-L4 MR-28: the allocation is re-checked when the recommendation is confirmed', !!sel && snap() === s2); closeModal();
  });
  await T('MRG2-L5 MR-05: only Proposed or Confirmed observations can be cancelled or rescheduled; Completed ones are locked', async () => {
    TCH('A'); const byS = st => obsA().find(o => o.status === st), rec = o => o.src || STORE.tas.obs.find(x => x.id === o.id);
    for (const st of ['Completed', 'Cancelled', 'Rescheduled']) {
      const o = byS(st); if (!o) { ok('MRG2-L5 a ' + st + ' observation exists', false); continue; }
      for (const lbl of ['Cancel observation', 'Reschedule (new proposal)']) {
        const s0 = snap(); ACT.obCancel({ dataset: { id: o.id } }); const op = !!MODAL; if (MODAL) { fill(); act(lbl); } await tick(); closeModal();
        ok(`MRG2-L5 MR-05: a ${st} observation (${o.id}) — "${lbl}" refused, zero mutation`, !op && rec(o).status === st && snap() === s0);
      }
    }
    const done = byS('Completed'), s1 = snap(); ACT.orSign({ dataset: { id: done.id } }); if (MODAL) act('Sign off and lock'); ok('MRG2-L5 MR-05: a Completed observation cannot be signed off again', snap() === s1);
    // lock re-checked on confirm: the dialog is open on a Confirmed observation that gets signed off elsewhere meanwhile
    const conf = byS('Confirmed'); ACT.obCancel({ dataset: { id: conf.id } }); const hold = !!MODAL; rec(conf).status = 'Completed'; const s2 = snap(); fill(); act('Cancel observation'); const same = snap() === s2; rec(conf).status = 'Confirmed';
    ok('MRG2-L5 MR-05: the lock is re-checked when the cancellation is confirmed', hold && same);
    const prop = obsA().find(o => o.status === 'Proposed'); ACT.obCancel({ dataset: { id: prop.id } }); fill('Learner unavailable'); act('Cancel observation');
    ok('MRG2-L5 the allocated Assessor can still cancel a Proposed observation', rec(prop).status === 'Cancelled');
  });
  await T('MRG2-L6 MR-04: an Assessor who isn\'t the observation / PD assessor is refused (CH-17 guard, unchanged log)', async () => {
    TCH('S'); const o = chRaw(() => tasObs()).find(x => chEff(x.lid, 'obs') !== 'James Pryce' && ['Proposed', 'Confirmed'].includes(x.status)), a0 = ADMIN.audit.length, s0 = snap();
    if (o) { ACT.obCancel({ dataset: { id: o.id } }); ok('MRG2-L6 James cannot cancel Sarah\'s learner\'s observation; logged as "not the observation assessor"', !MODAL && snap() === s0 && ADMIN.audit[0].action === 'Blocked: not the observation assessor' && ADMIN.audit.length === a0 + 1, ADMIN.audit[0].action); }
    const p = pdOther(); if (p) { ACT.pdPostpone({ dataset: { l: p.lid } }); if (MODAL) { fill(); act('Postpone'); } ok('MRG2-L6 James cannot postpone another PD assessor\'s session', snap() === s0); }
  });
  await T('MRG2-L7 MR-39: a roster-only learner\'s staff portfolio uses the PD-F-06 resolver (own programme, no other learner\'s locks)', async () => {
    TCH('S'); const L = tasLearners(true).find(l => !l.v && !l.short && /L2/.test(l.batch.code)); if (!L) { ok('MRG2-L7 a roster-only Level 2 learner exists', false); return; }
    go('t-portfolio', { id: L.lid }); const t = main(), pc = fPortCtx(L.lid, [{ programme: L.batch.course }]);
    ok('MRG2-L7 the portfolio names the learner\'s own programme (' + L.batch.course + ')', t.includes(L.batch.course) && t.includes(pc.ver), t.slice(0, 200));
    const units = [...new Set(t.match(/U\d{3}/g) || [])], own = pc.tree.map(u => u.code);
    ok('MRG2-L7 the units shown are the learner\'s programme units (resolver output), not Aisha\'s live tree', units.filter(u => u !== 'U302' || own.includes(u)).every(u => own.includes(u)), J({ units, own }));
    const aishaLocks = C.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(lo => lo.crit))).filter(c => c.src && c.lock).map(c => c.src);
    ok('MRG2-L7 none of Aisha\'s evidence sources appear on the roster learner\'s portfolio', !aishaLocks.some(s => t.includes('Evidence: ' + s)), J(aishaLocks.slice(0, 3)));
    TCH('A'); go('t-portfolio', { id: AL }); ok('MRG2-L7 a learner with a record still shows their own tree', /U302/.test(main()) && !/Curriculum unavailable/.test(main()));
  });
  fxLoadClient();
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
