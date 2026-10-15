/* ============================================================
   Final decisions G5.6 — Discount rates (Super Admin → Bundles & Pricing → "Discount rates")
   Standard discount %, volume slabs and optional per-agency %. Every save is a new version that
   applies to new purchases only. The Super Admin edits directly (reason required). Anyone holding the
   "Change discount rate" capability (granted to Business Admin A — Sophie Turner — in the mock data)
   sees the same form, but saving raises a "Discount rate change" item for the Super Admin; nothing
   changes until it is approved. Automatic bundle prices read these rates (business + agency pricing).
   Loads after every portal file.
   ============================================================ */
'use strict';

// S4c: the versions live in STORE (kept across admin rebuilds and variant / identity switches); only the demo reset clears them
function discData() {
  if (ADMIN && !ADMIN.discountCap) ADMIN.discountCap = { roles: [], users: ['Sophie Turner'] };
  if (!STORE.discount) {
    STORE.discount = { versions: [
      { v: 1, at: D(-120, '10:00'), by: 'Nadia Qureshi', reason: 'Initial rates', std: 0, slabs: [[10, 24, 5], [25, 49, 10], [50, null, 12]], agency: {} },
      { v: 2, at: D(-60, '09:30'), by: 'Nadia Qureshi', reason: 'AQ-1025 approved — volume slab 50+ seats −12% → −15%', std: 0, slabs: [[10, 24, 5], [25, 49, 10], [50, null, 15]], agency: {} },
    ] };
  }
  STORE.discount.requests = STORE.discount.requests || [];
  ADMIN.discount = STORE.discount; // same object (older code reads ADMIN.discount)
  return STORE.discount;
}
// S4c: "Discount rate change" requests are kept with the rates (the same objects the Approvals Queue shows), so an admin rebuild,
// variant or identity switch re-attaches them instead of losing them. Only the demo reset clears them.
function discQueueSync() { if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.queue || !STORE.discount) return; (STORE.discount.requests || []).forEach(i => { if (!ADMIN.queue.includes(i)) { ADMIN.queue = ADMIN.queue.filter(x => x.id !== i.id); ADMIN.queue.unshift(i); } }); }
const discReqId = () => { const used = new Set(ADMIN.queue.map(i => i.id).concat((STORE.discount.requests || []).map(i => i.id))); let n = 6300 + (STORE.discount.requests || []).length; while (used.has('AQ-' + n)) n++; return 'AQ-' + n; };
const _baDiscS4c = buildAdmin; buildAdmin = function () { const r = _baDiscS4c.apply(this, arguments); discQueueSync(); return r; };
const _isDiscS4c = initStore; initStore = function () { STORE.discount = null; return _isDiscS4c.apply(this, arguments); };
const discNow = () => { const d = discData(); return d.versions[d.versions.length - 1]; };
const canDiscount = () => !!(ADMIN && ADMIN.me && (isSA() || (ADMIN.discountCap || {}).users.includes(ADMIN.me.name) || (ADMIN.me.roles || []).some(r => (ADMIN.discountCap || {}).roles.includes(r))));
// Keep the shared slab tables in step with the current version (sorted high → low; standard % as the 1+ fallback)
function discSync() {
  const c = discNow(), rows = c.slabs.map(s => [s[0], s[2]]).sort((a, b) => b[0] - a[0]).concat(c.std ? [[1, c.std]] : []);
  [typeof AUTO_SLABS !== 'undefined' ? AUTO_SLABS : null, typeof SLABS !== 'undefined' ? SLABS : null].forEach(T => { if (T) { T.length = 0; rows.forEach(r => T.push(r)); } });
}
// S4c: the automatic discount for a quantity — the slab whose range contains it ("to" respected; the last slab may be open), else the standard %
const discPct = (qty, c = discNow()) => { const s = c.slabs.find(x => qty >= x[0] && (x[1] == null || qty <= x[1])); return s ? { pct: s[2], label: `Volume price: ${slabTxt(s)}`, slab: s } : c.std ? { pct: c.std, label: `Standard discount −${c.std}%`, slab: null } : { pct: 0, label: 'Standard price', slab: null }; };
const discAuto = x => !x.customTotal && x.fixedPct == null && x.pct == null && !x.slabs;
if (typeof priceOf === 'function') { const _po = priceOf; priceOf = function (p, cur, qty = p.seats) { if (typeof ADMIN !== 'undefined' && ADMIN) discSync(); const r = _po.apply(this, arguments); if (!discAuto(p)) return r; const d = discPct(qty), final = Math.round(r.list * (1 - d.pct / 100)); return { ...r, pct: d.pct, final, margin: final - r.floor, below: final < r.floor, label: d.label }; }; }
// Precedence (existing rules): a negotiated price (customTotal) or a fixed bundle % always stands — a per-agency % never overrides them
// (S4a decision). For automatic prices the per-agency % applies only when it is higher than the volume / standard rate — the better
// of the two, never both (no stacking).
if (typeof priceFor === 'function') { const _pf = priceFor; priceFor = function (c, qty) { discSync(); const r = _pf(c, qty); if (c.customTotal || c.fixedPct != null || c.slabs) return r; const d = discPct(qty), ag = discNow().agency[AGN()], v = discNow().v; if (ag != null && ag > d.pct) return { ...r, pct: ag, total: Math.round(r.list * (1 - ag / 100)), label: `Agency rate for ${AGN()}: −${ag}%`, rateV: v, basis: 'Per-agency discount' }; return { ...r, pct: d.pct, total: Math.round(r.list * (1 - d.pct / 100)), label: d.label, rateV: v, basis: d.slab ? 'Volume slab' : d.pct ? 'Standard discount' : 'Standard price' }; }; }
const discHint = () => { const c = discNow(); return 'Volume prices: ' + (c.slabs.map(slabTxt).join(' · ') || 'none') + (c.std ? ` · otherwise −${c.std}%` : ''); };
const slabTxt = s => `${s[0]}${s[1] ? '–' + s[1] : '+'} seats −${s[2]}%`;
const discDesc = c => [`Standard ${c.std}%`, ...c.slabs.map(slabTxt), ...Object.entries(c.agency).map(([a, p]) => `${a} −${p}%`)].join(' · ');

function discountTab() {
  const c = discNow(), d = discData(), edit = canDiscount(), sa = isSA(), pend = ADMIN.queue.filter(i => i.type === 'Discount rate change' && isOpen(i));
  return `<div class="note b-blue">${ic('info')}<div class="small">Commission is a bundle discount only. These rates drive automatic bundle prices. Each change creates a new version that <strong>applies to new purchases</strong>; existing bundles keep their price. Below-minimum bundle prices still go to the System Admin.</div></div>
  ${pend.length ? `<div class="note b-amber">${ic('clock')}<div class="small"><strong>${pend.length} change${pend.length > 1 ? 's' : ''} awaiting Super Admin approval:</strong> ${pend.map(i => `<a href="#a-queue.${i.id}" data-go="a-queue" data-id="${i.id}" class="mono">${i.id}</a> (${esc(i.data.setting)}: ${esc(i.data.current)} → ${esc(i.data.proposed)})`).join(', ')}</div></div>` : ''}
  <form class="card" data-submit="discSave"><div class="row-b"><h2>Current rates — version ${c.v}</h2><span class="xs muted">since ${fd(c.at)} · ${esc(c.by)}</span></div>
    <div class="form-grid"><div class="field"><label for="dr-std">Standard discount % (automatic bundle pricing)</label><input class="input num" type="number" min="0" max="50" id="dr-std" value="${c.std}" ${edit ? '' : 'readonly'}><span class="hint">Applies when no volume slab matches.</span></div></div>
    <h3>Volume slabs</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>From seats</th><th>To seats</th><th>Discount %</th><th></th></tr></thead><tbody id="dr-rows">${c.slabs.map((s, k) => `<tr class="dr-row"><td><input class="input num dr-from" type="number" min="1" value="${s[0]}" aria-label="Slab ${k + 1} from" ${edit ? '' : 'readonly'}></td><td><input class="input num dr-to" type="number" value="${s[1] ?? ''}" placeholder="and above" aria-label="Slab ${k + 1} to" ${edit ? '' : 'readonly'}></td><td><input class="input num dr-pct" type="number" min="0" max="60" value="${s[2]}" aria-label="Slab ${k + 1} discount %" ${edit ? '' : 'readonly'}></td><td>${edit ? `<button type="button" class="btn btn-sm btn-ghost" data-act="discDelRow" aria-label="Remove slab ${k + 1}">Remove</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
    ${edit ? `<div class="row"><button type="button" class="btn btn-sm" data-act="discAddRow">${ic('plus', 14)}Add slab</button><button type="button" class="btn btn-sm" data-act="discPreview">Preview the effect on new purchases</button></div><div id="dr-pv"></div><p class="xs muted">Slabs run in ascending order with no gaps or overlaps; only the last can be open ("and above"). A quantity below the first slab gets the standard %. Slabs 0–60%, standard 0–50%.</p>` : ''}
    <h3>Per-agency discount (optional)</h3><p class="xs muted">Every agency is listed with its status. Setting a rate here doesn\'t let an agency buy — that follows the agency\'s own status and activation. A negotiated or fixed-% bundle keeps its own price.</p><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Agency</th><th>Status</th><th>Discount %</th></tr></thead><tbody>${ADMIN.agencies.map(a => `<tr data-ag="${esc(a.id || a.name)}"><td>${esc(a.name)}</td><td>${chip(typeof agStatus === 'function' ? agStatus(a) : a.status, (typeof agStatus === 'function' ? agStatus(a) : a.status) === 'Active' ? 'green' : 'grey')}</td><td><input class="input num dr-ag" type="number" min="0" max="60" data-a="${esc(a.name)}" value="${c.agency[a.name] ?? ''}" placeholder="—" aria-label="Discount for ${esc(a.name)}" ${edit ? '' : 'readonly'}></td></tr>`).join('')}</tbody></table></div>
    ${edit ? `<div class="field"><label for="dr-r">Reason (required)</label><textarea class="textarea" id="dr-r"></textarea></div><div class="row"><button class="btn btn-primary" type="submit">${sa ? 'Save new version' : 'Submit for Super Admin approval'}</button><span class="xs muted">${sa ? 'Applies to new purchases immediately; logged.' : 'The rate doesn\'t change until the Super Admin approves your request.'}</span></div>` : `<p class="xs muted">${ic('lock', 12)} Read-only. Only the Super Administrator, or someone given the "Change discount rate" capability, can change these rates.</p>`}
  </form>
  <section class="card"><h2>Version history</h2><ol class="tl">${d.versions.slice().reverse().map(x => `<li class="${x === c ? 'cur' : 'done'}"><span class="tl-d">${x.v}</span><div><strong>Version ${x.v}</strong> · ${fd(x.at)} · ${esc(x.by)}<div class="small">${esc(discDesc(x))}</div><div class="xs muted">${esc(x.reason)}</div></div></li>`).join('')}</ol></section>`;
}
SUBMIT.discSave = () => {
  if (!canDiscount()) { logA('Bundles & Pricing', 'Discount rates', 'Blocked: change discount rates', '—', '—', `${ADMIN.me.name} doesn\'t hold "Change discount rate"`); toast('Only the Super Administrator, or someone given the "Change discount rate" capability, can change these rates.', 'err'); return; }
  const c = discNow(), r = (($('#dr-r') || {}).value || '').trim(); if (!r) return fieldErr('#dr-r', 'Enter a reason');
  const { std, slabs, agency } = discRead();
  const bad = discCheck({ std, slabs, agency }); if (bad) { logA('Bundles & Pricing', 'Discount rates', 'Rejected: invalid discount rates', discDesc(c), '—', bad); toast(bad, 'err'); const pv = $('#dr-pv'); if (pv) pv.innerHTML = `<div class="note b-red">${ic('alert')}<div class="small">${esc(bad)}</div></div>`; return; }
  const next = { std, slabs, agency }, cur = discDesc(c), prop = discDesc({ ...next, v: 0 });
  if (cur === prop) { toast('Nothing has changed.', 'info'); return; }
  if (isSA()) { discData().versions.push({ v: c.v + 1, at: now().toISOString(), by: ADMIN.me.name, reason: r, ...next }); discSync(); logA('Bundles & Pricing', 'Discount rates', 'New version ' + (c.v + 1), cur, prop, r); toast(`Version ${c.v + 1} saved — applies to new purchases.`); render(); return; }
  const id = discReqId(), at = now().toISOString(), setting = std !== c.std ? 'Standard discount' : JSON.stringify(slabs) !== JSON.stringify(c.slabs) ? 'Volume slabs' : 'Per-agency discount';
  const req = { id, type: 'Discount rate change', raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: 'Super Administrator', related: [setting, 'a-bundles..rates'], reason: r, notes: [], history: [[ADMIN.me.name, at, 'Raised', r]], data: { setting, current: cur, proposed: prop, next, fromV: c.v } };
  discData().requests.push(req); ADMIN.queue.unshift(req);
  if (ADMIN._saNotifs) ADMIN._saNotifs.unshift({ t: 'Discount rate change awaiting your approval', b: `${id} · ${setting} · raised by ${ADMIN.me.name}`, at, unread: true, go: 'a-queue.' + id });
  logA('Approvals Queue', id, 'Discount rate change raised', cur, prop, r); toast(`${id} sent to the Super Administrator. The rate doesn't change until it's approved.`); render();
};
// S4c: one validation for saves and requests — whole numbers, ascending, no gaps or overlaps, only the last open, % within the existing limits
function discCheck(n) {
  const pc = x => Number.isFinite(x) && x >= 0;
  if (!(pc(n.std) && n.std <= 50)) return 'The standard discount must be 0–50%.';
  for (let k = 0; k < n.slabs.length; k++) { const [f, t, p] = n.slabs[k], last = k === n.slabs.length - 1;
    if (!(Number.isInteger(f) && f >= 1)) return `Slab ${k + 1}: "from" must be a whole number of seats, 1 or more.`;
    if (t == null && !last) return `Slab ${k + 1}: only the last slab can be open ("and above").`;
    if (t != null && !(Number.isInteger(t) && t >= f)) return `Slab ${k + 1}: "to" must be a whole number, at least "from".`;
    if (!(pc(p) && p <= 60)) return `Slab ${k + 1}: the discount must be 0–60%.`;
    if (k) { const pt = n.slabs[k - 1][1]; if (f <= pt) return `Slab ${k + 1} overlaps slab ${k} (${f} ≤ ${pt}).`; if (f !== pt + 1) return `Gap between slab ${k} and slab ${k + 1}: seats ${pt + 1}–${f - 1} would have no slab.`; } }
  for (const [a, p] of Object.entries(n.agency || {})) if (!(pc(p) && p <= 60)) return `${a}: the per-agency discount must be 0–60%.`;
  return '';
}
const discRead = () => { const fr = $$('.dr-from').map(x => x.value === '' ? NaN : +x.value), to = $$('.dr-to').map(x => x.value === '' ? null : +x.value), pc = $$('.dr-pct').map(x => x.value === '' ? NaN : +x.value), agency = {}; $$('.dr-ag').forEach(x => { if (x.value !== '') agency[x.dataset.a] = +x.value; }); return { std: $('#dr-std').value === '' ? 0 : +$('#dr-std').value, slabs: fr.map((f, k) => [f, to[k], pc[k]]), agency }; };
ACT.discAddRow = () => { const tb = $('#dr-rows'); if (!tb) return; const k = tb.querySelectorAll('tr').length, prev = [...tb.querySelectorAll('.dr-to')].pop(), from = prev && prev.value !== '' ? +prev.value + 1 : ''; tb.insertAdjacentHTML('beforeend', `<tr class="dr-row"><td><input class="input num dr-from" type="number" min="1" value="${from}" aria-label="Slab ${k + 1} from"></td><td><input class="input num dr-to" type="number" placeholder="and above" aria-label="Slab ${k + 1} to"></td><td><input class="input num dr-pct" type="number" min="0" max="60" aria-label="Slab ${k + 1} discount %"></td><td><button type="button" class="btn btn-sm btn-ghost" data-act="discDelRow" aria-label="Remove slab ${k + 1}">Remove</button></td></tr>`); };
ACT.discDelRow = el => { const tr = el.closest('tr'); if (tr) tr.remove(); };
// Preview: what new purchases would pay per quantity, current vs proposed (nothing is saved)
ACT.discPreview = () => { const n = discRead(), bad = discCheck(n), pv = $('#dr-pv'); if (!pv) return; if (bad) { pv.innerHTML = `<div class="note b-red">${ic('alert')}<div class="small">${esc(bad)}</div></div>`; return; } const qs = Array.from(new Set([1].concat(...n.slabs.map(s => [s[0] - 1, s[0], s[1], s[1] != null ? s[1] + 1 : null]), discNow().slabs.map(s => s[0])).filter(q => q && q > 0))).sort((a, b) => a - b), cur = discNow(); pv.innerHTML = `<div class="note b-blue">${ic('info')}<div class="small"><strong>Preview — new automatic-price purchases (nothing saved)</strong><table class="tbl dense"><thead><tr><th>Seats</th><th>Now</th><th>Proposed</th></tr></thead><tbody>${qs.map(q => `<tr><td>${q}</td><td>−${discPct(q, cur).pct}%</td><td>−${discPct(q, { ...n, v: 0 }).pct}%</td></tr>`).join('')}</tbody></table>Negotiated and fixed-% bundles and purchases already made don\'t change.</div></div>`; };
// Approval applies the proposed rates as a new version
const _adDisc = applyDecision;
applyDecision = function (i, a, r, o) {
  if (i && i.type === 'Discount rate change' && a !== 'note') {
    // Only the Super Administrator decides; a decided request is never applied again (S4c)
    if (!isSA()) { logA('Approvals Queue', i.id, 'Blocked: decide discount rate change', i.status, '—', `${ADMIN.me.name} isn\'t the Super Administrator`); toast('The Super Administrator decides this request.', 'err'); return; }
    if (!isOpen(i) || (i.data && i.data.appliedV)) { logA('Approvals Queue', i.id, 'Blocked: decision repeated', i.status, '—', 'Already decided'); toast(`${i.id} is already ${String(i.status).toLowerCase()}.`, 'info'); return; }
  }
  _adDisc(i, a, r, o);
  if (i.type !== 'Discount rate change' || a === 'note') return;
  if (a === 'approve' && i.data && i.data.next && !i.data.appliedV && i.status === 'Approved') { const c = discNow(); i.data.appliedV = c.v + 1; discData().versions.push({ v: c.v + 1, at: now().toISOString(), by: ADMIN.me.name, reason: `${i.id} approved — raised by ${i.raisedBy}: ${i.reason}`, ...i.data.next }); discSync(); }
  if (typeof bizNotify === 'function' && i.raisedBy === 'Sophie Turner' && ['approve', 'reject', 'return', 'info'].includes(a)) bizNotify(`Discount rate change ${a === 'approve' ? 'approved' : a === 'reject' ? 'rejected' : 'returned'}`, `${i.id} · ${i.data.setting}${a === 'approve' ? ' — applies to new purchases' : ' — ' + r}`, 'a-bundles..rates', 'Bundles');
};
// Tab on the Super Admin / Business Admin bundles screen
const _bundlesD = SCREENS['a-bundles'];
SCREENS['a-bundles'] = (p) => {
  if (p.tab === 'rates') { const tabs = [['catalogue', 'Catalogue & pricing'], ...(typeof isBiz === 'function' && isBiz() ? [] : [['list', 'Bundles'], ['ledger', 'Licence ledger'], ['expiring', 'Expiring bundles']]), ['rates', 'Discount rates']]; return `${pageA(typeof isBiz === 'function' && isBiz() ? 'Bundles & Pricing' : 'Bundles & Licences', 'Discount rates for automatic bundle pricing')}${subtabs(tabs, 'rates', 'a-bundles')}${discountTab()}`; }
  const h = _bundlesD(p);
  if (h.includes('role="tablist" aria-label="Sections"')) return h.replace(/(<div class="subtabs" role="tablist" aria-label="Sections">[^]*?)(<\/div>)/, `$1<button class="tab" role="tab" aria-selected="false" data-go="a-bundles" data-tab="rates">Discount rates</button>$2`);
  // The Business Admin catalogue has no tab strip: add Catalogue & pricing / Discount rates under the page heading
  if (p.id || !h.includes('<div class="page-h">')) return h;
  const i = h.indexOf('<div class="page-h">'), j = h.indexOf('</h1>', i), k = h.indexOf('</div></div>', j) + 12;
  return h.slice(0, k) + subtabs([['catalogue', 'Catalogue & pricing'], ['rates', 'Discount rates']], 'catalogue', 'a-bundles') + h.slice(k);
};
// Roles & Capabilities: the named capability
const _roleEdD = roleEditor;
roleEditor = function (name) {
  const h = _roleEdD(name), cap = (ADMIN.discountCap || { roles: [] }).roles.includes(name), lock = ['Learner', 'Agency Administrator', 'Super Administrator'].includes(name);
  return h.replace('<div class="row"><button class="btn" type="button" data-act="previewCaps"', `<fieldset class="stack" style="border:1px solid var(--line);border-radius:8px;padding:10px;margin:0"><legend class="lbl">Named capabilities</legend><label class="check small"><input type="checkbox" data-onchange="discCapRole" data-r="${esc(name)}" ${cap || name === 'Super Administrator' ? 'checked' : ''} ${lock ? 'disabled' : ''}> Change discount rate <span class="xs muted">— holders propose changes; the Super Admin approves</span></label>${(ADMIN.discountCap || { users: [] }).users.length ? `<p class="xs muted">Also granted directly to: ${ADMIN.discountCap.users.map(esc).join(', ')}.</p>` : ''}</fieldset><div class="row"><button class="btn" type="button" data-act="previewCaps"`);
};
INP.discCapRole = el => { discData(); const L = ADMIN.discountCap.roles, r = el.dataset.r; ADMIN.discountCap.roles = el.checked ? [...new Set([...L, r])] : L.filter(x => x !== r); logA('Roles & Capabilities', r, el.checked ? 'Capability granted: Change discount rate' : 'Capability removed: Change discount rate', '—', '—', ''); toast(`"Change discount rate" ${el.checked ? 'granted to' : 'removed from'} ${r}.`); };
// Make sure the rates exist after a reset / identity switch
AFTER.unshift(() => { if (typeof ADMIN !== 'undefined' && ADMIN) { discData(); discSync(); discQueueSync(); } });
// Business Admin: their own Discount rate change opens read-only (the Super Administrator decides). Previously it was outside their queue scope and showed "Not found".
const _allQDisc = allQueue; allQueue = function () { const q = _allQDisc(); if (!isBiz()) return q; return q.concat(ADMIN.queue.filter(i => i.type === 'Discount rate change' && i.raisedBy === ADMIN.me.name && !q.includes(i))); };
const ownDiscRO = i => isBiz() && i && i.type === 'Discount rate change';
function afterHead(h, ins) { const a = h.indexOf('</h1>'); if (a < 0) return ins + h; let k = h.indexOf('</div>', a) + 6; if (h.startsWith('<div class="row">', k)) k = h.indexOf('</div>', k) + 6; k = h.indexOf('</div>', k) + 6; return h.slice(0, k) + ins + h.slice(k); }
const _qdDisc = queueDetail;
queueDetail = function (id) { const h = _qdDisc(id), i = qItem(id); if (!ownDiscRO(i)) return h; return afterHead(h.replace(/<button class="btn[^"]*" data-act="qDo"[^>]*>[^<]*<\/button>/g, ''), `<div class="note b-grey" role="status">${ic('lock')}<div class="small"><strong>Your request — read-only.</strong> The Super Administrator decides. The rates don't change until it's approved.</div></div>`); };
const _qDoDisc = ACT.qDo; ACT.qDo = el => { if (ownDiscRO(qItem(el.dataset.id))) { toast('The Super Administrator decides this request.', 'err'); return; } return _qDoDisc(el); };
