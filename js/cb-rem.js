/* ============================================================
   CB10 — Simulated payment reminders (approved plan; PD-CB-67…72 in PROVISIONAL-DECISIONS.md).
   The only source is each learner's pinned dated schedule (CB9): no reminder is ever produced for an unapproved or unchosen
   option, a learner on older terms, a deposit balance or a paid payment. A deterministic daily job is simulated: from the day
   after its last run up to the simulation date, each day it checks every unpaid pinned payment for
     - "upcoming": 7 days before the due date (provisional lead time, PD-CB-06 / Q-CB-04),
     - "due": on the due date,
     - "overdue (Day 15)" and "overdue (Day 30)": the existing overdue policy days.
   Each (learner, payment, kind) is recorded at most once (key), so re-renders, rebuilds and identity switches never duplicate a
   reminder or a notification. The simulation date is the demo "today" plus an offset that Finance moves with "Advance"; the
   global clock is not changed. Delivery is simulated: an in-app notice to the learner and a log entry, labelled as simulated —
   the prototype sends no email or SMS. Access pausing at Day 30 is not added for these learners (the existing overdue process
   is unchanged). Loads after cb-pin.js.
   ============================================================ */
'use strict';

const CB10_KINDS = [['upcoming', -7, 'Upcoming payment reminder'], ['due', 0, 'Payment due today'], ['od15', 15, 'Overdue reminder (Day 15)'], ['od30', 30, 'Overdue reminder (Day 30)']];
const CB10 = () => (STORE.cbRem = STORE.cbRem || { offset: 0, last: null, log: [], keys: {} });
const _isCB10 = initStore; initStore = function () { STORE.cbRem = null; return _isCB10.apply(this, arguments); };
const cb10Sim = () => cbAddDays(cbToday(), CB10().offset); // the simulation date
const cb10Paid = r => r.status === 'Paid' || r.status === 'Awaiting confirmation by Finance' || (r.paid || 0) >= r.amount;
const CB10_LBL = Object.fromEntries(CB10_KINDS.map(x => [x[0], x[2]]).concat([['manual', 'Manual reminder (Finance)']]));
const cb10Lbl = k => CB10_LBL[k] || k;
function cb10Body(kind, w, r, pl) {
  const amt = money(r.amount - (r.paid || 0), 'GBP'), d = fd(r.due), n = `payment ${r.n} of ${pl.rows.length}`;
  return kind === 'upcoming' ? `Your ${n} for ${pl.title} (${amt}) is due on ${d}.` : kind === 'due' ? `Your ${n} for ${pl.title} (${amt}) is due today, ${d}.`
    : `Your ${n} for ${pl.title} (${amt}) was due on ${d} and is ${kind === 'od15' ? 15 : 30} days overdue. Please pay it or contact Finance.`;
}
// The daily job, one day at a time from the day after the last run to the simulation date (deterministic, idempotent)
function cb10Run() {
  const R = CB10(), to = cb10Sim(); let day = R.last ? cbAddDays(R.last, 1) : to, made = 0;
  for (let guard = 0; day <= to && guard < 3660; guard++, day = cbAddDays(day, 1)) {
    Object.values(STORE.worlds || {}).forEach(w => {
      const pl = cb9Pl(w); if (!pl || !pl.pin) return;
      pl.rows.forEach(r => {
        if (cb10Paid(r)) return; const due = cbYmdOf(r.due);
        CB10_KINDS.forEach(([kind, off]) => {
          if (cbAddDays(due, off) !== day) return;
          const key = `${w.me.id}|${pl.pin.pid}|${pl.pin.at}|${r.n}|${kind}`; if (R.keys[key]) return;
          R.keys[key] = true; made++;
          R.log.unshift({ key, pinAt: pl.pin.at, on: day, at: now().toISOString(), v: w.v, lid: w.me.id, name: chFullName(w), course: pl.title, n: r.n, of: pl.rows.length, amount: r.amount - (r.paid || 0), due, kind, channel: 'In-app (simulated)', sim: true });
          notifyLearner(w.v, 'Payments', `${cb10Lbl(kind)} (simulated)`, `${cb10Body(kind, w, r, pl)} — Simulated reminder: this prototype records it in the app only; no email or SMS is sent.`, 'payments');
        });
      });
    });
  }
  if (!R.last || to > R.last) R.last = to;
  return made;
}
const _renderCB10 = render;
render = function () { try { if (STORE && STORE.worlds) cb10Run(); } catch (e) { /* never block a render */ } return _renderCB10.apply(this, arguments); };

/* ---------- Finance: the simulation control and the reminder log ---------- */
const cb10Can = () => S.portal === 'admin' && !!S.signedIn && finOwner();
const cb10Refuse = what => { logA('Finance', 'Payment reminders (simulated)', 'Blocked: ' + what, '—', '—', 'Only Finance Admins and the Super Administrator run the reminder simulation'); toast('Only Finance runs the reminder simulation.', 'err'); };
ACT.cb10Advance = el => {
  if (!cb10Can()) return cb10Refuse('advance the reminder simulation');
  const d = +((el && el.dataset && el.dataset.d) || 1); if (!(Number.isInteger(d) && d >= 1 && d <= 366)) return toast('Choose 1 to 366 days.', 'err');
  const R = CB10(), from = cb10Sim(); R.offset += d; const n = cb10Run();
  logA('Finance', 'Payment reminders (simulated)', 'Reminder simulation advanced', cbFd(from), cbFd(cb10Sim()), `${plural(n, 'simulated reminder')} recorded`);
  render(); toast(`Simulated to ${cbFd(cb10Sim())}: ${plural(n, 'reminder')} recorded (in-app only; no email or SMS is sent).`, 'info');
};
ACT.cb10Reset = () => {
  if (!cb10Can()) return cb10Refuse('reset the reminder simulation date');
  const R = CB10(), from = cb10Sim(); R.offset = 0; // the log and the sent keys are kept: history is never erased, and nothing is sent twice
  logA('Finance', 'Payment reminders (simulated)', 'Reminder simulation date reset', cbFd(from), cbFd(cb10Sim()), 'Log kept'); render(); toast('Simulation date back to today. The reminder log is kept.', 'info');
};
function cb10Card(o = {}) {
  const R = CB10(), can = cb10Can(), rows = o.lid ? R.log.filter(x => x.lid === o.lid) : R.log;
  const pins = Object.values(STORE.worlds || {}).filter(w => { const pl = cb9Pl(w); return pl && pl.pin; }).length;
  return `<section class="card cb10"><div class="row-b"><h2>Payment reminders <span class="chip t-amber">Simulated</span></h2>${can && !o.lid ? `<div class="row cb10-ctl"><span class="small">Simulated date: <strong>${esc(cbFd(cb10Sim()))}</strong></span>${[1, 7, 15, 30].map(d => `<button class="btn btn-sm" data-act="cb10Advance" data-d="${d}">+${d} day${d > 1 ? 's' : ''}</button>`).join('')}${R.offset ? '<button class="btn btn-sm btn-ghost" data-act="cb10Reset">Back to today</button>' : ''}</div>` : ''}</div>
    <p class="small muted">Simulated in this prototype: a daily job reads each learner's agreed payment schedule and records an in-app reminder 7 days before a payment is due, on the due date, and on Day 15 and Day 30 if it is still unpaid. No email or SMS is sent. Paid payments get none; each reminder is recorded once. ${plural(pins, 'learner has', 'learners have')} an agreed dated schedule. ${CB10().offset ? `The simulation runs ${plural(R.offset, 'day')} ahead of today; payment statuses and the real date don't change.` : ''}</p>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl dense cb10-log"><thead><tr><th>Simulated date</th><th>Learner</th><th>Payment</th><th>Reminder</th><th>Channel</th></tr></thead><tbody>${rows.slice(0, o.cap || 40).map(x => `<tr><td class="nowrap">${esc(cbFd(x.on))}</td><td>${esc(x.name)}<div class="xs muted">${esc(x.lid)}</div></td><td class="small">${x.n} of ${x.of} · ${money(x.amount, 'GBP')} · due ${esc(cbFd(x.due))}</td><td class="small">${esc(cb10Lbl(x.kind))}</td><td class="small">${esc(x.channel)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">No reminders recorded yet.</p>'}</section>`;
}
const _fPlansCB10 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => { const h = _fPlansCB10(p); if ((p.tab || 'schedules') !== 'schedules') return h; return h + cb10Card(); };
// "Send payment reminder now" for a learner with an agreed schedule: a manual reminder, recorded and labelled as simulated
const _remindCB10 = ACT.finRemind;
ACT.finRemind = el => {
  const sel = ui('fpL', 'C'), w = sel.startsWith('od:') ? null : STORE.worlds[sel], pl = cb9Pl(w); if (!pl || !pl.pin) return _remindCB10(el);
  if (!cb10Can()) return cb10Refuse('send a payment reminder');
  const r = pl.rows.find(x => !cb10Paid(x)); if (!r) return toast('Nothing is outstanding on this schedule.', 'info');
  const R = CB10(), at = now().toISOString(); R.log.unshift({ key: 'manual|' + at, pinAt: pl.pin.at, on: cb10Sim(), at, v: w.v, lid: w.me.id, name: chFullName(w), course: pl.title, n: r.n, of: pl.rows.length, amount: r.amount - (r.paid || 0), due: cbYmdOf(r.due), kind: 'manual', channel: 'In-app (simulated)', sim: true, by: ADMIN.me.name });
  notifyLearner(w.v, 'Payments', 'Payment reminder (simulated)', `Finance reminded you: payment ${r.n} of ${pl.rows.length} for ${pl.title} (${money(r.amount - (r.paid || 0), 'GBP')}) is due on ${fd(r.due)}. — Simulated reminder: no email or SMS is sent.`, 'payments');
  logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Payment reminder sent (simulated)', '—', `Payment ${r.n} · ${money(r.amount, 'GBP')} due ${fd(r.due)}`, 'Manual — in-app only'); render(); toast('Simulated reminder recorded in the app — no email or SMS is sent.', 'info');
};
// The learner sees the same simulated reminders on their Payments page
const _planCardCB10 = planCard;
planCard = function (pl) {
  const h = _planCardCB10.apply(this, arguments); if (!pl || !pl.pin) return h;
  const mine = CB10().log.filter(x => x.pinAt === pl.pin.at && x.course === pl.title).slice(0, 6);
  return h.replace(/<\/section>$/, `<div class="cb10-mine"><h3 class="small">Reminders <span class="chip t-amber">Simulated</span></h3><p class="xs muted">7 days before each payment, on the due date, then Day 15 and Day 30 if unpaid — recorded in the app only in this prototype (no email or SMS).</p>${mine.length ? `<ul class="list small">${mine.map(x => `<li class="li"><div class="li-b"><strong>${esc(cb10Lbl(x.kind))}</strong><span class="xs muted">${esc(cbFd(x.on))} · payment ${x.n} · ${money(x.amount, 'GBP')}</span></div></li>`).join('')}</ul>` : ''}</div></section>`);
};

/* ---------- Records ---------- */
UXC.push(['CB10', 'Simulated payment reminders (21 Oct 2026)', [
  'A simulated daily job reads only learners\' agreed dated schedules (CB9) and records, for each unpaid payment, an "upcoming" reminder 7 days before (provisional lead time), a "due today" reminder, and the existing Day 15 and Day 30 overdue reminders. Paid payments get none; each reminder is recorded once, whatever the re-renders, rebuilds or identity switches.',
  'Finance → Payment Plans → Learner schedules: "Payment reminders — Simulated" with the simulated date and +1 / +7 / +15 / +30 days (Finance Admin and Super Administrator only, audited) and the reminder log. "Send payment reminder now" for such a learner records a manual reminder, labelled simulated. The learner gets an in-app notice and sees the reminders on their Payments page, each labelled "Simulated — no email or SMS is sent". The real date, payment statuses and the existing overdue process are not changed.']]);
