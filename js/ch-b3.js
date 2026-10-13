/* ============================================================
   Client decisions — Batch 3: after payment (CH-11 Finance side, CH-12, CH-13, CH-14).
   CH-12 rejected after payment: access stays; Finance and Academic Admins are alerted.
   CH-13 no automatic refund — Finance decides, through the existing Raise refund flow.
   CH-14 manual "Pause access" on an enrolment (Finance, System and Super Admin), separate from the 30-day auto pause.
   CH-11 bank-transfer sign-ups wait in Finance as "Awaiting confirmation" until Record offline payment.
   Loads after ch-b2.js.
   ============================================================ */
'use strict';

/* ---------- CH-12 / CH-13 rejected after payment ---------- */
// What the learner has paid towards the programme (deposit and instalments)
const chPaidTowards = w => { const pl = (w.plans || []).find(p => p.e === 'nvq'); if (!pl) return 0; return (pl.deposit && pl.deposit.status === 'Paid' ? pl.deposit.amount : 0) + pl.rows.reduce((a, r) => a + (r.paid || 0), 0); };
function chRejectedAfterPay(v, reason) {
  const w = STORE.worlds[v]; if (!w) return; const paid = chPaidTowards(w); if (!(paid > 0)) return;
  const n = VNAME(v), id = w.me.id, t = 'Admission rejected after payment', b = `${n}, ${w.nvq.title}, ${money(paid, 'GBP')} paid`, at = now().toISOString();
  w.admission.rejectedAfterPay = { paid, at };
  STORE.fin.notifs.unshift({ to: 'all', t, b, at, go: 'f-learner.' + id, unread: true });
  if (typeof acaNotify === 'function') acaNotify(t, b, 'a-learner.' + id, 'all', 'Admissions');
  logA('Admissions', `${n} (${id})`, 'Rejected after payment — Finance and Academic Admins notified', 'Paid ' + money(paid, 'GBP'), 'Access kept; refund is a Finance decision', reason);
}
const chCanRefund = () => isSA() || (typeof isFin === 'function' && !!isFin());
const chRefundHint = (w, v) => `<div class="note b-amber ch-refund">${ic('info')}<div class="small"><strong>Rejected after payment — ${money(chPaidTowards(w), 'GBP')} paid.</strong> The learner's access stays as it is. Refund is a Finance decision (raise a refund if appropriate).${chCanRefund() ? `<div class="b-act"><button class="btn btn-sm" data-act="chRaiseRefund" data-v="${v}">Raise refund</button></div>` : '<br><span class="muted">Finance Admins have been notified.</span>'}</div></div>`;
// Raise refund: the existing flow (raiseRefund), routed as usual — pre-filled from the learner's latest payment
ACT.chRaiseRefund = el => {
  if (!chCanRefund()) { toast('Refunds are raised by Finance.', 'err'); return; }
  const v = el.dataset.v, w = STORE.worlds[v], tx = allTx().filter(t => t.v === v && t.status === 'Paid').sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  if (!tx) { toast('No payment found for this learner.', 'err'); return; }
  raiseRefund(tx, { amount: tx.amount, cat: 'Other', text: `Admission rejected after payment (${w.nvq.title}).`, cons: 'Retain access' });
};
const _appDetailCh3 = appDetail;
appDetail = function (id) {
  const h = _appDetailCh3(id), a = allApplications().find(x => x.id === id); if (!a || !a.v || a.status !== 'Rejected') return h;
  const w = STORE.worlds[a.v]; if (!(chPaidTowards(w) > 0)) return h;
  const k = h.indexOf('<section class="card">'); return k < 0 ? h + chRefundHint(w, a.v) : h.slice(0, k) + chRefundHint(w, a.v) + h.slice(k);
};

/* ---------- CH-14 manual Pause access (one enrolment; reason mandatory; separate from the 30-day auto pause) ---------- */
const chCanPause = () => isSA() || (typeof isFin === 'function' && !!isFin()) || (typeof isSys === 'function' && isSys());
const chPKey = (lid, ek) => lid + '|' + ek;
const chPaused = (lid, ek) => (STORE.chPause || {})[chPKey(lid, ek)];
const chEnrolKey = e => e.id || e.title;
const chWorldOf = lid => Object.values(STORE.worlds).find(w => w.me && w.me.id === lid);
const chEnrolTitle = (lid, ek) => { const w = chWorldOf(lid), e = w && w.enrolments.find(x => x.id === ek); return e ? e.title : ek; };
const chPauseBtn = (lid, ek) => !chCanPause() ? '' : chPaused(lid, ek) ? `<button class="btn btn-sm" data-act="chRestore" data-l="${lid}" data-e="${esc(ek)}">Restore access</button>` : `<button class="btn btn-sm" data-act="chPause" data-l="${lid}" data-e="${esc(ek)}">Pause access</button>`;
const chPausedChip = (lid, ek) => chPaused(lid, ek) ? `<div>${chip('Access paused (manual)', 'red')}<div class="xs muted">${esc(chPaused(lid, ek).by)} · ${fd(chPaused(lid, ek).at)}: ${esc(chPaused(lid, ek).reason)}</div></div>` : '';
ACT.chPause = el => {
  const lid = el.dataset.l, ek = el.dataset.e, L = learnerById(lid), title = chEnrolTitle(lid, ek);
  if (!chCanPause()) { logA('Learners', `${L ? L.name : lid} · ${title}`, 'Blocked: Pause access', '—', '—', 'Not allowed for ' + ADMIN.me.name); toast('Only Finance, System and Super Administrators can pause access.', 'err'); return; }
  reasonDlg({ title: 'Pause access — ' + esc(title), ok: 'Pause access', danger: true, label: 'Reason (required — not shown to the learner)', body: `<p class="small">${esc(L ? L.name : lid)} keeps their work and progress. They see that access is paused, without the reason. This is separate from the automatic pause for overdue payments.</p>`,
    onOk: r => { const at = now().toISOString(); (STORE.chPause = STORE.chPause || {})[chPKey(lid, ek)] = { by: ADMIN.me.name, role: chRoleName(), at, reason: r };
      const w = chWorldOf(lid); if (w) notifyLearner(w.v, 'Payments', 'Access paused', `Your access to ${title} is paused. Contact the Academy if you have questions — your work and progress are kept.`, 'messages');
      logA(chArea(), `${L ? L.name : lid} · ${title}`, 'Access paused (manual)', 'Active', 'Paused', r); render(); toast(`Access to ${title} paused. The learner has been notified.`); } });
};
ACT.chRestore = el => {
  const lid = el.dataset.l, ek = el.dataset.e, L = learnerById(lid), title = chEnrolTitle(lid, ek);
  if (!chCanPause()) { toast('Only Finance, System and Super Administrators can restore access.', 'err'); return; }
  reasonDlg({ title: 'Restore access — ' + esc(title), ok: 'Restore access', label: 'Reason (required)', onOk: r => {
    delete (STORE.chPause || {})[chPKey(lid, ek)]; const w = chWorldOf(lid);
    if (w) notifyLearner(w.v, 'Payments', 'Access restored', `Your access to ${title} is restored.`, 'courses');
    logA(chArea(), `${L ? L.name : lid} · ${title}`, 'Access restored (manual pause lifted)', 'Paused', 'Active', r); render(); toast('Access restored. The learner has been notified.'); } });
};
const chRoleName = () => isSA() ? 'Super Administrator' : (typeof isSys === 'function' && isSys()) ? 'System Administrator' : 'Finance Admin';
const chArea = () => (typeof isFin === 'function' && isFin()) ? 'Finance' : 'Learners';
// Learner 360 → Enrolments: the action on each row, the manual-pause state under the status
const _lEnrolCh = lEnrol;
lEnrol = function (L, w) {
  const d0 = dt;
  dt = function (cfg) {
    if (cfg && /^lu-r-lenr-/.test(cfg.id)) { const a0 = cfg.act; cfg = { ...cfg, cols: cfg.cols.map(c => c.k === 'status' ? { ...c, h: e => c.h(e) + chPausedChip(L.id, chEnrolKey(e)) } : c), act: e => { const h = a0 ? a0(e) : '', btn = chPauseBtn(L.id, chEnrolKey(e)); return /<\/div>$/.test(h) ? h.replace(/<\/div>$/, btn + '</div>') : h + btn; } }; }
    return d0.call(this, cfg);
  };
  try { return _lEnrolCh(L, w); } finally { dt = d0; }
};
// Finance → learner record: an Access card on the summary tab
const _fLearnerCh = SCREENS['f-learner'];
SCREENS['f-learner'] = p => {
  const h = _fLearnerCh(p); if ((p.tab || 'summary') !== 'summary') return h;
  const L = learnerById(p.id); if (!L) return h; const w = L.v ? STORE.worlds[L.v] : null;
  const list = w ? w.enrolments.map(e => [chEnrolKey(e), e.title, e.status]) : (L._enr || L.courses.map(t => ({ title: t, status: 'Active' }))).map(e => [e.title, e.title, e.status]);
  const rej = w && w.admission && w.admission.status === 'Rejected' && chPaidTowards(w) > 0 ? chRefundHint(w, L.v) : '';
  const card = `${rej}<section class="card ch-access"><h2>Access by enrolment</h2><p class="small muted">Pause one enrolment when a payment never arrives or for another Finance reason. The learner sees that access is paused, without the reason. Separate from the automatic pause after 30 days overdue.</p><ul class="list">${list.map(([ek, ti, st]) => `<li class="li"><div class="li-b"><strong>${esc(ti)}</strong>${chPausedChip(L.id, ek) || `<span class="xs muted">${esc(st || 'Active')}</span>`}</div>${chPauseBtn(L.id, ek)}</li>`).join('')}</ul></section>`;
  const k = h.indexOf('<section class="card"><h2>Enrolments and fee responsibility</h2>');
  return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k);
};
// Learner: the existing "Access paused" banner (no reason), and the paused enrolment's content locks
const chMyPaused = () => (W.enrolments || []).filter(e => chPaused(W.me.id, chEnrolKey(e)));
const _gbCh3 = globalBanners;
globalBanners = function () {
  const h = _gbCh3(), ps = chMyPaused(); if (!ps.length || S.portal !== 'learner') return h;
  const b = banner('red', 'lock', `<strong>Access paused.</strong> Your access to ${ps.map(e => esc(e.title)).join(', ')} is paused by the Academy. Its course content, assignments and resources are locked. Your work and progress are all kept — contact the Academy if you have questions.`, `<button class="btn btn-sm" data-go="messages">Message the Academy</button>`);
  return h ? h.replace('<div class="banners">', '<div class="banners">' + b) : `<div class="banners">${b}</div>`;
};
const CH_NVQ_ROUTES = ['assignments', 'assignment', 'progress', 'observations', 'resources'];
const _lockCh3 = lockFor;
lockFor = function (r) {
  const ps = chMyPaused(), id = (S.params || {}).id;
  const e = ps.find(x => (x.id === 'nvq' && (CH_NVQ_ROUTES.includes(r) || (r === 'course' && id === 'nvq'))) || (x.id !== 'nvq' && ['course', 'quiz'].includes(r) && id === x.id));
  if (e) return { title: 'Access paused', msg: `Your access to ${e.title} is paused. Payments, Messages, Profile, Certificates and Notifications stay available. Your work and progress are kept — contact the Academy if you have questions.`, cta: ['messages', 'Message the Academy'], tone: 'red' };
  return _lockCh3(r);
};
// The store is rebuilt with the demo data
const _isCh3 = initStore; initStore = function () { _isCh3(); STORE.chPause = {}; chSeedBank(); };

/* ---------- CH-11 Finance: bank-transfer sign-ups "Awaiting confirmation" ---------- */
function chSeedBank() { // mock: Kavya Iyer paid her first Level 2 instalment by bank transfer three days ago
  STORE.chBank = (STORE.chBank || []).filter(x => x.v);
  STORE.chBank.push({ lid: 'IA-L-31900', name: 'Kavya Iyer', ek: 'Level 2 Diploma in Care (England)', course: 'Level 2 Diploma in Care (England)', opt: 'instalment', ref: 'IA-31900-INS1', amount: 300, at: D(-3, '11:40'), status: 'Awaiting confirmation' });
}
if (typeof STORE !== 'undefined' && STORE.worlds && !(STORE.chBank || []).some(x => x.lid === 'IA-L-31900')) chSeedBank();
// Finance is told when a sign-up is paid by bank transfer
const _ccCh3 = chComplete;
chComplete = function (w, o, fromCheckout, quiet) {
  _ccCh3.apply(this, arguments);
  if (!quiet && o && o.method === 'bank') STORE.fin.notifs.unshift({ to: 'all', t: 'Bank transfer awaiting confirmation', b: `${chFullName(w)} · ${w.nvq.title} · ${money(o.amount, 'GBP')} · ref ${o.ref}`, at: now().toISOString(), go: 'f-exceptions..bank', unread: true });
};
const chBankRow = x => { const w = x.v ? STORE.worlds[x.v] : null; return { ...x, lid: x.lid || (w && w.me.id), name: x.name, course: x.course || (w && w.nvq.title), ek: x.ek || 'nvq', key: x.v ? (x.opt === 'deposit' ? x.v + '|dep' : x.v + '|nvq|1') : 'chb|' + x.ref }; };
// Record offline payment: the mock sign-up is a payment target too
const _ptCh3 = payTargets;
payTargets = function () { return _ptCh3().concat((STORE.chBank || []).filter(x => !x.v && x.status === 'Awaiting confirmation').map(x => ({ key: 'chb|' + x.ref, label: `${x.name} — ${x.course} — ${x.opt === 'deposit' ? 'deposit' : 'first instalment'} (${money(x.amount, 'GBP')} bank transfer, awaiting confirmation)`, cur: 'GBP', due: x.amount, chb: x }))); };
const _rpCh3 = recordPayment;
recordPayment = function (t, a, ref, mode, r) {
  if (t.chb) { const x = t.chb; x.status = 'Confirmed'; x.confirmed = { at: now().toISOString(), by: ADMIN.me.name, ref }; STORE.fin.tx.unshift({ at: now().toISOString(), ref, gref: '—', receipt: 'RCP-' + ref.slice(-5), payer: x.name, payerType: 'Learner', course: x.course + ' — first instalment', amount: a, cur: 'GBP', mode, status: 'Paid', by: ADMIN.me.name, fin: true }); logA('Finance', ref, 'Recorded offline payment', money(t.due, 'GBP') + ' due', money(a, 'GBP') + ' paid', r); toast('Payment recorded — the bank transfer is confirmed.'); return; }
  _rpCh3(t, a, ref, mode, r);
  if (!t.v) return; const w = STORE.worlds[t.v], s = w.signup, x = (STORE.chBank || []).find(y => y.v === t.v && y.status === 'Awaiting confirmation'); if (!x || !s || !s.pay) return;
  const paidNow = x.opt === 'deposit' ? t.dep && t.dep.status === 'Paid' : t.r && t.r.n === 1 && t.r.status === 'Paid';
  if (!paidNow) return;
  x.status = 'Confirmed'; x.confirmed = { at: now().toISOString(), by: ADMIN.me.name, ref }; s.pay.status = 'Paid';
  if (x.opt === 'deposit') Object.assign(w.admission.deposit, { paid: true, awaiting: false, paidAt: now().toISOString() });
};
// Finance → Payment Pending & Exceptions → new tab "Bank transfers to confirm"
const CH_EXC_TABS = [['pending', 'Payment Pending'], ['duplicates', 'Duplicate payments'], ['failed', 'Failed payments'], ['links', 'Expired payment links']];
const _excCh3 = SCREENS['f-exceptions'];
SCREENS['f-exceptions'] = p => {
  const bank = p.tab === 'bank', h = _excCh3(bank ? { ...p, tab: 'links' } : p);
  const old = subtabs(CH_EXC_TABS, bank ? 'links' : (p.tab || 'pending'), 'f-exceptions'), neu = subtabs(CH_EXC_TABS.concat([['bank', 'Bank transfers to confirm']]), p.tab || 'pending', 'f-exceptions'), k = h.indexOf(old);
  if (k < 0) return h;
  return h.slice(0, k) + neu + (bank ? chBankTable() : h.slice(k + old.length));
};
function chBankTable() {
  const rows = (STORE.chBank || []).map(chBankRow);
  return `<div class="note b-blue">${ic('info')}<div class="small">Learners who chose bank transfer at sign-up start straight away. <strong>Record offline payment</strong> when the money arrives — that confirms it. If it never arrives, <strong>Pause access</strong> to that enrolment.</div></div>` +
    dt({ id: 'chbank', name: 'Bank transfers to confirm', rows, rid: x => x.ref, noExport: true, filters: [{ k: 's', l: 'Status', get: x => x.status, opts: ['Awaiting confirmation', 'Confirmed'] }], empty: 'No bank transfers waiting.',
      cols: [{ k: 'name', l: 'Learner', h: x => `<a href="#f-learner.${x.lid}" data-go="f-learner" data-id="${x.lid}" class="strong">${esc(x.name)}</a>`, v: x => x.name }, { k: 'course', l: 'For', h: x => `<span class="small">${esc(x.course)} — ${x.opt === 'deposit' ? 'deposit' : 'first instalment'}</span>`, v: x => x.course }, { k: 'amount', l: 'Amount', r: 1, h: x => amt(x.amount, 'GBP'), s: x => x.amount }, { k: 'ref', l: 'Reference', h: x => `<span class="mono small">${esc(x.ref)}</span>` }, { k: 'at', l: 'Signed up', h: x => fd(x.at), s: x => x.at }, { k: 'status', l: 'Status', h: x => chip(x.status, x.status === 'Confirmed' ? 'green' : 'amber') + (chPaused(x.lid, x.ek) ? ' ' + chip('Access paused', 'red') : ''), v: x => x.status }],
      act: x => x.status === 'Awaiting confirmation' ? `<div class="row" style="gap:4px"><button class="btn btn-sm btn-primary" data-act="finOffline" data-k="${x.key}">Record offline payment</button>${chPauseBtn(x.lid, x.ek)}</div>` : '' });
}

/* ---------- Demo Scenario #19 "Rejected after payment" ---------- */
ACT.chSc19Start = () => { S.edge = 'none'; if (STORE.worlds.B.signup.done) STORE.worlds.B = makeWorld('B'); setVariant('B'); chQuickSignup(W, { at: D(-5, '18:20') }); go('dashboard'); toast('Demo: Priya Raman has paid her £300 deposit and started learning.', 'info'); };
const _scListCh3 = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  return _scListCh3().concat([['19', 'Rejected after payment', 'CH-12 – CH-14', [
    s('Priya Raman paid her £300 deposit at sign-up and started learning.', '', '', 'chSc19Start'),
    s('The reviewer (Academic Admin) rejects her application — no automatic refund.', 'acaA', 'a-admissions.APP-B'),
    s('Finance Admins and Academic Admins get "Admission rejected after payment"; her access stays as it is.', 'finA', 'f-notifications'),
    s('Finance pauses her access to the programme, with a reason she doesn\'t see.', 'finA', 'f-learner.IA-L-31188'),
    s('Finance decides on a refund — Raise refund opens the usual refund flow.', 'finA', 'f-learner.IA-L-31188')]]]);
};
CDL_SCEN.push(['19', 'Rejected after payment', 'Client-defined (CH-12 – CH-14)']);

/* ---------- Records ---------- */
CH_APPLIED[3] = '13 Oct 2026';
UXC.push(['CH batch 3', 'Client decisions — Batch 3 (CH-11, CH-12, CH-13, CH-14)', [
  'CH-12: a learner who has paid and is then rejected keeps their access. Finance Admins and Academic Admins get "Admission rejected after payment: [learner], [course], £X paid", linking to the learner (Finance learner record / Learner 360).',
  'CH-13: rejection no longer raises a deposit refund automatically. The rejected application (and the Finance learner record) shows "Refund is a Finance decision (raise a refund if appropriate)" with Raise refund for Finance and the Super Admin — the existing refund flow and routing.',
  'CH-14: "Pause access" on an enrolment in Learner 360 → Enrolments and Finance → learner record (Finance, System and Super Admin). The reason is mandatory and isn\'t shown to the learner, who sees the "Access paused" banner and a lock on that enrolment\'s content. "Restore access" (with a reason) lifts it. Both are audited and notify the learner. Separate from the automatic 30-day overdue pause: neither one clears the other.',
  'CH-11: Finance → Payment Pending & Exceptions → "Bank transfers to confirm": bank-transfer sign-ups wait as "Awaiting confirmation"; Record offline payment confirms them (and the learner\'s deposit or first instalment); Pause access is on the same row. Finance is notified of each new one. Mock: Kavya Iyer, Level 2 first instalment.',
  'Demo Scenario #19 "Rejected after payment".']]);

/* ---------- Screen index (with purpose lines) ---------- */
const _aIdxCh3 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh3(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Learner 360 — Enrolments → Pause access', { act: 'aJump', t: 'a-learner.IA-L-18022.enrolments' }, 'CH-14 — pause one enrolment with a reason the learner doesn\'t see; Restore access lifts it.'),
  chIdxLi('Finance learner record — Access by enrolment', { act: 'aJump', t: 'f-learner.IA-L-31900' }, 'CH-14 — Finance pauses or restores an enrolment\'s access.'),
  chIdxLi('Bank transfers to confirm (Finance)', { act: 'aJump', t: 'f-exceptions..bank' }, 'CH-11 — bank-transfer sign-ups awaiting confirmation; record the payment or pause access.'),
  chIdxLi('Rejected application — refund is a Finance decision', { act: 'chSc19Start' }, 'CH-12, CH-13 — demo start for Scenario #19: reject Priya Raman after she has paid.')].join('')}`);
