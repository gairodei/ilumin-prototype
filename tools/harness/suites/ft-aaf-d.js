// AA-FINAL Workstream D — certificates follow their pinned template (AA-20 / D6), template versions (AA-13), the document
// checklist's controls and lock explained (AA-18), the NVQ empty state. suites.sh runs it with FIXTURE=client.
// Cross-role (Academic Admin, Super Admin, System Admin, Finance refused, Learner, Agency), direct handler calls,
// then a real refresh, Reset demo, and the legacy fixture (standard design kept; agency download; Retry visibility).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aaf-d.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aaf-d.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const modal = () => (document.getElementById('modal-root') || {}).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-aaf-d.R', J(R)); SS.setItem('ft-aaf-d.phase', String(ph)); location.reload(); };
  const reason = (r = 'AAF-D test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const tap = s => { const e = $1('main ' + s); if (e) e.click(); return !!e; };
  const file = (sel, n) => { const d = new DataTransfer(); d.items.add(new File(['x'], n, { type: 'image/png' })); const e = $1(sel); e.files = d.files; e.dispatchEvent(new Event('change', { bubbles: true })); };
  const setSel = (sel, v) => { const l = $1(sel); l.value = v; l.dispatchEvent(new Event('change', { bubbles: true })); };
  const grab = fn => { const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { fn(); } finally { checkout = _co; } return g; };
  // Real completion: every content item done, then every module quiz passed through the quiz screen
  const finish = e => { e.content.forEach(x => { x.state = 'Completed'; x.watch = 100; }); recalcShort(e); shMods(e).forEach(m => { ACT.startQuiz({ dataset: { id: e.id, m: m.id } }); press(); S1Q().forEach((x, i) => { W.quiz.ans[i] = x[2]; }); finishQuiz(false); W.quiz = null; }); };
  const buy = cid => { s1Sync(); go('browse'); const c = CATALOGUE.find(x => x.course === cid); if (!c) throw new Error('not in Browse: ' + cid); const g = grab(() => { ACT.buyCourse({ dataset: { id: c.id } }); const f = $1('#modal-root #sf-f1'); if (f) { f.value = 'Care Co'; prim(); } }); if (g) g.onSuccess(g.amount, 'TXN-AAFD'); closeModal(); return W.enrolments.find(x => x.courseId === cid && x.status === 'Active'); };
  const SC = 'SC-01', row = () => s1Row(SC), sp = () => s1Spec(row());
  const certOf = (v, no) => (STORE.worlds[v].certs || []).find(c => c.no === no);
  const keyOf = no => (allCerts().find(c => c.no === no) || {}).key;
  const regRow = no => { go('a-certificates'); const tr = $a('main tr').find(t => t.textContent.includes(no)); return tr ? tr.textContent.replace(/\s+/g, ' ') : ''; };
  const hasQR = h => /class="ver-qr"|<svg[^>]*class="qr/.test(h) || /qr/.test((h.match(/<svg[^>]*>/) || [''])[0]);

  if (PH === 0) {
    const keep = {};
    /* ---------- AA-13: what the template supports, its versions; Finance refused ---------- */
    await T('AAFD-13a the Certificate tab', async () => {
      pick('aca'); go('a-courses', { id: SC, tab: 'certificate' }); const v = $1('main .aafd-ver'), t = v ? v.textContent.replace(/\s+/g, ' ') : '';
      ok('AAFD-13a Academic Admin: the Certificate tab shows the current template version (v1), its layout, fields and logo', /Current: template version 1 — Landscape — classic border; Learner name, Course, Completion date, Issue date, Expiry, Certificate number, QR code; default "Welfare" mark/.test(t), t.slice(0, 220));
      ok('AAFD-13a the version history row says the first version was in use when tracking began (no invented date)', /In use when version tracking began \(date not recorded\)/.test(t));
      ok('AAFD-13a what is supported, and what is not (whole-design upload, Academy-wide library: client decision)', /2 layouts/.test(t) && /7 fields/.test(t) && /Not available \(client decision\): uploading a whole certificate design/.test(t) && /Academy-wide design library/.test(t));
      ok('AAFD-13a the logo upload is labelled as a prototype (not stored on a server); it is the only file input', /Prototype: files are not stored on a server/.test(main()) && $a('main input[type="file"]').length === 1 && $1('main input[type="file"]').id === 'ct-logo');
    });
    await T('AAFD-13b Finance refused', async () => {
      pick('fin'); go('a-courses', { id: SC, tab: 'certificate' });
      ok('AAFD-13b Finance: no certificate designer', !$1('main .fc-tpl') && !$1('main .aafd-ver'), main().slice(0, 120));
      const n0 = sp().certTpls ? sp().certTpls.length : 0, a0 = ADMIN.audit.length;
      try { ACT.s1Save({ dataset: { id: SC, t: 'certificate' } }); } catch (e) { /* the screen has no form */ }
      ok('AAFD-13b Finance: a direct certificate save is refused and logged; no template version recorded', !MODAL && (sp().certTpls ? sp().certTpls.length : 0) === n0 && ADMIN.audit.length > a0 && /Blocked/.test(ADMIN.audit[0].action || ''), (ADMIN.audit[0] || {}).action);
      closeModal();
    });

    /* ---------- AA-20 / D6: Lena (CD3) completes on the template pinned when she enrolled ---------- */
    await T('AAFD-20a Lena completes', async () => {
      pick('short'); const e = W.enrolments.find(x => x.id === 'bk5'); finish(e);
      const c = W.certs.find(x => x.id === e.certId); keep.lena = c && c.no;
      ok('AAFD-20a Lena completes Moving and Handling People through the quiz screen; her certificate keeps the template pinned at enrolment (v1, course v3)', e.status === 'Completed' && !!c && !!c.tpl && c.tplN === 1 && c.courseV === 3 && c.courseId === SC, J(c));
      go('certificates'); ACT.viewCert({ dataset: { id: c.id } }); const m = modal(), h = MODAL.body;
      ok('AAFD-20a the viewer draws template v1: landscape, number, QR, expiry, completion and issue dates', /aafd-land/.test(h) && /Certificate no\. WEL-/.test(m) && /class="ver-qr"/.test(h) && /Valid until/.test(m) && /Completed \d/.test(m) && /Issued \d/.test(m) && /Course template v1 · course v3/.test(m));
      closeModal(); keep.lenaJ = J(c);
    });
    await T('AAFD-13c template v2 saved', async () => {
      pick('aca'); go('a-courses', { id: SC, tab: 'certificate' });
      setSel('main #ct-l', 'Portrait — minimal'); tap('.s1-cf[value="QR code"]'); tap('.s1-cf[value="Certificate number"]'); tap('input[name="fc-logo"][value="own"]'); file('main #ct-logo', 'aafd-logo.png');
      const p = $1('main .fc-prev'), pt = p.textContent;
      ok('AAFD-13c the live preview is the issued renderer: portrait, no number, no QR, the logo name', /aafd-port/.test(p.innerHTML) && !/WEL-2026-0000/.test(pt) && !hasQR(p.innerHTML) && /aafd-logo\.png/.test(pt) && /Portrait — minimal/.test(pt));
      const v0 = row().version; tap('[data-act="s1Save"]'); reason('Portrait, no number or QR');
      const h = sp().certTpls || [];
      ok('AAFD-13c saving records template version 2 (layout, fields, logo, person, course version, reason) and keeps version 1', h.length === 2 && h[0].n === 1 && h[0].baseline && h[1].n === 2 && h[1].layout === 'Portrait — minimal' && !h[1].fields.includes('QR code') && !h[1].fields.includes('Certificate number') && h[1].logo === 'aafd-logo.png' && h[1].courseV === v0 + 1 && h[1].reason === 'Portrait, no number or QR' && !!h[1].by, J(h[1]));
      ok('AAFD-13c audited as "Certificate template version 2"', ADMIN.audit.some(a => /Certificate template version 2/.test(a.action || '')));
      const t = $1('main .aafd-ver').textContent.replace(/\s+/g, ' ');
      ok('AAFD-13c the version table: v2 current; Lena\'s certificate listed under v1', /Current: template version 2 — Portrait — minimal/.test(t) && new RegExp('v1In use when version tracking began[^]*' + keep.lena).test(t), t.slice(0, 400));
      ok('AAFD-20b Lena\'s issued certificate is not rewritten by the template change', J(certOf('CD3', keep.lena)) === keep.lenaJ);
    });
    await T('AAFD-20c a new enrolment on v2', async () => {
      pick('nvq-sp'); const e = buy(SC); if (!e) throw new Error('no enrolment');
      ok('AAFD-20c the new enrolment pins template v2', e.certTplN === 2 && e.certTpl.layout === 'Portrait — minimal', J({ n: e.certTplN, t: e.certTpl }));
      finish(e); const c = W.certs.find(x => x.id === e.certId); keep.new = c && c.no; keep.newV = S.variant;
      go('certificates'); ACT.viewCert({ dataset: { id: c.id } }); const m = modal(), h = MODAL.body;
      ok('AAFD-20c the learner\'s certificate follows v2: portrait, logo placeholder, no certificate number, no QR; expiry and dates kept', /aafd-port/.test(h) && !/Certificate no\./.test(m) && !/ver-qr/.test(h) && /Logo: aafd-logo\.png/.test(m) && /Valid until/.test(m) && /Course template v2/.test(m), m.slice(0, 300));
      ok('AAFD-20c Copy verification link still works (the record keeps its number)', MODAL.actions.some(a => /Copy verification link/.test(a.label)) && !!c.no);
      closeModal();
      pick('super'); const k = keyOf(keep.new); go('a-certificates', { id: k.replace(':', '~') }); const d = main(), dh = $1('main').innerHTML;
      ok('AAFD-20d admin detail draws the same template and names it', /aafd-port/.test(dh) && !/Certificate no\./.test(d) && /Course template v2 · course v4 — Portrait — minimal/.test(d));
      ok('AAFD-20d certificate numbers are unique across learners (the new one does not repeat Lena\'s)', keep.new !== keep.lena && allCerts().filter(x => x.no === keep.new).length === 1, keep.new + ' / ' + keep.lena);
      ok('AAFD-20d register Template column: v2 for the new certificate, v1 for Lena\'s', /Course template v2 · course v4/.test(regRow(keep.new)) && /Course template v1 · course v3/.test(regRow(keep.lena)), regRow(keep.new) + ' | ' + regRow(keep.lena));
    });

    /* ---------- Revoke shown only to the Super Administrator; handler guard unchanged ---------- */
    await T('AAFD-20e revoke visibility', async () => {
      const k = keyOf(keep.lena).replace(':', '~');
      pick('super'); go('a-certificates', { id: k }); ok('AAFD-20e Super Administrator sees Revoke', !!$1('main [data-act="revokeCert"]'));
      for (const p of ['sys', 'aca']) {
        pick(p); go('a-certificates', { id: k });
        // the Academic Admin has no Certificates module (route refused); the System Admin sees the certificate without Revoke
        ok(`AAFD-20e ${p}: no Revoke button; ${p === 'sys' ? 'the reason is shown' : 'the module is refused'}`, !$1('main [data-act="revokeCert"]') && (p === 'sys' ? /Revoking a certificate is done by the Super Administrator/.test(main()) : /You don't have permission/.test(main())), main().slice(0, 100));
        const a0 = ADMIN.audit.length; ACT.revokeCert({ dataset: { k: keyOf(keep.lena) } }); closeModal();
        ok(`AAFD-20e ${p}: a direct revoke call is still refused and logged`, certOf('CD3', keep.lena).status === 'Valid' && ADMIN.audit.length > a0);
      }
      pick('fin'); const a0 = ADMIN.audit.length; ACT.revokeCert({ dataset: { k: keyOf(keep.lena) } }); closeModal();
      ok('AAFD-20e Finance: a direct revoke call is refused', certOf('CD3', keep.lena).status === 'Valid' && ADMIN.audit.length > a0);
    });

    /* ---------- NVQ empty state ---------- */
    await T('AAFD-20f NVQ wording', async () => {
      pick('nvq-fa'); go('certificates'); const t = main();
      ok('AAFD-20f Dev (NVQ): the certificate is posted by the awarding body, not issued in the LMS', /sent to you by post by the awarding body/.test(t) && /isn't issued, downloaded or verified in the LMS/.test(t) && !/issued when you complete your programme/.test(t));
      pick('nvq-sp'); go('certificates'); ok('AAFD-20f a learner with certificates still sees the list (no empty state)', !$1('main .lp-nocert') && $a('main [data-act="viewCert"]').length >= 1);
    });

    /* ---------- AA-18: checklist controls and lock ---------- */
    await T('AAFD-18 checklist', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'docs' }); const t = main();
      ok('AAFD-18 Academic Admin on a published programme: the lock says why, who can change it and that applicants keep their version', /after a programme is published, only the Super Administrator can add, edit, retire or reorder/.test(t) && /applicants keep the version they started with/.test(t) && !$1('main [data-act^="s4Ck"]'));
      const a0 = ADMIN.audit.length; ACT.s4CkEdit({ dataset: { p: 'NV-N1', i: '0' } });
      ok('AAFD-18 the restriction is unchanged: a direct Edit is refused and logged', !MODAL && ADMIN.audit.length > a0 && /Blocked/.test(ADMIN.audit[0].action || ''));
      pick('sys'); go('a-programmes', { id: 'NV-N1', tab: 'docs' }); ok('AAFD-18 System Admin: the same explanation', /only the Super Administrator can add, edit, retire or reorder/.test(main()));
      pick('super'); go('a-programmes', { id: 'NV-N1', tab: 'docs' });
      ok('AAFD-18 Super Administrator: the controls are explained; Edit, Retire and reorder are present; arrows have tooltips', /To change an item use Edit/.test(main()) && !!$1('main [data-act="s4CkEdit"]') && !!$1('main [data-act="s4CkRetire"]') && !!$1('main [data-act="s4CkMove"][title]') && !$1('main .aafd-cklock'));
    });
    SS.setItem('ft-aaf-d.keep', J(keep)); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-aaf-d.keep') || '{}');
    await T('AAFD-R refresh', async () => {
      ok('AAFD-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('AAFD-R the template history comes back (v1, v2)', J((sp().certTpls || []).map(x => x.n)) === '[1,2]');
      const c = certOf('CD3', keep.lena), n = Object.keys(STORE.worlds).map(v => certOf(v, keep.new)).find(Boolean);
      ok('AAFD-R both certificates keep their pinned templates', c && c.tplN === 1 && c.tpl.fields.includes('QR code') && n && n.tplN === 2 && !n.tpl.fields.includes('QR code'));
      pick('short'); go('certificates'); ACT.viewCert({ dataset: { id: c.id } }); ok('AAFD-R Lena\'s viewer still draws v1 (number shown)', /Certificate no\./.test(modal()) && /aafd-land/.test(MODAL.body)); closeModal();
    });
    await T('AAFD-S Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('AAFD-S Reset: no issued test certificates, Lena\'s course is Active again', !Object.keys(STORE.worlds).some(v => certOf(v, keep.lena) || certOf(v, keep.new)) && STORE.worlds.CD3.enrolments.find(e => e.id === 'bk5').status === 'Active');
      ok('AAFD-S Reset: the template is back to v1 with no recorded history', !sp().certTpls && sp().cert.layout === 'Landscape — classic border');
    });
    await T('AAFD-L legacy', async () => {
      fxLoadLegacy(); signOutUI(); S.portal = 'admin'; setAdminIdentity('A'); S.signedIn = true; S.ui = {};
      ok('AAFD-L legacy: every register row without a template says "Standard design" (no invented v2 / v3)', allCerts().every(c => (c.c && c.c.tpl) || c.tpl === 'Standard design'));
      const x = allCerts().find(c => c.v === 'A' && c.status === 'Valid'); go('a-certificates', { id: x.key.replace(':', '~') });
      ok('AAFD-L a certificate issued before templates keeps the standard design (number and QR), labelled', /Standard design \(issued before course templates; shown as issued\)/.test(main()) && /cert-doc/.test($1('main').innerHTML) && !/aafd-doc/.test($1('main').innerHTML) && new RegExp(x.no).test(main()));
      S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const c0 = W.certs.find(c => c.status === 'Valid'); go('certificates'); ACT.viewCert({ dataset: { id: c0.id } });
      ok('AAFD-L learner A: a seeded certificate looks as before (number, QR, no template label)', /Certificate no\./.test(modal()) && !/aafd-doc/.test(MODAL.body) && /ver-qr/.test(MODAL.body)); closeModal();
      // Retry: only the Super Administrator sees it
      ADMIN.certErrors = null; S.portal = 'admin'; setAdminIdentity('A'); go('a-certificates', { tab: 'errors' }); ok('AAFD-L Super Administrator sees Retry on generation errors', !!$1('main [data-act="certRetry"]'));
      ACT.demoSignInAsSys({ dataset: { v: 'SY' } }); S.signedIn = true; go('a-certificates', { tab: 'errors' });
      ok('AAFD-L System Admin: no Retry button; a direct retry is still refused', !$1('main [data-act="certRetry"]') && /Retried by the Super Administrator/.test(main()));
      const n0 = ADMIN.certErrors.length; ACT.certRetry({ dataset: { id: ADMIN.certErrors[0].id } }); ok('AAFD-L …direct certRetry refused', ADMIN.certErrors.length === n0);
      // Agency download: a sponsored learner's templated certificate
      S.portal = 'admin'; setAdminIdentity('A'); S.signedIn = true; s1Sync(); const r = (ADMIN.courses || []).find(c => c.status === 'Published' && CATALOGUE.some(k => k.course === c.id) && !STORE.worlds.D.enrolments.some(e => (e.base || e.title || '').startsWith(c.title))); if (!r) throw new Error('no course for learner D');
      go('a-courses', { id: r.id, tab: 'certificate' }); tap('.s1-cf[value="QR code"]'); tap('[data-act="s1Save"]'); reason('No QR');
      S.variant = 'D'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const e = buy(r.id); finish(e); const c = W.certs.find(x => x.id === e.certId);
      ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; S.agy.id = ADMIN.agencies.find(a => a.name === W.me.sponsor || a.name === STORE.worlds.D.me.sponsor).id; render();
      ACT.agCertDl({ dataset: { no: c.no } }); const m = modal();
      ok('AAFD-L agency download draws the learner\'s template (no QR), with the number kept', !!MODAL && /aafd-doc/.test(MODAL.body) && !/<svg/.test(MODAL.body.slice(MODAL.body.indexOf('aafd-doc'))) && new RegExp(c.no).test(m), m.slice(0, 200)); closeModal();
      const old = agyCerts().find(x => x.no !== c.no && x.status !== 'Revoked'); if (old) { ACT.agCertDl({ dataset: { no: old.no } }); ok('AAFD-L agency: a certificate issued before templates keeps the standard design', !!MODAL && !/aafd-doc/.test(MODAL.body)); closeModal(); }
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aaf-d.phase'); SS.removeItem('ft-aaf-d.R');
})();
