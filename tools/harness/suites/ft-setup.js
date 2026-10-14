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
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent)); ok('Admin index: S2 entries with purposes (S3: 6, S4a: 5, S4b: 3 entries added)', !!sec && !!sec.querySelector('[data-t="a-assignments.a8.questions"]') && sec.querySelectorAll('li').length === 19);
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
    ok('Admin index: S3 entries with purposes', !!sec && ['a-programmes.NV-L4.tree', 'a-programmes.NV-L3.versions', 'a-programmes.NV-L3D.tree', 'k-obslib', 'a-programmes.NV-L3.types'].every(t => !!sec.querySelector('[data-t="' + t + '"]')) && sec.querySelectorAll('li').length === 19 /* S4a: 5, S4b: 3 entries added */);
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
    ok('Admin index: S4a entries with purposes', !!sec && ['a-admissions..builder', 'f-plans..templates', 'a-finance..plans', 'a-programmes.NV-L3.letter'].every(t => !!sec.querySelector('[data-t="' + t + '"]')) && sec.querySelectorAll('li').length === 19 /* S4b: 3 entries added */);
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

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
