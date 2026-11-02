// OBS-1 — Observation Criteria Library (2 Nov 2026; PD-OBS1-* in PROVISIONAL-DECISIONS.md). suites.sh runs it with FIXTURE=client.
// Phase 0 (client demo): the library (ABS from the demo build, a new category, evidence fields, required fields, versions, retire);
// the course builder tabs (Workplace / Academy Observation Criteria, inheritance, exclusions, Academy-only criteria, a category created
// in the builder, publication snapshot); per-learner location (Amira workplace, Dev Academy office) and the criteria each receives;
// the assessor's evidence, outcome and sign-off; fees on rescheduling; library edits after publication; unauthorized roles; the
// visibility rules (Observation required / Workplace unchecked keep drafts and publish nothing). Phase 1 (after a real reload): the
// state comes back; Reset demo returns to the demo; then the legacy fixture (no library, existing records unchanged).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-obs1.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-obs1.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const m = MODAL, r = prim(); if (r !== false && MODAL === m && MODAL) closeModal(); return r; };
  const reason = (r = 'OBS-1 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const tick = (cls, vals) => $a('#modal-root ' + cls).forEach(x => { if (!x.disabled) x.checked = vals.includes(x.value); });
  const radio = (name, v) => { const r = $1(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); ACT.drAs({ dataset: { p } }); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-obs1.R', J(R)); SS.setItem('ft-obs1.phase', String(ph)); location.reload(); };
  const TAS = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const ACA = () => { signOutUI(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const sec = () => ADMIN.security.length, since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const CP = 'Level 3 Diploma in Care Practice (client demo)', AM = 'IA-L-32000', DV = 'IA-L-32001';
  const prog = () => ADMIN.programmes.find(p => p.title === CP), cat = code => OL1().cats.find(c => c.code === code);
  const codes = items => (items || []).map(i => i.code).join(',');
  const tabs = () => $a('main .cb-panels .tab').map(b => b.textContent.trim());
  const panelsOf = pr => cbPanels(pr, 'observations').map(p => p[0]).join(',');
  const settings = (pr, o) => { ACT.n5Settings({ dataset: { p: pr.id } }); if (!MODAL) return false; Object.entries(o).forEach(([n, v]) => radio(n, v)); press(); return true; };
  // Coordinator persona of a learner (two Coordinators in the demo)
  const coordOf = lid => { for (const p of ['coord1', 'coord2']) { pick(p); if (chIsMyBatchLid(lid) && !mcNotMineWhy(lid)) return p; } return null; };
  const choose = (lid, ev, loc) => { pick(coordOf(lid)); go('c-learner', { id: lid, tab: 'observations' }); const s = document.getElementById('d-loc-' + ev); if (s) s.value = loc; return ACT.dObsLoc({ dataset: { l: lid, e: ev, loc } }); };
  const learnerP = lid => (lid === AM ? 'nvq-sp' : 'nvq-fa'), wk = lid => chWorldKey(lid);
  const propose = (lid, ev, at = D(12, '10:00')) => { TAS('S'); ACT.obPropose({ dataset: { l: lid } }); if (!MODAL) return 'no dialog'; $1('#op-l').value = lid; INP.obPerm($1('#op-l')); const s = document.getElementById('d-ev-s'); if (s && ev) { s.value = ev; INP.dEvPick(s); } if (($1('#modal-root input[name="op-lt"]:checked') || {}).value === 'office' && !$1('#op-office')) INP.obLt(); $1('#op-d').value = at.slice(0, 16); const t0 = toast, msgs = []; toast = (m, k) => { msgs.push(m); return t0(m, k); }; let r; try { r = prim(); } finally { toast = t0; } const errs = $a('#modal-root .err').map(e => e.textContent).join(' '); closeModal(); return r === false ? 'refused: ' + msgs.join(' | ') + ' ' + errs : r; };
  const recOf = (lid, ev) => STORE.worlds[wk(lid)].observations.find(o => o.dEv === ev && !['Cancelled', 'Rescheduled'].includes(o.status));
  const accept = (lid, o) => { pick(learnerP(lid)); ACT.obsAccept({ dataset: { id: o.id } }); prim(); closeModal(); };
  const rowId = (lid, o) => wk(lid) + '-' + o.id;
  const fees = lid => chFees().filter(f => f.lid === lid).length;
  const wpEnter = (lid, o) => { pick(learnerP(lid)); go('observations', { tab: 'workplace' }); fill({ '#wp-name': o.home, '#wp-addr': '1 Demo Street, Leeds', '#wp-pc': 'ZZ99 9ZZ', '#wp-cn': o.cname, '#wp-ce': o.cemail, '#wp-cp': '0113 496 0000', '#wp-role': 'Care Assistant', '#wp-shift': 'Days' }); SUBMIT.wpSave(); wpcSync(); return STORE.wpc.links.find(l => l.v === wk(lid) && l.kind === 'perm' && l.status === 'Active') || null; };
  const wpGrant = l => { if (!l) return false; go('w-permission', { id: l.token, tab: 'grant' }); const d = STORE.wpc.drafts[l.token]; if (!d) return false; Object.assign(d, { auth: true, agree: true, sig: l.contact.name }); SUBMIT.wpcGrant({ dataset: { t: l.token } }); return true; };
  const evAdd = (id, c, t, text) => ACT.ol1EvAdd({ dataset: { id, c, t, text } });
  const evFile = (id, c, t, name) => INP.ol1File({ dataset: { id, c, t }, files: [{ name, size: 100 }] });
  const out = (id, c, v) => ACT.ol1Out({ dataset: { id, c, v } });
  const enOf = (id, c) => ((STORE.tas.obsDraft[id] || {}).ol1 || {})[c] || { ev: {} };
  const legacyHash = () => J({ obs: Object.keys(STORE.worlds).sort().map(k => [k, STORE.worlds[k].observations || []]), tas: STORE.tas.obs, pub: STORE.n5 && STORE.n5.pub, lib: STORE.aca && STORE.aca.obsLib });

  if (PH === 0) {
    const pr = prog(), V1 = n5ConfigFor(pr.id, 1), V1J = J(V1 && V1.ol1snap); let ids = {};
    /* ---------- 1–2. The library ---------- */
    await T('OBS1-A library', async () => {
      const abs = cat('ABS'), v = abs && abs.vers[0];
      ok('OBS1-A (1) the client demo created ABS in the library through the real handlers: published Version 1, four criteria ABS-01…ABS-04, audited by the Academic Admin', !!v && abs.vers.length === 1 && codes(v.crit) === 'ABS-01,ABS-02,ABS-03,ABS-04' && ADMIN.audit.some(a => a.module === 'Observation Criteria Library' && a.action === 'Category created' && /ABS/.test(a.entity) && a.actor === 'Rachel Hughes'), J(abs && abs.vers.map(x => x.v)));
      ok('OBS1-A (2) each criterion has its own evidence fields: ABS-01 notes+photos+documents, ABS-02 notes+videos, ABS-03 documents+authorised references; required only where set', !!v && J(v.crit.map(c => [c.ev, c.req])) === J([[['notes', 'photos', 'docs'], ['notes']], [['notes', 'videos'], ['notes']], [['docs', 'refs'], ['docs']], [['notes'], ['notes']]]));
      ok('OBS1-A stable IDs: every criterion has a unique ID and code; the category has a stable ID', !!v && new Set(v.crit.map(c => c.id)).size === 4 && /^OCAT-\d+$/.test(abs.id) && v.crit.every(c => /^OCR-\d+$/.test(c.id)));
      ACA(); ok('OBS1-A the Academic Admin\'s menu has the Observation Criteria Library, and the legacy shared list is labelled as such', KNAV.some(g => g[1].some(x => x[0] === 'k-ocl')) && KNAV.some(g => g[1].some(x => x[0] === 'k-obslib' && /legacy/.test(x[1]))));
      go('k-ocl'); ok('OBS1-A the library page lists ABS (Published, Version 1) and the migration review card', !!$1('main .ol1-list tr[data-k="' + abs.id + '"]') && /Published/.test($1('main .ol1-list tr[data-k="' + abs.id + '"]').textContent) && !!$1('main .ol1-mig'));
      ACT.ol1CatNew(); fill({ '#ol1-code': 'abs', '#ol1-name': 'Duplicate' }); const r0 = prim();
      ok('OBS1-A a duplicate category code is refused (codes are unique, case-insensitive)', r0 === false && OL1().cats.filter(c => c.code === 'ABS').length === 1 && /already used/.test(($1('#modal-root .err') || {}).textContent || ''));
      closeModal(); ACT.ol1CatNew(); fill({ '#ol1-code': 'TST', '#ol1-name': 'Test standards', '#ol1-desc': 'OBS-1 test category' }); press(); const t = cat('TST');
      ok('OBS1-A (1) a new category TST is created as a draft', !!t && t.vers.length === 0 && ol1St(t) === 'Draft');
      const add = (title, instr, ev, req) => { ACT.ol1CritEdit({ dataset: { k: t.id, c: '' } }); fill({ '#ol1-ct': title, '#ol1-ci': instr }); tick('.ol1-ev', ev); tick('.ol1-rq', req); return press(); };
      const n0 = t.work.crit.length;
      ok('OBS1-A an incomplete criterion is refused (no evidence field)', add('No evidence', 'Instructions', [], []) === false && t.work.crit.length === n0); closeModal();
      ok('OBS1-A …and without instructions', add('No instructions', '', ['notes'], []) === false && t.work.crit.length === n0); closeModal();
      ok('OBS1-A …and a required field that isn\'t enabled', add('Bad required', 'Instructions', ['notes'], ['photos']) === false && t.work.crit.length === n0); closeModal();
      add('Uses equipment safely', 'Observe the safe use of equipment.', ['notes', 'photos', 'refs'], ['photos']); add('Keeps records', 'Check the written record.', ['videos', 'docs'], []);
      ok('OBS1-A (2) two criteria with several evidence types each: TST-01 (notes, photos required, references), TST-02 (videos, documents)', codes(t.work.crit) === 'TST-01,TST-02' && J(t.work.crit[0].ev) === J(['notes', 'photos', 'refs']) && J(t.work.crit[0].req) === J(['photos']) && J(t.work.crit[1].ev) === J(['videos', 'docs']));
      ok('OBS1-A a duplicate criterion title in the category is refused', add('uses equipment SAFELY', 'x', ['notes'], []) === false && t.work.crit.length === 2); closeModal();
      ACT.ol1CatPub({ dataset: { k: t.id } }); reason('First version');
      ok('OBS1-A TST published as Version 1: frozen, every criterion v1, no draft left', t.vers.length === 1 && Object.isFrozen(t.vers[0]) && t.vers[0].crit.every(c => c.v === 1) && !t.work);
      ACT.ol1CritEdit({ dataset: { k: t.id, c: t.vers[0].crit[0].id } }); fill({ '#ol1-ct': 'Uses equipment safely and correctly' }); press(); ACT.ol1CatPub({ dataset: { k: t.id } }); reason('Wording');
      ok('OBS1-A editing a published criterion makes the next category version; only the changed criterion gets v2; Version 1 keeps the old wording', t.vers.length === 2 && t.vers[1].crit[0].v === 2 && t.vers[1].crit[1].v === 1 && t.vers[0].crit[0].title === 'Uses equipment safely' && t.vers[1].crit[0].id === t.vers[0].crit[0].id);
      ACT.ol1CatNew(); fill({ '#ol1-code': 'OLD', '#ol1-name': 'Old category' }); press(); const o = cat('OLD'); ACT.ol1CritEdit({ dataset: { k: o.id, c: '' } }); fill({ '#ol1-ct': 'Old criterion', '#ol1-ci': 'x' }); tick('.ol1-ev', ['notes']); press(); ACT.ol1CatPub({ dataset: { k: o.id } }); reason('v1');
      ACT.ol1CatRetire({ dataset: { k: o.id } }); reason('Superseded');
      ok('OBS1-A a category is retired, never deleted (its version stays)', !!o.retired && o.vers.length === 1 && OL1().cats.includes(o));
      const a0 = ADMIN.audit.length; ACT.ol1CritEdit({ dataset: { k: o.id, c: '' } }); ok('OBS1-A a retired category is read-only (refused, logged)', !MODAL && blocked(a0)); closeModal();
      go('k-ocl', { id: t.id }); ok('OBS1-A the category page shows its versions (View) and where it is used', $a('main .ol1-vers [data-act="ol1CatView"]').length === 2 && !!$1('main .ol1-use'));
      ACT.ol1CatView({ dataset: { k: t.id, v: '1' } }); ok('OBS1-A any published version can be inspected read-only', !!MODAL && /Uses equipment safely/.test(MODAL.body) && !/and correctly/.test(MODAL.body)); closeModal();
      ids = { tst: t.id, old: o.id, abs: abs.id };
    });

    /* ---------- 3–6. Course builder ---------- */
    await T('OBS1-B course builder (published Version 1)', async () => {
      ACA(); go('a-programmes', { id: pr.id, tab: 'wpcrit' });
      ok('OBS1-B the Observations section has the tabs Observation configuration, Workplace Observation Criteria, Academy Observation Criteria, Observation events', J(tabs()) === J(['Observation settings', 'Workplace Observation Criteria', 'Academy Observation Criteria', 'Observation events']) /* CBX (PD-CBX-03): renamed */, J(tabs()));
      ok('OBS1-B (3) Workplace tab: ABS-01, ABS-02, ABS-03 from the library (published, frozen) with their evidence fields; not ABS-04', codes(V1.ol1snap.wp) === 'ABS-01,ABS-02,ABS-03' && $a('main .ol1-prev tr[data-code]').map(r => r.dataset.code).join() === 'ABS-01,ABS-02,ABS-03' && /Photos · required|Photos/.test(main()) && !$1('main [data-act="ol1Sel"]'));
      go('a-programmes', { id: pr.id, tab: 'offcrit' });
      ok('OBS1-B (4, 5) Academy tab: A (same as Workplace) — ABS-01…03 inherited and ABS-04 Academy only, clearly labelled', V1.ol1snap.mode === 'same' && codes(V1.ol1snap.off) === 'ABS-01,ABS-02,ABS-03,ABS-04' && $a('main .ol1-prev tr[data-from="inherited"]').length === 3 && $a('main .ol1-prev tr[data-from="office"]').length === 1 && /Inherited from Workplace/.test(main()) && /Academy only/.test(main()));
      ok('OBS1-B the library definitions are shared: ABS-01 at both locations is the same criterion ID (no duplicate entry)', V1.ol1snap.wp[0].id === V1.ol1snap.off[0].id && cat('ABS').vers[0].crit.length === 4);
    });
    let d2;
    await T('OBS1-C new version: select, inherit, exclude, create in the builder, publish', async () => {
      ACA(); ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('OBS-1 Version 2'); settings(pr, { 'n5-req': 'yes', 'n5-wp': 'Permitted', 'n5-off': 'Available' }); d2 = n5Draft(pr); // a new version chooses "required" again (N5a)
      ok('OBS1-C Version 2 (draft) starts with Version 1\'s selections', !!d2 && d2.state === 'Draft' && d2.v === 2 && d2.ol1 && d2.ol1.wp.length === 1, J(d2 && d2.ol1));
      go('a-programmes', { id: pr.id, tab: 'wpcrit' }); ACT.ol1Sel({ dataset: { p: pr.id, loc: 'wp' } });
      ok('OBS1-C Add from library: search lists the published, not retired categories (ABS, TST; not OLD)', !!MODAL && $a('#modal-root input[name="ol1-cat"]').map(x => x.value).join() === [ids.abs, ids.tst].join());
      const q = $1('#modal-root #ol1-sq'); q.value = 'equipment'; INP.ol1Find(q); ok('OBS1-C …searching a criterion\'s words finds its category', $a('#modal-root .ol1-pick').filter(x => !x.hidden).map(x => x.querySelector('input').value).join() === ids.tst);
      radio('ol1-cat', ids.tst); prim(); ok('OBS1-C …then all or chosen criteria, with a preview of each criterion\'s evidence fields', !!MODAL && $a('#modal-root .ol1-crit').length === 2 && /Videos/.test(MODAL.body)); press();
      const wp = ol1Resolve(d2, 'wp').items;
      ok('OBS1-C (3) multiple categories: Workplace now ABS-01…03 + TST-01, TST-02 (TST Version 2)', codes(wp) === 'ABS-01,ABS-02,ABS-03,TST-01,TST-02' && wp[3].catV === 2);
      const off0 = ol1Resolve(d2, 'off');
      ok('OBS1-C (4) the Academy tab inherits Workplace (TST joins it) plus the Academy-only ABS-04', codes(off0.items) === 'ABS-01,ABS-02,ABS-03,TST-01,TST-02,ABS-04' && off0.items.filter(i => i.from === 'inherited').length === 5);
      ACT.ol1Excl({ dataset: { p: pr.id, c: wp[1].id, a: 'excl' } }); const off1 = ol1Resolve(d2, 'off');
      ok('OBS1-C an inherited criterion can be excluded explicitly (ABS-02 excluded at the Academy office only)', !off1.items.some(i => i.code === 'ABS-02') && codes(off1.excluded) === 'ABS-02' && codes(ol1Resolve(d2, 'wp').items).includes('ABS-02'));
      go('a-programmes', { id: pr.id, tab: 'offcrit' }); ok('OBS1-C the Academy preview shows the excluded criterion with "Include again"', /Excluded/.test(main()) && !!$1('main [data-act="ol1Excl"][data-a="incl"]'));
      // (B5) create a category inside the course builder
      ACT.ol1CbNew({ dataset: { p: pr.id, loc: 'off' } }); fill({ '#ol1-code': 'TST', '#ol1-name': 'Again' }); const r1 = prim();
      ok('OBS1-C creating a category in the builder: a duplicate code is refused', r1 === false && OL1().cats.filter(c => c.code === 'TST').length === 1);
      $1('#ol1-code').value = 'OFX'; fill({ '#ol1-name': 'Academy office practice', '#ol1-rt-0': 'Prepares the practice room' }); const r2 = prim();
      ok('OBS1-C …an incomplete criterion is refused (no instructions, no evidence field)', r2 === false && !cat('OFX'));
      fill({ '#ol1-ri-0': 'Check the room set-up.' }); $a('#modal-root .r0-ev').forEach(x => { x.checked = ['notes', 'docs'].includes(x.value); }); ACT.ol1Row(); ok('OBS1-C …"Add another criterion" adds a row without losing what was typed', $a('#modal-root .ol1-row').length === 3 && $1('#ol1-rt-0').value === 'Prepares the practice room'); press();
      const ofx = cat('OFX'), off2 = ol1Resolve(d2, 'off');
      ok('OBS1-C (B5) saved to the shared library (published Version 1), selected immediately for the Academy office, other selections kept', !!ofx && ofx.vers.length === 1 && codes(ofx.vers[0].crit) === 'OFX-01' && off2.items.some(i => i.code === 'OFX-01' && i.from === 'office') && d2.ol1.wp.length === 2 && ADMIN.audit.some(a => a.module === 'Observation Criteria Library' && /OFX/.test(a.entity) && a.action === 'Category version published'));
      const blk = cbRvChecks(pr).block.map(x => x.msg);
      ACT.cbPublish({ dataset: { id: pr.id } }); reason('OBS-1 Version 2');
      const c2 = n5ConfigFor(pr.id, 2);
      ok('OBS1-C (6) Version 2 published: its criteria are frozen (Workplace ABS-01…03 + TST; Academy inherited without ABS-02, + ABS-04, OFX-01)', !!c2 && !!c2.ol1snap && Object.isFrozen(c2.ol1snap) && codes(c2.ol1snap.wp) === 'ABS-01,ABS-02,ABS-03,TST-01,TST-02' && codes(c2.ol1snap.off) === 'ABS-01,ABS-03,TST-01,TST-02,ABS-04,OFX-01', 'blockers: ' + blk.join(' | ') + ' · version ' + pr.version);
      ok('OBS1-C Version 1\'s published criteria are unchanged (learners on it keep them)', J(n5ConfigFor(pr.id, 1).ol1snap) === V1J);
    });

    /* ---------- 7–9. Learners ---------- */
    let oA, oD;
    await T('OBS1-D per-learner location and criteria', async () => {
      const wA = STORE.worlds[wk(AM)], wD = STORE.worlds[wk(DV)];
      ok('OBS1-D Amira and Dev are pinned to Version 1 (their requirements don\'t move to Version 2)', wA.nvq.progVersion === 1 && wD.nvq.progVersion === 1 && dCtx(wA).v === 1);
      const l = wpEnter(AM, { home: 'Brookfield House (demo)', cname: 'Ms Ruth Allen', cemail: 'r.allen@brookfield.example' }); const g = wpGrant(l);
      ok('OBS1-D Amira\'s workplace gives permission through the secure link', g && wA.workplace.perm === 'Granted', J(wA.workplace && wA.workplace.perm));
      const cA = coordOf(AM); go('c-learner', { id: AM, tab: 'observations' });
      ok('OBS1-D before a location is chosen the Coordinator sees no criteria for it', !!$1('main .ol1-coord') && /Location not chosen yet/.test($1('main .ol1-coord').textContent) && !$1('main .ol1-coord .ol1-items'));
      choose(AM, 'EV-1', 'workplace'); go('c-learner', { id: AM, tab: 'observations' });
      const cc = $a('main .ol1-coord [data-e="EV-1"] .ol1-items [data-code]').map(x => x.dataset.code).join();
      ok('OBS1-D (7) the Coordinator chooses Workplace for Amira: her criteria are ABS-01…03 only (no Academy-only ABS-04)', dSel(wA, 'EV-1').loc === 'workplace' && cc === 'ABS-01,ABS-02,ABS-03', cc + ' ' + cA);
      choose(DV, 'EV-1', 'office'); const rq = dReq(wD, dCtx(wD).evs[0]);
      ok('OBS1-D (8) Academy office for Dev raises the existing office request (learner consent, then Academic Admin)', !!rq && rq.status === 'Awaiting consent', J([dSel(wD, 'EV-1'), ADMIN.audit[0].action, ADMIN.audit[0].reason, chOrs().filter(r => r.lid === DV)]));
      pick('nvq-fa'); ACT.chOrConsent({ dataset: { id: rq.id, a: 'accept' } }); prim(); closeModal(); ACA(); ACT.qDo({ dataset: { id: rq.qid, a: 'approve' } }); reason('Agreed');
      pick(coordOf(DV)); go('c-learner', { id: DV, tab: 'observations' }); const cd = $a('main .ol1-coord [data-e="EV-1"] .ol1-items [data-code]').map(x => x.dataset.code).join();
      ok('OBS1-D Dev\'s office request approved; his criteria are the Academy ones: ABS-01…03 inherited + ABS-04', rq.status === 'Approved' && cd === 'ABS-01,ABS-02,ABS-03,ABS-04', rq.status + ' ' + cd);
      pick('nvq-sp'); go('observations'); const la = $a('main .ol1-learner .ol1-items [data-code]').map(x => x.dataset.code).join();
      pick('nvq-fa'); go('observations'); const ld = $a('main .ol1-learner .ol1-items [data-code]').map(x => x.dataset.code).join();
      ok('OBS1-D (9) each learner sees only their location\'s criteria: Amira ABS-01…03 (workplace), Dev ABS-01…04 (Academy office); "Not yet assessed"', la === 'ABS-01,ABS-02,ABS-03' && ld === 'ABS-01,ABS-02,ABS-03,ABS-04' && /Not yet assessed/.test(main()), la + ' | ' + ld);
      ok('OBS1-D James Pryce is the observation assessor of both', chEff(AM, 'obs') === TAS_USERS.S.name && chEff(DV, 'obs') === TAS_USERS.S.name, chEff(AM, 'obs'));
      TAS('S'); ACT.obPropose({ dataset: { l: AM } }); $1('#op-l').value = AM; INP.obPerm($1('#op-l')); const pc = ($1('#modal-root .ol1-propc') || {}).textContent; closeModal();
      ok('OBS1-D the assessor\'s proposal shows the location\'s library criteria (preparation)', pc === 'ABS-01, ABS-02, ABS-03', pc);
      const fA0 = fees(AM); propose(AM, 'EV-1'); oA = recOf(AM, 'EV-1');
      if (oA) accept(AM, oA); render();
      ok('OBS1-D Amira accepts: Confirmed; the observation fee follows the existing rule (one per learner per course)', !!oA && oA.status === 'Confirmed' && fees(AM) <= fA0 + 1, J(oA && oA.status) + ' fees ' + fA0 + '→' + fees(AM));
    });
    /* ---------- 10–12. Assessor ---------- */
    await T('OBS1-E assessor evidence, outcome, sign-off', async () => {
      if (!oA) throw new Error('no observation for Amira');
      const id = rowId(AM, oA), [c1, c2, c3] = n5ConfigFor(pr.id, 1).ol1snap.wp.map(i => i.id), c4 = n5ConfigFor(pr.id, 1).ol1snap.off[3].id;
      TAS('S'); go('t-obsrec', { id });
      ok('OBS1-E the record lists the workplace criteria with their instructions and only their evidence fields', $a('main .ol1-critrec').map(x => x.dataset.code).join() === 'ABS-01,ABS-02,ABS-03' && $a('main .ol1-critrec[data-code="ABS-01"] .ol1-evf').map(x => x.dataset.t).join() === 'notes,photos,docs' && $a('main .ol1-critrec[data-code="ABS-03"] .ol1-evf').map(x => x.dataset.t).join() === 'docs,refs' && /Observe how the learner greets/.test(main()));
      const box = document.getElementById(`ol1-in-${c1}-notes`); box.value = 'Knocked and introduced themself.'; click($1(`main [data-act="ol1EvAdd"][data-c="${c1}"][data-t="notes"]`)); evFile(id, c1, 'photos', 'door-sign.jpg');
      const e1 = enOf(id, c1);
      ok('OBS1-E (10) permitted evidence is recorded with its author and time (note, photo)', e1.ev.notes.length === 1 && e1.ev.notes[0].by === 'James Pryce' && !!e1.ev.notes[0].at && e1.ev.photos[0].name === 'door-sign.jpg');
      ok('OBS1-E uploading evidence does not set an outcome (never automatically Met)', !e1.out);
      const s0 = sec(); evAdd(id, c1, 'refs', 'REF-1');
      ok('OBS1-E evidence of a type the criterion doesn\'t enable is refused (security log)', !(enOf(id, c1).ev.refs || []).length && sec() === s0 + 1);
      const s1 = sec(); evAdd(id, c4, 'notes', 'x'); ok('OBS1-E a criterion of another location (ABS-04, Academy office only) can\'t be recorded on a workplace observation', !enOf(id, c4).ev.notes && sec() === s1 + 1);
      out(id, c1, 'Met'); out(id, c2, 'Not yet met'); out(id, c3, 'Met');
      ['o', 'c'].forEach(k => ACT.orT({ dataset: { s: 'nvq', c: '001 2.1', k, v: '1' } })); go('t-obsrec', { id }); const evt = $1('main .d-evt'); if (evt) { evt.checked = true; INP.dEvt(); }
      ACT.orSign({ dataset: { id } });
      ok('OBS1-E (11) sign-off is refused while a Met criterion lacks its required evidence (ABS-03 documents)', oA.status === 'Confirmed' && !MODAL && ADMIN.audit[0].action === 'Blocked: sign off observation' && /ABS-03/.test(ADMIN.audit[0].reason)); closeModal();
      out(id, c3, ''); ACT.orSign({ dataset: { id } }); ok('OBS1-E …and while a criterion has no outcome', oA.status === 'Confirmed' && !MODAL && /ABS-03: choose/.test(ADMIN.audit[0].reason)); closeModal();
      evFile(id, c3, 'docs', 'care-record.pdf'); out(id, c3, 'Met'); const fBefore = fees(AM);
      ACT.orSign({ dataset: { id } }); press();
      const r = oA.report;
      ok('OBS1-E signed off: the criteria, outcomes and evidence are frozen in the report with their versions', oA.status === 'Completed' && !!r && Object.isFrozen(r.ol1) && J(r.ol1.map(i => [i.code, i.out, i.catV, i.critV])) === J([['ABS-01', 'Met', 1, 1], ['ABS-02', 'Not yet met', 1, 1], ['ABS-03', 'Met', 1, 1]]) && r.ol1[0].evidence.photos[0].name === 'door-sign.jpg' && r.ol1[2].evidence.docs[0].name === 'care-record.pdf', J(r && r.ol1));
      const s2 = sec(); out(id, c2, 'Met'); evAdd(id, c2, 'notes', 'late');
      ok('OBS1-E (12) a signed-off record is locked: outcome and evidence changes are refused and logged', r.ol1[1].out === 'Not yet met' && sec() === s2 + 2);
      go('t-obsrec', { id }); ok('OBS1-E the signed report shows the criteria as signed off (read-only)', !!$1('main .ol1-report') && $a('main .ol1-report tr[data-code]').length === 3 && !$1('main .ol1-report [data-act]'));
      ok('OBS1-E no fee is raised by signing off', fees(AM) === fBefore);
      pick(coordOf(AM)); go('c-learner', { id: AM, tab: 'observations' }); ok('OBS1-E the Coordinator\'s overview shows each outcome and how much evidence was recorded', /Met/.test($1('main .ol1-coord').textContent) && /2 evidence items recorded/.test($1('main .ol1-coord').textContent));
      pick('nvq-sp'); go('observations'); ok('OBS1-E Amira sees her outcomes after sign-off', /Not yet met/.test($1('main .ol1-learner').textContent));
      const a0 = ADMIN.audit.length; choose(AM, 'EV-1', 'workplace'); ok('OBS1-E the location of a signed-off observation can\'t change (refused)', blocked(a0, /location/));
    });
    /* ---------- 13. Fees and rescheduling (Dev, Academy office) ---------- */
    await T('OBS1-F rescheduling and switching do not duplicate fees', async () => {
      propose(DV, 'EV-1'); oD = recOf(DV, 'EV-1'); if (!oD) throw new Error('no proposal for Dev');
      accept(DV, oD); render(); const f1 = fees(DV), w = STORE.worlds[wk(DV)], ob1 = J(w.cb9Obs || null);
      ok('OBS1-F Dev\'s Academy-office observation is confirmed (office request booked)', oD.status === 'Confirmed' && oD.locType === 'office');
      const id = rowId(DV, oD), c4 = n5ConfigFor(pr.id, 1).ol1snap.off[3].id; TAS('S'); go('t-obsrec', { id });
      ok('OBS1-F the office record lists ABS-01…03 (inherited) and ABS-04', $a('main .ol1-critrec').map(x => x.dataset.code).join() === 'ABS-01,ABS-02,ABS-03,ABS-04');
      evAdd(id, c4, 'notes', 'Briefing followed.'); ok('OBS1-F evidence on the Academy-only criterion is accepted at the office', enOf(id, c4).ev.notes.length === 1);
      const a0 = ADMIN.audit.length; choose(DV, 'EV-1', 'workplace'); ok('OBS1-F switching location while an observation is confirmed is refused (dependency reported)', dSel(w, 'EV-1').loc === 'office' && blocked(a0, /location/));
      TAS('S'); ACT.obCancel({ dataset: { id } }); $1('#oc-r').value = 'Assessor unwell'; MODAL.actions.find(x => x.label === 'Reschedule (new proposal)').fn(); await new Promise(r => setTimeout(r, 30)); closeModal();
      ok('OBS1-F rescheduled; the evidence already recorded is kept with the original record', oD.status === 'Rescheduled' && enOf(id, c4).ev.notes.length === 1);
      let k2 = 19; while ([0, 6].includes(new Date(D(k2, '10:00')).getUTCDay())) k2++; const pr2 = propose(DV, 'EV-1', D(k2, '10:00')); const o2 = recOf(DV, 'EV-1'); if (o2) accept(DV, o2); render();
      ok('OBS1-F (13) the new date is confirmed without a second fee (one per learner per course)', !!o2 && o2.status === 'Confirmed' && fees(DV) === f1 && J(w.cb9Obs || null) === ob1, `${f1}→${fees(DV)} ` + J([w.observations.map(x => [x.dEv, x.status, x.at]), ADMIN.audit.slice(0, 4).map(a => a.action + ':' + a.reason), (dReq(w, dCtx(w).evs[0]) || {}).status, pr2]));
      oD = o2;
    });
    /* ---------- 16. Unauthorized users ---------- */
    await T('OBS1-G unauthorized users', async () => {
      const id = rowId(DV, oD), c1 = n5ConfigFor(pr.id, 1).ol1snap.off[0].id, lib0 = J(OL1()), en0 = J(enOf(id, c1));
      const tries = [['Teacher (Marcus Bell)', () => { TAS('T'); out(id, c1, 'Met'); }], ['another Assessor (Omar)', () => { TAS('O'); evAdd(id, c1, 'notes', 'x'); }],
        ['the learner', () => { pick('nvq-fa'); out(id, c1, 'Met'); }], ['a Coordinator', () => { pick(coordOf(DV)); evFile(id, c1, 'photos', 'x.jpg'); }],
        ['the agency', () => { signOutUI(); S.signedIn = true; ACT.switchRole({ dataset: { r: 'agyA' } }); out(id, c1, 'Met'); ACT.ol1CatNew(); closeModal(); ACT.ol1CritEdit({ dataset: { k: ids.abs, c: '' } }); closeModal(); ACT.ol1Sel({ dataset: { p: pr.id, loc: 'wp' } }); closeModal(); }],
        ['Finance Admin', () => { signOutUI(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; ACT.ol1CatNew(); closeModal(); ACT.ol1CatRetire({ dataset: { k: ids.abs } }); closeModal(); }],
        ['a Coordinator on the library', () => { pick('coord1'); ACT.ol1CritEdit({ dataset: { k: ids.abs, c: '' } }); closeModal(); ACT.ol1Excl({ dataset: { p: pr.id, c: c1, a: 'excl' } }); }]];
      tries.forEach(([who, f]) => { const s0 = sec(); f(); ok(`OBS1-G (16) ${who} can't alter criteria, evidence or outcomes (refused, security log)`, sec() > s0 && J(OL1()) === lib0 && J(enOf(id, c1)) === en0, `${sec() - s0} events`); });
      signOutUI(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('k-ocl'); ok('OBS1-G Finance can\'t open the library page', !$1('main .ol1-list'));
      TAS('S'); out(id, c1, 'Met'); ok('OBS1-G …while the allocated assessor still can', enOf(id, c1).out === 'Met');
    });
    /* ---------- 14. Library edits after publication ---------- */
    await T('OBS1-H library edits never change published versions or records', async () => {
      ACA(); const abs = cat('ABS'), c1 = abs.vers[0].crit[0]; ACT.ol1CritEdit({ dataset: { k: abs.id, c: c1.id } }); fill({ '#ol1-ct': 'Treats everyone with dignity (v2 wording)' }); press(); ACT.ol1CatPub({ dataset: { k: abs.id } }); reason('Wording v2');
      ok('OBS1-H ABS Version 2 published with the new wording (ABS-01 criterion v2)', abs.vers.length === 2 && abs.vers[1].crit[0].v === 2 && /v2 wording/.test(abs.vers[1].crit[0].title));
      ok('OBS1-H (14) the programme\'s Version 1 and Version 2 snapshots keep the old wording', J(n5ConfigFor(pr.id, 1).ol1snap) === V1J && n5ConfigFor(pr.id, 2).ol1snap.wp[0].title === 'Treats the individual with dignity and respect');
      ok('OBS1-H Amira\'s signed-off record and Dev\'s open record keep the criteria they were given', oA.report.ol1[0].title === 'Treats the individual with dignity and respect' && ol1RecItems(g2Obs(rowId(DV, oD)))[0].title === 'Treats the individual with dignity and respect');
    });
    /* ---------- Visibility rules (Version 3 draft) ---------- */
    await T('OBS1-I visibility: hidden tabs keep drafts; disabled locations publish nothing', async () => {
      ACA(); ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('OBS-1 Version 3'); const d3 = n5Draft(pr); settings(pr, { 'n5-req': 'yes', 'n5-wp': 'Permitted', 'n5-off': 'Available' }); // a new version chooses "required" again (N5a)
      ok('OBS1-I a draft follows the library: Version 3 shows ABS-01\'s new wording', /v2 wording/.test(ol1Resolve(d3, 'wp').items[0].title));
      const keep = J(d3.ol1); settings(pr, { 'n5-req': 'no' });
      ok('OBS1-I Observation required: No → both criteria tabs are hidden; the draft selections are kept', d3.required === false && panelsOf(pr) === 'obs,events' && J(d3.ol1) === keep, panelsOf(pr));
      const a0 = ADMIN.audit.length; ACT.ol1Sel({ dataset: { p: pr.id, loc: 'wp' } }); ok('OBS1-I …and the selection handlers refuse (logged)', !MODAL && blocked(a0)); closeModal();
      ok('OBS1-I …nothing is required to publish (only a warning that they are kept)', !ol1Problems(pr, d3).block.length && ol1Problems(pr, d3).warn.length === 1 && J(ol1Snap(d3).wp) === '[]' && J(ol1Snap(d3).off) === '[]');
      settings(pr, { 'n5-req': 'yes', 'n5-wp': 'Permitted', 'n5-off': 'Available' }); ok('OBS1-I Yes again → the tabs come back with the same selections', panelsOf(pr) === 'obs,wpcrit,offcrit,events' && J(d3.ol1) === keep, panelsOf(pr));
      settings(pr, { 'n5-wp': 'Not permitted' }); const sn = ol1Snap(d3);
      ok('OBS1-I Workplace unchecked → the Workplace tab is hidden, its selections kept, and nothing of the workplace is published', panelsOf(pr) === 'obs,offcrit,events' && J(d3.ol1) === keep && sn.wp.length === 0 && sn.mode === 'own' && !sn.off.some(i => i.from === 'inherited') && codes(sn.off) === 'ABS-04,OFX-01', codes(sn.off) + ' ' + panelsOf(pr));
      ok('OBS1-I …the publishing check says the workplace selections are kept but not published', n5Check(pr).warn.some(w => /Workplace criteria selections are kept in the draft but won't be published/.test(w)));
      settings(pr, { 'n5-off': 'Not available', 'n5-wp': 'Permitted' }); ok('OBS1-I Academy office unchecked → its tab is hidden and no Academy criteria are published', panelsOf(pr) === 'obs,wpcrit,events' && ol1Snap(d3).off.length === 0);
      settings(pr, { 'n5-off': 'Available' });
    });

    let keep = {}; try { keep = { lib: OL1().cats.map(c => [c.code, c.vers.length, !!c.retired]), rep: J(oA && oA.report.ol1), dev: J(enOf(rowId(DV, oD), n5ConfigFor(pr.id, 1).ol1snap.off[0].id)), d3: J(n5Draft(prog()).ol1), v2: J(n5ConfigFor(pr.id, 2).ol1snap), devId: rowId(DV, oD) }; } catch (e) { R.push('FAIL OBS1 keep — threw ' + e.message); }
    render(); SS.setItem('ft-obs1.keep', J(keep)); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-obs1.keep') || '{}');
    await T('OBS1-J refresh and Reset', async () => {
      const pr = prog(), A = STORE.worlds[chWorldKey(AM)], o = A.observations.find(x => x.report && x.report.ol1);
      ok('OBS1-J (15) after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      ok('OBS1-J the library comes back (ABS 2 versions, TST, OLD retired, OFX)', J(OL1().cats.map(c => [c.code, c.vers.length, !!c.retired])) === J(keep.lib), J(OL1().cats.map(c => [c.code, c.vers.length, !!c.retired])));
      ok('OBS1-J the signed report, the open record\'s evidence, Version 2\'s snapshot (still frozen) and Version 3\'s draft selections come back', !!o && J(o.report.ol1) === keep.rep && Object.isFrozen(o.report.ol1) && J(((STORE.tas.obsDraft[keep.devId] || {}).ol1 || {})[n5ConfigFor(pr.id, 1).ol1snap.off[0].id] || { ev: {} }) === keep.dev && J(n5ConfigFor(pr.id, 2).ol1snap) === keep.v2 && Object.isFrozen(n5ConfigFor(pr.id, 2).ol1snap) && J(n5Draft(pr).ol1) === keep.d3);
      signOutUI(); ACT.resetDemo(); const p2 = prog(), A2 = STORE.worlds[chWorldKey(AM)];
      ok('OBS1-J Reset demo: back to the demo library (ABS Version 1 only) and Version 1 of the programme with its frozen criteria', J(OL1().cats.map(c => [c.code, c.vers.length])) === J([['ABS', 1]]) && p2.version === 1 && codes(n5ConfigFor(p2.id, 1).ol1snap.wp) === 'ABS-01,ABS-02,ABS-03');
      ok('OBS1-J Reset demo: no observation records, no fabricated outcomes, sign-offs or evidence', !A2.observations.some(x => x.dEv) && !Object.values(STORE.tas.obsDraft || {}).some(d => d.ol1));
    });
    /* ---------- Legacy fixture ---------- */
    await T('OBS1-K legacy fixture', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
      const h0 = legacyHash(), nObs = Object.values(STORE.worlds).reduce((a, w) => a + ((w && w.observations) || []).length, 0);
      ok('OBS1-K the legacy fixture has an empty library; no programme configuration has library criteria', OL1().cats.length === 0 && Object.values(STORE.n5.pub).every(x => Object.values(x).every(c => !c.ol1snap)));
      go('k-ocl'); ok('OBS1-K the library page lists the existing criteria for review (legacy shared list, programme IA criteria, NVQ criteria, earlier sign-offs) — nothing migrated', !!$1('main .ol1-mig') && /Shared criteria list \(legacy, S3-05\)/.test(main()) && /IA-1/.test(main()) && /not migrated/i.test(main()));
      go('a-programmes', { id: 'NV-L3', tab: 'obs' }); ok('OBS1-K Level 3 (seeded, published before OBS-1) still shows its configuration; its criteria tabs say none were recorded', !!$1('main .n5-nvq') && !!$1('main .n5-ia'));
      go('a-programmes', { id: 'NV-L3', tab: 'wpcrit' }); const t = $1('main .ol1-preview'); ok('OBS1-K …"No library criteria were recorded" for a version published before the library', !t || /No library criteria were recorded/.test(t.textContent));
      go('k-obslib'); ok('OBS1-K the legacy shared list page still works and points to the new library', /legacy shared list/.test(main()) && !!$1('main [data-act="kLib"]') && !!$1('main .ol1-legnote'));
      TAS('A'); go('t-obs'); const C = STORE.worlds.C; ok('OBS1-K the seeded learner keeps the existing observation flow (no event journey, no library criteria)', !dCtx(C) && !ol1LearnerCard());
      const o = tasObs().find(x => x.status === 'Completed'); if (o) go('t-obsrec', { id: o.id });
      ok('OBS1-K existing observation records, the legacy list and the published configurations are unchanged after viewing them (same content and count)', legacyHash() === h0 && Object.values(STORE.worlds).reduce((a, w) => a + ((w && w.observations) || []).length, 0) === nObs);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-obs1.phase'); SS.removeItem('ft-obs1.R'); SS.removeItem('ft-obs1.keep');
  try { localStorage.removeItem('illumin-demo:client-state'); } catch (e) { /* ignore */ }
})();
