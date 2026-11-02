/* ============================================================
   CBX — NVQ course builder restructure (2 Nov 2026; PD-CBX-* in PROVISIONAL-DECISIONS.md). Loads after obs1b-builder.js.
   The approved seven sections (PD-CB-01) keep their keys, order and numbers 1–6, because publishing checks, guidance and decisions
   cite them ("Section 4 — Observations", "Section 5 — Fees & Payments"). What changes:
   - Section 7 "Resources & Delivery" (new): the delivery modes the course offers, its batches and where their live sessions are
     scheduled, and the learning resources mapped to it — each managed where it already is, linked from here. Review & Publish is 8.
   - Every section says what it is for ("Step N of 8" + one line), and the section bar shows each section's state: Complete,
     N to fix, Not started, Optional, Not applicable — from the same records and checks Review & Publish uses.
   - Back / Next name where they go.
   - Legacy panels are folded away: "Shared library (legacy)" (a read-only copy of the legacy list) becomes a link on Observation
     settings; "Legacy observation fee rate" moves under "Financial history" for package programmes. Nothing they did is lost.
   - Observation events: its locations card shows the settings and links to them (one editor, Observation settings).
   - Review & Publish: "Fix in" links for library criteria problems open the Workplace / Academy criteria tab; the summary includes
     Resources & Delivery.
   No data is stored differently; no business rule, permission or approval changes.
   ============================================================ */
'use strict';

/* ---------- Sections ---------- */
const CBX = {
  details: ['Course Details', 'The course itself: name, level, awarding body, qualification details, duration and whether it has observations.'],
  curriculum: ['Curriculum & Outcomes', 'Units, modules, Learning Outcomes and assessment criteria, and how each Learning Outcome is assessed.'],
  assessments: ['Assignments & Assessments', 'Written assignments mapped to the knowledge criteria, and the answer keys of each module.'],
  observations: ['Observations', 'Whether learners are observed, where, the criteria assessed at each location and the observation events.'],
  payments: ['Fees & Payments', 'Fee options, payment options and deposit, sent to Finance for approval, and the financial history.'],
  documents: ['Offer Letter & Documents', 'The offer letter learners sign, and the documents they upload for admission.'],
  delivery: ['Resources & Delivery', 'An overview with links — nothing is set here. Learning resources are managed within modules; live sessions are managed within batches.'],
  review: ['Review & Publish', 'Everything still needed before this version can be published, a summary of every section, and publishing.']
};
CB_SECTIONS.splice(0, CB_SECTIONS.length, ...['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'delivery', 'review'].map(k => [k, CBX[k][0]]));
Object.assign(CB_ROUTE, { delivery: ['delivery', 'delivery'], dresources: ['delivery', 'dresources'], library: ['observations', 'obs'] });

/* ---------- Panels ---------- */
const cbxH = (pr, f) => () => { const d = document.createElement('div'); d.innerHTML = f(); return cbHtml(d, pr); };
const _panelsCBX = cbPanels;
cbPanels = function (pr, sec) {
  if (sec === 'delivery') return [['delivery', 'Batches & live sessions', cbxH(pr, () => cbxDelivery(pr))], ['dresources', 'Learning resources (by module)', cbxH(pr, () => cbxResources(pr))]];
  let r = _panelsCBX.apply(this, arguments);
  if (sec === 'observations') {
    const lib = r.find(p => p[0] === 'library'); r = r.filter(p => p[0] !== 'library').map(p => (p[0] === 'obs' ? [p[0], 'Observation settings', () => p[2]() + (lib ? cbxLegacyLink(pr) : '')] : p));
  }
  if (sec === 'payments' && cb8Managed(pr)) {
    const sup = r.find(p => p[0] === 'support'), hist = r.find(p => p[0] === 'payhist');
    if (sup && hist) r = r.filter(p => p[0] !== 'support').map(p => (p[0] === 'payhist' ? [p[0], 'Financial history', () => hist[2]() + `<h3 class="cbx-sub">Legacy observation fee rate</h3>` + sup[2]()] : p));
  }
  return r;
};
CB_ROUTE.support = ['payments', 'support']; // a package programme has no "support" panel: the route opens the first panel (its rate is under Financial history)
// The read-only legacy list was a second copy of a page that has its own menu entry; Observation settings links to it
function cbxLegacyLink(pr) {
  return `<section class="card cbx-legacy"><h2>Legacy shared criteria list</h2><p class="small">This programme's observation criteria are set on <strong>Workplace Observation Criteria</strong> and <strong>Academy Observation Criteria</strong> (from the Observation Criteria Library). The legacy shared list doesn't configure ${esc(pr.title)}; it stays available, read-only here, for reference.</p><div class="row"><button class="btn btn-sm" data-go="k-obslib">Open the legacy shared list</button><button class="btn btn-sm" data-go="k-ocl">Observation Criteria Library</button></div></section>`;
}

/* ---------- Section 7 — Resources & Delivery ---------- */
const cbxBatches = pr => (ADMIN.batches || []).filter(b => b.course === pr.title);
const cbxOverview = what => `<div class="note b-blue cbx-ov" role="note">${ic('info')}<div class="small"><strong>Overview only — nothing to set up here.</strong> ${what}</div></div>`;
function cbxDelivery(pr) {
  const bs = cbxBatches(pr), modes = typeof crModesHtml === 'function' ? crModesHtml(pr) : '—', can = cbAdmin() && pr.status === 'Active' && !cbRetired(pr);
  const rows = bs.map(b => `<tr data-b="${esc(b.code)}"><td><strong>${esc(b.label || b.code)}</strong>${b.label && b.label !== b.code ? `<div class="xs muted mono">${esc(b.code)}</div>` : ''}</td><td>${chip(b.status, b.status === 'Open' || b.status === 'In Progress' ? 'green' : 'grey')}</td><td class="small">${b.start ? fd(b.start) : '—'}</td><td class="small">${esc((typeof crBModes === 'function' ? crBModes(b) : []).join(', ') || '—')}</td><td class="small">${b.enrolled != null ? `${b.enrolled} / ${b.cap || '—'}` : '—'}</td><td><button class="btn btn-sm" data-go="a-batches" data-id="${esc(b.code)}">Open</button></td></tr>`).join('');
  return `${cbxOverview('Delivery modes come from the fee options (Section 5). Live sessions, including Zoom links, are scheduled within each batch. Use the links to open where each is managed.')}<section class="card cbx-modes"><h2>Delivery modes</h2><p class="small">${modes}</p><p class="xs"><button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="payments">Change them in Section 5 — Fees &amp; Payments</button></p></section>
    <section class="card cbx-batches"><div class="row-b"><h2>Batches</h2>${can ? `<button class="btn btn-sm" data-act="newBatch">${ic('plus', 14)}Create batch</button>` : ''}</div>${bs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Batch</th><th>Status</th><th>Start</th><th>Delivery modes</th><th>Learners</th><th><span class="sr">Open</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="small muted">No batches yet.${pr.status === 'Active' ? ' A batch can be created once the course is published.' : ' Batches are created after the course is published.'}</p>`}</section>
    <section class="card cbx-sessions"><h2>Live sessions</h2><p class="small">Live sessions, including their Zoom links, are managed within each batch, not set for the course. Open a batch above to see its sessions, or plan sessions for every batch in Scheduling. Learners see the sessions of their own batch.</p><button class="btn btn-sm" data-go="a-scheduling">Manage sessions in Scheduling</button></section>`;
}
function cbxResources(pr) {
  const R = typeof S4B === 'function' ? S4B().res.filter(r => !r.legacy && r.pid === pr.id) : [];
  const rows = R.map(r => `<tr data-r="${esc(r.id)}"><td><strong>${esc(r.title)}</strong></td><td class="small">${esc(r.type)}</td><td class="small">${esc(typeof s4bMap === 'function' ? s4bMap(r) : '')}</td><td>${chip(r.status, r.status === 'Published' ? 'green' : 'grey')}</td><td class="small">${esc(typeof s4bRelTxt === 'function' ? s4bRelTxt(r) : '—')}</td><td class="small">v${r.version}</td></tr>`).join('');
  return `${cbxOverview('Learning resources are managed within modules, in Learning Resources. This list shows the ones attached to this course.')}<section class="card cbx-res"><div class="row-b"><h2>Learning resources</h2><button class="btn btn-sm" data-go="a-resources">Manage resources by module</button></div><p class="small muted">Files, videos and links attached to this course's modules. Each is managed within its module in Learning Resources; learners see the Published ones of their module, from the release rule on.</p>${R.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Resource</th><th>Type</th><th>Mapped to</th><th>Status</th><th>Release</th><th>Version</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small">No learning resources are mapped to this course yet. Add them in Learning Resources and map them to a module.</p>'}</section>`;
}

/* ---------- Section states on the section bar ---------- */
const cbxLive = x => x && !['Retired', 'Suspended'].includes(x.status);
function cbxState(pr, k, b) {
  const has = re => (b[k] || []).some(h => re.test(h)); if (has(/to fix|blocking|Unsaved|Not applicable|With Finance/)) return '';
  switch (k) {
    case 'details': return pr.title && pr.level ? 'ok' : 'todo';
    case 'curriculum': { const los = (cbTree(pr) || []).filter(cbxLive).flatMap(u => u.mods.filter(cbxLive)).flatMap(m => m.los.filter(cbxLive)); return los.length ? 'ok' : 'todo'; }
    case 'assessments': return cbAsgOf(pr).some(a => a.status === 'Published') ? 'ok' : cbAsgOf(pr).length ? 'draft' : 'opt';
    case 'observations': { const d = typeof n5Shown === 'function' && n5CanView() ? n5Shown(pr) : null; return !d ? '' : d.required === true ? 'ok' : d.required === null ? 'todo' : ''; }
    case 'documents': return typeof chLetters === 'function' ? (chLetters(pr.id).length ? 'ok' : 'todo') : '';
    default: return '';
  }
}
const CBX_TXT = { ok: ['ok', 'Complete'], todo: ['warn', 'Not started'], draft: ['warn', 'In progress'], opt: ['', 'Optional'] };
const _badgesCBX = cbBadges;
cbBadges = function (pr) {
  const b = _badgesCBX.apply(this, arguments);
  if (cbRetired(pr)) return b;
  CB_SECTIONS.forEach(([k]) => { const s = cbxState(pr, k, b); if (s && CBX_TXT[s]) (b[k] = b[k] || []).push(`<span class="cb-badge ${CBX_TXT[s][0]} cbx-st">${CBX_TXT[s][1]}</span>`); });
  return b;
};

/* ---------- The page: step line, description, Back / Next ---------- */
const _pageCBX = cbPage;
cbPage = function (pr, tab) {
  if (tab === 'support' && cb8Managed(pr)) tab = 'payhist'; // a package programme's legacy rate is under Financial history
  const h = _pageCBX.call(this, pr, tab), dv = document.createElement('div'); dv.innerHTML = h;
  const cb = dv.querySelector('.cb'), sec = cb && cb.dataset.sec, i = CB_SECTIONS.findIndex(s => s[0] === sec);
  if (!cb || i < 0) return h;
  const vb = cb.querySelector('.cb-ver'); if (vb) vb.innerHTML = vb.innerHTML.replace(/Section 7/g, 'Section 8 — Review &amp; Publish');
  const t = cb.querySelector('h2.cb-h'); if (t) t.insertAdjacentHTML('afterend', `<p class="small muted cbx-desc"><span class="cbx-step">Step ${i + 1} of ${CB_SECTIONS.length}</span> · ${esc(CBX[sec][1])}</p>`);
  const f = cb.querySelectorAll('.cb-foot button');
  f.forEach(x => { const k = x.dataset.tab, n = CB_SECTIONS.findIndex(s => s[0] === k); if (n < 0) return; x.textContent = n < i ? `← Back: ${CB_SECTIONS[n][1]}` : `Next: ${CB_SECTIONS[n][1]} →`; });
  return dv.innerHTML;
};

/* ---------- Observation events: one settings editor ---------- */
const _evCBX = cbObsEventsPanel;
cbObsEventsPanel = function (pr) {
  const h = _evCBX.apply(this, arguments), dv = document.createElement('div'); dv.innerHTML = h; const c = dv.querySelector('.cb-locs'); if (!c) return h;
  const btn = c.querySelector('[data-act="n5Settings"]'); if (btn) btn.outerHTML = `<button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="obs">Change in Observation settings</button>`;
  const p = c.querySelector('p.xs.muted'); if (p) p.textContent = 'Events can only use the locations permitted in Observation settings. The criteria assessed at each location are on the Workplace and Academy Observation Criteria tabs.';
  return dv.innerHTML;
};

/* ---------- Review & Publish ---------- */
const _whereCBX = cbRvWhere;
cbRvWhere = function (pr, m) {
  const t = String(m);
  if (/Workplace Observation Criteria/.test(t)) return ['observations', 'wpcrit'];
  if (/Academy Observation Criteria/.test(t)) return ['observations', 'offcrit'];
  return _whereCBX.apply(this, arguments);
};
if (typeof CB_RV_SEC !== 'undefined') CB_RV_SEC.splice(0, CB_RV_SEC.length, ...CB_SECTIONS.filter(x => x[0] !== 'review')); // the seven sections reviewed, with their new names
const _sumCBX = cbRvSummary;
cbRvSummary = function (pr, k) {
  if (k !== 'delivery') return _sumCBX.apply(this, arguments);
  const bs = cbxBatches(pr), R = typeof S4B === 'function' ? S4B().res.filter(r => !r.legacy && r.pid === pr.id) : [];
  return cbRvDl([['Delivery modes', typeof crModesHtml === 'function' ? crModesHtml(pr) : '—'], ['Batches', bs.length ? `${plural(bs.length, 'batch', 'batches')} (${bs.filter(b => ['Open', 'In Progress'].includes(b.status)).length} open or running)` : cbRvNone('None yet')], ['Learning resources', R.length ? `${plural(R.length, 'resource')} — ${R.filter(r => r.status === 'Published').length} published` : cbRvNone('None mapped')]]);
};
