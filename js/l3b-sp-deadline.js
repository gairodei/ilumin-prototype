/* ============================================================
   L3-B — Self-Paced submissions aren't blocked by the batch due date (7 Nov 2026; PD-L3B-* in PROVISIONAL-DECISIONS.md).
   Confirmed policy: a Self-Paced submission must not be refused just because the batch assignment due date has passed (R4:
   submit whenever ready; reviewed in the 15th → 14th monthly cycle). D2's "no late submissions" refused it in the action
   (d-asm.js: ACT.reviewSubmit and startUndo), and the same check hid the assignment from the learner's next actions.
   - The delivery mode is read from the records fixed at sign-up: the fee option pinned with the terms (signup.plan.opt) and, when
     present, the approved terms fixed with it (signup.plan.cb8.opt). If the two disagree, the learner is treated as not
     Self-Paced (the existing rule applies) and the mismatch is logged. A standard programme fee follows the batch (PD-R1-02).
   - For a Self-Paced learner only the batch due date (and an extension of it) stops binding. Still refused: a closed
     assignment (a.closed), a resubmission deadline set for that learner (resubDue), anything already submitted, and every
     access lock (SEC-01: sign-up, payment pause, overdue pause, released seat, archived account).
   - Fully Assisted, standard-fee learners of a Fully Assisted batch and short courses: unchanged.
   - The monthly cycle, worklists and marking are unchanged; no allocation and no submission window are added.
   Loads after d-asm.js, f-demo.js and cf-feedback.js, before sec1-access.js.
   ============================================================ */
'use strict';

const L3B_SP = 'Self-Paced';
// The learner's delivery mode and where it was read from
function l3bModeOf(w) {
  if (!w || !w.nvq || !r1IsL3W(w)) return { mode: null, src: 'Not a Level 3 programme' };
  const o = w.signup && w.signup.plan && w.signup.plan.opt, P = cb9Pin(w), pm = P && P.opt ? P.opt.mode || null : null;
  if (o && o.mode) {
    if (pm && pm !== o.mode) return { mode: null, conflict: true, src: `The fee option fixed at sign-up (${o.mode}) and the approved terms fixed with it (${pm}) disagree` };
    return { mode: o.mode, src: `Fee option ${o.id}, fixed at sign-up` };
  }
  if (pm) return { mode: pm, src: 'The approved terms fixed at sign-up' };
  return { mode: r2ModeOfW(w), src: 'Standard programme fee: follows the batch' };
}
const l3bSP = w => l3bModeOf(w).mode === L3B_SP;
const l3bOwner = a => (a && W && (W.assignments || []).includes(a) ? W : null);
const l3bLogged = new Set();
function l3bConflictLog(w) {
  const m = l3bModeOf(w); if (!m.conflict || l3bLogged.has(w.me.id)) return;
  l3bLogged.add(w.me.id); logA('Assessment', `${chFullName(w)} (${w.me.id})`, 'Delivery mode unclear — Fully Assisted deadline rules applied', '—', '—', m.src);
}
// A Self-Paced learner is bound only by a resubmission deadline set for them (and a closed assignment, in dLate itself)
const _bindL3B = dBindDue;
dBindDue = a => {
  const w = l3bOwner(a); if (!w) return _bindL3B(a);
  l3bConflictLog(w);
  return l3bSP(w) ? (a.status === 'Resubmission Required' && a.resubDue) || null : _bindL3B(a);
};
// Past the batch due date: what the learner was told
const l3bPast = a => !!(a && a.due && new Date(a.due) < now() && !(a.status === 'Resubmission Required' && a.resubDue));

/* ---------- Learner screens say the same as the action ---------- */
const _ahL3B = asgHeader;
asgHeader = function (a) {
  const h = _ahL3B.apply(this, arguments), w = l3bOwner(a); if (!w || !l3bSP(w) || (a.status === 'Resubmission Required' && a.resubDue)) return h;
  return h.replace(/<p class="small" style="color:var\(--red\)">[\s\S]*?Deadline passed<\/p>/, `<p class="small l3b-past">${ic('info', 13)} Past the batch due date — as a Self-Paced learner you can still submit.</p>`)
    .replace('<p class="small muted">No late submissions. If you need more time, contact your assessor before the deadline.</p>', '<p class="small muted l3b-rule">Self-Paced: the batch due date is a guide. You can submit after it; your work is reviewed in the monthly cycle.</p>');
};
// A late-joining assignment: no "late-submission rules" note for a Self-Paced learner
const _asgL3B = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgL3B(p), a = p && p.id && W && (W.assignments || []).find(x => x.id === p.id);
  if (!a || !W || !l3bSP(W) || !fLateOpen(a)) return h;
  return h.replace(/<div class="note b-amber f-late" role="status">[\s\S]*?<\/div><\/div>/, `<div class="note b-blue f-late l3b-late" role="status">${ic('clock')}<div class="small"><strong>You joined after this assignment's batch due date (${esc(fdt(a.due))}).</strong> As a Self-Paced learner you can still submit it.</div></div>`);
};
// The next activity on the dashboard includes a late-joining assignment a Self-Paced learner can submit
const _nextL3B = cfNvqNext;
cfNvqNext = function () {
  if (!W || !l3bSP(W) || !W.flags.nvq || !W.nvq || W.nvq.status === 'Discontinued' || lockFor('assignment')) return _nextL3B.apply(this, arguments);
  const open = (W.assignments || []).filter(a => !dLate(a)), by = a => new Date(a.resubDue || a.due);
  const pick = st => open.filter(a => a.status === st).sort((x, y) => by(x) - by(y))[0];
  return pick('Resubmission Required') || pick('Not Started') || null;
};

/* ---------- A Self-Paced submission after the batch due date is recorded as such ---------- */
const _finL3B = finaliseSubmit;
finaliseSubmit = function (a, resub, at) {
  const w = l3bOwner(a), past = !!(w && l3bSP(w) && l3bPast(a)), due = a && a.due;
  const r = _finL3B.apply(this, arguments);
  if (past && a.status === 'Submitted') logA('Assessment', `${chFullName(w)} (${w.me.id}) · ${a.title}`, `${resub ? 'Resubmitted' : 'Submitted'} after the batch due date (Self-Paced)`, '—', fdt(at), `Batch due date ${fdt(due)} — Self-Paced submissions aren't blocked by it (R4, L3-B)`);
  return r;
};

/* Deadline propagation (L3-C audit, no change): a batch deadline change (crSetDue, cr-config.js) skips every learner who has
   submitted — Resubmission Required included — so it never reaches a resubmission deadline. The course-level save that copied
   its date into resubDue (setup-s2.js s2Save) is replaced by CR's save, which has no deadline. Tested in ft-l3c. */

/* ---------- L3-C follow-up: dashboard labels and counts ----------
   "Overdue — deadline passed" (the assignments card), the red "N assignments overdue" action and the "Needs attention" reason
   counted Self-Paced assignments past their batch date. For a Self-Paced learner only a closed assignment is overdue; the others
   say "Past the batch due date — you can still submit". Fully Assisted learners see what they saw before. */
const l3bTrulyOverdue = () => csOverdueAsg().filter(a => !W || !l3bSP(W) || a.closed);
// Each overdue line is checked against its own assignment (a closed one stays overdue)
const _awL3B = assignWidget;
assignWidget = function () {
  const h = _awL3B.apply(this, arguments); if (!W || !l3bSP(W)) return h;
  return W.assignments.filter(a => a.status !== 'Completed').slice(0, 5).reduce((s, a) => {
    if (a.closed) return s;
    const i = s.indexOf(`data-id="${a.id}" class="strong"`); if (i < 0) return s;
    const j = s.indexOf('</li>', i), seg = s.slice(i, j);
    return s.slice(0, i) + seg.replace(/<span class="small" style="color:var\(--red\)">[\s\S]*?Overdue — deadline passed<\/span>/, `<span class="small muted l3b-past">${ic('info', 13)} Past the batch due date — you can still submit</span>`) + s.slice(j);
  }, h);
};
const _aiL3B = actionItems;
actionItems = function () {
  const out = _aiL3B.apply(this, arguments); if (!W || !l3bSP(W) || !csIsNvq()) return out;
  const od = l3bTrulyOverdue(), k = out.findIndex(x => x.cs === 'assignments'); if (k < 0) return out;
  if (!od.length) return out.filter((x, i) => i !== k);
  out[k] = { ...out[k], t: `${plural(od.length, 'assignment')} overdue`, d: esc(od.map(a => a.title).join(', ')) + ' — submission closed' };
  return out;
};
const _rsL3B = csReasons;
csReasons = function () { const out = _rsL3B.apply(this, arguments); return W && l3bSP(W) && !l3bTrulyOverdue().length ? out.filter(x => x !== 'assignments') : out; };

UXC.push(['L3-B', 'Self-Paced submissions after the batch due date (7 Nov 2026)', [
  'A Self-Paced learner can submit after the batch assignment due date; the submission is timed when they press Submit, logged as after the batch due date, and goes to the Assessor in the monthly cycle as usual.',
  'The mode comes from the fee option and approved terms fixed at sign-up. A closed assignment, a resubmission deadline set for the learner and every access lock (including a payment pause) still apply. Fully Assisted deadlines are unchanged.']]);
