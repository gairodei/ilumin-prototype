// CB5 — Assessments (21 Oct 2026, PD-CB-34…39). Assignments are authored in Section 3 on the existing S2 definitions, linked to their
// programme by ID and (new ones) to the programme version whose criteria they map; questions carry evidence guidance and attachment
// limits; new assignments have a References section and no template by default; seeded ones are unchanged; every assignment action
// checks the role; seeded answer-key records are frozen and note their programme version. Positive and negative checks throughout.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB5 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const COO = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; };
  const open = (id, tab = 'assessments') => go('a-programmes', { id, tab });
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const J = o => JSON.stringify(o);
  // Create an assignment in Section 3, add one question (evidence + attachments), map it, optionally publish
  const author = (pid, title, o = {}) => {
    open(pid); ACT.cbAsgNew({ dataset: { p: pid } }); if (!MODAL) return null;
    if (o.unit) document.querySelector('#cna-u').value = o.unit; fill({ '#cna-t': title, '#cna-d': '2026-12-20T21:59' }); press();
    const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': o.q || 'Explain why communication matters in care.', '#aq-ev': o.ev || 'A real example from your workplace', '#aq-n': String(o.n || 2) });
    document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = (o.types || ['PDF']).includes(c.value); }); press();
    const crit = o.crit || s2Crit(d).find(c => c.type === 'Knowledge').code; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: crit } });
    if (o.publish) { open(pid); ACT.pubAsg({ dataset: { id: d.id } }); reason('Publish'); }
    return d;
  };

  /* ================= A. Definitions linked to their programme ================= */
  await T('CB5-A programme identity of assignments', async () => {
    fresh(); const L3 = s3Pr('NV-L3');
    ok('CB5-A seeded definitions are linked to their programme by an unambiguous title; the title is kept; no version invented', s2Def('a1').pid === 'NV-L3' && s2Def('a1').pidFrom === 'title' && s2Def('a1').programme === L3.title && s2Def('a1').pv === undefined && s2Def('l2a1').pid === 'NV-L2');
    SA(); open('NV-L3');
    ok('CB5-A Section 3 lists Level 3\'s assignments (and not Level 2\'s), with version, References and status', qa('.cb-assess tbody tr').length === s2Defs().filter(d => d.pid === 'NV-L3' && d.status !== 'Deleted').length && !q('.cb-assess tr[data-id="l2a1"]') && /Version not recorded/.test(q('.cb-assess').textContent));
    ok('CB5-A New assignment is offered to the Super Admin; Section 3 no longer marked read-only', !!q('[data-act="cbAsgNew"]') && !q('.cb-sec[data-tab="assessments"] .cb-badge'));
    open('NV-L2'); ok('CB5-A Level 2 lists its own assignment only', !!q('.cb-assess tr[data-id="l2a1"]') && !q('.cb-assess tr[data-id="a1"]'));
  });

  /* ================= B. Criteria from the programme's own version ================= */
  await T('CB5-B criteria from the linked programme version', async () => {
    fresh(); SA(); open('NV-L4'); ACT.cbAsgNew({ dataset: { p: 'NV-L4' } });
    const opts = [...document.querySelectorAll('#modal-root #cna-u option')].map(o => o.value);
    ok('CB5-B Level 4: the unit list comes from Level 4 (U401–U403), not Level 3', opts.length === 3 && opts.every(v => /^U40[1-3]/.test(v)) && /Version 1/.test(document.querySelector('#modal-root .cb-ctx').textContent)); closeModal();
    const d = author('NV-L4', 'L4 CB5 Outcome-based practice'), kc = s2Crit(d).map(c => c.code);
    ok('CB5-B Level 4 assignment: programme ID, Version 1, criteria of Level 4 only (no Level 3 code)', d.pid === 'NV-L4' && d.pv === 1 && kc.length > 0 && kc.every(c => /^40\d /.test(c)) && !kc.some(c => /^30\d /.test(c)));
    open('NV-L4'); ACT.cbAsgOpen({ dataset: { p: 'NV-L4', id: d.id, t: 'mapping' } }); ok('CB5-B the mapping grid in Section 3 shows Level 4 criteria', /401 1\.1/.test(q('.cb-asg-body').textContent) && !/301 1\.1/.test(q('.cb-asg-body').textContent));
    // A Level 3 draft version adds a unit: the assignment linked to Version 2 still maps Version 2's criteria
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('v3'); ACT.nodeAdd({ dataset: { p: 'NV-L3', lvl: 'unit' } }); fill({ '#nd-c': 'U309', '#nd-t': 'Draft-only unit' }); press();
    ACT.cbAsgNew({ dataset: { p: 'NV-L3' } }); const o3 = [...document.querySelectorAll('#modal-root #cna-u option')].map(o => o.value);
    ok('CB5-B Level 3 with a draft version: new assignments link to Version 2 (published) and don\'t offer the draft-only unit', !o3.some(v => /^U309/.test(v)) && /Version 2 \(published\)/.test(document.querySelector('#modal-root .cb-ctx').textContent)); closeModal();
  });

  /* ================= C. Authoring in the builder, publishing, learner copy ================= */
  await T('CB5-C author and publish from Section 3', async () => {
    fresh(); SA(); const a0 = ADMIN.audit.length, d = author('NV-L3', 'L3 CB5 Communication', { n: 2, types: ['PDF', 'DOCX'], ev: 'One example from a recent shift' });
    ok('CB5-C created in Section 3: Draft, programme NV-L3, Version 2, References on, no template; audited with the version', d.status === 'Draft' && d.pid === 'NV-L3' && d.pv === 2 && d.refs === true && d.template === false && since(a0).some(x => x.action === 'Assignment created (Draft)' && /NV-L3/.test(x.after) && /Version 2/.test(x.after)));
    ok('CB5-C the question keeps its evidence guidance and attachment limits; mapped', d.qs[0].ev === 'One example from a recent shift' && d.qs[0].attMax === 2 && J(d.qs[0].attTypes) === J(['PDF', 'DOCX']) && d.qs[0].crit.length === 1);
    open('NV-L3'); ok('CB5-C after creating, Section 3 opens the assignment in place (Questions) with its settings table', !!q('.cb-asg-ed') && /One example from a recent shift/.test(q('.cb-asg-qset').textContent) && /Up to 2 files · PDF, DOCX/.test(q('.cb-asg-qset').textContent));
    ACT.cbAsgOpen({ dataset: { p: 'NV-L3', id: d.id, t: 'details' } }); ok('CB5-C Details shows version, References and template; Save and Publish here', /Version 2/.test(q('.cb-asg-set').textContent) && /Yes — after the last question/.test(q('.cb-asg-set').textContent) && /None — learners answer in the boxes/.test(q('.cb-asg-set').textContent) && !!q('.cb-asg-btns [data-act="s2Save"]') && !!q('.cb-asg-btns [data-act="pubAsg"]'));
    ACT.pubAsg({ dataset: { id: d.id } }); reason('Publish from the builder');
    const a = STORE.worlds.C.assignments.find(x => x.id === d.id);
    ok('CB5-C published from the builder: stays on Section 3; Aisha (Level 3, the batch) gets her copy', d.status === 'Published' && S.route === 'a-programmes' && S.params.tab === 'assessments' && !!a);
    ok('CB5-C …her copy has the References section, no template download, and the question settings', a.refsOn === true && J(a.refRounds) === '[]' && !a.resources.some(x => /template/i.test(x[0])) && a.qs[0].ev === 'One example from a recent shift' && a.qs[0].attMax === 2);
    ok('CB5-C …Grace (Level 2) doesn\'t get it', !STORE.worlds.D.assignments.some(x => x.id === d.id));
  });

  /* ================= D. The learner's form: evidence, attachment limits, References ================= */
  await T('CB5-D learner form and submission', async () => {
    fresh(); SA(); const d = author('NV-L3', 'L3 CB5 Learner form', { n: 1, types: ['PDF'], publish: true });
    learner('C'); go('assignment', { id: d.id }); const a = W.assignments.find(x => x.id === d.id);
    ok('CB5-D the question shows its evidence guidance and its own attachment rule', /Evidence to include:/.test(main()) && /Up to 1 file · PDF · 10 MB each/.test(main()));
    ok('CB5-D no template: "No template — answer in the boxes below"; submission rules shown (never "undefined")', !!q('.cb-notpl') && !/undefined/.test(main()) && /up to 2 resubmissions/.test(main()));
    ok('CB5-D a References box follows the last question (after all questions)', !!q('.cb-refs') && main().lastIndexOf('References') > main().indexOf(a.qs[a.qs.length - 1].text) && !/Assignment template/.test(main()));
    const key = `${d.id}.${a.qs[0].id}.0`, file = (name) => ({ files: [{ name, size: 2048, type: 'application/pdf', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }], dataset: { key }, value: '' });
    INP.attach(file('evidence.png')); ok('CB5-D (negative) a PNG is refused for a PDF-only question', !(W.drafts['attid.' + key] || []).length);
    INP.attach(file('evidence.pdf')); INP.attach(file('second.pdf'));
    ok('CB5-D one PDF accepted; a second refused (limit 1)', (W.drafts['attid.' + key] || []).length === 1);
    W.drafts[key] = '<p>My answer</p>'; W.drafts[`${d.id}.refs.0`] = '<p>Care Act 2014</p>'; finaliseSubmit(a, false, now().toISOString()); go('assignment', { id: d.id });
    ok('CB5-D submitting records the references with the submission (frozen) and shows them read-only', a.refRounds.length === 1 && /Care Act 2014/.test(a.refRounds[0].html) && Object.isFrozen(a.refRounds[0]) && /Care Act 2014/.test(q('.cb-refs-done').textContent) && !q('.cb-refs .rte-body'));
    const s = tasSubs(true).find(x => x.key && x.key.endsWith('~' + d.id)); S.tas.v = 'A'; tasEnter(); S.signedIn = true;
    ok('CB5-D the assessor\'s marking page shows the submitted references', !!s && /Care Act 2014/.test(SCREENS['t-mark']({ id: s.key })));
  });

  /* ================= E. Seeded assignments unchanged ================= */
  await T('CB5-E seeded assignments unchanged', async () => {
    fresh(); const c0 = J(STORE.worlds.C.assignments); learner('C'); go('assignment', { id: 'a6' });
    ok('CB5-E a seeded assignment keeps its template and has no References section', /Assignment template/.test(main()) && !q('.cb-refs') && !STORE.worlds.C.assignments.find(x => x.id === 'a6').refsOn);
    SA(); open('NV-L3'); ACT.cbAsgOpen({ dataset: { p: 'NV-L3', id: 'a1', t: 'details' } });
    ok('CB5-E …Section 3 says its template is kept and its version wasn\'t recorded', /Seeded assignment: its existing template is kept/.test(main()) && /Version not recorded/.test(q('.cb-asg-set').textContent));
    ok('CB5-E opening and viewing seeded assignments changed no learner record (submissions and resubmissions untouched)', J(STORE.worlds.C.assignments) === c0);
  });

  /* ================= F. Publishing checks ================= */
  await T('CB5-F publishing refused for criteria outside the linked version', async () => {
    fresh(); SA(); const d = author('NV-L3', 'L3 CB5 Stale'); d.qs[0].crit = ['999 9.9']; const a0 = ADMIN.audit.length; ACT.pubAsg({ dataset: { id: d.id } });
    ok('CB5-F a mapped code that isn\'t a knowledge criterion of Version 2 blocks publishing (logged); stays Draft', d.status === 'Draft' && blocked(a0, /criteria not in the linked version/) && /999 9\.9/.test(document.querySelector('#modal-root').textContent)); closeModal();
    const o = author('NV-L3', 'L3 CB5 Observation map'), obs = s2Crit(o).find(c => c.type !== 'Knowledge'); o.qs[0].crit = [obs.code]; ACT.pubAsg({ dataset: { id: o.id } });
    ok('CB5-F an Observation criterion mapped to an assignment question blocks publishing (only observation meets it)', o.status === 'Draft' && !!MODAL && /Can't publish/.test(MODAL.title)); closeModal();
    fresh(); SA(); ACT.cbAsgNew({ dataset: { p: 'NV-L3O' } }); ok('CB5-F (negative) a retired programme takes no new assignment (refused, logged)', !MODAL && /retired/.test(ADMIN.audit[0].action));
  });

  /* ================= G. References and template settings ================= */
  await T('CB5-G references and template choices', async () => {
    fresh(); SA(); const d = author('NV-L3', 'L3 CB5 Template');
    ACT.cbAsgSet({ dataset: { id: d.id, k: 'template' } }); ACT.cbAsgSet({ dataset: { id: d.id, k: 'refs' } });
    ok('CB5-G while Draft: an optional template offered and the References section removed, both audited', d.template === true && d.refs === false && ADMIN.audit[0].action === 'References section changed' && ADMIN.audit[1].action === 'Answer template changed');
    open('NV-L3'); ACT.pubAsg({ dataset: { id: d.id } }); reason('Publish'); const a = STORE.worlds.C.assignments.find(x => x.id === d.id);
    ok('CB5-G the learner copy offers the template as optional and has no References section', a.resources.some(x => /optional/.test(x[0])) && !a.refsOn);
    const a0 = ADMIN.audit.length; ACT.cbAsgSet({ dataset: { id: d.id, k: 'refs' } }); ok('CB5-G (negative) published: references and template can\'t change (logged)', d.refs === false && blocked(a0, /published/));
  });

  /* ================= H. Role checks on every assignment action ================= */
  await T('CB5-H unauthorized direct calls', async () => {
    const state = () => J(s2Defs().map(d => [d.id, d.status, d.title, d.qs.map(x => [x.id, x.text, x.crit, x.status]), d.refs, d.template, d.batches, d.briefV]).concat([STORE.worlds.C.assignments.map(a => [a.id, a.status, a.due])]));
    const calls = d => [() => ACT.cbAsgNew({ dataset: { p: 'NV-L3' } }), () => ACT.newAsg(), () => ACT.s2Save({ dataset: { id: d } }), () => ACT.s2QAdd({ dataset: { id: d } }), () => ACT.s2QEdit({ dataset: { id: d, q: 'q1' } }),
      () => ACT.s2QMove({ dataset: { id: d, q: 'q1', d: '1' } }), () => ACT.s2QRetire({ dataset: { id: d, q: 'q1' } }), () => INP.mapChange({ checked: true, dataset: { id: d, q: 'q1', c: '301 1.1' } }), () => ACT.pubAsg({ dataset: { id: d } }),
      () => ACT.s2Unpublish({ dataset: { id: 'a1' } }), () => ACT.s2Retire({ dataset: { id: 'a1' } }), () => ACT.kEditBrief({ dataset: { id: 'a1' } }), () => ACT.cbAsgSet({ dataset: { id: d, k: 'refs' } }), () => SUBMIT.asgExtend({ dataset: { id: 'a1' } })];
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', () => learner('C')], ['an Academic Coordinator', COO]].forEach(([who, enter]) => {
      fresh(); const d = 'a8'; enter(); const s0 = state(), a0 = ADMIN.audit.length; let opened = 0;
      calls(d).forEach(f => { closeModal(); f(); if (MODAL) opened++; closeModal(); });
      const nb = since(a0).filter(a => /^Blocked/.test(a.action)).length;
      ok(`CB5-H (negative) ${who}: all ${calls(d).length} assignment actions refused — no dialog, nothing changed`, opened === 0 && state() === s0, `opened ${opened}`);
      ok(`CB5-H (negative) ${who}: each refusal logged`, nb >= calls(d).length, `${nb}`);
    });
    [['Super Admin', SA], ['System Admin', SYS], ['Academic Admin', ACA]].forEach(([who, enter]) => { fresh(); enter(); const d = author('NV-L3', 'L3 CB5 by ' + who); ok(`CB5-H (positive) ${who}: creates, adds a question and maps it in Section 3`, !!d && d.qs.length === 1 && d.qs[0].crit.length === 1); });
    fresh(); SA(); ACT.s2QAdd({ dataset: { id: 'a8' } }); fill({ '#aq-t': 'Changed after sign-out' }); setAdminIdentity('FA'); const a9 = ADMIN.audit.length; prim();
    ok('CB5-H a role change while the question dialog is open: the save is refused and logged', !s2Def('a8').qs.some(x => x.text === 'Changed after sign-out') && blocked(a9)); closeModal();
  });

  /* ================= I. Seeded answer keys: audited and protected ================= */
  await T('CB5-I answer keys', async () => {
    fresh(); const K = STORE.s3.keys['NV-L3'], first = K['U302 M1'][0];
    ok('CB5-I seeded answer-key records are frozen (can\'t be edited)', Object.isFrozen(first) && (() => { try { first.file = 'changed.pdf'; } catch (e) { } return first.file !== 'changed.pdf'; })());
    SA(); ACT.chAnsUp({ dataset: { k: 'U307 M1', p: 'NV-L3' } }); ACT.chAnsSample(); reason('New key');
    const e = K['U307 M1'][0]; ok('CB5-I a new upload adds a frozen record noting programme Version 2', e && e.pv === 2 && Object.isFrozen(e) && !e.removed);
    ACT.s3KeyRemove({ dataset: { k: 'U307 M1', p: 'NV-L3' } }); reason('Withdrawn');
    ok('CB5-I removing adds a record (the upload stays in the history), also frozen with its version', K['U307 M1'].length === 2 && K['U307 M1'][0].removed && K['U307 M1'][0].pv === 2 && K['U307 M1'][1] === e && Object.isFrozen(K['U307 M1'][0]));
    open('NV-L3', 'keys'); ok('CB5-I Answer keys area: shared-by-every-version notice, each module\'s history with version or "version not recorded"', /Shared by every version of this programme/.test(main()) && /Programme version 2/.test(q('.cb-keys tr[data-k="U307 M1"]').textContent) && /version not recorded/.test(q('.cb-keys tr[data-k="U302 M1"]').textContent));
    learner('C'); ok('CB5-I learners still get the current key of their programme (unchanged behaviour)', !!chAnsFor('U302 M1'));
    SYS(); open('NV-N2', 'keys'); ok('CB5-I new programme: the answer key is part of its versioned structure (stated)', /belongs to a version/.test(main()));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
