// Setup fixes S1–S5 — every check does the admin action, then checks the consuming screen (Browse, the learner's
// enrolment, quiz and certificate, the assessor's marking, sign-up).
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
    go('demo-scenarios'); ok('Demo Scenarios: 27', app().querySelectorAll('main section[id^="sc-"]').length === 27);
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent)); ok('Admin index: S2 entries with purposes', !!sec && !!sec.querySelector('[data-t="a-assignments.a8.questions"]') && sec.querySelectorAll('li').length === 5);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
