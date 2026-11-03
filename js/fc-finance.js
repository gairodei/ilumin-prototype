/* ============================================================
   Batch FC — Finance client feedback corrections (1 Nov 2026; PD-FC-* in PROVISIONAL-DECISIONS.md). Loads last.
   1. Deposit credit. Confirmed decision: a deposit is paid in full (never in part) and, once confirmed, is credited toward the first
      scheduled instalment. The deposit route (PD-E1-05) already schedules its one payment after the deposit (fee − deposit), so the
      learner never pays the deposit plus the whole first payment. The shared ledger's "gross" basis (FP-A: instalments worked out from
      the full fee, the paid deposit credited to the earliest unpaid instalment, once, reversed on refund) is the model for a deposit
      followed by instalments. The confirmed deposit is credited to instalment 1 only (PD-FC-12); a refund takes the credit back.
      Deposit, then the approved instalments, is a real sign-up route (PD-FC-11, below): instalment 1 is settled within the seat hold
      to secure the seat; later instalments follow their dates.
   2. Deposit View (Finance → Deposits, Reports → Deposits): configured deposit, date and amount received, confirmation, the amount
      credited to the first payment and what remains of it, refund / Finance review — from the payment record.
   3. Course and batch filters on every financial report that can be tied to a programme or course: one read model (fcTxMeta) gives
      each payment its course type, programme / course ID and batch code. A learner payment keeps the batch it was made in
      (STORE.fcStamp), so a later move doesn't re-file it. Agency bundles, observation-fee-free agency revenue and worklists are
      exceptions (see FC_EXC).
   4. Transaction Ledger: course type, course and batch on every row; bank transfers awaiting confirmation are listed (not counted);
      the footer gives received / refunded / net / pending. Browser persistence (prototype only): the whole demo data set is saved in
      this browser's localStorage after every change and restored on reload — never a part of it (FCP below).
   5. Short-course payments: Course type filter, search by learner or course, coursewise report by course.
   ============================================================ */
'use strict';

/* ---------- Course type, programme / course and batch of every financial record ---------- */
const FC_NB = '__none__'; // "Not batch-specific"
const FC_TYPES = ['NVQ programme', 'Short course', 'Observation fee', 'Agency bundle', 'Other'];
const fcProgByTitle = t => { const m = (ADMIN.programmes || []).filter(p => p.title === t); return m.length === 1 ? m[0] : null; };
const fcShortByTitle = t => { const s = String(t || ''); return (ADMIN.courses || []).find(c => s === c.title || s.startsWith(c.title + ' ')) || CATALOGUE.find(c => c.kind === 'short' && (s === c.title || s.startsWith(c.title + ' '))) || null; };
const fcBatchByLabel = s => { const t = String(s || '').trim(); if (!t) return null; const b = (ADMIN.batches || []).find(x => x.code === t || x.label === t || chBatchLbl(x) === t); return b ? b.code : null; };
// A learner's NVQ programme and batch (now)
function fcNvqMeta(w) {
  const pr = chProgOf(w), title = (w.nvq && w.nvq.title) || pr.title || '';
  return { ctype: 'NVQ programme', cid: pr.id || 'T:' + title, clabel: title, bk: chBatchCodeOfW(w) || (w.signup && w.signup.releasedFrom) || null }; // a released seat's payments stay with its batch
}
function fcShortMeta(title) { const c = fcShortByTitle(title), base = c ? c.title : String(title || '').split(' — ')[0]; return { ctype: 'Short course', cid: 'SC:' + (c && c.id ? c.id : base), clabel: base, bk: null }; }
// One plan of a learner's record
function fcPlanMeta(w, pl) {
  if (!pl || pl.e === 'nvq') return fcNvqMeta(w);
  const en = (w.enrolments || []).find(e => e.id === pl.e);
  return en && en.kind === 'nvq' ? fcNvqMeta(w) : fcShortMeta((en && (en.base || en.title)) || pl.title);
}
// A payment's meta; learner payments keep the batch they were made in (first seen = when made: stamped on every render)
const fcStamps = () => (STORE.fcStamp = STORE.fcStamp || {});
function fcRawMeta(t) {
  const d = String(t.course || t.desc || ''), w = t.v && STORE.worlds[t.v];
  if (/^Observation fee/i.test(d) || (t.ref && chFees().some(f => f.ref === t.ref))) {
    const f = chFees().find(x => x.ref && x.ref === t.ref), fw = w || (f && fiWOf(f.lid)), pid = (f && (f.pid || chFeePid(f.lid, f.course))) || (fw && chProgOf(fw).id);
    const title = (f && f.course) || d.replace(/^Observation fee — /i, '');
    return { ctype: 'Observation fee', cid: pid || 'T:' + title, clabel: title, bk: fw ? chBatchCodeOfW(fw) || null : null };
  }
  if (w) {
    const ps = (w.plans || []).concat(w.plansHist || []), pl = ps.find(p => p.title && d.includes(p.title)) || (/\bNVQ\b|deposit|instalment|balance/i.test(d) ? ps.find(p => p.e === 'nvq') : null);
    if (pl) return fcPlanMeta(w, pl);
    const en = (w.enrolments || []).find(e => d.startsWith(e.base || e.title));
    if (en) return en.kind === 'nvq' ? fcNvqMeta(w) : fcShortMeta(en.base || en.title);
    return w.nvq && w.flags && w.flags.nvq ? fcNvqMeta(w) : { ctype: 'Other', cid: 'X:' + d, clabel: d || '—', bk: null };
  }
  if (t.payerType === 'Agency') return { ctype: 'Agency bundle', cid: 'BUNDLE', clabel: 'Agency bundles', bk: null };
  const title = d.split(' — ')[0].replace(/ \((duplicate|part)\)$/, ''), pr = fcProgByTitle(title) || (ADMIN.programmes || []).find(p => d.startsWith(p.title));
  if (pr) return { ctype: 'NVQ programme', cid: pr.id, clabel: pr.title, bk: fcBatchByLabel(t.batch) };
  if (fcShortByTitle(title) || /(?:^| )(Certificate|Awareness|Support|Safety|Handling|Hygiene|Training)\b/.test(title)) return fcShortMeta(title);
  return { ctype: 'Other', cid: 'X:' + title, clabel: title || '—', bk: null };
}
function fcTxMeta(t) {
  if (!t) return { ctype: 'Other', cid: '', clabel: '—', bk: null };
  if (t.refund) { const o = allTx().find(x => !x.refund && x.ref === fiOrigOf(t) && x.payer === t.payer); if (o) return fcTxMeta(o); }
  const m = fcRawMeta(t);
  if (t.v && t.ref && m.ctype !== 'Agency bundle') { const s = fcStamps(), k = t.v + '|' + t.ref; if (!(k in s)) s[k] = m.bk || null; return { ...m, bk: s[k] }; }
  return m;
}
// A fresh data set starts with no stamps (initStore keeps STORE keys it doesn't set itself)
const _isFC = initStore; initStore = function () { delete STORE.fcStamp; return _isFC.apply(this, arguments); };
// Stamp every learner payment with the batch it was made in (each render: a payment is stamped by the render after it is made)
function fcStampAll() {
  if (typeof STORE === 'undefined' || !STORE.worlds || !ADMIN) return;
  try { const s = fcStamps(); learnerAccounts().forEach(v => (STORE.worlds[v].tx || []).forEach(t => { if (t.ref && !((v + '|' + t.ref) in s) && !(t.amount < 0)) fcTxMeta({ ...t, v, course: t.desc, payer: VNAME(v) }); })); } catch (e) { /* never block a render */ }
}

/* ---------- Filter state: course (stable ID), batch (code) and course type, per screen ---------- */
const fcF = sc => ({ cid: ui('fcC-' + sc, ''), bk: ui('fcB-' + sc, ''), ct: ui('fcT-' + sc, '') });
const fcMatch = (m, F) => !!m && (!F.cid || m.cid === F.cid) && (!F.bk || (F.bk === FC_NB ? !m.bk : m.bk === F.bk)) && (!F.ct || m.ctype === F.ct);
const fcAny = F => !!(F.cid || F.bk || F.ct);
const fcProgOfBatch = b => (typeof acProgOf === 'function' ? acProgOf(b) : ((fcProgByTitle(b.course) || {}).id || b.course));
// Course options: every programme and short course on record, plus anything only the payments name
function fcCourseOpts(extra = []) {
  const o = new Map();
  (ADMIN.programmes || []).forEach(p => o.set(p.id, { cid: p.id, ctype: 'NVQ programme', l: `${p.title} (${p.id})` }));
  (ADMIN.courses || []).forEach(c => o.set('SC:' + c.id, { cid: 'SC:' + c.id, ctype: 'Short course', l: c.title }));
  extra.forEach(m => { if (m && m.cid && !o.has(m.cid)) o.set(m.cid, { cid: m.cid, ctype: m.ctype, l: m.clabel + (m.ctype === 'NVQ programme' && !/^T:/.test(m.cid) ? ` (${m.cid})` : '') }); });
  return [...o.values()];
}
const fcCLabel = cid => { const x = fcCourseOpts(fcKnownMeta()).find(o => o.cid === cid); return x ? x.l : cid; };
const fcBLabel = bk => bk === FC_NB ? 'Not batch-specific' : (b => b ? chBatchLbl(b) : bk)(chBatch(bk));
function fcKnownMeta() { const xs = []; try { allTx().forEach(t => xs.push(fcTxMeta(t))); } catch (e) { /* none */ } return xs; }
function fcBatchOpts(cid) {
  const opt = fcCourseOpts(fcKnownMeta()).find(o => o.cid === cid);
  if (cid && opt && opt.ctype !== 'NVQ programme' && opt.ctype !== 'Observation fee') return []; // short courses and bundles have no batch
  return (ADMIN.batches || []).filter(b => !b.short && (!cid || fcProgOfBatch(b) === cid)).map(b => ({ bk: b.code, l: chBatchLbl(b) + (cid ? '' : ' · ' + b.course) }));
}
const fcFTxt = F => [F.ct && 'type: ' + F.ct, F.cid && 'course: ' + fcCLabel(F.cid), F.bk && 'batch: ' + fcBLabel(F.bk)].filter(Boolean).join(' · ');
// The bar: Course (narrows Batch), Batch (with "Not batch-specific"), and optionally Course type
function fcBar(sc, { types = false, batch = true } = {}) {
  const F = fcF(sc), cs = fcCourseOpts(fcKnownMeta()).filter(o => !F.ct || o.ctype === F.ct), bs = fcBatchOpts(F.cid);
  const grp = t => { const xs = cs.filter(o => o.ctype === t); return xs.length ? `<optgroup label="${esc(t === 'NVQ programme' ? 'NVQ programmes' : t === 'Short course' ? 'Short courses' : t)}">${xs.map(o => `<option value="${esc(o.cid)}" ${o.cid === F.cid ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</optgroup>` : ''; };
  return `<div class="row fc-bar" role="group" aria-label="Course and batch filters">${types ? `<select class="select dt-sel" id="fcT-${sc}" aria-label="Course type" data-onchange="fcT" data-sc="${sc}"><option value="">All course types</option>${FC_TYPES.map(t => `<option ${t === F.ct ? 'selected' : ''}>${t}</option>`).join('')}</select>` : ''}
    <select class="select dt-sel" id="fcC-${sc}" aria-label="Course or programme" data-onchange="fcC" data-sc="${sc}"><option value="">All courses</option>${FC_TYPES.map(grp).join('')}</select>
    ${batch ? `<select class="select dt-sel" id="fcB-${sc}" aria-label="Batch" data-onchange="fcB" data-sc="${sc}"><option value="">All batches</option>${bs.map(b => `<option value="${esc(b.bk)}" ${b.bk === F.bk ? 'selected' : ''}>${esc(b.l)}</option>`).join('')}<option value="${FC_NB}" ${F.bk === FC_NB ? 'selected' : ''}>Not batch-specific</option></select>` : ''}
    ${fcAny(F) ? `<button class="linklike small" data-act="fcClr" data-sc="${sc}">Clear course filters</button>` : ''}</div>`;
}
const fcReset = sc => { const s = S.ui; ['fcC-', 'fcB-', 'fcT-'].forEach(k => delete s[k + sc]); };
INP.fcC = el => { const sc = el.dataset.sc; setUi('fcC-' + sc, el.value); const bk = ui('fcB-' + sc, ''); if (bk && bk !== FC_NB && !fcBatchOpts(el.value).some(b => b.bk === bk)) setUi('fcB-' + sc, ''); fcPage(); render(); };
INP.fcB = el => { setUi('fcB-' + el.dataset.sc, el.value); fcPage(); render(); };
INP.fcT = el => { const sc = el.dataset.sc; setUi('fcT-' + sc, el.value); const c = ui('fcC-' + sc, ''); if (c && el.value && !fcCourseOpts(fcKnownMeta()).some(o => o.cid === c && o.ctype === el.value)) { setUi('fcC-' + sc, ''); setUi('fcB-' + sc, ''); } fcPage(); render(); };
ACT.fcClr = el => { fcReset(el.dataset.sc); fcPage(); render(); };
const fcPage = () => Object.keys(S.ui).filter(k => k.startsWith('dt-')).forEach(k => { if (S.ui[k]) S.ui[k].page = 0; }); // a narrower list starts at page 1

/* ---------- The ledger read model, with course type, course and batch (replaces FI-2's fiLedger) ---------- */
fiLedger = function (f = {}) {
  const all = allTx(), byKey = new Map(); all.filter(t => !t.refund).forEach(t => byKey.set(t.ref + '|' + t.payer, t));
  const withRow = new Set(all.filter(t => t.refund).map(t => fiOrigOf(t) + '|' + t.payer));
  const cut = f.days ? now().getTime() - f.days * DAY : -Infinity, ev = [];
  all.forEach(t => {
    const src = t.refund ? byKey.get(fiOrigOf(t) + '|' + t.payer) || t : t, m = fcTxMeta(src);
    const base = { at: t.at, ref: t.ref, payer: t.payer, payerType: t.payerType || 'Learner', mode: fiModeOf(src), course: fiCourseOf(src), p: fpP(t.amount), v: src.v || null, ctype: m.ctype, cid: m.cid, clabel: m.clabel, bk: m.bk };
    if (t.refund) ev.push({ ...base, kind: 'refund' });
    else if (['Paid', 'Refunded', 'Partially refunded'].includes(t.status)) {
      ev.push({ ...base, kind: 'receipt' });
      if (t.status !== 'Paid' && !withRow.has(t.ref + '|' + t.payer)) { const q = fiSum(fiRefunds(t.ref, t.payer).filter(fiRefDone)), p = q || (t.status === 'Refunded' ? fpP(t.amount) : 0); if (p) ev.push({ ...base, kind: 'refund', p, implied: true }); else ev.push({ ...base, kind: 'unknown-refund', p: 0 }); }
    } else if (t.status === 'Pending') ev.push({ ...base, kind: 'pending' });
  });
  const rows = ev.filter(e => new Date(e.at).getTime() >= cut && (!f.course || e.course === f.course) && (!f.agency || (e.payerType === 'Agency' && e.payer === f.agency)) && (!f.mode || e.mode === f.mode) && fcMatch(e, f));
  const sum = k => rows.filter(e => e.kind === k).reduce((s, e) => s + e.p, 0);
  return { rows, received: sum('receipt'), refunded: sum('refund'), pending: sum('pending'), net: sum('receipt') - sum('refund'), unknown: rows.filter(e => e.kind === 'unknown-refund').length };
};
// What is owed, with the same keys
const _obFC = fiObligations;
fiObligations = function () {
  const out = _obFC.apply(this, arguments);
  return out.map(o => {
    const w = o.v && STORE.worlds[o.v], pl = w && fiLive(w).find(p => p.title === o.course);
    const m = pl ? fcPlanMeta(w, pl) : (() => { const so = ((STORE.fin && STORE.fin.od) || []).find(x => x.lid === o.lid && x.course === o.course); return { ...fcRawMeta({ course: o.course, batch: so && so.batch }), bk: so ? fcBatchByLabel(so.batch) : null }; })();
    return { ...o, ...m };
  });
};
// Overdue rows (one helper for every screen that lists them)
const fcOdMeta = o => { const w = o.v && STORE.worlds[o.v]; if (w && o.pl) return fcPlanMeta(w, o.pl); if (w) return fcNvqMeta(w); const m = fcRawMeta({ course: o.course }); return { ...m, bk: fcBatchByLabel(o.batch) || (() => { const lw = fiWOf(o.lid); return lw ? chBatchCodeOfW(lw) || null : null; })() }; };
const fcAw = () => fiAwaiting().map(x => { const w = x.wv ? STORE.worlds[x.wv] : x.v ? STORE.worlds[x.v] : fiWOf(x.lid); const m = x.fee ? fcRawMeta({ course: 'Observation fee — ' + x.course, ref: '', v: w && w.v }) : w ? fcPlanMeta(w, (w.plans || []).find(p => p.e === (x.e || x.ek || 'nvq'))) : fcRawMeta({ course: x.course }); return { ...x, ...m, w }; });

/* ---------- Finance Reports: every tab that can be tied to a course reads the filters ---------- */
const FC_EXC = {
  agency: 'Agency revenue is bundle purchases: a bundle covers several courses and its seats aren\'t tied to a batch, so it can\'t be split by course or batch. Filter by agency instead.',
  waivers: '',
  history: 'Export history lists exports, not money — the filters used are recorded in each export\'s name.',
};
const fcRepF = () => ({ days: +ui('frRange', '180'), agency: ui('frAgency', ''), mode: ui('frMode', ''), ...fcF('fr') });
const fcRepFTxt = f => [`last ${f.days} days`, fcFTxt(f), f.agency && 'agency: ' + f.agency, f.mode && 'method: ' + f.mode].filter(Boolean).join(' · ');
fiRepFilters = function (t) {
  const f = fcRepF(), ag = (ADMIN.agencies || []).map(a => a.name), courseTab = !['agency', 'history'].includes(t);
  const sel = (id, lbl, all, opts, v) => `<select class="select dt-sel" aria-label="${lbl}" data-onchange="${id}"><option value="">${all}</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const dated = ['datewise', 'coursewise'].includes(t);
  return `<div class="row">${dated ? `<select class="select dt-sel" aria-label="Date range" data-onchange="frRange">${[['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months']].map(([v, l]) => `<option value="${v}" ${String(f.days) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}${courseTab ? fcBar('fr', { types: true }) : ''}${dated || t === 'agency' ? sel('frAgency', 'Agency', 'All agencies', ag, f.agency) : ''}${dated ? sel('frMode', 'Payment method', 'All methods', FI_MODES, f.mode) : ''}<span class="spacer"></span>${exportMenu(`Finance report — ${t} (${dated ? fcRepFTxt(f) : fcFTxt(f) || 'all courses and batches'})`)}</div>${FC_EXC[t] ? `<p class="xs muted fc-exc">${ic('info', 12)} ${esc(FC_EXC[t])}</p>` : ''}`;
};
fiRepDatewise = function (f = fcRepF(), grp = ui('frGrp', 'month')) {
  const L = fiLedger(f), key = e => grp === 'day' ? e.at.slice(0, 10) : grp === 'week' ? kMon(e.at.slice(0, 10)) : e.at.slice(0, 7);
  const groups = [...new Set(L.rows.filter(e => e.kind === 'receipt' || e.kind === 'refund').map(key))].sort().reverse();
  const gs = (g, k) => L.rows.filter(e => key(e) === g && e.kind === k).reduce((s, e) => s + e.p, 0);
  const od = f.agency ? [] : odRows().filter(o => o.status !== 'discontinued' && fcMatch(fcOdMeta(o), f)), odP = od.reduce((s, o) => s + fpP(o.amount), 0);
  const aw = f.agency ? [] : fcAw().filter(x => fcMatch(x, f));
  const modes = FI_MODES.concat(L.rows.some(e => e.mode === 'Other') ? ['Other'] : []).map(m => [m, L.rows.filter(e => e.mode === m && e.kind === 'receipt').reduce((s, e) => s + e.p, 0)]);
  return `<div class="seg" role="group" aria-label="Grouping">${['day', 'week', 'month'].map(g => `<button aria-pressed="${grp === g}" data-act="frGrp" data-g="${g}">${g[0].toUpperCase() + g.slice(1)}ly</button>`).join('')}</div>
  <section class="card fi-rep" data-received="${L.received}" data-refunded="${L.refunded}" data-net="${L.net}" data-pending="${L.pending}" data-overdue="${odP}"><dl class="kv"><dt>Received</dt><dd class="num">${fiG(L.received)}</dd><dt>Refunded</dt><dd class="num">${L.refunded ? '−' : ''}${fiG(L.refunded)}</dd><dt>Net received</dt><dd class="num strong">${fiG(L.net)}</dd><dt>Pending (gateway)</dt><dd class="num">${fiG(L.pending)}</dd><dt>Bank transfers awaiting confirmation</dt><dd class="num">${aw.length} · ${fiG(aw.reduce((s, x) => s + fpP(x.amount), 0))} <span class="xs muted">not counted as received</span></dd><dt>Overdue now</dt><dd class="num">${fiG(odP)} · ${od.length} instalments</dd></dl>${L.unknown ? `<p class="xs muted">${L.unknown} seeded receipt(s) are marked partly refunded without a refund record; their refund amount is not recorded, so it isn't in these totals.</p>` : ''}
  <h4>Received by payment method</h4><div class="tbl-wrap"><table class="tbl dense"><tbody>${modes.map(([m, v]) => `<tr><td>${m}</td><td class="r num">${fiG(v)}</td></tr>`).join('')}<tr><td class="strong">Total</td><td class="r num strong">${fiG(L.received)}</td></tr></tbody></table></div>
  <h4>By ${grp}</h4>${groups.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>${grp === 'day' ? 'Day' : grp === 'week' ? 'Week of' : 'Month'}</th><th class="r">Received</th><th class="r">Refunded</th><th class="r">Net</th></tr></thead><tbody>${groups.map(g => `<tr><td>${g}</td><td class="r num">${fiG(gs(g, 'receipt'))}</td><td class="r num">${fiG(gs(g, 'refund'))}</td><td class="r num">${fiG(gs(g, 'receipt') - gs(g, 'refund'))}</td></tr>`).join('')}<tr><td class="strong">Total</td><td class="r num strong">${fiG(L.received)}</td><td class="r num strong">${fiG(L.refunded)}</td><td class="r num strong">${fiG(L.net)}</td></tr></tbody></table></div>` : emptyState({ icon: 'chart', title: 'No payments in this period', why: 'Nothing was received or refunded for these filters.' })}</section>`;
};
// Coursewise: one row per programme / course (its stable ID — two programmes with one title stay apart), and per batch
fiRepCoursewise = function (f = fcRepF()) {
  const L = fiLedger(f), ob = f.agency ? [] : fiObligations().filter(o => fcMatch(o, f)), od = f.mode || f.agency ? [] : odRows().filter(o => o.status !== 'discontinued').map(o => ({ ...o, m: fcOdMeta(o) })).filter(o => fcMatch(o.m, f));
  const agg = (keyOf, lbl) => {
    const keys = [...new Set(L.rows.map(keyOf).concat(f.mode ? [] : ob.filter(o => o.outstanding).map(keyOf)))];
    return keys.map(k => { const e = L.rows.filter(x => keyOf(x) === k), s = q => e.filter(x => x.kind === q).reduce((a, x) => a + x.p, 0), o = f.mode ? [] : ob.filter(x => keyOf(x) === k);
      return { k, l: lbl(k, e[0] || o[0]), t: (e[0] || o[0] || {}).ctype || '', payers: new Set(e.filter(x => x.kind === 'receipt').map(x => x.payer).concat(o.filter(x => x.outstanding).map(x => x.name))).size, rec: s('receipt'), back: s('refund'), out: o.reduce((a, x) => a + x.outstanding, 0), od: od.filter(x => keyOf(x.m) === k).reduce((a, x) => a + fpP(x.amount), 0) }; }).sort((a, b) => a.l.localeCompare(b.l));
  };
  const rs = agg(x => x.cid, (k, x) => x ? x.clabel + (x.ctype === 'NVQ programme' && !/^T:/.test(k) ? ` (${k})` : '') : k), tot = (xs, k) => xs.reduce((a, r) => a + r[k], 0);
  const tbl = (xs, first, type) => `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>${first}</th>${type ? '<th>Course type</th>' : ''}<th class="r">Payers</th><th class="r">Received</th><th class="r">Refunded</th><th class="r">Net</th><th class="r">Outstanding now</th><th class="r">Overdue now</th></tr></thead><tbody>${xs.map(r => `<tr data-k="${esc(r.k)}"><td>${esc(r.l)}</td>${type ? `<td class="small">${esc(r.t)}</td>` : ''}<td class="r">${r.payers}</td><td class="r num">${fiG(r.rec)}</td><td class="r num">${fiG(r.back)}</td><td class="r num">${fiG(r.rec - r.back)}</td><td class="r num">${fiG(r.out)}</td><td class="r num">${fiG(r.od)}</td></tr>`).join('')}<tr><td class="strong">Total</td>${type ? '<td></td>' : ''}<td></td><td class="r num strong">${fiG(tot(xs, 'rec'))}</td><td class="r num strong">${fiG(tot(xs, 'back'))}</td><td class="r num strong">${fiG(tot(xs, 'rec') - tot(xs, 'back'))}</td><td class="r num strong">${fiG(tot(xs, 'out'))}</td><td class="r num strong">${fiG(tot(xs, 'od'))}</td></tr></tbody></table></div>`;
  if (!rs.length) return emptyState({ icon: 'chart', title: 'No programme, course or bundle has payments for these filters', why: fcAny(f) ? `Filters: ${fcFTxt(f)}.` : '' });
  const byB = agg(x => x.bk || FC_NB, k => fcBLabel(k));
  return `<section class="card fi-rep" data-received="${tot(rs, 'rec')}" data-refunded="${tot(rs, 'back')}" data-outstanding="${tot(rs, 'out')}" data-overdue="${tot(rs, 'od')}">${tbl(rs, 'Programme / course / bundle', true)}
    <h4>By batch</h4>${tbl(byB, 'Batch')}<p class="xs muted">Received and refunded are for the period; outstanding and overdue are today's balances from each learner's payment plan. A refund is counted against the programme and batch of the payment it refunds; a learner's payment stays with the batch it was made in. Short courses and agency bundles are not batch-specific.</p></section>`;
};
const fcAgeing = f => { const od = odRows().filter(o => o.status !== 'discontinued' && fcMatch(fcOdMeta(o), f)), B = [['1–14', 1, 14], ['15–29', 15, 29], ['30–59', 30, 59], ['60+', 60, 9999]]; return `<section class="card fi-rep" data-overdue="${od.reduce((a, o) => a + fpP(o.amount), 0)}"><table class="tbl dense"><thead><tr><th>Bucket (days)</th><th class="r">Instalments</th><th class="r">Amount</th></tr></thead><tbody>${B.map(([l, a, b]) => { const r = od.filter(o => o.days >= a && o.days <= b); return `<tr><td>${l}</td><td class="r">${r.length}</td><td class="r">${fiG(r.reduce((x, o) => x + fpP(o.amount), 0))}</td></tr>`; }).join('')}<tr><td class="strong">Total</td><td class="r strong">${od.length}</td><td class="r strong">${fiG(od.reduce((x, o) => x + fpP(o.amount), 0))}</td></tr></tbody></table></section>`; };
const fcRefMeta = i => { const d = i.data || {}, t = allTx().find(x => x.ref === d.tx && x.payer === fiPayerOf(i) && !x.refund); if (t) return fcTxMeta(t); const w = d.v && STORE.worlds[d.v]; return w ? fcNvqMeta(w) : { ctype: 'Other', cid: '', clabel: '—', bk: null }; };
fiRepRefunds = function (f = fcRepF()) {
  const rf = allQueue().filter(i => i.type === 'Refund' && fcMatch(fcRefMeta(i), f)), done = rf.filter(fiRefDone), open = rf.filter(isOpen);
  return `<section class="card fi-rep" data-refunded="${fiSum(done)}" data-open="${fiSum(open)}"><dl class="kv"><dt>Refunded (processed)</dt><dd class="num">${done.length} · ${fiG(fiSum(done))}</dd><dt>Requested, waiting for approval</dt><dd class="num">${open.length} · ${fiG(fiSum(open))}</dd><dt>Rejected or returned</dt><dd class="num">${rf.filter(i => !isOpen(i) && !fiRefDone(i)).length}</dd></dl>${rf.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Refund</th><th>Course</th><th>Batch</th><th>Reason</th><th>Raised by</th><th>Approver</th><th>Status</th><th class="r">Amount</th></tr></thead><tbody>${rf.map(i => { const m = fcRefMeta(i); return `<tr><td class="mono">${i.id}</td><td class="small">${esc(m.clabel)}</td><td class="small mono">${esc(m.bk || 'Not batch-specific')}</td><td>${esc((i.data || {}).cat || '')}</td><td>${esc(i.raisedBy)}</td><td>${esc(i.first)}</td><td>${chip(REF_ST(i))}</td><td class="r">${amt(i.amount, i.cur, true)}</td></tr>`; }).join('')}</tbody></table></div>` : `<p class="small muted">No refunds${fcAny(f) ? ' for these filters' : ''}.</p>`}</section><section class="card"><h3>Overridden refunds</h3>${rf.filter(i => i.override).map(i => `<p class="small"><span class="mono">${i.id}</span> · <span class="strike">${esc(i.override.from)}</span> → ${esc(i.override.to)} by ${esc(i.override.by)} — ${esc(i.override.reason)}${i.processed ? ' · refund processed' : ''}</p>`).join('') || '<p class="small muted">None.</p>'}</section>`;
};

/* ---------- Deposits: what was received, what was credited to the first payment, what remains ---------- */
// One deposit's position, from the payment record (integer pence inside)
function fcDepAlloc(w, pl) {
  const d = pl.deposit, L = fpLedger(pl), dep = fpP(d.amount), conf = d.status === 'Paid' || fpRefunded(d), back = fpRefunded(d) ? dep : fpP(d.refundedPart), first = pl.rows[0] || { amount: 0, paid: 0, n: 1 };
  const credited = L.basis === 'gross' ? fpP(first.credit) : d.status === 'Paid' ? dep - back : 0; // net: the first payment was scheduled after the deposit
  const firstDue = Math.max(0, fpP(first.amount) - fpP(first.paid));
  const state = fpRefunded(d) ? 'Refunded' : back ? 'Partly refunded — Finance review' : d.status === 'Paid' ? 'Confirmed' : 'Awaiting confirmation';
  return { dep, received: conf ? dep : 0, refunded: back, paidAt: conf ? d.paidAt : null, state, credited, firstN: first.n, firstGross: L.basis === 'gross' ? fpP(first.amount) : fpP(first.amount) + (d.status === 'Paid' ? dep : 0), firstCash: fpP(first.paid) - fpP(first.credit), firstDue, basis: L.basis, ref: d.ref || '' };
}
const fcDepLearnerRows = () => dpWorlds().flatMap(v => { const w = STORE.worlds[v]; return fiLive(w).concat((w.plansHist || [])).filter(pl => pl.deposit).map(pl => ({ v, w, pl, hist: !!pl.archived })); });
const _ddrFC = dpDepRowOf;
dpDepRowOf = function (v, pl, hist) { const r = _ddrFC.apply(this, arguments), w = STORE.worlds[v], m = fcPlanMeta(w, pl), a = fcDepAlloc(w, pl); return { ...r, ...m, bk: hist ? (pl.archived.from || null) : (r.batch || m.bk), a, batch: hist ? pl.archived.from : r.batch || m.bk || '' }; };
// A deposit followed by instalments (the gross basis — not offered at sign-up, PD-FC-02) is listed too, without a seat hold
const fcGrossRows = v => { const w = STORE.worlds[v]; return fiLive(w).filter(pl => pl.deposit && pl !== dpHoldPl(w)).map(pl => { const m = fcPlanMeta(w, pl), a = fcDepAlloc(w, pl), L = fpLedger(pl); return { id: 'DEP-' + v + '-' + pl.e, name: VNAME(v), programme: pl.title, amount: L.dep, cur: 'GBP', paid: a.paidAt, hold: null, status: a.state === 'Confirmed' ? 'Credited to instalment ' + a.firstN : a.state, bal: L.outstanding, v, dp: true, pl, hist: false, ...m, batch: m.bk || '', a, nohold: true }; }); };
const fcDepRowsOf = v => dpDepRows(v).concat(fcGrossRows(v));
const fcSeedDepMeta = d => { const m = fcRawMeta({ course: d.programme }); return { ...m, bk: fcBatchByLabel(d.batch) }; };
const fcDepRow = d => (d.a ? d : { ...d, ...fcSeedDepMeta(d) });
// The extra Deposit View columns (seeded legacy rows have no payment record behind them: shown as recorded)
const FC_DEP_COLS = [
  { k: 'fcrec', l: 'Received', r: 1, h: d => d.a ? (d.a.received ? `${amt(fpM(d.a.received), 'GBP')}<div class="xs muted">${d.a.paidAt ? fd(d.a.paidAt) : ''}</div>` : '<span class="xs muted">Not yet</span>') : '—', s: d => d.a ? d.a.received : 0 },
  { k: 'fcconf', l: 'Confirmation', h: d => d.a ? chip(d.a.state, { Confirmed: 'green', 'Awaiting confirmation': 'amber', Refunded: 'grey' }[d.a.state] || 'red') : '—', v: d => d.a ? d.a.state : '' },
  { k: 'fccr', l: 'Credited to first payment', r: 1, h: d => d.a ? (d.a.credited ? `${amt(fpM(d.a.credited), 'GBP')}<div class="xs muted">${d.a.basis === 'gross' ? 'instalment ' + d.a.firstN : 'balance scheduled after it'}</div>` : '—') : '—', s: d => d.a ? d.a.credited : 0 },
  { k: 'fcfirst', l: 'First payment remaining', r: 1, h: d => d.a ? (d.hist ? '<span class="xs muted">Not payable</span>' : d.a.firstDue ? amt(fpM(d.a.firstDue), 'GBP') : chip('Paid', 'green')) : '—', s: d => d.a ? d.a.firstDue : 0 }];
const _dtFCd = dt;
dt = function (cfg) {
  if (cfg && cfg.id === 'fdep' && !cfg._fc) {
    const F = fcF('fd'), rows = cfg.rows.concat(dpWorlds().flatMap(fcGrossRows)).map(fcDepRow).filter(d => fcMatch(d, F)), cols = cfg.cols.slice(), k = cols.findIndex(c => c.k === 'hold');
    cols.splice(k < 0 ? cols.length : k, 0, ...FC_DEP_COLS);
    const bi = cols.findIndex(c => c.k === 'bal'); if (bi >= 0) { const b0 = cols[bi].h; cols[bi] = { ...cols[bi], h: d => d.nohold || (d.pl && fcIsDI(d.pl) && /^Seat secured/.test(d.status)) ? (d.bal > 0 ? amt(d.bal, 'GBP') : '—') : b0(d) }; }
    const hi = cols.findIndex(c => c.k === 'hold'); if (hi >= 0) { const h0 = cols[hi].h; cols[hi] = { ...cols[hi], h: d => d.nohold ? '<span class="xs muted">No seat hold (instalment plan)</span>' : h0(d) }; }
    cfg = { ...cfg, _fc: true, rows, cols, name: 'Deposits' + (fcAny(F) ? ' — ' + fcFTxt(F) : ''), footer: xs => { const r = xs.filter(d => d.a); return `<strong>Filtered:</strong> ${xs.length} deposits · received ${fiG(r.reduce((s, d) => s + d.a.received, 0))} · refunded ${fiG(r.reduce((s, d) => s + d.a.refunded, 0))} · credited to first payments ${fiG(r.reduce((s, d) => s + d.a.credited, 0))} · first payments remaining ${fiG(r.filter(d => !d.hist).reduce((s, d) => s + d.a.firstDue, 0))}`; } };
  }
  return _dtFCd.apply(this, [cfg].concat([].slice.call(arguments, 1)));
};
const _depFC = SCREENS['f-deposits'];
SCREENS['f-deposits'] = p => { const h = _depFC(p).replace('the seat is confirmed when the balance is paid.', 'the seat is confirmed when the balance — or, on the deposit-then-instalments route, instalment 1 — is paid.').replace('When a hold ends with the balance unpaid,', 'When a hold ends with that payment unpaid,'); return h.replace('<section class="dt">', `${fcBar('fd')}<p class="xs muted fc-dep-note">The deposit receipt and each later payment are separate ledger transactions with their own references and receipts. A deposit counts only once Finance has recorded its full amount (a pending bank transfer is not counted), and is credited once to the first payment. Deposit and balance: the balance (fee − deposit) is due within the seat hold. Deposit, then instalments (PD-FC-11): the deposit is credited to instalment 1, whose remainder is due within the seat hold; the seat is secured once instalment 1 is paid, and later instalments follow their dates.</p><section class="dt">`); };
fiRepDeposits = function (f = fcRepF()) {
  const seeded = ((STORE.fin && STORE.fin.deposits) || []).map(d => ({ ...fcSeedDepMeta(d), status: d.status, p: fpP(d.amount) })), live = dpWorlds().flatMap(fcDepRowsOf);
  const all = seeded.concat(live.map(d => ({ ...d, p: fpP(d.amount) }))).filter(d => fcMatch(d, f)), sts = [...new Set(all.map(d => d.status))], lv = all.filter(d => d.a);
  if (!all.length) return emptyState({ icon: 'shield', title: fcAny(f) ? 'No deposits for these filters' : 'No deposits yet', why: fcAny(f) ? `Filters: ${fcFTxt(f)}.` : 'No learner has chosen the deposit route.' });
  const s = k => lv.reduce((a, d) => a + d.a[k], 0);
  return `<section class="card fi-rep" data-received="${s('received')}" data-refunded="${s('refunded')}" data-credited="${s('credited')}"><dl class="kv"><dt>Deposits received (confirmed)</dt><dd class="num">${fiG(s('received'))}</dd><dt>Deposits refunded</dt><dd class="num">${fiG(s('refunded'))}</dd><dt>Credited to first payments</dt><dd class="num">${fiG(s('credited'))}</dd><dt>First payments still to pay</dt><dd class="num">${fiG(lv.filter(d => !d.hist).reduce((a, d) => a + d.a.firstDue, 0))}</dd>${sts.map(st => { const r = all.filter(d => d.status === st); return `<dt>${esc(st)}</dt><dd>${r.length} · ${fiG(r.reduce((a, d) => a + d.p, 0))}</dd>`; }).join('')}</dl>
  ${lv.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Programme / batch</th><th class="r">Deposit</th><th>Received</th><th>Confirmation</th><th class="r">Credited to first payment</th><th class="r">First payment remaining</th></tr></thead><tbody>${lv.map(d => `<tr><td>${esc(d.name)}</td><td class="small">${esc(d.programme)}<div class="xs muted mono">${esc(d.batch || 'Not batch-specific')}</div></td><td class="r num">${fiG(d.a.dep)}</td><td class="small">${d.a.received ? `${fiG(d.a.received)} · ${d.a.paidAt ? fd(d.a.paidAt) : ''}` : 'Not yet'}</td><td>${chip(d.a.state)}${d.a.refunded ? ` <span class="xs">${fiG(d.a.refunded)} refunded</span>` : ''}</td><td class="r num">${fiG(d.a.credited)}</td><td class="r num">${d.hist ? 'Not payable' : fiG(d.a.firstDue)}</td></tr>`).join('')}</tbody></table></div>` : ''}<p class="xs muted">From Finance → Deposits${seeded.length ? ' and the seeded deposit records' : ''}. The later payment toward the first instalment or balance is a separate transaction (Ledger), not a second deposit.</p></section>`;
};

/* ---------- FD (PD-FD-03): a change of demo identity or role starts the Finance views unfiltered ----------
   Course / batch / course-type selections, the report period, agency and method, and the search and column filters of the Finance tables
   are screen state of one person's session: they are reset to the defaults (all) whenever the demo identity or role changes. Records are
   never touched. */
const FC_FILTER_UI = /^(fc[CBT]-|fr(Range|Agency|Mode|Grp|Course)$|fpL$|odTab$|dt-(fledger|ledger-tx|fdep|frefunds|flearners|fod-|lu-h-fwaiv))/;
function fcFiltersReset() { if (S && S.ui) Object.keys(S.ui).filter(k => FC_FILTER_UI.test(k)).forEach(k => delete S.ui[k]); }
['drAs', 'switchRole'].forEach(n => { const f = ACT[n]; if (typeof f === 'function') ACT[n] = function () { fcFiltersReset(); return f.apply(this, arguments); }; });

/* ---------- Finance Reports: the tabs and the filters on every one that can use them ---------- */
const _frFC = SCREENS['f-reports'];
SCREENS['f-reports'] = p => {
  const t = (p && p.tab) || 'datewise';
  if (t === 'ageing') { const h = _frFC(p), k = h.indexOf('<section class="card"><table class="tbl dense"><thead><tr><th>Bucket (days)'); return k < 0 ? h : h.slice(0, k) + fcAgeing(fcRepF()); }
  return _frFC(p);
};
// Waivers & adjustments: one learner each — filtered by that learner's programme and batch
const fcAdjMeta = a => { const v = learnerAccounts().find(k => VNAME(k) === a[2] || chFullName(STORE.worlds[k]) === a[2]), w = v && STORE.worlds[v]; return w ? fcNvqMeta(w) : { ctype: 'Other', cid: '', clabel: '—', bk: null }; };
const _dtFC2 = dt;
dt = function (cfg) {
  if (cfg && cfg.id === 'lu-h-fwaiv' && !cfg._fc) { const F = fcF('fr'); cfg = { ...cfg, _fc: true, rows: cfg.rows.filter(a => fcMatch(fcAdjMeta(a), F)), empty: fcAny(F) ? 'No waivers or adjustments for these filters' : cfg.empty }; }
  if (cfg && cfg.id === 'frefunds' && !cfg._fc) { const F = fcF('rf'); cfg = { ...cfg, _fc: true, rows: cfg.rows.filter(i => fcMatch(fcRefMeta(i), F)), name: 'Refunds' + (fcAny(F) ? ' — ' + fcFTxt(F) : '') }; }
  if (cfg && cfg.id === 'flearners' && !cfg._fc) {
    const F = fcF('fla'), ms = l => { const w = l.w || fiWOf(l.id); return w ? fiLive(w).map(pl => fcPlanMeta(w, pl)).concat(w.flags && w.flags.nvq ? [fcNvqMeta(w)] : []) : [fcRawMeta({ course: (l.courses || [])[0] || '' })]; };
    cfg = { ...cfg, _fc: true, rows: cfg.rows.filter(l => !fcAny(F) || ms(l).some(m => fcMatch(m, F))), name: 'Learner accounts' + (fcAny(F) ? ' — ' + fcFTxt(F) : ''), cols: cfg.cols.concat([{ k: 'fcb', l: 'Programme / batch', h: l => { const w = l.w || fiWOf(l.id); if (!w || !w.flags || !w.flags.nvq) { const rb = typeof aafbRosterBatch === 'function' && aafbRosterBatch(l.id); return rb ? `<span class="small">${esc(rb.course)}</span><div class="xs muted mono">${esc(rb.code)}</div><div class="xs muted aafb-rb">Batch roster — no programme fee recorded</div>` : '—'; } /* AA-FINAL (AA-07 g2 Low): an admin roster add shows its batch (display only) */ const m = fcNvqMeta(w); return `<span class="small">${esc(m.clabel)}</span><div class="xs muted mono">${esc(m.bk || '—')}</div>`; }, v: l => { const w = l.w || fiWOf(l.id); return w ? fcNvqMeta(w).bk || '' : ''; } }]) };
  }
  if (cfg && /^fod-/.test(cfg.id || '') && !cfg._fc) { const F = fcF('fo'); cfg = { ...cfg, _fc: true, rows: cfg.rows.filter(o => fcMatch(fcOdMeta(o), F)), name: 'Overdue learners' + (fcAny(F) ? ' — ' + fcFTxt(F) : '') }; }
  return _dtFC2.apply(this, [cfg].concat([].slice.call(arguments, 1)));
};
const fcInsertBar = (h, bar) => h.replace('<section class="dt">', bar + '<section class="dt">');
const _refFC = SCREENS['f-refunds'];
SCREENS['f-refunds'] = p => { const h = _refFC(p); return (p.tab || 'list') === 'list' ? fcInsertBar(h, fcBar('rf')) : h.replace('<section class="dt">', `<p class="xs muted fc-exc">${ic('info', 12)} Batch-cancellation refunds are listed per cancelled batch (the Batch column).</p><section class="dt">`); };
const _flaFC = SCREENS['f-learners'];
SCREENS['f-learners'] = p => fcInsertBar(_flaFC(p), fcBar('fla'));
// Overdue & Access: the tab counts and the table follow the filters
const _fodFC = SCREENS['f-overdue'];
SCREENS['f-overdue'] = p => {
  const F = fcF('fo'); let h;
  _odFC_filter = fcAny(F) ? o => fcMatch(fcOdMeta(o), F) : null;
  try { h = _fodFC(p); } finally { _odFC_filter = null; }
  return fcInsertBar(h, fcBar('fo'));
};
let _odFC_filter = null; const _odFC_rows = odRows;
odRows = function () { const out = _odFC_rows.apply(this, arguments); return _odFC_filter ? out.filter(_odFC_filter) : out; };
// The admin console's Reports (Super / System Admin): the same figures and the same filters
fiAdminReports = function () {
  const f = { days: 30, ...fcF('fr') }, x = fcFTxt(f);
  return `<div class="note b-blue">${ic('info')}<div class="small">The same figures as Finance → Reports, from the ledger and the learners' payment plans. Exports are simulated in the prototype.</div></div>${fcBar('fr', { types: true })}<div class="grid-2"><section class="card"><div class="row-b"><h2>Datewise (last 30 days)</h2>${exportMenu('Finance datewise (last 30 days' + (x ? ' · ' + x : '') + ')')}</div>${fiRepDatewise(f, 'month')}</section><section class="card"><div class="row-b"><h2>Coursewise (last 30 days)</h2>${exportMenu('Finance coursewise (last 30 days' + (x ? ' · ' + x : '') + ')')}</div>${fiRepCoursewise(f)}</section></div>`;
};

/* ---------- Transaction Ledger: course type, course and batch on every row; awaiting transfers listed; honest totals ---------- */
const fcLedRows = () => {
  const tx = allTx().map(t => ({ ...t, fc: fcTxMeta(t) }));
  const aw = fcAw().map(x => ({ at: x.at, ref: x.ref, payer: x.name || (x.w ? VNAME(x.w.v) : '—'), payerType: 'Learner', course: (x.fee ? 'Observation fee — ' : '') + (x.course || x.title || '') + (x.fee ? '' : x.opt === 'deposit' ? ' — deposit' : x.n ? ' — instalment ' + x.n : ''), amount: x.amount, cur: 'GBP', mode: 'Bank transfer', source: 'Learner\'s transfer notice', status: 'Awaiting confirmation', receipt: '—', gref: '—', aw: true, fc: { ctype: x.ctype, cid: x.cid, clabel: x.clabel, bk: x.bk } }));
  return tx.concat(aw);
};
const fcLedFoot = rows => { const p = x => fpP(x.amount), got = rows.filter(t => !t.refund && ['Paid', 'Refunded', 'Partially refunded'].includes(t.status)).reduce((s, t) => s + p(t), 0), back = rows.filter(t => t.refund).reduce((s, t) => s + p(t), 0), pend = rows.filter(t => t.status === 'Pending' || t.status === 'Awaiting confirmation').reduce((s, t) => s + p(t), 0);
  return `<span class="fc-led-foot" data-received="${got}" data-refunded="${back}" data-pending="${pend}"><strong>Filtered:</strong> received ${fiG(got)} · refunded ${back ? '−' : ''}${fiG(back)} · <strong>net ${fiG(got - back)}</strong> · pending or awaiting confirmation ${fiG(pend)} <span class="xs muted">(not counted)</span> · failed payments are not counted.</span>`; };
const _dtFC3 = dt;
dt = function (cfg) {
  if (cfg && ['fledger', 'ledger-tx'].includes(cfg.id) && !cfg._fc) {
    const F = fcF('fl'), act0 = cfg.act, search0 = cfg.search, rows = fcLedRows().filter(t => fcMatch(t.fc, F)), cols = cfg.cols.slice(), k = cols.findIndex(c => c.k === 'course');
    if (k >= 0) cols[k] = { ...cols[k], l: 'Course / for', h: t => `<span class="small">${esc(t.course)}</span><div class="xs muted fc-cb">${esc(t.fc.ctype)} · <span class="mono">${esc(t.fc.bk || 'Not batch-specific')}</span></div>${t.aw ? '<div class="xs muted">Bank transfer notice — not received until Finance confirms it</div>' : ''}`, v: t => t.course + ' ' + t.fc.ctype + ' ' + (t.fc.bk || 'Not batch-specific') };
    const ri = cols.findIndex(c => c.k === 'ref'); if (ri >= 0) { const h0 = cols[ri].h; cols[ri] = { ...cols[ri], h: t => t.aw ? `<span class="mono small">${esc(t.ref)}</span><div class="xs muted">No receipt yet</div>` : h0 ? h0(t) : esc(t.ref) }; }
    const search = t => (search0 ? search0(t) : '') + ' ' + t.payer + ' ' + t.course + ' ' + t.fc.clabel + ' ' + (t.fc.bk || '') + ' ' + t.fc.ctype;
    const filters = (cfg.filters || []).map(f => (f.k === 'st' || f.k === 's') ? { ...f, opts: (f.opts || []).concat(['Awaiting confirmation']) } : f);
    cfg = { ...cfg, _fc: true, rows, cols, search, filters, name: (cfg.name || 'Ledger') + (fcAny(F) ? ' — ' + fcFTxt(F) : ''), footer: fcLedFoot,
      act: act0 ? t => t.aw ? `<button class="btn btn-sm" data-act="fcAwRec" data-r="${esc(t.ref)}">Confirm…</button>` : act0(t) : undefined };
  }
  return _dtFC3.apply(this, [cfg].concat([].slice.call(arguments, 1)));
};
ACT.fcAwRec = el => { const t = payTargets().find(x => x.chb && x.chb.ref === el.dataset.r); if (!t) { render(); toast('That transfer is no longer awaiting confirmation.', 'info'); return; } ACT.finOffline({ dataset: { k: t.key } }); };
const FC_QUICK = [['', 'All'], ['NVQ programme', 'NVQ programmes'], ['Short course', 'Short courses'], ['Observation fee', 'Observation fees'], ['Agency bundle', 'Agency bundles']];
const fcLedHead = () => { const F = fcF('fl'); return `<div class="row fc-quick" role="group" aria-label="Course type">${FC_QUICK.map(([v, l]) => `<button class="btn btn-sm ${F.ct === v ? 'btn-primary' : ''}" aria-pressed="${F.ct === v}" data-act="fcQuick" data-v="${esc(v)}">${l}</button>`).join('')}</div>${fcBar('fl')}${fcpNote()}`; };
ACT.fcQuick = el => INP.fcT({ value: el.dataset.v, dataset: { sc: 'fl' } });
const _ledFC = SCREENS['f-ledger'];
SCREENS['f-ledger'] = p => fcInsertBar(_ledFC(p).replace('Gateway transactions are recorded automatically and are read-only.', 'Every payment, refund and pending payment — learners (NVQ programmes and short courses), observation fees and agencies. Search by learner, course or reference. Gateway transactions are recorded automatically and are read-only.'), fcLedHead());
const _afFC = SCREENS['a-finance'];
SCREENS['a-finance'] = p => {
  const t = (p && p.tab) || 'ledger', h = _afFC(p); if (t !== 'ledger') return h;
  const F = fcF('fl'), L = fiLedger(F);
  return fcInsertBar(h.replace(/<div class="kpis">[\s\S]*?<\/div>(?=<section class="dt">)/, `<div class="kpis">${kpi('Received', fiG(L.received))}${kpi('Refunded', fiG(L.refunded))}${kpi('Net received', fiG(L.net))}${kpi('Pending', fiG(L.pending))}</div>`), fcLedHead());
};
// Finance dashboard: the overall position — the course and batch breakdowns are in Reports (link)
const _fdFC = SCREENS['f-dashboard'];
SCREENS['f-dashboard'] = p => { const h = _fdFC(p); return h.includes('fc-dash') ? h : h.replace(/(<\/div>)/, `$1<p class="xs muted fc-dash">${ic('info', 12)} These are the Academy-wide figures. For a course or batch, use <a href="#f-reports.coursewise" data-go="f-reports" data-tab="coursewise">Reports → Coursewise</a> or the Ledger's course and batch filters.</p>`); };

/* ---------- A payment refunded in full is still money received (FI-2 counted "Succeeded" only) ----------
   finance.js marks a learner's payment "Refunded" when a refund covers it; its refund is a separate negative transaction. FI-2's account
   counted received money from "Succeeded" rows only, so a fully refunded payment left "received" while its refund still counted:
   net received came out too low (a refunded £100 deposit showed net −£100 instead of £0). */
const _acFC = fiAcct;
fiAcct = function (w) { const a = _acFC.apply(this, arguments), got = (w.tx || []).filter(t => t.amount > 0 && ['Succeeded', 'Refunded'].includes(t.status)).reduce((s, t) => s + fpP(t.amount), 0); return { ...a, received: got, net: got - a.refunded }; };

/* ---------- Gross schedules: the confirmed deposit is credited to instalment 1, once (PD-FC-12) ----------
   Replaces FP-A's "earliest unpaid instalments, carried forward" (and FC's provisional carry to instalment 2, PD-FC-03): the credit
   goes to instalment 1 only, up to what is still unpaid on it. What can't be credited there (instalment 1 already paid in cash) is not
   moved to another instalment: it stays a paid, unallocated deposit (it still reduces what is outstanding) and the plan is flagged for
   Finance review. Only what is still held is credited (a refund, in full or in part, takes the credit back). Applying it again changes
   nothing (retry, refresh, role switch). */
fpCredit = function (w, why) {
  (w && w.plans || []).forEach(pl => {
    const d = pl.deposit; if (!d || fpLedger(pl).basis !== 'gross') return;
    const who = `${chFullName(w)} (${w.me.id})`, at = now().toISOString(), cap = d.status === 'Paid' ? Math.max(0, fpP(d.amount) - fpP(d.refundedPart)) : 0;
    const cur = pl.rows.reduce((a, x) => a + fpP(x.credit), 0);
    if (cur > cap) {
      let over = cur - cap, taken = 0; const got = [];
      pl.rows.slice().reverse().forEach(x => { if (over <= 0 || !fpP(x.credit)) return; const t = Math.min(over, fpP(x.credit)); over -= t; taken += t; x.credit = fpM(fpP(x.credit) - t); x.paid = fpM(Math.max(0, fpP(x.paid) - t)); fpRowSt(x); got.push(`instalment ${x.n} ${money(fpM(t), 'GBP')}`); });
      (pl.depCredits = pl.depCredits || []).push({ at, amount: -fpM(taken), rows: got, why: why || 'Deposit no longer held' });
      logA('Finance', who, cap ? 'Deposit credit reduced (part refund)' : 'Deposit credit reversed', got.join(', '), `Credit now ${money(fpM(cap), 'GBP')}`, why || 'Only what is still held is credited');
    } else if (cur < cap) {
      const r1 = pl.rows[0], room = r1 ? Math.max(0, fpP(r1.amount) - fpP(r1.paid)) : 0, x = Math.min(room, cap - cur);
      if (x > 0) { r1.credit = fpM(fpP(r1.credit) + x); r1.paid = fpM(fpP(r1.paid) + x); fpRowSt(r1); (pl.depCredits = pl.depCredits || []).push({ at, amount: fpM(x), rows: ['instalment 1 ' + money(fpM(x), 'GBP')], why }); logA('Finance', who, 'Deposit credited to instalments', `${money(d.amount, 'GBP')} deposit confirmed`, `instalment 1 ${money(fpM(x), 'GBP')}`, why || 'Deposit paid'); }
      const left = cap - cur - x;
      if (left > 0 && !(pl.depReview && fpP(pl.depReview.amount) === left)) {
        pl.depReview = { at, amount: fpM(left), why: 'Instalment 1 was already paid when the deposit was confirmed — the deposit is not moved to another instalment without a Finance decision' };
        logA('Finance', who, 'Deposit credit needs Finance review', `${money(d.amount, 'GBP')} deposit confirmed`, `${money(fpM(left), 'GBP')} not allocated`, pl.depReview.why + ' (PD-FC-12)');
        if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t: 'Deposit credit needs Finance review', b: `${chFullName(w)} · ${pl.title}: ${money(fpM(left), 'GBP')} of the deposit isn't allocated to an instalment`, at, go: 'f-deposits', unread: true });
      }
    }
    if (pl.depReview && pl.rows.reduce((a, x) => a + fpP(x.credit), 0) >= cap) delete pl.depReview;
  });
};
const _flFC = fpLedger;
fpLedger = function (pl) {
  const L = _flFC.apply(this, arguments), d = pl && pl.deposit; if (L.basis !== 'gross' || L.st !== 'paid' || !fpP(d.refundedPart)) return L;
  const part = fpP(d.refundedPart), dep = fpP(d.amount), credit = fpP(L.credit), rows = pl.rows, rowsDue = rows.reduce((a, r) => a + Math.max(0, fpP(r.amount) - fpP(r.paid)), 0);
  const unalloc = Math.max(0, dep - part - credit), out = rowsDue - Math.min(unalloc, rowsDue), paid = rows.reduce((a, r) => a + fpP(r.paid), 0) - credit + dep - part, owed = fpP(L.owed);
  return { ...L, paid: fpM(paid), outstanding: fpM(out), refunded: fpM(part), ok: paid + out === owed };
};
// A part refund of a deposit takes back the credit it no longer supports (FP-A only reversed a full refund)
const _reFC = refundEffect;
refundEffect = function (i) { const r = _reFC.apply(this, arguments), d = (i && i.data) || {}, w = (d.v || d.depV) && STORE.worlds[d.v || d.depV]; if (w && (w.plans || []).some(pl => pl.deposit && fpLedger(pl).basis === 'gross')) fpCredit(w, `Deposit refund ${i.id}`); return r; };

/* ============================================================
   FCP — browser persistence of the client demo (prototype only)
   The whole demo data set (STORE, ADMIN and the registers the demo narrows) is saved as one snapshot in this browser's localStorage
   after every change, and restored as one on the next load — never ledger rows without the balances, plans, approvals, seats and
   refunds they belong to. Shared objects stay shared and frozen (signed) records stay frozen. Saved only for the client demo, never
   for the legacy test data or while developer mode changes anything; Reset demo deletes it. A learner's unsent drafts (world.drafts)
   are left out: Batch AR keeps assignment drafts in their own browser store and asks for files to be reattached after a refresh. Nothing secret is in the data (no card
   numbers, passwords or document contents — uploads are file names only); keys that could hold one are dropped anyway.
   ============================================================ */
const FCP_KEY = 'illumin-demo:client-state', FCP_V = 1;
const FCP = { ready: false, busy: false, st: 'off', why: '', at: null, last: '', tainted: false, sig: '', told: false, fp0: '', fpLast: '', has: false };
// What a change of substance looks like (screens fill some caches when first drawn; those alone are not demo changes)
function fcpFp() {
  try {
    return fcpJ([allTx().map(t => [t.ref, t.payer, t.amount, t.status]), (ADMIN.queue || []).map(i => [i.id, i.status, !!i.processed]), (STORE.chBank || []).map(x => [x.ref, x.status]),
      learnerAccounts().map(v => { const w = STORE.worlds[v]; return [v, w.signup && [w.signup.batch, w.signup.done], (w.plans || []).map(pl => [pl.e, pl.deposit && pl.deposit.status, pl.rows.map(r => [r.paid, r.status, r.credit])]), (w.enrolments || []).map(e => [e.id, e.status]), (w.assignments || []).map(a => a.status)]; }),
      (ADMIN.batches || []).map(b => [b.code, b.enrolled, b.status]), (ADMIN.programmes || []).map(p => [p.id, p.status]), (ADMIN.audit || []).length, Object.keys(PERSONAS).length, chFees().map(f => [f.id, f.status])]);
  } catch (e) { return 'x' + Math.random(); }
}
const fcpJ = JSON.stringify;
const FCP_SESSION = ['drafts', 'arHyd', 'arRe', 'arFrom', 'arState']; // a learner's unsent drafts and AR's once-per-session restore markers
const FCP_DROP = /^(pw|pw2|password|passcode|cvc|cvv|cardNumber|otp|secret)$/i;
function fcpLS() { try { const s = window.localStorage; if (!s) return null; s.setItem('__fcp_probe', '1'); s.removeItem('__fcp_probe'); return s; } catch (e) { return null; } }
// Encoder: a graph (shared and circular references kept), undefined kept, functions and secret-looking keys dropped
function fcpEncode(roots) {
  const ids = new Map(); let n = 0;
  const enc = v => {
    if (v === undefined) return { $u: 1 };
    if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
    if (v === null || typeof v !== 'object') return typeof v === 'function' ? { $u: 1 } : v;
    if (ids.has(v)) return { $r: ids.get(v) };
    const id = n++; ids.set(v, id);
    if (v instanceof Date) return { $i: id, $d: v.toISOString() };
    const fz = Object.isFrozen(v) ? 1 : 0;
    if (Array.isArray(v)) return { $i: id, a: v.map(enc), ...(fz ? { f: 1 } : {}) };
    const pr = Object.getPrototypeOf(v); if (pr !== Object.prototype && pr !== null) throw new Error('unsupported object');
    const o = {}, world = !!(v.me && v.flags && 'drafts' in v); Object.keys(v).forEach(k => { if (typeof v[k] === 'function' || FCP_DROP.test(k) || (world && FCP_SESSION.includes(k))) return; o[k] = enc(v[k]); });
    return { $i: id, o, ...(fz ? { f: 1 } : {}) };
  };
  return enc(roots);
}
function fcpDecode(x) {
  const ids = [];
  const dec = v => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) throw new Error('bad node');
    if (v.$u) return undefined; if ('$n' in v) return Number(v.$n); if ('$r' in v) { if (!(v.$r in ids)) throw new Error('bad reference'); return ids[v.$r]; }
    if (!('$i' in v)) throw new Error('bad node');
    if (v.$d) return (ids[v.$i] = new Date(v.$d));
    const out = v.a ? [] : {}; ids[v.$i] = out;
    if (v.a) v.a.forEach(e => out.push(dec(e))); else Object.keys(v.o).forEach(k => { const d = dec(v.o[k]); if (d !== undefined || v.o[k].$u) out[k] = d; });
    if (v.f) Object.freeze(out); return out;
  };
  return dec(x);
}
const fcpRoots = () => ({ STORE, ADMIN, PERSONAS, VARIANTS, VARIANT_INFO, CATALOGUE, COO_USERS });
// The shape of the starting demo (this build's code): a saved copy from another build is not restored
const fcpSig = () => { const s = [Object.keys(STORE).sort().join(','), Object.keys(ADMIN).sort().join(','), Object.keys(STORE.worlds.CD1 || {}).sort().join(',')].join('|'); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return FCP_V + ':' + h; };
const fcpCan = () => FCP.ready && !FCP.busy && FX.mode === 'client' && fxPin() !== 'legacy';
function fcpSave() {
  if (!fcpCan()) return;
  let s; try { s = JSON.stringify(fcpEncode(fcpRoots())); } catch (e) { FCP.st = 'error'; FCP.why = 'The demo data could not be prepared for saving.'; return; }
  if (s === FCP.last) return;
  const fp = fcpFp();
  if (!FCP.has && fp === FCP.fp0) { FCP.last = s; FCP.st = 'idle'; return; } // nothing changed since the starting demo: nothing to save
  if (S.drDev || FCP.tainted) { if (fp !== FCP.fpLast) FCP.tainted = true; FCP.last = s; if (!FCP.tainted) return; FCP.st = 'paused'; FCP.why = 'Changes made in developer mode are not saved. Reset demo to save again.'; return; }
  const ls = fcpLS(); if (!ls) { FCP.st = 'unavailable'; FCP.why = 'This browser blocks local storage, so changes are kept in this tab only and are lost on refresh.'; fcpTell(); return; }
  const at = now().toISOString();
  try {
    ls.setItem(FCP_KEY, JSON.stringify({ v: FCP_V, fx: 'client', sig: FCP.sig, at, clock: now().getTime() - NOW.getTime(), data: s }));
    const back = ls.getItem(FCP_KEY); if (!back || JSON.parse(back).data !== s) throw new Error('read-back mismatch');
    FCP.last = s; FCP.fpLast = fp; FCP.has = true; FCP.st = 'saved'; FCP.at = at; FCP.why = '';
  } catch (e) { FCP.st = 'error'; FCP.why = /quota/i.test(String(e && (e.name + e.message))) ? 'This browser\'s storage is full, so the latest changes were not saved — they will be lost on refresh.' : 'The latest changes could not be saved in this browser — they will be lost on refresh.'; fcpTell(); }
}
// The state just loaded is the baseline: it is saved only once something changes (a fresh start leaves nothing in storage)
const fcpBase = () => { try { FCP.last = JSON.stringify(fcpEncode(fcpRoots())); } catch (e) { FCP.last = ''; } FCP.fp0 = FCP.fpLast = fcpFp(); };
const fcpTell = () => { if (FCP.told) return; FCP.told = true; setTimeout(() => toast(FCP.why, 'err'), 0); };
function fcpApply(d) {
  Object.keys(STORE).forEach(k => delete STORE[k]); Object.assign(STORE, d.STORE);
  ADMIN = d.ADMIN;
  [[PERSONAS, d.PERSONAS], [VARIANTS, d.VARIANTS], [VARIANT_INFO, d.VARIANT_INFO], [COO_USERS, d.COO_USERS]].forEach(([g, x]) => { Object.keys(g).forEach(k => delete g[k]); Object.assign(g, x); });
  CATALOGUE.splice(0, CATALOGUE.length, ...d.CATALOGUE);
  Object.values(STORE.worlds || {}).forEach(w => { if (w && typeof w === 'object') { if (!w.amt) w.amt = g => g; if (!w.drafts) w.drafts = {}; } }); // a learner's unsent drafts aren't in the copy: AR keeps them itself (files are reattached) // CH-02: GBP, never converted (makeWorld)
}
// Checks a restored copy must pass before it is used (otherwise the starting demo is loaded)
function fcpCheck() {
  if (!STORE.worlds || !ADMIN || !Array.isArray(ADMIN.queue) || !STORE.worlds.CD1) throw new Error('incomplete');
  allTx(); fiLedger({}); payTargets(); learnerAccounts().forEach(v => { if (!STORE.worlds[v].me) throw new Error('learner without identity'); fiAcct(STORE.worlds[v]); }); odRows(); dpWorlds();
}
function fcpRestore() {
  FCP.sig = fcpSig(); FCP.fp0 = fcpFp();
  const ls = fcpLS(); if (!ls) { FCP.st = 'unavailable'; FCP.why = 'This browser blocks local storage, so changes are kept in this tab only and are lost on refresh.'; return null; }
  let raw = null; try { raw = ls.getItem(FCP_KEY); } catch (e) { raw = null; }
  if (!raw) { FCP.st = 'idle'; return null; }
  let o, d; const drop = why => { try { ls.removeItem(FCP_KEY); } catch (e) { /* ignore */ } FCP.st = 'idle'; FCP.has = false; return why; };
  try { o = JSON.parse(raw); } catch (e) { return drop('The demo changes saved in this browser couldn\'t be read and were discarded. The starting demo is loaded.'); }
  if (!o || o.v !== FCP_V || o.fx !== 'client' || typeof o.data !== 'string') return drop('The demo changes saved in this browser couldn\'t be read and were discarded. The starting demo is loaded.');
  if (o.sig !== FCP.sig) return drop('The prototype was updated, so demo changes saved in this browser by the earlier version were discarded. The starting demo is loaded.');
  // the registers as they are now, put back if the copy fails (the starting demo is then rebuilt from them)
  const keep = { St: { ...STORE }, A: ADMIN, P: { ...PERSONAS }, V: { ...VARIANTS }, VI: { ...VARIANT_INFO }, C: { ...COO_USERS }, Cat: CATALOGUE.slice() };
  const putBack = () => { Object.keys(STORE).forEach(k => delete STORE[k]); Object.assign(STORE, keep.St); ADMIN = keep.A; [[PERSONAS, keep.P], [VARIANTS, keep.V], [VARIANT_INFO, keep.VI], [COO_USERS, keep.C]].forEach(([g, x]) => { Object.keys(g).forEach(k => delete g[k]); Object.assign(g, x); }); CATALOGUE.splice(0, CATALOGUE.length, ...keep.Cat); };
  try {
    d = fcpDecode(JSON.parse(o.data));
    if (!d || ['STORE', 'ADMIN', 'PERSONAS', 'VARIANTS', 'VARIANT_INFO', 'COO_USERS'].some(k => !d[k] || typeof d[k] !== 'object') || !Array.isArray(d.CATALOGUE)) throw new Error('incomplete copy');
    fcpApply(d); fcpCheck();
  } catch (e) { putBack(); FCP.busy = true; try { fxLoadClient(); } finally { FCP.busy = false; } fcpBase(); return drop('The demo changes saved in this browser couldn\'t be restored and were discarded. The starting demo is loaded.'); }
  CLOCK_SHIFT = Math.max(0, +o.clock - (Date.now() - BOOT)) || 0; // the demo clock continues from the saved moment
  W = STORE.worlds[S.variant] || STORE.worlds.CD1 || W;
  FCP.last = o.data; FCP.fpLast = fcpFp(); FCP.has = true; FCP.st = 'saved'; FCP.at = o.at; FCP.restored = o.at;
  return 'ok';
}
const _bootFC = App.boot;
App.boot = function () {
  FCP.busy = true; let r; try { r = _bootFC.apply(this, arguments); } finally { FCP.busy = false; }
  if (FX.mode === 'client' && fxPin() !== 'legacy') {
    const res = fcpRestore();
    if (res === 'ok') { try { if (ADMIN._saMe) setAdminIdentity('A'); } catch (e) { /* identity is chosen at sign-in */ } render(); setTimeout(() => toast(`Demo changes saved in this browser on ${fdt(FCP.restored)} were restored (prototype only — this browser only).`, 'info'), 0); }
    else if (res) { render(); setTimeout(() => toast(res, 'info'), 0); }
    if (res !== 'ok') fcpBase(); FCP.ready = true;
  } else FCP.ready = true;
  return r;
};
// Every change: render runs after it (the stamp of new payments, then the save)
const _rendFC = render;
render = function () { fcStampAll(); const r = _rendFC.apply(this, arguments); fcpSave(); return r; };
try { window.addEventListener('pagehide', fcpSave); } catch (e) { /* no window */ }
// Reset demo: the saved copy is deleted and the starting demo loaded (the demo clock starts again)
const fcpDel = () => { const ls = fcpLS(); if (ls) try { ls.removeItem(FCP_KEY); } catch (e) { /* ignore */ } FCP.last = ''; FCP.tainted = false; FCP.has = false; FCP.at = null; FCP.st = ls ? 'idle' : 'unavailable'; };
const _resetFC = ACT.resetDemo;
ACT.resetDemo = function () {
  if (fxPin() === 'legacy') return _resetFC.apply(this, arguments);
  FCP.busy = true; fcpDel(); CLOCK_SHIFT = 0;
  try { return _resetFC.apply(this, arguments); } finally { FCP.busy = false; S.drDev = false; fcStampAll(); fiOdSync(); dpReconcile(); fcpBase(); }
};
// Building the client demo (Reset, the guided link) never saves its half-built steps
const _fxlcFC = fxLoadClient;
fxLoadClient = function () { const b = FCP.busy; FCP.busy = true; try { return _fxlcFC.apply(this, arguments); } finally { FCP.busy = b; FCP.last = ''; } };
const _cdlFC = ACT.cdLoad; ACT.cdLoad = function () { fcpDel(); CLOCK_SHIFT = 0; return _cdlFC.apply(this, arguments); };
// What the person sees: one status line, prototype only, this browser only
function fcpStatusTxt() {
  if (FX.mode !== 'client') return 'Legacy test data is loaded — it is never saved. Reset demo returns to the client demo.';
  return { saved: `Demo changes are saved in this browser${FCP.at ? ' (last saved ' + fdt(FCP.at) + ')' : ''}.`, idle: 'No demo changes to save yet.', paused: FCP.why, unavailable: FCP.why, error: FCP.why, off: 'Not saved.' }[FCP.st] || 'Not saved.';
}
const fcpNote = () => `<p class="xs muted fcp-note" data-st="${FCP.st}">${ic(FCP.st === 'saved' || FCP.st === 'idle' ? 'lock' : 'alert', 12)} Prototype only: ${esc(fcpStatusTxt())} Saved data stays in this browser on this device — it isn't shared with other browsers or devices and isn't a production record.</p>`;
const _panelFC = drPanel;
drPanel = function () {
  return _panelFC.apply(this, arguments).replace('Discards every change made in this browser tab.', 'Discards every change saved in this browser.')
    .replace('<div class="dr-ctl dr-devl">', `<div class="dr-ctl fcp-ctl"><p class="xs"><strong>Saved in this browser (prototype only).</strong> ${esc(fcpStatusTxt())} Changes stay after a refresh in this browser only — not on other browsers or devices. No card details, passwords or document contents are stored.</p></div><div class="dr-ctl dr-devl">`);
};
const _drResetFC = ACT.drReset;
ACT.drReset = () => { const r = _drResetFC(); if (MODAL) $$('#modal-root p').forEach(p => { p.innerHTML = p.innerHTML.replace('Everything changed in this browser tab is discarded', 'Everything changed and saved in this browser is discarded'); }); return r; };

/* ============================================================
   PD-FC-11 — Deposit, then the approved instalments (confirmed by the user, 1 Nov 2026). The real sign-up route.
   On the payment step a learner whose batch takes a deposit can choose "Deposit, then N payments" for each approved payment option
   (N > 1). The deposit is part of the fee: the deposit checkout (card, or bank transfer confirmed by Finance) is the existing deposit
   route's; on completion the plan becomes the learner's pinned schedule for that option (one plan, one frozen set of terms, w.signup.pin),
   with the confirmed deposit credited to instalment 1. Instalment 1's remainder is due by the seat-hold deadline (set at sign-up, never
   reset by a confirmation); instalments 2 onward keep their approved dates.
   Seat (DP's one status, dpSeat): reserved until instalment 1 is settled with the deposit confirmed — then secured (financial position
   only; admission is decided separately). If the hold ends first, the existing DP release applies (P-32: no refund, forfeit or
   reinstatement; history kept). A refund of the deposit puts the seat under Finance review (PD-DP-12). Once secured, instalments 2
   onward follow the overdue process (fi-ledger fiRowLate). Supersedes, for this route only, PD-DP-10's "the whole balance within the
   hold"; the deposit-and-balance route stays as it was.
   Order: instalment 1 is paid after the deposit is confirmed (the deposit is credited to it) — Finance and the learner can't take it
   before. A deposit larger than payment 1 isn't offered with instalments (no rule for the excess — client question).
   ============================================================ */
const fcIsDI = pl => !!pl && pl.depRoute === 'inst';
// The schedules a deposit can precede for this learner now (approved options with more than one payment)
function fcDIOpts(w) {
  const P = w && w.signup && !w.signup.done && cb9Pin(w); if (!P || chSponsored(w) || !cb9DepOk(w)) return [];
  const dep = P.dep.eff != null ? P.dep.eff : S4().cfg.deposit;
  return P.opt.pay.filter(x => x.k > 1).map(x => {
    const s = cb9Plan(w, x.k), r1 = s.rows && s.rows[0];
    const why = s.why || (s.late ? 'Not available after the batch has started.' : '') || (fpP(dep) > fpP(r1.amount) ? `The deposit (${money(dep, 'GBP')}) is more than payment 1 (${money(r1.amount, 'GBP')}), so it can't be combined with ${x.k} payments.` : '');
    return { k: x.k, s, dep, why };
  });
}
const fcDIHold = () => new Date(now().getTime() + chHoldDays() * DAY).toISOString(); // the hold a deposit paid now would get (ch-b2 chComplete)
function fcDISched(o) {
  const hold = fcDIHold(), r1 = o.s.rows[0], rest = fpP(r1.amount) - fpP(o.dep), tot = o.s.rows.reduce((a, r) => a + fpP(r.amount), 0);
  return `<div class="cb9-sched fc-di-sched"><h3 class="small">Your payment schedule — deposit, then ${o.k} payments</h3><div class="tbl-wrap"><table class="tbl dense cb9-rows"><thead><tr><th>Payment</th><th>Due</th><th class="r">Amount</th><th class="r">You pay</th></tr></thead><tbody>
    <tr data-n="dep"><td>Deposit</td><td>Now</td><td class="r num">${money(o.dep, 'GBP')}</td><td class="r num">${money(o.dep, 'GBP')}</td></tr>
    <tr data-n="1"><td>Payment 1</td><td class="nowrap">By ${esc(fd(hold))} <span class="xs muted">(seat hold)</span></td><td class="r num">${money(r1.amount, 'GBP')}</td><td class="r num">${money(fpM(rest), 'GBP')} <span class="xs muted">after the ${money(o.dep, 'GBP')} deposit</span></td></tr>
    ${o.s.rows.slice(1).map(r => `<tr data-n="${r.n}"><td>Payment ${r.n}</td><td class="nowrap">${esc(cbFd(r.due))}</td><td class="r num">${money(r.amount, 'GBP')}</td><td class="r num">${money(r.amount, 'GBP')}</td></tr>`).join('')}
    <tr><td class="strong">Total</td><td></td><td class="r num strong">${money(fpM(tot), 'GBP')}</td><td class="r num strong">${money(fpM(tot), 'GBP')}</td></tr></tbody></table></div>
    <p class="xs muted">The deposit is part of the ${money(fpM(tot), 'GBP')} fee, not an extra charge. Your seat is held until ${esc(fd(hold))}; it is secured once payment 1 is paid in full by then. If it isn't, the seat is released. Payments 2–${o.k} are due on their dates.</p></div>`;
}
const _spFC = chStepPay;
chStepPay = function (w) {
  const c = ui('cb9Pay', undefined), m = /^dep(\d+)$/.exec(c || ''), opts = fcDIOpts(w);
  if (!opts.length) return _spFC.apply(this, arguments);
  const sel = m && opts.find(o => o.k === +m[1] && !o.why);
  if (sel) setUi('cb9Pay', 'deposit'); // the deposit route's amount, method, reference and button
  let h; try { h = _spFC.apply(this, arguments); } finally { if (sel) setUi('cb9Pay', c); }
  const k = h.indexOf('name="cb9-pay" value="deposit"'); if (k < 0) return h;
  if (sel) h = h.replace(/(name="cb9-pay" value="deposit") checked/, '$1');
  const e = h.indexOf('</label>', k) + 8;
  const html = opts.map(o => { const r1 = o.s.rows && o.s.rows[0], on = sel && sel.k === o.k;
    return `<label class="check cb9-opt fc-di"><input type="radio" name="cb9-pay" value="dep${o.k}" ${on ? 'checked' : ''} ${o.why ? 'disabled' : ''} data-onchange="cb9Pay"><span><strong>Deposit, then ${o.k} payments — ${money(o.dep, 'GBP')} now</strong><br>${o.why ? `<span class="small" style="color:var(--red)">${esc(o.why)}</span>` : `<span class="small muted">The deposit is credited to payment 1: ${money(fpM(fpP(r1.amount) - fpP(o.dep)), 'GBP')} more by the end of the ${chHoldDays()}-day seat hold, then ${o.k - 1} payments of the approved schedule. Total ${money(o.s.total, 'GBP')}.</span>`}</span></label>${on ? fcDISched(o) : ''}`; }).join('');
  return h.slice(0, e) + html + h.slice(e);
};
// Paying: the deposit route's checkout; the schedule is fixed when the sign-up completes
const _suFC = ACT.suPay;
ACT.suPay = el => {
  const w = W, c = ui('cb9Pay', ''), m = /^dep(\d+)$/.exec(c || '');
  if (!w || !w.signup || w.signup.done || !m) { if (w && w.signup && !w.signup.done) delete w.signup.depInst; return _suFC(el); }
  const o = fcDIOpts(w).find(x => x.k === +m[1]); if (!o || o.why) { render(); toast(o ? o.why : 'That payment option isn\'t available.', 'err'); return; }
  w.signup.depInst = o.k; setUi('cb9Pay', 'deposit');
  try { return _suFC(el); } finally { setUi('cb9Pay', c); }
};
const _ccFCd = chComplete;
chComplete = function (w, o) {
  const k = w && w.signup && w.signup.depInst, r = _ccFCd.apply(this, arguments);
  if (!k || !o || o.opt !== 'deposit' || !w.signup.done) return r;
  delete w.signup.depInst;
  const pl = fpPl(w), P = cb9Pin(w), s = P && cb9Plan(w, k), who = `${chFullName(w)} (${w.me.id})`;
  if (!pl || !pl.deposit || !s || s.why) { logA('Finance', who, 'Deposit then instalments — schedule not fixed', '—', 'Deposit and balance kept', (s && s.why) || 'No approved schedule'); return r; }
  const d = pl.deposit, hold = d.hold, at = (w.signup.pay && w.signup.pay.at) || now().toISOString();
  pl.rows = s.rows.map(x => { const due = cb9Iso(x.due); return { n: x.n, amount: x.amount, due: x.n === 1 && hold && new Date(hold) < new Date(due) ? hold : due, sched: cb9Iso(x.sched), status: 'Pending', paid: 0, ...(x.n === 1 ? { byHold: true } : {}) }; });
  const pin = e1Freeze({ pid: P.pid, planV: P.planV, rule: P.rule, dur: P.dur, optId: P.opt.id, optLabel: P.opt.label, mode: P.opt.mode, fee: P.opt.fee, k, anchor: s.S, enrolledOn: s.J, at, route: 'deposit-instalments',
    dep: { amount: d.amount, holdDays: chHoldDays(), hold, creditTo: 1 },
    rows: s.rows.map((x, i) => ({ n: x.n, amount: x.amount, pence: x.pence, due: i ? x.due : cbYmdOf(pl.rows[0].due), sched: x.sched })), obs: { req: P.obsReq, wp: P.opt.obsWp, off: P.opt.obsOff } });
  Object.assign(pl, { plan: 'Instalments', depRoute: 'inst', depBasis: 'gross', total: P.opt.fee, pin, revs: [] });
  w.signup.pin = pin; if (w.signup.pay) w.signup.pay.depInst = k;
  fpCredit(w, 'Deposit paid at sign-up'); fcDISync(w);
  logA('Admissions', who, 'Payment schedule fixed (deposit, then instalments)', '—', `${P.opt.label} · deposit ${money(d.amount, 'GBP')} credited to payment 1 · payment 1 ${money(fpM(fpP(s.rows[0].amount) - fpP(d.amount)), 'GBP')} by ${fd(hold)} (seat hold) · ${pin.rows.slice(1).map(x => `${money(x.amount, 'GBP')} ${cbFd(x.due)}`).join(', ')} · plan v${P.planV}`, 'PD-FC-11');
  return r;
};
// The admission card's figures follow the plan; the hold ends once the seat is secured (financial position only)
function fcDISync(w) {
  const pl = dpHoldPl(w), ad = w && w.admission && w.admission.deposit; if (!fcIsDI(pl) || !ad) return;
  ad.balance = fpM(pl.rows.reduce((a, r) => a + Math.max(0, fpP(r.amount) - fpP(r.paid)), 0));
  const x = dpSeat(w); if (x.st === 'occupied' && ad.holdUntil && !ad.released) { ad.holdUntil = null; ad.securedAt = ad.securedAt || now().toISOString(); }
}
const _fsdFC = fpSyncDep; fpSyncDep = function (w) { const r = _fsdFC.apply(this, arguments); fcDISync(w); return r; };
// The seat: reserved until instalment 1 is settled with the deposit confirmed; then secured — once secured, the hold no longer applies
const _dsFC = dpSeat;
dpSeat = function (w) {
  const pl = dpHoldPl(w); if (!fcIsDI(pl)) return _dsFC.apply(this, arguments);
  const s = w.signup, d = pl.deposit; if (!s) return { st: 'none' };
  if (chReleased(w) && !(s.again && s.done)) return { st: 'released', batch: s.releasedFrom, hold: d.hold, dep: d };
  if (!s.done) return { st: 'none' };
  const r1 = pl.rows[0], due1 = r1 ? Math.max(0, fpP(r1.amount) - fpP(r1.paid)) : 0, back = fpRefunded(d) || fpP(d.refundedPart) > 0;
  if (!due1 && d.status === 'Paid' && !back) { if (!pl.securedAt) { pl.securedAt = dpNow().toISOString(); logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Seat secured', 'Seat reserved', 'Seat secured — instalment 1 paid', `Deposit and instalment 1 paid by the seat-hold deadline ${fdt(d.hold)}; payments 2 onward follow their dates (PD-FC-11). Admission is decided separately.`); } return { st: 'occupied', batch: s.batch, converted: true, inst: true }; }
  if (!pl.securedAt && d.hold && dpNow() >= new Date(d.hold)) return { st: 'expired', batch: s.batch, hold: d.hold, dep: d, inst: true }; // DP: an ended hold is released first
  if (back) return { st: 'review', batch: s.batch, hold: d.hold, dep: d, why: fpRefunded(d) ? 'the deposit was refunded' : 'the deposit was partly refunded', inst: true };
  return { st: 'reserved', batch: s.batch, hold: d.hold, dep: d, pending: d.status !== 'Paid', due: fpM(due1), inst: true };
};
const _dstFC = dpSeatTxt;
dpSeatTxt = function (w, who) {
  const pl = dpHoldPl(w), x = dpSeat(w); if (!fcIsDI(pl)) return _dstFC.apply(this, arguments);
  const you = who === 'learner', adm = ` Admission is decided separately (currently: ${dpAdm(w)}).`, k = pl.rows.length, r1 = pl.rows[0];
  if (x.st === 'reserved') return `Reserved in ${x.batch} until ${fdt(x.hold)} — not yet a secured place: ${x.pending ? 'the deposit is awaiting confirmation by Finance, and ' : ''}${money(x.due, 'GBP')} of instalment 1 is unpaid${x.pending ? '' : ` (the ${money(pl.deposit.amount, 'GBP')} deposit is credited to it)`}. ${you ? 'Pay it' : 'It must be paid'} by then, or the seat is released. Instalments 2–${k} are due on their dates.${adm}`;
  if (x.st === 'occupied') return `Seat secured in ${x.batch} — the deposit and instalment 1 are paid. Instalments 2–${k} are due on their dates. This is the payment position only.${adm}`;
  if (x.st === 'review') return `Reserved in ${x.batch} until ${fdt(x.hold)} — Finance review required: ${x.why}. ${pl.securedAt ? 'Instalment 1 has an amount to pay again once Finance resolves it.' : 'No payment can be taken toward this seat until Finance resolves it.'}${adm}`;
  return _dstFC.apply(this, arguments).replace(/the balance/g, 'instalment 1');
};
// Order: instalment 1 after the deposit is confirmed (Finance and the learner)
const fcDIWait = (pl, r) => (fcIsDI(pl) && r && r.n === 1 && pl.deposit && pl.deposit.status !== 'Paid' && !fpRefunded(pl.deposit) ? 'Instalment 1 is paid after the deposit is confirmed — the deposit is credited to it. The deposit is still awaiting confirmation by Finance.' : '');
const _ptFCd = payTargets;
payTargets = function () { return _ptFCd.apply(this, arguments).filter(t => !(t.r && t.pl && fcDIWait(t.pl, t.r))); };
const _rpFCd = recordPayment;
recordPayment = function (t) { const why = t && t.r && t.pl && fcDIWait(t.pl, t.r); if (why) return fiNo(t.key || '—', 'instalment 1 before the deposit', why); return _rpFCd.apply(this, arguments); };
const fcDIRow = el => { const pl = W && (W.plans || []).find(p => p.e === el.dataset.e); return pl && { pl, r: pl.rows.find(x => x.n === +el.dataset.n) }; };
['payInst', 'chPayBank'].forEach(n => { const f = ACT[n]; ACT[n] = el => { const o = fcDIRow(el), why = o && fcDIWait(o.pl, o.r); if (why) { render(); toast(why, 'err'); return; } return f(el); }; });
const _pcFCd = planCard;
planCard = function (pl) {
  let h = _pcFCd.apply(this, arguments); if (!fcIsDI(pl)) return h;
  if (fcDIWait(pl, pl.rows[0])) h = h.replace(new RegExp(`<button class="btn btn-sm" data-act="payInst" data-e="${pl.e}" data-n="1">Pay now</button>( <button class="btn btn-sm" data-act="chPayBank"[^>]*data-n="1"[^>]*>[^<]*</button>)?`), '<span class="xs muted">After the deposit is confirmed</span>');
  return h;
};
// A row's "Paid" shows the money paid on it, with the deposit credit beside it — never as a second cash payment
const fcCashCell = (h, pl, rowStart, cell) => { pl.rows.filter(r => fpP(r.credit) > 0).forEach(r => { const i = h.indexOf(rowStart(r)); if (i < 0) return; const old = cell(r.paid), j = h.indexOf(old, i); if (j < 0) return; const cash = fpM(fpP(r.paid) - fpP(r.credit)); h = h.slice(0, j) + cell(cash, true).replace(/<\/td>$/, `<div class="xs muted fc-crd">+ ${money(r.credit, 'GBP')} deposit credit</div></td>`) + h.slice(j + old.length); }); return h; };
const _pcFCc = planCard;
planCard = function (pl) { const h = _pcFCc.apply(this, arguments); return pl && pl.deposit ? fcCashCell(h, pl, r => `<td class="num">${r.n}</td>`, (v, z) => `<td class="r num">${v || !z ? money(v, pl.cur || 'GBP') : '—'}</td>`) : h; };
const _flFCc = SCREENS['f-learner'];
SCREENS['f-learner'] = p => { let h = _flFCc(p); if (!p || p.tab !== 'payments') return h; const w = fiWOf(p.id); if (!w) return h; fiLive(w).filter(pl => pl.deposit).forEach(pl => { h = fcCashCell(h, pl, r => `<tr><td>${r.n}</td>`, (v, z) => `<td class="r">${v || !z ? amt(v, 'GBP') : '—'}</td>`); }); return h; };
// PD-FC-14: a batch start change (or a move) never moves instalment 1 off the seat-hold deadline, and the hold itself is never changed.
// CB9 revises the unpaid dates of a pinned schedule (PD-CB-10); on this route instalment 1 is held fixed while that runs (it counts as
// paid only once the deposit credit lands, so a pending bank deposit would otherwise let it move). The signed terms are not altered.
// An administrative impact review of such a change is an outstanding requirement (not built): it is recorded in the audit log.
const _crFC = cb9Revise;
cb9Revise = function (w) {
  const pl = cb9Pl(w), r1 = fcIsDI(pl) && pl.rows[0]; if (!r1) return _crFC.apply(this, arguments);
  const due0 = r1.due, p0 = r1.paid, n0 = (pl.revs || []).length; r1.paid = fpM(fpP(p0)) || 1e-9;
  try { return _crFC.apply(this, arguments); } finally {
    r1.paid = p0; r1.due = due0;
    if ((pl.revs || []).length > n0) logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Batch date changed — deposit route: impact review needed', `Instalment 1 due ${fd(due0)} (seat hold)`, `Instalment 1 and the seat hold unchanged; later unpaid dates revised (PD-CB-10)`, 'PD-FC-14: the hold deadline and signed terms are kept; an administrative impact review is an outstanding requirement');
  }
};
// Wording: one sentence on how the deposit counts (gross basis: instalment 1)
const _fdtFC = fpDepTxt;
fpDepTxt = function (pl, who) {
  const L = fpLedger(pl); if (L.basis !== 'gross') return _fdtFC.apply(this, arguments);
  const m = x => money(x, 'GBP'), r1 = pl.rows[0], cr = fpP(r1 && r1.credit), rv = pl.depReview;
  if (L.st === 'refunded') return `Deposit ${m(L.dep)} refunded — it no longer counts towards the programme fee and is no longer credited to instalment 1.`;
  if (L.st !== 'paid') return `Deposit ${m(L.dep)} not paid yet (awaiting confirmation by Finance) — until then nothing is taken off. Once confirmed it is credited to instalment 1 (${m(r1.amount)}), so ${m(fpM(fpP(r1.amount) - fpP(L.dep)))} of it remains. It is part of the ${m(L.fee)} fee, never an extra charge.`;
  return `Deposit ${m(L.dep)} paid and credited to instalment 1 (${m(fpM(cr))}) — part of the ${m(L.fee)} fee, never charged again.${rv ? ` Finance review: ${m(rv.amount)} of the deposit isn't allocated to an instalment (${rv.why}).` : ''}`;
};
// Finance → Deposits: the seat state names the route
const _ddrFCd = dpDepRowOf;
dpDepRowOf = function (v, pl, hist) { const r = _ddrFCd.apply(this, arguments); if (fcIsDI(pl) && r.status === 'Balance paid') r.status = 'Seat secured — instalment 1 paid'; if (pl.depReview) r.status += ' · Finance review (deposit credit)'; return r; };
['payInst', 'chPayBank', 'payBalance', 'suPay'].forEach(k => { const f = ACT[k]; if (typeof f === 'function') ACT[k] = function () { dpReconcile(); return f.apply(this, arguments); }; });

/* ---------- Records ---------- */
UXC.push(['FC', 'Finance client feedback — deposit credit, course and batch filters, ledger and persistence (1 Nov 2026)', [
  'Deposit credit: a deposit is confirmed only by its full amount and counts once confirmed; it is credited once to the first scheduled payment, never as a second cash payment. On the deposit-and-balance route that payment is the balance (fee − deposit). A refund, in full or in part, takes back the credit no longer held; a deposit that cannot be credited to instalment 1 is held and flagged for Finance review (PD-FC-12).',
  'Sign-up (PD-FC-11): "Deposit, then N payments" for each approved payment option. The learner sees the whole schedule first (deposit now, payment 1 less the deposit by the seat-hold date, payments 2–N on their dates, the fee as the total). The seat is reserved until instalment 1 is paid with the deposit confirmed, then secured; if the hold ends first, it is released as on the deposit route. Later instalments follow their dates and the overdue process. Instalment 1 cannot be paid before the deposit is confirmed.',
  'Finance → Deposits and Reports → Deposits show, per learner: programme, batch, deposit, date and amount received, confirmation, the amount credited to the first payment and what remains of it, and refunds / Finance review. The later payment is its own ledger transaction, never a second deposit.',
  'Course and batch filters (by programme ID and batch code; the batch list follows the course; "Not batch-specific" for short courses and bundles) on the Ledger, Finance Reports (datewise, coursewise with a by-batch table, overdue ageing, refunds, deposits, waivers), Deposits, Overdue & Access, Refunds, Learner Accounts and the admin console\'s Finance ledger and reports. Totals, rows and export names follow them. A payment keeps the batch it was made in.',
  'Transaction Ledger: course type, course and batch on every row, quick course-type buttons (Short courses…), search by learner or course, bank transfers awaiting confirmation listed but not counted, and a footer with received, refunded, net and pending.',
  'Prototype persistence: the client demo is saved in this browser after every change and restored after a refresh — the whole data set at once. Reset demo deletes it; legacy test data and developer-mode changes are never saved; a copy that can\'t be read or is from an earlier version is discarded with a notice.']]);
