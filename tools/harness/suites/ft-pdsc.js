// PDS — the Assessor chooses which eligible criteria go to the Professional Discussion, client demo (FIXTURE=client; real reload, Reset).
// Assignment 3 is mapped per question (Q1 → 001 1.2 and 001 1.1, Q2 → 001 1.2) and published; Dev submits. The Coordinator publishes Met
// on 001 1.2 (it stays eligible). The Assessor refers Q1: nothing chosen → publishing blocked; both chosen; 001 1.1 then verified Met →
// the choice is stale and publishing is blocked (nothing changed silently); 001 1.1 unticked; Q2 also refers 001 1.2. On release one PD
// item (Q1, Q2), 001 1.1 Achieved (never "Added to PD"). Amira: an already-open item isn't duplicated; an older draft without a choice
// must choose; the release queue waits for the Assessor's choice. Other roles and ineligible choices are refused by direct call.
(async function () {
  const SS = window.sessionStorage, K = 'ft-pdsc.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'PDS test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`), 'sign in ' + p); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length, since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const crPd = (v = '2026-12-20T21:59') => $a('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const subm = (p, id) => { pick(p); go('assignment', { id }); $a('main .paper .rte-body').forEach((b, k) => { b.innerHTML = `<p>PDS answer ${k + 1}.</p>`; INP.rteInput(b); }); fxFast(ff => { ACT.reviewSubmit({ dataset: { id } }); prim(); ff(16500); }); closeModal(); };
  const keyOf = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };
  const crit = (v, code) => withW(v, () => allCrit()).find(c => c.code === code) || {};
  const AM = 'IA-L-32000', DV = 'IA-L-32001', C1 = '001 1.1', C2 = '001 1.2';
  const copy = (v, id) => STORE.worlds[v].assignments.find(x => x.id === id);
  const its = (v, id) => STORE.worlds[v].pd.items.filter(i => i.go === 'assignment.' + id);
  const exitTo = (k, qid, v) => INP.mkExit({ dataset: { k, q: qid }, value: v });
  const fld = (k, qid, f, v) => INP.mkField({ dataset: { k, q: qid, f }, value: v });
  const box = qid => q(`.pds-pick[data-q="${qid}"]`), boxIn = (qid, c) => box(qid) && box(qid).querySelector(`input[data-c="${c}"]`);
  const pdc = (k, qid) => ((dft(k).items || {})[qid] || {}).pdCrit;
  const blocked = (a0, re) => since(a0).some(x => x.action === 'Blocked: publish feedback' && re.test(J(x)));

  if (PH === 0) {
    let kD, kA10, kA11, q1, q2;
    await T('PDS-0 setup', async () => {
      pick('aca'); const d = s2Def('a12'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); setUi('cbr2A.a12', '1'); render();
      ACT.s2QAdd({ dataset: { id: 'a12' } }); fill({ '#aq-t': 'Describe how you would review a care plan.' }); press();
      [q1, q2] = d.qs.filter(x => x.status === 'Active').map(x => x.id); setUi('cbr2A.a12', '1'); render();
      click(q(`details.cbr2-a[data-id="a12"] .cbr2-q[data-q="${q1}"] input[data-c="${C1}"]`), 'Q1 → 1.1'); click(q(`details.cbr2-a[data-id="a12"] .cbr2-q[data-q="${q2}"] input[data-c="${C2}"]`), 'Q2 → 1.2');
      click(q('details.cbr2-a[data-id="a12"] [data-act="pubAsg"]'), 'Publish'); crPd(); reason('Publish two-question assessment');
      ok('PDS-0 Assignment 3 published per question: Q1 → 001 1.2 + 001 1.1, Q2 → 001 1.2', d.status === 'Published' && J(d.qs.find(x => x.id === q1).crit.slice().sort()) === J([C1, C2]) && J(d.qs.find(x => x.id === q2).crit) === J([C2]), J(d.qs.map(x => x.crit)));
      subm('nvq-fa', 'a12'); subm('nvq-sp', 'a10'); subm('nvq-sp', 'a11'); kD = keyOf(DV, 'a12'); kA10 = keyOf(AM, 'a10'); kA11 = keyOf(AM, 'a11');
      ok('PDS-0 Dev submitted Assignment 3; Amira submitted Assignments 1 and 2', ['a12'].every(id => copy('CD2', id).status === 'Submitted') && ['a10', 'a11'].every(id => copy('CD1', id).status === 'Submitted') && !!kD && !!kA10 && !!kA11);
    });
    await T('PDS-1 Coordinator-only Met', async () => {
      pick('coord1'); go('c-sub', { id: kD }); fill({ [`#r3-cv-${q2}`]: 'Met', [`#r3-ct-${q2}`]: 'Clear review steps.' }); click(q(`[data-act="r3CooJudge"][data-q="${q2}"]`), 'publish Met');
      ok('PDS-1 the Coordinator published Met on 001 1.2', r3Judg(kD).some(j => j.role === 'Academic Coordinator' && j.crit === C2 && j.value === 'Met' && j.published));
    });
    await T('PDS-2 choosing', async () => {
      TCH('S'); go('t-mark', { id: kD }); S.tas.qi = 0; exitTo(kD, q1, 'pd'); fld(kD, q1, 'pdReason', 'Discuss both care-plan points'); go('t-mark', { id: kD });
      ok('PDS-2 "Added to PD" offers Q1\'s mapped criteria to choose (one or more), nothing chosen for the Assessor', !!box(q1) && $a(`main .pds-pick[data-q="${q1}"] input`).map(x => x.dataset.c).sort().join() === [C1, C2].sort().join() && /None selected/.test(box(q1).textContent) && !pdc(kD, q1));
      ok('PDS-2 the Coordinator\'s Met doesn\'t exclude 001 1.2 (it isn\'t the Assessor\'s decision)', !boxIn(q1, C2).disabled);
      ACT.mkRag({ dataset: { k: kD, q: q1, v: 'A' } }); fld(kD, q1, 'fb', 'Covered in PD'); ACT.mkRag({ dataset: { k: kD, q: q2, v: 'A' } }); fld(kD, q2, 'fb', 'Partly there'); exitTo(kD, q2, 'pass');
      const a0 = aud(); ACT.mkRelease({ dataset: { k: kD } }); closeModal();
      ok('PDS-3 publishing without a chosen criterion is blocked, saying what to do (logged); nothing released', blocked(a0, /Q1: choose at least one criterion for the Professional Discussion/) && copy('CD2', 'a12').status === 'Submitted', J(since(a0).map(x => x.reason)));
      go('t-mark', { id: kD }); click(boxIn(q1, C2), 'tick 1.2'); click(boxIn(q1, C1), 'tick 1.1');
      const x = dft(kD).items[q1]; ok('PDS-4 several criteria chosen, stored as stable codes with who and when', J(x.pdCrit.slice().sort()) === J([C1, C2]) && x.pdBy === 'James Pryce' && !!x.pdAt && /2 criteria selected/.test(box(q1).textContent));
      // the Assessor then verifies 001 1.1 as Met on Q1: the choice is no longer valid — blocked, not changed
      ACT.mkMet({ dataset: { k: kD, q: q1, c: C1, v: 'Met' } }); ACT.mkVerify({ dataset: { k: kD, q: q1, c: C1 } }); press(); go('t-mark', { id: kD });
      const a1 = aud(); ACT.mkRelease({ dataset: { k: kD } }); closeModal();
      ok('PDS-5 stale choice (001 1.1 verified Met after it was chosen): publishing is blocked with what to untick; the choice is unchanged', blocked(a1, /001 1\.1 \(verified Met in this marking\) is no longer eligible/) && J(pdc(kD, q1).slice().sort()) === J([C1, C2]) && /no longer eligible — untick it/.test(box(q1).textContent) && copy('CD2', 'a12').status === 'Submitted');
      const s0 = sec(); INP.pdsPick({ checked: true, dataset: { k: kD, q: q1, c: C1 } }); ok('PDS-5 …re-choosing it by a direct call is refused', J(pdc(kD, q1).slice().sort()) === J([C1, C2]) && since(a1).some(x => x.action === 'Blocked: choose PD criteria'));
      click(boxIn(q1, C1), 'untick 1.1'); ok('PDS-5 unticking is allowed', J(pdc(kD, q1)) === J([C2]));
      ACT.mkMet({ dataset: { k: kD, q: q1, v: 'Not Met' } }); S.tas.qi = 1; exitTo(kD, q2, 'pd'); fld(kD, q2, 'pdReason', 'Review steps in PD'); ACT.mkMet({ dataset: { k: kD, q: q2, v: 'Partially Met' } }); go('t-mark', { id: kD }); click(boxIn(q2, C2), 'Q2 tick 1.2');
      const pd0 = STORE.worlds.CD2.pd.items.length; ACT.mkRelease({ dataset: { k: kD } }); press();
      const it = its('CD2', 'a12');
      ok('PDS-6 released: one open PD item for 001 1.2, shared by Q1 and Q2 (no duplicate across questions), with both reasons and the Assessor', it.length === 1 && it[0].ref === C2 && /Q1, Q2$/.test(it[0].from) && /Discuss both care-plan points/.test(it[0].reason) && /Review steps in PD/.test(it[0].reason) && it[0].by === 'James Pryce' && STORE.worlds.CD2.pd.items.length === pd0 + 1, J(it));
      ok('PDS-6 001 1.1 (verified Met, not chosen) is Achieved and locked — never "Added to PD"; 001 1.2 is Added to PD', crit('CD2', C1).st === 'Achieved' && (crit('CD2', C1).lock || {}).by === 'James Pryce' && crit('CD2', C2).st === 'Added to PD' && !it.some(i => i.ref === C1), J([crit('CD2', C1).st, crit('CD2', C2).st]));
      ok('PDS-6 the questions keep their exits; no final Pass / Fail; the Coordinator\'s Met is kept', copy('CD2', 'a12').status === 'Feedback Received' && copy('CD2', 'a12').qs.every(x => x.state === 'pd') && !r3Out(kD) && r3Judg(kD).some(j => j.role === 'Academic Coordinator' && j.crit === C2 && j.value === 'Met'));
      ok('PDS-6 the copy records what each answer referred', J(copy('CD2', 'a12').qs.map(x => x.pdCrit)) === J([[C2], [C2]]));
    });
    await T('PDS-7 earlier open item', async () => {
      const W1 = STORE.worlds.CD1, a = copy('CD1', 'a10'), c = qCrits(a.qs[0])[0];
      W1.pd.items.unshift({ ref: c, unit: 'U001', from: 'Assignment 1 · Q1 (earlier round)', reason: 'Earlier referral', status: 'Open', go: 'assignment.a10', by: 'Sarah Okonkwo', at: '2026-09-01T09:00:00.000Z', aid: 'a10' }); // (setup) an open item from an earlier round
      const before = J(W1.pd.items.find(i => i.reason === 'Earlier referral'));
      TCH('S'); go('t-mark', { id: kA10 }); markable(tasAsg(r3StaffSub(kA10))).forEach((x, n) => { ACT.mkRag({ dataset: { k: kA10, q: x.id, v: 'A' } }); exitTo(kA10, x.id, n ? 'pass' : 'pd'); });
      fld(kA10, a.qs[0].id, 'pdReason', 'Again in PD'); INP.pdsPick({ checked: true, dataset: { k: kA10, q: a.qs[0].id, c } }); ACT.mkRelease({ dataset: { k: kA10 } }); press();
      const open = W1.pd.items.filter(i => i.ref === c && i.go === 'assignment.a10' && i.status === 'Open');
      ok('PDS-7 an open item for the same learner, assignment and criterion isn\'t duplicated; the earlier record is unchanged', open.length === 1 && J(open[0]) === before && copy('CD1', 'a10').status === 'Feedback Received', J(open));
    });
    await T('PDS-8 release queue and older draft', async () => {
      TCH('S'); go('t-mark', { id: kA11 }); const a = tasAsg(r3StaffSub(kA11)), q0 = a.qs[0].id, d = dft(kA11);
      markable(a).forEach((x, n) => { d.items[x.id] = { ...(d.items[x.id] || {}), rag: 'A', fb: 'Older draft', exit: n ? 'pass' : 'pd', ...(n ? {} : { pdReason: 'Older draft referral' }) }; }); mkSaved(d); // (setup) a draft saved by the previous build — no PD choice
      relStore()[kA11] = { key: kA11, draft: JSON.parse(J(d)), by: 'James Pryce', tasV: 'S', sentAt: now().toISOString(), offs: {}, learner: 'Amira Shah (demo)', lid: AM, v: 'CD1', batch: 'DEMO-L3-JAN27', batchLabel: 'DEMO-L3-JAN27', aid: 'a11', title: a.title, round: 'Sub 1', live: true }; // (setup) queued before direct publication
      pick('coord1'); const a0 = aud(); const r = releaseNow(kA11);
      ok('PDS-8 the release queue won\'t release marking whose PD criteria weren\'t chosen: it stays queued, unchanged (logged)', r === false && !!relStore()[kA11] && copy('CD1', 'a11').status === 'Submitted' && since(a0).some(x => x.action === 'Blocked: release (PD criteria)'));
      delete relStore()[kA11]; TCH('S'); const a1 = aud(); ACT.mkRelease({ dataset: { k: kA11 } }); closeModal();
      ok('PDS-9 an older unreleased draft without a PD choice must choose before publishing', blocked(a1, /choose at least one criterion/) && copy('CD1', 'a11').status === 'Submitted');
      go('t-mark', { id: kA11 }); S.tas.qi = 0; render(); const c = $a(`main .pds-pick[data-q="${q0}"] input:not([disabled])`)[0];
      click(c, 'choose'); ACT.mkRelease({ dataset: { k: kA11 } }); press();
      ok('PDS-9 …once chosen it publishes and refers only that criterion', copy('CD1', 'a11').status === 'Feedback Received' && J(its('CD1', 'a11').map(i => i.ref)) === J([c.dataset.c]));
    });
    await T('PDS-10 refusals', async () => {
      const s0 = sec(), sel0 = J(dft(kD).items);
      for (const p of ['coord1', 'aca', 'nvq-fa']) { pick(p); INP.pdsPick({ checked: true, dataset: { k: kD, q: q1, c: C2 } }); }
      TCH('T'); INP.pdsPick({ checked: true, dataset: { k: kD, q: q1, c: C2 } });
      ok('PDS-10 Coordinator, Academic Admin, learner and Teacher can\'t choose PD criteria (refused, security log)', sec() === s0 + 4);
      // Amira's Assignment 3: nothing submitted; Amira's Assignment 1 is released (read-only)
      TCH('S'); const kA12 = keyOf(AM, 'a12'), s1 = sec(); INP.pdsPick({ checked: true, dataset: { k: kA12, q: q1, c: C2 } });
      ok('PDS-10 nothing submitted: refused (security log)', sec() === s1 + 1 && !pdc(kA12, q1));
      const a0 = aud(); INP.pdsPick({ checked: true, dataset: { k: kA10, q: 'q1', c: C1 } });
      ok('PDS-10 a released (read-only) submission: refused', since(a0).some(x => x.action === 'Blocked: choose PD criteria' && /read-only/.test(x.reason || '')) && !pdc(kA10, 'q1'));
    });
    await T('PDS-11 downstream', async () => {
      TCH('S'); go('t-students', { id: DV, tab: 'pd' }); ok('PDS-11 the Assessor\'s PD checklist for Dev lists 001 1.2 from Q1, Q2', /001 1\.2[^]*Assignment 3 · Q1, Q2/.test(main()));
      pick('coord1'); go('c-sub', { id: kD }); ok('PDS-11 the Coordinator\'s PD panel lists 001 1.2 once and not 001 1.1 (read-only)', $a('main .co1-pd .co1-pd-row').map(x => x.dataset.crit).join() === C2 && !q('.co1-pd button'), $a('main .co1-pd .co1-pd-row').map(x => x.dataset.crit).join());
      pick('nvq-fa'); go('progress', { tab: 'pd' }); ok('PDS-11 Dev\'s PD checklist has 001 1.2 (Open) — no rework', /001 1\.2[^]*Open/.test(main()));
      go('assignment', { id: 'a12' }); ok('PDS-11 Dev\'s assignment is Feedback Received with both answers in the PD', /Feedback Received/.test(main()) && /Added to Professional Discussion/.test(main()));
      TCH('S'); ACT.pdOutcome({ dataset: { l: DV } }); const k = $a('#modal-root .card.flat').findIndex(x => x.textContent.includes(C2)); $1(`#modal-root input[name="pdo-${k}"][value="Met"]`).checked = true; $1('#pd-sign').checked = true; press();
      ok('PDS-12 the PD outcome (Met, signed off) achieves 001 1.2 and closes the item', its('CD2', 'a12')[0].status === 'Achieved' && crit('CD2', C2).st === 'Achieved' && !!its('CD2', 'a12')[0].outcome, J(its('CD2', 'a12')));
      pick('iqa'); go('q-record', { id: 'L-CD2-a12' }); ok('PDS-13 IQA opens Dev\'s marked Assignment 3 record', /Assignment 3/.test(main()) && !/don't have access|went wrong/.test(main()));
    });
    SS.setItem(K + 'k', J([kD, kA11])); signOutUI(); return next(1);
  }

  if (PH === 1) {
    const [kD] = JSON.parse(SS.getItem(K + 'k') || '[]');
    await T('PDS-R refresh and Reset', async () => {
      ok('PDS-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('PDS-R the PD items, outcome and the referred criteria per answer are kept', its('CD2', 'a12').length === 1 && its('CD2', 'a12')[0].status === 'Achieved' && J(copy('CD2', 'a12').qs.map(x => x.pdCrit)) === J([[C2], [C2]]) && crit('CD2', C1).st === 'Achieved' && its('CD1', 'a11').length === 1);
      pick('coord1'); go('c-sub', { id: kD }); ok('PDS-R the Coordinator\'s PD panel is unchanged after the refresh', $a('main .co1-pd .co1-pd-row').map(x => x.dataset.crit).join() === C2);
      ACT.resetDemo(); closeModal();
      ok('PDS-R Reset restores the starting demo (no PDS items, Assignment 3 a one-question Draft)', !its('CD2', 'a12').length && !its('CD1', 'a11').length && s2Def('a12').status === 'Draft' && s2Def('a12').qs.filter(x => x.status === 'Active').length === 1);
    });
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'k');
})();
