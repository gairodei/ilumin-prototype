// SA-FINAL C — SA-02 observation entry (no foreign criteria, no other learner's workplace, no bypass of the Coordinator's location
// choice; oversight instead; list scope from the record) and SA-01 assignments & criteria mapping (manual mapping explained, source
// programme version, guide, coverage, multi-criteria kept). suites.sh runs it with FIXTURE=client; phase 1 is a real refresh, then
// Reset demo, then the legacy fixture (historical observations, the earlier entry for learners without events, NV-L2 label).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sa-c.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sa-c.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-sa-c.R', J(R)); SS.setItem('ft-sa-c.phase', String(ph)); location.reload(); };
  const sec = () => ADMIN.security.length, lastAud = () => ADMIN.audit[0] || {};
  const done = () => { SS.removeItem('ft-sa-c.R'); SS.removeItem('ft-sa-c.phase'); SS.removeItem('ft-sa-c.keep'); const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p); };
  const FOREIGN = /U306|U30\d|IA-[1-5]\b|Willowbrook|Addington/;

  if (PH === 0) {
    const w = STORE.worlds.CD1, lid = w.me.id;
    await T('SA-02 client: the dialog', async () => {
      pick('super'); go('a-observations'); const n0 = w.observations.length;
      ok('SA-02 the list button is "Observation entry" and the required events are listed per learner with who acts next', !!$1('main [data-act="newObs"]') && /Required observations by learner/.test(main()) && !!$1(`main .sac-evs tr[data-v="CD1"]`) && /Choose the location — Dr Helen Carter/.test(main()), main().slice(0, 200));
      click($1('main .page-h [data-act="newObs"]')); const t = mtxt(), opts = $a('#modal-root #no-l option').map(o => o.value);
      ok('SA-02 the dialog offers the client demo learners and shows the pinned programme version, Coordinator and assessor', opts.includes('CD1') && !opts.includes('C') && /Care Practice \(client demo\) — Version 1 \(pinned at enrolment\)/.test(t) && /Dr Helen Carter — chooses each location/.test(t) && /James Pryce — proposes the date/.test(t), J(opts));
      ok('SA-02 (#4) no foreign criteria: the event\'s own NVQ criterion 001 2.1 with its source, the library ABS criteria per location, no U306 3.1 / IA-1…IA-5', /001 2\.1 Support an individual to make choices/.test(t) && /Source: qualification curriculum — U001 LO2/.test(t) && /Academy standards — Workplace/.test(t) && /Academy standards — Academy office/.test(t) && /ABS-04/.test(t) && !FOREIGN.test(t), t.slice(0, 300));
      ok('SA-02 (#7) no free-text location, scope or date: nothing defaults to another learner\'s workplace; consent "Not entered" said truthfully', !$1('#modal-root #no-loc') && !$1('#modal-root #no-s') && !$1('#modal-root #no-d') && /Not entered — the learner hasn't entered a workplace yet/.test(t));
      ok('SA-02 the next step and its owner: the Coordinator chooses the location; no override offered', /Choose the location — Dr Helen Carter \(Academic Coordinator\)/.test(t) && /don't choose the location or the date/.test(t));
      const sel = $1('#modal-root #no-l'); sel.value = 'CD2'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      ok('SA-02 changing the learner shows that learner (Dev Patel — Michael Osei)', /Michael Osei — chooses each location/.test(mtxt()), mtxt().slice(0, 200));
      const r = prim(); ok('SA-02 the primary action opens the learner record (creates nothing)', r !== false && !MODAL && S.route === 'a-learners' && w.observations.length === n0 && STORE.worlds.CD2.observations.length === 0, S.route);
      ok('SA-02 the learner record\'s Observations tab shows the same oversight', /Required observations/.test(main()) && /Choose the location/.test(main()));
    });
    await T('SA-02 client: direct calls cannot create', async () => {
      pick('aca'); const n0 = w.observations.length, a0 = ADMIN.audit.length;
      ACT.newObs({ dataset: { v: 'CD1' } }); const r1 = prim();
      ok('SA-02 direct ACT.newObs + confirm (Academic Admin): no observation entry for an event learner', w.observations.length === n0 && r1 !== false);
      const r2 = sacPreCreate('CD1'); ok('SA-02 the earlier free-text entry path is refused for an event learner, logged', r2 === false && w.observations.length === n0 && /^Blocked: create observation entry/.test(lastAud().action) && /Observation events apply/.test(lastAud().reason), J(lastAud()));
      ok('SA-02 a forged learner key is refused', sacPreCreate('ZZ') === false && ADMIN.audit.length > a0);
    });
    await T('SA-02 client: unauthorised roles', async () => {
      for (const p of ['coord1', 'teacher', 'assessor', 'fin', 'biz', 'sys', 'iqa', 'nvq-sp']) { pick(p); const s0 = sec(); ACT.newObs(); const m = !!MODAL; closeModal(); ok('SA-02 ' + p + ' cannot open the observation entry; refused and logged', !m && sec() > s0); }
      pick('super'); ACT.newObs(); S.portal = 'learner'; let r; try { r = prim(); } finally { S.portal = 'admin'; } closeModal(); ok('SA-02 re-check on confirm: refused after leaving the admin console', r === false);
    });
    await T('SA-02 client: the Coordinator chooses; oversight follows', async () => {
      let saved = false;
      for (const p of ['coord1', 'coord2']) { pick(p); go('c-learner', { id: lid, tab: 'observations' }); const s = $1('main #d-loc-EV-1'); if (!s) continue; s.value = 'workplace'; click($1('main [data-act="dObsLoc"][data-e="EV-1"]')); saved = !!(w.dObs && w.dObs['EV-1']); if (saved) break; }
      ok('SA-02 (setup) Dr Helen Carter chooses Workplace for EV-1 in the Coordinator portal', saved && w.dObs['EV-1'].loc === 'workplace', J(w.dObs));
      pick('super'); go('a-observations'); const row = $1('main .sac-evs tr[data-v="CD1"]'), rt = row ? row.textContent.replace(/\s+/g, ' ') : '';
      ok('SA-02 the list row: Workplace, Library ABS-01…03 (not ABS-04), next step "Enter the workplace details" by the learner', /Workplace/.test(rt) && /ABS-01, ABS-02, ABS-03/.test(rt) && !/ABS-04/.test(rt) && /Enter the workplace details — Amira Shah/.test(rt), rt);
      click(row.querySelector('[data-act="newObs"]')); const t = mtxt();
      ok('SA-02 the dialog (from Details) shows the chosen location, who chose it, and only the workplace criteria', $1('#modal-root #no-l').value === 'CD1' && /Workplace — chosen by Dr Helen Carter/.test(t) && /Academy standards — Workplace/.test(t) && !/Academy standards — Academy office/.test(t) && !/ABS-04/.test(t), t.slice(0, 300));
      closeModal();
    });
    await T('SA-02 client: list scope from each record (#6)', async () => {
      w.observations.unshift({ id: 'oSAC1', at: D(9, '10:00'), loc: 'Example care home', assessor: 'James Pryce', scope: '001 2.1', status: 'Proposed', dEv: 'EV-1', dEvName: 'Workplace or Academy-office observation', dV: 1, dPid: dCtx(w).pr.id, dLoc: 'workplace', locType: 'work', dIa: [] }, { id: 'oSAC0', at: D(5, '10:00'), loc: 'Old care home', assessor: 'James Pryce', scope: 'U1 1.1', status: 'Cancelled' }); // test-only
      go('a-observations'); const rows = $a('main table tbody tr').map(r => r.textContent.replace(/\s+/g, ' ')), ev = rows.find(r => /Example care home/.test(r)), old = rows.find(r => /Old care home/.test(r));
      ok('SA-02 (#6) no row carries the hard-coded "+ IA-1–IA-4"', !/IA-1–IA-4/.test(main()), main().slice(0, 100));
      ok('SA-02 an event record shows its NVQ criterion, the library criteria of its location, the event and version', !!ev && /NVQ: 001 2\.1/.test(ev) && /Library: ABS-01, ABS-02, ABS-03/.test(ev) && /Version 1/.test(ev), ev);
      ok('SA-02 a record without an event still renders as recorded, labelled as recorded before location rules, with its actions', !!old && /U1 1\.1/.test(old) && /Recorded before location rules/.test(old) && /As recorded/.test(old), old);
      w.observations = w.observations.filter(o => !/^oSAC/.test(o.id));
    });
    await T('SA-01 client: list and editor', async () => {
      pick('super'); go('a-assignments'); const ths = $a('main table thead th').map(t => t.textContent.trim());
      ok('SA-01 the list says mapping is manual, has the curriculum guide, "Assignment version" and "Programme version" columns', /Mapping is manual/.test(main()) && /How the curriculum and assignments fit together/.test(main()) && ths.some(t => /^Assignment version/.test(t)) && ths.some(t => /^Programme version/.test(t)) && /Version 1/.test(($a('main table tbody tr').find(r => /Assignment 1 — Person-centred values/.test(r.textContent)) || {}).textContent || ''), J(ths));
      go('a-assignments', { id: 'a10' }); const t = main();
      ok('SA-01 the editor: "Assignment version 1" chip, the programme version line, no prototype wording', !!$a('main .page-h .typebadge').find(b => b.textContent.trim() === 'Assignment version 1') && /Criteria from Level 3 Diploma in Care Practice \(client demo\) — Programme version 1/.test(t) && !/worlds C and D|prototype limit|with full data/.test(t) && /It reached \d+ learners? in these batches/.test(t), t.slice(0, 400));
      go('a-assignments', { id: 'a10', tab: 'mapping' }); const m = main();
      ok('SA-01 Criteria mapping: the guide (open), the source — programme, version, unit, module, Learning Outcomes — with links to the curriculum', !!$1('main details.sac-guide[open]') && /Where these criteria come from/.test(m) && /Programme versionVersion 1/.test(m) && /UnitU001 Person-centred care/.test(m) && /Module 1 — Core practice/.test(m) && /LO1 Understand person-centred care/.test(m) && /LO2 Work in a person-centred way/.test(m) && !!$1('main .sac-src [data-go="a-programmes"][data-tab="structure"]'), m.slice(0, 200));
      ok('SA-01 the current mapping is shown per criterion (001 1.1 → Q1; 001 1.2 not mapped here; 001 2.1 observation)', /001 1\.1 Explain person-centred values → Q1/.test(m) && /001 1\.2 Describe how to agree a care plan → not mapped in this assignment/.test(m) && /001 2\.1 Support an individual to make choices → observation/.test(m));
      ok('SA-01 the manual note says who last changed the mapping, and the demo mapping is labelled as set up for the demo, not a rule', /Mapping is manual/.test(m) && /Last mapping change: Rachel Hughes/.test(m) && /Client demo: Q1 → 001 1\.1 was set up when the demo was built, as an example for this demonstration — not an automatic rule\./.test(m), (m.match(/Last mapping change[^.]*\./) || [''])[0]);
      ok('SA-01 the preview points at Coverage analytics', /see Coverage analytics on the Assignments list/.test(m) || /none/.test(m));
    });
    await T('SA-01 client: multi-criteria mapping (AA-1) and roles', async () => {
      const d = s2Def('a12'), q = d.qs[0]; pick('aca'); go('a-assignments', { id: 'a12', tab: 'mapping' });
      const box = $1(`main [data-onchange="mapChange"][data-q="${q.id}"][data-c="001 1.1"]`); box.checked = true; INP.mapChange(box);
      ok('SA-01 one question mapped to two criteria by a real tick (001 1.1 + 001 1.2)', J(q.crit.slice().sort()) === J(['001 1.1', '001 1.2']), J(q.crit));
      const m = main(); ok('SA-01 … the source shows Q1 against both, the last change names the Academic Admin, the demo note says "changed since"', /001 1\.1 Explain person-centred values → Q1/.test(m) && /001 1\.2 Describe how to agree a care plan → Q1/.test(m) && /Last mapping change: Rachel Hughes \(Academic Admin\)/.test(m) && /\(changed since\)/.test(m), (m.match(/Last mapping change[^.]*\./) || [''])[0]);
      for (const p of ['fin', 'biz', 'coord1', 'teacher']) { pick(p); const c0 = J(q.crit); INP.mapChange({ checked: false, dataset: { id: 'a12', q: q.id, c: '001 1.1', subs: '0' } }); ok('SA-01 ' + p + ' cannot change a mapping (refused, logged)', J(q.crit) === c0 && /^Blocked: change a criteria mapping/.test(lastAud().action)); }
      pick('super'); go('a-assignments', { id: 'coverage' }); ok('SA-01 Coverage analytics has the per-criterion table (reused from the builder)', /Criteria coverage — Level 3 Diploma in Care Practice \(client demo\)/.test(main()) && /Assignment 3 · Q1 \(draft\)/.test(main()));
      SS.setItem('ft-sa-c.keep', J({ crit: q.crit, loc: w.dObs['EV-1'] && w.dObs['EV-1'].loc }));
    });
    signOutUI(); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-sa-c.keep') || '{}'), w = STORE.worlds.CD1, q = s2Def('a12').qs[0];
    await T('SA-C refresh', async () => {
      ok('SA-C after a real refresh: the Coordinator\'s location choice and the two-criteria mapping are kept', ((w.dObs || {})['EV-1'] || {}).loc === keep.loc && J(q.crit) === J(keep.crit), J([w.dObs, q.crit]));
      pick('super'); go('a-assignments', { id: 'a12', tab: 'mapping' }); ok('SA-C after a refresh: the demo note still reads "changed since"', /set up when the demo was built/.test(main()) && /\(changed since\)/.test(main()));
      go('a-observations'); ok('SA-C after a refresh: oversight shows Workplace for Amira', /Workplace/.test(($1('main .sac-evs tr[data-v="CD1"]') || {}).textContent || ''));
    });
    await T('SA-C Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); const w2 = STORE.worlds.CD1, q2 = s2Def('a12').qs[0];
      ok('SA-C Reset: the seeded state is back (no location chosen, one example mapping, the demo note without "changed since")', !(w2.dObs && w2.dObs['EV-1']) && J(q2.crit) === J(['001 1.2']) && !!s2Def('a12').saDemo, J([w2.dObs, q2.crit]));
    });

    /* ================= Legacy fixture ================= */
    await T('SA-C legacy observations', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
      const C = STORE.worlds.C, o3 = C.observations.find(o => o.id === 'o3'), r0 = J(o3);
      go('a-observations'); const t = main();
      ok('SA-C legacy (#6): no "+ IA-1–IA-4" suffix; historical rows render as recorded and are labelled', !/\+ IA-1–IA-4/.test(t) && /U301 2\.2, 2\.3 · U306 3\.1/.test(t) && /Recorded before location rules/.test(t) && /Kofi Asante/.test(t), t.slice(0, 200));
      ok('SA-C legacy: the signed-off observation (o3) is unchanged by viewing', J(o3) === r0 && o3.status === 'Completed' && !!o3.report);
      ACT.newObs(); const sel = $1('#modal-root #no-l'); sel.value = 'C'; sel.dispatchEvent(new Event('change', { bubbles: true })); const mt = mtxt();
      ok('SA-C legacy: a learner without events gets the earlier entry from their own record — own workplace (read-only), own criteria, workplace only', /Recorded under the earlier rules/.test(mt) && /Workplace — Willowbrook Care Home \(demo\)/.test(mt) && !$1('#modal-root #no-loc') && !$1('#modal-root #no-s') && /Sarah Okonkwo/.test(mt) && $a('#modal-root .sac-nvq').every(x => /^30\d /.test(x.value)), mt.slice(0, 200));
      const n0 = C.observations.length; const f = $1('#modal-root .sac-nvq'); f.value = 'U999 9.9'; f.checked = true; const rf = prim();
      ok('SA-C legacy: a forged criterion outside the learner\'s curriculum is refused and logged', rf === false && C.observations.length === n0 && /not in the learner's curriculum: U999 9\.9/.test(lastAud().reason), J(lastAud()));
      closeModal(); ACT.newObs({ dataset: { v: 'C' } }); prim();
      const o = C.observations[0]; ok('SA-C legacy (MR-08 kept): created Proposed with locType workplace, her own workplace, her allocated assessor and her own criteria', C.observations.length === n0 + 1 && o.status === 'Proposed' && o.locType === 'work' && o.loc === C.workplace.name && o.assessor === 'Sarah Okonkwo' && o.saPre && o.saNvq.every(c => /^30\d /.test(c)), J(o));
      ACT.newObs({ dataset: { v: 'D' } }); const nD = STORE.worlds.D.observations.length, rD = prim(); ok('SA-C legacy: workplace permission not Granted (Grace) still blocks creation', rD === false && STORE.worlds.D.observations.length === nD && /Observation creation blocked/.test(mtxt())); closeModal();
      go('a-observations'); ok('SA-C legacy: the new entry is listed with its own scope', /Admin entry — programme version without observation events/.test(main()));
    });
    await T('SA-C legacy NV-L2 label (#23)', async () => {
      go('a-assignments', { id: 'l2a1', tab: 'mapping' }); ok('SA-C legacy: the L2 assignment\'s mapping says its stored curriculum is the Level 3 structure (kept as recorded)', /stored curriculum is the Level 3 structure \(U301–U307\)/.test(main()));
      go('a-programmes', { id: 'NV-L2', tab: 'structure' }); ok('SA-C legacy: the builder\'s curriculum carries the same label', /stored curriculum is the Level 3 structure/.test(main()), main().slice(0, 200));
      go('a-assignments', { id: 'a3' }); ok('SA-C legacy: a seeded assignment with no recorded version says so', /programme version not recorded/.test(main()) || /Programme version \d/.test(main()));
    });
    fxLoadClient(); signOutUI(); done();
  }
})();
