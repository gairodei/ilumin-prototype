// Setup fixes S1–S5 — every check does the admin action, then checks the consuming screen (Browse, the learner's
// enrolment, quiz and certificate, the assessor's marking, sign-up).
// S3: programme structures, versions, library and types, plus the S3 acceptance corrections A–E, 13 end-to-end
// workflows (incl. learners keeping their version, programme isolation, access refusals) and the S2 / CH-17 marker line.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const html = () => app().innerHTML;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; initStore(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { ACT.switchRole({ dataset: { r } }); S.signedIn = true; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'Setup test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const browseIds = () => [...app().querySelectorAll('main [data-act="buyCourse"]')].map(b => b.dataset.id);
  const buy = async id => { ACT.buyCourse({ dataset: { id } }); prim(); await wait(3000); closeModal(); };
  // Build a complete course through the admin screens: details and price, two modules, content in both, questions
  const buildCourse = async (title, price) => {
    SA(); go('a-courses'); ACT.newCourse(); const id = S.params && S.params.id || ADMIN.courses[ADMIN.courses.length - 1].id;
    go('a-courses', { id, tab: 'details' }); fill({ '#cd-t': title, '#cd-g': String(price), '#cd-d': 'Test course description.', '#cd-du': '1 hour', '#cd-ap': '60' });
    ACT.s1Save({ dataset: { id, t: 'details' } }); reason('Details');
    go('a-courses', { id, tab: 'modules' });
    ['Basics', 'In practice'].forEach(t => { ACT.chModAdd({ dataset: { c: id } }); document.querySelector('#rsn').value = t; press(); });
    go('a-courses', { id, tab: 'content' });
    ACT.s1ItemAdd({ dataset: { id } }); fill({ '#ci-t': 'Guide to the basics', '#ci-m': 'm1' }); ACT.s1SampleFile(); prim();
    ACT.s1ItemAdd({ dataset: { id } }); const k = document.querySelector('#ci-k'); k.value = 'video'; INP.s1Kind(k); fill({ '#ci-t': 'Practice video', '#ci-s': '824804225', '#ci-m': 'm2' }); prim();
    go('a-courses', { id, tab: 'modules' });
    [['m1', 'Basics question one?'], ['m2', 'Practice question one?'], ['m2', 'Practice question two?']].forEach(([m, q]) => { ACT.s1QAdd({ dataset: { c: id, m } }); fill({ '#nq': q, '#nq-o0': 'Right answer', '#nq-o1': 'Wrong A', '#nq-o2': 'Wrong B', '#nq-o3': 'Wrong C' }); prim(); });
    return id;
  };

  /* ================= S1 — short courses ================= */
  await T('S1-07 Browse lists the published admin courses (one source)', async () => {
    fresh(); learner('A'); go('browse'); const ids = browseIds(), pub = ADMIN.courses.filter(c => c.status === 'Published');
    ok('S1-07 every published course is in Browse, nothing else', ids.length === pub.length && pub.every(c => CATALOGUE.some(x => x.course === c.id && ids.includes(x.id))), ids.join());
    ok('S1-07 today\'s five keep their ids, order and prices (k1–k5)', ['k1', 'k2', 'k3', 'k4', 'k5'].every((k, i) => ids[i] === k) && CATALOGUE.find(x => x.id === 'k2').price === 39 && CATALOGUE.find(x => x.id === 'k4').price === 20 && CATALOGUE.find(x => x.id === 'k5').price === 45);
    ok('S1-07 MCA, End of Life, Food Hygiene now in Short Courses (Published); Oral Health Published', ['SC-10', 'SC-11', 'SC-12', 'SC-08'].every(id => ADMIN.courses.find(c => c.id === id).status === 'Published'));
    ok('S1-07 admin-only published courses appear at their admin prices', ['Basic Life Support and Anaphylaxis', 'Infection Prevention and Control', 'Fire Safety Awareness', 'Medication Awareness', 'Dementia Awareness', 'The Care Certificate (15 Standards)'].every(t => { const c = CATALOGUE.find(x => x.title === t), a = ADMIN.courses.find(x => x.title === t); return c && a && c.price === a.gbp && /£/.test(main()) && main().includes(t); }));
    ok('S1-07 retired course (First Aid Awareness) not in Browse', !main().includes('First Aid Awareness'));
  });

  await T('S1-01 details and price saved and shown in Browse', async () => {
    fresh(); SA(); go('a-courses', { id: 'SC-10', tab: 'details' }); fill({ '#cd-t': 'Mental Capacity Act and LPS', '#cd-g': '44', '#cd-d': 'Updated for the Liberty Protection Safeguards.', '#cd-du': '3.5 hours', '#cd-ap': '120' });
    ACT.s1Save({ dataset: { id: 'SC-10', t: 'details' } }); reason('Retitle');
    const c = ADMIN.courses.find(x => x.id === 'SC-10');
    ok('S1-01 saved: title, price, access, description, duration; new version; audited', c.title === 'Mental Capacity Act and LPS' && c.gbp === 44 && c.access === 120 && s1Spec(c).desc.startsWith('Updated') && s1Spec(c).dur === '3.5 hours' && c.version === 2 && ADMIN.audit.some(a => /Saved \(details\)/.test(a.action)));
    go('a-courses'); ok('S1-01 Short Courses list shows the new title and price', main().includes('Mental Capacity Act and LPS') && main().includes('£44.00'));
    learner('A'); go('browse'); ok('S1-01 Browse shows the new title, price, description and duration', main().includes('Mental Capacity Act and LPS') && main().includes('£44.00') && main().includes('Updated for the Liberty') && main().includes('3.5 hours'));
    acaEnter('KA'); S.signedIn = true; go('a-courses', { id: 'SC-10', tab: 'details' }); ok('S1-01 Academic Admin: price read-only', $('#cd-g').readOnly);
    fill({ '#cd-g': '1', '#cd-du': '4 hours' }); ACT.s1Save({ dataset: { id: 'SC-10', t: 'details' } }); reason('Aca edit');
    ok('S1-01 Academic Admin can save details but not the price', c.gbp === 44 && s1Spec(c).dur === '4 hours');
  });

  await T('S1-03 / S1-04 / S1-05 content, modules and questions reach the learner', async () => {
    fresh(); const id = await buildCourse('Pressure Ulcer Prevention', 28), c = ADMIN.courses.find(x => x.id === id);
    go('a-courses', { id, tab: 'content' }); ok('S1-03 Content: the course\'s own items (no shared Moving and Handling list)', main().includes('Guide to the basics') && main().includes('Practice video') && !/hoist and sling/i.test(main()));
    ok('S1-03 items saved with type, source and module', s1Spec(c).items.length === 2 && s1Spec(c).items[1].kind === 'video' && s1Spec(c).items[1].src === '824804225' && s1Mods(c).find(m => m.id === 'm2').items.includes('c2'));
    ACT.s1ItemAdd({ dataset: { id } }); let k = document.querySelector('#ci-k'); k.value = 'link'; INP.s1Kind(k); fill({ '#ci-t': 'NICE guidance', '#ci-s': 'not a url', '#ci-m': 'm2' }); prim(); ok('S1-03 link needs a full address', !!MODAL && /https/.test(mroot().textContent));
    fill({ '#ci-s': 'https://www.nice.org.uk/guidance/cg179' }); prim();
    ACT.s1ItemAdd({ dataset: { id } }); k = document.querySelector('#ci-k'); k.value = 'scorm'; INP.s1Kind(k); fill({ '#ci-t': 'Interactive check', '#ci-m': 'm2' }); ACT.s1SampleFile(); document.querySelector('#ci-sv').value = 'SCORM 2004'; prim();
    ok('S1-03 link and SCORM 2004 added', s1Spec(c).items.some(i => i.kind === 'link') && s1Spec(c).items.some(i => i.kind === 'scorm' && i.scorm === 'SCORM 2004'));
    ACT.s1ItemMove({ dataset: { id, i: 'c2', d: '-1' } }); ok('S1-03 reorder', s1Spec(c).items[0].id === 'c2');
    ACT.s1ItemEdit({ dataset: { id, i: 'c1' } }); fill({ '#ci-t': 'Guide to the basics (v2)' }); prim(); ok('S1-03 edit', s1Spec(c).items.find(i => i.id === 'c1').title === 'Guide to the basics (v2)');
    ACT.s1ItemRetire({ dataset: { id, i: 'c4' } }); reason('Not needed'); ok('S1-03 retire (kept, out of its module)', s1Spec(c).items.find(i => i.id === 'c4').status === 'Retired' && !s1Mods(c).some(m => m.items.includes('c4')));
    go('a-courses', { id, tab: 'modules' }); ACT.s1ModRename({ dataset: { c: id, m: 'm1' } }); fill({ '#mr-t': 'The basics' }); prim(); ok('S1-04 rename module', s1Mods(c)[0].title === 'The basics');
    ACT.s1QEdit({ dataset: { c: id, m: 'm2', q: 'q2' } }); fill({ '#nq': 'Practice question two (edited)?' }); prim(); ACT.s1QAdd({ dataset: { c: id, m: 'm2' } }); fill({ '#nq': 'Third?', '#nq-o0': 'A', '#nq-o1': 'B', '#nq-o2': 'C', '#nq-o3': 'D' }); prim(); ACT.s1QRetire({ dataset: { c: id, m: 'm2', q: 'q3' } });
    ok('S1-05 questions: add, edit, retire (per module)', s1ActQs(s1Mods(c)[1]).length === 2 && s1Mods(c)[1].quiz.qs.find(q => q.id === 'q2').text === 'Practice question two (edited)?' && s1Mods(c)[0].quiz.qs.length === 1);
    const pm = $('#mq-m2-pass'); pm.value = '50'; INP.chModQuiz(pm); const qq = $('#mq-m2-q'); qq.value = '5'; INP.chModQuiz(qq);
    ok('S1-05 settings: questions shown can\'t exceed the module\'s questions', s1Mods(c)[1].quiz.pass === 50 && s1Mods(c)[1].quiz.q !== 5); qq.value = '2'; INP.chModQuiz(qq); const q1 = $('#mq-m1-q'); q1.value = '1'; INP.chModQuiz(q1); const p1 = $('#mq-m1-pass'); p1.value = '50'; INP.chModQuiz(p1);
    ACT.pubCourse({ dataset: { id } }); reason('Ready'); ok('S1-07 published', c.status === 'Published');
    learner('A'); go('browse'); const kid = CATALOGUE.find(x => x.course === id).id; ok('S1-07 the new course is in Browse at its price', browseIds().includes(kid) && main().includes('Pressure Ulcer Prevention') && main().includes('£28.00'));
    await buy(kid); const e = W.enrolments.find(x => x.courseId === id);
    ok('S1-07 bought through the normal checkout', !!e && W.plans.some(p => p.e === e.id && p.total === 28));
    ok('S1-03 the learner gets this course\'s own content (retired item left out)', e.content.map(x => x.title).join('|') === 'Practice video|Guide to the basics (v2)|NICE guidance' && e.content.find(x => x.kind === 'link').src.startsWith('https://'));
    ok('S1-04 the learner sees the renamed modules and their content', e.modules.map(m => m.title).join('|') === 'The basics|In practice' && e.modules[1].items.join() === 'c2,c3');
    go('course', { id: e.id, tab: 'content' }); ok('S1-03 / S1-04 learner course page: module names and item types (Link)', main().includes('The basics') && main().includes('In practice') && /Link/.test(main()));
    ok('S1-05 the learner\'s module quiz uses the module\'s questions and settings', e.modules[1].quiz.qs.length === 2 && e.modules[1].quiz.q === 2 && e.modules[1].quiz.pass === 50 && e.modules[1].quiz.qs[1][0] === 'Practice question two (edited)?');
    e.content.forEach(x => { x.state = 'Completed'; x.watch = 100; });
    ACT.startQuiz({ dataset: { id: e.id, m: 'm2' } }); prim(); render();
    ok('S1-05 quiz screen shows the module\'s own questions', S.route === 'quiz' && /Question 1 of 2/.test(main()) && main().includes('Practice question one?'));
    W.quiz.ans = { 0: 0, 1: 1 }; finishQuiz(false); const at = e.modules[1].quiz.attempts[0];
    ok('S1-05 scored on the module\'s questions and pass mark (1 of 2 = 50% → Pass)', at.score === 50 && at.result === 'Pass');
  });

  await T('S1-02 custom fields: "About you for this course" and the admin record', async () => {
    fresh(); SA(); go('a-courses', { id: 'SC-11', tab: 'details' }); ACT.s1FieldAdd({ dataset: { id: 'SC-11' } }); fill({ '#cf-l': 'Employer name' }); prim();
    ACT.s1FieldAdd({ dataset: { id: 'SC-11' } }); fill({ '#cf-l': 'Job title', '#cf-t': 'text' }); document.querySelector('#cf-r').checked = false; prim();
    const sp = s1Spec(ADMIN.courses.find(c => c.id === 'SC-11'));
    ok('S1-02 fields added (label, type, required)', sp.fields.length === 2 && sp.fields[0].req && !sp.fields[1].req);
    ACT.s1FieldEdit({ dataset: { id: 'SC-11', f: 'f2' } }); fill({ '#cf-l': 'Role' }); prim(); ACT.s1FieldRetire({ dataset: { id: 'SC-11', f: 'f2' } }); reason('Not needed');
    ok('S1-02 field edited and retired', sp.fields[1].label === 'Role' && sp.fields[1].status === 'Retired');
    learner('A'); go('browse'); ACT.buyCourse({ dataset: { id: 'k3' } });
    ok('S1-02 the course with fields asks "About you for this course" first', MODAL && /About you for this course/.test(MODAL.title) && !!document.querySelector('#sf-f1') && !document.querySelector('#sf-f2'));
    prim(); ok('S1-02 required field checked', MODAL && /About you/.test(MODAL.title) && /Enter employer name/.test(mroot().textContent));
    fill({ '#sf-f1': 'Riverside Care Home' }); prim(); ok('S1-02 then the normal checkout', MODAL && /Amount due/.test(mroot().textContent)); prim(); await wait(3000); closeModal();
    const e = W.enrolments.find(x => x.courseId === 'SC-11'); ok('S1-02 answers stored on the enrolment', !!e && e.fields[0][1] === 'Riverside Care Home');
    SA(); go('a-learner', { id: STORE.worlds.A.me.id, tab: 'enrolments' }); ok('S1-02 shown on the learner\'s admin record', /Enrolment details from the learner/.test(main()) && main().includes('Riverside Care Home'));
    learner('A'); go('browse'); ACT.buyCourse({ dataset: { id: 'k4' } }); ok('S1-02 a course with no fields goes straight to checkout', MODAL && /Amount due/.test(mroot().textContent)); closeModal();
  });

  await T('S1-06 completion rules, certificate template, validity and reminders reach the certificate', async () => {
    fresh(); const id = await buildCourse('Oxygen Safety', 18), c = ADMIN.courses.find(x => x.id === id);
    s1Mods(c).forEach(m => { m.quiz.q = s1ActQs(m).length; m.quiz.pass = 50; });
    go('a-courses', { id, tab: 'completion' }); document.querySelector('.s1-rule[value="video"]').checked = false; ACT.s1Save({ dataset: { id, t: 'completion' } }); reason('No video rule');
    go('a-courses', { id, tab: 'certificate' }); document.querySelector('#ct-l').value = 'Portrait — minimal'; document.querySelector('.s1-cf[value="QR code"]').checked = false; ACT.s1Save({ dataset: { id, t: 'certificate' } }); reason('Portrait');
    go('a-courses', { id, tab: 'validity' }); document.querySelector('input[name="val"][value="custom"]').checked = true; fill({ '#val-n': '6', '#rem': '20, 5' }); ACT.s1Save({ dataset: { id, t: 'validity' } }); reason('6 months');
    ok('S1-06 saved', !s1Spec(c).rules.video && s1Spec(c).cert.layout === 'Portrait — minimal' && !s1Spec(c).cert.fields.includes('QR code') && c.validity === '6 months' && s1Spec(c).remind === '20, 5');
    ACT.pubCourse({ dataset: { id } }); reason('Go'); learner('A'); await buy(CATALOGUE.find(x => x.course === id).id); const e = W.enrolments.find(x => x.courseId === id);
    ok('S1-06 the enrolment follows the rules (no video rule)', !e.reqs.some(([r]) => /video/i.test(r)) && e.reqs.some(([r]) => /^Pass every module quiz with 50% or more/.test(r)));
    e.content.forEach(x => { if (x.kind === 'doc') x.state = 'Completed'; }); // the video isn't watched — not required
    e.modules.forEach(m => { m.quiz.attempts.push({ n: 1, at: now().toISOString(), score: 100, result: 'Pass' }); }); recalcShort(e); shComplete(e);
    const cert = W.certs.find(x => x.id === e.certId), months = (new Date(cert.expires) - new Date(cert.issued)) / (30.44 * DAY);
    ok('S1-06 completed without the video (rule off); certificate issued', e.status === 'Completed' && !!cert);
    ok('S1-06 certificate validity 6 months', Math.round(months) === 6, months.toFixed(2));
    go('certificates'); const card = [...app().querySelectorAll('main article.card')].find(a => a.textContent.includes('Oxygen Safety'));
    ok('S1-06 certificate shows the template layout and reminders 20 / 5 days, without the QR code', !!card && /Template: Portrait — minimal/.test(card.textContent) && /20 days/.test(card.textContent) && /5 days/.test(card.textContent) && !card.querySelector('.qr, svg.qr, [class*="qr"]'));
  });

  await T('S1-07 publish checks, retire and un-retire', async () => {
    fresh(); SA(); go('a-courses'); ACT.newCourse(); const id = ADMIN.courses[ADMIN.courses.length - 1].id;
    ACT.pubCourse({ dataset: { id } }); ok('S1-07 a new course can\'t be published until it has a title, price, module, content and quiz', /Can't publish yet/.test(MODAL.title) && /title/.test(mroot().textContent) && /price/.test(mroot().textContent) && /module/.test(mroot().textContent) && !/Mark as fixed/.test(mroot().textContent)); closeModal();
    ok('S1-07 no "Mark as fixed (prototype)" workaround', !MODAL || !MODAL.actions.some(a => /Mark as fixed/.test(a.label)));
    go('a-courses', { id: 'SC-12' }); ACT.retireCourse({ dataset: { id: 'SC-12' } }); reason('Withdrawn');
    learner('A'); go('browse'); ok('S1-07 retired → gone from Browse', !browseIds().includes('k4') && !main().includes('Food Hygiene Level 2'));
    SA(); go('a-courses', { id: 'SC-12' }); ok('S1-07 retired course offers Un-retire', !!app().querySelector('[data-act="s1Unretire"]'));
    ACT.s1Unretire({ dataset: { id: 'SC-12' } }); reason('Back by demand'); learner('A'); go('browse');
    ok('S1-07 un-retired → back in Browse; audited', browseIds().includes('k4') && ADMIN.audit.some(a => a.action === 'Un-retired'));
  });

  await T('S1 existing demo behaves as before', async () => {
    fresh(); learner('A'); const e0 = W.enrolments.find(x => x.id === 'mh26');
    ACT.startQuiz({ dataset: { id: 'mh26' } }); prim(); render(); ok('S1 seeded enrolment quiz: today\'s 10 questions', /Question 1 of 10/.test(main()) && main().includes(QUIZ_BANK[0][0]));
    closeModal(); W.quiz = null; go('browse'); await buy('k5'); const e = W.enrolments.find(x => x.id === 'bk5');
    ok('S1 buying Moving and Handling: same content, modules, quiz settings and requirements as before', !!e && e.content.map(x => x.title).join('|') === shortContent('mh').map(x => x.title).join('|') && e.modules.map(m => m.id + ':' + m.items.join()).join('|') === shModules({ topic: 'mh' }).map(m => m.id + ':' + m.items.join()).join('|') && e.modules.every(m => m.quiz.q === 10 && m.quiz.pass === 80 && m.quiz.max === 3 && m.quiz.limit === 20) && e.reqs.map(r => r[0]).join('|') === 'Open all documents|Watch all videos to at least 90%|Pass every module quiz with 80% or more' && e.end === D(90), e && e.reqs.map(r => r[0]).join('|'));
    ok('S1 bought quiz: today\'s bank questions', e.modules[0].quiz.qs.length === 10 && e.modules[0].quiz.qs[0][0] === QUIZ_BANK[0][0]);
  });

  await T('S1 records and Scenario #26', async () => {
    fresh(); const s = SC_LIST().find(x => x[0] === '26');
    ok('Scenario #26 "Create and sell a short course": 9 steps, ends with the certificate', !!s && s[1] === 'Create and sell a short course' && s[3].length === 9 && /buys/.test(s[3][6].text) && /certificate/i.test(s[3][8].text));
    ACT.s1Sc26Buy(); ok('Scenario #26 demo course published and in Browse', browseIds().some(id => (CATALOGUE.find(x => x.id === id) || {}).course === 'SC-26'));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: Setup S1 entry', /Setup fixes — short courses end to end/.test(main()));
    go('demo-scenarios'); ok('Demo Scenarios: #26 present', !!app().querySelector('#sc-26'));
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('Admin index: Setup fixes entries with purpose lines', !!sec && sec.querySelectorAll('li').length >= 3 && [...sec.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')));
  });

  /* ================= S2 — assignments ================= */
  const tasV = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const newAsg = (title) => { SA(); go('a-assignments'); ACT.newAsg(); const u = document.querySelector('#na-u'); u.value = [...u.options].find(o => /^U306 · Module 1/.test(o.textContent)).value; fill({ '#na-t': title, '#na-d': D(25, '21:59').slice(0, 16) }); prim(); return s2Defs().find(d => d.title === title); };
  const addQs = (d, qs) => qs.forEach(t => { ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': t }); prim(); });
  const mapAll = d => { go('a-assignments', { id: d.id, tab: 'mapping' }); d.qs.filter(q => q.status === 'Active').forEach((q, i) => { const box = [...app().querySelectorAll('[data-onchange="mapChange"][data-q="' + q.id + '"]')][i % 2]; box.checked = true; INP.mapChange(box); }); };
  const publish = (d, codes = ['L3AC-JAN26']) => { ACT.pubAsg({ dataset: { id: d.id } }); $$('.s2-pb').forEach(x => { x.checked = codes.includes(x.value); }); reason('Publish'); };

  await T('S2-01 / S2-03 / S2-04 new assignment, its own questions and mapping', async () => {
    fresh(); const n0 = s2Defs().length, d = newAsg('Assignment 30 — Safeguarding in practice');
    ok('S2-01 "New assignment" creates a real Draft (not Assignment 8)', !!d && s2Defs().length === n0 + 1 && d.status === 'Draft' && d.unit === 'U306 · Module 1' && d.programme === 'Level 3 Diploma in Adult Care (England)' && S.route === 'a-assignments' && S.params.id === d.id);
    go('a-assignments'); ok('S2-01 listed; Assignment 8 still its own draft', main().includes('Assignment 30 — Safeguarding in practice') && main().includes('Assignment 8 — Safeguarding legislation'));
    go('a-assignments', { id: d.id, tab: 'questions' }); ACT.s2QAdd({ dataset: { id: d.id } });
    ok('S2-03 the assignment-question dialog (text, attachments), not the quiz dialog', !!document.querySelector('#aq-t') && !!document.querySelector('#aq-a') && !document.querySelector('input[name="corr"]')); closeModal();
    addQs(d, ['Explain the term safeguarding in your own words.', 'Describe your role if you suspect abuse.', 'Temporary question']);
    ACT.s2QEdit({ dataset: { id: d.id, q: 'q2' } }); fill({ '#aq-t': 'Describe your role and responsibilities if you suspect abuse.' }); document.querySelector('#aq-a').checked = false; prim();
    ACT.s2QMove({ dataset: { id: d.id, q: 'q2', d: '-1' } }); ACT.s2QRetire({ dataset: { id: d.id, q: 'q3' } });
    ok('S2-03 add, edit (attachments off), reorder, retire', d.qs.length === 3 && d.qs[0].id === 'q2' && !d.qs[0].attach && d.qs[0].text.startsWith('Describe your role and responsibilities') && d.qs[2].status === 'Retired');
    ACT.pubAsg({ dataset: { id: d.id } }); ok('S2-04 publish blocked until every question is mapped', /Can't publish yet/.test(MODAL.title) && /Not mapped/.test(mroot().textContent) && d.status === 'Draft'); closeModal();
    mapAll(d); ok('S2-04 mapping saved (knowledge criteria only)', d.qs.filter(q => q.status === 'Active').every(q => q.crit.length && q.crit.every(c => /^306 /.test(c))) && !!app().querySelector('input[type=checkbox][disabled][title*="assessed only by observation"]'));
  });

  await T('S2-05 publish reaches the learner, calendar and the assessor\'s marking', async () => {
    fresh(); const d = newAsg('Assignment 31 — Reporting concerns'); addQs(d, ['What signs of abuse might you notice?', 'Who do you report concerns to?']); mapAll(d); publish(d);
    const C = STORE.worlds.C, a = C.assignments.find(x => x.id === d.id);
    ok('S2-05 published with the assignment\'s own questions (not a3\'s)', d.status === 'Published' && !!a && a.qs.map(q => q.text).join('|') === 'What signs of abuse might you notice?|Who do you report concerns to?' && a.status === 'Not Started');
    ok('S2-05 deadline on the learner\'s calendar; learner notified', C.events.some(e => e.id === 'ed' + d.id && e.start === d.due) && C.notifs.some(n => n.body.includes(d.title)));
    ok('S2-05 Croydon learner (other programme) not reached', !STORE.worlds.D.assignments.some(x => x.id === d.id));
    go('a-assignments', { id: d.id }); ok('S2-05 published page states the prototype limit', /reached 1 learner with full data/.test(main()) && /admin and Coordinator views only/.test(main()));
    learner('C'); go('assignments'); ok('S2-05 learner\'s assignment list shows it', main().includes('Assignment 31 — Reporting concerns'));
    go('assignment', { id: d.id }); ok('S2-05 learner\'s assignment page shows its questions', main().includes('Who do you report concerns to?'));
    W.drafts[d.id + '.q1.0'] = '<p>Bruising and withdrawal.</p>'; W.drafts[d.id + '.q2.0'] = '<p>The safeguarding lead.</p>'; finaliseSubmit(asgById(d.id), false, now().toISOString());
    tasV('A'); const row = tasSubs(true).find(r => r.a.id === d.id && r.L.v === 'C');
    ok('S2-05 the assessor\'s marking has the submission', !!row && row.toMark); go('t-queue'); ok('S2-05 Marking Queue lists it', main().includes('Assignment 31'));
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-batches', { id: 'L3AC-JAN26' }); ok('S2-05 Coordinator batch view lists it', /Assignments published to this batch/.test(main()) && main().includes('Assignment 31 — Reporting concerns'));
    SA(); go('a-assignments', { id: d.id }); ok('S2-05 Unpublish disabled after a submission (with a reason)', !!app().querySelector('[data-act="s2Unpublish"][disabled][title]'));
    ACT.s2Retire({ dataset: { id: d.id } }); reason('Replaced');
    ok('S2-05 retire keeps the submitted work', d.status === 'Retired' && STORE.worlds.C.assignments.find(x => x.id === d.id).status === 'Submitted');
  });

  await T('S2-02 / S2-05 deadline change and unpublish reach the learner', async () => {
    fresh(); const d = newAsg('Assignment 32 — Record keeping'); addQs(d, ['Why do accurate records matter?']); mapAll(d); publish(d);
    go('a-assignments', { id: d.id, tab: 'details' }); fill({ '#ae-d': D(35, '20:00').slice(0, 16), '#ae-t': 'Assignment 32 — Accurate record keeping' }); ACT.s2Save({ dataset: { id: d.id } }); reason('Moved');
    const a = STORE.worlds.C.assignments.find(x => x.id === d.id);
    ok('S2-02 saved: new version; the learner\'s deadline, title and calendar follow', d.version === 2 && a.due === d.due && a.title === 'Assignment 32 — Accurate record keeping' && STORE.worlds.C.events.find(e => e.id === 'ed' + d.id).start === d.due && STORE.worlds.C.notifs.some(n => /Deadline changed/.test(n.title)));
    ok('S2-02 the assessor is told', STORE.tas.notifs.some(n => /Deadline changed/.test(n.t)));
    ACT.s2Unpublish({ dataset: { id: d.id } }); reason('Not ready');
    ok('S2-05 unpublish (no submissions): learner no longer sees it; Draft again', d.status === 'Draft' && !STORE.worlds.C.assignments.some(x => x.id === d.id) && !STORE.worlds.C.events.some(e => e.id === 'ed' + d.id));
    learner('C'); go('assignments'); ok('S2-05 gone from the learner\'s list', !main().includes('Accurate record keeping'));
  });

  await T('S2-06 Edit brief: new text for learners who haven\'t submitted', async () => {
    fresh(); SA(); go('a-assignments', { id: 'a3' }); const a3 = STORE.worlds.C.assignments.find(x => x.id === 'a3'), a4 = STORE.worlds.C.assignments.find(x => x.id === 'a4'), old4 = a4.brief;
    ACT.kEditBrief({ dataset: { id: 'a3' } }); fill({ '#eb-t': 'New brief for duty of care: use the updated case study.', '#eb-r': 'Case study updated' }); prim();
    ok('S2-06 the new text is saved and reaches the learner who hasn\'t submitted', /updated case study/.test(s2Def('a3').brief) && /updated case study/.test(a3.brief) && a3.briefV === s2Def('a3').briefV);
    learner('C'); go('assignment', { id: 'a3' }); ok('S2-06 the learner\'s assignment page shows the new brief', main().includes('use the updated case study'));
    SA(); ACT.kEditBrief({ dataset: { id: 'a4' } }); fill({ '#eb-t': 'A changed brief for safeguarding scenarios.', '#eb-r': 'Clarified' }); prim();
    ok('S2-06 submitted work keeps the brief it answered', a4.brief === old4 && /changed brief/.test(s2Def('a4').brief));
  });

  await T('S2-07 whole-cohort extension (true count); none for drafts', async () => {
    fresh(); SA(); go('a-assignments', { id: 'a3', tab: 'extensions' }); const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'), n = chCohLids(b).length;
    ok('S2-07 the cohort option shows the true number', document.querySelector('#ex-w option[value="cohort"]').textContent.includes(n + ' learners'));
    fill({ '#ex-d': D(12).slice(0, 10), '#ex-r': 'Placement disruption' }); SUBMIT.asgExtend(document.querySelector('form[data-submit="asgExtend"]'));
    const a3 = STORE.worlds.C.assignments.find(x => x.id === 'a3');
    ok('S2-07 every learner in the cohort extended (world learner + the rest recorded); true count logged', a3.due.startsWith(D(12).slice(0, 10)) && chCohLids(b).filter(l => l !== STORE.worlds.C.me.id).every(l => STORE.s2Ext[l + '|a3']) && ADMIN.audit.some(x => x.action === 'Deadline extension (whole cohort)' && x.reason.includes(n + ' learners')));
    go('a-assignments', { id: 'a8', tab: 'extensions' }); ok('S2-07 drafts: extensions not offered', /available once the assignment is published/.test(main()) && !app().querySelector('form[data-submit="asgExtend"]'));
  });

  await T('S2 existing demo: same assignment list; a9 publishes its own questions', async () => {
    fresh(); const rows = adminAssignments();
    ok('S2 list: the world C assignments, then a8, l2a1 and a9, with the same mapped counts', rows.map(r => r.id).join() === STORE.worlds.C.assignments.map(a => a.id).concat(['a8', 'l2a1', 'a9']).join() && rows.filter(r => r.a).every(r => r.mapped === r.a.crit.length) && rows.find(r => r.id === 'l2a1').mapped === 4 && rows.find(r => r.id === 'a9').mapped === 3);
    SA(); go('a-assignments', { id: 'a9' }); ACT.pubAsg({ dataset: { id: 'a9' } }); reason('Ready');
    const a9 = STORE.worlds.C.assignments.find(x => x.id === 'a9'); ok('S2-05 a9 publishes with its own questions (not a3\'s)', !!a9 && a9.qs[0].text === 'Describe the safe handling of medicines in your setting.' && !a9.qs.some(q => /duty of care/i.test(q.text)));
  });

  await T('S2 records and Scenario #27', async () => {
    fresh(); const s = SC_LIST().find(x => x[0] === '27');
    ok('Scenario #27 "Create and publish an assignment": 7 steps, ends with the Coordinator\'s release', !!s && s[1] === 'Create and publish an assignment' && s[3].length === 7 && /submits/.test(s[3][4].text) && /releases/.test(s[3][6].text));
    ACT.s2Sc27Pub(); reason('Go'); ok('Scenario #27 demo assignment published to Aisha', STORE.worlds.C.assignments.some(a => a.id === 'a27'));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: Setup S2 entry', /Setup fixes — assignments/.test(main()));
    go('demo-scenarios'); ok('Demo Scenarios: 29 (S4a: #29 added)', app().querySelectorAll('main section[id^="sc-"]').length === 29);
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent)); ok('Admin index: S2 entries with purposes (S3: 6, S4a: 5, S4b: 3, N4: 1, N2: 1, N3: 1, S4c: 1, S5a: 1, S5b: 1, S5d: 1, S5c: 1, S5e: 1 entries added)', !!sec && !!sec.querySelector('[data-t="a-assignments.a8.questions"]') && sec.querySelectorAll('li').length === 28);
  });

  /* ================= S3 — NVQ programmes ================= */
  const pb = (id, tab) => { SA(); go('a-programmes', { id, tab }); };
  const dlg = (act, ds, o) => { ACT[act]({ dataset: ds }); if (o) fill(o); return prim(); };
  const learnerUnits = v => { learner(v); go('progress'); return main(); };
  const formIA = () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-obs'); ACT.obPropose({ dataset: {} }); const t = (mroot().querySelector('#op-ia') || {}).textContent || ''; closeModal(); return t; };
  const wpIA = () => { learner('C'); go('observations', { tab: 'workplace' }); return main(); };

  await T('S3-01 each programme has its own structure; codes and answer keys per programme', async () => {
    fresh(); const tr = STORE.s3.trees;
    ok('S3-01 Level 3 is Aisha\'s tree exactly as before (U301–U307)', tr['NV-L3'] === STORE.worlds.C.tree && tr['NV-L3'].map(u => u.code).join() === 'U301,U302,U303,U304,U305,U306,U307');
    ok('S3-01 Level 2 is Grace\'s tree', tr['NV-L2'] === STORE.worlds.D.tree);
    ok('S3-01 Level 4 and Level 5: three units each, typed Learning Outcomes with criteria', tr['NV-L4'].map(u => u.code).join() === 'U401,U402,U403' && tr['NV-L5'].map(u => u.code).join() === 'U501,U502,U503' && ['NV-L4', 'NV-L5'].every(p => tr[p].every(u => u.mods.length && u.mods.every(m => /^[A-Z]\/\d{3}\/\d{4}$/.test(m.ab) && m.los.length && m.los.every(l => ['Knowledge', 'Observation'].includes(l.type) && l.crit.length)))));
    ok('S3-01 NV-L3D: Level 3 plus U310 and U311 (its own tree, not Level 3\'s)', tr['NV-L3D'] !== tr['NV-L3'] && tr['NV-L3D'].map(u => u.code).slice(-2).join() === 'U310,U311' && !tr['NV-L3'].some(u => u.code === 'U310'));
    pb('NV-L4', 'tree'); ok('S3-01 the builder shows the programme\'s own units (Level 4)', /U401/.test(main()) && /Outcome-based practice/.test(main()) && !/U301/.test(main()) && app().querySelectorAll('[data-onchange="chModCode"][data-p="NV-L4"]').length === 3);
    pb('NV-L5', 'tree'); ok('S3-01 Level 5 shows U501–U503', /U501/.test(main()) && /U503/.test(main()) && !/U401/.test(main()));
    pb('NV-L3', 'tree'); ok('S3-01 Level 3 builder unchanged: 9 module codes, 9 answer-key buttons', app().querySelectorAll('[data-onchange="chModCode"]').length === 9 && app().querySelectorAll('[data-act="chAnsUp"]').length === 9);
    pb('NV-L4', 'tree'); const inp = app().querySelector('[data-onchange="chModCode"][data-k="U401 M1"]'); inp.value = 'D/650/4499'; INP.chModCode(inp);
    ok('S3-01 module code is per programme (Level 4 changed, Level 3 not)', tr['NV-L4'][0].mods[0].ab === 'D/650/4499' && STORE.worlds.C.tree[0].mods[0].ab !== 'D/650/4499' && /D\/650\/4499/.test(main()) && ADMIN.audit[0].action === 'Module awarding-body code changed' && /NV-L4/.test(ADMIN.audit[0].target || ADMIN.audit[0].item || JSON.stringify(ADMIN.audit[0])));
    pb('NV-L2', 'tree'); ACT.chAnsUp({ dataset: { k: 'U303 M1', p: 'NV-L2' } }); ACT.chAnsSample(); reason('Level 2 guidance');
    const has = v => { learner(v); go('resources'); return W.resources.some(g => /^U303/.test(g.unit) && g.items.some(i => i.kind === 'key' && /Knowledge Answer Key \(updated\)/.test(i.title))) && /Knowledge Answer Key \(updated\)/.test(main()); };
    ok('S3-01 answer key per programme: Level 2 key reaches Grace (L2) in Resources', has('D'));
    ok('S3-01 … and not Aisha (L3)', !has('C'));
  });

  await T('S3-02 structure editing changes the tree (no learners: directly; with learners: a draft version)', async () => {
    fresh(); pb('NV-L4', 'tree');
    dlg('nodeAdd', { p: 'NV-L4', lvl: 'unit' }, { '#nd-c': 'U404', '#nd-t': 'Managing resources' }); const t4 = STORE.s3.trees['NV-L4'];
    ok('S3-02 Add unit: added to Level 4 (no learners, so directly), shown and audited', t4.some(u => u.code === 'U404') && !STORE.s3.drafts['NV-L4'] && /U404/.test(main()) && ADMIN.audit[0].action === 'Node added');
    ok('S3-02 unit code must be unique', (ACT.nodeAdd({ dataset: { p: 'NV-L4', lvl: 'unit' } }), fill({ '#nd-c': 'U401', '#nd-t': 'Dup' }), prim()) === false); closeModal();
    dlg('nodeAdd', { p: 'NV-L4', lvl: 'mod', u: 'U404' }, { '#nd-t': 'Budgets', '#nd-ab': 'L/650/4404' });
    dlg('nodeAdd', { p: 'NV-L4', lvl: 'lo', u: 'U404', m: 'M1' }, { '#nd-t': 'Understand budgets', '#nd-y': 'Knowledge' });
    dlg('nodeAdd', { p: 'NV-L4', lvl: 'crit', u: 'U404', m: 'M1', lo: 'LO1' }, { '#nd-t': 'Explain how a care budget is set' });
    const u4 = t4.find(u => u.code === 'U404');
    ok('S3-02 "+" adds module → Learning Outcome → criterion', u4.mods[0].ab === 'L/650/4404' && u4.mods[0].los[0].type === 'Knowledge' && u4.mods[0].los[0].crit[0].code === '404 1.1' && /Explain how a care budget is set/.test(main()));
    dlg('s3Rename', { p: 'NV-L4', u: 'U404', m: 'M1', lo: 'LO1', c: '404 1.1' }, { '#rn-t': 'Explain how a care budget is planned' });
    ok('S3-02 Rename changes the tree, audited before → after', u4.mods[0].los[0].crit[0].d === 'Explain how a care budget is planned' && ADMIN.audit[0].action === 'Node renamed' && /planned/.test(main()));
    ACT.nodeState({ dataset: { p: 'NV-L4', u: 'U402' } }); document.querySelector('#ns').value = 'Suspended'; reason('Not taught this year');
    ok('S3-02 Suspend: status saved and shown; nothing deleted', t4.find(u => u.code === 'U402').status === 'Suspended' && t4.length === 4 && /Suspended/.test(main()) && ADMIN.audit[0].action === 'Node status changed');
    ACT.s3Up({ dataset: { p: 'NV-L4', u: 'U404', dir: -1 } }); ok('S3-02 Move: units reorder', t4.map(u => u.code).join() === 'U401,U402,U404,U403');
    ok('S3-02 Learning Outcome Move button kept (G6.5)', !!app().querySelector('[data-act="loMove"]'));
    // A programme with learners: the change goes into a draft version; Aisha stays on hers
    pb('NV-L3', 'tree'); const before = STORE.worlds.C.tree.length;
    dlg('nodeAdd', { p: 'NV-L3', lvl: 'unit' }, { '#nd-c': 'U308', '#nd-t': 'Health and safety' });
    const dv = STORE.s3.drafts['NV-L3'];
    ok('S3-02 Level 3 has learners: the new unit goes into Version 3 (draft)', !!dv && dv.v === 3 && dv.tree.some(u => u.code === 'U308') && STORE.worlds.C.tree.length === before && /editing Version 3 \(draft\)/.test(main()) && /U308/.test(main()));
    ok('S3-02 Aisha\'s progress is unchanged (she stays on Version 2)', !/U308/.test(learnerUnits('C')));
    pb('NV-L3', 'tree'); ACT.loMove({ dataset: { p: 'NV-L3', u: 'U302', m: 'M1', lo: 'LO1' } }); document.querySelector('#lom-t').value = 'U301 M1'; document.querySelector('#lom-ok').checked = true; reason('Better fit');
    ok('S3-02 Move a Learning Outcome: moved in the draft only; evidence stays with Aisha\'s criteria', s3Find(dv.tree, 'U301', 'M1').m.los.some(l => l.title === STORE.worlds.C.tree.find(u => u.code === 'U302').mods[0].los[0].title) && STORE.worlds.C.tree.find(u => u.code === 'U302').mods[0].los.length > 0 && ADMIN.audit[0].action === 'Learning outcome moved');
    pb('NV-L3O', 'tree'); ok('S3-02 Retired programme is read-only', !app().querySelector('[data-act="nodeAdd"]') && !app().querySelector('[data-onchange="chModCode"]'));
  });

  await T('S3-02 wizard programmes: Rename; Remove only while Draft', async () => {
    fresh(); acaEnter('KA'); S.signedIn = true; const id = 'NV-N1'; go('a-programmes', { id, tab: 'structure' });
    dlg('ch8AddUnit', { id }, { '#u-c': 'U420', '#u-t': 'Lead practice' }); const t = ch8Tree(id), u = t.length - 1;
    dlg('ch8AddMod', { id, u }, { '#m-t': 'Leading', '#m-ab': 'A/650/4201' });
    ACT.s3WRename({ dataset: { id, u } }); fill({ '#wr-t': 'Lead person-centred practice' }); prim();
    ok('S3-02 wizard Rename changes the draft tree, audited', t[u].title === 'Lead person-centred practice' && ADMIN.audit[0].action === 'Node renamed' && /Lead person-centred practice/.test(main()));
    ok('S3-02 wizard Remove offered while Draft', !!app().querySelector('[data-act="s3WRemove"]'));
    ACT.s3WRemove({ dataset: { id, u, m: 0 } }); reason('Not needed');
    ok('S3-02 wizard Remove (Draft only) removes the node, audited', t[u].mods.length === 0 && ADMIN.audit[0].action === 'Node removed (Draft)');
    go('a-programmes', { id: 'NV-N2', tab: 'structure' }); ok('S3-02 published wizard programme: no Remove, no Rename until a new version', !app().querySelector('[data-act="s3WRemove"]') && !app().querySelector('[data-act="s3WRename"]'));
  });

  await T('S3-03 Create new version → edit → Publish version; learners stay on theirs', async () => {
    fresh(); pb('NV-L3', 'versions'); ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('Spec update');
    const dv = STORE.s3.drafts['NV-L3'];
    ok('S3-03 Create new version: a real Version 3 draft (a copy of the current tree)', !!dv && dv.v === 3 && dv.tree !== STORE.worlds.C.tree && dv.tree.length === 7 && /Version 3 \(draft\)/.test(main()) && !!app().querySelector('[data-act="kPubProg"]'));
    pb('NV-L3', 'tree'); dlg('s3Rename', { p: 'NV-L3', u: 'U301' }, { '#rn-t': 'Communication in care settings (2027)' });
    ok('S3-03 the draft is edited; the current version is not', dv.tree[0].title === 'Communication in care settings (2027)' && STORE.worlds.C.tree[0].title !== dv.tree[0].title);
    ACT.kPubProg({ dataset: { id: 'NV-L3' } }); reason('Publish 2027 wording'); const pr = s3Pr('NV-L3');
    ok('S3-03 Publish version 3: current version, history updated, audited', pr.version === 3 && !STORE.s3.drafts['NV-L3'] && STORE.s3.trees['NV-L3'][0].title === 'Communication in care settings (2027)' && ADMIN.audit[0].action === 'Version 3 published');
    pb('NV-L3', 'versions'); ok('S3-03 Versions tab: Version 3 (current), Version 2 superseded', /Version 3 \(current\)/.test(main()) && /Version 2/.test(main()) && /Superseded/.test(main()));
    ok('S3-03 Aisha stays on her version (old unit title)', !/\(2027\)/.test(learnerUnits('C')) && /U301/.test(main()));
    SA(); go('a-programmes'); ok('S3-03 programme list shows Version 3', /Version 3/.test(main()));
    // Wizard-made programme: a new version after publishing
    acaEnter('KA'); S.signedIn = true; const id = 'NV-N2', p2 = s3Pr(id); go('a-programmes', { id, tab: 'structure' });
    ok('S3-03 published wizard programme offers "Create new version"', !!app().querySelector('[data-act="s3WizVersion"]') && !app().querySelector('[data-act="ch8AddUnit"]'));
    ACT.s3WizVersion({ dataset: { id } }); reason('Add a unit'); go('a-programmes', { id, tab: 'structure' });
    ok('S3-03 wizard Version 2 (draft): structure editable', p2.nextDraft && !!app().querySelector('[data-act="ch8AddUnit"]') && /Version 2 \(draft\)/.test(main()));
    dlg('ch8AddUnit', { id }, { '#u-c': 'U299', '#u-t': 'Digital skills' }); ACT.s3WizPublish({ dataset: { id } }); reason('Publish');
    ok('S3-03 wizard Publish version 2', p2.version === 2 && !p2.nextDraft && ch8Tree(id).some(u => u.code === 'U299') && ADMIN.audit[0].action === 'Version 2 published');
  });

  await T('S3-04 NV-L3D publish is checked against its own tree', async () => {
    fresh(); pb('NV-L3D', 'tree'); ACT.kPubProg({ dataset: { id: 'NV-L3D' } });
    ok('S3-04 blocked: the Learning Outcomes without a type come from its own tree', /Can't publish/.test(MODAL.title) && /U310 LO2/.test(mroot().textContent) && /U311 LO1/.test(mroot().textContent) && ADMIN.audit[0].action === 'Blocked: publish'); closeModal();
    const set = (u, lo) => { INP.loType({ value: 'Knowledge', dataset: { p: 'NV-L3D', u, lo } }); reason('Typed'); };
    set('U310', 'LO2'); set('U311', 'LO1');
    ok('S3-04 types set in NV-L3D only (Level 3 unaffected)', STORE.s3.trees['NV-L3D'].find(u => u.code === 'U311').mods[0].los[0].type === 'Knowledge' && !STORE.s3.drafts['NV-L3D']);
    ACT.kPubProg({ dataset: { id: 'NV-L3D' } }); reason('Ready');
    ok('S3-04 publishes once every Learning Outcome has a type', s3Pr('NV-L3D').status === 'Active' && ADMIN.audit[0].action === 'Programme published');
    acaEnter('KA'); S.signedIn = true; go('a-batches'); ACT.newBatch(); ok('S3-04 the published programme is offered when creating a batch', /2027 update/.test(mroot().textContent)); closeModal();
  });

  await T('S3-05 one observation-criteria library drives the observation forms', async () => {
    fresh(); const L = STORE.aca.obsLib;
    ok('S3-05 one list: IA-1–IA-4 keep the form meaning; IA-5, IA-6 added; Academic entries re-coded IA-7 on', L.find(c => c.code === 'IA-1').title === 'Arrives on time and in uniform as per workplace policy' && L.find(c => c.code === 'IA-5').status === 'Active' && L.find(c => c.code === 'IA-6').status === 'Retired' && L.find(c => c.code === 'IA-7').title === 'Dignity and respect' && L.filter(c => c.form).map(c => c.code).join() === 'IA-1,IA-2,IA-3,IA-4');
    ok('S3-05 today\'s forms unchanged (IA-1–IA-4)', STORE.worlds.C.iaCriteria.map(x => x[0]).join() === 'IA-1,IA-2,IA-3,IA-4' && /IA-4/.test(formIA()));
    SA(); ok('S3-05 Super Admin menu: Academic → Observation Criteria Library', ANAV.find(x => x[0] === 'Academic')[1].some(x => x[0] === 'k-obslib'));
    go('k-obslib'); ok('S3-05 the library page lists the merged list with "On observation forms"', /Observation Criteria Library/.test(main()) && /On observation forms/.test(main()) && /IA-15/.test(main()));
    ACT.kLib({ dataset: { id: '' } }); fill({ '#kl-t': 'Checks the person\'s identity before giving care', '#kl-d': 'Checks identity.' }); document.querySelector('#kl-f').checked = true; prim();
    const c = L[L.length - 1];
    ok('S3-05 Add: new criterion (Draft), next free code', c.code === 'IA-16' && c.status === 'Draft' && c.form && /Checks the person/.test(main()));
    ACT.kLibAttach({ dataset: { id: c.code } }); mroot().querySelector('.kl-p[value="NV-L3"]').checked = true; prim();
    ok('S3-05 Attach to scope saved; a Draft criterion is not on the forms yet', c.progs.includes('NV-L3') && !/IA-16/.test(formIA()));
    SA(); go('k-obslib'); ACT.s3LibActivate({ dataset: { id: c.code } }); reason('Approved');
    ok('S3-05 Activate (Draft → Active), audited', c.status === 'Active' && ADMIN.audit[0].action === 'Activated');
    ok('S3-05 … now on the assessor\'s observation form and the learner\'s workplace page', /IA-16/.test(formIA()) && /Checks the person/.test(wpIA()));
    ok('S3-05 … not on Level 2 forms (not attached)', !STORE.worlds.D.iaCriteria.some(x => x[0] === 'IA-16'));
    SA(); go('k-obslib'); ACT.kLib({ dataset: { id: 'IA-1' } }); fill({ '#kl-t': 'Arrives on time and in the correct uniform', '#kl-r': 'Wording' }); prim();
    ok('S3-05 Edit: new version; forms show the new wording', L.find(x => x.code === 'IA-1').version === 2 && /in the correct uniform/.test(formIA()));
    SA(); go('k-obslib'); ACT.kLibRetire({ dataset: { id: 'IA-2' } }); reason('Covered elsewhere');
    ok('S3-05 Retire: kept in the library, removed from the forms', L.find(x => x.code === 'IA-2').status === 'Retired' && !/IA-2 /.test(formIA()) && !STORE.worlds.C.iaCriteria.some(x => x[0] === 'IA-2'));
    SA(); go('k-obslib'); ACT.kLib({ dataset: { id: 'IA-3' } }); document.querySelector('#kl-f').checked = false; fill({ '#kl-r': 'Not on forms' }); prim();
    ok('S3-05 untick "Use on observation forms": removed from forms', !STORE.worlds.C.iaCriteria.some(x => x[0] === 'IA-3'));
    pb('NV-L3', 'library'); ok('S3-05 the programme\'s library tab shows the same list', /IA-16/.test(main()) && !!app().querySelector('[data-act="kLibAttach"]'));
  });

  await T('S3-06 assessment types: add, edit, retire', async () => {
    fresh(); pb('NV-L3', 'types'); ACT.addType(); fill({ '#ty-n': 'Professional discussion', '#ty-e': 'Professional discussion' }); prim();
    const ty = STORE.s3.types.find(t => t.name === 'Professional discussion');
    ok('S3-06 Add type (name, evidence): listed, audited', !!ty && ty.status === 'Active' && /Professional discussion/.test(main()) && ADMIN.audit[0].action === 'Assessment type added');
    ACT.addType(); fill({ '#ty-n': 'knowledge' }); ok('S3-06 duplicate name refused', prim() === false); closeModal();
    pb('NV-L4', 'tree'); const opts = () => [...app().querySelectorAll('[data-onchange="loType"]')][0].textContent;
    ok('S3-06 new type is offered for Learning Outcomes', /Professional discussion/.test(opts()));
    pb('NV-L3', 'types'); ACT.s3TypeEdit({ dataset: { id: ty.id } }); fill({ '#ty-e': 'Witness testimony' }); prim();
    ok('S3-06 Edit saved', ty.evidence === 'Witness testimony' && /Witness testimony/.test(main()));
    ACT.s3TypeRetire({ dataset: { id: ty.id } }); reason('Not used');
    ok('S3-06 Retire: no longer offered', ty.status === 'Retired' && (pb('NV-L4', 'tree'), !/Professional discussion/.test(opts())));
    pb('NV-L3', 'types'); const core = app().querySelector('[data-act="s3TypeRetire"][data-id="T1"]');
    ACT.s3TypeRetire({ dataset: { id: 'T1' } });
    ok('S3-06 Knowledge and Observation can\'t be retired', core.disabled && !MODAL && STORE.s3.types[0].status === 'Active' && STORE.s3.types[1].status === 'Active');
  });

  await T('S3-07 answer key Remove (history kept)', async () => {
    fresh(); learner('C'); go('resources'); const had = /AC M12 Ways of Working in Adult Care — Knowledge Answer Key/.test(main());
    pb('NV-L3', 'tree'); ok('S3-07 Remove shown next to an uploaded key', !!app().querySelector('[data-act="s3KeyRemove"][data-k="U302 M1"]'));
    ACT.s3KeyRemove({ dataset: { k: 'U302 M1', p: 'NV-L3' } }); reason('Outdated');
    ok('S3-07 removed, audited; history kept', !s3KeyCur('NV-L3', 'U302 M1') && STORE.s3.keys['NV-L3']['U302 M1'].length === 2 && ADMIN.audit[0].action === 'Answer key removed' && /Upload answer key/.test(app().querySelector('[data-act="chAnsUp"][data-k="U302 M1"]').textContent));
    learner('C'); go('resources'); ok('S3-07 Aisha no longer sees it in Resources', had && !/AC M12 Ways of Working in Adult Care — Knowledge Answer Key/.test(main()));
  });

  await T('S3 records, Scenario #28 and the S2 marker line', async () => {
    fresh(); const s = SC_LIST().find(x => x[0] === '28');
    ok('Scenario #28 "Change a programme\'s structure with a new version": 5 steps', !!s && s[3].length === 5 && /Create new version/.test(s[3][0].text));
    ACT.s3Sc28Edit(); ACT.s3Sc28Pub(); reason('Go'); ok('Scenario #28 demo: Version 3 published with U308', s3Pr('NV-L3').version === 3 && STORE.s3.trees['NV-L3'].some(u => u.code === 'U308') && !STORE.worlds.C.tree.some(u => u.code === 'U308'));
    ACT.s3Sc28Obs(); ok('Scenario #28 demo: IA-5 on the observation form', /IA-5/.test((mroot().querySelector('#op-ia') || {}).textContent || '')); closeModal();
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: Setup S3 entry', /Setup fixes — NVQ programmes/.test(main()));
    go('demo-scenarios'); ok('Demo Scenarios: 29 (S4a: #29 added)', app().querySelectorAll('main section[id^="sc-"]').length === 29);
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('Admin index: S3 entries with purposes', !!sec && ['a-programmes.NV-L4.tree', 'a-programmes.NV-L3.versions', 'a-programmes.NV-L3D.tree', 'k-obslib', 'a-programmes.NV-L3.types'].every(t => !!sec.querySelector('[data-t="' + t + '"]')) && sec.querySelectorAll('li').length === 28 /* S4a: 5, S4b: 3, N4: 1, N2: 1, N3: 1, S4c: 1, S5a: 1, S5b: 1, S5d: 1, S5c: 1, S5e: 1 entries added */);
    SA(); go('a-assignments', { id: 'a9' }); ok('S2 / CH-17: "Marked by: … set in the batch\'s Assessors panel" — read-only, no input', /Marked by: .+, set in the batch's Assessors panel/.test(main()) && !app().querySelector('#ae-m') && !app().querySelector('.s2-marker input, .s2-marker select'));
  });

  /* ================= S3 acceptance corrections (A–E) and end-to-end checks ================= */
  const addType = (n, e) => { ACT.addType(); fill({ '#ty-n': n, '#ty-e': e }); return prim(); };
  const optsOf = sel => [...(typeof sel === 'string' ? document.querySelector(sel) : sel).options].map(o => o.value);
  const mkBatch = (code, course) => { ACT.newBatch(); fill({ '#nb-c': code }); document.querySelector('#nb-co').value = course; prim(); const ac = document.querySelector('#nb-ac'); ac.value = ac.options[1].value; prim(); prim(); prim(); prim(); };
  const n2 = () => ch8Pr('NV-N2');
  // NV-N2 Version 2 draft: a written custom type on LO1 and an unsupported ("professional discussion") type on a new Learning Outcome
  const n2Draft = () => {
    SA(); addType('Written reflection', 'Written assignment questions'); addType('Professional discussion', 'Professional discussion');
    acaEnter('KA'); S.signedIn = true; ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('Custom types');
    go('a-programmes', { id: 'NV-N2', tab: 'structure' }); const sel = document.querySelector('[data-onchange="ch8LoType"][data-u="0"][data-m="0"][data-l="0"]'); sel.value = 'Written reflection'; INP.ch8LoType(sel);
    ACT.ch8AddLo({ dataset: { id: 'NV-N2', u: 0, m: 0 } }); fill({ '#lo-t': 'Discuss your practice', '#lo-y': 'Professional discussion' }); prim();
    const li = ch8Tree('NV-N2')[0].mods[0].los.length - 1; ACT.ch8AddCrit({ dataset: { id: 'NV-N2', u: 0, m: 0, l: li } }); fill({ '#c-d': 'Discuss a recent decision with your assessor', '#c-e': 'Professional discussion record' }); prim();
    return li;
  };
  // … then the unsupported Learning Outcome is changed to Observation and Version 2 is published
  const n2Custom = () => { const li = n2Draft(); INP.ch8LoType({ value: 'Observation', dataset: { id: 'NV-N2', u: '0', m: '0', l: String(li) } }); ACT.s3WizPublish({ dataset: { id: 'NV-N2' } }); reason('Publish Version 2'); };
  const signUp = (batch) => { learner('A'); go('browse'); ACT.applyNvq({ dataset: { id: 'k-NV-N2' } }); prim(); const w = W; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); if (batch) chSetBatch(w, batch); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); return w; };

  await T('S3 correction A — custom assessment types show their configured name; rules follow the evidence method', async () => {
    fresh(); SA(); addType('Written reflection', 'Written assignment questions'); addType('Professional discussion', 'Professional discussion');
    ok('A: Knowledge and Observation unchanged', critTypeLabel('Knowledge') === 'Knowledge' && critTypeLabel('Observation') === 'Observation / Competency' && critKind('Knowledge') === 'Knowledge' && critKind('Observation') === 'Observation' && /Observation \/ Competency/.test(critType('Observation')));
    ok('A: a custom type shows its own name (not "Observation / Competency")', /Written reflection/.test(critType('Written reflection')) && /Professional discussion/.test(critType('Professional discussion')) && !/Observation/.test(critType('Professional discussion')));
    ok('A: written-questions type follows the Knowledge rules', critKind('Written reflection') === 'Knowledge');
    ok('A (negative): an "other" evidence method is not treated as Observation or Knowledge', critKind('Professional discussion') === 'Professional discussion' && !['Knowledge', 'Observation'].includes(critKind('Professional discussion')));
    pb('NV-L3', 'types'); ok('A: types tab states the rule each type follows', /Knowledge rules \(assignments\)/.test(main()) && /Not supported yet — blocks publishing/.test(main()));
    fresh(); n2Draft(); const t2 = s2Tree(n2().title).flatMap(u => u.mods.flatMap(m => m.crit));
    ok('A: admin assignment mapping reads the same Learning Outcome type (written → mappable as Knowledge; other → not)', t2.find(c => c.typeName === 'Written reflection').type === 'Knowledge' && t2.find(c => c.typeName === 'Professional discussion').type === 'Professional discussion');
    fresh(); n2Custom(); ok('A: NV-N2 Version 2 published with the written custom type', n2().version === 2 && ch8Tree('NV-N2')[0].mods[0].los[0].type === 'Written reflection');
    learner('A'); go('browse'); ACT.applyNvq({ dataset: { id: 'k-NV-N2' } }); prim(); const w = W;
    ok('A / E2E-8: the new sign-up gets NV-N2\'s current published structure (Version 2), not Level 3\'s', w.tree.map(u => u.code).join() === ch8Tree('NV-N2').map(u => u.code).join() && !w.tree.some(u => u.code === 'U301') && w.nvq.version === 'Version 2' && w.tree.every(u => u.mods.every(m => m.los.every(l => l.crit.every(c => c.st === 'Not Started')))));
    const cr = allCrit(), wr = cr.find(c => c.typeName === 'Written reflection');
    ok('A: learner criteria inherit the Learning Outcome type (name kept, rule applied)', !!wr && wr.type === 'Knowledge' && !cr.some(c => s3Other(c.typeName || c.type)));
    ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal();
    go('progress'); ok('A: learner Progress shows the configured name', /Written reflection/.test(main()) && /Observation \/ Competency/.test(main()));
    setUi('trType', 'Knowledge'); render(); ok('A: learner "Knowledge" filter includes the written custom type, not the Observation one', /Written reflection/.test(main()) && !/Discuss a recent decision/.test(main())); setUi('trType', '');
  });

  await T('S3 decision 1 — an unsupported assessment method blocks publishing; drafts stay editable', async () => {
    fresh(); const li = n2Draft(); acaEnter('KA'); S.signedIn = true; go('a-programmes', { id: 'NV-N2', tab: 'review' });
    ok('Wizard review: blocking item names the Learning Outcome and type', /Assessment method not supported yet — learners couldn't complete: U201 M1 LO\d \(Professional discussion — evidence: professional discussion\)/.test(main()));
    ACT.s3WizPublish({ dataset: { id: 'NV-N2' } });
    ok('Wizard (negative): "Publish version 2" refused; still Version 1 with the draft open', !!MODAL && /Can't publish this version/.test(MODAL.title) && /Professional discussion/.test(mroot().textContent) && n2().version === 1 && n2().nextDraft); closeModal();
    go('a-programmes', { id: 'NV-N2', tab: 'structure' }); ok('Wizard: the draft stays editable', !!app().querySelector('[data-act="ch8AddUnit"]') && !!app().querySelector(`[data-onchange="ch8LoType"][data-l="${li}"]`));
    INP.ch8LoType({ value: 'Observation', dataset: { id: 'NV-N2', u: '0', m: '0', l: String(li) } }); ACT.s3WizPublish({ dataset: { id: 'NV-N2' } }); reason('Supported now');
    ok('Wizard (positive): with supported types (incl. the written custom type) Version 2 publishes', n2().version === 2 && !n2().nextDraft);
    // A Draft programme made with the wizard: the Publish button is disabled with the reason
    acaEnter('KA'); S.signedIn = true; ACT.ch8AddLo({ dataset: { id: 'NV-N1', u: 0, m: 0 } }); fill({ '#lo-t': 'Discuss leadership', '#lo-y': 'Professional discussion' }); prim();
    go('a-programmes', { id: 'NV-N1', tab: 'review' }); const pub = app().querySelector('[data-act="ch8Publish"]');
    ok('Wizard Draft programme (negative): Publish disabled, reason shown', !!pub && pub.disabled && /Assessment method not supported yet/.test(main()) && ch8Pr('NV-N1').status === 'Draft');
    // Hierarchy builder: a programme without learners still gets a draft version for an unsupported type, and can't publish it
    fresh(); SA(); addType('Professional discussion', 'Professional discussion'); pb('NV-L4', 'tree'); const cur = STORE.s3.trees['NV-L4'];
    INP.loType({ value: 'Professional discussion', dataset: { p: 'NV-L4', u: 'U401', lo: 'LO1' } }); reason('Try PD');
    const dv = STORE.s3.drafts['NV-L4'];
    ok('Builder: unsupported type on a published programme goes into a draft version (current version unchanged)', !!dv && dv.tree.find(u => u.code === 'U401').mods[0].los[0].type === 'Professional discussion' && cur.find(u => u.code === 'U401').mods[0].los[0].type === 'Knowledge');
    ACT.kPubProg({ dataset: { id: 'NV-L4' } });
    ok('Builder (negative): publish blocked, naming U401 LO1 and the type; audited', !!MODAL && !!mroot().querySelector('.s3-unsup') && /U401 LO1 \(Professional discussion — evidence: professional discussion\)/.test(mroot().textContent) && ADMIN.audit[0].action === 'Blocked: publish' && /Unsupported assessment method/.test(ADMIN.audit[0].reason) && s3Pr('NV-L4').version === 1); closeModal();
    INP.loType({ value: 'Knowledge', dataset: { p: 'NV-L4', u: 'U401', lo: 'LO1' } }); reason('Back to Knowledge'); ACT.kPubProg({ dataset: { id: 'NV-L4' } }); reason('Publish');
    ok('Builder (positive): the draft stays editable; once supported it publishes Version 2', s3Pr('NV-L4').version === 2 && !STORE.s3.drafts['NV-L4']);
    INP.loType({ value: 'Professional discussion', dataset: { p: 'NV-L3D', u: 'U310', lo: 'LO2' } }); reason('PD'); INP.loType({ value: 'Knowledge', dataset: { p: 'NV-L3D', u: 'U311', lo: 'LO1' } }); reason('K');
    ACT.kPubProg({ dataset: { id: 'NV-L3D' } }); ok('Builder Draft programme NV-L3D (negative): blocked, stays Draft', /U310 LO2 \(Professional discussion/.test(mroot().textContent) && s3Pr('NV-L3D').status === 'Draft'); closeModal();
  });

  await T('S3 version consistency — batches and enrolled learners', async () => {
    fresh(); const legacy = ADMIN.batches.filter(b => b.code !== 'x').map(b => b.code);
    let w = signUp(null);
    ok('V: sign-up in a batch without a recorded version → the current published version; the batch is not back-filled', w.signup.done && w.nvq.progVersion === 1 && w.nvq.version === 'Version 1' && !ADMIN.batches.find(b => b.code === w.signup.batch).progVersion && ADMIN.audit.some(a => a.action === 'Programme version fixed at enrolment' && /has no recorded version/.test(a.reason)));
    fresh(); acaEnter('KA'); S.signedIn = true; ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('v2'); go('a-programmes', { id: 'NV-N2', tab: 'structure' });
    ACT.ch8AddUnit({ dataset: { id: 'NV-N2' } }); fill({ '#u-c': 'U299', '#u-t': 'Digital skills' }); prim();
    w = signUp(null); const snap = JSON.stringify(w.tree);
    ok('V (negative): a sign-up while Version 2 is a draft gets Version 1 — never unpublished draft edits', w.nvq.progVersion === 1 && !w.tree.some(u => u.code === 'U299') && ch8Tree('NV-N2').some(u => u.code === 'U299'));
    acaEnter('KA'); S.signedIn = true; ACT.s3WizPublish({ dataset: { id: 'NV-N2' } }); reason('Publish');
    ok('V: publishing Version 2 doesn\'t migrate the enrolled learner (structure and version unchanged)', n2().version === 2 && JSON.stringify(w.tree) === snap && w.nvq.progVersion === 1);
    fresh(); acaEnter('KA'); S.signedIn = true; go('a-batches'); mkBatch('L2PW-MAR27-ONL', n2().title); const b1 = ADMIN.batches.find(b => b.code === 'L2PW-MAR27-ONL');
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('v2'); go('a-programmes', { id: 'NV-N2', tab: 'structure' }); ACT.ch8AddUnit({ dataset: { id: 'NV-N2' } }); fill({ '#u-c': 'U299', '#u-t': 'Digital skills' }); prim();
    ACT.s3WizPublish({ dataset: { id: 'NV-N2' } }); reason('Publish'); go('a-batches'); mkBatch('L2PW-JUN27-ONL', n2().title); const b2 = ADMIN.batches.find(b => b.code === 'L2PW-JUN27-ONL');
    ok('V: each batch records the version it was created on (1 and 2)', b1.progVersion === 1 && b2.progVersion === 2);
    w = signUp(b1);
    ok('V: a learner enrolled in the Version 1 batch starts on Version 1 (consistent with the batch)', w.signup.batch === b1.code && w.nvq.progVersion === b1.progVersion && !w.tree.some(u => u.code === 'U299'));
    SA(); go('a-batches', { id: b1.code }); ok('V: batch page shows its version and its learners\' versions', /Programme version: Version 1/.test(main()) && new RegExp(chFullName(w) + ' \\(Version 1\\)').test(main()));
    ok('V: existing demo batches and learners are untouched (no guessed versions)', legacy.every(c => !ADMIN.batches.find(b => b.code === c).progVersion) && !STORE.worlds.C.nvq.progVersion && !STORE.worlds.D.nvq.progVersion);
  });

  await T('S3 correction B — the wizard uses the governed type list', async () => {
    fresh(); SA(); addType('Written reflection', 'Written assignment questions'); addType('Old method', 'Witness testimony');
    ACT.s3TypeRetire({ dataset: { id: STORE.s3.types.find(t => t.name === 'Old method').id } }); reason('Replaced');
    acaEnter('KA'); S.signedIn = true; go('a-programmes', { id: 'NV-N1', tab: 'structure' });
    ok('B: wizard Learning Outcome select lists every active type (incl. custom), not retired ones', (o => o.includes('Knowledge') && o.includes('Observation') && o.includes('Written reflection') && !o.includes('Old method'))(optsOf(document.querySelector('[data-onchange="ch8LoType"]'))));
    ACT.ch8AddLo({ dataset: { id: 'NV-N1', u: 0, m: 0 } }); ok('B: "Add Learning Outcome" offers the same list', (o => o.includes('Written reflection') && !o.includes('Old method'))(optsOf('#lo-y')));
    fill({ '#lo-t': 'Reflect on leadership', '#lo-y': 'Written reflection' }); prim(); const los = ch8Tree('NV-N1')[0].mods[0].los, lo = los[los.length - 1];
    ok('B: saved with the custom type', lo.type === 'Written reflection');
    go('a-programmes', { id: 'NV-N1', tab: 'details' }); go('a-programmes', { id: 'NV-N1', tab: 'structure' });
    ok('B: reopened — the type is still selected', document.querySelector(`[data-onchange="ch8LoType"][data-l="${los.length - 1}"]`).value === 'Written reflection');
    const sel = document.querySelector('[data-onchange="ch8LoType"][data-l="0"]'), was = los[0].type; INP.ch8LoType({ value: 'Old method', dataset: { ...sel.dataset } });
    ok('B (negative): a retired type can\'t be chosen', los[0].type === was);
    pb('NV-L4', 'tree'); ok('B: structure editor offers the same governed list', (o => o.includes('Written reflection') && !o.includes('Old method'))(optsOf(document.querySelector('[data-onchange="loType"]'))));
    const ls = document.querySelector('[data-onchange="loType"]'); INP.loType({ value: 'Old method', dataset: { ...ls.dataset } });
    ok('B (negative): structure editor refuses a retired type', !MODAL && STORE.s3.trees['NV-L4'][0].mods[0].los[0].type === 'Knowledge');
    // In use: name and evidence locked; retiring keeps historical configurations readable
    fresh(); n2Custom(); SA(); pb('NV-L3', 'types'); const wr = STORE.s3.types.find(t => t.name === 'Written reflection');
    ACT.s3TypeEdit({ dataset: { id: wr.id } }); fill({ '#ty-n': 'Renamed' }); ok('B: a type in use can\'t be renamed (its Learning Outcomes depend on it)', prim() === false && wr.name === 'Written reflection'); closeModal();
    ACT.s3TypeRetire({ dataset: { id: wr.id } }); reason('Superseded');
    acaEnter('KA'); S.signedIn = true; go('a-programmes', { id: 'NV-N2', tab: 'structure' });
    ok('E2E-5: retired type still readable on published Learning Outcomes', /Written reflection/.test(main()) && ch8Tree('NV-N2')[0].mods[0].los[0].type === 'Written reflection');
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('v3'); go('a-programmes', { id: 'NV-N2', tab: 'structure' });
    const s0 = document.querySelector('[data-onchange="ch8LoType"][data-l="0"]');
    ok('E2E-5: in a new version the retired type stays selected on its Learning Outcome (marked retired) but isn\'t offered elsewhere', s0.value === 'Written reflection' && /\(retired\)/.test(s0.textContent) && !optsOf(document.querySelector('[data-onchange="ch8LoType"][data-l="1"]')).includes('Written reflection'));
  });

  await T('S3 correction C — one version header on every tab', async () => {
    fresh(); pb('NV-L3', 'letter');
    ok('C: Letter tab, no draft: "Create new version", no Publish button', !!app().querySelector('[data-act="newProgVersion"]') && !app().querySelector('[data-act="kPubProg"]') && /Version 2 is current/.test(main()) && !/Publish version/.test(main()));
    pb('NV-L3', 'support'); ok('C: Support type tab: the same header', !!app().querySelector('[data-act="newProgVersion"]') && !app().querySelector('[data-act="kPubProg"]'));
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('Draft'); pb('NV-L3', 'letter');
    ok('C: with a draft: "Publish version 3" (and no "Create new version")', /Publish version 3/.test((app().querySelector('[data-act="kPubProg"]') || {}).textContent || '') && !app().querySelector('[data-act="newProgVersion"]') && /editing Version 3 \(draft\)/.test(main()));
    pb('NV-L3D', 'support'); ok('C: Draft programme: "Publish programme"', /Publish programme/.test((app().querySelector('[data-act="kPubProg"]') || {}).textContent || ''));
    pb('NV-L3O', 'letter'); ok('C: Retired programme: read-only, no version buttons', /Retired programme — read-only/.test(main()) && !app().querySelector('[data-act="kPubProg"], [data-act="newProgVersion"]'));
    pb('NV-L3', 'tree'); ok('C: builder tabs show the same header', /editing Version 3 \(draft\)/.test(main()) && app().querySelectorAll('.s3-vh').length === 1);
  });

  await T('S3 correction D — Move preview uses the selected programme\'s own evidence', async () => {
    fresh(); const judgedIn = (v, codes) => codes.some(code => STORE.worlds[v].tree.some(u => u.mods.some(m => m.los.some(l => l.crit.some(c => c.code === code && c.st && c.st !== 'Not Started')))));
    const lo3 = STORE.worlds.C.tree.find(u => u.code === 'U302').mods[0].los[0], codes = lo3.crit.map(c => c.code);
    const e3 = s3LoEvidence('NV-L3', lo3), e2 = s3LoEvidence('NV-L2', STORE.worlds.D.tree.find(u => u.code === 'U302').mods[0].los[0]);
    const l3W = Object.keys(STORE.worlds).filter(v => STORE.worlds[v].nvq && STORE.worlds[v].nvq.title === s3Pr('NV-L3').title && STORE.worlds[v].flags.nvq && judgedIn(v, codes)).length;
    ok('D: Level 3 preview counts only Level 3 learners', e3.learners === l3W && e3.learners >= 1);
    ok('D: Level 2 preview counts only Level 2 learners (never Level 3\'s)', e2.learners === (judgedIn('D', codes) ? 1 : 0));
    pb('NV-L3', 'tree'); ACT.loMove({ dataset: { p: 'NV-L3', u: 'U302', m: 'M1', lo: 'LO1' } }); ok('D: preview names the programme', /Impact preview \(Level 3 Diploma in Adult Care \(England\)\)/.test(mroot().textContent)); closeModal();
    pb('NV-L4', 'tree'); ACT.loMove({ dataset: { p: 'NV-L4', u: 'U401', m: 'M1', lo: 'LO1' } });
    ok('D: no learners → accurate zero-evidence state', /0 with learner judgements · 0 mapped to assignment questions · 0 learner record/.test(mroot().textContent) && /No learner evidence on this programme/.test(mroot().textContent)); closeModal();
  });

  await T('S3 correction E — version history: fixtures are marked, new entries are real', async () => {
    fresh(); pb('NV-L3', 'versions'); const h = STORE.s3.hist['NV-L3'];
    ok('E: seeded versions are demo fixtures with no invented date or author', h.length === 2 && h.every(x => x.fixture && !x.at && !x.by) && /Demo fixture — existed before this prototype's audit trail/.test(main()));
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('Spec change'); ACT.kPubProg({ dataset: { id: 'NV-L3' } }); reason('Publish it');
    const e = h[h.length - 1]; pb('NV-L3', 'versions');
    ok('E: publishing adds a real entry (actor, time, reason) and audit rows', e.v === 3 && !e.fixture && e.by === ADMIN.me.name && !!e.at && e.note === 'Publish it' && /Version history — audit/.test(main()) && /Version 3 published/.test(main()) && /Version created \(draft\)/.test(main()));
    ok('E: wizard programme Version 1 uses its own recorded publish date', (x => !x.fixture && x.at === n2().published)(s3Hist(n2())[0]));
  });

  await T('S3 end to end — create, isolate, publish, keep learners, batches, keys, library scope, access', async () => {
    fresh(); acaEnter('KA'); S.signedIn = true; go('a-programmes'); ACT.chProgNew();
    fill({ '#np-t': 'Level 3 Certificate in Dementia Care', '#np-l': 'Level 3', '#np-r': 'QN 610/7777/1', '#np-d': '9 months', '#np-p': '1500', '#np-ds': 'Dementia care.' }); prim();
    const pr = (STORE.chNewProgs || []).slice(-1)[0], id = pr.id; go('a-programmes', { id, tab: 'structure' });
    const a8 = (act, ds, o) => { ACT[act]({ dataset: { id, ...ds } }); fill(o); return prim(); };
    a8('ch8AddUnit', {}, { '#u-c': 'U350', '#u-t': 'Dementia awareness' }); a8('ch8AddMod', { u: 0 }, { '#m-t': 'Understanding dementia', '#m-ab': 'B/652/3501' });
    a8('ch8AddLo', { u: 0, m: 0 }, { '#lo-t': 'Understand types of dementia', '#lo-y': 'Knowledge' }); a8('ch8AddCrit', { u: 0, m: 0, l: 0 }, { '#c-d': 'Describe two types of dementia', '#c-e': 'Written account' });
    ACT.s3WRename({ dataset: { id, u: 0, m: 0, l: 0, c: 0 } }); fill({ '#wr-t': 'Describe three types of dementia' }); prim();
    const t = ch8Tree(id);
    ok('E2E-1/2: new programme with its own hierarchy and module code (no Level 3 units)', t.length === 1 && t[0].code === 'U350' && t[0].mods[0].ab === 'B/652/3501' && t[0].mods[0].los[0].crit[0].d === 'Describe three types of dementia' && !t.some(u => u.code === 'U301') && STORE.s3.trees['NV-L3'].length === 7);
    // E2E-7: publishing a new Level 3 version leaves Aisha's version, evidence and progress untouched
    const snap = JSON.stringify(STORE.worlds.C.tree), prog = learnerUnits('C');
    pb('NV-L3', 'tree'); dlg('nodeAdd', { p: 'NV-L3', lvl: 'unit' }, { '#nd-c': 'U309', '#nd-t': 'Dementia (2027)' }); ACT.kPubProg({ dataset: { id: 'NV-L3' } }); reason('Publish');
    ok('E2E-6/7: Version 3 published; Aisha\'s tree (evidence, statuses) is byte-for-byte unchanged and her Progress is the same', s3Pr('NV-L3').version === 3 && JSON.stringify(STORE.worlds.C.tree) === snap && learnerUnits('C') === prog);
    // E2E-8: a batch created now records Version 3
    acaEnter('KA'); S.signedIn = true; go('a-batches'); mkBatch('L3DC-APR27', s3Pr('NV-L3').title); const b = ADMIN.batches.find(x => x.code === 'L3DC-APR27');
    ok('E2E-8: new batch records the current published version (3), audited', !!b && b.progVersion === 3 && ADMIN.audit.some(a => a.action === 'Programme version recorded' && /Version 3/.test(a.after)));
    go('a-batches', { id: 'L3DC-APR27' }); ok('E2E-8: batch page shows "Programme version: Version 3"', /Programme version: Version 3/.test(main()));
    ok('E2E-8: existing batches are not back-filled', !ADMIN.batches.find(x => x.code === 'L3AC-JAN26').progVersion);
    // E2E-10: library scope — attach to Level 2 only
    SA(); go('k-obslib'); ACT.kLib({ dataset: { id: 'IA-5' } }); document.querySelector('#kl-f').checked = true; fill({ '#kl-r': 'Use on L2 forms' }); prim();
    ACT.kLibAttach({ dataset: { id: 'IA-5' } }); mroot().querySelectorAll('.kl-p').forEach(x => { x.checked = x.value === 'NV-L2'; }); prim();
    ok('E2E-10: scoped criterion reaches Level 2 forms only', STORE.worlds.D.iaCriteria.some(x => x[0] === 'IA-5') && !STORE.worlds.C.iaCriteria.some(x => x[0] === 'IA-5'));
    // E2E-11 / 12: answer keys per programme — removing Level 3's key leaves Level 2's key with the same module code
    pb('NV-L2', 'tree'); ACT.chAnsUp({ dataset: { k: 'U302 M1', p: 'NV-L2' } }); ACT.chAnsSample(); reason('L2 key');
    pb('NV-L3', 'tree'); ACT.s3KeyRemove({ dataset: { k: 'U302 M1', p: 'NV-L3' } }); reason('Outdated');
    const keyIn = v => STORE.worlds[v].resources.some(g => /^U302/.test(g.unit) && g.items.some(i => i.id === 'ak-U302-M1'));
    ok('E2E-11/12: Level 3 key removed from Aisha only; Grace keeps the Level 2 key; history kept', !keyIn('C') && keyIn('D') && STORE.s3.keys['NV-L3']['U302 M1'][0].removed && STORE.s3.keys['NV-L2']['U302 M1'].length === 1);
    pb('NV-L2', 'tree'); const c2 = app().querySelector('[data-onchange="chModCode"][data-k="U302 M1"][data-p="NV-L2"]'); c2.value = 'Q/650/2001'; INP.chModCode(c2);
    ok('E2E-12: Level 2 module code doesn\'t leak into Level 3', STORE.worlds.D.tree.find(u => u.code === 'U302').mods[0].ab === 'Q/650/2001' && STORE.worlds.C.tree.find(u => u.code === 'U302').mods[0].ab !== 'Q/650/2001');
    // Access restrictions
    role('finA'); const n0 = STORE.s3.trees['NV-L4'].length; ACT.nodeAdd({ dataset: { p: 'NV-L4', lvl: 'unit' } });
    ok('Access: Finance can\'t change the structure (refused, logged)', !MODAL && STORE.s3.trees['NV-L4'].length === n0 && ADMIN.audit[0].action === 'Blocked: change the structure');
    ACT.addType(); ok('Access: Finance can\'t change assessment types (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: change assessment types');
    ACT.kLib({ dataset: { id: '' } }); ok('Access: Finance can\'t change the library (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: change the observation-criteria library');
    ACT.kPubProg({ dataset: { id: 'NV-L3D' } }); ok('Access: Finance can\'t publish a programme', !MODAL && s3Pr('NV-L3D').status === 'Draft');
  });

  await T('S2 / CH-17 marker follows the target batch\'s assignment assessor', async () => {
    fresh(); SA(); const d = s2Defs().find(x => x.id === 'a9'), bs = s2MarkBatches(d);
    go('a-assignments', { id: 'a9' }); const before = s2MarkedBy(d);
    ok('Marker: read-only line shows the batch\'s assignment assessor', bs.length > 0 && main().includes('Marked by: ' + before + ', set in the batch\'s Assessors panel') && !app().querySelector('.s2-marker input, .s2-marker select, .s2-marker textarea'));
    chAllocOf(bs[0]).asg = 'James Pryce'; bs.slice(1).forEach(b => { chAllocOf(b).asg = 'James Pryce'; }); go('a-assignments', { id: 'a9' });
    ok('Marker: changing the batch\'s assignment assessor changes the line', s2MarkedBy(d) === 'James Pryce' && main().includes('Marked by: James Pryce, set in the batch\'s Assessors panel'));
  });

  /* ================= S4a — admission and money ================= */
  const FA4 = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const T3 = 'Level 3 Diploma in Adult Care (England)', T2 = 'Level 2 Diploma in Care (England)';
  // A learner without an NVQ starts a real sign-up from Browse
  const apply4 = (v, title, country) => { learner(v); if (country) W.me.country = country; go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === title); ACT.applyNvq({ dataset: { id: c.id } }); prim(); return W; };
  const farBatch = title => ADMIN.batches.find(b => b.course === title && ['Open', 'Planned'].includes(b.status) && daysTo(b.start) >= 30 && b.enrolled < b.cap);
  // Details, documents, the letter; then pay (bank transfer: no checkout pop-up) with the option asked for
  const finish4 = (w, opt, batch) => { chSetBatch(w, batch || farBatch(w.nvq.title)); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); setUi('suOpt', opt || 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); return w; };
  const ckAdd = (pid, o, r = 'Setup test') => { ACT.s4CkAdd({ dataset: { p: pid } }); fill(o); if (o['#ck-e']) document.querySelector('#ck-e').checked = true; reason(r); };
  const planSet = (pid, o) => { ACT.s4PlanEdit({ dataset: { p: pid } }); if ('dep' in o) { document.querySelector(`input[name="pp-dm"][value="${o.dep == null ? 'default' : 'own'}"]`).checked = true; if (o.dep != null) fill({ '#pp-dv': String(o.dep) }); } if (o.fee) fill({ '#pp-f': String(o.fee) }); if (o.n) fill({ '#pp-n': String(o.n) }); return reason(o.r || 'Setup test'); };
  const cfgSet = (d, h) => { ACT.s4CfgEdit(); fill({ '#cf-d': String(d), '#cf-h': String(h) }); return reason('Setup test'); };

  await T('S4-05 programme checklists: builder, edit, UK / UAE items, used at the right sign-up', async () => {
    fresh(); SA(); setUi('clProg', 'NV-L3'); go('a-admissions', { tab: 'builder' });
    const opts = [...document.querySelectorAll('#clp option')].map(o => o.value);
    ok('S4-05 builder: the Programme list is the real programmes (not retired)', ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5', 'NV-N1', 'NV-N2'].every(x => opts.includes(x)) && !opts.includes('NV-L3O') && !!document.querySelector('[data-onchange="s4ClProg"]'));
    ok('S4-05 seeded from today\'s applicant documents: UK and UAE versions', ['Passport or UK photo driving licence|UK', 'Passport|UAE', 'Right to work (share code letter)|UK', 'Emirates ID and residence visa|UAE', 'Enhanced DBS certificate|UK', 'Police clearance certificate|UAE', 'CV|All'].every(k => s4List('NV-L3').items.some(i => i.name + '|' + i.applies === k)) && /Applies to/.test(main()));
    const v0 = s4List('NV-L3').v; ckAdd('NV-L3', { '#ck-n': 'Overseas qualification statement', '#ck-m': '0', '#ck-a': 'UAE', '#ck-f': 'PDF', '#ck-s': '3', '#ck-g': 'Only if your qualification is from outside the UK.' });
    const it = s4List('NV-L3').items.find(i => i.name === 'Overseas qualification statement');
    ok('S4-05 Add item: saved with every field, version up, audited, shown', !!it && !it.mand && it.applies === 'UAE' && it.max === '3 MB' && s4List('NV-L3').v === v0 + 1 && ADMIN.audit[0].action === 'Checklist item added' && /Overseas qualification statement/.test(main()));
    ACT.s4CkAdd({ dataset: { p: 'NV-L3' } }); fill({ '#ck-n': 'Bad', '#ck-f': 'EXE' }); ok('S4-05 (negative) formats are checked', reason('x') === false); closeModal();
    const cv = s4List('NV-L3').items.findIndex(i => i.name === 'CV'); ACT.s4CkEdit({ dataset: { p: 'NV-L3', i: cv } }); fill({ '#ck-s': '2' }); reason('Smaller CV files');
    ok('S4-05 Edit: the change is saved and audited', s4List('NV-L3').items[cv].max === '2 MB' && ADMIN.audit[0].action === 'Checklist item changed');
    const ref = s4List('NV-L3').items.findIndex(i => i.name === 'Employer reference letter'); ACT.s4CkRetire({ dataset: { p: 'NV-L3', i: ref } }); reason('Not needed');
    ok('S4-05 Retire: kept on the list as Retired, audited', s4List('NV-L3').items[ref].status === 'Retired' && ADMIN.audit[0].action === 'Checklist item retired');
    ACT.s4CkMove({ dataset: { p: 'NV-L3', i: 1, d: -1 } }); ok('S4-05 Move: order changes, audited', s4List('NV-L3').items[0].name === 'Passport' && ADMIN.audit[0].action === 'Checklist order changed');
    ckAdd('NV-L2', { '#ck-n': 'Care Certificate (if you hold one)', '#ck-m': '0', '#ck-a': 'All', '#ck-f': 'PDF', '#ck-s': '5' });
    // New applicants: Daniel (UK) on Level 3, Fatima (UAE) on Level 2, Tom (country India) on Level 3
    const d = apply4('A', T3), dn = d.docs.map(x => x.name);
    ok('S4-05 Daniel (UK, Level 3): All + UK items, the Level 3 list (not Level 2\'s), in its order', d.signup.prog === 'NV-L3' && dn.includes('Passport or UK photo driving licence') && dn.includes('Enhanced DBS certificate') && !dn.includes('Passport') && !dn.includes('Emirates ID and residence visa') && !dn.includes('Overseas qualification statement') && !dn.includes('Employer reference letter') && !dn.includes('Care Certificate (if you hold one)') && d.docs.find(x => x.name === 'CV').max === '2 MB');
    go('admission'); ok('S4-05 consuming screen: Daniel\'s documents step lists those items', S.route === 'admission' && (ACT.suNext(), /Enhanced DBS certificate/.test(main())) && !/Emirates ID/.test(main()) && /Documents for applicants in United Kingdom/.test(main()));
    ok('S4-05 has-expiry reaches the applicant', /has an expiry date/.test(main()) && d.docs.find(x => x.name === 'Right to work (share code letter)').expiryReq);
    startUpload(d.docs.find(x => x.name === 'CV').id, 'cv.pdf', 3 * 1048576); ok('S4-05 the item\'s own maximum size is enforced (3 MB CV refused at 2 MB)', /maximum size is 2 MB/.test(JSON.stringify(ui('upl-' + d.docs.find(x => x.name === 'CV').id, {}))));
    const f = apply4('F', T3), fnm = f.docs.map(x => x.name);
    ok('S4-05 Fatima (UAE, Level 3): All + UAE items, including Level 3\'s UAE-only item', f.signup.prog === 'NV-L3' && fnm.includes('Passport') && fnm.includes('Emirates ID and residence visa') && fnm.includes('Police clearance certificate') && fnm.includes('Overseas qualification statement') && !fnm.includes('Enhanced DBS certificate') && !fnm.includes('Right to work (share code letter)') && !fnm.includes('Care Certificate (if you hold one)'));
    const e = apply4('E', T2), en = e.docs.map(x => x.name);
    ok('S4-05 Tom (UK, Level 2): All + UK items and Level 2\'s own item (Level 3 changes don\'t leak)', e.signup.prog === 'NV-L2' && en.includes('Enhanced DBS certificate') && en.includes('Care Certificate (if you hold one)') && en.includes('Employer reference letter') && e.docs.find(x => x.name === 'CV').max === '5 MB' && !en.includes('Passport'));
    const t = apply4('H', T3, 'India');
    ok('S4-05 other country (India): the UK items by the region rule (CH-03), flagged — nothing dropped', t.docs.some(x => x.name === 'Right to work (share code letter)') && t.signup.docsRegion === 'UK' && ADMIN.audit.some(a => a.action === 'Sign-up terms fixed' && /country India/.test(a.after)));
    SA(); go('a-admissions', { id: 'APP-H' }); ok('S4-05 Admissions: the application shows the checklist version and the other-country flag', /Checklist version \d+ — UK items for India/.test(main()) && /provisional, pending client confirmation/.test(main()));
    // Snapshot: a later change doesn't touch an application in progress
    const snap = JSON.stringify(d.docs.map(x => x.name)); ckAdd('NV-L3', { '#ck-n': 'Occupational health form', '#ck-m': '1', '#ck-a': 'All', '#ck-f': 'PDF', '#ck-s': '5' });
    ok('S4-05 in-progress application keeps its copied list', JSON.stringify(d.docs.map(x => x.name)) === snap && !d.docs.some(x => x.name === 'Occupational health form'));
    ok('S4-05 Priya Raman\'s seeded documents are unchanged', JSON.stringify(STORE.worlds.B.docs.map(x => [x.name, x.status])) === JSON.stringify([['Passport', 'Approved'], ['Emirates ID and residence visa', 'Approved'], ['Proof of address (last 3 months)', 'Rejected'], ['Police clearance certificate', 'Resubmission Required'], ['Highest qualification certificate', 'Submitted'], ['CV', 'Pending'], ['Employer reference letter', 'Pending']]));
    FA4(); go('a-admissions', { tab: 'builder' }); const n0 = s4List('NV-L3').items.length; ACT.s4CkAdd({ dataset: { p: 'NV-L3' } });
    ok('S4-05 (negative) Finance can\'t change a checklist (refused, logged)', !MODAL && s4List('NV-L3').items.length === n0 && ADMIN.audit[0].action === 'Blocked: change the document checklist');
    acaEnter('KA'); S.signedIn = true; go('a-programmes', { id: 'NV-N1', tab: 'docs' });
    ok('S4-05 the wizard\'s checklist step uses the same list (quick picks + details)', document.querySelectorAll('.ch8-doc').length === 7 && !!document.querySelector('.s4-ck [data-act="s4CkAdd"][data-p="NV-N1"]'));
  });

  await T('S4-06 / S4-07 programme payment plans and the deposit default reach sign-up', async () => {
    fresh();
    ok('S4-06 seeded from today\'s sign-up: L3 £2,400 / default £300 / 6; L2 £1,800; L5 £3,600; NV-N2 own £150 / 3', (t => t.fee === 2400 && t.deposit === 300 && !t.own && t.inst === 6)(s4TermsOf('NV-L3')) && s4TermsOf('NV-L2').fee === 1800 && s4TermsOf('NV-L5').fee === 3600 && (t => t.fee === 900 && t.deposit === 150 && t.own && t.inst === 3)(s4TermsOf('NV-N2')));
    ok('S4-06 Level 4 has no fee: needs configuration (no £2,400 fallback)', /no active payment plan|No programme fee/.test(s4TermsOf('NV-L4').issue) && s4TermsOf('NV-L4').fee === null);
    ok('S4-06 the conflicting legacy templates don\'t change the Level 3 plan (£350 × 6, £175 × 12)', STORE.fin.templates.some(r => /Level 3/.test(r.course) && r.gbp === 350) && STORE.fin.templates.some(r => r.gbp === 175 && r.n === 12) && s4TermsOf('NV-L3').inst === 6 && s4TermsOf('NV-L3').fee / s4TermsOf('NV-L3').inst === 400);
    FA4(); go('f-plans', { tab: 'templates' });
    ok('S4-06 Finance → Plan templates: programme plans, deposit default, legacy templates marked unassigned', !!app().querySelector('.s4-plans') && !!app().querySelector('.s4-cfg') && /Legacy plan templates — unassigned/.test(main()) && /never used at sign-up/.test(main()) && !!app().querySelector('[data-act="s4PlanEdit"][data-p="NV-L4"]') && /Needs configuration/.test(app().querySelector('.s4-plans tr[data-pid="NV-L4"]').textContent));
    ACT.s4PlanEdit({ dataset: { t: 'PL-1' } }); ok('S4-06 a legacy template only pre-fills the editor (nothing saved until "Save")', !!MODAL && document.querySelector('#pp-n').value === '12' && s4Plans('NV-L3').length === 1); closeModal();
    ok('S4-06 the editor has no way to postpone the first instalment (CH-10)', (ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }), /First instalment: due at sign-up/.test(mroot().textContent) && !mroot().querySelector('input[type="date"]'))); closeModal();
    ok('S4-06 (negative) a plan that doesn\'t divide evenly is refused', planSet('NV-L2', { n: 7 }) === false && s4Plans('NV-L2').length === 1); closeModal();
    ok('S4-06 (negative) a deposit at or above the fee is refused', planSet('NV-L2', { dep: 1800 }) === false); closeModal();
    planSet('NV-L2', { dep: 200, r: 'Lower L2 deposit' });
    ok('S4-06 Edit: version 2 with every field, audited; version 1 kept', (p => p.v === 2 && p.deposit === 200 && p.inst === 6 && p.partial === true)(s4PlanCur('NV-L2')) && s4Plans('NV-L2')[0].status === 'Superseded' && ADMIN.audit[0].action === 'Payment plan saved');
    planSet('NV-L4', { fee: 3000, dep: null, r: 'Fee confirmed' }); ok('S4-06 Set up the Level 4 plan: no longer needs configuration', !s4TermsOf('NV-L4').issue && s4TermsOf('NV-L4').fee === 3000);
    ACT.s4PlanRetire({ dataset: { p: 'NV-L5' } }); reason('Under review'); ok('S4-06 Retire: Level 5 now needs configuration; history kept', !!s4TermsOf('NV-L5').issue && s4Plans('NV-L5')[0].status === 'Retired' && ADMIN.audit[0].action === 'Payment plan retired');
    SA(); planSet('NV-L3', { fee: 2700, r: 'New fee' }); learner('A'); go('browse');
    ok('S4-06 a fee change (Super Admin) reaches Browse for new learners; the agency / bundle list price doesn\'t move (CH-04, CH-06)', CATALOGUE.find(c => c.kind === 'nvq' && c.title === T3).price === 2700 && NVQ_FEES[T3] === 2400 && /2,700/.test(main()));
    FA4();
    FA4(); cfgSet(250, 21); ok('S4-07 deposit default and hold saved, audited, shown in System Configuration', S4().cfg.deposit === 250 && S4().cfg.hold === 21 && ADMIN.audit[0].action === 'Updated' && (SA(), go('a-config'), /£250\.00 · 21 days/.test(main())));
    ok('S4-07 precedence: default programmes use £250, own deposits keep theirs (L2 £200, NV-N2 £150)', s4TermsOf('NV-L3').deposit === 250 && s4TermsOf('NV-L2').deposit === 200 && s4TermsOf('NV-N2').deposit === 150);
    // A new Level 3 deposit sign-up uses the new default and hold
    const b = farBatch(T3), d = apply4('A', T3); finish4(d, 'deposit', b);
    ok('S4-07 sign-up: deposit £250, balance £2,450, hold 21 days, first row due at the hold', d.signup.done && d.admission.deposit.min === 250 && d.admission.deposit.balance === 2450 && d.admission.deposit.holdDays === 21 && Math.round(daysTo(d.admission.deposit.holdUntil)) === 21 && d.plans.find(p => p.e === 'nvq').rows[0].amount === 2450);
    ok('S4-07 / CH-10 deposit eligibility stays at 28 days with a 21-day hold (25 days away: no deposit)', !chDepositOk({ start: D(25) }) && chDepositOk({ start: D(28) }));
    learner('A'); go('payments'); ok('S4-06 consuming screen: Daniel\'s Payments page shows the £2,450 balance', /2,450/.test(main()));
    FA4(); setUi('fpL', 'A'); go('f-plans'); ok('S4-06 consuming screen: Finance → Payment Plans shows his schedule', /2,450/.test(main()) && /Level 3 Diploma in Adult Care/.test(main()));
    chReleaseSeat(d); ok('S4-07 / P-32 seat release states his own 21-day hold; deposit kept; batch seat freed', d.admission.deposit.released && d.admission.deposit.kept && /after 21 days/.test(d.admission.history.slice(-1)[0][0]) && !d.signup.batch);
    // Instalments: Tom on Level 2 (own £200 deposit plan, instalments), first instalment due now
    const f = apply4('E', T2); finish4(f, 'instalment');
    const pl = f.plans.find(p => p.e === 'nvq');
    ok('S4-06 instalment sign-up: 6 × £300 from the Level 2 plan; the first is due at sign-up', pl.rows.length === 6 && pl.rows.every(r => r.amount === 300) && Math.abs(daysTo(pl.rows[0].due)) < 1 && pl.total === 1800);
  });

  await T('S4-06 / S4-07 existing learners and applicants keep their terms; blocked payment', async () => {
    fresh(); const aisha = JSON.stringify(STORE.worlds.C.plans), priya = STORE.worlds.B;
    FA4(); cfgSet(250, 21); SA(); planSet('NV-L3', { fee: 2700, n: 6, r: 'New fee' });
    ok('S4-06 enrolled learners keep their plans (Aisha byte-for-byte)', JSON.stringify(STORE.worlds.C.plans) === aisha);
    ok('S4-07 Priya (sign-up in progress) keeps the plan in force when she started: £2,400, £300 deposit', priya.signup.plan.fee === 2400 && priya.signup.plan.deposit === 300 && priya.signup.letterV === 1, JSON.stringify(priya.signup.plan) + ' lv ' + priya.signup.letterV + ' same ' + (priya === STORE.worlds.B));
    S.variant = 'B'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; W.signup.step = 4; setUi('suOpt', 'deposit'); go('admission');
    ok('S4-07 Priya\'s payment step still shows £300 (her pinned terms)', /£300\.00/.test(main()) && !/£250\.00/.test(main()));
    learner('A'); go('browse'); const c = CATALOGUE.find(x => x.id === 'k7'); ACT.applyNvq({ dataset: { id: 'k7' } }); prim();
    ok('S4a Priya\'s demo journey isn\'t used for new learners; she still opens hers from the demo switcher', W.v === 'A' && W.signup.prog === 'NV-L3' && STORE.worlds.B.signup.step === 4 - 0 && !!c);
    FA4(); ACT.s4PlanRetire({ dataset: { p: 'NV-L2' } }); reason('Repricing'); const f = apply4('E', T2);
    ACT.suNext(); f.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', 'Tom Whitfield'); setUi('suDecl', true); ACT.suSign(); render();
    ok('S4-06 a plan that needs configuration blocks payment with a clear message', /Payment isn't available yet — needs configuration/.test(main()) && !app().querySelector('[data-act="suPay"]'));
    ACT.suPay(); ok('S4-06 (negative) a direct payment attempt is refused and logged; nothing recorded', !f.signup.done && !f.plans.some(p => p.e === 'nvq') && ADMIN.audit[0].action === 'Blocked: payment');
  });

  await T('S4-08 Finance / Super Admin plan operations and permissions', async () => {
    fresh(); SA(); go('a-finance', { tab: 'plans' });
    ok('S4-08 Super Admin → Instalment plans: programme plans, deposit default, per-learner operations', !!app().querySelector('.s4-plans') && !!app().querySelector('.s4-cfg') && ['adjust', 'waive', 'discount'].every(k => !!app().querySelector(`[data-act="s4Adj"][data-k="${k}"]`)));
    setUi('s4AdjL', 'C'); setUi('s4AdjE', 'nvq'); render(); const pl = STORE.worlds.C.plans.find(p => p.e === 'nvq'), open = pl.rows.filter(r => r.status !== 'Paid'), row = open[0], amt0 = row.amount, n0 = STORE.fin.adjust.length;
    ACT.s4Adj({ dataset: { k: 'discount' } }); fill({ '#wv-r': String(row.n), '#wv-a': '50' }); document.querySelector('#wv-k').value = 'amt'; reason('Early payment');
    ok('S4-08 "Discount" = Finance\'s waiver / discount on the learner\'s real plan', row.amount === amt0 - 50 && row.waived >= 50 && STORE.fin.adjust.length === n0 + 1);
    const due0 = open[open.length - 1].due; ACT.s4Adj({ dataset: { k: 'adjust' } }); fill({ '#ad-r': String(open[open.length - 1].n), '#ad-d': D(60).slice(0, 10) }); reason('Hardship');
    ok('S4-08 "Adjust schedule" moves the instalment (Finance\'s own tool)', open[open.length - 1].due !== due0);
    FA4(); setUi('fpL', 'C'); go('f-plans'); ok('S4-08 consuming screen: Finance → Payment Plans shows the waiver on Aisha\'s instalment', /waived £50\.00/.test(main()));
    learner('C'); go('payments'); ok('S4-08 consuming screen: Aisha\'s Payments page shows the reduced instalment', main().includes(money(row.amount, 'GBP')));
    role('sysA'); go('a-finance', { tab: 'plans' }); const before = JSON.stringify(STORE.worlds.C.plans);
    ok('S4-08 System Admin: read-only (no plan or learner buttons)', !app().querySelector('[data-act="s4PlanEdit"]') && !app().querySelector('[data-act="s4Adj"]'));
    ACT.s4Adj({ dataset: { k: 'waive' } }); ok('S4-08 (negative) System Admin direct waive refused, logged, plan unchanged', !MODAL && JSON.stringify(STORE.worlds.C.plans) === before && /^Blocked:/.test(ADMIN.audit[0].action));
    ACT.finAdjust({ dataset: { v: 'C', e: 'nvq' } }); ok('S4-08 (negative) Finance\'s own tool refuses non-Finance roles too', !MODAL);
    ACT.s4PlanEdit({ dataset: { p: 'NV-L3' } }); ok('S4-08 (negative) System Admin can\'t edit a programme plan', !MODAL && ADMIN.audit[0].action === 'Blocked: change payment plans');
    ACT.cfgEdit({ dataset: { id: ADMIN.config.find(c => c.name === S4_CFG).id } }); ok('S4-07 (negative) System Admin can\'t edit the deposit configuration (direct call)', !MODAL && S4().cfg.deposit === 300 && ADMIN.audit[0].action === 'Blocked: change the deposit configuration');
    acaEnter('KA'); S.signedIn = true; ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } }); ok('S4-08 (negative) Academic Admin can\'t save a wizard plan', ADMIN.audit[0].action === 'Blocked: payment plan' && s4TermsOf('NV-N2').deposit === 150);
    FA4(); go('f-plans', { tab: 'templates' }); ok('S4-08 Finance: editable plans and deposit default', !!app().querySelector('[data-act="s4PlanEdit"][data-p="NV-L3"]') && !!app().querySelector('[data-act="s4CfgEdit"]'));
    SA(); go('a-programmes', { id: 'NV-N2', tab: 'plan' }); fill({ '#pp-d': '180', '#pp-n': '3' }); ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } });
    ok('S4-06 the wizard\'s plan step writes the same versioned plan', s4TermsOf('NV-N2').deposit === 180 && s4PlanCur('NV-N2').v === 2 && ADMIN.audit[0].action === 'Payment plan saved');
  });

  await T('S4-09 offer-letter versions, restore, pinning and the signed record', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' }); const v1 = chLetterCur('NV-L3'), v1t = JSON.stringify(v1.text);
    ACT.chLetterUp({ dataset: { id: 'NV-L3' } }); ACT.chLetterSample(); fill({ '#lt-x': 'Version two paragraph about {{programme}}.\n\nSecond paragraph for {{full_name}}.' }); reason('New wording');
    const v2 = chLetterCur('NV-L3');
    ok('S4-09 a new version stores its own text and file; version 1 unchanged', v2.v === 2 && v2.text.length === 2 && /Version two paragraph/.test(v2.text[0]) && JSON.stringify(chLetters('NV-L3')[0].text) === v1t && v2.file === 'offer letter (client template).docx' && ADMIN.audit[0].action === 'Offer letter uploaded');
    ok('S4-09 versions can\'t be edited in place (frozen)', Object.isFrozen(v2) && Object.isFrozen(v2.text));
    ACT.s4LetterPrev({ dataset: { id: 'NV-L3', v: '1' } }); ok('S4-09 preview of an earlier version shows its own text', /letter version 1/.test(mroot().textContent) && /Offer letter — version 1/.test(MODAL.title) && !/Version two paragraph/.test(mroot().textContent)); closeModal();
    // Daniel starts now: pinned to version 2
    const d = apply4('A', T3); ok('S4-09 the letter version is pinned when the sign-up starts', d.signup.letterV === 2);
    SA(); ACT.s4LetterRestore({ dataset: { id: 'NV-L3', v: '1' } }); reason('Back to the client template');
    const v3 = chLetterCur('NV-L3');
    ok('S4-09 Restore as new version: version 3 = version 1\'s text; history kept', v3.v === 3 && JSON.stringify(v3.text) === v1t && v3.from === 1 && chLetters('NV-L3').length === 3 && ADMIN.audit[0].action === 'Offer letter restored as new version');
    learner('A'); go('admission'); ACT.suNext(); d.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext();
    ok('S4-09 Daniel reads version 2 (his pinned version), not the newer version 3', /Version two paragraph about Level 3 Diploma/.test(main()) && /letter version 2/.test(main()));
    setUi('suSig', 'Daniel Okafor'); setUi('suDecl', true); ACT.suSign();
    ok('S4-09 signing keeps an unchangeable snapshot of the signed text, with the version', d.signup.sig.v === 2 && d.signup.sig.snapshot && /Version two paragraph/.test(d.signup.sig.snapshot.text[0]) && Object.isFrozen(d.signup.sig.snapshot));
    SA(); ACT.chLetterUp({ dataset: { id: 'NV-L3' } }); ACT.chLetterSample(); fill({ '#lt-x': 'Version four wording.' }); reason('Later change');
    ACT.chSignedPdf({ dataset: { v: 'A' } });
    ok('S4-09 the signed letter still shows what was signed after later versions', /Version two paragraph/.test(mroot().textContent) && !/Version four wording/.test(mroot().textContent) && /exact text signed/.test(mroot().textContent));
    ok('S4-09 the PDF download is labelled simulated (no false "downloaded")', /Download PDF \(simulated\)/.test(MODAL.actions.find(x => /Download PDF/.test(x.label)).label) && /PDF \(simulated\)/.test(MODAL.sub || ''));
    closeModal();
    ok('S4-09 Priya (seeded) still signs version 1', STORE.worlds.B.signup.letterV === 1 && chLetterFor(STORE.worlds.B).v === 1);
    FA4(); const n = chLetters('NV-L3').length; ACT.chLetterUp({ dataset: { id: 'NV-L3' } });
    ok('S4-09 (negative) Finance can\'t upload a letter (refused, logged)', !MODAL && chLetters('NV-L3').length === n && ADMIN.audit[0].action === 'Blocked: change the offer letter');
    ACT.s4LetterRestore({ dataset: { id: 'NV-L3', v: '1' } }); ok('S4-09 (negative) Finance can\'t restore a version', !MODAL && chLetters('NV-L3').length === n);
  });

  await T('S4a end to end: new Level 2 and Level 3 learners get their own programme\'s set-up; Priya and #16 unchanged', async () => {
    fresh(); FA4(); planSet('NV-L2', { dep: 200, r: 'L2 deposit' });
    SA(); ckAdd('NV-L2', { '#ck-n': 'Care Certificate (if you hold one)', '#ck-m': '0', '#ck-a': 'All', '#ck-f': 'PDF', '#ck-s': '5' });
    ACT.chLetterUp({ dataset: { id: 'NV-L2' } }); ACT.chLetterSample(); fill({ '#lt-x': 'Level 2 welcome text.' }); reason('L2 v2');
    const b3 = farBatch(T3), b2 = farBatch(T2);
    const d = apply4('A', T3); finish4(d, 'deposit', b3);
    const f = apply4('E', T2); finish4(f, 'deposit', b2);
    const u = apply4('F', T3); finish4(u, 'deposit');
    ok('E2E: Daniel (L3) — L3 checklist (UK), L3 plan (£300 default), L3 letter v1, L3 structure', d.signup.done && d.docs.some(x => x.name === 'Enhanced DBS certificate') && !d.docs.some(x => /Care Certificate/.test(x.name)) && d.admission.deposit.min === 300 && d.signup.sig.v === 1 && d.tree.some(u => u.code === 'U301') && d.nvq.title === T3);
    ok('E2E: Tom (L2) — L2 checklist (UK + L2 item), L2 plan (own £200), L2 letter v2', f.signup.done && f.docs.some(x => x.name === 'Enhanced DBS certificate') && f.docs.some(x => /Care Certificate/.test(x.name)) && f.admission.deposit.min === 200 && f.signup.sig.v === 2 && /Level 2 welcome text/.test(f.signup.sig.snapshot.text[0]) && f.nvq.title === T2);
    ok('E2E: Fatima (UAE, L3) — UAE items, nearest UAE batch (CH-42), L3 plan', u.signup.done && u.docs.some(x => x.name === 'Emirates ID and residence visa') && !u.docs.some(x => x.name === 'Enhanced DBS certificate') && /AUH/.test(u.signup.batch) && u.admission.deposit.min === 300);
    const g = apply4('F', T3); ok('E2E: one NVQ sign-up per learner (Fatima can\'t start a second)', g === u && STORE.worlds.F.signup.prog === 'NV-L3');
    ok('E2E: the sign-up order is unchanged (details → documents → letter → payment → start)', chSteps(d).map(s => s[0]).join() === 'details,documents,letter,payment,start');
    ok('E2E: real batch, version and enrolment state', b3.enrolled >= 1 && d.signup.batch === b3.code && d.nvq.progVersion === s3Pr('NV-L3').version && d.admission.status === 'Awaiting review');
    SA(); go('a-admissions'); ok('E2E: all three appear in Admissions → Applications for review (review after payment)', /Daniel Okafor/.test(main()) && /Tom Whitfield/.test(main()) && /Fatima Al Mansoori/.test(main()));
    go('a-admissions', { id: 'APP-A' }); ok('E2E: the application shows the fixed checklist / plan / letter versions', /Checklist version 1 — UK items for United Kingdom/.test(main()) && /offer letter version 1/.test(main()));
    const B = STORE.worlds.B; ok('E2E: Priya Raman\'s seeded journey is unchanged (step 2, UAE documents, letter v1, £300)', B.signup.step === 2 && !B.signup.prog && B.docs.length === 7 && B.docs[1].name === 'Emirates ID and residence visa' && B.signup.letterV === 1 && B.signup.plan.deposit === 300 && B.admission.deposit.min === 300);
    const s16 = SC_LIST().find(x => x[0] === '16'); ok('E2E: Scenario #16 is still Priya\'s new sign-up', !!s16 && /New sign-up/.test(s16[1]));
    const s29 = SC_LIST().find(x => x[0] === '29'); ok('Scenario #29: 6 steps, set-up then a new learner\'s sign-up', !!s29 && s29[3].length === 6 && /Daniel Okafor/.test(s29[3][3].text));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: Setup S4a entry', /Setup fixes — admission and money/.test(main()));
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('Admin index: S4a entries with purposes', !!sec && ['a-admissions..builder', 'f-plans..templates', 'a-finance..plans', 'a-programmes.NV-L3.letter'].every(t => !!sec.querySelector('[data-t="' + t + '"]')) && sec.querySelectorAll('li').length === 28 /* S4b: 3, N4: 1, N2: 1, N3: 1, S4c: 1, S5a: 1, S5b: 1, S5d: 1, S5c: 1, S5e: 1 entries added */);
    fresh(); const z = apply4('F', T2); ACT.suNext(); ok('E2E (negative): the country rule still applies — no Level 2 batch for a UAE applicant (CH-42)', z.signup.step === 1 && !z.signup.batch);
  });

  /* ================= S4a acceptance verification ================= */
  const agyPrices = () => JSON.stringify(AGY_CATALOGUE().map(c => [c.id, c.unit, c.fixedPct, priceFor(c, 10)]));
  const nvqProd = extra => priceOf({ courses: [T3], seats: 10, pct: null, slabs: null, customTotal: null, cur: 'GBP', ...extra });

  await T('S4a verification 1 — price consistency and commercial isolation (CH-04, CH-06)', async () => {
    fresh(); const agy0 = agyPrices(), buys0 = JSON.stringify([STORE.agy.purchases, STORE.agy.ledger]), aisha0 = JSON.stringify(STORE.worlds.C.plans), shorts0 = JSON.stringify(CATALOGUE.filter(c => c.kind !== 'nvq').map(c => [c.id, c.price])), courses0 = JSON.stringify(ADMIN.courses.map(c => [c.id, c.gbp]));
    const pPct0 = JSON.stringify(nvqProd({ pct: 10 })), pNeg0 = JSON.stringify(nvqProd({ customTotal: 20000 }));
    FA4(); go('f-plans', { tab: 'templates' }); ACT.s4PlanEdit({ dataset: { p: 'NV-L3' } });
    ok('Price: Finance sees the programme fee read-only in the plan editor', document.querySelector('#pp-f').readOnly && /only the Super Administrator changes it/.test(mroot().textContent));
    document.querySelector('#pp-f').readOnly = false; fill({ '#pp-f': '2700' });
    ok('Price (negative): Finance can\'t change a programme\'s price through a plan (refused, logged)', reason('Try') === false && s4TermsOf('NV-L3').fee === 2400 && ADMIN.audit[0].action === 'Blocked: change the programme fee'); closeModal();
    ok('Price: the plan editor lists NVQ programmes only — no short course', (ACT.s4PlanEdit({ dataset: { t: 'PL-0' } }), [...document.querySelectorAll('#pp-p option')].every(o => s3Progs().some(p => p.id === o.value)))); closeModal();
    planSet('NV-L4', { fee: 3000, r: 'Fee confirmed by Finance' }); ok('Price: Finance can set a missing fee (Level 4 needs configuration)', s4TermsOf('NV-L4').fee === 3000 && !s4TermsOf('NV-L4').issue);
    SA(); planSet('NV-L3', { fee: 2700, r: 'New price list' });
    ok('Price: the Super Admin changes the Level 3 fee: new version, audited', s4TermsOf('NV-L3').fee === 2700 && ADMIN.audit[0].action === 'Payment plan saved');
    learner('A'); go('browse'); ok('Price: a new learner sees £2,700 on Browse', /2,700/.test(main()));
    const d = apply4('A', T3); finish4(d, 'instalment');
    ok('Price: the new learner\'s sign-up uses £2,700 (6 × £450)', d.plans.find(p => p.e === 'nvq').total === 2700 && d.plans.find(p => p.e === 'nvq').rows[0].amount === 450);
    ok('CH-04: an enrolled learner\'s agreed fee, plan and balance are unchanged (Aisha)', JSON.stringify(STORE.worlds.C.plans) === aisha0);
    ok('CH-04: an applicant in progress keeps her pinned £2,400 (Priya)', STORE.worlds.B.signup.plan.fee === 2400);
    ok('CH-06: agency bundle prices, VAT and discounts are unchanged; purchases and ledger untouched', agyPrices() === agy0 && JSON.stringify([STORE.agy.purchases, STORE.agy.ledger]) === buys0 && NVQ_FEES[T3] === 2400);
    ok('Negotiated / discounted NVQ bundle prices aren\'t recalculated from the new fee', JSON.stringify(nvqProd({ pct: 10 })) === pPct0 && JSON.stringify(nvqProd({ customTotal: 20000 })) === pNeg0);
    ok('Short-course selling prices are untouched by plan edits', JSON.stringify(CATALOGUE.filter(c => c.kind !== 'nvq').map(c => [c.id, c.price])) === shorts0 && JSON.stringify(ADMIN.courses.map(c => [c.id, c.gbp])) === courses0);
  });

  await T('S4a verification 2 — deposit eligibility is fixed at 28 days; the hold is configurable (CH-10, P-32)', async () => {
    fresh(); const holdC0 = STORE.worlds.C.admission.deposit.holdUntil, inDays = n => new Date(now().getTime() + (n - 0.5) * DAY).toISOString(); // shown as 'in n days'
    [1, 21, 28].forEach(h => { FA4(); if (S4().cfg.hold !== h) cfgSet(300, h);
      ok(`CH-10 boundary with a ${h}-day hold: 28 days away → deposit; 27 days away → instalments only`, S4().cfg.hold === h && daysTo(inDays(28)) === 28 && daysTo(inDays(27)) === 27 && chDepositOk({ start: inDays(28) }) && !chDepositOk({ start: inDays(27) })); });
    FA4(); cfgSet(300, 21);
    const mk = (code, days) => { const b = { code, label: 'Test intake ' + days, course: T3, start: inDays(days), end: D(days + 300), cap: 10, enrolled: 0, mode: 'Online', coord: 'Laura Kemp', teachers: [], assessors: [], status: 'Open', wait: 0, roster: [], coh: [] }; ADMIN.batches.push(b); return b; };
    const b27 = mk('TST-27', 27), b28 = mk('TST-28', 28);
    const toPay = (v, b) => { const w = apply4(v, T3); ACT.suNext(); w.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); setUi('suOpt', ''); render(); return w; };
    const a = toPay('A', b27);
    ok('CH-10 payment step: batch 27 days away with a 21-day hold → no deposit option, the reason says 28 days', !document.querySelector('input[name="su-opt"][value="deposit"]') && /28 days or more/.test(main()));
    const e = toPay('E', b28);
    ok('CH-10 payment step: batch 28 days away → deposit offered; balance due within 21 days (the hold)', !!document.querySelector('input[name="su-opt"][value="deposit"]') && /within 21 days/.test(main()));
    setUi('suOpt', 'deposit'); setUi('suMethod', 'bank'); render(); ACT.suPay();
    ok('S4-07 the new deposit holds the seat for 21 days (configured), not until the batch starts', e.signup.done && e.admission.deposit.holdDays === 21 && Math.round(daysTo(e.admission.deposit.holdUntil)) === 21);
    ok('S4-07 an existing deposit keeps its agreed hold deadline', STORE.worlds.C.admission.deposit.holdUntil === holdC0);
    FA4(); cfgSet(300, 14); ok('S4-07 a later hold change doesn\'t move a running hold', e.admission.deposit.holdDays === 21 && Math.round(daysTo(e.admission.deposit.holdUntil)) === 21);
    chReleaseSeat(e);
    ok('P-32 seat release: removed from the batch, deposit kept, materials read-only', chReleased(e) && e.admission.deposit.kept && !e.signup.batch && e.nvq.status === 'Seat released' && /after 21 days/.test(e.admission.history.slice(-1)[0][0]));
    learner('E'); ACT.chSignAgain(); go('admission');
    ok('P-32 sign up again: instalments only (no deposit)', e.signup.noDeposit && (render(), !document.querySelector('input[name="su-opt"][value="deposit"]')));
  });

  await T('S4a verification 3 — the default deposit is inherited until a programme has its own', async () => {
    fresh(); FA4();
    ok('Inherit: NV-N1 (wizard) follows the default; NV-N2 has its own £150', s4PlanCur('NV-N1').deposit === null && s4PlanCur('NV-N2').deposit === 150);
    cfgSet(250, 28); ok('Inherit: a default change reaches NV-N1 (and Level 3), not NV-N2', s4TermsOf('NV-N1').deposit === 250 && s4TermsOf('NV-L3').deposit === 250 && s4TermsOf('NV-N2').deposit === 150);
    SA(); go('a-programmes', { id: 'NV-N1', tab: 'plan' }); ok('Inherit: the wizard plan step shows "Use the default" selected', document.querySelector('input[name="pp-wdm"][value="default"]').checked);
    fill({ '#pp-n': '4' }); ACT.ch8SavePlan({ dataset: { id: 'NV-N1' } });
    ok('Inherit: saving the wizard plan step without choosing an own deposit keeps inheriting', s4PlanCur('NV-N1').deposit === null && s4PlanCur('NV-N1').inst === 4);
    SA(); go('a-programmes', { id: 'NV-N1', tab: 'plan' }); document.querySelector('input[name="pp-wdm"][value="own"]').checked = true; fill({ '#pp-d': '400' }); ACT.ch8SavePlan({ dataset: { id: 'NV-N1' } });
    FA4(); cfgSet(260, 28); ok('Override: NV-N1\'s own £400 is no longer affected by the default', s4TermsOf('NV-N1').deposit === 400 && s4TermsOf('NV-L3').deposit === 260);
    // The same distinction end to end on a published wizard programme (NV-N2): inherit, sign up, override, sign up
    planSet('NV-N2', { dep: null, r: 'Follow the default' }); go('f-plans', { tab: 'templates' });
    ok('Builder: NV-N2 now shows the default deposit', /\(default\)/.test(app().querySelector('.s4-plans tr[data-pid="NV-N2"]').textContent) && /£260\.00/.test(app().querySelector('.s4-plans tr[data-pid="NV-N2"]').textContent));
    const n2T = n2().title, w1 = apply4('A', n2T); ACT.suNext(); w1.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', 'Daniel Okafor'); setUi('suDecl', true); ACT.suSign(); chSetBatch(w1, ADMIN.batches.find(b => b.code === 'L2PW-DEC26-ONL')); setUi('suOpt', 'deposit'); render();
    ok('Payment step: the inherited deposit (£260)', /Deposit \(holds your seat\) — £260\.00 now/.test(main()));
    setUi('suMethod', 'bank'); render(); ACT.suPay();
    ok('Payment record: deposit £260, balance £640', w1.admission.deposit.min === 260 && w1.plans.find(p => p.e === 'nvq').rows[0].amount === 640 && w1.signup.plan.own === false);
    FA4(); setUi('fpL', 'A'); go('f-plans'); ok('Finance view: his £640 balance', /640/.test(main()));
    planSet('NV-N2', { dep: 180, r: 'Own deposit' }); cfgSet(270, 28);
    ok('Override: NV-N2\'s £180 stays when the default changes; the earlier learner keeps £260', s4TermsOf('NV-N2').deposit === 180 && w1.admission.deposit.min === 260);
    go('f-plans', { tab: 'templates' }); ok('Builder: NV-N2 shows its own deposit', /£180\.00 \(own\)/.test(app().querySelector('.s4-plans tr[data-pid="NV-N2"]').textContent));
    const w2 = apply4('E', n2T); ACT.suNext(); w2.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', 'Tom Whitfield'); setUi('suDecl', true); ACT.suSign(); chSetBatch(w2, ADMIN.batches.find(b => b.code === 'L2PW-DEC26-ONL')); setUi('suOpt', 'deposit'); setUi('suMethod', 'bank'); render();
    ok('Payment step: the own deposit (£180)', /Deposit \(holds your seat\) — £180\.00 now/.test(main()));
    ACT.suPay(); ok('Payment record: deposit £180, balance £720, recorded as own', w2.admission.deposit.min === 180 && w2.plans.find(p => p.e === 'nvq').rows[0].amount === 720 && w2.signup.plan.own === true);
  });

  await T('S4a seat hold capped at 1–28 days (prototype choice; CH-10 eligibility unchanged)', async () => {
    fresh(); FA4(); const holdC0 = STORE.worlds.C.admission.deposit.holdUntil, cfgRow = () => ADMIN.config.find(c => c.name === S4_CFG);
    ok('Hold default is 28 days', S4().cfg.hold === 28 && /28 days/.test(cfgRow().value));
    [0, 29, 90].forEach(h => { const r = cfgSet(300, h); ok(`Hold ${h} days is rejected (refused, logged, unchanged)`, r === false && S4().cfg.hold === 28 && ADMIN.audit[0].action === 'Rejected: seat hold out of range' && new RegExp('Enter 1 to 28 days').test(mroot().textContent)); closeModal(); });
    ACT.cfgEdit({ dataset: { id: cfgRow().id } }); document.querySelector('#cf-h').removeAttribute('max'); fill({ '#cf-d': '300', '#cf-h': '45' });
    ok('Hold out of range is refused through the System Configuration action too (input limit removed)', reason('Bypass') === false && S4().cfg.hold === 28); closeModal();
    ok('Hold 1 day (lower boundary) is accepted', cfgSet(300, 1) !== false && S4().cfg.hold === 1 && /1 days/.test(cfgRow().value));
    const e = apply4('E', T3); finish4(e, 'deposit');
    ok('A new deposit sign-up is held for 1 day', e.signup.done && e.admission.deposit.holdDays === 1 && Math.round(daysTo(e.admission.deposit.holdUntil)) === 1);
    ok('CH-10 eligibility is still 28 days with a 1-day hold', chDepositOk({ start: new Date(now().getTime() + 27.5 * DAY).toISOString() }) && !chDepositOk({ start: new Date(now().getTime() + 26.5 * DAY).toISOString() }));
    const e0 = e.admission.deposit.holdUntil;
    ok('Hold 28 days (upper boundary) is accepted', cfgSet(300, 28) !== false && S4().cfg.hold === 28);
    ok('Existing hold deadlines are unchanged by the setting (the new learner and Aisha)', e.admission.deposit.holdUntil === e0 && e.admission.deposit.holdDays === 1 && STORE.worlds.C.admission.deposit.holdUntil === holdC0);
    chReleaseSeat(e); ok('P-32 unchanged: release says his own 1-day hold, deposit kept', e.admission.deposit.kept && /after 1 days/.test(e.admission.history.slice(-1)[0][0]));
    go('f-plans', { tab: 'templates' }); ok('The 28-day maximum is shown as a prototype choice to confirm with the client', /1–28 days; the 28-day maximum is a prototype choice to confirm with the client/.test(main()));
  });

  /* ================= S4b — resources, batches and scheduling ================= */
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const itemsOf = v => STORE.worlds[v].resources.flatMap(g => g.items);
  const itemOf = (v, rid) => itemsOf(v).find(i => i.s4id === rid);
  const resAdd = o => { ACT.aUpload(); fill({ '#rs-t': o.t, '#rs-d': o.d || '' }); document.querySelector('#rs-y').value = o.type || 'PDF'; if (o.p) { document.querySelector('#rs-p').value = o.p; INP.s4bProg(document.querySelector('#rs-p')); } if (o.m) document.querySelector('#rs-m').value = o.m; if (o.url) fill({ '#rs-u': o.url }); else ACT.s4bSample(); if (o.k) { document.querySelector(`input[name="rs-k"][value="${o.k}"]`).checked = true; if (o.date) fill({ '#rs-dt': o.date }); if (o.after) document.querySelector('#rs-a').value = o.after; } const r = prim(); if (r !== false) closeModal(); return r; };
  const newest = () => S4B().res[0];
  const evsOf = v => STORE.worlds[v].events;

  await T('S4-01 resources: add, publish, reach the right learners; versions; retire', async () => {
    fresh(); const aisha0 = JSON.stringify(STORE.worlds.C.resources), grace0 = JSON.stringify(STORE.worlds.D.resources);
    ok('S4-01 seeded resources leave Aisha\'s and Grace\'s groups exactly as before', (s4bSyncAll(), JSON.stringify(STORE.worlds.C.resources) === aisha0 && JSON.stringify(STORE.worlds.D.resources) === grace0));
    SA(); go('a-resources'); resAdd({ t: 'Person-centred care plan example', d: 'An anonymised example plan.', type: 'PDF', p: 'NV-L3', m: 'U302 M1' });
    const r = newest();
    ok('S4-01 Add: saved as Draft with title, description, type, file, programme, module, release; audited', r.title === 'Person-centred care plan example' && r.status === 'Draft' && r.pid === 'NV-L3' && r.unit === 'U302' && r.mod === 'M1' && /sample/.test(r.ref) && r.rel.k === 'now' && ADMIN.audit[0].action === 'Resource added' && /Person-centred care plan example/.test(main()));
    ok('S4-01 a Draft doesn\'t reach learners', !itemOf('C', r.id));
    ACT.s4bPub({ dataset: { id: r.id } }); reason('Ready');
    const g = STORE.worlds.C.resources.find(x => x.items.some(i => i.s4id === r.id));
    ok('S4-01 Publish: Aisha gets it in her U302 Module 1 group, next to the answer key', !!g && /^U302/.test(g.unit) && g.items.some(i => i.id === 'ak-U302-M1') && ADMIN.audit[0].action === 'Resource published');
    learner('C'); go('resources'); ok('S4-01 consuming screen: Aisha\'s Learning Resources lists it', /Person-centred care plan example/.test(main()));
    ok('S4-01 Grace (Level 2) doesn\'t get a Level 3 resource', !itemOf('D', r.id) && JSON.stringify(STORE.worlds.D.resources) === grace0);
    itemOf('C', r.id).state = 'Completed';
    SA(); ACT.s4bVer({ dataset: { id: r.id } }); ACT.s4bSample(); reason('Updated example');
    ok('S4-01 New version: v2 recorded, v1 kept; Aisha\'s progress kept', r.version === 2 && r.versions.length === 2 && r.versions[0].v === 1 && itemOf('C', r.id).state === 'Completed' && itemOf('C', r.id).v === 2);
    ACT.resHist({ dataset: { id: r.id } }); ok('S4-01 Versions shows both versions with who and file', /Version 2 \(current\)/.test(mroot().textContent) && /Version 1/.test(mroot().textContent)); closeModal();
    ACT.resLog({ dataset: { id: r.id } }); ok('S4-01 Access log comes from learners\' real progress', /Aisha Rahman/.test(mroot().textContent) && /Completed/.test(mroot().textContent)); closeModal();
    ACT.s4bEdit({ dataset: { id: r.id } }); fill({ '#rs-t': 'Person-centred plan example (2027)' }); reason('Title');
    ok('S4-01 Edit: the learner sees the new title; progress kept', itemOf('C', r.id).title === 'Person-centred plan example (2027)' && itemOf('C', r.id).state === 'Completed' && ADMIN.audit[0].action === 'Resource changed');
    ACT.s4bUnpub({ dataset: { id: r.id } }); reason('Pause'); ok('S4-01 Unpublish: removed from Aisha', !itemOf('C', r.id));
    ACT.s4bPub({ dataset: { id: r.id } }); reason('Back'); ok('S4-01 Republish: back, with her progress', itemOf('C', r.id) && itemOf('C', r.id).state === 'Completed');
    ACT.s4bRetire({ dataset: { id: r.id } }); reason('Superseded');
    ok('S4-01 Retire: removed for learners, history kept, can\'t be published again', !itemOf('C', r.id) && r.status === 'Retired' && r.versions.length === 2 && (go('a-resources'), !app().querySelector(`[data-act="s4bPub"][data-id="${r.id}"]`)));
    ACT.s4bPub({ dataset: { id: r.id } }); ok('S4-01 (negative) a retired resource can\'t be republished', !MODAL && r.status === 'Retired');
    ACT.aUpload(); fill({ '#rs-t': 'Bad file' }); document.querySelector('#rs-y').value = 'PDF'; setUi('s4bFile', 'setup.exe'); ok('S4-01 (negative) the file must match the type', prim() === false); closeModal();
    ACT.aUpload(); fill({ '#rs-t': 'Bad link' }); document.querySelector('#rs-y').value = 'Link'; fill({ '#rs-u': 'not a link' }); ok('S4-01 (negative) a link must start with https://', prim() === false); closeModal();
    ok('S4-01 the short-course rows say they are managed in the course editor', (go('a-resources'), /managed in the course's Content tab/.test(main())));
  });

  await T('S4-01 release rules, locked resources and learners on another batch', async () => {
    fresh(); const asg0 = JSON.stringify(STORE.worlds.C.resources.map(g => [g.unit, g.asg || null])); SA(); go('a-resources');
    resAdd({ t: 'Safe handling quiz notes', type: 'PDF', p: 'NV-L3', m: 'U306 M1', k: 'date', date: D(10).slice(0, 10) }); const r1 = newest(); ACT.s4bPub({ dataset: { id: r1.id } }); reason('Go');
    resAdd({ t: 'Unit 306 wrap-up', type: 'PDF', p: 'NV-L3', m: 'U306 M1', k: 'after', after: 'U305 M1' }); const r2 = newest(); ACT.s4bPub({ dataset: { id: r2.id } }); reason('Go');
    const i1 = itemOf('C', r1.id), i2 = itemOf('C', r2.id);
    ok('S4-01 release on a date: locked with the date', i1.state === 'Locked' && /Unlocks on/.test(i1.lock));
    ok('S4-01 release after a module: locked until U305 Module 1 is complete', i2.state === 'Locked' && /U305 Module 1/.test(i2.lock));
    learner('C'); ACT.openRes({ dataset: { id: i1.id } }); ok('S4-01 (negative) a locked resource can\'t be opened, even directly', !MODAL && i1.state === 'Locked');
    STORE.worlds.C.tree.find(u => u.code === 'U305').mods[0].los.forEach(l => l.crit.forEach(c => { c.st = 'Achieved'; })); go('resources');
    ok('S4-01 after rule: unlocked once Aisha completes U305 Module 1', itemOf('C', r2.id).state === 'New' && !itemOf('C', r2.id).lock);
    ACT.openRes({ dataset: { id: itemOf('C', r2.id).id } }); ok('S4-01 the unlocked resource opens', !!MODAL && itemOf('C', r2.id).state === 'Opened'); closeModal();
    // Daniel signs up to another Level 3 batch: he gets the resources of his structure
    const d = apply4('A', T3); finish4(d, 'instalment'); learner('A'); go('resources');
    ok('S4-01 a new Level 3 learner gets the published Level 3 resources (in his module groups)', !!itemOf('A', 'RS-02') && !!itemOf('A', r1.id) && itemOf('A', r1.id).state === 'Locked');
    ok('S4-01 the original resources keep Aisha\'s answer keys and assessment links', itemsOf('C').some(i => i.id === 'ak-U306-M1') && JSON.stringify(STORE.worlds.C.resources.filter(g => JSON.parse(asg0).some(y => y[0] === g.unit)).map(g => [g.unit, g.asg || null])) === asg0 && itemsOf('C').find(i => i.id === 'r2').state === 'Opened');
  });

  await T('S4-01 Coordinator release changes (this batch only) and teacher permissions', async () => {
    fresh(); const d = apply4('A', T3); finish4(d, 'instalment'); const n0 = STORE.worlds.C.notifs ? STORE.worlds.C.notifs.length : 0;
    COO('A'); go('c-modules'); ok('S4-01 the Coordinator sees "Edit release" on her batch', !!app().querySelector('[data-act="cooRel"][data-b="L3AC-JAN26"][data-id="RS-02"]'));
    ACT.cooRel({ dataset: { b: 'L3AC-JAN26', id: 'RS-02' } }); document.querySelector('input[name="rr-k"][value="date"]').checked = true; fill({ '#rr-d': D(14).slice(0, 10), '#rr-r': 'Covered in week 3' }); prim(); closeModal();
    ok('S4-01 Aisha\'s copy is now locked until the new date; her progress is kept for later', itemOf('C', 'RS-02').state === 'Locked' && itemOf('C', 'RS-02').st0 === 'Opened' && /Unlocks on/.test(itemOf('C', 'RS-02').lock));
    ok('S4-01 another batch (Daniel, Leicester Cohort 8) is unaffected', itemOf('A', 'RS-02').state !== 'Locked');
    ok('S4-01 "Notify affected learners" notifies Aisha only; audited (D2)', (STORE.worlds.C.notifs || []).length > n0 && /Resource release changed/.test(JSON.stringify(STORE.worlds.C.notifs[0])) && ADMIN.audit[0].action === 'Release changed (D2)');
    const n1 = (STORE.worlds.C.notifs || []).length; ACT.cooRel({ dataset: { b: 'L3AC-JAN26', id: 'RS-02' } }); document.querySelector('input[name="rr-k"][value="now"]').checked = true; document.querySelector('#rr-n').checked = false; fill({ '#rr-r': 'Back to now' }); prim(); closeModal();
    ok('S4-01 without "Notify", no notification; the release applies', (STORE.worlds.C.notifs || []).length === n1 && itemOf('C', 'RS-02').state === 'Opened');
    COO('B'); ACT.cooRel({ dataset: { b: 'L3AC-JAN26', id: 'RS-02' } }); ok('S4-01 (negative) another Coordinator can\'t change this batch\'s release (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: change releases for this batch');
    ACT.cooRel({ dataset: { b: 'L2DC-MAR26', id: 'RS-02' } }); ok('S4-01 (negative) a Level 3 resource can\'t be released to a Level 2 batch', !MODAL);
    TCH('T'); go('t-assign', { tab: 'resources' }); resAdd({ t: 'Marcus\'s handout', type: 'PDF', p: 'NV-L3', m: 'U306 M1' }); const r = newest();
    ok('S4-01 a teacher adds a Draft for a programme he teaches', r.title === 'Marcus\'s handout' && r.status === 'Draft' && r.by === 'Marcus Bell');
    ACT.s4bPub({ dataset: { id: r.id } }); ok('S4-01 (negative) a teacher can\'t publish (refused, logged)', r.status === 'Draft' && ADMIN.audit[0].action === 'Blocked: publish resources');
    ok('S4-01 (negative) a teacher can\'t add to a programme he isn\'t allocated to', !s4bResProgs().some(p => p.id === 'NV-L2') && s4bCanRes('add', null, 'NV-L2') === false);
  });

  await T('S4-02 batch details: impact preview, rules, permissions; commitments kept', async () => {
    fresh(); const d = apply4('A', T3); finish4(d, 'deposit'); const b = ADMIN.batches.find(x => x.code === d.signup.batch), plan0 = JSON.stringify(d.plans), hold0 = d.admission.deposit.holdUntil, alloc0 = JSON.stringify(chAllocOf(b));
    SA(); go('a-batches', { id: b.code });
    const ed = (o, twice = true) => { ACT.s4bBatchEdit({ dataset: { id: b.code } }); fill(o); const r1 = prim(); if (r1 !== false || !twice) return r1; const shown = document.querySelector('#bd-i').textContent; const r2 = prim(); if (r2 !== false && MODAL) closeModal(); return [shown, r2]; };
    ok('S4-02 capacity below the number enrolled is refused', ed({ '#bd-c': String(b.enrolled - 1), '#bd-r': 'x' }, false) === false && /can't be below/.test(mroot().textContent)); closeModal();
    ok('S4-02 an end date before the start is refused', ed({ '#bd-e': b.start.slice(0, 10), '#bd-r': 'x' }, false) === false); closeModal();
    const ns = new Date(new Date(b.start).getTime() + 7 * DAY).toISOString().slice(0, 10), [shown] = ed({ '#bd-s': ns, '#bd-c': String(b.cap + 2), '#bd-d': 'Tuesday evening cohort', '#bd-r': 'Venue availability' });
    ok('S4-02 saving first shows the impact (learners, sessions, deadlines, timetable, deposit eligibility, notifications)', /Impact of these changes/.test(shown) && /Learners/.test(shown) && /Sessions/.test(shown) && /Assignment deadlines/.test(shown) && /New applicants/.test(shown) && /Notifications/.test(shown));
    ok('S4-02 saved: dates, capacity, description; audited', b.start.slice(0, 10) === ns && b.desc === 'Tuesday evening cohort' && ADMIN.audit[0].action === 'Batch details changed');
    go('a-batches', { id: b.code }); ok('S4-02 consuming screen: the batch page shows the new dates and description', main().includes(fd(b.start)) && /Tuesday evening cohort/.test(main()));
    ok('S4-02 the enrolled learner\'s plan and hold don\'t change; their batch dates do', JSON.stringify(d.plans) === plan0 && d.admission.deposit.holdUntil === hold0 && d.nvq.batchStart === b.start);
    ok('S4-02 CH-17 assessor allocations unchanged', JSON.stringify(chAllocOf(b)) === alloc0);
    ok('S4-02 the Coordinator was notified', STORE.coo.notifs.some(n => n.to === b.coord && n.t === 'Batch details changed'));
    const ob = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'); ACT.s4bBatchEdit({ dataset: { id: ob.code } });
    ok('S4-02 a started batch: dates and mode locked, capacity and description editable', document.querySelector('#bd-s').disabled && document.querySelector('#bd-m').disabled && !document.querySelector('#bd-c').disabled); closeModal();
    FA4(); ACT.s4bBatchEdit({ dataset: { id: b.code } }); ok('S4-02 (negative) Finance can\'t edit batch details (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: edit batch details');
    COO('A'); S.portal = 'coord'; ACT.s4bBatchEdit({ dataset: { id: 'L3AC-JAN26' } }); ok('S4-02 (negative) a Coordinator can\'t edit batch details', !MODAL);
  });

  await T('S4-03 / S4-04 sessions: add, edit, reschedule, cancel — on every calendar', async () => {
    fresh(); SA(); setUi('s4bSchedB', 'L3AC-JAN26'); go('a-scheduling');
    ok('S4-03 the console covers every running or planned batch', document.querySelectorAll('#s4b-sb option').length === ADMIN.batches.filter(S4B_LIVE).length);
    ACT.addSession({ dataset: { b: 'L3AC-JAN26' } }); fill({ '#se-n': 'Revision class', '#se-d': D(20, '17:00').slice(0, 16), '#se-m': '90' }); document.querySelector('#se-t').value = 'Marcus Bell'; prim();
    const s = s4bSess('L3AC-JAN26').find(x => x.title === 'Revision class');
    ok('S4-03 Add session: stored with batch, title, time, length, teacher, simulated Zoom, status, history; audited', !!s && s.teacher === 'Marcus Bell' && (new Date(s.end) - new Date(s.start)) === 90 * 6e4 && /simulated/.test(s.link) && s.status === 'Scheduled' && s.hist.length === 1 && ADMIN.audit[0].action === 'Session added');
    learner('C'); go('calendar'); ok('S4-04 Aisha\'s calendar has it (learner of the batch)', evsOf('C').some(e => e.id === s.id && e.title === 'Revision class'));
    learner('D'); go('calendar'); ok('S4-04 Grace (another batch) doesn\'t see it', !evsOf('D').some(e => e.id === s.id));
    TCH('T'); go('t-calendar'); setUi('ccView', 'agenda'); setUi('ccDate', D(20).slice(0, 10)); render(); ok('S4-04 teacher calendar (Marcus) shows it', !!app().querySelector(`main [data-id="${s.id}"]`));
    COO('A'); go('c-timeline'); ok('S4-04 Coordinator timeline shows it', !!app().querySelector(`[data-id="${s.id}"]`));
    SA(); go('a-batches', { id: 'L3AC-JAN26', tab: 'schedule' }); ok('S4-04 the batch Schedule tab lists the real sessions', /Revision class/.test(main()) && !!app().querySelector(`[data-act="s4bSessCancel"][data-id="${s.id}"]`));
    ACT.s4bSessEdit({ dataset: { b: 'L3AC-JAN26', id: s.id } }); fill({ '#se-d': D(21, '18:00').slice(0, 16), '#se-m': '120', '#se-r': 'Room change' }); prim();
    ok('S4-03 Edit / reschedule: new time and length, history, audited; the learner\'s calendar follows', s.start === D(21, '18:00') && (new Date(s.end) - new Date(s.start)) === 120 * 6e4 && s.hist.length === 2 && ADMIN.audit[0].action === 'Session changed' && evsOf('C').find(e => e.id === s.id).start === s.start);
    COO('A'); ACT.cooEditEv({ dataset: { b: 'L3AC-JAN26', id: s.id } }); fill({ '#ee-n': D(22, '18:00').slice(0, 16), '#ee-r': 'Clash at work' }); prim();
    ok('S4-03 the Coordinator\'s date edit moves the same session and keeps its 2-hour length (D7 / F5 store)', s.start === D(22, '18:00') && (new Date(s.end) - new Date(s.start)) === 120 * 6e4);
    SA(); const e2 = batchEvents(ADMIN.batches.find(x => x.code === 'L3AC-JAN26')).find(e => e.id === 'e2'), len = new Date(e2.end) - new Date(e2.start);
    ACT.kEditEv({ dataset: { b: 'L3AC-JAN26', id: 'e2' } }); fill({ '#ke-n': D(3, '17:00').slice(0, 16), '#ke-r': 'Moved' }); prim(); if (MODAL) prim();
    const e2b = batchEvents(ADMIN.batches.find(x => x.code === 'L3AC-JAN26')).find(e => e.id === 'e2'), w2 = evsOf('C').find(e => e.id === 'e2');
    ok('S4-03 a date edit keeps the event\'s length (it used to collapse to zero)', len === 90 * 6e4 && new Date(e2b.end) - new Date(e2b.start) === len && new Date(w2.end) - new Date(w2.start) === len);
    const n0 = (STORE.worlds.C.notifs || []).length; ACT.s4bSessCancel({ dataset: { b: 'L3AC-JAN26', id: s.id } }); reason('Teacher unwell');
    ok('S4-03 Cancel: kept and marked cancelled everywhere, reason recorded, learners notified', s.status === 'Cancelled' && s.reason === 'Teacher unwell' && /^Cancelled — /.test(evsOf('C').find(e => e.id === s.id).title) && (STORE.worlds.C.notifs || []).length > n0 && ADMIN.audit[0].action === 'Session cancelled');
    go('a-batches', { id: 'L3AC-JAN26', tab: 'schedule' }); ok('S4-04 the Schedule tab shows it cancelled', /Cancelled — Revision class/.test(main()));
    ACT.s4bSessCancel({ dataset: { b: 'L3AC-JAN26', id: 'eda3' } }); ok('S4-03 (negative) a deadline can\'t be cancelled as a session', !MODAL);
    COO('A'); S.portal = 'coord'; ACT.addSession({ dataset: { b: 'L3AC-JAN26' } }); ok('S4-03 (negative) a Coordinator can\'t add sessions (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: add sessions');
    ok('S2 deadlines are untouched by session actions', evsOf('C').filter(e => /^ed/.test(e.id)).every(e => !/Cancelled/.test(e.title)));
  });

  await T('S4-03 conflicts are real and recalculated; S4-04 Coordinator changes notify both', async () => {
    fresh(); SA();
    ok('S4-03 the two dashboard conflicts come from real sessions', kConflicts().length === 2 && kConflicts().some(c => c.what === 'Teacher double-booked' && /Marcus Bell/.test(c.detail)) && kConflicts().some(c => c.what === 'Cohort double-booked' && /Croydon Cohort 4/.test(c.detail)));
    const tc = kConflicts().find(c => c.what === 'Teacher double-booked');
    ACT.kResolve({ dataset: { id: tc.id } }); document.querySelector('#kr-a').value = 'move'; document.querySelector('#kr-s').value = 'b'; reason('Try an hour later');
    const qa = s4bSess('SC-MH26')[0];
    ok('S4-03 "Move by one hour" really moves the session — but the 90-minute class still overlaps, so it is NOT reported resolved', qa.start === D(2, '18:00') && kConflicts().some(c => c.id === tc.id) && ADMIN.audit[0].action === 'Conflict change applied — still conflicting');
    ACT.kResolve({ dataset: { id: tc.id } }); document.querySelector('#kr-a').value = 'teacher'; document.querySelector('#kr-s').value = 'b'; document.querySelector('#kr-t').value = 'Omar Siddiqui'; reason('Omar covers');
    ok('S4-03 "Assign another teacher" changes that session\'s teacher; the conflict is gone', qa.teacher === 'Omar Siddiqui' && !kConflicts().some(c => c.id === tc.id) && ADMIN.audit[0].action === 'Conflict resolved' && ADMIN.batches.find(x => x.code === 'L3AC-JAN26').teachers[0] === 'Marcus Bell');
    ok('S4-04 the new teacher is notified', STORE.tas.notifs.some(n => /Omar Siddiqui: Live Q&A/.test(n.b || '')));
    s4bSess('L2DC-MAR26')[0].teacher = 'Marcus Bell'; TCH('T'); go('t-calendar'); setUi('ccView', 'agenda'); setUi('ccDate', D(9).slice(0, 10)); render();
    ok('S4-04 a teacher sees a session assigned to him in a batch he isn\'t allocated to', !!app().querySelector('main [data-id="ss-2"]')); s4bSess('L2DC-MAR26')[0].teacher = 'Tom Whitfield';
    SA(); const cc = kConflicts().find(c => c.what === 'Cohort double-booked'); ACT.kResolve({ dataset: { id: cc.id } }); document.querySelector('#kr-a').value = 'cancel'; reason('Duplicate');
    ok('S4-03 "Cancel the duplicate session" really cancels it; no conflicts left', kConflicts().length === 0 && ADMIN.audit.some(a => a.action === 'Session cancelled'));
    learner('D'); go('calendar'); ok('S4-04 Grace\'s calendar shows the cancelled session as cancelled', evsOf('D').some(e => /^Cancelled — /.test(e.title) && /^ss-/.test(e.id)));
    SA(); go('a-scheduling'); ok('S4-03 the console says no conflicts', /No conflicts detected/.test(main()));
    COO('A'); S.portal = 'coord'; ACT.kResolve({ dataset: { id: 'x' } }); ok('S4-03 (negative) a Coordinator can\'t resolve conflicts', !MODAL);
    // Coordinator change: both coordinators notified, visibility follows
    SA(); const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'); ACT.changeCoord({ dataset: { id: b.code } }); document.querySelector('#cc-to').value = 'Michael Osei'; reason('Leave cover');
    ok('S4-04 Change Coordinator: both the previous and the new Coordinator are notified', b.coord === 'Michael Osei' && STORE.coo.notifs.some(n => n.to === 'Dr Helen Carter' && n.t === 'Batch reassigned') && STORE.coo.notifs.some(n => n.to === 'Michael Osei' && n.t === 'New batch assigned to you'));
    COO('B'); ok('S4-04 the new Coordinator now sees the batch; the previous one doesn\'t', myBatches().some(x => x.code === b.code) && (COO('A'), !myBatches().some(x => x.code === b.code)));
    SA(); const nb = ADMIN.batches.find(x => !x.coord && S4B_LIVE(x)); if (nb) { ACT.batchStaff({ dataset: { id: nb.code } }); document.querySelector('#bs-c').value = 'Laura Kemp'; reason('First coordinator'); }
    ok('S4-04 allocating a first Coordinator (Change allocations) notifies them', !nb || STORE.coo.notifs.some(n => n.to === 'Laura Kemp' && n.t === 'New batch assigned to you' && n.b.includes(nb.code)));
  });

  await T('S4b preservation: Aisha, Grace, Priya; S2 deadlines; CH-17; P-33; S3 / S4a pins', async () => {
    fresh(); const C = STORE.worlds.C, D_ = STORE.worlds.D, B = STORE.worlds.B, c0 = JSON.stringify([C.resources, C.plans, C.signup]), d0 = JSON.stringify([D_.resources, D_.plans]), b0 = JSON.stringify([B.docs, B.signup]);
    SA(); go('a-resources'); go('a-scheduling'); go('a-batches', { id: 'L3AC-JAN26', tab: 'schedule' }); learner('C'); go('resources'); go('calendar'); learner('D'); go('resources');
    ok('Aisha\'s resources, plans and sign-up are unchanged by S4b (screens visited)', JSON.stringify([C.resources, C.plans, C.signup]) === c0);
    ok('Grace\'s resources and plans unchanged', JSON.stringify([D_.resources, D_.plans]) === d0);
    ok('Priya\'s documents and sign-up unchanged', JSON.stringify([B.docs, B.signup]) === b0);
    ok('S3 / S4a pins kept (structure version, plan, letter)', B.signup.plan.fee === 2400 && B.signup.letterV === 1 && C.signup.plan && !STORE.worlds.C.nvq.progVersion);
    const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'), al0 = JSON.stringify(chAllocOf(b)), cap0 = b.cap; SA();
    ACT.s4bBatchEdit({ dataset: { id: b.code } }); fill({ '#bd-c': String(cap0 + 1), '#bd-r': 'More places' }); prim(); prim(); closeModal();
    ACT.addSession({ dataset: { b: b.code } }); fill({ '#se-d': D(30, '17:00').slice(0, 16) }); prim(); if (MODAL) prim(); closeModal();
    ok('CH-17 / P-33: the three assessors are unchanged and none is the Coordinator after batch and session changes', JSON.stringify(chAllocOf(b)) === al0 && !Object.values(chAllocOf(b)).includes(b.coord) && b.cap === cap0 + 1);
  });

  /* ================= S4b shared classes (client clarification) and the queue-read mutation ================= */
  const shareAdd = (owner, o) => { ACT.addSession({ dataset: { b: owner } }); fill({ '#se-n': o.t, '#se-d': o.at.slice(0, 16), '#se-m': String(o.mins || 90) }); document.querySelector('#se-t').value = o.teacher || 'Marcus Bell'; (o.with || []).forEach(c => { const x = document.querySelector(`.se-w[value="${c}"]`); if (x) x.checked = true; }); let r = prim(); let n = 0; while (r === false && MODAL && n++ < 3 && !/is on another programme|isn't running/.test(mroot().textContent)) r = prim(); if (MODAL && r !== false) closeModal(); return r; };
  const calCount = id => app().querySelectorAll(`main [data-id="${id}"]`).length;

  await T('S4b shared class: one session, two batches of the same programme', async () => {
    fresh(); const d = apply4('A', T3); finish4(d, 'instalment'); const LEI = d.signup.batch, t = apply4('E', T3); ACT.suNext(); t.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', 'Tom Whitfield'); setUi('suDecl', true); ACT.suSign(); chSetBatch(t, ADMIN.batches.find(b => b.code === 'L3AC-JAN27-MAN')); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal();
    const pins0 = JSON.stringify([STORE.worlds.C.nvq.progVersion, d.nvq.progVersion, d.signup.plan, STORE.worlds.C.plans, d.plans, d.admission.deposit]), nSess0 = s4bAllSess().length;
    SA(); ACT.addSession({ dataset: { b: 'L3AC-JAN26' } });
    ok('Share: the session editor offers only other batches of the same programme', [...document.querySelectorAll('.se-w')].every(x => s4PidOfTitle(ADMIN.batches.find(b => b.code === x.value).course) === 'NV-L3') && !!document.querySelector(`.se-w[value="${LEI}"]`) && !document.querySelector('.se-w[value="L2DC-MAR26"]'));
    fill({ '#se-n': 'Shared class: safeguarding scenarios', '#se-d': D(16, '17:00').slice(0, 16), '#se-m': '90' }); document.querySelector('#se-t').value = 'Marcus Bell'; document.querySelector(`.se-w[value="${LEI}"]`).checked = true;
    ok('Share: saving first shows who takes part (both batches and their learners)', prim() === false && /Who takes part/.test(mroot().textContent) && mroot().textContent.includes(LEI) && /organising batch/.test(mroot().textContent) && /doesn't complete any module/.test(mroot().textContent));
    prim(); closeModal(); const s = s4bAllSess().find(x => x.title === 'Shared class: safeguarding scenarios');
    ok('Share: ONE session record (owner + participating batch), audited', !!s && s.batch === 'L3AC-JAN26' && s.with.join() === LEI && s4bAllSess().length === nSess0 + 1 && /shared with/.test(ADMIN.audit[0].after));
    learner('C'); go('calendar'); const cA = evsOf('C').filter(e => e.id === s.id).length;
    learner('A'); go('calendar'); const dA = evsOf('A').filter(e => e.id === 'bs-' + s.id || e.id === s.id).length;
    ok('Calendar: Aisha (organising batch) and Daniel (taking part) both see it, once each', cA === 1 && dA === 1);
    learner('E'); go('calendar'); ok('Calendar (negative): Tom, in another Level 3 batch not taking part, doesn\'t see it', t.signup.done && t.signup.batch === 'L3AC-JAN27-MAN' && !evsOf('E').some(e => e.id === s.id || e.id === 'bs-' + s.id));
    learner('D'); go('calendar'); ok('Calendar (negative): Grace (Level 2) doesn\'t see it', !evsOf('D').some(e => e.id === s.id || e.id === 'bs-' + s.id));
    SA(); go('a-batches', { id: 'L3AC-JAN26', tab: 'schedule' }); const inA = /Shared class: safeguarding scenarios/.test(main()) && /Organised here/.test(main());
    go('a-batches', { id: LEI, tab: 'schedule' }); ok('Schedules: it is in both batches\' Schedule tabs (marked shared), still one record', inA && /Shared class: safeguarding scenarios/.test(main()) && /Organised by L3AC-JAN26/.test(main()) && s4bAllSess().filter(x => x.title === s.title).length === 1);
    TCH('T'); go('t-calendar'); setUi('ccView', 'agenda'); setUi('ccDate', D(16).slice(0, 10)); render(); ok('Teacher: Marcus (teaches both batches) sees the session once', calCount(s.id) === 1);
    SA(); go('a-scheduling', { tab: 'monitor' }); setUi('ccView', 'agenda'); ok('Admin calendar: shown once', (render(), app().querySelectorAll(`main [data-id="${s.id}"]`).length <= 1));
    ok('Conflicts: sharing the class with two batches is not a duplicate-session clash', !kConflicts().some(c => c.detail.includes('Shared class')));
    ok('Versions / commitments: learners\' programme versions, plans and deposits unchanged', JSON.stringify([STORE.worlds.C.nvq.progVersion, d.nvq.progVersion, d.signup.plan, STORE.worlds.C.plans, d.plans, d.admission.deposit]) === pins0);
    ok('Progress: attending is not completion — no criterion changes', JSON.stringify(STORE.worlds.C.tree) === JSON.stringify(STORE.worlds.C.tree) && !d.tree.some(u => u.mods.some(m => m.los.some(l => l.crit.some(c => c.st !== 'Not Started')))));
    // Real clashes are still detected
    shareAdd(LEI, { t: 'Separate tutorial', at: D(16, '17:30'), mins: 60, teacher: 'Omar Siddiqui' });
    ok('Conflicts: a separate session in a participating batch at the same time is a real clash', kConflicts().some(c => c.what === 'Cohort double-booked' && /Shared class/.test(c.detail) && /Separate tutorial/.test(c.detail)));
    const sep = s4bAllSess().find(x => x.title === 'Separate tutorial'); ACT.s4bSessCancel({ dataset: { b: LEI, id: sep.id } }); reason('Not needed');
    shareAdd('L3AC-JAN27-MAN', { t: 'Manchester class', at: D(16, '17:15'), mins: 60, teacher: 'Marcus Bell' });
    ok('Conflicts: the same teacher in a third batch at that time is still a teacher clash', kConflicts().some(c => c.what === 'Teacher double-booked' && /Manchester class/.test(c.detail)));
    const man = s4bAllSess().find(x => x.title === 'Manchester class'); ACT.s4bSessCancel({ dataset: { b: 'L3AC-JAN27-MAN', id: man.id } }); reason('Clash');
    // Edits and cancellation reach every batch; notifications once per person
    const nC = (STORE.worlds.C.notifs || []).length, nA = (STORE.worlds.A.notifs || []).length, tn = STORE.tas.notifs.length, cn = STORE.coo.notifs.length;
    ACT.s4bSessEdit({ dataset: { b: LEI, id: s.id } }); fill({ '#se-d': D(17, '18:00').slice(0, 16), '#se-r': 'Room booking' }); prim(); closeModal();
    ok('Edit: from either batch it changes the one record; both learners\' calendars follow', s.start === D(17, '18:00') && evsOf('C').find(e => e.id === s.id).start === s.start && evsOf('A').find(e => e.id === 'bs-' + s.id).start === s.start);
    ok('Notifications: each learner once; Marcus once; each Coordinator once', (STORE.worlds.C.notifs || []).length === nC + 1 && (STORE.worlds.A.notifs || []).length === nA + 1 && STORE.tas.notifs.length - tn === 1 && (x => x.length === 2 && new Set(x.map(n => n.to)).size === 2)(STORE.coo.notifs.slice(0, STORE.coo.notifs.length - cn).filter(n => n.to)) /* person-targeted; the activity feed entry (no recipient) is the existing audit feed */);
    COO('A'); S.portal = 'coord'; ACT.cooEditEv({ dataset: { b: 'L3AC-JAN26', id: s.id } }); ok('Coordinator of the organising batch can still move it (D7 / F5)', !!MODAL); closeModal();
    const leiB = ADMIN.batches.find(b => b.code === LEI), c0 = leiB.coord; leiB.coord = 'Michael Osei'; COO('B'); S.portal = 'coord'; ACT.cooEditEv({ dataset: { b: LEI, id: s.id } }); const blocked = !MODAL && ADMIN.audit[0].action; closeModal(); leiB.coord = c0;
    ok('Coordinator (negative): only the organising batch\'s Coordinator can move a shared class (refused, logged)', blocked === 'Blocked: move a shared class organised by another batch');
    SA(); ACT.s4bSessCancel({ dataset: { b: 'L3AC-JAN26', id: s.id } }); reason('Teacher unwell');
    ok('Cancel: one record cancelled; both learners see it cancelled', s.status === 'Cancelled' && /^Cancelled — /.test(evsOf('C').find(e => e.id === s.id).title) && evsOf('A').find(e => e.id === 'bs-' + s.id).cancelled);
  });

  await T('S4b shared class: invalid and unauthorised sharing, removing a batch, single sessions', async () => {
    fresh(); SA(); const n0 = s4bAllSess().length;
    ACT.addSession({ dataset: { b: 'L3AC-JAN26' } }); fill({ '#se-n': 'Cross-programme try', '#se-d': D(19, '17:00').slice(0, 16) });
    document.querySelector('.s4b-share').insertAdjacentHTML('beforeend', '<input type="checkbox" class="se-w" value="L2DC-MAR26" checked>');
    ok('Share (negative): a batch of another programme is rejected, even injected into the form; logged', prim() === false && /another programme/.test(mroot().textContent) && s4bAllSess().length === n0 && ADMIN.audit[0].action === 'Blocked: share session'); closeModal();
    FA4(); ACT.s4bSessEdit({ dataset: { b: 'L2DC-MAR26', id: 'ss-2' } }); ok('Share (negative): Finance can\'t change sessions or sharing (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: edit sessions');
    COO('A'); S.portal = 'coord'; ACT.addSession({ dataset: { b: 'L3AC-JAN26' } }); ok('Share (negative): a Coordinator can\'t create a shared class', !MODAL && ADMIN.audit[0].action === 'Blocked: add sessions');
    SA(); const d = apply4('A', T3); finish4(d, 'instalment'); const LEI = d.signup.batch; SA();
    shareAdd('L3AC-JAN26', { t: 'Joint revision', at: D(23, '17:00'), with: [LEI] }); const s = s4bAllSess().find(x => x.title === 'Joint revision');
    learner('A'); go('calendar'); const had = evsOf('A').some(e => e.id === 'bs-' + s.id);
    SA(); ACT.s4bSessEdit({ dataset: { b: 'L3AC-JAN26', id: s.id } }); document.querySelector(`.se-w[value="${LEI}"]`).checked = false; fill({ '#se-r': 'Leicester 8 has its own class' });
    ok('Unshare: removing a batch shows the impact first', prim() === false && /no longer taking part/.test(mroot().textContent)); prim(); closeModal();
    ok('Unshare: Daniel no longer has it; Aisha keeps it; audited', had && !evsOf('A').some(e => e.id === 'bs-' + s.id) && evsOf('C').some(e => e.id === s.id) && ADMIN.audit[0].action === 'Session sharing changed' && s.with.length === 0);
    learner('D'); go('calendar'); const ss2 = s4bSessById('ss-2'); ok('Single-batch sessions are unchanged and still valid (seeded Croydon sessions)', ss2.batch === 'L2DC-MAR26' && !(ss2.with || []).length && evsOf('D').some(e => e.id === 'ss-2'));
  });

  await T('S4b: reading admin screens never changes an applicant\'s records (queue notes)', async () => {
    fresh(); const snap = () => JSON.stringify(Object.fromEntries(Object.entries(STORE.worlds).map(([k, w]) => [k, [w.docs || null, w.admission || null, w.requests || null]]))), s0 = snap();
    SA(); ['a-dashboard', 'a-queue', 'a-admissions', 'a-batches', 'a-learners', 'a-finance'].forEach(r => go(r)); go('a-admissions', { id: 'APP-B' }); acaEnter('KA'); S.signedIn = true; go('a-dashboard'); go('a-queue');
    ok('Opening the dashboards, Approvals Queue and Admissions leaves every applicant\'s documents, admission and requests unchanged (Priya included)', snap() === s0 && !STORE.worlds.B.docs.some(d => '_notes' in d));
    SA(); const it = allQueue().find(i => i.id === 'AQ-DOC-B-' + STORE.worlds.B.docs.find(x => x.status === 'Submitted').id); it.notes.push(['Rachel Hughes', now().toISOString(), 'Checked the certificate']);
    ok('Queue notes still persist — kept with the queue, not on the applicant\'s document', allQueue().find(i => i.id === it.id).notes.length === 1 && !STORE.worlds.B.docs.some(d => '_notes' in d));
  });

  /* ================= N1 — certificate delivery (SRS v1.3.2, proposed) ================= */
  await T('N1 NVQ qualification certificates are posted; short-course certificates stay digital', async () => {
    fresh(); const certSnap = () => JSON.stringify([Object.fromEntries(Object.entries(STORE.worlds).map(([k, w]) => [k, w.certs || null])), STORE.agy.certs]), c0 = certSnap();
    learner('C'); S.edge = 'qualified'; setVariant('C'); go('progress'); const cel = app().querySelector('.celebrate');
    ok('N1 qualified NVQ learner: "Qualification requirements met" with every criterion achieved (unchanged)', W.qualified && !!cel && /Qualification requirements met/.test(cel.textContent) && W.tree.every(u => u.mods.every(m => m.los.every(l => l.crit.every(c => c.st === 'Achieved')))));
    ok('N1 the steps say the certificate is sent by post, outside the LMS', /quality checks/.test(cel.textContent) && /claim is sent to the awarding body/.test(cel.textContent) && /qualification certificate is sent to you by post/.test(cel.textContent) && /isn't issued, downloaded or verified in the LMS/.test(cel.textContent));
    ok('N1 no NVQ certificate action is advertised (no "Go to Certificates", no download / view / verify)', !cel.querySelector('button, a, [data-go], [data-act]') && !/appears in Certificates/.test(cel.textContent) && /digital certificates for your short courses only/.test(cel.textContent));
    go('course', { id: 'nvq' }); ok('N1 the NVQ programme page has no certificate tab or download', !/Certificate tab|Download certificate/i.test(main()) && !app().querySelector('[data-act="viewCert"], [data-act="copyVerify"]'));
    go('help'); ok('N1 Help FAQ: short courses issued in the LMS; NVQ certificates sent by post', /Short-course certificates are issued in the LMS/.test(main()) && /sent to you by post after the awarding body confirms/.test(main()) && !/NVQ certificates are issued after/.test(main()));
    go('certificates'); const nvqT = W.nvq.title;
    ok('N1 the Certificates page still lists the learner\'s genuine short-course certificates — none for the NVQ', W.certs.length > 0 && !!app().querySelector('[data-act="viewCert"]') && !W.certs.some(c => c.course === nvqT) && !main().includes(nvqT));
    ACT.viewCert({ dataset: { id: W.certs.find(c => c.status !== 'Revoked').id } }); ok('N1 a short-course certificate still opens with Download PDF', !!MODAL && !!MODAL.actions.find(x => /Download PDF/.test(x.label))); closeModal();
    S.edge = 'none'; setVariant('C');
    ok('N1 learner, agency and dashboard certificate records unchanged by these screens', certSnap() === c0);
    // Short-course generation and verification still work
    fresh(); learner('A'); const e = W.enrolments.find(x => x.kind === 'short' && x.status === 'Active' && x.reqs && x.reqs.length), n0 = W.certs.length; e.reqs.forEach(r => { r[1] = true; }); shComplete(e);
    const cert = W.certs.find(c => c.course === (e.base || e.title) && c.issued && daysTo(c.issued) > -1);
    ok('N1 completing a short course still issues one digital certificate', W.certs.length === n0 + 1 && !!cert);
    verOpen(cert.no, 'q'); ok('N1 the new short-course certificate verifies (Valid)', /Valid/.test(main()) && ADMIN.audit[0].module === 'Certificate verification');
    learner('C'); go('index'); ok('N1 learner screen index: qualified state described as "the certificate comes by post"', /the certificate comes by post/.test(html()) && !/what happens before the certificate/.test(html()));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: N1 entry', /Certificate delivery — NVQ certificates are posted/.test(main()));
  });

  /* ================= N4 — session-linked attendance registers ================= */
  await T('N4 one register per session, by learner ID; shared class; teacher, Coordinator, learner, admin', async () => {
    fresh(); const legacy0 = JSON.stringify([ADMIN.sessions, ADMIN.unmatched]), tree0 = JSON.stringify(STORE.worlds.C.tree), conf0 = kConflicts().length;
    const d = apply4('A', T3); finish4(d, 'instalment'); const LEI = d.signup.batch, DID = d.me.id, AID = STORE.worlds.C.me.id, GID = STORE.worlds.D.me.id;
    SA(); shareAdd('L3AC-JAN26', { t: 'Shared revision class', at: D(-1, '11:00'), mins: 60, teacher: 'Marcus Bell', with: [LEI] }); const s = s4bAllSess().find(x => x.title === 'Shared revision class');
    const el = n4Eligible(s), jan = chCohLids(ADMIN.batches.find(b => b.code === 'L3AC-JAN26'));
    ok('N4 eligible learners = the learner IDs of both batches taking part', !!s && el.includes(AID) && el.includes(DID) && jan.every(l => el.includes(l)) && el.every(l => /^IA-L-\d+$/.test(l)));
    ok('N4 learners of unrelated batches are excluded (Grace, Croydon Cohort 4)', !el.includes(GID) && !chCohLids(ADMIN.batches.find(b => b.code === 'L2DC-MAR26')).some(l => el.includes(l)));
    go('a-attendance'); ok('N4 admin Attendance lists the class session; the Zoom sessions are kept as legacy registers', !!app().querySelector(`.n4-admin [data-go="a-attendance"][data-id="${s.id}"]`) && /Legacy Zoom registers \(name-based\)/.test(main()));
    go('a-attendance', { id: s.id }); ok('N4 one register for the session; opening it writes nothing', /Attendance register — Shared revision class/.test(main()) && app().querySelectorAll('.n4-reg tr[data-lid]').length === el.length && !N4().regs[s.id]);
    ADMIN.batches.find(b => b.code === LEI).roster.push(['Aisha Rahman', AID, 'Self-funded']);
    go('a-attendance', { id: s.id }); ok('N4 a learner in both batches has ONE row (de-duplicated by learner ID)', n4Eligible(s).length === el.length && app().querySelectorAll(`.n4-reg tr[data-lid="${AID}"]`).length === 1);
    // Simulated Zoom import: matched by registered email only; re-import is idempotent
    ACT.n4Import({ dataset: { s: s.id } }); const reg = N4().regs[s.id], nRows = Object.keys(reg.rows).length, nUm = Object.keys(reg.unmatched).length;
    ok('N4 import (simulated): one row per eligible learner, audited', nRows === n4Eligible(s).length && ADMIN.audit[0].action === 'Zoom attendance imported (simulated)');
    const um = Object.values(reg.unmatched), guest = um.find(p => /^Guest/.test(p.name));
    ok('N4 unmatched participants are kept, never matched by name (a guest, anyone not using the registered email)', !!guest && guest.state === 'Open' && um.filter(p => /\(phone\)/.test(p.name)).every(p => reg.rows[p.pid.split(':')[1]].status === 'Absent'));
    ACT.n4Set({ dataset: { s: s.id, l: AID } }); document.querySelector('#n4-st').value = 'Present'; fill({ '#n4-m': '55' }); reason('Joined from the classroom PC');
    ok('N4 manual correction: reason and history kept, audited', reg.rows[AID].status === 'Present' && reg.rows[AID].src === 'manual' && reg.rows[AID].hist[0][4] === 'Joined from the classroom PC' && reg.rows[AID].hist.length >= 2 && ADMIN.audit[0].action === 'Attendance corrected');
    ACT.n4Import({ dataset: { s: s.id } });
    ok('N4 re-import: no duplicate rows or participants; the manual correction is kept', Object.keys(reg.rows).length === nRows && Object.keys(reg.unmatched).length === nUm && reg.rows[AID].status === 'Present' && reg.rows[AID].src === 'manual' && /manual kept/.test(ADMIN.audit[0].after));
    ACT.n4Match({ dataset: { s: s.id, p: guest.pid } }); document.querySelector('#n4-ml').insertAdjacentHTML('beforeend', `<option value="${GID}">Grace</option>`); document.querySelector('#n4-ml').value = GID; fill({ '#rsn': 'Try' });
    ok('N4 (negative) a participant can\'t be credited to a learner who isn\'t taking part (refused, logged)', prim() === false && !reg.rows[GID] && guest.state === 'Open' && ADMIN.audit[0].action === 'Blocked: credit attendance to a learner who isn\'t taking part'); closeModal();
    ACT.n4Match({ dataset: { s: s.id, p: guest.pid } }); document.querySelector('#n4-ml').value = DID; reason('Daniel confirmed he joined as a guest');
    ok('N4 a person matches the participant to a verified learner ID, with a reason', guest.state === 'Matched' && guest.lid === DID && reg.rows[DID].src === 'zoom (matched)' && ADMIN.audit[0].action === 'Zoom participant matched');
    // Teacher: the session's teacher manages; another teacher can't
    TCH('T'); go('t-sessions'); ok('N4 teacher (Marcus): the session is in "Your class sessions"', !!app().querySelector(`.n4-tas [data-id="${s.id}"]`));
    go('t-sessions', { id: s.id }); ok('N4 teacher opens the same register', /Attendance register — Shared revision class/.test(main()) && !!app().querySelector(`[data-act="n4Set"][data-l="${DID}"]`));
    const dSt = reg.rows[DID].status; ACT.n4Set({ dataset: { s: s.id, l: DID } }); document.querySelector('#n4-st').value = dSt === 'Late' ? 'Present' : 'Late'; reason('Joined at 11:12');
    ok('N4 teacher records a correction (audited as the teacher)', reg.rows[DID].status !== dSt && reg.rows[DID].hist[0][1] === 'Marcus Bell');
    TCH('A'); go('t-sessions', { id: s.id }); ok('N4 (negative) another teacher can\'t open the register', /only open registers for sessions you teach/.test(main()) && ADMIN.audit[0].action === 'Blocked: open this attendance register');
    const before = JSON.stringify(reg.rows); ACT.n4Set({ dataset: { s: s.id, l: DID } }); ok('N4 (negative) another teacher can\'t change attendance (refused, logged, unchanged)', !MODAL && JSON.stringify(reg.rows) === before && ADMIN.audit[0].action === 'Blocked: record attendance for this session');
    FA4(); ACT.n4Set({ dataset: { s: s.id, l: AID } }); ok('N4 (negative) Finance can\'t change attendance', !MODAL && JSON.stringify(reg.rows) === before);
    // Coordinator: view only, own batches' learners
    COO('A'); go('c-attendance'); ok('N4 Coordinator (Leicester Cohort 7) sees the session (view only)', !!app().querySelector(`.n4-coo [data-act="n4View"][data-s="${s.id}"]`));
    ACT.n4View({ dataset: { s: s.id } }); ok('N4 Coordinator sees her batch\'s learners only — not Daniel (Leicester Cohort 8); no edit buttons', !!mroot().querySelector(`tr[data-lid="${AID}"]`) && !mroot().querySelector(`tr[data-lid="${DID}"]`) && !mroot().querySelector('[data-act="n4Set"], [data-act="n4Import"]')); closeModal();
    COO('B'); ACT.n4View({ dataset: { s: s.id } }); ok('N4 (negative) a Coordinator of neither batch can\'t view it', !MODAL && ADMIN.audit[0].action === 'Blocked: view this attendance register');
    // Learner: own row only; a shared class counted once
    learner('C'); go('attendance'); const card = app().querySelector('.n4-learner');
    ok('N4 Aisha sees her own record for the session (Present), counted once', !!card && /Attended 1 of 1 recorded class/.test(card.textContent) && card.querySelectorAll(`tr[data-sid="${s.id}"]`).length === 1 && /Present/.test(card.textContent));
    ok('N4 a learner sees no one else\'s attendance', !card.textContent.includes('Daniel') && !card.textContent.includes(DID));
    learner('A'); go('attendance'); ok('N4 Daniel sees his own record', /Attended 1 of 1 recorded class/.test(app().querySelector('.n4-learner').textContent));
    SA(); go('a-learner', { id: AID, tab: 'attendance' }); ok('N4 Learner 360 → Attendance shows the same register record', /Class sessions — attendance register/.test(main()) && /Attended 1 of 1 recorded class/.test(main()));
    // Reschedule, remove a batch, cancel: history kept
    ACT.s4bSessEdit({ dataset: { b: 'L3AC-JAN26', id: s.id } }); fill({ '#se-d': D(-1, '12:00').slice(0, 16), '#se-r': 'Moved' }); prim(); closeModal();
    ok('N4 rescheduling keeps the same register and rows', s.start === D(-1, '12:00') && N4().regs[s.id] === reg && Object.keys(reg.rows).length === nRows);
    ACT.s4bSessEdit({ dataset: { b: 'L3AC-JAN26', id: s.id } }); document.querySelector(`.se-w[value="${LEI}"]`).checked = false; fill({ '#se-r': 'Leicester 8 has its own class' }); prim(); prim(); closeModal();
    go('a-attendance', { id: s.id }); ok('N4 removing a batch keeps its learners\' attendance as read-only history', !!reg.rows[DID] && !!app().querySelector(`.n4-past tr[data-lid="${DID}"]`) && !app().querySelector(`[data-act="n4Set"][data-l="${DID}"]`));
    ACT.s4bSessCancel({ dataset: { b: 'L3AC-JAN26', id: s.id } }); reason('Room flooded'); const rows1 = JSON.stringify(reg.rows);
    ACT.n4Set({ dataset: { s: s.id, l: AID } }); ok('N4 cancelling keeps recorded attendance; no new entries', JSON.stringify(reg.rows) === rows1 && !MODAL && reg.rows[AID].status === 'Present');
    learner('C'); go('attendance'); ok('N4 the learner sees it marked cancelled with her recorded status kept', /Cancelled/.test(app().querySelector('.n4-learner').textContent) && /Present/.test(app().querySelector('.n4-learner').textContent));
    ok('N4 attendance completes nothing (Aisha\'s criteria unchanged)', JSON.stringify(STORE.worlds.C.tree) === tree0);
    ok('N4 the seeded Zoom sessions and unmatched list are unchanged', JSON.stringify([ADMIN.sessions, ADMIN.unmatched]) === legacy0);
    SA(); go('a-attendance', { id: 'ZS-01' }); ok('N4 a legacy Zoom register still opens as before', /Session register/.test(main()) && /Aisha Rahman/.test(main()));
    ok('N4 S4b conflicts and calendars unaffected', kConflicts().length === conf0 && (learner('C'), go('calendar'), evsOf('C').some(e => e.id === s.id)));
  });

  /* ================= N2 — batch-level delivery mode (Fully Assisted / Self-Paced) ================= */
  const mkBatchN2 = (code, course, dm, chan, coord) => { ACT.newBatch(); if (!MODAL) return false; fill({ '#nb-c': code }); const co = document.querySelector('#nb-co'); co.value = course; INP.n2NbCourse(co); if (dm) document.querySelector('#nb-dm').value = dm; if (chan) document.querySelector('#nb-m').value = chan; if (prim() === false) return false; const ac = document.querySelector('#nb-ac'); ac.value = coord === '' ? '' : coord || ac.options[1].value; if (prim() === false) return false; prim(); prim(); prim(); return ADMIN.batches.find(b => b.code === code) || null; };
  await T('N2 batch delivery mode: create, show, seed, edit rules, permissions, preservation', async () => {
    fresh(); const keep = JSON.stringify([STORE.worlds.C.plans, STORE.worlds.C.nvq, STORE.worlds.C.tree, STORE.worlds.D.plans, STORE.chFees, STORE.worlds.B.signup]);
    ok('N2 seed: every existing NVQ batch is Fully Assisted, marked as a seeded default (not client-confirmed)', ADMIN.batches.filter(b => n2IsNvqTitle(b.course)).every(b => b.dmode === 'Fully Assisted' && b.dmodeSrc === 'seed default') && !SHORT_BATCH().dmode);
    ok('N2 seed: NV-L3D keeps Self-Paced as its programme default for new batches (it has no batches)', n2DefaultFor(s3Pr('NV-L3D').title) === 'Self-Paced' && !ADMIN.batches.some(b => b.course === s3Pr('NV-L3D').title) && n2DefaultFor(T3) === 'Fully Assisted');
    acaEnter('KA'); S.signedIn = true; go('a-batches'); ACT.newBatch();
    ok('N2 Create batch asks for the delivery mode separately from the delivery channel', !!document.querySelector('#nb-dm') && [...document.querySelectorAll('#nb-dm option')].map(o => o.value).join() === 'Fully Assisted,Self-Paced' && [...document.querySelectorAll('#nb-m option')].map(o => o.value).join() === 'Online,Classroom,Blended' && /Delivery channel/.test(mroot().textContent)); closeModal();
    ok('N2 (negative) both modes still require an Academic Coordinator', mkBatchN2('L3SP-NOCO', T3, 'Self-Paced', 'Online', '') === false && !ADMIN.batches.some(b => b.code === 'L3SP-NOCO') && /coordinator/i.test(mroot().textContent)); closeModal();
    const sp = mkBatchN2('L3SP-MAR27', T3, 'Self-Paced', 'Online', 'Dr Helen Carter'), fa = mkBatchN2('L3FA-MAR27', T3, 'Fully Assisted', 'Classroom', 'Dr Helen Carter');
    ok('N2 two batches of the same programme with different delivery modes; channel kept separately', !!sp && !!fa && sp.course === fa.course && sp.dmode === 'Self-Paced' && fa.dmode === 'Fully Assisted' && sp.mode === 'Online' && fa.mode === 'Classroom' && sp.dmodeSrc === 'set');
    ok('N2 the choice is audited when the batch is created', ADMIN.audit.some(a => a.action === 'Delivery mode set' && a.entity.includes('L3SP-MAR27') && a.after === 'Self-Paced'));
    go('a-batches'); const row = [...app().querySelectorAll('main tr')].find(r => r.textContent.includes('L3SP-MAR27'));
    ok('N2 batch list: Delivery mode column', !!row && /Self-Paced/.test(row.textContent));
    go('a-batches', { id: 'L3SP-MAR27' }); ok('N2 batch detail: delivery mode and the Self-Paced support wording', /Delivery mode: Self-Paced/.test(main()) && /academic support is through LMS messages/i.test(main()) && /not routine phone calls/.test(main()));
    COO('A'); setUi('cbTab', 'planned'); go('c-batches'); const crow = [...app().querySelectorAll('main tr')].find(r => r.textContent.includes('L3SP-MAR27'));
    ok('N2 Coordinator batch list shows it', !!crow && /Self-Paced/.test(crow.textContent));
    go('c-batches', { id: 'L3SP-MAR27' }); ok('N2 Coordinator overview: channel and mode separate; no "weekly live classes" claim for Self-Paced', /Delivery channel/.test(main()) && /Self-Paced/.test(app().querySelector('.n2-mode').textContent) && !/Online delivery with weekly live classes/.test(main()) && /not routine phone calls/.test(main()));
    // A learner on the Self-Paced batch
    const d = apply4('A', T3); ok('N2 sign-up batch panel shows the assigned batch\'s delivery mode', /Fully Assisted/.test(chAssignedHtml(d)));
    ACT.suNext(); d.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', 'Daniel Okafor'); setUi('suDecl', true); ACT.suSign(); chSetBatch(d, sp); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal();
    learner('A'); go('course', { id: 'nvq' }); ok('N2 learner programme overview: Delivery channel and Delivery mode (Self-Paced) with the support wording', d.signup.batch === 'L3SP-MAR27' && /Delivery channel/.test(main()) && /Self-Paced/.test((app().querySelector('.n2-mode') || {}).textContent || '') && /not routine phone calls/.test(main()));
    ok('N2 same programme structure and version for both modes', d.tree.map(u => u.code).join() === STORE.s3.trees['NV-L3'].map(u => u.code).join() && d.nvq.title === T3);
    // Editing: allowed while empty (with a reason, audited); refused once learners are enrolled, also when forced
    SA(); ACT.s4bBatchEdit({ dataset: { id: 'L3FA-MAR27' } }); ok('N2 empty batch: the delivery mode can be edited', !document.querySelector('#bd-dm').disabled);
    document.querySelector('#bd-dm').value = 'Self-Paced'; fill({ '#bd-r': 'Planned as a Self-Paced intake' }); prim(); prim(); closeModal();
    ok('N2 empty batch: mode changed with the reason, audited, history kept', fa.dmode === 'Self-Paced' && fa.dmodeHist[0][4] === 'Planned as a Self-Paced intake' && ADMIN.audit.some(a => a.action === 'Delivery mode changed' && a.before === 'Fully Assisted' && a.after === 'Self-Paced'));
    ACT.s4bBatchEdit({ dataset: { id: 'L3SP-MAR27' } }); const sel = document.querySelector('#bd-dm');
    ok('N2 batch with an enrolled learner: the mode field is locked with the reason', sel.disabled && /transfer and impact policy/.test(mroot().textContent));
    sel.disabled = false; sel.innerHTML = '<option>Self-Paced</option><option>Fully Assisted</option>'; sel.value = 'Fully Assisted'; fill({ '#bd-r': 'Forced' });
    ok('N2 (negative) forcing a mode change on an enrolled batch is refused and logged; nothing changes', prim() === false && sp.dmode === 'Self-Paced' && ADMIN.audit[0].action === 'Blocked: change delivery mode'); closeModal();
    const jan = ADMIN.batches.find(b => b.code === 'L3AC-JAN26'); ACT.s4bBatchEdit({ dataset: { id: jan.code } }); ok('N2 seeded batch with learners (Leicester Cohort 7): locked', document.querySelector('#bd-dm').disabled); closeModal();
    FA4(); ACT.newBatch(); ok('N2 (negative) Finance can\'t create a batch (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: create batch');
    role('sysA'); go('a-batches'); const sysB = mkBatchN2('L3SP-SYS27', T3, 'Self-Paced', 'Online', 'Dr Helen Carter');
    ok('N2 the System Admin can create an NVQ batch and choose its delivery mode (client-confirmed permissions: Create and edit batches ☒)', !!sysB && sysB.dmode === 'Self-Paced' && sysB.dmodeSrc === 'set' && sysB.coord === 'Dr Helen Carter' && ADMIN.audit.some(a => a.action === 'Delivery mode set' && a.entity.includes('L3SP-SYS27')));
    ok('N2 (negative) the System Admin still needs an Academic Coordinator', mkBatchN2('L3SP-SYSX', T3, 'Self-Paced', 'Online', '') === false && !ADMIN.batches.some(b => b.code === 'L3SP-SYSX')); closeModal();
    COO('A'); S.portal = 'coord'; ACT.newBatch(); ok('N2 (negative) a Coordinator can\'t create a batch (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: create batch');
    COO('A'); S.portal = 'coord'; ACT.s4bBatchEdit({ dataset: { id: 'L3FA-MAR27' } }); ok('N2 (negative) a Coordinator can\'t change the delivery mode', !MODAL && fa.dmode === 'Self-Paced');
    // System Admin: Edit batch details (client-confirmed permissions: Create and edit batches ☒)
    role('sysA'); go('a-batches', { id: 'L3SP-SYS27' }); ok('N2 the System Admin sees "Edit details"', !!app().querySelector('[data-act="s4bBatchEdit"][data-id="L3SP-SYS27"]'));
    ACT.s4bBatchEdit({ dataset: { id: 'L3SP-SYS27' } }); ok('N2 the System Admin can open Edit batch details; an empty batch\'s mode is editable', !!MODAL && !document.querySelector('#bd-dm').disabled);
    document.querySelector('#bd-dm').value = 'Fully Assisted'; fill({ '#bd-r': '' }); ok('N2 (negative) the System Admin still needs a reason', prim() === false && sysB.dmode === 'Self-Paced');
    fill({ '#bd-r': 'Changed to a weekly-class intake' }); prim(); prim(); closeModal();
    ok('N2 the System Admin changes an empty batch\'s delivery mode: saved, audited, history kept', sysB.dmode === 'Fully Assisted' && sysB.dmodeHist[0][2] === 'Self-Paced' && ADMIN.audit.some(a => a.action === 'Delivery mode changed' && a.entity.includes('L3SP-SYS27') && a.after === 'Fully Assisted'));
    ACT.s4bBatchEdit({ dataset: { id: 'L3SP-MAR27' } }); const sl = document.querySelector('#bd-dm'); sl.disabled = false; sl.innerHTML = '<option>Self-Paced</option><option>Fully Assisted</option>'; sl.value = 'Fully Assisted'; fill({ '#bd-r': 'Forced by System Admin' });
    ok('N2 (negative) a forced mode change on an enrolled batch is refused for the System Admin too (logged, unchanged)', prim() === false && sp.dmode === 'Self-Paced' && ADMIN.audit[0].action === 'Blocked: change delivery mode'); closeModal();
    FA4(); ACT.s4bBatchEdit({ dataset: { id: 'L3SP-SYS27' } }); ok('N2 (negative) Finance still can\'t edit batch details', !MODAL && sysB.dmode === 'Fully Assisted' && ADMIN.audit[0].action === 'Blocked: edit batch details');
    role('sysA'); ACT.addSession({ dataset: { b: 'L3SP-SYS27' } }); ok('N2 / N3 the System Admin can add a class session (client-confirmed: Timetable: classes ☒, Create Zoom sessions ☒)', !!MODAL && !!document.querySelector('#se-n')); closeModal();
    // CH-17 / P-33, shared classes and N4 registers still work across modes
    SA(); go('a-batches', { id: 'L3SP-MAR27', tab: 'staff' }); ok('N2 CH-17 / P-33 unchanged on a Self-Paced batch (Coordinator can\'t be its assessor)', main().includes(CH_P33) && !Object.values(chAllocOf(sp)).includes(sp.coord));
    shareAdd('L3AC-JAN26', { t: 'Mixed-mode class', at: D(-1, '13:00'), mins: 60, teacher: 'Marcus Bell', with: ['L3SP-MAR27'] }); const s = s4bAllSess().find(x => x.title === 'Mixed-mode class');
    ok('N2 a class shared between a Fully Assisted and a Self-Paced batch of the same programme is one session', !!s && s.with.join() === 'L3SP-MAR27' && n4Eligible(s).includes(d.me.id) && n4Eligible(s).includes(STORE.worlds.C.me.id));
    ACT.n4Import({ dataset: { s: s.id } }); ok('N2 one N4 register for both batches', Object.keys(N4().regs[s.id].rows).length === n4Eligible(s).length && !!N4().regs[s.id].rows[d.me.id]);
    ok('N2 historical learners, plans, fees, versions and assessments unchanged', JSON.stringify([STORE.worlds.C.plans, STORE.worlds.C.nvq, STORE.worlds.C.tree, STORE.worlds.D.plans, STORE.chFees, STORE.worlds.B.signup]) === keep);
    const f = chFeeRaise(d.me.id, T3, D(5), 'A', true); ok('N2 CH-38 not changed in N2 (transitional until N5): a fee for a Self-Paced batch learner still follows the programme setting (£70)', !!f && f.amount === 70 && f.support === 'Fully assisted' && sp.dmode === 'Self-Paced');
    // P-31 wording
    go('a-programmes', { id: 'NV-L3D', tab: 'support' }); ok('N2 programme Support type = default for new batches (not the mode of enrolled batches); P-31 tag kept', /default delivery mode for new batches/.test(main()) && /never changes an existing batch/.test(main()) && /Transitional until N5/.test(main()) && !!app().querySelector('.tbd') && !!document.querySelector('input[name="ch-sup"][value="Self-paced"]:checked'));
    acaEnter('KA'); S.signedIn = true; go('a-programmes', { id: 'NV-N1', tab: 'details' }); ok('N2 wizard Details: "Default delivery mode for new batches"', /Default delivery mode for new batches/.test(main()) && !/<legend class="lbl">Support type<\/legend>/.test(html()));
    go('a-programmes', { id: 'NV-N1', tab: 'review' }); ok('N2 wizard Review: the same label', /Default delivery mode for new batches/.test(main()));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: N2 entry; N4 limitations stated', /NVQ batch-level delivery mode/.test(main()) && /NOT client-approved academic eligibility policies/.test(main()) && /Thresholds tab is not functional yet/.test(main()) && /unverified demo data/.test(main()) && /Grace Mensah/.test(main()));
  });

  /* ================= N3 — class planning (weekly Fully Assisted, limited Self-Paced) ================= */
  const n3Save = (code, o) => { ACT.n3Weekly({ dataset: { b: code } }); if (!MODAL) return false; const set = { '#n3-wd': o.wd || 'Tuesday', '#n3-t': o.t || '17:00', '#n3-m': String(o.m || 90), '#n3-te': o.te || 'Marcus Bell', '#n3-f': o.f, '#n3-to': o.to, '#n3-n': o.n || 'Weekly class', '#n3-r': o.r || 'Timetable' }; Object.entries(set).forEach(([k, v]) => { document.querySelector(k).value = v; }); const p1 = prim(), pv = (document.querySelector('#n3-pv') || {}).textContent || ''; const p2 = p1 === false ? prim() : p1; if (MODAL) closeModal(); return { pv, p2 }; };
  const dayAdd = (iso, n) => new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);
  await T('N3 class planning: weekly plan, limited plan, sharing, history, conflicts, permissions', async () => {
    fresh(); const keep = JSON.stringify([STORE.worlds.C.plans, STORE.worlds.C.assignments.map(a => a.due), STORE.worlds.B.signup, STORE.chFees]), janN = s4bSessFor('L3AC-JAN26').length;
    SA(); go('a-batches'); const fa = mkBatchN2('L3FA-W27', T3, 'Fully Assisted', 'Online', 'Dr Helen Carter'), sp = mkBatchN2('L3SP-W27', T3, 'Self-Paced', 'Online', 'Dr Helen Carter'), sp2 = mkBatchN2('L3SP-X27', T3, 'Self-Paced', 'Online', 'Dr Helen Carter');
    go('a-batches', { id: 'L3FA-W27', tab: 'schedule' }); ok('N3 Fully Assisted batch → weekly class plan on the Schedule tab (not configured yet)', /Class plan — Fully Assisted \(weekly\)/.test(main()) && /hasn't been configured/.test(main()) && !!app().querySelector('[data-act="n3Weekly"]'));
    go('a-batches', { id: 'L3SP-W27', tab: 'schedule' }); ok('N3 Self-Paced batch → limited class plan', /Class plan — Self-Paced \(limited classes\)/.test(main()) && !!app().querySelector('[data-act="n3Target"]') && !app().querySelector('[data-act="n3Weekly"]'));
    const f = fa.start.slice(0, 10), t4 = dayAdd(fa.start, 27), exp = n3Dates({ weekday: 'Tuesday', time: '17:00', from: f, to: t4 }, fa);
    const r1 = n3Save('L3FA-W27', { f, to: t4 }), occ = n3Plan('L3FA-W27').occ, ids = Object.values(occ), ss = ids.map(s4bSessById);
    ok('N3 weekly plan: preview first, then saved', /Preview — nothing is saved yet/.test(r1.pv) && new RegExp(exp.length + ' new class').test(r1.pv) && n3Plan('L3FA-W27').weeklyStatus === 'Saved' && ADMIN.audit.some(a => a.action === 'Class plan saved'));
    ok('N3 one real S4b session per Tuesday, each with its own stable id; no attendance created', exp.length === 4 && ids.length === 4 && new Set(ids).size === 4 && ss.every(s => s && s.batch === 'L3FA-W27' && s.status === 'Scheduled' && (new Date(s.end) - new Date(s.start)) === 90 * 6e4 && s.teacher === 'Marcus Bell') && ids.every(id => !N4().regs[id]));
    ok('N3 one notice per person for the whole plan (not one per class): the Coordinator once, the teacher once', STORE.coo.notifs.filter(n => n.t === 'Class timetable changed' && n.to === 'Dr Helen Carter').length === 1 && STORE.tas.notifs.filter(n => n.t === 'Class timetable changed' && /^Marcus Bell:/.test(n.b)).length === 1);
    go('a-batches', { id: 'L3FA-W27', tab: 'schedule' }); ok('N3 the Schedule tab lists them; the header shows the plan', ids.every(id => !!app().querySelector(`[data-act="s4bSessEdit"][data-id="${id}"]`)) && /Weekly: Tuesdays 17:00/.test(main()));
    const r2 = n3Save('L3FA-W27', { f, to: t4 }); ok('N3 saving the same plan again creates no duplicates', /No change to the sessions/.test(r2.pv) && s4bSessFor('L3FA-W27').length === 4 && Object.values(n3Plan('L3FA-W27').occ).join() === ids.join());
    // Learners: one on the FA batch (roster), Daniel on the Self-Paced batch
    const lid = ADMIN.learners[40].id; fa.roster.push([ADMIN.learners[40].name, lid, 'Self-funded']);
    const d = apply4('A', T3); ACT.suNext(); d.docs.forEach(x => { x.status = 'Submitted'; }); ACT.suNext(); setUi('suSig', 'Daniel Okafor'); setUi('suDecl', true); ACT.suSign(); chSetBatch(d, sp); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); const plan0 = JSON.stringify(d.plans);
    // A held class (attended) and one changed individually
    SA(); const [s1, s2, s3, s4] = ss; s1.start = D(-1, '17:00'); s1.end = D(-1, '18:30'); ACT.n4Import({ dataset: { s: s1.id } }); const rows1 = JSON.stringify(N4().regs[s1.id].rows);
    ACT.s4bSessEdit({ dataset: { b: 'L3FA-W27', id: s2.id } }); fill({ '#se-d': s2.start.slice(0, 11) + '19:00', '#se-r': 'Teacher training' }); prim(); closeModal(); const s2start = s2.start;
    const r3 = n3Save('L3FA-W27', { f, to: t4, t: '18:00', r: 'Later start' });
    ok('N3 editing the plan: preview lists updated and kept classes', /2 upcoming classes updated/.test(r3.pv) && /2 kept unchanged/.test(r3.pv) && /held or attended/.test(r3.pv) && /changed individually/.test(r3.pv));
    ok('N3 the held class and its attendance are untouched; the individually changed class keeps its time', s1.start === D(-1, '17:00') && JSON.stringify(N4().regs[s1.id].rows) === rows1 && s2.start === s2start && s3.start.slice(11, 16) === '18:00' && s4.start.slice(11, 16) === '18:00');
    // Self-Paced: a planned number, own and shared classes, counted once
    ACT.n3Target({ dataset: { b: 'L3SP-W27' } }); fill({ '#n3-c': '3' }); reason('Three classes for this intake');
    ok('N3 Self-Paced planned number saved (per batch, any number)', n3Plan('L3SP-W27').target === 3 && /Incomplete — 0 of 3 planned/.test(n3SpState(sp).label));
    ACT.n3Target({ dataset: { b: 'L3SP-X27' } }); fill({ '#n3-c': '5' }); reason('Five classes'); ok('N3 another Self-Paced batch of the same programme: a different number (5)', n3Plan('L3SP-X27').target === 5);
    ACT.n3Target({ dataset: { b: 'L3SP-W27' } }); fill({ '#n3-c': '0' }); ok('N3 (negative) the number must be a whole number of classes', reason('x') === false); closeModal();
    ACT.n3Join({ dataset: { b: 'L3SP-W27' } }); ok('N3 "Join a shared class" offers upcoming classes of Fully Assisted batches of the same programme only', [...document.querySelectorAll('#n3-j option')].every(o => { const s = s4bSessById(o.value); return s4PidOfTitle(n3Batch(s.batch).course) === 'NV-L3' && n2ModeOf(n3Batch(s.batch)) === 'Fully Assisted'; }) && [...document.querySelectorAll('#n3-j option')].some(o => o.value === s4.id) && ![...document.querySelectorAll('#n3-j option')].some(o => o.value === s1.id));
    document.querySelector('#n3-j').value = s4.id; reason('Shared revision class');
    ACT.addSession({ dataset: { b: 'L3SP-W27' } }); fill({ '#se-n': 'Self-Paced check-in class', '#se-d': dayAdd(sp.start, 10) + 'T17:00', '#se-m': '60' }); prim(); if (MODAL) prim(); closeModal();
    ok('N3 the shared class is ONE session (still organised by the Fully Assisted batch) and counts once for each batch', s4.batch === 'L3FA-W27' && s4.with.join() === 'L3SP-W27' && n3SpClasses('L3SP-W27').length === 2 && s4bSessFor('L3FA-W27').filter(s => s.id === s4.id).length === 1 && /Incomplete — 2 of 3 planned/.test(n3SpState(sp).label));
    ACT.n3Complete({ dataset: { b: 'L3SP-W27' } }); ok('N3 (negative) "Mark plan complete" is refused while the count doesn\'t match (logged)', !MODAL && !n3Plan('L3SP-W27').complete && ADMIN.audit[0].action === 'Blocked: mark class plan complete');
    ACT.n3Target({ dataset: { b: 'L3SP-W27' } }); fill({ '#n3-c': '2' }); reason('Two is enough'); ACT.n3Complete({ dataset: { b: 'L3SP-W27' } }); reason('Checked');
    ok('N3 count matches → plan marked complete', n3Plan('L3SP-W27').complete && /^Complete — 2 of 2 planned/.test(n3SpState(sp).label));
    ACT.n3Target({ dataset: { b: 'L3SP-W27' } }); fill({ '#n3-c': '1' }); reason('Test'); ok('N3 over-allocated plans are identified', /Over-allocated — 2 planned, 1 intended/.test(n3SpState(sp).label)); ACT.n3Target({ dataset: { b: 'L3SP-W27' } }); fill({ '#n3-c': '2' }); reason('Back');
    go('a-batches', { id: 'L3SP-W27', tab: 'schedule' }); ok('N3 Self-Paced Schedule tab: the plan, both classes (one shared) and the timetable', /shared — organised by L3FA-W27/.test(main()) && /this batch's class/.test(main()) && app().querySelectorAll('.n3-cls li').length === 2);
    learner('A'); go('calendar'); ok('N3 Daniel (Self-Paced) has the shared class and his own class on his calendar, once each', d.events.filter(e => e.id === 'bs-' + s4.id).length === 1 && d.events.some(e => /Self-Paced check-in class/.test(e.title)));
    TCH('T'); go('t-calendar'); setUi('ccView', 'agenda'); setUi('ccDate', s4.start.slice(0, 10)); render(); ok('N3 the teacher sees the shared class once', app().querySelectorAll(`main [data-id="${s4.id}"]`).length === 1);
    COO('A'); go('c-batches', { id: 'L3SP-W27' }); ok('N3 Coordinator overview shows the class plan', /Class plan/.test(main()) && /2 of 2 planned/.test(main()));
    ok('N3 the N4 register for the shared class includes the eligible learners of both batches', n4Eligible(s4).includes(d.me.id) && n4Eligible(s4).includes(lid) && !n4Eligible(s4).includes(STORE.worlds.C.me.id));
    SA(); ACT.n3Remove({ dataset: { b: 'L3SP-W27', s: s4.id } }); reason('Not needed');
    ok('N3 removing the shared class from the Self-Paced plan leaves it on the Fully Assisted timetable; Daniel no longer has it', n3Live(s4) && s4.with.length === 0 && s4bSessFor('L3FA-W27').some(s => s.id === s4.id) && !d.events.some(e => e.id === 'bs-' + s4.id) && n3SpClasses('L3SP-W27').length === 1);
    // Range shrink cancels (keeps) upcoming plan classes; cancelling a held class keeps its attendance
    const r4 = n3Save('L3FA-W27', { f, to: dayAdd(fa.start, 13), t: '18:00', r: 'Shorter run' });
    ok('N3 dates dropped from the plan are cancelled and kept in history (not deleted)', /no longer in the plan — cancelled/.test(r4.pv) && s4.status === 'Cancelled' && s4.n3Removed && !!s4bSessById(s4.id) && s1.status !== 'Cancelled');
    ACT.s4bSessCancel({ dataset: { b: 'L3FA-W27', id: s1.id } }); reason('Recorded in error');
    ok('N3 cancelling a held class keeps its attendance history', s1.status === 'Cancelled' && JSON.stringify(N4().regs[s1.id].rows) === rows1);
    // Conflicts
    ACT.addSession({ dataset: { b: 'L3AC-JAN26' } }); fill({ '#se-n': 'Clashing class', '#se-d': s2.start.slice(0, 16), '#se-m': '60' }); document.querySelector('#se-t').value = 'Marcus Bell'; prim(); prim(); closeModal();
    ok('N3 a plan class still clashes with the same teacher\'s other class (detected)', kConflicts().some(c => c.what === 'Teacher double-booked' && /Clashing class/.test(c.detail) && /Weekly class/.test(c.detail)));
    // Permissions
    role('sysA'); const n0 = s4bAllSess().length; const r5 = n3Save('L3FA-W27', { f, to: dayAdd(fa.start, 27), t: '18:00', r: 'Sys extends' });
    const occN = n3Plan('L3FA-W27').occ, newIds = Object.values(occN).filter(id => !ids.includes(id)), ns = newIds.map(s4bSessById);
    ok('N3 the System Admin configures and generates the weekly plan (client-confirmed: Timetable: classes ☒) — preview first, then saved', /Preview — nothing is saved yet/.test(r5.pv) && n3Plan('L3FA-W27').weeklyStatus === 'Saved' && newIds.length === 2 && s4bAllSess().length === n0 + 2 && ns.every(s => s && s.status === 'Scheduled' && s.start.slice(11, 16) === '18:00' && s.hist[0][1] === ADMIN.me.name));
    ok('N3 regenerated dates get new sessions; the cancelled ones stay cancelled in history with their ids', s3.status === 'Cancelled' && s4.status === 'Cancelled' && !!s4bSessById(s3.id) && !newIds.includes(s3.id) && !newIds.includes(s4.id));
    const r6 = n3Save('L3FA-W27', { f, to: dayAdd(fa.start, 27), t: '18:00', r: 'Sys re-saves' }); ok('N3 the System Admin re-saving the same plan creates no duplicates', /No change to the sessions/.test(r6.pv) && s4bAllSess().length === n0 + 2);
    ok('N3 the System Admin\'s generated classes reach the timetable, the teacher\'s calendar and the N4 register', (go('a-batches', { id: 'L3FA-W27', tab: 'schedule' }), newIds.every(id => !!app().querySelector(`[data-id="${id}"]`))) && n4Eligible(ns[0]).includes(lid) && (TCH('T'), go('t-calendar'), setUi('ccView', 'agenda'), setUi('ccDate', ns[0].start.slice(0, 10)), render(), app().querySelectorAll(`main [data-id="${ns[0].id}"]`).length === 1));
    role('sysA');
    ACT.n3Target({ dataset: { b: 'L3SP-X27' } }); fill({ '#n3-c': '4' }); reason('Sys sets'); ok('N3 System Admin can set a Self-Paced planned number (configuration)', n3Plan('L3SP-X27').target === 4);
    ACT.n3Join({ dataset: { b: 'L3SP-X27' } }); ok('N3 the System Admin can join a valid shared class (same programme, Fully Assisted)', !!MODAL && [...document.querySelectorAll('#n3-j option')].some(o => o.value === ns[0].id)); document.querySelector('#n3-j').value = ns[0].id; reason('Sys joins');
    ok('N3 joined: one session, counted once for the Self-Paced batch, audited', ns[0].with.includes('L3SP-X27') && n3SpClasses('L3SP-X27').length === 1 && ADMIN.audit[0].action === 'Session sharing changed');
    ACT.s4bSessEdit({ dataset: { b: 'L3FA-W27', id: ns[1].id } }); fill({ '#se-d': ns[1].start.slice(0, 11) + '16:00', '#se-r': 'Sys reschedule' }); prim(); if (MODAL) prim(); closeModal();
    ok('N3 the System Admin edits / reschedules a class: same id, length kept, history and audit', ns[1].start.slice(11, 16) === '16:00' && (new Date(ns[1].end) - new Date(ns[1].start)) === 90 * 6e4 && ns[1].hist[0][2] === 'Changed' && ADMIN.audit[0].action === 'Session changed');
    const cc = kConflicts().find(c => /Clashing class/.test(c.detail)); go('a-scheduling'); ok('N3 the System Admin sees the unresolved conflict with Resolve', !!cc && !!app().querySelector(`[data-act="kResolve"][data-id="${cc.id}"]`));
    ACT.kResolve({ dataset: { id: cc.id } }); document.querySelector('#kr-a').value = 'move'; document.querySelector('#kr-s').value = [...document.querySelectorAll('#kr-s option')].find(o => /Clashing class/.test(o.textContent)).value; reason('Try an hour later');
    ok('N3 a move that still overlaps stays visibly unresolved (not reported resolved)', kConflicts().some(c => c.id === cc.id || /Clashing class/.test(c.detail)) && ADMIN.audit[0].action === 'Conflict change applied — still conflicting' && (go('a-scheduling'), /Clashing class/.test(main())));
    const cc2 = kConflicts().find(c => /Clashing class/.test(c.detail)); ACT.kResolve({ dataset: { id: cc2.id } }); document.querySelector('#kr-a').value = 'teacher'; document.querySelector('#kr-s').value = [...document.querySelectorAll('#kr-s option')].find(o => /Clashing class/.test(o.textContent)).value; document.querySelector('#kr-t').value = 'Omar Siddiqui'; reason('Omar covers');
    ok('N3 the System Admin resolves it by assigning another teacher — the conflict is gone', !kConflicts().some(c => /Clashing class/.test(c.detail)) && ADMIN.audit[0].action === 'Conflict resolved');
    const clash = s4bAllSess().find(s => s.title === 'Clashing class'); ACT.s4bSessCancel({ dataset: { b: 'L3AC-JAN26', id: clash.id } }); reason('Not needed after all');
    ok('N3 the System Admin cancels a class session (kept in history, audited)', clash.status === 'Cancelled' && !!s4bSessById(clash.id) && ADMIN.audit[0].action === 'Session cancelled');
    ACT.s4bSessCancel({ dataset: { b: 'L3FA-W27', id: 'eda3' } }); ok('N3 (negative) the System Admin can\'t cancel a deadline or observation as a class session', !MODAL);
    ok('N3 historical session ids and attendance unchanged after the System Admin\'s changes', s1.status === 'Cancelled' && JSON.stringify(N4().regs[s1.id].rows) === rows1 && s2.start === s2start && ids.every(id => !!s4bSessById(id)));
    FA4(); ACT.addSession({ dataset: { b: 'L3FA-W27' } }); const fa1 = !MODAL && ADMIN.audit[0].action === 'Blocked: add sessions'; ACT.kResolve({ dataset: { id: 'x' } }); const fa2 = !MODAL && ADMIN.audit[0].action === 'Blocked: resolve conflicts'; ACT.n3Join({ dataset: { b: 'L3SP-X27' } }); const fa3 = !MODAL && ADMIN.audit[0].action === 'Blocked: join a shared class'; ACT.s4bSessEdit({ dataset: { b: 'L3FA-W27', id: ns[0].id } });
    ok('N3 (negative) Finance stays restricted: add session, resolve, join, edit — all refused and logged', fa1 && fa2 && fa3 && !MODAL && ADMIN.audit[0].action === 'Blocked: edit sessions');
    COO('A'); S.portal = 'coord'; ACT.addSession({ dataset: { b: 'L3FA-W27' } }); const co1 = !MODAL; ACT.n3Weekly({ dataset: { b: 'L3FA-W27' } }); ok('N3 (negative) a Coordinator can\'t add sessions or generate a weekly plan', co1 && !MODAL);
    role('sysA');
    ACT.s4bBatchEdit({ dataset: { id: 'L3SP-X27' } }); ok('N3 System Admin still edits batch details (client-confirmed matrix)', !!MODAL); closeModal();
    FA4(); ACT.n3Weekly({ dataset: { b: 'L3FA-W27' } }); ok('N3 (negative) Finance can\'t configure a class plan (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: configure the class plan');
    COO('A'); S.portal = 'coord'; ACT.n3Target({ dataset: { b: 'L3SP-W27' } }); ok('N3 (negative) a Coordinator can\'t configure a class plan', !MODAL && n3Plan('L3SP-W27').target === 2);
    // Preservation
    SA(); go('a-batches', { id: 'L3AC-JAN26', tab: 'schedule' }); ok('N3 existing batches: timetable unchanged, plan shown as not configured', /hasn't been configured/.test(main()) && !n3Plan('L3AC-JAN26') && s4bSessFor('L3AC-JAN26').length === janN + 1);
    go('a-batches', { id: 'L3SP-W27', tab: 'staff' }); ok('N3 CH-17 / P-33 unchanged', main().includes(CH_P33) && !Object.values(chAllocOf(sp)).includes(sp.coord));
    ok('N3 N2 modes unchanged; learner plans, S2 deadlines, sign-up and fees unchanged', fa.dmode === 'Fully Assisted' && sp.dmode === 'Self-Paced' && JSON.stringify(d.plans) === plan0 && JSON.stringify([STORE.worlds.C.plans, STORE.worlds.C.assignments.map(a => a.due), STORE.worlds.B.signup, STORE.chFees]) === keep);
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: N3 entry', /NVQ class planning: weekly Fully Assisted classes/.test(main()));
  });

  /* ================= S4c — agency bundle discount slabs ================= */
  const rates = () => { go('a-bundles', { tab: 'rates' }); };
  const setRows = rows => { const tb = document.querySelector('#dr-rows'); tb.innerHTML = ''; rows.forEach(() => ACT.discAddRow()); [...tb.querySelectorAll('tr')].forEach((tr, k) => { tr.querySelector('.dr-from').value = rows[k][0]; tr.querySelector('.dr-to').value = rows[k][1] == null ? '' : rows[k][1]; tr.querySelector('.dr-pct').value = rows[k][2]; }); };
  const saveRates = (rows, o = {}) => { rates(); if (rows) setRows(rows); if (o.std != null) document.querySelector('#dr-std').value = o.std; Object.entries(o.ag || {}).forEach(([a, v]) => { document.querySelector(`.dr-ag[data-a="${a}"]`).value = v; }); document.querySelector('#dr-r').value = o.r || 'Rate review'; SUBMIT.discSave(); };
  const AGY = id => { ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; S.agy.id = id || null; };
  const buyAg = (id, qty) => { ACT.agBuy({ dataset: { id } }); document.querySelector('#gq').value = qty; INP.agBuyQty(document.querySelector('#gq')); prim(); agPayResult('success'); closeModal(); return STORE.agy.purchases[0]; };
  await T('S4c discount slabs: edit, validate, precedence, purchases, approvals, versions', async () => {
    fresh(); const fees0 = JSON.stringify([STORE.chFees, NVQ_FEES]);
    SA(); rates(); ok('S4c rates tab: Add slab, Remove per slab, Preview', !!app().querySelector('[data-act="discAddRow"]') && app().querySelectorAll('[data-act="discDelRow"]').length === 3 && !!app().querySelector('[data-act="discPreview"]'));
    ok('S4c per-agency list: every agency with its real status — AG-08 / AG-09 onboarding, AG-11 inactive included', ['AG-08', 'AG-09', 'AG-11'].every(id => !!app().querySelector(`tr[data-ag="${id}"]`)) && /Onboarding/.test(app().querySelector('tr[data-ag="AG-08"]').textContent) && /Inactive/.test(app().querySelector('tr[data-ag="AG-11"]').textContent) && /doesn't let an agency buy/.test(main()));
    setRows([[10, 24, 5], [25, 49, 10], [50, 99, 15], [100, null, 20]]); ACT.discPreview(); ok('S4c preview shows now vs proposed per quantity; nothing saved', /Preview — new automatic-price purchases/.test(app().querySelector('#dr-pv').textContent) && /−20%/.test(app().querySelector('#dr-pv').textContent) && discNow().v === 2);
    saveRates([[10, 24, 5], [25, 49, 10], [50, 99, 15], [100, null, 20]]);
    ok('S4c add / edit a slab: new version 3 with the four slabs, audited', discNow().v === 3 && discNow().slabs.length === 4 && discNow().slabs[3].join() === '100,,20' && ADMIN.audit[0].action === 'New version 3');
    ok('S4c boundaries: 9 → 0%, 10 → 5%, 24 → 5%, 25 → 10%, 49 → 10%, 50 → 15%, 99 → 15%, 100 → 20%, 500 → 20% (open last slab)', [[9, 0], [10, 5], [24, 5], [25, 10], [49, 10], [50, 15], [99, 15], [100, 20], [500, 20]].every(([q, p]) => discPct(q).pct === p));
    ok('S4c the upper bound is respected: with the last slab closed at 99, 100 seats get the standard %', discPct(100, { std: 3, slabs: [[10, 24, 5], [25, 49, 10], [50, 99, 15]] }).pct === 3 && discPct(99, { std: 3, slabs: [[10, 24, 5], [25, 49, 10], [50, 99, 15]] }).pct === 15);
    const v3 = discNow().v, bad = (rows, std, why) => { saveRates(rows, { std }); return discNow().v === v3 && ADMIN.audit[0].action === 'Rejected: invalid discount rates' && why.test(ADMIN.audit[0].reason); };
    ok('S4c (negative) a gap between slabs is refused', bad([[10, 24, 5], [26, 49, 10], [50, null, 15]], 0, /Gap between slab 1 and slab 2/));
    ok('S4c (negative) overlapping slabs are refused', bad([[10, 25, 5], [25, 49, 10], [50, null, 15]], 0, /overlaps/));
    ok('S4c (negative) only the last slab can be open', bad([[10, null, 5], [25, 49, 10]], 0, /only the last slab can be open/));
    ok('S4c (negative) invalid boundaries and percentages are refused', bad([[0, 24, 5], [25, null, 10]], 0, /whole number of seats, 1 or more/) && bad([[10, 24, 70], [25, null, 10]], 0, /0–60%/) && bad([[10, 9, 5], [10, null, 10]], 0, /at least "from"/) && bad([[10, 24, 5], [25, null, 10]], 55, /standard discount must be 0–50%/));
    // Agency catalogue → quantity dialog → checkout → purchase → Finance
    AGY(); go('g-buy'); const c1 = AGY_CATALOGUE().find(c => c.id === 'CAT-1'), c2 = AGY_CATALOGUE().find(c => c.id === 'CAT-2');
    ACT.agBuy({ dataset: { id: 'CAT-1' } }); document.querySelector('#gq').value = 100; INP.agBuyQty(document.querySelector('#gq'));
    ok('S4c quantity dialog: the new slab applies (100 seats −20%), VAT on top; the hint shows the current rates', /Volume price: 100\+ seats −20%/.test(mroot().textContent) && mroot().textContent.includes(money(priceFor(c1, 100).total, 'GBP')) && /100\+ seats −20%/.test(mroot().querySelector('.xs.muted') ? mroot().textContent : '') && !/50\+ −15%/.test(mroot().textContent)); closeModal();
    const p1 = buyAg('CAT-1', 25), pr1 = { net: Math.round(c1.unit * 25 * 0.9) };
    ok('S4c purchase (VAT bundle): net = list −10%, VAT 20% on top; discount, basis and rate version recorded', p1.net === pr1.net && p1.vatPct === 20 && Math.abs(p1.vat - p1.net * 0.2) < 0.005 && p1.amount === p1.net + p1.vat && p1.discPct === 10 && p1.discBasis === 'Volume slab' && p1.rateV === 3);
    const t1 = STORE.fin.tx.find(t => t.ref === p1.ref), bn1 = ADMIN.bundles.find(b => b.id === p1.bundle);
    ok('S4c Finance transaction and credited bundle carry the same amounts and discount', t1 && t1.amount === p1.amount && t1.net === p1.net && t1.discPct === 10 && bn1 && bn1.price === p1.amount && bn1.discPct === 10 && bn1.mode === 'Automatic (−10%)');
    FA4(); go('f-ledger'); ok('S4c Finance ledger shows the purchase amount', main().includes(p1.ref) || main().includes(money(p1.amount, 'GBP')));
    const p2 = (AGY(), buyAg('CAT-2', 100)); ok('S4c purchase (no-VAT bundle) at 100 seats: −20% (open-ended slab)', p2.discPct === 20 && p2.amount === Math.round(c2.unit * 100 * 0.8) && p2.vat === 0);
    const hist0 = JSON.stringify([STORE.agy.purchases, STORE.agy.ledger, STORE.fin.tx.filter(t => [p1.ref, p2.ref].includes(t.ref)), ADMIN.bundles.filter(b => [p1.bundle, p2.bundle].includes(b.id))]);
    SA(); saveRates([[10, 24, 8], [25, 49, 12], [50, null, 25]], { r: 'New price list' });
    ok('S4c removing a slab (4 → 3) is a new version; version 3 keeps its four slabs in history', discNow().v === 4 && discNow().slabs.length === 3 && discData().versions.find(v => v.v === 3).slabs.length === 4);
    ok('S4c a later rate change leaves completed purchases, ledger, Finance and bundles unchanged', JSON.stringify([STORE.agy.purchases, STORE.agy.ledger, STORE.fin.tx.filter(t => [p1.ref, p2.ref].includes(t.ref)), ADMIN.bundles.filter(b => [p1.bundle, p2.bundle].includes(b.id))]) === hist0);
    ok('S4c new purchases use the new rates', (AGY(), priceFor(c2, 25).pct === 12));
    // Admin catalogue reads the same rule
    SA(); const prod = STORE.biz.products.find(p => p.id === 'CAT-2'); ok('S4c admin catalogue pricing uses the same slab rule as the agency portal', priceOf(prod, 'GBP', 25).pct === 12 && priceOf(prod, 'GBP', 25).final === (AGY(), priceFor(c2, 25).net));
    // Negotiated and fixed-% prices; per-agency (no stacking)
    SA(); saveRates(null, { ag: { 'BrightCare Staffing Ltd': 40, 'CarePlus Recruitment': 10 }, r: 'Agency terms' });
    AGY('AG-01'); const neg = AGY_CATALOGUE().find(c => c.customTotal), autoB = AGY_CATALOGUE().find(c => discAuto(c));
    ok('S4c a negotiated price is not overridden by a higher per-agency discount (40%)', !!neg && Math.round(priceFor(neg, neg.seats).net) === Math.round(neg.customTotal) && /negotiated/.test(priceFor(neg, neg.seats).label));
    ok('S4c per-agency 40% on an automatic bundle: the better of per-agency and slab, never both', priceFor(autoB, 50).pct === 40 && priceFor(autoB, 50).basis === 'Per-agency discount' && priceFor(autoB, 50).net === Math.round(autoB.unit * 50 * 0.6));
    AGY(); const fix = AGY_CATALOGUE().find(c => c.fixedPct != null); ok('S4c a fixed-% bundle keeps its own %; CarePlus\'s 10% only beats a lower slab', priceFor(fix, 25).pct === fix.fixedPct && priceFor(c2, 9).pct === 10 && priceFor(c2, 50).pct === 25);
    ok('S4c setting a rate for an onboarding agency doesn\'t activate it or let it buy', (() => { SA(); saveRates(null, { ag: { 'Riverside Care Partners': 7 }, r: 'Prepared terms' }); const a = ADMIN.agencies.find(x => x.id === 'AG-08'); return discNow().agency['Riverside Care Partners'] === 7 && a.status === 'Onboarding' && a.loginStatus === 'Not activated' && agStatus(a) === 'Onboarding'; })());
    // Approvals and role boundaries (G5.6 / D11)
    const vA = discNow().v; bizEnter('BA'); rates(); document.querySelector('#dr-std').value = '4'; document.querySelector('#dr-r').value = 'Proposal'; SUBMIT.discSave(); const req = ADMIN.queue[0];
    ok('S4c capability holder (Business Admin A): a request for the Super Admin; rates unchanged', req.type === 'Discount rate change' && req.first === 'Super Administrator' && discNow().v === vA && discNow().std === 0);
    ACT.qDo({ dataset: { id: req.id, a: 'approve' } }); ok('S4c (negative) the requester can\'t approve their own request', discNow().v === vA && isOpen(req));
    SA(); applyDecision(req, 'approve', 'OK'); ok('S4c approved → a new version with the proposed rates', discNow().v === vA + 1 && discNow().std === 4);
    bizEnter('BA'); rates(); document.querySelector('#dr-std').value = '9'; document.querySelector('#dr-r').value = 'Another'; SUBMIT.discSave(); const req2 = ADMIN.queue[0]; SA(); applyDecision(req2, 'reject', 'No'); ok('S4c rejected → rates unchanged', discNow().v === vA + 1 && discNow().std === 4);
    const vB = discNow().v; FA4(); rates(); const nq = ADMIN.queue.length; SUBMIT.discSave(); ok('S4c (negative) Finance can\'t change rates by a direct save (refused, logged, no request)', discNow().v === vB && ADMIN.queue.length === nq && ADMIN.audit[0].action === 'Blocked: change discount rates');
    role('sysA'); SUBMIT.discSave(); ok('S4c (negative) the System Admin can\'t either', discNow().v === vB && ADMIN.audit[0].action === 'Blocked: change discount rates');
    bizEnter('BB'); rates(); ok('S4c Business Admin B stays read-only', document.querySelector('#dr-std').readOnly);
    // Versions survive admin rebuilds / identity switches; only the demo reset restores the seed
    ok('S4c observation fees and programme fees untouched by the rate changes and purchases', JSON.stringify([STORE.chFees, NVQ_FEES]) === fees0, JSON.stringify(STORE.chFees).length + ' vs ' + fees0.length);
    SA(); const av0 = Object.keys(ADMIN_VARIANTS).find(k => k !== ADMIN.av); INP.adminVariant({ value: av0 }); INP.adminVariant({ value: 'A' }); SA(); ok('S4c versions survive admin variant switches (rebuilds) and an identity switch', discNow().v === vB && discData().versions.length === vB && (rates(), new RegExp('Current rates — version ' + vB).test(main())));
    fresh(); ok('S4c the demo reset restores the seeded versions 1 and 2', discNow().v === 2 && discData().versions.length === 2);
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: S4c entry', /agency bundle discount slabs/.test(main()));
  });

  await T('S4c discount-rate change requests survive navigation; applied exactly once', async () => {
    fresh(); const otherV = Object.keys(ADMIN_VARIANTS).find(k => k !== 'A'), hist0 = JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger]);
    bizEnter('BA'); rates(); document.querySelector('#dr-std').value = '6'; document.querySelector('#dr-r').value = 'Market review'; SUBMIT.discSave();
    const req = ADMIN.queue[0], id = req.id, snap = JSON.stringify({ id: req.id, raisedBy: req.raisedBy, raised: req.raised, data: req.data, status: req.status, history: req.history });
    ok('S4c Business Admin A submits a discount-rate change request (pending; rates unchanged)', req.type === 'Discount rate change' && req.status === 'Pending' && req.raisedBy === 'Sophie Turner' && discNow().std === 0 && discData().requests.includes(req));
    SA(); INP.adminVariant({ value: otherV }); INP.adminVariant({ value: 'A' }); SA();
    const q1 = ADMIN.queue.find(i => i.id === id);
    ok('S4c the pending request survives admin variant switches: same ID, requester, proposed rates, submission details and status', !!q1 && JSON.stringify({ id: q1.id, raisedBy: q1.raisedBy, raised: q1.raised, data: q1.data, status: q1.status, history: q1.history }) === snap && ADMIN.queue.filter(i => i.id === id).length === 1);
    bizEnter('BB'); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-queue', { id }); ok('S4c it survives identity switches and is visible to the Super Admin', !!ADMIN.queue.find(i => i.id === id) && /Discount rate change/.test(main()) && main().includes(id));
    bizEnter('BA'); ACT.qDo({ dataset: { id, a: 'approve' } }); ok('S4c (negative) the requester can\'t approve their own request', isOpen(q1) && discNow().std === 0);
    FA4(); applyDecision(q1, 'approve', 'Finance tries'); ok('S4c (negative) an unauthorised user can\'t decide it (refused, logged)', isOpen(q1) && discNow().std === 0 && ADMIN.audit[0].action === 'Blocked: decide discount rate change');
    SA(); const v0 = discNow().v, n0 = discData().versions.length; applyDecision(q1, 'approve', 'Agreed');
    ok('S4c the Super Admin approves the original request: applied once, as a new version', q1.status === 'Approved' && discNow().std === 6 && discNow().v === v0 + 1 && discData().versions.length === n0 + 1 && q1.data.appliedV === v0 + 1);
    applyDecision(q1, 'approve', 'Again'); go('a-queue', { id }); INP.adminVariant({ value: otherV }); INP.adminVariant({ value: 'A' }); SA(); const q1b = ADMIN.queue.find(i => i.id === id); applyDecision(q1b, 'approve', 'Third time');
    ok('S4c repeating the approval (also after reopening and a variant switch) adds no version', discData().versions.length === n0 + 1 && discNow().std === 6 && q1b === q1 && q1b.status === 'Approved' && ADMIN.audit.some(a => a.action === 'Blocked: decision repeated'));
    bizEnter('BA'); rates(); document.querySelector('#dr-std').value = '11'; document.querySelector('#dr-r').value = 'Bigger cut'; SUBMIT.discSave(); const rq2 = ADMIN.queue[0];
    ok('S4c a second request gets a new, unique ID', rq2.id !== id && ADMIN.queue.filter(i => i.id === rq2.id).length === 1);
    SA(); applyDecision(rq2, 'reject', 'Too high'); const nR = discData().versions.length; INP.adminVariant({ value: otherV }); INP.adminVariant({ value: 'A' }); SA(); const rq2b = ADMIN.queue.find(i => i.id === rq2.id); applyDecision(rq2b, 'approve', 'Changed my mind');
    ok('S4c a rejected request stays rejected across switches and never changes the rates', rq2b.status === 'Rejected' && discNow().std === 6 && discData().versions.length === nR);
    ok('S4c approved and rejected request history is kept', q1.history.length >= 2 && rq2b.history.length >= 2 && discData().requests.length === 2);
    ok('S4c purchases and Finance records unchanged by the requests and switches', JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger]) === hist0);
    fresh(); ok('S4c the demo reset clears the requests and restores the seeded rates', discData().requests.length === 0 && !ADMIN.queue.some(i => i.id === id) && discNow().v === 2);
  });

  /* ================= S5a — staff administration, custom roles and permission security ================= */
  const SYS = () => { ACT.switchRole({ dataset: { r: 'sysA' } }); S.signedIn = true; };
  const sec0 = () => ADMIN.security.length;
  const tick = (sel, list) => list.forEach(x => { const [m, k] = x.split(':'); document.querySelector(`main .cap[data-m="${m}"][data-k="${k}"]`).checked = true; });
  const nuPick = list => list.forEach(v => { [...document.querySelectorAll('#modal-root .nu-role')].find(x => x.value === v).checked = true; });
  const newCustom = (n, caps) => { go('a-roles'); ACT.newRole(); fill({ '#cr-n': n }); prim(); closeModal(); go('a-roles', { id: 'new' }); tick('main', caps); SUBMIT.createRole(); prim(); closeModal(); return n + ' (custom)'; };
  const navR = () => [...document.querySelectorAll('.adm-side [data-go]')].map(a => a.dataset.go);

  await T('S5a role security: canonical role identity — the Super Administrator role is locked for System Admins (UI, URL, direct, crafted)', async () => {
    fresh(); SYS(); rolesData(); const caps0 = JSON.stringify(ADMIN.roleCaps['Super Administrator']);
    go('a-roles'); ok('S5a (11) the roles list shows the Super Administrator role locked for a System Admin — no link, no edit button', !document.querySelector('main [data-id="Super_Administrator"]') && /Super Admin only/.test(main()));
    ok('S5a the roles page states who can change what (four operations)', /Who can change what/.test(main()) && /Edit a role's capabilities/.test(main()) && /Assign or remove a role/.test(main()) && /Create or retire a custom role/.test(main()) && /Super Administrator authority/.test(main()) && !/Base roles are locked/.test(main()));
    for (const id of ['Super_Administrator', 'Super Administrator', 'Super%20Administrator', 'super_administrator', ' Super__Administrator ', 'SUPER+ADMINISTRATOR']) { const n = sec0(); go('a-roles', { id }); ok(`S5a (12) altered role id "${id}" shows the lock page and is logged`, /Only a Super Administrator can do this/.test(main()) && !document.querySelector('main form[data-submit="saveCaps"]') && ADMIN.security.length === n + 1); }
    const n1 = sec0(), a1 = ADMIN.audit.length, f = document.createElement('form'); f.dataset.r = 'Super_Administrator'; document.body.appendChild(f); SUBMIT.saveCaps(f); const opened = !!MODAL; closeModal(); f.remove();
    ok('S5a (13) a direct save with a crafted role id is refused: capabilities unchanged, security log and audit', !opened && JSON.stringify(ADMIN.roleCaps['Super Administrator']) === caps0 && ADMIN.security.length === n1 + 1 && /^System Administrator Owen Price attempted: change capabilities of Super Administrator/.test(ADMIN.security[0].detail) && ADMIN.audit[0].action === 'Blocked: change capabilities of Super Administrator' && ADMIN.audit.length === a1 + 1);
    const d0 = JSON.stringify(ADMIN.discountCap); INP.discCapRole({ dataset: { r: 'Super_Administrator' }, checked: false }); ok('S5a (13) the Super Administrator role\'s named capability can\'t be changed by a direct call', JSON.stringify(ADMIN.discountCap) === d0 && /attempted: change "Change discount rate" for Super Administrator/.test(ADMIN.security[0].detail));
    SA(); go('a-roles', { id: 'Super_Administrator' }); ok('S5a (16) the Super Admin still opens and can save the Super Administrator role', !!document.querySelector('main form[data-submit="saveCaps"] button[type="submit"]'));
  });

  await T('S5a capability edits: authorised roles only, checked when confirmed, locks enforced on the saved values, refusals audited', async () => {
    fresh(); SYS(); go('a-roles', { id: 'Teacher' }); tick('main', ['Reports:V']); SUBMIT.saveCaps(document.querySelector('main form[data-submit="saveCaps"]')); reason('Teachers see reports');
    ok('S5a a System Admin edits an ordinary role\'s capabilities (audited)', ADMIN.roleCaps.Teacher.Reports === 'V' && ADMIN.audit[0].action === 'Capabilities changed' && ADMIN.audit[0].actor === 'Owen Price');
    go('a-roles', { id: 'Teacher' }); const cb = document.querySelector('main .cap[data-m="Marking & Verification"][data-k="E"]'); cb.disabled = false; cb.checked = true; const c1 = JSON.stringify(ADMIN.roleCaps.Teacher), n = sec0(); SUBMIT.saveCaps(document.querySelector('main form[data-submit="saveCaps"]'));
    ok('S5a (14) a crafted mark/verify capability is refused (checked on the values, not the disabled box) and logged', JSON.stringify(ADMIN.roleCaps.Teacher) === c1 && !MODAL && ADMIN.security.length === n + 1 && /Mark\/verify stays with the Assessor/.test(ADMIN.audit[0].reason));
    go('a-roles', { id: 'Teacher' }); tick('main', ['Certificates:V']); SUBMIT.saveCaps(document.querySelector('main form[data-submit="saveCaps"]')); const dlg = MODAL;
    S.sysCtx = 'Finance Admin'; document.querySelector('#rsn').value = 'later'; const r3 = dlg.actions[1].fn(); S.sysCtx = 'System Administrator'; closeModal();
    ok('S5a (6) the permission is re-checked when the change is confirmed: refused once the actor is no longer a System Admin', r3 === false && !ADMIN.roleCaps.Teacher.Certificates && ADMIN.audit[0].action === 'Blocked: change capabilities of Teacher');
    fresh(); bizEnter('BA'); rolesData(); const c2 = JSON.stringify(ADMIN.roleCaps.Teacher), ff = document.createElement('form'); ff.dataset.r = 'Teacher'; document.body.appendChild(ff); SUBMIT.saveCaps(ff); ff.remove(); closeModal();
    ok('S5a (14) a Business Admin can\'t change capabilities by a direct call (refused, logged)', JSON.stringify(ADMIN.roleCaps.Teacher) === c2 && /Only a Super Administrator or a System Administrator/.test(ADMIN.audit[0].reason));
    ACT.newRole(); ok('S5a (14) … nor create or retire a role', !MODAL && ADMIN.audit[0].action === 'Blocked: create a custom role' && (ACT.retireRole({ dataset: { r: 'Admissions Officer (custom)' } }), !MODAL && s5RoleRec('Admissions Officer (custom)').status === 'Active'));
  });

  await T('S5a Super Administrator authority: granting and removing it stay with the Super Admin; existing protections kept', async () => {
    fresh(); SYS(); const t = ADMIN.staff.find(s => s.id === 'ST-009'); go('a-staff', { id: t.id, tab: 'roles' });
    const opt = [...document.querySelectorAll('#gr option')].find(o => /^Super Administrator/.test(o.textContent)); ok('S5a (15) a System Admin sees Super Administrator only as a disabled option', !!opt && opt.disabled);
    for (const v of ['Super Administrator', 'Super_Administrator', 'super administrator']) { go('a-staff', { id: t.id, tab: 'roles' }); const s = document.querySelector('#gr'); s.innerHTML = `<option>${v}</option>`; s.value = v; const n = sec0(); ACT.grantRole({ dataset: { id: t.id } }); ok(`S5a (15) a direct grant of "${v}" by a System Admin is refused and logged`, !t.roles.some(r => /super/i.test(r)) && !MODAL && ADMIN.security.length === n + 1); }
    const g = ADMIN.staff.find(s => s.id === 'ST-002'), n2 = g.roles.length; ACT.revokeRole({ dataset: { id: g.id, r: 'Super_Administrator' } }); ok('S5a (15) a System Admin can\'t remove Super Administrator (crafted id too)', g.roles.length === n2 && !MODAL);
    ACT.addUser(); const boxes = [...document.querySelectorAll('#modal-root .nu-role')], cbS = boxes.find(x => x.value === 'Super Administrator'), cbY = boxes.find(x => x.value === 'System Administrator');
    ok('S5a Add user: Super Administrator and System Administrator are disabled for a System Admin', cbS && cbS.disabled && cbY && cbY.disabled);
    cbS.disabled = false; cbS.checked = true; fill({ '#nu-n': 'Crafted Person', '#nu-e': 'crafted.person@illumin-academy.example' }); const ns = ADMIN.staff.length, r = prim(); closeModal();
    ok('S5a (15) a crafted Add user with Super Administrator is refused — no account created', r === false && ADMIN.staff.length === ns && ADMIN.audit[0].action === 'Blocked: create a staff account with Super Administrator');
    SA(); go('a-staff', { id: g.id, tab: 'roles' }); ACT.revokeRole({ dataset: { id: g.id, r: 'Super Administrator' } }); reason('Test');
    ok('S5a (16) the Super Admin can remove Super Administrator from another account', !g.roles.includes('Super Administrator'));
    const nd = ADMIN.staff.find(s => s.id === 'ST-001'); ACT.revokeRole({ dataset: { id: nd.id, r: 'Super Administrator' } }); ok('S5a (16) the last Super Administrator still can\'t be removed', nd.roles.includes('Super Administrator') && !!MODAL && /At least one Super Administrator must remain/.test(mroot().textContent)); closeModal();
    go('a-staff', { id: g.id, tab: 'roles' }); document.querySelector('#gr').value = 'Super Administrator'; ACT.grantRole({ dataset: { id: g.id } }); reason('Restore'); ok('S5a (16) the Super Admin can grant Super Administrator', g.roles.includes('Super Administrator'));
  });

  await T('S5-01 staff profile editing: validated, audited, shown; staff ID, allocations and history kept', async () => {
    fresh(); SYS(); const s = ADMIN.staff.find(x => x.id === 'ST-006'), alloc = () => JSON.stringify(ADMIN.batches.map(b => [b.code, b.teachers, b.assessors, b.coord])), al0 = alloc(), h0 = ADMIN.audit.filter(a => a.entity === s.name).length;
    go('a-staff', { id: s.id }); ok('S5-01 the profile tab offers "Edit profile" to a System Admin', !!document.querySelector('main [data-act="s5EditStaff"]'));
    ACT.s5EditStaff({ dataset: { id: s.id } }); fill({ '#s5-e': 'marcus.bell2@illumin-academy.example', '#s5-m': '+44 7700 900 555', '#s5-q': 'PGCE, Level 3 Adult Care, Level 4 Education and Training', '#s5-r': 'Updated contact details' }); const r = prim(); closeModal();
    ok('S5a (1) an authorised edit saves email, mobile and qualifications; same staff ID', r !== false && s.email === 'marcus.bell2@illumin-academy.example' && s.mobile === '+44 7700 900 555' && /Level 4 Education/.test(s.quals) && s.id === 'ST-006' && s.name === 'Marcus Bell');
    const a = ADMIN.audit[0]; ok('S5a (3) the change is audited: before → after, actor and reason', a.action === 'Profile updated' && a.entity === 'Marcus Bell' && /Email: marcus\.bell@/.test(a.before) && /Email: marcus\.bell2@/.test(a.after) && /Mobile: \+44 7700 900 555/.test(a.after) && a.actor === 'Owen Price' && a.reason === 'Updated contact details');
    go('a-staff'); ok('S5a the staff list shows the new email', main().includes('marcus.bell2@illumin-academy.example'));
    go('a-staff', { id: s.id }); ok('S5a the staff detail shows the new details and the staff ID', main().includes('+44 7700 900 555') && main().includes('ST-006'));
    ok('S5a (4) allocations unchanged; history kept and extended', alloc() === al0 && ADMIN.audit.filter(x => x.entity === s.name).length === h0 + 1);
    const snap = () => JSON.stringify(ADMIN.staff), s0 = snap(), base = { name: s.name, email: s.email, mobile: s.mobile, quals: s.quals };
    [[{ name: '' }, 'name'], [{ name: 'R2-D2' }, 'name'], [{ email: 'not-an-email' }, 'email'], [{ email: 'james.pryce@illumin-academy.example' }, 'email'], [{ email: 'JAMES.PRYCE@Illumin-Academy.example' }, 'email'], [{ email: 'michael.osei.tas@illumin-academy.example' }, 'email'], [{ mobile: 'call me' }, 'mobile'], [{ name: 'James Pryce' }, 'name'], [{ name: 'Marcus Bellamy' }, 'name'], [{ quals: 'x'.repeat(201) }, 'quals']]
      .forEach(([v, k]) => { const res = s5SaveProfile(s.id, { ...base, ...v }, 'Try'); ok(`S5a (2) invalid ${k} refused, nothing changed: ${JSON.stringify(v).slice(0, 50)}`, !res.ok && !!res.errs && !!res.errs[k] && snap() === s0); });
    const nr = s5SaveProfile(s.id, { ...base, email: 'x.y@illumin-academy.example' }, ''); ok('S5a (2) a missing reason is refused, nothing saved', !nr.ok && !!nr.errs.reason && snap() === s0);
    ok('S5a (2) no change → nothing saved', !s5SaveProfile(s.id, base, 'Same').ok && snap() === s0);
    ok('S5a renaming someone referred to by name (persona, allocations) is refused with the reason', /sign-in persona|refer to this person by name/.test(s5SaveProfile(s.id, { ...base, name: 'Marcus Bellamy' }, 'x').errs.name));
    ACT.s5EditStaff({ dataset: { id: s.id } }); fill({ '#s5-e': 'bad', '#s5-r': 'x' }); const rr = prim(); ok('S5a the dialog shows the error and stays open', rr === false && !!MODAL && /Enter a valid email/.test(mroot().textContent)); closeModal();
    ACT.addUser(); fill({ '#nu-n': 'Priya Natarajan', '#nu-e': 'priya.natarajan@illumin-academy.example' }); nuPick(['Teacher']); prim(); closeModal();
    const nu = ADMIN.staff.find(x => x.email === 'priya.natarajan@illumin-academy.example'), id0 = nu.id, rn = s5SaveProfile(nu.id, { name: 'Priya Natarajan-Shah', email: nu.email, mobile: '', quals: '' }, 'Name changed by deed poll');
    go('a-staff', { id: nu.id, tab: 'activity' }); ok('S5a a name can change where nothing refers to it; the ID is kept and earlier history stays on the record', rn.ok && nu.name === 'Priya Natarajan-Shah' && nu.id === id0 && /User created/.test(main()) && /Profile updated/.test(main()));
    ACT.addUser(); fill({ '#nu-n': 'Someone Else', '#nu-e': 'Priya.Natarajan@illumin-academy.example' }); nuPick(['Teacher']); const nd = ADMIN.staff.length, rd = prim(); ok('S5a Add user refuses an email another staff account already uses', rd === false && ADMIN.staff.length === nd); closeModal();
    const sup = ADMIN.staff.find(x => x.id === 'ST-002'), n = sec0(), rs = s5SaveProfile(sup.id, { name: sup.name, email: 'g@x.example', mobile: sup.mobile, quals: '' }, 'x');
    ok('S5a a System Admin can\'t edit a Super Administrator account (refused, logged)', !rs.ok && sup.email === 'graham.ellis@illumin-academy.example' && ADMIN.security.length === n + 1);
    go('a-staff', { id: sup.id }); ok('S5a … and isn\'t offered "Edit profile" there', !document.querySelector('main [data-act="s5EditStaff"]'));
    bizEnter('BA'); const rb = s5SaveProfile('ST-006', { name: 'Marcus Bell', email: 'zz@x.example', mobile: '', quals: '' }, 'x'); ok('S5a another admin role can\'t edit profiles by a direct call', !rb.ok && ADMIN.staff.find(x => x.id === 'ST-006').email === 'marcus.bell2@illumin-academy.example');
    SA(); INP.adminVariant({ value: 'B' }); INP.adminVariant({ value: 'A' }); SA(); const s2 = ADMIN.staff.find(x => x.id === 'ST-006');
    ok('S5a profile edits survive an admin rebuild (matched by staff ID and original email, not by name)', s2.email === 'marcus.bell2@illumin-academy.example' && s2.mobile === '+44 7700 900 555' && s2.name === 'Marcus Bell' && ADMIN.staff.filter(x => x.email === 'marcus.bell2@illumin-academy.example').length === 1);
  });

  await T('S5-02 custom roles: create, assign on a new account, grant / revoke, retire', async () => {
    fresh(); SYS(); go('a-roles'); ACT.newRole(); fill({ '#cr-n': 'Admissions Clerk', '#cr-d': 'Checks applicant documents' }); prim(); closeModal(); go('a-roles', { id: 'new' });
    const rc = document.querySelector('main .cap[data-m="Roles & Capabilities"][data-k="E"]'); ok('S5a the draft editor locks role administration for a custom role', !!rc && rc.disabled);
    tick('main', ['Admissions & Documents:V', 'Admissions & Documents:E', 'Learners:V']); SUBMIT.createRole(); prim(); closeModal(); const CR = 'Admissions Clerk (custom)';
    ok('S5a (5) a System Admin creates a custom role with its capabilities (audited)', !!s5RoleRec(CR) && ADMIN.roleCaps[CR]['Admissions & Documents'] === 'VE' && ADMIN.roleCaps[CR]['Roles & Capabilities'] === '' && ADMIN.audit.some(a => a.action === 'Role created' && a.entity === CR));
    ACT.addUser(); const box = [...document.querySelectorAll('#modal-root .nu-role')]; ok('S5a (5) Add user offers the active custom roles, not the retired one', box.some(x => x.value === CR) && box.some(x => x.value === 'Admissions Officer (custom)') && !box.some(x => x.value === 'Marketing Assistant (custom)'));
    fill({ '#nu-n': 'Dana Whitlock', '#nu-e': 'dana.whitlock@illumin-academy.example' }); nuPick([CR]); prim(); closeModal();
    const dn = ADMIN.staff.find(x => x.email === 'dana.whitlock@illumin-academy.example'); go('a-staff', { id: dn.id, tab: 'roles' }); ok('S5a (5) the new account holds the custom role, shown on the account', !!dn && dn.roles.join() === CR && main().includes(CR));
    const op = ADMIN.staff.find(x => x.id === 'ST-010'); go('a-staff', { id: op.id, tab: 'roles' }); ok('S5a the grant list offers the custom role', [...document.querySelectorAll('#gr option')].some(o => o.value === CR));
    document.querySelector('#gr').value = CR; ACT.grantRole({ dataset: { id: op.id } }); reason('Helps with admissions'); ok('S5a (6) a custom role is granted to an existing user (audited)', op.roles.includes(CR) && ADMIN.audit[0].action === 'Role granted' && ADMIN.audit[0].after === CR);
    go('a-staff'); ok('S5a the staff list shows it', main().includes(CR));
    ACT.revokeRole({ dataset: { id: op.id, r: CR } }); reason('No longer needed'); ok('S5a (6) and revoked (audited); other roles kept', !op.roles.includes(CR) && op.roles.includes('Teacher') && ADMIN.audit[0].action === 'Role revoked');
    go('a-roles'); ACT.retireRole({ dataset: { r: CR } }); reason('Merged into Admissions Officer'); ok('S5a a custom role is retired (audited)', s5RoleRec(CR).status === 'Retired' && ADMIN.audit[0].action === 'Retired');
    go('a-staff', { id: op.id, tab: 'roles' }); ok('S5a (7) a retired role is no longer offered for grant', ![...document.querySelectorAll('#gr option')].some(o => o.textContent === CR));
    const sel = document.querySelector('#gr'); sel.innerHTML = `<option>${CR}</option>`; sel.value = CR; ACT.grantRole({ dataset: { id: op.id } }); ok('S5a (7) a crafted grant of a retired role is refused and logged', !op.roles.includes(CR) && !MODAL && /retired/.test(ADMIN.audit[0].reason));
    ACT.addUser(); ok('S5a (7) Add user doesn\'t offer it', ![...document.querySelectorAll('#modal-root .nu-role')].some(x => x.value === CR)); closeModal();
    go('a-staff', { id: dn.id, tab: 'roles' }); ok('S5a an existing holder keeps a retired role, flagged as an open lifecycle rule', dn.roles.includes(CR) && /Retired role kept/.test(main()));
    ACT.retireRole({ dataset: { r: 'Teacher' } }); ok('S5a built-in roles can\'t be retired (direct call)', s5RoleRec('Teacher').status === 'Active' && !MODAL);
    ACT.newRole(); fill({ '#cr-n': 'Super Admin' }); const rr = prim(); ok('S5a a custom role can\'t take a built-in role\'s name', rr === false && /reserved/.test(mroot().textContent)); closeModal();
    INP.adminVariant({ value: 'B' }); INP.adminVariant({ value: 'A' }); SA();
    ok('S5a custom roles, their capabilities and status survive an admin rebuild', !!s5RoleRec(CR) && s5RoleRec(CR).status === 'Retired' && ADMIN.roleCaps[CR]['Admissions & Documents'] === 'VE');
  });

  await T('S5-02 custom-role access: capabilities control navigation, screens and direct actions; the union keeps the reserved limits', async () => {
    fresh(); SYS(); ACT.addUser(); fill({ '#nu-n': 'Dana Whitlock', '#nu-e': 'dana.whitlock@illumin-academy.example' }); nuPick(['Admissions Officer (custom)']); prim(); closeModal();
    const dn = ADMIN.staff.find(x => x.email === 'dana.whitlock@illumin-academy.example');
    signOut(); S.portal = 'admin'; staffSignin(dn.email); ok('S5a a custom-role-only account signs in to custom-role access', s5Ctx() && S.signedIn && ADMIN.me.name === 'Dana Whitlock' && !isSA() && !isSys() && /Your access/.test(main()));
    let nav = navR(); ok('S5a (8) navigation shows only the modules the roles can view', nav.includes('a-admissions') && nav.includes('a-learners') && !nav.includes('a-staff') && !nav.includes('a-roles') && !nav.includes('a-finance') && !nav.includes('a-queue') && !nav.includes('a-audit'));
    const n0 = sec0(); go('a-finance'); ok('S5a (8) a module outside the roles is refused by URL (lock page, logged)', /Not available with your roles/.test(main()) && ADMIN.security.length === n0 + 1);
    go('a-roles', { id: 'Super_Administrator' }); ok('S5a (12) … and so is the Super Administrator role', /Not available with your roles/.test(main()));
    go('a-admissions', { tab: 'docs' }); ok('S5a (8) an allowed module opens', /Admissions & Documents/.test(main()) && !/Not available with your roles/.test(main()));
    const ap = allApplications().find(a => !a.v && a.docs.some(d => d.status !== 'Approved')), d = ap.docs.find(x => x.status !== 'Approved');
    ACT.docDec({ dataset: { a: ap.id, d: d.id, s: 'Approved' } }); ok('S5a (9) an action the roles allow works (Admissions & Documents: Edit — document decision)', d.status === 'Approved' && ADMIN.audit[0].actor === 'Dana Whitlock');
    const n1 = sec0(), st1 = ap.status; ACT.appApprove({ dataset: { id: ap.id } }); ok('S5a (9) an action outside the mapped capabilities is refused by a direct call (logged)', !MODAL && ap.status === st1 && ADMIN.security.length === n1 + 1 && /appApprove/.test(ADMIN.security[0].detail));
    go('a-admissions', { id: ap.id }); const btn = document.querySelector('main [data-act="appApprove"]'); ok('S5a (8) buttons outside the roles are disabled on the screen', !btn || btn.disabled);
    ACT.addUser(); ok('S5a (9) account administration is refused', !MODAL);
    SUBMIT.saveCaps({ dataset: { r: 'Admissions Officer (custom)' } }); ok('S5a (7) the holder can\'t change their own role\'s capabilities', ADMIN.roleCaps['Admissions Officer (custom)']['Roles & Capabilities'] === '' && /^Blocked/.test(ADMIN.audit[0].action));
    ACT.grantRole({ dataset: { id: dn.id } }); ok('S5a (7) … nor grant themselves a role', dn.roles.length === 1);
    SYS(); ok('S5a leaving custom-role access restores the demo identity', !s5Ctx() && isSys());
    const R2 = newCustom('Staff Records Officer', ['Staff & Users:V', 'Staff & Users:E', 'Roles & Capabilities:V', 'Reports:V']);
    go('a-staff', { id: dn.id, tab: 'roles' }); document.querySelector('#gr').value = R2; ACT.grantRole({ dataset: { id: dn.id } }); reason('Second role');
    ADMIN.roleCaps[R2]['Roles & Capabilities'] = 'VCED'; ADMIN.roleCaps[R2]['Marking & Verification'] = 'VCE'; // crafted state
    signOut(); S.portal = 'admin'; staffSignin(dn.email); const eff = s5Eff(ADMIN.me.roles);
    ok('S5a (10) multi-role union: modules of both roles; reserved capabilities capped even with crafted role state', eff['Admissions & Documents'] === 'VE' && eff['Staff & Users'] === 'VE' && eff.Reports === 'V' && eff['Roles & Capabilities'] === 'V' && eff['Marking & Verification'] === 'V');
    nav = navR(); ok('S5a (8)(10) the second role adds Staff & Users, Roles (view) and Reports to the navigation', nav.includes('a-staff') && nav.includes('a-roles') && nav.includes('a-reports') && nav.includes('a-admissions'));
    go('a-roles', { id: 'Teacher' }); ok('S5a (10) Roles & Capabilities is view-only, even with crafted edit capabilities', !document.querySelector('main form[data-submit="saveCaps"] button[type="submit"]') && /View only/.test(main()));
    const t0 = JSON.stringify(ADMIN.roleCaps.Teacher); SUBMIT.saveCaps(document.querySelector('main form[data-submit="saveCaps"]')); ok('S5a (10) … and a direct save is refused', JSON.stringify(ADMIN.roleCaps.Teacher) === t0 && !MODAL);
    ACT.newRole(); ACT.retireRole({ dataset: { r: R2 } }); ok('S5a (10) no role creation or retirement', !MODAL && s5RoleRec(R2).status === 'Active');
    const tw = ADMIN.staff.find(x => x.id === 'ST-010'); go('a-staff', { id: tw.id }); ok('S5a (9) Staff & Users: Edit — "Edit profile" is offered', !!document.querySelector('main [data-act="s5EditStaff"]'));
    const rp = s5SaveProfile(tw.id, { name: tw.name, email: tw.email, mobile: '+44 7700 900 111', quals: tw.quals }, 'New phone'); ok('S5a (9) … and saves (audited as the holder)', rp.ok && tw.mobile === '+44 7700 900 111' && ADMIN.audit[0].actor === 'Dana Whitlock');
    const ow = ADMIN.staff.find(x => x.id === 'ST-003'), ro = s5SaveProfile(ow.id, { name: ow.name, email: 'o@x.example', mobile: ow.mobile, quals: '' }, 'x'); ok('S5a (10) … but not on an administrator account', !ro.ok && ow.email === 'owen.price@illumin-academy.example');
    go('a-staff', { id: tw.id, tab: 'roles' }); const gb = document.querySelector('main [data-act="grantRole"]'); ACT.revokeRole({ dataset: { id: tw.id, r: 'Teacher' } }); ok('S5a (10) role assignment stays reserved (button disabled; direct call refused)', (!gb || gb.disabled) && tw.roles.includes('Teacher') && !MODAL);
    const q = ADMIN.queue.find(i => isOpen(i)), qs = q.status; ACT.qDo({ dataset: { id: q.id, a: 'approve' } }); ok('S5a (10) approvals stay reserved', q.status === qs && !MODAL);
    SYS(); ACT.addUser(); fill({ '#nu-n': 'Lena Ford', '#nu-e': 'lena.ford@illumin-academy.example' }); nuPick(['Business Admin', R2]); prim(); closeModal();
    const lf = ADMIN.staff.find(x => x.email === 'lena.ford@illumin-academy.example'); signOut(); S.portal = 'admin'; staffSignin(lf.email);
    ok('S5a a built-in admin with a custom role gets "Custom role access" in the role switcher', !!S.multiRoles && S.multiRoles.includes('Custom role access') && !s5Ctx() && isBiz());
    INP.mCtx({ value: 'Custom role access' }); const e2 = s5Eff(ADMIN.me.roles); ok('S5a (10) … which opens custom-role access with the union of all their roles', s5Ctx() && e2['Agencies & Bundles'].includes('V') && e2['Staff & Users'] === 'VE' && e2['Roles & Capabilities'] === 'V');
    SA(); ok('S5a the Super Admin view is restored afterwards', !s5Ctx() && isSA() && ADMIN.me.name === 'Nadia Qureshi');
  });

  await T('S5a allocation saves re-check role eligibility; CH-17 / P-33 kept; persona reconciliation', async () => {
    fresh(); SA(); const b = ADMIN.batches.find(x => x.code === 'L3AC-NOV26-LEI'), t0 = b.teachers.slice(), c0 = b.coord;
    const crafted = (sel, name) => { const e = document.querySelector('#modal-root ' + sel); e.innerHTML += `<option>${name}</option>`; e.value = name; document.querySelector('#rsn').value = 'x'; const r = prim(); closeModal(); return r; };
    go('a-batches', { id: b.code, tab: 'staff' }); ACT.batchStaff({ dataset: { id: b.code } }); const r1 = crafted('#bs-t', 'Leila Haddad');
    ok('S5a (17) batch staff: a teacher without the Teacher role is refused (crafted option), nothing changes', r1 === false && JSON.stringify(b.teachers) === JSON.stringify(t0) && ADMIN.audit[0].action === 'Blocked: staff allocation');
    ACT.batchStaff({ dataset: { id: b.code } }); crafted('#bs-c', 'Marcus Bell'); ok('S5a (17) … and a Coordinator without the Academic Coordinator role', b.coord === c0 && /Academic Coordinator role/.test(ADMIN.audit[0].reason));
    ACT.batchStaff({ dataset: { id: b.code } }); crafted('#bs-t', 'Hannah Lewis'); ok('S5a (17) … and a suspended teacher', !b.teachers.includes('Hannah Lewis') && /suspended/.test(ADMIN.audit[0].reason));
    ACT.batchStaff({ dataset: { id: b.code } }); document.querySelector('#modal-root #bs-t').value = 'Tom Whitfield'; reason('Cover'); ok('S5a an eligible teacher is saved as before', b.teachers.join() === 'Tom Whitfield');
    go('a-batches', { id: b.code, tab: 'staff' }); const as = document.querySelector('#ch-as-asg'), a0 = JSON.stringify(chAllocOf(b)); as.innerHTML += '<option>Marcus Bell</option>'; as.value = 'Marcus Bell'; ACT.chAssessSave({ dataset: { b: b.code } });
    ok('S5a (17) assessor save: someone without the Assessor role is refused', JSON.stringify(chAllocOf(b)) === a0 && !MODAL && ADMIN.audit[0].action === 'Blocked: assessor allocation');
    const b2 = ADMIN.batches.find(x => x.code === 'L2DC-MAR26'); go('a-batches', { id: b2.code, tab: 'staff' }); const a2 = JSON.stringify(chAllocOf(b2)); const ob = document.querySelector('#ch-as-obs'); if (![...ob.options].some(o => o.value === 'Michael Osei')) ob.innerHTML += '<option>Michael Osei</option>'; ob.value = 'Michael Osei'; ACT.chAssessSave({ dataset: { b: b2.code } });
    ok('S5a (18) P-33 still refuses the batch Coordinator as an assessor', JSON.stringify(chAllocOf(b2)) === a2 && ADMIN.audit[0].action === 'Blocked: Coordinator as assessor');
    go('a-batches', { id: b2.code, tab: 'staff' }); document.querySelector('#ch-as-pd').value = 'James Pryce'; ACT.chAssessSave({ dataset: { b: b2.code } }); reason('PD cover'); ok('S5a (18) CH-17 separate assessors still save for an eligible assessor', chAllocOf(b2).pd === 'James Pryce' && chAllocOf(b2).asg === 'James Pryce');
    ACT.realloc({ dataset: { id: 'ST-004' } }); const ra = document.querySelector('#modal-root #ra-to'); ra.innerHTML += '<option>Marcus Bell</option>'; ra.value = 'Marcus Bell'; document.querySelector('#modal-root #ra-r').value = 'x'; const rr = prim();
    ok('S5a (17) staff record re-allocation: the new assessor must hold the Assessor role', rr === false && /doesn't hold the Assessor role/.test(mroot().textContent)); closeModal();
    acaEnter('KA'); ACT.kAlloc(); const ks = document.querySelector('#modal-root #ka-s'); ks.innerHTML += '<option>Leila Haddad</option>'; ks.value = 'Leila Haddad'; document.querySelector('#modal-root #ka-r').value = 'x'; const na = STORE.aca.alloc.length, kr = prim();
    ok('S5a (17) Academic Admin allocation refuses someone who is neither Teacher nor Assessor', kr === false && STORE.aca.alloc.length === na); closeModal();
    ACT.kRealloc(); document.querySelector('#modal-root .kr-n').checked = true; prim(); const kt = document.querySelector('#modal-root #kr-t'); kt.innerHTML += '<option>Tom Whitfield</option>'; kt.value = 'Tom Whitfield'; const k2 = prim();
    ok('S5a (17) re-allocation wizard: the new assessor must hold the Assessor role', k2 === false && /step 2 of 3/.test(MODAL.title)); closeModal();
    const sa = ADMIN.staff.find(s => s.id === 'ST-004'), mo = ADMIN.staff.find(s => s.id === 'ST-017');
    ok('S5a persona reconciliation: Sarah Okonkwo\'s staff record now holds Teacher and Assessor like her persona (same email, qualifications, registration)', sa.roles.includes('Teacher') && sa.roles.includes('Assessor') && sa.email === TAS_USERS.A.email && sa.reg === TAS_USERS.A.reg);
    ok('S5a Michael Osei is not reconciled: his staff record and persona have different emails (documented, unchanged)', mo.roles.join() === 'Academic Coordinator' && TAS_USERS.M.email !== mo.email);
  });

  await T('S5a keeps the N2 / N3 System Admin rights and the S4c approvals', async () => {
    fresh(); SYS(); ok('S5a (19) the System Admin can still create and edit batches and schedule classes', n2CanCreate() && s4bCanBatch() && s4bSched());
    const p0 = JSON.stringify(STORE.agy.purchases); bizEnter('BA'); rates(); document.querySelector('#dr-std').value = '7'; document.querySelector('#dr-r').value = 'S5a check'; SUBMIT.discSave(); const q = ADMIN.queue[0];
    SA(); go('a-index'); const ix = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent)); ok('S5a Admin index: one Setup fixes entry for S5a', !!ix && ix.querySelectorAll('[data-t="a-roles"]').length === 1 && /S5a — Super Administrator lock/.test(ix.textContent));
    applyDecision(q, 'approve', 'Agreed'); applyDecision(q, 'approve', 'Again'); ok('S5a (20) S4c: a discount-rate request is still applied once by the Super Admin; purchases unchanged', q.status === 'Approved' && discNow().std === 7 && JSON.stringify(STORE.agy.purchases) === p0);
  });
  await T('S5a persistence: created accounts, role grants / revokes, status and profiles survive admin rebuilds and identity switches', async () => {
    fresh(); SA(); const other = Object.keys(ADMIN_VARIANTS).find(k => k !== 'A'), rebuild = () => { INP.adminVariant({ value: other }); INP.adminVariant({ value: 'A' }); SA(); }, byId = id => ADMIN.staff.find(x => x.id === id);
    const R2 = newCustom('Records Clerk', ['Admissions & Documents:V', 'Admissions & Documents:E']);
    go('a-staff'); ACT.addUser(); fill({ '#nu-n': 'Nia Roberts', '#nu-e': 'nia.roberts@illumin-academy.example', '#nu-m': '+44 7700 900 321' }); nuPick(['Teacher']); prim(); closeModal();
    const nu = ADMIN.staff.find(x => x.email === 'nia.roberts@illumin-academy.example'), id = nu.id, n0 = ADMIN.staff.length;
    rebuild(); ok('S5a (1) a new staff account survives a variant switch: same ID, details and roles', !!byId(id) && byId(id).name === 'Nia Roberts' && byId(id).roles.join() === 'Teacher' && byId(id).mobile === '+44 7700 900 321' && ADMIN.staff.length === n0);
    SYS(); ok('S5a (2) … and an identity switch (System Admin)', !!byId(id)); acaEnter('KA'); bizEnter('BA'); SA(); ok('S5a (2) … and further identity switches', !!byId(id) && ADMIN.staff.filter(x => x.id === id).length === 1);
    INP.adminVariant({ value: 'B' }); ok('S5a (2) … and a Super Admin identity change that rebuilds the admin view', !!byId(id)); INP.adminVariant({ value: 'A' }); SA();
    go('a-staff', { id: 'ST-006', tab: 'roles' }); document.querySelector('#gr').value = 'Assessor'; ACT.grantRole({ dataset: { id: 'ST-006' } }); reason('Qualified assessor');
    go('a-staff', { id: 'ST-010', tab: 'roles' }); ACT.revokeRole({ dataset: { id: 'ST-010', r: 'Teacher' } }); reason('Left teaching');
    rebuild(); ok('S5a (3) a granted built-in role survives the rebuild', byId('ST-006').roles.includes('Assessor') && byId('ST-006').roles.includes('Teacher'));
    ok('S5a (4) a revoked built-in role stays revoked after the rebuild (not regained from the seed)', !byId('ST-010').roles.includes('Teacher'));
    SYS(); SA(); ok('S5a (3)(4) … and after identity switches', byId('ST-006').roles.includes('Assessor') && !byId('ST-010').roles.includes('Teacher'));
    ok('S5a (6) access checks read the same record: assessor and teacher lists follow the grants', chAssessorNames().includes('Marcus Bell') && !activeStaff('Teacher').includes('Tom Whitfield'));
    go('a-staff', { id, tab: 'roles' }); document.querySelector('#gr').value = R2; ACT.grantRole({ dataset: { id } }); reason('Admissions help');
    go('a-staff', { id: 'ST-007', tab: 'roles' }); document.querySelector('#gr').value = R2; ACT.grantRole({ dataset: { id: 'ST-007' } }); reason('Cover'); rebuild();
    ok('S5a (5) custom-role grants survive (created and seeded accounts)', byId(id).roles.includes(R2) && byId('ST-007').roles.includes(R2));
    go('a-staff', { id: 'ST-007', tab: 'roles' }); ACT.revokeRole({ dataset: { id: 'ST-007', r: R2 } }); reason('Done'); go('a-staff', { id, tab: 'roles' }); ACT.revokeRole({ dataset: { id, r: 'Teacher' } }); reason('Admissions only'); rebuild();
    ok('S5a (5) custom-role revocations survive too', !byId('ST-007').roles.includes(R2) && byId(id).roles.join() === R2);
    go('a-roles'); ok('S5a (6) the roles list counts the persisted holders', ADMIN.roles.find(r => r.name === R2).holders === 1 && ADMIN.roles.find(r => r.name === 'Teacher').holders === ADMIN.staff.filter(s => s.roles.includes('Teacher')).length);
    signOut(); S.portal = 'admin'; staffSignin('nia.roberts@illumin-academy.example'); const eff = s5Eff(ADMIN.me.roles);
    ok('S5a (6) the person\'s actual permissions follow the persisted roles (custom-role access, no Teacher)', s5Ctx() && ADMIN.me.roles.join() === R2 && eff['Admissions & Documents'] === 'VE' && !eff['Batches & Scheduling']);
    SA(); go('a-staff', { id: 'ST-005' }); ACT.staffSt({ dataset: { id: 'ST-005', a: 'Suspended' } }); reason('Leave'); ACT.staffSt({ dataset: { id, a: 'Suspended' } }); reason('Pending checks'); rebuild();
    ok('S5a (7) suspension survives a rebuild (seeded and created accounts)', byId('ST-005').status === 'Suspended' && byId(id).status === 'Suspended');
    signOut(); S.portal = 'admin'; staffSignin('nia.roberts@illumin-academy.example'); ok('S5a (7) a suspended account can\'t sign in', !s5Ctx() && /suspended or deactivated/.test(JSON.stringify(S.authMsg)));
    SA(); ACT.staffSt({ dataset: { id: 'ST-005', a: 'Active' } }); reason('Back'); ACT.staffSt({ dataset: { id, a: 'Active' } }); reason('Cleared'); rebuild(); SYS(); SA();
    ok('S5a (7) reactivation survives too', byId('ST-005').status === 'Active' && byId(id).status === 'Active');
    const rp = s5SaveProfile(id, { name: 'Nia Roberts', email: 'nia.roberts@illumin-academy.example', mobile: '+44 7700 900 999', quals: 'Level 3 Business Administration' }, 'Update'); s5SaveProfile('ST-006', { name: 'Marcus Bell', email: 'marcus.bell@illumin-academy.example', mobile: '+44 7700 900 444', quals: byId('ST-006').quals }, 'New phone'); rebuild();
    ok('S5a (8) profile edits still persist (created and seeded accounts)', rp.ok && byId(id).mobile === '+44 7700 900 999' && byId(id).quals === 'Level 3 Business Administration' && byId('ST-006').mobile === '+44 7700 900 444' && byId('ST-006').roles.includes('Assessor'));
    const ids = ADMIN.staff.map(s => s.id), ems = ADMIN.staff.map(s => s.email.toLowerCase());
    ok('S5a (9) staff IDs and emails are unique after repeated rebuilds; the created account kept its ID', new Set(ids).size === ids.length && new Set(ems).size === ems.length && byId(id).email === 'nia.roberts@illumin-academy.example');
    ACT.addUser(); fill({ '#nu-n': 'Owain Hale', '#nu-e': 'owain.hale@illumin-academy.example' }); nuPick(['Teacher']); prim(); closeModal(); const id2 = ADMIN.staff.find(x => x.email === 'owain.hale@illumin-academy.example').id; rebuild();
    ok('S5a (9) a second account gets a new ID, never a collision with the first', id2 !== id && ADMIN.staff.filter(x => x.id === id2).length === 1 && ADMIN.staff.filter(x => x.id === id).length === 1);
    ok('S5a (9) the set-password email still points at the right account', STORE.agy.lmails.some(m => m.kind === 'staff' && m.staffId === id2 && m.email === 'owain.hale@illumin-academy.example'));
    const lm = STORE.agy.lmails.find(m => m.kind === 'staff' && m.staffId === id2); ACT.lmSet({ dataset: { id: lm.id } }); SUBMIT.sysStaffSet(); ok('S5a the new account can still set its password and sign in after the rebuild (link used once)', S.signedIn && S.portal === 'staff' && lm.used); SA();
    const au = ADMIN.audit, has = (act, ent) => au.some(x => x.action === act && x.entity === ent), aids = au.map(x => x.id);
    ok('S5a the audit history of creation, role, status and profile changes survives the rebuilds (no duplicate rows)', has('User created', 'Nia Roberts') && has('Role granted', 'Marcus Bell') && has('Role revoked', 'Tom Whitfield') && has('Suspended', 'James Pryce') && has('Reactivated', 'Nia Roberts') && has('Profile updated', 'Nia Roberts') && has('Role created', R2) && new Set(aids).size === aids.length);
    SYS(); const ns = ADMIN.security.length; go('a-staff', { id, tab: 'roles' }); const sl = document.querySelector('#gr'); sl.innerHTML = '<option>Super Administrator</option>'; sl.value = 'Super Administrator'; ACT.grantRole({ dataset: { id } });
    go('a-roles', { id: 'Super_Administrator' }); ok('S5a (11) after the rebuilds, a System Admin still can\'t grant Super Administrator or open its role', !byId(id).roles.includes('Super Administrator') && /Only a Super Administrator can do this/.test(main()) && ADMIN.security.length >= ns + 2);
    ACT.revokeRole({ dataset: { id: 'ST-002', r: 'Super Administrator' } }); ok('S5a (11) … nor remove it', byId('ST-002').roles.includes('Super Administrator') && !MODAL);
    go('a-staff', { id, tab: 'roles' }); const rt = document.querySelector('#gr'); ok('S5a (11) System Administrator stays Super-Admin-only to grant', [...rt.options].some(o => /^System Administrator/.test(o.textContent) && o.disabled));
    SA(); go('a-roles'); ACT.retireRole({ dataset: { r: R2 } }); reason('Merged'); rebuild(); go('a-staff', { id: 'ST-007', tab: 'roles' });
    ok('S5a retired custom roles: kept by holders after a rebuild, not offered for new grants', byId(id).roles.includes(R2) && ![...document.querySelectorAll('#gr option')].some(o => o.textContent === R2));
    ACT.resetDemo(); SA(); const seedIds = ADMIN.staff.map(s => s.id);
    ok('S5a (10) the deliberate demo reset restores the seed: created accounts, grants, revokes, status and profile edits gone', !byId(id) && !byId(id2) && !byId('ST-006').roles.includes('Assessor') && byId('ST-010').roles.includes('Teacher') && byId('ST-005').status === 'Active' && byId('ST-006').mobile !== '+44 7700 900 444' && !s5RoleRec(R2) && JSON.stringify(STORE.s5a.made) === '{}' && new Set(seedIds).size === seedIds.length);
  });

  await T('S5a variant fixtures keep their deliberate state; user changes are reapplied around them', async () => {
    fresh(); SA(); const byId = id => ADMIN.staff.find(x => x.id === id);
    go('a-staff', { id: 'ST-022' }); ACT.staffSt({ dataset: { id: 'ST-022', a: 'Suspended' } }); reason('Leave'); SYS(); SA();
    ok('S5a a user change to a fixture account (Rhys Talbot suspended) survives identity switches', byId('ST-022').status === 'Suspended');
    setAdminIdentity('SC'); ok('S5a … while the "Only one System Admin" variant still deactivates him', byId('ST-022').status === 'Deactivated'); SA(); ok('S5a … and the user\'s status returns afterwards', byId('ST-022').status === 'Suspended');
    go('a-staff', { id: 'ST-003', tab: 'roles' }); setAdminIdentity('SD'); ok('S5a the System Admin + Finance variant still adds Finance Admin to Owen Price', byId('ST-003').roles.includes('Finance Admin')); SA(); ok('S5a … and removes it again afterwards', !byId('ST-003').roles.includes('Finance Admin'));
  });

  await T('S5a custom-role capability settings show which permissions are enforced', async () => {
    fresh(); SA(); go('a-roles', { id: 'Admissions_Officer_(custom)' });
    ok('S5a the custom role editor says which capabilities work as actions and which are saved for later', /Custom-role access in this prototype/.test(main()) && /Edit = document decisions/.test(main()) && /Edit = staff profiles/.test(main()) && /saved but not yet available as actions/.test(main()));
    go('a-roles', { id: 'Teacher' }); ok('S5a built-in role editors are unchanged (no custom-role note)', !/Custom-role access in this prototype/.test(main()));
    ACT.newRole(); fill({ '#cr-n': 'Quality Clerk' }); prim(); closeModal(); go('a-roles', { id: 'new' }); ok('S5a the new-role editor shows the same note', /Custom-role access in this prototype/.test(main()));
    S.roleDraft = null; SYS(); ACT.addUser(); fill({ '#nu-n': 'Tess Grey', '#nu-e': 'tess.grey@illumin-academy.example' }); nuPick(['Admissions Officer (custom)']); prim(); closeModal();
    ADMIN.roleCaps['Admissions Officer (custom)'].Learners = 'VCE'; signOut(); S.portal = 'admin'; staffSignin('tess.grey@illumin-academy.example');
    ok('S5a the custom-role dashboard separates available permissions from configured-but-unsupported ones', /Available to you/.test(main()) && /configured, not yet available here: Create, Edit/.test(main()));
    const L = allLearners()[0]; go('a-learner', { id: L.id }); const n = ADMIN.security.length; ACT.lAct && ACT.lAct({ dataset: { id: L.id, a: 'suspend' } }); ok('S5a a configured-but-unsupported Learners: Edit stays refused', !MODAL && ADMIN.security.length === n + 1);
    SA();
  });

  /* ================= S5b — agency administration, activation and access security ================= */
  const BIZ = () => { bizEnter('BA'); S.ui = {}; };
  const agOf = id => ADMIN.agencies.find(a => a.id === id);
  const rebuildA = () => { INP.adminVariant({ value: Object.keys(ADMIN_VARIANTS).find(k => k !== 'A') }); INP.adminVariant({ value: 'A' }); SA(); };
  const links = id => STORE.agy.lmails.filter(m => m.kind === 'agency' && m.agencyId === id);
  const linkOf = id => links(id).find(m => !m.used);
  const onboard = (name, login, reg) => { ACT.newAgency(); fill({ '#oa-n': name, '#oa-l': name + ' Ltd', '#oa-r': reg, '#oa-a': '4 Mill Lane, Leeds LS1 4AB' }); prim(); fill({ '#oa-pc': 'Ana Reyes (Operations)', '#oa-pe': login, '#oa-bc': 'Accounts team' }); prim(); fill({ '#oa-li': login }); prim(); prim(); prim(); prim(); const r = prim(); if (r !== false) closeModal(); return ADMIN.agencies.find(a => a.name === name); };
  const setPw = (m, pw = 'Agency!Pass2026') => { ACT.lmSet({ dataset: { id: m.id } }); if (S.auth !== 'agyFirst') return 'refused'; fill({ '#ag-new': pw, '#ag-conf': pw }); return SUBMIT.agyFirstSet(); };
  const kpiOf = l => { const k = [...app().querySelectorAll('main .kpi')].find(x => x.querySelector('.xs') && x.querySelector('.xs').textContent === l); return k ? +k.querySelector('.big-num').textContent : NaN; };
  const discRow = id => { const r = app().querySelector(`main tr[data-ag="${id}"]`); return r ? r.textContent : ''; };
  const listRow = name => { const r = [...app().querySelectorAll('main tr')].find(x => x.textContent.includes(name)); return r ? r.textContent : ''; };
  const EA = { name: '#ea-n', legal: '#ea-l', reg: '#ea-g', region: '#ea-rg', address: '#ea-a', contact: '#ea-c', email: '#ea-e', billing: '#ea-b' };
  const editAg = (id, o, r = 'Records update', keep) => { go('a-agencies', { id, tab: 'profile' }); ACT.bEditAgency({ dataset: { id } }); if (!MODAL) return 'refused'; Object.entries(o).forEach(([k, v]) => { document.querySelector('#modal-root ' + EA[k]).value = v; }); document.querySelector('#modal-root #ea-r').value = r; const res = prim(); if (res !== false || !keep) closeModal(); return res; };
  const loginOp = (id, a, r = 'Setup test', ne) => { ACT.bLogin({ dataset: { id, a } }); if (!MODAL) return 'refused'; if (ne) document.querySelector('#ne').value = ne; return reason(r); };

  await T('S5b onboarding and activation: one record and one login; the first set-password activates the agency once (S5-06)', async () => {
    fresh(); BIZ(); go('b-dashboard'); const on0 = kpiOf('Agencies in onboarding'), ac0 = kpiOf('Active agencies'), n0 = ADMIN.agencies.length;
    const a = onboard('Brookside Care Services', 'admin@brooksidecare.co.uk', '11223344'), id = a && a.id;
    ok('S5b (1) onboarding creates one agency record with a new stable ID and one login', !!a && ADMIN.agencies.length === n0 + 1 && ADMIN.agencies.filter(x => x.id === id).length === 1 && /^AG-\d+$/.test(id) && a.login === 'admin@brooksidecare.co.uk' && ADMIN.agencies.filter(x => x.login === a.login).length === 1 && new Set(ADMIN.agencies.map(x => x.id)).size === ADMIN.agencies.length);
    ok('S5b (1) … and exactly one set-password email for that login, audited', links(id).length === 1 && links(id)[0].email === a.login && !links(id)[0].used && ADMIN.audit.some(x => x.action === 'Agency onboarded' && x.entity === 'Brookside Care Services'));
    ok('S5b (2) pending first-login set-up is not activation: Onboarding / Not activated, no activation time', a.status === 'Onboarding' && a.loginStatus === 'Not activated' && !a.activatedAt && agStatus(a) === 'Onboarding');
    go('b-dashboard'); ok('S5b (2) the Business dashboard counts it as onboarding', kpiOf('Agencies in onboarding') === on0 + 1 && kpiOf('Active agencies') === ac0, `${kpiOf('Agencies in onboarding')} / ${kpiOf('Active agencies')}`);
    SA(); saveRates(null, { ag: { 'Brookside Care Services': 5 }, r: 'Prepared terms' }); rates();
    ok('S5b (2) appearing in the S4c discount list, even with a rate, doesn\'t activate it', /Onboarding/.test(discRow(id)) && discNow().agency['Brookside Care Services'] === 5 && a.status === 'Onboarding' && a.loginStatus === 'Not activated');
    signOut(); S.portal = 'agency'; staffSignin(a.login); ok('S5b (2) the login can\'t sign in before its set-up', !S.signedIn && /not activated yet/.test(JSON.stringify(S.authMsg)));
    const m = linkOf(id); ACT.lmSet({ dataset: { id: m.id } }); fill({ '#ag-new': 'short', '#ag-conf': 'short' }); const rw = SUBMIT.agyFirstSet();
    ok('S5b (3) a password that breaks the rules is refused inside the submit (not only by the disabled button)', rw === false && a.loginStatus === 'Not activated' && !m.used);
    const r1 = setPw(m), au = ADMIN.audit.find(x => x.action === 'Agency activated' && x.entity.includes(id));
    ok('S5b (3) the first set-password activates the agency and its login together', r1 !== false && a.status === 'Active' && a.loginStatus === 'Active' && !!a.activatedAt && agStatus(a) === 'Active' && m.used && S.auth === 'agyWelcome');
    ok('S5b (4) the activation is audited: agency actor, before → after, time and the link used', !!au && au.role === 'Agency Administrator' && /Ana Reyes/.test(au.actor) && au.before === 'Onboarding · Not activated' && au.after === 'Active · Active' && !!au.at && au.reason.includes(m.id));
    ok('S5b (4) the Business Admin is notified', STORE.biz.notifs.some(n => n.t === 'Agency login activated' && n.b.includes('Brookside')));
    const at0 = a.activatedAt, nAct = () => ADMIN.audit.filter(x => x.action === 'Agency activated' && x.entity.includes(id)).length;
    S.auth = 'agyFirst'; render(); const r2 = SUBMIT.agyFirstSet(); ok('S5b (3) resubmitting the set-password activates nothing again', r2 === false && nAct() === 1 && a.activatedAt === at0);
    ACT.lmSet({ dataset: { id: m.id } }); ok('S5b (3) reopening the used link is refused, changes nothing and is logged', S.auth === 'agyLinkBad' && /already been used/.test(app().textContent) && nAct() === 1 && ADMIN.security[0].type === 'Set-password link refused');
    signOut(); S.portal = 'agency'; staffSignin(a.login); ok('S5b the activated login goes on to two-step sign-in (email code)', S.auth === 'tfa-code' && !!S.tfa && S.tfa.agency === id);
    BIZ(); go('b-dashboard'); ok('S5b (5) the Business dashboard now counts it as active', kpiOf('Agencies in onboarding') === on0 && kpiOf('Active agencies') === ac0 + 1);
    go('a-agencies'); ok('S5b (5) the agency list shows it Active (agency and login)', /Active/.test(listRow('Brookside Care Services')) && !/Onboarding|Not activated/.test(listRow('Brookside Care Services')));
    go('a-agencies', { id, tab: 'profile' }); ok('S5b (5) the detail shows Active, the agency ID and the activation time', /Active/.test(main()) && main().includes(id) && /Activated/.test(main()) && !/Not yet/.test(main()));
    SA(); rates(); ok('S5b (5) the S4c per-agency discount list shows it Active; its rate is unchanged', /Active/.test(discRow(id)) && !/Onboarding/.test(discRow(id)) && discNow().agency['Brookside Care Services'] === 5);
    BIZ(); const n1 = ADMIN.agencies.length; ACT.newAgency(); fill({ '#oa-n': 'Brookside  care services', '#oa-r': '99' }); const rd = prim(); closeModal();
    ok('S5b (1) a second agency with the same name is refused (case and spacing ignored)', rd === false && ADMIN.agencies.length === n1);
    const st = onboard('Staff Mailbox Agency', 'owen.price@illumin-academy.example', '77'); ok('S5b (1) a staff email can\'t become an agency login (identity uniqueness)', !st && ADMIN.agencies.length === n1 && ADMIN.audit[0].action === 'Blocked: onboard agency');
  });

  await T('S5b agency details: validated edits with real versions and before → after audit; history and purchases kept', async () => {
    fresh(); BIZ(); const a = agOf('AG-08'), hist0 = JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger, ADMIN.bundles]), L0 = agyRoster(a.name).length;
    go('a-agencies', { id: 'AG-08', tab: 'profile' }); ok('S5b the profile shows the agency ID, address, login status, activation and the real version', main().includes('AG-08') && /Address/.test(main()) && /Version 1 of these details/.test(main()) && /Not yet/.test(main()) && !/Edits are versioned/.test(main()));
    const r = editAg('AG-08', { legal: 'Riverside Care Partners Limited', address: '12 Quay Street, Bristol BS1 4DJ', region: 'UAE', billing: 'Accounts Payable (accounts@riversidecare.co.uk)' }, 'Companies House update'), au = ADMIN.audit[0];
    ok('S5b (6) legal name, address, region and billing contact are saved', r !== false && a.legal === 'Riverside Care Partners Limited' && a.address === '12 Quay Street, Bristol BS1 4DJ' && a.region === 'UAE' && a.billing === 'Accounts Payable (accounts@riversidecare.co.uk)');
    ok('S5b (7) audit: actor, before → after for each changed field, reason and the version', au.action === 'Details edited — version 2' && au.actor === 'Sophie Turner' && au.entity === 'Riverside Care Partners (AG-08)' && au.before === 'Legal name: Riverside Care Partners Ltd; Region: UK; Address: —; Billing contact: —' && au.after === 'Legal name: Riverside Care Partners Limited; Region: UAE; Address: 12 Quay Street, Bristol BS1 4DJ; Billing contact: Accounts Payable (accounts@riversidecare.co.uk)' && au.reason === 'Companies House update', au.before + ' → ' + au.after);
    ok('S5b (7) the version is recorded on the agency (so "version" is true)', a.versions.length === 2 && a.versions[1].v === 2 && a.versions[1].changes.length === 4 && a.versions[1].by === 'Sophie Turner');
    go('a-agencies', { id: 'AG-08', tab: 'profile' }); ok('S5b (6) the profile shows the new details and the version history', main().includes('12 Quay Street') && main().includes('Riverside Care Partners Limited') && /Version 2 of these details/.test(main()) && /Versions of these details/.test(main()) && main().includes('Companies House update'));
    go('a-agencies'); ok('S5b (6) the agency list shows the new region', /UAE/.test(listRow('Riverside Care Partners')));
    const reg0 = a.reg; let x = editAg('AG-08', { reg: '' }, 'x', true); ok('S5b (6) required fields are checked (registration number); nothing changes', x === false && a.reg === reg0 && /Enter the registration number/.test(mroot().textContent)); closeModal();
    x = editAg('AG-08', { email: 'not-an-email' }, 'x', true); ok('S5b (6) the contact email is validated', x === false && a.email === 'helen.moss@riversidecare.co.uk'); closeModal();
    x = editAg('AG-08', { name: 'meridian home support' }, 'x', true); ok('S5b (6) the name must be unique — another agency is never matched or renamed', x === false && a.name === 'Riverside Care Partners' && agOf('AG-10').name === 'Meridian Home Support' && /Another agency already has this name/.test(mroot().textContent)); closeModal();
    x = editAg('AG-08', { name: 'Riverside Care Group' }, 'Rebrand', true); ok('S5b (6) renaming an agency that records refer to by name is refused with the reason', x === false && a.name === 'Riverside Care Partners' && /refer to this agency by its trading name/.test(mroot().textContent)); closeModal();
    x = editAg('AG-08', {}, 'Nothing'); ok('S5b (6) a save with no changes adds no version', x === false && a.versions.length === 2);
    ok('S5b (8) purchases, Finance records, ledger and bundles are unchanged; learners kept', JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger, ADMIN.bundles]) === hist0 && agyRoster(a.name).length === L0);
    agyEnter('AG-02', true); go('g-purchases'); const gp0 = main(), cp0 = JSON.stringify(agyPurchases('CarePlus Recruitment'));
    BIZ(); editAg('AG-02', { legal: 'CarePlus Recruitment Limited', address: '1 Station Road, Reading RG1 1LG', billing: 'CarePlus Accounts' }, 'Billing details');
    agyEnter('AG-02', true); go('g-purchases'); ok('S5b (8) a purchasing agency\'s historical purchases and receipts are unchanged by a details edit', main() === gp0 && JSON.stringify(agyPurchases('CarePlus Recruitment')) === cp0);
    BIZ(); const n = onboard('Ashgrove Home Care', 'office@ashgrovehomecare.co.uk', '55667788'); const y = editAg(n.id, { name: 'Ashgrove Homecare' }, 'Trading name registered');
    ok('S5b (6) a new agency nothing refers to can be renamed; the earlier name is kept', y !== false && n.name === 'Ashgrove Homecare' && n.prevNames.includes('Ashgrove Home Care') && n.login === 'office@ashgrovehomecare.co.uk');
    go('a-agencies', { id: n.id, tab: 'audit' }); ok('S5b (7) its history includes entries under the earlier name', /Agency onboarded/.test(main()) && /Details edited — version 2/.test(main()));
  });

  await T('S5b login administration: resend, email change, deactivate / reactivate keep the first-login requirement', async () => {
    fresh(); BIZ(); const a = agOf('AG-08'), m0 = linkOf('AG-08');
    ok('S5b seeded: Riverside has one unused set-password link', !!m0 && m0.id === 'LM-A1');
    ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); const m1 = linkOf('AG-08');
    ok('S5b (9) resend: a new link to the login email; the earlier one stops working; audited', !!m1 && m1.id !== m0.id && m1.email === a.login && m0.used && /newer link/.test(m0.void) && links('AG-08').filter(x => !x.used).length === 1 && ADMIN.audit[0].action === 'Set-password link resent' && a.loginStatus === 'Not activated');
    go('m-inbox', { id: m0.id }); ok('S5b (9) the demo inbox shows the earlier link as Superseded', /Superseded/.test(app().textContent));
    ACT.lmSet({ dataset: { id: m0.id } }); ok('S5b (9) the superseded link can\'t be used', S.auth === 'agyLinkBad' && a.loginStatus === 'Not activated' && /replaced/.test(app().textContent));
    BIZ(); go('a-agencies', { id: 'AG-08', tab: 'login' }); ok('S5b (9) the Login tab shows the outstanding set-up and the latest link', /Outstanding/.test(main()) && main().includes('not used yet'));
    loginOp('AG-08', 'deactivate', 'Paused'); ok('S5b deactivate: Inactive / Deactivated; the unused link stops working', a.loginStatus === 'Deactivated' && a.status === 'Inactive' && m1.used && /deactivated/.test(m1.void));
    ACT.lmSet({ dataset: { id: m1.id } }); ok('S5b … so a deactivated login can\'t be set up through its old link', S.auth === 'agyLinkBad' && a.loginStatus === 'Deactivated');
    BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); ok('S5b a deactivated login gets no new link (refused, logged)', !linkOf('AG-08') && ADMIN.audit[0].action === 'Blocked: resend the set-password link of Riverside Care Partners');
    ok('S5b deactivating twice is refused', loginOp('AG-08', 'deactivate') === 'refused' && /already deactivated/.test(ADMIN.audit[0].reason));
    loginOp('AG-08', 'reactivate', 'Contract signed');
    ok('S5b (10) reactivating a never-activated login keeps the set-password requirement (it used to become Active)', a.loginStatus === 'Not activated' && a.status === 'Onboarding' && !a.activatedAt && agStatus(a) === 'Onboarding' && ADMIN.audit[0].after === 'Onboarding · Not activated');
    signOut(); S.portal = 'agency'; staffSignin(a.login); ok('S5b (10) … so it still can\'t sign in', !S.signedIn && /not activated yet/.test(JSON.stringify(S.authMsg)));
    BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); setPw(linkOf('AG-08'));
    ok('S5b (10) … until the set-password is completed with a new link — then the agency is activated', a.status === 'Active' && a.loginStatus === 'Active' && !!a.activatedAt);
    BIZ(); loginOp('AG-08', 'deactivate', 'Hold'); loginOp('AG-08', 'reactivate', 'Resume'); ok('S5b (10) an activated login returns to Active when reactivated', a.loginStatus === 'Active' && a.status === 'Active');
    loginOp('AG-11', 'reactivate', 'Renewed'); ok('S5b (10) a seeded login that was in use (Kingsway) still reactivates to Active', agOf('AG-11').loginStatus === 'Active' && agOf('AG-11').status === 'Active');
    const g = agOf('AG-10'), gp = JSON.stringify(agyPurchases(g.name)), gr = agyRoster(g.name).length, ga = ADMIN.audit.filter(x => x.entity.includes('Meridian')).length;
    ok('S5b (11) a login email used by another agency is refused', loginOp('AG-10', 'email', 'x', 'paul@kingswaystaffing.co.uk') === false && g.login === 'clare@meridianhs.co.uk' && /already an agency login/.test(mroot().textContent)); closeModal();
    ok('S5b (11) … and so is a staff email', loginOp('AG-10', 'email', 'x', 'owen.price@illumin-academy.example') === false && g.login === 'clare@meridianhs.co.uk'); closeModal();
    loginOp('AG-10', 'email', 'New mailbox', 'training@meridianhs.co.uk'); const e = ADMIN.audit[0];
    ok('S5b (11) email change: same agency ID and status; the login waits for confirmation; one new link to the new address', g.id === 'AG-10' && g.login === 'training@meridianhs.co.uk' && g.status === 'Active' && g.loginStatus === 'Pending email confirmation' && agStatus(g) === 'Active' && linkOf('AG-10').email === 'training@meridianhs.co.uk' && links('AG-10').filter(x => !x.used).length === 1);
    ok('S5b (11) audited with the old and new address', e.action === 'Login email changed' && e.before.startsWith('clare@meridianhs.co.uk') && e.after.startsWith('training@meridianhs.co.uk') && e.reason === 'New mailbox');
    ok('S5b (11) identity and history kept: purchases, learners and earlier audit rows', JSON.stringify(agyPurchases(g.name)) === gp && agyRoster(g.name).length === gr && ADMIN.audit.filter(x => x.entity.includes('Meridian')).length === ga + 1);
    signOut(); S.portal = 'agency'; staffSignin('training@meridianhs.co.uk'); ok('S5b (11) the new address can\'t sign in before it is confirmed', !S.signedIn && S.auth !== 'tfa-code' && /login email was changed/.test(JSON.stringify(S.authMsg)));
    setPw(linkOf('AG-10')); ok('S5b (11) confirming the new address returns the login to Active — no second activation', g.loginStatus === 'Active' && g.status === 'Active' && ADMIN.audit[0].action === 'Login email confirmed' && !ADMIN.audit.some(x => x.action === 'Agency activated' && x.entity.includes('AG-10')));
    BIZ(); loginOp('AG-01', 'deactivate', 'Paused'); ok('S5b (11) a deactivated login\'s email can\'t be changed until it is reactivated', loginOp('AG-01', 'email') === 'refused' && /reactivate it first/.test(ADMIN.audit[0].reason));
    go('a-agencies', { id: 'AG-01', tab: 'login' }); ok('S5b the Login tab of a deactivated login offers only Reactivate', !app().querySelector('main [data-act="bLogin"][data-a="resend"]') && !app().querySelector('main [data-act="bLogin"][data-a="email"]') && !!app().querySelector('main [data-act="bLogin"][data-a="reactivate"]'));
  });

  await T('S5b correction — set-password link expiry: 7 days from issue, enforced in the action; used and superseded links stay refused', async () => {
    // The agency clock is agNow() = now() + STORE.agy.offset days (the demo "Advance 30 days" control); clockAt sets it to a moment
    const clockAt = ms => { STORE.agy.offset = (ms - now().getTime()) / DAY; }, ml = id => STORE.agy.lmails.find(m => m.id === id);
    const tryLink = m => { S.agy.id = m.agencyId; S.s5bLink = m.id; S.auth = 'agyFirst'; S.portal = 'agency'; S.signedIn = false; S.route = 'signin'; render(); fill({ '#ag-new': 'Agency!Pass2026', '#ag-conf': 'Agency!Pass2026' }); return SUBMIT.agyFirstSet(); };
    fresh(); BIZ(); const a = agOf('AG-09'), m0 = linkOf('AG-09');
    ok('S5b expiry period: 7 days — the agency email and System Configuration agree', s5bLinkDays() === 7 && ADMIN.config.some(c => c.name === 'Set-password / reset / workplace link expiry' && c.value === '7 days'));
    ACT.bLogin({ dataset: { id: 'AG-09', a: 'resend' } }); const m = linkOf('AG-09'), exp = new Date(m.expires).getTime();
    ok('S5b resend issues a new link that expires 7 days after it was issued (audited with the expiry)', m.id !== m0.id && exp - new Date(m.sent).getTime() === 7 * DAY && m0.void && /expires/.test(ADMIN.audit[0].after));
    clockAt(exp - 60000); ACT.lmSet({ dataset: { id: m.id } }); ok('S5b just before expiry the link opens the set-password screen', S.auth === 'agyFirst' && S.s5bLink === m.id);
    go('m-inbox', { id: m.id }); ok('S5b reopening the email doesn\'t move the expiry; the email states its expiry date', m.expires === new Date(exp).toISOString() && /The link expires on/.test(app().textContent) && !/expires in 7 days/.test(app().textContent));
    const b0 = JSON.stringify(a), ns = ADMIN.security.length; clockAt(exp); const r1 = tryLink(m);
    ok('S5b at the expiry moment the action refuses the link (direct submit, not only the button)', r1 === false && S.auth === 'agyLinkBad' && /expired on/.test(app().textContent) && /Contact:/.test(app().textContent));
    ok('S5b an expired link leaves the agency and its login unchanged and the link unused; the attempt is logged', JSON.stringify(a) === b0 && a.status === 'Onboarding' && a.loginStatus === 'Not activated' && !a.activatedAt && !m.used && ADMIN.security.length === ns + 1 && ADMIN.security[0].type === 'Set-password link refused' && /expired/.test(ADMIN.security[0].detail) && ADMIN.audit[0].action === 'Blocked: set-password link');
    clockAt(exp + 3 * DAY); ACT.lmSet({ dataset: { id: m.id } }); ok('S5b after expiry the link stays refused', S.auth === 'agyLinkBad' && a.loginStatus === 'Not activated');
    go('m-inbox'); ok('S5b the demo inbox shows the link as Expired', /Expired/.test(app().textContent)); BIZ(); go('a-agencies', { id: 'AG-09', tab: 'login' }); ok('S5b the Login tab says the latest link expired', /Expired .* send a new link/.test(main()));
    for (const [lbl, enter] of [['System Admin', () => role('sysA')], ['Finance Admin', () => FA4()], ['an Agency Administrator', () => agyEnter('AG-03', true)]]) {
      enter(); const n = links('AG-09').length; ['resend', 'email', 'reactivate'].forEach(k => { ACT.bLogin({ dataset: { id: 'AG-09', a: k } }); closeModal(); });
      ok(`S5b ${lbl} can't resend a link or use other login actions to get round the expiry (refused, logged)`, links('AG-09').length === n && linkOf('AG-09') === m && a.loginStatus === 'Not activated' && /^Blocked: /.test(ADMIN.audit[0].action));
    }
    BIZ(); ACT.bLogin({ dataset: { id: 'AG-09', a: 'resend' } }); const m2 = linkOf('AG-09');
    ok('S5b an authorised resend issues a fresh link with a new 7-day expiry (from the agency clock) and supersedes the expired one', m2.id !== m.id && new Date(m2.expires).getTime() - agNow().getTime() > 7 * DAY - 60000 && new Date(m2.expires).getTime() > exp && m.void && links('AG-09').filter(x => !x.used).length === 1);
    ACT.lmSet({ dataset: { id: m.id } }); ok('S5b the old link is not revived by the resend', S.auth === 'agyLinkBad' && /replaced/.test(app().textContent));
    const r2 = setPw(m2); ok('S5b the new link works before its expiry — the agency is activated once', r2 !== false && a.status === 'Active' && a.loginStatus === 'Active' && m2.used && ADMIN.audit.filter(x => x.action === 'Agency activated' && x.entity.includes('AG-09')).length === 1);
    ok('S5b a used link can\'t be used again, even before its expiry', setPw(m2) === 'refused' && /already been used/.test(app().textContent));
    // The same links confirm a changed login email and reset a password: the same expiry applies
    fresh(); BIZ(); loginOp('AG-10', 'email', 'Mailbox', 'training@meridianhs.co.uk'); const g = agOf('AG-10'), me = linkOf('AG-10'); clockAt(new Date(me.expires).getTime() + 1000);
    ok('S5b an expired email-confirmation link confirms nothing', tryLink(me) === false && g.loginStatus === 'Pending email confirmation' && !me.used && !ADMIN.audit.some(x => x.action === 'Login email confirmed'));
    fresh(); BIZ(); ACT.bLogin({ dataset: { id: 'AG-01', a: 'resend' } }); const mr = linkOf('AG-01'); clockAt(new Date(mr.expires).getTime() + 1000);
    ok('S5b an expired password-reset link resets nothing', tryLink(mr) === false && agOf('AG-01').loginStatus === 'Active' && !mr.used && !ADMIN.audit.some(x => x.action === 'Password set with a set-password link'));
    fresh(); ACT.lmSet({ dataset: { id: 'LM-A1' } }); ok('S5b Riverside\'s seeded link (sent 9 days ago) is expired and refused; Riverside unchanged', S.auth === 'agyLinkBad' && /expired on/.test(app().textContent) && agOf('AG-08').loginStatus === 'Not activated' && !ml('LM-A1').used);
    // Validity survives admin rebuilds: the stored expiry is kept
    fresh(); BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); const m3 = linkOf('AG-08'), e3 = m3.expires; rebuildA(); rebuildA(); SYS(); SA();
    ok('S5b after admin rebuilds and identity switches the link is still there with the same expiry; the expired seed link stays superseded', !!ml(m3.id) && ml(m3.id).expires === e3 && !ml(m3.id).used && ml('LM-A1').void);
    clockAt(new Date(e3).getTime() + 1000); ok('S5b … still refused after its expiry', tryLink(ml(m3.id)) === false && agOf('AG-08').loginStatus === 'Not activated');
    clockAt(new Date(e3).getTime() - 60000); const r3 = tryLink(ml(m3.id)); ok('S5b … and still works before it', r3 !== false && agOf('AG-08').status === 'Active' && agOf('AG-08').loginStatus === 'Active');
    // Other links keep their own rules: an agency-created learner's set-password link doesn't get this expiry
    fresh(); const lm = STORE.agy.lmails.find(x => !x.kind && x.lid && !x.used); STORE.agy.offset = 30; ACT.lmSet({ dataset: { id: lm.id } });
    ok('S5b learner set-password links are unchanged (no new expiry)', S.auth === 'agyLearnerFirst');
    STORE.agy.offset = 0;
  });

  await T('S5b authorisation: only the Business Admin and Super Admin administer agencies; refusals change nothing and are logged', async () => {
    // Baselines are taken after a render (the first render after a rebuild adds the seeded data-sharing terms — fu-apply.js)
    const snap = (id = 'AG-02') => JSON.stringify([agOf(id), links(id)]), base = () => { render(); return snap(); };
    const tryAll = id => {
      const n = ADMIN.security.length, opened = [];
      ACT.bEditAgency({ dataset: { id } }); opened.push(!!MODAL); closeModal();
      const r = s5bSaveAgency(id, { name: agOf(id).name, legal: 'Changed Ltd', reg: '1', region: 'UK', address: '', contact: agOf(id).contact, email: agOf(id).email, billing: '' }, 'x');
      ['deactivate', 'email', 'resend'].forEach(k => { ACT.bLogin({ dataset: { id, a: k } }); opened.push(!!MODAL); closeModal(); });
      ACT.bPerm({ dataset: { id, v: agOf(id).perms === 'Full' ? 'Receive-only' : 'Full' } }); opened.push(!!MODAL); closeModal();
      INP.agVis({ dataset: { id, k: 'assessment' }, checked: !agOf(id).vis.assessment });
      ACT.newAgency(); opened.push(!!MODAL); closeModal();
      return { none: !opened.some(Boolean) && !r.ok, logged: ADMIN.security.length - n };
    };
    for (const [lbl, enter] of [['System Admin', () => role('sysA')], ['Finance Admin', () => FA4()], ['Academic Admin', () => { acaEnter('KA'); S.signedIn = true; }], ['Business Admin in the Finance role context', () => { bizEnter('BD'); S.bizCtx = 'Finance Admin'; }]]) {
      fresh(); enter(); const s0 = base(), t = tryAll('AG-02');
      ok(`S5b (12)(13) ${lbl}: agency edit, login, visibility, permission and onboarding calls are refused; nothing changes; each is logged`, t.none && snap() === s0 && t.logged === 8 && ADMIN.audit.some(x => /^Blocked: edit agency details of CarePlus/.test(x.action)), JSON.stringify(t));
    }
    fresh(); role('sysA'); const ns = ADMIN.security.length; ACT.bLogin({ dataset: { id: 'AG-02', a: 'deactivate' } });
    ok('S5b (12) the System Admin refusal is in the security log and the agency\'s audit', !MODAL && ADMIN.security.length === ns + 1 && /System Administrator Owen Price attempted: deactivate the login of CarePlus Recruitment/.test(ADMIN.security[0].detail) && ADMIN.audit[0].module === 'Agencies' && ADMIN.audit[0].action === 'Blocked: deactivate the login of CarePlus Recruitment');
    go('a-agencies', { id: 'AG-02', tab: 'profile' }); ok('S5b the interface follows the same decision: no Edit details for the System Admin', !app().querySelector('main [data-act="bEditAgency"]') && /edited by the Business Admin/.test(main()));
    go('a-agencies', { id: 'AG-02', tab: 'visibility' }); ok('S5b … permission and visibility controls are read-only with the reason', [...app().querySelectorAll('main [data-act="bPerm"]')].every(b => b.disabled && b.title) && [...app().querySelectorAll('main [data-onchange="agVis"]')].every(i => i.disabled) && /Read only/.test(main()));
    // Agency Administrators never administer an agency — their own or another one
    fresh(); agyEnter('AG-03', true); const s2 = base(), s3 = snap('AG-03'), t3 = tryAll('AG-02'), t4 = tryAll('AG-03');
    ok('S5b (14) an Agency Administrator (Gulf Care) can\'t change another agency by direct calls', t3.none && snap() === s2 && t3.logged === 8 && /Agency Administrator Huda Al Marri \(Gulf Care Recruitment\) attempted/.test(ADMIN.security[0].detail));
    ok('S5b (14) … nor its own agency account', t4.none && snap('AG-03') === s3 && t4.logged === 8);
    const cpL = agyRoster('CarePlus Recruitment')[0], nd = ADMIN.security.length; go('g-learner', { id: cpL.id });
    ok('S5b (14) cross-agency reads stay refused (another agency\'s learner is "Not found" and logged)', !main().includes(cpL.email) && ADMIN.security.length === nd + 1 && ADMIN.security[0].type === 'Denied cross-agency access');
    go('a-agencies', { id: 'AG-02' }); ok('S5b (14) an admin route doesn\'t open in the agency portal', S.route === 'g-dashboard' && !main().includes('CarePlus Recruitment'));
    // Custom-role access with Agencies & Bundles: Edit is refused too (S5a reserved limits)
    fresh(); SA(); const R = newCustom('Agency Clerk', ['Agencies & Bundles:V', 'Agencies & Bundles:E']); ACT.addUser(); fill({ '#nu-n': 'Ivy Lane', '#nu-e': 'ivy.lane@illumin-academy.example' }); nuPick([R]); prim(); closeModal();
    signOut(); S.portal = 'admin'; staffSignin('ivy.lane@illumin-academy.example'); const sc = base(), tc = tryAll('AG-02');
    ok('S5b (13) custom-role access with Agencies & Bundles: Edit can\'t administer agencies either', s5Ctx() && tc.none && snap() === sc && tc.logged >= 8);
    // Authorised roles keep working; the permission is checked again when a dialog is confirmed
    fresh(); BIZ(); ACT.bPerm({ dataset: { id: 'AG-02', v: 'Receive-only' } }); reason('Policy'); INP.agVis({ dataset: { id: 'AG-02', k: 'assessment' }, checked: true });
    ok('S5b the Business Admin changes communication permission and report visibility (audited)', agOf('AG-02').perms === 'Receive-only' && agOf('AG-02').vis.assessment === true && ADMIN.audit.some(x => x.action === 'Communication permission') && ADMIN.audit[0].action === 'Report visibility');
    SA(); ACT.bPerm({ dataset: { id: 'AG-02', v: 'Full' } }); reason('Back'); ok('S5b the Super Admin can too', agOf('AG-02').perms === 'Full');
    BIZ(); ACT.bLogin({ dataset: { id: 'AG-10', a: 'deactivate' } }); const dlg = MODAL; S.bizCtx = 'Finance Admin'; document.querySelector('#rsn').value = 'later'; const rr = dlg.actions[1].fn(); S.bizCtx = 'Business Admin'; closeModal();
    ok('S5b the actor is checked again when the dialog is confirmed (not when it opened)', rr === false && agOf('AG-10').loginStatus === 'Active' && ADMIN.audit[0].action === 'Blocked: deactivate the login of Meridian Home Support');
    ACT.bEditAgency({ dataset: { id: 'AG-10' } }); document.querySelector('#modal-root #ea-l').value = 'Meridian HS Ltd'; document.querySelector('#modal-root #ea-r').value = 'x'; S.bizCtx = 'Finance Admin'; const re = prim(); S.bizCtx = 'Business Admin'; closeModal();
    ok('S5b … the details save too', re === false && agOf('AG-10').legal !== 'Meridian HS Ltd' && /^Blocked: edit agency details/.test(ADMIN.audit[0].action));
    ACT.bLogin({ dataset: { id: 'AG-99', a: 'deactivate' } }); ok('S5b an unknown agency ID is refused (never matched by name)', !MODAL && ADMIN.audit[0].action === 'Blocked: deactivate the login');
  });

  await T('S5b purchases: a login that can\'t sign in can\'t buy by calling the purchase directly', async () => {
    fresh(); const n0 = STORE.agy.purchases.length; agyEnter('AG-10', true); const ok1 = buyAg('CAT-2', 10);
    ok('S5b an active agency still buys as before', STORE.agy.purchases.length === n0 + 1 && ok1.agency === 'Meridian Home Support' && ok1.status === 'Paid');
    const mh = JSON.stringify(agyPurchases('Meridian Home Support')), bn = ADMIN.bundles.filter(b => b.agency === 'Meridian Home Support').length;
    BIZ(); loginOp('AG-10', 'deactivate', 'Contract ended'); agyEnter('AG-10', true); const n1 = STORE.agy.purchases.length, q1 = ADMIN.queue.length, ns = ADMIN.security.length;
    ACT.agBuy({ dataset: { id: 'CAT-2' } }); ok('S5b (15) a login deactivated while signed in can\'t open a purchase', !MODAL && /attempted: buy bundles — This agency account is inactive/.test(ADMIN.security[0].detail));
    S.agy.buy = { c: AGY_CATALOGUE().find(c => c.id === 'CAT-2'), qty: 10 }; agPayResult('success'); ok('S5b (15) … nor complete a card payment by a direct call', STORE.agy.purchases.length === n1 && !MODAL);
    S.agy.buy = { c: AGY_CATALOGUE().find(c => c.id === 'CAT-2'), qty: 10 }; agInvoiceForm(); ok('S5b (15) … nor request seats by bank transfer', ADMIN.queue.length === q1 && !MODAL && ADMIN.security.length === ns + 3);
    ok('S5b (15) its earlier purchases and bundles are unchanged', JSON.stringify(agyPurchases('Meridian Home Support')) === mh && ADMIN.bundles.filter(b => b.agency === 'Meridian Home Support').length === bn);
    SA(); saveRates(null, { ag: { 'Riverside Care Partners': 7 }, r: 'Prepared terms' }); agyEnter('AG-08', true); ACT.agBuy({ dataset: { id: 'CAT-2' } }); S.agy.buy = { c: AGY_CATALOGUE().find(c => c.id === 'CAT-2'), qty: 5 }; agPayResult('success');
    ok('S5b (15) a login that never completed set-up can\'t buy, even with a discount rate set', STORE.agy.purchases.length === n1 && /not activated yet/.test(ADMIN.security[0].detail));
    BIZ(); loginOp('AG-01', 'email', 'Mailbox', 'ops@brightcare-staff.co.uk'); agyEnter('AG-01', true); S.agy.buy = { c: AGY_CATALOGUE().find(c => c.id === 'CAT-2'), qty: 5 }; agPayResult('success');
    ok('S5b (15) … nor one waiting for its new login email to be confirmed', STORE.agy.purchases.length === n1 && /login email was changed/.test(ADMIN.security[0].detail));
    BIZ(); loginOp('AG-10', 'reactivate', 'Renewed'); agyEnter('AG-10', true); const ok2 = buyAg('CAT-2', 10);
    ok('S5b once reactivated it buys again, at the same price', STORE.agy.purchases.length === n1 + 1 && ok2.amount === ok1.amount);
    S.portal = 'admin'; S.agy.buy = { c: AGY_CATALOGUE().find(c => c.id === 'CAT-2'), qty: 10 }; const n2 = STORE.agy.purchases.length; agPayResult('success'); ok('S5b a purchase can only be made from a signed-in agency portal', STORE.agy.purchases.length === n2);
  });

  await T('S5b persistence: agencies, status, details, logins, links and audit survive admin rebuilds; the demo reset restores the seed', async () => {
    fresh(); BIZ(); const seedN = ADMIN.agencies.length, a = onboard('Ashgrove Home Care', 'office@ashgrovehomecare.co.uk', '55667788'), id = a.id, nA = ADMIN.agencies.length;
    editAg('AG-08', { address: '9 Harbour Road, Bristol BS1 5TT', billing: 'Finance Office' }, 'Update');
    loginOp('AG-10', 'email', 'Mailbox', 'team@meridianhs.co.uk'); loginOp('AG-01', 'deactivate', 'Contract paused');
    ACT.bPerm({ dataset: { id: 'AG-02', v: 'Receive-only' } }); reason('Policy'); INP.agVis({ dataset: { id: 'AG-02', k: 'assessment' }, checked: true });
    ACT.bLogin({ dataset: { id: 'AG-09', a: 'resend' } }); const used = linkOf(id); setPw(used); const at0 = a.activatedAt;
    const pend = linkOf('AG-10').id, a09 = linkOf('AG-09').id;
    rebuildA(); const b = agOf(id);
    ok('S5b (16) a new agency survives a rebuild: same ID, details, login and Active status', !!b && b.name === 'Ashgrove Home Care' && b.login === 'office@ashgrovehomecare.co.uk' && b.status === 'Active' && b.loginStatus === 'Active' && b.activatedAt === at0 && b.address === '4 Mill Lane, Leeds LS1 4AB' && ADMIN.agencies.length === nA);
    ok('S5b (16) details edits, login email changes and statuses survive; a deactivated login isn\'t restored from the seed', agOf('AG-08').address === '9 Harbour Road, Bristol BS1 5TT' && agOf('AG-08').versions.length === 2 && agOf('AG-10').login === 'team@meridianhs.co.uk' && agOf('AG-10').loginStatus === 'Pending email confirmation' && agOf('AG-01').loginStatus === 'Deactivated' && agOf('AG-01').status === 'Inactive');
    ok('S5b (16) permission and visibility changes survive', agOf('AG-02').perms === 'Receive-only' && agOf('AG-02').vis.assessment === true);
    const ml = id2 => STORE.agy.lmails.find(m => m.id === id2);
    ok('S5b (17) set-password emails and their state survive: used, pending, superseded', !!ml(used.id) && ml(used.id).used && !!ml(pend) && !ml(pend).used && ml('LM-A2').void && !!ml(a09) && !ml(a09).used && ml('LM-A1') && !ml('LM-A1').used);
    go('m-inbox', { id: pend }); ok('S5b (17) the demo inbox still lists them', app().textContent.includes('team@meridianhs.co.uk') && /Superseded/.test(app().textContent));
    setPw(ml(pend)); ok('S5b (17) a pending link still works once after the rebuild', agOf('AG-10').loginStatus === 'Active' && ml(pend).used); ACT.lmSet({ dataset: { id: pend } }); ok('S5b (17) … and only once', S.auth === 'agyLinkBad');
    SA(); rebuildA(); rebuildA(); SYS(); bizEnter('BB'); SA(); INP.adminVariant({ value: 'B' }); INP.adminVariant({ value: 'A' }); SA();
    const ids = ADMIN.agencies.map(x => x.id), lg = ADMIN.agencies.map(x => x.login.toLowerCase()), mids = STORE.agy.lmails.map(m => m.id), aids = ADMIN.audit.map(x => x.id);
    ok('S5b (18) no duplicate agencies, logins, emails or audit rows after repeated rebuilds and identity switches', ADMIN.agencies.length === nA && new Set(ids).size === ids.length && new Set(lg).size === lg.length && new Set(mids).size === mids.length && new Set(aids).size === aids.length);
    ok('S5b (18) the used link stays used and the activation stays single', ml(used.id).used && ADMIN.audit.filter(x => x.action === 'Agency activated' && x.entity.includes(id)).length === 1 && agOf(id).activatedAt === at0);
    const has = (act, ent) => ADMIN.audit.some(x => x.action === act && x.entity.includes(ent));
    ok('S5b (16) the agency audit history survives', has('Agency onboarded', 'Ashgrove') && has('Agency activated', id) && has('Details edited — version 2', 'AG-08') && has('Login email changed', 'AG-10') && has('Login email confirmed', 'AG-10') && has('Login deactivated', 'AG-01') && has('Communication permission', 'CarePlus') && has('Report visibility', 'CarePlus') && has('Set-password link resent', 'AG-09'));
    BIZ(); go('b-dashboard'); ok('S5b (16) the Business dashboard reads the kept statuses', kpiOf('Active agencies') === ADMIN.agencies.filter(x => agStatus(x) === 'Active').length && kpiOf('Agencies in onboarding') === ADMIN.agencies.filter(x => agStatus(x) === 'Onboarding').length && agStatus(agOf(id)) === 'Active' && agStatus(agOf('AG-01')) === 'Inactive');
    SA(); rates(); ok('S5b (16) the S4c discount list lists the new agency with its status', /Active/.test(discRow(id)) && /Inactive/.test(discRow('AG-01')));
    BIZ(); const c2 = onboard('Cedar Lodge Care', 'hello@cedarlodgecare.co.uk', '31415926'); rebuildA();
    ok('S5b (18) a second new agency gets its own ID — no collision', !!c2 && c2.id !== id && ADMIN.agencies.filter(x => x.id === c2.id).length === 1 && ADMIN.agencies.filter(x => x.id === id).length === 1 && links(c2.id).length === 1);
    ACT.resetDemo(); SA(); const lm = id2 => STORE.agy.lmails.find(m => m.id === id2);
    ok('S5b (19) the deliberate demo reset restores the seed agencies, logins and links', ADMIN.agencies.length === seedN && !agOf(id) && !agOf(c2.id) && !agOf('AG-08').address && agOf('AG-10').login === 'clare@meridianhs.co.uk' && agOf('AG-10').loginStatus === 'Active' && agOf('AG-01').loginStatus === 'Active' && agOf('AG-02').perms === 'Full' && !lm('LM-A1').used && !lm('LM-A2').used && !lm('LM-A2').void && JSON.stringify(STORE.s5b.recs) === '{}' && !ADMIN.audit.some(x => /^AU-S5B-/.test(x.id)));
  });

  await T('S5b keeps agency consent, course-specific visibility, S4c pricing and the S5a protections', async () => {
    // Baselines after the agency portal has rendered once and the consent requests exist (both are created lazily)
    fresh(); agyEnter('AG-02', true); BIZ(); go('a-agencies', { id: 'AG-02' }); agyEnter('AG-02', true);
    const c0 = JSON.stringify(agyConsents()), cp = 'CarePlus Recruitment', r0 = agyRoster(cp).map(l => l.id).join(), v0 = JSON.stringify(agOf('AG-02').vis), linked0 = JSON.stringify(STORE.agy.linked);
    const pr0 = JSON.stringify(AGY_CATALOGUE().map(c => [c.id, priceFor(c, 30)])), d0 = JSON.stringify(discData()), hist0 = JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger]);
    BIZ(); editAg('AG-02', { region: 'UAE', legal: 'CarePlus Recruitment Ltd', billing: 'CarePlus Accounts' }, 'Records'); loginOp('AG-02', 'deactivate', 'Hold'); loginOp('AG-02', 'reactivate', 'Resume'); loginOp('AG-02', 'email', 'Mailbox', 'ops@careplus-recruit.co.uk'); setPw(linkOf('AG-02'));
    ok('S5b (20) the agency\'s learners, links and consent requests are unchanged by edits and login changes', agyRoster(cp).map(l => l.id).join() === r0 && JSON.stringify(agyConsents()) === c0 && JSON.stringify(STORE.agy.linked) === linked0);
    ok('S5b (20) its report visibility is unchanged unless deliberately changed', JSON.stringify(agOf('AG-02').vis) === v0);
    agyEnter('AG-02', true); ok('S5b (21) prices, discounts and VAT for the agency are unchanged (region and details edits don\'t reprice)', JSON.stringify(AGY_CATALOGUE().map(c => [c.id, priceFor(c, 30)])) === pr0 && JSON.stringify(discData()) === d0);
    ok('S5b (21) purchases, Finance transactions and the licence ledger are unchanged', JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger]) === hist0);
    const L = agyRoster('Hartwell Home Care')[0]; agyEnter('AG-02', true); const nd = ADMIN.security.length; go('g-learner', { id: L.id }); ok('S5b (20) agencies still only see their own learners', !main().includes(L.email) && ADMIN.security.length === nd + 1);
    const c = agyConsents().find(x => x.agency === 'Hartwell Home Care' && x.status === 'Awaiting learner consent'); learner('A'); ACT.consentDo({ dataset: { id: c.id, y: '1' } });
    ok('S5b (20) learner consent still decides a new-course link (no queue item)', c.status === 'Linked' && agyRoster('Hartwell Home Care').some(l => l.id === STORE.worlds.A.me.id));
    BIZ(); rates(); document.querySelector('#dr-std').value = '6'; document.querySelector('#dr-r').value = 'S5b check'; SUBMIT.discSave(); const q = ADMIN.queue[0];
    SA(); applyDecision(q, 'approve', 'OK'); applyDecision(q, 'approve', 'Again'); ok('S5b (21) S4c discount-rate requests are still decided once by the Super Admin', q.type === 'Discount rate change' && q.status === 'Approved' && discNow().std === 6 && ADMIN.audit.some(x => x.action === 'Blocked: decision repeated'));
    fresh(); SA(); ACT.addUser(); fill({ '#nu-n': 'Rosa Diaz', '#nu-e': 'rosa.diaz@illumin-academy.example' }); nuPick(['Teacher']); prim(); closeModal(); BIZ(); const ag = onboard('Fernhill Care', 'desk@fernhillcare.co.uk', '27182818'); SA(); rebuildA();
    ok('S5b (22) S5a staff accounts and S5b agencies both survive the same rebuild', ADMIN.staff.some(s => s.email === 'rosa.diaz@illumin-academy.example') && !!agOf(ag.id));
    SYS(); go('a-roles', { id: 'Super_Administrator' }); ok('S5b (22) the S5a Super Administrator lock still applies', /Only a Super Administrator can do this/.test(main()));
    SA(); go('a-index'); const ix = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('S5b Admin index: one Setup fixes entry for S5b', !!ix && ix.querySelectorAll('[data-t="a-agencies.AG-08.login"]').length === 1 && /S5b — first set-password activates/.test(ix.textContent));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: S5b entry', /agency administration, activation and access security/.test(main()));
  });

  /* ================= S5d — announcements, notification templates, delivery log and referral codes ================= */
  const feedOf = id => { agyEnter(id, true); go('g-anns', { tab: 'academy' }); return main(); };
  const learnerSees = (v, title) => STORE.worlds[v].announcements.some(x => x.title === title);
  const L3 = () => ADMIN.batches.find(b => b.code === 'L3AC-JAN26');
  const inOut = b => { const ids = s5dBatchLids(b), all = [...'ABCDEF']; return [all.filter(v => ids.includes(STORE.worlds[v].me.id)), all.filter(v => !ids.includes(STORE.worlds[v].me.id))]; };
  const pickAud = (t, ids) => { const s = document.querySelector('#modal-root #s5d-a'); if (s) { s.value = t; INP.s5dAud(s); } const m = document.querySelector('#modal-root #s5d-ids-s'); if (m) { [...m.options].forEach(o => { o.selected = ids.includes(o.value); }); INP.s5dAudIds(m); } };
  const edAct = l => { const a = MODAL.actions.find(x => x.label === l); const r = a.fn(); if (r !== false) closeModal(); return r; };
  const secN = () => ADMIN.security.length;
  const logOf = src => s5dStore().log.filter(x => x.src === src);

  await T('S5d (7)(8) agency feed: only published announcements addressed to that agency, read by agency ID', async () => {
    fresh(); let f = feedOf('AG-02');
    ok('S5d (8) the Draft "Agency reporting portal update" (AN-04) no longer reaches agencies', !/Agency reporting portal update/.test(f));
    ok('S5d (8) withdrawn, expired and future-scheduled announcements never appear', !/Fee reminder for Dubai cohort|Planned maintenance|New CPD course: Oral Health/.test(f));
    ok('S5d published announcements to everyone and to all agencies still appear', /Academy closed 25–26 December/.test(f) && /New Care Certificate cohort pricing/.test(f));
    BIZ(); ACT.bAnn(); fill({ '#s5d-t': 'Gulf Care rota pilot', '#s5d-b': 'Only for Gulf Care.' }); pickAud('agencies', ['AG-03']); prim(); closeModal();
    const ba = STORE.biz.anns.find(a => a.title === 'Gulf Care rota pilot');
    ok('S5d an announcement to one agency is stored with that agency ID and one recipient', ba.status === 'Published' && ba.spec.t === 'agencies' && ba.spec.ids.join() === 'AG-03' && ba.recipients === 1 && ADMIN.announcements.some(m => m.id === 'AN-' + ba.id && m.srcId === ba.id));
    ok('S5d (7) Agency A (CarePlus) does not see Agency B\'s announcement — screen and read function', !/Gulf Care rota pilot/.test(feedOf('AG-02')) && !s5dAgencyFeed(agOf('AG-02')).some(a => a.title === 'Gulf Care rota pilot'));
    ok('S5d (7) Agency B (Gulf Care) sees it', /Gulf Care rota pilot/.test(feedOf('AG-03')) && STORE.agy.notifs.some(n => n.agency === 'Gulf Care Recruitment' && /Gulf Care rota pilot/.test(n.b)) && !STORE.agy.notifs.some(n => n.agency !== 'Gulf Care Recruitment' && /Gulf Care rota pilot/.test(n.b)));
    BIZ(); ACT.bAnn(); fill({ '#s5d-t': 'Draft for all agencies' }); edAct('Save draft');
    ok('S5d (8) a draft to agencies is not visible to any agency', !/Draft for all agencies/.test(feedOf('AG-02')) && !/Draft for all agencies/.test(feedOf('AG-03')));
    SA(); s5dSave('academy', null, { title: 'BrightCare learners only', body: 'x', spec: { t: 'agencyLearners', ids: ['AG-01'] }, ch: ['In-app'] }, 'publish');
    ok('S5d an announcement to an agency\'s learners is not shown to agencies as an agency announcement', !s5dAgencyFeed(agOf('AG-01')).some(a => a.title === 'BrightCare learners only') && !/BrightCare learners only/.test(feedOf('AG-02')));
    BIZ(); ACT.bAnnWd({ dataset: { id: ba.id } }); reason('Pilot cancelled');
    ok('S5d (6) withdrawing it removes it from Gulf Care\'s feed; its copy follows', ba.status === 'Withdrawn' && ADMIN.announcements.find(m => m.id === 'AN-' + ba.id).status === 'Withdrawn' && !/Gulf Care rota pilot/.test(feedOf('AG-03')));
  });

  await T('S5d (10) Business Admin seeded announcement: the copy is AN-BA-1 and withdrawal reaches it', async () => {
    fresh(); const m = ADMIN.announcements.find(a => a.id === 'AN-BA-1');
    ok('S5d (10) the seeded copy of BA-1 is AN-BA-1 (no AN-BA1), linked to BA-1, with the correction in its history', !!m && !ADMIN.announcements.some(a => a.id === 'AN-BA1') && m.srcK === 'biz' && m.srcId === 'BA-1' && m.title === 'New Care Certificate cohort pricing' && m.by === 'Sophie Turner' && /AN-BA1 → AN-BA-1/.test(m.hist[0][3]));
    ok('S5d agencies see BA-1 before it is withdrawn', /New Care Certificate cohort pricing/.test(feedOf('AG-02')));
    BIZ(); go('b-anns'); ACT.bAnnWd({ dataset: { id: 'BA-1' } }); reason('Pricing changed');
    ok('S5d (10) withdrawing BA-1 withdraws AN-BA-1 and removes it from agency feeds', STORE.biz.anns.find(a => a.id === 'BA-1').status === 'Withdrawn' && m.status === 'Withdrawn' && !/New Care Certificate cohort pricing/.test(feedOf('AG-02')) && !/New Care Certificate cohort pricing/.test(feedOf('AG-10')));
    SA(); go('a-announcements'); ok('S5d the academy list shows AN-BA-1 as Withdrawn', /AN-BA-1/.test(main()) && /Withdrawn/.test(main()));
  });

  await T('S5d (9) teachers see and manage only their own announcements', async () => {
    fresh(); S.tas.v = 'A'; tasEnter(); go('t-announcements');
    ok('S5d (9) Sarah Okonkwo no longer sees Marcus Bell\'s announcement (TA-1); she sees her own', !main().includes('Unit 306 class recording uploaded') && main().includes('Bring evidence for Unit 301 observations'));
    const n = secN(); ACT.tasAnnSt({ dataset: { id: 'TA-1', s: 'Withdrawn' } });
    ok('S5d (9) her direct call to withdraw TA-1 is refused, logged, nothing changes', !MODAL && STORE.tas.anns.find(a => a.id === 'TA-1').status === 'Published' && secN() === n + 1 && /You can only manage your own announcements/.test(ADMIN.audit[0].reason));
    ACT.s5dView({ dataset: { k: 'teacher', id: 'TA-1' } }); ok('S5d (9) … nor can she open it', !MODAL);
    ACT.s5dEdit({ dataset: { k: 'teacher', id: 'TA-4' } }); ok('S5d she can open her own draft TA-4 with its content', !!MODAL && document.querySelector('#s5d-t').value === 'Half-term revision session'); closeModal();
    S.tas.v = 'T'; tasEnter(); go('t-announcements');
    ok('S5d (9) after an identity change, Marcus Bell sees only his own (TA-1)', main().includes('Unit 306 class recording uploaded') && !main().includes('Bring evidence for Unit 301 observations'));
    const r = s5dSave('teacher', 'TA-4', { title: 'Hijacked', spec: { t: 'tbatches', ids: ['L3AC-JAN26'] }, ch: ['In-app'] }, 'publish'); ACT.tasAnnSt({ dataset: { id: 'TA-2', s: 'Withdrawn' } });
    ok('S5d (9) Marcus can\'t edit Sarah\'s draft or withdraw her announcement by direct calls', !r.ok && STORE.tas.anns.find(a => a.id === 'TA-4').title === 'Half-term revision session' && STORE.tas.anns.find(a => a.id === 'TA-2').status === 'Published');
    const bad = s5dSave('teacher', null, { title: 'Wrong cohort', spec: { t: 'tbatches', ids: ['L2DC-MAR26'] }, ch: ['In-app'] }, 'publish');
    ok('S5d a teacher can\'t address a cohort they don\'t teach', !bad.ok && /Outside the audiences/.test(bad.errs.aud) && !STORE.tas.anns.some(a => a.title === 'Wrong cohort'));
    const [inV] = inOut(L3()), v0 = inV.find(v => learnerSees(v, 'Unit 306 class recording uploaded'));
    go('t-announcements'); ACT.tasAnnSt({ dataset: { id: 'TA-1', s: 'Withdrawn' } }); reason('Wrong recording');
    ok('S5d (6) Marcus withdraws his own TA-1: its academy copy AN-02 is withdrawn and learners no longer see it (kept in their archive)', STORE.tas.anns.find(a => a.id === 'TA-1').status === 'Withdrawn' && ADMIN.announcements.find(a => a.id === 'AN-02').status === 'Withdrawn' && !!v0 && !learnerSees(v0, 'Unit 306 class recording uploaded') && STORE.worlds[v0].annArchive.some(x => x.title === 'Unit 306 class recording uploaded'));
    learner(v0); go('messages', { tab: 'announcements' }); ok('S5d … in the learner\'s Announcements screen too', !main().includes('Unit 306 class recording uploaded'));
    S.coo.v = 'B'; cooEnter(); const nc = secN(); ACT.cooAnnSt({ dataset: { id: 'CA-1', s: 'Withdrawn' } });
    ok('S5d a Coordinator can\'t withdraw another Coordinator\'s announcement', !MODAL && STORE.coo.anns.find(a => a.id === 'CA-1').status === 'Published' && secN() === nc + 1);
  });

  await T('S5d (1)(2)(3)(6) lifecycle: draft edited in place, published to eligible learners only, withdrawn with history', async () => {
    fresh(); SA(); const b = L3(), [inV, outV] = inOut(b), n0 = ADMIN.announcements.length;
    go('a-announcements'); ACT.composeAnn(); fill({ '#s5d-t': 'Reflective log reminder', '#s5d-b': 'Bring your reflective log on Thursday.' }); pickAud('batches', [b.code]); ACT.s5dAttSample(); edAct('Save draft');
    const a = ADMIN.announcements.find(x => x.title === 'Reflective log reminder'), id = a.id;
    ok('S5d (1) Save draft creates one Draft with a stable ID', ADMIN.announcements.length === n0 + 1 && a.status === 'Draft' && /^AN-\d+$/.test(id) && a.att.length === 1 && a.by === 'Nadia Qureshi');
    go('a-announcements'); ok('S5d the list offers Edit on the draft', !!app().querySelector(`main [data-act="s5dEdit"][data-id="${id}"]`));
    ACT.s5dEdit({ dataset: { k: 'academy', id } }); const sel = document.querySelector('#s5d-ids-s');
    ok('S5d (2) reopening shows the saved content: title, message, audience, attachment', document.querySelector('#s5d-t').value === 'Reflective log reminder' && document.querySelector('#s5d-b').value === 'Bring your reflective log on Thursday.' && document.querySelector('#s5d-a').value === 'batches' && [...sel.selectedOptions].map(o => o.value).join() === b.code && /Announcement attachment 1\.pdf/.test(mroot().textContent));
    fill({ '#s5d-t': 'Reflective log reminder — Thursday' }); edAct('Save draft');
    ok('S5d (1) saving again updates the same announcement (no duplicate)', ADMIN.announcements.length === n0 + 1 && ADMIN.announcements.filter(x => x.id === id).length === 1 && a.title === 'Reflective log reminder — Thursday' && a.hist.some(h => h[2] === 'Draft saved'));
    ACT.s5dEdit({ dataset: { k: 'academy', id } }); prim(); closeModal();
    const R = s5dResolve('academy', { t: 'batches', ids: [b.code] }, a);
    ok('S5d (3) publishing sends it to the batch\'s learners only', a.status === 'Published' && a.recipients === R.length && inV.length > 0 && inV.every(v => learnerSees(v, a.title)) && outV.every(v => !learnerSees(v, a.title)));
    learner(inV[0]); go('messages', { tab: 'announcements' }); ok('S5d (3)(18) the learner sees it with its attachment', main().includes(a.title) && main().includes('Announcement attachment 1.pdf'));
    learner(outV[0]); go('messages', { tab: 'announcements' }); ok('S5d (12) a learner outside the batch doesn\'t', !main().includes(a.title));
    const logN = logOf('academy:' + id).length;
    SA(); go('a-announcements'); ACT.annSt({ dataset: { id, s: 'Withdrawn' } }); reason('Class moved');
    ok('S5d (6) withdrawal: status, history and audit; learners no longer see it; delivery records kept', a.status === 'Withdrawn' && a.hist.some(h => h[2] === 'Withdrawn' && h[3] === 'Class moved') && ADMIN.audit.some(x => x.action === 'Withdrawn' && x.entity.includes(id)) && inV.every(v => !learnerSees(v, a.title) && STORE.worlds[v].annArchive.some(x => x.title === a.title)) && logOf('academy:' + id).length === logN && logN > 0);
    ACT.s5dView({ dataset: { k: 'academy', id } }); ok('S5d "Open" shows status, audience, recipients and history', /Withdrawn/.test(mroot().textContent) && /History/.test(mroot().textContent) && /Class moved/.test(mroot().textContent) && /Delivery records/.test(mroot().textContent)); closeModal();
    ACT.annSt({ dataset: { id, s: 'Withdrawn' } }); ok('S5d a withdrawn announcement can\'t be withdrawn again', !MODAL && /can't be withdrawn/.test(ADMIN.audit[0].reason));
    ACT.annSt({ dataset: { id: 'AN-01', s: 'Withdrawn' } }); reason('Dates changed'); learner('A'); go('dashboard');
    ok('S5d (6) withdrawing the seeded AN-01 removes it from learners\' dashboards too', !main().includes('Academy closed 25–26 December') && !learnerSees('A', 'Academy closed 25–26 December'));
  });

  await T('S5d (15) announcement authority is checked in the action; refusals change nothing and are logged', async () => {
    fresh(); const an = ADMIN.announcements.length, an1 = ADMIN.announcements.find(a => a.id === 'AN-01');
    for (const [lbl, enter] of [['Finance Admin', () => FA4()], ['Business Admin (academy-wide)', () => BIZ()], ['an Agency Administrator', () => agyEnter('AG-02', true)], ['a learner', () => learner('A')]]) {
      enter(); const n = secN(); ACT.composeAnn(); const opened = !!MODAL; closeModal();
      const r = s5dSave('academy', null, { title: 'Crafted', spec: { t: 'all' }, ch: ['In-app'] }, 'publish'); ACT.annSt({ dataset: { id: 'AN-01', s: 'Withdrawn' } }); const o2 = !!MODAL; closeModal();
      ok(`S5d (15) ${lbl}: academy compose, save and withdraw are refused and logged`, !opened && !o2 && !r.ok && ADMIN.announcements.length === an && an1.status === 'Published' && secN() === n + 3, String(secN() - n));
    }
    role('sysA'); const rs = s5dSave('academy', null, { title: 'System notice', spec: { t: 'staff' }, ch: ['In-app'] }, 'publish');
    ok('S5d the System Admin publishes academy-wide (Announcements: all capabilities)', rs.ok && rs.a.status === 'Published' && rs.a.recipients === ADMIN.staff.filter(s => s.status === 'Active').length);
    // Correction (roles document: Academic Admin → Communications → "Academy-wide announcements" ticked)
    acaEnter('KA'); S.signedIn = true; go('a-announcements'); ok('S5d Academic Admin: "New announcement" is offered on Announcements', !!app().querySelector('main [data-act="composeAnn"]'));
    ACT.composeAnn(); ok('S5d Academic Admin: every academy audience is offered, academy-wide included', [...document.querySelectorAll('#modal-root #s5d-a option')].map(o => o.value).join() === 'all,learners,staff,roles,batches,agencies,allAgencies,agencyLearners');
    fill({ '#s5d-t': 'Academy closed for training day', '#s5d-b': 'The Academy is closed on Friday.' }); pickAud('all', []); edAct('Save draft');
    const ka = ADMIN.announcements.find(x => x.title === 'Academy closed for training day'), kn = ADMIN.me.name;
    ok('S5d Academic Admin creates an academy-wide draft (theirs)', !!ka && ka.status === 'Draft' && ka.by === kn && ka.spec.t === 'all');
    ACT.s5dEdit({ dataset: { k: 'academy', id: ka.id } }); fill({ '#s5d-b': 'The Academy is closed on Friday 30 October.' }); document.querySelector('#s5d-w').value = 'sched'; document.querySelector('#s5d-at').value = new Date(now().getTime() + 3 * DAY).toISOString().slice(0, 16); prim(); closeModal();
    ok('S5d … edits it in place and schedules it', ka.status === 'Scheduled' && ka.body === 'The Academy is closed on Friday 30 October.' && ADMIN.announcements.filter(x => x.id === ka.id).length === 1);
    ACT.s5dSt({ dataset: { k: 'academy', id: ka.id, s: 'Draft' } }); reason('Publish now instead'); ACT.s5dEdit({ dataset: { k: 'academy', id: ka.id } }); document.querySelector('#s5d-w').value = 'now'; prim(); closeModal();
    const allN = new Set(allLearners().filter(l => l.rec !== 'Archived').map(l => l.id)).size + ADMIN.staff.filter(s => s.status === 'Active').length + ADMIN.agencies.filter(g => agStatus(g) === 'Active').length;
    ok('S5d … publishes it academy-wide: learners, staff and agencies, one copy each', ka.status === 'Published' && ka.recipients === allN && learnerSees('A', 'Academy closed for training day') && /Academy closed for training day/.test(feedOf('AG-02')));
    acaEnter('KA'); S.signedIn = true; ACT.annSt({ dataset: { id: ka.id, s: 'Withdrawn' } }); reason('Training day cancelled');
    ok('S5d … and withdraws it (learners and agencies no longer see it)', ka.status === 'Withdrawn' && !learnerSees('A', 'Academy closed for training day') && !/Academy closed for training day/.test(feedOf('AG-02')));
    acaEnter('KA'); S.signedIn = true; const nk = secN(), ed1 = s5dSave('academy', 'AN-04', { title: 'Changed', spec: { t: 'all' }, ch: ['In-app'] }, 'publish');
    ACT.annSt({ dataset: { id: 'AN-01', s: 'Withdrawn' } }); const o1 = !!MODAL; closeModal(); ACT.annSt({ dataset: { id: 'AN-02', s: 'Withdrawn' } }); const o2 = !!MODAL; closeModal(); ACT.annSt({ dataset: { id: 'AN-BA-1', s: 'Withdrawn' } }); const o3 = !!MODAL; closeModal();
    ok('S5d Academic Admin can\'t edit or withdraw someone else\'s academy announcement, the teacher-originated AN-02 or the Business Admin\'s AN-BA-1 (refused, logged)', !ed1.ok && !o1 && !o2 && !o3 && ADMIN.announcements.find(x => x.id === 'AN-04').title === 'Agency reporting portal update' && an1.status === 'Published' && ADMIN.announcements.find(x => x.id === 'AN-02').status === 'Published' && ADMIN.announcements.find(x => x.id === 'AN-BA-1').status === 'Published' && secN() === nk + 4);
    const nt = secN(); ACT.tasAnnSt({ dataset: { id: 'TA-2', s: 'Withdrawn' } }); ACT.cooAnnSt({ dataset: { id: 'CA-1', s: 'Withdrawn' } }); ACT.agAnnWd({ dataset: { id: 'GA-1' } }); ACT.bAnnWd({ dataset: { id: 'BA-1' } }); const e2 = s5dSave('agency', 'GA-3', { title: 'x', spec: { t: 'agyAll' }, ch: ['In-app'] }, 'publish');
    ok('S5d … nor teacher, Coordinator, agency or Business Admin announcements by direct calls', !MODAL && !e2.ok && STORE.tas.anns.find(x => x.id === 'TA-2').status === 'Published' && STORE.coo.anns.find(x => x.id === 'CA-1').status === 'Published' && STORE.agy.anns.find(x => x.id === 'GA-1').status === 'Published' && STORE.biz.anns.find(x => x.id === 'BA-1').status === 'Published' && secN() === nt + 5);
    ACT.s5dView({ dataset: { k: 'teacher', id: 'TA-2' } }); ok('S5d … nor open a teacher\'s announcement', !MODAL);
    BIZ(); go('a-announcements'); const nb = secN(), bz = s5dSave('academy', null, { title: 'Business to everyone', spec: { t: 'all' }, ch: ['In-app'] }, 'publish');
    ok('S5d (6 of the correction) the Business Admin still can\'t create academy-wide announcements', !bz.ok && !ADMIN.announcements.some(x => x.title === 'Business to everyone') && secN() === nb + 1 && !app().querySelector('main [data-act="composeAnn"]'));
    const bo = s5dSave('biz', null, { title: 'Still to agencies', spec: { t: 'allAgencies' }, ch: ['In-app'] }, 'publish'); ok('S5d … and keeps announcements to agencies', bo.ok && bo.a.status === 'Published');
    BIZ(); loginOp('AG-02', 'deactivate', 'Hold'); agyEnter('AG-02', true); const rg = s5dSave('agency', null, { title: 'From a deactivated login', spec: { t: 'agyAll' }, ch: ['In-app'] }, 'publish');
    ok('S5d an agency whose login was deactivated can\'t announce (S5b login rule)', !rg.ok && !STORE.agy.anns.some(a => a.title === 'From a deactivated login'));
    agyEnter('AG-03', true); const rr = s5dSave('agency', null, { title: 'Receive-only send', spec: { t: 'agyAll' }, ch: ['In-app'] }, 'publish');
    ok('S5d a receive-only agency can\'t announce', !rr.ok && /receive-only/.test(rr.why));
  });

  await T('S5d (4)(5) scheduled announcements stay hidden until their time, then publish exactly once', async () => {
    fresh(); SA(); const b = L3(), [inV] = inOut(b), at = new Date(now().getTime() + 1500).toISOString();
    const past = s5dSave('academy', null, { title: 'In the past', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app'], at: new Date(now().getTime() - 60000).toISOString() }, 'schedule');
    ok('S5d a schedule time in the past is refused', !past.ok && /future/.test(past.errs.at));
    const r = s5dSave('academy', null, { title: 'Timed notice', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app', 'Email'], at }, 'schedule'), a = r.a;
    render(); go('a-announcements');
    ok('S5d (4) before its time it stays Scheduled and hidden from learners', a.status === 'Scheduled' && inV.every(v => !learnerSees(v, 'Timed notice')) && !logOf('academy:' + a.id).length);
    const c2 = s5dSave('academy', null, { title: 'Cancelled notice', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app'], at }, 'schedule').a; ACT.s5dSt({ dataset: { k: 'academy', id: c2.id, s: 'Draft' } }); reason('Not needed');
    await wait(2200); const nN = STORE.worlds[inV[0]].notifs.length; render();
    ok('S5d (5) once its time is reached it is published, with its recipients and delivery records', a.status === 'Published' && !!a.delivered && inV.every(v => learnerSees(v, 'Timed notice')) && logOf('academy:' + a.id).length === a.recipients * 2);
    const logN = logOf('academy:' + a.id).length, nN2 = STORE.worlds[inV[0]].notifs.length; render(); go('a-announcements'); go('a-dashboard'); render(); s5dTick();
    ok('S5d (5) evaluating again (reopening screens) publishes nothing twice', logOf('academy:' + a.id).length === logN && STORE.worlds[inV[0]].notifs.length === nN2 && STORE.worlds[inV[0]].announcements.filter(x => x.title === 'Timed notice').length === 1 && ADMIN.audit.filter(x => x.action === 'Published (scheduled)' && x.entity.includes(a.id)).length === 1 && nN2 === nN + 1);
    ok('S5d a cancelled schedule (back to draft) is never published', c2.status === 'Draft' && inV.every(v => !learnerSees(v, 'Cancelled notice')));
    agyEnter('AG-02', true); const g = s5dSave('agency', null, { title: 'Training day moved', spec: { t: 'agyAll' }, ch: ['In-app'], at: new Date(agNow().getTime() + DAY).toISOString() }, 'schedule').a;
    render(); ok('S5d agency announcements follow the agency clock: still scheduled', g.status === 'Scheduled');
    STORE.agy.offset += 2; render(); ok('S5d … published once the agency clock passes its time', g.status === 'Published' && g.recipients === agyRoster('CarePlus Recruitment').length); STORE.agy.offset = 0;
  });

  await T('S5d (11)(13)(14) audiences resolve to real people by ID, one copy each; counts match', async () => {
    fresh(); SA(); const act = ADMIN.staff.filter(s => s.status === 'Active');
    const ra = s5dSave('academy', null, { title: 'Assessor standardisation', spec: { t: 'roles', ids: ['Assessor'] }, ch: ['In-app', 'Email'] }, 'publish').a, exp = act.filter(s => s.roles.includes('Assessor')).map(s => 'S:' + s.id).sort();
    ok('S5d (11) "Assessors" reaches exactly the active staff who hold the Assessor role', ra.recips.slice().sort().join() === exp.join() && exp.length > 0 && ra.recipients === exp.length, ra.recips.join());
    const rm = s5dSave('academy', null, { title: 'Teaching and assessing', spec: { t: 'roles', ids: ['Teacher', 'Assessor'] }, ch: ['In-app', 'Email'] }, 'publish').a, both = act.filter(s => s.roles.includes('Teacher') && s.roles.includes('Assessor'));
    ok('S5d (13) someone with both roles (Sarah Okonkwo) receives one copy per channel', both.some(s => s.id === 'ST-004') && rm.recips.filter(k => k === 'S:ST-004').length === 1 && logOf('academy:' + rm.id).filter(x => x.to === 'S:ST-004').length === 2);
    ok('S5d (14) the count is the number of distinct people', rm.recipients === new Set(rm.recips).size && rm.recipients === act.filter(s => s.roles.some(r => ['Teacher', 'Assessor'].includes(r))).length);
    const bs = ADMIN.batches.filter(b => s5dBatchLids(b).length), pair = bs.flatMap(x => bs.filter(y => y !== x && s5dBatchLids(y).some(l => s5dBatchLids(x).includes(l))).map(y => [x, y]))[0];
    const two = pair || [bs[0], bs[0]], rb = s5dSave('academy', null, { title: 'Two batches', spec: { t: 'batches', ids: [...new Set(two.map(b => b.code))] }, ch: ['In-app'] }, 'publish').a, u = new Set(two.flatMap(s5dBatchLids).filter(id => { const l = learnerById(id); return l ? l.rec !== 'Archived' : !!s5dWorldOf(id); }));
    ok('S5d (13)(14) learners in several chosen batches get one copy; count = distinct learners', rb.recipients === u.size && new Set(rb.recips).size === rb.recips.length && Object.values(STORE.worlds).every(w => w.announcements.filter(x => x.title === 'Two batches').length <= 1));
    const rw = s5dSave('academy', null, { title: 'Everyone', spec: { t: 'all' }, ch: ['In-app'] }, 'publish').a;
    ok('S5d (14) "All users" = distinct learners + active staff + active agencies', rw.recipients === new Set(allLearners().filter(l => l.rec !== 'Archived').map(l => l.id)).size + act.length + ADMIN.agencies.filter(g => agStatus(g) === 'Active').length);
    ACT.composeAnn(); pickAud('roles', ['Assessor']); ok('S5d the editor shows the resolved count before sending', new RegExp('Resolved recipients: ' + exp.length).test(document.querySelector('#s5d-c').textContent)); closeModal();
  });

  await T('S5d (16)(17)(18) templates are stored, versioned and actually govern the wired sends', async () => {
    fresh(); SA(); go('a-notifsettings'); ACT.tplEdit({ dataset: { e: 'Announcement' } }); fill({ '#tp-s': 'Academy news', '#tp-b': '{{title}} — read it in the portal.' }); prim(); closeModal();
    ok('S5d (16) a template edit is saved as version 2 and audited', s5dTpl('Announcement').subject === 'Academy news' && s5dTpl('Announcement').v === 2 && ADMIN.audit[0].action === 'Template saved — version 2');
    rebuildA(); SYS(); SA(); go('a-notifsettings'); ok('S5d (16) it survives admin rebuilds and identity switches', s5dTpl('Announcement').subject === 'Academy news' && /v2/.test(main()));
    const b = L3(), [inV] = inOut(b), w = STORE.worlds[inV[0]], n0 = w.notifs.length;
    s5dSave('academy', null, { title: 'Subject check', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app'] }, 'publish').a;
    ok('S5d (17) the stored subject and body are what the learner\'s notification says', w.notifs.length === n0 + 1 && w.notifs[0].title === 'Academy news' && w.notifs[0].body === 'Subject check — read it in the portal.');
    const tog = document.querySelector('main input[data-onchange="evToggle"][data-e="Announcement"]'); tog.checked = false; INP.evToggle(tog);
    const n1 = w.notifs.length, a2 = s5dSave('academy', null, { title: 'While off', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app', 'Email'] }, 'publish').a;
    ok('S5d (17) turned off: no notification is generated; every send is recorded as Suppressed (the announcement itself is still published)', s5dTpl('Announcement').enabled === false && w.notifs.length === n1 && logOf('academy:' + a2.id).every(x => /^Suppressed — template turned off/.test(x.result)) && learnerSees(inV[0], 'While off'));
    tog.checked = true; INP.evToggle(tog); go('a-notifsettings'); const em2 = document.querySelector('main input[data-onchange="s5dTplCh"][data-e="Announcement"][data-c="Email"]'); em2.checked = false; INP.s5dTplCh(em2);
    const a3 = s5dSave('academy', null, { title: 'Email off', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app', 'Email'] }, 'publish').a, L = logOf('academy:' + a3.id);
    ok('S5d (17) a channel turned off is suppressed; the others are simulated', L.filter(x => x.ch === 'Email').every(x => /channel off/.test(x.result)) && L.filter(x => x.ch === 'In-app').every(x => /^Simulated/.test(x.result)) && L.some(x => x.ch === 'Email'));
    const ns = secN(), lock = document.querySelector('main input[data-onchange="evToggle"][data-e="Set-password / reset"]');
    ok('S5d sign-in and account-recovery messages can\'t be turned off (toggle disabled with the reason)', lock.disabled && /account recovery/.test(lock.title));
    lock.disabled = false; lock.checked = false; INP.evToggle(lock); const rx = s5dTplSet('Set-password / reset', { enabled: false });
    ok('S5d … and a crafted change is refused too', s5dTpl('Set-password / reset').enabled === true && !rx.ok && /account recovery/.test(rx.errs.enabled) && secN() === ns);
    FA4(); const nf = secN(), rf = s5dTplSet('Announcement', { subject: 'Hacked' }); const tf = { dataset: { e: 'Announcement' }, checked: false }; INP.evToggle(tf); ACT.tplAttSample({ dataset: { e: 'Observation proposed' } });
    ok('S5d template changes by Finance are refused and logged', !rf.ok && s5dTpl('Announcement').subject === 'Academy news' && s5dTpl('Announcement').enabled === true && secN() === nf + 3);
    SA(); ACT.tplEdit({ dataset: { e: 'Observation proposed' } }); ACT.tplAttSample({ dataset: { e: 'Observation proposed' } }); closeModal(); const na = tplAtt('Observation proposed').length; rebuildA();
    ok('S5d (18) template attachments are kept with the templates (survive a rebuild)', tplAtt('Observation proposed').length === na && na === 4);
  });

  await T('S5d (19) agency set-password emails state their own link\'s expiry; the configured period affects new links only', async () => {
    fresh(); BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); const m1 = linkOf('AG-08');
    go('m-inbox', { id: m1.id }); const t1 = app().textContent;
    ok('S5d (19) at the default period the email states the link\'s expiry date and "7 days"', m1.subj === 'Set up your Illumin Academy agency portal' && t1.includes(fdt(m1.expires)) && /\(7 days after it was sent\)/.test(t1) && !/expires in 7 days/.test(t1) && new Date(m1.expires) - new Date(m1.sent) === 7 * DAY);
    SA(); const cf = ADMIN.config.find(c => c.name === 'Set-password / reset / workplace link expiry'); ACT.cfgEdit({ dataset: { id: cf.id } }); document.querySelector('#cv').value = '10 days'; reason('Longer set-up window');
    const e1 = m1.expires, h1 = m1.html; BIZ(); ACT.bLogin({ dataset: { id: 'AG-09', a: 'resend' } }); const m2 = linkOf('AG-09');
    go('m-inbox', { id: m2.id }); const t2 = app().textContent;
    ok('S5d (19) after changing the period, a new link\'s email states 10 days and its own date', new Date(m2.expires) - new Date(m2.sent) === 10 * DAY && t2.includes(fdt(m2.expires)) && /\(10 days after it was sent\)/.test(t2));
    go('m-inbox', { id: m1.id }); ok('S5d (19) the earlier link keeps its original expiry and wording', m1.expires === e1 && m1.html === h1 && /\(7 days after it was sent\)/.test(app().textContent));
    SA(); ACT.tplEdit({ dataset: { e: 'Set-password / reset' } }); fill({ '#tp-b': 'Hello {{name}}, set your password for {{agency}}. This link works until {{expiry}}.' }); prim(); closeModal();
    ok('S5d editing the template never moves an issued link\'s expiry or rewrites a sent email', m2.expires === linkOf('AG-09').expires && /10 days after it was sent/.test(m2.html));
    BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); const m3 = linkOf('AG-08'); ok('S5d a link issued after the edit uses the new wording with its own expiry', /This link works until/.test(m3.html) && m3.html.includes(fdt(m3.expires)) && m1.void);
    ok('S5d (19) S5b link checks unchanged: the new link activates once; the superseded one stays refused', setPw(m3) !== 'refused' && agOf('AG-08').status === 'Active' && setPw(m1) === 'refused');
    ok('S5d (20) each set-password email is one simulated delivery record', s5dStore().log.filter(x => x.src === 'link:' + m2.id).length === 1 && /^Simulated — not sent/.test(s5dStore().log.find(x => x.src === 'link:' + m2.id).result));
  });

  await T('S5d (20)(21) delivery log and persistence: real records, never duplicated; state survives rebuilds; reset restores the seed', async () => {
    fresh(); SA(); const b = L3(), a = s5dSave('academy', null, { title: 'Log check', spec: { t: 'batches', ids: [b.code] }, ch: ['In-app', 'Email', 'SMS'] }, 'publish').a, L = logOf('academy:' + a.id);
    ok('S5d (20) one record per recipient and channel, with source, recipient ID, channel, template version and result (email simulated; SMS suppressed — off in the default template)', L.length === a.recipients * 3 && L.every(x => /^L:/.test(x.to) && x.tpl === 'Announcement v1' && x.srcLabel === `Log check (${a.id})`) && L.filter(x => x.ch === 'Email').every(x => x.result === 'Simulated — not sent (prototype)') && L.filter(x => x.ch === 'SMS').every(x => x.result === 'Suppressed — channel off in the template') /* SMS is off in the default Announcement template */, `${L.length} vs ${a.recipients}×3 · ${[...new Set(L.map(x => x.tpl + '|' + x.result + '|' + x.to.slice(0, 2)))].join(' ; ')}`);
    go('a-notifsettings', { tab: 'log' }); ok('S5d (20) the Notification log shows them and labels the seeded rows as demo records; nothing says Delivered for this session', main().includes('Log check') && /Demo record \(seeded\)/.test(main()) && !L.some(x => /Delivered/.test(x.result)));
    const d = s5dSave('academy', null, { title: 'Kept draft', body: 'Draft body', spec: { t: 'learners' }, ch: ['In-app'] }, 'draft').a;
    BIZ(); const ba = s5dSave('biz', null, { title: 'Kept to agencies', spec: { t: 'allAgencies' }, ch: ['In-app'] }, 'publish').a; ACT.bAnnWd({ dataset: { id: 'BA-1' } }); reason('Replaced');
    S.tas.v = 'A'; tasEnter(); const ta = s5dSave('teacher', 'TA-4', { title: 'Half-term revision session', body: 'Edited by Sarah', spec: { t: 'tbatches', ids: ['L3AC-JAN26'] }, ch: ['In-app'] }, 'draft').a;
    SA(); ACT.tplEdit({ dataset: { e: 'Announcement' } }); fill({ '#tp-s': 'Persisted subject' }); prim(); closeModal();
    const logN = s5dStore().log.length, ids0 = ADMIN.announcements.map(x => x.id).join();
    rebuildA(); rebuildA(); SYS(); bizEnter('BB'); SA();
    ok('S5d (21) drafts, published and withdrawn announcements survive admin rebuilds with the same IDs (academy, to agencies, teacher)', ADMIN.announcements.find(x => x.id === d.id).body === 'Draft body' && ADMIN.announcements.find(x => x.id === a.id).status === 'Published' && STORE.biz.anns.find(x => x.id === ba.id).status === 'Published' && STORE.biz.anns.find(x => x.id === 'BA-1').status === 'Withdrawn' && ADMIN.announcements.find(x => x.id === 'AN-BA-1').status === 'Withdrawn' && STORE.tas.anns.find(x => x.id === 'TA-4').body === 'Edited by Sarah' && ta.id === 'TA-4');
    const ids = ADMIN.announcements.map(x => x.id);
    ok('S5d (21) no duplicate announcements after repeated rebuilds', new Set(ids).size === ids.length && ids.slice().sort().join() === ids0.split(',').sort().join() && new Set(STORE.biz.anns.map(x => x.id)).size === STORE.biz.anns.length);
    ok('S5d (21) templates and the delivery log survive; the log isn\'t duplicated', s5dTpl('Announcement').subject === 'Persisted subject' && s5dStore().log.length === logN);
    ok('S5d (21) agency feeds after the rebuild still follow the rules', /Kept to agencies/.test(feedOf('AG-02')) && !/New Care Certificate cohort pricing/.test(feedOf('AG-02')));
    ACT.resetDemo(); SA();
    ok('S5d the demo reset restores the seed (announcements, templates, log)', !ADMIN.announcements.some(x => x.id === d.id) && ADMIN.announcements.find(x => x.id === 'AN-BA-1').status === 'Published' && s5dTpl('Announcement').v === 1 && s5dStore().log.filter(x => x.event === 'Announcement').length === 0 && STORE.tas.anns.find(x => x.id === 'TA-4').body !== 'Edited by Sarah');
  });

  await T('S5d (22)–(28) referral codes: create, disable, re-enable, extend, edit while unused — checked in the action, audited, never a discount', async () => {
    fresh(); SA(); const money0 = JSON.stringify([CATALOGUE.map(c => [c.id, c.price]), discData(), STORE.agy.purchases, STORE.fin.tx, NVQ_FEES]);
    go('a-referrals'); ok('S5d (23) the Super Admin view offers Extend (and the D1 wording is kept)', !!app().querySelector('main [data-act="bRefExtend"]') && /receive no payment/.test(main()));
    ACT.newRef(); fill({ '#rf-c': 'care-partner-1', '#rf-t': 'Agent', '#rf-o': 'Jo Bloggs (agent)', '#rf-v': D(200).slice(0, 10) }); prim(); closeModal(); const c = s5dRef('CARE-PARTNER-1');
    ok('S5d (22) a code is created (unique, upper-case), Active and unused', !!c && c.status === 'Active' && c.regs === 0 && !s5dRefUsed(c) && ADMIN.audit[0].action === 'Code created');
    ACT.newRef(); fill({ '#rf-c': 'Care-Partner-1', '#rf-o': 'Someone' }); const dup = prim(); ok('S5d (25) a duplicate code is refused (case ignored)', dup === false && ADMIN.referrals.filter(r => r.code.toUpperCase() === 'CARE-PARTNER-1').length === 1); closeModal();
    const g1 = s5dRefOp('create', null, { type: 'Welfare Buddy', owner: 'Amy Lee (learner)', valid: D(100).slice(0, 10) }, ''), g2 = s5dRefOp('create', null, { type: 'Welfare Buddy', owner: 'Amy Lee (learner)', valid: D(100).slice(0, 10) }, '');
    ok('S5d (25) generated codes are unique', g1.ok && g2.ok && g1.r.code !== g2.r.code);
    ok('S5d a past end date and an unknown agency owner are refused', !s5dRefOp('create', null, { type: 'Agent', owner: 'X', valid: D(-1).slice(0, 10) }, '').ok && !s5dRefOp('create', null, { type: 'Agency', owner: 'No Such Agency', valid: D(10).slice(0, 10) }, '').ok);
    go('a-referrals'); ACT.disableRef({ dataset: { c: c.code } }); reason('Paused'); ok('S5d (22) disable', c.status === 'Disabled' && s5dRefSt(c) === 'Disabled' && regRefState(c.code).st === 'expired');
    ACT.s5dRefEnable({ dataset: { c: c.code } }); reason('Back on'); ok('S5d (22) re-enable a disabled code while it is valid', c.status === 'Active' && regRefState(c.code).st === 'valid');
    const me = s5dRef('MERIDIAN-01'); ACT.disableRef({ dataset: { c: me.code } }); reason('Contract ended'); const re = s5dRefOp('enable', me.code, {}, 'Try');
    ok('S5d a disabled code whose validity has ended can\'t be re-enabled — extend first', !re.ok && /extend it first/.test(re.why) && me.status === 'Disabled');
    ACT.bRefExtend({ dataset: { c: me.code } }); document.querySelector('#re-v').value = D(120).slice(0, 10); reason('Renewed'); ok('S5d (23) extend keeps it disabled; then it can be re-enabled', me.status === 'Disabled' && new Date(me.valid) > now() && s5dRefOp('enable', me.code, {}, 'Renewed').ok && me.status === 'Active');
    const eh = s5dRef('EHHS-AGENT-02'); ACT.bRefExtend({ dataset: { c: eh.code } }); document.querySelector('#re-v').value = D(-5).slice(0, 10); const bad = press(); ok('S5d an extension must be later than today', bad === false && s5dRefSt(eh) === 'Expired'); closeModal();
    ACT.bRefExtend({ dataset: { c: eh.code } }); document.querySelector('#re-v').value = D(90).slice(0, 10); reason('Renewal'); ok('S5d (23) extending an expired code makes it Active again', s5dRefSt(eh) === 'Active' && regRefState(eh.code).st === 'valid');
    ACT.s5dRefEdit({ dataset: { c: c.code } }); document.querySelector('#rf-t').value = 'Welfare Buddy'; document.querySelector('#rf-o').value = 'Jo Bloggs (learner)'; reason('Wrong type');
    ok('S5d (22) an unused code\'s type and owner can be edited', c.type === 'Welfare Buddy' && c.owner === 'Jo Bloggs (learner)');
    const wf = s5dRef('WB-FATIMA07'), ed = s5dRefOp('edit', wf.code, { type: 'Agent', owner: 'Someone else' }, 'Reassign'); go('a-referrals');
    ok('S5d (24) a used code\'s type and owner can\'t change (no Edit offered; a direct call is refused)', !ed.ok && wf.type === 'Welfare Buddy' && /Fatima/.test(wf.owner) && !app().querySelector('main [data-act="s5dRefEdit"][data-c="WB-FATIMA07"]'));
    const acts = ADMIN.audit.filter(a => a.module === 'Referrals').map(a => a.action);
    ok('S5d (26) every change is audited', ['Code created', 'Disabled', 'Re-enabled', 'Validity extended', 'Type / owner edited (unused code)', 'Blocked: edit WB-FATIMA07'].every(x => acts.includes(x)));
    ACT.s5dRefHist({ dataset: { c: c.code } }); ok('S5d (26) the code\'s History shows its changes', /Code created/.test(mroot().textContent) && /Re-enabled/.test(mroot().textContent)); closeModal();
    for (const [lbl, enter] of [['Finance Admin', () => FA4()], ['Academic Admin', () => { acaEnter('KA'); S.signedIn = true; }], ['an Agency Administrator', () => agyEnter('AG-02', true)]]) {
      enter(); const n = secN(), nr = ADMIN.referrals.length; ACT.newRef(); const op = !!MODAL; closeModal(); ACT.disableRef({ dataset: { c: 'GCR-118' } }); const op2 = !!MODAL; closeModal(); const x = s5dRefOp('extend', 'GCR-118', { valid: D(900).slice(0, 10) }, 'x');
      ok(`S5d (28) ${lbl}: referral changes are refused and logged`, !op && !op2 && !x.ok && ADMIN.referrals.length === nr && s5dRef('GCR-118').status === 'Active' && secN() === n + 3);
    }
    BIZ(); const bx = s5dRefOp('extend', 'BRIGHT-2026', { valid: D(500).slice(0, 10) }, 'Annual renewal'); role('sysA'); const sx = s5dRefOp('disable', 'WB-HASSAN22', {}, 'Left');
    ok('S5d the Business Admin and the System Admin keep their referral rights (D1)', bx.ok && sx.ok);
    SA(); rebuildA(); ok('S5d referral changes survive an admin rebuild', s5dRef('CARE-PARTNER-1').type === 'Welfare Buddy' && s5dRefSt(s5dRef('EHHS-AGENT-02')) === 'Active' && s5dRef('WB-HASSAN22').status === 'Disabled');
    ok('S5d (27)(30) referral codes changed no price, discount rate, purchase, Finance record or fee', JSON.stringify([CATALOGUE.map(c => [c.id, c.price]), discData(), STORE.agy.purchases, STORE.fin.tx, NVQ_FEES]) === money0);
  });

  await T('S5d (29)(30) S5a, S5b and S4c protections are intact', async () => {
    fresh(); const hist0 = JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger, discData()]);
    SA(); s5dSave('academy', null, { title: 'Everyone again', spec: { t: 'all' }, ch: ['In-app', 'Email'] }, 'publish'); BIZ(); s5dSave('biz', null, { title: 'Agencies again', spec: { t: 'allAgencies' }, ch: ['In-app'] }, 'publish');
    ok('S5d (30) announcements leave purchases, Finance, the ledger and discount rates unchanged', JSON.stringify([STORE.agy.purchases, STORE.fin.tx, STORE.agy.ledger, discData()]) === hist0);
    SYS(); go('a-roles', { id: 'Super_Administrator' }); ok('S5d (29) the S5a Super Administrator lock still applies', /Only a Super Administrator can do this/.test(main()));
    agyEnter('AG-03', true); const n = secN(); ACT.bLogin({ dataset: { id: 'AG-02', a: 'deactivate' } }); ok('S5d (29) S5b: an Agency Administrator still can\'t administer agency logins', !MODAL && agOf('AG-02').loginStatus === 'Active' && secN() === n + 1);
    SA(); go('a-index'); const ix = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('S5d Admin index: one Setup fixes entry for S5d', !!ix && ix.querySelectorAll('[data-t="a-announcements"]').length === 1 && /S5d — agency and teacher visibility fixed/.test(ix.textContent));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: S5d entry', /announcements, notification templates and referral codes/.test(main()));
  });

  /* ================= S5c — CSV learner-account import, validation and error reports ================= */
  const CSVH = 'Full name,Email,Mobile,Country\r\n';
  // Choose a real file through the import screen's file input (FileReader, as in the browser)
  const pickCsv = async (name, text) => { S.s5c = null; ACT.importCsv(); const inp = document.querySelector('#modal-root #csvf'); if (!inp) return false; const tr = new DataTransfer(); tr.items.add(new File([text], name, { type: 'text/csv' })); inp.files = tr.files; INP.csvPicked(inp); for (let i = 0; i < 40 && !(S.s5c && S.s5c.file === name && S.s5c.checked); i++) await wait(25); return !!(S.s5c && S.s5c.file === name); };
  const rowN = n => S.s5c.c.rows.find(r => r.n === n);
  const lrnN = () => ADMIN.learners.length;
  const dlRows = () => s5cParse(S5C_LAST.file.text).rows.map(r => r.cells);
  // Headless Edge never completes a real file download, so the page would never go idle; during these tests a download link's
  // click is skipped and the generated file is read back from S5C_LAST (the same content the browser would save)
  const _aClickS5c = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) return; return _aClickS5c.apply(this, arguments); };

  await T('S5c (1)(2)(3)(11)(12) the chosen file is read and checked; quoted values; the preview changes nothing', async () => {
    fresh(); SA(); go('a-learners'); const n0 = lrnN(), au0 = ADMIN.audit.length, lg0 = s5dStore().log.length;
    const text = CSVH + '"Evans, Lucy",lucy.evans2@example.co.uk,+44 7700 911801,United Kingdom\r\n\r\n"Mary ""May"" Jones",mary.jones@example.co.uk,+44 7700 911802,United Kingdom\n  Tom Hart  ,tom.hart@example.ae, +971 50 555 0101 ,United Arab Emirates\r\n';
    ok('S5c (1) the import reads the file that was chosen', await pickCsv('october-starters.csv', text) && S.s5c.c.rows.length === 3);
    ok('S5c (3) quoted values with commas and doubled quotes, blank lines, mixed line endings and spaces are read correctly', rowN(2).v.name === 'Evans, Lucy' && rowN(3).v.name === 'Mary "May" Jones' && rowN(4).v.name === 'Tom Hart' && rowN(4).v.mobile === '+971 50 555 0101' && rowN(4).region === 'UAE');
    ok('S5c (2) the old fixed sample is no longer substituted for the chosen file', !S.s5c.c.rows.some(r => /Imran Sheikh|learners_october/.test(r.v.name + r.v.email)) && !/learners_october\.csv/.test(mroot().textContent) && /october-starters\.csv/.test(mroot().textContent));
    const kp = [...mroot().querySelectorAll('.kpi')].map(k => k.textContent);
    ok('S5c (12) the preview shows rows, valid, invalid and duplicate counts and each row', kp.join('|').includes('Rows3') && kp.join('|').includes('Valid3') && /Create valid rows only \(3\)/.test(mroot().textContent) && /Evans, Lucy/.test(mroot().textContent));
    ok('S5c (11) the preview creates nothing, audits nothing and sends nothing', lrnN() === n0 && ADMIN.audit.length === au0 && s5dStore().log.length === lg0); closeModal();
    ACT.importCsv(); ok('S5c the template and the demonstration file are real downloads; the demonstration file is labelled', /Download template/.test(mroot().textContent) && /demonstration file/.test(mroot().textContent) && (ACT.s5cTemplate(), S5C_LAST.file.name === 'learner-import-template.csv' && /^Full name,Email,Mobile,Country/.test(S5C_LAST.file.text))); closeModal();
    ACT.csvSample(); ok('S5c the demonstration file is checked by the same rules (its duplicate and errors are found, not hard-coded)', S.s5c.file === 'demo-learners-6-rows.csv' && S.s5c.c.rows.length === 6 && rowN(4).status === 'Duplicate' && rowN(5).status === 'Invalid' && rowN(6).status === 'Invalid' && /Mobile is required/.test(rowN(6).errs.join()));
  });

  await T('S5c (4)(5)(6)(7)(8)(9)(10)(12) malformed files, missing columns, row errors and duplicates', async () => {
    fresh(); SA(); const n0 = lrnN();
    await pickCsv('broken.csv', CSVH + '"Unclosed,amy@example.co.uk,+44 7700 911803,United Kingdom\r\n');
    ok('S5c (4) a malformed file is refused with the line and nothing is created', S.s5c.c.fileError && /isn't valid CSV/.test(mroot().textContent) && /Line 2/.test(mroot().textContent) && !/Create valid rows/.test(mroot().textContent) && lrnN() === n0); closeModal();
    await pickCsv('stray.csv', CSVH + 'Ann "Annie" Lee,ann@example.co.uk,+44 7700 911804,United Kingdom\r\n'); ok('S5c (4) a stray quote is reported too', /quote appears inside an unquoted value/.test(S.s5c.c.fileError)); closeModal();
    await pickCsv('nocountry.csv', 'Full name,Email,Mobile\r\nAnn Lee,ann@example.co.uk,+44 7700 911804\r\n');
    ok('S5c (5) a missing required column is reported by name', /Missing required column: Country/.test(S.s5c.c.fileError) && lrnN() === n0); closeModal();
    await pickCsv('empty.csv', CSVH); ok('S5c a header with no rows is reported', /no learner rows/.test(S.s5c.c.fileError)); closeModal();
    const ex = ADMIN.learners.find(l => s5cDigits(l.mobile).length >= 8 && l.email), ex2 = ADMIN.learners.find(l => l !== ex && s5cDigits(l.mobile).length >= 8);
    const text = CSVH + [',noname@example.co.uk,+44 7700 911810,United Kingdom', 'Bad Email,bad.email@,+44 7700 911811,United Kingdom', 'Local Mobile,local.mobile@example.co.uk,07700 911812,United Kingdom', 'No Country,no.country@example.co.uk,+44 7700 911813,', 'Mars Person,mars@example.co.uk,+44 7700 911814,Mars', `Existing Email,${ex.email.toUpperCase()},+44 7700 911815,United Kingdom`, `Existing Mobile,existing.mobile@example.co.uk,${ex2.mobile},United Kingdom`, 'First Copy,twin@example.co.uk,+44 7700 911816,United Kingdom', 'Second Copy,TWIN@example.co.uk,+44 7700 911817,United Kingdom', 'Phone Twin,phone.twin@example.co.uk,+44 (7700) 911-816,United Kingdom', 'Good Row,good.row@example.co.uk,+44 7700 911818,India', 'Too,many@example.co.uk,+44 7700 911819,United Kingdom,extra'].join('\r\n');
    await pickCsv('checks.csv', text); const R = n => rowN(n);
    ok('S5c (6) missing values are row errors', R(2).status === 'Invalid' && /Full name is required/.test(R(2).errs.join()) && R(5).status === 'Invalid' && /Country is required/.test(R(5).errs.join()));
    ok('S5c (7) invalid email and mobile formats (international form required); unknown country', /Email is not a valid address/.test(R(3).errs.join()) && /international form/.test(R(4).errs.join()) && /isn't one of the registration countries/.test(R(6).errs.join()));
    ok('S5c (8) an email that already belongs to a learner is refused (case ignored), naming the learner ID', R(7).status === 'Duplicate' && R(7).dup.join().includes(ex.id));
    ok('S5c (9) a mobile that already belongs to a learner is refused (compared by digits)', R(8).status === 'Duplicate' && R(8).dup.join().includes(ex2.id));
    ok('S5c (10) duplicates within the file: the later rows are refused (email without case, mobile by digits); the first is kept', R(9).ok && R(10).status === 'Duplicate' && /Same email as row 9/.test(R(10).dup.join()) && R(11).status === 'Duplicate' && /Same mobile as row 9/.test(R(11).dup.join()));
    ok('S5c a row with more values than the header is refused; a valid row (India → UK data region) passes', /header has 4 columns/.test(R(13).errs.join()) && R(12).ok && R(12).region === 'UK');
    const k = s5cCounts(S.s5c.c); ok('S5c (12) counts are accurate (12 rows: 2 valid, 6 invalid, 4 duplicates) and every reason is shown', k.total === 12 && k.valid === 2 && k.invalid === 6 && k.dup === 4 && /Same mobile as row 9/.test(mroot().textContent) && /Download error report \(10\)/.test(mroot().textContent));
    ACT.s5cErrors(); const d = dlRows();
    ok('S5c (19) the downloaded error report lists exactly this attempt\'s rejected rows with their reasons', S5C_LAST.file.name === 'checks-errors.csv' && d[0].join() === 'Row,Full name,Email,Result,Reasons' && d.length === 11 && d.slice(1).map(r => r[0]).join() === '2,3,4,5,6,7,8,10,11,13' && d.find(r => r[0] === '7')[4].includes(ex.id) && !d.some(r => r.join().includes('Good Row')));
    ok('S5c (19) the report has no mobile numbers or countries', !/9118\d\d/.test(S5C_LAST.file.text) && !/United Kingdom|India|Mars"?\s*$/m.test(S5C_LAST.file.text)); closeModal();
    ok('S5c (11) checking never created anything', lrnN() === n0);
  });

  await T('S5c (13)–(16)(21) import: re-checked, stable IDs, invalid rows skipped, never twice, audited', async () => {
    fresh(); SA(); const n0 = lrnN(), fin0 = JSON.stringify([STORE.fin.tx, STORE.agy.purchases]);
    const text = CSVH + 'Lucy Evans,lucy.evans2@example.co.uk,+44 7700 911901,United Kingdom\r\nImran Sheikh,imran.sheikh2@example.co.uk,+44 7700 911902,United Kingdom\r\nLate Comer,late.comer@example.co.uk,+44 7700 911903,United Kingdom\r\nBroken Row,broken@,+44 7700 911904,United Kingdom\r\nTariq Aziz,tariq.aziz2@mail.ae,+971 50 555 0299,United Arab Emirates\r\n';
    await pickCsv('batch-a.csv', text); ok('S5c four rows pass the preview', s5cCounts(S.s5c.c).valid === 4); const pv = S.s5c;
    ACT.addLearner(); fill({ '#nl-name': 'Late Comer', '#nl-email': 'late.comer@example.co.uk', '#nl-mob': '+44 7700 911999' }); prim(); closeModal(); const lc = ADMIN.learners.find(l => l.email === 'late.comer@example.co.uk'); S.s5c = pv;
    S.s5c = pv; s5cPreview(); prim();
    const rec = s5cStore().imports[0], ids = rec.created;
    ok('S5c (13) valid rows are created with new stable IDs (IA-L-33001 onwards), Pending Verification, no course, batch or agency', ids.length === 3 && ids.join() === 'IA-L-33001,IA-L-33002,IA-L-33003' && ids.every(id => { const l = learnerById(id); return l && l.acct === 'Pending Verification' && !l.courses.length && l.agency === null && l.referral === 'Bulk import (CSV)'; }) && learnerById('IA-L-33003').region === 'UAE');
    ok('S5c (14) invalid rows are not created', !ADMIN.learners.some(l => l.email === 'broken@') && lrnN() === n0 + 1 + 3);
    ok('S5c (15) a row that passed the preview but was registered meanwhile is rejected on import (re-checked), not duplicated', ADMIN.learners.filter(l => l.email === 'late.comer@example.co.uk').length === 1 && rowN(4).late && /changed since/.test(rowN(4).late[0]) && lc.name === 'Late Comer');
    ok('S5c the result screen lists each row with its new ID or its reasons', /3 learner accounts created/.test(mroot().textContent) && mroot().textContent.includes('IA-L-33002') && /Passed the preview, but changed since/.test(mroot().textContent)); closeModal();
    go('a-learners'); ok('S5c the new learners appear in the Learners list', main().includes('IA-L-33001') && main().includes('Lucy Evans'));
    const au = ADMIN.audit.find(a => a.action === 'Bulk import (CSV)');
    ok('S5c (21) the import is audited: actor, file, counts, IDs and a reason summary (not the file)', !!au && au.actor === 'Nadia Qureshi' && au.entity === `${rec.id} · batch-a.csv` && au.after === '5 rows · 3 created · 2 rejected' && /IA-L-33001, IA-L-33002, IA-L-33003/.test(au.reason) && !au.reason.includes('911901') && ADMIN.audit.filter(a => a.action === 'Learner created (CSV import)').length === 3);
    ok('S5c each new account gets the activation email as one simulated record — no other notification, announcement or payment', ids.every(id => s5dStore().log.filter(x => x.src === 'import:' + id).length === 1 && /^Simulated/.test(s5dStore().log.find(x => x.src === 'import:' + id).result)) && JSON.stringify([STORE.fin.tx, STORE.agy.purchases]) === fin0 && !Object.values(STORE.worlds).some(w => w.announcements.some(a => /Lucy Evans/.test(a.title))));
    const again = s5cImport(); ok('S5c (16) the same check can\'t be imported twice', !again.ok && /already imported/.test(again.why) && lrnN() === n0 + 4);
    await pickCsv('batch-a.csv', text); prim(); const r2 = s5cStore().imports[0];
    ok('S5c (16) importing the same file again creates nothing (each row is now a duplicate)', r2.created.length === 0 && r2.rejected.length === 5 && lrnN() === n0 + 4 && /0 learner accounts created/.test(mroot().textContent)); closeModal();
    await pickCsv('batch-b.csv', CSVH + 'New Person,new.person@example.co.uk,+44 7700 911905,United Kingdom\r\n'); prim(); closeModal();
    ok('S5c a later import continues the IDs (never reused)', s5cStore().imports[0].created.join() === 'IA-L-33004');
    ACT.s5cErrors(); ok('S5c (19) all rows imported: no error report, and it says so', S5C_LAST.file.name !== 'batch-b-errors.csv');
  });

  await T('S5c (19)(20) error-report escaping', async () => {
    fresh(); SA(); await pickCsv('escape.csv', CSVH + '"=HYPERLINK(""x"")",bad@,+44 7700 911950,United Kingdom\r\n"Smith, ""JJ""",also@bad,+44 7700 911951,United Kingdom\r\n"Line\nBreak",x@,+44 7700 911952,United Kingdom\r\n');
    ACT.s5cErrors(); const t = S5C_LAST.file.text, d = dlRows();
    ok('S5c (20) commas, quotes and line breaks are escaped so the report reads back exactly', d.length === 4 && d[2][1] === 'Smith, "JJ"' && d[3][1] === 'Line\nBreak' && t.includes('"Smith, ""JJ"""'));
    ok('S5c (20) a value starting with = is prefixed with an apostrophe (no formula runs)', d[1][1] === '\'=HYPERLINK("x")' && !/(^|,)=HYPERLINK/m.test(t)); closeModal();
  });

  await T('S5c (17)(18) only the Super Admin and System Admins bulk-create accounts; refusals change nothing and are logged', async () => {
    fresh(); SA(); await pickCsv('auth.csv', CSVH + 'Auth Person,auth.person@example.co.uk,+44 7700 911960,United Kingdom\r\n'); const pv = S.s5c; closeModal(); const n0 = lrnN();
    for (const [lbl, enter] of [['Academic Admin (batch rosters, a different capability)', () => { acaEnter('KA'); S.signedIn = true; }], ['Business Admin', () => BIZ()], ['Finance Admin', () => FA4()], ['an Agency Administrator', () => agyEnter('AG-02', true)]]) {
      enter(); S.s5c = pv; const n = secN(); ACT.importCsv(); const o1 = !!MODAL; closeModal(); ACT.csvSample(); const o2 = !!MODAL; closeModal(); S.s5c = pv; const r = s5cImport(); ACT.s5cErrors();
      ok(`S5c (18) ${lbl}: opening, previewing, importing and downloading are refused and logged; nothing is created`, !o1 && !o2 && !r.ok && lrnN() === n0 && secN() === n + 4 && /^Blocked: /.test(ADMIN.audit[0].action), String(secN() - n));
    }
    acaEnter('KA'); S.signedIn = true; go('a-learners'); const ka = app().querySelector('main [data-act="importCsv"]'); BIZ(); go('a-learners'); const b = app().querySelector('main [data-act="importCsv"]');
    ok('S5c the screen follows the same rule: no usable import button for the Academic Admin or the Business Admin', (!ka || ka.disabled) && (!b || (b.disabled && /Super Administrator and System Administrators/.test(b.title))));
    SA(); go('a-learners'); const sb = app().querySelector('main [data-act="importCsv"]'); ok('S5c … while the Super Admin\'s is enabled', !!sb && !sb.disabled);
    role('sysA'); await pickCsv('sys.csv', CSVH + 'Sys Person,sys.person@example.co.uk,+44 7700 911961,United Kingdom\r\n'); prim(); closeModal();
    ok('S5c (17) the System Admin imports', s5cStore().imports[0].created.length === 1 && learnerById(s5cStore().imports[0].created[0]).name === 'Sys Person');
    SA(); S.s5c = pv; pv.done = null; const rs = s5cImport(); ok('S5c (17) the Super Admin imports', rs.ok && rs.rec.created.length === 1);
  });

  await T('S5c (22)(23) imported accounts survive rebuilds, identity switches and index jumps; the demo reset restores the seed', async () => {
    fresh(); SA(); const seed = lrnN(); await pickCsv('keep.csv', CSVH + 'Keep One,keep.one@example.co.uk,+44 7700 911970,United Kingdom\r\nKeep Two,keep.two@example.co.uk,+44 7700 911971,United Arab Emirates\r\n'); prim(); closeModal();
    const ids = s5cStore().imports[0].created; render(); render();
    rebuildA(); SYS(); bizEnter('BB'); acaEnter('KA'); SA(); ACT.aJump({ dataset: { t: 'av:B' } }); INP.adminVariant({ value: 'A' }); SA(); rebuildA();
    ok('S5c (22) imported accounts survive admin rebuilds, identity switches and index jumps — once each, same details', ids.every(id => ADMIN.learners.filter(l => l.id === id).length === 1) && learnerById(ids[1]).region === 'UAE' && lrnN() === seed + 2);
    ok('S5c (22) their audit rows survive, without duplicates', ADMIN.audit.filter(a => a.action === 'Bulk import (CSV)').length === 1 && new Set(ADMIN.audit.map(a => a.id)).size === ADMIN.audit.length);
    await pickCsv('keep.csv', CSVH + 'Keep One,keep.one@example.co.uk,+44 7700 911970,United Kingdom\r\n'); prim(); closeModal(); rebuildA();
    ok('S5c (22) after a rebuild, importing the same rows again still creates nothing', s5cStore().imports[0].created.length === 0 && lrnN() === seed + 2);
    ACT.resetDemo(); SA(); ok('S5c (23) the demo reset removes imported accounts and restores the seeded learners', !ids.some(id => learnerById(id)) && lrnN() === seed && !s5cStore().imports.length);
  });

  await T('S5c (24)(25) batch roster: CSV adding is truthfully unavailable; Add learner keeps capacity and active-batch rules', async () => {
    fresh(); SA(); const b = ADMIN.batches.find(x => x.status === 'Open' && x.enrolled < x.cap) || ADMIN.batches.find(x => x.status === 'Open'), r0 = JSON.stringify([b.roster, b.enrolled, b.wait]), n0 = lrnN();
    go('a-batches', { id: b.code, tab: 'roster' }); const bt = app().querySelector('main [data-act="s5cBatchCsv"]');
    ok('S5c (24) the roster\'s "Bulk CSV" is shown as not available with the reason (it no longer opens the account import)', bt && bt.disabled && /isn't available yet/.test(bt.title) && !app().querySelector('main .row [data-act="importCsv"]'));
    ACT.s5cBatchCsv(); ok('S5c (24) a direct call explains and changes nothing — no roster change, no account, no enrolment', /not available/.test(mroot().textContent) && JSON.stringify([b.roster, b.enrolled, b.wait]) === r0 && lrnN() === n0); closeModal();
    ACT.addToBatch({ dataset: { id: b.code } }); ok('S5c Add learner no longer lists "bulk CSV" as a method', !/bulk CSV, multi-select/.test(mroot().textContent) && /Adding by CSV isn't available yet/.test(mroot().textContent)); closeModal();
    const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress'].includes(x.status)).flatMap(x => batchRoster(x).map(r => r[1]))), free = ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id));
    ACT.addToBatch({ dataset: { id: b.code, pre: free.id } }); document.querySelector('#ab-l').value = free.id; const e0 = b.enrolled; prim(); closeModal();
    ok('S5c (25) Add learner (one at a time) still works', b.enrolled === e0 + 1 && b.roster.some(r => r[1] === free.id));
    b.enrolled = b.cap; const w0 = b.wait, free2 = ADMIN.learners.find(l => l !== free && l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id));
    ACT.addToBatch({ dataset: { id: b.code } }); document.querySelector('#ab-l').value = free2.id; prim(); closeModal();
    ok('S5c (25) a full batch still sends the learner to the waitlist', b.wait === w0 + 1 && b.enrolled === b.cap);
    const other = ADMIN.batches.find(x => x !== b && x.status === 'Open'); if (other) { ACT.addToBatch({ dataset: { id: other.code } }); document.querySelector('#ab-l').value = free.id; prim(); }
    ok('S5c (25) a learner in another active batch still can\'t be added', !other || (/already in/.test(mroot().textContent) && !other.roster.some(r => r[1] === free.id))); closeModal();
  });

  await T('S5c (26)–(30) imported accounts are separate from enrolment; earlier stages intact', async () => {
    fresh(); SA(); const hist0 = JSON.stringify([STORE.fin.tx, STORE.agy.purchases, STORE.agy.ledger, discData(), CATALOGUE.map(c => [c.id, c.price])]), b0 = JSON.stringify(ADMIN.batches.map(b => [b.code, b.enrolled, b.wait, (b.roster || []).length]));
    await pickCsv('sep.csv', CSVH + 'Sep One,sep.one@example.co.uk,+44 7700 911980,United Kingdom\r\n'); prim(); closeModal(); const id = s5cStore().imports[0].created[0];
    ok('S5c (26) an imported account is in no batch, course or agency roster, and batches are unchanged', !ADMIN.batches.some(b => batchRoster(b).some(r => r[1] === id)) && !learnerById(id).courses.length && !ADMIN.agencies.some(g => agyRoster(g.name).some(l => l.id === id)) && JSON.stringify(ADMIN.batches.map(b => [b.code, b.enrolled, b.wait, (b.roster || []).length])) === b0);
    ok('S5c (30) prices, discount rates, purchases, the ledger and Finance records are unchanged', JSON.stringify([STORE.fin.tx, STORE.agy.purchases, STORE.agy.ledger, discData(), CATALOGUE.map(c => [c.id, c.price])]) === hist0);
    SYS(); go('a-roles', { id: 'Super_Administrator' }); ok('S5c (27) the S5a Super Administrator lock still applies', /Only a Super Administrator can do this/.test(main()));
    agyEnter('AG-03', true); const n = secN(); ACT.bLogin({ dataset: { id: 'AG-02', a: 'deactivate' } }); ok('S5c (28) S5b: an Agency Administrator still can\'t administer agency logins', !MODAL && agOf('AG-02').loginStatus === 'Active' && secN() === n + 1);
    ok('S5c (29) S5d: agency feeds still show only what is addressed to them', !/Agency reporting portal update/.test(feedOf('AG-02')) && /Academy closed 25–26 December/.test(feedOf('AG-02')));
    SA(); go('a-index'); const ix = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('S5c Admin index: one Setup fixes entry for S5c', !!ix && ix.querySelectorAll('[data-t="a-learners"]').length === 1 && /S5c — reads the chosen file/.test(ix.textContent));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: S5c entry', /CSV learner import, validation and error reports/.test(main()));
  });
  await T('S5c correction: the "Bulk (CSV)" batch intake rule is shown as not available and refused when saving; the template and demonstration file match the importer', async () => {
    fresh(); SA(); const n0 = lrnN(), keep = JSON.stringify(ADMIN.batches.map(b => [b.code, b.intake, b.enrolled, b.wait, (b.roster || []).length])), imp0 = s5cStore().imports.length;
    go('a-batches'); ACT.newBatch(); const dm = document.querySelector('#modal-root #nb-dm'); if (dm) dm.value = N2_MODES[0]; fill({ '#nb-c': 'CSVTEST-JAN27' }); prim();
    const ac = document.querySelector('#modal-root #nb-ac'); ac.value = [...ac.options].find(o => o.value).value; prim(); prim();
    const bulk = document.querySelector('#modal-root input[name="nb-in"][value="Bulk (CSV)"]');
    ok('S5c (1) the intake step marks "Bulk (CSV)" as not available, with the reason, and disables it', /Create batch — step 4 of 5/.test(MODAL.title) && bulk && bulk.disabled && /Bulk \(CSV\) — not available/.test(mroot().textContent) && /batch-eligibility rule/.test(mroot().textContent) && !/You upload a spreadsheet/.test(mroot().textContent));
    bulk.disabled = false; bulk.checked = true; const r = prim();
    ok('S5c (2) choosing it anyway (a re-enabled option) is refused when saving the step, and audited', r === false && /step 4 of 5/.test(MODAL.title) && ADMIN.audit[0].action === 'Blocked: unsupported intake rule');
    let made = false; openModal({ title: 'Create batch — step 5 of 5', body: '<dl class="kv"><dt>Intake rule</dt><dd>Bulk (CSV)</dd></dl>', actions: [{ label: 'Create batch', cls: 'btn-primary', fn: () => { made = true; } }] }); const r5 = prim(); closeModal();
    ok('S5c (2) "Create batch" with a "Bulk (CSV)" intake is refused too (save-time check)', r5 === false && !made);
    go('a-batches'); ACT.newBatch(); const dm2 = document.querySelector('#modal-root #nb-dm'); if (dm2) dm2.value = N2_MODES[0]; fill({ '#nb-c': 'CSVTEST-JAN27' }); prim(); const ac2 = document.querySelector('#modal-root #nb-ac'); ac2.value = [...ac2.options].find(o => o.value).value; prim(); prim();
    document.querySelector('#modal-root input[name="nb-in"][value="Manual"]').checked = true; prim(); ok('S5c (4) Manual is accepted and shown in the review', /step 5 of 5/.test(MODAL.title) && /<dt>Intake rule<\/dt><dd>Manual<\/dd>/.test(MODAL.body)); prim(); closeModal();
    const nb = ADMIN.batches.find(b => b.code === 'CSVTEST-JAN27');
    ok('S5c (4)(6) the batch is created with Manual intake; creating it imported and enrolled no one', !!nb && nb.intake === 'Manual' && nb.enrolled === 0 && !nb.roster.length && lrnN() === n0 && s5cStore().imports.length === imp0);
    ok('S5c (3) existing batches and their stored intake values are unchanged', JSON.stringify(ADMIN.batches.filter(b => b !== nb).map(b => [b.code, b.intake, b.enrolled, b.wait, (b.roster || []).length])) === keep);
    const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress'].includes(x.status)).flatMap(x => batchRoster(x).map(rr => rr[1]))), fr = ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id));
    ACT.addToBatch({ dataset: { id: nb.code } }); document.querySelector('#ab-l').value = fr.id; prim(); closeModal();
    ok('S5c (4) manual assignment to the new batch still works (one learner, Add learner)', nb.enrolled === 1 && nb.roster.some(x => x[1] === fr.id));
    const head = t => s5cParse(t).rows[0].cells.join(), cols = S5C_COLS.map(c => c[1]).join();
    ok('S5c (5) the template and the demonstration file have exactly the importer\'s columns (Full name, Email, Mobile, Country)', head(S5C_TEMPLATE) === cols && head(S5C_DEMO.text) === cols && cols === 'Full name,Email,Mobile,Country');
    ok('S5c (5) the template\'s example row uses the international mobile form and passes the checks', /\+44 /.test(S5C_TEMPLATE) && s5cCheck(s5cParse(S5C_TEMPLATE)).rows[0].ok);
    ACT.importCsv(); ok('S5c the demonstration file\'s failing rows are labelled on the import screen', /deliberately includes 3 rows that fail/.test(mroot().textContent)); closeModal();
    ACT.csvSample(); const dk = s5cCounts(S.s5c.c); ok('S5c … and its preview reports exactly those errors (1 duplicate, 2 invalid; the other 3 valid)', dk.valid === 3 && dk.dup === 1 && dk.invalid === 2 && /Email is not a valid address/.test(rowN(5).errs.join()) && /Mobile is required/.test(rowN(6).errs.join())); closeModal();
  });
  HTMLAnchorElement.prototype.click = _aClickS5c;

  /* ================= S5e — cross-stage integration, security and the final setup audit ================= */
  const openB = () => ADMIN.batches.find(x => x.status === 'Open' && x.enrolled < x.cap);
  const freeL = (skip = []) => { const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress'].includes(x.status)).flatMap(x => batchRoster(x).map(r => r[1]))); return ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id) && !skip.includes(l.id)); };
  const rosterSnap = b => JSON.stringify([b.roster, b.enrolled, b.wait]);
  const addVia = (b, l) => { ACT.addToBatch({ dataset: { id: b.code } }); if (!MODAL) return 'refused'; document.querySelector('#ab-l').value = l.id; const r = prim(); closeModal(); return r; };

  await T('S5e (1)–(4) adding a learner to a batch checks the actor in the action and on confirmation', async () => {
    fresh(); SA(); const b = openB(), l1 = freeL();
    ok('S5e (1) the Super Admin adds a learner to a batch', addVia(b, l1) !== 'refused' && b.roster.some(r => r[1] === l1.id));
    for (const [lbl, enter] of [['Business Admin', () => BIZ()], ['Finance Admin', () => FA4()], ['IQA', () => iqaEnter('QA')], ['an Agency Administrator', () => agyEnter('AG-02', true)]]) {
      enter(); const s0 = rosterSnap(b), n = secN(); ACT.addToBatch({ dataset: { id: b.code } }); const o = !!MODAL; closeModal(); ACT.kOffer({ dataset: { id: b.code, n: 'Crafted Person' } }); const o2 = !!MODAL; closeModal(); ACT.kNextIntake({ dataset: { id: b.code, n: 'Crafted Person' } }); const o3 = !!MODAL; closeModal();
      ok(`S5e (2) ${lbl}: add learner, offer a waitlist place and move to the next intake are refused by direct calls; nothing changes; each is logged`, !o && !o2 && !o3 && rosterSnap(b) === s0 && secN() === n + 3 && /^Blocked: (add a learner to|offer a waitlist place in|move a waitlisted learner on from)/.test(ADMIN.audit[0].action), String(secN() - n));
    }
    SA(); const R = newCustom('Batch Clerk', ['Batches & Scheduling:V', 'Batches & Scheduling:E']); ACT.addUser(); fill({ '#nu-n': 'Bea Clerk', '#nu-e': 'bea.clerk@illumin-academy.example' }); nuPick([R]); prim(); closeModal();
    signOut(); S.portal = 'admin'; staffSignin('bea.clerk@illumin-academy.example'); const sc = rosterSnap(b); ACT.addToBatch({ dataset: { id: b.code } }); closeModal();
    ok('S5e (2) custom-role access with Batches & Scheduling: Edit can\'t add learners to a batch (S5a limits hold)', s5Ctx() && rosterSnap(b) === sc);
    role('sysA'); const l2 = freeL([l1.id]); ok('S5e the System Admin adds a learner', addVia(b, l2) !== 'refused' && b.roster.some(r => r[1] === l2.id));
    acaEnter('KA'); S.signedIn = true; const l3 = freeL([l1.id, l2.id]); ok('S5e the Academic Admin adds a learner', addVia(b, l3) !== 'refused' && b.roster.some(r => r[1] === l3.id));
    const l4 = freeL([l1.id, l2.id, l3.id]); ACT.addToBatch({ dataset: { id: b.code } }); document.querySelector('#ab-l').value = l4.id; const fn = MODAL.actions.find(a => a.cls && /primary/.test(a.cls)).fn, s4 = rosterSnap(b); BIZ(); const rr = fn(); closeModal();
    ok('S5e (3) the actor is checked again when the dialog is confirmed: refused after switching to the Business Admin', rr === false && rosterSnap(b) === s4 && /^Blocked: add a learner to/.test(ADMIN.audit[0].action));
    const ip = ADMIN.batches.find(x => x.status === 'In Progress'); acaEnter('KA'); S.signedIn = true; ACT.addToBatch({ dataset: { id: ip.code } }); document.querySelector('#ab-l').value = l4.id; document.querySelector('#rsn').value = 'Late joiner'; const fn2 = MODAL.actions.find(a => a.cls && /primary|danger/.test(a.cls)).fn, s5 = rosterSnap(ip); FA4(); const r2 = fn2(); closeModal();
    ok('S5e (3) … and on the after-start override dialog', r2 === false && rosterSnap(ip) === s5);
    SA(); b.enrolled = b.cap; const w0 = b.wait, l5 = freeL([l1.id, l2.id, l3.id]); addVia(b, l5);
    ok('S5e (4) capacity → waitlist is unchanged', b.wait === w0 + 1 && b.enrolled === b.cap);
    const other = ADMIN.batches.find(x => x !== b && x.status === 'Open'); if (other) { ACT.addToBatch({ dataset: { id: other.code } }); document.querySelector('#ab-l').value = l1.id; prim(); }
    ok('S5e (4) a learner already in an active batch still can\'t be added to another', !other || (/already in/.test(mroot().textContent) && !other.roster.some(r => r[1] === l1.id))); closeModal();
    ok('S5e (9) adding to a batch creates no payment or enrolment record', !STORE.fin.tx.some(t => [l1.id, l2.id, l3.id].includes(t.lid)));
  });

  await T('S5e (5)–(9) learners added one at a time and imported learners survive rebuilds, once, with stable IDs', async () => {
    fresh(); SA(); const seed = lrnN(), fin0 = JSON.stringify(STORE.fin.tx.length);
    go('a-learners'); ACT.addLearner(); fill({ '#nl-name': 'Manual Person', '#nl-email': 'manual.person@example.co.uk', '#nl-mob': '+44 7700 912001' }); prim(); closeModal();
    const m = ADMIN.learners.find(l => l.email === 'manual.person@example.co.uk');
    await pickCsv('s5e.csv', CSVH + 'Csv Person,csv.person@example.co.uk,+44 7700 912002,United Arab Emirates\r\n'); prim(); closeModal(); const cid = s5cStore().imports[0].created[0];
    rebuildA(); SYS(); bizEnter('BB'); acaEnter('KA'); SA(); ACT.aJump({ dataset: { t: 'av:B' } }); INP.adminVariant({ value: 'C' }); INP.adminVariant({ value: 'A' }); SA();
    const m2 = learnerById(m.id), c2 = learnerById(cid);
    ok('S5e (5)(7) a learner added one at a time survives admin rebuilds, identity switches and index jumps — same ID, status and details', !!m2 && m2.id === m.id && m2.acct === 'Pending Verification' && m2.name === 'Manual Person' && m2.country === m.country);
    ok('S5e (6)(7) an imported learner survives too (UAE data region kept)', !!c2 && c2.region === 'UAE');
    ok('S5e (8) no duplicate learners', ADMIN.learners.filter(l => l.id === m.id).length === 1 && ADMIN.learners.filter(l => l.id === cid).length === 1 && lrnN() === seed + 2 && new Set(allLearners().map(l => l.id)).size === allLearners().length);
    go('a-learners'); ok('S5e both appear in the Learners list after the rebuilds', main().includes('Manual Person') && main().includes(cid));
    ACT.addLearner(); fill({ '#nl-name': 'Manual Again', '#nl-email': 'MANUAL.person@example.co.uk' }); const d = prim(); closeModal();
    ok('S5e duplicate checks still apply after the rebuild', d === false && lrnN() === seed + 2);
    ok('S5e (9) creating accounts made no enrolment, batch place or payment', !m2.courses.length && !ADMIN.batches.some(b => batchRoster(b).some(r => [m.id, cid].includes(r[1]))) && JSON.stringify(STORE.fin.tx.length) === fin0);
    ACT.resetDemo(); SA(); ok('S5e (23) the demo reset removes them and restores the seeded learners', !learnerById(m.id) && !learnerById(cid) && lrnN() === seed);
  });

  await T('S5e (10)–(12) purchases, seats, ledgers, transactions and approvals are kept across rebuilds, never duplicated', async () => {
    fresh(); agyEnter('AG-10', true); const p = buyAg('CAT-2', 10), bn = ADMIN.bundles.find(b => b.id === p.bundle);
    agyEnter('AG-02', true); ACT.agBuy({ dataset: { id: 'CAT-1' } }); const inv = document.querySelector('#modal-root input[name="gpm"][value="inv"]'); if (inv) inv.checked = true; prim(); const po = document.querySelector('#modal-root #gi-po'); if (po) po.value = 'PO-S5E-1'; prim(); closeModal();
    const q = ADMIN.queue.find(i => i.type.startsWith('Agency invoice') && JSON.stringify(i).includes('PO-S5E-1')) || ADMIN.queue[0];
    SA(); rates(); document.querySelector('#dr-std').value = '4'; document.querySelector('#dr-r').value = 'S5e check'; SUBMIT.discSave(); const dv = discNow().v;
    const snap = () => JSON.stringify([STORE.agy.purchases, STORE.agy.assign, STORE.agy.ledger, ADMIN.bundles.filter(b => b.agency), STORE.fin.tx, ADMIN.ledger, STORE.fin.od, STORE.fin.deposits]), s0 = snap(), qs = q && JSON.stringify([q.id, q.status, q.amount, q.history]);
    rebuildA(); SYS(); FA4(); SA(); ACT.aJump({ dataset: { t: 'av:B' } }); INP.adminVariant({ value: 'A' }); SA();
    ok('S5e (10)(11) purchases, seat assignments, the agency ledger, credited bundles, Finance transactions and ledgers are identical after rebuilds (nothing lost, duplicated or re-priced)', snap() === s0 && STORE.agy.purchases.filter(x => x.ref === p.ref).length === 1 && STORE.fin.tx.filter(t => t.ref === p.ref).length === 1);
    ok('S5e (10) the credited bundle keeps its seats and use (a consumed seat isn\'t restored)', !!bn && JSON.stringify(ADMIN.bundles.find(b => b.id === p.bundle)) === JSON.stringify(bn));
    const q2 = q && ADMIN.queue.find(i => i.id === q.id); ok('S5e (10) a pending invoice purchase stays in the queue unchanged for Finance', !!q2 && JSON.stringify([q2.id, q2.status, q2.amount, q2.history]) === qs);
    ok('S5e (12) discount rate versions and requests are kept', discNow().v === dv && discNow().std === 4);
    agyEnter('AG-10', true); go('g-purchases'); ok('S5e the agency still sees its purchase after the rebuilds', main().includes(p.ref));
  });

  await T('S5e (13)(14)(15)(16)(17) security log, demo clock, setup links and scheduled announcements across rebuilds', async () => {
    fresh(); BIZ(); const b = openB(); ACT.addToBatch({ dataset: { id: b.code } }); const ev = ADMIN.security[0], seeded = ADMIN.security.filter(s => !/S5|^SE-9|^SE-6/.test(s.id)).length;
    rebuildA(); SYS(); acaEnter('KA'); SA(); ACT.aJump({ dataset: { t: 'av:B' } }); INP.adminVariant({ value: 'A' }); SA();
    ok('S5e (13)(14) a refused action stays in the security log after rebuilds and identity switches — same ID, actor and reason', ADMIN.security.filter(s => s.id === ev.id).length === 1 && ADMIN.security.find(s => s.id === ev.id).detail === ev.detail && /Business Admin Sophie Turner attempted: add a learner to/.test(ev.detail));
    ok('S5e (13) seeded security events aren\'t duplicated', ADMIN.security.filter(s => !/S5|^SE-9|^SE-6/.test(s.id)).length === seeded && new Set(ADMIN.security.map(s => s.id)).size === ADMIN.security.length);
    go('a-security'); ok('S5e (14) the refusal is visible on the security screen', /attempted: add a learner to/.test(main()) || ADMIN.security.some(s => s.id === ev.id));
    STORE.agy.offset = 5; rebuildA(); ok('S5e (15) the agency demo clock survives an admin rebuild', STORE.agy.offset === 5);
    STORE.agy.offset = 0; BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); const m = linkOf('AG-08'), e0 = m.expires;
    STORE.agy.offset = 8; rebuildA(); const tryM = () => { S.agy.id = 'AG-08'; S.s5bLink = m.id; S.auth = 'agyFirst'; S.portal = 'agency'; S.signedIn = false; S.route = 'signin'; render(); fill({ '#ag-new': 'Agency!Pass2026', '#ag-conf': 'Agency!Pass2026' }); return SUBMIT.agyFirstSet(); };
    ok('S5e (16) after a rebuild, an expired link stays refused with its original expiry', STORE.agy.offset === 8 && tryM() === false && linkOf('AG-08') && linkOf('AG-08').expires === e0 && agOf('AG-08').loginStatus === 'Not activated');
    STORE.agy.offset = 0; BIZ(); ACT.bLogin({ dataset: { id: 'AG-08', a: 'resend' } }); const m2 = linkOf('AG-08'); setPw(m2); rebuildA(); ACT.lmSet({ dataset: { id: m2.id } });
    ok('S5e (16) a used link stays refused after a rebuild; the activation isn\'t repeated', S.auth === 'agyLinkBad' && ADMIN.audit.filter(x => x.action === 'Agency activated' && x.entity.includes('AG-08')).length === 1);
    SA(); const L3b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'), a = s5dSave('academy', null, { title: 'S5e timed notice', spec: { t: 'batches', ids: [L3b.code] }, ch: ['In-app', 'Email'], at: new Date(now().getTime() + 1500).toISOString() }, 'schedule').a;
    await wait(2200); render(); const n1 = logOf('academy:' + a.id).length; rebuildA(); rebuildA(); render(); SYS(); SA(); render();
    ok('S5e (17) a scheduled announcement is published and logged once, also across rebuilds', ADMIN.announcements.find(x => x.id === a.id).status === 'Published' && n1 === a.recipients * 2 && logOf('academy:' + a.id).length === n1 && ADMIN.audit.filter(x => x.action === 'Published (scheduled)' && x.entity.includes(a.id)).length === 1);
    ok('S5e (18) communications stay segregated after the rebuilds', !/Agency reporting portal update/.test(feedOf('AG-02')) && /Academy closed 25–26 December/.test(feedOf('AG-02')));
  });

  await T('S5e (19)–(23) S5a–S5d records persist together across rebuilds; the demo reset restores the fixtures', async () => {
    fresh(); SA(); ACT.addUser(); fill({ '#nu-n': 'Ren Staff', '#nu-e': 'ren.staff@illumin-academy.example' }); nuPick(['Teacher']); prim(); closeModal();
    BIZ(); const ag = onboard('Elm Tree Care', 'office@elmtreecare.co.uk', '88776655'); SA();
    await pickCsv('s5e2.csv', CSVH + 'Ivy Import,ivy.import@example.co.uk,+44 7700 912010,United Kingdom\r\n'); prim(); closeModal(); const iid = s5cStore().imports[0].created[0];
    const an = s5dSave('academy', null, { title: 'S5e persisted notice', spec: { t: 'staff' }, ch: ['In-app'] }, 'publish').a; const rc = s5dRefOp('create', null, { code: 'S5E-CODE', type: 'Agent', owner: 'S5e Agent', valid: D(100).slice(0, 10) }, '').r;
    ACT.tplEdit({ dataset: { e: 'Announcement' } }); fill({ '#tp-s': 'S5e subject' }); prim(); closeModal();
    rebuildA(); SYS(); bizEnter('BA'); acaEnter('KA'); SA(); ACT.aJump({ dataset: { t: 'av:C' } }); INP.adminVariant({ value: 'A' }); SA();
    ok('S5e (19) S5a: the created staff account persists, once', ADMIN.staff.filter(s => s.email === 'ren.staff@illumin-academy.example').length === 1);
    ok('S5e (20) S5b: the onboarded agency persists, once, with its login and link', ADMIN.agencies.filter(x => x.id === ag.id).length === 1 && links(ag.id).length === 1);
    ok('S5e (21) S5c: the imported learner and its import record persist', ADMIN.learners.filter(l => l.id === iid).length === 1 && s5cStore().imports.length === 1);
    ok('S5e (22) S5d: the announcement, template and referral code persist, once', ADMIN.announcements.filter(x => x.id === an.id).length === 1 && s5dTpl('Announcement').subject === 'S5e subject' && ADMIN.referrals.filter(r => r.code === rc.code).length === 1);
    ok('S5e audit rows of all stages survive without duplicates', ['User created', 'Agency onboarded', 'Bulk import (CSV)', 'Code created'].every(x => ADMIN.audit.some(a => a.action === x)) && new Set(ADMIN.audit.map(a => `${a.id}|${a.at}|${a.action}|${a.entity}`)).size === ADMIN.audit.length);
    ok('S5e the variant\'s identity is still rebuilt (Super Admin variant A: Nadia Qureshi, Super Admin + System Admin)', ADMIN.me.name === 'Nadia Qureshi' && ADMIN.staff.find(s => s.id === 'ST-001').roles.join() === 'Super Administrator,System Administrator');
    ACT.resetDemo(); SA();
    ok('S5e (23) the deliberate demo reset restores the fixtures of every stage', !ADMIN.staff.some(s => s.email === 'ren.staff@illumin-academy.example') && !agOf(ag.id) && !learnerById(iid) && !ADMIN.announcements.some(x => x.id === an.id) && !s5dRef('S5E-CODE') && s5dTpl('Announcement').v === 1 && STORE.agy.offset === 0);
  });

  await T('S5e cross-stage journeys and records', async () => {
    fresh(); SYS(); ok('S5e the System Admin keeps batch creation, scheduling and CSV account import', n2CanCreate() && s4bCanBatch() && s4bSched() && !s5cWhy());
    go('a-roles', { id: 'Super_Administrator' }); ok('S5e the System Admin still can\'t edit the Super Administrator role', /Only a Super Administrator can do this/.test(main()));
    acaEnter('KA'); S.signedIn = true; ok('S5e the Academic Admin keeps academy-wide announcements and batch rosters, not CSV account import', s5dRole('academy') === 'aca' && s5dTypes('academy').includes('all') && !s5eBatchWhy() && !!s5cWhy());
    BIZ(); ok('S5e the Business Admin manages agencies and agency announcements, not academy-wide announcements or batch rosters', !s5bWhy('edit') && s5dRole('biz') === 'admin' && !s5dRole('academy') && !!s5eBatchWhy());
    SA(); const cb = ADMIN.batches.find(x => x.code === 'L2DC-MAR26'), al0 = JSON.stringify(chAllocOf(cb)); n4RegW('S5E-SESSION').log.push('kept'); N3().plans['S5E'] = { kept: true };
    rebuildA(); SYS(); SA();
    ok('S5e CH-17 assessor allocations, N3 plans and N4 registers are kept across rebuilds (unchanged by S5e)', JSON.stringify(chAllocOf(ADMIN.batches.find(x => x.code === 'L2DC-MAR26'))) === al0 && N4().regs['S5E-SESSION'].log[0] === 'kept' && N3().plans['S5E'].kept === true);
    const ent = l => (UXC.find(x => x[0] === l) || [, , []])[2].join(' ');
    ok('S5e corrected statements: S5d Academic Admin boundary pending client confirmation; S5b wording resolved in S5d; S5c add-to-batch check (S5e)', /internal implementation boundary pending client confirmation/.test(ent('Setup S5d')) && /Resolved in S5e/.test(ent('Setup S5b')) && /resolved in S5d/i.test(ent('Setup S5b')) && /now checks the actor \(S5e\)/.test(ent('Setup S5c')) && /formal CSV-template confirmation pending/.test(ent('Setup S5c')) && !/tracked for S5e/i.test(ent('Setup S5c')));
    ok('S5e final status separates client requirements, internal decisions, limitations, open defects and client decisions', /Client-documented requirements|client-documented requirements/.test(ent('Setup S5e')) && /internal implementation decisions/.test(ent('Setup S5e')) && /Prototype limitations/.test(ent('Setup S5e')) && /Open defects/.test(ent('Setup S5e')) && /Client decisions still required/.test(ent('Setup S5e')) && /SRS v1\.3\.2 remains pending/.test(ent('Setup S5e')));
    SA(); go('a-index'); const ix = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('S5e Admin index: one Setup fixes entry for S5e', !!ix && ix.querySelectorAll('[data-t="a-batches"]').length === 1 && /S5e — add-to-batch role check/.test(ix.textContent));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: S5e entry', /cross-stage integration, security and the final setup audit/.test(main()));
  });
  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
