/* ============================================================
   SA-FINAL A — refund integrity (SA-11), offline payment (SA-06) and finance Lows (3 Nov 2026; PD-SAF-A-* in PROVISIONAL-DECISIONS.md).
   Loads after every finance file (FI-1, FI-2, FC, DP, FP); it wraps their last effective definitions.
   1. Refunds (audit #1, #5): only a collected payment can be refunded — the ledger row's own status is Paid or Partially refunded
      (a learner's "Succeeded"); Pending, Failed, Cancelled, Timed out, Refunded and unpaid items are refused, inside raiseRefund, at
      approval (applyDecision), at the Super Administrator's immediate apply (saApply) and at an override, and the refusal is logged.
      A payment marked "Partially refunded" with no record of the earlier refund (seeded legacy rows) fails closed: nothing more can
      be refunded and the screen says why — the earlier amount is never guessed. Seeded deposits and flagged duplicates keep their
      own source records (FI-1), batch cancellation keeps the refundable remainder (FI-2), and the remainder still counts every open
      and processed refund (PD-FI-02).
   2. Raise refund is learner-first (SA-11): choose the payer (search, no cap), see their payment history with paid, pending,
      refunded and what is left to refund per payment, choose an eligible payment (others are shown disabled with the reason),
      enter the amount and reason, confirm a summary; approval rules are unchanged (G4, D8). Reachable from Finance → Refunds,
      the admin console's Refunds tab and both learner Payments tabs.
   3. Record offline payment (SA-06, #2, #14): opened from a learner it is bound to that learner (name, ID, their own items only;
      "nothing is due" when there is none); opened from a list it asks for the payer first, then shows only that payer's items.
      Date received and Note are saved on the payment and shown in the ledger, the transaction and the receipt.
   4. #20: the Super Administrator's refund form says it is processed at once. #22: the ledger footer and the reports count refunds
      by one rule (recorded refunds; a seeded "Refunded" row is its whole amount; an unrecorded part refund is unknown, not guessed).
   ============================================================ */
'use strict';

/* ---------- 1. Which payments can be refunded ---------- */
const SAA_OK = ['Paid', 'Partially refunded'];
const SAA_PROTO = 'The prototype records the refund decision and the refund transaction. It does not return any money to a card or bank account.';
// The ledger row of a payment (never the caller's copy): same reference and payer, not a refund row
const saaTx = t => (t && t.ref ? allTx().find(x => x.ref === t.ref && x.payer === t.payer && !x.refund) : null);
const saaRows = x => allTx().filter(t => t.refund && t.payer === x.payer && fiOrigOf(t) === x.ref);
const saaDone = (x, skip) => fiRefunds(x.ref, x.payer).filter(i => i !== skip && fiRefDone(i));
// A "Partially refunded" payment whose earlier refund has no record (no refund transaction, no processed request): amount unknown
const saaAmbig = (x, skip) => !!x && x.status === 'Partially refunded' && !saaRows(x).length && !saaDone(x, skip).length;
const saaRefP = x => { const r = saaRows(x); if (r.length) return r.reduce((s, t) => s + fiP(t.amount), 0); const q = fiSum(saaDone(x)); return q || (x.status === 'Refunded' ? fiP(x.amount) : x.status === 'Partially refunded' ? null : 0); }; // null = not recorded
const saaOpenP = x => fiSum(fiRefunds(x.ref, x.payer).filter(isOpen));
// Why this payment can't be refunded now ('' when it can): [audit action, explanation]
function saaWhy(x, o = {}) {
  if (!x) return null;
  const m = money(Math.abs(x.amount), x.cur || 'GBP');
  if (fiObsFeeTx(x)) return ['refund of an observation fee', FI_OBS_NO];
  if (x.status === 'Refunded') return ['refund of a payment already refunded', `${x.ref} is already refunded in full. Nothing was refunded.`];
  if (!SAA_OK.includes(x.status)) return ['refund of a payment that was not collected', `${x.ref} is ${String(x.status || 'not paid').toLowerCase()} — the ${m} was not collected, so there is nothing to refund. Only a paid payment can be refunded. Nothing was refunded.`];
  if (saaAmbig(x, o.skip)) return ['refund with an unrecorded earlier refund', `${x.ref} is marked partly refunded, but the earlier refund has no record, so the amount left to refund is unknown. No further refund can be raised against it until Finance confirms the earlier amount (a client question). Nothing was refunded.`];
  if (!o.noRem && fiP(refundable(x)) <= 0) return ['refund with nothing left to refund', `Nothing is left to refund on ${x.ref}: the ${m} collected is already refunded or held by an open refund request. Nothing was raised.`];
  return null;
}
// The remainder is £0 for a payment that can't be refunded (pickers, batch cancellation, the forms)
const _rfSAA = refundable;
refundable = function (t) { const x = saaTx(t); if (x && saaWhy(x, { noRem: true })) return 0; return _rfSAA.apply(this, arguments); };
// Raising: refused before the form opens
const _rrSAA = raiseRefund;
raiseRefund = function (t, preset = {}) {
  if (!fiFin()) return _rrSAA.apply(this, arguments); // FI-1's refusal (logged)
  const x = saaTx(t), no = x && saaWhy(x); if (no) return fiNo(t.ref, no[0], no[1]);
  const r = _rrSAA.apply(this, arguments);
  if (MODAL && $('#modal-root #rr-a')) saaFormNote();
  return r;
};
// #20: the form says what happens on submit — the Super Administrator's own refund is processed at once (D8)
function saaFormNote() {
  const box = [...document.querySelectorAll('#modal-root .note')].find(n => /Will be sent to/.test(n.textContent));
  if (isSA() && box) { box.className = 'note b-amber saa-sa'; box.innerHTML = `${ic('info')}<div class="small"><strong>Processed immediately (Super Administrator).</strong> Your own refund is applied when you submit — no second approval (D8). All Finance Admins get an FYI.</div>`; const b = $('#modal-root .modal-f .btn-primary'); if (b) b.textContent = 'Process refund now'; }
  const f = $('#modal-root .modal-b'); if (f && !f.querySelector('.saa-proto')) f.insertAdjacentHTML('beforeend', `<p class="xs muted saa-proto">${ic('lock', 12)} ${SAA_PROTO}</p>`);
}
// Approval, the Super Administrator's immediate apply and an override check the payment again
const saaItemWhy = i => { const d = i.data || {}; if (d.deposit || d.dup) return null; const x = allTx().find(t => t.ref === d.tx && t.payer === fiPayerOf(i) && !t.refund); return x ? saaWhy(x, { noRem: true, skip: i }) : null; };
const _stSAA = fiStateWhy;
fiStateWhy = function (i, a) { if (i && i.type === 'Refund' && a === 'approve' && isOpen(i)) { const no = saaItemWhy(i); if (no) return [no[0], `${i.id}: ${no[1]}`]; } return _stSAA.apply(this, arguments); };
const _capSAA = fiRefCapWhy;
fiRefCapWhy = function (i) { const no = i && saaItemWhy(i); return no ? `${i.id}: ${no[1]}` : _capSAA.apply(this, arguments); };

/* ---------- 2. Raise refund: learner first ---------- */
const saaLid = name => { const v = learnerAccounts().find(k => VNAME(k) === name); if (v) return STORE.worlds[v].me.id; const l = allLearners().find(x => x.name === name); return l ? l.id : ''; };
const saaPayerName = lid => { const v = fiWorldKey(lid); if (v) return VNAME(v); const l = learnerById(lid); return l ? l.name : ''; };
const saaG = p => (p == null ? 'Unknown' : money(fiM(p), 'GBP'));
function saaPayers() {
  const m = new Map();
  allTx().forEach(t => { const k = t.payer; if (!k) return; const e = m.get(k) || { name: k, type: t.payerType || 'Learner', n: 0, paid: 0, left: 0 }; if (!t.refund) { e.n++; if (SAA_OK.includes(t.status) || t.status === 'Refunded') e.paid += fiP(t.amount); e.left += fiP(refundable(t)); } m.set(k, e); });
  return [...m.values()].map(e => ({ ...e, lid: e.type === 'Agency' ? '' : saaLid(e.name) })).sort((a, b) => a.name.localeCompare(b.name));
}
const saaPayerLi = e => `<li><button type="button" class="saa-pick" data-act="saaRfPayer" data-p="${esc(e.name)}"><span><strong>${esc(e.name)}</strong> <span class="xs muted">${esc(e.type)}${e.lid ? ' · <span class="mono">' + esc(e.lid) + '</span>' : ''}</span></span><span class="xs">${e.n} payment${e.n === 1 ? '' : 's'} · paid ${saaG(e.paid)} · refundable ${saaG(e.left)}</span></button></li>`;
function saaRfList(q) {
  const s = String(q || '').trim().toLowerCase(), all = saaPayers(), rows = all.filter(e => !s || e.name.toLowerCase().includes(s) || e.lid.toLowerCase().includes(s));
  return `<p class="xs muted" id="saa-rf-n">${rows.length} of ${all.length} payers${s ? ' match' : ''} — every payer in the ledger is listed.</p>${rows.length ? `<ul class="saa-list">${rows.map(saaPayerLi).join('')}</ul>` : '<p class="small muted">No payer matches. Search by name or learner ID.</p>'}`;
}
const saaRfGuard = () => (fiFin() ? true : w0Deny('Finance', '—', 'raise a refund', FI_FIN));
ACT.finRaise = el => {
  if (!saaRfGuard()) return false;
  const d = (el && el.dataset) || {}, p = d.p || (d.l ? saaPayerName(d.l) : '');
  if (p) return saaRfHist(p);
  openModal({ title: 'Raise refund — choose the payer', size: 'lg', body: `<p class="small">Search for the learner (or agency) the refund is for. You'll see their payments before choosing what to refund.</p><div class="field"><label for="saa-rf-q">Payer</label><input class="input" type="search" id="saa-rf-q" placeholder="Name or learner ID" data-oninput="saaRfQ" autocomplete="off"></div><div id="saa-rf-l">${saaRfList('')}</div>`, actions: [{ label: 'Cancel' }] });
};
INP.saaRfQ = el => { const b = $('#saa-rf-l'); if (b) b.innerHTML = saaRfList(el.value); };
ACT.raiseRefund = el => ACT.finRaise(el); // the admin console's Refunds tab: the same learner-first flow (it had its own 40-item picker)
ACT.saaRfPayer = el => (saaRfGuard() ? saaRfHist(el.dataset.p) : false);
// Step 2: the payer's payment history, then the payment, amount and reason
function saaRfHist(payer, draft = {}) {
  const txs = allTx().filter(t => t.payer === payer && !t.refund), back = allTx().filter(t => t.payer === payer && t.refund), lid = saaLid(payer);
  if (!txs.length) { openModal({ title: 'Raise refund — ' + esc(payer), body: `<p class="small">No payment is recorded for ${esc(payer)}, so there is nothing to refund.</p>`, actions: [{ label: 'Choose another payer', fn: () => { ACT.finRaise(); return false; } }, { label: 'Close', cls: 'btn-primary' }] }); return; }
  const sum = f => txs.filter(f).reduce((s, t) => s + fiP(t.amount), 0), refP = txs.map(saaRefP), refKnown = refP.every(p => p != null);
  const paid = sum(t => SAA_OK.includes(t.status) || t.status === 'Refunded'), pend = sum(t => t.status === 'Pending'), left = txs.reduce((s, t) => s + fiP(refundable(t)), 0);
  const row = (t, k) => {
    const no = saaWhy(t), r = refP[k], open = saaOpenP(t), max = refundable(t), id = 'saa-rf-' + k;
    return `<tr class="${no ? 'saa-off' : ''}"><td>${no ? `<input type="radio" name="saa-rf-t" id="${id}" value="${k}" disabled aria-describedby="${id}-w">` : `<input type="radio" name="saa-rf-t" id="${id}" value="${k}" data-onchange="saaRfT" ${String(draft.k) === String(k) ? 'checked' : ''}>`}</td><td><label for="${id}" class="mono small">${esc(t.ref)}</label><div class="xs muted">${fd(t.at)}</div></td><td class="small">${esc(t.course || '—')}<div class="xs muted">${esc(t.mode || '')}</div></td><td class="r num">${money(t.amount, t.cur || 'GBP')}</td><td>${chip(t.status, t.status === 'Partially refunded' ? 'purple' : undefined)}</td><td class="r num">${r == null ? '<span class="saa-unk">Unknown — not recorded</span>' : r ? '−' + saaG(r) : '—'}${open ? `<div class="xs muted">${saaG(open)} requested, awaiting approval</div>` : ''}</td><td class="r num strong">${no ? '£0.00' : money(max, t.cur || 'GBP')}${no ? `<div class="xs muted saa-why" id="${id}-w">${esc(no[1].replace(/ Nothing was (refunded|raised)\.$/, ''))}</div>` : ''}</td></tr>`;
  };
  const cats = ['Course cancelled', 'Batch cancelled', 'Duplicate payment', 'Withdrawal', 'Deposit', 'Goodwill', 'Error', 'Other'];
  openModal({ title: 'Raise refund — ' + esc(payer), sub: `${lid ? `<span class="mono">${esc(lid)}</span> · ` : ''}${txs.length} payment${txs.length === 1 ? '' : 's'} on record`, size: 'lg', body: `
    <dl class="kv saa-tot"><dt>Paid (collected)</dt><dd class="num">${saaG(paid)}</dd><dt>Pending (not collected)</dt><dd class="num">${saaG(pend)}</dd><dt>Refunded</dt><dd class="num">${refKnown ? saaG(refP.reduce((s, p) => s + p, 0)) : saaG(refP.reduce((s, p) => s + (p || 0), 0)) + ' recorded + an unrecorded amount'}</dd><dt>Left to refund</dt><dd class="num strong">${saaG(left)}</dd></dl>
    <div class="tbl-wrap"><table class="tbl dense saa-hist"><caption class="sr">Payments of ${esc(payer)}</caption><thead><tr><th><span class="sr">Choose</span></th><th>Payment</th><th>For</th><th class="r">Amount</th><th>Status</th><th class="r">Refunded</th><th class="r">Left to refund</th></tr></thead><tbody>${txs.map(row).join('')}</tbody></table></div>
    ${back.length ? `<p class="xs muted">Refund transactions on record: ${back.map(t => `<span class="mono">${esc(t.ref)}</span> −${money(t.amount, t.cur || 'GBP')} (${esc(fiOrigOf(t) || '—')})`).join(' · ')}</p>` : ''}
    <p class="xs muted">Only a paid payment can be refunded. Pending, failed and fully refunded payments are shown for reference and can't be chosen; neither can a payment marked partly refunded whose earlier refund has no record.</p>
    <div class="form-grid"><div class="field"><label for="saa-rf-a">Refund amount (GBP)</label><input class="input num" id="saa-rf-a" type="number" step="0.01" value="${esc(draft.a || '')}"><span class="xs muted" id="saa-rf-max">${draft.k != null && txs[draft.k] ? 'Up to ' + money(refundable(txs[draft.k]), 'GBP') : 'Choose a payment first'}</span></div><div class="field"><label for="saa-rf-c">Reason category</label><select class="select" id="saa-rf-c">${cats.map(c => `<option ${draft.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field full"><label for="saa-rf-d">Reason (required)</label><textarea class="textarea" id="saa-rf-d">${esc(draft.txt || '')}</textarea></div></div>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Enrolment consequence</legend><label class="check"><input type="radio" name="saa-rf-cons" value="Revoke access" ${draft.cons === 'Retain access' ? '' : 'checked'}> Revoke access — the learner loses access to this course when the refund is processed</label><label class="check"><input type="radio" name="saa-rf-cons" value="Retain access" ${draft.cons === 'Retain access' ? 'checked' : ''}> Retain access — no change for the learner</label></fieldset>
    <p class="xs muted">${ic('lock', 12)} ${SAA_PROTO}</p>`,
    actions: [{ label: 'Choose another payer', fn: () => { ACT.finRaise(); return false; } }, { label: 'Cancel' }, { label: 'Review refund', cls: 'btn-primary', fn: () => saaRfReview(payer, txs) }] });
  MODAL._txs = txs; // the radio handler's list
}
INP.saaRfT = el => { const tx = ((MODAL && MODAL._txs) || [])[+el.value], m = $('#saa-rf-max'), a = $('#saa-rf-a'); if (!tx || !m) return; const max = refundable(tx); m.textContent = 'Up to ' + money(max, tx.cur || 'GBP'); if (a && !a.value) a.value = max; };
// Step 3: the summary, then the existing approval rules
function saaRfReview(payer, txs) {
  if (!saaRfGuard()) return false;
  const sel = $('#modal-root input[name="saa-rf-t"]:checked'), k = sel ? +sel.value : null, t = k != null ? txs[k] : null, raw = mval('#saa-rf-a'), a = +raw, txt = mval('#saa-rf-d'), cat = mval('#saa-rf-c'), cons = ($('#modal-root input[name="saa-rf-cons"]:checked') || {}).value || 'Revoke access';
  if (!t) { fieldErr('#saa-rf-a', 'Choose the payment to refund'); return false; }
  const x = saaTx(t), no = saaWhy(x); if (no) { fiNo(t.ref, no[0], no[1]); fieldErr('#saa-rf-a', no[1]); return false; }
  const max = refundable(x);
  if (raw === '' || !fiOk(a)) { fieldErr('#saa-rf-a', FI_AMT); return false; }
  if (fiP(a) > fiP(max)) { fieldErr('#saa-rf-a', `This exceeds what is left to refund (${money(max, x.cur || 'GBP')})`); return false; }
  if (!txt) { fieldErr('#saa-rf-d', 'Enter the reason'); return false; }
  const draft = { k, a: raw, cat, txt, cons }, r0 = saaRefP(x), open = saaOpenP(x), approver = ADMIN.fin ? otherFin() : (ADMIN.me.name === FIN_A ? FIN_B : FIN_A), sa = isSA();
  let done = false;
  openModal({ title: 'Confirm refund — ' + esc(x.ref), sub: esc(payer), body: `<dl class="kv"><dt>Payer</dt><dd>${esc(payer)}${saaLid(payer) ? ` · <span class="mono">${esc(saaLid(payer))}</span>` : ''}</dd><dt>Payment</dt><dd><span class="mono">${esc(x.ref)}</span> · ${esc(x.course || '')} · ${fd(x.at)}</dd><dt>Collected</dt><dd class="num">${money(x.amount, x.cur || 'GBP')}</dd><dt>Refunded before</dt><dd class="num">${saaG(r0)}</dd><dt>Requested, awaiting approval</dt><dd class="num">${saaG(open)}</dd><dt>This refund</dt><dd class="num strong">${money(a, x.cur || 'GBP')}</dd><dt>Left after this</dt><dd class="num">${money(fiM(fiP(max) - fiP(a)), x.cur || 'GBP')}</dd><dt>Reason</dt><dd>${esc(cat)} — ${esc(txt)}</dd><dt>Enrolment</dt><dd>${esc(cons)}</dd></dl>
    <div class="note ${sa ? 'b-amber' : 'b-blue'} saa-next">${ic('info')}<div class="small"><strong>What happens next.</strong> ${sa ? 'Processed immediately (Super Administrator): your own refund is approved and its refund transaction recorded when you confirm — no second approval (D8). All Finance Admins get an FYI.' : `This is a refund <strong>request</strong>. It is sent to ${esc(approver)} for approval${approver === 'Super Administrator' ? ' (no other Finance Admin is available)' : ''}; you can't approve your own. Nothing is refunded until it is approved; once approved it is processed once and a refund transaction is recorded.`}</div></div>
    <p class="xs muted">Requested → approved → processed (refund transaction recorded). ${SAA_PROTO}</p>`,
    actions: [{ label: 'Back', fn: () => { saaRfHist(payer, draft); return false; } }, { label: 'Cancel' }, { label: sa ? 'Process refund now' : 'Raise refund request', cls: 'btn-primary', fn: () => {
      if (done) return; // a second click of the same dialog does nothing
      if (!saaRfGuard()) return false;
      const y = saaTx(x), no2 = saaWhy(y); if (no2) { fiNo(x.ref, no2[0], no2[1]); return; }
      const m2 = refundable(y); if (fiP(a) > fiP(m2)) { fiNo(x.ref, 'refund above the refundable remainder', `Only ${money(m2, y.cur || 'GBP')} is left to refund on ${y.ref} now (another refund was raised meanwhile). Nothing was raised.`); return; }
      done = true;
      const it = newRefund(y, a, cat, txt, cons); ADMIN.queue.unshift(it);
      if (sa) saApply(it, txt);
      render(); toast(sa ? (it.processed ? `Refund ${it.id} processed (Super Administrator) — refund transaction recorded.` : `Refund ${it.id} was not processed — see the Approvals Queue.`) : `Refund request ${it.id} raised — sent to ${it.first} for approval. Nothing is refunded until then.`, sa && !it.processed ? 'err' : 'ok');
    } }] });
  return false;
}
// Learner Payments tabs (Learner 360 and the Finance learner page): Raise refund for this learner
const saaRfBtn = lid => (fiFin() ? ` <button class="btn btn-sm" data-act="finRaise" data-l="${esc(lid)}">Raise refund</button>` : '');
const _lpSAA = lPay;
lPay = function (L) { const h = _lpSAA.apply(this, arguments); if (!L || !fiFin()) return h; const b = `data-act="offlinePay" data-l="${L.id}">Record offline payment</button>`; return h.includes(b) ? h.replace(b, b + saaRfBtn(L.id)) : h; };
const _flSAA = SCREENS['f-learner'];
SCREENS['f-learner'] = p => {
  let h = _flSAA(p); if (!p || p.tab !== 'payments' || !fiFin()) return h;
  const bar = `<div class="row saa-lbar"><button class="btn btn-sm" data-act="offlinePay" data-l="${esc(p.id)}">Record offline payment</button>${saaRfBtn(p.id)}</div>`;
  if (h.includes('<section class="card"><h3>Transactions</h3>')) return h.replace('<section class="card"><h3>Transactions</h3>', `<section class="card"><div class="row-b"><h3>Transactions</h3>${bar}</div>`);
  const k = h.lastIndexOf('<p class="xs muted">'); return k > 0 ? h.slice(0, k) + `<section class="card"><h3>Payments and refunds</h3>${bar}</section>` + h.slice(k) : h;
};
// A ledger transaction offers Raise refund only when it can be refunded, and says why not
const _toSAA = ACT.txOpen;
ACT.txOpen = el => {
  const r = _toSAA(el), t = allTx().find(x => x.ref === el.dataset.r && x.payer === el.dataset.p && !x.refund); if (!MODAL || !t) return r;
  const no = saaWhy(t), b = $('#modal-root .modal-b');
  if (no && MODAL.actions.some(a => a.label === 'Raise refund')) { MODAL.actions = MODAL.actions.filter(a => a.label !== 'Raise refund'); renderModal(); }
  const b2 = $('#modal-root .modal-b') || b;
  if (b2) { const kv = b2.querySelector('dl.kv'); if (kv && t.dateReceived) kv.insertAdjacentHTML('beforeend', `<dt>Date received</dt><dd class="saa-rcv">${fd(t.dateReceived + 'T12:00:00Z')}</dd>`); if (no && !b2.querySelector('.saa-norf')) b2.insertAdjacentHTML('afterbegin', `<div class="note b-grey small saa-norf">${ic('info', 15)}<div><strong>Not refundable.</strong> ${esc(no[1].replace(/ Nothing was (refunded|raised)\.$/, ''))}</div></div>`); }
  return r;
};
// Finance → Refunds says what the stages mean
const _frSAA = SCREENS['f-refunds'];
SCREENS['f-refunds'] = p => { const h = _frSAA(p), n = `<div class="note b-blue saa-stages">${ic('info')}<div class="small"><strong>Requested → approved → processed.</strong> A Finance Admin's refund is a request until another Finance Admin approves it; the Super Administrator's own is processed at once. Processing records a refund transaction. ${SAA_PROTO}</div></div>`, k = h.indexOf('<div class="subtabs'); return k >= 0 ? h.slice(0, k) + n + h.slice(k) : n + h; };

/* ---------- 3. Record offline payment: one payer ---------- */
// Who an item belongs to: a learner (by learner ID where known) or an agency
function saaPayer(t) {
  if (t.v && STORE.worlds[t.v]) { const w = STORE.worlds[t.v]; return { k: 'l:' + w.me.id, name: VNAME(t.v), id: w.me.id, kind: 'Learner' }; }
  if (t.chb) { const v = t.chb.wv && STORE.worlds[t.chb.wv] ? t.chb.wv : null; const id = t.chb.lid || (v && STORE.worlds[v].me.id) || ''; return { k: id ? 'l:' + id : 'n:' + t.chb.name, name: v ? VNAME(v) : t.chb.name, id, kind: 'Learner' }; }
  if (t.od) return { k: t.od.lid ? 'l:' + t.od.lid : 'n:' + t.od.name, name: t.od.name, id: t.od.lid || '', kind: 'Learner' };
  if (t.inv) return { k: 'a:' + t.inv.data.agency, name: t.inv.data.agency, id: '', kind: 'Agency' };
  return { k: 'n:' + (t.label || t.key), name: t.label || t.key, id: '', kind: 'Other' };
}
let SAA_SCOPE = null, SAA_META = null;
const _ptSAA = payTargets;
payTargets = function () { const out = _ptSAA.apply(this, arguments); return SAA_SCOPE ? out.filter(t => saaPayer(t).k === SAA_SCOPE) : out; };
const saaOpGuard = () => (fiFin() ? true : w0Deny('Finance', '—', 'record an offline payment', FI_FIN));
function saaOpPayers() {
  const m = new Map(); payTargets().forEach(t => { const p = saaPayer(t), e = m.get(p.k) || { ...p, n: 0, due: 0 }; e.n++; e.due += fiP(t.due || 0); m.set(p.k, e); });
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function saaOpList(q) {
  const s = String(q || '').trim().toLowerCase(), all = saaOpPayers(), rows = all.filter(e => !s || e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
  return `<p class="xs muted">${rows.length} of ${all.length} payers with something waiting for a payment${s ? ' match' : ''}.</p>${rows.length ? `<ul class="saa-list">${rows.map(e => `<li><button type="button" class="saa-pick" data-act="saaOpPayer" data-payer="${esc(e.k)}"><span><strong>${esc(e.name)}</strong> <span class="xs muted">${esc(e.kind)}${e.id ? ' · <span class="mono">' + esc(e.id) + '</span>' : ''}</span></span><span class="xs">${e.n} item${e.n === 1 ? '' : 's'} · ${money(fiM(e.due), 'GBP')} outstanding</span></button></li>`).join('')}</ul>` : '<p class="small muted">No payer matches. Search by name or learner ID.</p>'}`;
}
INP.saaOpQ = el => { const b = $('#saa-op-l'); if (b) b.innerHTML = saaOpList(el.value); };
ACT.saaOpPayer = el => (saaOpGuard() ? ACT.finOffline({ dataset: { payer: el.dataset.payer, pick: '1' } }) : false);
const _foSAA = ACT.finOffline;
ACT.finOffline = el => {
  if (!saaOpGuard()) return false;
  const d = (el && el.dataset) || {};
  let scope = d.payer || (d.lid ? 'l:' + d.lid : null);
  if (d.k) { const t = payTargets().find(x => x.key === d.k); if (!t) return _foSAA(el); scope = saaPayer(t).k; } // a stale item: DP's refusal
  if (!scope) { // opened from a list: the payer is chosen first — nothing is preselected
    if (!payTargets().length) { toast('Nothing is waiting to be recorded.', 'info'); return; }
    openModal({ title: 'Record offline payment — choose the payer', size: 'lg', body: `<p class="small">Choose who paid. Only that payer's items waiting for a payment are shown next.</p><div class="field"><label for="saa-op-q">Payer</label><input class="input" type="search" id="saa-op-q" placeholder="Name or learner ID" data-oninput="saaOpQ" autocomplete="off"></div><div id="saa-op-l">${saaOpList('')}</div>`, actions: [{ label: 'Cancel' }] });
    return;
  }
  const mine = payTargets().filter(t => saaPayer(t).k === scope), lid = scope.startsWith('l:') ? scope.slice(2) : '', who = mine[0] ? saaPayer(mine[0]) : { name: (lid && saaPayerName(lid)) || scope.slice(2), id: lid };
  if (!mine.length) { openModal({ title: 'Record offline payment', sub: `${esc(who.name)}${who.id ? ` · <span class="mono">${esc(who.id)}</span>` : ''}`, body: `<div class="note b-blue saa-none">${ic('info')}<div class="small"><strong>Nothing is due for ${esc(who.name)}.</strong> No instalment, deposit, invoice or bank transfer of this ${lid ? 'learner' : 'payer'} is waiting for a payment, so there is nothing to record. Other people's items are not offered here.</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  const pre = d.k || (mine.length === 1 ? mine[0].key : '');
  SAA_SCOPE = scope; let r; try { r = _foSAA({ dataset: { k: pre } }); } finally { SAA_SCOPE = null; }
  if (!MODAL || !$('#modal-root #op-t')) return r;
  const sel = $('#modal-root #op-t'), tot = mine.reduce((s, t) => s + fiP(t.due || 0), 0);
  if (!pre) { sel.insertAdjacentHTML('afterbegin', '<option value="" selected>Choose what the payment is for…</option>'); sel.value = ''; $('#op-a').value = ''; const pv = $('#op-prev'); if (pv) pv.innerHTML = ''; }
  sel.dataset.onchange = 'saaOpT'; const lb = $('#modal-root label[for="op-t"]'); if (lb) lb.textContent = 'What the payment is for (this payer\'s items only)';
  sel.closest('.field').insertAdjacentHTML('beforebegin', `<div class="note b-grey saa-op-payer">${ic('user', 15)}<div class="small"><strong>Payer: ${esc(who.name)}</strong>${who.id ? ` · <span class="mono">${esc(who.id)}</span>` : ''} · ${mine.length} item${mine.length === 1 ? '' : 's'} waiting · ${money(fiM(tot), 'GBP')} outstanding${d.pick ? ' <button type="button" class="btn btn-sm btn-ghost" data-act="finOffline">Change payer</button>' : ''}</div></div>`);
  const dd = $('#modal-root #op-d'); if (dd) dd.max = saaToday();
  const a = MODAL.actions.find(x => x.label === 'Confirm payment');
  if (a && !a._saa) {
    const g = a.fn; a._saa = true;
    a.fn = (...x) => {
      if (!saaOpGuard()) return false;
      const k = ($('#modal-root #op-t') || {}).value, t = k && payTargets().find(y => y.key === k);
      if (!t) { fieldErr('#op-t', 'Choose what the payment is for'); return false; }
      if (saaPayer(t).k !== scope) { fiNo(k, 'payment against another payer', `That item belongs to ${saaPayer(t).name}, not ${who.name}. Nothing was recorded.`); return false; }
      const dr = mval('#op-d'); if (!/^\d{4}-\d{2}-\d{2}$/.test(dr) || isNaN(new Date(dr + 'T12:00:00Z'))) { fieldErr('#op-d', 'Enter the date the payment was received'); return false; }
      if (dr > saaToday()) { fieldErr('#op-d', 'The date received can\'t be in the future'); return false; }
      SAA_META = { date: dr, note: mval('#op-n') }; try { return g(...x); } finally { SAA_META = null; }
    };
  }
  return r;
};
const saaToday = () => [D(0), now().toISOString()].sort().pop().slice(0, 10);
INP.saaOpT = el => { const t = payTargets().find(x => x.key === el.value), a = $('#op-a'); if (t && a) a.value = t.due; const pv = $('#op-prev'); if (!t && pv) pv.innerHTML = ''; INP.opPrev(el); };
// The surplus route records the payment too: the same date and note
const _osSAA = ACT.opSurplus;
ACT.opSurplus = el => { if (!saaOpGuard()) return false; const dr = mval('#op-d'); if (dr && dr > saaToday()) { fieldErr('#op-d', 'The date received can\'t be in the future'); return; } SAA_META = { date: dr || saaToday(), note: mval('#op-n') }; try { return _osSAA(el); } finally { SAA_META = null; } };
// From a learner's page: bound to that learner (never another learner's first item)
ACT.offlinePay = el => {
  if (!saaOpGuard()) return false;
  const lid = el && el.dataset && el.dataset.l;
  return ACT.finOffline({ dataset: lid ? { lid } : {} });
};
// #14: Date received and Note are kept on the payment (and its receipt and audit entry)
const _rpSAA = recordPayment;
recordPayment = function (t, a, ref) {
  const m = SAA_META, res = _rpSAA.apply(this, arguments);
  if (m && res !== false && !fiRefused) saaStamp(String(ref || '').trim(), m);
  return res;
};
function saaStamp(ref, m) {
  if (!ref) return;
  const rows = Object.values(STORE.worlds).flatMap(w => (w.tx || []).filter(x => x.ref === ref && x.amount > 0)).concat(((STORE.fin && STORE.fin.tx) || []).filter(x => x.ref === ref && !x.refund));
  rows.forEach(x => { x.dateReceived = m.date; if (m.note) { x.note = m.note; x.notes = x.notes || []; x.notes.push([ADMIN.me.name, now().toISOString(), 'Recorded with the payment: ' + m.note]); } });
  Object.values(STORE.worlds).forEach(w => (w.plans || []).forEach(pl => pl.rows.forEach(r => (r.receipts || []).forEach(x => { if (x.ref === ref) x.dateReceived = m.date; }))));
  const au = ADMIN.audit.find(x => x.action === 'Recorded offline payment' && x.entity === ref);
  if (au && !/Date received/.test(au.reason)) au.reason = `${au.reason} · Date received ${fd(m.date + 'T12:00:00Z')}${m.note ? ' · Note: ' + m.note : ''}`;
}
// Shown in the ledger and the learner's transaction lists, and on the receipt
const saaDateCol = c => (c && c.k === 'at' && !c._saa ? { ...c, _saa: true, h: t => (c.h ? c.h(t) : fdt(t.at)) + (t.dateReceived ? `<div class="xs muted saa-rcv">Received ${fd(t.dateReceived + 'T12:00:00Z')}</div>` : '') + (t.note ? `<div class="xs muted">Note: ${esc(t.note)}</div>` : '') } : c);
const _dtSAA = dt;
dt = function (cfg) { if (cfg && Array.isArray(cfg.cols) && /^(fledger|ledger-tx|lu-h-(ltx|ftx-|ltx360-))/.test(cfg.id || '')) cfg = { ...cfg, cols: cfg.cols.map(saaDateCol) }; return _dtSAA.apply(this, [cfg].concat([].slice.call(arguments, 1))); };
const _rcSAA = ACT.fiRcp;
ACT.fiRcp = el => { const r = _rcSAA(el), pl = W && (W.plans || []).find(p => p.e === el.dataset.e), row = pl && pl.rows.find(x => String(x.n) === el.dataset.n), x = row && row.receipts && row.receipts[+el.dataset.k], kv = $('#modal-root dl.kv'); if (x && x.dateReceived && kv) kv.insertAdjacentHTML('beforeend', `<dt>Payment received</dt><dd>${fd(x.dateReceived + 'T12:00:00Z')}</dd>`); return r; };

/* ---------- 4. #22: refunds in the ledger footer by the reports' rule ---------- */
// Recorded refund transactions, plus a seeded payment marked refunded without one: its processed refund requests, or its whole
// amount when it is marked "Refunded". A seeded part refund with no record is unknown — counted as such, never guessed.
fcLedFoot = rows => {
  const p = x => fiP(x.amount), all = allTx(), withRow = new Set(all.filter(t => t.refund).map(t => fiOrigOf(t) + '|' + t.payer));
  const got = rows.filter(t => !t.refund && ['Paid', 'Refunded', 'Partially refunded'].includes(t.status)).reduce((s, t) => s + p(t), 0);
  let back = rows.filter(t => t.refund).reduce((s, t) => s + p(t), 0), unk = 0;
  rows.filter(t => !t.refund && !t.aw && ['Refunded', 'Partially refunded'].includes(t.status) && !withRow.has(t.ref + '|' + t.payer)).forEach(t => { const q = fiSum(fiRefunds(t.ref, t.payer).filter(fiRefDone)), v = q || (t.status === 'Refunded' ? p(t) : 0); if (v) back += v; else unk++; });
  const pend = rows.filter(t => t.status === 'Pending' || t.status === 'Awaiting confirmation').reduce((s, t) => s + p(t), 0);
  return `<span class="fc-led-foot" data-received="${got}" data-refunded="${back}" data-pending="${pend}" data-unknown="${unk}"><strong>Filtered:</strong> received ${fiG(got)} · refunded ${back ? '−' : ''}${fiG(back)} · <strong>net ${fiG(got - back)}</strong> · pending or awaiting confirmation ${fiG(pend)} <span class="xs muted">(not counted)</span> · failed payments are not counted.${unk ? ` <span class="xs muted saa-unk">${unk} seeded payment(s) are marked partly refunded without a refund record; that amount is unknown and not counted.</span>` : ''}</span>`;
};

UXC.push(['SA-FINAL A', 'Refund and offline payment integrity (3 Nov 2026)', [
  'Refunds: only a paid payment can be refunded. Pending, failed, cancelled and fully refunded payments are refused when the refund is raised, approved, applied by the Super Administrator or overridden, and the refusal is logged. A payment marked partly refunded with no record of the earlier refund can\'t be refunded again (the amount is unknown, never guessed).',
  'Raise refund is learner-first: choose the payer (search, every payer listed), see their payments with paid, pending, refunded and what is left, choose an eligible payment, enter the amount and reason and confirm a summary. Also on both learner Payments tabs and the admin console. The Super Administrator\'s own refund form says it is processed at once.',
  'Record offline payment: from a learner it shows only that learner\'s items (or says nothing is due); from a list it asks for the payer first. Date received and Note are saved and shown in the ledger, the transaction and the receipt.',
  'The ledger footer and the reports count refunds by one rule; an unrecorded part refund is reported as unknown.']]);
// #14 (agency invoices): the invoice payment dialog's Date received is kept too, and can't be in the future
const _ipSAA = ACT.invPay;
ACT.invPay = el => {
  const r = _ipSAA(el), a = MODAL && $('#ip-d') && MODAL.actions.find(x => x.cls && /primary/.test(x.cls));
  if (a && !a._saa) { const f = a.fn; a._saa = true; a.fn = () => { const d = mval('#ip-d'); if (d && d > saaToday()) { fieldErr('#ip-d', 'The date received can\'t be in the future'); return false; } SAA_IPD = d; try { return f(); } finally { SAA_IPD = ''; } }; }
  return r;
};
let SAA_IPD = ''; // the dialog's Date received, while its Confirm runs
const _ipdSAA = fiInvPaid;
fiInvPaid = function (i, a, ref) { const d = SAA_IPD, res = _ipdSAA.apply(this, arguments); if (d) saaStamp(String(ref || '').trim(), { date: d }); return res; };
