// AA-FINAL C — short courses and content. suites.sh runs it with FIXTURE=client.
// AA-08 categories, AA-09 duration, AA-10 price request/approval, AA-11 SCORM package check and player, AA-12 module content,
// AA-16 steps/guidance/draft wording, D5 version history, AA-22 access vs quiz limits, the g3 phantom-question Low; security
// boundaries (wrong roles, direct handler calls, confirm re-check); a real refresh, Reset demo and the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aaf-c.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aaf-c.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-aaf-c.R', J(R)); SS.setItem('ft-aaf-c.phase', String(ph)); location.reload(); };
  const reason = (r = 'AAF-C test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing ' + k); e.value = v; });
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // A .zip built here: [name, text] files, stored or deflated (only what the package check reads; CRCs are not checked)
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
  const MAN12 = '<?xml version="1.0"?><manifest identifier="M1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"><metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata><organizations default="O1"><organization identifier="O1"><title>Safe moving &lt;b id="aafcx"&gt;test&lt;/b&gt;</title><item identifier="I1" identifierref="R1"><title>Lesson</title></item></organization></organizations><resources><resource identifier="R1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>';
  const MAN04 = '<?xml version="1.0"?><manifest identifier="M2" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"><metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata><organizations default="O"><organization identifier="O"><title>Hoist practice 2004</title></organization></organizations><resources><resource identifier="A" adlcp:scormType="sco" href="a.html"/><resource identifier="B" adlcp:scormType="sco" href="b.html"/><resource identifier="C" adlcp:scormType="asset" href="c.css"/></resources></manifest>';
  const SCRIPT = ['index.html', '<script>window.__aafcRan = 1;</script>'];
  const choose = async file => { const inp = $1('#ci-f'); if (!inp) throw new Error('no file input'); const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; INP.s1File(inp); await AAFC.pending; await wait(20); return ui('aafcPkg', null); };
  const kind = k => { const s = $1('#ci-k'); s.value = k; INP.s1Kind(s); };
  const C = () => (ADMIN.courses || []).find(c => c.title === 'Safe Moving Essentials');
  const T1 = 'Safe Moving Essentials';

  if (PH === 0) {
    let id;
    await T('AAF-C AA-16 creation steps', async () => {
      pick('aca'); go('a-courses'); click($1('main [data-act="newCourse"]')); id = S.params && S.params.id; const c = s1Row(id);
      ok('AA-16 a new Draft opens on Details with the five steps and their status', !!c && c.status === 'Draft' && $a('main .aafc-steps .aafc-step').length === 5 && /Step 1 of 5\s*Details/.test(main()) && /Step 5 of 5\s*Price & publish/.test(main()) && !!$1('main .aafc-cur [aria-current="step"]'), main().slice(0, 300));
      ok('AA-16 draft wording: no "creates Version 2"; "Save draft"; the draft note', !/creates Version 2/.test(main()) && !!$a('main [data-act="s1Save"]').find(b => b.textContent.trim() === 'Save draft') && /Draft — not published/.test(main()));
      ok('AA-16 required markers on title, category, duration and access period; hints separate access period from certificate validity', $a('main .aafc-req').length >= 4 && /counted from their enrolment/.test(main()) && /Not the certificate validity/.test(main()));
      ok('AA-16 optional enrolment questions are folded away', !!$1('main details.aafc-more') && !$1('main details.aafc-more').open);
      ok('AA-10 the truncated banner is fixed', !/Certificate template and validity:/.test(main()) && /request a price on Price & publish/.test(main()));
    });
    await T('AAF-C AA-08 categories', async () => {
      const used = [...new Set(ADMIN.courses.filter(c => c.id !== id).map(c => c.cat))], before = J(ADMIN.courses.filter(c => c.id !== id).map(c => [c.id, c.cat]));
      click($1('main [data-act="aafcCats"]')); const L = aafcCats();
      ok('AA-08 every existing category joined the list (by name), no course changed', used.every(n => L.some(k => k.name === n)) && J(ADMIN.courses.filter(c => c.id !== id).map(c => [c.id, c.cat])) === before, J(L.map(k => k.name)));
      $1('#aafc-cn').value = 'Moving and positioning'; click($1('#modal-root [data-act="aafcCatAdd"]'));
      ok('AA-08 add: a new active category, audited', L.some(k => k.name === 'Moving and positioning' && k.status === 'Active') && ADMIN.audit[0].action === 'Category added' && /Moving and positioning/.test(mtxt()));
      const n0 = L.length; $1('#aafc-cn').value = 'moving AND positioning'; click($1('#modal-root [data-act="aafcCatAdd"]')); ok('AA-08 a duplicate name is refused', L.length === n0 && /already exists/.test(mtxt()));
      $1('#aafc-cn').value = 'Temporary'; click($1('#modal-root [data-act="aafcCatAdd"]')); const tmp = L.find(k => k.name === 'Temporary');
      click($1(`#modal-root [data-act="aafcCatRename"][data-k="${tmp.id}"]`)); $1('#aafc-rn').value = 'Temporary list'; reason('Clearer'); ACT.aafcCats({ dataset: {} }); ok('AA-08 rename, audited with the old and new name', tmp.name === 'Temporary list' && ADMIN.audit[0].action === 'Category renamed' && ADMIN.audit[0].before === 'Temporary');
      click($1(`#modal-root [data-act="aafcCatRetire"][data-k="${tmp.id}"]`)); reason('Not needed'); ACT.aafcCats({ dataset: {} }); ok('AA-08 retire, audited', tmp.status === 'Retired' && ADMIN.audit[0].action === 'Category retired');
      closeModal(); go('a-courses', { id, tab: 'details' }); const opts = $a('#cd-c option').map(o => o.value);
      ok('AA-08 Details picks from the active categories only (a select, not free text)', $1('#cd-c').tagName === 'SELECT' && opts.includes('Moving and positioning') && !opts.includes('Temporary list'), J(opts));
      // A rename shows on the courses using it from then on; their recorded history keeps the old name
      const hs = L.find(k => k.name === 'Health and safety'), a0 = aud(), hsCourses = ADMIN.courses.filter(c => aafcCatOf(c) === hs).length; ACT.aafcCats({ dataset: {} });
      click($1(`#modal-root [data-act="aafcCatRename"][data-k="${hs.id}"]`)); $1('#aafc-rn').value = 'Health & safety'; reason('House style'); ACT.aafcCats({ dataset: {} });
      ok('AA-08 renaming a used category: courses show the new name, one audit entry lists them, earlier audit rows untouched', ADMIN.courses.filter(c => c.cat === 'Health & safety').length === hsCourses && aud() === a0 + 1 && ADMIN.audit.slice(1).every(a => !/Health & safety/.test(a.before + a.after)), `${hsCourses}`);
      click($1(`#modal-root [data-act="aafcCatRename"][data-k="${hs.id}"]`)); $1('#aafc-rn').value = 'Health and safety'; reason('Back'); closeModal();
    });
    await T('AAF-C AA-09 duration', async () => {
      go('a-courses', { id, tab: 'details' }); const c = s1Row(id), sp = s1Spec(c);
      fill({ '#cd-t': T1, '#cd-d': 'Safe moving for new carers.', '#cd-ap': '45' }); $1('#cd-c').value = 'Moving and positioning'; $1('#cd-du').value = 'abc';
      const v0 = c.version; ACT.s1Save({ dataset: { id, t: 'details' } }); ok('AA-09 "abc" is refused with an error; nothing saved', !MODAL && c.version === v0 && /number/.test(main()));
      $1('#cd-du').value = '2.5'; $1('#cd-duu').value = 'hours'; ACT.s1Save({ dataset: { id, t: 'details' } }); ok('AA-16 the draft save dialog doesn\'t say "new version effective from today"', !!MODAL && /This course is a draft/.test(mtxt()) && !/effective from today/.test(mtxt())); reason('First details');
      ok('AA-09 saved as a number and a unit; learners see "2.5 hours"; category recorded by reference', sp.dur === '2.5 hours' && J(sp.durV) === J({ n: 2.5, unit: 'hours' }) && c.cat === 'Moving and positioning' && c.catId === aafcCats().find(k => k.name === 'Moving and positioning').id && c.access === 45);
      const sc = ADMIN.courses.find(x => x.status === 'Published' && x.id !== id), ssp = s1Spec(sc), d0 = ssp.dur; ssp.dur = 'About half a day'; delete ssp.durV;
      go('a-courses', { id: sc.id, tab: 'details' }); ok('AA-09 a free-text duration saved earlier is shown as written, not converted', $1('#cd-du').value === '' && /learners see "About half a day" until you save/.test(main()) && ssp.dur === 'About half a day');
      ssp.dur = d0; go('a-courses', { id: sc.id, tab: 'details' }); ok('AA-09 a legacy "N hours" text prefills the form only', !ssp.durV && $1('#cd-du').value !== '' && ssp.dur === d0, d0);
    });
    await T('AAF-C AA-12 modules and content', async () => {
      go('a-courses', { id, tab: 'modules' }); const c = s1Row(id);
      click($1('main [data-act="chModAdd"]')); ok('AA-12 Add module asks for a module title in a title field (not a reason box)', /Module title/.test(mtxt()) && $1('#rsn').tagName === 'INPUT' && !/Reason \(required\)/.test(mtxt()));
      prim(); ok('AA-12 an empty title is refused', !!MODAL && s1Mods(c).length === 0);
      $1('#rsn').value = 'Moving people safely'; press(); const m = s1Mods(c)[0];
      ok('g3 Low: a new module shows and stores no questions (no phantom bank questions)', m && m.quiz.qs.length === 0 && /Questions \(0 active\)/.test(main()) && !/Manual Handling Operations Regulations 1992/.test(main()));
      click($1(`main [data-act="s1ItemAdd"][data-m="${m.id}"]`)); ok('AA-12 Add content on the card opens the item dialog with that module chosen', /Add content to Moving people safely/.test(MODAL.title) && $1('#ci-m').value === m.id);
      fill({ '#ci-t': 'Handout' }); ACT.s1SampleFile(); press(); ok('AA-12 the item is added to that module (one content record)', s1Spec(c).items.length === 1 && m.items.includes(s1Spec(c).items[0].id));
      go('a-courses', { id, tab: 'content' }); ACT.s1ItemAdd({ dataset: { id } }); ok('AA-12 Content tab Add item still defaults to "Not in a module yet"', $1('#ci-m').value === ''); fill({ '#ci-t': 'Extra reading' }); ACT.s1SampleFile(); press();
      const extra = s1Spec(c).items.find(i => i.title === 'Extra reading'); go('a-courses', { id, tab: 'modules' });
      click($1(`main [data-act="aafcModPick"][data-m="${m.id}"]`)); const cb = $1(`#modal-root .aafc-ex[value="${extra.id}"]`); ok('AA-12 Add existing content lists items not in the module', !!cb && $a('#modal-root .aafc-ex').length === 1);
      cb.checked = true; press(); ok('AA-12 the existing item joins the module (no copy made)', m.items.includes(extra.id) && s1Spec(c).items.length === 2 && ADMIN.audit[0].action === 'Content added to module');
      ACT.s1QAdd({ dataset: { c: id, m: m.id } }); fill({ '#nq': 'Who checks the sling?', '#nq-o0': 'The carer', '#nq-o1': 'Nobody', '#nq-o2': 'The visitor', '#nq-o3': 'The cook' }); press();
      ok('AA-12 the module quiz gets its own question', s1ActQs(m).length === 1);
    });
    await T('AAF-C AA-11 SCORM package check', async () => {
      const c = s1Row(id), m = s1Mods(c)[0], n0 = s1Spec(c).items.length; go('a-courses', { id, tab: 'modules' });
      click($1(`main [data-act="s1ItemAdd"][data-m="${m.id}"]`)); kind('scorm'); fill({ '#ci-t': 'Interactive moving' });
      ok('AA-11 the sample path is labelled as a prototype sample', /Prototype: use a sample file \(not a real package\)/.test(mtxt()));
      let P = await choose(await zipOf([['readme.txt', 'hi']], false)); ok('AA-11 a .zip without imsmanifest.xml is refused', P.status === 'bad' && /No imsmanifest\.xml/.test(P.why) && /Not accepted/.test($1('#aafc-pk').textContent));
      prim(); ok('AA-11 an invalid package can\'t be saved', !!MODAL && s1Spec(c).items.length === n0);
      P = await choose(new File([new TextEncoder().encode('not a zip at all, sorry')], 'fake.zip')); ok('AA-11 a non-zip file named .zip is refused', P.status === 'bad' && /isn't a valid \.zip/.test(P.why), P.why);
      P = await choose(await zipOf([['imsmanifest.xml', MAN12.replace('<schemaversion>1.2</schemaversion>', '<schemaversion>9.9</schemaversion>').replace('adlcp_rootv1p2', 'other')]], false)); ok('AA-11 a manifest that isn\'t SCORM 1.2 or 2004 is refused', P.status === 'bad' && /doesn't declare SCORM 1\.2 or SCORM 2004/.test(P.why), P.why);
      P = await choose(await zipOf([['imsmanifest.xml', '<manifest><oops'], SCRIPT], false)); ok('AA-11 a broken manifest is refused', P.status === 'bad' && /valid manifest/.test(P.why), P.why);
      P = await choose(await zipOf([['imsmanifest.xml', MAN12], SCRIPT], false));
      ok('AA-11 a SCORM 1.2 package: version, title and SCOs read from the manifest; the version select follows it', P.status === 'ok' && P.version === 'SCORM 1.2' && P.scos === 1 && P.title === 'Safe moving <b id="aafcx">test</b>' && $1('#ci-sv').disabled && $1('#ci-sv').value === 'SCORM 1.2', J(P));
      ok('AA-11 nothing in the package ran and its title is shown as text', !window.__aafcRan && !$1('#aafcx') && /Checked: "Safe moving <b id="aafcx">test<\/b>"/.test($1('#aafc-pk').textContent));
      press(); const it = s1Spec(c).items[s1Spec(c).items.length - 1];
      ok('AA-11 saved with the detected version and package details (no file content kept)', it.kind === 'scorm' && it.scorm === 'SCORM 1.2' && it.pkg && it.pkg.version === 'SCORM 1.2' && it.pkg.scos === 1 && !('data' in it.pkg) && m.items.includes(it.id), J(it.pkg));
      click($1(`main [data-act="s1ItemAdd"][data-m="${m.id}"]`)); kind('scorm'); fill({ '#ci-t': 'Hoist practice' }); $1('#ci-sv').value = 'SCORM 1.2';
      P = await choose(await zipOf([['imsmanifest.xml', MAN04]], true)); press(); const it2 = s1Spec(c).items.find(i => i.title === 'Hoist practice');
      ok('AA-11 a deflated SCORM 2004 package: detected as 2004 whatever the select said; 2 SCOs', P.version === 'SCORM 2004' && it2 && it2.scorm === 'SCORM 2004' && it2.pkg.scos === 2, J(P));
      click($1(`main [data-act="s1ItemAdd"][data-m="${m.id}"]`)); kind('scorm'); fill({ '#ci-t': 'Sample scenario' }); ACT.s1SampleFile(); $1('#ci-sv').value = 'SCORM 2004'; press();
      const it3 = s1Spec(c).items.find(i => i.title === 'Sample scenario'); ok('AA-11 the prototype sample path is kept and marked as a sample', it3 && it3.pkg && it3.pkg.sample && it3.scorm === 'SCORM 2004');
      go('a-courses', { id, tab: 'content' }); ok('AA-11 the Content list says which packages were checked', /checked: 1 SCO/.test(main()) && /prototype sample \(not checked\)/.test(main()));
    });
    await T('AAF-C AA-10 price request and approval', async () => {
      const c = s1Row(id); go('a-courses', { id, tab: 'details' }); ok('AA-10 the Academic Admin\'s price stays read-only', $1('#cd-g').readOnly);
      go('a-courses', { id, tab: 'publish' }); ok('AA-16 Price & publish: price not set, a Request button, what is missing', /Not set/.test(main()) && !!$1('main [data-act="aafcPriceReq"]') && /Before publishing/.test(main()));
      ACT.pubCourse({ dataset: { id } }); ok('AA-10 publishing without a price is blocked and says how to get one', /Can't publish/.test(MODAL && MODAL.title) && /No price yet — request one/.test(mtxt())); closeModal();
      click($1('main [data-act="aafcPriceReq"]')); $1('#aafc-pp').value = '0'; reason('Cover costs'); ok('AA-10 a zero price is refused', !aafcPending(c));
      ACT.aafcPriceReq({ dataset: { id } }); $1('#aafc-pp').value = '45.5'; reason('Matches similar courses');
      const q = aafcPending(c); ok('AA-10 the request is in the Approvals Queue; the price is unchanged', !!q && q.type === 'Short-course price' && q.data.proposed === 45.5 && c.gbp === 0 && ADMIN.queue.includes(q));
      ok('AA-10 a second request is refused while one is open', ACT.aafcPriceReq({ dataset: { id } }) === false && aafcReqOf(c).length === 1);
      ACT.pubCourse({ dataset: { id } }); ok('AA-10 publishing names the pending request', new RegExp(`Price awaiting approval — ${q.id}`).test(mtxt())); closeModal();
      go('a-queue', { id: q.id }); ok('AA-10 the Academic Admin can open the request but not decide it', /Short-course price/.test(main()) && !$a(`main [data-act="qDo"][data-a="approve"]`).some(b => !b.disabled));
      const s0 = sec(); applyDecision(q, 'approve', 'self'); ok('AA-10 a direct approval by the Academic Admin is refused and logged', q.status === 'Pending' && c.gbp === 0 && sec() === s0 + 1);
      for (const p of ['biz', 'fin']) { pick(p); const s1 = sec(); applyDecision(q, 'approve', 'x'); ok(`AA-10 ${p}: a direct approval is refused and logged`, q.status === 'Pending' && c.gbp === 0 && sec() === s1 + 1); }
      pick('sys'); go('a-queue', { id: q.id }); ok('AA-10 the System Administrator sees the course and the proposed price', /Price now → proposed/.test(main()) && /£45\.50/.test(main()));
      const v0 = c.version; click($1(`main [data-act="qDo"][data-id="${q.id}"][data-a="approve"]`)); reason('Agreed');
      ok('AA-10 approved: the price is set as a new version, audited', q.status === 'Approved' && c.gbp === 45.5 && c.version === v0 + 1 && q.data.applied === c.version && ADMIN.audit.some(a => a.action === `Price approved (${q.id}) — version ${c.version}`));
      applyDecision(q, 'approve', 'again'); ok('AA-10 approving again changes nothing', c.version === v0 + 1);
    });
    await T('AAF-C publish, buy, learner SCORM', async () => {
      pick('aca'); const c = s1Row(id); go('a-courses', { id, tab: 'publish' }); ok('AA-16 Price & publish: everything in place', /Everything needed is in place/.test(main()) && /£45\.50/.test(main()));
      click($1(`main [data-act="pubCourse"][data-id="${id}"]`)); reason('Ready'); ok('E2E the Academic Admin publishes', c.status === 'Published');
      go('a-courses', { id, tab: 'versions' });
      ok('D5 version history from the recorded saves: created, details (v2), price (v3), published — nothing invented', /Course created/.test(main()) && /Saved \(details\) — version 2/.test(main()) && /Price approved .* — version 3/.test(main()) && /Published/.test(main()) && !/Module 2 quiz pass mark|Added SCORM item to Module 3/.test(main()));
      ok('D5 content and module changes are listed as not versioned', /Changes that don't create a version/.test(main()) && /Module added/.test(main()) && /Content added to module/.test(main()));
      go('a-courses', { id: 'SC-01', tab: 'versions' }); ok('D5 a seeded course: earlier versions are said to predate the audit trail (no invented rows)', /Recorded before this prototype's audit trail/.test(main()) && !/Rachel Hughes.*Module 2 quiz/.test(main()));
      go('a-courses', { id, tab: 'completion' }); ok('AA-22 Completion shows the access period apart from each quiz\'s countdown and attempts', /Access and time limits/.test(main()) && /45 days from the learner's enrolment/.test(main()) && /20-minute countdown once started · 3 attempts allowed/.test(main()) && /Course timer\s*None/.test(main()));
      pick('short'); go('browse'); const k = CATALOGUE.find(x => x.course === id); ok('E2E the learner sees it in Browse at its price and duration', !!k && /Safe Moving Essentials/.test(main()) && /£45\.50/.test(main()) && /2\.5 hours/.test(main()));
      ACT.buyCourse({ dataset: { id: k.id } }); prim(); await wait(3000); closeModal(); const e = W.enrolments.find(x => x.courseId === id);
      ok('E2E bought: the enrolment records course version 3', !!e && e.courseV === 3 && e.status === 'Active', J(e && [e.courseV, e.status]));
      const sc = e.content.find(x => x.title === 'Interactive moving'); ok('AA-11 the enrolment keeps the package\'s detected version', sc && sc.scorm === 'SCORM 1.2' && sc.pkg && sc.pkg.version === 'SCORM 1.2');
      go('course', { id: e.id, tab: 'content' }); ACT.openItem({ dataset: { e: e.id, id: sc.id } });
      ok('AA-11 the player says SCORM content isn\'t executed and completion is recorded manually; no fixed scenario, no "SCORM 1.2 player"', /Prototype: SCORM content is not executed; completion is recorded manually/.test(mtxt()) && !/Mrs P has slipped/.test(mtxt()) && !/SCORM 1\.2 player/.test(mtxt()) && /SCORM 1\.2/.test(mtxt()));
      click($1('#modal-root [data-act="scormFinish"]')); ok('AA-11 completion recorded with no score', sc.state === 'Completed' && !sc.score && !!sc.manualAt && !/92%/.test(main()));
      go('course', { id: e.id, tab: 'overview' }); ok('AA-22 learner Overview: access period from enrolment, each quiz countdown, no course timer', /Time limits/.test(main()) && /45 days from your enrolment/.test(main()) && /20-minute countdown once started/.test(main()) && /no overall time limit/.test(main()));
      go('course', { id: 'bk5', tab: 'overview' }); ok('Demo 7: CD3\'s bk5 Overview shows its access period and quiz limits', /Time limits/.test(main()) && /days from your enrolment/.test(main()));
    });
    await T('AAF-C security', async () => {
      const c = s1Row(id), m = s1Mods(c)[0], k0 = aafcCats()[0].id;
      const acts = { aafcCats: {}, aafcCatAdd: {}, aafcCatRename: { k: k0 }, aafcCatRetire: { k: k0 }, aafcModPick: { c: id, m: m.id }, aafcPriceReq: { id }, chModAdd: { c: id } };
      for (const p of ['biz', 'fin', 'agency', 'short', 'assessor']) {
        pick(p); const s0 = sec(), L0 = J(aafcCats()), n0 = s1Mods(c).length, bad = [];
        Object.entries(acts).forEach(([k, ds]) => { const m0 = MODAL; let r; try { r = ACT[k]({ dataset: ds }); } catch (e) { r = 'threw ' + e.message; } if (r !== false || (MODAL && MODAL !== m0)) bad.push(k + ':' + r); closeModal(); });
        ok(`AAF-C ${p}: categories, module content, price request and Add module are refused inside the action and logged`, !bad.length && sec() === s0 + Object.keys(acts).length && J(aafcCats()) === L0 && s1Mods(c).length === n0, J([bad, sec() - s0]));
      }
      pick('aca'); go('a-courses', { id, tab: 'content' }); ACT.s1ItemAdd({ dataset: { id } }); fill({ '#ci-t': 'Loose item' }); ACT.s1SampleFile(); press(); go('a-courses', { id, tab: 'modules' }); ACT.aafcModPick({ dataset: { c: id, m: m.id } }); const s1 = sec(), k = ADMIN.aca; ADMIN.aca = null; const cb = $1('#modal-root .aafc-ex'); if (cb) cb.checked = true; prim(); ADMIN.aca = k; closeModal();
      ok('AAF-C a dialog opened by an allowed admin is re-checked on confirm', sec() === s1 + 1);
      ACT.chModAdd({ dataset: { c: id } }); $1('#rsn').value = 'Lost identity'; const s2 = sec(), n2 = s1Mods(c).length; ADMIN.aca = null; prim(); ADMIN.aca = k; closeModal();
      ok('AAF-C Add module re-checked on confirm (AA-1 guard kept)', sec() === s2 + 1 && s1Mods(c).length === n2);
      pick('super'); ok('AAF-C the Super Administrator sets prices directly (no request)', ACT.aafcPriceReq({ dataset: { id } }) === false && !MODAL);
    });
    signOutUI(); SS.setItem('ft-aaf-c.keep', J({ id })); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-aaf-c.keep') || '{}');
    await T('AAF-C refresh', async () => {
      const c = s1Row(keep.id), sp = c && s1Spec(c), e = STORE.worlds.CD3.enrolments.find(x => x.courseId === keep.id);
      ok('AAF-C after a real refresh the course, its category, duration, packages and approved price come back', !!c && c.status === 'Published' && c.gbp === 45.5 && J(sp.durV) === J({ n: 2.5, unit: 'hours' }) && sp.items.some(i => i.pkg && i.pkg.version === 'SCORM 2004') && aafcCats().some(k => k.name === 'Moving and positioning'));
      ok('AAF-C the price request and the enrolment\'s course version come back', aafcReqOf(c).length === 1 && aafcReqOf(c)[0].status === 'Approved' && ADMIN.queue.some(i => i.id === aafcReqOf(c)[0].id) && e && e.courseV === 3);
    });
    await T('AAF-C Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('AAF-C Reset: the test course, its request and the added categories are gone; seeded categories are back', !C() && !ADMIN.queue.some(i => i.type === 'Short-course price') && !aafcCats().some(k => /Moving and positioning|Temporary/.test(k.name)) && aafcCats().some(k => k.name === 'Health and safety'));
    });
    await T('AAF-C legacy', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('a-courses');
      const used = [...new Set(ADMIN.courses.map(c => c.cat))]; ok('AAF-C legacy: the list loads and its categories migrate', /Short Courses/.test(main()) && used.every(n => aafcCats().some(k => k.name === n)), J(used));
      go('a-courses', { id: ADMIN.courses[0].id, tab: 'versions' }); ok('AAF-C legacy: no invented version rows', !/Module 2 quiz pass mark|Initial publish/.test(main()) && /Version history/.test(main()));
      go('a-courses', { id: ADMIN.courses[0].id, tab: 'modules' }); ok('AAF-C legacy: module cards have Add content', !!$1('main [data-act="s1ItemAdd"][data-m]'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aaf-c.phase'); SS.removeItem('ft-aaf-c.R');
})();
