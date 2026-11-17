// CDA (PD-CDA-*), full legacy test data: course document requirements on the seeded programmes — a published programme (NV-L3) is
// changed only through a new version, a Draft programme (NV-N1) directly, and each programme's list is its own (NV-L2, short
// courses); Admissions → Checklist builder; assessment record downloads from the seeded multi-round records (world C), and the
// Coordinator's cohort rows that have no learner record (shown with sample text) are never exported.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'CDAL test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const as = av => () => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA');
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const COO = k => { closeModal(); S.coo.v = k; S.coo.batch = 'all'; cooEnter(); S.signedIn = true; S.ui = {}; };
  const fresh = () => { closeModal(); initStore(); S.ui = {}; };
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
  const audit0 = () => ADMIN.audit[0] || {};
  const addDoc = (pid, name, mand) => { ACT.s4CkAdd({ dataset: { p: pid } }); if (!MODAL) return false; fill({ '#ck-n': name, '#ck-g': 'CDAL' }); $1('#ck-m').value = mand ? '1' : '0'; return reason('CDAL add') !== false; };

  await T('CDAL-A published seeded programme: only through a new version', async () => {
    fresh(); ACA(); const pr = s3Pr('NV-L3'), l2 = J(s4List('NV-L2')), v0 = s4List('NV-L3').v, live0 = J(s4List('NV-L3').items), c = STORE.worlds.C, cDocs = J(c.docs);
    go('a-programmes', { id: 'NV-L3', tab: 'admdocs' });
    ok('CDAL-A1 NV-L3 (published): Documents step read-only, with "Create new version"', cdaMode(pr) === 'locked' && !$1('main .cda-ck [data-act="s4CkAdd"]') && !!$1('main .cda-note [data-act="newProgVersion"]'));
    const a0 = ADMIN.audit.length; ACT.s4CkEdit({ dataset: { p: 'NV-L3', i: '0' } }); ok('CDAL-A2 a direct edit of the published list is refused and logged (S4-05 superseded by CDA-A3)', !MODAL && ADMIN.audit.length > a0 && /^Blocked/.test(audit0().action) && J(s4List('NV-L3').items) === live0);
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('CDAL version'); const dv = cbDraftV(pr);
    ok('CDAL-A3 after "Create new version" the draft is editable', cdaMode(pr) === 'stage' && dv === pr.version + 1);
    ok('CDAL-A4 add a document to the draft (mandatory)', addDoc('NV-L3', 'Care Certificate (CDAL)', true) && CDA().stage['NV-L3'].items.some(i => i.name === 'Care Certificate (CDAL)'));
    ok('CDAL-A5 NV-L3\'s published list and NV-L2\'s list are unchanged', J(s4List('NV-L3').items) === live0 && J(s4List('NV-L2')) === l2 && J(c.docs) === cDocs);
    go('a-admissions', { tab: 'builder' }); setUi('clProg', 'NV-L3'); render();
    ok('CDAL-A6 Admissions → Checklist builder shows the same card and where to change a published list', !!$1('main .cda-ck') && !!$1('main .cda-where [data-tab="admdocs"]'));
    // NV-L3's Version 3 can't be published here for an unrelated, existing reason (an L3 version needs a fee option with a delivery
    // mode — Finance); its staged list stays staged. The seeded publish path (kPubProg) is checked on NV-L2.
    SA(); ACT.kPubProg({ dataset: { id: 'NV-L3' } }); closeModal(); render();
    ok('CDAL-A7 while the version can\'t be published, the published list stays in force and the draft list stays staged', J(s4List('NV-L3').items) === live0 && CDA().stage['NV-L3'].items.some(i => i.name === 'Care Certificate (CDAL)'));
    const p2 = s3Pr('NV-L2'), v2 = s4List('NV-L2').v; ACT.newProgVersion({ dataset: { id: 'NV-L2' } }); reason('CDAL version L2'); const dv2 = cbDraftV(p2);
    ok('CDAL-A8 NV-L2: a document added in its draft version', addDoc('NV-L2', 'Driving licence (CDAL)', false) && J(s4List('NV-L3').items) === live0);
    ok('CDAL-A9 …each draft holds only its own programme\'s change', !CDA().stage['NV-L2'].items.some(i => i.name === 'Care Certificate (CDAL)') && !CDA().stage['NV-L3'].items.some(i => i.name === 'Driving licence (CDAL)') && s4List('NV-L2').v === v2 && dv2 === p2.version + 1);
    // (Publishing a seeded version needs Finance-approved fee options here — an existing rule; publication is checked in ft-cda.js.)
    ok('CDAL-A10 …both published lists, and earlier applications\' copies, are unchanged while the drafts wait', J(s4List('NV-L3').items) === live0 && J(c.docs) === cDocs && !s4List('NV-L3').items.some(i => /CDAL\)$/.test(i.name)) && s4List('NV-L2').v === v2 && J(s4DocsFor('NV-L3', 'United Kingdom').map(d => d.name)) === J(s4ItemsFor('NV-L3', 'United Kingdom').map(i => i.name)));
  });

  await T('CDAL-B Draft programme edited directly; programmes are independent', async () => {
    fresh(); SA(); const n1 = s3Pr('NV-N1'), v0 = s4List('NV-N1').v, l3 = J(s4List('NV-L3'));
    go('a-programmes', { id: 'NV-N1', tab: 'admdocs' });
    ok('CDAL-B1 NV-N1 (Draft): editable directly, said so', cdaMode(n1) === 'live' && !!$1('main .cda-ck [data-act="s4CkAdd"]') && /Draft programme/.test(main()));
    ok('CDAL-B2 add: a new checklist version at once', addDoc('NV-N1', 'Employer letter (CDAL)', false) && s4List('NV-N1').v === v0 + 1);
    go('a-programmes', { id: 'NV-N1', tab: 'admdocs' }); const k = s4List('NV-N1').items.findIndex(i => i.name === 'Employer letter (CDAL)');
    ok('CDAL-B3 an item nobody has used can be removed from a Draft programme', !!$1(`main .cda-ck [data-act="s4CkRemove"][data-i="${k}"]`)); ACT.s4CkRemove({ dataset: { p: 'NV-N1', i: String(k) } }); reason('CDAL');
    ok('CDAL-B4 …removed, as a new version (history keeps the earlier one)', !s4List('NV-N1').items.some(i => i.name === 'Employer letter (CDAL)') && s4List('NV-N1').v === v0 + 2 && cbCkHist('NV-N1').some(h => h.items.some(i => i.name === 'Employer letter (CDAL)')));
    ok('CDAL-B5 NV-L3 is not affected by NV-N1\'s changes', J(s4List('NV-L3')) === l3);
    ok('CDAL-B6 ids stay unique after a remove and an add', addDoc('NV-N1', 'Second (CDAL)', true) && new Set(s4List('NV-N1').items.map(i => i.id)).size === s4List('NV-N1').items.length);
    const r = s3Pr('NV-L3O'); if (r) { const a0 = ADMIN.audit.length; ACT.s4CkAdd({ dataset: { p: 'NV-L3O' } }); ok('CDAL-B7 a retired programme: refused, logged "(programme retired)"', !MODAL && /\(programme retired\)/.test(audit0().action) && ADMIN.audit.length > a0); }
    FA(); const s0 = J(s4List('NV-N1')); ACT.s4CkAdd({ dataset: { p: 'NV-N1' } }); closeModal(); ok('CDAL-B8 Finance is refused', J(s4List('NV-N1')) === s0);
  });

  await T('CDAL-C short courses are independent', async () => {
    fresh(); ACA(); const cs = ADMIN.courses.filter(c => typeof s1Row === 'function' && s1Row(c.id)).slice(0, 2); if (cs.length < 2) { ok('CDAL-C0 two short courses', false); return; }
    ACT.cf2ScAdd({ dataset: { id: cs[0].id } }); fill({ '#ck-n': 'Photo ID (CDAL)' }); reason('CDAL sc');
    ok('CDAL-C1 a document added to one short course is not on another', cf2ScList(cs[0].id).items.some(i => i.name === 'Photo ID (CDAL)') && !cf2ScList(cs[1].id).items.some(i => i.name === 'Photo ID (CDAL)'));
    go('a-courses', { id: cs[1].id, tab: 'docs' }); ok('CDAL-C2 the other course\'s Documents tab: none', !!$1('main .cf2-scnone') && $a('main .subtabs .tab')[1].textContent.trim() === 'Documents');
  });

  await T('CDAL-D downloads from the seeded records', async () => {
    fresh(); ACA(); const c = STORE.worlds.C, a = c.assignments.find(x => x.qs.some(q => q.rounds.length === 3)), q = a.qs.find(x => x.rounds.length === 3);
    go('a-records', { id: 'C-' + a.id }); ok('CDAL-D1 Assessment Records → a seeded submission with three rounds: Download', !!$1('main .cda-ar [data-act="cdaAsgDl"]'));
    $1('main .cda-ar [data-act="cdaAsgDl"][data-f="pdf"]').click(); const runs = pdfRuns(CDA_LAST.bytes), w1 = t => cdaHtmlParas(t)[0].slice(0, 30);
    ok('CDAL-D2 the three rounds in black, red and amber', colourOf(runs, w1(q.rounds[0].html)) === '111111' && colourOf(runs, w1(q.rounds[1].html)) === 'C01818' && colourOf(runs, w1(q.rounds[2].html)) === 'B06500', J([w1(q.rounds[0].html), colourOf(runs, w1(q.rounds[0].html)), colourOf(runs, w1(q.rounds[1].html)), colourOf(runs, w1(q.rounds[2].html))]));
    ok('CDAL-D3 feedback in its judgement colour (R then A on the same question)', q.fb.every(f => colourOf(runs, f.text.slice(0, 25)) === { R: 'AE1E1E', A: '8A5A00', G: '1A6A35' }[f.rag]));
    go('a-records', { tab: 'modules' }); ok('CDAL-D4 Module documents come from the records (the fixed sample list is gone)', !!$1('main .cda-mods') && !/Kofi Asante/.test(main()));
    // the Coordinator: cohort rows without a learner record are shown with sample text — never exported
    const bk = chBatchCodeOfW(c), b = ADMIN.batches.find(x => x.code === bk), ck = Object.keys(COO_USERS).find(k => { COO(k); return myBatches().some(x => x.code === bk); });
    if (!ck) { ok('CDAL-D5 a Coordinator for world C\'s batch', false, bk); return; }
    COO(ck); const synth = mySubmissions(true).find(s => !s.live && s.L.batch.code === bk && s.status !== 'Not Started');
    if (synth) { go('c-sub', { id: synth.key }); ok('CDAL-D5 a cohort row with sample text (no learner record): no download', !$1('main .cda-cs')); const n = CDA().files.length; ACT.cdaAsgDl({ dataset: { lid: synth.L.lid, id: synth.a.id } }); ok('CDAL-D6 …and the action makes no file', CDA().files.length === n); }
    else ok('CDAL-D5 (no sample cohort row in this batch to check)', true);
    go('c-batches', { id: bk }); const hasBx = !!$1('main .cda-bx'); if (hasBx) { ACT.cdaBatchDlg({ dataset: { id: bk } }); press(); }
    const ents = CDA_LAST && CDA_LAST.entries || [];
    ok('CDAL-D7 the batch export holds only learners with a saved record in this batch', hasBx && ents.length > 0 && ents.every(e => { const w = cdaWOf(e.lid); return w && chBatchCodeOfW(w) === bk; }), J(ents.map(e => e.lid)));
    const other = ADMIN.batches.find(x => !x.short && !myBatches().some(y => y.code === x.code)); if (other) { const n = CDA().files.length; ACT.cdaBatchDlg({ dataset: { id: other.code } }); ok('CDAL-D8 another Coordinator\'s batch: refused, logged', !MODAL && CDA().files.length === n && /^Blocked/.test(audit0().action)); closeModal(); }
    const notMine = learnerAccounts().map(v => STORE.worlds[v]).find(w => w.flags && w.flags.nvq && (w.assignments || []).some(cdaHasRecord) && !chIsMyBatchLid(w.me.id));
    if (notMine) { const n = CDA().files.length; ACT.cdaAsgDl({ dataset: { lid: notMine.me.id, id: notMine.assignments.find(cdaHasRecord).id } }); ok('CDAL-D9 a learner outside the Coordinator\'s batches: refused', CDA().files.length === n); }
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
