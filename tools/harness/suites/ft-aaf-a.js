// AAF-A — NVQ curriculum and course builder clarity (AA-01, AA-02, AA-03, AA-04, AA-17; g1 Low). suites.sh runs it with FIXTURE=client.
// The client demo's published NV-N1 (new version for changes), a fresh NVQ draft, direct handler calls by other roles, then a real
// refresh, Reset demo, and the legacy fixture (seeded Level 3).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aaf-a.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aaf-a.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtext = () => ($1('#modal-root') || {}).textContent || '';
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'AAF-A test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const next = ph => { SS.setItem('ft-aaf-a.R', J(R)); SS.setItem('ft-aaf-a.phase', String(ph)); location.reload(); };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const N1 = () => ADMIN.programmes.find(p => p.id === 'N1' || p.id === 'NV-N1');
  const pubTree = () => cbTree(N1(), N1().version) || [];
  const errs = []; window.addEventListener('error', e => errs.push(e.message));

  if (PH === 0) {
    await T('AAFA-01 course code', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'details' });
      ok('AAFA-01 published course details show the internal programme ID separately from the awarding body course code', /Internal programme ID\s*NV-N1/.test(main()) && /Awarding body course code\s*QN 610\/0001\/0/.test(main()));
      go('a-programmes', { id: 'new', tab: 'details' });
      ok('AAFA-01 the new-course form explains the required awarding body course code and shows the ID as automatic', /Assigned automatically when the draft is first saved/.test(main()) && !!$1('main .aafa-refwhy') && /^Required\./.test($1('main .aafa-refwhy').textContent) && !$1('main #np-code'));
      const n0 = ADMIN.programmes.length; fill({ '#np-t': 'AAF-A no code course' }); crT(ACT.cbDetCreate)();
      ok('AAFA-01 the awarding body course code is still required (no accepted decision makes it optional)', ADMIN.programmes.length === n0 && /Enter the awarding body course code/.test(main()));
    });

    await T('AAFA-02 published version is immutable', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'curriculum' });
      ok('AAFA-02 published NV-N1: no edit controls; guide shown', !$1('main [data-act="cbCurEdit"]') && !$1('main [data-act="ch8AddMod"]') && !!$1('main .aafa-guide'));
      const t0 = J(pubTree()), a0 = aud(); ACT.ch8AddMod({ dataset: { id: 'NV-N1', u: 0 } });
      ok('AAFA-02 a direct Add module on the published version is refused; the curriculum is unchanged', !MODAL && J(pubTree()) === t0, J(since(a0).map(x => x.action))); closeModal();
    });

    await T('AAFA-02 other roles refused', async () => {
      pick('fin'); const t0 = J(ch8Tree('NV-N1')), a0 = aud();
      ACT.ch8AddMod({ dataset: { id: 'NV-N1', u: 0 } }); ACT.cbCurEdit({ dataset: { p: 'NV-N1', path: '0.0', codes: 'U001|M1' } }); ACT.ch8AddCrit({ dataset: { id: 'NV-N1', u: 0, m: 0, l: 0 } });
      ok('AAFA-02 Finance: direct Add module / Edit / Add criterion are refused and logged; nothing changes', !MODAL && J(ch8Tree('NV-N1')) === t0 && blocked(a0), J(since(a0).map(x => x.action))); closeModal();
      const d = s2Def('a12'), q0 = J(d.qs), a1 = aud();
      ACT.s2QRetire({ dataset: { id: 'a12', q: 'q1' } }); ACT.s2QMove({ dataset: { id: 'a12', q: 'q1', d: '1' } }); INP.mapChange({ checked: true, dataset: { id: 'a12', q: 'q1', c: '001 1.1' } }); ACT.s2QAdd({ dataset: { id: 'a12' } });
      ok('AAFA-17 Finance: direct question retire / move / map / add are refused and logged; questions unchanged', !MODAL && J(d.qs) === q0 && blocked(a1) && !d.qs.some(q => q.retiredN), J(since(a1).map(x => x.action))); closeModal();
    });

    await T('AAFA-02/03 new version of NV-N1', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'curriculum' });
      click($a('main button').find(b => /Create new version/.test(b.textContent))); reason('AAF-A new version');
      go('a-programmes', { id: 'NV-N1', tab: 'curriculum' });
      const ed = $a('main [data-act="cbCurEdit"]'), by = n => ed.find(b => b.dataset.path.split('.').length === n);
      click(by(1)); ok('AAFA-02 Edit unit: "Internal unit reference (automatic)", read-only, no "Unit code" label', /Internal unit reference \(automatic\)/.test(mtext()) && !/Unit code/.test(mtext()) && !$1('#modal-root input#ce-c') && /U001/.test(($1('#modal-root .cb-ro') || {}).textContent)); closeModal();
      click(by(2)); ok('AAFA-02 Edit module: internal module reference automatic; awarding-body code optional, explained', /Internal module reference \(automatic\)/.test(mtext()) && /Awarding-body code \(optional\)/.test(mtext()) && /Ofqual unit reference/.test(mtext()));
      fill({ '#ce-ab': '' }); ok('AAFA-02 a recorded awarding-body code can be corrected but not removed', prim() === false && /corrected but not removed/.test(mtext()) && ch8Tree('NV-N1')[0].mods[0].ab === 'D/650/0001'); closeModal();
      click(by(4)); ok('AAFA-03 Edit criterion: criterion reference automatic; evidence requirement explained with examples and who uses it', /Criterion reference \(automatic\)/.test(mtext()) && /What the learner must produce or show/.test(mtext()) && /Assessors see it/.test(mtext()) && /not a file type/.test(mtext()));
      fill({ '#ce-e': '' }); ok('AAFA-03 the evidence requirement is still required (validation unchanged)', prim() === false); closeModal();
      const a0 = aud(); ACT.ch8AddMod({ dataset: { id: 'NV-N1', u: 0 } }); ok('AAFA-02 Add module: awarding-body code marked optional', /Awarding-body code \(optional\)/.test(mtext()));
      fill({ '#m-t': 'AAF-A second module', '#m-ab': '' }); press();
      const m2 = ch8Tree('NV-N1')[0].mods[1];
      ok('AAFA-02 (g1 Low) a module without an awarding-body code is saved in the draft version and audited', !!m2 && m2.ab === '' && m2.code === 'M2' && /no awarding-body code/.test((since(a0)[0] || {}).after || ''));
      ok('AAFA-02 the published version is unchanged (one module, its code kept)', pubTree()[0].mods.length === 1 && pubTree()[0].mods[0].ab === 'D/650/0001');
      go('a-programmes', { id: 'NV-N1', tab: 'curriculum' });
      ok('AAFA-02 the tree says "Not recorded (optional)" and lists the module', !!$1('main .aafa-nr') && /U001 M2/.test(($1('main .aafa-abmiss') || {}).textContent || ''));
      const c = cbRvChecks(N1());
      ok('AAFA-02 Review & Publish: a warning in Section 2, not a blocker', c.warn.some(w => /no awarding-body code recorded/.test(w.msg) && w.sec === 'curriculum') && !c.block.some(b => /awarding-body/.test(b.msg)));
      ACT.ch8AddCrit({ dataset: { id: 'NV-N1', u: 0, m: 0, l: 0 } }); ok('AAFA-03 Add criterion: evidence requirement hint', /What the learner must produce or show/.test(mtext()));
      fill({ '#c-d': 'AAF-A descriptor', '#c-e': '' }); ok('AAFA-03 Add criterion without an evidence requirement is still refused', prim() === false); closeModal();
      ok('AAFA-03 the guide separates evidence requirement / evidence to include / permitted evidence types', /Three kinds of evidence setting/.test(($1('main .aafa-guide') || {}).textContent || '') && /Permitted evidence types/.test(($1('main .aafa-guide') || {}).textContent || ''));
      ok('AAFA-04 the guide: Unit → Module → Learning Outcome → Criterion → Assignment question → Assessment', $a('main .aafa-chain li').length === 6 && $a('main .aafa-chain li.aafa-here').length === 4);
    });

    await T('AAFA-04 coverage and mapping preview', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' });
      const cov = () => { const o = {}; $a('main .aafa-cov tr[data-c]').forEach(tr => { o[tr.dataset.c] = tr.children[2].textContent; }); return o; };
      let cv = cov();
      ok('AAFA-04 Section 3 criteria coverage: questions per criterion, observation criteria marked', /Assignment 1 · Q1/.test(cv['001 1.1']) && /Assignment 2 · Q1/.test(cv['001 1.2']) && /Assignment 3 · Q1 \(draft\)/.test(cv['001 1.2']) && /Assessed by observation/.test(cv['001 2.1']), J(cv));
      ACT.cbAsgOpen({ dataset: { p: 'NV-N1', id: 'a10', t: 'mapping' } });
      const body = () => ($1('main .cb-asg-body') || {}).textContent.replace(/\s+/g, ' ');
      ok('AAFA-04 published a10 mapping: grid grouped by module and labelled with the unit scope', /whole unit U001/.test(body()) && /Module 1 \(this assignment\)/.test(($1('main .aafa-modrow') || {}).textContent || ''));
      ok('AAFA-04 learner preview: Q1 with 001 1.1 and its evidence requirement; 001 1.2 listed as not covered by this assignment', /Q1\. .*001 1\.1 Explain person-centred values\s*Evidence requirement: Written account/.test(body()) && /not covered by this assignment: 001 1\.2/.test(body()));
      ok('AAFA-04 published a10 grid stays locked to changes (no new configuration)', J(s2Def('a10').qs.map(q => q.crit)) === J([['001 1.1']]));
      // Multi-criterion (AA-1 D2) on draft a12: map Q1 to 001 1.1 as well
      ACT.cbAsgOpen({ dataset: { p: 'NV-N1', id: 'a12', t: 'mapping' } }); const cb = $1('main .cb-asg-body input[data-q="q1"][data-c="001 1.1"]'); cb.checked = true; INP.mapChange(cb);
      ok('AAFA-04 a question mapped to two criteria: the preview lists both; nothing else changes', J(s2Def('a12').qs[0].crit) === J(['001 1.2', '001 1.1']) && /001 1\.2 Describe how to agree a care plan/.test(body()) && /001 1\.1 Explain person-centred values/.test(body()) && /not covered by this assignment: none/.test(body()));
      ok('AAFA-17 the mapping audit names the question number', /^Q1 \(q1\): 001 1\.1$/.test(ADMIN.audit[0].after), J(ADMIN.audit[0]));
      ACT.cbAsgOpen({ dataset: { p: 'NV-N1', id: '', t: 'details' } }); cv = cov();
      ok('AAFA-04 coverage now lists Assignment 3 · Q1 (draft) under 001 1.1 too', /Assignment 3 · Q1 \(draft\)/.test(cv['001 1.1']), J(cv));
    });

    await T('AAFA-17 question numbering', async () => {
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); ACT.cbAsgOpen({ dataset: { p: 'NV-N1', id: 'a12', t: 'questions' } });
      ok('AAFA-17 the numbering hint is shown', /numbered automatically/.test(($1('main .aafa-qn') || {}).textContent || ''));
      const d = s2Def('a12');
      ACT.s2QAdd({ dataset: { id: 'a12' } }); ok('AAFA-03 the question dialog distinguishes "Evidence to include" from the criterion\'s requirement', /Optional guidance for this question only/.test(mtext()));
      fill({ '#aq-t': 'AAF-A second question' }); press();
      ok('AAFA-17 Question added: audit shows "Q2 (q2)"', ADMIN.audit[0].action === 'Question added' && /^Q2 \(q2\): AAF-A second question$/.test(ADMIN.audit[0].after), J(ADMIN.audit[0]));
      ACT.s2QAdd({ dataset: { id: 'a12' } }); fill({ '#aq-t': 'AAF-A third question' }); press();
      ACT.s2QRetire({ dataset: { id: 'a12', q: 'q2' } });
      ok('AAFA-17 Question retired: audit "Retired (was Q2)", the stable id kept, the number recorded', ADMIN.audit[0].action === 'Question retired' && ADMIN.audit[0].after === 'Retired (was Q2)' && /^Q2 \(q2\)/.test(ADMIN.audit[0].before) && d.qs.find(q => q.id === 'q2').retiredN === 'Q2');
      render(); const rows = () => $a('main .cb-asg-body ol.list > li').map(li => li.querySelector('.q-n').textContent);
      ok('AAFA-17 the list shows Q1, "Retired (was Q2)", Q2', J(rows()) === J(['Q1', 'Retired (was Q2)', 'Q2']), J(rows()));
      ACT.s2QMove({ dataset: { id: 'a12', q: 'q3', d: '-1' } });
      ok('AAFA-17 Questions reordered: audit before/after in Q numbers with ids', ADMIN.audit[0].before === 'Q1 (q1), Q2 (q3)' && ADMIN.audit[0].after === 'Q1 (q3), Q2 (q1)', J(ADMIN.audit[0]));
      ACT.s2QRetire({ dataset: { id: 'a12', q: 'q2' } });
      ok('AAFA-17 Question restored: "Active as Q2"; ids unchanged', ADMIN.audit[0].after === 'Active as Q2' && J(d.qs.map(q => q.id)) === J(['q3', 'q2', 'q1']));
      ACT.s2QRetire({ dataset: { id: 'a12', q: 'q2' } });
      const a10 = s2Def('a10'), q0 = J(a10.qs), a0 = aud(); ACT.s2QRetire({ dataset: { id: 'a10', q: 'q1' } }); ACT.s2QMove({ dataset: { id: 'a10', q: 'q1', d: '1' } });
      ok('AAFA-17 a published assignment\'s questions stay locked (no number recorded, no audit)', J(a10.qs) === q0 && aud() === a0);
    });

    await T('AAFA fresh NVQ draft', async () => {
      pick('aca'); go('a-programmes', { id: 'new', tab: 'details' });
      fill({ '#np-t': 'AAF-A fresh course', '#np-l': 'Level 3', '#np-r': 'QN 610/9901/1', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel($1('#np-l'));
      const o = $1('#np-obs-no'); if (o) o.checked = true;
      [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }].forEach((x, k) => { const r = $a('main .r1-np-row')[k]; if (!r) return; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
      const pr = crT(ACT.cbDetCreate)(); closeModal(); const p = pr && pr.id ? pr : ADMIN.programmes.find(x => x.title === 'AAF-A fresh course');
      ok('AAFA fresh draft created; its details show its own internal ID', !!p && p.status === 'Draft' && (go('a-programmes', { id: p.id, tab: 'details' }), new RegExp('Internal programme ID\\s*' + p.id).test(main())), p ? p.id : 'none');
      SS.setItem('ft-aaf-a.fresh', p ? p.id : '');
      const id = p.id; go('a-programmes', { id, tab: 'curriculum' });
      ACT.ch8AddUnit({ dataset: { id } }); fill({ '#u-t': 'Fresh unit' }); press();
      ACT.ch8AddMod({ dataset: { id, u: 0 } }); fill({ '#m-t': 'Fresh module', '#m-ab': '' }); press();
      ACT.ch8AddLo({ dataset: { id, u: 0, m: 0 } }); fill({ '#lo-t': 'Understand care', '#lo-y': 'Knowledge' }); press();
      ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 0 } }); fill({ '#c-d': 'Explain care', '#c-e': 'A written account' }); press();
      const t = ch8Tree(id);
      ok('AAFA fresh draft: unit (automatic reference), module without awarding-body code, LO and criterion saved', t.length === 1 && /^U\d{3}$/.test(t[0].code) && t[0].mods[0].ab === '' && t[0].mods[0].los[0].crit[0].ev === 'A written account', J(t));
      go('a-programmes', { id, tab: 'curriculum' });
      ok('AAFA fresh draft: guide and "Not recorded" shown; Review warns, does not block on it', !!$1('main .aafa-guide') && !!$1('main .aafa-nr') && cbRvChecks(p).warn.some(w => /awarding-body code/.test(w.msg)) && !cbRvChecks(p).block.some(b => /awarding-body/.test(b.msg)));
      go('a-programmes', { id, tab: 'assessments' }); ok('AAFA fresh draft: Section 3 coverage lists the criterion as not covered yet', /Not covered by an assignment question yet/.test(($1('main .aafa-cov') || {}).textContent || ''));
    });
    ok('AAFA no script errors', !errs.length, J(errs));
    next(1); return;
  }

  if (PH === 1) {
    await T('AAFA-R refresh', async () => {
      const fid = SS.getItem('ft-aaf-a.fresh') || '', d = s2Def('a12');
      ok('AAFA-R after a real refresh: the retired question keeps "was Q2", the ids and audit come back', FCP.st === 'saved' && !!d && d.qs.find(q => q.id === 'q2').retiredN === 'Q2' && ADMIN.audit.some(a => a.after === 'Retired (was Q2)'));
      ok('AAFA-R the draft version\'s module without a code and the fresh draft come back', ch8Tree('NV-N1')[0].mods.length === 2 && ch8Tree('NV-N1')[0].mods[1].ab === '' && !!fid && !!ADMIN.programmes.find(p => p.id === fid));
      pick('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); ACT.cbAsgOpen({ dataset: { p: 'NV-N1', id: 'a12', t: 'questions' } });
      ok('AAFA-R the list still shows "Retired (was Q2)"', $a('main .cb-asg-body ol.list > li .q-n').some(x => x.textContent === 'Retired (was Q2)'));
    });
    await T('AAFA-S Reset demo', async () => {
      const fid = SS.getItem('ft-aaf-a.fresh') || ''; signOutUI(); ACT.resetDemo();
      ok('AAFA-S Reset: a12 back to one question, no recorded numbers; NV-N1 has no draft version; the fresh draft is gone', s2Def('a12').qs.length === 1 && !s2Def('a12').qs.some(q => q.retiredN) && !N1().nextDraft && pubTree()[0].mods.length === 1 && !ADMIN.programmes.find(p => p.id === fid));
    });
    await T('AAFA-L legacy', async () => {
      fxLoadLegacy(); signOutUI(); S.portal = 'admin'; acaEnter('KA'); S.signedIn = true; S.ui = {};
      go('a-programmes', { id: 'NV-L3D', tab: 'curriculum' });
      ok('AAFA-L seeded draft: guide shown; Edit unit says "Internal unit reference (automatic)"', !!$1('main .aafa-guide') && (ACT.cbCurEdit({ dataset: { p: 'NV-L3D', path: '0', codes: (cbTree(cbPr('NV-L3D')) || [])[0].code } }), /Internal unit reference \(automatic\)/.test(mtext())));
      closeModal();
      const u = (cbTree(cbPr('NV-L3D')) || [])[0]; ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'mod', u: u.code } });
      ok('AAFA-L seeded Add module: awarding-body code optional, explained (same rule as new programmes)', /Awarding-body code \(optional\)/.test(mtext())); closeModal();
      ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'crit', u: u.code, m: u.mods[0].code, lo: u.mods[0].los[0].code } });
      ok('AAFA-L seeded Add criterion: evidence requirement hint', /What the learner must produce or show/.test(mtext())); closeModal();
      go('a-programmes', { id: 'NV-L3', tab: 'assessments' });
      ok('AAFA-L Level 3 Section 3: criteria coverage rendered', !!$1('main .aafa-cov') && $a('main .aafa-cov tr[data-c]').length > 0);
      const d = cbAsgOf(cbPr('NV-L3'))[0]; ACT.cbAsgOpen({ dataset: { p: 'NV-L3', id: d.id, t: 'mapping' } });
      ok('AAFA-L Level 3 assignment mapping: unit scope note and learner preview', /whole unit/.test(main()) && !!$1('main .aafa-prev'), d.id);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aaf-a.phase'); SS.removeItem('ft-aaf-a.R'); SS.removeItem('ft-aaf-a.fresh');
})();
