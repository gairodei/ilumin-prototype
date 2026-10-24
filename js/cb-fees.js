/* ============================================================
   CB8 — Fees & Payments: the financial package (approved plan sections A, D, E; PD-CB-48…57 in PROVISIONAL-DECISIONS.md).
   Section 5 of the unified course builder is where authorized creators (Super Admin, Academic Admin, System Admin) set a
   programme's complete financial terms, and Finance approves them as one package:
   - Fee options, unlimited for Level 3 (name, delivery mode, tuition fee). Level 2, 4 and 5 keep one programme fee (Q-CB-10).
   - Per fee option: the workplace and the Academy-office observation fee (only where Course Details says the course has
     observations and Section 4 permits that location; £0 = no charge; values not applicable now are kept, not discarded).
   - Per fee option: any number of payment options, each a count of 1–24 payments (1 = pay in full) added with "Add payment option".
     Dates follow the course duration (CB7 engine), amounts are exact (integer pence), and every option shows its rule, due points,
     amounts and a dated example from a sample or real batch start.
   - Deposit: not available, the Academy default, or a custom amount (E2, unchanged; a separate route).
   - Finance approval: the creator submits the whole package (frozen) to the existing "Programme payment terms" queue item; only an
     Active Finance Admin approves or requests changes (E1 rules: reason required, never the raiser, no escalation). While it waits,
     the package and its basis (duration, level, observation answer and locations) are locked. Approval saves a new plan version
     carrying the frozen package; Level 3 options are written to the R1 store with their stable IDs. The Super Administrator's own
     package is approved at once (D8). Any later change to the package or its basis sends the terms back for approval.
   The working package is a draft copy (STORE.cb8.work); approved packages live only on plan versions (frozen); no learner's terms,
   rows or fees change here — learners use the approved package from CB9. Loads last.
   ============================================================ */
'use strict';

const CB8 = () => (STORE.cb8 = STORE.cb8 || { work: {}, wf: {} });
const CB8_OBS_MAX = R1_FEE_MAX;
// CR (PD-CR-04): a package has fee options with delivery modes for Level 3, and for any course offering both modes or already holding them
const cb8L3 = pr => !!pr && (pr.level === 'Level 3' || (typeof crMultiFee === 'function' && crMultiFee(pr)));
const cb8FeeId = pr => pr.id + '-FEE';
const cb8Ent = pr => `${pr.title} (${pr.id})`;
const cb8Cur = pid => { const p = s4PlanCur(pid); return (p && p.pkg) || null; };
const cb8Money = (s, zero) => { const t = String(s == null ? '' : s).trim(); if (!/^\d+(\.\d{1,2})?$/.test(t)) return null; const v = Math.round(Number(t) * 100) / 100; return (zero ? v >= 0 : v > 0) && v <= CB8_OBS_MAX ? v : null; };
const cb8PayLbl = k => (k === 1 ? 'Pay in full' : `${k} payments`);
const cb8ObsTxt = v => (v == null ? '<span class="muted">Not set</span>' : v === 0 ? `${money(0, 'GBP')} <span class="xs muted">no charge</span>` : money(v, 'GBP'));

/* ---------- The basis the package depends on: level, duration, observation answer and permitted locations ----------
   A Draft programme's basis is its draft observation configuration; a published programme's is the configuration in force. */
function cb8Cfg(pr) { try { return pr.status === 'Draft' ? n5Shown(pr) : (n5PubCur(pr) || n5Shown(pr)); } catch (e) { return null; } }
function cb8Basis(pr) {
  const c = cb8Cfg(pr) || {}, req = c.required === true ? true : c.required === false ? false : null;
  return { level: pr.level, dur: pr.durV ? { n: pr.durV.n, unit: pr.durV.unit } : null, req, wp: req === true && c.workplace === 'Permitted', off: req === true && c.office === 'Available' };
}
const cb8Key = b => JSON.stringify(b ? [b.level, b.dur ? `${b.dur.n} ${b.dur.unit}` : null, b.req, !!b.wp, !!b.off] : null);
const cb8BasisTxt = b => `${b.level} · ${b.dur ? e1DurFmt(b.dur) : 'no duration'} · observations ${b.req === true ? `yes (${[b.wp && 'workplace', b.off && 'Academy office'].filter(Boolean).join(' and ') || 'no location'})` : b.req === false ? 'no' : 'not answered'}`;

/* ---------- Workflow record: E1's terms record for a Draft programme made in the builder, otherwise this package's own ---------- */
const cb8Wf = pr => {
  const w = CB8().wf, cur = cb8Cur(pr.id); if (w[pr.id]) return w[pr.id];
  if (pr.cb8 && pr.status === 'Draft' && e1T(pr.id)) return e1T(pr.id);
  if (!cur) return null;
  // a package in force with no workflow record of its own here (e.g. approved while the programme was a Draft): it is the approved terms
  const a = cur.approved || {}; return (w[pr.id] = { status: 'Approved', qid: null, hist: [], approved: { by: a.by, at: a.at, qid: a.qid, how: a.how, v: s4PlanCur(pr.id).v, basis: cur.basis } });
};
// Programmes whose terms are a financial package: every programme created in the builder since CB8 while it is a Draft, and any
// programme with a package started or in force
// (programmes made before CB8 — e.g. the seeded wizard Draft NV-N1 — keep their plan with Finance until a package is started)
const cb8Managed = pr => !!pr && !!(cb8Cur(pr.id) || CB8().wf[pr.id] || (pr.cb8 && pr.status === 'Draft'));
const _createCB8 = ch8Create; ch8Create = function () { const pr = _createCB8.apply(this, arguments); if (pr) pr.cb8 = true; return pr; };
const cb8CanStart = pr => !!pr && !cbRetired(pr) && !!pr.durV && !cb8Managed(pr);
function cb8Hist(pr, what, detail) { const wf = cb8Wf(pr); if (wf) (wf.hist = wf.hist || []).push([now().toISOString(), ADMIN.me.name, what, detail || '']); }
function cb8Init() {
  CB8();
  // terms approved before packages existed keep the basis they were approved on, so a later change to it is detected
  (STORE.chNewProgs || []).forEach(pr => { const T = e1T(pr.id); if (T && T.status === 'Approved' && !T.cb8basis) T.cb8basis = cb8Basis(pr); });
}
const _isCB8 = initStore; initStore = function () { STORE.cb8 = null; const r = _isCB8.apply(this, arguments); cb8Init(); return r; };
const _baCB8 = buildAdmin; buildAdmin = function () { const r = _baCB8.apply(this, arguments); if (STORE.worlds) cb8Init(); return r; };

/* ---------- The working package ---------- */
// From the approved package in force, or (for a programme that has none yet) from its current terms: the same options, counts and deposit
function cb8Derive(pr) {
  const cur = cb8Cur(pr.id);
  if (cur) return { pid: pr.id, derived: true, dep: { mode: cur.dep.mode, amount: cur.dep.amount }, partial: cur.partial, opts: cur.opts.map(o => ({ id: o.id, label: o.label, mode: o.mode, fee: o.fee, legacy: !!o.legacy, status: o.status, inForce: true, obsWp: o.keptWp != null ? o.keptWp : o.obsWp, obsOff: o.keptOff != null ? o.keptOff : o.obsOff, pay: o.pay.map(x => ({ id: x.id, k: x.k })) })) };
  const p = s4PlanCur(pr.id) || s4PlanLast(pr.id), T = e1T(pr.id), t = T && pr.status === 'Draft' && T.status !== 'Approved' && T.prop ? T.prop : e1TermsOfPlan(p);
  const ks = (t.meth === 'one-time' ? [1] : t.meth === 'both' ? [1, t.inst] : [t.inst]).filter(k => Number.isInteger(k) && k >= 1);
  const opts = cb8L3(pr) ? r1Opts(pr.id).map(o => ({ id: o.id, label: o.legacy ? 'Standard programme fee' : o.label, mode: o.mode, fee: r1FeeOf(o), legacy: !!o.legacy, status: o.status, inForce: true }))
    : [{ id: cb8FeeId(pr), label: 'Programme fee', mode: null, fee: p ? p.fee : +pr.price || null, status: 'Active', inForce: !!p }];
  return { pid: pr.id, derived: true, dep: { mode: t.depOff ? 'none' : t.dep == null ? 'default' : 'own', amount: t.depOff || t.dep == null ? null : t.dep }, partial: p ? p.partial !== false : true,
    opts: opts.map(o => ({ ...o, obsWp: null, obsOff: null, pay: o.status === 'Active' ? [...new Set(ks)].map(k => ({ id: 'P' + k, k })) : [] })) };
}
const cb8Work = pr => { const w = CB8().work[pr.id]; return w && !w.derived ? w : cb8Derive(pr); };
const cb8Mut = pr => { let w = CB8().work[pr.id]; if (!w || w.derived) { w = CB8().work[pr.id] = cb8Derive(pr); w.derived = false; } return w; };
const cb8DepEff = P => (P.dep.mode === 'none' ? null : P.dep.mode === 'default' ? S4().cfg.deposit : P.dep.amount);
const cb8Act = P => P.opts.filter(o => o.status === 'Active');
const cb8Sort = o => { o.pay.sort((a, b) => a.k - b.k); };

// Blocking problems: [{ o: option id or null, msg }]
function cb8Issues(pr, P) {
  const out = [], b = cb8Basis(pr), act = cb8Act(P), dep = cb8DepEff(P), seen = new Set(), add = (o, msg) => out.push({ o: o ? o.id : null, msg });
  if (!b.dur) add(null, 'Set the course duration in Section 1 — Course Details: payment dates are worked out from it.');
  if (b.req === null) add(null, 'Answer "Does this course contain observations?" in Section 1 — Course Details: it decides which observation fees apply.');
  if (b.req === true && !b.wp && !b.off) add(null, 'Observations are required, but no location is permitted (Section 4 — Observations): permit the workplace or the Academy office.');
  if (!act.length) add(null, 'Add at least one fee option.');
  if (P.dep.mode === 'own' && !(cb8Money(P.dep.amount) > 0)) add(null, 'Enter a custom deposit above £0, in whole pence.');
  act.forEach(o => {
    const nm = o.label || 'A fee option';
    if (!o.label) add(o, 'A fee option has no name.'); else if (seen.has(o.label.toLowerCase())) add(o, `${nm}: another fee option has the same name.`); seen.add(String(o.label).toLowerCase());
    if (cb8L3(pr) && !o.legacy && !R1_MODES.includes(o.mode)) add(o, `${nm}: choose the delivery mode.`);
    if (!(cb8Money(o.fee) > 0)) add(o, `${nm}: set the tuition fee (£0.01 to ${money(R1_FEE_MAX, 'GBP')}).`);
    if (b.req === true && b.wp && o.obsWp == null) add(o, `${nm}: set the workplace observation fee (£0 for no charge).`);
    if (b.req === true && b.off && o.obsOff == null) add(o, `${nm}: set the Academy-office observation fee (£0 for no charge).`);
    if (!o.pay.length) add(o, `${nm}: add at least one payment option.`);
    o.pay.forEach(x => { const why = b.dur && o.fee > 0 ? cbOptWhy(b.dur, x.k, o.fee) : ''; if (why) add(o, `${nm}, ${cb8PayLbl(x.k)}: ${why}`); });
    if (dep != null && o.fee > 0 && !(dep < o.fee)) add(o, `${nm}: the deposit (${money(dep, 'GBP')}) must be below the fee (${money(o.fee, 'GBP')}).`);
  });
  return out;
}
// The package as submitted / approved: deep-frozen, with every amount and rule it was reviewed with
function cb8Freeze(pr, P) {
  const b = cb8Basis(pr);
  return e1Freeze(JSON.parse(JSON.stringify({ pid: pr.id, rule: CB_SCHED_RULE, basis: b, dur: b.dur, dep: { mode: P.dep.mode, amount: P.dep.mode === 'own' ? P.dep.amount : null, eff: cb8DepEff(P) }, partial: P.partial,
    opts: P.opts.map(o => ({ id: o.id, label: o.label, mode: o.mode || null, fee: o.fee, legacy: !!o.legacy, status: o.status,
      obsWp: b.req === true && b.wp ? o.obsWp : null, obsOff: b.req === true && b.off ? o.obsOff : null, keptWp: o.obsWp, keptOff: o.obsOff,
      pay: o.status === 'Active' ? o.pay.map(x => ({ id: x.id, k: x.k, rule: cbRuleTxt(b.dur, x.k), points: cbPointsTxt(b.dur, x.k), pence: e1SchedP(o.fee, x.k) })) : [] })),
    at: now().toISOString(), by: ADMIN.me.name })));
}
const cb8PkgKey = k => JSON.stringify(k && { basis: cb8Key(k.basis), dep: k.dep, partial: k.partial, opts: k.opts.map(o => [o.id, o.label, o.mode, o.fee, o.status, o.obsWp, o.obsOff, o.pay.map(x => x.k)]) });
// Why a submitted package can no longer be approved as it stands ('' when it can)
function cb8Stale(pr, pkg) {
  if (cb8Key(pkg.basis) !== cb8Key(cb8Basis(pr))) return 'the course duration, level or observation settings changed after these terms were submitted';
  if (pkg.dep.mode === 'default' && pkg.dep.eff !== S4().cfg.deposit) return `the Academy default deposit changed after submission (${money(pkg.dep.eff, 'GBP')} then, ${money(S4().cfg.deposit, 'GBP')} now)`;
  const iss = cb8Issues(pr, { dep: pkg.dep, partial: pkg.partial, opts: pkg.opts.map(o => ({ ...o, obsWp: o.keptWp, obsOff: o.keptOff, pay: o.pay })) });
  return iss.length ? iss[0].msg : '';
}

/* ---------- Sample start dates for the worked examples ---------- */
const cb8Batches = pr => (ADMIN.batches || []).filter(b => b.course === pr.title && !['Cancelled', 'Completed', 'Archived'].includes(b.status) && new Date(b.start) > now()).sort((a, b) => String(a.start).localeCompare(String(b.start)));
function cb8Anchor(pr) { const v = ui('cb8S:' + pr.id, ''), b = (ADMIN.batches || []).find(x => x.code === v); if (b) return { ymd: cbYmdOf(b.start), lbl: `batch ${b.code}` }; return { ymd: CB_SAMPLE, lbl: 'sample start' }; }
const cb8AnchorPick = pr => { const v = ui('cb8S:' + pr.id, ''); return `<div class="field cb8-sample"><label for="cb8-s-${pr.id}">Dated examples from</label><select class="select" id="cb8-s-${pr.id}" data-onchange="cb8Sample" data-p="${pr.id}" data-cb-keep><option value="">Sample start — ${esc(cbFd(CB_SAMPLE))}</option>${cb8Batches(pr).map(b => `<option value="${esc(b.code)}" ${v === b.code ? 'selected' : ''}>Batch ${esc(b.code)} — starts ${esc(cbFd(cbYmdOf(b.start)))}</option>`).join('')}</select><span class="hint">Actual dates are fixed when each learner's batch and choice are known.</span></div>`; };
INP.cb8Sample = el => { setUi('cb8S:' + el.dataset.p, el.value); render(); };

/* ---------- Rendering: one renderer for the builder, Finance's queue item, Payment Plans and version history ---------- */
const cb8Dates = (rows, cap = 24) => `<ol class="cb8-dates">${rows.slice(0, cap).map(r => `<li><span class="cb8-dd">${esc(cbFd(r.due))}</span><span class="num">${money(r.amount, 'GBP')}</span></li>`).join('')}</ol>`;
function cb8PayHtml(pr, o, x, dur, anchor, ed) {
  const s = dur && o.fee > 0 ? cbSched(anchor.ymd, dur, o.fee, x.k) : { why: 'Set the fee and the course duration first.' }, why = s.why || '';
  const tot = s.rows ? money(s.total, 'GBP') : '—';
  return `<li class="cb8-pay" data-k="${x.k}"><div class="cb8-pk"><strong>${esc(cb8PayLbl(x.k))}</strong><span class="small">${esc(dur ? cbRuleTxt(dur, x.k) : '—')}</span></div>
    <div class="cb8-pa"><span class="num">${esc(o.fee > 0 ? cbAmtTxt(o.fee, x.k) : '—')}</span><span class="xs muted">Total ${tot}</span></div>
    <div class="xs muted cb8-pts">${esc(dur ? cbPointsTxt(dur, x.k, anchor.ymd) : '—')}</div>
    ${why ? `<div class="xs cb8-why" role="alert">${ic('alert', 12)} ${esc(why)}</div>` : `<details class="cb8-ex"><summary class="xs">Dated example (${esc(anchor.lbl)} ${esc(cbFd(anchor.ymd))})</summary>${cb8Dates(s.rows)}</details>`}
    ${ed ? `<button class="btn btn-sm btn-ghost cb8-del" data-act="cb8PayDel" data-p="${pr.id}" data-o="${esc(o.id)}" data-k="${x.k}" aria-label="Remove ${esc(cb8PayLbl(x.k))} from ${esc(o.label)}">Remove</button>` : ''}</li>`;
}
function cb8OptHtml(pr, o, b, anchor, ed, iss) {
  const obs = b.req === true, wpOn = obs && b.wp, offOn = obs && b.off, ret = o.status !== 'Active', mine = iss.filter(x => x.o === o.id);
  const obsDd = (on, v, kept) => (!obs ? '<span class="muted">Not applicable — no observations</span>' : !on ? `<span class="muted">Not applicable — location not permitted</span>${kept != null ? ` <span class="xs muted">(kept: ${money(kept, 'GBP')})</span>` : ''}` : cb8ObsTxt(v));
  return `<article class="cb8-opt${ret ? ' cb8-ret' : ''}" data-o="${esc(o.id)}"><div class="cb8-oh"><div class="cb8-ot"><h3>${esc(o.label || 'Unnamed fee option')}</h3><span class="xs muted mono">${esc(o.id)}</span></div><div class="cb8-oc">${cb8L3(pr) ? chip(o.legacy ? 'Mode of the batch (legacy)' : o.mode || 'No mode', o.mode ? 'blue' : 'grey') : ''}${ret ? chip('Retired', 'grey') : ''}</div></div>
    <dl class="cb8-fees"><div><dt>Tuition fee</dt><dd class="num">${o.fee > 0 ? money(o.fee, 'GBP') : '<span class="muted">Not set</span>'}</dd></div><div><dt>Workplace observation fee</dt><dd>${obsDd(wpOn, o.obsWp, o.keptWp != null ? o.keptWp : o.obsWp)}</dd></div><div><dt>Academy-office observation fee</dt><dd>${obsDd(offOn, o.obsOff, o.keptOff != null ? o.keptOff : o.obsOff)}</dd></div></dl>
    ${ret ? '<p class="xs muted">Retired: not offered to new learners. Learners who chose it keep their terms.</p>' : `<h4 class="cb8-ph">Payment options <span class="xs muted">(${o.pay.length})</span></h4>${o.pay.length ? `<ul class="cb8-pays">${o.pay.map(x => cb8PayHtml(pr, o, x, b.dur, anchor, ed)).join('')}</ul>` : '<p class="small cb8-none">No payment options yet.</p>'}
    ${ed ? `<div class="cb8-add"><div class="field"><label for="cb8-k-${esc(o.id)}">Add payment option — number of payments (1–${CB_K_MAX})</label><div class="cb8-addrow"><input class="input num" type="number" min="1" max="${CB_K_MAX}" step="1" inputmode="numeric" id="cb8-k-${esc(o.id)}" data-oninput="cb8KLive" data-p="${pr.id}" data-o="${esc(o.id)}" data-cb-keep placeholder="e.g. 4"><button class="btn btn-sm btn-primary" data-act="cb8PayAdd" data-p="${pr.id}" data-o="${esc(o.id)}">${ic('plus', 14)}Add payment option</button></div><span class="hint">1 = pay in full. Any number the course duration allows; dates follow the duration.</span></div><div class="xs cb8-prev" aria-live="polite"></div></div>` : ''}`}
    ${mine.length ? `<ul class="list small cb8-iss">${mine.map(x => `<li class="li">${chip('To fix', 'red')} ${esc(x.msg)}</li>`).join('')}</ul>` : ''}
    ${ed ? `<div class="row cb8-oa"><button class="btn btn-sm" data-act="cb8Opt" data-p="${pr.id}" data-o="${esc(o.id)}">${ic('edit', 13)}Edit fee option</button>${cb8L3(pr) && !ret ? `<button class="btn btn-sm btn-ghost" data-act="cb8OptRetire" data-p="${pr.id}" data-o="${esc(o.id)}">${o.inForce ? 'Retire' : 'Remove'}</button>` : ''}</div>` : ''}</article>`;
}
// A package (working copy or frozen) as cards; o.ed = editable controls
function cb8View(pr, P, o = {}) {
  const b = o.basis || cb8Basis(pr), anchor = o.anchor || cb8Anchor(pr), iss = o.ed ? cb8Issues(pr, P) : [], dep = P.dep.eff !== undefined ? P.dep.eff : cb8DepEff(P), hold = chHoldDays();
  const opts = P.opts.filter(x => x.status === 'Active').concat(P.opts.filter(x => x.status !== 'Active'));
  return `<div class="cb8-pkg" data-pid="${pr.id}"><p class="small muted cb8-basis">Course duration: <strong>${esc(b.dur ? e1DurFmt(b.dur) : 'not set')}</strong> · observations: <strong>${b.req === true ? `yes — ${esc([b.wp && 'workplace', b.off && 'Academy office'].filter(Boolean).join(' and ') || 'no location permitted')}` : b.req === false ? 'no' : 'not answered'}</strong>. Payment 1 is due at batch start; the first payment is collected at checkout. One observation fee per learner per course, priced by the location of the first confirmed observation (PD-CB-11).</p>
    <div class="cb8-opts">${opts.map(x => cb8OptHtml(pr, x, b, anchor, !!o.ed, iss)).join('')}</div>
    ${o.noDep ? '' : `<div class="cb8-dep"><h3>Deposit <span class="xs muted">a separate route, not combined with payment options</span></h3><p class="small">${cb8DepSum(P, dep, hold)}</p></div>`}</div>`;
}
// What the deposit setting means for learners (one sentence, shown once)
const cb8DepSum = (P, dep, hold) => (P.dep.mode === 'none' ? 'Not available — learners pay by one of the payment options.' : `${money(dep, 'GBP')} — ${P.dep.mode === 'default' ? 'Academy default' : 'custom amount for this programme'}. Offered only when the learner's batch starts in ${CH_HOLD_DAYS} days or more (CH-10); the balance is paid in one payment within the ${hold}-day seat hold.`);

/* ---------- Section 5 ---------- */
const CB8_ST = { legacy: ['Terms in force (before financial packages)', 'grey'], Draft: ['Draft — not yet sent to Finance', 'grey'], Pending: ['Waiting for Finance review', 'amber'], Changes: ['Changes requested by Finance', 'red'], Approved: ['Approved', 'green'] };
function cb8StateNote(pr, wf) {
  const cur = s4PlanCur(pr.id), k = wf ? wf.status : 'legacy', st = CB8_ST[k] || CB8_ST.legacy, ap = wf && wf.status === 'Approved' && wf.approved;
  const q = wf && wf.qid ? (isFin() ? `<a href="#a-queue.${wf.qid}" data-act="goTok" data-t="a-queue.${wf.qid}" class="mono">${wf.qid}</a>` : `<span class="mono">${wf.qid}</span>`) : '';
  const txt = k === 'Pending' ? `Submitted by ${esc((wf.sub && wf.sub.by) || '—')}${wf.sub ? ' on ' + fd(wf.sub.at) : ''}. Fees, fee options, observation fees, payment options, the deposit — and the course duration, level, observation answer and locations — are locked until Finance decides.`
    : k === 'Changes' ? `<strong>Finance's request:</strong> ${esc(wf.changes ? wf.changes.reason : '')} <span class="xs muted">— ${esc(wf.changes ? wf.changes.by : '')}${wf.changes ? ', ' + fdt(wf.changes.at) : ''}</span>`
    : k === 'Approved' ? `${ap ? `Approved by ${esc(ap.by)} on ${fd(ap.at)}${ap.qid ? ` (${ap.qid})` : ap.how ? ` — ${esc(ap.how)}` : ''}` : 'Approved'}${cur ? ` · plan version ${cur.v}${cur.pkg ? '' : ' (legacy terms)'}` : ''}. Any change to fees, fee options, observation fees, payment options, the deposit, the duration, level or observation settings sends the terms back to Finance.`
    : k === 'Draft' ? `Not yet sent to Finance.${pr.status === 'Draft' ? ' The course can\'t be published until a Finance Admin approves them.' : cur ? ` Learners keep getting plan version ${cur.v} until a new package is approved.` : ''}`
    : `Plan version ${cur ? cur.v : '—'} was set before financial packages existed and is owned by Finance.`;
  return `<div class="note b-${st[1] === 'grey' ? 'grey' : st[1]} cb8-state" role="status">${ic(k === 'Pending' ? 'clock' : k === 'Changes' ? 'alert' : k === 'Approved' ? 'check' : 'info')}<div class="small"><strong>Payment terms: ${st[0]}${q ? ' — ' + q : ''}.</strong> ${txt}</div></div>`;
}
function cb8Panel(pr) {
  const wf = cb8Wf(pr), ret = cbRetired(pr), can = cbAdmin() && !ret;
  const pend = wf && wf.status === 'Pending', ed = can && !pend, P = pend && wf.sub ? wf.sub : cb8Work(pr), iss = cb8Issues(pr, pend && wf.sub ? { ...P, opts: P.opts.map(o => ({ ...o, obsWp: o.keptWp, obsOff: o.keptOff })) } : P);
  const dm = P.dep.mode, sa = isSA();
  const submit = !ed ? '' : `<div class="cb8-submit">${iss.length ? `<h3>Before submitting</h3><ul class="list small cb8-blk">${iss.map(x => `<li class="li">${chip('To fix', 'red')} ${esc(x.msg)}</li>`).join('')}</ul>` : `<p class="small">${ic('check', 14)} Ready to ${sa ? 'approve' : 'submit'}: every fee option has a fee, its applicable observation fees and at least one valid payment option.</p>`}
      <div class="row">${sa ? `<button class="btn btn-primary" data-act="cb8SaApprove" data-p="${pr.id}">Approve and put in force</button><span class="xs muted">Super Administrator — your own terms need no Finance approval (D8).</span>` : `<button class="btn btn-primary" data-act="cb8Submit" data-p="${pr.id}">Submit to Finance for review</button>`}</div></div>`;
  const dep = ed ? `<div class="cb8-depf"><h3>Deposit <span class="xs muted">a separate route, not combined with payment options</span></h3><p class="small cb8-depnow">${cb8DepSum(P, cb8DepEff(P), chHoldDays())}</p>${e1DepFields('e1', 'wdm', 'd', dm, P.dep.amount).replace('<legend class="lbl">Deposit</legend>', '<legend class="sr">Deposit setting</legend>')}<button class="btn btn-sm" data-act="cb8Dep" data-p="${pr.id}">Save deposit setting</button></div>` : '';
  return `<section class="card cb8-sec"><div class="row-b"><h2>Fees &amp; payment options</h2>${ed && cb8L3(pr) ? `<button class="btn btn-sm btn-primary" data-act="cb8Opt" data-p="${pr.id}" data-o="">${ic('plus', 14)}Add fee option</button>` : ''}</div>
    ${cb8StateNote(pr, wf)}${pend ? '<h3 class="cb8-subh">Submitted package (read-only)</h3>' : ''}
    ${!cb8L3(pr) ? `<p class="xs muted">${esc(pr.level)}: one programme fee (multiple fee options are a Level 3 feature — Q-CB-10). Its payment options and observation fees work the same way.</p>` : ''}
    ${cb8AnchorPick(pr)}${cb8View(pr, P, { ed, noDep: ed })}${dep}${submit}
    ${!can ? `<p class="xs muted">${ic('lock', 12)} Set by the Super Admin, Academic Admin or System Admin; approved by Finance.</p>` : ''}</section>`;
}
// Programmes on terms from before packages: the way to start one (or why it can't start)
function cb8StartCard(pr) {
  if (cbRetired(pr) || !cbAdmin()) return '';
  const p = s4PlanCur(pr.id) || s4PlanLast(pr.id);
  return `<section class="card cb8-start"><h2>Financial package</h2>${pr.durV ? `<p class="small">Fees, fee options, observation fees and payment options are set as one financial package and approved by Finance. This programme's terms were set before packages${p ? ` (plan version ${p.v})` : ''}.</p><div class="row"><button class="btn btn-primary" data-act="cb8Start" data-p="${pr.id}">Start a new financial package</button></div><p class="xs muted">A draft copy of these terms that you can change and submit to Finance. Learners keep getting the current terms until Finance approves it.</p>` : `<p class="small cb8-nodur">${ic('info', 14)} A financial package needs a structured course duration, because payment dates are worked out from it. This programme's duration isn't recorded (it was set up before durations had a number and unit), so its terms stay as they are, changed by Finance in Finance → Payment Plans.</p>`}</section>`;
}
// Version history: every plan version (package or legacy), the workflow history and the audit
function cb8HistPanel(pr) {
  const l = s4Plans(pr.id).slice().reverse(), wf = cb8Wf(pr), T = e1T(pr.id), h = ((wf && wf.hist) || []).concat(T && T !== wf ? T.hist || [] : []).sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  return `<section class="card cb8-hist"><h2>Financial versions</h2><p class="small muted">Each approval saves a new plan version with the frozen package. Learners keep the version they agreed; a new version applies to new learners only.</p>
    ${l.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>Terms</th><th>Approved</th><th>Status</th><th></th></tr></thead><tbody>${l.map(p => `<tr data-v="${p.v}"><td>Version ${p.v}</td><td class="small">${p.pkg ? `Financial package · ${plural(p.pkg.opts.filter(o => o.status === 'Active').length, 'fee option')} · ${plural(p.pkg.opts.reduce((a, o) => a + o.pay.length, 0), 'payment option')}` : `Legacy plan · ${esc(s4PlanTxt(p))}`}</td><td class="small">${p.pkg && p.pkg.approved ? `${esc(p.pkg.approved.by)}, ${fd(p.pkg.approved.at)}${p.pkg.approved.qid ? ` (${esc(p.pkg.approved.qid)})` : ` — ${esc(p.pkg.approved.how || '')}`}` : p.fixture ? '<span class="muted">Before plans were versioned</span>' : `${esc(p.by || '—')}${p.at ? ', ' + fd(p.at) : ''}`}</td><td>${chip(p.status, p.status === 'Active' ? 'green' : 'grey')}</td><td>${p.pkg ? `<button class="btn btn-sm btn-ghost" data-act="cb8ViewPkg" data-p="${pr.id}" data-v="${p.v}">View</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">No plan version yet.</p>'}
    ${h.length ? `<h3>Payment terms history</h3><ul class="list small">${h.map(x => `<li class="li"><div class="li-b"><strong>${esc(x[2])}</strong>${x[3] ? `<span>${esc(x[3])}</span>` : ''}<span class="xs muted">${fdt(x[0])} · ${esc(x[1])}</span></div></li>`).join('')}</ul>` : ''}</section>
    ${auditPanel(a => /Payment Plans|NVQ Programmes|Fee options/.test(a.module) && String(a.entity || '').includes(pr.id) && /package|payment|fee|deposit|terms|plan/i.test(a.action), 'Fees & payments — audit')}`;
}
const _panelsCB8 = cbPanels;
cbPanels = function (pr, sec) {
  const r = _panelsCB8.apply(this, arguments); if (sec !== 'payments') return r;
  const H = f => () => { const d = document.createElement('div'); d.innerHTML = f(); return cbHtml(d, pr); }, sup = r.find(p => p[0] === 'support');
  // a programme without a package keeps its existing panels (its plan stays with Finance), plus the way to start one
  if (!cb8Managed(pr)) return r.map(p => (p[0] === 'plan' ? [p[0], p[1], () => p[2]() + H(() => cb8StartCard(pr))()] : p));
  const supNote = !cbObsNo(pr) ? `<p class="small cb8-supnote">${ic('info', 14)} Learners whose terms come from an approved financial package pay the observation fee of their fee option (Fees &amp; payment options). This rate applies to learners on legacy terms only, and its delivery-mode setting is the default class pattern for new batches.</p>` : '';
  return [['fees', 'Fees & payment options', H(() => cb8Panel(pr))], ['payhist', 'Financial versions', H(() => cb8HistPanel(pr))]].concat(sup ? [['support', 'Legacy observation fee rate', () => supNote + sup[2]()]] : []);
};
CB_ROUTE.payhist = ['payments', 'payhist']; // "plan" and "fees" keep their routes: a package programme has no "plan" panel, so it opens Fees & payment options
const CB8_ACTS = ['cb8Start', 'cb8Opt', 'cb8OptRetire', 'cb8PayAdd', 'cb8PayDel', 'cb8Dep', 'cb8Submit', 'cb8SaApprove'];
CB8_ACTS.forEach(n => { if (!CB_WRITE.includes(n)) CB_WRITE.push(n); });
const _badgesCB8 = cbBadges;
cbBadges = function (pr) {
  const b = _badgesCB8.apply(this, arguments), wf = cb8Wf(pr); if (cbRetired(pr) || !wf) return b;
  const add = h => { (b.payments = b.payments || []).push(h); };
  if (wf.status === 'Pending') add('<span class="cb-badge warn">With Finance</span>');
  else if (wf.status === 'Approved' && !(b.payments || []).length) add('<span class="cb-badge ok">Approved</span>');
  return b;
};

/* ---------- Actions ---------- */
function cb8Guard(el, what, o = {}) {
  const pr = cbPr(el && el.dataset && (el.dataset.p || el.dataset.id)), ent = pr ? cb8Ent(pr) : '—';
  const no = (why, msg) => { logA('Payment Plans', ent, 'Blocked: ' + what, '—', '—', why); toast(msg, 'err'); return null; };
  if (!pr) return no('Programme not found', 'Programme not found.');
  if (!cbAdmin()) return no('Role can\'t change financial terms', 'Only the Super Admin, Academic Admin or System Admin change fees and payment options. Finance approves them.');
  if (cbRetired(pr)) return no('Programme retired', 'This programme is retired, so it is read-only.');
  if (o.start) return cb8CanStart(pr) ? { pr } : no(pr.durV ? 'Package already started' : 'No structured duration', pr.durV ? 'This programme already has a financial package.' : 'A financial package needs a structured course duration.');
  if (!cb8Managed(pr)) return no('No financial package started', 'Start a financial package first.');
  const wf = cb8Wf(pr); if (wf && wf.status === 'Pending') return no(`Waiting for Finance review (${wf.qid})`, `These terms are waiting for Finance review (${wf.qid}) — they can't change until Finance decides.`);
  return { pr, wf };
}
// A change to the working package: logged; approved terms go back to Draft (the approved version stays in force until a new approval)
function cb8Touch(pr, action, before, after, r) {
  let wf = cb8Wf(pr); if (!wf) wf = CB8().wf[pr.id] = { status: 'Draft', qid: null, hist: [], approved: null };
  logA('Payment Plans', cb8Ent(pr), action, before, after, r || 'Fees & payment options');
  cb8Hist(pr, action, `${before} → ${after}`);
  if (wf.status === 'Approved') { wf.status = 'Draft'; cb8Hist(pr, 'Approval withdrawn — the terms changed', action); logA('Payment Plans', cb8Ent(pr), 'Payment terms need Finance approval again', 'Approved', 'Draft', action); }
}
ACT.cb8Start = el => {
  const g = cb8Guard(el, 'start a financial package', { start: true }); if (!g) return; const { pr } = g, cur = s4PlanCur(pr.id);
  CB8().wf[pr.id] = { status: 'Draft', qid: null, hist: [[now().toISOString(), ADMIN.me.name, 'Financial package draft started', cur ? `From plan version ${cur.v}` : '']], approved: null };
  cb8Mut(pr); logA('Payment Plans', cb8Ent(pr), 'Financial package draft started', cur ? `Plan v${cur.v}` : '—', 'Draft package', 'Fees & payment options');
  render(); toast('Draft package started from the terms in force. Learners keep the current terms until Finance approves a new package.');
};
// Add or edit a fee option: name, delivery mode (Level 3), tuition fee and the applicable observation fees
ACT.cb8Opt = el => {
  const g = cb8Guard(el, el.dataset.o ? 'edit a fee option' : 'add a fee option'); if (!g) return; const { pr } = g, P = cb8Work(pr), b = cb8Basis(pr);
  const o = el.dataset.o ? P.opts.find(x => x.id === el.dataset.o) : null; if (el.dataset.o && !o) return toast('Fee option not found.', 'err');
  if (!o && !cb8L3(pr)) return toast(`${pr.level} programmes have one programme fee (multiple fee options are a Level 3 feature).`, 'err');
  if (o && o.status !== 'Active') return toast('A retired fee option can\'t be edited.', 'err');
  const feeLock = o && o.inForce && pr.status !== 'Draft' && !isSA(), legacy = o && o.legacy;
  const obsF = (id, lab, on, v, why) => `<div class="field"><label for="${id}">${lab} (GBP)</label>${on ? `<input class="input num" type="number" min="0" step="0.01" id="${id}" value="${v != null ? v : ''}"><span class="hint">Enter 0 for no charge.</span>` : `<input class="input num" id="${id}" value="${v != null ? v : ''}" disabled><span class="hint">Not applicable — ${why}.${v != null ? ' The stored value is kept.' : ''}</span>`}</div>`;
  const why = b.req !== true ? 'this course has no observations (Course Details)' : 'the location isn\'t permitted (Section 4)';
  openModal({ title: (o ? 'Edit fee option' : 'Add fee option') + ' — ' + esc(pr.title), size: 'lg', body: `<div class="form-grid cb8-form">
    <div class="field full"><label for="c8-l">Fee option name</label><input class="input" id="c8-l" maxlength="80" value="${o ? esc(o.label) : ''}" ${cb8L3(pr) ? '' : 'readonly'} placeholder="e.g. Fully Assisted — standard"><span class="hint">${cb8L3(pr) ? 'Shown to learners when they sign up.' : 'The single programme fee.'}</span></div>
    ${cb8L3(pr) ? `<div class="field"><label for="c8-m">Delivery mode</label><select class="select" id="c8-m" ${legacy ? 'disabled' : ''}>${legacy ? `<option value="">${R1_LEGACY_MODE}</option>` : (o ? '' : '<option value="">Choose…</option>') + R1_MODES.map(m => `<option ${o && o.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="c8-f">Tuition fee (GBP)</label><input class="input num" type="number" min="0.01" step="0.01" id="c8-f" value="${o && o.fee ? o.fee : ''}" ${feeLock || (legacy && !isSA()) ? 'readonly' : ''}>${feeLock || (legacy && !isSA()) ? '<span class="hint">Only the Super Administrator changes the fee of an option already in force. Add a new fee option instead.</span>' : ''}</div>
    ${obsF('c8-wp', 'Workplace observation fee', b.req === true && b.wp, o ? o.obsWp : null, why)}${obsF('c8-off', 'Academy-office observation fee', b.req === true && b.off, o ? o.obsOff : null, why)}
    <p class="xs muted full">One observation fee per learner per course, priced by the location of the first confirmed observation. £0 means no charge.</p></div>`,
    actions: [{ label: 'Cancel' }, { label: o ? 'Save fee option' : 'Add fee option', cls: 'btn-primary', fn: () => {
      if (!cb8Guard(el, o ? 'edit a fee option' : 'add a fee option')) return false;
      const label = mval('#c8-l').replace(/\s+/g, ' '), mode = legacy ? null : cb8L3(pr) ? mval('#c8-m') : null, fee = cb8Money(mval('#c8-f')), P2 = cb8Work(pr);
      if (!label) return fieldErr('#c8-l', 'Enter a name'), false;
      if (P2.opts.some(x => x.id !== (o && o.id) && x.status === 'Active' && x.label.toLowerCase() === label.toLowerCase())) return fieldErr('#c8-l', 'Another fee option has this name'), false;
      if (cb8L3(pr) && !legacy && !R1_MODES.includes(mode)) return fieldErr('#c8-m', 'Choose Self-Paced or Fully Assisted'), false;
      if (fee == null) return fieldErr('#c8-f', `Enter a fee from £0.01 to ${money(R1_FEE_MAX, 'GBP')} (pence at most)`), false;
      const rd = (id, on, old) => { if (!on) return { v: old }; const s = mval(id); if (s === '') return { err: 'Enter the fee, or 0 for no charge' }; const v = cb8Money(s, true); return v == null ? { err: `Enter £0 to ${money(CB8_OBS_MAX, 'GBP')}, in whole pence` } : { v }; };
      const wp = rd('#c8-wp', b.req === true && b.wp, o ? o.obsWp : null), off = rd('#c8-off', b.req === true && b.off, o ? o.obsOff : null);
      if (wp.err) return fieldErr('#c8-wp', wp.err), false; if (off.err) return fieldErr('#c8-off', off.err), false;
      if (o && fee !== o.fee && ((o.inForce && pr.status !== 'Draft') || legacy) && !isSA()) { logA('Payment Plans', `${o.label} (${o.id})`, 'Blocked: change the option fee', money(o.fee, 'GBP'), money(fee, 'GBP'), 'Only the Super Administrator changes the fee of an option already in force'); return fieldErr('#c8-f', 'Only the Super Administrator changes the fee of an option already in force'), false; }
      const txt = x => `${x.label}${x.mode ? ' · ' + x.mode : ''} · ${money(x.fee, 'GBP')} · workplace obs ${x.obsWp == null ? '—' : money(x.obsWp, 'GBP')} · office obs ${x.obsOff == null ? '—' : money(x.obsOff, 'GBP')}`;
      const W8 = cb8Mut(pr);
      if (o) {
        const t = W8.opts.find(x => x.id === o.id), was = txt(t), nx = { label, mode: legacy ? t.mode : mode, fee, obsWp: wp.v, obsOff: off.v };
        if (txt({ ...t, ...nx }) === was) { toast('Nothing has changed.', 'info'); return false; }
        Object.assign(t, nx); cb8Touch(pr, 'Fee option changed', was, txt(t)); toast('Saved in the draft package.');
      } else {
        const s = R1(), n = s.n[pr.id] = (s.n[pr.id] || 0) + 1, id = r1Pfx(pr.id) + String(n).padStart(3, '0'); // reserved: an ID is never reused, even if this draft option is removed
        const x = { id, label, mode, fee, legacy: false, status: 'Active', inForce: false, obsWp: wp.v, obsOff: off.v, pay: [] }; W8.opts.push(x);
        cb8Touch(pr, 'Fee option added', '—', `${id} · ${txt(x)}`); toast(`${id} added — now add its payment options.`);
      }
      render();
    } }] });
};
ACT.cb8OptRetire = el => {
  const g = cb8Guard(el, 'retire a fee option'); if (!g) return; const { pr } = g, o = cb8Work(pr).opts.find(x => x.id === el.dataset.o); if (!o || o.status !== 'Active') return;
  if (cb8Act(cb8Work(pr)).length === 1) return toast('A programme needs at least one fee option.', 'err');
  reasonDlg({ title: `${o.inForce ? 'Retire' : 'Remove'} fee option ${esc(o.id)}`, ok: o.inForce ? 'Retire option' : 'Remove option', danger: true, body: `<p class="small">${o.inForce ? `"${esc(o.label)}" stops being offered to new learners once Finance approves this package. Learners who chose it keep their fee, mode and payments. A retired option can't be reactivated.` : `"${esc(o.label)}" was never approved, so it is removed from the draft. Its ID (${esc(o.id)}) isn't reused.`}</p>`, onOk: r => {
    if (!cb8Guard(el, 'retire a fee option')) return false; const W8 = cb8Mut(pr), t = W8.opts.find(x => x.id === o.id);
    if (t.inForce) t.status = 'Retired'; else W8.opts.splice(W8.opts.indexOf(t), 1);
    cb8Touch(pr, t.inForce ? 'Fee option retired' : 'Draft fee option removed', `${t.id} · ${t.label}`, t.inForce ? 'Retired' : '—', r); render();
  } });
};
// Add payment option: any count the duration allows (1–24), not a fixed list
function cb8KRead(pr, o, s) {
  const b = cb8Basis(pr), t = String(s == null ? '' : s).trim(), k = Number(t);
  if (!/^\d+$/.test(t) || !cbKOk(k)) return { why: `Enter a whole number of payments from 1 to ${CB_K_MAX}.` };
  if (o.pay.some(x => x.k === k)) return { why: `${o.label} already offers ${cb8PayLbl(k).toLowerCase()}.` };
  if (!b.dur) return { why: 'Set the course duration in Section 1 first: payment dates are worked out from it.' };
  if (!(o.fee > 0)) return { why: 'Set this option\'s tuition fee first.' };
  const why = cbOptWhy(b.dur, k, o.fee); return why ? { why } : { k };
}
INP.cb8KLive = el => {
  const pr = cbPr(el.dataset.p), box = el.closest('.cb8-add') && el.closest('.cb8-add').querySelector('.cb8-prev'); if (!pr || !box) return;
  const o = cb8Work(pr).opts.find(x => x.id === el.dataset.o); if (!o) return; if (el.value === '') { box.textContent = ''; return; }
  const r = cb8KRead(pr, o, el.value); if (r.why) { box.innerHTML = `${ic('alert', 12)} ${esc(r.why)}`; box.className = 'xs cb8-prev cb8-why'; return; }
  const b = cb8Basis(pr), a = cb8Anchor(pr), s = cbSched(a.ymd, b.dur, o.fee, r.k);
  box.className = 'xs cb8-prev'; box.innerHTML = `<strong>Preview:</strong> ${esc(cb8PayLbl(r.k))} · ${esc(cbRuleTxt(b.dur, r.k))} · ${esc(cbAmtTxt(o.fee, r.k))}. ${esc(cbPointsTxt(b.dur, r.k, a.ymd))}. Example for ${esc(a.lbl)} ${esc(cbFd(a.ymd))}: ${esc(s.rows.map(x => cbFdShort(x.due)).join(', '))}.`;
};
ACT.cb8PayAdd = el => {
  const g = cb8Guard(el, 'add a payment option'); if (!g) return; const { pr } = g, inp = document.getElementById('cb8-k-' + el.dataset.o), o = cb8Work(pr).opts.find(x => x.id === el.dataset.o);
  if (!o || o.status !== 'Active') return toast('Fee option not found.', 'err');
  const r = cb8KRead(pr, o, el.dataset.k != null ? el.dataset.k : inp ? inp.value : ''); if (r.why) { if (inp) fieldErr('#' + CSS.escape(inp.id), r.why); else toast(r.why, 'err'); return; }
  const t = cb8Mut(pr).opts.find(x => x.id === o.id), was = t.pay.map(x => x.k).join(', ') || 'none'; t.pay.push({ id: 'P' + r.k, k: r.k }); cb8Sort(t);
  cb8Touch(pr, 'Payment option added', `${t.label}: ${was}`, `${t.label}: ${t.pay.map(x => x.k).join(', ')} (${cb8PayLbl(r.k)} · ${cbAmtTxt(t.fee, r.k)})`); render(); toast(`${cb8PayLbl(r.k)} added to ${t.label}.`);
};
ACT.cb8PayDel = el => {
  const g = cb8Guard(el, 'remove a payment option'); if (!g) return; const { pr } = g, t = cb8Mut(pr).opts.find(x => x.id === el.dataset.o), k = +el.dataset.k;
  if (!t || !t.pay.some(x => x.k === k)) return; const was = t.pay.map(x => x.k).join(', '); t.pay = t.pay.filter(x => x.k !== k);
  cb8Touch(pr, 'Payment option removed', `${t.label}: ${was}`, `${t.label}: ${t.pay.map(x => x.k).join(', ') || 'none'}`); render(); toast(`${cb8PayLbl(k)} removed from ${t.label}.`);
};
// The deposit choice (E2's three choices, same fields)
function cb8DepRead() { const dm = ($('main input[name="e1-wdm"]:checked') || {}).value; if (!dm) return null; const v = e1DepRead(dm, ($('main #e1-d') || {}).value || '', 'main input[name="e1-wdm"]', 'main #e1-d'); return v === false ? false : { mode: dm, amount: dm === 'own' ? v : null }; }
const cb8DepTxt = d => (d.mode === 'none' ? 'Deposit not available' : d.mode === 'default' ? 'Academy default deposit' : `Custom deposit ${money(d.amount, 'GBP')}`);
function cb8DepApply(pr, d) { const W8 = cb8Work(pr); if (W8.dep.mode === d.mode && (d.mode !== 'own' || W8.dep.amount === d.amount)) return false; const m = cb8Mut(pr), was = cb8DepTxt(m.dep); m.dep = d; cb8Touch(pr, 'Deposit setting changed', was, cb8DepTxt(d)); return true; }
// E2's rule: a custom deposit must be below every fee of the programme (every active fee option), checked when it is saved
const cb8DepWhy = (pr, d) => { if (d.mode !== 'own') return ''; const o = cb8Act(cb8Work(pr)).find(x => x.fee > 0 && !(d.amount < x.fee)); return o ? `${o.label}: The deposit (${money(d.amount, 'GBP')}) must be below the fee (${money(o.fee, 'GBP')})` : ''; };
ACT.cb8Dep = el => {
  const g = cb8Guard(el, 'change the deposit setting'); if (!g) return; const d = cb8DepRead(); if (d === false) return; if (!d) return toast('Choose a deposit setting.', 'err');
  const why = cb8DepWhy(g.pr, d); if (why) return fieldErr('main #e1-d', why);
  if (!cb8DepApply(g.pr, d)) return toast('Nothing has changed.', 'info'); render(); toast('Deposit setting saved in the draft package.');
};
// Submit (Academic Admin / System Admin) — the whole package, frozen, to the Finance queue
ACT.cb8Submit = el => {
  const g = cb8Guard(el, 'submit payment terms'); if (!g) return; const { pr } = g;
  if (isSA()) return ACT.cb8SaApprove(el);
  const d = cb8DepRead(); if (d === false) return; if (d) { const why = cb8DepWhy(pr, d); if (why) return fieldErr('main #e1-d', why); cb8DepApply(pr, d); }
  const wf = cb8Wf(pr); if (wf && wf.status === 'Approved') return toast('These terms are already approved. Change something first.', 'info');
  const iss = cb8Issues(pr, cb8Work(pr)); if (iss.length) { render(); return toast(`Fix ${plural(iss.length, 'item')} before submitting: ${iss[0].msg}`, 'err'); }
  confirmDlg({ title: 'Submit the payment terms to Finance?', ok: 'Submit for review', body: `<p class="small">A Finance Admin approves the whole package or asks for changes. Until they decide, the fees, payment options, deposit, the course duration, level, observation answer and locations can't change.</p>${cb8View(pr, cb8Freeze(pr, cb8Work(pr)))}`, onOk: () => { if (cb8Guard(el, 'submit payment terms')) cb8SubmitNow(pr); } });
};
// The derived single-method view of a package, kept for readers that predate packages (E1 meth / inst)
function cb8Legacy(pkg) {
  const act = pkg.opts.filter(o => o.status === 'Active'), ks = [...new Set(act.flatMap(o => o.pay.map(x => x.k)))].sort((a, b) => a - b), many = ks.filter(k => k > 1);
  return { meth: ks.includes(1) && many.length ? 'both' : ks.includes(1) ? 'one-time' : 'instalments', inst: many.length ? many[0] : 1, dep: pkg.dep.mode === 'own' ? pkg.dep.amount : null, depOff: pkg.dep.mode === 'none' };
}
const cb8Txt = pkg => pkg.opts.filter(o => o.status === 'Active').map(o => `${o.label} ${money(o.fee, 'GBP')}: ${o.pay.map(x => cb8PayLbl(x.k).toLowerCase()).join(', ')}`).join(' · ') + ` · ${cb8DepTxt(pkg.dep).toLowerCase()}`;
function cb8SubmitNow(pr) {
  const wf = cb8Wf(pr) || (CB8().wf[pr.id] = { status: 'Draft', hist: [], approved: null }), pkg = cb8Freeze(pr, cb8Work(pr)), at = now().toISOString(), first = e1Approver(), txt = cb8Txt(pkg), act = pkg.opts.filter(o => o.status === 'Active');
  let n = 7600 + ADMIN.queue.length, id; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const i = { id, type: E1_T, raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first, related: [`${pr.title} · ${pr.id}`, 'f-plans..templates'], notes: [], amount: Math.min(...act.map(o => o.fee)), cur: 'GBP', reason: `Financial package for ${pr.title}: ${txt}`, history: [[ADMIN.me.name, at, 'Raised', txt]],
    data: { pid: pr.id, cb8: true, pkg, prop: cb8Legacy(pkg), role: typeof isSys === 'function' && isSys() ? 'sys' : 'aca' } };
  ADMIN.queue.unshift(i); Object.assign(wf, { status: 'Pending', qid: id, sub: pkg }); if (wf.prop !== undefined) wf.prop = cb8Legacy(pkg);
  cb8Hist(pr, `Submitted to Finance (${id})`, txt); logA('Payment Plans', cb8Ent(pr), 'Financial package submitted for Finance review', 'Draft', 'Waiting for Finance review', `${id} · ${txt}`);
  if (first !== 'Super Administrator') e1Notify({ key: 'cb8-sub-' + id, to: first, t: 'Financial package to review', b: `${id} · ${pr.title}: ${txt}`, go: 'a-queue.' + id });
  render(); toast(`Sent to Finance for review (${id}). You'll be told when they decide.`);
}
// Super Administrator: their own package is approved at once (D8) — with a note for the record
ACT.cb8SaApprove = el => {
  const g = cb8Guard(el, 'approve payment terms'); if (!g) return; const { pr } = g;
  if (!isSA()) { logA('Payment Plans', cb8Ent(pr), 'Blocked: approve payment terms', '—', '—', 'Only the Super Administrator\'s own terms are approved without Finance (D8)'); return toast('Submit the terms to Finance for review.', 'err'); }
  const d = cb8DepRead(); if (d === false) return; if (d) { const why = cb8DepWhy(pr, d); if (why) return fieldErr('main #e1-d', why); cb8DepApply(pr, d); }
  const iss = cb8Issues(pr, cb8Work(pr)); if (iss.length) { render(); return toast(`Fix ${plural(iss.length, 'item')} first: ${iss[0].msg}`, 'err'); }
  reasonDlg({ title: 'Approve and put in force — ' + esc(pr.title), ok: 'Approve terms', label: 'Note for the record (required)', body: `<p class="small">Super Administrator: your own terms need no Finance approval (D8). A new plan version is saved with this package for new learners; existing learners keep their terms.</p>`, onOk: r => {
    if (!cb8Guard(el, 'approve payment terms') || !isSA()) return false;
    const why = cb8Apply(pr, cb8Freeze(pr, cb8Work(pr)), { by: ADMIN.me.name, how: SA_TAG, r }); if (why) { toast('Not saved: ' + why, 'err'); return false; }
    render(); toast(`Approved — plan version ${s4PlanCur(pr.id).v} is in force for new learners.`);
  } });
};

/* ---------- Approval: a new plan version with the frozen package; Level 3 options written to R1 with their IDs ---------- */
function cb8R1Sync(pr, pkg, note) {
  const s = R1(), list = s.opts[pr.id] = s.opts[pr.id] || [], at = now().toISOString(), by = ADMIN.me.name;
  pkg.opts.forEach(o => {
    const x = list.find(y => y.id === o.id), m = /-(\d+)$/.exec(o.id); if (m && !o.legacy) s.n[pr.id] = Math.max(s.n[pr.id] || 0, +m[1]);
    if (!x) { if (o.status !== 'Active') return; const nx = { id: o.id, pid: pr.id, label: o.label, fee: o.fee, mode: o.mode, status: 'Active', v: 1, at, by, hist: [[at, by, 'Added (financial package)', '—', `${o.label} · ${o.mode} · ${money(o.fee, 'GBP')}`, note]] }; list.push(nx); logA('Fee options', `${o.label} (${o.id})`, 'Fee option added', '—', `${pr.title}: ${r1OptTxt(nx)}`, note); return; }
    if (o.status !== 'Active') { if (x.status === 'Active') { x.status = 'Retired'; x.hist.push([at, by, 'Retired (financial package)', 'Active', 'Retired', note]); logA('Fee options', `${x.label} (${x.id})`, 'Fee option retired', 'Active', 'Retired', note); } return; }
    const was = r1OptTxt(x), nf = x.legacy ? x.fee : o.fee, nl = x.legacy ? x.label : o.label, nm = x.legacy ? x.mode : o.mode;
    if (nl !== x.label || nm !== x.mode || nf !== x.fee) { Object.assign(x, { label: nl, mode: nm, fee: nf, v: x.v + 1 }); x.hist.push([at, by, `Edited (v${x.v}, financial package)`, was, r1OptTxt(x), note]); logA('Fee options', `${x.label} (${x.id})`, 'Fee option edited', was, r1OptTxt(x), note); }
  });
  r1CatSync(pr.id);
}
let CB8_SAVING = null; // the package being saved by s4PlanSave
const _planSaveCB8 = s4PlanSave;
s4PlanSave = function (pr, f, note, opts) {
  const prev = pr && (s4PlanCur(pr.id) || s4PlanLast(pr.id)), r = _planSaveCB8.apply(this, arguments); if (r || !pr) return r;
  const last = s4PlanLast(pr.id); if (CB8_SAVING) last.pkg = CB8_SAVING; else if (prev && prev.pkg && last !== prev) last.pkg = prev.pkg; // the same package stays with a new version made for another reason (an Academy default change)
  return r;
};
function cb8Apply(pr, pkg0, meta) {
  const at = now().toISOString(), pkg = e1Freeze({ ...JSON.parse(JSON.stringify(pkg0)), approved: { by: meta.by, at, qid: meta.qid || null, how: meta.how || '', note: meta.r || '' } });
  const act = pkg.opts.filter(o => o.status === 'Active'), L = cb8Legacy(pkg), leg = act.find(o => o.legacy), fee = leg ? leg.fee : Math.min(...act.map(o => o.fee)), cur = s4PlanCur(pr.id) || s4PlanLast(pr.id);
  const note = meta.qid ? `Financial package approved by Finance (${meta.qid}): ${meta.r}` : `Financial package approved — ${meta.how}: ${meta.r}`;
  if (cb8L3(pr)) cb8R1Sync(pr, pkg, note);
  CB8_SAVING = pkg; E1_METH_SAVE = L.meth; let why;
  try { why = s4PlanSave(pr, { fee, deposit: L.dep, depOff: L.depOff, inst: L.inst, partial: pkg.partial, meth: L.meth }, note, { action: 'Financial package approved' }); } finally { CB8_SAVING = null; E1_METH_SAVE = null; }
  if (why) return why;
  const v = s4PlanCur(pr.id).v, wf = cb8Wf(pr) || (CB8().wf[pr.id] = { hist: [] });
  Object.assign(wf, { status: 'Approved', sub: null, changes: null, approved: { by: meta.by, at, qid: meta.qid || null, how: meta.how || '', v, basis: pkg.basis } });
  if ('prop' in wf) { wf.prop = L; wf.cb8basis = pkg.basis; }
  CB8().work[pr.id] = null; // the working copy is now the approved package
  cb8Hist(pr, meta.qid ? `Approved by Finance (${meta.qid})` : `Approved — ${meta.how}`, `Plan version ${v} · ${cb8Txt(pkg)} — ${meta.r || ''}`);
  logA('NVQ Programmes', cb8Ent(pr), 'Payment terms approved', cur ? `Plan v${cur.v}` : '—', `Plan v${v} (financial package)`, note);
  return '';
}
// Finance's decision on a package (inside the self-approval guard, from e1-apply.js)
function cb8Decide(i, a, r, base) {
  if (a === 'note') return base();
  const pr = cbPr(i.data.pid), wf = pr && cb8Wf(pr), refuse = (why, msg) => { logA('Approvals Queue', i.id, 'Blocked: decide payment terms', i.status, i.status, why); toast(msg, 'err'); return false; };
  if (!e1CanDecide(i)) return refuse('Only an Active Finance Admin decides payment terms', e1WhyNot(i));
  if (!['approve', 'return'].includes(a)) return refuse('Use Approve or Request changes', 'Approve the payment terms, or request changes with a reason.');
  if (!String(r || '').trim()) return refuse('No reason given', a === 'return' ? 'Say what needs to change.' : 'Enter a note for the record.');
  if (!isOpen(i) || !wf || wf.qid !== i.id || wf.status !== 'Pending') return refuse('Not waiting for review', 'This package is no longer waiting for review.');
  if (a === 'approve') { const why = cb8Stale(pr, i.data.pkg); if (why) return refuse(why, `Can't approve: ${why} — request changes so the terms are submitted again.`); }
  if (base() === false) return false;
  const at = now().toISOString(), go = `a-programmes.${pr.id}.fees`;
  if (a === 'approve') { const why = cb8Apply(pr, i.data.pkg, { by: ADMIN.me.name, qid: i.id, r, how: 'Approved by Finance' }); if (why) return refuse(why, 'Can\'t approve: ' + why); }
  else { Object.assign(wf, { status: 'Changes', changes: { by: ADMIN.me.name, at, reason: r, qid: i.id } }); cb8Hist(pr, `Changes requested by Finance (${i.id})`, r); logA('NVQ Programmes', cb8Ent(pr), 'Payment terms: changes requested', 'Waiting for Finance review', 'Changes requested', `${i.id} · ${r}`); }
  const tt = a === 'approve' ? 'Payment terms approved' : 'Payment terms — changes requested', bb = `${i.id} · ${pr.title}: ${a === 'approve' ? 'the financial package is approved' + (pr.status === 'Draft' ? '. The programme can be published once nothing else is blocking.' : ' and applies to new learners.') : r}`;
  if (!i._e1Told) { i._e1Told = true; if (i.data.role === 'sys' && typeof sysNotify === 'function') sysNotify(tt, bb, go, i.raisedBy); else if (typeof acaNotify === 'function') acaNotify(tt, bb, go, i.raisedBy); }
}
const _decideCB8 = e1Decide;
e1Decide = function (i) { return i && i.data && i.data.cb8 ? cb8Decide.apply(this, arguments) : _decideCB8.apply(this, arguments); };

/* ---------- Finance: the queue item and Payment Plans use the same package renderer ---------- */
const _qdCB8 = queueDetail;
queueDetail = function (id) {
  let h = _qdCB8.apply(this, arguments); const i = qItem(id); if (!i || !i.data || !i.data.cb8) return h;
  const pr = cbPr(i.data.pid), pkg = i.data.pkg, cur = pr && s4PlanCur(pr.id), stale = pr && isOpen(i) ? cb8Stale(pr, pkg) : '';
  const panel = `<section class="card e1-q cb8-q"><h2>Financial package — payment terms</h2><dl class="kv"><dt>Programme</dt><dd>${pr ? `<strong>${esc(pr.title)}</strong> <span class="xs muted">${pr.id} · ${esc(pr.level)} · ${esc(pr.status)}</span>` : '—'}</dd><dt>Basis</dt><dd class="small">${esc(cb8BasisTxt(pkg.basis))}</dd><dt>Deposit</dt><dd class="small">${esc(cb8DepTxt(pkg.dep))}${pkg.dep.eff != null ? ` (${money(pkg.dep.eff, 'GBP')})` : ''}</dd><dt>In force now</dt><dd class="small">${cur ? `Plan version ${cur.v}${cur.pkg ? ' (financial package)' : ' · ' + esc(s4PlanTxt(cur))}` : 'No plan yet'}</dd><dt>On approval</dt><dd class="small">A new plan version is saved with exactly this package for new learners. Learners who already agreed terms keep them. Finance approves the financial terms only — not academic content or publication.</dd><dt>Route</dt><dd class="small">Routed to ${esc(i.first)}; any Active Finance Admin may decide, never the person who submitted it. No escalation: after ${E1_OVERDUE} days it is marked overdue, for information only.</dd></dl>
    ${stale ? `<div class="note b-amber cb8-stale" role="status">${ic('alert')}<div class="small"><strong>Can't be approved as submitted:</strong> ${esc(stale)}. Request changes so the creator resubmits.</div></div>` : ''}
    ${pr ? `<h3>Submitted package</h3><p class="xs muted">Exactly as submitted (frozen). Amounts are exact; dates are worked out from each learner's batch start.</p>${cb8View(pr, pkg, { basis: pkg.basis })}` : ''}</section>`;
  return h.replace(/<section class="card e1-q">[\s\S]*?<\/section>(?=<\/div>)/, panel);
};
ACT.cb8ViewPkg = el => {
  const pr = cbPr(el.dataset.p); if (!pr) return;
  if (!(finOwner() || cbAdmin() || (typeof s5Ctx === 'function' && s5Ctx()))) { logA('Payment Plans', cb8Ent(pr), 'Blocked: view financial package', '—', '—', 'Role can\'t view payment terms'); return toast('You can\'t view these payment terms.', 'err'); }
  const p = el.dataset.v ? s4Plans(pr.id).find(x => x.v === +el.dataset.v) : s4PlanCur(pr.id), pkg = p && p.pkg; if (!pkg) return toast('No financial package for this version.', 'err');
  openModal({ title: `Financial package — plan version ${p.v}`, sub: esc(pr.title), size: 'lg', body: `<p class="small">${pkg.approved ? `Approved by ${esc(pkg.approved.by)} on ${fd(pkg.approved.at)}${pkg.approved.qid ? ` (${esc(pkg.approved.qid)})` : ` — ${esc(pkg.approved.how)}`}.` : ''} Read-only: an approved package never changes.</p>${cb8View(pr, pkg, { basis: pkg.basis })}`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
// Payment Plans (Finance; Super Admin → Finance): a package programme's terms are viewed here and approved in the queue
const _plansCardCB8 = s4PlansCard;
s4PlansCard = function () {
  let h = _plansCardCB8.apply(this, arguments);
  s4PlanProgs().filter(cb8Managed).forEach(pr => {
    const wf = cb8Wf(pr), cur = cb8Cur(pr.id), btn = wf && wf.status === 'Pending' ? `<button class="btn btn-sm btn-primary" data-go="a-queue" data-id="${wf.qid}">Review package (${wf.qid})</button>` : cur ? `<button class="btn btn-sm" data-act="cb8ViewPkg" data-p="${pr.id}">View package</button>` : '<span class="xs muted">Package not yet approved</span>';
    h = h.replace(new RegExp(`<button class="btn btn-sm" data-act="s4PlanEdit" data-p="${pr.id}">(?:Edit plan|Set up plan)</button>( <button class="btn btn-sm" data-act="s4PlanRetire" data-p="${pr.id}">Retire</button>)?`), m => btn + (/s4PlanRetire/.test(m) ? ` <button class="btn btn-sm" data-act="s4PlanRetire" data-p="${pr.id}">Retire</button>` : ''));
    if (cur) h = h.replace(new RegExp(`(<tr data-pid="${pr.id}">(?:<td[^>]*>[\\s\\S]*?</td>){3})<td>[\\s\\S]*?</td>`), `$1<td class="small">Financial package<div class="xs muted">${esc(cur.opts.filter(o => o.status === 'Active').map(o => `${o.label}: ${o.pay.map(x => x.k === 1 ? 'in full' : x.k).join(' / ')}`).join(' · '))}</div></td>`);
  });
  return h;
};
const _fPlansCB8 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => {
  let h = _fPlansCB8(p);
  s4PlanProgs().filter(cb8Managed).forEach(pr => {
    const wf = cb8Wf(pr), btn = wf && wf.status === 'Pending' ? `<button class="btn btn-sm btn-primary" data-go="a-queue" data-id="${wf.qid}">Review package (${wf.qid})</button>` : cb8Cur(pr.id) ? `<button class="btn btn-sm" data-act="cb8ViewPkg" data-p="${pr.id}">View package</button>` : '';
    h = h.split(`<button class="btn btn-sm" data-act="s4PlanEdit" data-p="${pr.id}">Edit plan</button>`).join(btn).split(`<button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="plan">Edit plan</button>`).join(btn);
    h = h.replace(new RegExp(`(<section class="card r1-opts" data-pid="${pr.id}">[\\s\\S]*?)</section>`), m => m.replace(/<button class="btn btn-sm btn-primary" data-act="r1OptAdd"[\s\S]*?<\/button>/, `<span class="xs muted">${ic('lock', 12)} Set in the programme's financial package — approved in the Approvals Queue</span>`).replace(/<button class="btn btn-sm" data-act="r1Opt(?:Edit|Retire)"[^>]*>[^<]*<\/button> ?/g, ''));
  });
  return h;
};

/* ---------- Old editors: a package programme's terms change only through the package ---------- */
const cb8Old = (pr, what) => { logA('Payment Plans', cb8Ent(pr), 'Blocked: ' + what, '—', '—', 'Terms are a financial package: changed in Fees & payment options and approved by Finance'); toast('This programme\'s terms are a financial package. They are changed in Section 5 — Fees & payment options and approved by Finance.', 'err'); };
// (a role that couldn't use the old editor at all still gets that editor's own refusal first; ch8SavePlan and Finance's editors are the plan owners')
[['e1Submit', 'submit payment terms (old form)', () => true], ['e1Draft', 'save payment terms (old form)', () => true], ['ch8SavePlan', 'save the payment plan (old form)', () => finOwner()]].forEach(([n, what, can]) => { const f = ACT[n]; ACT[n] = function (el) { const pr = cbPr(el && el.dataset && el.dataset.id); if (pr && cb8Managed(pr) && can()) return cb8Old(pr, what); return f.apply(this, arguments); }; });
const _planEditCB8 = ACT.s4PlanEdit;
ACT.s4PlanEdit = el => {
  const pr = el && el.dataset && el.dataset.p ? cbPr(el.dataset.p) : null; if (pr && cb8Managed(pr) && finOwner()) return cb8Old(pr, 'edit the payment plan');
  const r = _planEditCB8(el); const a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn && !pr) { const f = a.fn; a.fn = function () { const p2 = cbPr(($('#modal-root #pp-p') || {}).value); if (p2 && cb8Managed(p2)) { cb8Old(p2, 'edit the payment plan'); return false; } return f.apply(this, arguments); }; }
  return r;
};
['r1OptAdd', 'r1OptEdit', 'r1OptRetire'].forEach(n => { const f = ACT[n]; ACT[n] = function (el) { const d = (el && el.dataset) || {}, pr = cbPr(n === 'r1OptAdd' ? d.p || R1_PID : r1PidOf(r1Opt(d.id))); if (pr && cb8Managed(pr) && r1Can()) return cb8Old(pr, n === 'r1OptAdd' ? 'add a fee option (old form)' : 'change a fee option (old form)'); return f.apply(this, arguments); }; });

/* ---------- Locks while Finance reviews, and approval withdrawn when the basis changes ---------- */
const cb8Locked = pr => { const wf = pr && cb8Wf(pr); return !!(wf && wf.status === 'Pending'); };
const cb8LockMsg = (pr, what) => { const wf = cb8Wf(pr); logA('Payment Plans', cb8Ent(pr), 'Blocked: ' + what, '—', '—', `Payment terms waiting for Finance review (${wf.qid})`); toast(`The payment terms are with Finance for review (${wf.qid}). ${what[0].toUpperCase() + what.slice(1)} after Finance decides.`, 'err'); };
function cb8BasisCheck(pr, why) {
  if (!pr) return; const wf = cb8Wf(pr); if (!wf || wf.status !== 'Approved') return;
  const ref = (wf.approved && wf.approved.basis) || wf.cb8basis || (cb8Cur(pr.id) || {}).basis; if (!ref) return;
  const now_ = cb8Basis(pr); if (cb8Key(ref) === cb8Key(now_)) return;
  wf.status = 'Draft'; cb8Hist(pr, 'Approval withdrawn — ' + why, `${cb8BasisTxt(ref)} → ${cb8BasisTxt(now_)}`);
  logA('Payment Plans', cb8Ent(pr), 'Payment terms need Finance approval again', 'Approved', 'Draft', `${why}: ${cb8BasisTxt(ref)} → ${cb8BasisTxt(now_)}`);
  toast('The payment terms depend on this change, so they need Finance approval again.', 'info');
}
const _saveDetCB8 = ACT.ch8SaveDetails;
ACT.ch8SaveDetails = el => {
  const pr = cbPr(el && el.dataset && el.dataset.id);
  if (pr && cb8Locked(pr) && pr.status === 'Draft') {
    const n = +v8('#np-d'), u = v8('#np-du'), lv = v8('#np-l'), lvCh = !!lv && lv !== pr.level, wf = cb8Wf(pr);
    if (lvCh || (pr.durV && (n !== pr.durV.n || u !== pr.durV.unit))) { logA('Payment Plans', cb8Ent(pr), 'Blocked: ' + (lvCh ? 'change the level' : 'change the duration'), '—', '—', `Payment terms waiting for Finance review (${wf.qid})`); return fieldErr(lvCh ? '#np-l' : '#np-d', `The payment terms are with Finance for review (${wf.qid}). Change the ${lvCh ? 'level' : 'duration'} after Finance decides.`); }
  }
  const r = _saveDetCB8(el); cb8BasisCheck(pr, 'the course duration or level changed'); return r;
};
const _obsSetCB8 = cbObsSet;
cbObsSet = function (pr, val) {
  if (pr && cb8Locked(pr) && pr.status === 'Draft' && cbObsOf(pr) !== val) { cb8LockMsg(pr, 'change whether the course has observations'); return false; }
  const r = _obsSetCB8.apply(this, arguments); cb8BasisCheck(pr, 'the observation answer changed'); return r;
};
const _n5SetCB8 = ACT.n5Settings;
ACT.n5Settings = el => {
  const pr = cbPr(el && el.dataset && el.dataset.p);
  if (pr && cb8Locked(pr) && pr.status === 'Draft' && n5CanEdit()) return cb8LockMsg(pr, 'change the observation settings');
  const r = _n5SetCB8(el), a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn && pr) { const f = a.fn; a.fn = function () { const x = f.apply(this, arguments); cb8BasisCheck(pr, 'the observation settings changed'); return x; }; }
  return r;
};
// Publishing a new academic version can change the observation configuration in force
['kPubProg', 's3WizPublish', 'ch8Publish'].forEach(n => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = function (el) { const pr = cbPr(el && el.dataset && (el.dataset.id || el.dataset.p)), r = f.apply(this, arguments); const m = MODAL && MODAL.actions && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (m && m.fn && pr) { const g = m.fn; m.fn = function () { const x = g.apply(this, arguments); cb8BasisCheck(pr, 'a new version was published'); return x; }; } else cb8BasisCheck(pr, 'a new version was published'); return r; }; });

/* ---------- Course Details: fees are entered when the course is created, then managed in Section 5 ---------- */
const _formCB8 = cbForm;
cbForm = function (pr) {
  let h = _formCB8.apply(this, arguments);
  h = h.replace(/Fees are entered here for now\. They move to Section 5 — Fees &amp; Payments \(CB8\)\./, pr ? 'Fees, fee options, observation fees and payment options are managed in Section 5 — Fees &amp; Payments.' : 'Starting fees. After the course is saved, fees, fee options, observation fees and payment options are managed in Section 5 — Fees &amp; Payments.');
  if (pr && cb8Managed(pr)) h = h.replace(/(<input class="input num" type="number" min="1" id="np-p"[^>]*?)>/, '$1 readonly>').replace(/(<label for="np-p">Price \(GBP\)<\/label><input[^>]*>)/, '$1<span class="hint">Change it in Section 5 — Fees &amp; Payments (approved by Finance).</span>').replace('Managed under Finance → Instalment plans → Level 3 fee options.', 'Managed in Section 5 — Fees &amp; Payments.');
  return h;
};
// The publishing check names the section where the terms are set
const _checkCB8 = ch8Check;
ch8Check = function (pr) {
  const r = _checkCB8.apply(this, arguments); if (!r || !r.block) return r;
  r.block = r.block.map(m => String(m).replace('submit them from the Payment plan step', 'submit them from Section 5 — Fees & Payments').replace('update them in the Payment plan step', 'update them in Section 5 — Fees & Payments'));
  // terms approved without a package review (the Super Administrator's own, D8) must still be complete: e.g. an observation fee for each permitted location
  const wf = pr && pr.status === 'Draft' && cb8Managed(pr) ? cb8Wf(pr) : null;
  if (wf && wf.status === 'Approved') cb8Issues(pr, cb8Work(pr)).forEach(x => r.block.push('Payment terms (Fees & Payments): ' + x.msg));
  return r;
};

/* ---------- Offer letter: {{payment_terms}} and the preview use the approved payment options (CB3 deferred item) ----------
   The letter text is the client's and is never changed. Only the opt-in {{payment_terms}} merge field is filled: the routes
   the applicant's fee option offers, each with its dated schedule from the batch start, and the deposit only when offered. */
function cb8PayTermsTxt(pkg, o, anchor, depOk) {
  if (!pkg || !o || !cbYmdOk(anchor)) return null;
  const parts = [], dep = pkg.dep.eff;
  if (depOk && pkg.dep.mode !== 'none' && dep > 0) parts.push(`a deposit of ${money(dep, 'GBP')}`);
  o.pay.forEach(x => { const s = cbSched(anchor, pkg.dur, o.fee, x.k); if (s.why) return; parts.push(x.k === 1 ? `the full fee of ${money(o.fee, 'GBP')} (due ${cbFd(s.rows[0].due)})` : `the first of ${x.k} payments (${s.rows.map(r => `${money(r.amount, 'GBP')} due ${cbFd(r.due)}`).join(', ')})`); });
  return parts.length ? 'pay ' + (parts.length > 1 ? `${parts.slice(0, -1).join('; ')}; or ${parts[parts.length - 1]}` : parts[0]) : null;
}
const cb8LtOpt = (pr, pkg) => { const v = ui('cb8LO:' + pr.id, ''), act = pkg.opts.filter(o => o.status === 'Active'); return act.find(o => o.id === v) || act[0]; };
const _payTxtCB8 = e2PayTxt;
e2PayTxt = function (t, depOk) {
  const pr = t && !Object.isFrozen(t) && !t.opt && t.pid ? cbPr(t.pid) : null, pkg = pr && cb8Cur(pr.id); // a programme's terms (letter previews) — a learner's own pinned terms are frozen and keep E2's wording until CB9
  if (pkg) { const o = cb8LtOpt(pr, pkg), x = cb8PayTermsTxt(pkg, o, cb8Anchor(pr).ymd, depOk); if (x) return x; }
  return _payTxtCB8.apply(this, arguments);
};
function cb8LetterCard(pr) {
  const pkg = cb8Cur(pr.id); if (cbRetired(pr)) return '';
  if (!pkg) return `<section class="card cb8-lt"><h2>Payment wording</h2><p class="small">${cb8Managed(pr) ? 'No financial package has been approved yet, so the {{payment_terms}} field shows the programme\'s current terms. Once Finance approves the package, the preview uses its payment options and dates.' : 'This programme\'s terms were set before financial packages; {{payment_terms}} uses them as before.'}</p></section>`;
  const o = cb8LtOpt(pr, pkg), a = cb8Anchor(pr), L = chLetterCur(pr.id), uses = !!(L && /\{\{payment_terms\}\}/.test((L.text || []).join(' ')));
  return `<section class="card cb8-lt"><h2>Payment wording — approved payment options</h2><p class="small muted">The letter text is the client's and isn't changed. Only the <span class="ch-merge">{{payment_terms}}</span> merge field is filled, from the applicant's fee option and its approved payment options, dated from their batch start. ${uses ? `Offer letter version ${L.v} uses it.` : `The current letter version${L ? ` (${L.v})` : ''} doesn't use it, so no letter wording changes; this shows what the field would say.`}</p>
    <div class="form-grid"><div class="field"><label for="cb8-lo-${pr.id}">Fee option</label><select class="select" id="cb8-lo-${pr.id}" data-onchange="cb8LtOpt" data-p="${pr.id}" data-cb-keep>${pkg.opts.filter(x => x.status === 'Active').map(x => `<option value="${esc(x.id)}" ${x === o ? 'selected' : ''}>${esc(x.label)} — ${money(x.fee, 'GBP')}</option>`).join('')}</select></div>${cb8AnchorPick(pr)}</div>
    <p class="cb8-ptxt"><strong>{{payment_terms}} →</strong> “${esc(cb8PayTermsTxt(pkg, o, a.ymd, true) || '—')}”</p><p class="xs muted">Shown with the deposit offered (a batch 28 days or more away). Plan version ${s4PlanCur(pr.id).v} · ${esc(a.lbl)} ${esc(cbFd(a.ymd))}.</p>${L ? `<button class="btn btn-sm" data-act="chLetterPrev" data-id="${pr.id}">Preview the letter with this wording</button>` : ''}</section>`;
}
INP.cb8LtOpt = el => { setUi('cb8LO:' + el.dataset.p, el.value); render(); };
const _ltPanelCB8 = cbLetterPanel;
cbLetterPanel = function (pr) { return _ltPanelCB8.apply(this, arguments) + cb8LetterCard(pr); };

/* ---------- Records ---------- */
UXC.push(['CB7', 'Duration-based schedule engine (21 Oct 2026)', [
  'One calendar-safe engine (js/cb-sched.js) works out payment dates from the batch start, the course duration (days, weeks, months, years) and the number of payments (1–24): payment 1 at batch start; whole months from the start when the months divide evenly (month-end clamp, no drift); otherwise payments spread by days across the real duration (29 February counted). Two payments on one day are refused. Amounts are E1\'s integer-pence rule (the last payment absorbs the rounding). Schedules record their rule (CB-SCHED-1). No screen changed in CB7.']]);
UXC.push(['CB8', 'Fees & Payments — the financial package (21 Oct 2026)', [
  'Section 5 "Fees & payment options": each fee option is a card (name, delivery mode, tuition fee, workplace and Academy-office observation fees, payment options). Level 3 programmes have any number of fee options; Level 2, 4 and 5 keep one programme fee (Q-CB-10). Observation fees appear only when the course has observations and the location is permitted; £0 means no charge; values not applicable now are kept.',
  '"Add payment option" takes any number of payments the duration allows (1 = pay in full) — not a fixed 2 / 3 / 6. Each option shows its rule ("Every 2 months from batch start", "Every 45–46 days…"), due points, exact amounts with the total, a live preview while typing, and a dated example from a sample start or one of the programme\'s real batches. The deposit (not available / Academy default / custom) is a separate route.',
  'Finance approval: Academic and System Admins submit the whole package (frozen) to the Approvals Queue ("Programme payment terms"); an Active Finance Admin — never the submitter — approves or requests changes with a reason. While it waits, the package, the duration, level, observation answer and locations are locked. Approval saves a new plan version with the package; Level 3 options are written with their stable IDs. The Super Administrator\'s own package is approved at once (D8). Changing the package, the duration, level, observation answer or locations afterwards sends the terms back to Draft; title, description, code, curriculum, assessments, criteria, letter and checklist do not.',
  'Finance sees the same package renderer in the queue item, Payment Plans ("View package" / "Review package") and the version history. The old single-method forms (wizard plan step, Finance\'s plan editor and fee-option card) refuse a package programme (logged). "Financial versions" lists every plan version with its frozen package. Offer Letter & Documents shows the {{payment_terms}} wording from the approved payment options and dates; letter text is unchanged.']]);
const _aIdxCB8 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB8(p) + `<section class="card idx-sec"><h2>CB8 — Fees &amp; Payments</h2><ul class="idx-list">${[
  chIdxLi('New programme NV-N1 (Draft) — Fees & payment options', { act: 'aJump', t: 'a-programmes.NV-N1.fees' }, 'CB8 — fee options, observation fees, payment options, deposit, submit to Finance.'),
  chIdxLi('NV-N1 — Financial versions', { act: 'aJump', t: 'a-programmes.NV-N1.payhist' }, 'CB8 — plan versions with their frozen packages.'),
  chIdxLi('Approvals Queue — financial packages', { act: 'aJump', t: 'a-queue' }, 'CB8 — Finance approves the whole package or requests changes.')].join('')}</ul></section>`;

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) cb8Init();
