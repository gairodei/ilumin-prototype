/* ============================================================
   SA-FINAL E — batchwise finance reports (SA-07), reports and analytics charts (SA-08). PD-SAF-E-* in PROVISIONAL-DECISIONS.md.
   1. Finance → Reports gets its own "Batchwise" tab (Super and Finance share the screen). It reads the same ledger read model
      (fiLedger), the same balances (fiObligations) and overdue rows (odRows) as Coursewise, grouped by the batch each payment
      belongs to. Agency bundles stay on their own "not attributed to a batch" row (PD-FC-06). "Payers" becomes "Learners (paid or owing)".
   2. Reports & Analytics: an Overview tab of simple charts counted from the stored records, each with a table view and totals. The
      fixed figures (staff marking numbers, the 86% attendance, the formula competency split, seeded completion rates) are replaced by
      counts from the records, or by "not available" where the prototype holds no such records.
   3. allSubmissions also reads the client demo learners (Pending markings, a-records), not only legacy worlds C and D.
   No record is changed by anything here: these are read-only views (the only handlers keep screen filters).
   ============================================================ */
'use strict';

/* ---------- 3. Assignment records of every learner account (defect #13) ----------
   The legacy reader covers worlds C and D only. Every other learner account with an NVQ enrolment and assignment records is added;
   the seeded legacy variants A–H keep their earlier behaviour (B is another view of a legacy person). */
const _asSAE = allSubmissions;
allSubmissions = function () {
  const out = _asSAE.apply(this, arguments), seen = new Set(out.map(s => s.v));
  learnerAccounts().filter(v => !seen.has(v) && !/^[A-H]$/.test(v)).forEach(v => {
    const w = STORE.worlds[v]; if (!w || !w.flags || !w.flags.nvq || !(w.assignments || []).length) return;
    const bk = chBatchCodeOfW(w) || '', b = (ADMIN.batches || []).find(x => x.code === bk);
    w.assignments.forEach(a => {
      const held = typeof relStore === 'function' && relStore()[relKeyOfWorld(v, a.id)];
      out.push({ id: v + '-' + a.id, v, a, learner: VNAME(v), programme: (w.nvq && w.nvq.title) || '', batch: bk || '—', assessor: a.assessor || (b && (b.assessors || [])[0]) || '—', status: held ? 'Awaiting release' : a.status, round: a.round, overdue: !!a.closed, at: a.submittedAt });
    });
  });
  return out;
};

/* ---------- Read helpers (records only) ---------- */
const SAE_AGENCY = '__agency__';
const saeBatches = () => (ADMIN.batches || []).filter(b => !b.short);
const saeLive = () => saeBatches().filter(b => b.status !== 'Cancelled');
const saeWorldsOf = code => learnerAccounts().map(v => STORE.worlds[v]).filter(w => w && w.flags && w.flags.nvq && chBatchCodeOfW(w) === code);
const saeFinOk = () => (typeof isSA === 'function' && isSA()) || (typeof isSys === 'function' && isSys());
const saeN = n => Number(n || 0).toLocaleString('en-GB');
const saePct = (a, b) => b ? Math.round(a / b * 100) : null;
// Assignment status groups (the learner record's status)
const SAE_AG = [['marked', 'Marked', 'var(--sae-1)'], ['sub', 'Submitted, awaiting marking', 'var(--sae-3)'], ['resub', 'Resubmission required', 'var(--sae-2)'], ['ns', 'Not submitted yet', 'var(--sae-0)']];
const saeAgOf = st => /^(Completed|Feedback Received|Passed|Pass|Failed|Fail|Achieved|Not Achieved)$/i.test(st || '') ? 'marked' : /Resubmission/i.test(st || '') ? 'resub' : /Submitted|Under Review|Awaiting release/i.test(st || '') ? 'sub' : 'ns';
function saeAsgOf(code) {
  const c = { marked: 0, sub: 0, resub: 0, ns: 0, n: 0, learners: 0 };
  saeWorldsOf(code).forEach(w => { const xs = w.assignments || []; if (xs.length) c.learners++; xs.forEach(a => { c[saeAgOf(a.status)]++; c.n++; }); });
  return c;
}
function saeObsOf(code) { const c = { n: 0, done: 0 }; saeWorldsOf(code).forEach(w => (w.observations || []).forEach(o => { c.n++; if (o.status === 'Completed') c.done++; })); return c; }
// Attendance: only the session registers recorded in the prototype (N4); nothing is estimated
function saeAtt() {
  const by = {}, add = (code, st) => { const r = by[code] = by[code] || { code, att: 0, partial: 0, absent: 0, n: 0 }; r.n++; if (st === 'Present' || st === 'Late') r.att++; else if (st === 'Partial') r.partial++; else r.absent++; };
  const ss = typeof s4bAllSess === 'function' ? s4bAllSess() : [];
  ss.forEach(s => { const reg = typeof n4Reg === 'function' && n4Reg(s.id); if (!reg) return; Object.values(reg.rows || {}).forEach(r => add((typeof n4BatchOfLidIn === 'function' && n4BatchOfLidIn(s, r.lid)) || s.batch, r.status)); });
  const rows = Object.values(by).sort((a, b) => a.code.localeCompare(b.code));
  return { rows, n: rows.reduce((a, r) => a + r.n, 0), att: rows.reduce((a, r) => a + r.att, 0), sessions: ss.length, regs: ss.filter(s => typeof n4Reg === 'function' && n4Reg(s.id) && Object.keys(n4Reg(s.id).rows || {}).length).length };
}
// Enrolment records with their enrolment date (learner accounts and the admin learner list)
function saeEnrols() {
  const out = [], byId = new Map(learnerAccounts().map(v => [STORE.worlds[v].me.id, STORE.worlds[v]]));
  allLearners().forEach(l => {
    const w = (l.v && STORE.worlds[l.v]) || byId.get(l.id);
    if (w) (w.enrolments || []).forEach(e => out.push({ lid: l.id, title: e.base || e.title || '', type: e.kind === 'nvq' ? 'NVQ programme' : 'Short course', status: e.status || '', at: e.enrolled || '' }));
    else (l._enr || []).forEach(e => out.push({ lid: l.id, title: e.title || '', type: /NVQ|RQF/.test(e.type || '') ? 'NVQ programme' : 'Short course', status: e.status || '', at: e.enrolled || e.start || '' }));
  });
  return out;
}
const saeMonthL = m => new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-15T12:00:00Z'));

/* ---------- 1. Batchwise finance (SA-07): the Coursewise aggregation, one row per batch ---------- */
function saeBatchwise(f = fcRepF()) {
  const L = fiLedger(f), ob = f.agency ? [] : fiObligations().filter(o => fcMatch(o, f)), od = f.mode || f.agency ? [] : odRows().filter(o => o.status !== 'discontinued').map(o => ({ ...o, m: fcOdMeta(o) })).filter(o => fcMatch(o.m, f));
  const keyOf = x => x.bk || (x.ctype === 'Agency bundle' ? SAE_AGENCY : FC_NB);
  const bs = saeBatches().filter(b => !f.agency && (!f.cid || fcProgOfBatch(b) === f.cid) && (!f.ct || f.ct === 'NVQ programme') && (!f.bk || f.bk === b.code));
  const keys = [...new Set(bs.map(b => b.code).concat(L.rows.map(keyOf), f.mode ? [] : ob.filter(o => o.outstanding).map(keyOf)))];
  const rows = keys.map(k => {
    const e = L.rows.filter(x => keyOf(x) === k), s = q => e.filter(x => x.kind === q).reduce((a, x) => a + x.p, 0), o = f.mode ? [] : ob.filter(x => keyOf(x) === k), b = bs.find(x => x.code === k) || saeBatches().find(x => x.code === k);
    const rec = s('receipt'), back = s('refund');
    return { k, b, l: k === SAE_AGENCY ? 'Agency bundles' : k === FC_NB ? 'Not batch-specific' : b ? chBatchLbl(b) : k, course: b ? b.course : k === SAE_AGENCY ? 'Bundle purchases — not attributed to a batch' : k === FC_NB ? 'Short courses and other payments' : '—',
      enrolled: b ? +b.enrolled || 0 : null, cap: b ? +b.cap || 0 : null, rec, back, net: rec - back, out: o.reduce((a, x) => a + x.outstanding, 0), od: od.filter(x => keyOf(x.m) === k).reduce((a, x) => a + fpP(x.amount), 0) };
  }).sort((a, z) => (a.b ? 0 : a.k === FC_NB ? 1 : 2) - (z.b ? 0 : z.k === FC_NB ? 1 : 2) || String((a.b || {}).start || '').localeCompare(String((z.b || {}).start || '')) || a.l.localeCompare(z.l));
  const tot = k => rows.reduce((a, r) => a + (r[k] || 0), 0);
  return { rows, L, T: { rec: tot('rec'), back: tot('back'), net: tot('net'), out: tot('out'), od: tot('od'), enrolled: tot('enrolled'), cap: tot('cap') } };
}
function saeBwSection(f = fcRepF()) {
  const { rows, T, L } = saeBatchwise(f);
  if (!rows.length) return emptyState({ icon: 'chart', title: 'No batch matches these filters', why: fcAny(f) ? `Filters: ${fcFTxt(f)}.` : 'No batch is on record.' });
  const ls = r => r.b ? `<span class="num">${r.enrolled} / ${r.cap}</span><div class="xs muted">${saePct(r.enrolled, r.cap) === null ? '' : saePct(r.enrolled, r.cap) + '% of seats'}</div>` : '<span class="xs muted">—</span>';
  const mrows = rows.filter(r => r.net || r.out);
  return `<section class="card fi-rep sae-bw" data-received="${T.rec}" data-refunded="${T.back}" data-net="${T.net}" data-outstanding="${T.out}" data-overdue="${T.od}" data-enrolled="${T.enrolled}" data-cap="${T.cap}" data-ledger-received="${L.received}" data-ledger-refunded="${L.refunded}">
    <div class="kpis sae-kpis">${kpi('Received', fiG(T.rec))}${kpi('Refunded', (T.back ? '−' : '') + fiG(T.back))}${kpi('Net received', fiG(T.net))}${kpi('Outstanding now', fiG(T.out))}${kpi('Overdue now', fiG(T.od))}${kpi('Seats filled', T.cap ? `${T.enrolled} / ${T.cap}` : '—', T.cap ? saePct(T.enrolled, T.cap) + '% of capacity' : 'No batch in these filters')}</div>
    ${mrows.length ? saeChartMoney(mrows, 'Net received and outstanding by batch', 'Received in the period, less refunds · outstanding is today\'s balance') : ''}
    <div class="tbl-wrap"><table class="tbl dense sae-bw-tbl"><thead><tr><th>Batch</th><th>Course</th><th class="r">Learners / seats</th><th class="r">Received</th><th class="r">Refunded</th><th class="r">Net</th><th class="r">Outstanding now</th><th class="r">Overdue now</th></tr></thead><tbody>
    ${rows.map(r => `<tr data-k="${esc(r.k)}"><td>${r.b ? `<span class="mono small">${esc(r.l)}</span>${r.b.status ? `<div class="xs muted">${esc(r.b.status)}</div>` : ''}` : `<strong class="small">${esc(r.l)}</strong>`}</td><td class="small">${esc(r.course)}</td><td class="r">${ls(r)}</td><td class="r num">${fiG(r.rec)}</td><td class="r num">${fiG(r.back)}</td><td class="r num">${fiG(r.net)}</td><td class="r num">${fiG(r.out)}</td><td class="r num">${fiG(r.od)}</td></tr>`).join('')}
    <tr class="sae-tot"><td class="strong">Total</td><td></td><td class="r strong num">${T.cap ? `${T.enrolled} / ${T.cap}` : '—'}</td><td class="r num strong">${fiG(T.rec)}</td><td class="r num strong">${fiG(T.back)}</td><td class="r num strong">${fiG(T.net)}</td><td class="r num strong">${fiG(T.out)}</td><td class="r num strong">${fiG(T.od)}</td></tr></tbody></table></div>
    <p class="xs muted">From the ledger and the learners' payment plans — the same figures as Coursewise and the Ledger. Received and refunded are for the period chosen; outstanding and overdue are today's balances. A payment stays with the batch it was made in; a refund counts against the batch of the payment it refunds. Learners / seats is the batch's enrolled learners against its capacity. Agency bundle purchases are never attributed to a batch: a bundle's seats aren't tied to one, so they have their own row. Short-course payments are not batch-specific.</p></section>`;
}
// Coursewise: the "Payers" column counted learners who owe but have paid nothing — say what it counts
const _cwSAE = fiRepCoursewise;
fiRepCoursewise = function () { const h = _cwSAE.apply(this, arguments); return typeof h === 'string' ? h.split('<th class="r">Payers</th>').join('<th class="r" title="Learners who paid in the period or owe a balance now">Learners (paid or owing)</th>') : h; };
// The tab, next to Coursewise, on every Finance Reports tab
const saeFrTab = (h, cur) => h.replace(/<button class="tab" role="tab" aria-selected="(true|false)" data-go="f-reports"\s+data-tab="coursewise">Coursewise<\/button>/, (m, sel) => `<button class="tab" role="tab" aria-selected="${cur === 'batchwise' ? 'false' : sel}" data-go="f-reports"  data-tab="coursewise">Coursewise</button><button class="tab" role="tab" aria-selected="${cur === 'batchwise'}" data-go="f-reports"  data-tab="batchwise">Batchwise</button>`);
const _frSAE = SCREENS['f-reports'];
SCREENS['f-reports'] = p => {
  const t = (p && p.tab) || 'datewise';
  if (t !== 'batchwise') { const h = _frSAE(p); return typeof h === 'string' ? saeFrTab(h, t) : h; }
  const h = _frSAE({ ...p, tab: 'coursewise' }); if (typeof h !== 'string') return h;
  const cw = fiRepCoursewise(), k = h.lastIndexOf(cw), body = saeBwSection(fcRepF());
  return saeFrTab((k >= 0 ? h.slice(0, k) + body + h.slice(k + cw.length) : h + body).split('Finance report — coursewise').join('Finance report — batchwise'), 'batchwise');
};

/* ---------- Charts: plain HTML bars, a table view and totals for each (no library; the totals are data attributes) ---------- */
const saeLegend = items => `<div class="sae-legend xs">${items.map(([l, c]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join('')}</div>`;
const saeFig = (id, title, sub, inner, tbl, data = '') => `<figure class="sae-chart" data-chart="${id}" ${data}><figcaption><strong>${esc(title)}</strong>${sub ? `<span class="xs muted">${sub}</span>` : ''}</figcaption>${inner}<details class="sae-tbl"><summary class="small">Show as a table</summary><div class="tbl-wrap">${tbl}</div></details></figure>`;
const saeSegs = (segs, scale) => segs.filter(s => s[1] > 0).map(([l, v, c]) => `<span class="sae-seg" style="width:${(v / scale * 100).toFixed(2)}%;background:${c}" title="${esc(l)}: ${esc(String(v))}"></span>`).join('');
// Enrolments by month (enrolment date)
function saeChartEnrol() {
  const es = saeEnrols().filter(e => e.at), by = {}; es.forEach(e => { const m = e.at.slice(0, 7); by[m] = (by[m] || 0) + 1; });
  const ms = Object.keys(by).sort(), max = Math.max(1, ...ms.map(m => by[m])), days = new Set(es.map(e => e.at.slice(0, 10)));
  if (!es.length) return saeFig('enrol', 'Enrolments by month', '', emptyState({ icon: 'chart', title: 'No enrolment records with a date' }), '', 'data-total="0" data-table-total="0"');
  const note = days.size === 1 ? `All ${es.length} enrolment${es.length === 1 ? ' was' : 's were'} recorded on ${fd([...days][0])} — there is no trend yet.` : `${es.length} enrolment records, by the month of their enrolment date.`;
  const cols = `<div class="sae-cols" role="img" aria-label="Enrolments by month: ${ms.map(m => saeMonthL(m) + ' ' + by[m]).join(', ')}">${ms.map(m => `<div class="sae-col" title="${saeMonthL(m)}: ${by[m]}"><span class="xs num">${ms.length <= 12 || by[m] === max ? by[m] : ''}</span><span class="sae-colbar" style="height:${(by[m] / max * 100).toFixed(1)}%"></span><span class="xs muted sae-coll">${saeMonthL(m).replace(/ (\d\d)(\d\d)$/, ' $2')}</span></div>`).join('')}</div>`;
  const tbl = `<table class="tbl dense"><thead><tr><th>Month</th><th class="r">Enrolments</th></tr></thead><tbody>${ms.map(m => `<tr><td>${saeMonthL(m)}</td><td class="r num">${by[m]}</td></tr>`).join('')}<tr class="sae-tot"><td class="strong">Total</td><td class="r strong num">${es.length}</td></tr></tbody></table>`;
  return saeFig('enrol', 'Enrolments by month', esc(note), cols, tbl, `data-total="${ms.reduce((a, m) => a + by[m], 0)}" data-table-total="${es.length}"`);
}
// Batch occupancy: enrolled against capacity
function saeChartOcc(bs = saeLive()) {
  if (!bs.length) return saeFig('occupancy', 'Batch occupancy', '', emptyState({ icon: 'chart', title: 'No batches yet' }), '', 'data-total="0" data-table-total="0"');
  const en = bs.reduce((a, b) => a + (+b.enrolled || 0), 0), cap = bs.reduce((a, b) => a + (+b.cap || 0), 0);
  const rows = `<ul class="sae-rows">${bs.map(b => `<li class="sae-row"><span class="sae-lbl small"><span class="mono">${esc(b.code)}</span> <span class="xs muted">${esc(b.status || '')}</span></span><span class="sae-track sae-cap" role="img" aria-label="${esc(b.code)}: ${+b.enrolled || 0} enrolled of ${+b.cap || 0} seats">${saeSegs([['Enrolled', Math.min(+b.enrolled || 0, +b.cap || 0), 'var(--sae-1)']], Math.max(1, +b.cap || 0))}</span><span class="sae-val small num">${+b.enrolled || 0} / ${+b.cap || 0}</span></li>`).join('')}</ul>`;
  const tbl = `<table class="tbl dense"><thead><tr><th>Batch</th><th>Course</th><th class="r">Enrolled</th><th class="r">Capacity</th><th class="r">Filled</th></tr></thead><tbody>${bs.map(b => `<tr><td class="mono small">${esc(b.code)}</td><td class="small">${esc(b.course)}</td><td class="r num">${+b.enrolled || 0}</td><td class="r num">${+b.cap || 0}</td><td class="r num">${saePct(+b.enrolled || 0, +b.cap || 0) ?? '—'}${b.cap ? '%' : ''}</td></tr>`).join('')}<tr class="sae-tot"><td class="strong">Total</td><td></td><td class="r strong num">${en}</td><td class="r strong num">${cap}</td><td class="r strong num">${cap ? saePct(en, cap) + '%' : '—'}</td></tr></tbody></table>`;
  return saeFig('occupancy', 'Batch occupancy', 'Enrolled learners against seats (cancelled batches left out)', saeLegend([['Enrolled', 'var(--sae-1)'], ['Free seats', 'var(--sae-track)']]) + rows, tbl, `data-total="${en}" data-table-total="${en}" data-cap="${cap}"`);
}
// Net received and outstanding by batch (rows from saeBatchwise)
function saeChartMoney(rows, title = 'Net received and outstanding by batch', sub = 'Last 6 months received, less refunds · outstanding is today\'s balance — the same figures as Finance → Reports → Batchwise') {
  const net = rows.reduce((a, r) => a + r.net, 0), out = rows.reduce((a, r) => a + r.out, 0), max = Math.max(1, ...rows.map(r => Math.max(0, r.net) + r.out));
  const list = `<ul class="sae-rows">${rows.map(r => `<li class="sae-row"><span class="sae-lbl small">${r.b ? `<span class="mono">${esc(r.l)}</span>` : esc(r.l)}</span><span class="sae-track" role="img" aria-label="${esc(r.l)}: ${fiG(r.net)} net received, ${fiG(r.out)} outstanding">${saeSegs([['Net received ' + fiG(r.net), Math.max(0, r.net), 'var(--sae-1)'], ['Outstanding ' + fiG(r.out), r.out, 'var(--sae-2)']], max)}</span><span class="sae-val small num">${fiG(r.net)} · ${fiG(r.out)}</span></li>`).join('')}</ul>`;
  const tbl = `<table class="tbl dense"><thead><tr><th>Batch</th><th class="r">Net received</th><th class="r">Outstanding now</th></tr></thead><tbody>${rows.map(r => `<tr><td class="small">${esc(r.l)}</td><td class="r num">${fiG(r.net)}</td><td class="r num">${fiG(r.out)}</td></tr>`).join('')}<tr class="sae-tot"><td class="strong">Total</td><td class="r strong num">${fiG(net)}</td><td class="r strong num">${fiG(out)}</td></tr></tbody></table>`;
  return saeFig('money', title, esc(sub), saeLegend([['Net received', 'var(--sae-1)'], ['Outstanding', 'var(--sae-2)']]) + list, tbl, `data-total="${net}" data-total-out="${out}" data-table-total="${net}" data-table-out="${out}"`);
}
// Assignment progress by batch (the learners' assignment records)
function saeChartAsg(bs = saeLive()) {
  const rs = bs.map(b => ({ b, c: saeAsgOf(b.code) })), n = rs.reduce((a, r) => a + r.c.n, 0), marked = rs.reduce((a, r) => a + r.c.marked, 0);
  const list = `<ul class="sae-rows">${rs.map(({ b, c }) => `<li class="sae-row"><span class="sae-lbl small"><span class="mono">${esc(b.code)}</span></span>${c.n ? `<span class="sae-track" role="img" aria-label="${esc(b.code)}: ${SAE_AG.map(([k, l]) => `${c[k]} ${l.toLowerCase()}`).join(', ')}">${saeSegs(SAE_AG.map(([k, l, col]) => [l + ' ' + c[k], c[k], col]), c.n)}</span><span class="sae-val small num">${c.marked} of ${c.n} marked</span>` : '<span class="xs muted sae-none">No assignment records</span>'}</li>`).join('')}</ul>`;
  const tbl = `<table class="tbl dense"><thead><tr><th>Batch</th><th class="r">Learners with records</th>${SAE_AG.map(([, l]) => `<th class="r">${l}</th>`).join('')}<th class="r">Records</th></tr></thead><tbody>${rs.map(({ b, c }) => `<tr><td class="mono small">${esc(b.code)}</td><td class="r num">${c.learners}</td>${SAE_AG.map(([k]) => `<td class="r num">${c[k]}</td>`).join('')}<td class="r num">${c.n}</td></tr>`).join('')}<tr class="sae-tot"><td class="strong">Total</td><td class="r strong num">${rs.reduce((a, r) => a + r.c.learners, 0)}</td>${SAE_AG.map(([k]) => `<td class="r strong num">${rs.reduce((a, r) => a + r.c[k], 0)}</td>`).join('')}<td class="r strong num">${n}</td></tr></tbody></table>`;
  const ob = bs.map(b => saeObsOf(b.code)), on = ob.reduce((a, o) => a + o.n, 0), od = ob.reduce((a, o) => a + o.done, 0);
  const obsLine = `<p class="xs muted sae-obs">${on ? `Observations: ${on} record${on === 1 ? '' : 's'} in these batches, ${od} completed.` : 'Observations: no observation records yet — nothing to chart.'}</p>`;
  return saeFig('assign', 'Assignment progress by batch', 'Each learner\'s assignment records, by status', (n ? saeLegend(SAE_AG.map(([, l, c]) => [l, c])) : '') + list + obsLine, tbl, `data-total="${rs.reduce((a, r) => a + SAE_AG.reduce((s, [k]) => s + r.c[k], 0), 0)}" data-table-total="${n}" data-marked="${marked}"`);
}
// Attendance: only from recorded session registers
function saeChartAtt() {
  const A = saeAtt();
  if (!A.n) return saeFig('attendance', 'Attendance by batch', '', `<div class="empty ds-empty sae-na">${ic('info', 22)}<strong>Not available — no recorded registers</strong><span class="small muted">${A.sessions} session${A.sessions === 1 ? '' : 's'} scheduled; no session register has been recorded yet. Attendance appears here once a register is recorded (Attendance → session register). Nothing is estimated.</span></div>`, '<p class="small muted">No registers recorded.</p>', 'data-total="0" data-table-total="0"');
  const list = `<ul class="sae-rows">${A.rows.map(r => `<li class="sae-row"><span class="sae-lbl small"><span class="mono">${esc(r.code)}</span></span><span class="sae-track" role="img" aria-label="${esc(r.code)}: ${r.att} present or late, ${r.partial} partial, ${r.absent} absent">${saeSegs([['Present or late ' + r.att, r.att, 'var(--sae-1)'], ['Partial ' + r.partial, r.partial, 'var(--sae-3)'], ['Absent ' + r.absent, r.absent, 'var(--sae-2)']], r.n)}</span><span class="sae-val small num">${saePct(r.att, r.n)}% attended</span></li>`).join('')}</ul>`;
  const tbl = `<table class="tbl dense"><thead><tr><th>Batch</th><th class="r">Present or late</th><th class="r">Partial</th><th class="r">Absent</th><th class="r">Register entries</th></tr></thead><tbody>${A.rows.map(r => `<tr><td class="mono small">${esc(r.code)}</td><td class="r num">${r.att}</td><td class="r num">${r.partial}</td><td class="r num">${r.absent}</td><td class="r num">${r.n}</td></tr>`).join('')}<tr class="sae-tot"><td class="strong">Total</td><td class="r strong num">${A.att}</td><td class="r strong num">${A.rows.reduce((a, r) => a + r.partial, 0)}</td><td class="r strong num">${A.rows.reduce((a, r) => a + r.absent, 0)}</td><td class="r strong num">${A.n}</td></tr></tbody></table>`;
  return saeFig('attendance', 'Attendance by batch', `From ${A.regs} recorded session register${A.regs === 1 ? '' : 's'} (learner entries)`, saeLegend([['Present or late', 'var(--sae-1)'], ['Partial', 'var(--sae-3)'], ['Absent', 'var(--sae-2)']]) + list, tbl, `data-total="${A.rows.reduce((a, r) => a + r.att + r.partial + r.absent, 0)}" data-table-total="${A.n}"`);
}
const SAE_SRC = () => `<p class="xs muted sae-src">${ic('info', 12)} Counted from the records stored in this prototype (${fxClient() ? 'client demo data' : 'legacy demo data'}) when the page opens — no fixed or sample figures.</p>`;

/* ---------- 2. Reports & Analytics (SA-08; defects #12, #21) ---------- */
function saeOverview() {
  const bs = saeLive(), en = bs.reduce((a, b) => a + (+b.enrolled || 0), 0), cap = bs.reduce((a, b) => a + (+b.cap || 0), 0), ag = bs.map(b => saeAsgOf(b.code)).reduce((a, c) => ({ n: a.n + c.n, m: a.m + c.marked }), { n: 0, m: 0 });
  const fin = saeFinOk() ? saeBatchwise({ days: 180 }) : null, fr = fin ? fin.rows.filter(r => r.net || r.out) : [];
  return `<div class="kpis sae-kpis">${kpi('Learners (people)', saeN(allLearners().length))}${kpi('Batches running or planned', bs.length, `${bs.filter(b => b.status === 'In Progress').length} in progress`)}${kpi('Seats filled', cap ? `${en} / ${cap}` : '—', cap ? saePct(en, cap) + '% of capacity' : '')}${kpi('Assignments marked', `${ag.m} / ${ag.n}`, 'Learners\' assignment records in these batches')}${fin ? kpi('Net received (6 months)', fiG(fin.T.net)) + kpi('Outstanding now', fiG(fin.T.out)) : ''}</div>
  <div class="sae-grid">${saeChartEnrol()}${saeChartOcc(bs)}${fin ? (fr.length ? saeChartMoney(fr) : saeFig('money', 'Net received and outstanding by batch', '', emptyState({ icon: 'chart', title: 'No payments or balances yet' }), '', 'data-total="0" data-total-out="0" data-table-total="0" data-table-out="0"')) : ''}${saeChartAsg(bs)}${saeChartAtt()}</div>
  ${fin ? '' : `<p class="xs muted">${ic('lock', 12)} Money figures are in Finance → Reports (Finance and Super Administrators).</p>`}${SAE_SRC()}`;
}
function saeProgress() {
  const bs = saeLive();
  return `${saeChartAsg(bs)}<div class="tbl-wrap"><table class="tbl dense sae-prog"><thead><tr><th>Batch</th><th>Course</th><th class="r">Enrolled</th><th class="r">Learners with assignment records</th><th class="r">Assignments marked</th><th>Progress</th></tr></thead><tbody>${bs.map(b => { const c = saeAsgOf(b.code), p = saePct(c.marked, c.n); return `<tr><td class="mono small">${esc(b.code)}</td><td class="small">${esc(b.course)}</td><td class="r num">${+b.enrolled || 0}</td><td class="r num">${c.learners}</td><td class="r num">${c.marked} / ${c.n}</td><td style="min-width:140px">${p === null ? '<span class="xs muted">No assignment records</span>' : bar(p, b.code)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">No batches.</td></tr>'}</tbody></table></div>
  <p class="xs muted">Progress is the share of a batch's assignment records that have been marked. Learners without a learner account in the prototype have no assignment records, so a batch can show fewer learners with records than it has enrolled. A competency distribution is not calculated here: the prototype records competency per criterion on each learner's record, not as batch totals.</p>${SAE_SRC()}`;
}
function saeCompletion() {
  const g = ui('saeCG', 'course'), from = ui('saeCF', ''), to = ui('saeCT', '');
  const es = saeEnrols().filter(e => (!from || (e.at && e.at.slice(0, 10) >= from)) && (!to || (e.at && e.at.slice(0, 10) <= to))), by = {};
  es.forEach(e => { const k = g === 'type' ? e.type : e.title || '—', r = by[k] = by[k] || { k, n: 0, done: 0, exp: 0, act: 0 }; r.n++; if (/Completed/i.test(e.status)) r.done++; else if (/Expired/i.test(e.status)) r.exp++; else if (/Active|In Progress/i.test(e.status)) r.act++; });
  const rows = Object.values(by).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k)), T = rows.reduce((a, r) => ({ n: a.n + r.n, done: a.done + r.done, exp: a.exp + r.exp, act: a.act + r.act }), { n: 0, done: 0, exp: 0, act: 0 });
  const rate = r => r.n ? bar(saePct(r.done, r.n), r.k) : '<span class="xs muted">—</span>';
  return `<div class="row sae-cf" role="group" aria-label="Completion filters"><select class="select dt-sel" aria-label="Group by" data-onchange="saeCG"><option value="course" ${g === 'course' ? 'selected' : ''}>By course</option><option value="type" ${g === 'type' ? 'selected' : ''}>By course type</option></select><label class="small" for="sae-cf">Enrolled from</label><input class="input dt-sel" style="width:auto" type="date" id="sae-cf" value="${esc(from)}" data-onchange="saeCF"><label class="small" for="sae-ct">to</label><input class="input dt-sel" style="width:auto" type="date" id="sae-ct" value="${esc(to)}" data-onchange="saeCT">${g !== 'course' || from || to ? '<button class="linklike small" data-act="saeCClr">Clear</button>' : ''}</div>
  ${rows.length ? `<div class="tbl-wrap"><table class="tbl dense sae-comp" data-total="${T.n}" data-done="${T.done}"><thead><tr><th>${g === 'type' ? 'Course type' : 'Course'}</th><th class="r">Enrolments</th><th class="r">Active</th><th class="r">Completed</th><th class="r">Expired</th><th>Completion rate</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.k)}</td><td class="r num">${r.n}</td><td class="r num">${r.act}</td><td class="r num">${r.done}</td><td class="r num">${r.exp}</td><td style="min-width:140px">${rate(r)}</td></tr>`).join('')}<tr class="sae-tot"><td class="strong">Total</td><td class="r strong num">${T.n}</td><td class="r strong num">${T.act}</td><td class="r strong num">${T.done}</td><td class="r strong num">${T.exp}</td><td>${T.n ? bar(saePct(T.done, T.n), 'All') : ''}</td></tr></tbody></table></div>` : emptyState({ icon: 'chart', title: 'No enrolments for these dates', why: 'Change or clear the dates.' })}
  <p class="xs muted">Counted from each learner's enrolment records (status and enrolment date). Completion rate = completed ÷ enrolments.${fxClient() ? '' : ' The legacy demo\'s seeded course totals (for example "412 started") are sample figures and are not used.'}</p>${SAE_SRC()}`;
}
INP.saeCG = el => { setUi('saeCG', el.value); render(); };
INP.saeCF = el => { setUi('saeCF', el.value || ''); render(); };
INP.saeCT = el => { setUi('saeCT', el.value || ''); render(); };
ACT.saeCClr = () => { ['saeCG', 'saeCF', 'saeCT'].forEach(k => delete S.ui[k]); render(); };
function saeStaff() {
  const subs = allSubmissions(), bs = saeLive(), obs = learnerAccounts().flatMap(v => (STORE.worlds[v].observations || []));
  const st = (ADMIN.staff || []).filter(s => (s.roles || []).some(r => ['Assessor', 'Teacher'].includes(r)));
  const rows = st.map(s => { const mb = bs.filter(b => (b.teachers || []).concat(b.assessors || []).includes(s.name)), mine = subs.filter(x => x.assessor === s.name), as = (s.roles || []).includes('Assessor');
    return `<tr><td>${esc(s.name)}<div class="xs muted">${esc((s.roles || []).filter(r => ['Assessor', 'Teacher'].includes(r)).join(' · '))}</div></td><td class="r num">${mb.length}</td><td class="r num">${mb.reduce((a, b) => a + (+b.enrolled || 0), 0)}</td><td class="r num">${as ? mine.filter(x => saeAgOf(x.status) === 'marked').length : '—'}</td><td class="r num">${as ? mine.filter(x => saeAgOf(x.status) === 'sub').length : '—'}</td><td class="r num">${as ? mine.filter(x => saeAgOf(x.status) === 'resub').length : '—'}</td><td class="r num">${as ? obs.filter(o => o.assessor === s.name && o.status === 'Completed').length : '—'}</td></tr>`; }).join('');
  return `<div class="tbl-wrap"><table class="tbl dense sae-staff"><thead><tr><th>Staff</th><th class="r">Batches</th><th class="r">Learners in those batches</th><th class="r">Assignments marked</th><th class="r">Awaiting marking</th><th class="r">Resubmissions requested</th><th class="r">Observations completed</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">No Teachers or Assessors.</td></tr>'}</tbody></table></div>
  <p class="xs muted">Counted from the batch staffing and the learners' assignment and observation records. Average marking turnaround and resubmission rate are not available in the prototype: it doesn't record when each piece of work was marked.</p>${SAE_SRC()}`;
}
function saeOther() {
  const A = saeAtt();
  const att = A.n ? `<p class="big-num num">${saePct(A.att, A.n)}%</p><p class="small">Present or late, from ${A.n} register entr${A.n === 1 ? 'y' : 'ies'} in ${A.regs} recorded session register${A.regs === 1 ? '' : 's'}.</p>` : `<p class="strong">Not available — no recorded registers</p><p class="small muted">${A.sessions} session${A.sessions === 1 ? '' : 's'} scheduled; no register has been recorded yet. Nothing is estimated.</p>`;
  return `<div class="grid-2"><section class="card sae-att"><h3>Attendance</h3>${att}</section><section class="card"><h3>Batches</h3><p class="small">${ADMIN.batches.filter(b => b.status === 'In Progress').length} in progress · ${ADMIN.batches.filter(b => b.enrolled >= b.cap).length} full</p></section><section class="card"><h3>Certificate expiry (next 60 days)</h3><p class="small">${allCerts().filter(c => c.expires && daysTo(c.expires) > 0 && daysTo(c.expires) <= 60).length} certificates</p></section><section class="card"><h3>Agencies</h3><p class="small">${ADMIN.agencies.length} agencies · ${allLearners().filter(l => l.agency).length} sponsored learners</p></section></div>${SAE_SRC()}`;
}
// Academic Admin → Batch reports: enrolment, attendance, assignments and observations from the records (no formula values)
function saeBatchRep() {
  const A = saeAtt();
  return `<div class="tbl-wrap"><table class="tbl dense sae-brep"><thead><tr><th>Batch</th><th class="r">Enrolment vs capacity</th><th class="r">Attendance</th><th class="r">Assignments marked</th><th class="r">Observations completed</th></tr></thead><tbody>${saeLive().map(b => { const c = saeAsgOf(b.code), o = saeObsOf(b.code), a = A.rows.find(r => r.code === b.code);
    return `<tr><td class="mono small">${esc(b.code)}<div class="xs muted">${esc(b.status || '')}</div></td><td class="r num">${+b.enrolled || 0}/${+b.cap || 0}</td><td class="r">${a ? `<span class="num">${saePct(a.att, a.n)}%</span><div class="xs muted">${a.n} register entries</div>` : '<span class="xs muted">No registers recorded</span>'}</td><td class="r">${c.n ? `<span class="num">${c.marked} / ${c.n}</span><div class="xs muted">${saePct(c.marked, c.n)}%</div>` : '<span class="xs muted">No assignment records</span>'}</td><td class="r">${o.n ? `<span class="num">${o.done} / ${o.n}</span>` : '<span class="xs muted">No records</span>'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">No batches.</td></tr>'}</tbody></table></div>
  <p class="xs muted">Attendance counts present or late entries in recorded session registers. Competency distribution and completion rate per batch are not calculated in the prototype, so they aren't shown.</p>${SAE_SRC()}`;
}
const SAE_TABS = [['overview', 'Overview'], ['progress', 'Progress by batch'], ['completion', 'Completion rate'], ['staff', 'Staff performance'], ['registered', 'Learners vs enrolments']];
const SAE_TABS_SA = SAE_TABS.concat([['other', 'Attendance · batch · certificates · agency'], ['exports', 'Export history']]);
const SAE_TABS_ACA = SAE_TABS.concat([['batch', 'Batch reports'], ['coverage', 'Coverage'], ['decisions', 'Queue decisions'], ['exports', 'Export history']]);
const SAE_PASS = ['registered', 'exports', 'coverage', 'decisions']; // already counted from records: the earlier screens render them
const _repSAE = SCREENS['a-reports'];
SCREENS['a-reports'] = p => {
  p = p || {};
  const aca = typeof isAca === 'function' && isAca(), list = aca ? SAE_TABS_ACA : SAE_TABS_SA, t = list.some(x => x[0] === p.tab) ? p.tab : 'overview'; // an unknown tab (e.g. a Super Admin deep link to an academic tab) opens the Overview
  const pass = SAE_PASS.includes(t), h = _repSAE({ ...p, tab: pass ? t : 'registered' }); if (typeof h !== 'string') return h;
  const i = h.indexOf('<div class="subtabs"'), j = i < 0 ? -1 : h.indexOf('</div>', i); if (i < 0 || j < 0) return h;
  const head = pass ? h.slice(0, i) : h.slice(0, i).split('Report: registered').join('Report: ' + t), st = subtabs(list, t, 'a-reports');
  const body = pass ? h.slice(j + 6) : { overview: saeOverview, progress: saeProgress, completion: saeCompletion, staff: saeStaff, other: saeOther, batch: saeBatchRep }[t]();
  return head + st + body;
};

/* ---------- Admin dashboard: a compact view of two charts, and Average progress from the records ---------- */
const _fxKpiSAE = fxDashKpis;
fxDashKpis = function (subs) {
  const h = _fxKpiSAE.apply(this, arguments), all = allSubmissions(), started = all.filter(s => s.status !== 'Not Started');
  if (!started.length) return h;
  const p = saePct(all.filter(s => saeAgOf(s.status) === 'marked').length, all.length);
  return h.replace(/(<span class="xs muted">Average progress<\/span><span class="big-num num">)—(<\/span><span class="small">)No learner has started yet/, `$1${p}%$2Assignments marked, of ${all.length} assignment records`);
};
const _dashSAE = SCREENS['a-dashboard'];
SCREENS['a-dashboard'] = function () {
  const h = _dashSAE.apply(this, arguments); if (typeof h !== 'string' || h.includes('sae-dash') || !/<section class="card"><h3>Enrolments by course/.test(h)) return h;
  const card = `<section class="card sae-dash"><div class="card-h"><h2>${ic('chart')}Reports at a glance</h2><button class="btn btn-sm btn-ghost" data-go="a-reports">Open Reports &amp; Analytics</button></div><div class="sae-grid">${saeChartOcc()}${saeChartAsg()}</div></section>`;
  return h.replace(/(<section class="card"><h3>Enrolments by course[\s\S]*?<\/section>)/, `$1${card}`);
};

/* ---------- The completion filters are screen state: reset with the other report filters on an identity or role change ---------- */
const _fcResetSAE = fcFiltersReset;
fcFiltersReset = function () { _fcResetSAE.apply(this, arguments); if (S && S.ui) ['saeCG', 'saeCF', 'saeCT'].forEach(k => delete S.ui[k]); };
