/* Academic Coordinator portal — shell, data (shared STORE/ADMIN), screens, sync hooks. Routes are prefixed "c-". */
'use strict';

/* ---------- Users, state ---------- */
const COO_USERS = {
  A: { key: 'A', name: 'Dr Helen Carter', first: 'Helen', email: 'helen.carter@illumin-academy.example', roles: ['Academic Coordinator'], label: 'Coordinator A — 3 batches' },
  B: { key: 'B', name: 'Michael Osei', first: 'Michael', email: 'michael.osei@illumin-academy.example', roles: ['Academic Coordinator'], label: 'Coordinator B — 1 batch' },
  C: { key: 'C', name: 'Dr Helen Carter', first: 'Helen', email: 'helen.carter@illumin-academy.example', roles: ['Academic Coordinator', 'Teacher'], label: 'Multi-role: Coordinator + Teacher', multi: true },
};
S.coo = { v: 'A', mode: 'D2', edge: 'none', ctx: 'Academic Coordinator', batch: 'all', dirty: false, failNext: false, seen: {} };
const CME = () => COO_USERS[S.coo.v];
const ACAD_ADMIN = 'Rachel Hughes (Academic Admin)', SYS_ADMIN = 'Owen Price (System Administrator)';

/* ---------- Shared-store patches (additive) ---------- */
const NEW_LEARNERS = ['Rhys Morgan', 'Olivia Shaw', 'Tariq Khan', 'Bethany Cole', 'Samuel Adeyemi', 'Lauren Fisher', 'Kieran Doyle', 'Nadia Begum'];
function cooPatchAdmin() {
  if (!ADMIN || ADMIN._cooPatched) return; ADMIN._cooPatched = true;
  if (!ADMIN.staff.find(s => s.id === 'ST-017')) ADMIN.staff.push({ id: 'ST-017', name: 'Michael Osei', email: 'michael.osei@illumin-academy.example', roles: ['Academic Coordinator'], status: 'Active', tfa: 'Not required', last: D(-1, '09:10'), alloc: 1, mobile: '+44 7700 900617', quals: 'Level 5 Leadership', reg: '', tz: 'Europe/London' }, { id: 'ST-018', name: 'Laura Kemp', email: 'laura.kemp@illumin-academy.example', roles: ['Academic Coordinator'], status: 'Active', tfa: 'Not required', last: D(-6, '11:00'), alloc: 4, mobile: '+44 7700 900618', quals: '', reg: '', tz: 'Europe/London' });
  NEW_LEARNERS.forEach((n, i) => { const id = 'IA-L-' + (33100 + i * 7); if (!ADMIN.learners.find(l => l.id === id)) { const p = n.toLowerCase().split(' '); ADMIN.learners.push({ id, name: n, email: `${p[0]}.${p[1]}@uk.example`, mobile: '+44 7700 900' + (400 + i), agency: i % 3 === 0 ? 'BrightCare Staffing Ltd (demo)' : null, courses: ['Level 2 Diploma in Care (England)'], acct: 'Active', rec: 'Active', region: 'UK', last: D(-2 - i), flags: [], dob: `${3 + i} Feb 199${i}`, address: `${10 + i} Sample Road, Croydon`, postcode: 'ZZ99 3AA', country: 'United Kingdom', joined: fd(D(-20 - i)), referral: 'Self-registration', cur: 'GBP' }); } });
  const B = c => ADMIN.batches.find(b => b.code === c);
  if (!B('L2DC-JAN27')) ADMIN.batches.push({ code: 'L2DC-JAN27', label: 'Croydon Cohort 5', course: 'Level 2 Diploma in Care (England)', start: D(95), end: D(460), cap: 16, enrolled: 12, mode: 'Classroom', coord: 'Dr Helen Carter', teachers: ['Tom Whitfield'], assessors: ['James Pryce'], status: 'Planned', wait: 0, roster: [] });
  const set = (c, coord, hist) => { const b = B(c); if (b) { b.coord = coord; b.coordHistory = hist; } };
  set('L3AC-JAN26', 'Dr Helen Carter', [['Laura Kemp', D(-265), D(-120)], ['Dr Helen Carter', D(-120), null]]);
  set('L3AC-NOV26', 'Dr Helen Carter', [['Dr Helen Carter', D(-30), null]]);
  set('L2DC-JAN27', 'Dr Helen Carter', [['Dr Helen Carter', D(-10), null]]);
  set('L2DC-MAR26', 'Michael Osei', [['Dr Helen Carter', D(-214), D(-150)], ['Michael Osei', D(-150), null]]);
  ['L3AC-NOV26-LEI', 'L2DC-SEP25', 'L5LM-JAN25', 'L3AC-DEC26-AUH', 'L3AC-OCT26-ONL'].forEach(c => set(c, 'Laura Kemp', [['Laura Kemp', D(-400), null]]));
  buildCohorts();
}
const _buildAdmin = buildAdmin;
buildAdmin = function (av) { const r = _buildAdmin(av); cooPatchAdmin(); return r; };
const _initStore = initStore;
initStore = function () {
  _initStore();
  STORE.coo = { fb: [], threads: [], notifs: [], anns: [], changes: [], drafts: {}, released: {} };
  const C = STORE.worlds.C, a1 = C.assignments.find(a => a.id === 'a1'), a5 = C.assignments.find(a => a.id === 'a5');
  a1.coordAll = [{ by: 'Laura Kemp', at: D(-148, '10:00'), text: 'Great start to the programme, Aisha. Keep using real examples from Willowbrook — they make your answers stand out.', scope: 'Overall submission' }];
  a5.coordAll = [a5.coord];
  seedCoo();
};

/* ---------- Cohorts (12–20 learners per active batch) ---------- */
const ASG_PATTERN = [
  ['Completed', 'Completed', 'Not Started', 'Submitted', 'Feedback Received', 'Not Started', 'Completed'],
  ['Completed', 'Resubmission Required', 'Not Started', 'Submitted', 'Feedback Received', 'Submitted', 'Completed'],
  ['Completed', 'Feedback Received', 'Not Started', 'Not Started', 'Completed', 'Not Started', 'Resubmission Required'],
  ['Completed', 'Completed', 'Not Started', 'Submitted', 'Submitted', 'Completed'],
  ['Feedback Received', 'Submitted', 'Not Started', 'Not Started', 'Not Started', 'Not Started', 'Submitted'],
];
function hashN(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function buildCohorts() {
  const L = id => ADMIN.learners.find(l => l.id === id) || ADMIN.learners[0];
  const byIdx = idx => idx.map(i => ADMIN.learners[i]).filter(Boolean);
  const nl = NEW_LEARNERS.map((n, i) => L('IA-L-' + (33100 + i * 7)));
  const mk = (b, list, opts = {}) => {
    b.coh = list.map((l, k) => {
      const seed = hashN(l.id + b.code), started = ['In Progress', 'Completed'].includes(b.status);
      const flags = [];
      let status = b.status === 'Completed' ? 'Completed' : 'Active';
      if (opts.disc === k) { status = 'Discontinued'; }
      if (started && opts.paused === k) flags.push('Access paused');
      const last = opts.stalled && opts.stalled.includes(k) ? 26 + k : seed % 9;
      if (last > 21 && status === 'Active') flags.push('Stalled');
      const progress = started ? (b.status === 'Completed' ? 100 : 15 + seed % 70) : 0;
      if (started && b.status !== 'Completed' && (progress < 30 || (opts.risk || []).includes(k))) flags.push('At risk');
      if (started && b.status !== 'Completed' && opts.late && opts.late.includes(k)) flags.push('Projected late');
      const pat = ASG_PATTERN[seed % 5];
      const subs = started ? Object.fromEntries(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].map((a, j) => [a, b.status === 'Completed' ? 'Completed' : pat[j]])) : {};
      const pd = started && seed % 3 === 0 ? ['a2'] : [];
      if (!l._enr || !l._enr.some(e => e.type === 'NVQ / RQF')) l._enr = [{ id: 'x0', title: b.course, type: 'NVQ / RQF', status, enrolled: b.start, start: b.start, end: b.end, progress, sponsor: l.agency, version: 'Version 2' }].concat((l._enr || []).filter(e => e.type !== 'NVQ / RQF'));
      if (!flags.includes('Stalled') && !flags.includes('At risk') && !flags.includes('Projected late') && started && b.status !== 'Completed') flags.push(subs.a6 === 'Not Started' ? 'Overdue' : 'On track');
      return { lid: l.id, flags, last: D(-last), att: started ? 62 + seed % 37 : null, subs, pd, seed };
    });
  };
  const b1 = ADMIN.batches.find(b => b.code === 'L3AC-JAN26'), b2 = ADMIN.batches.find(b => b.code === 'L3AC-NOV26'), b3 = ADMIN.batches.find(b => b.code === 'L2DC-JAN27'), b4 = ADMIN.batches.find(b => b.code === 'L2DC-MAR26'), b5 = ADMIN.batches.find(b => b.code === 'L2DC-SEP25');
  mk(b1, byIdx([0, 1, 2, 3, 5, 6, 7, 8, 9, 11, 13, 14, 15]), { disc: 12, paused: 2, stalled: [4, 9], risk: [7], late: [4, 7] });
  b1.coh.unshift({ lid: 'IA-L-18022', v: 'C', flags: ['At risk'], last: D(0, '07:55'), att: 74, demo: true });
  mk(b2, byIdx([19, 20, 22, 23, 24, 25, 26, 27, 28, 21, 18, 12]));
  mk(b3, nl.concat(byIdx([4, 10, 17, 29])));
  mk(b4, byIdx([16, 10, 17, 29]).concat(nl.slice(0, 6)), { stalled: [3], risk: [1] });
  b4.coh.unshift({ lid: 'IA-L-24560', v: 'D', flags: ['On track'], last: D(-1), att: 91, demo: true });
  mk(b5, byIdx([4, 12, 17, 29]).concat(nl.slice(2, 8)));
}
function seedCoo() {
  const T = STORE.coo;
  T.threads = [
    { id: 'CT-1', subject: 'Unit 302 marking turnaround', with: ['Sarah Okonkwo (Assessor)'], tag: '', msgs: [['Dr Helen Carter', D(-2, '09:00'), 'Six Assignment 4 submissions are 5+ days old — can you give an ETA?'], ['Sarah Okonkwo', D(-1, '16:20'), 'Aiming to return them all by Wednesday.']], seen: 2 },
    { id: 'CT-2', subject: 'Request change: Unit 305 class on ' + fds(D(4)), with: [ACAD_ADMIN], tag: 'Request change', msgs: [['Dr Helen Carter', D(-3, '12:00'), 'Could the Thursday classroom session move to 18:00? Most learners finish shifts at 17:30.'], ['Rachel Hughes', D(-1, '10:00'), 'Done — moved to 18:00 and learners notified.']], seen: 1 },
    { id: 'CT-3', subject: 'Observation scheduling — Dubai cohort', with: ['Omar Siddiqui (Assessor)'], tag: '', msgs: [['Omar Siddiqui', D(-4, '07:00'), 'Workplace permissions are slow for three Dubai learners.']], seen: 1 },
    { id: 'CT-4', subject: 'Attendance concern — Jack Thompson', with: ['Jack Thompson (Learner)'], tag: '', learner: true, msgs: [['Dr Helen Carter', D(-6, '10:00'), 'Hi Jack, I noticed you missed the last two classes. Is everything OK?'], ['Jack Thompson', D(-5, '21:00'), 'Sorry — shift changes. I\'ll catch up with the recordings.']], seen: 2 },
    { id: 'CT-5', subject: 'Fee question forwarded', with: [SYS_ADMIN], tag: 'Forwarded', msgs: [['Dr Helen Carter', D(-8, '11:00'), 'Forwarding a learner\'s fee question (Ethan Parker) — out of my scope.']], seen: 1 },
    { id: 'CT-6', subject: 'Croydon Cohort 4 roster', with: ['Tom Whitfield (Teacher)'], tag: '', owner: 'Michael Osei', msgs: [['Tom Whitfield', D(-1, '12:00'), 'Two learners asked about the January classroom days.']], seen: 0 },
  ];
  T.anns = [
    { id: 'CA-1', title: 'Bring your reflective log to Thursday\'s class', aud: 'Leicester Cohort 7', ch: ['In-app', 'Email'], status: 'Published', at: D(-5), by: 'Dr Helen Carter' },
    { id: 'CA-2', title: 'Welcome to Dubai Cohort 2', aud: 'Dubai Cohort 2', ch: ['In-app', 'Email', 'SMS'], status: 'Scheduled', at: D(30), by: 'Dr Helen Carter' },
    { id: 'CA-3', title: 'Mid-point review reminder', aud: 'Leicester Cohort 7', ch: ['In-app'], status: 'Draft', at: D(0), by: 'Dr Helen Carter' },
    { id: 'CA-4', title: 'Summer timetable', aud: 'Leicester Cohort 7', ch: ['Email'], status: 'Expired', at: D(-90), by: 'Dr Helen Carter' },
    { id: 'CA-5', title: 'Class moved (sent in error)', aud: 'Leicester Cohort 7', ch: ['SMS'], status: 'Withdrawn', at: D(-20), by: 'Dr Helen Carter' },
    { id: 'CA-6', title: 'Croydon Cohort 4 — PD week', aud: 'Croydon Cohort 4', ch: ['In-app'], status: 'Published', at: D(-3), by: 'Michael Osei' },
  ];
  const N = (t, b, d, go, unread) => ({ id: 'cn' + T.notifs.length, t, b, at: d, go, unread });
  T.notifs = [
    N('Assigned as Coordinator', 'You are now the Academic Coordinator for Croydon Cohort 5 (L2DC-JAN27).', D(-10), 'c-batches.L2DC-JAN27', false),
    N('Batch lifecycle changed', 'Dubai Cohort 2 is now Open.', D(-30), 'c-batches.L3AC-NOV26', false),
    N('Learner waitlisted for my batch', 'Dubai Cohort 2 is full — 3 learners on the waitlist.', D(-4), 'c-batches.L3AC-NOV26', true),
    N('Learner discontinued in my batch', 'Ben Carter — Leicester Cohort 7.', D(-12), 'c-learners', false),
    N('Schedule changed', 'Unit 305 classroom session moved to 18:00.', D(-1, '10:00'), 'c-timeline', true),
    N('New submission in my batch', 'Aisha Rahman submitted Assignment 4.', D(-1, '18:43'), 'c-submissions', true),
    N('Submission awaiting marking > 5 days', '6 submissions for Assignment 4 in Leicester Cohort 7.', D(0, '06:00'), 'c-submissions', true),
    N('Learner stalled', 'Amelia Price — no activity for 26 days.', D(-1, '06:00'), 'c-learners', false),
    N('Learner projected late', 'Amelia Price and Isla Morgan are projected to finish after the programme end date.', D(-2), 'c-progress', false),
    N('Learner reply to my message', 'Jack Thompson replied.', D(-5, '21:00'), 'c-messages.CT-4', false),
    N('Observation confirmed', 'Aisha Rahman — ' + fdt(D(3, '13:00')) + '.', D(-9), 'c-obs', false),
    N('Announcement published', '"Bring your reflective log" sent to Leicester Cohort 7.', D(-5), 'c-announcements', false),
    N('Request change answered', 'Rachel Hughes moved the Unit 305 session.', D(-1, '10:00'), 'c-messages.CT-2', false),
  ];
  T.changes = [['Rachel Hughes', D(-1, '10:00'), 'Session — Unit 305 classroom', fdt(D(4, '16:00')), fdt(D(4, '17:00')), 'Coordinator request'], ['Sarah Okonkwo', D(-2, '11:32'), 'Assignment 3 deadline (extension)', fdt(D(5, '21:59')), fdt(D(9, '21:59')), 'Brief updated'], ['Owen Price', D(-40), 'Resource release — COSHH video', 'Immediate', fd(D(12)), 'Aligned with Module 2']];
}

/* ---------- Scope helpers ---------- */
function myBatches() {
  if (S.coo.edge === 'noBatches') return [];
  const me = CME().name;
  return ADMIN.batches.filter(b => b.coord === me || (S.coo.edge === 'completed' && b.code === 'L2DC-SEP25' && me === 'Dr Helen Carter'));
}
function scopeBatches() { const m = myBatches(); return S.coo.batch === 'all' ? m : m.filter(b => b.code === S.coo.batch); }
function cohLearner(e, b) {
  if (e.v) { const w = STORE.worlds[e.v], m = w.me, crit = withW(e.v, () => allCrit()); return { lid: m.id, v: e.v, name: m.first + ' ' + m.last, batch: b, status: w.nvq.status === 'Discontinued' ? 'Discontinued' : 'Active', agency: m.sponsor, progress: pctOf(crit), five: countStates(crit), last: e.last, att: e.att, flags: e.flags, email: m.email, mobile: m.mobile, outstanding: w.assignments.filter(a => ['Not Started', 'Resubmission Required'].includes(a.status)).length }; }
  const l = ADMIN.learners.find(x => x.id === e.lid); const en = (l._enr || [])[0] || {};
  const st = en.status || 'Active', p = en.progress ?? 0;
  const five = b.status === 'Completed' ? { 'Not Started': 0, 'In Progress': 0, 'Action Required': 0, 'Added to PD': 0, 'Achieved': 24 } : p ? { 'Not Started': Math.round((100 - p) / 6), 'In Progress': 3 + e.seed % 3, 'Action Required': e.seed % 3, 'Added to PD': e.pd.length, 'Achieved': Math.round(p / 4) } : { 'Not Started': 24, 'In Progress': 0, 'Action Required': 0, 'Added to PD': 0, 'Achieved': 0 };
  return { lid: l.id, name: l.name, batch: b, status: st, agency: l.agency, progress: p, five, last: e.last, att: e.att, flags: st === 'Discontinued' ? [] : e.flags.filter(f => !(f === 'Access paused' && false)), email: l.email, mobile: l.mobile, outstanding: Object.values(e.subs).filter(s => ['Not Started', 'Resubmission Required'].includes(s)).length, coh: e };
}
function myLearners(all) { return (all ? myBatches() : scopeBatches()).flatMap(b => (b.coh || []).map(e => cohLearner(e, b)).concat((b.roster || []).map(r => ({ lid: r[1], name: r[0], batch: b, status: 'Active', agency: r[2] === 'Self-funded' ? null : r[2], progress: 0, five: { 'Not Started': 24 }, last: now().toISOString(), att: null, flags: ['On track'], outstanding: 0, coh: { subs: {}, pd: [], seed: 1, lid: r[1] }, added: true })))); }
const BASE_ASGS = () => STORE.worlds.C.assignments;
const MARKER = b => (b.alloc && b.alloc.asg) || (b.assessors || ['Sarah Okonkwo'])[0]; // CH-17: the batch's assignment assessor
function mySubmissions(all) {
  const out = [];
  myLearners(all).forEach(L => {
    if (L.v) STORE.worlds[L.v].assignments.forEach(a => { if (a.status !== 'Not Started' || a.qs.some(q => q.rounds.length)) out.push(subRow(L, a, a.status, a)); else out.push(subRow(L, a, 'Not Started', a)); });
    else BASE_ASGS().forEach(a => { const st = L.coh.subs[a.id]; if (st) out.push(subRow(L, a, st, null)); });
  });
  return out;
}
function subRow(L, base, status, live) {
  const at = live ? live.submittedAt : status === 'Not Started' ? null : D(-(L.coh ? L.coh.seed % 12 : 2) - 1, '19:30');
  const round = live ? live.round : status === 'Resubmission Required' ? 'Resub 1' : (L.coh && L.coh.seed % 4 === 0 && status === 'Completed') ? 'Resub 1' : 'Sub 1';
  const key = L.lid + '~' + base.id;
  const coo = live ? (live.coordAll || (live.coord ? [live.coord] : [])) : STORE.coo.fb.filter(f => f.key === key);
  const pd = live ? live.qs.some(q => q.state === 'pd') : (L.coh && L.coh.pd.includes(base.id));
  const waiting = ['Submitted'].includes(status) && at ? Math.max(0, -daysTo(at)) : null;
  return { key, L, a: base, live, status, at, round, marker: MARKER(L.batch), waiting, coo, pd, mine: coo.some(c => c.by === CME().name) };
}
function synthAsg(row) {
  if (row.live) return row.live;
  const b = row.a, st = row.status, ans = k => `<p>${['In my role I always check the care plan first and speak to the person about what matters to them.', 'I explained this using an example from my last shift, where I supported a resident to choose their own clothes.', 'Legislation such as the Care Act 2014 guides what I do, and I report concerns to my senior straight away.'][k % 3]}</p>`;
  const rag = st === 'Resubmission Required' ? (k => k === 1 ? 'R' : 'G') : st === 'Feedback Received' ? (k => k === 2 ? 'A' : 'G') : () => 'G';
  const fbOn = ['Feedback Received', 'Resubmission Required', 'Completed'].includes(st);
  return { ...b, status: st, round: row.round, submittedAt: row.at, coordAll: row.coo, overall: fbOn ? 'Feedback recorded by ' + row.marker + '.' : null, assessor: row.marker, timeline: [['Submitted', row.at]].concat(fbOn ? [[st === 'Completed' ? 'Completed' : 'Feedback Received', D(-1)]] : []),
    qs: b.qs.map((q, k) => ({ ...q, rounds: st === 'Not Started' ? [] : [{ at: row.at, html: ans(k) }], fb: fbOn ? [{ rag: rag(k), text: rag(k) === 'G' ? 'Met — clear and relevant.' : rag(k) === 'A' ? 'Partially met — add a workplace example.' : 'Not met — explain why this matters.', by: row.marker, at: D(-1) }] : [], state: row.pd && k === 1 ? 'pd' : fbOn ? (rag(k) === 'R' ? 'rework' : 'met') : 'open', pdReason: row.pd && k === 1 ? 'Will be covered in the Professional Discussion.' : q.pdReason })) };
}
function denied(what) {
  ADMIN.security.unshift({ id: 'SE-' + (900 + ADMIN.security.length), sev: 'Low', at: now().toISOString(), type: 'Out-of-scope access', detail: `Academic Coordinator ${CME().name} tried to open ${what}`, reviewed: false });
  return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have access to this record</h1><p class="muted">You can only see learners and submissions in your own batches. This attempt has been logged.</p><button class="btn btn-primary" data-go="c-dashboard">Go to dashboard</button></div>`;
}
const roBatch = b => ['Completed', 'Archived'].includes(b.status);
function lockNote(t = 'Marking and verification are done by the Teacher/Assessor') { return `<span class="lock-note" title="${t}" tabindex="0">${ic('lock', 13)} <span class="xs muted">${t}</span></span>`; }
function cooLog(module, entity, action, before, after, reason) { ADMIN.audit.unshift({ id: 'AU-' + (9500 + ADMIN.audit.length), actor: CME().name, role: 'Academic Coordinator', at: now().toISOString(), module, entity, action, before: before ?? '—', after: after ?? '—', reason: reason || '', ip: '86.12.44.77' }); }

/* ---------- Derived notifications (from admin activity) ---------- */
function cooNotifs() {
  const me = CME().name, mine = myBatches().map(b => b.code), names = myLearners(true).map(l => l.name);
  const der = [];
  ADMIN.audit.forEach(a => {
    if (a.actor === me) return;
    if (a.action === 'Academic Coordinator changed' && (a.after === me || a.before === me)) der.push({ id: 'd' + a.id, t: a.after === me ? 'Assigned as Coordinator' : 'Removed as Coordinator', b: a.entity, at: a.at, go: 'c-batches', unread: !S.coo.seen[a.id] });
    else if (a.module === 'Assignments' && a.action === 'Deadline extension' && names.some(n => a.entity.startsWith(n))) der.push({ id: 'd' + a.id, t: 'Deadline extension granted in my batch', b: `${a.entity}: ${a.before} → ${a.after}`, at: a.at, go: 'c-timeline', unread: !S.coo.seen[a.id] });
    else if (a.module === 'Batches' && mine.some(c => a.entity.includes(c))) der.push({ id: 'd' + a.id, t: a.action === 'Batch cancelled' ? 'Batch cancelled' : a.action.includes('Learner added') ? 'Learner added to my batch' : 'Batch updated', b: `${a.entity}: ${a.after}`, at: a.at, go: 'c-batches', unread: !S.coo.seen[a.id] });
    else if (a.module === 'Learners' && /Enrolment (discontinued|reactivated)/.test(a.action) && names.some(n => a.entity.includes(n) || myLearners(true).some(l => a.entity.startsWith(l.lid)))) der.push({ id: 'd' + a.id, t: 'Learner ' + (a.action.includes('discontinued') ? 'discontinued' : 'reactivated') + ' in my batch', b: a.entity, at: a.at, go: 'c-learners', unread: !S.coo.seen[a.id] });
    else if (a.module === 'Scheduling' && a.action === 'Session added') der.push({ id: 'd' + a.id, t: 'Schedule changed', b: fxClient() ? 'New session: ' + a.entity : 'New session for Leicester Cohort 7', at: a.at, go: 'c-timeline', unread: !S.coo.seen[a.id] });
  });
  return der.concat(S.coo.v === 'B' ? STORE.coo.notifs.slice(4, 8) : STORE.coo.notifs).sort((x, y) => new Date(y.at) - new Date(x.at));
}
function cooThreads() {
  const me = CME().name;
  const staffT = STORE.coo.threads.filter(t => (t.owner || 'Dr Helen Carter') === me);
  const lt = [];
  ['C', 'D'].forEach(v => STORE.worlds[v].threads.filter(t => t.coo === me).forEach(t => lt.push({ id: 'LT-' + v + '-' + t.id, v, subject: t.subject, with: [VNAME(v) + ' (Learner)'], tag: '', learner: true, lthread: t, msgs: t.msgs.map(m => [m.me ? VNAME(v) : m.from, m.at, m.text]), seen: t._cooSeen || 0 })));
  return lt.concat(staffT);
}
const unreadT = t => t.msgs.length > (t.seen || 0) && t.msgs[t.msgs.length - 1][0] !== CME().name;

/* ---------- Shell ---------- */
const CNAV = [['c-dashboard', 'Dashboard', 'home'], ['c-batches', 'My Batches', 'users'], ['c-learners', 'Learners', 'user'], ['c-submissions', 'Submissions & Feedback', 'edit'], ['c-progress', 'Progress & Competency', 'chart'], ['c-timeline', 'Timeline & Calendar', 'cal'], ['c-modules', 'Modules & Content', 'layers'], ['c-obs', 'Observations & PD', 'eye'], ['c-attendance', 'Attendance', 'checksq'], ['c-messages', 'Messages', 'msg'], ['c-announcements', 'Announcements', 'pin'], ['c-notifications', 'Notifications', 'bell'], ['c-reports', 'Reports', 'chart'], ['c-profile', 'My Profile', 'user']];
function cooRender() {
  if (!S.route.startsWith('c-')) S.route = 'c-dashboard';
  const sec = { 'c-learner': 'c-learners', 'c-sub': 'c-submissions' }[S.route] || S.route;
  const unreadM = cooThreads().filter(unreadT).length, unreadN = cooNotifs().filter(n => n.unread).length, mb = myBatches();
  const sel = mb.find(b => b.code === S.coo.batch);
  $('#app').innerHTML = `<div class="adm coo"><button class="skip btn btn-primary" data-act="skip">Skip to main content</button>
  <header class="hdr adm-hdr"><button class="icon-btn adm-menu-btn" data-act="aDrawer" aria-label="Menu">${ic('menu')}</button>
    <a class="logo" href="#c-dashboard" data-go="c-dashboard">${LOGO}<div><b>Illumin Academy</b><span>Academic Coordinator</span></div></a>
    <div class="field" style="min-width:0"><label class="sr" for="cbatch">Batch in scope</label><select class="select dt-sel" id="cbatch" data-onchange="cooBatch"><option value="all">All my batches (${mb.length})</option>${mb.map(b => `<option value="${b.code}" ${S.coo.batch === b.code ? 'selected' : ''}>${esc(b.label)} — ${b.code}</option>`).join('')}</select></div>
    <div class="hdr-search adm-search" role="search">${ic('search', 16)}<label class="sr" for="csearch">Search learners and submissions in my batches</label><input id="csearch" type="search" placeholder="Search my learners and submissions…" value="${esc(S.coo.q || '')}" data-oninput="cooSearch" autocomplete="off">${S.coo.q ? cooSearchRes(S.coo.q) : ''}</div>
    <div class="hdr-right">
      ${CME().multi ? `<div class="role-switch"><label for="cctx">Role</label><select id="cctx" data-onchange="cooCtx"><option ${S.coo.ctx === 'Academic Coordinator' ? 'selected' : ''}>Academic Coordinator</option><option ${S.coo.ctx === 'Teacher' ? 'selected' : ''}>Teacher</option></select></div>` : `<span class="role-ctx hide-sm">Academic Coordinator</span>`}
      <button class="icon-btn" data-go="c-notifications" aria-label="Notifications, ${unreadN} unread">${ic('bell', 20)}${unreadN ? `<span class="badge">${unreadN}</span>` : ''}</button>
      <button class="icon-btn" data-go="c-messages" aria-label="Messages, ${unreadM} unread">${ic('msg', 20)}${unreadM ? `<span class="badge">${unreadM}</span>` : ''}</button>
      <button class="avatar-btn" data-act="menu" data-m="cavatar" aria-label="Account menu"><span class="avatar">${CME().name.split(' ').slice(-2).map(x => x[0]).join('')}</span></button></div>
    ${S.menu === 'cavatar' ? `<div class="dd" style="width:260px" role="menu"><div class="dd-h"><div><div class="strong">${esc(CME().name)}</div><div class="xs muted">${esc(CME().email)}</div></div></div><ul class="menu-list"><li><button data-go="c-profile">${ic('user')}My profile</button></li><li><button data-act="changePw">${ic('key')}Change password</button></li><li><button data-act="logout">${ic('logout')}Sign out</button></li></ul></div>` : ''}
  </header>
  <div class="adm-frame"><nav class="adm-side ${S.aDrawer ? 'open' : ''}" aria-label="Coordinator navigation"><ul style="list-style:none;margin:0;padding:6px 0;display:grid;gap:1px">${CNAV.map(([r, l, i]) => `<li><a href="#${r}" data-go="${r}" ${sec === r ? 'aria-current="page"' : ''}>${ic(i, 16)}<span>${l}</span>${r === 'c-messages' && unreadM ? `<span class="cnt">${unreadM}</span>` : ''}${r === 'c-release' && typeof relCount === 'function' && relCount() ? `<span class="cnt" aria-label="${relCount()} waiting">${relCount()}</span>` : ''}</a></li>`).join('')}</ul><div style="padding:8px"><a href="#c-index" data-go="c-index" class="small">Coordinator screen index</a></div></nav>${S.aDrawer ? '<div class="scrim adm-scrim" data-act="aDrawer"></div>' : ''}
  <main id="main" class="main" tabindex="-1">${S.offline ? banner('grey', 'wifioff', '<strong>You\'re offline.</strong> Your feedback drafts are kept on this device.', '<button class="btn btn-sm" data-act="toggleOffline">Retry now</button>') : ''}${sel && roBatch(sel) ? banner('grey', 'lock', `<strong>This batch is read-only.</strong> ${esc(sel.label)} is ${sel.status}.`) : ''}
  <div class="page adm-page">${cooPage()}</div><footer class="foot"><span>© 2026 Illumin Academy · Academic Coordinator</span><span class="spacer"></span><span>Times in ${tzl()} (Europe/London)</span></footer></main></div></div>`;
}
function cooPage() {
  if (S.serverError) return errorPage();
  if (S.coo.ctx === 'Teacher') return `<div class="lockpage"><div class="lock-ic">${ic('users', 30)}</div><h1>Teacher portal — not yet built</h1><p class="muted">Switch the role back to Academic Coordinator in the header to continue.</p><button class="btn btn-primary" data-act="cooCtxBack">Switch to Academic Coordinator</button></div>`;
  if (!myBatches().length && !['c-profile', 'c-notifications', 'c-messages', 'c-index'].includes(S.route)) return `<div class="lockpage"><div class="lock-ic">${ic('users', 30)}</div><h1>You haven't been assigned to a batch yet</h1><p class="muted">Contact the Academy administration. Once a batch is assigned to you, it will appear here.</p><button class="btn" data-go="c-messages">Message the Academy</button></div>`;
  const fn = SCREENS[S.route]; if (!fn) return notFound().replace(/data-go="dashboard"/, 'data-go="c-dashboard"').replace(/data-go="index"/, 'data-go="c-index"');
  try { return fn(S.params); } catch (e) { console.error(e); return errorPage(); }
}
INP.cooBatch = el => { S.coo.batch = el.value; render(); };
INP.cooCtx = el => { S.coo.ctx = el.value; render(); toast(`Role context: ${el.value}`, 'info'); };
ACT.cooCtxBack = () => { S.coo.ctx = 'Academic Coordinator'; render(); };
INP.cooSearch = el => { S.coo.q = el.value; render(); const i = $('#csearch'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
function cooSearchRes(q) {
  q = q.toLowerCase(); const r = [];
  myLearners(true).forEach(l => { if ((l.name + l.lid).toLowerCase().includes(q)) r.push(['Learner', l.name + ' · ' + l.batch.label, 'c-learner.' + l.lid]); });
  mySubmissions(true).forEach(s => { if (s.at && (s.L.name + ' ' + s.a.title).toLowerCase().includes(q)) r.push(['Submission', s.L.name + ' · ' + s.a.title, 'c-sub.' + s.key]); });
  return `<div class="dd adm-sr" style="left:0;right:auto;top:42px;width:min(520px,90vw)"><ul class="dd-list">${r.slice(0, 10).map(x => `<li><button class="dd-item" data-act="goTok" data-t="${x[2]}"><span class="typebadge">${x[0]}</span><span class="small">${esc(x[1])}</span></button></li>`).join('') || '<li class="dd-item small muted">No matches in your batches</li>'}</ul></div>`;
}
/* Render & demo routing */
const _render = render;
render = function () { if (S.signedIn && S.portal === 'coord') { cooRender(); renderDemo(); afterRender(); return; } _render(); };
const _renderDemo = renderDemo;
renderDemo = function () { if (S.portal === 'coord') { $('#demo-root').innerHTML = `<button class="demo-fab" data-act="demoToggle" aria-expanded="${S.demoOpen}">${ic('target', 16)}<span class="fab-l">Demo controls</span></button>${S.demoOpen ? cooDemoPanel() : ''}`; return; } _renderDemo(); };
const _go2 = go;
go = function (route, params) {
  if (S.portal === 'coord') { S.coo.q = ''; S.aDrawer = false; if (S.coo.dirty && !S.coo.leaving) { S.coo.pending = [route, params]; openModal({ title: 'Leave without posting your feedback?', body: `<p>You have coordinator feedback that hasn't been posted. It's saved as a draft on this submission, so you can come back to it.</p>`, actions: [{ label: 'Leave (keep draft)', cls: 'btn', fn: () => { S.coo.dirty = false; S.coo.leaving = true; setTimeout(() => { _go2(...S.coo.pending); S.coo.leaving = false; }, 0); } }, { label: 'Stay and finish', cls: 'btn-primary' }] }); return; } }
  return _go2(route, params);
};
const _rsh = roleSwitchHtml;
roleSwitchHtml = function () { return _rsh().replace('<button aria-pressed="' + (S.portal === 'admin') + '" data-act="switchRole" data-r="admin">Super Admin</button>', `<button aria-pressed="${S.portal === 'admin'}" data-act="switchRole" data-r="admin">Super Admin</button><button aria-pressed="${S.portal === 'coord'}" data-act="switchRole" data-r="coord">Academic Coordinator</button>`).replace('aria-pressed="true" data-act="switchRole" data-r="learner"', S.portal === 'coord' ? 'aria-pressed="false" data-act="switchRole" data-r="learner"' : 'aria-pressed="true" data-act="switchRole" data-r="learner"'); };
const _switchRole = ACT.switchRole;
ACT.switchRole = el => { if (el.dataset.r === 'coord') { S.portal = 'coord'; S.signedIn = true; S.serverError = false; S.coo.ctx = 'Academic Coordinator'; go('c-dashboard'); toast(`Viewing as ${CME().name} (Academic Coordinator)`, 'info'); } else { S.coo.dirty = false; _switchRole(el); } };
const COO_EDGES = [['none', 'None (normal)'], ['noBatches', '1 · No batches assigned'], ['completed', '3 · Completed batch in scope (read-only)'], ['removed', '4 · Removed as Coordinator mid-session'], ['postFail', '7 · Next feedback post fails']];
function cooDemoPanel() {
  return `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls"><div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>
  ${roleSwitchHtml()}
  <fieldset><legend>Coordinator variant — demo only</legend>${Object.values(COO_USERS).map(u => `<label class="vopt"><input type="radio" name="cv" value="${u.key}" ${S.coo.v === u.key ? 'checked' : ''} data-onchange="cooVariant"><span><strong>${u.label}</strong><br><span class="xs muted">${u.name}</span></span></label>`).join('')}</fieldset>
  
  <fieldset><legend>Coordinator edge state — demo only</legend><label class="sr" for="cedge">Edge</label><select class="select" id="cedge" data-onchange="cooEdge">${COO_EDGES.map(([k, l]) => `<option value="${k}" ${S.coo.edge === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <div class="btns"><button class="btn btn-sm" data-act="cooJumpOut">6 · Open record outside my batches</button><button class="btn btn-sm" data-act="simMark">Simulate assessor sends Assignment 4 to the Release queue</button><button class="btn btn-sm" data-act="sessionWarn">Session timeout</button><button class="btn btn-sm" data-act="demoServer">500</button><button class="btn btn-sm" data-act="cooGo" data-r="c-missing">404</button><button class="btn btn-sm" data-act="toggleOffline">Offline</button></div></fieldset>
  <fieldset><legend>Sign-in — demo only</legend><div class="btns"><button class="btn btn-sm" data-act="cooAuth" data-a="signin">Sign in (coordinator)</button><button class="btn btn-sm" data-act="cooAuth" data-a="first">First-time password → welcome</button><button class="btn btn-sm" data-act="cooAuth" data-a="suspended">Suspended</button></div></fieldset>
  <fieldset><legend>View — demo only</legend><div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div></fieldset>
  <button class="btn btn-primary" data-act="cooGo" data-r="c-index">Open coordinator screen index</button></div>`;
}
INP.cooVariant = el => { S.coo.v = el.value; S.coo.batch = 'all'; S.coo.ctx = 'Academic Coordinator'; S.coo.dirty = false; go('c-dashboard'); toast(COO_USERS[el.value].label, 'info'); };
ACT.cooMode = () => {}; /* G6.2: edit-enabled is the only mode */
INP.cooEdge = el => {
  const e = el.value; S.coo.edge = e; S.coo.batch = 'all';
  if (e === 'removed') { S.coo.edge = 'none'; changeCoordinator('L3AC-NOV26', 'Laura Kemp', 'Workload rebalancing', 'Owen Price'); toast('You are no longer the Academic Coordinator for Dubai Cohort 2.', 'info'); return go('c-batches', { id: 'L3AC-NOV26' }); }
  if (e === 'postFail') { S.coo.failNext = true; S.coo.edge = 'none'; toast('The next feedback post will fail (prototype).', 'info'); return go('c-sub', { id: 'IA-L-18022~a4' }); }
  if (e === 'completed') { S.coo.batch = 'L2DC-SEP25'; }
  go('c-dashboard');
};
ACT.cooGo = el => go(el.dataset.r);
ACT.cooJumpOut = () => go('c-learner', { id: 'IA-L-24560' });
ACT.cooAuth = el => { signOut(); S.portal = 'coord'; const a = el.dataset.a; if (a === 'first') { S.staffFlow = 'coord'; S.auth = 'first'; } else if (a === 'suspended') { S.auth = 'signin'; S.authEmail = 'suspended.coordinator@illumin-academy.example'; S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; } else { S.auth = 'signin'; S.authEmail = CME().email; } render(); };
// G6.3: feedback reaches the learner only through the Release queue — the simulation sends the marking there; the learner sees nothing until it is released
ACT.simMark = () => {
  const a = STORE.worlds.C.assignments.find(x => x.id === 'a4'), key = relKeyOfWorld('C', 'a4');
  if (relStore()[key]) { toast('Assignment 4 is already in the Release queue.', 'info'); return; }
  if (!['Submitted'].includes(a.status)) { toast('Assignment 4 is already marked.', 'info'); return; }
  const keepV = S.tas.v, keepR = S.route, keepP = S.params, keepPortal = S.portal; let s = null;
  try {
    for (const v of Object.keys(TAS_USERS)) { S.tas.v = v; if (CAN('mark') === 'yes') s = tasSubs(true).find(x => x.key === key); if (s) break; }
    if (!s) { toast('No assessor is allocated to Assignment 4.', 'err'); return; }
    const d = { items: {}, overall: 'Solid understanding of safeguarding. Q2 needs a little more on recording.', grade: '' };
    const ta = tasAsg(s); // the marking view of the submission, as the Marking Workspace uses it
    markable(ta).forEach((q, k) => { d.items[q.id] = { exit: 'pass', rag: k ? 'A' : 'G', fb: k ? 'Partially met — say how you would record the concern.' : 'Met.' }; });
    if (!Object.keys(d.items).length) { toast('Assignment 4 has nothing left to mark.', 'info'); return; }
    const _r = render, _t = toast; render = () => {}; toast = () => {};
    try { sendForRelease(s, ta, d); } finally { render = _r; toast = _t; }
  } finally { S.tas.v = keepV; S.route = keepR; S.params = keepP; S.portal = keepPortal; }
  render(); toast(`Demo only: ${TAS_USERS[relStore()[key].tasV].name} sent Assignment 4 to the Release queue. The learner sees nothing until you release it.`, 'info');
};

/* ---------- Sign-in routing ---------- */
const _staffSignin = staffSignin;
staffSignin = function (e) {
  const u = Object.values(COO_USERS).find(x => x.email === e);
  if (!(e.includes('coordinator') || u)) return _staffSignin(e);
  if (e.includes('suspended') || e.includes('deactivated')) { S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; render(); return true; }
  if (u) S.coo.v = u.key;
  cooEnter(); return true;
};
function cooEnter(welcome) {
  S.portal = 'coord'; S.signedIn = true; S.auth = 'signin'; S.staffFlow = false; S.failCount = 0; S.coo.ctx = 'Academic Coordinator';
  const back = S.returnTo && S.returnTo.startsWith('c-') ? S.returnTo : null; S.returnTo = null;
  if (back) { setRoute(back); render(); toast('Signed in. We\'ve brought you back — your feedback draft is safe.', 'info'); } else go('c-dashboard');
}
const _firstSet = SUBMIT.firstSet;
SUBMIT.firstSet = (f, e) => { if (S.staffFlow === 'coord') { S.auth = 'tfa-coowelcome'; render(); return; } _firstSet(f, e); };
const _tfaView = tfaView;
tfaView = function () {
  if (S.auth === 'tfa-coowelcome') return authShell(`<div class="lock-ic" style="background:var(--brand-soft);color:var(--brand)">${ic('users', 30)}</div><h1>Welcome, ${esc(CME().first)}</h1><p>You're the Academic Coordinator for:</p><ul class="list">${myBatches().map(b => `<li class="li"><div class="li-b"><strong>${esc(b.label)}</strong><span class="small muted">${b.code} · ${esc(b.course)} · ${b.status}</span></div></li>`).join('') || '<li class="small muted">No batches yet.</li>'}</ul><button class="btn btn-primary btn-block" data-act="cooWelcomeGo">Go to my dashboard</button>`);
  return _tfaView();
};
ACT.cooWelcomeGo = () => cooEnter();
ACT.demoSignInAsCoord = () => { S.coo.v = 'A'; cooEnter(); toast('Signed in as Dr Helen Carter (Academic Coordinator) — no 2FA for this role.', 'info'); };
const _signOutC = signOut;
signOut = function (reason) { const p = S.portal; _signOutC(reason); if (reason === 'expired' && p === 'coord') { S.portal = 'coord'; S.authEmail = CME().email; S.authMsg = { tone: 'blue', html: '<strong>Your session expired.</strong> Sign in again to return to the same page — your feedback draft was kept.' }; } };

/* Admin-side: change a batch's Academic Coordinator */
function changeCoordinator(code, to, reason, actor) {
  const b = ADMIN.batches.find(x => x.code === code), from = b.coord;
  (b.coordHistory = b.coordHistory || [[from, D(-30), null]]).forEach(h => { if (!h[2]) h[2] = now().toISOString(); });
  b.coordHistory.push([to, now().toISOString(), null]); b.coord = to;
  ADMIN.audit.unshift({ id: 'AU-' + (9700 + ADMIN.audit.length), actor: actor || ADMIN.me.name, role: actor ? 'System Administrator' : ADMIN.me.roles[0], at: now().toISOString(), module: 'Batches', entity: `${b.label} (${b.code})`, action: 'Academic Coordinator changed', before: from, after: to, reason, ip: '81.2.69.142' });
}
ACT.changeCoord = el => { const b = ADMIN.batches.find(x => x.code === el.dataset.id); reasonDlg({ title: 'Change Academic Coordinator — ' + b.code, ok: 'Change coordinator', extra: `<div class="field"><label for="cc-to">New Academic Coordinator</label><select class="select" id="cc-to">${ADMIN.staff.filter(s => s.roles.includes('Academic Coordinator') && s.name !== b.coord).map(s => `<option>${s.name}</option>`).join('')}</select></div><p class="small muted">The previous coordinator keeps attribution for feedback they already posted.</p>`, onOk: r => { changeCoordinator(b.code, $('#cc-to').value, r); render(); toast('Coordinator changed and audited. Both coordinators are notified.'); } }); };
const _ext2 = extendAssignment;
extendAssignment = function (v, aid, iso, r) { _ext2(v, aid, iso, r); };

/* ---------- 6.1 Dashboard ---------- */
SCREENS['c-dashboard'] = () => {
  const bs = scopeBatches(), L = myLearners(), subs = mySubmissions();
  const awaiting = subs.filter(s => ['Submitted'].includes(s.status));
  const risk = L.filter(l => l.flags.includes('At risk'));
  const nextEv = b => { const e = batchEvents(b).filter(x => new Date(x.start) > now()).sort((x, y) => new Date(x.start) - new Date(y.start))[0]; return e ? `${e.title} · ${fds(e.start)} ${ft(e.start)}` : '—'; };
  const N = 5;
  const attn = [];
  // Phase 3: feedback waiting for release comes first; at-risk learners are listed (both were missing)
  const relN = typeof myRel === 'function' ? myRel().length : 0;
  if (relN) attn.push(['red', `${plural(relN, 'marked submission', 'marked submissions')} waiting for you to release`, 'The learner sees nothing until you release the feedback.', 'c-release']);
  risk.forEach(l => attn.push(['red', `At risk: ${l.name}`, `${l.batch.label} · progress ${l.progress}%`, 'c-learner.' + l.lid]));
  L.filter(l => l.flags.includes('Stalled')).forEach(l => attn.push(['amber', `Stalled: ${l.name}`, `No activity for ${-daysTo(l.last)} days · ${l.batch.label}`, 'c-learner.' + l.lid]));
  L.filter(l => l.flags.includes('Projected late')).forEach(l => attn.push(['red', `Projected to miss the end date: ${l.name}`, `${l.batch.label} ends ${fd(l.batch.end)}`, 'c-learner.' + l.lid]));
  awaiting.filter(s => s.waiting > N && !(typeof r4IsSP === 'function' && r4IsSP(s))).slice(0, 4).forEach(s => attn.push(['amber', `Awaiting marking ${s.waiting} days: ${s.L.name}`, `${s.a.title} · marker ${s.marker}`, 'c-sub.' + s.key]));
  subs.filter(s => s.live && s.live.limit).forEach(s => attn.push(['blue', `Resubmission limit reached: ${s.L.name}`, `${s.a.title} — With the Academy`, 'c-sub.' + s.key]));
  bs.forEach(b => (b.coh || []).forEach(e => { if (e.v === 'C' && STORE.worlds.C.observations.some(o => o.status === 'Proposed')) attn.push(['blue', 'Observation not yet confirmed: ' + VNAME('C'), fdt(STORE.worlds.C.observations.find(o => o.status === 'Proposed').at), 'c-obs']); }));
  bs.filter(b => b.status === 'In Progress').forEach(b => { const n = (b.coh || []).length, sub = Math.round(n * 0.35); attn.push(['amber', `Assignment 3 due in ${daysTo(D(9))} days — ${sub} of ${n} submitted`, b.label, 'c-submissions']); });
  L.filter(l => l.flags.includes('Access paused') || l.status === 'Discontinued').forEach(l => attn.push(['grey', `${l.status === 'Discontinued' ? 'Discontinued' : 'Access paused'}: ${l.name}`, `${l.batch.label} · status label only`, 'c-learner.' + l.lid]));
  const up = bs.flatMap(b => batchEvents(b).map(e => ({ ...e, b }))).filter(e => new Date(e.start) > now() && new Date(e.start) < new Date(now().getTime() + 7 * DAY)).sort((x, y) => new Date(x.start) - new Date(y.start));
  const recent = subs.filter(s => s.at).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 6);
  const myFb = subs.flatMap(s => s.coo.filter(c => c.by === CME().name).map(c => ({ ...c, s }))).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 5);
  return `${pageA(`Good ${+fmt(now().toISOString(), { hour: '2-digit', hour12: false }) < 12 ? 'morning' : 'afternoon'}, ${esc(CME().first)}`, `${plural(bs.length, 'batch', 'batches')} · ${L.length} learners · ${awaiting.length} submissions awaiting marking · ${risk.length} learners at risk`)}
  <div class="grid">${bs.map(b => { const ls = L.filter(l => l.batch === b), c = {}; FIVE.forEach(([k]) => c[k] = ls.reduce((a, l) => a + (l.five[k] || 0), 0)); const avg = ls.length ? Math.round(ls.reduce((a, l) => a + l.progress, 0) / ls.length) : 0; return `<article class="card"><div class="row-b"><span class="mono strong">${b.code}</span>${chip(b.status, BSTATUS[b.status])}</div><h3>${esc(b.label)}</h3><p class="small muted">${esc(b.course)} · ${fd(b.start)} – ${fd(b.end)} · ${b.mode}</p><div><div class="bar"><span style="width:${b.enrolled / b.cap * 100}%"></span></div><span class="xs">${b.enrolled}/${b.cap} enrolled${b.wait ? ` · ${b.wait} on waitlist` : ''}</span></div>${bar(avg, 'Average progress')}${fiveBar(c)}<div class="chip-row">${chip(subs.filter(s => s.L.batch === b && s.status === 'Not Started' && s.a.closed).length + ' overdue', 'red')}${chip(awaiting.filter(s => s.L.batch === b).length + ' awaiting marking', 'blue')}${chip(ls.filter(l => l.flags.includes('At risk')).length + ' at risk', 'redor')}</div><p class="small">Next: ${esc(nextEv(b))}</p><button class="btn btn-sm" data-go="c-batches" data-id="${b.code}">Open batch</button></article>`; }).join('')}</div>
  <div class="grid-2"><section class="card"><h2>${ic('flag')} Needs attention</h2>${attn.length ? `<ul class="list">${attn.slice(0, 12).map(a => `<li class="li"><span class="ap-sev ${a[0] === 'grey' ? 'blue' : a[0]}" aria-hidden="true"></span><span class="sev-lbl sev-${a[0]}">${{ red: 'Urgent', amber: 'Soon', blue: 'Info', grey: 'Info' }[a[0]] || 'Info'}</span><div class="li-b"><span class="strong small">${esc(a[1])}</span><span class="xs muted">${a[2]}</span></div><button class="btn btn-sm" data-act="goTok" data-t="${a[3]}">Open</button></li>`).join('')}</ul>` : '<div class="empty"><p>Nothing needs your attention.</p></div>'}</section>
  <section class="card"><h2>${ic('cal')} Next 7 days</h2>${up.length ? `<ul class="list small">${up.map(e => `<li class="li"><span class="legend"><span><i class="lg-${e.type}"></i></span></span><div class="li-b"><strong>${esc(e.title)}</strong><span class="xs muted">${fds(e.start)} ${ft(e.start)} · ${esc(e.b.label)}${e.teacher ? ' · ' + esc(e.teacher) : ''}${e.link ? ' · Zoom' : ''}</span></div></li>`).join('')}</ul>` : '<p class="small muted">Nothing scheduled.</p>'}</section></div>
  <div class="grid-2"><section class="card"><h2>Recent submissions</h2><ul class="list">${recent.map(s => `<li class="li"><div class="li-b"><strong class="small">${esc(s.L.name)} · ${esc(s.a.title)}</strong><span class="xs muted">${fdt(s.at)} · ${s.L.batch.label}</span></div>${chip(s.status)}<button class="btn btn-sm" data-go="c-sub" data-id="${s.key}">Add feedback</button></li>`).join('') || '<li class="small muted">No submissions yet.</li>'}</ul></section>
  <section class="card"><h2>My recent coordinator feedback</h2><ul class="list">${myFb.map(f => `<li class="li"><div class="li-b"><span class="small">${esc(f.text.slice(0, 90))}${f.text.length > 90 ? '…' : ''}</span><span class="xs muted">${esc(f.s.L.name)} · ${esc(f.s.a.title)} · ${fdt(f.at)}</span></div></li>`).join('') || '<li class="small muted">You haven\'t posted feedback yet.</li>'}</ul>
  <h3>Recent notifications</h3><ul class="list small">${cooNotifs().slice(0, 4).map(n => `<li class="li">${n.unread ? '<span class="unread-dot"></span>' : '<span class="read-dot"></span>'}<div class="li-b"><strong>${esc(n.t)}</strong><span class="xs muted">${esc(n.b)}</span></div></li>`).join('')}</ul></section></div>`;
};
// Coordinator timeline edits are stored per batch and applied to every batch (not only the ones backed by a learner world)
function batchEvents(b) { const ov = (STORE.evOver || {})[b.code] || {}; return batchEvents0(b).map(e => ov[e.id] ? { ...e, start: ov[e.id], end: ov[e.id], updated: e.updated || e.start } : e); }
const BATCH_WORLD = { 'L3AC-JAN26': 'C', 'L2DC-MAR26': 'D' };
const _isEvOver = initStore; initStore = function () { STORE.evOver = {}; _isEvOver(); }; // demo reset clears timeline edits with the rest of the data
// The single store for timeline dates: every Coordinator and Academic Admin edit goes through here (last save wins); learner-backed batches also update the learner's calendar and deadline. Returns the learner world key, if any.
function batchEvSet(b, e, iso) {
  ((STORE.evOver = STORE.evOver || {})[b.code] = STORE.evOver[b.code] || {})[e.id] = iso;
  const wv = BATCH_WORLD[b.code]; if (!wv) return null;
  const w = STORE.worlds[wv], src = w.events.find(x => x.id === e.id); if (src) { src.updated = src.start; src.start = iso; src.end = iso; }
  if (e.type === 'deadline') { const a = w.assignments.find(x => 'ed' + x.id === e.id); if (a) { a.originalDue = a.originalDue || a.due; a.due = iso; a.closed = false; } }
  return wv;
}
function batchEvents0(b) {
  if (b.code === 'L3AC-JAN26') return STORE.worlds.C.events.filter(e => e.type !== 'mile' || e.title.includes('Programme')).map(e => ({ ...e, teacher: e.type === 'class' ? b.teachers[0] : null })).concat([{ id: 'm1', type: 'mile', title: 'Programme milestone: mid-point review', start: D(18, '08:00'), end: D(18, '08:30') }]);
  if (b.code === 'L2DC-MAR26') return STORE.worlds.D.events.filter(e => e.type !== 'deadline' || e.title.includes('Assignment')).map(e => ({ ...e, teacher: e.type === 'class' ? b.teachers[0] : null }));
  const s = new Date(b.start).getTime() - new Date(NOW).getTime(), base = Math.round(s / DAY);
  return [['class', 'Induction (Zoom)', 0, '17:00', 60], ['class', 'Unit 1 class', 7, '17:00', 90], ['deadline', 'Assignment 1 due', 28, '21:59', 0], ['obs', 'Observation window opens', 56, '08:00', 0], ['mile', 'Programme milestone: first review', 90, '08:00', 30]].map((r, k) => ({ id: b.code + k, type: r[0], title: r[1], start: D(base + r[2], r[3]), end: D(base + r[2], r[3]), teacher: r[0] === 'class' ? b.teachers[0] : null, link: r[0] === 'class' ? 'https://zoom.example/j/8' + k + '2200' : null }));
}

/* ---------- 6.2 My Batches ---------- */
SCREENS['c-batches'] = (p) => {
  if (p.id) return cooBatchDetail(p.id, p.tab || 'overview');
  const t = ui('cbTab', 'active'), m = myBatches();
  const groups = { active: ['Active', b => ['Open', 'In Progress'].includes(b.status)], planned: ['Planned', b => b.status === 'Planned'], completed: ['Completed', b => b.status === 'Completed'], archived: ['Archived', b => b.status === 'Archived'], all: ['All', () => true] };
  return `${pageA('My Batches', 'Batch lifecycle, rosters and staffing are managed by the Academy administration.')}${tabs(Object.entries(groups).map(([k, [l, f]]) => [k, l, m.filter(f).length]), t, 'cbTab', 'Batch status')}
  ${dt({ id: 'cbatches-' + t, name: 'My batches', rows: m.filter(groups[t][1]), rid: b => b.code, cols: [{ k: 'code', l: 'Batch', h: b => `<a href="#c-batches.${b.code}" data-go="c-batches" data-id="${b.code}" class="mono strong">${b.code}</a><div class="xs muted">${esc(b.label)}</div>` }, { k: 'course', l: 'Programme', h: b => `<span class="small">${esc(b.course)}</span>` }, { k: 'dates', l: 'Intake', h: b => `<span class="small">${fd(b.start)} – ${fd(b.end)}</span>`, s: b => b.start }, { k: 'mode', l: 'Mode' }, { k: 'status', l: 'Status', h: b => chip(b.status, BSTATUS[b.status]) }, { k: 'cap', l: 'Enrolled', h: b => `${b.enrolled}/${b.cap}` }, { k: 'wait', l: 'Waitlist', r: 1 }, { k: 'teachers', l: 'Teachers', v: b => b.teachers.join(', ') }, { k: 'assessors', l: 'Assessors', v: b => b.assessors.join(', ') }, { k: 'avg', l: 'Avg progress', h: b => { const ls = myLearners(true).filter(l => l.batch === b); return (ls.length ? Math.round(ls.reduce((a, l) => a + l.progress, 0) / ls.length) : 0) + '%'; } }, { k: 'risk', l: 'At risk', r: 1, v: b => myLearners(true).filter(l => l.batch === b && l.flags.includes('At risk')).length }], empty: 'No batches in this list', act: b => `<button class="btn btn-sm" data-go="c-batches" data-id="${b.code}">Open</button>` })}`;
};
ACT.cbTab = el => { setUi('cbTab', el.dataset.k); render(); };
function cooBatchDetail(code, t) {
  const b = myBatches().find(x => x.code === code);
  if (!b) { const any = ADMIN.batches.find(x => x.code === code); if (any && (any.coordHistory || []).some(h => h[0] === CME().name)) return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>You no longer coordinate this batch</h1><p class="muted">${esc(any.label)} is now coordinated by ${esc(any.coord)}. Feedback you already posted keeps your name.</p><button class="btn btn-primary" data-go="c-batches">My batches</button></div>`; return any ? denied('batch ' + code) : notFound(); }
  const ls = myLearners(true).filter(l => l.batch === b), subs = mySubmissions(true).filter(s => s.L.batch === b);
  const stages = ['Planned', 'Open', 'In Progress', 'Completed', 'Archived'], si = stages.indexOf(b.status);
  const body = {
    overview: `<div class="grid-2"><section class="card"><dl class="kv"><dt>Programme</dt><dd>${esc(b.course)} · Version 2</dd><dt>Intake</dt><dd>${fd(b.start)} – ${fd(b.end)}</dd><dt>Mode</dt><dd>${b.mode}</dd><dt>Capacity</dt><dd>${b.enrolled}/${b.cap}${b.wait ? ` · ${b.wait} waitlisted` : ''}</dd><dt>Description</dt><dd class="small">${b.mode} delivery with weekly live classes and monthly classroom days.</dd></dl>
      <ol class="stepper" aria-label="Lifecycle">${stages.map((s, i) => `<li class="step ${i < si ? 'done' : i === si ? 'cur' : ''}" ${i === si ? 'aria-current="step"' : ''}><span class="dot">${i < si ? '✓' : i + 1}</span><span class="s-l">${s}</span></li>`).join('')}</ol></section>
      <section class="card"><h2>Staff team</h2><ul class="list">${[[CME().name, 'Academic Coordinator (me)'], ...b.teachers.map(x => [x, 'Teacher']), ...b.assessors.map(x => [x, 'Assessor'])].map(([n, r]) => `<li class="li"><div class="li-b"><strong>${esc(n)}</strong><span class="xs muted">${r}</span></div>${r.includes('me') ? '' : `<button class="btn btn-sm" data-act="cooCompose" data-to="${esc(n)} (${r})">${ic('msg', 14)}Message</button>`}</li>`).join('')}</ul>
      <h3>Key dates</h3><ul class="list small">${batchEvents(b).filter(e => ['mile', 'deadline'].includes(e.type)).slice(0, 5).map(e => `<li class="li">${fd(e.start)} · ${esc(e.title)}</li>`).join('')}</ul></section></div>`,
    roster: rosterTable(ls, 'roster-' + b.code) + `<p class="xs muted">${ic('lock', 12)} Roster changes are made by the Academy administration.</p><h3>Waitlist (read-only)</h3><p class="small">${b.wait ? ['Mohammed Al Hashimi', 'Joseph Mathew', 'Anjali Nair', VNAME('B')].slice(0, b.wait).join(', ') : 'No one on the waitlist.'}</p>`,
    timeline: ganttFor(b) + changeLog(),
    modules: modulesFor(b),
    pipeline: pipelineFor(b, subs),
    progress: heatmap(ls),
    obs: obsSection([b]),
    attendance: attSection([b]),
    reports: reportsSection([b]),
    history: `<section class="card"><h2>Coordinators of this batch</h2><ul class="list small">${(b.coordHistory || []).map(h => `<li class="li"><strong>${esc(h[0])}</strong> · ${fd(h[1])} – ${h[2] ? fd(h[2]) : 'present'}</li>`).join('')}</ul></section>${changeLog()}`,
  }[t];
  return `${pageA(esc(b.label) + ' <span class="mono small">' + b.code + '</span>', esc(b.course), chip(b.status, BSTATUS[b.status]) + `<button class="btn btn-sm" data-act="cooBulk" data-b="${b.code}">${ic('download', 14)}Bulk export</button>`, [['My Batches', 'c-batches'], [b.code]])}${roBatch(b) ? `<div class="note b-grey">${ic('lock')}<div class="small"><strong>This batch is read-only.</strong></div></div>` : ''}${b.status === 'Planned' ? `<div class="note b-blue">${ic('info')}<div class="small">This batch hasn't started. Content and timeline are visible; there are no submissions yet.</div></div>` : ''}
  <div class="tabs-scroll">${subtabs([['overview', 'Overview'], ['roster', 'Roster'], ['timeline', 'Timeline'], ['modules', 'Modules & Content'], ['pipeline', 'Assessment pipeline'], ['progress', 'Progress'], ['obs', 'Observations & PD'], ['attendance', 'Attendance'], ['reports', 'Reports'], ['history', 'History']], t, 'c-batches', b.code)}</div>${body}`;
}
function rosterTable(ls, id) {
  return dt({ id, name: 'Learners', rows: ls, rid: l => l.lid, search: l => l.name + l.lid, filters: [{ k: 'b', l: 'Batch', get: l => l.batch.label }, { k: 's', l: 'Status', get: l => l.status, opts: ['Active', 'Completed', 'Expired-Incomplete', 'Discontinued'] }, { k: 'f', l: 'Flag', get: l => l.flags.join('|') || 'None', opts: ['On track', 'At risk', 'Overdue', 'Stalled', 'Projected late', 'Access paused'] }, { k: 'a', l: 'Agency-sponsored', get: l => l.agency ? 'Yes' : 'No', opts: ['Yes', 'No'] }, { k: 'u', l: 'Behind on', get: l => l.outstanding > 2 ? 'Unit 305|Unit 307' : l.outstanding ? 'Unit 307' : 'None', opts: ['Unit 305', 'Unit 307'] }],
    rowCls: l => l.status === 'Discontinued' ? 'muted' : '',
    cols: [{ k: 'name', l: 'Learner', h: l => `<a href="#c-learner.${l.lid}" data-go="c-learner" data-id="${l.lid}" class="strong">${esc(l.name)}</a><div class="xs mono muted">${l.lid}</div>` }, { k: 'batch', l: 'Batch', v: l => l.batch.label, hide: id.startsWith('roster') ? 1 : 0 }, { k: 'status', l: 'Enrolment', h: l => chip(l.status) }, { k: 'agency', l: 'Sponsor', h: l => l.agency ? `<span class="sponsor">${esc(l.agency)}</span>` : '—' }, { k: 'progress', l: 'Progress', h: l => `<div style="min-width:100px">${bar(l.progress, l.name)}</div>`, s: l => l.progress }, { k: 'five', l: 'Five-state', h: l => fiveBar(l.five, 'sm'), nosort: 1 }, { k: 'last', l: 'Last activity', h: l => `<span class="small">${rel(l.last)}</span>`, s: l => l.last }, { k: 'att', l: 'Attendance', h: l => l.att == null ? '—' : `${l.att}%${l.att < 80 ? ' ' + chip('Below 80%', 'redor') : ''}`, s: l => l.att || 0 }, { k: 'out', l: 'Outstanding', r: 1, v: l => l.outstanding }, { k: 'flags', l: 'Flags', h: l => l.flags.map(f => chip(f, { 'On track': 'green', 'At risk': 'redor', Overdue: 'red', Stalled: 'amber', 'Projected late': 'red', 'Access paused': 'grey' }[f])).join(' ') || '—', v: l => l.flags.join() }],
    act: l => `<button class="btn btn-sm" data-go="c-learner" data-id="${l.lid}">Open</button>`, empty: 'No learners in this batch yet' });
}
function pipelineFor(b, subs) {
  if (!subs.some(s => s.at)) return `<div class="card"><div class="empty"><p>No submissions yet.</p></div></div>`;
  const cols = ['Not Started', 'Submitted', 'Feedback Received', 'Resubmission Required', 'Completed'];
  const aged = subs.filter(s => s.waiting > 5 && !(typeof r4IsSP === 'function' && r4IsSP(s))); // R4: Self-Paced work has no marking turnaround
  const markers = [...new Set(subs.map(s => s.marker))];
  return `<section class="card"><h2>Pipeline by assignment</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Assignment</th>${cols.map(c => `<th class="r">${c}</th>`).join('')}<th class="r">Added to PD</th></tr></thead><tbody>${BASE_ASGS().map(a => { const r = subs.filter(s => s.a.id === a.id); return `<tr><td>${esc(a.title)}</td>${cols.map(c => `<td class="r">${r.filter(s => s.status === c).length || '·'}</td>`).join('')}<td class="r">${r.filter(s => s.pd).length || '·'}</td></tr>`; }).join('')}</tbody></table></div></section>
  <div class="grid-2"><section class="card"><h2>Aged items (waiting &gt; 5 days)</h2><ul class="list small">${aged.map(s => `<li class="li"><div class="li-b">${esc(s.L.name)} · ${esc(s.a.title)}<span class="xs muted">Marker: ${esc(s.marker)}</span></div>${daysChip(s.waiting)}</li>`).join('') || '<li class="small muted">None.</li>'}</ul></section><section class="card"><h2>Marking turnaround</h2><table class="tbl dense"><tbody>${markers.map((m, k) => `<tr><td>${esc(m)}</td><td class="r">${(3.4 + k * 1.3).toFixed(1)} days average</td></tr>`).join('')}</tbody></table>${lockNote()}</section></div>`;
}

/* ---------- 6.3 Learners ---------- */
SCREENS['c-learners'] = () => `${pageA('Learners', 'Learners in my batches only')}${rosterTable(myLearners(), 'clearners')}`;
SCREENS['c-learner'] = (p) => {
  const L = myLearners(true).find(l => l.lid === p.id);
  if (!L) return allLearners().some(l => l.id === p.id) ? denied('learner ' + p.id) : notFound();
  const t = p.tab || 'summary';
  const subs = mySubmissions(true).filter(s => s.L.lid === L.lid);
  const fbAll = subs.flatMap(s => s.coo.map(c => ({ ...c, s })));
  const body = {
    summary: `<section class="card"><dl class="kv"><dt>Learner ID</dt><dd class="mono">${L.lid}</dd><dt>Batch</dt><dd>${esc(L.batch.label)} (${L.batch.code})</dd><dt>Programme</dt><dd>${esc(L.batch.course)}</dd><dt>Enrolment</dt><dd>${chip(L.status)}</dd><dt>Sponsor</dt><dd>${L.agency ? `<span class="sponsor">${esc(L.agency)}</span>` : 'Self-funded'}</dd><dt>Email</dt><dd>${esc(L.email)}</dd><dt>Flags</dt><dd>${L.flags.map(f => chip(f, 'redor')).join(' ') || '—'}</dd></dl><div class="row"><button class="btn btn-sm btn-primary" data-act="cooCompose" data-to="${esc(L.name)} (Learner)" data-l="${L.lid}">${ic('msg', 14)}Message learner</button><button class="btn btn-sm" data-go="c-learner" data-id="${L.lid}" data-tab="submissions">View submissions</button></div></section>
      <div class="note b-grey">${ic('lock')}<div class="small">Not shown to Academic Coordinators: payments and fees, admission and ID documents, consent documents, IQA findings, Approvals Queue items and audit logs.</div></div>`,
    progress: L.v ? withW(L.v, () => treeSection()) : synthTreeHtml(L),
    submissions: subs.filter(s => s.at).map(s => `<details class="card flat"><summary class="row-b" style="cursor:pointer"><strong>${esc(s.a.title)}</strong><span class="row">${chip(s.status)}<span class="code">${s.round}</span>${s.pd ? chip('Added to PD', 'purple') : ''}<button class="btn btn-sm" data-go="c-sub" data-id="${s.key}">Open</button></span></summary>${answerReadOnly(s)}</details>`).join('') || '<div class="card"><div class="empty"><p>No submissions yet.</p></div></div>',
    plan: L.v ? `<div class="grid-2"><section class="card"><h2>Improvement plan</h2><ol class="small">${STORE.worlds[L.v].plan.map(x => `<li>${esc(x.action)} ${x.done ? chip('Done') : ''}</li>`).join('')}</ol></section><section class="card"><h2>PD checklist</h2><ul class="list small">${STORE.worlds[L.v].pd.items.map(x => `<li class="li"><span class="code">${x.ref}</span><div class="li-b">${esc(x.reason)}</div>${chip(x.status)}</li>`).join('')}</ul></section></div>${lockNote('Read-only — maintained by the Assessor')}` : `<section class="card"><p class="small">${L.coh.pd.length ? 'PD item: Assignment 2 · Q2 (Added to PD).' : 'No PD items.'}</p><p class="small">Improvement plan: complete outstanding assignments (${L.outstanding}).</p></section>`,
    observations: L.v && STORE.worlds[L.v].workplace ? `<section class="card"><p><strong>${esc(STORE.worlds[L.v].workplace.name)}</strong> · permission ${chip(STORE.worlds[L.v].workplace.perm)}</p><ul class="list small">${STORE.worlds[L.v].observations.map(o => `<li class="li"><div class="li-b">${fdt(o.at)} · ${esc(o.scope)}${o.report ? `<span class="xs">${o.report.nvq.map(r => `${r[0]}: ${r[2] ? 'Observed' : 'Not Yet Observed'}, ${r[3] ? 'Competent' : 'Not Yet Competent'}`).join(' · ')}</span>` : ''}</div>${chip(o.status)}</li>`).join('')}</ul>${lockNote('Observations are scheduled by the Assessor or an Administrator')}</section>` : '<div class="card"><p class="small muted">No observations yet.</p></div>',
    attendance: L.v ? dt({ id: 'lu-h-catt-' + L.lid, name: 'Attendance', rows: STORE.worlds[L.v].attendance, noExport: true, rid: r => r.at + r.session, cols: [{ k: 'session', l: 'Session' }, { k: 'at', l: 'Date', h: r => fdt(r.at), v: r => r.at }, { k: 'status', l: 'Status', h: r => chip(r.status), v: r => r.status }, { k: 'mins', l: 'Minutes', h: r => `${r.mins}/${r.dur} min`, s: r => r.mins, v: r => r.mins + '/' + r.dur }] }) : `<p>Attendance: <strong>${L.att ?? '—'}%</strong></p>`,
    feedback: `<section class="card"><h2>Coordinator feedback history</h2>${fbAll.length ? fbAll.sort((x, y) => new Date(y.at) - new Date(x.at)).map(f => `<div class="coord"><div class="c-h">${ic('users')}Coordinator feedback · ${esc(f.s.a.title)}</div><p>${esc(f.text)}</p><p class="small muted">${esc(f.by)}${f.by === CME().name ? ' (me)' : ''} · ${fdt(f.at)}</p></div>`).join('') : '<p class="small muted">No coordinator feedback yet.</p>'}</section>`,
  }[t];
  return `${pageA(esc(L.name), `${esc(L.batch.label)} · ${esc(L.batch.course)}`, `${chip(L.status)}${L.agency ? `<span class="sponsor">${esc(L.agency)}</span>` : ''}`, [['Learners', 'c-learners'], [L.name]])}
  <div class="tabs-scroll">${subtabs([['summary', 'Summary'], ['progress', 'Progress'], ['submissions', 'Submissions'], ['plan', 'Improvement plan & PD'], ['observations', 'Observations'], ['attendance', 'Attendance'], ['feedback', 'Coordinator feedback']], t, 'c-learner', L.lid)}</div>${body}`;
};
function synthTreeHtml(L) {
  const tree = STORE.worlds.C.tree, sts = ['Achieved', 'Achieved', 'In Progress', 'Not Started', 'Action Required', 'Achieved', 'Added to PD'];
  return `<section class="card pad0"><div class="tree">${tree.map(u => `<details class="lvl-1"><summary><span class="caret">${ic('chev', 16)}</span><span class="tw"><span class="strong"><span class="code">${u.code}</span> ${esc(u.title)}</span></span><span class="tm">${fiveBar(L.five, 'sm')}</span></summary><div class="kids">${u.mods.flatMap(m => m.los.flatMap(lo => lo.crit.map(c => { const st = L.progress ? sts[(hashN(c.code + L.lid)) % 7] : 'Not Started'; return `<div class="crit-row"><div><span class="code">${c.code}</span> ${critType(lo.type)} ${chip(st)}<div class="small">${esc(c.d)}</div><div class="xs muted">Evidence: ${st === 'Not Started' ? 'none yet' : lo.type === 'Knowledge' ? 'assignment' : st === 'Added to PD' ? 'PD' : 'observation'}</div></div></div>`; }))).join('')}</div></details>`).join('')}</div></section>`;
}
function answerReadOnly(s) {
  const a = synthAsg(s);
  if (!a.qs.some(q => q.rounds.length)) return '<p class="small muted">Not submitted yet.</p>';
  return `${inkLegend()}${feedbackTop(a)}<div class="paper">${a.qs.map((q, k) => `<div class="q">${qHead(q, k)}${q.rounds.map((r, n) => roundBlock(q, n, r)).join('')}${q.state === 'pd' ? `<div class="pd-tag">${ic('users', 16)}<div><strong>Added to Professional Discussion — no rework needed</strong><div class="small">${esc(q.pdReason || '')}</div></div></div>` : ''}${q.rounds.length ? `<div class="row"><button class="attach" data-act="viewFile" data-f="Q${k + 1}_attachment.pdf">${ic('clip2', 13)}Q${k + 1}_attachment.pdf</button></div>` : ''}</div>`).join('')}</div>`;
}

/* ---------- 6.4 Submissions & Coordinator Feedback ---------- */
const CSTABS = { all: ['All', () => true], await: ['Awaiting marking', s => ['Submitted'].includes(s.status)], fb: ['Feedback received', s => s.status === 'Feedback Received'], resub: ['Resubmission required', s => s.status === 'Resubmission Required'], marked: ['Completed', s => s.status === 'Completed'], mine: ['Has my feedback', s => s.mine], none: ['No coordinator feedback yet', s => !s.coo.length] };
SCREENS['c-submissions'] = () => {
  const t = ui('csTab', 'all'), rows = mySubmissions().filter(s => s.at).filter(CSTABS[t][1]);
  return `${pageA('Submissions & Feedback', 'Post plain written feedback on submissions in your batches. Marking is done by Teachers and Assessors.', `<button class="btn" data-act="cooBulk" data-from="csubs-${t}">${ic('download', 15)}Bulk export</button>`)}
  ${tabs(Object.entries(CSTABS).map(([k, [l, f]]) => [k, l, mySubmissions().filter(s => s.at).filter(f).length]), t, 'csTab', 'Submission views')}
  ${dt({ id: 'csubs-' + t, name: 'Submissions', rows, rid: s => s.key, search: s => s.L.name + s.a.title, filters: [{ k: 'b', l: 'Batch', get: s => s.L.batch.label }, { k: 'a', l: 'Assignment', get: s => s.a.title }, { k: 's', l: 'Status', get: s => s.status, opts: ['Submitted', 'Feedback Received', 'Resubmission Required', 'Completed'] }, { k: 'm', l: 'Marker', get: s => s.marker }, { k: 'w', l: 'Days waiting', get: s => s.waiting == null ? 'Not waiting' : s.waiting > 5 ? 'More than 5' : '0–5', opts: ['0–5', 'More than 5', 'Not waiting'] }],
    rowCls: s => s.L.status === 'Discontinued' ? 'muted' : '',
    cols: [{ k: 'learner', l: 'Learner', h: s => `${esc(s.L.name)}${s.L.status === 'Discontinued' ? ' ' + chip('Discontinued', 'red') : ''}`, v: s => s.L.name }, { k: 'batch', l: 'Batch', v: s => s.L.batch.label }, { k: 'asg', l: 'Assignment', h: s => `<a href="#c-sub.${s.key}" data-go="c-sub" data-id="${s.key}">${esc(s.a.title)}</a>`, v: s => s.a.title }, { k: 'unit', l: 'Unit / module', v: s => s.a.unit, hide: 1 }, { k: 'at', l: 'Submitted', h: s => `<span class="small">${fdt(s.at)}</span>`, s: s => s.at }, { k: 'round', l: 'Round', h: s => `<span class="code">${s.round}</span>` }, { k: 'status', l: 'Status', h: s => chip(s.status) }, { k: 'marker', l: 'Marker' }, { k: 'waiting', l: 'Days waiting', h: s => daysChip(s.waiting), s: s => s.waiting ?? -1 }, { k: 'coo', l: 'Coordinator feedback', h: s => s.coo.length ? `<span title="Coordinator feedback posted">${ic('msg', 15)}<span class="sr">Coordinator feedback posted</span> ${s.coo.length}</span>` : '—', s: s => s.coo.length }, { k: 'pd', l: 'PD', h: s => s.pd ? chip('Added to PD', 'purple') : '' }],
    act: s => `<button class="btn btn-sm" data-go="c-sub" data-id="${s.key}">Open</button>`, empty: t === 'await' ? 'No submissions awaiting marking' : 'No submissions in this view' })}`;
};
ACT.csTab = el => { setUi('csTab', el.dataset.k); render(); };
SCREENS['c-sub'] = (p) => {
  const s = mySubmissions(true).find(x => x.key === p.id);
  if (!s) return denied('submission ' + p.id);
  const a = synthAsg(s), ro = roBatch(s.L.batch) || s.L.status === 'Discontinued';
  const draft = STORE.coo.drafts[s.key] || { text: '', scope: 'Overall submission' };
  return `${pageA(esc(a.title), `${esc(s.L.name)} · ${esc(s.L.batch.label)} · submitted ${fdt(s.at)}`, `${chip(s.status)}<span class="code">${s.round}</span>${s.pd ? chip('Added to PD', 'purple') : ''}`, [['Submissions & Feedback', 'c-submissions'], [s.L.name]])}
  <div class="split"><div class="stack-lg">
    <section class="card"><h3>Linked criteria</h3><ul class="list small">${a.crit.map(([c, d, t]) => `<li class="li"><span class="code">${c}</span><div class="li-b">${esc(d)}</div>${critType(t)}</li>`).join('')}</ul><h3>Status</h3>${statusTimeline(a)}${lockNote()}</section>
    ${answerReadOnly(s)}</div>
  <aside class="card coo-panel" aria-labelledby="cfp-h"><h2 id="cfp-h">Coordinator feedback — plain written feedback only</h2>
    <div class="note b-blue">${ic('info')}<div class="small">This does not change the submission status, grade or outcome. The learner will be notified.</div></div>
    ${ro ? `<div class="note b-grey">${ic('lock')}<div class="small">${s.L.status === 'Discontinued' ? 'This learner\'s enrolment is Discontinued — feedback is read-only.' : `This batch is ${s.L.batch.status} — feedback is read-only.`}</div></div>` : `
    <div class="field"><label for="cf-scope">Feedback on</label><select class="select" id="cf-scope" data-onchange="cfScope" data-k="${s.key}"><option ${draft.scope === 'Overall submission' ? 'selected' : ''}>Overall submission</option>${a.qs.map((q, k) => `<option ${draft.scope === 'Question ' + (k + 1) ? 'selected' : ''}>Question ${k + 1}</option>`).join('')}</select></div>
    <div class="rte"><div class="rte-tb" role="toolbar" aria-label="Formatting"><button type="button" data-act="fmtCmd" data-c="bold" aria-label="Bold"><b>B</b></button><button type="button" data-act="fmtCmd" data-c="italic" aria-label="Italic"><i>I</i></button><button type="button" data-act="fmtCmd" data-c="insertUnorderedList" aria-label="Bulleted list">•</button><button type="button" data-act="fmtCmd" data-c="insertOrderedList" aria-label="Numbered list">1.</button><span class="wc"><span class="save-chip ${draft.text ? 'ok' : ''}" id="cf-save">${draft.text ? ic('check', 12) + 'Draft saved' : 'Draft auto-saves'}</span></span></div>
    <div class="rte-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Coordinator feedback" id="cf-body" data-ph="Write your feedback for ${esc(s.L.name)}…" data-oninput="cfInput" data-k="${s.key}">${draft.html || ''}</div></div>
    <h3>How the learner will see this</h3><div id="cf-prev">${cfPreview(draft)}</div>
    <button class="btn btn-primary" data-act="cfPost" data-k="${s.key}">Post feedback</button>`}
    <h3>Previous coordinator feedback</h3>${s.coo.length ? s.coo.map(c => `<div class="coord"><div class="c-h">${ic('users')}Coordinator feedback${c.scope && c.scope !== 'Overall submission' ? ' · ' + esc(c.scope) : ''}</div><p class="small">${esc(c.text)}</p><p class="xs muted">${esc(c.by)} · ${fdt(c.at)}</p></div>`).join('') : '<p class="small muted">None yet.</p>'}
  </aside></div>`;
};
function cfPreview(d) { return d.text ? `<div class="coord"><div class="c-h">${ic('users')}Coordinator feedback${d.scope !== 'Overall submission' ? ' · ' + esc(d.scope) : ''}</div><p class="small">${esc(d.text)}</p><p class="xs muted">${esc(CME().name)}, Academic Coordinator · ${fdt(now().toISOString())}</p><p class="xs strong">This does not change your submission status.</p></div>` : '<p class="small muted">Start typing to preview.</p>'; }
INP.cfInput = el => { const d = STORE.coo.drafts[el.dataset.k] = STORE.coo.drafts[el.dataset.k] || { scope: 'Overall submission' }; d.html = el.innerHTML; d.text = el.innerText !== undefined ? el.innerText.trim() : el.textContent.trim(); S.coo.dirty = !!d.text; $('#cf-prev').innerHTML = cfPreview(d); const c = $('#cf-save'); c.className = 'save-chip busy'; c.textContent = 'Saving…'; clearTimeout(INP._cft); INP._cft = setTimeout(() => { if ($('#cf-save')) { c.className = 'save-chip ok'; c.innerHTML = ic('check', 12) + 'Draft saved ' + fmt(now().toISOString(), { hour: '2-digit', minute: '2-digit', hour12: false }); } }, 500); };
INP.cfScope = el => { const d = STORE.coo.drafts[el.dataset.k] = STORE.coo.drafts[el.dataset.k] || { text: '' }; d.scope = el.value; $('#cf-prev').innerHTML = cfPreview(d); };
ACT.cfPost = el => {
  const k = el.dataset.k, d = STORE.coo.drafts[k];
  if (!d || !d.text) { toast('Write some feedback first.', 'err'); $('#cf-body')?.focus(); return; }
  openModal({ title: 'Post coordinator feedback?', body: `${cfPreview(d)}<div class="note b-amber">${ic('lock')}<div class="small">Once posted, feedback is kept permanently in the submission history and cannot be edited or deleted.</div></div>`, actions: [{ label: 'Cancel' }, { label: 'Post feedback', cls: 'btn-primary', fn: () => postFeedback(k) }] });
};
function postFeedback(k) {
  if (S.coo.failNext || S.offline) { S.coo.failNext = false; toast('Feedback couldn\'t be posted. Your draft is kept — try again.', 'err'); openModal({ title: 'Feedback not posted', body: `<div class="note b-red">${ic('alert')}<div>Something went wrong while posting. Your draft is still saved on this submission.</div></div>`, actions: [{ label: 'Close' }, { label: 'Retry', cls: 'btn-primary', fn: () => { setTimeout(() => postFeedback(k), 0); } }] }); return false; }
  const s = mySubmissions(true).find(x => x.key === k), d = STORE.coo.drafts[k];
  const item = { by: CME().name, at: now().toISOString(), text: d.text, scope: d.scope || 'Overall submission' };
  if (s.live) { const a = s.live; a.coordAll = a.coordAll || (a.coord ? [a.coord] : []); a.coordAll.push(item); notifyLearner(s.L.v, 'Assignments', 'Coordinator feedback posted', `${CME().name} added feedback to ${a.title}.`, 'assignment.' + a.id); }
  else STORE.coo.fb.push({ key: k, ...item });
  cooLog('Assessment', `${s.L.name} · ${s.a.title}`, 'Coordinator feedback posted', '—', item.scope, 'Status unchanged: ' + s.status);
  delete STORE.coo.drafts[k]; S.coo.dirty = false; render(); toast('Feedback posted — learner notified.');
}

/* ---------- 6.5 Progress & Competency ---------- */
SCREENS['c-progress'] = () => `${pageA('Progress & Competency', 'Read-only', exportMenu('Coordinator progress'))}${heatmap(myLearners())}<p class="small muted">${ic('lock', 12)} Recommending actions on gaps is an assessor function.</p>`;
function heatmap(ls) {
  ls = ls.filter(l => l.progress > 0 || l.v);
  if (!ls.length) return `<div class="card"><div class="empty"><p>No progress yet — this batch hasn't started.</p></div></div>`;
  const by = ui('hmBy', 'learner'), crit = withW('C', () => allCrit());
  const stOf = (l, c) => l.v ? (withW(l.v, () => allCrit()).find(x => x.code === c.code) || {}).st || 'Not Started' : ['Achieved', 'Achieved', 'In Progress', 'Not Started', 'Action Required', 'Achieved', 'Added to PD'][hashN(c.code + l.lid) % 7];
  const ab = { 'Not Started': 'NS', 'In Progress': 'IP', 'Action Required': 'AR', 'Added to PD': 'PD', 'Achieved': 'A' };
  const units = STORE.worlds.C.tree;
  return `<div class="kpis">${kpi('Batch readiness', Math.round(ls.reduce((a, l) => a + l.progress, 0) / ls.length) + '%')}${kpi('Stalled learners', ls.filter(l => l.flags.includes('Stalled')).length)}${kpi('Projected late', ls.filter(l => l.flags.includes('Projected late')).length)}${kpi('Evidence shortfalls', ls.filter(l => l.five['Action Required'] > 1).length)}</div>
  <section class="card"><h2>Five-state distribution per unit</h2>${units.map(u => { const c = {}; FIVE.forEach(([k]) => c[k] = 0); ls.forEach(l => critOf(u).forEach(cc => c[stOf(l, cc)]++)); return `<div class="row" style="gap:10px"><span class="small" style="width:60px"><span class="code">${u.code}</span></span><div style="flex:1">${fiveBar(c)}</div></div>`; }).join('')}${fiveLegend()}</section>
  <section class="card"><div class="row-b"><h2>Cohort competency map</h2><div class="seg" role="group" aria-label="Rows"><button aria-pressed="${by === 'learner'}" data-act="hmBy" data-b="learner">By learner</button><button aria-pressed="${by === 'criterion'}" data-act="hmBy" data-b="criterion">By criterion</button></div></div>
  <div class="tbl-wrap"><table class="tbl dense heat"><thead><tr><th>${by === 'learner' ? 'Learner' : 'Criterion'}</th>${by === 'learner' ? crit.map(c => `<th class="mono xs" title="${esc(c.d)}">${c.code}</th>`).join('') : ls.map(l => `<th class="xs">${esc(l.name.split(' ')[0])}</th>`).join('')}<th>Readiness</th></tr></thead><tbody>
  ${by === 'learner' ? ls.map(l => `<tr class="${l.flags.includes('Stalled') || l.flags.includes('Projected late') ? 'row-esc' : ''}"><td class="nowrap"><a href="#c-learner.${l.lid}" data-go="c-learner" data-id="${l.lid}">${esc(l.name)}</a>${l.flags.includes('Projected late') ? ' ' + chip('Projected late', 'red') : ''}</td>${crit.map(c => { const st = stOf(l, c); return `<td><button class="hc f-${TONE[st]}" data-act="hmCell" data-l="${l.lid}" data-c="${c.code}" title="${st}">${ab[st]}</button></td>`; }).join('')}<td>${l.progress}%</td></tr>`).join('')
    : crit.map(c => `<tr><td class="nowrap"><span class="code">${c.code}</span> ${critType(c.typeName || c.type)}</td>${ls.map(l => { const st = stOf(l, c); return `<td><button class="hc f-${TONE[st]}" data-act="hmCell" data-l="${l.lid}" data-c="${c.code}" title="${l.name}: ${st}">${ab[st]}</button></td>`; }).join('')}<td>${Math.round(ls.filter(l => stOf(l, c) === 'Achieved').length / ls.length * 100)}%</td></tr>`).join('')}</tbody></table></div><p class="xs muted">Key: A = Achieved · IP = In Progress · AR = Action Required · PD = Added to PD · NS = Not Started. Click a cell to see the evidence.</p></section>`;
}
ACT.hmBy = el => { setUi('hmBy', el.dataset.b); render(); };
ACT.hmCell = el => { const L = myLearners(true).find(l => l.lid === el.dataset.l), c = withW('C', () => allCrit()).find(x => x.code === el.dataset.c); openModal({ title: `${c.code} — ${esc(L.name)}`, body: `<p>${esc(c.d)}</p><p>${critType(c.type)} ${chip(el.title.split(': ').pop())}</p><p class="small">Evidence: ${esc(c.src || 'Assignment / observation per programme plan')}</p>${lockNote()}`, actions: [{ label: 'Open learner', cls: 'btn', fn: () => go('c-learner', { id: L.lid, tab: 'progress' }) }, { label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- 6.6 Timeline & Calendar ---------- */
SCREENS['c-timeline'] = (p) => {
  const t = p.tab || 'gantt', bs = scopeBatches();
  const head = pageA('Timeline & Calendar', 'You own your batches\' timeline: edit session dates, deadlines, resource release dates and milestones. Changes are versioned, audited and learners are notified.', `<button class="btn" data-act="cooIcal">${ic('link', 15)}Subscribe (iCal)</button>`);
  const note = S.coo.mode === 'D1' ? `<div class="note b-grey">${ic('info')}<div class="small"><strong>Events are changed at their source by the Academy administration.</strong> Use "Request a change" to ask the Academic Admin.</div></div>` : `<div class="note b-amber">${ic('edit')}<div class="small"><strong>You own this batch timeline</strong>. You can change session dates, whole-batch deadlines, resource release dates and milestones for your own batches. Per-learner extensions stay with admins.</div></div>`;
  const st = subtabs([['gantt', 'Batch timeline'], ['calendar', 'Calendar'], ['log', 'Change log']], t, 'c-timeline');
  if (t === 'calendar') return head + note + st + cooCalendar(bs);
  if (t === 'log') return head + st + changeLog();
  return head + note + st + bs.map(ganttFor).join('');
};
function ganttFor(b) {
  const s = new Date(b.start).getTime(), e = new Date(b.end).getTime(), span = e - s, pos = iso => Math.max(0, Math.min(100, (new Date(iso).getTime() - s) / span * 100));
  const units = STORE.worlds.C.tree.slice(0, 7), uw = 100 / units.length;
  const evs = batchEvents(b);
  const row = (label, inner) => `<div class="g-row"><div class="g-l small">${label}</div><div class="g-track">${inner}</div></div>`;
  const ed = (ev) => !roBatch(b) && ev.type !== 'pd' ? `data-act="cooEditEv" data-b="${b.code}" data-id="${ev.id}"` : `data-act="cooEvPop" data-b="${b.code}" data-id="${ev.id}"`;
  return `<section class="card"><div class="row-b"><h2>${esc(b.label)} <span class="mono small">${b.code}</span></h2><span class="small">${fd(b.start)} – ${fd(b.end)}</span></div><div class="gantt" role="img" aria-label="Timeline for ${esc(b.label)}">
    ${row('Units', units.map((u, k) => `<span class="g-bar" style="left:${k * uw}%;width:${uw - 0.6}%" title="${u.code} ${esc(u.title)}">${u.code}</span>`).join(''))}
    ${['class', 'deadline', 'obs', 'pd', 'mile'].map(ty => row(EVLBL[ty], evs.filter(x => x.type === ty).map(x => `<button class="g-dot lg-${ty}" style="left:${pos(x.start)}%" ${ed(x)} title="${esc(x.title)} · ${fdt(x.start)}" aria-label="${esc(x.title)}, ${fdt(x.start)}"></button>`).join(''))).join('')}
    <div class="g-row"><div class="g-l"></div><div class="g-track g-now"><span style="left:${pos(now().toISOString())}%" title="Today"></span></div></div></div>
    <div class="legend">${Object.entries(EVLBL).map(([k, l]) => `<span><i class="lg-${k}"></i>${l}</span>`).join('')}<span>│ Today</span></div>
    <div class="tbl-wrap"><table class="tbl dense"><tbody>${evs.sort((x, y) => new Date(x.start) - new Date(y.start)).map(x => `<tr><td class="nowrap small">${fds(x.start)} ${ft(x.start)}</td><td>${chip(EVLBL[x.type], 'outline')}</td><td>${esc(x.title)}${x.updated ? ` ${chip('Updated', 'amber')}` : ''}${x.title.includes('extended') ? ' ' + chip('Extended', 'green') : ''}</td><td class="small">${esc(x.teacher || '')}</td><td>${!roBatch(b) && x.type !== 'pd' ? `<button class="btn btn-sm" data-act="cooEditEv" data-b="${b.code}" data-id="${x.id}">Edit</button>` : `<span class="xs muted">${x.type === 'pd' ? 'Set by the Assessor' : 'Read-only (batch closed)'}</span>`}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function changeLog() { const rows = STORE.coo.changes; return `<section class="card"><h2>Change log</h2>${dt({ id: 'lu-h-cchg', name: 'Change log', rows, noExport: true, rid: r => r[1] + r[2], cols: [{ k: 'who', l: 'Who', v: r => r[0] }, { k: 'what', l: 'What', v: r => r[2] }, { k: 'on', l: 'Old → new', h: r => `<span class="small"><span class="strike">${esc(r[3])}</span> → <strong>${esc(r[4])}</strong></span>`, v: r => r[3] + ' ' + r[4] }, { k: 'when', l: 'When', h: r => `<span class="small">${fdt(r[1])}</span>`, v: r => r[1] }, { k: 'reason', l: 'Reason', h: r => `<span class="small">${esc(r[5])}</span>`, v: r => r[5] }] })}</section>`; }
function cooCalendar(bs) {
  const view = ui('ccView', 'month'), evs = bs.flatMap(b => batchEvents(b).map(e => ({ ...e, b })));
  const today = keyOf(now().toISOString()), anchor = ui('ccDate', today);
  const evsOn = k => evs.filter(e => keyOf(e.start) === k);
  const evBtn = e => `<button class="ev ev-${e.type}" data-act="cooEvPop" data-b="${e.b.code}" data-id="${e.id}"><i aria-hidden="true"></i><span class="t">${esc(e.title)}</span></button>`;
  let grid;
  if (view === 'month') { const [y, m] = anchor.split('-').map(Number), first = `${y}-${String(m).padStart(2, '0')}-01`, st = kMon(first); const cells = []; for (let i = 0; i < 42; i++) { const k = kAdd(st, i); if (i >= 35 && +k.slice(5, 7) !== m) break; cells.push(k); } grid = `<h3>${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(kDate(first))}</h3><div class="cal-grid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('')}${cells.map(k => `<div class="cal-cell ${+k.slice(5, 7) !== m ? 'out' : ''} ${k === today ? 'today' : ''}"><span class="dnum">${+k.slice(8)}</span>${evsOn(k).map(evBtn).join('')}</div>`).join('')}</div>`; }
  else { const n = view === 'week' ? 7 : view === 'day' ? 1 : 30, start = view === 'week' ? kMon(anchor) : anchor; const ks = Array.from({ length: n }, (_, i) => kAdd(start, i)); grid = ks.map(k => evsOn(k).length || view !== 'agenda' ? `<section class="card" style="gap:4px"><h3>${fdl(k + 'T12:00:00Z')}</h3>${evsOn(k).map(e => `<div class="row small">${evBtn(e)}<span>${ft(e.start)} · ${esc(e.b.label)}</span></div>`).join('') || '<span class="xs muted">No events</span>'}</section>` : '').join(''); }
  return `<div class="row-b"><div class="row"><button class="btn btn-sm" data-act="ccNav" data-d="0">Today</button><button class="icon-btn" data-act="ccNav" data-d="-1" aria-label="Previous">${ic('back')}</button><button class="icon-btn" data-act="ccNav" data-d="1" aria-label="Next">${ic('chev')}</button>${calJump('ccDate', anchor)}<span class="chip t-outline">${tzl()}</span></div><div class="seg" role="group" aria-label="View">${[['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['agenda', 'Agenda']].map(([k, l]) => `<button aria-pressed="${view === k}" data-act="ccView" data-v="${k}">${l}</button>`).join('')}</div></div><div class="legend">${Object.entries(EVLBL).map(([k, l]) => `<span><i class="lg-${k}"></i>${l}</span>`).join('')}</div><div class="card pad0" style="overflow:hidden">${grid}</div>`;
}
ACT.ccView = el => { setUi('ccView', el.dataset.v); render(); };
ACT.ccNav = el => { const d = +el.dataset.d, v = ui('ccView', 'month'), today = keyOf(now().toISOString()); if (!d) { setUi('ccDate', today); return render(); } const a = ui('ccDate', today); if (v === 'month') { const [y, m] = a.split('-').map(Number); setUi('ccDate', new Date(Date.UTC(y, m - 1 + d, 1)).toISOString().slice(0, 10)); } else setUi('ccDate', kAdd(a, d * (v === 'week' ? 7 : v === 'day' ? 1 : 30))); render(); };
function findEv(code, id) { const b = ADMIN.batches.find(x => x.code === code); return { b, e: batchEvents(b).find(x => x.id === id) }; }
ACT.cooEvPop = el => { const { b, e } = findEv(el.dataset.b, el.dataset.id); openModal({ title: esc(e.title), sub: `${EVLBL[e.type]} · ${esc(b.label)}`, body: `<dl class="kv"><dt>When</dt><dd>${fdl(e.start)}, ${ft(e.start)}</dd>${e.teacher ? `<dt>Teacher</dt><dd>${esc(e.teacher)}</dd>` : ''}${e.link ? `<dt>Zoom</dt><dd class="mono small">${esc(e.link)}</dd>` : ''}${e.loc ? `<dt>Location</dt><dd>${esc(e.loc)}</dd>` : ''}${e.go ? `<dt>Linked item</dt><dd>${esc(e.go)}</dd>` : ''}</dl>`, actions: [...(!roBatch(b) && e.type !== 'pd' ? [{ label: 'Edit', cls: 'btn', fn: () => { setTimeout(() => ACT.cooEditEv(el), 0); } }] : []), { label: 'Close', cls: 'btn-primary' }] }); };
ACT.cooEditEv = el => {
  const { b, e } = findEv(el.dataset.b, el.dataset.id);
  const old = e.start.slice(0, 16);
  openModal({ title: `Edit ${EVLBL[e.type].toLowerCase()}`, sub: esc(e.title) + ' · ' + esc(b.label), body: `<dl class="kv"><dt>Current</dt><dd>${fdt(e.start)}</dd></dl><div class="field"><label for="ee-n">New date and time (${tzl()})</label><input class="input" type="datetime-local" id="ee-n" value="${old}" data-oninput="eeConf" data-b="${b.code}" data-id="${e.id}"></div><div id="ee-c"></div><div class="field"><label for="ee-r">Reason (required)</label><textarea class="textarea" id="ee-r"></textarea></div><label class="check"><input type="checkbox" id="ee-notify" checked> Notify affected learners</label><p class="xs muted">Versioned and audited. ${e.type === 'deadline' ? 'Applies to the whole batch; per-learner extensions stay with admins.' : ''}</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Save change', cls: 'btn-primary', fn: () => {
      const nv = $('#ee-n').value, r = mval('#ee-r'); if (!r) { fieldErr('#ee-r', 'Enter a reason'); return false; }
      const iso = new Date(nv + ':00Z').toISOString(), notify = $('#ee-notify').checked;
      STORE.coo.changes.unshift([CME().name, now().toISOString(), `${EVLBL[e.type]} — ${e.title} (${b.code})`, fdt(e.start), fdt(iso), r]);
      const wv = batchEvSet(b, e, iso);
      if (wv && notify) notifyLearner(wv, 'Schedule', 'Schedule changed', `${e.title} moved to ${fdt(iso)}.`, 'calendar');
      cooLog('Scheduling', `${b.code} · ${e.title}`, 'Timeline edited', fdt(e.start), fdt(iso), r);
      render(); toast(`Saved as a new version.${notify ? ' Learners notified.' : ''}`);
    } }] });
};
INP.eeConf = el => { const { b } = findEv(el.dataset.b, el.dataset.id); const day = el.value.slice(0, 10); const clash = batchEvents(b).some(x => x.id !== el.dataset.id && x.type === 'class' && keyOf(x.start) === day); $('#ee-c').innerHTML = clash ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Conflict:</strong> this overlaps with another session for this batch/teacher on the same day.</div></div>` : `<p class="small" style="color:var(--green)">✓ No conflicts</p>`; };
ACT.cooReq = el => cooComposeModal({ to: ACAD_ADMIN, subject: 'Request change: ' + el.dataset.what, body: `Please could we change: ${el.dataset.what}\n\nReason: `, tag: 'Request change' });
ACT.cooIcal = () => openModal({ title: 'Subscribe (iCal)', body: `<p>Events for your batches only. Works with Outlook and Apple Calendar. Google Calendar sync isn't available.</p><div class="field"><label for="cical">Feed URL</label><input class="input mono" id="cical" readonly value="https://illumin-academy.example/ical/coord-st007-91ab.ics"></div>`, actions: [{ label: 'Close' }, { label: 'Copy link', cls: 'btn-primary', fn: () => { copyText('https://illumin-academy.example/ical/coord-st007-91ab.ics', 'iCal link copied'); return false; } }] });

/* ---------- 6.7 Modules & Content ---------- */
SCREENS['c-modules'] = () => `${pageA('Modules & Content', 'Change resource release dates for your batches. NVQ structure, criteria mapping and assignment briefs are set by the Academy administration — use "Request a change" for those.')}${scopeBatches().map(modulesFor).join('')}`;
function modulesFor(b) {
  const tree = STORE.worlds.C.tree, asg = BASE_ASGS(), res = ADMIN.resources, rel = STORE.coo.released;
  const mapped = new Set(asg.flatMap(a => a.crit.map(c => c[0]))), crit = withW('C', () => allCrit());
  return `<section class="card"><div class="row-b"><h2>${esc(b.label)} · ${esc(b.course)}</h2><span class="typebadge">Structure Version 2</span></div>
  ${tree.slice(0, 7).map(u => `<details class="card flat"><summary class="strong" style="cursor:pointer"><span class="code">${u.code}</span> ${esc(u.title)}</summary>${u.mods.map(m => { const as = asg.filter(a => a.unit.startsWith(u.code)); const rs = res.filter(r => r.map.startsWith(u.code)); return `<h4>${m.code} · ${esc(m.title)}</h4><p class="small muted">${m.los.map(l => l.title).join('; ')}</p>
    ${as.length ? `<table class="tbl dense"><tbody>${as.map(a => `<tr><td>${esc(a.title)}</td><td class="small">Due ${fdt(a.due)}</td><td>${chip('Published', 'green')}</td><td class="small">${a.crit.length} criteria</td><td class="small">${esc(MARKER(b))}</td><td><button class="btn btn-sm" data-act="cooBrief" data-id="${a.id}">View brief</button></td></tr>`).join('')}</tbody></table>` : ''}
    ${rs.length ? `<table class="tbl dense"><tbody>${rs.map(r => { const o = rel[b.code + r.id] || {}; return `<tr><td>${esc(r.title)}</td><td class="small">${r.type}</td><td class="small">${esc(o.release || r.release)}</td><td class="small">v${r.version}</td><td>${chip(o.status || r.status, (o.status || r.status) === 'Published' ? 'green' : 'amber')}</td><td class="nowrap"><button class="btn btn-sm" data-act="cooRes" data-id="${r.id}">View</button>${!roBatch(b) ? ` <button class="btn btn-sm" data-act="cooRel" data-b="${b.code}" data-id="${r.id}">Edit release</button>` : ''}</td></tr>`; }).join('')}</tbody></table>` : ''}`; }).join('')}</details>`).join('')}
  <h3>Criteria coverage</h3><p class="small">${crit.filter(c => c.type === 'Knowledge' && mapped.has(c.code)).length} of ${crit.filter(c => c.type === 'Knowledge').length} knowledge criteria covered by assignments. Uncovered: ${crit.filter(c => c.type === 'Knowledge' && !mapped.has(c.code)).map(c => `<span class="code">${c.code}</span>`).join(' ') || 'none'}</p>${lockNote('NVQ structure, criteria, mappings and briefs are edited by the Academy administration')} <button class="btn btn-sm btn-ghost" data-act="cooReq" data-what="${esc('NVQ structure / criteria mapping / assignment briefs · ' + b.code)}">Request a change</button></section>`;
}
ACT.cooBrief = el => { const a = BASE_ASGS().find(x => x.id === el.dataset.id); openModal({ title: esc(a.title), size: 'lg', body: `<div class="small">${a.brief}</div><h3>Questions</h3><ol class="small">${a.qs.map(q => `<li>${esc(q.text)}</li>`).join('')}</ol><h3>Version history</h3><ul class="list small"><li class="li">Version ${a.briefUpdated ? 2 : 1} · ${fd(a.briefUpdated || D(-60))} · current</li>${a.briefUpdated ? `<li class="li">Version 1 · ${fd(D(-12))}</li>` : ''}</ul>${lockNote('Briefs are read-only for coordinators')}`, actions: [{ label: 'Request a change', fn: () => { setTimeout(() => ACT.cooReq({ dataset: { what: 'Brief — ' + a.title } }), 0); } }, { label: 'Close', cls: 'btn-primary' }] }); };
ACT.cooRes = el => { const r = ADMIN.resources.find(x => x.id === el.dataset.id); openModal({ title: esc(r.title), size: 'lg', body: r.type.includes('video') ? `<div class="viewer"><div class="video"><button class="play" aria-label="Play">${ic('play', 28)}</button></div></div>` : r.type === 'SCORM' ? `<div class="viewer"><div class="scorm"><h3>SCORM preview</h3><p>Preview mode — no tracking recorded.</p></div></div>` : `<div class="viewer"><div class="pdf-pages"><div class="pdf-page"><strong>${esc(r.title)}</strong>${Array.from({ length: 10 }, (_, k) => `<div class="ln" style="width:${60 + k * 7 % 35}%"></div>`).join('')}</div></div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
ACT.cooRel = el => { const r = ADMIN.resources.find(x => x.id === el.dataset.id), k = el.dataset.b + r.id, o = STORE.coo.released[k] || {}; openModal({ title: `Edit resource release`, sub: esc(r.title) + ' · ' + el.dataset.b, body: `<p class="small">Current: <strong>${esc(o.release || r.release)}</strong> · ${o.status || r.status}</p><div class="field"><label for="rr-c">Release condition</label><select class="select" id="rr-c"><option>Immediate</option><option>On a date</option><option>After Module 1 complete</option></select></div><div class="field"><label for="rr-d">Release date</label><input class="input" type="date" id="rr-d" value="${D(7).slice(0, 10)}"></div><div class="field"><label for="rr-s">Status for this batch</label><select class="select" id="rr-s"><option>Published</option><option>Unpublished</option></select></div><div class="field"><label for="rr-r">Reason (required)</label><textarea class="textarea" id="rr-r"></textarea></div><label class="check"><input type="checkbox" checked> Notify affected learners</label>`, actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => { const why = mval('#rr-r'); if (!why) { fieldErr('#rr-r', 'Enter a reason'); return false; } const c = mval('#rr-c'), nr = c === 'On a date' ? 'Date: ' + fd(new Date(mval('#rr-d')).toISOString()) : c; STORE.coo.released[k] = { release: nr, status: mval('#rr-s') }; STORE.coo.changes.unshift([CME().name, now().toISOString(), 'Resource release — ' + r.title + ' (' + el.dataset.b + ')', o.release || r.release, nr + ' · ' + mval('#rr-s'), why]); cooLog('Learning Resources', r.title + ' · ' + el.dataset.b, 'Release changed (D2)', o.release || r.release, nr, why); render(); toast('Release updated — versioned and audited.'); } }] }); };

/* ---------- 6.8 Observations & PD ---------- */
SCREENS['c-obs'] = () => `${pageA('Observations & PD', 'Oversight only')}${obsSection(scopeBatches())}`;
function obsSection(bs) {
  const rows = [];
  bs.forEach(b => (b.coh || []).forEach((e, k) => {
    if (e.v) { const w = STORE.worlds[e.v]; w.observations.forEach(o => rows.push({ id: o.id + e.v, learner: VNAME(e.v), lid: w.me.id, assessor: o.assessor, at: o.newAt || o.at, loc: o.loc, locType: o.locType, scope: o.scope, status: o.status, perm: w.workplace.perm === 'Permission Pending' ? 'Pending' : w.workplace.perm, b })); }
    else if (['In Progress', 'Completed'].includes(b.status) && k % 2 === 0) { const L = ADMIN.learners.find(x => x.id === e.lid); const st = ['Proposed', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'][e.seed % 5]; rows.push({ id: e.lid + b.code, learner: L.name, lid: L.id, assessor: (b.alloc && b.alloc.obs) || b.assessors[0], at: D(-20 + e.seed % 30, '09:00'), loc: ['Meadowview Care Home (demo)', 'Rosewood Lodge (demo)', 'Oak Tree Care (demo)'][e.seed % 3], scope: 'U301 2.1–2.3 · IA-1–IA-4', status: st, perm: ['Granted', 'Pending', 'Declined', 'Expired', 'Escalated'][e.seed % 5], b }); }
  }));
  const blocking = rows.filter(r => ['Pending', 'Declined', 'Expired', 'Escalated'].includes(r.perm));
  return dt({ id: 'cobs-' + bs.map(b => b.code).join(''), name: 'Observations', rows, filters: [{ k: 's', l: 'Status', get: r => r.status, opts: ['Proposed', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'] }, { k: 'p', l: 'Permission', get: r => r.perm, opts: ['Pending', 'Granted', 'Declined', 'Expired', 'Escalated'] }], cols: [{ k: 'learner', l: 'Learner' }, { k: 'assessor', l: 'Assessor' }, { k: 'at', l: 'Date', h: r => fdt(r.at), s: r => r.at }, { k: 'loc', l: 'Location', h: r => `<span class="small">${r.locType === 'office' ? chip('Academy office', 'blue') + ' ' + chOfficeTxt(r) /* CH-34 */ : chip('Workplace', 'outline') + ' ' + esc(r.loc)}</span>`, v: r => (r.locType === 'office' ? 'Academy office ' : 'Workplace ') + r.loc }, { k: 'scope', l: 'Scope', h: r => `<span class="small">${esc(r.scope)}</span>` }, { k: 'status', l: 'Status', h: r => chip(r.status) }, { k: 'perm', l: 'Workplace permission', h: r => chip(r.perm, { Granted: 'green', Pending: 'amber', Declined: 'red', Expired: 'grey', Escalated: 'red' }[r.perm]) }], empty: 'No observations scheduled' })
    + `<p class="xs muted">${ic('lock', 12)} Observations are scheduled by the Assessor or an Administrator.</p>
    <section class="card"><h2>Permissions blocking observations</h2><ul class="list">${blocking.map(r => `<li class="li"><div class="li-b"><strong>${esc(r.learner)}</strong><span class="xs muted">${esc(r.loc)} · ${r.perm}</span></div><button class="btn btn-sm" data-act="cooCompose" data-to="${esc(r.learner)} (Learner)" data-l="${r.lid}">Message learner</button></li>`).join('') || '<li class="small muted">None.</li>'}</ul></section>
    <section class="card"><h2>PD overview</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Items Added to PD</th><th>PD session</th><th>Outcome</th></tr></thead><tbody>${bs.flatMap(b => (b.coh || []).filter(e => e.v || e.pd.length).map(e => e.v ? `<tr><td>${VNAME(e.v)}</td><td>${STORE.worlds[e.v].pd.items.filter(i => i.status === 'Open').length} open</td><td>${fdt(STORE.worlds[e.v].pd.session.at)} ${chip(STORE.worlds[e.v].pd.session.status, STORE.worlds[e.v].pd.session.status === 'Proposed' ? 'amber' : 'blue')}</td><td>—</td></tr>` : `<tr><td>${esc(ADMIN.learners.find(x => x.id === e.lid).name)}</td><td>1 open</td><td>${fdt(D(14 + e.seed % 10, '10:00'))} ${chip(['Proposed', 'Confirmed', 'Postponed'][e.seed % 3], 'blue')}</td><td>${e.seed % 4 === 0 ? chip('Achieved') : '—'}</td></tr>`)).join('')}</tbody></table></div></section>`;
}

/* ---------- 6.9 Attendance ---------- */
SCREENS['c-attendance'] = () => `${pageA('Attendance', '', exportMenu('Coordinator attendance'))}${attSection(scopeBatches())}`;
function attSection(bs) {
  const ls = myLearners(true).filter(l => bs.includes(l.batch) && l.att != null);
  const sess = bs.filter(b => ['In Progress', 'Completed'].includes(b.status)).flatMap(b => STORE.worlds.C.attendance.map((r, k) => ({ id: b.code + k, b, session: r.session, at: r.at, teacher: b.teachers[0], dur: r.dur, manual: r.manual, counts: [Math.round(b.enrolled * 0.7), 2 + k % 2, 1 + k % 3, Math.max(0, b.enrolled - Math.round(b.enrolled * 0.7) - 3 - k % 2 - k % 3)] })));
  if (!sess.length) return `<div class="card"><div class="empty"><p>No sessions have run yet.</p></div></div>`;
  return `${dt({ id: 'catt-' + bs.map(b => b.code).join(''), name: 'Sessions', rows: sess, cols: [{ k: 'at', l: 'Date', h: s => fdt(s.at), s: s => s.at }, { k: 'session', l: 'Session' }, { k: 'b', l: 'Batch', v: s => s.b.label }, { k: 'teacher', l: 'Teacher' }, { k: 'dur', l: 'Duration', h: s => s.dur + ' min' }, { k: 'c', l: 'Present / Late / Partial / Absent', h: s => `${chip('Present ' + s.counts[0], 'green')} ${chip('Late ' + s.counts[1], 'amber')} ${chip('Partial ' + s.counts[2], 'redor')} ${chip('Absent ' + s.counts[3], 'red')}`, nosort: 1 }, { k: 'manual', l: 'Manual', h: s => s.manual ? chip('Manual', 'outline') : '—' }], act: s => `<button class="btn btn-sm" data-act="cooReg" data-b="${s.b.code}">Register</button>` })}
  <section class="card"><h2>Per-learner attendance</h2><div class="tbl-wrap"><table class="tbl dense"><tbody>${ls.map(l => `<tr class="${l.att < 80 ? 'row-esc' : ''}"><td>${esc(l.name)}</td><td style="min-width:140px">${bar(l.att, l.name)}</td><td>${l.att < 80 ? chip('Below programme minimum (80%)', 'redor') : chip('Meets minimum', 'green')}</td></tr>`).join('')}</tbody></table></div></section>`;
}
ACT.cooReg = el => { const b = ADMIN.batches.find(x => x.code === el.dataset.b), ls = myLearners(true).filter(l => l.batch === b); openModal({ title: 'Session register (read-only)', size: 'lg', body: `<table class="tbl dense"><tbody>${ls.map((l, k) => `<tr><td>${esc(l.name)}</td><td>${chip(['Present', 'Present', 'Late', 'Partial', 'Absent', 'Present'][k % 6])}</td><td>${k % 7 === 3 ? chip('Manual', 'outline') : ''}</td></tr>`).join('')}</tbody></table>${lockNote('Adjustments are made by the Teacher or an Administrator')}`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- 6.10 Messages ---------- */
SCREENS['c-messages'] = (p) => {
  const ts = cooThreads(), cur = p.id && ts.find(t => t.id === p.id);
  if (cur) { cur.seen = cur.msgs.length; if (cur.lthread) cur.lthread._cooSeen = cur.msgs.length; else STORE.coo.threads.find(t => t.id === cur.id).seen = cur.msgs.length; }
  return `${pageA('Messages', 'Retained and auditable — messages can\'t be deleted.', `<button class="btn btn-primary" data-act="cooCompose">${ic('plus', 15)}New message</button>`)}
  <div class="msg-layout ${cur ? 'has-thread' : ''}"><div class="thread-list">${thBar('C', ts)}${thx('C', ts).map(t => `<button class="thread-item" data-go="c-messages" data-id="${t.id}" ${cur && cur.id === t.id ? 'aria-current="true"' : ''}><span class="ti-top">${unreadT(t) ? '<span class="unread-dot" style="margin:0"></span><span class="sr">Unread</span>' : ''}<span class="ti-sub">${esc(t.subject)}</span>${t.tag ? chip(t.tag, 'blue') : ''}</span><span class="xs muted">${esc(t.with.join(', '))}</span><span class="ti-last">${esc(t.msgs[t.msgs.length - 1][2])}</span></button>`).join('') || '<div class="empty"><p>No messages yet.</p></div>'}</div>
  <div class="chat">${cur ? `<div class="chat-h"><button class="btn btn-sm btn-ghost" data-go="c-messages" style="justify-self:start">${ic('back', 14)}All messages</button><h2>${esc(cur.subject)}</h2><div class="row"><span class="small muted">With ${esc(cur.with.join(', '))}</span>${cur.learner ? `<button class="btn btn-sm" data-act="cooFwd" data-id="${cur.id}">Forward to Academy admin</button>` : ''}</div></div><div class="chat-b">${cur.msgs.map((m, k) => `<div class="bubble ${m[0] === CME().name ? 'me' : ''}"><span class="b-meta"><strong>${esc(m[0])}</strong> · ${fdt(m[1])}</span><span>${esc(m[2])}</span></div>`).join('')}</div><form class="chat-f" data-submit="cooReply" data-id="${cur.id}"><label class="sr" for="crep">Reply</label><textarea class="textarea" id="crep" rows="2" style="min-height:44px"></textarea><label class="icon-btn" aria-label="Attach">${ic('clip2')}<input type="file" class="sr"></label><button class="btn btn-primary" type="submit">${ic('send', 15)}Send</button></form>` : `${msgPaneEmpty(STORE.coo.threads, 'c-messages', 'cooCompose')}`}</div></div>`;
};
SUBMIT.cooReply = f => { const v = $('#crep').value.trim(); if (!v) return fieldErr('#crep', 'Write a reply'); const t = cooThreads().find(x => x.id === f.dataset.id); if (t.lthread) { t.lthread.msgs.push({ me: false, from: CME().name, at: now().toISOString(), text: v }); t.lthread.unread = true; t.lthread._cooSeen = t.lthread.msgs.length; } else { const s = STORE.coo.threads.find(x => x.id === t.id); s.msgs.push([CME().name, now().toISOString(), v]); s.seen = s.msgs.length; } cooLog('Messages', t.subject, 'Message sent', '—', t.with.join(', '), ''); render(); toast('Message sent.'); };
function cooRecipients() { const bs = myBatches(), r = []; bs.forEach(b => { b.teachers.forEach(x => r.push(x + ' (Teacher)')); b.assessors.forEach(x => r.push(x + ' (Assessor)')); }); myLearners(true).forEach(l => r.push(l.name + ' (Learner)')); return [...new Set(r)].concat([ACAD_ADMIN, SYS_ADMIN]); }
ACT.cooCompose = el => cooComposeModal({ to: el && el.dataset && el.dataset.to });
function cooComposeModal({ to, subject = '', body = '', tag = '' }) {
  const rs = cooRecipients();
  openModal({ title: tag === 'Request change' ? 'Request a change' : 'New message', body: `${tag ? chip(tag, 'blue') : ''}<div class="field"><label for="cm-to">To</label><select class="select" id="cm-to">${rs.map(r => `<option ${r === to ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><span class="hint">Learners in your batches, their teachers and assessors, and the Academy administration.</span></div><div class="field"><label for="cm-s">Subject</label><input class="input" id="cm-s" value="${esc(subject)}"></div><div class="field"><label for="cm-b">Message</label><textarea class="textarea" id="cm-b" rows="5">${esc(body)}</textarea></div><div class="field"><label for="cm-f">Attachment</label><input class="input" type="file" id="cm-f"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send', cls: 'btn-primary', fn: () => {
      const toV = mval('#cm-to'), s = mval('#cm-s'), b = mval('#cm-b'); if (!s) { fieldErr('#cm-s', 'Enter a subject'); return false; } if (!b) { fieldErr('#cm-b', 'Write your message'); return false; }
      const L = myLearners(true).find(l => toV === l.name + ' (Learner)');
      if (L && L.v) { STORE.worlds[L.v].threads.unshift({ id: 'tc' + Date.now(), subject: s, course: 'NVQ', with: [CME().name + ' (Academic Coordinator)'], unread: true, coo: CME().name, msgs: [{ me: false, from: CME().name, at: now().toISOString(), text: b }], _cooSeen: 1 }); notifyLearner(L.v, 'Other', 'New message', `${CME().name}: ${s}`, 'messages'); }
      else STORE.coo.threads.unshift({ id: 'CT-' + (10 + STORE.coo.threads.length), subject: s, with: [toV], tag, learner: !!L, owner: CME().name, msgs: [[CME().name, now().toISOString(), b]], seen: 1 });
      cooLog('Messages', s, tag || 'Message sent', '—', toV, ''); render(); toast(tag === 'Request change' ? 'Change request sent to the Academic Admin.' : 'Message sent.');
    } }] });
}
ACT.cooFwd = el => { const t = cooThreads().find(x => x.id === el.dataset.id); cooComposeModal({ to: ACAD_ADMIN, subject: 'Fwd: ' + t.subject, body: `Forwarding a learner query that's outside my scope:\n\n"${t.msgs[t.msgs.length - 1][2]}"`, tag: 'Forwarded' }); };

/* ---------- 6.11 Announcements [TBD] ---------- */
SCREENS['c-announcements'] = () => `${pageA('Announcements', 'Audience limited to your batches', `<button class="btn btn-primary" data-act="cooAnn">${ic('plus', 15)}New announcement</button>`)}
  ${dt({ id: 'cann', name: 'Announcements', rows: STORE.coo.anns.filter(a => a.by === CME().name), cols: [{ k: 'title', l: 'Title', h: a => `<strong>${esc(a.title)}</strong>` }, { k: 'aud', l: 'Audience' }, { k: 'ch', l: 'Channels', v: a => a.ch.join(', ') }, { k: 'status', l: 'Status', h: a => chip(a.status, { Draft: 'grey', Scheduled: 'blue', Published: 'green', Expired: 'grey', Withdrawn: 'red' }[a.status]) }, { k: 'at', l: 'Date', h: a => fd(a.at), s: a => a.at }], act: a => a.status === 'Published' ? `<button class="btn btn-sm" data-act="cooAnnSt" data-id="${a.id}" data-s="Withdrawn">Withdraw</button>` : a.status === 'Scheduled' ? `<button class="btn btn-sm" data-act="cooAnnSt" data-id="${a.id}" data-s="Draft">Cancel before dispatch</button>` : '', empty: 'No announcements yet' })}`;
ACT.cooAnnSt = el => reasonDlg({ title: el.dataset.s === 'Withdrawn' ? 'Withdraw announcement' : 'Cancel scheduled announcement', ok: el.dataset.s === 'Withdrawn' ? 'Withdraw announcement' : 'Cancel announcement', onOk: r => { const a = STORE.coo.anns.find(x => x.id === el.dataset.id); cooLog('Announcements', a.title, el.dataset.s, a.status, el.dataset.s, r); a.status = el.dataset.s; render(); } });
ACT.cooAnn = () => openModal({ title: `New announcement`, size: 'lg', body: `<div class="field"><label for="ca-t">Title</label><input class="input" id="ca-t" value="Reminder: bring your reflective log"></div><div class="field"><label for="ca-b">Message</label><textarea class="textarea" id="ca-b">Please bring your reflective log to Thursday's class.</textarea></div><div class="field"><label for="ca-f">Attachment</label><input class="input" type="file" id="ca-f"></div><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Audience (my batches only)</legend>${myBatches().map((b, k) => `<label class="check small"><input type="checkbox" class="ca-b" value="${b.code}" ${k === 0 ? 'checked' : ''}>${esc(b.label)} (${b.enrolled})</label>`).join('')}</fieldset><div class="row"><label class="check small"><input type="checkbox" checked>In-app</label><label class="check small"><input type="checkbox" checked>Email</label><label class="check small"><input type="checkbox">SMS</label></div><div class="field"><label for="ca-w">Timing</label><select class="select" id="ca-w"><option value="now">Send now</option><option value="sched">Schedule</option></select></div>`,
  actions: [{ label: 'Preview', cls: 'btn', fn: () => { toast('Preview: ' + mval('#ca-t'), 'info'); return false; } }, { label: 'Publish', cls: 'btn-primary', fn: () => { const codes = $$('.ca-b:checked').map(x => x.value); if (!codes.length) { toast('Choose at least one batch.', 'err'); return false; } const sched = mval('#ca-w') === 'sched', title = mval('#ca-t'); STORE.coo.anns.unshift({ id: 'CA-' + (10 + STORE.coo.anns.length), title, aud: codes.map(c => ADMIN.batches.find(b => b.code === c).label).join(', '), ch: ['In-app', 'Email'], status: sched ? 'Scheduled' : 'Published', at: now().toISOString(), by: CME().name }); if (!sched) codes.forEach(c => (ADMIN.batches.find(b => b.code === c).coh || []).filter(e => e.v).forEach(e => { STORE.worlds[e.v].announcements.unshift({ id: 'ca' + Date.now(), title, from: CME().name, kind: 'Teacher', at: now().toISOString(), body: mval('#ca-b') }); notifyLearner(e.v, 'Other', 'New announcement', title, 'messages..announcements'); })); cooLog('Announcements', title, sched ? 'Scheduled' : 'Published', 'Draft', codes.join(', '), ''); render(); toast(sched ? 'Scheduled.' : 'Published to your batches.'); } }] });

/* ---------- 6.12 Notifications ---------- */
SCREENS['c-notifications'] = () => { const f = ui('cnf', 'All'), all = cooNotifs(), list = all.filter(n => f === 'All' || (f === 'Unread' ? n.unread : n.t.toLowerCase().includes(f.toLowerCase()))); return `${pageA('Notifications', '', `<button class="btn" data-act="cooReadAll">Mark all read</button>`)}${tabs(['All', 'Unread', 'Release', 'Submission', 'Schedule', 'Learner', 'Observation'].map(k => [k, k]), f, 'cnfTab', 'Filter')}${nfList('C', list, n => `<li class="li">${n.unread ? '<span class="unread-dot"></span><span class="sr">Unread</span>' : '<span class="read-dot"></span>'}<div class="li-b"><strong class="small">${esc(n.t)}</strong><span class="xs muted">${esc(n.b)} · ${fdt(n.at)}</span></div><button class="btn btn-sm btn-ghost" data-act="cooNRead" data-id="${n.id}">Mark ${n.unread ? 'read' : 'unread'}</button><button class="btn btn-sm" data-act="cooNOpen" data-id="${n.id}">Open</button></li>`)}`; };
ACT.cnfTab = el => { setUi('cnf', el.dataset.k); render(); };
function cooNSet(id, v) { const s = STORE.coo.notifs.find(x => x.id === id); if (s) s.unread = v; else S.coo.seen[id.slice(1)] = !v; }
ACT.cooNRead = el => { const n = cooNotifs().find(x => x.id === el.dataset.id); cooNSet(n.id, !n.unread); render(); };
ACT.cooNOpen = el => { const n = cooNotifs().find(x => x.id === el.dataset.id); cooNSet(n.id, false); ACT.goTok({ dataset: { t: n.go } }); };
ACT.cooReadAll = () => { cooNotifs().forEach(n => cooNSet(n.id, false)); render(); };

/* ---------- 6.13 Reports ---------- */
SCREENS['c-reports'] = () => `${pageA('Reports', 'My batches only. Every export is logged.')}${reportsSection(scopeBatches())}`;
function reportsSection(bs) {
  const ls = myLearners(true).filter(l => bs.includes(l.batch)), subs = mySubmissions(true).filter(s => bs.includes(s.L.batch) && s.at);
  return `<div class="grid-2"><section class="card"><div class="row-b"><h2>Batch progress</h2>${exportMenu('Batch progress report')}</div><table class="tbl dense"><tbody>${bs.map(b => { const x = ls.filter(l => l.batch === b); return `<tr><td>${esc(b.label)}</td><td>${x.length} learners</td><td style="min-width:120px">${bar(x.length ? Math.round(x.reduce((a, l) => a + l.progress, 0) / x.length) : 0, b.label)}</td><td>${x.filter(l => l.flags.includes('At risk')).length} at risk</td></tr>`; }).join('')}</tbody></table></section>
  <section class="card"><div class="row-b"><h2>Completion</h2>${exportMenu('Completion report')}</div><p class="small">Started ${ls.filter(l => l.progress > 0).length} · completed ${ls.filter(l => l.status === 'Completed').length} · expired 0 · discontinued ${ls.filter(l => l.status === 'Discontinued').length}</p></section>
  <section class="card"><div class="row-b"><h2>Attendance summary</h2>${exportMenu('Attendance summary')}</div><p class="small">Average ${ls.filter(l => l.att != null).length ? Math.round(ls.filter(l => l.att != null).reduce((a, l) => a + l.att, 0) / ls.filter(l => l.att != null).length) : 0}% · ${ls.filter(l => l.att != null && l.att < 80).length} below 80%</p></section>
  <section class="card"><div class="row-b"><h2>Assessment pipeline & turnaround</h2>${exportMenu('Pipeline report')}</div><p class="small">${subs.filter(s => ['Submitted'].includes(s.status)).length} awaiting marking · ${subs.filter(s => s.status === 'Completed').length} completed · aggregated per marker</p></section></div>
  <section class="card"><h2>Individual learner progress report (PDF)</h2><ul class="list">${ls.slice(0, 8).map(l => `<li class="li"><div class="li-b">${esc(l.name)}<span class="xs muted">${esc(l.batch.label)}</span></div><button class="btn btn-sm" data-act="cooPdf" data-n="${esc(l.name)}">Generate PDF</button></li>`).join('')}</ul></section>`;
}
/* ---------- D3: Bulk export of own batches' work ----------
   Scope is limited to myBatches(); IQA findings, IQA advisory notes, finance data and admission documents are never included.
   Every export is logged to the Super Admin audit log as "Coordinator bulk export". */
ACT.cooBulk = el => {
  const mine = myBatches(); if (!mine.length) { toast('You have no batches to export.', 'info'); return; }
  const st = el.dataset.from ? (dts(el.dataset.from) || { f: {} }) : { f: {} }, fB = st.f.b, fA = st.f.a;
  const pre = el.dataset.b ? [el.dataset.b] : fB ? mine.filter(b => b.label === fB).map(b => b.code) : mine.map(b => b.code);
  const subs = mySubmissions(true).filter(s => s.at), units = [...new Set(subs.map(s => s.a.unit))].filter(Boolean), asgs = [...new Set(subs.map(s => s.a.title))];
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(l)}</option>`;
  openModal({ title: 'Bulk export', sub: 'Your batches only', size: 'lg', body: `<fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Scope</legend>
    <div class="field"><span class="lbl">Batches</span><div class="row">${mine.map(b => `<label class="check small"><input type="checkbox" class="cb-b" value="${b.code}" ${pre.includes(b.code) ? 'checked' : ''}>${esc(b.label)} <span class="mono xs">${b.code}</span></label>`).join('')}</div></div>
    <div class="form-grid"><div class="field"><label for="cb-u">Unit / module</label><select class="select" id="cb-u">${opt('', 'All units')}${units.map(u => opt(u, u)).join('')}</select></div>
    <div class="field"><label for="cb-a">Assignment</label><select class="select" id="cb-a">${opt('', 'All assignments')}${asgs.map(a => opt(a, a, a === fA)).join('')}</select></div>
    <div class="field"><label for="cb-f">From</label><input class="input" type="date" id="cb-f"></div><div class="field"><label for="cb-t">To</label><input class="input" type="date" id="cb-t"></div>
    <div class="field"><label for="cb-r">Round</label><select class="select" id="cb-r">${opt('all', 'All rounds')}${opt('latest', 'Latest only')}</select></div></div></fieldset>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Contents</legend>
    <label class="check small"><input type="checkbox" class="cb-c" value="Learner submissions" checked> Learner submissions (all rounds, exact ink colours)</label>
    <label class="check small"><input type="checkbox" class="cb-c" value="Assessor RAG feedback and decisions" checked> Assessor RAG feedback and per-criterion decisions with verification stamps</label>
    <label class="check small"><input type="checkbox" class="cb-c" value="Coordinator feedback" checked> Coordinator feedback</label>
    <label class="check small"><input type="checkbox" class="cb-c" value="Observation records"> Observation records</label>
    <label class="check small"><input type="checkbox" class="cb-c" value="PD outcomes"> PD outcomes</label></fieldset>
    <div class="note b-grey">${ic('lock')}<div class="small"><strong>Always excluded:</strong> IQA findings, IQA advisory notes, finance data, admission documents.</div></div>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Format</legend><label class="check small"><input type="radio" name="cb-fmt" value="ZIP of PDFs + CSV index" checked> ZIP of PDFs plus a CSV index</label><label class="check small"><input type="radio" name="cb-fmt" value="CSV only"> CSV only</label></fieldset>
    <label class="check small"><input type="checkbox" id="cb-red"> Redact learner personal details</label>`,
    actions: [{ label: 'Cancel' }, { label: 'Start export', cls: 'btn-primary', fn: () => {
      const bs = $$('.cb-b:checked').map(x => x.value).filter(c => mine.some(b => b.code === c));
      if (!bs.length) { toast('Choose at least one of your batches.', 'err'); return false; }
      const u = mval('#cb-u'), a = mval('#cb-a'), f = mval('#cb-f'), t = mval('#cb-t'), rd = mval('#cb-r');
      if (f && t && f > t) { toast('"From" must not be after "To".', 'err'); return false; }
      const parts = $$('.cb-c:checked').map(x => x.value); if (!parts.length) { toast('Choose at least one thing to include.', 'err'); return false; }
      const fmt = ($('input[name="cb-fmt"]:checked') || {}).value, red = $('#cb-red').checked;
      const n = subs.filter(s => bs.includes(s.L.batch.code) && (!u || s.a.unit === u) && (!a || s.a.title === a) && (!f || s.at.slice(0, 10) >= f) && (!t || s.at.slice(0, 10) <= t)).length;
      const optsTxt = [u && 'unit ' + u, a && a, (f || t) && `dates ${f || '…'}–${t || '…'}`, rd === 'latest' ? 'latest round only' : 'all rounds', parts.join(', '), red ? 'redacted' : 'not redacted'].filter(Boolean).join(' · ');
      cooLog('Submissions & Feedback', bs.join(', '), 'Coordinator bulk export', '—', `${n} submissions · ${fmt}`, optsTxt);
      ADMIN.exportsLog.unshift({ who: CME().name, what: `Coordinator bulk export — ${bs.join(', ')} (${fmt}; ${optsTxt})`, at: now().toISOString() });
      toast('Preparing export — we\'ll notify you when it\'s ready. This export is logged.', 'info');
      setTimeout(() => { STORE.coo.notifs.unshift({ id: 'cn' + Date.now(), t: 'Export ready', b: `Bulk export — ${bs.join(', ')} · ${n} submissions · download link valid for 24 hours`, at: now().toISOString(), go: 'c-submissions', unread: true }); if (S.portal === 'coord') render(); }, 2000);
    } }] });
};
ACT.cooPdf = el => { cooLog('Reports', 'Progress report — ' + el.dataset.n, 'Exported', '—', 'PDF', ''); toast('Preparing export — we\'ll notify you. This export is logged.', 'info'); setTimeout(() => { STORE.coo.notifs.unshift({ id: 'cn' + Date.now(), t: 'Export ready', b: 'Progress report — ' + el.dataset.n, at: now().toISOString(), go: 'c-reports', unread: true }); if (S.portal === 'coord') render(); }, 2000); };

/* ---------- 6.14 My Profile ---------- */
SCREENS['c-profile'] = () => `${pageA('My Profile')}<div class="grid-2"><section class="card"><h2>Personal details</h2><dl class="kv"><dt>Name</dt><dd>${esc(CME().name)}</dd><dt>Email</dt><dd>${esc(CME().email)}</dd><dt>My roles</dt><dd>${CME().roles.map(r => chip(r, 'purple')).join(' ')}</dd></dl><p class="small muted">To change your details, contact the System Administrator. <button class="linklike" data-act="cooCompose" data-to="${SYS_ADMIN}">Message</button></p>
  <h3>Assigned batches</h3><ul class="list small">${myBatches().map(b => `<li class="li"><div class="li-b"><strong>${esc(b.label)}</strong><span class="xs muted">${b.code} · assigned ${fd((b.coordHistory || []).filter(h => h[0] === CME().name).pop()?.[1] || b.start)}</span></div></li>`).join('') || '<li class="small muted">None.</li>'}</ul></section>
  <section class="card"><h2>Change password</h2>${pwForm('ccp')}</section></div>${(() => { const rows = ADMIN.audit.filter(a => a.actor === CME().name); return `<section class="card"><h2>My recent activity</h2><ul class="list small">${rows.slice(0, 8).map(a => `<li class="li">${esc(a.action)} · ${esc(a.entity)} · ${fdt(a.at)}</li>`).join('') || '<li class="small muted">No activity yet.</li>'}</ul></section>`; })()}`;

/* ---------- Screen index (coordinator) + learner index section ---------- */
SCREENS['c-index'] = () => {
  const L = (l, t) => `<li><button class="linklike" data-act="goTok" data-t="${t}">${l}</button></li>`;
  return `${pageA('Coordinator screen index')}<section class="card idx-sec"><h2>Screens</h2><ul class="idx-list">${CNAV.map(([r, l]) => L(l, r)).join('')}${L('Batch detail — Leicester Cohort 7', 'c-batches.L3AC-JAN26')}${L('Assessment pipeline', 'c-batches.L3AC-JAN26.pipeline')}${L('Planned batch', 'c-batches.L2DC-JAN27')}${L('Learner record — Aisha', 'c-learner.IA-L-18022')}${L('Discontinued learner', 'c-learner.IA-L-30755')}${L('Submission + feedback panel — Aisha Assignment 4', 'c-sub.IA-L-18022~a4')}${L('Submission (resubmission rounds)', 'c-sub.IA-L-18022~a2')}${L('Submission (limit reached, amber ink)', 'c-sub.IA-L-18022~a7')}${L('Calendar', 'c-timeline..calendar')}${L('Change log', 'c-timeline..log')}${L('Outside-scope record (access denied)', 'c-learner.IA-L-24560')}<li><button class="linklike" data-act="cooBulk">Bulk export (dialog)</button></li></ul></section>
  <section class="card"><h2>Variants and edge states</h2><p class="small">Use Demo controls → Coordinator variant and Coordinator edge state.</p></section>`;
};
const _idx = SCREENS.index;
SCREENS.index = (p) => _idx(p) + `<section class="card idx-sec"><h2>Academic Coordinator</h2><ul class="idx-list"><li><button class="linklike" data-act="demoSignInAsCoord">Sign in as Academic Coordinator (demo) — no 2FA</button></li><li><button class="linklike" data-act="cooAuth" data-a="first">Staff first-time password → coordinator welcome</button></li><li><button class="linklike" data-act="cooIdxGo" data-t="c-sub.IA-L-18022~a4">Post coordinator feedback on Aisha's Assignment 4</button></li><li><button class="linklike" data-act="cooIdxGo" data-t="c-index">Coordinator screen index</button></li></ul></section>`;
ACT.cooIdxGo = el => { S.portal = 'coord'; S.signedIn = true; ACT.goTok({ dataset: { t: el.dataset.t } }); };

/* Sign-in screen demo shortcut (added beside existing buttons) */
AFTER.push(() => { const d = $('.demo-hint .row'); if (d && !S.signedIn && !d.querySelector('[data-act="demoSignInAsCoord"]')) d.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm" data-act="demoSignInAsCoord">Sign in as Academic Coordinator (demo)</button>'); });
