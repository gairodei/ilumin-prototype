// SIB-FINAL C — Business Admin: onboarding wizard (BUS-01), bundle calculations and price (BUS-02 / BUS-07), agency selection
// for agency codes and customised bundles (BUS-03), no Batch assignment (BUS-04), announcements (BUS-05), agency reports (BUS-06).
// suites.sh runs it with FIXTURE=client. Phase 0: the client demo through the real screens and handlers, incl. a card purchase.
// Phase 1: a real refresh (agency, draft, code, purchase kept), Reset demo, then the legacy fixture (agency isolation, reports).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sib-c.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sib-c.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); if (!a) throw new Error('no action ' + l); return a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = (ph, keep) => { SS.setItem('ft-sib-c.R', J(R)); SS.setItem('ft-sib-c.phase', String(ph)); if (keep) SS.setItem('ft-sib-c.keep', J(keep)); location.reload(); };
  const set = (s, v) => { $1(s).value = v; INP.bpCalc(); };
  const out = () => ($1('#bp-out') || {}).textContent || '';
  const AGY = id => { closeModal(); agyEnter(id, true); S.ui = {}; };
  // Independent check of the automatic price (list × seats, one rate from the Discount rates, whole-pound rounding)
  const indep = (courses, seats) => { const list = courses.reduce((s, t) => s + coursePrice(t), 0) * seats, c = discNow(); const sl = (c.slabs || []).find(x => seats >= x[0] && (x[1] == null || seats <= x[1])); const pct = sl ? sl[2] : (c.std || 0); return { list, pct, final: Math.round(list * (1 - pct / 100)) }; };

  if (PH === 0) {
    const ME = 'Sophie Turner';
    /* ---------- BUS-01 onboarding ---------- */
    await T('SIB-C onboarding wizard', async () => {
      pick('biz'); go('a-agencies'); const n0 = ADMIN.agencies.length, a0 = ADMIN.audit.filter(a => a.module === 'Agencies').length;
      ACT.newAgency(); ok('BUS-01 the stepper is marked for its narrow-screen layout and announces the current step', !!$1('#modal-root .sib-oa-steps') && $1('#modal-root .sib-oa-steps .step.cur').getAttribute('aria-current') === 'step' && $a('#modal-root .sib-oa-steps .step').length === 7);
      $1('#oa-n').value = 'SIB Care Ltd'; $1('#oa-r').value = 'SIB-123'; $1('#oa-a').value = '1 Test Street'; prim();
      $1('#oa-pc').value = 'Sam Sib (Manager)'; $1('#oa-pe').value = 'sam@sibcare.example'; act('Back');
      ok('BUS-01 Back returns to step 1 with its values', /step 1 of 7/.test(MODAL.title) && $1('#oa-n').value === 'SIB Care Ltd' && $1('#oa-a').value === '1 Test Street');
      prim(); ok('BUS-01 …and Next shows step 2 with what was typed before Back (was lost)', $1('#oa-pc').value === 'Sam Sib (Manager)' && $1('#oa-pe').value === 'sam@sibcare.example');
      prim(); $1('#oa-li').value = 'login@sibcare.example'; act('Back'); prim(); ok('BUS-01 the login typed on step 3 survives Back (was replaced by the contact email)', $1('#oa-li').value === 'login@sibcare.example', $1('#oa-li').value);
      prim(); $a('#modal-root input[name="oa-p"]')[1].checked = true; prim(); $a('#modal-root .oa-v')[0].checked = false; act('Back'); prim();
      ok('BUS-01 report-visibility choices survive Back', $a('#modal-root .oa-v')[0].checked === false);
      prim(); ok('BUS-01 step 6 reached with every step still listed', /step 6 of 7/.test(MODAL.title) && $a('#modal-root .sib-oa-steps .step.done').length === 5);
      closeModal(); // an accidental close (×, Escape or a click outside)
      ok('BUS-01 closing keeps a draft — and creates nothing (no agency, no audit, no email)', !!STORE.sibOa[ME] && STORE.sibOa[ME].step === 6 && ADMIN.agencies.length === n0 && ADMIN.audit.filter(a => a.module === 'Agencies').length === a0 && !STORE.agy.lmails.some(m => m.agency === 'SIB Care Ltd'));
      ACT.newAgency(); ok('BUS-01 Onboard agency offers to continue the draft or start again', /Continue onboarding\?/.test(mtxt()) && /SIB Care Ltd/.test(mtxt()) && /step 6 of 7/.test(mtxt()) && /draft only/.test(mtxt()));
      act('Continue the draft'); ok('BUS-01 continuing reopens at step 6 with every earlier value', /step 6 of 7/.test(MODAL.title) && !STORE.sibOa[ME]);
      prim(); const rv = mtxt(); ok('BUS-01 the review shows the values from every step', /SIB Care Ltd/.test(rv) && /login@sibcare\.example/.test(rv) && /Receive-only/.test(rv) && !/Individual student report/.test(rv) && /1 Test Street/.test(rv));
      press(); const a = ADMIN.agencies.find(x => x.name === 'SIB Care Ltd');
      ok('BUS-01 created once, through the approval-preserving path: Onboarding, login not activated, stable ID, audited, set-password email', !!a && ADMIN.agencies.length === n0 + 1 && agStatus(a) === 'Onboarding' && a.loginStatus === 'Not activated' && /^AG-\d+$/.test(a.id) && ADMIN.audit.some(x => x.action === 'Agency onboarded' && x.entity === 'SIB Care Ltd') && STORE.agy.lmails.some(m => m.agencyId === a.id && m.email === 'login@sibcare.example'));
      ok('BUS-01 the draft is cleared once the agency is created; the success message is accurate', !STORE.sibOa[ME] && S.route === 'a-agencies' && S.params.id === a.id);
      ACT.newAgency(); ok('BUS-01 with no draft, Onboard agency starts a new wizard directly', /step 1 of 7/.test((MODAL || {}).title || ''));
      $1('#oa-n').value = 'SIB Care Ltd'; $1('#oa-r').value = 'X1'; prim(); ok('BUS-01 (negative) the same agency name is refused at step 1', /step 1 of 7/.test(MODAL.title) && /already exists/.test(mtxt()));
      closeModal(); ok('BUS-01 a draft is kept for the half-filled duplicate too', !!STORE.sibOa[ME]);
      ACT.newAgency(); act('Start again'); ok('BUS-01 Start again discards the draft and opens step 1 empty', !STORE.sibOa[ME] && /step 1 of 7/.test(MODAL.title) && $1('#oa-n').value === ''); closeModal();
      ok('BUS-01 a wizard closed with nothing typed leaves no draft', !STORE.sibOa[ME]);
      // a draft for the refresh check
      ACT.newAgency(); $1('#oa-n').value = 'SIB Draft Agency'; $1('#oa-r').value = 'D-1'; prim(); $1('#oa-pc').value = 'Dee Raft'; closeModal();
      ok('BUS-01 a step-2 draft is kept (with its step-2 values)', STORE.sibOa[ME] && STORE.sibOa[ME].step === 2 && STORE.sibOa[ME].d.contact === 'Dee Raft');
      pick('sys'); const nA = ADMIN.agencies.length; ACT.newAgency(); ok('BUS-01 (negative) the System Administrator still can\'t onboard (G9.1)', !MODAL && ADMIN.agencies.length === nA);
    });
    /* ---------- BUS-02 / BUS-07 bundle calculations ---------- */
    let PID = null;
    await T('SIB-C bundle builder input', async () => {
      pick('biz'); go('a-bundles'); ACT.newBundle({ dataset: {} }); const n0 = STORE.biz.products.length;
      for (const v of ['0', '-3', '', '2.5', 'abc']) { set('#bp-s', v); ok(`BUS-02 seats ${J(v)}: no price shown, the reason given`, /Price not worked out/.test(out()) && /whole number of seats, 1 or more/.test(out()) && !/final £/.test(out())); }
      $1('#bp-n').value = 'SIB invalid'; set('#bp-s', '0'); const r0 = saveProduct(S.bp, 'next'); ok('BUS-02 (negative) invalid seats can\'t be saved (was saved as 1 seat)', r0 === false && STORE.biz.products.length === n0);
      set('#bp-s', '10'); $1('#bp-k').value = 'pct'; INP.bpCalc();
      for (const v of ['-10', '150', '', 'x']) { set('#bp-p', v); ok(`BUS-02 discount ${J(v)}%: refused (was a negative or above-list total)`, /Discount %: enter a number from 0 to 100/.test(out())); }
      set('#bp-p', '12.5'); const e = indep(['Moving and Handling People'], 10); const want = Math.round(e.list * (1 - 12.5 / 100));
      ok('BUS-07 a valid flat discount: list, discount and final = the independent calculation, with the rounding rule named', out().includes(money(e.list, 'GBP')) && out().includes('final ' + money(want, 'GBP')) && /Rounded to whole pounds/.test(out()), out().slice(0, 160));
      ACT.bpMode({ dataset: { m: 'custom' } });
      ok('BUS-02 switching to Customised prices at once (no false "choose the agency" error)', !/Price not worked out/.test(out()) && /final £/.test(out()), out().slice(0, 120));
      for (const v of ['', '0', '-50']) { set('#bp-t', v); ok(`BUS-02 negotiated price ${J(v)}: refused (blank and 0 fell back to the automatic rate)`, /Negotiated price: enter the agreed total/.test(out())); }
      set('#bp-t', '9999'); ok('BUS-07 a negotiated price above the list is named as such (was "discount −2122%")', /above the list price \(no discount\)/.test(out()) && !/discount -\d/.test(out()), out().slice(0, 140));
      ok('BUS-03 the customised-bundle agency list shows each agency\'s ID; its value stays the agency', $a('#bp-a option').every(o => /\(AG-\d+/.test(o.textContent) && ADMIN.agencies.some(a => a.name === o.value)));
      set('#bp-t', '400'); $1('#bp-n').value = 'SIB CarePlus pack'; saveProduct(S.bp, 'draft'); const p = STORE.biz.products.find(x => x.name === 'SIB CarePlus pack'); PID = p && p.id;
      ok('BUS-03 a customised bundle keeps the agency ID with the name', !!p && p.agency === 'CarePlus Recruitment (demo)' && p.agencyId === 'AG-02' && !('_in' in p), J(p && [p.agency, p.agencyId]));
      ok('BUS-07 the saved negotiated price is the one entered', !!p && p.customTotal === 400 && priceOf(p).final === 400);
    });
    await T('SIB-C NVQ fee options and unpriced courses', async () => {
      go('a-bundles'); ACT.newBundle({ dataset: {} }); $a('#modal-root .bp-c').forEach(x => { x.checked = /Level 3 Diploma/.test(x.value); }); INP.bpCalc();
      ok('BUS-07 an NVQ programme names the price-list fee and its fee options; the seat\'s option is a client decision', /£1,800\.00 per seat/.test(out()) && /Self-Paced \(demo fee\) £1,800\.00/.test(out()) && /Fully Assisted \(demo fee\) £2,600\.00/.test(out()) && /client decision/.test(out()), out().slice(-400));
      closeModal();
      const x = { id: 'CAT-SIBX', name: 'SIB unpriced', courses: ['Retired Course (SIB test)'], seats: 5, days: 365, desc: '', mode: 'auto', pct: null, slabs: null, customTotal: null, cur: 'GBP', agency: null, status: 'Draft', version: 1, history: [[1, now().toISOString(), 'test', 'injected']] };
      STORE.biz.products.push(x); go('a-bundles', { id: x.id, tab: 'catalogue' });
      ok('BUS-07 a course without an approved price is named and stops the bundle (was priced at an invented £35)', /Price unavailable/.test(main()) && /Retired Course \(SIB test\) has no approved price/.test(main()));
      const a0 = ADMIN.audit.length, r = ACT.bPublish({ dataset: { id: x.id } }); ok('BUS-07 (negative) it can\'t be published (refused and audited)', r === false && x.status === 'Draft' && ADMIN.audit.length === a0 + 1 && /price unavailable/.test(ADMIN.audit[0].action));
      x.status = 'Published'; AGY('AG-02'); ok('BUS-07 an unpriced bundle is never offered to an agency', !AGY_CATALOGUE().some(c => c.id === x.id));
      const a1 = ADMIN.audit.length; const rb = ACT.agBuy({ dataset: { id: x.id } }); ok('BUS-07 (negative) a direct buy of it is refused and logged', rb === false && !MODAL && ADMIN.audit.length === a1 + 1);
      STORE.biz.products.splice(STORE.biz.products.indexOf(x), 1);
    });
    let BUY = null;
    await T('SIB-C pricing consistency and purchase', async () => {
      pick('biz'); const p = STORE.biz.products.find(x => x.id === 'CAT-20');
      [1, 5, 10, 25, 50].forEach(q => { const e = indep(p.courses, q), pr = priceOf(p, p.cur, q), N = aafeCalc(p, q, null); ok(`BUS-02 independent calculation = priceOf = breakdown for ${q} seat(s)`, pr.list === e.list && pr.pct === e.pct && pr.final === e.final && N.net === e.final, J([e, pr.final, N.net])); });
      go('a-bundles', { id: 'CAT-20', tab: 'catalogue' }); ok('BUS-07 the bundle page shows the approved 5-seat price (5 × £45 = £225, no discount, no VAT)', main().includes('£225.00') && priceOf(p).final === 225 && chVatPct(p) === 0);
      AGY('AG-02'); const c = AGY_CATALOGUE().find(x => x.id === 'CAT-20'); const ap = priceFor(c, 5);
      ok('BUS-07 the agency catalogue price equals the published offer', ap.total === priceOf(p).final, J([ap.total, priceOf(p).final]));
      go('g-buy'); click($1('main [data-act="agBuy"][data-id="CAT-20"]')); $1('#gq').value = '5'; INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="card"]').checked = true; prim(); $1('#gc-o').value = 'success'; prim(); BUY = STORE.agy.purchases[0]; closeModal(); S.agy.buy = null;
      const held = ADMIN.bundles.find(b => b.agency === 'CarePlus Recruitment (demo)' && b.seats === 5);
      ok('BUS-07 the card payment equals the offer, and the purchase records that price', !!BUY && BUY.amount === 225 && !!held && held.price === 225, J([BUY && BUY.amount, held && held.price]));
      const tx = allTx().filter(t => t.amount === 225 && /CarePlus/.test(t.payer || ''));
      ok('BUS-07 the ledger holds one payment row of the same amount', tx.length === 1, J(tx.map(t => [t.ref, t.amount, t.payer])));
      pick('biz'); ACT.newBundle({ dataset: { id: 'CAT-20' } }); $1('#bp-k').value = 'pct'; INP.bpCalc(); set('#bp-p', '40'); $1('#modal-root #bp-j') && ($1('#bp-j').value = 'SIB test'); saveProduct(S.bp, 'draft');
      ok('BUS-07 a later price change makes a new version and never reprices the paid purchase', p.version === 2 && held.price === 225 && BUY.amount === 225 && tx[0].amount === 225, J([p.version, held.price]));
    });
    /* ---------- BUS-03 agency referral codes ---------- */
    let CODE = null;
    await T('SIB-C agency referral code', async () => {
      pick('biz'); go('a-referrals'); click($1('main [data-act="newRef"]'));
      ok('BUS-03 an Agent code shows a typed owner field; the agency picker is hidden', !$1('#modal-root .sib-rf-own').hidden && $1('#modal-root .sib-rf-ag').hidden);
      $1('#rf-o').value = 'Typed agent'; $1('#rf-t').value = 'Agency'; INP.sibRfT($1('#rf-t'));
      ok('BUS-03 choosing type Agency shows a searchable list of existing agencies, by name and ID', !$1('#modal-root .sib-rf-ag').hidden && $1('#modal-root .sib-rf-own').hidden && !!$1('#sib-rf-q') && $a('#sib-rf-a option').some(o => o.value === 'AG-02' && /CarePlus Recruitment \(demo\) \(AG-02\)/.test(o.textContent)));
      const q = $1('#sib-rf-q'); q.value = 'sib care'; INP.sibRfQ(q); ok('BUS-03 searching narrows the list', $a('#sib-rf-a option').filter(o => o.value && !o.hidden).every(o => /SIB Care/i.test(o.textContent)) && $a('#sib-rf-a option').some(o => o.value && !o.hidden));
      q.value = ''; INP.sibRfQ(q); press(); ok('BUS-03 (negative) no agency chosen: refused with the client\'s wording', !!MODAL && /choose an existing agency/.test(mtxt()));
      $1('#sib-rf-a').value = 'AG-02'; INP.sibRfA($1('#sib-rf-a')); press(); const r = ADMIN.referrals[0]; CODE = r && r.code;
      ok('BUS-03 the code is created for the chosen agency and keeps its agency ID', !!r && r.type === 'Agency' && r.owner === 'CarePlus Recruitment (demo)' && r.agencyId === 'AG-02', J(r));
      const bad = s5dRefOp('create', null, { type: 'Agency', owner: 'Unknown Care Ltd', valid: D(30).slice(0, 10) }, '');
      ok('BUS-03 (negative) an unknown agency name is refused by the handler', !bad.ok && /choose an existing agency/.test(J(bad.errs)));
      const ag2 = s5dRefOp('create', null, { type: 'Agent', owner: 'An agent', valid: D(30).slice(0, 10) }, ''); ok('BUS-03 an Agent code has no agency ID', ag2.ok && !('agencyId' in ag2.r));
    });
    /* ---------- BUS-04 no batch assignment ---------- */
    await T('SIB-C no Batch assignment for the Business Admin', async () => {
      pick('biz'); ok('BUS-04 Business Admin navigation has no Batch assignment', !$1('.adm-side a[href="#b-batchassign"]') && !/Batch assignment/.test(($1('.adm-side') || {}).textContent || ''));
      go('b-batchassign'); ok('BUS-04 (negative) opening it by address says it is an academic task (logged)', /isn't part of the Business Admin role/.test(main()) && ADMIN.audit[0].action === 'Blocked: open batch assignment');
      const a0 = ADMIN.audit.length; ACT.chMoveBatch({ dataset: { id: 'IA-L-32000' } }); ok('BUS-04 (negative) a direct batch change is refused and logged', !MODAL && ADMIN.audit.length === a0 + 1 && ADMIN.audit[0].action === 'Blocked: batch change');
      go('b-index'); ok('BUS-04 the Business Admin screen index no longer links it', !$1('main [data-t="b-batchassign"]'));
      pick('aca'); go('a-learner', { id: 'IA-L-32000', tab: 'enrolments' }); ok('BUS-04 the Academic Admin keeps Assign / change batch (Learner 360 → Enrolments)', !!$1('main [data-act="chMoveBatch"][data-id="IA-L-32000"]'));
      const a1 = ADMIN.audit.length; ACT.chMoveBatch({ dataset: { id: 'IA-L-32000' } }); ok('BUS-04 …and its handler isn\'t refused for the Academic Admin', !(ADMIN.audit.length > a1 && ADMIN.audit[0].action === 'Blocked: batch change')); closeModal();
      AGY('AG-02'); go('g-seats'); ok('BUS-04 agency seat assignment (a different thing) is unchanged', S.route === 'g-seats' && /Seat Assignments|Assign seats/.test(main()));
    });
    /* ---------- BUS-05 announcements ---------- */
    await T('SIB-C announcements', async () => {
      pick('biz'); go('b-anns'); const m = main();
      ok('BUS-05 the Business Admin page explains the workflow: write, audience, publish/schedule, delivery, withdraw, and what isn\'t sent', /How announcements to agencies work/.test(m) && /Save draft/.test(m) && /agency ID/.test(m) && /schedule/.test(m) && /From the Academy/.test(m) && /Withdraw/.test(m) && /nothing is sent from the prototype/.test(m) && /no expiry date/.test(m));
      ACT.bAnn(); $1('#s5d-t').value = 'SIB notice'; $1('#s5d-b').value = 'SIB body'; $1('#s5d-a').value = 'agencies'; INP.s5dAud($1('#s5d-a')); const s = $1('#s5d-ids-s'); [...s.options].forEach(o => { o.selected = o.value === 'AG-02'; }); INP.s5dAudIds(s); prim(); closeModal();
      AGY('AG-02'); go('g-anns', { tab: 'academy' }); ok('BUS-05 the targeted agency sees it under From the Academy, with how it got there', /SIB notice/.test(main()) && /sends these to all agencies or to your agency only/.test(main()));
      go('g-notifs'); ok('BUS-05 …and is notified in-app', /New announcement from the Academy/.test(main()) && /SIB notice/.test(main()));
    });
    /* ---------- BUS-06 agency reports ---------- */
    await T('SIB-C agency reports (client)', async () => {
      pick('biz'); go('a-agencies'); setUi('agTab', 'all'); render(); const m = main(); setUi('agTab', 'list');
      ok('BUS-06 All-agencies report: no fixed figures (was 72% and 7 with no learners); "—" and a reason', !/72%|76%/.test(m) && /Completion rate \(short courses\)—/.test(m) && /Certificates expiring \(60 days\)0/.test(m) && /No agency learners yet/.test(m), m.slice(0, 300));
      go('a-agencies', { id: 'AG-02', tab: 'reports' }); ok('BUS-06 an agency\'s Reports tab: counted from its records (was 76% and 2)', !/76%|72%/.test(main()) && /Counted from the records/.test(main()));
      go('b-agreports'); ok('BUS-06 Agency Reports explains what it counts and why it is empty; completion "—" without seats', /What this report counts/.test(main()) && /No agency learners yet/.test(main()) && !/Completion rate0%/.test(main().replace(/\s/g, '')));
      setUi('barA', 'AG-02'); render(); ok('BUS-06 choosing an agency shows its purchase (from the records) and "View as agency"', /View as agency/.test(main()) && main().includes('£225.00'), main().slice(0, 400));
    });
    next(1, { PID, CODE, BUY: BUY && BUY.id });
    return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-sib-c.keep') || '{}');
    await T('SIB-C refresh', async () => {
      pick('biz'); const a = ADMIN.agencies.find(x => x.name === 'SIB Care Ltd'), r = s5dRef(keep.CODE), p = STORE.biz.products.find(x => x.id === keep.PID);
      ok('BUS-01 after a real refresh the created agency is kept (Onboarding, its login)', !!a && agStatus(a) === 'Onboarding' && a.login === 'login@sibcare.example');
      ok('BUS-01 after a real refresh the onboarding draft is still offered', !!STORE.sibOa['Sophie Turner'] && (ACT.newAgency(), /Continue onboarding\?/.test(mtxt()) && /SIB Draft Agency/.test(mtxt()))); closeModal();
      ok('BUS-03 after a real refresh the agency code keeps its agency ID; the customised bundle too', !!r && r.agencyId === 'AG-02' && !!p && p.agencyId === 'AG-02');
      ok('BUS-07 after a real refresh the paid purchase keeps its price', STORE.agy.purchases.some(x => x.id === keep.BUY && x.amount === 225) && ADMIN.bundles.some(b => b.agency === 'CarePlus Recruitment (demo)' && b.price === 225));
    });
    await T('SIB-C Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); pick('biz');
      ok('BUS Reset: the agency, draft, code and purchase are gone', !ADMIN.agencies.some(x => x.name === 'SIB Care Ltd') && !Object.keys(STORE.sibOa || {}).length && !s5dRef(keep.CODE) && !STORE.agy.purchases.length);
    });
    /* ---------- Legacy fixture ---------- */
    await T('SIB-C legacy isolation and reports', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('BA'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
      const cp = STORE.biz.products.find(x => x.id === 'CAT-6'), gulf = ADMIN.agencies.find(a => a.name === 'Gulf Care Recruitment (demo)'), care = ADMIN.agencies.find(a => a.name === 'CarePlus Recruitment (demo)');
      cp.agencyId = care.id; AGY(gulf.id); const seeG = AGY_CATALOGUE().some(c => c.id === 'CAT-6'); AGY(care.id); const seeC = AGY_CATALOGUE().some(c => c.id === 'CAT-6');
      ok('BUS-03 legacy: a customised bundle is offered to its agency only', !seeG && seeC);
      cp.agency = gulf.name; AGY(gulf.id); ok('BUS-03 legacy: matching on the agency ID — a name pointing at another agency doesn\'t hand it the discount', !AGY_CATALOGUE().some(c => c.id === 'CAT-6')); cp.agency = care.name;
      const king = ADMIN.agencies.find(a => agStatus(a) === 'Inactive'); const rs = s5dRefOp('create', null, { type: 'Agency', owner: king.name, valid: D(30).slice(0, 10) }, '');
      ok('BUS-03 legacy (negative) an inactive agency can\'t be given an agency code', !rs.ok && /inactive/.test(J(rs.errs)), J(rs));
      setAdminIdentity('BA'); S.portal = 'admin'; S.signedIn = true;
      const h = agencyReport(care), F = sibAgFacts([care.name]);
      ok('BUS-06 legacy: an agency report counts its own learners and seats from the records', h.includes(`Agency learners</span><span class="big-num num">${F.L.length}<`) && (h.match(/<tr>/g) || []).length === F.A.length + 1 && F.A.length > 0, J([F.L.length, F.A.length]));
      ok('BUS-06 legacy: progress shown is each seat\'s own progress (no invented figures)', F.A.every(x => h.includes(`<td class="r">${x.progress}%</td>`)) && !F.A.some(x => x.agency !== care.name));
      const all = agencyReport(null); ok('BUS-06 legacy: the All-agencies report has no fixed 72% / 7', !/>72%<|>7<\/span>/.test(all) || sibAgFacts(ADMIN.agencies.map(a => a.name)).exp.length === 7);
      AGY(gulf.id); ok('BUS-06 legacy: an agency still sees only its own report (no other agency\'s learners)', (go('g-reports'), !main().includes(care.name)) && !STORE.agy.assign.filter(x => x.agency === care.name).some(x => main().includes(x.learner) && !STORE.agy.assign.some(y => y.agency === gulf.name && y.learner === x.learner)));
      setAdminIdentity('BA'); S.portal = 'admin'; S.signedIn = true; ACT.bAnn(); $1('#s5d-t').value = 'SIB legacy notice'; $1('#s5d-a').value = 'agencies'; INP.s5dAud($1('#s5d-a')); const s = $1('#s5d-ids-s'); [...s.options].forEach(o => { o.selected = o.value === care.id; }); INP.s5dAudIds(s); prim(); closeModal();
      AGY(care.id); go('g-anns', { tab: 'academy' }); const seen = /SIB legacy notice/.test(main()); AGY(gulf.id); go('g-anns', { tab: 'academy' });
      ok('BUS-05 legacy: a targeted announcement reaches only that agency', seen && !/SIB legacy notice/.test(main()));
      setAdminIdentity('BA'); S.portal = 'admin'; S.signedIn = true; go('b-batchassign'); ok('BUS-04 legacy: Business Admin can\'t open Batch assignment', /isn't part of the Business Admin role/.test(main()));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-sib-c.phase'); SS.removeItem('ft-sib-c.R'); SS.removeItem('ft-sib-c.keep');
})();
