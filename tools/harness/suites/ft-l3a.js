// L3-A — signed offer-letter issuer integrity, client demo (suites.sh runs it with FIXTURE=client; a real reload, then Reset).
// The demo's Self-Paced and Fully Assisted learners signed through the real sign-up at build: their frozen copies now carry the issuer
// and contract. Lena signs a Fully Assisted letter by clicking. The current issuer record, the letter template and her name then
// change: signed letters still show what was signed, while an unsigned letter shows the change. Copies saved before L3-A (no issuer)
// and records with no copy are shown with the as-built issuer, labelled, and never rewritten. Other learners and portals are refused.
(async function () {
  // P3 (PD-P3-02): the learner chooses their batch on sign-up step 1. Fixtures that relied on the automatic (CH-42) assignment now pick, on
  // the page, the earliest eligible batch (the one CH-42 assigned); a batch the fixture already set, and that is still eligible, is kept
  const p3Pick = () => { const w = W; if (!w || !p3Open(w) || chStepKey(w) !== 'details' || ui('suBatch', null) || (w.signup.batch && !p3Why(w, chBatch(w.signup.batch), { region: w.signup.l3cPin !== w.signup.batch }))) return; const r = S.route === 'admission' && document.querySelector('main input[name="su-batch"]'); if (r) { r.checked = true; INP.suBatch(r); } else { const b = p3Eligible(w)[0]; if (b) setUi('suBatch', b.code); } };
  const SS = window.sessionStorage, K = 'ft-l3a.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const mtxt = () => ($1('#modal-root') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const view = v => { lastToast = ''; closeModal(); ACT.chSignedPdf({ dataset: { v } }); const t = MODAL ? mtxt() : ''; closeModal(); return t; };
  const snap = v => STORE.worlds[v].signup.sig.snapshot;
  const LENA = 'CD3';

  if (PH === 0) {
    await T('L3A-1 the demo learners signed through the real handler: issuer and contract in the frozen copy', async () => {
      const A = snap('CD1'), D = snap('CD2');
      ok('L3A-1a Amira (Self-Paced): issuer recorded as shown — Welfare Academy, Jenson Thomas, the declaration', !!A.issuer && A.issuer.name === 'Welfare Academy' && A.issuer.signatory === 'Jenson Thomas' && A.issuer.role === 'Admissions, Welfare Academy' && A.issuer.decl === CH_DECL, J(A.issuer));
      ok('L3A-1b Amira\'s contract: programme, fee option, Self-Paced, plan and letter version', A.contract.prog === 'NV-N1' && A.contract.optId === 'NV-N1-FO-001' && A.contract.mode === 'Self-Paced' && A.contract.letterV === A.v && A.contract.planV != null, J(A.contract));
      ok('L3A-1c Dev (Fully Assisted): the same issuer, his own fee option and mode', D.issuer.name === 'Welfare Academy' && D.contract.optId === 'NV-N1-FO-002' && D.contract.mode === 'Fully Assisted', J(D.contract));
      ok('L3A-1d the issuer basis says no per-option entity is configured (nothing invented)', /no per-option contracting entity/.test(A.issuer.basis));
      ok('L3A-1e the copy, issuer and contract are frozen; text, name, Student ID and payment wording kept', Object.isFrozen(A) && Object.isFrozen(A.issuer) && Object.isFrozen(A.contract) && A.text.length > 0 && A.name && A.sid === STORE.worlds.CD1.me.id && 'pay' in A);
    });

    await T('L3A-2 Lena signs a Fully Assisted offer letter by clicking', async () => {
      as('short'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } });
      const o = r1Opts('NV-N1').find(x => x.mode === 'Fully Assisted' && x.status === 'Active'), r = $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; press();
      go('admission'); $1('#su-dob').value = '1992-02-02'; $1('#su-ad').value = '5 Test Road, London'; (p3Pick(), ACT.suNext());
      fxFast(ff => { W.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); }); (p3Pick(), ACT.suNext()); go('admission');
      ok('L3A-2a the sign step shows the issuer\'s declaration and letterhead', $1('main .ch-letter .ch-lh').textContent.includes('Welfare Academy') && $1('main label.check').textContent.includes(CH_DECL));
      const s = $1('#su-sig'); s.value = chFullName(W); s.dispatchEvent(new Event('input', { bubbles: true })); click($1('#su-decl'), 'declaration'); click($1('#su-sign'), 'Sign and continue');
      const S1 = W.signup.sig && W.signup.sig.snapshot;
      ok('L3A-2b signed: the copy carries the issuer and a Fully Assisted contract', !!S1 && S1.issuer.name === 'Welfare Academy' && S1.contract.mode === 'Fully Assisted' && S1.contract.optId === o.id, S1 && J(S1.contract));
      ok('L3A-2c the signing is logged with the issuer', ADMIN.audit.some(a => a.action === 'Signed offer letter recorded' && /issued by Welfare Academy · Fully Assisted/.test(a.after)));
      SS.setItem(K + 'lena', J({ name: S1.name, v: S1.v, text: S1.text }));
    });

    await T('L3A-3 later changes to the issuer, template, programme or name don\'t change signed letters', async () => {
      as('nvq-sp'); const bA = view('CD1'); as('short'); const before = { A: bA, L: view(LENA) }, keep = { ...CH_ISSUER }, nm = STORE.worlds[LENA].me.first;
      ok('L3A-3a setup: both signed letters show Welfare Academy and Jenson Thomas', /Welfare Academy/.test(before.A) && /Jenson Thomas/.test(before.L) && /recorded with the signature/.test(before.L));
      // Simulated configuration change (no screen edits the issuer record), a new letter version, a new programme version and a new name
      Object.assign(CH_ISSUER, { name: 'Changed Issuer Ltd', letterhead: 'Changed Issuer Ltd', watermark: 'Changed Issuer Ltd', signatory: 'Pat Changed', role: 'Admissions, Changed Issuer Ltd', decl: 'Changed declaration.' });
      as('aca'); go('a-programmes', { id: 'NV-N1', tab: 'documents' }); ACT.cbrLetterUp({ dataset: { p: 'NV-N1' } }); setUi('chLetterFile', 'changed.docx');
      const x = $1('#lt-x'); if (x) x.value = 'A completely different letter text.'; const t = $1('#rsn'); if (t) t.value = 'L3A test'; press();
      const pr = cbPr('NV-N1'), v0 = pr.version; pr.version = v0 + 1; STORE.worlds[LENA].me.first = 'Renamed';
      try {
        ok('L3A-3b the new template version exists (the change really happened)', chLetterCur('NV-N1').text[0] === 'A completely different letter text.', chLetterCur('NV-N1').v);
        as('nvq-sp'); const a1 = view('CD1'); as('short'); const l1 = view(LENA);
        ok('L3A-3c Amira\'s signed letter: unchanged issuer, signatory and text', a1 === before.A && !/Changed Issuer|Pat Changed|completely different/.test(a1));
        ok('L3A-3d Lena\'s signed letter: the name she signed, not her new name', /Lena/.test(l1) && !/Dear Renamed/.test(l1) && !/Changed Issuer/.test(l1), l1.slice(0, 200));
        ok('L3A-3e an unsigned letter (preview) does show the new issuer — the change is real, only signed history is protected', /Changed Issuer Ltd/.test(chLetterHtml(chLetterCur('NV-N1'), { raw: true })));
      } finally { Object.assign(CH_ISSUER, keep); pr.version = v0; STORE.worlds[LENA].me.first = nm; }
    });

    await T('L3A-4 a copy saved before L3-A (no issuer): labelled compatibility display, never rewritten', async () => {
      const w = STORE.worlds.CD4, s = w.signup.sig, orig = s.snapshot, { issuer, contract, ...old } = orig;
      s.snapshot = Object.freeze(old); const j0 = J(s.snapshot), keep = { ...CH_ISSUER };
      Object.assign(CH_ISSUER, { name: 'Changed Issuer Ltd', letterhead: 'Changed Issuer Ltd', watermark: 'Changed Issuer Ltd', signatory: 'Pat Changed' });
      try {
        as('nvq-dep'); const t = view('CD4');
        ok('L3A-4a shown with the as-built issuer, not the current one', /Welfare Academy/.test(t) && /Jenson Thomas/.test(t) && !/Changed Issuer|Pat Changed/.test(t));
        ok('L3A-4b and says so: issuer details weren\'t stored — a compatibility display, not a stored record', /Issuer details weren't stored with this signature/.test(t) && /compatibility display, not a stored record/.test(t));
        ok('L3A-4c viewing doesn\'t add or change anything in the copy', J(s.snapshot) === j0 && !s.snapshot.issuer);
      } finally { Object.assign(CH_ISSUER, keep); s.snapshot = orig; }
    });

    await T('L3A-5 a signature with no saved copy: the historical template, issuer labelled', async () => {
      const w = STORE.worlds.CD4, s = w.signup.sig, orig = s.snapshot; delete s.snapshot;
      try {
        as('nvq-dep'); const t = view('CD4');
        ok('L3A-5a the historical template opens (not a signed copy) with the as-built issuer, labelled', /not the learner's signed copy/.test(t) && /Issuer details weren't stored/.test(t) && /Welfare Academy/.test(t));
      } finally { s.snapshot = orig; }
    });

    await T('L3A-6 authorization: only the learner and the admin roles that open admissions see a signed letter', async () => {
      as('nvq-fa'); const a0 = ADMIN.audit.length; lastToast = ''; ACT.chSignedPdf({ dataset: { v: 'CD1' } });
      ok('L3A-6a another learner (Dev) calling ACT.chSignedPdf for Amira is refused, nothing opens, logged', !MODAL && /can't view this learner's offer letter/.test(lastToast) && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Blocked: view signed offer letter'));
      lastToast = ''; ACT.cbHistTemplate({ dataset: { v: 'CD1' } }); ok('L3A-6b the historical-template handler is refused to him too', !MODAL && /can't view/.test(lastToast));
      closeModal(); ACT.demoSignInAsTas({ dataset: { v: 'S' } }); lastToast = ''; ACT.chSignedPdf({ dataset: { v: 'CD1' } });
      ok('L3A-6c the staff portal (Assessor) is refused', !MODAL && /can't view/.test(lastToast));
      closeModal(); ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; lastToast = ''; ACT.chSignedPdf({ dataset: { v: 'CD1' } });
      ok('L3A-6d the agency portal is refused', !MODAL && /can't view/.test(lastToast));
      as('aca'); const t = view('CD1'); ok('L3A-6e the Academic Admin opens it, from the signed copy', /Signed offer letter/.test(t) && /recorded with the signature/.test(t));
      as('nvq-sp'); const u = view('CD1'); ok('L3A-6f Amira opens her own', /Welfare Academy/.test(u));
      as('nvq-sp'); ACT.chSignedPdf({ dataset: { v: 'CD1' } }); const j0 = J(snap('CD1')), dl = MODAL && MODAL.actions.find(x => /Download/.test(x.label)); if (dl && dl.fn) dl.fn(); closeModal();
      ok('L3A-6g Download (simulated) leaves the signed copy unchanged', J(snap('CD1')) === j0);
    });
    signOutAll(); return next(1);
  }

  if (PH === 1) {
    await T('L3A-R after a real refresh', async () => {
      const L = JSON.parse(SS.getItem(K + 'lena') || '{}'), s = snap(LENA);
      ok('L3A-R1 the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('L3A-R2 Lena\'s signed copy kept its issuer and contract', !!s && s.issuer && s.issuer.name === 'Welfare Academy' && s.contract.mode === 'Fully Assisted' && s.name === L.name && s.v === L.v && J(s.text) === J(L.text));
      as('short'); const t = view(LENA); ok('L3A-R3 and it still opens from the copy', /Welfare Academy/.test(t) && /recorded with the signature/.test(t) && !/Issuer details weren't stored/.test(t));
      ACT.resetDemo(); closeModal();
      ok('L3A-R4 Reset demo: Lena hasn\'t signed; Amira\'s copy carries the issuer again (built through the real handler)', !(STORE.worlds[LENA].signup && STORE.worlds[LENA].signup.sig) && !!snap('CD1').issuer);
    });
  }

  function signOutAll() { closeModal(); if (S.signedIn && ACT.logout) ACT.logout(); }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'lena');
})();
