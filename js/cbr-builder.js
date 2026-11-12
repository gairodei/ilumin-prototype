/* ============================================================
   CBR — NVQ course builder restructure (6 Nov 2026; PD-CBR-* in PROVISIONAL-DECISIONS.md). Loads after nb1-integrity.js.
   Seven steps, in this order: Course Details · Curriculum & Outcomes · Assessments · Observations (only when the course has
   observations) · Fees & Payment Plans · Offer Letters · Review & Publish. One page per step, no panel tabs. Every control is the
   existing action with its own permission, version gate and audit; this layer adds what the steps need and nothing else:
   - Course Details: learner types (label, delivery mode, displayed completion window, tutoring period, maximum window) and the
     display duration, versioned with the programme (STORE.cbr.cfg[pid][v]). Provisional: recorded for the builder only — not shown to learners and never enforced —
     no access, expiry or payment date reads them. Turning observations off asks first and says what is kept.
   - Curriculum: resources at programme, unit and module level, inside the tree. A placement references the one library record
     (STORE.cbr.att) — the file is never copied; status, versions and release rules stay the library's. Learners of the programme
     see a Published placement in their programme, unit or module group, from its release rule on.
   - Assessments: assessment types (the shared registry), assessments by academic scope (module / unit / whole programme: d.scope,
     additive — older assignments keep their unit-wide criteria), questions with an answer key / assessor guidance (q.key — on the
     definition only; a learner's copy never receives it), and criterion mapping limited to the scope (refused outside it).
   - Observations: Workplace and Academy side by side, each switched on or off (N5a's own fields) and configured below its switch:
     library categories, chosen criteria, "Add criterion" into a category (published as its next library version), the evidence
     this course permits per criterion (d.cbrEv) and guidance for the location (d.cbrGuide) — both frozen with the version.
   - Fees & Payment Plans: the CB8 package unchanged, grouped by learner type, with the total payable per location; class
     entitlement and onboarding per fee option are recorded as provisional (outside the Finance package, never enforced).
   - Offer Letters: the programme letter, or a separate template per learner type (versions in the same list, tagged with the
     type); an applicant gets the version of their type's template that was current when their sign-up started.
   No price, deposit, instalment, issuer, signed letter or learner record is changed. Production must enforce all of it on the server.
   ============================================================ */
'use strict';

/* ---------- Store (created with the rest, so a saved client demo restores with it) ---------- */
const CBR = () => (STORE.cbr = STORE.cbr || { cfg: {}, att: {}, optLt: {}, ent: {}, letter: {}, n: 0 });
const _isCBR = initStore; initStore = function () { STORE.cbr = null; const r = _isCBR.apply(this, arguments); CBR(); return r; };
if (typeof STORE !== 'undefined' && STORE) CBR();
const cbrMe = () => (ADMIN && ADMIN.me ? ADMIN.me.name : '—');
const cbrArch = pr => typeof eArch === 'function' && eArch(pr);
const cbrLive = x => x && x.status !== 'Retired';
const cbrDS = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(' ');
const cbrFold = (cls, title, body, open, id) => `<details class="cbr-fold ${cls}"${id ? ` id="${id}"` : ''}${open ? ' open' : ''}><summary>${title}</summary><div class="cbr-fold-b">${body}</div></details>`;
const cbrNo = (pr, what, why, msg) => { logA('NVQ Programmes', pr ? cbEnt(pr) : '—', 'Blocked: ' + what, '—', '—', why); toast(msg || why, 'err'); return null; };

/* ---------- The seven steps ---------- */
CB_SECTIONS.splice(0, CB_SECTIONS.length, ['details', 'Course Details'], ['curriculum', 'Curriculum & Outcomes'], ['assessments', 'Assessments'], ['observations', 'Observations'], ['payments', 'Fees & Payment Plans'], ['documents', 'Offer Letters'], ['review', 'Review & Publish']);
if (typeof CB_RV_SEC !== 'undefined') CB_RV_SEC.splice(0, CB_RV_SEC.length, ...CB_SECTIONS.filter(x => x[0] !== 'review'));
// Old addresses open the step that now holds them: Resources & Delivery → Curriculum (resources), assessment types → Assessments
Object.assign(CB_ROUTE, { delivery: ['curriculum', 'resources'], dresources: ['curriculum', 'resources'], resources: ['curriculum', 'resources'], types: ['assessments', 'types'], keys: ['assessments', 'keys'], library: ['observations', 'obs'] });
const CBR_HINT = { details: 'Identity, qualification details, learner types and whether the course has observations.', curriculum: 'Units, modules, Learning Outcomes, criteria and the resources at each level.',
  assessments: 'Assessments by academic scope, their questions, answer keys and criterion mapping.', observations: 'Where learners are observed and the criteria for each location.',
  payments: 'Fee options by learner type, observation fees, deposit and payment plans — approved by Finance.', documents: 'The offer letter each learner type signs.', review: 'What is still needed, a summary of every step, and publishing.' };
const cbrObsHidden = pr => !!pr && cbObsNo(pr);
const cbrSteps = pr => CB_SECTIONS.filter(([k]) => k !== 'observations' || !cbrObsHidden(pr));
function cbrRoute(pr, tab) {
  if (tab === 'versions') return ['versions', 'versions'];
  const fb = pr.chNew ? 'details' : 'curriculum', r = CB_ROUTE[tab] || CB_ROUTE[fb];
  let sec = r[0], focus = tab && CB_ROUTE[tab] ? r[1] : null;
  if (sec === 'delivery') { sec = 'curriculum'; focus = 'resources'; }
  if (!CB_SECTIONS.some(s => s[0] === sec)) sec = fb;
  return [sec, focus];
}
// Step references in inherited wording follow the numbering shown (Observations hidden: Fees is step 4)
const cbrRenum = (pr, h) => (cbrObsHidden(pr) ? h.replace(/Section ([5-7])\b/g, (m, n) => 'Section ' + (n - 1)) : h);

/* ---------- Step bar: one compact state per step (from the same checks Review & Publish uses) ---------- */
const CBR_RANK = { bad: 4, warn: 3, ok: 2, '': 1 };
function cbrStateOf(b, k) {
  const d = document.createElement('div'); d.innerHTML = (b[k] || []).join('');
  // a workflow state that explains the step (with Finance, unsaved changes) is shown before a count of items to fix
  let best = null; d.querySelectorAll('.cb-badge').forEach(s => { const c = s.classList.contains('bad') ? 'bad' : s.classList.contains('warn') ? 'warn' : s.classList.contains('ok') ? 'ok' : '', t = s.textContent.trim(), r = /^(With Finance|Unsaved)$/.test(t) ? 5 : CBR_RANK[c]; if (!best || r > best.r) best = { t, c, r }; });
  return best;
}
function cbrStepBar(pr, sec, opts = {}) {
  const steps = opts.steps || cbrSteps(pr), b = opts.badges || (pr ? cbBadges(pr) : {}), i = steps.findIndex(s => s[0] === sec);
  return `<nav class="cbr-steps cb-nav" aria-label="Course builder steps"><ol>${steps.map(([k, l], n) => {
    const s = opts.lock ? { t: n ? 'After saving' : 'Not saved', c: '' } : pr && cbRetired(pr) ? null : cbrStateOf(b, k), cur = k === sec; // retired: the note above says it is read-only
    const attrs = opts.lock ? (n ? 'disabled aria-disabled="true" title="Save Course Details first"' : 'aria-current="step"') : `data-go="a-programmes" data-id="${pr.id}" data-tab="${k}"${cur ? ' aria-current="step"' : ''}`;
    return `<li><button class="cbr-st cb-sec${cur ? ' cur' : ''}${!cur && n < i ? ' past' : ''}" data-tab="${k}" ${attrs}><span class="cbr-n cb-n" aria-hidden="true">${n + 1}</span><span class="cbr-t"><span class="cbr-l cb-l">${esc(l)}</span>${s ? `<span class="cbr-s cb-badge ${s.c}">${esc(s.t)}</span>` : ''}</span><span class="sr">${cur ? ' (current step)' : ''}${s ? ' — ' + esc(s.t) : ''}</span></button></li>`;
  }).join('')}</ol></nav>`;
}

/* ---------- The page ---------- */
function cbrWrap(pr, html) {
  const d = document.createElement('div'); d.innerHTML = html;
  // Audit tables are kept, folded away under the step
  d.querySelectorAll('section.card').forEach(s => { const h = s.querySelector(':scope > .row-b > h3'), t = s.querySelector(':scope > .row-b > .xs.muted'); if (!h || !t || !/Tamper-evident/.test(t.textContent) || s.closest('details.cbr-fold')) return; const f = document.createElement('details'); f.className = 'cbr-fold cbr-audit'; f.innerHTML = `<summary>${esc(h.textContent)}</summary>`; s.replaceWith(f); f.appendChild(s); });
  d.querySelectorAll('.cb-home, .cbx-desc, .cbx-ov').forEach(n => n.remove());
  if (cbrArch(pr)) cbReadOnly(d);
  return cbHtml(d, pr);
}
function cbrBody(pr, sec, focus) {
  switch (sec) {
    case 'details': return cbrDetailsBody(pr);
    case 'curriculum': return cbrCurBody(pr, focus);
    case 'assessments': return cbrAsgBody(pr, focus);
    case 'observations': return cbrObsBody(pr, focus);
    case 'payments': return cbrFeeBody(pr, focus);
    case 'documents': return cbrDocBody(pr, focus);
    case 'review': { const p = cbPanels(pr, 'review'); return p.length ? p[0][2]() : ''; }
    case 'versions': { const p = cbPanels(pr, 'versions'); return p.length ? p[0][2]() : ''; }
  }
  return '';
}
cbPage = function (pr, tab) {
  CB_DIRTY = null;
  const [sec, focus] = cbrRoute(pr, tab), steps = cbrSteps(pr), i = steps.findIndex(s => s[0] === sec), dv = cbDraftV(pr);
  const chips = `${chip(pr.status, { Active: 'green', Draft: 'amber', Suspended: 'amber', Retired: 'grey', Archived: 'grey' }[pr.status] || 'grey')}<span class="typebadge">Version ${pr.version}</span>${dv && pr.status !== 'Draft' ? chip('Version ' + dv + ' draft', 'amber') : ''}<button class="btn btn-sm cb-vh" data-go="a-programmes" data-id="${pr.id}" data-tab="versions">${ic('layers', 14)}Version history</button>`;
  const sub = `${esc(pr.level)} · ${pr.ref ? `${M_ABC} <span class="mono cb-abcode">${esc(pr.ref)}</span>` : '<span class="mono">—</span>'}`;
  const ver = cbRetired(pr) ? cbHistNote(pr) : cbVerBar(pr, sec);
  const hidden = sec === 'observations' && i < 0;
  const title = sec === 'versions' ? `<div class="row-b cb-sh"><h2 class="cb-h">Version history</h2><button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="${pr.chNew ? 'details' : 'curriculum'}">Back to the course builder</button></div>`
    : `<div class="cbr-head"><h2 class="cb-h"><span class="cb-hn">${hidden ? '–' : i + 1}</span> ${esc((CB_SECTIONS.find(s => s[0] === sec) || [sec, sec])[1])}</h2><p class="small muted cbr-hint">${hidden ? 'Not part of this course: Course Details says it has no observations.' : `Step ${i + 1} of ${steps.length} · ${esc(CBR_HINT[sec] || '')}`}</p></div>`;
  let body = cbrWrap(pr, cbrBody(pr, sec, focus));
  const prev = i > 0 ? steps[i - 1] : null, next = i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
  const mid = sec === 'details' && cbDetEditable(pr) ? `<span class="row cbr-save"><button class="btn" data-act="cbDetSave" data-id="${pr.id}">Save draft</button></span>` : sec === 'review' || sec === 'versions' ? '' : cbrSaved(pr, sec);
  const foot = sec === 'versions' ? '' : `<div class="row-b cb-foot cbr-foot">${prev ? `<button class="btn" data-go="a-programmes" data-id="${pr.id}" data-tab="${prev[0]}">← Back: ${esc(prev[1])}</button>` : '<span></span>'}${mid}${next ? (sec === 'details' && cbDetEditable(pr) ? `<button class="btn btn-primary" data-act="cbrDetNext" data-id="${pr.id}" data-next="${next[0]}">${CB_CACHE[pr.id] ? 'Save and continue →' : `Next: ${esc(next[1])} →`}</button>` : `<button class="btn btn-primary" data-go="a-programmes" data-id="${pr.id}" data-tab="${next[0]}">Next: ${esc(next[1])} →</button>`) : '<span></span>'}</div>`;
  const label = sec === 'versions' ? 'Version history' : (CB_SECTIONS.find(s => s[0] === sec) || [sec, sec])[1];
  return cbrRenum(pr, `${pageA(esc(pr.title), sub, chips, [['NVQ Programmes', 'a-programmes'], [esc(pr.title)]])}
    <div class="cb cbr" data-pid="${pr.id}" data-sec="${sec}"><div class="cb-ver">${ver}</div>${sec === 'versions' ? '' : cbrStepBar(pr, sec, { steps })}${title}<div class="cb-body" data-label="${esc(label)}" data-panel="${esc(focus || ((cbPanels(pr, sec)[0] || [])[0]) || sec)}">${body}</div>${foot}</div>`);
};
// Where changes go, said once in the footer (they are saved as they are made — there is no separate save on these steps)
function cbrSaved(pr, sec) {
  if (cbRetired(pr)) return '<span class="xs muted cbr-saved">Read-only — retired</span>';
  if (cbrArch(pr)) return '<span class="xs muted cbr-saved">Read-only — archived</span>';
  const dv = cbDraftV(pr);
  // CBC4: a published programme's fees are changed through a new package for Finance, not a new version
  if (!dv && sec === 'payments' && pr.status !== 'Draft' && typeof cb8Managed === 'function' && cb8Managed(pr)) return '<span class="xs muted cbr-saved">Fee changes go to Finance for approval; learners keep their terms until then</span>'; return `<span class="xs muted cbr-saved">${dv ? `${ic('check', 12)} Changes are saved to Version ${dv} (draft) as you make them` : `Version ${pr.version} is published — create a new version to change it`}</span>`;
}
// Course Details' Next: saves first when something was typed (the existing save and its checks), otherwise just moves on
ACT.cbrDetNext = el => { const pr = cbPr(el.dataset.id); if (!pr) return; if (CB_CACHE[pr.id]) return ACT.cbDetSave({ dataset: { id: pr.id, next: el.dataset.next } }); CB_DIRTY = null; go('a-programmes', { id: pr.id, tab: el.dataset.next }); };
// The unsaved new course: the same step bar, locked until Course Details is saved
const _pbCBR = progBuilder;
progBuilder = function (id) {
  const h = _pbCBR.apply(this, arguments); if (id !== 'new' || !/class="cb-nav"/.test(h)) return h;
  const d = document.createElement('div'); d.innerHTML = h; const n = d.querySelector('nav.cb-nav'); if (n) n.outerHTML = cbrStepBar(null, 'details', { steps: CB_SECTIONS, lock: true });
  return d.innerHTML;
};

/* ---------- Step 1 — Course Details: the existing form, plus learner types and the display duration ---------- */
// The delivery configuration of a version: { types: [...], disp: { n, unit } | null }. Edited only in a draft; a version without its own
// record shows the nearest earlier one; a programme without any shows the delivery modes of its fee options (not yet configured).
const CBR_UNITS = [['weeks', 'weeks'], ['months', 'months']];
const cbrCfgV = pr => (!pr || cbRetired(pr) || cbrArch(pr) ? null : pr.status === 'Draft' ? pr.version || 1 : cbDraftV(pr));
function cbrCfgOf(pr, v) {
  const m = CBR().cfg[pr.id] || {}; v = v || cbrCfgV(pr) || pr.version;
  for (let k = v; k >= 1; k--) if (m[k]) return { c: m[k], v: k, own: k === v };
  return null;
}
function cbrDerived(pr) {
  const P = typeof cb8Work === 'function' && cb8Managed(pr) ? cb8Work(pr) : null, opts = P ? P.opts : typeof r1Opts === 'function' ? r1Opts(pr.id).map(o => ({ ...o, mode: o.legacy ? null : o.mode })) : [];
  return (typeof M_MODES !== 'undefined' ? M_MODES : R1_MODES).filter(m => opts.some(o => o.status === 'Active' && o.mode === m)).map(m => ({ id: 'D-' + m.replace(/\W/g, ''), label: m, mode: m, derived: true, status: 'Active' }));
}
// The learner types in effect for a version (the draft while there is one)
const cbrTypesAll = (pr, v) => { const c = cbrCfgOf(pr, v); return c ? c.c.types : cbrDerived(pr); };
const cbrTypes = (pr, v) => cbrTypesAll(pr, v).filter(t => t.status !== 'Retired');
const cbrPer = p => (p && p.n ? `${p.n} ${p.n === 1 ? p.unit.replace(/s$/, '') : p.unit}` : null);
const cbrPerW = p => (p && p.n ? (p.unit === 'weeks' ? p.n : p.n * 4.345) : null);
const cbrLtTxt = t => `${t.label} · ${t.mode} · shown ${cbrPer(t.win) || 'not set'} · tutoring ${cbrPer(t.tut) || 'not set'} · maximum ${cbrPer(t.max) || 'not set'}${t.status === 'Retired' ? ' · retired' : ''}`;
// A change to the delivery configuration: role, programme state and an editable draft version
function cbrCfgGate(el, what) {
  const pr = cbPr(el && el.dataset && el.dataset.p);
  if (!pr) { toast('Programme not found.', 'err'); return null; }
  if (!cbAdmin()) { s3Refuse(what, cbEnt(pr)); return null; }
  if (cbRetired(pr)) return cbrNo(pr, what, 'Programme retired', 'This programme is retired, so it is read-only.');
  if (cbrArch(pr)) return cbrNo(pr, what, 'Programme archived', 'This programme is archived, so it is read-only.');
  const v = cbrCfgV(pr); if (!v) return cbrNo(pr, what, `Version ${pr.version} is published`, `Version ${pr.version} is published and can't be changed. Create a new version first.`);
  return { pr, v };
}
function cbrCfgW(pr, v) {
  const m = CBR().cfg[pr.id] = CBR().cfg[pr.id] || {}; if (m[v]) return m[v];
  const base = cbrCfgOf(pr, v);
  m[v] = base ? { ...JSON.parse(JSON.stringify(base.c)), from: base.v, at: now().toISOString(), by: cbrMe() } : { types: cbrDerived(pr).map(t => ({ ...t, derived: undefined, win: null, tut: null, max: null })), disp: null, from: null, at: now().toISOString(), by: cbrMe() };
  m[v].types.forEach(t => delete t.derived); return m[v];
}
const cbrPerField = (id, lab, p, hint) => `<div class="field cbr-per"><label for="${id}-n">${lab}</label><div class="row cbr-per-r"><input class="input num" type="number" min="1" max="60" step="1" inputmode="numeric" id="${id}-n" value="${p && p.n ? p.n : ''}"><select class="select" id="${id}-u" aria-label="${esc(lab)} unit">${CBR_UNITS.map(([k, l]) => `<option value="${k}" ${(p ? p.unit : 'months') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
function cbrPerRead(id, lab) {
  const s = mval('#' + id + '-n'); if (s === '') return { v: null };
  if (!/^\d{1,2}$/.test(s) || +s < 1 || +s > 60) return { err: [`#${id}-n`, `Enter ${lab.toLowerCase()} as a whole number from 1 to 60, or leave it blank`] };
  return { v: { n: +s, unit: mval('#' + id + '-u') === 'weeks' ? 'weeks' : 'months' } };
}
ACT.cbrLt = el => {
  const g = cbrCfgGate(el, el.dataset.t ? 'change a learner type' : 'add a learner type'); if (!g) return; const { pr, v } = g, cur = el.dataset.t ? cbrTypesAll(pr, v).find(t => t.id === el.dataset.t) : null;
  if (el.dataset.t && !cur) { toast('Learner type not found.', 'err'); return; }
  openModal({ title: (cur ? 'Edit learner type' : 'Add learner type') + ' — Version ' + v, size: 'lg', body: `<div class="form-grid">
    <div class="field"><label for="lt-l">Label</label><input class="input" id="lt-l" maxlength="60" value="${esc(cur ? cur.label : '')}" placeholder="e.g. Self-Paced"></div>
    <div class="field"><label for="lt-m">Delivery mode</label><select class="select" id="lt-m">${cur ? '' : '<option value="">Choose…</option>'}${R1_MODES.map(m => `<option ${cur && cur.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select><span class="hint">Fee options with this delivery mode are offered to this learner type.</span></div>
    ${cbrPerField('lt-w', 'Completion window to display', cur && cur.win, 'Recorded for when it is confirmed; learners don\'t see it yet.')}${cbrPerField('lt-t', 'Tutoring period', cur && cur.tut)}${cbrPerField('lt-x', 'Maximum permitted completion window', cur && cur.max, 'Optional.')}</div>
    <p class="xs muted">${ic('info', 12)} Provisional until the client confirms these periods: they are recorded with this version only. Learners don't see them, and no access, expiry, tutoring or payment date uses them.</p>`,
    actions: [{ label: 'Cancel' }, { label: cur ? 'Save learner type' : 'Add learner type', cls: 'btn-primary', fn: () => {
      const g2 = cbrCfgGate(el, cur ? 'change a learner type' : 'add a learner type'); if (!g2 || g2.v !== v) { closeModal(); return false; }
      const label = mval('#lt-l').replace(/\s+/g, ' '), mode = mval('#lt-m');
      if (!label) return fieldErr('#lt-l', 'Enter a label'), false;
      if (cbrTypes(pr, v).some(t => t.id !== (cur && cur.id) && t.label.toLowerCase() === label.toLowerCase())) return fieldErr('#lt-l', 'Another learner type has this label'), false;
      if (!R1_MODES.includes(mode)) return fieldErr('#lt-m', 'Choose the delivery mode'), false;
      const p = {}; for (const [k, id, lab] of [['win', 'lt-w', 'The displayed completion window'], ['tut', 'lt-t', 'The tutoring period'], ['max', 'lt-x', 'The maximum window']]) { const r = cbrPerRead(id, lab); if (r.err) return fieldErr(...r.err), false; p[k] = r.v; }
      if (p.max && p.win && cbrPerW(p.max) < cbrPerW(p.win)) return fieldErr('#lt-x-n', 'The maximum window can\'t be shorter than the displayed completion window'), false;
      const W = cbrCfgW(pr, v);
      if (cur) { const t = W.types.find(x => x.id === cur.id) || W.types.find(x => x.label === cur.label && x.mode === cur.mode), was = cbrLtTxt(t); Object.assign(t, { label, mode }, p); if (cbrLtTxt(t) === was) { toast('Nothing has changed.', 'info'); return false; } logA('NVQ Programmes', cbEnt(pr), 'Learner type changed', was, cbrLtTxt(t), `Version ${v} (draft) — Course Details`); }
      else { const t = { id: 'LT-' + (++CBR().n), label, mode, ...p, status: 'Active' }; W.types.push(t); logA('NVQ Programmes', cbEnt(pr), 'Learner type added', '—', `${t.id} · ${cbrLtTxt(t)}`, `Version ${v} (draft) — Course Details`); }
      render(); toast(`Saved in Version ${v} (draft).`);
    } }] });
};
ACT.cbrLtState = el => {
  const g = cbrCfgGate(el, 'retire a learner type'); if (!g) return; const { pr, v } = g, W = cbrCfgW(pr, v), t = W.types.find(x => x.id === el.dataset.t); if (!t) return;
  const to = t.status === 'Retired' ? 'Active' : 'Retired';
  if (to === 'Retired' && cbrTypes(pr, v).length === 1) { toast('A course needs at least one learner type.', 'err'); return; }
  t.status = to; logA('NVQ Programmes', cbEnt(pr), to === 'Retired' ? 'Learner type retired' : 'Learner type restored', to === 'Retired' ? 'Active' : 'Retired', `${t.id} · ${t.label}`, `Version ${v} (draft) — Course Details`); render();
};
ACT.cbrDisp = el => {
  const g = cbrCfgGate(el, 'change the display duration'); if (!g) return; const { pr, v } = g, c = cbrCfgOf(pr, v), cur = c ? c.c.disp : null;
  openModal({ title: 'Display Duration — Version ' + v, body: `${cbrPerField('cd', 'Display Duration', cur, `Shown to learners. Payments use the Payment Schedule Duration (${esc(pr.durV ? e1DurFmt(pr.durV) : 'not set')}), which isn't changed here.`)}`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      const r = cbrPerRead('cd', 'The display duration'); if (r.err) return fieldErr(...r.err), false;
      const W = cbrCfgW(pr, v), was = cbrPer(W.disp) || '—', now_ = cbrPer(r.v) || '—'; if (was === now_) { toast('Nothing has changed.', 'info'); return false; }
      W.disp = r.v; logA('NVQ Programmes', cbEnt(pr), 'Display duration changed', was, now_, `Version ${v} (draft) — Course Details`); render(); toast('Saved.');
    } }] });
};
function cbrDeliveryCard(pr) {
  const v = cbrCfgV(pr), c = cbrCfgOf(pr), ed = !!v && cbAdmin(), all = c ? c.c.types : cbrDerived(pr), P = `data-p="${pr.id}"`;
  const from = !c ? (all.length ? 'Not configured yet — shown from the delivery modes of the fee options.' : 'Not configured yet.') : !c.own && v ? `Copied from Version ${c.v} when you change it.` : '';
  const rows = all.map(t => `<tr data-t="${esc(t.id)}"${t.status === 'Retired' ? ' class="cbr-ret"' : ''}><td><strong>${esc(t.label)}</strong>${t.status === 'Retired' ? ' ' + chip('Retired', 'grey') : ''}</td><td>${esc(t.mode)}</td><td>${esc(cbrPer(t.win) || '—')}</td><td>${esc(cbrPer(t.tut) || '—')}</td><td>${esc(cbrPer(t.max) || '—')}</td>${ed ? `<td class="nowrap">${t.derived ? `<button class="btn btn-sm btn-ghost" data-act="cbrLt" ${P} data-t="${esc(t.id)}">Edit</button>` : `<button class="btn btn-sm btn-ghost" data-act="cbrLt" ${P} data-t="${esc(t.id)}">Edit</button><button class="btn btn-sm btn-ghost" data-act="cbrLtState" ${P} data-t="${esc(t.id)}">${t.status === 'Retired' ? 'Restore' : 'Retire'}</button>`}</td>` : ''}</tr>`).join('');
  return `<section class="card cbr-deliv"><div class="row-b"><h2>Learner types</h2>${ed ? `<button class="btn btn-sm" data-act="cbrLt" ${P}>${ic('plus', 14)}Add learner type</button>` : ''}</div>
    <p class="xs muted">One curriculum and the same assessment requirements for every type. ${from} <span class="cbr-prov">Provisional</span> periods are recorded only: learners don't see them and nothing enforces them.</p>
    ${all.length ? `<div class="tbl-wrap"><table class="tbl dense cbr-lt"><thead><tr><th>Learner type</th><th>Delivery mode</th><th>Completion window (to display)</th><th>Tutoring period</th><th>Maximum window</th>${ed ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small muted">No learner types yet.</p>'}
    <dl class="kv cbr-disp"><dt>Display Duration</dt><dd>${esc(cbrPer(c && c.c.disp) || 'Not set')} <span class="xs muted">shown to learners; payments use the Payment Schedule Duration (${esc(pr.durV ? e1DurFmt(pr.durV) : 'not set')})</span>${ed ? ` <button class="btn btn-sm btn-ghost" data-act="cbrDisp" ${P}>Edit</button>` : ''}</dd></dl></section>`;
}
function cbrDetailsBody(pr) {
  const p = cbPanels(pr, 'details'), d = document.createElement('div'); d.innerHTML = p.length ? p[0][2]() : '';
  d.querySelectorAll('.cb-det-acts').forEach(n => n.remove()); // Save draft / Save and continue are in the step footer
  // the observation answer's own wording: the Observations step is hidden, not "Section 4"
  d.querySelectorAll('.cb-obs-opt .small.muted').forEach(n => { n.textContent = /^Learners are observed/.test(n.textContent) ? 'Learners are observed. The Observations step is set up before publishing.' : 'No observations: the Observations step is hidden and no observation fee is asked for.'; });
  return d.innerHTML + cbrDeliveryCard(pr);
}
// Course Details read-only view: the display duration sits with the duration
const _viewCBR = cbDetailsView;
cbDetailsView = function (pr) { const h = _viewCBR.apply(this, arguments), c = pr && cbrCfgOf(pr); return c && c.c.disp ? h.replace('<dt>Description</dt>', `<dt>Display Duration</dt><dd>${esc(cbrPer(c.c.disp))}</dd><dt>Description</dt>`) : h; };

/* ---------- Observations Yes → No: say what is kept, then save ---------- */
function cbrObsImpact(pr) {
  const d = typeof n5Shown === 'function' ? n5Shown(pr) : null; if (!d) return [];
  const o = typeof ol1Cfg === 'function' ? ol1Cfg(d) : { wp: [], off: { add: [] } }, out = [];
  if (d.workplace === 'Permitted') out.push('Workplace observation is switched on');
  if (d.office === 'Available') out.push('Academy observation is switched on');
  if (o.wp.length + o.off.add.length) out.push(plural(o.wp.length + o.off.add.length, 'library category is', 'library categories are') + ' selected');
  if (cbEvOf(d).length) out.push(plural(cbEvOf(d).length, 'observation event is', 'observation events are') + ' set');
  if (d.ia.some(c => c.status === 'Active')) out.push(plural(d.ia.filter(c => c.status === 'Active').length, 'Academy standard is', 'Academy standards are') + ' set');
  return out;
}
['cbDetSave', 'cbObsSave'].forEach(n => {
  const f = ACT[n]; if (typeof f !== 'function') return;
  ACT[n] = function (el) {
    const pr = cbPr(el && el.dataset && el.dataset.id), o = ($('main input[name="np-obs"]:checked') || {}).value, imp = pr && o === 'no' && !(el.dataset && el.dataset.cbrOk) && cbObsOf(pr) === true ? cbrObsImpact(pr) : [];
    if (!imp.length) return f.apply(this, arguments);
    confirmDlg({ title: 'Turn observations off for this version?', ok: 'Turn observations off', cancel: 'Keep observations', danger: true, body: `<p class="small">This draft has observation configuration:</p><ul class="small">${imp.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small">Nothing is deleted: the configuration is kept with the draft and comes back if you answer Yes again. Published versions and learners' observation records don't change. The Observations step is hidden and no observation fee applies.</p>`,
      onOk: () => { closeModal(); f.call(this, { dataset: { ...el.dataset, cbrOk: '1' } }); } });
  };
});


/* ---------- Step 2 — Curriculum & Outcomes: resources in their academic context ----------
   A placement { id, rid, lvl: 'prog' | 'unit' | 'mod', unit, mod } references one library record; it is never a copy. A module's own
   resources (the library's programme + module) are shown on the module as before. A resource created here at programme or unit level
   is anchored to a module of that scope in the library (its record needs one) and is placed by the curriculum only (r.cbrHome). */
const cbrAtts = pid => (CBR().att[pid] = CBR().att[pid] || []);
const cbrAttsLive = pid => cbrAtts(pid).filter(a => a.status === 'Active');
const cbrWhere = (lvl, unit, mod) => (lvl === 'prog' ? 'the whole programme' : lvl === 'unit' ? `unit ${unit}` : `module ${unit} ${mod}`);
const cbrResCan = pr => !!pr && !cbRetired(pr) && !cbrArch(pr) && typeof s4bAdmin === 'function' && s4bAdmin();
function cbrResAt(pr, lvl, unit, mod) {
  const out = cbrAttsLive(pr.id).filter(a => a.lvl === lvl && (lvl === 'prog' || a.unit === unit) && (lvl !== 'mod' || a.mod === mod)).map(a => ({ r: s4bRes(a.rid), a })).filter(x => x.r);
  if (lvl === 'mod') S4B().res.filter(r => !r.legacy && !r.cbrHome && r.pid === pr.id && r.unit === unit && r.mod === mod).forEach(r => out.unshift({ r, home: true }));
  return out;
}
function cbrResBlock(pr, lvl, unit, mod, ed) {
  const items = cbrResAt(pr, lvl, unit, mod), P = cbrDS({ p: pr.id, lvl, u: unit, m: mod });
  const li = ({ r, a, home }) => `<li class="cbr-ri" data-r="${esc(r.id)}"><span class="cbr-rt">${esc(r.title)}</span><span class="xs muted">${esc(r.type)} · v${r.version}${r.rel && r.rel.k !== 'now' ? ' · ' + esc(s4bRelTxt(r)) : ''}</span>${chip(r.status, r.status === 'Published' ? 'green' : r.status === 'Draft' ? 'amber' : 'grey')}<button class="btn btn-sm btn-ghost" data-act="s4bPrev" data-id="${esc(r.id)}" aria-label="Preview ${esc(r.title)}">Preview</button>${ed && r.status === 'Draft' ? `<button class="btn btn-sm btn-ghost" data-act="s4bPub" data-id="${esc(r.id)}">Publish</button>` : ''}${ed && a ? `<button class="btn btn-sm btn-ghost" data-act="cbrResRm" ${cbrDS({ p: pr.id, a: a.id })} aria-label="Remove ${esc(r.title)} from ${esc(cbrWhere(lvl, unit, mod))}">Remove</button>` : ''}${home ? '<span class="xs muted" title="Mapped to this module in Learning Resources">module resource</span>' : ''}</li>`;
  return `<div class="cbr-res" data-lvl="${lvl}"${unit ? ` data-u="${esc(unit)}"` : ''}${mod ? ` data-m="${esc(mod)}"` : ''}><span class="cbr-res-h">${{ prog: 'Programme resources', unit: 'Unit resources', mod: 'Module resources' }[lvl]}</span>${items.length ? `<ul class="cbr-res-l">${items.map(li).join('')}</ul>` : '<span class="xs muted cbr-res-none">None</span>'}${ed ? `<span class="cbr-res-a"><button class="btn btn-sm btn-ghost" data-act="cbrResAdd" ${P}>${ic('plus', 13)}Add from library</button><button class="btn btn-sm btn-ghost" data-act="cbrResNew" ${P}>${ic('plus', 13)}New resource</button></span>` : ''}</div>`;
}
function cbrCurBody(pr, focus) {
  const p = cbPanels(pr, 'curriculum'), st = p.find(x => x[0] === 'structure') || p[0], d = document.createElement('div'); d.innerHTML = st ? st[2]() : '';
  const sel = cbCurSel(pr), tree = sel ? cbTree(pr, sel) || [] : [], ed = cbrResCan(pr), cur = d.querySelector('section.cb-cur');
  d.querySelectorAll('section.cb-cur > p.xs.muted:last-child').forEach(n => { if (/Observation criteria are assessed only by observation/.test(n.textContent)) n.remove(); });
  if (cur) {
    cur.querySelectorAll('.cb-cur-lo > .cb-cur-loh > .cb-cur-t').forEach(t => t.insertAdjacentHTML('afterbegin', '<span class="xs muted cbr-lvl">Learning Outcome</span> '));
    cur.querySelectorAll('.cb-cur-lo > ul.cb-cur-crit').forEach(u => u.insertAdjacentHTML('beforebegin', '<span class="xs muted cbr-lvl cbr-lvl-c">Criteria</span>'));
    const anchor = cur.querySelector('.cb-cur-sum') || cur.querySelector('.cb-cur-where') || cur.querySelector('.row-b');
    const orphans = cbrAttsLive(pr.id).filter(a => a.lvl !== 'prog' && !tree.some(u => u.code === a.unit && (a.lvl === 'unit' || u.mods.some(m => m.code === a.mod))));
    const box = document.createElement('div'); box.className = 'cbr-res-prog'; box.id = 'cbr-resources';
    box.innerHTML = cbrResBlock(pr, 'prog', null, null, ed) + (orphans.length ? `<p class="xs cbr-orph">${ic('alert', 12)} ${plural(orphans.length, 'placement refers', 'placements refer')} to a unit or module that isn't in Version ${sel}: ${esc(orphans.map(a => (s4bRes(a.rid) || {}).title + ' → ' + cbrWhere(a.lvl, a.unit, a.mod)).join('; '))}. Learners on other versions keep seeing them where their structure has it.</p>` : '');
    if (anchor) anchor.after(box); else cur.prepend(box);
    cur.querySelectorAll('details[data-cbu]').forEach(du => {
      const u = tree.find(x => x.code === du.dataset.cbu); if (!u) return; const kids = du.querySelector(':scope > .kids'); if (!kids) return;
      kids.insertAdjacentHTML('afterbegin', cbrResBlock(pr, 'unit', u.code, null, ed));
      kids.querySelectorAll(':scope > details.cb-cur-m').forEach((dm, i) => { const m = u.mods[i], k2 = dm.querySelector(':scope > .kids'); if (!m || !k2) return; dm.dataset.cbm = m.code; const row = k2.querySelector(':scope > .cb-cur-mod'); const h = cbrResBlock(pr, 'mod', u.code, m.code, ed); if (row) row.insertAdjacentHTML('afterend', h); else k2.insertAdjacentHTML('afterbegin', h); });
    });
  }
  return d.innerHTML;
}
// Library choices for a placement: every current resource that isn't already at this point
ACT.cbrResAdd = el => {
  const pr = cbPr(el.dataset.p), x = el.dataset; if (!pr) return;
  if (!cbrResCan(pr)) return s4bRefuse('Learning Resources', cbEnt(pr), 'place resources in the curriculum');
  const here = new Set(cbrResAt(pr, x.lvl, x.u, x.m).map(i => i.r.id)), L = S4B().res.filter(r => !r.legacy && r.status !== 'Retired' && !here.has(r.id));
  openModal({ title: 'Add from library — ' + esc(cbrWhere(x.lvl, x.u, x.m)), size: 'lg', body: `<div class="field"><label for="cbr-rq">Search</label><input class="input" type="search" id="cbr-rq" data-oninput="ol1Find" placeholder="Title or type…"></div>
    ${L.length ? `<fieldset class="field n5-fs cbr-pick"><legend class="lbl">Resources in the library</legend>${L.map(r => `<label class="check" data-ol1s="${esc(r.title + ' ' + r.type + ' ' + s4bMap(r))}"><input type="checkbox" class="cbr-rp" value="${esc(r.id)}"><span><strong>${esc(r.title)}</strong> <span class="xs muted">${esc(r.type)} · ${esc(r.status)} · v${r.version} · ${esc(s4bProgShort(r.pid))}</span></span></label>`).join('')}</fieldset>` : '<p class="small muted">Every library resource is already here.</p>'}
    <p class="xs muted">The same record is used wherever it is placed — the file isn't copied. Its status, versions and release rule stay as set in Learning Resources.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Add', cls: 'btn-primary', fn: () => {
      if (!cbrResCan(pr)) { closeModal(); return s4bRefuse('Learning Resources', cbEnt(pr), 'place resources in the curriculum'); }
      const ids = $$('#modal-root .cbr-rp:checked').map(e => e.value); if (!ids.length) return fieldErr('#cbr-rq', 'Tick at least one resource'), false;
      ids.forEach(rid => { const r = s4bRes(rid); const a = { id: 'RA-' + (++CBR().n), rid, lvl: x.lvl, unit: x.lvl === 'prog' ? null : x.u, mod: x.lvl === 'mod' ? x.m : null, status: 'Active', at: now().toISOString(), by: cbrMe() }; cbrAtts(pr.id).push(a); logA('Learning Resources', `${r.title} (${r.id})`, 'Resource placed in the curriculum', '—', `${pr.title} — ${cbrWhere(a.lvl, a.unit, a.mod)}`, 'Course builder — Curriculum'); });
      s4bSyncAll(); render(); toast(`${plural(ids.length, 'resource')} added to ${cbrWhere(x.lvl, x.u, x.m)}.`);
    } }] });
};
ACT.cbrResNew = el => {
  const pr = cbPr(el.dataset.p), x = el.dataset; if (!pr) return;
  if (!cbrResCan(pr) || !s4bCanRes('add', null, pr.id)) return s4bRefuse('Learning Resources', cbEnt(pr), 'add resources');
  const tree = (cbTree(pr) || []).filter(cbrLive), u = x.lvl === 'prog' ? tree.find(y => y.mods.some(cbrLive)) : tree.find(y => y.code === x.u), m = x.lvl === 'mod' ? (u && u.mods.find(y => y.code === x.m)) : u && u.mods.find(cbrLive);
  if (!u || !m) { toast('Add a module first: every resource record belongs to a module in Learning Resources.', 'err'); return; }
  setUi('s4bFile', '');
  openModal({ title: 'New resource — ' + esc(cbrWhere(x.lvl, x.u, x.m)), size: 'lg', body: `<div class="form-grid"><div class="field full"><label for="rs-t">Title</label><input class="input" id="rs-t"></div><div class="field full"><label for="rs-d">Description</label><input class="input" id="rs-d"></div>
    <div class="field"><label for="rs-y">Type</label><select class="select" id="rs-y">${S4B_TYPES.map(t => `<option>${t}</option>`).join('')}</select><span class="hint">SCORM packages are recorded and listed; this prototype doesn't play or track them.</span></div><div class="field"><label for="rs-u">Link (Vimeo video or link)</label><input class="input" id="rs-u" placeholder="https://"></div>
    <div class="field full"><label for="rs-f">File (PDF, DOCX, PPT or SCORM .zip)</label><input class="input" type="file" id="rs-f" data-onchange="s4bFile"><span class="hint"><span id="rs-fn">No file chosen</span> — the file name is recorded; the file itself is simulated.</span><button type="button" class="linklike small" data-act="s4bSample">Prototype: use a sample file</button></div>
    <fieldset class="stack full" style="border:0;padding:0"><legend class="lbl">Release</legend><label class="check"><input type="radio" name="rs-k" value="now" checked> Immediately</label><label class="check"><input type="radio" name="rs-k" value="date"> On a date</label><div class="field"><label for="rs-dt">Release date</label><input class="input" type="date" id="rs-dt" value="${D(7).slice(0, 10)}"></div></fieldset></div>
    <p class="small muted">Saved as a Draft in Learning Resources and placed on ${esc(cbrWhere(x.lvl, x.u, x.m))}. Publish it here or in Learning Resources; learners see it from its release on.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Save as Draft', cls: 'btn-primary', fn: () => {
      if (!cbrResCan(pr) || !s4bCanRes('add', null, pr.id)) { closeModal(); return s4bRefuse('Learning Resources', cbEnt(pr), 'add resources'); }
      const t = mval('#rs-t'), k = ($('#modal-root input[name="rs-k"]:checked') || {}).value; if (!t) return fieldErr('#rs-t', 'Enter a title'), false;
      if (k === 'date' && !mval('#rs-dt')) return fieldErr('#rs-dt', 'Choose a release date'), false;
      const type = mval('#rs-y'), ref = s4bRef(type); if (ref.err) return fieldErr(...ref.err), false;
      const S_ = S4B(), id = 'RS-' + (S_.n++), at = now().toISOString(), by = s4bWho(), rel = k === 'date' ? { k, date: new Date(mval('#rs-dt') + 'T08:00:00Z').toISOString() } : { k: 'now' };
      const r = { id, title: t, desc: mval('#rs-d'), pid: pr.id, unit: u.code, mod: m.code, rel, type, kind: S4B_KIND[type], ref: ref.ref, status: 'Draft', version: 1, rev: 0, by, at, tags: [type === 'Vimeo video' ? 'Recording' : type === 'Link' ? 'Link' : 'Reference'], versions: [{ v: 1, title: t, ref: ref.ref, at, by, note: 'First version' }] };
      if (x.lvl !== 'mod') { r.cbrHome = { lvl: x.lvl, unit: x.lvl === 'unit' ? u.code : null }; cbrAtts(pr.id).push({ id: 'RA-' + (++CBR().n), rid: id, lvl: x.lvl, unit: x.lvl === 'unit' ? u.code : null, mod: null, status: 'Active', at, by }); }
      S_.res.unshift(r); s4bRows(); s4bLog('Learning Resources', `${r.title} (${id})`, 'Resource added', '—', `${s4bTxt(r)} · placed on ${cbrWhere(x.lvl, x.u, x.m)}`, 'Draft — course builder');
      s4bSyncAll(); render(); toast(`Saved as a Draft (${id}) and placed on ${cbrWhere(x.lvl, x.u, x.m)}.`);
    } }] });
};
ACT.cbrResRm = el => {
  const pr = cbPr(el.dataset.p); if (!pr) return; if (!cbrResCan(pr)) return s4bRefuse('Learning Resources', cbEnt(pr), 'change resource placements');
  const a = cbrAtts(pr.id).find(x => x.id === el.dataset.a && x.status === 'Active'), r = a && s4bRes(a.rid); if (!a) return;
  confirmDlg({ title: 'Remove from ' + esc(cbrWhere(a.lvl, a.unit, a.mod)) + '?', ok: 'Remove placement', body: `<p class="small">"${esc(r ? r.title : a.rid)}" stops appearing here for learners. The resource stays in Learning Resources with its versions and access log${r && r.cbrHome ? '; it has no other placement, so learners stop seeing it until it is placed again' : ''}.</p>`,
    onOk: () => { if (!cbrResCan(pr)) { closeModal(); return; } a.status = 'Removed'; a.rmAt = now().toISOString(); a.rmBy = cbrMe(); logA('Learning Resources', r ? `${r.title} (${r.id})` : a.rid, 'Resource placement removed', `${pr.title} — ${cbrWhere(a.lvl, a.unit, a.mod)}`, '—', 'Course builder — Curriculum'); closeModal(); s4bSyncAll(); render(); toast('Placement removed. The library record is unchanged.'); } });
};
// Learners: each Published placement appears in their programme, unit or module group (one item per placement; release rule and
// Coordinator overrides as for the module); a resource placed by the curriculum only isn't shown on its library anchor module
const _syncCBR = s4bSyncW;
s4bSyncW = function (w) {
  const r0 = _syncCBR.apply(this, arguments);
  try {
    if (!w || !w.flags || !w.flags.nvq || !w.tree || !w.resources || !w.nvq || !w.flags.admitted) return r0;
    const pid = s4PidOfW(w), kept = (w.s4bKept = w.s4bKept || {}), code = s4bBatchOfW(w);
    if (!pid || !STORE.cbr) return r0;
    S4B().res.filter(r => r.cbrHome && r.pid === pid).forEach(r => { const f = s4bFindItem(w, 'res-' + r.id); if (f) { f.g.items.splice(f.g.items.indexOf(f.i), 1); kept['res-' + r.id] = f.i; } });
    cbrAtts(pid).forEach(a => {
      const r = s4bRes(a.rid), id = 'cbr-' + a.id, o = r && s4bOverride(code, r), f = s4bFindItem(w, id);
      const covers = a.lvl === 'prog' || (a.lvl === 'unit' ? w.tree.some(u => u.code === a.unit) : s4bHasMod(w, { unit: a.unit, mod: a.mod }));
      const show = a.status === 'Active' && r && !r.legacy && r.status === 'Published' && covers && !(o && o.status === 'Unpublished');
      if (!show) { if (f) { f.g.items.splice(f.g.items.indexOf(f.i), 1); kept[id] = f.i; } return; }
      let it = f ? f.i : kept[id];
      if (!f) {
        if (!it) it = { id, kind: r.kind, title: r.title, desc: r.desc, tags: r.tags.slice(), state: 'New', dl: false, s4rev: r.rev, s4id: r.id };
        let g; if (a.lvl === 'mod') g = s4bGroupFor(w, { unit: a.unit, mod: a.mod });
        else { const key = a.lvl === 'prog' ? 'prog' : 'u:' + a.unit, u = w.tree.find(x => x.code === a.unit); g = w.resources.find(x => x.cbr === key); if (!g) { g = { course: w.nvq.title, unit: a.lvl === 'prog' ? 'Programme resources' : `${a.unit} ${u ? u.title.split(' ').slice(0, 3).join(' ') : ''} · Unit resources`, items: [], cbr: key }; if (a.lvl === 'prog') w.resources.unshift(g); else w.resources.push(g); } }
        g.items.push(it); delete kept[id];
      }
      if (it.s4rev !== r.rev) Object.assign(it, { kind: r.kind, title: r.title, desc: r.desc, s4rev: r.rev });
      it.s4id = r.id; it.ref = r.ref; it.v = r.version;
      const lock = s4bLockOf(w, r);
      if (lock) { if (it.state !== 'Locked') { it.st0 = it.state; it.state = 'Locked'; } it.lock = lock; it.dl = false; }
      else { if (it.state === 'Locked') { it.state = it.st0 || 'New'; delete it.st0; } delete it.lock; it.dl = r.kind === 'doc'; }
    });
  } catch (e) { /* never block a learner's resources */ }
  return r0;
};
// Learning Resources: a resource placed by the curriculum says so (its library module is only its anchor)
const _resPageCBR = SCREENS['a-resources'];
SCREENS['a-resources'] = function () {
  let h = _resPageCBR.apply(this, arguments); if (!STORE.cbr) return h;
  S4B().res.filter(r => !r.legacy).forEach(r => {
    const n = Object.values(CBR().att).flat().filter(a => a.rid === r.id && a.status === 'Active').length; if (!n && !r.cbrHome) return;
    const k = h.indexOf(`<strong>${esc(r.title)}</strong>`); if (k < 0) return;
    const from = `<span class="small">${esc(s4bMap(r))} · Module ${s4bModNo(r.pid, r.unit + ' ' + r.mod)}</span>`, j = h.indexOf(from, k); if (j < 0) return;
    const to = `<span class="small">${r.cbrHome ? `${esc(s4bProgShort(r.pid))} · ${r.cbrHome.lvl === 'prog' ? 'whole programme' : 'unit ' + esc(r.cbrHome.unit)} (curriculum)` : `${esc(s4bMap(r))} · Module ${s4bModNo(r.pid, r.unit + ' ' + r.mod)}`}${(r.cbrHome ? n - 1 : n) > 0 ? ` <span class="xs muted">+ ${plural(r.cbrHome ? n - 1 : n, 'curriculum placement')}</span>` : ''}</span>`;
    h = h.slice(0, j) + to + h.slice(j + from.length);
  });
  return h;
};


/* ---------- Step 3 — Assessments: academic scope, questions, answer keys and criterion mapping ----------
   d.scope = { lvl: 'mod' | 'unit' | 'prog', unit, mod } on assessments created here; d.atype = the assessment type (shared registry).
   An assignment without d.scope keeps its existing rule: every criterion of its unit (it is shown under that unit, "listed by
   module"). Mapping is limited to the knowledge criteria of the scope in the programme version the assessment is linked to. */
const CBR_LVL = { mod: 'Module', unit: 'Unit', prog: 'Whole programme' };
const cbrScope = d => d.scope || { lvl: 'unit', unit: s2UnitCode(d.unit) || null, legacy: true };
const cbrAsgV = (pr, d) => d.pv || (pr && !pr.chNew ? pr.version : undefined);
// The criteria of a scope with their place in the curriculum: [{ u, m, lo, c, kind }] (nothing retired)
function cbrScopeRows(pr, v, sc) {
  const out = []; if (!pr || !sc) return out;
  (cbTree(pr, v) || []).filter(cbrLive).forEach(u => { if (sc.lvl !== 'prog' && u.code !== sc.unit) return;
    u.mods.filter(cbrLive).forEach(m => { if (sc.lvl === 'mod' && m.code !== sc.mod) return;
      m.los.filter(cbrLive).forEach(lo => lo.crit.filter(cbrLive).forEach(c => out.push({ u, m, lo, c, kind: critKind(lo.type || 'Knowledge') }))); }); });
  return out;
}
const cbrKnow = (pr, d) => cbrScopeRows(pr, cbrAsgV(pr, d), cbrScope(d)).filter(x => x.kind === 'Knowledge');
// Mapped criteria outside the scope (or no longer knowledge criteria of it)
const cbrBad = (pr, d) => { const ok = new Set(cbrKnow(pr, d).map(x => x.c.code)); return asgCodes(d).filter(c => !ok.has(c)); }; // CMA: question or whole-assessment mappings
const cbrScopeTxt = (pr, d) => { const s = cbrScope(d), t = cbTree(pr, cbrAsgV(pr, d)) || [], u = t.find(x => x.code === s.unit), m = u && s.mod ? u.mods.find(x => x.code === s.mod) : null;
  return s.legacy ? `Unit ${s.unit || '—'}${u ? ' — ' + u.title : ''} (${esc(d.unit || '')}; all of the unit's criteria)` : s.lvl === 'prog' ? 'Whole programme' : s.lvl === 'unit' ? `Unit ${s.unit}${u ? ' — ' + u.title : ''}` : `Module ${s.unit} ${s.mod}${m ? ' — ' + m.title : ''}`; };
const cbrUnitStr = (pr, sc) => { if (sc.lvl === 'prog') return 'Whole programme'; if (sc.lvl === 'unit') return sc.unit; const u = (cbTree(pr) || []).find(x => x.code === sc.unit), k = u ? u.mods.findIndex(m => m.code === sc.mod) : -1; return `${sc.unit} · Module ${k + 1}`; };
// Scoped assessments read their criteria from the scope (S2's mapping grid, CB5's publish check and the learner copies all use s2Crit)
const _critCBR = s2Crit;
s2Crit = function (d) {
  if (!d || !d.scope) return _critCBR.apply(this, arguments);
  const pr = cbPr(cbAsgPid(d)); return cbrScopeRows(pr, cbrAsgV(pr, d), d.scope).map(x => ({ code: x.c.code, d: x.c.d, type: x.kind, typeName: x.lo.type || 'Knowledge', ev: x.c.evReq || x.c.ev || '' }));
};
// A mapping outside the scope is refused (logged), whoever calls it
const _mapCBR = INP.mapChange;
INP.mapChange = el => {
  const d = el && el.dataset && s2Def(el.dataset.id);
  if (d && d.scope && el.checked) { const pr = cbPr(cbAsgPid(d)); if (!cbrKnow(pr, d).some(x => x.c.code === el.dataset.c)) { el.checked = false; s2Log(d, 'Blocked: map a criterion outside the assessment scope', '—', el.dataset.c, cbrScopeTxt(pr, d)); toast(`${el.dataset.c} isn't a knowledge criterion of this assessment's scope (${cbrScopeTxt(pr, d)}).`, 'err'); render(); return; } }
  return _mapCBR(el);
};
// Assessment types an assessment can use: the shared registry's types marked by the Knowledge rules (written questions); others are
// shown but can't be chosen — they have no marking workflow for assessments
const cbrTypeOk = n => critKind(n) === 'Knowledge';
const cbrTypeOpts = cur => s3Types().filter(t => t.status === 'Active' || t.name === cur).map(t => `<option value="${esc(t.name)}" ${t.name === (cur || 'Knowledge') ? 'selected' : ''} ${cbrTypeOk(t.name) ? '' : 'disabled'}>${esc(t.label || t.name)}${cbrTypeOk(t.name) ? '' : ' — not available for assessments'}${t.status === 'Retired' ? ' (retired)' : ''}</option>`).join('');
const cbrTypeTxt = d => { const t = s3TypeOf(d.atype || 'Knowledge'); return t ? (t.label || t.name) + (t.status === 'Retired' ? ' (retired)' : '') : d.atype || 'Knowledge'; };
const cbrTargets = (pr, lvl) => { const t = (cbTree(pr) || []).filter(cbrLive); return lvl === 'unit' ? t.map(u => [u.code, `${u.code} — ${u.title}`]) : lvl === 'mod' ? t.flatMap(u => u.mods.filter(cbrLive).map(m => [`${u.code}|${m.code}`, `${u.code} ${m.code} — ${m.title}`])) : []; };
INP.cbrAsgLvl = el => { const pr = cbPr(el.dataset.p), lvl = ($('#modal-root input[name="cna-lvl"]:checked') || {}).value, box = $('#modal-root #cna-tg'), f = $('#modal-root .cbr-tgf'); if (!pr || !box) return; const o = cbrTargets(pr, lvl); box.innerHTML = o.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''); if (f) f.hidden = lvl === 'prog'; };
const cbrScopeFields = (pr, sc) => `<fieldset class="field n5-fs"><legend class="lbl">Academic scope</legend><div class="row">${Object.entries(CBR_LVL).map(([k, l]) => `<label class="check"><input type="radio" name="cna-lvl" value="${k}" data-onchange="cbrAsgLvl" data-p="${pr.id}" ${sc.lvl === k ? 'checked' : ''}>${l}</label>`).join('')}</div><span class="hint">Only the knowledge criteria of the scope can be mapped to its questions.</span></fieldset>
  <div class="field cbr-tgf" ${sc.lvl === 'prog' ? 'hidden' : ''}><label for="cna-tg">Unit or module</label><select class="select" id="cna-tg">${cbrTargets(pr, sc.lvl).map(([v, l]) => `<option value="${esc(v)}" ${v === (sc.lvl === 'mod' ? `${sc.unit}|${sc.mod}` : sc.unit) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
const cbrScopeRead = () => { const lvl = ($('#modal-root input[name="cna-lvl"]:checked') || {}).value, tg = mval('#cna-tg'); if (!CBR_LVL[lvl]) return null; if (lvl === 'prog') return { lvl, unit: null, mod: null }; if (!tg) return { err: true }; const [unit, mod] = tg.split('|'); return lvl === 'unit' ? { lvl, unit, mod: null } : { lvl, unit, mod }; };
const cbrAsgGate = (pr, what) => { if (!cbAsgCan()) return cbAsgRefuse(what), null; if (!pr) return toast('Programme not found.', 'err'), null; if (cbRetired(pr)) return cbrNo(pr, what, 'Programme retired', 'This programme is retired, so no assessments can be added or changed.'); if (cbrArch(pr)) return cbrNo(pr, what, 'Programme archived', 'This programme is archived, so no new or changed assessment definitions are allowed.'); return pr; };
ACT.cbrAsgNew = el => {
  const pr = cbrAsgGate(cbPr(el.dataset.p), 'create an assessment'); if (!pr) return;
  if (!cbrTargets(pr, 'mod').length) { toast('Add units and modules in Curriculum & Outcomes first.', 'err'); return; }
  const sc = { lvl: el.dataset.lvl || 'mod', unit: el.dataset.u || null, mod: el.dataset.m || null };
  openModal({ title: 'Add assessment — ' + esc(pr.title), size: 'lg', body: `<div class="form-grid"><div class="field full"><label for="cna-t">Assessment title</label><input class="input" id="cna-t"></div>
    <div class="field"><label for="cna-ty">Assessment type</label><select class="select" id="cna-ty">${cbrTypeOpts('Knowledge')}</select></div>
        <div class="full">${cbrScopeFields(pr, sc)}</div>
    <div class="field full"><label for="cna-b">Instructions</label><textarea class="textarea" id="cna-b" rows="3">Answer each question using examples from your workplace.</textarea></div></div>
    <p class="xs muted">Created as a Draft, linked to Version ${pr.version}.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Create draft', cls: 'btn-primary', fn: () => {
      if (!cbrAsgGate(pr, 'create an assessment')) { closeModal(); return false; }
      const v = { title: mval('#cna-t'), brief: mval('#cna-b') }, ty = mval('#cna-ty'), s = cbrScopeRead();
      if (!v.title) return fieldErr('#cna-t', 'Enter a title'), false; if (s2Defs().some(x => x.title.toLowerCase() === v.title.toLowerCase())) return fieldErr('#cna-t', 'An assessment with this title already exists'), false;
      if (!cbrTypeOk(ty)) return fieldErr('#cna-ty', 'Choose a type marked against criteria (written questions)'), false;
      if (!s || s.err) return fieldErr('#cna-tg', 'Choose the unit or module'), false;
      v.due = null; v.unit = cbrUnitStr(pr, s); // deadlines are set per batch when it is published (CR)
      const d = cbAsgCreate(pr, v); d.scope = s; d.atype = ty; s2Log(d, 'Assessment scope set', '—', `${CBR_LVL[s.lvl]} · ${cbrScopeTxt(pr, d)} · ${cbrTypeTxt(d)}`, 'Course builder — Assessments');
      setUi('cbAsg.' + pr.id, d.id); setUi('cbAsgT.' + pr.id, 'questions'); closeModal(); render(); toast('Draft created — add the questions next.');
    } }] });
};
// Scope and type of a Draft: mappings outside the new scope are listed and removed with the change (the assessment has no learners yet)
ACT.cbrAsgScope = el => {
  const d = s2Def(el.dataset.id), pr = d && cbrAsgGate(cbPr(cbAsgPid(d)), 'change an assessment scope'); if (!d || !pr) return;
  if (d.status !== 'Draft') { s2Log(d, 'Blocked: change scope (published)', d.status, d.status, ''); toast('Only a Draft assessment\'s scope or type can be changed.', 'err'); return; }
  const sc = d.scope || { lvl: 'unit', unit: s2UnitCode(d.unit), mod: null };
  openModal({ title: 'Scope and type — ' + esc(d.title), size: 'lg', body: `<div class="field"><label for="cna-ty">Assessment type</label><select class="select" id="cna-ty">${cbrTypeOpts(d.atype || 'Knowledge')}</select></div>${cbrScopeFields(pr, sc)}<div id="cbr-sc-imp" class="small"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      if (!cbrAsgGate(pr, 'change an assessment scope') || d.status !== 'Draft') { closeModal(); return false; }
      const s = cbrScopeRead(), ty = mval('#cna-ty'); if (!s || s.err) return fieldErr('#cna-tg', 'Choose the unit or module'), false; if (!cbrTypeOk(ty)) return fieldErr('#cna-ty', 'Choose a type marked against criteria'), false;
      const was = `${CBR_LVL[cbrScope(d).lvl]} · ${cbrScopeTxt(pr, d)} · ${cbrTypeTxt(d)}`, keep = { scope: d.scope, unit: d.unit, atype: d.atype };
      d.scope = s; d.unit = cbrUnitStr(pr, s); d.atype = ty; const bad = cbrBad(pr, d), now_ = `${CBR_LVL[s.lvl]} · ${cbrScopeTxt(pr, d)} · ${cbrTypeTxt(d)}`;
      if (was === now_ && !keep.scope === !s) { Object.assign(d, keep); toast('Nothing has changed.', 'info'); return false; }
      if (bad.length && !el.dataset.ok) { Object.assign(d, keep); const b = $('#cbr-sc-imp'); if (b) b.innerHTML = `<div class="note b-amber">${ic('alert')}<div class="small"><strong>${plural(bad.length, 'mapped criterion is', 'mapped criteria are')} outside the new scope:</strong> ${esc(bad.join(', '))}. Save again to change the scope and remove ${bad.length === 1 ? 'that mapping' : 'those mappings'}.</div></div>`; el.dataset.ok = '1'; return false; }
      delete el.dataset.ok; d.qs.forEach(q => { q.crit = q.crit.filter(c => !bad.includes(c)); }); if (d.acrit) d.acrit = d.acrit.filter(c => !bad.includes(c));
      s2Log(d, 'Assessment scope changed', was, now_, bad.length ? `Mappings removed (outside the new scope): ${bad.join(', ')}` : ''); render(); toast('Saved.');
    } }] });
};
ACT.cbrMapClean = el => {
  const d = s2Def(el.dataset.id), pr = d && cbrAsgGate(cbPr(cbAsgPid(d)), 'change a criteria mapping'); if (!d || !pr) return;
  if (d.status !== 'Draft') { toast('Only a Draft assessment\'s mapping can be cleaned up here. A published one is changed through its mapping (audited).', 'err'); return; }
  const bad = cbrBad(pr, d); if (!bad.length) return; d.qs.forEach(q => { q.crit = q.crit.filter(c => !bad.includes(c)); }); if (d.acrit) d.acrit = d.acrit.filter(c => !bad.includes(c));
  s2Log(d, 'Mappings outside the scope removed', bad.join(', '), '—', cbrScopeTxt(pr, d)); render(); toast(`${plural(bad.length, 'mapping')} removed.`);
};
// Answer key / expected answer / assessor guidance, per question: kept on the definition only — never copied to a learner
ACT.cbrQKey = el => {
  const d = s2Def(el.dataset.id), q = d && d.qs.find(x => x.id === el.dataset.q), pr = d && cbrAsgGate(cbPr(cbAsgPid(d)), 'change an answer key'); if (!d || !q || !pr) return;
  if (d.status === 'Retired') { toast('A retired assessment can\'t be changed.', 'err'); return; }
  const n = d.qs.filter(x => x.status === 'Active').indexOf(q) + 1;
  openModal({ title: `Answer key — Q${n}`, sub: esc(d.title), size: 'lg', body: `<p class="small">${esc(q.text)}</p><div class="field"><label for="aq-k">Answer key, expected answer or assessor guidance</label><textarea class="textarea" id="aq-k" rows="6">${esc(q.key || '')}</textarea><span class="hint">Seen by programme administrators and the assessor marking this question. Never sent to learners.</span></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save answer key', cls: 'btn-primary', fn: () => {
      if (!cbrAsgGate(pr, 'change an answer key')) { closeModal(); return false; }
      const t = mval('#aq-k'); if (t === (q.key || '')) { toast('Nothing has changed.', 'info'); return false; }
      const had = !!q.key; if (t) { q.key = t; q.keyBy = cbrMe(); q.keyAt = now().toISOString(); } else { delete q.key; delete q.keyBy; delete q.keyAt; }
      s2Log(d, t ? (had ? 'Answer key changed' : 'Answer key added') : 'Answer key removed', had ? 'Set' : '—', t ? 'Set' : '—', `Q${n} (${q.id})`); render(); toast('Answer key saved.');
    } }] });
};
// The mapping of one assessment: each question's criteria, grouped by unit, module and Learning Outcome, limited to the scope
function cbrMapping(pr, d) {
  const sc = cbrScope(d), rows = cbrScopeRows(pr, cbrAsgV(pr, d), sc), know = rows.filter(x => x.kind === 'Knowledge'), obs = rows.length - know.length, act = d.qs.filter(q => q.status === 'Active');
  const subs = s2HasSubs(d), locked = d.status === 'Retired' || !cbAsgCan() || cbRetired(pr), bad = cbrBad(pr, d), mapped = new Set(act.flatMap(q => q.crit)), amb = cbrAmbig(pr, cbrAsgV(pr, d));
  const grp = {}; know.forEach(x => { const k = `${x.u.code}|${x.m.code}|${x.lo.code}`; (grp[k] = grp[k] || { x, list: [] }).list.push(x.c); });
  const q1 = (q, i) => `<details class="cbr-mq" data-q="${q.id}" ${q.crit.length ? '' : 'open'}><summary><span class="q-n">Q${i + 1}</span><span class="cbr-mq-t">${esc(q.text.length > 90 ? q.text.slice(0, 90) + '…' : q.text)}</span><span class="xs ${q.crit.length ? 'muted' : 'cbr-warn'}">${q.crit.length ? plural(q.crit.length, 'criterion', 'criteria') : 'Not mapped'}</span></summary>
    <div class="cbr-mq-b">${Object.values(grp).map(({ x, list }) => `<fieldset class="cbr-lo"><legend><span class="code">${esc(x.u.code)}</span> ${esc(x.m.code)} · <span class="code">${esc(x.lo.code)}</span> ${esc(x.lo.title)}</legend>${list.map(c => `<label class="check"><input type="checkbox" data-onchange="mapChange" ${cbrDS({ id: d.id, q: q.id, c: c.code, subs: subs ? '1' : '' })} ${q.crit.includes(c.code) ? 'checked' : ''} ${locked || subs || (amb.has(c.code) && !q.crit.includes(c.code)) ? 'disabled' : ''}><span><span class="code">${esc(c.code)}</span> ${esc(c.d)}${amb.has(c.code) ? ' <span class="xs cbr-warn">code used twice — not mappable</span>' : ''}</span></label>`).join('')}</fieldset>`).join('') || '<p class="small muted">No knowledge criteria in this scope.</p>'}
    ${q.crit.filter(c => bad.includes(c)).length ? `<p class="xs cbr-warn">${ic('alert', 12)} Also mapped, outside the scope: ${esc(q.crit.filter(c => bad.includes(c)).join(', '))}</p>` : ''}</div></details>`;
  const un = know.filter(x => !mapped.has(x.c.code)).map(x => x.c.code);
  return `<section class="card cbr-map" data-cb-keep><div class="row-b"><h3>Criteria mapping</h3><span class="xs muted">Scope: ${esc(cbrScopeTxt(pr, d))}</span></div>
    ${subs ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Learners have submitted — the mapping is fixed.</strong> Their evidence and judgements stay against these criteria. ${esc(asgFixedMsg(d))}</div></div>` : ''}
    ${bad.length ? `<div class="note b-amber cbr-bad">${ic('alert')}<div class="small"><strong>${plural(bad.length, 'mapping is', 'mappings are')} outside the scope:</strong> ${esc(bad.join(', '))}. ${d.status === 'Draft' && !locked ? `<button class="btn btn-sm" data-act="cbrMapClean" data-id="${d.id}">Remove them</button>` : 'Publishing is blocked until they are removed.'}</div></div>` : ''}
    ${act.length ? act.map(q1).join('') : '<p class="small muted">Add questions first.</p>'}
    <p class="xs muted cbr-cov">Knowledge criteria in scope: ${know.length} · mapped: ${know.length - un.length}${un.length ? ` · not yet mapped: ${esc(un.slice(0, 8).join(', '))}${un.length > 8 ? '…' : ''}` : ''}${obs ? ` · ${plural(obs, 'observation criterion', 'observation criteria')} in scope are assessed by observation` : ''}.</p></section>`;
}
function cbrKeys(pr, d) {
  const act = d.qs.filter(q => q.status === 'Active'), can = cbAsgCan() && !cbRetired(pr) && d.status !== 'Retired'; if (!act.length || !cbAsgCan()) return '';
  return `<section class="card cbr-keys"><div class="row-b"><h3>Answer keys</h3><span class="xs muted">${ic('lock', 12)} Staff only — never shown to learners</span></div><ul class="list cbr-keyl">${act.map((q, i) => `<li class="li" data-q="${q.id}"><span class="cbr-qn">Q${i + 1}</span><div class="li-b"><span class="small">${q.key ? esc(q.key.length > 140 ? q.key.slice(0, 140) + '…' : q.key) : '<span class="muted">No answer key yet</span>'}</span>${q.key ? `<span class="xs muted">${esc(q.keyBy || '')}${q.keyAt ? ', ' + fd(q.keyAt) : ''}</span>` : ''}</div>${can ? `<button class="btn btn-sm btn-ghost" data-act="cbrQKey" data-id="${d.id}" data-q="${q.id}">${q.key ? 'Edit' : 'Add'}</button>` : ''}</li>`).join('')}</ul></section>`;
}
// The editor of one assessment (CB5's tabs and buttons; its own scope card, answer keys and the scoped mapping)
function cbrAsgEditor(pr, d) {
  const tab = ui('cbAsgT.' + pr.id, 'details'), act = d.qs.filter(q => q.status === 'Active'), un = act.filter(q => !q.crit.length).length, edt = cbAsgCan() && !cbRetired(pr) && !cbrArch(pr), bad = cbrBad(pr, d);
  const tabs = [['details', 'Details'], ['questions', `Questions & answer keys (${act.length})`], ['mapping', 'Criteria mapping']].map(([k, l]) => `<button class="tab" role="tab" aria-selected="${k === tab}" data-act="cbAsgOpen" data-p="${pr.id}" data-id="${d.id}" data-t="${k}">${l}</button>`).join('');
  let det = s2Details(d); if (d.scope) det = det.replace(/<label for="ae-u">[^<]*<\/label><select class="select" id="ae-u"[^>]*>[\s\S]*?<\/select>/, `<span class="lbl">Academic scope</span><select class="select" id="ae-u" disabled aria-label="Academic scope"><option value="${esc(d.unit)}" selected>${esc(cbrScopeTxt(pr, d))}</option></select>`);
  const scope = `<section class="card cbr-scope"><div class="row-b"><h3>Scope and type</h3>${edt && d.status === 'Draft' ? `<button class="btn btn-sm" data-act="cbrAsgScope" data-id="${d.id}">Change</button>` : ''}</div><dl class="kv"><dt>Assessment type</dt><dd>${esc(cbrTypeTxt(d))}</dd><dt>Academic scope</dt><dd>${esc(CBR_LVL[cbrScope(d).lvl])} — ${esc(cbrScopeTxt(pr, d))}</dd></dl>${d.scope ? '' : '<p class="xs muted">Created before scopes: its questions are mapped to the criteria of its whole unit, as before.</p>'}</section>`;
  const body = tab === 'questions' ? s2Questions(d) + cbrKeys(pr, d) + cbAsgQSettings(d) : tab === 'mapping' ? cbrMapping(pr, d) + (typeof aafaPreview === 'function' ? aafaPreview(d, s2Crit(d)) : '') : det + scope + cbAsgSettings(d);
  const btns = !edt ? '' : `<div class="row cb-asg-btns">${tab === 'details' && d.status !== 'Retired' ? `<button class="btn btn-primary" data-act="s2Save" data-id="${d.id}">Save</button>` : ''}${d.status === 'Draft' ? `<button class="btn" data-act="pubAsg" data-id="${d.id}">Publish</button>` : ''}${d.status === 'Published' ? `<button class="btn" data-act="kEditBrief" data-id="${d.id}">${ic('edit', 15)}Edit brief (new version)</button><button class="btn" data-act="s2Unpublish" data-id="${d.id}">Unpublish</button><button class="btn" data-act="s2Retire" data-id="${d.id}">Retire</button>` : ''}<button class="btn btn-ghost" data-go="a-assignments" data-id="${d.id}" data-tab="extensions">Deadline extensions</button></div>`;
  const note = d.status === 'Draft' && (!act.length || un || bad.length) ? `<div class="note b-red">${ic('alert')}<div class="small"><strong>Publishing blocked:</strong> ${!act.length ? 'add at least one question' : un ? `${plural(un, 'question')} not mapped to a criterion yet` : `${plural(bad.length, 'mapping')} outside the scope`}.</div></div>` : '';
  return `<section class="card cb-asg-ed cbr-asg-ed" data-id="${d.id}"><div class="row-b"><h2>${esc(d.title)}</h2><span class="row">${chip(d.status, d.status === 'Published' ? 'green' : d.status === 'Draft' ? 'amber' : 'grey')}<span class="typebadge">Assignment version ${d.version}</span><button class="btn btn-sm btn-ghost" data-act="cbAsgOpen" data-p="${pr.id}" data-id="">Close</button></span></div>
    ${note}<div class="cb-panels cb-asg-tabs" role="tablist" aria-label="Assessment">${tabs}</div><div class="cb-asg-body">${body}</div>${btns}</section>`;
}
// Assessments listed by academic scope: whole programme, then each unit (its unit-level assessments) and its modules
function cbrAsgList(pr) {
  const L = cbAsgOf(pr), tree = (cbTree(pr) || []).filter(cbrLive), can = cbAsgCan() && !cbRetired(pr) && !cbrArch(pr), sel = ui('cbAsg.' + pr.id, '');
  const row = d => { const s = cbrScope(d), know = cbrKnow(pr, d), m = new Set(d.qs.filter(q => q.status === 'Active').flatMap(q => q.crit)), cov = know.filter(x => m.has(x.c.code)).length, bad = cbrBad(pr, d).length;
    return `<li class="cbr-ai${d.id === sel ? ' cur' : ''}" data-id="${d.id}"><div class="cbr-ai-t"><strong>${esc(d.title)}</strong><span class="xs muted">${esc(cbrTypeTxt(d))} · ${esc(cbAsgVerTxt(d))} · ${plural(d.qs.filter(q => q.status === 'Active').length, 'question')} · answer keys ${d.qs.filter(q => q.status === 'Active' && q.key).length} of ${d.qs.filter(q => q.status === 'Active').length} · mapped ${cov} of ${know.length}${s.legacy ? ' · unit-wide (created before scopes)' : ''}${bad ? ` · <span class="cbr-warn">${plural(bad, 'mapping')} outside scope</span>` : ''}</span></div>${chip(d.status, d.status === 'Published' ? 'green' : d.status === 'Draft' ? 'amber' : 'grey')}<button class="btn btn-sm btn-ghost" data-act="cbAsgOpen" data-p="${pr.id}" data-id="${d.id}" data-t="details" aria-label="Open ${esc(d.title)}">Open</button></li>`; };
  const add = (lvl, u, m) => (can ? `<button class="btn btn-sm btn-ghost cbr-add" data-act="cbrAsgNew" ${cbrDS({ p: pr.id, lvl, u, m })}>${ic('plus', 13)}Add</button>` : '');
  const of = f => L.filter(f), used = new Set();
  const grp = (lbl, list, extra) => { list.forEach(d => used.add(d.id)); return `<div class="cbr-ag"><div class="cbr-ag-h">${lbl}${extra || ''}</div>${list.length ? `<ul class="cbr-al">${list.map(row).join('')}</ul>` : '<p class="xs muted cbr-ag-none">None</p>'}</div>`; };
  let h = grp('<span class="cbr-ag-l">Whole programme</span>', of(d => cbrScope(d).lvl === 'prog'), add('prog'));
  tree.forEach(u => {
    const uu = of(d => cbrScope(d).lvl === 'unit' && cbrScope(d).unit === u.code);
    h += `<div class="cbr-agu"><div class="cbr-agu-h"><span class="code">${esc(u.code)}</span> <strong>${esc(u.title)}</strong></div>${grp('<span class="cbr-ag-l">Unit</span>', uu, add('unit', u.code))}${u.mods.filter(cbrLive).map(m => grp(`<span class="cbr-ag-l">Module <span class="code">${esc(m.code)}</span> ${esc(m.title)}</span>`, of(d => cbrScope(d).lvl === 'mod' && cbrScope(d).unit === u.code && cbrScope(d).mod === m.code), add('mod', u.code, m.code))).join('')}</div>`;
  });
  const rest = L.filter(d => !used.has(d.id)); if (rest.length) h += grp('<span class="cbr-ag-l">Not in this version\'s structure</span>', rest);
  return `<section class="card cbr-asgs"><div class="row-b"><h2>Assessments</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="cbrAsgNew" data-p="${pr.id}">${ic('plus', 14)}Add Assessment</button>` : ''}</div>${tree.length || L.length ? h : '<p class="small muted">Add units and modules in Curriculum & Outcomes first.</p>'}</section>`;
}
function cbrAsgBody(pr, focus) {
  const L = cbAsgOf(pr), sel = ui('cbAsg.' + pr.id, ''), d = sel && L.find(x => x.id === sel), n = s3Types().filter(t => t.status === 'Active').length;
  const types = cbrFold('cbr-types', `Manage assessment types <span class="xs muted">${n} active</span>`, cbCurTypesUse(pr) + s3TypesTab(), focus === 'types', 'cbr-types');
  const cov = cbRvCoverage(pr, cbTree(pr)), covT = cov.all.length ? `<p class="xs muted cbr-cov">Programme coverage: ${cov.all.length - cov.un.length} of ${plural(cov.all.length, 'knowledge criterion', 'knowledge criteria')} mapped to an assessment question${cov.un.length ? ` · not yet: ${esc(cov.un.slice(0, 10).join(', '))}${cov.un.length > 10 ? '…' : ''}` : ''}.</p>` : '';
  return types + cbrAsgList(pr) + covT + (d ? cbrAsgEditor(pr, d) : '') + (typeof aafaCoverage === 'function' && cov.all.length ? cbrFold('cbr-covf', 'Criteria coverage by question', aafaCoverage(pr), false, 'cbr-coverage') : '') + cbrFold('cbr-keyf', 'Module answer key files', cbrKeysPanel(pr), focus === 'keys', 'cbr-keyfiles');
}
// The assessor marking a submission sees the answer keys of its assessment (read from the definition; the learner's copy has none)
const _tMarkCBR = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkCBR(p);
  try {
    const s = typeof tasSubs === 'function' ? tasSubs(true).find(x => x.key === (p && p.id)) : null, a = s && tasAsg(s), d = a && s2Def(a.id), act = d ? d.qs.filter(q => q.status === 'Active') : [];
    if (typeof h !== 'string' || !act.some(q => q.key) || (typeof cbr2KeyView === 'function' && !cbr2KeyView(d))) return h; // CBC4: the same rule as the key documents
    return h + `<details class="card cbr-mkeys"><summary><strong>Answer keys</strong> <span class="xs muted">assessor guidance — never shown to learners</span></summary><ol class="list small">${act.map((q, i) => (q.key ? `<li class="li"><span class="q-n">Q${i + 1}</span><div class="li-b">${esc(q.key)}</div></li>` : '')).join('')}</ol></details>`;
  } catch (e) { return h; }
};
// The module answer-key files, shown on every visit to the step: rendering them must not freeze a record that an upload in progress is
// still completing (CB5 adds the programme version to a new record, then freezes it; cbKeysPanel also freezes as it renders)
const cbrKeysPanel = pr => { const f = cbKeyFreeze; cbKeyFreeze = () => {}; try { return cbKeysPanel(pr); } finally { cbKeyFreeze = f; } };
// Learners' copies never receive an answer key (S2 copies only the fields it names; this keeps it that way if that changes)
const _copyCBR = s2CopyTo;
s2CopyTo = function (v, d) { const r = _copyCBR.apply(this, arguments), a = r && STORE.worlds[v] && STORE.worlds[v].assignments.find(x => x.id === d.id); if (a) a.qs.forEach(q => { delete q.key; delete q.keyBy; delete q.keyAt; }); return r; };


/* ---------- Step 4 — Observations: Workplace and Academy, side by side ----------
   Each location is switched on or off (N5a's workplace / office fields, through n5Gate and n5Log) and configured below its switch with
   the OBS-1 library actions. Added here: "Add criterion" into a selected category (published as the category's next library version,
   so nothing already frozen changes), removing one criterion from this course, the evidence this course permits per library criterion
   (d.cbrEv — frozen into the published snapshot) and guidance for each location (d.cbrGuide — shown to the observation assessor). */
const CBR_LOC = { wp: ['Workplace Observation', 'workplace', 'Permitted', 'Not permitted'], off: ['Academy Observation', 'office', 'Available', 'Not available'] };
// The evidence this course permits for a library criterion: its own setting where one is made, else the library's
const _resolveCBR = ol1Resolve;
ol1Resolve = function (d, loc) {
  const r = _resolveCBR.apply(this, arguments); if (!d || d.state !== 'Draft' || !d.cbrEv) return r;
  const fix = i => (d.cbrEv[i.id] ? { ...i, ev: d.cbrEv[i.id].ev.slice(), req: d.cbrEv[i.id].req.slice(), evCourse: true } : i);
  return { ...r, items: r.items.map(fix), excluded: (r.excluded || []).map(fix) };
};
const cbrGuideOf = (d, loc) => (d && d.cbrGuide && d.cbrGuide[loc]) || '';
function cbrObsCol(pr, d, loc, ed) {
  const [title, key, onV] = CBR_LOC[loc], on = d[key] === onV, rec = d[key] != null, P = cbrDS({ p: pr.id, loc }), o = ol1Cfg(d), res = ol1Resolve(d, loc), pub = d.state !== 'Draft';
  const tg = `<div class="cbr-tg" role="group" aria-label="${esc(title)} required"><button class="${on ? 'on' : ''}" data-act="cbrObsLoc" ${P} data-v="on" aria-pressed="${on}" ${ed ? '' : 'disabled'}>Yes</button><button class="${rec && !on ? 'on' : ''}" data-act="cbrObsLoc" ${P} data-v="off" aria-pressed="${rec && !on}" ${ed ? '' : 'disabled'}>No</button></div>${rec ? '' : ' <span class="xs muted cbr-nrec">Not recorded</span>'}`;
  const head = `<div class="cbr-col-h"><h3>${title}</h3>${tg}</div>`;
  if (!on) return `<section class="cbr-col" data-loc="${loc}">${head}<p class="small muted">${!rec ? `Not recorded for Version ${d.v}.` : loc === 'wp' ? 'Learners aren\'t observed at their workplace.' : 'Learners aren\'t observed at the Academy.'}${(loc === 'wp' ? o.wp : o.off.add).length ? ' Earlier selections are kept with the draft.' : ''}</p></section>`;
  const sels = loc === 'wp' ? o.wp : o.off.add, m = loc === 'off' ? ol1Mode(d) : null;
  const mode = loc !== 'off' ? '' : `<div class="cbr-mode"><span class="lbl">Criteria at the Academy</span><div class="row" role="group" aria-label="Academy criteria"><button class="btn btn-sm${m === 'same' ? ' btn-primary' : ''}" data-act="ol1OffMode" data-p="${pr.id}" data-m="same" aria-pressed="${m === 'same'}" ${ed && d.workplace === 'Permitted' ? '' : 'disabled'}>Same as Workplace</button><button class="btn btn-sm${m === 'own' ? ' btn-primary' : ''}" data-act="ol1OffMode" data-p="${pr.id}" data-m="own" aria-pressed="${m === 'own'}" ${ed ? '' : 'disabled'}>Own selection</button></div>${m === 'same' ? '<span class="xs muted">Workplace criteria apply here too; exclude any that don\'t, and add Academy-only categories below.</span>' : ''}</div>`;
  const cats = pub ? '' : `<div class="cbr-cats"><div class="row-b"><span class="lbl">${loc === 'off' && m === 'same' ? 'Academy-only categories' : 'Categories'}</span>${ed ? `<span class="row"><button class="btn btn-sm" data-act="ol1Sel" ${P}>${ic('plus', 13)}Add from Library</button><button class="btn btn-sm btn-ghost" data-act="ol1CbNew" ${P}>${ic('plus', 13)}Create Category</button></span>` : ''}</div>
    ${sels.length ? `<ul class="cbr-catl">${sels.map(s => { const c = ol1Cat(s.cat), v = ol1Cur(c); return `<li data-k="${esc(s.cat)}"><span><span class="code">${esc(c ? c.code : s.cat)}</span> ${esc(v ? v.name : '—')} <span class="xs muted">${v ? 'v' + v.v + ' · ' : ''}${s.all ? 'all criteria' : plural((s.crit || []).length, 'criterion', 'criteria')}${c && c.retired ? ' · retired' : ''}</span></span>${ed ? `<span class="row"><button class="btn btn-sm btn-ghost" data-act="ol1Sel" ${P} data-k="${esc(s.cat)}">Choose criteria</button><button class="btn btn-sm btn-ghost" data-act="cbrObsCrit" ${P} data-k="${esc(s.cat)}">${ic('plus', 12)}Add Criterion</button><button class="btn btn-sm btn-ghost" data-act="ol1SelRm" ${P} data-k="${esc(s.cat)}">Remove</button></span>` : ''}</li>`; }).join('')}</ul>` : `<p class="xs muted">${loc === 'off' && m === 'same' ? 'None — the workplace criteria are used.' : 'No categories selected yet.'}</p>`}</div>`;
  const shown = loc === 'off' ? res.items.concat((res.excluded || []).map(i => ({ ...i, excluded: true }))) : res.items;
  const act = i => !ed ? '' : loc === 'off' && (i.from === 'inherited' || i.excluded) ? (i.excluded ? `<button class="btn btn-sm btn-ghost" data-act="ol1Excl" data-p="${pr.id}" data-c="${i.id}" data-a="incl">Include again</button>` : `<button class="btn btn-sm btn-ghost" data-act="ol1Excl" data-p="${pr.id}" data-c="${i.id}" data-a="excl">Exclude</button>`)
    : `<button class="btn btn-sm btn-ghost" data-act="cbrObsEv" ${P} data-c="${i.id}">Evidence</button><button class="btn btn-sm btn-ghost" data-act="cbrObsCritRm" ${P} data-c="${i.id}" data-k="${esc(i.cat)}" aria-label="Remove ${esc(i.code)} from this course">Remove</button>`;
  const crit = `<div class="cbr-crit"><span class="lbl">Criteria ${pub ? `(frozen with Version ${d.v})` : ''}</span>${shown.length ? `<ul class="cbr-critl">${shown.map(i => `<li data-c="${i.id}" class="${i.excluded ? 'cbr-excl' : ''}"><div><span class="code">${esc(i.code)}</span> <strong>${esc(i.title)}</strong>${i.excluded ? ' ' + chip('Excluded', 'grey') : i.from === 'inherited' ? ' <span class="xs muted">from Workplace</span>' : loc === 'off' && m === 'same' && i.from === 'office' ? ' <span class="xs muted">Academy only</span>' : ''}<div class="cbr-ev">${ol1EvChips(i)}${i.evCourse ? ' <span class="xs muted">set for this course</span>' : ''}</div></div><span class="row">${act(i)}</span></li>`).join('')}</ul>` : `<p class="xs muted">${pub && res.none ? `No library criteria were recorded for Version ${d.v}.` : 'None selected.'}</p>`}
    ${(res.probs || []).length && !pub ? `<ul class="list xs">${res.probs.map(p => `<li class="li">${chip(p.block ? 'Blocking' : 'Warning', p.block ? 'red' : 'amber')} ${esc(p.t)}</li>`).join('')}</ul>` : ''}</div>`;
  const g = cbrGuideOf(d, loc), guide = `<div class="cbr-guide"><div class="row-b"><span class="lbl">Guidance for this location</span>${ed ? `<button class="btn btn-sm btn-ghost" data-act="cbrObsGuide" ${P}>${g ? 'Edit' : 'Add'}</button>` : ''}</div>${g ? `<p class="small">${esc(g)}</p>` : '<p class="xs muted">None.</p>'}</div>`;
  const nvq = n5NvqOk(pr, d).length, nvqT = nvq ? `<p class="xs muted">Also observed here: ${plural(nvq, 'qualification observation criterion', 'qualification observation criteria')} from the curriculum${loc === 'wp' && d.ia.some(c => c.status === 'Active') ? ' and this programme\'s Academy criteria' : ''}.</p>` : '';
  return `<section class="cbr-col on" data-loc="${loc}">${head}${mode}${cats}${crit}${guide}${nvqT}</section>`;
}
function cbrObsBody(pr, focus) {
  if (!n5CanView()) return n5Section(pr); // N5a's own refusal (logged)
  n5Sync(); const d = n5Shown(pr), P = `data-p="${pr.id}"`;
  if (!d) return `<section class="card"><p class="small muted">No observation configuration is recorded for Version ${pr.version}.${cbRetired(pr) ? '' : ' Create a new version to configure observations.'}</p></section>`;
  // The configuration's versions, the migration notes and the audit: folded under the step
  const hist = () => { const dv = document.createElement('div'); dv.innerHTML = n5Section(pr); dv.querySelectorAll('.n5-head, .n5-settings, .n5-cover, .n5-checks, .ol1b-map, .n5-nvq, .n5-ia').forEach(n => n.remove()); return cbrFold('cbr-n5', 'Observation configuration history', dv.innerHTML, false, 'cbr-n5'); };
  if (d.required === false) return cbObsNA(pr) + hist();
  if (d.required == null && d.state === 'Draft') return `<div class="note b-amber" role="status">${ic('info')}<div class="small"><strong>Does this course contain observations?</strong> Answer it in Course Details first${d.prevRequired != null ? ` (Version ${d.v - 1}: ${n5YN(d.prevRequired)})` : ''}. <button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="details">Open Course Details</button></div></div>` + hist();
  const ed = !!n5DraftV(pr) && n5CanEdit() && d.state === 'Draft' && !cbrArch(pr);
  const ev = document.createElement('div'); ev.innerHTML = cbObsEventsPanel(pr); ev.querySelectorAll('.cb-locs').forEach(n => n.remove());
  const cards = cbrObsCards(pr, d), legacy = !pr.chNew ? `<p class="xs muted cbx-legacy">${ic('info', 12)} The legacy shared criteria list doesn't configure ${esc(pr.title)}; it is kept for reference. <button class="linklike" data-go="k-obslib">Open the legacy shared list</button> · <button class="linklike" data-go="k-ocl">Observation Criteria Library</button></p>` : '';
  const nrec = d.required == null ? `<p class="small muted" role="status">${ic('info', 14)} Version ${d.v} was published before "Observation required" was recorded; its settings are shown as published.</p>` : '';
  const none = d.required === true && d.workplace !== 'Permitted' && d.office !== 'Available' ? `<p class="small cbr-warn" role="status">${ic('alert', 14)} Observation is required, so at least one location needs Yes.</p>` : '';
  return `<section class="card cbr-obs"><div class="row-b"><h2>Where is observation required?</h2>${chip(d.state === 'Draft' ? `Version ${d.v} draft` : `Version ${d.v} published`, d.state === 'Draft' ? 'amber' : 'green')}</div>${nrec}${none}
    <div class="cbr-obs-cols">${cbrObsCol(pr, d, 'wp', ed)}${cbrObsCol(pr, d, 'off', ed)}</div>
    <p class="xs muted"><button class="linklike" data-go="k-ocl">Open the Observation Criteria Library</button> · Library categories are shared; removing one here only removes it from this course.</p></section>
    ${cards}<div id="cbr-events">${ev.innerHTML}</div>${legacy}${hist()}`;
}
// The qualification (NVQ) observation criteria from the curriculum — their evidence settings, for both locations — and a programme's
// own Academy criteria from before the library: N5a's own cards (same tables, buttons and handlers), shown once under the locations
function cbrObsCards(pr, d) {
  const dv = document.createElement('div'); dv.innerHTML = typeof _secB === 'function' ? _secB(pr) : ''; const nv = dv.querySelector('.n5-nvq'), ia = dv.querySelector('.n5-ia');
  const retitle = (el, t, p) => { const h = el.querySelector('h2'); if (h) h.textContent = t; const i = el.querySelector('p.small.muted'); if (i) i.textContent = p; };
  let h = '';
  if (nv) { retitle(nv, 'Qualification observation criteria (from the curriculum)', 'Learning Outcomes of the Observation type in this version — observed at both locations with the same evidence settings. Change them in Curriculum & Outcomes.'); h += nv.outerHTML; }
  if (ia && (d.ia || []).length) { retitle(ia, 'Programme Academy criteria (earlier set-up)', 'This programme\'s own Academy criteria from before the Observation Criteria Library, each mapped to qualification criteria. Used on workplace observations; not converted into library criteria.'); h += ia.outerHTML; }
  return h;
}
const cbrObsGate = (el, what) => { const pr = cbPr(el && el.dataset && el.dataset.p); if (pr && cbrArch(pr)) return cbrNo(pr, what, 'Programme archived', 'This programme is archived, so it is read-only.'); return ol1CbGate(el, what); };
// Yes / No per location
ACT.cbrObsLoc = el => {
  const pr = cbPr(el.dataset.p), loc = el.dataset.loc, on = el.dataset.v === 'on'; if (!CBR_LOC[loc]) return;
  if (pr && cbrArch(pr)) return cbrNo(pr, 'change observation settings', 'Programme archived', 'This programme is archived, so it is read-only.');
  if (pr && typeof cb8Locked === 'function' && cb8Locked(pr) && pr.status === 'Draft' && n5CanEdit()) return cb8LockMsg(pr, 'change the observation settings');
  const g = n5Gate(el, 'change observation settings'); if (!g) return; const { d } = g, [title, key, onV, offV] = CBR_LOC[loc], val = on ? onV : offV;
  if (d.required !== true) { n5Log(pr, 'Blocked: change observation settings', `Version ${d.v} (draft)`, '—', 'Observation isn\'t required for this version'); toast('This course has no observations (Course Details).', 'err'); return; }
  if (d[key] === val) return;
  const apply = () => { if (!n5Still(g)) return n5Lost(g); const was = n5Summary(pr, d); d[key] = val; n5Log(pr, 'Observation settings changed', was, n5Summary(pr, d), `Version ${d.v} (draft) — ${title}: ${on ? 'Yes' : 'No'}`); if (typeof cb8BasisCheck === 'function') cb8BasisCheck(pr, 'the observation settings changed'); render(); };
  const o = ol1Cfg(d), kept = loc === 'wp' ? o.wp.length : o.off.add.length;
  if (!on && kept) return confirmDlg({ title: `Turn ${title} off?`, ok: 'Turn off', body: `<p class="small">Its ${plural(kept, 'selected category', 'selected categories')} and guidance stay with the draft but won't be published while it is off. Published versions and observations already recorded don't change. An approved fee package goes back to Finance when the observation basis changes.</p>`, onOk: () => { closeModal(); apply(); } });
  apply();
};
// Add a criterion into a selected category: published as the category's next version (the library and every course following it)
ACT.cbrObsCrit = el => {
  const g = cbrObsGate(el, 'add an observation criterion'); if (!g) return; const { pr, d } = g, loc = el.dataset.loc, c = ol1Cat(el.dataset.k), v = ol1Cur(c);
  if (!c || !v) { toast('Category not found.', 'err'); return; }
  if (c.retired) { toast(`${c.code} is retired.`, 'err'); return; }
  if (c.work) { n5Log(pr, 'Blocked: add an observation criterion', c.code, '—', 'The category has unpublished library changes'); toast(`${c.code} has unpublished changes in the library — publish or discard them there first.`, 'err'); return; }
  openModal({ title: `Add criterion to ${esc(c.code)}`, sub: `${esc(v.name)} · becomes Version ${v.v + 1}`, size: 'lg', body: `<div class="field"><label for="cbr-ct">Title</label><input class="input" id="cbr-ct"></div><div class="field"><label for="cbr-ci">Description / instructions for the assessor</label><textarea class="textarea" id="cbr-ci"></textarea></div>${ol1EvBoxes({ ev: ['notes'], req: [] }, 'cbr')}
    <p class="xs muted">Saved to the shared library as ${esc(c.code)} Version ${v.v + 1}. Courses already published keep the version they froze; drafts that use all of ${esc(c.code)} pick it up.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Add criterion', cls: 'btn-primary', fn: () => {
      if (!n5Still(g) || !ol1CanEdit()) return ol1Lost(g);
      const x = { title: mval('#cbr-ct'), instr: mval('#cbr-ci'), ev: ol1Ticks($('#modal-root'), 'ol1-ev'), req: ol1Ticks($('#modal-root'), 'ol1-rq') }, err = ol1CritErr({ ...x, id: 'new' }, v.crit);
      if (err) return fieldErr(/title/i.test(err) ? '#cbr-ct' : /instruction/i.test(err) ? '#cbr-ci' : '#modal-root .ol1-ev', err), false;
      if (c.work) { toast(`${c.code} changed meanwhile — nothing was saved.`, 'err'); closeModal(); render(); return false; }
      const w = ol1Work(c), n = ol1NewCrit(c, x); w.crit.push(n); ol1Seq(w.crit);
      ol1Log(c, 'Criteria added', '—', `${n.code} ${n.title}`, `Course builder — ${pr.title} Version ${d.v}`);
      const pe = ol1PublishCat(c, `Criterion added in the course builder for ${pr.title} Version ${d.v}`); if (pe) { c.work = null; toast(pe, 'err'); return false; }
      const cw = ol1CfgW(d), list = loc === 'wp' ? cw.wp : cw.off.add, s = list.find(y => y.cat === c.id); if (s && !s.all) s.crit.push(n.id);
      n5Log(pr, `${ol1LocTxt(loc)} observation criterion added`, '—', `${c.code}: ${n.code} ${n.title}`, `Version ${d.v} (draft)`); render(); toast(`${n.code} added to ${c.code} (Version ${v.v + 1}).`);
    } }] });
};
// Remove one criterion from this course (the library keeps it)
ACT.cbrObsCritRm = el => {
  const g = cbrObsGate(el, 'remove an observation criterion'); if (!g) return; const { pr, d } = g, loc = el.dataset.loc, cw = ol1CfgW(d), list = loc === 'wp' ? cw.wp : cw.off.add, s = list.find(y => y.cat === el.dataset.k), c = ol1Cat(el.dataset.k), v = ol1Cur(c);
  if (!s || !v) { toast('That criterion isn\'t selected in this course.', 'err'); return; }
  const live = v.crit.filter(x => x.status === 'Active').map(x => x.id), it = v.crit.find(x => x.id === el.dataset.c); if (!it) return;
  s.crit = (s.all ? live : s.crit || []).filter(id => id !== it.id); s.all = false;
  if (!s.crit.length) list.splice(list.indexOf(s), 1);
  n5Log(pr, `${ol1LocTxt(loc)} observation criterion removed`, `${c.code}: ${it.code}`, '—', `Version ${d.v} (draft) — the library is unchanged`); render(); toast(`${it.code} removed from this course. The library is unchanged.`);
};
// The evidence this course permits for one library criterion (applies wherever the course uses it)
ACT.cbrObsEv = el => {
  const g = cbrObsGate(el, 'change observation evidence'); if (!g) return; const { pr, d } = g, id = el.dataset.c;
  const lib = ol1Resolve({ ...d, cbrEv: null }, el.dataset.loc).items.find(i => i.id === id) || ol1Resolve({ ...d, cbrEv: null }, 'wp').items.find(i => i.id === id); if (!lib) { toast('That criterion isn\'t selected in this course.', 'err'); return; }
  const cur = (d.cbrEv && d.cbrEv[id]) || { ev: lib.ev, req: lib.req };
  openModal({ title: `Evidence — ${esc(lib.code)}`, sub: esc(lib.title), size: 'lg', body: `<p class="xs muted">Library setting: ${esc(ol1EvTxt(lib))}.</p>${ol1EvBoxes(cur, 'cbr')}<label class="check"><input type="checkbox" id="cbr-evlib" ${d.cbrEv && d.cbrEv[id] ? '' : 'checked'}>Use the library's setting</label>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return ol1Lost(g);
      const useLib = $('#cbr-evlib').checked, x = { ev: ol1Ticks($('#modal-root'), 'ol1-ev'), req: ol1Ticks($('#modal-root'), 'ol1-rq') }, was = d.cbrEv && d.cbrEv[id] ? ol1EvTxt(d.cbrEv[id]) : 'library setting';
      if (!useLib) { if (!x.ev.length) return fieldErr('#modal-root .ol1-ev', 'Choose at least one evidence field'), false; const bad = x.req.filter(k => !x.ev.includes(k)); if (bad.length) return fieldErr('#modal-root .ol1-rq', 'A required field must also be enabled'), false; }
      d.cbrEv = d.cbrEv || {}; if (useLib) delete d.cbrEv[id]; else d.cbrEv[id] = x;
      const now_ = useLib ? 'library setting' : ol1EvTxt(x); if (was === now_) { toast('Nothing has changed.', 'info'); return false; }
      n5Log(pr, 'Observation evidence changed (this course)', `${lib.code}: ${was}`, `${lib.code}: ${now_}`, `Version ${d.v} (draft)`); render(); toast('Saved.');
    } }] });
};
ACT.cbrObsGuide = el => {
  const g = cbrObsGate(el, 'change observation guidance'); if (!g) return; const { pr, d } = g, loc = el.dataset.loc, cur = cbrGuideOf(d, loc);
  openModal({ title: `Guidance — ${CBR_LOC[loc][0]}`, size: 'lg', body: `<div class="field"><label for="cbr-g">Guidance for the assessor at this location</label><textarea class="textarea" id="cbr-g" rows="5" maxlength="2000">${esc(cur)}</textarea><span class="hint">Shown to the observation assessor with the criteria. Frozen when this version is published.</span></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return ol1Lost(g); const t = mval('#cbr-g'); if (t === cur) { toast('Nothing has changed.', 'info'); return false; }
      d.cbrGuide = { ...(d.cbrGuide || {}), [loc]: t }; n5Log(pr, `${ol1LocTxt(loc)} observation guidance ${t ? 'changed' : 'removed'}`, cur ? 'Set' : '—', t ? 'Set' : '—', `Version ${d.v} (draft)`); render(); toast('Saved.');
    } }] });
};
// The assessor recording an observation sees the location's guidance from the learner's programme version
const _recSecCBR = ol1RecSection;
ol1RecSection = function (o) {
  const h = _recSecCBR.apply(this, arguments); if (!h || !o || !o.src) return h;
  const cfg = typeof n5ConfigFor === 'function' ? n5ConfigFor(o.src.dPid, o.src.dV) : null, g = cbrGuideOf(cfg, ol1Loc(o.src.dLoc));
  return g ? h.replace(/(<h2>[^<]*<\/h2>)/, `$1<div class="note b-blue cbr-oguide">${ic('info')}<div class="small"><strong>Guidance for this location.</strong> ${esc(g)}</div></div>`) : h;
};


/* ---------- Step 5 — Fees & Payment Plans: the CB8 package, grouped by learner type ----------
   A fee option belongs to the learner type with its delivery mode (when several types share a mode, the one chosen here —
   STORE.cbr.optLt, outside the package, so choosing it never changes the approved terms). Entitlements per fee option (classes
   included, onboarding) are recorded as provisional: not part of the Finance package and not enforced anywhere. */
function cbrLtOfOpt(pr, o, types) {
  types = types || cbrTypes(pr); if (!o || !o.mode) return null;
  const pick = (CBR().optLt[pr.id] || {})[o.id], same = types.filter(t => t.mode === o.mode);
  return same.find(t => t.id === pick) || same[0] || null;
}
const cbrEnt = (pid, oid) => (CBR().ent[pid] || {})[oid] || null;
const cbrEntTxt = e => (!e ? 'Not set' : `${e.classes != null ? plural(e.classes, 'class', 'classes') : 'classes not set'} · onboarding ${e.onb === 'in' ? 'included' : e.onb === 'out' ? 'not included' : 'not set'}`);
const cbrFeeCan = pr => cbAdmin() && !cbRetired(pr) && !cbrArch(pr);
function cbrFeeExtra(pr, o, b, dep, types) {
  const T = o.fee > 0 ? o.fee : null, obs = b.req === true, wp = obs && b.wp && o.obsWp != null ? o.obsWp : null, off = obs && b.off && o.obsOff != null ? o.obsOff : null, e = cbrEnt(pr.id, o.id), same = o.mode ? types.filter(t => t.mode === o.mode) : [];
  const tot = !T ? '<span class="muted">Set the tuition fee</span>' : !obs ? `${money(T, 'GBP')} <span class="xs muted">no observation fee</span>` : [wp != null && `${money(T + wp, 'GBP')} <span class="xs muted">with a workplace observation (${money(T, 'GBP')} + ${money(wp, 'GBP')})</span>`, off != null && `${money(T + off, 'GBP')} <span class="xs muted">with an Academy observation (${money(T, 'GBP')} + ${money(off, 'GBP')})</span>`].filter(Boolean).join('<br>') || '<span class="muted">Set the observation fees</span>';
  const ltSel = same.length > 1 && cbrFeeCan(pr) ? `<label class="small cbr-optlt">Learner type <select class="select" data-onchange="cbrOptLt" ${cbrDS({ p: pr.id, o: o.id })}>${same.map(t => `<option value="${esc(t.id)}" ${cbrLtOfOpt(pr, o, types) === t ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></label>` : '';
  return `<dl class="cbr-fx"><div><dt>Total payable</dt><dd>${tot}</dd></div>${dep != null && T ? `<div><dt>With the deposit</dt><dd>${money(dep, 'GBP')} deposit, then ${money(Math.max(0, T - dep), 'GBP')}${obs ? ' + the observation fee' : ''}</dd></div>` : ''}<div><dt>Entitlements <span class="cbr-prov">Provisional</span></dt><dd>${esc(cbrEntTxt(e))}${cbrFeeCan(pr) ? ` <button class="btn btn-sm btn-ghost" data-act="cbrEnt" ${cbrDS({ p: pr.id, o: o.id })}>Edit</button>` : ''}</dd></div></dl>${ltSel}`;
}
function cbrFeeBody(pr, focus) {
  const p = cbPanels(pr, 'payments');
  if (!cb8Managed(pr)) return p.map(x => x[2]()).join(''); // terms from before packages: their own panels, as before
  const fees = p.find(x => x[0] === 'fees'), hist = p.find(x => x[0] === 'payhist'), d = document.createElement('div'); d.innerHTML = fees ? fees[2]() : '';
  const wf = cb8Wf(pr), P = wf && wf.status === 'Pending' && wf.sub ? wf.sub : cb8Work(pr), b = cb8Basis(pr), types = cbrTypes(pr), dep = P.dep.eff !== undefined ? P.dep.eff : cb8DepEff(P);
  const box = d.querySelector('.cb8-opts'), add = d.querySelector('.cb8-sec > .row-b [data-act="cb8Opt"]'), canAdd = !!add;
  if (box) {
    const arts = [...box.querySelectorAll(':scope > article.cb8-opt')], byId = id => P.opts.find(o => o.id === id);
    arts.forEach(a => { const o = byId(a.dataset.o); if (o && o.status === 'Active') a.insertAdjacentHTML('beforeend', cbrFeeExtra(pr, o, b, dep, types)); a.querySelectorAll('[data-act="cb8PayAdd"].btn-primary').forEach(x => x.classList.remove('btn-primary')); });
    const groups = types.map(t => ({ t, list: arts.filter(a => { const o = byId(a.dataset.o); return o && cbrLtOfOpt(pr, o, types) === t; }) }));
    const rest = arts.filter(a => !groups.some(g => g.list.includes(a)));
    box.innerHTML = ''; box.classList.add('cbr-fgs');
    groups.forEach(({ t, list }) => { const g = document.createElement('div'); g.className = 'cbr-fg'; g.dataset.lt = t.id; g.innerHTML = `<div class="row-b cbr-fg-h"><h3>${esc(t.label)} <span class="xs muted">${esc(t.mode)} · ${plural(list.filter(a => !a.classList.contains('cb8-ret')).length, 'fee option')}</span></h3>${canAdd ? `<button class="btn btn-sm" data-act="cb8Opt" data-p="${pr.id}" data-o="" data-mode="${esc(t.mode)}">${ic('plus', 13)}Add fee option</button>` : ''}</div>`; const l = document.createElement('div'); l.className = 'cbr-fg-l'; list.forEach(a => l.appendChild(a)); if (!list.length) l.innerHTML = '<p class="small muted">No fee option for this learner type yet.</p>'; g.appendChild(l); box.appendChild(g); });
    if (rest.length) { const g = document.createElement('div'); g.className = 'cbr-fg'; g.innerHTML = `<div class="row-b cbr-fg-h"><h3>${types.length ? 'Not linked to a learner type' : cb8L3(pr) ? 'Fee options' : 'All learners'}</h3></div>`; const l = document.createElement('div'); l.className = 'cbr-fg-l'; rest.forEach(a => l.appendChild(a)); g.appendChild(l); box.appendChild(g); }
    if (add && types.length) add.remove();
  }
  return d.innerHTML + (hist ? cbrFold('cbr-fhist', 'Financial versions and history', hist[2](), focus === 'payhist' || focus === 'support', 'cbr-fhist') : '');
}
// "Add fee option" under a learner type starts with that delivery mode chosen
const _optCBR = ACT.cb8Opt;
ACT.cb8Opt = function (el) {
  const r = _optCBR.apply(this, arguments), m = el && el.dataset && !el.dataset.o && el.dataset.mode;
  if (m && MODAL && typeof MODAL.body === 'string' && MODAL.body.includes(`<option >${m}</option>`)) { MODAL.body = MODAL.body.replace(`<option >${m}</option>`, `<option selected>${m}</option>`); renderModal(); }
  return r;
};
INP.cbrOptLt = el => {
  const pr = cbPr(el.dataset.p); if (!pr) return; if (!cbrFeeCan(pr)) { s3Refuse('change a fee option\'s learner type', cbEnt(pr)); render(); return; }
  const o = cb8Work(pr).opts.find(x => x.id === el.dataset.o), t = cbrTypes(pr).find(x => x.id === el.value); if (!o || !t || t.mode !== o.mode) { toast('Choose a learner type with this fee option\'s delivery mode.', 'err'); render(); return; }
  const m = CBR().optLt[pr.id] = CBR().optLt[pr.id] || {}, was = (cbrLtOfOpt(pr, o) || {}).label || '—'; m[o.id] = t.id;
  logA('Payment Plans', cb8Ent(pr), 'Fee option learner type changed', `${o.id}: ${was}`, `${o.id}: ${t.label}`, 'Display grouping — the approved terms are unchanged'); render();
};
ACT.cbrEnt = el => {
  const pr = cbPr(el.dataset.p); if (!pr) return; if (!cbrFeeCan(pr)) return s3Refuse('change fee option entitlements', cbEnt(pr));
  const o = cb8Work(pr).opts.find(x => x.id === el.dataset.o); if (!o) { toast('Fee option not found.', 'err'); return; } const e = cbrEnt(pr.id, o.id) || {};
  openModal({ title: `Entitlements — ${esc(o.label)}`, sub: 'Provisional — pending client policy', body: `<div class="field"><label for="cbr-ec">Live classes included</label><input class="input num" type="number" min="0" max="200" step="1" id="cbr-ec" value="${e.classes != null ? e.classes : ''}"><span class="hint">The number the package would include, once the client confirms it. Sessions and Zoom links are scheduled in each batch.</span></div>
    <fieldset class="field n5-fs"><legend class="lbl">Onboarding</legend>${[['in', 'Included'], ['out', 'Not included'], ['', 'Not set']].map(([k, l]) => `<label class="check"><input type="radio" name="cbr-eo" value="${k}" ${(e.onb || '') === k ? 'checked' : ''}>${l}</label>`).join('')}</fieldset>
    ${(() => { const p = s4PlanCur(pr.id), at = p && cbrEntAt(pr.id, p.v, o.id); return p && at ? `<p class="xs muted cbr-entv">At plan version ${p.v} approval: ${esc(cbrEntTxt(at.classes == null && at.onb == null ? null : at))}.</p>` : ''; })()}<p class="xs muted">${ic('info', 12)} Recorded for review only: not part of the package Finance approves, not shown to learners, and nothing counts or limits classes or onboarding by it.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      if (!cbrFeeCan(pr)) { closeModal(); return false; }
      const s = mval('#cbr-ec'); if (s !== '' && (!/^\d{1,3}$/.test(s) || +s > 200)) return fieldErr('#cbr-ec', 'Enter a whole number from 0 to 200, or leave it blank'), false;
      const nx = { classes: s === '' ? null : +s, onb: ($('#modal-root input[name="cbr-eo"]:checked') || {}).value || null }, was = cbrEntTxt(cbrEnt(pr.id, o.id));
      if (cbrEntTxt(nx) === was) { toast('Nothing has changed.', 'info'); return false; }
      (CBR().ent[pr.id] = CBR().ent[pr.id] || {})[o.id] = { ...nx, at: now().toISOString(), by: cbrMe() };
      logA('Payment Plans', cb8Ent(pr), 'Fee option entitlements changed (provisional)', `${o.id}: ${was}`, `${o.id}: ${cbrEntTxt(nx)}`, 'Not part of the Finance package'); render(); toast('Saved (provisional).');
    } }] });
};

// When a plan version is approved, the entitlements recorded at that moment are kept with it (frozen), so a later change to the
// provisional record never alters what was on file for an approved version. Nothing reads them for learners.
const _applyCBR = cb8Apply;
cb8Apply = function (pr) {
  const r = _applyCBR.apply(this, arguments);
  try { const p = pr && s4PlanCur(pr.id); if (p && p.pkg) { const e = CBR().ent[pr.id] || {}, V = (CBR().entV = CBR().entV || {})[pr.id] = CBR().entV[pr.id] || {}; if (!V[p.v]) V[p.v] = Object.freeze(p.pkg.opts.filter(o => o.status === 'Active').map(o => Object.freeze({ id: o.id, classes: e[o.id] ? e[o.id].classes : null, onb: e[o.id] ? e[o.id].onb : null }))); } } catch (err) { /* never block an approval */ }
  return r;
};
const cbrEntAt = (pid, v, oid) => { const V = ((CBR().entV || {})[pid] || {})[v]; const x = V && V.find(y => y.id === oid); return x || null; };

/* ---------- Step 6 — Offer Letters: one template per learner type ----------
   Every version stays in the programme's one versioned list (STORE.chLetters, frozen); a version made for a learner type carries
   lt = its ID. CBR().letter[pid][lt] = 'own' gives the type its own template, otherwise it uses the programme letter. An applicant
   keeps the version current for their type when their sign-up started: among the versions up to the one pinned at the start, the
   latest of their template (resolved once, recorded in signup.cbrLetter). Signed letters and their snapshots are never touched. */
const cbrTrack = (pid, lt) => chLetters(pid).filter(x => (x.lt || null) === (lt || null));
const cbrTrackCur = (pid, lt) => { const l = cbrTrack(pid, lt); return l[l.length - 1] || null; };
const cbrUsesOwn = (pid, lt) => !!lt && (CBR().letter[pid] || {})[lt] === 'own' && !!cbrTrackCur(pid, lt);
const cbrLetterCan = pr => s4CanLetter() && !cbRetired(pr) && !cbrArch(pr);
function cbrLetterSync() {
  if (!STORE.worlds || !STORE.chLetters || !STORE.cbr) return;
  Object.values(STORE.worlds).forEach(w => {
    const su = w && w.signup; if (!su || su.sig || !su.letterV || su.cbrLetter) return;
    const pr = typeof chProgOf === 'function' ? chProgOf(w) : null; if (!pr || !pr.id) return;
    const L = chLetters(pr.id); if (!L.some(x => x.lt)) return; // no learner-type template: the existing pin stands
    const opt = (typeof r1OptOfW === 'function' && r1OptOfW(w)) || (typeof cb9Pin === 'function' && cb9Pin(w) ? { id: cb9Pin(w).optId, mode: cb9Pin(w).mode } : null);
    const real = cbPr(pr.id), t = real && opt ? cbrLtOfOpt(real, opt, cbrTypes(real, real.version)) : null, lt = t && cbrUsesOwn(pr.id, t.id) ? t.id : null, v0 = su.letterV;
    const pick = k => L.filter(x => (x.lt || null) === k && x.v <= v0).pop();
    const target = pick(lt) || pick(null);
    su.cbrLetter = { v0, lt, at: now().toISOString() };
    if (target && target.v !== v0) su.letterV = target.v;
  });
}
const _renderCBR = render;
render = function () { try { cbrLetterSync(); } catch (e) { /* never block a render */ } return _renderCBR.apply(this, arguments); };
const _signCBR = ACT.suSign;
ACT.suSign = function () { try { cbrLetterSync(); } catch (e) { /* keep signing */ } return _signCBR.apply(this, arguments); };
ACT.cbrLetterUp = el => {
  const pr = cbPr(el.dataset.p), lt = el.dataset.lt || null; if (!pr) return; if (!s4LetterGuard(pr)) return;
  if (!cbrLetterCan(pr)) return cbrNo(pr, 'upload an offer letter', cbRetired(pr) ? 'Programme retired' : 'Programme archived', 'This programme is read-only.');
  const t = lt ? cbrTypesAll(pr).find(x => x.id === lt) : null; if (lt && !t) { toast('Learner type not found.', 'err'); return; }
  setUi('chLetterFile', ''); const prev = cbrTrackCur(pr.id, lt) || cbrTrackCur(pr.id, null), what = t ? `${t.label} template` : 'programme letter';
  reasonDlg({ title: `Upload ${esc(what)} — ${esc(pr.title)}`, ok: 'Upload new version', label: 'What changed (required)', extra: `<div class="field"><label for="lt-f">Letter (PDF or DOCX)</label><input class="input" type="file" id="lt-f" accept=".pdf,.docx" data-onchange="chLetterFile"><span class="hint"><span id="lt-fname">No file chosen</span> — the prototype records the file name; the file itself is simulated.</span><button type="button" class="linklike small" data-act="chLetterSample">Prototype: use a sample DOCX</button></div>
    <div class="field"><label for="lt-x">Letter text for this version</label><textarea class="textarea" id="lt-x" rows="8">${esc(s4ParaIn(prev && prev.text))}</textarea><span class="hint">Leave a blank line between paragraphs. Merge fields: {{full_name}}, {{student_id}}, {{programme}}, {{payment_terms}}.</span></div><p class="small muted">${t ? `Applicants of the ${esc(t.label)} learner type who start their sign-up from now on get this version.` : 'Applicants who start their sign-up from now on get this version, unless their learner type has its own template.'} Signed letters keep exactly what was signed.</p>`,
    onOk: r => {
      const f = ui('chLetterFile', ''); if (!f) { fieldErr('#lt-f', 'Choose a PDF or DOCX file'); return false; } if (!/\.(pdf|docx)$/i.test(f)) { fieldErr('#lt-f', 'Upload a PDF or DOCX file'); return false; }
      const text = s4ParaOut($('#lt-x').value); if (!text.length) { fieldErr('#lt-x', 'Enter the letter text'); return false; }
      if (!cbrLetterCan(pr)) return false;
      const l = chLetters(pr.id), p0 = l[l.length - 1], v = (p0 ? p0.v : 0) + 1, p1 = cbrTrackCur(pr.id, lt);
      l.push(Object.freeze({ v, file: f, at: now().toISOString(), by: ADMIN.me.name, note: r, programme: pr.title, text: Object.freeze(text), ...(lt ? { lt, ltLabel: t.label } : {}) }));
      if (lt) (CBR().letter[pr.id] = CBR().letter[pr.id] || {})[lt] = 'own';
      logA('NVQ Programmes', pr.title, 'Offer letter uploaded', p1 ? 'Version ' + p1.v : '—', `Version ${v}${t ? ` (${t.label} template)` : ''}`, r); render(); toast(`Offer letter version ${v} saved${t ? ` for ${t.label}` : ''}. It applies to new applicants.`);
    } });
};
ACT.cbrLetterUse = el => {
  const pr = cbPr(el.dataset.p), lt = el.dataset.lt, to = el.dataset.v; if (!pr || !lt) return; if (!s4LetterGuard(pr)) return;
  if (!cbrLetterCan(pr)) return cbrNo(pr, 'change the offer letter', 'Programme read-only', 'This programme is read-only.');
  const t = cbrTypesAll(pr).find(x => x.id === lt); if (!t) return; if (to === 'own' && !cbrTrackCur(pr.id, lt)) { toast('Upload the template first.', 'err'); return; }
  reasonDlg({ title: to === 'own' ? `Use the ${esc(t.label)} template` : `Use the programme letter for ${esc(t.label)}`, ok: 'Change', body: `<p class="small">Applies to applicants who start their sign-up from now on. Anyone already signing keeps their version; signed letters don't change. ${to === 'own' ? '' : 'The type\'s template versions are kept and can be used again.'}</p>`,
    onOk: r => { if (!cbrLetterCan(pr)) return false; (CBR().letter[pr.id] = CBR().letter[pr.id] || {})[lt] = to === 'own' ? 'own' : 'shared'; logA('NVQ Programmes', pr.title, 'Offer letter assignment changed', `${t.label}: ${to === 'own' ? 'programme letter' : 'own template'}`, `${t.label}: ${to === 'own' ? 'own template' : 'programme letter'}`, r); render(); } });
};
ACT.cbrLetterRestore = el => {
  const pr = cbPr(el.dataset.p); if (!pr || !s4LetterGuard(pr)) return; if (!cbrLetterCan(pr)) return cbrNo(pr, 'restore an offer letter', 'Programme read-only', 'This programme is read-only.');
  const l = chLetters(pr.id), src = l.find(x => x.v === +el.dataset.v); if (!src) return;
  reasonDlg({ title: `Restore version ${src.v} as a new version`, ok: 'Restore as new version', body: `<p class="small">A new version of the same template is made with version ${src.v}'s text and file. Every earlier version stays unchanged.</p>`,
    onOk: r => { const v = l[l.length - 1].v + 1; l.push(Object.freeze({ v, file: src.file, at: now().toISOString(), by: ADMIN.me.name, note: `Restored from version ${src.v}: ${r}`, programme: src.programme, text: Object.freeze(src.text.slice()), from: src.v, ...(src.lt ? { lt: src.lt, ltLabel: src.ltLabel } : {}) })); logA('NVQ Programmes', pr.title, 'Offer letter restored as new version', 'Version ' + src.v, 'Version ' + v, r); render(); toast(`Version ${v} made from version ${src.v}.`); } });
};
function cbrLetterHist(pr, lt, can) {
  const l = cbrTrack(pr.id, lt).slice().reverse(), cur = l[0];
  return l.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>File</th><th>Uploaded</th><th>What changed</th><th></th></tr></thead><tbody>${l.map(x => `<tr data-v="${x.v}"><td>${x.v}${x === cur ? ' ' + chip('Current', 'green') : ''}</td><td class="mono small">${esc(x.file)}</td><td class="small">${fd(x.at)} · ${esc(x.by)}</td><td class="small">${esc(x.note)}</td><td class="nowrap"><button class="btn btn-sm btn-ghost" data-act="s4LetterPrev" data-id="${pr.id}" data-v="${x.v}">Preview</button>${can && x !== cur ? ` <button class="btn btn-sm btn-ghost" data-act="cbrLetterRestore" data-p="${pr.id}" data-v="${x.v}">Restore</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No versions yet.</p>';
}
function cbrDocBody(pr, focus) {
  const types = cbrTypes(pr), can = cbrLetterCan(pr), shared = cbrTrackCur(pr.id, null), P = `data-p="${pr.id}"`;
  const card = (t) => {
    const own = t && cbrUsesOwn(pr.id, t.id), L = own ? cbrTrackCur(pr.id, t.id) : shared, hasOwn = t && !!cbrTrackCur(pr.id, t.id);
    const btns = !can ? '' : !t ? `<button class="btn btn-sm" data-act="cbrLetterUp" ${P} data-lt="">${ic('upload', 13)}Upload new version</button>`
      : own ? `<button class="btn btn-sm" data-act="cbrLetterUp" ${P} data-lt="${esc(t.id)}">${ic('upload', 13)}Upload new version</button><button class="btn btn-sm btn-ghost" data-act="cbrLetterUse" ${P} data-lt="${esc(t.id)}" data-v="shared">Use the programme letter</button>`
      : hasOwn ? `<button class="btn btn-sm" data-act="cbrLetterUse" ${P} data-lt="${esc(t.id)}" data-v="own">Use its own template again</button>` : `<button class="btn btn-sm" data-act="cbrLetterUp" ${P} data-lt="${esc(t.id)}">${ic('upload', 13)}Upload a separate template</button>`;
    return `<section class="cbr-lc" data-lt="${t ? esc(t.id) : ''}"><div class="row-b"><div><h3>${t ? esc(t.label) : 'Programme letter'}</h3><span class="xs muted">${t ? `${esc(t.mode)} · ${own ? 'its own template' : 'uses the programme letter (below)'}` : `used by ${types.filter(x => !cbrUsesOwn(pr.id, x.id)).map(x => x.label).join(', ') || 'every applicant'}${types.length ? '' : ''}`}</span></div><span class="row">${L ? `<button class="btn btn-sm btn-ghost" data-act="s4LetterPrev" data-id="${pr.id}" data-v="${L.v}">Preview</button>` : ''}${btns}</span></div>
      <p class="small">${L ? `Version ${L.v} · <span class="mono">${esc(L.file)}</span> · ${esc(L.by)}, ${fd(L.at)}` : '<span class="cbr-warn">No letter uploaded yet.</span>'}</p>
      ${(!t || own || hasOwn) ? cbrFold('cbr-lh', 'Version history', cbrLetterHist(pr, t && hasOwn ? t.id : null, can), false) : ''}</section>`;
  };
  // The programme letter is the existing panel, unchanged (merge fields, template, version history, payment-terms preview and the
  // wording warnings), showing the programme letter's own versions; signed letters are folded beneath it
  const all = STORE.chLetters && STORE.chLetters[pr.id], d = document.createElement('div'), lp = cbPanels(pr, 'documents').find(x => x[0] === 'letter');
  if (all && all.some(x => x.lt)) STORE.chLetters[pr.id] = all.filter(x => !x.lt);
  try { d.innerHTML = lp ? lp[2]() : ''; } finally { if (all) STORE.chLetters[pr.id] = all; }
  d.querySelectorAll('section.cb-signed').forEach(n => { const f = document.createElement('details'); f.className = 'cbr-fold cbr-signed'; f.id = 'cbr-signed'; f.innerHTML = '<summary>Signed letters</summary><div class="cbr-fold-b"></div>'; n.replaceWith(f); f.lastElementChild.appendChild(n); });
  return `${types.length ? `<section class="card cbr-letters"><div class="row-b"><h2>Template by learner type</h2><span class="xs muted">The offer letter is the course contract</span></div>${types.map(t => card(t)).join('')}
    <p class="xs muted cbr-issuer">${ic('info', 12)} The issuer, letterhead and signatory are the text of each template; nothing here changes them. Per-type issuers wait for the client's confirmation of the contracting names. Previews use a sample learner — signed letters are under "Signed letters".</p></section>` : ''}
    <h3 class="cbr-sub">Programme letter</h3>${d.innerHTML}${cbrFold('cbr-docs', 'Required enrolment documents', cbDocsPanel(pr), focus === 'docs', 'cbr-docs')}`;
}
// Preview: a template, never a signed document
const _prevCBR = ACT.s4LetterPrev;
ACT.s4LetterPrev = function (el) { const r = _prevCBR.apply(this, arguments); if (MODAL && typeof MODAL.title === 'string' && !/template preview/.test(MODAL.title)) { const L = chLetters(el.dataset.id).find(x => x.v === +el.dataset.v); MODAL.title = `${MODAL.title}${L && L.ltLabel ? ` (${esc(L.ltLabel)})` : ''} · template preview`; MODAL.body = `<div class="note b-grey">${ic('info')}<div class="small">A template filled in for a sample learner — not a signed document.</div></div>` + MODAL.body; renderModal(); } return r; };

/* ---------- Step 7 — Review & Publish: the existing review, with the new configuration in each summary ---------- */
// New rows join the section's own list (one aligned list per section)
const cbrRvAdd = (h, rows) => { const d = cbRvDl(rows), k = h.lastIndexOf('</dl>'); return k >= 0 && h.slice(k).trim() === '</dl>' ? h.slice(0, k) + d.replace(/^<dl[^>]*>/, '').replace(/<\/dl>$/, '') + '</dl>' : h + d; };
const _sumCBR = cbRvSummary;
cbRvSummary = function (pr, k) {
  const h = _sumCBR.apply(this, arguments);
  try {
    if (k === 'details') { const c = cbrCfgOf(pr), ts = cbrTypes(pr); return cbrRvAdd(h, [['Display duration', esc(cbrPer(c && c.c.disp) || 'Not set')], ['Learner types', ts.length ? `${esc(ts.map(t => `${t.label}${t.label !== t.mode ? ` (${t.mode})` : ''}${cbrPer(t.win) ? ' — to display ' + cbrPer(t.win) : ''}`).join(' · '))}${c ? '' : ' <span class="xs muted">from the fee options — not configured</span>'} <span class="cbr-prov">Provisional</span>` : cbRvNone('None')]]); }
    if (k === 'curriculum') { const t = (cbTree(pr) || []).filter(cbrLive), A = cbrAttsLive(pr.id), mods = t.flatMap(u => u.mods.filter(cbrLive).map(m => [u.code, m.code])), withR = mods.filter(([u, m]) => cbrResAt(pr, 'mod', u, m).length).length;
      return cbrRvAdd(h, [['Resources', `${A.filter(a => a.lvl === 'prog').length} programme · ${A.filter(a => a.lvl === 'unit').length} unit · ${A.filter(a => a.lvl === 'mod').length} module placements · ${withR} of ${plural(mods.length, 'module')} with resources`]]); }
    if (k === 'assessments') { const L = cbAsgOf(pr).filter(d => d.status !== 'Retired'), by = l => L.filter(d => cbrScope(d).lvl === l).length, qs = L.flatMap(d => d.qs.filter(q => q.status === 'Active')), bad = L.filter(d => cbrBad(pr, d).length);
      return cbrRvAdd(h, [['By scope', `${by('prog')} whole programme · ${by('unit')} unit · ${by('mod')} module`], ['Questions', `${qs.length} · ${qs.filter(q => q.crit.length).length} mapped · ${qs.filter(q => q.key).length} with an answer key`], ['Mapping', `${L.filter(d => !asgWhole(d)).length} per question · ${L.filter(asgWhole).length} whole assessment`], ['Mappings outside scope', bad.length ? `<span class="cbr-warn">${esc(bad.map(d => d.title).join(' · '))}</span>` : 'None']]); }
    if (k === 'observations') { const d = typeof n5Shown === 'function' && n5CanView() ? n5Shown(pr) : null; if (!d || d.required !== true) return h; const loc = l => { const on = d[CBR_LOC[l][1]] === CBR_LOC[l][2], o = ol1Cfg(d); return on ? `On · ${plural((l === 'wp' ? o.wp : o.off.add).length, 'category', 'categories')} · ${plural(ol1Resolve(d, l).items.length, 'criterion', 'criteria')}${cbrGuideOf(d, l) ? ' · guidance' : ''}` : 'Off'; };
      return cbrRvAdd(h, [['Workplace', loc('wp')], ['Academy', loc('off')]]); }
    if (k === 'payments' && cb8Managed(pr)) { const P = cb8Work(pr), ts = cbrTypes(pr), act = P.opts.filter(o => o.status === 'Active'), e = act.filter(o => cbrEnt(pr.id, o.id)).length;
      return cbrRvAdd(h, [['By learner type', ts.length ? esc(ts.map(t => `${t.label}: ${act.filter(o => cbrLtOfOpt(pr, o, ts) === t).map(o => o.label).join(', ') || 'none'}`).join(' · ')) : cbRvNone('No learner types')], ['Entitlements', `${e} of ${plural(act.length, 'fee option')} recorded <span class="cbr-prov">Provisional</span>`]]); }
    if (k === 'documents') { const ts = cbrTypes(pr), sh = cbrTrackCur(pr.id, null); return cbrRvAdd(h, [['Template per learner type', ts.length ? esc(ts.map(t => { const own = cbrUsesOwn(pr.id, t.id), L = own ? cbrTrackCur(pr.id, t.id) : sh; return `${t.label}: ${own ? 'own template' : 'programme letter'}${L ? ' v' + L.v : ' — none'}`; }).join(' · ')) : cbRvNone('One programme letter')]]); }
  } catch (e) { /* the summary never blocks the review */ }
  return h;
};
const _checksCBR = cbRvChecks;
cbRvChecks = function (pr) {
  const out = _checksCBR.apply(this, arguments); if (!pr || !out || !cbRvKind(pr)) return out;
  try {
    cbAsgOf(pr).filter(d => d.status !== 'Retired').forEach(d => { const b = cbrBad(pr, d); if (b.length) out.warn.push({ msg: `Assessment "${d.title}": ${plural(b.length, 'mapped criterion is', 'mapped criteria are')} outside its scope (${b.join(', ')}) — it can't be published until they are removed`, sec: 'assessments', tab: 'assessments' }); });
    const t = cbTree(pr) || [], orph = cbrAttsLive(pr.id).filter(a => a.lvl !== 'prog' && !t.some(u => u.code === a.unit && (a.lvl === 'unit' || u.mods.some(m => m.code === a.mod))));
    if (orph.length) out.warn.push({ msg: `${plural(orph.length, 'resource placement refers', 'resource placements refer')} to a unit or module that isn't in this version`, sec: 'curriculum', tab: 'resources' });
    if (cb8Managed(pr) && cbrCfgOf(pr)) { const ts = cbrTypes(pr), un = cb8Work(pr).opts.filter(o => o.status === 'Active' && o.mode && !cbrLtOfOpt(pr, o, ts)); if (un.length) out.warn.push({ msg: `${plural(un.length, 'fee option has', 'fee options have')} a delivery mode no learner type uses: ${un.map(o => o.label).join(', ')}`, sec: 'payments', tab: 'fees' }); }
  } catch (e) { /* the checks never block the review */ }
  return out;
};

/* ---------- Unique codes for new modules, Learning Outcomes and criteria (builder programmes) ----------
   Mappings, answer keys, evidence, judgements and observation settings refer to a criterion by its code ("71 1.1" = unit 71, Learning
   Outcome 1, criterion 1) and to a module by unit + module code. Builder programmes numbered new items by list length, so a second
   module's Learning Outcome, or an item added after a removal from a Draft, could take a code already in use in the unit. A new item
   now takes the next free number in its unit when its own number is taken — at creation, before anything refers to it, and audited.
   Existing codes are never renumbered. A version that still contains a duplicate can't be published, a duplicate code can't be mapped
   to an assessment question, and an assessment that maps one can't be published (seeded programmes already refuse duplicates). */
const cbrNum = c => +String(c).replace(/\D/g, '') || 0;
function cbrFixNew(kind, u, m, lo) {
  if (kind === 'mod') { const x = u.mods[u.mods.length - 1]; if (u.mods.filter(y => y.code === x.code).length < 2 || x.los.length) return null; const was = x.code; x.code = 'M' + (Math.max(0, ...u.mods.filter(y => y !== x).map(y => cbrNum(y.code))) + 1); return [was, x.code, `${u.code} ${x.code}`]; }
  if (kind === 'lo') { const x = m.los[m.los.length - 1], used = u.mods.flatMap(y => y.los).filter(l => l !== x).map(l => l.code); if (!used.includes(x.code) || x.crit.length) return null; const was = x.code; x.code = 'LO' + (Math.max(0, ...used.map(cbrNum)) + 1); return [was, x.code, `${u.code} ${m.code} ${x.code}`]; }
  const x = lo.crit[lo.crit.length - 1], used = u.mods.flatMap(y => y.los.flatMap(l => l.crit)).filter(c => c !== x).map(c => c.code); if (!used.includes(x.code)) return null;
  const unitN = String(x.code).split(' ')[0], loN = String(lo.code).replace(/\D/g, ''); let k = Math.max(0, ...lo.crit.filter(c => c !== x).map(c => +String(c.code).split('.')[1] || 0)) + 1; while (used.includes(`${unitN} ${loN}.${k}`)) k++;
  const was = x.code; x.code = `${unitN} ${loN}.${k}`; return [was, x.code, `${u.code} ${m.code} ${lo.code}`];
}
[['ch8AddMod', 'mod'], ['ch8AddLo', 'lo'], ['ch8AddCrit', 'crit']].forEach(([name, kind]) => {
  const f = ACT[name]; if (typeof f !== 'function') return;
  ACT[name] = function (el) {
    const r = f.apply(this, arguments), a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!a || !a.fn || a._cbr) return r;
    const g = a.fn; a._cbr = true;
    a.fn = function () {
      const d = el.dataset, pr = ch8Pr(d.id), u = pr && (ch8Tree(pr.id) || [])[+d.u], m = u && d.m != null ? u.mods[+d.m] : null, lo = m && d.l != null ? m.los[+d.l] : null;
      const list = kind === 'mod' ? u && u.mods : kind === 'lo' ? m && m.los : lo && lo.crit, n = list ? list.length : 0, res = g.apply(this, arguments);
      if (list && list.length === n + 1) { const fx = cbrFixNew(kind, u, m, lo); if (fx) { ch8Log(pr, { mod: 'Module code assigned', lo: 'Learning Outcome code assigned', crit: 'Criterion code assigned' }[kind], fx[0], fx[1], `${fx[2]} — the next free number in the unit, so codes stay unique`); render(); } }
      return res;
    };
    return r;
  };
});
// Codes used more than once in a programme version (whatever their status — a retired item still has evidence). CMA follow-up:
// criterion codes are checked across the whole version (units, modules, full-course scope), and so are unit codes; nothing is renumbered
const cbrDupCodes = (pr, v) => { const out = [], us = {}, cs = {}; (cbTree(pr, v) || []).forEach(u => { us[u.code] = (us[u.code] || 0) + 1; const ms = {}; u.mods.forEach(m => { ms[m.code] = (ms[m.code] || 0) + 1; m.los.forEach(l => l.crit.forEach(c => { (cs[c.code] = cs[c.code] || []).push(`${u.code} ${m.code}`); })); }); Object.entries(ms).filter(([, n]) => n > 1).forEach(([c]) => out.push({ code: `${u.code} ${c}`, what: 'module', where: u.code })); });
  Object.entries(us).filter(([, n]) => n > 1).forEach(([c]) => out.push({ code: c, what: 'unit', where: 'this version' }));
  Object.entries(cs).filter(([, l]) => l.length > 1).forEach(([c, l]) => out.push({ code: c, what: 'criterion', where: l.join(', ') })); return out; };
// Where an ambiguous criterion code is used, for the refusal messages
const cbrDupWhere = (pr, v, code) => ((cbrDupCodes(pr, v).find(x => x.what === 'criterion' && x.code === code) || {}).where || '');
const cbrAmbig = (pr, v) => new Set(cbrDupCodes(pr, v).filter(x => x.what === 'criterion').map(x => x.code));
const _checksCBR2 = cbRvChecks;
cbRvChecks = function (pr) {
  const out = _checksCBR2.apply(this, arguments); if (!pr || !out || !cbRvKind(pr)) return out;
  try { const d = cbrDupCodes(pr); if (d.length) out.block.push({ msg: `${plural(d.length, 'code is', 'codes are')} used twice in this version: ${d.map(x => `${x.what} ${x.code} (${x.where})`).join('; ')} — mappings, evidence and judgements couldn't tell them apart. Remove one of the items while the programme is a Draft and add it again (it takes the next free number)`, sec: 'curriculum', tab: 'structure' }); } catch (e) { /* never block the review on a fault */ }
  return out;
};
// A duplicate criterion code can't be mapped, and an assessment that maps one can't be published
const _mapCBR2 = INP.mapChange;
INP.mapChange = el => {
  const d = el && el.dataset && s2Def(el.dataset.id);
  if (d && el.checked) { const pr = cbPr(cbAsgPid(d)); if (pr && cbrAmbig(pr, cbrAsgV(pr, d)).has(el.dataset.c)) { el.checked = false; s2Log(d, 'Blocked: map an ambiguous criterion code', '—', el.dataset.c, 'The code is used by more than one criterion in this programme version'); toast(`${el.dataset.c} is used by more than one criterion in this programme version (${cbrDupWhere(pr, cbrAsgV(pr, d), el.dataset.c)}), so it can't be mapped until the curriculum is corrected in a Draft version.`, 'err'); render(); return; } }
  return _mapCBR2(el);
};
const _pubCBR = ACT.pubAsg;
ACT.pubAsg = el => {
  const d = el && el.dataset && s2Def(el.dataset.id), pr = d && cbPr(cbAsgPid(d));
  if (d && pr && d.status === 'Draft') { const amb = cbrAmbig(pr, cbrAsgV(pr, d)), hit = asgCodes(d).filter(c => amb.has(c)); if (hit.length) { s2Log(d, 'Blocked: publish (ambiguous criterion codes)', 'Draft', 'Draft', hit.join(', ')); toast(`Can't publish: ${hit.join(', ')} ${hit.length === 1 ? 'is' : 'are'} used by more than one criterion in this programme version.`, 'err'); return; } }
  return _pubCBR(el);
};

/* ---------- Saved client demo: an added store never discards a saved copy ----------
   The browser copy of the client demo is accepted only when its signature (the names of the stores) matches this build, so adding
   STORE.cbr made every copy saved by the previous build look "from another version": it was deleted and the starting demo loaded.
   A copy whose signature is this build's without the stores added since (CBR_ADDED) is the same data shape minus those stores: it is
   restored as before, and the added stores start empty. Any other mismatch, an unreadable copy and Reset demo behave as before. */
const CBR_ADDED = ['cbr'];
// The store names as fcpSig reads them when the page boots (stores made later on first use aren't part of a signature)
const cbrSigWithout = (skip, k0) => { k0 = k0 || FCP.cbrKeys0 || [Object.keys(STORE), Object.keys(ADMIN), Object.keys(STORE.worlds.CD1 || {})]; const s = [k0[0].filter(k => !skip.includes(k)).sort().join(','), k0[1].slice().sort().join(','), k0[2].slice().sort().join(',')].join('|'); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return FCP_V + ':' + h; };
const _restoreCBR = fcpRestore;
fcpRestore = function () {
  let up = false; FCP.cbrKeys0 = [Object.keys(STORE), Object.keys(ADMIN), Object.keys((STORE.worlds && STORE.worlds.CD1) || {})];
  try {
    const ls = fcpLS(), raw = ls && ls.getItem(FCP_KEY), o = raw ? JSON.parse(raw) : null, cur = fcpSig();
    if (o && o.v === FCP_V && o.fx === 'client' && o.sig !== cur && o.sig === cbrSigWithout(CBR_ADDED)) { o.sig = cur; o.added = CBR_ADDED.slice(); ls.setItem(FCP_KEY, JSON.stringify(o)); up = true; }
  } catch (e) { up = false; /* the original restore decides */ }
  const r = _restoreCBR.apply(this, arguments);
  if (r === 'ok') { CBR(); if (up) FCP.upgraded = CBR_ADDED.slice(); }
  return r;
};

/* ---------- Write actions: hidden on retired and archived programmes ---------- */
['cbrLt', 'cbrLtState', 'cbrDisp', 'cbrResAdd', 'cbrResNew', 'cbrResRm', 'cbrAsgNew', 'cbrAsgScope', 'cbrQKey', 'cbrMapClean', 'cbrObsLoc', 'cbrObsCrit', 'cbrObsCritRm', 'cbrObsEv', 'cbrObsGuide', 'cbrEnt', 'cbrLetterUp', 'cbrLetterUse', 'cbrLetterRestore'].forEach(n => { if (!CB_WRITE.includes(n)) CB_WRITE.push(n); });

/* ---------- Records ---------- */
UXC.push(['CBR', 'NVQ course builder — seven steps (6 Nov 2026)', [
  'Seven steps in one bar: Course Details, Curriculum & Outcomes, Assessments, Observations (shown only when the course has observations), Fees & Payment Plans, Offer Letters, Review & Publish. Each step is one page; there are no panel tabs. Old addresses open the step that now holds them (Resources & Delivery → Curriculum; Assessment types → Assessments).',
  'Course Details: learner types (label, delivery mode, displayed completion window, tutoring period, maximum window) and the display duration, versioned with the programme — provisional: recorded only, not shown to learners, never enforced. Turning observations off says what configuration is kept.',
  'Curriculum: resources at programme, unit and module level, inside the tree, from the shared library or created in place; one record wherever it is placed. Learners see Published placements in their programme, unit or module group.',
  'Assessments: assessment types, assessments by scope (whole programme, unit, module), answer keys per question (staff only), and mapping limited to the scope with coverage.',
  'Observations: Workplace and Academy side by side with Yes/No, library categories, Add criterion, per-course evidence and location guidance. Fees grouped by learner type with the total payable; provisional entitlements. Offer letters per learner type.']]);
const _aIdxCBR = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCBR(p) + `<section class="card idx-sec"><h2>CBR — Seven-step course builder</h2><ul class="idx-list">${[
  chIdxLi('New NVQ programme — Course Details', { act: 'aJump', t: 'a-programmes.new.details' }, 'CBR — start a new course.'),
  chIdxLi('Level 3 2027 update (Draft) — Assessments by scope', { act: 'aJump', t: 'a-programmes.NV-L3D.assessments' }, 'CBR — scope, answer keys, mapping.'),
  chIdxLi('Level 3 2027 update (Draft) — Observations', { act: 'aJump', t: 'a-programmes.NV-L3D.observations' }, 'CBR — Workplace and Academy side by side.')].join('')}</ul></section>`;
