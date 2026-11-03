// AA-FOLLOWUP — the two client decisions after AA-FINAL: (1) only the awarding-body course code (no Academy course code; the internal
// programme ID automatic; historical codes kept and labelled), (2) SCORM Option C — a labelled demonstration: the package check stays,
// nothing completes, passes or scores from SCORM, earlier records are untouched. suites.sh runs it with FIXTURE=client; phase 1 is a
// real refresh, then Reset demo, then the legacy fixture (seeded SCORM records, and a fresh NVQ course created, published and versioned).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aafu.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aafu.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-aafu.R', J(R)); SS.setItem('ft-aafu.phase', String(ph)); location.reload(); };
  const reason = (r = 'AAFU test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing ' + k); e.value = v; });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const lastAud = () => ADMIN.audit[0] || {}, sec = () => ADMIN.security.length;
  const NOTE = 'SCORM demonstration only. Package execution, persistent storage, progress tracking and completion reporting are not implemented in this prototype.';
  const GUIDE = 'Enter the course code provided by NCFE or the relevant awarding body.';
  // A .zip built here: [name, text] files, stored or deflated (only what the package check reads)
  const zipOf = async (files, deflate, name = 'pkg.zip') => {
    const enc = new TextEncoder(), parts = [], cds = []; let off = 0;
    for (const [fn, text] of files) {
      let data = enc.encode(text), method = 0; const usize = data.length;
      if (deflate) { const s = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw')); data = new Uint8Array(await new Response(s).arrayBuffer()); method = 8; }
      const nb = enc.encode(fn), lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, method, true); lh.setUint32(18, data.length, true); lh.setUint32(22, usize, true); lh.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const cd = new DataView(new ArrayBuffer(46)); cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(10, method, true); cd.setUint32(20, data.length, true); cd.setUint32(24, usize, true); cd.setUint16(28, nb.length, true); cd.setUint32(42, off, true);
      cds.push(new Uint8Array(cd.buffer), nb); off += 30 + nb.length + data.length;
    }
    const size = cds.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new File([...parts, ...cds, new Uint8Array(e.buffer)], name, { type: 'application/zip' });
  };
  const MAN12 = '<?xml version="1.0"?><manifest identifier="M1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"><metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata><organizations default="O1"><organization identifier="O1"><title>Hoist checks 1.2</title><item identifier="I1" identifierref="R1"><title>Lesson</title></item></organization></organizations><resources><resource identifier="R1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>';
  const MAN04 = '<?xml version="1.0"?><manifest identifier="M2" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"><metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata><organizations default="O"><organization identifier="O"><title>Disclosure 2004</title></organization></organizations><resources><resource identifier="A" adlcp:scormType="sco" href="a.html"/><resource identifier="B" adlcp:scormType="sco" href="b.html"/></resources></manifest>';
  const RUN = ['index.html', '<script>window.__aafuRan = 1;</script>'];
  const put = async (sel, file, inp) => { const el = $1(sel); if (!el) throw new Error('no file input ' + sel); const dt = new DataTransfer(); dt.items.add(file); el.files = dt.files; INP[inp](el); await AAFC.pending; await wait(20); };
  const kind = k => { const s = $1('#ci-k'); s.value = k; INP.s1Kind(s); };
  const scOf = e => (e.content || []).find(c => c.kind === 'scorm');
  const RNAME = 'AAFU disclosure scenario';

  if (PH === 0) {
    /* ================= 1. Course codes (client demo data) ================= */
    await T('AAFU-1 new course form', async () => {
      pick('aca'); go('a-programmes', { id: 'new', tab: 'details' }); const f = $1('main .cb-det-form');
      const codeLabels = $a('main .cb-det-form label, main .cb-det-form .lbl').map(l => l.textContent.trim()).filter(t => /code/i.test(t));
      ok('AAFU-1 the form has one course code field, "Awarding body course code"; no Academy course code input, label or id', !$1('main #np-code') && J(codeLabels) === J(['Awarding body course code']) && !/Academy course code|Course code</.test(f.innerHTML.replace(/Awarding body course code</g, '')), J(codeLabels));
      ok('AAFU-1 the client\'s guidance is on the field; it is still marked required', $1('main .aafa-refwhy').textContent.startsWith('Required. ' + GUIDE));
      ok('AAFU-1 the internal programme ID is shown as automatic, not an input', /Internal programme ID\s*Assigned automatically/.test(main()) && !$1('main .aafa-pid input'));
      ok('AAFU-1 no former-code row on a new course', !$1('main .cb-former-code'));
    });
    await T('AAFU-1 lists, header and learner', async () => {
      go('a-programmes'); const th = $a('main thead th').map(t => t.textContent.trim());
      ok('AAFU-1 NVQ Programmes list: "Awarding body course code" column (no "Awarding-body ref")', th.includes('Awarding body course code') && !th.some(t => /Awarding-body ref/.test(t)), J(th));
      go('a-programmes', { id: 'NV-N1', tab: 'details' });
      ok('AAFU-1 builder header: "Awarding body course code QN …"; no "Course code" of the Academy', /Level 3 · Awarding body course code QN 610\/0001\/0/.test($1('main .page-h').textContent.replace(/\s+/g, ' ')) && !/·\s*Course code/.test($1('main .page-h').textContent));
      ok('AAFU-1 read-only details: the internal ID and the awarding body course code, kept apart; no former code row for a course that never had one', /Internal programme ID\s*NV-N1/.test(main()) && /Awarding body course code\s*QN 610\/0001\/0/.test(main()) && !/Former Academy course code/.test(main()));
      go('a-programmes', { id: 'NV-N1', tab: 'review' }); const rv = ($1('main .cb-rv-dl') || $1('main .cb-rv') || {}).textContent || '';
      ok('AAFU-1 Review & Publish: Awarding body course code shown; no "Course code" row', /Awarding body course code/.test(rv) && !/(^|[^y] )Course code/.test(rv.replace(/Awarding body course code/g, '')), rv.slice(0, 200));
      pick('nvq-sp'); go('course', { id: 'nvq' });
      ok('AAFU-1 learner NVQ Overview: "Awarding body course code QN …" (no "Awarding body ref." prefix)', /Awarding body course code\s*QN 610\/0001\/0/.test(main()) && !/Awarding body ref\./.test(main()), main().slice(0, 400));
    });

    /* ================= 2. SCORM — Academic Admin ================= */
    let cid = null, buyer = null;
    await T('AAFU-2 SCORM item check', async () => {
      pick('aca'); const c = ADMIN.courses.find(x => x.status === 'Published' && s1Mods(x).some(m => m.status === 'Active') && CATALOGUE.some(k => k.course === x.id));
      buyer = c && [['nvq-sp', 'CD1'], ['nvq-fa', 'CD2'], ['short', 'CD3']].find(([, w]) => STORE.worlds[w] && !STORE.worlds[w].enrolments.some(e => e.courseId === c.id));
      ok('AAFU-2 (setup) a published course and a demo learner not yet enrolled on it', !!c && !!buyer, J(ADMIN.courses.map(x => [x.id, x.status]))); if (!c || !buyer) return; cid = c.id;
      const m = s1Mods(c).find(x => x.status === 'Active'), sp = s1Spec(c), n0 = sp.items.length; go('a-courses', { id: c.id, tab: 'modules' });
      ACT.s1ItemAdd({ dataset: { id: c.id, m: m.id } }); kind('scorm'); fill({ '#ci-t': 'AAFU hoist checks' });
      ok('AAFU-2 the SCORM item dialog shows the client\'s notice', mtxt().includes(NOTE) && /isn't stored or run/.test(mtxt()));
      const bad = [[await zipOf([['readme.txt', 'x']], false, 'nomanifest.zip'), /No imsmanifest\.xml/], [new File([new TextEncoder().encode('not a zip')], 'fake.zip'), /isn't a valid \.zip/],
        [await zipOf([['imsmanifest.xml', MAN12.replace('<schemaversion>1.2</schemaversion>', '<schemaversion>3.0</schemaversion>').replace('adlcp_rootv1p2', 'other')]], false, 'v3.zip'), /doesn't declare SCORM 1\.2 or SCORM 2004/],
        [await zipOf([['imsmanifest.xml', '<manifest><oops'], RUN], false, 'broken.zip'), /valid manifest/], [await zipOf([['imsmanifest.xml', MAN12.replace('adlcp:scormtype="sco"', 'adlcp:scormtype="asset"')]], false, 'nosco.zip'), /no SCO/]];
      for (const [file, re] of bad) { await put('#ci-f', file, 's1File'); const P = ui('aafcPkg', null), shown = $1('#aafc-pk').textContent; prim();
        ok(`AAFU-2 invalid package refused and not saved: ${file.name}`, P.status === 'bad' && re.test(P.why) && shown.startsWith(`Not accepted (${file.name})`) && !!MODAL && sp.items.length === n0, J([P, shown])); }
      await put('#ci-f', await zipOf([['imsmanifest.xml', MAN12], RUN], false, 'hoist12.zip'), 's1File');
      ok('AAFU-2 a SCORM 1.2 package: name, detected version and result shown; nothing in it ran; not stored', /^Valid SCORM package: hoist12\.zip · SCORM 1\.2 detected · "Hoist checks 1\.2" · 1 SCO\. .*isn't stored\.$/.test($1('#aafc-pk').textContent) && !window.__aafuRan, $1('#aafc-pk').textContent);
      press(); const it = sp.items.find(i => i.title === 'AAFU hoist checks');
      ok('AAFU-2 saved: detected version and package details only (no file content)', it && it.scorm === 'SCORM 1.2' && it.pkg.version === 'SCORM 1.2' && it.pkg.file === 'hoist12.zip' && !('data' in it.pkg) && m.items.includes(it.id), J(it && it.pkg));
      ACT.s1ItemAdd({ dataset: { id: c.id, m: m.id } }); kind('scorm'); fill({ '#ci-t': 'AAFU disclosure 2004' }); $1('#ci-sv').value = 'SCORM 1.2';
      await put('#ci-f', await zipOf([['imsmanifest.xml', MAN04]], true, 'disc04.zip'), 's1File'); press(); const it2 = sp.items.find(i => i.title === 'AAFU disclosure 2004');
      ok('AAFU-2 a deflated SCORM 2004 package is detected as 2004 whatever the select said', it2 && it2.scorm === 'SCORM 2004' && it2.pkg.scos === 2);
      go('a-courses', { id: c.id, tab: 'content' });
      ok('AAFU-2 Content tab: the notice; each SCORM item says "demonstration only" with its check result', main().includes(NOTE) && /SCORM package SCORM 1\.2 · hoist12\.zip · checked: 1 SCO · demonstration only/.test(main()) && /checked: 2 SCOs · demonstration only/.test(main()));
      go('a-courses', { id: c.id, tab: 'completion' }); const rule = $1('main .s1-rule[value="scorm"]');
      ok('AAFU-2 Completion rules: the SCORM rule can\'t be chosen and says why', rule && rule.disabled && /Not available — SCORM is a demonstration/.test(main()));
    });
    let rid = null;
    await T('AAFU-2 SCORM learning resource check', async () => {
      go('a-resources'); const n0 = S4B().res.length; ACT.aUpload();
      ok('AAFU-2 Add resource: the notice and a package status line', mtxt().includes(NOTE) && !!$1('#aafu-rpk'));
      fill({ '#rs-t': RNAME }); $1('#rs-y').value = 'SCORM';
      await put('#rs-f', await zipOf([['readme.txt', 'x']], false, 'res-bad.zip'), 's4bFile'); prim();
      ok('AAFU-2 resource: an invalid package is refused, not saved', !!MODAL && S4B().res.length === n0 && /^Not accepted \(res-bad\.zip\): No imsmanifest/.test($1('#aafu-rpk').textContent), $1('#aafu-rpk').textContent);
      await put('#rs-f', await zipOf([['imsmanifest.xml', MAN04], RUN], true, 'res04.zip'), 's4bFile');
      ok('AAFU-2 resource: a SCORM 2004 package is detected; nothing ran', /^Valid SCORM package: res04\.zip · SCORM 2004 detected/.test($1('#aafu-rpk').textContent) && !window.__aafuRan);
      press(); const r = S4B().res[0]; rid = r && r.id;
      ok('AAFU-2 resource saved as a Draft with the checked package details', S4B().res.length === n0 + 1 && r.title === RNAME && r.kind === 'scorm' && r.pkg && r.pkg.version === 'SCORM 2004' && r.pkg.scos === 2 && r.status === 'Draft', J(r && r.pkg));
      ACT.s4bPrev({ dataset: { id: rid } }); ok('AAFU-2 resource preview: the notice and package / version / validation; no completion action', mtxt().includes(NOTE) && /Package\s*res04\.zip/.test(mtxt()) && /SCORM 2004 — detected/.test(mtxt()) && /Valid — imsmanifest\.xml declares SCORM 2004 with 2 SCOs/.test(mtxt()) && !$1('#modal-root [data-act="resScorm"]')); closeModal();
      ok('AAFU-2 the resources page carries the notice', main().includes(NOTE));
      ACT.s4bVer({ dataset: { id: rid } }); if (MODAL) { await put('#rs-f', await zipOf([['other.txt', 'x']], false, 'v2-bad.zip'), 's4bFile'); const t = $1('#rsn'); if (t) t.value = 'New package'; prim(); }
      ok('AAFU-2 resource new version: an invalid package is refused (version unchanged)', !!MODAL && s4bRes(rid).version === 1); closeModal();
    });
    await T('AAFU-2 roles', async () => {
      for (const p of ['fin', 'short']) {
        pick(p); const n0 = S4B().res.length, s0 = sec(), a0 = ADMIN.audit.length; ACT.aUpload(); const m1 = !!MODAL; closeModal(); const c = cid && s1Row(cid), k0 = c ? s1Spec(c).items.length : 0; if (c) { ACT.s1ItemAdd({ dataset: { id: cid } }); }
        ok(`AAFU-2 ${p}: can't add a resource or a short-course item (refused inside the action, logged)`, !m1 && !MODAL && S4B().res.length === n0 && (!c || s1Spec(c).items.length === k0) && (sec() > s0 || ADMIN.audit.length > a0));
        closeModal();
      }
    });

    /* ================= 3. SCORM — learner ================= */
    await T('AAFU-3 learner preview of a seeded item', async () => {
      pick('short'); const e = W.enrolments.find(x => x.id === 'bk5'), c = scOf(e), st0 = c.state, p0 = e.progress, r0 = J(e.reqs);
      go('course', { id: e.id, tab: 'content' }); const b = $1(`main [data-act="openItem"][data-id="${c.id}"]`);
      ok('AAFU-3 Content tab: the notice; the SCORM item reads "Demonstration only" with a Preview button (no Launch)', main().includes(NOTE) && /preview of a feature planned for the full LMS/.test(main()) && b && b.textContent.trim() === 'Preview' && /Demonstration only/.test(b.closest('.li').textContent));
      click(b);
      ok('AAFU-3 the preview: the notice, package / version / validation, "Not tracked", and only Close', mtxt().includes(NOTE) && /doesn't count towards your progress, completion or certificate/.test(mtxt()) && /SCORM version\s*Not recorded/.test(mtxt()) && /Validation\s*Not checked/.test(mtxt()) && /Not tracked/.test(mtxt()) && !$1('#modal-root [data-act="scormFinish"]') && J(MODAL.actions.map(a => a.label)) === J(['Close']));
      closeModal(); ok('AAFU-3 opening the preview changes nothing: state, progress and requirements as before', c.state === st0 && e.progress === p0 && J(e.reqs) === r0 && !c.score, J([c.state, st0]));
      const a0 = ADMIN.audit.length, r = ACT.scormFinish({ dataset: { e: e.id, id: c.id } });
      ok('AAFU-3 (negative) a direct "record SCORM completion" call is refused and logged; nothing recorded', r === false && c.state === st0 && !c.score && !c.manualAt && ADMIN.audit.length === a0 + 1 && /^Blocked: record SCORM completion \(SCORM is a demonstration only\)/.test(lastAud().action));
    });
    await T('AAFU-3 completion, progress and certificates leave SCORM out', async () => {
      const e = W.enrolments.find(x => x.id === 'bk5'), keep = J({ c: W.certs, n: W.notifs }), clone = (id, reqs) => { const x = JSON.parse(J(e)); Object.assign(x, { id, reqs, status: 'Active' }); W.enrolments.push(x); return x; };
      try {
        const x = clone('aafu-x', [['Open all documents', true], ['Complete the interactive SCORM module', false]]), c0 = W.certs.length; shComplete(x);
        ok('AAFU-3 a SCORM rule that isn\'t met doesn\'t block completion (it isn\'t counted)', x.status === 'Completed' && W.certs.length === c0 + 1 && J(x.reqs[1]) === J(['Complete the interactive SCORM module', false]));
        const y = clone('aafu-y', [['Open all documents', false], ['Complete the interactive SCORM module', true]]), c1 = W.certs.length; shComplete(y);
        ok('AAFU-3 a SCORM rule recorded as met gives no completion or certificate on its own', y.status === 'Active' && W.certs.length === c1);
        const ys = scOf(y); y.reqs[1][1] = false; ys.state = 'Not opened'; y.content.find(c => c.kind === 'doc').state = 'Completed'; recalcShort(y); const p1 = y.progress; ys.state = 'Completed'; ys.score = 99; recalcShort(y);
        ok('AAFU-3 progress and the SCORM rule ignore a SCORM item\'s state', y.progress === p1 && y.reqs[1][1] === false, J([p1, y.progress, y.reqs]));
        const nonSc = y.content.filter(c => c.kind !== 'scorm'), mods = shMods(y);
        ok('AAFU-3 progress counts only non-SCORM content and module quizzes', p1 > 0 && p1 === Math.round((nonSc.filter(c => c.state === 'Completed').length + mods.filter(shPassed).length) / (nonSc.length + mods.length) * 100), J(p1));
        ok('AAFU-3 quiz unlocking and "next step" never ask for a SCORM item', !cfReqKinds({ reqs: [['Complete all content', false], ['Complete the interactive SCORM module', false]] }).has('scorm') && cfReqKinds({ reqs: [['Complete all content', false]] }).has('doc'));
        go('course', { id: 'aafu-y', tab: 'overview' }); ok('AAFU-3 Overview: the SCORM rule reads "Not counted"', /Complete the interactive SCORM module\s*Not counted — SCORM is a demonstration/.test(main()));
      } finally { W.enrolments = W.enrolments.filter(z => !/^aafu-/.test(z.id)); const k = JSON.parse(keep); W.certs = k.c; W.notifs = k.n; }
    });
    await T('AAFU-3 a checked package: admin and learner see the same', async () => {
      if (!cid) { ok('AAFU-3 (setup) course from AAFU-2', false); return; }
      pick(buyer[0]); go('browse'); const k = CATALOGUE.find(x => x.course === cid); ACT.buyCourse({ dataset: { id: k.id } }); prim(); await wait(3000); closeModal();
      const e = W.enrolments.find(x => x.courseId === cid), c = e && e.content.find(x => x.title === 'AAFU hoist checks');
      ok('AAFU-3 (setup) bought: the enrolment has the checked package', !!c && c.pkg && c.pkg.version === 'SCORM 1.2' && c.pkg.file === 'hoist12.zip' && c.pkg.scos === 1, J(c && c.pkg));
      if (!c) return; const st0 = c.state; go('course', { id: e.id, tab: 'content' }); ACT.openItem({ dataset: { e: e.id, id: c.id } });
      const adm = aafuPkg(s1Spec(s1Row(cid)).items.find(i => i.title === 'AAFU hoist checks')), lrn = aafuPkg(c);
      ok('AAFU-3 the learner sees the package name, detected version and validation the admin saw', /Package\s*hoist12\.zip/.test(mtxt()) && /SCORM 1\.2 — detected from imsmanifest\.xml/.test(mtxt()) && /Valid — imsmanifest\.xml declares SCORM 1\.2 with 1 SCO/.test(mtxt()) && J([adm.name, adm.ver, adm.res]) === J([lrn.name, lrn.ver, lrn.res]), J([adm, lrn]));
      closeModal(); ok('AAFU-3 still not opened, not completed, not scored after the preview', c.state === st0 && c.state === 'Not opened' && !c.score && e.status === 'Active');
      SS.setItem('ft-aafu.keep', J({ cid, rid, eid: e.id, sc: c.id, w: buyer[1] }));
    });
    signOutUI(); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-aafu.keep') || '{}');
    await T('AAFU refresh', async () => {
      const c = keep.cid && s1Row(keep.cid), it = c && s1Spec(c).items.find(i => i.title === 'AAFU hoist checks'), r = keep.rid && S4B().res.find(x => x.id === keep.rid);
      const e = (STORE.worlds[keep.w] || { enrolments: [] }).enrolments.find(x => x.id === keep.eid), sc = e && e.content.find(x => x.id === keep.sc);
      ok('AAFU after a real refresh: the checked packages (item and resource) come back', it && it.pkg.version === 'SCORM 1.2' && r && r.pkg.version === 'SCORM 2004', J([it && it.pkg, r && r.pkg]));
      ok('AAFU after a real refresh: the learner\'s SCORM item is still not opened and not scored; the refusal is in the audit', sc && sc.state === 'Not opened' && !sc.score && ADMIN.audit.some(a => /^Blocked: record SCORM completion/.test(a.action)));
    });
    await T('AAFU Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); const c = keep.cid && s1Row(keep.cid);
      ok('AAFU Reset: the added SCORM items, the resource and the enrolment are gone', !(c && s1Spec(c).items.some(i => /^AAFU /.test(i.title))) && !S4B().res.some(x => x.title === RNAME) && !(STORE.worlds[keep.w] || { enrolments: [] }).enrolments.some(x => x.id === keep.eid && x.courseId === keep.cid && x.content.some(c => /^AAFU /.test(c.title))));
    });

    /* ================= Legacy fixture: earlier SCORM records are untouched ================= */
    await T('AAFU legacy seeded SCORM records', async () => {
      fxLoadLegacy(); signOutUI(); S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {};
      const e = W.enrolments.find(x => x.id === 'mh26'), c = e && scOf(e), done = W.enrolments.find(x => x.id === 'mh25'), d0 = J(done), cert0 = J(W.certs.find(x => x.id === done.certId)), e0 = J({ s: c.state, sc: c.score, p: e.progress, r: e.reqs });
      go('course', { id: e.id, tab: 'content' }); const li = $1(`main [data-act="openItem"][data-id="${c.id}"]`).closest('.li');
      ok('AAFU legacy: a SCORM state and score recorded earlier are kept and labelled as seeded demo records', /Completed \(seeded demo record\)/.test(li.textContent) && /Score 88% \(seeded demo record\)/.test(li.textContent) && c.state === 'Completed' && c.score === 88, li.textContent.replace(/\s+/g, ' '));
      ACT.openItem({ dataset: { e: e.id, id: c.id } }); ok('AAFU legacy: its preview says so and offers no completion', /Completed \(seeded demo record\) — kept as recorded/.test(mtxt()) && mtxt().includes(NOTE) && !$1('#modal-root [data-act="scormFinish"]')); closeModal();
      go('course', { id: e.id, tab: 'overview' }); ok('AAFU legacy: the active enrolment\'s SCORM rule reads "Not counted"', /Complete the interactive SCORM module\s*Not counted/.test(main()));
      go('course', { id: done.id, tab: 'overview' }); ok('AAFU legacy: a completed enrolment is shown as recorded (its SCORM rule Done)', /Complete the interactive SCORM module\s*Done/.test(main()));
      ok('AAFU legacy: viewing changes nothing — the active record, the completed enrolment and its certificate are unchanged', J({ s: c.state, sc: c.score, p: e.progress, r: e.reqs }) === e0 && J(done) === d0 && J(W.certs.find(x => x.id === done.certId)) === cert0);
      S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('resources');
      const r3 = (W.resources || []).flatMap(g => g.items).find(i => i.kind === 'scorm'), rs0 = r3 && r3.state, btn = r3 && $1(`main [data-act="openRes"][data-id="${r3.id}"]`);
      ok('AAFU legacy: Learning Resources — the notice; the SCORM resource reads as a demonstration with Preview; no "with scoring"', !!r3 && main().includes(NOTE) && btn && btn.textContent.trim() === 'Preview' && /seeded demo record|Demonstration only/.test(btn.closest('.li').textContent) && !/with scoring/.test(main()), r3 && J(r3));
      if (btn) click(btn); ok('AAFU legacy: the resource preview has the notice and only Close; state unchanged', mtxt().includes(NOTE) && !$1('#modal-root [data-act="resScorm"]') && MODAL && J(MODAL.actions.map(a => a.label)) === J(['Close']) && r3.state === rs0); closeModal();
      const cr = (ADMIN.resources || []).find(x => x.type === 'SCORM'); if (cr) ACT.cooRes({ dataset: { id: cr.id } });
      ok('AAFU legacy: the Coordinator\'s resource preview carries the notice and the package details', !!cr && mtxt().includes(NOTE) && /Validation\s*Not checked/.test(mtxt()) && !/Preview mode — no tracking recorded/.test(mtxt()), cr && cr.id); closeModal();
      const a0 = ADMIN.audit.length; ok('AAFU legacy (negative): a direct "complete SCORM resource" call is refused and logged', ACT.resScorm({ dataset: { id: r3.id } }) === false && r3.state === rs0 && ADMIN.audit.length === a0 + 1 && /^Blocked: complete a SCORM resource/.test(lastAud().action));
    });

    /* ================= Legacy fixture: a fresh NVQ course, created, edited, published and versioned ================= */
    const as = av => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; }, SA = () => as('A'), FA = () => as('FA'), ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
    const fillM = o => Object.entries(o).forEach(([k, v]) => { document.querySelector(k).value = v; });
    const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fillM(o); return prim(); };
    const crPd = (v = '2026-12-20T21:59') => $a('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
    let pr = null;
    await T('AAFU NVQ create', async () => {
      ACA(); go('a-programmes'); ACT.chProgNew();
      fillM({ '#np-t': 'AAFU Level 3 course', '#np-l': 'Level 3', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel($1('#np-l')); $1('#np-obs-no').checked = true;
      [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = $a('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
      const n0 = ADMIN.programmes.length; ACT.cbDetCreate(); closeModal();
      ok('AAFU NVQ (negative) without the awarding body course code nothing is created', ADMIN.programmes.length === n0 && /Enter the awarding body course code/.test(main()));
      $1('main .cb-det-form').insertAdjacentHTML('beforeend', '<input id="np-code" value="CRAFTED-1">'); fillM({ '#np-r': 'QN 610/7701/1' }); const a0 = ADMIN.audit.length; pr = ACT.cbDetCreate(); closeModal();
      ok('AAFU NVQ created with the awarding body course code and an automatic ID; a crafted Academy code input is ignored', !!pr && /^NV-/.test(pr.id) && pr.ref === 'QN 610/7701/1' && !('code' in pr) && pr.status === 'Draft' && !ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(a => /Course code/.test(a.action)), J(pr && { id: pr.id, code: pr.code, ref: pr.ref }));
    });
    await T('AAFU NVQ draft edit and historical code', async () => {
      if (!pr) return; go('a-programmes', { id: pr.id, tab: 'details' }); fillM({ '#np-r': 'QN 610/7702/2' }); ACT.cbDetSave({ dataset: { id: pr.id } });
      ok('AAFU NVQ draft edit: the awarding body course code is changed; still no Academy code', pr.ref === 'QN 610/7702/2' && !('code' in pr));
      pr.code = 'OLD-L3'; const a0 = ADMIN.audit.length; go('a-programmes', { id: pr.id, tab: 'details' }); const fc = $1('main .cb-former-code');
      ok('AAFU NVQ a code recorded earlier is shown read-only on the form as "Former Academy course code (historical)", separate from the awarding body course code', fc && /Former Academy course code \(historical\)\s*OLD-L3/.test(fc.textContent) && !fc.querySelector('input') && !$1('main #np-code') && !!$1('main #np-r'));
      fillM({ '#np-ds': 'Edited with a former code on record' }); ACT.cbDetSave({ dataset: { id: pr.id } });
      ok('AAFU NVQ saving keeps the former code unchanged and logs no code change', pr.code === 'OLD-L3' && pr.desc === 'Edited with a former code on record' && !ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(a => /Course code/.test(a.action)));
      go('a-programmes', { id: pr.id, tab: 'review' }); ok('AAFU NVQ Review & Publish: no Academy code row; the awarding body course code', !/Former Academy|Course code\s*OLD/.test(main()) && /Awarding body course code\s*QN 610\/7702\/2/.test(main()));
      delete pr.code;
      cbPr('NV-L4').code = 'L4-HIST'; go('a-programmes', { id: 'NV-L4', tab: 'details' });
      ok('AAFU NVQ a seeded programme\'s historical code reads "Former Academy course code", apart from its awarding body course code', /Former Academy course code\s*L4-HIST\s*Kept for history/.test(main()) && /Awarding body course code\s*QN 603\/2902\/7/.test(main()));
      delete cbPr('NV-L4').code;
    });
    await T('AAFU NVQ publish and new version', async () => {
      if (!pr) return; const id = pr.id; go('a-programmes', { id, tab: 'structure' });
      add8('ch8AddUnit', { id }, { '#u-c': 'U77', '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/651/77' });
      add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain person-centred care', '#c-e': 'Written account' });
      go('a-programmes', { id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: id } }); fillM({ '#cna-t': 'AAFU assignment' }); press(); const d = s2Defs().find(x => x.title === 'AAFU assignment');
      ACT.s2QAdd({ dataset: { id: d.id } }); fillM({ '#aq-t': 'Explain why person-centred care matters.', '#aq-ev': 'A workplace example', '#aq-n': '2' }); $a('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
      INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: s2Crit(d).find(c => c.type === 'Knowledge').code } }); go('a-programmes', { id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); reason('Publish');
      const [a, b] = cb8Work(pr).opts; [[a.id, [1, 4]], [b.id, [1]]].forEach(([oid, ks]) => { const x = cb8Work(pr).opts.find(y => y.id === oid); x.pay.map(y => y.k).forEach(k => ACT.cb8PayDel({ dataset: { p: id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: oid, k: String(k) } })); });
      go('a-programmes', { id, tab: 'letter' }); ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
      go('a-programmes', { id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: id } }); if (MODAL) press();
      const qid = cb8Wf(pr).qid; FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked'); ACA();
      const bl = cbRvChecks(pr).block; ok('AAFU NVQ (setup) ready to publish: no blockers (the awarding body course code is present)', !bl.length, J(bl.map(x => x.msg)));
      ACT.cbPublish({ dataset: { id } }); reason('Ready');
      ok('AAFU NVQ published as Version 1: same ID, awarding body course code kept, no Academy code', pr.status === 'Active' && pr.version === 1 && pr.id === id && pr.ref === 'QN 610/7702/2' && !('code' in pr), J([pr.status, pr.version]));
      go('a-programmes', { id, tab: 'details' }); ok('AAFU NVQ published details are read-only with the awarding body course code', !$1('main #np-r') && /Awarding body course code\s*QN 610\/7702\/2/.test(main()) && !/Former Academy course code/.test(main()));
      ACT.s3WizVersion({ dataset: { id } }); reason('2028 changes'); go('a-programmes', { id, tab: 'details' }); $1('main #np-obs-no').checked = true; ACT.cbObsSave({ dataset: { id } });
      const bl2 = cbRvChecks(pr).block; ACT.cbPublish({ dataset: { id } }); reason('Version 2');
      ok('AAFU NVQ Version 2 published: the programme ID and awarding body course code are unchanged; still no Academy code', pr.version === 2 && !pr.nextDraft && pr.id === id && pr.ref === 'QN 610/7702/2' && !('code' in pr), J([pr.version, bl2.map(x => x.msg)]));
      go('a-programmes', { id, tab: 'versions' }); ok('AAFU NVQ version history lists both versions under the same programme', /Version 1/.test(main()) && /Version 2/.test(main()));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aafu.phase'); SS.removeItem('ft-aafu.R'); SS.removeItem('ft-aafu.keep');
})();
