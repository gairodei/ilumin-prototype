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
    go('demo-scenarios'); ok('Demo Scenarios: 28 (S3: #28 added)', app().querySelectorAll('main section[id^="sc-"]').length === 28);
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent)); ok('Admin index: S2 entries with purposes (S3: 6 entries added)', !!sec && !!sec.querySelector('[data-t="a-assignments.a8.questions"]') && sec.querySelectorAll('li').length === 11);
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
    go('demo-scenarios'); ok('Demo Scenarios: 28', app().querySelectorAll('main section[id^="sc-"]').length === 28);
    SA(); go('a-index'); const sec = [...app().querySelectorAll('main .idx-sec')].find(x => /Setup fixes/.test(x.textContent));
    ok('Admin index: S3 entries with purposes', !!sec && ['a-programmes.NV-L4.tree', 'a-programmes.NV-L3.versions', 'a-programmes.NV-L3D.tree', 'k-obslib', 'a-programmes.NV-L3.types'].every(t => !!sec.querySelector('[data-t="' + t + '"]')) && sec.querySelectorAll('li').length === 11);
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

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
