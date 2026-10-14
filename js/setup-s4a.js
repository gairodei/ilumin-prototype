/* ============================================================
   Setup fixes S4a — admission and money (S4-05 … S4-09).
   One document checklist per programme (items apply to All, UK or UAE applicants), one versioned payment plan per
   programme (fee, own deposit or the global default, instalments, partial payments; first instalment at sign-up — CH-10),
   the global deposit default and seat-hold days read by sign-up and seat release, the Super Admin's plan operations
   using Finance's own logic, and offer-letter versions that keep their own text, with a snapshot of what was signed.
   A learner without an NVQ who signs up to Level 2–5 from Browse goes through the same real sign-up as the programmes
   made with the wizard (Priya Raman's seeded demo journey is unchanged). Everything an applicant gets — checklist,
   plan, offer letter, structure — is fixed when their sign-up starts. Loads after setup-s3.js.
   ============================================================ */
'use strict';

/* ---------- Store ---------- */
// Today's applicant documents (data.js): the UK and UAE versions as applicants get them, plus the builder's retired item
const S4_STD_DOCS = [
  ['Passport or UK photo driving licence', 1, 'PDF, JPG or PNG', '5 MB', 0, 'UK', 'The photo page, all four corners visible.'],
  ['Passport', 1, 'PDF, JPG or PNG', '5 MB', 0, 'UAE', 'The photo page, all four corners visible.'],
  ['Right to work (share code letter)', 1, 'PDF, JPG or PNG', '5 MB', 1, 'UK', 'Download your share code letter from GOV.UK.'],
  ['Emirates ID and residence visa', 1, 'PDF, JPG or PNG', '5 MB', 1, 'UAE', 'Both sides of your Emirates ID and the visa page.'],
  ['Proof of address (last 3 months)', 1, 'PDF, JPG or PNG', '5 MB', 0, 'All', 'Utility bill, council tax or bank statement dated within the last 3 months.'],
  ['Enhanced DBS certificate', 1, 'PDF, JPG or PNG', '5 MB', 1, 'UK', 'All pages, issued within the last 12 months.'],
  ['Police clearance certificate', 1, 'PDF, JPG or PNG', '5 MB', 1, 'UAE', 'All pages, issued within the last 12 months.'],
  ['Highest qualification certificate', 1, 'PDF, JPG or PNG', '5 MB', 0, 'All', 'For example GCSE English, a Level 2 diploma or a degree certificate.'],
  ['CV', 1, 'PDF or DOCX', '5 MB', 0, 'All', 'Include your care experience from the last 5 years.'],
  ['Employer reference letter', 0, 'PDF', '5 MB', 0, 'All', 'Optional. Speeds up the review if you are currently employed in care.'],
  ['Medical declaration', 1, 'PDF', '2 MB', 0, 'All', 'Replaced by occupational health form', 'Retired']];
const s4Seed = () => ({ cfg: { deposit: CH_DEP, hold: CH_HOLD_DAYS, hist: [] }, plans: {}, lists: {} });
const S4 = () => (STORE.s4 = STORE.s4 || s4Seed());
const s4Pr = id => s3Pr(id);
const s4PidOfTitle = t => (s3Progs().find(p => p.title === t) || {}).id;
const s4PidOfW = w => (w && w.signup && w.signup.prog) || s4PidOfTitle(w && w.nvq && w.nvq.title) || 'NV-L3';
// A reset restores the programme fees and Browse prices a plan change may have updated
const S4_FEES0 = { ...NVQ_FEES }, S4_CAT0 = CATALOGUE.filter(c => c.kind === 'nvq').map(c => [c, c.price]);
const _isS4 = initStore; initStore = function () { STORE.s4 = null; Object.assign(NVQ_FEES, S4_FEES0); S4_CAT0.forEach(([c, p]) => { c.price = p; }); const r = _isS4.apply(this, arguments); s4Init(); return r; };
const _baS4 = buildAdmin; buildAdmin = function () { const r = _baS4.apply(this, arguments); if (STORE.worlds) s4Init(); return r; };
const s4Refuse = (module, entity, what) => { logA(module, entity, 'Blocked: ' + what, '—', '—', 'Role can\'t ' + what); toast('You can\'t ' + what + '.', 'err'); return false; };

/* ---------- S4-06 / S4-07 payment plans and the deposit configuration ---------- */
const s4Plans = pid => (S4().plans[pid] = S4().plans[pid] || []);
const s4PlanCur = pid => { const l = s4Plans(pid); for (let i = l.length - 1; i >= 0; i--) if (l[i].status === 'Active') return l[i]; return null; };
const s4PlanLast = pid => { const l = s4Plans(pid); return l[l.length - 1] || null; };
const s4EffDep = p => (p.deposit == null ? S4().cfg.deposit : p.deposit);
// A plan is usable only when it reconciles: a fee, 1–24 equal instalments to the penny, and a deposit below the fee
function s4PlanIssue(p) {
  if (!p) return 'This programme has no active payment plan — it needs configuration by Finance or the Super Admin.';
  if (!(p.fee > 0)) return 'No programme fee is set — it needs configuration by Finance or the Super Admin.';
  if (!(Number.isInteger(p.inst) && p.inst >= 1 && p.inst <= 24)) return 'The number of instalments must be 1 to 24.';
  if (Math.round(p.fee * 100) % p.inst) return `${money(p.fee, 'GBP')} doesn't divide into ${p.inst} equal instalments.`;
  const d = s4EffDep(p); if (!(d >= 0) || d >= p.fee) return `The deposit (${money(d, 'GBP')}) must be below the fee (${money(p.fee, 'GBP')}).`;
  return '';
}
// What an applicant is offered: the programme's active plan with the deposit it resolves to (own amount or the default)
function s4TermsOf(pid) { const p = s4PlanCur(pid), issue = s4PlanIssue(p); return p ? { pid, v: p.v, fee: p.fee, deposit: s4EffDep(p), own: p.deposit != null, inst: p.inst, partial: p.partial, issue } : { pid, v: null, fee: null, deposit: null, inst: null, issue }; }
const s4Terms = w => (w && w.signup && w.signup.plan) || s4TermsOf(s4PidOfW(w));
chProgFeeOf = w => s4Terms(w).fee;
chDepOf = w => s4Terms(w).deposit;
chInstNOf = w => s4Terms(w).inst;
chHoldDays = () => S4().cfg.hold;
// The programme as the wizard sign-up code sees it for this applicant: their pinned plan
function s4ProgView(w, pr) { const t = s4Terms(w); return Object.create(pr, { plan: { value: { deposit: t.deposit, inst: t.inst } }, price: { value: t.fee } }); }
const s4PlanTxt = p => p ? `${money(p.fee, 'GBP')} · ${p.deposit == null ? 'default deposit' : 'deposit ' + money(p.deposit, 'GBP')} · ${p.inst} instalments · part payments ${p.partial ? 'yes' : 'no'}` : '—';
function s4PlanSave(pr, f, note, opts = {}) {
  const issue = s4PlanIssue({ ...f, status: 'Active' }); if (issue) return issue;
  const l = s4Plans(pr.id), cur = s4PlanCur(pr.id), last = s4PlanLast(pr.id), v = (last ? last.v : 0) + 1;
  if (cur) cur.status = 'Superseded';
  l.push({ v, fee: f.fee, deposit: f.deposit, inst: f.inst, partial: !!f.partial, status: 'Active', at: now().toISOString(), by: ADMIN.me.name, note: note || '' });
  s4FeeSync(pr, f.fee);
  if (!opts.noLog) logA('Payment Plans', `${pr.title} (${pr.id})`, opts.action || 'Payment plan saved', cur ? `v${cur.v} · ${s4PlanTxt(cur)}` : '—', `v${v} · ${s4PlanTxt(f)}`, note || '');
  return '';
}
// The fee is shown on Browse to new learners. The agency / bundle list price (NVQ_FEES) is a separate commercial setting and isn't
// changed here, so bundles already sold, negotiated prices and discount-based agency prices never move with a plan edit (CH-04, CH-06).
function s4FeeSync(pr, fee) { CATALOGUE.filter(c => c.kind === 'nvq' && c.title === pr.title).forEach(c => { c.price = fee; }); }
function s4SeedProg(pr) {
  const s = S4();
  if (!s.plans[pr.id]) {
    const rawPlan = (Object.getOwnPropertyDescriptor(pr, 'plan') || {}).value, rawPrice = (Object.getOwnPropertyDescriptor(pr, 'price') || {}).value;
    const fee = pr.chNew ? +rawPrice || null : NVQ_FEES[pr.title] || null;
    // Wizard programmes keep their configured plan; a deposit equal to the old fixed £300 was the default, so it follows the default
    const dep = pr.chNew && rawPlan && rawPlan.deposit !== CH_DEP ? rawPlan.deposit : null, inst = pr.chNew && rawPlan ? rawPlan.inst : CH_INST_N;
    s.plans[pr.id] = pr.status === 'Retired' || !fee ? [] : [{ v: 1, fee, deposit: dep, inst, partial: true, status: 'Active', fixture: true, note: 'Configuration in use before plans were versioned' }];
  }
  if (!s.lists[pr.id]) {
    const items = pr.chNew ? ch8Docs(pr.id).map(n => [n, 1, 'PDF, JPG or PNG', '5 MB', 0, 'All', CH8_GUIDE[n] || '']) : S4_STD_DOCS;
    s.lists[pr.id] = { v: 1, fixture: true, items: items.map((r, i) => ({ id: 'ck' + (i + 1), name: r[0], mand: !!r[1], formats: r[2], max: r[3], expiry: !!r[4], applies: r[5], guide: r[6], status: r[7] || 'Active' })) };
  }
}
// pr.plan and pr.price read the store (the wizard screens and sign-up code keep using them)
function s4Accessors(pr) {
  if (pr.__s4) return; Object.defineProperty(pr, '__s4', { value: true });
  Object.defineProperty(pr, 'plan', { configurable: true, enumerable: true, get: () => { const t = s4TermsOf(pr.id), last = s4PlanLast(pr.id); return { deposit: t.deposit != null ? t.deposit : last ? s4EffDep(last) : S4().cfg.deposit, inst: t.inst || (last ? last.inst : CH_INST_N) }; }, set: () => {} });
  if (pr.chNew) Object.defineProperty(pr, 'price', { configurable: true, enumerable: true, get: () => { const p = s4PlanCur(pr.id) || s4PlanLast(pr.id); return p ? p.fee : 0; }, set: v => { const p = s4PlanCur(pr.id) || s4PlanLast(pr.id); if (p && +v === p.fee) return; s4PlanSave(pr, { fee: +v, deposit: p ? p.deposit : null, inst: p ? p.inst : CH_INST_N, partial: p ? p.partial : true }, 'Programme price changed in the set-up details'); } });
}
// The wizard's plan step saves a new version of the same plan (Finance / Super Admin only, as before)
ACT.ch8SavePlan = el => {
  const pr = ch8Pr(el.dataset.id); if (!finOwner()) { logA('NVQ Programmes', pr.title, 'Blocked: payment plan', '—', '—', ADMIN.me.name); toast('The payment plan is set by Finance or the Super Admin.', 'err'); return; }
  const dep = +v8('#pp-d'), n = +v8('#pp-n'), cur = s4PlanCur(pr.id) || s4PlanLast(pr.id), fee = cur ? cur.fee : pr.price, dm = ($('input[name="pp-wdm"]:checked') || {}).value;
  const inherit = dm === 'default' && dep === S4().cfg.deposit; // the default stays inherited unless an own deposit is chosen or a different amount typed
  if (!(dep >= 0) || dep >= fee) return fieldErr('#pp-d', 'Enter a deposit below the price');
  if (!(n >= 1 && n <= 24)) return fieldErr('#pp-n', 'Enter 1 to 24 instalments');
  const f = { fee, deposit: inherit ? null : dep, inst: n, partial: cur ? cur.partial : true }, issue = s4PlanIssue(f); if (issue) return fieldErr('#pp-n', issue);
  const was = `${money(pr.plan.deposit, 'GBP')} · ${pr.plan.inst}`; s4PlanSave(pr, f, 'Saved from the programme set-up', { noLog: true });
  ch8Log(pr, 'Payment plan saved', was, `${money(dep, 'GBP')} · ${n}`); render(); toast('Saved and audited.');
};
// The wizard's review: a plan that doesn't reconcile blocks publishing; the plan step says why
const _ch8CheckS4 = ch8Check;
ch8Check = function (pr) { const r = _ch8CheckS4.apply(this, arguments), t = s4TermsOf(pr.id); if (t.issue) r.block.push('Payment plan: ' + t.issue); return r; };
const _ch8PlanS4 = ch8PlanStep;
ch8PlanStep = function (pr) { let h = _ch8PlanS4.apply(this, arguments); const t = s4TermsOf(pr.id), own = (s4PlanCur(pr.id) || s4PlanLast(pr.id) || {}).deposit != null;
  h = h.replace('<div class="field"><label for="pp-d">Deposit (GBP)</label>', `<fieldset class="stack full s4-wdm" style="border:0;padding:0"><legend class="lbl">Deposit</legend><label class="check"><input type="radio" name="pp-wdm" value="default" ${own ? '' : 'checked'}> Use the default deposit (${money(S4().cfg.deposit, 'GBP')})</label><label class="check"><input type="radio" name="pp-wdm" value="own" ${own ? 'checked' : ''}> Own deposit for this programme</label></fieldset><div class="field"><label for="pp-d">Deposit (GBP)</label>`).replace(/<dt>Deposit<\/dt><dd>([^<]*)<\/dd>/, `<dt>Deposit</dt><dd>$1 ${own ? '(own)' : '(default)'}</dd>`);
  return t.issue ? h.replace('</section>', `<div class="note b-red s4-planerr">${ic('alert')}<div class="small"><strong>Needs configuration.</strong> ${esc(t.issue)}</div></div></section>`) : h; };
const _ch8CreateS4 = ch8Create; ch8Create = function () { const pr = _ch8CreateS4.apply(this, arguments); s4SeedProg(pr); s4Accessors(pr); return pr; };
// Learners who started a sign-up before plans were pinned keep the plan in force today
const s4PinSeeded = () => Object.values(STORE.worlds || {}).forEach(w => { if (w.signup && w.nvq && !w.signup.plan) w.signup.plan = Object.freeze({ ...s4TermsOf(s4PidOfW(w)) }); });
const S4_CFG = 'Deposit minimum and seat-hold days';
// The seat hold is 1–28 days: a conservative prototype choice (no longer than the 28-day deposit eligibility, CH-10) — to confirm with the client if longer holds are wanted
const S4_HOLD_MAX = 28;
function s4CfgRow() { const c = (ADMIN.config || []).find(x => x.name === S4_CFG); if (!c) return; const cf = S4().cfg; c.value = `${money(cf.deposit, 'GBP')} · ${cf.hold} days`; if (cf.hist.length) c.history = cf.hist; }
function s4Init() { if (!STORE.worlds || !s3Progs().length) return; S4(); s3Progs().forEach(pr => { s4SeedProg(pr); s4Accessors(pr); }); s4CfgRow(); s4PinSeeded(); }

// Sign-up: a plan that needs configuration blocks payment (details, documents and the letter are kept)
const s4CfgErr = (w, t) => `<section class="card s4-cfgerr"><h2>4. Payment</h2><div class="note b-red" role="alert">${ic('alert')}<div><strong>Payment isn't available yet — needs configuration.</strong> ${esc(t.issue)} Your details, documents and signed offer letter are kept; you can pay once the plan is set up.</div></div>${chNav(w, '')}</section>`;
const _stepPayS4 = chStepPay;
chStepPay = function (w) { const t = s4Terms(w); return t.issue && !chSponsored(w) ? s4CfgErr(w, t) : _stepPayS4.apply(this, arguments); };
const _suPayS4 = ACT.suPay;
ACT.suPay = el => { const t = s4Terms(W); if (t.issue) { logA('Admissions', `${chFullName(W)} (${W.me.id})`, 'Blocked: payment', '—', '—', t.issue); toast('Payment isn\'t available yet: ' + t.issue, 'err'); render(); return; } return _suPayS4(el); };
const _ccS4 = chComplete;
chComplete = function (w, o) { if (o && o.opt && s4Terms(w).issue) { toast('Payment isn\'t available yet: ' + s4Terms(w).issue, 'err'); return; } return _ccS4.apply(this, arguments); };

/* ---------- S4-05 one document checklist per programme ---------- */
const s4List = pid => S4().lists[pid] || (s4Pr(pid) && (s4SeedProg(s4Pr(pid)), S4().lists[pid])) || { v: 1, items: [] };
const S4_APPLIES = ['All', 'UK', 'UAE'];
// The items an applicant gets: All, plus their region's items. regionOf (CH-03): UAE → UAE; every other country → UK
const s4ItemsFor = (pid, country) => { const reg = regionOf(country); return s4List(pid).items.filter(i => i.status === 'Active' && (i.applies === 'All' || i.applies === reg)); };
const s4DocsFor = (pid, country) => s4ItemsFor(pid, country).map((it, i) => ({ id: 'n' + (i + 1), name: it.name, mand: it.mand, status: 'Pending', formats: it.formats, max: it.max, guide: it.guide, versions: [], ...(it.expiry ? { expiryReq: true } : {}), ck: it.id }));
const s4Other = country => !['United Kingdom', 'United Arab Emirates'].includes(country);
// Wizard programmes after publishing: Super Admin only (as the wizard's checklist step); otherwise SA, Academic Admin, System Admin
const s4CanCk = pr => !!pr && (pr.chNew && pr.status !== 'Draft' ? isSA() : (isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys())));
const s4CkEnt = pr => `${pr.title} — document checklist`;
function s4CkChanged(pr, action, before, after, r) {
  const L = s4List(pr.id); L.v++; L.fixture = false;
  logA('Admissions & Documents', s4CkEnt(pr), action, before, after, r);
  if (pr.chNew) STORE.chProgDocs[pr.id] = L.items.filter(i => i.status === 'Active').map(i => i.name);
}
function s4ChecklistCard(pr, opts = {}) {
  const L = s4List(pr.id), can = s4CanCk(pr), a = (act, i, extra = '') => `data-act="${act}" data-p="${pr.id}" data-i="${i}"${extra}`;
  return `<section class="card s4-ck"><div class="row-b"><h2>${opts.title || 'Document checklist — ' + esc(pr.title)}</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="s4CkAdd" data-p="${pr.id}">${ic('plus', 14)}Add item</button>` : `<span class="xs muted">${ic('lock', 12)} Read-only for you</span>`}</div>
    <p class="small muted">Version ${L.v}${L.fixture ? ' (the list in use before checklists were versioned)' : ''}. Changes apply to new applicants only — an application keeps the list copied when it started. "Applies to": All, UK or UAE applicants; applicants from any other country get the UK items (region rule, CH-03).</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Order</th><th>Item</th><th>Mandatory</th><th>Formats</th><th>Max size</th><th>Has expiry</th><th>Applies to</th><th>Guidance</th><th>Status</th><th></th></tr></thead><tbody>${L.items.map((r, k) => `<tr class="${r.status === 'Retired' ? 'muted' : ''}"><td class="nowrap">${can ? `<button class="icon-btn" ${a('s4CkMove', k, ' data-d="-1"')} aria-label="Move ${esc(r.name)} up" ${k === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" ${a('s4CkMove', k, ' data-d="1"')} aria-label="Move ${esc(r.name)} down" ${k === L.items.length - 1 ? 'disabled' : ''}>↓</button>` : k + 1}</td><td>${esc(r.name)}</td><td>${r.mand ? 'Mandatory' : 'Optional'}</td><td class="small">${esc(r.formats)}</td><td>${esc(r.max)}</td><td>${r.expiry ? 'Yes' : 'No'}</td><td>${chip(r.applies, r.applies === 'All' ? 'grey' : 'blue')}</td><td class="small">${esc(r.guide)}</td><td>${chip(r.status, r.status === 'Active' ? 'green' : 'grey')}</td><td class="nowrap">${can ? (r.status === 'Active' ? `<button class="btn btn-sm" ${a('s4CkEdit', k)}>Edit</button> <button class="btn btn-sm" ${a('s4CkRetire', k)}>Retire</button>` : `<button class="btn btn-sm" ${a('s4CkRestore', k)}>Restore</button>`) : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}
const s4CkFields = r => `<div class="form-grid"><div class="field full"><label for="ck-n">Document name</label><input class="input" id="ck-n" value="${esc(r ? r.name : '')}"></div>
  <div class="field"><label for="ck-m">Mandatory or optional</label><select class="select" id="ck-m"><option value="1" ${!r || r.mand ? 'selected' : ''}>Mandatory</option><option value="0" ${r && !r.mand ? 'selected' : ''}>Optional</option></select></div>
  <div class="field"><label for="ck-a">Applies to</label><select class="select" id="ck-a">${S4_APPLIES.map(x => `<option ${(r ? r.applies : 'All') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label for="ck-f">Accepted formats</label><input class="input" id="ck-f" value="${esc(r ? r.formats : 'PDF, JPG or PNG')}"><span class="hint">Any of PDF, JPG, PNG and DOCX.</span></div>
  <div class="field"><label for="ck-s">Maximum size (MB)</label><input class="input num" type="number" min="1" max="25" id="ck-s" value="${r ? parseFloat(r.max) : 5}"></div>
  <label class="check full"><input type="checkbox" id="ck-e" ${r && r.expiry ? 'checked' : ''}> Has an expiry date (the applicant is told they'll need to replace it before it expires)</label>
  <div class="field full"><label for="ck-g">Guidance for applicants</label><input class="input" id="ck-g" value="${esc(r ? r.guide : '')}"></div></div>`;
function s4CkRead(pid, self) {
  const n = $('#ck-n').value.trim(), f = $('#ck-f').value.trim(), mb = +$('#ck-s').value, ap = $('#ck-a').value;
  if (!n) return fieldErr('#ck-n', 'Enter a document name'), null;
  if (s4List(pid).items.some(i => i !== self && i.status === 'Active' && i.name.toLowerCase() === n.toLowerCase() && (i.applies === ap || i.applies === 'All' || ap === 'All'))) return fieldErr('#ck-n', 'This document is already on the list for these applicants'), null;
  const toks = f.toLowerCase().match(/[a-z]+/g) || [], bad = toks.filter(t => !['pdf', 'jpg', 'png', 'docx', 'or', 'and'].includes(t));
  if (!toks.some(t => ['pdf', 'jpg', 'png', 'docx'].includes(t)) || bad.length) return fieldErr('#ck-f', 'Use PDF, JPG, PNG or DOCX'), null;
  if (!(mb >= 1 && mb <= 25)) return fieldErr('#ck-s', 'Enter 1 to 25 MB'), null;
  return { name: n, mand: $('#ck-m').value === '1', formats: f, max: mb + ' MB', expiry: $('#ck-e').checked, applies: ap, guide: $('#ck-g').value.trim() };
}
const s4CkTxt = r => `${r.name} · ${r.mand ? 'mandatory' : 'optional'} · ${r.formats} · ${r.max} · expiry ${r.expiry ? 'yes' : 'no'} · ${r.applies}`;
const s4CkGuard = pr => s4CanCk(pr) || s4Refuse('Admissions & Documents', pr ? s4CkEnt(pr) : 'Document checklist', 'change the document checklist');
ACT.s4CkAdd = el => { const pr = s4Pr(el.dataset.p); if (!s4CkGuard(pr)) return; reasonDlg({ title: 'Add checklist item — ' + esc(pr.title), ok: 'Add item', label: 'Reason (required)', extra: s4CkFields(null), onOk: r => { const f = s4CkRead(pr.id, null); if (!f) return false; const L = s4List(pr.id); L.items.push({ id: 'ck' + (L.items.length + 1), ...f, status: 'Active' }); s4CkChanged(pr, 'Checklist item added', '—', s4CkTxt(f), r); render(); toast(`Added — checklist version ${L.v}, for new applicants.`); } }); };
ACT.s4CkEdit = el => { const pr = s4Pr(el.dataset.p); if (!s4CkGuard(pr)) return; const it = s4List(pr.id).items[+el.dataset.i]; reasonDlg({ title: 'Edit checklist item', ok: 'Save', label: 'Reason (required)', extra: s4CkFields(it), onOk: r => { const f = s4CkRead(pr.id, it); if (!f) return false; const was = s4CkTxt(it); if (was === s4CkTxt(f) && f.guide === it.guide) { fieldErr('#ck-n', 'Nothing has changed'); return false; } Object.assign(it, f); s4CkChanged(pr, 'Checklist item changed', was, s4CkTxt(it), r); render(); toast('Saved — new applicants get the change.'); } }); };
ACT.s4CkRetire = el => { const pr = s4Pr(el.dataset.p); if (!s4CkGuard(pr)) return; const it = s4List(pr.id).items[+el.dataset.i]; if (pr.chNew && s4List(pr.id).items.filter(i => i.status === 'Active').length === 1) { toast('A checklist needs at least one document.', 'err'); return; } reasonDlg({ title: 'Retire ' + esc(it.name), ok: 'Retire', danger: true, body: '<p class="small">New applicants won\'t be asked for it. Applications already started, and decisions already made, are kept.</p>', onOk: r => { it.status = 'Retired'; s4CkChanged(pr, 'Checklist item retired', it.name, 'Retired', r); render(); } }); };
ACT.s4CkRestore = el => { const pr = s4Pr(el.dataset.p); if (!s4CkGuard(pr)) return; const it = s4List(pr.id).items[+el.dataset.i]; reasonDlg({ title: 'Restore ' + esc(it.name), ok: 'Restore', onOk: r => { it.status = 'Active'; s4CkChanged(pr, 'Checklist item restored', 'Retired', it.name, r); render(); } }); };
ACT.s4CkMove = el => { const pr = s4Pr(el.dataset.p); if (!s4CkGuard(pr)) return; const L = s4List(pr.id), k = +el.dataset.i, j = k + +el.dataset.d; if (!L.items[j]) return; [L.items[k], L.items[j]] = [L.items[j], L.items[k]]; s4CkChanged(pr, 'Checklist order changed', '—', L.items.map(i => i.name).join(' → '), ''); render(); };
// Admissions → Checklist builder: the programme list is the real one
const s4ClProgs = () => s3Progs().filter(p => p.status !== 'Retired');
checklistBuilder = function () {
  const ps = s4ClProgs(), pid = ps.some(p => p.id === ui('clProg', '')) ? ui('clProg', '') : 'NV-L3', pr = s4Pr(pid) || ps[0];
  return `<section class="card"><div class="row-b"><h2>Admission checklists</h2><div class="field" style="max-width:420px"><label for="clp">Programme</label><select class="select" id="clp" data-onchange="s4ClProg">${ps.map(p => `<option value="${p.id}" ${p.id === pr.id ? 'selected' : ''}>${esc(p.title)}${p.status !== 'Active' ? ' (' + p.status + ')' : ''}</option>`).join('')}</select></div></div><p class="small muted">Each programme has its own checklist. Applicants get it at step 2 of their sign-up.</p></section>${s4ChecklistCard(pr)}`;
};
INP.s4ClProg = el => { setUi('clProg', el.value); render(); };
// The wizard's checklist step: its quick picks and the same full checklist
const _ch8DocsS4 = ch8DocsStep;
ch8DocsStep = function (pr) { return _ch8DocsS4.apply(this, arguments) + s4ChecklistCard(pr, { title: 'Checklist details' }); };
ACT.ch8SaveDocs = el => {
  const pr = ch8Pr(el.dataset.id); if (!s4CkGuard(pr)) return; const sel = $$('.ch8-doc:checked').map(x => x.value); if (!sel.length) { toast('Choose at least one required document.', 'err'); return; }
  const L = s4List(pr.id), was = L.items.filter(i => i.status === 'Active').map(i => i.name).join(', ');
  CH8_DOCS.forEach(([n]) => { const it = L.items.find(i => i.name === n); if (sel.includes(n)) { if (!it) L.items.push({ id: 'ck' + (L.items.length + 1), name: n, mand: true, formats: 'PDF, JPG or PNG', max: '5 MB', expiry: false, applies: 'All', guide: CH8_GUIDE[n] || '', status: 'Active' }); else it.status = 'Active'; } else if (it) it.status = 'Retired'; });
  const L2 = s4List(pr.id); L2.v++; L2.fixture = false; STORE.chProgDocs[pr.id] = L2.items.filter(i => i.status === 'Active').map(i => i.name);
  ch8Log(pr, 'Document checklist saved', was, STORE.chProgDocs[pr.id].join(', ')); render(); toast('Saved and audited.');
};
// Applicants: the region the list was chosen for, and expiry
const _docsS4 = chStepDocs;
chStepDocs = function (w) {
  const h = _docsS4.apply(this, arguments), s = w.signup; if (!s || !s.docsRegion) return h;
  const note = `<p class="small s4-docnote">${ic('info', 14)} Documents for applicants in ${esc(s.docsCountry)}${s4Other(s.docsCountry) ? ` — there's no separate list for your country, so the UK list applies for now (pending confirmation by the Academy). The Academy may ask for an equivalent document.` : ''}.</p>`;
  return h.replace('<p class="small">Upload every mandatory document.', note + '<p class="small">Upload every mandatory document.');
};
const _docCardS4 = docCard;
docCard = function (d) { const h = _docCardS4.apply(this, arguments); return d && d.expiryReq && !d.expires ? h.replace(/(<\/article>|<\/div>)\s*$/, `<p class="xs muted s4-exp">${ic('clock', 12)} This document has an expiry date — you'll be asked to replace it before it expires.</p>$1`) : h; };

/* ---------- Level 2–5 sign-up by a learner without an NVQ: the same real path as the wizard programmes ---------- */
const _applyS4 = ACT.applyNvq;
ACT.applyNvq = el => {
  const c = CATALOGUE.find(x => x.id === el.dataset.id), pr = c && c.kind === 'nvq' && s3Progs().find(p => p.title === c.title && !p.chNew);
  if (!pr || W.admission) return _applyS4(el); // the wizard programmes, and anyone with a sign-up already (e.g. the demo applicant)
  if (W.nvq) { toast('You already have an NVQ programme. Continue it from your dashboard.', 'info'); return; }
  if (pr.status !== 'Active') { toast('This programme isn\'t taking sign-ups.', 'err'); return; }
  const t = s4TermsOf(pr.id);
  confirmDlg({ title: 'Sign up for ' + esc(pr.title) + '?', ok: 'Start sign-up', body: `<p>Signing up takes five steps: your details (we assign your batch), your documents, your offer letter, your payment, then you start.</p><p class="small muted">${t.issue ? 'Payment isn\'t available yet: this programme\'s payment plan needs configuration. You can still add your details and documents and sign your offer letter.' : `Price ${money(t.fee, 'GBP')} — deposit ${money(t.deposit, 'GBP')} (when your batch starts in ${CH_HOLD_DAYS} days or more) or ${t.inst} monthly instalments, the first one now.`}</p>`, onOk: () => { ch8StartSignup(W, pr); go('admission'); toast('Sign-up started.'); } });
};
// At sign-up start the applicant's checklist (their region's items), plan and offer letter version are fixed
const _suStartS4 = ch8StartSignup;
ch8StartSignup = function (w, pr) {
  const r = _suStartS4.apply(this, arguments); if (!pr || !w.signup) return r;
  const t = Object.freeze({ ...s4TermsOf(pr.id) }), L = s4List(pr.id), reg = regionOf(w.me.country);
  Object.assign(w.signup, { plan: t, checklistV: L.v, docsRegion: reg, docsCountry: w.me.country });
  Object.assign(w.admission.deposit, t.issue ? { min: null, balance: null } : { min: t.deposit, balance: t.fee - t.deposit });
  w.docs = s4DocsFor(pr.id, w.me.country);
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Sign-up terms fixed', '—', `Checklist v${L.v} (${reg} items${s4Other(w.me.country) ? ', country ' + w.me.country : ''}) · payment plan ${t.issue ? 'needs configuration' : 'v' + t.v} · offer letter v${w.signup.letterV}`, pr.title);
  return r;
};
// Admissions → Applications: real-path applicants appear for review like everyone else
const _appsS4 = allApplications;
allApplications = function () {
  const out = _appsS4.apply(this, arguments);
  Object.keys(STORE.worlds || {}).filter(v => !['B', 'C', 'D'].includes(v)).forEach(v => { const w = STORE.worlds[v], ad = w.admission; if (!w.signup || !w.signup.prog || !ad || out.some(a => a.id === 'APP-' + v)) return; out.push({ id: 'APP-' + v, v, name: VNAME(v), programme: w.nvq.title, ref: w.me.referral || 'Self-registration', applied: ad.history[0][1], status: ad.status, reviewer: String(ad.reviewer || '— Unassigned').replace(' (Admissions)', ''), days: -daysTo(ad.history[0][1]), docsOk: w.docs.filter(d => d.mand && d.status === 'Approved').length, docsAll: w.docs.filter(d => d.mand).length, docs: w.docs, escalated: false }); });
  return out;
};
const _appDetailS4 = appDetail;
appDetail = function (id) {
  const h = _appDetailS4.apply(this, arguments), w = STORE.worlds[String(id).replace('APP-', '')], s = w && w.signup; if (!s || !s.docsRegion) return h;
  const note = `<div class="note b-blue s4-appck">${ic('info')}<div class="small">Checklist version ${s.checklistV} — ${s.docsRegion} items for ${esc(s.docsCountry)}${s4Other(s.docsCountry) ? ` <strong>(no separate list for ${esc(s.docsCountry)}: the UK items were applied by the region rule, CH-03 — provisional, pending client confirmation)</strong>` : ''} · payment plan ${s.plan && !s.plan.issue ? 'version ' + s.plan.v : 'needs configuration'} · offer letter version ${s.letterV}.</div></div>`;
  const k = h.indexOf('<section'); return k < 0 ? h + note : h.slice(0, k) + note + h.slice(k);
};

/* ---------- S4-06 / S4-07 / S4-08 screens ---------- */
const s4PlanProgs = () => s3Progs().filter(p => p.status !== 'Retired');
const s4FinGuard = what => finOwner() || s4Refuse('Payment Plans', 'Payment plans', what);
function s4CfgCard() {
  const cf = S4().cfg;
  return `<section class="card s4-cfg"><div class="row-b"><h2>Deposit default and seat hold</h2>${finOwner() ? `<button class="btn btn-sm" data-act="s4CfgEdit">Edit</button>` : `<span class="xs muted">${ic('lock', 12)} Finance Admin / Super Admin only</span>`}</div><dl class="kv"><dt>Default deposit</dt><dd><strong>${money(cf.deposit, 'GBP')}</strong> — for programmes without their own deposit</dd><dt>Seat hold</dt><dd><strong>${cf.hold} days</strong> — how long a paid deposit holds the seat; the balance is due within ${cf.hold} days (1–${S4_HOLD_MAX} days; the ${S4_HOLD_MAX}-day maximum is a prototype choice to confirm with the client). A deposit is offered only when the batch starts in ${CH_HOLD_DAYS} days or more (CH-10, fixed)</dd></dl><p class="xs muted">Changes apply to new sign-ups. Deposits already paid and holds already running don't change.</p></section>`;
}
function s4PlansCard() {
  const fo = finOwner();
  return `<section class="card s4-plans"><h2>Programme payment plans (used at sign-up)</h2><p class="small muted">One active plan per programme. The first instalment is due at sign-up (CH-10). A new version applies to new sign-ups; enrolled learners keep their plan.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Programme</th><th class="r">Fee</th><th>Deposit</th><th>Instalments</th><th>Part payments</th><th>First instalment</th><th>Version</th><th>Status</th><th></th></tr></thead><tbody>${s4PlanProgs().map(pr => { const p = s4PlanCur(pr.id), last = s4PlanLast(pr.id), issue = s4PlanIssue(p), x = p || last;
      return `<tr data-pid="${pr.id}"><td><strong>${esc(pr.title)}</strong><div class="xs muted">${pr.id} · ${pr.status}</div></td><td class="r">${x && x.fee ? money(x.fee, 'GBP') : '—'}</td><td>${x ? (x.deposit == null ? `${money(S4().cfg.deposit, 'GBP')} <span class="xs muted">(default)</span>` : `${money(x.deposit, 'GBP')} <span class="xs muted">(own)</span>`) : '—'}</td><td>${x && x.fee ? `${x.inst} × ${money(x.fee / x.inst, 'GBP')}` : '—'}</td><td>${x ? (x.partial ? 'Yes' : 'No') : '—'}</td><td class="small">At sign-up</td><td>${x ? 'v' + x.v : '—'}</td><td>${p && !issue ? chip('Active', 'green') : last && last.status === 'Retired' ? chip('Retired', 'grey') : chip('Needs configuration', 'red')}${issue && p ? `<div class="xs" style="color:var(--red)">${esc(issue)}</div>` : ''}</td>
        <td class="nowrap">${fo ? `<button class="btn btn-sm" data-act="s4PlanEdit" data-p="${pr.id}">${p ? 'Edit plan' : 'Set up plan'}</button>${p ? ` <button class="btn btn-sm" data-act="s4PlanRetire" data-p="${pr.id}">Retire</button>` : ''}` : ''} ${last ? `<button class="btn btn-sm btn-ghost" data-act="s4PlanHist" data-p="${pr.id}">History</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>${fo ? '' : `<p class="xs muted">${ic('lock', 12)} Payment plans are owned by Finance Admins and the Super Administrator — read-only for you.</p>`}</section>`;
}
function s4LegacyCard() {
  const fo = finOwner();
  return `<section class="card s4-legacy"><h2>Legacy plan templates — unassigned</h2><p class="small muted">Demo / reference templates from before programme plans. They are never used at sign-up and never change a programme's plan. Finance can use one as a starting point for a programme plan, then check and save it.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Template</th><th>Type</th><th>Per instalment × number</th><th>Deposit minimum</th><th>Part payments</th><th>Status</th><th></th></tr></thead><tbody>${STORE.fin.templates.map(r => `<tr><td>${esc(r.course)}</td><td>${r.type}</td><td>${r.type === 'One-time' ? 'Course price (one-time)' : `${money(r.gbp, 'GBP')} × ${r.n}`}</td><td>${r.depG ? money(r.depG, 'GBP') : '—'}</td><td>${r.partial}</td><td>${chip(r.status === 'Retired' ? 'Retired' : 'Unassigned', 'grey')}</td><td>${fo && r.type !== 'One-time' && r.status !== 'Retired' ? `<button class="btn btn-sm" data-act="s4PlanEdit" data-t="${r.id}">Use as a starting point…</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}
// Plan editor (Finance and Super Admin): every field is saved as a new version
ACT.s4PlanEdit = el => {
  if (!s4FinGuard('change payment plans')) return;
  const tpl = el.dataset.t ? STORE.fin.templates.find(x => x.id === el.dataset.t) : null, fixed = el.dataset.p ? s4Pr(el.dataset.p) : null, ps = s4PlanProgs();
  const pick = fixed || ps.find(p => p.id === 'NV-L3'), cur = s4PlanCur(pick.id) || s4PlanLast(pick.id);
  const fee = cur ? cur.fee : NVQ_FEES[pick.title] || '', own = tpl ? (tpl.depG ? tpl.depG : null) : cur ? cur.deposit : null, n = tpl ? tpl.n : cur ? cur.inst : CH_INST_N, part = tpl ? tpl.partial === 'Yes' : cur ? cur.partial : true;
  reasonDlg({ title: fixed ? 'Payment plan — ' + esc(fixed.title) : 'Payment plan from a template', ok: 'Save new version', label: 'Reason (required)', extra: `${tpl ? `<div class="note b-amber">${ic('info')}<div class="small">Starting point: legacy template "${esc(tpl.course)}" (${money(tpl.gbp, 'GBP')} × ${tpl.n}${tpl.depG ? ', deposit ' + money(tpl.depG, 'GBP') : ''}). Its instalment count, deposit and part-payment setting are filled in; the fee stays the programme's. Nothing is saved until you choose "Save new version".</div></div>` : ''}
    <div class="form-grid">${fixed ? '' : `<div class="field full"><label for="pp-p">Programme</label><select class="select" id="pp-p" data-onchange="s4PpProg">${ps.map(p => `<option value="${p.id}" ${p.id === pick.id ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div>`}
    <div class="field"><label for="pp-f">Programme fee (GBP)</label><input class="input num" type="number" min="1" step="0.01" id="pp-f" value="${fee}" ${fee && !isSA() ? 'readonly' : ''}>${fee && !isSA() ? '<span class="hint">The programme\'s price — only the Super Administrator changes it.</span>' : ''}</div>
    <div class="field"><label for="pp-n">Monthly instalments</label><input class="input num" type="number" min="1" max="24" id="pp-n" value="${n}"></div>
    <fieldset class="stack full" style="border:0;padding:0"><legend class="lbl">Deposit</legend><label class="check"><input type="radio" name="pp-dm" value="default" ${own == null ? 'checked' : ''}> Use the default deposit (${money(S4().cfg.deposit, 'GBP')})</label><label class="check"><input type="radio" name="pp-dm" value="own" ${own != null ? 'checked' : ''}> Own deposit for this programme</label><div class="field"><label for="pp-dv">Own deposit (GBP)</label><input class="input num" type="number" min="0" step="0.01" id="pp-dv" value="${own != null ? own : ''}"></div></fieldset>
    <label class="check full"><input type="checkbox" id="pp-pa" ${part ? 'checked' : ''}> Part payments allowed (the balance can be paid in parts)</label>
    <p class="small full">First instalment: <strong>due at sign-up</strong> (CH-10 — can't be postponed here; Finance can adjust an enrolled learner's schedule).</p></div>`,
    onOk: r => {
      const pr = fixed || s4Pr($('#pp-p').value), dm = ($('input[name="pp-dm"]:checked') || {}).value, f = { fee: +$('#pp-f').value, inst: +$('#pp-n').value, deposit: dm === 'own' ? +$('#pp-dv').value : null, partial: $('#pp-pa').checked };
      if (dm === 'own' && $('#pp-dv').value === '') { fieldErr('#pp-dv', 'Enter the deposit'); return false; }
      const fee0 = (s4PlanCur(pr.id) || s4PlanLast(pr.id) || {}).fee || NVQ_FEES[pr.title]; if (fee0 && f.fee !== fee0 && !isSA()) { logA('Payment Plans', `${pr.title} (${pr.id})`, 'Blocked: change the programme fee', money(fee0, 'GBP'), money(f.fee, 'GBP'), 'Only the Super Administrator changes a programme\'s price'); fieldErr('#pp-f', 'Only the Super Administrator changes the programme\'s price'); return false; }
      const issue = s4PlanIssue(f); if (issue) { fieldErr(/fee is set|divide/.test(issue) ? '#pp-f' : /instalments/.test(issue) ? '#pp-n' : '#pp-dv', issue); return false; }
      const p0 = s4PlanCur(pr.id); if (p0 && p0.fee === f.fee && p0.inst === f.inst && p0.deposit === f.deposit && p0.partial === f.partial) { fieldErr('#pp-f', 'Nothing has changed'); return false; }
      s4PlanSave(pr, f, (tpl ? `From legacy template "${tpl.course}": ` : '') + r); render(); toast(`${pr.title}: plan version ${s4PlanLast(pr.id).v} saved — new sign-ups use it.`);
    } });
};
INP.s4PpProg = el => { const pr = s4Pr(el.value), p = pr && (s4PlanCur(pr.id) || s4PlanLast(pr.id)); $('#pp-f').value = p ? p.fee : NVQ_FEES[pr.title] || ''; };
ACT.s4PlanRetire = el => { if (!s4FinGuard('change payment plans')) return; const pr = s4Pr(el.dataset.p), p = s4PlanCur(pr.id); if (!p) return; reasonDlg({ title: 'Retire the payment plan — ' + esc(pr.title), ok: 'Retire plan', danger: true, body: `<p class="small">New applicants to ${esc(pr.title)} can't pay until a plan is set up again (their payment step shows "needs configuration"). Learners already enrolled, and sign-ups already started, keep their plan.</p>`, onOk: r => { p.status = 'Retired'; logA('Payment Plans', `${pr.title} (${pr.id})`, 'Payment plan retired', `v${p.v} · ${s4PlanTxt(p)}`, 'Retired', r); render(); } }); };
ACT.s4PlanHist = el => { const pr = s4Pr(el.dataset.p); openModal({ title: 'Payment plan history — ' + esc(pr.title), size: 'lg', body: `<ul class="list">${s4Plans(pr.id).slice().reverse().map(p => `<li class="li"><div class="li-b"><strong>Version ${p.v}</strong><span class="small">${esc(s4PlanTxt(p))}</span><span class="xs muted">${p.fixture ? 'Configuration in use before plans were versioned (no recorded date or author)' : `${fdt(p.at)} · ${esc(p.by)} · ${esc(p.note)}`}</span></div>${chip(p.status, p.status === 'Active' ? 'green' : 'grey')}</li>`).join('')}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
// Global deposit default and seat-hold days (System Configuration row, Finance → Payment Plans, Super Admin → Finance)
ACT.s4CfgEdit = () => {
  if (!finOwner()) return s4Refuse('System Configuration', S4_CFG, 'change the deposit configuration');
  const cf = S4().cfg;
  reasonDlg({ title: 'Edit the deposit default and seat hold', ok: 'Save', label: 'Reason (required)', extra: `<div class="form-grid"><div class="field"><label for="cf-d">Default deposit (GBP)</label><input class="input num" type="number" min="1" step="0.01" id="cf-d" value="${cf.deposit}"></div><div class="field"><label for="cf-h">Seat hold (days)</label><input class="input num" type="number" min="1" max="${S4_HOLD_MAX}" id="cf-h" value="${cf.hold}"><span class="hint">1 to ${S4_HOLD_MAX} days (prototype limit — to confirm with the client).</span></div></div><p class="small muted">Applies to new sign-ups. Programmes with their own deposit keep it. Deposits already paid and holds already running don't change.</p>`,
    onOk: r => {
      const d = +$('#cf-d').value, h = +$('#cf-h').value;
      if (!(d > 0)) { fieldErr('#cf-d', 'Enter a deposit above £0'); return false; }
      if (!(Number.isInteger(h) && h >= 1 && h <= S4_HOLD_MAX)) { logA('System Configuration', S4_CFG, 'Rejected: seat hold out of range', `${cf.hold} days`, `${$('#cf-h').value} days`, `Allowed: 1–${S4_HOLD_MAX} days`); fieldErr('#cf-h', `Enter 1 to ${S4_HOLD_MAX} days`); return false; }
      const clash = s4PlanProgs().filter(pr => { const p = s4PlanCur(pr.id); return p && p.deposit == null && d >= p.fee; });
      if (clash.length) { fieldErr('#cf-d', 'Must be below the fee of every programme using the default: ' + clash.map(p => p.title).join(', ')); return false; }
      if (d === cf.deposit && h === cf.hold) { fieldErr('#cf-d', 'Nothing has changed'); return false; }
      const was = `${money(cf.deposit, 'GBP')} · ${cf.hold} days`, now_ = `${money(d, 'GBP')} · ${h} days`;
      cf.deposit = d; cf.hold = h; cf.hist.unshift([ADMIN.me.name, now().toISOString(), was, now_]);
      logA('System Configuration', S4_CFG, 'Updated', was, now_, r); s4CfgRow(); render(); toast('Saved and audited. New sign-ups use it; existing deposits and holds don\'t change.');
    } });
};
const _cfgEditS4 = ACT.cfgEdit;
ACT.cfgEdit = el => { const c = (ADMIN.config || []).find(x => x.id === el.dataset.id); return c && c.name === S4_CFG ? ACT.s4CfgEdit(el) : _cfgEditS4(el); };
// Finance → Payment Plans → "Plan templates": programme plans, the deposit default, then the legacy templates
const _fPlansS4 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => {
  const h = _fPlansS4(p); if ((p.tab || 'schedules') !== 'templates') return h;
  const m = h.indexOf('Payment plans and the deposit minimum are owned'), a = m < 0 ? -1 : h.lastIndexOf('<div class="note b-blue">', m), z = h.indexOf('<section class="card ch8-plans">'); if (a < 0) return h;
  return h.slice(0, a) + `<div class="note b-blue">${ic('info')}<div class="small">Payment plans and the deposit default are owned by Finance Admins and the Super Administrator.</div></div>${s4CfgCard()}${s4PlansCard()}${s4LegacyCard()}` + (z > a ? h.slice(z) : '');
};
// Legacy "Create / Edit template" now opens the programme plan editor (never edits a template in place)
ACT.tplEditF = el => ACT.s4PlanEdit({ dataset: el && el.dataset && el.dataset.id ? { t: el.dataset.id } : {} });
// Finance's own schedule tools: only Finance Admins and the Super Admin
const _finAdjustS4 = ACT.finAdjust, _finWaiveS4 = ACT.finWaive;
ACT.finAdjust = el => (s4FinGuard('adjust a learner\'s payment schedule') ? _finAdjustS4(el) : undefined);
ACT.finWaive = el => (s4FinGuard('apply a waiver or discount') ? _finWaiveS4(el) : undefined);
// Super Admin → Finance → "Instalment plans": the same plans, the deposit default, and per-learner operations
const s4AdjWorlds = () => Object.keys(STORE.worlds || {}).filter(v => (STORE.worlds[v].plans || []).some(p => (p.rows || []).length));
function s4AdjCard() {
  const fo = finOwner(), vs = s4AdjWorlds(), v = vs.includes(ui('s4AdjL', '')) ? ui('s4AdjL', '') : vs[0], w = STORE.worlds[v], pls = (w.plans || []).filter(p => (p.rows || []).length), e = pls.some(p => p.e === ui('s4AdjE', '')) ? ui('s4AdjE', '') : (pls[0] || {}).e, pl = pls.find(p => p.e === e);
  return `<section class="card s4-adj"><h2>Per-learner adjustments</h2><div class="form-grid"><div class="field"><label for="s4-l">Learner</label><select class="select" id="s4-l" data-onchange="s4AdjL">${vs.map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${esc(VNAME(x))}</option>`).join('')}</select></div><div class="field"><label for="s4-e">Plan</label><select class="select" id="s4-e" data-onchange="s4AdjE">${pls.map(p => `<option value="${p.e}" ${p.e === e ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div></div>
    ${pl ? `<p class="small">${esc(pl.plan)} · ${pl.rows.filter(r => r.status !== 'Paid').length} open instalment(s) · total ${money(pl.total || pl.rows.reduce((a, r) => a + r.amount, 0), 'GBP')}</p>` : ''}
    ${fo ? `<div class="row"><button class="btn btn-sm" data-act="s4Adj" data-k="adjust">Adjust schedule</button><button class="btn btn-sm" data-act="s4Adj" data-k="waive">Waive</button><button class="btn btn-sm" data-act="s4Adj" data-k="discount">Discount</button></div><p class="xs muted">These use Finance's own tools on the learner's real plan. "Discount" is Finance's "Apply waiver / discount" operation (an amount or a percentage off one instalment) — the same rule and controls.</p>` : `<p class="xs muted">${ic('lock', 12)} Finance Admin / Super Admin only.</p>`}
    <h3>Recent adjustments</h3><ul class="list small">${STORE.fin.adjust.slice(0, 6).map(x => `<li class="li"><div class="li-b">${esc(x[2])} · ${esc(x[3])}: ${esc(x[4])} → ${esc(x[5])}</div><span class="xs muted">${esc(x[0])} · ${fd(x[1])} · reason: ${esc(x[6])}</span></li>`).join('')}</ul></section>`;
}
INP.s4AdjL = el => { setUi('s4AdjL', el.value); setUi('s4AdjE', ''); render(); };
INP.s4AdjE = el => { setUi('s4AdjE', el.value); render(); };
ACT.s4Adj = el => {
  if (!s4FinGuard('change a learner\'s payment plan')) return;
  const vs = s4AdjWorlds(), v = vs.includes(ui('s4AdjL', '')) ? ui('s4AdjL', '') : vs[0], pls = (STORE.worlds[v].plans || []).filter(p => (p.rows || []).length), e = pls.some(p => p.e === ui('s4AdjE', '')) ? ui('s4AdjE', '') : (pls[0] || {}).e;
  return (el.dataset.k === 'adjust' ? ACT.finAdjust : ACT.finWaive)({ dataset: { v, e } });
};
// The old stub buttons ("Adjust schedule", "Waive amount", "Apply discount") now run the real operations
ACT.finAdj = el => ACT.s4Adj({ dataset: { k: /Adjust/.test((el.dataset || {}).a || '') ? 'adjust' : 'waive' } });
const _aFinS4 = SCREENS['a-finance'];
SCREENS['a-finance'] = p => {
  const h = _aFinS4(p); if ((p.tab || 'ledger') !== 'plans') return h;
  const k = h.indexOf('<div class="grid-2">'); return k < 0 ? h : h.slice(0, k) + s4CfgCard() + s4PlansCard() + s4AdjCard();
};

/* ---------- S4-09 offer letters: each version keeps its own text; restore; a snapshot of what was signed ---------- */
const s4CanLetter = () => isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys());
const s4LetterGuard = pr => s4CanLetter() || s4Refuse('NVQ Programmes', pr ? pr.title : 'Offer letter', 'change the offer letter');
const s4ParaIn = l => (l || CH_LETTER_TEXT).join('\n\n');
const s4ParaOut = s => String(s || '').split(/\n\s*\n/).map(x => x.trim().replace(/\s*\n\s*/g, ' ')).filter(Boolean);
chLetterTab = function (pr) {
  const l = chLetters(pr.id), cur = l[l.length - 1], can = s4CanLetter() && pr.status !== 'Retired';
  if (!cur) return `<section class="card"><h2>Offer letter</h2><p class="small">${pr.status === 'Retired' ? 'Retired programme — it takes no new applicants, so it has no offer letter.' : 'No offer letter uploaded yet.'}</p>${pr.status === 'Retired' || !can ? '' : `<button class="btn btn-primary" data-act="chLetterUp" data-id="${pr.id}">Upload offer letter</button>`}</section>`;
  return `<section class="card"><div class="row-b"><h2>Offer letter</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="chLetterUp" data-id="${pr.id}">${ic('upload', 14)}Upload new version</button>` : ''}</div>
    <p class="small muted">Applicants read and sign this letter in step 3 of their sign-up. Merge fields: <span class="ch-merge">{{full_name}}</span>, <span class="ch-merge">{{student_id}}</span> and <span class="ch-merge">{{programme}}</span>; everything else, including the signatory, is fixed text. Each version keeps its own text and file; published versions never change. A new version applies to new applicants only — anyone who has already started their sign-up keeps the version they started with.</p>
    <dl class="kv"><dt>Current version</dt><dd>Version ${cur.v} · <span class="mono small">${esc(cur.file)}</span> · uploaded by ${esc(cur.by)} on ${fd(cur.at)}</dd></dl>
    <div class="row"><button class="btn btn-sm" data-act="chLetterPrev" data-id="${pr.id}">Preview with a sample learner</button></div>
    <h3>Template</h3>${chLetterHtml(cur, { raw: true })}</section>
    <section class="card"><h2>Version history</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>File</th><th>Uploaded</th><th>By</th><th>What changed</th><th></th></tr></thead><tbody>${l.slice().reverse().map(x => `<tr><td>${x.v}${x === cur ? ' ' + chip('Current', 'green') : ''}</td><td class="mono small">${esc(x.file)}</td><td>${fd(x.at)}</td><td>${esc(x.by)}</td><td class="small">${esc(x.note)}</td><td class="nowrap"><button class="btn btn-sm btn-ghost" data-act="s4LetterPrev" data-id="${pr.id}" data-v="${x.v}">Preview</button>${can && x !== cur ? ` <button class="btn btn-sm" data-act="s4LetterRestore" data-id="${pr.id}" data-v="${x.v}">Restore as new version</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
};
ACT.s4LetterPrev = el => { const L = chLetters(el.dataset.id).find(x => x.v === +el.dataset.v); if (!L) return; openModal({ title: `Offer letter — version ${L.v}`, sub: 'Sample learner: Aisha Rahman · IA-L-18022', size: 'lg', body: chLetterHtml(L, { name: 'Aisha Rahman', sid: 'IA-L-18022' }) + `<p class="xs muted">File: ${esc(L.file)} (the file itself is simulated in the prototype)</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
ACT.chLetterUp = el => {
  const pr = ADMIN.programmes.find(x => x.id === el.dataset.id); if (!s4LetterGuard(pr)) return; setUi('chLetterFile', '');
  const prev = chLetterCur(pr.id);
  reasonDlg({ title: 'Upload offer letter — ' + esc(pr.title), ok: 'Upload new version', label: 'What changed (required)', extra: `<div class="field"><label for="lt-f">Letter (PDF or DOCX)</label><input class="input" type="file" id="lt-f" accept=".pdf,.docx" data-onchange="chLetterFile"><span class="hint"><span id="lt-fname">No file chosen</span> — the prototype records the file name; the file itself is simulated.</span><button type="button" class="linklike small" data-act="chLetterSample">Prototype: use a sample DOCX</button></div>
    <div class="field"><label for="lt-x">Letter text for this version</label><textarea class="textarea" id="lt-x" rows="8">${esc(s4ParaIn(prev && prev.text))}</textarea><span class="hint">Leave a blank line between paragraphs. Merge fields: {{full_name}}, {{student_id}}, {{programme}}.</span></div><p class="small muted">The new version applies to new applicants only. Earlier versions are kept unchanged.</p>`,
    onOk: r => { const f = ui('chLetterFile', ''); if (!f) { fieldErr('#lt-f', 'Choose a PDF or DOCX file'); return false; } if (!/\.(pdf|docx)$/i.test(f)) { fieldErr('#lt-f', 'Upload a PDF or DOCX file'); return false; }
      const text = s4ParaOut($('#lt-x').value); if (!text.length) { fieldErr('#lt-x', 'Enter the letter text'); return false; }
      const l = chLetters(pr.id), p0 = l[l.length - 1], v = (p0 ? p0.v : 0) + 1;
      l.push(Object.freeze({ v, file: f, at: now().toISOString(), by: ADMIN.me.name, note: r, programme: pr.title, text: Object.freeze(text) }));
      logA('NVQ Programmes', pr.title, 'Offer letter uploaded', p0 ? 'Version ' + p0.v : '—', 'Version ' + v, r); render(); toast(`Offer letter version ${v} saved with its own text (file name recorded; the file is simulated). It applies to new applicants.`); } });
};
ACT.s4LetterRestore = el => {
  const pr = ADMIN.programmes.find(x => x.id === el.dataset.id); if (!s4LetterGuard(pr)) return; const l = chLetters(pr.id), src = l.find(x => x.v === +el.dataset.v); if (!src) return;
  reasonDlg({ title: `Restore version ${src.v} as a new version`, ok: 'Restore as new version', body: `<p class="small">A new version is made with version ${src.v}'s text and file. Version ${src.v} and every other version stay unchanged. New applicants get the new version.</p>`,
    onOk: r => { const v = l[l.length - 1].v + 1; l.push(Object.freeze({ v, file: src.file, at: now().toISOString(), by: ADMIN.me.name, note: `Restored from version ${src.v}: ${r}`, programme: src.programme, text: Object.freeze(src.text.slice()), from: src.v })); logA('NVQ Programmes', pr.title, 'Offer letter restored as new version', 'Version ' + src.v, 'Version ' + v, r); render(); toast(`Version ${v} made from version ${src.v}.`); } });
};
// Signing keeps an unchangeable copy of exactly what was signed
const _signS4 = ACT.suSign;
ACT.suSign = el => {
  const w = W, L = w && w.signup && chLetterFor(w), had = w && w.signup && w.signup.sig; const r = _signS4(el);
  if (w.signup && w.signup.sig && w.signup.sig !== had && L) w.signup.sig.snapshot = Object.freeze({ v: L.v, file: L.file, programme: L.programme, text: Object.freeze(L.text.slice()), name: chFullName(w), sid: w.me.id });
  return r;
};
ACT.chSignedPdf = el => {
  const w = chW(el.dataset.v), s = w.signup.sig; if (!s) return;
  const L = s.snapshot || chLetters(chProgOf(w).id).find(x => x.v === s.v) || chLetterFor(w);
  openModal({ title: 'Signed offer letter', sub: `${esc(chFullName(w))} · ${w.me.id} · PDF (simulated)`, size: 'lg', body: `<div class="ch-pdf">${chLetterHtml(L, { name: chFullName(w), sid: w.me.id })}${chSigBlock(s)}</div><p class="xs muted">${esc(chSignedFile(w))} · ${s.snapshot ? 'the exact text signed (kept with the signature)' : 'the letter version signed'}, the filled-in fields and the signature block.</p>`, actions: [{ label: 'Close' }, { label: `${ic('download', 15)} Download PDF (simulated)`, cls: 'btn-primary', fn: () => { toast('Simulated — the prototype doesn\'t create the PDF file.', 'info'); } }] });
};

/* ---------- Scenario #29 ---------- */
const s4AsSA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; };
ACT.s4Sc29Plan = () => { s4AsSA(); go('a-finance', { tab: 'plans' }); ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }); };
ACT.s4Sc29List = () => { acaEnter('KA'); S.signedIn = true; setUi('clProg', 'NV-L3'); go('a-admissions', { tab: 'builder' }); };
ACT.s4Sc29Letter = () => { s4AsSA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' }); ACT.chLetterUp({ dataset: { id: 'NV-L3' } }); };
ACT.s4Sc29Apply = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === s4Pr('NV-L3').title); if (!W.admission && c) ACT.applyNvq({ dataset: { id: c.id } }); };
ACT.s4Sc29Sign = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('admission'); toast('Demo: Daniel signs the offer letter version he was given at the start, then pays.', 'info'); };
ACT.s4Sc29Fin = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; setUi('fpL', 'A'); go('f-plans'); };
const _scListS4 = SC_LIST;
SC_LIST = function () {
  const x = (text, r, t, act) => ({ text, r, t, act });
  return _scListS4().concat([['29', 'Programme sign-up set-up: checklist, plan and offer letter', 'Setup S4a', [
    x('Finance (here the Super Admin) sets Level 2\'s payment plan — fee, own deposit or the default, instalments; the first instalment is due at sign-up.', 'admin', 'a-finance..plans', 's4Sc29Plan'),
    x('The Academic Admin edits Level 3\'s document checklist: UK, UAE and All items.', 'admin', 'a-admissions..builder', 's4Sc29List'),
    x('The Super Admin uploads a new Level 3 offer letter version with its own text.', 'admin', 'a-programmes.NV-L3.letter', 's4Sc29Letter'),
    x('Daniel Okafor (no NVQ yet) signs up to Level 3 from Browse: his checklist (UK items), payment plan and letter version are fixed at the start.', '', '', 's4Sc29Apply'),
    x('He uploads his documents, signs the letter he was given and pays — the signed copy keeps that letter\'s text.', '', '', 's4Sc29Sign'),
    x('Finance sees his schedule under Payment Plans, built from the Level 3 plan.', 'admin', 'f-plans', 's4Sc29Fin')]]]);
};
CDL_SCEN.push(['29', 'Programme sign-up set-up: checklist, plan and offer letter', 'Setup fixes (S4a)']);
['Twenty-nine'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });

/* ---------- Records ---------- */
UXC.push(['Setup S4a', 'Setup fixes — admission and money (S4-05 … S4-09)', [
  'S4-05: one document checklist per programme (Admissions → Checklist builder, whose Programme list now shows every programme; the new-programme wizard\'s checklist step uses the same list). Items have mandatory/optional, formats, maximum size, has-expiry, guidance and "Applies to" All, UK or UAE; Add, Edit, Retire, Restore and Move are audited and role-checked. Level 2–5 were seeded from the documents applicants get today (UK and UAE versions), NV-N1/NV-N2 from their wizard lists. At sign-up start the applicant gets the All items plus their region\'s. Provisional, pending client confirmation (not an approved SRS policy): an applicant from any other country gets the UK items by the existing region rule (CH-03); this is shown to the applicant and flagged on the application. The upload now checks the item\'s own maximum size. Files: setup-s4a.js; screens-b.js (maximum size).',
  'S4-06: one versioned payment plan per programme (fee, own deposit or the default, 1–24 instalments that divide the fee to the penny, part payments; the first instalment is due at sign-up, CH-10). Finance → Payment Plans → Plan templates and Super Admin → Finance → Instalment plans: Edit / Set up, Retire, History; the wizard\'s plan step writes the same store. Seeded from today\'s sign-up: Level 2, 3 and 5 at their fees with the default deposit and 6 instalments; NV-N2 keeps its £150 deposit; Level 4 has no fee, so it shows "Needs configuration" and payment is blocked. The old template rows are kept as unassigned demo / reference templates — never used at sign-up; Finance can use one as a starting point. The fee is the programme\'s price: Finance can set a missing one (Level 4) but only the Super Admin changes an existing one (a plan can\'t be used to change a price). A fee change reaches the Browse price for new learners only — agency / bundle list prices, bundles already bought, negotiated and discount-based agency prices don\'t change (CH-04, CH-06). Enrolled learners keep their agreed fee and plan; applicants keep the plan in force when their sign-up started.',
  'S4-07: the deposit default (£300) and seat hold (28 days) are configuration (System Configuration row, Finance → Payment Plans, Super Admin → Finance). The deposit amount and the hold length are read by sign-up (amount, hold date, balance due) and seat release; a programme\'s own deposit overrides the default, and a programme without one keeps inheriting it. Deposit eligibility stays fixed: the batch must start in 28 days or more (CH-10) — the hold length doesn\'t change it. The hold can be set from 1 to 28 days (default 28): a conservative prototype choice, to confirm with the client if longer holds are wanted — not an SRS change. Existing deposits and holds don\'t change. Files: ch-b2.js and ch-b8.js (the constants replaced by chFeeOf / chDepOf / chInstNOf / chHoldDays), ch-b7c.js (seat release states the learner\'s own hold).',
  'S4-08: Super Admin → Finance → Instalment plans: "Save plan" edits the programme plan; "Adjust schedule", "Waive" and "Discount" run Finance\'s own tools on the chosen learner\'s real plan (Discount = Finance\'s "Apply waiver / discount"). Only Finance Admins and the Super Admin can change plans or adjust a learner — refusals are logged; the System Admin is read-only.',
  'S4-09: each offer-letter version keeps its own text (edited when the version is uploaded) and file name; published versions never change. Any version can be previewed, and restored as a new version. The letter version is fixed when the sign-up starts; signing keeps an unchangeable copy of the signed text with the signature. Only the Super Admin, Academic Admin and System Admin can upload or restore. The signed PDF says it is simulated.',
  'Level 2–5 sign-up: a learner without an NVQ (e.g. Daniel Okafor, Fatima Al Mansoori) who signs up from Browse goes through the same real sign-up as the wizard programmes — that programme\'s checklist, plan, letter and current structure. Priya Raman\'s seeded demo journey and Scenario #16 are unchanged. Real-path applicants appear in Admissions → Applications for review.',
  'Not changed / open: the reviewer doesn\'t record an expiry date when approving a document (the applicant is told the document has an expiry date); other-country checklists use the UK items until the client confirms; Level 4\'s fee needs configuration.']]);
const _aIdxS4 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS4(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Admissions → Checklist builder (per programme)', { act: 'aJump', t: 'a-admissions..builder' }, 'S4-05 — each programme\'s checklist, with UK / UAE items; used at sign-up.'),
  chIdxLi('Finance → Payment Plans → Plan templates', { act: 'aJump', t: 'f-plans..templates' }, 'S4-06 / S4-07 — programme plans, the deposit default and seat hold, legacy templates.'),
  chIdxLi('Super Admin → Finance → Instalment plans', { act: 'aJump', t: 'a-finance..plans' }, 'S4-08 — plans and per-learner adjust / waive / discount (Finance\'s own tools).'),
  chIdxLi('NVQ programme → Offer letter (versions)', { act: 'aJump', t: 'a-programmes.NV-L3.letter' }, 'S4-09 — versions with their own text, preview and restore.'),
  chIdxLi('Demo Scenario #29', { act: 'scOpen' }, 'S4a — set up a programme, then a new learner signs up to it.')].join('')}`);

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) s4Init();
