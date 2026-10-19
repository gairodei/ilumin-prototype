(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('#app') || {}).textContent || '';
  const fill = v => { Object.entries(v).forEach(([k, x]) => { const el = $(k); if (el.type === 'checkbox') el.checked = x; else el.value = x; }); };
  T('sign-in shows Create an account', () => { signOut && S.signedIn && signOut(); S.signedIn = false; S.portal = 'learner'; S.auth = 'signin'; render(); ok('link present', !!$('[data-act="regStart"]')); ok('registration TBD gone', !/registration out of scope/.test(document.getElementById('app').innerHTML)); });
  T('referral link prefills + locks', () => { ACT.regLink(); ok('code prefilled', $('#rg-ref').value === 'WB-FATIMA07' && $('#rg-ref').readOnly); ok('valid shown', /Valid code/.test(main())); });
  T('live code states', () => { ACT.regStart(); const el = $('#rg-ref'); el.value = 'EHHS-AGENT-02'; INP.regRef(el); ok('expired', /expired/.test($('#rg-ref-st').textContent)); el.value = 'XYZ-000'; INP.regRef(el); ok('not found', /not found/.test($('#rg-ref-st').textContent)); });
  T('duplicate blocked', () => { ACT.regStart(); fill({ '#rg-name': 'Test Person', '#rg-email': 'aisha.rahman@gmail.example', '#rg-mob': '7700 911222', '#rg-country': 'United Kingdom', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x', '#rg-terms': true, '#rg-priv': true }); SUBMIT.regSubmit(); ok('An account already exists', /An account already exists/.test(main())); });
  T('consents mandatory', () => { ACT.regStart(); fill({ '#rg-name': 'Arjun Mehta', '#rg-email': 'arjun.mehta@in.example', '#rg-mob': '98200 11223', '#rg-country': 'India', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x', '#rg-terms': true, '#rg-priv': false }); SUBMIT.regSubmit(); ok('privacy required', /privacy consent/i.test(main())); });
  T('register India via referral link → OTP → welcome → dashboard', () => {
    const before = ADMIN.referrals.find(r => r.code === 'WB-FATIMA07').regs;
    ACT.regLink(); fill({ '#rg-name': 'Arjun Mehta', '#rg-email': 'arjun.mehta@in.example', '#rg-dial': '+91', '#rg-mob': '98200 11223', '#rg-country': 'India', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x', '#rg-terms': true, '#rg-priv': true }); SUBMIT.regSubmit(); MODAL.actions.find(a => a.label === 'Confirm').fn(); /* CH-01: confirm the country */
    ok('verify screen', S.auth === 'regVerify' && /Verify your account/.test(main())); ok('code email in inbox', STORE.agy.lmails[0].email === 'arjun.mehta@in.example' && /123456/.test(STORE.agy.lmails[0].html));
    $$('.otp-i').forEach((b, i) => b.value = '111111'[i]); SUBMIT.regCode(); ok('wrong code', /incorrect/.test(main()));
    $$('.otp-i').forEach((b, i) => b.value = '000000'[i]); SUBMIT.regCode(); ok('expired code', /expired/.test(main()));
    ACT.regVia(); ok('SMS option', /by SMS/.test(main()) && /SMS/.test(STORE.agy.lmails[0].by));
    $$('.otp-i').forEach((b, i) => b.value = '123456'[i]); SUBMIT.regCode(); ok('welcome', S.auth === 'welcome' && /Arjun/.test(main()));
    ACT.finishWelcome(); ok('dashboard', S.route === 'dashboard' && S.signedIn); ok('world G pays in GBP (CH-02)', W.me.cur === 'GBP');
    go('browse'); ok('browse in GBP (CH-02)', /£/.test(main()) && !/₹/.test(main()), (main().match(/£[\d,.]+/) || [''])[0]);
    ok('referral count +1', ADMIN.referrals.find(r => r.code === 'WB-FATIMA07').regs === before + 1);
    const L = allLearners().find(l => l.email === 'arjun.mehta@in.example'); ok('in admin learners (CH-02 GBP, CH-03 region UK)', !!L && L.country === 'India' && L.cur === 'GBP' && L.region === 'UK', L && (L.country + ' ' + L.cur + ' ' + L.region));
  });
  T('too many attempts + pending verification', () => { ACT.regStart(); fill({ '#rg-name': 'Lena Brook', '#rg-email': 'lena.brook@uk.example', '#rg-mob': '7700 955111', '#rg-country': 'United Kingdom', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x', '#rg-terms': true, '#rg-priv': true }); SUBMIT.regSubmit(); MODAL.actions.find(a => a.label === 'Confirm').fn(); /* CH-01: confirm the country */ for (let k = 0; k < 3; k++) { $$('.otp-i').forEach((b, i) => b.value = '222222'[i]); SUBMIT.regCode(); } ok('locked', /Too many attempts/.test(main()));
    S.auth = 'signin'; render(); $('#si-email').value = 'lena.brook@uk.example'; $('#si-pw').value = 'x'; SUBMIT.signin(); ok('pending verification on sign-in', S.auth === 'regVerify' && /Pending verification/.test(main())); });
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
