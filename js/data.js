/* Illumin Academy prototype — mock data. All names, organisations and references are fictional. */
'use strict';

const PERSONAS = {
  A: { id: 'IA-L-20417', first: 'Daniel', last: 'Okafor', email: 'daniel.okafor@outlook.example', mobile: '+44 7700 900412', dob: '14 Mar 1991', address: '14 Example Road, Manchester', postcode: 'ZZ99 1AA', country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: '3 Feb 2025', referral: 'Self-registration', sponsor: null },
  B: { id: 'IA-L-31188', first: 'Priya', last: 'Raman', email: 'priya.raman@gmail.example', mobile: '+971 50 000 4471', dob: '2 Nov 1994', address: 'Apt 1204, Example Tower, Dubai', postcode: '—', country: 'United Arab Emirates', tz: 'Asia/Dubai', cur: 'GBP', joined: '22 Sep 2026', referral: 'Agent — Gulf Care Recruitment (demo) (code GCR-118)', sponsor: null },
  C: { id: 'IA-L-18022', first: 'Aisha', last: 'Rahman', email: 'aisha.rahman@gmail.example', mobile: '+44 7700 900188', dob: '9 Jul 1988', address: '41 Example Lane, Leicester', postcode: 'ZZ99 1AB', country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: '28 Nov 2025', referral: 'Welfare Buddy referral (code WB-HASSAN22)', sponsor: null },
  D: { id: 'IA-L-24560', first: 'Grace', last: 'Mensah', email: 'grace.mensah@brightcare-staff.example', mobile: '+44 7700 900631', dob: '23 Jan 1996', address: '7 Sample Road, Croydon', postcode: 'ZZ99 1AD', country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: '4 Mar 2026', referral: 'Created by agency', sponsor: 'BrightCare Staffing Ltd (demo)' },
  E: { id: 'IA-L-09931', first: 'Tom', last: 'Whitfield', email: 'tom.whitfield@illumin-academy.example', mobile: '+44 7700 900255', dob: '30 Apr 1985', address: '3 Example Vale, Bristol', postcode: 'ZZ99 1AE', country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: '15 Jun 2024', referral: 'Created by admin', sponsor: null },
  F: { id: 'IA-L-27703', first: 'Fatima', last: 'Al Mansoori', email: 'fatima.almansoori@outlook.ae.example', mobile: '+971 55 000 2190', dob: '17 Aug 1992', address: 'Villa 22, Example Villas, Abu Dhabi', postcode: '—', country: 'United Arab Emirates', tz: 'Asia/Dubai', cur: 'GBP', joined: '9 May 2025', referral: 'Self-registration', sponsor: null },
};
const VARIANTS = {
  A: { nvq: false }, B: { nvq: true, admitted: false }, C: { nvq: true, admitted: true },
  D: { nvq: true, admitted: true, sponsored: true }, E: { nvq: false, multiRole: true }, F: { nvq: false, buddy: true },
};

const QUIZ_BANK = [
  ['Under the Manual Handling Operations Regulations 1992, what must an employer do first?', ['Avoid hazardous manual handling where reasonably practicable', 'Provide a hoist in every room', 'Train staff once every five years', 'Ask staff to lift in pairs'], 0],
  ['What does the "I" stand for in the TILE risk assessment?', ['Injury', 'Individual capability', 'Instruction', 'Inspection'], 1],
  ['Before using a hoist, you should check…', ['The sling is the correct type and size and the LOLER inspection is in date', 'Only that the battery is charged', 'That the person weighs under 100 kg', 'Nothing if it was used earlier'], 0],
  ['A person you support refuses to use a slide sheet. What should you do first?', ['Use it anyway for their safety', 'Stop, listen to their reasons and report to your senior', 'Lift them manually', 'Leave them where they are'], 1],
  ['How often must lifting equipment used for people be thoroughly examined under LOLER?', ['Every 6 months', 'Every 12 months', 'Every 2 years', 'Only when it breaks'], 0],
  ['Which posture reduces strain when moving a load?', ['Twisting at the waist', 'Keeping the load close to the waist with a stable base', 'Locking your knees', 'Reaching above shoulder height'], 1],
  ['Where should you record a near miss involving moving and handling?', ['Nowhere if nobody was hurt', 'In the incident / near-miss log in line with policy', 'On social media', 'In your personal diary only'], 1],
  ['The care plan says "two carers and a stand aid". Only one carer is available. You should…', ['Carry out the transfer alone carefully', 'Wait for a second carer and inform the senior on shift', 'Use a different aid', 'Ask the person to stand without help'], 1],
  ['What is the main purpose of a moving and handling risk assessment?', ['To meet inspection paperwork targets', 'To identify risks and decide safe methods for the person and staff', 'To reduce staffing levels', 'To decide meal times'], 1],
  ['Which item should never be used to pull a person up the bed?', ['A slide sheet', 'Their arms or under their armpits', 'A profiling bed', 'A turning aid'], 1],
];

function shortContent(topic) {
  const T = {
    mh: [['doc', 'Moving and handling: the law and your responsibilities (MHOR 1992, LOLER)', '12 pages', 'Completed', 1], ['video', 'Safe use of a hoist and sling', '14:20', 'Opened', 0, 46, '6:35'], ['scorm', 'Interactive: risk assessment using TILEO', '25 min', 'Completed', 0, 0, 0, 88], ['video', 'Slide sheets and repositioning in bed', '09:05', 'Not opened', 0, 0], ['doc', 'Quick reference card — TILEO checklist', '2 pages', 'Opened', 0]],
    bls: [['video', 'Adult basic life support: the chain of survival', '18:40', 'Completed', 0, 100, ''], ['scorm', 'Using an AED — interactive scenario', '20 min', 'Completed', 0, 0, 0, 92], ['doc', 'Recognising anaphylaxis and using an adrenaline auto-injector', '8 pages', 'Completed', 1], ['video', 'Recovery position demonstration', '06:15', 'Completed', 0, 100, '']],
    ipc: [['doc', 'The chain of infection', '10 pages', 'Completed', 1], ['video', 'Hand hygiene: the WHO 5 moments', '07:50', 'Completed', 0, 100, ''], ['scorm', 'Donning and doffing PPE', '30 min', 'Opened', 0, 0, 0, 0], ['video', 'Managing outbreaks in care homes', '16:05', 'Not opened', 0, 0], ['doc', 'Safe handling of linen and waste', '6 pages', 'Not opened', 0]],
    cc: [['doc', 'Standard 1: Understand your role', '14 pages', 'Completed', 1], ['scorm', 'Standard 2: Your personal development', '35 min', 'Opened', 0, 0, 0, 0], ['video', 'Standard 3: Duty of care', '12:30', 'Not opened', 0, 0], ['doc', 'Standard 4: Equality and diversity', '9 pages', 'Not opened', 0], ['video', 'Standard 5: Work in a person-centred way', '15:10', 'Not opened', 0, 0]],
  }[topic] || [['doc', 'Course handbook', '10 pages', 'Completed', 1], ['video', 'Introduction', '10:00', 'Completed', 0, 100, ''], ['scorm', 'Interactive module', '20 min', 'Completed', 0, 0, 0, 90]];
  return T.map((r, i) => ({ id: 'c' + (i + 1), kind: r[0], title: r[1], dur: r[2], state: r[3], dl: !!r[4], watch: r[5] || 0, resume: r[6] || '0:00', score: r[7] || 0 }));
}
// CH-15: an NVQ module's label with its awarding-body code, e.g. "AC M12 Ways of working in adult care (T/652/0001)"
const modLabel = m => m ? `${m.title}${m.ab ? ' (' + m.ab + ')' : ''}` : '';
// The unit / module an assignment or resource group names ("U302 · Module 1", "U306 Safeguarding · Module 1")
const nvqModOf = (tree, s) => { const r = /^(U\d+)\D*Module (\d+)/.exec(s || ''); if (!r) return null; const u = (tree || []).find(x => x.code === r[1]); const m = u && u.mods[+r[2] - 1]; return m ? { u, m, key: u.code + ' ' + m.code } : null; };
// CH-16: every short course is split into modules; each module has its own content and its own quiz (there is no course quiz).
// [module id, title, content item ids] by course topic ('' = courses with the standard three-item content)
const SH_MODS = {
  mh: [['m1', 'The law and your responsibilities', ['c1']], ['m2', 'Hoists, slings and repositioning', ['c2', 'c4']], ['m3', 'Risk assessment with TILEO', ['c3', 'c5']]],
  bls: [['m1', 'Basic life support and using an AED', ['c1', 'c2']], ['m2', 'Anaphylaxis and the recovery position', ['c3', 'c4']]],
  ipc: [['m1', 'The chain of infection and hand hygiene', ['c1', 'c2']], ['m2', 'Personal protective equipment', ['c3']], ['m3', 'Outbreaks, linen and waste', ['c4', 'c5']]],
  cc: [['m1', 'Standards 1–2: your role and your development', ['c1', 'c2']], ['m2', 'Standards 3–4: duty of care, equality and diversity', ['c3', 'c4']], ['m3', 'Standard 5: person-centred care', ['c5']]],
  '': [['m1', 'Introduction and handbook', ['c1', 'c2']], ['m2', 'Putting it into practice', ['c3']]],
};
const shModDefs = topic => SH_MODS[topic] || SH_MODS[''];
// Seed: earlier attempts belong to module 1; a completed course has every module quiz passed
function shModules(sh, mq = {}) {
  const m1 = mq.m1 || [], passAt = (m1.find(a => a.result === 'Pass') || {}).at;
  return shModDefs(sh.topic).map(([id, title, items], i) => ({ id, title, items: items.slice(), quiz: { q: 10, limit: mq.limit || 20, pass: 80, max: 3, attempts: i === 0 ? m1.map(a => ({ ...a })) : passAt ? [{ n: 1, at: passAt, score: 90, result: 'Pass' }] : [] } }));
}

/* CH-02: every price, payment, receipt and refund is in GBP — whatever the learner's country. */
function makeWorld(v) {
  const me = { ...PERSONAS[v] };
  const flags = { ...VARIANTS[v] };
  const cur = me.cur;
  const amt = g => g; // CH-02: GBP list prices, never converted
  const w = { v, me, flags };
  W = w; // formatters read W.me while the world is built
  w.amt = amt;

  /* ---------- Short-course enrolments ---------- */
  const SH = {
    mh26: { title: 'Moving and Handling People — 2026', base: 'Moving and Handling People', status: 'Active', enrolled: D(-40), start: D(-40), end: D(50), progress: 62, price: 45, topic: 'mh',
      desc: 'Practical, law-based training on moving and handling people safely, using hoists, slide sheets and the TILEO risk assessment. Meets Care Certificate Standard 13 outcomes for moving and handling.',
      reqs: [['Open all documents', true], ['Watch all videos to at least 90%', false], ['Complete the interactive SCORM module', true], ['Pass every module quiz with 80% or more', false]],
      mq: { limit: 20, m1: [{ n: 1, at: D(-6, '17:42'), score: 60, result: 'Fail' }] }, validity: '12 months' },
    mh25: { title: 'Moving and Handling People — 2025', base: 'Moving and Handling People', status: 'Completed', enrolled: D(-405), start: D(-405), end: D(-40), progress: 100, price: 45, topic: 'mh', certId: 'c1', completedAt: D(-342),
      desc: 'Your 2025 enrolment. Re-enrolments are kept as separate records.', reqs: [['Open all documents', true], ['Watch all videos to at least 90%', true], ['Complete the interactive SCORM module', true], ['Pass every module quiz with 80% or more', true]],
      mq: { limit: 20, m1: [{ n: 1, at: D(-343, '19:10'), score: 70, result: 'Fail' }, { n: 2, at: D(-342, '18:02'), score: 90, result: 'Pass' }] }, validity: '12 months' },
    bls: { title: 'Basic Life Support and Anaphylaxis', base: 'Basic Life Support and Anaphylaxis', status: 'Active', enrolled: D(-25), start: D(-25), end: D(65), progress: 85, price: 39, topic: 'bls',
      desc: 'Adult basic life support, AED use, the recovery position and recognising and responding to anaphylaxis.', reqs: [['Watch all videos to at least 90%', true], ['Complete the AED scenario', true], ['Open all documents', true], ['Pass every module quiz with 80% or more', false]],
      mq: { limit: 15, m1: [{ n: 1, at: D(-12, '18:20'), score: 60, result: 'Fail' }, { n: 2, at: D(-9, '19:05'), score: 70, result: 'Fail' }, { n: 3, at: D(-5, '20:31'), score: 75, result: 'Fail' }] }, validity: '12 months' },
    ipc: { title: 'Infection Prevention and Control', base: 'Infection Prevention and Control', status: 'Expired-Incomplete', enrolled: D(-99), start: D(-99), end: D(-9), progress: 45, price: 35, topic: 'ipc',
      desc: 'The chain of infection, hand hygiene, PPE and outbreak management in care settings.', reqs: [['Open all documents', false], ['Watch all videos to at least 90%', false], ['Complete the PPE module', false], ['Pass every module quiz with 80% or more', false]],
      mq: { limit: 20, m1: [] }, validity: '12 months' },
    fire: { title: 'Fire Safety Awareness', base: 'Fire Safety Awareness', status: 'Payment Pending', enrolled: D(0, '07:58'), start: null, end: null, progress: 0, price: 29, topic: 'fire',
      desc: 'Fire prevention, evacuation methods including horizontal evacuation, and using fire equipment in care settings.', reqs: [['Open all documents', false], ['Watch all videos', false], ['Pass every module quiz with 80% or more', false]], mq: { limit: 15, m1: [] }, validity: '12 months' },
    med: { title: 'Medication Awareness', base: 'Medication Awareness', status: 'Discontinued', enrolled: D(-60), start: D(-60), end: D(30), progress: 20, price: 49, topic: 'med',
      desc: 'Safe handling and administration of medicines in social care.', reason: 'Discontinued by the Academy on 2 Sep 2026: duplicate purchase. The duplicate payment has been refunded to your original payment method.',
      reqs: [], mq: { limit: 20, m1: [] }, validity: '12 months' },
    dem: { title: 'Dementia Awareness', base: 'Dementia Awareness', status: 'Completed', enrolled: D(-30), start: D(-30), end: D(60), progress: 100, price: 35, topic: 'dem', certId: 'c6', completedAt: D(0, '07:40'),
      desc: 'Understanding dementia, person-centred communication and supporting wellbeing.', reqs: [['Open all documents', true], ['Watch all videos', true], ['Pass every module quiz with 80% or more', true]],
      mq: { limit: 20, m1: [{ n: 1, at: D(0, '07:38'), score: 90, result: 'Pass' }] }, validity: '24 months' },
    cc: { title: 'The Care Certificate (15 Standards)', base: 'The Care Certificate', status: 'Active', enrolled: D(-20), start: D(-20), end: D(160), progress: 22, price: 180, topic: 'cc',
      desc: 'All 15 Care Certificate standards for people new to health and social care, delivered online.', reqs: [['Complete all 15 standards', false], ['Pass every module quiz with 80% or more', false]],
      mq: { limit: 20, m1: [] }, validity: 'No expiry' },
  };
  const pick = {
    A: ['mh26', 'mh25', 'bls', 'cc', 'ipc', 'fire', 'med', 'dem'], B: ['dem'], C: ['mh26', 'mh25', 'ipc'], D: ['mh26'],
    E: ['mh26', 'bls', 'fire', 'dem', 'ipc'], F: ['mh26', 'mh25', 'bls', 'cc', 'ipc', 'fire', 'med', 'dem'], G: [],
  }[v] || [];
  w.enrolments = pick.map(id => { const { mq, ...sh } = SH[id]; return { id, kind: 'short', type: 'Short course', sponsor: flags.sponsored ? me.sponsor : null, ...sh, content: shortContent(sh.topic), modules: shModules(sh, mq), price: amt(sh.price) }; });
  if (v === 'C') { const i = w.enrolments.find(e => e.id === 'ipc'); i.status = 'Active'; i.end = D(40); }

  /* ---------- NVQ programme ---------- */
  if (flags.nvq) {
    const l2 = v === 'D';
    w.nvq = {
      id: 'nvq', kind: 'nvq', type: 'NVQ / RQF', title: l2 ? 'Level 2 Diploma in Care (England)' : 'Level 3 Diploma in Adult Care (England)', level: l2 ? 'Level 2' : 'Level 3',
      ab: l2 ? 'Awarding body ref. QN 603/2873/4' : 'Awarding body ref. QN 603/2851/9', batch: l2 ? 'Croydon Cohort 4 — L2DC-MAR26' : 'Leicester Cohort 7 — L3AC-JAN26',
      batchStart: l2 ? D(-214) : D(-265), batchEnd: l2 ? D(151) : D(99), mode: 'Blended (online + classroom)', version: l2 ? 'Version 1 — enrolled 4 Mar 2026' : 'Version 2 — enrolled 12 Jan 2026',
      status: flags.admitted ? 'Active' : 'Payment Pending', enrolled: l2 ? D(-214) : D(-265), start: l2 ? D(-214) : D(-265), end: l2 ? D(151) : D(99),
      sponsor: flags.sponsored ? me.sponsor : null, desc: 'A competence-based qualification for people working in adult care, assessed through assignments, workplace observation and a Professional Discussion.',
      people: [['Academic Coordinator', 'Dr Helen Carter'], ['Teacher', 'Marcus Bell'], ['Assessor', 'Sarah Okonkwo'], ['Assessor (observations)', 'James Pryce']],
    };
    if (v === 'B') { w.nvq.title = 'Level 3 Diploma in Adult Care (England)'; w.nvq.batch = 'Abu Dhabi Cohort 1 — L3AC-DEC26-AUH'; w.nvq.batchStart = D(62); w.nvq.batchEnd = D(426); w.nvq.start = D(62); w.nvq.end = D(426); }
    if (flags.admitted) w.enrolments.unshift(w.nvq);

    /* NVQ hierarchy: Unit → Module → Learning Outcome (type) → Criterion */
    const c = (code, d, st, src, date, ev, obs) => ({ code, d, st, src, date: date != null ? D(date) : null, ev, obs });
    w.tree = [
      { code: 'U301', title: 'Promote communication in care settings', mods: [
        { code: 'M1', title: 'Communication needs and methods', ab: 'H/652/0101', los: [
          { code: 'LO1', title: 'Understand why effective communication is important', type: 'Knowledge', crit: [
            c('301 1.1', 'Identify the different reasons people communicate', 'Achieved', 'Assignment 1 · Q1', -150, 'assignment.a1'),
            c('301 1.2', 'Explain how communication affects relationships in an adult care setting', 'Achieved', 'Assignment 1 · Q2', -150, 'assignment.a1')] },
          { code: 'LO2', title: 'Meet the communication and language needs of individuals', type: 'Observation', crit: [
            c('301 2.1', "Find out an individual's communication and language needs, wishes and preferences", 'Achieved', 'Observation · 14 Jul', -82, 'observations.o3', { o: 1, c: 1 }),
            c('301 2.2', "Demonstrate communication methods that meet an individual's needs", 'In Progress', 'Observation · 14 Jul', null, 'observations.o3', { o: 1, c: 0 }),
            c('301 2.3', 'Show how and when to seek advice about communication', 'Not Started', null, null, null, { o: 0, c: 0 })] }] },
        { code: 'M2', title: 'Confidentiality', ab: 'K/652/0102', los: [
          { code: 'LO3', title: 'Apply principles and practices relating to confidentiality', type: 'Knowledge', crit: [
            c('301 3.1', 'Explain the meaning of the term confidentiality', 'Achieved', 'Assignment 1 · Q3', -150, 'assignment.a1'),
            c('301 3.2', 'Describe ways to maintain confidentiality in day-to-day communication', 'Achieved', 'Assignment 1 · Q3', -150, 'assignment.a1')] }] }] },
      { code: 'U302', title: 'Promote person-centred approaches in care settings', mods: [
        { code: 'M1', title: 'AC M12 Ways of working in adult care', ab: 'T/652/0001', los: [
          { code: 'LO1', title: 'Understand person-centred approaches for care and support', type: 'Knowledge', crit: [
            c('302 1.1', 'Describe how person-centred values should influence all aspects of care work', 'Achieved', 'Assignment 2 · Q1', -30, 'assignment.a2'),
            c('302 1.2', 'Explain the importance of finding out the history, preferences, wishes and needs of the individual', 'Action Required', 'Assignment 2 · Q3', null, 'assignment.a2'),
            c('302 1.3', "Explain how to use an individual's care plan to record their history, preferences and wishes", 'Added to PD', 'Assignment 2 · Q2', null, 'assignment.a2')] },
          { code: 'LO3', title: 'Support individuals to take risks', type: 'Knowledge', crit: [
            c('302 3.2', 'Analyse how risk-taking can contribute to the wellbeing of an individual', 'Action Required', 'Assignment 2 · Q4', null, 'assignment.a2')] }] },
        { code: 'M2', title: 'Working in a person-centred way', ab: 'A/652/0002', los: [
          { code: 'LO2', title: 'Work in a person-centred way', type: 'Observation', crit: [
            c('302 2.1', "Work with an individual and others to find out the individual's history, preferences, wishes and needs", 'In Progress', 'Observation (confirmed)', null, 'observations.o2', { o: 0, c: 0 }),
            c('302 2.4', 'Adapt actions and approaches in response to changing needs or preferences', 'Not Started', null, null, null, { o: 0, c: 0 })] }] }] },
      { code: 'U303', title: 'Equality, diversity, inclusion and human rights', mods: [
        { code: 'M1', title: 'Inclusive practice', ab: 'D/652/0301', los: [
          { code: 'LO1', title: 'Understand the importance of equality and inclusion', type: 'Knowledge', crit: [
            c('303 1.1', 'Explain what is meant by diversity, equality, inclusion and discrimination', 'In Progress', 'Assignment 5 · Q1', null, 'assignment.a5'),
            c('303 1.2', 'Describe the effects of discrimination', 'In Progress', 'Assignment 5 · Q2', null, 'assignment.a5'),
            c('303 2.1', 'Explain how legislation and codes of practice apply to own work role', 'In Progress', 'Assignment 5 · Q3', null, 'assignment.a5')] }] }] },
      { code: 'U304', title: 'Personal development in care settings', mods: [
        { code: 'M1', title: 'Reflective practice', ab: 'F/652/0401', los: [
          { code: 'LO1', title: 'Understand what is required for competence in own work role', type: 'Knowledge', crit: [
            c('304 1.1', 'Describe the duties and responsibilities of own work role', 'In Progress', 'Assignment 7 · Q1', null, 'assignment.a7'),
            c('304 1.2', 'Explain expectations about own work role as expressed in relevant standards', 'Achieved', 'Assignment 7 · Q2', -40, 'assignment.a7')] }] }] },
      { code: 'U305', title: 'Duty of care in care settings', mods: [
        { code: 'M1', title: 'Duty of care and dilemmas', ab: 'J/652/0501', los: [
          { code: 'LO1', title: 'Understand how duty of care contributes to safe practice', type: 'Knowledge', crit: [
            c('305 1.1', 'Explain what it means to have a duty of care in own work role', 'Not Started', null, null, 'assignment.a3'),
            c('305 1.2', 'Explain how duty of care relates to duty of candour', 'Not Started', null, null, 'assignment.a3'),
            c('305 2.1', 'Describe dilemmas that may arise between the duty of care and an individual\'s rights', 'Not Started', null, null, 'assignment.a3')] }] }] },
      { code: 'U306', title: 'Safeguarding and protection in care settings', mods: [
        { code: 'M1', title: 'Recognising and responding to abuse', ab: 'L/652/0601', los: [
          { code: 'LO1', title: 'Understand principles of safeguarding adults', type: 'Knowledge', crit: [
            c('306 1.1', 'Explain the term safeguarding', 'In Progress', 'Assignment 4 · Q1', null, 'assignment.a4'),
            c('306 1.2', 'Explain own role and responsibilities in safeguarding individuals', 'In Progress', 'Assignment 4 · Q2', null, 'assignment.a4'),
            c('306 2.1', 'Describe types of harm and abuse', 'Added to PD', 'Assignment 4 (earlier draft) · Q3', null, 'progress..pd')] },
          { code: 'LO3', title: 'Respond to suspected or disclosed abuse', type: 'Observation', crit: [
            c('306 3.1', 'Demonstrate actions to take if there are suspicions that an individual is being abused', 'Not Started', null, null, null, { o: 0, c: 0 })] }] }] },
      { code: 'U307', title: 'Health and safety in care settings', mods: [
        { code: 'M1', title: 'Safe working', ab: 'R/652/0701', los: [
          { code: 'LO1', title: 'Understand own responsibilities for health and safety', type: 'Knowledge', crit: [
            c('307 1.1', 'Identify legislation relating to general health and safety', 'Not Started', null, null, 'assignment.a6'),
            c('307 1.2', 'Describe the main points of health and safety policies and procedures', 'Not Started', null, null, 'assignment.a6')] }] }] },
    ];

    /* Assignments */
    const A0 = (html) => html;
    w.assignments = [
      { id: 'a1', title: 'Assignment 1 — Communication in care settings', unit: 'U301 · Module 1–2', due: D(-160, '22:59'), status: 'Completed', round: 'Sub 1', resubUsed: 0, resubMax: 2,
        crit: [['301 1.1', 'Identify the different reasons people communicate', 'Knowledge'], ['301 1.2', 'Explain how communication affects relationships', 'Knowledge'], ['301 3.1', 'Explain the meaning of confidentiality', 'Knowledge']],
        submittedAt: D(-162, '19:12:44'), timeline: [['Submitted', D(-162, '19:12')], ['Completed', D(-150)]],
        overall: 'A clear, well-organised piece of work, Aisha. Your examples from Willowbrook show real understanding of why communication matters to the people you support. All criteria met.', assessor: 'Sarah Okonkwo',
        qs: [
          { id: 'q1', text: 'Identify five different reasons people communicate in an adult care setting.', crit: '301 1.1', rounds: [{ at: D(-162, '19:12'), html: '<p>People communicate to express needs (for example asking for help with personal care), to share feelings, to build relationships, to give and receive information such as care plan updates at handover, and to make choices about their day.</p>' }], fb: [{ rag: 'G', text: 'Good range of reasons with relevant examples.', by: 'Sarah Okonkwo', at: D(-150, '10:20') }], state: 'met' },
          { id: 'q2', text: 'Explain how communication affects relationships with individuals, their families and colleagues.', crit: '301 1.2', rounds: [{ at: D(-162, '19:12'), html: '<p>Good communication builds trust. When I explain what I am about to do before supporting Mr K with a transfer, he is calmer and more willing to help. With families, regular updates reduce worry…</p>' }], fb: [{ rag: 'G', text: 'Well explained, with a strong workplace example.', by: 'Sarah Okonkwo', at: D(-150, '10:22') }], state: 'met' },
          { id: 'q3', text: 'Explain the meaning of confidentiality and describe how you maintain it day to day.', crit: '301 3.1', rounds: [{ at: D(-162, '19:12'), html: '<p>Confidentiality means only sharing personal information with people who need to know it to provide care, in line with UK GDPR and our policy. I never discuss residents in corridors and I log out of the care system when I step away.</p>' }], fb: [{ rag: 'G', text: 'Accurate and practical.', by: 'Sarah Okonkwo', at: D(-150, '10:25') }], state: 'met' }] },
      { id: 'a2', title: 'Assignment 2 — Person-centred practice', unit: 'U302 · Module 1', due: D(6, '21:59'), resubDue: D(6, '21:59'), status: 'Resubmission Required', round: 'Resub 1', resubUsed: 0, resubMax: 2,
        crit: [['302 1.1', 'Person-centred values in all aspects of care work', 'Knowledge'], ['302 1.2', 'Importance of finding out history, preferences, wishes and needs', 'Knowledge'], ['302 1.3', 'Using care plans to record history, preferences and wishes', 'Knowledge'], ['302 3.2', 'How risk-taking contributes to wellbeing', 'Knowledge']],
        submittedAt: D(-34, '20:41:09'), timeline: [['Submitted', D(-34, '20:41')], ['Feedback Received', D(-3, '15:10')]],
        overall: 'You clearly understand person-centred values (Q1 is excellent). Q3 and Q4 need more depth and workplace examples — please rework them. I have moved Q2 to your Professional Discussion, so you do not need to rewrite it.', assessor: 'Sarah Okonkwo',
        qs: [
          { id: 'q1', text: 'Describe how person-centred values should influence all aspects of care work.', crit: '302 1.1', rounds: [{ at: D(-34, '20:41'), html: '<p>Person-centred values — individuality, rights, choice, privacy, independence, dignity, respect and partnership — should shape everything I do. For example, I ask Mrs D which clothes she would like to wear rather than choosing for her…</p>' }], fb: [{ rag: 'G', text: 'Excellent — every value covered with an example.', by: 'Sarah Okonkwo', at: D(-3, '15:02') }], state: 'met' },
          { id: 'q2', text: "Explain how to use an individual's care plan to record their history, preferences, wishes and needs.", crit: '302 1.3', rounds: [{ at: D(-34, '20:41'), html: '<p>The care plan is where we write down what matters to the person. We update it at reviews.</p>' }], fb: [{ rag: 'A', text: 'Partly there. Rather than rework this, we will discuss how care plan reviews link to consent during your Professional Discussion.', by: 'Sarah Okonkwo', at: D(-3, '15:05') }], state: 'pd', pdReason: 'You explained care plan reviews well in class on 22 Sep. We will confirm the link between care plan reviews and consent in your Professional Discussion instead of a written rework.' },
          { id: 'q3', text: 'Explain the importance of finding out the history, preferences, wishes and needs of the individual. Give two examples from your workplace.', crit: '302 1.2', rounds: [{ at: D(-34, '20:41'), html: '<p>It is important so we give good care.</p>' }], fb: [{ rag: 'R', text: 'Not met. Explain why it matters (e.g. identity, wellbeing, trust, avoiding distress) and give two specific workplace examples.', by: 'Sarah Okonkwo', at: D(-3, '15:07') }], state: 'rework' },
          { id: 'q4', text: 'Analyse how risk-taking can contribute to the wellbeing of an individual.', crit: '302 3.2', rounds: [{ at: D(-34, '20:41'), html: '<p>Taking risks can make people feel more independent, for example going to the shop on their own.</p>' }], fb: [{ rag: 'A', text: 'Partially met. Good example — now analyse the balance between risk and wellbeing and mention how risk assessments support positive risk-taking.', by: 'Sarah Okonkwo', at: D(-3, '15:09') }], state: 'rework' }] },
      { id: 'a3', title: 'Assignment 3 — Duty of care', unit: 'U305 · Module 1', due: D(9, '21:59'), originalDue: D(5, '21:59'), status: 'Not Started', round: 'Sub 1', resubUsed: 0, resubMax: 2, briefUpdated: D(-2, '11:30'),
        briefChanges: ['Q3 now asks for one dilemma instead of two.', 'Word guidance changed from 300–500 to 250–400 words per answer.', 'Added the duty of candour factsheet to resources.'],
        crit: [['305 1.1', 'What it means to have a duty of care in own work role', 'Knowledge'], ['305 1.2', 'How duty of care relates to duty of candour', 'Knowledge'], ['305 2.1', "Dilemmas between duty of care and an individual's rights", 'Knowledge']],
        qs: [
          { id: 'q1', text: 'Explain what it means to have a duty of care in your own work role.', crit: '305 1.1', rounds: [], fb: [], state: 'open' },
          { id: 'q2', text: 'Explain how duty of care relates to the duty of candour.', crit: '305 1.2', rounds: [], fb: [], state: 'open' },
          { id: 'q3', text: "Describe one dilemma that may arise between the duty of care and an individual's rights, and how you would handle it.", crit: '305 2.1', rounds: [], fb: [], state: 'open' }] },
      { id: 'a4', title: 'Assignment 4 — Safeguarding scenarios', unit: 'U306 · Module 1', due: D(1, '21:59'), status: 'Submitted', round: 'Sub 1', resubUsed: 0, resubMax: 2,
        crit: [['306 1.1', 'Explain the term safeguarding', 'Knowledge'], ['306 1.2', 'Own role and responsibilities in safeguarding', 'Knowledge']],
        submittedAt: D(-1, '18:42:31'), timeline: [['Submitted', D(-1, '18:42')]],
        qs: [
          { id: 'q1', text: 'Explain the term safeguarding.', crit: '306 1.1', rounds: [{ at: D(-1, '18:42'), html: '<p>Safeguarding means protecting an adult\'s right to live in safety, free from abuse and neglect, while promoting their wellbeing and taking their views into account (Care Act 2014).</p>' }], fb: [], state: 'open' },
          { id: 'q2', text: 'Explain your own role and responsibilities in safeguarding individuals.', crit: '306 1.2', rounds: [{ at: D(-1, '18:42'), html: '<p>My role is to recognise signs of abuse, report concerns to the safeguarding lead without delay, record facts accurately and never investigate myself.</p>' }], fb: [], state: 'open' }] },
      { id: 'a5', title: 'Assignment 5 — Equality and inclusion', unit: 'U303 · Module 1', due: D(-20, '21:59'), status: 'Feedback Received', round: 'Sub 1', resubUsed: 0, resubMax: 2,
        crit: [['303 1.1', 'Diversity, equality, inclusion and discrimination', 'Knowledge'], ['303 1.2', 'Effects of discrimination', 'Knowledge'], ['303 2.1', 'Legislation and codes of practice', 'Knowledge']],
        submittedAt: D(-21, '21:15:02'), timeline: [['Submitted', D(-21, '21:15')], ['Feedback Received', D(-2, '12:00')]],
        overall: 'Strong work throughout. Your reference to the Equality Act 2010 is accurate and well applied. Marking will be finalised after internal checks.', assessor: 'Sarah Okonkwo',
        coord: { by: 'Dr Helen Carter', at: D(-1, '09:40'), text: 'Aisha, well done on keeping pace this term. For Unit 304, try keeping a short reflective log each week — it will make your Professional Discussion much easier.' },
        qs: [
          { id: 'q1', text: 'Explain what is meant by diversity, equality, inclusion and discrimination.', crit: '303 1.1', rounds: [{ at: D(-21, '21:15'), html: '<p>Diversity recognises that everyone is different… Equality means fair treatment and equal opportunities… Inclusion means people feel valued and take part… Discrimination is treating someone unfairly because of a protected characteristic.</p>' }], fb: [{ rag: 'G', text: 'Clear definitions.', by: 'Sarah Okonkwo', at: D(-2, '11:50') }], state: 'met' },
          { id: 'q2', text: 'Describe the effects of discrimination.', crit: '303 1.2', rounds: [{ at: D(-21, '21:15'), html: '<p>Discrimination can cause low self-esteem, isolation, anxiety and poorer health outcomes. It also affects families and the wider team culture.</p>' }], fb: [{ rag: 'G', text: 'Good — covers individuals and others.', by: 'Sarah Okonkwo', at: D(-2, '11:52') }], state: 'met' },
          { id: 'q3', text: 'Explain how legislation and codes of practice relating to equality apply to your work role.', crit: '303 2.1', rounds: [{ at: D(-21, '21:15'), html: '<p>The Equality Act 2010 protects nine characteristics. The Code of Conduct for Healthcare Support Workers requires me to promote equality and respect…</p>' }], fb: [{ rag: 'G', text: 'Accurate and applied to your role.', by: 'Sarah Okonkwo', at: D(-2, '11:55') }], state: 'met' }] },
      { id: 'a6', title: 'Assignment 6 — Health and safety', unit: 'U307 · Module 1', due: D(-3, '21:59'), status: 'Not Started', round: 'Sub 1', resubUsed: 0, resubMax: 2, closed: true,
        crit: [['307 1.1', 'Legislation relating to general health and safety', 'Knowledge'], ['307 1.2', 'Main points of health and safety policies', 'Knowledge']],
        qs: [{ id: 'q1', text: 'Identify legislation relating to general health and safety in a care setting.', crit: '307 1.1', rounds: [], fb: [], state: 'open' }, { id: 'q2', text: 'Describe the main points of health and safety policies and procedures agreed with your employer.', crit: '307 1.2', rounds: [], fb: [], state: 'open' }] },
      { id: 'a7', title: 'Assignment 7 — Personal development', unit: 'U304 · Module 1', due: D(-5, '21:59'), status: 'Submitted', round: 'Resub 2', resubUsed: 2, resubMax: 2, limit: true,
        crit: [['304 1.1', 'Duties and responsibilities of own work role', 'Knowledge'], ['304 1.2', 'Expectations about own work role in standards', 'Knowledge']],
        submittedAt: D(-6, '20:05:47'), timeline: [['Submitted', D(-70, '19:00')], ['Feedback Received', D(-55)], ['Resubmitted (1)', D(-41, '20:30')], ['Feedback Received', D(-25)], ['Resubmitted (2)', D(-6, '20:05')]],
        overall: 'Q2 is now met. Q1 still needs work after two resubmissions.', assessor: 'Sarah Okonkwo',
        qs: [
          { id: 'q1', text: 'Describe the duties and responsibilities of your own work role.', crit: '304 1.1', rounds: [
            { at: D(-70, '19:00'), html: '<p>I help residents with their care.</p>' },
            { at: D(-41, '20:30'), html: '<p>As a senior care assistant I support residents with personal care, medicines and activities, and I lead the shift handover.</p>' },
            { at: D(-6, '20:05'), html: '<p>My duties include personal care, administering medicines under the MAR process, leading handovers, supervising two care assistants and reporting concerns to the nurse in charge. My job description sets out…</p>' }],
            fb: [{ rag: 'R', text: 'Too brief — list duties from your job description.', by: 'Sarah Okonkwo', at: D(-55) }, { rag: 'A', text: 'Better. Link duties to responsibilities and accountability.', by: 'Sarah Okonkwo', at: D(-25) }], state: 'limit' },
          { id: 'q2', text: 'Explain expectations about your work role as expressed in relevant standards.', crit: '304 1.2', rounds: [
            { at: D(-70, '19:00'), html: '<p>The Care Certificate and the Code of Conduct.</p>' },
            { at: D(-41, '20:30'), html: '<p>The Code of Conduct for Healthcare Support Workers sets seven principles, including being accountable and promoting privacy and dignity. CQC fundamental standards also apply…</p>' }],
            fb: [{ rag: 'R', text: 'Name the standards and explain the expectations.', by: 'Sarah Okonkwo', at: D(-55) }, { rag: 'G', text: 'Met.', by: 'Sarah Okonkwo', at: D(-25) }], state: 'met' }] },
    ];
    w.assignments.forEach(a => { a.course = 'nvq'; a.brief = a.brief || `<p>This assignment covers the criteria listed below. Answer every question in your own words, using examples from your workplace where asked. Do not include residents' real names — use initials.</p><p>Reference any legislation or guidance you use. Your assessor will give feedback on each answer separately.</p>`; a.rules = 'PDF, DOCX, JPG or PNG · max 10 MB per file · up to 5 files'; a.resources = [['Assignment template (DOCX)', 'doc'], ['Guidance: writing reflective accounts (PDF)', 'doc']]; });
    if (v === 'D') w.assignments.forEach(a => { a.title = a.title.replace(/—.*/, m => m); });

    /* Professional Discussion */
    w.pd = {
      items: [
        { ref: '302 1.3', unit: 'U302', from: 'Assignment 2 · Q2', reason: w.assignments[1].qs[1].pdReason, status: 'Open', go: 'assignment.a2' },
        { ref: '306 2.1', unit: 'U306', from: 'Assignment 4 (earlier draft) · Q3', reason: 'Types of harm were covered fully in the safeguarding workshop on 15 Sep. We will confirm your understanding verbally.', status: 'Open', go: 'assignment.a4' },
        { ref: '301 3.2', unit: 'U301', from: 'Assignment 1 · Q3', reason: 'Confirmed verbally during the interim review on 12 Jun.', status: 'Achieved', go: 'assignment.a1' },
        { ref: '304 2.2', unit: 'U304', from: 'Assignment 7 · Q3', reason: 'Not enough evidence given during the interim discussion. Returned to written evidence.', status: 'Returned to Action Required', go: 'assignment.a7' },
      ],
      session: { status: 'Proposed', at: D(10, '09:00'), mode: 'In person', loc: 'Illumin Academy Leicester, Room 2, 5 Charles Street, Leicester LE1 1FB', zoom: 'https://zoom.example/j/84422019311', with: 'Sarah Okonkwo' },
      history: [{ from: D(3, '13:00'), to: D(10, '09:00'), by: 'Academy', reason: 'Assessor availability changed', at: D(-4) }, { from: D(-5, '13:00'), to: D(3, '13:00'), by: 'You', reason: 'Night shift clash — requested a weekday morning', at: D(-12) }],
    };
    w.plan = [
      { id: 'p1', action: 'Resubmit Q3 and Q4 of Assignment 2', crit: '302 1.2, 302 3.2', target: D(6), src: 'Assessor recommendation', done: false, go: 'assignment.a2' },
      { id: 'p2', action: 'Start Assignment 3 — Duty of care', crit: '305 1.1–2.1', target: D(9), src: 'System', done: false, go: 'assignment.a3' },
      { id: 'p3', action: 'Observation pending — confirm the date with your workplace', crit: '301 2.2, 301 2.3, 306 3.1', target: D(8), src: 'System', done: false, go: 'observations' },
      { id: 'p4', action: 'PD item — no rework needed. Prepare examples about care plan reviews and consent', crit: '302 1.3', target: D(10), src: 'Assessor recommendation', done: false, go: 'progress..pd' },
      { id: 'p5', action: 'Read the duty of candour factsheet', crit: '305 1.2', target: D(4), src: 'Assessor recommendation', done: true, go: 'resources' },
    ];

    /* Workplace + observations */
    w.workplace = {
      perm: v === 'D' ? 'Permission Pending' : 'Granted', name: v === 'D' ? 'Addington Court Nursing Home (demo)' : 'Willowbrook Care Home (demo)', address: v === 'D' ? '118 Demo Road, Croydon' : '22 Demo Road, Leicester', postcode: v === 'D' ? 'ZZ99 2AA' : 'ZZ99 2AB',
      ctitle: 'Manager', cname: v === 'D' ? 'Mr Daniel Fraser' : 'Mrs Joanne Whitley', cemail: v === 'D' ? 'd.fraser@addingtoncourt.example' : 'j.whitley@willowbrookcare.example', cphone: v === 'D' ? '020 7946 0518' : '0113 496 0732',
      role: v === 'D' ? 'Care Assistant' : 'Senior Care Assistant', shift: v === 'D' ? 'Nights — 3 on / 4 off (20:00–08:00)' : 'Days — 4 on / 3 off (07:30–19:30)',
      sent: D(-6), expiry: D(8), reminder: v === 'D' ? 'Reminder sent 2 Oct · escalated to the Academy on 3 Oct' : null, grantedAt: D(-240), grantedBy: 'Mrs Joanne Whitley', declineReason: 'We cannot host observations during the current CQC inspection period. Please try again after 1 November.',
      history: [{ name: 'Ashfield Lodge Residential Home (demo)', from: '12 Jan 2026', to: '20 Feb 2026', perm: 'Granted', by: 'Ms Carol Dunn' }],
    };
    w.observations = [
      { id: 'o1', at: D(8, '08:30'), loc: w.workplace.name, assessor: 'James Pryce', scope: 'U301 2.2, 2.3 · U306 3.1', status: 'Proposed' },
      { id: 'o2', at: D(3, '13:00'), loc: w.workplace.name, assessor: 'James Pryce', scope: 'U302 2.1, 2.4', status: 'Confirmed' },
      { id: 'o3', at: D(-82, '09:00'), loc: w.workplace.name, assessor: 'James Pryce', scope: 'U301 2.1, 2.2', status: 'Completed', postEntered: D(-80), signed: D(-80, '16:42'), ack: false,
        report: { nvq: [['301 2.1', "Find out an individual's communication needs", 1, 1, 'Checked the care plan, then asked Mr K how he preferred to be addressed and used his hearing aid correctly.'], ['301 2.2', 'Demonstrate communication methods that meet needs', 1, 0, 'Good use of picture cards. Spoke too quickly at lunch — next time check understanding.']],
          ia: [['IA-1', 'Arrives on time and in uniform as per workplace policy', 1, 1, 'Yes.'], ['IA-2', 'Maintains confidentiality during the observation', 1, 1, 'Handover notes kept face down.'], ['IA-3', 'Follows infection prevention procedures', 1, 1, 'Hand hygiene before and after support.']],
          notes: 'A confident observation. Follow-up booked to see 301 2.2 again with a different resident.', followUp: 'o1' } },
      { id: 'o4', at: D(-20, '09:00'), loc: w.workplace.name, assessor: 'James Pryce', scope: 'U302 2.1', status: 'Cancelled', reason: 'Assessor unwell. Cancelled by the Academy on ' + fd(D(-21)) + '. Rescheduled to ' + fd(D(3)) + '.' },
      { id: 'o5', at: D(-50, '09:00'), newAt: D(-45, '13:00'), loc: w.workplace.name, assessor: 'James Pryce', scope: 'U301 2.1 (pre-visit)', status: 'Rescheduled', reason: 'Workplace requested an afternoon slot.' },
    ];
    w.iaCriteria = [['IA-1', 'Arrives on time and in uniform as per workplace policy'], ['IA-2', 'Maintains confidentiality throughout'], ['IA-3', 'Follows infection prevention and control procedures'], ['IA-4', 'Communicates respectfully with colleagues and visitors']];

    /* Admission */
    const B = v === 'B';
    w.admission = {
      status: B ? 'Sign-up in progress' : 'Approved', reviewer: 'Rachel Hughes (Admissions)',
      history: B ? [['Sign-up started', D(-12, '10:15')], ['Details and intake confirmed', D(-12, '10:20')]] : [['Sign-up started', D(-300)], ['Sign-up complete', D(-296)], ['Under Review', D(-290)], ['Approved', D(-283)]],
      deposit: { min: amt(300), paid: !B, paidAt: D(-280), holdUntil: B ? null : D(-252), balance: amt(2100) },
      batch: w.nvq.batch, batchStart: w.nvq.batchStart,
      rejectReason: 'Your application does not meet the entry requirement of current employment in an adult care role (at least 16 hours a week). You can re-apply once you are in a qualifying role.',
    };
    const doc = (id, name, mand, status, extra = {}) => ({ id, name, mand, status, formats: 'PDF, JPG or PNG', max: '5 MB', ...extra });
    w.docs = [
      doc('d1', B ? 'Passport' : 'Passport or UK photo driving licence', true, 'Approved', { guide: 'The photo page, all four corners visible.', uploaded: D(-12, '10:31'), file: 'passport_raman.pdf', versions: [['passport_raman.pdf', D(-12, '10:31'), 'Approved']] }),
      doc('d2', B ? 'Emirates ID and residence visa' : 'Right to work (share code letter)', true, 'Approved', { guide: B ? 'Both sides of your Emirates ID and the visa page.' : 'Download your share code letter from GOV.UK.', uploaded: D(-12, '10:40'), file: B ? 'emirates_id.pdf' : 'rtw_sharecode.pdf', expires: D(21), versions: [[B ? 'emirates_id.pdf' : 'rtw_sharecode.pdf', D(-12, '10:40'), 'Approved']] }),
      doc('d3', 'Proof of address (last 3 months)', true, B ? 'Rejected' : 'Approved', { guide: 'Utility bill, council tax or bank statement dated within the last 3 months.', uploaded: D(-11, '19:02'), file: 'dewa_bill_may.pdf', reason: 'This bill is dated May 2026, which is older than 3 months. Upload a bill or bank statement dated after 4 July 2026 that shows your full name and address.', reviewer: 'Rachel Hughes', versions: [['dewa_bill_may.pdf', D(-11, '19:02'), 'Rejected']] }),
      doc('d4', B ? 'Police clearance certificate' : 'Enhanced DBS certificate', true, B ? 'Resubmission Required' : 'Approved', { guide: 'All pages, issued within the last 12 months.', uploaded: D(-11, '19:10'), file: 'police_clearance_p1.jpg', reason: 'Only page 1 was uploaded. Upload all pages together as a single PDF.', reviewer: 'Rachel Hughes', expires: D(200), versions: [['police_clearance_p1.jpg', D(-11, '19:10'), 'Resubmission Required']] }),
      doc('d5', 'Highest qualification certificate', true, B ? 'Submitted' : 'Approved', { guide: 'For example GCSE English, a Level 2 diploma or a degree certificate.', uploaded: D(-2, '21:15'), file: 'bsc_certificate.pdf', versions: [['bsc_certificate.pdf', D(-2, '21:15'), 'Awaiting review']] }),
      doc('d6', 'CV', true, B ? 'Pending' : 'Approved', { formats: 'PDF or DOCX', guide: 'Include your care experience from the last 5 years.', versions: [] }),
      doc('d7', 'Employer reference letter', false, 'Pending', { formats: 'PDF', guide: 'Optional. Speeds up the review if you are currently employed in care.', versions: [] }),
    ];
    // CH-07: the sign-up record — B is on step 2 (documents); the others signed up before they started
    const code = w.nvq.batch.split(' — ')[1];
    w.signup = B ? { step: 2, done: false, batch: code } : { step: 5, done: true, batch: code, sig: { name: me.first + ' ' + me.last, at: D(-297, '19:05'), ip: '86.12.44.201', v: 1 }, pay: flags.sponsored ? null : { opt: 'deposit', method: 'card', amount: amt(300), at: D(-296, '18:30'), status: 'Paid', ref: 'TXN-70419' } };
    if (!B) w.docs.forEach(d => { if (d.status === 'Approved') { d.versions = d.versions.length ? d.versions.map(x => [x[0], x[1], 'Approved']) : [[d.name.toLowerCase().replace(/\W+/g, '_') + '.pdf', D(-295), 'Approved']]; d.uploaded = d.uploaded || D(-295); } });
  } else { w.docs = []; }

  /* ---------- Payments ---------- */
  const p = [];
  if (flags.nvq && !flags.sponsored && v !== 'B') { // CH-07: B's fee schedule starts when she pays in step 4 of her sign-up
    const rows = [
      { n: 1, amount: amt(350), due: D(-200), status: 'Paid', paid: amt(350) }, { n: 2, amount: amt(350), due: D(-140), status: 'Paid', paid: amt(350) },
      { n: 3, amount: amt(350), due: D(-80), status: 'Paid', paid: amt(350) }, { n: 4, amount: amt(350), due: D(-45), status: 'Partially paid', paid: amt(150) },
      { n: 5, amount: amt(350), due: D(-15), status: 'Overdue', paid: 0 }, { n: 6, amount: amt(350), due: D(15), status: 'Pending', paid: 0 }];
    p.push({ e: 'nvq', title: w.nvq.title, plan: 'Instalments', total: amt(2400), partial: true, deposit: { amount: amt(300), status: 'Paid', paidAt: D(-280), hold: D(-252) }, rows });
  }
  w.enrolments.filter(e => e.kind === 'short').forEach(e => {
    if (flags.sponsored) return;
    if (e.id === 'cc') p.push({ e: 'cc', title: e.title, plan: 'Instalments', total: e.price, partial: false, linkExpired: true, rows: [{ n: 1, amount: amt(60), due: D(-20), status: 'Paid', paid: amt(60) }, { n: 2, amount: amt(60), due: D(5), status: 'Pending', paid: 0 }, { n: 3, amount: amt(60), due: D(35), status: 'Pending', paid: 0 }] });
    else if (e.id === 'fire') p.push({ e: 'fire', title: e.title, plan: 'One-time', total: e.price, pendingConfirm: true, rows: [{ n: 1, amount: e.price, due: D(0), status: 'Pending', paid: 0, confirming: true }] });
    else p.push({ e: e.id, title: e.title, plan: 'One-time', total: e.price, rows: [{ n: 1, amount: e.price, due: e.enrolled, status: 'Paid', paid: e.price }] });
  });
  p.forEach(pl => pl.rows.forEach(r => { if (r.status === 'Paid' || r.status === 'Partially paid') r.receipt = 'RCP-' + (26000 + Math.floor(Math.abs(new Date(r.due)) / 1e7 % 9999)); }));
  w.plans = p;
  w.tx = flags.sponsored ? [] : [
    ...(flags.nvq && v !== 'B' ? [[D(-45, '12:10'), 'TXN-88213', 'Visa •••• 4417', amt(150), 'Succeeded', 'NVQ instalment 4 (part payment)'], [D(-80, '09:02'), 'TXN-86120', 'Visa •••• 4417', amt(350), 'Succeeded', 'NVQ instalment 3'], [D(-140, '08:55'), 'TXN-81003', 'Visa •••• 4417', amt(350), 'Succeeded', 'NVQ instalment 2'], [D(-280, '18:30'), 'TXN-70419', 'Visa •••• 4417', amt(300), 'Succeeded', 'NVQ deposit']] : []),
    ...(flags.nvq ? [] : [[D(0, '07:58'), 'TXN-90017', 'Mastercard •••• 2290', amt(29), 'Payment Pending', 'Fire Safety Awareness'],
    [D(-1, '20:14'), 'TXN-89990', 'Mastercard •••• 2290', amt(60), 'Failed', 'Care Certificate instalment 2 — card declined'],
    [D(-30, '10:00'), 'RFD-11402', 'Mastercard •••• 2290', -amt(49), 'Refunded', 'Refund against TXN-84410 (Medication Awareness duplicate)'],
    [D(-60, '09:41'), 'TXN-84410', 'Mastercard •••• 2290', amt(49), 'Succeeded', 'Medication Awareness']]),
    [D(-40, '19:22'), 'TXN-85002', 'Apple Pay', amt(45), 'Succeeded', 'Moving and Handling People — 2026'],
  ].map(r => ({ at: r[0], ref: r[1], method: r[2], amount: r[3], status: r[4], desc: r[5] }));

  /* ---------- Certificates ---------- */
  w.certs = [
    { id: 'c1', course: 'Moving and Handling People', no: 'WEL-2025-04127', issued: D(-342), expires: D(25), status: 'Expiring soon', enrol: 'mh25', renew: true },
    { id: 'c2', course: 'Food Hygiene Level 2', no: 'WEL-2025-03310', issued: D(-210), expires: null, status: 'Valid' },
    { id: 'c3', course: 'First Aid Awareness', no: 'WEL-2024-01772', issued: D(-800), expires: D(-70), status: 'Expired', renew: true },
    { id: 'c4', course: 'Equality, Diversity and Inclusion', no: 'WEL-2026-02051', issued: D(-120), expires: D(245), status: 'Revoked', revoked: 'Revoked on ' + fd(D(-100)) + ': issued in error after a quiz record was corrected.' },
    { id: 'c5', course: 'Safeguarding Adults Level 2', no: 'WEL-2026-02219', issued: D(-88), expires: D(277), status: 'Valid', supersedes: 'WEL-2026-01880', lineage: [['WEL-2026-01880', D(-95), 'Replaced — name corrected'], ['WEL-2026-02219', D(-88), 'Current']] },
    { id: 'c6', course: 'Dementia Awareness', no: '—', issued: null, expires: null, status: 'Processing', enrol: 'dem' },
  ];
  if (v === 'B') w.certs = w.certs.filter(c => ['c2', 'c6'].includes(c.id));
  if (v === 'D') w.certs = w.certs.filter(c => ['c2', 'c3', 'c5'].includes(c.id));
  if (v === 'C') w.certs = w.certs.filter(c => c.id !== 'c6');

  /* ---------- Requests ---------- */
  w.requests = [
    { id: 'R-1042', type: 'Extra quiz attempts', target: 'Basic Life Support and Anaphylaxis', mid: 'm1', module: 'Basic life support and using an AED', raised: D(-4, '21:02'), status: 'Granted', decided: D(-1, '10:15'), reason: 'I failed by 5% on attempt 3 after a night shift. I have re-watched all videos.', decision: 'Granted: +3 attempts. Please re-watch the AED scenario first.', grant: '+3 attempts' },
    { id: 'R-1051', type: 'More time on course', target: 'Infection Prevention and Control', raised: D(-2, '18:40'), status: 'Requested', reason: 'I was off sick for three weeks in September (fit note attached).', decision: null },
    { id: 'R-1013', type: 'Profile change', target: 'Mobile number', raised: D(-30, '12:00'), status: 'Approved', decided: D(-29, '09:30'), reason: 'New phone contract.', decision: 'Approved. Mobile updated to the new number.', grant: 'Field updated' },
    { id: 'R-0998', type: 'Profile change', target: 'Full name', raised: D(-50, '08:12'), status: 'Rejected', decided: D(-47, '14:20'), reason: 'Add middle name.', decision: 'Rejected: the ID provided does not show the middle name. Upload a passport or driving licence that shows it.' },
    { id: 'R-0960', type: 'Extra quiz attempts', target: 'Moving and Handling People — 2025', mid: 'm1', module: 'The law and your responsibilities', raised: D(-345, '20:00'), status: 'Re-purchase Required', decided: D(-344), reason: 'Ran out of attempts.', decision: 'This course has already had one extension. Please re-purchase the course to continue.' },
    { id: 'R-0911', type: 'More time on course', target: 'The Care Certificate (15 Standards)', raised: D(-15), status: 'Granted', decided: D(-14), reason: 'Moved house.', decision: 'Granted: +14 days.', grant: '+14 days, new end date ' + fd(D(160)) },
  ];
  if (v === 'B' || v === 'D') w.requests = w.requests.filter(r => r.type === 'Profile change');

  /* ---------- Messages ---------- */
  const T = (id, subject, course, wth, unread, msgs) => ({ id, subject, course, with: wth, unread, msgs });
  w.threads = [
    ...(flags.nvq && flags.admitted ? [
      T('t1', 'Assignment 2 — feedback questions', 'NVQ', ['Sarah Okonkwo (Assessor)'], true, [
        { me: true, from: 'You', at: D(-2, '18:10'), text: 'Hi Sarah, for Q3 should my two examples be from different residents?' },
        { me: false, from: 'Sarah Okonkwo', at: D(-1, '08:45'), text: 'Hi Aisha — yes please, two different people, using initials only. Explain why knowing their history changed what you did.' },
        { me: false, from: 'Sarah Okonkwo', at: D(0, '07:30'), text: "I've attached an example structure you can use.", att: 'Q3_example_structure.pdf' }]),
      T('t2', 'Observation on ' + fds(D(8, '08:30')), 'NVQ', ['James Pryce (Assessor)'], true, [
        { me: false, from: 'James Pryce', at: D(-1, '15:00'), text: 'I have proposed an observation for the morning shift. Please confirm or suggest an alternative.' }]),
      T('t3', 'Class recording — Unit 306', 'NVQ', ['Marcus Bell (Teacher)'], false, [
        { me: true, from: 'You', at: D(-8, '19:00'), text: 'I missed the last 20 minutes due to a shift. Is there a recording?' },
        { me: false, from: 'Marcus Bell', at: D(-7, '09:15'), text: "Yes — it's in Learning Resources under Unit 306." }]),
      T('t4', 'Progress check-in', 'NVQ', ['Dr Helen Carter (Academic Coordinator)'], false, [
        { me: false, from: 'Dr Helen Carter', at: D(-15, '11:00'), text: 'You are on track overall. Let us know if shift patterns make the PD date difficult.' }])] : []),
    T('t5', 'Instalment payment question', 'Academic Admin', ['Academic Admin — Rachel Hughes'], !flags.nvq, [
      { me: true, from: 'You', at: D(-3, '20:30'), text: 'My card was declined for the instalment — can I pay by bank transfer?' },
      { me: false, from: 'Rachel Hughes', at: D(-2, '10:05'), text: 'You can retry with another card from Payments. Bank transfer is available for amounts over £500.00 only.' }]),
    T('t6', 'Quiz attempts — Basic Life Support', 'Short courses', ['Academic Admin — Rachel Hughes'], false, [
      { me: false, from: 'Rachel Hughes', at: D(-1, '10:16'), text: 'Your request R-1042 has been granted. You now have 3 more attempts.' }]),
  ];
  w.announcements = [
    { id: 'n1', title: 'Academy closed 25–26 December', from: 'Illumin Academy', kind: 'Academy', at: D(-3), pinned: true, body: 'The Academy office and support lines are closed on 25 and 26 December. Assignment deadlines are not affected.' },
    ...(flags.nvq ? [{ id: 'n2', title: 'Unit 306 class recording uploaded', from: 'Marcus Bell', kind: 'Teacher', at: D(-7), body: 'The recording and slides from Tuesday\'s safeguarding class are now in Learning Resources.', att: 'U306_safeguarding_slides.pdf' }] : []),
    ...(flags.sponsored ? [{ id: 'n3', title: 'Book your observation shifts with the rota team', from: 'BrightCare Staffing Ltd (demo)', kind: 'Agency', at: D(-5), body: 'If your observation falls on a non-working day, contact the BrightCare rota team at least 72 hours before.' }] : []),
    { id: 'n4', title: 'New CPD course: Oral Health in Care Homes', from: 'Illumin Academy', kind: 'Academy', at: D(-10), body: 'A new 90-minute course is now in the catalogue.' },
    { id: 'n5', title: 'Planned maintenance — 14 September', from: 'Illumin Academy', kind: 'Academy', at: D(-25), expired: true, body: 'The portal was unavailable between 22:00 and 23:30.' },
  ];

  /* ---------- Notifications (every learner event) ---------- */
  const N = (cat, title, body, d, go, unread = false) => ({ cat, title, body, at: typeof d === 'number' ? D(d, '08:00') : d, go, unread });
  const all = [
    N('Assignments', 'Feedback returned — Assignment 2', 'Sarah Okonkwo returned feedback. 2 questions need rework.', D(-3, '15:10'), 'assignment.a2', true),
    N('Assignments', 'Resubmission requested — Assignment 2', 'Resubmission 1 of 2 is due ' + fdt(D(6, '21:59')) + '.', D(-3, '15:11'), 'assignment.a2', true),
    N('Assignments', 'Item added to Professional Discussion', 'Assignment 2 · Q2 (302 1.3) — no rework needed.', D(-3, '15:12'), 'progress..pd', true),
    N('Schedule', 'Observation proposed', 'James Pryce proposed an observation on ' + fdt(D(8, '08:30')) + '.', D(-1, '15:00'), 'observations', true),
    N('Schedule', 'Live class starts soon — join link', 'Unit 306 workshop starts at ' + ft(D(0, '08:25')) + '. Join with your registered email.', D(0, '08:10'), 'calendar', true),
    N('Payments', 'Instalment overdue', 'Instalment 5 (' + money(amt(350), cur) + ') was due ' + fd(D(-15)) + '.', D(-1), 'payments', true),
    N('Requests', 'Request decided — extra quiz attempts', 'R-1042 granted: +3 attempts on Basic Life Support.', D(-1, '10:15'), 'requests', true),
    N('Certificates', 'Certificate processing', 'Your Dementia Awareness certificate is being generated.', D(0, '07:41'), 'certificates', false),
    N('Assignments', 'Coordinator feedback posted', 'Dr Helen Carter added feedback to Assignment 5.', D(-1, '09:40'), 'assignment.a5', false),
    N('Assignments', 'Brief changed — Assignment 3', 'The brief was updated. See what changed.', D(-2, '11:30'), 'assignment.a3', false),
    N('Assignments', 'Deadline extension granted', 'Assignment 3 extended to ' + fdt(D(9, '21:59')) + '.', D(-2, '11:32'), 'assignment.a3', false),
    N('Assignments', 'Deadline reminder — 1 day', 'Assignment 4 is due tomorrow at ' + ft(D(1, '21:59')) + '.', D(0, '06:00'), 'assignment.a4', false),
    N('Assignments', 'Deadline reminder — 3 days', 'Assignment 6 is due in 3 days.', D(-6), 'assignment.a6', false),
    N('Assignments', 'Deadline reminder — 7 days', 'Assignment 3 is due in 7 days.', D(-2), 'assignment.a3', false),
    N('Assignments', 'Assignment published', 'Assignment 3 — Duty of care is now open.', D(-12), 'assignment.a3', false),
    N('Assignments', 'Quiz auto-submitted', 'Time ran out on Basic Life Support attempt 3. Your answers were submitted automatically.', D(-5, '20:31'), 'course.bls.quiz', false),
    N('Schedule', 'PD session scheduled', 'Professional Discussion proposed for ' + fdt(D(10, '09:00')) + '.', D(-4), 'progress..pd', false),
    N('Schedule', 'PD session postponed', 'Your PD session on ' + fd(D(3)) + ' has moved to ' + fd(D(10)) + '.', D(-4, '09:01'), 'progress..pd', false),
    N('Schedule', 'Observation revised', 'The time of your observation on ' + fd(D(3)) + ' changed to ' + ft(D(3, '13:00')) + '.', D(-10), 'observations', false),
    N('Schedule', 'Observation confirmed', 'Observation on ' + fdt(D(3, '13:00')) + ' is confirmed.', D(-9), 'observations', false),
    N('Schedule', 'Observation cancelled', 'Observation on ' + fd(D(-20)) + ' was cancelled.', D(-21), 'observations', false),
    N('Schedule', 'Workplace permission granted', 'Mrs Joanne Whitley granted permission for observations.', D(-240), 'observations', false),
    N('Schedule', 'Workplace permission declined', 'Ashfield Lodge declined permission (historic).', D(-230), 'observations', false),
    N('Schedule', 'Workplace permission link expired', 'The permission link to your workplace expired without a reply.', D(-232), 'observations', false),
    N('Schedule', 'Schedule changed', 'Thursday\'s class moved from 17:00 to 18:00.', D(-1), 'calendar', false),
    N('Schedule', 'Content unlocked', 'Unit 307 resources are now available.', D(-14), 'resources', false),
    N('Schedule', 'Batch assigned', 'You have been placed in ' + (w.nvq ? w.nvq.batch : 'a batch') + '.', D(-283), 'course.nvq', false),
    N('Schedule', 'Batch cancelled', 'A previous batch was cancelled (example).', D(-300), 'admission', false),
    N('Payments', 'Payment receipt', 'Receipt RCP for ' + money(amt(45), cur) + ' — Moving and Handling People.', D(-40, '19:23'), 'payments', false),
    N('Payments', 'Payment failed', 'Your card was declined for Care Certificate instalment 2.', D(-1, '20:14'), 'payments', false),
    N('Payments', 'Payment pending resolved', 'Your payment for Basic Life Support was confirmed.', D(-25), 'payments', false),
    N('Payments', 'Instalment due', 'Care Certificate instalment 2 is due in 5 days.', D(0, '06:00'), 'payments', false),
    N('Payments', 'Access paused', 'Access to NVQ content was paused for an overdue instalment (example).', D(-120), 'payments', false),
    N('Payments', 'Access restored — new due date', 'Access restored until ' + fd(D(14)) + ' (example).', D(-118), 'payments', false),
    N('Payments', 'Refund processed', 'Refund of ' + money(amt(49), cur) + ' against TXN-84410.', D(-30, '10:00'), 'payments', false),
    N('Enrolment', 'Enrolment discontinued', 'Medication Awareness was discontinued.', D(-32), 'course.med', false),
    N('Enrolment', 'Enrolment reactivated', 'Basic Life Support was reactivated after payment.', D(-24), 'course.bls', false),
    N('Enrolment', 'Seat assigned by agency', 'BrightCare Staffing Ltd (demo) assigned you a seat (example).', D(-214), 'courses', false),
    N('Certificates', 'Certificate issued', 'Safeguarding Adults Level 2 certificate issued.', D(-88), 'certificates', false),
    N('Certificates', 'Certificate revoked', 'Equality, Diversity and Inclusion certificate was revoked.', D(-100), 'certificates', false),
    N('Certificates', 'Certificate expiring in 30 days', 'Moving and Handling People expires on ' + fd(D(25)) + '.', D(-5), 'certificates', false),
    N('Certificates', 'Certificate expiring in 15 days', '(example — will be sent ' + fd(D(10)) + ')', D(-60), 'certificates', false),
    N('Certificates', 'Certificate expiring in 7 days', '(example)', D(-61), 'certificates', false),
    N('Admission', 'Admission status changed', 'Your application is now: ' + (flags.nvq ? (w.admission.status) : 'Approved') + '.', D(-11), 'admission', v === 'B'),
    N('Admission', 'Document rejected', 'Proof of address was rejected. See the reason.', D(-10), 'admission', v === 'B'),
    N('Admission', 'Resubmission required — document', 'Police clearance / DBS: upload all pages.', D(-10, '08:05'), 'admission', v === 'B'),
    N('Admission', 'Document approved', 'Passport approved.', D(-11, '09:00'), 'admission', false),
    N('Admission', 'Document expiring', 'Your right-to-work document expires in 21 days.', D(-1, '07:00'), 'admission', false),
    N('Requests', 'Request decided — more time', 'R-0911 granted: +14 days on the Care Certificate.', D(-14), 'requests', false),
    N('Requests', 'Request decided — profile change', 'R-1013 approved: mobile number updated.', D(-29), 'requests', false),
    N('Account', 'Verify your email', 'Confirm your email address to activate your account.', D(-400), 'profile', false),
    N('Account', 'Welcome to Illumin Academy', 'Your account is ready.', D(-399), 'dashboard', false),
    N('Account', 'Password reset', 'Your password was changed. If this wasn\'t you, contact the Academy.', D(-90), 'profile..security', false),
    N('Other', 'New announcement', 'Academy closed 25–26 December.', D(-3), 'messages..announcements', false),
  ];
  const isNvqItem = n => (n.cat === 'Assignments' && !n.title.startsWith('Quiz')) || /Observation|PD session|Professional|Workplace|Content unlocked/.test(n.title);
  const isAdm = n => n.cat === 'Admission' || /Batch|Waitlisted/.test(n.title);
  w.notifs = all.filter(n => flags.nvq && flags.admitted ? true : flags.nvq ? !isNvqItem(n) : !isNvqItem(n) && !isAdm(n))
    .sort((a, b) => new Date(b.at) - new Date(a.at)).map((n, i) => ({ ...n, id: 'nt' + i }));
  w.notifPrefs = { email: true, sms: false, marketing: false };

  /* ---------- Resources ---------- */
  const R = (id, kind, title, desc, tags, state, dl, lock) => ({ id, kind, title, desc, tags, state, dl, lock });
  w.resources = [];
  if (flags.nvq) w.resources.push(
    { course: w.nvq.title, unit: 'U306 Safeguarding · Module 1', items: [R('r1', 'video', 'Class recording: safeguarding workshop', 'Recording from 29 Sep class (1h 32m).', ['Recording', 'U306'], 'New', false), R('r2', 'doc', 'Slides: types of harm and abuse', 'PDF slides from the workshop.', ['Slides'], 'Opened', true), R('r3', 'scorm', 'Scenario: responding to a disclosure', 'Interactive branching scenario with scoring.', ['Interactive'], 'Completed', false)] },
    { course: w.nvq.title, unit: 'U305 Duty of care · Module 1', items: [R('r4', 'doc', 'Duty of candour factsheet', 'CQC Regulation 20 summary.', ['Factsheet', 'U305'], 'Completed', true), R('r5', 'doc', 'Assignment 3 template (DOCX)', 'Use this to plan your answers.', ['Template'], 'New', true)] },
    { course: w.nvq.title, unit: 'U307 Health and safety · Module 2', items: [R('r6', 'video', 'COSHH in care settings', 'Unlocks with Module 2.', ['U307'], 'Locked', false, 'Unlocks on ' + fd(D(12))), R('r7', 'doc', 'Fire evacuation plans (PPT)', 'Unlocks after you complete Module 1.', ['U307'], 'Locked', false, 'Unlocks after you complete Module 1')] });
  w.enrolments.filter(e => e.kind === 'short' && ['Active', 'Completed', 'Expired-Incomplete'].includes(e.status)).slice(0, 3).forEach(e => w.resources.push({ course: e.title, unit: 'Course materials', expired: e.status === 'Expired-Incomplete', courseId: e.id, items: e.content.slice(0, 3).map((c, i) => R(e.id + c.id, c.kind, c.title, c.dur, [c.kind === 'doc' ? 'Document' : c.kind === 'video' ? 'Video' : 'SCORM'], c.state === 'Not opened' ? 'New' : c.state, c.dl)) }));

  /* ---------- Calendar events ---------- */
  const E = (id, type, title, start, mins, course, extra = {}) => ({ id, type, title, start, end: new Date(new Date(start).getTime() + mins * 6e4).toISOString(), course, ...extra });
  w.events = [
    E('e1', 'class', flags.nvq ? 'Live class: Unit 306 safeguarding workshop' : 'Live Q&A: moving and handling', D(0, '08:25'), 60, flags.nvq ? w.nvq.title : 'Moving and Handling People — 2026', { link: 'https://zoom.example/j/81234567890', go: 'calendar' }),
    E('e2', 'class', flags.nvq ? 'Live class: duty of care' : 'Live webinar: dementia communication', D(2, '17:00'), 90, flags.nvq ? w.nvq.title : 'Dementia Awareness', { link: 'https://zoom.example/j/81234567891', go: 'calendar' }),
    E('e3', 'class', flags.nvq ? 'Classroom: equality and inclusion' : 'Live Q&A: Care Certificate standards 1–3', D(4, '17:00'), 90, flags.nvq ? w.nvq.title : 'The Care Certificate', { link: flags.nvq ? null : 'https://zoom.example/j/81234567892', loc: flags.nvq ? 'Illumin Academy Leicester, Room 1' : null, updated: D(4, '16:00'), go: 'calendar' }),
    E('e4', 'class', 'Live class: health and safety refresher', D(11, '17:00'), 60, flags.nvq ? w.nvq.title : 'Moving and Handling People — 2026', { link: 'https://zoom.example/j/81234567893' }),
    E('e5', 'mile', flags.nvq ? 'Programme milestone: mid-point review' : 'Course access ends: Moving and Handling 2026', flags.nvq ? D(18, '08:00') : D(50, '22:59'), 30, flags.nvq ? w.nvq.title : 'Moving and Handling People — 2026', { go: flags.nvq ? 'progress' : 'course.mh26' }),
    E('e6', 'deadline', 'Certificate expires: Moving and Handling', D(25, '22:59'), 0, 'Certificates', { go: 'certificates' }),
  ];
  if (flags.nvq && flags.admitted) {
    w.assignments.filter(a => new Date(a.due) > new Date(D(-31))).forEach(a => w.events.push(E('ed' + a.id, 'deadline', a.title.split('—')[0].trim() + ' due' + (a.status === 'Resubmission Required' ? ' (resubmission)' : ''), a.due, 0, w.nvq.title, { go: 'assignment.' + a.id })));
    w.observations.filter(o => ['Proposed', 'Confirmed'].includes(o.status)).forEach(o => w.events.push(E('eo' + o.id, 'obs', `Observation (${o.status.toLowerCase()})`, o.at, 120, w.nvq.title, { loc: o.loc, go: 'observations' })));
    w.events.push(E('epd', 'pd', 'Professional Discussion (proposed)', w.pd.session.at, 60, w.nvq.title, { loc: w.pd.session.loc, go: 'progress..pd' }));
  }
  if (!flags.admitted && flags.nvq) w.events = [];

  /* ---------- Attendance ---------- */
  w.attendance = [
    ['Unit 306 safeguarding workshop', D(-5, '17:00'), 90, 'Present', 88, false], ['Unit 305 duty of care — intro', D(-12, '17:00'), 90, 'Late', 71, false],
    ['Unit 303 equality and inclusion', D(-19, '17:00'), 90, 'Partial', 42, false], ['Classroom: person-centred planning', D(-26, '08:00'), 180, 'Present', 180, true],
    ['Unit 304 reflective practice', D(-33, '17:00'), 90, 'Absent', 0, false], ['Induction and portal walkthrough', D(-40, '17:00'), 60, 'Present', 60, false],
  ].map(r => ({ session: r[0], at: r[1], dur: r[2], status: r[3], mins: r[4], manual: r[5] }));

  /* ---------- Misc ---------- */
  w.drafts = {};
  w.quiz = null;
  w.referral = flags.buddy ? { code: 'WB-FATIMA07', link: 'https://illumin-academy.example/r/WB-FATIMA07', count: 6 } : null;
  w.profilePending = {};
  w.consents = [['Terms of use', 'v3.2', D(-120, '19:22:10')], ['Privacy policy', 'v4.0', D(-120, '19:22:10')], ['Marketing emails', 'Declined', D(-120, '19:22:10')]];
  return w;
}

/* Edge-state modifiers (§7) */
function applyEdge() {
  const w = W, e = S.edge;
  const en = id => w.enrolments.find(x => x.id === id);
  if (e === 'underreview' && w.admission) { w.admission.status = 'Under Review'; w.docs.forEach(d => { if (d.mand) { d.status = d.status === 'Approved' ? 'Approved' : 'Submitted'; d.file = d.file || 'cv_priya_raman.pdf'; d.uploaded = d.uploaded || D(-2, '20:10'); } }); w.admission.history.push(['Under Review', D(-1, '09:00')]); }
  if (e === 'rejected' && w.admission) { w.admission.status = 'Rejected'; w.admission.history.push(['Under Review', D(-6)], ['Rejected', D(-1, '14:00')]); }
  if (e === 'withdrawn' && w.admission) { w.admission.status = 'Withdrawn'; w.admission.history.push(['Withdrawn', D(-2, '19:45')]); }
  if (e === 'paused' && w.plans) { const pl = w.plans.find(p => p.e === 'nvq'); if (pl) { pl.rows[4].due = D(-30); } }
  if (e === 'arrangement' && w.plans) { const pl = w.plans.find(p => p.e === 'nvq'); if (pl) { pl.rows[4].due = D(14); pl.rows[4].status = 'Pending'; pl.rows[4].arrangement = true; } }
  if (e === 'discontinued') { const m = en('mh26'); if (m) { m.status = 'Discontinued'; m.reason = 'Discontinued by the Academy on ' + fd(D(-3)) + ': your identity check was not completed within 30 days of enrolment. Contact the Academy if you think this is wrong.'; } }
  if (e === 'expired') { const m = en('mh26'); if (m) { m.status = 'Expired-Incomplete'; m.end = D(-2); } }
  if (e === 'unassigned') { w.enrolments = w.enrolments.filter(x => x.id !== 'mh26'); w.unassigned = { course: 'Moving and Handling People — 2026', agency: w.me.sponsor || 'BrightCare Staffing Ltd (demo)', at: D(-1, '16:20') }; }
  if (e === 'cancelRefund' || e === 'cancelMoved') w.batchCancelled = e === 'cancelRefund' ? { refund: true, amount: w.amt(300) } : { moved: 'Leicester Cohort 8 — L3AC-NOV26', start: D(30) };
  if (e === 'seatReleased' && w.admission) { w.admission.status = 'Approved'; w.docs.forEach(d => { d.status = 'Approved'; d.file = d.file || 'reference_letter.pdf'; d.uploaded = d.uploaded || D(-40, '18:30'); }); Object.assign(w.admission.deposit, { paid: true, paidAt: D(-36), holdUntil: D(-8), released: true }); }
  if (e === 'paypending') { /* fire safety already pending in variant A */ }
  if (e === 'qualified' && w.tree) { w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { c.st = 'Achieved'; c.date = c.date || D(-2); if (c.obs) c.obs = { o: 1, c: 1 }; })))); w.pd.items.forEach(i => i.status = 'Achieved'); w.qualified = true; }
  // derived
  const nv = w.plans && w.plans.find(p => p.e === 'nvq');
  const od = nv && nv.rows.find(r => r.status === 'Overdue');
  w.payOverdue = od ? { label: 'Instalment ' + od.n, amount: od.amount - od.paid, due: od.due, e: 'nvq', n: od.n } : null;
}

/* Derived helpers */
function allCrit() { const out = []; (W.tree || []).forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => out.push({ ...c, type: lo.type, unit: u.code, unitTitle: u.title, lo: lo.code, loTitle: lo.title }))))); return out; }
function countStates(list) { const c = {}; FIVE.forEach(([k]) => c[k] = 0); list.forEach(x => c[x.st]++); return c; }
function critOf(node) {
  if (node.crit) return node.crit;
  if (node.los) return node.los.flatMap(l => l.crit);
  if (node.mods) return node.mods.flatMap(m => m.los.flatMap(l => l.crit));
  return [];
}
const pctOf = list => list.length ? Math.round(list.filter(c => c.st === 'Achieved').length / list.length * 100) : 0;
function nvqProgress() { return pctOf(allCrit()); }
function enrolById(id) { return id === 'nvq' ? W.nvq : W.enrolments.find(e => e.id === id); }
function asgById(id) { return (W.assignments || []).find(a => a.id === id); }
