/* ============================================================
   CB12 — Final integration of the unified course builder (21 Oct 2026; PD-CB-79…84 in PROVISIONAL-DECISIONS.md).
   - One version bar for every programme, owned by the builder, in place of the CH-8 wizard's draft note and Versions card and
     S3's version header (whose "Publish programme" / "Publish version N" buttons and "Saving creates Version N" line repeated
     Section 7): Draft → the state and "Review & Publish"; draft version → what is being edited and "Review & Publish";
     published → "Create new version". Publishing happens in Section 7 only; the Version history panel links there too.
   - Fees & Payments is the home for fee options, observation fees, payment options (number of instalments) and deposits: the
     section says so, Course Details links to it, and the Deposit appears under one heading (CB8's summary heading, the editor's
     heading and the field legend were three).
   - Removed (cb-builder.js): the CH-8 Review step in the builder, the "Not yet in this section — planned for CB…" notes, the
     read-only Assignments list (replaced by CB5) and the seeded review card (replaced by CB11).
   - Kept for compatibility: every old address (#a-programmes.<id>.<tab> for the wizard steps and the 8-tab editor), and the
     legacy panels of programmes from before packages (their plan with Finance, the legacy observation fee rate).
   No new client policy, no migration. Loads last.
   ============================================================ */
'use strict';

/* ---------- The version bar ---------- */
const cbGoRv = pr => `<button class="btn btn-sm btn-primary" data-go="a-programmes" data-id="${pr.id}" data-tab="review">Review &amp; Publish</button>`;
function cbVerBar(pr, sec) {
  const kind = cbRvKind(pr), dv = cbDraftV(pr), here = sec === 'review', n = kind ? cbRvChecks(pr).block.length : 0;
  const state = !kind ? '' : n ? `<span class="cb-vb-n bad">${plural(n, 'item')} to fix before publishing</span>` : '<span class="cb-vb-n ok">Ready to publish</span>';
  // published and open for sign-up: the next step after publishing (the CH-8 note's "Create batch") stays one click away
  const batch = !kind && pr.status === 'Active' && cbRvCan() ? `<button class="btn btn-sm" data-act="newBatch">Create batch</button>` : '';
  const btn = kind && !here ? cbGoRv(pr) : !kind && cbRvCan() ? `<button class="btn btn-sm" data-act="${pr.chNew ? 's3WizVersion' : 'newProgVersion'}" data-id="${pr.id}">Create new version</button>${batch}` : '';
  const txt = kind === 'draftProg' ? `<strong>Draft — Version 1, not yet published.</strong> ${state}`
    : kind === 'draftVer' ? `<strong>You're editing Version ${dv} (draft).</strong> Learners stay on Version ${pr.version} until it's published. ${state}`
    : `<strong>Version ${pr.version} is current${pr.status === 'Suspended' ? ' — programme Suspended' : ''}.</strong> To change the curriculum or the observation configuration, create a new version: a draft you review and publish in Section 7. Learners stay on their version.`;
  return `<div class="note ${kind ? 'b-amber' : 'b-blue'} cb-vb" role="status">${ic(kind ? 'layers' : 'info')}<div class="small cb-vb-t">${txt}</div>${btn ? `<div class="cb-vb-a">${btn}</div>` : ''}</div>`;
}

/* ---------- Version history: publishing is in Section 7 ---------- */
const _panelsCB12 = cbPanels;
cbPanels = function (pr, sec) {
  const r = _panelsCB12.apply(this, arguments);
  if (sec === 'versions') return r.map(([k, l, f]) => [k, l, () => f().replace(/<button class="btn btn-sm btn-primary" data-act="kPubProg" data-id="([^"]+)">Publish version (\d+)<\/button>/, (m, id, v) => `<button class="btn btn-sm btn-primary" data-go="a-programmes" data-id="${id}" data-tab="review">Review &amp; publish Version ${v}</button>`)]);
  if (sec === 'payments' && !cbRetired(pr)) return r.map(([k, l, f], i) => [k, l, i ? f : () => cbFeesHome(pr) + f()]);
  return r;
};
const cbFeesHome = pr => `<p class="small cb-home">${ic('info', 14)} <strong>Fees &amp; Payments is where this programme's fee options, observation fees, payment options (how many instalments) and deposit are set and changed.</strong> ${cb8Managed(pr) ? 'They are approved by Finance as one package.' : 'This programme\'s terms were set before financial packages and are owned by Finance.'}</p>`;

/* ---------- Course Details: fees link to Section 5 ---------- */
const cbFeesLink = pr => `<button class="btn btn-sm cb-feelink" data-go="a-programmes" data-id="${pr.id}" data-tab="payments">Open Fees &amp; Payments</button>`;
const _formCB12 = cbForm;
cbForm = function (pr) {
  let h = _formCB12.apply(this, arguments); if (!pr) return h;
  return h.replace('Fees, fee options, observation fees and payment options are managed in Section 5 — Fees &amp; Payments.', `Fees, fee options, observation fees, payment options and the deposit are managed in Section 5 — Fees &amp; Payments. ${cbFeesLink(pr)}`);
};
const _detViewCB12 = cbDetailsView;
cbDetailsView = function (pr) { return _detViewCB12.apply(this, arguments).replace('<dt>Fees</dt><dd>See Section 5 — Fees &amp; Payments.</dd>', `<dt>Fees</dt><dd>Set in Section 5 — Fees &amp; Payments. ${cbFeesLink(pr)}</dd>`); };

/* ---------- Records ---------- */
UXC.push(['CB12', 'Course builder — final integration (21 Oct 2026)', [
  'One version bar above the sections for every programme: a Draft says "Draft — Version 1, not yet published" with how many items are left and "Review & Publish"; a draft version says what is being edited; a published programme offers "Create new version". The CH-8 wizard\'s draft note and Versions card and the older version header (with its own Publish buttons and "Saving creates Version N") are gone: publishing happens in Section 7 — Review & Publish only.',
  'Fees & Payments is the home for fee options, observation fees, payment options and the deposit: the section says so, and Course Details links to it ("Open Fees & Payments"). The Deposit is shown under one heading (it was three).',
  'Removed from the builder: the CH-8 Review step, the "Not yet in this section — planned for CB…" notes, the read-only assignments list and the seeded review card. Every old address still opens the matching section.']]);
const _aIdxCB12 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB12(p) + `<section class="card idx-sec"><h2>CB12 — Final integration</h2><ul class="idx-list">${[
  chIdxLi('Level 3 2027 update (Draft) — version bar and Review & Publish', { act: 'aJump', t: 'a-programmes.NV-L3D.details' }, 'CB12 — one version bar; publishing in Section 7.'),
  chIdxLi('New programme NV-N1 — Fees & Payments (the home for fees)', { act: 'aJump', t: 'a-programmes.NV-N1.payments' }, 'CB12 — fee options, observation fees, payment options and the deposit.')].join('')}</ul></section>`;
