/* Academic Admin — a capability-filtered view of the admin console (same shell, same Approvals Queue, same modules).
   Shared upgrades (richer academic queue panels, batch wizard, cancel table, staff change) also apply to the Super Admin.
   New screens use the "k-" route prefix. No 2FA for this role. */
'use strict';

/* ---------- Identities (§3) ---------- */
const ACA_VARIANTS = {
  KA: { label: 'Academic Admin A (default)', staff: 'ST-009', roles: ['Academic Admin'], note: 'Rachel Hughes · main demo user' },
  KB: { label: 'Academic Admin B', staff: 'ST-019', roles: ['Academic Admin'], note: 'Joanne Lister · approves items raised by A' },
  KC: { label: 'Only one Academic Admin', staff: 'ST-009', roles: ['Academic Admin'], note: 'Joanne Lister deactivated — own items route to the Super Administrator', solo: true },
  KD: { label: 'Multi-role: Academic Admin + Assessor', staff: 'ST-009', roles: ['Academic Admin', 'Assessor'], note: 'Role switcher to the Assessor portal · self-approval block on own recommendation', multi: true },
};
const ACA_A = 'Rachel Hughes', ACA_B = 'Joanne Lister';
const ACA_TYPES = ['Extra quiz attempts', 'More time on short course', 'Resubmission limit reached', 'Discontinue enrolment — academic', 'Reactivate enrolment — academic'];
const isAca = () => !!(ADMIN && ADMIN.aca && S.portal === 'admin');
const otherAca = () => ADMIN.av === 'KC' ? null : ADMIN.me.name === ACA_A ? ACA_B : ACA_A;

const _setIdK = setAdminIdentity;
setAdminIdentity = function (av) {
  const A = ADMIN; if (!A) return;
  const jo = A.staff.find(s => s.id === 'ST-019'), ra = A.staff.find(s => s.id === 'ST-009');
  if (STORE.aca && ACA_VARIANTS[av]) STORE.aca.solo = av === 'KC';
  if (jo) jo.status = STORE.aca && STORE.aca.solo ? 'Deactivated' : 'Active';
  if (ra) { if (ra._vAdd) { ra.roles = ra.roles.filter(r => r !== 'Assessor'); ra._vAdd = false; } if (av === 'KD' && !ra.roles.includes('Assessor')) { ra.roles.push('Assessor'); ra._vAdd = true; } }
  if (ACA_VARIANTS[av]) {
    if (A.fin) _setIdK(A._saAv || 'A');
    const V = ACA_VARIANTS[av], s = A.staff.find(x => x.id === V.staff);
    if (!A._saMe) { A._saMe = A.me; A._saNotifs = A.myNotifs; A._saAv = A.av; }
    A.av = av; A.aca = true; A.fin = false; S.finCtx = null; A.variant = { label: V.label };
    A.me = { name: s.name, first: s.name.split(' ')[0], email: s.email, roles: V.roles.slice(), tz: 'Europe/London', id: s.id };
  } else { A.aca = false; _setIdK(av); }
};

/* ---------- Shared-store patch (academic seed, §A6) ---------- */
function acaPatch() {
  if (!ADMIN || ADMIN._acaPatched) return; ADMIN._acaPatched = true;
  const A = ADMIN, K = STORE.aca = { notifs: [], drafts: [], obsLib: null, alloc: [], schedLog: [], conflicts: null, tasOrig: STORE.aca?.tasOrig || Object.fromEntries(Object.entries(TAS_USERS).map(([k, u]) => [k, u.batches.slice()])) };
  Object.entries(K.tasOrig).forEach(([k, b]) => { if (TAS_USERS[k]) TAS_USERS[k].batches = b.slice(); });
  if (!A.staff.some(s => s.id === 'ST-019')) A.staff.push({ id: 'ST-019', name: ACA_B, email: 'joanne.lister@illumin-academy.example', roles: ['Academic Admin'], status: 'Active', tfa: 'Not required', last: D(-1, '16:20'), alloc: 0, mobile: '+44 7700 900719', tz: 'Europe/London' });
  const L = n => allLearners().find(l => l.name === n) || { id: '—', name: n };
  const att = (sc) => sc.map((s, k) => [D(-20 + k * 4, '19:' + String(10 + k * 7)), s, s >= 80 ? 'Pass' : 'Fail']);
  const q = (id, type, raisedBy, raised, status, learner, course, data, extra = {}) => ({ id, type, raisedBy, raised, status, first: 'Academic Admin', related: [`${learner} · ${course}`, 'a-learner.' + L(learner).id], notes: [], history: [[raisedBy, raised, 'Raised', extra.reason || '']], data: { learner, course, ...data }, ...extra });
  const quiz = (max, sc) => ({ quizName: 'Course quiz', max, pass: 80, attempts: att(sc) });
  A.queue.push(
    q('AQ-4001', 'Extra quiz attempts', 'Chloe Hughes', D(-2, '19:30'), 'Pending', 'Chloe Hughes', 'Infection Prevention and Control', { ...quiz(3, [60, 70, 75]), end: D(48) }, { reason: 'I was on night shifts during all three attempts. I have re-read the PPE guidance.' }),
    q('AQ-4002', 'Extra quiz attempts', 'Oliver Bennett', D(-12, '20:05'), 'Approved', 'Oliver Bennett', 'Moving and Handling People', { ...quiz(3, [65, 70, 72]), end: D(30) }, { reason: 'Close to the pass mark each time.', decidedBy: ACA_A, decision: 'Granted: +3 attempts (original allowance). Re-watch the hoist video first.', outcome: 'Granted' }),
    q('AQ-4003', 'Extra quiz attempts', 'Amelia Price', D(-4, '18:00'), 'Info Requested', 'Amelia Price', 'Dementia Awareness', { ...quiz(3, [50, 55, 60]), end: D(20) }, { reason: 'Technical issues on attempt 2.', extraHist: [[ACA_B, D(-3, '09:10'), 'Request further information', 'Please describe the technical issue and when it happened.']] }),
    q('AQ-4004', 'More time on short course', 'Sophie Wright', D(-9, '08:30'), 'Rejected', 'Sophie Wright', 'Fire Safety Awareness', { enrolled: D(-75), access: 60, expiry: D(-15), progress: 20, content: 25, quizSt: 'Not attempted', prevExt: ['+14 days (' + fd(D(-40)) + ')'] }, { reason: 'Busy at work.', decidedBy: ACA_A, decision: 'Rejected: one extension already granted and progress is 20%.', outcome: 'Rejected' }),
    q('AQ-4005', 'More time on short course', 'Emily Turner', D(-6, '12:00'), 'Returned to Requester', 'Emily Turner', 'Medication Awareness', { enrolled: D(-100), access: 90, expiry: D(-10), progress: 64, content: 80, quizSt: '1 of 3 used — 70% (Fail)', prevExt: [] }, { reason: 'Hospital stay.', decidedBy: ACA_B, decision: 'Returned — please attach the discharge letter.', extraHist: [[ACA_B, D(-5, '10:00'), 'Send back / Return to requester', 'Please attach the discharge letter.']] }),
    q('AQ-4006', 'Resubmission limit reached', 'James Pryce', D(-3, '16:40'), 'Pending', 'Oliver Bennett', 'Level 3 Diploma in Adult Care (England)', { batch: 'L3AC-JAN26', asg: 'Assignment 3 — Duty of care', crit: ['305 1.1', '305 1.2', '305 2.1'], rec: '(a) One exceptional resubmission', recCode: 'a', recBy: 'James Pryce', recReason: 'Learner has improved each round; only Q2 remains Not met. One more attempt is reasonable.', evidence: 'Round 3 shows clear progress on duty of care dilemmas.', policy: 2, end: D(160) }),
    q('AQ-4007', 'Resubmission limit reached', 'Sarah Okonkwo', D(-5, '11:15'), 'Pending', 'Ruby Clarke', 'Level 2 Diploma in Care (England)', { batch: 'L2DC-MAR26', asg: 'L2 Assignment 5 — Health and safety', crit: ['207 1.1', '207 2.3'], rec: '(b) Refer for decision', recCode: 'b', recBy: 'Sarah Okonkwo', recReason: 'Mixed progress; I am not confident another round will close the gaps.', evidence: 'Q1 Met, Q2 and Q3 Not met after two resubmissions.', policy: 2, end: D(151) }),
    q('AQ-4008', 'Resubmission limit reached', ACA_A, D(-1, '15:20'), 'Pending', 'Noah Edwards', 'Level 2 Diploma in Care (England)', { batch: 'L2DC-MAR26', asg: 'L2 Assignment 6 — Safeguarding', crit: ['208 1.1', '208 1.3'], rec: '(c) Recommend discontinuation', recCode: 'c', recBy: ACA_A, recReason: 'No meaningful change across three rounds; learner has not engaged with the action plan.', evidence: 'Action plans issued 12 Jun, 3 Aug, 9 Sep.', policy: 2, end: D(151), dual: true }, { reason: 'Recorded as Assessor (dual role).' }),
    q('AQ-4009', 'Resubmission limit reached', 'Sarah Okonkwo', D(-25, '10:00'), 'Approved', 'Amelia Price', 'Level 3 Diploma in Adult Care (England)', { batch: 'L3AC-JAN26', asg: 'Assignment 5 — Equality and inclusion', crit: ['303 1.2'], rec: '(a) One exceptional resubmission', recCode: 'a', recBy: 'Sarah Okonkwo', recReason: 'One criterion outstanding.', policy: 2, end: D(99) }, { decidedBy: ACA_A, decision: 'Grant one exceptional resubmission: deadline ' + fd(D(-11)), outcome: 'Exceptional resubmission' }),
    q('AQ-4010', 'Discontinue enrolment — academic', 'James Pryce', D(-2, '14:00'), 'Pending', VNAME('D'), 'Level 2 Diploma in Care (England)', { v: 'D', batch: 'L2DC-MAR26', rec: 'Recommend discontinuation', recBy: 'James Pryce', recReason: 'No observation evidence for 5 months; workplace permission escalated twice.', att: '61%' }, { reason: 'No progress since May despite three action plans.' }),
    q('AQ-4011', 'Discontinue enrolment — academic', 'Sarah Okonkwo', D(-30, '09:00'), 'Approved', 'Mohammed Ali', 'Level 3 Diploma in Adult Care (England)', { batch: 'L3AC-JAN26', rec: 'Recommend discontinuation', recBy: 'Sarah Okonkwo', recReason: 'Learner confirmed in writing that they are leaving the sector.', att: '48%' }, { decidedBy: ACA_B, decision: 'Approve discontinuation — course/batch only.', outcome: 'Discontinued' }),
  );
  const fix = (id, o) => { const it = A.queue.find(i => i.id === id); if (it) Object.assign(it, o, { data: { ...(it.data || {}), ...(o.data || {}) } }); };
  fix('AQ-1007', { data: { learner: VNAME('C'), course: 'Level 3 Diploma in Adult Care (England)', batch: 'L3AC-JAN26', asg: 'Assignment 7 — Personal development', crit: ['304 1.1', '304 1.2'], recCode: 'a', recBy: 'Sarah Okonkwo', recReason: 'Q1 is close; the learner responded well to feedback.', policy: 2, end: D(99) } });
  fix('AQ-1008', { data: { learner: 'Ben Carter', course: 'Level 2 Diploma in Care (England)', batch: 'L2DC-MAR26', rec: 'Recommend discontinuation', recBy: 'James Pryce', recReason: 'No evidence submitted for 4 months despite 3 action plans.', att: '38%' } });
  fix('AQ-1020', { outcome: 'Rejected', data: { learner: 'Harry Walsh', course: 'Fire Safety Awareness', ...quiz(3, [55, 60, 62]), end: D(-2) } });
  fix('AQ-1021', { outcome: 'Extension', data: { learner: 'Ruby Clarke', course: 'Dementia Awareness', enrolled: D(-110), access: 90, expiry: D(-20), progress: 72, content: 90, quizSt: 'Not attempted', prevExt: [] } });
  // Aisha (demo learner C): a pending extra-attempts request on an exhausted quiz
  const C = STORE.worlds.C;
  if (!C._acaSeed) {
    C._acaSeed = true;
    const fs = C.enrolments.find(e => e.kind === 'short' && e.quiz && e.status === 'Active' && e.id !== 'bls') || C.enrolments.find(e => e.id === 'bls');
    if (fs) { fs.quiz.attempts = [{ n: 1, at: D(-10, '19:00'), score: 60, result: 'Fail' }, { n: 2, at: D(-7, '20:10'), score: 70, result: 'Fail' }, { n: 3, at: D(-3, '18:45'), score: 78, result: 'Fail' }]; fs.quiz.max = 3; C.requests.unshift({ id: 'R-1083', type: 'Extra quiz attempts', target: fs.title, raised: D(-1, '21:15'), status: 'Requested', reason: 'I missed the pass mark by 2% on attempt 3. I have revised the module notes.', decision: null }); }
  }
  // Admissions: 4 unassigned, 6 with a reviewer, 2 nearing 7 days, 1 escalated, 1 approved awaiting placement
  allApplications();
  const app = (id, name, prog, ref, applied, status, rev, days, ok, esc_ = false, extra = {}) => ({ id, name, programme: prog, ref, applied, status, reviewer: rev, days, docsOk: ok, docsAll: 6, escalated: esc_, docs: ['Passport', 'Right to work', 'Proof of address', 'Enhanced DBS certificate', 'Highest qualification certificate', 'CV'].map((n, k) => ({ id: 'sd' + k, name: n, mand: true, status: k < ok ? 'Approved' : status === 'Pending — Documents Required' ? 'Pending' : 'Submitted', file: n.toLowerCase().replace(/\W+/g, '_') + '.pdf', versions: [[n.toLowerCase().replace(/\W+/g, '_') + '.pdf', D(-days - 1), k < ok ? 'Approved' : 'Awaiting review']], uploaded: D(-days - 1), expires: null, formats: 'PDF, JPG or PNG', max: '5 MB' })), ...extra });
  const L3 = 'Level 3 Diploma in Adult Care (England)', L2 = 'Level 2 Diploma in Care (England)';
  if (!A.apps.some(a => a.id === 'APP-2220')) A.apps.push(
    app('APP-2220', 'Megan Roberts', L2, 'Self-registration', D(-2), 'Pending — Documents Required', '— Unassigned', 0, 2),
    app('APP-2221', 'Callum Fraser', L3, 'Agency — BrightCare Staffing Ltd', D(-4), 'Pending — Documents Required', '— Unassigned', 0, 3),
    app('APP-2222', 'Noura Saeed', L3, 'Agent — GCR-118', D(-1), 'Pending — Documents Required', '— Unassigned', 0, 0),
    app('APP-2223', 'Hannah Patel', L2, 'Welfare Buddy — WB-HASSAN22', D(-9), 'Under Review', ACA_A, 6, 4),
    app('APP-2224', 'Joseph Mathew', L3, 'Self-registration', D(-5), 'Under Review', 'Dr Helen Carter', 2, 5),
    app('APP-2225', 'Lucy Evans', L2, 'Agency — CarePlus Recruitment', D(-3), 'Under Review', 'Owen Price', 1, 3),
    app('APP-2226', 'Tariq Aziz', L3, 'Agent — GCR-118', D(-6), 'Under Review', ACA_B, 3, 2),
    app('APP-2227', 'Imran Sheikh', L2, 'Self-registration', D(-21), 'Approved', ACA_A, 0, 6, false, { placement: 'Awaiting batch placement' }));
  if (!REVIEWERS.includes(ACA_B)) REVIEWERS.push(ACA_B);
  // Batches: full + waitlist exists (L3AC-NOV26); add a Planned batch with no Academic Coordinator, and one to cancel in the demo
  const nb = (code, label, course, start, end, cap, enrolled, mode, coord, teachers, assessors, status, wait = 0) => ({ code, label, course, start, end, cap, enrolled, mode, coord, teachers, assessors, status, wait, roster: [] });
  if (!A.batches.some(b => b.code === 'L2DC-FEB27')) A.batches.push(nb('L2DC-FEB27', 'Croydon Cohort 5', L2, D(130), D(495), 18, 0, 'Blended', '', [], [], 'Planned'), nb('L3AC-JAN27-MAN', 'Manchester Cohort 5', L3, D(95), D(460), 15, 4, 'Classroom', 'Laura Kemp', ['Marcus Bell'], ['Sarah Okonkwo'], 'Open'));
  // Programmes: L3 has 2 versions (learners on v1 and v2); a draft programme with uncovered criteria and an LO with no type
  const l3 = A.programmes.find(p => p.id === 'NV-L3'); if (l3) l3.perVersion = { 1: 18, 2: 45 };
  if (!A.programmes.some(p => p.id === 'NV-L3D')) A.programmes.push({ id: 'NV-L3D', title: 'Level 3 Diploma in Adult Care (England) — 2027 update', level: 'Level 3', ref: 'QN 610/4471/2', version: 1, status: 'Draft', batches: 0, learners: 0, draft: true });
  // Observation criteria library
  K.obsLib = [['IA-1', 'Dignity and respect', 'Treats the individual with dignity throughout the activity.', 'Professional conduct', 'Active', ['NV-L2', 'NV-L3']], ['IA-2', 'Communication', 'Explains each step and checks understanding.', 'Care standards', 'Active', ['NV-L2', 'NV-L3', 'NV-L5']], ['IA-3', 'Infection control practice', 'Follows hand hygiene and PPE procedures.', 'Care standards', 'Active', ['NV-L2', 'NV-L3']], ['IA-4', 'Record keeping', 'Completes records accurately and promptly.', 'Professional conduct', 'Active', ['NV-L3']], ['IA-5', 'Safeguarding awareness', 'Recognises and reports concerns correctly.', 'Safeguarding', 'Active', ['NV-L2', 'NV-L3', 'NV-L5']], ['IA-6', 'Uniform and presentation', 'Meets the workplace dress code.', 'Professional conduct', 'Retired', []], ['IA-7', 'Moving and handling technique', 'Uses equipment safely and as assessed.', 'Care standards', 'Active', ['NV-L2']], ['IA-8', 'Escalating changes in condition', 'Reports changes promptly to the senior on shift.', 'Safeguarding', 'Draft', []], ['IA-9', 'Teamwork', 'Coordinates with colleagues during the task.', 'Other', 'Active', ['NV-L5']]].map(r => ({ code: r[0], title: r[1], desc: r[2], cat: r[3], status: r[4], progs: r[5], version: r[0] === 'IA-2' ? 2 : 1 }));
  // Staff allocations (individual learners and pending marking re-allocations)
  K.alloc = [['Sarah Okonkwo', 'Batch', 'L3AC-JAN26 · Leicester Cohort 7', D(-265)], ['James Pryce', 'Batch', 'L2DC-MAR26 · Croydon Cohort 4', D(-214)], ['Omar Siddiqui', 'Batch', 'L3AC-NOV26 · Dubai Cohort 2', D(-20)], ['Marcus Bell', 'Course', 'Moving and Handling People', D(-120)], ['Sarah Okonkwo', 'Learner', 'Oliver Bennett', D(-60)], ['James Pryce', 'Programme', 'Level 2 Diploma in Care (England)', D(-300)]].map(r => ({ who: r[0], kind: r[1], what: r[2], since: r[3] }));
  // Scheduling: two conflicts to resolve
  K.conflicts = [{ id: 'CF-1', what: 'Teacher double-booked', detail: `Marcus Bell — Leicester Cohort 7 class and Moving and Handling Q&A, ${fds(D(2))} 17:00`, src: 'a-scheduling', resolved: false }, { id: 'CF-2', what: 'Cohort double-booked', detail: `Croydon Cohort 4 — weekly class and classroom day overlap, ${fds(D(9))} 15:00`, src: 'a-scheduling', resolved: false }];
  // Drafts not yet published
  K.drafts = [{ id: 'a9', title: 'Assignment 9 — Medication administration', programme: L3, unit: 'U308 · Module 1', due: D(30, '21:59'), status: 'Draft', version: 1, mapped: 3, marker: 'Sarah Okonkwo' }];
  const n = (t, b, at, go, unread = false, to = 'all', cat = 'Approvals') => ({ id: 'kn' + Math.random().toString(36).slice(2, 8), t, b, at, go, unread, to, cat });
  K.notifs = [
    n('New queue item awaiting you', 'Extra quiz attempts · Aisha Rahman (R-1083)', D(-1, '21:16'), 'a-queue', true),
    n('New queue item awaiting you', 'Resubmission limit · Oliver Bennett (AQ-4006) — recommendation (a)', D(-3, '16:41'), 'a-queue.AQ-4006', true),
    n('Item escalated to Super Admin', 'AQ-1007 · Aisha Rahman — no decision for 7 days', D(0, '00:05'), 'a-queue.AQ-1007', true),
    n('Your decision was overridden', 'AQ-1021 · Ruby Clarke: Rejected → Approved (Nadia Qureshi)', D(-16, '10:01'), 'a-queue.AQ-1021', false, ACA_A),
    n('Info response received', 'AQ-4003 · Amelia Price replied with details of the technical issue', D(-2, '08:00'), 'a-queue.AQ-4003', false),
    n('Application with no reviewer for 3 days', 'APP-2221 · Callum Fraser', D(0, '06:00'), 'a-admissions', true, 'all', 'Admissions'),
    n('Review nearing 7 days', 'APP-2223 · Hannah Patel (6 days)', D(0, '06:00'), 'a-admissions.APP-2223', true, 'all', 'Admissions'),
    n('Batch starting with missing staff', 'L2DC-FEB27 — no Academic Coordinator', D(0, '06:00'), 'a-batches.L2DC-FEB27', true, 'all', 'Admissions'),
    n('Batch full — waitlist demand', 'L3AC-NOV26 · 3 waiting', D(-1, '09:00'), 'a-batches.L3AC-NOV26.waitlist', false, 'all', 'Scheduling'),
    n('Schedule conflict detected', 'Marcus Bell double-booked ' + fds(D(2)), D(-1, '07:30'), 'a-scheduling', true, 'all', 'Scheduling'),
    n('"Request change" message received', 'Dr Helen Carter — move the Unit 306 classroom day', D(-1, '12:10'), 'a-messages', false, 'all', 'Scheduling'),
    n('Marking backlog over threshold', 'Sarah Okonkwo — 9 items older than 5 days', D(0, '06:00'), 'a-records..backlog', false, 'all', 'Assessment'),
    n('IQA finding recorded', 'IQA-301 · Aisha Rahman, Assignment 2', D(-3), 'a-records..iqa', false, 'all', 'Assessment'),
    n('Data correction decided', 'AQ-1005 · Joseph Mathew — info requested by Owen Price', D(-5), 'a-queue.AQ-1005', false, ACA_A, 'System'),
    n('Export ready', 'Queue decisions report (CSV)', D(-2, '17:00'), 'a-reports', false, 'all', 'System'),
  ];
  A.threads.push({ id: 'MT-7', subject: 'Request change: Unit 306 classroom day', party: 'Dr Helen Carter (Academic Coordinator)', status: 'Open', tag: 'Request change', msgs: [['Dr Helen Carter', D(-1, '12:10'), 'Could the Unit 306 classroom day move from Saturday to the following Tuesday? Six learners are on shift.']] },
    { id: 'MT-8', subject: 'Request change: assessor for Oliver Bennett', party: 'Marcus Bell (Teacher)', status: 'Open', tag: 'Request change', msgs: [['Marcus Bell', D(-2, '15:00'), 'Oliver would benefit from a different assessor for Unit 305.']] },
    { id: 'MT-9', subject: 'Learner query forwarded: brief for Assignment 3', party: 'Forwarded by Sarah Okonkwo', status: 'Answered', tag: 'Forwarded', msgs: [['Sarah Okonkwo', D(-3, '09:00'), 'Aisha asked whether the updated brief changes the word count.'], [ACA_A, D(-3, '11:00'), 'No — only the case study changed.']] });
  A.audit.unshift({ id: 'AU-9600', actor: ACA_A, role: 'Academic Admin', at: D(-1, '11:00'), module: 'Batches', entity: 'Manchester Cohort 5 (L3AC-JAN27-MAN)', action: 'Batch created', before: '—', after: 'Open · Laura Kemp / Marcus Bell / Sarah Okonkwo', reason: 'January intake', ip: '81.2.69.150' },
    { id: 'AU-9601', actor: ACA_B, role: 'Academic Admin', at: D(-3, '09:10'), module: 'Approvals Queue', entity: 'AQ-4003', action: 'Request further information', before: 'Pending', after: 'Info Requested', reason: 'Describe the technical issue', ip: '81.2.69.151' });
}
const _baK = buildAdmin; buildAdmin = function (av) { const r = _baK(av); acaPatch(); return r; };
const _isK = initStore; initStore = function () { _isK(); acaPatch(); };
const acaNotifs = () => (STORE.aca ? STORE.aca.notifs : []).filter(n => n.to === 'all' || n.to === ADMIN.me.name);
function acaNotify(t, b, go, to = 'all', cat = 'Approvals') { if (STORE.aca) STORE.aca.notifs.unshift({ id: 'kn' + Date.now() + Math.random().toString(36).slice(2, 5), t, b, at: now().toISOString(), go, unread: true, to, cat }); }
function tasNotify(t, b, go, cat = 'Marking') { if (STORE.tas) STORE.tas.notifs.unshift({ id: 'tn' + Date.now() + Math.random().toString(36).slice(2, 5), t, b, at: now().toISOString(), go, unread: true, cat }); }

/* ---------- Shell: sidebar (§5), hidden modules, notifications, role switch ---------- */
const KNAV = [
  ['Overview', [['k-dashboard', 'Dashboard', 'home'], ['a-queue', 'Approvals Queue', 'inbox']]],
  ['People', [['a-learners', 'Learners', 'users'], ['a-admissions', 'Admissions & Documents', 'clip'], ['k-staff', 'Staff Allocations', 'user']]],
  ['Curriculum', [['a-courses', 'Short Courses', 'book'], ['a-programmes', 'NVQ Programmes', 'layers'], ['k-obslib', 'Observation Criteria Library', 'checksq'], ['a-assignments', 'Assignments & Criteria Mapping', 'edit'], ['a-resources', 'Learning Resources', 'doc']]],
  ['Delivery', [['a-batches', 'Batches', 'users'], ['a-scheduling', 'Scheduling', 'cal'], ['k-calendar', 'Calendar Monitoring', 'cal'], ['a-observations', 'Observations', 'eye'], ['a-attendance', 'Attendance', 'clock']]],
  ['Quality', [['a-records', 'Assessment Records', 'chart']]],
  ['Insight', [['a-reports', 'Reports', 'chart']]],
  ['Communication', [['a-announcements', 'Announcements', 'pin'], ['a-messages', 'Messages', 'msg'], ['k-notifications', 'Notifications', 'bell']]],
  ['Me', [['a-me', 'My Profile', 'user']]],
];
const ACA_ROUTES = new Set(KNAV.flatMap(([, i]) => i.map(x => x[0])).concat(['a-learner', 'k-index', 'k-transfer', 'a-transfer']));
const _adminNavK = adminNav;
adminNav = function () { return isAca() ? KNAV : _adminNavK(); };
const _adminRenderK = adminRender;
adminRender = function () {
  if (ADMIN.aca) {
    ADMIN.myNotifs = acaNotifs();
    if (S.route === 'a-dashboard') S.route = 'k-dashboard';
    if (S.route.startsWith('f-')) S.route = 'k-dashboard';
  }
  const svN = ADMIN.aca ? ADMIN._saNotifs : undefined; if (ADMIN.aca) delete ADMIN._saNotifs;
  try { _adminRenderK(); } finally { if (svN !== undefined) ADMIN._saNotifs = svN; }
  if (!ADMIN.aca) return;
  const rc = $('.adm .role-ctx');
  if (ACA_VARIANTS[ADMIN.av].multi && rc) rc.outerHTML = `<div class="role-switch"><label for="kctx">Role</label><select id="kctx" data-onchange="kCtx"><option selected>Academic Admin</option><option>Assessor</option></select></div>`;
  else if (rc) rc.textContent = 'Academic Admin';
  const sub = $('.adm .logo span'); if (sub) sub.textContent = 'Academic Admin';
  $$('.adm .logo').forEach(a => { a.setAttribute('href', '#k-dashboard'); a.dataset.go = 'k-dashboard'; });
  $$('.adm-side a[href="#a-index"]').forEach(a => { a.setAttribute('href', '#k-index'); a.dataset.go = 'k-index'; a.textContent = 'Academic Admin screen index'; });
  const si = $('#asearch'); if (si) { si.placeholder = 'Search learners, courses, batches, assignments, queue IDs…'; const lb = $('label[for="asearch"]'); if (lb) lb.textContent = 'Search learners, staff, courses, programmes, batches, assignments and queue items'; }
  $$('.adm-hdr [data-go="a-me"][data-tab="security"]').forEach(b => b.closest('li') && b.closest('li').remove());
};
INP.kCtx = el => { if (el.value === 'Assessor') { S.tas.v = 'R'; S.portal = 'staff'; S.signedIn = true; go('t-dashboard'); toast('Role context: Assessor (Rachel Hughes)', 'info'); } };
const _adminPageK = adminPage;
adminPage = function () {
  if (isAca() && !S.serverError && (S.route.startsWith('a-') || S.route.startsWith('f-')) && !ACA_ROUTES.has(S.route) && SCREENS[S.route]) {
    ADMIN.security.unshift({ id: 'SE-' + (970 + ADMIN.security.length), sev: 'Medium', at: now().toISOString(), type: 'Out-of-scope access', detail: `Academic Admin ${ADMIN.me.name} opened ${S.route}`, reviewed: false });
    return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have permission — logged</h1><p class="muted">This module isn't part of the Academic Admin role. The attempt has been recorded in the security log.</p><button class="btn btn-primary" data-go="k-dashboard">Go to Academic Dashboard</button></div>`;
  }
  return _adminPageK();
};
const _searchK = searchResults;
searchResults = function (q) {
  if (!isAca()) return _searchK(q);
  q = q.toLowerCase(); const r = [];
  allLearners().forEach(l => { if ((l.name + l.id + l.email).toLowerCase().includes(q)) r.push(['Learner', l.name + ' · ' + l.id, 'a-learner.' + l.id]); });
  ADMIN.staff.forEach(s => { if ((s.name + s.email).toLowerCase().includes(q)) r.push(['Staff (read-only)', s.name, 'k-staff']); });
  ADMIN.courses.forEach(c => { if (c.title.toLowerCase().includes(q)) r.push(['Course', c.title, 'a-courses.' + c.id]); });
  ADMIN.programmes.forEach(c => { if (c.title.toLowerCase().includes(q)) r.push(['Programme', c.title, 'a-programmes.' + c.id]); });
  ADMIN.batches.forEach(b => { if ((b.code + b.label).toLowerCase().includes(q)) r.push(['Batch', b.label + ' — ' + b.code, 'a-batches.' + b.code]); });
  adminAssignments().forEach(a => { if (a.title.toLowerCase().includes(q)) r.push(['Assignment', a.title, 'a-assignments.' + a.id]); });
  allQueue().forEach(i => { if (i.id.toLowerCase().includes(q)) r.push(['Queue item', i.id + ' · ' + i.type, 'a-queue.' + i.id]); });
  return `<div class="dd adm-sr" style="left:0;right:auto;top:42px;width:min(520px,90vw)"><ul class="dd-list">${r.slice(0, 10).map(x => `<li><button class="dd-item" data-act="goTok" data-t="${x[2]}"><span class="typebadge">${x[0]}</span><span class="small">${esc(x[1])}</span></button></li>`).join('') || '<li class="dd-item small muted">No matches</li>'}</ul></div>`;
};

/* ---------- Approvals Queue: academic filter, routing, self-approval (§6.2) ---------- */
const recByOf = i => (i.data && i.data.recBy) || null;
function acaBlocked(i) { const me = ADMIN.me.name; return i.raisedBy === me || recByOf(i) === me || learnerOfI(i) === me; }
function learnerOfI(i) { return i.v ? VNAME(i.v) : (i.data && i.data.learner) || i.related[0].split(' · ')[0]; }
function courseOfI(i) { return i.req ? i.req.target : (i.data && i.data.course) || i.related[0].split(' · ').slice(1).join(' · ') || '—'; }
function batchOfI(i) { if (i.data && i.data.batch) return i.data.batch; const v = i.v || (i.data && i.data.v); if (v && i.type.includes('Discontinue')) { const b = (STORE.worlds[v].nvq.batch || '').split(' — ')[1]; return b || '—'; } return '—'; }
function outcomeOfI(i) {
  if (i.outcome) return i.outcome;
  if (i.req) { const s = i.req.status; return s === 'Granted' ? (i.type === 'More time on short course' ? 'Extension' : 'Granted') : s === 'Re-purchase Required' ? 'Re-purchase Required' : s === 'Rejected' ? 'Rejected' : null; }
  return null;
}
const OUT_TONE = { Granted: 'green', Extension: 'green', 'Exceptional resubmission': 'green', 'Re-purchase Required': 'amber', Declined: 'red', Discontinued: 'red', Rejected: 'red' };
const outChip = o => o ? chip(o, OUT_TONE[o] || 'grey') : '<span class="muted small">—</span>';
const _allQueueK = allQueue;
allQueue = function () {
  const q = _allQueueK();
  return isAca() ? q.filter(i => ACA_TYPES.includes(i.type) || (i.type === 'Data correction' && isMine(i))) : q;
};
const _awaitingMeK = awaitingMe;
awaitingMe = function (i) {
  if (isAca()) return isOpen(i) && ACA_TYPES.includes(i.type) && i.status !== 'Escalated' && !acaBlocked(i);
  return _awaitingMeK(i);
};
const _selfBlockedK = selfBlocked;
selfBlocked = function (i) { return isAca() && ACA_TYPES.includes(i.type) ? acaBlocked(i) || i.status === 'Escalated' : _selfBlockedK(i); };
// Variant C: only one Academic Admin → own items route to the Super Administrator (shown in the SA's "Awaiting me")
const _awaitSA = awaitingMe;
awaitingMe = function (i) { if (!ADMIN.aca && STORE.aca && STORE.aca.solo && ACA_TYPES.includes(i.type) && isOpen(i) && (i.raisedBy === ACA_A || recByOf(i) === ACA_A)) return true; return _awaitSA(i); };

const TYPE_SHORT = { 'Extra quiz attempts': 'Quiz attempts', 'More time on short course': 'More time', 'Resubmission limit reached': 'Resubmission limit', 'Discontinue enrolment — academic': 'Discontinuation', 'Data correction': 'Data correction' };
const KQTABS = { me: ['Awaiting me', i => awaitingMe(i)], esc: ['Escalated', i => i.status === 'Escalated' && isOpen(i)], raised: ['Raised by me', i => isMine(i) || recByOf(i) === ADMIN.me.name], decided: ['Decided', i => !isOpen(i)], all: ['All academic', () => true] };
const _qScreenK = SCREENS['a-queue'];
SCREENS['a-queue'] = (p) => {
  if (!isAca() || p.id) return _qScreenK(p);
  const t = KQTABS[ui('kqTab', 'me')] ? ui('kqTab', 'me') : 'me', all = allQueue(), rows = all.filter(KQTABS[t][1]);
  const solo = ADMIN.av === 'KC';
  return `${pageA('Approvals Queue', 'Academic items in the shared queue. Items left undecided for 7 days escalate to the Super Administrator.', `<button class="btn" data-act="qRouting">${ic('info', 15)}Who approves what</button>`)}
  ${solo ? `<div class="note b-amber">${ic('info')}<div class="small"><strong>Only one Academic Admin exists.</strong> Items you raised, or where you recorded the assessor recommendation, route to the Super Administrator.</div></div>` : ''}
  ${tabs(Object.entries(KQTABS).map(([k, [l, f]]) => [k, l, all.filter(f).length]), t, 'kqTab', 'Queue views')}
  ${dt({ id: 'kqueue-' + t, name: 'Approvals Queue — ' + KQTABS[t][0], rows, search: i => i.id + i.type + learnerOfI(i) + courseOfI(i) + i.raisedBy,
    bulk: t === 'me' ? [{ l: 'Bulk grant (quiz attempts)', fn: ids => kBulk(ids, 'grant') }, { l: 'Bulk reject (quiz attempts)', fn: ids => kBulk(ids, 'reject') }] : null,
    filters: [{ k: 'type', l: 'Type', get: i => qLbl(i.type), opts: ACA_TYPES.concat(['Data correction']).map(qLbl) }, { k: 'course', l: 'Course', get: courseOfI }, { k: 'batch', l: 'Batch', get: batchOfI }, { k: 'ass', l: 'Assessor', get: i => recByOf(i) || '—' }, { k: 'status', l: 'Status', get: i => i.status, opts: ['Pending', 'Approved', 'Rejected', 'Returned to Requester', 'Info Requested', 'Escalated'] }, { k: 'days', l: 'Days outstanding', get: i => i.days == null ? 'Decided' : i.days >= 7 ? '7+ days' : i.days >= 5 ? '5–6 days' : 'Under 5 days', opts: ['Under 5 days', '5–6 days', '7+ days', 'Decided'] }],
    cols: [{ k: 'id', l: 'Item ID', h: i => `<a href="#a-queue.${i.id}" data-go="a-queue" data-id="${i.id}" class="mono strong">${i.id}</a>` }, { k: 'type', l: 'Type', h: i => `<span class="small nowrap" title="${esc(qLbl(i.type))}">${esc(TYPE_SHORT[i.type] || i.type)}</span>`, v: i => i.type }, { k: 'learner', l: 'Learner', h: i => `<span class="nowrap">${esc(learnerOfI(i))}</span>`, v: learnerOfI }, { k: 'course', l: 'Course / programme', h: i => `<span class="small">${esc(courseOfI(i))}</span>`, v: courseOfI }, { k: 'batch', l: 'Batch', h: i => `<span class="mono small">${esc(batchOfI(i))}</span>`, v: batchOfI, hide: 1 }, { k: 'by', l: 'Raised by', h: i => `${esc(i.raisedBy)}<div class="xs muted">${i.req ? 'Learner' : recByOf(i) ? 'Assessor' : i.type === 'Data correction' ? 'Me' : 'Learner'}</div>`, v: i => i.raisedBy }, { k: 'raised', l: 'Raised', h: i => fd(i.raised), s: i => i.raised }, { k: 'days', l: 'Days outstanding', h: i => daysChip(i.days), s: i => i.days ?? -1 }, { k: 'status', l: 'Status', h: i => `${qchip(i.status)}${outcomeOfI(i) ? ' ' + outChip(outcomeOfI(i)) : ''}`, v: i => i.status }, { k: 'rec', l: 'Assessor recommendation', h: i => i.data && i.data.rec ? `<span class="small">${esc(i.data.rec)}</span>` : '<span class="muted small">—</span>', v: i => (i.data && i.data.rec) || '' }],
    rowCls: i => i.status === 'Escalated' ? 'row-esc' : '', rid: i => i.id,
    act: i => `<button class="btn btn-sm" data-go="a-queue" data-id="${i.id}">Open</button>`,
    empty: t === 'me' ? 'You\'re all caught up' : 'No items in this view', emptyCta: '<p class="small">New learner requests and assessor recommendations appear here as soon as they are raised.</p>' })}`;
};
ACT.kqTab = el => { setUi('kqTab', el.dataset.k); render(); };
function kBulk(ids, a) {
  const items = ids.map(qItem).filter(i => i && i.type === 'Extra quiz attempts' && isOpen(i) && !acaBlocked(i));
  if (!items.length) { toast('Bulk actions apply to extra quiz-attempt requests only.', 'err'); return; }
  reasonDlg({ title: `Bulk ${a === 'grant' ? 'grant' : 'reject'} — ${items.length} quiz-attempt request${items.length > 1 ? 's' : ''}`, ok: a === 'grant' ? 'Grant all' : 'Reject all', danger: a === 'reject', body: `<p class="small">${ids.length - items.length ? `${ids.length - items.length} selected item(s) aren't quiz-attempt requests and will be skipped. ` : ''}${a === 'grant' ? 'Each learner receives their quiz\'s original number of attempts.' : 'Each learner is notified with your reason.'}</p>`,
    onOk: r => { items.forEach(i => applyDecision(i, a, r, {})); dts('kqueue-me') && (dts('kqueue-me').sel = []); render(); toast(`${items.length} item(s) decided. Learners notified.`); } });
}

/* Item detail: shared upgrade of the academic panels (Super Admin sees them too) */
function quizInfo(i) {
  if (i.req && i.v) { const e = STORE.worlds[i.v].enrolments.find(x => x.title === i.req.target); if (e && e.quiz) return { quizName: 'Course quiz', max: e.quiz._orig || 3, pass: e.quiz.pass, attempts: e.quiz.attempts.map(a => [a.at, a.score, a.result]), end: e.end, price: e.price, cur: STORE.worlds[i.v].me.cur }; }
  const d = i.data || {}; return { quizName: d.quizName || 'Course quiz', max: d.max || 3, pass: d.pass || 80, attempts: d.attempts || [], end: d.end, price: (ADMIN.courses.find(c => (d.course || '').startsWith(c.title)) || {}).gbp, cur: 'GBP' };
}
function timeInfo(i) {
  if (i.req && i.v) { const e = STORE.worlds[i.v].enrolments.find(x => x.title === i.req.target) || {}; const prev = STORE.worlds[i.v].requests.filter(r => r.type === 'More time on course' && r.status === 'Granted' && r.target === i.req.target).map(r => r.grant); return { enrolled: e.enrolled, access: 90, expiry: e.end, progress: e.progress, content: Math.min(100, (e.progress || 0) + 10), quizSt: e.quiz ? (e.quiz.attempts.length ? `${e.quiz.attempts.length} of ${e.quiz.max} used` : 'Not attempted') : '—', prevExt: prev }; }
  return i.data || {};
}
function acaPanel(i) {
  const d = i.data || {};
  if (i.type === 'Extra quiz attempts') {
    const qi = quizInfo(i);
    return `<section class="card"><h2>Quiz attempts</h2><dl class="kv"><dt>Learner</dt><dd>${esc(learnerOfI(i))}</dd><dt>Course</dt><dd>${esc(courseOfI(i))}</dd><dt>Quiz</dt><dd>${esc(qi.quizName)}</dd><dt>Configured attempts</dt><dd>${qi.max}</dd><dt>Pass mark</dt><dd>${qi.pass}%</dd><dt>Course access ends</dt><dd>${qi.end ? fd(qi.end) : '—'}</dd><dt>Learner's reason</dt><dd>${esc(i.reason || '—')}</dd></dl>
      <div class="tbl-wrap"><table class="tbl dense"><caption class="sr">Attempt history</caption><thead><tr><th>Attempt</th><th>Date</th><th class="r">Score</th><th>Result</th></tr></thead><tbody>${qi.attempts.map((a, k) => `<tr><td>${k + 1}</td><td>${fdt(a[0])}</td><td class="r num">${a[1]}%</td><td>${chip(a[2], a[2] === 'Pass' ? 'green' : 'red')}</td></tr>`).join('') || '<tr><td colspan="4" class="small muted">No attempts recorded.</td></tr>'}</tbody></table></div>
      <p class="xs muted">${ic('info', 12)} Grant always equals the quiz's original allowance (${qi.max}) — not editable, no tiered or reduced retake price.</p></section>`;
  }
  if (i.type === 'More time on short course') {
    const t = timeInfo(i);
    return `<section class="card"><h2>Course access</h2><dl class="kv"><dt>Learner</dt><dd>${esc(learnerOfI(i))}</dd><dt>Course</dt><dd>${esc(courseOfI(i))}</dd><dt>Enrolled</dt><dd>${t.enrolled ? fd(t.enrolled) : '—'}</dd><dt>Access period</dt><dd>${t.access || 90} days</dd><dt>Expiry date</dt><dd>${t.expiry ? fd(t.expiry) : '—'} ${t.expiry && daysTo(t.expiry) < 0 ? chip('Expired-Incomplete', 'red') : ''}</dd><dt>Progress</dt><dd><strong>${t.progress ?? '—'}%</strong> <span class="xs muted">· content ${t.content ?? '—'}% · quiz: ${esc(t.quizSt || '—')}</span></dd><dt>Learner's reason</dt><dd>${esc(i.reason || '—')}</dd><dt>Previous extensions</dt><dd>${(t.prevExt || []).length ? t.prevExt.map(esc).join('; ') : 'None'}</dd></dl></section>`;
  }
  if (i.type === 'Resubmission limit reached') {
    const v = d.v, as = v && d.aid ? STORE.worlds[v].assignments.find(x => x.id === d.aid) : null;
    const others = v ? STORE.worlds[v].enrolments.filter(e => e.kind !== 'nvq').map(e => e.title + ' (' + e.status + ')') : ['Moving and Handling People (Active)'];
    const sheet = as ? withW(v, () => `${inkLegend()}${feedbackTop(as)}<div class="paper">${as.qs.map((qq, k) => `<div class="q">${qHead(qq, k)}${qq.rounds.map((r, n) => roundBlock(qq, n, r)).join('')}</div>`).join('')}</div>`) : `<div class="note b-grey">${ic('doc')}<div class="small">Answer sheet: ${esc(d.asg || '')} — Sub 1 (black), Resub 1 (red), Resub 2 (amber). <button class="linklike" data-act="viewFile" data-f="${esc((d.asg || 'answer-sheet').replace(/\W+/g, '_'))}.pdf">Open full answer sheet</button></div></div>`;
    return `<section class="card"><h2>Resubmission limit</h2><dl class="kv"><dt>Learner</dt><dd>${esc(learnerOfI(i))}</dd><dt>Batch</dt><dd class="mono">${esc(batchOfI(i))}</dd><dt>Assignment</dt><dd>${esc(d.asg || '—')}</dd><dt>Affected criteria</dt><dd>${(d.crit || []).map(c => `<span class="code">${c}</span>`).join(' ') || '—'}</dd><dt>Resubmission policy</dt><dd>${d.policy || 2} resubmissions allowed — all used</dd><dt>Other enrolments</dt><dd class="small">${others.map(esc).join('; ') || 'None'}</dd><dt>Programme end date</dt><dd>${d.end ? fd(d.end) : '—'}</dd></dl></section>
    <section class="card"><h2>Assessor's recommendation</h2><div class="rec-opts">${[['a', '(a) One exceptional resubmission'], ['b', '(b) Refer for decision'], ['c', '(c) Recommend discontinuation']].map(([k, l]) => `<span class="chip ${d.recCode === k ? 't-blue' : 't-outline'}">${d.recCode === k ? '● ' : ''}${l}</span>`).join(' ')}</div><dl class="kv"><dt>Recorded by</dt><dd>${esc(recByOf(i) || i.raisedBy)}${d.dual ? ' <span class="typebadge">Assessor (dual role)</span>' : ''}</dd><dt>Reason</dt><dd>${esc(d.recReason || i.reason || '—')}</dd><dt>Evidence notes</dt><dd>${esc(d.evidence || '—')}</dd></dl><p class="xs muted">${ic('info', 12)} No academic-support or tutor option exists.</p></section>
    <section class="card"><h2>Full answer sheet history</h2>${sheet}</section>`;
  }
  if (i.type === 'Discontinue enrolment — academic') {
    const v = d.v, w = v ? STORE.worlds[v] : null, crit = w ? withW(v, () => allCrit()) : null, lid = w ? w.me.id : (allLearners().find(l => l.name === d.learner) || {}).id;
    return `<section class="card"><h2>Recommendation and learner summary</h2><dl class="kv"><dt>Learner</dt><dd>${esc(learnerOfI(i))}</dd><dt>Course / batch</dt><dd>${esc(courseOfI(i))} · <span class="mono">${esc(batchOfI(i))}</span></dd><dt>Assessor</dt><dd>${esc(recByOf(i) || i.raisedBy)}</dd><dt>Recommendation</dt><dd>${esc(d.rec || 'Recommend discontinuation')}</dd><dt>Assessor's reason</dt><dd>${esc(d.recReason || i.reason || '—')}</dd><dt>Progress</dt><dd>${crit ? pctOf(crit) + '%' : '34%'}</dd><dt>Attendance</dt><dd>${esc(d.att || '—')}</dd><dt>Submissions</dt><dd><a href="#a-learner.${lid}.academic" data-act="goTok" data-t="a-learner.${lid}.academic">Open submission history</a></dd></dl>
      <h3 class="small">Competency map snapshot</h3>${fiveBar(crit ? countStates(crit) : { 'Not Started': 14, 'In Progress': 4, 'Action Required': 3, 'Added to PD': 1, 'Achieved': 6 })}</section>`;
  }
  return '';
}
const _qdK = queueDetail;
queueDetail = function (id) {
  let html = _qdK(id); const i = qItem(id); if (!i || !ACA_TYPES.includes(i.type)) return html;
  const open = isOpen(i), aca = isAca(), blocked = aca && open && acaBlocked(i), esc_ = i.status === 'Escalated';
  html = html.replace(/<div class="note b-amber" role="status">[^]*?You cannot approve an item you raised[^]*?<\/div><\/div>/, '');
  let top = '';
  if (blocked) { const to = otherAca() || 'Super Administrator'; top += `<div class="note b-amber" role="status">${ic('lock')}<div><strong>Self-approval blocked.</strong> ${recByOf(i) === ADMIN.me.name ? 'You recorded the assessor recommendation on this item' : i.raisedBy === ADMIN.me.name ? 'You raised this item' : 'You are the subject of this item'} — it has been routed to <strong>${esc(to)}</strong>${to === 'Super Administrator' ? ' because no other Academic Admin exists' : ''}.</div></div>`; }
  if (aca && esc_) html = html.replace('This item now needs a Super Administrator decision.', 'Escalated to Super Administrator — read-only for Academic Admin.');
  if (i.override && aca) top += `<div class="note b-grey">${ic('info')}<div class="small">You were notified of this override.</div></div>`;
  html = html.replace('<div class="grid-2"><div class="stack-lg">', top + `<div class="grid-2 k-panels">${acaPanel(i)}</div><div class="grid-2"><div class="stack-lg">`);
  if (aca) {
    html = html.replace(/<div class="row"><button class="btn" data-act="qOverride"[^]*?<\/span><\/div>/, '');
    if (blocked || esc_) html = html.replace(/<section class="card"><h2>Decision<\/h2>[^]*?<\/section>/, `<section class="card"><h2>Decision</h2><p class="small muted">${ic('lock', 14)} ${esc_ ? 'The Super Administrator decides escalated items.' : 'You can view this item but can\'t decide it.'}</p><button class="btn btn-sm" data-act="qDo" data-id="${i.id}" data-a="note">Add note</button></section>`);
  }
  if (outcomeOfI(i)) html = html.replace('<dt>First approver</dt>', `<dt>Outcome</dt><dd>${outChip(outcomeOfI(i))}</dd><dt>First approver</dt>`);
  return html;
};

/* Decision modals (§8) — shared upgrade */
const _qDoK = ACT.qDo;
ACT.qDo = el => {
  const i = qItem(el.dataset.id), a = el.dataset.a;
  if (!i || !ACA_TYPES.includes(i.type) || ['note', 'info', 'return'].includes(a)) return _qDoK(el);
  if (isAca() && (acaBlocked(i) || i.status === 'Escalated')) { toast('You can\'t decide this item.', 'err'); return; }
  let extra = '', title = `${ACTLABEL[a] || 'Decide'} — ${i.id}`;
  if (a === 'grant') { const n = quizInfo(i).max; extra = `<div class="field"><label for="kgr">Attempts granted</label><input class="input num" id="kgr" value="${n}" disabled aria-describedby="kgr-h"><span class="hint" id="kgr-h">Fixed — equals the quiz's original allowance. Not editable.</span></div><div class="note b-blue">${ic('info')}<div class="small"><strong>Learner receives ${n} further attempts (quiz's original allowance).</strong> No re-purchase. The learner is notified.</div></div>`; }
  if (a === 'repurchase') { const qi = quizInfo(i); extra = `<div class="note b-amber">${ic('card')}<div class="small"><strong>Learner must re-purchase at full price${qi.price ? ` (${money(qi.price, qi.cur || 'GBP')})` : ''}.</strong> Their current record is kept.</div></div>`; }
  if (a === 'extend') extra = `<div class="field"><label for="xdays">Number of extra days</label><input class="input num" id="xdays" type="number" min="1" max="365" value="14" data-oninput="xdays" data-id="${i.id}"><span class="hint" id="xprev">${extPrev(i, 14)}</span></div>`;
  if (a === 'exceptional') extra = `<div class="field"><label for="xdate">Resubmission deadline</label><input class="input" id="xdate" type="date" value="${D(14).slice(0, 10)}"></div><div class="note b-blue">${ic('info')}<div class="small">A new resubmission box opens for the learner (amber round) with this deadline. The assessor is notified.</div></div>`;
  if (a === 'extendDl') extra = `<div class="field"><label for="xdate">New deadline</label><input class="input" id="xdate" type="date" value="${D(21).slice(0, 10)}"></div><p class="small muted">The learner sees the new deadline on this item; the assessor is notified.</p>`;
  if (a === 'decline') extra = `<label class="tgl"><input type="checkbox" id="xdisc" data-onchange="kDiscTgl"><span>Also discontinue this enrolment</span></label><div id="kdisc-w" class="note b-red" hidden>${ic('alert')}<div class="small"><strong>Blocks this course/batch only; other enrolments unaffected; records kept.</strong></div></div><p class="xs muted">The learner sees "No further resubmission". No academic-support or tutor option exists.</p>`;
  if (a === 'approve' && i.type === 'Discontinue enrolment — academic') { title = 'Approve discontinuation — ' + i.id; extra = `<div class="note b-red">${ic('alert')}<div class="small"><strong>Effect:</strong> ${esc(courseOfI(i))} (${esc(batchOfI(i))}) is locked for ${esc(learnerOfI(i))}. Other enrolments are unaffected and all records are kept. The coordinator's roster shows Discontinued.</div></div>`; }
  reasonDlg({ title, ok: a === 'approve' ? (i.type === 'Discontinue enrolment — academic' ? 'Approve discontinuation' : i.type === 'Reactivate enrolment — academic' ? 'Approve reactivation' : ACTLABEL[a]) : ACTLABEL[a], danger: ['reject', 'decline', 'approve'].includes(a) && !['More time on short course', 'Reactivate enrolment — academic'].includes(i.type), extra,
    onOk: r => { applyDecision(i, a, r, { days: +($('#xdays')?.value || 14), date: $('#xdate')?.value, disc: $('#xdisc')?.checked }); render(); } });
};
INP.kDiscTgl = el => { const w = $('#kdisc-w'); if (w) w.hidden = !el.checked; };
const OUTCOME = { grant: 'Granted', repurchase: 'Re-purchase Required', extend: 'Extension', exceptional: 'Exceptional resubmission', extendDl: 'Extension', reject: 'Rejected' };
const _applyK = applyDecision;
applyDecision = function (i, a, r, o = {}) {
  const wasOpen = isOpen(i);
  if (i.type === 'Extra quiz attempts' && a === 'grant' && i.req && i.v) { const e = STORE.worlds[i.v].enrolments.find(x => x.title === i.req.target); if (e && e.quiz) e.quiz._orig = e.quiz._orig || 3; }
  _applyK(i, a, r, o);
  if (!ACA_TYPES.includes(i.type) || ['note', 'info', 'return'].includes(a)) return;
  const d = i.data || {};
  let out = OUTCOME[a] || null;
  if (i.type === 'Resubmission limit reached') {
    if (a === 'decline') out = o.disc ? 'Discontinued' : 'Declined';
    if (d.v && d.aid) {
      const as = STORE.worlds[d.v].assignments.find(x => x.id === d.aid);
      if (as && a === 'exceptional' && o.date) { as.resubDue = new Date(o.date + 'T20:59:00Z').toISOString(); as.exceptional = true; notifyLearner(d.v, 'Assignments', 'Exceptional resubmission granted', `${as.title}: resubmit by ${fdt(as.resubDue)}.`, 'assignment.' + as.id); }
      if (as && a === 'decline') { as.declined = true; if (o.disc) logA('Learners', `${VNAME(d.v)} · ${STORE.worlds[d.v].nvq.title}`, 'Enrolment discontinued', 'Active', 'Discontinued', r); }
    }
    tasNotify('Recommendation decided', `${i.id} · ${learnerOfI(i)}: ${out}`, 't-approvals', 'Marking');
  }
  if (i.type === 'Discontinue enrolment — academic' && a === 'approve') {
    out = 'Discontinued';
    if (d.v) { const w = STORE.worlds[d.v]; w.nvq.status = 'Discontinued'; w.nvq.reason = 'Discontinued by the Academy: ' + r; notifyLearner(d.v, 'Enrolment', 'Enrolment discontinued', `${w.nvq.title} was discontinued. Your other enrolments are unaffected.`, 'courses'); logA('Learners', `${VNAME(d.v)} · ${w.nvq.title}`, 'Enrolment discontinued', 'Active', 'Discontinued', r); }
    tasNotify('Recommendation decided', `${i.id} · ${learnerOfI(i)}: discontinuation approved`, 't-approvals', 'Marking');
  }
  if (i.type === 'Discontinue enrolment — academic' && a === 'reject') tasNotify('Recommendation decided', `${i.id} · ${learnerOfI(i)}: discontinuation rejected`, 't-approvals', 'Marking');
  if (a === 'grant' && i.req) { i.req.grant = `+${quizInfo(i).max} attempts (original allowance)`; }
  if (out && wasOpen) { i.outcome = out; if (i.req) i.req.outcome = out; if (!i.req) { i.decidedBy = ADMIN.me.name; } }
};
// Super Admin override of an Academic Admin decision → the Academic Admin is notified (§A7)
const _logAK = logA;
logA = function (module, entity, action, before, after, reason) {
  _logAK(module, entity, action, before, after, reason);
  if (module === 'Approvals Queue' && action === 'Override decision') { const i = allQueue().find(x => x.id === entity); if (i && ACA_TYPES.includes(i.type)) { i.outcome = after === 'Approved' ? (i.type === 'More time on short course' ? 'Extension' : 'Granted') : after === 'Rejected' ? 'Rejected' : null; acaNotify('Your decision was overridden', `${i.id} · ${learnerOfI(i)}: ${before} → ${after} (${ADMIN.me.name}) — ${reason}`, 'a-queue.' + i.id, [ACA_A, ACA_B].includes(i.decidedBy) ? i.decidedBy : 'all'); } }
};

/* ---------- 6.1 Dashboard [NEW] ---------- */
const kEmpty = () => ADMIN.edge === 'kEmpty';
const kList = (items, empty) => items.length ? `<ul class="list">${items.join('')}</ul>` : `<div class="empty small">${ic('check', 20)}<span>${empty}</span></div>`;
const kLi = (main, sub, right = '') => `<li class="li"><div class="li-b"><span class="strong small">${main}</span>${sub ? `<span class="xs muted">${sub}</span>` : ''}</div>${right}</li>`;
function batchStaffOk(b) { return !!(b.coord && b.teachers.length && b.assessors.length); }
function kConflicts() { return (STORE.aca.conflicts || []).filter(c => !c.resolved); }
SCREENS['k-dashboard'] = () => {
  const E = kEmpty(), q = E ? [] : allQueue(), mine = q.filter(awaitingMe), escd = q.filter(i => i.status === 'Escalated' && isOpen(i));
  const byType = t => mine.filter(i => i.type === t);
  const apps = E ? [] : allApplications(), unassigned = apps.filter(a => /Unassigned/.test(a.reviewer) && ['Pending — Documents Required', 'Under Review'].includes(a.status)), nearing = apps.filter(a => a.status === 'Under Review' && a.days >= 5 && !a.escalated), escApps = apps.filter(a => a.escalated), placement = apps.filter(a => a.placement);
  const soon = E ? [] : ADMIN.batches.filter(b => ['Planned', 'Open'].includes(b.status) && daysTo(b.start) >= 0 && daysTo(b.start) <= 31), full = E ? [] : ADMIN.batches.filter(b => b.enrolled >= b.cap && b.wait), missing = E ? [] : ADMIN.batches.filter(b => ['Planned', 'Open', 'In Progress'].includes(b.status) && !batchStaffOk(b));
  const drafts = E ? [] : adminAssignments().filter(a => a.status === 'Draft'), dueSoon = E ? [] : STORE.worlds.C.assignments.filter(a => daysTo(a.resubDue || a.due) >= 0 && daysTo(a.resubDue || a.due) <= 7);
  const uncProgs = E ? [] : ADMIN.programmes.filter(p => p.draft || p.id === 'NV-L3'), noType = E ? [] : [['NV-L3D', 'U310 LO2 — Promote safe medication practice'], ['NV-L3D', 'U311 LO1 — Understand digital care records']];
  const conf = E ? [] : kConflicts(), overrides = E ? [] : q.filter(i => i.override && [ACA_A, ACA_B].includes(i.decidedBy));
  const acts = E ? [] : ADMIN.audit.filter(a => a.role === 'Academic Admin' || ['Batches', 'Assignments', 'Scheduling', 'NVQ Programmes', 'Short Courses'].includes(a.module)).slice(0, 8);
  const tile = (t, label) => `<a class="kpi kpi-link" href="#a-queue" data-act="kGoQ" data-type="${esc(t)}"><span class="xs muted">${label}</span><span class="big-num num">${byType(t).length}</span><span class="small">${byType(t).length ? daysChip(Math.max(...byType(t).map(i => i.days || 0))) : '<span class="muted">None waiting</span>'}</span></a>`;
  return `${pageA(`Good morning, ${esc(ADMIN.me.first)}`, `Academic Admin · ${fd(now().toISOString())}`, `<button class="btn" data-act="newBatch">${ic('plus', 15)}Create batch</button><button class="btn btn-primary" data-go="a-queue">${ic('inbox', 15)}Open queue</button>`)}
  ${ADMIN.av === 'KC' ? `<div class="note b-amber">${ic('info')}<div class="small"><strong>Only one Academic Admin exists.</strong> Items you raise route to the Super Administrator.</div></div>` : ''}
  <section class="stack"><div class="row-b"><h2>Awaiting my decision</h2><span class="xs muted">Amber at 5+ days · red at 7+ days</span></div><div class="kpis">${tile('Extra quiz attempts', 'Extra quiz attempts')}${tile('More time on short course', 'More time')}${tile('Resubmission limit reached', 'Resubmission limit')}${tile('Discontinue enrolment — academic', 'Academic discontinuation')}${tile('Reactivate enrolment — academic', 'Academic reactivation')}</div>
    ${escd.length ? `<div class="card"><h3 class="small">Escalated to Super Admin (read-only)</h3>${kList(escd.map(i => kLi(`<a href="#a-queue.${i.id}" data-go="a-queue" data-id="${i.id}" class="mono">${i.id}</a> · ${esc(qLbl(i.type))}`, esc(learnerOfI(i)), daysChip(i.days))), '')}</div>` : ''}</section>
  <div class="grid-2">
    <section class="card"><div class="card-h"><h2>${ic('clip')}Admissions</h2><button class="btn btn-sm btn-ghost" data-go="a-admissions">Open</button></div>
      <h3 class="small">Without a reviewer (${unassigned.length})</h3>${kList(unassigned.map(a => kLi(esc(a.name), `${esc(a.programme)} · applied ${fd(a.applied)}`, `<button class="btn btn-sm" data-act="assignRev" data-id="${a.id}">Assign</button>`)), 'Every application has a reviewer.')}
      <h3 class="small">Reviews nearing 7 days (${nearing.length})</h3>${kList(nearing.map(a => kLi(esc(a.name), esc(a.reviewer), daysChip(a.days))), 'No reviews nearing the SLA.')}
      <h3 class="small">Escalated reviews (${escApps.length})</h3>${kList(escApps.map(a => kLi(esc(a.name), esc(a.reviewer), chip('Escalated', 'red'))), 'Nothing escalated.')}
      <h3 class="small">Approved — awaiting batch placement (${placement.length})</h3>${kList(placement.map(a => kLi(esc(a.name), esc(a.programme), `<button class="btn btn-sm" data-act="kPlace" data-id="${a.id}">Place</button>`)), 'No one waiting for a batch.')}</section>
    <section class="card"><div class="card-h"><h2>${ic('users')}Batches</h2><button class="btn btn-sm btn-ghost" data-go="a-batches">Open</button></div>
      <h3 class="small">Starting in the next 30 days (${soon.length})</h3>${kList(soon.map(b => kLi(`<a href="#a-batches.${b.code}" data-go="a-batches" data-id="${b.code}" class="mono">${b.code}</a> · ${esc(b.label)}`, `Starts ${fd(b.start)} · ${b.enrolled}/${b.cap} · Coordinator ${b.coord ? '✔' : '⚠'} Teacher ${b.teachers.length ? '✔' : '⚠'} Assessor ${b.assessors.length ? '✔' : '⚠'} · Schedule ${b.status === 'Planned' ? '⚠ incomplete' : '✔'}`, chip(b.status, BSTATUS[b.status]))), 'No batches start in the next 30 days.')}
      <h3 class="small">Full with a waitlist — demand alert (${full.length})</h3>${kList(full.map(b => kLi(`${b.code} · ${esc(b.label)}`, `${b.enrolled}/${b.cap} · ${b.wait} waiting`, `<button class="btn btn-sm" data-go="a-batches" data-id="${b.code}" data-tab="waitlist">Waitlist</button>`)), 'No full batches.')}
      <h3 class="small">Missing staff allocations (${missing.length})</h3>${kList(missing.map(b => kLi(`${b.code} · ${esc(b.label)}`, [!b.coord && 'Academic Coordinator', !b.teachers.length && 'Teacher', !b.assessors.length && 'Assessor'].filter(Boolean).join(', ') + ' missing', `<button class="btn btn-sm" data-act="batchStaff" data-id="${b.code}">Allocate</button>`)), 'Every active batch is fully staffed.')}</section>
  </div>
  <div class="grid-2">
    <section class="card"><div class="card-h"><h2>${ic('layers')}Curriculum health</h2></div>
      <h3 class="small">Programmes with uncovered criteria (${uncProgs.length})</h3>${kList(uncProgs.map(p => kLi(esc(p.title), p.draft ? 'Draft · 4 uncovered criteria' : 'Version 2 · see coverage analytics', `<button class="btn btn-sm" data-go="${p.draft ? 'a-programmes' : 'a-assignments'}" data-id="${p.draft ? p.id : 'coverage'}">Review</button>`)), 'Every criterion is covered.')}
      <h3 class="small">Draft assignments not published (${drafts.length})</h3>${kList(drafts.map(a => kLi(esc(a.title), `${esc(a.unit)} · ${a.mapped} criteria mapped`, `<button class="btn btn-sm" data-go="a-assignments" data-id="${a.id}">Open</button>`)), 'No drafts waiting.')}
      <h3 class="small">Learning Outcomes missing an assessment type — blocks publish (${noType.length})</h3>${kList(noType.map(x => kLi(esc(x[1]), 'Level 3 — 2027 update (draft)', chip('No type', 'red'))), 'Every Learning Outcome has a type.')}
      <h3 class="small">Deadlines in the next 7 days (${dueSoon.length})</h3>${kList(dueSoon.map(a => kLi(esc(a.title), 'Leicester Cohort 7 · due ' + fdt(a.resubDue || a.due))), 'No deadlines this week.')}</section>
    <section class="card"><div class="card-h"><h2>${ic('cal')}Scheduling conflicts</h2><button class="btn btn-sm btn-ghost" data-go="a-scheduling">Open scheduling</button></div>
      ${kList(conf.map(c => kLi(esc(c.what), esc(c.detail), `<button class="btn btn-sm" data-act="kResolve" data-id="${c.id}">Resolve</button>`)), 'No conflicts detected.')}
      <h2 style="margin-top:12px">${ic('refresh')}Recent Super Admin overrides of my decisions</h2>
      ${kList(overrides.map(i => kLi(`<a href="#a-queue.${i.id}" data-go="a-queue" data-id="${i.id}" class="mono">${i.id}</a> · ${esc(qLbl(i.type))}`, `<span class="strike">${esc(i.override.from)}</span> → ${esc(i.override.to)} · ${esc(i.override.by)}: ${esc(i.override.reason)}`)), 'None of your decisions have been overridden.')}</section>
  </div>
  <section class="stack"><h2>Academic KPIs</h2><div class="kpis">${E ? kpi('Active NVQ learners', 0) + kpi('Short-course enrolments', 0) + kpi('Pending markings', 0) : kpi('Active NVQ learners', 116, 'L2 41 · L3 63 · L5 12', 'a-learners') + kpi('Short-course enrolments', ADMIN.courses.filter(c => c.status === 'Published').reduce((s, c) => s + c.enrol, 0), 'Published courses') + kpi('Average progress', '58%') + kpi('Completion rate', '74%', 'last 12 months') + kpi('Overdue submissions', 9, '', 'a-records') + kpi('Pending markings', 23, 'Sarah 9 · James 8 · Omar 6', 'k-staff..marking') + kpi('Avg marking turnaround', '4.2 days') + kpi('At-risk / stalled', 7, '', 'a-learners')}</div></section>
  <section class="card"><div class="card-h"><h2>Recent activity</h2></div>${acts.length ? `<ul class="list">${acts.map(a => kLi(`${esc(a.actor)} · ${esc(a.action)}`, `${esc(a.entity)} · ${fdt(a.at)}`)).join('')}</ul>` : '<div class="empty small">No recent activity.</div>'}</section>`;
};
ACT.kGoQ = el => { setUi('kqTab', 'me'); const st = S.ui['dt-kqueue-me'] = S.ui['dt-kqueue-me'] || { q: '', f: {}, sort: null, page: 0, hide: ['batch'], sel: [] }; st.f = { type: el.dataset.type }; go('a-queue'); };
ACT.kResolve = el => { const c = STORE.aca.conflicts.find(x => x.id === el.dataset.id); reasonDlg({ title: 'Resolve conflict — ' + c.what, ok: 'Mark resolved', body: `<p class="small">${esc(c.detail)}</p><div class="field"><label for="kr-a">Resolution</label><select class="select" id="kr-a"><option>Move the second session by one hour</option><option>Assign a different teacher</option><option>Cancel the duplicate session</option></select></div>`, onOk: r => { c.resolved = true; logA('Scheduling', c.detail, 'Conflict resolved', 'Conflict', $('#kr-a').value, r); render(); toast('Conflict resolved. Affected calendars updated and staff notified.'); } }); };
ACT.kPlace = el => { const a = allApplications().find(x => x.id === el.dataset.id); const opts = ADMIN.batches.filter(b => b.course === a.programme && ['Planned', 'Open'].includes(b.status)); openModal({ title: 'Batch placement — ' + esc(a.name), body: `<fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Placement</legend>${opts.map((b, k) => `<label class="check"><input type="radio" name="kpl" value="${b.code}" ${k === 0 ? 'checked' : ''}>${esc(b.label)} (${b.code}) · ${b.enrolled}/${b.cap}${b.enrolled >= b.cap ? ' — full: waitlist' : ''}</label>`).join('')}<label class="check"><input type="radio" name="kpl" value="wait">Waitlist for the next intake</label></fieldset><p class="xs muted">Batches using the auto-on-admission rule place learners automatically.</p>`, actions: [{ label: 'Cancel' }, { label: 'Confirm placement', cls: 'btn-primary', fn: () => { const v = ($('#modal-root input[name="kpl"]:checked') || {}).value; const s = ADMIN.apps.find(x => x.id === a.id); const b = ADMIN.batches.find(x => x.code === v); let msg; if (b && b.enrolled < b.cap) { b.enrolled++; b.roster.push([a.name, a.id, 'Self-funded']); s.placed = b.code; msg = `${a.name} placed in ${b.code}. The coordinator's roster is updated.`; } else { if (b) b.wait++; s.placed = 'Waitlist'; msg = `${a.name} added to the waitlist.`; } s.placement = null; logA('Batches', b ? `${b.label} (${b.code})` : 'Waitlist', 'Learner added (admission placement)', '—', a.name, ''); render(); toast(msg); } }] }); };

/* ---------- 6.3 Learners (academic view) ---------- */
function acaLearnerRow(l) {
  const w = l.v ? STORE.worlds[l.v] : null, crit = w && w.flags.admitted ? withW(l.v, () => allCrit()) : null;
  const b = w ? (w.flags.admitted && w.nvq ? (w.nvq.batch || '').split(' — ')[1] || '—' : '—') : (ADMIN.batches.find(x => x.roster.some(r => r[1] === l.id)) || ADMIN.batches.find(x => l.courses.some(c => x.course.startsWith(c.split(' (')[0])) && x.status === 'In Progress') || {}).code || '—';
  const h = hashN(l.id), prog = crit ? pctOf(crit) : l.courses.some(c => c.includes('Diploma')) ? 20 + h % 60 : 30 + h % 70;
  const five = crit ? countStates(crit) : { 'Not Started': 10 - h % 6, 'In Progress': 3 + h % 3, 'Action Required': h % 3, 'Added to PD': h % 2, 'Achieved': 6 + h % 9 };
  const disc = (w && w.enrolments.some(e => e.status === 'Discontinued')) || (w && w.nvq && w.flags.admitted && w.nvq.status === 'Discontinued') || l.flags.includes('Discontinued enrolment');
  const allDisc = w ? w.enrolments.length && w.enrolments.every(e => e.status === 'Discontinued') : false;
  const flags = [l.flags.includes('At risk') && 'At risk', h % 5 === 0 && 'Stalled', (w ? w.flags.admitted && w.assignments && w.assignments.some(a => a.closed) : h % 4 === 1) && 'Overdue submissions', disc && 'Discontinued'].filter(Boolean);
  const bb = ADMIN.batches.find(x => x.code === b);
  return { ...l, batch: b, status: allDisc ? 'Discontinued' : l.rec === 'Archived' ? 'Archived' : 'Active', prog, five, assessor: bb ? bb.assessors[0] || '—' : '—', aflags: flags };
}
const _learnersK = SCREENS['a-learners'];
SCREENS['a-learners'] = (p) => {
  if (!isAca()) return _learnersK(p);
  const rows = allLearners().map(acaLearnerRow);
  return `${pageA('Learners', `Academic view · ${rows.length} learners`)}<div class="note b-grey">${ic('lock')}<div class="small">Payments, fees and account administration aren't shown in the academic view.</div></div>
  ${dt({ id: 'klearners', name: 'Learners (academic)', rows, search: l => l.id + l.name + l.courses.join(' '), pageSize: 12,
    filters: [{ k: 'b', l: 'Batch', get: l => l.batch }, { k: 's', l: 'Enrolment status', get: l => l.status, opts: ['Active', 'Discontinued', 'Archived'] }, { k: 'a', l: 'Assessor', get: l => l.assessor }, { k: 'f', l: 'Flag', get: l => l.aflags.join('|') || 'None', opts: ['At risk', 'Stalled', 'Overdue submissions', 'Discontinued'] }],
    cols: [{ k: 'id', l: 'Learner ID', h: l => `<span class="mono small nowrap">${l.id}</span>` }, { k: 'name', l: 'Name', h: l => `<a href="#a-learner.${l.id}" data-go="a-learner" data-id="${l.id}" class="strong nowrap">${esc(l.name)}</a>` }, { k: 'courses', l: 'Programmes / courses', h: l => `<span class="small">${l.courses.slice(0, 2).map(esc).join('<br>')}${l.courses.length > 2 ? `<br><span class="muted">+${l.courses.length - 2} more</span>` : ''}</span>`, v: l => l.courses.join(', ') }, { k: 'batch', l: 'Batch', h: l => `<span class="mono small nowrap">${l.batch}</span>` }, { k: 'status', l: 'Enrolment', h: l => chip(l.status, l.status === 'Active' ? 'green' : l.status === 'Discontinued' ? 'red' : 'grey') }, { k: 'prog', l: 'Progress', h: l => `<span class="num">${l.prog}%</span>`, s: l => l.prog, r: 1 }, { k: 'five', l: 'Five-state summary', h: l => fiveBar(l.five, 'sm'), v: () => '' }, { k: 'last', l: 'Last activity', h: l => l.last ? fd(l.last) : '—', s: l => l.last || '', hide: 1 }, { k: 'assessor', l: 'Assessor' }, { k: 'flags', l: 'Flags', h: l => l.aflags.map(f => chip(f === 'Discontinued' ? 'Discontinued enrolment' : f, f === 'Discontinued' ? 'red' : 'amber')).join(' ') || '<span class="muted small">—</span>', v: l => l.aflags.join(', ') }],
    act: l => `<button class="btn btn-sm" data-go="a-learner" data-id="${l.id}">Open</button>` })}`;
};
const KLTABS = ['overview', 'enrolments', 'admission', 'academic', 'observations', 'attendance', 'requests', 'activity'];
const _learnerK = SCREENS['a-learner'];
SCREENS['a-learner'] = (p) => {
  if (!isAca()) return _learnerK(p);
  const saved = LTABS.slice(); LTABS.splice(0, LTABS.length, ...saved.filter(t => KLTABS.includes(t[0])));
  const tab = KLTABS.includes(p.tab) ? p.tab : 'overview';
  let html;
  try { html = _learnerK({ ...p, tab }); } finally { LTABS.splice(0, LTABS.length, ...saved); }
  const L = learnerById(p.id); if (!L) return html;
  html = html.replace(/<button class="btn[^"]*" data-act="lAct"[^>]*>[^]*?<\/button>/g, '').replace(/<button class="btn btn-sm" data-act="lEnr" data-a="discontinue"[^>]*>[^<]*<\/button>/g, '').replace(/<button class="btn btn-sm" data-act="restoreAccess"[^>]*>[^<]*<\/button>/g, '').replace(/<button class="btn btn-sm" data-act="uploadOnBehalf"[^>]*>[^]*?<\/button>/g, '<span class="xs muted">Read-only' + '</span>').replace(/ · \d+\.\d+\.\d+\.\d+/g, '').replace(/<button class="btn btn-sm" data-act="lEnr" data-a="reactivate"[^>]*>[^<]*<\/button>/g, '<span class="xs muted">Reactivation: Assessor request → Approvals Queue</span>');
  html = html.replace('<section class="card"><h2>Quick actions</h2><div class="stack">', `<section class="card"><h2>Quick actions</h2><div class="stack"><button class="btn" data-act="kProgress" data-id="${L.id}">${ic('download', 15)}Generate progress report</button><p class="xs muted">Password resets aren't available to Academic Admins</p>`);
  if (tab === 'enrolments') html += `<section class="card"><h2>Batch placement</h2><p class="small muted">Place this learner in a batch or on a waitlist. Learners can't be transferred between batches.</p><div class="row"><button class="btn btn-sm" data-act="kPlaceL" data-id="${L.id}">Place in batch / waitlist</button></div></section>`;
  return html;
};
ACT.kProgress = el => { const L = learnerById(el.dataset.id); logA('Reports & Analytics', L.id, 'Progress report generated', '—', 'PDF', ''); toast(`Preparing progress report for ${esc(L.name)} — we'll notify you. This export is logged.`, 'info'); setTimeout(() => { acaNotify('Export ready', 'Progress report — ' + L.name, 'a-reports', ADMIN.me.name, 'System'); if (S.portal === 'admin') render(); }, 1500); };
ACT.kPlaceL = el => { const L = learnerById(el.dataset.id); const active = ADMIN.batches.find(b => ['Open', 'In Progress'].includes(b.status) && batchRoster(b).some(r => r[1] === L.id)); if (active) { openModal({ title: 'Already in an active batch', body: `<div class="note b-red">${ic('alert')}<div class="small"><strong>${esc(L.name)} is in ${esc(active.label)} (${active.code}).</strong> Learner transfer between batches is not permitted.</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; } ACT.addToBatch({ dataset: { id: (ADMIN.batches.find(b => ['Planned', 'Open'].includes(b.status)) || ADMIN.batches[0]).code, pre: L.id } }); };

/* ---------- 6.5 Staff Allocations [NEW · TBD] ---------- */
function staffLoad(s) { const h = hashN(s.id); const assessor = s.roles.includes('Assessor'); return { allocs: STORE.aca.alloc.filter(a => a.who === s.name).length + ADMIN.batches.filter(b => b.teachers.includes(s.name) || b.assessors.includes(s.name) || b.coord === s.name).length, caseload: s.alloc || 0, pending: assessor ? 2 + h % 9 : 0, turnaround: assessor ? (2.5 + (h % 30) / 10).toFixed(1) + ' days' : '—' }; }
const PENDING_MARK = () => [['Oliver Bennett', 'Assignment 2 (Resub 1)', 'Sarah Okonkwo', D(-6)], ['Chloe Hughes', 'Assignment 7 (Resub 2)', 'Sarah Okonkwo', D(-4)], [VNAME('C'), 'Assignment 4 (Sub 1)', 'Sarah Okonkwo', D(-1)], ['Ruby Clarke', 'L2 Assignment 3 (Sub 1)', 'James Pryce', D(-8)], ['Noah Edwards', 'L2 Assignment 4 (Resub 1)', 'James Pryce', D(-3)], ['Leah Fernandes', 'Assignment 1 (Sub 1)', 'Omar Siddiqui', D(-2)], ['Ahmed Karim', 'Assignment 2 (Sub 1)', 'Omar Siddiqui', D(-5)], ['Jack Thompson', 'Assignment 5 (Sub 1)', 'Kevin Doyle (deactivated)', D(-12)]].map((r, k) => ({ id: 'PM-' + k, learner: r[0], item: r[1], assessor: (STORE.aca.markRe || {})['PM-' + k] || r[2], at: r[3] }));
SCREENS['k-staff'] = (p) => {
  const t = p.tab || 'staff', teach = ADMIN.staff.filter(s => s.roles.some(r => ['Teacher', 'Assessor', 'Academic Coordinator'].includes(r)));
  const head = `${pageA('Staff Allocations', 'Accounts are read-only here — allocate courses, programmes, batches and learners', `<button class="btn" data-act="kRealloc">${ic('refresh', 15)}Re-allocate learners</button><button class="btn btn-primary" data-act="kAlloc">${ic('plus', 15)}Allocate</button>`)}<p class="small"></p>${subtabs([['staff', 'Staff'], ['allocs', 'Allocations'], ['marking', 'Pending marking'], ['workload', 'Workload']], t, 'k-staff')}`;
  if (t === 'allocs') return head + dt({ id: 'kallocs', name: 'Allocations', rows: STORE.aca.alloc.map((a, k) => ({ ...a, id: 'AL-' + k })), search: a => a.who + a.what, filters: [{ k: 'k', l: 'Type', get: a => a.kind, opts: ['Course', 'Programme', 'Batch', 'Learner'] }, { k: 'w', l: 'Staff', get: a => a.who }], cols: [{ k: 'who', l: 'Staff member' }, { k: 'kind', l: 'Type', h: a => `<span class="typebadge">${a.kind}</span>` }, { k: 'what', l: 'Allocated to' }, { k: 'since', l: 'Since', h: a => fd(a.since), s: a => a.since }] });
  if (t === 'marking') return head + `<div class="note b-blue">${ic('info')}<div class="small">Re-allocate pending items when an assessor is unavailable. Attribution reflects whoever actually marks.</div></div>` + dt({ id: 'kmark', name: 'Pending marking', rows: PENDING_MARK(), bulk: [{ l: 'Re-allocate selected', fn: ids => kReMark(ids) }], filters: [{ k: 'a', l: 'Assessor', get: r => r.assessor }], cols: [{ k: 'learner', l: 'Learner' }, { k: 'item', l: 'Submission' }, { k: 'assessor', l: 'Assessor' }, { k: 'at', l: 'Waiting since', h: r => `${fd(r.at)} ${daysChip(-daysTo(r.at))}`, s: r => r.at }], act: r => `<button class="btn btn-sm" data-act="kReMark1" data-id="${r.id}">Re-allocate</button>` });
  if (t === 'workload') return head + `<section class="card"><div class="tbl-wrap"><table class="tbl dense"><caption class="sr">Assessor workload</caption><thead><tr><th>Assessor</th><th class="r">Caseload</th><th class="r">Pending marking</th><th class="r">Average turnaround</th><th>Load</th></tr></thead><tbody>${teach.filter(s => s.roles.includes('Assessor') && s.status === 'Active').map(s => { const w = staffLoad(s), pct = Math.min(100, w.caseload * 5); return `<tr><td>${esc(s.name)}</td><td class="r num">${w.caseload}</td><td class="r num">${w.pending}</td><td class="r">${w.turnaround}</td><td><span class="small">${pct}% of target</span></td></tr>`; }).join('')}</tbody></table></div></section>`;
  return head + dt({ id: 'kstaff', name: 'Staff (read-only)', rows: teach.map(s => ({ ...s, ...staffLoad(s) })), search: s => s.name + s.roles.join(' '), filters: [{ k: 'r', l: 'Role', get: s => s.roles.join('|'), opts: ['Teacher', 'Assessor', 'Academic Coordinator'] }, { k: 's', l: 'Status', get: s => s.status, opts: ['Active', 'Suspended', 'Deactivated'] }], cols: [{ k: 'name', l: 'Name', h: s => `<strong>${esc(s.name)}</strong>` }, { k: 'roles', l: 'Roles', h: s => s.roles.map(r => `<span class="typebadge">${r}</span>`).join(' '), v: s => s.roles.join(', ') }, { k: 'allocs', l: 'Allocations', r: 1 }, { k: 'caseload', l: 'Caseload', r: 1 }, { k: 'pending', l: 'Pending marking', r: 1 }, { k: 'status', l: 'Status', h: s => chip(s.status, s.status === 'Active' ? 'green' : 'red') }] }) + `<p class="xs muted">${ic('lock', 12)} Creating or editing staff accounts is for the System Administrator or Super Administrator.</p>`;
};
const activeStaff = role => ADMIN.staff.filter(s => s.roles.includes(role) && s.status === 'Active').map(s => s.name);
function kAllocOpts(k) { return (k === 'Batch' ? ADMIN.batches.filter(b => !['Archived', 'Cancelled', 'Completed'].includes(b.status)).map(b => b.code + ' · ' + b.label) : k === 'Course' ? ADMIN.courses.filter(c => c.status === 'Published').map(c => c.title) : k === 'Programme' ? ADMIN.programmes.filter(p => p.status === 'Active').map(p => p.title) : allLearners().slice(0, 20).map(l => l.name)).map(o => `<option>${esc(o)}</option>`).join(''); }
ACT.kAlloc = () => openModal({ title: 'Allocate', sub: '', body: `<div class="field"><label for="ka-s">Teacher or Assessor</label><select class="select" id="ka-s">${[...new Set(activeStaff('Teacher').concat(activeStaff('Assessor')))].map(n => `<option>${n}</option>`).join('')}</select></div><div class="field"><label for="ka-k">Allocate</label><select class="select" id="ka-k" data-onchange="kAllocKind"><option>Batch</option><option>Course</option><option>Programme</option><option>Learner</option></select></div><div class="field"><label for="ka-w">To</label><select class="select" id="ka-w">${kAllocOpts('Batch')}</select></div><div class="field"><label for="ka-r">Reason (required)</label><textarea class="textarea" id="ka-r"></textarea></div>`,
  actions: [{ label: 'Cancel' }, { label: 'Allocate', cls: 'btn-primary', fn: () => { const r = mval('#ka-r'); if (!r) { fieldErr('#ka-r', 'Enter a reason'); return false; } const who = mval('#ka-s'), kind = mval('#ka-k'), what = mval('#ka-w'); STORE.aca.alloc.unshift({ who, kind, what, since: now().toISOString() }); if (kind === 'Batch') { const b = ADMIN.batches.find(x => x.code === what.split(' · ')[0]), role = ADMIN.staff.find(s => s.name === who).roles.includes('Assessor') ? 'assessors' : 'teachers'; if (b && !b[role].includes(who)) b[role].push(who); syncTasBatches(); } logA('Staff Allocations', who, 'Allocated ' + kind.toLowerCase(), '—', what, r); tasNotify('New allocation', `${who}: ${kind} — ${what}`, 't-students', 'Caseload'); render(); toast(`${who} allocated to ${what}. They have been notified.`); } }] });
INP.kAllocKind = el => { $('#ka-w').innerHTML = kAllocOpts(el.value); };
ACT.kRealloc = () => {
  const st = { step: 1, from: 'Sarah Okonkwo', names: [], to: 'James Pryce' };
  const pool = ['Oliver Bennett', 'Chloe Hughes', 'Amelia Price', 'Ethan Parker', 'Isla Morgan'];
  const draw = () => openModal({ title: `Re-allocate learners — step ${st.step} of 3`, sub: '', size: 'lg', body: st.step === 1 ? `<div class="field"><label for="kr-f">Current assessor</label><select class="select" id="kr-f">${activeStaff('Assessor').map(n => `<option ${n === st.from ? 'selected' : ''}>${n}</option>`).join('')}</select></div><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Choose learners</legend>${pool.map(n => `<label class="check"><input type="checkbox" class="kr-n" value="${n}" ${st.names.includes(n) ? 'checked' : ''}>${n}</label>`).join('')}</fieldset>` : st.step === 2 ? `<div class="field"><label for="kr-t">New assessor</label><select class="select" id="kr-t">${activeStaff('Assessor').filter(n => n !== st.from).map(n => `<option ${n === st.to ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : `<div class="note b-blue">${ic('info')}<div class="small"><strong>Preview:</strong> ${st.names.length} learner(s) move from ${esc(st.from)} to ${esc(st.to)}: ${st.names.map(esc).join(', ')}.<br>Historical marking keeps original assessor.</div></div><div class="field"><label for="kr-r">Reason (required)</label><textarea class="textarea" id="kr-r"></textarea></div>`,
    actions: [st.step === 1 ? { label: 'Cancel' } : { label: 'Back', fn: () => { st.step--; draw(); } }, { label: st.step === 3 ? 'Confirm re-allocation' : 'Next', cls: 'btn-primary', fn: () => {
      if (st.step === 1) { st.from = mval('#kr-f'); st.names = $$('#modal-root .kr-n:checked').map(x => x.value); if (!st.names.length) { toast('Choose at least one learner.', 'err'); return false; } }
      if (st.step === 2) st.to = mval('#kr-t');
      if (st.step === 3) { const r = mval('#kr-r'); if (!r) { fieldErr('#kr-r', 'Enter a reason'); return false; } tasRealloc(st.from, st.names, st.to); logA('Staff Allocations', st.names.join(', '), 'Learners re-allocated', st.from, st.to, r); render(); toast(`${st.names.length} learner(s) re-allocated to ${st.to}. Historical marking keeps the original assessor.`); return; }
      st.step++; draw(); } }] });
  draw();
};
function kReMark(ids) { reasonDlg({ title: `Re-allocate ${ids.length} pending marking item(s)`, ok: 'Re-allocate', body: `<p class="small"></p>`, extra: `<div class="field"><label for="km-t">New assessor</label><select class="select" id="km-t">${activeStaff('Assessor').map(n => `<option>${n}</option>`).join('')}</select></div><p class="small muted">Attribution reflects whoever actually marks.</p>`, onOk: r => { const to = $('#km-t').value; STORE.aca.markRe = STORE.aca.markRe || {}; ids.forEach(id => STORE.aca.markRe[id] = to); logA('Staff Allocations', ids.join(', '), 'Marking re-allocated', '—', to, r); tasNotify('Marking re-allocated to you', `${ids.length} item(s) re-allocated to ${to}`, 't-queue', 'Marking'); dts('kmark') && (dts('kmark').sel = []); render(); toast('Pending marking re-allocated.'); } }); }
ACT.kReMark1 = el => kReMark([el.dataset.id]);

/* ---------- 6.8 Observation Criteria Library [NEW] ---------- */
SCREENS['k-obslib'] = () => `${pageA('Observation Criteria Library', 'Illumin Academy criteria — stored and shown separately from NVQ criteria', `<button class="btn btn-primary" data-act="kLib" data-id="">${ic('plus', 15)}Add criterion</button>`)}
  <div class="note b-blue">${ic('shield')}<div class="small"><strong>Internal quality standards — not qualification competency.</strong> These are observed alongside NVQ criteria but never count towards the qualification.</div></div>
  ${dt({ id: 'kobslib', name: 'Observation criteria library', rows: STORE.aca.obsLib, rid: c => c.code, search: c => c.code + c.title + c.desc, filters: [{ k: 'c', l: 'Category', get: c => c.cat, opts: ['Professional conduct', 'Care standards', 'Safeguarding', 'Other'] }, { k: 's', l: 'Status', get: c => c.status, opts: ['Active', 'Draft', 'Retired'] }],
    cols: [{ k: 'code', l: 'Code', h: c => `<span class="code">${c.code}</span>` }, { k: 'title', l: 'Title', h: c => `<strong>${esc(c.title)}</strong><div class="xs muted">${esc(c.desc)}</div>` }, { k: 'cat', l: 'Category' }, { k: 'status', l: 'Status', h: c => chip(c.status, c.status === 'Active' ? 'green' : c.status === 'Draft' ? 'amber' : 'grey') }, { k: 'version', l: 'Version', h: c => 'v' + c.version, r: 1 }, { k: 'progs', l: 'Programmes attached', h: c => c.progs.map(p => `<span class="typebadge">${p}</span>`).join(' ') || '<span class="muted small">None</span>', v: c => c.progs.join(', ') }],
    act: c => `<button class="btn btn-sm" data-act="kLib" data-id="${c.code}">Edit</button> <button class="btn btn-sm" data-act="kLibAttach" data-id="${c.code}">Attach</button>${c.status !== 'Retired' ? ` <button class="btn btn-sm" data-act="kLibRetire" data-id="${c.code}">Retire</button>` : ''}` })}
  ${auditPanel(a => a.module === 'Observation Criteria Library')}`;
ACT.kLib = el => { const c = STORE.aca.obsLib.find(x => x.code === el.dataset.id); openModal({ title: c ? 'Edit criterion ' + c.code : 'Add criterion', body: `${c ? `<div class="note b-blue">${ic('layers')}<div class="small">Saving creates version ${c.version + 1}. Observations already recorded keep version ${c.version}.</div></div>` : ''}<div class="field"><label for="kl-t">Title</label><input class="input" id="kl-t" value="${c ? esc(c.title) : ''}"></div><div class="field"><label for="kl-d">Description</label><textarea class="textarea" id="kl-d">${c ? esc(c.desc) : ''}</textarea></div><div class="field"><label for="kl-c">Category</label><select class="select" id="kl-c">${['Professional conduct', 'Care standards', 'Safeguarding', 'Other'].map(x => `<option ${c && c.cat === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${c ? `<div class="field"><label for="kl-r">Reason for change (required)</label><textarea class="textarea" id="kl-r"></textarea></div>` : ''}`,
  actions: [{ label: 'Cancel' }, { label: c ? 'Save new version' : 'Add criterion', cls: 'btn-primary', fn: () => { const t = mval('#kl-t'); if (!t) { fieldErr('#kl-t', 'Enter a title'); return false; } if (c) { const r = mval('#kl-r'); if (!r) { fieldErr('#kl-r', 'Enter a reason'); return false; } logA('Observation Criteria Library', c.code, 'New version', 'v' + c.version, 'v' + (c.version + 1), r); Object.assign(c, { title: t, desc: mval('#kl-d'), cat: mval('#kl-c'), version: c.version + 1 }); } else { const code = 'IA-' + (STORE.aca.obsLib.length + 1); STORE.aca.obsLib.push({ code, title: t, desc: mval('#kl-d'), cat: mval('#kl-c'), status: 'Draft', progs: [], version: 1 }); logA('Observation Criteria Library', code, 'Criterion added', '—', 'Draft', ''); } render(); toast('Saved.'); } }] }); };
ACT.kLibAttach = el => { const c = STORE.aca.obsLib.find(x => x.code === el.dataset.id); openModal({ title: 'Attach ' + c.code + ' to programmes', body: `<fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Programmes / observation scopes</legend>${ADMIN.programmes.filter(p => p.status !== 'Retired').map(p => `<label class="check"><input type="checkbox" class="kl-p" value="${p.id}" ${c.progs.includes(p.id) ? 'checked' : ''}>${esc(p.title)}</label>`).join('')}</fieldset>`, actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => { const before = c.progs.join(', ') || '—'; c.progs = $$('#modal-root .kl-p:checked').map(x => x.value); logA('Observation Criteria Library', c.code, 'Attached to programmes', before, c.progs.join(', ') || '—', ''); render(); toast('Attachments saved.'); } }] }); };
ACT.kLibRetire = el => reasonDlg({ title: 'Retire criterion ' + el.dataset.id, ok: 'Retire', danger: true, body: '<p class="small">Retired criteria are kept for history and can\'t be added to new observations. Nothing is deleted.</p>', onOk: r => { const c = STORE.aca.obsLib.find(x => x.code === el.dataset.id); logA('Observation Criteria Library', c.code, 'Retired', c.status, 'Retired', r); c.status = 'Retired'; render(); toast('Criterion retired.'); } });

/* ---------- 6.13 Calendar Monitoring (view-only) [NEW — reuses the shared calendar] ---------- */
function kCalBody() {
  const fc = ui('kcC', ''), fb = ui('kcB', ''), fs = ui('kcS', ''), fty = ui('kcT', '');
  const live = ADMIN.batches.filter(b => ['Planned', 'Open', 'In Progress'].includes(b.status));
  const bs = live.filter(b => (!fc || b.course === fc) && (!fb || b.code === fb) && (!fs || b.teachers.includes(fs) || b.assessors.includes(fs) || b.coord === fs));
  const _be = batchEvents; let cal;
  try { batchEvents = b => _be(b).filter(e => !fty || e.type === fty).map(e => ({ ...e, title: b.code + ' · ' + e.title })); cal = cooCalendar(bs); } finally { batchEvents = _be; }
  const sel = (id, k, lbl, opts, v) => `<div class="field"><label for="${id}">${lbl}</label><select class="select" id="${id}" data-onchange="kCalF" data-k="${k}"><option value="">All</option>${opts.map(o => `<option value="${esc(o[0])}" ${v === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  // Agenda (list) view: a table with the full date filter (quick options + From–To) instead of a fixed 30 days
  if (ui('ccView', 'month') === 'agenda') { const rows = bs.flatMap(b => batchEvents(b).filter(e => !fty || e.type === fty).map(e => ({ ...e, b }))).sort((x, y) => x.start < y.start ? -1 : 1); cal = `<div class="row-b"><div class="row"><span class="chip t-outline">${tzl()}</span></div><div class="seg" role="group" aria-label="View">${[['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['agenda', 'Agenda']].map(([k, l]) => `<button aria-pressed="${k === 'agenda'}" data-act="ccView" data-v="${k}">${l}</button>`).join('')}</div></div><div class="legend">${Object.entries(EVLBL).map(([k, l]) => `<span><i class="lg-${k}"></i>${l}</span>`).join('')}</div>` + dt({ id: 'lu-r-calmon', name: 'Calendar events', rows, noExport: true, rid: e => e.b.code + e.id, empty: 'No events match these filters.', cols: [{ k: 'start', l: 'When', h: e => `<span class="nowrap">${fds(e.start)} ${ft(e.start)}</span>`, v: e => e.start }, { k: 'type', l: 'Type', h: e => `<span class="legend"><span><i class="lg-${e.type}"></i>${EVLBL[e.type]}</span></span>`, v: e => EVLBL[e.type] }, { k: 'title', l: 'Event', v: e => e.title }, { k: 'batch', l: 'Batch', h: e => `<span class="mono small">${e.b.code}</span>`, v: e => e.b.code + ' ' + e.b.label + ' ' + e.b.course }], act: e => `<button class="btn btn-sm btn-ghost" data-act="cooEvPop" data-b="${e.b.code}" data-id="${e.id}">Details</button>` }); }
  return `<div class="form-grid">${sel('kc-c', 'kcC', 'Course', [...new Set(live.map(b => b.course))].map(c => [c, c]), fc)}${sel('kc-b', 'kcB', 'Batch', live.map(b => [b.code, b.code + ' · ' + b.label]), fb)}${sel('kc-s', 'kcS', 'Staff', [...new Set(live.flatMap(b => [b.coord, ...b.teachers, ...b.assessors]).filter(Boolean))].map(n => [n, n]), fs)}${sel('kc-t', 'kcT', 'Event type', Object.entries(EVLBL), fty)}</div>
  ${bs.length ? cal : '<div class="card"><div class="empty">No events match these filters.</div></div>'}`;
}
SCREENS['k-calendar'] = () => `${pageA('Calendar Monitoring', 'All events across courses, batches and staff — view only')}
  <div class="note b-grey">${ic('lock')}<div class="small"><strong>Change events at their source (Scheduling / Assignments / Observations / Batches).</strong> Nothing can be edited here.</div></div>
  ${kCalBody()}`;
INP.kCalF = el => { setUi(el.dataset.k, el.value); render(); };
const _cooEvPopK = ACT.cooEvPop;
ACT.cooEvPop = el => {
  if (S.portal !== 'admin') return _cooEvPopK(el);
  const { b, e } = findEv(el.dataset.b, el.dataset.id), src = e.type === 'deadline' ? ['a-assignments', 'Assignments'] : e.type === 'obs' ? ['a-observations', 'Observations'] : ['a-scheduling', 'Scheduling'];
  openModal({ title: esc(e.title), sub: `${EVLBL[e.type]} · ${esc(b.label)}`, body: `<dl class="kv"><dt>When</dt><dd>${fdl(e.start)}, ${ft(e.start)} (${tzl()})</dd>${e.teacher ? `<dt>Teacher</dt><dd>${esc(e.teacher)}</dd>` : ''}<dt>Batch</dt><dd class="mono">${b.code}</dd></dl><p class="xs muted">View only — change this event at its source.</p>`, actions: [{ label: 'Open source: ' + src[1], cls: 'btn', fn: () => { setTimeout(() => go(src[0]), 0); } }, { label: 'Close', cls: 'btn-primary' }] });
};

/* ---------- 6.11 Batches: wizard, staff, add-after-start override, cancel table, coordinator rule (shared upgrades) ---------- */
function syncTasBatches() {
  const T = STORE.aca.touched = STORE.aca.touched || {};
  Object.values(TAS_USERS).forEach(u => {
    const orig = (STORE.aca.tasOrig[u.key] || u.batches).filter(c => !(T[c] && T[c].removed && T[c].removed.includes(u.name)));
    const added = ADMIN.batches.filter(b => T[b.code] && (b.teachers.includes(u.name) || b.assessors.includes(u.name))).map(b => b.code);
    u.batches = [...new Set(orig.concat(added))];
  });
}
const touch = (code, removed = []) => { const T = STORE.aca.touched = STORE.aca.touched || {}; T[code] = T[code] || { removed: [] }; T[code].removed = [...new Set(T[code].removed.concat(removed))]; };
const _batchesK = SCREENS['a-batches'];
SCREENS['a-batches'] = (p) => {
  if (!isAca() || p.id) return _batchesK(p);
  return `${pageA('Batches', 'Learners are never transferred between batches', `<button class="btn btn-primary" data-act="newBatch">${ic('plus', 15)}Create batch</button>`)}
  ${dt({ id: 'kbatches', name: 'Batches', rows: ADMIN.batches, rid: b => b.code, search: b => b.code + b.label + b.course, filters: [{ k: 's', l: 'Status', get: b => b.status, opts: ['Planned', 'Open', 'In Progress', 'Completed', 'Archived', 'Cancelled'] }, { k: 'c', l: 'Course', get: b => b.course }, { k: 'st', l: 'Staff', get: b => batchStaffOk(b) ? 'Complete' : 'Missing', opts: ['Complete', 'Missing'] }],
    cols: [{ k: 'code', l: 'Code', h: b => `<a href="#a-batches.${b.code}" data-go="a-batches" data-id="${b.code}" class="strong mono nowrap">${b.code}</a><div class="xs muted nowrap">${esc(b.label)}</div>` }, { k: 'course', l: 'Course', h: b => `<span class="small">${esc(b.course.replace(' (England)', ''))}</span>`, v: b => b.course, hide: 1 }, { k: 'dates', l: 'Intake dates', h: b => `<span class="small nowrap">${fd(b.start)} – ${fd(b.end)}</span>`, s: b => b.start }, { k: 'mode', l: 'Mode', hide: 1 }, { k: 'cap', l: 'Capacity', h: b => `<span class="num nowrap">${b.enrolled}/${b.cap}</span>${b.enrolled >= b.cap ? ' ' + chip('Full', 'amber') : ''}`, s: b => b.enrolled / b.cap }, { k: 'wait', l: 'Waitlist', r: 1 }, { k: 'coord', l: 'Academic Coordinator', h: b => b.coord ? esc(b.coord) : chip('Not assigned', 'red') }, { k: 'teachers', l: 'Teachers', h: b => `<span class="small">${esc(b.teachers.join(', ') || '—')}</span>`, v: b => b.teachers.join(', ') }, { k: 'assessors', l: 'Assessors', h: b => `<span class="small">${esc(b.assessors.join(', ') || '—')}</span>`, v: b => b.assessors.join(', ') }, { k: 'status', l: 'Status', h: b => chip(b.status, BSTATUS[b.status]) }, { k: 'ok', l: 'Staff', h: b => batchStaffOk(b) ? '<span title="Fully staffed">✔ <span class="sr">Complete</span></span>' : '<span title="Staff missing" style="color:var(--amber)">⚠ <span class="xs">Missing</span></span>', v: b => batchStaffOk(b) ? 'Complete' : 'Missing' }],
    act: b => `<button class="btn btn-sm" data-go="a-batches" data-id="${b.code}">Open</button>` })}`;
};
const _bdK = batchDetail;
batchDetail = function (code, t) {
  let html = _bdK(code, t); const b = ADMIN.batches.find(x => x.code === code); if (!b) return html;
  if (!b.coord) html = html.replace('<div class="row">', `<div class="note b-red">${ic('alert')}<div class="small"><strong>No Academic Coordinator assigned.</strong> This batch can't leave Planned until a coordinator is allocated. <button class="linklike" data-act="batchStaff" data-id="${b.code}">Allocate staff</button></div></div><div class="row">`);
  if (t === 'waitlist' && b.wait) html = html.replace(/<ol>([^]*?)<\/ol>/, (m, inner) => `<ol class="list">${inner.replace(/<li>([^<]*)<\/li>/g, (x, n) => `<li class="li"><div class="li-b"><strong>${n}</strong></div><button class="btn btn-sm" data-act="kOffer" data-id="${b.code}" data-n="${n}">Offer place</button><button class="btn btn-sm" data-act="kNextIntake" data-id="${b.code}" data-n="${n}">Move to next intake</button></li>`)}</ol>`);
  if (t === 'staff') html = html.replace(/<dl class="kv"><dt>Academic Coordinator<\/dt><dd>[^<]*<\/dd>/, `<dl class="kv"><dt>Academic Coordinator</dt><dd>${b.coord ? esc(b.coord) : chip('Not assigned', 'red')}</dd>`) + (b.coordHistory || b.staffHist ? `<section class="card"><h3>Allocation history</h3><ul class="list small">${(b.staffHist || []).map(h => `<li class="li">${esc(h[0])} · ${fdt(h[1])} · ${esc(h[2])}</li>`).join('')}${(b.coordHistory || []).map(h => `<li class="li">Coordinator ${esc(h[0])} · from ${fd(h[1])}${h[2] ? ' to ' + fd(h[2]) : ' (current)'}</li>`).join('')}</ul></section>` : '');
  if (isAca()) html = html.replace(/Transfer/g, '');
  return html;
};
ACT.kOffer = el => { const b = ADMIN.batches.find(x => x.code === el.dataset.id); if (b.enrolled >= b.cap) { openModal({ title: 'Batch is full', body: `<div class="note b-amber">${ic('alert')}<div class="small"><strong>${b.code} is at capacity (${b.enrolled}/${b.cap}).</strong> Offer a place when one becomes free, or move ${esc(el.dataset.n)} to the next intake.</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; } reasonDlg({ title: 'Offer waitlist place — ' + esc(el.dataset.n), ok: 'Offer place', onOk: r => { b.wait--; b.enrolled++; b.roster.push([el.dataset.n, '—', 'Self-funded']); touch(b.code); logA('Batches', `${b.label} (${b.code})`, 'Learner added (waitlist offer)', 'Waitlist', el.dataset.n, r); render(); toast(`${el.dataset.n} offered a place.`); } }); };
ACT.kNextIntake = el => { const b = ADMIN.batches.find(x => x.code === el.dataset.id), nx = ADMIN.batches.find(x => x.course === b.course && x.code !== b.code && ['Planned', 'Open'].includes(x.status) && x.start > b.start); reasonDlg({ title: 'Move to next intake — ' + esc(el.dataset.n), ok: 'Move', body: `<p class="small">${nx ? `Next intake: <strong>${esc(nx.label)} (${nx.code})</strong>, starts ${fd(nx.start)}.` : 'No later intake exists yet — the learner stays on the course waitlist.'}</p>`, onOk: r => { b.wait--; if (nx) nx.wait++; logA('Batches', `${b.label} (${b.code})`, 'Waitlist moved to next intake', b.code, nx ? nx.code : 'Course waitlist', r); render(); toast('Moved to the next intake.'); } }); };
const _lifeK = ACT.batchLife;
ACT.batchLife = el => { const b = ADMIN.batches.find(x => x.code === el.dataset.id); if (b.status === 'Planned' && !b.coord) { openModal({ title: 'Can\'t open this batch yet', body: `<div class="note b-red">${ic('alert')}<div class="small"><strong>An Academic Coordinator is required.</strong> Allocate a coordinator before moving ${b.code} out of Planned.</div></div>`, actions: [{ label: 'Close' }, { label: 'Allocate staff', cls: 'btn-primary', fn: () => { setTimeout(() => ACT.batchStaff({ dataset: { id: b.code } }), 0); } }] }); return; } _lifeK(el); };
// Create batch — 5-step wizard
ACT.newBatch = () => {
  const st = { step: 1, d: { code: '', course: ADMIN.programmes.filter(p => p.status === 'Active')[0].title, start: D(60).slice(0, 10), end: D(425).slice(0, 10), cap: 16, mode: 'Blended', desc: '', coord: '', teachers: [], assessors: [], sched: 'Template: Level 3 standard (weekly class + monthly classroom day)', intake: 'Manual' } };
  const coords = () => ADMIN.staff.filter(s => s.roles.includes('Academic Coordinator') && s.status === 'Active').map(s => s.name);
  const steps = ['Details', 'Staff', 'Schedule', 'Intake rule', 'Review & create'];
  const body = () => { const d = st.d; return `<ol class="stepper">${steps.map((l, k) => `<li class="step ${k + 1 < st.step ? 'done' : k + 1 === st.step ? 'cur' : ''}"><span class="dot">${k + 1}</span><span class="s-l">${l}</span></li>`).join('')}</ol>` + [
    `<div class="form-grid"><div class="field"><label for="nb-c">Batch code</label><input class="input" id="nb-c" value="${esc(d.code)}" placeholder="e.g. L2DC-JAN27"><span class="hint">Unique within the course.</span></div><div class="field"><label for="nb-co">Course / programme</label><select class="select" id="nb-co">${ADMIN.programmes.filter(p => p.status === 'Active').map(p => `<option ${p.title === d.course ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div><div class="field"><label for="nb-s">Start date</label><input class="input" type="date" id="nb-s" value="${d.start}"></div><div class="field"><label for="nb-e">End date</label><input class="input" type="date" id="nb-e" value="${d.end}"></div><div class="field"><label for="nb-cap">Capacity</label><input class="input num" type="number" min="1" id="nb-cap" value="${d.cap}"></div><div class="field"><label for="nb-m">Delivery mode</label><select class="select" id="nb-m">${['Online', 'Classroom', 'Blended'].map(m => `<option ${m === d.mode ? 'selected' : ''}>${m}</option>`).join('')}</select></div><div class="field full"><label for="nb-d">Description</label><textarea class="textarea" id="nb-d">${esc(d.desc)}</textarea></div></div>`,
    `<div class="form-grid"><div class="field full"><label for="nb-ac">Academic Coordinator (required)</label><select class="select" id="nb-ac"><option value="">Choose a coordinator…</option>${coords().map(n => `<option ${n === d.coord ? 'selected' : ''}>${n}</option>`).join('')}</select></div><fieldset class="field" style="border:0;padding:0"><legend class="lbl">Teacher(s)</legend>${activeStaff('Teacher').map(n => `<label class="check"><input type="checkbox" class="nb-t" value="${n}" ${d.teachers.includes(n) ? 'checked' : ''}>${n}</label>`).join('')}</fieldset><fieldset class="field" style="border:0;padding:0"><legend class="lbl">Assessor(s)</legend>${activeStaff('Assessor').map(n => `<label class="check"><input type="checkbox" class="nb-a" value="${n}" ${d.assessors.includes(n) ? 'checked' : ''}>${n}</label>`).join('')}</fieldset></div>`,
    `<fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Schedule</legend>${['Template: Level 3 standard (weekly class + monthly classroom day)', 'Template: Level 2 standard (fortnightly class)', 'Build from scratch'].map(o => `<label class="check"><input type="radio" name="nb-sc" value="${o}" ${o === d.sched ? 'checked' : ''}><span>${o}<span class="hint" style="display:block">${{ 'Build from scratch': 'Start with an empty timeline. Add sessions, deadlines and milestones in Scheduling after the batch is created.' }[o] || 'Sessions, deadlines and milestones are added for you; you can change any of them later.'}</span></span></label>`).join('')}</fieldset><p class="small muted">Sessions, assignment deadlines, observation windows and milestones. Zoom meetings are created automatically (mock).</p>`,
    `<fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Intake rule</legend>${['Manual', 'Bulk (CSV)', 'Auto-on-admission-approval'].map(o => `<label class="check"><input type="radio" name="nb-in" value="${o}" ${o === d.intake ? 'checked' : ''}><span>${o === 'Auto-on-admission-approval' ? 'Automatic on admission approval' : o}<span class="hint" style="display:block">${{ Manual: 'You add learners to the batch one at a time.', 'Bulk (CSV)': 'You upload a spreadsheet with all the learners.', 'Auto-on-admission-approval': 'Learners join this batch as soon as their admission is approved.' }[o]}</span></span></label>`).join('')}</fieldset>`,
    `<dl class="kv"><dt>Code</dt><dd class="mono">${esc(d.code)}</dd><dt>Course</dt><dd>${esc(d.course)}</dd><dt>Dates</dt><dd>${fd(d.start + 'T09:00:00Z')} – ${fd(d.end + 'T09:00:00Z')}</dd><dt>Capacity</dt><dd>${d.cap} · ${d.mode}</dd><dt>Academic Coordinator</dt><dd>${esc(d.coord)}</dd><dt>Teachers</dt><dd>${d.teachers.length ? esc(d.teachers.join(', ')) : `<span style="color:var(--amber)">${ic('alert', 13)} None chosen — the dashboard flags missing staff until a Teacher is allocated</span>`}</dd><dt>Assessors</dt><dd>${d.assessors.length ? esc(d.assessors.join(', ')) : `<span style="color:var(--amber)">${ic('alert', 13)} None chosen — the dashboard flags missing staff until an Assessor is allocated</span>`}</dd><dt>Schedule</dt><dd>${esc(d.sched)}</dd><dt>Intake rule</dt><dd>${esc(d.intake)}</dd></dl><div class="note b-blue">${ic('info')}<div class="small">The batch appears in each allocated staff member's workspace and they are notified.</div></div>`][st.step - 1]; };
  const collect = () => { const d = st.d; if (st.step === 1) { d.code = mval('#nb-c').toUpperCase(); d.course = mval('#nb-co'); d.start = mval('#nb-s'); d.end = mval('#nb-e'); d.cap = +mval('#nb-cap') || 1; d.mode = mval('#nb-m'); d.desc = mval('#nb-d'); if (!d.code) { fieldErr('#nb-c', 'Enter a batch code'); return false; } if (ADMIN.batches.some(b => b.code === d.code)) { fieldErr('#nb-c', 'This code is already used'); return false; } if (d.end <= d.start) { fieldErr('#nb-e', 'End date must be after the start date'); return false; } } if (st.step === 2) { d.coord = mval('#nb-ac'); d.teachers = $$('#modal-root .nb-t:checked').map(x => x.value); d.assessors = $$('#modal-root .nb-a:checked').map(x => x.value); if (!d.coord) { fieldErr('#nb-ac', 'An Academic Coordinator is required'); return false; } } if (st.step === 3) d.sched = ($('#modal-root input[name="nb-sc"]:checked') || {}).value || d.sched; if (st.step === 4) d.intake = ($('#modal-root input[name="nb-in"]:checked') || {}).value || d.intake; return true; };
  const draw = () => openModal({ title: `Create batch — step ${st.step} of 5`, sub: steps[st.step - 1], size: 'lg', body: body(), actions: [st.step === 1 ? { label: 'Cancel' } : { label: 'Back', fn: () => { st.step--; draw(); } }, { label: st.step === 5 ? 'Create batch' : 'Next', cls: 'btn-primary', fn: () => {
    if (collect() === false) return false;
    if (st.step < 5) { st.step++; draw(); return; }
    const d = st.d, b = { code: d.code, label: d.code, course: d.course, start: new Date(d.start + 'T09:00:00Z').toISOString(), end: new Date(d.end + 'T17:00:00Z').toISOString(), cap: d.cap, enrolled: 0, mode: d.mode, coord: d.coord, teachers: d.teachers, assessors: d.assessors, status: 'Planned', wait: 0, roster: [], intake: d.intake, sched: d.sched, created: now().toISOString() };
    ADMIN.batches.push(b); touch(b.code); syncTasBatches();
    logA('Batches', `${b.label} (${b.code})`, 'Batch created', '—', `Planned · ${d.coord} / ${d.teachers.join(', ') || '—'} / ${d.assessors.join(', ') || '—'}`, d.desc || 'New intake');
    d.teachers.concat(d.assessors).forEach(n => tasNotify('New batch allocated to you', `${n}: ${b.code} starts ${fd(b.start)}`, 't-dashboard', 'Caseload'));
    STORE.coo && STORE.coo.notifs.unshift({ id: 'cn' + Date.now(), t: 'New batch assigned to you', b: `${b.code} — ${d.coord}`, at: now().toISOString(), go: 'c-batches', unread: true });
    go('a-batches', { id: b.code }); toast(`Batch ${b.code} created. ${d.coord}, the teachers and assessors have been notified.`);
  } }] });
  draw();
};
// Change batch staff (coordinator, teachers, assessors) — reason required, audited, staff notified
ACT.batchStaff = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id);
  reasonDlg({ title: 'Change staff allocations — ' + b.code, ok: 'Save allocations', extra: `<div class="field"><label for="bs-c">Academic Coordinator</label><select class="select" id="bs-c"><option value="">Not assigned</option>${ADMIN.staff.filter(s => s.roles.includes('Academic Coordinator') && s.status === 'Active').map(s => `<option ${s.name === b.coord ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div><div class="field"><label for="bs-t">Teacher</label><select class="select" id="bs-t">${activeStaff('Teacher').map(n => `<option ${b.teachers[0] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="field"><label for="bs-a">Assessor</label><select class="select" id="bs-a"><option value="">Keep current (${esc(b.assessors.join(', ') || 'none')})</option>${activeStaff('Assessor').map(n => `<option>${n}</option>`).join('')}</select></div><p class="xs muted">Previous staff lose the batch from their workspace; history is kept.</p>`,
    onOk: r => {
      const c = $('#bs-c').value, t = $('#bs-t').value, a = $('#bs-a').value, oldT = b.teachers.slice(), oldA = b.assessors.slice();
      if (c && c !== b.coord) { if (b.coord) changeCoordinator(b.code, c, r); else { b.coord = c; b.coordHistory = [[c, now().toISOString(), null]]; logA('Batches', `${b.label} (${b.code})`, 'Academic Coordinator changed', 'Not assigned', c, r); } }
      if (t && !(b.teachers.length === 1 && b.teachers[0] === t)) { b.teachers = [t]; (b.staffHist = b.staffHist || []).push(['Teacher ' + (oldT.join(', ') || '—') + ' → ' + t, now().toISOString(), r]); logA('Batches', `${b.label} (${b.code})`, 'Staff allocation changed', 'Teacher: ' + (oldT.join(', ') || '—'), 'Teacher: ' + t, r); }
      if (a) { b.assessors = [a]; (b.staffHist = b.staffHist || []).push(['Assessor ' + (oldA.join(', ') || '—') + ' → ' + a, now().toISOString(), r]); logA('Batches', `${b.label} (${b.code})`, 'Staff allocation changed', 'Assessor: ' + (oldA.join(', ') || '—'), 'Assessor: ' + a, r); }
      touch(b.code, oldT.concat(oldA).filter(n => !b.teachers.includes(n) && !b.assessors.includes(n))); syncTasBatches();
      oldT.concat(oldA).filter(n => !b.teachers.includes(n) && !b.assessors.includes(n)).forEach(n => tasNotify('Batch removed from you', `${n}: ${b.code} re-allocated (history kept)`, 't-dashboard', 'Caseload'));
      b.teachers.concat(b.assessors).filter(n => !oldT.includes(n) && !oldA.includes(n)).forEach(n => tasNotify('New batch allocated to you', `${n}: ${b.code}`, 't-dashboard', 'Caseload'));
      render(); toast('Staff allocations saved. Staff have been notified.');
    } });
};
// Add learner — add-after-start override, blocked for learners in another active batch
ACT.addToBatch = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id), inProg = b.status === 'In Progress';
  const activeOf = id => ADMIN.batches.find(x => x.code !== b.code && ['Open', 'In Progress'].includes(x.status) && batchRoster(x).some(r => r[1] === id));
  const elig = ADMIN.learners.filter(l => l.acct === 'Active' && l.rec === 'Active').slice(0, 12);
  const opts = elig.map(l => { const o = activeOf(l.id); return `<option value="${l.id}" ${el.dataset.pre === l.id ? 'selected' : ''}>${esc(l.name)} (${l.id})${o ? ' — in ' + o.code : ''}${l.agency ? ' · ' + esc(l.agency) : ''}</option>`; }).join('');
  const doAdd = r => { const l = ADMIN.learners.find(x => x.id === $('#ab-l').value) || learnerById($('#ab-l').value), o = activeOf(l.id); if (o) { openModal({ title: 'Can\'t add this learner', body: `<div class="note b-red">${ic('alert')}<div class="small"><strong>${esc(l.name)} is already in ${esc(o.label)} (${o.code}), an active batch.</strong> Override cannot be used to move a learner between batches. Learner transfer is not permitted.</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; } if (b.enrolled >= b.cap) { b.wait++; toast(`${l.name} added to the waitlist (batch full).`); } else { b.enrolled++; b.roster.push([l.name, l.id, l.agency || 'Self-funded']); toast(`${l.name} added to ${b.code}.${l.agency ? ' Uses one of the agency\'s licences.' : ''}`); } touch(b.code); logA('Batches', `${b.label} (${b.code})`, inProg ? 'Learner added after start (override)' : 'Learner added', '—', l.name, r || 'Added'); render(); };
  const extra = `<div class="field"><label for="ab-l">Learner</label><select class="select" id="ab-l">${opts}</select><span class="hint">Learners already in another active batch are marked — they can't be added.</span></div><p class="xs muted">Capacity ${b.enrolled}/${b.cap}${b.enrolled >= b.cap ? ' — full: the learner joins the waitlist' : ''}. Agency learners use their agency's licences. Methods: individual (here), bulk CSV, multi-select from Learners, or automatically on admission.</p>`;
  if (inProg) reasonDlg({ title: 'Add learner after the batch has started', ok: 'Add learner (override)', extra: `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Audited override.</strong> Only for a learner who isn't in any other active batch. Override cannot be used to move a learner between batches.</div></div>${extra}`, onOk: doAdd });
  else openModal({ title: 'Add learner to ' + b.code, body: extra, actions: [{ label: 'Cancel' }, { label: 'Add learner', cls: 'btn-primary', fn: () => doAdd('') }] });
};
// Cancel batch (before start) — per-learner decisions; confirm blocked until every learner has one (academic view)
const _cancelK = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id), roster = batchRoster(b).concat(b.code === 'L3AC-NOV26' ? [[VNAME('B'), 'IA-L-31188', 'Applicant (placed)']] : []);
  const alts = ADMIN.batches.filter(x => x.course === b.course && x.code !== b.code && ['Planned', 'Open'].includes(x.status) && x.enrolled < x.cap);
  if (!['Planned', 'Open'].includes(b.status)) { toast('Batches can only be cancelled before they start.', 'err'); return; }
  openModal({ title: 'Cancel batch ' + b.code, size: 'lg', body: `<p class="small">Choose an outcome for every learner. There is no transfer — each learner either enrols in another not-started batch of the same course or is refunded.</p><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Decision</th></tr></thead><tbody>${roster.map(x => `<tr><td>${esc(x[0])}<div class="xs muted">${esc(x[2])}</div></td><td><label class="sr" for="cbd-${x[1]}">Decision for ${esc(x[0])}</label><select class="select cb-d" id="cbd-${x[1]}" data-id="${x[1]}" data-n="${esc(x[0])}"><option value="">Choose…</option><option value="refund">Refund (deposit / fees paid)</option>${alts.map(a => `<option value="${a.code}">Enrol in ${esc(a.label)} (${a.code}) — starts ${fd(a.start)} · ${a.cap - a.enrolled} places</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="2" class="small muted">No learners enrolled.</td></tr>'}</tbody></table></div><div class="field"><label for="cb-r">Reason (required)</label><textarea class="textarea" id="cb-r"></textarea></div><p class="xs muted">Learners are notified. Refund choices create a refund item for Finance.</p>`,
    actions: [{ label: 'Keep batch' }, { label: 'Cancel batch', cls: 'btn-danger', fn: () => {
      const sels = $$('#modal-root .cb-d'), missing = sels.filter(s => !s.value);
      if (missing.length) { toast(`Choose a decision for every learner — ${missing.length} still missing.`, 'err'); missing[0].focus(); return false; }
      const r = mval('#cb-r'); if (!r) { fieldErr('#cb-r', 'Enter a reason'); return false; }
      sels.forEach(s => {
        const alt = ADMIN.batches.find(x => x.code === s.value), name = s.dataset.n;
        if (s.dataset.id === 'IA-L-31188') { STORE.worlds.B.batchCancelled = s.value === 'refund' ? { refund: true, amount: STORE.worlds.B.amt(300) } : { moved: `${alt.label} — ${alt.code}`, start: alt.start }; notifyLearner('B', 'Schedule', 'Batch cancelled', s.value === 'refund' ? 'Your batch was cancelled — refund in progress.' : `Your batch was cancelled — you've been moved to ${alt.label}.`, 'admission'); }
        if (s.value === 'refund') { const lv = s.dataset.id === 'IA-L-31188' ? 'B' : null; depositRefund(name, lv, lv ? STORE.worlds.B.amt(300) : 300, lv ? STORE.worlds.B.me.cur : (b.label.includes('Dubai') ? 'AED' : 'GBP'), 'Batch cancelled', 'Batch ' + b.code + ' cancelled before start: ' + r); }
        else if (alt) { alt.enrolled++; alt.roster.push([name, s.dataset.id, 'Moved after cancellation']); }
      });
      b.status = 'Cancelled'; b.cancelled = now().toISOString(); touch(b.code); logA('Batches', `${b.label} (${b.code})`, 'Batch cancelled', 'Open', 'Cancelled', r); render(); toast('Batch cancelled. Learners notified; refund choices sent to Finance.');
    } }] });
};
SCREENS['k-transfer'] = SCREENS['a-transfer'] = () => { if (S.portal === 'admin') logA('Batches', 'Transfer URL', 'Blocked: learner transfer', '—', '—', 'Direct URL'); return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Learner transfer is not permitted</h1><p class="muted">Learners are never moved between batches. Add a learner after start only by audited override, and only if they aren't in another active batch.</p><button class="btn btn-primary" data-go="a-batches">Go to Batches</button></div>`; };

/* ---------- 6.6 Short courses / 6.7 NVQ programmes (academic filter + versioning, publish validation) ---------- */
const _coursesK = SCREENS['a-courses'];
SCREENS['a-courses'] = (p) => {
  if (!isAca()) return _coursesK(p);
  if (p.id) { let h = _coursesK(p); return h.replace('<div class="page-h">', `<div class="note b-grey" style="margin-bottom:8px">${ic('lock')}<div class="small">Price is read-only for Academic Admins (set by the Super Admin or System Admin). Certificate template and validity:</div></div><div class="page-h">`); }
  return `${pageA('Short Courses', '', `<button class="btn btn-primary" data-act="newCourse">${ic('plus', 15)}New course</button>`)}${dt({ id: 'kcourses', name: 'Short courses', rows: ADMIN.courses, search: c => c.title + c.cat, filters: [{ k: 'st', l: 'Status', get: c => c.status, opts: ['Draft', 'Published', 'Retired'] }, { k: 'cat', l: 'Category', get: c => c.cat }],
    cols: [{ k: 'title', l: 'Title', h: c => `<a href="#a-courses.${c.id}" data-go="a-courses" data-id="${c.id}" class="strong">${esc(c.title)}</a>` }, { k: 'cat', l: 'Category' }, { k: 'status', l: 'Status', h: c => chip(c.status, c.status === 'Published' ? 'green' : c.status === 'Draft' ? 'amber' : 'grey') }, { k: 'access', l: 'Access period (days)', r: 1 }, { k: 'validity', l: 'Validity' }, { k: 'enrol', l: 'Enrolments', r: 1 }, { k: 'comp', l: 'Completion rate', h: c => c.comp + '%', r: 1 }, { k: 'version', l: 'Version', h: c => 'v' + c.version, r: 1 }],
    act: c => `<button class="btn btn-sm" data-go="a-courses" data-id="${c.id}">Edit</button>` })}`;
};
const _pubCourseK = ACT.pubCourse;
ACT.pubCourse = el => { const c = ADMIN.courses.find(x => x.id === el.dataset.id); const miss = c.id === 'SC-08' || c.title === 'Untitled course' ? ['Quiz: fewer questions in the bank (6) than questions shown (10)', 'Completion rules: no rule set', 'Certificate: no template selected'] : []; if (miss.length && !c._fixed) { openModal({ title: 'Can\'t publish yet', body: `<div class="note b-red">${ic('alert')}<div><strong>Fix these before publishing:</strong><ul class="small">${miss.map(m => `<li>${m}</li>`).join('')}</ul></div></div>`, actions: [{ label: 'Close' }, { label: 'Mark as fixed (prototype)', cls: 'btn-primary', fn: () => { c._fixed = true; toast('Marked as fixed — publish again.', 'info'); } }] }); return; } reasonDlg({ title: 'Publish course — ' + esc(c.title), ok: 'Publish', body: `<p class="small">Version ${c.version} becomes available for new enrolments.</p>`, onOk: r => { _pubCourseK(el); logA('Short Courses', c.title, 'Publish note', '—', 'Published', r); } }); };
const _progsK = SCREENS['a-programmes'];
SCREENS['a-programmes'] = (p) => {
  if (p.id) return _progsK(p);
  if (!isAca()) return _progsK(p);
  return `${pageA('NVQ Programmes')}${dt({ id: 'kprogs', name: 'NVQ programmes', rows: ADMIN.programmes, search: x => x.title + x.ref, filters: [{ k: 's', l: 'Status', get: x => x.status, opts: ['Active', 'Draft', 'Suspended', 'Retired'] }], cols: [{ k: 'title', l: 'Title', h: x => `<a href="#a-programmes.${x.id}" data-go="a-programmes" data-id="${x.id}" class="strong">${esc(x.title)}</a>` }, { k: 'level', l: 'Level' }, { k: 'ref', l: 'Awarding-body ref', h: x => `<span class="mono small">${x.ref}</span>` }, { k: 'version', l: 'Versions', h: x => 'v1' + (x.version > 1 ? '–v' + x.version : ''), r: 1 }, { k: 'status', l: 'Status', h: x => chip(x.status, { Active: 'green', Draft: 'amber', Suspended: 'amber', Retired: 'grey' }[x.status]) }, { k: 'batches', l: 'Batches', r: 1 }, { k: 'learners', l: 'Learners per version', h: x => x.perVersion ? Object.entries(x.perVersion).map(([v, n]) => `v${v}: ${n}`).join(' · ') : x.learners ? `v${x.version}: ${x.learners}` : '0', v: x => x.learners }], act: x => `<button class="btn btn-sm" data-go="a-programmes" data-id="${x.id}">Open builder</button>` })}`;
};
const _pbK = progBuilder;
progBuilder = function (id, t) {
  let h = _pbK(id, t); const pr = ADMIN.programmes.find(x => x.id === id); if (!pr) return h;
  const validation = pr.draft ? `<section class="card"><h2>Publish validation</h2><ul class="list small"><li class="li">${chip('Blocking', 'red')} 2 Learning Outcomes have no assessment type: U310 LO2, U311 LO1</li><li class="li">${chip('Warning', 'amber')} 4 criteria aren't mapped to an assignment and aren't observation criteria: 310 2.1, 310 2.2, 311 1.1, 311 1.3</li><li class="li">${chip('OK', 'green')} Codes are unique</li></ul></section>` : '';
  const pub = `<div class="row"><button class="btn btn-primary" data-act="kPubProg" data-id="${pr.id}">${pr.draft ? 'Publish programme' : 'Publish version ' + (pr.version + (pr.nextDraft ? 1 : 0))}</button>${pr.nextDraft ? chip('Version ' + (pr.version + 1) + ' draft', 'amber') : ''}</div>`;
  h = h.replace(/(<div class="subtabs")/, `${pr.draft ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Draft programme.</strong> Publishing is blocked until every Learning Outcome has an assessment type.</div></div>` : ''}${pub}$1`);
  if (t === 'tree' || !t) h = h.replace(/<p class="small">Observation criteria mapped to assignment questions\?/, `${validation}<p class="small">Observation criteria mapped to assignment questions?`);
  if (t === 'versions' && pr.perVersion) h = h.replace('<span data-mig></span>', `<div class="kpis">${Object.entries(pr.perVersion).map(([v, n]) => kpi('Learners on version ' + v, n)).join('')}</div>`);
  return h;
};
ACT.kPubProg = el => { const pr = ADMIN.programmes.find(x => x.id === el.dataset.id); if (pr.draft) { openModal({ title: 'Can\'t publish this programme', body: `<div class="note b-red">${ic('alert')}<div class="small"><strong>Every Learning Outcome needs an assessment type.</strong> Missing: U310 LO2, U311 LO1.</div></div><div class="note b-amber">${ic('alert')}<div class="small">4 criteria are uncovered (not mapped to any assignment and not observation criteria).</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; } const nv = pr.version + 1; reasonDlg({ title: `Publish version ${nv} — ${esc(pr.title)}`, ok: 'Publish version', body: `<div class="note b-blue">${ic('layers')}<div class="small"><strong>New enrolments use v${nv}.</strong> Existing learners stay on their version — shown in the Learner 360 and the learner's course overview.</div></div><div class="cmp"><div class="card flat"><span class="eyebrow">Added</span><span class="small">U306 3.4 · U308 (new unit)</span></div><div class="card flat"><span class="eyebrow">Changed</span><span class="small">U302 2.1 descriptor</span></div><div class="card flat"><span class="eyebrow">Retired</span><span class="small strike">U305 3.2</span></div></div>`, onOk: r => { pr.perVersion = pr.perVersion || { [pr.version]: pr.learners }; pr.version = nv; pr.perVersion[nv] = 0; pr.nextDraft = false; logA('NVQ Programmes', pr.title, 'Version published', 'v' + (nv - 1), 'v' + nv, r); render(); toast(`Version ${nv} published. New enrolments use v${nv}; existing learners stay on their version.`); } }); };

/* ---------- 6.9 Assignments: drafts, publish (learner + calendar), edit brief (new version) ---------- */
const _adminAsgK = adminAssignments;
adminAssignments = function () { const base = _adminAsgK(); const ids = new Set(base.map(a => a.id)); return base.concat((STORE.aca ? STORE.aca.drafts : []).filter(d => !ids.has(d.id))); };
const _asgEdK = asgEditor;
asgEditor = function (id, t) {
  let h = _asgEdK(id, t).replace('data-act="pubAsg"', `data-act="pubAsg" data-id="${id}"`);
  const A = adminAssignments().find(x => x.id === id);
  if (A && A.status === 'Published' && A.a) h = h.replace(/(<div class="row"><button class="btn btn-primary" data-act="saveVersioned")/, `<div class="row"><button class="btn" data-act="kEditBrief" data-id="${id}">${ic('edit', 15)}Edit brief (new version)</button><span class="xs muted">Brief version ${A.a.briefV || A.version}</span></div>$1`);
  return h;
};
const _pubAsgK = ACT.pubAsg;
ACT.pubAsg = el => {
  const d = STORE.aca && STORE.aca.drafts.find(x => x.id === el.dataset.id);
  if (!d || +el.dataset.m === 0) return _pubAsgK(el);
  reasonDlg({ title: 'Publish assignment — ' + esc(d.title), ok: 'Publish', label: 'Publish note (required)', body: `<div class="note b-blue">${ic('info')}<div class="small">The assignment appears to learners in Leicester Cohort 7 with its deadline (${fdt(d.due)}) on their calendars. Learners are notified.</div></div>`, onOk: r => {
    const C = STORE.worlds.C, base = JSON.parse(JSON.stringify(C.assignments.find(x => x.id === 'a3')));
    Object.assign(base, { id: d.id, title: d.title, unit: d.unit, due: d.due, status: 'Not Started', round: 'Sub 1', resubUsed: 0, resubMax: 2, briefUpdated: null, originalDue: undefined, closed: false, limit: false });
    base.qs.forEach(q => { q.rounds = []; q.state = 'none'; });
    C.assignments.push(base); C.events.push({ id: 'ed' + d.id, type: 'deadline', title: d.title.split('—')[0].trim() + ' due', start: d.due, end: d.due, course: C.nvq.title, go: 'assignment.' + d.id });
    d.status = 'Published'; STORE.aca.drafts = STORE.aca.drafts.filter(x => x.id !== d.id);
    notifyLearner('C', 'Assignments', 'New assignment', `${d.title} is open — due ${fdt(d.due)}.`, 'assignment.' + d.id);
    logA('Assignments', d.title, 'Published', 'Draft', 'Published', r); go('a-assignments', { id: d.id }); toast('Published. Learners can see it with its deadline on their calendars.');
  } });
};
ACT.kEditBrief = el => { const C = STORE.worlds.C, a = C.assignments.find(x => x.id === el.dataset.id); const v = (a.briefV || (a.briefUpdated ? 2 : 1)) + 1; openModal({ title: 'Edit brief — ' + esc(a.title), size: 'lg', body: `<div class="note b-blue">${ic('layers')}<div class="small">Saving creates <strong>brief version ${v}</strong>. Work already submitted stays against the version it was written for.</div></div><div class="field"><label for="eb-t">Brief</label><textarea class="textarea" id="eb-t" rows="5">Read the case study about Mrs Patel and answer each question. Updated: the case study now includes a family visit.</textarea></div><label class="tgl"><input type="checkbox" id="eb-n" checked><span>Notify learners of a material change</span></label><div class="field"><label for="eb-r">Reason (required)</label><textarea class="textarea" id="eb-r"></textarea></div>`,
  actions: [{ label: 'Cancel' }, { label: 'Save brief version ' + v, cls: 'btn-primary', fn: () => { const r = mval('#eb-r'); if (!r) { fieldErr('#eb-r', 'Enter a reason'); return false; } a.briefUpdated = now().toISOString(); a.briefV = v; if ($('#eb-n').checked) notifyLearner('C', 'Assignments', 'Brief updated', `${a.title}: the brief has been updated (version ${v}).`, 'assignment.' + a.id); tasNotify('Brief updated', `${a.title} — brief version ${v}`, 't-assign.' + a.id, 'Caseload'); logA('Assignments', a.title, 'Brief edited (new version)', 'v' + (v - 1), 'v' + v, r); render(); toast(`Brief version ${v} saved.${$('#eb-n') && $('#eb-n').checked ? ' Learners notified.' : ''}`); } }] }); };

/* ---------- List upgrade B3.2: Scheduling → Calendar monitoring — real month / week / day views (view-only) ---------- */
const _schedMon = SCREENS['a-scheduling'];
SCREENS['a-scheduling'] = (p) => (p.tab || 'console') !== 'monitor' ? _schedMon(p) : `${pageA('Scheduling & Calendars')}${subtabs([['console', 'Scheduling console'], ['monitor', 'Calendar monitoring']], 'monitor', 'a-scheduling')}<div class="note b-grey">${ic('info')}<div class="small"><strong>Events are changed at their source, not here.</strong> This view is read-only.</div></div>${kCalBody()}`;

/* ---------- 6.12 Scheduling: edit at source with conflict warning, change log (shared upgrade) ---------- */
const _schedK = SCREENS['a-scheduling'];
SCREENS['a-scheduling'] = (p) => {
  let h = _schedK(p); if ((p.tab || 'console') !== 'console') return h;
  const conf = kConflicts(), log = STORE.aca.schedLog;
  const items = ['L3AC-JAN26', 'L2DC-MAR26'].flatMap(code => { const b = ADMIN.batches.find(x => x.code === code); return batchEvents(b).filter(e => daysTo(e.start) >= 0).slice(0, 5).map(e => ({ b, e })); });
  h = h.replace(/<div class="note b-amber">[^]*?double-booked[^]*?<\/div><\/div>/, conf.length ? `<section class="card"><h2>Conflicts (${conf.length})</h2><ul class="list">${conf.map(c => `<li class="li"><div class="li-b"><strong class="small">${esc(c.what)}</strong><span class="xs muted">${esc(c.detail)}</span></div><button class="btn btn-sm" data-act="kResolve" data-id="${c.id}">Resolve</button></li>`).join('')}</ul></section>` : `<div class="note b-green">${ic('check')}<div class="small">No conflicts detected.</div></div>`);
  return h + `<section class="card"><div class="row-b"><h2>Upcoming schedule items</h2><span class="xs muted">Sessions · deadlines · observation windows · milestones</span></div>${dt({ id: 'lu-r-ksched', name: 'Upcoming schedule items', rows: items, noExport: true, rid: x => x.b.code + x.e.id, cols: [{ k: 'batch', l: 'Batch', h: x => `<span class="mono small">${x.b.code}</span>`, v: x => x.b.code + ' ' + x.b.label }, { k: 'item', l: 'Item', h: x => `<span class="legend"><span><i class="lg-${x.e.type}"></i>${EVLBL[x.e.type]}</span></span> ${esc(x.e.title)}`, v: x => EVLBL[x.e.type] + ' ' + x.e.title }, { k: 'when', l: 'When', h: x => `<span class="nowrap small">${fdt(x.e.start)}</span>`, v: x => x.e.start }, { k: 'teacher', l: 'Teacher', h: x => `<span class="small">${esc(x.e.teacher || '—')}</span>`, v: x => x.e.teacher || '' }], act: x => `<button class="btn btn-sm" data-act="kEditEv" data-b="${x.b.code}" data-id="${x.e.id}">Edit</button>` })}</section>
  <section class="card"><h2>Change log</h2>${log.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>Who</th><th>Item</th><th>Before → after</th><th>Reason</th></tr></thead><tbody>${log.map(l => `<tr><td class="nowrap small">${fdt(l.at)}</td><td>${esc(l.who)}</td><td class="small">${esc(l.what)}</td><td class="small"><span class="strike">${esc(l.before)}</span> → <strong>${esc(l.after)}</strong></td><td class="small">${esc(l.reason)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No schedule changes yet.</p>'}</section>`;
};
ACT.kEditEv = el => {
  const { b, e } = findEv(el.dataset.b, el.dataset.id), teachers = activeStaff('Teacher');
  openModal({ title: 'Edit ' + EVLBL[e.type].toLowerCase(), sub: esc(e.title) + ' · ' + b.code, body: `<dl class="kv"><dt>Current</dt><dd>${fdt(e.start)}${e.teacher ? ' · ' + esc(e.teacher) : ''}</dd></dl><div class="field"><label for="ke-n">New date and time (${tzl()})</label><input class="input" type="datetime-local" id="ke-n" value="${e.start.slice(0, 16)}" data-oninput="keConf" data-b="${b.code}" data-id="${e.id}"></div>${e.type === 'class' ? `<div class="field"><label for="ke-t">Teacher</label><select class="select" id="ke-t" data-onchange="keConf" data-b="${b.code}" data-id="${e.id}">${teachers.map(n => `<option ${n === e.teacher ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="hint">Changing the teacher moves the event from the previous teacher's calendar to the new one.</span></div>` : ''}<div id="ke-c"></div><div class="field"><label for="ke-r">Reason (required)</label><textarea class="textarea" id="ke-r"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save change', cls: 'btn-primary', fn: () => {
      const r = mval('#ke-r'); if (!r) { fieldErr('#ke-r', 'Enter a reason'); return false; }
      const nv = $('#ke-n').value, iso = new Date(nv + ':00Z').toISOString(), nt = $('#ke-t') ? $('#ke-t').value : e.teacher;
      if (kConflictFor(b, e, iso, nt) && !S.kConfOk) { S.kConfOk = true; $('#ke-c').innerHTML = `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Conflict:</strong> ${esc(kConflictFor(b, e, iso, nt))}. Select "Save change" again to save anyway.</div></div>`; return false; }
      S.kConfOk = false;
      const before = fdt(e.start) + (e.teacher ? ' · ' + e.teacher : ''), after = fdt(iso) + (nt ? ' · ' + nt : '');
      const v = batchEvSet(b, e, iso); // same store as the Coordinator's edits (coord.js) — last save wins
      if (v) notifyLearner(v, 'Schedule', 'Schedule changed', `${e.title} moved to ${fdt(iso)}.`, 'calendar');
      if (nt && nt !== e.teacher) { b.teachers = [nt].concat(b.teachers.filter(x => x !== e.teacher && x !== nt)); touch(b.code, [e.teacher]); syncTasBatches(); tasNotify('Session moved to you', `${e.title} · ${fdt(iso)} (from ${e.teacher})`, 't-calendar', 'Sessions'); }
      tasNotify('Schedule changed', `${e.title} → ${fdt(iso)}`, 't-calendar', 'Sessions');
      STORE.coo && STORE.coo.changes.unshift([ADMIN.me.name, now().toISOString(), `${EVLBL[e.type]} — ${e.title} (${b.code})`, fdt(e.start), fdt(iso), r]);
      STORE.coo && STORE.coo.notifs.unshift({ id: 'cn' + Date.now(), t: 'Schedule changed', b: `${e.title} (${b.code}) → ${fdt(iso)}`, at: now().toISOString(), go: 'c-timeline', unread: true });
      STORE.aca.schedLog.unshift({ at: now().toISOString(), who: ADMIN.me.name, what: `${EVLBL[e.type]} — ${e.title} (${b.code})`, before, after, reason: r });
      logA('Scheduling', `${e.title} (${b.code})`, 'Schedule changed', before, after, r); render(); toast('Saved. Learner, teacher, coordinator and monitoring calendars are updated; reminders rescheduled.');
    } }] });
};
function kConflictFor(b, e, iso, teacher) { const t = new Date(iso).getTime(); const hit = ['L3AC-JAN26', 'L2DC-MAR26'].flatMap(code => { const bb = ADMIN.batches.find(x => x.code === code); return batchEvents(bb).map(x => ({ x, bb })); }).find(({ x, bb }) => x.id !== e.id && Math.abs(new Date(x.start).getTime() - t) < 60 * 60000 && (bb.code === b.code || (teacher && x.teacher === teacher))); return hit ? `${hit.x.title} (${hit.bb.code}) at ${fdt(hit.x.start)}${hit.bb.code === b.code ? ' — same cohort' : ' — same teacher'}` : null; }
INP.keConf = el => { S.kConfOk = false; const { b, e } = findEv(el.dataset.b, el.dataset.id), iso = new Date($('#ke-n').value + ':00Z').toISOString(), c = kConflictFor(b, e, iso, $('#ke-t') ? $('#ke-t').value : e.teacher); $('#ke-c').innerHTML = c ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Conflict:</strong> ${esc(c)}</div></div>` : `<p class="small" style="color:var(--green)">✓ No conflicts</p>`; };

/* ---------- 6.14 Observations: creation blocked without workplace permission (shared upgrade) ---------- */
ACT.newObs = () => {
  const perm = v => STORE.worlds[v].workplace.perm;
  openModal({ title: 'Create observation entry', body: `<div class="field"><label for="no-l">Learner</label><select class="select" id="no-l" data-onchange="noPerm">${['C', 'D'].map(v => `<option value="${v}">${VNAME(v)} — permission: ${esc(perm(v))}</option>`).join('')}</select><span id="no-p"></span></div><div class="field"><label for="no-a">Assessor</label><select class="select" id="no-a"><option>James Pryce</option><option>Sarah Okonkwo</option></select></div><div class="field"><label for="no-d">Date and time</label><input class="input" type="datetime-local" id="no-d" value="${D(12, '08:30').slice(0, 16)}"></div><div class="field"><label for="no-loc">Location</label><input class="input" id="no-loc" value="${esc(STORE.worlds.C.workplace.name)}"></div><div class="field"><label for="no-s">Scope (NVQ criteria)</label><input class="input" id="no-s" value="U306 3.1"></div><fieldset class="field" style="border:0;padding:0"><legend class="lbl">Illumin Academy criteria</legend><div class="row">${(STORE.aca ? STORE.aca.obsLib.filter(c => c.status === 'Active') : []).slice(0, 5).map(c => `<label class="check small"><input type="checkbox" class="no-ia" value="${c.code}" checked>${c.code} ${esc(c.title)}</label>`).join('')}</div></fieldset>`,
    actions: [{ label: 'Cancel' }, { label: 'Create (Proposed)', cls: 'btn-primary', fn: () => {
      const v = mval('#no-l'), w = STORE.worlds[v];
      if (w.workplace.perm !== 'Granted') { $('#no-p').innerHTML = `<div class="note b-red">${ic('lock')}<div class="small"><strong>Observation creation blocked:</strong> workplace permission is "${esc(w.workplace.perm)}". It must be Granted first.</div></div>`; return false; }
      const ia = $$('#modal-root .no-ia:checked').map(x => x.value).join(', ');
      const o = { id: 'o' + (10 + w.observations.length), at: new Date(mval('#no-d') + ':00Z').toISOString(), loc: mval('#no-loc'), assessor: mval('#no-a'), scope: mval('#no-s') + (ia ? ' · ' + ia : ''), status: 'Proposed' };
      w.observations.unshift(o); notifyLearner(v, 'Schedule', 'Observation proposed', `${o.assessor} proposed an observation on ${fdt(o.at)}.`, 'observations'); logA('Observations', VNAME(v), 'Observation proposed', '—', fdt(o.at), ''); render(); toast('Observation created. The learner and workplace can now respond.');
    } }] });
};
INP.noPerm = el => { const p = STORE.worlds[el.value].workplace.perm; $('#no-p').innerHTML = p === 'Granted' ? '' : `<div class="note b-amber">${ic('alert')}<div class="small">Workplace permission is "${esc(p)}" — creation will be blocked until it's Granted.</div></div>`; };

/* ---------- 6.16 Records / 6.17 Reports (academic filter) ---------- */
const _recK = SCREENS['a-records'];
SCREENS['a-records'] = (p) => {
  let h = _recK(p); if (!isAca()) return h;
  if (!p.id && (p.tab || 'subs') === 'subs') h = h.replace('<div class="subtabs"', `<div class="note b-grey">${ic('lock')}<div class="small">Marking and verification are restricted to Teacher and Assessor roles.</div></div><div class="subtabs"`);
  if (p.tab === 'backlog') return pageA('Assessment Records', 'Read and oversight only — no marking here') + subtabs([['subs', 'Submissions'], ['iqa', 'IQA findings'], ['backlog', 'Marking backlog'], ['modules', 'Module documents'], ['reports', 'Learner progress reports']], 'backlog', 'a-records') + dt({ id: 'kbacklog', name: 'Marking backlog', rows: ['Sarah Okonkwo', 'James Pryce', 'Omar Siddiqui', 'Kevin Doyle (deactivated)'].map(n => { const its = PENDING_MARK().filter(r => r.assessor.startsWith(n.split(' (')[0])); return { id: n, n, count: its.length, oldest: its.sort((a, b) => a.at > b.at ? 1 : -1)[0] }; }), cols: [{ k: 'n', l: 'Assessor' }, { k: 'count', l: 'Pending items', r: 1 }, { k: 'oldest', l: 'Oldest item', h: r => r.oldest ? `${esc(r.oldest.learner)} · ${esc(r.oldest.item)} ${daysChip(-daysTo(r.oldest.at))}` : '—', v: r => r.oldest ? r.oldest.learner : '' }], act: r => `<button class="btn btn-sm" data-go="k-staff" data-tab="marking">Re-allocate</button>` });
  return h.replace('data-tab="iqa">IQA findings</button>', 'data-tab="iqa">IQA findings</button><button class="tab" role="tab" aria-selected="false" data-go="a-records" data-tab="backlog">Marking backlog</button>');
};
const _repK = SCREENS['a-reports'];
SCREENS['a-reports'] = (p) => {
  if (!isAca()) return _repK(p);
  const t = ['progress', 'completion', 'staff', 'registered', 'batch', 'coverage', 'decisions', 'exports'].includes(p.tab) ? p.tab : 'progress';
  const st = subtabs([['progress', 'Progress drill-down'], ['completion', 'Completion rate'], ['staff', 'Staff performance'], ['registered', 'Learners vs enrolments'], ['batch', 'Batch reports'], ['coverage', 'Coverage'], ['decisions', 'Queue decisions'], ['exports', 'Export history']], t, 'a-reports');
  const head = pageA('Reports', 'Academic reports · exports are asynchronous and logged', exportMenu('Report: ' + t));
  if (['progress', 'completion', 'staff', 'registered', 'exports'].includes(t)) { const h = _repK({ ...p, tab: t }); const i = h.indexOf('</div>', h.indexOf('<div class="subtabs"')); return head + st + h.slice(i + 6); }
  const dec = allQueue().filter(i => ACA_TYPES.includes(i.type) && !isOpen(i));
  const body = {
    batch: `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Batch</th><th class="r">Enrolment vs capacity</th><th class="r">Attendance</th><th class="r">Progress</th><th>Competency distribution</th><th class="r">Completion</th></tr></thead><tbody>${ADMIN.batches.filter(b => b.status !== 'Cancelled').map((b, k) => `<tr><td class="mono small">${b.code}</td><td class="r">${b.enrolled}/${b.cap}</td><td class="r">${b.status === 'Planned' ? '—' : 78 + k * 3 % 15 + '%'}</td><td class="r">${b.status === 'Completed' || b.status === 'Archived' ? '100%' : b.status === 'In Progress' ? 50 + k * 7 + '%' : '0%'}</td><td>${fiveBar(b.status === 'In Progress' ? { 'Not Started': 30, 'In Progress': 25, 'Action Required': 8, 'Added to PD': 4, 'Achieved': 33 + k } : b.status === 'Completed' ? { 'Achieved': 100 } : { 'Not Started': 100 }, 'sm')}</td><td class="r">${b.status === 'Completed' ? '87%' : '—'}</td></tr>`).join('')}</tbody></table></div>`,
    coverage: `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Programme</th><th class="r">Knowledge criteria</th><th class="r">Covered</th><th class="r">Uncovered</th></tr></thead><tbody>${ADMIN.programmes.filter(x => x.status !== 'Retired').map(x => { const n = x.id === 'NV-L3' ? 48 : x.draft ? 52 : 36; const u = x.draft ? 4 : x.id === 'NV-L3' ? 3 : 0; return `<tr><td>${esc(x.title)}</td><td class="r">${n}</td><td class="r">${n - u}</td><td class="r">${u ? `<strong style="color:var(--red)">${u}</strong>` : 0}</td></tr>`; }).join('')}</tbody></table></div><button class="btn btn-sm" data-go="a-assignments" data-id="coverage">Open coverage analytics</button>`,
    decisions: `<div class="kpis">${['Granted', 'Extension', 'Re-purchase Required', 'Exceptional resubmission', 'Declined', 'Discontinued', 'Rejected'].map(o => kpi(o, dec.filter(i => outcomeOfI(i) === o).length)).join('')}</div><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Item</th><th>Type</th><th>Learner</th><th>Decided by</th><th>Outcome</th></tr></thead><tbody>${dec.map(i => `<tr><td class="mono small">${i.id}</td><td class="small">${esc(qLbl(i.type))}</td><td>${esc(learnerOfI(i))}</td><td class="small">${esc(i.decidedBy || (i.req && i.req.decided ? ACA_A : '—'))}</td><td>${outChip(outcomeOfI(i)) || qchip(i.status)}</td></tr>`).join('')}</tbody></table></div>`,
  }[t];
  return head + st + body;
};

/* ---------- 6.20 Notifications / 6.21 My Profile ---------- */
SCREENS['k-notifications'] = () => {
  const list = acaNotifs(), f = ui('knf', 'All'), cats = ['All', 'Unread', 'Approvals', 'Admissions', 'Scheduling', 'Assessment', 'System'];
  const sh = list.filter(n => f === 'All' || (f === 'Unread' ? n.unread : n.cat === f));
  return `${pageA('Notifications', '', `<button class="btn" data-act="kMarkRead">Mark all read</button>`)}${tabs(cats.map(c => [c, c === 'Approvals' ? 'Approvals queue' : c === 'Admissions' ? 'Admissions & staffing' : c, c === 'Unread' ? list.filter(n => n.unread).length : undefined]), f, 'knfTab', 'Filter notifications')}
  ${nfList('K', sh, n => `<li class="li"><span class="${n.unread ? 'unread-dot' : 'read-dot'}" aria-hidden="true"></span><div class="li-b"><a href="#${n.go}" data-act="kOpenN" data-id="${n.id}" class="${n.unread ? 'strong' : ''}">${esc(n.t)}</a><span class="xs muted">${esc(n.b)} · ${rel(n.at)}</span></div><span class="typebadge">${esc(n.cat)}</span><button class="btn btn-sm btn-ghost" data-act="kToggleN" data-id="${n.id}">${n.unread ? 'Mark read' : 'Mark unread'}</button></li>`)}`;
};
ACT.knfTab = el => { setUi('knf', el.dataset.k); render(); };
ACT.kMarkRead = () => { acaNotifs().forEach(n => n.unread = false); render(); };
ACT.kToggleN = el => { const n = STORE.aca.notifs.find(x => x.id === el.dataset.id); n.unread = !n.unread; render(); };
ACT.kOpenN = el => { const n = STORE.aca.notifs.find(x => x.id === el.dataset.id); n.unread = false; const [r, id, tab] = n.go.split('.'); go(r, { id: id || undefined, tab: tab || undefined }); };
const _aOpenNotifK = ACT.aOpenNotif;
ACT.aOpenNotif = el => { if (!ADMIN.aca) return _aOpenNotifK(el); const n = ADMIN.myNotifs[+el.dataset.i]; if (!n) return; n.unread = false; S.menu = null; const [r, id, tab] = n.go.split('.'); go(r, { id: id || undefined, tab: tab || undefined }); };
const _meK = SCREENS['a-me'];
SCREENS['a-me'] = (p) => {
  if (!isAca()) return _meK(p);
  const t = ['profile', 'password', 'activity'].includes(p.tab) ? p.tab : 'profile';
  const body = {
    profile: `<div class="grid-2"><section class="card"><h2>Details</h2><dl class="kv"><dt>Name</dt><dd>${esc(ADMIN.me.name)}</dd><dt>Email</dt><dd>${esc(ADMIN.me.email)}</dd><dt>Time zone</dt><dd>${esc(curTZ().replace('_', ' '))} (${tzl()}) — this device's time zone</dd></dl><p class="xs muted">Details are read-only. <button class="linklike" data-act="kReqChange">Request a change</button></p></section><section class="card"><h2>My roles</h2><div class="row">${ADMIN.me.roles.map(r => chip(r, 'blue')).join(' ')}</div><p class="xs muted">Two-step verification isn't required for this role.</p></section></div>`,
    password: `<section class="card" style="max-width:520px"><h2>Change password</h2>${pwForm('kcp')}</section>`,
    activity: auditPanel(a => a.actor === ADMIN.me.name, 'My recent activity'),
  }[t];
  return pageA('My Profile') + subtabs([['profile', 'Details & roles'], ['password', 'Change password'], ['activity', 'My recent activity']], t, 'a-me') + body;
};
ACT.kReqChange = () => reasonDlg({ title: 'Request a change to my details', ok: 'Send request', label: 'What should change? (required)', onOk: r => { ADMIN.threads.unshift({ id: 'MT-' + (20 + ADMIN.threads.length), subject: 'Profile change request — ' + ADMIN.me.name, party: 'System Administrator', status: 'Open', msgs: [[ADMIN.me.name, now().toISOString(), r]] }); toast('Request sent to the System Administrator.'); } });

/* ---------- Screen index (§10) ---------- */
SCREENS['k-index'] = () => {
  const L = (l, t) => `<li><button class="linklike" data-act="goTok" data-t="${t}">${l}</button></li>`, A = (l, a, extra = '') => `<li><button class="linklike" data-act="${a}" ${extra}>${l}</button></li>`;
  const awaitQ = allQueue().find(i => i.type === 'Extra quiz attempts' && awaitingMe(i));
  return `${pageA('Academic Admin screen index', 'Every screen, state and modal in the Academic Admin view')}
  <section class="card idx-sec"><h2>Screens (sidebar)</h2><ul class="idx-list">${KNAV.flatMap(([, i]) => i.map(([r, l]) => L(l, r))).join('')}${L('Learner record (academic tabs)', 'a-learner.IA-L-18022')}${L('Learner enrolments (extension / reactivate / place)', 'a-learner.IA-L-18022.enrolments')}</ul></section>
  <section class="card idx-sec"><h2>Approvals Queue — item panels</h2><ul class="idx-list">${awaitQ ? L('Extra quiz attempts — awaiting me (' + awaitQ.id + ')', 'a-queue.' + awaitQ.id) : ''}${L('Extra quiz attempts — Info Requested', 'a-queue.AQ-4003')}${L('More time — pending (learner request)', 'a-queue.AQ-R-1051-C')}${L('More time — returned', 'a-queue.AQ-4005')}${L('Resubmission limit — recommendation (a)', 'a-queue.AQ-4006')}${L('Resubmission limit — recommendation (b)', 'a-queue.AQ-4007')}${L('Resubmission limit — (c), my own recommendation (self-approval block)', 'a-queue.AQ-4008')}${L('Resubmission limit — escalated (read-only)', 'a-queue.AQ-1007')}${L('Academic discontinuation — Grace Mensah', 'a-queue.AQ-4010')}${L('Overridden decision (AQ-1021)', 'a-queue.AQ-1021')}${L('Data correction raised by me', 'a-queue.AQ-1005')}</ul></section>
  <section class="card idx-sec"><h2>Edge states (§7)</h2><ul class="idx-list">${L('Hidden module via URL (Finance)', 'a-finance')}${L('Hidden module via URL (Roles)', 'a-roles')}${L('Transfer attempt via URL', 'k-transfer')}${L('Batch with no Academic Coordinator', 'a-batches.L2DC-FEB27')}${L('Programme publish blocked (draft)', 'a-programmes.NV-L3D')}${L('LO type change with evidence', 'a-programmes.NV-L3')}${L('Mapping change after submissions', 'a-assignments.a2.mapping')}${L('Module document blocked', 'a-records..modules')}${L('Schedule conflicts', 'a-scheduling')}${A('Observation creation blocked (choose Grace Mensah)', 'newObs')}${A('Batch cancellation — decisions incomplete', 'cancelBatch', 'data-id="L3AC-NOV26-LEI"')}${A('Add after In Progress — blocked learner', 'addToBatch', 'data-id="L3AC-JAN26"')}${A('Session timeout', 'sessionWarn')}${A('500 error with retry', 'demoServer')}${A('Offline banner', 'toggleOffline')}${L('404', 'k-nothing-here')}</ul></section>
  <section class="card idx-sec"><h2>Modals (§8)</h2><ul class="idx-list">${A('Create batch (wizard)', 'newBatch')}${A('Change batch staff', 'batchStaff', 'data-id="L3AC-JAN26"')}${A('Assign / reassign reviewer', 'assignRev', 'data-id="APP-2220"')}${A('Allocate staff', 'kAlloc')}${A('Re-allocate learners', 'kRealloc')}${A('Raise Data Correction', 'raiseDC', 'data-id="IA-L-18022"')}${A('Edit schedule item', 'kEditEv', 'data-b="L3AC-JAN26" data-id="' + (batchEvents(ADMIN.batches.find(b => b.code === 'L3AC-JAN26')).find(e => daysTo(e.start) >= 0) || {}).id + '"')}${A('Publish programme version', 'kPubProg', 'data-id="NV-L3"')}${A('Publish assignment (Assignment 9)', 'pubAsg', 'data-id="a9" data-m="3"')}${A('Edit brief (new version)', 'kEditBrief', 'data-id="a3"')}${A('Add observation criterion', 'kLib', 'data-id=""')}${A('Announcement compose', 'composeAnn')}${A('Change password', 'kGoPw')}</ul></section>
  <section class="card idx-sec"><h2>Demo-only controls</h2><ul class="idx-list">${A('Advance 7 days (escalation)', 'kAdvance')}${A('Simulate learner request', 'kSimReq')}${A('Simulate assessor recommendation', 'kSimRec')}</ul></section>`;
};
ACT.kGoPw = () => go('a-me', { tab: 'password' });
const _idxK = SCREENS.index;
SCREENS.index = p => _idxK(p) + `<section class="card idx-sec"><h2>Academic Admin</h2><ul class="idx-list"><li><button class="linklike" data-act="demoSignInAsAca" data-v="KA">Sign in as Academic Admin A (demo) — no 2FA</button></li><li><button class="linklike" data-act="demoSignInAsAca" data-v="KB">Sign in as Academic Admin B (demo) — no 2FA</button></li><li><button class="linklike" data-act="demoSignInAsAca" data-v="KC">Variant C — only one Academic Admin</button></li><li><button class="linklike" data-act="demoSignInAsAca" data-v="KD">Variant D — Academic Admin + Assessor</button></li></ul></section>`;

/* ---------- Sign-in (no 2FA), role switching, demo controls ---------- */
const ACA_EMAILS = { 'rachel.hughes@illumin-academy.example': 'KA', 'joanne.lister@illumin-academy.example': 'KB' };
const _ssK = staffSignin;
staffSignin = function (e) {
  const k = ACA_EMAILS[e] || (e.includes('academic') ? 'KA' : null);
  if (!k) { if (ADMIN.aca && (e.includes('admin') || ADMIN.staff.some(s => s.email === e && s.roles.includes('Super Administrator')))) setAdminIdentity(ADMIN._saAv || 'A'); return _ssK(e); }
  if (e.includes('suspended') || e.includes('deactivated') || (k === 'KB' && STORE.aca && STORE.aca.solo)) { S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; render(); return true; }
  acaEnter(k); return true;
};
function acaEnter(k) {
  setAdminIdentity(k); S.portal = 'admin'; S.signedIn = true; S.auth = 'signin'; S.staffFlow = false; S.failCount = 0; S.authMsg = null; S.serverError = false;
  const back = S.returnTo && (S.returnTo.startsWith('k-') || S.returnTo.startsWith('a-')) ? S.returnTo : null; S.returnTo = null;
  if (back) { setRoute(back); render(); toast('Signed in. We\'ve brought you back to where you were.', 'info'); } else go('k-dashboard');
}
ACT.demoSignInAsAca = el => { acaEnter(el.dataset.v); toast(`Signed in as ${ADMIN.me.name} (${ADMIN.me.roles.join(' + ')}) — no 2FA for this role.`, 'info'); };
const _soK = signOut;
signOut = function (reason) { const wasAca = S.portal === 'admin' && ADMIN && ADMIN.aca, em = wasAca ? ADMIN.me.email : null; _soK(reason); if (wasAca && reason === 'expired') { S.portal = 'admin'; S.auth = 'signin'; S.authEmail = em; S.authMsg = { tone: 'blue', html: '<strong>Your session expired.</strong> Sign in again to return to the same screen.' }; render(); } };
const _rshK = roleSwitchHtml;
roleSwitchHtml = function () { const on = n => !!(ADMIN && ADMIN.aca && S.portal === 'admin' && ADMIN.me.name === n); return _rshK().replace(/aria-pressed="true"( data-act="switchRole" data-r="admin")/, (m, rest) => `aria-pressed="${S.portal === 'admin' && !ADMIN.aca && !ADMIN.fin}"${rest}`).replace('</div><button class="btn btn-sm" data-act="resetDemo">', `<button aria-pressed="${on(ACA_A)}" data-act="switchRole" data-r="acaA">Academic Admin A</button><button aria-pressed="${on(ACA_B)}" data-act="switchRole" data-r="acaB">Academic Admin B</button></div><button class="btn btn-sm" data-act="resetDemo">`); };
const _srK = ACT.switchRole;
ACT.switchRole = el => {
  const r = el.dataset.r;
  if (r === 'acaA' || r === 'acaB') { acaEnter(r === 'acaA' ? (ADMIN.av === 'KC' || ADMIN.av === 'KD' ? ADMIN.av : 'KA') : 'KB'); toast(`Viewing as ${ADMIN.me.name} (Academic Admin)`, 'info'); return; }
  if (ADMIN.aca && r !== 'staff') setAdminIdentity(ADMIN._saAv || 'A');
  _srK(el);
};
const _dsaK = ACT.demoSignInAs;
ACT.demoSignInAs = el => { if (el.dataset.r === 'admin' && ADMIN.aca) setAdminIdentity(ADMIN._saAv || 'A'); _dsaK(el); };
const _resetK = ACT.resetDemo;
ACT.resetDemo = () => { const av = ADMIN.av, keep = ACA_VARIANTS[av] || (typeof FIN_VARIANTS !== 'undefined' && FIN_VARIANTS[av]) ? av : null; if (keep) { ADMIN.av = ADMIN._saAv || 'A'; } _resetK(); if (keep) { setAdminIdentity(keep); render(); } };
const KEDGES = [['none', 'None (normal)'], ['kEmpty', 'Empty states (nothing awaiting, no alerts)'], ['zoomDown', 'Zoom outage → manual attendance'], ['exportFail', 'Next export fails']];
const _adpK = adminDemoPanel;
adminDemoPanel = function () {
  if (!ADMIN.aca) return _adpK();
  const go_ = (l, r) => `<button class="btn btn-sm" data-act="finGo" data-r="${r}">${l}</button>`;
  return `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls"><div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>${roleSwitchHtml()}
  <fieldset><legend>Academic Admin variant — demo only</legend>${Object.entries(ACA_VARIANTS).map(([k, v]) => `<label class="vopt"><input type="radio" name="kv" value="${k}" ${ADMIN.av === k ? 'checked' : ''} data-onchange="kVariant"><span><strong>${k.slice(1)} · ${v.label}</strong><br><span class="xs muted">${v.note}</span></span></label>`).join('')}</fieldset>
  <fieldset><legend>Demo only</legend><div class="btns"><button class="btn btn-sm" data-act="kAdvance">Advance 7 days</button><button class="btn btn-sm" data-act="kSimReq">Simulate learner request</button><button class="btn btn-sm" data-act="kSimRec">Simulate assessor recommendation</button></div><span class="xs muted">Demo only — simulates time passing and new items arriving.</span></fieldset>
  <fieldset><legend>Academic edge state — demo only</legend><label class="sr" for="kedge">Edge</label><select class="select" id="kedge" data-onchange="finEdge">${KEDGES.map(([k, l]) => `<option value="${k}" ${ADMIN.edge === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <div class="btns">${go_('Hidden module via URL', 'a-finance')}${go_('Transfer via URL', 'k-transfer')}${go_('Self-approval block', 'a-queue.AQ-4008')}${go_('Escalated item', 'a-queue.AQ-1007')}${go_('Overridden decision', 'a-queue.AQ-1021')}${go_('No coordinator', 'a-batches.L2DC-FEB27')}${go_('Publish blocked', 'a-programmes.NV-L3D')}<button class="btn btn-sm" data-act="sessionWarn">Session timeout</button><button class="btn btn-sm" data-act="aDemo404">404</button><button class="btn btn-sm" data-act="demoServer">500</button><button class="btn btn-sm" data-act="toggleOffline">Offline</button></div></fieldset>
  <fieldset><legend>Sign-in (no 2FA) — demo only</legend><div class="btns"><button class="btn btn-sm" data-act="kAuth" data-a="signin">Sign-in screen</button><button class="btn btn-sm" data-act="kAuth" data-a="first">First-time set password</button><button class="btn btn-sm" data-act="kAuth" data-a="forgot">Forgot password</button></div></fieldset>
  <fieldset><legend>View — demo only</legend><div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div></fieldset>
  <button class="btn btn-primary" data-act="finGo" data-r="k-index">Open Academic Admin screen index</button></div>`;
};
const _finGoK = ACT.finGo;
ACT.finGo = el => { const r = el.dataset.r; if (r.includes('.')) { const [rt, id, tab] = r.split('.'); go(rt, { id: id || undefined, tab: tab || undefined }); return; } _finGoK(el); };
INP.kVariant = el => { acaEnter(el.value); toast(ACA_VARIANTS[el.value].label, 'info'); };
ACT.kAuth = el => { const av = ADMIN.av, a = el.dataset.a; signOut(); S.portal = 'admin'; S.authEmail = ADMIN.staff.find(s => s.id === (ACA_VARIANTS[av] || ACA_VARIANTS.KA).staff).email; if (a === 'first') { S.staffFlow = true; S.auth = 'first'; } else S.auth = a; render(); };
const _fsK = SUBMIT.firstSet;
SUBMIT.firstSet = (f, e) => { if (S.staffFlow === true && S.authEmail && ACA_EMAILS[S.authEmail]) { acaEnter(ACA_EMAILS[S.authEmail]); toast('Password set. Two-step verification isn\'t required for this role.', 'info'); return; } _fsK(f, e); };
// Demo-only controls
ACT.kAdvance = () => {
  const shift = iso => new Date(new Date(iso).getTime() - 7 * DAY).toISOString(); let n = 0;
  ADMIN.queue.filter(i => ACA_TYPES.includes(i.type) && isOpen(i) && i.status !== 'Escalated').forEach(i => { i.raised = shift(i.raised); i.history[0][1] = i.raised; n++; });
  [...'ABCDEF'].forEach(v => STORE.worlds[v].requests.filter(r => r.status === 'Requested').forEach(r => { r.raised = shift(r.raised); n++; }));
  (ADMIN.apps || []).filter(a => a.status === 'Under Review').forEach(a => { a.days += 7; if (a.days >= 7) a.escalated = true; });
  const esc_ = allQueue().filter(i => ACA_TYPES.includes(i.type) && i.status === 'Escalated');
  esc_.slice(0, 3).forEach(i => acaNotify('Item escalated to Super Admin', `${i.id} · ${learnerOfI(i)} — no decision for 7 days`, 'a-queue.' + i.id));
  render(); toast(`Demo only: advanced 7 days. ${esc_.length} academic item(s) are now escalated to the Super Administrator.`, 'info');
};
ACT.kSimReq = () => {
  const A_ = STORE.worlds.A, e = A_.enrolments.find(x => x.id === 'mh26');
  const pending = A_.requests.some(r => r.type === 'Extra quiz attempts' && r.target === e.title && r.status === 'Requested');
  let id;
  if (!pending) { e.quiz.attempts = [{ n: 1, at: D(-6, '17:42'), score: 60, result: 'Fail' }, { n: 2, at: D(-3, '19:10'), score: 72, result: 'Fail' }, { n: 3, at: D(0, '07:40'), score: 76, result: 'Fail' }]; id = 'R-' + (1090 + A_.requests.length); A_.requests.unshift({ id, type: 'Extra quiz attempts', target: e.title, raised: now().toISOString(), status: 'Requested', reason: 'I missed the pass mark three times by a small margin.', decision: null }); acaNotify('New queue item awaiting you', `Extra quiz attempts · ${VNAME('A')} (${id})`, 'a-queue.AQ-' + id); }
  else { const E = STORE.worlds.E, ex = E.enrolments.find(x => x.status === 'Expired-Incomplete' && !E.requests.some(r => r.target === x.title && r.status === 'Requested')) || E.enrolments.find(x => x.kind === 'short'); if (ex.status !== 'Expired-Incomplete') { ex.status = 'Expired-Incomplete'; ex.end = D(-3); } id = 'R-' + (1095 + E.requests.length); E.requests.unshift({ id, type: 'More time on course', target: ex.title, raised: now().toISOString(), status: 'Requested', reason: 'Work rota changed — I need two more weeks.', decision: null }); acaNotify('New queue item awaiting you', `More time · ${VNAME('E')} (${id})`, 'a-queue.AQ-' + id + '-E'); }
  render(); toast(`Demo only: a learner raised ${id}. It's in "Awaiting me".`, 'info');
};
ACT.kSimRec = () => {
  const Dw = STORE.worlds.D, as = Dw.assignments.find(x => x.id === 'a7') || Dw.assignments[Dw.assignments.length - 1];
  if (ADMIN.queue.some(i => i.data && i.data.v === 'D' && i.data.aid === as.id && isOpen(i))) { toast('A recommendation for this learner is already waiting.', 'info'); return; }
  as.limit = true; as.resubUsed = as.resubMax = 2; as.status = 'Submitted'; as.round = 'Resub 2';
  const id = 'AQ-' + (4100 + ADMIN.queue.length);
  ADMIN.queue.unshift({ id, type: 'Resubmission limit reached', raisedBy: 'James Pryce', raised: now().toISOString(), status: 'Pending', first: 'Academic Admin', related: [`${VNAME('D')} · ${as.title}`, 'a-learner.' + Dw.me.id + '.academic'], notes: [], history: [['James Pryce', now().toISOString(), 'Raised', 'Recommendation recorded']], reason: 'Both resubmissions used; two criteria still Not met.', data: { v: 'D', aid: as.id, learner: VNAME('D'), course: Dw.nvq.title, batch: 'L2DC-MAR26', asg: as.title, crit: (as.crit || []).slice(0, 3).map(c => c[0]), rec: '(a) One exceptional resubmission', recCode: 'a', recBy: 'James Pryce', recReason: 'Grace has engaged well with feedback; one more round should close the gaps.', evidence: 'Round 3 addressed four of six feedback points.', policy: 2, end: D(151) } });
  acaNotify('New queue item awaiting you', `Resubmission limit · ${VNAME('D')} (${id}) — recommendation (a)`, 'a-queue.' + id);
  render(); toast(`Demo only: James Pryce recorded a recommendation — ${id} is in "Awaiting me".`, 'info');
};
AFTER.push(() => { const d = $('.demo-hint .row'); if (d && !S.signedIn && !d.querySelector('[data-act="demoSignInAsAca"]')) d.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm" data-act="demoSignInAsAca" data-v="KA">Sign in as Academic Admin A (demo)</button><button type="button" class="btn btn-sm" data-act="demoSignInAsAca" data-v="KB">Sign in as Academic Admin B (demo)</button>'); });

/* ---------- Variant D: Assessor portal identity + role switch back ---------- */
TAS_USERS.R = { key: 'R', name: ACA_A, first: 'Rachel', email: 'rachel.hughes.assessor@illumin-academy.example', roles: ['Assessor', 'Academic Admin'], label: 'R · Assessor + Academic Admin', batches: ['L2DC-MAR26'], multi: true, quals: 'TAQA (CAVA)', reg: 'ASR-60114' };
const _tasRenderK = tasRender;
tasRender = function () { _tasRenderK(); if (TME().key === 'R') { const s = $('#tctx'); if (s) s.innerHTML = '<option selected>Assessor</option><option>Academic Admin</option>'; } };
const _tasCtxK = INP.tasCtx;
INP.tasCtx = el => { if (el.value === 'Academic Admin') { acaEnter('KD'); toast('Role context: Academic Admin (Rachel Hughes)', 'info'); return; } if (_tasCtxK) _tasCtxK(el); };

/* Boot-time patch (scripts load before App.boot; resetDemo re-runs initStore) */
if (ADMIN) acaPatch();
