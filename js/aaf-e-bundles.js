/* AA-FINAL Workstream E — bundle pricing transparency and finance labels (3 Nov 2026; proposed PD-AAF-E-*). Loads after aa1-integrity.js.
   AA-14  "How this price is worked out": wherever a bundle price is set or bought, one breakdown built only from the existing pricing
          functions (priceOf, priceFor, discPct, chVatAmt, chVatPct): each course and its list price per seat, the seats, the list total,
          the ONE discount that applies and why (negotiated per-agency price / fixed bundle % / volume rate / per-agency rate / standard),
          the whole-pound rounding (current prototype rule — M-12 is still a client question), VAT (exclusive, added on the rounded net
          once Finance approved the bundle's VAT setting), the total, and the per-seat figures beside the bundle total.
          Business Admin / Super Admin / System Admin bundle detail: the breakdown for any quantity and "price as" any agency, a quantity
          preview (1 / default seats / 10 / 25 / 50) and, for automatic bundles, a row for every agency with its own rate.
          Agency buy modal: the same breakdown for the chosen quantity, for the signed-in agency only (no minimum price, no other agency).
   D14    An agency with its own rate pays a different price from the bundle page's "Final price": the page now names it (priceFor as
          that agency). Whether the minimum price (list −20%, System Administrator approval) applies to per-agency and volume rates is a
          CLIENT DECISION — nothing is enforced; a price below it is flagged "below minimum — not checked" in the breakdown, the agency
          rows and Commercial Reports → Pricing.
   Lows   Bundle editor: an NVQ programme reads "NVQ programme fee" instead of "undefined" (business.js, in place). Buy Bundles card and
          its preview: "From 5 seats" → the default quantity and the real minimum (1 seat) (agency.js / business.js, in place).
          Finance Reports → Agency revenue "Modes": from how the bundle was paid (invoice request / card purchase), not its price mode
          (ch-b6.js, in place). Business dashboard and Commercial Reports say their figures are gross (paid, including VAT).
   Display only: no record is written, no price or rate changes, AA-1's invoice reconciliation (reconcileInvoices / fiInvPaid / chVatSync)
   is untouched. */
'use strict';

const AAFE_ROUND = 'Rounded to whole pounds (current prototype rule; pending client confirmation).';
const AAFE_FLOOR_Q = 'Whether the minimum price applies to per-agency and volume rates is a client decision — today it is not checked and no System Administrator approval is asked.';
// Who may see the internal breakdown (minimum price, other agencies' rates): the roles that open the bundle catalogue
const aafeCanView = () => S.portal === 'admin' && !!ADMIN && ((typeof isBiz === 'function' && isBiz()) || isSA() || (typeof isSys === 'function' && isSys()));
const aafeNvq = t => !(ADMIN.courses || []).some(c => c.title === t) && nvqBundleCourses().some(x => x.title === t);
const aafeP = v => Math.round(v * 100) / 100;
// The catalogue entry an agency prices from (AGY_CATALOGUE as that agency); an unpublished bundle gets the same shape from its product
function aafeEntry(p, agency) {
  const pub = agency && typeof aa1AsAgency === 'function' ? aa1AsAgency(agency, () => AGY_CATALOGUE().find(c => c.id === p.id)) : null;
  return pub || { id: p.id, name: p.name, courses: p.courses, seats: p.seats, days: p.days, custom: p.agency, fixedPct: p.pct, slabs: p.slabs, customTotal: p.customTotal, unit: p.courses.reduce((s, t) => s + coursePrice(t), 0), vatPct: chVatPct(p) };
}
// The agencies an automatic bundle's per-agency rates apply to (Discount rates, current version)
const aafeRates = () => Object.entries(discNow().agency || {}).filter(([, v]) => v != null && v !== '');

/* ---------- The figures (existing functions only) ---------- */
function aafeCalc(p, qty, agency) {
  qty = Math.max(1, Math.floor(+qty || 1));
  const own = priceOf(p, p.cur, qty), cur = p.cur || 'GBP';
  let r;
  if (agency) { const c = aafeEntry(p, agency); r = aa1AsAgency(agency, () => priceFor(c, qty)); }
  else { const vp = chVatPct(p), vat = chVatAmt(own.final, vp); r = { list: own.list, pct: own.pct, net: own.final, label: own.label, vatPct: vp, vat, total: aafeP(own.final + vat) }; }
  const d = discPct(qty), ag = agency ? (discNow().agency || {})[agency] : null;
  const kind = p.customTotal ? 'negotiated' : p.pct != null ? 'fixed' : p.slabs ? 'own-slabs' : r.basis === 'Per-agency discount' ? 'agency' : /^Volume/.test(r.label) ? 'volume' : /^Standard discount/.test(r.label) ? 'std' : 'none';
  const raw = p.customTotal ? p.customTotal / p.seats * qty : r.list * (1 - (r.pct || 0) / 100);
  return { p, qty, cur, agency: agency || null, courses: p.courses.map(t => [t, coursePrice(t), aafeNvq(t)]), unit: p.courses.reduce((s, t) => s + coursePrice(t), 0),
    list: r.list, pct: r.pct || 0, net: r.net, label: r.label, kind, raw: Math.round(raw) === r.net ? raw : null, slab: d, agRate: ag,
    vatPct: r.vatPct || 0, vat: r.vat || 0, total: r.total, floor: own.floor, below: r.net < own.floor, rateV: discNow().v };
}
function aafeWhy(N) {
  const p = N.p, m = v => money(v, N.cur), first = (discNow().slabs || [])[0];
  if (N.kind === 'negotiated') return `Negotiated price for ${esc(p.agency || 'one agency')}: ${m(p.customTotal)} for ${p.seats} seats, worked out per seat for ${N.qty} (${m(p.customTotal)} ÷ ${p.seats} × ${N.qty}). Volume and per-agency rates don't apply to it.`;
  if (N.kind === 'fixed') return `Fixed discount set on this bundle: −${p.pct}%. Volume and per-agency rates don't apply to it.`;
  if (N.kind === 'own-slabs') return `This bundle's own volume slabs (${(p.slabs || []).map(s => `${s[0]}+ seats −${s[1]}%`).join(' · ')}).`;
  if (N.kind === 'agency') return `${esc(N.agency)}'s own rate: −${N.agRate}% (Discount rates version ${N.rateV}). It applies because it is higher than the ${N.slab.pct ? `volume / standard rate for ${N.qty} seats (−${N.slab.pct}%)` : `rate for ${N.qty} seats (none)`} — the better of the two applies, never both.`;
  const mine = N.agency && N.agRate != null ? ` ${esc(N.agency)}'s own rate (−${N.agRate}%) is not higher, so it doesn't apply.` : '';
  if (N.kind === 'volume') return `Volume rate for ${N.qty} seats in this one purchase: ${esc(N.label.replace(/^Volume price: /, ''))} (Discount rates version ${N.rateV}).${mine}`;
  if (N.kind === 'std') return `Standard discount −${N.pct}% (Discount rates version ${N.rateV}): no volume slab matches ${N.qty} seats.${mine}`;
  return `No discount: ${plural(N.qty, 'seat')} is below the first volume slab${first ? ` (${slabTxt(first)})` : ''} and no other rate applies.${mine}`;
}
function aafeFloorHtml(N) {
  const m = v => money(v, N.cur), fl = `${m(N.floor)} <span class="xs muted">(list −${floorPct()}%)</span>`;
  if (!N.below) return `${fl} <span class="aafe-ok">· at or above it</span>`;
  const gap = m(N.floor - N.net);
  if (['agency', 'volume', 'std'].includes(N.kind)) return `${fl} <span class="aafe-below">· below minimum by ${gap} — not checked</span><div class="xs muted">${AAFE_FLOOR_Q}</div>`;
  return `${fl} <span class="aafe-below">· below minimum by ${gap}</span><div class="xs muted">The bundle's own price — checked when it is saved and published (System Administrator approval): ${esc(floorStatus(N.p))}.</div>`;
}
function aafeHtml(N, admin) {
  const m = v => money(v, N.cur), row = (k, v, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${k}</th><td>${v}</td></tr>`, p = N.p;
  const vatPend = admin && p.vatPending ? `<div class="xs muted">A VAT change (${esc(chVatTxt(p.vatPending))}) is awaiting Finance approval; this price stays until it is approved.</div>` : '';
  return `<div class="tbl-wrap aafe-bd" data-qty="${N.qty}" data-net="${N.net}" data-total="${N.total}"><table class="tbl dense aafe-tbl"><caption class="sr">How the price for ${plural(N.qty, 'seat')} is worked out</caption><tbody>
    ${row('Courses (list price per seat)', N.courses.map(([t, g, nvq]) => `<div>${esc(t)} — ${m(g)}${nvq ? ' <span class="xs muted">(NVQ programme catalogue fee)</span>' : ''}</div>`).join(''))}
    ${row('Quantity', plural(N.qty, 'seat'))}
    ${row('List total', `${m(N.unit)} × ${N.qty} = <strong>${m(N.list)}</strong>`)}
    ${row('Discount applied (one only)', `${N.pct ? `−${N.pct}%` : 'None'} · ${esc(N.label)}<div class="xs muted">${aafeWhy(N)}</div>`)}
    ${row('Net price (excl. VAT)', `<strong>${m(N.net)}</strong><div class="xs muted">${N.raw != null && Math.abs(N.raw - N.net) > 0.0001 ? `${m(N.raw)} rounded to ${m(N.net)}. ` : ''}${AAFE_ROUND}</div>`)}
    ${admin ? row('Minimum price', aafeFloorHtml(N), N.below ? 'aafe-r-below' : '') : ''}
    ${row('VAT', `${N.vatPct ? `${N.vatPct}% · ${m(N.vat)}` : 'No VAT'}<div class="xs muted">${N.vatPct ? 'Prices exclude VAT. VAT is added to the rounded net, to the penny, because Finance approved this bundle\'s VAT setting.' : 'Prices exclude VAT. This bundle has no approved VAT setting, so none is added.'}</div>${vatPend}`)}
    ${row('Total', `<strong class="aafe-total">${m(N.total)}</strong> for ${plural(N.qty, 'seat')}`)}
    ${row('Per seat', `${m(aafeP(N.net / N.qty))} net${N.vatPct ? ` · ${m(aafeP(N.total / N.qty))} incl. VAT` : ''}<div class="xs muted">For information — the bundle total above is what is charged.</div>`)}
  </tbody></table></div>`;
}

/* ---------- Business Admin / Super Admin / System Admin: bundle detail ---------- */
const aafeQs = p => [...new Set([1, p.seats, 10, 25, 50])].sort((a, b) => a - b);
const aafeAsList = p => p.agency ? [p.agency] : (ADMIN.agencies || []).map(a => a.name);
function aafeOut(p) {
  const qty = Math.max(1, +ui('aafeQ.' + p.id, p.seats) || p.seats), as = ui('aafeA.' + p.id, p.agency || '');
  return aafeHtml(aafeCalc(p, qty, as && aafeAsList(p).includes(as) ? as : (p.agency || null)), true);
}
function aafeSection(p) {
  const m = v => money(v, p.cur || 'GBP'), qty = ui('aafeQ.' + p.id, p.seats), as = ui('aafeA.' + p.id, p.agency || ''), rates = p.agency || !discAuto(p) ? [] : aafeRates();
  const prev = aafeQs(p).map(q => { const N = aafeCalc(p, q, p.agency || null); return `<tr data-q="${q}"><td class="r">${q}${q === p.seats ? ' <span class="xs muted">(default)</span>' : ''}</td><td class="r">${m(N.list)}</td><td class="small">${N.pct ? `−${N.pct}%` : '—'} <span class="xs muted">${esc(N.label)}</span></td><td class="r">${m(N.net)}</td><td class="r">${N.vatPct ? m(N.vat) : '—'}</td><td class="r"><strong>${m(N.total)}</strong></td><td class="r">${m(aafeP(N.net / q))}</td><td class="small">${N.below ? `<span class="aafe-below">Below minimum (${m(N.floor)})</span>` : 'At or above'}</td></tr>`; }).join('');
  const agRows = rates.map(([a]) => { const N = aafeCalc(p, p.seats, a); return `<tr data-ag="${esc(a)}"><td class="small">${esc(a)}</td><td class="r">−${N.agRate}%</td><td class="small">${esc(N.label)}</td><td class="r">${m(N.net)}</td><td class="r"><strong>${m(N.total)}</strong></td><td class="small">${N.below ? `<span class="aafe-below">Below minimum (${m(N.floor)}) by ${m(N.floor - N.net)} — not checked</span>` : 'At or above the minimum'}</td></tr>`; }).join('');
  return `<section class="card aafe-card" id="aafe-sec"><h2>How this price is worked out</h2>
    <p class="small">List total = each course's list price × seats. Then <strong>one</strong> discount (a negotiated price for one agency, a fixed bundle %, the agency's own rate or the volume rate — the better of the last two, never combined), rounded to whole pounds, then VAT on top once Finance has approved it. The agency's Buy Bundles uses these same figures for the quantity it chooses (1 seat or more).</p>
    <div class="form-grid"><div class="field"><label for="aafe-q">Seats</label><input class="input num" type="number" min="1" id="aafe-q" value="${esc(String(qty))}" data-oninput="aafeCalc" data-id="${p.id}"></div><div class="field"><label for="aafe-a">Price as</label><select class="select" id="aafe-a" data-onchange="aafeCalc" data-id="${p.id}">${p.agency ? '' : `<option value="" ${as ? '' : 'selected'}>Any agency without its own rate</option>`}${aafeAsList(p).map(a => `<option value="${esc(a)}" ${as === a ? 'selected' : ''}>${esc(a)}${(discNow().agency || {})[a] != null && !p.agency ? ` (own rate −${discNow().agency[a]}%)` : ''}</option>`).join('')}</select></div></div>
    <div id="aafe-out">${aafeOut(p)}</div>
    <h3>Quantity preview${p.agency ? ` — ${esc(p.agency)}` : ' — agencies without their own rate'}</h3>
    <div class="tbl-wrap"><table class="tbl dense aafe-prev"><thead><tr><th class="r">Seats</th><th class="r">List total</th><th>Discount</th><th class="r">Net</th><th class="r">VAT</th><th class="r">Total</th><th class="r">Net per seat</th><th>Minimum price</th></tr></thead><tbody>${prev}</tbody></table></div>
    ${p.agency ? '' : !discAuto(p) ? '<p class="xs muted">This bundle has its own discount, so agencies\' own rates don\'t change its price.</p>' : `<h3>Agencies with their own rate — at ${plural(p.seats, 'seat')}</h3>${agRows ? `<div class="tbl-wrap"><table class="tbl dense aafe-agr"><thead><tr><th>Agency</th><th class="r">Own rate</th><th>Discount applied</th><th class="r">Net</th><th class="r">Total</th><th>Minimum price</th></tr></thead><tbody>${agRows}</tbody></table></div><p class="xs muted">${ic('info', 12)} ${AAFE_FLOOR_Q}</p>` : '<p class="small muted">No agency has its own rate (Bundles &amp; Pricing → Discount rates).</p>'}`}
  </section>`;
}
const _pdAAFE = productDetail;
productDetail = function (id) {
  let h = _pdAAFE.apply(this, arguments); const p = STORE.biz && STORE.biz.products.find(x => x.id === id);
  if (!p || typeof h !== 'string' || !/Version history/.test(h)) return h;
  // D14: name what an agency with its own rate pays (the "Final price" above is for agencies without one)
  const rates = !p.agency && discAuto(p) ? aafeRates() : [];
  if (rates.length) {
    const txt = rates.map(([a]) => { const N = aafeCalc(p, p.seats, a); return `<div class="aafe-agp">${esc(a)}: <strong>${money(N.total, p.cur)}</strong> for ${p.seats} seats (${esc(N.label)})${N.below ? ` <span class="aafe-below">below minimum — not checked</span>` : ''}</div>`; }).join('');
    h = h.replace('<dt>Minimum price</dt>', `<dt>Agencies with their own rate</dt><dd>${txt}<span class="xs muted">The final price above is for agencies without their own rate.</span></dd><dt>Minimum price</dt>`);
  }
  const k = h.indexOf('<section class="card"><h2>Preview — the agency\'s Buy Bundles card</h2>'), e = k < 0 ? -1 : h.indexOf('</section></div>', k);
  return e < 0 ? h : h.slice(0, e + 16) + aafeSection(p) + h.slice(e + 16);
};
INP.aafeCalc = el => {
  const id = el && el.dataset && el.dataset.id, p = STORE.biz && STORE.biz.products.find(x => x.id === id);
  if (!aafeCanView()) return w0Deny('Bundles & Pricing', p ? `${p.id} · ${p.name}` : String(id || '—'), 'view a bundle price breakdown', 'Bundle prices are shown to the Business Admin, the Super Administrator and System Administrators.');
  if (!p) return false;
  const q = $('#aafe-q'), a = $('#aafe-a');
  if (q) setUi('aafeQ.' + p.id, Math.max(1, Math.floor(+q.value || 1)));
  if (a) setUi('aafeA.' + p.id, a.value);
  const o = $('#aafe-out'); if (o) o.innerHTML = aafeOut(p);
};

/* ---------- Agency: the buy modal (the signed-in agency's own price only) ---------- */
const _bphAAFE = buyPriceHtml;
buyPriceHtml = function (c, qty) {
  const h = _bphAAFE.apply(this, arguments), p = c && chProd(c.id);
  if (!p || S.portal !== 'agency') return h;
  return h + `<details class="aafe-d" open><summary class="small strong">How this price is worked out</summary>${aafeHtml(aafeCalc(p, qty, AGN()), false)}<p class="xs muted">You can buy 1 seat or more; the price is worked out for the number of seats you choose.</p></details>`;
};

/* ---------- Commercial Reports and the Business dashboard: what each figure is ---------- */
const _bRepAAFE = SCREENS['b-reports'];
SCREENS['b-reports'] = p => {
  let h = _bRepAAFE(p); const t = (p && p.tab) || 'sales';
  if (t === 'sales') h = h.replace('<p class="small"></p>', `<p class="xs muted aafe-lbl">${ic('info', 12)} Sales and Value are what agencies paid — gross, including VAT where a bundle has approved VAT. Finance → Reports → Agency revenue shows the net and VAT split.</p>`);
  if (t === 'pricing') {
    const rows = STORE.biz.products.filter(x => x.status === 'Published' && !x.agency && discAuto(x)).flatMap(x => aafeRates().map(([a]) => [x, a, aafeCalc(x, x.seats, a)]));
    h += `<section class="card aafe-rep"><h2>Agencies with their own rate</h2><p class="xs muted">The discounts above are each bundle's own price at its default seats. An agency with its own rate pays the price below (the better of its rate and the volume rate). ${AAFE_FLOOR_Q}</p>${rows.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Bundle</th><th>Agency</th><th class="r">Seats</th><th class="r">Discount</th><th class="r">Net</th><th class="r">Minimum price</th><th>Status</th></tr></thead><tbody>${rows.map(([x, a, N]) => `<tr><td class="small">${esc(x.name)}</td><td class="small">${esc(a)}</td><td class="r">${x.seats}</td><td class="r">−${N.pct}%</td><td class="r">${money(N.net, N.cur)}</td><td class="r">${money(N.floor, N.cur)}</td><td>${N.below ? chip('Below minimum — not checked', 'red') : chip('At or above', 'green')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No agency has its own rate.</p>'}</section>`;
  }
  return h;
};
const _bDashAAFE = SCREENS['b-dashboard'];
SCREENS['b-dashboard'] = p => { const h = _bDashAAFE(p); return typeof h === 'string' ? h.replace('<span class="xs muted">Bundle revenue</span>', '<span class="xs muted">Bundle revenue <span class="aafe-gl">(paid, incl. VAT)</span></span>') : h; };
