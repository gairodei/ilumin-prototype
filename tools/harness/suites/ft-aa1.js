// AA-1 — Academic Admin integrity fixes (2 Nov 2026; PD-AA1-* in PROVISIONAL-DECISIONS.md). suites.sh runs it with FIXTURE=client.
// D2 one question mapped to two criteria (mapping, learner, Assessor and Coordinator per criterion, override, resubmission, map),
// D4 the Assessor's criterion card, D1 access expiry, D3 short-course authorization, D9 Add learner, D10/D11 invoice reconciliation;
// then a real refresh, Reset demo, and the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aa1.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aa1.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
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
  const next = ph => { SS.setItem('ft-aa1.R', J(R)); SS.setItem('ft-aa1.phase', String(ph)); location.reload(); };
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
  const reason = (r = 'AA-1 test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const qBtn = (id, a) => $1(`main [data-act="qDo"][data-id="${id}"][data-a="${a}"]`);
  const enr = () => STORE.worlds.CD3.enrolments.find(e => e.id === 'bk5');
  const course = () => (ADMIN.courses || []).find(c => c.status === 'Published' && c.title === 'Moving and Handling People');
  const lastAud = () => ADMIN.audit[0] || {};
  const extra = () => STORE.worlds.CD2.assignments.find(x => x.id === 'a10');

  if (PH === 0) {
    /* ---------- D2: one question mapped to two criteria ---------- */
    let kD;
    await T('AA1-D2a mapping', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' });
      click($1('main [data-act="cbAsgOpen"][data-id="a10"]')); click($1('main [data-act="cbAsgOpen"][data-id="a10"][data-t="mapping"]'));
      const cb = $1('main input[data-onchange="mapChange"][data-c="001 1.2"]'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); if (MODAL) reason();
      ok('AA1-D2a the definition keeps both criteria for Q1', J(s2Def('a10').qs[0].crit) === J(['001 1.1', '001 1.2']), J(s2Def('a10').qs[0].crit));
      const okCopy = v => { const a = STORE.worlds[v].assignments.find(x => x.id === 'a10'); return a.qs[0].crit === '001 1.1' && J(a.qs[0].crits) === J(['001 1.1', '001 1.2']) && J(a.crit.map(c => c[0])) === J(['001 1.1', '001 1.2']); };
      ok('AA1-D2a both learners\' published copies keep both criteria (question and "criteria this assignment covers"); the first stays q.crit', okCopy('CD1') && okCopy('CD2'), J(extra().qs[0]) + J(extra().crit));
    });
    await T('AA1-D2b learner sees every criterion', async () => {
      pick('nvq-fa'); go('assignment', { id: 'a10' }); const t = main();
      ok('AA1-D2b Dev\'s Q1 lists 001 1.1 and 001 1.2, each with its descriptor and evidence requirement, and says each is judged separately', /Q1[^]*001 1\.1[^]*Explain person-centred values[^]*001 1\.2[^]*Describe how to agree a care plan/.test(t) && /assessed against 2 criteria — each is judged separately/.test(t), (t.match(/Q1Answer.{0,300}/) || [''])[0]);
      ok('AA1-D2b the criteria PDF lists both under Q1', /001 1\.1[^]*001 1\.2/.test(csCritDoc(W.assignments.find(x => x.id === 'a10')).replace(/<[^>]+>/g, ' ')));
    });
    await T('AA1-D2c submission', async () => {
      subm('nvq-fa', 'a10'); kD = keyFor(DV, 'a10');
      ok('AA1-D2c Dev submits: both criteria In Progress', own('CD2', '001 1.1') === 'In Progress' && own('CD2', '001 1.2') === 'In Progress');
      ok('AA1-D2c Amira (Self-Paced, same batch) is untouched', own('CD1', '001 1.1') === 'Not Started' && own('CD1', '001 1.2') === 'Not Started');
    });
    await T('AA1-D2d/D4 Assessor marking screen', async () => {
      TCH('S'); go('t-mark', { id: kD }); const t = main();
      ok('AA1-D2d a decision panel for the further criterion 001 1.2 (Met / Partially Met / Not Met, note), and the first is named', !!$1('main .aa1-xc[data-crit="001 1.2"]') && $a('main .aa1-xc [data-act="mkMet"][data-c="001 1.2"]').map(b => b.dataset.v).join() === 'Met,Partially Met,Not Met' && /Criterion decision — 001 1\.1/.test(t) && /assessed against 2 criteria/.test(t));
      ok('AA1-D2d the learner\'s work pane lists both criteria under Q1', /Q1Answer the brief[^]{0,120}001 1\.1Knowledge001 1\.2Knowledge/.test(t), (t.match(/Q1Answer the brief.{0,140}/) || [''])[0]);
      ok('AA1-D4 the criterion card is the learner\'s own programme: Learning Outcome U001 LO1 and the builder\'s evidence requirement (was blank / generic, from the legacy world)', /Learning Outcome U001 LO1 — Understand person-centred care/.test(t) && /Evidence requirement: Written account/.test(t) && !/written evidence that addresses every part of the descriptor/.test(t), (t.match(/Brief and criteria.{0,300}/) || [''])[0]);
    });
    await T('AA1-D2e boundaries on the further criterion', async () => {
      const slot = () => (((STORE.tas.drafts[kD] || {}).items || {}).q1 || {}).cj;
      for (const p of ['coord1', 'aca', 'nvq-fa']) { pick(p); const s0 = sec(); try { ACT.mkMet({ dataset: { k: kD, q: 'q1', c: '001 1.2', v: 'Met' } }); INP.mkField({ dataset: { k: kD, q: 'q1', c: '001 1.2', f: 'note' }, value: 'rogue' }); } catch (e) { /* refused */ } ok(`AA1-D2e ${p} cannot judge 001 1.2 — refused and logged`, !slot() && sec() >= s0 + 1, J([slot(), sec() - s0])); }
      TCH('T'); const s1 = sec(); ACT.mkMet({ dataset: { k: kD, q: 'q1', c: '001 1.2', v: 'Met' } }); ok('AA1-D2e the Teacher cannot judge it', !slot() && sec() === s1 + 1);
      TCH('S'); ACT.mkMet({ dataset: { k: kD, q: 'q1', c: '001 2.1', v: 'Met' } }); ok('AA1-D2e a criterion not mapped to the question is refused', !slot() && !r3Judg(kD).some(j => j.crit === '001 2.1'));
    });
    await T('AA1-D2f Coordinator judges each criterion', async () => {
      pick('coord1'); go('c-sub', { id: kD });
      ok('AA1-D2f the Coordinator\'s review has one criterion panel per mapped criterion', $a('main .r3-crit').map(x => x.dataset.crit).join() === '001 1.1,001 1.2', $a('main .r3-crit').map(x => x.dataset.crit).join());
      $1('#r3-cv-q1--c1').value = 'Partially Met'; $1('#r3-ct-q1--c1').value = 'AA-1 coordinator on 1.2'; click($1('main [data-act="r3CooJudge"][data-q="q1--c1"]'));
      const j = r3Latest(kD, '001 1.2', 'Academic Coordinator', true);
      ok('AA1-D2f her judgement is recorded against 001 1.2 (question q1), published, and 001 1.1 has none', j && j.value === 'Partially Met' && j.qid === 'q1' && !r3Latest(kD, '001 1.1', 'Academic Coordinator', true), J(j));
      ok('AA1-D2f the criterion status doesn\'t change (PD-R3-03)', own('CD2', '001 1.2') === 'In Progress');
    });
    await T('AA1-D2g Assessor overrides it, marks, resubmission', async () => {
      TCH('S'); go('t-mark', { id: kD }); ok('AA1-D2g the Coordinator\'s 1.2 judgement is shown in the 1.2 panel with Override', /Partially Met/.test(($1('main .aa1-xc') || {}).textContent || '') && !!$1('main .aa1-xc [data-act="dOverride"][data-q="q1--c1"]'));
      click($1('main .aa1-xc [data-act="dOverride"]')); $a('input[name="d-ov"]').find(x => x.value === 'Not Met').checked = true; reason('Answer misses the agreement step');
      const ov = r3Judg(kD).find(j => j.override); ok('AA1-D2g the override is the Assessor\'s Not Met for 001 1.2, beside the Coordinator\'s (kept)', ov && ov.crit === '001 1.2' && ov.value === 'Not Met' && ov.qid === 'q1' && r3Latest(kD, '001 1.2', 'Academic Coordinator', true).value === 'Partially Met' && dft(kD).items.q1.cj['001 1.2'].met === 'Not Met', J(ov));
      click($1('main [data-act="mkMet"][data-v="Met"]:not([data-c])')); click($1('main [data-act="mkVerify"]:not([data-c])')); press();
      ACT.mkRag({ dataset: { k: kD, q: 'q1', v: 'A' } }); INP.mkField({ dataset: { k: kD, q: 'q1', f: 'fb' }, value: 'Add the care-plan step' }); INP.mkExit({ dataset: { k: kD, q: 'q1' }, value: 'resub' }); INP.mkField({ dataset: { k: kD, q: 'q1', f: 'corrections' }, value: 'Explain how the plan is agreed' }); INP.mkField({ dataset: { k: kD, q: 'q1', f: 'days' }, value: '7' });
      ACT.mkRelease({ dataset: { k: kD } }); press();
      const pub = r3Judg(kD).filter(j => j.role === 'Assessor' && j.published).map(j => j.crit + ':' + j.value);
      ok('AA1-D2g released: a resubmission (both criteria Action Required — the question\'s exit), both Assessor judgements published', extra().status === 'Resubmission Required' && own('CD2', '001 1.1') === 'Action Required' && own('CD2', '001 1.2') === 'Action Required' && pub.includes('001 1.1:Met') && pub.includes('001 1.2:Not Met'), J([own('CD2', '001 1.1'), own('CD2', '001 1.2'), pub]));
      ok('AA1-D2g no final outcome is derived', !r3Out(kD));
      subm('nvq-fa', 'a10', '<p>AA-1 reworked answer.</p>');
      ok('AA1-D2h Dev resubmits: round Resub 1, both criteria In Progress', extra().round === 'Resub 1' && own('CD2', '001 1.1') === 'In Progress' && own('CD2', '001 1.2') === 'In Progress', J([extra().round, own('CD2', '001 1.1'), own('CD2', '001 1.2')]));
      TCH('S'); go('t-mark', { id: kD }); ok('AA1-D2h the resubmission is marked against both criteria again', !!$1('main .aa1-xc[data-crit="001 1.2"]'));
      click($1('main [data-act="mkMet"][data-v="Met"]:not([data-c])')); click($1('main [data-act="mkVerify"]:not([data-c])')); press();
      click($1('main [data-act="mkMet"][data-c="001 1.2"][data-v="Met"]')); click($1('main [data-act="mkVerify"][data-c="001 1.2"]')); press();
      ACT.mkRag({ dataset: { k: kD, q: 'q1', v: 'G' } }); INP.mkField({ dataset: { k: kD, q: 'q1', f: 'fb' }, value: 'Now complete' }); INP.mkExit({ dataset: { k: kD, q: 'q1' }, value: 'pass' });
      go('t-mark', { id: kD }); ok('AA1-D2h no warning when every criterion is judged consistently', !/Check before sending/.test(main()));
      ACT.mkRelease({ dataset: { k: kD } }); press();
      const c1 = crit('CD2', '001 1.1'), c2 = crit('CD2', '001 1.2');
      ok('AA1-D2h released: both criteria Achieved and locked by James, each with its own verification', c1.st === 'Achieved' && c2.st === 'Achieved' && (c1.lock || {}).by === 'James Pryce' && (c2.lock || {}).by === 'James Pryce', J([c1.st, c2.st, c1.lock, c2.lock]));
      const h = r3Judg(kD).filter(j => j.role === 'Assessor' && !j.override).map(j => j.crit + ':' + j.value + ':' + j.round);
      ok('AA1-D2h the judgement history keeps every round per criterion', ['001 1.1:Met:Sub 1', '001 1.1:Met:Resub 1', '001 1.2:Met:Resub 1'].every(x => h.includes(x)), J(h));
      ok('AA1-D2h still no final outcome — the Assessor declares it separately', !r3Out(kD));
      ACT.mkMet({ dataset: { k: kD, q: 'q1', c: '001 1.2', v: 'Not Met' } }); ok('AA1-D2i a locked further criterion can\'t be re-judged', crit('CD2', '001 1.2').st === 'Achieved' && !((((STORE.tas.drafts[kD] || {}).items || {}).q1 || {}).cj || {})['001 1.2']);
      pick('coord1'); const m = cmap(); ok('AA1-D2i the competency map: Dev A / A (readiness 67%), Amira unchanged', rowOf(m, 'Dev').cells['001 1.1'] === 'A' && rowOf(m, 'Dev').cells['001 1.2'] === 'A' && rowOf(m, 'Dev').ready === '67%' && Object.values(rowOf(m, 'Amira').cells).every(c => c === 'NS'), J([rowOf(m, 'Dev'), rowOf(m, 'Amira')]));
      TCH('S'); ok('AA1-D2i the Assessor\'s Progress & Gap Analysis agrees', J(rowOf(tmap(), 'Dev').cells) === J(rowOf(m, 'Dev').cells));
      pick('nvq-fa'); go('assignment', { id: 'a10' }); ok('AA1-D2i the learner\'s page lists the question with both criteria', /001 1\.1, 001 1\.2/.test(main()) || /001 1\.1[^]{0,200}001 1\.2/.test(main()));
    });
    await T('AA1-D2j single-criterion questions unchanged', async () => {
      const a = STORE.worlds.CD1.assignments.find(x => x.id === 'a11');
      ok('AA1-D2j Assignment 2 (one criterion per question) keeps the single-criterion shape', a && a.qs.every(q => qCrits(q).length === 1 && q.crit === q.crits[0]));
      subm('nvq-sp', 'a11'); const k = keyFor(AM, 'a11'); TCH('S'); go('t-mark', { id: k });
      ok('AA1-D2j its marking screen has no further-criterion panel and the usual heading', !$1('main .aa1-xc') && /Criterion decision/.test(main()) && !/Criterion decision —/.test(main()));
    });

    /* ---------- D1: short-course access period ---------- */
    await T('AA1-D1 expiry', async () => {
      const e = enr(), end0 = e.end;
      e.status = 'Completed'; e.end = D(-3); render();
      ok('AA1-D1 a Completed enrolment past its end stays Completed (records and certificate kept)', e.status === 'Completed');
      e.status = 'Active'; const a0 = aud(); render();
      ok('AA1-D1 an Active enrolment past its end becomes Expired-Incomplete on the next render', e.status === 'Expired-Incomplete' && !!e.expiredAt);
      ok('AA1-D1 the change is audited as the system, not the signed-in user', aud() === a0 + 1 && lastAud().action === 'Access period ended' && lastAud().actor === 'System (access period)' && lastAud().after === 'Expired-Incomplete', J(lastAud()));
      pick('short'); go('course', { id: 'bk5' }); ok('AA1-D1 the learner\'s course shows the access-ended state (renew)', /Your access ended on/.test(main()) && /Expired-Incomplete/.test(main()), main().slice(0, 200));
      const st0 = J(e.content.map(c => c.state)), s0 = aud();
      ACT.openItem({ dataset: { e: 'bk5', id: e.content[0].id } }); ACT.scormFinish({ dataset: { e: 'bk5', id: (e.content.find(c => c.kind === 'scorm') || e.content[0]).id } }); ACT.startQuiz({ dataset: { id: 'bk5', m: (e.modules[0] || {}).id } });
      ok('AA1-D1 open content, SCORM completion and quiz start are refused inside the actions (logged), nothing changes', !MODAL && J(e.content.map(c => c.state)) === st0 && aud() >= s0 + 3 && ADMIN.audit.slice(0, 3).every(x => /Blocked: .* \(access ended\)/.test(x.action)), J(ADMIN.audit.slice(0, 3).map(x => x.action)));
      go('dashboard'); ok('AA1-D1 no "Continue learning" for it', !cfShortNext(e));
      e.status = 'Active'; e.end = D(-1); W.quiz = null; const r = ACT.startQuiz({ dataset: { id: 'bk5', m: (e.modules[0] || {}).id } });
      ok('AA1-D1 the quiz action expires and refuses it even before a render', r === false && e.status === 'Expired-Incomplete' && !W.quiz);
      const m0 = e.modules[0], n0 = m0 ? m0.quiz.attempts.length : 0;
      e.status = 'Active'; e.end = D(-1); W.quiz = { e: 'bk5', m: m0 && m0.id, ans: {}, i: 0, ends: Date.now() + 6e5 }; finishQuiz();
      ok('AA1-D1 a quiz in progress can\'t be submitted after access ends', !W.quiz && e.status === 'Expired-Incomplete' && (!m0 || m0.quiz.attempts.length === n0));
      e.status = 'Active'; e.end = extEnd(e, 14); render(); ok('AA1-D1 after more time is granted the enrolment stays Active', e.status === 'Active');
      STORE.agy.assign.push({ id: 'SA-AA1', agency: 'CarePlus Recruitment (demo)', lid: 'IA-L-32002', learner: 'Lena Hart (demo)', course: 'Moving and Handling People', status: 'Active', kind: 'short' }); e.agyAssign = 'SA-AA1'; e.end = D(-1); render();
      ok('AA1-D1 the agency seat assignment shows the same Expired-Incomplete', STORE.agy.assign.find(x => x.id === 'SA-AA1').status === 'Expired-Incomplete');
      STORE.agy.assign = STORE.agy.assign.filter(x => x.id !== 'SA-AA1'); delete e.agyAssign; e.status = 'Active'; e.end = end0; render();
    });

    /* ---------- D3: short-course actions refuse unauthorised roles ---------- */
    await T('AA1-D3 short-course authorization', async () => {
      const c = course(); if (!c) throw new Error('no published course');
      const acts = { newCourse: {}, s1Save: { id: c.id }, pubCourse: { id: c.id }, retireCourse: { id: c.id }, s1Unretire: { id: c.id }, s1FieldAdd: { id: c.id }, s1ItemAdd: { id: c.id }, s1ItemEdit: { id: c.id, i: 'x' }, s1ItemRetire: { id: c.id, i: 'x' }, s1ItemMove: { id: c.id, i: 'x', d: '1' }, s1ModRename: { c: c.id, m: 'x' }, s1QAdd: { c: c.id, m: 'x' }, chModAdd: { c: c.id }, chModMove: { c: c.id, m: 'x', d: '1' }, chModRetire: { c: c.id, m: 'x' } };
      for (const p of ['biz', 'fin', 'agency', 'iqa', 'coord1', 'assessor', 'short']) {
        pick(p); const n0 = ADMIN.courses.length, st0 = c.status, s0 = sec(), bad = [];
        Object.entries(acts).forEach(([k, ds]) => { const m0 = MODAL; let r; try { r = ACT[k]({ dataset: ds }); } catch (e) { r = 'threw ' + e.message; } if (r !== false || (MODAL && MODAL !== m0)) bad.push(k + ':' + r); closeModal(); });
        ['chModQuiz', 'chModItem', 'fcTpl'].forEach(k => { const r = INP[k]({ dataset: { c: c.id, m: 'x', f: 'q' }, value: '1', checked: true }); if (r !== false) bad.push(k); });
        ok(`AA1-D3 ${p}: every short-course change is refused inside the action (no dialog, no change) and logged`, !bad.length && ADMIN.courses.length === n0 && c.status === st0 && sec() === s0 + Object.keys(acts).length + 3, J([bad, sec() - s0, ADMIN.courses.length - n0]));
      }
      pick('aca'); const n1 = ADMIN.courses.length; ACT.newCourse({ dataset: {} }); closeModal(); ok('AA1-D3 the Academic Admin still creates a course', ADMIN.courses.length === n1 + 1);
      go('a-courses', { id: c.id }); ACT.retireCourse({ dataset: { id: c.id } }); const k0 = ADMIN.aca, s1 = sec(); ADMIN.aca = null; reason('AA-1 confirm recheck'); ADMIN.aca = k0;
      ok('AA1-D3 a dialog opened by an allowed admin is re-checked on confirm (identity lost → refused)', c.status === 'Published' && sec() === s1 + 1, c.status);
      pick('sys'); ACT.retireCourse({ dataset: { id: c.id } }); ok('AA1-D3 the System Administrator may still open Retire (PD-W0-02)', !!MODAL && /Retire/.test(MODAL.title)); closeModal();
    });

    /* ---------- D9: Add learner ---------- */
    await T('AA1-D9 add learner list', async () => {
      pick('aca'); go('a-batches', { id: 'DEMO-L3-JAN27', tab: 'roster' }); click($1('main [data-act="addToBatch"][data-id="DEMO-L3-JAN27"]'));
      const sel = $1('#ab-l'), q = $1('#ab-q'), elig = ADMIN.learners.filter(l => l.acct === 'Active' && l.rec === 'Active');
      ok('AA1-D9 every active learner is listed, with a search box', !!q && sel.options.length === elig.length, `${sel && sel.options.length} of ${elig.length}`);
      q.value = 'lena'; INP.abFind(q); const vis = [...sel.options].filter(o => !o.hidden);
      ok('AA1-D9 search narrows the list and selects the match', vis.length === 1 && sel.value === 'IA-L-32002' && /1 learner match/.test($1('#ab-n').textContent), J([vis.map(o => o.value), sel.value, $1('#ab-n').textContent]));
      q.value = 'IA-L-32001'; INP.abFind(q); ok('AA1-D9 search by learner ID', sel.value === 'IA-L-32001');
      q.value = 'zzz'; INP.abFind(q); ok('AA1-D9 no match is said, nothing selected', sel.value === '' && /No learner matches/.test($1('#ab-n').textContent));
      closeModal();
    });

    /* ---------- D10/D11: an invoice purchase is credited when it is paid ---------- */
    await T('AA1-D10 invoice reconciliation', async () => {
      const P = () => STORE.biz.products.find(x => x.name.startsWith('Moving and Handling People — 5 seats')), p = P(), agency = 'CarePlus Recruitment (demo)';
      pick('biz'); go('a-bundles', { id: p.id, tab: 'catalogue' }); click($1(`main [data-act="chVatChange"][data-id="${p.id}"]`)); $1('#bp-vat').checked = true; $1('#bp-vatp').disabled = false; $1('#bp-vatp').value = '20'; INP.chVatDlgCalc(); reason('AA-1 VAT');
      const vq = ADMIN.queue.find(i => i.type === 'Bundle VAT setting' && i.status === 'Pending'); pick('fin'); go('a-queue', { id: vq.id }); click(qBtn(vq.id, 'approve')); reason('ok');
      pick('agency'); ok('AA1-D10 the buying agency', AGN() === agency, AGN()); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); const gq = $1('#gq'); gq.value = '7'; INP.agBuyQty(gq);
      $a('#modal-root input[name="gpm"]').find(x => x.value === 'inv').checked = true; press(); $1('#gi-po').value = 'PO-AA1'; press();
      const q = ADMIN.queue.find(i => i.type === 'Agency invoice (offline) purchase' && i.status === 'Pending' && i.data && i.data.po === 'PO-AA1'); if (!q) throw new Error('no invoice request');
      const nb = () => ADMIN.bundles.filter(b => b.agency === agency).length, b0 = nb();
      pick('fin'); go('a-queue', { id: q.id }); click(qBtn(q.id, 'approve')); reason('ok');
      ok('AA1-D10 approved but unpaid: nothing credited yet', nb() === b0 && !q.data.bundleId && q.stage === 'awaiting', J([nb() - b0, q.stage]));
      pick('biz'); const s0 = sec(); ACT.invPay({ dataset: { id: q.id } }); ok('AA1-D10 the Business Admin cannot record the payment', !MODAL && q.stage === 'awaiting' && sec() === s0 + 1); closeModal();
      pick('fin'); go('a-queue', { id: q.id }); click($1(`[data-act="invPay"][data-id="${q.id}"]`)); $1('#ip-r').value = 'BANK-AA1-1'; reason('paid');
      const bn = ADMIN.bundles.find(b => b.id === q.data.bundleId), tx = STORE.fin.tx.find(t => t.ref === 'BANK-AA1-1');
      ok('AA1-D10 recording the payment credits the bundle at once: 7 seats for CarePlus, credited once in the agency ledger', bn && bn.agency === agency && bn.seats === 7 && nb() === b0 + 1 && STORE.agy.ledger.filter(l => l.ref === 'Invoice ' + q.id && l.type === 'Credited').length === 1, J(bn));
      ok('AA1-D11 the Finance transaction and the bundle carry the VAT split at once (no "No VAT")', tx && tx.vatPct === 20 && Math.abs(tx.net + tx.vat - tx.amount) < 0.005 && bn.vatPct === 20, J([tx, bn && [bn.net, bn.vat, bn.vatPct]]));
      go('f-ledger'); const row = $a('main tr').find(r => /BANK-AA1-1/.test(r.textContent)); ok('AA1-D11 the ledger row shows the VAT, not "No VAT"', row && !/No VAT/.test(row.textContent) && /20%/.test(row.textContent), row && row.textContent.replace(/\s+/g, ' '));
      go('f-reports', { tab: 'agency' }); const fm = main(), fr = fm.match(/CarePlus Recruitment \(demo\)(\d+)£[\d,.]+£[\d,.]+£([\d,.]+)/); ok('AA1-D10 Finance → Agency revenue includes it before any agency screen is opened (1 purchase, its gross)', fr && fr[1] === '1' && +fr[2].replace(/,/g, '') === q.amount, J(fr));
      pick('biz'); go('b-reports', { tab: 'sales' }); ok('AA1-D10 Business Commercial Reports include the 7 seats before any agency screen is opened', /Sales£[\d,.]+7 seats/.test(main()), (main().match(/Sales£[\d,.]+\d+ seats/) || [''])[0]);
      pick('fin'); ACT.invPay({ dataset: { id: q.id } }); closeModal(); reconcileInvoices(); chVatSync(); pick('agency'); go('g-bundles');
      ok('AA1-D10 no replay: a second payment is refused and later reads credit nothing more', nb() === b0 + 1 && STORE.agy.ledger.filter(l => l.ref === 'Invoice ' + q.id).length === 1, J([nb() - b0]));
      ok('AA1-D10 the agency sees the bundle as its own', agyBundles().some(b => b.id === bn.id));
      const others = ADMIN.agencies.filter(a => a.name !== agency).map(a => a.name).concat('Northern Lights Care Agency (demo)');
      ok('AA1-D10 no other agency sees it', others.every(n => !agyBundles(n).some(b => b.id === bn.id)), J(others));
    });

    const keep = { kD, bid: (ADMIN.bundles.find(b => b.agency === 'CarePlus Recruitment (demo)' && b.seats === 7) || {}).id };
    signOutUI(); enr().end = D(-2); render(); keep.exp = enr().status;
    SS.setItem('ft-aa1.keep', J(keep)); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-aa1.keep') || '{}');
    await T('AA1-R refresh', async () => {
      ok('AA1-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('AA1-R the two-criterion mapping and both criteria\'s states come back', J(extra().qs[0].crits) === J(['001 1.1', '001 1.2']) && crit('CD2', '001 1.1').st === 'Achieved' && crit('CD2', '001 1.2').st === 'Achieved');
      ok('AA1-R the per-criterion judgements come back', r3Judg(keep.kD).filter(j => j.crit === '001 1.2').length >= 3);
      ok('AA1-R the expired enrolment stays expired', keep.exp === 'Expired-Incomplete' && enr().status === 'Expired-Incomplete');
      ok('AA1-R the credited bundle comes back once', !!keep.bid && ADMIN.bundles.filter(b => b.id === keep.bid).length === 1);
    });
    await T('AA1-S Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('AA1-S Reset: the assignment is back to one criterion per question', J(s2Def('a10').qs[0].crit) === J(['001 1.1']) && qCrits(extra().qs[0]).length === 1);
      ok('AA1-S Reset: criteria Not Started, no judgements', crit('CD2', '001 1.2').st === 'Not Started' && !Object.keys((STORE.r3 || {}).judg || {}).some(k => r3Judg(k).length));
      ok('AA1-S Reset: the short course is Active again', enr().status === 'Active');
      ok('AA1-S Reset: no credited test bundle', !ADMIN.bundles.some(b => b.agency === 'CarePlus Recruitment (demo)' && b.seats === 7));
    });
    await T('AA1-L legacy', async () => {
      fxLoadLegacy(); signOutUI(); S.portal = 'admin'; acaEnter('KA'); S.signedIn = true; S.ui = {};
      const b = ADMIN.batches.find(x => ['Open', 'Planned'].includes(x.status)); go('a-batches', { id: b.code, tab: 'roster' }); ACT.addToBatch({ dataset: { id: b.code } });
      const elig = ADMIN.learners.filter(l => l.acct === 'Active' && l.rec === 'Active'), sel = $1('#ab-l');
      ok('AA1-L Add learner lists every active learner (more than the old 12)', sel && sel.options.length === elig.length && elig.length > 12, `${sel && sel.options.length} of ${elig.length}`);
      const inB = (b.roster || [])[0]; ok('AA1-L a learner already in the batch is marked', !inB || [...sel.options].some(o => o.value === inB[1] && /already in this batch/.test(o.textContent)));
      closeModal();
      TCH('S'); const s = tasSubs(true).find(x => !x.live && x.toMark); if (s) { go('t-mark', { id: s.key }); const lo = (main().match(/Learning Outcome.{0,80}/) || [''])[0]; ok('AA1-L legacy (synthetic) marking still shows the legacy Level 3 criterion card (world C)', /Learning Outcome U?30\d/.test(lo) && !/U001/.test(lo), lo); } else ok('AA1-L legacy marking sample found', false);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aa1.phase'); SS.removeItem('ft-aa1.R');
})();
