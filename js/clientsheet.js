/* ============================================================
   Client suggestion sheet — agreed items C1, C2, C3, C4, C5, C7, C8, C10, C11, C12, C14, C15.
   Targeted additions only: each block wraps an existing screen, action or helper and names the item it serves.
   Held (not built, untouched): 6 payment dial / cards / observation fee · 9 paying during document review /
   bank transfer · 13 a quiz in every module.
   Loads last (after guard.js), so the bare names below resolve to these wrappers at call time.
   ============================================================ */
'use strict';

/* ---------- Mock data (added on top of every world; existing IDs unchanged) ---------- */
// C1: evidence requirement per assessment type (same wording the Assessor already sees on the criterion panel)
const CS_EVREQ = { Knowledge: 'Written evidence that addresses every part of the descriptor', Observation: 'Direct observation in the workplace' };
const csEvReq = type => CS_EVREQ[type === 'Knowledge' ? 'Knowledge' : 'Observation'];
// C8: a mock file size for any uploaded file (stable per file name, under the 5 MB upload limit)
const csSize = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (0.3 + (h % 44) / 10).toFixed(1) + ' MB'; };
// C4: does an assignment's "U305 · Module 1" / "U301 · Module 1–2" cover this unit and module?
function csCovers(unit, code, mod) {
  const m = /^(U\d+)\s*·\s*Module\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(unit || ''); if (!m || m[1] !== code) return false;
  return mod >= +m[2] && mod <= +(m[3] || m[2]);
}
const _makeWorldCs = makeWorld;
makeWorld = function (v) {
  const w = _makeWorldCs(v);
  (w.tree || []).forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (!c.evReq) c.evReq = csEvReq(lo.type); }))));
  (w.resources || []).forEach(g => { if (g.courseId) return; const m = /^(U\d+).*Module\s*(\d+)/.exec(g.unit); g.asg = m ? (w.assignments || []).filter(a => csCovers(a.unit, m[1], +m[2])).map(a => a.id) : []; });
  (w.docs || []).forEach(d => { if (d.file && !d.size) d.size = csSize(d.file); });
  // C3: Grace (sponsored L2 learner) has her Professional Discussion by phone — no Zoom link
  if (v === 'D' && w.pd && w.pd.session) {
    w.pd.session = { status: 'Proposed', at: w.pd.session.at, mode: 'phone_call', loc: '', with: w.pd.session.with };
    const ev = (w.events || []).find(e => e.id === 'epd'); if (ev) { ev.mode = 'phone_call'; ev.loc = null; }
  }
  return w;
};

/* ---------- C1: Download criteria (PDF) + evidence requirements on the assignment page ---------- */
function csCrit(a, code) {
  const t = allCrit().find(x => x.code === code), ac = (a.crit || []).find(x => x[0] === code);
  const type = t ? t.type : ac ? ac[2] : 'Knowledge';
  return { code, d: t ? t.d : ac ? ac[1] : '', type, ev: (t && t.evReq) || csEvReq(type) };
}
let CS_ASG = null;
function csQHead(q, i) {
  const c = csCrit(CS_ASG, q.crit);
  return `<div class="q-h"><span class="q-n">Q${i + 1}</span><div class="stack" style="gap:6px"><span class="q-t">${esc(q.text)}</span><div class="row"><span class="code">${q.crit}</span>${critType(c.type)}</div>
    <dl class="cs-crit small"><dt>Criterion</dt><dd>${esc(c.d)}</dd><dt>Evidence requirements</dt><dd>${esc(c.ev)}</dd></dl></div></div>`;
}
const csUnitTitle = a => { const code = (a.unit || '').split(' ')[0], u = (W.tree || []).find(x => x.code === code); return u ? u.title : ''; };
function csCritDoc(a) {
  return `<div class="cs-pdf"><p class="xs muted">Illumin Academy · Assessment criteria</p><h3>${esc(a.title)}</h3>
    <dl class="cs-dl small"><dt>Programme</dt><dd>${esc(W.nvq.title)}</dd><dt>Unit / module</dt><dd>${esc(a.unit)}${csUnitTitle(a) ? ' — ' + esc(csUnitTitle(a)) : ''}</dd></dl>
    <ol class="cs-pdf-q">${a.qs.map((q, i) => { const c = csCrit(a, q.crit); return `<li data-q="${i + 1}"><strong>Q${i + 1}. ${esc(q.text)}</strong>
      <dl class="cs-dl small"><dt>Code</dt><dd class="mono">${esc(c.code)}</dd><dt>Descriptor</dt><dd>${esc(c.d)}</dd><dt>Assessment type</dt><dd>${c.type === 'Knowledge' ? 'Knowledge' : 'Observation / Competency'}</dd><dt>Evidence requirements</dt><dd>${esc(c.ev)}</dd></dl></li>`; }).join('')}</ol></div>`;
}
ACT.csCritPdf = el => {
  const a = asgById(el.dataset.id); if (!a) return;
  const file = `${a.title.split('—')[0].trim()} — criteria.pdf`;
  toast(`"${esc(file)}" downloaded (simulated).`);
  openModal({ title: 'Assessment criteria (PDF)', sub: esc(file), size: 'lg cs-sheet', body: csCritDoc(a), actions: [{ label: 'Close' }, { label: `${ic('download', 15)} Download PDF`, cls: 'btn-primary', fn: () => { toast(`"${esc(file)}" downloaded (simulated).`); return false; } }] });
};
const _asgScreenCs = SCREENS.assignment;
SCREENS.assignment = p => {
  const a = asgById(p.id); if (!a) return _asgScreenCs(p);
  const q0 = qHead, h0 = asgHeader;
  CS_ASG = a; qHead = csQHead;
  // Linked criteria in the Brief: the evidence requirement under each criterion
  asgHeader = x => x.crit.reduce((h, [c, d]) => h.replace(`<span class="small">${esc(d)}</span></div>`, `<span class="small">${esc(d)}</span><span class="xs muted">Evidence requirements: ${esc(csCrit(x, c).ev)}</span></div>`), h0(x));
  let h; try { h = _asgScreenCs(p); } finally { qHead = q0; asgHeader = h0; CS_ASG = null; }
  const i = h.indexOf('<div class="page-h">'), j = i < 0 ? -1 : h.indexOf('<div class="row">', i);
  const btn = `<button class="btn btn-sm" data-act="csCritPdf" data-id="${a.id}">${ic('download', 14)}Download criteria (PDF)</button>`;
  return j < 0 ? h : h.slice(0, j + 17) + btn + h.slice(j + 17);
};

/* ---------- C2 + C12: certificates in one list, expiry reminders ---------- */
const CS_CERT_ORDER = ['Valid', 'Expiring soon', 'Expired', 'Revoked', 'Processing'];
const csExpiring = () => (W.certs || []).filter(c => c.status === 'Expiring soon' && c.expires).sort((a, b) => new Date(a.expires) - new Date(b.expires));
// One yellow card per expiring certificate, at most 3, then "+N more". kind: 'cert' (C2) | 'dash' (C12)
function csExpiryCards(kind) {
  const list = csExpiring(); if (!list.length) return '';
  const more = list.length - 3;
  return `<section class="cs-remind" aria-label="Certificates expiring soon">${list.slice(0, 3).map(c => `<div class="note b-amber cs-exp" data-cert="${c.id}">${ic('clock')}<div class="li-b"><strong>${kind === 'dash' ? `${esc(c.course)} — expires in ${plural(daysTo(c.expires), 'day')}` : `${esc(c.course)} certificate expires in ${plural(daysTo(c.expires), 'day')}`}</strong><span class="small">Valid until ${fd(c.expires)}. Renew to keep your certificate current.</span></div><button class="btn btn-sm btn-gold" data-act="renewCert" data-id="${c.id}">Renew</button></div>`).join('')}
    ${more > 0 ? `<button class="linklike small cs-more" data-act="csCertMore">+${more} more</button>` : ''}</section>`;
}
SCREENS.certificates = () => {
  const f = ui('csCertF', '');
  const all = (W.certs || []).map((c, i) => [c, i]).sort((x, y) => (CS_CERT_ORDER.indexOf(x[0].status) - CS_CERT_ORDER.indexOf(y[0].status)) || (x[1] - y[1])).map(x => x[0]);
  const list = all.filter(c => !f || c.status === f);
  const opts = CS_CERT_ORDER.filter(s => all.some(c => c.status === s));
  return `${pageHead('Certificates', 'Certificates are issued by Welfare on behalf of Illumin Academy.')}
  ${csExpiryCards('cert')}
  <div class="row-b"><p class="small muted" role="status">${plural(list.length, 'certificate')}${f ? ` · ${esc(f)}` : ''} · sorted Valid → Expiring soon → Expired → Revoked</p>
    <div class="field"><label for="cs-certf">Status</label><select class="select" id="cs-certf" data-onchange="csCertF"><option value="">All statuses</option>${opts.map(s => `<option ${s === f ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
  ${list.length ? `<div class="grid">${list.map(certCard).join('')}</div>` : `<div class="card">${emptyState({ icon: 'award', title: 'No certificates with this status', why: 'Choose "All statuses" to see every certificate.', action: '<button class="btn btn-sm" data-act="csCertMore" data-k="">Show all</button>' })}</div>`}`;
};
INP.csCertF = el => { setUi('csCertF', el.value); render(); };
ACT.csCertMore = el => { setUi('csCertF', el && el.dataset && el.dataset.k !== undefined ? el.dataset.k : 'Expiring soon'); render(); };

/* ---------- C3: Phone call as a third PD mode (stored as 'phone_call'; no Zoom link) ---------- */
const CS_PHONE_TXT = 'Phone call — your assessor will call you on your registered number';
// Learner: PD session panel
const _pdSectionCs = pdSection;
pdSection = function () {
  const h = _pdSectionCs(), s = W.pd && W.pd.session;
  return s && s.mode === 'phone_call' ? h.replace('Online — <a href="#" data-act="joinPd">Zoom link</a>', `<span class="cs-phone">${ic('phone', 14)} ${CS_PHONE_TXT}</span><br><span class="small muted">${esc(W.me.mobile)}</span>`) : h;
};
const _pdConfirmCs = ACT.pdConfirm;
ACT.pdConfirm = el => { _pdConfirmCs(el); if (MODAL && W.pd.session.mode === 'phone_call') { MODAL.body = MODAL.body.replace('phone_call', 'Phone call (no Zoom link)'); renderModal(); } };
const _actionItemsCs = actionItems;
actionItems = function () { return _actionItemsCs.apply(this, arguments).map(a => typeof a.d === 'string' && a.d.endsWith(' · phone_call') ? { ...a, d: a.d.replace(/ · phone_call$/, ' · Phone call') } : a); };
// Assessor: Grace's phone session sits with Aisha's on the PD list (both allocated to the Assessor)
const _tasPdListCs = tasPdList;
tasPdList = function () {
  const out = _tasPdListCs();
  if (!out.some(x => x.v === 'D') && STORE.worlds.D && tasLearners(true).some(l => l.v === 'D')) {
    const w = STORE.worlds.D, k = out.findIndex(x => !x.v);
    out.splice(k < 0 ? out.length : k, 0, { lid: w.me.id, name: VNAME('D'), v: 'D', items: w.pd.items.map(i => [i.ref, i.from, i.reason, i.status, i]), session: w.pd.session, history: w.pd.history });
  }
  return out;
};
const _pdCardCs = pdCard;
pdCard = function (p) {
  const s = p.session; if (!s || s.mode !== 'phone_call') return _pdCardCs(p);
  return _pdCardCs({ ...p, session: { ...s, mode: 'Phone call', zoom: undefined, loc: "you call the learner on their registered number" } }).replace('· Phone call ·', `· <span class="cs-phone">${ic('phone', 14)} Phone call</span> ·`);
};
function csPdTarget(lid) { const p = pdOf(lid); if (!p) return {}; if (p.v) { const w = STORE.worlds[p.v]; return { w, s: w.pd.session }; } const t = STORE.tas.pd.find(x => x.lid === lid); return { s: t && t.session }; }
const _pdProposeCs = ACT.pdPropose;
ACT.pdPropose = el => {
  _pdProposeCs(el);
  if (!MODAL || MODAL.title !== 'Propose PD session' || !MODAL.actions[1]) return;
  MODAL.body = MODAL.body.replace('<select class="select" id="pd-m">', '<select class="select" id="pd-m" data-onchange="csPdMode">').replace('<option>Online</option></select>', '<option>Online</option><option value="phone_call">Phone call</option></select>')
    .replace('<div class="field full"><label for="pd-l">', '<div class="field full" id="pd-l-f"><label for="pd-l">')
    .replace('Online sessions get a Zoom link automatically (mock).', 'Online sessions get a Zoom link automatically (mock). Phone calls get no link — you call the learner on their registered number.');
  const send = MODAL.actions[1], fn0 = send.fn, lid = el.dataset.l;
  send.fn = () => {
    const mode = mval('#pd-m'), r = fn0(); if (r === false) return false;
    const { w, s } = csPdTarget(lid), ev = w && w.events.find(e => e.id === 'epd');
    if (mode === 'phone_call' && s) {
      delete s.zoom; s.loc = '';
      if (ev) { ev.mode = 'phone_call'; ev.loc = null; }
      if (w) { const n = w.notifs.find(x => /\(phone_call\)/.test(x.body || '')); if (n) n.body = n.body.replace('(phone_call)', '(Phone call)'); }
      render();
    } else if (ev) { delete ev.mode; ev.loc = s ? s.loc : ev.loc; }
    return r;
  };
  renderModal();
};
INP.csPdMode = el => { const f = $('#modal-root #pd-l-f'); if (f) f.style.display = el.value === 'phone_call' ? 'none' : ''; };
// Calendars (learner, Teacher/Assessor, Coordinator): a phone icon on phone PD events
function csEvFor(b, cache) {
  if (!b.dataset.b) return (W && W.events || []).find(x => x.id === b.dataset.id);
  if (!cache[b.dataset.b]) { const bt = ADMIN && ADMIN.batches.find(x => x.code === b.dataset.b); try { cache[b.dataset.b] = bt ? batchEvents(bt) : []; } catch (e) { cache[b.dataset.b] = []; } }
  return cache[b.dataset.b].find(x => x.id === b.dataset.id);
}
const csPhoneIc = () => `<span class="cs-ph" title="Phone call">${ic('phone', 12)}<span class="sr"> Phone call</span></span>`;
AFTER.push(() => {
  const evs = $$('#app .ev[data-id]'); if (!evs.length && S.route !== 'calendar') return;
  const cache = {};
  evs.forEach(b => { const e = csEvFor(b, cache); if (e && e.mode === 'phone_call' && !b.querySelector('.cs-ph')) { const i = b.querySelector('i'); if (i) i.insertAdjacentHTML('afterend', csPhoneIc()); else b.insertAdjacentHTML('afterbegin', csPhoneIc()); } });
  if (S.route === 'calendar' && W && W.events.some(e => e.mode === 'phone_call')) $$('#app .li').forEach(li => { if (li.querySelector('.lg-pd') && li.querySelector('[data-t="progress..pd"]') && !li.querySelector('.cs-ph')) { const t = li.querySelector('.li-b .strong'); if (t) t.insertAdjacentHTML('afterbegin', csPhoneIc() + ' '); } });
});
const _evPopCs = ACT.evPop;
ACT.evPop = (el, ev) => {
  _evPopCs(el, ev); const e = W.events.find(x => x.id === el.dataset.id), pop = $('.pop');
  if (e && e.mode === 'phone_call' && pop) { const s = pop.querySelector('strong'); if (s) s.insertAdjacentHTML('afterend', `<span class="small cs-phone">${ic('phone', 13)} ${CS_PHONE_TXT}</span>`); }
};
const _tasEvPopCs = ACT.tasEvPop;
ACT.tasEvPop = el => {
  _tasEvPopCs(el); const b = ADMIN.batches.find(x => x.code === el.dataset.b), e = b && batchEvents(b).find(x => x.id === el.dataset.id);
  if (MODAL && e && e.mode === 'phone_call') { MODAL.body = MODAL.body.replace('</dl>', `<dt>Mode</dt><dd><span class="cs-phone">${ic('phone', 14)} Phone call</span> — no Zoom link; call the learner on their registered number</dd></dl>`); renderModal(); }
};

/* ---------- C4: Open assessment on each module in Learning Resources ---------- */
function csAsgLinks(g) {
  if (!(W.flags.nvq && W.flags.admitted) || !g.asg || !g.asg.length) return '';
  const list = g.asg.map(asgById).filter(Boolean); if (!list.length) return '';
  if (list.length === 1) return `<button class="btn btn-sm" data-go="assignment" data-id="${list[0].id}">${ic('edit', 14)}Open assessment</button>`;
  return `<div class="cs-asg-list"><span class="xs muted">Open assessment</span>${list.map(a => `<button class="linklike small" data-go="assignment" data-id="${a.id}">${esc(a.title)}</button>`).join('')}</div>`;
}
const _resourcesCs = SCREENS.resources;
SCREENS.resources = p => {
  let h = _resourcesCs(p);
  (W.resources || []).forEach(g => { if (g.expired || g.courseId) return; const links = csAsgLinks(g), h3 = `<h3 style="padding:14px 18px 0">${esc(g.unit)}</h3>`; if (links && h.includes(h3)) h = h.replace(h3, `<div class="cs-modhead"><h3>${esc(g.unit)}</h3>${links}</div>`); });
  return h;
};

/* ---------- C5: receipt preview pop-up (Download inside; full-screen sheet on phones) ---------- */
// Only the click on an existing "Receipt" button changes — the plan cards themselves are untouched (held item 6).
const csRcpNo = iso => 'RCP-' + (26000 + Math.floor(Math.abs(new Date(iso)) / 1e7 % 9999));
function csReceipt(pl, n) {
  const dep = n === 'dep', r = dep ? null : pl.rows.find(x => String(x.n) === String(n)); if (!dep && !(r && r.receipt)) return null;
  const e = enrolById(pl.e) || {}, base = e.base || pl.title, cur = pl.cur || W.me.cur;
  const tx = (W.tx || []).filter(t => t.status === 'Succeeded').find(t => pl.e === 'nvq' ? (dep ? /deposit/i.test(t.desc) : new RegExp('instalment ' + r.n + '\\b', 'i').test(t.desc)) : (t.desc.includes(base) || t.desc.includes(pl.title)));
  return { no: dep ? csRcpNo(pl.deposit.paidAt) : r.receipt, at: (tx && tx.at) || (dep ? pl.deposit.paidAt : pl.e !== 'nvq' && e.enrolled) || r.due, payer: `${W.me.first} ${W.me.last}`, email: W.me.email,
    item: pl.title + (dep ? ' — deposit' : pl.plan === 'Instalments' ? ` — instalment ${r.n}` : ''), amount: dep ? pl.deposit.amount : r.paid, cur, method: (tx && tx.method) || 'Card', status: dep ? pl.deposit.status : r.status };
}
function csOpenReceipt(e, n) {
  const pl = (W.plans || []).find(p => p.e === e), x = pl && csReceipt(pl, n); if (!x) return false;
  openModal({ title: `Receipt ${esc(x.no)}`, sub: esc(x.item), size: 'cs-sheet', body: `<div class="cs-rcp"><dl class="cs-dl"><dt>Receipt number</dt><dd class="mono">${esc(x.no)}</dd><dt>Date</dt><dd>${fd(x.at)}</dd><dt>Payer</dt><dd>${esc(x.payer)}<br><span class="xs muted">${esc(x.email)}</span></dd><dt>Item</dt><dd>${esc(x.item)}</dd><dt>Amount</dt><dd><strong class="num">${money(x.amount, x.cur)}</strong> <span class="xs muted">${esc(x.cur)}</span></dd><dt>Method</dt><dd>${esc(x.method)}</dd><dt>Status</dt><dd>${chip(x.status)}</dd></dl>
    <p class="xs muted">Issued by Illumin Academy. Keep this receipt for your records.</p></div>`,
    actions: [{ label: 'Close' }, { label: `${ic('download', 15)} Download`, cls: 'btn-primary', fn: () => { toast(`Receipt ${esc(x.no)}.pdf downloaded (simulated).`); return false; } }] });
  return true;
}
ACT.csReceipt = el => csOpenReceipt(el.dataset.e, el.dataset.n);
function csReceiptFromLabel(f) {
  const m = /RCP-\d+/.exec(f);
  if (m) { for (const pl of W.plans || []) { const r = pl.rows.find(x => x.receipt === m[0]); if (r) return csOpenReceipt(pl.e, r.n); } return false; }
  if (/deposit/i.test(f)) { const pl = (W.plans || []).find(p => p.deposit && p.deposit.status === 'Paid'); return pl ? csOpenReceipt(pl.e, 'dep') : false; }
  return false;
}
const _fakeDlCs = ACT.fakeDl;
ACT.fakeDl = el => { const f = (el.dataset && el.dataset.f) || ''; if (S.portal === 'learner' && /^Receipt\b/.test(f) && csReceiptFromLabel(f)) return; return _fakeDlCs(el); };

/* ---------- C10: purchase history (short-course learners, Payments) ---------- */
function csPurchases() {
  return (W.plans || []).filter(p => p.e !== 'nvq').map(pl => {
    const e = enrolById(pl.e) || {}, base = e.base || pl.title, txs = (W.tx || []).filter(t => t.desc && (t.desc.includes(base) || t.desc.includes(pl.title)));
    const paid = pl.rows.filter(r => r.receipt), last = paid[paid.length - 1];
    const status = txs.some(t => t.status === 'Refunded') ? 'Refunded' : pl.rows.some(r => r.confirming) ? 'Payment Pending' : pl.rows.every(r => r.status === 'Paid') ? 'Paid' : paid.length ? 'Partially paid' : 'Pending';
    return { id: pl.e, at: e.enrolled || (pl.rows[0] || {}).due, course: pl.title, amount: pl.total, cur: pl.cur || W.me.cur, method: (txs.find(t => t.status === 'Succeeded') || txs[0] || {}).method || 'Card', status, rcp: last ? last.n : null };
  }).sort((a, b) => new Date(b.at) - new Date(a.at));
}
function csPurchaseSection() {
  const rows = csPurchases();
  return `<section class="stack cs-purch" aria-labelledby="cs-purch-h"><h2 id="cs-purch-h">Purchase history</h2>${rows.length ? dt({ id: 'cs-purch', name: 'Purchase history', rows, noExport: true, rid: r => r.id,
    cols: [{ k: 'at', l: 'Date', h: r => `<span class="nowrap">${fd(r.at)}</span>`, v: r => r.at }, { k: 'course', l: 'Course', h: r => `<strong>${esc(r.course)}</strong>` }, { k: 'amount', l: 'Amount', r: 1, h: r => `<span class="nowrap">${money(r.amount, r.cur)} <span class="xs muted">${esc(r.cur)}</span></span>`, s: r => r.amount, v: r => money(r.amount, r.cur) + ' ' + r.cur }, { k: 'method', l: 'Payment method', h: r => `<span class="small nowrap">${esc(r.method)}</span>` }, { k: 'status', l: 'Status', h: r => chip(r.status) },
      { k: 'rcp', l: 'Receipt', nosort: 1, h: r => r.rcp ? `<button class="btn btn-sm btn-ghost" data-act="csReceipt" data-e="${r.id}" data-n="${r.rcp}" aria-label="Receipt for ${esc(r.course)}">${ic('doc', 14)}Receipt</button>` : '<span class="small muted">—</span>', v: r => r.rcp ? 'Receipt' : '—' }] })
    : `<div class="card">${emptyState({ icon: 'card', title: 'No purchases yet', why: 'Courses you buy appear here with their receipts.', action: '<button class="btn btn-primary" data-go="browse">Browse Courses</button>' })}</div>`}</section>`;
}
const _paymentsCs = SCREENS.payments;
SCREENS.payments = p => {
  const h = _paymentsCs(p); if (W.flags.nvq) return h;
  const anchor = '<section class="stack"><h2>Transaction history</h2>';
  if (h.includes(anchor)) return h.replace(anchor, csPurchaseSection() + anchor);
  // Nothing bought yet: the purchase history's own empty state replaces the generic one
  const k = h.indexOf('<section class="card">'); return k < 0 ? h + csPurchaseSection() : h.slice(0, k) + csPurchaseSection();
};

/* ---------- C7 / C11 / C12: dashboard cards ---------- */
// C7 — NVQ learners: the reasons sit in "Action needed" (each once); a status badge by the greeting says
// "Needs attention" (amber) when any reason applies, otherwise "On track" (green). Never "At risk" on learner screens.
const csProjected = () => (W.nvq && W.nvq.projected) || D(84);
const csIsNvq = () => !!(W && W.flags && W.flags.nvq && W.flags.admitted);
const csOverdueAsg = () => W.assignments.filter(a => a.closed || (new Date(a.due) < now() && a.status === 'Not Started'));
const csBehind = () => !!(W.nvq && W.nvq.end && new Date(csProjected()) > new Date(W.nvq.end));
// Every C7 reason that applies (drives the badge)
function csReasons() {
  if (!csIsNvq()) return [];
  const out = [];
  if (csOverdueAsg().length) out.push('assignments');
  if (W.assignments.some(a => a.status === 'Resubmission Required' && a.resubDue && daysTo(a.resubDue) >= 0 && daysTo(a.resubDue) <= 3)) out.push('resubmission');
  if (W.payOverdue || (W.plans || []).some(pl => pl.rows.some(r => r.status === 'Overdue'))) out.push('payment');
  if (csBehind()) out.push('schedule');
  if (csExpiring().length) out.push('certificate');
  return out;
}
// Action needed already lists every resubmission ("Resubmission required: …") and every overdue instalment
// ("Pay instalment N — overdue …"); only the three reasons it doesn't cover are added, once each.
const _actionItemsC7 = actionItems;
actionItems = function () {
  const out = _actionItemsC7.apply(this, arguments); if (!csIsNvq()) return out;
  const od = csOverdueAsg();
  if (od.length) out.push({ sev: 'red', t: `${plural(od.length, 'assignment')} overdue`, d: esc(od.map(a => a.title).join(', ')) + ' — deadline passed', btn: 'View', go: 'assignments', cs: 'assignments' });
  if (csBehind()) out.push({ sev: 'amber', t: 'Behind schedule for your end date', d: `Projected completion ${fd(csProjected())} · programme ends ${fd(W.nvq.end)}`, btn: 'View progress', go: 'progress', cs: 'schedule' });
  csExpiring().forEach(c => out.push({ sev: 'amber', t: `Certificate expires in ${plural(daysTo(c.expires), 'day')}`, d: `${esc(c.course)} · valid until ${fd(c.expires)}`, btn: 'View', go: 'certificates', cs: 'certificate' }));
  return out;
};
function csStatusBadge() {
  const on = csReasons().length > 0, l = on ? 'Needs attention' : 'On track';
  return `<button class="cs-status chip t-${on ? 'amber' : 'green'}" data-act="csToActions" data-s="${on ? 'attn' : 'ok'}" aria-label="${l} — go to Action needed"><span class="chip-i" aria-hidden="true">${on ? '!' : '✓'}</span>${l}</button>`;
}
ACT.csToActions = () => { const p = $('#app .action-panel'); if (p) { p.scrollIntoView({ block: 'start' }); const h = p.querySelector('#ap-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } else toast('Nothing needs action right now.', 'info'); };
// C11 — short-course learners: Account, Tasks, Courses
function csShortCards() {
  const en = W.enrolments.filter(e => e.kind === 'short');
  const acct = S.edge === 'unverified' || W.me.pendingVerification ? 'Pending verification' : 'Active';
  const quizzes = en.filter(e => e.status === 'Active').flatMap(e => (e.modules || []).filter(m => !shPassed(m) && m.quiz.max - m.quiz.attempts.length > 0).map(m => ({ id: e.id, m })));
  const inProg = en.filter(e => e.status === 'Active'), done = en.filter(e => e.status === 'Completed'), exp = en.filter(e => e.status === 'Expired-Incomplete');
  const first = quizzes[0] ? [quizzes[0].id, 'quiz'] : inProg[0] ? [inProg[0].id, 'content'] : null;
  const tasks = [quizzes.length && `${plural(quizzes.length, 'module quiz', 'module quizzes')} to complete`, inProg.length && `${plural(inProg.length, 'course')} in progress`].filter(Boolean);
  const n = (k, v) => `<div class="cs-kv"><span class="cs-n num">${v}</span><span class="xs muted">${k}</span></div>`;
  return `<section class="cs-cards" aria-label="Your summary">
    <article class="card cs-card" data-cs="account"><h2 class="small muted">Account</h2><div>${chip(acct, acct === 'Active' ? 'green' : 'amber')}</div><p class="xs muted">${acct === 'Active' ? 'Your email is verified.' : 'Check your inbox to verify your email.'}</p></article>
    <article class="card cs-card" data-cs="tasks"><h2 class="small muted">Tasks</h2><p class="strong">${tasks.length ? tasks.map(esc).join(' · ') : 'Nothing to do right now'}</p>${first ? `<div><button class="btn btn-sm btn-primary" data-go="course" data-id="${first[0]}" data-tab="${first[1]}">${first[1] === 'quiz' ? 'Go to quiz' : 'Continue course'}</button></div>` : ''}</article>
    <article class="card cs-card" data-cs="courses"><h2 class="small muted">Courses</h2><div class="cs-kvs">${n('In progress', inProg.length)}${n('Completed', done.length)}${n('Expired', exp.length)}</div><div><button class="btn btn-sm" data-go="courses">My Courses</button></div></article></section>`;
}
const _dashCs = SCREENS.dashboard;
SCREENS.dashboard = p => {
  let h = _dashCs(p); const f = W.flags;
  // C7: status badge next to the greeting
  if (csIsNvq()) h = h.replace(/(<div class="hello">[\s\S]*?)(<h1>[\s\S]*?<\/h1>)/, (m, a, h1) => `${a}<div class="cs-hello-h">${h1}${csStatusBadge()}</div>`);
  const add = f.nvq ? '' : csShortCards() + csExpiryCards('dash');
  if (!add) return h;
  const i = h.indexOf('<div class="hello">'), j = i < 0 ? -1 : h.indexOf('</div>', i);
  return j < 0 ? add + h : h.slice(0, j + 6) + add + h.slice(j + 6);
};
// The Progress projection reads the same value C7 uses, so the two screens can't disagree
const _progressCs = SCREENS.progress;
SCREENS.progress = p => {
  const h = _progressCs(p); if (!W.nvq || !W.nvq.projected) return h;
  const late = new Date(W.nvq.projected) > new Date(W.nvq.end);
  return h.replace(`Projected completion: <strong>${fd(D(84))}</strong> vs programme end <strong>${fd(W.nvq.end)}</strong> — on track`, `Projected completion: <strong>${fd(W.nvq.projected)}</strong> vs programme end <strong>${fd(W.nvq.end)}</strong> — ${late ? 'behind schedule' : 'on track'}`);
};

/* ---------- C8: document preview (applicant, Admission & Documents) ---------- */
const csDocBtn = (d, f) => `<button class="linklike mono cs-file" data-act="csDoc" data-id="${d.id}" data-f="${esc(f)}" aria-label="Preview ${esc(f)}">${esc(f)}</button>`;
const _docCardCs = docCard;
docCard = function (d, ro) {
  let h = _docCardCs(d, ro); if (S.portal !== 'learner' || !d.file || ui('upl-' + d.id)) return h;
  if (['Submitted', 'Approved'].includes(d.status)) h = h.replace(`<span class="mono">${esc(d.file)}</span>`, csDocBtn(d, d.file));
  else if (['Rejected', 'Resubmission Required'].includes(d.status)) h = h.replace('<div class="reason', `<p class="small">${ic('doc', 14)} ${csDocBtn(d, d.file)}${d.uploaded ? `<br><span class="muted">Uploaded ${fdt(d.uploaded)}</span>` : ''}</p><div class="reason`);
  (d.versions || []).forEach(v => { h = h.replace(`<li class="li" style="padding:6px 0"><span class="mono">${esc(v[0])}</span>`, `<li class="li" style="padding:6px 0">${csDocBtn(d, v[0])}`); });
  return h;
};
ACT.csDoc = el => {
  const d = (W.docs || []).find(x => x.id === el.dataset.id); if (!d) return;
  const f = el.dataset.f || d.file, ext = (f.split('.').pop() || '').toLowerCase(), ver = (d.versions || []).find(v => v[0] === f);
  const size = f === d.file && d.size ? d.size : csSize(f), at = (ver && ver[1]) || d.uploaded, st = f === d.file ? d.status : (ver ? ver[2] : d.status);
  const view = ext === 'pdf' ? `<div class="cs-docview pdf" role="img" aria-label="Preview of ${esc(f)} (mock)"><strong class="small">${esc(d.name)}</strong>${'<i></i>'.repeat(9)}<span class="xs muted">Page 1 of 1 · mock preview</span></div>`
    : ['jpg', 'jpeg', 'png'].includes(ext) ? `<div class="cs-docview img" role="img" aria-label="Preview of ${esc(f)} (mock)">${ic('eye', 48)}<span class="xs muted">${esc(f)} · mock preview</span></div>`
    : `<div class="card flat">${emptyState({ icon: 'doc', title: 'No preview for this file type', why: 'Download the file to open it.' })}</div>`;
  openModal({ title: esc(f), sub: `${esc(d.name)} · ${esc(st)}`, size: 'lg cs-sheet', body: `${view}<dl class="cs-dl small"><dt>File name</dt><dd class="mono">${esc(f)}</dd><dt>Size</dt><dd>${size}</dd><dt>Uploaded</dt><dd>${at ? fdt(at) : '—'}</dd><dt>Status</dt><dd>${chip(st)}</dd></dl>`,
    actions: [{ label: 'Close' }, { label: `${ic('download', 15)} Download`, cls: 'btn-primary', fn: () => { toast(`${esc(f)} downloaded (simulated).`); return false; } }] });
};

/* ---------- C14: quiz tab heading — now "What is this module about?" in every module quiz (CH-16, CH-28; set in screens-a.js) ---------- */

/* ---------- C15: My Students — Discontinued hidden by default, "Show discontinued" (remembered this session) ---------- */
const _tStudentsCs = SCREENS['t-students'];
SCREENS['t-students'] = p => {
  if (p && p.id) return _tStudentsCs(p);
  const show = !!ui('csShowDisc', false), tl = tasLearners, d0 = dt;
  if (!show) {
    tasLearners = function (all) { const r = tl.apply(this, arguments); return all ? r : r.filter(l => l.status !== 'Discontinued'); };
    dt = function (cfg) { if (cfg && cfg.id === 'tstud') cfg = { ...cfg, filters: (cfg.filters || []).map(f => f.opts ? { ...f, opts: f.opts.filter(o => o !== 'Discontinued') } : f) }; return d0.call(this, cfg); };
  }
  let h; try { h = _tStudentsCs(p); } finally { tasLearners = tl; dt = d0; }
  const box = `<label class="check cs-disc"><input type="checkbox" data-onchange="csShowDisc" ${show ? 'checked' : ''}> Show discontinued</label>`;
  return h.replace('<div class="seg" role="group" aria-label="View">', box + '<div class="seg" role="group" aria-label="View">');
};
INP.csShowDisc = el => {
  setUi('csShowDisc', el.checked);
  const st = S.ui['dt-tstud']; if (!el.checked && st && st.f) ['s', 'f'].forEach(k => { if (st.f[k] === 'Discontinued') st.f[k] = ''; });
  render();
};

/* ---------- Demo Scenario #18 ---------- */
const _scListCs = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  return _scListCs().concat([['18', 'Client sheet items', 'Client suggestion sheet — C1, C2, C7, C10, C15', [
    s('Learner opens an NVQ assignment: evidence requirements under each question and "Download criteria (PDF)" at the top (C1).', 'learner:C', 'assignment.a3'),
    s('Certificates are one list, Valid → Expiring soon → Expired → Revoked, with a yellow "expires in N days" card and Renew (C2).', 'learner:A', 'certificates'),
    s('NVQ learner dashboard: "Needs attention" badge by the greeting; Action needed lists the overdue assignment, overdue instalment and expiring certificate once each (C7).', 'learner:C', 'dashboard'),
    s('Short-course learner\'s Payments: Purchase history, newest first; each receipt opens a preview pop-up (C10, C5).', 'learner:A', 'payments'),
    s('Assessor\'s My Students hides the discontinued learner; tick "Show discontinued" to see them greyed out (C15).', 'staff', 't-students')]]]);
};
const _scPageCs = SCREENS['demo-scenarios'];
SCREENS['demo-scenarios'] = p => _scPageCs(p).replace('Seventeen end-to-end walkthroughs.', 'Eighteen end-to-end walkthroughs.');
AFTER.push(() => { const b = document.querySelector('#demo-root .demo-panel [data-act="scOpen"]'); if (b && b.textContent === 'Open the 17 Demo Scenarios') b.textContent = 'Open the 18 Demo Scenarios'; });

/* ---------- Screen index: new pop-ups and dashboard cards (each with its purpose line) ---------- */
Object.assign(MODALS, {
  csCrit: ['C', 'assignment.a3', () => ACT.csCritPdf({ dataset: { id: 'a3' } })],
  csReceipt: ['C', 'payments', () => ACT.csReceipt({ dataset: { e: 'nvq', n: '3' } })],
  csDoc: ['B', 'admission', () => ACT.csDoc({ dataset: { id: 'd5' } })],
});
const csIdxLi = (label, o, purpose) => `<li><button class="linklike" data-act="jump" ${Object.entries(o).map(([k, v]) => `data-${k}="${v}"`).join(' ')}>${label}</button><span class="idx-purpose xs muted" data-pk="entry">${esc(purpose)}</span></li>`;
const _idxCs = SCREENS.index;
SCREENS.index = p => _idxCs(p).replace('Demo Scenarios — 17 walkthroughs', 'Demo Scenarios — 18 walkthroughs') + `<section class="card idx-sec"><h2>Client suggestion sheet</h2><ul class="idx-list">${[
  csIdxLi('Criteria PDF preview (assignment)', { m: 'csCrit' }, 'C1 — every question with its criteria and evidence requirements, as downloaded.'),
  csIdxLi('Certificates — one sorted list + expiry reminder cards', { v: 'A', r: 'certificates' }, 'C2 — Valid to Revoked in one list, status filter, Renew on expiring certificates.'),
  csIdxLi('PD session by phone (learner)', { v: 'D', r: 'progress..pd' }, 'C3 — the assessor calls the registered number; no Zoom link.'),
  csIdxLi('Resources — Open assessment per module', { v: 'C', r: 'resources' }, 'C4 — jump from a module\'s materials to its assignment.'),
  csIdxLi('Receipt preview pop-up', { m: 'csReceipt' }, 'C5 — receipt details with Download; full-screen sheet on phones.'),
  csIdxLi('Dashboard — Needs attention / On track badge (NVQ)', { v: 'C', r: 'dashboard' }, 'C7 — status by the greeting; its reasons are in Action needed, each once.'),
  csIdxLi('Document preview pop-up (applicant)', { m: 'csDoc' }, 'C8 — PDF and image previews; other files show name, size, date and Download.'),
  csIdxLi('Payments — Purchase history (short course)', { v: 'A', r: 'payments' }, 'C10 — every purchase newest first, with its receipt.'),
  csIdxLi('Dashboard — Account, Tasks, Courses and expiring certificate cards', { v: 'A', r: 'dashboard' }, 'C11, C12 — the short-course learner\'s summary at a glance.'),
  csIdxLi('Quiz tab — "What is this module about?"', { v: 'A', r: 'course.mh26.quiz' }, 'C14, CH-28 — each module quiz\'s heading, with the instructions kept below it.')].join('')}</ul></section>`;
const _tIdxCs = SCREENS['t-index'];
SCREENS['t-index'] = p => _tIdxCs(p) + `<section class="card idx-sec"><h2>Client suggestion sheet</h2><ul class="idx-list">${[
  ['My Students — Show discontinued', 't-students', 'C15 — discontinued learners hidden until you tick the box.'],
  ...(hasRole('Assessor') ? [['Professional Discussions — Phone call mode', 't-pd', 'C3 — propose a PD by phone; no Zoom link is created.']] : []),
  ['Calendar — phone PD events', 't-calendar', 'C3 — phone sessions show a phone icon.']].map(([l, t, pu]) => `<li><button class="linklike" data-act="goTok" data-t="${t}">${l}</button><span class="idx-purpose xs muted" data-pk="entry">${esc(pu)}</span></li>`).join('')}</ul></section>`;

/* ---------- Records ---------- */
UXC.push(['Client sheet', 'Client suggestion sheet', [
  'C1: "Download criteria (PDF)" at the top of every NVQ assignment page (title, programme, unit/module, every question with its criteria: code, descriptor, assessment type, evidence requirements); evidence requirements now shown under each question and each linked criterion.',
  'C2: Certificates are one list sorted Valid → Expiring soon → Expired → Revoked (Processing last), with a Status filter; a yellow "[Course] certificate expires in N days" card with Renew per expiring certificate (max 3, then "+N more"). Preview and download unchanged.',
  'C3: "Phone call" is a third PD mode (stored as phone_call). The Assessor can propose it; the learner sees "Phone call — your assessor will call you on your registered number"; no Zoom link is created; calendar events show a phone icon.',
  'C4: Learning Resources — each NVQ module has "Open assessment" (its assignment page); hidden when the module has no assignment; a short list when it has several.',
  'C5: Payments — a receipt opens a preview pop-up (number, date, payer, item, amount and currency, method, status) with Download inside; a full-screen sheet on phones.',
  'C7: NVQ learner dashboard — a status badge next to the greeting: "Needs attention" (amber) when a reason applies (assignments overdue, resubmission due in 3 days or fewer, payment overdue, behind schedule for the end date, certificate expiring), otherwise "On track" (green); it scrolls to Action needed. The reasons are items in Action needed, each once: "N assignments overdue", "Behind schedule for your end date" and "Certificate expires in N days" were added; resubmissions and overdue instalments were already listed. No separate card. Staff labels unchanged.',
  'C8: Admission & Documents — an uploaded file (and each file in the version history) opens a preview pop-up: PDFs and images render (mock), other types show name, size, upload date and Download. Submitted, Approved, Rejected and Resubmission Required.',
  'C10: Short-course Payments — "Purchase history" (date, course, amount and currency, payment method, status, receipt → C5 pop-up), newest first, shared table on desktop and cards on phones; empty state "No purchases yet" with Browse Courses.',
  'C11: Short-course dashboard — Account (Active / Pending verification), Tasks (quizzes to complete, courses in progress → first task) and Courses (in progress, completed, expired → My Courses) cards.',
  'C12: Short-course dashboard — "[Course] — expires in N days" card with Renew (re-purchase); same data and threshold as C2; hidden when nothing is expiring.',
  'C14: Course quiz tab heading "Course quiz" → "What is this course about?"; the instructions line below it is unchanged.',
  'C15: Teacher / Assessor My Students — Discontinued learners hidden by default; "Show discontinued" tick-box brings them back greyed out with the Discontinued chip; counts and filters follow it; remembered for the session.',
  'Held pending client (not built): 6 payment dial, cards and observation fee · 9 paying during document review / bank transfer · 13 a quiz in every module.']]);
CDL_SCEN.push(['18', 'Client sheet items', 'Client-defined (client suggestion sheet)']);
const _cdLogCs = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogCs(p).replace('All 17 run end to end in the prototype.', 'All 18 run end to end in the prototype.') +`<section class="card"><h2>Client suggestion sheet</h2>${recTbl(['Item', 'Decision', 'Status', 'What it means in the prototype'], [['Client suggestion sheet',
  'Built: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15. Held pending client: 6 (observation fee), 9 (pay during review), 13 (module quizzes).',
  chip('Applied', 'green') + ' ' + chip('3 held', 'amber'),
  esc('The 12 agreed items are in the prototype (see the UX Changelog, "Client suggestion sheet"). Items 6, 9 and 13 are unchanged until the client decides. Demo Scenario #18 walks through C1, C2, C7, C10 and C15.')]])}</section>`;
