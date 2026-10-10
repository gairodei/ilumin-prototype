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

function discData() {
  if (!ADMIN.discount) {
    ADMIN.discount = { versions: [
      { v: 1, at: D(-120, '10:00'), by: 'Nadia Qureshi', reason: 'Initial rates', std: 0, slabs: [[10, 24, 5], [25, 49, 10], [50, null, 12]], agency: {} },
      { v: 2, at: D(-60, '09:30'), by: 'Nadia Qureshi', reason: 'AQ-1025 approved — volume slab 50+ seats −12% → −15%', std: 0, slabs: [[10, 24, 5], [25, 49, 10], [50, null, 15]], agency: {} },
    ] };
    ADMIN.discountCap = ADMIN.discountCap || { roles: [], users: ['Sophie Turner'] };
  }
  return ADMIN.discount;
}
const discNow = () => { const d = discData(); return d.versions[d.versions.length - 1]; };
const canDiscount = () => !!(ADMIN && ADMIN.me && (isSA() || (ADMIN.discountCap || {}).users.includes(ADMIN.me.name) || (ADMIN.me.roles || []).some(r => (ADMIN.discountCap || {}).roles.includes(r))));
// Keep the shared slab tables in step with the current version (sorted high → low; standard % as the 1+ fallback)
function discSync() {
  const c = discNow(), rows = c.slabs.map(s => [s[0], s[2]]).sort((a, b) => b[0] - a[0]).concat(c.std ? [[1, c.std]] : []);
  [typeof AUTO_SLABS !== 'undefined' ? AUTO_SLABS : null, typeof SLABS !== 'undefined' ? SLABS : null].forEach(T => { if (T) { T.length = 0; rows.forEach(r => T.push(r)); } });
}
if (typeof priceOf === 'function') { const _po = priceOf; priceOf = function (p, cur, qty) { if (typeof ADMIN !== 'undefined' && ADMIN) discSync(); return _po.apply(this, arguments); }; }
if (typeof priceFor === 'function') { const _pf = priceFor; priceFor = function (c, qty) { discSync(); const r = _pf(c, qty), ag = discNow().agency[AGN()]; if (ag != null && c.fixedPct == null && ag > r.pct) return { ...r, pct: ag, total: Math.round(r.list * (1 - ag / 100)), label: `Agency rate for ${AGN()}: −${ag}%` }; return r; }; }
const slabTxt = s => `${s[0]}${s[1] ? '–' + s[1] : '+'} seats −${s[2]}%`;
const discDesc = c => [`Standard ${c.std}%`, ...c.slabs.map(slabTxt), ...Object.entries(c.agency).map(([a, p]) => `${a} −${p}%`)].join(' · ');

function discountTab() {
  const c = discNow(), d = discData(), edit = canDiscount(), sa = isSA(), pend = ADMIN.queue.filter(i => i.type === 'Discount rate change' && isOpen(i));
  return `<div class="note b-blue">${ic('info')}<div class="small">Commission is a bundle discount only. These rates drive automatic bundle prices. Each change creates a new version that <strong>applies to new purchases</strong>; existing bundles keep their price. Below-minimum bundle prices still go to the System Admin.</div></div>
  ${pend.length ? `<div class="note b-amber">${ic('clock')}<div class="small"><strong>${pend.length} change${pend.length > 1 ? 's' : ''} awaiting Super Admin approval:</strong> ${pend.map(i => `<a href="#a-queue.${i.id}" data-go="a-queue" data-id="${i.id}" class="mono">${i.id}</a> (${esc(i.data.setting)}: ${esc(i.data.current)} → ${esc(i.data.proposed)})`).join(', ')}</div></div>` : ''}
  <form class="card" data-submit="discSave"><div class="row-b"><h2>Current rates — version ${c.v}</h2><span class="xs muted">since ${fd(c.at)} · ${esc(c.by)}</span></div>
    <div class="form-grid"><div class="field"><label for="dr-std">Standard discount % (automatic bundle pricing)</label><input class="input num" type="number" min="0" max="50" id="dr-std" value="${c.std}" ${edit ? '' : 'readonly'}><span class="hint">Applies when no volume slab matches.</span></div></div>
    <h3>Volume slabs</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>From seats</th><th>To seats</th><th>Discount %</th></tr></thead><tbody>${c.slabs.map((s, k) => `<tr><td><input class="input num dr-from" type="number" min="1" value="${s[0]}" aria-label="Slab ${k + 1} from" ${edit ? '' : 'readonly'}></td><td><input class="input num dr-to" type="number" value="${s[1] ?? ''}" placeholder="and above" aria-label="Slab ${k + 1} to" ${edit ? '' : 'readonly'}></td><td><input class="input num dr-pct" type="number" min="0" max="60" value="${s[2]}" aria-label="Slab ${k + 1} discount %" ${edit ? '' : 'readonly'}></td></tr>`).join('')}</tbody></table></div>
    <h3>Per-agency discount (optional)</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Agency</th><th>Discount %</th></tr></thead><tbody>${ADMIN.agencies.filter(a => a.status === 'Active').map(a => `<tr><td>${esc(a.name)}</td><td><input class="input num dr-ag" type="number" min="0" max="60" data-a="${esc(a.name)}" value="${c.agency[a.name] ?? ''}" placeholder="—" aria-label="Discount for ${esc(a.name)}" ${edit ? '' : 'readonly'}></td></tr>`).join('')}</tbody></table></div>
    ${edit ? `<div class="field"><label for="dr-r">Reason (required)</label><textarea class="textarea" id="dr-r"></textarea></div><div class="row"><button class="btn btn-primary" type="submit">${sa ? 'Save new version' : 'Submit for Super Admin approval'}</button><span class="xs muted">${sa ? 'Applies to new purchases immediately; logged.' : 'The rate doesn\'t change until the Super Admin approves your request.'}</span></div>` : `<p class="xs muted">${ic('lock', 12)} Read-only. Only the Super Administrator, or someone given the "Change discount rate" capability, can change these rates.</p>`}
  </form>
  <section class="card"><h2>Version history</h2><ol class="tl">${d.versions.slice().reverse().map(x => `<li class="${x === c ? 'cur' : 'done'}"><span class="tl-d">${x.v}</span><div><strong>Version ${x.v}</strong> · ${fd(x.at)} · ${esc(x.by)}<div class="small">${esc(discDesc(x))}</div><div class="xs muted">${esc(x.reason)}</div></div></li>`).join('')}</ol></section>`;
}
SUBMIT.discSave = () => {
  const c = discNow(), r = ($('#dr-r') || {}).value.trim(); if (!r) return fieldErr('#dr-r', 'Enter a reason');
  const std = +$('#dr-std').value || 0, fr = $$('.dr-from').map(x => +x.value), to = $$('.dr-to').map(x => x.value === '' ? null : +x.value), pc = $$('.dr-pct').map(x => +x.value || 0);
  const slabs = fr.map((f, k) => [f, to[k], pc[k]]), agency = {}; $$('.dr-ag').forEach(x => { if (x.value !== '') agency[x.dataset.a] = +x.value; });
  if (slabs.some(s => s[1] != null && s[1] < s[0])) { toast('A slab\'s "to" must not be below its "from".', 'err'); return; }
  const next = { std, slabs, agency }, cur = discDesc(c), prop = discDesc({ ...next, v: 0 });
  if (cur === prop) { toast('Nothing has changed.', 'info'); return; }
  if (isSA()) { discData().versions.push({ v: c.v + 1, at: now().toISOString(), by: ADMIN.me.name, reason: r, ...next }); discSync(); logA('Bundles & Pricing', 'Discount rates', 'New version ' + (c.v + 1), cur, prop, r); toast(`Version ${c.v + 1} saved — applies to new purchases.`); render(); return; }
  const id = 'AQ-' + (6300 + ADMIN.queue.length), at = now().toISOString(), setting = std !== c.std ? 'Standard discount' : JSON.stringify(slabs) !== JSON.stringify(c.slabs) ? 'Volume slabs' : 'Per-agency discount';
  ADMIN.queue.unshift({ id, type: 'Discount rate change', raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: 'Super Administrator', related: [setting, 'a-bundles..rates'], reason: r, notes: [], history: [[ADMIN.me.name, at, 'Raised', r]], data: { setting, current: cur, proposed: prop, next } });
  if (ADMIN._saNotifs) ADMIN._saNotifs.unshift({ t: 'Discount rate change awaiting your approval', b: `${id} · ${setting} · raised by ${ADMIN.me.name}`, at, unread: true, go: 'a-queue.' + id });
  logA('Approvals Queue', id, 'Discount rate change raised', cur, prop, r); toast(`${id} sent to the Super Administrator. The rate doesn't change until it's approved.`); render();
};
// Approval applies the proposed rates as a new version
const _adDisc = applyDecision;
applyDecision = function (i, a, r, o) {
  _adDisc(i, a, r, o);
  if (i.type !== 'Discount rate change' || a === 'note') return;
  if (a === 'approve' && i.data && i.data.next) { const c = discNow(); discData().versions.push({ v: c.v + 1, at: now().toISOString(), by: ADMIN.me.name, reason: `${i.id} approved — raised by ${i.raisedBy}: ${i.reason}`, ...i.data.next }); discSync(); }
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
AFTER.unshift(() => { if (typeof ADMIN !== 'undefined' && ADMIN) { discData(); discSync(); } });
// Business Admin: their own Discount rate change opens read-only (the Super Administrator decides). Previously it was outside their queue scope and showed "Not found".
const _allQDisc = allQueue; allQueue = function () { const q = _allQDisc(); if (!isBiz()) return q; return q.concat(ADMIN.queue.filter(i => i.type === 'Discount rate change' && i.raisedBy === ADMIN.me.name && !q.includes(i))); };
const ownDiscRO = i => isBiz() && i && i.type === 'Discount rate change';
function afterHead(h, ins) { const a = h.indexOf('</h1>'); if (a < 0) return ins + h; let k = h.indexOf('</div>', a) + 6; if (h.startsWith('<div class="row">', k)) k = h.indexOf('</div>', k) + 6; k = h.indexOf('</div>', k) + 6; return h.slice(0, k) + ins + h.slice(k); }
const _qdDisc = queueDetail;
queueDetail = function (id) { const h = _qdDisc(id), i = qItem(id); if (!ownDiscRO(i)) return h; return afterHead(h.replace(/<button class="btn[^"]*" data-act="qDo"[^>]*>[^<]*<\/button>/g, ''), `<div class="note b-grey" role="status">${ic('lock')}<div class="small"><strong>Your request — read-only.</strong> The Super Administrator decides. The rates don't change until it's approved.</div></div>`); };
const _qDoDisc = ACT.qDo; ACT.qDo = el => { if (ownDiscRO(qItem(el.dataset.id))) { toast('The Super Administrator decides this request.', 'err'); return; } return _qDoDisc(el); };
