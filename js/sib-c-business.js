/* ============================================================
   SIB-FINAL C — Business Admin client feedback (3 Nov 2026; PD-SIB-C-01…). Loads after sib-b-iqa.js.
   BUS-01 Agency onboarding: the stepper keeps the current step in view at every width (narrow screens show the current step's
          label only); Back keeps what was typed (business.js, in place); closing the wizard by accident keeps a draft for the
          person onboarding, and "Onboard agency" offers to continue it or start again. The draft is not an agency: nothing is
          created, audited or sent until "Create agency"; the S5b identity and login checks are unchanged.
   BUS-02 Bundle builder: a price is shown only for valid input — seats a whole number of 1 or more, a flat discount 0–100 %,
   BUS-07 a negotiated price above £0, an agency for a customised bundle and an approved price for every course. Invalid input
          says why and can't be saved (it was silently priced as 1 seat, priced fractional seats, gave negative totals, or fell
          back to the automatic rate for a blank negotiated price). A negotiated price above the list is shown as that, not a
          negative discount. A course the price list can't price (it used an invented £35) stops publishing and buying. An NVQ
          programme names its fee options: which one an agency seat covers is a client decision. No price, rate or rounding rule
          changes; purchases keep the price they were bought at.
   BUS-03 Agency referral codes and customised bundles: the agency is chosen from the existing agencies (searchable, by ID) and
          the code / bundle keeps the agency ID; another agency never receives a customised bundle.
   BUS-04 Batch assignment leaves the Business Admin (navigation, route and handler); the Academic Admin and the Super
          Administrator keep it (Learner 360 → Enrolments). Agency seat assignment is a different thing and is unchanged.
   BUS-05 Announcements to agencies: the workflow is explained in both portals (no behaviour change).
   BUS-06 Agency reports: the admin agency report (All-agencies report, an agency's Reports tab) is counted from the records —
          its fixed figures (76 % / 72 %, 2 / 7, invented progress, results and dates) are gone; empty reports say why.
   ============================================================ */
'use strict';

/* ---------- BUS-01: onboarding — stepper, draft, resume ---------- */
const sibOaKey = () => (ADMIN && ADMIN.me && ADMIN.me.name) || '—';
const sibOaStore = () => (STORE.sibOa = STORE.sibOa || {});
const _isSIBC = initStore; initStore = function () { const r = _isSIBC.apply(this, arguments); STORE.sibOa = {}; return r; };
if (typeof STORE !== 'undefined' && STORE) sibOaStore();
// The wizard's state is copied in when the person chose to continue their draft (set by the newAgency wrapper below)
function sibOaResume(st) { const d = S.sibOaUse; S.sibOaUse = null; if (!d) return; st.step = d.step; Object.assign(st.d, JSON.parse(JSON.stringify(d.d))); }
// Closed without creating (Cancel, ×, Escape, a click outside): keep a draft unless nothing was entered
function sibOaClosed(st) {
  if (st.done) { delete sibOaStore()[sibOaKey()]; return; }
  const d = st.d, any = [d.name, d.legal, d.reg, d.address, d.contact, d.email, d.billing, d.others, d.login].some(x => String(x || '').trim());
  if (!any) return;
  sibOaStore()[sibOaKey()] = { step: st.step, d: JSON.parse(JSON.stringify(d)), at: now().toISOString() };
  toast('Onboarding draft kept — choose "Onboard agency" to continue it. No agency has been created.', 'info');
}
// Values on the open step are read before the dialog is removed (onClose runs after)
const _cmSIB = closeModal;
closeModal = function () { const m = MODAL; if (m && typeof m.sibKeep === 'function') { try { m.sibKeep(); } catch (e) { /* the dialog was already gone */ } } return _cmSIB.apply(this, arguments); };
const _newAgSIB = ACT.newAgency;
ACT.newAgency = (el, e) => {
  const dr = sibOaStore()[sibOaKey()];
  if (!dr || (el && el.dataset && el.dataset.sib)) return _newAgSIB(el, e);
  openModal({ title: 'Continue onboarding?', body: `<p class="small">You have an unfinished onboarding for <strong>${esc(dr.d.name || 'an unnamed agency')}</strong>, saved ${fdt(dr.at)} at step ${dr.step} of 7. It is a draft only — no agency, login or email exists yet.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Start again', cls: 'btn', fn: () => { delete sibOaStore()[sibOaKey()]; _newAgSIB({ dataset: { sib: '1' } }); return false; } }, { label: 'Continue the draft', cls: 'btn-primary', fn: () => { S.sibOaUse = dr; delete sibOaStore()[sibOaKey()]; _newAgSIB({ dataset: { sib: '1' } }); return false; } }] });
};
// The stepper: a class for its styles and the current step marked for assistive technology; scrolled into view
const _omSIBC = openModal;
openModal = function (m) {
  if (m && /^Onboard agency — step \d of 7/.test(m.title || '') && typeof m.body === 'string') {
    m.body = m.body.replace('<ol class="stepper">', '<ol class="stepper sib-oa-steps" aria-label="Onboarding steps">').replace('<li class="step cur">', '<li class="step cur" aria-current="step">');
    const o = m.onOpen; m.onOpen = el => { const c = el && el.querySelector('.sib-oa-steps .step.cur'), ol = c && c.parentElement; if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = Math.max(0, c.offsetLeft - (ol.clientWidth - c.offsetWidth) / 2); if (o) o(el); };
  }
  if (m && typeof m.body === 'string' && m.body.includes('id="rf-t"') && m.body.includes('id="rf-o"')) sibRfForm(m);
  if (m && /^(Create bundle|Edit bundle)/.test(m.title || '') && typeof m.body === 'string') m.body = sibBpAgencyOpts(m.body);
  return _omSIBC.apply(this, arguments);
};
// The fingerprint that decides whether the demo is saved includes the drafts (a draft alone is a change worth keeping)
if (typeof fcpFp === 'function') { const _fpSIB = fcpFp; fcpFp = function () { return _fpSIB.apply(this, arguments) + '|oa:' + JSON.stringify(STORE.sibOa || {}); }; }

/* ---------- BUS-02 / BUS-07: bundle prices only from valid input ---------- */
const sibPriced = t => (ADMIN.courses || []).some(c => c.title === t) || nvqBundleCourses().some(c => c.title === t);
const sibUnpriced = p => (p && p.courses ? p.courses : []).filter(t => !sibPriced(t));
const SIB_UNPRICED = t => `${t} has no approved price in the price list (it may have been retired, renamed or unpublished), so this bundle's price can't be worked out.`;
const _bpReadSIB = bpRead;
bpRead = function (st) {
  const raw = $('#bp-n') ? { s: mval('#bp-s'), k: $('#bp-k') ? mval('#bp-k') : null, p: $('#bp-p') ? mval('#bp-p') : null, t: $('#bp-t') ? mval('#bp-t') : null, a: $('#bp-a') ? mval('#bp-a') : null } : null;
  const d = _bpReadSIB.apply(this, arguments); if (raw && st && st.d) st.d._in = raw; return d;
};
const sibNum = v => (String(v).trim() !== '' && Number.isFinite(+v) ? +v : NaN);
// The first problem with the builder's input, or null
function sibBpWhy(d) {
  if (!d || !d.courses || !d.courses.length) return null; // bpOut already says "Choose at least one course."
  const n = d._in;
  if (n) {
    if (!/^\d+$/.test(String(n.s).trim()) || +n.s < 1) return { f: '#bp-s', msg: 'Seats: enter a whole number of seats, 1 or more.' };
    // A field that wasn't on screen when it was read (the pricing mode was just switched) falls back to the stored value
    const k = n.k != null ? n.k : (d.pct != null ? 'pct' : 'slabs'), pv = n.p != null ? n.p : d.pct, ag = n.a != null ? n.a : d.agency, tv = n.t != null ? n.t : d.customTotal;
    if (d.mode === 'auto' && k === 'pct') { const p = sibNum(pv); if (!(p >= 0 && p <= 100)) return { f: '#bp-p', msg: 'Discount %: enter a number from 0 to 100.' }; }
    if (d.mode === 'custom') {
      if (!ag || !ADMIN.agencies.some(a => a.name === ag)) return { f: '#bp-a', msg: 'Choose the agency this bundle is customised for.' };
      const t = sibNum(tv); if (!(t > 0)) return { f: '#bp-t', msg: 'Negotiated price: enter the agreed total for the bundle, more than £0.' };
    }
  }
  const u = sibUnpriced(d); if (u.length) return { f: null, msg: SIB_UNPRICED(u[0]) };
  return null;
}
const sibErrHtml = w => `<div class="note b-red sib-bp-err" role="alert">${ic('alert')}<div class="small"><strong>Price not worked out.</strong> ${esc(w.msg)} Nothing is saved until this is corrected.</div></div>`;
// NVQ programmes: the price list fee, and the programme's own fee options (which one a seat covers is not decided)
function sibNvqNote(p) {
  const out = []; (p.courses || []).forEach(t => {
    const pr = (ADMIN.programmes || []).find(x => x.title === t && nvqBundleCourses().some(c => c.title === t)); if (!pr) return;
    let opts = []; try { opts = typeof r1Eligible === 'function' ? r1Eligible(pr.id) : []; } catch (e) { opts = []; }
    const fees = opts.map(o => { try { return r1FeeOf(o); } catch (e) { return null; } });
    if (opts.length > 1 || fees.some(f => f != null && f !== coursePrice(t))) out.push(`<strong>${esc(t)}</strong>: bundles use the price-list fee of ${money(coursePrice(t), 'GBP')} per seat. The programme's fee options are ${opts.map((o, k) => `${esc(o.label)} ${fees[k] != null ? money(fees[k], 'GBP') : '(no fee)'}`).join(' · ')}.`);
  });
  return out.length ? `<div class="note b-amber sib-nvq" role="status">${ic('info')}<div class="small">${out.join('<br>')} Which fee option an agency's NVQ seat covers is a client decision — the delivery option is chosen at admission (PD-AG1-08), and no seat is priced from it.</div></div>` : '';
}
const _bpOutSIB = bpOut;
bpOut = function (d) {
  const w = sibBpWhy(d); if (w) return sibErrHtml(w);
  let h = _bpOutSIB.apply(this, arguments); const pr = d && d.courses && d.courses.length ? priceOf(d) : null;
  if (pr && d.customTotal && pr.pct < 0) h = h.replace(`discount ${pr.pct}%`, `negotiated price ${money(pr.final - pr.list, d.cur)} above the list price (no discount)`);
  if (pr) h = h.replace('</p>', ` <span class="xs muted sib-round">· ${esc(AAFE_ROUND)}</span></p>`);
  return h + (d && d.courses ? sibNvqNote(d) : '');
};
const _saveProdSIB = saveProduct;
saveProduct = function (st, how) {
  const d = bpRead(st), w = sibBpWhy(d);
  if (w) { if (w.f && $(w.f)) fieldErr(w.f, w.msg); else toast(w.msg, 'err'); const o = $('#bp-out'); if (o) o.innerHTML = sibErrHtml(w); return false; }
  const n0 = STORE.biz.products.length, r = _saveProdSIB.apply(this, arguments);
  const p = d.id ? STORE.biz.products.find(x => x.id === d.id) : (STORE.biz.products.length > n0 ? STORE.biz.products[STORE.biz.products.length - 1] : null);
  if (p) { const a = p.agency ? ADMIN.agencies.find(x => x.name === p.agency) : null; if (a) p.agencyId = a.id; else delete p.agencyId; delete p._in; }
  return r;
};
// The customised-bundle agency list shows each agency's ID and status; its value stays the name the pricing reads
function sibBpAgencyOpts(body) {
  return body.replace(/(<select class="select" id="bp-a"[^>]*>)([^]*?)(<\/select>)/, (m, a, opts, c) => a + opts.replace(/<option\s*(selected)?\s*>([^<]*)<\/option>/g, (x, sel, nm) => { const g = ADMIN.agencies.find(y => esc(y.name) === nm); return `<option value="${nm}"${sel ? ' selected' : ''}>${nm}${g ? ` (${g.id}${agStatus(g) !== 'Active' ? ' · ' + agStatus(g).toLowerCase() : ''})` : ''}</option>`; }) + c);
}
// Bundle page: the unpriced-course stop, the NVQ fee options, an above-list negotiated price named as such
const _pdSIB = productDetail;
productDetail = function (id) {
  let h = _pdSIB.apply(this, arguments); const p = STORE.biz.products.find(x => x.id === id); if (!p || typeof h !== 'string') return h;
  const u = sibUnpriced(p), pr = priceOf(p), k = h.indexOf('<div class="row">');
  const notes = (u.length ? `<div class="note b-red sib-unpriced" role="alert">${ic('lock')}<div class="small"><strong>Price unavailable.</strong> ${esc(SIB_UNPRICED(u[0]))} It can't be published or bought until the course has a price again or the bundle is edited; agencies don't see it.</div></div>` : '') + sibNvqNote(p);
  if (p.customTotal && pr.pct < 0) h = h.replace(`<dd>${pr.pct}% · ${esc(pr.label)}</dd>`, `<dd>None · ${esc(pr.label)} — ${money(pr.final - pr.list, p.cur)} above the list price</dd>`);
  return notes && k >= 0 ? h.slice(0, k) + notes + h.slice(k) : h + notes;
};
const _pubSIB = ACT.bPublish;
ACT.bPublish = el => { const p = STORE.biz.products.find(x => x.id === (el && el.dataset && el.dataset.id)), u = sibUnpriced(p); if (p && u.length) { logA('Bundles & Licences', `${p.id} · ${p.name}`, 'Blocked: publish bundle (price unavailable)', p.status, '—', SIB_UNPRICED(u[0])); toast(SIB_UNPRICED(u[0]), 'err'); return false; } return _pubSIB(el); };
// The agency catalogue: never a bundle without a price, never another agency's customised bundle (by agency ID)
const _catSIB = AGY_CATALOGUE;
AGY_CATALOGUE = function () {
  const me = typeof AG === 'function' ? AG() : null;
  return _catSIB.apply(this, arguments).filter(c => { const p = STORE.biz.products.find(x => x.id === c.id); if (!p) return true; if (sibUnpriced(p).length) return false; return !p.agencyId || !me || me.id === p.agencyId; });
};
['agBuy', 'agBuyMore'].forEach(k => { const f = ACT[k]; if (typeof f !== 'function') return; ACT[k] = el => {
  if (k === 'agBuy') { const id = el && el.dataset && el.dataset.id; if (!AGY_CATALOGUE().some(c => c.id === id)) { logA('Agency', id || '—', 'Blocked: buy a bundle', '—', '—', 'Not offered to this agency (not published, priced or available to it)'); toast('This bundle isn\'t available to buy.', 'err'); return false; } }
  return f(el); }; });

/* ---------- BUS-03: an agency code names an existing agency, by ID ---------- */
const sibRfAgencies = () => (ADMIN.agencies || []).filter(a => agStatus(a) !== 'Inactive');
function sibRfForm(m) {
  const own = (m.body.match(/id="rf-o" value="([^"]*)"/) || [])[1] || '', typ = (m.body.match(/<option selected>(Agent|Agency|Welfare Buddy)<\/option>/) || [])[1] || 'Agent';
  const cur = typ === 'Agency' ? (ADMIN.agencies.find(a => esc(a.name) === own) || {}).id : '';
  const pickHtml = `<div class="field sib-rf-ag" ${typ === 'Agency' ? '' : 'hidden'}><label for="sib-rf-a">Agency</label><label class="sr" for="sib-rf-q">Search agencies</label><input class="input" id="sib-rf-q" placeholder="Search by agency name or ID" data-oninput="sibRfQ" autocomplete="off"><select class="select" id="sib-rf-a" data-onchange="sibRfA"><option value="">Choose an existing agency…</option>${sibRfAgencies().map(a => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${esc(a.name)} (${a.id}) · ${agStatus(a)}</option>`).join('')}</select><span class="hint">An Agency code belongs to one existing agency and is kept with its agency ID. Inactive agencies aren't listed.</span></div>`;
  m.body = m.body.replace('<select class="select" id="rf-t">', '<select class="select" id="rf-t" data-onchange="sibRfT">')
    .replace(/<div class="field"><label for="rf-o">Owner<\/label>([^]*?)<span class="hint">For an Agency code, the agency's name\.<\/span><\/div>/, (x, inp) => `<div class="field sib-rf-own" ${typ === 'Agency' ? 'hidden' : ''}><label for="rf-o">Owner</label>${inp}<span class="hint">The agent's or Welfare Buddy's name.</span></div>${pickHtml}`);
}
// The owner field carries the agency's name while the type is Agency; a typed agent / Welfare Buddy name comes back if the type is changed back
INP.sibRfT = el => {
  const ag = el.value === 'Agency', w = $('#modal-root .sib-rf-own'), a = $('#modal-root .sib-rf-ag'), o = $('#rf-o'); if (w) w.hidden = ag; if (a) a.hidden = !ag; if (!o) return;
  if (ag && o.dataset.sibAg !== '1') { o.dataset.sibOwn = o.value; o.dataset.sibAg = '1'; o.value = (ADMIN.agencies.find(g => g.id === mval('#sib-rf-a')) || {}).name || ''; }
  else if (!ag && o.dataset.sibAg === '1') { o.value = o.dataset.sibOwn || ''; o.dataset.sibAg = ''; }
};
INP.sibRfA = el => { const a = ADMIN.agencies.find(g => g.id === el.value), o = $('#rf-o'); if (o) { if (o.dataset.sibAg !== '1') { o.dataset.sibOwn = o.value; o.dataset.sibAg = '1'; } o.value = a ? a.name : ''; } };
INP.sibRfQ = el => { const q = el.value.trim().toLowerCase(); $$('#sib-rf-a option').forEach(o => { o.hidden = !!o.value && !!q && !o.textContent.toLowerCase().includes(q); }); };
const _refOpSIB = s5dRefOp;
s5dRefOp = function (op, code, v, reason) {
  if ((op === 'create' || op === 'edit') && v && v.type === 'Agency') {
    const a = ADMIN.agencies.find(g => g.name === s5dClean(v.owner));
    // Shown on the agency list (the owner field is hidden for an Agency code)
    if (!a && $('#sib-rf-a')) { const r0 = _refOpSIB.apply(this, arguments); if (r0 && !r0.ok && r0.errs && r0.errs.owner) { r0.errs.owner = 'For an Agency code, choose an existing agency from the list'; fieldErr('#sib-rf-a', r0.errs.owner); } return r0; }
    if (a && agStatus(a) === 'Inactive') { s5dAudit('Referrals', code || v.code || '—', 'Blocked: ' + (op === 'create' ? 'create a referral code' : 'edit a referral code'), '—', '—', `${a.name} is inactive`); return { ok: false, errs: { owner: `${a.name} is inactive — choose an active or onboarding agency` } }; }
  }
  const res = _refOpSIB.apply(this, arguments);
  if (res && res.ok && res.r && (op === 'create' || op === 'edit')) { const r = res.r; if (r.type === 'Agency') { const a = ADMIN.agencies.find(g => g.name === r.owner); if (a) r.agencyId = a.id; } else delete r.agencyId; if (typeof s5dRefTouch === 'function') s5dRefTouch(r); }
  return res;
};

/* ---------- BUS-04: no academic batch assignment for the Business Admin ---------- */
const SIB_NO_BATCH = 'Batch assignment is an academic task: the Academic Admin (or the Super Administrator) changes a learner\'s batch from Learner 360 → Enrolments. The Business Admin doesn\'t change batches.';
(() => { const g = BNAV.findIndex(([, items]) => items.some(x => x[0] === 'b-batchassign')); if (g >= 0) { BNAV[g][1] = BNAV[g][1].filter(x => x[0] !== 'b-batchassign'); if (!BNAV[g][1].length) BNAV.splice(g, 1); } BIZ_ROUTES.delete('b-batchassign'); })();
const _bbaSIB = SCREENS['b-batchassign'];
SCREENS['b-batchassign'] = p => {
  if (S.portal === 'admin' && isBiz()) { logA('Batches', 'Batch assignment', 'Blocked: open batch assignment', '—', '—', SIB_NO_BATCH); return `<div class="lockpage sib-nobatch"><div class="lock-ic">${ic('lock', 30)}</div><h1>Batch assignment isn't part of the Business Admin role</h1><p class="muted">${esc(SIB_NO_BATCH)} Agency seat assignment (agencies giving bundle seats to their learners) is separate and is unchanged.</p><button class="btn btn-primary" data-go="b-dashboard">Go to the Business Dashboard</button></div>`; }
  return _bbaSIB(p);
};
const _mvSIB = ACT.chMoveBatch;
ACT.chMoveBatch = el => { if (isBiz() || !(isSA() || (typeof isAca === 'function' && isAca()))) { const lid = el && el.dataset && el.dataset.id; chMoveRefuse(lid || '—', 'Only the Academic Admin or the Super Administrator can change a learner\'s batch.'); return false; } return _mvSIB(el); };
const _bIdxSIB = SCREENS['b-index'];
SCREENS['b-index'] = p => _bIdxSIB(p).replace(/<li>(?:(?!<\/li>)[^])*?data-t="b-batchassign"(?:(?!<\/li>)[^])*?<\/li>/g, '');
// Demo Scenario #24: the move is made by the Academic Admin
ACT.chSc24Start = () => { S.edge = 'none'; if (STORE.worlds.B.signup.done) STORE.worlds.B = makeWorld('B'); setVariant('B'); ACT.chStep({ dataset: { s: '5' } }); acaEnter('KA'); S.signedIn = true; go('a-learner', { id: STORE.worlds.B.me.id, tab: 'enrolments' }); toast('Priya Raman has signed up with a deposit on Abu Dhabi Cohort 1. Viewing as the Academic Admin.', 'info'); };
ACT.chSc24Refuse = () => { acaEnter('KA'); S.signedIn = true; go('a-learner', { id: STORE.worlds.C.me.id, tab: 'enrolments' }); ACT.chMoveBatch({ dataset: { id: STORE.worlds.C.me.id } }); };
const _scSIB = SC_LIST;
SC_LIST = function () { return _scSIB.apply(this, arguments).map(sc => sc[0] !== '24' ? sc : [sc[0], sc[1], sc[2], sc[3].map(x => ({ ...x, text: x.text.replace(/The Business Admin opens Batch assignment\./, 'The Academic Admin opens her Learner 360 → Enrolments.').replace(/^The Business Admin moves her/, 'The Academic Admin moves her'), ...(x.r === 'bizA' && x.t === 'b-batchassign' ? { r: '', t: '', act: 'sibSc24Move' } : {}) }))]); };
ACT.sibSc24Move = () => { acaEnter('KA'); S.signedIn = true; go('a-learner', { id: STORE.worlds.B.me.id, tab: 'enrolments' }); };

/* ---------- BUS-05: how announcements reach agencies ---------- */
const SIB_ANN_FLOW = `<section class="card sib-how sib-ann-how"><h2>How announcements to agencies work</h2><ol class="sib-flow small">
  <li><strong>Write</strong> — "New announcement": title, message, optional attachment. "Save draft" keeps it to finish later (only drafts can be edited).</li>
  <li><strong>Choose the audience</strong> — all active agencies, or selected agencies (each chosen by its agency ID). The recipient count is shown before you send.</li>
  <li><strong>Publish or schedule</strong> — publish now, or schedule a time (UTC); a scheduled one is published the next time the prototype updates a screen after that time.</li>
  <li><strong>Delivered</strong> — each recipient agency gets an in-app notification and sees it under Announcements → "From the Academy". No other agency sees it.</li>
  <li><strong>Withdraw</strong> — with a reason; it disappears from the agencies' lists at once. History and the delivery log are kept.</li></ol>
  <p class="xs muted">Email and SMS are recorded in the delivery log only — nothing is sent from the prototype. There is no expiry date and no read receipt or acknowledgement from agencies; whether those are needed is a client decision. Agencies reply through Agency Messages, not on the announcement.</p></section>`;
const _bAnnSIB = SCREENS['b-anns'];
SCREENS['b-anns'] = p => eAfterHead(_bAnnSIB(p), SIB_ANN_FLOW);
const _gAnnSIB = SCREENS['g-anns'];
SCREENS['g-anns'] = p => { const h = _gAnnSIB(p); return /Announcements from the Academy/.test(h) ? h.replace('<section class="card"><h2>Announcements from the Academy</h2>', `<div class="note b-blue sib-ann-agy">${ic('info')}<div class="small">The Academy's Business Admin sends these to all agencies or to your agency only. You're told in Notifications when one arrives; a withdrawn announcement disappears from this list. To reply, use Messages.</div></div><section class="card"><h2>Announcements from the Academy</h2>`) : h; };

/* ---------- BUS-06: the admin agency report, counted from the records ---------- */
const SIB_AG_EMPTY = 'No agency learners yet. Figures appear once an agency buys a bundle and assigns seats, or a learner is linked to it. (The client demo starts with no purchases or agency learners — PD-AG1-10.)';
function sibAgFacts(names) {
  const A = STORE.agy.assign.filter(x => names.includes(x.agency)), comp = A.filter(x => x.kind === 'short'), done = comp.filter(x => x.status === 'Completed');
  const certs = STORE.agy.certs.filter(c => names.includes(c.agency)), exp = certs.filter(c => !c.revoked && c.expires && daysTo(c.expires) >= 0 && daysTo(c.expires) <= 60);
  const L = allLearners().filter(l => names.includes(l.agency) || names.some(n => (STORE.agy.linked[n] || []).includes(l.id)));
  return { A, comp, done, certs, exp, L };
}
agencyReport = function (a) {
  const names = a ? [a.name] : ADMIN.agencies.map(x => x.name), F = sibAgFacts(names), vis = a ? a.vis : { individual: true, consolidated: true, assessment: true, certExpiry: true };
  const certOf = x => F.certs.find(c => c.lid === x.lid && c.course === x.course);
  const rate = F.comp.length ? Math.round(F.done.length / F.comp.length * 100) + '%' : '—';
  return `<div class="kpis sib-agrep">${kpi('Agency learners', F.L.length)}${kpi('Completion rate (short courses)', rate)}${kpi('Certificates expiring (60 days)', F.exp.length)}</div>
  <p class="xs muted">Counted from the records: seat assignments, linked learners and certificates${a ? ' of this agency' : ' of every agency'}. Completion rate = completed short-course seats ÷ all short-course seats ("—" when there are none).</p>
  <div class="row">${exportMenu((a ? a.name : 'All agencies') + ' report')}</div>
  ${F.A.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th>${a ? '' : '<th>Agency</th>'}<th>Course</th><th>Status</th><th class="r">Progress</th>${vis.assessment ? '<th>Pass / Fail</th>' : ''}${vis.certExpiry ? '<th>Cert expiry</th>' : ''}</tr></thead><tbody>${F.A.map(x => { const c = certOf(x); return `<tr><td>${esc(x.learner)}</td>${a ? '' : `<td class="small">${esc(x.agency)}</td>`}<td class="small">${esc(x.course)}</td><td>${chip(x.status)}</td><td class="r">${x.progress}%</td>${vis.assessment ? `<td class="small">${esc(passFail(x))}</td>` : ''}${vis.certExpiry ? `<td class="small">${c && c.expires ? fd(c.expires) : '—'}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : `<div class="card flat"><p class="small muted sib-agrep-empty">${esc(SIB_AG_EMPTY)}</p></div>`}`;
};
const _barSIB = SCREENS['b-agreports'];
SCREENS['b-agreports'] = p => {
  let h = _barSIB(p); const id = ui('barA', 'all'), a = ADMIN.agencies.find(x => x.id === id), F = sibAgFacts(a ? [a.name] : ADMIN.agencies.map(x => x.name));
  if (!F.comp.length) h = h.replace(kpi('Completion rate', '0%'), kpi('Completion rate', '—'));
  const note = `<div class="note b-blue sib-agrep-how">${ic('info')}<div class="small"><strong>What this report counts.</strong> Learners: learners with an agency seat or linked to the agency. Completion rate: completed short-course seats ÷ all short-course seats. Seats: used ÷ purchased across the agency's bundles. Purchases: paid purchases (gross). ${a ? '"View as agency" shows exactly what this agency sees in its own portal.' : 'Choose an agency to filter, and to see "View as agency" — exactly what that agency sees.'}${F.A.length || F.L.length ? '' : ' ' + esc(SIB_AG_EMPTY)}</div></div>`;
  return eAfterHead(h, note);
};
