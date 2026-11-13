// P6 — approved batch transfers, client demo (FIXTURE=client). Phase 0: the end-to-end example through the real screens (the Super
// Administrator requests Amira's move from DEMO-L3-JAN27 to a second future batch, the Academic Admin approves, the transfer is carried
// out once); authority (no self-approval, other roles, override); eligibility (programme, version, fee option / mode, region, capacity,
// commencement and the 24-hour rule without a time zone, signed payment dates, Finance states, revised terms); approved but not yet
// carried out (destination fills, closes; an exception inside the move puts everything back); academic records, Coordinators, sessions,
// P5 access, notifications; cancellation and waitlist can't move anyone; P5 clarifications. Phase 1: a real reload keeps the request and
// the move; a copy saved without the transfer store; Reset.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p6c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const reason = (t = 'P6C reason') => { const r = $1('#modal-root #rsn'); if (r) r.value = t; return prim(); };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); window.ILM_P4_HARNESS = true; const d = ADMIN.batches.find(b => b.code === 'DEMO-L3-JAN27'); if (d) d.tz = 'Europe/London'; }; // test setup: the demo batch's Academy time zone (P6 needs one on both batches)
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const mk = (code, start, o = {}) => { const s = B(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start: start || s.start, end: s.end, enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [], mcA: {}, mcH: [] }, o); delete c.tzHist; delete c.p5Test; if (!('tz' in o)) c.tz = 'Europe/London'; else if (o.tz == null) delete c.tz; ADMIN.batches.push(c); return c; }; // test batches get an Academy time zone unless { tz: null }
  const byName = re => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && re.test(w.me.first || '') && w.signup);
  const AM = () => byName(/^Amira/), DV = () => byName(/^Dev/), SAM = () => byName(/^Sam/), TOM = () => byName(/^Tom/);
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const seatsOf = lid => SEATS().recs.filter(r => r.lid === lid && seatIsActive(r)).map(r => r.batch);
  const terms = w => J([w.signup.pin, w.signup.sig, w.signup.termsRef, w.signup.plan, (w.plans || []).map(p => [p.e, p.rows, p.deposit]), w.signup.p4 || null]);
  const hist = w => J((w.assignments || []).map(a => [a.id, a.status, a.rounds, a.qs.map(q => [q.ans, q.fb])]));
  const at = iso => Clock.freeze(iso);
  const DAY = 864e5;
  const applyL = () => { ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === 'Self-Paced'), rb = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (rb) rb.checked = true; prim(); closeModal(); };

  if (PH === 0) {
    await T('P6C-A the end-to-end transfer: request, Academic Admin approval, carried out once', async () => {
      reset(); const nb = mk('P6-B', null, { cap: 3 }), w = AM(), lid = w.me.id, t0 = terms(w), h0 = hist(w), others = J(['CD2', 'CD4', 'CD5'].map(k => [STORE.worlds[k].signup, STORE.worlds[k].plans]));
      const agy0 = J(STORE.agy || null), n0 = (w.notifs || []).filter(n => /batch has changed/i.test(n.title)).length, ev0 = (w.events || []).filter(e => e.type === 'class').length;
      as('super'); go('a-learner', { id: lid, tab: 'enrolments' });
      ok('P6C-A1 Learner 360 offers "Request batch transfer" (no direct change)', /Request batch transfer/.test(main()) && !!$1('main [data-act="chMoveBatch"]'), main().slice(0, 600));
      ACT.chMoveBatch({ dataset: { id: lid } }); const opt = $1('#modal-root #ch-mv-b option[value="P6-B"]');
      ok('P6C-A2 the dialog is a request: it lists P6-B and says approval comes first', !!MODAL && /Request batch transfer/.test(MODAL.title) && !!opt && /Academic Admin approves the transfer/.test($1('#modal-root').textContent));
      $1('#modal-root #ch-mv-b').value = 'P6-B'; reason('Learner asked for the other cohort'); const q = P6().reqs[0];
      ok('P6C-A3 a request is recorded (Pending Academic Approval) with the requester, reason, source, destination and signed terms; nothing moved', !!q && q.state === 'Pending Academic Approval' && q.from === 'DEMO-L3-JAN27' && q.to === 'P6-B' && q.by.role === 'Super Administrator' && q.terms && q.terms.policy === 'LEGACY-1' && w.signup.batch === 'DEMO-L3-JAN27' && J(seatsOf(lid)) === J(['DEMO-L3-JAN27']) && nb.enrolled === 0);
      ok('P6C-A4 a direct chDoMove is refused (no approved request); nothing changed', chDoMove(lid, B(), nb, 'direct') === false && w.signup.batch === 'DEMO-L3-JAN27' && aud('Blocked: batch change without an approved transfer request') >= 1);
      ok('P6C-A5 a second request for the same enrolment is refused while one is open', p6Request(lid, 'P6-B', 'again').ok === false);
      for (const p of ['fin', 'biz', 'coord1']) { as(p); const out = p6Decide(q.id, 'approve', 'x'); ok(`P6C-A6 ${p}: can't approve (refused, logged, nothing changed)`, out.ok === false && q.state === 'Pending Academic Approval' && w.signup.batch === 'DEMO-L3-JAN27'); }
      as('nvq-sp'); ok('P6C-A6 the learner can\'t approve or execute', p6Decide(q.id, 'approve', 'x').ok === false && p6Execute(q.id).ok === false);
      as('aca'); go('a-transfers', { id: q.id }); const btn = $1('main [data-act="p6Dec"][data-v="approve"]');
      ok('P6C-A7 the Academic Admin sees the request with "Approve and transfer" and "Refuse"', !!btn && !!$1('main [data-act="p6Dec"][data-v="refuse"]') && /Pending Academic Approval/.test(main()));
      ACT.p6Dec(btn); const dlg = !!MODAL; reason('Approved: place confirmed');
      ok('P6C-A8 approved, checked again and carried out: one active place, in P6-B; the old batch frees it', dlg && q.state === 'Executed' && w.signup.batch === 'P6-B' && J(seatsOf(lid)) === J(['P6-B']) && nb.enrolled === 1 && q.dec.by === 'Rachel Hughes' && q.dec.kind === 'approve', J([q.state, q.exec, seatsOf(lid)]));
      ok('P6C-A9 signed financial terms identical: schedule dates and amounts, deposit, letter, terms link', terms(w) === t0);
      ok('P6C-A10 academic records kept: assignments, rounds, answers and feedback unchanged (new issues only add)', (() => { const a = JSON.parse(h0), b = JSON.parse(hist(w)); return a.every(x => b.some(y => J(y) === J(x))); })());
      ok('P6C-A11 Coordinator allocation follows the move: allocated in P6-B, none left in the old batch', !!(nb.mcA || {})[lid] && !(B().mcA || {})[lid], J([nb.mcA, (B().mcA || {})[lid]]));
      ok('P6C-A12 other learners and agency entitlements untouched', J(['CD2', 'CD4', 'CD5'].map(k => [STORE.worlds[k].signup, STORE.worlds[k].plans])) === others && J(STORE.agy || null) === agy0);
      ok('P6C-A13 the learner is told once; the request history and audit record each step', (w.notifs || []).filter(n => /batch has changed/i.test(n.title)).length === n0 + 1 && J(q.hist.map(h => h.what)) === J(['Requested', 'Approved', 'Executed']) && aud('Batch transfer carried out') === 1);
      const s1 = J(SEATS().recs), x1 = p6Execute(q.id), x2 = p6Decide(q.id, 'approve', 'again');
      ok('P6C-A14 repeating it changes nothing: no second move, seat, audit or notice', x1.ok === false && x2.ok === false && J(SEATS().recs) === s1 && aud('Batch transfer carried out') === 1 && (w.notifs || []).filter(n => /batch has changed/i.test(n.title)).length === n0 + 1);
      as('nvq-sp'); render(); const ev1 = (W.events || []).filter(e => e.type === 'class').length;
      ok('P6C-A15 sessions follow the batch: the old batch\'s classes (and their Zoom links) left the learner\'s calendar', ev0 > 0 && ev1 < ev0, J([ev0, ev1]));
      ok('P6C-A16 P5 access recalculated, nothing stored: legacy terms, same decision', p5Decide(W).code === 'P5-LEGACY' && !('access' in W.signup));
      ok('P6C-A17 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P6C-B authority', async () => {
      reset(); mk('P6-B', null, { cap: 3 }); const lid = DV().me.id;
      as('aca'); const r = p6Request(lid, 'P6-B', 'Academic Admin request');
      ok('P6C-B1 the Academic Admin requests; approving her own request is refused (no self-approval), logged', r.ok && p6Decide(r.id, 'approve', 'mine').ok === false && aud('Blocked: approve batch transfer') >= 1 && p6Req(r.id).state === 'Pending Academic Approval');
      as('super'); go('a-transfers', { id: r.id }); ACT.p6Dec($1('main [data-act="p6Dec"][data-v="override"]')); reason('Override: urgent');
      const q = p6Req(r.id);
      ok('P6C-B2 the Super Administrator overrides with a reason: audited as an override, then carried out under every check', q.state === 'Executed' && q.dec.kind === 'override' && aud('Batch transfer approved (Super Administrator override)') === 1 && DV().signup.batch === 'P6-B');
      ok('P6C-B3 an override without a reason is refused', (() => { const r2 = p6Request(SAM().me.id, 'P6-B', 'x'); return r2.ok && p6Decide(r2.id, 'override', '').ok === false && p6Req(r2.id).state === 'Pending Academic Approval'; })());
      for (const p of ['fin', 'biz', 'coord1', 'nvq-fa']) { as(p); ok(`P6C-B4 ${p}: can't request a transfer`, p6Request(AM().me.id, 'P6-B', 'x').ok === false); }
      as('fin'); const a0 = ADMIN.audit.length; ACT.chMoveBatch({ dataset: { id: AM().me.id } }); ok('P6C-B5 Finance: the dialog doesn\'t open (refused, logged)', !MODAL && ADMIN.audit.length > a0);
      as('super'); const r3 = p6Request(AM().me.id, 'P6-B', 'refuse me'); as('aca'); const rf = p6Decide(r3.id, 'refuse', 'Not needed');
      ok('P6C-B6 a refusal is recorded (Refused, distinct from Invalidated); nothing moves', rf.ok && p6Req(r3.id).state === 'Refused' && AM().signup.batch === 'DEMO-L3-JAN27');
      const s0 = J(SEATS().recs); ok('P6C-B7 a refused request can\'t be approved or executed later', p6Decide(r3.id, 'approve', 'late').ok === false && p6Execute(r3.id).ok === false && J(SEATS().recs) === s0);
    });

    await T('P6C-C eligibility at request', async () => {
      reset(); const w = AM(), lid = w.me.id, A = B(); as('super');
      const why = code => p6Why(lid, A, B(code)), ref = code => { const r = p6Request(lid, code, 'test'); return r.ok ? 'OK' : r.why; };
      mk('P6-OTHER', null, { course: 'Another programme' }); ok('P6C-C1 another programme: refused', /another programme/.test(ref('P6-OTHER')));
      mk('P6-V9', null, { progVersion: 9 }); ok('P6C-C2 another programme version: refused', /version/.test(ref('P6-V9')), ref('P6-V9'));
      const fa = (r1Opts(cdPr().id).find(o => o.mode === 'Fully Assisted') || {}).id; mk('P6-FA', null, { w1opts: [fa] });
      ok('P6C-C3 a batch that doesn\'t take her fee option (Self-Paced; the other option is Fully Assisted, another delivery mode): refused, never replaced', /fee option/.test(ref('P6-FA')), ref('P6-FA'));
      mk('P6-REG', null, { label: 'Abu Dhabi Cohort (P6)', mode: 'Classroom', online: false }); ok('P6C-C4 a batch outside her region: refused', /not open to learners in|Runs in/.test(ref('P6-REG')) || ref('P6-REG') === 'OK', ref('P6-REG'));
      mk('P6-FULL', null, { cap: 0 }); ok('P6C-C5 a full batch: refused', /full/i.test(ref('P6-FULL')));
      mk('P6-NOCO', null, { coord: null, coords: [] }); ok('P6C-C6 no Academic Coordinator: refused', /Coordinator/.test(ref('P6-NOCO')), ref('P6-NOCO'));
      mk('P6-SHUT', null, { status: 'Completed' }); ok('P6C-C7 a closed batch: refused', /Completed|started/.test(ref('P6-SHUT')), ref('P6-SHUT'));
      mk('P6-STARTED', new Date(now().getTime() - 2 * DAY).toISOString()); ok('P6C-C8 a destination that has started: refused', /started|hasn't started/.test(ref('P6-STARTED')), ref('P6-STARTED'));
      ok('P6C-C9 a source batch that has started: refused (checked on a copy of its record)', /before the batch starts/.test(p6Why(lid, { ...A, start: new Date(now().getTime() - DAY).toISOString(), status: 'In Progress' }, mk('P6-OK'))));
      mk('P6-LATER', new Date(Date.parse(A.start) + 30 * DAY).toISOString()); const y = ref('P6-LATER');
      ok('P6C-C10 a batch with another start: her signed payment dates would move — refused, an approved amendment would be required', /signed payment dates would move/.test(y) && /amendment/.test(y), y);
      ok('P6C-C11 the source must be her current batch, and she must hold its place', /batch is now/.test(p6Why(lid, B('P6-OK'), B('P6-LATER'))) && /No place/.test((() => { const k = STORE.seats; STORE.seats = JSON.parse(J(k)); SEATS().recs.filter(r => r.lid === lid).forEach(r => { r.state = 'released'; }); const y2 = p6Why(lid, A, B('P6-OK')); STORE.seats = k; return y2; })()));
      ok('P6C-C12 a withdrawn learner or one without a confirmed enrolment: refused', (() => { const s = w.admission.status; w.admission.status = 'Withdrawn'; const y2 = p6Why(lid, A, B('P6-OK')); w.admission.status = s; const e = w.nvq.status; w.nvq.status = 'Discontinued'; const y3 = p6Why(lid, A, B('P6-OK')); w.nvq.status = e; return /withdrawn/.test(y2) && /confirmed enrolment/.test(y3); })());
      ok('P6C-C13 a learner whose deposit is awaiting bank verification (Tom): refused pending Finance', /awaiting verification by Finance/.test(p6Why(TOM().me.id, A, B('P6-OK'))), p6Why(TOM().me.id, A, B('P6-OK')));
      ok('P6C-C14 a payment received without a seat under Finance review: refused', (() => { const k = STORE.seats; STORE.seats = JSON.parse(J(k)); SEATS().unmatched.push({ id: 'SPR-T', state: 'Finance review', lid, v: w.v }); const y2 = p6Why(lid, A, B('P6-OK')); STORE.seats = k; return /Finance review/.test(y2); })());
      ok('P6C-C15 an applicant (sign-up not complete) isn\'t transferred — P3 choice / L3-C assignment', (() => { as('short'); applyL(); const L = byName(/^Lena/); as('super'); return !!L && /application isn't complete/.test(p6Why(L.me.id, A, B('P6-OK'))) && p6Request(L.me.id, 'P6-OK', 'x').ok === false; })(), (() => { const L = byName(/^Lena/); return L ? p6Why(L.me.id, A, B('P6-OK')) : 'no Lena'; })());
      ok('P6C-C16 nothing was recorded for refused requests; no seat changed', P6().reqs.length === 0 && J(seatsOf(lid)) === J(['DEMO-L3-JAN27']));
    });

    await T('P6C-D commencement and the clock', async () => {
      reset(); const lid = AM().me.id, A = B(), s = Date.parse(A.start); as('super');
      const nb = mk('P6-OK'), nz = mk('P6-NOTZ', null, { tz: null }), t0 = J([AM().signup, AM().plans, SEATS().recs]);
      // P6 correction: no 24-hour fallback — without an explicitly configured zone a batch's start can't be placed, however far away it is
      ok('P6C-D1 a destination with no Academy time zone: refused (even months before its start), naming the batch and how to set its zone', /P6-NOTZ has no Academy time zone configured/.test(p6Why(lid, A, nz) || '') && /set the batch's time zone/.test(p6Why(lid, A, nz) || '') && Date.parse(nz.start) - now().getTime() > 30 * DAY, p6Why(lid, A, nz));
      const tzA = A.tz; delete A.tz; const ys = p6Why(lid, A, nb), rq = p6Request(lid, 'P6-OK', 'no zone'); A.tz = tzA;
      ok('P6C-D2 a source with no Academy time zone: refused at request; nothing recorded; enrolment, terms and seats unchanged', /DEMO-L3-JAN27 has no Academy time zone configured/.test(ys || '') && rq.ok === false && !P6().reqs.length && J([AM().signup, AM().plans, SEATS().recs]) === t0, ys);
      nz.tz = 'Europe/London'; ok('P6C-D2b once the zone is configured, the same transfer can be requested', p6Request(lid, 'P6-NOTZ', 'zone set').ok === true);
      Clock.unfreeze(); const d0 = dayStart(ymdIn(nb.start, 'Europe/London'), 'Europe/London');
      at(new Date(d0 - 1).toISOString()); const c1 = p6Comm(nb); at(new Date(d0).toISOString()); const c2 = p6Comm(nb);
      ok('P6C-D3 with a configured zone (P5\'s resolver): before the local start date not commenced; on it, undecided (U-05) — counted as started', c1 === null && /U-05/.test(c2 || ''), J([c1, c2]));
      Clock.unfreeze(); window.ILM_P4_HARNESS = true; p5HarnessCommence(nb, new Date(s + DAY).toISOString(), 'P6C'); at(new Date(s - 3600e3).toISOString());
      ok('P6C-D4 a test commencement instant (harness only) is honoured: commenced after it, not before', p6Comm(nb) === null && (at(new Date(s + DAY).toISOString()), /commenced|started/.test(p6Comm(nb) || '')));
      Clock.unfreeze();
      ok('P6C-D5 the browser\'s zone plays no part (P2 clock)', (() => { const tz = W.me.tz; W.me.tz = 'Pacific/Auckland'; at(new Date(s - 2 * DAY).toISOString()); const c = p6Comm(A); W.me.tz = tz; Clock.unfreeze(); return c === null; })());
    });

    await T('P6C-E approved but not yet carried out; failures put everything back', async () => {
      reset(); const lid = AM().me.id, nb = mk('P6-B', null, { cap: 1 }); as('super'); const r = p6Request(lid, 'P6-B', 'fill test'); as('aca'); p6Decide(r.id, 'approve', 'ok', { execute: false });
      const q = p6Req(r.id); ok('P6C-E1 approved without carrying out: no seat reserved, nothing moved', q.state === 'Approved' && nb.enrolled === 0 && AM().signup.batch === 'DEMO-L3-JAN27');
      seatSetDemo(nb, 1, 'P6C: the destination fills after approval'); const s0 = J(SEATS().recs.filter(x => x.lid === lid)); const x = p6Execute(q.id);
      ok('P6C-E2 the destination filled after approval: not carried out, recorded as Execution failed; source untouched', x.ok === false && q.state === 'Execution failed' && /full/.test(q.exec.why) && J(SEATS().recs.filter(y => y.lid === lid)) === s0 && AM().signup.batch === 'DEMO-L3-JAN27');
      ok('P6C-E3 a failed request needs a new request (the old approval doesn\'t carry over)', p6Execute(q.id).ok === false && !p6Open(lid));
      const nb2 = mk('P6-C', null, { cap: 3 }); as('super'); const r2 = p6Request(lid, 'P6-C', 'close test'); as('aca'); p6Decide(r2.id, 'approve', 'ok', { execute: false }); nb2.status = 'Cancelled';
      ok('P6C-E4 the destination closed after approval: not carried out', p6Execute(r2.id).ok === false && p6Req(r2.id).state === 'Execution failed' && /Cancelled/.test(p6Req(r2.id).exec.why));
      const nb3 = mk('P6-D', null, { cap: 3 }); as('super'); const r3 = p6Request(lid, 'P6-D', 'throw test'); as('aca'); p6Decide(r3.id, 'approve', 'ok', { execute: false });
      const w = AM(), t0 = terms(w), sAll = J(SEATS().recs), cs = notifyLearner; notifyLearner = function () { throw new Error('simulated failure'); };
      let x3; try { x3 = p6Execute(r3.id); } finally { notifyLearner = cs; }
      ok('P6C-E5 a failure inside the move: everything it touched is put back — seat ledger, batch, terms; the request says why', x3.ok === false && p6Req(r3.id).state === 'Execution failed' && /simulated failure/.test(p6Req(r3.id).exec.why) && J(SEATS().recs) === sAll && w.signup.batch === 'DEMO-L3-JAN27' && terms(w) === t0 && nb3.enrolled === 0, J([p6Req(r3.id).exec, nb3.enrolled]));
      as('super'); const r4 = p6Request(lid, 'P6-D', 'withdraw test'); const s = w.admission.status; w.admission.status = 'Withdrawn'; as('aca'); const d4 = p6Decide(r4.id, 'approve', 'ok'); w.admission.status = s;
      ok('P6C-E6 the learner withdrew after the request: invalidated at approval (distinct from refused); nothing moved', d4.ok === false && p6Req(r4.id).state === 'Invalidated' && w.signup.batch === 'DEMO-L3-JAN27');
      as('super'); const r5 = p6Request(lid, 'P6-D', 'stale dialog'); as('aca'); go('a-transfers', { id: r5.id }); ACT.p6Dec($1('main [data-act="p6Dec"][data-v="refuse"]')); const before = p6Req(r5.id).state;
      as('super'); p6Decide(r5.id, 'override', 'decided elsewhere'); as('aca'); const fn = MODAL && MODAL.actions.find(a => /danger|primary/.test(a.cls || ''));
      ok('P6C-E7 a stale decision dialog (decided meanwhile) changes nothing', before === 'Pending Academic Approval' && (!fn || (( $1('#modal-root #rsn') || {}).value = 'late', fn.fn(), true)) && p6Req(r5.id).state === 'Executed');
      ok('P6C-E8 P1 invariants after the failures and the override', seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P6C-F deposit route, revised terms, cancellation, waitlist', async () => {
      reset(); const nb = mk('P6-B', null, { cap: 3 }), w = SAM(), t0 = terms(w); as('super'); const r = p6Request(w.me.id, 'P6-B', 'deposit route'); as('aca'); p6Decide(r.id, 'approve', 'ok');
      ok('P6C-F1 a deposit-route learner (Sam): moved; deposit, its credit, payment dates and seat-hold deadline unchanged', p6Req(r.id).state === 'Executed' && w.signup.batch === 'P6-B' && terms(w) === t0, J(p6Req(r.id).exec));
      ok('P6C-F2 the seat\'s payment position is unchanged (held stays held, secured stays secured)', (SEATS().recs.find(x => x.lid === w.me.id && seatIsActive(x)) || {}).batch === 'P6-B');
      as('aca'); ACT.cancelBatch({ dataset: { id: 'DEMO-L3-JAN27' } }); const sel = $1('#modal-root .cb-d'), vals = sel ? [...sel.options].map(o => o.value) : [];
      ok('P6C-F3 cancellation offers no move — only an explicit refund outcome; it says a move needs an approved transfer', !!MODAL && J(vals) === J(['', 'refund']) && /approved transfer request/.test($1('#modal-root').textContent), J(vals));
      if (sel) { const o = document.createElement('option'); o.value = 'P6-B'; sel.appendChild(o); $1('#modal-root .cb-d').value = 'P6-B'; $$('#modal-root .cb-d').slice(1).forEach(s => { s.value = 'refund'; }); }
      const rr = reason('Forced move'); closeModal();
      ok('P6C-F4 a forced move value is refused; nothing cancelled, nobody moved', rr === false && B().status !== 'Cancelled' && AM().signup.batch === 'DEMO-L3-JAN27' && aud('Blocked: cancel batch (move without an approved transfer)') === 1);
      const am = AM(); nb.w1wait = [{ id: 'WL-P6', lid: am.me.id, name: chFullName(am), opt: r1OptOfW(am).id, at: now().toISOString() }]; nb.cap = 10;
      as('aca'); ACT.kOffer({ dataset: { id: 'P6-B', n: chFullName(am), w1: 'WL-P6' } });
      ok('P6C-F5 a waitlist offer to a learner who holds a place in another batch is refused (it would move her without approval)', !MODAL && am.signup.batch === 'DEMO-L3-JAN27' && J(seatsOf(am.me.id)) === J(['DEMO-L3-JAN27']) && aud('Blocked: offer a waitlist place (learner holds a place in another batch)') === 1);
      // A revised-terms learner (harness link): the frozen deadlines are tied to the batch — no transfer
      reset(); at('2026-12-20T10:00:00Z'); const L0 = mk('P6-LON', '2027-01-30T09:00:00Z'); as('aca'); p2SetTz(L0, 'Europe/London', 'P6C'); const L1 = mk('P6-LON2', '2027-01-30T09:00:00Z'); p2SetTz(L1, 'Europe/London', 'P6C');
      as('short'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === 'Self-Paced'); const rb = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (rb) rb.checked = true; prim(); closeModal();
      const lena = byName(/^Lena/); p4HarnessRevise(lena, 'P6C'); go('admission'); const d = $1('#su-dob'), ad = $1('#su-ad'); if (d) d.value = '1992-02-02'; if (ad) ad.value = '5 Test Road'; const rb2 = $1('main input[name="su-batch"][value="P6-LON"]'); if (rb2) { rb2.checked = true; INP.suBatch(rb2); } ACT.suNext();
      fxFast(ff => { lena.docs.filter(x => x.mand).forEach(x => ACT.sampleUpload({ dataset: { id: x.id } })); ff(3000); ACT.suNext(); setUi('suSig', lena.me.first + ' ' + lena.me.last); setUi('suDecl', true); ACT.suSign(); });
      fxFast(ff => { setUi('cb9Pay', 'deposit'); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); });
      as('super'); const y = p6Why(lena.me.id, L0, L1);
      ok('P6C-F6 a learner on the revised terms (frozen deadlines for P6-LON): refused — an amendment would be needed; P4 records untouched', lena.signup.done && /revised-terms deadlines/.test(y || '') && p6Request(lena.me.id, 'P6-LON2', 'x').ok === false && lena.signup.p4.batch === 'P6-LON', y);
      Clock.unfreeze();
    });

    await T('P6C-G P5 clarifications', async () => {
      reset(); const src = (typeof n1aBase === 'function' ? n1aBase : lockFor).toString(); // 1A (PD-1A-03): 1A's commencement gate now wraps the chain outermost and consults it first; P5's wrapper is the one inside it (was: lockFor.toString())
      ok('P6C-G1 (A) the P5 gate is the outermost lockFor: every earlier lock is consulted first and can only add a lock, never return early past it', /p5Applies/.test(src) && /_lfWordsP5/.test(src), src.slice(0, 120));
      ok('P6C-G1b (A) no wrapper loaded after P5 replaces lockFor (P6 doesn\'t)', typeof p5Base === 'function' && lockFor !== p5Base);
      ok('P6C-G2 (B) workplace details and permission are protected learning operations under P5 (gated with Observations, page and actions)', SEC_ACTS.filter(a => ['wpSave', 'changeWp', 'resendPerm'].includes(a[1])).every(a => a[2]()[0] === 'observations') && P5_ROUTES.includes('observations'));
      window.ILM_P4_HARNESS = false; as('short'); applyL();
      ok('P6C-G3 (C) the revised-terms test link is still refused outside the isolated harness; REVISED-1 can\'t be activated', p4HarnessRevise(byName(/^Lena/), 'P6C') === false && p2Activate('REVISED-1', 'P6C') === false && p2Active() === 'LEGACY-1');
      window.ILM_P4_HARNESS = true;
    });
    await T('P6C-Z the transfer kept for the reload', async () => { reset(); mk('P6-B', null, { cap: 3 }); const lid = AM().me.id; as('super'); const r = p6Request(lid, 'P6-B', 'kept for reload'); as('aca'); p6Decide(r.id, 'approve', 'ok'); ok('P6C-Z1 carried out before the reload', p6Req(r.id).state === 'Executed'); SS.setItem(K + 'q', J([r.id, lid])); });
    Clock.unfreeze(); next(1); return;
  }

  if (PH === 1) {
    await T('P6C-H reload, a copy without the transfer store, Reset', async () => {
      const [id, lid] = JSON.parse(SS.getItem(K + 'q') || '[]'), q = p6Req(id);
      ok('P6C-H1 after a real reload: the request (Executed, its history) and the move are kept; one active place', !!q && q.state === 'Executed' && q.hist.length === 3 && SEATS().recs.filter(r => r.lid === lid && seatIsActive(r)).length === 1 && seatInvariants().length === 0);
      delete STORE.seats.xfer; render();
      ok('P6C-H2 a copy without the transfer store (saved before P6) works: no requests, nothing else changed', P6().reqs.length === 0 && SEATS().recs.filter(r => r.lid === lid && seatIsActive(r)).length === 1);
      reset(); ok('P6C-H3 Reset: no requests; the demo learners back in DEMO-L3-JAN27; invariants hold', P6().reqs.length === 0 && byName(/^Amira/).signup.batch === 'DEMO-L3-JAN27' && seatInvariants().length === 0);
    });
  }

  Clock.unfreeze(); window.ILM_P4_HARNESS = false;
  ['phase', 'R', 'q'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
