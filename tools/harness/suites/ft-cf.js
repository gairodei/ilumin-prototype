// CF — client feedback implementation (31 Oct 2026; PD-CF-*). suites.sh runs this suite with FIXTURE=client (a fresh browser); the last
// part loads the full legacy fixture. Journeys use the demo-identity chooser and the real handlers; temporary records (a draft, a
// submission, a purchase, a module) are removed by Reset demo.
// Checked: A assignment layout, References through draft / save / revisit / submission / marking views, Download criteria; B the demo
// checklist (optional, versioned, audited) and the unchanged defaults; C Start / Continue learning and its routes and gates; D no second
// active enrolment or charge, re-enrolment kept with its own ID; E module quiz prerequisites (locked, unlocked, quiz-only module,
// handler refusals, history kept); F resources (available vs not yet, empty state, direct-access refusals); G Progress & Gap Analysis.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const tick = () => new Promise(r => setTimeout(r, 30));
  const audit = re => ADMIN.audit.some(a => re.test(a.action || ''));
  // Buy a catalogue short course through Browse → Buy now → (About you) → Pay, fast-forwarding the simulated processing
  const buy = id => fxFast(ff => { ACT.buyCourse({ dataset: { id } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'CF test answer'; }); prim(); } if (MODAL && /Pay now/.test(MODAL.title || '')) { prim(); ff(3000); } closeModal(); });
  const K5 = () => CATALOGUE.find(c => c.kind === 'short' && c.course === 'SC-01').id;

  /* ---------- B. Admission documents (client demo) ---------- */
  await T('CF-B demo checklist', async () => {
    const pr = cdPr(), L = s4List(pr.id), it = n => L.items.find(i => i.name === n);
    ok('CF-B Right to work, Enhanced DBS and Highest qualification are listed and Optional on the demo programme', ['Right to work', 'Enhanced DBS certificate (or police clearance)', 'Highest qualification certificate'].every(n => it(n) && it(n).status === 'Active' && !it(n).mand));
    ok('CF-B the other documents stay mandatory (Passport or photo ID, Proof of address, CV)', ['Passport or photo ID', 'Proof of address (last 3 months)', 'CV'].every(n => it(n) && it(n).mand));
    ok('CF-B the change is a new checklist version with an audited reason', L.v > 1 && cbCkHist(pr.id).length > 1 && ADMIN.audit.filter(a => a.action === 'Checklist item changed' && /Client demo: optional/.test(a.reason || '')).length === 3);
    ok('CF-B the product default (new-programme checklist) is unchanged', J(CH8_DOCS.filter(d => d[1]).map(d => d[0])) === J(['Passport or photo ID', 'Right to work', 'Proof of address (last 3 months)', 'Enhanced DBS certificate (or police clearance)', 'Highest qualification certificate', 'CV']));
    const w = STORE.worlds.CD1;
    const tot = k => (STORE.worlds[k].plans.find(p => p.e === 'nvq') || { rows: [] }).rows.reduce((s, r) => s + fpP(r.amount), 0), b = cdBatch();
    ok('CF-B fee terms and the mixed-mode batch unchanged: Amira Self-Paced £1,800, Dev Fully Assisted £2,600, one batch for both', Math.round(tot('CD1')) === 180000 && Math.round(tot('CD2')) === 260000 && STORE.worlds.CD1.signup.plan.opt.mode === 'Self-Paced' && STORE.worlds.CD2.signup.plan.opt.mode === 'Fully Assisted' && STORE.worlds.CD1.signup.batch === b.code && STORE.worlds.CD2.signup.batch === b.code, J([tot('CD1'), tot('CD2')]));
    ok('CF-B Amira uploaded the mandatory documents and was admitted; the optional ones are not required', w.docs.filter(d => d.mand).every(d => d.status === 'Approved') && w.docs.filter(d => !d.mand).length === 3 && w.admission.status === 'Approved');
  });

  /* ---------- C. Start learning / Continue learning (client demo) ---------- */
  await T('CF-C Start learning (NVQ)', async () => {
    pick('nvq-sp'); go('dashboard');
    const b = $1('main [data-act="cfLearn"][data-id="nvq"]');
    ok('CF-C Amira (admitted, nothing started): "Start learning" on her dashboard card', !!b && b.textContent.trim() === 'Start learning' && !$1('main .enrol-card [data-go="course"].btn'));
    click(b); ok('CF-C Start learning opens her first assignment (earliest deadline)', S.route === 'assignment' && /Assignment 1/.test(main()));
    go('course', { id: 'nvq' }); ok('CF-C the programme page shows the next step with the same action', /Your next step/.test(main()) && !!$1('main .cf-nextcard [data-act="cfLearn"]'));
    pick('short'); go('dashboard'); const s = $a('main [data-act="cfLearn"]');
    ok('CF-C Lena (short course, not started): "Start learning"; no "Go to quiz"', s.length >= 1 && s.every(x => x.textContent.trim() === 'Start learning') && !/Go to quiz/.test(main()));
    const e = W.enrolments.find(x => x.kind === 'short'); click(s[0]);
    ok('CF-C Start learning opens Module 1\'s first item (Content tab, document viewer)', S.route === 'course' && MODAL && /Moving and handling: the law/.test(MODAL.title) && e.content[0].state === 'Completed'); closeModal();
    go('course', { id: e.id }); const c = $1('main [data-act="cfLearn"]');
    ok('CF-C after progress: "Continue learning" on the Overview; it opens Module 1\'s quiz', c && c.textContent.trim() === 'Continue learning' && (click(c), S.route === 'course' && /What is this module about\?/.test(main()) && !!$1('main [data-act="startQuiz"]')));
    go('browse'); const bc = $1('main .lp-continue'); ok('CF-C Browse keeps "Continue learning" (not Buy now) for her course', bc && bc.textContent.trim() === 'Continue learning' && !$1(`main [data-act="buyCourse"][data-id="${K5()}"]`));
    ACT.resetDemo(); signOutUI();
  });

  /* ---------- A. Assignment page, References, draft, submission (client demo) ---------- */
  await T('CF-A assignment', async () => {
    pick('nvq-sp'); const a = W.assignments.find(x => x.id === 'a10'), key = W.me.id + '~a10'; go('assignment', { id: a.id });
    ok('CF-A no Assignment template button; Download criteria (PDF) kept', !$a('main [data-act="fakeDl"]').some(b => /template/i.test(b.dataset.f || '')) && !!$1('main [data-act="csCritPdf"]'));
    click($1('main [data-act="csCritPdf"]')); ok('CF-A Download criteria (PDF) opens the criteria document', MODAL && /Assessment criteria/.test(MODAL.title)); closeModal();
    const order = ['.cf-asg-top', '.cf-brief', '.paper', '.cb-refs', '.cf-submit'].map(s => $1('main ' + s));
    ok('CF-A order: status and deadline, brief, questions, one References box, evidence and submission', order.every(Boolean) && order.every((x, i) => !i || (order[i - 1].compareDocumentPosition(x) & 4)) && $a('main .cb-refs').length === 1, J(order.map(Boolean)));
    ok('CF-A each question has its own answer box; References is a separate box after them', $a('main .paper .rte-body').length === a.qs.length && !!$1('main .cb-refs .rte-body[aria-label="References"]'));
    ok('CF-A status and deadline at the top; no "0 of 2 resubmissions used" or "Sub 1" before anything is submitted', /Not Started/.test($1('main .cf-asg-top').textContent) && /13 Dec 2026/.test($1('main .cf-asg-top').textContent) && !/resubmissions used|Sub 1/.test($1('main .page-h').textContent));
    ok('CF-A criteria and submission rules are disclosures (kept, not removed)', !!$1('main details.cf-crit') && /001 1\.1/.test($1('main details.cf-crit').textContent) && /PDF, DOCX/.test($1('main details.cf-more').textContent));
    const ans = $1('main .paper .rte-body'); ans.innerHTML = '<p>My CF answer about person-centred values.</p>'; INP.rteInput(ans);
    const ref = $1('main .cb-refs .rte-body'); ref.innerHTML = '<p>Care Act 2014</p><p>Skills for Care (2024) Person-centred care</p>'; INP.rteInput(ref);
    const dt = new DataTransfer(); dt.items.add(new File(['evidence'], 'cf-evidence.pdf', { type: 'application/pdf' })); const inp = $1('main .paper input[type="file"]'); inp.files = dt.files; INP.attach(inp); await tick();
    ok('CF-A the attached evidence is listed in Evidence and submission', /cf-evidence\.pdf/.test($1('main .cf-submit').textContent));
    click($1('main [data-act="cfSaveDraft"]'));
    ok('CF-A Save draft keeps the answer and the References and shows when', /CF answer/.test(W.drafts['a10.' + a.qs[0].id + '.0']) && /Care Act 2014/.test(W.drafts['a10.refs.0']) && /Draft saved/.test($1('main .cf-saved').textContent));
    go('dashboard'); ok('CF-C after a draft: "Continue learning"', ($1('main [data-act="cfLearn"][data-id="nvq"]') || {}).textContent === 'Continue learning');
    pick('nvq-fa'); pick('nvq-sp'); go('assignment', { id: a.id });
    ok('CF-A after leaving and signing back in, the answer, References and file are restored', /CF answer/.test($1('main .paper .rte-body').innerHTML) && /Care Act 2014/.test($1('main .cb-refs .rte-body').innerHTML) && /cf-evidence\.pdf/.test(main()));
    fxFast(ff => { ACT.reviewSubmit({ dataset: { id: a.id } }); ok('CF-A Review shows the References with the answers', MODAL && /Care Act 2014/.test(MODAL.body) && /References/.test(MODAL.body)); prim(); ff(16500); }); closeModal();
    ok('CF-A submitted: the References are kept with the submission (frozen)', a.status === 'Submitted' && a.refRounds.length === 1 && /Care Act 2014/.test(a.refRounds[0].html) && Object.isFrozen(a.refRounds[0]));
    go('assignment', { id: a.id }); ok('CF-A the learner\'s locked view shows the submitted References; Save draft is gone', /Care Act 2014/.test(($1('main .cb-refs-done') || {}).textContent || '') && !$1('main [data-act="cfSaveDraft"]'));
    ok('CF-A (negative) Save draft on a submitted assignment is refused', ACT.cfSaveDraft({ dataset: { id: a.id } }) === false);
    pick('assessor'); go('t-mark', { id: key }); ok('CF-A the allocated Assessor sees the References with the answers', /Care Act 2014/.test(main()));
    pick('coord1'); go('c-sub', { id: key }); ok('CF-A the learner\'s Coordinator sees the References too', /Care Act 2014/.test(main()));
    ok('CF-A References are separate from criterion feedback (no judgement made from them)', !r3Judg(key).length);
    ACT.resetDemo(); signOutUI();
  });

  /* ---------- E + D. Module quiz prerequisites, quiz-only module, duplicate purchases (client demo) ---------- */
  await T('CF-E quiz prerequisites', async () => {
    pick('short'); const e = W.enrolments.find(x => x.kind === 'short'), m = id => e.modules.find(x => x.id === id), n0 = ADMIN.audit.length;
    ok('CF-E Lena\'s course requires documents and videos (its completion rules); the SCORM item is not required there', J([...cfReqKinds(e)].sort()) === J(['doc', 'video']));
    go('course', { id: e.id, tab: 'content' });
    ok('CF-E Content: every module quiz shows that it opens when the content is complete (no "Go to the quiz")', $a('main .cf-qlock').length === 3 && !/Go to the quiz/.test(main()));
    ok('CF-E (negative) starting Module 1\'s quiz before its document is opened is refused and logged', ACT.startQuiz({ dataset: { id: e.id, m: 'm1' } }) === false && !MODAL && audit(/Blocked: start module quiz \(required content/) && ADMIN.audit.length > n0);
    W.quiz = { e: e.id, m: 'm1', ans: {}, cur: 0, ends: Date.now() + 6e5, mode: 'one', conn: true }; finishQuiz(false);
    ok('CF-E (negative) a quiz forced into progress is not recorded (finish handler)', !m('m1').quiz.attempts.length && !W.quiz);
    W.quiz = { e: e.id, m: 'm1', ans: {}, cur: 0, ends: Date.now() + 6e5, mode: 'one', conn: true }; go('quiz', { id: e.id });
    ok('CF-E (negative) the quiz screen refuses it too', /opens when you've completed its content/.test(main()) && !W.quiz);
    go('course', { id: e.id, tab: 'quiz' }); ok('CF-E Quiz tab: the lock lists what is left, with an Open button', !!$1('main .cf-qlocked [data-act="openItem"]') && !$1('main [data-act="startQuiz"]'));
    click($1('main .cf-qlocked [data-act="openItem"]')); closeModal();
    go('course', { id: e.id, tab: 'quiz' }); ok('CF-E after the document is opened, Module 1\'s quiz can be started', !!$1('main [data-act="startQuiz"][data-m="m1"]'));
    const pass = mid => { ACT.startQuiz({ dataset: { id: e.id, m: mid } }); prim(); S1Q().forEach((x, i) => { W.quiz.ans[i] = x[2]; }); ACT.quizSubmit(); prim(); W.quiz = null; };
    pass('m1'); ok('CF-E Module 1 passed (attempt recorded)', shPassed(m('m1')) && m('m1').quiz.attempts.length === 1);
    ok('CF-E (negative) Module 2 stays locked until both videos are watched to 90%', cfQuizLocked(e, m('m2')) && ACT.startQuiz({ dataset: { id: e.id, m: 'm2' } }) === false);
    ['c2', 'c4'].forEach(id => fxFast(ff => { ACT.openItem({ dataset: { e: e.id, id } }); ACT.vidPlay(); ff(12000); closeModal(); }));
    ok('CF-E the existing video signal (90% watched) unlocks Module 2', ['c2', 'c4'].every(id => e.content.find(c => c.id === id).watch >= 90) && !cfQuizLocked(e, m('m2')));
    pass('m2');
    ok('CF-E Module 3: only its document is required; the SCORM package (not required by this course) does not block', J(cfTodo(e, m('m3')).map(c => c.id)) === J(['c5']) && e.content.find(c => c.id === 'c3').state === 'Not opened');
    ACT.openItem({ dataset: { e: e.id, id: 'c5' } }); closeModal(); pass('m3');
    ok('CF-E every quiz passed after its content: course Completed with its certificate; attempts kept', e.status === 'Completed' && !!e.certId && e.modules.every(x => x.quiz.attempts.length === 1));
    // D: completed → re-enrolment allowed and gets its own ID; then no second active purchase
    const t0 = W.tx.length; go('browse'); buy(K5());
    const es = W.enrolments.filter(x => x.courseId === 'SC-01');
    ok('CF-D after completion, re-enrolment (Buy now) is allowed and paid once', es.length === 2 && W.tx.length === t0 + 1);
    ok('CF-D the new enrolment has its own ID; the completed record and its plan are kept', es[0].id !== es[1].id && es.some(x => x.status === 'Completed' && x.certId) && es.every(x => enrolById(x.id) === x) && W.plans.filter(p => es.some(x => x.id === p.e)).length === 2, J(es.map(x => x.id)));
    const t1 = W.tx.length, n1 = W.enrolments.length; ACT.buyCourse({ dataset: { id: K5() } });
    ok('CF-D (negative) Buy now again while it is active: refused, logged, no checkout, no charge', !MODAL && W.tx.length === t1 && W.enrolments.length === n1 && audit(/Blocked: buy course \(already enrolled\)/));
    ok('CF-D (negative) Re-purchase of the completed record while another is active: refused', ACT.repurchase({ dataset: { id: es.find(x => x.status === 'Completed').id } }) === false && W.tx.length === t1);
    ACT.resetDemo(); signOutUI();
  });

  await T('CF-E quiz-only module and the checkout recheck', async () => {
    pick('super'); if ($1('.otp-i')) code2fa(); const c = s1Row('SC-01'); go('a-courses', { id: 'SC-01', tab: 'modules' }); ACT.chModAdd({ dataset: { c: 'SC-01' } }); $1('#rsn').value = 'CF knowledge check'; prim(); closeModal();
    ok('CF-E Super Admin adds a module with no content (quiz only), audited', s1Mods(c).some(x => x.title === 'CF knowledge check' && !x.items.length));
    pick('nvq-sp'); const k = K5(), t0 = W.tx.length;
    ACT.buyCourse({ dataset: { id: k } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = 'CF'; }); prim(); }
    const stale = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); closeModal(); buy(k);
    const e = W.enrolments.find(x => x.courseId === 'SC-01'), q = e && e.modules.find(x => x.title === 'CF knowledge check');
    ok('CF-D Amira buys the course once', !!e && W.tx.length === t0 + 1);
    stale.fn(); ok('CF-D (negative) a second checkout opened earlier and paid later is refused at Pay: no charge, no enrolment', W.tx.length === t0 + 1 && W.enrolments.filter(x => x.courseId === 'SC-01').length === 1 && audit(/Blocked: pay for course/)); closeModal();
    ok('CF-E the quiz-only module is open at once (enrolment and release rules only)', q && !cfQuizLocked(e, q) && cfQuizLocked(e, e.modules[0]));
    ACT.startQuiz({ dataset: { id: e.id, m: q.id } }); ok('CF-E its quiz starts (confirmation shown)', MODAL && /Start the quiz/.test(MODAL.title)); closeModal();
    ACT.resetDemo(); signOutUI();
    ok('CF Reset: the added module, purchases and drafts are gone', !s1Mods(s1Row('SC-01')).some(x => x.title === 'CF knowledge check') && !STORE.worlds.CD1.enrolments.some(x => x.kind === 'short') && STORE.worlds.CD3.enrolments.length === 1 && STORE.worlds.CD3.enrolments[0].progress === 0);
  });

  /* ---------- F. The two demo resources (client demo) ---------- */
  await T('CF-F demo resources', async () => {
    const R2 = () => S4B().res.filter(r => /\(client demo\)$/.test(r.title)), pid = cdPr().id;
    ok('CF-F the demo has exactly two synthetic resources on its programme, both Published, nothing else', S4B().res.length === 2 && R2().length === 2 && R2().every(r => r.pid === pid && r.status === 'Published'));
    ok('CF-F one released now (PDF), one released on the batch start (PPT); added and published through the audited workflow', J(R2().map(r => r.type + ':' + r.rel.k).sort()) === J(['PDF:now', 'PPT:date']) && R2().find(r => r.rel.k === 'date').rel.date.slice(0, 10) === String(cdBatch().start).slice(0, 10) && ADMIN.audit.filter(a => a.module === 'Learning Resources' && a.action === 'Resource added').length === 2 && ADMIN.audit.filter(a => a.module === 'Learning Resources' && /Client demo: synthetic resource/.test(a.reason || '')).length === 2);
    const avail = R2().find(r => r.rel.k === 'now'), later = R2().find(r => r.rel.k === 'date'), item = r => cfMyItems().find(i => i.s4id === r.id);
    pick('nvq-sp'); go('resources');
    ok('CF-F Amira: the handout is available (View, download); the slides are under "Not available yet" with the batch start date', /1 resource available to you · 1 not available yet/.test(main()) && !!$1(`main .card.pad0 [data-act="openRes"][data-id="${item(avail).id}"]`) && /Unlocks on 3 Dec 2026/.test(($1('main .cf-later') || {}).textContent || '') && !$1('main .cf-later button'));
    ACT.openRes({ dataset: { id: item(avail).id } }); ok('CF-F the available resource opens', MODAL && new RegExp(avail.title.replace(/[()]/g, '.')).test(MODAL.title)); closeModal();
    ACT.openRes({ dataset: { id: item(later).id } }); ok('CF-F (negative) the scheduled resource can\'t be opened', !MODAL);
    ok('CF-F (negative) nor downloaded by name', ACT.fakeDl({ dataset: { f: later.title } }) === false && ACT.fakeDl({ dataset: { f: later.ref } }) === false);
    ok('CF-F the available file downloads for her', ACT.fakeDl({ dataset: { f: avail.title } }) !== false);
    const amiraIds = [item(avail).id, item(later).id];
    pick('nvq-fa'); go('resources'); ok('CF-F Dev (same batch) sees the same two', cfMyItems().filter(i => R2().some(r => r.id === i.s4id)).length === 2);
    pick('short'); go('resources');
    ok('CF-F Lena (not on the programme) sees neither; her page says why it is empty', !cfMyItems().some(i => R2().some(r => r.id === i.s4id)) && !!$1('main .cf-res-empty'));
    ok('CF-F (negative) Lena can\'t open either resource directly, by its ID or by Amira\'s item ID', ['res-' + avail.id, 'res-' + later.id, ...amiraIds].every(id => ACT.openRes({ dataset: { id } }) === false) && !MODAL && audit(/Blocked: open resource/));
    ok('CF-F (negative) Lena can\'t download either file by name', [avail.title, avail.ref, later.title].every(f => ACT.fakeDl({ dataset: { f } }) === false));
    pick('coord1'); ACT.cooRel({ dataset: { id: later.id, b: CD_B } }); $1('input[name="rr-k"][value="now"]').checked = true; $1('#rr-r').value = 'Released early (CF test)'; prim(); closeModal();
    pick('nvq-sp'); go('resources'); ok('CF-F batch release kept: her Coordinator releases the slides now for the batch — Amira can open them', item(later).state !== 'Locked' && !$1('main .cf-later'));
    ACT.resetDemo(); signOutUI();
    const lockedFor = k => { const w = STORE.worlds[k], r = R2().find(x => x.rel.k === 'date'); s4bSyncW(w); const i = r && (w.resources || []).flatMap(g => g.items).find(x => x.s4id === r.id); return !!i && i.state === 'Locked'; };
    ok('CF-F Reset: the same two resources again, the slides locked again for Amira (the Coordinator\'s release is not kept)', R2().length === 2 && S4B().res.length === 2 && lockedFor('CD1'));
  });

  /* ---------- Dashboard status: no prediction (client demo + temporary data) ---------- */
  await T('CF-H dashboard status', async () => {
    pick('nvq-sp'); go('dashboard'); const bd = () => $1('main .hello .cs-status');
    ok('CF-H Amira: "Nothing overdue" (neutral), never "On track"; no "Behind schedule" or projection', !!bd() && /Nothing overdue/.test(bd().textContent) && bd().dataset.s === 'none' && !/On track|Behind schedule|Projected completion/.test(main()));
    ok('CF-H one competency legend on her course card (with the counts), not a second generic one', $a('main .five-legend').length === 1 && !$a('main .legend-line').length && /Not Started · 3/.test($1('main .enrol-card .five-legend').textContent));
    const end0 = W.nvq.end; W.nvq.end = D(30); go('dashboard');
    ok('CF-H (temporary data) a programme ending within 84 days: no invented "Behind schedule" (no projection is recorded)', !/Behind schedule/.test(main()) && /Nothing overdue/.test(bd().textContent)); W.nvq.end = end0;
    const a = W.assignments[0], d0 = a.due; a.due = D(-1); go('dashboard');
    ok('CF-H a genuine reason still applies: an overdue assignment → "Needs attention" and listed in Action needed', /Needs attention/.test(bd().textContent) && /overdue/.test(main())); a.due = d0;
    ACT.resetDemo(); signOutUI();
  });

  /* ---------- F + G (client demo) ---------- */
  await T('CF-F/G client demo', async () => {
    pick('nvq-sp'); go('resources');
    ok('CF-F (negative) opening a resource id that is not hers is refused and logged', ACT.openRes({ dataset: { id: 'r2' } }) === false && audit(/Blocked: open resource/));
    go('progress');
    ok('CF-G Overview first: progress from the criteria (0 of 3), no invented projection', /0 of 3 assessment criteria achieved/.test(main()) && !/Projected completion/.test(main()));
    ok('CF-G What to do next lists her two assignments; academic work and units are shown', $a('main .cf-pnext li').length === 2 && /To do \(2\)/.test(main()) && $a('main .cf-unit').length === W.tree.length);
    go('progress', { tab: 'feedback' }); ok('CF-G Assessment feedback: an empty state before anything is marked', /No assessment feedback yet/.test(main()));
    go('progress'); click($1('main [data-act="cfUnit"]')); ok('CF-G View criteria opens that unit in the criteria tree', S.route === 'progress' && !!$1('main details.lvl-1[open]') && /Criteria &amp; evidence|Criteria & evidence/.test($1('main .subtabs [aria-selected="true"]').textContent));
    go('browse'); ok('CF-D Browse: her own NVQ programme offers "Continue learning", not Apply', !!$1('main .cf-cont[data-go="course"]') && !$1('main [data-act="applyNvq"][data-id="k-NV-N1"]'));
    const n = Object.keys(STORE.worlds).length; ACT.applyNvq({ dataset: { id: 'k-NV-N1' } }); ok('CF-D (negative) a direct Apply for the programme she is on starts nothing', !MODAL && Object.keys(STORE.worlds).length === n && W.signup.done); closeModal();
    signOutUI();
  });

  /* ---------- Legacy fixture: seeded records with feedback, resources, short courses ---------- */
  fxLoadLegacy();
  await T('CF legacy', async () => {
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
    go('progress'); const t = main();
    // Was (before CF): "Projected completion: <today + 84 days> … on track" for every learner — a fixed offset, not a record (PD-CF-07)
    ok('CF-G Aisha: Overview with real progress (7 of 27), no invented projection, next actions and academic work', /7 of 27 assessment criteria achieved/.test(t) && !/Projected completion/.test(t) && /Resubmit Assignment 2/.test(t) && /With your assessor \(2\)/.test(t));
    ok('CF-G a passed deadline is shown as passed, not due', /Deadline passed 1 Oct 2026/.test(t) && !$a('main .cf-pnext li').some(li => /Assignment 6/.test(li.textContent)));
    go('progress', { tab: 'feedback' }); const f = main();
    ok('CF-G Assessment feedback: released Met / Partially met / Not met per answer, Coordinator feedback, history; no outcome derived', /Met/.test(f) && /Not met/.test(f) && /Coordinator feedback/.test(f) && /doesn't by itself decide/.test(f) && !/Final outcome|Pass \/ Fail/.test(f));
    go('progress', { tab: 'plan' }); ok('CF-G the gaps tab is kept', /Outstanding criteria/.test(main()));
    go('progress', { tab: 'pd' }); ok('CF-G the PD checklist tab is kept', /PD consolidation checklist/.test(main()));
    go('assignment', { id: 'a2' }); ok('CF-A a resubmission: the resubmission deadline at the top and "Evidence and submission" at the end', /Resubmission deadline/.test($1('main .cf-asg-top').textContent) && !!$1('main .cf-submit [data-act="cfSaveDraft"]'));
    go('assignment', { id: 'a4' }); ok('CF-A a submitted assignment shows when it was submitted, not a countdown', /Submitted/.test($1('main .cf-asg-top').textContent) && !$1('main .cf-asg-top [data-count]'));
    go('assignment', { id: 'a3' }); ok('CF-A a seeded assignment keeps the template it offers (Resources and templates)', $a('main [data-act="fakeDl"]').some(b => /Assignment template/.test(b.dataset.f)));
    go('resources'); const later = $a('main .cf-later li');
    ok('CF-F Aisha: locked and scheduled resources are together under "Not available yet", without Open buttons', later.length === 2 && later.every(li => !li.querySelector('button')) && /Unlocks/.test($1('main .cf-later').textContent));
    ok('CF-F available resources stay in their unit groups with their buttons', /resources available to you/.test(main()) && $a('main .card.pad0 [data-act="openRes"]').length > 5);
    ok('CF-F (negative) downloading a locked resource by its name is refused; her own released one downloads', ACT.fakeDl({ dataset: { f: 'Fire evacuation plans (PPT)' } }) === false && ACT.fakeDl({ dataset: { f: 'Slides: types of harm and abuse' } }) !== false);
    ok('CF-F (negative) opening a locked resource is refused', (ACT.openRes({ dataset: { id: 'r7' } }), !MODAL));
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
    const cc = W.enrolments.find(e => e.id === 'cc'), t0 = W.tx.length; go('browse');
    ok('CF-D Daniel: The Care Certificate (active, titled differently) shows Continue learning, not Buy now', !!$1('main .cf-cont[data-id="cc"]'));
    ACT.buyCourse({ dataset: { id: 'k-SC-07' } }); ok('CF-D (negative) a direct Buy now for it is refused (no charge)', !MODAL && W.tx.length === t0 && W.enrolments.filter(e => e.topic === 'cc').length === 1);
    go('browse'); ok('CF-D Fire Safety (payment being confirmed) is not offered again', /Payment being confirmed/.test(main()) && ACT.buyCourse({ dataset: { id: 'k-SC-04' } }) === false);
    ok('CF-D (negative) renewing the Moving and Handling certificate while the 2026 enrolment is active is refused', ACT.renewCert({ dataset: { id: 'c1' } }) === false && !MODAL && W.tx.length === t0);
    // Renewal (the approved workflow is a paid new enrolment — "renewal (new enrolment)"): before expiry it works once; it never becomes a second active enrolment
    const fh = () => W.enrolments.filter(e => e.base === 'Food Hygiene Level 2'), tf = W.tx.length;
    fxFast(ff => { ACT.renewCert({ dataset: { id: 'c2' } }); ok('CF-D Food Hygiene certificate (valid, no enrolment on that course): Renew opens the renewal checkout', MODAL && /Pay now/.test(MODAL.title) && /renewal \(new enrolment\)/.test(MODAL.body)); prim(); ff(3000); closeModal(); });
    ok('CF-D the renewal is one enrolment and one charge', fh().length === 1 && fh()[0].status === 'Active' && W.tx.length === tf + 1);
    ok('CF-D (negative) renewing again while that renewal is active is refused: no second enrolment, no charge', ACT.renewCert({ dataset: { id: 'c2' } }) === false && !MODAL && fh().length === 1 && W.tx.length === tf + 1);
    ok('CF-D (negative) nor can the same course be bought from Browse', ACT.buyCourse({ dataset: { id: 'k4' } }) === false && fh().length === 1 && W.tx.length === tf + 1); closeModal();
    ok('CF-D Infection Prevention (expired) can still be re-purchased (renewal route kept)', (ACT.repurchase({ dataset: { id: 'ipc' } }), MODAL && /Pay now/.test(MODAL.title))); closeModal();
    const mh = W.enrolments.find(e => e.id === 'mh26');
    ok('CF-E Daniel\'s Moving and Handling: Module 2 locked (videos not watched), Module 1 open with its earlier attempt kept', cfQuizLocked(mh, mh.modules[1]) && !cfQuizLocked(mh, mh.modules[0]) && mh.modules[0].quiz.attempts.length === 1);
    ok('CF-E (negative) a discontinued course\'s quiz can\'t be started', ACT.startQuiz({ dataset: { id: 'med' } }) === false);
    ok('CF-F (negative) an expired course\'s content can\'t be opened directly', ACT.openItem({ dataset: { e: 'ipc', id: 'c1' } }) === false && !MODAL);
    S.variant = 'B'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('dashboard');
    ok('CF-C gate kept: an applicant mid-sign-up gets no Start learning; content stays behind "Finish your sign-up"', !$1('main [data-act="cfLearn"]') && (go('course', { id: 'nvq' }), go('assignments'), /Finish your sign-up/.test(main())));
    S.edge = 'paused'; S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('dashboard');
    ok('CF-C gate kept: paused access shows no Start / Continue learning', !$1('main [data-act="cfLearn"]') && ACT.openItem({ dataset: { e: 'mh26', id: 'c1' } }) === false);
    S.edge = 'none';
  });

  fxLoadClient(); S.drDev = false; ACT.resetDemo(); signOut();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
