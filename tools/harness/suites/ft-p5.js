// P5 — learner course-access gate, legacy fixture. The commencement resolver (U-05 open: Commenced / Not commenced / Indeterminate)
// in London and Dubai, DST days, a missing time zone or start date, the browser's zone ignored, the harness-only test instant; legacy
// learners (every page, every lock) exactly as the chain before P5; a legacy learner before the batch starts; agency-sponsored
// learners on legacy terms unchanged and on revised terms failing closed (P9); the harness link and REVISED-1 activation still refused.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, U = s => Date.parse(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const bt = (start, tz) => ({ code: 'P5-T', start, tz });
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const harnessAtBoot = window.ILM_P4_HARNESS;

  await T('P5-A commencement resolver', async () => {
    fresh(); const L = bt('2027-01-30T09:00:00Z', 'Europe/London'), D = bt('2027-01-30T09:00:00Z', 'Asia/Dubai');
    ok('P5-A1 London: before 30 Jan 00:00 GMT not commenced; from 00:00 indeterminate (U-05), still at the 09:00 scheduled time', p5Commence(L, U('2027-01-29T23:59:59.999Z')).state === 'not-commenced' && p5Commence(L, U('2027-01-30T00:00:00Z')).state === 'indeterminate' && p5Commence(L, U('2027-01-30T09:00:00Z')).state === 'indeterminate' && /U-05/.test(p5Commence(L, U('2027-01-30T10:00:00Z')).why));
    ok('P5-A2 Dubai: the local start date begins 29 Jan 20:00 UTC', p5Commence(D, U('2027-01-29T19:59:59.999Z')).state === 'not-commenced' && p5Commence(D, U('2027-01-29T20:00:00Z')).state === 'indeterminate');
    const s1 = bt('2027-03-28T09:00:00Z', 'Europe/London'), s2 = bt('2027-10-31T09:00:00Z', 'Europe/London');
    ok('P5-A3 DST days: 28 Mar 2027 begins 00:00 UTC (GMT); 31 Oct 2027 begins 30 Oct 23:00 UTC (BST)', p5Commence(s1, U('2027-03-27T23:59:59Z')).state === 'not-commenced' && p5Commence(s1, U('2027-03-28T00:00:00Z')).state === 'indeterminate' && p5Commence(s2, U('2027-10-30T22:59:59Z')).state === 'not-commenced' && p5Commence(s2, U('2027-10-30T23:00:00Z')).state === 'indeterminate');
    ok('P5-A4 no configured time zone, or no start date: indeterminate (never the P2 fallback)', p5Commence({ code: 'X', start: '2027-01-30T09:00:00Z' }, U('2027-02-10T00:00:00Z')).state === 'indeterminate' && /U-04/.test(p5Commence({ code: 'X', start: '2027-01-30T09:00:00Z' }).why) && p5Commence({ code: 'X', tz: 'Europe/London' }).state === 'indeterminate' && p5Commence(null).state === 'indeterminate');
    learner('B'); const tz0 = W.me.tz; W.me.tz = 'Pacific/Auckland'; const a = p5Commence(L, U('2027-01-29T23:00:00Z')).state; W.me.tz = tz0;
    ok('P5-A5 the learner\'s own (browser) time zone plays no part: 29 Jan 23:00 UTC is 30 Jan in Auckland, not yet in London', a === 'not-commenced');
    window.ILM_P4_HARNESS = false; const b = bt('2027-01-30T09:00:00Z', 'Europe/London');
    ok('P5-A6 a test commencement instant can\'t be set outside the isolated harness (logged)', p5HarnessCommence(b, '2027-01-30T09:00:00Z', 'no flag') === false && !b.p5Test && aud('Blocked: set a test commencement instant') === 1);
    window.ILM_P4_HARNESS = true; p5HarnessCommence(b, '2027-01-30T09:00:00Z', 'P5 vector'); window.ILM_P4_HARNESS = false;
    ok('P5-A7 with an explicit test instant (labelled test data): one millisecond before not commenced; at the instant commenced', Object.isFrozen(b.p5Test) && /not Academy policy/.test(b.p5Test.basis) && p5Commence(b, U('2027-01-30T08:59:59.999Z')).state === 'not-commenced' && p5Commence(b, U('2027-01-30T09:00:00Z')).state === 'commenced' && p5Commence(b, U('2027-01-30T09:00:00Z')).test === true);
  });

  await T('P5-B legacy learners unchanged', async () => {
    fresh(); const keys = Object.keys(STORE.worlds);
    ok('P5-B1 no learner is governed by the gate; every decision is legacy', keys.every(k => !p5Applies(STORE.worlds[k])) && keys.filter(k => STORE.worlds[k] && STORE.worlds[k].me).every(k => p5Decide(STORE.worlds[k]).code === 'P5-LEGACY' && p5Decide(STORE.worlds[k]).allowed));
    const routes = NAV.map(n => n[0]).concat(['assignment', 'quiz', 'thread']), diff = [];
    ['A', 'B', 'C', 'D', 'E', 'F', 'H'].filter(v => STORE.worlds[v]).forEach(v => ['none', 'paused', 'archived'].forEach(edge => {
      learner(v); S.edge = edge; [undefined, 'nvq'].forEach(id => { S.params = id ? { id } : {}; routes.concat(['course']).forEach(r => { if (J(lockFor(r)) !== J(p5Base(r))) diff.push(v + '/' + edge + '/' + r + '/' + (id || '')); }); });
    }));
    S.edge = 'none'; S.params = {};
    ok('P5-B2 every page, every demo learner, normal / paused / archived: the same lock as the chain before P5', diff.length === 0, diff.slice(0, 8).join(', '));
    learner('B'); S.edge = 'underreview'; applyEdge(); const w = W, b = chBatch(w.signup.batch);
    ok('P5-B3 a legacy learner whose batch hasn\'t started: content open at sign-up as before (CH-10 / CH-11)', w.signup.done && !!b && Date.parse(b.start) > now().getTime() && !lockFor('assignments') && !lockFor('observations') && p5Decide(w).code === 'P5-LEGACY', b && b.start);
    S.edge = 'none';
  });

  await T('P5-C agency-sponsored learners', async () => {
    fresh(); learner('D'); ACT.chSponsoredSignup(); const g = W; chComplete(g, { opt: null, method: null });
    ok('P5-C1 legacy sponsored sign-up (Grace): access as before (historical — unchanged by P9), no gate', g.signup.done && chSponsored(g) && !p5Applies(g) && !lockFor('assignments') && J(lockFor('assignments')) === J(p5Base('assignments')));
    fresh(); learner('D'); ACT.chSponsoredSignup(); const h = W; window.ILM_P4_HARNESS = true; const id = p4HarnessRevise(h, 'P5 revised agency fixture'); window.ILM_P4_HARNESS = false; chComplete(h, { opt: null, method: null });
    S.params = {}; const l = lockFor('assignments');
    ok('P5-C2 a sponsored sign-up on the revised terms with no confirmed agency-workflow enrolment fails closed (P9): no programme pages, the reason given', !!id && h.signup.done && p5Decide(h).code === 'P9-NO-AGENCY-ENROLMENT' && !p5Decide(h).allowed && !!l && !!l.p5 && /agency enrolment/.test(l.p5.reason));
    ok('P5-C3 its admission, payments, messages and profile stay open', ['admission', 'payments', 'messages', 'profile', 'notifications', 'help'].every(r => !lockFor(r)));
  });

  await T('P5-D isolation', async () => {
    fresh(); learner('H');
    ok('P5-D1 the page booted without the harness flag; the harness link is refused without it', harnessAtBoot === undefined && p4HarnessRevise(W, 'P5') === false);
    ok('P5-D2 REVISED-1 still can\'t be activated', p2Activate('REVISED-1', 'P5') === false && p2Active() === 'LEGACY-1');
    ok('P5-D3 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
  });

  window.ILM_P4_HARNESS = false;
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
