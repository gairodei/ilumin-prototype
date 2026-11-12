/* ============================================================
   P9 — Agency finance arrangements and sponsored learner access (13 Nov 2026; PD-P9-* in PROVISIONAL-DECISIONS.md; PD-P0-10,
   11, 14, 16 in P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p8-reservations.js.
   Kept apart — never interchangeable: the obligation (an agency invoice purchase Finance approved, awaiting payment), the
   approved arrangement (one versioned record per obligation, P9().arr), money actually received (a Finance ledger row, STORE.fin.tx,
   only when Finance verifies a receipt), settlement (the allocations on the arrangement), entitlement authorisation (P7's ledger:
   a purchase entry marked arrangement-backed), batch places (P1 / P8) and learning access (the P5 decision, extended here).
   - Arrangement types: a deferred single payment (one amount, one date) or structured instalments (two or more). Amounts in
     integer pence; the schedule totals the obligation's verified remaining balance exactly; dates explicit, in order, distinct,
     not in the past; GBP only (no conversion). No default counts, durations, grace periods, interest or penalties.
   - States: Pending Finance Approval → Active (approved) / Refused / Changes Requested (resubmitted → Pending) / Invalidated (the
     obligation changed before a decision); Active ⇄ Overdue (derived from the schedule and verified payments on Finance's clock);
     Active / Overdue → Satisfied (fully paid) or Superseded (a revised schedule approved). History is never erased.
   - Approval: a Finance Admin who didn't request it (active, admin portal); the Super Administrator by an audited override;
     nobody else. Approval authorises the invoice's entitlements once (a bundle and one P7 purchase entry — arrangement-backed, not
     a payment). It reserves no place: the agency still reserves (P8) and P1 / P7 still decide capacity and entitlement.
   - Payments: Finance records each verified receipt once (reference unique); allocated oldest instalment first in pence; a surplus,
     a duplicate reference, another agency's or another obligation's receipt opens a Finance review — nothing is refunded,
     credited or moved automatically.
   - Overdue: an instalment unpaid after its due date (Europe/London, Finance's simulated date) is recorded once, the agency and
     Finance are told in-app, and a Finance review opens. Nothing else happens automatically: no suspension, cancellation, release,
     forfeiture, refund, interest or penalty; the schedule stays.
   - Sponsored access: learners confirmed through the P8 agency workflow get their programme in their own account; their learning
     opens only with a confirmed enrolment, its batch and P1 seat, the P7 consumption, Finance clearance (verified payment or an
     approved arrangement) and a commenced batch (P5's resolver; indeterminate blocks). Historical sponsored learners are unchanged.
   Browser-only: production enforces all of this on the server.
   ============================================================ */
'use strict';

const P9_RULE = 'P9-ARR-1', P9_ACC = 'P9-ACCESS-1', P9_TZ = 'Europe/London';
const P9_PEND = 'Pending Finance Approval', P9_CHG = 'Changes Requested';
const P9_LIVE = ['Active', 'Overdue'], P9_AUTH = ['Active', 'Overdue', 'Satisfied'];
const P9_INV = 'Agency invoice (offline) purchase';
const P9 = () => { const G = STORE.agy; if (!G.p9 || G.p9.v !== 1) G.p9 = { v: 1, seq: 0, lseq: 0, arr: [], keys: {}, xseq: 0, exc: [], rseq: 0, rev: [], sent: {} }; return G.p9; };
const p9Arr = id => P9().arr.find(a => a.id === id) || null;
const p9Inv = id => (ADMIN.queue || []).find(i => i.id === id && i.type === P9_INV) || null;
const p9Line = line => P9().arr.filter(a => a.line === line);
const p9Gov = invId => P9().arr.find(a => a.inv === invId && P9_AUTH.includes(a.state)) || null;      // the one governing version
const p9OpenReq = invId => P9().arr.find(a => a.inv === invId && [P9_PEND, P9_CHG].includes(a.state)) || null;
const p9M = m => money((m | 0) / 100, 'GBP');
const p9Today = () => ymdIn(dpNow().toISOString(), P9_TZ);                                             // Finance's date (P2 clock)
const p9Paid = invId => P9().arr.filter(a => a.inv === invId).reduce((s, a) => s + a.pays.reduce((t, p) => t + p.alloc.reduce((u, x) => u + x.minor, 0), 0), 0);
const p9Who = () => p7Who();
const p9H = (a, what, why, by, x = {}) => a.hist.push({ at: now().toISOString(), what, by: by || p9Who().name, why: why || '', ...x });
const p9Active = () => { const s = (ADMIN.staff || []).find(x => x.id === (ADMIN.me || {}).id); return !s || s.status === 'Active'; };
const p9IsFinAdmin = () => S.portal === 'admin' && typeof isFin === 'function' && isFin() && !isSA() && p9Active();
const p9FinNote = (t, b) => { if (STORE.fin && STORE.fin.notifs) STORE.fin.notifs.unshift({ to: 'all', t, b, at: now().toISOString(), go: 'f-agyarr', unread: true }); };

/* ---------- The obligation: an agency invoice purchase Finance approved, awaiting payment ---------- */
function p9Ob(i) {
  const amountMinor = Math.round(Number(i.amount) * 100), paidMinor = p9Paid(i.id);
  return { inv: i.id, agency: (i.data || {}).agency || i.raisedBy, cur: i.cur || 'GBP', amountMinor, paidMinor, remaining: amountMinor - paidMinor, seats: (i.data || {}).seats | 0, stage: i.stage || null, status: i.status, portal: !!(i.data || {}).portal, courses: ((i.data || {}).courses || []).slice() };
}
function p9ObWhy(i) {
  if (!i) return 'That invoice purchase is not on record.';
  const d = i.data || {};
  if (!d.portal) return `${i.id} is a historical invoice that isn't a portal bundle purchase — its bundle can't be identified, so no arrangement can cover it.`;
  if (i.stage === 'paid') return `${i.id} is already paid.`;
  if (i.stage !== 'awaiting') return `${i.id} isn't a purchase Finance approved and is awaiting payment (${i.status}).`;
  if (!(d.seats > 0) || !(Number(i.amount) > 0)) return `${i.id} has no amount or seats to cover.`;
  if ((i.cur || 'GBP') !== 'GBP') return `${i.id} isn't in GBP — currency conversion isn't supported.`;
  if (p9Ob(i).remaining <= 0) return `Nothing is outstanding on ${i.id}.`;
  return '';
}
const p9Basis = ob => ({ amountMinor: ob.amountMinor, paidMinor: ob.paidMinor, seats: ob.seats, stage: ob.stage });
const p9SameBasis = (a, b) => a.amountMinor === b.amountMinor && a.paidMinor === b.paidMinor && a.seats === b.seats && a.stage === b.stage;

/* ---------- The schedule ---------- */
function p9SchedWhy(type, rows, total, cur) {
  if (cur && cur !== 'GBP') return 'Only GBP is supported (the invoice currency) — no conversion.';
  if (!['deferred', 'instalments'].includes(type)) return 'Choose a deferred single payment or structured instalments.';
  if (!Array.isArray(rows) || !rows.length) return 'Enter the payment schedule.';
  if (type === 'deferred' && rows.length !== 1) return 'A deferred single payment has exactly one amount and one due date.';
  if (type === 'instalments' && rows.length < 2) return 'Structured instalments have two or more amounts and due dates.';
  for (const r of rows) {
    if (!r || !ymdOk(r.due)) return 'Enter each due date as YYYY-MM-DD.';
    if (!Number.isInteger(r.minor) || r.minor <= 0) return 'Each amount must be a positive whole number of pence (no zero or negative amounts).';
  }
  const t = p9Today();
  for (let k = 0; k < rows.length; k++) {
    if (rows[k].due < t) return `${rows[k].due} is in the past (Finance's date is ${t}).`;
    if (k && rows[k].due === rows[k - 1].due) return `Two instalments are due on ${rows[k].due} — each instalment needs its own date.`;
    if (k && rows[k].due < rows[k - 1].due) return 'Put the due dates in order, earliest first.';
  }
  const sum = rows.reduce((s, r) => s + r.minor, 0);
  if (sum !== total) return `The schedule totals ${p9M(sum)}; it must equal the outstanding balance ${p9M(total)} exactly.`;
  return '';
}

/* ---------- Request (the agency for its own invoice, or a Finance Admin on its behalf) ---------- */
function p9Request(invId, o = {}) {
  const i = p9Inv(invId), who = p9Who(), ag = i ? (i.data || {}).agency : null;
  const deny = S.portal === 'agency' ? (i && ag === AGN() ? '' : 'That invoice belongs to another agency.') : S.portal === 'admin' && typeof fiFin === 'function' && fiFin() ? '' : 'Only the agency (for its own invoice) or a Finance Admin can request a payment arrangement.';
  if (deny) { logA('Finance', invId || '—', 'Blocked: request payment arrangement', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  const X = P9(); if (o.key && X.keys[o.key]) return { ok: true, dup: true, id: X.keys[o.key] };
  const ow = p9ObWhy(i); if (ow) return { ok: false, why: ow };
  if (p9OpenReq(i.id)) return { ok: false, why: `A request for ${i.id} is already waiting for Finance (${p9OpenReq(i.id).id}).` };
  if (!String(o.why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const ob = p9Ob(i), rows = (o.rows || []).map(r => ({ due: String((r || {}).due || '').trim(), minor: (r || {}).minor }));
  const sw = p9SchedWhy(o.type, rows, ob.remaining, o.cur); if (sw) { logA('Finance', i.id, 'Blocked: request payment arrangement', '—', 'No change', sw); return { ok: false, why: sw }; }
  const gov = p9Gov(i.id), id = 'ARR-' + String(++X.seq).padStart(4, '0'), line = gov ? gov.line : 'ARL-' + String(++X.lseq).padStart(4, '0'), at = now().toISOString();
  const a = { id, line, ver: p9Line(line).length + 1, supersedes: gov ? gov.id : null, agency: ob.agency, agencyId: p7AgId(ob.agency), inv: i.id, cur: 'GBP', type: o.type, totalMinor: ob.remaining, obMinor: ob.amountMinor, paidBefore: ob.paidMinor, seats: ob.seats, courses: ob.courses,
    sched: rows.map((r, k) => ({ id: `${id}-I${k + 1}`, n: k + 1, due: r.due, minor: r.minor, paid: 0 })), state: P9_PEND, by: who, at, why: String(o.why).trim(), basis: p9Basis(ob), rev: 1, dec: null, hist: [], pays: [], overdue: {}, bundle: gov ? gov.bundle : null, rule: P9_RULE };
  p9H(a, gov ? `Revised schedule requested (supersedes ${gov.id} if approved)` : 'Requested', a.why, who.name, { role: who.role });
  X.arr.unshift(a); if (o.key) X.keys[o.key] = id;
  logA('Finance', `${i.id} · ${ob.agency}`, gov ? 'Payment arrangement revision requested' : 'Payment arrangement requested', '—', `${id}: ${o.type === 'deferred' ? 'deferred single payment' : rows.length + ' instalments'} · ${p9M(a.totalMinor)}`, a.why);
  p9FinNote('Payment arrangement to decide', `${ob.agency} · ${i.id} · ${p9M(a.totalMinor)} (${id})`);
  if (S.portal !== 'agency') agyNotify('Payment arrangement requested', `${id} for ${i.id} (${p9M(a.totalMinor)}) was requested by the Academy's Finance team for your approval record. Finance decides it.`, 'g-purchase.' + i.id, 'Purchases', ob.agency);
  return { ok: true, id, rec: a };
}
// After "Changes Requested": the requester's side resubmits a corrected schedule (the same record; the earlier schedule is kept in history)
function p9Resubmit(id, o = {}) {
  const a = p9Arr(id), i = a && p9Inv(a.inv);
  const deny = !a ? 'That arrangement doesn\'t exist.' : S.portal === 'agency' ? (a.agency === AGN() ? '' : 'That arrangement belongs to another agency.') : S.portal === 'admin' && fiFin() ? '' : 'Only the agency or a Finance Admin can resubmit.';
  if (deny) { logA('Finance', id || '—', 'Blocked: resubmit payment arrangement', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (a.state !== P9_CHG) return { ok: false, why: `${a.id} is ${a.state.toLowerCase()} — only an arrangement returned for changes can be resubmitted.` };
  const ow = p9ObWhy(i); if (ow) return { ok: false, why: ow };
  if (!String(o.why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const ob = p9Ob(i), rows = (o.rows || []).map(r => ({ due: String((r || {}).due || '').trim(), minor: (r || {}).minor })), sw = p9SchedWhy(o.type || a.type, rows, ob.remaining, o.cur);
  if (sw) return { ok: false, why: sw };
  p9H(a, 'Resubmitted with a corrected schedule', String(o.why).trim(), p9Who().name, { prevSched: a.sched.map(r => ({ due: r.due, minor: r.minor })), prevType: a.type });
  a.type = o.type || a.type; a.totalMinor = ob.remaining; a.sched = rows.map((r, k) => ({ id: `${a.id}-I${k + 1}`, n: k + 1, due: r.due, minor: r.minor, paid: 0 })); a.basis = p9Basis(ob); a.state = P9_PEND; a.rev++;
  logA('Finance', `${a.inv} · ${a.agency}`, 'Payment arrangement resubmitted', P9_CHG, P9_PEND, String(o.why).trim());
  p9FinNote('Payment arrangement resubmitted', `${a.agency} · ${a.inv} (${a.id})`);
  return { ok: true, id: a.id };
}

/* ---------- Finance decision (no self-approval; Super Administrator override audited) ---------- */
function p9Decide(id, verb, why, seen) {
  const a = p9Arr(id), me = p9Who();
  const over = verb === 'override' || (isSA() && verb === 'approve');
  const deny = !a ? 'That arrangement doesn\'t exist.' : S.portal !== 'admin' ? 'Payment arrangements are decided by Finance in the admin console.'
    : over ? (isSA() ? (a.by && a.by.name === me.name ? 'You requested this arrangement — someone else decides it (no self-approval).' : '') : 'Only the Super Administrator can override.')
    : !p9IsFinAdmin() ? 'Only an active Finance Admin decides payment arrangements (or the Super Administrator by override).'
    : a.by && a.by.name === me.name ? 'You requested this arrangement — another Finance Admin decides it (no self-approval).' : '';
  if (deny) { logA('Finance', a ? `${a.inv} · ${a.id}` : id || '—', `Blocked: ${verb} payment arrangement`, a ? a.state : '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (a.state !== P9_PEND) { logA('Finance', `${a.inv} · ${a.id}`, `Blocked: ${verb} payment arrangement (already decided)`, a.state, 'No change', a.id); return { ok: false, why: `${a.id} is already ${a.state.toLowerCase()} — nothing changed.`, dup: true }; }
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  if (seen != null && seen !== a.rev) return { ok: false, why: `${a.id} changed since you opened it — open it again to see the current schedule. Nothing was decided.`, stale: true };
  const at = now().toISOString(), w = String(why).trim(), kind = verb === 'refuse' ? 'refuse' : verb === 'changes' ? 'changes' : over ? 'override' : 'approve';
  if (kind === 'refuse' || kind === 'changes') {
    a.state = kind === 'refuse' ? 'Refused' : P9_CHG; a.dec = { at, by: me.name, role: me.role, why: w, kind };
    p9H(a, kind === 'refuse' ? 'Refused' : 'Changes requested', w, me.name, { role: me.role });
    logA('Finance', `${a.inv} · ${a.id}`, kind === 'refuse' ? 'Payment arrangement refused' : 'Payment arrangement returned for changes', P9_PEND, a.state, w);
    agyNotify(kind === 'refuse' ? 'Payment arrangement refused' : 'Payment arrangement — changes requested', `${a.id} for ${a.inv}: ${w}`, 'g-purchase.' + a.inv, 'Purchases', a.agency);
    return { ok: true, state: a.state };
  }
  // Approval re-checks the obligation: a changed amount, payment, seat count or invoice state makes the request stale
  const i = p9Inv(a.inv), ow = p9ObWhy(i), ob = i && p9Ob(i), gov = p9Gov(a.inv);
  const stale = ow || (!p9SameBasis(a.basis, p9Basis(ob)) ? `The obligation changed since the request (${p9M(a.basis.amountMinor - a.basis.paidMinor)} outstanding then, ${p9M(ob.remaining)} now)` : '') || ((gov ? gov.id : null) !== a.supersedes ? `The governing arrangement changed since the request (${a.supersedes || 'none'} → ${gov ? gov.id : 'none'})` : '') || (ob.agency !== a.agency ? 'The invoice belongs to another agency' : '');
  if (stale) { a.state = 'Invalidated'; a.dec = { at, by: me.name, role: me.role, why: stale, kind: 'invalid' }; p9H(a, 'Invalidated (stale)', stale, me.name); logA('Finance', `${a.inv} · ${a.id}`, 'Payment arrangement not approved (obligation changed)', P9_PEND, 'Invalidated', stale); return { ok: false, why: stale + ' — nothing was approved; a new request is needed.', state: a.state }; }
  a.state = 'Active'; a.dec = { at, by: me.name, role: me.role, why: w, kind }; a.approvedAt = at;
  p9H(a, kind === 'override' ? 'Approved by Super Administrator override' : 'Approved', w, me.name, { role: me.role }); p9H(a, 'Active', `Governs ${a.inv}: ${p9M(a.totalMinor)} in ${a.sched.length} payment${a.sched.length === 1 ? '' : 's'}`, 'System');
  if (gov) { gov.state = 'Superseded'; gov.supersededBy = a.id; p9H(gov, 'Superseded', `Replaced by ${a.id} (approved ${fd(at)})`, me.name); a.bundle = gov.bundle; logA('Finance', `${a.inv} · ${a.line}`, 'Payment schedule revised', gov.id, a.id, w); }
  logA('Finance', `${a.inv} · ${a.agency}`, kind === 'override' ? 'Payment arrangement approved (Super Administrator override)' : 'Payment arrangement approved', P9_PEND, `Active — ${a.id}`, w);
  if (!a.bundle) p9Authorise(a, i);
  agyNotify('Payment arrangement approved', `${a.id} for ${a.inv}: ${a.sched.map(r => `${p9M(r.minor)} by ${fd(r.due + 'T12:00:00Z')}`).join(', ')}.${gov ? ` It replaces ${gov.id}.` : ` ${a.seats} entitlements are available in your bundle; places are reserved separately.`}`, a.bundle ? 'g-bundle.' + a.bundle : 'g-purchase.' + a.inv, 'Purchases', a.agency);
  return { ok: true, state: a.state, bundle: a.bundle };
}
// The invoice's entitlements, authorised once by the approved arrangement: a bundle and one P7 purchase entry (not a payment)
function p9Authorise(a, i) {
  const d = i.data, at = now().toISOString(); let cat = null; try { cat = AGY_CATALOGUE().find(c => c.id === d.catId) || null; } catch (e) { cat = null; }
  const days = (cat && cat.days) || 365; let n = 20 + ADMIN.bundles.length; while (ADMIN.bundles.some(x => x.id === 'BN-' + n)) n++;
  const b = { id: 'BN-' + n, name: d.bundle, agency: d.agency, courses: d.courses || (cat && cat.courses) || [d.bundle], seats: d.seats, used: 0, from: at, validity: new Date(now().getTime() + days * DAY).toISOString(), mode: d.priceMode || 'Automatic', price: i.amount, cur: i.cur || 'GBP', avail: 'Specific agencies', status: 'Active', p9: a.line, inv: i.id };
  const X7 = P7(); X7.mig[b.id] = { at, raw: 0, seats: b.seats, p9: a.line };
  const e = p7Entry(b, 'purchase', b.seats, { src: a.id, pay: null, eff: at, by: p9Who().name, why: `Authorised by approved payment arrangement ${a.id} for invoice ${i.id} (unpaid at authorisation — not a payment)` });
  e.backing = 'arrangement'; e.arr = a.line; e.inv = i.id;
  ADMIN.bundles.push(b); d.bundleId = b.id; d.p9 = a.line; a.bundle = b.id;
  STORE.agy.ledger.push({ bundle: b.id, agency: b.agency, at, type: 'Authorised', qty: b.seats, learner: '—', ref: `Arrangement ${a.id} (invoice ${i.id}, not yet paid)` });
  logA('Bundles & Licences', `${b.id} · ${b.agency}`, 'Entitlements authorised (payment arrangement)', '—', `${b.seats} entitlements — ${a.id}`, `Invoice ${i.id} stays unpaid (${p9M(a.totalMinor)} due under the arrangement); no receipt recorded`);
  p8Bind(b); return b;
}

/* ---------- Verified receipts: allocation in pence; anything that doesn't match goes to Finance review ---------- */
function p9Exc(kind, o) {
  const X = P9(), x = { id: 'AX-' + String(++X.xseq).padStart(4, '0'), kind, agency: o.agency || null, inv: o.inv || null, arr: o.arr || null, ref: o.ref || null, minor: o.minor | 0, why: o.why, state: 'Finance review', at: now().toISOString(), by: p9Who().name, hist: [] };
  x.hist.push({ at: x.at, what: 'Opened', by: x.by, why: o.why }); X.exc.unshift(x);
  logA('Finance', `${x.ref || '—'} · ${x.inv || '—'}`, 'Finance review opened (agency payment exception)', '—', `${x.id}: ${kind}`, `${o.why} — nothing was allocated, refunded, credited or moved`);
  p9FinNote('Agency payment needs Finance review', `${x.id}: ${kind} · ${x.ref || '—'} · ${p9M(x.minor)}`);
  return x;
}
function p9Pay(target, o = {}) {
  const a = p9Arr(target) || p9Gov(target) || (P9().arr.find(x => x.line === target && P9_AUTH.includes(x.state)) || null), me = p9Who();
  const deny = S.portal !== 'admin' || typeof fiFin !== 'function' || !fiFin() ? 'Only a Finance Admin (or the Super Administrator) records a verified agency payment.' : '';
  if (deny) { logA('Finance', target || '—', 'Blocked: record agency payment', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  const ref = String(o.ref || '').trim(), minor = o.minor, why = String(o.why || '').trim();
  if (!ref) return { ok: false, why: 'Enter the payment reference.' };
  if (!Number.isInteger(minor) || minor <= 0) return { ok: false, why: 'Enter the amount received as a positive whole number of pence.' };
  if (!ymdOk(o.received || '') || o.received > p9Today()) return { ok: false, why: 'Enter the date the money was received (YYYY-MM-DD, not in the future).' };
  if (!why) return { ok: false, why: 'Enter a note.' };
  const used = typeof fiRefTaken === 'function' && fiRefTaken(ref) || P9().arr.some(x => x.pays.some(p => p.ref === ref)) || P9().exc.some(x => x.ref === ref);
  if (used) { const x = p9Exc('Duplicate reference', { agency: o.payer || (a && a.agency), inv: a && a.inv, arr: a && a.id, ref: ref + ' (repeat)', minor, why: `${ref} is already recorded — a repeated confirmation settles nothing` }); return { ok: false, why: `${ref} is already recorded. Nothing was settled twice; ${x.id} is open for Finance review.`, exc: x.id, dup: true }; }
  if (!a || !P9_LIVE.includes(a.state)) { const x = p9Exc('No matching obligation', { agency: o.payer || null, inv: o.inv || (a && a.inv), arr: a && a.id, ref, minor, why: `No active arrangement to allocate ${ref} to${a ? ` (${a.id} is ${a.state})` : ''}` }); return { ok: false, why: `There is no active arrangement to allocate this payment to. ${x.id} is open for Finance review.`, exc: x.id }; }
  if (o.payer && o.payer !== a.agency) { const x = p9Exc('Wrong agency', { agency: o.payer, inv: a.inv, arr: a.id, ref, minor, why: `${o.payer} paid against ${a.agency}'s obligation ${a.inv}` }); return { ok: false, why: `The payer (${o.payer}) isn't the agency that owes ${a.inv}. ${x.id} is open for Finance review — nothing was allocated or moved.`, exc: x.id }; }
  if (o.inv && o.inv !== a.inv) { const x = p9Exc('Wrong obligation', { agency: a.agency, inv: o.inv, arr: a.id, ref, minor, why: `${ref} quotes ${o.inv}, not ${a.inv}` }); return { ok: false, why: `${ref} quotes ${o.inv}, not ${a.inv}. ${x.id} is open for Finance review — nothing was allocated.`, exc: x.id }; }
  const at = now().toISOString(), out = Math.max(0, a.sched.reduce((s, r) => s + r.minor - r.paid, 0)); let left = Math.min(minor, out); const alloc = [];
  a.sched.forEach(r => { if (left <= 0) return; const take = Math.min(left, r.minor - r.paid); if (take > 0) { r.paid += take; left -= take; alloc.push({ inst: r.id, minor: take }); } });
  const over = minor - alloc.reduce((s, x) => s + x.minor, 0);
  STORE.fin.tx.unshift({ at, received: o.received, ref, gref: '—', receipt: 'RCP-' + ref.slice(-5), payer: a.agency, payerType: 'Agency', course: `Invoice ${a.inv} — arrangement ${a.id}`, amount: minor / 100, cur: 'GBP', mode: 'Bank transfer', status: 'Paid', by: me.name, fin: true, p9: a.id });
  a.pays.push({ ref, minor, alloc, over, received: o.received, verified: at, by: me.name, why });
  p9H(a, 'Payment verified', `${ref}: ${p9M(minor)} received ${o.received}`, me.name, { ref }); p9H(a, 'Payment allocated', alloc.map(x => `${x.inst} ${p9M(x.minor)}`).join(', ') + (over ? `; ${p9M(over)} unallocated (Finance review)` : ''), me.name, { ref });
  logA('Finance', `${a.inv} · ${a.agency}`, 'Agency payment verified', '—', `${ref} · ${p9M(minor)} (received ${o.received})`, why);
  logA('Finance', `${a.inv} · ${a.id}`, 'Agency payment allocated', p9M(out), p9M(out - (minor - over)), alloc.map(x => `${x.inst} ${p9M(x.minor)}`).join(', ') || 'nothing outstanding');
  let exc = null; if (over > 0) exc = p9Exc('Overpayment', { agency: a.agency, inv: a.inv, arr: a.id, ref, minor: over, why: `${p9M(over)} of ${ref} is more than was outstanding — held unallocated for Finance review (no refund or credit applied)` });
  const rest = out - (minor - over);
  if (rest === 0) p9Satisfy(a); else p9Overdue(a);
  agyNotify('Payment received', `${p9M(minor - over)} received for ${a.inv} (${ref}). ${rest ? `${p9M(rest)} still due under ${a.id}.` : 'Paid in full.'}`, 'g-purchase.' + a.inv, 'Purchases', a.agency);
  return { ok: true, alloc, over, outstanding: rest, exc: exc && exc.id };
}
function p9Satisfy(a) {
  if (a.state === 'Satisfied') return; const was = a.state, i = p9Inv(a.inv), at = now().toISOString(); a.state = 'Satisfied'; a.satisfied = at;
  p9H(a, 'Satisfied', `Paid in full (${a.pays.map(p => p.ref).join(', ')})`, 'System');
  if (i) { i.stage = 'paid'; i.status = 'Paid/Processed'; i.decision = `Paid in full under arrangement ${a.id} (${a.pays.map(p => p.ref).join(', ')}).`; i.history.push([p9Who().name, at, 'Payment recorded', `Settled under ${a.id}`]); }
  logA('Finance', `${a.inv} · ${a.agency}`, 'Payment arrangement satisfied', was, 'Satisfied', `Paid in full — the invoice is now paid; the entitlements were authorised at approval (not credited again)`);
}
const p9ExcResolve = (id, why) => {
  const x = P9().exc.find(e => e.id === id), me = p9Who();
  const deny = !x ? 'That review doesn\'t exist.' : S.portal !== 'admin' || !fiFin() ? 'Only Finance resolves payment exceptions.' : '';
  if (deny) { logA('Finance', id || '—', 'Blocked: resolve payment exception', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (x.state !== 'Finance review') return { ok: false, why: `${x.id} is already ${x.state.toLowerCase()} — nothing changed.`, dup: true };
  if (!String(why || '').trim()) return { ok: false, why: 'Enter what Finance decided.' };
  x.state = 'Resolved'; x.hist.push({ at: now().toISOString(), what: 'Resolved', by: me.name, why: String(why).trim() });
  logA('Finance', `${x.ref || '—'} · ${x.inv || '—'}`, 'Finance review closed (agency payment exception)', 'Finance review', 'Resolved', `${String(why).trim()} — recorded only: no automatic refund, credit or transfer`);
  return { ok: true };
};

/* ---------- Overdue: detected on Finance's clock, recorded once, reviewed by Finance; nothing automatic ---------- */
const p9DueGone = r => dpNow().getTime() >= dayStart(ymdAdd(r.due, 1), P9_TZ); // unpaid after the whole due date (London)
function p9Overdue(a) {
  if (!P9_LIVE.includes(a.state)) return;
  const late = a.sched.filter(r => r.paid < r.minor && p9DueGone(r)), X = P9();
  late.forEach(r => {
    const k = `${a.id}|${r.id}`; if (X.sent[k]) return; const owe = r.minor - r.paid, at = now().toISOString();
    X.sent[k] = { at, owe }; a.overdue[r.id] = { at, owe, due: r.due };
    p9H(a, 'Instalment overdue', `${r.id}: ${p9M(owe)} due ${r.due} not received`, 'System', { inst: r.id });
    logA('Finance', `${a.inv} · ${a.agency}`, 'Agency payment overdue', `Due ${r.due}`, `${p9M(owe)} outstanding`, `${a.id} · ${r.id} — the schedule stays; no automatic suspension, cancellation, release, forfeiture, refund or charge`);
    agyNotify('Payment overdue', `${p9M(owe)} for ${a.inv} was due on ${fd(r.due + 'T12:00:00Z')} (${a.id}, instalment ${r.n}). Please pay quoting ${a.inv}. Your learners' access is not changed by this notice.`, 'g-purchase.' + a.inv, 'Purchases', a.agency);
    p9FinNote('Agency payment overdue', `${a.agency} · ${a.inv} · instalment ${r.n} · ${p9M(owe)} (${a.id})`);
    p9ReviewOpen(a, r);
  });
  const now0 = a.sched.some(r => r.paid < r.minor && p9DueGone(r));
  if (now0 && a.state === 'Active') { a.state = 'Overdue'; p9H(a, 'Overdue', 'An instalment is unpaid after its due date', 'System'); }
  if (!now0 && a.state === 'Overdue') { a.state = 'Active'; p9H(a, 'Overdue cleared', 'Every instalment due so far is paid', 'System'); logA('Finance', `${a.inv} · ${a.id}`, 'Agency payment no longer overdue', 'Overdue', 'Active', 'Every instalment due so far is paid'); }
}
// Learners the review concerns: the confirmed enrolments that used this bundle's entitlements
const p9Learners = a => { const b = (ADMIN.bundles || []).find(x => x.id === a.bundle); return b ? P7().recs.filter(r => r.bundle === b.id && r.type === 'consume' && !r.returned).map(r => ({ lid: r.lid, ref: r.ref, enrol: r.enrol || null })) : []; };
function p9ReviewOpen(a, r) {
  const X = P9(); let v = X.rev.find(x => x.line === a.line && x.state === 'Open');
  if (v) { if (!v.insts.includes(r.id)) { v.insts.push(r.id); v.hist.push({ at: now().toISOString(), what: 'Another instalment overdue', by: 'System', why: `${r.id} (${p9M(r.minor - r.paid)})` }); } return v; }
  v = { id: 'FR-' + String(++X.rseq).padStart(4, '0'), line: a.line, arr: a.id, agency: a.agency, inv: a.inv, insts: [r.id], learners: p9Learners(a), reason: `${a.agency}: ${p9M(r.minor - r.paid)} due ${r.due} under ${a.id} not received`, state: 'Open', opened: now().toISOString(), dec: [], hist: [] };
  v.hist.push({ at: v.opened, what: 'Opened', by: 'System', why: v.reason }); X.rev.unshift(v);
  logA('Finance', `${a.inv} · ${a.agency}`, 'Finance review opened (agency overdue)', '—', v.id, `${v.reason}; ${v.learners.length} sponsored learner${v.learners.length === 1 ? '' : 's'} listed — their access is unchanged`);
  return v;
}
const P9_KEEP = 'No change to learner access — the client hasn\'t defined a suspension or reinstatement rule for agency arrears (open policy)';
function p9ReviewDecide(id, verb, why) {
  const v = P9().rev.find(x => x.id === id), me = p9Who();
  const deny = !v ? 'That review doesn\'t exist.' : S.portal !== 'admin' ? 'Finance reviews are decided in the admin console.' : verb === 'override' ? (isSA() ? '' : 'Only the Super Administrator can override.') : p9IsFinAdmin() || isSA() ? '' : 'Only Finance decides an agency payment review (or the Super Administrator).';
  if (deny) { logA('Finance', id || '—', `Blocked: ${verb} Finance review`, v ? v.state : '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (v.state !== 'Open') return { ok: false, why: `${v.id} is already closed — nothing changed.`, dup: true };
  if (!String(why || '').trim()) return { ok: false, why: 'Enter the decision and its reason.' };
  const at = now().toISOString(), w = String(why).trim(), closing = verb === 'close', kind = isSA() ? 'Super Administrator' : 'Finance Admin';
  v.dec.push({ at, by: me.name, role: kind, verb: closing ? 'close' : 'record', why: w, outcome: P9_KEEP });
  v.hist.push({ at, what: closing ? 'Closed' : 'Decision recorded', by: me.name, why: w });
  if (closing) { v.state = 'Closed'; v.closed = at; }
  logA('Finance', `${v.inv} · ${v.agency}`, closing ? (isSA() ? 'Finance review closed (Super Administrator)' : 'Finance review closed (agency overdue)') : (isSA() ? 'Finance review decision recorded (Super Administrator)' : 'Finance review decision recorded'), closing ? 'Open' : 'Open', closing ? 'Closed' : 'Open', `${w} — ${P9_KEEP}`);
  return { ok: true, state: v.state };
}
function p9Reconcile() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !STORE.agy || !STORE.agy.p9) return;
  P9().arr.filter(a => P9_LIVE.includes(a.state)).forEach(p9Overdue);
}

/* ---------- P8: Finance authorisation also accepts an approved arrangement (p8Auth is the P8 interface) ---------- */
const _authP9 = p8Auth;
p8Auth = function (b) {
  if (!b || !b.p9) return _authP9.apply(this, arguments);
  const g = P9().arr.find(a => a.line === b.p9 && P9_AUTH.includes(a.state)), last = p9Line(b.p9)[0];
  if (!g) return { ok: false, why: `The payment arrangement for ${b.name} isn't in force (${last ? last.state : 'missing'})` };
  if (g.agency !== b.agency) return { ok: false, why: `The arrangement ${g.id} belongs to another agency` };
  if (g.bundle !== b.id || !(b.courses || []).every(c => (g.courses || []).includes(c))) return { ok: false, why: `${g.id} doesn't cover ${b.name}` };
  const refs = p9Line(b.p9).flatMap(a => a.pays.map(p => p.ref));
  const refund = (ADMIN.queue || []).find(i => i.type === 'Refund' && ['Pending', 'Info Requested', 'Escalated'].includes(i.status) && refs.some(r => JSON.stringify(i.data || {}).includes(r)));
  if (refund) return { ok: false, why: `A refund of a payment under ${g.id} is open (${refund.id})` };
  const paid = p9Paid(g.inv), ob = Math.round(Number((p9Inv(g.inv) || {}).amount || 0) * 100);
  return { ok: true, evidence: `Approved payment arrangement ${g.id} (${g.type === 'deferred' ? 'deferred single payment' : 'instalments'}) for invoice ${g.inv} — ${p9M(paid)} of ${p9M(ob)} received${g.state === 'Overdue' ? '; an instalment is overdue (Finance review)' : ''}`, ref: g.id, arr: g.id, settled: g.state === 'Satisfied', state: g.state };
};
// P7: an arrangement-backed bundle's entitlement is used only while its arrangement authorises it (re-checked at confirmation)
const _whyP9 = p7Why;
p7Why = function (b, a) { const y = _whyP9.apply(this, arguments); if (y || !b || !b.p9) return y; const au = p8Auth(b); return au.ok ? '' : au.why; };
// The reservation's audit names the arrangement that backs it
const _resP9 = p8Reserve;
p8Reserve = function (bid) {
  const out = _resP9.apply(this, arguments), b = (ADMIN.bundles || []).find(x => x.id === bid);
  if (out && out.ok && !out.dup && b && b.p9) { const au = p8Auth(b); logA('Bundles & Licences', `${b.id} · ${out.grp}`, 'Reservation backed by a payment arrangement', '—', au.ref || '—', au.evidence || ''); }
  return out;
};
// An invoice governed by an arrangement is paid through it — the one-off "record payment" would bypass the schedule and allocation
const _ipP9 = ACT.invPay;
ACT.invPay = el => {
  const i = qItem(el && el.dataset && el.dataset.id), g = i && (p9Gov(i.id) && P9_LIVE.includes(p9Gov(i.id).state) ? p9Gov(i.id) : null);
  if (g) { logA('Finance', i.id, 'Blocked: record invoice payment (arrangement in force)', i.status, 'No change', `${g.id} governs ${i.id} — record receipts against the arrangement`); toast(`${i.id} is paid under arrangement ${g.id}. Record the receipt on Agency Arrangements.`, 'err'); return false; }
  return _ipP9(el);
};

/* ---------- Agency NVQ enrolments confirmed through P8: the programme in the learner's own account ---------- */
function p9Enrol(a) {
  if (!a || a.kind !== 'nvq' || !a.batch || a.status !== 'Approved' || !p7ConsOf(a.id) || a.p9w) return null;
  const L = learnerById(a.lid), k = L && agyWorldKey(L); if (!k) return null; // delivered when the account is activated
  const w = STORE.worlds[k], b = chBatch(a.batch), pr = s3Pr(a.prog) || (b && p8Prog(b)), ap = (ADMIN.apps || []).find(x => x.agySeat === a.id);
  if (!w || !b || !pr) return null;
  if (w.nvq || w.signup || w.admission) {
    if (w.nvq && w.nvq.p9 && w.nvq.p9.assign === a.id) { a.p9w = k; return w; }
    a.p9w = 'conflict'; P7().rec.push({ bundle: a.bundle, ref: a.id, at: now().toISOString(), why: `${a.learner}'s account already has a programme record — the confirmed agency enrolment wasn't added to it (needs reconciliation; no access from it)` });
    logA('Learners', `${a.learner} (${a.lid})`, 'Sponsored enrolment not added (account already has a programme)', '—', 'No change', a.id); return null;
  }
  const keepW = W, keepV = S.variant, t = makeWorld('B'), at = now().toISOString(); W = keepW; S.variant = keepV;
  ['tree', 'assignments', 'pd', 'plan', 'workplace', 'iaCriteria'].forEach(x => { if (!w[x]) w[x] = t[x]; });
  w.observations = w.observations || []; w.docs = w.docs || [];
  Object.assign(w.flags, { nvq: true, admitted: true, sponsored: true }); w.me.sponsor = a.agency;
  w.nvq = { ...t.nvq, title: pr.title, level: pr.level, ab: 'Awarding body ref. ' + (pr.ref || pr.id), batch: chBatchLbl(b), batchStart: b.start, batchEnd: b.end, start: b.start, end: b.end, status: 'Active', enrolled: at, version: b.progVersion ? 'Version ' + b.progVersion : t.nvq.version, desc: pr.desc || t.nvq.desc, people: [], sponsor: a.agency,
    p9: { assign: a.id, bundle: a.bundle, agency: a.agency, batch: b.code, app: ap ? ap.id : null, optId: a.optId || null, mode: a.mode || null, resv: a.resv || null, rule: P9_ACC, at } };
  w.signup = { step: 5, done: true, batch: b.code, prog: pr.id, letterV: null, sig: null, pay: null, p9: true };
  w.admission = { status: 'Approved', reviewer: t.admission.reviewer, history: [['Agency enrolment confirmed', at]], deposit: { min: 0, paid: false, paidAt: null, holdUntil: null, balance: 0 }, batch: w.nvq.batch, batchStart: b.start };
  w.enrolments.unshift(w.nvq); a.p9w = k;
  logA('Learners', `${a.learner} (${a.lid})`, 'Sponsored enrolment added to the learner account', '—', `${pr.title} · ${b.code}`, `${a.agency} · ${a.id}${ap ? ' · ' + ap.id : ''} — learning opens when the access conditions are met (${P9_ACC})`);
  notifyLearner(k, 'Admission', 'Enrolment confirmed', `${a.agency} sponsors you on ${pr.title} in ${chBatchLbl(b)}. Your learning opens when your batch commences.`, 'dashboard');
  return w;
}
const p9EnrolAll = () => { if (!STORE.agy || !STORE.agy.assign) return; STORE.agy.assign.filter(a => a.kind === 'nvq' && a.batch && a.status === 'Approved' && !a.p9w).forEach(a => { try { p9Enrol(a); } catch (e) { /* retried on the next pass */ } }); };
const _syncP9 = p7NvqSync; p7NvqSync = function () { const r = _syncP9.apply(this, arguments); p9EnrolAll(); return r; };
const _actP9 = ag1Activated; ag1Activated = function () { const r = _actP9.apply(this, arguments); p9EnrolAll(); return r; };

/* ---------- Sponsored learning access: the P5 decision, extended for the agency workflow ---------- */
const p9Pending = b => { const pur = (STORE.agy.purchases || []).find(p => p.bundle === b.id); return (pur && pur.status === 'Pending') || ((STORE.fin && STORE.fin.pending) || []).some(x => x.agyRef && pur && x.agyRef === pur.ref && x.status === 'Pending'); };
function p9Access(w) {
  const at = now().getTime();
  const D = (allowed, code, reason, o = {}) => Object.freeze({ allowed, code, reason, next: o.next || null, refs: Object.freeze(o.refs || {}), pay: o.pay || null, com: o.com || null, policy: 'AGENCY-P9', rule: P9_ACC, at: new Date(at).toISOString(), applies: true });
  if (!w || !w.me || !w.me.id) return D(false, 'P9-IDENTITY', 'No learner record could be identified.', { next: P5_NEXT.msg });
  const m = w.nvq && w.nvq.p9;
  if (!m) return D(false, 'P9-NO-AGENCY-ENROLMENT', 'No confirmed agency enrolment is recorded for this sponsored learner, so sponsored learning access can\'t be authorised.', { next: P5_NEXT.msg });
  const a = (STORE.agy.assign || []).find(x => x.id === m.assign), refs = { assign: m.assign, bundle: m.bundle, batch: m.batch, agency: m.agency };
  if (!a || a.lid !== w.me.id) return D(false, 'P9-IDENTITY', 'The agency enrolment record belongs to a different learner ID.', { next: P5_NEXT.msg, refs });
  const ag = p8Agency(a.agency), b = (ADMIN.bundles || []).find(x => x.id === a.bundle);
  if (!ag || !a.agency || a.agency !== m.agency || w.nvq.sponsor !== a.agency || !b || b.agency !== a.agency) return D(false, 'P9-AGENCY', 'The sponsoring agency is missing or doesn\'t match the enrolment records.', { next: P5_NEXT.msg, refs });
  const ap = (ADMIN.apps || []).find(x => x.agySeat === a.id);
  if (!w.signup || !w.signup.done || !w.nvq || !['Active', 'Completed'].includes(w.nvq.status) || !(w.enrolments || []).includes(w.nvq) || a.status !== 'Approved' || !ap || ap.status !== 'Approved') return D(false, 'P9-NOT-ENROLLED', 'The agency enrolment isn\'t confirmed (admission approval and confirmation are both needed).', { next: P5_NEXT.adm, refs });
  const bt = chBatch(a.batch); if (!bt || w.signup.batch !== a.batch || m.batch !== a.batch) return D(false, 'P9-NO-BATCH', `The enrolment isn't in its confirmed batch (${a.batch}).`, { next: P5_NEXT.msg, refs });
  if (!seatActive(bt.code, w.me.id)) return D(false, 'P9-NO-SEAT', `The seat ledger shows no active place in ${bt.code}.`, { next: P5_NEXT.msg, refs });
  const c = p7ConsOf(a.id); if (!c || c.bundle !== b.id || c.lid !== w.me.id) return D(false, 'P9-ENTITLEMENT', 'No entitlement of the sponsoring bundle was used for this enrolment.', { next: P5_NEXT.msg, refs });
  const au = p8Auth(b), pay = { state: au.ok ? 'cleared' : 'blocked', text: au.ok ? au.evidence : au.why, arr: au.arr || null };
  if (!au.ok) return p9Pending(b) ? D(false, 'P9-PENDING', `The agency's payment is awaiting verification by Finance (${au.why}).`, { next: P5_NEXT.msg, refs, pay }) : D(false, 'P9-FINANCE', `The sponsoring agency's payment isn't verified or covered by an approved arrangement: ${au.why}.`, { next: P5_NEXT.msg, refs, pay });
  const com = p5Commence(bt, at), o = { refs: { ...refs, finance: au.ref || null }, pay, com };
  if (com.state === 'not-commenced') return D(false, 'P9-NOT-STARTED', 'Your batch hasn\'t started yet.', { ...o, next: P5_NEXT.adm });
  if (com.state !== 'commenced') return D(false, 'P9-COMMENCE-UNKNOWN', com.why, { ...o, next: P5_NEXT.adm });
  return D(true, 'P9-OK', `Sponsored enrolment confirmed, payment ${au.settled ? 'received' : 'covered by an approved arrangement'}, batch commenced.${au.state === 'Overdue' ? ' (An agency payment is overdue and with Finance — access isn\'t changed by that.)' : ''}`, o);
}
const P9_SEEN = new Set();
const p9Note = (w, d) => { const k = `${w.me && w.me.id}|${d.code}`; if (P9_SEEN.has(k)) return; P9_SEEN.add(k); logA('Learner access', `${w.me ? chFullName(w) + ' (' + w.me.id + ')' : '—'}`, d.allowed ? 'Sponsored learning access evaluated (open)' : 'Sponsored learning access evaluated (not open)', '—', d.code, d.reason); };
const _appliesP9 = p5Applies; p5Applies = function (w) { return !!(w && w.signup && w.nvq && w.nvq.p9) || _appliesP9.apply(this, arguments); };
const _decideP9 = p5Decide;
p5Decide = function (w, eid = 'nvq') {
  if (eid === 'nvq' && w && w.nvq && w.nvq.p9) { const d = p9Access(w); p9Note(w, d); return d; }
  const d = _decideP9.apply(this, arguments); if (d.code !== 'P5-AGENCY-P9') return d;
  const x = p9Access(w); p9Note(w, x); return x;
};
Object.assign(P5_TITLE, { 'P9-NOT-STARTED': 'Your batch hasn\'t started yet', 'P9-COMMENCE-UNKNOWN': 'Learning opens when your batch commences', 'P9-PENDING': 'Your sponsor\'s payment is being verified', 'P9-FINANCE': 'Your sponsored access isn\'t authorised yet', 'P9-NO-AGENCY-ENROLMENT': 'Your sponsored access isn\'t open yet', 'P9-NOT-ENROLLED': 'Your enrolment isn\'t confirmed yet', 'P9-AGENCY': 'Your sponsorship can\'t be confirmed', 'P9-NO-SEAT': 'Your place can\'t be confirmed', 'P9-NO-BATCH': 'Your batch can\'t be confirmed', 'P9-ENTITLEMENT': 'Your sponsorship can\'t be confirmed', 'P9-IDENTITY': 'We can\'t open your programme yet' });

/* ---------- Screens: Finance (Agency Arrangements) and the agency's purchase page ---------- */
const p9St = s => chip(s, { [P9_PEND]: 'amber', [P9_CHG]: 'amber', Active: 'blue', Overdue: 'red', Satisfied: 'green', Superseded: 'grey', Refused: 'grey', Invalidated: 'grey' }[s] || 'grey');
const p9Sched = a => `<ol class="small p9-sched">${a.sched.map(r => `<li>${esc(r.due)} · ${p9M(r.minor)}${r.paid ? ` · paid ${p9M(r.paid)}` : ''}${a.overdue[r.id] && r.paid < r.minor ? ' · <strong>overdue</strong>' : ''}</li>`).join('')}</ol>`;
const p9Out = a => a.sched.reduce((s, r) => s + r.minor - r.paid, 0);
const p9CanFin = () => S.portal === 'admin' && typeof fiFin === 'function' && fiFin();
SCREENS['f-agyarr'] = () => {
  if (!p9CanFin()) return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Not available</h1><p class="muted">Agency payment arrangements are managed by Finance (or the Super Administrator).</p></div>`;
  p9Reconcile(); const X = P9(), inv = (ADMIN.queue || []).filter(i => i.type === P9_INV && i.data && i.data.portal && i.stage === 'awaiting' && !p9Gov(i.id) && !p9OpenReq(i.id));
  return `${pageA('Agency arrangements', 'Deferred payments and instalment plans Finance approved for agency invoice purchases, the payments received against them, overdue instalments and their reviews. An arrangement authorises the invoice\'s entitlements; it is not a payment, and overdue never changes learner access automatically.')}
    <section class="card"><h2>Arrangements</h2>${X.arr.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Arrangement</th><th>Agency</th><th>Invoice</th><th>Schedule</th><th class="r">Outstanding</th><th>Status</th><th></th></tr></thead><tbody>${X.arr.map(a => `<tr><td class="mono">${esc(a.id)}<div class="xs muted">${esc(a.line)} v${a.ver} · ${a.type === 'deferred' ? 'deferred' : 'instalments'}</div></td><td>${esc(a.agency)}</td><td class="mono">${esc(a.inv)}</td><td>${p9Sched(a)}</td><td class="r num">${p9M(p9Out(a))}</td><td>${p9St(a.state)}<div class="xs muted">${esc(a.by.name)}${a.dec ? ` → ${esc(a.dec.by)}` : ''}</div></td><td>${a.state === P9_PEND ? `<button class="btn btn-sm btn-primary" data-act="p9Dec" data-id="${a.id}" data-v="${isSA() ? 'override' : 'approve'}" data-r="${a.rev}">${isSA() ? 'Override and approve' : 'Approve'}</button> <button class="btn btn-sm" data-act="p9Dec" data-id="${a.id}" data-v="changes" data-r="${a.rev}">Request changes</button> <button class="btn btn-sm" data-act="p9Dec" data-id="${a.id}" data-v="refuse" data-r="${a.rev}">Refuse</button>` : P9_LIVE.includes(a.state) ? `<button class="btn btn-sm" data-act="p9PayDlg" data-id="${a.id}">Record payment</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>No payment arrangements yet.</p></div>'}</section>
    <section class="card"><h2>Approved invoice purchases awaiting payment</h2>${inv.length ? `<ul class="list small">${inv.map(i => `<li class="li">${esc(i.id)} · ${esc(i.data.agency)} · ${money(i.amount, i.cur)} <button class="btn btn-sm" data-act="p9ReqDlg" data-id="${i.id}">Request arrangement</button></li>`).join('')}</ul>` : '<p class="small muted">None without an arrangement.</p>'}</section>
    <section class="card"><h2>Finance reviews (overdue)</h2>${X.rev.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Review</th><th>Agency</th><th>Reason</th><th>Learners</th><th>Status</th><th></th></tr></thead><tbody>${X.rev.map(v => `<tr><td class="mono">${esc(v.id)}</td><td>${esc(v.agency)}</td><td class="small">${esc(v.reason)}${v.dec.length ? `<div class="xs muted">${esc(v.dec[v.dec.length - 1].by)}: ${esc(v.dec[v.dec.length - 1].why)}</div>` : ''}</td><td>${v.learners.length}</td><td>${esc(v.state)}</td><td>${v.state === 'Open' ? `<button class="btn btn-sm" data-act="p9RevDec" data-id="${v.id}" data-v="record">Record decision</button> <button class="btn btn-sm" data-act="p9RevDec" data-id="${v.id}" data-v="close">Close</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No reviews.</p>'}
      <p class="xs muted">${esc(P9_KEEP)}.</p></section>
    <section class="card"><h2>Payment exceptions</h2>${X.exc.length ? `<ul class="list small">${X.exc.map(x => `<li class="li"><span class="mono">${esc(x.id)}</span> · ${esc(x.kind)} · ${esc(x.ref || '—')} · ${p9M(x.minor)} · ${esc(x.state)}${x.state === 'Finance review' ? ` <button class="btn btn-sm" data-act="p9ExcRes" data-id="${x.id}">Resolve</button>` : ''}<div class="xs muted">${esc(x.why)}</div></li>`).join('')}</ul>` : '<p class="small muted">No exceptions.</p>'}</section>`;
};
// "YYYY-MM-DD 1234.56" per line → rows in pence (rejected unless every line parses exactly)
const p9Parse = txt => { const rows = []; for (const ln of String(txt || '').split(/\n+/).map(s => s.trim()).filter(Boolean)) { const m = /^(\d{4}-\d{2}-\d{2})\s+(\d+)(?:\.(\d{1,2}))?$/.exec(ln); if (!m) return null; rows.push({ due: m[1], minor: (+m[2]) * 100 + (m[3] ? +(m[3] + '0').slice(0, 2) : 0) }); } return rows; };
const p9ReqForm = (i, a) => `<p class="small">${esc(i.id)} · ${esc(i.data.agency)} · outstanding <strong>${p9M(p9Ob(i).remaining)}</strong>. One line per payment: <span class="mono">YYYY-MM-DD amount</span>, earliest first; the amounts must total the outstanding balance exactly. Finance decides.</p>
  <div class="field"><label for="p9-t">Type</label><select class="select" id="p9-t"><option value="deferred" ${a && a.type === 'deferred' ? 'selected' : ''}>Deferred single payment</option><option value="instalments" ${a && a.type === 'instalments' ? 'selected' : ''}>Structured instalments</option></select></div>
  <div class="field"><label for="p9-s">Schedule</label><textarea class="textarea" id="p9-s" rows="4">${a ? a.sched.map(r => `${r.due} ${(r.minor / 100).toFixed(2)}`).join('\n') : ''}</textarea></div>`;
ACT.p9ReqDlg = el => {
  const i = p9Inv(el && el.dataset && el.dataset.id), ow = !i ? 'That invoice isn\'t available.' : S.portal === 'agency' && i.data.agency !== AGN() ? 'That invoice isn\'t available.' : '';
  if (ow) { logA('Finance', (el && el.dataset && el.dataset.id) || '—', 'Blocked: request payment arrangement', '—', 'No change', ow); toast(ow, 'err'); return false; }
  const re = p9Arr(el.dataset.a), key = 'A' + Date.now().toString(36);
  reasonDlg({ title: (re ? 'Resubmit arrangement — ' : 'Request payment arrangement — ') + esc(i.id), ok: re ? 'Resubmit' : 'Send to Finance', body: p9ReqForm(i, re),
    onOk: r => { const rows = p9Parse(mval('#p9-s')); if (!rows) { fieldErr('#p9-s', 'Use one line per payment: YYYY-MM-DD amount (e.g. 2027-01-15 1200.00)'); return false; } const o = { type: mval('#p9-t'), rows, why: r, key }; const out = re ? p9Resubmit(re.id, o) : p9Request(i.id, o); if (!out.ok) { toast(out.why, 'err'); return false; } render(); toast(out.dup ? 'Already sent.' : `${out.id} sent to Finance.`); } });
};
ACT.p9Dec = el => {
  const id = el.dataset.id, v = el.dataset.v, seen = +el.dataset.r, a = p9Arr(id);
  if (!a || !p9CanFin()) { logA('Finance', id || '—', `Blocked: ${v} payment arrangement`, '—', 'No change', 'Not allowed'); toast('Only Finance decides payment arrangements.', 'err'); return false; }
  reasonDlg({ title: `${v === 'refuse' ? 'Refuse' : v === 'changes' ? 'Request changes to' : v === 'override' ? 'Override and approve' : 'Approve'} ${esc(id)}`, ok: v === 'refuse' ? 'Refuse' : v === 'changes' ? 'Return for changes' : 'Approve', danger: v === 'refuse', body: `<p class="small">${esc(a.agency)} · ${esc(a.inv)} · ${p9M(a.totalMinor)}</p>${p9Sched(a)}<p class="xs muted">Approval re-checks the invoice; it authorises the invoice's entitlements, records no payment and reserves no place.</p>`,
    onOk: r => { const out = p9Decide(id, v, r, seen); if (out.denied) { toast(out.why, 'err'); return; } if (!out.ok && !out.state) { toast(out.why, 'err'); return false; } render(); toast(out.ok ? `${id}: ${out.state.toLowerCase()}.` : `${id}: ${out.why}`, out.ok ? 'ok' : 'err'); } });
};
ACT.p9PayDlg = el => {
  const a = p9Arr(el.dataset.id); if (!a || !p9CanFin()) { logA('Finance', el.dataset.id || '—', 'Blocked: record agency payment', '—', 'No change', 'Not allowed'); toast('Only Finance records agency payments.', 'err'); return false; }
  reasonDlg({ title: 'Record verified payment — ' + esc(a.id), ok: 'Record and allocate', label: 'Note (required)', body: `<p class="small">${esc(a.agency)} · ${esc(a.inv)} · outstanding ${p9M(p9Out(a))}. Allocated to the earliest unpaid instalment first. A surplus or a mismatch goes to Finance review — nothing is refunded or moved automatically.</p>`,
    extra: `<div class="form-grid"><div class="field"><label for="p9-a">Amount received (£)</label><input class="input num" id="p9-a" value="${(p9Out(a) / 100).toFixed(2)}"></div><div class="field"><label for="p9-d">Date received</label><input class="input" id="p9-d" value="${p9Today()}"></div><div class="field"><label for="p9-r">Bank reference</label><input class="input" id="p9-r"></div></div>`,
    onOk: r => { const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec((mval('#p9-a') || '').trim()); if (!m) { fieldErr('#p9-a', 'Enter an amount like 1200.00'); return false; } const minor = (+m[1]) * 100 + (m[2] ? +(m[2] + '0').slice(0, 2) : 0); const out = p9Pay(a.id, { minor, ref: mval('#p9-r'), received: (mval('#p9-d') || '').trim(), why: r }); if (!out.ok) { toast(out.why, 'err'); return out.exc ? undefined : false; } render(); toast(`Payment allocated. ${p9M(out.outstanding)} outstanding.${out.exc ? ` ${out.exc} opened for the surplus.` : ''}`); } });
};
ACT.p9RevDec = el => { const id = el.dataset.id, v = el.dataset.v; reasonDlg({ title: `${v === 'close' ? 'Close' : 'Record decision on'} ${esc(id)}`, ok: v === 'close' ? 'Close review' : 'Record', body: `<p class="small">${esc(P9_KEEP)}.</p>`, onOk: r => { const out = p9ReviewDecide(id, v, r); if (!out.ok) { toast(out.why, 'err'); return out.denied ? undefined : false; } render(); toast(`${id}: ${out.state.toLowerCase()}.`); } }); };
ACT.p9ExcRes = el => { const id = el.dataset.id; reasonDlg({ title: 'Resolve ' + esc(id), ok: 'Resolve', body: '<p class="small">Records Finance\'s decision. Any refund, credit or transfer goes through its own approved process — nothing happens automatically here.</p>', onOk: r => { const out = p9ExcResolve(id, r); if (!out.ok) { toast(out.why, 'err'); return out.denied ? undefined : false; } render(); toast(`${id} resolved.`); } }); };
FNAV.forEach(g => { if (g[0] === 'Agencies') g[1].push(['f-agyarr', 'Agency Arrangements', 'cal']); }); FIN_ROUTES.add('f-agyarr');
ANAV.forEach(g => { if (g[0] === 'Finance') g[1].push(['f-agyarr', 'Agency Arrangements', 'cal']); });
// Shown only to whoever may use it (Finance, the Super Administrator) — a System Administrator's admin menu doesn't list it
const _navP9 = adminNav; adminNav = function () { const n = _navP9.apply(this, arguments); return p9CanFin() ? n : n.map(([g, items]) => [g, items.filter(x => x[0] !== 'f-agyarr')]); };
if (typeof ROUTE_PURPOSE !== 'undefined') ROUTE_PURPOSE['f-agyarr'] = 'Agency payment arrangements (deferred payments and instalment plans), the payments allocated to them, overdue instalments and their Finance reviews.';
// The agency's purchase page: the arrangement for its own invoice, and the request
function p9Card(i) {
  const xs = P9().arr.filter(a => a.inv === i.id && a.agency === AGN()), g = p9Gov(i.id), open = p9OpenReq(i.id), can = i.stage === 'awaiting' && !p9ObWhy(i);
  if (!xs.length && !can) return '';
  return `<section class="card p9-arr"><h2>Payment arrangement</h2><p class="xs muted">A deferred payment or instalment plan needs Finance's approval. Once approved, the purchase's entitlements are in your bundle and places are reserved separately; the invoice stays unpaid until the money is received.</p>
    ${xs.map(a => `<div class="small"><strong class="mono">${esc(a.id)}</strong> ${p9St(a.state)} · ${a.type === 'deferred' ? 'deferred single payment' : 'instalments'} · ${p9M(a.totalMinor)}${a.dec && a.dec.kind !== 'invalid' ? ` · ${esc(a.dec.why)}` : ''}${p9Sched(a)}</div>`).join('')}
    ${open && open.state === P9_CHG ? `<button class="btn btn-sm" data-act="p9ReqDlg" data-id="${esc(i.id)}" data-a="${esc(open.id)}">Resubmit</button>` : !open && can ? `<button class="btn btn-sm" data-act="p9ReqDlg" data-id="${esc(i.id)}">${g ? 'Request a revised schedule' : 'Request payment arrangement'}</button>` : ''}</section>`;
}
const _gpP9 = SCREENS['g-purchase'];
SCREENS['g-purchase'] = p => { const h = _gpP9(p), i = p && p9Inv(p.id); if (!i || typeof h !== 'string' || !i.data || i.data.agency !== AGN() || !/<div class="grid-2">/.test(h)) return h; const c = p9Card(i); return c ? h.replace('<div class="grid-2">', c + '<div class="grid-2">') : h; };
const _rdP9 = render; render = function () { try { p9Reconcile(); } catch (e) { /* drawn again next time */ } return _rdP9.apply(this, arguments); };

UXC.push(['P9', 'Agency payment arrangements and sponsored access (13 Nov 2026)', [
  'Finance can approve a deferred payment or an instalment plan for an agency\'s approved invoice purchase (not the person who requested it; the Super Administrator by an audited override). Approval puts the purchase\'s entitlements in the agency\'s bundle without marking the invoice paid; places are still reserved by the agency.',
  'Finance records each payment received against the plan; a surplus or a mismatch goes to Finance review. An overdue instalment notifies the agency and Finance and opens a review — it never suspends learners. A learner confirmed through an agency reservation gets the programme in their own account; learning opens once the enrolment, place, entitlement and the agency\'s payment (received or covered by an approved plan) are confirmed and the batch has commenced.']]);
