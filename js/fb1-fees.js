/* ============================================================
   FB1 — Fees & Payment Plans simplification, batch 1 (10 Nov 2026; PD-FB1-* in PROVISIONAL-DECISIONS.md). Loads last.
   Step 5 of a fee-package programme is configured per learner type and fee option. The financial engine, the Finance package, the
   Payment Schedule Duration and every stored record are unchanged.
   1 Removed from Step 5: the "Dated examples from" selector, the pricing-method line and the programme deposit editor. Kept: the
     status banner, the one-price conversion note (legacy programmes), Payment Schedule Duration, the learner-type cards, Before
     submitting, Finance review and the financial history. The programme deposit setting stays in the model (pkg.dep): fee options
     without their own setting keep inheriting it, and each says so on its card.
   2 Explicit deposits for new fee options. Three states, as the resolvers already read them (cb8DepOf, the learner pin):
       o.dep undefined           — inherits the programme setting (every fee option from before this batch);
       o.dep { mode: 'none' }    — explicit No: no deposit is offered (an object, so it never falls back to inheriting);
       o.dep { mode: 'default' | 'own' } — explicit Yes: the Academy default or a custom amount.
     A fee option created from now on (with a new course, or with Add Fee Option) is recorded in STORE.fb1.ask. Until Yes or No is
     chosen it is "not answered": shown as such, and the package can't be submitted or approved (cb8Issues). Nothing reads an
     unanswered choice as No, and nothing already approved is migrated or reinterpreted.
   3 Previews: instalment amounts are unchanged. Dates without a real batch are labelled illustrative (sample batch start), in
     Step 5, Finance's package view and the offer-letter payment wording; learners' dates always come from their own batch.
   4 New-course page: the fee guidance no longer names the old "Payment Plan step". Its inputs and creation rules are unchanged.
   ============================================================ */
'use strict';

const FB1 = () => (STORE.fb1 = STORE.fb1 || { ask: {} });
const _isFB1 = initStore; initStore = function () { STORE.fb1 = null; const r = _isFB1.apply(this, arguments); FB1(); return r; };
const fb1Mark = (pid, ids, how) => { const a = FB1().ask, at = now().toISOString(); ids.forEach(id => { if (id && !a[id]) a[id] = { pid, at, how }; }); };
// An option created since FB1 whose deposit choice hasn't been made (legacy options never ask)
const fb1Ask = o => !!o && !o.dep && !o.legacy && !!FB1().ask[o.id];
const FB1_ASK = nm => `${nm}: choose Allow Deposit — Yes or No.`;

/* ---------- Which fee options are new ---------- */
// A course created in the builder: every fee option it starts with
const _createFB1 = ch8Create;
ch8Create = function () {
  const pr = _createFB1.apply(this, arguments);
  if (pr && pr.cb8) { try { fb1Mark(pr.id, cb8Derive(pr).opts.filter(o => o.status === 'Active' && !o.legacy).map(o => o.id), 'created with the course'); } catch (e) { /* no package basis yet */ } }
  return pr;
};
// Add Fee Option: the option the dialog adds
const _optFB1 = ACT.cb8Opt;
ACT.cb8Opt = function (el) {
  const r = _optFB1.apply(this, arguments), pr = cbPr(el && el.dataset && el.dataset.p);
  if (!pr || (el.dataset && el.dataset.o) || !MODAL) return r;
  const a = MODAL.actions && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn) { const f = a.fn; a.fn = function () { const ids = new Set(cb8Work(pr).opts.map(o => o.id)), x = f.apply(this, arguments); fb1Mark(pr.id, cb8Work(pr).opts.filter(o => !ids.has(o.id)).map(o => o.id), 'added in Fees & Payment Plans'); return x; }; }
  return r;
};

/* ---------- The choice is required before the package goes to Finance (and before any approval) ---------- */
const _issFB1 = cb8Issues;
cb8Issues = function (pr, P) {
  const out = _issFB1.apply(this, arguments);
  (P && P.opts ? P.opts : []).filter(o => o.status === 'Active' && fb1Ask(o)).forEach(o => out.push({ o: o.id, msg: FB1_ASK(o.label || 'A fee option') }));
  return out;
};

/* ---------- The package-level deposit only where an option uses it ----------
   With deposits set on the fee options, the package's own setting can be used by no option at all. Two readers looked only at it:
   - cb8Legacy (the plan-level summary saved with each approved version: deposit / depOff, read by Payment Plans and E2's default
     change) now reports the options' setting when every active option resolves to the same one; mixed settings and packages whose
     options inherit give exactly what they gave before;
   - cb8Stale (can Finance still approve?) no longer refuses a package because the Academy default changed when no active option
     uses the package's default (an option's own "Academy default" is still checked, as before). */
const fb1Eff = pkg => pkg.opts.filter(o => o.status === 'Active').map(o => o.dep || pkg.dep);
const _legFB1 = cb8Legacy;
cb8Legacy = function (pkg) {
  const r = _legFB1.apply(this, arguments), d = fb1Eff(pkg); if (!d.length || !pkg.opts.some(o => o.status === 'Active' && o.dep)) return r;
  if (!d.every(x => x.mode === d[0].mode && (x.mode !== 'own' || x.amount === d[0].amount))) return r;
  return { ...r, dep: d[0].mode === 'own' ? d[0].amount : null, depOff: d[0].mode === 'none' };
};
const _staleFB1 = cb8Stale;
cb8Stale = function (pr, pkg) {
  if (pkg && pkg.dep && pkg.dep.mode === 'default' && pkg.dep.eff !== S4().cfg.deposit && pkg.opts.filter(o => o.status === 'Active').every(o => o.dep)) return _staleFB1.call(this, pr, { ...pkg, dep: { ...pkg.dep, eff: S4().cfg.deposit } });
  return _staleFB1.apply(this, arguments);
};

/* ---------- Allow Deposit: Yes / No (the existing handler does the rest) ---------- */
// Yes on an unanswered option starts from the Academy default; Yes on an option that inherits keeps the inherited setting as its own
const _depFB1 = INP.cbr2Dep;
INP.cbr2Dep = function (el) {
  const k = el && el.dataset && el.dataset.k; if (k !== 'yes' && k !== 'no' && k !== 'allow') return _depFB1.apply(this, arguments);
  const yes = k === 'yes' || (k === 'allow' && !!el.checked), pr = cbPr(el.dataset.p), o = pr && cb8Managed(pr) ? cb8Work(pr).opts.find(x => x.id === el.dataset.o) : null;
  if (yes && fb1Ask(o)) { if (!cb8Guard(el, 'change a fee option deposit')) { render(); return; } const t = cb8Mut(pr).opts.find(x => x.id === o.id); t.dep = { mode: 'default', amount: null }; cb8Touch(pr, 'Fee option deposit changed', `${t.label}: not answered`, `${t.label}: ${cb8DepTxt(t.dep)}`); render(); return; }
  if (!yes && fb1Ask(o)) { if (!cb8Guard(el, 'change a fee option deposit')) { render(); return; } const t = cb8Mut(pr).opts.find(x => x.id === o.id); t.dep = { mode: 'none', amount: null }; cb8Touch(pr, 'Fee option deposit changed', `${t.label}: not answered`, `${t.label}: ${cb8DepTxt(t.dep)}`); render(); return; }
  return _depFB1.call(this, { ...el, dataset: { ...el.dataset, k: 'allow' }, checked: yes, value: el.value, id: el.id });
};
// The card's deposit block: an explicit Yes / No, then (Yes) the amount, as before
function fb1DepBox(pr, P, o, ed) {
  const id = 'f2-' + o.id.replace(/\W/g, ''), D = { p: pr.id, o: o.id }, ret = o.status !== 'Active', dis = ed && !ret ? '' : 'disabled', ask = fb1Ask(o);
  const dep = ask ? null : cb8DepOf(P, o), allow = !!dep && dep.mode !== 'none', own = !!o.dep, depAmt = dep ? cb8DepE(dep) : null, fee = o.fee > 0 ? o.fee : null;
  const obsOn = cb8Basis(pr).req === true;
  const yn = (v, lbl) => `<label class="check"><input type="radio" name="${id}-al" value="${v}" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: v === 'yes' ? 'allow' : 'no' })} ${!ask && (v === 'yes') === allow ? 'checked' : ''} ${dis}><span>${lbl}</span></label>`;
  const note = ask ? '<span class="cb-badge warn fb1-na">Not answered</span>' : !own ? `<span class="xs muted fb1-inh">Inherited — programme setting: ${esc(cb8DepTxt(P.dep))}${P.dep.mode !== 'none' ? ` (${money(cb8DepE(P.dep), 'GBP')})` : ''}</span>` : '';
  return `<div class="cbr2-dep fb1-dep" data-ans="${ask ? 'none' : own ? (allow ? 'yes' : 'no') : 'inherited'}"><fieldset class="fb1-yn"><legend class="lbl">Allow Deposit</legend>${yn('yes', 'Yes')}${yn('no', 'No')}${note}</fieldset>
    ${allow ? `<div class="cbr2-depf"><fieldset class="field"><legend class="lbl">Deposit Amount (£)</legend><label class="check"><input type="radio" name="${id}-dm" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'default' })} ${dep.mode === 'default' ? 'checked' : ''} ${dis}>Academy default (${money(S4().cfg.deposit, 'GBP')})</label><label class="check"><input type="radio" name="${id}-dm" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'own' })} ${dep.mode === 'own' ? 'checked' : ''} ${dis}>Custom amount</label>
      ${dep.mode === 'own' ? `<input class="input num" type="number" min="0.01" step="0.01" id="${id}-da" aria-label="Custom deposit amount (£)" value="${dep.amount != null ? dep.amount : ''}" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'amount' })} ${dis}>` : ''}</fieldset>
      <p class="xs muted">Offered when the learner's batch starts in ${CH_HOLD_DAYS} days or more.${fee && depAmt ? ` Balance after the deposit: ${money(Math.max(0, fee - depAmt), 'GBP')}${obsOn ? ' + the observation fee' : ''}.` : ''}</p></div>` : ''}</div>`;
}

/* ---------- Step 5 fields save on change: a refusal's message stays visible ----------
   The handler refuses (fieldErr) and then the generic as-you-type check (polish.js) re-checked the same change event with only the
   field's min / max — replacing the message ("Enter 0.01 or more") or removing it (£12.345, a deposit not below the fee), so a refused
   value looked accepted. When the handler has just refused, the event stops there; the next edit is checked as before. */
['cbr2Dep', 'cbr2OptF', 'cbr2K'].forEach(n => {
  const f = INP[n]; if (typeof f !== 'function') return;
  INP[n] = function (el, e) {
    if (el && el.dataset) delete el.dataset.errMsg;
    const fd = el && el.closest && el.closest('.field'), old = fd && fd.querySelector('.err'); if (old) { old.remove(); el.removeAttribute('aria-invalid'); } // a new refusal shows its own reason
    const r = f.apply(this, arguments);
    if (e && e.stopImmediatePropagation && el && el.dataset && el.dataset.errMsg && el.isConnected) e.stopImmediatePropagation();
    return r;
  };
});

/* ---------- Previews: illustrative unless they come from a real batch ---------- */
const fb1PrevLbl = a => (/^batch /.test(a.lbl) ? `Example due dates — ${a.lbl}, starting ${cbFd(a.ymd)}` : `Illustrative due dates — sample batch start ${cbFd(a.ymd)}`);
const FB1_PREV_NOTE = 'Not payment dates: each learner\'s dates are set from their own batch start.';
// One fee option card: the explicit deposit choice and the preview labels
const _optHtmlFB1 = cbr2Opt;
cbr2Opt = function (pr, P, o, b, ed) {
  const h = _optHtmlFB1.apply(this, arguments), d = document.createElement('div'); d.innerHTML = h;
  const box = d.querySelector('.cbr2-dep');
  if (box) box.outerHTML = fb1DepBox(pr, P, o, !!ed && o.status === 'Active');
  if (fb1Ask(o)) d.querySelectorAll('.cbr2-depx').forEach(x => x.remove()); // not answered: no deposit is assumed in the previews
  const a = cb8Anchor(pr);
  d.querySelectorAll('details.cb8-ex > summary').forEach(s => { s.textContent = fb1PrevLbl(a); if (!s.parentNode.querySelector('.fb1-prevnote')) s.insertAdjacentHTML('afterend', `<p class="xs muted fb1-prevnote">${esc(FB1_PREV_NOTE)}</p>`); });
  return d.innerHTML;
};
// Step 5 without the redundant controls (a programme on terms from before packages keeps its own panels)
const _feesFB1 = cbr2Fees;
cbr2Fees = function (pr) {
  const h = _feesFB1.apply(this, arguments); if (!cb8Managed(pr)) return h;
  const d = document.createElement('div'); d.innerHTML = h;
  d.querySelectorAll('.cbr2-fees > .cb8-sample, .cbr2-fees > .cbr2-pm, .cbr2-fees > .cbr2-pdep').forEach(x => x.remove());
  return d.innerHTML;
};
// The live preview while typing a number of instalments
const _kLiveFB1 = INP.cb8KLive;
INP.cb8KLive = function (el) {
  const r = _kLiveFB1.apply(this, arguments), box = el && el.closest && el.closest('.cb8-add') && el.closest('.cb8-add').querySelector('.cb8-prev');
  if (box) box.innerHTML = box.innerHTML.replace(/Example for sample start ([^:]+):/, 'Illustrative dates from a sample batch start ($1), not payment dates:').replace(/Example for batch ([^:]+):/, 'Example dates for batch $1:');
  return r;
};
// Finance's package view, the submit dialog and the version history (one renderer)
const _payFB1 = cb8PayHtml;
cb8PayHtml = function (pr, o, x, dur, anchor) {
  const h = _payFB1.apply(this, arguments); if (!anchor) return h;
  return h.replace(/<summary class="xs">Dated example \([^<]*\)<\/summary>/, `<summary class="xs">${esc(fb1PrevLbl(anchor))}</summary><p class="xs muted fb1-prevnote">${esc(FB1_PREV_NOTE)}</p>`);
};
// Offer letter payment wording (programme preview): the sample date is labelled as such
const _ltFB1 = cb8LetterCard;
cb8LetterCard = function (pr) {
  const h = _ltFB1.apply(this, arguments), a = cb8Anchor(pr); if (!h || /^batch /.test(a.lbl)) return h;
  return h.replace(/(<p class="xs muted">Shown with the deposit offered[^<]*?) · sample start ([^<.]*)\.<\/p>/, (m, p1, dt) => `${p1}. Illustrative dates from a sample batch start (${dt}); each applicant's letter uses their own batch.</p>`);
};

/* ---------- Review & Publish: each fee option's deposit, including "not answered" ---------- */
const _rvFB1 = cbr2Review;
cbr2Review = function (pr) {
  const h = _rvFB1.apply(this, arguments); if (!cb8Managed(pr)) return h;
  const P = cb8Work(pr), act = P.opts.filter(o => o.status === 'Active'); if (!act.some(o => fb1Ask(o))) return h;
  const d = document.createElement('div'); d.innerHTML = h;
  const dt = [...d.querySelectorAll('.cb-rv-sec[data-sec="payments"] dl dt')].find(x => x.textContent.trim() === 'Deposit');
  if (dt && dt.nextElementSibling) dt.nextElementSibling.textContent = act.map(o => `${o.label}: ${fb1Ask(o) ? 'not answered' : o.dep ? cb8DepTxt(o.dep) + (o.dep.mode !== 'none' ? ` (${money(cb8DepE(o.dep), 'GBP')})` : '') : cb8DepTxt(P.dep) + ' (programme setting)'}`).join(' · ');
  return d.innerHTML;
};

/* ---------- New-course page: current step name in the fee guidance ---------- */
const FB1_NEW_FEES = 'Add the fees and delivery modes learners choose from. Instalment options and deposits are set in Fees & Payment Plans after the course is saved.';
const _fieldsFB1 = ch8DetailsFields;
ch8DetailsFields = function () { return _fieldsFB1.apply(this, arguments).replace(/(<p class="xs muted e1-step1-fees">)[^<]*(<\/p>)/, `$1${esc(FB1_NEW_FEES)}$2`); };

/* ============================================================
   FB1 final integrity corrections (10 Nov 2026; PD-FB1-07…10)
   ============================================================ */

/* ---------- PD-FB1-07 Retired fee options can't be changed — direct calls and stale screens or dialogs included ----------
   The handlers looked up the option without checking it was still Active (the Yes / No answer, the payment-option list, the edit
   dialog saved after the option was retired). Learners who chose a retired option keep their terms; nothing about it changes. */
const fb1RetOf = (pid, oid) => { const pr = cbPr(pid); if (!pr || !oid || !cb8Managed(pr) || !cbAdmin()) return null; const o = cb8Work(pr).opts.find(x => x.id === oid); return o && o.status !== 'Active' ? { pr, o } : null; };
const fb1RetNo = (r, what) => { logA('Payment Plans', `${r.o.label} (${r.o.id})`, 'Blocked: ' + what, '—', '—', 'Fee option retired — not offered to new learners; learners who chose it keep their terms'); toast('This fee option is retired, so it can\'t be changed. Learners who chose it keep their terms.', 'err'); render(); };
[['cbr2Dep', 'change a fee option deposit'], ['cbr2OptF', 'edit a fee option'], ['cbr2K', 'change a payment option']].forEach(([n, what]) => {
  const f = INP[n]; INP[n] = function (el) { const d = (el && el.dataset) || {}, r = fb1RetOf(d.p, d.o); if (r) return fb1RetNo(r, what); return f.apply(this, arguments); };
});
[['cb8PayAdd', 'add a payment option'], ['cb8PayDel', 'remove a payment option']].forEach(([n, what]) => {
  const f = ACT[n]; ACT[n] = function (el) { const d = (el && el.dataset) || {}, r = fb1RetOf(d.p, d.o); if (r) return fb1RetNo(r, what); return f.apply(this, arguments); };
});
const _optRetFB1 = ACT.cb8Opt;
ACT.cb8Opt = function (el) {
  const res = _optRetFB1.apply(this, arguments), d = (el && el.dataset) || {}; if (!d.o || !MODAL) return res;
  const a = MODAL.actions && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn) { const f = a.fn; a.fn = function () { const r = fb1RetOf(d.p, d.o); if (r) { closeModal(); fb1RetNo(r, 'edit a fee option'); return false; } return f.apply(this, arguments); }; }
  return res;
};

/* ---------- PD-FB1-08 The Finance queue and the terms in force take only a complete package ----------
   cb8SubmitNow (the queue item) and cb8Apply (a new plan version) checked nothing themselves — their screen actions did — so a direct
   call could queue or apply an incomplete package (an unanswered deposit, a missing fee). Both now run the same checks. */
const _subNowFB1 = cb8SubmitNow;
cb8SubmitNow = function (pr) {
  const wf = pr && cb8Wf(pr), no = (why, msg) => { logA('Payment Plans', pr ? cb8Ent(pr) : '—', 'Blocked: submit payment terms', '—', '—', why); toast(msg, 'err'); return false; };
  if (!pr || !cb8Managed(pr)) return no('No financial package', 'Start a financial package first.');
  if (!cbAdmin()) return no('Role can\'t change financial terms', 'Only the Super Admin, Academic Admin or System Admin submit payment terms. Finance approves them.');
  if (cbRetired(pr)) return no('Programme retired', 'This programme is retired, so it is read-only.');
  if (wf && wf.status === 'Pending') return no(`Already waiting for Finance review (${wf.qid})`, `These terms are already waiting for Finance review (${wf.qid}).`);
  if (wf && wf.status === 'Approved') return no('Already approved', 'These terms are already approved. Change something first.');
  const iss = cb8Issues(pr, cb8Work(pr)); if (iss.length) return no('Incomplete package: ' + iss[0].msg, `Fix ${plural(iss.length, 'item')} before submitting: ${iss[0].msg}`);
  return _subNowFB1.apply(this, arguments);
};
const _applyFB1 = cb8Apply;
cb8Apply = function (pr, pkg0) {
  const iss = pr && pkg0 && pkg0.opts ? cb8Issues(pr, { dep: pkg0.dep, partial: pkg0.partial, opts: pkg0.opts.map(o => ({ ...o, obsWp: o.keptWp, obsOff: o.keptOff })) }) : [{ msg: 'No package to apply' }];
  if (iss.length) { logA('Payment Plans', pr ? cb8Ent(pr) : '—', 'Blocked: put payment terms in force', '—', '—', iss[0].msg); return iss[0].msg; }
  return _applyFB1.apply(this, arguments);
};

/* ---------- PD-FB1-09 One deposit amount: what the learner is shown and accepts is what is charged ----------
   Root cause: a fee option that inherits the package deposit showed the amount Finance approved (frozen in the package: the payment
   step, the sign-up dialog, the letter wording, "Deposit, then N payments") but charged the learner's plan terms, which take the
   Academy default as it is now. After the default changed, a learner saw £300 and paid £350. Options with their own setting already
   used the approved amount for both.
   - Sign-up start: the learner's terms take the approved package amount for every option (no change when they already agree).
   - The approved amount is never silently replaced by a newer Academy default. When the package's deposit is "the Academy default" and
     the default has changed since Finance approved it, the approval is stale for the deposit: the deposit isn't offered and can't be paid
     (paying in full or by instalments is unaffected), with a message saying why and what to do. Recorded with the learner's terms.
   - Historical terms where the two amounts already disagree (sign-ups started before this correction) aren't rewritten: the deposit is
     refused with a message until the Academy confirms it; other ways to pay are unaffected.
   - Nothing signed, paid or frozen in a schedule changes. The 28-day eligibility and the seat hold are unchanged. */
const fb1P = v => Math.round(Number(v) * 100);
const _suFB1 = ch8StartSignup;
ch8StartSignup = function (w) {
  const r = _suFB1.apply(this, arguments), t = w && w.signup && w.signup.plan, P = t && t.cb8; if (!P || !P.dep || t.issue) return r;
  const D = P.dep, depOff = D.mode === 'none', dep = depOff ? null : D.eff, cfg = S4().cfg.deposit;
  const stale = D.mode === 'default' && D.eff != null && fb1P(D.eff) !== fb1P(cfg) ? Object.freeze({ approved: D.eff, now: cfg }) : null;
  if (t.deposit === dep && !!t.depOff === depOff && !stale) return r;
  const was = t.deposit;
  w.signup.plan = Object.freeze({ ...t, deposit: dep, own: D.mode === 'own', depOff, ...(stale ? { depStale: stale } : {}) });
  if (w.admission && w.admission.deposit) Object.assign(w.admission.deposit, depOff ? { min: null, balance: null } : { min: dep, balance: P.opt.fee - dep });
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Deposit fixed from the approved terms', was == null ? '—' : money(was, 'GBP'), depOff ? 'No deposit' : money(dep, 'GBP') + (stale ? ' (approval stale — deposit not offered)' : ''), `Plan version ${P.planV}${stale ? ` · Academy default ${money(stale.approved, 'GBP')} when approved, ${money(stale.now, 'GBP')} now` : ''}`);
  return r;
};
// Why this applicant can't pay a deposit now, or null
function fb1DepHold(w) {
  const t = w && w.signup && w.signup.plan, P = t && t.cb8; if (!P || !P.dep || P.dep.mode === 'none' || (w.signup && w.signup.done) || chSponsored(w)) return null;
  if (t.depStale) return { k: 'stale', why: `Approval stale: Academy default ${money(t.depStale.approved, 'GBP')} when approved, ${money(t.depStale.now, 'GBP')} now`,
    msg: `The deposit for this course is being re-confirmed: the Academy's standard deposit changed after these payment terms were approved (${money(t.depStale.approved, 'GBP')} approved, ${money(t.depStale.now, 'GBP')} now). You can pay in full or by instalments now. To pay a deposit instead, contact the Academy — your sign-up can be restarted once Finance has confirmed the new terms.` };
  if (t.deposit != null && P.dep.eff != null && fb1P(t.deposit) !== fb1P(P.dep.eff)) return { k: 'mismatch', why: `Terms disagree: ${money(P.dep.eff, 'GBP')} approved and shown, ${money(t.deposit, 'GBP')} in the plan terms`,
    msg: `Your deposit amount needs to be confirmed by the Academy's Finance team before it can be taken. You can pay in full or by instalments now, or contact the Academy about the deposit.` };
  return null;
}
const fb1DepNo = (w, h) => logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Blocked: deposit payment', '—', '—', h.why);
// Payment step: the deposit routes are left out, with the reason (the choice falls back to an instalment option)
const _spFB1 = chStepPay;
chStepPay = function (w) {
  const h0 = fb1DepHold(w); if (!h0) return _spFB1.apply(this, arguments);
  const P = cb9Pin(w), ks = P.opt.pay.map(x => x.k), c = ui('cb9Pay', undefined);
  if (c == null || c === 'deposit' || /^dep\d+$/.test(String(c))) setUi('cb9Pay', String(ks.find(k => k > 1) || ks[0]));
  if (ui('suOpt', undefined) === 'deposit') setUi('suOpt', 'instalment');
  const d = document.createElement('div'); d.innerHTML = _spFB1.apply(this, arguments);
  d.querySelectorAll('input[name="cb9-pay"]').forEach(i => { if (i.value === 'deposit' || /^dep\d+$/.test(i.value)) { const l = i.closest('label'); if (l) l.remove(); } });
  d.querySelectorAll('.ch-nodep, .e2-nodep').forEach(x => x.remove());
  const fs = d.querySelector('.cb9-opts'), lg = fs && fs.querySelector('legend');
  if (lg) lg.insertAdjacentHTML('afterend', `<div class="note b-amber fb1-dephold" role="status">${ic('alert')}<div class="small"><strong>Deposit not available right now.</strong> ${esc(h0.msg)}</div></div>`);
  return d.innerHTML;
};
const _suPayFB1 = ACT.suPay;
ACT.suPay = function (el) {
  const w = W, h0 = w && w.signup && !w.signup.done ? fb1DepHold(w) : null, c = String(ui('cb9Pay', '') || '');
  if (h0 && (c === 'deposit' || /^dep\d+$/.test(c))) { fb1DepNo(w, h0); toast(h0.msg, 'err'); setUi('cb9Pay', null); render(); return; }
  if (h0 && !c) { const ks = cb9Pin(w).opt.pay.map(x => x.k); setUi('cb9Pay', String(ks.find(k => k > 1) || ks[0])); if (ui('suOpt', undefined) === 'deposit') setUi('suOpt', 'instalment'); } // nothing chosen: the option the page shows, never the deposit
  return _suPayFB1.apply(this, arguments);
};
// The last line of defence (a direct call, a stale checkout)
const _ccFB1 = chComplete;
chComplete = function (w, o) {
  const h0 = w && o && o.opt === 'deposit' ? fb1DepHold(w) : null;
  if (h0) { fb1DepNo(w, h0); if (!arguments[3]) { if (MODAL) closeModal(); toast(h0.msg, 'err'); render(); } return; }
  return _ccFB1.apply(this, arguments);
};
// The offer letter's payment wording doesn't offer a deposit that can't be taken
const _ptFB1 = e2PayTerms;
e2PayTerms = function (w) { const P = cb9Pin(w), h0 = P && fb1DepHold(w); if (!h0) return _ptFB1.apply(this, arguments); return cb8PayTermsTxt({ dep: P.dep, dur: P.dur }, P.opt, cb9Anchor(w), false) || _ptFB1.apply(this, arguments); };
// The sign-up dialog says the same for an option whose approved "Academy default" deposit is out of date
const _appFB1 = ACT.applyNvq;
ACT.applyNvq = function (el) {
  const r = _appFB1.apply(this, arguments), c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), pr = c && c.kind === 'nvq' ? s3Progs().find(p => p.title === c.title) : null, pkg = pr && cb8Cur(pr.id);
  if (!MODAL || !pkg) return r;
  const stale = o => { const D = o.dep || pkg.dep; return D.mode === 'default' && D.eff != null && fb1P(D.eff) !== fb1P(S4().cfg.deposit); };
  const t = document.createElement('template'); t.innerHTML = MODAL.body; let ch = false;
  t.content.querySelectorAll('.r1-pick').forEach(l => { const o = pkg.opts.find(x => x.id === (l.querySelector('input') || {}).value), s = l.querySelector('.xs.muted'); if (!o || !s || !stale(o)) return; s.textContent = s.textContent.replace(/Deposit £[\d,.]+ \(when your batch starts in \d+ days or more\) or /, 'Deposit: being re-confirmed by the Academy — '); ch = true; });
  if (ch) { MODAL.body = t.innerHTML; renderModal(); }
  return r;
};

/* ---------- PD-FB1-10 Academy default changes and financial packages ----------
   E2 gave every programme whose plan used the default a new plan version ("same terms"). For a package programme that version carried the
   package approved at the old amount while its own record said the new one — and the package didn't even have to use the default (a
   package whose options all have their own deposit). Now: a package programme gets no such version. If an option of the package in force
   (or held for a draft version) uses the Academy default, its approval is withdrawn (back to Draft; the approved version stays in force
   for learners who already agreed it) and the creator submits it again — Finance then approves the new amount. Packages that don't use
   the default are untouched. Programmes on terms from before packages keep E2's rule. */
const fb1UsesDef = pkg => !!pkg && pkg.opts.some(o => o.status === 'Active' && (o.dep || pkg.dep).mode === 'default');
let FB1_DC = null;
const _psFB1 = s4PlanSave;
s4PlanSave = function (pr) { if (FB1_DC && pr && cb8Cur(pr.id)) return 'A financial package: its approved terms are kept'; return _psFB1.apply(this, arguments); };
const _dcFB1 = e2DefaultChanged;
e2DefaultChanged = function (d0, d1) {
  FB1_DC = true; let res; try { res = _dcFB1.apply(this, arguments); } finally { FB1_DC = null; }
  s4PlanProgs().filter(pr => cb8Cur(pr.id)).forEach(pr => {
    const wf = cb8Wf(pr), held = wf && wf.held && wf.held.pkg; if (!wf || wf.status !== 'Approved' || !(fb1UsesDef(cb8Cur(pr.id)) || fb1UsesDef(held))) return;
    wf.status = 'Draft'; if (wf.held) delete wf.held;
    cb8Hist(pr, 'Approval withdrawn — the Academy default deposit changed', `${money(d0, 'GBP')} when approved, ${money(d1, 'GBP')} now: submit the terms to Finance again`);
    logA('Payment Plans', cb8Ent(pr), 'Payment terms need Finance approval again', 'Approved', 'Draft', `Academy default deposit changed from ${money(d0, 'GBP')} to ${money(d1, 'GBP')}; the deposit isn't offered to new sign-ups until Finance approves the terms again`);
    if (res && Array.isArray(res.waiting)) res.waiting.push(`${pr.title} (approved terms — submit again)`);
  });
  return res;
};

/* ---------- Records ---------- */
UXC.push(['FB1','Fees & Payment Plans — simplified to fee options (10 Nov 2026)', [
  'Step 5 shows the payment-terms status, Payment Schedule Duration, the fee options grouped by learner type, Before submitting and the financial history. Removed: "Dated examples from", the pricing-method line and the programme deposit editor. A one-price course keeps "Use fee options by delivery mode".',
  'Allow Deposit is an explicit Yes / No on each fee option. A fee option created from now on starts "Not answered" and the package can\'t be submitted or approved until it is answered; No means no deposit is offered. Fee options from before keep inheriting the programme setting, shown on their card. Approved packages and learners\' terms are unchanged; the 28-day rule and the seat hold are unchanged.',
  'Due-date previews without a real batch are labelled "Illustrative … sample batch start" and say they are not payment dates; amounts are exact. The new-course page\'s fee guidance names Fees & Payment Plans.']]);
