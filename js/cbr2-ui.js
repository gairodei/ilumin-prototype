/* ============================================================
   CBR-2 — the approved Course Builder layout (6 Nov 2026; PD-CBR2-* in PROVISIONAL-DECISIONS.md). Loads after cbr-builder.js.
   The seven CBR steps keep their routes, data and actions; this layer gives each step the approved structure:
   1 Course Details — a two-column form (name, awarding body, level, awarding body course code, display duration, GLH, TQT, credit
     value; description below), Learner Types as compact cards (label, delivery mode, completion window), and "Observation
     required for this course" (N5a's own field: Yes / No, or not answered yet — CBC1) that shows or hides the Observations step.
   2 Curriculum & Outcomes — Programme Resources, then Unit → Module → Learning Outcome → Criterion with a Resource action at each
     level and the Add action at the end of each list.
   3 Assessments — Assessment Types with Manage Types, then Full-Course, Unit and Module assessments, each with its questions, a
     written answer key per question, criterion mapping limited to the scope, and Assessment Answer-Key Documents (new: PDF, DOC,
     DOCX for the whole assessment, versioned, staff only — d.keyDocs).
   4 Observations — Workplace and Academy columns, each with its checkbox and, below it, its categories and criteria (ticked here).
   5 Fees & Payment Plans — fee options grouped by learner type with the fields in place, Allow Deposit per option (o.dep, an
     addition to the Finance package), and the instalment options of the option.
   6 Offer Letters — one card per learner type: upload, choose template, preview, version history.
   7 Review & Publish — one compact list: summary, status, blockers and warnings per step.
   Every write goes through the existing action (or the same checks, audit and Finance re-approval). Production must enforce
   permissions and keep answer keys and their documents out of every learner payload on the server.
   ============================================================ */
'use strict';

const CBR2_UP = t => `<h3 class="cbr2-up">${esc(t)}</h3>`;
const cbr2Btn = (lbl, act, ds, cls = 'btn-ghost') => `<button class="btn btn-sm ${cls}" data-act="${act}" ${cbrDS(ds)}>${ic('plus', 13)}${esc(lbl)}</button>`;

/* ============ Step 1 — Course Details ============ */
// The approved fields, in order (two columns; the description below them). Each is the existing field, moved and relabelled.
// CBC3: Display Duration (learner-facing, cbc3-builder.js) takes the fifth place; the programme duration the payments use is no longer
// edited here — it is the Payment Schedule Duration in Fees & Payment Plans (a new course enters it with its starting fees).
const CBR2_DET = [['np-t', 'Course Name'], ['np-q-body', 'Awarding Body'], ['np-l', 'NVQ Level'], ['np-r', 'Awarding Body Course Code'], ['cbc3-dd', 'Display Duration'], ['np-q-glh', 'Guided Learning Hours (GLH)'], ['np-q-tqt', 'Total Qualification Time (TQT)'], ['np-q-credits', 'Credit Value'], ['np-ds', 'Course Description']];
function cbr2Grid(form, isNew) {
  const grid = document.createElement('div'); grid.className = 'form-grid cbr2-grid';
  CBR2_DET.forEach(([id, lab]) => {
    if (id === 'cbc3-dd') { if (typeof cbcDispField === 'function') grid.insertAdjacentHTML('beforeend', cbcDispField(form)); return; }
    const x = form.querySelector('#' + id), f = x && x.closest('.field'); if (!f) return;
    const l = f.querySelector(`:scope > label[for="${id}"]`) || f.querySelector(':scope > legend') || f.querySelector(':scope > .lbl'); if (l) l.textContent = lab;
    f.querySelectorAll(':scope > .hint:not(.e1-dur-legacy)').forEach(h => h.remove()); f.classList.remove('full');
    if (id === 'np-r') f.insertAdjacentHTML('beforeend', '<span class="hint aafa-refwhy">Required. Enter the course code provided by NCFE or the relevant awarding body.</span>');
    if (id === 'np-ds') f.classList.add('full');
    if (id === 'np-ds' && x.tagName === 'TEXTAREA') x.rows = 4;
    grid.appendChild(f);
  });
  // Everything else stays in the form (the save reads it) — hidden, except the fee options a new course is created with
  const rest = document.createElement('div'); rest.className = 'cbr2-keep';
  [...form.childNodes].forEach(n => rest.appendChild(n));
  rest.querySelectorAll('.form-grid').forEach(g => g.classList.add('cbr2-kg'));
  form.appendChild(grid);
  if (isNew) {
    const fees = document.createElement('div'); fees.className = 'cbr2-newfees';
    const pd = rest.querySelector('fieldset.e1-dur'); if (pd) { pd.removeAttribute('style'); const lg = pd.querySelector(':scope > legend'); if (lg) lg.textContent = 'Payment Schedule Duration'; pd.insertAdjacentHTML('beforeend', '<span class="hint">Sets the instalment dates. Finance approves it with the fees.</span>'); fees.appendChild(pd); }
    rest.querySelectorAll('.r1-np-l3, .r1-np-price, .cr-pm, fieldset.field:not(.cb-obs):not(.e1-dur)').forEach(n => { if (!n.querySelector('#np-obs-yes')) fees.appendChild(n); });
    if (fees.childNodes.length) { fees.insertAdjacentHTML('afterbegin', '<p class="xs muted cbr2-nfh">Needed to create the course. After saving, fees are set in Fees &amp; Payment Plans.</p>'); form.appendChild(fees); }
  }
  rest.hidden = true; form.appendChild(rest);
}
// The observation answer: N5a's own field, with its three states — Yes, No, or not answered yet (null). An unticked checkbox
// used to mean No, so saving any other field recorded No (CBC1 / CBR-01); the answer is now an explicit Yes / No and stays
// "not answered" until one is chosen. A new version answers again (N5a rule); the previous version's answer is shown.
// (The hidden radios stay in the form for the save; they follow this choice.)
function cbr2ObsBox(key, val, ed, pid) {
  const d = pid && cbPr(pid) && typeof n5Shown === 'function' ? n5Shown(cbPr(pid)) : null, prev = val == null && d && d.prevRequired != null ? ` <span class="xs muted">Version ${d.v - 1}: ${d.prevRequired ? 'Yes' : 'No'}</span>` : '';
  const r = (v, l) => `<label class="check"><input type="radio" name="cbr2-obs" id="cbr2-obs-${v}" value="${v}" data-onchange="cbr2Obs" ${cbrDS({ key, p: pid })} ${val === (v === 'yes') ? 'checked' : ''} ${ed ? '' : 'disabled'}><span>${l}</span></label>`;
  return `<fieldset class="field cbr2-obs" data-ans="${val == null ? 'none' : val ? 'yes' : 'no'}"><legend class="lbl">Observation required for this course</legend><div class="row cbr2-obs-r">${r('yes', 'Yes')}${r('no', 'No')}${val == null ? `<span class="cb-badge warn cbr2-obs-na">Not answered</span>${prev}` : ''}</div></fieldset>`;
}
INP.cbr2Obs = el => {
  const key = el.dataset.key, on = el.value === 'yes', pr = el.dataset.p ? cbPr(el.dataset.p) : null, form = $(`main .cb-det-form[data-key="${CSS.escape(key)}"]`);
  const sync = () => { const r = form && form.querySelector(`input[name="np-obs"][value="${on ? 'yes' : 'no'}"]`); if (r) { form.querySelectorAll('input[name="np-obs"]').forEach(x => { x.checked = x === r; }); } if (CB_CACHE[key]) CB_CACHE[key].r['np-obs'] = on ? 'yes' : 'no'; };
  if (!pr) { sync(); if (form) CB_CACHE[key] = cbSnap(form); return; } // a new course: saved with it
  if (!n5Gate({ dataset: { p: pr.id } }, 'change observation settings')) { render(); return; }
  const apply = () => { sync(); if (cbObsSet(pr, on, `Version ${cbDraftV(pr) || pr.version} (draft) — Course Details: Observation required ${on ? 'ticked' : 'unticked'}`)) toast(on ? 'Observation required — the Observations step is shown.' : 'No observations — the Observations step is hidden.'); render(); };
  const imp = !on && cbObsOf(pr) === true ? cbrObsImpact(pr) : [];
  if (!imp.length) return apply();
  confirmDlg({ title: 'Turn observations off for this version?', ok: 'Turn observations off', cancel: 'Keep observations', danger: true, body: `<p class="small">This draft has observation configuration:</p><ul class="small">${imp.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small">Nothing is deleted: it is kept with the draft and comes back if you tick the box again. Published versions and learners' observation records don't change.</p>`,
    onOk: () => { closeModal(); apply(); } });
  render(); // until confirmed, the box shows the saved answer
};
// Saving: Save draft keeps a "not answered" observation answer as it is (the other fields are saved); Next and creating the course
// need Yes or No (CBC1 / CBR-01). Nothing here ever chooses an answer for the administrator.
let CBR2_KEEP_NA = false;
const cbr2NoAns = () => !!$('main #cbr2-obs-yes') && !$('main input[name="np-obs"]:checked');
const cbr2AskAns = () => (fieldErr('#cbr2-obs-yes', 'Choose Yes or No — is observation required for this course?'), null);
const _xCBR2 = cbExtras;
cbExtras = function (pr) {
  if (!cbr2NoAns()) return _xCBR2.apply(this, arguments);
  if (!pr || !CBR2_KEEP_NA) return cbr2AskAns();
  // the other fields go through the existing checks; the answer is reported as null (not recorded), so cbObsSet changes nothing
  const r = $('main input[name="np-obs"][value="no"]'); if (!r) return _xCBR2.apply(this, arguments);
  r.checked = true; try { const x = _xCBR2.apply(this, arguments); return x && { ...x, obs: null }; } finally { r.checked = false; }
};
const _saveCBR2 = ACT.cbDetSave;
ACT.cbDetSave = function (el) { CBR2_KEEP_NA = !(el && el.dataset && el.dataset.next); try { return _saveCBR2.apply(this, arguments); } finally { CBR2_KEEP_NA = false; } };
// Next with nothing to save still needs the answer while it can be given here
const _nextCBR2 = ACT.cbrDetNext;
ACT.cbrDetNext = function (el) { const pr = cbPr(el && el.dataset && el.dataset.id); if (pr && !CB_CACHE[pr.id] && cbObsEditable(pr) && cbObsOf(pr) == null) return cbr2AskAns(); return _nextCBR2.apply(this, arguments); };

// Learner types: one compact card each — Label and Delivery Mode on one row, then the Completion Window. The tutoring period and
// maximum window stay in the model (CBR-1) and aren't shown here. Edited in place, through the same gate and audit.
function cbr2LtCard(pr, t, ed) {
  const P = { p: pr.id, t: t.id }, id = 'lt2-' + t.id.replace(/\W/g, ''), dis = ed ? '' : 'disabled';
  if (!ed) return `<div class="cbr2-lt cbr2-ltro" data-t="${esc(t.id)}"><div class="cbr2-lt-r"><div class="field"><span class="lbl">Label</span><div class="cbr2-ro">${esc(t.label)}</div></div><div class="field"><span class="lbl">Delivery Mode</span><div class="cbr2-ro">${esc(t.mode)}</div></div></div><div class="field"><span class="lbl">Completion Window</span><div class="cbr2-ro">${esc(cbrPer(t.win) || 'Not set')}</div></div></div>`;
  return `<div class="cbr2-lt" data-t="${esc(t.id)}"><div class="cbr2-lt-r"><div class="field"><label for="${id}-l">Label</label><input class="input" id="${id}-l" maxlength="60" value="${esc(t.label)}" data-onchange="cbr2Lt" ${cbrDS({ ...P, f: 'label' })} ${dis}></div>
    <div class="field"><label for="${id}-m">Delivery Mode</label><select class="select" id="${id}-m" data-onchange="cbr2Lt" ${cbrDS({ ...P, f: 'mode' })} ${dis}>${R1_MODES.map(m => `<option ${t.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div>
    <div class="field cbr2-win"><label for="${id}-w">Completion Window</label><div class="row cbr-per-r"><input class="input num" type="number" min="1" max="60" step="1" inputmode="numeric" id="${id}-w" value="${t.win && t.win.n ? t.win.n : ''}" data-onchange="cbr2Lt" ${cbrDS({ ...P, f: 'win' })} ${dis}><select class="select" id="${id}-wu" aria-label="Completion Window unit" data-onchange="cbr2Lt" ${cbrDS({ ...P, f: 'win' })} ${dis}>${CBR_UNITS.map(([k, l]) => `<option value="${k}" ${(t.win ? t.win.unit : 'months') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    ${ed ? `<button class="btn btn-sm btn-ghost cbr2-lt-rm" data-act="cbr2LtRm" ${cbrDS(P)} aria-label="Remove ${esc(t.label)}">Remove</button>` : ''}</div>`;
}
function cbr2LtSection(pr) {
  const v = cbrCfgV(pr), ed = !!v && cbAdmin(), list = cbrTypes(pr);
  return `<section class="cbr2-lts"><div class="row-b"><h3>Learner Types</h3>${ed ? cbr2Btn('Add Learner Type', 'cbr2LtAdd', { p: pr.id }, '') : ''}</div>
    ${list.length ? `<div class="cbr2-ltl">${list.map(t => cbr2LtCard(pr, t, ed)).join('')}</div>` : `<p class="small muted">No learner types yet.${typeof crModesHtml === 'function' ? ` <span class="cbr2-modes cr-dm-ro"><span class="lbl">Delivery modes offered</span> ${crModesHtml(pr)}${typeof crFeesGo === 'function' && cbAdmin() && !cbRetired(pr) ? ' ' + crFeesGo(pr) : ''}</span>` : ''}</p>`}</section>`;
}
INP.cbr2Lt = el => {
  const g = cbrCfgGate(el, 'change a learner type'); if (!g) { render(); return; } const { pr, v } = g, cur = cbrTypesAll(pr, v).find(t => t.id === el.dataset.t);
  if (!cur) { toast('Learner type not found.', 'err'); render(); return; }
  const card = el.closest('.cbr2-lt'), f = el.dataset.f, sel = s => '#' + CSS.escape(card.querySelector(s).id), nx = {};
  if (f === 'label') { const l = el.value.replace(/\s+/g, ' ').trim(); if (!l) return fieldErr('#' + CSS.escape(el.id), 'Enter a label'); if (cbrTypes(pr, v).some(t => t.id !== cur.id && t.label.toLowerCase() === l.toLowerCase())) return fieldErr('#' + CSS.escape(el.id), 'Another learner type has this label'); nx.label = l; }
  if (f === 'mode') { if (!R1_MODES.includes(el.value)) return fieldErr('#' + CSS.escape(el.id), 'Choose the delivery mode'); nx.mode = el.value; }
  if (f === 'win') { const n = card.querySelector('input[data-f="win"]'), u = card.querySelector('select[data-f="win"]'), s = n.value.trim();
    if (s !== '' && (!/^\d{1,2}$/.test(s) || +s < 1 || +s > 60)) return fieldErr(sel('input[data-f="win"]'), 'Enter the completion window as a whole number from 1 to 60, or leave it blank');
    nx.win = s === '' ? null : { n: +s, unit: u.value === 'weeks' ? 'weeks' : 'months' };
    if (nx.win && cur.max && cbrPerW(cur.max) < cbrPerW(nx.win)) return fieldErr(sel('input[data-f="win"]'), `Longer than this type's recorded maximum window (${cbrPer(cur.max)})`); }
  const W = cbrCfgW(pr, v), t = W.types.find(x => x.id === cur.id) || W.types.find(x => x.label === cur.label && x.mode === cur.mode), was = cbrLtTxt(t);
  Object.assign(t, nx); if (cbrLtTxt(t) === was) return;
  logA('NVQ Programmes', cbEnt(pr), 'Learner type changed', was, cbrLtTxt(t), `Version ${v} (draft) — Course Details`); render();
};
ACT.cbr2LtAdd = el => {
  const g = cbrCfgGate(el, 'add a learner type'); if (!g) return; const { pr, v } = g;
  openModal({ title: 'Add Learner Type', body: `<div class="form-grid"><div class="field"><label for="lt-l">Label</label><input class="input" id="lt-l" maxlength="60"></div><div class="field"><label for="lt-m">Delivery Mode</label><select class="select" id="lt-m"><option value="">Choose…</option>${R1_MODES.map(m => `<option>${m}</option>`).join('')}</select></div>${cbrPerField('lt-w', 'Completion Window', null)}</div>`,
    actions: [{ label: 'Cancel' }, { label: 'Add Learner Type', cls: 'btn-primary', fn: () => {
      const g2 = cbrCfgGate(el, 'add a learner type'); if (!g2 || g2.v !== v) { closeModal(); return false; }
      const label = mval('#lt-l').replace(/\s+/g, ' '), mode = mval('#lt-m'), w = cbrPerRead('lt-w', 'The completion window');
      if (!label) return fieldErr('#lt-l', 'Enter a label'), false;
      if (cbrTypes(pr, v).some(t => t.label.toLowerCase() === label.toLowerCase())) return fieldErr('#lt-l', 'Another learner type has this label'), false;
      if (!R1_MODES.includes(mode)) return fieldErr('#lt-m', 'Choose the delivery mode'), false; if (w.err) return fieldErr(...w.err), false;
      const t = { id: 'LT-' + (++CBR().n), label, mode, win: w.v, tut: null, max: null, status: 'Active' }; cbrCfgW(pr, v).types.push(t);
      logA('NVQ Programmes', cbEnt(pr), 'Learner type added', '—', `${t.id} · ${cbrLtTxt(t)}`, `Version ${v} (draft) — Course Details`); render(); toast(`${label} added.`);
    } }] });
};
// Remove: the type is kept in the version's record as Removed (history); refused while it is the last one, or while active fee
// options of the package are grouped under it and no other learner type has their delivery mode
ACT.cbr2LtRm = el => {
  const g = cbrCfgGate(el, 'remove a learner type'); if (!g) return; const { pr, v } = g, cur = cbrTypes(pr, v).find(t => t.id === el.dataset.t); if (!cur) return;
  const no = why => { logA('NVQ Programmes', cbEnt(pr), 'Blocked: remove a learner type', cur.label, '—', why); toast(why, 'err'); };
  if (cbrTypes(pr, v).length === 1) return no('A course needs at least one learner type.');
  const opts = cb8Managed(pr) ? cb8Work(pr).opts.filter(o => o.status === 'Active' && o.mode === cur.mode) : [];
  if (opts.length && !cbrTypes(pr, v).some(t => t.id !== cur.id && t.mode === cur.mode)) return no(`${cur.label} has fee options (${opts.map(o => o.label).join(', ')}). Retire or change them in Fees & Payment Plans first.`);
  confirmDlg({ title: `Remove ${esc(cur.label)}?`, ok: 'Remove learner type', body: `<p class="small">It is removed from Version ${v} (draft). Its record is kept in the version history; published versions, fee options and signed letters don't change.</p>`, onOk: () => {
    const g2 = cbrCfgGate(el, 'remove a learner type'); if (!g2) { closeModal(); return; } const W = cbrCfgW(pr, v), t = W.types.find(x => x.id === cur.id) || W.types.find(x => x.label === cur.label && x.mode === cur.mode);
    t.status = 'Retired'; logA('NVQ Programmes', cbEnt(pr), 'Learner type removed', `${t.id} · ${t.label}`, 'Removed (kept in the version record)', `Version ${v} (draft) — Course Details`); closeModal(); render(); } });
};
// Read-only: the same order and layout
function cbr2DetView(pr) {
  const q = pr.qual || {}, nr = '<span class="muted">Not recorded</span>', f = (l, v, full) => `<div class="field${full ? ' full' : ''}"><span class="lbl">${l}</span><div class="cbr2-ro">${v}</div></div>`;
  return `<div class="form-grid cbr2-grid cbr2-view cb-dl">${f('Course Name', esc(pr.title))}${f('Awarding Body', q.body ? esc(q.body) : nr)}${f('NVQ Level', esc(pr.level))}${f('Awarding Body Course Code', pr.ref ? `<span class="mono">${esc(pr.ref)}</span>` : nr)}
    ${f('Display Duration', cbcDispView(pr) + (cbrCfgV(pr) && cbAdmin() && !cbDetEditable(pr) ? ` <button class="btn btn-sm btn-ghost" data-act="cbrDisp" data-p="${esc(pr.id)}" aria-label="Edit the Display Duration">Edit</button>` : ''))}${f('Guided Learning Hours (GLH)', q.glh != null ? esc(String(q.glh)) : nr)}${f('Total Qualification Time (TQT)', q.tqt != null ? esc(String(q.tqt)) : nr)}${f('Credit Value', q.credits != null ? esc(String(q.credits)) : nr)}${f('Course Description', pr.desc ? esc(pr.desc) : '<span class="muted">—</span>', true)}${pr.code ? f('Former Academy course code', `<span class="mono">${esc(pr.code)}</span> <span class="xs muted">Kept for history — no longer entered.</span>`) : ''}</div>`;
}
function cbr2Details(pr) {
  const ed = cbDetEditable(pr);
  let top;
  if (ed) {
    const p = cbPanels(pr, 'details'), d = document.createElement('div'); d.innerHTML = p.length ? p[0][2]() : '';
    const form = d.querySelector('.cb-det-form'); if (form) cbr2Grid(form, false);
    d.querySelectorAll('.cb-det-acts, section.cb-details > h2, details.cbr-audit, .cbr-fold.cbr-audit').forEach(n => n.remove());
    const sec = d.querySelector('section.cb-details'); top = (d.querySelector('.cb-unsaved') ? d.querySelector('.cb-unsaved').outerHTML : '') + (sec ? sec.innerHTML : '');
  } else top = `${cbRetired(pr) || cbrArch(pr) ? '' : `<p class="xs muted cbr2-why">${ic('lock', 12)} ${pr.chNew ? (pr.status === 'Draft' ? 'Only the Super Admin, Academic Admin and System Admin edit a Draft\'s details.' : `Version ${pr.version} is published, so its details are fixed for its learners.`) : 'Read-only: this programme was set up before the course builder.'}</p>`}${cbr2DetView(pr)}`;
  const obsEd = cbObsEditable(pr), c = CB_CACHE[pr.id], val = c && c.r['np-obs'] ? c.r['np-obs'] === 'yes' : cbObsOf(pr);
  return `<section class="card cbr2-det">${top}${cbr2LtSection(pr)}<hr class="cbr2-hr">${cbr2ObsBox(pr.id, val, obsEd, pr.id)}${ed ? cbr2DetHist(pr) : ''}</section>`;
}
// The change history the details form had at b096bf8 (CBC1): the same audit records and matcher (cbDetails), folded, read-only.
// Shown where it was — on a Draft whose details this administrator can edit.
const cbr2DetHist = pr => { const m = a => a.module === 'NVQ Programmes' && String(a.entity || '').includes(pr.id), n = ADMIN.audit.filter(m).length;
  return `<details class="cbr-fold cbr2-dethist" data-p="${esc(pr.id)}" ${ui('cbr2H.' + pr.id) ? 'open' : ''}><summary>${ic('clock', 14)} Change history (${n})</summary><div class="cbr-fold-b">${auditPanel(m, 'Course details change history')}</div></details>`; };
// collapsed by default; once opened it stays open while its filters and pages redraw the step
document.addEventListener('toggle', e => { const t = e.target; if (t && t.matches && t.matches('details.cbr2-dethist')) setUi('cbr2H.' + t.dataset.p, t.open ? '1' : ''); }, true);
// A new course (not saved yet): the same form; its learner types come from the fee options it is created with
const _pbCBR2 = progBuilder;
progBuilder = function (id) {
  const h = _pbCBR2.apply(this, arguments); if (id !== 'new' || !/cb-det-form/.test(h)) return h;
  const d = document.createElement('div'); d.innerHTML = h; const form = d.querySelector('.cb-det-form.cb-new'); if (!form) return h;
  const val = form.querySelector('#np-obs-yes:checked') ? true : form.querySelector('#np-obs-no:checked') ? false : null; cbr2Grid(form, true);
  form.insertAdjacentHTML('afterend', `<hr class="cbr2-hr">${cbr2ObsBox('new', val, true, '')}`);
  d.querySelectorAll('section.cb-details > h2, .cb-newpage > .note.b-blue').forEach(n => n.remove());
  return d.innerHTML;
};

/* ============ Step 2 — Curriculum & Outcomes ============ */
// One Resource action per level: choose from the library or create a new resource (each with its own permission)
function cbr2Res(pr, lvl, unit, mod, ed) {
  const items = cbrResAt(pr, lvl, unit, mod), P = { p: pr.id, lvl, u: unit, m: mod };
  const li = ({ r, a }) => `<li class="cbr-ri" data-r="${esc(r.id)}"><span class="cbr-rt">${esc(r.title)}</span><span class="xs muted">${esc(r.type)} · v${r.version}${r.rel && r.rel.k !== 'now' ? ' · ' + esc(s4bRelTxt(r)) : ''}</span>${r.status !== 'Published' ? chip(r.status, r.status === 'Draft' ? 'amber' : 'grey') : ''}<span class="row cbr2-ra"><button class="btn btn-sm btn-ghost" data-act="s4bPrev" data-id="${esc(r.id)}" aria-label="Preview ${esc(r.title)}">Preview</button>${ed && r.status === 'Draft' ? `<button class="btn btn-sm btn-ghost" data-act="s4bPub" data-id="${esc(r.id)}">Publish</button>` : ''}${ed && a ? `<button class="btn btn-sm btn-ghost" data-act="cbrResRm" ${cbrDS({ p: pr.id, a: a.id })} aria-label="Remove ${esc(r.title)} from ${esc(cbrWhere(lvl, unit, mod))}">Remove</button>` : ''}</span></li>`;
  const head = lvl === 'prog' ? `<div class="row-b cbr2-resh"><h3>Programme Resources</h3>${ed ? cbr2Btn('Add Resource', 'cbr2Res', P, '') : ''}</div>` : ed ? cbr2Btn('Resource', 'cbr2Res', P) : '';
  return `<div class="cbr-res cbr2-res" data-lvl="${lvl}"${unit ? ` data-u="${esc(unit)}"` : ''}${mod ? ` data-m="${esc(mod)}"` : ''}>${head}${items.length ? `<ul class="cbr-res-l">${items.map(li).join('')}</ul>` : lvl === 'prog' ? '<p class="xs muted">None yet.</p>' : ''}</div>`;
}
ACT.cbr2Res = el => {
  const pr = cbPr(el.dataset.p), x = el.dataset; if (!pr) return;
  if (!cbrResCan(pr)) return s4bRefuse('Learning Resources', cbEnt(pr), 'place resources in the curriculum');
  const canNew = s4bCanRes('add', null, pr.id), P = cbrDS({ p: pr.id, lvl: x.lvl, u: x.u, m: x.m });
  openModal({ title: 'Resource — ' + esc(cbrWhere(x.lvl, x.u, x.m)), body: `<div class="cbr2-pick"><button class="btn" data-act="cbr2ResGo" data-k="lib" ${P}>${ic('layers', 15)}Select from the library</button><button class="btn" data-act="cbr2ResGo" data-k="new" ${P} ${canNew ? '' : 'disabled title="Your role can\'t create resources"'}>${ic('plus', 15)}Create a new resource</button></div><p class="xs muted">A library resource is the same record wherever it is placed — the file isn't copied.</p>`, actions: [{ label: 'Cancel' }] });
};
ACT.cbr2ResGo = el => { closeModal(); ACT[el.dataset.k === 'new' ? 'cbrResNew' : 'cbrResAdd']({ dataset: { ...el.dataset } }); };
function cbr2Cur(pr) {
  const p = cbPanels(pr, 'curriculum'), st = p.find(x => x[0] === 'structure') || p[0], d = document.createElement('div'); d.innerHTML = st ? st[2]() : '';
  const sel = cbCurSel(pr), tree = sel ? cbTree(pr, sel) || [] : [], ed = cbrResCan(pr), cur = d.querySelector('section.cb-cur'); if (!cur) return d.innerHTML;
  // explanations and the editable-draft banner are not part of the approved layout (the step footer says where changes go)
  d.querySelectorAll('details').forEach(x => { const s = x.querySelector(':scope > summary'); if (s && /How the curriculum/.test(s.textContent)) x.remove(); });
  cur.querySelectorAll(':scope > p.small.muted, :scope > p.xs.muted, :scope > .cb-cur-sum').forEach(n => { if (!n.classList.contains('cb-cur-miss') && !n.classList.contains('cb-cur-obsno')) n.remove(); });
  cur.querySelectorAll(':scope > .note').forEach(n => { if (/Changes are saved straight away/.test(n.textContent)) n.remove(); }); // a draft version's banner stays: learners stay on the published version
  const head = cur.querySelector(':scope > .row-b'), addU = head && head.querySelector('[data-act="ch8AddUnit"], [data-act="nodeAdd"]'); if (head) head.remove();
  const orph = cbrAttsLive(pr.id).filter(a => a.lvl !== 'prog' && !tree.some(u => u.code === a.unit && (a.lvl === 'unit' || u.mods.some(m => m.code === a.mod))));
  cur.insertAdjacentHTML('afterbegin', `<div id="cbr-resources">${cbr2Res(pr, 'prog', null, null, ed)}${orph.length ? `<p class="xs cbr-orph">${ic('alert', 12)} ${plural(orph.length, 'placement refers', 'placements refer')} to a unit or module that isn't in Version ${sel}: ${esc(orph.map(a => (s4bRes(a.rid) || {}).title + ' → ' + cbrWhere(a.lvl, a.unit, a.mod)).join('; '))}.</p>` : ''}</div>`);
  const relabel = (sum, txt) => { const t = sum.querySelector(':scope > .cb-cur-t'); if (!t) return; const lab = t.querySelector(':scope > .xs.muted'), code = t.querySelector(':scope > .code'), name = t.querySelector(':scope > strong'); t.querySelectorAll(':scope > .cb-cur-n').forEach(n => n.remove()); if (lab) { lab.className = 'cbr2-lvl'; lab.textContent = txt + ' —'; } if (code && name) { code.classList.add('cbr2-code'); name.after(code); } };
  const toEnd = (btn, box, lbl) => { if (!btn || !box) return; btn.classList.add('btn-ghost', 'cbr2-add'); btn.lastChild.textContent = lbl; box.appendChild(btn); };
  cur.querySelectorAll('details[data-cbu]').forEach((du, ui_) => {
    const u = tree.find(x => x.code === du.dataset.cbu), sum = du.querySelector(':scope > summary'), kids = du.querySelector(':scope > .kids'); if (!u || !sum || !kids) return;
    relabel(sum, `Unit ${ui_ + 1}`);
    const acts = sum.querySelector(':scope > .cb-acts'), eb = acts && acts.querySelector('[data-act="cbCurEdit"]'); if (eb) eb.lastChild.textContent = 'Edit Unit';
    const addM = acts && acts.querySelector('[data-act="ch8AddMod"], [data-act="nodeAdd"][data-lvl="mod"]');
    kids.insertAdjacentHTML('afterbegin', cbr2Res(pr, 'unit', u.code, null, ed));
    kids.querySelectorAll(':scope > details.cb-cur-m').forEach((dm, mi) => {
      const m = u.mods[mi], ms = dm.querySelector(':scope > summary'), k2 = dm.querySelector(':scope > .kids'); if (!m || !ms || !k2) return; dm.dataset.cbm = m.code;
      relabel(ms, `Module ${ui_ + 1}.${mi + 1}`);
      const ma = ms.querySelector(':scope > .cb-acts'), addL = ma && ma.querySelector('[data-act="ch8AddLo"], [data-act="nodeAdd"][data-lvl="lo"]');
      k2.insertAdjacentHTML('afterbegin', cbr2Res(pr, 'mod', u.code, m.code, ed));
      k2.querySelectorAll(':scope > .cb-cur-lo').forEach(lo => {
        const h = lo.querySelector(':scope > .cb-cur-loh'), t = h && h.querySelector(':scope > .cb-cur-t'), code = t && t.querySelector(':scope > .code'), name = t && t.querySelector(':scope > strong');
        if (t && code && name) { const n = String(code.textContent).replace(/\D/g, '') || code.textContent, desc = document.createElement('p'); desc.className = 'cbr2-lod'; desc.textContent = name.textContent; name.textContent = `Learning Outcome ${n}`; code.classList.add('cbr2-code'); code.title = 'Learning Outcome code'; name.after(code); h.after(desc); }
        lo.querySelectorAll(':scope > .cb-cur-guide').forEach(g => { if (!/Choose an assessment type/.test(g.textContent)) g.remove(); });
        lo.querySelectorAll(':scope > ul.cb-cur-crit > li.cb-cur-c').forEach(c => { const cd = c.querySelector('.cb-cur-t > .code'); if (cd) { const full = cd.textContent; cd.title = full; cd.textContent = full.split(' ').pop(); cd.insertAdjacentHTML('beforebegin', '<span class="cbr2-lvl">Criterion</span> '); } });
        const addC = h && h.querySelector('[data-act="ch8AddCrit"], [data-act="nodeAdd"][data-lvl="crit"]'); toEnd(addC, lo, 'Add Criterion');
      });
      const mrow = k2.querySelector(':scope > .cb-cur-mod'), res = k2.querySelector(':scope > .cbr2-res'); if (mrow && res) res.after(mrow);
      toEnd(addL, k2, 'Add Learning Outcome');
    });
    toEnd(addM, kids, 'Add Module');
  });
  const treeEl = cur.querySelector('.cb-cur-tree');
  if (addU && treeEl) { addU.className = 'btn btn-sm cbr2-add cbr2-addu'; addU.lastChild.textContent = 'Add Unit'; treeEl.after(addU); }
  return d.innerHTML;
}

/* ============ Step 3 — Assessments ============ */
/* Assessment answer-key documents (d.keyDocs): documents for the whole assessment, alongside the written key of each question.
   { id, status: 'Active' | 'Removed', vers: [{ v, file, kind, at, by, note }] }. Replacing adds a version; removing (Draft only) keeps
   the record. Publishing freezes the versions in force with the assessment version (d.keyDocsPub[version]). Staff only: programme
   administrators manage them; they and the assessor marking the assessment can open them. Learners' copies never receive them. */
const CBR2_KEY_EXT = ['pdf', 'doc', 'docx'];
const cbr2Docs = d => d.keyDocs || []; // read-only: rendering never adds the field to a record
const cbr2DocCur = x => x.vers[x.vers.length - 1];
const cbr2Ext = f => (String(f).match(/\.([a-z0-9]+)$/i) || [])[1] || '';
const cbr2KeyEdit = (pr, d) => cbAsgCan() && !!pr && !cbRetired(pr) && !cbrArch(pr) && d.status !== 'Retired';
// Who may open an answer key: programme administrators, and an assessor whose caseload includes a submission to this assessment.
// CBC4: the staff member must hold the Assessor role — a Teacher's list covers every learner of their batches (not a marking
// caseload), so a Teacher could open a key by calling the handler directly; an Assessor's list is their allocation (chScoped).
function cbr2KeyView(d) {
  if (cbAsgCan()) return true;
  if (S.portal !== 'staff' || typeof tasSubs !== 'function' || !(typeof hasRole === 'function' && hasRole('Assessor'))) return false;
  try { return tasSubs(true).some(s => { const a = tasAsg(s); return a && a.id === d.id; }); } catch (e) { return false; }
}
const cbr2KeyNo = (d, what, msg) => { s2Log(d || { title: '—' }, 'Blocked: ' + what, '—', '—', 'Answer keys are restricted to authorised academic staff'); toast(msg || 'Answer keys are restricted to authorised academic staff.', 'err'); return null; };
INP.cbr2DocFile = el => { const n = [...(el.files || [])].map(f => f.name); setUi('cbr2Files', n.join('|')); const s = $('#modal-root #ak-fn'); if (s) s.textContent = n.join(', ') || 'No file chosen'; };
ACT.cbr2DocSample = () => { setUi('cbr2Files', 'Assessment answer key.pdf|Marking guidance.docx'); const s = $('#modal-root #ak-fn'); if (s) s.textContent = 'Assessment answer key.pdf, Marking guidance.docx'; };
ACT.cbr2DocUp = el => {
  const d = s2Def(el.dataset.id), pr = d && cbPr(cbAsgPid(d)); if (!d) return;
  const rep = el.dataset.doc ? cbr2Docs(d).find(x => x.id === el.dataset.doc && x.status === 'Active') : null, what = rep ? 'replace an answer-key document' : 'upload an answer-key document';
  if (!cbr2KeyEdit(pr, d)) return cbr2KeyNo(d, what, cbAsgCan() ? 'This assessment or programme is read-only.' : null);
  if (el.dataset.doc && !rep) { toast('Document not found.', 'err'); return; }
  setUi('cbr2Files', '');
  openModal({ title: rep ? `Replace — ${esc(cbr2DocCur(rep).file)}` : 'Upload Answer Key', sub: esc(d.title), body: `<div class="field"><label for="ak-f">${rep ? 'New version (PDF, DOC or DOCX)' : 'Documents (PDF, DOC or DOCX — one or more)'}</label><input class="input" type="file" id="ak-f" accept=".pdf,.doc,.docx" ${rep ? '' : 'multiple'} data-onchange="cbr2DocFile"><span class="hint"><span id="ak-fn">No file chosen</span> — the prototype records the file name; the file itself is simulated.</span>${rep ? '' : '<button type="button" class="linklike small" data-act="cbr2DocSample">Prototype: use sample files</button>'}</div>
    <div class="field"><label for="ak-n">Note (optional)</label><input class="input" id="ak-n" maxlength="200" placeholder="${rep ? 'What changed' : 'e.g. Model answers for all questions'}"></div><p class="xs muted">${ic('lock', 12)} Staff only — never shown to learners.</p>`,
    actions: [{ label: 'Cancel' }, { label: rep ? 'Upload new version' : 'Upload', cls: 'btn-primary', fn: () => {
      if (!cbr2KeyEdit(pr, d)) { closeModal(); return cbr2KeyNo(d, what), false; }
      const files = ui('cbr2Files', '').split('|').filter(Boolean); if (!files.length) return fieldErr('#ak-f', 'Choose a file'), false;
      const bad = files.filter(f => !CBR2_KEY_EXT.includes(cbr2Ext(f).toLowerCase())); if (bad.length) return fieldErr('#ak-f', `Upload PDF, DOC or DOCX files only (${bad.join(', ')})`), false;
      if (rep && files.length > 1) return fieldErr('#ak-f', 'Choose one file to replace this document'), false;
      const at = now().toISOString(), by = cbrMe(), note = mval('#ak-n');
      if (rep) { const was = cbr2DocCur(rep); rep.vers.push({ v: was.v + 1, file: files[0], kind: cbr2Ext(files[0]).toUpperCase(), at, by, note: note || 'Replaced' }); s2Log(d, 'Answer-key document replaced', `${rep.id} v${was.v} · ${was.file}`, `${rep.id} v${was.v + 1} · ${files[0]}`, note); toast(`${rep.id} — version ${was.v + 1} saved.`); }
      else { files.forEach(f => { const x = { id: 'AK-' + (++CBR().n), status: 'Active', vers: [{ v: 1, file: f, kind: cbr2Ext(f).toUpperCase(), at, by, note: note || 'First version' }] }; (d.keyDocs = d.keyDocs || []).push(x); s2Log(d, 'Answer-key document uploaded', '—', `${x.id} · ${f}`, note); }); toast(`${plural(files.length, 'document')} uploaded.`); }
      render();
    } }] });
};
ACT.cbr2DocRm = el => {
  const d = s2Def(el.dataset.id), pr = d && cbPr(cbAsgPid(d)), x = d && cbr2Docs(d).find(y => y.id === el.dataset.doc && y.status === 'Active'); if (!d) return;
  if (!cbr2KeyEdit(pr, d)) return cbr2KeyNo(d, 'remove an answer-key document');
  if (!x) return;
  if (d.status !== 'Draft') { s2Log(d, 'Blocked: remove an answer-key document (published)', x.id, x.id, 'A published assessment keeps its documents — replace it with a new version instead'); toast('A published assessment keeps its answer-key documents. Upload a new version instead.', 'err'); return; }
  confirmDlg({ title: `Remove ${esc(cbr2DocCur(x).file)}?`, ok: 'Remove document', body: '<p class="small">It is removed from this Draft. Its versions stay in the record; any version frozen with an earlier published version is kept with it.</p>', onOk: () => {
    if (!cbr2KeyEdit(pr, d) || d.status !== 'Draft') { closeModal(); return; } x.status = 'Removed'; x.rmAt = now().toISOString(); x.rmBy = cbrMe(); s2Log(d, 'Answer-key document removed (Draft)', `${x.id} · ${cbr2DocCur(x).file}`, '—', 'Versions kept in the record'); closeModal(); render(); } });
};
ACT.cbr2DocView = el => {
  const d = s2Def(el.dataset.id), x = d && cbr2Docs(d).find(y => y.id === el.dataset.doc); if (!d) return;
  if (!cbr2KeyView(d)) return cbr2KeyNo(d, 'open an answer-key document');
  if (!x) return; const v = el.dataset.v ? x.vers.find(y => y.v === +el.dataset.v) : cbr2DocCur(x); if (!v) return;
  if (S.portal === 'staff') s2Log(d, 'Answer-key document opened (assessor)', '—', `${x.id} v${v.v}`, '');
  const pubs = Object.entries(d.keyDocsPub || {}).filter(([, l]) => l.some(y => y.id === x.id)).map(([av, l]) => `Assessment version ${av}: v${l.find(y => y.id === x.id).v}`);
  openModal({ title: esc(v.file), sub: `${esc(x.id)} · version ${v.v} · ${esc(v.kind)}`, size: 'lg', body: `<div class="note b-grey">${ic('lock')}<div class="small">Answer key — staff only. The prototype simulates the file: in production it opens from secure storage for authorised staff.</div></div>
    <dl class="kv"><dt>Uploaded</dt><dd>${fd(v.at)} · ${esc(v.by)}</dd><dt>Note</dt><dd>${esc(v.note || '—')}</dd><dt>Frozen with</dt><dd>${pubs.length ? esc(pubs.join(' · ')) : 'Not yet published'}</dd></dl>
    ${x.vers.length > 1 ? `<h3 class="small">Versions</h3><ol class="list small">${x.vers.slice().reverse().map(y => `<li class="li"><div class="li-b"><span>v${y.v} · <span class="mono">${esc(y.file)}</span></span><span class="xs muted">${fd(y.at)} · ${esc(y.by)} · ${esc(y.note || '')}</span></div>${y.v !== v.v ? `<button class="btn btn-sm btn-ghost" data-act="cbr2DocView" ${cbrDS({ id: d.id, doc: x.id, v: y.v })}>Open</button>` : ''}</li>`).join('')}</ol>` : ''}`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
// Publishing freezes the documents in force with the assessment version
const _pubCBR2 = ACT.pubAsg;
const cbr2Freeze = d => { const l = cbr2Docs(d).filter(x => x.status === 'Active').map(x => Object.freeze({ id: x.id, v: cbr2DocCur(x).v, file: cbr2DocCur(x).file })); d.keyDocsPub = { ...(d.keyDocsPub || {}), [d.version]: Object.freeze(l) }; if (l.length) s2Log(d, 'Answer-key documents frozen with the published version', '—', l.map(x => `${x.id} v${x.v}`).join(', '), `Assessment version ${d.version}`); };
ACT.pubAsg = el => {
  const d = el && el.dataset && s2Def(el.dataset.id), was = d && d.status, r = _pubCBR2(el);
  if (d && was === 'Draft') {
    if (d.status === 'Published') cbr2Freeze(d);
    else if (MODAL) { const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a && typeof a.fn === 'function') { const g = a.fn; a.fn = function () { const res = g.apply(this, arguments); if (d.status === 'Published') cbr2Freeze(d); return res; }; } } // published when the dialog is confirmed
  }
  return r;
};
// Learners' copies never receive answer-key documents (nor the written keys — CBR-1)
const _copyCBR2 = s2CopyTo;
s2CopyTo = function (v, d) { const r = _copyCBR2.apply(this, arguments), a = STORE.worlds[v] && STORE.worlds[v].assignments.find(x => x.id === d.id); if (a) { delete a.keyDocs; delete a.keyDocsPub; } return r; };
function cbr2DocList(pr, d) {
  const L = cbr2Docs(d).filter(x => x.status === 'Active'), ed = cbr2KeyEdit(pr, d);
  return `<div class="cbr2-docs" data-id="${d.id}"><div class="row-b"><h5>Assessment Answer-Key Documents</h5>${ed ? `<button class="btn btn-sm" data-act="cbr2DocUp" data-id="${d.id}">${ic('upload', 13)}Upload Answer Key</button>` : ''}</div>
    ${L.length ? `<ul class="cbr2-docl">${L.map(x => { const v = cbr2DocCur(x); return `<li data-doc="${x.id}"><span class="typebadge">${esc(v.kind)}</span><span class="cbr2-docn">${esc(v.file)}</span><span class="xs muted">v${v.v} · ${esc(v.by)}, ${fd(v.at)}</span><span class="row"><button class="btn btn-sm btn-ghost" data-act="cbr2DocView" ${cbrDS({ id: d.id, doc: x.id })}>View</button>${ed ? `<button class="btn btn-sm btn-ghost" data-act="cbr2DocUp" ${cbrDS({ id: d.id, doc: x.id })}>Replace</button>${d.status === 'Draft' ? `<button class="btn btn-sm btn-ghost" data-act="cbr2DocRm" ${cbrDS({ id: d.id, doc: x.id })}>Remove</button>` : ''}` : ''}</span></li>`; }).join('')}</ul>` : '<p class="xs muted">None uploaded.</p>'}</div>`;
}
// The written answer key of one question, edited in place (the same permission and audit as CBR-1's dialog)
INP.cbr2Key = el => {
  const d = s2Def(el.dataset.id), q = d && d.qs.find(x => x.id === el.dataset.q), pr = d && cbrAsgGate(cbPr(cbAsgPid(d)), 'change an answer key'); if (!d || !q || !pr) { render(); return; }
  if (d.status === 'Retired') { toast('A retired assessment can\'t be changed.', 'err'); render(); return; }
  const t = el.value.trim(), n = d.qs.filter(x => x.status === 'Active').indexOf(q) + 1; if (t === (q.key || '')) return;
  const had = !!q.key; if (t) { q.key = t; q.keyBy = cbrMe(); q.keyAt = now().toISOString(); } else { delete q.key; delete q.keyBy; delete q.keyAt; }
  s2Log(d, t ? (had ? 'Answer key changed' : 'Answer key added') : 'Answer key removed', had ? 'Set' : '—', t ? 'Set' : '—', `Q${n} (${q.id})`); render(); toast('Answer key saved.');
};
// One assessment: summary line, then Questions & Answer Keys (text, key, criteria), Add Question, the documents
function cbr2Asg(pr, d, n) {
  const act = d.qs.filter(q => q.status === 'Active'), keys = act.filter(q => q.key).length, know = cbrKnow(pr, d), bad = cbrBad(pr, d), amb = cbrAmbig(pr, cbrAsgV(pr, d)), subs = s2HasSubs(d);
  const edt = cbAsgCan() && !cbRetired(pr) && !cbrArch(pr), locked = d.status === 'Retired' || !edt, draft = d.status === 'Draft', open = ui('cbr2A.' + d.id, ui('cbAsg.' + pr.id, '') === d.id ? '1' : '') === '1', det = ui('cbr2D.' + d.id, '') === '1';
  const whole = asgWhole(d), un = asgUnmapped(d).length, noWhole = whole && !(d.acrit || []).length;
  const block = draft && (!act.length || un || noWhole || bad.length) ? `<p class="small cbr-warn cbr2-blk">${ic('alert', 13)} Publishing blocked: ${!act.length ? 'add at least one question' : un ? `${plural(un, 'question')} not mapped to a criterion yet` : noWhole ? 'choose at least one criterion for the whole assessment' : `${plural(bad.length, 'mapping')} outside the scope`}.</p>` : '';
  const grouped = cbrScope(d).lvl !== 'mod', ret = d.qs.filter(q => q.status === 'Retired');
  // CMA: the criteria of the scope as checkboxes (one or more), for a question (data-q) or for the whole assessment
  const boxes = (sel, ds, inp, lk = locked) => know.map((x, j) => `${grouped && (!j || know[j - 1].lo !== x.lo) ? `<span class="xs muted cbr2-mg cbr-lo">${esc(x.u.code)} ${esc(x.m.code)} · ${esc(x.lo.code)} ${esc(x.lo.title)}</span>` : ''}<label class="check"><input type="checkbox" data-onchange="${inp}" ${cbrDS({ ...ds, c: x.c.code })} ${sel.includes(x.c.code) ? 'checked' : ''} ${lk || (amb.has(x.c.code) && !sel.includes(x.c.code)) ? 'disabled' : ''}><span>Criterion <span class="code">${esc(x.c.code)}</span> ${esc(x.c.d)}${amb.has(x.c.code) ? ' <span class="xs cbr-warn">code used twice — not mappable</span>' : ''}</span></label>`).join('') || '<p class="xs muted">No knowledge criteria in this scope.</p>';
  const nSel = l => `<span class="xs ${l.length ? 'muted' : 'cbr-warn'} cbr2-nsel">${l.length ? plural(l.length, 'criterion', 'criteria') + ' selected' : 'None selected'}</span>`;
  const q1 = (q, i) => `<div class="cbr2-q" data-q="${q.id}"><div class="row-b cbr2-qh"><strong>Question ${i + 1}</strong>${edt && draft ? `<span class="row"><button class="btn btn-sm btn-ghost" data-act="s2QEdit" data-id="${d.id}" data-q="${q.id}">Edit</button><button class="btn btn-sm btn-ghost" data-act="s2QRetire" data-id="${d.id}" data-q="${q.id}">Remove</button></span>` : ''}</div><p class="small cbr2-qt">${esc(q.text)}</p>
    ${cbAsgCan() ? `<div class="field"><label for="ak-${d.id}-${q.id}">Answer Key / Assessor Guidance</label><textarea class="textarea" id="ak-${d.id}-${q.id}" rows="3" data-onchange="cbr2Key" ${cbrDS({ id: d.id, q: q.id })} ${cbr2KeyEdit(pr, d) ? '' : 'disabled'}>${esc(q.key || '')}</textarea></div>` : ''}
    ${whole ? `<p class="xs muted cbr2-qwhole">${ic('info', 12)} Not mapped on its own: the whole assessment is mapped (above).</p>` : `<fieldset class="cbr2-map"><legend class="lbl">Map Criteria <span class="xs muted">— select one or more</span></legend>${nSel(q.crit)}${boxes(q.crit, { id: d.id, q: q.id, subs: subs ? '1' : '' }, 'mapChange', locked || subs)}
    ${q.crit.filter(c => bad.includes(c)).length ? `<p class="xs cbr-warn">${ic('alert', 12)} Mapped outside the scope: ${esc(q.crit.filter(c => bad.includes(c)).join(', '))}${draft && edt ? ` <button class="btn btn-sm btn-ghost" data-act="cbrMapClean" data-id="${d.id}">Remove</button>` : ''}</p>` : ''}</fieldset>`}</div>`;
  const modeOk = edt && draft && !subs, mode = `<div class="cbr2-mmode"><fieldset class="cbr2-mm"><legend class="lbl">Criterion mapping</legend><div class="row" role="radiogroup"><label class="check"><input type="radio" name="cma-${d.id}" value="question" data-onchange="cmaMode" data-id="${d.id}" ${whole ? '' : 'checked'} ${modeOk ? '' : 'disabled'}><span>Per question <span class="xs muted">— each question maps to one or more criteria</span></span></label><label class="check"><input type="radio" name="cma-${d.id}" value="assessment" data-onchange="cmaMode" data-id="${d.id}" ${whole ? 'checked' : ''} ${modeOk ? '' : 'disabled'}><span>Whole assessment <span class="xs muted">— the assessment maps to one or more criteria</span></span></label></div>${!draft ? '<span class="xs muted">Fixed once published.</span>' : ''}${subs ? `<p class="xs cma-subs">${ic('lock', 12)} Mapping fixed: learners have submitted against it. ${esc(asgFixedMsg(d))}</p>` : ''}</fieldset>
    ${whole ? `<fieldset class="cbr2-map cbr2-amap"><legend class="lbl">Whole-assessment criteria <span class="xs muted">— select one or more</span></legend>${nSel(d.acrit || [])}${boxes(d.acrit || [], { id: d.id }, 'cmaACrit', locked || !draft)}${(d.acrit || []).filter(c => bad.includes(c)).length ? `<p class="xs cbr-warn">${ic('alert', 12)} Mapped outside the scope: ${esc(d.acrit.filter(c => bad.includes(c)).join(', '))}${draft && edt ? ` <button class="btn btn-sm btn-ghost" data-act="cbrMapClean" data-id="${d.id}">Remove</button>` : ''}</p>` : ''}<p class="xs muted">The Assessor judges each of these once for the whole submission.</p></fieldset>` : ''}</div>`;
  const acts = !edt ? '' : `<span class="row cbr2-aa"><button class="btn btn-sm btn-ghost" data-act="cbr2Det" data-id="${d.id}" aria-expanded="${det}">${det ? 'Close details' : 'Details'}</button>${draft ? `<button class="btn btn-sm" data-act="pubAsg" data-id="${d.id}">Publish</button>` : ''}${d.status === 'Published' ? `<button class="btn btn-sm btn-ghost" data-act="kEditBrief" data-id="${d.id}">Edit brief</button><button class="btn btn-sm btn-ghost" data-act="s2Unpublish" data-id="${d.id}">Unpublish</button><button class="btn btn-sm btn-ghost" data-act="s2Retire" data-id="${d.id}">Retire</button>` : ''}</span>`;
  const details = det && edt ? `<div class="cbr2-adet">${cbrAsgDetails(pr, d)}</div>` : '';
  return `<details class="cbr2-a" data-id="${d.id}" ${open ? 'open' : ''}><summary><span class="cbr2-at"><strong>Assessment ${n} — ${esc(d.title)}</strong>${chip(d.status, d.status === 'Published' ? 'green' : d.status === 'Draft' ? 'amber' : 'grey')}</span><span class="cbr2-ac"><span class="typebadge">${plural(act.length, 'question')}</span><span class="typebadge">${keys} of ${act.length} answer keys</span>${cbr2Docs(d).some(x => x.status === 'Active') ? `<span class="typebadge">${plural(cbr2Docs(d).filter(x => x.status === 'Active').length, 'key document')}</span>` : ''}</span></summary>
    <div class="cbr2-ab"><div class="row-b cbr2-ameta"><span class="xs muted">${esc(cbrTypeTxt(d))} · ${d.due ? 'course date ' + fd(d.due) : 'deadlines set per batch'} · ${esc(cbAsgVerTxt(d))} · Scope: ${esc(cbrScopeTxt(pr, d))}</span>${acts}</div>${block}${details}${mode}
    <div class="cbr2-qhh"><h5>Questions &amp; Answer Keys</h5>${typeof AAFA_QN_HINT !== 'undefined' ? `<details class="cbr2-help"><summary aria-label="How questions are numbered" title="How questions are numbered">${ic('info', 14)}</summary><p class="xs aafa-qn" role="note">${esc(AAFA_QN_HINT)}</p></details>` : ''}</div>${act.length ? act.map(q1).join('') : '<p class="xs muted">No questions yet.</p>'}${ret.map(q => `<div class="cbr2-q cbr2-qret ch-retired" data-q="${q.id}"><span class="xs muted aafa-qret">${q.retiredN ? `Retired (was ${esc(q.retiredN)})` : 'Retired'}</span><p class="small cbr2-qt">${esc(q.text)}</p></div>`).join('')}
    ${edt && draft ? `<button class="btn btn-sm btn-ghost cbr2-add" data-act="s2QAdd" data-id="${d.id}">${ic('plus', 13)}Add Question</button>` : ''}
    ${cbAsgCan() ? cbr2DocList(pr, d) : ''}</div></details>`;
}
// Details of one assessment, shown in place: the existing fields (title, brief, deadline, file rules, resubmissions), scope and type,
// version / references / template, question evidence settings and the learner preview — saved with the existing Save
function cbrAsgDetails(pr, d) {
  let det = s2Details(d); if (d.scope) det = det.replace(/<label for="ae-u">[^<]*<\/label><select class="select" id="ae-u"[^>]*>[\s\S]*?<\/select>/, `<span class="lbl">Academic scope</span><select class="select" id="ae-u" disabled aria-label="Academic scope"><option value="${esc(d.unit)}" selected>${esc(cbrScopeTxt(pr, d))}</option></select>`);
  return `${det}<div class="row cbr2-adb cb-asg-btns">${d.status !== 'Retired' ? `<button class="btn btn-sm btn-primary" data-act="s2Save" data-id="${d.id}">Save details</button>` : ''}${d.status === 'Draft' ? `<button class="btn btn-sm btn-ghost" data-act="cbrAsgScope" data-id="${d.id}">Change scope or type</button>` : ''}<button class="btn btn-sm btn-ghost" data-go="a-assignments" data-id="${d.id}" data-tab="extensions">Deadline extensions</button></div>${cbAsgSettings(d)}${cbAsgQSettings(d)}${typeof aafaPreview === 'function' ? aafaPreview(d, s2Crit(d)) : ''}`;
}
// Older "open" links (CB5): open the assessment in place; "details" also opens its details
const _openCBR2 = ACT.cbAsgOpen;
ACT.cbAsgOpen = function (el) { const r = _openCBR2.apply(this, arguments), id = el && el.dataset && el.dataset.id; if (id) { setUi('cbr2A.' + id, '1'); if (el.dataset.t === 'details' || el.dataset.t === 'mapping') setUi('cbr2D.' + id, '1'); render(); } return r; };
ACT.cbr2Det = el => { const k = 'cbr2D.' + el.dataset.id; setUi(k, ui(k, '') === '1' ? '' : '1'); setUi('cbr2A.' + el.dataset.id, '1'); render(); };
document.addEventListener('toggle', e => { const t = e.target; if (t && t.matches && t.matches('details.cbr2-a')) setUi('cbr2A.' + t.dataset.id, t.open ? '1' : ''); }, true);
// Manage Types (CBC1): the registry first — Add type, Edit, Retire for the roles that may (s3CanEdit) — then, below it, the read-only
// list of the types this programme's Learning Outcomes use. Same cards and actions as before; only the order and headings change.
function cbr2TypeBox(pr) {
  const reg = s3TypesTab().replace(/<h2>Assessment types<\/h2>/, '<h4>Type registry</h4>').replace('<button class="btn btn-sm" data-act="addType">', '<button class="btn btn-sm btn-primary" data-act="addType">');
  const use = cbCurTypesUse(pr).replace(/<h2>Assessment types in this programme<\/h2>/, '<h4>Used in this programme</h4>');
  return reg.replace('<section class="card"', '<section class="card cbr2-treg"') + use;
}
// A saved, retired or restored type says so; the save re-checks the role (the dialog could be left open across a role change)
const cbr2TypeOk = () => (typeof s3CanEdit === 'function' && s3CanEdit()) || s3Refuse('change assessment types', 'Assessment types');
const cbr2TypeSupported = ev => /^Written assignment questions$|^Workplace observation by an assessor$/.test(ev || '');
const _tdCBR2 = s3TypeDlg;
s3TypeDlg = function (t) {
  const r = _tdCBR2.apply(this, arguments), a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (!a || !a.fn) return r;
  // unsupported evidence methods are labelled where they are chosen, not only in the hint
  MODAL.body = MODAL.body.replace(/<option ?(selected)? ?>(Professional discussion|Product evidence|Witness testimony)<\/option>/g, (m, s, e) => `<option value="${e}"${s ? ' selected' : ''}>${e} — not usable for assessments yet</option>`); renderModal();
  const g = a.fn; a.fn = (...x) => {
    if (!cbr2TypeOk()) return false;
    const a0 = ADMIN.audit.length, out = g(...x), rec = ADMIN.audit.slice(0, ADMIN.audit.length - a0).find(y => /^Assessment type (added|changed)$/.test(y.action));
    if (out !== false && rec) { const ev = String(rec.after).split(' · ').pop(); toast(`${rec.action === 'Assessment type added' ? 'Assessment type added' : 'Assessment type saved'}: ${String(rec.after).split(' · ')[0]}.${cbr2TypeSupported(ev) ? '' : ' Its evidence method has no marking workflow yet, so it can\'t be used for assessments or published.'}`, cbr2TypeSupported(ev) ? undefined : 'info'); }
    return out;
  };
  return r;
};
const _trCBR2 = ACT.s3TypeRetire;
ACT.s3TypeRetire = el => {
  const r = _trCBR2(el), a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || ''));
  if (a && a.fn && !a._c1) { const g = a.fn; a._c1 = true; a.fn = (...x) => { if (!cbr2TypeOk()) return false; const a0 = ADMIN.audit.length, out = g(...x), rec = ADMIN.audit.slice(0, ADMIN.audit.length - a0).find(y => /^Assessment type (retired|restored)$/.test(y.action)); if (out !== false && rec) toast(`${rec.before} ${rec.action === 'Assessment type retired' ? 'retired. Learning Outcomes that use it keep it.' : 'restored.'}`); return out; }; }
  return r;
};
// The step: Assessment Types, then Full-Course, each unit and each module, each with its assessments
function cbr2Asgs(pr, focus) {
  const L = cbAsgOf(pr), tree = (cbTree(pr) || []).filter(cbrLive), can = cbAsgCan() && !cbRetired(pr) && !cbrArch(pr), used = new Set();
  const typesOpen = ui('cbr2T.' + pr.id, focus === 'types' ? '1' : '') === '1', act = s3Types().filter(t => t.status === 'Active');
  const types = `<section class="cbr2-types" id="cbr-types"><div class="row-b"><h3>Assessment Types</h3><button class="btn btn-sm" data-act="cbr2Types" data-p="${pr.id}" aria-expanded="${typesOpen}">${typesOpen ? 'Close' : 'Manage Types'}</button></div><p class="xs muted">${act.map(t => esc(t.label || t.name)).join(' · ') || 'None'}</p>${typesOpen ? `<div class="cbr2-tbox">${cbr2TypeBox(pr)}</div>` : ''}</section>`;
  const add = (lvl, u, m) => (can ? `<button class="btn btn-sm" data-act="cbrAsgNew" ${cbrDS({ p: pr.id, lvl, u, m })}>${ic('plus', 13)}Add Assessment</button>` : '');
  const list = arr => { arr.forEach(d => used.add(d.id)); return arr.length ? arr.map((d, i) => cbr2Asg(pr, d, i + 1)).join('') : ''; };
  let h = `<section class="cbr2-ag" data-lvl="prog"><div class="row-b cbr2-sh"><h3>Full-Course Assessments</h3>${add('prog')}</div>${list(L.filter(d => cbrScope(d).lvl === 'prog'))}</section>`;
  tree.forEach((u, ui_) => {
    const uu = L.filter(d => cbrScope(d).lvl === 'unit' && cbrScope(d).unit === u.code);
    h += `<section class="cbr2-ag cbr-agu" data-lvl="unit" data-u="${esc(u.code)}"><div class="row-b cbr2-sh"><h3>Unit ${ui_ + 1} — ${esc(u.title)} <span class="cbr2-code code">${esc(u.code)}</span></h3>${add('unit', u.code)}</div>${list(uu)}
      ${u.mods.filter(cbrLive).map((m, mi) => `<div class="cbr2-agm" data-m="${esc(m.code)}"><div class="row-b cbr2-sh"><h4>Module ${ui_ + 1}.${mi + 1} — ${esc(m.title)}</h4>${add('mod', u.code, m.code)}</div>${list(L.filter(d => cbrScope(d).lvl === 'mod' && cbrScope(d).unit === u.code && cbrScope(d).mod === m.code))}</div>`).join('')}</section>`;
  });
  const rest = L.filter(d => !used.has(d.id)); if (rest.length) h += `<section class="cbr2-ag" data-lvl="other"><div class="row-b cbr2-sh"><h3>Not in this version's structure</h3></div>${list(rest)}</section>`;
  const cov = cbRvCoverage(pr, cbTree(pr)), covT = cov.all.length ? `<p class="xs muted cbr-cov">Knowledge criteria mapped: ${cov.all.length - cov.un.length} of ${cov.all.length}${cov.un.length ? ` · not yet: ${esc(cov.un.slice(0, 10).join(', '))}${cov.un.length > 10 ? '…' : ''}` : ''}.</p>` : '';
  return `<section class="card cbr2-asgs cbr-asgs">${types}${tree.length || L.length ? h : '<p class="small muted">Add units and modules in Curriculum &amp; Outcomes first.</p>'}${covT}</section>${typeof aafaCoverage === 'function' && cov.all.length ? cbrFold('cbr-covf', 'Criteria coverage by question', aafaCoverage(pr), false, 'cbr-coverage') : ''}${cbrFold('cbr-keyf', 'Module answer key files', cbrKeysPanel(pr), focus === 'keys', 'cbr-keyfiles')}`;
}
ACT.cbr2Types = el => { const k = 'cbr2T.' + el.dataset.p; setUi(k, ui(k, '') === '1' ? '' : '1'); render(); };
// A new assessment opens in place, ready for its questions
const _newCBR2 = ACT.cbrAsgNew;
ACT.cbrAsgNew = el => { const n0 = s2Defs().length, r = _newCBR2(el), a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a && a.fn && !a._c2) { const f = a.fn; a._c2 = true; a.fn = function () { const x = f.apply(this, arguments), d = s2Defs().length > n0 ? s2Defs()[s2Defs().length - 1] : null; if (d) setUi('cbr2A.' + d.id, '1'); return x; }; } return r; };
// The assessor marking a submission also sees the assessment's answer-key documents (current versions, staff only)
const _tMarkCBR2 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkCBR2(p);
  try {
    const s = typeof tasSubs === 'function' ? tasSubs(true).find(x => x.key === (p && p.id)) : null, a = s && tasAsg(s), d = a && s2Def(a.id), L = d ? cbr2Docs(d).filter(x => x.status === 'Active') : [];
    if (typeof h !== 'string' || !L.length || !cbr2KeyView(d)) return h;
    return h + `<details class="card cbr2-mdocs"><summary><strong>Answer-key documents</strong> <span class="xs muted">assessor guidance — never shown to learners</span></summary><ul class="list small">${L.map(x => `<li class="li"><div class="li-b"><span class="mono">${esc(cbr2DocCur(x).file)}</span><span class="xs muted">v${cbr2DocCur(x).v}</span></div><button class="btn btn-sm btn-ghost" data-act="cbr2DocView" ${cbrDS({ id: d.id, doc: x.id })}>View</button></li>`).join('')}</ul></details>`;
  } catch (e) { return h; }
};

/* ============ Step 4 — Observations ============ */
// Each column: its checkbox, then (when ticked) Categories & Criteria — each selected category with its criteria ticked here, Add
// Criterion, the evidence of each criterion — and the guidance for the location. The switches are N5a's own fields (cbrObsLoc).
function cbr2ObsCol(pr, d, loc, ed) {
  const [title, key, onV] = CBR_LOC[loc], on = d[key] === onV, P = { p: pr.id, loc }, o = ol1Cfg(d), pub = d.state !== 'Draft', m = loc === 'off' ? ol1Mode(d) : null;
  const box = `<label class="check cbr2-loc"><input type="checkbox" data-onchange="cbr2Loc" ${cbrDS(P)} ${on ? 'checked' : ''} ${ed ? '' : 'disabled'}><span>${title} Required</span></label>${d[key] == null ? ' <span class="xs muted cbr-nrec">Not recorded</span>' : ''}`;
  if (!on) return `<section class="cbr-col cbr2-col" data-loc="${loc}">${box}${(loc === 'wp' ? o.wp : o.off.add).length ? '<p class="xs muted">Earlier selections are kept with the draft.</p>' : ''}</section>`;
  if (pub) { const res = ol1Resolve(d, loc); return `<section class="cbr-col cbr2-col on" data-loc="${loc}">${box}<h4>Categories &amp; Criteria</h4><p class="xs muted">Frozen with Version ${d.v}.</p>${res.items.length ? `<ul class="cbr2-critro cbr-critl">${res.items.map(i => `<li data-c="${i.id}"><span class="code">${esc(i.code)}</span> ${esc(i.title)}${loc === 'off' && i.from === 'inherited' ? ' <span class="xs muted">from Workplace</span>' : loc === 'off' && d.ol1snap && d.ol1snap.mode === 'same' && i.from === 'office' ? ' <span class="xs muted">Academy only</span>' : ''}<div class="cbr-ev">${ol1EvChips(i)}</div></li>`).join('')}</ul>` : `<p class="xs muted">${res.none ? `No library criteria were recorded for Version ${d.v}.` : 'None.'}</p>`}${cbrGuideOf(d, loc) ? `<h4>Guidance</h4><p class="small">${esc(cbrGuideOf(d, loc))}</p>` : ''}</section>`; }
  const sels = loc === 'wp' ? o.wp : o.off.add, cw = d.cbrEv || {};
  const critRow = (c, it, s) => { const sel = s.all || (s.crit || []).includes(it.id), ev = cw[it.id] ? { ...it, ...cw[it.id] } : it;
    return `<li data-c="${it.id}"><label class="check"><input type="checkbox" data-onchange="cbr2Crit" ${cbrDS({ ...P, k: c.id, c: it.id })} ${sel ? 'checked' : ''} ${ed ? '' : 'disabled'}><span><span class="code">${esc(it.code)}</span> ${esc(it.title)}</span></label>${sel ? `<div class="cbr-ev">${ol1EvChips(ev)}${cw[it.id] ? ' <span class="xs muted">set for this course</span>' : ''}${ed ? ` <button class="btn btn-sm btn-ghost" data-act="cbrObsEv" ${cbrDS({ ...P, c: it.id })}>Evidence</button>` : ''}</div>` : ''}</li>`; };
  const cats = sels.map(s => { const c = ol1Cat(s.cat), v = ol1Cur(c); if (!c || !v) return `<div class="cbr2-cat"><p class="xs cbr-warn">A selected category no longer exists (${esc(s.cat)}).${ed ? ` <button class="btn btn-sm btn-ghost" data-act="ol1SelRm" ${cbrDS({ ...P, k: s.cat })}>Remove</button>` : ''}</p></div>`;
    const live = v.crit.filter(x => x.status === 'Active');
    return `<div class="cbr2-cat" data-k="${esc(c.id)}"><div class="row-b"><strong>Selected Category — ${esc(v.name)}</strong><span class="row"><span class="xs muted"><span class="code">${esc(c.code)}</span> v${v.v}${c.retired ? ' · retired' : ''}</span>${ed ? `<button class="btn btn-sm btn-ghost" data-act="ol1SelRm" ${cbrDS({ ...P, k: c.id })} aria-label="Remove ${esc(v.name)} from this course">Remove</button>` : ''}</span></div>
      <ul class="cbr2-critl">${live.map(it => critRow(c, it, s)).join('')}</ul>${ed && !c.retired ? `<button class="btn btn-sm btn-ghost cbr2-add" data-act="cbrObsCrit" ${cbrDS({ ...P, k: c.id })}>${ic('plus', 13)}Add Criterion</button>` : ''}</div>`; }).join('');
  // Academy: "same as Workplace" brings the workplace criteria (each can be left out here); Academy-only categories add to them
  const inh = loc === 'off' && m === 'same' ? ol1Resolve(d, 'off') : null;
  const modeRow = loc !== 'off' ? '' : `<div class="cbr-mode cbr2-mode" role="group" aria-label="Academy criteria"><label class="check"><input type="radio" name="cbr2-om" data-onchange="cbr2Mode" ${cbrDS({ p: pr.id, m: 'same' })} ${m === 'same' ? 'checked' : ''} ${ed && d.workplace === 'Permitted' ? '' : 'disabled'}>Same as Workplace</label><label class="check"><input type="radio" name="cbr2-om" data-onchange="cbr2Mode" ${cbrDS({ p: pr.id, m: 'own' })} ${m === 'own' ? 'checked' : ''} ${ed ? '' : 'disabled'}>Own selection</label></div>`;
  const inhL = inh ? `<div class="cbr2-cat cbr2-inh"><strong>From Workplace</strong><ul class="cbr2-critl">${inh.items.filter(i => i.from === 'inherited').concat(inh.excluded.map(i => ({ ...i, excluded: true }))).map(i => `<li data-c="${i.id}"><label class="check"><input type="checkbox" data-onchange="cbr2Inh" ${cbrDS({ p: pr.id, c: i.id })} ${i.excluded ? '' : 'checked'} ${ed ? '' : 'disabled'}><span><span class="code">${esc(i.code)}</span> ${esc(i.title)}${i.excluded ? ' ' + chip('Excluded', 'grey') : ''}</span></label></li>`).join('') || '<li class="xs muted">No workplace criteria yet.</li>'}</ul></div>` : '';
  const probs = ol1Resolve(d, loc).probs || [];
  const g = cbrGuideOf(d, loc), gid = 'cbr2-g-' + loc;
  return `<section class="cbr-col cbr2-col on" data-loc="${loc}">${box}<h4>Categories &amp; Criteria</h4>${modeRow}
    ${ed ? `<div class="row cbr2-catb"><button class="btn btn-sm" data-act="ol1Sel" ${cbrDS(P)}>${ic('plus', 13)}Add from Library</button><button class="btn btn-sm btn-ghost" data-act="ol1CbNew" ${cbrDS(P)}>${ic('plus', 13)}Create Category</button></div>` : ''}
    ${inhL}${cats || (inh ? '' : '<p class="xs muted">No categories selected yet.</p>')}
    ${probs.length ? `<ul class="list xs">${probs.map(p => `<li class="li">${chip(p.block ? 'Blocking' : 'Warning', p.block ? 'red' : 'amber')} ${esc(p.t)}</li>`).join('')}</ul>` : ''}
    <div class="field cbr2-guide"><label for="${gid}">Guidance and requirements</label><textarea class="textarea" id="${gid}" rows="3" maxlength="2000" data-onchange="cbr2Guide" ${cbrDS(P)} ${ed ? '' : 'disabled'} placeholder="Requirements specific to ${loc === 'wp' ? 'the workplace' : 'the Academy'}">${esc(g)}</textarea></div></section>`;
}
// Qualification criteria (CBC2): Learning Outcomes of the Observation type are the qualification's own criteria — not library
// criteria and not chosen per location: each is assessed wherever its Required Observation takes place, with one evidence setting.
// So they stay one shared section (N5a's own table and buttons, not a copy), folded; it opens while any of them needs evidence.
function cbr2QualCrit(pr, d, ed) {
  const dv = document.createElement('div'); dv.innerHTML = cbrObsCards(pr, d); const nv = dv.querySelector('.n5-nvq'), ia = dv.querySelector('.n5-ia'); if (!nv && !ia) return '';
  [nv, ia].forEach(c => { if (!c) return; const h = c.querySelector('h2'); if (h) h.remove(); c.querySelectorAll(':scope > p.small.muted').forEach(n => n.remove()); });
  const ok = n5NvqOk(pr, d), miss = d.state === 'Draft' ? ok.filter(c => !((d.nvq[c.code] || {}).types || []).length).length : 0, u = ui('cbr2Q.' + pr.id, ''), open = u === '1' || (u !== '0' && ed && miss > 0);
  return `<details class="cbr-fold cbr2-qual" data-p="${esc(pr.id)}" ${open ? 'open' : ''}><summary>Qualification criteria from the curriculum (${ok.length})${miss ? ` <span class="cb-badge warn">${plural(miss, 'needs', 'need')} evidence</span>` : ''}</summary><div class="cbr-fold-b"><p class="xs muted">Assessed wherever their Required Observation takes place. Change them in Curriculum &amp; Outcomes.</p>${nv ? nv.outerHTML : ''}${ia ? `<h4>Programme Academy criteria (earlier set-up · workplace only)</h4>${ia.outerHTML}` : ''}</div></details>`;
}
// Required Observations (CBC2): the version's observation events — course-level definitions, not learner bookings. Each one is added
// by an administrator (nothing is created automatically); the same actions, checks and audit as before (cb-obs.js), draft only.
function cbr2ReqObs(pr, d, ed) {
  const evs = cbEvOf(d), nvq = n5NvqOk(pr, d), p = cbEvProblems(pr, d), P = `data-p="${esc(pr.id)}"`;
  const row = (e, i) => `<li class="cbr2-ro" data-e="${esc(e.id)}"><div class="cbr2-ro-b"><strong>${esc(e.name)}</strong><span class="xs muted">${esc(cbLocTxt(e.loc))} · ${plural(e.crit.length, 'criterion', 'criteria')} · ${esc(n5EvTxt({ types: e.ev }))}</span></div>${ed ? `<span class="row cbr2-ro-a"><button class="btn btn-sm btn-ghost" data-act="cbObsEvMove" ${P} data-e="${esc(e.id)}" data-dir="-1" aria-label="Move ${esc(e.name)} up" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-sm btn-ghost" data-act="cbObsEvMove" ${P} data-e="${esc(e.id)}" data-dir="1" aria-label="Move ${esc(e.name)} down" ${i < evs.length - 1 ? '' : 'disabled'}>↓</button><button class="btn btn-sm" data-act="cbObsEv" ${P} data-e="${esc(e.id)}" aria-label="Edit ${esc(e.name)}">Edit</button><button class="btn btn-sm btn-ghost" data-act="cbObsEvRemove" ${P} data-e="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">Remove</button></span>` : ''}</li>`;
  const list = evs.length ? `<ol class="cbr2-rol">${evs.map(row).join('')}</ol>` : `<p class="small muted">${d.state === 'Draft' ? 'None yet.' : `None recorded for Version ${d.v} (published before they were kept).`}</p>`;
  const cov = nvq.length && evs.length ? `<p class="xs muted">Qualification criteria included: ${nvq.filter(c => evs.some(e => e.crit.includes(c.code))).length} of ${nvq.length}</p>` : '';
  const checks = d.state === 'Draft' && (p.block.length || p.warn.length) ? `<ul class="list small cb-ev-checks">${p.block.map(b => `<li class="li">${chip('Blocking', 'red')} ${esc(cbr2Cap(b))}</li>`).join('')}${p.warn.map(w => `<li class="li">${chip('Warning', 'amber')} ${esc(cbr2Cap(w))}</li>`).join('')}</ul>` : '';
  return `<div id="cbr-events"><section class="card cb-ev cbr2-req"><div class="row-b"><h3>Required Observations</h3>${ed ? `<button class="btn btn-sm btn-primary" data-act="cbObsEv" ${P} data-e="">${ic('plus', 13)}Add Required Observation</button>` : ''}</div>${list}${cov}${checks}${d.state === 'Draft' ? '' : `<p class="xs muted">Frozen with Version ${d.v}.</p>`}</section></div>`;
}
const cbr2Cap = m => { const t = String(m).replace(/^Observations: /, ''); return t.charAt(0).toUpperCase() + t.slice(1) + (/[.…]$/.test(t) ? '' : '.'); };
// Review & Publish: a Required Observation's problem opens Step 4 at the list
const _rvWhereCBR2 = cbRvWhere;
cbRvWhere = function (pr, m) { return /Required Observation|^Observations: "/.test(String(m)) ? ['observations', 'events'] : _rvWhereCBR2.apply(this, arguments); };
document.addEventListener('toggle', e => { const t = e.target; if (t && t.matches && t.matches('details.cbr2-qual')) setUi('cbr2Q.' + t.dataset.p, t.open ? '1' : '0'); }, true);
INP.cbr2Loc = el => { ACT.cbrObsLoc({ dataset: { p: el.dataset.p, loc: el.dataset.loc, v: el.checked ? 'on' : 'off' } }); render(); };
INP.cbr2Mode = el => ACT.ol1OffMode({ dataset: { p: el.dataset.p, m: el.dataset.m } });
INP.cbr2Inh = el => ACT.ol1Excl({ dataset: { p: el.dataset.p, c: el.dataset.c, a: el.checked ? 'incl' : 'excl' } });
// Tick or untick one criterion of a selected category for this course (the library is unchanged)
INP.cbr2Crit = el => {
  const g = cbrObsGate(el, el.checked ? 'select an observation criterion' : 'remove an observation criterion'); if (!g) { render(); return; }
  const { pr, d } = g, loc = el.dataset.loc, cw = ol1CfgW(d), list = loc === 'wp' ? cw.wp : cw.off.add, s = list.find(y => y.cat === el.dataset.k), c = ol1Cat(el.dataset.k), v = ol1Cur(c);
  if (!s || !v) { toast('That category isn\'t selected in this course.', 'err'); render(); return; }
  const live = v.crit.filter(x => x.status === 'Active').map(x => x.id), it = v.crit.find(x => x.id === el.dataset.c); if (!it || !live.includes(it.id)) { render(); return; }
  const cur = s.all ? live.slice() : (s.crit || []).filter(id => live.includes(id));
  const nx = el.checked ? (cur.includes(it.id) ? cur : cur.concat(it.id)) : cur.filter(id => id !== it.id);
  s.crit = live.filter(id => nx.includes(id)); s.all = false;
  n5Log(pr, `${ol1LocTxt(loc)} observation criterion ${el.checked ? 'selected' : 'removed'}`, el.checked ? '—' : `${c.code}: ${it.code}`, el.checked ? `${c.code}: ${it.code}` : '—', `Version ${d.v} (draft) — the library is unchanged`); render();
};
INP.cbr2Guide = el => {
  const g = cbrObsGate(el, 'change observation guidance'); if (!g) { render(); return; } const { pr, d } = g, loc = el.dataset.loc, cur = cbrGuideOf(d, loc), t = el.value.trim(); if (t === cur) return;
  d.cbrGuide = { ...(d.cbrGuide || {}), [loc]: t }; n5Log(pr, `${ol1LocTxt(loc)} observation guidance ${t ? 'changed' : 'removed'}`, cur ? 'Set' : '—', t ? 'Set' : '—', `Version ${d.v} (draft)`); render(); toast('Saved.');
};
function cbr2Obs(pr, focus) {
  if (!n5CanView()) return n5Section(pr);
  n5Sync(); const d = n5Shown(pr);
  if (!d) return `<section class="card"><p class="small muted">No observation configuration is recorded for Version ${pr.version}.</p></section>`;
  const hist = () => { const dv = document.createElement('div'); dv.innerHTML = n5Section(pr); dv.querySelectorAll('.n5-head, .n5-settings, .n5-cover, .n5-checks, .ol1b-map, .n5-nvq, .n5-ia, .n5-mig').forEach(n => n.remove()); // CBC3: the "not copied" note is on the Observation Criteria Library page
    return cbrFold('cbr-n5', 'Change history', dv.innerHTML.replace(/Pre-N5 migration/g, 'Recorded before observation settings were kept').replace(/Migration \(before N5\)/g, 'migration'), false, 'cbr-n5'); };
  if (d.required === false) return cbObsNA(pr) + hist();
  if (d.required == null && d.state === 'Draft') return `<div class="note b-amber" role="status">${ic('info')}<div class="small"><strong>Does this course contain observations?</strong> Choose Yes or No for "Observation required for this course" in Course Details first${d.prevRequired != null ? ` (Version ${d.v - 1}: ${n5YN(d.prevRequired)})` : ''}. <button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="details">Open Course Details</button></div></div>` + hist();
  const ed = !!n5DraftV(pr) && n5CanEdit() && d.state === 'Draft' && !cbrArch(pr);
  const none = d.required === true && d.workplace !== 'Permitted' && d.office !== 'Available' ? `<p class="small cbr-warn" role="status">${ic('alert', 14)} Observation is required: tick at least one location.</p>` : '';
  const nrec = d.required == null ? `<p class="small muted" role="status">${ic('info', 14)} Version ${d.v} was published before "Observation required" was recorded; its settings are shown as published.</p>` : '';
  const legacy = !pr.chNew ? `<p class="xs muted cbx-legacy">Library: <button class="linklike" data-go="k-ocl">Observation Criteria Library</button> · <button class="linklike" data-go="k-obslib">legacy shared list</button> (not used by this course)</p>` : '';
  // CBC2: the two columns, then the shared qualification criteria (compact), then the Required Observations, then history
  return `<section class="card cbr-obs cbr2-obs-s">${nrec}${none}<div class="cbr-obs-cols cbr2-cols">${cbr2ObsCol(pr, d, 'wp', ed)}${cbr2ObsCol(pr, d, 'off', ed)}</div></section>
    ${cbr2QualCrit(pr, d, ed)}${cbr2ReqObs(pr, d, ed)}${legacy}${hist()}`;
}

/* ============ Step 5 — Fees & Payment Plans ============ */
// One fee option, its fields in place. Every change goes through cb8Guard and cb8Touch (audit; approved terms go back to Finance).
function cbr2Opt(pr, P, o, b, ed, iss) {
  const id = 'f2-' + o.id.replace(/\W/g, ''), D = { p: pr.id, o: o.id }, ret = o.status !== 'Active', dis = ed && !ret ? '' : 'disabled';
  const feeLock = (o.inForce && pr.status !== 'Draft' && !isSA()) || (o.legacy && !isSA()), obsOn = b.req === true;
  const num = (f, lab, v, on, why) => `<div class="field"><label for="${id}-${f}">${lab}</label><input class="input num" type="number" min="0" step="0.01" inputmode="decimal" id="${id}-${f}" value="${v != null ? v : ''}" data-onchange="cbr2OptF" ${cbrDS({ ...D, f })} ${on ? dis : 'disabled'}>${why ? `<span class="hint">${why}</span>` : ''}</div>`;
  const naWhy = (loc, v) => (!obsOn ? 'Not applicable — no observations' : !b[loc] ? 'Not applicable — location not required' : '') + (!(obsOn && b[loc]) && v != null ? ` (kept: ${money(v, 'GBP')})` : '');
  const dep = cb8DepOf(P, o), allow = dep.mode !== 'none', own = !!o.dep, depAmt = cb8DepE(dep), fee = o.fee > 0 ? o.fee : null;
  const depBox = `<div class="cbr2-dep"><label class="check"><input type="checkbox" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'allow' })} ${allow ? 'checked' : ''} ${dis}><span>Allow Deposit</span></label>${!own ? `<span class="xs muted">Programme setting${allow ? `: ${esc(cb8DepTxt(P.dep))}` : ''}</span>` : ''}
    ${allow ? `<div class="cbr2-depf"><fieldset class="field"><legend class="lbl">Deposit Amount (£)</legend><label class="check"><input type="radio" name="${id}-dm" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'default' })} ${dep.mode === 'default' ? 'checked' : ''} ${dis}>Academy default (${money(S4().cfg.deposit, 'GBP')})</label><label class="check"><input type="radio" name="${id}-dm" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'own' })} ${dep.mode === 'own' ? 'checked' : ''} ${dis}>Custom amount</label>
      ${dep.mode === 'own' ? `<input class="input num" type="number" min="0.01" step="0.01" id="${id}-da" aria-label="Custom deposit amount (£)" value="${dep.amount != null ? dep.amount : ''}" data-onchange="cbr2Dep" ${cbrDS({ ...D, k: 'amount' })} ${dis}>` : ''}</fieldset>
      <p class="xs muted">Offered when the learner's batch starts in ${CH_HOLD_DAYS} days or more.${fee && depAmt ? ` Balance after the deposit: ${money(Math.max(0, fee - depAmt), 'GBP')}${obsOn ? ' + the observation fee' : ''}.` : ''}</p></div>` : ''}</div>`;
  // each instalment option: its count, amounts (the last payment carries the pence), rule, total, and its due dates (folded)
  const anchor = cb8Anchor(pr), plans = o.pay.map((x, i) => { const s = b.dur && fee ? cbSched(anchor.ymd, b.dur, fee, x.k) : null;
    return `<li class="field cbr2-pl cb8-pay" data-k="${x.k}"><label for="${id}-k${x.k}">Option ${i + 1} — Number of Instalments${x.k === 1 ? ' <span class="xs muted cbr2-pif">(pay in full)</span>' : ''}</label><input class="input num" type="number" min="1" max="${CB_K_MAX}" step="1" inputmode="numeric" id="${id}-k${x.k}" value="${x.k}" data-onchange="cbr2K" ${cbrDS({ ...D, k: x.k })} ${dis}>${ed && !ret ? `<button class="btn btn-sm btn-ghost" data-act="cb8PayDel" ${cbrDS({ ...D, k: x.k })} aria-label="Remove option ${i + 1} (${esc(cb8PayLbl(x.k))})">Remove</button>` : ''}
      <span class="xs muted cbr2-plx">${fee ? `${esc(cbAmtTxt(fee, x.k))}${b.dur ? ` · ${esc(cbRuleTxt(b.dur, x.k))}` : ''}${s && s.rows ? ` · Total ${money(s.total, 'GBP')}` : ''}` : 'Set the tuition fee'}${s && s.why ? ` <span class="cbr-warn">${esc(s.why)}</span>` : ''}</span>
      ${s && s.rows ? `<details class="cb8-ex cbr2-plx"><summary class="xs">Due dates — preview from ${esc(anchor.lbl)} ${esc(cbFd(anchor.ymd))}</summary><p class="xs muted cb8-pts">${esc(cbPointsTxt(b.dur, x.k, anchor.ymd))}</p>${cb8Dates(s.rows)}${allow ? cbr2DepPrev(depAmt, s, x.k) : ''}</details>` : ''}</li>`; }).join('');
  const addRow = !ed || ret ? '' : `<div class="field cbr2-pladd cb8-add"><label class="sr" for="cb8-k-${esc(o.id)}">Number of Instalments for a new option</label><input class="input num" type="number" min="1" max="${CB_K_MAX}" step="1" inputmode="numeric" id="cb8-k-${esc(o.id)}" data-oninput="cb8KLive" ${cbrDS(D)} placeholder="e.g. 3" aria-describedby="cb8-pv-${esc(o.id)} cb8-kh-${esc(o.id)}"><button class="btn btn-sm cbr2-add" data-act="cb8PayAdd" ${cbrDS(D)}>${ic('plus', 13)}Add Instalment Option</button><span class="hint cbr2-kh" id="cb8-kh-${esc(o.id)}">1 = pay in full</span><div class="xs cb8-prev" id="cb8-pv-${esc(o.id)}" aria-live="polite"></div></div>`;
  const tot = !fee ? '' : !obsOn ? money(fee, 'GBP') : [b.wp && o.obsWp != null && `${money(fee + o.obsWp, 'GBP')} with a workplace observation`, b.off && o.obsOff != null && `${money(fee + o.obsOff, 'GBP')} with an Academy observation`].filter(Boolean).join(' · ') || `${money(fee, 'GBP')} + the observation fee`;
  const mine = []; // the blockers are listed once, under "Before submitting"
  return `<article class="cbr2-opt cb8-opt${ret ? ' cb8-ret' : ''}" data-o="${esc(o.id)}"><div class="row-b cbr2-oh"><h4>${esc(o.label || 'Unnamed fee option')} <span class="xs muted mono">${esc(o.id)}</span>${ret ? ' ' + chip('Retired', 'grey') : ''}</h4>${ed && !ret && cb8L3(pr) ? `<button class="btn btn-sm btn-ghost" data-act="cb8OptRetire" ${cbrDS(D)}>${o.inForce ? 'Retire' : 'Remove'}</button>` : ''}</div>
    <div class="form-grid cbr2-of cb8-fees"><div class="field"><label for="${id}-label">Fee Option Name</label><input class="input" id="${id}-label" maxlength="80" value="${esc(o.label || '')}" data-onchange="cbr2OptF" ${cbrDS({ ...D, f: 'label' })} ${cb8L3(pr) ? dis : 'disabled'}></div>
      ${num('fee', 'Tuition Fee (£)', o.fee, !feeLock, feeLock && ed ? 'Only the Super Administrator changes the fee of an option already in force.' : '')}
      ${num('obsWp', 'Workplace Observation Fee (£)', o.obsWp, obsOn && b.wp, naWhy('wp', o.keptWp != null ? o.keptWp : o.obsWp))}${num('obsOff', 'Academy Observation Fee (£)', o.obsOff, obsOn && b.off, naWhy('off', o.keptOff != null ? o.keptOff : o.obsOff))}</div>
    ${ret ? '<p class="xs muted">Retired: not offered to new learners. Learners who chose it keep their terms.</p>' : `${depBox}<h5>Payment Instalment Options</h5>${o.pay.length ? `<ol class="cbr2-pls">${plans}</ol>` : '<p class="xs cbr-warn">No instalment options yet.</p>'}${addRow}
    ${tot ? `<p class="small cbr2-tot"><span class="lbl">Total payable</span> ${tot}</p>` : ''}`}
    ${mine.length ? `<ul class="list small cb8-iss">${mine.map(x => `<li class="li">${chip('To fix', 'red')} ${esc(x.msg)}</li>`).join('')}</ul>` : ''}</article>`;
}
// The deposit's effect on one instalment option, as sign-up applies it (CH-10 deposit route, PD-FC-11 deposit then instalments):
// one payment — deposit, then the balance by the end of the seat hold; more — the deposit is credited to payment 1, whose remainder
// is due by the end of the hold, and a deposit above payment 1 isn't offered with that option. Preview only (CBC1).
function cbr2DepPrev(dep, s, k) {
  if (!(dep > 0) || !s || !s.rows || !s.rows.length) return '';
  const r1 = s.rows[0], tot = s.rows.reduce((a, r) => a + fpP(r.amount), 0);
  const t = k === 1 ? `${money(dep, 'GBP')} at sign-up, then ${money(fpM(tot - fpP(dep)), 'GBP')} by the end of the seat hold.`
    : fpP(dep) > fpP(r1.amount) ? `The ${money(dep, 'GBP')} deposit is more than payment 1 (${money(r1.amount, 'GBP')}), so it isn't offered with ${k} payments.`
    : `${money(dep, 'GBP')} at sign-up; payment 1 becomes ${money(fpM(fpP(r1.amount) - fpP(dep)), 'GBP')}, due by the end of the seat hold. Later payments as above.`;
  return `<p class="xs cbr2-depx"><span class="strong">With a deposit:</span> ${t}</p>`;
}
// The pricing method (CBC1). A course priced one way shows the existing "Use fee options by delivery mode" note (crFoStart: audited,
// Finance re-approves). Fee options by delivery mode can't go back to one programme price — there is no such change — so the step
// says so instead of offering it. (The Course Details radio was read only when a course was created.)
const cbr2PmHtml = pr => (typeof crMultiFee === 'function' && crMultiFee(pr) ? `<p class="xs muted cbr2-pm"><span class="lbl">Pricing method</span> Fee options by delivery mode · fixed: a course with fee options can't return to one programme price.</p>` : '');
// "Dated examples from" (b096bf8, CBC1): previews only; nothing is saved and no learner's schedule changes
const cbr2Anchor = pr => cb8AnchorPick(pr).replace('Actual dates are fixed when each learner\'s batch and choice are known.', 'Illustrative preview only — each learner\'s dates are set from their own batch.');
function cbr2Fees(pr, focus) {
  const p = cbPanels(pr, 'payments');
  if (!cb8Managed(pr)) return cbcPayDurHtml(pr) + p.map(x => x[2]()).join(''); // terms from before packages: their own panels, as before
  const wf = cb8Wf(pr), pend = wf && wf.status === 'Pending', can = cbAdmin() && !cbRetired(pr) && !cbrArch(pr), ed = can && !pend, P = pend && wf.sub ? { ...wf.sub, opts: wf.sub.opts.map(o => ({ ...o, obsWp: o.keptWp, obsOff: o.keptOff })) } : cb8Work(pr), b = cb8Basis(pr), types = cbrTypes(pr), iss = ed ? cb8Issues(pr, P) : [];
  const opts = P.opts.filter(o => o.status === 'Active').concat(P.opts.filter(o => o.status !== 'Active')), seen = new Set();
  const grp = (t, list, h) => { list.forEach(o => seen.add(o.id)); return `<section class="cbr2-fg cbr-fg"${t ? ` data-lt="${esc(t.id)}"` : ''}><div class="row-b cbr2-fgh">${h}${t && ed && cb8L3(pr) ? `<button class="btn btn-sm" data-act="cb8Opt" data-p="${pr.id}" data-o="" data-mode="${esc(t.mode)}">${ic('plus', 13)}Add Fee Option</button>` : ''}</div>${list.length ? list.map(o => cbr2Opt(pr, P, o, b, ed, iss)).join('') : '<p class="small muted">No fee option yet.</p>'}</section>`; };
  let h = types.map(t => grp(t, opts.filter(o => o.mode && cbrLtOfOpt(pr, o, types) === t), CBR2_UP(t.label))).join('');
  const rest = opts.filter(o => !seen.has(o.id)); if (rest.length || !types.length) h += grp(null, rest, `${CBR2_UP(types.length ? 'Not linked to a learner type' : cb8L3(pr) ? 'Fee options' : 'Programme fee')}${ed && cb8L3(pr) && !types.length ? `<button class="btn btn-sm" data-act="cb8Opt" data-p="${pr.id}" data-o="">${ic('plus', 13)}Add Fee Option</button>` : ''}`);
  // Package-level issues (not tied to one option), Finance submission or approval, then the financial history (folded)
  const d = document.createElement('div'); d.innerHTML = cb8Panel(pr); const sub = d.querySelector('.cb8-submit'), state = d.querySelector('.cb8-state'), depf = d.querySelector('.cb8-depf'), one = d.querySelector('.cr-fo-one');
  // the programme deposit setting (E2) stays editable while any fee option uses it rather than its own
  const inh = P.opts.some(o => o.status === 'Active' && !o.dep), depBox = depf && inh ? `<div class="cbr2-pdep">${depf.outerHTML.replace(/<h3>Deposit[\s\S]*?<\/h3>/,'<h4>Programme deposit setting <span class="xs muted">used by fee options without their own</span></h4>')}</div>` : '';
  const hist = p.find(x => x[0] === 'payhist');
  return `<section class="card cbr2-fees cb8-sec">${state ? state.outerHTML : ''}${pend ? '<h3 class="cb8-subh">Submitted package (read-only)</h3>' : ''}${one ? one.outerHTML : ''}${cbcPayDurHtml(pr)}${cbr2PmHtml(pr)}${b.dur && P.opts.some(o => o.status === 'Active' && o.pay.length) ? cbr2Anchor(pr) : ''}${h}${depBox}${sub ? sub.outerHTML : ''}</section>
    ${hist ? cbrFold('cbr-fhist', 'Financial versions and history', hist[2](), focus === 'payhist' || focus === 'support', 'cbr-fhist') : ''}`;
}
const cbr2OptTxt = x => `${x.label}${x.mode ? ' · ' + x.mode : ''} · ${money(x.fee, 'GBP')} · workplace obs ${x.obsWp == null ? '—' : money(x.obsWp, 'GBP')} · office obs ${x.obsOff == null ? '—' : money(x.obsOff, 'GBP')}`;
// A field of a fee option: the same rules as the Edit fee option dialog
INP.cbr2OptF = el => {
  const g = cb8Guard(el, 'edit a fee option'); if (!g) { render(); return; } const { pr } = g, f = el.dataset.f, o = cb8Work(pr).opts.find(x => x.id === el.dataset.o), b = cb8Basis(pr), sel = '#' + CSS.escape(el.id);
  if (!o || o.status !== 'Active') { toast('Fee option not found.', 'err'); render(); return; }
  let v;
  if (f === 'label') { v = el.value.replace(/\s+/g, ' ').trim(); if (!v) return fieldErr(sel, 'Enter a name'); if (cb8Work(pr).opts.some(x => x.id !== o.id && x.status === 'Active' && x.label.toLowerCase() === v.toLowerCase())) return fieldErr(sel, 'Another fee option has this name'); }
  if (f === 'fee') { v = cb8Money(el.value); if (v == null) return fieldErr(sel, `Enter a fee from £0.01 to ${money(R1_FEE_MAX, 'GBP')} (pence at most)`);
    if (v !== o.fee && ((o.inForce && pr.status !== 'Draft') || o.legacy) && !isSA()) { logA('Payment Plans', `${o.label} (${o.id})`, 'Blocked: change the option fee', money(o.fee, 'GBP'), money(v, 'GBP'), 'Only the Super Administrator changes the fee of an option already in force'); render(); return toast('Only the Super Administrator changes the fee of an option already in force. Add a new fee option instead.', 'err'); } }
  if (f === 'obsWp' || f === 'obsOff') { const on = b.req === true && (f === 'obsWp' ? b.wp : b.off); if (!on) { render(); return; } if (el.value.trim() === '') v = null; else { v = cb8Money(el.value, true); if (v == null) return fieldErr(sel, `Enter £0 to ${money(CB8_OBS_MAX, 'GBP')}, in whole pence`); } }
  if (!['label', 'fee', 'obsWp', 'obsOff'].includes(f)) return;
  const W8 = cb8Mut(pr), t = W8.opts.find(x => x.id === o.id), was = cbr2OptTxt(t); if (t[f] === v) return;
  t[f] = v; cb8Touch(pr, 'Fee option changed', was, cbr2OptTxt(t)); render();
};
// Allow Deposit / its amount, per fee option (o.dep). The first change gives the option its own setting, starting from the package's.
INP.cbr2Dep = el => {
  const g = cb8Guard(el, 'change a fee option deposit'); if (!g) { render(); return; } const { pr } = g, W = cb8Work(pr), o = W.opts.find(x => x.id === el.dataset.o); if (!o || o.status !== 'Active') { render(); return; }
  const cur = cb8DepOf(W, o), k = el.dataset.k; let nx;
  if (k === 'allow') nx = el.checked ? (cur.mode !== 'none' ? { ...cur } : { mode: 'default', amount: null }) : { mode: 'none', amount: null };
  else if (k === 'default') nx = { mode: 'default', amount: null };
  else if (k === 'own') nx = { mode: 'own', amount: cur.mode === 'own' ? cur.amount : null };
  else if (k === 'amount') { const v = cb8Money(el.value); if (v == null) return fieldErr('#' + CSS.escape(el.id), 'Enter a deposit above £0, in whole pence'); if (o.fee > 0 && !(v < o.fee)) return fieldErr('#' + CSS.escape(el.id), `The deposit must be below the fee (${money(o.fee, 'GBP')})`); nx = { mode: 'own', amount: v }; }
  else return;
  nx = cb8DepCopy(nx); if (o.dep && o.dep.mode === nx.mode && o.dep.amount === nx.amount) return;
  const t = cb8Mut(pr).opts.find(x => x.id === o.id), was = t.dep ? cb8DepTxt(t.dep) : `programme setting (${cb8DepTxt(W.dep)})`; t.dep = nx;
  cb8Touch(pr, 'Fee option deposit changed', `${t.label}: ${was}`, `${t.label}: ${cb8DepTxt(nx)}`); render();
};
// Change one instalment option's count: the same checks as adding one (whole number, maximum, no duplicate, the duration allows it)
INP.cbr2K = el => {
  const g = cb8Guard(el, 'change a payment option'); if (!g) { render(); return; } const { pr } = g, o = cb8Work(pr).opts.find(x => x.id === el.dataset.o), k0 = +el.dataset.k; if (!o || !o.pay.some(x => x.k === k0)) { render(); return; }
  if (String(el.value).trim() === String(k0)) return;
  const r = cb8KRead(pr, { ...o, pay: o.pay.filter(x => x.k !== k0) }, el.value); if (r.why) return fieldErr('#' + CSS.escape(el.id), r.why);
  const t = cb8Mut(pr).opts.find(x => x.id === o.id), was = t.pay.map(x => x.k).join(', '); t.pay = t.pay.filter(x => x.k !== k0).concat({ id: 'P' + r.k, k: r.k }); cb8Sort(t);
  cb8Touch(pr, 'Payment option changed', `${t.label}: ${was}`, `${t.label}: ${t.pay.map(x => x.k).join(', ')} (${cb8PayLbl(k0)} → ${cb8PayLbl(r.k)})`); render();
};
const _payAddCBR2 = ACT.cb8PayAdd;
// once added, the add row closes
ACT.cb8PayAdd = function (el) {
  const pr = cbPr(el && el.dataset && el.dataset.p), n = () => (pr && cb8Managed(pr) ? (cb8Work(pr).opts.find(x => x.id === el.dataset.o) || { pay: [] }).pay.length : 0), k0 = n(), r = _payAddCBR2.apply(this, arguments);
  if (pr && n() > k0) { setUi('cbr2K.' + el.dataset.o, ''); render(); } return r;
};


/* ============ Step 6 — Offer Letters ============ */
// The letter a learner type's applicants get: its own template (CBR-1's per-type track) or the programme letter
const CBR2_MERGE = ['full_name', 'student_id', 'programme', 'payment_terms'];
function cbr2LetterWarn(pr, t, L) {
  if (!L) return [];
  const txt = (L.text || []).join(' '), out = [], unk = [...new Set((txt.match(/\{\{\s*([a-z_]+)\s*\}\}/gi) || []).map(m => m.replace(/[{}\s]/g, '')))].filter(k => !CBR2_MERGE.includes(k));
  if (unk.length) out.push(`Unknown merge field${unk.length > 1 ? 's' : ''}: ${unk.map(k => `{{${k}}}`).join(', ')} — left as written in the letter`);
  if (/\{\{payment_terms\}\}/.test(txt) || !cb8Managed(pr)) return out;
  const P = cb8Work(pr), opts = P.opts.filter(o => o.status === 'Active' && cbrLtOfOpt(pr, o) === t);
  if (opts.length && /deposit/i.test(txt) && opts.every(o => cb8DepOf(P, o).mode === 'none')) out.push(`The letter says "deposit", but no ${t.label} fee option offers one`);
  if (opts.length && /instalment/i.test(txt) && opts.every(o => o.pay.every(x => x.k === 1))) out.push(`The letter says "instalment", but ${t.label} fee options are paid in one payment`);
  return out;
}
function cbr2LetterCard(pr, t, can) {
  const own = cbrUsesOwn(pr.id, t.id), shared = cbrTrackCur(pr.id, null), L = own ? cbrTrackCur(pr.id, t.id) : shared, P = { p: pr.id, lt: t.id }, warn = cbr2LetterWarn(pr, t, L), hasOwn = !!cbrTrackCur(pr.id, t.id);
  return `<section class="cbr-lc cbr2-lc" data-lt="${esc(t.id)}">${CBR2_UP(t.label)}<p class="small">Offer letter for ${esc(t.label)} applicants</p>
    <p class="small cbr2-lcur">${L ? `${own ? 'Own template' : 'Programme letter'} · Version ${L.v} · <span class="mono">${esc(L.file)}</span>` : '<span class="cbr-warn">No offer letter yet.</span>'}</p>
    ${warn.length ? `<ul class="cbr2-lw">${warn.map(w => `<li class="xs">${ic('alert', 12)} ${esc(w)}</li>`).join('')}</ul>` : ''}
    <div class="row cbr2-lca">${can ? `<button class="btn btn-sm" data-act="cbrLetterUp" ${cbrDS(P)}>${ic('upload', 13)}Upload offer letter</button><button class="btn btn-sm" data-act="cbr2Tpl" ${cbrDS(P)}>Choose Template</button>` : ''}${L ? `<button class="btn btn-sm btn-ghost" data-act="s4LetterPrev" data-id="${pr.id}" data-v="${L.v}">Preview</button>` : ''}</div>
    ${own || hasOwn || L ? cbrFold('cbr-lh', 'Version history', cbrLetterHist(pr, hasOwn ? t.id : null, can), false) : ''}</section>`;
}
// Choose Template: the programme letter, this type's own template, or another learner type's template (copied in as a new version
// of this type's template — the source and every version stay unchanged). New applicants of the type get it; signed letters don't change.
ACT.cbr2Tpl = el => {
  const pr = cbPr(el.dataset.p), lt = el.dataset.lt; if (!pr || !s4LetterGuard(pr)) return;
  if (!cbrLetterCan(pr)) return cbrNo(pr, 'choose an offer letter template', 'Programme read-only', 'This programme is read-only.');
  const t = cbrTypesAll(pr).find(x => x.id === lt); if (!t) { toast('Learner type not found.', 'err'); return; }
  const cur = cbrUsesOwn(pr.id, lt) ? 'own' : 'shared', sh = cbrTrackCur(pr.id, null), mine = cbrTrackCur(pr.id, lt);
  const others = cbrTypesAll(pr).filter(x => x.id !== lt && cbrTrackCur(pr.id, x.id)).map(x => ({ x, L: cbrTrackCur(pr.id, x.id) }));
  const opt = (v, lbl, sub, on, dis) => `<label class="check"><input type="radio" name="cbr2-tpl" value="${esc(v)}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}><span><strong>${lbl}</strong><br><span class="xs muted">${sub}</span></span></label>`;
  reasonDlg({ title: `Choose Template — ${esc(t.label)}`, ok: 'Use this template', body: `<fieldset class="field n5-fs"><legend class="lbl">Template for ${esc(t.label)} applicants</legend>
    ${opt('shared', 'Programme letter', sh ? `Version ${sh.v} · ${esc(sh.file)}` : 'Not uploaded yet', cur === 'shared', !sh)}${opt('own', `${esc(t.label)} template`, mine ? `Version ${mine.v} · ${esc(mine.file)}` : 'Not uploaded yet — use Upload offer letter', cur === 'own', !mine)}
    ${others.map(({ x, L }) => opt('copy:' + x.id, `Copy of the ${esc(x.label)} template`, `Version ${L.v} · ${esc(L.file)} — copied as a new version of the ${esc(t.label)} template`, false, false)).join('')}</fieldset>
    <p class="small">Applies to applicants who start their sign-up from now on. Anyone already signing keeps their version; signed letters don't change.</p>`,
    onOk: r => {
      if (!cbrLetterCan(pr)) return false; const v = ($('#modal-root input[name="cbr2-tpl"]:checked') || {}).value; if (!v) { toast('Choose a template.', 'err'); return false; }
      const M = CBR().letter[pr.id] = CBR().letter[pr.id] || {}, was = cbrUsesOwn(pr.id, lt) ? `own template v${(cbrTrackCur(pr.id, lt) || {}).v}` : 'programme letter';
      if (v.startsWith('copy:')) { const src = cbrTrackCur(pr.id, v.slice(5)); if (!src) return false; const l = chLetters(pr.id), nv = l[l.length - 1].v + 1;
        l.push(Object.freeze({ v: nv, file: src.file, at: now().toISOString(), by: ADMIN.me.name, note: `Copied from the ${src.ltLabel || 'other'} template (version ${src.v}): ${r}`, programme: src.programme, text: Object.freeze(src.text.slice()), from: src.v, lt, ltLabel: t.label })); M[lt] = 'own'; }
      else if (v === 'own') { if (!mine) return false; M[lt] = 'own'; } else M[lt] = 'shared';
      const now_ = cbrUsesOwn(pr.id, lt) ? `own template v${cbrTrackCur(pr.id, lt).v}` : 'programme letter'; if (now_ === was) { toast('Nothing has changed.', 'info'); return; }
      logA('NVQ Programmes', pr.title, 'Offer letter template chosen', `${t.label}: ${was}`, `${t.label}: ${now_}`, r); render(); toast(`${t.label}: ${now_}.`);
    } });
};
function cbr2Letters(pr, focus) {
  const types = cbrTypes(pr), can = cbrLetterCan(pr);
  // the programme letter's own panel (merge fields, payment wording, its versions) and the signed letters, folded below the cards
  const all = STORE.chLetters && STORE.chLetters[pr.id], d = document.createElement('div'), lp = cbPanels(pr, 'documents').find(x => x[0] === 'letter');
  if (all && all.some(x => x.lt)) STORE.chLetters[pr.id] = all.filter(x => !x.lt);
  try { d.innerHTML = lp ? lp[2]() : ''; } finally { if (all) STORE.chLetters[pr.id] = all; }
  const signed = [...d.querySelectorAll('section.cb-signed')].map(n => { n.remove(); return n.outerHTML; }).join('');
    return `${types.length ? `<section class="card cbr2-letters cbr-letters"><div class="cbr2-lgrid">${types.map(t => cbr2LetterCard(pr, t, can)).join('')}</div></section>` : ''}
    ${cbrFold('cbr2-plf', 'Programme letter (shared template)', d.innerHTML, !types.length || focus === 'letter', 'cbr2-plf')}${signed ? cbrFold('cbr-signed', 'Signed letters', signed, false, 'cbr-signed') : ''}${cbrFold('cbr-docs', 'Required enrolment documents', cbDocsPanel(pr), focus === 'docs', 'cbr-docs')}`;
}

/* ============ Step 7 — Review & Publish ============ */
// One compact list: each step's summary, its real status, and its blockers and warnings with a way back to it
function cbr2Review(pr) {
  const d = document.createElement('div'), p = cbPanels(pr, 'review'); d.innerHTML = p.length ? p[0][2]() : '';
  const rv = d.querySelector('section.cb-rv'); if (!rv) return d.innerHTML;
  const steps = cbrSteps(pr).filter(s => s[0] !== 'review'), n = Object.fromEntries(steps.map(([k], i) => [k, i + 1]));
  rv.querySelectorAll('.cb-rv-sec').forEach(li => {
    const k = li.dataset.sec; if (!n[k] && !rv.querySelector(`.cb-rv-grp[data-sec="${k}"] li`)) { li.remove(); return; }
    const h = li.querySelector('h3'); if (h) h.innerHTML = `<span class="cb-hn">${n[k] || '–'}</span> ${esc((CB_SECTIONS.find(s => s[0] === k) || [k, k])[1])}`;
    const b = li.querySelector('.cb-rv-st [data-go]'); if (b) b.textContent = 'Edit';
    const items = rv.querySelectorAll(`.cb-rv-grp[data-sec="${k}"] li`); if (items.length) { const ul = document.createElement('ul'); ul.className = 'list small cbr2-rvi'; items.forEach(x => ul.appendChild(x)); li.appendChild(ul); }
  });
  rv.querySelectorAll('.cb-rv-todo, h3.cb-rv-h').forEach(x => x.remove());
  // provisional records outside the approved structure are not summarised; a fee option's own deposit is
  rv.querySelectorAll('.cb-rv-sec dl dt').forEach(dt => { if (/^(Entitlements|Display duration)$/.test(dt.textContent.trim())) { const dd = dt.nextElementSibling; if (dd) dd.remove(); dt.remove(); } });
  if (cb8Managed(pr)) { const P = cb8Work(pr), own = P.opts.filter(o => o.status === 'Active' && o.dep), dt = [...rv.querySelectorAll('.cb-rv-sec[data-sec="payments"] dl dt')].find(x => x.textContent.trim() === 'Deposit');
    if (own.length && dt && dt.nextElementSibling) dt.nextElementSibling.textContent = P.opts.filter(o => o.status === 'Active').map(o => `${o.label}: ${o.dep ? cb8DepTxt(o.dep) + (o.dep.mode !== 'none' ? ` (${money(cb8DepE(o.dep), 'GBP')})` : '') : cb8DepTxt(P.dep) + ' (programme setting)'}`).join(' · '); }
  rv.classList.add('cbr2-rv');
  const h2 = rv.querySelector(':scope > .row-b'); if (h2) h2.remove();
  return d.innerHTML;
}

/* ============ The steps ============ */
const _bodyCBR2 = cbrBody;
cbrBody = function (pr, sec, focus) {
  switch (sec) {
    case 'details': return cbr2Details(pr);
    case 'curriculum': return cbr2Cur(pr);
    case 'assessments': return cbr2Asgs(pr, focus);
    case 'observations': return cbr2Obs(pr, focus);
    case 'payments': return cbr2Fees(pr, focus);
    case 'documents': return cbr2Letters(pr, focus);
    case 'review': return cbr2Review(pr);
  }
  return _bodyCBR2.apply(this, arguments);
};
// The step title says where you are; the step bar and footer do the rest (no explanatory paragraph under it)
const _pageCBR2 = cbPage;
cbPage = function (pr, tab) {
  const h = _pageCBR2.apply(this, arguments);
  return h.replace(/(<p class="small muted cbr-hint">Step \d+ of \d+)[^<]*(<\/p>)/, '$1$2').replace(/(<span class="mono cb-abcode">[^<]*<\/span>|<span class="mono">—<\/span>)/, m => `${m} · Internal programme ID <span class="mono cbr2-pid">${esc(pr.id)}</span>`);
};
['cbr2Obs', 'cbr2Lt', 'cbr2LtAdd', 'cbr2LtRm', 'cbr2Res', 'cbr2ResGo', 'cbr2DocUp', 'cbr2DocRm', 'cbr2Key', 'cbr2Crit', 'cbr2Loc', 'cbr2Mode', 'cbr2Inh', 'cbr2Guide', 'cbr2OptF', 'cbr2Dep', 'cbr2K', 'cbr2Tpl'].forEach(n => { if (!CB_WRITE.includes(n)) CB_WRITE.push(n); });

/* ============ Records ============ */
UXC.push(['CBR-2', 'Course builder — the approved layout (6 Nov 2026)', [
  'Course Details: a two-column form (Course Name, Awarding Body, NVQ Level, Awarding Body Course Code, Display Duration, GLH, TQT, Credit Value; description below), Learner Types as compact cards (Label, Delivery Mode, Completion Window; Add / Remove), and "Observation required for this course" — ticking it shows the Observations step.',
  'Curriculum & Outcomes: Programme Resources first; then Unit → Module → Learning Outcome → Criterion, each with its Resource action (library or new) and the Add action at the end of each list.',
  'Assessments: Assessment Types with Manage Types; Full-Course, Unit and Module assessments, each with its questions, a written answer key per question, Map Criteria limited to the scope, Add Question and Assessment Answer-Key Documents (PDF, DOC, DOCX; versioned; staff only).',
  'Observations: Workplace and Academy columns, each with its checkbox and its categories, criteria (ticked in place), Add Criterion, evidence and guidance.',
  'Fees & Payment Plans: fee options grouped by learner type with the fields in place, Allow Deposit per option (Finance approves it with the package) and several instalment options per fee option. Offer Letters: a card per learner type. Review & Publish: one compact list.']]);
UXC.push(['CBC1', 'Course builder — correction batch 1 (6 Nov 2026)', [
  'Course Details: "Observation required for this course" is an explicit Yes / No and stays "Not answered" until one is chosen. Save draft keeps it unanswered; Next and creating a course ask for it. A new version answers again, with the previous version\'s answer beside it. Was: one checkbox, so saving any other field recorded No.',
  'Course Details: the folded change history (the same audit records and date filter as before the redesign) is back at the end of the step.',
  'Assessments › Manage Types: the type registry with Add type comes first, then "Used in this programme"; adding, saving and retiring a type say so; evidence methods without a marking workflow are labelled where they are chosen.',
  'Fees & Payment Plans: "Dated examples from" previews the due dates from the sample start or an upcoming batch (illustrative only), with the deposit\'s effect on each instalment option; "1 = pay in full" beside the number of instalments; the pricing method of a course with fee options is shown as fixed.']]);
UXC.push(['CBC2', 'Course builder — Step 4 Observations (6 Nov 2026)', [
  'Observations: Workplace Observation and Academy Observation side by side (stacked on a phone), each starting with its checkbox and, when on, its categories and criteria, Add from Library, Create Category, Add Criterion, evidence and guidance.',
  'Below them: the qualification criteria from the curriculum, shown once in a compact section (they are assessed wherever their observation takes place, with one evidence setting), then "Required Observations" — each one added by hand with + Add Required Observation (title, location, criteria, evidence), shown as a row with Edit and Remove. Nothing is created automatically.',
  'Removed or shortened: the repeated "Also observed here" lines, "Observation fees are set in Section 5", "Nothing here records or decides an outcome", the long events introduction and old section numbers; publishing messages say what to do ("Add at least one Required Observation before publishing.").']]);
