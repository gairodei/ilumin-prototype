// NB-1 — NVQ enrolment and batch integrity. suites.sh runs it with FIXTURE=client.
// Phase 0 (client demo, real handlers): Lena (short course) applies to the Level 3 Diploma — lock isolation, withdrawal and a new
// application, no eligible batch (full, started, Planned without a Coordinator), multiple batches, Self-Paced / Fully Assisted, card
// and bank transfer, admission pending / approved / rejected, an agency application without option and batch, transfer, staff
// visibility, unauthorized access. Phase 1: a real refresh, Reset demo, then the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-nb1.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-nb1.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'NB1 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const next = ph => { SS.setItem('ft-nb1.R', J(R)); SS.setItem('ft-nb1.phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); ACT.resetDemo(); closeModal(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.ui = {}; };
  const B = () => ADMIN.batches.find(b => b.code === 'DEMO-L3-JAN27');
  const lk = r => (lockFor(r) || {}).title || 'OPEN';
  const lkCourse = id => { const k = S.params; S.params = { id }; try { return lk('course'); } finally { S.params = k; } };
  const aud = act => ADMIN.audit.filter(a => a.action === act).length;
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const nvqCat = () => CATALOGUE.find(x => x.kind === 'nvq');
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const openApply = () => { go('browse'); lastToast = ''; ACT.applyNvq({ dataset: { id: nvqCat().id } }); return MODAL ? MODAL.title : ''; };
  const apply = mode => { const t = openApply(); if (!/^Sign up for/.test(t)) return t; const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); return out === false ? 'refused' : 'started'; };
  const details = () => { go('admission'); $1('#su-dob').value = '1992-02-02'; $1('#su-ad').value = '5 Test Road, London'; ACT.suNext(); };
  const toPay = ff => { const w = W; w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); };
  const pay = (ff, method = 'card') => { setUi('suOpt', 'instalment'); setUi('suMethod', method); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); };
  const signup = (mode, method) => fxFast(ff => { apply(mode); details(); toPay(ff); pay(ff, method); });
  const shortOf = () => W.enrolments.find(e => e.kind === 'short');
  const later = (code, days, extra = {}) => { const c = JSON.parse(J(B())); Object.assign(c, { code, label: code, start: new Date(new Date(B().start).getTime() + days * 864e5).toISOString(), enrolled: 0, roster: [], coh: [] }, extra); ADMIN.batches.push(c); return c; };

  if (PH === 0) {
    await T('NB1 lock isolation', async () => {
      reset(); as('short'); const e = shortOf(), e0 = B().enrolled;
      ok('NB1 setup: Lena has a paid short course and no NVQ application', !!e && e.status === 'Active' && !W.admission && !W.flags.nvq);
      ok('NB1-01 Apply → Start sign-up creates the application (assigned batch, no seat taken yet)', apply('Self-Paced') === 'started' && W.admission.status === 'Sign-up in progress' && B().enrolled === e0);
      ok('NB1-01 during the sign-up her short course, Payments, Calendar, Certificates and Resources stay open', lkCourse(e.id) === 'OPEN' && ['payments', 'calendar', 'certificates', 'resources', 'courses', 'attendance'].every(r => lk(r) === 'OPEN'), ['payments', 'calendar', 'resources'].map(lk).join());
      ok('NB1-01 the NVQ programme itself stays behind "Finish your sign-up" (CH-10 unchanged)', ['assignments', 'progress', 'observations'].every(r => lk(r) === 'Finish your sign-up') && lkCourse('nvq') === 'Finish your sign-up');
      go('course', { id: e.id }); ok('NB1-01 the short course page renders its content, not a lock page', !$1('main .lockpage') && main().includes(e.title.split(' — ')[0]));
      go('payments'); ok('NB1-01 Payments renders (no lock page)', !$1('main .lockpage'));
      go('dashboard'); const btn = $a('main [data-act="cfLearn"]').find(b => b.dataset.id === e.id);
      ok('NB1-07 the dashboard offers Start / Continue learning for the open short course (no "Open" on a locked course)', !!btn && !lockFor('course'));
      ok('NB1-14 the NVQ assignment screen opened directly is still locked', (go('assignments'), !!$1('main .lockpage') && /Finish your sign-up/.test(main())));
    });

    await T('NB1 withdrawal and a new application', async () => {
      reset(); as('short'); const e = shortOf(), e0 = B().enrolled; apply('Self-Paced'); details();
      const first = W.admission, firstSu = W.signup; go('admission'); ACT.withdrawApp(); press();
      ok('NB1-02 withdrawn: the short course and Payments stay open', W.admission.status === 'Withdrawn' && lkCourse(e.id) === 'OPEN' && lk('payments') === 'OPEN' && lk('calendar') === 'OPEN');
      ok('NB1-02 withdrawn: the NVQ programme shows "Application withdrawn"', lk('assignments') === 'Application withdrawn' && lkCourse('nvq') === 'Application withdrawn');
      const a0 = aud('New application after withdrawal'), t = openApply();
      ok('NB1-02 Apply opens the sign-up dialog again, saying the earlier application is kept', /^Sign up for/.test(t) && /Your earlier application \(withdrawn on/.test(mtxt()) && W.admission === first, t + ' ' + lastToast);
      closeModal(); ok('NB1-02 closing the dialog changes nothing', W.admission === first && W.admission.status === 'Withdrawn' && !W.nbPast && W.flags.nvq);
      ok('NB1-02 Start sign-up creates a new application', apply('Fully Assisted') === 'started' && W.admission !== first && W.admission.status === 'Sign-up in progress' && W.signup !== firstSu && !W.signup.done);
      ok('NB1-02 the withdrawn application is kept unchanged as a record, with an audit row', W.nbPast.length === 1 && W.nbPast[0].admission === first && first.status === 'Withdrawn' && first.history.some(h => h[0] === 'Withdrawn') && W.nbPast[0].signup === firstSu && aud('New application after withdrawal') === a0 + 1);
      ok('NB1-02 no seat or charge from either application', B().enrolled === e0 && !(W.plans || []).some(p => p.e === 'nvq') && !W.signup.pay);
      go('admission'); ok('NB1-02 the admission page lists the earlier (withdrawn) application', !!$1('main .nb-past') && /Withdrawn on/.test($1('main .nb-past').textContent));
      ok('NB1-02 a second simultaneous application is refused', (openApply(), !MODAL || !/^Sign up for/.test(MODAL.title)) && /already have/.test(lastToast) && W.nbPast.length === 1); closeModal();
      fxFast(ff => { details(); toPay(ff); pay(ff); });
      ok('NB1-02 the new application completes normally: one seat, Fully Assisted fee', W.signup.done && B().enrolled === e0 + 1 && W.signup.plan.opt.mode === 'Fully Assisted' && W.plans.filter(p => p.e === 'nvq').length === 1);
      const v = S.variant; acaEnter('KA'); S.signedIn = true; const app = allApplications().find(a => a.v === v);
      go('a-admissions', { id: app.id }); ok('NB1-02 the admin application page shows the earlier application', /Earlier applications/.test(main()) && /Withdrawn on/.test(main()));
    });

    await T('NB1 paid / released sign-ups keep the refusal', async () => {
      reset(); as('nvq-sp'); ok('NB1-02 an existing NVQ learner (Amira) is still refused — no duplicate', (openApply(), !MODAL || !/^Sign up for/.test(MODAL.title)) && /already have/.test(lastToast)); closeModal();
    });

    await T('NB1 no eligible batch', async () => {
      const noBatch = (label, setup) => {
        reset(); setup(); as('short'); const e0 = B().enrolled, a0 = aud('Sign-up not started (no eligible batch)'); const t = openApply();
        ok(`NB1-03 ${label}: Apply creates nothing and says no intake is available`, t === 'No intake available right now' && /Nothing was created and you haven't been charged/.test(mtxt()) && /020 3983 0282|info@/.test(mtxt()) && !W.admission && !W.flags.nvq && aud('Sign-up not started (no eligible batch)') === a0 + 1, t);
        closeModal(); ok(`NB1-03 ${label}: no seat, the short course and Payments stay open`, B().enrolled === e0 && lkCourse(shortOf().id) === 'OPEN' && lk('payments') === 'OPEN');
      };
      noBatch('full batch', () => { B().enrolled = B().cap; });
      noBatch('batch already started', () => { B().status = 'In Progress'; });
      noBatch('Planned batch with no Coordinator', () => { const b = B(); b.status = 'Planned'; b.coords = []; b.coord = ''; });
      reset(); const b = B(); b.status = 'Planned'; as('short');
      ok('NB1-04 a Planned batch with a Coordinator is still assigned (CH-42 unchanged)', apply('Self-Paced') === 'started' && (details(), W.signup.batch === 'DEMO-L3-JAN27'));
      reset(); later('NB1-FA-ONLY', 60, { w1opts: [opt('Fully Assisted').id] }); B().w1opts = [opt('Fully Assisted').id]; as('short'); openApply();
      const sp = $1(`#modal-root input[name="r1-opt"][value="${opt('Self-Paced').id}"]`);
      ok('NB1-03 an option no batch takes can\'t be chosen and says so; the other shows its earliest batch', !!sp && sp.disabled && /No batch is taking this option right now/.test(mtxt()) && /Earliest batch for this option: DEMO-L3-JAN27/.test(mtxt()));
      sp.disabled = false; sp.checked = true; ok('NB1-03 forcing that option is refused on Start sign-up (nothing created)', prim() === false && !W.admission); closeModal();
    });

    await T('NB1 unready batch at payment', async () => {
      reset(); as('short'); const e0 = B().enrolled; apply('Self-Paced'); fxFast(ff => { details(); toPay(ff); });
      const b = B(), keep = [b.coords.slice(), b.coord]; b.coords = []; b.coord = ''; go('admission');
      ok('NB1-05 the batch loses its Coordinator before payment: the payment step says it can\'t take learners, nothing to pay', !!$1('main .nb-unready') && !$1('main [data-act="suPay"]'));
      const a0 = aud('Blocked: pay for the sign-up (batch not taking learners)'); ACT.suPay();
      ok('NB1-05 a direct payment call is refused and logged: no charge, no seat, no plan', !W.signup.done && !MODAL && B().enrolled === e0 && !(W.plans || []).some(p => p.e === 'nvq') && aud('Blocked: pay for the sign-up (batch not taking learners)') === a0 + 1);
      const c = later('NB1-LATER', 90, { coords: keep[0], coord: keep[1] }); go('admission');
      ok('NB1-05 with another eligible batch, the learner is reassigned and told why', W.signup.batch === 'NB1-LATER' && /can't take new learners at the moment/.test(main()) && !/filled before you paid/.test(main()));
      fxFast(ff => pay(ff)); ok('NB1-05 payment then takes a seat on the new batch only', W.signup.done && c.enrolled === 1 && B().enrolled === e0);
    });

    await T('NB1 multiple batches and wording', async () => {
      reset(); later('NB1-EARLY-NOCOORD', -40, { coords: [], coord: '' }); const c2 = later('NB1-MAR27', 90); as('short');
      openApply(); ok('NB1-07 the dialog says Start sign-up creates the application and names the earliest batch', /Pressing Start sign-up creates your application/.test(mtxt()) && /Earliest batch for this option: DEMO-L3-JAN27/.test(mtxt())); closeModal();
      apply('Self-Paced'); go('admission');
      ok('NB1-04 an earlier batch without a Coordinator is skipped; the earliest staffed batch is assigned (no choice — CH-42)', (details(), W.signup.batch === 'DEMO-L3-JAN27') && !$a('main input[name="su-batch"]').length);
      ACT.suBack && ACT.suBack(); go('admission'); ok('NB1-07 step 1 shows the batch start and end dates and why it was assigned', new RegExp(`starts ${fd(B().start)}, ends ${fd(B().end)}`).test(main()) && /earliest batch with a place that takes your fee option/.test(main()) && /Your delivery mode: Self-Paced/.test(main()));
      ok('NB1-07 a later staffed batch exists but isn\'t chosen', c2.enrolled === 0);
    });

    await T('NB1 fees, card and bank', async () => {
      reset(); as('short'); signup('Fully Assisted');
      const pl = W.plans.find(p => p.e === 'nvq');
      ok('NB1-08 Fully Assisted: £2,600 in 6 instalments (433.33 × 5, 433.35), mode Fully Assisted', W.signup.plan.opt.fee === 2600 && J(pl.rows.map(r => r.amount)) === J([433.33, 433.33, 433.33, 433.33, 433.33, 433.35]));
      ok('NB1-07 completion message: programme open, admission still under review', /Sign-up complete — your programme is open\. The Academy is still reviewing your application\./.test(lastToast), lastToast);
      ok('NB1-09 card: content opens on payment (CH-10), admission awaiting review', lk('assignments') === 'OPEN' && W.admission.status === 'Awaiting review');
      go('admission'); ok('NB1-07 the sign-up card shows the admission decision and learning access separately', /Not decided yet \(Awaiting review\)/.test(($1('main .nb-adm') || {}).textContent || '') && /Open — since you finished sign-up/.test(($1('main .nb-acc') || {}).textContent || ''));
      reset(); as('short'); signup('Self-Paced', 'bank'); const p2 = W.plans.find(p => p.e === 'nvq');
      ok('NB1-08 Self-Paced: £1,800 in 6 × £300', J(p2.rows.map(r => r.amount)) === J([300, 300, 300, 300, 300, 300]));
      ok('NB1-09 bank transfer: content opens at once, first row awaiting Finance (CH-11 unchanged)', lk('assignments') === 'OPEN' && p2.rows[0].status === 'Awaiting confirmation by Finance' && (STORE.chBank || []).some(x => x.v === W.v));
    });

    await T('NB1 admission decisions', async () => {
      reset(); as('short'); const v = S.variant; signup('Self-Paced'); const e0 = B().enrolled;
      const app = allApplications().find(a => a.v === v); acaEnter('KA'); S.signedIn = true; go('a-admissions', { id: app.id });
      app.docs.filter(d => d.mand).forEach(d => ACT.docDec({ dataset: { a: app.id, d: d.id, s: 'Approved' } }));
      ACT.appApprove({ dataset: { id: app.id } });
      ok('NB1-07 the approval dialog says approval doesn\'t change the batch', /approval records the admission decision and doesn't change the batch/.test(mtxt()) && !/approval confirms it/.test(mtxt()));
      reason(); ok('NB1-10 approved', STORE.worlds[v].admission.status === 'Approved');
      as('short'); go('admission'); ok('NB1-10 the learner sees "Approved" as the admission decision', /Approved/.test(($1('main .nb-adm') || {}).textContent || ''));
      reset(); as('short'); signup('Self-Paced'); const app2 = allApplications().find(a => a.v === v), f0 = STORE.fin.notifs.length;
      acaEnter('KA'); S.signedIn = true; go('a-admissions', { id: app2.id }); ACT.appReject({ dataset: { id: app2.id } }); reason('Not eligible (NB1 test)');
      const w = STORE.worlds[v];
      ok('NB1-10 rejected after payment: access, seat and payments kept; Finance notified (CH-12 / CH-13)', w.admission.status === 'Rejected' && w.nvq.status === 'Active' && B().enrolled === e0 && !!w.admission.rejectedAfterPay && STORE.fin.notifs.length > f0 && STORE.fin.notifs[0].t === 'Admission rejected after payment');
      as('short'); go('dashboard'); const dash = main();
      ok('NB1-10 the dashboard shows "Admission not approved" with the next step', /Admission not approved\./.test(dash) && /Finance team reviews whether a refund applies/.test(dash) && !!$1('.banners [data-go="admission"]'));
      ok('NB1-10 access still open after the rejection', lk('assignments') === 'OPEN');
      go('admission'); const adm = main();
      ok('NB1-10 the admission page shows the reason, the next step and "Not approved" — no "Re-apply" placeholder, no "Approved"', /Not eligible \(NB1 test\)/.test(adm) && /message the Academy/.test(adm) && !$1('main [data-act="reapply"]') && /Not approved/.test(($1('main .nb-adm') || {}).textContent || '') && !/Admission approved/.test(adm));
    });

    await T('NB1 agency NVQ application', async () => {
      reset(); acaEnter('KA'); S.signedIn = true; const L = STORE.worlds.CD3.me, ag = ADMIN.agencies[0];
      const ap = ag1NvqApp({ id: 'AS-NB1', course: cdPr().title, agency: ag.name, lid: L.id, learner: L.first + ' ' + L.last, status: 'Admission pending', at: now().toISOString(), bundle: null }, null, null, true);
      ap.docs.forEach(d => { d.status = 'Approved'; d.file = 'x.pdf'; }); ap.docsOk = ap.docs.length; ap.status = 'Under Review';
      go('a-admissions', { id: ap.id }); ok('NB1-11 the agency application page says approval needs a fee option and a batch', /Approval stays unavailable until a fee option and a batch are recorded/.test(main()));
      const a0 = ADMIN.audit.length; ACT.appApprove({ dataset: { id: ap.id } });
      ok('NB1-11 approval is refused with the reason and logged; nothing changed', !MODAL && ap.status === 'Under Review' && ADMIN.audit.length > a0 && /no delivery \(fee\) option and no batch/.test(J(ADMIN.audit.slice(0, ADMIN.audit.length - a0))));
      ok('NB1-11 the shared approval effect refuses it too', ac2AppWhy(ap, 'approve') === NB_AGY_WHY && ac2AppWhy(ap, 'reject') === '');
      ap.mode = 'Fully Assisted'; ap.batch = 'DEMO-L3-JAN27'; ACT.appApprove({ dataset: { id: ap.id } });
      ok('NB1-11 with a fee option and a batch recorded, the normal approval dialog opens', !!MODAL && /Approve admission/.test(MODAL.title)); closeModal();
    });

    await T('NB1 transfer, staff visibility and access', async () => {
      reset(); const c = later('NB1-MOVE', 90, { coords: ['Michael Osei'], coord: 'Michael Osei', teachers: [], assessors: [] });
      as('short'); signup('Self-Paced'); const lid = W.me.id, e0 = B().enrolled;
      as('coord1'); go('c-learners'); ok('NB1-13 the batch Coordinator sees the new learner', /Lena/.test(main()));
      acaEnter('KA'); S.signedIn = true; ACT.chMoveBatch({ dataset: { id: lid } }); const s = $1('#ch-mv-b'); if (s) s.value = c.code; reason('NB1 move');
      ok('NB1-12 transfer: seat counts move once (CH-42 admin change unchanged)', B().enrolled === e0 - 1 && c.enrolled === 1);
      as('coord1'); go('c-learners'); ok('NB1-13 the old batch\'s Coordinator no longer sees her', !/Lena/.test(main()));
      reset(); as('short'); ok('NB1-14 a learner without an NVQ application still can\'t open the NVQ areas (unchanged)', lk('assignments') === 'This area is for NVQ/RQF learners' && lk('progress') === 'This area is for NVQ/RQF learners' && lk('admission') === 'This area is for NVQ/RQF learners');
    });

    // Leave a new application after a withdrawal in the saved demo, for the refresh check
    await T('NB1 refresh setup', async () => { reset(); as('short'); apply('Self-Paced'); go('admission'); ACT.withdrawApp(); press(); apply('Self-Paced'); go('dashboard'); SS.setItem('ft-nb1.v', S.variant); });
    next(1);
    return;
  }

  if (PH === 1) {
    await T('NB1 refresh', async () => {
      const w = STORE.worlds[SS.getItem('ft-nb1.v')];
      ok('NB1-15 after a real refresh the new application and the withdrawn record are both kept', !!w && w.admission.status === 'Sign-up in progress' && (w.nbPast || []).length === 1 && w.nbPast[0].admission.status === 'Withdrawn');
      as('short'); ok('NB1-15 after refresh the short course stays open during the sign-up', lkCourse(shortOf().id) === 'OPEN' && lk('payments') === 'OPEN');
    });
    await T('NB1 Reset demo', async () => {
      reset(); as('short'); ok('NB1-15 Reset demo: Lena has no NVQ application and no earlier record; the batch is back to 4 of 16', !W.admission && !W.nbPast && B().enrolled === 4 && B().cap === 16);
    });
    await T('NB1 legacy', async () => {
      fxLoadLegacy(); const L3 = ADMIN.batches.find(b => b.code === 'L3AC-NOV26-LEI').course, L2 = ADMIN.batches.find(b => b.code === 'L2DC-FEB27').course;
      ok('NB1-16 legacy: CH-42 nearest batches unchanged (UK → Leicester Cohort 8, UAE → Abu Dhabi Cohort 1)', (chNearest(L3, 'United Kingdom') || {}).code === 'L3AC-NOV26-LEI' && (chNearest(L3, 'United Arab Emirates') || {}).code === 'L3AC-DEC26-AUH');
      ok('NB1-16 legacy: the Planned batch with no Coordinator (L2DC-FEB27) is never assigned', !chUpcoming(L2).filter(b => b.code !== 'L2DC-FEB27').forEach(b => { b.enrolled = b.cap; }) && chNearest(L2, 'United Kingdom') === null);
      ok('NB1-16 legacy: the demo applicant (variant B) mid-sign-up keeps Payments open and the programme locked', (setVariant('B'), lk('payments') === 'OPEN' && lk('assignments') === 'Finish your sign-up'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-nb1.phase'); SS.removeItem('ft-nb1.R'); SS.removeItem('ft-nb1.v');
})();
