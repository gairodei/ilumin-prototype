/* ============================================================
   CB9 — Learner payment choice and pinned dated schedules (approved plan section D; PD-CB-58…66 in PROVISIONAL-DECISIONS.md).
   For a programme whose terms are an approved financial package (CB8):
   - Sign-up start: the learner's frozen terms also keep their fee option's approved payment choices, its observation fees, the
     deposit route and the package's duration and rule (w.signup.plan.cb8), by programme ID and plan version.
   - Payment step: the learner chooses one approved payment option (or the deposit route, unchanged, when offered and eligible).
     Every option shows its actual due dates and amounts from the batch start. Payment 1 is due at batch start and collected now at
     checkout (PD-CB-09); on late enrolment, payments already due are due on the enrolment date and collected now as catch-up
     (PD-CB-10). Payment rows come from that schedule; the exact schedule is frozen with the learner (the pin) and never recalculated.
   - Batch start changed, or the learner moved to another batch, before it starts: unpaid dates are revised from the new start (same
     count and amounts), with an append-only revision history, one learner notice and a Finance audit entry (PD-CB-10).
   - Observation fee: one per learner per course (CH-38), priced from the pin by the location of the first confirmed observation;
     £0 creates nothing to pay; a location with no agreed fee raises nothing and is flagged to Finance (PD-CB-62).
   Learners on terms from before packages, deposit-route learners' balance rows, seeded learners and every existing payment or
   fee record are unchanged. Loads after cb-fees.js.
   ============================================================ */
'use strict';

const cb9Iso = ymd => ymd + 'T12:00:00Z'; // a calendar date as a stored due date (the same day in the UK, UAE and India)
const cb9Pin = w => (w && w.signup && w.signup.plan && w.signup.plan.cb8) || null;           // the approved choices, fixed at sign-up start
const cb9Sch = w => (w && w.signup && w.signup.pin) || null;                                 // the dated schedule, fixed at payment
const cb9Pl = w => (w && (w.plans || []).find(p => p.e === 'nvq')) || null;
const cb9Anchor = w => { const b = w && w.signup && chBatch(w.signup.batch); return cbYmdOf((b && b.start) || (w && w.nvq && w.nvq.batchStart)); };
const cb9PayLbl = k => (k === 1 ? 'Pay in full' : `${k} payments`);
const cb9Prov = '<span class="xs muted cb9-prov">(provisional rule, pending client confirmation)</span>';

/* ---------- Sign-up start: the approved choices of the learner's fee option are fixed with their terms ---------- */
const _suStartCB9 = ch8StartSignup;
ch8StartSignup = function (w, pr) {
  const r = _suStartCB9.apply(this, arguments); if (!pr || !w || !w.signup || !w.signup.plan) return r;
  const t = w.signup.plan, p = s4PlanCur(pr.id), pkg = p && p.pkg; if (!pkg || t.issue) return r;
  const want = t.opt ? t.opt.id : null, o = pkg.opts.find(x => x.status === 'Active' && (want ? x.id === want : true));
  if (!o || !o.pay.length) return r; // e.g. the legacy standard option of a programme on old terms: keeps its terms as before
  const cb8 = e1Freeze({ pid: pr.id, planV: p.v, rule: pkg.rule, dur: pkg.dur, dep: pkg.dep, obsReq: pkg.basis.req,
    opt: { id: o.id, label: o.label, mode: o.mode, fee: o.fee, obsWp: o.obsWp, obsOff: o.obsOff, pay: o.pay.map(x => ({ k: x.k, pence: x.pence })) } });
  w.signup.plan = Object.freeze({ ...t, cb8 });
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Approved payment options fixed', '—', `${o.label}: ${o.pay.map(x => cb9PayLbl(x.k).toLowerCase()).join(', ')} · plan v${p.v}`, pr.title);
  return r;
};

/* ---------- The schedule a choice gives this learner now ---------- */
function cb9Plan(w, k) {
  const P = cb9Pin(w), S = cb9Anchor(w), J = cbToday(); if (!P) return { why: 'No approved payment options.' };
  const x = P.opt.pay.find(y => y.k === k); if (!x) return { why: 'Not an approved payment option for your fee option.' };
  const s = cbSched(S, P.dur, P.opt.fee, k); if (s.why) return s;
  const rows = cbLate(s.rows, J).map(r => ({ ...r, collect: r.n === 1 || r.catchUp, early: r.n === 1 && !r.catchUp && r.due > J }));
  return { S, J, k, rows, now: rows.filter(r => r.collect).reduce((a, r) => a + r.pence, 0) / 100, total: s.total, late: rows.some(r => r.catchUp) };
}
const cb9DepOk = w => { const P = cb9Pin(w), b = chBatch(w.signup.batch); return !!P && P.dep.mode !== 'none' && chDepositOk(b) && !w.signup.noDeposit && !(w.signup.plan && w.signup.plan.depOff); };
// The choice: the deposit route, or a payment count (the UI's choice, or a sensible default: the deposit when offered, else the
// option the older "suOpt" names — pay in full / instalments — else the first approved option)
function cb9Choice(w) {
  const P = cb9Pin(w), ks = P.opt.pay.map(x => x.k), depOk = cb9DepOk(w), c = ui('cb9Pay', undefined), so = ui('suOpt', undefined);
  if (c === 'deposit' && depOk) return 'deposit'; if (c != null && ks.includes(+c)) return +c;
  if (so === 'deposit' && depOk) return 'deposit'; if (so === 'full' && ks.includes(1)) return 1;
  if (c == null && so == null && depOk) return 'deposit';
  return ks.find(k => k > 1) || ks[0];
}
const cb9K = w => { const c = cb9Choice(w), ks = cb9Pin(w).opt.pay.map(x => x.k); return c === 'deposit' ? ks.find(k => k > 1) || ks[0] : c; };
const cb9RowsTbl = (pl, cls = '') => `<div class="tbl-wrap"><table class="tbl dense cb9-rows ${cls}"><thead><tr><th>No.</th><th>Due date</th><th class="r">Amount</th><th>When</th></tr></thead><tbody>${pl.rows.map(r => `<tr data-n="${r.n}"><td>${r.n}</td><td class="nowrap">${esc(cbFd(r.due))}</td><td class="r num">${money(r.amount, 'GBP')}</td><td class="small">${r.collect ? `<strong>Collected now</strong>${r.early ? ` — due ${esc(cbFd(r.sched))} (batch start), paid early at checkout` : r.catchUp ? ` — catch-up: was scheduled ${esc(cbFd(r.sched))}` : ''}` : 'Later'}</td></tr>`).join('')}</tbody></table></div>`;

/* ---------- Payment step (step 4) ---------- */
const _stepPayCB9 = chStepPay;
chStepPay = function (w) {
  const base = _stepPayCB9.apply(this, arguments), P = cb9Pin(w); if (!P || chSponsored(w) || !/name="su-opt"/.test(base)) return base; // a full batch, nothing to pay, or older terms
  const b = chBatch(w.signup.batch), depOk = cb9DepOk(w), c = cb9Choice(w), method = ui('suMethod', 'card'), dep = P.dep.eff != null ? P.dep.eff : S4().cfg.deposit;
  const opts = P.opt.pay.map(x => { const s = cb9Plan(w, x.k); return { k: x.k, s }; });
  const sel = c === 'deposit' ? null : opts.find(o => o.k === c), amount = c === 'deposit' ? dep : sel && !sel.s.why ? sel.s.now : 0, ref = chRefOf(w, c === 'deposit' ? 'deposit' : 'instalment');
  return `<section class="card cb9-pay"><h2>4. Payment</h2>${w.signup.moved ? `<div class="note b-blue" role="status">${ic('info')}<div class="small"><strong>Your batch has changed.</strong> ${esc(w.signup.moved.from)} filled before you paid, so you've been assigned <strong>${esc(w.signup.moved.to)}</strong>.</div></div>` : ''}
    <dl class="kv"><dt>Batch</dt><dd>${esc(chBatchLbl(b))} · starts ${esc(cbFd(cb9Anchor(w)))}</dd><dt>Fee option</dt><dd>${esc(P.opt.label)}${P.opt.mode ? ` · ${esc(P.opt.mode)}` : ''}</dd><dt>Programme fee</dt><dd class="num">${money(P.opt.fee, 'GBP')}</dd></dl>
    <p class="small">Payment dates are worked out from your batch start. Payment 1 is due when your batch starts and is <strong>collected now</strong>, at checkout.${opts.some(o => o.s.late) ? ` You're joining after the start, so payments already due are due today and collected now as well (catch-up). ${cb9Prov}` : ''}</p>
    <fieldset class="stack cb9-opts"><legend class="lbl">Choose how you pay</legend>
    ${depOk ? `<label class="check cb9-opt"><input type="radio" name="cb9-pay" value="deposit" ${c === 'deposit' ? 'checked' : ''} data-onchange="cb9Pay"><span><strong>Deposit (holds your seat) — ${money(dep, 'GBP')} now</strong><br><span class="small muted">A separate route: then the ${money(P.opt.fee - dep, 'GBP')} balance within ${chHoldDays()} days, in one go${(w.signup.plan || {}).partial === false ? '' : ' or in parts'}.</span></span></label>`
      : P.dep.mode === 'none' ? E2_NODEP : `<div class="note b-grey ch-nodep">${ic('info')}<div class="small"><strong>${w.signup.noDeposit ? 'Instalments only.' : 'No deposit for this batch.'}</strong> ${w.signup.noDeposit ? 'The deposit option isn\'t offered again for this course.' : `A deposit can only hold a seat when the batch starts in ${CH_HOLD_DAYS} days or more.`}</div></div>`}
    ${opts.map(o => `<label class="check cb9-opt"><input type="radio" name="cb9-pay" value="${o.k}" ${c === o.k ? 'checked' : ''} ${o.s.why ? 'disabled' : ''} data-onchange="cb9Pay"><span><strong>${esc(cb9PayLbl(o.k))} — ${esc(cbAmtTxt(P.opt.fee, o.k))}</strong>${o.s.why ? `<br><span class="small" style="color:var(--red)">${esc(o.s.why)}</span>` : `<br><span class="small muted">${money(o.s.now, 'GBP')} collected now${o.k > 1 ? `, then ${plural(o.s.rows.filter(r => !r.collect).length, 'payment')} on the dates below` : ''}. Total ${money(o.s.total, 'GBP')}.</span>`}</span></label>${c === o.k && !o.s.why ? `<div class="cb9-sched"><h3 class="small">Your payment schedule — ${esc(cb9PayLbl(o.k).toLowerCase())}</h3>${cb9RowsTbl(o.s)}</div>` : ''}`).join('')}</fieldset>
    <fieldset class="stack"><legend class="lbl">Payment method</legend><label class="check"><input type="radio" name="su-m" value="card" ${method === 'card' ? 'checked' : ''} data-onchange="suMethod"><span><strong>Card</strong> <span class="small muted">— pay now on our secure Stripe page</span></span></label><label class="check"><input type="radio" name="su-m" value="bank" ${method === 'bank' ? 'checked' : ''} data-onchange="suMethod"><span><strong>Bank transfer</strong> <span class="small muted">— you start now; Finance confirms your payment</span></span></label></fieldset>
    ${method === 'bank' ? `<div class="note b-blue">${ic('info')}<div class="small"><strong>Pay ${money(amount, 'GBP')} by bank transfer.</strong><br>Pay to: ${chBankHtml(ref)}<br>Reference: <span class="mono">${ref}</span><br>Your payment shows as <strong>Awaiting confirmation by Finance</strong>. You can start learning straight away.</div></div>` : ''}
    <p class="xs muted">Your fee option, payment option, dates and amounts are fixed when you pay. Later price or plan changes don't affect you.</p>
    ${chNav(w, `<button class="btn btn-primary" data-act="suPay">${method === 'card' ? `Pay ${money(amount, 'GBP')} by card` : 'I\'ve made the transfer — start now'}</button>`)}</section>`;
};
INP.cb9Pay = el => { setUi('cb9Pay', el.value); render(); };

/* ---------- Paying: the deposit route as before; otherwise the chosen option's collected-now amount ---------- */
let CB9_PAY = null; // the chosen schedule while the sign-up completes
const _suPayCB9 = ACT.suPay;
ACT.suPay = el => {
  const w = W, P = cb9Pin(w); if (!w || !w.signup || !P || chSponsored(w)) return _suPayCB9(el);
  const b = chBatch(w.signup.batch); if (!chHasPlace(b)) { render(); return; }
  const c = cb9Choice(w); if (c === 'deposit') { setUi('suOpt', 'deposit'); return _suPayCB9(el); }
  const s = cb9Plan(w, c); if (s.why) { toast(s.why, 'err'); return; }
  const method = ui('suMethod', 'card'), opt = 'instalment', ref = chRefOf(w, opt), amount = s.now;
  const done = (fromCo, ref2) => { CB9_PAY = { w, s }; try { chComplete(w, { opt, method, amount, ref: ref2 || ref }, fromCo); } finally { CB9_PAY = null; } };
  w.signup.payIn = c === 1 ? 'full' : 'instalment';
  if (method === 'bank') return done(false);
  const lbl = c === 1 ? 'NVQ fee, paid in full' : `NVQ payment 1${s.rows.filter(r => r.catchUp && r.n > 1).length ? ` with ${plural(s.rows.filter(r => r.catchUp && r.n > 1).length, 'catch-up payment')}` : ''} of ${c}`;
  checkout({ title: `${lbl} — ${w.nvq.title}`, amount, cur: 'GBP', onSuccess: (paid, ref2) => done(true, ref2) });
};
// The learner's payment rows come from the chosen schedule; the schedule is frozen with them (the pin)
const _ccCB9 = chComplete;
chComplete = function (w, o) {
  // (a completion that didn't come through the payment step — a demo shortcut or a direct call — uses the default approved choice, never the old 30-day rows)
  const auto = !(CB9_PAY && CB9_PAY.w === w) && cb9Pin(w) && o && o.opt && o.opt !== 'deposit' && !chSponsored(w) ? cb9Plan(w, cb9K(w)) : null;
  const pay = CB9_PAY && CB9_PAY.w === w ? CB9_PAY : auto && !auto.why ? { w, s: auto } : null, r = _ccCB9.apply(this, arguments); if (!pay || !w.signup.done) return r;
  const P = cb9Pin(w), s = pay.s, pl = cb9Pl(w), bank = o && o.method === 'bank', at = (w.signup.pay && w.signup.pay.at) || now().toISOString(); if (!pl) return r;
  const pin = e1Freeze({ pid: P.pid, planV: P.planV, rule: P.rule, dur: P.dur, optId: P.opt.id, optLabel: P.opt.label, mode: P.opt.mode, fee: P.opt.fee, k: s.k, anchor: s.S, enrolledOn: s.J, at,
    rows: s.rows.map(x => ({ n: x.n, amount: x.amount, pence: x.pence, due: x.due, sched: x.sched, catchUp: x.catchUp, collect: x.collect, early: x.early })), obs: { req: P.obsReq, wp: P.opt.obsWp, off: P.opt.obsOff } });
  let rc = 0;
  pl.rows = pin.rows.map(x => ({ n: x.n, amount: x.amount, due: cb9Iso(x.due), status: x.collect ? (bank ? 'Awaiting confirmation by Finance' : 'Paid') : 'Pending', paid: x.collect && !bank ? x.amount : 0, ...(x.collect && !bank ? { receipt: 'RCP-' + (28000 + +w.me.id.slice(-3) * 10 + rc++) } : {}), sched: cb9Iso(x.sched), ...(x.catchUp ? { catchUp: true } : {}), ...(x.early ? { paidEarly: true } : {}) }));
  Object.assign(pl, { plan: s.k === 1 ? 'One-time payment' : 'Instalments', total: P.opt.fee, pin, revs: [] });
  w.signup.pin = pin; if (w.signup.pay) w.signup.pay.full = s.k === 1;
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Payment schedule fixed', '—', `${P.opt.label} · ${cb9PayLbl(s.k)} · ${pin.rows.map(x => `${money(x.amount, 'GBP')} ${cbFd(x.due)}`).join(', ')} · plan v${P.planV}`, s.late ? 'Late enrolment: catch-up collected at checkout' : 'Payment 1 collected at checkout');
  return r;
};
// A bank transfer at sign-up covers every payment collected then (payment 1 and any catch-up): confirming it confirms them all
const _rpCB9 = recordPayment;
recordPayment = function (t) {
  const r = _rpCB9.apply(this, arguments), w = t && t.v ? STORE.worlds[t.v] : null, pl = cb9Pl(w);
  if (pl && pl.pin && w.signup && w.signup.pay && w.signup.pay.status === 'Paid') pl.rows.forEach(x => { const p = pl.pin.rows.find(y => y.n === x.n); if (p && p.collect && x.status === 'Awaiting confirmation by Finance') Object.assign(x, { status: 'Paid', paid: x.amount }); });
  return r;
};

/* ---------- Batch start changed, or moved to another batch, before it starts: unpaid dates are revised ---------- */
function cb9Revise(w) {
  const pl = cb9Pl(w); if (!pl || !pl.pin) return; const pin = pl.pin, revs = pl.revs = pl.revs || [];
  const from = revs.length ? revs[revs.length - 1].anchor : pin.anchor, to = cb9Anchor(w); if (!cbYmdOk(to) || to === from) return;
  const today = cbToday(), at = now().toISOString(), by = ADMIN && ADMIN.me ? ADMIN.me.name : '—', batch = w.signup.batch;
  if (to <= today) { if (!revs.some(x => x.anchor === to && x.skipped)) revs.push(e1Freeze({ rev: revs.length + 1, at, by, from, anchor: to, batch, skipped: true, why: 'The new start has already passed — dates not revised' })); return; }
  const paid = x => x.status === 'Paid' || x.paid > 0 || x.status === 'Awaiting confirmation by Finance';
  const cur = pl.rows.map(x => ({ n: x.n, amount: x.amount, due: cbYmdOf(x.due), sched: x.sched ? cbYmdOf(x.sched) : cbYmdOf(x.due), status: x.status, paid: x.paid }));
  const red = cbRedate(cur, to, pin.dur, pin.k, pin.enrolledOn, paid); if (red.why) return;
  const ch = red.rows.filter((x, i) => x.due !== cur[i].due);
  pl.rows.forEach((x, i) => { const n = red.rows[i]; if (paid(x) || n.due === cur[i].due) return; x.due = cb9Iso(n.due); x.sched = cb9Iso(n.sched); if (n.catchUp) x.catchUp = true; else delete x.catchUp; });
  const before = ch.map(x => `${x.n}: ${cbFd(cur[x.n - 1].due)}`).join(', '), after = ch.map(x => `${x.n}: ${cbFd(x.due)}`).join(', ');
  revs.push(e1Freeze({ rev: revs.length + 1, at, by, from, anchor: to, batch, rows: ch.map(x => ({ n: x.n, from: cur[x.n - 1].due, to: x.due })) }));
  if (ch.length) {
    notifyLearner(w.v, 'Payments', 'Your payment dates changed', `Your batch now starts ${cbFd(to)}, so your unpaid payment dates have moved: ${after}. The amounts don't change.`, 'payments');
    logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Payment dates revised (batch start changed)', before, after, `Batch start ${cbFd(from)} → ${cbFd(to)} (${batch}); amounts and count unchanged — provisional rule PD-CB-10`);
    e1Notify({ key: `cb9-rev-${w.me.id}-${revs.length}`, to: 'all', t: 'Learner payment dates revised', b: `${chFullName(w)}: batch start ${cbFd(from)} → ${cbFd(to)}; unpaid dates moved (${after}).`, go: 'f-plans' });
  }
}
function cb9Sync() { Object.values(STORE.worlds || {}).forEach(w => { try { cb9Revise(w); } catch (e) { /* never block a render */ } }); }
const _renderCB9 = render;
render = function () { try { if (STORE && STORE.worlds) cb9Sync(); } catch (e) { /* never block a render */ } return _renderCB9.apply(this, arguments); };
// The batch editor's impact preview states what happens to dated schedules
const _impCB9 = s4bImpact;
s4bImpact = function (b) {
  const h = _impCB9.apply(this, arguments), n = Object.values(STORE.worlds || {}).filter(w => w.signup && w.signup.batch === b.code && cb9Sch(w)).length;
  return n ? h + `<p class="small cb9-imp">${ic('info', 14)} ${plural(n, 'learner has', 'learners have')} a dated payment schedule: if the start date changes, their unpaid payment dates move with it (same amounts and count; paid payments unchanged; each is told once). ${cb9Prov}</p>` : h;
};

/* ---------- Observation fee: from the pin, by the location of the first confirmed observation ---------- */
const _feeRaiseCB9 = chFeeRaise;
chFeeRaise = function (lid, course, obsAt, v, quiet) {
  const w = v ? STORE.worlds[v] : null, pin = cb9Sch(w); if (!pin || chFeeOf(lid, course)) return _feeRaiseCB9.apply(this, arguments);
  if (w.cb9Obs) return null; // decided once: no charge, or no fee agreed for that location
  const first = (w.observations || []).filter(o => !o.chPreFee && CH_OBS_DONE.includes(o.status)).sort((a, b) => new Date(a.at) - new Date(b.at))[0];
  const loc = first && first.locType === 'office' ? 'off' : 'wp', locTxt = loc === 'off' ? 'Academy office' : 'workplace', amt = pin.obs[loc], ent = `${chFullName(w)} (${w.me.id})`;
  if (amt == null || amt === 0) {
    w.cb9Obs = { loc, amount: amt, at: obsAt, obs: first ? first.id : null };
    if (amt === 0) logA('Finance', ent, 'Observation fee: no charge', '—', `£0.00 agreed for the ${locTxt} (first confirmed observation, ${fd(obsAt)})`, `Pinned terms: ${pin.optLabel}, plan v${pin.planV}`);
    else { logA('Finance', ent, 'Observation fee not raised', '—', `No fee agreed for the ${locTxt}`, `Pinned terms: ${pin.optLabel}, plan v${pin.planV} — for Finance to review (provisional PD-CB-62)`); e1Notify({ key: 'cb9-obs-' + w.me.id, to: 'all', t: 'Observation fee: no agreed amount', b: `${chFullName(w)}: first observation at the ${locTxt}, which their agreed terms have no fee for. Nothing was raised.`, go: 'f-overdue' }); }
    return null;
  }
  const f = _feeRaiseCB9.call(this, lid, course, obsAt, v, true); if (!f) return f;
  Object.assign(f, { amount: amt, loc, pinned: { pid: pin.pid, planV: pin.planV, optId: pin.optId } });
  if (!quiet) { notifyLearner(v, 'Payments', 'Observation fee due', `${money(f.amount, 'GBP')} for ${course} (${locTxt} observation), due ${fd(f.due)}. One fee covers every observation on this course. Non-refundable.`, 'payments'); logA('Finance', `${f.name} · ${f.id}`, 'Observation fee raised', '—', `${money(f.amount, 'GBP')} due ${fd(f.due)} (${locTxt}, from the learner's agreed terms)`, 'First observation confirmed'); }
  return f;
};

/* ---------- Where the schedule is shown ---------- */
// Learner → Payments: the schedule's origin, and each row's label
const _planCardCB9 = planCard;
planCard = function (pl) {
  let h = _planCardCB9.apply(this, arguments); if (!pl || !pl.pin) return h; const p = pl.pin;
  const note = `<div class="note b-blue cb9-note">${ic('info')}<div class="small"><strong>Your payment schedule</strong> — ${esc(p.optLabel)}, ${esc(cb9PayLbl(p.k).toLowerCase())}, fixed when you paid (plan version ${p.planV}). Dates are from your batch start (${esc(cbFd(p.anchor))}).${(pl.revs || []).some(x => x.rows && x.rows.length) ? ` Your batch start changed, so unpaid dates moved; the amounts didn't.` : ''}</div></div>`;
  h = h.replace('<div class="tbl-wrap">', note + '<div class="tbl-wrap">');
  pl.rows.forEach(r => { const lab = r.paidEarly ? 'Due at batch start — paid early at checkout' : r.catchUp ? `Catch-up — collected at checkout (was scheduled ${fd(r.sched)})` : ''; if (!lab) return; h = h.replace(new RegExp(`(<td class="num">${r.n}</td><td class="r num">[^<]*</td><td class="nowrap">${fd(r.due).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`), `$1<div class="xs muted cb9-lab">${esc(lab)}</div>`); });
  return h;
};
// Finance → Payment Plans → Learner schedules: the pinned terms and their revision history
function cb9PinCard(w) {
  const pl = cb9Pl(w), p = pl && pl.pin; if (!p) return '';
  return `<section class="card cb9-fin"><h3>Agreed payment schedule — fixed at sign-up</h3><dl class="kv"><dt>Fee option</dt><dd>${esc(p.optLabel)} (${esc(p.optId)}) · ${money(p.fee, 'GBP')}</dd><dt>Payment option</dt><dd>${esc(cb9PayLbl(p.k))} · rule ${esc(p.rule)} · plan version ${p.planV}</dd><dt>Batch start (anchor)</dt><dd>${esc(cbFd(p.anchor))}${(pl.revs || []).length ? ` → now ${esc(cbFd(pl.revs[pl.revs.length - 1].anchor))}` : ''}</dd><dt>Enrolled</dt><dd>${esc(cbFd(p.enrolledOn))}${p.rows.some(x => x.catchUp) ? ' — late enrolment: catch-up collected at checkout ' + cb9Prov : ''}</dd><dt>Observation fee</dt><dd>Workplace ${p.obs.wp == null ? 'not applicable' : money(p.obs.wp, 'GBP')} · Academy office ${p.obs.off == null ? 'not applicable' : money(p.obs.off, 'GBP')} — one per course, by the first confirmed observation's location</dd></dl>
    ${cb9RowsTbl({ rows: p.rows }, 'cb9-orig')}
    ${(pl.revs || []).length ? `<h4>Date revisions</h4><ul class="list small">${pl.revs.map(x => `<li class="li"><div class="li-b"><strong>Revision ${x.rev}: batch start ${esc(cbFd(x.from))} → ${esc(cbFd(x.anchor))}</strong><span>${x.skipped ? esc(x.why) : x.rows.length ? x.rows.map(y => `payment ${y.n}: ${cbFd(y.from)} → ${cbFd(y.to)}`).join(' · ') : 'No unpaid dates moved'}</span><span class="xs muted">${fdt(x.at)} · ${esc(x.by)}</span></div></li>`).join('')}</ul>` : ''}
    <p class="xs muted">The original schedule above is kept as agreed; a revision moves unpaid dates only, never amounts.</p></section>`;
}
const _fPlansCB9 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => { const h = _fPlansCB9(p), sel = ui('fpL', 'C'); if ((p.tab || 'schedules') !== 'schedules' || sel.startsWith('od:')) return h; const w = STORE.worlds[sel]; return h + cb9PinCard(w); };
// Admissions → application: the chosen option and schedule
const _appDetailCB9 = appDetail;
appDetail = function (id) {
  const h = _appDetailCB9.apply(this, arguments), w = STORE.worlds[String(id).replace('APP-', '')], p = cb9Sch(w); if (!p) return h;
  const note = `<div class="note b-blue cb9-app">${ic('info')}<div class="small">Payment option: <strong>${esc(cb9PayLbl(p.k))}</strong> — ${p.rows.map(x => `${money(x.amount, 'GBP')} ${cbFd(x.due)}`).join(' · ')} (from batch start ${esc(cbFd(p.anchor))}; plan version ${p.planV}).</div></div>`;
  const k = h.indexOf('<section'); return k < 0 ? h + note : h.slice(0, k) + note + h.slice(k);
};
// The sign-up dialog names each fee option's approved payment choices (instead of the plan's single count)
const _applyCB9 = ACT.applyNvq;
ACT.applyNvq = el => {
  const r = _applyCB9(el), c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), pr = c && c.kind === 'nvq' ? s3Progs().find(p => p.title === c.title) : null, pkg = pr && cb8Cur(pr.id);
  if (!MODAL || !pkg) return r;
  const t = document.createElement('template'); t.innerHTML = MODAL.body;
  const txt = o => `${e2DepOr({ depOff: pkg.dep.mode === 'none', deposit: pkg.dep.eff != null ? pkg.dep.eff : S4().cfg.deposit }, true)}${o.pay.map(x => cb9PayLbl(x.k).toLowerCase()).join(', ')} — payment 1 now, the rest on dates from your batch start.`;
  t.content.querySelectorAll('.r1-pick').forEach(l => { const o = pkg.opts.find(x => x.id === (l.querySelector('input') || {}).value), s = l.querySelector('.xs.muted'); if (o && s) s.textContent = (o.mode ? '' : 'Delivery mode: the mode of the batch you are assigned. ') + txt(o); });
  if (!cbIsL3(pr)) { const o = pkg.opts.find(x => x.status === 'Active'), p = [...t.content.querySelectorAll('p.small.muted')].find(x => /^Price /.test(x.textContent)); if (o && p) p.textContent = `Price ${money(o.fee, 'GBP')} — ${txt(o)}`; }
  MODAL.body = t.innerHTML; renderModal(); return r;
};
// The offer letter's {{payment_terms}} for this applicant: their fee option's approved choices, dated from their batch start
const _payTermsCB9 = e2PayTerms;
e2PayTerms = function (w) {
  const P = cb9Pin(w); if (!P || !w.signup || chSponsored(w)) return _payTermsCB9.apply(this, arguments);
  const x = cb8PayTermsTxt({ dep: P.dep, dur: P.dur }, P.opt, cb9Anchor(w), cb9DepOk(w)); return x || _payTermsCB9.apply(this, arguments);
};

/* ---------- Records ---------- */
UXC.push(['CB9', 'Learner payment choice and pinned dated schedules (21 Oct 2026)', [
  'Sign-up to a programme with an approved financial package: the learner\'s fee option fixes its approved payment choices (by programme ID and plan version). The sign-up dialog lists each option\'s choices.',
  'Step 4 — Payment: the learner chooses one approved payment option (or the deposit route, unchanged, when offered and the batch is 28+ days away). The chosen option shows every payment with its actual due date and amount from the batch start. Payment 1 is due at batch start and is "Collected now" at checkout ("paid early"); a learner joining after the start pays the payments already due as catch-up, collected now (provisional PD-CB-10). Card and bank transfer as before; a bank transfer confirmed by Finance confirms every payment collected then.',
  'The fee option, amount, payment option, count, dates, amounts, plan version and both observation fees are frozen with the learner (the pin); payment rows come from it. New Finance changes never rewrite them. Batch start changed (or the learner moved) before the batch starts: unpaid dates move with the new start; amounts and count never change; each change is a revision kept with the schedule, audited, with one learner notice and a Finance notification (provisional).',
  'Observation fee: one per course, priced from the learner\'s agreed terms by the location of the first confirmed observation (workplace or Academy office); £0 raises nothing; a location without an agreed fee raises nothing and is flagged to Finance. Existing fee records, the waiver workflow and learners on older terms are unchanged.',
  'Shown to the learner (Payments: the schedule\'s origin and row labels), Finance (Payment Plans → Learner schedules: the agreed schedule and its revisions) and Admissions (the application). The offer letter\'s {{payment_terms}} uses the applicant\'s own choices and dates.']]);
const _aIdxCB9 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB9(p) + `<section class="card idx-sec"><h2>CB9 — Pinned dated schedules</h2><ul class="idx-list">${[
  chIdxLi('Finance → Payment Plans → Learner schedules', { act: 'aJump', t: 'f-plans' }, 'CB9 — a learner\'s agreed schedule and its date revisions.')].join('')}</ul></section>`;
