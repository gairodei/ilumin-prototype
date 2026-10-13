/* ============================================================
   Client decisions CH-01 … CH-31 — Batch 1 (CH-01, CH-02, CH-03, CH-05, CH-31) and the CH records.
   Loads after clientsheet.js. Superseded behaviour (country change, multi-currency, region tags,
   VAT-invoice tag) was removed at its source; this file adds the new pieces and the records.
   ============================================================ */
'use strict';

/* ---------- CH-31 Academy contact details: one configurable setting (System Configuration) ---------- */
const CH_CONTACT_DEFAULT = '020 3983 0282 · info@welfarehs.co.uk · Mon–Sun 9:30 AM – 6 PM';
const academyContact = () => {
  const c = (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.config || []).find(x => x.name === 'Academy contact details');
  return `<span class="ch-contact">${esc(c ? c.value : CH_CONTACT_DEFAULT)}</span>`;
};

/* ---------- CH-01 (1b) Registration: UK and UAE pinned at the top of the country list (register.js);
   the chosen country is confirmed before the account is created. Go back closes the dialog only,
   so the form keeps everything entered (passwords included). ---------- */
function regConfirmCountry(d, onConfirm) {
  confirmDlg({ title: 'Confirm your country', body: `<p>You selected <strong>${esc(d.country)}</strong>. This can't be changed later.</p>`, cancel: 'Go back', ok: 'Confirm', onOk: () => { closeModal(); onConfirm(); } });
}

/* ---------- Defect fix (1b): "Reset demo data" after registering a new learner ----------
   initStore() rebuilds the base worlds A–F and points W at S.variant before later layers add theirs, so rebuilding
   while on a registered learner (world G, which a reset removes) or on Priya Nair (world H, re-added afterwards) threw.
   The rebuild now runs on the default learner world, then returns to the previous world if it still exists, and W
   always ends on the current learner's world.
   Reset also clears the demo registrations; a learner whose world is gone lands on the default learner's dashboard. */
const _initStoreCh = initStore;
initStore = function () {
  const v = S.variant; if (![...'ABCDEF'].includes(v)) S.variant = 'A';
  _initStoreCh();
  if (v !== S.variant && STORE.worlds[v]) S.variant = v;
  W = STORE.worlds[S.variant]; // later layers build extra worlds with makeWorld(), which repoints W
};
const _resetCh = ACT.resetDemo;
ACT.resetDemo = () => {
  const v = S.variant, learnerView = S.portal === 'learner' && S.signedIn;
  clearTimer('regtick'); S.reg = null; S.regV = null; delete STORE.regs; delete PERSONAS.G; delete VARIANTS.G;
  if (['register', 'regVerify', 'welcome'].includes(S.auth)) S.auth = 'signin';
  _resetCh();
  if (v !== S.variant && learnerView) go('dashboard');
};

/* ---------- Demo Scenarios count: the page, index, demo panel and log say how many there are ---------- */
const CH_NUMW = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one', 'Twenty-two'];
const chScenN = () => SC_LIST().length;
const _scPageCh = SCREENS['demo-scenarios'];
SCREENS['demo-scenarios'] = p => _scPageCh(p).replace(/[A-Z][a-z-]+ end-to-end walkthroughs\./, `${CH_NUMW[chScenN()]} end-to-end walkthroughs.`);
AFTER.push(() => { const b = document.querySelector('#demo-root .demo-panel [data-act="scOpen"]'); if (b && /^Open the \d+ Demo Scenarios$/.test(b.textContent)) b.textContent = `Open the ${chScenN()} Demo Scenarios`; });
const chScenFix = h => h.replace(/Demo Scenarios — \d+ walkthroughs/, `Demo Scenarios — ${chScenN()} walkthroughs`);
// The Client Decisions Log lists every scenario that still exists (CH-01 removes #16 "Learner moves country")
const chCdlScenSync = () => { const ids = SC_LIST().map(s => s[0]); for (let i = CDL_SCEN.length - 1; i >= 0; i--) if (!ids.includes(CDL_SCEN[i][0])) CDL_SCEN.splice(i, 1); };

/* ---------- Records: the CH change list ---------- */
const CH_SOURCES = [['S1', 'Client suggestion sheet, 10–11 Oct'], ['S2', 'WhatsApp answer-key clarification, 11 Oct'], ['S3', 'Client email, 12 Oct'], ['S4', 'Weekly stand-up, 12 Oct'], ['S5', 'Follow-up answers, 12–13 Oct'], ['S6', 'Internal UX decision']];
// [ID, title, source, batch that applies it (or the earlier status)]
const CH_LOG = [
  ['CH-01', 'Country fixed at registration, never changes', 'S3→S4', 1],
  ['CH-02', 'All prices in GBP; Stripe shows local currency', 'S3→S4/S5', 1],
  ['CH-03', 'Data region: UK→UK, UAE→UAE, others→UK', 'S3/S4', 1],
  ['CH-04', 'Price locked at enrolment', 'S3', 'Confirmed: already built, no change'],
  ['CH-05', 'VAT invoices handled outside the system', 'S3→S4', 1],
  ['CH-06', 'VAT % per agency bundle, Finance approval', 'S4/S5', 6],
  ['CH-07', 'Sign-up flow: details → documents → offer letter → payment → start', 'S1/S4/S5', 2],
  ['CH-08', 'Offer letter per NVQ course, typed e-signature, signed PDF emailed', 'S4/S5', 2],
  ['CH-09', 'Declaration tick-box', 'S4/S5', 2],
  ['CH-10', 'Deposit (only if batch starts ≥28 days) or instalments; card or bank transfer', 'S1/S5', 2],
  ['CH-11', 'Bank transfer: learner starts immediately; Finance records payment', 'S5', '2/3'],
  ['CH-12', 'Rejected after payment: access kept; alert Finance and Academic Admin', 'S5', 3],
  ['CH-13', 'Refund after rejection: Finance decides', 'S5', 3],
  ['CH-14', 'Manual Pause access', 'S5', 3],
  ['CH-15', 'Structure confirmed; module awarding-body codes', 'S4/S5', 4],
  ['CH-16', 'A quiz in every module (short courses only)', 'S1/S4/S5', 4],
  ['CH-17', 'Separate assignment / PD / observation assessors', 'S4/S5', 5],
  ['CH-18', 'Answer key per module (resource)', 'S1→S2→S4', 4],
  ['CH-19', 'PD by phone call', 'S1', 'Applied earlier (client sheet, C3)'],
  ['CH-20', '"Open assessment" link on module resources', 'S1', 'Applied earlier (C4)'],
  ['CH-21', 'Download criteria (PDF) + evidence requirements', 'S1', 'Applied earlier (C1)'],
  ['CH-22', 'Certificates sorted list + expiry reminder', 'S1', 'Applied earlier (C2)'],
  ['CH-23', 'Receipt preview pop-up', 'S1', 'Applied earlier (C5)'],
  ['CH-24', '"Needs attention" badge + single Action needed list', 'S1/S6', 'Applied earlier (C7, b8bce5b)'],
  ['CH-25', 'Applicant document preview', 'S1', 'Applied earlier (C8)'],
  ['CH-26', 'Short-course dashboard cards', 'S1', 'Applied earlier (C11/C12); Tasks counts module quizzes from Batch 4'],
  ['CH-27', 'Purchase history', 'S1', 'Applied earlier (C10)'],
  ['CH-28', 'Quiz heading wording', 'S1', 'Applied earlier (C14); becomes "What is this module about?" in Batch 4'],
  ['CH-29', 'Hide discontinued learners', 'S1', 'Applied earlier (C15)'],
  ['CH-30', 'Sheet items already satisfied (no change)', 'S1', 'Confirmed: no change'],
  ['CH-31', 'Academy contact details (020 3983 0282 · info@welfarehs.co.uk · Mon–Sun 9:30 AM–6 PM)', 'S4/S5', 1],
];
// Batches applied so far, with the date each was applied (later batch files add theirs)
const CH_APPLIED = { 1: '13 Oct 2026' };
const chStatus = b => {
  if (typeof b === 'string' && !/^\d/.test(b)) return [b, /^Applied/.test(b) ? 'green' : 'blue', ''];
  const nums = String(b).split('/'), done = nums.filter(n => CH_APPLIED[n]);
  if (done.length === nums.length) return [`Applied (Batch ${b})`, 'green', CH_APPLIED[nums[nums.length - 1]]];
  return [`Scheduled (Batch ${b})`, 'amber', done.length ? `Batch ${done.join('/')}: ${CH_APPLIED[done[0]]}` : ''];
};
// Pending client — the open items after the change list
const CH_PENDING = [
  ['P-27', 'Observation fee', 'Some learners pay a fee when their observation is at the Academy office. Pending: the amount, when it\'s charged, whether agency-sponsored learners pay it, and whether it\'s refundable. The payment dial and cards are on hold with it.'],
  ['P-28', 'Mistyped country', 'Proposed default, pending client confirmation. An admin may correct a genuinely mistyped country through Data Correction (System Admin review → Super Admin final approval); never because the learner moved. If the region changes between the UK and UAE, the data moves by an admin-run, audited one-off process. Not built — logged only.'],
  ['P-29', 'Client content', 'Privacy notice URL, verification domain, Academy office address, bank details for bank transfers — the remaining 4 placeholder topics (T04, T06, T07, T08 in the TBD register).'],
  ['P-30', 'Intake choice at sign-up', 'Prototype assumption: the learner chooses the batch so the deposit holds a seat. Built in Batch 2; pending client confirmation.'],
];
// Earlier follow-up decisions replaced or resolved by the change list
const CH_FU_STATUS = {
  F1: ['Superseded (CH-01)', 'The country never changes after registration; the moved-country rules, Priya Nair\'s moved state and its Demo Scenario (#16) are removed. Priya Nair is a plain UK learner paying in GBP.'],
  F2: ['Resolved (CH-02)', 'No exchange rates: every price is in GBP. The "Pending client" tag on course pricing and checkout is removed; checkout says Stripe may show the amount in the learner\'s local currency.'],
  F3a: ['Superseded (CH-02)', 'Learners from other countries pay in GBP like everyone else. INR prices and per-currency totals are removed.'],
  F3b: ['Resolved (CH-03)', 'Learners outside the UK and UAE are stored in the UK. The "Pending client" storage-region tag is removed.'],
  F8: ['Resolved (CH-05)', 'VAT invoices are sent by the Academy by email, outside the system. The "Pending client" tags are replaced with that note.'],
};
CDL_FU.forEach(r => { const s = CH_FU_STATUS[r[0]]; if (s) { r[2] = s[0]; r[3] = s[1]; } });
const chLogSections = () => `<section class="card"><h2>Client decisions — change list (CH-01 … CH-31)</h2><p class="small muted">Sources: ${CH_SOURCES.map(s => `<strong>${s[0]}</strong> ${esc(s[1])}`).join(' · ')}.</p>${recTbl(['ID', 'Decision', 'Source', 'Status', 'Date applied'], CH_LOG.map(r => { const [st, tone, dt] = chStatus(r[3]); return [r[0], esc(r[1]), r[2], chip(st, tone), dt || '—']; }))}<p class="small">Superseded / resolved by the change list: F1 (P-05), F2 (P-07), F3a and F3b (P-15), F8 (P-20) — see Follow-up decisions. Client suggestion sheet: items 9 and 13 are now decided (CH-07 … CH-11, CH-16); item 6 is pending (P-27).</p></section>
  <section class="card"><h2>Pending client</h2>${recTbl(['ID', 'Topic', 'Status', 'What it means in the prototype'], CH_PENDING.map(r => [r[0], esc(r[1]), chip('Pending client', 'amber'), esc(r[2])]))}</section>`;
const _cdLogCh = SCREENS['cd-log'];
// Placed after the first section (the final decisions list G1–G12 stays first)
SCREENS['cd-log'] = p => { chCdlScenSync(); const h = _cdLogCh(p).replace(/All \d+ run end to end in the prototype\./, `All ${chScenN()} run end to end in the prototype.`), i = h.indexOf('</section>') + '</section>'.length; return h.slice(0, i) + chLogSections() + h.slice(i); };

/* ---------- Records: TBD register (T01, T02, T03, T05 resolved; 4 topics remain) ---------- */
const CH_TBD_RESOLVED = [
  ['T01', 'Pending client: how agencies receive VAT invoices for bank-transfer purchases', 'CH-05', 'VAT invoices are sent by the Academy by email (note on agency bank-transfer purchases).'],
  ['T02', 'Pending client: storage region for learners outside the UK/UAE, and two-region hosting cost', 'CH-03', 'UK → UK, UAE → UAE, any other country → UK.'],
  ['T03', 'Pending client: exchange-rate source, update frequency, rounding, and price lock at enrolment', 'CH-02', 'Every price is in GBP; no exchange rates.'],
  ['T05', 'Client to supply: Academy contact email and phone', 'CH-31', 'System Configuration → "Academy contact details", shown in every place the placeholder was.'],
];
const _tbdRegCh = SCREENS['tbd-register'];
SCREENS['tbd-register'] = p => _tbdRegCh(p) + `<section class="card"><h2>Resolved by the client change list</h2>${recTbl(['Topic', 'Was', 'Decision', 'Now'], CH_TBD_RESOLVED.map(r => [r[0], esc(r[1]), r[2], esc(r[3])]))}<p class="small muted">Remaining: T04 bank payment instructions, T06 privacy notice URL, T07 verification domain, T08 Academy office address (P-29).</p></section>`;

/* ---------- Records: UX Changelog ---------- */
UXC.push(['CH batch 1', 'Client decisions — Batch 1 (CH-01, CH-02, CH-03, CH-05, CH-31)', [
  'CH-01: Country is read-only everywhere — "Request change" removed from Country of residence (learner Profile) and the country branch removed from profile-change approval; Learner 360 shows "Country: <country> (set at registration)". The F1 moved-country state (Priya Nair, "Country changed to … on …", "new purchases use the new currency") and Demo Scenario #16 "Learner moves country" are removed. Registration keeps the required country list.',
  'CH-01 (1b): Registration — United Kingdom and United Arab Emirates are pinned at the top of the country list, separated from the rest. Before the account is created, "Confirm your country" says "You selected [country]. This can\'t be changed later." with Go back (returns to the form with everything kept) and Confirm (completes registration).',
  'CH-02: GBP only — AED/INR prices, the AED course-price field, "Converted from the base price", exchange-rate tags, currency filters, currency columns, per-currency totals and the agency billing-currency field are removed. Mock AED/INR amounts converted at £1 = AED 4.65 = INR 105 (record IDs kept). Learner checkout adds "Stripe may show this amount in your local currency. You\'ll be charged £X.XX." Finance reports and dashboards show single GBP totals; agency bank-transfer purchases are in GBP.',
  'CH-03: Data region rule UK → UK, UAE → UAE, any other country → UK, shown in Learner 360, Learners, Data Protection → Data residency and the Finance learner record. The "Pending client: storage region…" tag is removed (T02).',
  'CH-05: "Pending client: how agencies receive VAT invoices…" removed (T01); agency bank-transfer purchases say "VAT invoices are sent by the Academy by email."',
  'CH-31: "Client to supply: Academy contact email and phone" (T05) replaced in all 16 places by the System Configuration setting "Academy contact details" — 020 3983 0282 · info@welfarehs.co.uk · Mon–Sun 9:30 AM – 6 PM. The learner contact form\'s old "Mon–Fri 09:00–17:00" hours are removed with it.',
  'Placeholder register: 4 topics remain (T04, T06, T07, T08 — all "Client to supply"); T03 resolved by CH-02. TBD-register.txt regenerated.',
  'CH-24 was already applied (C7, b8bce5b) — no change.']]);

UXC.find(x => x[0] === 'Defect fix')[2].push('"Reset demo data" after registering a new learner — fixed (found in CH batch 1b): the reset threw (Cannot read properties of undefined) because it rebuilt the demo worlds while still pointing at the registered learner\'s world, which a reset removes. Reset now rebuilds on the default learner world, clears the demo registrations, and returns to the previous world if it still exists (e.g. Priya Nair); otherwise it lands on the default learner\'s dashboard. After any reset the learner data shown is always the current learner\'s (building Priya Nair\'s world had left it pointing at hers). Test: ft-ch "1b Reset demo data after registering a new learner".');

/* ---------- Screen index (with purpose lines) ---------- */
const chIdxLi = (label, attrs, purpose) => `<li><button class="linklike" ${Object.entries(attrs).map(([k, v]) => `data-${k}="${v}"`).join(' ')}>${label}</button><span class="idx-purpose xs muted" data-pk="entry">${esc(purpose)}</span></li>`;
MODALS.chCheckout = ['A', 'browse', () => checkout({ title: 'Moving and Handling People — 2026', amount: 45, onSuccess: () => {} })];
const _idxCh = SCREENS.index;
SCREENS.index = p => chScenFix(_idxCh(p)) + `<section class="card idx-sec"><h2>Client decisions (CH)</h2><ul class="idx-list">${[
  chIdxLi('Checkout — GBP amount with the Stripe local-currency line', { act: 'jump', m: 'chCheckout' }, 'CH-02 — every price is in GBP; Stripe may show it in local currency.'),
  chIdxLi('Profile — Country of residence (read-only)', { act: 'jump', v: 'A', r: 'profile' }, 'CH-01 — the country is set at registration and never changes.'),
  chIdxLi('Registration — country list and "Confirm your country"', { act: 'regStart' }, 'CH-01 — UK and UAE first; the chosen country is confirmed before the account is created.')].join('')}</ul></section>`;
const _aIdxCh = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh(p) + `<section class="card idx-sec"><h2>Client decisions (CH)</h2><ul class="idx-list">${[
  chIdxLi('System Configuration — Academy contact details', { act: 'aJump', t: 'a-config' }, 'CH-31 — the phone, email and hours shown wherever learners, agencies and workplaces are told to contact the Academy.'),
  chIdxLi('Learner 360 — Country (set at registration) and Data region', { act: 'aJump', t: 'a-learner.IA-L-31900' }, 'CH-01, CH-03 — a learner from India: country fixed, data region UK.'),
  chIdxLi('Data Protection — Data residency', { act: 'aJump', t: 'a-dataprotection..residency' }, 'CH-03 — UAE learners stored in the UAE; everyone else in the UK.')].join('')}</ul></section>`;
