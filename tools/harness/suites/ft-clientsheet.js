// Client suggestion sheet — C1, C2, C3, C4, C5, C7, C8, C10, C11, C12, C14, C15; held items 6, 9, 13 untouched;
// Demo Scenario #18; screen index; UX Changelog and Client Decisions Log entries.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const mroot = () => document.getElementById('modal-root');
  const lastToast = () => { const t = document.querySelectorAll('#toasts .toast'); return t.length ? t[t.length - 1].textContent : ''; };
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; initStore(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const staff = (v = 'A') => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };

  /* ---------- C1 ---------- */
  await T('C1 criteria PDF + evidence requirements', async () => {
    fresh(); learner('C');
    W.assignments.forEach(a => { go('assignment', { id: a.id }); const b = app().querySelector('.page-h [data-act="csCritPdf"]'); ok(`C1 ${a.id}: "Download criteria (PDF)" at the top`, !!b && b.textContent.trim() === 'Download criteria (PDF)'); });
    const a = W.assignments.find(x => x.id === 'a3'); go('assignment', { id: 'a3' });
    const qs = [...app().querySelectorAll('.q')];
    ok('C1 every question shows its criterion with evidence requirements', qs.length === a.qs.length && qs.every(q => /Evidence requirements/.test(q.textContent) && q.querySelector('.cs-crit')), qs.length + ' / ' + a.qs.length);
    const c0 = allCrit().find(x => x.code === a.qs[0].crit);
    ok('C1 question shows the descriptor and evidence wording', qs[0] && c0 && qs[0].textContent.includes(c0.d) && qs[0].textContent.includes(c0.type === 'Knowledge' ? 'Written evidence that addresses every part of the descriptor' : 'Direct observation in the workplace'));
    ok('C1 linked criteria in the Brief show evidence requirements', (main().match(/Evidence requirements: /g) || []).length === a.crit.length, (main().match(/Evidence requirements: /g) || []).length + ' / ' + a.crit.length);
    ACT.csCritPdf({ dataset: { id: 'a3' } });
    ok('C1 mock PDF download with a toast', /criteria\.pdf/.test(lastToast()) && /download/i.test(lastToast()), lastToast());
    const body = mroot().textContent;
    ok('C1 PDF has title, programme and unit/module', !!MODAL && body.includes(a.title) && body.includes(W.nvq.title) && body.includes(a.unit) && body.includes('Duty of care in care settings'));
    let pos = -1, inOrder = true; a.qs.forEach(q => { const p = body.indexOf(q.text); if (p <= pos) inOrder = false; pos = p; });
    ok('C1 PDF lists every question in order', inOrder && mroot().querySelectorAll('.cs-pdf-q > li').length === a.qs.length);
    ok('C1 each question: code, descriptor, assessment type, evidence requirements', [...mroot().querySelectorAll('.cs-pdf-q > li')].every((li, i) => { const c = csCrit(a, a.qs[i].crit); return li.textContent.includes(c.code) && li.textContent.includes(c.d) && /Assessment type(Knowledge|Observation \/ Competency)/.test(li.textContent) && li.textContent.includes(c.ev); }));
    ok('C1 Download PDF sits in the pop-up', !!MODAL.actions.find(x => /Download PDF/.test(x.label)));
    closeModal();
    ok('C1 staff question header unchanged (learner-only block)', !/cs-crit/.test(qHead(a.qs[0], 0)) && !/Evidence requirements/.test(asgHeader(a)));
    learner('D'); go('assignment', { id: 'a3' }); ok('C1 works for the sponsored learner too', !!app().querySelector('[data-act="csCritPdf"]') && /Evidence requirements/.test(main()));
  });

  /* ---------- C2 ---------- */
  await T('C2 certificates list', async () => {
    fresh(); learner('A'); go('certificates');
    ok('C2 tabs replaced by one list', !app().querySelector('[data-act="certTab"]') && !app().querySelector('.tabs'));
    const order = [...app().querySelectorAll('.grid > article')].map(a => { const c = W.certs.find(x => a.textContent.includes(x.course)); return c && c.status; });
    const want = ['Valid', 'Expiring soon', 'Expired', 'Revoked', 'Processing'];
    ok('C2 sorted Valid → Expiring soon → Expired → Revoked (Processing last)', order.length === W.certs.length && order.every((s, i) => i === 0 || want.indexOf(order[i - 1]) <= want.indexOf(s)) && order[order.length - 1] === 'Processing', order.join(', '));
    const c1 = W.certs.find(c => c.id === 'c1'), cards = app().querySelectorAll('.cs-exp');
    ok('C2 yellow reminder card for the expiring certificate', cards.length === 1 && cards[0].classList.contains('b-amber') && cards[0].textContent.includes(`Moving and Handling People certificate expires in ${daysTo(c1.expires)} days`), cards[0] && cards[0].textContent);
    ok('C2 Renew goes to course re-purchase', !!(cards[0] && cards[0].querySelector('[data-act="renewCert"][data-id="c1"]')));
    ok('C2 status filter kept as an option', !!app().querySelector('select#cs-certf'));
    INP.csCertF({ value: 'Expired' }); ok('C2 filter shows only that status', [...app().querySelectorAll('.grid > article')].every(a => /Expired/.test(a.textContent)) && app().querySelectorAll('.grid > article').length === W.certs.filter(c => c.status === 'Expired').length);
    INP.csCertF({ value: '' });
    ok('C2 preview and download kept', !!app().querySelector('[data-act="viewCert"]') && /Copy verification link/.test(main()));
    ACT.viewCert({ dataset: { id: 'c5' } }); ok('C2 certificate preview still opens with Download PDF', !!MODAL && !!MODAL.actions.find(x => /Download PDF/.test(x.label))); closeModal();
    const extra = ['c90', 'c91', 'c92', 'c93'].map((id, k) => ({ ...c1, id, course: 'Test course ' + k, expires: D(30 + k) }));
    W.certs.push(...extra); go('certificates');
    ok('C2 at most 3 cards, then "+N more"', app().querySelectorAll('.cs-exp').length === 3 && /\+2 more/.test(app().querySelector('.cs-more').textContent));
    ACT.csCertMore(app().querySelector('.cs-more')); ok('C2 "+N more" shows every expiring certificate', ui('csCertF') === 'Expiring soon' && app().querySelectorAll('.grid > article').length === 5);
    W.certs = W.certs.filter(c => !extra.includes(c)); setUi('csCertF', '');
    learner('D'); go('certificates'); ok('C2 no reminder card when nothing is expiring', !app().querySelector('.cs-exp'));
  });

  /* ---------- C3 ---------- */
  await T('C3 phone call PD mode', async () => {
    fresh(); learner('D');
    ok('C3 mock: Grace\'s PD is by phone, no Zoom link', W.pd.session.mode === 'phone_call' && !W.pd.session.zoom);
    go('progress', { tab: 'pd' });
    ok('C3 learner sees "Phone call — your assessor will call you on your registered number"', main().includes('Phone call — your assessor will call you on your registered number') && !app().querySelector('[data-act="joinPd"]'));
    ACT.pdConfirm(); ok('C3 confirm dialog names the mode in words', !!MODAL && /Phone call/.test(mroot().textContent) && !/phone_call/.test(mroot().textContent)); closeModal();
    const it = actionItems().find(a => /Professional Discussion/.test(a.t)); ok('C3 dashboard action says "Phone call"', !!it && /Phone call$/.test(it.d), it && it.d);
    go('calendar'); ok('C3 learner calendar event has a phone icon', !!app().querySelector('.ev[data-id="epd"] .cs-ph'));
    setUi('calView', 'agenda'); go('calendar'); ok('C3 agenda shows the phone icon', [...app().querySelectorAll('.li')].some(li => li.querySelector('.lg-pd') && li.querySelector('.cs-ph'))); setUi('calView', 'month');
    learner('C'); go('calendar'); ok('C3 in-person PD keeps no phone icon', !app().querySelector('.ev[data-id="epd"] .cs-ph'));
    staff('A'); go('t-pd');
    const card = [...app().querySelectorAll('section.card')].find(s => s.querySelector('h2') && s.querySelector('h2').textContent === VNAME('D'));
    ok('C3 assessor sees the phone session', !!card && /Phone call/.test(card.textContent) && !/Zoom link generated/.test(card.textContent));
    const lidC = STORE.worlds.C.me.id; ACT.pdPropose({ dataset: { l: lidC } });
    ok('C3 assessor can choose Phone call', !!mroot().querySelector('#pd-m option[value="phone_call"]'));
    const sel = mroot().querySelector('#pd-m'); sel.value = 'phone_call'; INP.csPdMode(sel);
    ok('C3 location field hidden for phone', mroot().querySelector('#pd-l-f').style.display === 'none');
    prim(); closeModal();
    const sC = STORE.worlds.C.pd.session, evC = STORE.worlds.C.events.find(e => e.id === 'epd');
    ok('C3 stored as phone_call with no Zoom link', sC.mode === 'phone_call' && !sC.zoom && !sC.loc, JSON.stringify(sC));
    ok('C3 calendar event marked as phone', evC && evC.mode === 'phone_call');
    ok('C3 learner notification says "Phone call"', STORE.worlds.C.notifs.some(n => /\(Phone call\)/.test(n.body || '')) && !STORE.worlds.C.notifs.some(n => /phone_call/.test(n.body || '')));
    go('t-calendar'); ok('C3 Teacher/Assessor calendar shows the phone icon', !!app().querySelector('.ev[data-id="epd"] .cs-ph'));
    const evBtn = app().querySelector('.ev[data-id="epd"][data-b="L2DC-MAR26"]'); if (evBtn) { ACT.tasEvPop(evBtn); ok('C3 event pop-up says Phone call, no Zoom link', !!MODAL && /Phone call/.test(mroot().textContent) && !/zoom\.us/.test(mroot().textContent)); closeModal(); } else ok('C3 Grace\'s event on the staff calendar', false);
    ACT.pdPropose({ dataset: { l: lidC } }); mroot().querySelector('#pd-m').value = 'Online'; prim(); closeModal();
    ok('C3 Online still creates a Zoom link', STORE.worlds.C.pd.session.mode === 'Online' && !!STORE.worlds.C.pd.session.zoom && !STORE.worlds.C.events.find(e => e.id === 'epd').mode);
    staff('T'); go('t-index'); ok('C3 Teacher-only index has no PD entry', !app().querySelector('[data-t="t-pd"]'));
  });

  /* ---------- C4 ---------- */
  await T('C4 open assessment from Resources', async () => {
    fresh(); learner('C'); go('resources');
    const heads = [...app().querySelectorAll('.cs-modhead')];
    const btnOf = u => { const h = heads.find(x => x.textContent.includes(u)); return h && h.querySelector('[data-go="assignment"]'); };
    ok('C4 U306 module opens Assignment 4', !!btnOf('U306') && btnOf('U306').dataset.id === 'a4' && /Open assessment/.test(btnOf('U306').textContent));
    ok('C4 U305 module opens Assignment 3', !!btnOf('U305') && btnOf('U305').dataset.id === 'a3');
    ok('C4 hidden when the module has no assignment (U307 Module 2)', !btnOf('U307') && heads.length === 2);
    W.resources[0].asg = ['a4', 'a3']; go('resources');
    const list = app().querySelector('.cs-asg-list'); ok('C4 several assignments → a small list', !!list && list.querySelectorAll('[data-go="assignment"]').length === 2);
    learner('B'); go('resources'); ok('C4 hidden for an applicant (no assignments yet)', !/Open assessment/.test(main()));
  });

  /* ---------- C5 ---------- */
  await T('C5 receipt pop-up', async () => {
    fresh(); learner('C'); go('payments');
    const b = [...app().querySelectorAll('[data-act="fakeDl"]')].find(x => /^Receipt RCP-/.test(x.dataset.f)); b.click();
    const no = b.dataset.f.match(/RCP-\d+/)[0], t = mroot().textContent, pl = W.plans.find(p => p.rows.some(r => r.receipt === no)), x = csReceipt(pl, pl.rows.find(r => r.receipt === no).n);
    ok('C5 clicking a receipt opens a preview pop-up', !!MODAL && MODAL.title === 'Receipt ' + no, MODAL && MODAL.title);
    ok('C5 shows number, date, payer, item, amount + currency, method, status', ['Receipt number', 'Date', 'Payer', 'Item', 'Amount', 'Method', 'Status'].every(k => t.includes(k)) && t.includes(no) && t.includes('Aisha Rahman') && t.includes(x.item) && t.includes(money(x.amount, x.cur)) && t.includes('GBP') && t.includes(x.method) && t.includes(fd(x.at)) && /Paid/.test(t), JSON.stringify(x));
    const v3 = csReceipt(W.plans.find(p => p.e === 'nvq'), 3); ok('C5 method comes from the matching payment', v3.method === 'Visa •••• 4417', v3.method);
    const dl = MODAL.actions.find(x => /Download/.test(x.label)); dl.fn(); ok('C5 Download sits inside the pop-up', /\.pdf downloaded/.test(lastToast()) && !!MODAL, lastToast());
    closeModal(); const dep = [...app().querySelectorAll('[data-act="fakeDl"]')].find(x => /deposit/.test(x.dataset.f)); dep.click(); ok('C5 deposit receipt opens the same pop-up', !!MODAL && /^Receipt RCP-/.test(MODAL.title) && /deposit/.test(mroot().textContent));
    closeModal(); const n0 = document.querySelectorAll('#toasts .toast').length; ACT.fakeDl({ dataset: { f: 'Slides: types of harm and abuse' } }); ok('C5 other downloads unchanged', !MODAL && document.querySelectorAll('#toasts .toast').length === n0 + 1);
    S.frame = 'mobile'; render(); b.isConnected; [...app().querySelectorAll('[data-act="fakeDl"]')].find(x => /^Receipt RCP-/.test(x.dataset.f)).click();
    const m = mroot().querySelector('.modal'), cs = m && getComputedStyle(m);
    ok('C5 phones: full-screen sheet', !!m && m.classList.contains('cs-sheet') && cs.top === '0px' && cs.borderRadius === '0px' && Math.abs(m.getBoundingClientRect().height - window.innerHeight) < 2, cs && cs.top + ' ' + cs.borderRadius + ' ' + (m && m.getBoundingClientRect().height));
    closeModal(); S.frame = 'auto'; render();
  });

  /* ---------- C7 ---------- */
  await T('C7 Needs attention badge + Action needed', async () => {
    fresh(); learner('C'); go('dashboard');
    const items = () => [...app().querySelectorAll('.action-panel .ap-item')].map(li => ({ t: li.querySelector('.ap-b .strong').textContent.trim(), b: li.querySelector('button') }));
    const item = t => items().find(x => x.t === t), count = re => items().filter(x => re.test(x.t)).length;
    const badge = () => app().querySelector('.hello .cs-status');
    ok('C7 no separate "Needs attention" card', !app().querySelector('.cs-attn') && ![...app().querySelectorAll('h2')].some(h => h.textContent.trim() === 'Needs attention'));
    ok('C7 badge next to the greeting: "Needs attention" (amber)', !!badge() && badge().textContent.trim().endsWith('Needs attention') && badge().classList.contains('t-amber') && !!badge().closest('.cs-hello-h') && !!badge().closest('.cs-hello-h').querySelector('h1'), badge() && badge().outerHTML.slice(0, 120));
    ok('C7 "1 assignment overdue" in Action needed → Assignments', !!item('1 assignment overdue') && item('1 assignment overdue').b.dataset.go === 'assignments', items().map(x => x.t).join(' | '));
    const c1 = W.certs.find(c => c.id === 'c1'), ct = `Certificate expires in ${daysTo(c1.expires)} days`;
    ok('C7 "Certificate expires in N days" in Action needed → Certificates', !!item(ct) && item(ct).b.dataset.go === 'certificates');
    ok('C7 payment overdue is the existing "Pay instalment N — overdue" item only', count(/^Pay instalment \d+ — overdue/) === 1 && !item('Payment overdue'));
    ok('C7 resubmission is the existing "Resubmission required" item only', count(/^Resubmission required: Assignment 2/) === 1 && count(/^Resubmission due/) === 0);
    const all = items().map(x => x.t);
    ok('C7 no reason appears twice on the dashboard', all.length === new Set(all).size && count(/assignments? overdue$/) === 1 && count(/^Certificate expires in/) === csExpiring().length && count(/overdue/i) === 2, all.join(' | '));
    ok('C7 greeting count matches Action needed', new RegExp(plural(all.length, 'action') + ' needed').test(app().querySelector('.hello').textContent), all.length);
    ok('C7 never "At risk" on the learner dashboard', !/At risk/.test(main()));
    badge().click(); ok('C7 badge scrolls to Action needed', document.activeElement && document.activeElement.id === 'ap-h');
    W.nvq.projected = D(W.nvq.end ? daysTo(W.nvq.end) + 20 : 200); go('dashboard');
    ok('C7 "Behind schedule for your end date" → Progress, once (temporary data)', count(/^Behind schedule for your end date$/) === 1 && item('Behind schedule for your end date').b.dataset.go === 'progress');
    go('progress'); ok('C7 Progress agrees: behind schedule', /behind schedule/.test(main())); delete W.nvq.projected;
    go('progress'); ok('C7 Progress unchanged by default: on track', /— on track/.test(main()));
    W.assignments.forEach(a => { a._k = [a.closed, a.due]; a.closed = false; a.due = D(30); }); const po = W.payOverdue, plans = W.plans; W.payOverdue = null; W.plans = []; const cs = W.certs; W.certs = W.certs.filter(c => c.status !== 'Expiring soon');
    go('dashboard'); ok('C7 no reason → "On track" (green)', !!badge() && badge().textContent.trim().endsWith('On track') && badge().classList.contains('t-green') && count(/assignments? overdue$|^Behind schedule|^Certificate expires/) === 0);
    const a2 = W.assignments.find(a => a.id === 'a2'), keep = a2.resubDue; a2.resubDue = D(2); go('dashboard');
    ok('C7 resubmission due in 3 days or fewer → "Needs attention" (temporary data)', badge().textContent.trim().endsWith('Needs attention') && count(/^Resubmission required: Assignment 2/) === 1); a2.resubDue = keep;
    W.assignments.forEach(a => { [a.closed, a.due] = a._k; delete a._k; }); W.payOverdue = po; W.plans = plans; W.certs = cs;
    learner('A'); go('dashboard'); ok('C7 short-course dashboards unchanged (no badge, no added items)', !app().querySelector('.cs-status') && count(/assignments? overdue$|^Behind schedule|^Certificate expires/) === 0);
    staff('A'); go('t-students'); ok('C7 staff screens keep "At risk"', /At risk/.test(main()));
  });

  /* ---------- C8 ---------- */
  await T('C8 document preview', async () => {
    fresh(); learner('B'); go('admission');
    const has = id => !!app().querySelector(`#doc-${id} > p [data-act="csDoc"], #doc-${id} .reason ~ * [data-act="csDoc"], #doc-${id} p [data-act="csDoc"]`);
    ok('C8 Submitted, Approved, Rejected, Resubmission Required files open a preview', ['d1', 'd3', 'd4', 'd5'].every(has) && ['Approved', 'Rejected', 'Resubmission Required', 'Submitted'].every(s => W.docs.filter(d => d.status === s).every(d => has(d.id))));
    ok('C8 nothing to preview before upload (Pending)', !app().querySelector('#doc-d6 [data-act="csDoc"]'));
    app().querySelector('#doc-d5 [data-act="csDoc"]').click();
    ok('C8 PDF renders inside the pop-up (mock)', !!MODAL && !!mroot().querySelector('.cs-docview.pdf') && /bsc_certificate\.pdf/.test(mroot().textContent) && / MB/.test(mroot().textContent));
    ok('C8 Download in the pop-up', !!MODAL.actions.find(x => /Download/.test(x.label))); closeModal();
    app().querySelector('#doc-d4 [data-act="csDoc"]').click(); ok('C8 image renders inside the pop-up (mock)', !!mroot().querySelector('.cs-docview.img')); closeModal();
    ACT.csDoc({ dataset: { id: 'd5', f: 'statement.docx' } }); const t = mroot().textContent;
    ok('C8 other types: name, size, upload date and Download (temporary data)', /No preview for this file type/.test(t) && /statement\.docx/.test(t) && / MB/.test(t) && /Uploaded/.test(t) && !!MODAL.actions.find(x => /Download/.test(x.label))); closeModal();
    ok('C8 version history files open the preview too', !!app().querySelector('#doc-d1 details [data-act="csDoc"]'));
    ok('C8 mock sizes under the 5 MB limit', W.docs.filter(d => d.file).every(d => parseFloat(d.size) < 5));
  });

  /* ---------- C10 ---------- */
  await T('C10 purchase history', async () => {
    fresh(); learner('A'); go('payments');
    const rows = DT['cs-purch'] && DT['cs-purch'].rows;
    ok('C10 "Purchase history" section with 3+ purchases', /Purchase history/.test(main()) && rows && rows.length >= 3, rows && rows.length);
    ok('C10 sorted newest first', rows.every((r, i) => i === 0 || new Date(rows[i - 1].at) >= new Date(r.at)));
    const ths = [...app().querySelectorAll('.cs-purch th')].map(t => t.textContent.trim()).join('|');
    ok('C10 columns: date, course, amount + currency, method, status, receipt', ['Date', 'Course', 'Amount', 'Payment method', 'Status', 'Receipt'].every(c => ths.includes(c)), ths);
    ok('C10 status words come from the fixed vocabulary', rows.every(r => TONE[r.status]), rows.map(r => r.status).join(','));
    ok('C10 a refunded purchase shows Refunded', rows.some(r => r.status === 'Refunded'));
    app().querySelector('.cs-purch [data-act="csReceipt"]').click(); ok('C10 receipt link opens the C5 pop-up', !!MODAL && /^Receipt RCP-/.test(MODAL.title)); closeModal();
    S.frame = 'mobile'; render(); ok('C10 cards on phones (shared table)', !!app().querySelector('.cs-purch table.dt-cards')); S.frame = 'auto'; render();
    W.plans = []; W.tx = []; go('payments'); ok('C10 empty state "No purchases yet" with Browse Courses (temporary data)', /No purchases yet/.test(main()) && !!app().querySelector('.cs-purch [data-go="browse"]') && app().querySelectorAll('h1').length === 1);
    learner('C'); go('payments'); ok('C10 not shown to NVQ learners', !/Purchase history/.test(main()));
  });

  /* ---------- C11 + C12 ---------- */
  await T('C11 / C12 short-course dashboard', async () => {
    fresh(); learner('A'); go('dashboard');
    const card = k => app().querySelector(`.cs-card[data-cs="${k}"]`), sh = W.enrolments.filter(e => e.kind === 'short');
    ok('C11 three cards at the top', app().querySelectorAll('.cs-cards .cs-card').length === 3 && app().querySelector('.cs-cards').previousElementSibling.classList.contains('hello'));
    ok('C11 Account: Active', !!card('account') && /Active/.test(card('account').textContent));
    const q = sh.filter(e => e.status === 'Active').flatMap(e => e.modules.filter(m => !m.quiz.attempts.some(a => a.result === 'Pass') && m.quiz.max > m.quiz.attempts.length).map(m => e)), ip = sh.filter(e => e.status === 'Active');
    ok('C11 Tasks: module quizzes to complete + courses in progress (CH-26)', card('tasks').textContent.includes(`${q.length} module quizzes to complete`) && card('tasks').textContent.includes(`${ip.length} courses in progress`), card('tasks').textContent);
    const first = card('tasks').querySelector('[data-go="course"]'); ok('C11 Tasks links to the first task', !!first && first.dataset.id === q[0].id && first.dataset.tab === 'quiz');
    const nums = [...card('courses').querySelectorAll('.cs-n')].map(n => +n.textContent);
    ok('C11 Courses: in progress, completed, expired', nums.join() === [ip.length, sh.filter(e => e.status === 'Completed').length, sh.filter(e => e.status === 'Expired-Incomplete').length].join() && !!card('courses').querySelector('[data-go="courses"]'), nums.join());
    S.edge = 'unverified'; ok('C11 Account: Pending verification', /Pending verification/.test(SCREENS.dashboard({}))); S.edge = 'none';
    const c1 = W.certs.find(c => c.id === 'c1'), ex = app().querySelector('.cs-exp');
    ok('C12 "[Course] — expires in N days" card', !!ex && ex.textContent.includes(`Moving and Handling People — expires in ${daysTo(c1.expires)} days`), ex && ex.textContent);
    ok('C12 Renew → re-purchase', !!(ex && ex.querySelector('[data-act="renewCert"]')));
    ex.querySelector('[data-act="renewCert"]').click(); ok('C12 Renew opens checkout', !!MODAL || S.route === 'checkout', S.route); closeModal();
    learner('A'); go('dashboard'); c1.status = 'Valid'; go('dashboard'); ok('C12 hidden when nothing is expiring (same data as C2)', !app().querySelector('.cs-exp')); c1.status = 'Expiring soon';
    learner('C'); go('dashboard'); ok('C11 not on NVQ dashboards', !app().querySelector('.cs-cards'));
  });

  /* ---------- C14 ---------- */
  await T('C14 quiz intro heading', async () => {
    fresh(); learner('A'); go('course', { id: 'mh26', tab: 'quiz' });
    const h2 = [...app().querySelectorAll('h2')].map(h => h.textContent.trim());
    ok('C14 heading "What is this module about?" (CH-28)', h2.includes('What is this module about?') && !h2.includes('What is this course about?') && !h2.includes('Course quiz'), h2.join(' | '));
    ok('C14 instructions line kept below it', /The timer starts when you begin and can't be paused/.test(main()) && ['Questions', 'Time limit', 'Pass mark', 'Attempts used'].every(k => main().includes(k)));
  });

  /* ---------- C15 ---------- */
  await T('C15 Show discontinued', async () => {
    fresh(); staff('A'); go('t-students');
    const all = tasLearners(), disc = all.filter(l => l.status === 'Discontinued');
    ok('C15 mock: one discontinued learner in the list', disc.length >= 1, disc.length);
    let rows = DT.tstud.rows; const sub = () => (app().querySelector('.page-h .sub') || {}).textContent || '';
    ok('C15 hidden by default', rows.every(l => l.status !== 'Discontinued') && rows.length === all.length - disc.length);
    ok('C15 count reflects it', sub().startsWith(`${rows.length} learners`), sub());
    const fopts = () => [...app().querySelectorAll('#dtf-tstud-f option, #dtf-tstud-s option')].map(o => o.textContent);
    ok('C15 filters reflect it (no Discontinued option)', !fopts().includes('Discontinued'));
    const box = app().querySelector('input[data-onchange="csShowDisc"]'); ok('C15 "Show discontinued" tick-box', !!box && !box.checked && /Show discontinued/.test(box.closest('label').textContent));
    box.checked = true; INP.csShowDisc(box); rows = DT.tstud.rows;
    ok('C15 ticked: they appear again', rows.length === all.length && rows.some(l => l.status === 'Discontinued') && sub().startsWith(`${all.length} learners`));
    S.ui['dt-tstud'].f.f = 'Discontinued'; render();
    const tr = [...app().querySelectorAll('.dt tbody tr')]; ok('C15 greyed out with the Discontinued chip', tr.length === disc.length && tr.every(r => r.classList.contains('muted') && /Discontinued/.test(r.textContent)) && fopts().includes('Discontinued'));
    go('t-dashboard'); go('t-students'); ok('C15 remembered within the session', ui('csShowDisc') === true && app().querySelector('input[data-onchange="csShowDisc"]').checked);
    const b2 = app().querySelector('input[data-onchange="csShowDisc"]'); b2.checked = false; INP.csShowDisc(b2);
    ok('C15 unticked: hidden again, Discontinued filter cleared', DT.tstud.rows.every(l => l.status !== 'Discontinued') && !S.ui['dt-tstud'].f.f);
    ACT.tsView({ dataset: { v: 'group' } }); ok('C15 group view follows the toggle', new RegExp('^' + (all.length - disc.length) + ' learners').test(sub())); ACT.tsView({ dataset: { v: 'list' } });
    go('t-students', { id: disc[0].lid }); ok('C15 a discontinued learner\'s record still opens', /Discontinued/.test(main()) && !/can't find that page/.test(main()));
  });

  /* ---------- Held items and unchanged rules ---------- */
  await T('Held items 6, 9, 13 and fixed rules untouched', async () => {
    fresh(); learner('C');
    ok('6 held (item 9 built by CH-07 – CH-11): plan cards, deposit card and Pay now carry no client-sheet changes', !/cs-|csReceipt/.test(planCard.toString()) && !/cs-/.test(depositCard.toString()) && !/cs-/.test(ACT.payInst.toString()));
    go('payments'); ok('6: Overdue now + Pay now still on Payments', /Overdue now/.test(main()) && !!app().querySelector('[data-act="payInst"]'));
    ok('13 built for short courses only (CH-16): NVQ modules have no quizzes', W.resources.every(g => g.items.every(i => !/quiz/i.test(i.title))) && !W.assignments.some(a => /quiz/i.test(a.title)));
    ok('Fixed status colours unchanged', TONE['Discontinued'] === 'red' && TONE['Expiring soon'] === 'amber' && TONE['Valid'] === 'green' && TONE['Revoked'] === 'red' && TONE['Overdue'] === 'red');
    ok('2 placeholder topics (CH-36: T04, T06, T07, T08 resolved; P-31 and P-34 added)', TBD_TOPICS.length === 2);
  });

  /* ---------- Demo Scenario #18 ---------- */
  await T('Scenario #18', async () => {
    fresh(); const L = SC_LIST(), sc = L.find(x => x[0] === '18');
    ok('#18 listed; #19 – #27 follow it (CH-12 – S2-08)', L.length === 27 && !!sc && sc[1] === 'Client sheet items' && L.every((x, i) => x[0] === String(i + 1)));
    ACT.scOpen(); ok('#18 on the page; heading says Twenty-seven (S2-08)', /Twenty-seven end-to-end walkthroughs/.test(main()) && !!app().querySelector('#sc-18'));
    const chk = [['assignment', () => !!app().querySelector('[data-act="csCritPdf"]')], ['certificates', () => !!app().querySelector('.cs-exp')], ['dashboard', () => !!app().querySelector('.hello .cs-status[data-s="attn"]')], ['payments', () => /Purchase history/.test(main())], ['t-students', () => !!app().querySelector('input[data-onchange="csShowDisc"]')]];
    sc[3].forEach((st, k) => { ACT.scOpen(); ACT.scStep({ dataset: { r: st.r, t: st.t } }); ok(`#18.${k + 1} opens ${st.r} → ${st.t} and shows the item`, S.route === chk[k][0] && chk[k][1](), S.route); });
  });

  /* ---------- Screen index and records ---------- */
  await T('Screen index + records', async () => {
    fresh(); learner('C'); go('index');
    const sec = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client suggestion sheet');
    ok('Index: Client suggestion sheet entries, each with a purpose line', !!sec && sec.querySelectorAll('.idx-list > li').length === 10 && [...sec.querySelectorAll('.idx-list > li')].every(li => li.querySelector('.idx-purpose')));
    ok('Index: new pop-ups listed', ['Criteria PDF preview', 'Receipt preview pop-up', 'Document preview pop-up'].every(t => sec && sec.textContent.includes(t)));
    ok('Index: "27 walkthroughs" (S2-08)', /Demo Scenarios — 27 walkthroughs/.test(main()));
    sec.querySelector('[data-m="csReceipt"]').click(); await wait(120); ok('Index: receipt pop-up entry opens it', !!MODAL && /^Receipt/.test(MODAL.title)); closeModal();
    staff('A'); go('t-index'); ok('Assessor index: My Students, PD phone and Calendar entries', ['t-students', 't-pd', 't-calendar'].every(t => [...app().querySelectorAll('.idx-sec')].some(s => s.querySelector('h2').textContent === 'Client suggestion sheet' && s.querySelector(`[data-t="${t}"]`))));
    ACT.scOpen(); go('ux-changelog'); const ux = [...app().querySelectorAll('section.card')].find(s => /Client suggestion sheet/.test(s.querySelector('h2').textContent));
    ok('UX Changelog: one line per item ID', !!ux && ['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C10', 'C11', 'C12', 'C14', 'C15'].every(id => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(id + ':'))));
    go('cd-log'); const t = main();
    ok('Client Decisions Log: built and held row (CH-16: item 13 built)', /Built: 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15\. Held pending client: 6 \(observation fee — P-27\)\./.test(t));
    ok('Client Decisions Log: #18 in the Demo scenarios table; "All 27 run end to end" (S2-08)', /All 27 run end to end in the prototype\./.test(t) && !/All 26 run/.test(t) && CDL_SCEN.some(r => r[0] === '18' && r[1] === 'Client sheet items'));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
