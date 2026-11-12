// P5 — learner course-access gate behind the inactive REVISED-1 terms, client demo (FIXTURE=client). The revised terms are linked only
// through the isolated test harness (window.ILM_P4_HARNESS); a test commencement instant is set only by the harness (labelled test data,
// not Academy policy — U-05 is open). Phase 0: legacy learners unchanged; route A, route B, direct full and direct instalments; bank
// transfers pending and verified; a late receipt (Finance exception); forfeiture; "not received" then the deadline (P4 check A); before
// and after an explicit commencement instant; deep links, direct actions, resources, downloads, Zoom links; admission, payments and the
// signed letter before commencement; pauses and archive still lock; staff views; ambiguous records fail closed; no record is changed
// by evaluating access. Phase 1: a real reload (the saved copy restored) keeps the decision; Reset clears the revised records.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p5c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); window.ILM_P4_HARNESS = true; };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const mk = (code, start, o = {}) => { const s = B(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start, end: new Date(Date.parse(start) + 380 * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [] }, o); delete c.tz; delete c.tzHist; ADMIN.batches.push(c); return c; };
  const setTz = (b, tz) => { as('aca'); return p2SetTz(b, tz, 'P5C: Academy time zone for this batch').ok; };
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); };
  const L = () => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && /Lena/.test(w.me.first || ''));
  const byName = re => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && re.test(w.me.first || ''));
  const fill = () => { go('admission'); const d = $1('#su-dob'), a = $1('#su-ad'); if (d && !d.value) d.value = '1992-02-02'; if (a && !a.value) a.value = '5 Test Road, London'; };
  const pick = code => { const r = $1(`main input[name="su-batch"][value="${code}"]`); if (!r) return false; r.checked = true; INP.suBatch(r); return true; };
  const docsSign = ff => { const w = W; w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); };
  const at = iso => Clock.freeze(iso);
  const toPay = (code, mode = 'Self-Paced') => { as('short'); apply(mode); const w = L(); const linked = p4HarnessRevise(w, 'P5C fixture'); fill(); pick(code); ACT.suNext(); fxFast(ff => docsSign(ff)); go('admission'); return { w, linked }; };
  const payCard = choice => fxFast(ff => { setUi('cb9Pay', choice); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); });
  const payBank = choice => { setUi('cb9Pay', choice); setUi('suMethod', 'bank'); go('admission'); ACT.suPay(); if (MODAL) prim(); closeModal(); };
  const payRow = n => fxFast(ff => { as('short'); go('payments'); ACT.payInst({ dataset: { e: 'nvq', n: String(n) } }); if (MODAL) prim(); ff(3000); closeModal(); });
  const bankRow = n => { as('short'); go('payments'); ACT.chPayBank({ dataset: { e: 'nvq', n: String(n) } }); if (MODAL) prim(); closeModal(); };
  const verify = (ref, yes, ymd, hm, why) => { as('fin'); return p4Verify(ref, { received: yes, ymd, hm, why }); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const audRe = re => ADMIN.audit.filter(x => re.test(x.action)).length;
  const code = w => p5Decide(w).code;
  const lk = (r, id) => { const k = S.params; S.params = id ? { id } : {}; try { return lockFor(r); } finally { S.params = k; } };
  const LEARN = [['assignments'], ['assignment'], ['progress'], ['observations'], ['course', 'nvq'], ['quiz', 'nvq']];
  const OPEN = ['dashboard', 'admission', 'payments', 'certificates', 'messages', 'notifications', 'requests', 'profile', 'help', 'calendar', 'attendance', 'resources', 'browse', 'courses'];
  const learnLocked = () => LEARN.every(([r, id]) => { const l = lk(r, id); return !!l && !!l.p5; });
  const learnOpen = () => LEARN.every(([r, id]) => !lk(r, id));
  const preOpen = () => OPEN.every(r => !lk(r));
  const LON = '2027-01-30T09:00:00Z';
  const commence = (c, iso) => p5HarnessCommence(B(c), iso, 'P5C: explicit test commencement instant');
  const snap = w => J([w.signup, w.plans, w.nvq, w.enrolments.map(e => e.id || e.title), w.tx, STORE.seats, TERMS().p4, STORE.chBank, (STORE.fin || {}).tx]);

  if (PH === 0) {
    await T('P5C-A legacy learners unchanged', async () => {
      reset(); at('2026-11-20T10:00:00Z');
      const pp = [['nvq-sp', /Amira/], ['nvq-fa', /Dev/], ['nvq-dep', /Sam/]], diff = [];
      pp.forEach(([p]) => { as(p); LEARN.concat(OPEN.map(r => [r])).forEach(([r, id]) => { const k = S.params; S.params = id ? { id } : {}; if (J(lockFor(r)) !== J(p5Base(r))) diff.push(p + '/' + r); S.params = k; }); });
      ok('P5C-A1 the demo learners (all LEGACY-1) get exactly the locks of the chain before P5 on every page', diff.length === 0 && pp.every(([, re]) => !p5Applies(byName(re)) && code(byName(re)) === 'P5-LEGACY'), diff.join(', '));
      as('nvq-sp'); ok('P5C-A2 before their batch starts (3 Dec 2026), legacy learners keep learning as they signed for', Date.parse(B().start) > now().getTime() && learnOpen());
      const tom = Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(x => x && x.me && /^Tom/.test(x.me.first || '') && x.signup); ok('P5C-A3 a legacy learner with a deposit awaiting bank confirmation keeps the legacy access (CH-11)', !!tom && /Awaiting/.test(tom.signup.pay.status) && !p5Applies(tom));
      ok('P5C-A4 REVISED-1 still can\'t be activated; no learner is on it', p2Activate('REVISED-1', 'P5C') === false && p2Active() === 'LEGACY-1' && p2TermsAll().every(t => t.policy === 'LEGACY-1'));
    });

    await T('P5C-B route A by card: deposit, full balance, before and after commencement', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P5-LON', LON); setTz(b, 'Europe/London');
      const { w } = toPay('P5-LON'); as('short'); const l0 = lk('assignments');
      ok('P5C-B1 before paying: the sign-up lock, reworded — learning opens only with a verified payment and a commenced batch', !!w.signup.termsRef && p4Rev(w) && !!l0 && l0.title === 'Finish your sign-up' && /batch has commenced/.test(l0.msg) && code(w) === 'P5-NOT-ENROLLED');
      payCard('deposit'); as('short');
      ok('P5C-B2 deposit only (route A): blocked, the remaining tuition to pay, next action Payments', code(w) === 'P5-UNPAID' && p5Decide(w).pay.route === 'A' && learnLocked() && p5Decide(w).next[0] === 'payments' && !/your programme is open/i.test((w.notifs[0] || {}).body || ''));
      ok('P5C-B3 pre-access pages stay open: dashboard, admission, payments, certificates, messages, requests, profile, calendar, attendance', preOpen());
      go('dashboard'); const c = ($1('main .p5-card') || {}).textContent || '';
      ok('P5C-B4 the dashboard shows programme, batch, start date with its time zone, payment status and when learning opens — no countdown', /P5-LON/.test(c) && /30 Jan 2027/.test(c) && /Europe\/London/.test(c) && /still to pay/.test(c) && /U-05/.test(c) && !/\d+ days? (left|to go)/i.test(c), c.slice(0, 400));
      const k = Object.keys(STORE.worlds).find(x => STORE.worlds[x] === w); go('admission'); ACT.chSignedPdf({ dataset: { v: k } });
      ok('P5C-B5 the signed offer letter opens before commencement', !!MODAL); closeModal();
      payRow(1); as('short');
      ok('P5C-B6 the full balance paid (route A cleared) before the start date: blocked as not started; the deposit alone never opened it', p5Decide(w).pay.state === 'cleared' && code(w) === 'P5-NOT-STARTED' && learnLocked());
      go('assignments'); const t = main();
      ok('P5C-B7 the pre-start page explains it: programme, batch, payment received, learning after commencement, admission and payments links', /Your batch hasn't started yet/.test(t) && /P5-LON/.test(t) && /received and verified/.test(t) && /commences/.test(t) && !!$1('main .p5-pre [data-go="admission"]') && !!$1('main .p5-pre [data-go="payments"]'));
      at('2027-01-30T00:00:00Z'); as('short');
      ok('P5C-B8 on the start date with no decided commencement rule (U-05): indeterminate — still blocked, said so', code(w) === 'P5-COMMENCE-UNKNOWN' && learnLocked() && /U-05/.test(p5Decide(w).reason));
      commence('P5-LON', '2027-01-30T09:00:00Z'); at('2027-01-30T08:59:59.999Z'); as('short');
      ok('P5C-B9 a test commencement instant of 09:00 GMT: one millisecond before, not started', code(w) === 'P5-NOT-STARTED' && learnLocked());
      at('2027-01-30T09:00:00Z'); as('short');
      ok('P5C-B10 at the instant: open — every learning page', code(w) === 'P5-OK' && p5Decide(w).allowed && learnOpen());
      ok('P5C-B11 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P5C-C deep links and direct actions can\'t get past the gate', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P5-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P5-LON'); payCard('deposit'); as('short');
      const a = (w.assignments || [])[0], aid = a ? a.id : 'A-1';
      setRoute('assignment.' + aid); render(); const t1 = main();
      ok('P5C-C1 a deep link to an assignment draws the gate page, not the assignment', !!$1('main .p5-pre') && !(a && t1.includes(a.title) && $1('main .rte-body')));
      setRoute('course.nvq'); render(); ok('P5C-C2 a deep link to the programme content: the gate page', !!$1('main .p5-pre'));
      const n0 = audRe(/access locked/), s0 = snap(w);
      ACT.reviewSubmit({ dataset: { id: aid } }); finaliseSubmit && finaliseSubmit(aid); ACT.cfSaveDraft({ dataset: { id: aid } }); ACT.obsAccept({ dataset: { id: 'x' } }); ACT.pdConfirm();
      ok('P5C-C3 submitting, finalising, saving a draft, observation and PD booking called directly: each refused before it changes anything (SEC-01 + P5)', audRe(/access locked/) === n0 + 5 && snap(w) === s0 && !MODAL, String(audRe(/access locked/) - n0));
      const g = (w.resources || []).find(x => p5NvqGroup(x)), item = g && g.items[0];
      go('resources'); const t2 = main();
      ok('P5C-C4 Learning Resources: the programme\'s resources are replaced by a note; nothing of them is listed', !!g && !!$1('main .p5-res') && !t2.includes(item.title), g ? J([!!$1('main .p5-res'), t2.slice(Math.max(0, t2.indexOf(item.title) - 400), t2.indexOf(item.title) + 80), item.title, (w.resources || []).filter(x => !p5NvqGroup(x)).map(x => x.course)]) : 'no programme resource group ' + J((w.resources || []).map(x => [x.course, x.courseId, (x.items || []).length])) + ' nvq=' + w.nvq.title);
      const n1 = audRe(/learning access not open/); ACT.openRes({ dataset: { id: item && item.id } }); ACT.resPlay({ dataset: { id: item && item.id } }); ACT.resScorm({ dataset: { id: item && item.id } }); ACT.fakeDl({ dataset: { f: item && item.title } }); ACT.pdfDl({ dataset: { id: aid } }); ACT.briefChanges({ dataset: { id: aid } });
      ok('P5C-C5 opening, playing, completing or downloading a programme resource, the assignment PDF and brief: refused and logged; item state unchanged', !MODAL && audRe(/learning access not open/) === n1 + 6 && (!item || item.state !== 'Completed'));
      const ev = (w.events || []).find(e => e.type === 'class' && e.link && p5NvqEv(e)), ev0 = ev && ev.link;
      ok('P5C-C6 class Zoom links: the button shows no link, the direct call is refused, the calendar pop-up leaves the link out', !!ev && !joinBtn(ev).includes('data-act="joinZoom"') && ACT.joinZoom({ dataset: { id: ev.id } }) === false && !MODAL && (() => { go('calendar'); const btn = document.createElement('button'); btn.dataset.id = ev.id; document.body.appendChild(btn); ACT.evPop(btn); const pop = $1('.pop'); const out = !!pop && !pop.textContent.includes(ev0); $$('.pop').forEach(p => p.remove()); btn.remove(); return out; })() && ev.link === ev0, ev ? '' : 'no class event');
      ok('P5C-C7 the calendar still shows the class times', (() => { go('calendar'); setUi('calView', 'agenda'); setUi('calDate', ev.start.slice(0, 10)); render(); return main().includes(ev.title); })());
      ACT.joinPd(); ok('P5C-C8 joining a Professional Discussion is refused too', audRe(/join a Professional Discussion/) === 1);
      payRow(1); commence('P5-LON', '2026-12-01T00:00:00Z'); as('short');
      ACT.openRes({ dataset: { id: item.id } }); const opened = !!MODAL; closeModal(); ACT.joinZoom({ dataset: { id: ev.id } }); const zoom = !!MODAL && MODAL.body && MODAL.body.includes(ev.link); closeModal();
      ok('P5C-C9 once open (payment verified, test instant passed): the resource and the Zoom link open, the assignment page draws', code(w) === 'P5-OK' && opened && zoom && joinBtn(ev).includes('Join on Zoom') && (go('assignments'), !$1('main .p5-pre')), J([code(w), opened, zoom]));
      const s1 = snap(w); for (let i = 0; i < 25; i++) { p5Decide(w); LEARN.forEach(([r, id]) => lk(r, id)); }
      ok('P5C-C10 evaluating access 25 times changes no enrolment, payment, seat, terms or Finance record', snap(w) === s1);
      STORE.chPause = STORE.chPause || {}; STORE.chPause[chPKey(w.me.id, 'nvq')] = { by: 'P5C', role: 'Finance', at: now().toISOString(), reason: 'P5C fixture' };
      ok('P5C-C11 an existing pause still locks a cleared, commenced learner (the gate never bypasses a lock)', (lk('assignments') || {}).title === 'Access paused' && !(lk('assignments') || {}).p5);
      delete STORE.chPause[chPKey(w.me.id, 'nvq')]; S.edge = 'archived';
      ok('P5C-C12 an archived account still locks it', (lk('assignments') || {}).title === 'Your account is archived'); S.edge = 'none';
      ok('P5C-C13 a withdrawn or discontinued enrolment: not enrolled (decision on a copy; nothing changed)', ['Withdrawn', 'Discontinued'].every(st => (x => code({ ...w, nvq: x, enrolments: [x] }))({ ...w.nvq, status: st }) === 'P5-NOT-ENROLLED'));
      as('aca'); go('a-learner', { id: w.me.id, tab: 'admission' }); const t3 = main();
      ok('P5C-C14 the Academic Administrator still opens the learner record, with the decision shown read-only', !$1('main .p5-pre') && !!$1('main .p5-adm') && /P5-OK/.test(t3), t3.slice(0, 300));
      as('coord1'); go('c-learner', { id: w.me.id }); ok('P5C-C15 the Academic Coordinator\'s learner view is unchanged (no learner gate on staff)', !$1('main .p5-pre') && !$1('main .lockpage'));
    });

    await T('P5C-D route B, later instalments, forfeiture', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P5-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P5-LON'); payCard('dep6'); as('short');
      const d1 = p5Decide(w);
      ok('P5C-D1 route B, deposit credited to payment 1: blocked until the rest of payment 1 is paid', d1.code === 'P5-UNPAID' && d1.pay.route === 'B' && fpP(d1.pay.due) === fpP(fpPl(w).rows[0].amount) - fpP(fpPl(w).deposit.amount) && learnLocked(), J(d1.pay));
      payRow(1); commence('P5-LON', '2026-12-01T00:00:00Z'); as('short');
      ok('P5C-D2 payment 1 complete: cleared without paying the whole fee; payments 2–6 still to come', p5Decide(w).pay.state === 'cleared' && fpPl(w).rows.slice(1).every(r => r.status !== 'Paid') && code(w) === 'P5-OK' && learnOpen());
      const r2 = fpPl(w).rows[1], st0 = r2.status; r2.status = 'Overdue'; W.accessPaused = true;
      ok('P5C-D3 a later instalment overdue: the existing overdue pause decides (Access paused); the gate\'s clearance is unchanged', (lk('assignments') || {}).title === 'Access paused' && p5Decide(w).pay.state === 'cleared');
      r2.status = st0; W.accessPaused = false;
      reset(); at('2026-12-20T10:00:00Z'); const b2 = mk('P5-LON', LON); setTz(b2, 'Europe/London'); const o = toPay('P5-LON'); payCard('dep6'); commence('P5-LON', '2027-01-01T00:00:00Z');
      at('2027-01-03T00:00:00Z'); render(); as('short');
      ok('P5C-D4 the deadline passes unpaid: deposit forfeited, seat released — blocked (the legacy "released seat is read-only" lift doesn\'t open it)', code(o.w) === 'P5-FORFEITED' && !seatActive('P5-LON', o.w.me.id) && learnLocked() && /FF-/.test(p5Decide(o.w).refs.forfeiture || ''), code(o.w));
    });

    await T('P5C-E bank transfers, a late receipt, "not received"', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P5-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P5-LON'); payBank('deposit'); commence('P5-LON', '2027-01-01T00:00:00Z'); as('short');
      ok('P5C-E1 a deposit by bank transfer awaiting verification: blocked as pending (the claim isn\'t evidence)', code(w) === 'P5-PENDING' && learnLocked());
      at('2026-12-28T10:00:00Z'); verify(w.signup.pay.ref, true, '2026-12-21', '11:30'); as('short');
      ok('P5C-E2 the deposit verified on time: now the remaining tuition is due', code(w) === 'P5-UNPAID');
      at('2027-01-02T20:00:00Z'); bankRow(1); as('short'); ok('P5C-E3 the balance by bank transfer, unverified: pending', code(w) === 'P5-PENDING');
      at('2027-01-05T10:00:00Z'); as('short'); ok('P5C-E4 pending reconciliation after the deadline: the seat kept, learning still blocked', dpSeat(w).st === 'pending' && code(w) === 'P5-PENDING');
      const c1 = p4Claims(w).find(c => c.kind === 'first'); verify(c1.ref, true, '2027-01-02', '23:00'); as('short');
      ok('P5C-E5 verified as received on time: cleared and (test instant passed) open', code(w) === 'P5-OK' && learnOpen());
      reset(); at('2026-12-20T10:00:00Z'); const b2 = mk('P5-LON', LON); setTz(b2, 'Europe/London'); const q = toPay('P5-LON'); payBank('deposit');
      at('2027-01-02T10:00:00Z'); const v = verify(q.w.signup.pay.ref, true, '2027-01-02', '09:00'); as('short');
      ok('P5C-E6 a deposit received after the last deposit day: a Finance exception — blocked, not cleared automatically', v.state === 'verified-late' && code(q.w) === 'P5-EXCEPTION' && /Finance review/.test(p5Decide(q.w).reason) && learnLocked());
      reset(); at('2026-12-20T10:00:00Z'); const b3 = mk('P5-LON', LON); setTz(b3, 'Europe/London'); const r = toPay('P5-LON'); payCard('deposit');
      at('2027-01-01T10:00:00Z'); bankRow(1); const c2 = p4Claims(r.w).find(c => c.kind === 'first'); at('2027-01-01T12:00:00Z'); const v2 = verify(c2.ref, false, '', '', 'No credit on the statement'); render();
      ok('P5C-E7 P4 check A: a transfer recorded as not received before the deadline — nothing forfeited yet, the seat still reserved', v2.state === 'not-received' && !Object.keys(P4().forf).length && seatActive('P5-LON', r.w.me.id) && dpSeat(r.w).st === 'reserved');
      at('2027-01-03T00:00:00Z'); render(); const f = Object.values(P4().forf)[0], dep = fpPl(r.w).deposit;
      ok('P5C-E8 P4 check A: at the deadline the card deposit already paid is forfeited under the revised terms, once; access blocked', !!f && f.deposit === dep.amount && /^Forfeited/.test(f.disposition) && Object.keys(P4().forf).length === 1 && code(r.w) === 'P5-FORFEITED', J([f, code(r.w)]));
    });

    await T('P5C-F direct payment without a deposit', async () => {
      // The client demo's fee options offer 6 payments only (no "Pay in full"), so the pay-in-full rule is checked on copies of a real
      // revised record paid by card after the deposit cutoff
      reset(); at('2027-01-20T10:00:00Z'); const b = mk('P5-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P5-LON'); payCard(6); as('short');
      const pl = fpPl(w), full = { ...w, signup: { ...w.signup, payIn: 'full' }, plans: [{ ...pl, rows: [{ ...pl.rows[0], amount: 1800, paid: 1800, status: 'Paid' }] }] }, part = { ...w, signup: { ...w.signup, payIn: 'full' } };
      ok('P5C-F1 pay in full (no deposit, after the cutoff — no cutoff applies): cleared only when the full fee is paid; payment 1 alone isn\'t enough', !cb9Pin(w).opt.pay.some(x => x.k === 1) && p5Decide(full).pay.route === 'FULL' && p5Decide(full).pay.state === 'cleared' && p5Decide(full).code === 'P5-NOT-STARTED' && p5Decide(part).pay.route === 'FULL' && p5Decide(part).pay.state === 'unpaid' && fpP(p5Decide(part).pay.due) === fpP(1500), J([p5Decide(full).pay, p5Decide(part).pay]));
      reset(); at('2027-01-20T10:00:00Z'); const b2 = mk('P5-LON', LON); setTz(b2, 'Europe/London'); const o = toPay('P5-LON'); payCard(6); as('short');
      ok('P5C-F2 instalments by card: payment 1 verified clears it (not the whole fee)', p5Decide(o.w).pay.route === 'INST' && p5Decide(o.w).pay.state === 'cleared' && fpPl(o.w).rows.slice(1).every(r => r.status !== 'Paid'));
      reset(); at('2027-01-20T10:00:00Z'); const b3 = mk('P5-LON', LON); setTz(b3, 'Europe/London'); const q = toPay('P5-LON'); payBank(6); as('short');
      ok('P5C-F3 payment 1 by bank transfer: pending until Finance records it', code(q.w) === 'P5-PENDING');
      as('fin'); const t = payTargets().find(x => x.chb && x.chb.ref === q.w.signup.pay.ref) || payTargets().find(x => x.v && STORE.worlds[x.v] === q.w && !x.dep);
      const res = t ? recordPayment(t, fpPl(q.w).rows[0].amount, q.w.signup.pay.ref, 'Bank transfer', 'P5C: received') : false; as('short');
      ok('P5C-F4 Finance records the transfer: cleared', !!t && res !== false && p5Decide(q.w).pay.state === 'cleared', J([!!t, res, fpPl(q.w).rows[0]]));
    });

    await T('P5C-G ambiguous records fail closed', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P5-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P5-LON'); payCard(1); commence('P5-LON', '2027-01-01T00:00:00Z'); at('2027-01-02T10:00:00Z'); as('short');
      ok('P5C-G0 the baseline copy is open', code(w) === 'P5-OK');
      const s = w.signup, cp = o => ({ ...w, ...o });
      ok('P5C-G1 a terms reference that can\'t be found: blocked (not treated as legacy)', code(cp({ signup: { ...s, termsRef: 'TL-99999' } })) === 'P5-TERMS');
      ok('P5C-G2 revised records with the terms reference missing: blocked', code(cp({ signup: { ...s, termsRef: null } })) === 'P5-TERMS' && p5Applies(cp({ signup: { ...s, termsRef: null } })));
      ok('P5C-G3 the terms record of another learner ID: blocked', code(cp({ me: { ...w.me, id: 'IA-L-00001' } })) === 'P5-IDENTITY');
      ok('P5C-G4 no batch, an unknown batch, or a batch other than the signed one: blocked', code(cp({ signup: { ...s, batch: null } })) === 'P5-NO-BATCH' && code(cp({ signup: { ...s, batch: 'NOPE' } })) === 'P5-NO-BATCH' && code(cp({ signup: { ...s, batch: 'DEMO-L3-JAN27' } })) === 'P5-NO-BATCH');
      ok('P5C-G5 no payment plan or no payment on record: blocked', code(cp({ plans: [] })) === 'P5-PAY-UNKNOWN' && code(cp({ signup: { ...s, pay: null } })) === 'P5-UNPAID');
      ok('P5C-G6 no active seat in the ledger (e.g. a payment without a seat): blocked', (() => { const k = STORE.seats; STORE.seats = JSON.parse(J(k)); SEATS().recs.filter(r => r.lid === w.me.id).forEach(r => { r.state = 'Released'; }); const c = code(w); STORE.seats = k; return c === 'P5-NO-SEAT' && code(w) === 'P5-OK'; })());
      ok('P5C-G7 a row marked Paid whose transfer Finance did not verify as on time: blocked', (() => { const pl = fpPl(w), r = pl.rows[0], k = [r.bankRef, P4().ver]; r.bankRef = 'P5-FAKE'; P4().ver = { ...P4().ver, 'P5-FAKE': { ref: 'P5-FAKE', lid: w.me.id, kind: 'first', state: 'verified-late' } }; const c = code(w); r.bankRef = k[0]; P4().ver = k[1]; if (r.bankRef === undefined) delete r.bankRef; return c !== 'P5-OK'; })());
      ok('P5C-G8 a non-programme enrolment isn\'t gated (short courses follow their own rules)', p5Decide(w, 'bk5').code === 'P5-NOT-PROGRAMME' && p5Decide(w, 'bk5').allowed);
      ok('P5C-G9 the decision is structured: allowed, code, reason, next action, payment and batch references', (d => 'allowed' in d && d.code && d.reason && d.refs.batch === 'P5-LON' && d.refs.termsRef === s.termsRef && Object.isFrozen(d))(p5Decide(w)));
      ok('P5C-G10 P3: the selected batch is unchanged by the gate; P1 invariants', w.signup.batch === 'P5-LON' && seatInvariants().length === 0, J(seatInvariants()));
      SS.setItem(K + 'lena', J([w.me.id, code(w), J(p5Decide(w).pay)]));
    });
    Clock.unfreeze(); next(1); return;
  }

  if (PH === 1) {
    await T('P5C-H reload, Reset', async () => {
      const [lid, c0, pay0] = JSON.parse(SS.getItem(K + 'lena') || '[]'), w = L();
      Clock.freeze('2027-01-02T10:00:00Z'); window.ILM_P4_HARNESS = true;
      ok('P5C-H1 after a real reload (the saved copy restored), the batch\'s test instant is kept and the decision is the same — no stored access flag', !!w && w.me.id === lid && !!(B('P5-LON') || {}).p5Test && code(w) === c0 && J(p5Decide(w).pay) === pay0 && !('p5' in w) && !('access' in w.signup));
      reset(); ok('P5C-H2 Reset: no revised learner, no test instant; the demo learners legacy and open', p2TermsAll().every(t => t.policy === 'LEGACY-1') && ADMIN.batches.every(b => !b.p5Test) && Object.keys(STORE.worlds).every(k => !p5Applies(STORE.worlds[k])) && (as('nvq-sp'), learnOpen()));
    });
  }

  Clock.unfreeze(); window.ILM_P4_HARNESS = false;
  ['phase', 'R', 'lena'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
