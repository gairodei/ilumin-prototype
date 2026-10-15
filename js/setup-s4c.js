/* ============================================================
   Setup fixes S4c — agency bundle discount slabs. The rates (discount.js) are one versioned store kept across admin
   rebuilds; slab ranges are respected; slabs can be added, edited, removed, validated and previewed; a negotiated or fixed-%
   bundle price is never overridden by a per-agency %; the save checks the permission itself. This file records, on each
   agency purchase, the discount basis and rate version used, so the agreed price stays traceable after later rate changes.
   Loads after setup-n3.js.
   ============================================================ */
'use strict';
const s4cStamp = (x, pr) => x && Object.assign(x, { discPct: pr.pct, discBasis: pr.basis || pr.label, discLabel: pr.label, rateV: pr.rateV || null, list: pr.list });
const _agPayS4c = agPayResult;
agPayResult = function () {
  const b = S.agy.buy, pr = b ? priceFor(b.c, b.qty) : null, n = STORE.agy.purchases.length, r = _agPayS4c.apply(this, arguments);
  if (pr && STORE.agy.purchases.length > n) { const p = STORE.agy.purchases[0]; s4cStamp(p, pr); s4cStamp(p.bundle && ADMIN.bundles.find(x => x.id === p.bundle), pr); s4cStamp(STORE.fin && STORE.fin.tx.find(x => x.ref === p.ref), pr); }
  return r;
};
UXC.push(['Setup S4c', 'Setup fixes — agency bundle discount slabs (G5.6)', [
  'Rates (Bundles & Pricing → Discount rates): slabs can be added, edited and removed; "Preview the effect on new purchases" shows, per seat quantity, the discount now and proposed. Validation: whole seat numbers from 1, ascending, no gaps or overlaps, only the last slab open ("and above"), slabs 0–60% and the standard 0–50% (the existing limits); a quantity below the first slab gets the standard %. Invalid saves are refused and logged.',
  'Pricing: one rule for every automatic price — the slab whose range contains the quantity (the "to" value is now respected), else the standard %. Used by the agency catalogue, the quantity dialog, checkout (VAT added on top as CH-06), the purchase record and Finance, and by the admin catalogue. A negotiated price (customTotal) or a fixed-% bundle always keeps its own price — a per-agency % no longer overrides a negotiated price (it used to when it was higher; S4a decision). For automatic prices the per-agency % applies only when it is higher than the volume / standard rate — the better of the two, never both (existing prototype rule; precedence pending client confirmation). GBP only; no VAT invoices in the LMS.',
  'Purchases keep exactly what was agreed: amount, net, VAT, discount %, basis and the rate version are stored on the purchase, the credited bundle and the Finance transaction; later rate changes don\'t touch them. Bank-transfer requests fix their amount when requested (unchanged).',
  'Per-agency list: every agency is listed with its real status (Onboarding, Active, Inactive) — AG-08, AG-09 and AG-11 included. Listing or a rate there doesn\'t let an agency buy; that still follows the agency\'s own status and activation.',
  'Approvals (G5.6 / D11, unchanged): the Super Admin saves a new version directly; a holder of "Change discount rate" raises a request the Super Admin decides; a rejected request changes nothing. The save now checks the permission itself — others are refused and logged.',
  'Versions now live in the prototype store, so switching admin variant or identity, or rebuilding the admin view, no longer resets them; only the demo reset restores the seeded versions 1 and 2. The volume-price hints on Buy Bundles and the bundle editor show the current rates.',
  'Change requests: each "Discount rate change" request is kept with the rates and re-attached to the Approvals Queue after an admin rebuild, variant or identity switch — same ID, requester, proposed rates, history and status; only the demo reset clears them. Only the Super Administrator decides (the requester and other roles are refused and logged); an approval applies the proposed rates exactly once, and a repeated decision on a decided request is refused. Request IDs no longer depend on the queue length, so they can\'t collide after a rebuild.',
  'Open: the precedence between a per-agency % and the volume / standard rate is the existing "better of the two" rule — to be confirmed by the client. No effective dates (rates apply to new purchases from the moment they are saved or approved). Known, outside S4c (for N5): switching the admin variant re-seeds some observation-fee data.']]);
const _aIdxS4c = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS4c(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Bundles & Pricing → Discount rates (slabs)', { act: 'aJump', t: 'a-bundles..rates' }, 'S4c — add, edit, remove and preview slabs; negotiated prices protected; versions kept.')}`);
