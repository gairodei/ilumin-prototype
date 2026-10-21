// CB3 — Offer Letter & Documents (21 Oct 2026, PD-CB-20…24). Section 6 holds the offer letter (the course contract — no separate
// contract) and the one required-documents checklist. Letter: versions, preview, restore as a new version, signed copies frozen;
// applicants get the version current at the start of their sign-up. Checklist: versioned with a readable history; applicants keep
// their pinned version; the CH-8 quick picks are not an editor. Each check acts through the screen or the handler, with negatives.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB3 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const cur = () => (q('.cb-sec.cur') || { dataset: {} }).dataset.tab, pan = () => (q('.cb-panels .tab[aria-selected="true"]') || { dataset: {} }).dataset.tab;
  const blocked = (a0, re) => ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const upload = (pid, text, why = 'CB3 new version') => { ACT.chLetterUp({ dataset: { id: pid } }); if (!MODAL) return false; ACT.chLetterSample(); if (text) document.querySelector('#lt-x').value = text; return reason(why); };
  // A learner without an NVQ starts a sign-up (the letter version is fixed then) and, optionally, signs
  const startSignup = (v, pid) => { learner(v); go('browse'); const pr = s3Pr(pid), c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); prim(); const w = W; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); chLetterFor(w); return w; };
  const sign = w => { setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); return w; };

  await T('CB3-A Section 6 is "Offer Letter & Documents" — the offer letter is the course contract', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-L3', tab: 'documents' });
    ok('CB3-A section 6 is named "Offer Letter & Documents" in the section bar and heading', /Offer Letter & Documents/.test(q('.cb-sec[data-tab="documents"]').textContent) && /Offer Letter & Documents/.test(q('.cb-h').textContent));
    ok('CB3-A two separate areas: "Offer letter" and "Required enrolment documents"', qa('.cb-panels .tab').map(t => t.textContent).join('|') === 'Offer letter|Required enrolment documents');
    ok('CB3-A the letter is stated as the course contract; no separate contract card, entity or signing step is offered', /This offer letter is the course contract/.test(main()) && /there is no separate contract to sign/.test(main()) && !q('.cb-contract') && !/Learner contract/.test(main()) && !qa('[data-act]').some(b => /contract/i.test(b.dataset.act)));
    ok('CB3-A old links still open the right area (.letter, .docs)', (go('a-programmes', { id: 'NV-L3', tab: 'docs' }), cur() === 'documents' && pan() === 'docs') && (go('a-programmes', { id: 'NV-L3', tab: 'letter' }), pan() === 'letter'));
  });

  await T('CB3-B a new course receives its first offer-letter version', async () => {
    fresh(); SYS(); go('a-programmes'); ACT.chProgNew(); const f = (s, v) => { document.querySelector(s).value = v; };
    f('#np-t', 'Level 4 CB3 Letters'); f('#np-l', 'Level 4'); INP.r1NpLevel(document.querySelector('#np-l')); f('#np-code', 'L4-CB3'); f('#np-r', 'QN 610/3333/4'); f('#np-p', '2400'); document.querySelector('#np-obs-no').checked = true; ACT.cbDetCreate();
    const pr = (STORE.chNewProgs || []).slice(-1)[0]; go('a-programmes', { id: pr.id, tab: 'letter' });
    ok('CB3-B before its first version: "No offer letter uploaded yet" with Upload offer letter; Review blocks publishing', !chLetterCur(pr.id) && /No offer letter uploaded yet/.test(main()) && !!q('[data-act="chLetterUp"]') && ch8Check(pr).block.includes('No offer letter uploaded'));
    q('[data-act="chLetterUp"]').click(); ok('CB3-B the upload starts from the standard Academy letter text (existing wording)', document.querySelector('#lt-x').value === CH_LETTER_TEXT.join('\n\n')); ACT.chLetterSample(); reason('First version');
    ok('CB3-B Version 1 is current, with the standard text and an audit entry; the Review blocker is gone', chLetterCur(pr.id).v === 1 && JSON.stringify(chLetterCur(pr.id).text) === JSON.stringify(CH_LETTER_TEXT) && ADMIN.audit.some(a => a.action === 'Offer letter uploaded' && a.after === 'Version 1') && !ch8Check(pr).block.includes('No offer letter uploaded'));
  });

  await T('CB3-C authorized edits make new versions; earlier versions are kept and browsable', async () => {
    fresh(); ACA(); const v0 = chLetters('NV-L3').length, t1 = JSON.stringify(chLetters('NV-L3')[0]);
    upload('NV-L3', 'Dear {{full_name}}, revised paragraph one.\n\nSecond paragraph for {{programme}}.', 'Revised wording');
    const l = chLetters('NV-L3'), c = chLetterCur('NV-L3');
    ok('CB3-C an Academic Admin\'s upload makes a new current version with its own text and reason', l.length === v0 + 1 && c.v === v0 + 1 && c.text.length === 2 && /revised paragraph one/.test(c.text[0]) && c.note === 'Revised wording');
    ok('CB3-C earlier versions are unchanged and frozen', JSON.stringify(l[0]) === t1 && Object.isFrozen(l[0]) && Object.isFrozen(c));
    go('a-programmes', { id: 'NV-L3', tab: 'letter' }); ok('CB3-C the version history lists every version, current marked', qa('table tbody tr').filter(r => /^\d/.test(r.cells[0].textContent.trim())).length >= 2 && /Current/.test(main()));
    ACT.s4LetterPrev({ dataset: { id: 'NV-L3', v: '1' } }); ok('CB3-C an earlier version opens read-only with its own text', !!MODAL && /version 1/i.test(MODAL.title) && !/revised paragraph one/.test(document.querySelector('#modal-root').textContent)); closeModal();
    ACT.chLetterPrev({ dataset: { id: 'NV-L3' } }); ok('CB3-C the current letter previews with a sample learner', !!MODAL && /revised paragraph one/.test(document.querySelector('#modal-root').textContent)); closeModal();
  });

  await T('CB3-D signed copies stay byte-identical; new learners get the current version', async () => {
    fresh(); SA(); const v1 = chLetterCur('NV-L3').v;
    const daniel = sign(startSignup('A', 'NV-L3')), snap0 = JSON.stringify(daniel.signup.sig), copy0 = JSON.stringify(daniel.signup.sig.snapshot);
    ok('CB3-D the learner signs the current version; an exact copy (text, version) is kept with the signature', !!daniel.signup.sig && daniel.signup.sig.snapshot.v === v1 && JSON.stringify(daniel.signup.sig.snapshot.text) === JSON.stringify(chLetterCur('NV-L3').text) && Object.isFrozen(daniel.signup.sig.snapshot));
    const tom = startSignup('E', 'NV-L3'); ok('CB3-D a sign-up in progress is pinned to the version current when it started', tom.signup.letterV === v1);
    SA(); upload('NV-L3', 'Version two text for {{full_name}}.', 'New wording'); const v2 = chLetterCur('NV-L3').v;
    ACT.s4LetterRestore({ dataset: { id: 'NV-L3', v: String(v1) } }); reason('Back to the original');
    ok('CB3-D after a new version and a restore, the signed copy is byte-identical', JSON.stringify(daniel.signup.sig) === snap0 && JSON.stringify(daniel.signup.sig.snapshot) === copy0);
    ok('CB3-D …the in-progress sign-up still gets the version it started with', chLetterFor(tom).v === v1);
    const fatima = startSignup('F', 'NV-L3'); ok('CB3-D a new applicant gets the current version', fatima.signup.letterV === chLetterCur('NV-L3').v && chLetterCur('NV-L3').v === v2 + 1);
    SA(); ACT.chSignedPdf({ dataset: { v: 'A' } }); ok('CB3-D "View signed copy" shows the exact text signed, not the current version', !!MODAL && !/Version two text/.test(document.querySelector('#modal-root').textContent) && /exact text signed/.test(document.querySelector('#modal-root').textContent)); closeModal();
  });

  await T('CB3-E who received and signed each version (administrators only)', async () => {
    fresh(); SA(); sign(startSignup('A', 'NV-L3')); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    const rows = qa('.cb-signed tbody tr');
    ok('CB3-E the table counts signed copies and sign-ups in progress for each version', !!q('.cb-signed') && /Signed/.test(q('.cb-signed thead').textContent) && /Sign-ups in progress/.test(q('.cb-signed thead').textContent) && rows.length >= 1);
    // CB3 correction (PD-CB-25) supersedes "View signed copy" for every signer: only a saved exact copy is offered as one
    ok('CB3-E the signatures list the learners who signed (Aisha Rahman, seeded; Daniel Okafor, now) with the version; "View signed copy" only where the exact copy was saved', /Aisha Rahman/.test(q('.cb-signed').textContent) && /Daniel Okafor/.test(q('.cb-signed').textContent) && !!q('.cb-signed tr[data-k="A"] [data-act="chSignedPdf"]') && !q('.cb-signed tr[data-k="C"] [data-act="chSignedPdf"]'));
    go('a-programmes', { id: 'NV-L2', tab: 'letter' }); ok('CB3-E …per programme (Level 2: Grace Mensah)', /Grace/.test(q('.cb-signed').textContent) && !/Daniel Okafor/.test(q('.cb-signed').textContent));
    BA(); const h = cbSignedCard(s3Pr('NV-L3'));
    ok('CB3-E for someone who isn\'t a programme administrator, the card keeps the counts but shows no learner names or signed copies', /Signed/.test(h) && !/Aisha Rahman|Daniel Okafor/.test(h) && !/data-act="chSignedPdf"/.test(h) && /programme administrators only/.test(h));
    FA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' }); ok('CB3-E (negative) Finance can\'t open the programme page or its signed copies list', /permission/i.test(main()) && !q('.cb-signed'));
  });

  await T('CB3-F restoring an earlier version makes a NEW version', async () => {
    fresh(); SYS(); upload('NV-L3', 'Second wording.', 'Second'); const l = chLetters('NV-L3'), n0 = l.length, old = JSON.stringify(l[0]);
    ACT.s4LetterRestore({ dataset: { id: 'NV-L3', v: '1' } }); reason('Restore original');
    const c = chLetterCur('NV-L3');
    ok('CB3-F the restore adds version N+1 with version 1\'s text and file, recording where it came from', chLetters('NV-L3').length === n0 + 1 && c.v === n0 + 1 && c.from === 1 && JSON.stringify(c.text) === JSON.stringify(l[0].text) && c.file === l[0].file && /Restored from version 1/.test(c.note));
    ok('CB3-F version 1 and the version it replaced stay exactly as they were', JSON.stringify(chLetters('NV-L3')[0]) === old && /Second wording/.test(chLetters('NV-L3')[n0 - 1].text[0]));
  });

  await T('CB3-G required enrolment documents: one checklist, versioned with a readable history', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-L3', tab: 'docs' });
    ok('CB3-G the checklist shows mandatory / optional, formats, maximum size, expiry, region, guidance and status', ['Mandatory', 'Formats', 'Max size', 'Has expiry', 'Applies to', 'Guidance', 'Status'].every(h => q('.s4-ck thead').textContent.includes(h)));
    ok('CB3-G Version history starts with the list in use before versions were kept', !!q('.cb-ckhist') && /Version 1/.test(q('.cb-ckhist').textContent) && /before checklists were versioned/.test(q('.cb-ckhist').textContent));
    const pri = JSON.stringify(STORE.worlds.B.docs), v1 = s4List('NV-L3').v, items1 = JSON.stringify(s4List('NV-L3').items);
    const tom = startSignup('E', 'NV-L3'); const tv = tom.signup.checklistV, tdocs = JSON.stringify(tom.docs); SA(); go('a-programmes', { id: 'NV-L3', tab: 'docs' });
    q('[data-act="s4CkAdd"]').click(); document.querySelector('#ck-n').value = 'CB3 safeguarding certificate'; document.querySelector('#ck-m').value = '0'; document.querySelector('#ck-g').value = 'If you have one.'; reason('Optional extra');
    const L = s4List('NV-L3');
    ok('CB3-G adding a document makes Version 2; the history keeps a read-only copy of Version 1 and of Version 2', L.v === v1 + 1 && cbCkHist('NV-L3').some(x => x.v === v1 && JSON.stringify(x.items) === items1) && cbCkHist('NV-L3').some(x => x.v === L.v && x.items.some(i => i.name === 'CB3 safeguarding certificate')) && cbCkHist('NV-L3').every(x => Object.isFrozen(x) && Object.isFrozen(x.items)));
    q('.cb-ckhist [data-act="cbCkView"][data-v="' + v1 + '"]').click(); ok('CB3-G "View" opens Version 1 read-only, without the new document', !!MODAL && /version 1/i.test(MODAL.title) && !/CB3 safeguarding certificate/.test(document.querySelector('#modal-root').textContent) && /Read-only/.test(document.querySelector('#modal-root').textContent)); closeModal();
    const it = L.items.findIndex(i => i.name === 'CB3 safeguarding certificate'); ACT.s4CkRetire({ dataset: { p: 'NV-L3', i: String(it) } }); reason('Not needed');
    ok('CB3-G retiring it makes Version 3, also kept (the item stays, retired)', s4List('NV-L3').v === v1 + 2 && cbCkHist('NV-L3').some(x => x.v === v1 + 2 && x.items.some(i => i.name === 'CB3 safeguarding certificate' && i.status === 'Retired')));
    ok('CB3-G the applicant who started on Version 1 keeps Version 1 and their documents; Priya\'s seeded documents unchanged', tom.signup.checklistV === tv && tv === v1 && JSON.stringify(tom.docs) === tdocs && JSON.stringify(STORE.worlds.B.docs) === pri);
    go('a-programmes', { id: 'NV-L3', tab: 'docs' }); ok('CB3-G the history shows how many applicants are on each version', /Applicants on it/.test(q('.cb-ckhist thead').textContent) && q(`.cb-ckhist tr[data-v="${v1}"]`).cells[5].textContent.trim() !== '0');
    const fat = startSignup('F', 'NV-L3'); ok('CB3-G a new applicant gets the current checklist version', fat.signup.checklistV === s4List('NV-L3').v);
  });

  await T('CB3-H the CH-8 quick-pick list is not a second editor', async () => {
    fresh(); SYS(); go('a-programmes', { id: 'NV-N1', tab: 'docs' });
    ok('CB3-H a new programme\'s documents: only the Required enrolment documents list (no quick-pick checkboxes, no "Save checklist")', !q('.ch8-doc') && !q('[data-act="ch8SaveDocs"]') && !!q('.s4-ck [data-act="s4CkAdd"][data-p="NV-N1"]'));
    const L0 = JSON.stringify(s4List('NV-N1')), m0 = JSON.stringify(STORE.chProgDocs['NV-N1']), a0 = ADMIN.audit.length;
    const box = document.createElement('input'); box.type = 'checkbox'; box.className = 'ch8-doc'; box.value = 'Employer reference letter'; box.checked = true; document.body.appendChild(box);
    ACT.ch8SaveDocs({ dataset: { id: 'NV-N1' } }); box.remove();
    ok('CB3-H saving the old list directly is refused and logged; the checklist and its mirror are unchanged', JSON.stringify(s4List('NV-N1')) === L0 && JSON.stringify(STORE.chProgDocs['NV-N1']) === m0 && blocked(a0, /legacy checklist/));
    ACT.s4CkAdd({ dataset: { p: 'NV-N1' } }); document.querySelector('#ck-n').value = 'Employer reference letter'; document.querySelector('#ck-m').value = '0'; reason('Optional');
    ok('CB3-H the old list only mirrors the real one (what the review step reads)', STORE.chProgDocs['NV-N1'].includes('Employer reference letter') && s4List('NV-N1').items.some(i => i.name === 'Employer reference letter'));
  });

  await T('CB3-I authorization: letters and checklists', async () => {
    const st = () => JSON.stringify({ l: STORE.chLetters, c: STORE.s4 && STORE.s4.lists });
    const tries = [['chLetterUp', { id: 'NV-L3' }], ['s4LetterRestore', { id: 'NV-L3', v: '1' }], ['s4CkAdd', { p: 'NV-L3' }], ['s4CkEdit', { p: 'NV-L3', i: '0' }], ['s4CkRetire', { p: 'NV-L3', i: '0' }], ['s4CkMove', { p: 'NV-L3', i: '1', d: '-1' }], ['ch8SaveDocs', { id: 'NV-N1' }]];
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', () => learner('A')]].forEach(([who, enter]) => {
      const bad = []; tries.forEach(([a, ds]) => { fresh(); enter(); const s0 = st(), a0 = ADMIN.audit.length; ACT[a]({ dataset: ds }); if (MODAL) reason('direct'); if (st() !== s0 || !blocked(a0)) bad.push(a); closeModal(); });
      ok(`CB3-I ${who}: every letter and checklist action refused and logged, nothing changed`, !bad.length, bad.join());
    });
    fresh(); SA(); const s0 = st(), a0 = ADMIN.audit.length; tries.slice(0, 6).forEach(([a, ds]) => { ACT[a]({ dataset: { ...ds, id: ds.id && 'NV-L3O', p: ds.p && 'NV-L3O' } }); if (MODAL) reason('direct'); closeModal(); });
    ok('CB3-I retired programme: letter and checklist actions refused (logged), nothing changed', st() === s0 && blocked(a0, /retired/));
    go('a-programmes', { id: 'NV-L3O', tab: 'docs' }); ok('CB3-I retired: the checklist and its history are read-only (no Add / Edit / Retire), History "View" still works', !q('[data-act="s4CkAdd"], [data-act="s4CkEdit"], [data-act="s4CkRetire"]') && !!q('.cb-ckhist [data-act="cbCkView"]'));
    fresh(); SYS(); go('a-programmes', { id: 'NV-N2', tab: 'docs' }); const a1 = ADMIN.audit.length; ACT.s4CkAdd({ dataset: { p: 'NV-N2' } });
    ok('CB3-I published new programme: its checklist is Super Admin only (S4a rule kept) — the System Admin is refused and logged', !MODAL && blocked(a1) && !q('.s4-ck [data-act="s4CkAdd"]'));
    SA(); go('a-programmes', { id: 'NV-N2', tab: 'docs' }); ok('CB3-I …the Super Admin can edit it', !!q('.s4-ck [data-act="s4CkAdd"]'));
    [['System Admin', SYS], ['Academic Admin', ACA], ['Super Admin', SA]].forEach(([who, enter]) => { fresh(); enter(); const n0 = chLetters('NV-L2').length; upload('NV-L2', 'Text for ' + who, who); ok(`CB3-I ${who}: can upload a letter version (seeded programme)`, chLetters('NV-L2').length === n0 + 1); });
    fresh(); SA(); go('a-programmes', { id: 'NV-L4', tab: 'letter' }); ok('CB3-I suspended programme: letter upload available as for a published one (no Suspended rule exists)', s3Pr('NV-L4').status === 'Suspended' && !!q('[data-act="chLetterUp"]'));
  });

  await T('CB3-J saved signed copies versus historical template-only records', async () => {
    fresh(); const aisha = STORE.worlds.C, sig0 = JSON.stringify(aisha.signup.sig), v1 = JSON.stringify(chLetters('NV-L3')[0]);
    const aud = () => JSON.stringify(ADMIN.audit.filter(a => String(a.entity || '').includes(aisha.me.id)).map(a => [a.action, a.before, a.after, a.reason])), aud0 = aud();
    const daniel = sign(startSignup('A', 'NV-L3')); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    const rowA = q('.cb-signed tr[data-k="A"]'), rowC = q('.cb-signed tr[data-k="C"]');
    ok('CB3-J the signatures table marks Daniel "Exact signed copy saved" with "View signed copy"', /Exact signed copy saved/.test(rowA.textContent) && /View signed copy/.test(rowA.textContent) && !!rowA.querySelector('[data-act="chSignedPdf"]'));
    ok('CB3-J …and Aisha "Template only — exact copy not kept" with "View historical template" (never "View signed copy")', /Template only — exact copy not kept/.test(rowC.textContent) && /View historical template/.test(rowC.textContent) && !rowC.querySelector('[data-act="chSignedPdf"]') && !/View signed copy/.test(rowC.textContent));
    const vrow = q(`.cb-signed tr[data-v="${chLetterCur('NV-L3').v}"]`);
    ok('CB3-J the version table counts saved copies and template-only records separately', /exact copy saved/.test(q('.cb-signed thead').textContent) && /template only/.test(q('.cb-signed thead').textContent) && vrow.cells[1].textContent.trim() === '1' && vrow.cells[2].textContent.trim() === '1');
    rowC.querySelector('[data-act="cbHistTemplate"]').click(); const m = () => document.querySelector('#modal-root');
    ok('CB3-J "View historical template": titled as a template, says it is not the signed copy and that the exact copy wasn\'t kept', !!MODAL && /Historical template — offer letter version 1/.test(MODAL.title) && /not the learner's signed copy/.test(m().textContent) && /wasn't retained/.test(m().textContent));
    ok('CB3-J …nothing personal is filled in: merge fields stay placeholders, no signature block, no payment terms', /\{\{full_name\}\}/.test(m().querySelector('.ch-letter').textContent) && !/Aisha Rahman/.test(m().querySelector('.ch-letter').textContent) && !/Signed electronically/.test(m().textContent) && !m().querySelector('.ch-sigblock'));
    ok('CB3-J …the recorded signature metadata is shown exactly as stored (name typed, time, IP, version)', m().querySelector('.cb-sigrec').textContent.includes(aisha.signup.sig.name) && m().querySelector('.cb-sigrec').textContent.includes(aisha.signup.sig.ip) && /Version 1/.test(m().querySelector('.cb-sigrec').textContent) && /Not kept/.test(m().querySelector('.cb-sigrec').textContent)); closeModal();
    ACT.chSignedPdf({ dataset: { v: 'C' } }); ok('CB3-J opening Aisha\'s "signed PDF" from anywhere shows the historical template, never a signed copy', !!MODAL && /Historical template/.test(MODAL.title) && !/^Signed offer letter$/.test(MODAL.title)); closeModal();
    ACT.chSignedPdf({ dataset: { v: 'A' } }); ok('CB3-J Daniel\'s genuine copy: "Signed offer letter" with his filled-in name and the signature block', !!MODAL && MODAL.title === 'Signed offer letter' && /Daniel Okafor/.test(m().querySelector('.ch-letter').textContent) && !!m().querySelector('.ch-sigblock')); closeModal();
    SA(); ACT.chLetterUp({ dataset: { id: 'NV-L3' } }); ACT.chLetterSample(); document.querySelector('#lt-x').value = 'A completely new version.'; reason('New'); ACT.s4LetterRestore({ dataset: { id: 'NV-L3', v: '1' } }); reason('Restore');
    ok('CB3-J after a new version and a restore: Aisha\'s signature record, version 1 and her audit history unchanged; version 1 frozen', JSON.stringify(aisha.signup.sig) === sig0 && JSON.stringify(chLetters('NV-L3')[0]) === v1 && Object.isFrozen(chLetters('NV-L3')[0]) && aud() === aud0);
    ACT.cbHistTemplate({ dataset: { v: 'C' } }); ok('CB3-J …her historical template is still version 1, not the new current version', /version 1/.test(MODAL.title) && !/A completely new version/.test(m().textContent)); closeModal();
    go('a-admissions', { id: 'APP-C' }); ok('CB3-J the application\'s sign-up summary uses the accurate wording for Aisha', /View historical template/.test(main()) && /exact signed copy wasn't kept/.test(main()) && !/View signed PDF/.test(main()));
    go('a-admissions', { id: 'APP-A' }); ok('CB3-J …and keeps "View signed PDF" for Daniel\'s saved copy', /View signed PDF/.test(main()) && !/View historical template/.test(main()));
    learner('C'); go('admission'); ok('CB3-J Aisha\'s own Admission & Documents: the same accurate wording', /View historical template/.test(main()) && !/View signed PDF/.test(main()));
    ACT.cbHistTemplate({ dataset: { v: 'C' } }); ok('CB3-J …and she can open her own record', !!MODAL && /Historical template/.test(MODAL.title)); closeModal();
    const tries = [['Finance Admin', FA], ['another learner (Grace)', () => learner('D')], ['an Academic Coordinator', () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; }]];
    tries.forEach(([who, enter]) => { enter(); const a0 = ADMIN.audit.length; ACT.chSignedPdf({ dataset: { v: 'C' } }); const m1 = !!MODAL; closeModal(); ACT.cbHistTemplate({ dataset: { v: 'C' } }); const m2 = !!MODAL; closeModal(); ACT.chSignedPdf({ dataset: { v: 'A' } }); const m3 = !!MODAL; closeModal();
      ok(`CB3-J (negative) ${who}: refused to open either learner's letter (signed copy or historical template), logged`, !m1 && !m2 && !m3 && blocked(a0, /view (signed offer letter|historical offer letter template)/)); });
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
