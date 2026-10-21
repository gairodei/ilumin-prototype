/* ============================================================
   CB1 — Unified course builder shell (approved 20 Oct 2026; PD-CB-01 in PROVISIONAL-DECISIONS.md).
   One programme page for every NVQ programme — seeded (Level 2–5, drafts, retired) and created with "New NVQ programme" —
   with the seven approved sections: Course Details · Curriculum · Assessments · Observations · Fees & Payments ·
   Offer Letter & Documents (named "Documents & Contract" until CB3) · Review & Publish. It replaces the CH-8 step bar and the seeded programme's tab bar.
   Shell only: each section shows the controls that already work today, rendered by the existing chain (setup-s3, s4a, r1,
   r5, e1, e2, n5a, w1 …), so every guard, rule and audit entry is theirs. Nothing is copied into a new store. Where a
   section has no working control yet, it says so and names the stage that adds it (CB2 details editing for seeded
   programmes, CB5 assessment authoring, CB8 payment plan editing here). Old tab and step addresses (#a-programmes.<id>.tree,
   .structure, .types, .obs, .library, .letter, .docs, .plan, .fees, .support, .versions …) open the matching section.
   Retired programmes are read-only: their write controls are not shown and the write actions refuse (logged).
   Unsaved form changes are protected when leaving a section. Loads last.
   ============================================================ */
'use strict';

const CB_SECTIONS = [['details', 'Course Details'], ['curriculum', 'Curriculum'], ['assessments', 'Assessments'], ['observations', 'Observations'], ['payments', 'Fees & Payments'], ['documents', 'Offer Letter & Documents'], ['review', 'Review & Publish']];
// Route value (old tab / step, or a section) → [section, panel]; a null panel means the section's first panel
const CB_ROUTE = {
  details: ['details', 'details'], curriculum: ['curriculum', null], tree: ['curriculum', 'structure'], structure: ['curriculum', 'structure'], types: ['curriculum', 'types'],
  assessments: ['assessments', 'assessments'], observations: ['observations', null], obs: ['observations', 'obs'], library: ['observations', 'library'],
  payments: ['payments', null], plan: ['payments', 'plan'], fees: ['payments', 'fees'], support: ['payments', 'support'],
  documents: ['documents', null], letter: ['documents', 'letter'], docs: ['documents', 'docs'], review: ['review', 'review'], versions: ['versions', 'versions']
};
// Programme-scoped actions that change configuration (refused on a retired programme; their buttons aren't shown there)
const CB_WRITE = ['ch8SaveDetails', 'ch8AddUnit', 'ch8AddMod', 'ch8AddLo', 'ch8AddCrit', 'ch8Key', 'ch8SaveDocs', 'ch8SavePlan', 'ch8Publish', 'e1Submit', 'e1Draft',
  'chLetterUp', 's4LetterRestore', 's4CkAdd', 's4CkEdit', 's4CkMove', 's4CkRetire', 's4CkRestore', 'chSupSave', 'r1OptAdd', 'r1OptEdit', 'r1OptRetire',
  'newProgVersion', 'kPubProg', 's3WizVersion', 's3WizPublish', 'n5Settings', 'n5IaEdit', 'n5IaState', 'n5NvqEv'];
// Academy-wide controls that also appear on a programme page (assessment types, the shared library, cohort migration): they
// aren't this programme's, so they keep working elsewhere, but a retired programme's read-only page doesn't offer them
const CB_HIDE_RO = ['addType', 's3TypeEdit', 's3TypeRetire', 's3TypeActivate', 'kLib', 'kLibAttach', 's3LibActivate', 'kLibRetire', 'migrateCohort', 'newBatch'];
const cbPr = id => (typeof s3Pr === 'function' ? s3Pr(id) : null) || (ADMIN.programmes || []).find(p => p.id === id);
const cbIsL3 = pr => typeof r1IsL3Pid === 'function' && r1IsL3Pid(pr.id);
const cbRetired = pr => !!pr && pr.status === 'Retired';
const cbDraftV = pr => (pr.status === 'Draft' ? pr.version || 1 : pr.chNew ? (pr.nextDraft ? pr.version + 1 : null) : (typeof s3Draft === 'function' && s3Draft(pr.id) ? s3Draft(pr.id).v : null));
const cbEnt = pr => `${pr.title} (${pr.id})`;

/* ---------- The existing page, split into its version area and its section body ---------- */
const _pbCB = progBuilder;
// The existing renderer for one old tab / step: { pre: notes and version controls above the old navigation, body: the content below it }
function cbLegacy(pr, tab) {
  const t = document.createElement('template'); t.innerHTML = _pbCB.call(this, pr.id, tab);
  const kids = [...t.content.childNodes], isNav = n => n.nodeType === 1 && (n.matches('ol.ch8-steps') || n.matches('div.subtabs'));
  const k = kids.findIndex(isNav), keep = n => !(n.nodeType === 1 && (n.matches('.page-h') || n.matches('.ch-nav')));
  const ser = list => { const d = document.createElement('div'); list.filter(keep).forEach(n => d.appendChild(n)); return d; };
  return { pre: ser(k < 0 ? [] : kids.slice(0, k)), body: ser(k < 0 ? kids : kids.slice(k + 1)) };
}
// Retired: write controls are not shown (the actions refuse as well — see the guards below)
function cbReadOnly(div) {
  div.querySelectorAll(CB_WRITE.concat(CB_HIDE_RO).map(a => `[data-act="${a}"]`).join(',')).forEach(b => b.remove());
  div.querySelectorAll('input, select, textarea').forEach(f => { if (!f.closest('.dt, .dt-filt, [data-cb-keep]')) f.disabled = true; });
  return div;
}
const cbHtml = (div, pr) => (cbRetired(pr) ? cbHistText(cbReadOnly(div)) : div).innerHTML;
// Retired: inherited sentences that tell the reader how to change something are replaced by what is true of a historical record
const CB_HIST_TEXT = [
  ['Changes apply to new applicants only — an application keeps the list copied when it started.', 'Kept as a historical record: this programme is retired and takes no new applicants. Each application keeps the list copied when it started.'],
  ['Enrolled learners stay on their version. Migrating a cohort is an explicit, audited decision.', 'Kept as a historical record: learners who studied this programme stay on their version.'],
  [' (assessment type set here)', ' (assessment type)']];
function cbHistText(div) {
  const w = document.createTreeWalker(div, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) CB_HIST_TEXT.forEach(([a, b]) => { if (n.nodeValue.includes(a)) n.nodeValue = n.nodeValue.split(a).join(b); });
  div.querySelectorAll('p').forEach(p => { if (/^\s*Cohort migration — Super Administrator only\s*$/.test(p.textContent)) p.remove(); });
  return div;
}
// Retired: one accurate note in place of the version area (which said "Saving creates Version N" and offered new versions)
const cbHistNote = pr => `<div class="note b-grey cb-hist" role="status">${ic('lock')}<div class="small"><strong>Retired — a read-only historical record.</strong> Version ${pr.version} was the last version. Nothing in this programme can be saved, and no new version can be created. Learners who studied it keep their versions, signed documents and payment records.</div></div>`;

/* ---------- Panels of each section ---------- */
// Each panel: [route value, label, () => body html]. Panels are only listed where the programme has that control today.
function cbPanels(pr, sec) {
  const L = tab => () => cbHtml(cbLegacy(pr, tab).body, pr), H = f => () => { const d = document.createElement('div'); d.innerHTML = f(); return cbHtml(d, pr); };
  const nw = !!pr.chNew;
  switch (sec) {
    case 'details': return [['details', 'Course details', H(() => cbDetails(pr))]];
    // CB4: one curriculum editor for every programme (js/cb-curriculum.js); the shared assessment types after how this programme uses them
    case 'curriculum': return [['structure', 'Structure', H(() => cbCurriculum(pr))], ['types', 'Assessment types', H(() => cbCurTypesUse(pr) + s3TypesTab())]];
    case 'observations': { const na = cbObsNo(pr) ? cbObsNA(pr) : '', obs = L('obs'); return [['obs', 'Observation configuration', () => na + obs()]].concat(nw ? [] : [['library', 'Shared library (legacy)', L('library')]]); }
    case 'payments': {
      const fees = cbIsL3(pr) ? [['fees', 'Fee options', nw ? H(() => r1Card(pr.id)) : L('fees')]] : [];
      const plan = ['plan', 'Payment plan', nw ? L('plan') : H(() => cbPlanRO(pr))], rate = ['support', 'Observation fee rate', cbObsNo(pr) ? H(() => cbFeeNA(pr)) : nw ? H(() => chSupportTab(pr)) : L('support')];
      return nw ? [plan].concat(fees, [rate]) : fees.concat([plan, rate]);
    }
    // CB3: the offer letter (the course contract) and the one required-documents checklist, for every programme (js/cb-documents.js)
    case 'documents': return [['letter', 'Offer letter', H(() => cbLetterPanel(pr))], ['docs', 'Required enrolment documents', H(() => cbDocsPanel(pr))]];
    case 'versions': return [['versions', 'Version history', nw ? H(() => cbWizVersions(pr)) : L('versions')]];
  }
  return [];
}

/* ---------- Content for sections that have no working page of their own yet (read-only, stated as such) ---------- */
// CB2: Section 1 is cbDetails (js/cb-details.js) for every programme — editable for a Draft, the same layout read-only otherwise
// Observations answered "No" (N5a "Observation required: No"): the section and the observation fee rate say it doesn't apply
const cbObsNo = pr => { const d = typeof n5Shown === 'function' && n5CanView() ? n5Shown(pr) : null; return !!d && d.required === false; };
const cbObsNA = pr => `<div class="note b-grey cb-na" role="status">${ic('info')}<div class="small"><strong>Not applicable — this course has no observations</strong> (Course Details). ${cbRetired(pr) ? '' : 'Nothing here is needed to publish. '}Any configuration below is kept for history and isn't used.</div></div>`;
const cbFeeNA = pr => `<section class="card cb-na-fee"><h2>Observation fee rate</h2><p class="small">Not applicable — this course has no observations (Course Details), so no observation fee is asked for. The rate stored for the programme (${esc(chSupportOf(pr.id))}) is kept, not used.</p></section>`;
function cbPlanRO(pr) {
  const p = s4PlanCur(pr.id), issue = s4TermsOf(pr.id).issue;
  if (cbRetired(pr)) return `<section class="card cb-plan"><div class="row-b"><h2>Payment plan</h2>${chip('Retired', 'grey')}</div><p class="small">This programme is retired, so it offers no payment plan to new learners and none can be set. Learners who studied it keep their own agreed terms and payment records.</p>${p ? `<div class="cb-sum">${e1Summary(pr, e1TermsOfPlan(p))}</div>` : ''}</section>`;
  return `<section class="card cb-plan"><div class="row-b"><h2>Payment plan</h2>${p ? chip('Version ' + p.v + ' in force', 'green') : chip('Not set up', 'red')}</div>
    <p class="small muted">${ic('lock', 12)} Owned by Finance Admins and the Super Administrator and edited in Finance → Payment Plans (Super Administrator: Finance → Instalment plans). Shown here read-only.</p>
    ${p ? `<div class="cb-sum">${e1Summary(pr, e1TermsOfPlan(p))}</div>` : `<p class="small">${issue ? esc(issue) : 'This programme has no payment plan in force.'}</p>`}
    </section>`;
}
// Version history of a programme made with "New NVQ programme" (Draft programmes have only Version 1, unpublished)
function cbWizVersions(pr) {
  if (pr.status === 'Draft') return `<section class="card"><h2>Version history</h2><ul class="list"><li class="li"><div class="li-b"><strong>Version 1 (draft)</strong><span class="xs muted">Created ${fd(pr.created)} by ${esc(pr.by || '—')} · not yet published</span></div>${chip('Draft', 'amber')}</li></ul></section>`;
  const h = s3Hist(pr).slice().reverse();
  return `<section class="card"><h2>Version history</h2><ul class="list">${pr.nextDraft ? `<li class="li"><div class="li-b"><strong>Version ${pr.version + 1} (draft)</strong><span class="xs muted">Being edited — learners stay on Version ${pr.version} until it's published</span></div>${chip('Draft', 'amber')}</li>` : ''}${h.map(x => `<li class="li"><div class="li-b"><strong>Version ${x.v}${x.v === pr.version ? ' (current)' : ''}</strong><span class="xs muted">${x.fixture ? 'No recorded date or author' : `${fd(x.at)}${x.by ? ' · ' + esc(x.by) : ''} · ${esc(x.note || '')}`}</span></div>${chip(x.v === pr.version ? 'Current' : 'Superseded', x.v === pr.version ? 'green' : 'grey')}</li>`).join('')}</ul></section>${auditPanel(a => a.module === 'NVQ Programmes' && String(a.entity || '').includes('(' + pr.id + ')') && /Version|published/i.test(a.action), 'Version history — audit')}`;
}

/* ---------- Section indicators (only what is true today) ---------- */
function cbBadges(pr) {
  const b = {}, add = (s, h) => { (b[s] = b[s] || []).push(h); };
  if (typeof CB_CACHE !== 'undefined' && CB_CACHE[pr.id]) add('details', '<span class="cb-badge warn">Unsaved</span>');
  else if (!pr.chNew) add('details', '<span class="cb-badge">Read-only</span>');
  add('assessments', '<span class="cb-badge">Read-only</span>');
  const d = typeof n5Shown === 'function' && n5CanView() ? n5Shown(pr) : null; if (d && d.required === false) add('observations', '<span class="cb-badge">Not applicable</span>');
  return b;
}

/* ---------- The page ---------- */
let CB_DIRTY = null; // { label } while a form in the current section has unsaved changes
function cbPage(pr, tab) {
  CB_DIRTY = null;
  const fallback = pr.chNew ? 'details' : 'curriculum', route = CB_ROUTE[tab] || CB_ROUTE[fallback], sec = route[0];
  const panels = cbPanels(pr, sec), cur = panels.find(p => p[0] === route[1]) || panels[0], i = CB_SECTIONS.findIndex(s => s[0] === sec);
  const dv = cbDraftV(pr), badges = cbBadges(pr);
  const chips = `${chip(pr.status, { Active: 'green', Draft: 'amber', Suspended: 'amber', Retired: 'grey' }[pr.status] || 'grey')}<span class="typebadge">Version ${pr.version}</span>${dv && pr.status !== 'Draft' ? chip('Version ' + dv + ' draft', 'amber') : ''}<button class="btn btn-sm cb-vh" data-go="a-programmes" data-id="${pr.id}" data-tab="versions">${ic('layers', 14)}Version history</button>`;
  const ver = cbRetired(pr) ? cbHistNote(pr) : cbVerBar(pr, sec);
  const nav = `<nav class="cb-nav" aria-label="Course builder sections"><ol>${CB_SECTIONS.map(([k, l], n) => `<li><button class="cb-sec${k === sec ? ' cur' : ''}" data-go="a-programmes" data-id="${pr.id}" data-tab="${k}" ${k === sec ? 'aria-current="page"' : ''}><span class="cb-n" aria-hidden="true">${n + 1}</span><span class="cb-l">${esc(l)}</span>${(badges[k] || []).join('')}</button></li>`).join('')}</ol></nav>`;
  const pnav = panels.length > 1 ? `<div class="cb-panels" role="tablist" aria-label="${esc(sec === 'versions' ? 'Version history' : CB_SECTIONS[i][1])}">${panels.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${k === cur[0]}" data-go="a-programmes" data-id="${pr.id}" data-tab="${k}">${esc(l)}</button>`).join('')}</div>` : '';
  const title = sec === 'versions' ? `<div class="row-b cb-sh"><h2 class="cb-h">Version history</h2><button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="${fallback}">Back to the course builder</button></div>` : `<h2 class="cb-h"><span class="cb-hn">${i + 1}</span> ${esc(CB_SECTIONS[i][1])}</h2>`;
  const steps = i < 0 ? '' : `<div class="row-b cb-foot">${i > 0 ? `<button class="btn" data-go="a-programmes" data-id="${pr.id}" data-tab="${CB_SECTIONS[i - 1][0]}">← ${esc(CB_SECTIONS[i - 1][1])}</button>` : '<span></span>'}${i < CB_SECTIONS.length - 1 ? `<button class="btn btn-primary" data-go="a-programmes" data-id="${pr.id}" data-tab="${CB_SECTIONS[i + 1][0]}">${esc(CB_SECTIONS[i + 1][1])} →</button>` : ''}</div>`;
  return `${pageA(esc(pr.title), `${esc(pr.level)}${pr.code ? ` · Course code <span class="mono cb-code">${esc(pr.code)}</span>` : ''} · <span class="mono">${esc(pr.ref || '—')}</span>`, chips, [['NVQ Programmes', 'a-programmes'], [esc(pr.title)]])}
    <div class="cb" data-pid="${pr.id}" data-sec="${sec}"><div class="cb-ver">${ver}</div>${sec === 'versions' ? '' : nav}${title}${pnav}<div class="cb-body" data-label="${esc(sec === 'versions' ? 'Version history' : CB_SECTIONS[i][1] + (panels.length > 1 ? ' — ' + cur[1] : ''))}">${cur ? cur[2]() : ''}</div>${steps}</div>`;
}
// A link without a tab opens what it opened before: Curriculum (the Hierarchy builder) for seeded programmes, and Course Details
// for programmes made with "New NVQ programme" (the route's default "tree" was their Details step)
progBuilder = function (id, t) {
  const pr = cbPr(id); if (!pr) return _pbCB.apply(this, arguments);
  return cbPage(pr, pr.chNew && (!t || t === 'tree') ? 'details' : t);
};

/* ---------- Unsaved changes: leaving the section asks first ---------- */
document.addEventListener('input', e => { const f = e.target; if (!f || !f.closest || f.closest('#modal-root, .dt, .dt-filt, [data-cb-keep]')) return; const b = f.closest('.cb-body'); if (b) CB_DIRTY = { label: b.dataset.label || 'this section' }; }, true);
document.addEventListener('change', e => { const f = e.target; if (!f || !f.closest || f.closest('#modal-root, .dt, .dt-filt, [data-cb-keep]')) return; const b = f.closest('.cb-body'); if (b) CB_DIRTY = { label: b.dataset.label || 'this section' }; }, true);
document.addEventListener('click', e => {
  if (!CB_DIRTY || !e.target || !e.target.closest) return;
  const el = e.target.closest('[data-go], a[href^="#"]'); if (!el || el.closest('#modal-root')) return;
  e.preventDefault(); e.stopImmediatePropagation(); const what = CB_DIRTY.label;
  confirmDlg({ title: 'Leave without saving?', ok: 'Leave without saving', cancel: 'Stay and save', danger: true, body: `<p class="small">You have unsaved changes in <strong>${esc(what)}</strong>. Stay to save them with that section's Save button, or leave and discard them.</p>`, onOk: () => { CB_DIRTY = null; closeModal(); el.click(); } });
}, true);

/* ---------- Retired programmes: the write actions refuse, whoever calls them ----------
   The N5a actions already refuse a retired programme themselves (logged "Retired programme"), so they keep their own refusal. */
const CB_OWN_RETIRED = ['n5Settings', 'n5IaEdit', 'n5IaState', 'n5NvqEv'];
function cbPidOf(name, el) {
  const d = (el && el.dataset) || {};
  if (/^r1Opt(Edit|Retire)$/.test(name)) { const o = typeof r1Opt === 'function' && r1Opt(d.id); return o ? r1PidOf(o) : null; }
  return d.p || d.pid || d.id || null;
}
CB_WRITE.filter(n => !CB_OWN_RETIRED.includes(n)).forEach(name => {
  const f = ACT[name]; if (typeof f !== 'function') return;
  ACT[name] = function (el) {
    const pr = cbPr(cbPidOf(name, el));
    if (cbRetired(pr)) { logA('NVQ Programmes', cbEnt(pr), 'Blocked: ' + name + ' (programme retired)', '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('This programme is retired, so it is read-only.', 'err'); return; }
    return f.apply(this, arguments);
  };
});

/* ---------- Programme administrator actions that had no role check of their own ----------
   Found by CB1's direct-call check: these opened and saved for any signed-in role (Finance, Business, even a learner) when called
   directly, although only programme administrators see them. They now use the same rule as the rest of the programme's
   structure (s3CanEdit: Super Admin, Academic Admin, System Admin, in the admin portal) and log the refusal the same way. */
const CB_ROLE = { ch8SaveDetails: 'change the course details', ch8AddUnit: 'change the structure', ch8AddMod: 'change the structure', ch8AddLo: 'change the structure', ch8AddCrit: 'change the structure',
  ch8Key: 'change the structure', s3WRename: 'change the structure', s3WRemove: 'change the structure', s3KeyRemove: 'remove an answer key', s3WizVersion: 'create a new version', s3WizPublish: 'publish a version', chSupSave: 'change the observation fee rate' };
const cbAdmin = () => S.portal === 'admin' && !!S.signedIn && typeof s3CanEdit === 'function' && s3CanEdit();
Object.entries(CB_ROLE).forEach(([name, what]) => {
  const f = ACT[name]; if (typeof f !== 'function') return;
  ACT[name] = function (el) { if (!cbAdmin()) { const pr = cbPr(cbPidOf(name, el)); s3Refuse(what, pr ? cbEnt(pr) : '—'); return; } return f.apply(this, arguments); };
});


/* ---------- Records ---------- */
UXC.push(['CB1', 'Unified course builder shell (approved 20 Oct 2026)', [
  'Every NVQ programme — seeded Level 2–5, drafts, retired, and programmes created with "New NVQ programme" — opens one page with seven sections: Course Details, Curriculum, Assessments, Observations, Fees & Payments, Documents & Contract, Review & Publish. It replaces the seven-step bar of new programmes and the eight-tab bar of seeded programmes. The header shows the title, level, reference, status, version and "Version history".',
  'Each section shows the controls that already work today, unchanged and with their own permissions and audit: the structure builder and assessment types; observation configuration and the legacy library; the payment plan (Finance approval for new programmes), Level 3 fee options and the observation fee rate; the offer letter with its versions and the enrolment-document checklist; the review and publish checks. Programmes created with "New NVQ programme" now also show their fee options and observation fee rate, which had no screen before.',
  'Sections without a working control of their own say so: Course Details of seeded programmes and Assessments are read-only (editing arrives in CB2 and CB5); the payment plan of seeded programmes is shown read-only with where Finance edits it (CB8).',
  'Old addresses keep working: #a-programmes.<id>.tree / structure / types / obs / library / letter / docs / plan / fees / support / versions / review open the matching section and panel.',
  'Retired programmes are read-only: write controls aren\'t shown and the write actions refuse, logged, even when called directly. Their version area is one note — a read-only historical record, the last version, nothing can be saved and no new version can be created — instead of "Saving creates Version N", and no wording on their pages describes how to change them. Leaving a section with unsaved form changes asks first. The "New NVQ programme" dialog is labelled "Section 1 — Course Details".',
  'All seven sections are visible at every width without sideways scrolling (a wrapping grid on tablets and phones); the current section is marked with aria-current, a coloured border and number, and its name as the heading.',
  'Programme-administrator actions that had no role check of their own (structure of new programmes, answer keys, details, new versions, the observation fee rate — 12 actions) now refuse other roles and log the refusal.']]);
const _aIdxCB = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB(p) + `<section class="card idx-sec"><h2>CB1 — Unified course builder</h2><ul class="idx-list">${[
  chIdxLi('Level 3 Diploma (published) — Course builder', { act: 'aJump', t: 'a-programmes.NV-L3' }, 'CB1 — the seven sections for a seeded, published programme.'),
  chIdxLi('Level 3 2027 update (Draft) — Course builder', { act: 'aJump', t: 'a-programmes.NV-L3D' }, 'CB1 — a seeded Draft programme.'),
  chIdxLi('Level 3 2018 spec (Retired) — Course builder', { act: 'aJump', t: 'a-programmes.NV-L3O' }, 'CB1 — read-only.'),
  chIdxLi('New programme NV-N1 (Draft) — Course builder', { act: 'aJump', t: 'a-programmes.NV-N1' }, 'CB1 — a programme created with "New NVQ programme".')].join('')}</ul></section>`;
