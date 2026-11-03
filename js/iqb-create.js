/* ============================================================
   IQA — IQA allocation during batch creation (PD-IQB-06…). Loads after iqb-alloc.js.
   The Create batch wizard's Staff step lists the active IQAs beside the Coordinator(s), Teachers and Assessors; none, one or more
   can be ticked (IQA stays optional — a client decision). Independence is checked against everyone ticked on that step, by
   name, so a dual-role person can't be both; it is checked again on "Create batch", so the batch and its first staff allocation
   are saved together or not at all. The allocations are the IQB records (iqbAssign: permission, independence, duplicates, audit,
   notification); the batch's Staff tab is unchanged for later changes. Whoever may set the batch's other staff may choose its
   IQAs (PD-IQB-09): the Super Administrator, Academic Admins and System Administrators.
   ============================================================ */
'use strict';

let IQB_NB = null; // the wizard's IQA choice and the staff it was checked against
const _nbIQB = ACT.newBatch; ACT.newBatch = function () { IQB_NB = { code: '', iqas: [], staff: null, t: now().toISOString() }; return _nbIQB.apply(this, arguments); };
const iqbNbStaff = () => ({ coords: [...new Set([mval('#nb-ac')].concat($$('#modal-root .mc-nb-c:checked').map(i => i.value)).filter(Boolean))], teachers: $$('#modal-root .nb-t:checked').map(i => i.value), assessors: $$('#modal-root .nb-a:checked').map(i => i.value) });
function iqbNbWhy(iqas, st, code) {
  if (!iqas.length) return '';
  if (!iqbCan()) return IQB_WHO;
  for (const n of iqas) {
    if (!iqbStaff().some(s => s.name === n)) return `${n} isn't an active IQA.`;
    const as = st.teachers.includes(n) ? 'a Teacher' : st.assessors.includes(n) ? 'an Assessor' : st.coords.includes(n) ? 'an Academic Coordinator' : '';
    if (as) return `${n} is ticked as ${as} of ${code || 'this batch'}, so they can't also be its IQA (independence rule).`;
  }
  return '';
}
const iqbNbDeny = (code, n, why) => { w0Log('Batches', code || 'New batch', 'Blocked: IQA at batch creation', '—', n || '—', why); fieldErr('#modal-root .iqb-nb-c', why); toast(why, 'err'); return false; };
const iqbNbField = () => iqbCan()
  ? `<fieldset class="field full iqb-nb" style="border:0;padding:0"><legend class="lbl">Internal Quality Assurer (IQA) — optional, one or more</legend><p class="xs muted">An IQA sees every learner in this batch and samples its marked work. Someone ticked as this batch's Teacher, Assessor or Academic Coordinator can't also be its IQA. You can assign or change IQAs later in the batch's Staff tab.</p>${iqbStaff().map(s => `<label class="check"><input type="checkbox" class="iqb-nb-c" value="${esc(s.name)}" ${IQB_NB.iqas.includes(s.name) ? 'checked' : ''}>${esc(s.name)}</label>`).join('') || '<p class="small muted">No active IQA.</p>'}</fieldset>`
  : `<p class="small muted full iqb-nb-ro">${ic('shield', 13)} Internal Quality Assurer (IQA): assigned after the batch is created, by the Super Administrator, an Academic Admin or a System Administrator (Staff tab).</p>`;
const _omIQB = openModal;
openModal = function (m) {
  const t = (m && m.title) || '', prims = () => (m.actions || []).filter(a => a.fn && a.cls && /primary/.test(a.cls));
  if (IQB_NB && t === 'Create batch — step 1 of 5') prims().forEach(a => { const g = a.fn; a.fn = (...x) => { IQB_NB.code = (mval('#nb-c') || '').toUpperCase(); return g(...x); }; });
  if (IQB_NB && t === 'Create batch — step 2 of 5' && typeof m.body === 'string') {
    const k = m.body.lastIndexOf('</div>'); if (k >= 0) m.body = m.body.slice(0, k) + iqbNbField() + m.body.slice(k);
    prims().forEach(a => { const g = a.fn; a.fn = (...x) => {
      const iqas = $$('#modal-root .iqb-nb-c:checked').map(i => i.value), st = iqbNbStaff(), why = iqbNbWhy(iqas, st, IQB_NB.code);
      if (why) return iqbNbDeny(IQB_NB.code, iqas.join(', '), why);
      const r = g(...x); if (r !== false) { IQB_NB.iqas = iqas; IQB_NB.staff = st; } return r; }; });
  }
  if (IQB_NB && t === 'Create batch — step 5 of 5' && typeof m.body === 'string') {
    const l = IQB_NB.iqas; m.body = m.body.replace('<dt>Schedule</dt>', `<dt>IQA</dt><dd class="iqb-nb-rev">${l.length ? esc(l.join(', ')) : '<span class="muted">None chosen — optional; assign later in the Staff tab</span>'}</dd><dt>Schedule</dt>`);
    // the batch and its first staff allocation are saved together: the IQA choice is checked again before anything is created
    prims().forEach(a => { const g = a.fn; a.fn = (...x) => { const why = iqbNbWhy(IQB_NB.iqas, IQB_NB.staff || { coords: [], teachers: [], assessors: [] }, IQB_NB.code); if (why) { toast(why + ' Go back to Staff to change it — the batch hasn\'t been created.', 'err'); w0Log('Batches', IQB_NB.code || 'New batch', 'Blocked: IQA at batch creation', '—', IQB_NB.iqas.join(', '), why); return false; } return g(...x); }; });
  }
  return _omIQB.apply(this, arguments);
};
// The new batch is pushed and synced in one step: its IQA allocations are recorded there, through the IQB records (no duplicates)
const _syncIQB = syncTasBatches;
syncTasBatches = function () {
  const r = _syncIQB.apply(this, arguments), nb = IQB_NB, b = nb && nb.code && (ADMIN.batches || []).find(x => x.code === nb.code && x.created && x.created >= nb.t);
  if (b) { IQB_NB = null; nb.iqas.filter(n => !iqbNamesOn(b.code).includes(n)).forEach(n => iqbAssign(b.code, n, 'Allocated at batch creation')); }
  return r;
};

/* ---------- Other staff changes can't create a conflict: a session moved to the batch's IQA ---------- */
const _keIQB = ACT.kEditEv;
ACT.kEditEv = (el, e) => { const r = _keIQB(el, e), b = iqbBatch(el && el.dataset && el.dataset.b); if (b) w0OnConfirm(() => { const w = $('#ke-t') && iqbHeldWhy(b, mval('#ke-t'), 'Teacher'); if (w) { iqbHeldDeny(b, w); fieldErr('#ke-t', w); return true; } return false; }); return r; };
