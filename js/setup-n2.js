/* ============================================================
   N2 — NVQ batch-level delivery mode: Fully Assisted / Self-Paced (SRS v1.3.2, P-31 internally resolved; client
   approval pending). The delivery mode belongs to the BATCH (b.dmode), separate from the delivery channel (b.mode:
   Online / Classroom / Blended). The programme's "Support type" is now only the default pre-selected for new batches.
   Set when a batch is created (Super Admin, Academic Admin); changeable only while no learner is enrolled. Observation
   fees (CH-38) still follow the programme setting until N5 — a known transitional limitation. Loads after setup-n4.js.
   ============================================================ */
'use strict';

const N2_MODES = ['Fully Assisted', 'Self-Paced'];
const n2IsNvqTitle = t => !!t && s3Progs().some(p => p.title === t);
// The programme's default for NEW batches (the old programme-level "Support type", P-31)
const n2DefaultFor = title => { const p = s3Progs().find(x => x.title === title); return p && chSupportOf(p.id) === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; };
const n2ModeOf = b => (b && b.dmode) || null;
const n2Label = b => { const m = n2ModeOf(b); return m ? m + (b.dmodeSrc === 'seed default' ? ' (seeded default — not client-confirmed)' : '') : '—'; };
const n2Can = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()));
// Create batch (and its delivery mode): Super Admin, Academic Admin and System Admin — per the client-confirmed permissions
// document ("Illumin - Roles and Permissions - Tick to Confirm (2)_Updated": System Administrator → Batches and Schedule → Create and edit batches ☒)
const n2CanCreate = () => n2Can() || (S.portal === 'admin' && typeof isSys === 'function' && isSys());
const n2HasLearners = b => (b.enrolled || 0) > 0 || n4BatchLids(b.code).length > 0;
const n2Refuse = (b, what, why) => { logA('Batches', b ? `${b.label} (${b.code})` : 'Batches', 'Blocked: ' + what, b ? n2ModeOf(b) || '—' : '—', '—', why); toast(why, 'err'); return false; };

/* ---------- Seed reconciliation ---------- */
// No fixture records a delivery mode. Every existing NVQ batch is timetabled with weekly classes (the batch overview, the
// default schedule template and the seeded Croydon weekly class), which is the Fully Assisted pattern, so each gets
// "Fully Assisted" marked as a seeded default (not client-confirmed). Batches of other courses get no delivery mode.
function n2Seed() { (ADMIN.batches || []).forEach(b => { if (!b.dmode && n2IsNvqTitle(b.course)) { b.dmode = 'Fully Assisted'; b.dmodeSrc = 'seed default'; } }); }
const _baN2 = buildAdmin; buildAdmin = function () { const r = _baN2.apply(this, arguments); if (STORE.worlds) n2Seed(); return r; };
const _isN2 = initStore; initStore = function () { const r = _isN2.apply(this, arguments); n2Seed(); return r; };

/* ---------- Create batch (academic.js wizard) ---------- */
const n2NbField = d => !n2IsNvqTitle(d.course) ? '<input type="hidden" id="nb-dm" value="">' : `<div class="field"><label for="nb-dm">Delivery mode</label><select class="select" id="nb-dm">${N2_MODES.map(m => `<option ${m === (d.dmode || n2DefaultFor(d.course)) ? 'selected' : ''}>${m}</option>`).join('')}</select><span class="hint" id="nb-dmh">Programme default for new batches: ${esc(n2DefaultFor(d.course))}. Separate from the delivery channel.</span></div>`;
INP.n2NbCourse = el => { const s = $('#nb-dm'); if (s && s.tagName === 'SELECT') { s.value = n2DefaultFor(el.value); const h = $('#nb-dmh'); if (h) h.textContent = `Programme default for new batches: ${n2DefaultFor(el.value)}. Separate from the delivery channel.`; } };
const _nbN2 = ACT.newBatch;
ACT.newBatch = function () { if (!n2CanCreate()) return n2Refuse(null, 'create batch', 'Only the Super Admin, Academic Admin or System Admin can create a batch.'); return _nbN2.apply(this, arguments); };
const _sybN2 = syncTasBatches;
syncTasBatches = function () { (ADMIN.batches || []).forEach(b => { if (b.dmodeSrc === 'set' && !b.dmodeLogged) { b.dmodeLogged = true; logA('Batches', `${b.label} (${b.code})`, 'Delivery mode set', '—', b.dmode, 'Batch created'); } }); return _sybN2.apply(this, arguments); };

/* ---------- Edit batch details (setup-s4b.js): only while no learner is enrolled ---------- */
const n2EditField = b => !n2IsNvqTitle(b.course) ? '' : n2HasLearners(b)
  ? `<div class="field"><label for="bd-dm">Delivery mode</label><select class="select" id="bd-dm" disabled><option>${esc(b.dmode)}</option></select><span class="hint">${ic('lock', 12)} Learners are enrolled, so the delivery mode can't change here — that needs an approved transfer and impact policy.</span></div>`
  : `<div class="field"><label for="bd-dm">Delivery mode</label><select class="select" id="bd-dm">${N2_MODES.map(m => `<option ${m === b.dmode ? 'selected' : ''}>${m}</option>`).join('')}</select><span class="hint">No learners yet — it can still change (with a reason).</span></div>`;
function n2CanChangeMode(b, to) {
  if (!n2CanCreate()) { n2Refuse(b, 'change delivery mode', 'Only the Super Admin, Academic Admin or System Admin can change a batch\'s delivery mode.'); return false; }
  if (!N2_MODES.includes(to)) { fieldErr('#bd-dm', 'Choose Fully Assisted or Self-Paced'); return false; }
  if (n2HasLearners(b)) { n2Refuse(b, 'change delivery mode', `${b.code} has enrolled learners — its delivery mode can't change in this stage (a transfer / impact policy is needed).`); return false; }
  return true;
}
function n2SetMode(b, to, r) { const was = b.dmode || '—'; b.dmode = to; b.dmodeSrc = 'set'; (b.dmodeHist = b.dmodeHist || []).unshift([now().toISOString(), ADMIN.me.name, was, to, r]); logA('Batches', `${b.label} (${b.code})`, 'Delivery mode changed', was, to, r); }

/* ---------- One property, shown everywhere a batch is identified ---------- */
const N2_SP_SUPPORT = 'Self-Paced: a limited number of scheduled classes. Academic support is through LMS messages to the Coordinator and teachers — not routine phone calls.';
const _dtN2 = dt;
dt = function (cfg) {
  if (cfg && (cfg.id === 'batches' || cfg.id === 'kbatches' || String(cfg.id).startsWith('cbatches-')) && Array.isArray(cfg.cols) && !cfg.cols.some(c => c.k === 'dmode')) { const cols = cfg.cols.slice(), i = cols.findIndex(c => c.k === 'course'); cols.splice(i >= 0 ? i + 1 : 1, 0, { k: 'dmode', l: 'Delivery mode', h: b => n2ModeOf(b) ? chip(n2ModeOf(b), n2ModeOf(b) === 'Self-Paced' ? 'blue' : 'grey') : '—', v: b => n2ModeOf(b) || '' }); cfg = { ...cfg, cols }; }
  return _dtN2.call(this, cfg);
};
const _bdN2 = batchDetail;
batchDetail = function (code) { const h = _bdN2.apply(this, arguments), b = ADMIN.batches.find(x => x.code === code); if (!b || !n2ModeOf(b)) return h; return h.replace('<p class="small s4b-bdates">', `<p class="small n2-mode">Delivery mode: <strong>${esc(n2Label(b))}</strong>${n2ModeOf(b) === 'Self-Paced' ? ` · ${esc(N2_SP_SUPPORT)}` : ''}${(b.dmodeHist || []).length ? ` · changed ${fdt(b.dmodeHist[0][0])} by ${esc(b.dmodeHist[0][1])}` : ''}</p><p class="small s4b-bdates">`); };
// Coordinator: batch overview (Mode was the channel; the description assumed weekly classes for every batch)
const _cBatchN2 = SCREENS['c-batches'];
SCREENS['c-batches'] = p => {
  let h = _cBatchN2(p); const b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b || !n2ModeOf(b)) return h;
  h = h.replace(`<dt>Mode</dt><dd>${b.mode}</dd>`, `<dt>Delivery channel</dt><dd>${b.mode}</dd><dt>Delivery mode</dt><dd class="n2-mode">${esc(n2Label(b))}</dd>`);
  return h.replace(`${b.mode} delivery with weekly live classes and monthly classroom days.`, n2ModeOf(b) === 'Self-Paced' ? esc(N2_SP_SUPPORT) : `Fully Assisted: ${b.mode} delivery with weekly live classes and monthly classroom days.`);
};
// Learner: programme overview and the sign-up batch panel
const n2BatchOfW = w => { const c = s4bBatchOfW(w); return c ? ADMIN.batches.find(b => b.code === c) : null; };
const _hubN2 = nvqHub;
nvqHub = function (e) {
  const h = _hubN2.apply(this, arguments), b = n2BatchOfW(W), m = n2ModeOf(b);
  return h.replace(`<dt>Delivery mode</dt><dd>${esc(e.mode)}</dd>`, `<dt>Delivery channel</dt><dd>${esc(e.mode)}</dd>${m ? `<dt>Delivery mode</dt><dd class="n2-mode">${esc(m)}${m === 'Self-Paced' ? `<div class="xs muted">${esc(N2_SP_SUPPORT)}</div>` : ''}</dd>` : ''}`);
};
const _assignedN2 = chAssignedHtml;
chAssignedHtml = function (w) { const h = _assignedN2.apply(this, arguments), b = chNearestFor(w), m = n2ModeOf(b); return m ? h.replace(`<p class="small muted">${esc(b.mode)} · in `, `<p class="small muted">${esc(b.mode)} · <span class="n2-mode">${esc(m)}</span> · in `) : h; };

/* ---------- Programme "Support type" = the default for new batches (P-31, proposed resolution) ---------- */
const N2_P31 = 'Each NVQ batch has its own delivery mode (Fully Assisted or Self-Paced), chosen when the batch is created. This programme setting only pre-selects the mode for new batches — it never changes an existing batch or its learners. Transitional until N5: the observation fee (CH-38) is still worked out from this programme setting, not from the learner\'s batch.';
const _supTabN2 = chSupportTab;
chSupportTab = function (pr) { return _supTabN2.apply(this, arguments).replace('<h2>Support type</h2>', `<h2>Support type — default delivery mode for new batches</h2><div class="note b-blue n2-p31">${ic('info')}<div class="small">${esc(N2_P31)}</div></div>`); };
const _detN2 = ch8DetailsFields;
ch8DetailsFields = function () { return _detN2.apply(this, arguments).replace('<legend class="lbl">Support type</legend>', '<legend class="lbl">Default delivery mode for new batches</legend>').replace(`<span class="small">${CH_P31}</span></fieldset>`, `<span class="small">${CH_P31}</span><span class="hint n2-p31">Each batch has its own delivery mode, chosen when the batch is created; this only pre-selects it.</span></fieldset>`); };
const _setupN2 = ch8Setup;
ch8Setup = function () { return _setupN2.apply(this, arguments).replace('<dt>Support type</dt>', '<dt>Default delivery mode for new batches</dt>'); };

/* ---------- Records ---------- */
UXC.push(['N2', 'NVQ batch-level delivery mode: Fully Assisted / Self-Paced (SRS v1.3.2, P-31 proposed resolution)', [
  'Each NVQ batch has a delivery mode — Fully Assisted or Self-Paced — stored once on the batch and separate from the delivery channel (Online / Classroom / Blended, now labelled "Delivery channel"). Two batches of the same programme can have different modes; they share the programme\'s structure, versions, criteria, assessments, observations and certificate rules.',
  'Create batch (Super Admin, Academic Admin, System Admin — others are refused and logged) asks for the delivery mode, pre-selected from the programme\'s default; it is shown on the batch list and detail, the Coordinator\'s batch list and overview, the learner\'s programme overview and the sign-up batch panel. Edit batch details can change it only while no learner is enrolled, with a reason (audited); once learners are enrolled it is refused, also when forced, because that needs an approved transfer / impact policy.',
  'Correction (against the client-confirmed permissions document "Illumin - Roles and Permissions - Tick to Confirm (2)_Updated", System Administrator → Batches and Schedule → Create and edit batches ☒): the System Admin can create NVQ batches and choose their delivery mode, as before N2, and can use Edit batch details (S4b had allowed only the Super Admin and Academic Admin) — including an empty batch\'s delivery mode, with the same reason, audit and validation rules. Once learners are enrolled the mode is locked for every role. Not a new business decision.',
  'Self-Paced batches say: a limited number of scheduled classes; academic support through LMS messages to the Coordinator and teachers, not routine phone calls. Both modes still need an Academic Coordinator; assessor allocations (CH-17) and P-33 are unchanged.',
  'Seed: no fixture records a delivery mode. Every existing NVQ batch is timetabled with weekly classes, so each is set to Fully Assisted, marked "seeded default — not client-confirmed". Batches of other courses have none. NV-L3D keeps "Self-paced" as its programme default for new batches (it has no batches). No enrolment, fee, payment or assessment record changed.',
  'Programme "Support type" (P-31) is now labelled as the default delivery mode for new batches (programme tab and new-programme wizard). It is still tagged Pending client, as the client hasn\'t approved SRS v1.3.2 yet.',
  'Not changed (later stages): learners don\'t choose a mode at sign-up and the nearest-batch rule doesn\'t filter by mode; no transfers between modes; no per-mode prices, deposits, documents or letters; no class schedules or Self-Paced class counts (N3); no ticketing (N6). Observation fees (CH-38) still follow the programme setting, not the batch — a transitional limitation until N5.']]);
const _aIdxN2 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxN2(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Batches → delivery mode (Fully Assisted / Self-Paced)', { act: 'aJump', t: 'a-batches.L3AC-NOV26-LEI' }, 'N2 — the batch\'s own delivery mode, separate from the channel; editable only before learners enrol.')}`);

if (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches) n2Seed();
