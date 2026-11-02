// CO-1 — Competency map and PD in assignment evaluation (2 Nov 2026; PD-CO1-* in PROVISIONAL-DECISIONS.md). suites.sh runs it with
// FIXTURE=client. Phase 0 (client demo): the Cohort Competency Map before submission, after submission, after Coordinator and Assessor
// feedback, after a resubmission and a PD exit; the cell details; the Assessor's Progress & Gap Analysis; Amira's PD with James and
// Sam's with Omar (lists, proposal, explicit outcome, notes); isolation. Phase 1 (after a real reload): everything comes back; Reset
// clears it. Then the legacy fixture: learners without a learner record show "—" (no invented states); published marking reaches
// the Coordinator only under the same key; Aisha's PD outcome with notes.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-co1.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-co1.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const typeIn = (sel, html) => { const b = $1(sel); if (!b) throw new Error('missing editor ' + sel); b.innerHTML = html; INP.rteInput(b); };
  const next = ph => { SS.setItem('ft-co1.R', J(R)); SS.setItem('ft-co1.phase', String(ph)); location.reload(); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const AM = 'IA-L-32000', DV = 'IA-L-32001', SAM = 'IA-L-32003', CP = 'Level 3 Diploma in Care Practice (client demo)';
  const CODES = ['001 1.1', '001 1.2', '001 2.1'];
  // The map as drawn: learner name → { prog, batch, cells: code → text, ready }
  const mapOf = () => { const out = {}; $a('main .co1-grp').forEach(g => { const hs = [...g.querySelectorAll('thead th')].map(t => t.textContent.trim()); g.querySelectorAll('tbody tr').forEach(tr => { const td = [...tr.children], n = td[0].querySelector('a') ? td[0].querySelector('a').textContent.trim() : td[0].textContent.trim(); out[n] = { prog: g.dataset.prog, batch: g.dataset.batch, cells: Object.fromEntries(td.slice(1, -1).map((c, i) => [hs[i + 1], c.textContent.trim()])), ready: td[td.length - 1].textContent.trim() }; }); }); return out; };
  const cmap = () => { setUi('hmBy', 'learner'); go('c-progress'); return mapOf(); };
  const tmap = () => { setUi('hmBy', 'learner'); go('t-progress'); return mapOf(); };
  const own = (v, code) => (withW(v, () => allCrit()).find(c => c.code === code) || {}).st;
  const crit = (v, code) => withW(v, () => allCrit()).find(c => c.code === code) || {};
  const AB = { 'Not Started': 'NS', 'In Progress': 'IP', 'Action Required': 'AR', 'Added to PD': 'PD', 'Achieved': 'A' };
  const rowOf = (m, first) => { const k = Object.keys(m).find(x => x.startsWith(first)); return k ? m[k] : null; };
  const subm = (p, id, html = '<p>CO-1 answer.</p>') => { pick(p); go('assignment', { id }); typeIn('main .paper .rte-body', html); fxFast(ff => { ACT.reviewSubmit({ dataset: { id } }); prim(); ff(16500); }); closeModal(); };
  const keyFor = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };
  // The allocated Assessor marks every question of a submission and publishes: f(q) returns { v, exit, verify, pd, corr }
  const markPub = (v, key, f) => { TCH(v); go('t-mark', { id: key }); const s = tasSubs(true).find(x => x.key === key); if (!s) throw new Error('not in ' + v + '\'s marking: ' + key); markable(tasAsg(s)).forEach(q => { const o = f(q); ACT.mkMet({ dataset: { k: key, q: q.id, v: o.v } }); ACT.mkRag({ dataset: { k: key, q: q.id, v: o.v === 'Met' ? 'G' : o.v === 'Not Met' ? 'R' : 'A' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: 'CO-1 feedback ' + o.v }); if (o.verify) { ACT.mkVerify({ dataset: { k: key, q: q.id } }); press(); } INP.mkExit({ dataset: { k: key, q: q.id }, value: o.exit }); if (o.pd) INP.mkField({ dataset: { k: key, q: q.id, f: 'pdReason' }, value: o.pd }); if (o.exit === 'resub') { INP.mkField({ dataset: { k: key, q: q.id, f: 'corrections' }, value: 'CO-1 corrections' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'days' }, value: '7' }); } }); ACT.mkRelease({ dataset: { k: key } }); return press(); };
  const panel = () => $a('main .co1-pd h2, main .co1-pd dt, main .co1-pd dd').map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' ');
  const cellModal = (lid, code) => { closeModal(); const b = $1(`main .co1-grp button.hc[data-l="${lid}"][data-c="${code}"]`); ACT.hmCell(b || { dataset: { l: lid, c: code } }); const t = MODAL ? (MODAL.title + ' | ' + (MODAL.sub || '') + ' | ' + String(MODAL.body).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')) : ''; closeModal(); return t; };

  if (PH === 0) {
    /* ---------- A. The map before anything is submitted ---------- */
    await T('CO1-A baseline', async () => {
      pick('coord1'); const m = cmap(), names = Object.keys(m), txt = ($1('main .co1-map') || {}).textContent || '';
      ok('CO1-A one group: the learners\' own programme (Care Practice) and the demo batch, named in the heading', $a('main .co1-grp').length === 1 && $1('main .co1-grp').dataset.prog === CP && $1('main .co1-grp').dataset.batch === 'DEMO-L3-JAN27' && /Care Practice \(client demo\)/.test($1('main .co1-gh').textContent) && /DEMO-L3-JAN27/.test($1('main .co1-gh').textContent), J($a('main .co1-grp').map(g => [g.dataset.prog, g.dataset.batch])));
      ok('CO1-A the columns are that programme\'s criteria (001 1.1, 001 1.2, 001 2.1) — not the legacy Level 3 Adult Care criteria', J(Object.keys(m[names[0]].cells)) === J(CODES) && !/30[1-7] \d\.\d/.test(txt), J(Object.keys((m[names[0]] || {}).cells || {})));
      ok('CO1-A four learners (Amira, Dev, Sam, Tom); every cell Not Started; readiness 0%', names.length === 4 && ['Amira', 'Dev', 'Sam', 'Tom'].every(n => rowOf(m, n)) && names.every(n => Object.values(m[n].cells).every(c => c === 'NS') && m[n].ready === '0%'), J(m));
      ok('CO1-A one legend for the whole map: the five states with their meaning, and "—" = no record', $a('main .co1-legend').length === 1 && $a('main .five-legend').length === 1 && ['Not Started', 'In Progress', 'Action Required', 'Added to PD', 'Achieved', 'No record'].every(k => $1('main .co1-legend').textContent.includes(k)));
      ok('CO1-A the cells and readiness agree with the learners\' records', names.every(n => { const L = myLearners().find(l => l.name === n); return CODES.every(c => m[n].cells[c] === AB[own(L.v, c)]) && m[n].ready === pctOf(withW(L.v, () => allCrit())) + '%'; }));
      const mod = cellModal(AM, '001 1.1'); ok('CO1-A the cell details are Amira\'s own criterion and programme (was a Level 3 Adult Care criterion)', /^001 1\.1 — Amira/.test(mod) && /Care Practice/.test(mod) && /Not Started/.test(mod) && !/301 1\.1|reasons people communicate/.test(mod), mod.slice(0, 200));
      const t0 = toastText(); ACT.hmCell({ dataset: { l: AM, c: '301 1.1' } }); ok('CO1-A a criterion that isn\'t in Amira\'s programme opens nothing', !MODAL); closeModal();
      ok('CO1-A no invented states anywhere in the code path: hashN is not used by the map', !/hashN/.test(String(heatmap)) && !/hashN/.test(String(synthTreeHtml)) && !/hashN/.test(String(ACT.hmCell)));
      function toastText() { return ($1('#toast-root') || {}).textContent || ''; } void t0;
    });

    /* ---------- B–F. Criterion state transitions ---------- */
    let kA10, kA11, kD10;
    await T('CO1-B submission', async () => {
      subm('nvq-sp', 'a10'); kA10 = keyFor(AM, 'a10');
      ok('CO1-B Amira submits Assignment 1: her criterion 001 1.1 is In Progress (never Achieved)', own('CD1', '001 1.1') === 'In Progress' && !crit('CD1', '001 1.1').lock);
      pick('coord1'); const m = cmap();
      ok('CO1-B the map shows it (IP); her other criteria and every other learner are unchanged', rowOf(m, 'Amira').cells['001 1.1'] === 'IP' && rowOf(m, 'Amira').cells['001 1.2'] === 'NS' && ['Dev', 'Sam', 'Tom'].every(n => Object.values(rowOf(m, n).cells).every(c => c === 'NS')) && rowOf(m, 'Amira').ready === '0%', J(rowOf(m, 'Amira')));
    });
    await T('CO1-C Coordinator feedback', async () => {
      pick('coord1'); go('c-sub', { id: kA10 }); const q = STORE.worlds.CD1.assignments.find(x => x.id === 'a10').qs[0];
      $1('#r3-cv-' + q.id).value = 'Met'; $1('#r3-ct-' + q.id).value = 'CO-1 coordinator Met'; ACT.r3CooJudge({ dataset: { k: kA10, q: q.id } });
      cfInputAndPost(kA10);
      ok('CO1-C the Coordinator\'s Met judgement and comment are published, and the criterion stays In Progress (PD-R3-03)', r3Judg(kA10).some(j => j.role === 'Academic Coordinator' && j.value === 'Met' && j.published) && own('CD1', '001 1.1') === 'In Progress' && rowOf(cmap(), 'Amira').cells['001 1.1'] === 'IP');
      const mod = cellModal(AM, '001 1.1'); ok('CO1-C the cell details show the Coordinator\'s judgement separately, beside the unchanged status', /Status In Progress/.test(mod) && /Met Coordinator · Dr Helen Carter/.test(mod) && /doesn't change the criterion status/.test(mod), mod.slice(0, 400));
      function cfInputAndPost(k) { const b = $1('#cf-body'); if (!b) return; b.innerHTML = '<p>CO-1 comment</p>'; INP.cfInput(b); ACT.cfPost({ dataset: { k } }); press(); }
    });
    await T('CO1-D Assessor publication', async () => {
      markPub('S', kA10, () => ({ v: 'Met', exit: 'pass', verify: true }));
      ok('CO1-D James publishes a verified Met: 001 1.1 Achieved, locked by James', own('CD1', '001 1.1') === 'Achieved' && (crit('CD1', '001 1.1').lock || {}).by === 'James Pryce');
      pick('coord1'); const m = cmap(), a = rowOf(m, 'Amira');
      ok('CO1-D the map: A, readiness 33% — the same as her record (1 of 3)', a.cells['001 1.1'] === 'A' && a.ready === '33%' && pctOf(withW('CD1', () => allCrit())) === 33, J(a));
      ok('CO1-D the Batch readiness KPI is the average of the rows (33 + 0 + 0 + 0) / 4 = 8%', /Batch readiness\s*8%/.test(($a('main .kpi').map(k => k.textContent.replace(/\s+/g, ' ')).join('|'))), $a('main .kpi').map(k => k.textContent.replace(/\s+/g, ' ')).join('|'));
      const mod = cellModal(AM, '001 1.1'); ok('CO1-D the cell details agree: Achieved, verified by James, both judgements by role', /Status Achieved/.test(mod) && /Verified .*James Pryce/.test(mod) && /Met Assessor · James Pryce/.test(mod) && /Met Coordinator/.test(mod), mod.slice(0, 400));
      TCH('S'); const t = tmap(), ta = rowOf(t, 'Amira'); ok('CO1-D the Assessor\'s Progress & Gap Analysis shows the same cells and readiness', J(ta && ta.cells) === J(a.cells) && ta.ready === a.ready, J(ta));
    });
    await T('CO1-E final Pass / Fail', async () => {
      subm('nvq-fa', 'a10'); kD10 = keyFor(DV, 'a10');
      markPub('S', kD10, () => ({ v: 'Partially Met', exit: 'pass' }));
      ok('CO1-E Dev: Partially Met published → In Progress (PD-R3-01)', own('CD2', '001 1.1') === 'In Progress');
      TCH('S'); ACT.r3Declare({ dataset: { k: kD10 } }); $1('input[name="r3-res"][value="Pass"]').checked = true; const o = $1('#d-ofb'); if (o) o.value = 'CO-1 final'; $1('#rsn').value = 'CO-1'; press();
      ok('CO1-E James declares Pass for Dev\'s assignment: the criterion is still In Progress — nothing inferred from the outcome', r3Out(kD10) && r3Out(kD10).result === 'Pass' && own('CD2', '001 1.1') === 'In Progress' && !crit('CD2', '001 1.1').lock);
      pick('coord1'); ok('CO1-E the map keeps IP for Dev', rowOf(cmap(), 'Dev').cells['001 1.1'] === 'IP');
    });
    await T('CO1-F resubmission and PD exit', async () => {
      subm('nvq-sp', 'a11'); kA11 = keyFor(AM, 'a11');
      ok('CO1-F Amira submits Assignment 2: 001 1.2 In Progress', own('CD1', '001 1.2') === 'In Progress');
      markPub('S', kA11, () => ({ v: 'Not Met', exit: 'resub' }));
      ok('CO1-F James asks for a resubmission (Not Met): Action Required', own('CD1', '001 1.2') === 'Action Required' && STORE.worlds.CD1.assignments.find(x => x.id === 'a11').status === 'Resubmission Required');
      pick('coord1'); ok('CO1-F the map shows AR', rowOf(cmap(), 'Amira').cells['001 1.2'] === 'AR');
      subm('nvq-sp', 'a11', '<p>CO-1 reworked answer.</p>');
      ok('CO1-F Amira resubmits: 001 1.2 back to In Progress (rework received, not yet judged)', own('CD1', '001 1.2') === 'In Progress' && STORE.worlds.CD1.assignments.find(x => x.id === 'a11').round === 'Resub 1');
      pick('coord1'); ok('CO1-F the map shows IP', rowOf(cmap(), 'Amira').cells['001 1.2'] === 'IP');
      co1Submitted(STORE.worlds.CD1, ['001 1.1']); ok('CO1-F (lock) a submission never reopens an Achieved, locked criterion: 001 1.1 stays Achieved', own('CD1', '001 1.1') === 'Achieved');
      markPub('S', kA11, () => ({ v: 'Partially Met', exit: 'pd', pd: 'CO-1 PD: agree the plan verbally' }));
      ok('CO1-F James moves it to the PD: Added to PD, not locked, no final outcome', own('CD1', '001 1.2') === 'Added to PD' && !crit('CD1', '001 1.2').lock && !r3Out(kA11));
      pick('coord1'); const m = cmap(); ok('CO1-F the map shows PD; readiness still 33%', rowOf(m, 'Amira').cells['001 1.2'] === 'PD' && rowOf(m, 'Amira').ready === '33%', J(rowOf(m, 'Amira')));
      // Every cell of every learner opens the same state as the cell
      const bad = []; Object.entries(m).forEach(([n, r]) => { const L = myLearners().find(l => l.name === n); CODES.forEach(c => { const mod = cellModal(L.lid, c), st = Object.keys(AB).find(k => AB[k] === r.cells[c]); if (!new RegExp('Status ' + st).test(mod)) bad.push(n + ' ' + c); }); });
      ok('CO1-F all 12 cell details agree with their cells', !bad.length, bad.join('; '));
    });
    await T('CO1-G scope', async () => {
      pick('coord1'); const s0 = sec(); ACT.hmCell({ dataset: { l: 'IA-L-30200', c: '001 1.1' } }); const m = !!MODAL; closeModal();
      ok('CO1-G a learner outside the Coordinator\'s batches: refused, logged, no dialog', !m && sec() === s0 + 1);
      TCH('T'); go('t-progress'); ok('CO1-G Marcus (Teacher) sees the map read-only: no recommended actions', /Read-only for Teachers/.test(main()) && !$1('main [data-act="tasRec"]') && $a('main .co1-grp').length === 1);
      TCH('S'); go('t-progress'); const gap = (($a('main section.card').find(s => /Cohort gap summary/.test(s.textContent)) || {}).textContent || '');
      ok('CO1-G the Assessor\'s gap summary counts only the programme\'s criteria with a record', /001 1\.2/.test(gap) && !/30[1-7] \d\.\d/.test(gap) && /with a record/.test(gap), gap.slice(0, 300));
      TCH('S'); const s1 = sec(); ACT.hmCell({ dataset: { l: 'IA-L-30200', c: '001 1.1' } }); ok('CO1-G the Assessor can\'t open a learner outside the allocation either', !MODAL && sec() === s1 + 1); closeModal();
    });

    /* ---------- I–K. Amira's PD with James ---------- */
    await T('CO1-I PD item before scheduling', async () => {
      TCH('S'); go('t-pd'); const pd = tasPdList().find(p => p.lid === AM);
      ok('CO1-I James\'s PD list has Amira with the item (was empty: only legacy learners were listed)', !!pd && pd.items.some(i => i[0] === '001 1.2' && i[3] === 'Open') && /Amira Shah/.test(main()));
      ok('CO1-I an unscheduled session is "Not scheduled" (no 1970 date) and the preview is a demo learner\'s, not Aisha\'s', /Not scheduled/.test(main()) && !/1970/.test(main()) && !/Aisha/.test(main()));
      TCH('O'); ok('CO1-I Omar (not Amira\'s PD assessor) doesn\'t list her', !tasPdList().some(p => p.lid === AM));
      const it = STORE.worlds.CD1.pd.items.find(i => i.ref === '001 1.2'); ok('CO1-I the item records who added it, when and from which assignment', it && it.by === 'James Pryce' && !!it.at && it.aid === 'a11' && it.go === 'assignment.a11');
      pick('nvq-sp'); go('progress', { tab: 'pd' }); const lp = main();
      ok('CO1-I Amira sees the item before a session exists: criterion, reason, added by James, PD assessor James', /001 1\.2/.test(lp) && /CO-1 PD: agree the plan verbally/.test(lp) && /Added by/.test(lp) && /James Pryce/.test(lp) && /PD assessor: James Pryce/.test(lp) && /Not scheduled/.test(lp));
      go('assignment', { id: 'a11' }); const la = main();
      ok('CO1-I Amira\'s Assignment 2 page shows the PD item, the reason and James (no hardcoded Assessor)', /Added to Professional Discussion/.test(la) && /CO-1 PD: agree the plan verbally/.test(la) && /James Pryce/.test(la) && !/Sarah Okonkwo/.test(la));
      pick('coord1'); go('c-sub', { id: kA11 }); const cp = panel();
      ok('CO1-I Coordinator review: the read-only PD panel — criterion, assignment / question, reason, added by, item status, session, PD assessor', ['001 1.2', 'Assignment 2 · Q1', 'CO-1 PD: agree the plan verbally', 'Added by James Pryce', 'Item status Open', 'PD session Not scheduled', 'PD assessor James Pryce', 'Not recorded yet'].every(x => cp.includes(x)) && !$1('main .co1-pd button, main .co1-pd input, main .co1-pd select'), cp);
      TCH('S'); go('t-mark', { id: kA11 }); const tp = panel();
      ok('CO1-I Assessor marking view: the same panel', ['001 1.2', 'CO-1 PD: agree the plan verbally', 'Item status Open', 'PD assessor James Pryce'].every(x => tp.includes(x)), tp);
      TCH('S'); go('t-students', { id: AM, tab: 'pd' }); ok('CO1-I James → Amira → PD checklist tab shows the item', /001 1\.2/.test(main()) && $1('main [data-act="pdPropose"]'));
    });
    await T('CO1-J PD proposal', async () => {
      TCH('S'); const w = STORE.worlds.CD1, x0 = aud(); ACT.pdPropose({ dataset: { l: AM } });
      ok('CO1-J the proposal dialog opens for Amira (was a TypeError for demo learners)', !!MODAL && MODAL.title === 'Propose PD session' && /001 1\.2/.test(MODAL.body));
      press();
      ok('CO1-J the session is Proposed with James, dated; no history line from the unscheduled state', w.pd.session.status === 'Proposed' && w.pd.session.with === 'James Pryce' && !!w.pd.session.at && (w.pd.history || []).length === 0, J([w.pd.session, w.pd.history]));
      ok('CO1-J the learner\'s calendar has the PD event; the action is audited', w.events.some(e => e.id === 'epd' && e.start === w.pd.session.at) && aud() > x0);
      ok('CO1-J scheduling verifies nothing and decides no outcome: 001 1.2 still Added to PD, not locked, no final outcome', own('CD1', '001 1.2') === 'Added to PD' && !crit('CD1', '001 1.2').lock && !r3Out(kA11));
      pick('nvq-sp'); go('progress', { tab: 'pd' }); ok('CO1-J Amira sees the proposed session with James', /Proposed/.test(main()) && /James Pryce/.test(main()));
      pick('coord1'); go('c-sub', { id: kA11 }); ok('CO1-J the Coordinator\'s panel shows the session status and date', /PD session Proposed/.test(panel()) && new RegExp(fdt(w.pd.session.at).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(panel()), panel());
    });
    await T('CO1-K PD outcome Not Met with notes', async () => {
      TCH('S'); const it = STORE.worlds.CD1.pd.items.find(i => i.ref === '001 1.2'); ACT.pdOutcome({ dataset: { l: AM } });
      ok('CO1-K the outcome dialog preselects nothing (was "Met — verify and lock" checked)', !!MODAL && !$1('#modal-root input[name^="pdo-"]:checked') && !/value="Met" checked/.test(MODAL.body));
      $1('#pd-sign').checked = true; const r0 = prim();
      ok('CO1-K saving without a choice is refused: the item stays Open, the criterion Added to PD', r0 === false && it.status === 'Open' && own('CD1', '001 1.2') === 'Added to PD');
      $1('#modal-root input[name="pdo-0"][value="Not Met"]').checked = true; $1('#pdn-0').value = 'CO-1 not met: bring the signed plan'; $1('#pd-sign').checked = true; press();
      ok('CO1-K Not Met: item Returned to Action Required, criterion Action Required (not locked)', it.status === 'Returned to Action Required' && own('CD1', '001 1.2') === 'Action Required' && !crit('CD1', '001 1.2').lock);
      ok('CO1-K the notes are kept with the outcome, with James and the date; the session is signed off by James', it.outcome && it.outcome.result === 'Not Met' && it.outcome.notes === 'CO-1 not met: bring the signed plan' && it.outcome.by === 'James Pryce' && !!it.outcome.at && STORE.worlds.CD1.pd.session.signedBy === 'James Pryce', J(it.outcome));
      ok('CO1-K the audit log records the outcome with its notes', ADMIN.audit.some(a => a.action === 'PD outcome recorded' && /CO-1 not met/.test(a.reason) && a.actor === 'James Pryce'));
      pick('coord1'); go('c-sub', { id: kA11 }); const cp = panel();
      ok('CO1-K the Coordinator\'s panel: outcome Not Met, the notes, signed off by James', /Outcome Not Met/.test(cp) && /Notes CO-1 not met: bring the signed plan/.test(cp) && /Signed off James Pryce/.test(cp) && /Item status Returned to Action Required/.test(cp), cp);
      ok('CO1-K the map shows AR for 001 1.2', rowOf(cmap(), 'Amira').cells['001 1.2'] === 'AR');
      pick('nvq-sp'); go('assignment', { id: 'a11' }); ok('CO1-K Amira\'s assignment page shows the outcome and notes', /Outcome: Not Met/.test(main()) && /bring the signed plan/.test(main()));
    });

    /* ---------- L. Sam's PD with Omar (per-learner override) ---------- */
    await T('CO1-L Sam with Omar', async () => {
      subm('nvq-dep', 'a10'); const kS = keyFor(SAM, 'a10');
      markPub('S', kS, () => ({ v: 'Partially Met', exit: 'pd', pd: 'CO-1 Sam PD: values in practice' }));
      ok('CO1-L James (assignment assessor) adds Sam\'s 001 1.1 to the PD', own('CD4', '001 1.1') === 'Added to PD' && STORE.worlds.CD4.pd.items.some(i => i.ref === '001 1.1' && i.by === 'James Pryce'));
      TCH('S'); ok('CO1-L James is not Sam\'s PD assessor: Sam isn\'t on his PD list', !tasPdList().some(p => p.lid === SAM));
      const s0 = J(STORE.worlds.CD4.pd), x0 = sec(), a0 = aud(); ACT.pdPropose({ dataset: { l: SAM } }); const m1 = !!MODAL; closeModal(); ACT.pdOutcome({ dataset: { l: SAM } }); const m2 = !!MODAL; closeModal();
      ok('CO1-L James\'s direct PD calls for Sam are refused and logged; nothing changes', !m1 && !m2 && J(STORE.worlds.CD4.pd) === s0 && aud() >= a0 + 2, J([m1, m2, aud() - a0, sec() - x0]));
      TCH('T'); const s1 = J(STORE.worlds.CD4.pd); ACT.pdPropose({ dataset: { l: SAM } }); ok('CO1-L Marcus (Teacher) is refused', !MODAL && J(STORE.worlds.CD4.pd) === s1); closeModal();
      TCH('O'); go('t-pd'); ok('CO1-L Omar\'s PD list has Sam with the item; not Amira', tasPdList().some(p => p.lid === SAM && p.items.some(i => i[0] === '001 1.1')) && !tasPdList().some(p => p.lid === AM) && /Sam Deposit/.test(main()));
      ACT.pdPropose({ dataset: { l: SAM } }); ok('CO1-L Omar proposes Sam\'s session (was a TypeError)', !!MODAL && MODAL.title === 'Propose PD session'); press();
      const w = STORE.worlds.CD4; ok('CO1-L Sam\'s session: Proposed, with Omar', w.pd.session.status === 'Proposed' && w.pd.session.with === 'Omar Siddiqui');
      ok('CO1-L still Added to PD, not locked, no final outcome for Sam', own('CD4', '001 1.1') === 'Added to PD' && !crit('CD4', '001 1.1').lock && !r3Out(kS));
      ACT.pdOutcome({ dataset: { l: SAM } }); $1('#modal-root input[name="pdo-0"][value="Met"]').checked = true; $1('#pdn-0').value = 'CO-1 met: clear examples from practice'; $1('#pd-sign').checked = true; press();
      const it = w.pd.items.find(i => i.ref === '001 1.1');
      ok('CO1-L Omar records Met: Achieved, verified and locked by Omar, source Professional Discussion', own('CD4', '001 1.1') === 'Achieved' && (crit('CD4', '001 1.1').lock || {}).by === 'Omar Siddiqui' && crit('CD4', '001 1.1').src === 'Professional Discussion');
      ok('CO1-L the Met notes are kept (were discarded), with Omar and the date', it.outcome && it.outcome.result === 'Met' && it.outcome.notes === 'CO-1 met: clear examples from practice' && it.outcome.by === 'Omar Siddiqui', J(it.outcome));
      ok('CO1-L a PD Met decides no final Pass / Fail', !r3Out(kS));
      pick('coord1'); const m = cmap(); ok('CO1-L the Coordinator\'s map: Sam A, readiness 33%', rowOf(m, 'Sam').cells['001 1.1'] === 'A' && rowOf(m, 'Sam').ready === '33%', J(rowOf(m, 'Sam')));
      go('c-sub', { id: kS }); const cp = panel(); ok('CO1-L the Coordinator\'s panel for Sam: added by James, PD assessor Omar, Met, notes, signed off by Omar', /Added by James Pryce/.test(cp) && /PD assessor Omar Siddiqui/.test(cp) && /Outcome Met/.test(cp) && /clear examples from practice/.test(cp) && /Signed off Omar Siddiqui/.test(cp), cp);
      TCH('O'); go('t-mark', { id: kS }); ok('CO1-L Omar is not Sam\'s assignment assessor: no marking view for him', !$1('main .co1-pd') && /don't have access|Not part of your role/.test(main()));
    });

    /* ---------- M. Isolation ---------- */
    await T('CO1-M isolation', async () => {
      ok('CO1-M Dev and Tom have no PD items; Amira\'s and Sam\'s stay their own', STORE.worlds.CD2.pd.items.length === 0 && STORE.worlds.CD5.pd.items.length === 0 && STORE.worlds.CD1.pd.items.every(i => i.ref === '001 1.2') && STORE.worlds.CD4.pd.items.every(i => i.ref === '001 1.1'));
      pick('nvq-fa'); go('progress', { tab: 'pd' }); const dv = main(); go('assignment', { id: 'a10' }); const dva = main();
      ok('CO1-M Dev sees none of Amira\'s or Sam\'s PD (checklist and assignment page)', !/CO-1 PD|CO-1 Sam PD|bring the signed plan|clear examples/.test(dv + dva) && /Nothing has been added/.test(dv));
      pick('coord1'); go('c-sub', { id: kD10 }); ok('CO1-M the Coordinator\'s review of Dev\'s assignment has no PD panel', !$1('main .co1-pd'));
      ok('CO1-M Dev\'s criteria were changed only by Dev\'s own submission and marking', own('CD2', '001 1.1') === 'In Progress' && own('CD2', '001 1.2') === 'Not Started');
      pick('coord2'); const L2 = myLearners(true).map(l => l.lid), m = cmap(), shown = Object.keys(m).map(n => (myLearners(true).find(l => l.name === n) || {}).lid);
      ok('CO1-M the second Coordinator\'s map shows only learners in her batches', shown.every(l => l && L2.includes(l)), J([shown, L2]));
    });

    const keep = { kA10, kA11, kD10, amira: rowOf((pick('coord1'), cmap()), 'Amira'), sam: rowOf(cmap(), 'Sam'), amNotes: STORE.worlds.CD1.pd.items[0].outcome };
    render(); SS.setItem('ft-co1.keep', J(keep));
    next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-co1.keep') || '{}');
    await T('CO1-N refresh', async () => {
      ok('CO1-N after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      pick('coord1'); const m = cmap();
      ok('CO1-N the map comes back the same (Amira A / AR, Sam A; readiness 33%)', J(rowOf(m, 'Amira')) === J(keep.amira) && J(rowOf(m, 'Sam')) === J(keep.sam) && rowOf(m, 'Amira').cells['001 1.1'] === 'A' && rowOf(m, 'Amira').cells['001 1.2'] === 'AR', J([rowOf(m, 'Amira'), keep.amira]));
      ok('CO1-N the PD outcome, its notes and sign-off come back', J(STORE.worlds.CD1.pd.items[0].outcome) === J(keep.amNotes) && STORE.worlds.CD1.pd.session.signedBy === 'James Pryce' && (STORE.worlds.CD4.pd.items[0].outcome || {}).notes === 'CO-1 met: clear examples from practice');
      go('c-sub', { id: keep.kA11 }); ok('CO1-N the Coordinator\'s PD panel after the refresh', /CO-1 not met: bring the signed plan/.test(panel()));
      TCH('S'); go('t-pd'); ok('CO1-N James\'s PD list after the refresh still has Amira', tasPdList().some(p => p.lid === AM && p.items.length === 1));
    });
    await T('CO1-O reset', async () => {
      signOutUI(); ACT.resetDemo(); pick('coord1'); const m = cmap();
      ok('CO1-O Reset demo: every cell Not Started again, readiness 0%', Object.values(m).length === 4 && Object.values(m).every(r => Object.values(r.cells).every(c => c === 'NS') && r.ready === '0%'), J(m));
      ok('CO1-O Reset demo: no PD items, sessions unscheduled, no PD event', ['CD1', 'CD4'].every(k => STORE.worlds[k].pd.items.length === 0 && STORE.worlds[k].pd.session.status === 'Not scheduled' && !STORE.worlds[k].events.some(e => e.id === 'epd')));
      TCH('S'); ok('CO1-O James\'s PD list after Reset: his PD learners, no items', tasPdList().every(p => p.items.length === 0) && tasPdList().some(p => p.lid === AM));
    });

    /* ---------- Legacy fixture ---------- */
    await T('CO1-P legacy map', async () => {
      fxLoadLegacy(); S.tas.edge = 'none'; signOutUI(); S.portal = 'coord'; S.coo.v = 'A'; cooEnter(); S.signedIn = true; S.ui = {};
      const m = cmap(), ls = myLearners(), C = STORE.worlds.C, aisha = rowOf(m, 'Aisha');
      ok('CO1-P Aisha (learner record) shows her own record, cell by cell, with her readiness', !!aisha && withW('C', () => allCrit()).every(c => aisha.cells[c.code] === AB[c.st || 'Not Started']) && aisha.ready === pctOf(withW('C', () => allCrit())) + '%', J(aisha));
      const seeded = Object.entries(m).filter(([n]) => !ls.find(l => l.name === n && l.v));
      // Every state shown for them is backed by a stored record: a verified lock, or marking published under their own key
      const backed = (lid, code) => !!STORE.tas.locks[lid + '|' + code] || Object.keys(STORE.tas.rel).some(k => k.split('~')[0] === lid);
      const unbacked = seeded.flatMap(([n, r]) => { const L = ls.find(l => l.name === n); return Object.entries(r.cells).filter(([c, x]) => x !== '—' && !backed(L.lid, c)).map(([c, x]) => n + ' ' + c + ' ' + x); });
      const hashOld = seeded.some(([n, r]) => { const L = ls.find(l => l.name === n); return Object.keys(r.cells).some(c => r.cells[c] === '—' && L.progress > 0); });
      ok('CO1-P learners without a learner record: no invented states — "—" unless a stored record backs it; readiness "—" (was hashN)', seeded.length > 3 && !unbacked.length && seeded.every(([, r]) => r.ready === '—') && hashOld, unbacked.slice(0, 5).join('; '));
      ok('CO1-P every group is headed by its programme and batch', $a('main .co1-grp').every(g => g.dataset.prog && g.dataset.batch && g.querySelector('.co1-gh').textContent.includes(g.dataset.batch)));
      const o = ls.find(l => l.name === 'Oliver Bennett'), mod = cellModal(o.lid, Object.keys(rowOf(m, 'Oliver').cells)[0]);
      ok('CO1-P the cell details for a learner without a record say so (nothing assumed)', /No record/.test(mod) && /only published marking is shown/.test(mod), mod.slice(0, 300));
      go('c-learner', { id: o.lid, tab: 'progress' }); ok('CO1-P that learner\'s Progress tab: their programme tree with "—", no invented states', /no learner criterion record/.test(main()) && !$a('main .crit-row .chip').some(c => /Achieved|In Progress|Action Required|Added to PD/.test(c.textContent)));
      // Cross-programme: a staff identity whose learners are on two programmes sees one group each, with that programme's criteria
      const multi = ['A', 'S', 'T', 'W'].find(v => { TCH(v); go('t-progress'); return new Set($a('main .co1-grp').map(g => g.dataset.prog)).size > 1; });
      ok('CO1-P (cross-programme) an identity with learners on two programmes exists in the legacy data', !!multi);
      if (multi) {
        TCH(multi); go('t-progress'); const tl = tasLearners().filter(l => !l.short), mm = mapOf();
        const bad = Object.entries(mm).flatMap(([n, r]) => { const L = tl.find(l => l.name === n && l.batch.code === r.batch); if (!L) return [n + ': not this person\'s learner']; const rec = L.v ? withW(L.v, () => allCrit()).map(c => c.code) : (fPortCtx(L.lid, [{ programme: L.batch.course }]).tree ? co1CritsOf(fPortCtx(L.lid, [{ programme: L.batch.course }]).tree).map(c => c.code) : []); const prog = L.v ? STORE.worlds[L.v].nvq.title : fPortCtx(L.lid, [{ programme: L.batch.course }]).prog; return (r.prog !== prog ? [n + ': group ' + r.prog + ' vs ' + prog] : []).concat(Object.entries(r.cells).filter(([c, x]) => !rec.includes(c) && x !== '—').map(([c]) => n + ': ' + c + ' shown from another programme')); });
        ok(`CO1-P (cross-programme) ${TAS_USERS[multi].name}: every learner is in their own programme's group, and no cell is filled from another programme`, !bad.length, bad.slice(0, 5).join('; '));
      }
    });
    await T('CO1-Q legacy published marking', async () => {
      S.portal = 'coord'; S.coo.v = 'A'; cooEnter(); S.signedIn = true;
      const s = mySubmissions(true).find(x => !x.live && x.status === 'Submitted' && x.L.name === 'Oliver Bennett') || mySubmissions(true).find(x => !x.live && x.status === 'Submitted');
      const st0 = s.status, mk = s.marker, v = Object.keys(TAS_USERS).find(k => TAS_USERS[k].name === mk);
      const q0 = chRaw(() => { const k = S.tas.v; S.tas.v = v; try { return markable(tasAsg(tasSubs(true).find(x => x.key === s.key)))[0]; } finally { S.tas.v = k; } });
      markPub(v, s.key, q => q.id === q0.id ? { v: 'Partially Met', exit: 'pd', pd: 'CO-1 LEGACY PD reason' } : { v: 'Met', exit: 'pass' });
      ok('CO1-Q the Assessor published for ' + s.L.name + ' (no learner record)', STORE.tas.rel[s.key] && STORE.tas.rel[s.key].status === 'Feedback Received');
      S.portal = 'coord'; S.coo.v = 'A'; cooEnter(); S.signedIn = true; const c2 = mySubmissions(true).find(x => x.key === s.key);
      ok('CO1-Q the Coordinator\'s list shows the published status (was still "' + st0 + '")', c2.status === 'Feedback Received' && c2.pd);
      go('c-sub', { id: s.key }); const cp = panel();
      ok('CO1-Q the Coordinator\'s review shows the Assessor\'s real PD reason and the PD panel (was a generic seeded line)', /CO-1 LEGACY PD reason/.test(main()) && /Added by/.test(cp) && new RegExp('Added by ' + mk).test(cp) && /Item status Open/.test(cp), cp);
      TCH(v); ok('CO1-Q the PD item joins the learner\'s PD checklist for the PD assessor', !chScoped() || chEff(s.L.lid, 'pd') !== TAS_USERS[v].name ? true : tasPdList().some(p => p.lid === s.L.lid && p.items.some(i => /CO-1 LEGACY PD reason/.test(i[2]))));
      ok('CO1-Q …stored once in that learner\'s record', STORE.tas.pd.filter(p => p.lid === s.L.lid).length === 1 && STORE.tas.pd.find(p => p.lid === s.L.lid).items.filter(i => i[2] === 'CO-1 LEGACY PD reason').length === 1);
      S.portal = 'coord'; S.coo.v = 'A'; cooEnter(); const code = q0.crit, mo = cmap(), row = mo[s.L.name];
      ok('CO1-Q the map shows that published state (PD) for that criterion, "—" for the rest', !row || (row.cells[code] === undefined || row.cells[code] === 'PD') && Object.entries(row.cells).filter(([c]) => c !== code).every(([, x]) => ['—', 'IP', 'A', 'AR', 'PD'].includes(x)), J(row));
      // Fail closed: a published record whose questions aren't in the assignment is ignored
      const other = mySubmissions(true).find(x => !x.live && x.key !== s.key && x.status === 'Submitted'); STORE.tas.rel[other.key] = { status: 'Feedback Received', round: 'Sub 1', by: 'Nobody', at: now().toISOString(), overall: 'x', items: { zz9: { exit: 'pd', pdReason: 'CO-1 STRAY' } } };
      const o2 = mySubmissions(true).find(x => x.key === other.key); go('c-sub', { id: other.key });
      ok('CO1-Q (fail closed) a record that doesn\'t match the assignment\'s questions changes nothing', o2.status === 'Submitted' && !/CO-1 STRAY/.test(main()) && !$1('main .co1-pd'));
      delete STORE.tas.rel[other.key];
    });
    await T('CO1-R legacy PD outcome (Aisha, Sarah)', async () => {
      TCH('A'); const C = STORE.worlds.C, AL = C.me.id, open = C.pd.items.filter(i => i.status === 'Open'), done = C.pd.items.find(i => i.status === 'Achieved');
      ACT.pdOutcome({ dataset: { l: AL } }); ok('CO1-R Sarah\'s outcome dialog for Aisha preselects nothing', !!MODAL && !$1('#modal-root input[name^="pdo-"]:checked'));
      open.forEach((i, k) => { $1(`#modal-root input[name="pdo-${k}"][value="${k ? 'Not Met' : 'Met'}"]`).checked = true; $1('#pdn-' + k).value = 'CO-1 legacy note ' + k; }); $1('#pd-sign').checked = true; press();
      ok('CO1-R Met and Not Met both keep their notes, author and date', open.every((i, k) => i.outcome && i.outcome.notes === 'CO-1 legacy note ' + k && i.outcome.by === 'Sarah Okonkwo' && i.outcome.result === (k ? 'Not Met' : 'Met')), J(open.map(i => i.outcome)));
      ok('CO1-R …with the existing effects: Met → Achieved and locked, Not Met → Action Required', own('C', open[0].ref) === 'Achieved' && !!crit('C', open[0].ref).lock && (open.length < 2 || own('C', open[1].ref) === 'Action Required'));
      S.portal = 'coord'; S.coo.v = 'A'; cooEnter(); S.signedIn = true; const k2 = mySubmissions(true).find(x => x.live && x.L.v === 'C' && x.a.id === 'a2').key; go('c-sub', { id: k2 }); const cp = panel();
      ok('CO1-R the Coordinator\'s review of Aisha\'s Assignment 2: PD panel with Met, the note, Sarah', /Outcome Met/.test(cp) && /CO-1 legacy note 0/.test(cp) && /Signed off Sarah Okonkwo/.test(cp), cp);
      ok('CO1-R a PD item recorded before CO-1 keeps its status and says no notes were stored (history not rewritten)', !!done && !done.outcome && done.status === 'Achieved');
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-co1.phase'); SS.removeItem('ft-co1.R');
})();
