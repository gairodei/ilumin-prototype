/* ============================================================
   Client Feedback 2.0 — B Scheduling (15 Nov 2026; PD-CF2-B* in PROVISIONAL-DECISIONS.md). Loads after cf2-obsbook.js.
   B1 Create batch step 3 is a Schedule & Sessions builder (was: three labels — two "templates" that both produced the same five
      placeholder items, and "Build from scratch"):
      - Use a schedule template: choose one of the Academy's schedule templates, see the actual sessions it generates (dates, times,
        length, recurrence, audience, type), edit, remove or add sessions, then create the batch with them. A weekly row repeats
        every 7 days, a fortnightly row every 14 days, a four-weekly row every 28 days — from the batch start, within its dates.
      - Start from scratch: an empty timetable; sessions can be added now or the batch created with none (added later in its
        Schedule tab).
      Each session: title and type, date and start time, length, teacher, Zoom (simulated reference) or classroom with a location,
      the fee options it is for, optional description / instructions, status Scheduled. Times are entered as every other scheduling
      dialog takes them; the batch time zone isn't invented (P2: unconfigured batches read the labelled compatibility fallback).
      Creating the batch makes each session a real S4b session with its R2 audience — the same records as "Add session" — so
      calendars, Zoom access, registers, conflicts, rescheduling, cancellation and notices apply unchanged. A builder batch gets no
      invented deadline, observation-window or milestone placeholders.
      Templates are stored and versioned (Scheduling → Schedule templates: new, edit → next version, duplicate, archive). A batch
      keeps the template name and version it was built from; editing a template never changes an existing batch.
   B2 Fee-option targeting uses the programme's real configured options, limited to the delivery modes the batch accepts; a mode the
      programme or batch doesn't offer is never shown (a template row for it is listed as not generated). "All learners" stays the
      dynamic all-participants audience. No rule about Self-Paced class entitlements is added (unchanged, client decision).
   B3 The batch Schedule tab keeps Add one session / weekly recurring classes / edit / reschedule / cancel with reason / conflicts /
      history / notices (S4b, N3, R2); added: a description field, "Affected" (eligible learners, teacher, Coordinators, history)
      and the batch's builder origin.
   B4 Learner calendars show the sessions their fee option is in (R2), the description in the event details, cancelled / updated
      states and no Zoom link for sessions they're not in.
   ============================================================ */
'use strict';

const CF2_EVERY = { 0: 'Once', 1: 'Weekly', 2: 'Fortnightly', 4: 'Every four weeks' };
const CF2_KINDS = ['Live class', 'Induction', 'Check-in', 'Workshop', 'Classroom day', 'Tutorial'];
const CF2_AUD = { all: 'All learners in the batch', 'Fully Assisted': 'Fully Assisted fee options', 'Self-Paced': 'Self-Paced fee options' };
const cf2Row = (title, kind, wd, time, mins, every, from, count, where, aud, loc) => ({ title, kind, wd, time, mins, every, from, count, where, aud, loc: loc || '' });
function cf2TplSeed() {
  const T = (id, name, desc, rows) => ({ id, name, desc, v: 1, status: 'Active', rows, vers: [{ v: 1, at: NOW.toISOString(), by: 'Illumin Academy (seeded)', rows: JSON.parse(JSON.stringify(rows)) }], hist: [[NOW.toISOString(), 'Illumin Academy (seeded)', 'Template created', 'Version 1']] });
  return { n: 5, tpls: [
    T('TPL-1', 'Weekly live class', 'An induction for everyone, then a weekly live class for the Fully Assisted fee options.', [cf2Row('Induction', 'Induction', 'Tuesday', '17:00', 60, 0, 0, 1, 'zoom', 'all'), cf2Row('Weekly live class', 'Live class', 'Tuesday', '17:00', 90, 1, 1, 12, 'zoom', 'Fully Assisted')]),
    T('TPL-2', 'Fortnightly live class', 'An induction, then a live class every two weeks for everyone in the batch.', [cf2Row('Induction', 'Induction', 'Thursday', '17:00', 60, 0, 0, 1, 'zoom', 'all'), cf2Row('Fortnightly live class', 'Live class', 'Thursday', '17:00', 90, 2, 1, 6, 'zoom', 'all')]),
    T('TPL-3', 'Mixed delivery: weekly Fully Assisted, fortnightly Self-Paced, monthly shared workshop', 'Different timetables in one batch: Fully Assisted learners have a weekly class, Self-Paced learners a fortnightly check-in, and both attend a monthly classroom workshop.', [cf2Row('Induction', 'Induction', 'Tuesday', '17:00', 60, 0, 0, 1, 'zoom', 'all'), cf2Row('Weekly live class', 'Live class', 'Tuesday', '17:00', 90, 1, 1, 8, 'zoom', 'Fully Assisted'), cf2Row('Self-Paced check-in', 'Check-in', 'Wednesday', '18:00', 45, 2, 1, 4, 'zoom', 'Self-Paced'), cf2Row('Monthly workshop (shared)', 'Workshop', 'Saturday', '14:00', 180, 4, 2, 2, 'room', 'all', 'Illumin Academy Croydon, Room 2')]),
    T('TPL-4', 'Self-Paced support', 'For Self-Paced learners: a fortnightly check-in and a four-weekly workshop.', [cf2Row('Self-Paced check-in', 'Check-in', 'Wednesday', '18:00', 45, 2, 0, 6, 'zoom', 'Self-Paced'), cf2Row('Workshop', 'Workshop', 'Saturday', '14:00', 120, 4, 1, 3, 'room', 'Self-Paced', 'Illumin Academy Croydon, Room 2')])] };
}
const cf2Sch = () => (CF2().sched = CF2().sched || cf2TplSeed());
const cf2Tpl = id => cf2Sch().tpls.find(t => t.id === id) || null;
const cf2Wd = ymd => (new Date(ymd + 'T00:00:00Z').getUTCDay() + 6) % 7;
const cf2RowTxt = r => `${r.title} — ${CF2_EVERY[r.every] || 'Once'}${r.every ? ` (${r.count} × ${r.wd})` : ' (' + r.wd + ')'} at ${r.time}, ${r.mins} min, ${r.where === 'room' ? 'classroom' : 'Zoom'} · ${CF2_AUD[r.aud] || r.aud}`;
// The dates of one template row: the first <weekday> on or after (batch start + from weeks), then every 7 / 14 / 28 days, within the batch
function cf2Dates(r, start, end) {
  if (!ymdOk(start) || !ymdOk(end)) return []; const wd = N3_DAYS.indexOf(r.wd); if (wd < 0) return [];
  let d = ymdAdd(start, 7 * (+r.from || 0)); while (cf2Wd(d) !== wd) d = ymdAdd(d, 1);
  const out = [], n = +r.every ? Math.max(1, +r.count || 1) : 1; for (let i = 0; i < n && d <= end; i++) { out.push(d); d = ymdAdd(d, 7 * (+r.every || 1)); }
  return out;
}
// The batch's fee options a session can be for: the programme's real options, limited to the modes the batch accepts
function cf2Opts(pid, modes) { if (!pid || typeof r1Opts !== 'function') return []; return r1Opts(pid).filter(o => o.status === 'Active' && !o.legacy && (!modes || !modes.length || modes.includes(o.mode))).map(o => ({ id: o.id, mode: o.mode, label: o.label, name: typeof r2OptName === 'function' ? r2OptName(o) : o.label })); }
// Rows a template generates for a batch (with the rows it can't generate, and why)
function cf2Gen(t, nb) {
  const rows = [], skipped = [];
  t.rows.forEach((r, ri) => {
    let aud = null; if (r.aud !== 'all') { const ids = nb.opts.filter(o => o.mode === r.aud).map(o => o.id); if (!nb.opts.length) aud = null; else if (!ids.length) { skipped.push(`${r.title}: this batch has no ${r.aud} fee option, so it isn't generated`); return; } else aud = ids; }
    const ds = cf2Dates(r, nb.start, nb.end); if (!ds.length) { skipped.push(`${r.title}: no date within the batch dates`); return; }
    ds.forEach((d, k) => rows.push({ key: 'g' + ri + '-' + k, title: r.every ? `${r.title}` : r.title, kind: r.kind, start: new Date(d + 'T' + r.time + ':00Z').toISOString(), mins: +r.mins, teacher: nb.teachers[0] || (s4bTeachers()[0] || ''), where: r.where, loc: r.where === 'room' ? r.loc || 'Classroom (in person)' : '', aud, desc: '', series: r.every ? `${CF2_EVERY[r.every]} · ${k + 1} of ${ds.length}` : 'One-off', tplRow: ri }));
  });
  rows.sort((a, b) => a.start.localeCompare(b.start)); return { rows, skipped };
}

/* ---------- The builder (Create batch, step 3) ---------- */
let CF2_NB = null, CF2_PRESET = null;
const _nbCF2 = ACT.newBatch;
ACT.newBatch = function () { CF2_NB = { mode: 'scratch', tpl: '', tplV: null, rows: [], skipped: [], edit: null, adding: false, seq: 0, code: '', course: '', pid: null, start: '', end: '', teachers: [], modes: [], opts: [] }; return _nbCF2.apply(this, arguments); };
const cf2NbLabel = () => (CF2_NB.mode === 'tpl' && CF2_NB.tpl ? `Schedule builder — ${plural(CF2_NB.rows.length, 'session')} from template "${(cf2Tpl(CF2_NB.tpl) || {}).name}" (version ${CF2_NB.tplV})` : `Schedule builder — ${CF2_NB.rows.length ? plural(CF2_NB.rows.length, 'session') + ' added' : 'no sessions yet (add them later in the batch\'s Schedule tab)'}`);
const cf2AudTxt = aud => (!aud ? 'All learners in the batch' : aud.map(id => (CF2_NB.opts.find(o => o.id === id) || { name: id }).name).join(', '));
function cf2RowWhy(r) {
  if (!r.title || !r.title.trim()) return 'Enter a title';
  if (!r.start || isNaN(new Date(r.start))) return 'Choose a date and time';
  const ymd = r.start.slice(0, 10); if (CF2_NB.start && (ymd < CF2_NB.start || ymd > CF2_NB.end)) return `Outside the batch dates (${fd(CF2_NB.start + 'T12:00:00Z')} – ${fd(CF2_NB.end + 'T12:00:00Z')})`;
  if (!(r.mins >= 15 && r.mins <= 480)) return 'Length must be 15 to 480 minutes';
  if (CF2_NB.opts.length && Array.isArray(r.aud) && !r.aud.length) return 'Tick at least one fee option';
  if (Array.isArray(r.aud) && r.aud.some(id => !CF2_NB.opts.some(o => o.id === id))) return 'A fee option that isn\'t offered in this batch';
  return '';
}
const cf2Overlap = (a, b) => new Date(a.start).getTime() < new Date(b.start).getTime() + b.mins * 6e4 && new Date(b.start).getTime() < new Date(a.start).getTime() + a.mins * 6e4;
function cf2RowConf(r) {
  const other = CF2_NB.rows.find(x => x !== r && x.teacher && x.teacher === r.teacher && cf2Overlap(x, r)); if (other) return `same teacher: ${other.title} at ${fdt(other.start)}`;
  try { return s4bConfText({ code: CF2_NB.code || '—' }, r.start, r.mins, r.teacher, null, []) || ''; } catch (e) { return ''; }
}
function cf2Form(r, add) {
  const v = r || { title: 'Live class', kind: 'Live class', start: (CF2_NB.start || D(14).slice(0, 10)) + 'T17:00:00.000Z', mins: 90, teacher: CF2_NB.teachers[0] || '', where: 'zoom', loc: '', aud: null, desc: '' };
  const aud = CF2_NB.opts.length ? `<fieldset class="field full cf2f-aud"><legend class="lbl">For (fee options)</legend>${['Fully Assisted', 'Self-Paced'].map(m => { const os = CF2_NB.opts.filter(o => o.mode === m); return os.length ? `<div><div class="xs strong">${m}</div>${os.map(o => `<label class="check"><input type="checkbox" class="cf2f-a" value="${esc(o.id)}" ${!v.aud || v.aud.includes(o.id) ? 'checked' : ''}> ${esc(o.name)}</label>`).join('')}</div>` : ''; }).join('')}<span class="hint">All ticked = everyone in the batch (including learners who join later). Only the batch's own fee options are offered.</span></fieldset>` : '<p class="xs muted full">This programme has no fee options: sessions are for all learners in the batch.</p>';
  return `<div class="card flat cf2-form" data-k="${esc(r ? r.key : '')}"><div class="form-grid">
    <div class="field"><label for="cf2f-t">Title</label><input class="input" id="cf2f-t" value="${esc(v.title)}"></div>
    <div class="field"><label for="cf2f-k">Session type</label><select class="select" id="cf2f-k">${CF2_KINDS.map(k => `<option ${k === v.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="field"><label for="cf2f-d">Date and start time (${tzl()})</label><input class="input" type="datetime-local" id="cf2f-d" value="${esc(String(v.start).slice(0, 16))}"></div>
    <div class="field"><label for="cf2f-m">Length (minutes)</label><input class="input num" type="number" min="15" max="480" id="cf2f-m" value="${v.mins}"></div>
    <div class="field"><label for="cf2f-te">Teacher</label><select class="select" id="cf2f-te">${s4bTeachers().map(n => `<option ${n === v.teacher ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="field"><label for="cf2f-w">Where</label><select class="select" id="cf2f-w"><option value="zoom" ${v.where !== 'room' ? 'selected' : ''}>Zoom (simulated meeting reference)</option><option value="room" ${v.where === 'room' ? 'selected' : ''}>Classroom (in person)</option></select></div>
    <div class="field full"><label for="cf2f-l">Location (classroom)</label><input class="input" id="cf2f-l" value="${esc(v.loc || '')}" placeholder="For a classroom session"></div>
    ${aud}<div class="field full"><label for="cf2f-x">Description / instructions (optional)</label><textarea class="textarea" id="cf2f-x" rows="2">${esc(v.desc || '')}</textarea></div>
    ${add ? `<div class="field"><label for="cf2f-r">Repeat</label><select class="select" id="cf2f-r"><option value="0">Once</option><option value="1">Weekly</option><option value="2">Fortnightly</option><option value="4">Every four weeks</option></select></div><div class="field"><label for="cf2f-n">Number of sessions</label><input class="input num" type="number" min="1" max="52" id="cf2f-n" value="1"></div>` : ''}
    <p class="xs muted full">Status: Scheduled.</p></div><div id="cf2f-err"></div><div class="row"><button type="button" class="btn btn-sm btn-primary" data-act="cf2SbDone" data-k="${esc(r ? r.key : '')}">${add ? 'Add to timetable' : 'Done'}</button><button type="button" class="btn btn-sm" data-act="cf2SbCancel">Cancel</button></div></div>`;
}
function cf2SbHtml() {
  const N = CF2_NB, act = cf2Sch().tpls.filter(t => t.status === 'Active'), t = N.tpl && cf2Tpl(N.tpl), tz = batchTz({});
  const modes = N.opts.length ? `Fee options in this batch: ${['Fully Assisted', 'Self-Paced'].filter(m => N.opts.some(o => o.mode === m)).map(m => `${m} (${N.opts.filter(o => o.mode === m).map(o => esc(o.label)).join(', ')})`).join(' · ')}.` : 'This programme has no fee options: every session is for all learners.';
  const rows = N.rows.slice().sort((a, b) => a.start.localeCompare(b.start)).map(r => { const why = cf2RowWhy(r), c = why ? '' : cf2RowConf(r);
    return `<tr class="cf2-sbr${why ? ' cf2-bad' : ''}" data-k="${esc(r.key)}"><td class="nowrap small">${fds(r.start)} ${ft(r.start)}</td><td><strong>${esc(r.title)}</strong><div class="xs muted">${esc(r.kind)} · ${esc(r.series || 'One-off')}${r.desc ? ' · has instructions' : ''}</div>${why ? `<div class="xs" style="color:var(--red)">${esc(why)}</div>` : c ? `<div class="xs" style="color:var(--amber)">Conflict: ${esc(c)}</div>` : ''}</td><td class="small">${r.mins} min</td><td class="small">${esc(r.teacher || '—')}</td><td class="small">${r.where === 'room' ? esc(r.loc || 'Classroom') : 'Zoom (simulated)'}</td><td class="small cf2-sbaud">${esc(cf2AudTxt(r.aud))}</td><td class="nowrap"><button type="button" class="btn btn-sm" data-act="cf2SbEdit" data-k="${esc(r.key)}">Edit</button> <button type="button" class="btn btn-sm btn-ghost" data-act="cf2SbRm" data-k="${esc(r.key)}" aria-label="Remove ${esc(r.title)} on ${fds(r.start)}">Remove</button></td></tr>${N.edit === r.key ? `<tr><td colspan="7">${cf2Form(r, false)}</td></tr>` : ''}`; }).join('');
  return `<p class="small">Set up the batch's timetable now, or create the batch without classes and add them later in its <strong>Schedule</strong> tab.</p>
    <p class="xs muted">${modes} Times are entered as in the other scheduling dialogs (${tzl()}); ${tz.source === 'configured' ? '' : 'the batch time zone isn\'t configured yet — ' + esc(tz.note)}</p>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">How do you want to start?</legend>
      <label class="check"><input type="radio" name="cf2-sbm" value="tpl" data-onchange="cf2SbMode" ${N.mode === 'tpl' ? 'checked' : ''}><span><strong>Use a schedule template</strong><span class="hint" style="display:block">Choose a template and preview the sessions it generates. You can change, remove or add sessions before creating the batch.</span></span></label>
      <label class="check"><input type="radio" name="cf2-sbm" value="scratch" data-onchange="cf2SbMode" ${N.mode !== 'tpl' ? 'checked' : ''}><span><strong>Start from scratch</strong><span class="hint" style="display:block">An empty timetable. Add sessions now, or none.</span></span></label></fieldset>
    ${N.mode === 'tpl' ? `<div class="field"><label for="cf2-tpl">Schedule template</label><select class="select" id="cf2-tpl" data-onchange="cf2SbTpl"><option value="">Choose a template…</option>${act.map(x => `<option value="${x.id}" ${x.id === N.tpl ? 'selected' : ''}>${esc(x.name)} (version ${x.v})</option>`).join('')}</select></div>${t ? `<div class="note b-blue cf2-tplnote">${ic('cal')}<div class="small"><strong>${esc(t.name)}</strong> — ${esc(t.desc)}<ul>${t.rows.map(r => `<li>${esc(cf2RowTxt(r))}</li>`).join('')}</ul></div></div>` : ''}` : ''}
    ${N.skipped.length ? `<div class="note b-amber cf2-skip">${ic('info')}<div class="small"><strong>Not generated:</strong> ${N.skipped.map(esc).join('; ')}.</div></div>` : ''}
    <h3>Sessions (${N.rows.length})</h3>${N.rows.length ? `<div class="tbl-wrap"><table class="tbl dense cf2-sbt"><thead><tr><th>When</th><th>Session</th><th>Length</th><th>Teacher</th><th>Where</th><th>For</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="small muted cf2-sbnone">No sessions${N.mode === 'tpl' && !N.tpl ? ' — choose a template to preview its sessions' : ''}. The batch can be created without any.</p>`}
    ${N.adding ? cf2Form(null, true) : `<button type="button" class="btn btn-sm" data-act="cf2SbAdd">${ic('plus', 14)}Add session</button>`}
    <input type="radio" name="nb-sc" value="${esc(cf2NbLabel())}" checked hidden aria-hidden="true" tabindex="-1">`;
}
function cf2SbRefresh() {
  const box = document.getElementById('cf2-sb'), html = cf2SbHtml(); if (box) box.innerHTML = html;
  if (MODAL && typeof MODAL.body === 'string') MODAL.body = MODAL.body.replace(/<div id="cf2-sb">[\s\S]*<!--\/cf2-sb-->/, `<div id="cf2-sb">${html}</div><!--/cf2-sb-->`);
}
function cf2SbGen() { const t = cf2Tpl(CF2_NB.tpl); if (!t) { CF2_NB.rows = []; CF2_NB.skipped = []; CF2_NB.tplV = null; return; } const g = cf2Gen(t, CF2_NB); CF2_NB.rows = g.rows; CF2_NB.skipped = g.skipped; CF2_NB.tplV = t.v; CF2_NB.edit = null; }
INP.cf2SbMode = el => { CF2_NB.mode = el.value === 'tpl' ? 'tpl' : 'scratch'; if (CF2_NB.mode === 'scratch') { CF2_NB.tpl = ''; CF2_NB.tplV = null; CF2_NB.rows = CF2_NB.rows.filter(r => r.tplRow == null); CF2_NB.skipped = []; } cf2SbRefresh(); };
INP.cf2SbTpl = el => { CF2_NB.tpl = el.value; cf2SbGen(); cf2SbRefresh(); };
ACT.cf2SbEdit = el => { CF2_NB.edit = el.dataset.k; CF2_NB.adding = false; cf2SbRefresh(); };
ACT.cf2SbRm = el => { CF2_NB.rows = CF2_NB.rows.filter(r => r.key !== el.dataset.k); if (CF2_NB.edit === el.dataset.k) CF2_NB.edit = null; cf2SbRefresh(); };
ACT.cf2SbAdd = () => { CF2_NB.adding = true; CF2_NB.edit = null; cf2SbRefresh(); };
ACT.cf2SbCancel = () => { CF2_NB.adding = false; CF2_NB.edit = null; cf2SbRefresh(); };
function cf2FormRead() {
  const dv = mval('#cf2f-d'), ticks = $$('#modal-root .cf2f-a:checked').map(x => x.value), all = CF2_NB.opts.length && ticks.length === CF2_NB.opts.length;
  return { title: mval('#cf2f-t').trim(), kind: mval('#cf2f-k'), start: dv ? new Date(dv + ':00Z').toISOString() : '', mins: +mval('#cf2f-m'), teacher: mval('#cf2f-te'), where: mval('#cf2f-w') === 'room' ? 'room' : 'zoom', loc: mval('#cf2f-l').trim(), aud: !CF2_NB.opts.length || all ? null : ticks, desc: mval('#cf2f-x').trim() };
}
ACT.cf2SbDone = el => {
  const v = cf2FormRead(), err = m => { const b = document.getElementById('cf2f-err'); if (b) b.innerHTML = `<p class="small" role="alert" style="color:var(--red)">${esc(m)}</p>`; return false; };
  if (v.where === 'room' && !v.loc) v.loc = 'Classroom (in person)';
  const key = el.dataset.k;
  if (key) { const r = CF2_NB.rows.find(x => x.key === key); if (!r) return; const why = cf2RowWhy({ ...r, ...v }); if (why) return err(why); Object.assign(r, v, { edited: true }); CF2_NB.edit = null; }
  else {
    const every = +mval('#cf2f-r') || 0, n = every ? Math.max(1, Math.min(52, +mval('#cf2f-n') || 1)) : 1, out = [];
    for (let i = 0; i < n; i++) { const st = new Date(new Date(v.start).getTime() + i * 7 * every * DAY).toISOString(); const r = { ...v, start: st, key: 'm' + (++CF2_NB.seq), series: every ? `${CF2_EVERY[every]} · ${i + 1} of ${n}` : 'One-off' }; const why = cf2RowWhy(r); if (why) return err(n > 1 ? `Session ${i + 1}: ${why}` : why); out.push(r); }
    CF2_NB.rows = CF2_NB.rows.concat(out); CF2_NB.adding = false;
  }
  cf2SbRefresh();
};
// Wizard steps: capture the details the builder needs (step 1, 2), replace step 3's body, check step 3, apply after creation
const _omCF2s = openModal;
openModal = function (o) {
  if (o && CF2_NB && /^Create batch — step [1-5] of 5$/.test(o.title || '') && typeof o.body === 'string') {
    const step = +o.title.match(/step (\d)/)[1];
    if (step === 3) {
      if (CF2_PRESET && !CF2_NB.tpl) { CF2_NB.mode = 'tpl'; CF2_NB.tpl = CF2_PRESET.tpl; cf2SbGen(); }
      const k = o.body.indexOf('</ol>') + 5; o = { ...o, body: o.body.slice(0, k) + `<div id="cf2-sb">${cf2SbHtml()}</div><!--/cf2-sb-->` };
    }
    const r = _omCF2s.apply(this, [o].concat([].slice.call(arguments, 1)));
    const a = MODAL && MODAL.actions && MODAL.actions.find(x => x.cls && /primary/.test(x.cls));
    if (a && !a._cf2s) { const f = a.fn; a._cf2s = true; a.fn = (...x) => {
      if (step === 1) { CF2_NB.code = mval('#nb-c').toUpperCase(); CF2_NB.course = mval('#nb-co'); CF2_NB.start = mval('#nb-s'); CF2_NB.end = mval('#nb-e'); CF2_NB.pid = s4PidOfTitle(CF2_NB.course) || null; const ms = $$('#modal-root .m-m:checked').map(i => i.value); CF2_NB.modes = ms; CF2_NB.opts = cf2Opts(CF2_NB.pid, ms); }
      if (step === 2) CF2_NB.teachers = $$('#modal-root .nb-t:checked').map(i => i.value);
      if (step === 3) {
        if (CF2_NB.mode === 'tpl' && !CF2_NB.tpl) { fieldErr('#cf2-tpl', 'Choose a template, or start from scratch'); return false; }
        if (CF2_NB.adding || CF2_NB.edit) { toast('Finish or cancel the session you are editing first.', 'err'); return false; }
        const bad = CF2_NB.rows.map(r => [r, cf2RowWhy(r)]).filter(x => x[1]); if (bad.length) { toast(`${plural(bad.length, 'session')} need${bad.length === 1 ? 's' : ''} attention: ${bad[0][0].title} — ${bad[0][1]}.`, 'err'); return false; }
      }
      const res = f(...x);
      if (step === 5 && res !== false) cf2Apply();
      return res; }; }
    return r;
  }
  return _omCF2s.apply(this, arguments);
};
// Creating the batch: each builder row becomes a real session of it (S4b record, R2 audience)
function cf2Apply() {
  const N = CF2_NB, b = N && N.code && ADMIN.batches.find(x => x.code === N.code); if (!b || b.cf2Sched) return;
  const at = now().toISOString(), me = ADMIN.me.name, t = N.tpl ? cf2Tpl(N.tpl) : null;
  b.cf2Sched = { mode: N.mode, tpl: t ? t.id : null, tplV: t ? N.tplV : null, tplName: t ? t.name : null, n: N.rows.length, at, by: me };
  N.rows.slice().sort((x, y) => x.start.localeCompare(y.start)).forEach(r => {
    const S_ = S4B(), id = 'ss-' + (S_.n++), s = { id, batch: b.code, title: r.title, start: r.start, end: new Date(new Date(r.start).getTime() + r.mins * 6e4).toISOString(), teacher: r.teacher, link: r.where === 'room' ? null : 'Zoom (simulated) — meeting 8' + id.replace(/\D/g, '') + '40 112', loc: r.where === 'room' ? r.loc || 'Classroom (in person)' : null, status: 'Scheduled', with: [], ...(Array.isArray(r.aud) ? { aud: r.aud.slice() } : {}), kind: r.kind, desc: r.desc || '', cf2: { tpl: t ? t.id : null, tplV: t ? N.tplV : null, series: r.series || 'One-off' },
      hist: [[at, me, 'Added', '—', fdt(r.start) + (Array.isArray(r.aud) ? ' · for: ' + cf2AudTxt(r.aud) : ''), t ? `Schedule builder — template "${t.name}" version ${N.tplV}` : 'Schedule builder']] };
    s4bSess(b.code).push(s);
  });
  s4bSyncBatch(b.code);
  const what = t ? `Template "${t.name}" version ${N.tplV}` : 'From scratch';
  STORE.aca.schedLog.unshift({ at, who: me, what: `Timetable — ${b.code}`, before: '—', after: `${plural(N.rows.length, 'session')} · ${what}`, reason: 'Batch created' });
  logA('Scheduling', `${b.label} (${b.code})`, 'Timetable created with the batch', '—', `${plural(N.rows.length, 'session')} · ${what}`, N.skipped.length ? 'Not generated: ' + N.skipped.join('; ') : '');
  if (N.rows.length) new Set(N.rows.map(r => r.teacher).filter(Boolean)).forEach(n => tasNotify('Sessions scheduled', `${n}: ${b.code} — ${plural(N.rows.filter(r => r.teacher === n).length, 'session')} from ${fd(N.rows[0].start)}`, 't-calendar', 'Sessions'));
}
// A builder batch has no invented deadline / observation-window / milestone placeholders (its real deadlines and sessions remain)
const _be0CF2 = batchEvents0;
batchEvents0 = function (b) { return b && b.cf2Sched ? [] : _be0CF2.apply(this, arguments); };

/* ---------- Schedule templates (Scheduling console) ---------- */
let CF2_TE = null;
const cf2TplCan = () => s4bSched();
const cf2TplUsed = id => ADMIN.batches.filter(b => b.cf2Sched && b.cf2Sched.tpl === id);
function cf2TplCard() {
  const can = cf2TplCan(), ts = cf2Sch().tpls;
  return `<section class="card cf2-tpls"><div class="row-b"><h2>Schedule templates</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="cf2TplNew">${ic('plus', 14)}New template</button>` : ''}</div><p class="small muted">Used in Create batch → Schedule & Sessions. A batch keeps the template version it was built from: editing a template never changes an existing batch's sessions.</p>
    <ul class="list">${ts.map(t => { const u = cf2TplUsed(t.id); return `<li class="li cf2-tpl" data-t="${t.id}"><div class="li-b"><strong>${esc(t.name)} <span class="xs muted">· ${t.id} · version ${t.v}</span></strong><span class="small">${esc(t.desc)}</span><ul class="xs">${t.rows.map(r => `<li>${esc(cf2RowTxt(r))}</li>`).join('')}</ul><span class="xs muted">Used by: ${u.length ? u.map(b => `${esc(b.code)} (version ${b.cf2Sched.tplV})`).join(', ') : 'no batch yet'}</span></div>${chip(t.status, t.status === 'Active' ? 'green' : 'grey')}${can ? `<div class="row"><button class="btn btn-sm" data-act="cf2TplEdit" data-t="${t.id}" ${t.status !== 'Active' ? 'disabled' : ''}>Edit</button><button class="btn btn-sm" data-act="cf2TplDup" data-t="${t.id}">Duplicate</button><button class="btn btn-sm" data-act="cf2TplArch" data-t="${t.id}">${t.status === 'Active' ? 'Archive' : 'Restore'}</button></div>` : ''}</li>`; }).join('')}</ul></section>`;
}
const _schedCF2 = SCREENS['a-scheduling'];
SCREENS['a-scheduling'] = p => { const h = _schedCF2(p); return (p && p.tab && p.tab !== 'console') || typeof h !== 'string' ? h : h + cf2TplCard(); };
const cf2TplRefuse = what => { logA('Scheduling', 'Schedule templates', 'Blocked: ' + what, '—', '—', 'Role can\'t manage schedule templates'); toast('You can\'t ' + what + '.', 'err'); return false; };
function cf2TeBody() {
  const t = CF2_TE, row = (r, i) => `<tr data-i="${i}"><td><input class="input" aria-label="Title, row ${i + 1}" data-f="title" value="${esc(r.title)}"></td><td><select class="select" aria-label="Type, row ${i + 1}" data-f="kind">${CF2_KINDS.map(k => `<option ${k === r.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></td><td><select class="select" aria-label="Repeat, row ${i + 1}" data-f="every">${Object.entries(CF2_EVERY).map(([k, l]) => `<option value="${k}" ${+k === +r.every ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><select class="select" aria-label="Weekday, row ${i + 1}" data-f="wd">${N3_DAYS.map(d => `<option ${d === r.wd ? 'selected' : ''}>${d}</option>`).join('')}</select></td><td><input class="input" type="time" aria-label="Start time, row ${i + 1}" data-f="time" value="${esc(r.time)}"></td><td><input class="input num" type="number" min="15" max="480" aria-label="Minutes, row ${i + 1}" data-f="mins" value="${r.mins}"></td><td><input class="input num" type="number" min="0" max="52" aria-label="Starts in week, row ${i + 1}" data-f="from" value="${r.from}"></td><td><input class="input num" type="number" min="1" max="52" aria-label="Number of sessions, row ${i + 1}" data-f="count" value="${r.count}"></td><td><select class="select" aria-label="Where, row ${i + 1}" data-f="where"><option value="zoom" ${r.where !== 'room' ? 'selected' : ''}>Zoom</option><option value="room" ${r.where === 'room' ? 'selected' : ''}>Classroom</option></select><input class="input" aria-label="Location, row ${i + 1}" data-f="loc" value="${esc(r.loc || '')}" placeholder="Location"></td><td><select class="select" aria-label="For, row ${i + 1}" data-f="aud">${Object.entries(CF2_AUD).map(([k, l]) => `<option value="${k}" ${k === r.aud ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><button class="btn btn-sm btn-ghost" data-act="cf2TeRm" data-i="${i}" aria-label="Remove row ${i + 1}">Remove</button></td></tr>`;
  return `<div class="form-grid"><div class="field full"><label for="te-n">Template name</label><input class="input" id="te-n" value="${esc(t.name)}"></div><div class="field full"><label for="te-d">Description</label><input class="input" id="te-d" value="${esc(t.desc)}"></div></div>
    <div class="tbl-wrap"><table class="tbl dense cf2-te"><thead><tr><th>Title</th><th>Type</th><th>Repeat</th><th>Weekday</th><th>Time</th><th>Min</th><th>Week</th><th>Count</th><th>Where</th><th>For</th><th></th></tr></thead><tbody>${t.rows.map(row).join('')}</tbody></table></div>
    <button class="btn btn-sm" data-act="cf2TeAdd">${ic('plus', 14)}Add row</button><p class="xs muted">"Week" counts from the batch start (0 = the first week). A row for a delivery mode the batch doesn't offer isn't generated for it. ${t.id ? `Saving creates version ${t.v + 1}; batches built from version ${t.v} keep their sessions.` : ''}</p>`;
}
function cf2TeRead() {
  if (!CF2_TE) return; CF2_TE.name = mval('#te-n'); CF2_TE.desc = mval('#te-d');
  $$('#modal-root .cf2-te tbody tr').forEach(tr => { const r = CF2_TE.rows[+tr.dataset.i]; if (!r) return; tr.querySelectorAll('[data-f]').forEach(i => { const f = i.dataset.f; r[f] = ['mins', 'from', 'count', 'every'].includes(f) ? +i.value : i.value; }); });
}
const cf2TeDraw = () => { if (!MODAL) return; MODAL.body = cf2TeBody(); renderModal(); };
ACT.cf2TeAdd = () => { cf2TeRead(); CF2_TE.rows.push(cf2Row('Live class', 'Live class', 'Tuesday', '17:00', 90, 1, 0, 6, 'zoom', 'all')); cf2TeDraw(); };
ACT.cf2TeRm = el => { cf2TeRead(); CF2_TE.rows.splice(+el.dataset.i, 1); cf2TeDraw(); };
function cf2TeWhy(t) {
  if (!t.name.trim()) return 'Enter a template name'; if (!t.rows.length) return 'Add at least one row';
  for (const [i, r] of t.rows.entries()) { if (!r.title.trim()) return `Row ${i + 1}: enter a title`; if (!/^\d{2}:\d{2}$/.test(r.time)) return `Row ${i + 1}: enter a start time`; if (!(r.mins >= 15 && r.mins <= 480)) return `Row ${i + 1}: length 15 to 480 minutes`; if (!(r.count >= 1 && r.count <= 52)) return `Row ${i + 1}: 1 to 52 sessions`; if (!(r.from >= 0 && r.from <= 52)) return `Row ${i + 1}: week 0 to 52`; if (!CF2_EVERY[r.every]) return `Row ${i + 1}: choose how it repeats`; if (!CF2_AUD[r.aud]) return `Row ${i + 1}: choose who it is for`; }
  if (cf2Sch().tpls.some(x => x.id !== t.id && x.name.trim().toLowerCase() === t.name.trim().toLowerCase())) return 'A template with this name already exists';
  return '';
}
function cf2TeOpen(t0) {
  CF2_TE = t0 ? { id: t0.id, v: t0.v, name: t0.name, desc: t0.desc, rows: JSON.parse(JSON.stringify(t0.rows)) } : { id: null, v: 0, name: '', desc: '', rows: [cf2Row('Live class', 'Live class', 'Tuesday', '17:00', 90, 1, 0, 6, 'zoom', 'all')] };
  openModal({ title: t0 ? 'Edit schedule template — ' + esc(t0.name) : 'New schedule template', size: 'lg', body: cf2TeBody(), actions: [{ label: 'Cancel' }, { label: t0 ? `Save as version ${t0.v + 1}` : 'Create template', cls: 'btn-primary', fn: () => {
    if (!cf2TplCan()) return cf2TplRefuse('manage schedule templates'); cf2TeRead(); const t = CF2_TE, why = cf2TeWhy(t); if (why) { toast(why, 'err'); return false; }
    const at = now().toISOString(), me = ADMIN.me.name, rows = JSON.parse(JSON.stringify(t.rows));
    if (t.id) { const x = cf2Tpl(t.id), was = `Version ${x.v}`; x.v++; Object.assign(x, { name: t.name.trim(), desc: t.desc.trim(), rows }); x.vers.push({ v: x.v, at, by: me, rows: JSON.parse(JSON.stringify(rows)) }); x.hist.unshift([at, me, 'Template changed', `Version ${x.v}`]); logA('Scheduling', `Schedule template ${x.id} · ${x.name}`, 'Schedule template changed', was, `Version ${x.v} · ${rows.length} rows`, 'Existing batches keep their sessions'); toast(`Saved as version ${x.v}. Existing batches are unchanged.`); }
    else { const id = 'TPL-' + (cf2Sch().n++); cf2Sch().tpls.push({ id, name: t.name.trim(), desc: t.desc.trim(), v: 1, status: 'Active', rows, vers: [{ v: 1, at, by: me, rows: JSON.parse(JSON.stringify(rows)) }], hist: [[at, me, 'Template created', 'Version 1']] }); logA('Scheduling', `Schedule template ${id} · ${t.name.trim()}`, 'Schedule template created', '—', `Version 1 · ${rows.length} rows`, ''); toast('Template created.'); }
    CF2_TE = null; render(); } }] });
}
ACT.cf2TplNew = () => (cf2TplCan() ? cf2TeOpen(null) : cf2TplRefuse('manage schedule templates'));
ACT.cf2TplEdit = el => { const t = cf2Tpl(el.dataset.t); if (!cf2TplCan()) return cf2TplRefuse('manage schedule templates'); if (!t || t.status !== 'Active') { toast('Restore the template before editing it.', 'err'); return; } cf2TeOpen(t); };
ACT.cf2TplDup = el => { const t = cf2Tpl(el.dataset.t); if (!cf2TplCan()) return cf2TplRefuse('manage schedule templates'); if (!t) return; cf2TeOpen(null); CF2_TE.name = t.name + ' (copy)'; CF2_TE.desc = t.desc; CF2_TE.rows = JSON.parse(JSON.stringify(t.rows)); cf2TeDraw(); };
ACT.cf2TplArch = el => { const t = cf2Tpl(el.dataset.t); if (!cf2TplCan()) return cf2TplRefuse('manage schedule templates'); if (!t) return; const to = t.status === 'Active' ? 'Archived' : 'Active';
  reasonDlg({ title: `${to === 'Archived' ? 'Archive' : 'Restore'} ${esc(t.name)}`, ok: to === 'Archived' ? 'Archive' : 'Restore', body: `<p class="small">${to === 'Archived' ? 'It is no longer offered in Create batch. Batches built from it keep their sessions.' : 'It is offered again in Create batch.'}</p>`, onOk: r => { const was = t.status; t.status = to; t.hist.unshift([now().toISOString(), ADMIN.me.name, to === 'Archived' ? 'Archived' : 'Restored', r]); logA('Scheduling', `Schedule template ${t.id} · ${t.name}`, `Schedule template ${to === 'Archived' ? 'archived' : 'restored'}`, was, to, r); render(); } }); };

/* ---------- After creation: description, affected people, origin ---------- */
const _omCF2d = openModal;
openModal = function (o) {
  const r = _omCF2d.apply(this, arguments);
  if (o && ['Add session', 'Edit session'].includes(o.title) && MODAL && typeof MODAL.body === 'string' && !/id="se-desc"/.test(MODAL.body)) {
    const ex = o.title === 'Edit session' ? s4bSessById(($('#se-x') || {}).value || (/id="se-x" value="([^"]+)"/.exec(MODAL.body) || [])[1]) : null;
    MODAL.body = MODAL.body.replace('<div id="se-c"></div>', `<div class="field full cf2-sedesc"><label for="se-desc">Description / instructions for learners (optional)</label><textarea class="textarea" id="se-desc" rows="2">${esc((ex && ex.desc) || '')}</textarea></div><div id="se-c"></div>`); renderModal();
  }
  return r;
};
['addSession', 's4bSessEdit'].forEach(k => { const g = ACT[k]; ACT[k] = el => {
  const r = g(el); if (!MODAL || !['Add session', 'Edit session'].includes(MODAL.title)) return r;
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a || a._cf2d) return r; const f = a.fn; a._cf2d = true;
  a.fn = (...x) => {
    const desc = (($('#se-desc') || {}).value || '').trim(), sid = k === 'addSession' ? 'ss-' + S4B().n : ($('#se-x') || {}).value, s0 = s4bSessById(sid), was = s0 ? s0.desc || '' : '', rs = (($('#se-r') || {}).value || '').trim() || 'Instructions updated';
    const res = f(...x), s = s4bSessById(sid); if (res === false || !s) return res;
    if (k === 'addSession') { if (desc) s.desc = desc; return res; }
    if (desc !== was) { s.desc = desc; s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Instructions changed', was || '—', desc || '—', rs]); logA('Scheduling', `${s.title} (${s.batch})`, 'Session instructions changed', was || '—', desc || '—', rs); s4bSyncSess(s); s4bNotifySess(s, 'Session details updated', `${s.title} · ${fdt(s.start)}: instructions updated`, true); if (MODAL) closeModal(); render(); }
    return res;
  };
  return r; }; });
// Learner calendars carry the session's description (shown in the event details)
const _syncCF2 = s4bSyncWEv;
s4bSyncWEv = function (w) { const r = _syncCF2.apply(this, arguments); (w && w.events || []).forEach(e => { if (e.type !== 'class') return; const s = s4bSessById(String(e.id).replace(/^bs-/, '')); if (s) { if (s.desc) e.desc = s.desc; else delete e.desc; if (s.kind) e.kind = s.kind; } }); return r; };
const _evPopCF2 = ACT.evPop;
ACT.evPop = el => { const r = _evPopCF2(el), e = W && W.events && W.events.find(x => x.id === (el && el.dataset && el.dataset.id)); if (e && e.desc && MODAL && typeof MODAL.body === 'string' && !/cf2-evdesc/.test(MODAL.body)) { MODAL.body += `<div class="note b-blue cf2-evdesc">${ic('info')}<div class="small"><strong>Instructions:</strong> ${esc(e.desc)}</div></div>`; renderModal(); } return r; };
// "Affected": who the session is for, who teaches it, the Coordinators told of changes, and its history
ACT.cf2Who = el => {
  const s = s4bSessById(el && el.dataset && el.dataset.id); if (!s) { toast('Session not found.', 'err'); return; }
  const lids = typeof n4Eligible === 'function' ? n4Eligible(s) : [], nm = l => { const x = (ADMIN.learners || []).find(y => y.id === l); return x ? x.name : l; };
  const bs = s4bCodesOf(s).map(s4bBatch).filter(Boolean), coords = [...new Set(bs.flatMap(b => (b.coords && b.coords.length ? b.coords : [b.coord])).filter(Boolean))];
  openModal({ title: 'Affected — ' + esc(s.title), sub: `${fdt(s.start)} · ${esc(s.batch)}${s.status === 'Cancelled' ? ' · Cancelled' : ''}`, size: 'lg', body: `<dl class="kv"><dt>For</dt><dd>${esc(typeof r2AudShort === 'function' ? r2AudShort(s) : 'All learners')}</dd><dt>Learners (${lids.length})</dt><dd>${lids.length ? lids.map(l => esc(nm(l))).join(', ') : 'None yet — learners who join a matching fee option get it automatically'}</dd><dt>Teacher</dt><dd>${esc(s.teacher || '—')}</dd><dt>Coordinators</dt><dd>${esc(coords.join(', ') || '—')}</dd>${s.desc ? `<dt>Instructions</dt><dd>${esc(s.desc)}</dd>` : ''}${s.cf2 ? `<dt>Origin</dt><dd>${esc(s.cf2.tpl ? `Template ${s.cf2.tpl} version ${s.cf2.tplV} · ${s.cf2.series}` : 'Added in the schedule builder')}</dd>` : ''}</dl>
    <h3>History</h3><ul class="list small">${(s.hist || []).map(h => `<li class="li"><div class="li-b"><strong>${esc(h[2])}</strong><span class="xs muted">${fdt(h[0])} · ${esc(h[1])}${h[3] && h[3] !== '—' ? ` · ${esc(h[3])} → ${esc(h[4])}` : h[4] ? ' · ' + esc(h[4]) : ''}${h[5] ? ' · ' + esc(h[5]) : ''}</span></div></li>`).join('')}</ul><p class="xs muted">Attendance already recorded is never changed by a schedule change.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
const _r2SchedCF2 = r2SchedSection;
r2SchedSection = function (b) {
  let h = _r2SchedCF2.apply(this, arguments); if (typeof h !== 'string' || !b) return h;
  h = h.replace(/(<button class="btn btn-sm" data-act="s4bSessEdit" data-b="([^"]+)" data-id="([^"]+)")/g, '<button class="btn btn-sm cf2-whob" data-act="cf2Who" data-id="$3">Affected</button> $1');
  const o = b.cf2Sched; if (!o) return h;
  return h.replace('<h3>Weekly recurring classes</h3>', `<p class="small cf2-origin">${ic('cal', 14)} Timetable created with the batch: ${o.tpl ? `template "${esc(o.tplName)}" version ${o.tplV}` : 'from scratch'} · ${plural(o.n, 'session')} · ${fd(o.at)} by ${esc(o.by)}. Later changes are made here and keep their history.</p><h3>Weekly recurring classes</h3>`);
};

UXC.push(['CF2-B', 'Client Feedback 2.0 — schedule builder (15 Nov 2026)', [
  'Create batch → Schedule & Sessions: use a schedule template (choose, preview the real sessions with dates, times, recurrence, length, type and fee-option audience, then edit / remove / add) or start from scratch (no sessions needed). Weekly, fortnightly and four-weekly rows generate those intervals.',
  'Creating the batch makes each row a real session (the same record as Add session), for the fee options ticked — only the batch\'s own options, from the programme. Builder batches get no placeholder deadlines, observation windows or milestones.',
  'Scheduling → Schedule templates: new, edit (next version), duplicate, archive / restore. A batch keeps the version it was built from.',
  'Batch Schedule tab: unchanged add / weekly / edit / reschedule / cancel with reason, plus session instructions, "Affected" (learners, teacher, Coordinators, history) and the batch\'s builder origin. Learner calendars show the instructions.']]);
