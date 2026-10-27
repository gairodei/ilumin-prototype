/* ============================================================
   Client decisions — Batch 6: VAT on agency bundles (CH-06).
   Business Admin: "Add VAT" + VAT % per bundle (editor, or "Change VAT" on a bundle). Every change is a
   "Bundle VAT setting" approval — first approver Finance Admin, escalates to the Super Admin after 7 days; the
   Super Admin's own changes apply immediately. A bundle can't be published while VAT is pending; on a published
   bundle the current price stays until the change is approved.
   Agency: Buy Bundles, checkout, purchase records and receipts show net + VAT = total. Finance: ledger, agency
   purchases and reports show net, VAT and total. VAT never applies to learner purchases.
   The decision effect is wired in ch-b6-apply.js (before guard.js). Loads after ch-b5.js.
   ============================================================ */
'use strict';

const CH_VAT_T = 'Bundle VAT setting';
QTYPES.push(CH_VAT_T); FIN_TYPES.push(CH_VAT_T); BIZ_TYPES.push(CH_VAT_T); QLBL[CH_VAT_T] = 'Bundle VAT';
const chVatOn = v => !!(v && v.on && +v.pct > 0);
const chVatTxt = v => chVatOn(v) ? `VAT ${+v.pct}%` : 'No VAT';
const chVatAmt = (net, pct) => Math.round(net * (+pct || 0)) / 100;
const chProd = id => (STORE.biz ? STORE.biz.products : []).find(p => p.id === id);
const chVatPct = p => p && chVatOn(p.vat) ? +p.vat.pct : 0;
// "£6,000 + VAT (20%) £1,200 = £7,200" (Business Admin) · "£6,000 + VAT £1,200 = £7,200 total" (agency)
const chVatSum = (net, pct, cur = 'GBP') => `${money(net, cur)} + VAT (${pct}%) ${money(chVatAmt(net, pct), cur)} = ${money(net + chVatAmt(net, pct), cur)}`;
const chVatAgy = (net, pct, cur = 'GBP') => pct ? `${money(net, cur)} + VAT ${money(chVatAmt(net, pct), cur)} = <strong>${money(net + chVatAmt(net, pct), cur)} total</strong> <span class="xs muted">(VAT ${pct}%)</span>` : `${money(net, cur)} — no VAT on this bundle`;
const chQAny = id => ADMIN.queue.find(i => i.id === id);

/* ---------- Mock: CAT-1 VAT approved (20%), CAT-2 VAT pending (20%, published — current price stays), CAT-3 no VAT ---------- */
function chVatSeed() {
  const p1 = chProd('CAT-1'), p3 = chProd('CAT-3'), p2 = chProd('CAT-2'), Q = ADMIN.queue;
  if (p1) {
    p1.vat = { on: true, pct: 20 }; p1.vatPending = null; p1.history.push([p1.version, D(-20, '11:30'), FIN_A, 'VAT 20% approved by Finance (AQ-7300)']);
    if (!Q.some(i => i.id === 'AQ-7300')) Q.push({ id: 'AQ-7300', type: CH_VAT_T, raisedBy: BIZ_A, raised: D(-21, '10:05'), status: 'Approved', first: FIN_A, decidedBy: FIN_A, decision: 'Approved — VAT 20% applies to new purchases.', related: ['Global · CAT-1', 'a-bundles.CAT-1.catalogue'], notes: [], amount: priceOf(p1).final, cur: 'GBP', reason: 'Add VAT at 20% to the Mandatory training starter bundle.', history: [[BIZ_A, D(-21, '10:05'), 'Raised', 'Add VAT at 20% to the Mandatory training starter bundle.'], [FIN_A, D(-20, '11:30'), 'Approve', 'Agreed — standard rate.']], data: { bundle: 'CAT-1', productId: 'CAT-1', name: p1.name, from: null, to: { on: true, pct: 20 }, net: priceOf(p1).final } });
  }
  if (p3) { p3.vat = null; p3.vatPending = null; }
  if (p2) {
    p2.vat = null; p2.vatPending = { on: true, pct: 20, qid: 'AQ-7301' }; p2.history.push([p2.version, D(-2, '15:10'), BIZ_A, 'VAT change submitted for Finance approval (AQ-7301): No VAT → VAT 20%']);
    if (!Q.some(i => i.id === 'AQ-7301')) Q.push({ id: 'AQ-7301', type: CH_VAT_T, raisedBy: BIZ_A, raised: D(-2, '15:10'), status: 'Pending', first: FIN_A, related: ['Global · CAT-2', 'a-bundles.CAT-2.catalogue'], notes: [], amount: priceOf(p2).final, cur: 'GBP', reason: 'Add VAT at 20% to Infection control seats.', history: [[BIZ_A, D(-2, '15:10'), 'Raised', 'Add VAT at 20% to Infection control seats.']], data: { bundle: 'CAT-2', productId: 'CAT-2', name: p2.name, from: null, to: { on: true, pct: 20 }, net: priceOf(p2).final } });
  }
}
const _bizPatchCh6 = bizPatch;
bizPatch = function () { const had = !!(ADMIN && ADMIN._bizPatched); const r = _bizPatchCh6.apply(this, arguments); if (!had && ADMIN && ADMIN._bizPatched && STORE.biz) chVatSeed(); return r; };

/* ---------- The approval ---------- */
function chVatRequest(p, to, reason) {
  const from = chVatOn(p.vat) ? { ...p.vat } : null, at = now().toISOString(), net = priceOf(p).final;
  let n = 7400 + ADMIN.queue.length, id = 'AQ-' + n; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const i = { id, type: CH_VAT_T, raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: FIN_A, related: [`${p.agency || 'Global'} · ${p.id}`, 'a-bundles.' + p.id + '.catalogue'], notes: [], amount: net, cur: p.cur || 'GBP', reason, history: [[ADMIN.me.name, at, 'Raised', reason]], data: { bundle: p.id, productId: p.id, name: p.name, from, to, net } };
  ADMIN.queue.unshift(i);
  p.vatPending = { ...to, qid: id }; p.history.push([p.version, at, ADMIN.me.name, `VAT change submitted for Finance approval (${id}): ${chVatTxt(from)} → ${chVatTxt(to)}`]);
  logA('Bundles & Licences', `${p.id} · ${p.name}`, 'VAT change requested', chVatTxt(from), chVatTxt(to), reason);
  if (isSA()) { saApply(i, reason); return i; }
  if (STORE.fin) STORE.fin.notifs.unshift({ to: FIN_A, t: 'Bundle VAT setting awaiting your approval', b: `${id} · ${p.name}: ${chVatTxt(from)} → ${chVatTxt(to)}`, at, go: 'a-queue.' + id, unread: true });
  return i;
}
// Called from ch-b6-apply.js once a decision has passed the self-approval guard
function chVatDecided(i, a, r) {
  const p = chProd(i.data && i.data.productId); if (!p || !['approve', 'reject', 'return'].includes(a) || (p.vatPending && p.vatPending.qid !== i.id)) return;
  const at = now().toISOString(), from = i.data.from, to = i.data.to;
  if (a === 'approve') {
    p.vat = chVatOn(to) ? { on: true, pct: +to.pct } : null; p.vatPending = null; p.vatLast = null;
    p.history.push([p.version, at, ADMIN.me.name, `VAT change approved (${i.id}): ${chVatTxt(from)} → ${chVatTxt(to)}`]);
    logA('Bundles & Licences', `${p.id} · ${p.name}`, 'VAT setting approved', chVatTxt(from), chVatTxt(to), r);
  } else {
    p.vatPending = null; p.vatLast = { state: a === 'reject' ? 'Rejected' : 'Returned', reason: r, qid: i.id };
    p.history.push([p.version, at, ADMIN.me.name, `VAT change ${a === 'reject' ? 'rejected' : 'returned'} (${i.id}) — stays ${chVatTxt(p.vat)}`]);
  }
  if (!i._sa) bizNotify(`Bundle VAT ${a === 'approve' ? 'approved' : a === 'reject' ? 'rejected' : 'returned'}`, `${i.id} · ${p.name}: ${a === 'approve' ? chVatTxt(to) + (p.status === 'Draft' ? ' — you can publish it now' : ' — applies to new purchases') : r}`, 'a-bundles.' + p.id + '.catalogue', 'Approvals', i.raisedBy);
}
// Demo "Advance 7 days" (Business Admin) also ages pending VAT items, so they escalate to the Super Admin
const _bAdvCh6 = ACT.bAdvance;
ACT.bAdvance = el => { ADMIN.queue.filter(i => i.type === CH_VAT_T && isOpen(i) && i.status !== 'Escalated').forEach(i => { i.raised = new Date(new Date(i.raised).getTime() - 7 * DAY).toISOString(); i.history[0][1] = i.raised; }); return _bAdvCh6(el); };

/* ---------- Queue item panel ---------- */
const _qdCh6 = queueDetail;
queueDetail = function (id) {
  let html = _qdCh6(id); const i = qItem(id); if (!i) return html;
  let panel = '';
  if (i.type === CH_VAT_T) {
    const d = i.data || {}, p = chProd(d.productId), net = p ? priceOf(p).final : d.net, pct = chVatOn(d.to) ? +d.to.pct : 0;
    panel = `<section class="card"><h2>Bundle VAT setting</h2><dl class="kv"><dt>Bundle</dt><dd>${p ? `<a href="#a-bundles.${p.id}.catalogue" data-act="goTok" data-t="a-bundles.${p.id}.catalogue">${esc(p.name)}</a> <span class="xs muted">${p.id} · ${esc(p.status)}</span>` : esc(d.bundle || '—')}</dd><dt>Change</dt><dd><span class="strike">${chVatTxt(d.from)}</span> → <strong>${chVatTxt(d.to)}</strong></dd><dt>Price before VAT</dt><dd>${money(net, 'GBP')}</dd><dt>Agency would pay</dt><dd>${pct ? chVatSum(net, pct) : money(net, 'GBP') + ' (no VAT)'}</dd><dt>Until approved</dt><dd class="small">${p && p.status === 'Published' ? `The current price stays (${chVatTxt(p.vat)}).` : 'The bundle can\'t be published.'}</dd></dl><p class="xs muted">${ic('info', 12)} Raised by the Business Admin · first approver Finance Admin · escalates to the Super Admin after 7 days. VAT never applies to learner purchases.</p></section>`;
  } else if (i.type === 'Agency invoice (offline) purchase' && i.data && i.data.vat && i.data.vat.pct) {
    const v = i.data.vat; panel = `<section class="card"><h2>VAT</h2><p class="small">${chVatSum(v.net, v.pct, i.cur)}</p></section>`;
  }
  if (!panel) return html;
  const k = [html.indexOf('<div class="q3">'), html.indexOf('<div class="grid-2"><div class="stack-lg">')].find(x => x >= 0) ?? -1;
  return k < 0 ? html : html.slice(0, k) + `<div class="grid-2 k-panels">${panel}</div>` + html.slice(k);
};

/* ---------- Bundle editor: "Add VAT" + VAT % + preview ---------- */
const chVatDraft = d => d.chVat || (d.chVat = (() => { const p = d.id && chProd(d.id), v = p && (p.vatPending || p.vat); return { on: chVatOn(v), pct: v && +v.pct > 0 ? +v.pct : '' }; })());
function chVatRead(d) { const c = $('#bp-vat'), v = chVatDraft(d); if (!c) return v; v.on = c.checked; const x = $('#bp-vatp').value; v.pct = x === '' ? '' : +x; return v; }
function chVatPrev(d) {
  if (!d.courses || !d.courses.length) return ''; const v = chVatDraft(d), net = priceOf(d).final;
  if (!v.on) return `No VAT — the agency pays ${money(net, 'GBP')}.`;
  if (!(+v.pct > 0 && +v.pct <= 100)) return '<span class="muted">Enter the VAT % to see the price with VAT.</span>';
  return `<strong>${chVatSum(net, +v.pct)}</strong>`;
}
function chVatSec(d) {
  const p = d.id && chProd(d.id), pend = p && p.vatPending, v = chVatDraft(d);
  if (pend) { const q = chQAny(pend.qid); return `<h3 class="small">6. VAT</h3><div class="note b-amber" id="bp-vatsec">${ic('clock')}<div class="small"><strong>VAT change awaiting Finance approval${q ? ` (${q.id})` : ''}:</strong> ${chVatTxt(p.vat)} → ${chVatTxt(pend)}. You can change VAT again once it's decided.</div></div>`; }
  return `<h3 class="small">6. VAT</h3><div class="form-grid" id="bp-vatsec"><div class="field"><label class="check"><input type="checkbox" id="bp-vat" ${v.on ? 'checked' : ''} data-onchange="chVatCalc">Add VAT</label><span class="hint">Set per bundle. Finance approves every change.</span></div><div class="field"><label for="bp-vatp">VAT %</label><input class="input num" type="number" min="0.01" max="100" step="0.01" id="bp-vatp" value="${v.pct}" data-oninput="chVatCalc" ${v.on ? '' : 'disabled title="Tick Add VAT first"'}></div></div><p class="small" id="bp-vatout">${chVatPrev(d)}</p>`;
}
function chVatInject(d) { if (!MODAL || !/id="bp-out"/.test(MODAL.body || '') || /id="bp-vatsec"/.test(MODAL.body)) return; MODAL.body += chVatSec(d); renderModal(); }
const _newBundleCh6 = ACT.newBundle;
ACT.newBundle = el => {
  _newBundleCh6(el); const st = S.bp; if (!st || st._ch6) return; st._ch6 = true;
  const draw = st.draw; st.draw = () => { if ($('#bp-vat')) chVatRead(st.d); draw(); chVatInject(st.d); };
  chVatInject(st.d);
};
INP.chVatCalc = () => { const st = S.bp; if (!st) return; const v = chVatRead(st.d), x = $('#bp-vatp'); if (x) { x.disabled = !v.on; if (v.on) x.removeAttribute('title'); else x.title = 'Tick Add VAT first'; } $('#bp-vatout').innerHTML = chVatPrev(st.d); };
const _bpCalcCh6 = INP.bpCalc;
INP.bpCalc = el => { _bpCalcCh6(el); const o = $('#bp-vatout'); if (o && S.bp) o.innerHTML = chVatPrev(S.bp.d); };
const chVatBad = v => v && v.on && !(+v.pct > 0 && +v.pct <= 100);
const _saveProductCh6 = saveProduct;
saveProduct = function (st, how) {
  const d = st.d, v = $('#bp-vat') ? chVatRead(d) : d.chVat, p0 = d.id && chProd(d.id);
  if (chVatBad(v)) { fieldErr('#bp-vatp', v.pct === '' ? 'Enter the VAT %' : 'Enter a VAT % between 0.01 and 100'); return false; }
  const n = STORE.biz.products.length, r = _saveProductCh6.apply(this, arguments); if (r === false) return false;
  const p = p0 || (STORE.biz.products.length > n ? STORE.biz.products[STORE.biz.products.length - 1] : null);
  if (!p || !v || p.vatPending) return r;
  const want = v.on ? { on: true, pct: +v.pct } : { on: false, pct: 0 };
  if (chVatTxt(want) === chVatTxt(p.vat)) return r;
  const i = chVatRequest(p, want, `${chVatTxt(p.vat)} → ${chVatTxt(want)} (bundle editor).`);
  render(); toast(isSA() ? `${chVatTxt(want)} applied immediately — ${SA_TAG}.` : `VAT change sent to Finance for approval (${i.id}). ${p.status === 'Published' ? 'The current price stays until it\'s approved.' : 'You can publish once it\'s approved.'}`);
  return r;
};

/* ---------- Bundle detail: VAT, "Change VAT", publish blocked while pending ---------- */
ACT.chVatChange = el => {
  const p = chProd(el.dataset.id); if (!p) return; if (p.vatPending) { toast('A VAT change is already awaiting Finance approval.', 'err'); return; }
  const v = { on: chVatOn(p.vat), pct: chVatOn(p.vat) ? +p.vat.pct : '' }, d = { courses: p.courses, chVat: v, ...p }; d.chVat = v;
  S.chVatDlg = d;
  reasonDlg({ title: 'Change VAT — ' + esc(p.name), ok: isSA() ? 'Apply now' : 'Send to Finance for approval', label: 'Reason (required)',
    body: `<p class="small">Current: <strong>${chVatTxt(p.vat)}</strong>${p.status === 'Published' ? ' — this price stays in Buy Bundles until Finance approves the change.' : ''}</p>`,
    extra: `<div class="form-grid"><div class="field"><label class="check"><input type="checkbox" id="bp-vat" ${v.on ? 'checked' : ''} data-onchange="chVatDlgCalc">Add VAT</label></div><div class="field"><label for="bp-vatp">VAT %</label><input class="input num" type="number" min="0.01" max="100" step="0.01" id="bp-vatp" value="${v.pct}" data-oninput="chVatDlgCalc" ${v.on ? '' : 'disabled title="Tick Add VAT first"'}></div></div><p class="small" id="bp-vatout">${chVatPrev(d)}</p>`,
    onOk: r => {
      const w = chVatRead(d); if (chVatBad(w)) { fieldErr('#bp-vatp', w.pct === '' ? 'Enter the VAT %' : 'Enter a VAT % between 0.01 and 100'); return false; }
      const want = w.on ? { on: true, pct: +w.pct } : { on: false, pct: 0 };
      if (chVatTxt(want) === chVatTxt(p.vat)) { fieldErr('#bp-vatp', 'That is the current VAT setting'); return false; }
      const i = chVatRequest(p, want, r); S.chVatDlg = null; render();
      toast(isSA() ? `${chVatTxt(want)} applied immediately — ${SA_TAG}.` : `Sent to Finance for approval (${i.id}).${p.status === 'Published' ? ' The current price stays until it\'s approved.' : ''}`);
    } });
};
INP.chVatDlgCalc = () => { const d = S.chVatDlg; if (!d) return; const v = chVatRead(d), x = $('#bp-vatp'); x.disabled = !v.on; if (v.on) x.removeAttribute('title'); else x.title = 'Tick Add VAT first'; $('#bp-vatout').innerHTML = chVatPrev(d); };
const _pdCh6 = productDetail;
productDetail = function (id) {
  let h = _pdCh6(id); const p = chProd(id); if (!p || !/Version history/.test(h)) return h;
  const net = priceOf(p).final, pct = chVatPct(p), pend = p.vatPending, q = pend && chQAny(pend.qid), last = p.vatLast;
  h = h.replace(/(<dt>Final price<\/dt><dd><strong>[^<]*<\/strong><\/dd>)/, `$1<dt>VAT</dt><dd>${chVatTxt(p.vat)}${pend ? ` ${chip('Change pending', 'amber')}` : ''}</dd><dt>Agency pays</dt><dd>${pct ? chVatSum(net, pct, p.cur) : money(net, p.cur) + ' (no VAT)'}</dd>`);
  const note = pend ? `<div class="note b-amber" role="status">${ic('clock')}<div class="small"><strong>VAT change awaiting Finance approval${q ? ` (<a href="#a-queue.${q.id}" data-act="goTok" data-t="a-queue.${q.id}">${q.id}</a>)` : ''}:</strong> ${chVatTxt(p.vat)} → ${chVatTxt(pend)}. ${p.status === 'Published' ? 'The current price stays in Buy Bundles until it\'s approved.' : 'The bundle can\'t be published until it\'s approved.'}</div></div>`
    : last ? `<div class="note b-grey">${ic('info')}<div class="small"><strong>VAT change ${last.state.toLowerCase()} (${last.qid}):</strong> ${esc(last.reason || '')} The bundle stays ${chVatTxt(p.vat)}.</div></div>` : '';
  if (note) h = h.replace(/(Changes to bundles, prices and validity create a new version\.<\/div><\/div>)/, '$1' + note);
  if (pend) h = h.replace(`<button class="btn btn-primary" data-act="bPublish" data-id="${p.id}">Publish</button>`, `<button class="btn btn-primary" disabled title="VAT change awaiting Finance approval">Publish</button>`);
  if (p.status !== 'Retired' && p.status !== 'Pending approval') h = h.replace(`<button class="btn" data-act="bDup" data-id="${p.id}">`, `<button class="btn" data-act="chVatChange" data-id="${p.id}" ${pend ? 'disabled title="A VAT change is already awaiting Finance approval"' : ''}>Change VAT</button><button class="btn" data-act="bDup" data-id="${p.id}">`);
  h = h.replace('<button class="btn btn-primary btn-sm" disabled>Choose quantity</button>', `<p class="small">${chVatAgy(net, pct, p.cur)}</p><button class="btn btn-primary btn-sm" disabled>Choose quantity</button>`);
  return h;
};
const _bPubCh6 = ACT.bPublish;
ACT.bPublish = el => {
  const p = chProd(el.dataset.id);
  if (p && p.vatPending) { const q = chQAny(p.vatPending.qid); openModal({ title: 'Can\'t publish', body: `<div class="note b-red">${ic('lock')}<div class="small">A VAT change is awaiting Finance approval${q ? ` (${q.id})` : ''}. You can publish once it's approved.</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  return _bPubCh6(el);
};
// Duplicates start without VAT (a new bundle needs its own approval)
const _bDupCh6 = ACT.bDup;
ACT.bDup = el => { const n = STORE.biz.products.length; _bDupCh6(el); const c = STORE.biz.products[n]; if (c) { c.vat = null; c.vatPending = null; c.vatLast = null; render(); } };

/* ---------- Agency: price with VAT (approved setting only) ---------- */
const _agyCatCh6 = AGY_CATALOGUE;
AGY_CATALOGUE = function () { return _agyCatCh6.apply(this, arguments).map(c => ({ ...c, vatPct: chVatPct(chProd(c.id)) })); };
const _priceForCh6 = priceFor;
priceFor = function (c, qty) { const pr = _priceForCh6.apply(this, arguments), pct = (c && c.vatPct) || 0, vat = chVatAmt(pr.total, pct); return { ...pr, net: pr.total, vatPct: pct, vat, total: pr.total + vat }; };
const _gBuyCh6 = SCREENS['g-buy'];
SCREENS['g-buy'] = p => { let h = _gBuyCh6(p); AGY_CATALOGUE().forEach(c => { const pr = priceFor(c, c.seats); h = h.replace(`<button class="btn btn-sm" data-act="agBuy" data-id="${c.id}">`, `<p class="small ch-vat">${chVatAgy(pr.net, pr.vatPct)}</p><button class="btn btn-sm" data-act="agBuy" data-id="${c.id}">`); }); return h; };
const _bphCh6 = buyPriceHtml;
buyPriceHtml = function (c, qty) { const pr = priceFor(c, qty); return _bphCh6.apply(this, arguments) + `<p class="small ch-vat">${chVatAgy(pr.net, pr.vatPct)}</p>`; };
const _agCoCh6 = agCheckout;
agCheckout = function () { const r = _agCoCh6.apply(this, arguments), b = S.agy.buy; if (MODAL && b) { const pr = priceFor(b.c, b.qty); MODAL.body = MODAL.body.replace('<div class="checkout-sum">', `<div class="checkout-sum"><p class="small ch-vat">${chVatAgy(pr.net, pr.vatPct)}</p>`); renderModal(); } return r; };
const _agInvCh6 = agInvoiceForm;
agInvoiceForm = function () {
  const r = _agInvCh6.apply(this, arguments), b = S.agy.buy; if (!MODAL || !b) return r;
  const pr = priceFor(b.c, b.qty), vat = { net: pr.net, pct: pr.vatPct, vat: pr.vat };
  MODAL.body = `<p class="small ch-vat">${chVatAgy(pr.net, pr.vatPct)}</p>` + MODAL.body;
  const a = MODAL.actions[MODAL.actions.length - 1], f = a.fn;
  a.fn = (...x) => { const n = ADMIN.queue.length, res = f(...x); if (ADMIN.queue.length > n && ADMIN.queue[0].data) { ADMIN.queue[0].data.vat = vat; render(); } return res; };
  renderModal(); return r;
};
const chVatStamp = (x, pr) => Object.assign(x, { net: pr.net, vatPct: pr.vatPct, vat: pr.vat });
const _agPayCh6 = agPayResult;
agPayResult = function (o) {
  const b = S.agy.buy, pr = b ? priceFor(b.c, b.qty) : null, n = STORE.agy.purchases.length;
  const r = _agPayCh6.apply(this, arguments);
  if (pr && STORE.agy.purchases.length > n) {
    const p = STORE.agy.purchases[0]; chVatStamp(p, pr);
    const bn = p.bundle && ADMIN.bundles.find(x => x.id === p.bundle); if (bn) chVatStamp(bn, pr);
    const t = STORE.fin && STORE.fin.tx.find(x => x.ref === p.ref); if (t) chVatStamp(t, pr);
    const a = MODAL && MODAL.actions.find(x => x.label === 'Download receipt'); if (a) a.fn = () => { chReceipt(p.ref); return false; };
  }
  return r;
};
// Invoice purchases: stamp the Finance payment and the credited bundle from the request's VAT (net = paid ÷ (1 + VAT%))
function chVatSync() {
  ADMIN.queue.filter(i => i.type === 'Agency invoice (offline) purchase' && i.data && i.data.vat && i.stage === 'paid').forEach(i => {
    const v = i.data.vat, split = x => { const gross = x.amount ?? x.price, net = Math.round(gross / (1 + v.pct / 100) * 100) / 100; return { net, vatPct: v.pct, vat: Math.round((gross - net) * 100) / 100 }; };
    (STORE.fin ? STORE.fin.tx : []).filter(t => t.mode === 'Invoice' && t.payer === i.data.agency && t.course === i.data.bundle && t.vatPct == null && t.at >= i.raised).forEach(t => Object.assign(t, split(t)));
    const bn = i.data.bundleId && ADMIN.bundles.find(x => x.id === i.data.bundleId); if (bn && bn.vatPct == null) Object.assign(bn, split(bn));
  });
}
// The VAT on any agency record, or null (bought before VAT, or no VAT)
function chVatOfRec(x) {
  if (!x) return null;
  if (x.vatPct != null) return { net: x.net, pct: x.vatPct, vat: x.vat };
  const q = x.q || (x.ref && chQAny(x.ref)) || (x.id && chQAny(x.id)), v = q && q.data && q.data.vat;
  return v ? { net: v.net, pct: v.pct, vat: v.vat } : null;
}

/* ---------- Receipts ---------- */
function chReceipt(ref) {
  chVatSync(); const x = agyPurchases().find(r => r.ref === ref); if (!x) { toast('Receipt not found.', 'err'); return; }
  const v = chVatOfRec(x), net = v ? v.net : x.amount;
  openModal({ title: 'Receipt RCP-' + x.ref.slice(-5), sub: esc(x.agency || AGN()), body: `<dl class="kv"><dt>Receipt</dt><dd class="mono">RCP-${x.ref.slice(-5)}</dd><dt>Reference</dt><dd class="mono">${x.ref}</dd><dt>Bundle</dt><dd>${esc(x.name)}</dd><dt>Seats</dt><dd>${x.seats}</dd><dt>Date</dt><dd>${fdt(x.at)}</dd><dt>Method</dt><dd>${x.method === 'Invoice' ? 'Bank transfer' : esc(x.method)}</dd><dt>Net</dt><dd>${money(net, x.cur)}</dd><dt>VAT</dt><dd>${v && v.pct ? `${v.pct}% · ${money(v.vat, x.cur)}` : 'No VAT'}</dd><dt>Total paid</dt><dd><strong>${money(x.amount, x.cur)}</strong></dd></dl><p class="xs muted">${ic('info', 12)} The Academy sends VAT invoices by email.</p>`,
    actions: [{ label: 'Close' }, { label: 'Download PDF', cls: 'btn-primary', fn: () => { toast('Receipt downloaded (simulated).'); return false; } }] });
}
ACT.agReceipt = el => chReceipt(el.dataset.ref);
const _gPurCh6 = SCREENS['g-purchase'];
SCREENS['g-purchase'] = p => {
  chVatSync(); let h = _gPurCh6(p); const x = agyPurchases().find(r => r.ref === p.id); if (!x) return h;
  const v = chVatOfRec(x);
  h = h.replace(/<dt>Amount<\/dt><dd>[^<]*<\/dd>/, `<dt>Net</dt><dd>${money(v ? v.net : x.amount, x.cur)}</dd><dt>VAT</dt><dd>${v && v.pct ? `${v.pct}% · ${money(v.vat, x.cur)}` : 'No VAT'}</dd><dt>Total</dt><dd><strong>${money(x.amount, x.cur)}</strong></dd>`);
  if (x.status === 'Paid') h = h.replace('</dl></section>', `</dl><button class="btn btn-sm" data-act="agReceipt" data-ref="${x.ref}">${ic('download', 14)}Receipt</button></section>`);
  return h;
};

/* ---------- Tables: net, VAT %, VAT and total (agency purchases, Finance ledger and agency payments) ---------- */
const chVatCols = get => [
  { k: 'chNet', l: 'Net', r: 1, h: r => { const g = get(r); return g === null ? '—' : money(g ? g.net : (r.amount ?? r.price), r.cur); }, v: r => { const g = get(r); return g === null ? '' : g ? g.net : (r.amount ?? r.price); } },
  { k: 'chVatP', l: 'VAT %', h: r => { const g = get(r); return g === null ? '—' : g && g.pct ? g.pct + '%' : 'No VAT'; }, v: r => { const g = get(r); return g && g.pct ? g.pct + '%' : ''; } },
  { k: 'chVat', l: 'VAT', r: 1, h: r => { const g = get(r); return g && g.pct ? money(g.vat, r.cur) : '—'; }, v: r => { const g = get(r); return g && g.pct ? g.vat : 0; } }];
const CH_VAT_DT = {
  'g-pur': { k: 'amount', get: x => chVatOfRec(x) || false },
  fledger: { k: 'amount', get: t => t.payerType === 'Agency' ? chVatOfRec(t) || false : null },
  fagh: { k: 'amount', get: r => chVatOfRec(ADMIN.bundles.find(b => b.id === r.id) || chQAny(r.id)) || false } };
const _dtCh6 = dt;
dt = function (cfg) {
  const c = cfg && CH_VAT_DT[cfg.id];
  if (c && !cfg.cols.some(x => x.k === 'chNet')) { const k = cfg.cols.findIndex(x => x.k === c.k); if (k >= 0) { chVatSync(); const cols = cfg.cols.slice(); cols.splice(k, 1, ...chVatCols(c.get), { ...cfg.cols[k], l: 'Total' }); cfg = { ...cfg, cols }; } }
  return _dtCh6.call(this, cfg);
};
const _fRepCh6 = SCREENS['f-reports'];
SCREENS['f-reports'] = p => {
  const h = _fRepCh6(p); if ((p && p.tab) !== 'agency') return h; chVatSync();
  const rows = ADMIN.agencies.map(a => { const bs = ADMIN.bundles.filter(b => b.agency === a.name), o = allQueue().filter(i => i.stage === 'awaiting' && i.data && i.data.agency === a.name); const tot = bs.reduce((s, b) => s + b.price, 0), vat = bs.reduce((s, b) => { const v = chVatOfRec(b); return s + (v && v.pct ? v.vat : 0); }, 0);
    return `<tr><td>${esc(a.name)}</td><td class="r">${bs.length || '—'}</td><td class="r">${bs.length ? money(tot - vat, 'GBP') : '—'}</td><td class="r">${bs.length ? money(vat, 'GBP') : '—'}</td><td class="r">${bs.length ? money(tot, 'GBP') : '—'}</td><td class="small">${[...new Set(bs.map(b => b.mode === 'Customised' ? 'Invoice' : 'Gateway'))].join(', ') || '—'}</td><td class="r">${o.map(i => money(i.amount, i.cur)).join(', ') || '—'}</td></tr>`; }).join('');
  return h.replace(/<section class="card"><table class="tbl dense"><thead><tr><th>Agency<\/th><th class="r">Bundle purchases<\/th>[\s\S]*?<\/table><\/section>/, `<section class="card"><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Agency</th><th class="r">Bundle purchases</th><th class="r">Net</th><th class="r">VAT</th><th class="r">Total</th><th>Modes</th><th class="r">Outstanding invoices</th></tr></thead><tbody>${rows}</tbody></table></div><p class="xs muted">${ic('info', 12)} VAT applies to agency bundle purchases only — learner payments carry no VAT.</p></section>`);
};

/* ---------- Demo Scenario #22 "Bundle VAT approval" ---------- */
const chVatOpenQ = () => ADMIN.queue.find(i => i.type === CH_VAT_T && isOpen(i) && i.data && i.data.productId === 'CAT-3');
ACT.chSc22Biz = () => { ACT.switchRole({ dataset: { r: 'bizA' } }); S.signedIn = true; go('a-bundles', { id: 'CAT-3', tab: 'catalogue' }); toast('Viewing as Sophie Turner — Business Admin. Choose "Change VAT".', 'info'); };
ACT.chSc22Fin = () => { ACT.switchRole({ dataset: { r: 'finA' } }); S.signedIn = true; const i = chVatOpenQ(); go('a-queue', i ? { id: i.id } : {}); toast(i ? `Viewing as ${FIN_A} — Finance Admin. Approve ${i.id}.` : `Viewing as ${FIN_A} — Finance Admin. Raise the VAT change first (step 1).`, 'info'); };
ACT.chSc22Agy = () => { ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; go('g-buy'); toast('Viewing as the agency — Buy Bundles.', 'info'); };
ACT.chSc22Rcpt = () => { ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; go('g-purchases'); const p = agyPurchases().find(x => x.status === 'Paid' && x.vatPct); if (p) chReceipt(p.ref); else toast('Buy the bundle first (step 4) — then open its receipt.', 'info'); };
const _scListCh6 = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  return _scListCh6().concat([['22', 'Bundle VAT approval', 'CH-06', [
    s('The Business Admin opens "Dementia Awareness seats" (published, no VAT), ticks "Add VAT" and enters 20% — the preview shows net + VAT = total. A "Bundle VAT setting" approval is raised; the current price stays.', '', '', 'chSc22Biz'),
    s('The Finance Admin approves it in the Approvals Queue (it would escalate to the Super Admin after 7 days).', '', '', 'chSc22Fin'),
    s('The agency sees the total including VAT in Buy Bundles: "net + VAT = total".', '', '', 'chSc22Agy'),
    s('The agency buys the bundle by card; checkout shows the same breakdown.', '', '', 'chSc22Agy'),
    s('The receipt shows the net price, the VAT % and the VAT amount.', '', '', 'chSc22Rcpt')]]]);
};
CDL_SCEN.push(['22', 'Bundle VAT approval', 'Client-defined (CH-06)']);

/* ---------- Records ---------- */
CH_APPLIED[6] = '13 Oct 2026';
UXC.push(['CH batch 6', 'Client decisions — Batch 6 (CH-06)', [
  'CH-06: Business Admin → bundle editor → new "6. VAT" section: "Add VAT" tick-box and a VAT % field (required when ticked), set per bundle, with a preview "£6,000 + VAT (20%) £1,200 = £7,200". Bundle detail shows the VAT and what the agency pays, and offers "Change VAT" (with a reason).',
  'CH-06: every VAT change is a new Approvals Queue item, "Bundle VAT setting" — raised by the Business Admin, first approver Finance Admin, escalates to the Super Admin after 7 days; the Super Admin\'s own changes apply immediately. "Who approves what" has 15 rows. A bundle can\'t be published while its VAT is pending; on a published bundle the current price stays until the change is approved.',
  'CH-06: Agency → Buy Bundles, the quantity dialog and checkout show "net + VAT = total"; purchase records (list and detail) show net, VAT % and VAT amount; receipts open with the same breakdown. Invoice (bank transfer) requests carry the VAT too.',
  'CH-06: Finance → Transactions (Ledger) and Agency Payments → Purchase history show Net, VAT %, VAT and Total columns for agency purchases; Finance Reports → Agency adds Net, VAT and Total. VAT never applies to learner purchases.',
  'Mock: "Mandatory training starter" (CAT-1) — VAT 20% approved (AQ-7300); "Infection control seats" (CAT-2, published) — VAT 20% pending Finance approval (AQ-7301), the current price stays until it\'s approved; "Dementia Awareness seats" (CAT-3) — no VAT. Demo Scenario #22 "Bundle VAT approval".']]);

/* ---------- Screen index (with purpose lines) ---------- */
const _aIdxCh6 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh6(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Bundle — VAT approved (Mandatory training starter)', { act: 'aJump', t: 'a-bundles.CAT-1.catalogue' }, 'CH-06 — VAT 20% approved; the agency pays net + VAT.'),
  chIdxLi('Bundle — VAT pending (Infection control seats)', { act: 'aJump', t: 'a-bundles.CAT-2.catalogue' }, 'CH-06 — published bundle; VAT awaits Finance approval, the current price stays.'),
  chIdxLi('Approvals item — Bundle VAT setting (pending)', { act: 'aJump', t: 'a-queue.AQ-7301' }, 'CH-06 — Finance Admin approves; escalates to the Super Admin after 7 days.')].join('')}`);
const _bIdxCh6 = SCREENS['b-index'];
SCREENS['b-index'] = p => _bIdxCh6(p) + `<section class="card idx-sec"><h2>Client decisions (CH)</h2><ul class="idx-list">${[
  chIdxLi('Bundle — no VAT (Dementia Awareness seats): Change VAT', { act: 'goTok', t: 'a-bundles.CAT-3.catalogue' }, 'CH-06 — tick "Add VAT", enter the %; Finance approves.'),
  chIdxLi('Bundle — VAT pending (current price stays)', { act: 'goTok', t: 'a-bundles.CAT-2.catalogue' }, 'CH-06 — a draft can\'t be published while VAT is pending; a published bundle keeps its price.'),
  chIdxLi('Approvals item — Bundle VAT setting (read-only)', { act: 'goTok', t: 'a-queue.AQ-7301' }, 'CH-06 — raised by you; Finance decides.')].join('')}</ul></section>`;
const _fIdxCh6 = SCREENS['f-index'];
SCREENS['f-index'] = p => _fIdxCh6(p) + `<section class="card idx-sec"><h2>Client decisions (CH)</h2><ul class="idx-list">${[
  chIdxLi('Approvals item — Bundle VAT setting (awaiting you)', { act: 'goTok', t: 'a-queue.AQ-7301' }, 'CH-06 — approve or reject a bundle\'s VAT %.'),
  chIdxLi('Transactions (Ledger) — net, VAT and total', { act: 'goTok', t: 'f-ledger' }, 'CH-06 — VAT columns for agency purchases; learners carry no VAT.'),
  chIdxLi('Finance Reports — Agency (net, VAT, total)', { act: 'goTok', t: 'f-reports..agency' }, 'CH-06 — VAT totals per agency.')].join('')}</ul></section>`;
const _gIdxCh6 = SCREENS['g-index'];
SCREENS['g-index'] = p => _gIdxCh6(p) + `<section class="card idx-sec"><h2>Client decisions (CH)</h2><ul class="idx-list">${[
  chIdxLi('Buy Bundles — net + VAT = total', { act: 'agyGo', r: 'g-buy' }, 'CH-06 — prices with VAT where the Academy has set it.'),
  chIdxLi('Purchases — net, VAT % and VAT; receipts', { act: 'agyGo', r: 'g-purchases' }, 'CH-06 — each purchase and its receipt show the VAT breakdown.')].join('')}</ul></section>`;
