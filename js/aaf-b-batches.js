/* AA-FINAL Workstream B — batches, staff and sessions (3 Nov 2026; proposed PD-AAF-B-*). Loads after aa1-integrity.js.
   AA-05  Several Academic Coordinators per batch, managed in one place. "Change allocations" no longer offers the single
          "Academic Coordinator" select that replaced the Coordinator (it now names every Coordinator and points to the Academic
          Coordinators panel; a crafted value still goes through the same role and P-33 checks). "Add Coordinator" ticks one or more
          people (each checked first, then each added by mcAddCoord — audited and notified as before). Each learner keeps exactly one
          designated Coordinator (PD-MC-14); Coordinator / Assessor independence (CH-17, P-33) is unchanged.
   AA-06 / D13  The Academy's Batch code (b.code) and the Awarding body batch code (b.abCode, PD-CR-13) are shown side by side:
          batch detail (with what each one is), the Batches lists (admin, Academic Admin, Coordinator — under the code) and the
          Coordinator overview, now also for mixed-mode batches (the row had no anchor there). A missing code reads "Not recorded";
          nothing is invented and the two are never merged.
   AA-07  Add learner is learner-first: 1. find the learner (AA-1's search), 2. eligibility shown at once (already in this batch,
          in another active batch, programme / sign-up / fee-option reasons), 3. fee-option group (R2 / W1 — a learner's own option
          is preselected and can't be changed here), 4. a confirmation summary. Every existing check still runs on Add; a duplicate
          in the same batch is refused for every batch (it was checked only for Level 3). Learner 360 "Current batch" and the Finance
          "Programme / batch" column fall back to the batch roster for a learner added there (display only; no fee is created).
   AA-15  Add session names the batch in the dialog; opened without a batch it asks for one and won't save until one is chosen.
          The Teacher list starts with the batch's own teaching staff (dual-role Teacher + Assessor staff included); other active
          teachers are listed separately as cover. Conflict checks, notifications and permissions are unchanged.
   AA-19  Staff Allocations: D7 — Course / Programme / Learner allocations (rows and "allocated … notified" with no effect) are
          removed and refused; "Allocate" adds a Teacher to a batch, which is real. D8 — dual-role Teacher + Assessor staff can be
          allocated as Teacher (an Assessor-only person still goes to the Assessors panel, CH-17). D12 — "Re-allocate learners" with
          its fixed legacy names is replaced by guidance to the real places (nothing changes there). Allocations shows who teaches,
          coordinates and assesses each batch from the batch records; Workload no longer shows an invented "% of target".
   AA-21  Edit batch details explains why dates are editable before the start and locked after it; the impact text no longer says
          payment plans don't change when unpaid payment dates move with a new start date.
   g2 Low "Demo only:" — real admin toasts that mention a demo learner's name "(demo)" are no longer marked "Demo only" (clarity.js). */
'use strict';

const aafbB = code => (ADMIN.batches || []).find(x => x.code === code) || null;
const aafbStaff = n => (ADMIN.staff || []).find(s => s.name === n) || null;
const aafbBL = b => b.label && b.label !== b.code ? `<strong>${esc(b.label)}</strong> <span class="mono">${esc(b.code)}</span>` : `<strong class="mono">${esc(b.code)}</strong>`;
const aafbClosed = b => !b || ['Completed', 'Archived', 'Cancelled'].includes(b.status);
// Wrap the open dialog's primary action: check() returns false to stop (it shows its own message)
const aafbPrim = check => { const a = MODAL && (MODAL.actions || []).find(x => x.cls && /primary|danger/.test(x.cls)); if (!a || !a.fn) return; const g = a.fn; a.fn = (...x) => (check() === false ? false : g(...x)); };
const aafbSync = () => { const m = $('#modal-root .modal-b'); if (m && MODAL) MODAL.body = m.innerHTML; };

/* ================= AA-05 Academic Coordinators ================= */
const _bsAAFB = ACT.batchStaff;
ACT.batchStaff = (el, e) => {
  const b = aafbB(el && el.dataset && el.dataset.id), m0 = MODAL, r = _bsAAFB(el, e);
  if (!b || !MODAL || MODAL === m0) return r;
  const sel = $('#modal-root select#bs-c'), note = $('#modal-root .mc-bs-note');
  const box = `<div class="field aafb-bs-c"><span class="lbl">Academic Coordinators</span><p class="small">${mcList(b).length ? esc(mcList(b).join(', ')) : chip('Not assigned', 'red')}</p><input type="hidden" id="bs-c" value="${esc(b.coord || '')}"><span class="hint">A batch can have one or more Academic Coordinators. Add, remove or reassign them in the Academic Coordinators panel on this tab — each learner has one designated Coordinator.</span></div>`;
  if (sel) { sel.closest('.field').outerHTML = box; aafbSync(); }
  else if (note) { const h = $('#modal-root input#bs-c'); if (h) h.remove(); note.outerHTML = box; aafbSync(); }
  return r;
};
ACT.mcAdd = el => {
  const b = aafbB(el && el.dataset && el.dataset.id), why = !b ? 'Batch not found.' : mcCanWhy();
  if (why) return w0Deny('Batches', b ? mcEnt(b) : '—', 'Add an Academic Coordinator', why);
  if (aafbClosed(b)) return w0Deny('Batches', mcEnt(b), 'Add an Academic Coordinator', `${b.code} is ${b.status.toLowerCase()} — its Coordinators can't change.`);
  const opts = mcCoordOpts(b);
  reasonDlg({ title: 'Add Academic Coordinators — ' + esc(b.code), ok: 'Add Coordinators',
    body: `<p class="small">Current: <strong>${esc(mcList(b).join(', ') || 'none')}</strong>.</p>`,
    extra: `<fieldset class="field aafb-mc" style="border:0;padding:0"><legend class="lbl">Tick one or more Academic Coordinators to add</legend>${opts.length ? opts.map(n => `<label class="check"><input type="checkbox" class="aafb-mc-c" value="${esc(n)}">${esc(n)}</label>`).join('') : '<p class="small muted">Every active Academic Coordinator is already on this batch.</p>'}<input type="hidden" id="mc-add" value=""><span class="hint">Learners already in the batch keep their Coordinator. Learners who join from now on go to whichever Coordinator has the fewest active learners. To move a learner, use Reassign.</span></fieldset>`,
    onOk: r => {
      if (mcCanWhy()) { closeModal(); return w0Deny('Batches', mcEnt(b), 'Add an Academic Coordinator', mcCanWhy()); }
      const t = $$('#modal-root .aafb-mc-c:checked').map(i => i.value), names = [...new Set(t.length ? t : [mval('#mc-add')].filter(Boolean))];
      if (!names.length) { fieldErr('#modal-root .aafb-mc-c', 'Tick at least one Academic Coordinator'); return false; }
      for (const n of names) { const p = mcCheckNew(b, n); if (p) { w0Log('Batches', mcEnt(b), 'Blocked: add an Academic Coordinator', '—', n, p); fieldErr($('#modal-root .aafb-mc-c') ? '#modal-root .aafb-mc-c' : '#mc-add', p); toast(p, 'err'); return false; } }
      const done = names.filter(n => mcAddCoord(b, n, r) !== false); render();
      if (done.length) toast(`${done.join(', ')} added as Academic Coordinator${done.length > 1 ? 's' : ''}. Existing learners keep their Coordinator.`);
    } });
};

/* ================= AA-06 / D13 Batch code and Awarding body batch code ================= */
const aafbAbcTxt = b => b && b.abCode ? `<span class="mono">${esc(b.abCode)}</span>` : '<span class="muted">Not recorded</span>';
const _dtAAFB = dt;
dt = function (cfg) {
  if (cfg && (cfg.id === 'batches' || cfg.id === 'kbatches' || String(cfg.id).startsWith('cbatches-')) && Array.isArray(cfg.cols) && !cfg._aafb)
    cfg = { ...cfg, _aafb: true, cols: cfg.cols.map(c => c.k !== 'code' ? c : { ...c, h: b => (c.h ? c.h(b) : esc(b.code)) + `<div class="xs aafb-abc"><span class="muted">Awarding body batch code:</span> ${aafbAbcTxt(b)}</div>` }) };
  return _dtAAFB.apply(this, arguments.length > 1 ? [cfg].concat([].slice.call(arguments, 1)) : [cfg]);
};
const _bdAAFB = batchDetail;
batchDetail = function (code, t) {
  let h = _bdAAFB.apply(this, arguments); const b = aafbB(code); if (!b || typeof h !== 'string') return h;
  h = h.replace(/(<p class="small cr-abc">[\s\S]*?<\/p>)/, `$1<p class="xs muted aafb-codes">Batch code: the Academy's own identifier (fixed). Awarding body batch code: the awarding body's own reference for this cohort (e.g. NCFE), recorded separately${b.abCode ? '' : ' — not recorded yet'}.</p>`);
  // AA-21: the dates line says whether the dates can still change
  const i = h.indexOf('<p class="small s4b-bdates">'), j = i < 0 ? -1 : h.indexOf('</p>', i);
  if (j > 0 && !aafbClosed(b)) h = h.slice(0, j + 4) + `<p class="xs muted aafb-dates">${s4bStarted(b) ? `${ic('lock', 12)} Dates locked: the batch started on ${fd(b.start)}.` : `Start and end dates can be edited until the batch starts (${fd(b.start)}) — Edit details shows the impact first.`}</p>` + h.slice(j + 4);
  return h;
};
const _cbAAFB = SCREENS['c-batches'];
SCREENS['c-batches'] = p => {
  let h = _cbAAFB(p); const b = p && p.id && aafbB(p.id); if (!b || typeof h !== 'string' || (p.tab && p.tab !== 'overview')) return h;
  if (/class="cr-abc-v"/.test(h)) return h;
  const rows = `<dt>Batch code</dt><dd class="mono aafb-bc">${esc(b.code)}</dd><dt>Awarding body batch code</dt><dd class="cr-abc-v">${aafbAbcTxt(b)}</dd>`;
  return /<dt>Intake<\/dt><dd>[^<]*<\/dd>/.test(h) ? h.replace(/(<dt>Intake<\/dt><dd>[^<]*<\/dd>)/, `$1${rows}`) : h.replace('<dl class="kv">', `<dl class="kv">${rows}`);
};

/* ================= AA-07 Add learner: learner first, eligibility up front, then fee option, then confirm ================= */
const aafbOther = (b, lid) => (ADMIN.batches || []).find(x => x.code !== b.code && ['Open', 'In Progress'].includes(x.status) && batchRoster(x).some(r => r[1] === lid)) || null;
const aafbHere = (b, lid) => !!lid && (batchRoster(b).some(r => r[1] === lid) || mcLids(b).includes(lid) || (typeof w1InBatch === 'function' && w1InBatch(b, lid)));
function aafbAbElig(b, lid) {
  const L = lid && (ADMIN.learners.find(x => x.id === lid) || learnerById(lid)), no = [], info = [];
  if (!L) return { L, no: ['Choose a learner'], info };
  if (aafbHere(b, lid)) no.push(`Already in ${b.code} (or on its waitlist)`);
  const o = aafbOther(b, lid); if (o) no.push(`In ${o.code}, another active batch — a learner can't be in two active batches`);
  const e = typeof eEligWhy === 'function' ? eEligWhy(b, lid) : ''; if (e) no.push(e);
  const own = typeof w1OwnOpt === 'function' ? w1OwnOpt(lid) : null;
  if (own) { if (typeof w1Accepts === 'function' && !w1Accepts(b, own)) no.push(`${b.code} doesn't accept their fee option (${w1OptName(own)})`); else info.push(`Fee option agreed at sign-up: ${w1OptName(own)} — kept, it can't be changed here`); }
  if (L.agency) info.push(`Sponsored by ${L.agency} — uses one of the agency's licences`);
  return { L, no, info, own };
}
function aafbAbRefresh() {
  const b = aafbB(($('#modal-root #aafb-ab') || { dataset: {} }).dataset.b), lid = mval('#ab-l'), box = $('#modal-root #aafb-ab-e'), sum = $('#modal-root #aafb-ab-s'); if (!b || !box) return;
  const x = aafbAbElig(b, lid), fo = $('#modal-root #r2-ab-o');
  if (x.own && fo && [...fo.options].some(o => o.value === x.own)) { fo.value = x.own; fo.dataset.auto = x.own; } else if (fo && fo.dataset.auto) { if (fo.value === fo.dataset.auto) fo.value = ""; delete fo.dataset.auto; } // a learner's own option is preselected; it is cleared again for the next learner
  box.innerHTML = !x.L ? '<p class="small muted">Choose a learner to see whether they can be added.</p>'
    : x.no.length ? `<div class="note b-red">${ic('alert')}<div class="small"><strong>${esc(x.L.name)} can't be added:</strong><ul>${x.no.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div></div>`
    : `<div class="note b-green">${ic('check')}<div class="small"><strong>${esc(x.L.name)} can be added.</strong>${x.info.length ? `<ul>${x.info.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div></div>`;
  if (!sum) return;
  const opt = fo ? (fo.selectedOptions[0] || {}).textContent : '', full = b.enrolled >= b.cap, coords = mcList(b);
  sum.innerHTML = `<dl class="kv small"><dt>Learner</dt><dd>${x.L ? `${esc(x.L.name)} <span class="mono xs">${esc(x.L.id)}</span>` : '—'}</dd><dt>Batch</dt><dd>${aafbBL(b)}</dd>${fo ? `<dt>Fee-option group</dt><dd>${fo.value ? esc(opt) : '<span class="muted">Not chosen yet</span>'}</dd>` : ''}<dt>Place</dt><dd>${full ? 'Batch full — joins the waitlist' : `Takes a place (${b.enrolled + 1} of ${b.cap})`}</dd><dt>Academic Coordinator</dt><dd>${coords.length > 1 ? 'Allocated automatically — the Coordinator with the fewest active learners' : esc(coords[0] || 'Not assigned')}</dd><dt>Payments</dt><dd>No fee or payment is created here</dd></dl>`;
}
INP.aafbAbPick = () => aafbAbRefresh();
const _abFindAAFB = INP.abFind;
INP.abFind = function () { const r = _abFindAAFB.apply(this, arguments); aafbAbRefresh(); return r; };
const _addAAFB = ACT.addToBatch;
ACT.addToBatch = function (el) {
  const b = aafbB(el && el.dataset && el.dataset.id), m0 = MODAL, r = _addAAFB.apply(this, arguments);
  if (!b || !MODAL || MODAL === m0 || !/^Add learner/.test(MODAL.title || '') || !$('#modal-root #ab-l')) return r;
  const lf = $('#modal-root #ab-l').closest('.field'), ff = $('#modal-root #r2-ab-o') ? $('#modal-root #r2-ab-o').closest('.field') : null;
  const lab = (f, n) => { const l = f && f.querySelector('label'); if (l && !/^\d\./.test(l.textContent)) l.textContent = n + l.textContent; };
  $('#modal-root #ab-l').setAttribute('data-onchange', 'aafbAbPick');
  lab(lf, '1. '); lf.insertAdjacentHTML('afterend', `<div id="aafb-ab" data-b="${esc(b.code)}" class="aafb-ab"><span class="lbl">2. Eligibility</span><div id="aafb-ab-e" aria-live="polite"></div></div>`);
  if (ff) { lab(ff, '3. '); $('#modal-root #aafb-ab').insertAdjacentElement('afterend', ff); ff.querySelector('select').setAttribute('data-onchange', 'aafbAbPick'); }
  (ff || $('#modal-root #aafb-ab')).insertAdjacentHTML('afterend', `<div class="aafb-ab-sum"><span class="lbl">${ff ? '4' : '3'}. Check and confirm</span><div id="aafb-ab-s" aria-live="polite"></div></div>`);
  aafbAbRefresh(); aafbSync();
  // Every batch: the same learner is never added twice (Level 3 batches already checked this; other batches didn't)
  aafbPrim(() => { const lid = mval('#ab-l'); if (!lid || !aafbHere(b, lid) || (typeof w1L3 === 'function' && w1L3(b))) return true; const L = ADMIN.learners.find(x => x.id === lid) || learnerById(lid), why = `${L ? L.name : lid} is already in ${b.code} or on its waitlist`; w0Log('Batches', `${b.label} (${b.code})`, 'Blocked: add a learner (already in this batch)', '—', lid, why); fieldErr('#ab-l', why); return false; });
  return r;
};
// Learner 360 / Finance: a learner added on a batch roster (no programme record of their own) shows that batch
function aafbRosterBatch(lid) {
  const bs = (ADMIN.batches || []).filter(b => !['Cancelled', 'Archived'].includes(b.status) && mcLids(b).includes(lid));
  return bs.find(b => ['In Progress', 'Open', 'Planned'].includes(b.status)) || bs[0] || null;
}
const _lOvAAFB = lOverview;
lOverview = function (L) {
  const h = _lOvAAFB.apply(this, arguments), b = L && aafbRosterBatch(L.id);
  return b && typeof h === 'string' ? h.replace('<dt>Current batch</dt><dd>—</dd>', `<dt>Current batch</dt><dd>${esc(b.label)} — ${esc(b.code)} <span class="xs muted aafb-rb">(batch roster)</span></dd>`) : h;
};

/* ================= AA-15 Add session: the batch is named; without one, it must be chosen ================= */
function aafbSeTeachers(b, cur) {
  const all = s4bTeachers(), mine = b ? all.filter(n => (b.teachers || []).includes(n) || (b.assessors || []).includes(n) || (typeof acHolds === 'function' && acHolds(b, n))) : [], rest = all.filter(n => !mine.includes(n));
  const pickN = cur && (mine.includes(cur) || (!b && all.includes(cur))) ? cur : (b && (b.teachers || []).find(n => all.includes(n))) || mine[0] || all[0];
  const tag = n => { const s = aafbStaff(n), d = s && s.roles.includes('Assessor'); return d ? ' (Teacher + Assessor)' : ''; };
  const o = n => `<option value="${esc(n)}" ${n === pickN ? 'selected' : ''}>${esc(n)}${tag(n)}</option>`;
  return (mine.length ? `<optgroup label="${b ? 'Teaching staff of ' + esc(b.code) : 'Batch staff'}">${mine.map(o).join('')}</optgroup>` : '') + (rest.length ? `<optgroup label="Other active teachers (cover — not allocated to this batch)">${rest.map(o).join('')}</optgroup>` : '');
}
function aafbSeBatch() {
  const code = mval('#se-b'), b = code ? s4bBatch(code) : null, line = $('#modal-root #aafb-se-bl'), t = $('#modal-root select#se-t');
  if (line) line.innerHTML = b ? `${aafbBL(b)} · ${fd(b.start)} – ${fd(b.end)}${b.course ? ' · ' + esc(b.course) : ''}` : '<span class="muted">No batch chosen yet — choose one above.</span>';
  if (t) t.innerHTML = aafbSeTeachers(b, t.value);
  if (MODAL) MODAL.sub = b ? `Batch: ${b.label && b.label !== b.code ? esc(b.label) + " — " : ""}${esc(b.code)}` : 'Choose the batch first';
  const h = $('#modal-root .modal-h p.small'); if (h && MODAL) h.innerHTML = MODAL.sub;
}
const _seConfAAFB = INP.seConf;
INP.seConf = function (el) { if (el && el.id === 'se-b' && $('#modal-root #aafb-se-bl')) aafbSeBatch(); return _seConfAAFB.apply(this, arguments); };
const _asAAFB = ACT.addSession;
ACT.addSession = function (el) {
  const fixed = el && el.dataset && el.dataset.b, m0 = MODAL, r = _asAAFB.apply(this, arguments);
  if (!MODAL || MODAL === m0 || MODAL.title !== 'Add session' || !$('#modal-root #se-b')) return r;
  const sel = $('#modal-root select#se-b');
  if (sel && !fixed) {
    [...sel.options].forEach(o => o.removeAttribute('selected')); sel.insertAdjacentHTML('afterbegin', '<option value="" selected>Choose a batch…</option>'); sel.value = ''; sel.closest('.field').querySelector('label').textContent = 'Batch (required)';
    const au = $('#modal-root .r2-audf'); if (au) au.outerHTML = '<div class="field full r2-audf"></div>'; // the audience follows the batch once chosen (R2)
  }
  const anchor = sel ? sel.closest('.field') : $('#modal-root input#se-b');
  anchor.insertAdjacentHTML('afterend', `<div class="field full aafb-se-b"><span class="lbl">${sel ? 'Selected batch' : 'Batch'}</span><p class="small" id="aafb-se-bl"></p><span class="hint">The session goes on this batch's timetable; its learners (by the fee options ticked below) see it.</span></div>`);
  aafbSeBatch(); aafbSync(); renderModal();
  aafbPrim(() => { if (mval('#se-b')) return true; fieldErr('#se-b', 'Choose the batch for this session'); return false; });
  return r;
};

/* ================= AA-19 Staff Allocations ================= */
const AAFB_RESP = `<section class="card aafb-resp"><h2 class="small">Who does what on a batch</h2><div class="aafb-resp-g">
  <div><strong>Teacher</strong><p class="xs muted">Runs the batch's classes, sessions and attendance. Allocated here (Allocate) or on the batch's Staff tab.</p></div>
  <div><strong>Academic Coordinator</strong><p class="xs muted">One or more per batch; each learner has one designated Coordinator. Batches → the batch → Staff → Academic Coordinators.</p></div>
  <div><strong>Assessor</strong><p class="xs muted">Marks assignments, runs PD and observations — allocated by role on the batch's Assessors panel (CH-17); a learner's PD / observation assessor can be changed in Learner 360.</p></div></div></section>`;
const aafbLive = () => (ADMIN.batches || []).filter(b => !b.short && !['Archived', 'Cancelled', 'Completed'].includes(b.status));
const _ksAAFB = SCREENS['k-staff'];
SCREENS['k-staff'] = p => {
  let h = _ksAAFB(p); if (typeof h !== 'string') return h; const t = (p && p.tab) || 'staff';
  h = h.replace('Accounts are read-only here — allocate courses, programmes, batches and learners', 'Who teaches, coordinates and assesses each batch. Staff accounts are read-only here.')
    .replace(/<button class="btn" data-act="kRealloc">[\s\S]*?<\/button>/, '');
  const cut = h.search(/<section class="dt"|<section class="card"><div class="tbl-wrap"><table class="tbl dense"><caption class="sr">Assessor workload|<div class="note b-blue">/);
  if (cut > 0) h = h.slice(0, cut) + AAFB_RESP + h.slice(cut);
  if (t === 'allocs') {
    const d = h.indexOf('<section class="dt"', h.indexOf('aafb-resp')); const head = d > 0 ? h.slice(0, d) : h;
    const rows = aafbLive().map(b => { const a = chAllocOf(b); return { id: b.code, code: b.code, label: b.label, t: (b.teachers || []).join(', '), c: mcList(b).join(', '), asg: a.asg || '—', pd: a.pd || '—', obs: a.obs || '—' }; });
    return head + dt({ id: 'aafb-alloc', name: 'Current allocations by batch', rows, noExport: true, search: r => r.code + r.label + r.t + r.c + r.asg + r.pd + r.obs,
      cols: [{ k: 'code', l: 'Batch', h: r => `<a href="#a-batches.${r.code}.staff" data-go="a-batches" data-id="${r.code}" data-tab="staff" class="mono strong">${r.code}</a><div class="xs muted">${esc(r.label)}</div>` }, { k: 't', l: 'Teachers', h: r => `<span class="small">${esc(r.t || '—')}</span>` }, { k: 'c', l: 'Academic Coordinators', h: r => `<span class="small">${esc(r.c || '—')}</span>` }, { k: 'asg', l: 'Assignment assessor' }, { k: 'pd', l: 'PD assessor' }, { k: 'obs', l: 'Observation assessor' }], empty: 'No running or planned batches' })
      + `<p class="xs muted">${ic('info', 12)} Read from the batch records. Learner-level PD / observation overrides are shown in each learner's record.</p>`
      + (STORE.aca.alloc.length ? `<h2 class="small">Allocation log</h2>` + dt({ id: 'kallocs', name: 'Allocation log', rows: STORE.aca.alloc.map((a, i) => ({ ...a, id: 'AL-' + i })), noExport: true, cols: [{ k: 'who', l: 'Staff member' }, { k: 'kind', l: 'Type', h: a => `<span class="typebadge">${esc(a.kind === 'Batch' ? 'Teacher of batch' : a.kind)}</span>` }, { k: 'what', l: 'Allocated to' }, { k: 'since', l: 'Since', h: a => fd(a.since), s: a => a.since }] }) : '');
  }
  if (t === 'workload') h = h.replace('<th>Load</th>', '').replace(/<td><span class="small">\d+% of target<\/span><\/td>/g, '').replace('</tbody></table></div></section>', `</tbody></table></div><p class="xs muted aafb-nt">${ic('info', 12)} No workload target is defined, so no percentage is shown.</p></section>`);
  return h;
};
// D7 / D8: Allocate = add a Teacher to a running or planned batch (the only kind that changes an allocation record)
const _kaAAFB = ACT.kAlloc;
ACT.kAlloc = function () {
  const m0 = MODAL, r = _kaAAFB.apply(this, arguments); if (!MODAL || MODAL === m0 || !$('#modal-root #ka-s')) return r;
  MODAL.title = 'Allocate a Teacher to a batch';
  const s = $('#modal-root #ka-s'), cur = s.value; s.innerHTML = activeStaff('Teacher').map(n => `<option value="${esc(n)}" ${n === cur ? 'selected' : ''}>${esc(n)}${(aafbStaff(n) || { roles: [] }).roles.includes('Assessor') ? ' (Teacher + Assessor)' : ''}</option>`).join('');
  s.closest('.field').querySelector('label').textContent = 'Teacher';
  const k = $('#modal-root #ka-k'); k.closest('.field').outerHTML = `<div class="field"><span class="lbl">Responsibility</span><p class="small">Teacher of the batch</p><input type="hidden" id="ka-k" value="Batch"><span class="hint">Assessors are allocated by role on the batch's Assessors panel; Academic Coordinators on its Academic Coordinators panel.</span></div>`;
  $('#modal-root #ka-w').innerHTML = kAllocOpts('Batch'); $('#modal-root label[for="ka-w"]').textContent = 'Batch';
  aafbSync(); renderModal();
  aafbPrim(() => {
    const who = mval('#ka-s'), kind = mval('#ka-k'), b = aafbB((mval('#ka-w') || '').split(' · ')[0]);
    if (kind !== 'Batch') { w0Log('Staff Allocations', who || '—', 'Blocked: allocation (not supported)', '—', kind || '—', 'Only a Teacher-to-batch allocation changes anyone\'s work. Course, programme and learner allocations aren\'t recorded.'); fieldErr('#ka-s', 'Only a Teacher can be allocated to a batch here.'); return false; }
    if (!b || aafbClosed(b)) { fieldErr('#ka-w', 'Choose a running or planned batch'); return false; }
    if ((b.teachers || []).includes(who)) { fieldErr('#ka-s', `${who} already teaches ${b.code}`); return false; }
    return true;
  });
  return r;
};
// D12: the fixed legacy learner list is gone; re-allocation is done where the allocation really lives
const _krAAFB = ACT.kRealloc;
ACT.kRealloc = function () {
  const m0 = MODAL; _krAAFB.apply(this, arguments); if (!MODAL || MODAL === m0) return false; // refused by the existing guard (logged)
  openModal({ title: 'Re-allocate learners', body: `<p class="small">Learners are re-allocated where their allocation is recorded:</p><ul class="small"><li><strong>Assignment, PD and observation assessor for a whole batch</strong> — Batches → the batch → Staff → Assessors.</li><li><strong>One learner's PD or observation assessor</strong> — the learner's record (Learner 360).</li><li><strong>A learner's Academic Coordinator</strong> — Batches → the batch → Staff → Academic Coordinators → Reassign.</li><li><strong>Pending marking items</strong> — the Pending marking tab.</li></ul><p class="xs muted">Nothing is changed from this dialog.</p>`, actions: [{ label: 'Close', cls: 'btn-primary', fn: () => {} }] });
  return false;
};

/* ================= AA-21 Edit batch details: dates before and after the start ================= */
const _impAAFB = s4bImpact;
s4bImpact = function (b, n) {
  let h = _impAAFB.apply(this, arguments); if (typeof h !== 'string' || !b) return h;
  const moved = n && n.start && n.start !== b.start, dated = /class="small cb9-imp"/.test(h);
  const txt = !moved ? 'Their deposits, seat-hold dates and payment dates don\'t change (the start date is unchanged); the batch dates on their pages do.'
    : dated ? 'Deposits and seat-hold dates don\'t change. Unpaid payment dates move with the new start date (see below); the batch dates on their pages change.'
    : 'Deposits and seat-hold dates don\'t change, and no learner has a dated payment schedule; the batch dates on their pages change.';
  return h.replace('Their deposits, hold dates and payment plans don\'t change; the batch dates on their pages do.', txt);
};
const _beAAFB = ACT.s4bBatchEdit;
ACT.s4bBatchEdit = function (el) {
  const b = aafbB(el && el.dataset && el.dataset.id), m0 = MODAL, r = _beAAFB.apply(this, arguments);
  if (!b || !MODAL || MODAL === m0 || !$('#modal-root #bd-s')) return r;
  if (s4bStarted(b)) {
    const n = $('#modal-root .note.b-amber .small'); if (n && /dates and mode can't change/.test(n.textContent)) n.innerHTML = `<strong>The batch started on ${fd(b.start)}, so its start and end dates are locked.</strong> Learners' payment dates, seat holds, sessions, deadlines and certificate dates depend on them. Extending or shortening a running batch isn't available. Capacity and description can still change.`;
  } else {
    const f = $('#modal-root #bd-s').closest('.field'); if (f && !f.querySelector('.hint')) f.insertAdjacentHTML('beforeend', `<span class="hint">Editable until the batch starts (${fd(b.start)}). After the start, the dates are locked.</span>`);
    const e = $('#modal-root #bd-e').closest('.field'); if (e && !e.querySelector('.hint')) e.insertAdjacentHTML('beforeend', '<span class="hint">"Review impact and save" shows what changes before anything is saved.</span>');
  }
  aafbSync();
  return r;
};
