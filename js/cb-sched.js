/* ============================================================
   CB7 — Duration-based schedule engine (approved plan, section C; PD-CB-08 and PD-CB-44…47 in PROVISIONAL-DECISIONS.md).
   Pure functions, no screens and no stored state: the dates and amounts of a payment schedule from a batch start date (the
   anchor), the programme duration and the number of payments. Loads straight after e1-sched.js.
   - Dates are calendar dates ("YYYY-MM-DD", Europe/London). No times are kept, so clock changes never move a due date.
   - Payment 1 is due on the anchor. Every due date is on or after the anchor and before the course end (anchor + duration).
   - Months and years: when the duration in months divides by the count, payments are that many whole months apart, each
     worked out from the anchor (31 Jan → 28 Feb → 31 Mar: a short month never pulls later dates back). Otherwise — and always
     for days and weeks — the duration's real number of days T is split: payment i is due floor(i·T/k) days after the anchor.
   - A count that would put two payments on one day is refused (k > T), as is any schedule whose dates are not all different.
   - Amounts: e1SchedP (E1 rounding) — integer pence, the last payment absorbs the rounding, the total equals the fee exactly.
   - CB_SCHED_RULE names this algorithm. Approved packages and learners' pinned schedules record it, so a later rule can never
     change terms already approved or agreed. Nothing here reads or writes an existing schedule.
   ============================================================ */
'use strict';

const CB_SCHED_RULE = 'CB-SCHED-1';
const CB_UNITS = ['days', 'weeks', 'months', 'years'];
const CB_K_MAX = E1_SCHED_MAX; // 1–24 payments, the E1 maximum (PD-CB-44)
const CB_DUR_MAX = 999;

/* ---------- Calendar dates (UTC arithmetic on Y-M-D only; never a local time) ---------- */
const cbYmdOk = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && cbYmd(cbParts(s)) === s;
const cbParts = s => { const [y, m, d] = String(s).split('-').map(Number); return { y, m, d }; };
const cbPad = (n, w = 2) => String(n).padStart(w, '0');
const cbYmd = ({ y, m, d }) => { const t = new Date(Date.UTC(y, m - 1, d)); return `${cbPad(t.getUTCFullYear(), 4)}-${cbPad(t.getUTCMonth() + 1)}-${cbPad(t.getUTCDate())}`; };
const cbDim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // days in month m (1–12) of year y
const cbAddDays = (s, n) => { const { y, m, d } = cbParts(s); return cbYmd({ y, m, d: d + n }); };
// Month arithmetic from the anchor, with the month-end clamp (31 Jan + 1 month = 28 Feb, or 29 Feb in a leap year)
function cbAddMonths(s, n) {
  const { y, m, d } = cbParts(s), t = (m - 1) + n, Y = y + Math.floor(t / 12), M = ((t % 12) + 12) % 12 + 1;
  return cbYmd({ y: Y, m: M, d: Math.min(d, cbDim(Y, M)) });
}
const cbDaysBetween = (a, b) => { const A = cbParts(a), B = cbParts(b); return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / DAY); };
// Course end (exclusive): days → +n, weeks → +7n, months → +n months, years → +12n months
function cbAddDur(s, dur) {
  const n = dur.n; return dur.unit === 'days' ? cbAddDays(s, n) : dur.unit === 'weeks' ? cbAddDays(s, 7 * n) : cbAddMonths(s, dur.unit === 'years' ? 12 * n : n);
}
// "1 Feb 2027" for a calendar date, the same in every time zone
const cbFd = s => (cbYmdOk(s) ? dtf({ timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s + 'T00:00:00Z')).replace(/\bSept\b/, 'Sep') : '—');
const cbFdShort = s => (cbYmdOk(s) ? dtf({ timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(s + 'T00:00:00Z')).replace(/\bSept\b/, 'Sep') : '—');
// Today as a calendar date in Europe/London (the demo clock)
function cbToday(at) {
  const p = dtf({ timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at ? new Date(at) : now()), g = t => (p.find(x => x.type === t) || {}).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
// A stored date or date-time ("2026-11-02T09:00:00Z", "2026-11-02") as a calendar date in Europe/London
const cbYmdOf = v => (cbYmdOk(v) ? v : v ? cbToday(v) : null);

/* ---------- Inputs ---------- */
// A duration {n, unit}, or null when it isn't one (n a whole number 1–999, unit days / weeks / months / years)
const cbDurOk = dur => !!dur && Number.isInteger(dur.n) && dur.n >= 1 && dur.n <= CB_DUR_MAX && CB_UNITS.includes(dur.unit);
const cbKOk = k => Number.isInteger(k) && k >= 1 && k <= CB_K_MAX;
const cbMonthsOf = dur => (dur.unit === 'years' ? 12 * dur.n : dur.unit === 'months' ? dur.n : null);
// Which rule a duration and count use: 'full' (one payment), 'months' (whole months apart) or 'days'
function cbRuleOf(dur, k) {
  if (k === 1) return { kind: 'full' };
  const M = cbMonthsOf(dur); if (M != null && M % k === 0) return { kind: 'months', step: M / k };
  return { kind: 'days' };
}

/* ---------- The schedule ---------- */
// Due dates for an anchor: { dates, end, kind, step?, T? } or { why } when no valid schedule exists
function cbSchedDates(anchor, dur, k) {
  if (!cbYmdOk(anchor)) return { why: 'The batch start date isn\'t a valid date.' };
  if (!cbDurOk(dur)) return { why: 'The course duration must be a whole number from 1 to 999 days, weeks, months or years.' };
  if (!cbKOk(k)) return { why: `The number of payments must be a whole number from 1 to ${CB_K_MAX}.` };
  const end = cbAddDur(anchor, dur), rule = cbRuleOf(dur, k); let dates, T;
  if (rule.kind === 'full') dates = [anchor];
  else if (rule.kind === 'months') dates = Array.from({ length: k }, (_, i) => cbAddMonths(anchor, i * rule.step));
  else {
    T = cbDaysBetween(anchor, end);
    if (k > T) return { why: `${k} payments can't fit into ${plural(T, 'day')}: two payments would fall on the same day.` };
    dates = Array.from({ length: k }, (_, i) => cbAddDays(anchor, Math.floor(i * T / k)));
  }
  // every schedule is checked, whichever rule made it: distinct dates, in order, from the anchor and before the course end
  if (new Set(dates).size !== dates.length) return { why: 'Two payments would fall on the same day.' };
  if (dates[0] !== anchor || dates.some((x, i) => (i && x <= dates[i - 1]) || x >= end)) return { why: 'The payments don\'t fit within the course duration.' };
  return { dates, end, kind: rule.kind, step: rule.step, T };
}
// The full schedule: { rows: [{ n, due, amount, pence }], total, end, kind, … } or { why }
function cbSched(anchor, dur, fee, k) {
  const d = cbSchedDates(anchor, dur, k); if (d.why) return d;
  const p = e1SchedP(fee, k); if (!p) return { why: `${money(fee, 'GBP')} can't be split into ${plural(k, 'payment')}: the fee must be in whole pence and every payment at least £0.01.` };
  return { ...d, rule: CB_SCHED_RULE, rows: d.dates.map((due, i) => ({ n: i + 1, due, amount: p[i] / 100, pence: p[i] })), total: p.reduce((a, x) => a + x, 0) / 100 };
}

/* ---------- Checking an option before any batch exists ----------
   Whether a count works for a duration doesn't depend on the batch start for these inputs: the day rule only refuses k > T,
   and T is fixed for days (n) and weeks (7n), and at least 28 days for any duration in months or years (k ≤ 24 always fits).
   cbOptWhy still checks every anchor over a four-year cycle, so the answer is proved, not assumed. */
const CB_CYCLE0 = '2027-01-01', CB_CYCLE = 1461;
const CB_WHY_CACHE = new Map();
function cbOptWhy(dur, k, fee) {
  if (!cbDurOk(dur)) return 'Set the course duration (Course Details) first — a whole number of days, weeks, months or years.';
  if (!cbKOk(k)) return `Choose 1 to ${CB_K_MAX} payments.`;
  if (fee != null && !e1SchedP(fee, k)) return `${money(fee, 'GBP')} can't be split into ${plural(k, 'payment')} (each at least £0.01, whole pence).`;
  const key = `${dur.n}|${dur.unit}|${k}`;
  if (!CB_WHY_CACHE.has(key)) { let why = ''; for (let i = 0; i < CB_CYCLE && !why; i++) why = cbSchedDates(cbAddDays(CB_CYCLE0, i), dur, k).why || ''; CB_WHY_CACHE.set(key, why); }
  return CB_WHY_CACHE.get(key);
}
// The rule in words, the same for every batch: "At batch start" · "Every 2 months from batch start" · "Every 45–46 days from batch start"
function cbRuleTxt(dur, k) {
  const r = cbRuleOf(dur, k);
  if (r.kind === 'full') return 'Paid in full at batch start';
  if (r.kind === 'months') return r.step === 1 ? 'Monthly from batch start' : `Every ${r.step} months from batch start`;
  const g = cbGaps(dur, k); return g ? `Every ${g[0] === g[1] ? g[0] : g[0] + '–' + g[1]} days from batch start` : '—';
}
// The shortest and longest gap between payments over every batch start in a four-year cycle (day rule only)
function cbGaps(dur, k) {
  if (!cbDurOk(dur) || !cbKOk(k) || k < 2) return null; let lo = Infinity, hi = 0;
  for (let i = 0; i < CB_CYCLE; i += dur.unit === 'days' || dur.unit === 'weeks' ? CB_CYCLE : 1) { const d = cbSchedDates(cbAddDays(CB_CYCLE0, i), dur, k); if (d.why) return null; d.dates.slice(1).forEach((x, j) => { const g = cbDaysBetween(d.dates[j], x); lo = Math.min(lo, g); hi = Math.max(hi, g); }); }
  return [lo, hi];
}
// The due points relative to the batch start: "Batch start · +2 months · +4 months" (day rule: for the given example start)
function cbPointsTxt(dur, k, sample) {
  const r = cbRuleOf(dur, k); if (r.kind === 'full') return 'Batch start';
  if (r.kind === 'months') return ['Batch start'].concat(Array.from({ length: k - 1 }, (_, i) => `+${(i + 1) * r.step} month${(i + 1) * r.step === 1 ? '' : 's'}`)).join(' · ');
  const d = cbSchedDates(sample || CB_SAMPLE, dur, k); if (d.why) return '—';
  return ['Batch start'].concat(d.dates.slice(1).map(x => `+${cbDaysBetween(d.dates[0], x)} days`)).join(' · ');
}
// "4 × £600.00" · "6 × £257.14 + £257.16" · "£2,400.00" (pay in full)
const cbAmtTxt = (fee, k) => (k === 1 ? (e1SchedP(fee, 1) ? money(fee, 'GBP') : '—') : e1SchedTxt(fee, k));
const CB_SAMPLE = '2027-02-01'; // the sample batch start used for worked examples (actual dates are fixed per learner)

/* ---------- Late enrolment and batch-date changes (used when a learner's schedule is pinned — CB9) ----------
   Late enrolment (PD-CB-10): the anchor stays the batch start; payments due before the enrolment date J are due on J
   (catch-up, collected at checkout); later payments keep their dates. Each row keeps the date the schedule gave it (sched). */
function cbLate(rows, J) {
  return rows.map(r => (cbYmdOk(J) && r.due < J ? { ...r, sched: r.due, due: J, catchUp: true } : { ...r, sched: r.due, catchUp: false }));
}
// Batch start changed before it starts (PD-CB-10): unpaid rows get the dates the same rule gives from the new start; paid rows,
// amounts and the count never change. Returns the new rows, or { why } when the new start gives no valid schedule.
function cbRedate(rows, anchor, dur, k, J, paid) {
  const d = cbSchedDates(anchor, dur, k); if (d.why) return d;
  return { rows: rows.map((r, i) => { if (paid(r)) return { ...r }; const s = d.dates[i], late = cbYmdOk(J) && s < J; return { ...r, sched: s, due: late ? J : s, catchUp: late }; }) };
}
