// SCH — SCORM hardening, still Option C (21 Nov 2026; PD-SCH-01…07). suites.sh runs it with FIXTURE=client.
// V  the one validator (aafcZipManifest): its whole contract, including the bounded inflate (zip bomb) and bounded directory read
// C1 the course builder's New resource uses the same save-time gate, status line and notice as Learning Resources (was: any .zip)
// C2 the SCORM version is the manifest's only: no select, kept on an edit without a new ZIP, replaced by a validated new ZIP
// L  lifecycle: Draft → Published by authorised roles, learner eligibility, release rules, metadata preview, New version (per-version
//    validated details), audit; R roles; N negative completion: no completion, progress, score, Pass/Fail, attempt, certificate or NVQ
//    outcome from any SCORM action, called from the UI or directly.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
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
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing ' + k); e.value = v; });
  const reason = (r = 'SCH test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const lastAud = () => ADMIN.audit[0] || {};
  const NOTE = 'SCORM demonstration only. Package validation and metadata preview are available. Package storage, interactive playback, progress tracking, completion and score reporting will be implemented in the production LMS.';
  // The packages here are in-memory files with the interface the validator uses (name, size, slice(a, b).arrayBuffer()). Headless Chrome
  // fast-forwards its virtual clock to the app's next long timer during each real Blob read, so the ~30 validations below, done on real
  // File objects, outrun the harness's virtual-time budget. Real File objects through the real file inputs are covered by ft-aafu and
  // ft-aaf-c; here the same validator and the same input handlers (INP.s1File / INP.s4bFile) receive these.
  const memFile = (chunks, name) => {
    const all = new Uint8Array(chunks.reduce((a, c) => a + (c.byteLength != null ? c.byteLength : c.length), 0)); let p = 0;
    for (const c of chunks) { const u = c instanceof Uint8Array ? c : new Uint8Array(c.buffer || c); all.set(u, p); p += u.length; }
    const mk = u => ({ size: u.length, slice: (a = 0, b = u.length) => mk(u.subarray(Math.max(0, a), Math.min(u.length, b))), arrayBuffer: () => Promise.resolve(u.slice().buffer) });
    return Object.assign(mk(all), { name });
  };
  const textFile = (text, name) => memFile([new TextEncoder().encode(text)], name);
  // A .zip built here. files: [name, text, tweak?]; tweak changes the central-directory record the validator reads ({ flags, method, usize })
  const zipOf = async (files, deflate, name = 'pkg.zip') => {
    const enc = new TextEncoder(), parts = [], cds = []; let off = 0;
    for (const [fn, text, tw = {}] of files) {
      let data = tw.raw || enc.encode(text), method = tw.raw ? 8 : 0; const usize = data.length;
      if (deflate && !tw.raw) { const s = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw')); data = new Uint8Array(await new Response(s).arrayBuffer()); method = 8; }
      const nb = enc.encode(fn), lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, method, true); lh.setUint32(18, data.length, true); lh.setUint32(22, usize, true); lh.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const cd = new DataView(new ArrayBuffer(46)); cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, tw.flags || 0, true); cd.setUint16(10, tw.method != null ? tw.method : method, true); cd.setUint32(20, data.length, true); cd.setUint32(24, tw.usize != null ? tw.usize : usize, true); cd.setUint16(28, nb.length, true); cd.setUint32(42, off, true);
      cds.push(new Uint8Array(cd.buffer), nb); off += 30 + nb.length + data.length;
    }
    const size = cds.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return memFile([...parts, ...cds, new Uint8Array(e.buffer)], name);
  };
  // A "zip bomb" manifest, built by hand so the test itself stays cheap: one fixed-Huffman deflate block — the literal "<", then
  // 9,000 back-references of 258 bytes at distance 1 — about 15 KB that inflates to about 2.3 MB. Its directory claims 100 bytes.
  const BOMB = (() => {
    const out = []; let acc = 0, nb = 0;
    const bits = (v, n) => { for (let i = 0; i < n; i++) { acc |= ((v >> i) & 1) << nb; if (++nb === 8) { out.push(acc); acc = 0; nb = 0; } } }; // LSB first
    const code = (v, n) => { for (let i = n - 1; i >= 0; i--) bits((v >> i) & 1, 1); }; // Huffman codes, MSB first
    bits(1, 1); bits(1, 2); code(0x30 + 60, 8); // final block, fixed Huffman; literal "<"
    for (let k = 0; k < 9000; k++) { code(0xC5, 8); code(0, 5); } // length 258 (code 285), distance 1 (code 0)
    code(0, 7); if (nb) out.push(acc); return new Uint8Array(out); // end of block
  })();
  const bombZip = name => zipOf([['imsmanifest.xml', '', { raw: BOMB, usize: 100 }]], false, name);
  const eocd = (n, size, off, name) => { const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, size, true); e.setUint32(16, off, true); return memFile([new Uint8Array(e.buffer)], name); };
  const XSS = 'Safe moving <img src=x onerror="window.__schX=1">';
  const MAN12 = '<?xml version="1.0"?><manifest identifier="M1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"><metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata><organizations default="O1"><organization identifier="O1"><title>Hoist checks 1.2</title><item identifier="I1" identifierref="R1"><title>Lesson</title></item></organization></organizations><resources><resource identifier="R1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>';
  const MAN12X = MAN12.replace('Hoist checks 1.2', XSS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'));
  const MAN04 = '<?xml version="1.0"?><manifest identifier="M2" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"><metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata><organizations default="O"><organization identifier="O"><title>Disclosure 2004</title></organization></organizations><resources><resource identifier="A" adlcp:scormType="sco" href="a.html"/><resource identifier="B" adlcp:scormType="sco" href="b.html"/></resources></manifest>';
  const RUN = ['index.html', '<script>window.__schRan = 1;</script>'];
  // The dialog's own file input must be there; its real change handler receives the package
  const put = async (sel, file, inp) => { const el = $1(sel); if (!el) throw new Error('no file input ' + sel); INP[inp]({ files: [file], id: el.id }); await AAFC.pending; };
  const kind = k => { const s = $1('#ci-k'); s.value = k; INP.s1Kind(s); };
  const resById = id => S4B().res.find(r => r.id === id);
  const myItem = r => cfMyItems().find(i => i.s4id === r.id);
  const nvqSnap = () => J({ a: W.assignments, o: W.observations, n: W.nvq, e: W.enrolments, c: W.certs, tas: STORE.tas, q: (W.enrolments || []).map(e => (e.modules || []).map(m => m.quiz)) });
  try { // every result is printed, whatever happens below (a failure outside T is reported, never lost)

  /* ================= V. The one validator: its contract ================= */
  await T('SCH-V validator', async () => {
    const V = f => aafcZipManifest(f), t0 = Date.now();
    let P = await V(await zipOf([['imsmanifest.xml', MAN12], RUN], false, 'v12.zip'));
    ok('SCH-V1 a valid SCORM 1.2 package (stored) is accepted: version, title, SCOs, launch read from the manifest', P.ok && P.version === 'SCORM 1.2' && P.title === 'Hoist checks 1.2' && P.scos === 1 && P.launch === 'index.html', J(P));
    P = await V(await zipOf([['imsmanifest.xml', MAN04], RUN], true, 'v04.zip'));
    ok('SCH-V2 a valid SCORM 2004 package (deflated) is accepted', P.ok && P.version === 'SCORM 2004' && P.scos === 2, J(P));
    const bad = [
      ['V3 a file that isn\'t a zip, named .zip', textFile('not a zip at all, sorry', 'fake.zip'), /isn't a valid \.zip/],
      ['V4 a file that isn\'t named .zip', textFile('x', 'pkg.rar'), /a \.zip file/],
      ['V5 no imsmanifest.xml', await zipOf([['readme.txt', 'x']], false, 'nomani.zip'), /No imsmanifest\.xml/],
      ['V6 imsmanifest.xml only in a sub-folder (must be at the top level)', await zipOf([['course/imsmanifest.xml', MAN12]], false, 'nested.zip'), /No imsmanifest\.xml at the top level/],
      ['V7 a manifest that isn\'t XML', await zipOf([['imsmanifest.xml', '<manifest><oops'], RUN], false, 'broken.zip'), /isn't a valid manifest/],
      ['V8 XML whose root isn\'t <manifest>', await zipOf([['imsmanifest.xml', '<?xml version="1.0"?><package/>']], false, 'root.zip'), /isn't a valid manifest/],
      ['V9 an unsupported SCORM version', await zipOf([['imsmanifest.xml', MAN12.replace('<schemaversion>1.2</schemaversion>', '<schemaversion>3.0</schemaversion>').replace('adlcp_rootv1p2', 'other')]], false, 'v3.zip'), /doesn't declare SCORM 1\.2 or SCORM 2004/],
      ['V10 no launchable SCO', await zipOf([['imsmanifest.xml', MAN12.replace('adlcp:scormtype="sco"', 'adlcp:scormtype="asset"')]], false, 'nosco.zip'), /no SCO/],
      ['V11 an encrypted manifest', await zipOf([['imsmanifest.xml', MAN12, { flags: 1 }]], false, 'enc.zip'), /encrypted/],
      ['V12 an unsupported compression method', await zipOf([['imsmanifest.xml', MAN12, { method: 12 }]], false, 'bz.zip'), /compression this prototype can't read/],
      ['V13 a "zip bomb": the manifest claims 100 bytes but inflates past 2 MB — stopped while inflating', await bombZip('bomb.zip'), /too large to check \(over 2 MB\)/],
      ['V14 a manifest declared over 2 MB (refused from the directory, before reading it)', await zipOf([['imsmanifest.xml', MAN12, { usize: 3 * 1024 * 1024 }]], false, 'bigman.zip'), /too large to check/],
      ['V15 a ZIP64 package', eocd(0xffff, 0, 0, 'z64.zip'), /ZIP64/],
      ['V16 an empty zip', eocd(0, 0, 0, 'empty.zip'), /empty/],
      ['V17 a directory pointing outside the file', eocd(1, 46, 5000, 'out.zip'), /damaged/],
      ['V18 a file list claimed over 16 MB (never read)', eocd(1, 17 * 1024 * 1024, 0, 'dir.zip'), /file list is too large/],
      ['V19 a package over 300 MB (refused before anything is read)', { name: 'huge.zip', size: 301 * 1024 * 1024, slice() { throw new Error('read'); } }, /larger than 300 MB/],
    ];
    for (const [n, f, re] of bad) { let x; try { x = await V(f); } catch (e) { x = { ok: 'threw', why: e.message }; } ok(`SCH-${n}: refused, safely`, x.ok === false && re.test(x.why), J(x)); }
    ok('SCH-V20 nothing inside any package ran; the whole contract ran in bounded time', !window.__schRan && Date.now() - t0 < 30000, String(Date.now() - t0));
    P = await V(await zipOf([['imsmanifest.xml', MAN12X], RUN], false, 'xss.zip'));
    ok('SCH-V21 manifest text is read as data (an HTML title stays text)', P.ok && P.title === XSS && !window.__schX, J(P.title));
  });

  /* ================= C1. Course builder → New resource ================= */
  let rid = null, pid = null, mk = null;
  await T('SCH-C1 course builder New resource', async () => {
    pick('aca'); const pr = cdPr(); pid = pr.id; const tr = (cbTree(pr) || []).filter(cbrLive), u = tr.find(x => x.mods.some(cbrLive)), m = u && u.mods.find(cbrLive);
    ok('SCH-C1 (setup) the client demo programme has a live module', !!m, J(tr.map(x => x.code))); if (!m) return; mk = u.code + ' ' + m.code;
    const n0 = S4B().res.length, ds = { p: pr.id, lvl: 'mod', u: u.code, m: m.code };
    ACT.cbrResNew({ dataset: ds });
    ok('SCH-C1-1 the dialog carries the notice and the package status line (as Add resource does)', !!MODAL && mtxt().includes(NOTE) && !!$1('#aafu-rpk') && !/doesn't play or track them/.test(mtxt()));
    fill({ '#rs-t': 'SCH builder scenario' }); $1('#rs-y').value = 'SCORM';
    ok('SCH-C1-2 a sample file can\'t stand in for a SCORM package (refused; nothing selected)', ACT.s4bSample() === false && !ui('s4bFile', ''));
    prim(); ok('SCH-C1-3 nothing selected: not saved', !!MODAL && S4B().res.length === n0);
    for (const [f, re] of [[await zipOf([['readme.txt', 'x']], false, 'cb-bad.zip'), /No imsmanifest/], [textFile('plain text', 'cb-fake.zip'), /isn't a valid \.zip/],
      [await zipOf([['imsmanifest.xml', MAN12.replace('adlcp:scormtype="sco"', 'adlcp:scormtype="asset"')]], false, 'cb-nosco.zip'), /no SCO/],
      [await bombZip('cb-bomb.zip'), /too large/]]) {
      await put('#rs-f', f, 's4bFile'); const shown = $1('#aafu-rpk').textContent; prim();
      ok(`SCH-C1-4 an invalid package is refused and not saved (was accepted before SCH): ${f.name}`, !!MODAL && S4B().res.length === n0 && shown.startsWith(`Invalid package (${f.name})`) && re.test(shown), shown);
    }
    await put('#rs-f', await zipOf([['imsmanifest.xml', MAN12X], RUN], false, 'cb12.zip'), 's4bFile');
    ok('SCH-C1-5 a valid SCORM 1.2 package: the same status wording; the HTML in its title is text', /^Validated SCORM package: cb12\.zip · SCORM 1\.2 detected · "Safe moving <img/.test($1('#aafu-rpk').textContent) && !$1('#modal-root img') && !window.__schX && !window.__schRan);
    const a0 = ADMIN.audit.length; press(); const r = S4B().res[0]; rid = r && r.id;
    ok('SCH-C1-6 saved as one Draft library record with the validated details (no file content), on the chosen module', S4B().res.length === n0 + 1 && r.title === 'SCH builder scenario' && r.kind === 'scorm' && r.type === 'SCORM' && r.status === 'Draft' && r.pid === pid && `${r.unit} ${r.mod}` === mk && r.ref === 'cb12.zip' && r.pkg && r.pkg.version === 'SCORM 1.2' && r.pkg.scos === 1 && !('data' in r.pkg) && r.version === 1, J(r));
    ok('SCH-C1-7 the first version entry records the same validated details', r.versions.length === 1 && r.versions[0].pkg && r.versions[0].pkg.version === 'SCORM 1.2', J(r.versions));
    ok('SCH-C1-8 audited as "Resource added" by the course builder', ADMIN.audit.length > a0 && ADMIN.audit.some(x => x.action === 'Resource added' && /SCH builder scenario/.test(x.entity || '')));
  });

  /* ================= Roles before publication; Draft not exposed ================= */
  await T('SCH-R roles and Draft', async () => {
    const r = resById(rid); if (!r) { ok('SCH-R (setup) resource from C1', false); return; }
    pick('nvq-sp'); s4bSyncAll(); ok('SCH-R1 a Draft SCORM resource doesn\'t reach the eligible learner', !myItem(r));
    for (const p of ['teacher', 'fin']) {
      pick(p); const n0 = S4B().res.length; ACT.cbrResNew({ dataset: { p: pid, lvl: 'prog' } }); const m1 = !!MODAL; closeModal();
      ACT.s4bPub({ dataset: { id: rid } }); reason(); closeModal();
      ok(`SCH-R2 ${p}: can't create from the course builder or publish (refused in the action)`, !m1 && S4B().res.length === n0 && r.status === 'Draft');
    }
    pick('teacher'); const tp = s4bTeacherProgs();
    if (!tp.length) ok('SCH-R3 Teacher Draft resources: not applicable in the client demo (no allocated batch with brief rights) — recorded, no permission invented', !s4bCanRes('add'));
    else {
      const n0 = S4B().res.length; ACT.aUpload(); fill({ '#rs-t': 'SCH teacher scenario' }); $1('#rs-y').value = 'SCORM';
      await put('#rs-f', await zipOf([['readme.txt', 'x']], false, 't-bad.zip'), 's4bFile'); prim(); const refused = !!MODAL && S4B().res.length === n0;
      await put('#rs-f', await zipOf([['imsmanifest.xml', MAN04]], false, 't04.zip'), 's4bFile'); press(); const t = S4B().res[0];
      ok('SCH-R3 Teacher (allocated programme): the same validation; a valid package is saved as their Draft only', refused && t.title === 'SCH teacher scenario' && t.status === 'Draft' && t.pkg && t.pkg.version === 'SCORM 2004', J([refused, t.title, t.status]));
    }
    pick('sys'); ACT.cbrResNew({ dataset: { p: pid, lvl: 'prog' } }); ok('SCH-R4 System Administrator may open the course builder\'s New resource (existing right)', !!MODAL && mtxt().includes(NOTE)); closeModal();
    pick('super'); const a0 = ADMIN.audit.length; ACT.s4bPub({ dataset: { id: rid } }); reason('SCH publish');
    ok('SCH-R5 Super Administrator publishes it (the existing Draft → Published workflow, audited)', r.status === 'Published' && ADMIN.audit.length > a0 && lastAud().action === 'Resource published');
  });

  /* ================= L. Learner access, preview, eligibility, release rules ================= */
  let later = null;
  await T('SCH-L learner access', async () => {
    const r = resById(rid); if (!r) return;
    pick('nvq-sp'); s4bSyncAll(); go('resources'); const it = myItem(r), b = it && $1(`main [data-act="openRes"][data-id="${it.id}"]`);
    ok('SCH-L1 the eligible learner sees it as "Demonstration only" with a Preview button, under the notice', !!it && !!b && b.textContent.trim() === 'Preview' && /Demonstration only/.test(b.closest('.li').textContent) && main().includes(NOTE), it && J(it));
    if (!b) return; const st0 = it.state, s0 = nvqSnap(), w0 = J(W);
    click(b);
    ok('SCH-L2 the preview: notice, package name, detected version, validation and manifest title — as text, only Close', mtxt().includes(NOTE) && /Package\s*cb12\.zip/.test(mtxt()) && /SCORM 1\.2 — detected from imsmanifest\.xml/.test(mtxt()) && /Validated — imsmanifest\.xml declares SCORM 1\.2 with 1 SCO/.test(mtxt()) && mtxt().includes(XSS) && !$1('#modal-root img') && !window.__schX && J(MODAL.actions.map(a => a.label)) === J(['Close']));
    ok('SCH-L3 nothing is launched: no frame, no link to the package\'s launch file, nothing in the package ran', !$1('#modal-root iframe, #modal-root object, #modal-root embed') && !$1('#modal-root a[href*="index.html"]') && !window.__schRan);
    closeModal(); ok('SCH-L4 the preview changed nothing in the learner\'s record (state, assignments, observations, NVQ, enrolments, certificates, quizzes)', it.state === st0 && nvqSnap() === s0 && J(W) === w0, J([it.state, st0]));
    const a0 = ADMIN.audit.length;
    ok('SCH-L5 (negative) a direct "complete this SCORM resource" call is refused and logged; nothing recorded', ACT.resScorm({ dataset: { id: it.id } }) === false && it.state === st0 && nvqSnap() === s0 && ADMIN.audit.length === a0 + 1 && /^Blocked: complete a SCORM resource/.test(lastAud().action));
    pick('short'); s4bSyncAll(); go('resources');
    ok('SCH-L6 a learner not on the programme doesn\'t get it, and can\'t open it directly by any ID', !myItem(r) && [it.id, 'res-' + r.id, r.id].every(id => ACT.openRes({ dataset: { id } }) === false) && !MODAL);
    // A second package, released on a future date: locked for the eligible learner until then
    pick('aca'); go('a-resources'); const n0 = S4B().res.length; ACT.aUpload(); fill({ '#rs-t': 'SCH later scenario' }); $1('#rs-y').value = 'SCORM';
    $1('#rs-p').value = pid; INP.s4bProg($1('#rs-p')); $1('#rs-m').value = mk; $1('input[name="rs-k"][value="date"]').checked = true; $1('#rs-dt').value = D(60).slice(0, 10);
    await put('#rs-f', await zipOf([['imsmanifest.xml', MAN04]], false, 'later04.zip'), 's4bFile'); press(); later = S4B().res.length === n0 + 1 ? S4B().res[0] : null;
    if (later) { ACT.s4bPub({ dataset: { id: later.id } }); reason('SCH publish'); }
    ok('SCH-L7 (setup) Add resource: a validated SCORM 2004 resource, released in 60 days, published', !!later && later.status === 'Published' && later.pkg.version === 'SCORM 2004' && later.rel.k === 'date', later && J([later.status, later.rel]));
    pick('nvq-sp'); s4bSyncAll(); go('resources'); const li = later && myItem(later);
    // The existing S4-01 lock gate (setup-s4b.js s4bLockGate) refuses with a message and no dialog, as for every resource type (ft-cf CF-F)
    const lr = li && ACT.openRes({ dataset: { id: li.id } });
    ok('SCH-L8 release rule kept: locked for the eligible learner; a direct open opens nothing and leaves it locked', !!li && li.state === 'Locked' && lr !== true && !MODAL && li.state === 'Locked', li && J([li.state, lr]));
  });

  /* ================= L. New version: revalidated, identity and history kept ================= */
  await T('SCH-L new version', async () => {
    const r = resById(rid); if (!r) return; pick('aca'); go('a-resources');
    const keep = J({ id: r.id, pid: r.pid, unit: r.unit, mod: r.mod, rel: r.rel, status: r.status, att: cbrAtts(pid).filter(a => a.rid === r.id) }), v1 = J(r.versions[0]);
    ACT.s4bVer({ dataset: { id: rid } }); ok('SCH-L9 New version of a SCORM resource: the notice and status line', !!MODAL && mtxt().includes(NOTE) && !!$1('#aafu-rpk'));
    ok('SCH-L10 a sample can\'t replace it', ACT.s4bSample() === false && !ui('s4bFile', ''));
    await put('#rs-f', await zipOf([['imsmanifest.xml', '<manifest><oops']], false, 'v2-bad.zip'), 's4bFile'); { const t = $1('#rsn'); if (t) t.value = 'SCH new package'; } prim();
    ok('SCH-L11 an invalid replacement is refused; version, package and history unchanged', !!MODAL && r.version === 1 && r.pkg.version === 'SCORM 1.2' && r.versions.length === 1);
    await put('#rs-f', await zipOf([['imsmanifest.xml', MAN04]], false, 'cb04.zip'), 's4bFile'); { const t = $1('#rsn'); if (t) t.value = 'SCH new package'; } press();
    ok('SCH-L12 a valid replacement: version 2 with its own detected version (SCORM 2004); same record, module, release, status and placements', r.version === 2 && r.ref === 'cb04.zip' && r.pkg.version === 'SCORM 2004' && r.pkg.scos === 2 && J({ id: r.id, pid: r.pid, unit: r.unit, mod: r.mod, rel: r.rel, status: r.status, att: cbrAtts(pid).filter(a => a.rid === r.id) }) === keep, J([r.version, r.pkg]));
    ok('SCH-L13 version history: version 1 keeps its own validated details; version 2 has the new ones', r.versions.length === 2 && J(r.versions[0]) === v1 && r.versions[0].pkg.version === 'SCORM 1.2' && r.versions[1].pkg.version === 'SCORM 2004' && lastAud().action === 'New version');
    ACT.resHist({ dataset: { id: rid } });
    ok('SCH-L14 Versions shows each version\'s validated SCORM version and says the package isn\'t stored', /Version 2 \(current\).*SCORM 2004 — validated \(details only; the package isn't stored\)/.test(mtxt()) && /Version 1.*SCORM 1\.2 — validated/.test(mtxt())); closeModal();
    pick('nvq-sp'); s4bSyncAll(); const it = myItem(r); go('resources'); if (it) ACT.openRes({ dataset: { id: it.id } });
    ok('SCH-L15 the learner\'s preview shows the current version\'s details; their item state is unchanged', !!it && /Package\s*cb04\.zip/.test(mtxt()) && /SCORM 2004 — detected/.test(mtxt()) && it.state !== 'Completed', it && it.state); closeModal();
  });

  /* ================= C2. Short course: the detected version is authoritative ================= */
  await T('SCH-C2 short-course version', async () => {
    pick('aca'); const c = ADMIN.courses.find(x => x.status === 'Published' && s1Mods(x).some(m => m.status === 'Active')); if (!c) { ok('SCH-C2 (setup) a published short course', false); return; }
    const m = s1Mods(c).find(x => x.status === 'Active'), sp = s1Spec(c); go('a-courses', { id: c.id, tab: 'modules' });
    ACT.s1ItemAdd({ dataset: { id: c.id, m: m.id } }); kind('scorm'); fill({ '#ci-t': 'SCH version item' });
    ok('SCH-C2-1 the item dialog: select ZIP only — no version select and no sample button; the notice', !$1('#ci-sv') && !$1('#modal-root [data-act="s1SampleFile"]') && mtxt().includes(NOTE) && /select ZIP/i.test(mtxt()));
    const n0 = sp.items.length; ACT.s1SampleFile(); prim(); ok('SCH-C2-2 a sample can\'t be used and nothing selected can\'t be saved', !!MODAL && sp.items.length === n0);
    await put('#ci-f', await zipOf([['imsmanifest.xml', MAN12]], false, 'item12.zip'), 's1File'); press(); const it = sp.items.find(i => i.title === 'SCH version item');
    ok('SCH-C2-3 saved with the detected version', !!it && it.scorm === 'SCORM 1.2' && it.pkg.version === 'SCORM 1.2', J(it && it.pkg)); if (!it) return;
    const pk0 = J(it.pkg);
    ACT.s1ItemEdit({ dataset: { id: c.id, i: it.id } });
    ok('SCH-C2-4 editing shows the current package (name, detected version, Validated) and offers no version choice', /Current package/.test(mtxt()) && /item12\.zip/.test(mtxt()) && /SCORM 1\.2 — detected from imsmanifest\.xml/.test(mtxt()) && /Validated — /.test(mtxt()) && !$1('#ci-sv'));
    // A forged select put into the dialog is ignored: the version never comes from the form
    $1('#ci-src').insertAdjacentHTML('beforeend', '<select id="ci-sv"><option>SCORM 1.2</option><option selected>SCORM 2004</option></select>');
    fill({ '#ci-t': 'SCH version item (renamed)' }); press();
    ok('SCH-C2-5 saved without a new ZIP: the validated version and package are kept (a forged version field is ignored)', it.title === 'SCH version item (renamed)' && it.scorm === 'SCORM 1.2' && J(it.pkg) === pk0, J([it.scorm, it.pkg]));
    ACT.s1ItemEdit({ dataset: { id: c.id, i: it.id } }); await put('#ci-f', await zipOf([['readme.txt', 'x']], false, 'item-bad.zip'), 's1File'); prim();
    ok('SCH-C2-6 an invalid replacement ZIP is refused; the item is unchanged', !!MODAL && it.scorm === 'SCORM 1.2' && J(it.pkg) === pk0); closeModal();
    ACT.s1ItemEdit({ dataset: { id: c.id, i: it.id } }); await put('#ci-f', await zipOf([['imsmanifest.xml', MAN04]], false, 'item04.zip'), 's1File'); press();
    ok('SCH-C2-7 a valid replacement ZIP updates the detected version and package (edited in place — short-course content has no version history)', it.scorm === 'SCORM 2004' && it.pkg.version === 'SCORM 2004' && it.pkg.file === 'item04.zip' && it.src === 'item04.zip', J(it.pkg));
    go('a-courses', { id: c.id, tab: 'content' }); const p = aafuPkg(it);
    ok('SCH-C2-8 the builder label, the stored details and the preview wording agree', /SCORM package SCORM 2004 · item04\.zip · validated: 2 SCOs · demonstration only/.test(main()) && p.ver === 'SCORM 2004 — detected from imsmanifest.xml' && /^Validated — /.test(p.res));
    // A record made before package validation: shown as Not checked, and editing it without a ZIP doesn't make it validated
    const lc = ADMIN.courses.find(x => s1Spec(x).items.some(i => i.kind === 'scorm' && !i.pkg && i.status === 'Active')), li = lc && s1Spec(lc).items.find(i => i.kind === 'scorm' && !i.pkg && i.status === 'Active');
    if (!li) { ok('SCH-C2-9 (setup) a SCORM item recorded before validation', false, 'none in the client demo'); return; }
    const l0 = J(li); ACT.s1ItemEdit({ dataset: { id: lc.id, i: li.id } });
    ok('SCH-C2-9 an older item without a validated package reads "Not checked" in the edit dialog', /Validation\s*Not checked/.test(mtxt()) && !/Validated — /.test(mtxt()));
    press(); ok('SCH-C2-10 saved without a ZIP it stays not checked — no validation evidence is invented', !li.pkg && J({ ...li, title: undefined, dur: undefined }) === J({ ...JSON.parse(l0), title: undefined, dur: undefined }), J(li));
  });

  /* ================= N. Short course: no completion, score, progress, attempt or certificate from SCORM ================= */
  await T('SCH-N short course negative', async () => {
    pick('short'); const e = W.enrolments.find(x => x.kind === 'short' && x.status === 'Active' && (x.content || []).some(c => c.kind === 'scorm'));
    if (!e) { ok('SCH-N (setup) an active short course with SCORM content', false); return; }
    const c = e.content.find(x => x.kind === 'scorm'), snap = () => J({ e, certs: W.certs, notifs: (W.notifs || []).length });
    const s0 = snap(); go('course', { id: e.id, tab: 'content' }); click($1(`main [data-act="openItem"][data-id="${c.id}"]`));
    ok('SCH-N1 the learner\'s SCORM item opens a labelled preview with only Close', mtxt().includes(NOTE) && J(MODAL.actions.map(a => a.label)) === J(['Close']) && !$1('#modal-root [data-act="scormFinish"]')); closeModal();
    ACT.scormFinish({ dataset: { e: e.id, id: c.id } }); ACT.openItem({ dataset: { e: e.id, id: c.id } }); closeModal();
    ok('SCH-N2 preview and a direct completion call: no completion, score, progress, rule, Pass/Fail, attempt, certificate or notice', snap() === s0);
    ok('SCH-N3 the SCORM completion rule can\'t be counted (Option C, unchanged)', !cfReqKinds({ reqs: [['Complete the interactive SCORM module', false]] }).has('scorm'));
    // Access restrictions still come first: a paused (finance) course and an ended access period
    (STORE.chPause = STORE.chPause || {})[chPKey(W.me.id, e.id)] = { by: 'SCH Finance', role: 'Finance Admin', at: now().toISOString(), reason: 'SCH test' };
    const a0 = ADMIN.audit.length, r1 = ACT.openItem({ dataset: { e: e.id, id: c.id } }), m1 = !!MODAL; closeModal();
    ok('SCH-N4 a finance-paused course: the SCORM preview is refused (logged)', r1 === false && !m1 && ADMIN.audit.length > a0);
    delete STORE.chPause[chPKey(W.me.id, e.id)];
    e.end = D(-3); render(); const a1 = ADMIN.audit.length, r2 = ACT.openItem({ dataset: { e: e.id, id: c.id } }), m2 = !!MODAL; closeModal(); const r3 = ACT.scormFinish({ dataset: { e: e.id, id: c.id } });
    ok('SCH-N5 access period ended: the SCORM preview and completion are refused (logged, access ended first)', e.status === 'Expired-Incomplete' && r2 === false && !m2 && r3 === false && ADMIN.audit.slice(0, ADMIN.audit.length - a1).some(x => /access ended/.test(x.action)) && c.state !== 'Completed', J([e.status, r2, r3]));
  });

  ACT.resetDemo(); signOutUI();
  ok('SCH reset: the demo is back to its two resources', S4B().res.length === 2 && !S4B().res.some(r => /^SCH /.test(r.title)));
  } catch (e) { R.push('FAIL SCH top level — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
