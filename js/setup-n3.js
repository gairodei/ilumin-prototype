/* ============================================================
   N3 — NVQ class planning (SRS v1.3.2, accepted for internal implementation; client approval pending).
   Fully Assisted batches: a weekly class plan (weekday, time, length, teacher, Zoom or classroom, date range) that generates
   real S4b sessions — one record per occurrence with a stable id, so N4 registers attach to them. Re-saving never
   duplicates; held, attended, cancelled or individually changed classes are never rewritten; removed dates are cancelled
   (kept in history), and every change is previewed first. Self-Paced batches: a planned number of classes, made of the
   batch's own sessions and shared classes it explicitly joins (S4b sharing) — counted once each. No new session store.
   Configuring a plan is a batch-edit right and creating, joining or cancelling sessions is the S4b timetable right — both
   Super Admin, System Admin and Academic Admin (client-confirmed permissions). Loads after setup-n2.js.
   ============================================================ */
'use strict';

/* ---------- Store ---------- */
const N3 = () => (STORE.n3 = STORE.n3 || { plans: {} });
const _isN3 = initStore; initStore = function () { STORE.n3 = null; return _isN3.apply(this, arguments); };
// R2 (final review): a Level 3 batch can have several weekly plans. N3_SLOT names the plan being edited (null = the batch's first plan,
// stored under the batch code exactly as before); the others are stored as "<batch code>#<n>". Everything else in N3 is unchanged.
let N3_SLOT = null;
const n3PK = code => (N3_SLOT ? code + '#' + N3_SLOT : code);
const n3Plan = code => N3().plans[n3PK(code)] || null;
const N3_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const n3Batch = code => ADMIN.batches.find(b => b.code === code);
const n3Kind = b => n2ModeOf(b) === 'Self-Paced' ? 'limited' : n2ModeOf(b) === 'Fully Assisted' ? 'weekly' : null;
// The plan patterns a batch uses (R2: a mixed Level 3 batch has both the weekly and the limited pattern)
let n3Kinds = b => { const k = n3Kind(b); return k ? [k] : []; };
const n3CanConfig = () => s4bCanBatch();         // batch-edit right (client-confirmed matrix)
const n3CanSchedule = () => s4bSched();          // S4b session right — unchanged
const n3Refuse = (b, what, why) => { logA('Scheduling', b ? `${b.label} (${b.code})` : 'Class plan', 'Blocked: ' + what, '—', '—', why); toast(why, 'err'); return false; };
const n3Held = s => new Date(s.start) <= now() || !!((typeof n4Reg === 'function' && n4Reg(s.id)) && Object.keys(n4Reg(s.id).rows).length);
const n3Changed = s => !!s.gen && (s.start !== s.gen.start || s.end !== s.gen.end || s.teacher !== s.gen.teacher);
const n3Live = s => s.status !== 'Cancelled';
// One notice per person for a batch-level change (Coordinator, teachers, learners of the batches)
function n3Notify(codes, t, body, learners, extraTeachers) {
  const bs = codes.map(n3Batch).filter(Boolean), people = new Set(), ws = new Map();
  bs.forEach(b => { if (b.coord && !people.has('c:' + b.coord)) { people.add('c:' + b.coord); chCooNotify(b.coord, t, body, 'c-timeline'); } (b.teachers || []).forEach(n => { if (!people.has('t:' + n)) { people.add('t:' + n); tasNotify(t, n + ': ' + body, 't-calendar', 'Sessions'); } }); if (learners) s4bWorldsOf(b.code).forEach(w => ws.set(w.v, w)); });
  (extraTeachers || []).forEach(n => { if (n && !people.has('t:' + n)) { people.add('t:' + n); tasNotify(t, n + ': ' + body, 't-calendar', 'Sessions'); } });
  ws.forEach(w => notifyLearner(w.v, 'Schedule', t, body, 'calendar'));
}

/* ---------- Fully Assisted: weekly plan → real S4b sessions ---------- */
const n3Key = iso => iso.slice(0, 10);
function n3Dates(p, b) {
  const out = [], from = new Date(p.from + 'T00:00:00Z'), to = new Date(p.to + 'T00:00:00Z'), wd = N3_DAYS.indexOf(p.weekday);
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + DAY)) { if ((d.getUTCDay() + 6) % 7 !== wd) continue; const start = new Date(n3Key(d.toISOString()) + 'T' + p.time + ':00Z'); if (start <= now() || start < new Date(b.start) || start > new Date(b.end)) continue; out.push(start.toISOString()); }
  return out;
}
// What saving this plan would do — nothing is changed here
function n3Diff(b, p) {
  const old = n3Plan(b.code) || { occ: {} }, occ = old.occ || {}, want = n3Dates(p, b), wantK = new Set(want.map(n3Key)), mins = p.mins;
  const add = [], upd = [], cancel = [], keep = [];
  want.forEach(iso => { const sid = occ[n3Key(iso)], s = sid && s4bSessById(sid); if (!s || (s.status === 'Cancelled' && s.n3Removed)) add.push(iso); else if (!n3Live(s) || n3Held(s) || n3Changed(s)) keep.push([s, !n3Live(s) ? 'cancelled' : n3Held(s) ? 'held or attended' : 'changed individually']); else { const ns = { start: iso, end: new Date(new Date(iso).getTime() + mins * 6e4).toISOString(), teacher: p.teacher }; if (ns.start !== s.start || ns.end !== s.end || ns.teacher !== s.teacher || (p.where === 'room') !== !s.link) upd.push([s, ns]); } });
  Object.entries(occ).forEach(([k, sid]) => { if (wantK.has(k)) return; const s = s4bSessById(sid); if (!s || !n3Live(s)) return; if (n3Held(s) || n3Changed(s)) keep.push([s, n3Held(s) ? 'held or attended' : 'changed individually']); else cancel.push(s); });
  const conf = add.map(iso => [iso, s4bConfText(b, iso, mins, p.teacher)]).concat(upd.map(([s, ns]) => [ns.start, s4bConfText(b, ns.start, mins, ns.teacher, s.id, s.with || [])])).filter(x => x[1]);
  return { add, upd, cancel, keep, conf };
}
function n3DiffHtml(b, d) {
  const li = (t, xs) => xs.length ? `<li><strong>${t}</strong>: ${xs.slice(0, 12).map(x => esc(x)).join(', ')}${xs.length > 12 ? ` (+${xs.length - 12} more)` : ''}</li>` : '';
  const others = new Set(d.upd.concat(d.cancel.map(s => [s])).flatMap(([s]) => (s.with || [])));
  return `<div class="note b-blue n3-preview">${ic('cal')}<div class="small"><strong>Preview — nothing is saved yet</strong><ul>
    ${li(`${d.add.length} new class${d.add.length === 1 ? '' : 'es'}`, d.add.map(x => fdt(x)))}${li(`${d.upd.length} upcoming class${d.upd.length === 1 ? '' : 'es'} updated to the new plan`, d.upd.map(([s, ns]) => `${fdt(s.start)} → ${fdt(ns.start)}`))}
    ${li(`${d.cancel.length} upcoming class${d.cancel.length === 1 ? '' : 'es'} no longer in the plan — cancelled (kept in history)`, d.cancel.map(s => fdt(s.start)))}${li(`${d.keep.length} kept unchanged`, d.keep.map(([s, why]) => `${fdt(s.start)} (${why})`))}
    ${d.add.length + d.upd.length + d.cancel.length === 0 ? '<li>No change to the sessions.</li>' : ''}</ul>
    ${d.conf.length ? `<p style="color:var(--amber)"><strong>${plural(d.conf.length, 'conflict')}:</strong> ${d.conf.slice(0, 6).map(([iso, c]) => `${fdt(iso)} — ${esc(c)}`).join('; ')}. They can still be saved; resolve them in Scheduling.</p>` : '<p>No scheduling conflicts.</p>'}
    <p>Affected: ${esc(b.label)}${others.size ? ' and the batches sharing these classes (' + esc([...others].join(', ')) + ')' : ''}; the teacher, the Coordinator and the batch\'s learners are told once. Attendance is never created by scheduling.</p></div></div>`;
}
const n3Fields = (b, p) => `<div class="form-grid">
  <div class="field"><label for="n3-wd">Weekday</label><select class="select" id="n3-wd">${N3_DAYS.map(x => `<option ${x === p.weekday ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label for="n3-t">Start time (${tzl()})</label><input class="input" type="time" id="n3-t" value="${p.time}"></div>
  <div class="field"><label for="n3-m">Length (minutes)</label><input class="input num" type="number" min="15" max="480" id="n3-m" value="${p.mins}"></div>
  <div class="field"><label for="n3-te">Teacher</label><select class="select" id="n3-te">${s4bTeachers().map(n => `<option ${n === p.teacher ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="field"><label for="n3-w">Where</label><select class="select" id="n3-w"><option value="zoom" ${p.where !== 'room' ? 'selected' : ''}>Zoom meeting (simulated reference)</option><option value="room" ${p.where === 'room' ? 'selected' : ''}>Classroom (in person)</option></select><span class="hint">Batch delivery channel: ${esc(b.mode || '—')}.</span></div>
  <div class="field"><label for="n3-f">First class on or after</label><input class="input" type="date" id="n3-f" value="${p.from}"></div><div class="field"><label for="n3-to">Last class on or before</label><input class="input" type="date" id="n3-to" value="${p.to}"></div>
  <div class="field full"><label for="n3-n">Class title</label><input class="input" id="n3-n" value="${esc(p.title)}"></div></div>
  <p class="xs muted">Within the batch dates (${fd(b.start)} – ${fd(b.end)}); only future dates are scheduled. Each class becomes its own session, which can still be edited, shared or cancelled individually.</p>`;
function n3ReadWeekly(b) {
  const p = { weekday: $('#n3-wd').value, time: $('#n3-t').value, mins: +$('#n3-m').value, teacher: $('#n3-te').value, where: $('#n3-w').value, from: $('#n3-f').value, to: $('#n3-to').value, title: $('#n3-n').value.trim() };
  if (!/^\d\d:\d\d$/.test(p.time)) return fieldErr('#n3-t', 'Enter a start time'), null;
  if (!(Number.isInteger(p.mins) && p.mins >= 15 && p.mins <= 480)) return fieldErr('#n3-m', 'Enter 15 to 480 minutes'), null;
  if (!p.from || !p.to || p.to < p.from) return fieldErr('#n3-to', 'The last date must be on or after the first'), null;
  if (p.from < b.start.slice(0, 10) || p.to > b.end.slice(0, 10)) return fieldErr('#n3-f', `Keep within the batch dates (${fd(b.start)} – ${fd(b.end)})`), null;
  if (!p.title) return fieldErr('#n3-n', 'Enter a class title'), null;
  return p;
}
ACT.n3Weekly = el => {
  const b = n3Batch(el.dataset.b); if (!b) return; if (!n3CanConfig()) return n3Refuse(b, 'configure the class plan', 'Only the Super Admin, System Admin or Academic Admin can configure a class plan.');
  if (!n3Kinds(b).includes('weekly')) { toast('The weekly plan is for Fully Assisted batches.', 'err'); return; }
  const cur = n3Plan(b.code), p0 = cur && cur.weekly || { weekday: 'Tuesday', time: '17:00', mins: 90, teacher: (b.teachers || [])[0] || s4bTeachers()[0], where: b.mode === 'Classroom' ? 'room' : 'zoom', from: b.start.slice(0, 10), to: b.end.slice(0, 10), title: 'Weekly class' };
  S.n3Ok = '';
  openModal({ title: 'Weekly class plan — ' + b.code, size: 'lg', body: `${n3Fields(b, p0)}<div id="n3-pv"></div><div class="field"><label for="n3-r">Reason (required)</label><textarea class="textarea" id="n3-r"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Preview and save', cls: 'btn-primary', fn: () => {
      const p = n3ReadWeekly(b); if (!p) return false; const r = mval('#n3-r'); if (!r) { fieldErr('#n3-r', 'Enter a reason'); return false; }
      const d = n3Diff(b, p), sig = JSON.stringify(p); if (S.n3Ok !== sig) { S.n3Ok = sig; $('#n3-pv').innerHTML = n3DiffHtml(b, d) + '<p class="small"><strong>Select "Preview and save" again to save.</strong></p>'; return false; }
      S.n3Ok = ''; const touches = d.add.length + d.upd.length + d.cancel.length;
      if (touches && !n3CanSchedule()) { n3Refuse(b, 'generate class sessions', 'You can configure the plan, but creating or cancelling class sessions needs the Super Admin or Academic Admin. The plan is saved as a draft; nothing was scheduled.'); n3SavePlan(b, { weekly: p, weeklyStatus: 'Draft' }, r, 'Weekly plan saved as draft (sessions not generated — no scheduling right)'); closeModal(); render(); return; }
      const occ = { ...((n3Plan(b.code) || {}).occ || {}) }, at = now().toISOString(), who = ADMIN.me.name, S_ = S4B();
      d.add.forEach(iso => { const id = 'ss-' + (S_.n++), end = new Date(new Date(iso).getTime() + p.mins * 6e4).toISOString(), s = { id, batch: b.code, title: p.title, start: iso, end, teacher: p.teacher, link: p.where === 'room' ? null : 'Zoom (simulated) — meeting 8' + id.replace(/\D/g, '') + '40 112', loc: p.where === 'room' ? 'Classroom (in person)' : null, status: 'Scheduled', with: [], hist: [[at, who, 'Added (weekly plan)', '—', fdt(iso), r]], n3: b.code, gen: { start: iso, end, teacher: p.teacher } }; s4bSess(b.code).push(s); occ[n3Key(iso)] = id; });
      d.upd.forEach(([s, ns]) => { s.hist.unshift([at, who, 'Weekly plan changed', `${fdt(s.start)} · ${s.teacher}`, `${fdt(ns.start)} · ${ns.teacher}`, r]); Object.assign(s, ns, { link: p.where === 'room' ? null : s.link || 'Zoom (simulated) — meeting 8' + s.id.replace(/\D/g, '') + '40 112', loc: p.where === 'room' ? 'Classroom (in person)' : null, gen: { ...ns } }); });
      d.cancel.forEach(s => { s.status = 'Cancelled'; s.reason = 'Removed from the weekly plan: ' + r; s.n3Removed = true; s.hist.unshift([at, who, 'Cancelled (removed from the weekly plan)', fdt(s.start), 'Cancelled', r]); });
      n3SavePlan(b, { weekly: p, weeklyStatus: 'Saved', occ }, r, `Weekly plan saved: ${d.add.length} added, ${d.upd.length} updated, ${d.cancel.length} cancelled, ${d.keep.length} kept`);
      const codes = Array.from(new Set([b.code].concat(d.upd.concat(d.cancel.map(s => [s])).flatMap(([s]) => s.with || []))));
      codes.forEach(s4bSyncBatch); if (touches) n3Notify(codes, 'Class timetable changed', `${b.label}: ${p.weekday}s at ${p.time} (${d.add.length} added, ${d.upd.length} moved, ${d.cancel.length} cancelled)`, true, [p.teacher]);
      closeModal(); render(); toast(`Weekly plan saved: ${d.add.length} classes added, ${d.upd.length} updated, ${d.cancel.length} cancelled, ${d.keep.length} kept unchanged.`);
    } }] });
};
function n3SavePlan(b, patch, r, what) { const p = N3().plans[n3PK(b.code)] = { ...(n3Plan(b.code) || { code: b.code, hist: [] }), ...patch }; p.hist = p.hist || []; p.hist.unshift([now().toISOString(), ADMIN.me.name, what, r]); logA('Scheduling', `${b.label} (${b.code})`, 'Class plan saved', '—', what, r); return p; }

/* ---------- Self-Paced: a planned number of classes (own sessions + joined shared classes) ---------- */
let n3SpClasses = code => s4bSessFor(code).filter(n3Live);
const n3SpState = b => { const p = n3Plan(b.code) || {}, n = n3SpClasses(b.code).length; if (!p.target) return { label: 'Not configured', tone: 'grey', n, p }; const st = n < p.target ? `Incomplete — ${n} of ${p.target} planned` : n > p.target ? `Over-allocated — ${n} planned, ${p.target} intended` : `${n} of ${p.target} planned`; return { label: p.complete && n === p.target ? 'Complete — ' + st : p.complete ? 'Needs review — ' + st : 'Draft — ' + st, tone: n === p.target ? (p.complete ? 'green' : 'amber') : 'red', n, p }; };
ACT.n3Target = el => {
  const b = n3Batch(el.dataset.b); if (!b) return; if (!n3CanConfig()) return n3Refuse(b, 'configure the class plan', 'Only the Super Admin, System Admin or Academic Admin can configure a class plan.');
  if (!n3Kinds(b).includes('limited')) { toast('The planned number of classes is for Self-Paced batches.', 'err'); return; }
  const p = n3Plan(b.code) || {};
  reasonDlg({ title: 'Planned number of classes — ' + b.code, ok: 'Save', label: 'Reason (required)', extra: `<div class="field"><label for="n3-c">Number of classes intended for this batch</label><input class="input num" type="number" min="1" step="1" id="n3-c" value="${p.target || ''}"><span class="hint">Set per batch — no fixed packages. Classes can be the batch's own or shared classes it joins.</span></div>`,
    onOk: r => { const n = +$('#n3-c').value; if (!(Number.isInteger(n) && n >= 1)) { fieldErr('#n3-c', 'Enter a whole number of classes'); return false; } n3SavePlan(b, { target: n, complete: false }, r, `Planned classes set to ${n}`); render(); toast('Saved. Add or join classes until the plan matches, then mark it complete.'); } });
};
ACT.n3Complete = el => {
  const b = n3Batch(el.dataset.b); if (!b) return; if (!n3CanConfig()) return n3Refuse(b, 'configure the class plan', 'Only the Super Admin, System Admin or Academic Admin can configure a class plan.');
  const st = n3SpState(b); if (!st.p.target || st.n !== st.p.target) { logA('Scheduling', `${b.label} (${b.code})`, 'Blocked: mark class plan complete', '—', '—', st.label); toast(`The plan doesn't match yet: ${st.n} planned, ${st.p.target || 'no number'} intended.`, 'err'); return; }
  reasonDlg({ title: 'Mark the class plan complete', ok: 'Mark complete', body: `<p class="small">${st.n} classes planned, as intended. This marks the plan only — it doesn't affect enrolment or learners' progress.</p>`, onOk: r => { n3SavePlan(b, { complete: true }, r, `Class plan marked complete (${st.n} classes)`); render(); } });
};
// Join an existing class of a Fully Assisted batch of the same programme (S4b sharing; explicit, never automatic)
const n3Joinable = b => s4bAllSess().filter(s => n3Live(s) && new Date(s.start) > now() && !s4bCodesOf(s).includes(b.code) && (() => { const o = n3Batch(s.batch); return o && S4B_LIVE(o) && n2ModeOf(o) === 'Fully Assisted' && s4PidOfTitle(o.course) === s4PidOfTitle(b.course); })()).sort((x, y) => new Date(x.start) - new Date(y.start));
ACT.n3Join = el => {
  const b = n3Batch(el.dataset.b); if (!b) return; if (!n3CanSchedule()) return n3Refuse(b, 'join a shared class', 'Joining a shared class is a scheduling action — Super Admin or Academic Admin.');
  const xs = n3Joinable(b); if (!xs.length) { toast('No upcoming Fully Assisted class of this programme to join.', 'info'); return; }
  reasonDlg({ title: 'Join a shared class — ' + b.code, ok: 'Join class', label: 'Reason (required)', extra: `<div class="field"><label for="n3-j">Class (Fully Assisted batches of ${esc(s4bProgShort(s4PidOfTitle(b.course)))})</label><select class="select" id="n3-j">${xs.map(s => `<option value="${s.id}">${fdt(s.start)} — ${esc(s.title)} (${esc(s.batch)} · ${esc(s.teacher)})</option>`).join('')}</select></div><p class="small">The class stays one session, organised by its own batch; ${esc(b.label)}'s ${plural(b.enrolled || 0, 'learner')} join it and it counts once toward this batch's plan.</p>`,
    onOk: r => { const s = s4bSessById($('#n3-j').value); if (!s || !n3Joinable(b).some(x => x.id === s.id)) { fieldErr('#n3-j', 'Choose an upcoming class'); return false; } const bad = s4bShareCheck(n3Batch(s.batch), (s.with || []).concat([b.code])); if (bad) { fieldErr('#n3-j', bad); return false; }
      const was = (s.with || []).join(', ') || '—'; s.with = (s.with || []).concat([b.code]); s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Batch joined', was, s.with.join(', '), r]); s4bSyncBatch(b.code);
      logA('Scheduling', `${s.title} (${s.batch})`, 'Session sharing changed', was, s.with.join(', '), r); n3Notify([b.code], 'Class added to your timetable', `${s.title} · ${fdt(s.start)} (shared with ${s.batch})`, true); render(); toast('Joined. It counts once toward this batch\'s plan.'); } });
};
// Remove a future class from the Self-Paced plan: unshare (another batch's class stays) or cancel the batch's own class (kept in history)
ACT.n3Remove = el => {
  const b = n3Batch(el.dataset.b), s = s4bSessById(el.dataset.s); if (!b || !s) return; if (!n3CanSchedule()) return n3Refuse(b, 'remove a class', 'Removing a class is a scheduling action — Super Admin or Academic Admin.');
  if (new Date(s.start) <= now()) { toast('A class that has started can\'t be removed — it stays in the batch\'s history.', 'err'); return; }
  const own = s.batch === b.code; if (own && (s.with || []).length) { toast('Other batches take part in this class — change its sharing or cancel it from the Schedule.', 'err'); return; }
  reasonDlg({ title: 'Remove from the class plan — ' + esc(s.title), ok: own ? 'Cancel this class' : 'Leave this shared class', danger: own, body: `<p class="small">${fdt(s.start)}. ${own ? 'This batch\'s own class is cancelled (kept in history).' : `The class stays on ${esc(s.batch)}'s timetable; only ${esc(b.code)} leaves it. Any attendance already recorded is kept.`}</p>`,
    onOk: r => {
      if (own) { s4bCancel(b, batchEvents(b).find(e => e.id === s.id), r); }
      else { const was = s.with.join(', '); s.with = s.with.filter(c => c !== b.code); s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Batch left', was, s.with.join(', ') || '—', r]); s4bWorldsOf(b.code).forEach(w => { w.events = w.events.filter(e => e.id !== s.id && e.id !== 'bs-' + s.id); }); logA('Scheduling', `${s.title} (${s.batch})`, 'Session sharing changed', was, s.with.join(', ') || '—', r); n3Notify([b.code], 'Class removed from your timetable', `${s.title} · ${fdt(s.start)}`, true); }
      render();
    } });
};

/* ---------- Screens: batch Schedule tab, batch header, Coordinator overview ---------- */
function n3Card(b) { return n3Kinds(b).map(k => n3CardOf(b, k)).join(''); }
function n3CardOf(b, k) {
  const cfg = n3CanConfig(), sch = n3CanSchedule(), p = n3Plan(b.code);
  if (!k) return '';
  if (k === 'weekly') { const w = p && p.weekly, occ = (p && p.occ) || {}, live = Object.values(occ).map(s4bSessById).filter(s => s && n3Live(s)).length;
    return `<section class="card n3-plan"><div class="row-b"><h2>Class plan — Fully Assisted (weekly)</h2>${cfg ? `<button class="btn btn-sm btn-primary" data-act="n3Weekly" data-b="${b.code}">${w ? 'Edit weekly plan' : 'Set up weekly plan'}</button>` : ''}</div>
      ${w ? `<p class="small"><strong>${esc(w.weekday)}s at ${esc(w.time)}</strong> · ${w.mins} min · ${esc(w.teacher)} · ${w.where === 'room' ? 'classroom' : 'Zoom (simulated)'} · ${fd(w.from + 'T09:00:00Z')} – ${fd(w.to + 'T09:00:00Z')} · ${chip(p.weeklyStatus === 'Saved' ? 'Scheduled' : 'Draft — not scheduled', p.weeklyStatus === 'Saved' ? 'green' : 'amber')}</p><p class="small">${plural(live, 'class', 'classes')} in the timetable from this plan.</p>` : `<p class="small n3-none">${ic('info', 14)} The structured class plan hasn't been configured for this batch. Its existing timetable is shown below.</p>`}
      ${cfg && !sch ? '<p class="xs muted">You can configure the plan; generating or cancelling sessions needs the Super Admin or Academic Admin.</p>' : ''}</section>`; }
  const st = n3SpState(b), cls = n3SpClasses(b.code).sort((x, y) => new Date(x.start) - new Date(y.start));
  return `<section class="card n3-plan"><div class="row-b"><h2>Class plan — Self-Paced (limited classes)</h2><div class="row">${cfg ? `<button class="btn btn-sm" data-act="n3Target" data-b="${b.code}">Set planned number</button>` : ''}${sch && S4B_LIVE(b) ? `<button class="btn btn-sm" data-act="addSession" data-b="${b.code}">Add a class</button><button class="btn btn-sm" data-act="n3Join" data-b="${b.code}">Join a shared class</button>` : ''}${cfg ? `<button class="btn btn-sm btn-primary" data-act="n3Complete" data-b="${b.code}">Mark plan complete</button>` : ''}</div></div>
    <p class="small n3-state">${chip(st.label, st.tone)}</p><p class="xs muted">The number is set per batch. Each class counts once, whether the batch's own or a shared class. The plan's status doesn't affect enrolment or learners' progress.</p>
    ${cls.length ? `<ul class="list small n3-cls">${cls.map(s => `<li class="li" data-sid="${s.id}"><div class="li-b"><strong>${esc(s.title)}</strong><span class="xs muted">${fdt(s.start)} · ${esc(s.teacher || '—')} · ${s.batch === b.code ? 'this batch\'s class' : 'shared — organised by ' + esc(s.batch)}</span></div>${sch && new Date(s.start) > now() ? `<button class="btn btn-sm btn-ghost" data-act="n3Remove" data-b="${b.code}" data-s="${s.id}">Remove</button>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">No classes yet.</p>'}
    ${!p || !p.target ? `<p class="small n3-none">${ic('info', 14)} The structured class plan hasn't been configured for this batch.</p>` : ''}</section>`;
}
const n3Summary = b => n3Kinds(b).map(k => { if (k === 'weekly') { const p = n3Plan(b.code); return p && p.weekly ? `Weekly: ${p.weekly.weekday}s ${p.weekly.time}${p.weeklyStatus === 'Saved' ? '' : ' (draft)'}` : 'Class plan not configured'; } return n3SpState(b).label; }).join(' · ');
const _bdN3 = batchDetail;
batchDetail = function (code, t) {
  let h = _bdN3.apply(this, arguments); const b = n3Batch(code); if (!b || !n3Kinds(b).length) return h;
  h = h.replace('<p class="small s4b-bdates">', `<p class="small n3-sum">Class plan: <strong>${esc(n3Summary(b))}</strong> <button class="linklike small" data-go="a-batches" data-id="${b.code}" data-tab="schedule">Open Schedule</button></p><p class="small s4b-bdates">`);
  if (t === 'schedule') h = h.replace('<section class="card"><div class="row-b"><h2>Schedule</h2>', n3Card(b) + '<section class="card"><div class="row-b"><h2>Schedule</h2>');
  return h;
};
const _cBatchN3 = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cBatchN3(p), b = p && p.id && n3Batch(p.id); if (!b || !n3Kinds(b).length) return h; return h.replace('<dd class="n2-mode">', `<dd class="n2-mode" data-n3="${esc(n3Summary(b))}">`).replace('</dl>', `<dt>Class plan</dt><dd class="n3-sum">${esc(n3Summary(b))}</dd></dl>`); };

/* ---------- Records ---------- */
UXC.push(['N3', 'NVQ class planning: weekly Fully Assisted classes, limited Self-Paced classes (SRS v1.3.2)', [
  'Fully Assisted: on the batch\'s Schedule tab, a weekly class plan (weekday, start time, length, teacher, Zoom or classroom, first and last date within the batch dates) generates one real class session per future date — each with its own session ID, so attendance registers (N4), sharing and conflicts work as for any session. Saving first shows a preview: classes added, updated, cancelled and kept, and any conflicts. Saving again never duplicates. Classes already held or attended, cancelled, or changed individually are never rewritten; dates dropped from the plan are cancelled and kept in history. Scheduling creates no attendance.',
  'Self-Paced: the batch\'s planned number of classes (any whole number, set per batch — no fixed 2 / 5 / 10 packages) and its classes — its own (Add a class) and shared classes of a Fully Assisted batch of the same programme that it explicitly joins. Each class counts once. The plan shows Not configured, Draft / Incomplete / Over-allocated, Complete or Needs review; "Mark plan complete" needs the count to match. The status never affects enrolment or progress. Removing a class leaves a shared class on its own batch\'s timetable (attendance kept) or cancels the batch\'s own class (kept in history).',
  'Permissions (client-confirmed document "Illumin - Roles and Permissions - Tick to Confirm (2)_Updated", System Administrator → Batches and Schedule: Create and edit batches ☒, Timetable: classes, deadlines, milestones ☒, Create Zoom sessions ☒): the Super Admin, System Admin and Academic Admin configure class plans and generate, add, join, edit, reschedule, cancel and resolve class sessions — in the plan and in the S4b scheduling console alike. Correction: the first N3 build (and S4b) had left the System Admin out of class scheduling. Finance, Coordinators and other roles are refused and logged; observation appointments, assessment, pricing, waivers and approvals are unchanged. Changes notify the Coordinator, teachers and learners once each.',
  'Existing batches: no plan is created for them and their timetables are unchanged; their Schedule tab says the structured class plan hasn\'t been configured. No session, register, deposit, instalment, deadline or observation changed.',
  'Implementation choices (provisional — not client-approved policies): recurring plans only generate future classes (no past classes are created); the Self-Paced planned number must be a whole number of at least 1.',
  'Not decided (no rule added): a maximum number of Self-Paced classes, any attendance-based progression gate, whether a class plan must be complete before enrolment or a batch starts, and fortnightly or other patterns.']]);
const _aIdxN3 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxN3(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Batch → Schedule → class plan (weekly / limited)', { act: 'aJump', t: 'a-batches.L3AC-NOV26-LEI.schedule' }, 'N3 — weekly Fully Assisted classes or a Self-Paced number of classes, as real sessions.')}`);
