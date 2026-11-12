/* ---------- P2 — Terms versions, batch time zones and the one clock (11 Nov 2026) ----------
   Infrastructure only. Nothing here changes a deposit, a hold, a payment date, a seat, access, assignment of batches or any signed
   term. The revised terms (P0) exist as a draft definition that cannot be activated (client approval of the wording, U-01, and the
   activation rule, U-11, are outstanding).

   Terms versions: LEGACY-1 is the only version in force. A sign-up started from now on records which version governed it when it
   started (signup.termsRef → STORE.terms.links). Existing records aren't rewritten: their version is resolved, deterministically and
   without writing, as LEGACY-1 — the revised version has never been in force, so nothing else could govern them — and what can't be
   verified about their agreement (no signature, no kept copy, no sign-up record) is flagged for reconciliation, never inferred.

   Batch time zones: b.tz holds an IANA identifier (Area/Location, validated by Intl; fixed offsets refused). Existing batches have
   none: they read Europe/London as a labelled compatibility fallback only — the zone the existing schedule code (cbToday) already
   uses — and are listed as needing configuration (U-04). No rendered date or stored time changes.

   Calendar utilities: batch-local calendar dates and day boundaries, DST-safe (boundaries are searched, never assumed 24 hours). */

/* ---------- Time zones ---------- */
const P2_TZ_AREAS = /^(Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Za-z0-9_+\-]+(\/[A-Za-z0-9_+\-]+)?$/i; // any letter case on input; the canonical identifier is stored
const P2_TZ_OFFERED = ['Europe/London', 'Asia/Dubai']; // offered in the picker; neither is a default
const P2_TZ_COMPAT = 'Europe/London'; // compatibility fallback for batches without a zone (U-04 open) — not an Academy rule
// The canonical identifier, or null (fixed offsets such as UTC+1, +04:00 or Etc/GMT-4 are refused)
function tzCanon(tz) {
  if (typeof tz !== 'string' || !P2_TZ_AREAS.test(tz.trim())) return null;
  try { const r = new Intl.DateTimeFormat('en-GB', { timeZone: tz.trim() }).resolvedOptions().timeZone; return P2_TZ_AREAS.test(r) ? r : null; } catch (e) { return null; }
}
const tzOk = tz => !!tzCanon(tz) && tzCanon(tz) === tz;
const P2_PARTS = new Map();
const p2Parts = (ms, tz) => { let f = P2_PARTS.get(tz); if (!f) { f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); P2_PARTS.set(tz, f); } const o = {}; f.formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; }); return o; };
const p2Ms = v => (typeof v === 'number' ? v : v instanceof Date ? v.getTime() : Date.parse(v));
// The zone's offset from UTC at an instant, in minutes (London: 0 in winter, 60 in summer; Dubai: 240)
function tzOffsetMin(at, tz) { const ms = p2Ms(at), p = p2Parts(ms, tz); return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / 60000); }

/* ---------- Calendar dates (YYYY-MM-DD) ---------- */
const ymdOk = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const ymdIn = (at, tz) => { const p = p2Parts(p2Ms(at), tz); return `${p.year}-${p.month}-${p.day}`; };
const ymdAdd = (ymd, n) => { if (!ymdOk(ymd)) throw new Error('ymdAdd: not a date ' + ymd); const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const ymdCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// The first instant of a local calendar day (searched minute by minute in a ±15 h window, so DST gaps and odd offsets are exact)
function dayStart(ymd, tz) {
  if (!ymdOk(ymd)) throw new Error('dayStart: not a date ' + ymd);
  const [y, m, d] = ymd.split('-').map(Number), base = Date.UTC(y, m - 1, d) / 60000; let lo = base - 900, hi = base + 900;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (ymdIn(mid * 60000, tz) >= ymd) hi = mid; else lo = mid + 1; }
  return lo * 60000;
}
const dayEnd = (ymd, tz) => dayStart(ymdAdd(ymd, 1), tz); // exclusive: the first instant of the next local day
const dayHours = (ymd, tz) => (dayEnd(ymd, tz) - dayStart(ymd, tz)) / 36e5;
// A deadline "by the end of <ymd>" in a zone: true while the instant is before the next local day begins
const byEndOfDay = (at, ymd, tz) => p2Ms(at) < dayEnd(ymd, tz);
// "2 Jan 2027, 23:59 GMT (Europe/London)" — the zone named, so a reader in another zone is never misled
const fmtTz = (at, tz) => `${dtf({ timeZone: tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).format(new Date(p2Ms(at)))} (${tz})`;

/* ---------- Batch time zones ---------- */
function batchTz(b) {
  if (b && tzOk(b.tz)) return { tz: b.tz, source: 'configured' };
  return { tz: P2_TZ_COMPAT, source: 'compat', note: 'Not configured — Europe/London is a compatibility fallback, not an Academy decision (U-04).' };
}
const batchStartYmd = b => (b && b.start ? ymdIn(b.start, batchTz(b).tz) : null);
const p2TzPending = () => ((typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches) || []).filter(b => !tzOk(b.tz)).map(b => b.code);
// FUTURE (P4) — the revised deposit cutoff for a batch. Not called by any sign-up, checkout, hold or access path.
function p2CutoffPreview(b) {
  const z = batchTz(b), start = batchStartYmd(b); if (!start) return null;
  const cutoff = ymdAdd(start, -28), last = ymdAdd(cutoff, -1);
  return { tz: z.tz, tzSource: z.source, startYmd: start, cutoffYmd: cutoff, lastDepositYmd: last, newDepositsBefore: dayEnd(last, z.tz), balanceDueBefore: dayEnd(cutoff, z.tz) };
}
const p2TzWhy = () => (typeof w0BatchAdminWhy === 'function' ? w0BatchAdminWhy() : (isSA() ? '' : 'Only batch administrators can do this.'));
// Set or change a batch's Academy time zone (batch administrators; reason required; audited; history kept). Rendered dates don't move.
function p2SetTz(b, tz, why) {
  const deny = p2TzWhy(); if (deny) return { ok: false, why: deny, denied: true };
  const c = tzCanon(tz); if (!b) return { ok: false, why: 'That batch is not available.' };
  if (!c) return { ok: false, why: 'Enter an IANA time zone such as Europe/London or Asia/Dubai — not a fixed offset like UTC+1.' };
  if (!why || !String(why).trim()) return { ok: false, why: 'Enter a reason.' };
  if (c === b.tz) return { ok: false, why: 'That is already the batch\'s time zone.' };
  const from = tzOk(b.tz) ? b.tz : null, at = now().toISOString();
  b.tz = c; (b.tzHist = b.tzHist || []).push({ from, to: c, at, by: (ADMIN && ADMIN.me && ADMIN.me.name) || '—', why: String(why).trim() });
  logA('Batches', `${b.label || b.code} (${b.code})`, from ? 'Academy time zone changed' : 'Academy time zone set', from || 'Not configured (compatibility fallback)', c, String(why).trim());
  return { ok: true, tz: c };
}
ACT.p2Tz = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), deny = p2TzWhy();
  if (deny) return w0Deny('Batches', (b && b.code) || '—', 'set a batch\'s time zone', deny);
  if (!b) { toast('That batch is not available.', 'err'); return; }
  const z = batchTz(b), cur = z.source === 'configured' ? z.tz : '';
  reasonDlg({ title: 'Academy time zone — ' + esc(b.code), ok: 'Save time zone',
    body: `<p class="small">The IANA time zone the Academy uses for this batch's calendar dates. Shown dates and stored times don't change. ${z.source === 'compat' ? '<strong>Not configured yet</strong> — Europe/London is used only as a compatibility fallback (no Academy default has been decided, U-04).' : 'Current: <strong>' + esc(cur) + '</strong>.'}</p>`,
    extra: `<div class="field"><label for="p2-tz">Time zone</label><select class="select" id="p2-tz">${P2_TZ_OFFERED.map(t => `<option value="${t}" ${t === cur ? 'selected' : ''}>${t}</option>`).join('')}<option value="other" ${cur && !P2_TZ_OFFERED.includes(cur) ? 'selected' : ''}>Other IANA identifier…</option></select></div><div class="field"><label for="p2-tz-o">Other IANA identifier (only with "Other")</label><input class="input" id="p2-tz-o" value="${cur && !P2_TZ_OFFERED.includes(cur) ? esc(cur) : ''}" placeholder="e.g. Asia/Kolkata"></div>`,
    onOk: r => { const s = mval('#p2-tz'), tz = s === 'other' ? mval('#p2-tz-o') : s, out = p2SetTz(b, tz, r); if (out.denied) return w0Deny('Batches', b.code, 'set a batch\'s time zone', out.why); if (!out.ok) { fieldErr(s === 'other' ? '#p2-tz-o' : '#p2-tz', out.why); return false; } render(); toast(`${b.code}: Academy time zone ${out.tz}. Shown dates are unchanged.`); } });
};
const _bdP2 = batchDetail;
batchDetail = function (code, t) {
  let h = _bdP2.apply(this, arguments); const b = ADMIN.batches.find(x => x.code === code); if (!b || typeof h !== 'string' || S.portal !== 'admin') return h;
  const z = batchTz(b), line = `<p class="small p2-tz">Academy time zone: ${z.source === 'configured' ? `<strong>${esc(z.tz)}</strong>` : `<span class="muted">Not configured — ${esc(P2_TZ_COMPAT)} used as a compatibility fallback (U-04)</span>`}${p2TzWhy() ? '' : ` <button class="btn btn-sm" data-act="p2Tz" data-id="${esc(b.code)}">${z.source === 'configured' ? 'Change' : 'Set'} time zone</button>`}</p>`;
  const i = h.indexOf('<p class="xs muted aafb-codes">'), j = i < 0 ? -1 : h.indexOf('</p>', i);
  return j > 0 ? h.slice(0, j + 4) + line + h.slice(j + 4) : h;
};

/* ---------- Terms versions ---------- */
const P2_POLICIES = Object.freeze({
  'LEGACY-1': Object.freeze({ id: 'LEGACY-1', title: 'Legacy terms (before the P0 revised terms)', kind: 'legacy', status: 'In force',
    rules: Object.freeze({ deposit: 'Offered when the batch starts 28 days or more away (CH-10, rounded days)', hold: 'Payment-time seat hold of 1–28 days (S4-07)', firstPayment: 'Due at batch start, collected at checkout (PD-CB-09)', access: 'At sign-up completion (CH-10 / CH-11)', release: 'Seat released at hold expiry, deposit held (P-32, PD-DP-16)', forfeiture: 'None' }) }),
  'REVISED-1': Object.freeze({ id: 'REVISED-1', title: 'Revised terms (P0) — draft, not activatable', kind: 'revised', status: 'Draft',
    rules: Object.freeze({ deposit: 'Last new deposit the day before the cutoff (start − 28 calendar days, batch time zone) (PD-P0-03)', firstPayment: 'First-instalment balance by the end of the cutoff day (PD-P0-04)', access: 'Verified first instalment and a commenced batch (PD-P0-07)', release: 'Forfeiture and release at the cutoff (PD-P0-05)', bankTransfer: 'Verified receipt time decides timeliness (PD-P0-06)' }),
    needs: Object.freeze(['U-01: client approval of the revised offer-letter, {{payment_terms}} and forfeiture wording', 'U-11: activation date, and which version an in-progress sign-up finishes under']),
    activation: Object.freeze({ signed: 'Signed enrolments stay on the version they signed (LEGACY-1).', inProgress: 'A sign-up keeps the version linked when it started (signup.termsRef); U-11 decides whether any may switch.', new: 'Sign-ups started after activation would link REVISED-1.' }) })
});
const p2Active = () => 'LEGACY-1'; // the only version in force
const TERMS = () => { if (!STORE.terms || STORE.terms.v !== 1) STORE.terms = { v: 1, seq: 0, links: {}, log: [] }; return STORE.terms; };
// Activation is refused in P2 whoever asks: the wording and the activation rule are not approved
function p2Activate(id, why) {
  const p = P2_POLICIES[id], at = now().toISOString(), reason = p && p.kind === 'revised' ? p.needs.join(' · ') : 'Unknown or already in force';
  TERMS().log.unshift({ at, what: 'Activation refused', id: id || '—', why: reason, asked: why || '' });
  if (typeof logA === 'function' && typeof ADMIN !== 'undefined' && ADMIN && ADMIN.audit) logA('Settings', `Terms version ${id || '—'}`, 'Blocked: activate terms version', p ? p.status : '—', 'No change', reason);
  return false;
}
// A sign-up started from now on records the version that governed it at the start (its offer, fees and deadlines are pinned then)
function p2Link(w, basis) {
  const s = w && w.signup; if (!s || s.termsRef) return s ? s.termsRef : null;
  const T = TERMS(), id = 'TL-' + String(++T.seq).padStart(5, '0');
  T.links[id] = Object.freeze({ id, policy: p2Active(), v: w.v || null, lid: (w.me && w.me.id) || null, prog: s.prog || null, letterV: s.letterV || null, at: now().toISOString(), basis: basis || 'Sign-up started' });
  s.termsRef = id; return id;
}
const _startP2 = ch8StartSignup;
ch8StartSignup = function (w) { const r = _startP2.apply(this, arguments); try { p2Link(w, 'Sign-up started'); } catch (e) { /* a missing link is resolved below */ } return r; };
// Which version governs a learner account, and what is known about its agreement. Pure: nothing is written.
function p2Terms(w) {
  if (!w || !w.me) return null;
  const s = w.signup, nvq = w.nvq && (w.flags && (w.flags.nvq || w.flags.admitted) || s), link = s && s.termsRef && TERMS().links[s.termsRef];
  if (!s && !nvq) return null;
  const snap = s && s.sig && s.sig.snapshot;
  const agreement = !s ? 'no sign-up record' : !s.done ? 'in progress (terms pinned at start)' : s.sig && snap ? 'signed (exact copy kept)' : s.sig ? 'signed — exact copy not kept' : 'completed without a signature on record';
  const flagged = !['in progress (terms pinned at start)', 'signed (exact copy kept)'].includes(agreement);
  return { v: w.v || null, lid: w.me.id, name: (w.me.first || '') + ' ' + (w.me.last || ''), policy: link ? link.policy : 'LEGACY-1', ref: link ? link.id : null,
    basis: link ? `${link.basis} (${link.at.slice(0, 10)})` : 'Before terms versions were recorded — only LEGACY-1 has ever been in force', agreement, flagged };
}
// Every learner with an NVQ: accounts, then roster learners who have no account (their agreement can't be checked here)
function p2TermsAll() {
  const out = [], seen = new Set();
  Object.keys(STORE.worlds || {}).forEach(k => { const w = STORE.worlds[k], t = p2Terms(w); if (t && !seen.has(t.lid)) { seen.add(t.lid); out.push(t); } });
  ((typeof ADMIN !== 'undefined' && ADMIN && ADMIN.learners) || []).forEach(l => { if (seen.has(l.id) || !(l.courses || []).some(c => /Diploma|NVQ|Level \d/.test(c))) return; seen.add(l.id); out.push({ v: null, lid: l.id, name: l.name, policy: 'LEGACY-1', ref: null, basis: 'Historical enrolment record — only LEGACY-1 has ever been in force', agreement: 'no learner account (historical record)', flagged: true }); });
  return out;
}
const p2Reconcile = () => p2TermsAll().filter(t => t.flagged);

/* ---------- Admin view: Batches list (read-only summary) ---------- */
const _abP2 = SCREENS['a-batches'];
SCREENS['a-batches'] = p => {
  const h = _abP2(p); if ((p && p.id) || typeof h !== 'string' || S.portal !== 'admin' || p2TzWhy()) return h;
  const all = p2TermsAll(), rec = all.filter(t => t.flagged), pend = p2TzPending(), by = {}; all.forEach(t => { by[t.agreement] = (by[t.agreement] || 0) + 1; });
  return h + `<section class="card p2-card"><h2>Terms versions and batch time zones</h2>
    <p class="small"><strong>${esc(P2_POLICIES['LEGACY-1'].title)}</strong> — in force for every learner. <strong>${esc(P2_POLICIES['REVISED-1'].title)}</strong> — can't be activated until: ${P2_POLICIES['REVISED-1'].needs.map(esc).join('; ')}.</p>
    <p class="small">${plural(all.length, 'learner')} on legacy terms: ${Object.keys(by).sort().map(k => `${esc(k)} ${by[k]}`).join(' · ')}. ${rec.length ? `<strong>${plural(rec.length, 'record')} to reconcile</strong> (agreement not verifiable here — kept as recorded, nothing inferred).` : 'Nothing to reconcile.'}</p>
    <p class="small">${pend.length ? `<strong>${plural(pend.length, 'batch', 'batches')} without an Academy time zone</strong> (U-04: no default decided; Europe/London is read only as a compatibility fallback): ${pend.map(esc).join(', ')}.` : 'Every batch has an Academy time zone.'}</p></section>`;
};

/* ---------- Ledgers created, reset and saved ---------- */
const _isP2 = initStore;
initStore = function () { STORE.terms = { v: 1, seq: 0, links: {}, log: [] }; const r = _isP2.apply(this, arguments); if (!STORE.terms) TERMS(); return r; };
const _prP2 = fxPrune;
fxPrune = function () { const r = _prP2.apply(this, arguments); STORE.terms = { v: 1, seq: 0, links: {}, log: [] }; return r; };
const _resetP2 = ACT.resetDemo;
ACT.resetDemo = function () { Clock.unfreeze(); return _resetP2.apply(this, arguments); }; // a frozen test instant never survives Reset demo
if (typeof STORE !== 'undefined' && !STORE.terms) TERMS();
// A copy saved before STORE.terms (and STORE.seats / STORE.cbr) existed is restored as before
const _restoreP2 = fcpRestore;
fcpRestore = function () {
  try {
    const ls = fcpLS(), raw = ls && ls.getItem(FCP_KEY), o = raw ? JSON.parse(raw) : null, cur = fcpSig();
    if (o && o.v === FCP_V && o.fx === 'client' && o.sig !== cur && [['terms'], ['terms', 'seats'], ['terms', 'seats', 'cbr']].some(k => o.sig === p1SigWithout(k))) { o.sig = cur; ls.setItem(FCP_KEY, JSON.stringify(o)); FCP.p2Up = true; }
  } catch (e) { /* the original restore decides */ }
  return _restoreP2.apply(this, arguments);
};
