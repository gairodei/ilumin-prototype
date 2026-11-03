// SIB-FINAL A — System Admin: Observation Criteria Library (SYS-01), referrals (SYS-02), Learning Repository (SYS-03).
// suites.sh runs it with FIXTURE=client. Phase 0: client demo as the System Administrator, Super Administrator and other roles.
// Phase 1: the legacy fixture (same explanations; counts from the resource store).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sib-a.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sib-a.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-sib-a.R', J(R)); SS.setItem('ft-sib-a.phase', String(ph)); location.reload(); };
  const card = sel => (($1('main ' + sel) || {}).textContent || '').replace(/\s+/g, ' ');

  if (PH === 0) {
    await T('SIB-A SYS-01 library (client)', async () => {
      pick('sys'); go('k-ocl'); const c = card('.sib-ocl-how');
      ok('SYS-01 the library explains the workflow in order: category → criteria → evidence → publish → select in the programme → publish the programme → observation', ['Create a category', 'Add criteria', 'Configure evidence', 'Publish the category', 'Select it in a programme', 'Publish the programme version', 'Used in the learner\'s observation'].every((x, i, arr) => c.includes(x) && (!i || c.indexOf(arr[i - 1]) < c.indexOf(x))));
      ok('SYS-01 a category holds several criteria; criteria are created only here; evidence types per criterion and required ones', /groups related criteria/.test(c) && /Criteria are only created here/.test(c) && /assessor notes, photos, videos, documents, authorised references/.test(c) && /which are required/.test(c));
      ok('SYS-01 Workplace versus Academy office, and "Same as Workplace" with exclusions', /Workplace Observation Criteria/.test(c) && /Academy Observation Criteria/.test(c) && /Same as Workplace/.test(c) && /excluded one by one/.test(c));
      ok('SYS-01 library versions and frozen programme snapshots', /frozen version/.test(c) && /frozen into that version/.test(c) && /never changes published programme versions/.test(c));
      ok('SYS-01 qualification (NVQ) criteria versus Academy internal standards', /Qualification \(NVQ\) criteria/.test(c) && /internal standards/.test(c) && /never replace qualification criteria/.test(c));
      ok('SYS-01 who manages it — including the System Administrator — matches the permission in force', /System Administrators create, edit and publish/.test(c) && ol1CanEdit() === true && !!$1('main [data-act="ol1NewCat"], main [data-act*="Cat"]'));
      ok('SYS-01 no competing editor: the explanation adds no controls', !$a('main .sib-ocl-how button, main .sib-ocl-how input, main .sib-ocl-how select').length);
      for (const p of ['biz', 'iqa', 'fin']) { pick(p); ok(`SYS-01 (negative) ${p} can't edit the library (permission unchanged)`, !ol1CanEdit()); }
    });
    await T('SIB-A SYS-02 referrals (client)', async () => {
      const txt = {};
      for (const p of ['sys', 'super', 'biz']) { pick(p); go('a-referrals'); txt[p] = card('.sib-ref-more'); }
      ok('SYS-02 System Admin: who issues and who uses a code, where it is entered, how learners are identified and counted', /Who issues a code/.test(txt.sys) && /Who uses it/.test(txt.sys) && /Referral \/ Agent Code/.test(txt.sys) && /Attribution tab/.test(txt.sys) && /Counts are those learner records/.test(txt.sys));
      ok('SYS-02 referral versus agency-linked learners', /Not an agency link/.test(txt.sys) && /bundle seat/.test(txt.sys) && /approved link request/.test(txt.sys) && /doesn't make them that agency's learner/.test(txt.sys));
      ok('SYS-02 the limitations are labelled: no public link, placeholder domain, not a paid enrolment, no commission or payout', /no public referral link/.test(txt.sys) && /placeholder domain/.test(txt.sys) && /not a paid enrolment/.test(txt.sys) && /no commissions, rewards or payouts/.test(txt.sys) && /client decision/.test(txt.sys));
      ok('SYS-02 System Admin, Super Admin and Business Admin show the same explanation', txt.sys && txt.sys === txt.super && txt.sys === txt.biz);
      pick('sys'); go('a-referrals'); ok('SYS-02 the System Administrator can issue codes (Generate code) and sees the How-it-works steps', !!$1('main [data-act="newRef"]') && /How referral codes work/.test(main()) && !s5dRefWhy());
      click($1('main [data-act="newRef"]')); $1('#rf-o').value = 'SIB Agent'; const press = () => { const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); const r = a.fn(); if (r !== false) closeModal(); }; press(); const code = ADMIN.referrals[0].code;
      pick('super'); go('a-referrals'); const sa = $a('main tr').find(r => r.textContent.includes(code)); pick('sys'); go('a-referrals'); const sy = $a('main tr').find(r => r.textContent.includes(code));
      ok('SYS-02 a code issued by the System Administrator shows the same record to the Super Administrator', !!sa && !!sy && sa.textContent.replace(/\s+/g, ' ') === sy.textContent.replace(/\s+/g, ' '));
    });
    await T('SIB-A SYS-03 repository (client)', async () => {
      pick('sys'); go('a-resources'); const c = card('.sib-res-how'), Rz = S4B().res;
      ok('SYS-03 repository versus programme content, and the Programme Builder link', /one place where learning resources are kept/.test(c) && /Resources & Delivery/.test(c) && /Assignments, not here/.test(c));
      ok('SYS-03 lifecycle: Draft → Publish → New version → Unpublish / retire, history kept', ['Add', 'Publish', 'New version', 'Unpublish or retire'].every(x => c.includes(x)) && /starts as a Draft/.test(c) && /nothing is deleted/.test(c));
      ok('SYS-03 types, release rules, Coordinator batch release, roles, learner access, SCORM demo', /PDF, DOCX, PPT, Vimeo video, SCORM package and web link/.test(c) && /immediately, on a date, or after a module is complete/.test(c) && /Coordinator can change a resource's release for their own batch/.test(c) && /no separate approval step/.test(c) && /access log/.test(c) && /SCORM is a demonstration only/.test(c));
      ok('SYS-03 the counts come from the resource store (client demo: 2 published, on Module 1)', c.includes(`${Rz.length} resource`) && Rz.length === 2 && /2 published/.test(c) && /Module|M1/.test(c), c.slice(-220));
      ok('SYS-03 the System Administrator can manage resources (permission in force)', s4bAdmin() === true && !!$1('main [data-act="aUpload"]') && !!$1('main [data-act="s4bPub"], main [data-act="s4bUnpub"]'));
      for (const p of ['biz', 'iqa']) { pick(p); go('a-resources'); ok(`SYS-03 (negative) ${p} gets no repository management`, !s4bAdmin() && !$1('main .sib-res-how')); }
    });
    signOutUI(); next(1); return;
  }

  if (PH === 1) {
    await T('SIB-A legacy', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('SY'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
      if (!isSys()) { ACT.demoSignInAsSys && ACT.demoSignInAsSys({ dataset: { v: 'SY' } }); code2fa(); }
      go('k-ocl'); ok('SYS-01 legacy: the library explanation is shown', /How the Observation Criteria Library works/.test(main()));
      go('a-resources'); const c = card('.sib-res-how'), Rz = S4B().res;
      ok('SYS-03 legacy: counts from the store, older short-course items named', c.includes(`${Rz.length} resource`) && Rz.some(r => r.legacy) && /older short-course item/.test(c), c.slice(-260));
      go('a-referrals'); ok('SYS-02 legacy: the referral explanation is shown with the codes', /Referral codes, agency learners and what referrals don't do/.test(main()) && ADMIN.referrals.length > 5);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-sib-a.phase'); SS.removeItem('ft-sib-a.R');
})();
