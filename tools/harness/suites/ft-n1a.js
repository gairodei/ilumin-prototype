// 1A — NVQ enrolment corrections (Welfare Academy email, point 1A), client demo (FIXTURE=client). Phase 0: date of birth (date input,
// validation, saved form carried over), no duplicated fields, learner-chosen batch, the sequential steps, the enrolment summary before
// signing and paying, the commencement gate for a new enrolment (before the start, the start date in the batch's zone, undecided
// moment, missing zone / batch / start date, after the start with the existing locks), deep links and direct actions refused,
// onboarding, payments and workplace details open before the start, wording, the verification note, staff view, historical learners
// unchanged, REVISED-1 inactive. Phase 1: a real reload (the saved copy restored) keeps the DOB and the gate.
(async function () {
  const SS = window.sessionStorage, K = 'ft-n1a.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $$1 = s => Array.from(document.querySelectorAll(s));
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; S.edge = 'none'; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const L = () => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && /Lena/.test(w.me.first || ''));
  const byName = re => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && re.test(w.me.first || ''));
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const body = MODAL ? String(MODAL.body) : ''; const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); return body; };
  const pick = code => { const r = $1(`main input[name="su-batch"][value="${code}"]`); if (!r) return false; r.checked = true; INP.suBatch(r); return true; };
  const details = (dob, code = 'DEMO-L3-JAN27') => { go('admission'); const d = $1('#su-dob'), a = $1('#su-ad'); if (d) d.value = dob; if (a && !a.value) a.value = '5 Test Road, London'; pick(code); return ACT.suNext(); };
  const docsSign = () => fxFast(ff => { const w = W; w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); });
  const payCard = choice => fxFast(ff => { setUi('cb9Pay', choice); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); });
  const signUp = (mode = 'Self-Paced', choice = '6') => { as('short'); apply(mode); details('1992-02-02'); docsSign(); go('admission'); payCard(choice); return L(); };
  const at = iso => Clock.freeze(iso);
  const setTz = (b, tz) => { const v = S.variant; acaEnter('KA'); S.signedIn = true; const r = p2SetTz(b, tz, '1A: Academy time zone for this batch').ok; return r; };
  const lk = (r, id, tab) => { const k = S.params; S.params = { id, tab }; try { return lockFor(r); } finally { S.params = k; } };
  const LEARN = [['assignments'], ['assignment'], ['progress'], ['observations'], ['course', 'nvq'], ['quiz', 'nvq']];
  const OPEN = ['dashboard', 'admission', 'payments', 'certificates', 'messages', 'notifications', 'requests', 'profile', 'help', 'calendar', 'attendance', 'resources', 'browse', 'courses'];
  const learnLocked = () => LEARN.every(([r, id]) => { const l = lk(r, id); return !!l && !!l.n1a; });
  const learnOpen = () => LEARN.every(([r, id]) => !lk(r, id));
  const preOpen = () => OPEN.every(r => !lk(r)) && !lk('observations', undefined, 'workplace');
  const aud = re => ADMIN.audit.filter(x => re.test(x.action)).length;

  if (PH === 0) {
    await T('N1A-A date of birth', async () => {
      reset(); as('short'); const w = L(); w.me.dob = '14 Mar 1991'; apply('Self-Paced'); go('admission');
      const d = $1('#su-dob');
      ok('N1A-A1 step 1 has a date input (type=date, no later than today anywhere, from 1900, required)', !!d && d.type === 'date' && d.max === ymdIn(now(), 'Pacific/Kiritimati') && d.min === '1900-01-01' && d.required, d && d.outerHTML);
      ok('N1A-A2 a DOB saved before as "14 Mar 1991" is carried into the input, not lost', d.value === '1991-03-14', d.value);
      w.me.dob = 'sometime in spring'; render(); ok('N1A-A3 a saved DOB that isn\'t a date is never guessed: the input is empty and the learner is told', $1('#su-dob').value === '' && /couldn.t read your saved date of birth \(sometime in spring\)/.test(main()));
      w.me.dob = ''; render();
      ok('N1A-A4 the validator: impossible dates (30 Feb, 31 Apr), a malformed value and an empty one are refused', ['2023-02-30', '1990-04-31', '14/03/1991', '1991-3-14', ''].every(v => n1aDobWhy(v)) && n1aDobWhy('2000-02-29') === '' && /real date/.test(n1aDobWhy('2023-02-30')));
      const tomorrow = ymdAdd(ymdIn(now(), 'Pacific/Kiritimati'), 1);
      const r1 = details(tomorrow); ok('N1A-A5 a future date is refused (step 1 stays, the field shows why, nothing saved)', r1 === false && w.signup.step === 1 && !w.signup.details && /can.t be in the future/.test(main()), tomorrow);
      const r2 = details('1899-12-31'); ok('N1A-A6 a date before 1900 is refused (the existing MR-36 date-of-birth rule)', r2 === false && w.signup.step === 1 && /after 1900/.test(main()));
      go('admission'); const e = $1('#su-dob'); e.value = '2023-02-30'; const silently = e.value; const r3 = details(e.value);
      ok('N1A-A7 an invalid calendar date never gets through (the input drops it; the step refuses an empty date)', silently === '' && r3 !== true && w.signup.step === 1 && !w.signup.details);
      details('1992-02-02'); ok('N1A-A8 a valid date is saved as YYYY-MM-DD and the learner moves on', w.signup.step === 2 && w.signup.details.dob === '1992-02-02', J(w.signup.details));
      ACT.suBack(); ok('N1A-A9 back on step 1 the saved date is shown again', $1('#su-dob').value === '1992-02-02');
      ok('N1A-A10 the profile and the learner record show the date (blank fields only, as before)', w.me.dob === '2 Feb 1992' && (ADMIN.learners.find(x => x.id === w.me.id) || {}).dob === '2 Feb 1992', w.me.dob);
      const amira = byName(/Amira/); ok('N1A-A11 an existing learner\'s DOB recorded at sign-up is unchanged', amira.signup.details.dob === '1992-03-14' && amira.me.dob === '14 Mar 1992', amira.me.dob);
    });

    await T('N1A-B fields, batch choice and the steps', async () => {
      reset(); as('short'); const w = L(); apply('Fully Assisted'); go('admission');
      const ids = $$1('main input, main select, main textarea').map(x => x.id).filter(Boolean), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      ok('N1A-B1 step 1: name, email and country read-only from the account; DOB, address, postcode entered once; no phone or other new field', ['su-n', 'su-e', 'su-c', 'su-dob', 'su-ad', 'su-pc'].every(i => ids.includes(i)) && ['su-n', 'su-e', 'su-c'].every(i => $1('#' + i).readOnly) && !dup.length && !ids.some(i => /mob|phone|tel|city|region|nation/i.test(i)), ids.join(','));
      const keepReg = S.reg; S.reg = null; const rf = regForm(); S.reg = keepReg;
      ok('N1A-B2 registration still asks for name, email, mobile and country (unchanged; no DOB or address there, so nothing is asked twice)', ['rg-name', 'rg-email', 'rg-mob', 'rg-country'].every(i => rf.includes(`id="${i}"`)) && !/id="rg-(dob|ad|addr|pc)"/.test(rf));
      ok('N1A-B3 the batch is the learner\'s choice: none is pre-selected', !$$1('main input[name="su-batch"]').some(x => x.checked) && $$1('main input[name="su-batch"]').length >= 1);
      go('admission'); $1('#su-dob').value = '1992-02-02'; $1('#su-ad').value = '5 Test Road'; const r = ACT.suNext();
      ok('N1A-B4 continuing without choosing a batch is refused (P3)', r === false && w.signup.step === 1 && !w.signup.batch);
      ok('N1A-B5 the steps are unchanged and in order: details, documents, offer letter, payment, start', J(chSteps(w).map(x => x[0])) === J(['details', 'documents', 'letter', 'payment', 'start']));
      details('1992-02-02'); ACT.suGo({ dataset: { s: '4' } });
      ok('N1A-B6 a later step can\'t be jumped to (still documents)', w.signup.step === 2 && chStepKey(w) === 'documents');
    });

    await T('N1A-C enrolment summary before signing and paying', async () => {
      reset(); as('short'); const w = L(); apply('Fully Assisted'); details('1992-02-02'); fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); });
      const s = ($1('main .n1a-sum') || {}).textContent || '', P = cb9Pin(w);
      ok('N1A-C1 the offer-letter step shows the programme, batch, start date, delivery mode, fee option and total tuition', chStepKey(w) === 'letter' && s.includes(cdPr().title) && s.includes('DEMO-L3-JAN27') && s.includes(fd(B().start)) && /Delivery mode\s*Fully Assisted/.test(s) && s.includes(P.opt.label) && s.includes(money(P.opt.fee, 'GBP')), s.slice(0, 300));
      ok('N1A-C2 … and the payment options (the deposit and each instalment option with its amounts)', /Deposit £100\.00/.test(s) && P.opt.pay.every(x => s.includes(cb9PayLbl(x.k))));
      ok('N1A-C3 the summary sits above the letter (before the signature)', main().indexOf('Your enrolment') < main().indexOf('Digital signature'));
      setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); setUi('cb9Pay', '6'); render();
      const m = main();
      ok('N1A-C4 the payment step shows the batch and start, fee option with mode, programme fee and the chosen schedule (unchanged)', chStepKey(w) === 'payment' && m.includes('DEMO-L3-JAN27') && m.includes(P.opt.label + ' · Fully Assisted') && m.includes(money(P.opt.fee, 'GBP')) && !!$1('main .cb9-sched table') && $$1('main .cb9-sched tbody tr').length === 6);
      ok('N1A-C5 no learner text says paying starts learning', !/as soon as you.ve paid|start now|start learning straight away|while you learn/i.test(m) && m.includes('your learning access will begin on or after your selected batch\'s official start'), (m.match(/.{60}(as soon as you.ve paid|start now|start learning straight away|while you learn).{60}/i) || [''])[0]);
      setUi('suMethod', 'bank'); render(); const mb = main();
      ok('N1A-C6 bank transfer: no "you start now" / "start learning straight away"', /Bank transfer — Finance confirms your payment/.test(mb) && !/start now|straight away/i.test(mb) && /I.ve made the transfer/.test(mb), (mb.match(/.{80}(start now|straight away|Bank transfer).{80}/i) || [''])[0]);
    });

    await T('N1A-D before the batch starts', async () => {
      reset(); const w = signUp(); const b = B();
      ok('N1A-D1 a new sign-up records the rule when it starts (frozen); the payment completed the sign-up', !!w.signup.startRule && Object.isFrozen(w.signup.startRule) && w.signup.startRule.id === 'NVQ-START-1' && w.signup.done && w.signup.pay && w.signup.pay.status === 'Paid', J(w.signup.startRule));
      ok('N1A-D2 the batch hasn\'t started (3 Dec 2026, no Academy zone yet): learning is refused although payment 1 is paid', Date.parse(b.start) > now().getTime() && learnLocked() && n1aDecide(w).code === 'N1A-NOT-STARTED', n1aDecide(w).code);
      ok('N1A-D3 onboarding, documents, payments, batch details, calendar, messages, help, requests, profile and workplace details stay open', preOpen());
      ok('N1A-D4 no "Start learning" for the programme (the next activity is withheld)', cfNvqNext() === null);
      const a = w.assignments[0]; go('assignment', { id: a.id }); const t1 = main(); go('course', { id: 'nvq' }); const t2 = main(); go('progress'); const t3 = main();
      ok('N1A-D5 deep links (an assignment, the programme, Progress) show the pre-start page with the batch and start', [t1, t2, t3].every(t => /Your batch hasn.t started yet/.test(t) && t.includes('DEMO-L3-JAN27') && t.includes(N1A_MSG)) && !!$1('main .n1a-pre'), [t1, t2, t3].map(t => t.slice(0, 160)).join(' || '));
      const n0 = aud(/Blocked: .*\((batch not started|access locked)\)/);
      fxFast(ff => { go('assignments'); ACT.pdfDl && ACT.pdfDl({ dataset: { id: a.id, f: a.title + '.pdf' } }); ff(100); });
      ok('N1A-D6 the assignment PDF can\'t be downloaded (refused and logged)', aud(/Blocked: download an assignment \(batch not started\)/) === 1, String(aud(/Blocked: download an assignment/)));
      const sub0 = a.status; S.params = { id: a.id }; const r = typeof finaliseSubmit === 'function' ? finaliseSubmit(a) : false; S.params = {};
      ok('N1A-D7 an assignment can\'t be submitted (SEC-01 refuses, nothing changed)', r === false && a.status === sub0 && aud(/Blocked: .*\(access locked\)/) > 0, a.status);
      const ev = (w.events || []).find(e => n1aNvqEv(e));
      if (ev) { go('calendar'); const before = aud(/join a class on Zoom/); ACT.joinZoom({ dataset: { id: ev.id } }); ok('N1A-D8 an NVQ class can\'t be joined on Zoom (calendar shows it, the link is withheld)', aud(/join a class on Zoom/) === before + 1 && /Opens when your learning access opens/.test(joinBtn(ev))); }
      else ok('N1A-D8 Zoom: the join button and action are guarded (no NVQ class event in this record)', /Opens when your learning access opens/.test(joinBtn({ course: w.nvq.title, link: 'https://zoom.example/x', id: 'x' })));
      const g = (w.resources || []).find(x => n1aNvqGroup(x) && (x.items || []).length);
      if (g) { const before = aud(/open a learning resource/); ACT.openRes({ dataset: { id: g.items[0].id } }); go('resources'); ok('N1A-D9 the programme\'s resources are withheld and can\'t be opened directly', aud(/open a learning resource/) === before + 1 && !!$1('main .n1a-res')); }
      else { go('resources'); ok('N1A-D9 the Learning Resources page says the programme\'s resources open at the start', !!$1('main .n1a-res')); }
      go('observations', { tab: 'workplace' }); $1('#wp-name').value = 'Example Care Home'; $1('#wp-ce').value = 'manager@carehome.example'; SUBMIT.wpSave($1('form[data-submit="wpSave"]'));
      ok('N1A-D10 Action needed → workplace details: saved before the start (permission request sent)', w.workplace.perm === 'Permission Pending' && w.workplace.name === 'Example Care Home', w.workplace.perm);
      go('observations'); ok('N1A-D11 the Observations list waits for the start; its page links to Workplace details', !!$1('main .n1a-pre') && !!$1('main .n1a-pre [data-tab="workplace"]'));
      go('dashboard'); const dash = main();
      ok('N1A-D12 dashboard: "Your programme" card with batch, official start and the access message; Action needed items go to Workplace details', !!$1('main .n1a-card') && dash.includes(N1A_MSG) && actionItems().filter(x => x.go === 'observations').every(x => x.tab === 'workplace'));
      const n = (w.notifs || []).find(x => /Sign-up complete/.test(x.title));
      ok('N1A-D13 the sign-up notification no longer says "start learning" / "your programme is open"', !!n && n.title === 'Sign-up complete' && n.body.includes(N1A_MSG) && !/programme is open/.test(n.body), n && n.title);
      go('admission'); const adm = main();
      ok('N1A-D14 Admission & Documents: "Learning access: Not open yet" with the message; no "Keep learning while we review"', /Learning access\s*Not open yet\./.test(adm) && !/Keep learning while we review|You.ve started/.test(adm));
      as('aca'); go('a-learners', { id: w.me.id, tab: 'admission' }); const staff = (typeof lAdm === 'function' ? lAdm(ADMIN.learners.find(x => x.id === w.me.id), w) : '');
      ok('N1A-D15 staff see the decision read-only on the learner record', /n1a-adm/.test(staff) && /N1A-NOT-STARTED/.test(staff));
      SS.setItem(K + 'lena', w.me.id);
    });

    await T('N1A-E the start date in the batch\'s time zone', async () => {
      reset(); const b = B(); ok('N1A-E0 the demo batch starts 3 Dec 2026 09:00 UTC', b.start === '2026-12-03T09:00:00.000Z', b.start);
      const w = signUp(); setTz(b, 'Europe/London'); as('short');
      at('2026-12-02T23:59:59.000Z'); ok('N1A-E1 London: 2 Dec 23:59:59 GMT — not started', n1aDecide(w).code === 'N1A-NOT-STARTED' && learnLocked());
      at('2026-12-03T00:00:00.000Z'); ok('N1A-E2 London: 3 Dec 00:00 — the start date, before the stored start time: U-05 open, fails closed', n1aDecide(w).code === 'N1A-START-UNDECIDED' && learnLocked() && /Your batch starts today/.test((lk('assignments') || {}).title || ''));
      at('2026-12-03T08:59:59.000Z'); ok('N1A-E3 London: 08:59:59 — still undecided (closed)', n1aDecide(w).code === 'N1A-START-UNDECIDED');
      at('2026-12-03T09:00:00.000Z'); ok('N1A-E4 London: at the stored start time — started under either meaning of U-05: learning opens', n1aDecide(w).allowed && learnOpen() && preOpen());
      as('short'); go('admission'); ok('N1A-E5 after the start the admission card says learning is open', /Learning access\s*Open — your batch has started/.test(main()));
      S.edge = 'paused'; ok('N1A-E6 after the start the existing locks still apply (an overdue pause locks learning)', ['assignments', 'progress'].every(r => (lk(r) || {}).title === 'Access paused')); S.edge = 'none';
      Clock.unfreeze(); setTz(b, 'Asia/Dubai'); as('short');
      at('2026-12-02T19:59:59.000Z'); ok('N1A-E7 Dubai: 2 Dec 19:59:59 UTC (23:59:59 local) — not started', n1aDecide(w).code === 'N1A-NOT-STARTED');
      at('2026-12-02T20:00:00.000Z'); ok('N1A-E8 Dubai: 2 Dec 20:00 UTC is 3 Dec 00:00 local — the start date (undecided moment, closed)', n1aDecide(w).code === 'N1A-START-UNDECIDED');
      const tz0 = w.me.tz; w.me.tz = 'Pacific/Auckland'; at('2026-12-02T12:00:00.000Z'); const c = n1aDecide(w).code; w.me.tz = tz0;
      ok('N1A-E9 the learner\'s own time zone plays no part (3 Dec in Auckland, 2 Dec in Dubai)', c === 'N1A-NOT-STARTED');
      Clock.unfreeze();
    });

    await T('N1A-F missing or invalid commencement facts fail closed', async () => {
      reset(); const w = signUp(), b = B();
      ok('N1A-F1 no Academy time zone, start more than 25 hours away: not started', !tzOk(b.tz) && n1aDecide(w).code === 'N1A-NOT-STARTED');
      at('2026-12-02T09:00:00.000Z'); ok('N1A-F2 no Academy time zone, within 25 hours of the stored start: can\'t be placed — closed', n1aDecide(w).code === 'N1A-NO-TZ' && learnLocked());
      at('2027-01-15T10:00:00.000Z'); const d = n1aDecide(w);
      ok('N1A-F3 no Academy time zone, well after the start: still closed (never the Europe/London fallback)', d.code === 'N1A-NO-TZ' && !d.allowed && /hasn't set the time zone/.test(d.why));
      Clock.unfreeze();
      ok('N1A-F4 a batch without a start date, or an unreadable one: closed', n1aCommence({ code: 'X', tz: 'Europe/London' }).code === 'N1A-NO-START' && n1aCommence({ code: 'X', tz: 'Europe/London', start: 'soon' }).code === 'N1A-NO-START');
      const keep = w.signup.batch; w.signup.batch = 'NO-SUCH-BATCH'; const d2 = n1aDecide(w); w.signup.batch = keep;
      ok('N1A-F5 no batch on the enrolment: closed', d2.code === 'N1A-NO-BATCH' && !d2.allowed);
      const z = n1aCommence({ code: 'X', start: '2026-12-03T09:00:00Z', tz: 'UTC+1' }); ok('N1A-F6 a fixed offset isn\'t a valid zone: treated as missing', z.code !== 'N1A-OK');
    });

    await T('N1A-G historical learners and REVISED-1', async () => {
      reset(); const pp = [['nvq-sp', /Amira/], ['nvq-fa', /Dev/], ['nvq-dep', /Sam/]], diff = [];
      pp.forEach(([p]) => { as(p); LEARN.concat(OPEN.map(r => [r])).forEach(([r, id]) => { const k = S.params; S.params = id ? { id } : {}; if (J(lockFor(r)) !== J(n1aBase(r))) diff.push(p + '/' + r); S.params = k; }); });
      ok('N1A-G1 the demo learners (enrolled before this change) carry no rule and get exactly the locks they had, on every page', diff.length === 0 && pp.every(([, re]) => !byName(re).signup.startRule && !n1aApplies(byName(re))), diff.join(', '));
      as('nvq-sp'); ok('N1A-G2 before their batch starts they keep learning, as they enrolled (CH-10 / CH-11)', Date.parse(B().start) > now().getTime() && learnOpen());
      const tom = Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(x => x && x.me && /^Tom/.test(x.me.first || '') && x.signup && x.signup.pay); ok('N1A-G3 a historical learner with a bank transfer awaiting confirmation keeps legacy access', !!tom && !n1aApplies(tom) && /Awaiting/.test(tom.signup.pay.status));
      as('short'); apply('Self-Paced'); const w = L(); delete w.signup.startRule; details('1992-02-02'); docsSign(); go('admission'); payCard('6');
      ok('N1A-G4 a sign-up started before this change (no rule recorded) keeps the access it was offered', w.signup.done && !n1aApplies(w) && learnOpen());
      ok('N1A-G5 REVISED-1 can\'t be activated; every terms link is LEGACY-1', p2Activate('REVISED-1', '1A') === false && p2Active() === 'LEGACY-1' && p2TermsAll().every(t => t.policy === 'LEGACY-1'));
      ok('N1A-G6 the LEGACY-1 terms definition is unchanged (frozen)', Object.isFrozen(P2_POLICIES['LEGACY-1'].rules) && /At sign-up completion/.test(P2_POLICIES['LEGACY-1'].rules.access));
    });

    await T('N1A-H offer letter and verification wording', async () => {
      reset(); const w = signUp(); const L1 = chLetterHtml(chLetterFor(w), { name: chFullName(w), sid: w.me.id });
      ok('N1A-H1 a new learner\'s offer letter (and its signed copy) doesn\'t promise learning straight away', !/start learning straight away/.test(L1) && L1.includes('on or after your selected batch'));
      const amira = byName(/Amira/), L2 = chLetterHtml(chLetterFor(amira), { name: chFullName(amira), sid: amira.me.id });
      ok('N1A-H2 a historical learner\'s signed letter text is unchanged', /You can start learning straight away/.test(L2));
      S.reg = { name: 'Test Person', email: 'test@example.com', dial: '+44', mob: '7700900000' }; S.regV = { via: 'email', expires: Date.now() + 600000, resendAt: 0, tries: 0 };
      const v = regVerifyView(); ok('N1A-H3 the verification screen says the code is simulated and proves nothing', /simulated verification/.test(v) && /doesn.t prove/.test(v)); S.reg = null; S.regV = null;
      reset(); as('short'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const m = MODAL ? String(MODAL.body) : ''; closeModal();
      ok('N1A-H4 the sign-up dialog no longer says "then you start"', /Signing up takes five steps/.test(m) && !/then you start/.test(m) && m.includes('on or after your selected batch'));
    });

    await T('N1A-I a real reload', async () => {
      reset(); as('short'); apply('Self-Paced'); details('1988-07-09'); SS.setItem(K + 'lena', L().me.id);
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('N1A-I a real reload (the saved copy restored)', async () => {
      const w = L(); as('short');
      ok('N1A-I1 after a reload the DOB is kept and shown in the date input', !!w && w.signup && w.signup.details && w.signup.details.dob === '1988-07-09' && (go('admission'), ACT.suBack(), $1('#su-dob') && $1('#su-dob').value === '1988-07-09'), w && J(w.signup && w.signup.details) + ' step ' + (w && w.signup.step) + ' input ' + (($1('#su-dob') || {}).value));
      ok('N1A-I2 … and the sign-up still carries the commencement rule', !!w.signup.startRule && w.signup.startRule.id === 'NVQ-START-1');
      reset(); ok('N1A-I3 Reset demo: no learner carries the rule', Object.keys(STORE.worlds).every(k => !(STORE.worlds[k] && STORE.worlds[k].signup && STORE.worlds[k].signup.startRule)));
    });
  }

  Clock.unfreeze();
  ['phase', 'R', 'lena'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
