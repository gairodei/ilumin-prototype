/* R4 — Self-Paced monthly assignment worklists (client clarification, Oct 2026).
   Self-Paced learners submit whenever they are ready — several assignments at once if they like. Submission periods run from the
   15th of one month to the 14th of the next; staff normally review a period's submissions from the 15th. There is no automatic
   assignment allocation, no seven-day marking deadline, no delayed-marking escalation to the Super Administrator, and no deadline or
   marking gate based on the cycle: a Self-Paced submission can be marked at any time.
   Staff worklists (Assessor Marking Queue, Coordinator Submissions & Feedback) gain filters for delivery mode, fee-option group,
   learner, batch, submission status and monthly cycle, a "Self-Paced (monthly)" view and a worklist summary.
   Wording: the "days waiting" chip on marking screens used the Approvals Queue tooltip ("escalates to the Super Administrator"), but
   no marking escalation exists (release.js: "No auto-release and no escalation"). On marking screens it now says what the number is;
   Self-Paced rows show the monthly cycle instead of an ageing colour. Approvals keep their real 7-day escalation wording.
   The Fully Assisted workflow is otherwise unchanged. Loads after R3. */
'use strict';

const R4_SP = 'Self-Paced';
// Delivery mode and fee-option group of a submission's learner (Level 3 only; R1 / R2 rules)
function r4Info(s) {
  const b = s && s.L && s.L.batch; if (!r2IsL3B(b)) return { mode: null, group: null };
  const w = s.L.v && STORE.worlds[s.L.v];
  if (w) { const o = r1OptOfW(w); return { mode: r2ModeOfW(w), group: o ? o.id : r1StdOf(r2Pid(b)) }; }
  const i = r2LidInfo(s.L.lid, b.code); return { mode: i.mode, group: i.group };
}
const r4IsSP = s => r4Info(s).mode === R4_SP;
const r4GroupLbl = g => { const o = g && r1Opt(g); return o ? `${o.label} (${o.id})` : g || '—'; };
// The submission period (15th → 14th) a date falls in, and when its review normally starts (the next 15th)
function r4Cycle(iso) {
  if (!iso) return null; const d = new Date(iso); let y = d.getUTCFullYear(), m = d.getUTCMonth(); if (d.getUTCDate() < 15) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  const start = new Date(Date.UTC(y, m, 15, 9)).toISOString(), end = new Date(Date.UTC(y, m + 1, 14, 9)).toISOString(), review = new Date(Date.UTC(y, m + 1, 15, 0)).toISOString();
  return { key: `${y}-${String(m + 1).padStart(2, '0')}`, start, end, review, label: `${fmt(start, { day: 'numeric', month: 'short' })} – ${fd(end)}`, open: now() < new Date(review) };
}
const r4CycleLbl = s => { if (!r4IsSP(s)) return 'Not Self-Paced'; const c = r4Cycle(s.at); return c ? c.label : 'Not submitted'; };

/* ---------- Marking chips: no escalation claim; Self-Paced rows show the cycle, not an ageing colour ---------- */
function r4MarkChip(d, sp) {
  if (d == null) return '<span class="muted small">—</span>';
  if (sp) return `<span class="chip t-outline r4-sp" title="Self-Paced: reviewed in the monthly cycle (submissions from the 15th to the 14th are normally reviewed from the 15th). No marking deadline and no escalation." data-tip="1"><span class="chip-i" aria-hidden="true">${ic('cal', 12)}</span>${d} ${d === 1 ? "day" : "days"} · monthly</span>`;
  const t = d >= 7 ? 'red' : d >= 5 ? 'amber' : 'outline';
  return `<span class="chip t-${t} r4-mk" title="Days since the learner submitted, to help you prioritise. Marking isn't escalated automatically." data-tip="1"><span class="chip-i" aria-hidden="true">${ic(d >= 5 ? 'clock' : 'circle', 12)}</span>${d} ${d === 1 ? "day" : "days"}</span>`;
}
let R4_MK = false;
const _dcR4 = daysChip;
daysChip = function (d) { return R4_MK ? r4MarkChip(d, false) : _dcR4.apply(this, arguments); };
const r4MarkCtx = (route, when) => { const f = SCREENS[route]; if (!f) return; SCREENS[route] = p => { if (when && !when(p || {})) return f(p); const was = R4_MK; R4_MK = true; try { return f(p); } finally { R4_MK = was; } }; };
r4MarkCtx('t-queue'); r4MarkCtx('c-submissions'); r4MarkCtx('c-release'); r4MarkCtx('c-batches'); r4MarkCtx('k-staff', p => (p.tab || '') === 'marking'); r4MarkCtx('a-records', p => p.tab === 'backlog');

/* ---------- Worklist filters, columns and the Self-Paced view ---------- */
MQ_TABS.sp = ['Self-Paced (monthly)', s => s.toMark && r4IsSP(s)];
CSTABS.sp = ['Self-Paced (monthly)', s => r4IsSP(s) && s.status === 'Submitted'];
const _dtR4 = dt;
dt = function (cfg) {
  const id = cfg && String(cfg.id || ''), mq = id.startsWith('mq-'), cs = id.startsWith('csubs-');
  if ((mq || cs) && Array.isArray(cfg.cols) && !cfg.r4) {
    const f = (cfg.filters || []).slice(), cols = cfg.cols.map(c => c.k === 'waiting' ? { ...c, h: s => r4MarkChip(s.waiting, r4IsSP(s)) } : c);
    f.push({ k: 'dm', l: 'Delivery mode', get: s => r4Info(s).mode || 'Not Level 3', opts: ['Fully Assisted', 'Self-Paced', 'Not Level 3'] });
    f.push({ k: 'fo', l: 'Fee-option group', get: s => r4Info(s).group ? r4GroupLbl(r4Info(s).group) : 'Not Level 3' });
    f.push({ k: 'cy', l: 'Monthly cycle', get: r4CycleLbl });
    if (mq) f.push({ k: 'st', l: 'Submission status', get: s => s.staffStatus || s.status });
    if (cs && !f.some(x => x.k === 'l')) f.push({ k: 'l', l: 'Learner', get: s => s.L.name });
    const i = cols.findIndex(c => c.k === 'asg');
    cols.splice(i >= 0 ? i : 1, 0, { k: 'dmode', l: 'Mode', v: s => r4Info(s).mode || '—', h: s => { const m = r4Info(s).mode; return m ? chip(m, m === R4_SP ? 'blue' : 'grey') : '<span class="xs muted">—</span>'; } });
    cols.push({ k: 'cycle', l: 'Monthly cycle', v: r4CycleLbl, h: s => r4IsSP(s) ? `<span class="small nowrap">${esc(r4CycleLbl(s))}</span>` : '<span class="xs muted">—</span>' });
    cols.push({ k: 'fogroup', l: 'Fee-option group', v: s => r4GroupLbl(r4Info(s).group), hide: 1 });
    // Readable defaults: Submissions & Feedback leads with learner, mode, assignment, submitted, status and days waiting (the rest stay
    // under Columns); the monthly cycle shows in the Self-Paced view
    const sp = /-sp$/.test(id), lead = ['learner', 'dmode', 'asg', 'at', 'status', 'waiting', 'cycle'];
    cols.forEach((c, k) => { if (c.k === 'cycle' || c.k === 'fogroup') cols[k] = { ...c, hide: c.k === 'cycle' && sp ? 0 : 1 }; else if (cs && !lead.includes(c.k)) cols[k] = { ...c, hide: 1 }; });
    cfg = { ...cfg, r4: true, filters: f, cols, act: cs ? (s => `<button class="btn btn-sm btn-primary" data-go="c-sub" data-id="${s.key}">Review</button>`) : cfg.act };
  }
  return _dtR4.call(this, cfg);
};
// Worklist summary: the open period, when its review starts, and Self-Paced work waiting (nothing is gated or escalated)
function r4Worklist(rows, act) {
  const sp = rows.filter(r4IsSP), cur = r4Cycle(now().toISOString()), by = {};
  sp.forEach(s => { const c = r4Cycle(s.at); if (!c) return; (by[c.key] = by[c.key] || { c, n: 0 }).n++; });
  const ready = Object.values(by).filter(x => !x.c.open).reduce((a, x) => a + x.n, 0), open = Object.values(by).filter(x => x.c.open).reduce((a, x) => a + x.n, 0);
  // one concise line: the period, when its review starts, what is waiting, and the way into the Self-Paced view
  return `<section class="card r4-wl"><div class="row-b"><div><strong>Self-Paced monthly worklist</strong> <span class="small muted">· periods run from the 15th to the 14th · current period ${esc(cur.label)}, reviewed from ${fd(cur.review)}</span></div><div class="small"><strong>${ready}</strong> from earlier periods · <strong>${open}</strong> this period · <button class="linklike" data-act="${act}" data-k="sp">Open the Self-Paced view</button></div></div></section>`;
}
const _tqR4 = SCREENS['t-queue'];
SCREENS['t-queue'] = p => { const h = _tqR4(p), k = h.indexOf('<div class="tabs'); const card = r4Worklist(tasSubs().filter(s => s.toMark), 'mqTab'); return k < 0 ? card + h : h.slice(0, k) + card + h.slice(k); };
const _csR4 = SCREENS['c-submissions'];
SCREENS['c-submissions'] = p => { const h = _csR4(p), k = h.indexOf('<div class="tabs'); const card = r4Worklist(mySubmissions().filter(s => s.at && s.status === 'Submitted'), 'csTab'); return k < 0 ? card + h : h.slice(0, k) + card + h.slice(k); };

/* ---------- Learner: Self-Paced learners are told how submission and review work ---------- */
const _asgR4 = SCREENS.assignments;
SCREENS.assignments = p => {
  const h = _asgR4(p); if (!W || !r1IsL3W(W) || r2ModeOfW(W) !== R4_SP) return h;
  const c = r4Cycle(now().toISOString()), note = `<div class="note b-blue r4-learner">${ic('cal')}<div class="small"><strong>Self-Paced:</strong> submit your assignments whenever you're ready — several at once if you like. Work submitted between ${esc(c.label)} is reviewed from ${fd(c.review)}. There's no monthly submission deadline.</div></div>`;
  const k = h.indexOf('<div class="tabs'); return k < 0 ? note + h : h.slice(0, k) + note + h.slice(k);
};

/* ---------- Dashboards: Self-Paced work is shown as its own worklist, never against the Fully Assisted turnaround ----------
   (staff.js t-dashboard and coord.js c-dashboard / pipeline leave Self-Paced submissions out of "Oldest waiting", "Due back soon",
   "Awaiting marking > 5 days" and "Aged items"; the Fully Assisted figures are unchanged.) */
const _tDashR4 = SCREENS['t-dashboard'];
SCREENS['t-dashboard'] = p => {
  const h = _tDashR4(p); if (CAN('mark') === 'no') return h;
  const n = tasSubs().filter(s => s.toMark && r4IsSP(s)).length;
  return h.replace(/(Turnaround target: 10 working days[\s\S]*?)(<\/div><\/section>)/, `$1${kpi('Self-Paced worklist', n, 'Monthly cycle — no turnaround deadline', 't-queue..sp')}$2`);
};
const _cDashR4 = SCREENS['c-dashboard'];
SCREENS['c-dashboard'] = p => {
  const h = _cDashR4(p), n = mySubmissions().filter(s => s.status === 'Submitted' && r4IsSP(s)).length; if (!n) return h;
  const note = `<div class="note b-blue r4-cdash">${ic('cal')}<div class="small"><strong>${plural(n, 'Self-Paced submission')}</strong> in the monthly worklist — reviewed by cycle (from the 15th), no marking deadline, so not counted as awaiting marking. <button class="linklike" data-act="goTok" data-t="c-submissions..sp">Open the Self-Paced view</button></div></div>`;
  const k = h.indexOf('<section'); return k < 0 ? h + note : h.slice(0, k) + note + h.slice(k);
};
// A link can open a Coordinator submissions view directly (as the Marking Queue already allows): c-submissions..sp
const _csTabR4 = SCREENS['c-submissions'];
SCREENS['c-submissions'] = p => { if (p && p.tab && CSTABS[p.tab]) setUi('csTab', p.tab); return `<div class="r4-wlp">${_csTabR4(p).replace('Post plain written feedback on submissions in your batches. Marking is done by Teachers and Assessors.', 'Review assignments, evaluate individual criteria and publish feedback directly to learners. Final assignment Pass/Fail is declared by the authorized Assessor.')}</div>`; };
const _tqWrapR4 = SCREENS['t-queue'];
SCREENS['t-queue'] = p => `<div class="r4-wlp">${_tqWrapR4(p)}</div>`;
