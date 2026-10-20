/* ============================================================
   E1 instalment rounding (provisional prototype decision, 20 Oct 2026 — supersedes the "divides to the penny" rule of
   PD-R1-03 / PD-E1-04). The one place an instalment amount is worked out: the plan check, the payment summary, Finance's table
   and review, the learner's sign-up and checkout, and the payment rows all call this. Loads straight after core.js.
   In integer pence: every instalment but the last is fee / n rounded to the nearest penny; the last takes the difference,
   so the schedule always totals the agreed fee exactly (never over or under). An even split gives n equal amounts, the same
   as before. Payment rows already recorded are never recalculated from it.
   ============================================================ */
'use strict';

const E1_SCHED_MAX = 24;
const e1Pence = x => Math.round(Number(x) * 100);
// The schedule in pence, or null when no valid schedule exists (fee not a positive whole-pence amount, count not 1–24, or an
// instalment that would be zero or less)
function e1SchedP(fee, n) {
  const t = e1Pence(fee);
  if (!Number.isFinite(Number(fee)) || !(t > 0) || Math.abs(Number(fee) * 100 - t) > 1e-6) return null;
  if (!Number.isInteger(n) || n < 1 || n > E1_SCHED_MAX) return null;
  const per = Math.round(t / n), last = t - per * (n - 1);
  if (per <= 0 || last <= 0) return null;
  return Array.from({ length: n }, (_, i) => (i < n - 1 ? per : last));
}
// The same schedule in pounds (what payment rows and money() take)
const e1Sched = (fee, n) => { const s = e1SchedP(fee, n); return s && s.map(p => p / 100); };
// Instalment k (0-based) and the first instalment, in pounds (null when there is no valid schedule)
const e1InstAt = (fee, n, k) => { const s = e1Sched(fee, n); return s ? s[Math.min(Math.max(k, 0), s.length - 1)] : null; };
const e1First = (fee, n) => e1InstAt(fee, n, 0);
const e1Even = s => !!s && s.every(x => x === s[0]);
// "6 × £250.00" or "5 × £166.67 + £166.65"
function e1SchedTxt(fee, n) {
  const s = e1Sched(fee, n); if (!s) return '—';
  return e1Even(s) ? `${s.length} × ${money(s[0], 'GBP')}` : `${s.length - 1} × ${money(s[0], 'GBP')} + ${money(s[s.length - 1], 'GBP')}`;
}
// After "N monthly instalments" / "N monthly payments": " of £250.00", or " (5 × £166.67 and a final £166.65)"
function e1InstTxt(fee, n) {
  const s = e1Sched(fee, n); if (!s) return '';
  return e1Even(s) ? ` of ${money(s[0], 'GBP')}` : ` (${s.length - 1} × ${money(s[0], 'GBP')} and a final ${money(s[s.length - 1], 'GBP')})`;
}
// Split an outstanding amount in two (Finance "Adjust schedule"): pence-safe; the two parts total the amount exactly
function e1Halves(amount) {
  const t = e1Pence(amount); if (!(t >= 2)) return null;
  const a = Math.ceil(t / 2); return [a / 100, (t - a) / 100];
}
// Deep-frozen copy, for the schedule snapshots kept with a Finance proposal and a plan version
const e1Freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(e1Freeze); Object.freeze(o); } return o; };
