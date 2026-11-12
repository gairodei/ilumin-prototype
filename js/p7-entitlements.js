/* ============================================================
   P7 — Agency entitlements, expiry and extensions (12 Nov 2026; PD-P7-* in PROVISIONAL-DECISIONS.md; PD-P0-10, 12, 13, 15 in
   P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p6-transfer.js.
   One authoritative entitlement ledger (STORE.agy.p7.recs): purchase (+n), consume (1 per confirmed enrolment, referencing the seat
   assignment and its enrolment), return (+1, only through the existing seat-return rule, never after expiry), legacy (earlier usage
   kept as consumed without a confirmed learner record — marked for reconciliation, never spendable) and expire (the unused balance at
   expiry, a record). Balances are derived; bundle.used is a read-only projection (consumed + provisional named assignments) that the
   older code still reads for "seats left" — writes to it are ignored.
   - Consumed only when the enrolment is confirmed: a short-course enrolment created in the learner's account (at assignment when the
     account is active, else at activation), or an agency NVQ application approved. A provisional assignment (admission pending,
     awaiting activation) consumes nothing; a refused or failed confirmation consumes nothing; a repeat consumes nothing.
   - Expired bundles (the agency clock, Clock.scenario('agency')) refuse any new consumption, return or revival. Confirmed learners keep
     their enrolment, batch and access; new agency short-course enrolments run for the course's own access period (PD-P0-15).
   - Extensions: requested by the agency (or the Business Admin on its behalf) before expiry; approved by a Business Admin who didn't
     request it, before expiry; a Super Administrator override is audited and keeps every rule. A pending request doesn't pause expiry.
   - Reminders at 30, 14 and 7 days and at expiry, once per bundle, expiry date and kind (in-app agency notices; no email or SMS).
   Fixed-batch reservations (P8) and agency payment arrangements (P9) are not built. Browser-only: production enforces on the server.
   ============================================================ */
'use strict';

const P7_RULE = 'P7-ENT-1';
const P7_PROV = ['Admission pending', 'Under review'];
const P7_CONF = ['Active', 'Completed', 'Expired-Incomplete', 'Approved'];
const P7 = () => { const G = STORE.agy; if (!G.p7 || G.p7.v !== 1) G.p7 = { v: 1, seq: 0, recs: [], mig: {}, ext: { seq: 0, reqs: [] }, sent: {}, rec: [] }; return G.p7; };
const p7AgId = name => ((ADMIN.agencies || []).find(a => a.name === name) || {}).id || null;
const p7Who = () => S.portal === 'agency' ? { name: typeof AG_CONTACT === 'function' ? AG_CONTACT() : '—', role: 'Agency Administrator', portal: 'agency', agency: AGN() } : { name: (ADMIN && ADMIN.me && ADMIN.me.name) || '—', role: isSA() ? 'Super Administrator' : (typeof isBiz === 'function' && isBiz()) ? 'Business Admin' : (ADMIN && ADMIN.me && ADMIN.me.role) || '—', portal: S.portal || '—' };
const p7Expired = b => !!(b && b.validity && agDays(b.validity) < 0);
const p7Recs = b => P7().recs.filter(r => r.bundle === b.id);
const p7Sum = (rs, t) => rs.filter(r => r.type === t).reduce((s, r) => s + (r.qty | 0), 0);
const p7ConsOf = aid => P7().recs.find(r => r.type === 'consume' && r.ref === aid && !r.returned) || null;
const p7Covers = (b, course) => (b.courses || []).includes(course);
// Named assignments that wait for a confirmation (no entitlement consumed yet)
const p7PendList = b => (STORE.agy.assign || []).filter(a => a.bundle === b.id && !p7ConsOf(a.id) && (P7_PROV.includes(a.status) || (a.kind !== 'nvq' && a.status === 'Active' && a.awaitAct && !a.enrolId)));
function p7Bal(b) {
  const rs = p7Recs(b), purchased = p7Sum(rs, 'purchase'), consumed = p7Sum(rs, 'consume') + p7Sum(rs, 'legacy') - p7Sum(rs, 'return'), expired = p7Expired(b), unused = Math.max(0, purchased - consumed);
  const pending = expired ? 0 : p7PendList(b).length;
  return { purchased, consumed, pending, available: expired ? 0 : unused, expiredUnused: expired ? unused : 0, reserved: 0, expired, legacy: p7Sum(rs, 'legacy') };
}
const p7Used = b => { const x = p7Bal(b); return x.consumed + x.pending; };

/* ---------- Binding and migration (once per bundle; re-running adds nothing) ---------- */
function p7Entry(b, type, qty, o = {}) {
  const X = P7(), at = now().toISOString();
  const r = { id: 'ENT-' + String(++X.seq).padStart(5, '0'), type, qty: qty | 0, agency: b.agency, agencyId: p7AgId(b.agency), bundle: b.id, courses: o.courses || (b.courses || []).slice(), lid: o.lid || null, ref: o.ref || null, enrol: o.enrol || null, src: o.src || null, pay: o.pay || null, at, eff: o.eff || at, by: o.by || 'System', why: o.why || '', rule: P7_RULE };
  if (o.ver) r.ver = o.ver; if (o.reconcile) r.reconcile = true;
  X.recs.push(r); return r;
}
const p7PurchaseRef = b => { const l = (STORE.agy.ledger || []).find(x => x.bundle === b.id && x.type === 'Credited'); return (l && l.ref) || b.ref || null; };
function p7Migrate(b, raw) {
  const X = P7(); if (X.mig[b.id]) return p7SyncSeats(b);
  X.mig[b.id] = { at: now().toISOString(), raw, seats: b.seats };
  const ref = p7PurchaseRef(b);
  p7Entry(b, 'purchase', b.seats, { src: ref, pay: ref, eff: b.from || now().toISOString(), by: 'System (P7 opening balance)', why: 'Purchased entitlements recorded from the bundle (seats credited after payment)' });
  const as = (STORE.agy.assign || []).filter(a => a.bundle === b.id);
  const conf = as.filter(a => (P7_CONF.includes(a.status) && !(a.kind !== 'nvq' && a.awaitAct && !a.enrolId)) || (a.status === 'Unassigned' && a.noReturn));
  conf.forEach(a => p7Entry(b, 'consume', 1, { lid: a.lid, ref: a.id, enrol: a.enrolId || null, courses: [a.course], eff: a.at, by: 'System (P7 opening balance)', why: `Confirmed ${a.kind === 'nvq' ? 'NVQ enrolment' : 'enrolment'} (${a.status}) recorded before the entitlement ledger` }));
  const pend = as.filter(a => P7_PROV.includes(a.status) || (a.kind !== 'nvq' && a.status === 'Active' && a.awaitAct && !a.enrolId)).length, extra = (raw | 0) - conf.length - pend;
  if (extra > 0) p7Entry(b, 'legacy', extra, { reconcile: true, by: 'System (P7 opening balance)', why: `${extra} earlier use${extra === 1 ? '' : 's'} counted on the bundle with no confirmed learner record — kept as consumed (never spendable); needs reconciliation` });
  if (extra < 0) X.rec.push({ bundle: b.id, at: now().toISOString(), why: `The bundle counted ${raw} used, fewer than its records (${conf.length} confirmed, ${pend} provisional) — the ledger follows the records` });
  if (conf.length > b.seats) X.rec.push({ bundle: b.id, at: now().toISOString(), why: `${conf.length} confirmed enrolments exceed the ${b.seats} purchased — no entitlement is available until reconciled` });
  // Earlier expiry notices in the agency's inbox count as sent (no duplicate)
  (STORE.agy.notifs || []).filter(n => n.go === 'g-bundle.' + b.id).forEach(n => { if (/expiring in 30 days/i.test(n.t)) X.sent[`${b.id}|${b.validity}|30`] = { at: n.at, legacy: true }; if (/lapsed|expired/i.test(n.t)) X.sent[`${b.id}|${b.validity}|0`] = { at: n.at, legacy: true }; });
}
// Seats added to an existing bundle by an existing purchase path (an older invoice) are recorded as purchased
function p7SyncSeats(b) {
  const p = p7Sum(p7Recs(b), 'purchase');
  if (b.seats > p) p7Entry(b, 'purchase', b.seats - p, { src: p7PurchaseRef(b), by: 'System', why: 'Seats added to the bundle by an existing purchase path' });
  else if (b.seats < p && !P7().rec.some(x => x.bundle === b.id && x.seats === b.seats)) P7().rec.push({ bundle: b.id, seats: b.seats, at: now().toISOString(), why: `The bundle shows ${b.seats} seats but ${p} were recorded as purchased` });
}
function p7Bind(b) {
  if (!b || !b.agency || !b.id || typeof STORE === 'undefined' || !STORE.agy) return b;
  const d = Object.getOwnPropertyDescriptor(b, 'used');
  if (d && d.get && d.get._p7) return b;
  const raw = d && 'value' in d ? +d.value || 0 : 0;
  p7Migrate(b, raw);
  const get = () => p7Used(b); get._p7 = true;
  Object.defineProperty(b, 'used', { get, set: () => { /* a projection: older writers are ignored; the ledger decides */ }, enumerable: true, configurable: true });
  return b;
}
const p7BindAll = () => { if (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.bundles && STORE.agy) ADMIN.bundles.forEach(p7Bind); };

/* ---------- Consumption: once, at the confirmed enrolment ---------- */
function p7Why(b, a) {
  if (!b) return 'The bundle doesn\'t exist';
  if (!a) return 'There is no enrolment to confirm';
  if (a.agency !== b.agency) return `${b.id} belongs to another agency`;
  if (!p7Covers(b, a.course)) return `${b.name} doesn't cover ${a.course}`;
  if (p7Expired(b)) return `${b.name} expired on ${fd(b.validity)} — its unused entitlements can't be used`;
  const x = p7Bal(b); if (x.purchased - x.consumed < 1) return `${b.name} has no unused entitlement left`;
  return '';
}
function p7Consume(b, a, how) {
  p7Bind(b); const ex = p7ConsOf(a.id); if (ex) return { ok: true, rec: ex, dup: true };
  const y = p7Why(b, a);
  if (y) { logA('Bundles & Licences', `${b ? b.id : '—'} · ${a ? a.learner : '—'}`, 'Blocked: consume entitlement', '—', 'No change', y); return { ok: false, why: y }; }
  const r = p7Entry(b, 'consume', 1, { lid: a.lid, ref: a.id, enrol: a.enrolId || null, courses: [a.course], by: p7Who().name, why: how });
  logA('Bundles & Licences', `${b.id} · ${a.learner}`, 'Entitlement consumed', String(p7Bal(b).available + 1), String(p7Bal(b).available), `${how} (${a.id})`);
  return { ok: true, rec: r };
}
const p7Undo = r => { const X = P7(), i = X.recs.indexOf(r); if (i >= 0) X.recs.splice(i, 1); }; // a confirmation that didn't complete consumed nothing
function p7Return(c, why) {
  const b = ADMIN.bundles.find(x => x.id === c.bundle); if (!b || p7Expired(b) || c.returned) return null;
  const r = p7Entry(b, 'return', 1, { lid: c.lid, ref: c.ref, by: p7Who().name, why }); c.returned = r.id; return r;
}

// Short course: the enrolment created in the learner's account is the confirmation; access follows the course's own period
const _seP7 = ag1ShortEnrol;
ag1ShortEnrol = function (k, a, b) {
  const w = STORE.worlds[k]; if (!w || w.enrolments.find(e => e.agyAssign === a.id)) return _seP7.apply(this, arguments);
  const c = p7Consume(b, a, 'Short-course enrolment confirmed');
  if (!c.ok) { a.status = 'Not enrolled — no entitlement'; a.awaitAct = false; a.p7Why = c.why; agyNotify('Seat not confirmed', `${a.learner}: ${a.course} — ${c.why}. No entitlement was used.`, 'g-bundle.' + b.id, 'Seats & bundles', b.agency); return null; }
  const row = (ADMIN.courses || []).find(x => x.title === a.course); a.end = new Date(now().getTime() + ((row && +row.access) || 90) * DAY).toISOString();
  let e; try { e = _seP7.apply(this, arguments); } catch (err) { if (!c.dup) p7Undo(c.rec); throw err; }
  if (!e) { if (!c.dup) p7Undo(c.rec); return e; }
  c.rec.enrol = e.id; return e;
};
// Assigning: never from an expired bundle or for a course it doesn't cover; seats left = purchased − consumed − provisional
const _asP7 = agyDoAssign;
agyDoAssign = function (b, course, ids) {
  if (b) p7Bind(b);
  const y = !b ? '' : p7Expired(b) ? `${b.name} expired on ${fd(b.validity)} — no new enrolment can use it` : !p7Covers(b, course) ? `${b.name} doesn't cover ${course}` : '';
  if (y) { logA('Bundles & Licences', `${b.id} · ${course}`, 'Blocked: assign seats', '—', 'No change', y); toast(y + '. No seat was used.', 'err'); return 0; }
  return _asP7.apply(this, arguments);
};
// NVQ: the approval of the agency application is the confirmation — refused when no entitlement can be consumed
const p7AppSeat = ap => ap && ap.agySeat ? (STORE.agy.assign || []).find(s => s.id === ap.agySeat) || null : null;
const _whyP7 = ac2AppWhy;
ac2AppWhy = function (ap, act) {
  const why = _whyP7.apply(this, arguments); if (why || act !== 'approve') return why;
  const a = p7AppSeat(ap); if (!a || p7ConsOf(a.id)) return why;
  return p7Why(ADMIN.bundles.find(x => x.id === a.bundle), a) || why;
};
function p7NvqSync() {
  (ADMIN.apps || []).filter(ap => ap.agySeat && ap.status === 'Approved').forEach(ap => {
    const a = p7AppSeat(ap); if (!a || p7ConsOf(a.id) || !P7_PROV.includes(a.status)) return;
    const b = ADMIN.bundles.find(x => x.id === a.bundle), c = p7Consume(b, a, 'NVQ admission approved');
    if (c.ok) { a.status = 'Approved'; c.rec.enrol = ap.id; } else if (!P7().rec.some(x => x.ref === a.id)) P7().rec.push({ bundle: a.bundle, ref: a.id, at: now().toISOString(), why: `${ap.id} was approved but no entitlement could be consumed: ${c.why}` });
  });
}
// Unassigning: the existing seat-return rule; a consumption is returned only before expiry
const _unP7 = ACT.agUnassign;
ACT.agUnassign = el => {
  const a = (STORE.agy.assign || []).find(x => x.id === (el && el.dataset && el.dataset.id)), r = _unP7(el);
  const act = a && MODAL && MODAL.actions.find(x => x.fn && /danger/.test(x.cls || ''));
  if (act && !act._p7) { const g = act.fn; act._p7 = true; act.fn = (...x) => {
    const b = ADMIN.bundles.find(y => y.id === a.bundle), ret = a.progress < seatRule().pct && !p7Expired(b), was = a.status, out = g(...x);
    if (a.status === 'Unassigned' && was !== 'Unassigned') { const c = p7ConsOf(a.id); if (c && ret) p7Return(c, 'Seat returned — unassigned under the seat-return rule'); else if (c) a.noReturn = true; }
    return out; }; }
  return r;
};

/* ---------- Expiry and reminders (idempotent) ---------- */
const P7_REM = [30, 14, 7];
function p7Notice(b, kind) {
  const X = P7(), key = `${b.id}|${b.validity}|${kind}`, x = p7Bal(b), remaining = Math.max(0, x.purchased - x.consumed);
  const t = kind === '0' ? 'Bundle expired' : `Bundle expires in ${kind} days`;
  const body = `${b.name} (${b.id}) ${kind === '0' ? 'expired on' : 'expires on'} ${fd(b.validity)}: ${x.purchased} purchased · ${x.consumed} used · ${remaining} unused${kind === '0' ? ' (lapsed)' : ''}. ${kind === '0' ? 'Learners already enrolled keep their access.' : 'Unused entitlements lapse at expiry; ask the Academy for an extension before then (Bundles → this bundle → Request extension).'} In-app notice (prototype — no email or SMS is sent).`;
  let ok = true; try { agyNotify(t, body, 'g-bundle.' + b.id, 'Seats & bundles', b.agency); } catch (e) { ok = false; }
  X.sent[key] = { at: agNow().toISOString(), kind, purchased: x.purchased, consumed: x.consumed, remaining, delivered: ok };
}
function p7Remind(b) {
  if (!b.validity) return; const X = P7(), d = agDays(b.validity), k = n => `${b.id}|${b.validity}|${n}`;
  if (d < 0) { if (!X.sent[k('0')]) p7Notice(b, '0'); return; }
  const due = P7_REM.filter(n => d <= n); if (!due.length) return;
  const most = due[due.length - 1];
  due.forEach(n => { if (X.sent[k(n)]) return; if (n === most) p7Notice(b, String(n)); else X.sent[k(n)] = { at: agNow().toISOString(), kind: String(n), skipped: `superseded by the ${most}-day reminder` }; });
}
function p7Reconcile() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.bundles || !STORE.agy) return;
  p7BindAll(); p7NvqSync();
  ADMIN.bundles.filter(b => b.agency).forEach(b => {
    if (p7Expired(b) && !P7().recs.some(r => r.type === 'expire' && r.bundle === b.id && r.ver === b.validity)) { const x = p7Bal(b); p7Entry(b, 'expire', x.expiredUnused, { ver: b.validity, by: 'System (bundle expiry)', why: `${x.expiredUnused} unused entitlement${x.expiredUnused === 1 ? '' : 's'} lapsed at expiry (${fd(b.validity)})` }); }
    p7Remind(b);
  });
}

/* ---------- Extensions: requested and approved before expiry (Business Admin; Super Administrator override) ---------- */
const P7_OPEN = 'Pending Business Admin approval';
const p7ExtOf = id => P7().ext.reqs.find(q => q.id === id) || null;
const p7Iso = (ymd, like) => `${ymd}${(like || '').length > 10 ? like.slice(10) : 'T12:00:00.000Z'}`;
function p7ExtRequest(bid, ymd, why) {
  const b = (ADMIN.bundles || []).find(x => x.id === bid), who = p7Who();
  const deny = S.portal === 'agency' ? (b && b.agency === AGN() ? '' : 'This bundle belongs to another agency.') : (typeof isBiz === 'function' && isBiz()) || isSA() ? '' : 'Only the agency, or the Business Admin on its behalf, can request an extension.';
  if (deny || !b) { logA('Bundles & Licences', bid || '—', 'Blocked: request bundle extension', '—', 'No change', deny || 'No such bundle'); return { ok: false, why: deny || 'That bundle doesn\'t exist.', denied: !!deny }; }
  p7Bind(b);
  if (p7Expired(b)) return { ok: false, why: `${b.name} expired on ${fd(b.validity)} — an expired bundle can't be extended or revived.` };
  if (P7().ext.reqs.some(q => q.bundle === b.id && q.state === P7_OPEN)) return { ok: false, why: 'An extension request for this bundle is already waiting for a decision.' };
  if (!ymdOk(ymd)) return { ok: false, why: 'Enter the proposed new expiry date (YYYY-MM-DD).' };
  const to = p7Iso(ymd, b.validity); if (Date.parse(to) <= Date.parse(b.validity)) return { ok: false, why: `The new expiry must be after the current one (${fd(b.validity)}).` };
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const X = P7(), q = { id: 'EXT-' + String(++X.ext.seq).padStart(4, '0'), bundle: b.id, agency: b.agency, agencyId: p7AgId(b.agency), from: b.validity, to, by: who, at: agNow().toISOString(), why: String(why).trim(), state: P7_OPEN, dec: null, hist: [{ at: agNow().toISOString(), what: 'Requested', by: who.name, role: who.role, why: String(why).trim() }], provisional: 'Prototype: the contractual basis of a longer duration is not decided (no fee or limit is applied)' };
  X.ext.reqs.unshift(q);
  logA('Bundles & Licences', `${b.id} · ${b.agency}`, 'Bundle extension requested', fd(b.validity), fd(to), q.why);
  if (typeof bizNotify === 'function') bizNotify('Bundle extension to decide', `${b.agency} · ${b.name}: ${fd(b.validity)} → ${fd(to)} (${q.id})`, 'a-bundleext');
  return { ok: true, id: q.id, req: q };
}
function p7ExtDecide(id, verb, why) {
  const q = p7ExtOf(id), me = p7Who(), b = q && (ADMIN.bundles || []).find(x => x.id === q.bundle);
  const deny = !q ? 'That request doesn\'t exist.' : S.portal !== 'admin' ? 'Extensions are decided in the admin console.' : verb === 'override' ? (isSA() ? '' : 'Only the Super Administrator can override.') : isSA() ? '' : !(typeof isBiz === 'function' && isBiz()) ? 'Only a Business Admin decides bundle extensions (or the Super Administrator by override).' : q.by && q.by.name === me.name ? 'You made this request — another Business Admin decides it (no self-approval).' : '';
  if (deny) { logA('Bundles & Licences', q ? q.bundle : id || '—', `Blocked: ${verb} bundle extension`, q ? q.state : '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (q.state !== P7_OPEN) { logA('Bundles & Licences', q.bundle, `Blocked: ${verb} bundle extension (already decided)`, q.state, 'No change', q.id); return { ok: false, why: `${q.id} is already ${q.state.toLowerCase()} — nothing changed.`, dup: true }; }
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const at = agNow().toISOString(), r = String(why).trim(), kind = verb === 'refuse' ? 'refuse' : isSA() ? 'override' : 'approve', hist = (what, w) => q.hist.push({ at, what, by: me.name, role: me.role, why: w });
  if (verb === 'refuse') { q.state = 'Refused'; q.dec = { at, by: me.name, role: me.role, why: r, kind }; hist('Refused', r); logA('Bundles & Licences', `${q.bundle} · ${q.agency}`, 'Bundle extension refused', fd(q.from), 'No change', r); agyNotify('Extension refused', `${b ? b.name : q.bundle}: the expiry stays ${fd(q.from)}. ${r}`, 'g-bundle.' + q.bundle, 'Seats & bundles', q.agency); return { ok: true, state: q.state }; }
  const lapse = !b ? 'The bundle no longer exists' : b.agency !== q.agency ? 'The bundle belongs to another agency' : p7Expired(b) ? `${b.name} expired on ${fd(b.validity)} before a decision — it can't be extended or revived` : b.validity !== q.from ? `The bundle's expiry changed since the request (${fd(q.from)} → ${fd(b.validity)})` : Date.parse(q.to) <= Date.parse(b.validity) ? 'The proposed expiry isn\'t later than the current one' : '';
  if (lapse) { q.state = p7Expired(b) ? 'Lapsed' : 'Invalidated'; q.dec = { at, by: me.name, role: me.role, why: lapse, kind: 'invalid' }; hist(q.state, lapse); logA('Bundles & Licences', `${q.bundle} · ${q.agency}`, `Bundle extension ${q.state.toLowerCase()}`, fd(q.from), 'No change', lapse); return { ok: false, why: lapse, state: q.state }; }
  (b.valHist = b.valHist || []).push({ from: b.validity, to: q.to, at, by: me.name, req: q.id });
  b.validity = q.to; q.state = 'Approved'; q.dec = { at, by: me.name, role: me.role, why: r, kind };
  hist(kind === 'override' ? 'Approved by Super Administrator override' : 'Approved', r);
  logA('Bundles & Licences', `${q.bundle} · ${q.agency}`, kind === 'override' ? 'Bundle extended (Super Administrator override)' : 'Bundle extended', fd(q.from), fd(q.to), `${r} (${q.id}) — no entitlement added; confirmed learners unchanged`);
  agyNotify('Bundle extended', `${b.name}: expiry moved from ${fd(q.from)} to ${fd(q.to)}. No entitlements were added.`, 'g-bundle.' + b.id, 'Seats & bundles', b.agency);
  return { ok: true, state: q.state };
}

/* ---------- Screens ---------- */
function p7Card(b) {
  const x = p7Bal(b), q = P7().ext.reqs.find(r => r.bundle === b.id && r.state === P7_OPEN), past = P7().ext.reqs.filter(r => r.bundle === b.id && r !== q);
  const k = (l, v) => `<div class="kpi"><span class="xs muted">${l}</span><span class="big-num num">${v}</span></div>`;
  return `<section class="card p7-ent"><h2>Entitlements</h2><div class="kpis">${k('Purchased', x.purchased)}${k('Used by confirmed learners', x.consumed)}${k('Waiting for confirmation', x.pending)}${k(x.expired ? 'Lapsed unused' : 'Available', x.expired ? x.expiredUnused : Math.max(0, x.available - x.pending))}</div>
    <p class="xs muted">An entitlement is used once, when a learner's enrolment is confirmed. Expiry ends unused entitlements only — learners already enrolled keep their access.${x.legacy ? ` ${x.legacy} earlier use${x.legacy === 1 ? '' : 's'} without a learner record ${x.legacy === 1 ? 'is' : 'are'} kept as used (reconciliation).` : ''}</p>
    ${q ? `<p class="small p7-ext">Extension ${esc(q.id)} to ${fd(q.to)} is waiting for the Business Admin. Until it is approved the bundle still expires on ${fd(b.validity)}.</p>` : x.expired ? '' : S.portal === 'agency' ? `<button class="btn btn-sm" data-act="p7ExtAsk" data-b="${esc(b.id)}">Request extension</button>` : ''}
    ${past.length ? `<ul class="list small">${past.map(r => `<li class="li">${esc(r.id)} · ${fd(r.from)} → ${fd(r.to)} · ${esc(r.state)}</li>`).join('')}</ul>` : ''}</section>`;
}
const _gbP7 = SCREENS['g-bundle'];
SCREENS['g-bundle'] = p => { p7Reconcile(); const h = _gbP7(p), b = (ADMIN.bundles || []).find(x => x.id === (p && p.id) && x.agency === AGN()); return b && typeof h === 'string' ? h.replace('<section class="card"><h2>Assignments from this bundle</h2>', p7Card(b) + '<section class="card"><h2>Assignments from this bundle</h2>') : h; };
ACT.p7ExtAsk = el => {
  const bid = el && el.dataset && el.dataset.b, b = (ADMIN.bundles || []).find(x => x.id === bid);
  if (!b || (S.portal === 'agency' && b.agency !== AGN())) { logA('Bundles & Licences', bid || '—', 'Blocked: request bundle extension', '—', 'No change', 'Another agency\'s bundle'); toast('That bundle isn\'t available.', 'err'); return false; }
  reasonDlg({ title: 'Request extension — ' + esc(b.name), ok: 'Send request', body: `<p class="small">Current expiry: <strong>${fd(b.validity)}</strong>. The Business Admin decides; until then the bundle still expires on that date. No entitlements are added.</p>`, extra: `<div class="field"><label for="p7-to">Proposed new expiry (YYYY-MM-DD)</label><input class="input" id="p7-to"></div>`,
    onOk: r => { const out = p7ExtRequest(bid, (mval('#p7-to') || '').trim(), r); if (!out.ok) { toast(out.why, 'err'); return false; } render(); toast(`Extension request ${out.id} sent.`); } });
};
const p7CanAdmin = () => S.portal === 'admin' && (isSA() || (typeof isBiz === 'function' && isBiz()));
SCREENS['a-bundleext'] = () => {
  if (!p7CanAdmin()) return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Not available</h1><p class="muted">Bundle extensions are decided by the Business Admin (or the Super Administrator).</p></div>`;
  p7Reconcile(); const rs = P7().ext.reqs, bs = (ADMIN.bundles || []).filter(b => b.agency), X = P7();
  return `${pageA('Bundle extensions and entitlements', 'Requests to extend an agency bundle, decided before its expiry. A pending request doesn\'t pause expiry; an expired bundle can\'t be revived; no entitlements are added.')}
    <section class="card"><h2>Extension requests</h2>${rs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Request</th><th>Agency</th><th>Bundle</th><th>Expiry → proposed</th><th>Requested by</th><th>Status</th><th></th></tr></thead><tbody>${rs.map(q => `<tr><td class="mono">${esc(q.id)}</td><td>${esc(q.agency)}</td><td>${esc(q.bundle)}</td><td>${fd(q.from)} → ${fd(q.to)}</td><td>${esc(q.by.name)}</td><td>${esc(q.state)}${q.dec ? `<div class="xs muted">${esc(q.dec.by)}: ${esc(q.dec.why)}</div>` : ''}</td><td>${q.state === P7_OPEN ? `${isSA() ? `<button class="btn btn-sm btn-primary" data-act="p7ExtDec" data-id="${q.id}" data-v="override">Override and extend</button>` : `<button class="btn btn-sm btn-primary" data-act="p7ExtDec" data-id="${q.id}" data-v="approve">Approve</button>`} <button class="btn btn-sm" data-act="p7ExtDec" data-id="${q.id}" data-v="refuse">Refuse</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>No extension requests.</p></div>'}</section>
    <section class="card"><h2>Entitlement balances</h2>${bs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Bundle</th><th>Agency</th><th>Expiry</th><th class="r">Purchased</th><th class="r">Used</th><th class="r">Waiting</th><th class="r">Available</th><th class="r">Lapsed</th></tr></thead><tbody>${bs.map(b => { const x = p7Bal(b); return `<tr><td>${esc(b.name)} <span class="mono xs">${esc(b.id)}</span></td><td>${esc(b.agency)}</td><td>${fd(b.validity)}</td><td class="r">${x.purchased}</td><td class="r">${x.consumed}${x.legacy ? `<span class="xs muted"> (${x.legacy} earlier)</span>` : ''}</td><td class="r">${x.pending}</td><td class="r">${Math.max(0, x.available - x.pending)}</td><td class="r">${x.expiredUnused}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><p>No agency bundles yet.</p></div>'}
    ${X.rec.length ? `<details class="small"><summary>To reconcile (${X.rec.length})</summary><ul>${X.rec.map(r => `<li>${esc(r.bundle)}: ${esc(r.why)}</li>`).join('')}</ul></details>` : ''}</section>`;
};
ACT.p7ExtDec = el => {
  const id = el && el.dataset && el.dataset.id, v = el && el.dataset && el.dataset.v, q = p7ExtOf(id);
  if (!q || !p7CanAdmin()) { logA('Bundles & Licences', id || '—', `Blocked: ${v} bundle extension`, '—', 'No change', 'Not allowed'); toast('Only a Business Admin (or the Super Administrator) decides extensions.', 'err'); return false; }
  reasonDlg({ title: `${v === 'refuse' ? 'Refuse' : v === 'override' ? 'Override and extend' : 'Approve extension'} — ${esc(q.id)}`, ok: v === 'refuse' ? 'Refuse' : 'Extend bundle', danger: v === 'refuse', body: `<p class="small">${esc(q.agency)} · ${esc(q.bundle)}: ${fd(q.from)} → ${fd(q.to)}. Checked again now: the bundle must not have expired.</p>`,
    onOk: r => { const out = p7ExtDecide(id, v, r); if (out.denied) { toast(out.why, 'err'); return; } if (!out.ok && !out.state) { toast(out.why, 'err'); return false; } render(); toast(out.ok ? `${q.id}: ${out.state.toLowerCase()}.` : `${q.id}: ${out.state.toLowerCase()} — ${out.why}`, out.ok ? 'ok' : 'err'); } });
};
BNAV.forEach(g => { if (g[0] === 'Commercial') g[1].push(['a-bundleext', 'Bundle extensions', 'clock']); });
ANAV.forEach(g => { if (g[0] === 'Commercial') g[1].push(['a-bundleext', 'Bundle extensions', 'clock']); });
BIZ_ROUTES.add('a-bundleext');
if (typeof ROUTE_PURPOSE !== 'undefined') ROUTE_PURPOSE['a-bundleext'] = 'Agency bundle extension requests and each bundle\'s purchased, used and available entitlements.';

/* ---------- Kept in step: rebuilt stores, renders ---------- */
const _isP7 = initStore; initStore = function () { const r = _isP7.apply(this, arguments); try { p7BindAll(); } catch (e) { /* bound on the next render */ } return r; };
const _baP7 = buildAdmin; buildAdmin = function () { const r = _baP7.apply(this, arguments); try { p7BindAll(); } catch (e) { /* idem */ } return r; };
const _abP7 = agyBundles; agyBundles = function () { const r = _abP7.apply(this, arguments); r.forEach(p7Bind); return r; };
const _rdP7 = render; render = function () { try { p7Reconcile(); } catch (e) { /* the page still draws */ } return _rdP7.apply(this, arguments); };

UXC.push(['P7', 'Agency entitlements, expiry and extensions (12 Nov 2026)', [
  'Each agency bundle has an entitlement ledger: purchased, used by confirmed learners, waiting for confirmation, available, and lapsed at expiry. An entitlement is used once, when a learner\'s enrolment is confirmed — not when a learner is assigned and still waiting for admission or activation.',
  'An expired bundle can\'t be used, returned to or revived. Agencies are reminded 30, 14 and 7 days before expiry and at expiry. An extension is requested before expiry and approved by the Business Admin before expiry; it adds no entitlements. Learners already enrolled keep their access; new agency short-course enrolments last the course\'s own access period.']]);
