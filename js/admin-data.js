/* Super Administrator console — shared store and admin-only mock data.
   STORE.worlds holds every learner variant's data; the learner portal (W) and the admin console read and write the same objects. */
'use strict';

const STORE = { worlds: null, acct: {} };
let ADMIN = null;

const ADMIN_VARIANTS = {
  A: { label: 'Super Administrator + System Administrator', me: 'Nadia Qureshi', roles: ['Super Administrator', 'System Administrator'] },
  B: { label: 'Super Administrator only', me: 'Graham Ellis', roles: ['Super Administrator'] },
  C: { label: 'Super Administrator + Finance Admin', me: 'Nadia Qureshi', roles: ['Super Administrator', 'Finance Admin'] },
};

function initStore() {
  STORE.qNotes = {};
  STORE.worlds = {};
  STORE.acct = {};
  [...'ABCDEF'].forEach(v => { STORE.worlds[v] = makeWorld(v); });
  // Unique certificate numbers per learner (each variant is a different person)
  [...'BCDEF'].forEach((v, i) => STORE.worlds[v].certs.forEach(c => { if (c.no !== '—') c.no = c.no.replace(/(\d)$/, d => String((+d + i + 1) % 10)) + String.fromCharCode(65 + i); }));
  // Admin-only additions to learner data so every queue type has a live, linked record
  const F = STORE.worlds.F;
  F.requests.unshift({ id: 'R-1077', type: 'Extra quiz attempts', target: 'Basic Life Support and Anaphylaxis', mid: 'm1', module: 'Basic life support and using an AED', raised: D(-3, '19:40'), status: 'Requested', reason: 'I have re-watched the AED scenario twice and would like another chance.', decision: null });
  const C = STORE.worlds.C;
  C.requests.unshift({ id: 'R-1080', type: 'Profile change', target: 'Address', raised: D(-2, '08:30'), status: 'Requested', reason: 'I moved house on 28 September.', proposed: '12 Sample Street, Leicester', decision: null });
  C.profilePending['Address'] = '12 Sample Street, Leicester';
  W = STORE.worlds[S.variant];
  applyEdge();
  buildAdmin(S.adminVariant || 'A');
}

function buildAdmin(av) {
  const V = ADMIN_VARIANTS[av];
  const A = ADMIN = { av, variant: V };

  /* ---------- Staff ---------- */
  const st = (id, name, email, roles, status, extra = {}) => ({ id, name, email, roles, status, tfa: roles.some(r => ['Super Administrator', 'System Administrator', 'Finance Admin'].includes(r)) ? (extra.tfa || 'Enabled') : 'Not required', last: extra.last || D(-1, '08:40'), alloc: extra.alloc || 0, mobile: extra.mobile || '+44 7700 900' + String(100 + id.slice(-2) * 7).slice(-3), quals: extra.quals || '', reg: extra.reg || '', tz: extra.tz || 'Europe/London', ...extra });
  A.staff = [
    st('ST-001', 'Nadia Qureshi', 'nadia.qureshi@illumin-academy.example', av === 'C' ? ['Super Administrator', 'Finance Admin'] : av === 'A' ? ['Super Administrator', 'System Administrator'] : ['Super Administrator'], 'Active', { last: D(0, '07:52') }),
    st('ST-002', 'Graham Ellis', 'graham.ellis@illumin-academy.example', ['Super Administrator'], 'Active', { last: D(-2, '16:10') }),
    st('ST-003', 'Owen Price', 'owen.price@illumin-academy.example', ['System Administrator'], 'Active', { last: D(0, '07:30') }),
    st('ST-004', 'Sarah Okonkwo', 'sarah.okonkwo@illumin-academy.example', ['Assessor'], 'Active', { alloc: 18, quals: 'TAQA (CAVA), Level 5 Leadership', reg: 'ASR-44821' }),
    st('ST-005', 'James Pryce', 'james.pryce@illumin-academy.example', ['Assessor'], 'Active', { alloc: 14, quals: 'TAQA (CAVA)', reg: 'ASR-39017' }),
    st('ST-006', 'Marcus Bell', 'marcus.bell@illumin-academy.example', ['Teacher'], 'Active', { alloc: 3, quals: 'PGCE, Level 3 Adult Care' }),
    st('ST-007', 'Dr Helen Carter', 'helen.carter@illumin-academy.example', ['Academic Coordinator'], 'Active', { alloc: 4 }),
    st('ST-008', 'Priyanka Shah', 'priyanka.shah@illumin-academy.example', ['IQA'], 'Active', { alloc: 2, quals: 'IQA (Level 4)', reg: 'IQA-20915' }),
    st('ST-009', 'Rachel Hughes', 'rachel.hughes@illumin-academy.example', ['Academic Admin'], 'Active', { alloc: 0 }),
    st('ST-010', 'Tom Whitfield', 'tom.whitfield@illumin-academy.example', ['Teacher'], 'Active', { alloc: 2, quals: 'Level 3 Adult Care' }),
    st('ST-011', 'Leila Haddad', 'leila.haddad@illumin-academy.example', ['Finance Admin'], 'Active', { tz: 'Asia/Dubai', last: D(0, '05:12') }),
    st('ST-012', 'Mark Bennett', 'mark.bennett@illumin-academy.example', ['Finance Admin'], 'Active', { tfa: 'Not set up' }),
    st('ST-013', 'Sophie Turner', 'sophie.turner@illumin-academy.example', ['Business Admin'], 'Active'),
    st('ST-014', 'Omar Siddiqui', 'omar.siddiqui@illumin-academy.example', ['Assessor', 'Teacher'], 'Active', { alloc: 9, tz: 'Asia/Dubai', reg: 'ASR-51230' }),
    st('ST-015', 'Hannah Lewis', 'hannah.lewis@illumin-academy.example', ['Teacher'], 'Suspended', { last: D(-40) }),
    st('ST-016', 'Kevin Doyle', 'kevin.doyle@illumin-academy.example', ['Assessor'], 'Deactivated', { last: D(-120) }),
  ];
  const meRec = av === 'B' ? A.staff[1] : A.staff[0];
  A.me = { name: meRec.name, first: meRec.name.split(' ')[0], email: meRec.email, roles: V.roles, tz: 'Europe/London', id: meRec.id };

  /* ---------- Agencies ---------- */
  const ag = (id, name, region, contact, email, status, extra = {}) => ({ id, name, region, contact, email, status, perms: 'Full', vis: { individual: true, consolidated: true, assessment: true, certExpiry: true }, login: email, loginStatus: 'Active', ...extra });
  A.agencies = [
    ag('AG-01', 'BrightCare Staffing Ltd (demo)', 'UK', 'Joanna Price (Training Lead)', 'training@brightcare-staff.example', 'Active'),
    ag('AG-02', 'CarePlus Recruitment (demo)', 'UK', 'Ravi Sandhu', 'ravi@careplus-recruit.example', 'Active'),
    ag('AG-03', 'Gulf Care Recruitment (demo)', 'UAE', 'Huda Al Marri', 'huda@gulfcare.ae.example', 'Active', { perms: 'Receive-only' }),
    ag('AG-04', 'Emirates Home Health Staffing (demo)', 'UAE', 'Sanjay Pillai', 'sanjay@ehhs.ae.example', 'Active'),
    ag('AG-05', 'Northern Lights Care Agency (demo)', 'UK', 'Fiona McLeod', 'fiona@northernlightscare.example', 'Active'),
    ag('AG-06', 'Harbour Healthcare Solutions (demo)', 'UK', 'Dean Morris', 'dean@harbourhealth.example', 'Suspended', { loginStatus: 'Deactivated' }),
  ];

  /* ---------- Extra learners (25–40) ---------- */
  const names = [['Oliver Bennett', 'UK'], ['Chloe Hughes', 'UK'], ['Jack Thompson', 'UK'], ['Amelia Price', 'UK'], ['Harry Walsh', 'UK'], ['Ruby Clarke', 'UK'], ['Ethan Parker', 'UK'], ['Isla Morgan', 'UK'], ['Noah Edwards', 'UK'], ['Sophie Wright', 'UK'], ["Liam O'Connor", 'UK'], ['Emily Turner', 'UK'], ['Mohammed Ali', 'UK'], ['Zainab Hussain', 'UK'], ['Kofi Asante', 'UK'], ['Ben Carter', 'UK'], ['Megan Roberts', 'UK'], ['Callum Fraser', 'UK'], ['Hannah Patel', 'UK'], ['Mohammed Al Hashimi', 'UAE'], ['Aisha Al Suwaidi', 'UAE'], ['Reem Al Nuaimi', 'UAE'], ['Joseph Mathew', 'UAE'], ['Anjali Nair', 'UAE'], ['Maria Santos', 'UAE'], ['Rohan Menon', 'UAE'], ['Fatma Yilmaz', 'UAE'], ['Ahmed Karim', 'UAE'], ['Leah Fernandes', 'UAE'], ['Daniel Brooks', 'UK']];
  const pool = ['Moving and Handling People — 2026', 'Basic Life Support and Anaphylaxis', 'Infection Prevention and Control', 'Fire Safety Awareness', 'The Care Certificate (15 Standards)', 'Dementia Awareness', 'Level 2 Diploma in Care (England)', 'Level 3 Diploma in Adult Care (England)', 'Food Hygiene Level 2'];
  A.learners = names.map(([n, region], i) => {
    const parts = n.toLowerCase().replace(/'/g, '').split(' ');
    const agency = [0, 3, 6, 9, 14].includes(i) ? 'BrightCare Staffing Ltd (demo)' : [1, 7].includes(i) ? 'CarePlus Recruitment (demo)' : [19, 22, 25].includes(i) ? 'Gulf Care Recruitment (demo)' : [23, 27].includes(i) ? 'Emirates Home Health Staffing (demo)' : i === 11 ? 'Northern Lights Care Agency (demo)' : null;
    const acct = [4, 21, 28].includes(i) ? 'Pending Verification' : [12, 17].includes(i) ? 'Deactivated' : 'Active';
    const rec = [10, 16, 29].includes(i) ? 'Archived' : 'Active';
    const flags = [];
    if ([2, 13, 24].includes(i)) flags.push('Overdue fees', 'Access paused');
    if ([5, 26].includes(i)) flags.push('Overdue fees');
    if ([8, 15, 20].includes(i)) flags.push('At risk');
    if ([15, 18].includes(i)) flags.push('Discontinued enrolment');
    const courses = [pool[i % pool.length], ...(i % 3 === 0 ? [pool[(i + 4) % pool.length]] : [])];
    return { id: 'IA-L-' + (30200 + i * 37), name: n, email: `${parts[0]}.${parts[parts.length - 1]}@${region === 'UAE' ? 'mail.ae.example' : 'uk.example'}`, mobile: region === 'UAE' ? `+971 5${i % 6} 000 ${4000 + i * 37}` : `+44 7700 900${500 + i * 3}`, agency, courses, acct, rec, region, last: D(-(i * 3 % 40) - (rec === 'Archived' ? 400 : 0), '10:00'), flags, dob: `${1 + i % 27} ${['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'][i % 6]} ${1980 + i % 20}`, address: region === 'UAE' ? `Villa ${i + 3}, Example Villas, Dubai` : `${i + 7} Example Lane, ${['Leeds', 'Bristol', 'Nottingham', 'Croydon', 'Leicester', 'Manchester'][i % 6]}`, postcode: region === 'UAE' ? '—' : ['ZZ99 4AA', 'ZZ99 4AB', 'ZZ99 4AD', 'ZZ99 4AE', 'ZZ99 4AF', 'ZZ99 4AG'][i % 6], country: region === 'UAE' ? 'United Arab Emirates' : 'United Kingdom', joined: fd(D(-30 - i * 21)), referral: agency ? 'Created by agency' : i % 4 === 0 ? 'Welfare Buddy referral (code WB-FATIMA07)' : 'Self-registration', cur: 'GBP' };
  });

  // G3.1: learners from one other country (India) — CH-02: pay in GBP; CH-03: data region UK
  [['Kavya Iyer', 'kavya.iyer@in.example', '+91 00000 21734', 'Moving and Handling People — 2026', 'Self-registration', 'Level 2 Diploma in Care (England)'], ['Vikram Nair', 'vikram.nair@in.example', '+91 00000 55812', 'The Care Certificate (15 Standards)', 'Welfare Buddy referral (code WB-HASSAN22)']].forEach(([name, email, mobile, course, referral, nvq], k) => A.learners.push({ id: 'IA-L-' + (31900 + k * 41), name, email, mobile, agency: null, courses: nvq ? [course, nvq] : [course], acct: 'Active', rec: 'Active', region: 'UK', last: D(-2 - k, '11:20'), flags: [], dob: ['4 Feb 1993', '19 Oct 1989'][k], address: ['12 Example Road, Bengaluru', '6 Example Drive, Kochi'][k], postcode: ['560038', '682031'][k], country: 'India', joined: fd(D(-60 - k * 30)), referral, cur: 'GBP', g31: true }));

  /* ---------- Courses, programmes, batches ---------- */
  A.courses = [
    ['SC-01', 'Moving and Handling People', 'Health and safety', 'Published', 45, '12 months', 90, 412, 81], ['SC-02', 'Basic Life Support and Anaphylaxis', 'Clinical skills', 'Published', 39, '12 months', 90, 286, 74],
    ['SC-03', 'Infection Prevention and Control', 'Health and safety', 'Published', 35, '12 months', 90, 351, 69], ['SC-04', 'Fire Safety Awareness', 'Health and safety', 'Published', 29, '12 months', 60, 198, 88],
    ['SC-05', 'Medication Awareness', 'Clinical skills', 'Published', 49, '12 months', 90, 143, 71], ['SC-06', 'Dementia Awareness', 'Person-centred care', 'Published', 35, '24 months', 90, 220, 84],
    ['SC-07', 'The Care Certificate (15 Standards)', 'Induction', 'Published', 180, 'No expiry', 180, 96, 52], ['SC-08', 'Oral Health in Care Homes', 'Person-centred care', 'Draft', 25, '24 months', 60, 0, 0],
    ['SC-09', 'First Aid Awareness', 'Clinical skills', 'Retired', 30, '36 months', 60, 512, 90],
  ].map(r => ({ id: r[0], title: r[1], cat: r[2], status: r[3], gbp: r[4], validity: r[5], access: r[6], enrol: r[7], comp: r[8], version: r[3] === 'Draft' ? 1 : 3 }));
  A.programmes = [
    { id: 'NV-L2', title: 'Level 2 Diploma in Care (England)', level: 'Level 2', ref: 'QN 603/2873/4', version: 1, status: 'Active', batches: 3, learners: 41 },
    { id: 'NV-L3', title: 'Level 3 Diploma in Adult Care (England)', level: 'Level 3', ref: 'QN 603/2851/9', version: 2, status: 'Active', batches: 4, learners: 63 },
    { id: 'NV-L4', title: 'Level 4 Diploma in Adult Care (England)', level: 'Level 4', ref: 'QN 603/2902/7', version: 1, status: 'Suspended', batches: 0, learners: 0 },
    { id: 'NV-L5', title: 'Level 5 Diploma in Leadership and Management for Adult Care', level: 'Level 5', ref: 'QN 603/2900/3', version: 1, status: 'Active', batches: 1, learners: 12 },
    { id: 'NV-L3O', title: 'Level 3 Diploma in Health and Social Care (Adults) — 2018 spec', level: 'Level 3', ref: 'QN 601/5823/2', version: 4, status: 'Retired', batches: 0, learners: 0 },
  ];
  const b = (code, course, start, end, cap, enrolled, mode, coord, teachers, assessors, status, wait = 0) => ({ code, course, start, end, cap, enrolled, mode, coord, teachers, assessors, status, wait, roster: [] });
  A.batches = [
    b('L3AC-JAN26', 'Level 3 Diploma in Adult Care (England)', D(-265), D(99), 16, 14, 'Blended', 'Dr Helen Carter', ['Marcus Bell'], ['Sarah Okonkwo', 'James Pryce'], 'In Progress'),
    b('L2DC-MAR26', 'Level 2 Diploma in Care (England)', D(-214), D(151), 18, 17, 'Blended', 'Dr Helen Carter', ['Tom Whitfield'], ['James Pryce'], 'In Progress'),
    b('L3AC-NOV26', 'Level 3 Diploma in Adult Care (England)', D(36), D(400), 14, 14, 'Online', 'Dr Helen Carter', ['Omar Siddiqui'], ['Omar Siddiqui'], 'Open', 3),
    b('L3AC-NOV26-LEI', 'Level 3 Diploma in Adult Care (England)', D(30), D(394), 16, 6, 'Classroom', 'Dr Helen Carter', ['Marcus Bell'], ['Sarah Okonkwo'], 'Planned'),
    b('L2DC-SEP25', 'Level 2 Diploma in Care (England)', D(-390), D(-25), 15, 15, 'Blended', 'Dr Helen Carter', ['Hannah Lewis'], ['Kevin Doyle'], 'Completed'),
    b('L5LM-JAN25', 'Level 5 Diploma in Leadership and Management for Adult Care', D(-640), D(-90), 12, 11, 'Online', 'Dr Helen Carter', ['Marcus Bell'], ['Sarah Okonkwo'], 'Archived'),
    b('L3AC-DEC26-AUH', 'Level 3 Diploma in Adult Care (England)', D(62), D(426), 12, 5, 'Blended', 'Dr Helen Carter', ['Omar Siddiqui'], ['Omar Siddiqui'], 'Planned'),
    b('L3AC-OCT26-ONL', 'Level 3 Diploma in Adult Care (England)', D(16), D(380), 20, 12, 'Online', 'Dr Helen Carter', ['Omar Siddiqui'], ['Omar Siddiqui'], 'Open'), // CH-10: starts in under 28 days (instalments only)
  ];
  A.batches[0].label = 'Leicester Cohort 7'; A.batches[1].label = 'Croydon Cohort 4'; A.batches[2].label = 'Dubai Cohort 2'; A.batches[3].label = 'Leicester Cohort 8'; A.batches[4].label = 'Manchester Cohort 3'; A.batches[5].label = 'Birmingham Cohort 1'; A.batches[6].label = 'Abu Dhabi Cohort 1'; A.batches[7].label = 'Online Cohort 9';

  /* ---------- Bundles & licences ---------- */
  A.bundles = [
    { id: 'BN-01', name: 'BrightCare mandatory training 2026', agency: 'BrightCare Staffing Ltd (demo)', courses: ['Moving and Handling People', 'Basic Life Support and Anaphylaxis', 'Fire Safety Awareness'], seats: 60, used: 47, validity: D(85), mode: 'Automatic (−15%)', price: 9435, cur: 'GBP', avail: 'Specific agencies', status: 'Active' },
    { id: 'BN-02', name: 'Gulf Care induction pack', agency: 'Gulf Care Recruitment (demo)', courses: ['The Care Certificate (15 Standards)', 'Dementia Awareness'], seats: 25, used: 22, validity: D(19), mode: 'Customised', price: 4258.06, cur: 'GBP', avail: 'Specific agencies', status: 'Pending approval', belowFloor: true },
    { id: 'BN-03', name: 'CarePlus NVQ Level 2 seats', agency: 'CarePlus Recruitment (demo)', courses: ['Level 2 Diploma in Care (England)'], seats: 8, used: 5, validity: D(240), mode: 'Customised', price: 13600, cur: 'GBP', avail: 'Specific agencies', status: 'Active' },
    { id: 'BN-04', name: 'Starter bundle (any agency)', agency: '—', courses: ['Moving and Handling People', 'Infection Prevention and Control'], seats: 10, used: 0, validity: null, mode: 'Automatic (volume slab 10+)', price: 680, cur: 'GBP', avail: 'Global', status: 'Active' },
    { id: 'BN-05', name: 'EHHS clinical skills', agency: 'Emirates Home Health Staffing (demo)', courses: ['Basic Life Support and Anaphylaxis', 'Medication Awareness'], seats: 30, used: 29, validity: D(11), mode: 'Automatic (−10%)', price: 2341.94, cur: 'GBP', avail: 'Specific agencies', status: 'Active' },
    { id: 'BN-06', name: 'Northern Lights 2025 refresh', agency: 'Northern Lights Care Agency (demo)', courses: ['Moving and Handling People'], seats: 20, used: 20, validity: D(-20), mode: 'Automatic', price: 900, cur: 'GBP', avail: 'Specific agencies', status: 'Expired' },
    { id: 'BN-07', name: 'BrightCare NVQ Level 2 seats', agency: 'BrightCare Staffing Ltd (demo)', courses: ['Level 2 Diploma in Care (England)'], seats: 10, used: 7, validity: D(300), mode: 'Customised', price: 16200, cur: 'GBP', avail: 'Specific agencies', status: 'Active' },
  ];
  A.ledger = [
    ['BrightCare Staffing Ltd (demo)', 'BN-01', D(-120), 'Credit', 60, 'Bundle purchased'], ['BrightCare Staffing Ltd (demo)', 'BN-01', D(-90), 'Debit', 40, 'Seats assigned (bulk)'], ['BrightCare Staffing Ltd (demo)', 'BN-01', D(-40), 'Debit', 8, 'Seats assigned'],
    ['BrightCare Staffing Ltd (demo)', 'BN-01', D(-1), 'Credit', 1, 'Seat returned — unassignment (Grace Mensah, Moving and Handling 2026)'], ['CarePlus Recruitment (demo)', 'BN-03', D(-60), 'Credit', 1, 'Seat returned — NVQ admission rejected'],
    ['Gulf Care Recruitment (demo)', 'BN-02', D(-70), 'Debit', 22, 'Seats assigned'], ['Northern Lights Care Agency (demo)', 'BN-06', D(-20), 'Debit', 0, 'Bundle lapsed — 0 seats remaining'], ['Emirates Home Health Staffing (demo)', 'BN-05', D(-30), 'Debit', 29, 'Seats assigned'],
  ].map(r => ({ agency: r[0], bundle: r[1], at: r[2], kind: r[3], qty: r[4], note: r[5] }));

  /* ---------- Referrals ---------- */
  A.referrals = [
    { code: 'WB-FATIMA07', type: 'Welfare Buddy', owner: 'Fatima Al Mansoori (learner)', valid: D(270), status: 'Active', regs: 6 },
    { code: 'WB-HASSAN22', type: 'Welfare Buddy', owner: 'Hassan Rahman (learner)', valid: D(120), status: 'Active', regs: 3 },
    { code: 'GCR-118', type: 'Agent', owner: 'Gulf Care Recruitment (demo)', valid: D(400), status: 'Active', regs: 14 },
    { code: 'EHHS-AGENT-02', type: 'Agent', owner: 'Emirates Home Health Staffing (demo)', valid: D(-10), status: 'Expired', regs: 9 },
    { code: 'BRIGHT-2026', type: 'Agency', owner: 'BrightCare Staffing Ltd (demo)', valid: D(85), status: 'Active', regs: 21 },
    { code: 'NLC-OLD', type: 'Agency', owner: 'Northern Lights Care Agency (demo)', valid: D(30), status: 'Disabled', regs: 2 },
  ];

  /* ---------- Approvals Queue (static admin items; learner requests/docs/admissions are derived live) ---------- */
  const q = (id, type, raisedBy, raised, status, first, related, extra = {}) => ({ id, type, raisedBy, raised, status, first, related, notes: [], history: [[raisedBy, raised, 'Raised', extra.reason || '']], ...extra });
  A.queue = [
    q('AQ-1001', 'Admission application', 'Mohammed Al Hashimi', D(-9, '10:00'), 'Escalated', 'Rachel Hughes', ['Mohammed Al Hashimi · Level 3 Diploma in Adult Care', 'a-admissions.APP-2207'], { escalated: true, reason: 'Application submitted with all mandatory documents.', data: { checklist: '6 of 6 mandatory documents submitted · 4 approved' } }),
    q('AQ-1002', 'Replace / re-upload document', 'Reem Al Nuaimi', D(-5, '14:20'), 'Pending', 'Rachel Hughes', ['Reem Al Nuaimi · Emirates ID', 'a-admissions'], { reason: 'Replacement Emirates ID uploaded (current one expires in 18 days and stays valid until the replacement is approved).' }),
    q('AQ-1004', 'Data correction', 'Sarah Okonkwo', D(-4, '11:05'), 'Pending', 'Owen Price', ['Aisha Rahman · Full name', 'a-learners.IA-L-18022'], { finalSuper: true, reason: 'Learner\'s passport shows middle name "Noor". Certificate for Food Hygiene Level 2 needs re-issue.', data: { field: 'Full name', current: 'Aisha Rahman', proposed: 'Aisha Noor Rahman', firstReview: 'Owen Price (System Administrator) — first review: Recommend approval. Passport copy checked.', v: 'C', cert: 'c2' } }),
    q('AQ-1005', 'Data correction', 'Rachel Hughes', D(-6, '09:30'), 'Info Requested', 'Owen Price', ['Joseph Mathew · Date of birth', 'a-learners.IA-L-31014'], { finalSuper: true, reason: 'DOB entered as 1999; ID shows 1989.', data: { field: 'Date of birth', current: '24 Sep 1999', proposed: '24 Sep 1989', firstReview: 'Owen Price — first review: Info requested from learner (clear ID scan).' } }),
    q('AQ-1006', 'Data correction', A.me.name, D(-1, '15:00'), 'Approved', 'No approval (Super Admin)', ['Chloe Hughes · Referral attribution', 'a-learners.IA-L-30237'], { finalSuper: true, saImmediate: true, decidedBy: A.me.name, decision: 'Applied immediately — Super Admin — no approval required. Learner registered without the CarePlus code; agency confirmed by email.', reason: 'Learner registered without the CarePlus code; agency confirmed by email.', data: { field: 'Referral attribution', current: 'Self-registration', proposed: 'CarePlus Recruitment (demo) (agency)', firstReview: 'Not required — raised by the Super Administrator' } }),
    q('AQ-1007', 'Resubmission limit reached', 'Sarah Okonkwo', D(-8, '17:45'), 'Escalated', 'Rachel Hughes', ['Aisha Rahman · Assignment 7 — Personal development', 'a-learners.IA-L-18022.academic'], { escalated: true, reason: 'Two resubmissions used. Q1 still Not met.', data: { rec: 'One exceptional resubmission', v: 'C', aid: 'a7' } }),
    q('AQ-1008', 'Discontinue enrolment — academic', 'James Pryce', D(-3, '12:00'), 'Pending', 'Rachel Hughes', ['Ben Carter · Level 2 Diploma in Care', 'a-learners.IA-L-30755'], { reason: 'No evidence submitted for 4 months despite 3 action plans.' }),
    q('AQ-1009', 'Discontinue enrolment — non-payment', 'Mark Bennett', D(-12, '10:00'), 'Approved', 'No approval (direct)', ['Megan Roberts · Medication Awareness', 'a-learners.IA-L-30792'], { reason: 'Unpaid for 45 days after access paused.', decidedBy: 'Mark Bennett', decision: 'Discontinued directly (no approval step).' }),
    q('AQ-1012', 'Refund', 'Mark Bennett', D(-10, '09:15'), 'Approved', 'Leila Haddad', ['Isla Morgan · TXN-77201', 'a-finance'], { amount: 180, cur: 'GBP', reason: 'Enrolled on the wrong course (Care Certificate instead of Dementia Awareness).', decidedBy: 'Leila Haddad', decision: 'Approved — full refund, revoke access.', data: { tx: 'TXN-77201', consequence: 'Revoke access' } }),
    q('AQ-1013', 'Refund', av === 'C' ? A.me.name : 'Mark Bennett', D(-2, '13:40'), av === 'C' ? 'Approved' : 'Pending', av === 'C' ? 'No approval (Super Admin)' : 'Leila Haddad', ['Maria Santos · TXN-79118', 'a-finance'], { amount: 180, cur: 'GBP', reason: 'Duplicate payment flagged for the Care Certificate.', ...(av === 'C' ? { saImmediate: true, decidedBy: A.me.name, processed: D(-2, '13:41'), decision: 'Processed immediately — Super Admin — no approval required. Duplicate payment flagged for the Care Certificate.' } : {}), data: { tx: 'TXN-79118', consequence: 'Retain access' } }),
    q('AQ-1014', 'Bundle price below minimum', 'Sophie Turner', D(-6, '16:00'), 'Pending', 'Owen Price', ['Gulf Care Recruitment (demo) · BN-02', 'a-bundles'], { amount: 4258.06, cur: 'GBP', reason: 'Two-year partnership; volume commitment of 25 seats.', data: { floor: 4838.71, requested: 4258.06, bundle: 'BN-02' } }),
    q('AQ-1015', 'Link existing learner to agency', 'CarePlus Recruitment (demo)', D(-11, '11:00'), 'Returned to Requester', 'Sophie Turner', ['Chloe Hughes → CarePlus Recruitment (demo)', 'a-agencies.AG-02'], { reason: 'Learner now works for CarePlus.', decidedBy: 'Sophie Turner', decision: 'Returned — please upload the learner\'s signed consent.' }),
    q('AQ-1016', 'Agency invoice (offline) purchase', 'Northern Lights Care Agency (demo)', D(-2, '10:30'), 'Pending', 'Mark Bennett', ['Northern Lights Care Agency (demo) · 15 seats Fire Safety', 'a-agencies.AG-05'], { amount: 435, cur: 'GBP', reason: 'PO-NLC-4471, 30-day terms.' }),
    // G4.4 / G4.7 new item types (mixed statuses)
    q('AQ-1022', 'Reactivate enrolment — academic', 'James Pryce', D(-2, '16:10'), 'Pending', 'Rachel Hughes', ['Hannah Patel · Level 2 Diploma in Care', 'a-learner.IA-L-30866'], { reason: 'Learner has re-engaged: agreed action plan and two overdue answers submitted to me by email.', data: { lid: 'IA-L-30866' } }) /* G12.7 #15: Ben Carter left free for the scenario */,
    q('AQ-1023', 'Reactivate enrolment — academic', 'Sarah Okonkwo', D(-21, '10:00'), 'Approved', 'Rachel Hughes', ['Hannah Patel · Level 2 Diploma in Care', 'a-learner.IA-L-30866'], { reason: 'Medical leave ended; learner ready to resume.', decidedBy: 'Rachel Hughes', decision: 'Approved — access restored.', data: { lid: 'IA-L-30866' } }),
    q('AQ-1024', 'Discount rate change', 'Sophie Turner', D(-9, '11:30'), 'Pending', 'Super Administrator', ['Standard discount', 'a-bundles..rates'], { reason: 'Give small top-ups (under 10 seats) a modest automatic discount.', data: { setting: 'Standard discount', current: 'Standard 0% · 10–24 seats −5% · 25–49 seats −10% · 50+ seats −15%', proposed: 'Standard 5% · 10–24 seats −5% · 25–49 seats −10% · 50+ seats −15%', next: { std: 5, slabs: [[10, 24, 5], [25, 49, 10], [50, null, 15]], agency: {} } } }),
    q('AQ-1025', 'Discount rate change', 'Sophie Turner', D(-60, '09:00'), 'Approved', 'Super Administrator', ['Volume slab 50+ seats', 'a-bundles..rates'], { reason: 'Large-volume agencies asked for a better 50+ rate.', decidedBy: A.me.name, decision: 'Approved — applies to new purchases.', data: { setting: 'Volume slab 50+ seats', current: '−12%', proposed: '−15%' } }),
    q('AQ-1020', 'Extra quiz attempts', 'Harry Walsh', D(-15, '20:10'), 'Rejected', 'Rachel Hughes', ['Harry Walsh · Fire Safety Awareness', 'a-learners.IA-L-30348'], { reason: 'Ran out of attempts.', decidedBy: 'Rachel Hughes', decision: 'Rejected — already had one extension. Please re-purchase.' }),
    q('AQ-1021', 'More time on short course', 'Ruby Clarke', D(-18, '08:00'), 'Approved', 'Rachel Hughes', ['Ruby Clarke · Dementia Awareness', 'a-learners.IA-L-30385'], { reason: 'Bereavement leave.', decidedBy: 'Rachel Hughes', decision: 'Rejected — no evidence.', override: { by: 'Nadia Qureshi', at: D(-16, '10:00'), from: 'Rejected', to: 'Approved', reason: 'Compassionate grounds; evidence received by email.' } }),
  ];

  /* ---------- Other admin datasets ---------- */
  A.iqa = [
    ['IQA-301', 'Feedback on Q3 does not reference the criterion wording; ask assessor to align with 302 1.2.', 'Priyanka Shah', D(-3), 'Aisha Rahman · Assignment 2 (Sub 1)', 'Sarah Okonkwo'],
    ['IQA-302', 'Good practice: clear, developmental feedback with workplace links.', 'Priyanka Shah', D(-12), 'Aisha Rahman · Assignment 1', 'Sarah Okonkwo'],
    ['IQA-303', 'Observation record missing the time the learner left the floor.', 'Priyanka Shah', D(-20), 'Aisha Rahman · Observation 14 Jul', 'James Pryce'],
    ['IQA-304', 'Sampling: 3 of 5 L2 submissions reviewed; decisions consistent.', 'Priyanka Shah', D(-25), 'Croydon Cohort 4 · sample', 'James Pryce'],
    ['IQA-305', 'Resubmission accepted without addressing feedback point 2.', 'Priyanka Shah', D(-30), 'Grace Mensah · Assignment 2 (Resub 1)', 'James Pryce'],
    ['IQA-306', 'PD referral reason too brief; expand rationale.', 'Priyanka Shah', D(-33), 'Aisha Rahman · PD 306 2.1', 'Sarah Okonkwo'],
  ].map(r => ({ id: r[0], text: r[1], by: r[2], at: r[3], sub: r[4], assessor: r[5] }));

  A.audit = [
    ['Owen Price', 'System Administrator', D(0, '07:41'), 'System Configuration', 'Session timeout', 'Updated', '20 min', '30 min', 'Staff feedback on timeouts during marking'],
    ['Rachel Hughes', 'Academic Admin', D(-1, '10:16'), 'Approvals Queue', 'R-1042', 'Approved', 'Requested', 'Granted (+3 attempts)', 'First fail by 5%'],
    ['Leila Haddad', 'Finance Admin', D(-1, '09:02'), 'Finance', 'TXN-90011', 'Recorded offline payment', '—', '£350.54 bank transfer', 'Remittance received'],
    ['Nadia Qureshi', 'Super Administrator', D(-2, '15:00'), 'Approvals Queue', 'AQ-1006', 'Raised', '—', 'Pending', 'Agency confirmed by email'],
    ['Nadia Qureshi', 'Super Administrator', D(-2, '15:00'), 'Approvals Queue', 'AQ-1006', 'Super Admin — no approval required', 'Raised', 'Applied', 'Agency confirmed by email'],
    ['Sophie Turner', 'Business Admin', D(-3, '12:22'), 'Bundles & Licences', 'BN-02', 'Price changed', '£4,838.71', '£4,258.06', 'Partnership discount'],
    ['Mark Bennett', 'Finance Admin', D(-3, '08:10'), 'Learners', 'IA-L-30422', 'Access paused', 'Active', 'Paused', '30 days overdue (automatic)'],
    ['Sarah Okonkwo', 'Assessor', D(-3, '15:12'), 'Assessment', 'Aisha Rahman · Assignment 2', 'Feedback returned', 'Submitted', 'Resubmission Required', ''],
    ['Graham Ellis', 'Super Administrator', D(-5, '17:30'), 'Roles & Capabilities', 'Finance Admin', 'Capability added', 'Refunds: View', 'Refunds: View, Create', 'Refund workflow'],
    ['Owen Price', 'System Administrator', D(-6, '11:00'), 'Staff & Users', 'Hannah Lewis', 'Suspended', 'Active', 'Suspended', 'Extended leave'],
    ['Nadia Qureshi', 'Super Administrator', D(-16, '10:00'), 'Approvals Queue', 'AQ-1021', 'Override decision', 'Rejected', 'Approved', 'Compassionate grounds'],
  ].map((r, i) => ({ id: 'AU-' + (9000 + i), actor: r[0], role: r[1], at: r[2], module: r[3], entity: r[4], action: r[5], before: r[6], after: r[7], reason: r[8], ip: ['81.2.69.' + (140 + i), '94.204.18.' + (20 + i)][i % 2] }));
  A.security = [
    ['High', D(-1, '22:14'), 'Denied cross-agency access', 'Agency admin (CarePlus Recruitment (demo)) tried to open learner IA-L-24560 (BrightCare)', false],
    ['Medium', D(-2, '09:40'), 'Out-of-scope action', 'Business Admin Sophie Turner attempted to edit an instalment plan', true],
    ['High', D(-2, '03:12'), 'Repeated failed logins', '9 failed attempts for mark.bennett@illumin-academy.example from 185.220.101.4', false],
    ['Medium', D(-4, '18:05'), '2FA failure', '3 wrong codes for leila.haddad@illumin-academy.example — locked 15 min', true],
    ['Low', D(-6, '12:00'), 'Repeated failed logins', '5 failed attempts for a learner account (auto-locked)', true],
    ['Medium', D(-9, '10:30'), 'Denied cross-agency access', 'Agency admin (Gulf Care) tried an export including EHHS learners', true],
  ].map((r, i) => ({ id: 'SE-' + (500 + i), sev: r[0], at: r[1], type: r[2], detail: r[3], reviewed: r[4] }));
  A.archiveAccess = [['Owen Price', 'Liam O\'Connor', 'Certificate verification', D(-7, '14:00')], ['Priyanka Shah', 'Megan Roberts', 'Awarding-body audit', D(-21, '11:30')], ['Rachel Hughes', 'Daniel Brooks', 'Learner query', D(-33, '09:10')]];
  A.notifLog = [
    ['Feedback returned', 'Aisha Rahman', 'Email', 'Delivered', 0, ''], ['Instalment overdue', 'Aisha Rahman', 'SMS', 'Failed', 3, 'Fell back to email'], ['Live-session reminder', 'Leicester Cohort 7 (14)', 'Email', 'Sent', 0, ''],
    ['Certificate expiring (30 days)', 'Daniel Okafor', 'Email', 'Delivered', 0, ''], ['Workplace permission reminder', 'Mr Daniel Fraser', 'Email', 'Delivered', 1, ''], ['Document decision', 'Priya Raman', 'In-app', 'Delivered', 0, ''],
    ['Approvals Queue escalated', 'Nadia Qureshi', 'Email', 'Queued', 0, ''], ['Export ready', 'Owen Price', 'In-app', 'Delivered', 0, ''],
  ].map((r, i) => ({ event: r[0], to: r[1], ch: r[2], status: r[3], retries: r[4], fallback: r[5], at: D(-i % 4, String(8 + i).padStart(2, '0') + ':15') }));
  A.integrations = [
    { id: 'pay', name: 'Payment gateway', status: 'Connected', last: D(0, '08:02'), fields: [['Publishable key', 'pk_live_••••••••4Qx9'], ['Secret key', 'sk_live_••••••••Zt21'], ['Webhook secret', 'whsec_••••••••a8Lm']] },
    { id: 'email', name: 'Email', status: 'Connected', last: D(0, '08:10'), fields: [['Provider', 'API (transactional)'], ['Sender name', 'Illumin Academy'], ['Sender address', 'no-reply@illumin-academy.example'], ['API key', '••••••••••••k3P0']] },
    { id: 'sms', name: 'SMS', status: 'Failing', last: D(-1, '17:44'), fields: [['API key', '••••••••••••9WqE'], ['Sender ID', 'ILLUMIN']], error: '3 consecutive failures since 17:44 yesterday (401 Unauthorised). Falling back to email.' },
    { id: 'zoom', name: 'Zoom', status: 'Connected', last: D(0, '07:30'), fields: [['Account ID', '••••••••Hn2'], ['Client ID', '••••••••7Qa'], ['Client secret', '••••••••••••']] },
    { id: 'vimeo', name: 'Vimeo', status: 'Connected', last: D(-1, '22:00'), fields: [['Account', 'illumin-academy (Pro)'], ['Domain restriction', 'portal.illumin-academy.example'], ['Access token', '••••••••••••']] },
    { id: 'dbs', name: 'Awarding-body portal export', status: 'Not configured', last: null, fields: [['Endpoint', '—']] },
  ];
  A.config = [
    ['Security', 'Password policy', '12+ characters, upper, lower, number, symbol'], ['Security', 'OTP (2FA code) expiry', '15 minutes'], ['Links', 'Payment link expiry', '72 hours'], ['Links', 'Set-password / reset / workplace link expiry', '7 days'],
    ['Security', 'Session timeout', '30 minutes'], ['Payments', 'Payment-pending timeout', '24 hours'], ['Quizzes', 'Connection-loss grace period', '2 minutes'], ['Certificates', 'Certificate expiry reminder window', '30 / 15 / 7 days'],
    ['Documents', 'Document expiry reminder window', '30 days'], ['Assignments', 'Deadline reminder offsets', '−7 / −3 / −1 days'], ['Approvals', 'Stalled-item days (N)', '5 days'], ['Attendance', 'Attendance thresholds', 'Present ≥ 80% · Partial 30–79% · Late after 10 min'],
    ['Payments', 'Overdue escalation days', '15 (notify) / 30 (notify + pause)'], ['Admissions', 'Deposit minimum and seat-hold days', '£300.00 · 28 days'], ['Commercial', 'Bundle minimum price', '−20% of list price'], ['Commercial', 'Seat return rule on unassignment', 'Return if < 10% progress'],
    ['Referrals', 'Invalid referral code behaviour', 'Warn and continue'], ['Workplace', 'Workplace contact titles', 'Manager, Coordinator, Deputy Manager, Clinical Lead'], ['Approvals', 'Approvals SLA', '7 days'], ['Data', 'Archive grace period', '12 months'], ['Assignments', 'Undo window', '15 seconds (fixed)'],
    ['Contact', 'Academy contact details', '020 3983 0282 · info@welfarehs.co.uk · Mon–Sun 9:30 AM – 6 PM'], // CH-31
  ].map((r, i) => ({ id: 'CF-' + i, group: r[0], name: r[1], value: r[2], fixed: r[1] === 'Undo window', history: i === 4 ? [['Owen Price', D(0, '07:41'), '20 minutes', '30 minutes']] : [] })).filter(c => c.name !== 'Invalid referral code behaviour'); // TBD-072: fixed rule (warn and continue), IDs kept
  A.announcements = [
    { id: 'AN-01', title: 'Academy closed 25–26 December', aud: 'All users', ch: ['In-app', 'Email'], status: 'Published', by: 'Nadia Qureshi', at: D(-3) },
    { id: 'AN-02', title: 'Unit 306 class recording uploaded', aud: 'Leicester Cohort 7', ch: ['In-app'], status: 'Published', by: 'Marcus Bell (Teacher)', at: D(-7), teacher: true },
    { id: 'AN-03', title: 'New CPD course: Oral Health in Care Homes', aud: 'All learners', ch: ['In-app', 'Email'], status: 'Scheduled', by: 'Sophie Turner', at: D(3) },
    { id: 'AN-04', title: 'Agency reporting portal update', aud: 'Agency administrators', ch: ['Email'], status: 'Draft', by: 'Nadia Qureshi', at: D(0) },
    { id: 'AN-05', title: 'Planned maintenance — 14 September', aud: 'All users', ch: ['In-app', 'Email', 'SMS'], status: 'Expired', by: 'Owen Price', at: D(-25) },
    { id: 'AN-06', title: 'Fee reminder for Dubai cohort', aud: 'Dubai Cohort 2', ch: ['SMS'], status: 'Withdrawn', by: 'Leila Haddad', at: D(-12) },
  ];
  A.threads = [
    { id: 'MT-1', subject: 'Report columns for monthly board pack', party: 'BrightCare Staffing Ltd (demo)', status: 'Open', msgs: [['Joanna Price', D(-1, '09:00'), 'Could the consolidated report include certificate expiry dates?']] },
    { id: 'MT-2', subject: 'Fee question escalated by assessor — Aisha Rahman', party: 'Redirected learner query', status: 'Answered', msgs: [['Sarah Okonkwo', D(-3, '11:00'), 'Learner asked about splitting instalment 5. Redirecting to Finance.'], ['Leila Haddad', D(-2, '10:00'), 'Replied to the learner with payment arrangement options.']] },
    { id: 'MT-3', subject: 'Invoice PO-NLC-4471', party: 'Northern Lights Care Agency (demo)', status: 'Open', msgs: [['Fiona McLeod', D(-2, '10:35'), 'Purchase order attached for 15 Fire Safety seats.']] },
    { id: 'MT-4', subject: 'Seat return for Grace Mensah', party: 'BrightCare Staffing Ltd (demo)', status: 'Closed', msgs: [['Joanna Price', D(-1, '16:00'), 'Unassigning Grace from Moving and Handling 2026.'], ['Sophie Turner', D(-1, '16:30'), 'Done — seat returned to BN-01.']] },
    { id: 'MT-5', subject: 'Arabic subtitles for Dementia Awareness', party: 'Gulf Care Recruitment (demo)', status: 'Answered', msgs: [['Huda Al Marri', D(-8), 'Are Arabic subtitles planned?'], ['Sophie Turner', D(-7), 'Not this year — content is in UK English.']] },
    { id: 'MT-6', subject: 'Learner query: certificate name', party: 'Redirected learner query', status: 'Open', msgs: [['Marcus Bell', D(0, '07:00'), 'Aisha asked how to add her middle name to certificates.']] },
  ];
  A.dsr = [
    { id: 'DSR-14', who: 'Liam O\'Connor', at: D(-30), type: 'Erasure', status: 'Completed', loggedBy: 'Rachel Hughes', archived: D(-26), decision: 'Archived — basis: awarding-body retention (assessment evidence)' },
    { id: 'DSR-15', who: 'Fatima Al Mansoori', at: D(-6), type: 'Access', status: 'Completed', loggedBy: 'Rachel Hughes', exported: D(-5), decision: 'Data export emailed (encrypted ZIP)' },
    { id: 'DSR-13', who: 'Ethan Parker', at: D(-26), type: 'Access', status: 'Open', loggedBy: 'Joanne Lister', decision: '' },
    { id: 'DSR-16', who: 'Ahmed Karim', at: D(-1), type: 'Access', status: 'Open', loggedBy: 'Rachel Hughes', decision: '' },
  ];
  A.exportsLog = [['Owen Price', 'Finance — datewise report (CSV)', D(-1, '17:00')], ['Leila Haddad', 'Overdue learners (Excel)', D(-2, '09:00')], ['Nadia Qureshi', 'Audit log (PDF)', D(-5, '12:30')]].map(r => ({ who: r[0], what: r[1], at: r[2] }));
  A.sessions = [
    ['ZS-01', D(-5, '17:00'), 'Leicester Cohort 7', 'Marcus Bell', '812 3456 7881', 'Report retrieved'], ['ZS-02', D(-12, '17:00'), 'Leicester Cohort 7', 'Marcus Bell', '812 3456 7882', 'Report retrieved'], ['ZS-03', D(-26, '08:00'), 'Leicester Cohort 7 (classroom)', 'Marcus Bell', '—', 'Manual'],
    ['ZS-04', D(0, '08:25'), 'Leicester Cohort 7', 'Marcus Bell', '812 3456 7890', 'Scheduled'], ['ZS-05', D(-1, '15:00'), 'Croydon Cohort 4', 'Tom Whitfield', '845 1102 3391', 'Completed'], ['ZS-06', D(2, '17:00'), 'Leicester Cohort 7', 'Marcus Bell', '812 3456 7891', 'Scheduled'],
    ['ZS-07', D(-3, '14:00'), 'Moving and Handling Q&A (short course)', 'Hannah Lewis', '833 0021 1145', 'Report retrieved'],
  ].map(r => ({ id: r[0], at: r[1], batch: r[2], teacher: r[3], mid: r[4], status: r[5] }));
  A.unmatched = [['Aisha R (iPhone)', 'aisha.r88@icloud.example', 'ZS-01', 84], ['Guest 4471', '—', 'ZS-05', 12], ['Kofi', 'kofi.a@outlook.example', 'ZS-02', 90]].map((r, i) => ({ id: 'UM-' + i, name: r[0], email: r[1], session: r[2], mins: r[3] }));
  A.resources = [
    ['RS-01', 'Class recording: safeguarding workshop', 'Vimeo video', 'U306 · Level 3 Adult Care', 'Published', 'Immediate', 2], ['RS-02', 'Slides: types of harm and abuse', 'PDF', 'U306 · Level 3 Adult Care', 'Published', 'Immediate', 1],
    ['RS-03', 'Scenario: responding to a disclosure', 'SCORM', 'U306 · Level 3 Adult Care', 'Published', 'Immediate', 3], ['RS-04', 'Duty of candour factsheet', 'PDF', 'U305 · Level 3 Adult Care', 'Published', 'Immediate', 1],
    ['RS-05', 'COSHH in care settings', 'Vimeo video', 'U307 · Level 3 Adult Care', 'Published', 'Date: ' + fd(D(12)), 1], ['RS-06', 'Fire evacuation plans', 'PPT', 'U307 · Level 3 Adult Care', 'Draft', 'After Module 1 complete', 1],
    ['RS-07', 'Hoist and sling checklist', 'DOCX', 'Moving and Handling People', 'Published', 'Immediate', 4], ['RS-08', 'NHS hand hygiene guidance', 'Link', 'Infection Prevention and Control', 'Expired', 'Immediate', 1],
  ].map(r => ({ id: r[0], title: r[1], type: r[2], map: r[3], status: r[4], release: r[5], version: r[6], tags: [r[2] === 'Vimeo video' ? 'Recording' : 'Reference'] }));
  A.myNotifs = [
    { t: 'AQ-1007 escalated to you', b: 'Resubmission limit reached — no decision for 8 days.', at: D(0, '00:05'), unread: true, go: 'a-queue.AQ-1007' },
    { t: 'AQ-1001 escalated to you', b: 'Admission application — 9 days without decision.', at: D(-1, '00:05'), unread: true, go: 'a-queue.AQ-1001' },
    { t: 'SMS integration failing', b: '3 consecutive failures since yesterday 17:44.', at: D(-1, '17:50'), unread: true, go: 'a-integrations' },
    { t: 'Export ready', b: 'Finance — datewise report (CSV).', at: D(-1, '17:02'), unread: false, go: 'a-reports' },
    { t: 'Data correction awaiting your final approval', b: 'AQ-1004 · Aisha Rahman · Full name.', at: D(-2, '09:00'), unread: false, go: 'a-queue.AQ-1004' },
  ];
  A.edge = 'none';
  return A;
}

/* ---------- Helpers shared by admin modules ---------- */
const VNAME = v => { const m = STORE.worlds[v].me; return m.first + ' ' + m.last; };
const demoWorlds = () => typeof FX !== 'undefined' && FX.mode === 'client' ? [] : [...'ABCDEF'].concat(STORE.worlds && STORE.worlds.H ? ['H'] : []); // mock learner Priya Nair (world H)
// CH-03: data region by country — UAE → UAE; the UK and every other country → UK
const regionOf = c => c === 'United Arab Emirates' ? 'UAE' : 'UK';
function demoLearners() {
  return demoWorlds().map(v => {
    const w = STORE.worlds[v], m = w.me;
    const flags = [];
    if (w.payOverdue) flags.push('Overdue fees');
    if (v === 'C' && S.edge === 'paused' && S.variant === 'C') flags.push('Access paused');
    if (w.enrolments.some(e => e.status === 'Discontinued')) flags.push('Discontinued enrolment');
    if (v === 'C') flags.push('At risk');
    return { id: m.id, v, name: m.first + ' ' + m.last, email: m.email, mobile: m.mobile, agency: m.sponsor, courses: w.enrolments.map(e => e.title).concat(w.admission && !w.flags.admitted ? [w.nvq.title + ' (applicant)'] : []), acct: STORE.acct[v] === 'Archived' ? 'Active' : STORE.acct[v] || (v === 'B' ? 'Active' : 'Active'), rec: STORE.acct[v] === 'Archived' ? 'Archived' : 'Active', region: regionOf(m.country), last: D(0, '07:55'), flags, dob: m.dob, address: m.address, postcode: m.postcode, country: m.country, joined: m.joined, referral: m.referral, cur: m.cur, demo: true };
  });
}
const ad0 = w => w.admission && w.admission.status;
function allLearners() { return demoLearners().concat(ADMIN.learners); }
function learnerById(id) { return allLearners().find(l => l.id === id); }
function logA(module, entity, action, before, after, reason) {
  ADMIN.audit.unshift({ id: 'AU-' + (9100 + ADMIN.audit.length), actor: ADMIN.me.name, role: ADMIN.me.roles[0], at: now().toISOString(), module, entity, action, before: before ?? '—', after: after ?? '—', reason: reason || '', ip: '81.2.69.142' });
}
function notifyLearner(v, cat, title, body, goTok) {
  const w = STORE.worlds[v]; if (!w) return;
  w.notifs.unshift({ id: 'na' + Date.now() + Math.floor(Math.random() * 999), cat, title, body, at: now().toISOString(), go: goTok, unread: true });
}

/* Learner requests → queue items (live) */
const REQ_TYPE = { 'Extra quiz attempts': 'Extra quiz attempts', 'More time on course': 'More time on short course', 'Profile change': 'Learner profile change' };
const REQ_STATUS = { Requested: 'Pending', Granted: 'Approved', Approved: 'Approved', Rejected: 'Rejected', 'Re-purchase Required': 'Rejected', Cancelled: 'Cancelled' };
function derivedQueue() {
  const out = [];
  demoWorlds().forEach(v => {
    const w = STORE.worlds[v], name = VNAME(v);
    w.requests.forEach(r => {
      const t = REQ_TYPE[r.type]; if (!t) return;
      const open = r.status === 'Requested', days = -daysTo(r.raised);
      out.push({ id: 'AQ-' + r.id + (v === 'A' ? '' : '-' + v), type: t, raisedBy: name, raised: r.raised, status: open ? (r._qs || (days >= 7 ? 'Escalated' : 'Pending')) : REQ_STATUS[r.status], escalated: open && !r._qs && days >= 7, override: r._override, first: t === 'Learner profile change' ? 'Owen Price' : 'Rachel Hughes', related: [`${name} · ${r.target}${r.module ? ' — ' + r.module : ''}`, 'a-learners.' + w.me.id + '.requests'], reason: r.reason, decidedBy: open ? null : r.status === 'Cancelled' ? name + ' (learner — cancelled)' : 'Rachel Hughes', decision: r.decision, req: r, v, tbd: null, history: [[name, r.raised, 'Raised', r.reason]].concat(r.decided && !r._hist ? [['Rachel Hughes', r.decided, r.status, r.decision]] : []).concat(r._hist || []), notes: qNotesOf('AQ-' + r.id + (v === 'A' ? '' : '-' + v)) });
    });
    if (w.admission && v === 'B' && ad0(w) !== 'Sign-up in progress') {
      const ad = w.admission, open = ['Awaiting review', 'Pending — Documents Required', 'Under Review'].includes(ad.status);
      out.push({ id: 'AQ-ADM-' + v, type: 'Admission application', raisedBy: name, raised: ad.history[0][1], status: open ? 'Pending' : ad.status === 'Approved' ? 'Approved' : ad.status === 'Rejected' ? 'Rejected' : 'Returned to Requester', decidedBy: open ? null : ad.reviewer, decision: open ? null : 'Admission ' + ad.status.toLowerCase(), first: ad.reviewer.replace(' (Admissions)', ''), related: [`${name} · ${w.nvq.title}`, 'a-admissions.APP-' + v], reason: 'Online application', v, adm: true, data: { checklist: `${w.docs.filter(d => d.mand && d.status === 'Approved').length} of ${w.docs.filter(d => d.mand).length} mandatory documents approved` }, history: ad.history.map(h => [name, h[1], h[0], '']).concat(ad._hist || []), notes: qNotesOf('AQ-ADM-' + v) });
    }
    (w.docs || []).filter(d => (d.status === 'Submitted' || d.replacement) && d.versions.length).forEach(d => out.push({ id: 'AQ-DOC-' + v + '-' + d.id, type: 'Replace / re-upload document', raisedBy: name, raised: (d.replacement && d.replacement.uploaded) || d.uploaded || D(-2), status: 'Pending', first: (w.admission && w.admission.reviewer ? w.admission.reviewer.replace(' (Admissions)', '') : 'Rachel Hughes'), related: [`${name} · ${d.name}`, 'a-admissions.APP-' + v], reason: d.replacement ? `Replacement uploaded: ${d.replacement.file} (current document stays valid)` : `Uploaded ${d.file}`, v, doc: d, history: [[name, d.uploaded || D(-2), 'Uploaded', d.file]].concat(d._hist || []), notes: qNotesOf('AQ-DOC-' + v + '-' + d.id) }));
  });
  return out;
}
/* G4: final display names (internal type keys kept so filters, links and role scopes keep working) */
const QLBL = { 'Admission application': 'Admission', 'Replace / re-upload document': 'Document replacement', 'Learner profile change': 'Profile change', 'Resubmission limit reached': 'Resubmission limit', 'Discontinue enrolment — academic': 'Discontinue (academic)', 'Reactivate enrolment — academic': 'Reactivate (academic)', 'Discontinue enrolment — non-payment': 'Discontinue / reactivate (non-payment)', 'More time on short course': 'More time on a short course', 'Bundle price below minimum': 'Bundle price below minimum', 'Link existing learner to agency': 'Agency link (course already enrolled)', 'Agency invoice (offline) purchase': 'Agency invoice purchase' };
const qLbl = t => QLBL[t] || t;
const REMIND_TYPES = ['Data correction', 'Discount rate change'];
// Reviewer notes on queue items live with the queue (keyed by item id). Reading the queue never writes onto a learner's own records (S4b: was d._notes / ad._notes / r._notes).
const qNotesOf = id => ((STORE.qNotes = STORE.qNotes || {})[id] = STORE.qNotes[id] || []);
function allQueue() {
  const items = ADMIN.queue.concat(derivedQueue());
  items.forEach(i => { const open = isOpen(i); i.days = open ? Math.max(0, -daysTo(i.raised)) : null; if (open && i.days >= 7 && i.status === 'Pending') { if (REMIND_TYPES.includes(i.type)) { if (!i.reminder) { i.reminder = true; const to = i.stage === 'final' || i.type === 'Discount rate change' ? 'Super Administrator' : i.first; if (to === 'Super Administrator' && ADMIN.myNotifs) ADMIN.myNotifs.unshift({ t: 'Reminder: ' + qLbl(i.type) + ' waiting 7 days', b: i.id + ' · ' + i.related[0], at: now().toISOString(), unread: true, go: 'a-queue.' + i.id }); else if (typeof sysNotify === 'function') sysNotify('Reminder: ' + qLbl(i.type) + ' waiting 7 days', i.id + ' · ' + i.related[0], 'a-queue.' + i.id, to); } } else { i.status = 'Escalated'; i.escalated = true; } } });
  if (ADMIN.edge === 'emptyQueue') return items.filter(i => !isOpen(i));
  return items;
}
const OPEN_ST = ['Pending', 'Info Requested', 'Escalated'];
const isOpen = i => OPEN_ST.includes(i.status);
const isMine = i => i.raisedBy === ADMIN.me.name;
function awaitingMe(i) { return isOpen(i) && (i.escalated || i.finalSuper || i.first === 'Super Administrator' || i.first === ADMIN.me.name || (ADMIN.me.roles.includes('System Administrator') && i.first === 'Owen Price') || (ADMIN.me.roles.includes('Finance Admin') && ['Refund', 'Agency invoice (offline) purchase'].includes(i.type))); }
function selfBlocked(i) { return i.type !== 'Super Admin own action' && (isMine(i) || i.first === ADMIN.me.name && i.finalSuper); }
