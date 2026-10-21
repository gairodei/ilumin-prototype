/* ============================================================
   CB2 — Course Details (20–21 Oct 2026; PD-CB-13…18 in PROVISIONAL-DECISIONS.md).
   Section 1 of the unified course builder is the entry point for a new NVQ programme and the place its details are edited.
   - "New NVQ programme" opens Section 1 of an unsaved course (#a-programmes.new). Nothing is created by opening it. The first valid
     "Save and continue" creates exactly one Draft (Version 1) through the existing creation chain (ch8Create: S4a plan, R1 fee
     options, E1 terms, audit) and opens Section 2 — Curriculum. A repeated click or submission never creates a second programme.
   - The form is the existing details form (ch8DetailsFields with its E1, R1, R5, N2 layers) plus the qualification details and a
     required "Does this course contain observations?" question. The answer is N5a's own field (the programme version's
     "Observation required"), written through N5a's gate and audit — no second field. Changing Yes to No keeps every observation
     criterion and setting (N5a: "No" demands nothing and keeps the configuration for history).
   - A Draft's details stay editable here (the existing save chain, so E1's rules apply: level and fee locked while Finance reviews
     the terms; a changed fee after approval needs approval again). Published, suspended, retired and seeded programmes show the same
     layout read-only; observation applicability of a draft version is edited here too.
   - Typed values are kept per programme while moving between sections; leaving them asks nothing, discarding them asks first.
   Loads after cb-builder.js.
   ============================================================ */
'use strict';

const CB_QUAL = [['body', 'Awarding body', 'text', 'e.g. City & Guilds, NCFE CACHE, Pearson'], ['glh', 'Guided learning hours (GLH)', 'num', ''], ['tqt', 'Total qualification time (TQT)', 'num', ''], ['credits', 'Credit value', 'num', '']];
let CB_CACHE = {};      // unsaved Course Details values, by programme ID ('new' = the course not yet saved)
let CB_MADE = {};       // new-course form token → the programme it created (repeated submissions open it instead)
let CB_TOK = null;      // the token of the new-course form being filled in
const _isCB2 = initStore; initStore = function () { CB_CACHE = {}; CB_MADE = {}; CB_TOK = null; return _isCB2.apply(this, arguments); };
const cbNewTok = () => (CB_TOK = CB_TOK || 'NEW-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6));
const cbCanCreate = () => S.portal === 'admin' && !!S.signedIn && ch8Can();
const cbObsOf = pr => { const d = pr && typeof n5Shown === 'function' ? n5Shown(pr) : null; return d ? d.required : null; }; // true / false / null (not recorded)
const cbObsEditable = pr => !!pr && !cbRetired(pr) && typeof n5DraftV === 'function' && !!n5DraftV(pr) && typeof n5CanEdit === 'function' && n5CanEdit();
const cbDetEditable = pr => !!pr && pr.chNew && pr.status === 'Draft' && cbAdmin();

/* ---------- Observation required: N5a's own field, through N5a's gate and audit ---------- */
function cbObsSet(pr, val, note) {
  const g = n5Gate({ dataset: { p: pr.id } }, 'change observation settings'); if (!g) return false;
  const { d } = g; if (d.required === val) return true;
  const was = n5Summary(pr, d); d.required = val; // only the applicability changes: criteria, routes and evidence stay as they were
  n5Log(pr, 'Observation settings changed', was, n5Summary(pr, d), note || `Version ${d.v} (draft) — Course Details`); return true;
}

/* ---------- The form ---------- */
const cbObsField = (v, editable) => `<fieldset class="field full cb-obs" ${editable ? '' : 'disabled'}><legend class="lbl">Does this course contain observations? <span class="cb-req">Required</span></legend>
  <div class="cb-obs-opts"><label class="check cb-obs-opt"><input type="radio" name="np-obs" id="np-obs-yes" value="yes" ${v === true ? 'checked' : ''}><span><strong>Yes</strong><br><span class="small muted">Learners are observed. Section 4 — Observations must be set up before publishing.</span></span></label>
  <label class="check cb-obs-opt"><input type="radio" name="np-obs" id="np-obs-no" value="no" ${v === false ? 'checked' : ''}><span><strong>No</strong><br><span class="small muted">No observations. Section 4 is not applicable and no observation fee will be asked for.</span></span></label></div>
  <span class="hint">Saved as this version's "Observation required" (the Observations section uses the same answer). Changing Yes to No keeps any observation criteria already set up.</span></fieldset>`;
const cbQualFields = q => `<div class="field full cb-qual-h"><span class="lbl">Qualification details</span><span class="hint">Where they apply. Leave blank if not known yet.</span></div>${CB_QUAL.map(([k, l, t, ph]) => `<div class="field"><label for="np-q-${k}">${l}</label><input class="input${t === 'num' ? ' num' : ''}" id="np-q-${k}" ${t === 'num' ? 'type="number" min="0" max="99999" step="1" inputmode="numeric"' : 'maxlength="120"'} value="${esc(q && q[k] != null ? q[k] : '')}" ${ph ? `placeholder="${esc(ph)}"` : ''}></div>`).join('')}`;
// The existing details form, with the qualification details and the observation question; key = programme ID or 'new'
function cbForm(pr, key) {
  const c = CB_CACHE[key], d = pr ? { ...pr, support: chSupportOf(pr.id) } : {};
  if (c && c.f['np-l']) d.level = c.f['np-l'];
  // Course code (the Academy's own identifier) and the qualification number / reference (the awarding body's) are separate fields;
  // the reference is the existing field, unchanged in content
  let h = ch8DetailsFields(d)
    .replace('<div class="field"><label for="np-l">', () => cbCodeField(pr) + '<div class="field"><label for="np-l">')
    .replace('>Awarding-body reference</label>', '>Qualification number / reference</label>')
    .replace(/(<input class="input mono" id="np-r"[^>]*>)/, '$1<span class="hint">The awarding body\'s identifier for the qualification, as issued.</span>')
    .replace('<div class="field full"><label for="np-ds">', () => `${cbQualFields(pr && pr.qual)}<div class="field full"><label for="np-ds">`);
  // Fee fields stay where creation needs them until Fees & Payments takes them over (CB8)
  h = h.replace('<div class="field r1-np-price"', '<p class="field full cb-interim xs muted">Fees are entered here for now. They move to Section 5 — Fees &amp; Payments (CB8).</p><div class="field r1-np-price"');
  const obs = c && c.r['np-obs'] ? c.r['np-obs'] === 'yes' : pr ? cbObsOf(pr) : null;
  const t = document.createElement('template'); t.innerHTML = `<div class="cb-det-form${pr ? '' : ' cb-new'}" data-cb-keep data-key="${esc(key)}">${cbObsField(obs, true)}${h}</div>`;
  if (c) cbRestore(t.content.firstElementChild, c);
  return t.innerHTML;
}
// Keep / restore what was typed (inputs by id, radios by name, the Level 3 fee-option rows)
function cbSnap(form) {
  const f = {}, r = {}; form.querySelectorAll('input[id], select[id], textarea[id]').forEach(x => { if (x.type !== 'radio' && x.type !== 'checkbox') f[x.id] = x.value; });
  form.querySelectorAll('input[type="radio"]:checked').forEach(x => { r[x.name] = x.value; });
  const rows = [...form.querySelectorAll('.r1-np-row')].map(x => ({ label: x.querySelector('.r1-np-l').value, fee: x.querySelector('.r1-np-f').value, mode: x.querySelector('.r1-np-m').value }));
  return { f, r, rows };
}
function cbRestore(form, c) {
  Object.entries(c.f).forEach(([id, v]) => { const x = form.querySelector('#' + CSS.escape(id)); if (!x) return; if (x.tagName === 'TEXTAREA') x.textContent = v; else if (x.tagName === 'SELECT') [...x.options].forEach(o => { o.toggleAttribute('selected', o.value === v || (!o.value && o.textContent === v)); }); else x.setAttribute('value', v); });
  Object.entries(c.r).forEach(([n, v]) => form.querySelectorAll(`input[type="radio"][name="${n}"]`).forEach(x => x.toggleAttribute('checked', x.value === v)));
  const list = form.querySelector('.r1-np-list'); if (list && c.rows.length) list.innerHTML = c.rows.map(o => r1NpRow(o)).join('');
}
const cbCaptureEv = e => { const f = e.target && e.target.closest && e.target.closest('.cb-det-form'); if (f && !e.target.closest('#modal-root')) CB_CACHE[f.dataset.key] = cbSnap(f); };
document.addEventListener('input', cbCaptureEv); document.addEventListener('change', cbCaptureEv);
// rows added or removed are part of what was typed
const _npAddCB2 = ACT.r1NpAdd, _npDelCB2 = ACT.r1NpDel;
ACT.r1NpAdd = function () { const r = _npAddCB2.apply(this, arguments), f = $('main .cb-det-form'); if (f && !MODAL) CB_CACHE[f.dataset.key] = cbSnap(f); return r; };
ACT.r1NpDel = function () { const r = _npDelCB2.apply(this, arguments), f = $('main .cb-det-form'); if (f && !MODAL) CB_CACHE[f.dataset.key] = cbSnap(f); return r; };

/* ---------- Course code: the Academy's own identifier, separate from the awarding body's qualification number ----------
   Stored upper-case on the programme record (pr.code). 2–20 letters, digits or hyphens, starting with a letter; unique across
   programmes (case does not matter). Required for every new course, and kept required once a programme has one; programmes from
   before course codes have none (shown "Not recorded" — never derived from the reference) and may stay blank until one is given. */
const CB_CODE_RE = /^[A-Z][A-Z0-9-]{1,19}$/;
const cbCodeField = pr => `<div class="field"><label for="np-code">Course code</label><input class="input mono" id="np-code" maxlength="20" autocomplete="off" value="${esc(pr && pr.code ? pr.code : '')}" placeholder="e.g. L3DAC-6M"><span class="hint">The Academy's own identifier for this course. 2–20 letters, digits or hyphens, starting with a letter; unique.${pr && !pr.code ? ' This programme has none yet — add one, or leave it blank.' : ''}</span></div>`;
// The code typed, checked; returns the code, null (blank, allowed only for a programme that never had one), or false (field marked)
function cbCodeRead(pr) {
  const v = v8('#np-code').trim().toUpperCase();
  if (!v) return (!pr || pr.code) ? (fieldErr('#np-code', 'Enter a course code — the Academy\'s own identifier for this course'), false) : null;
  if (!CB_CODE_RE.test(v)) return fieldErr('#np-code', 'Use 2–20 letters, digits or hyphens, starting with a letter (for example L3DAC-6M)'), false;
  const other = (ADMIN.programmes || []).find(p => p !== pr && p.code && p.code.toUpperCase() === v);
  if (other) return fieldErr('#np-code', `This course code is already used by ${other.title}`), false;
  return v;
}
function cbSaveCode(pr, code, why) {
  const was = pr.code || null; if (code === was || (code == null && !was)) return;
  pr.code = code; logA('NVQ Programmes', `${pr.title} (${pr.id})`, was ? 'Course code changed' : 'Course code set', was || '—', code, why || 'Course Details');
}

// The course code, qualification details and the observation answer; returns them or null (with the field marked)
function cbExtras(pr) {
  const code = cbCodeRead(pr || null); if (code === false) return null;
  const q = {}; for (const [k, l, t] of CB_QUAL) { const v = v8('#np-q-' + k).trim();
    if (t === 'num' && v !== '' && !(/^\d{1,5}$/.test(v))) return fieldErr('#np-q-' + k, `Enter ${l.replace(/ \(.*\)/, '').toLowerCase()} as a whole number, or leave it blank`), null;
    q[k] = v === '' ? null : t === 'num' ? +v : v; }
  const o = ($('main input[name="np-obs"]:checked') || {}).value;
  if (!o) return fieldErr('#np-obs-yes', 'Choose Yes or No — does this course contain observations?'), null;
  return { code, qual: q, obs: o === 'yes' };
}
const cbQualTxt = q => (q && CB_QUAL.some(([k]) => q[k] != null) ? CB_QUAL.filter(([k]) => q[k] != null).map(([k, l]) => `${l.replace(/ \(.*\)/, '')}: ${q[k]}`).join(' · ') : '—');
function cbSaveQual(pr, q, why) {
  const was = cbQualTxt(pr.qual), now_ = cbQualTxt(q); if (was === now_) return;
  pr.qual = { ...q }; logA('NVQ Programmes', `${pr.title} (${pr.id})`, 'Qualification details changed', was, now_, why || 'Course Details');
}

/* ---------- Section 1 for a programme ---------- */
const cbNoteUnsaved = key => (CB_CACHE[key] ? `<div class="note b-amber cb-unsaved" role="status">${ic('info')}<div class="small"><strong>Unsaved changes.</strong> What you typed is kept while you move between sections. Save it, or discard it. <button class="btn btn-sm btn-ghost" data-act="cbDetDiscard" data-key="${esc(key)}">Discard changes</button></div></div>` : '');
function cbDetails(pr) {
  if (cbDetEditable(pr)) {
    return `${cbNoteUnsaved(pr.id)}<section class="card cb-details"><h2>Course details</h2>${cbForm(pr, pr.id)}
      <div class="row cb-det-acts"><button class="btn btn-primary" data-act="cbDetSave" data-id="${pr.id}" data-next="curriculum">Save and continue to Curriculum</button><button class="btn" data-act="cbDetSave" data-id="${pr.id}">Save details</button></div></section>
      ${auditPanel(a => a.module === 'NVQ Programmes' && String(a.entity || '').includes(pr.id))}`;
  }
  return cbDetailsView(pr);
}
// The same layout, read-only: published, suspended, retired, seeded programmes, and anyone who can't edit
function cbDetailsView(pr) {
  const obs = cbObsOf(pr), l3 = cbIsL3(pr), dv = cbDraftV(pr), q = pr.qual || {};
  const why = cbRetired(pr) ? 'Retired — a read-only historical record.'
    : !pr.chNew ? 'Details of programmes that existed before the course builder are read-only in this prototype: their title and reference are used throughout learners\' records.'
    : pr.status === 'Draft' ? 'Only the Super Admin, Academic Admin and System Admin can edit a Draft programme\'s details.'
    : `Version ${pr.version} is published, so its details are fixed for the learners on it.`;
  const obsEd = cbObsEditable(pr) && !(pr.chNew && pr.status === 'Draft');
  return `${obsEd ? cbNoteUnsaved(pr.id) : ''}<section class="card cb-details"><h2>Course details</h2><p class="small muted cb-ro-why">${ic('lock', 12)} ${esc(why)}</p>
    <dl class="kv cb-dl"><dt>Course name</dt><dd>${esc(pr.title)}</dd><dt>NVQ level</dt><dd>${esc(pr.level)}</dd><dt>Course code</dt><dd>${pr.code ? `<span class="mono">${esc(pr.code)}</span>` : '<span class="muted">Not recorded</span>'}</dd><dt>Qualification number / reference</dt><dd>${pr.ref ? `<span class="mono">${esc(pr.ref)}</span>` : '<span class="muted">Not recorded</span>'}</dd>
    ${CB_QUAL.map(([k, l]) => `<dt>${l}</dt><dd>${q[k] != null ? esc(String(q[k])) : '<span class="muted">Not recorded</span>'}</dd>`).join('')}
    <dt>Duration</dt><dd>${typeof e1DurHtml === 'function' ? e1DurHtml(pr) : esc(pr.dur || '—')}</dd><dt>Description</dt><dd>${pr.desc ? esc(pr.desc) : '<span class="muted">—</span>'}</dd>
    <dt>Delivery mode</dt><dd>${l3 ? 'From each learner\'s fee option — one batch can hold both' : `Default for new batches: ${esc(chSupportOf(pr.id))}`}</dd>
    <dt>Fees</dt><dd>See Section 5 — Fees &amp; Payments.</dd>
    <dt>Observations</dt><dd class="cb-obs-ro">${obs === true ? chip('Yes', 'green') : obs === false ? chip('No — not applicable', 'grey') : chip('Not recorded', 'amber')}${dv && !cbRetired(pr) ? ` <span class="xs muted">Version ${dv} (draft)</span>` : ''}</dd></dl></section>
    ${obsEd ? `<section class="card cb-obs-card"><h2>Observations — Version ${dv} (draft)</h2><div class="cb-det-form" data-cb-keep data-key="${pr.id}">${cbObsFieldFor(pr)}</div><div class="row"><button class="btn btn-primary" data-act="cbObsSave" data-id="${pr.id}">Save observation answer</button></div></section>` : ''}`;
}
const cbObsFieldFor = pr => { const c = CB_CACHE[pr.id], v = c && c.r['np-obs'] ? c.r['np-obs'] === 'yes' : cbObsOf(pr); return cbObsField(v, true); };

/* ---------- Section 1 of a course that isn't saved yet ---------- */
function cbNewPage() {
  const crumbs = [['NVQ Programmes', 'a-programmes'], ['New NVQ programme']];
  if (!cbCanCreate()) return `${pageA('New NVQ programme', '', '', crumbs)}<div class="note b-red" role="status">${ic('lock')}<div class="small"><strong>You can't create programmes.</strong> Programmes are created by the Super Admin, Academic Admin or System Admin.</div></div>`;
  const tok = cbNewTok(), nav = `<nav class="cb-nav" aria-label="Course builder sections"><ol>${CB_SECTIONS.map(([k, l], n) => `<li><button class="cb-sec${n ? '' : ' cur'}" data-tab="${k}" ${n ?`disabled aria-disabled="true" title="Save Course Details first"` : 'aria-current="page"'}><span class="cb-n" aria-hidden="true">${n + 1}</span><span class="cb-l">${esc(l)}</span>${n ? '<span class="cb-badge">After saving</span>' : '<span class="cb-badge">Not saved</span>'}</button></li>`).join('')}</ol></nav>`;
  return `${pageA('New NVQ programme', 'Not saved yet', chip('Unsaved', 'amber'), crumbs)}
    <div class="cb cb-newpage" data-sec="details"><div class="note b-blue cb-ver" role="status">${ic('info')}<div class="small"><strong>Start with the course details.</strong> Nothing is saved until you choose "Save and continue". That creates the Draft (Version 1) and opens Curriculum; the other sections open after that.</div></div>
    ${nav}<h2 class="cb-h"><span class="cb-hn">1</span> Course Details</h2>
    <div class="cb-body" data-label="Course Details">${CB_CACHE.new ? `<div class="note b-amber cb-unsaved" role="status">${ic('info')}<div class="small"><strong>Your entries are kept.</strong> This course isn't saved yet. <button class="btn btn-sm btn-ghost" data-act="cbDetDiscard" data-key="new">Discard and start again</button></div></div>` : ''}
    <section class="card cb-details"><h2>Course details</h2>${cbForm(null, 'new')}</section></div>
    <div class="row-b cb-foot"><button class="btn" data-go="a-programmes">Back to NVQ Programmes</button><button class="btn btn-primary" data-act="cbDetCreate" data-tok="${tok}">Save and continue to Curriculum</button></div></div>`;
}
const _pbCB2 = progBuilder;
progBuilder = function (id) { return id === 'new' ? cbNewPage() : _pbCB2.apply(this, arguments); };

/* ---------- Actions ---------- */
ACT.chProgNew = () => {
  if (!cbCanCreate()) { logA('NVQ Programmes', '—', 'Blocked: create programme', '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('Only the Super Admin, System Admin or Academic Admin can create a programme.', 'err'); return; }
  go('a-programmes', { id: 'new', tab: 'details' });
};
ACT.cbDetCreate = el => {
  if (!cbCanCreate()) { logA('NVQ Programmes', '—', 'Blocked: create programme', '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('Only the Super Admin, System Admin or Academic Admin can create a programme.', 'err'); return false; }
  const tok = (el && el.dataset && el.dataset.tok) || CB_TOK, made = tok && CB_MADE[tok];
  if (made && cbPr(made)) { go('a-programmes', { id: made, tab: 'curriculum' }); toast('This course is already saved — it is open now.', 'info'); return cbPr(made); } // a repeated submission: no second programme
  if (!$('main .cb-det-form.cb-new')) { toast('Open New NVQ programme to create a course.', 'err'); return false; }
  const d = ch8ReadDetails(null); if (!d) return false; // the field is marked; nothing is created
  const x = cbExtras(null); if (!x) return false;
  const pr = ch8Create(d); if (tok) CB_MADE[tok] = pr.id;
  cbSaveCode(pr, x.code, 'Set when the course was created'); cbSaveQual(pr, x.qual, 'Set when the course was created');
  cbObsSet(pr, x.obs, 'Version 1 (draft) — set when the course was created');
  delete CB_CACHE.new; CB_TOK = null;
  go('a-programmes', { id: pr.id, tab: 'curriculum' }); toast('Draft saved — Version 1. Next: Curriculum.'); return pr;
};
ACT.cbDetSave = el => {
  const pr = cbPr(el.dataset.id); if (!pr) return;
  if (cbRetired(pr)) { logA('NVQ Programmes', cbEnt(pr), 'Blocked: cbDetSave (programme retired)', '—', '—', ADMIN.me.name); toast('This programme is retired, so it is read-only.', 'err'); return; }
  if (!cbAdmin()) { s3Refuse('change the course details', cbEnt(pr)); return; }
  if (!cbDetEditable(pr)) { toast('A published programme\'s details are fixed for its learners.', 'err'); return; }
  const x = cbExtras(pr); if (!x) return;
  const a0 = ADMIN.audit.length; ACT.ch8SaveDetails({ dataset: { id: pr.id } }); // the existing save: validation, E1 rules, audit
  if (!ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(a => a.action === 'Details changed')) return; // not saved (the field is marked)
  cbSaveCode(pr, x.code); cbSaveQual(pr, x.qual); cbObsSet(pr, x.obs);
  delete CB_CACHE[pr.id]; if (el.dataset.next) go('a-programmes', { id: pr.id, tab: el.dataset.next }); else render();
  toast(el.dataset.next ? 'Saved. Next: Curriculum.' : 'Course details saved.');
};
ACT.cbObsSave = el => {
  const pr = cbPr(el.dataset.id); if (!pr) return;
  if (!n5Gate({ dataset: { p: pr.id } }, 'change observation settings')) return; // permission and an editable draft first (refusals logged by N5a)
  const o = ($('main input[name="np-obs"]:checked') || {}).value; if (!o) { fieldErr('#np-obs-yes', 'Choose Yes or No'); return; }
  if (cbObsSet(pr, o === 'yes')) { delete CB_CACHE[pr.id]; render(); toast('Saved in the draft version.'); }
};
ACT.cbDetDiscard = el => {
  const key = el.dataset.key;
  confirmDlg({ title: 'Discard unsaved changes?', ok: 'Discard changes', cancel: 'Keep them', danger: true, body: `<p class="small">${key === 'new' ? 'The course you started isn\'t saved. Everything you typed is cleared.' : 'The details go back to what was last saved.'}</p>`,
    onOk: () => { delete CB_CACHE[key]; if (key === 'new') CB_TOK = null; closeModal(); render(); toast('Changes discarded.'); } });
};
// Retired programmes: these buttons aren't shown (CB_WRITE); the actions check role and retirement themselves (above, and n5Gate)
['cbDetSave', 'cbObsSave'].forEach(n => { if (!CB_WRITE.includes(n)) CB_WRITE.push(n); });

/* ---------- Records ---------- */
UXC.push(['CB2', 'Course Details — the entry point for a new NVQ programme (21 Oct 2026)', [
  '"New NVQ programme" opens Section 1 — Course Details of an unsaved course (no dialog). Nothing is created by opening it; the first valid "Save and continue" creates one Draft (Version 1) and opens Curriculum. A repeated click or submission opens the course already created instead of making a second one.',
  'Course Details: course name, NVQ level, course code (the Academy\'s own identifier — 2–20 letters, digits or hyphens, unique; required for new courses; "Not recorded" for programmes from before codes, never made up), qualification number / reference (the awarding body\'s identifier — the existing field, values unchanged), awarding body, GLH, TQT, credit value, duration (number and unit), description, and the required "Does this course contain observations?" (Yes / No). The answer is the programme version\'s N5a "Observation required" — the Observations section shows and edits the same answer. Fees stay on this form until Fees & Payments takes them over (CB8).',
  'A Draft\'s details are edited here with "Save details" or "Save and continue", through the existing save (Finance rules unchanged). Yes → No keeps the observation configuration; Section 4 is marked "Not applicable" and the observation fee rate isn\'t asked for. Published, suspended, retired and seeded programmes show the same layout read-only; a draft version\'s observation answer is edited here.',
  'What you type is kept while you move between sections ("Unsaved changes" with Discard); discarding asks first.']]);
const _aIdxCB2 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB2(p) + `<section class="card idx-sec"><h2>CB2 — Course Details</h2><ul class="idx-list">${[
  chIdxLi('New NVQ programme — Course Details (unsaved course)', { act: 'aJump', t: 'a-programmes.new.details' }, 'CB2 — the entry point: nothing is created until "Save and continue".'),
  chIdxLi('New programme NV-N1 (Draft) — Course Details', { act: 'aJump', t: 'a-programmes.NV-N1.details' }, 'CB2 — a Draft\'s details, editable, with the observation question.'),
  chIdxLi('Level 3 Diploma (published) — Course Details', { act: 'aJump', t: 'a-programmes.NV-L3.details' }, 'CB2 — the same layout, read-only.')].join('')}</ul></section>`;
