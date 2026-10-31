// LP — learner portal audit corrections (31 Oct 2026; PD-LP-01…). suites.sh runs this suite with FIXTURE=client (a fresh browser);
// the last part loads the full legacy fixture. Journeys start on the sign-in page and use the demo-identity chooser; temporary records
// (a resource, a submission, a past session, messages) are made through the real handlers and Reset demo removes them.
// Checked: "Your people" and the message recipients come from the batch records (G3.7: designated Coordinator, Teacher(s),
// Assessor(s)); cross-batch / unrelated recipients and replies to staff no longer assigned are refused; staff inboxes; the staff
// timeline shows the published deadlines (no placeholder); template classes have attendance registers; the batch label; the staff
// time-zone label; unit filters; resources and their release; submission → Assessor / Coordinator → learner; attendance; Help, Browse;
// representative direct-handler refusals; Reset; the legacy learners.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); };
  const openNvq = () => { click($1('#app nav [data-go="courses"]')); click($a('main [data-go="course"]').find(a => /nvq/.test(a.dataset.id || '')) || $1('main [data-go="course"]')); };
  const card = () => $1('main section.lp-people');
  const people = () => $a('main section.lp-people .lp-person').map(li => [li.dataset.name, li.querySelector('.lp-role').textContent, !!li.querySelector('[data-act="compose"]')]);
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const foot = () => (($1('#app footer.foot') || {}).textContent || '').replace(/\s+/g, ' ');
  const AA = () => acaAdmins().map(n => 'Academic Admin — ' + n);
  const DEV = ['Michael Osei (Academic Coordinator)', 'Marcus Bell (Teacher)', 'James Pryce (Assessor (assignments))', 'James Pryce (Assessor (PD))', 'James Pryce (Assessor (observations))'];
  // a learner's send through New message, with a recipient forced into the list (as a direct call would)
  const send = (to, sub) => { ACT.compose({ dataset: {} }); const sel = $1('#m-to'); if (![...sel.options].some(o => o.textContent === to)) { const o = document.createElement('option'); o.textContent = to; sel.appendChild(o); } sel.value = to; $1('#m-sub').value = sub; $1('#m-body').value = 'LP test message'; const n0 = W.threads.length; prim(); const sent = W.threads.length > n0; closeModal(); return sent; };

  await T('LP-A Dev Patel (Fully Assisted): Your people from the batch records', async () => {
    pick('nvq-fa'); openNvq(); const b = cdBatch(), lid = W.me.id;
    ok('LP-A Dev opens his programme page (signed in through the chooser)', S.portal === 'learner' && W === STORE.worlds.CD2 && S.route === 'course' && !!card());
    // LP final (user decision A1, PD-LP-06): G3.7 — the Teacher and Assessor can be messaged. Was: […, ['Marcus Bell', 'Teacher', false], ['James Pryce', …, false]]
    ok('LP-A three people, one card each, each with Message: his designated Coordinator, the batch Teacher and the batch Assessor', J(people()) === J([['Michael Osei', 'Academic Coordinator', true], ['Marcus Bell', 'Teacher', true], ['James Pryce', 'Assessor (assignments, PD, observations)', true]]), J(people()));
    ok('LP-A the names are the batch records\' (Coordinator allocation, batch Teachers, assessor allocation)', mcOf(lid, b) === 'Michael Osei' && J(b.teachers) === J(['Marcus Bell']) && ['asg', 'pd', 'obs'].every(k => chEff(lid, k, b) === 'James Pryce'));
    ok('LP-A no other Coordinator; the Coordinator\'s Academy email only (no Teacher / Assessor contact details, no call action)', !/Helen Carter/.test(card().textContent) && J($a('main .lp-people .mc-contact').map(a => a.textContent)) === J(['michael.osei@illumin-academy.example']) && !/tel:/.test(card().innerHTML));
    ok('LP-A the Assessor\'s responsibility is stated (marks assignments and decides Pass / Fail)', /Marks your assignments and decides Pass \/ Fail/.test(card().textContent) && /Teaches your batch/.test(card().textContent));
    // Was: 'LP-A message recipients unchanged: his Coordinator and the Academic Admins only'
    ok('LP-A recipients (G3.7): his Coordinator, the batch Teacher, his Assessor, the Academic Admins — no Finance, no other Coordinator', J(recipients()) === J(DEV.concat(AA())), J(recipients()));
    ok('LP-A nothing is copied onto his record: the stored list still holds only the Coordinator', J(W.nvq.people) === J([['Academic Coordinator', 'Michael Osei']]), J(W.nvq.people));
    click($a('main .lp-people [data-act="compose"]')[1]);
    ok('LP-A Message on the Teacher\'s card opens a new message to Marcus Bell; the hint describes the list shown', !!MODAL && $1('#m-to').value === 'Marcus Bell (Teacher)' && /The people you can message for your course/.test($1('#modal-root .hint').textContent));
    closeModal();
  });

  await T('LP-B Amira Shah (Self-Paced): her own Coordinator, the same batch staff', async () => {
    pick('nvq-sp'); openNvq();
    ok('LP-B Dr Helen Carter (designated), Marcus Bell (Teacher), James Pryce (Assessor); not Michael Osei', J(people().map(p => [p[0], p[1]])) === J([['Dr Helen Carter', 'Academic Coordinator'], ['Marcus Bell', 'Teacher'], ['James Pryce', 'Assessor (assignments, PD, observations)']]) && !/Michael Osei/.test(card().textContent), J(people()));
    ok('LP-B Self-Paced: support stays message-based (no call action on the card)', /Delivery mode ?Self-Paced/.test(main()) && !/tel:|Call/.test(card().innerHTML));
    // Was: 'LP-B recipients: her Coordinator and the Academic Admins only'
    ok('LP-B recipients (G3.7): her Coordinator, Marcus Bell, James Pryce and the Academic Admins', J(recipients()) === J(['Dr Helen Carter (Academic Coordinator)'].concat(DEV.slice(1), AA())), J(recipients()));
  });

  await T('LP-C Messaging: sends, staff inboxes, refusals, a change of allocation', async () => {
    pick('nvq-fa');
    ok('LP-C Dev messages his Teacher, his Assessor and his Coordinator', send('Marcus Bell (Teacher)', 'LP to Teacher') && send('James Pryce (Assessor (assignments))', 'LP to Assessor') && send('Michael Osei (Academic Coordinator)', 'LP to Coordinator'));
    ok('LP-C (negative) the batch\'s other Coordinator (not his) is refused', !send('Dr Helen Carter (Academic Coordinator)', 'LP wrong Coordinator'));
    ok('LP-C (negative) an unrelated member of staff (not on his batch) is refused', !send('Laura Kemp (Teacher)', 'LP cross-batch') && !send('Finance Admin — Priya Shah', 'LP finance'));
    const th = W.threads.find(t => t.subject === 'LP to Teacher');
    pick('teacher'); ok('LP-C Marcus Bell\'s inbox has Dev\'s message', tasThreads().some(t => t.subject === 'LP to Teacher') && !tasThreads().some(t => t.subject === 'LP to Assessor'));
    pick('assessor'); ok('LP-C James Pryce\'s inbox has Dev\'s message to him (not the Teacher\'s)', tasThreads().some(t => t.subject === 'LP to Assessor') && !tasThreads().some(t => t.subject === 'LP to Teacher'));
    pick('coord2'); ok('LP-C Michael Osei (designated) has Dev\'s message', cooThreads().some(t => t.subject === 'LP to Coordinator'));
    pick('coord1'); ok('LP-C (isolation) Dr Helen Carter sees none of Dev\'s conversations', !cooThreads().some(t => /^LP /.test(t.subject)));
    // allocation change: the batch's Teacher becomes someone else — the next message follows; the earlier conversation is kept, read-only
    const b = cdBatch(), keep = b.teachers.slice(), other = activeStaff('Teacher').find(n => n !== 'Marcus Bell');
    b.teachers = [other]; pick('nvq-fa');
    ok('LP-C after a change of Teacher: the new Teacher is a recipient, Marcus Bell is not', recipients().includes(other + ' (Teacher)') && !recipients().some(r => /Marcus Bell/.test(r)), other);
    go('messages', { id: th.id });
    ok('LP-C the earlier conversation is kept (readable) with no reply box, and says why', !!$1('main .lp-ro') && !$1('main form[data-submit="reply"]') && /LP test message/.test(main()));
    const n = th.msgs.length; SUBMIT.reply({ dataset: { id: th.id } });
    ok('LP-C (negative) a reply sent by a direct call is refused and logged; the conversation is unchanged', th.msgs.length === n && ADMIN.security.some(x => /Reply to a conversation/.test(x.detail || x.action || J(x))));
    b.teachers = keep;
  });

  await T('LP-D The staff timeline shows the published deadlines', async () => {
    const b = cdBatch(), d1 = s2Defs().find(d => d.title === 'Assignment 1 — Person-centred values'), due = crDue(d1, CD_B);
    pick('coord2'); go('c-timeline'); const t = main();
    ok('LP-D Coordinator timeline: Assignment 1 due on its published date (13 Dec), no template placeholder (31 Dec)', /Assignment 1 due/.test(t) && !/placeholder/.test(t) && batchEvents(b).filter(e => e.type === 'deadline').every(e => e.real) && batchEvents(b).find(e => e.id === 'ed' + d1.id).start === due);
    ok('LP-D both published deadlines are on the timeline; the draft assignment is not', J(batchEvents(b).filter(e => e.type === 'deadline').map(e => e.title).sort()) === J(['Assignment 1 due', 'Assignment 2 due']));
    ACT.cooEditEv({ dataset: { b: CD_B, id: 'ed' + d1.id } });
    ok('LP-D editing it on the timeline opens its details and points to Assignment deadlines (no edit that changes nothing)', !!MODAL && !!$1('#modal-root .lp-dl-src') && !$1('#modal-root #ee-n'));
    closeModal(); pick('nvq-fa');
    ok('LP-D Dev\'s calendar has the same instant for Assignment 1', W.events.find(e => e.id === 'ed' + d1.id).start === due);
  });

  await T('LP-E Sessions and attendance', async () => {
    pick('teacher'); go('t-sessions'); const reg = ($1('main .n4-tas') || {}).textContent || '';
    ok('LP-E the template classes (Induction, Unit 1 class) are in Marcus Bell\'s attendance registers with the two added sessions', /Induction \(Zoom\)/.test(reg) && /Unit 1 class/.test(reg) && /mixed class/.test(reg) && /Self-Paced check-in/.test(reg));
    ok('LP-E they are for all learners of the batch; the Self-Paced check-in only for Amira', J(n4Eligible(s4bSessById('DEMO-L3-JAN270')).sort()) === J(['IA-L-32000', 'IA-L-32001']) && J(n4Eligible(s4bAllSess().find(s => /check-in/.test(s.title)))) === J(['IA-L-32000']));
    // a temporary session that has already happened (Add session, Self-Paced only), to record attendance
    pick('aca'); ACT.addSession({ dataset: { b: CD_B } }); $1('#se-n').value = 'LP past check-in'; $1('#se-d').value = D(-1, '10:00').slice(0, 16); $1('#se-m').value = '60'; const te = $1('#modal-root #se-t'); if (te) te.value = CD_TEACHER;
    $a('#modal-root .r2-g').forEach(x => { x.checked = (r1Opt(x.value) || {}).mode === 'Self-Paced'; }); let r = prim(), g = 0; while (r === false && MODAL && g++ < 3) r = prim(); closeModal();
    const s = s4bAllSess().find(x => x.title === 'LP past check-in');
    ok('LP-E the past session was added for the Self-Paced option', !!s && J(n4Eligible(s)) === J(['IA-L-32000']));
    pick('teacher'); ACT.n4Set({ dataset: { s: s.id, l: 'IA-L-32000' } }); if (MODAL) { $1('#n4-st').value = 'Present'; $1('#n4-m').value = '55'; const t = $1('#rsn'); if (t) t.value = 'Joined from the classroom'; prim(); closeModal(); }
    ok('LP-E Marcus Bell records Amira Present', ((n4Reg(s.id) || {}).rows || {})['IA-L-32000'] && n4Reg(s.id).rows['IA-L-32000'].status === 'Present');
    const n0 = J(n4Reg(s.id).rows); ACT.n4Set({ dataset: { s: s.id, l: 'IA-L-32001' } }); closeModal();
    ok('LP-E (negative) Dev isn\'t in the Self-Paced session — recording for him is refused', J(n4Reg(s.id).rows) === n0 && !n4Reg(s.id).rows['IA-L-32001']);
    pick('coord1'); const n1 = J(n4Reg(s.id).rows); ACT.n4Set({ dataset: { s: s.id, l: 'IA-L-32000' } }); closeModal();
    ok('LP-E (negative) a Coordinator can view but not record attendance', J(n4Reg(s.id).rows) === n1);
    pick('nvq-sp'); go('attendance'); const la = ($1('main .n4-learner') || {}).textContent || '';
    ok('LP-E Amira\'s attendance page shows the session as Present', /LP past check-in/.test(la) && /Present/.test(la), la.slice(0, 200));
    pick('nvq-fa'); go('attendance');
    ok('LP-E Dev\'s attendance page: no "NaN%", no "below the minimum" warning when nothing is recorded; not the Self-Paced session', !/NaN/.test(main()) && /No attendance recorded yet/.test(main()) && !/LP past check-in/.test(main()));
    go('calendar'); setUi('calView', 'month'); setUi('calDate', '2026-12-01'); render(); click($1('main [data-act="evPop"][aria-label^="Induction"]'));
    ok('LP-E the class details on Dev\'s calendar name the Teacher', /Teacher: Marcus Bell/.test(($1('.pop') || {}).textContent || ''));
    setUi('calView', 'month'); setUi('calDate', undefined);
  });

  await T('LP-F Batch label, time zones, unit filters', async () => {
    pick('nvq-fa'); openNvq();
    ok('LP-F the batch shows once ("DEMO-L3-JAN27", not "DEMO-L3-JAN27 — DEMO-L3-JAN27") and is still found by its code', /Batch ?DEMO-L3-JAN27 ?Batch dates/.test(main()) && !/DEMO-L3-JAN27 — DEMO-L3-JAN27/.test(main()) && chBatchOfLid(W.me.id) === cdBatch() && chBatchCodeOfW(W) === CD_B);
    go('dashboard'); ok('LP-F dashboard: the batch once', !/DEMO-L3-JAN27 — DEMO-L3-JAN27/.test(main()));
    pick('coord2'); ok('LP-F Coordinator footer names the zone its times are shown in', foot().includes(`Times in ${tzl()} (${viewerTZ()})`) && (viewerTZ() === 'Europe/London' || !/\(Europe\/London\)/.test(foot())), foot());
    go('c-learners'); const fo = (($a('main select').find(s => /Behind on/.test(s.textContent)) || {}).textContent || '');
    ok('LP-F Coordinator "Behind on" filter: the programme\'s own unit (Unit 001), no legacy U305 / U307', /Unit 001/.test(fo) && !/305|307/.test(fo), fo);
    go('c-timeline'); const units = $a('main .g-bar').map(x => x.textContent);
    ok('LP-F Coordinator timeline unit row: U001 only (no U301…U307)', J(units) === J(['U001']), J(units));
    const h2 = ($a('main h2').find(h => /DEMO-L3-JAN27/.test(h.textContent)) || {}).textContent || '';
    ok('LP-F Coordinator timeline heading names the batch once', h2.trim() === 'DEMO-L3-JAN27', h2);
    go('c-batches', { id: CD_B }); ok('LP-F Coordinator batch page heading names the batch once', ($1('main h1') || {}).textContent.trim() === 'DEMO-L3-JAN27', ($1('main h1') || {}).textContent);
    pick('teacher'); go('t-students'); const ft = (($a('main select').find(s => /Unit behind/.test(s.textContent)) || {}).textContent || '');
    ok('LP-F Teacher "Unit behind" filter: U001 only; footer names its zone', /U001/.test(ft) && !/U30[57]/.test(ft) && foot().includes(`(${viewerTZ()})`), ft);
    pick('aca'); ok('LP-F Admin footer names its zone', foot().includes(`Times in ${tzl()} (${viewerTZ()})`));
    go('a-batches', { id: CD_B }); ok('LP-F Admin batch page heading names the batch once', ($1('main h1') || {}).textContent.trim() === 'DEMO-L3-JAN27', ($1('main h1') || {}).textContent);
  });

  await T('LP-G Learning resources and their release', async () => {
    pick('aca'); const pid = cdPr().id; go('a-resources'); ACT.aUpload();
    $1('#rs-t').value = 'LP handout'; $1('#rs-p').value = pid; $1('#rs-m').innerHTML = s4bModOpts(pid); $1('#rs-m').value = s4bMods(pid)[0].key;
    $1('input[name="rs-k"][value="date"]').checked = true; $1('#rs-dt').value = D(30).slice(0, 10); $1('#rs-y').value = 'PDF'; ACT.s4bSample(); prim(); closeModal();
    const r = S4B().res.find(x => x.title === 'LP handout');
    ok('LP-G an Academic Admin adds a resource to the programme\'s module (Draft)', r && r.status === 'Draft' && r.pid === pid);
    pick('nvq-fa'); go('resources'); ok('LP-G (negative) a Draft is not shown to learners', !/LP handout/.test(main()));
    pick('aca'); ACT.s4bPub({ dataset: { id: r.id } }); const t = $1('#rsn'); if (t) t.value = 'LP test'; prim(); closeModal();
    pick('nvq-fa'); go('resources'); const it = () => W.resources.flatMap(g => g.items).find(i => i.s4id === r.id);
    ok('LP-G published with a future release date: listed but locked ("Unlocks on …")', /LP handout/.test(main()) && it().state === 'Locked' && /Unlocks on/.test(it().lock));
    ACT.openRes({ dataset: { id: it().id } }); ok('LP-G (negative) a locked resource can\'t be opened', !MODAL); closeModal();
    pick('short'); go('resources'); ok('LP-G (negative) the short-course learner (another programme) doesn\'t get it', !/LP handout/.test(main()));
    pick('teacher'); const nr = J(STORE.coo.released); ACT.cooRel({ dataset: { id: r.id, b: CD_B } });
    ok('LP-G (negative) a Teacher can\'t change a batch release', !MODAL && J(STORE.coo.released) === nr); closeModal();
    pick('coord2'); ACT.cooRel({ dataset: { id: r.id, b: CD_B } }); $1('input[name="rr-k"][value="now"]').checked = true; $1('#rr-r').value = 'Released early (LP test)'; prim(); closeModal();
    pick('nvq-sp'); ok('LP-G the Coordinator releases it now for the batch: Amira can open it', it() && it().state !== 'Locked');
    pick('aca'); ACT.s4bUnpub({ dataset: { id: r.id } }); const t2 = $1('#rsn'); if (t2) t2.value = 'LP test'; prim(); closeModal();
    pick('nvq-fa'); go('resources'); ok('LP-G unpublished: no longer shown', !/LP handout/.test(main()));
  });

  await T('LP-H Submission, criterion feedback and the final outcome', async () => {
    pick('nvq-fa'); const a = W.assignments.find(x => x.id === 'a10'), key = W.me.id + '~a10'; go('assignment', { id: a.id });
    W.drafts[a.id + '.' + a.qs[0].id + '.0'] = '<p>My workplace example of person-centred values.</p>';
    fxFast(ff => { ACT.reviewSubmit({ dataset: { id: a.id } }); prim(); ff(16500); }); closeModal();
    ok('LP-H Dev submits Assignment 1 (Review & Submit, after the undo window)', a.status === 'Submitted' && a.qs[0].rounds.length === 1);
    pick('teacher'); const nj = r3Judg(key).length; ACT.mkMet({ dataset: { k: key, q: a.qs[0].id, v: 'Met' } });
    ok('LP-H (negative) the Teacher can\'t judge a criterion', r3Judg(key).length === nj);
    pick('assessor'); ACT.mkMet({ dataset: { k: key, q: a.qs[0].id, v: 'Met' } });
    ok('LP-H James Pryce (his Assessor) records a judgement — staff-only until released', r3Judg(key).some(j => j.by === 'James Pryce' && j.role === 'Assessor' && !j.published));
    pick('coord2'); go('c-sub', { id: key }); $1('#r3-cv-' + a.qs[0].id).value = 'Met'; $1('#r3-ct-' + a.qs[0].id).value = 'Clear example, well linked to the criterion.'; ACT.r3CooJudge({ dataset: { k: key, q: a.qs[0].id } });
    ok('LP-H Michael Osei publishes criterion feedback (published at once)', r3Judg(key).some(j => j.by === 'Michael Osei' && j.role === 'Academic Coordinator' && j.published));
    ACT.r3Declare({ dataset: { k: key } }); ok('LP-H (negative) the Coordinator can\'t declare the final outcome', !MODAL && !r3Out(key)); closeModal();
    pick('nvq-fa'); go('assignment', { id: a.id }); const lc = ($1('main .r3-learner') || {}).textContent || '';
    ok('LP-H Dev sees the Coordinator\'s criterion feedback, not the Assessor\'s unreleased judgement', /Coordinator · Michael Osei/.test(lc) && /Clear example/.test(lc) && !/Assessor ·/.test(lc));
    pick('assessor'); const d = dft(key); markable(tasAsg(tasSubs(true).find(s => s.key === key))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Well done.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: key } }); prim(); closeModal();
    pick('coord2'); ACT.relOne({ dataset: { k: key } }); prim(); closeModal(); await new Promise(r => setTimeout(r, 30));
    ok('LP-H released by the Coordinator: "Feedback Received" (release doesn\'t pass the assignment)', a.status === 'Feedback Received' && !r3Out(key));
    pick('teacher'); ACT.r3Declare({ dataset: { k: key } }); ok('LP-H (negative) the Teacher can\'t declare the outcome', !MODAL && !r3Out(key)); closeModal();
    pick('assessor'); ACT.r3Declare({ dataset: { k: key } }); $1('input[name="r3-res"][value="Pass"]').checked = true; $1('#d-ofb').value = 'Overall: meets the brief.'; const t = $1('#rsn'); if (t) t.value = 'Assessed against the brief'; prim(); closeModal();
    ok('LP-H only James Pryce (allocated Assessor) declares Pass', r3Out(key) && r3Out(key).result === 'Pass' && r3Out(key).by === 'James Pryce');
    pick('nvq-fa'); go('assignment', { id: a.id }); const lc2 = ($1('main .r3-learner') || {}).textContent || '';
    ok('LP-H Dev now sees the Assessor\'s released judgement; the outcome stays unshown (R3 — pending the client)', /Assessor ·/.test(lc2) && !/Final assignment outcome/.test(main()));
    pick('nvq-sp'); ok('LP-H (isolation) Amira\'s Assignment 1 is untouched', W.assignments.find(x => x.id === 'a10').status === 'Not Started' && !r3Judg('IA-L-32000~a10').length);
  });

  await T('LP-I Help, Browse, Requests', async () => {
    pick('nvq-fa'); click($1('#app [data-go="help"]') || $1('#app nav [data-go="help"]')); $1('#ct-topic').value = 'Payments'; $1('#ct-msg').value = 'LP help question'; $1('main form[data-submit="contact"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const th = W.threads.find(t => t.subject === 'Help: Payments');
    ok('LP-I Help → Contact the Academy is delivered: a conversation with an Academic Admin, in the learner\'s Messages and the admin inbox', !!th && /^Academic Admin — /.test(th.with[0]) && ADMIN.threads.some(t => t.lthread === th.id && /Dev Patel/.test(t.party)));
    // CF (PD-CF-05): Browse shows "Continue learning" for the learner's own programme instead of Apply; the Apply handler itself is still checked directly. Was: click($a('main [data-act="applyNvq"]')[0])
    go('browse'); ok('LP-I Browse: his own programme offers Continue learning, not Apply', !!$1('main .cf-cont[data-go="course"]') && !$a('main [data-act="applyNvq"]').length);
    ACT.applyNvq({ dataset: { id: CATALOGUE.find(c => c.kind === 'nvq' && c.title === W.nvq.title).id } });
    ok('LP-I Browse → Apply when already enrolled: back to Admission & Documents, no second sign-up', S.route === 'admission' && W.signup && W.signup.batch === CD_B && !MODAL);
    go('requests'); click($a('main [data-go="profile"]')[0]); ok('LP-I My Requests → Profile change opens the profile', S.route === 'profile');
  });

  await T('LP-J Representative direct-handler refusals (learner portal)', async () => {
    pick('nvq-fa'); const r = S4B().res[0], nr = J(STORE.coo.released); ACT.cooRel({ dataset: { id: r ? r.id : 'RS-1', b: CD_B } });
    ok('LP-J (negative) a learner can\'t change a resource release', !MODAL && J(STORE.coo.released) === nr); closeModal();
    const key = 'IA-L-32000~a11', nj = r3Judg(key).length; ACT.mkMet({ dataset: { k: key, q: 'q1', v: 'Met' } }); ACT.r3Declare({ dataset: { k: key } });
    ok('LP-J (negative) a learner can\'t judge or declare on another learner\'s work', r3Judg(key).length === nj && !r3Out(key) && !MODAL); closeModal();
    const s = s4bAllSess()[0], n0 = J((n4Reg(s.id) || {}).rows || {}); ACT.n4Set({ dataset: { s: s.id, l: W.me.id } }); closeModal();
    ok('LP-J (negative) a learner can\'t record attendance', J((n4Reg(s.id) || {}).rows || {}) === n0);
    ACT.s4bPub({ dataset: { id: r ? r.id : 'RS-1' } }); ok('LP-J (negative) a learner can\'t publish a resource', !MODAL); closeModal();
  });

  await T('LP-N Closure checks: reassignment, Continue learning, unknown tab, no duplicates', async () => {
    ACT.resetDemo(); const b = cdBatch(), A = chAllocOf(b), keepT = b.teachers.slice(), keepA = { ...A };
    const newT = activeStaff('Teacher').find(n => n !== 'Marcus Bell'), newA = chAssessorNames().find(n => n !== 'James Pryce');
    pick('nvq-fa'); send('Marcus Bell (Teacher)', 'LPN to Teacher'); send('James Pryce (Assessor (assignments))', 'LPN to Assessor');
    const t1 = W.threads.find(t => t.subject === 'LPN to Teacher'), t2 = W.threads.find(t => t.subject === 'LPN to Assessor');
    b.teachers = [newT]; Object.assign(A, { asg: newA, pd: newA, obs: newA }); render();
    ok('LP-N reassignment takes effect at once: the new Teacher and Assessor are recipients; Marcus Bell and James Pryce are not', recipients().includes(newT + ' (Teacher)') && recipients().includes(newA + ' (Assessor (assignments))') && !recipients().some(r => /Marcus Bell|James Pryce/.test(r)), J(recipients()));
    ok('LP-N (negative) a new message to the former Teacher or Assessor is refused', !send('Marcus Bell (Teacher)', 'LPN again') && !send('James Pryce (Assessor (PD))', 'LPN again'));
    const n1 = t1.msgs.length, n2 = t2.msgs.length; SUBMIT.reply({ dataset: { id: t1.id } }); SUBMIT.reply({ dataset: { id: t2.id } });
    ok('LP-N (negative) the learner\'s replies to the former staff are refused; both conversations are kept', t1.msgs.length === n1 && t2.msgs.length === n2);
    pick('teacher'); const mt = tasThreads().find(t => t.subject === 'LPN to Teacher');
    ok('LP-N Marcus Bell (a participant) can still read the conversation', !!mt);
    go('t-messages', { id: mt.id }); ok('LP-N …with no reply box, and says why', !!$1('main .lp-ro') && !$1('main form[data-submit="tasReply"]'));
    $1('body').insertAdjacentHTML('beforeend', '<textarea id="trep">Reply after reassignment</textarea>'); SUBMIT.tasReply({ dataset: { id: mt.id } }); $1('#trep').remove();
    ok('LP-N (negative) Marcus Bell\'s reply sent by a direct call is refused and logged', t1.msgs.length === n1 && ADMIN.security.some(x => /Reply to a learner/.test(x.detail)));
    pick('assessor'); const ma = tasThreads().find(t => t.subject === 'LPN to Assessor');
    $1('body').insertAdjacentHTML('beforeend', '<textarea id="trep">Reply after reassignment</textarea>'); if (ma) SUBMIT.tasReply({ dataset: { id: ma.id } }); $1('#trep').remove();
    ok('LP-N James Pryce can read his conversation; his reply is refused', !!ma && t2.msgs.length === n2);
    b.teachers = keepT; Object.assign(A, keepA);
    pick('teacher'); go('t-messages', { id: mt.id });
    ok('LP-N restored: Marcus Bell can reply again (the relationship, not the conversation, decides)', !!$1('main form[data-submit="tasReply"]'));
    // Browse: an active short-course enrolment is continued; a course not enrolled on is still bought
    pick('short'); go('browse'); const lc = $1('main .lp-continue');
    ok('LP-N Lena: "Continue learning" (not "Buy now") for her active Moving and Handling People enrolment', !!lc && !$a('main [data-act="buyCourse"]').length && /enrolled until/.test(main()));
    click(lc); ok('LP-N Continue learning opens her course', S.route === 'course' && /Moving and Handling People/.test(main()));
    pick('nvq-fa'); go('browse'); ok('LP-N Dev (not enrolled on it) still sees "Buy now" at the same price', !!$1('main [data-act="buyCourse"]') && /£45\.00/.test(main()) && !$1('main .lp-continue'));
    // Coordinator: an unknown tab in the address
    pick('coord2'); go('c-batches', { id: CD_B, tab: 'no-such-tab' });
    ok('LP-N Coordinator batch page with an unknown tab: the overview with a note, never "undefined"', !/undefined/.test(main()) && !!$1('main .lp-tab') && /Overview/.test(main()));
    // No duplicates: template sessions are stable; re-syncing adds no session, calendar entry, notification or register change
    ACT.resetDemo(); const ids0 = s4bAllSess().map(s => s.id);
    pick('aca'); ACT.addSession({ dataset: { b: CD_B } }); $1('#se-n').value = 'LPN past class'; $1('#se-d').value = D(-2, '10:00').slice(0, 16); $1('#se-m').value = '60'; let r = prim(), g = 0; while (r === false && MODAL && g++ < 3) r = prim(); closeModal();
    const ps = s4bAllSess().find(s => s.title === 'LPN past class'); pick('teacher'); ACT.n4Set({ dataset: { s: ps.id, l: 'IA-L-32001' } }); if (MODAL) { $1('#n4-st').value = 'Late'; $1('#n4-m').value = '50'; const t = $1('#rsn'); if (t) t.value = 'Joined late'; prim(); closeModal(); }
    const reg0 = J(N4().regs), notif0 = CD_KEYS.map(k => STORE.worlds[k].notifs.length), tas0 = J(STORE.tas.notifs || []);
    pick('nvq-fa'); go('calendar'); const ev0 = W.events.map(e => e.id);
    for (let k = 0; k < 3; k++) { syncTasBatches(); s4bSyncAll && s4bSyncAll(); CD_KEYS.forEach(v => s4bSyncWEv(STORE.worlds[v])); }
    go('calendar'); const ev1 = W.events.map(e => e.id), ids1 = s4bAllSess().map(s => s.id);
    ok('LP-N template sessions keep stable IDs (DEMO-L3-JAN270, DEMO-L3-JAN271); re-syncing adds no session', J(ids0.filter(i => /^DEMO-L3-JAN27\d$/.test(i))) === J(['DEMO-L3-JAN270', 'DEMO-L3-JAN271']) && J(ids1) === J(ids0.concat(ps.id)) && new Set(ids1).size === ids1.length);
    ok('LP-N no duplicate calendar entries (each ID once; unchanged by re-syncing)', J(ev1) === J(ev0) && new Set(ev1).size === ev1.length, J(ev1));
    ok('LP-N no new notifications from re-syncing', J(CD_KEYS.map(k => STORE.worlds[k].notifs.length)) === J(notif0) && J(STORE.tas.notifs || []) === tas0);
    ok('LP-N the recorded attendance (Dev, Late) is kept unchanged', J(N4().regs) === reg0 && N4().regs[ps.id].rows['IA-L-32001'].status === 'Late');
    ACT.resetDemo(); ok('LP-N after Reset the template sessions have the same IDs', J(s4bAllSess().map(s => s.id)) === J(ids0));
  });

  await T('LP-K Sign-up details, certificates, a new learner', async () => {
    ACT.resetDemo(); pick('nvq-fa'); click($1('#app nav [data-go="profile"]') || $1('#app [data-go="profile"]'));
    const t = main(), L = ADMIN.learners.find(l => l.id === W.me.id);
    ok('LP-K Dev\'s profile shows the date of birth and address he entered at sign-up; the learner record matches', /Date of birth ?2 Nov 1988/.test(t) && /Address ?4 Example Road, Leicester/.test(t) && L.dob === '2 Nov 1988' && L.address === '4 Example Road, Leicester');
    click($1('#app nav [data-go="certificates"]'));
    ok('LP-K Dev\'s certificates: "No certificates yet — issued when you complete your programme"', /No certificates yet/.test(main()) && /issued when you complete your programme/.test(main()) && !/No certificates with this status/.test(main()));
    pick('short'); go('certificates'); ok('LP-K Lena\'s certificates: the short-course rule; no NVQ people or recipients', /short course's certificate is issued when you complete the course/.test(main()) && recipients().every(r => /^Academic Admin — /.test(r)));
    signOutUI(); acaEnter('KA'); S.signedIn = true; go('a-learners'); ACT.addLearner(); $1('#nl-name').value = 'Nina Fresh (demo)'; $1('#nl-email').value = 'nina.lp@demo.example'; $1('#nl-mob').value = '+44 7700 900777';
    prim(); closeModal(); const N = ADMIN.learners.find(l => l.name === 'Nina Fresh (demo)'); go('a-learner', { id: N.id }); click($1('main [data-act="lnActLink"]'));
    if (!S.signedIn) { S.portal = 'learner'; S.signedIn = true; S.ui = {}; } go('certificates');
    ok('LP-K a new learner: no people, no NVQ recipients, the general certificates empty state', !W.flags.nvq && recipients().every(r => /^Academic Admin — /.test(r)) && /Certificates appear here when you complete a course that offers one/.test(main()));
  });

  await T('LP-L Reset restores the minimal demo', async () => {
    ACT.resetDemo(); signOutUI(); const b = cdBatch(), dev = STORE.worlds.CD2;
    ok('LP-L one published programme, one batch, two admitted NVQ learners, one short-course learner', ADMIN.programmes.filter(p => p.status === 'Active').length === 1 && ADMIN.batches.length === 1 && mcLids(b).length === 2 && CD_KEYS.every(k => STORE.worlds[k]) && STORE.worlds.CD3.enrolments.filter(e => e.kind === 'short').length === 1);
    // CF final (PD-CF-11): the client demo now has two synthetic resources on its programme (added by the demo build); Reset restores exactly those. Was: !S4B().res.some(r => r.pid === cdPr().id)
    ok('LP-L no temporary records: only the two demo resources for the programme, four sessions, no submissions, judgements, outcomes or messages', J(S4B().res.filter(r => r.pid === cdPr().id).map(r => r.title).sort()) === J(['Sample handout: person-centred care (client demo)', 'Sample slides: agreeing a care plan (client demo)']) && !S4B().res.some(r => /LP handout/.test(r.title)) && s4bAllSess().length === 4 && dev.assignments.every(a => a.status === 'Not Started') && !r3Judg(dev.me.id + '~a10').length && !r3Out(dev.me.id + '~a10') && CD_KEYS.every(k => !STORE.worlds[k].threads.length) && !ADMIN.learners.some(l => /Nina Fresh/.test(l.name)));
    ok('LP-L allocations: Amira → Dr Helen Carter, Dev → Michael Osei; Teacher Marcus Bell; Assessor James Pryce', mcOf(STORE.worlds.CD1.me.id, b) === 'Dr Helen Carter' && mcOf(dev.me.id, b) === 'Michael Osei' && J(b.teachers) === J(['Marcus Bell']) && chAllocOf(b).asg === 'James Pryce');
  });

  await T('LP-M Legacy fixture: historical learners', async () => {
    ACT.fxLegacy(); const as = v => { setVariant(v); S.portal = 'learner'; S.signedIn = true; S.ui = {}; go('course', { id: 'nvq' }); };
    as('C'); const recC = recipients();
    ok('LP-M Aisha Rahman (Leicester Cohort 7): the same people and recipients as before', J(people()) === J([['Dr Helen Carter', 'Academic Coordinator', true], ['Marcus Bell', 'Teacher', true], ['Sarah Okonkwo', 'Assessor (assignments, PD, observations)', true]]) && J(recC.slice(0, 5)) === J(['Dr Helen Carter (Academic Coordinator)', 'Marcus Bell (Teacher)', 'Sarah Okonkwo (Assessor (assignments))', 'Sarah Okonkwo (Assessor (PD))', 'Sarah Okonkwo (Assessor (observations))']), J(people()) + ' ' + J(recC));
    go('messages', { id: 't2' }); ok('LP-M Aisha\'s seeded conversation with James Pryce (not her assessor) is kept, read-only', /James Pryce/.test(main()) && !!$1('main .lp-ro'));
    go('messages', { id: 't3' }); ok('LP-M …her conversation with Marcus Bell (her Teacher) can still be replied to', !!$1('main form[data-submit="reply"]'));
    as('D'); const b = ADMIN.batches.find(x => x.code === 'L2DC-MAR26');
    ok('LP-M Grace Mensah (Croydon Cohort 4): her batch\'s Teacher (Tom Whitfield), not the stored Marcus Bell', J(b.teachers) === J(['Tom Whitfield']) && people().some(p => p[0] === 'Tom Whitfield' && p[1] === 'Teacher' && p[2]) && !people().some(p => p[0] === 'Marcus Bell'), J(people()));
    ok('LP-M Grace\'s recipients follow (a message reaches the batch\'s Teacher); the record is not rewritten', recipients().includes('Tom Whitfield (Teacher)') && !recipients().some(r => /Marcus Bell/.test(r)) && W.nvq.people.some(([r, n]) => r === 'Teacher' && n === 'Marcus Bell'));
    ok('LP-M Grace\'s assessors: James Pryce (assignments, observations) and Sarah Okonkwo (PD)', people().some(p => p[0] === 'James Pryce' && p[1] === 'Assessor (assignments, observations)') && people().some(p => p[0] === 'Sarah Okonkwo' && p[1] === 'Assessor (PD)'));
    ok('LP-M legacy timeline: the seeded batch keeps its own events; its unit row is its programme\'s (Level 2)', batchEvents(b).some(e => e.type === 'deadline') && J(lpUnits(b).map(u => u.code)) === J((STORE.worlds.D.tree || []).map(u => u.code)));
    ACT.resetDemo(); signOutUI();
  });

  S.drDev = false; ACT.resetDemo(); signOut();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
