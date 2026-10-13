/* ============================================================
   Client decisions — Batch 7b: Academy-office observations, the observation fee, waiver and payment cards
   (CH-37 … CH-41, CH-43; CH-38 / CH-40 as amended by the client).
   CH-37: the learner requests an Academy-office observation (or the Coordinator advises one and the learner
   consents); the batch's Academic Coordinator or the Academic Admin approves it ("Office observation request",
   escalates to the Super Admin after 7 days); then the observation assessor books an office location.
   CH-38: one observation fee per learner per course (£70 fully assisted / £100 self-paced, by the programme's
   Support type — Pending client P-31), raised when the learner's first observation of either type is confirmed;
   due on that date; the learner pays (sponsored learners too); not blocking; no VAT; GBP. CH-39: waiver —
   System Admin raises → Finance Admin review → Super Admin final (reminder after 7 days). CH-40: non-refundable;
   rescheduling has no effect (statuses Due / Paid / Waived). CH-41: payment dial and cards. CH-43: a workplace
   withdrawal notifies the Coordinator, who may advise an office observation (learner consent, normal approval).
   Decision effects are wired through ch-b7-apply.js (before guard.js). Loads after ch-b7a.js.
   ============================================================ */
'use strict';

const CH_OR_T = 'Office observation request', CH_WV_T = 'Observation fee waiver';
QTYPES.push(CH_OR_T, CH_WV_T); ACA_TYPES.push(CH_OR_T); FIN_TYPES.push(CH_WV_T); REMIND_TYPES.push(CH_WV_T);
QLBL[CH_OR_T] = 'Office observation'; QLBL[CH_WV_T] = 'Fee waiver';
const CH_SUPPORT = ['Fully assisted', 'Self-paced'];
['Twenty-three', 'Twenty-four'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });
const CH_P31 = `<span class="tbd" title="${TBD_TIP}">Pending client: Fully assisted vs self-paced: what defines each, and is it set per course or per batch (P-31)</span>`;
const chNow = () => now().toISOString();
const chLidName = lid => { const L = learnerById(lid); return L ? L.name : lid; };
const chWorldKey = lid => Object.keys(STORE.worlds || {}).find(v => STORE.worlds[v].me && STORE.worlds[v].me.id === lid) || null;
const chCooNotify = (to, t, b, go) => { if (STORE.coo && to) STORE.coo.notifs.unshift({ id: 'cn' + Date.now() + Math.random().toString(36).slice(2, 5), t, b, at: chNow(), go, unread: true, to }); };

/* ---------- CH-38 settings: fee amounts (Finance) and Support type per programme ---------- */
function chB7bSeedCfg() {
  if (!ADMIN || !ADMIN.config) return;
  [['CF-OFA', 'Observation fee — fully assisted', '£70.00'], ['CF-OFS', 'Observation fee — self-paced', '£100.00']].forEach(([id, name, value]) => { if (!ADMIN.config.some(c => c.name === name)) ADMIN.config.push({ id, group: 'Payments', name, value, fixed: false, history: [] }); });
}
const _baCh7b = buildAdmin;
buildAdmin = function () { const r = _baCh7b.apply(this, arguments); chB7bSeedCfg(); chB7bSeedQ(); return r; };
const chFeeAmt = support => { const c = chCfg(support === 'Self-paced' ? 'Observation fee — self-paced' : 'Observation fee — fully assisted'); const n = c && +String(c.value).replace(/[^\d.]/g, ''); return n > 0 ? n : (support === 'Self-paced' ? 100 : 70); };
const chSupports = () => (STORE.chSupport = STORE.chSupport || { 'NV-L3D': 'Self-paced' });
const chSupportOf = progId => chSupports()[progId] || 'Fully assisted';
const chProgByTitle = t => (ADMIN.programmes || []).find(p => p.title === t);
const chSupportOfCourse = title => { const p = chProgByTitle(title); return p ? chSupportOf(p.id) : 'Fully assisted'; };
// Admin → NVQ programme → new "Support type" tab (Pending client P-31)
const _pbCh7b = progBuilder;
progBuilder = function (id, t) {
  const sup = t === 'support', h = _pbCh7b(id, sup ? 'types' : t), pr = ADMIN.programmes.find(x => x.id === id); if (!pr) return h;
  const tabs = CH_PB_TABS.concat([['letter', 'Offer letter']]), old = subtabs(tabs, sup ? 'types' : t, 'a-programmes', id), neu = subtabs(tabs.concat([['support', 'Support type']]), t, 'a-programmes', id), k = h.indexOf(old);
  if (k < 0) return h;
  return h.slice(0, k) + neu + (sup ? chSupportTab(pr) : h.slice(k + old.length));
};
function chSupportTab(pr) {
  const cur = chSupportOf(pr.id), can = isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys());
  return `<section class="card"><h2>Support type</h2><p class="small">${CH_P31}</p>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Support type for ${esc(pr.title)}</legend>${CH_SUPPORT.map(s => `<label class="check"><input type="radio" name="ch-sup" value="${s}" ${s === cur ? 'checked' : ''} ${can ? '' : 'disabled'}>${s} <span class="xs muted">observation fee ${money(chFeeAmt(s), 'GBP')}</span></label>`).join('')}</fieldset>
    ${can ? `<button class="btn btn-sm btn-primary" data-act="chSupSave" data-id="${pr.id}">Save support type</button>` : `<p class="xs muted">${ic('lock', 12)} Set by the Academic Admin or Super Admin.</p>`}
    <p class="xs muted">Default: Fully assisted. The observation fee is set in System Configuration (Finance). A fee already raised keeps its amount.</p></section>`;
}
ACT.chSupSave = el => { const v = ($('input[name="ch-sup"]:checked') || {}).value, id = el.dataset.id, was = chSupportOf(id); if (!v || v === was) { toast('No change.', 'info'); return; } reasonDlg({ title: 'Change support type', ok: 'Save', body: `<p class="small">${esc(was)} → <strong>${esc(v)}</strong></p>`, onOk: r => { chSupports()[id] = v; logA('Programmes', id, 'Support type changed', was, v, r); render(); toast('Saved and audited.'); } }); };
// System Configuration: the fee rows are Finance Admin / Super Admin only
const _cfgCh7b = SCREENS['a-config'];
SCREENS['a-config'] = p => { let h = _cfgCh7b(p); if (!finOwner()) ['CF-OFA', 'CF-OFS'].forEach(id => { h = h.replace(`<button class="btn btn-sm" data-act="cfgEdit" data-id="${id}">Edit</button>`, `<span class="xs muted">${ic('lock', 12)} Finance Admin / Super Admin only</span>`); }); return h; };
// Finance → Payment Plans: the two fee settings, editable and audited
const _fPlansCh7b = SCREENS['f-plans'];
SCREENS['f-plans'] = p => { const h = _fPlansCh7b(p), k = h.indexOf('</div>', h.indexOf('<h1')); const card = `<section class="card ch-fees"><h2>Observation fees</h2><p class="small muted">One fee per learner per course, raised when the first observation is confirmed. No VAT. Non-refundable. Changes are audited.</p><dl class="kv">${['Observation fee — fully assisted', 'Observation fee — self-paced'].map(n => { const c = chCfg(n); return c ? `<dt>${esc(n)}</dt><dd><strong>${esc(c.value)}</strong> <button class="btn btn-sm" data-act="cfgEdit" data-id="${c.id}">Edit</button></dd>` : ''; }).join('')}</dl></section>`; return k < 0 ? card + h : h.slice(0, k + 6) + card + h.slice(k + 6); };

/* ---------- CH-38 fee items (one per learner per course) ---------- */
const chFees = () => (STORE.chFees = STORE.chFees || []);
const chFeeKey = (lid, course) => lid + '|' + course;
const chFeeOf = (lid, course) => chFees().find(f => f.lid === lid && (!course || f.course === course));
const chFeeOverdue = f => f.status === 'Due' && new Date(f.due) < now();
const chFeeTone = f => f.status === 'Paid' ? 'green' : f.status === 'Waived' ? 'grey' : chFeeOverdue(f) ? 'red' : 'amber';
const chFeeLabel = f => f.status === 'Due' && chFeeOverdue(f) ? 'Due — overdue' : f.status;
function chFeeRaise(lid, course, obsAt, v, quiet) {
  if (chFeeOf(lid, course)) return null; // never twice on the same enrolment
  const support = chSupportOfCourse(course), f = { id: 'OF-' + (101 + chFees().length), lid, v: v || chWorldKey(lid), name: chLidName(lid), course, support, amount: chFeeAmt(support), due: obsAt, raised: chNow(), status: 'Due' };
  chFees().push(f);
  if (!quiet) { if (f.v) notifyLearner(f.v, 'Payments', 'Observation fee due', `${money(f.amount, 'GBP')} for ${course}, due ${fd(f.due)}. One fee covers every observation on this course. Non-refundable.`, 'payments'); if (ADMIN && ADMIN.audit) logA('Finance', `${f.name} · ${f.id}`, 'Observation fee raised', '—', money(f.amount, 'GBP') + ' due ' + fd(f.due), 'First observation confirmed'); }
  return f;
}
// Raised when the learner's first observation (workplace or office) is confirmed with a date; observations confirmed
// before the fee existed (the seed data) don't raise one
const CH_OBS_DONE = ['Confirmed', 'Completed'];
function chFeeSync() {
  Object.keys(STORE.worlds || {}).forEach(v => { const w = STORE.worlds[v]; if (!w || !w.nvq || !w.observations) return;
    const first = w.observations.filter(o => !o.chPreFee && CH_OBS_DONE.includes(o.status)).sort((a, b) => new Date(a.at) - new Date(b.at))[0];
    if (first) chFeeRaise(w.me.id, w.nvq.title, first.at, v); });
  ((STORE.tas && STORE.tas.obs) || []).forEach(o => { if (!o.chPreFee && CH_OBS_DONE.includes(o.status) && o.lid && !chWorldKey(o.lid)) { const L = learnerById(o.lid), c = L && (L.courses || [])[0]; if (c) chFeeRaise(o.lid, c, o.at, null); } });
}
const _renderCh7b = render;
render = function () { try { if (STORE && STORE.worlds) chFeeSync(); } catch (e) { /* never block a render */ } return _renderCh7b.apply(this, arguments); };
function chB7bSeedStore() {
  Object.values(STORE.worlds || {}).forEach(w => (w.observations || []).forEach(o => { if (!('chPreFee' in o)) o.chPreFee = true; }));
  ((STORE.tas && STORE.tas.obs) || []).forEach(o => { if (!('chPreFee' in o)) o.chPreFee = true; });
  STORE.chFees = []; STORE.chOffReq = []; STORE.chSupport = { 'NV-L3D': 'Self-paced' };
  // Mock fees: Grace Mensah (sponsored, Level 2) — Due; Chloe Hughes — Paid; Kofi Asante — Due with a waiver at Finance review
  const d = STORE.worlds.D, dObs = d && d.observations.filter(o => o.status === 'Confirmed').sort((a, b) => new Date(a.at) - new Date(b.at))[0];
  if (d) chFeeRaise(d.me.id, d.nvq.title, dObs ? dObs.at : D(6, '10:00'), 'D', true);
  const P = chFeeRaise('IA-L-30237', 'Level 3 Diploma in Adult Care (England)', D(-20, '10:00'), null, true); if (P) { P.name = 'Chloe Hughes'; Object.assign(P, { status: 'Paid', paidAt: D(-22, '14:05'), ref: 'TXN-61840', method: 'Card' }); }
  const K = chFeeRaise('IA-L-30718', 'Level 3 Diploma in Adult Care (England)', D(3, '09:30'), null, true); if (K) { K.name = 'Kofi Asante'; K.waiver = 'AQ-9101'; }
}
const _isCh7b = initStore;
initStore = function () { const r = _isCh7b.apply(this, arguments); chB7bSeedStore(); chB7bSeedQ(); return r; };
if (typeof STORE !== 'undefined' && STORE.worlds && !STORE.chFees && typeof ADMIN !== 'undefined' && ADMIN) { try { chB7bSeedStore(); } catch (e) { STORE.chFees = null; } }
// Mock fee payments appear in the ledger
const _allTxCh7b = allTx;
allTx = function () { const t = _allTxCh7b.apply(this, arguments); return t.concat(chFees().filter(f => f.status === 'Paid' && !f.v && f.ref).map(f => ({ at: f.paidAt, ref: f.ref, gref: 'pi_3P' + f.ref.slice(4) + 'Of', receipt: 'RCP-' + f.ref.slice(-5), payer: f.name, payerType: 'Learner', course: 'Observation fee — ' + f.course, amount: f.amount, cur: 'GBP', mode: 'Gateway', status: 'Paid', source: 'Gateway (auto)' }))); };

/* ---------- CH-41 learner Payments: dial, cards, observation fee ---------- */
function chPlanTotals(w) {
  const pls = w.plans.filter(p => p.e === 'nvq').length ? w.plans.filter(p => p.e === 'nvq') : w.plans;
  let total = 0, paid = 0, next = null;
  pls.forEach(pl => { if (pl.deposit) { total += pl.deposit.amount; if (pl.deposit.status === 'Paid') paid += pl.deposit.amount; }
    pl.rows.forEach(r => { total += r.amount; paid += Math.min(r.paid || 0, r.amount); if (r.status !== 'Paid' && (!next || new Date(r.due) < new Date(next.r.due))) next = { r, pl }; }); });
  return { total, paid, pending: Math.max(0, total - paid), next, nvq: pls.some(p => p.e === 'nvq') };
}
function chFeeCard(f, learnerView) {
  const bank = (STORE.chBank || []).find(x => x.fee === f.id && x.status === 'Awaiting confirmation');
  return `<section class="card ch-feecard"><div class="row-b"><h2>Observation fee</h2>${chip(chFeeLabel(f), chFeeTone(f))}</div>
    <p class="big-num num">${money(f.amount, 'GBP')}</p>
    <p class="small">${esc(f.course)} · ${esc(f.support)} · ${f.status === 'Paid' ? `paid ${fd(f.paidAt)}` : f.status === 'Waived' ? `waived ${fd(f.waivedAt || f.raised)}` : `due ${fd(f.due)}`}</p>
    <p class="xs muted">One fee covers every observation on this course. Rescheduling doesn't change it. Non-refundable. No VAT.</p>
    ${learnerView && f.status === 'Due' ? (bank ? `<div class="note b-amber">${ic('clock')}<div class="small">Bank transfer awaiting confirmation · reference <span class="mono">${esc(bank.ref)}</span></div></div>` : `<div class="row"><button class="btn btn-sm btn-primary" data-act="chFeePay" data-id="${f.id}">Pay now</button><button class="btn btn-sm" data-act="chFeeBank" data-id="${f.id}">Bank transfer</button></div>`) : ''}
    ${!learnerView && f.waiver && f.status === 'Due' ? `<p class="small">${chip('Waiver in review', 'amber')} <a href="#a-queue.${f.waiver}" data-act="goTok" data-t="a-queue.${f.waiver}">${f.waiver}</a></p>` : ''}
    ${!learnerView && f.status === 'Due' && !f.waiver && (isSA() || (typeof isSys === 'function' && isSys())) ? `<button class="btn btn-sm" data-act="chFeeWaive" data-id="${f.id}">Waive observation fee</button>` : ''}</section>`;
}
function chPayCards(w) {
  const t = chPlanTotals(w), f = chFeeOf(w.me.id), pct = t.total ? Math.round(t.paid / t.total * 100) : 0;
  const cards = t.total ? `<div class="ch-paycards"><section class="card ch-dialcard"><div class="ch-dial" style="--p:${pct}" role="img" aria-label="${pct}% of your ${t.nvq ? 'programme' : 'course'} fee paid"><span class="num">${pct}%</span></div><div class="stack" style="gap:2px"><strong>${t.nvq ? 'Programme fee' : 'Course fees'}</strong><span class="small muted">${money(t.paid, 'GBP')} of ${money(t.total, 'GBP')} paid</span></div></section>
    <section class="card"><span class="xs muted">Paid</span><span class="big-num num">${money(t.paid, 'GBP')}</span></section>
    <section class="card"><span class="xs muted">Pending</span><span class="big-num num">${money(t.pending, 'GBP')}</span></section>
    <section class="card"><span class="xs muted">Next due</span>${t.next ? `<span class="big-num num">${money(t.next.r.amount - (t.next.r.paid || 0), 'GBP')}</span><span class="small">${fd(t.next.r.due)} · ${esc(t.next.pl.title)}</span>` : '<span class="small">Nothing due</span>'}</section></div>` : '';
  return cards + (f ? chFeeCard(f, true) : '');
}
const _payCh7b = SCREENS.payments;
SCREENS.payments = p => { const h = _payCh7b(p); if (p && p.tab && p.tab !== 'plans') return h; const add = chPayCards(W); if (!add) return h; const k = h.indexOf('</div>', h.indexOf('<h1')); return k < 0 ? add + h : h.slice(0, k + 6) + add + h.slice(k + 6); };
ACT.chFeePay = el => { const f = chFees().find(x => x.id === el.dataset.id); if (!f || f.status !== 'Due') return; checkout({ title: 'Observation fee — ' + f.course, amount: f.amount, cur: 'GBP', onSuccess: () => { Object.assign(f, { status: 'Paid', paidAt: chNow(), method: 'Card', ref: (W.tx[0] || {}).ref }); render(); } }); };
ACT.chFeeBank = el => {
  const f = chFees().find(x => x.id === el.dataset.id); if (!f || f.status !== 'Due') return; const ref = `${f.lid.replace(/^IA-L-/, 'IA-')}-OBS`;
  openModal({ title: 'Pay the observation fee by bank transfer', sub: esc(f.course), body: `<p><strong>Pay ${money(f.amount, 'GBP')} by bank transfer.</strong></p><div class="card flat"><p class="small">${chBankHtml(ref)}</p></div><p class="small">It shows as <strong>Awaiting confirmation</strong> until Finance records it. Non-refundable.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'I\'ve made the transfer', cls: 'btn-primary', fn: () => { STORE.chBank = STORE.chBank || []; STORE.chBank.push({ wv: f.v, fee: f.id, lid: f.lid, name: f.name, title: 'Observation fee — ' + f.course, course: 'Observation fee — ' + f.course, opt: 'fee', ref, amount: f.amount, at: chNow(), status: 'Awaiting confirmation' }); if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t: 'Bank transfer awaiting confirmation', b: `${f.name} · observation fee · ${money(f.amount, 'GBP')} · ref ${ref}`, at: chNow(), go: 'f-exceptions..bank', unread: true }); render(); toast('Thanks — Finance confirms your transfer when it arrives.'); } }] });
};
const _ptCh7b = payTargets;
payTargets = function () { return _ptCh7b().map(t => t.chb && t.chb.fee ? { ...t, label: `${t.chb.name} — observation fee (${money(t.chb.amount, 'GBP')} bank transfer, awaiting confirmation)` } : t); };
const _rpCh7b = recordPayment;
recordPayment = function (t, a, ref, mode, r) {
  const x = t && t.chb; if (!x || !x.fee) return _rpCh7b.apply(this, arguments);
  const f = chFees().find(y => y.id === x.fee), at = chNow(); x.status = 'Confirmed'; x.confirmed = { at, by: ADMIN.me.name, ref };
  if (f) Object.assign(f, { status: 'Paid', paidAt: at, method: 'Bank transfer', ref });
  const w = x.wv && STORE.worlds[x.wv]; if (w) { w.tx.unshift({ at, ref, method: 'Bank transfer', amount: a, status: 'Succeeded', desc: x.title, cur: 'GBP' }); notifyLearner(x.wv, 'Payments', 'Bank transfer received', `${money(a, 'GBP')} for your observation fee is confirmed.`, 'payments'); }
  else if (STORE.fin) STORE.fin.tx.unshift({ at, ref, gref: '—', receipt: 'RCP-' + ref.slice(-5), payer: x.name, payerType: 'Learner', course: x.title, amount: a, cur: 'GBP', mode, status: 'Paid', by: ADMIN.me.name, fin: true });
  logA('Finance', ref, 'Recorded offline payment', money(t.due, 'GBP') + ' due', money(a, 'GBP') + ' paid', r); toast('Payment recorded — the observation fee is paid.');
};

/* ---------- Admin / Finance views of the fee; overdue; ledger type ---------- */
const _aLCh7b = SCREENS['a-learner'];
SCREENS['a-learner'] = p => { const h = _aLCh7b(p); if (!p || p.tab !== 'payments') return h; const f = chFeeOf(p.id); if (!f) return h; const s = h.indexOf('<div class="subtabs"'), i = s < 0 ? -1 : h.indexOf('</div>', s); return i < 0 ? h + chFeeCard(f, false) : h.slice(0, i + 6) + chFeeCard(f, false) + h.slice(i + 6); };
const _fLCh7b = SCREENS['f-learner'];
SCREENS['f-learner'] = p => { const h = _fLCh7b(p); if (p.tab && p.tab !== 'summary') return h; const f = chFeeOf(p.id); if (!f) return h; const k = h.indexOf('<section class="card"><dl class="kv"><dt>Learner ID</dt>'); return k < 0 ? h : h.slice(0, k) + chFeeCard(f, false) + h.slice(k); };
const _fOdCh7b = SCREENS['f-overdue'];
SCREENS['f-overdue'] = p => {
  const h = _fOdCh7b(p), od = chFees().filter(chFeeOverdue);
  const card = `<section class="card ch-feeod"><h2>Observation fees overdue</h2>${od.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Course</th><th class="r">Amount</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${od.map(f => `<tr><td><a href="#f-learner.${f.lid}" data-go="f-learner" data-id="${f.lid}">${esc(f.name)}</a></td><td class="small">${esc(f.course)}</td><td class="r">${money(f.amount, 'GBP')}</td><td>${fd(f.due)} <span class="xs muted">(${-daysTo(f.due)} days)</span></td><td>${chip(chFeeLabel(f), 'red')}</td><td class="nowrap"><button class="btn btn-sm" data-act="chFeeRemind" data-id="${f.id}">Send reminder</button> <button class="btn btn-sm" data-go="f-learner" data-id="${f.lid}">Access</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No observation fees overdue.</p>'}<p class="xs muted">${ic('info', 12)} An unpaid fee never blocks an observation. Reminders and pausing access work as for any overdue payment.</p></section>`;
  const k = h.indexOf('</div>', h.indexOf('<h1')); return k < 0 ? card + h : h.slice(0, k + 6) + card + h.slice(k + 6);
};
ACT.chFeeRemind = el => { const f = chFees().find(x => x.id === el.dataset.id); if (!f) return; if (f.v) notifyLearner(f.v, 'Payments', 'Reminder: observation fee overdue', `${money(f.amount, 'GBP')} was due ${fd(f.due)}.`, 'payments'); logA('Finance', `${f.name} · ${f.id}`, 'Overdue reminder sent', 'Due', 'Reminded', 'Observation fee'); toast('Reminder sent.'); };
const _dtCh7b = dt;
dt = function (cfg) {
  if (cfg && cfg.id === 'fledger' && cfg.filters) cfg = { ...cfg, filters: cfg.filters.map(f => f.l !== 'For' ? f : { ...f, get: t => /^Observation fee/.test(t.course || '') ? 'Observation fee' : f.get(t), opts: (f.opts || []).includes('Observation fee') ? f.opts : (f.opts || []).concat(['Observation fee']) }) };
  return _dtCh7b.call(this, cfg);
};

/* ---------- CH-39 waiver: System Admin → Finance review → Super Admin final ---------- */
function chWaiverRaise(f, reason) {
  let n = 9100 + ADMIN.queue.length, id; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const at = chNow(), i = { id, type: CH_WV_T, raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: FIN_A, stage: 'review', related: [`${f.name} · Observation fee`, 'a-learner.' + f.lid + '.payments'], notes: [], amount: f.amount, cur: 'GBP', reason, history: [[ADMIN.me.name, at, 'Raised', reason]], data: { fee: f.id, lid: f.lid, course: f.course } };
  ADMIN.queue.unshift(i); f.waiver = id;
  logA('Finance', `${f.name} · ${f.id}`, 'Fee waiver requested', 'Due', 'Waiver in review', reason);
  if (isSA()) { saApply(i, reason); return i; }
  if (STORE.fin) STORE.fin.notifs.unshift({ to: FIN_A, t: 'Observation fee waiver to review', b: `${id} · ${f.name} · ${money(f.amount, 'GBP')}`, at, go: 'a-queue.' + id, unread: true });
  return i;
}
ACT.chFeeWaive = el => {
  const f = chFees().find(x => x.id === el.dataset.id); if (!f || f.status !== 'Due' || f.waiver) return;
  if (!(isSA() || (typeof isSys === 'function' && isSys()))) { logA('Finance', `${f.name} · ${f.id}`, 'Blocked: waiver not permitted', '—', '—', ADMIN.me.name); toast('Only the System Admin raises a fee waiver.', 'err'); return; }
  reasonDlg({ title: 'Waive observation fee — ' + esc(f.name), ok: isSA() ? 'Waive now' : 'Send for Finance review', body: `<p class="small">${money(f.amount, 'GBP')} · ${esc(f.course)}. ${isSA() ? 'As Super Administrator your waiver applies immediately.' : 'Finance Admin reviews it, then the Super Administrator gives final approval.'}</p>`, onOk: r => { const i = chWaiverRaise(f, r); render(); toast(isSA() ? `Waived — ${SA_TAG}.` : `Sent for Finance review (${i.id}).`); } });
};
CH7_EFFECTS[CH_WV_T] = (i, a, r) => {
  const f = chFees().find(x => x.id === (i.data || {}).fee); if (!f) return;
  if (a === 'approve' && i.stage !== 'final' && !i._sa && !isSA()) { // Finance review → forwarded to the Super Admin
    Object.assign(i, { stage: 'final', status: 'Pending', first: 'Super Administrator', finalSuper: true, forwardedBy: ADMIN.me.name, decision: '', decidedBy: undefined, raised: i.raised });
    i.history.push([ADMIN.me.name, chNow(), 'Finance review — recommended, forwarded to Super Admin', r]); logA('Approvals Queue', i.id, 'Finance review — forwarded to Super Admin', 'Pending', 'Pending (final)', r);
    if (ADMIN.myNotifs) ADMIN.myNotifs.unshift({ t: 'Fee waiver awaiting final approval', b: `${i.id} · ${f.name}`, at: chNow(), unread: true, go: 'a-queue.' + i.id }); return;
  }
  if (a === 'approve') { Object.assign(f, { status: 'Waived', waivedAt: chNow() }); logA('Finance', `${f.name} · ${f.id}`, 'Observation fee waived', 'Due', 'Waived', r); if (f.v) notifyLearner(f.v, 'Payments', 'Observation fee waived', `Your observation fee for ${f.course} (${money(f.amount, 'GBP')}) has been waived.`, 'payments'); }
  if (a === 'reject' || a === 'return') { f.waiver = null; if (STORE.sys) sysNotify(`Fee waiver ${a === 'reject' ? 'rejected' : 'returned'}`, `${i.id} · ${f.name} — ${r}`, 'a-queue.' + i.id, i.raisedBy); }
};
// Finance sees "Recommend — forward to Super Admin" instead of a final Approve while the waiver is at review
const _qdCh7b = queueDetail;
queueDetail = function (id) {
  let html = _qdCh7b(id); const i = qItem(id); if (!i || ![CH_WV_T, CH_OR_T].includes(i.type)) return html;
  const d = i.data || {}; let panel = '';
  if (i.type === CH_WV_T) { const f = chFees().find(x => x.id === d.fee); panel = `<section class="card"><h2>Observation fee waiver</h2><dl class="kv"><dt>Learner</dt><dd>${esc(f ? f.name : d.lid)}</dd><dt>Course</dt><dd>${esc(d.course)}</dd><dt>Fee</dt><dd>${f ? `${money(f.amount, 'GBP')} · ${chip(chFeeLabel(f), chFeeTone(f))}` : '—'}</dd><dt>Stage</dt><dd>${i.stage === 'final' ? 'Super Admin final approval' : 'Finance Admin review'}</dd></dl><p class="xs muted">${ic('info', 12)} Raised by the System Admin · Finance Admin review → Super Admin final · reminder after 7 days. The fee is non-refundable; a waiver clears it before payment.</p></section>`;
    if (typeof isFin === 'function' && isFin() && i.stage !== 'final') html = html.replace(/(data-act="qDo" data-id="[^"]+" data-a="approve"[^>]*>)Approve/, '$1Recommend — forward to Super Admin'); }
  if (i.type === CH_OR_T) { const q = chOrOf(d.req); panel = `<section class="card"><h2>Office observation request</h2><dl class="kv"><dt>Learner</dt><dd>${esc(q ? q.name : '—')}</dd><dt>Batch</dt><dd>${esc(q ? q.batch : '—')}</dd><dt>Started by</dt><dd>${q && q.source === 'coord' ? `Coordinator advice (${esc(q.by)}) — the learner consented` : 'The learner'}</dd><dt>Reason</dt><dd>${esc(q ? q.reason : i.reason)}</dd></dl><p class="xs muted">${ic('info', 12)} Decided by the batch's Academic Coordinator or the Academic Admin · escalates to the Super Admin after 7 days. After approval the observation assessor books an office location.</p></section>`; }
  const k = [html.indexOf('<div class="q3">'), html.indexOf('<div class="grid-2"><div class="stack-lg">')].find(x => x >= 0) ?? -1;
  return k < 0 ? html : html.slice(0, k) + `<div class="grid-2 k-panels">${panel}</div>` + html.slice(k);
};

/* ---------- CH-37 office observation requests ---------- */
const chOrs = () => (STORE.chOffReq = STORE.chOffReq || []);
const chOrOf = id => chOrs().find(r => r.id === id);
const chOrOpen = lid => chOrs().find(r => r.lid === lid && ['Awaiting consent', 'Pending approval', 'Approved'].includes(r.status));
const chOrApproved = lid => chOrs().find(r => r.lid === lid && r.status === 'Approved');
function chOrCreate(lid, source, reason, by) {
  const b = chBatchOfLid(lid), v = chWorldKey(lid), at = chNow();
  const r = { id: 'OR-' + (101 + chOrs().length), lid, v, name: chLidName(lid), batch: b ? b.code : '—', coord: b ? b.coord : null, source, reason, by, at, status: source === 'coord' ? 'Awaiting consent' : 'Pending approval', history: [[by, at, source === 'coord' ? 'Advised by the Coordinator' : 'Requested by the learner', reason]] };
  chOrs().push(r); if (r.status === 'Pending approval') chOrQueue(r);
  return r;
}
function chOrQueue(r) {
  let n = 9200 + ADMIN.queue.length, id; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const at = chNow(); ADMIN.queue.unshift({ id, type: CH_OR_T, raisedBy: r.name, raised: at, status: 'Pending', first: r.coord || 'Super Administrator', related: [`${r.name} · Academy-office observation`, 'a-learner.' + r.lid + '.observations'], notes: [], reason: r.reason, history: [[r.name, at, 'Raised', r.reason]], data: { req: r.id, lid: r.lid, batch: r.batch } });
  r.qid = id; r.status = 'Pending approval';
  chCooNotify(r.coord, 'Academy-office observation to decide', `${r.name} · ${r.batch} — ${r.reason}`, 'c-learner.' + r.lid);
  acaNotify('Academy-office observation request', `${id} · ${r.name} (${r.batch})`, 'a-queue.' + id);
}
CH7_EFFECTS[CH_OR_T] = (i, a, rsn) => {
  const r = chOrOf((i.data || {}).req); if (!r || !['approve', 'reject'].includes(a)) return;
  r.status = a === 'approve' ? 'Approved' : 'Rejected'; r.decidedBy = ADMIN.me.name; r.history.push([ADMIN.me.name, chNow(), r.status, rsn]);
  if (r.v) notifyLearner(r.v, 'Schedule', `Academy-office observation ${a === 'approve' ? 'approved' : 'not approved'}`, a === 'approve' ? 'Your observation assessor will propose a date at an Academy office.' : rsn, 'observations');
  if (a === 'approve') { const as = chEff(r.lid, 'obs'); tasNotifyW('Book an Academy-office observation', `${r.name} — approved (${i.id}). Propose a date and choose the office.`, 't-obs'); if (as) logA('Approvals Queue', i.id, 'Observation assessor to book', '—', as, ''); }
  if (S.portal !== 'coord') chCooNotify(r.coord, `Office observation ${a === 'approve' ? 'approved' : 'rejected'}`, `${r.name} — ${ADMIN.me.name}`, 'c-learner.' + r.lid);
};
// The Coordinator decides from their portal (recorded under the Coordinator's name)
const chAsCoord = f => { const me = ADMIN.me; ADMIN.me = { ...me, name: CME().name, roles: ['Academic Coordinator'] }; try { return f(); } finally { ADMIN.me = me; } };
const chIsMyBatchLid = lid => S.portal === 'coord' && myBatches().some(b => b.code === (chBatchOfLid(lid) || {}).code);
ACT.chOrDecide = el => {
  const i = qItem(el.dataset.id), a = el.dataset.a, r = i && chOrOf((i.data || {}).req);
  if (!i || !r || !isOpen(i) || i.status === 'Escalated' || !chIsMyBatchLid(r.lid)) { logA('Approvals Queue', el.dataset.id || '—', 'Blocked: office observation decision', '—', '—', (S.portal === 'coord' ? CME().name : ADMIN.me.name)); toast('You can\'t decide this request.', 'err'); return; }
  reasonDlg({ title: (a === 'approve' ? 'Approve' : 'Reject') + ' Academy-office observation — ' + esc(r.name), ok: a === 'approve' ? 'Approve' : 'Reject', danger: a === 'reject', body: `<p class="small">${esc(r.reason)}</p>`, onOk: rsn => { chAsCoord(() => applyDecision(i, a, rsn, {})); render(); toast(a === 'approve' ? 'Approved — the observation assessor books an office location.' : 'Rejected — the learner is told.'); } });
};
ACT.chOrAdvise = el => {
  const lid = el.dataset.id; if (!chIsMyBatchLid(lid)) { toast('You can\'t advise for this learner.', 'err'); return; } if (chOrOpen(lid)) { toast('There is already an open Academy-office request for this learner.', 'err'); return; }
  reasonDlg({ title: 'Advise an Academy-office observation', ok: 'Send to the learner', body: `<p class="small">The learner is asked to agree. Only if they accept does it go for approval. No extra fee — one observation fee covers every observation.</p>`, onOk: rsn => { const r = chOrCreate(lid, 'coord', rsn, CME().name); if (r.v) notifyLearner(r.v, 'Schedule', 'Academy-office observation advised', `${CME().name} advises an observation at an Academy office: ${rsn}. Accept or decline on Observations.`, 'observations'); chAsCoord(() => logA('Observations', `${r.name} · ${r.batch}`, 'Academy-office observation advised', '—', 'Awaiting consent', rsn)); render(); toast('Sent — the learner is asked to agree.'); } });
};
// Learner: request, or accept / decline the Coordinator's advice
ACT.chOrRequest = () => {
  if (chOrOpen(W.me.id)) { toast('You already have an open request.', 'err'); return; }
  openModal({ title: 'Request an Academy-office observation', body: `<p class="small">Your Academic Coordinator or the Academic Admin decides. If approved, your observation assessor proposes a date at an Academy office. No extra fee.</p><div class="field"><label for="or-r">Reason (required)</label><textarea class="textarea" id="or-r"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send request', cls: 'btn-primary', fn: () => { const rsn = mval('#or-r').trim(); if (!rsn) { fieldErr('#or-r', 'Say why you need an Academy-office observation'); return false; } chOrCreate(W.me.id, 'learner', rsn, W.me.first + ' ' + W.me.last); render(); toast('Request sent for approval.'); } }] });
};
ACT.chOrConsent = el => {
  const r = chOrOf(el.dataset.id), yes = el.dataset.a === 'accept'; if (!r || r.status !== 'Awaiting consent' || r.lid !== W.me.id) return;
  confirmDlg({ title: yes ? 'Agree to an Academy-office observation?' : 'Decline the Academy-office observation?', ok: yes ? 'Accept' : 'Decline', body: `<p class="small">${yes ? 'Your request goes for approval. If approved, your assessor proposes a date at an Academy office.' : 'Your Coordinator is told. Nothing else changes.'}</p>`, onOk: () => {
    r.history.push([W.me.first + ' ' + W.me.last, chNow(), yes ? 'Learner accepted' : 'Learner declined', '']);
    if (yes) chOrQueue(r); else { r.status = 'Declined'; chCooNotify(r.coord, 'Academy-office observation declined', `${r.name} declined your advice.`, 'c-learner.' + r.lid); }
    render(); toast(yes ? 'Thanks — sent for approval.' : 'Declined — your Coordinator is told.');
  } });
};
function chOrLearnerCard() {
  const r = chOrs().filter(x => x.lid === W.me.id).slice(-1)[0];
  const st = !r ? '' : r.status === 'Awaiting consent' ? `<div class="note b-amber" role="status">${ic('info')}<div class="small"><strong>${esc(r.by)} advises an observation at an Academy office.</strong> ${esc(r.reason)}<div class="row" style="margin-top:6px"><button class="btn btn-sm btn-primary" data-act="chOrConsent" data-id="${r.id}" data-a="accept">Accept</button><button class="btn btn-sm" data-act="chOrConsent" data-id="${r.id}" data-a="decline">Decline</button></div></div></div>`
    : `<p class="small">${chip(r.status, { 'Pending approval': 'amber', Approved: 'green', Booked: 'blue', Rejected: 'red', Declined: 'grey' }[r.status])} ${r.status === 'Approved' ? 'Your observation assessor will propose a date at an Academy office.' : r.status === 'Booked' ? 'Booked — see the proposed date below.' : r.status === 'Pending approval' ? 'Waiting for your Coordinator or the Academic Admin.' : esc(r.history[r.history.length - 1][3] || '')}</p>`;
  return `<section class="card ch-orcard"><div class="row-b"><h2>Academy-office observation</h2>${chOrOpen(W.me.id) ? '' : `<button class="btn btn-sm" data-act="chOrRequest">Request an Academy-office observation</button>`}</div>${st || '<p class="small muted">If a workplace observation isn\'t possible, you can ask for one at an Academy office. It needs approval.</p>'}</section>`;
}
const _obsListCh7b = obsList;
obsList = function () { const h = _obsListCh7b.apply(this, arguments); return W.nvq ? chOrLearnerCard() + h.replace("Observations at the Academy office don't need it.", 'Observations at an Academy office don\'t need it (request one below).') : h; };
const _aiCh7b = actionItems;
actionItems = function () { const out = _aiCh7b.apply(this, arguments); const r = W && W.me && chOrs().find(x => x.lid === W.me.id && x.status === 'Awaiting consent'); if (r) out.unshift({ sev: 'amber', t: 'Agree to an Academy-office observation?', d: `${r.by} advises it: ${r.reason}`, btn: 'Review', go: 'observations' }); return out; };
// Coordinator: learner record panel and dashboard
function chOrCoordCard(lid) {
  const r = chOrs().filter(x => x.lid === lid).slice(-1)[0], i = r && r.qid && qItem(r.qid), open = i && isOpen(i) && i.status !== 'Escalated';
  return `<section class="card ch-orcard"><div class="row-b"><h2>Academy-office observation</h2>${r ? chip(r.status, { 'Awaiting consent': 'amber', 'Pending approval': 'amber', Approved: 'green', Booked: 'blue', Rejected: 'red', Declined: 'grey' }[r.status]) : ''}</div>
    ${r ? `<p class="small">${r.source === 'coord' ? 'Advised by ' + esc(r.by) : 'Requested by the learner'} · ${fdt(r.at)} — ${esc(r.reason)}</p>` : '<p class="small muted">No Academy-office request.</p>'}
    ${open ? `<div class="row"><button class="btn btn-sm btn-primary" data-act="chOrDecide" data-id="${i.id}" data-a="approve">Approve</button><button class="btn btn-sm btn-danger" data-act="chOrDecide" data-id="${i.id}" data-a="reject">Reject</button></div><p class="xs muted">${i.id} · escalates to the Super Admin after 7 days.</p>` : i && i.status === 'Escalated' ? `<p class="small">${chip('Escalated', 'red')} Now with the Super Administrator.</p>` : ''}
    ${chOrOpen(lid) ? '' : `<button class="btn btn-sm" data-act="chOrAdvise" data-id="${lid}">Advise an Academy-office observation</button>`}</section>`;
}
const _cLCh7b = SCREENS['c-learner'];
SCREENS['c-learner'] = p => {
  let h = _cLCh7b(p); if ((p.tab && p.tab !== 'summary') || !myLearners(true).some(l => l.lid === p.id)) return h;
  h = h.replace('IQA findings, Approvals Queue items and audit logs.', 'IQA findings, Approvals Queue items (except Academy-office observation requests for your batches) and audit logs.');
  const k = h.indexOf('<div class="note b-grey">'); return k < 0 ? h + chOrCoordCard(p.id) : h.slice(0, k) + chOrCoordCard(p.id) + h.slice(k);
};
const _cDashCh7b = SCREENS['c-dashboard'];
SCREENS['c-dashboard'] = p => {
  const h = _cDashCh7b(p), mine = chOrs().filter(r => r.status === 'Pending approval' && chIsMyBatchLid(r.lid)).map(r => ({ r, i: qItem(r.qid) })).filter(x => x.i && isOpen(x.i) && x.i.status !== 'Escalated');
  if (!mine.length) return h;
  const card = `<section class="card ch-ordash"><h2>Academy-office observation requests</h2><ul class="list">${mine.map(({ r, i }) => `<li class="li"><div class="li-b"><a href="#c-learner.${r.lid}" data-go="c-learner" data-id="${r.lid}" class="strong">${esc(r.name)}</a><span class="small muted">${esc(r.batch)} · ${esc(r.reason)}</span></div><button class="btn btn-sm btn-primary" data-act="chOrDecide" data-id="${i.id}" data-a="approve">Approve</button><button class="btn btn-sm btn-danger" data-act="chOrDecide" data-id="${i.id}" data-a="reject">Reject</button></li>`).join('')}</ul></section>`;
  const k = h.indexOf('</div>', h.indexOf('<h1')); return k < 0 ? card + h : h.slice(0, k + 6) + card + h.slice(k + 6);
};

/* ---------- CH-37 booking: Academy office only with an approved request ---------- */
const CH_OFF_NEEDS = 'Needs an approved Academy-office observation request';
function chObLtGate() {
  const lid = mval('#op-l'), ok = !!chOrApproved(lid), r = $('input[name="op-lt"][value="office"]'); if (!r) return;
  r.disabled = !ok; if (ok) r.removeAttribute('title'); else r.title = CH_OFF_NEEDS;
  if (!ok && r.checked) { r.checked = false; const w = $('input[name="op-lt"][value="work"]'); if (w) { w.checked = true; INP.obLt(); } }
}
const _obPropCh7b = ACT.obPropose;
ACT.obPropose = el => {
  const res = _obPropCh7b(el); if (!MODAL || !/name="op-lt"/.test(MODAL.body || '')) return res;
  MODAL.body = MODAL.body.replace(/<span class="hint">Use the Academy office when a workplace observation isn't possible\.[^<]*<\/span>/, '<span class="hint">Academy office: only for a learner with an approved Academy-office observation request (learner request or Coordinator advice). No workplace permission or workplace email is needed.</span>');
  const hint = $('#modal-root fieldset .hint'); if (hint && /Use the Academy office/.test(hint.textContent)) hint.textContent = 'Academy office: only for a learner with an approved Academy-office observation request (learner request or Coordinator advice). No workplace permission or workplace email is needed.';
  chObLtGate();
  const a = MODAL.actions.find(x => x.label === 'Send proposal'); if (a && !a._ch7b) { const f = a.fn; a._ch7b = true; a.fn = (...x) => {
    const office = ($('input[name="op-lt"]:checked') || {}).value === 'office', lid = mval('#op-l'), rq = chOrApproved(lid);
    if (office && !rq) { tasLog('Observations', chLidName(lid), 'Blocked: office observation without an approved request', '—', '—', ''); toast(CH_OFF_NEEDS + '.', 'err'); return false; }
    const L = tasLearners(true).find(l => l.lid === lid), w = L && L.v ? STORE.worlds[L.v] : null, n = w ? w.observations.length : STORE.tas.obs.length;
    const out = f(...x);
    if (office && out !== false) { const rec = w ? (w.observations.length > n ? w.observations[0] : null) : (STORE.tas.obs.length > n ? STORE.tas.obs[0] : null); if (rec) { rq.status = 'Booked'; rq.obsId = rec.id; rq.history.push([TME().name, chNow(), 'Booked', chOfficeLine(chOfficeOf(rec))]); rec.chReq = rq.id; } render(); }
    return out; }; }
  return res;
};
const _obPermCh7b = INP.obPerm;
INP.obPerm = el => { const r = _obPermCh7b(el); const p = $('#op-perm'); if (p) p.innerHTML = p.innerHTML.replace('Choose <strong>Academy office</strong> above to observe at the Academy instead.', 'The learner\'s Academic Coordinator can advise an Academy-office observation (the learner agrees, then it\'s approved).'); chObLtGate(); return r; };

/* ---------- CH-43 workplace withdraws permission → the Coordinator is told ---------- */
const _wdCh7b = SUBMIT.wpcWithdraw;
SUBMIT.wpcWithdraw = f => {
  const l = STORE.wpc && STORE.wpc.links.find(x => x.token === (f && f.dataset ? f.dataset.t : null)), before = l && l.status;
  const res = _wdCh7b(f);
  if (l && l.status === 'Withdrawn' && before !== 'Withdrawn') { const lid = l.v ? STORE.worlds[l.v].me.id : (learnerById && (allLearners().find(x => x.name === l.learner) || {}).id), b = lid && chBatchOfLid(lid); if (b) chCooNotify(b.coord, 'Workplace permission withdrawn', `${l.learner} · ${l.home || ''} — you can advise an Academy-office observation (the learner must agree).`, 'c-learner.' + lid); }
  return res;
};

/* ---------- Mock queue items: one office request awaiting the Coordinator; Kofi Asante's waiver at Finance review ---------- */
function chB7bSeedQ() {
  if (!ADMIN || !ADMIN.queue || !STORE.chFees) return;
  if (!chOrs().some(r => r.id === 'OR-101') && STORE.worlds.D) {
    const lid = STORE.worlds.D.me.id, b = chBatchOfLid(lid), at = D(-1, '18:20');
    chOrs().push({ id: 'OR-101', lid, v: 'D', name: VNAME('D'), batch: b ? b.code : '—', coord: b ? b.coord : null, source: 'learner', reason: 'My workplace hasn\'t given permission yet and my programme end is close.', by: VNAME('D'), at, status: 'Pending approval', qid: 'AQ-9201', history: [[VNAME('D'), at, 'Requested by the learner', '']] });
  }
  const r = chOrOf('OR-101');
  if (r && !ADMIN.queue.some(i => i.id === 'AQ-9201')) ADMIN.queue.push({ id: 'AQ-9201', type: CH_OR_T, raisedBy: r.name, raised: r.at, status: 'Pending', first: r.coord, related: [`${r.name} · Academy-office observation`, 'a-learner.' + r.lid + '.observations'], notes: [], reason: r.reason, history: [[r.name, r.at, 'Raised', r.reason]], data: { req: r.id, lid: r.lid, batch: r.batch } });
  const k = chFees().find(f => f.waiver === 'AQ-9101');
  if (k && !ADMIN.queue.some(i => i.id === 'AQ-9101')) ADMIN.queue.push({ id: 'AQ-9101', type: CH_WV_T, raisedBy: SYS_A, raised: D(-1, '11:00'), status: 'Pending', first: FIN_A, stage: 'review', related: ['Kofi Asante · Observation fee', 'a-learner.' + k.lid + '.payments'], notes: [], amount: k.amount, cur: 'GBP', reason: 'Observation moved to the office at the Academy\'s request after a workplace incident.', history: [[SYS_A, D(-1, '11:00'), 'Raised', 'Observation moved to the office at the Academy\'s request after a workplace incident.']], data: { fee: k.id, lid: k.lid, course: k.course } });
}
if (typeof ADMIN !== 'undefined' && ADMIN) chB7bSeedQ();

/* ---------- Demo Scenario #7 (office steps) and #23 ---------- */
const chCoordA = (route, id) => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; go(route, { id }); toast('Viewing as Dr Helen Carter — Academic Coordinator.', 'info'); };
ACT.chSc7Advise = () => chCoordA('c-learner', STORE.worlds.C.me.id);
ACT.chSc23Coord = () => chCoordA('c-learner', STORE.worlds.C.me.id);
ACT.chSc23Book = () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-obs'); ACT.obPropose({ dataset: { l: STORE.worlds.C.me.id } }); toast('Viewing as Sarah Okonkwo — Aisha\'s observation assessor. Choose Academy office → Luton office.', 'info'); };
ACT.chSc23Sys = () => { ACT.switchRole({ dataset: { r: 'sysA' } }); S.signedIn = true; go('a-learner', { id: 'IA-L-30718', tab: 'payments' }); toast('Viewing as Owen Price — System Admin. Kofi Asante\'s fee: Waive observation fee.', 'info'); };
ACT.chSc23Fin = () => { ACT.switchRole({ dataset: { r: 'finA' } }); S.signedIn = true; go('a-queue', { id: 'AQ-9101' }); toast('Viewing as Leila Haddad — Finance Admin review.', 'info'); };
ACT.chSc23SA = () => { SA_ENTER(); go('a-queue', { id: 'AQ-9101' }); };
const SA_ENTER = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; toast('Viewing as the Super Administrator — final approval.', 'info'); };
const _scListCh7b = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  return _scListCh7b().map(sc => sc[0] !== '7' ? sc : [sc[0], sc[1], sc[2] + ', CH-37, CH-43', sc[3].filter(x => !/Assessor proposes an Academy office observation instead|Learner accepts the Academy office visit/.test(x.text)).concat([
    s('The learner\'s Academic Coordinator is notified and advises an Academy-office observation, with a reason (CH-43).', '', '', 'chSc7Advise'),
    s('The learner agrees — this raises an "Office observation request" (no extra fee).', 'learner:C', 'observations'),
    s('The Coordinator approves it on the learner record.', '', '', 'chSc23Coord'),
    s('The observation assessor proposes a date at the Luton office (NVQ criteria only, no workplace email).', '', '', 'chSc23Book'),
    s('Learner accepts the Academy office visit.', 'learner:C', 'observations')])]).concat([['23', 'Academy-office observation and fee', 'CH-37 – CH-41', [
    s('Aisha Rahman requests an Academy-office observation, with a reason.', 'learner:C', 'observations'),
    s('Her Academic Coordinator approves it on her learner record (or the dashboard).', '', '', 'chSc23Coord'),
    s('Her observation assessor books the Luton office and proposes a date.', '', '', 'chSc23Book'),
    s('She accepts — her first confirmed observation, so the observation fee (£70, fully assisted) is raised, due on that date.', 'learner:C', 'observations'),
    s('She pays it from Payments (card or bank transfer); the progress dial and payment cards update.', 'learner:C', 'payments'),
    s('The System Admin raises a waiver on Kofi Asante\'s fee.', '', '', 'chSc23Sys'),
    s('The Finance Admin reviews it and forwards it to the Super Admin.', '', '', 'chSc23Fin'),
    s('The Super Admin gives final approval — the fee is Waived and the learner is told.', '', '', 'chSc23SA')]]]);
};
CDL_SCEN.push(['23', 'Academy-office observation and fee', 'Client-defined (CH-37 – CH-41)']);

/* ---------- Records ---------- */
CH_APPLIED['7b'] = '13 Oct 2026';
UXC.push(['CH batch 7b', 'Client decisions — Batch 7b (CH-37 … CH-41, CH-43)', [
  'CH-37: Learner → Observations → "Request an Academy-office observation" (reason required) raises "Office observation request". The Coordinator can "Advise an Academy-office observation" from the learner record; the learner accepts or declines (dashboard Action needed and Observations); only Accept raises the request; Decline is recorded and the Coordinator is told. The batch\'s Academic Coordinator (learner record or dashboard panel) or the Academic Admin (Approvals Queue) approves or rejects with a reason; it escalates to the Super Admin after 7 days. The assessor can choose "Academy office" only for a learner with an approved request, and books an office location; workplace observations are unchanged. The Coordinator\'s "Not shown" note has an exception for these requests.',
  'CH-38: one observation fee per learner per course — £70 fully assisted / £100 self-paced (System Configuration, Finance Admin / Super Admin; also on Finance → Payment Plans; audited), by the programme\'s new "Support type" tab (default Fully assisted; tagged Pending client P-31; Level 3 2027 update is Self-paced). Raised when the learner\'s first observation of either type is confirmed, due on that date, never twice on the same enrolment; the learner pays (sponsored learners too); an unpaid fee never blocks an observation and shows in Finance → Overdue & Access ("Observation fees overdue", reminders, access). No VAT; GBP. Ledger "For" filter: "Observation fee".',
  'CH-39: "Waive observation fee" (System Admin, on Learner 360 → Payments) raises "Observation fee waiver": Finance Admin review ("Recommend — forward to Super Admin") → Super Admin final; reminder after 7 days; self-approval blocked; the Super Admin\'s own waiver applies immediately. Approved → Waived, learner told.',
  'CH-40: the fee is non-refundable (no refund action; note on every fee card). One fee covers every observation, so rescheduling has no effect. Statuses: Due / Paid / Waived.',
  'CH-41: learner Payments — a progress dial (% of the programme fee paid) and Paid, Pending and Next due cards, plus an Observation fee card (amount, status, Pay now by card or bank transfer) when a fee exists; sponsored learners see the fee card too. All GBP.',
  'CH-43: when a workplace withdraws permission the Coordinator is notified and can advise an Academy-office observation; the learner must agree, then the normal approval applies. No automatic switch to the office and no extra fee. The withdrawal messages are reworded.',
  'Scenario #7: the last two steps (assessor proposes an Academy office observation; learner accepts) become: Coordinator notified and advises → learner agrees → Coordinator approves → assessor proposes the Luton office → learner accepts. New Demo Scenario #23 "Academy-office observation and fee". "Who approves what" has 19 rows. Mock: Grace Mensah\'s request awaiting her Coordinator (AQ-9201); fees — Grace Mensah (sponsored) Due, Chloe Hughes Paid, Kofi Asante Due with a waiver at Finance review (AQ-9101); observations confirmed before the fee existed don\'t raise one.']]);
const _aIdxCh7b = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh7b(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Approvals item — Office observation request', { act: 'aJump', t: 'a-queue.AQ-9201' }, 'CH-37 — Grace Mensah\'s request; the Academic Admin or her Coordinator decides.'),
  chIdxLi('Approvals item — Observation fee waiver (Finance review)', { act: 'aJump', t: 'a-queue.AQ-9101' }, 'CH-39 — Finance review, then Super Admin final.'),
  chIdxLi('Learner 360 → Payments — observation fee and waiver', { act: 'aJump', t: 'a-learner.IA-L-30718.payments' }, 'CH-38 / CH-39 — Kofi Asante\'s fee with its waiver in review.'),
  chIdxLi('NVQ programme → Support type', { act: 'aJump', t: 'a-programmes.NV-L3D.support' }, 'CH-38 — Self-paced example (£100 fee); Pending client P-31.')].join('')}`);
const _idxCh7b = SCREENS.index;
SCREENS.index = p => _idxCh7b(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Observations — request an Academy-office observation', { go: 'observations' }, 'CH-37 — ask for an office observation (needs approval).'),
  chIdxLi('Payments — progress dial, payment cards, observation fee', { go: 'payments' }, 'CH-41 — what you\'ve paid, what\'s next, and the observation fee.')].join('')}`);
const _cIdxCh7b = SCREENS['c-index'];
SCREENS['c-index'] = p => _cIdxCh7b(p) + `<section class="card idx-sec"><h2>Client decisions (CH) — Batch 7b</h2><ul class="idx-list">${[
  chIdxLi('Learner record — Academy-office observation (advise, approve)', { act: 'goTok', t: 'c-learner.' + STORE.worlds.C.me.id }, 'CH-37 / CH-43 — advise an office observation; decide requests.'),
  chIdxLi('Dashboard — office observation requests', { act: 'goTok', t: 'c-dashboard' }, 'CH-37 — requests awaiting you.')].join('')}</ul></section>`;
const _fIdxCh7b = SCREENS['f-index'];
SCREENS['f-index'] = p => _fIdxCh7b(p) + `<section class="card idx-sec"><h2>Client decisions (CH) — Batch 7b</h2><ul class="idx-list">${[
  chIdxLi('Approvals item — Observation fee waiver (review)', { act: 'goTok', t: 'a-queue.AQ-9101' }, 'CH-39 — recommend and forward to the Super Admin.'),
  chIdxLi('Overdue & Access — observation fees overdue', { act: 'goTok', t: 'f-overdue' }, 'CH-38 — unpaid fees after the observation date.'),
  chIdxLi('Payment Plans — observation fee settings', { act: 'goTok', t: 'f-plans' }, 'CH-38 — £70 fully assisted / £100 self-paced.')].join('')}</ul></section>`;
