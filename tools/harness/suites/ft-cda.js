// CDA (PD-CDA-*), client demo (FIXTURE=client): course document requirements — the NVQ builder's Documents step (placement,
// add / edit / reorder / retire / remove, draft-version staging, publication, applications keep their copy, direct and agency
// admission, permissions on the actions) and the short course's Documents tab; colour-coded assessment record downloads — the real
// PDF / DOCX / ZIP files (parsed here: text, colours, pages), individual records, the completed module, the Coordinator's batch
// export, role access and refusals, record integrity and file safety.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'CDA test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } $1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`).click(); code2fa(); S.ui = {}; };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const fresh = () => { closeModal(); ACT.resetDemo(); closeModal(); };
  // a new version answers "Observation required" again (CBC1) before it can be published: Yes, as Version 1
  const obsYes = id => { go('a-programmes', { id, tab: 'details' }); const b = $1('main #cbr2-obs-yes'); if (!b) throw new Error('no observation answer'); b.checked = true; INP.cbr2Obs(b); if (MODAL) { const a = MODAL.actions.find(x => /danger|primary/.test(x.cls || '')); if (a && a.fn) a.fn(); closeModal(); } };
  const freshEx = () => { fresh(); ACT.cdaExamples(); press(); closeModal(); };
  // ---- reading the generated files ----
  const lat = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; };
  const hex = (r, g, b) => [r, g, b].map(x => Math.round(+x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const pdfDoc = u8 => { const t = lat(u8), sx = +(/startxref\n(\d+)\n%%EOF\n?$/.exec(t) || [])[1], m = /^xref\n0 (\d+)\n/.exec(t.slice(sx)), off = {};
    for (let i = 0; i < +m[1]; i++) { const e = t.substr(sx + m[0].length + 20 * i, 20); if (e[17] === 'n') off[i] = +e.slice(0, 10); }
    const obj = k => { const o = off[k]; if (o == null) return null; const a = t.indexOf('\n', o) + 1, b = t.indexOf('\n', a), dict = t.slice(a, b); return { dict, s: t.startsWith('stream\n', b + 1) ? t.substr(b + 8, +(/\/Length (\d+)/.exec(dict) || [])[1]) : null }; };
    return { t, obj, n: +m[1] }; };
  const u16 = h => { let s = ''; for (let i = 0; i < h.length; i += 4) s += String.fromCharCode(parseInt(h.substr(i, 4), 16)); return s; };
  const tuMap = s => { const m = {}; (s.match(/beginbfchar\n[\s\S]*?endbfchar/g) || []).forEach(b => b.replace(/<([0-9A-F]+)> <([0-9A-F]+)>/g, (_, c, u) => { m[c] = u16(u); })); return m; };
  const pdfRuns = u8 => { const P = pdfDoc(u8), out = [];
    for (let k = 1; k < P.n; k++) { const o = P.obj(k); if (!o || !/^<< \/Type \/Page /.test(o.dict)) continue; const fonts = {};
      o.dict.replace(/\/(F\d|T\d+) (\d+) 0 R/g, (_, nm, r) => { const f = P.obj(+r), tu = /\/ToUnicode (\d+) 0 R/.exec(f.dict); fonts[nm] = { map: tu ? tuMap(P.obj(+tu[1]).s) : {}, w: /Type3/.test(f.dict) ? 2 : 4 }; });
      P.obj(+/\/Contents (\d+) 0 R/.exec(o.dict)[1]).s.replace(/(?:\/ActualText <FEFF([0-9A-F]*)>>> BDC)|BT (3 Tr )?\/(\w+) ([\d.]+) Tf (?:[\d.]+ Tz )?(?:([\d.]+) ([\d.]+) ([\d.]+) rg )?[-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+) Tm <([0-9A-F]*)> Tj ET/g, (_, at, inv, f, sz, r, g, b, tx, ty, hx) => {
        if (at != null) { out.push({ actual: u16(at), s: '' }); return; } const F = fonts[f]; let s = ''; for (let i = 0; i < hx.length; i += F.w) s += F.map[hx.substr(i, F.w)] || '\uFFFD'; out.push({ f, c: r ? hex(r, g, b) : null, s, inv: !!inv, y: +ty }); });
    } return out; };
  const pdfText = runs => { let s = '', y = null; runs.forEach(r => { if (r.actual != null) return; if (y != null && r.y !== y && !/ $/.test(s)) s += ' '; s += r.s; y = r.y; }); return s; };
  const pdfPages = u8 => +((/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(lat(u8)) || [])[1] || 0);
  // the fill colour at a fragment of the visible text
  const colourOf = (runs, frag) => { let all = '', y = null; const cols = []; runs.filter(r => !r.inv && r.actual == null).forEach(r => { if (y != null && r.y !== y && !/ $/.test(all)) { all += ' '; cols.push(null); } all += r.s; for (let i = 0; i < r.s.length; i++) cols.push(r.c); y = r.y; }); const i = all.indexOf(frag); return i >= 0 ? cols[i] : null; };
  const unzip = u8 => { const out = {}, dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let o = 0; while (o + 30 <= u8.length && dv.getUint32(o, true) === 0x04034b50) { const n = dv.getUint32(o + 18, true), nl = dv.getUint16(o + 26, true), el = dv.getUint16(o + 28, true), name = new TextDecoder().decode(u8.subarray(o + 30, o + 30 + nl)); out[name] = u8.subarray(o + 30 + nl + el, o + 30 + nl + el + n); o += 30 + nl + el + n; } return out; };
  const docxRuns = u8 => { const x = new TextDecoder().decode(unzip(u8)['word/document.xml'] || new Uint8Array()), out = [], re = /<w:r><w:rPr>([\s\S]*?)<\/w:rPr><w:t xml:space="preserve">([\s\S]*?)<\/w:t><\/w:r>/g; let m; while ((m = re.exec(x))) out.push({ c: ((/w:val="([0-9A-F]{6})"/.exec(m[1])) || [])[1] || null, s: m[2] }); return { xml: x, runs: out }; };
  const last = () => CDA_LAST;
  const audit0 = () => ADMIN.audit[0] || {};
  const blocked = n => ADMIN.audit.length > n && /^Blocked/.test(audit0().action);

  /* ================= A — document requirements ================= */
  await T('CDA-A1 Documents tab placement', async () => {
    fresh(); pick('super'); const pr = cdPr(); go('a-programmes', { id: pr.id, tab: 'details' });
    ok('CDA-A1-1 NVQ builder steps: Course Details, Documents, Curriculum & Outcomes, then the established order', J($a('main .cbr-steps .cbr-l').map(x => x.textContent)) === J(['Course Details', 'Documents', 'Curriculum & Outcomes', 'Assessments', 'Observations', 'Fees & Payment Plans', 'Offer Letters', 'Review & Publish']), J($a('main .cbr-steps .cbr-l').map(x => x.textContent)));
    go('a-programmes', { id: pr.id, tab: 'docs' }); ok('CDA-A1-2 the old "docs" address opens the Documents step (step 2 of 8), an editable checklist area, not a summary', $1('main .cbr')?.dataset.sec === 'admdocs' && /Step 2 of 8/.test(main()) && !!$1('main .cda-ck') && !!$1('main .cda-pv'));
    go('a-programmes', { id: pr.id, tab: 'documents' }); ok('CDA-A1-3 Offer Letters keeps the letters only, with a link to Documents', !$1('main #cbr-docs') && !!$1('main .cda-moved [data-tab="admdocs"]') && !!$1('main .cbr2-lc'));
    go('a-programmes', { id: 'new' }); const st = $a('main .cbr-steps .cbr-l').map(x => x.textContent);
    ok('CDA-A1-4 a new programme (before saving) shows Documents as step 2', st[0] === 'Course Details' && st[1] === 'Documents' && st[2] === 'Curriculum & Outcomes', J(st));
    go('a-programmes', { id: pr.id, tab: 'admdocs' }); ok('CDA-A1-5 Course Details → Next leads to Documents', $a('main .cbr-foot [data-tab]').some(b => b.dataset.tab === 'details') && $a('main .cbr-foot [data-tab]').some(b => b.dataset.tab === 'curriculum'));
  });

  await T('CDA-A2/A3 editing in a draft version; publication; applications keep their copy', async () => {
    fresh(); pick('super'); const pr = cdPr(), pid = pr.id, L0 = s4List(pid), v0 = L0.v, live0 = J(L0.items), am = STORE.worlds.CD1, amDocs = J(am.docs), amV = am.signup.checklistV;
    go('a-programmes', { id: pid, tab: 'admdocs' });
    ok('CDA-A3-1 the published version is read-only: no Add / Edit / Retire, "Create new version" offered', cdaMode(pr) === 'locked' && !$1('main .cda-ck [data-act="s4CkAdd"], main .cda-ck [data-act="s4CkEdit"]') && !!$1(`main .cda-note [data-act="${pr.chNew ? 's3WizVersion' : 'newProgVersion'}"]`));
    let a0 = ADMIN.audit.length; ACT.s4CkAdd({ dataset: { p: pid } });
    ok('CDA-A3-2 …and its actions refuse a direct change (logged; nothing changes)', !MODAL && blocked(a0) && J(s4List(pid).items) === live0 && s4List(pid).v === v0);
    ACT[pr.chNew ? 's3WizVersion' : 'newProgVersion']({ dataset: { id: pid } }); reason('CDA: change the documents'); const dv = cbDraftV(pr); obsYes(pid);
    go('a-programmes', { id: pid, tab: 'admdocs' });
    ok('CDA-A3-3 a new version (draft) makes the Documents step editable, saying where changes go', cdaMode(pr) === 'stage' && dv === pr.version + 1 && !!$1('main .cda-ck [data-act="s4CkAdd"]') && new RegExp(`Changes go into Version ${dv} \\(draft\\)`).test(main()));
    $1('main .cda-ck [data-act="s4CkAdd"]').click();
    ok('CDA-A2-1 Add: name, instructions, mandatory / optional, region, formats as checkboxes, size, expiry', ['#ck-n', '#ck-g', '#ck-m', '#ck-a', '#ck-s', '#ck-e'].every(s => $1('#modal-root ' + s)) && J($a('#modal-root .cda-fmt').map(x => x.value)) === J(['PDF', 'JPG', 'PNG', 'DOCX']));
    $a('#modal-root .cda-fmt').forEach(x => { x.checked = false; }); INP.cdaFmt(); fill({ '#ck-n': 'Proof of address (CDA)', '#ck-s': '3', '#ck-g': 'A bill or bank statement from the last 3 months.' });
    ok('CDA-A2-2 no format chosen: refused', reason('CDA') === false && !s4List(pid).items.some(i => i.name === 'Proof of address (CDA)'));
    $a('#modal-root .cda-fmt').forEach(x => { x.checked = ['PDF', 'PNG'].includes(x.value); }); INP.cdaFmt(); $1('#ck-m').value = '0'; $1('#ck-e').checked = true; reason('CDA: add');
    const st = () => CDA().stage[pid], it = n => st().items.find(i => i.name === n);
    ok('CDA-A2-3 added to the draft only: formats "PDF or PNG", 3 MB, optional, expiry; the published list and its version are unchanged', !!it('Proof of address (CDA)') && it('Proof of address (CDA)').formats === 'PDF or PNG' && it('Proof of address (CDA)').max === '3 MB' && !it('Proof of address (CDA)').mand && it('Proof of address (CDA)').expiry && J(s4List(pid).items) === live0 && s4List(pid).v === v0, J(it('Proof of address (CDA)')));
    ok('CDA-A2-4 …new applicants still get the published list until the version is published', !s4DocsFor(pid, 'United Kingdom').some(d => d.name === 'Proof of address (CDA)'));
    let k = st().items.findIndex(i => i.name === 'Proof of address (CDA)'); ACT.s4CkEdit({ dataset: { p: pid, i: String(k) } }); $1('#ck-m').value = '1'; fill({ '#ck-n': 'Proof of address — utility bill (CDA)' }); reason('CDA: mandatory');
    ok('CDA-A2-5 Edit: name and mandatory changed in the draft (audited as a draft change)', !!it('Proof of address — utility bill (CDA)') && it('Proof of address — utility bill (CDA)').mand && /\(Version \d+ draft\)/.test(audit0().action));
    go('a-programmes', { id: pid, tab: 'admdocs' }); k = st().items.findIndex(i => i.name === 'Proof of address — utility bill (CDA)');
    const liveRow = st().items.findIndex(i => L0.items.some(x => x.id === i.id));
    ok('CDA-A2-6 Remove is offered for the item added in this draft, not for published items', !!$1(`main .cda-ck [data-act="s4CkRemove"][data-i="${k}"]`) && !$1(`main .cda-ck [data-act="s4CkRemove"][data-i="${liveRow}"]`));
    a0 = ADMIN.audit.length; ACT.s4CkRemove({ dataset: { p: pid, i: String(liveRow) } }); ok('CDA-A2-7 removing a published item is refused (retire instead)', !MODAL && blocked(a0) && st().items.length === L0.items.length + 1);
    ACT.s4CkRemove({ dataset: { p: pid, i: String(k) } }); reason('CDA: not needed'); ok('CDA-A2-8 the unused draft item is removed', !st().items.some(i => /utility bill/.test(i.name)) && /removed/.test(audit0().action));
    ACT.s4CkAdd({ dataset: { p: pid } }); fill({ '#ck-n': 'CV (CDA)', '#ck-g': 'Your current CV.' }); $a('#modal-root .cda-fmt').forEach(x => { x.checked = ['PDF', 'DOCX'].includes(x.value); }); INP.cdaFmt(); $1('#ck-m').value = '1'; reason('CDA: add CV');
    k = st().items.findIndex(i => i.name === 'CV (CDA)'); ACT.s4CkMove({ dataset: { p: pid, i: String(k), d: '-1' } });
    ok('CDA-A2-9 Reorder in the draft', st().items[k - 1].name === 'CV (CDA)');
    const ret = st().items.findIndex(i => i.status === 'Active' && L0.items.some(x => x.id === i.id) && !i.mand); const retName = st().items[ret].name; ACT.s4CkRetire({ dataset: { p: pid, i: String(ret) } }); reason('CDA: retire');
    ok('CDA-A2-10 Retire a published item in the draft; it stays Active in the published list', st().items[ret].status === 'Retired' && s4List(pid).items.find(i => i.name === retName).status === 'Active');
    go('a-programmes', { id: pid, tab: 'admdocs' });
    ok('CDA-A2-11 the applicant preview shows the draft list as applicants will get it (UK and UAE)', /CV \(CDA\)/.test($1('main .cda-pv').textContent) && !new RegExp(retName.replace(/[()]/g, '.')).test($1('main .cda-pv').textContent) && /UAE applicants/.test($1('main .cda-pv').textContent));
    go('a-programmes', { id: pid, tab: 'review' }); const rv = ($1('main .cb-rv-sec[data-sec="admdocs"]') || {}).textContent || '';
    ok('CDA-A2-12 Review & Publish lists the Documents step and what publishing changes', /Added: CV \(CDA\)/.test(rv) && new RegExp('Retired: ' + retName.replace(/[()]/g, '.')).test(rv), rv.slice(0, 300));
    // an agency application made before publication keeps the published list
    const L = ADMIN.learners.find(x => x.id === STORE.worlds.CD2.me.id), seat = id => ({ id, kind: 'nvq', course: pr.title, lid: L.id, learner: L.name, agency: ADMIN.agencies[0].name, at: now().toISOString(), status: 'Admission pending', bundle: null });
    const apBefore = ag1NvqApp(seat('AS-CDA-1'), L, null, true), apBeforeDocs = J(apBefore.docs);
    ACT.cbPublish({ dataset: { id: pid } }); const pubOk = reason('CDA publish') !== false; render();
    ok('CDA-A3-4 publishing the version applies the draft list as the next checklist version (from the programme version)', pubOk && pr.version === dv && s4List(pid).v === v0 + 1 && s4List(pid).items.some(i => i.name === 'CV (CDA)') && s4List(pid).items.find(i => i.name === retName).status === 'Retired' && !CDA().stage[pid] && cbCkHist(pid).slice(-1)[0].pv === dv, J([pubOk, pr.version, dv, s4List(pid).v, v0, s4List(pid).items.map(i => i.name + ':' + i.status), !!CDA().stage[pid], cbCkHist(pid).slice(-2)]));
    ok('CDA-A3-5 applications already started keep their copy and version (direct and agency)', J(am.docs) === amDocs && am.signup.checklistV === amV && J(apBefore.docs) === apBeforeDocs && apBefore.cf2Ck.v === v0);
    const apAfter = ag1NvqApp(seat('AS-CDA-2'), L, null, true), want = s4ItemsFor(pid, 'United Kingdom');
    ok('CDA-A4-1 a new agency application gets the published version: same items, mandatory flags, formats and sizes as a direct sign-up', apAfter.cf2Ck.v === v0 + 1 && J(apAfter.docs.map(d => [d.name, d.mand, d.formats, d.max])) === J(s4DocsFor(pid, 'United Kingdom').map(d => [d.name, d.mand, d.formats, d.max])) && apAfter.docs.length === want.length && apAfter.docs.find(d => d.name === 'CV (CDA)').mand && apAfter.docs.find(d => d.name === 'CV (CDA)').formats === 'PDF or DOCX');
    ok('CDA-A4-2 the retired item is no longer asked for', !apAfter.docs.some(d => d.name === retName) && !s4DocsFor(pid, 'United Kingdom').some(d => d.name === retName));
    go('a-programmes', { id: pid, tab: 'admdocs' }); ok('CDA-A3-6 the history shows the new checklist version and the programme version that published it', new RegExp(`Version ${v0 + 1}[^]*programme Version ${dv}`).test($1('main .cb-ckhist').textContent));
    ok('CDA-A3-7 the published version is read-only again', cdaMode(pr) === 'locked' && !$1('main .cda-ck [data-act="s4CkAdd"]'));
  });

  await T('CDA-A6 permissions on the actions', async () => {
    fresh(); pick('super'); const pr = cdPr(), pid = pr.id; ACT[pr.chNew ? 's3WizVersion' : 'newProgVersion']({ dataset: { id: pid } }); reason('CDA perms');
    const snap = () => J([s4List(pid), CDA().stage[pid] || null]), s0 = snap();
    for (const p of ['nvq-fa', 'coord1', 'teacher', 'assessor', 'agency', 'fin', 'iqa', 'biz']) {
      pick(p); ['s4CkAdd', 's4CkEdit', 's4CkRetire', 's4CkMove', 's4CkRemove'].forEach(a => { ACT[a]({ dataset: { p: pid, i: '0', d: '1' } }); closeModal(); });
      ok(`CDA-A6-1 ${p}: every checklist action is refused (no dialog, no change)`, snap() === s0);
    }
    // S4a rule kept: a published builder programme's checklist is the Super Administrator's; otherwise SA, Academic Admin and System Admin
    for (const p of ['aca', 'sys']) { pick(p); ACT.s4CkAdd({ dataset: { p: pid } }); ok(`CDA-A6-2 ${p}: ${pr.chNew ? 'refused on a published builder programme (Super Admin only, S4a)' : 'may edit the draft'}`, pr.chNew ? !MODAL && snap() === s0 : !!MODAL); closeModal(); }
    pick('super'); ACT.s4CkAdd({ dataset: { p: pid } }); ok('CDA-A6-3 the Super Administrator may edit the draft', !!MODAL && /Add document/.test(MODAL.title)); closeModal();
  });

  await T('CDA-A5 short course Documents tab', async () => {
    fresh(); pick('aca'); const row = ADMIN.courses.find(c => c.id === FX_SHORT); go('a-courses', { id: row.id, tab: 'details' });
    const tabs = $a('main .subtabs .tab').map(x => x.textContent.trim());
    ok('CDA-A5-1 tabs: Details, Documents, then the established tabs', tabs[0] === 'Details' && tabs[1] === 'Documents' && tabs[2] === 'Content', J(tabs));
    go('a-courses', { id: row.id, tab: 'docs' }); ok('CDA-A5-2 Documents: none by default, editable', !!$1('main .cf2-scnone') && !!$1('main [data-act="cf2ScAdd"]') && $1('main .cf2-sctab').getAttribute('aria-selected') === 'true');
    ACT.cf2ScAdd({ dataset: { id: row.id } }); ok('CDA-A5-3 the same fields and format checkboxes as programmes (no region)', $a('#modal-root .cda-fmt').length === 4 && !$1('#modal-root select#ck-a'));
    fill({ '#ck-n': 'Photo ID (CDA)', '#ck-s': '4', '#ck-g': 'Passport photo page.' }); $a('#modal-root .cda-fmt').forEach(x => { x.checked = x.value === 'JPG'; }); INP.cdaFmt(); $1('#ck-m').value = '0'; reason('CDA sc');
    ACT.cf2ScAdd({ dataset: { id: row.id } }); fill({ '#ck-n': 'Spare (CDA)' }); reason('CDA sc');
    const L = cf2ScList(row.id); ok('CDA-A5-4 added: optional, JPG, 4 MB', L.items[0].name === 'Photo ID (CDA)' && L.items[0].formats === 'JPG' && L.items[0].max === '4 MB' && !L.items[0].mand && L.items.length === 2);
    go('a-courses', { id: row.id, tab: 'docs' }); ACT.cdaScMove({ dataset: { id: row.id, i: '1', d: '-1' } }); ok('CDA-A5-5 reorder', cf2ScList(row.id).items[0].name === 'Spare (CDA)');
    ACT.cdaScRemove({ dataset: { id: row.id, i: '0' } }); reason('CDA sc'); ok('CDA-A5-6 remove an item no learner has been asked for', !cf2ScList(row.id).items.some(i => i.name === 'Spare (CDA)'));
    pick('fin'); const n0 = cf2ScList(row.id).items.length; ACT.cdaScRemove({ dataset: { id: row.id, i: '0' } }); closeModal(); ACT.cdaScMove({ dataset: { id: row.id, i: '0', d: '1' } });
    ok('CDA-A5-7 Finance can\'t remove or reorder (refused on the action)', cf2ScList(row.id).items.length === n0 && cf2ScList(row.id).items[0].name === 'Photo ID (CDA)');
    pick('short'); const c = n1bCat ? CATALOGUE.find(x => x.course === row.id || x.id === row.id) : null; if (c) { go('course-info', { id: c.id }); ok('CDA-A5-8 the learner sees the course\'s document before buying; access is not gated by it', !!$1('main .cf2-scinfo') && /Photo ID \(CDA\)/.test(main()) && /doesn't wait/.test(main())); }
    else ok('CDA-A5-8 catalogue entry for the short course', false, 'not found');
  });

  /* ================= B — assessment record downloads ================= */
  await T('CDA-B0 examples made through the normal screens', async () => {
    freshEx(); const dev = STORE.worlds.CD2, a = dev.assignments.find(x => x.id === 'a10');
    ok('CDA-B0-1 loaded without a refused step', J(CDA().demoErr) === '[]' && STORE.cda.examples === true, J(CDA().demoErr));
    ok('CDA-B0-2 Dev: Assignment 1 has three rounds with Not met → Partially met → Met feedback, published Pass', a.qs[0].rounds.length === 3 && J(a.qs[0].fb.map(f => f.rag)) === J(['R', 'A', 'G']) && cdaOutOf(dev, a).result === 'Pass');
    ok('CDA-B0-3 Dev: module U001 › M1 complete (all three criteria Achieved, incl. the observation, signed off)', cdaModState(dev, dev.tree[0], dev.tree[0].mods[0]).complete && dev.observations.some(o => o.status === 'Completed'));
    ok('CDA-B0-4 Amira: Assignment 1 Not met, resubmission required; her module not complete', STORE.worlds.CD1.assignments.find(x => x.id === 'a10').status === 'Resubmission Required' && !cdaModState(STORE.worlds.CD1, STORE.worlds.CD1.tree[0], STORE.worlds.CD1.tree[0].mods[0]).complete);
    S.demoOpen = true; render(); ok('CDA-B0-5 Demo controls show the examples as loaded', /Assessment record examples loaded/.test(($1('#demo-root') || document.body).textContent)); S.demoOpen = false; render();
  });

  await T('CDA-B2 individual record: learner, colours, content (PDF and DOCX)', async () => {
    freshEx(); const dev = STORE.worlds.CD2, before = J(dev.assignments); pick('nvq-fa'); go('assignment', { id: 'a10' });
    ok('CDA-B2-1 Learner → Assignments → assignment: Download as PDF and Word', !!$1('main [data-act="pdfDl"]') && !!$1('main [data-act="cdaAsgDl"][data-f="docx"]'));
    const browser = ['.round.ink-0 .r-ans', '.round.ink-1 .r-ans', '.round.ink-2 .r-ans'].map(s => { const e = $1('main ' + s); const m = e && /rgb\((\d+), (\d+), (\d+)\)/.exec(getComputedStyle(e).color); return m ? hex(m[1] / 255, m[2] / 255, m[3] / 255) : null; });
    const a0 = ADMIN.audit.length; $1('main [data-act="pdfDl"]').click(); const f = last(), runs = pdfRuns(f.bytes), txt = lat(f.bytes);
    ok('CDA-B2-2 a real PDF file: header, embedded Unicode font (subset, Identity-H, ToUnicode), pages, xref, trailer, named for learner and assignment', /^%PDF-1\.7/.test(txt) && /\/Subtype \/Type0 \/BaseFont \/[A-Z]{6}\+DejaVuSans \/Encoding \/Identity-H/.test(txt) && /\/FontFile2/.test(txt) && /%%EOF\n$/.test(txt) && /startxref/.test(txt) && pdfPages(f.bytes) >= 1 && f.name === 'Dev Patel (demo) (IA-L-32001) - Assignment 1 - Person-centred values.pdf', f.name);
    ok('CDA-B2-3 answer colours by round: Submission 1 black, Resubmission 1 red, Resubmission 2 amber', colourOf(runs, 'centre of their care') === '111111' && colourOf(runs, 'ask each person how') === 'C01818' && colourOf(runs, 'breakfast') === 'B06500', J([colourOf(runs, 'centre of their care'), colourOf(runs, 'ask each person how'), colourOf(runs, 'breakfast')]));
    ok('CDA-B2-4 …the same colours as the browser\'s assessment history', J(browser) === J(['111111', 'C01818', 'B06500']), J(browser));
    ok('CDA-B2-5 feedback colours by judgement, independent of the round: Not met red, Partially met amber, Met green', colourOf(runs, 'Assessor feedback — Not met') === 'AE1E1E' && colourOf(runs, 'Assessor feedback — Partially met') === '8A5A00' && colourOf(runs, 'Assessor feedback — Met') === '1A6A35' && colourOf(runs, 'add a workplace example') === '8A5A00');
    ok('CDA-B2-6 content: learner, ID, programme, batch, assignment, unit / module, presentation mode, criteria and judgements, assessor and times, references, final outcome, history', ['Dev Patel (demo)', 'IA-L-32001', 'Level 3 Diploma in Care Practice', 'DEMO-L3-JAN27', 'Unit U001', 'Questions + Criteria', '001 1.1', 'Criterion judgement: Met', 'James Pryce', 'References', 'Care Act 2014', 'Final outcome: Pass', 'Submission history', 'Colour key'].every(s => pdfText(runs).includes(s)), ['Dev Patel (demo)', 'IA-L-32001', 'Unit U001', 'Questions + Criteria', 'Criterion judgement: Met', 'References', 'Final outcome: Pass'].filter(s => !pdfText(runs).includes(s)).join('|'));
    ok('CDA-B2-7 the download is audited (learner as actor)', ADMIN.audit.length > a0 && audit0().action === 'Assessment record downloaded' && audit0().actor === 'Dev Patel (demo)');
    $1('main [data-act="cdaAsgDl"][data-f="docx"]').click(); const d = last(), z = unzip(d.bytes), dr = docxRuns(d.bytes);
    ok('CDA-B2-8 a real Word package: content types, relationships, document and properties', d.name.endsWith('.docx') && ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'docProps/core.xml'].every(n => z[n]) && /wordprocessingml\.document\.main\+xml/.test(new TextDecoder().decode(z['[Content_Types].xml'])));
    const dc = frag => (dr.runs.find(r => r.s.includes(frag)) || {}).c;
    ok('CDA-B2-9 the Word copy keeps both colour systems', dc('centre of their care') === '111111' && dc('ask each person how') === 'C01818' && dc('breakfast') === 'B06500' && dc('Assessor feedback — Not met') === 'AE1E1E' && dc('Assessor feedback — Partially met') === '8A5A00' && dc('Assessor feedback — Met') === '1A6A35');
    ok('CDA-B2-10 downloading changes no record', J(dev.assignments) === before);
    const a1 = ADMIN.audit.length, n = CDA().files.length; ACT.cdaAsgDl({ dataset: { lid: STORE.worlds.CD1.me.id, id: 'a10' } });
    ok('CDA-B2-11 the learner can\'t download another learner\'s record (refused, logged, no file)', CDA().files.length === n && blocked(a1));
    go('assignment', { id: 'a11' }); const a2 = STORE.worlds.CD1; pick('nvq-sp'); go('assignment', { id: 'a11' });
    ok('CDA-B2-12 no download where nothing was submitted', !$1('main [data-act="pdfDl"]') && !$1('main [data-act="cdaAsgDl"]')); const n2 = CDA().files.length; ACT.cdaAsgDl({ dataset: { id: 'a11' } }); ok('CDA-B2-13 …and the action refuses it', CDA().files.length === n2 && !!a2);
  });

  await T('CDA-B4 staff access to individual records', async () => {
    freshEx(); const dev = STORE.worlds.CD2, lid = dev.me.id, key = lid + '~a10', asg = chEff(lid, 'asg'), tk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === asg);
    TCH(tk); go('t-mark', { id: key }); ok('CDA-B4-1 the allocated Assessor: My Marking → submission → Download (PDF / Word)', !!$1('main .cda-dl [data-act="cdaAsgDl"]'));
    $1('main .cda-dl [data-act="cdaAsgDl"][data-f="pdf"]').click(); ok('CDA-B4-2 …the file is the learner\'s record', last().lid === lid && /Dev Patel/.test(last().name) && audit0().actor === asg);
    const other = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name !== asg && !['M', 'H'].includes(t)); TCH(other); const n = CDA().files.length; ACT.cdaAsgDl({ dataset: { lid, id: 'a10' } });
    ok(`CDA-B4-3 another Assessor / Teacher (${TAS_USERS[other].name}) is refused`, CDA().files.length === n && /^Blocked/.test(audit0().action));
    pick('teacher'); ACT.cdaAsgDl({ dataset: { lid, id: 'a10' } }); ok('CDA-B4-4 the Teacher is refused', CDA().files.length === n);
    pick('coord1'); go('c-sub', { id: key }); ok('CDA-B4-5 the batch Coordinator: Submissions → submission → Download', !!$1('main .cda-cs [data-act="cdaAsgDl"]')); $1('main .cda-cs [data-act="cdaAsgDl"]').click(); ok('CDA-B4-6 …made', last().lid === lid && CDA().files.length === n + 1);
    pick('aca'); go('a-records', { id: 'CD2-a10' }); ok('CDA-B4-7 Academic Admin: Assessment Records → submission → Download', !!$1('main .cda-ar [data-act="cdaAsgDl"]'));
    go('a-learners', { id: lid, tab: 'academic' }); ok('CDA-B4-8 Academic Admin: Learners → learner → Academic → each assignment with a record has Download', !!$1('main .cda-la [data-act="cdaAsgDl"]') && !!$1('main .cda-mrow'));
    for (const p of ['super', 'sys']) { pick(p); const k = CDA().files.length; ACT.cdaAsgDl({ dataset: { lid, id: 'a10' } }); ok(`CDA-B4-9 ${p}: allowed`, CDA().files.length === k + 1); }
    for (const p of ['fin', 'iqa', 'biz', 'agency']) { pick(p); const k = CDA().files.length; ACT.cdaAsgDl({ dataset: { lid, id: 'a10' } }); ACT.cdaModDl({ dataset: { lid, u: 'U001', m: 'M1' } }); closeModal(); ok(`CDA-B4-10 ${p}: refused (individual and module)`, CDA().files.length === k); }
    pick('coord1'); const k = CDA().files.length; ACT.cdaModDl({ dataset: { lid, u: 'U001', m: 'M1' } }); closeModal(); ok('CDA-B4-11 module documents stay with the administrators (Coordinator refused)', CDA().files.length === k);
    ok('CDA-B4-12 no download changed a marking or verification state', STORE.worlds.CD2.assignments.find(x => x.id === 'a10').status === 'Feedback Received' && !!cdaOutOf(dev, dev.assignments.find(x => x.id === 'a10')));
  });

  await T('CDA-B3 completed module document', async () => {
    freshEx(); const dev = STORE.worlds.CD2, am = STORE.worlds.CD1, lid = dev.me.id; pick('aca'); go('a-records', { tab: 'modules' });
    const li = l => $1(`main .cda-mods li[data-lid="${l}"]`);
    ok('CDA-B3-1 Records → Module documents lists the learners\' real modules: Dev complete, Amira outstanding', !!li(lid) && !!li(lid).querySelector('[data-act="cdaModDl"][data-f="docx"]') && !!li(am.me.id) && /Not complete/.test(li(am.me.id).textContent) && /001 1\.1/.test(li(am.me.id).textContent));
    li(lid).querySelector('[data-act="cdaModDl"][data-f="pdf"]').click(); const f = last(), runs = pdfRuns(f.bytes), all = pdfText(runs);
    ok('CDA-B3-2 a real multi-page PDF, cover page first', /^%PDF-1\.7/.test(lat(f.bytes)) && pdfPages(f.bytes) >= 3 && f.name === 'Dev Patel (demo) (IA-L-32001) - U001 M1 Core practice - completed module.pdf' && runs[0].s === 'Completed module record', f.name + ' ' + pdfPages(f.bytes));
    ok('CDA-B3-3 content: learner, unit / module, criteria, both assignments with every round, feedback, outcomes, observation, PD, generation details', ['IA-L-32001', 'Unit U001', '001 2.1', 'Assignment 1', 'Assignment 2', 'Resubmission 2', 'Final outcome: Pass', 'Observations', 'Professional Discussion outcomes', 'Generated'].every(s => all.includes(s)), ['IA-L-32001', 'Unit U001', '001 2.1', 'Assignment 2', 'Resubmission 2', 'Observations', 'Professional Discussion outcomes', 'Generated'].filter(s => !all.includes(s)).join('|'));
    ok('CDA-B3-4 colours survive in the module document', colourOf(runs, 'centre of their care') === '111111' && colourOf(runs, 'ask each person how') === 'C01818' && colourOf(runs, 'breakfast') === 'B06500' && colourOf(runs, 'Assessor feedback — Not met') === 'AE1E1E' && colourOf(runs, 'Assessor feedback — Met') === '1A6A35');
    ok('CDA-B3-5 every page has its page number', Array.from({ length: pdfPages(f.bytes) }, (_, i) => `Page ${i + 1} of ${pdfPages(f.bytes)}`).every(s => runs.some(r => r.s === s)));
    li(lid).querySelector('[data-act="cdaModDl"][data-f="docx"]').click(); const d = docxRuns(last().bytes);
    ok('CDA-B3-6 the Word (DOC) module document is a real .docx with the same colours and page breaks', last().name.endsWith('.docx') && /<w:pageBreakBefore\/>/.test(d.xml) && (d.runs.find(r => r.s.includes('breakfast')) || {}).c === 'B06500' && (d.runs.find(r => r.s.includes('Assessor feedback — Partially met')) || {}).c === '8A5A00');
    const n = CDA().files.length; ACT.cdaModDl({ dataset: { lid: am.me.id, u: 'U001', m: 'M1', f: 'pdf' } });
    ok('CDA-B3-7 an incomplete module is refused with its outstanding items (no file, logged)', CDA().files.length === n && !!MODAL && /isn't fully marked/.test(MODAL.body) && /001 1\.1/.test(MODAL.body) && /Blocked: generate module document/.test(audit0().action)); closeModal();
    ok('CDA-B3-8 no other learner in Dev\'s module document', !/Amira/.test(all));
  });

  await T('CDA-B3P completed module with a criterion completed through the Professional Discussion', async () => {
    // the approved workflow (PD-CO1-04, PD-2-05 / 06): an answer referred to the PD leaves its criterion "Added to PD" (pending); the PD
    // assessor's outcome Met makes it Achieved and locked. The module document follows that — no stricter or looser rule.
    fresh(); ACT.cf2Examples(); press(); closeModal(); const dev = STORE.worlds.CD2, lid = dev.me.id, u = dev.tree[0], m = u.mods[0];
    cdaEx_submit('CD2', 'a10', '<p>CDA: answer referred to the Professional Discussion.</p>');
    const tk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === chEff(lid, 'asg')); TCH(tk);
    const s = tasSubs(true).find(x => x.L.lid === lid && x.a.id === 'a10'), k = s.key, sa = tasAsg(s);
    markable(sa).forEach(x => { ACT.mkRag({ dataset: { k, q: x.id, v: 'A' } }); INP.mkField({ dataset: { k, q: x.id, f: 'fb' }, value: 'CDA: we will discuss this at your PD.' }); INP.mkExit({ dataset: { k, q: x.id }, value: 'pd' }); INP.mkField({ dataset: { k, q: x.id, f: 'pdReason' }, value: 'CDA: explore values in a discussion' }); INP.pdsPick({ checked: true, dataset: { k, q: x.id, c: qCrits(x)[0] } }); });
    ACT.mkRelease({ dataset: { k } }); press();
    cdaEx_submit('CD2', 'a11', '<p>CDA: answer to Assignment 2.</p>'); cdaEx_mark(dev, 'a11', 'G', 'pass', 'Met.'); cdaEx_observe(dev);
    const st = c => cdaTreeCrit(dev, c).c.st, ms = () => cdaModState(dev, u, m);
    ok('CDA-B3P-1 set up through the screens: 001 1.1 Added to PD (pending its outcome), 001 1.2 and 001 2.1 Achieved', st('001 1.1') === 'Added to PD' && st('001 1.2') === 'Achieved' && st('001 2.1') === 'Achieved', J(['001 1.1', '001 1.2', '001 2.1'].map(st)));
    ok('CDA-B3P-2 while its PD outcome is pending the module is not complete (PD-2-06)', !ms().complete && /001 1\.1 \(Added to PD\)/.test(ms().outstanding.join()), J(ms().outstanding));
    pick('aca'); const n0 = CDA().files.length; ACT.cdaModDl({ dataset: { lid, u: u.code, m: m.code, f: 'pdf' } });
    ok('CDA-B3P-3 …the module document is refused, naming the pending PD item', CDA().files.length === n0 && !!MODAL && /001 1\.1 \(Added to PD\)/.test(MODAL.body)); closeModal();
    const pk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === chEff(lid, 'pd')); TCH(pk); ACT.pdOutcome({ dataset: { l: lid } });
    const i = $a('#modal-root .card.flat').findIndex(x => x.textContent.includes('001 1.1')); $1(`#modal-root input[name="pdo-${i}"][value="Met"]`).checked = true; $1(`#modal-root #pdn-${i}`).value = 'CDA: clear values with a practice example.'; $1('#modal-root #pd-sign').checked = true; press();
    const it = dev.pd.items.find(x => x.ref === '001 1.1');
    ok('CDA-B3P-4 the PD assessor\'s outcome Met makes 001 1.1 Achieved (PD-2-05)', st('001 1.1') === 'Achieved' && it && it.outcome && it.outcome.result === 'Met', J(it));
    ok('CDA-B3P-5 the module is now complete', ms().complete, J([ms().outstanding, ms().unmarked]));
    pick('aca'); ACT.cdaModDl({ dataset: { lid, u: u.code, m: m.code, f: 'pdf' } }); const runs = pdfRuns(last().bytes), t = pdfText(runs);
    ok('CDA-B3P-6 the module document is made, with the referral and its PD outcome (result, PD assessor, notes) in the judgement colour', CDA().files.length === n0 + 1 && t.includes('CDA: explore values in a discussion') && t.includes('PD outcome: Met') && t.includes('CDA: clear values with a practice example.') && t.includes(TAS_USERS[pk].name) && colourOf(runs, 'PD outcome: Met') === '1A6A35');
    ok('CDA-B3P-7 …and the referred answer with its feedback (Partially met, amber) and its "Added to the Professional Discussion" note', t.includes('CDA: answer referred to the Professional Discussion.') && colourOf(runs, 'Assessor feedback — Partially met') === '8A5A00' && t.includes('Added to the Professional Discussion'));
  });

  await T('CDA-B5 batch export (Coordinator)', async () => {
    freshEx(); const b = cdBatch(); pick('coord1'); go('c-batches', { id: b.code });
    ok('CDA-B5-1 Coordinator → batch → Assignments and submissions export', !!$1('main .cda-bx [data-act="cdaBatchDlg"]') && /3 submitted assignment records/.test($1('main .cda-bx').textContent), ($1('main .cda-bx') || {}).textContent);
    $1('main .cda-bx [data-act="cdaBatchDlg"]').click();
    ok('CDA-B5-2 filters: learner, assignment, unit / module, status; PDF or Word', ['#cda-bl', '#cda-ba', '#cda-bm', '#cda-bs'].every(s => $1('#modal-root ' + s)) && $a('#modal-root input[name="cda-bf"]').length === 2 && /3 files/.test($1('#cda-bc').textContent));
    press(); const z = last(), files = unzip(z.bytes), names = Object.keys(files).sort();
    ok('CDA-B5-3 a ZIP with one PDF per learner and assignment, in a folder per learner, plus README', J(names) === J(['Amira Shah (demo) (IA-L-32000)/Assignment 1 - Person-centred values.pdf', 'Dev Patel (demo) (IA-L-32001)/Assignment 1 - Person-centred values.pdf', 'Dev Patel (demo) (IA-L-32001)/Assignment 2 - Agreeing a care plan.pdf', 'README.txt']), J(names));
    const amRuns = pdfRuns(files['Amira Shah (demo) (IA-L-32000)/Assignment 1 - Person-centred values.pdf']), devRuns = pdfRuns(files['Dev Patel (demo) (IA-L-32001)/Assignment 1 - Person-centred values.pdf']);
    ok('CDA-B5-4 each file holds only its learner (no data from another learner)', pdfText(amRuns).includes('IA-L-32000') && !/IA-L-32001|Dev Patel|breakfast/.test(pdfText(amRuns)) && !/IA-L-32000|Amira|treat everyone the same/.test(pdfText(devRuns)));
    ok('CDA-B5-5 colour-coded history kept in each file', colourOf(devRuns, 'breakfast') === 'B06500' && colourOf(amRuns, 'treat everyone the same') === '111111' && colourOf(amRuns, 'Assessor feedback — Not met') === 'AE1E1E');
    ok('CDA-B5-6 only the batch\'s learners; the export is audited with the learners included', z.entries.every(e => cdaBatchWorlds(b).some(w => w.me.id === e.lid)) && /Batch assessment records exported/.test(audit0().action) && /IA-L-32000/.test(audit0().reason));
    ACT.cdaBatchDlg({ dataset: { id: b.code } }); $1('#cda-bl').value = STORE.worlds.CD2.me.id; $1('#cda-bs').value = 'feedback'; $1('#modal-root input[name="cda-bf"][value="docx"]').checked = true; INP.cdaBF();
    ok('CDA-B5-7 filtering counts the matching records', /2 files/.test($1('#cda-bc').textContent)); press();
    ok('CDA-B5-8 filtered: only Dev, Word files', J(Object.keys(unzip(last().bytes)).sort()) === J(['Dev Patel (demo) (IA-L-32001)/Assignment 1 - Person-centred values.docx', 'Dev Patel (demo) (IA-L-32001)/Assignment 2 - Agreeing a care plan.docx', 'README.txt']));
    for (const p of ['assessor', 'aca', 'super', 'nvq-fa', 'iqa']) { pick(p); const n = CDA().files.length; ACT.cdaBatchDlg({ dataset: { id: b.code } }); const m = !!MODAL; closeModal(); ok(`CDA-B5-9 ${p}: no batch export (Coordinator capability, FR-TA-06-07)`, !m && CDA().files.length === n); }
    pick('coord1'); const n = CDA().files.length; ok('CDA-B5-10 a run with nothing matching makes no file', cdaBatchRun(b, { lid: '', aid: 'a12', mod: '', st: 'all', fmt: 'pdf' }) === false && CDA().files.length === n);
  });

  await T('CDA-C file safety and integrity', async () => {
    freshEx(); const dev = STORE.worlds.CD2, a = dev.assignments.find(x => x.id === 'a10'), keep = a.qs[0].rounds[0].html, name0 = dev.me.first;
    a.qs[0].rounds[0].html = '<p>Zoë Ångström — Łódź — Ελληνικά — Русский — שלום עולם — Việt Nam — <b>bold</b> &lt;script&gt;alert(1)&lt;/script&gt; (a) [b] \\ back</p><p>مرحبا بالعالم، هذا اختبار مع لا و ٣ نقاط.</p><p>My colleague فاطمة الزهراء wrote 2 notes.</p><p>中文测试 李华 😀 end</p><script>window.CDA_PWN = 1</script>'; dev.me.first = 'Dev/..\\:*?"<>|';
    pick('aca'); ACT.cdaAsgDl({ dataset: { lid: dev.me.id, id: 'a10', f: 'docx' } }); const d = docxRuns(last().bytes), dname = last().name;
    ok('CDA-C3-1 Word keeps every Unicode character; user text is escaped XML; scripts are not run', d.runs.some(r => r.s.includes('Zoë Ångström — Łódź')) && d.runs.some(r => r.s.includes('مرحبا بالعالم')) && d.runs.some(r => r.s.includes('中文测试 李华 😀')) && /&lt;script&gt;alert\(1\)&lt;\/script&gt;/.test(d.xml) && !/<script/.test(d.xml) && !window.CDA_PWN);
    ACT.cdaAsgDl({ dataset: { lid: dev.me.id, id: 'a10', f: 'pdf' } }); const p = last(), runs = pdfRuns(p.bytes);
    const pt = pdfText(runs), want = ['Zoë Ångström', 'Łódź', 'Ελληνικά', 'Русский', 'שלום עולם', 'Việt Nam', 'مرحبا بالعالم، هذا اختبار مع لا و ٣ نقاط.', 'فاطمة الزهراء', '中文测试', '李华', '😀', '<script>alert(1)</script>', '(a) [b] \\ back'];
    ok('CDA-C3-2 PDF keeps every script: Latin, Greek, Cyrillic, Hebrew, Vietnamese, Arabic, Chinese, emoji — extracted in reading order, nothing replaced by "?" or lost', want.every(s => pt.includes(s)) && !pt.includes('\uFFFD') && !/\?\?/.test(pt) && !p.lossy, want.filter(s => !pt.includes(s)).join(' | '));
    const lat2 = lat(p.bytes), ar = runs.filter(r => !r.inv && /[\u0600-\u06FF]/.test(r.s));
    ok('CDA-C3-2b Arabic is shaped from the font\'s presentation forms, drawn in the answer\'s round colour, with each word\'s logical text as ActualText', ar.length > 0 && ar.every(r => r.c === '111111') && ['مرحبا بالعالم، هذا اختبار مع لا و', 'نقاط.'].every(w => runs.some(r => r.actual === w)) && /<0644 0627>|<06440627>/.test(lat2.replace(/\n/g, ' ')) );
    ok('CDA-C3-2c characters outside the embedded fonts (Chinese, emoji) are drawn from the browser\'s fonts as images, with invisible text so they still extract', p.images >= 1 && /\/Subtype \/Image/.test(lat2) && /\/SMask/.test(lat2) && runs.some(r => r.inv && r.s.includes('中文测试')) && runs.some(r => r.inv && r.s.includes('😀')));
    ok('CDA-C3-2d brackets and backslashes in user text are encoded as glyphs, and the file still parses (xref, startxref)', pt.includes('(a) [b] \\ back') && /startxref\n\d+\n%%EOF/.test(lat2) && pdfPages(p.bytes) >= 1);
    ok('CDA-C3-3 file names are sanitised (no path separators or reserved characters)', !/[\\/:*?"<>|]/.test(dname.replace(/\.docx$/, '')) && !/\.\./.test(dname), dname);
    a.qs[0].rounds[0].html = keep; dev.me.first = name0;
    // the record exported is the saved one, unchanged by exporting
    ACT.cdaAsgDl({ dataset: { lid: dev.me.id, id: 'a10', f: 'pdf' } }); const r2 = pdfRuns(last().bytes);
    ok('CDA-C1-1 the saved answers appear as saved (every round), with no invented text', a.qs[0].rounds.every(r => cdaHtmlParas(r.html).every(t => pdfText(r2).includes(t.slice(0, 40)))));
    ok('CDA-C1-2 exports are recorded (who, what, when) without storing file contents in the demo', CDA().files.length >= 3 && CDA().files.every(f => !f.bytes && f.by && f.at && f.name));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
