// CB12 — Final integration (PD-CB-79…84): one version bar, publishing only in Section 7, every old address still resolves,
// one Deposit heading, Fees & Payments as the home for fees (Course Details links there), no "planned for CB…" placeholders,
// legacy programmes' panels kept, and the seven sections walk in order for a new course.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const open = (id, tab) => go('a-programmes', { id, tab });
  const PROGS = ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5', 'NV-L3O', 'NV-L3D', 'NV-N1', 'NV-N2'];

  await T('CB12-A old addresses', async () => {
    fresh(); SA(); const bad = [];
    const steps = ['details', 'tree', 'structure', 'types', 'assessments', 'keys', 'obs', 'events', 'library', 'observations', 'payments', 'plan', 'fees', 'support', 'payhist', 'letter', 'docs', 'documents', 'review', 'versions', 'curriculum'];
    PROGS.forEach(id => steps.forEach(t => { open(id, t); const want = cbPr(id).chNew && t === 'tree' ? 'details' /* CB1: "tree" was a builder programme's Details step */ : (CB_ROUTE[t] || [])[0], cur = q('.cb') && q('.cb').dataset.sec; if (!q('.cb') || cur !== want) bad.push(`${id}.${t}→${cur}`); }));
    ok('CB12-A every old wizard step, 8-tab editor tab and section address opens its section, for every seeded and builder programme', !bad.length, bad.slice(0, 8).join(' '));
    open('NV-N1'); ok('CB12-A a builder programme with no tab opens Course Details; a seeded one Curriculum (unchanged)', q('.cb').dataset.sec === 'details' && (open('NV-L3'), q('.cb').dataset.sec === 'curriculum'));
    ACT.aJump({ dataset: { t: 'a-programmes.NV-L3D.letter' } }); ok('CB12-A the screen-index link form (a-programmes.<id>.<tab>) still works', q('.cb') && q('.cb').dataset.pid === 'NV-L3D' && q('.cb').dataset.sec === 'documents');
  });

  await T('CB12-B one version bar; publishing only in Section 7', async () => {
    fresh(); SA(); const pubBtns = () => qa('[data-act="kPubProg"], [data-act="s3WizPublish"], [data-act="ch8Publish"], [data-act="cbPublish"]').length;
    const leak = [];
    PROGS.forEach(id => ['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'versions'].forEach(t => { open(id, t); if (pubBtns()) leak.push(id + '.' + t); if (/Saving creates Version/.test(main())) leak.push(id + '.' + t + ' (Saving creates)'); }));
    ok('CB12-B no publish button outside Review & Publish, and no "Saving creates Version N", on any programme or section', !leak.length, leak.join(' '));
    open('NV-L3D', 'details'); ok('CB12-B seeded Draft: "Draft — Version 1, not yet published", items to fix, and "Review & Publish"', /Draft — Version 1, not yet published/.test(q('.cb-vb').textContent) && /to fix before publishing/.test(q('.cb-vb').textContent) && q('.cb-vb [data-go]').dataset.tab === 'review');
    open('NV-L3D', 'review'); ok('CB12-B …on Review & Publish itself the bar has no button (the Publish button is in the section)', !q('.cb-vb .btn') && !!q('.cb-rv [data-act="cbPublish"]'));
    open('NV-L3', 'details'); ok('CB12-B published: "Version 2 is current" and "Create new version"', /Version 2 is current/.test(q('.cb-vb').textContent) && !!q('.cb-vb [data-act="newProgVersion"]'));
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); document.querySelector('#rsn').value = 'CB12'; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    open('NV-L3', 'curriculum'); ok('CB12-B draft version: "You\'re editing Version 3 (draft)… Learners stay on Version 2" with "Review & Publish"', /You're editing Version 3 \(draft\)/.test(q('.cb-vb').textContent) && /stay on Version 2/.test(q('.cb-vb').textContent) && !!q('.cb-vb [data-tab="review"]'));
    open('NV-L3', 'versions'); ok('CB12-B Version history links to Review & publish Version 3 (no publish button of its own)', !!q('[data-go="a-programmes"][data-tab="review"]') && /Review & publish Version 3/.test(main()));
    open('NV-L4', 'details'); ok('CB12-B suspended: "Version 1 is current — programme Suspended"', /programme Suspended/.test(q('.cb-vb').textContent));
    open('NV-L3O', 'details'); ok('CB12-B retired: the read-only historical-record note only (no bar, no button)', !q('.cb-vb') && !!q('.cb-hist') && !q('.cb-ver .btn'));
    ACA(); open('NV-N2', 'details'); ok('CB12-B builder programme, published: "Create new version" (s3WizVersion)', !!q('.cb-vb [data-act="s3WizVersion"]'));
    setAdminIdentity('BA'); S.portal = 'admin'; S.signedIn = true; open('NV-L3', 'details'); ok('CB12-B a role that can\'t create versions sees no "Create new version"', !q('.cb-vb [data-act]'));
  });

  await T('CB12-C Fees & Payments is the home; one Deposit heading', async () => {
    fresh(); ACA(); go('a-programmes'); ACT.chProgNew();
    fill({ '#np-t': 'CB12 Level 3 course', '#np-l': 'Level 3', '#np-r': 'QN 610/7712/1', '#cbc3-dd-n': '12', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    (document.querySelector('#np-code') || {}).value = 'CB12A'; document.querySelector('#np-obs-no').checked = true;
    const r = document.querySelector('main .r1-np-row'); r.querySelector('.r1-np-l').value = 'Fully Assisted'; r.querySelector('.r1-np-f').value = '2400'; r.querySelector('.r1-np-m').value = 'Fully Assisted';
    // CR (PD-CR-07): the course offers only its option's mode, so the package can be approved without a Self-Paced option
    document.querySelectorAll('main .cr-dm-c').forEach(x => { x.checked = x.value === 'Fully Assisted'; }); const pr = ACT.cbDetCreate(); closeModal();
    open(pr.id, 'payments'); const heads = qa('.cb8-sec h3').filter(h => /^Deposit/.test(h.textContent));
    // FB1 (PD-FB1-01): Step 5 no longer has a programme deposit editor; the deposit is chosen on each fee option (Allow Deposit Yes / No)
    ok('CB12-C editable package: no "Deposit" heading, no programme deposit editor and no visible "Deposit" legend; each option has Allow Deposit', heads.length === 0 && !q('.cbr2-pdep') && !q('input[name="e1-wdm"]') && !qa('.cb8-sec legend.lbl').some(l => /^Deposit$/.test(l.textContent.trim())) && qa('.cbr2-opt .fb1-yn').length === qa('.cbr2-opt').length && qa('.cbr2-opt').length > 0, heads.length);
    ok('CB12-C …the deposit choice is still there per option (No / Yes — the Academy default or custom) and still saves', (() => { const o = cb8Work(pr).opts.find(x => x.status === 'Active'); q(`.cbr2-opt[data-o="${o.id}"] .fb1-yn input[data-k="no"]`).click(); return cb8Work(pr).opts.find(x => x.id === o.id).dep.mode === 'none'; })());
    ok('CB12-C the Fees step says in one line what it holds (CBR supersedes the longer "home" note)', /^Step \d of \d$/.test(q('.cbr-hint').textContent.trim()) /* CBR-2: no explanatory line under the step title — was the one-line description */);
    open(pr.id, 'details'); ok('CB12-C Course Details: fees are managed in Section 5, with "Open Fees & Payments"', !!q('.cb-feelink') && q('.cb-feelink').dataset.tab === 'payments');
    q('.cb-feelink').click(); ok('CB12-C …which opens Section 5', q('.cb').dataset.sec === 'payments');
    open('NV-L3', 'details'); ok('CB12-C read-only Course Details (seeded): Fees & Payment Plans is reachable from the step bar', !!q('.cbr-steps [data-tab="payments"]:not([disabled])')); // CBR-2 (PD-CBR2-01): no fees link inside the approved form
    SA(); ACT.cb8SaApprove({ dataset: { p: pr.id } }); if (MODAL) { document.querySelector('#rsn').value = 'x'; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal(); }
    ACT.cb8ViewPkg({ dataset: { p: pr.id } }); ok('CB12-C the approved package (read-only view) shows its Deposit under one heading', !!MODAL && [...document.querySelectorAll('#modal-root h3')].filter(h => /^Deposit/.test(h.textContent)).length === 1); closeModal();
  });

  await T('CB12-D no leftovers; legacy kept', async () => {
    fresh(); SA(); const left = [];
    PROGS.forEach(id => ['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review'].forEach(t => { open(id, t); if (/planned for CB|Not yet in this section|see Review\)/.test(main())) left.push(id + '.' + t); if (qa('.subtabs, ol.ch8-steps, .ch-nav, .s3-vh, .s3-wver').length) left.push(id + '.' + t + ' (old nav)'); }));
    ok('CB12-D no "planned for CB…" / "Not yet in this section" notes, old step bars, old version headers or Versions cards anywhere in the builder', !left.length, left.join(' '));
    open('NV-N1', 'plan'); ok('CB12-D legacy: NV-N1 (made before packages) keeps its payment plan panel and the way to start a package', /Payment plan/.test(main()) && (!!q('[data-act="cb8Start"]') || !!q('.cb8-start')));
    open('NV-L3', 'support'); ok('CB12-D legacy: the Level 3 observation fee rate panel is kept', /Observation fee rate/i.test(main()));
    open('NV-L3', 'plan'); ok('CB12-D legacy: seeded NV-L3 keeps its plan in force, read-only, with Finance as owner', /Version \d in force/.test(main()) && /Finance/.test(main()));
  });

  await T('CB12-E the seven steps in order', async () => { // CBR (PD-CBR-01) supersedes CBX's eight sections
    fresh(); SA(); open('NV-N1', 'details'); q('#cbr2-obs-yes').click(); // CBC1 (CBR-01): Next needs an explicit Yes / No — NV-N1's was never recorded
    const seen = [q('.cb').dataset.sec];
    for (let i = 0; i < 7; i++) { const nx = q('.cb-foot .btn-primary'); if (!nx) break; nx.click(); seen.push(q('.cb').dataset.sec); } // CDA-A1: eight steps (was CBR's seven) (NV-N1's observations aren't answered No, so step 4 is shown)
    ok('CB12-E "Next" walks Course Details → Documents → Curriculum & Outcomes → Assessments → Observations → Fees & Payment Plans → Offer Letters → Review & Publish', seen.join(',') === 'details,admdocs,curriculum,assessments,observations,payments,documents,review', seen.join(','));
    ok('CB12-E Review & Publish is the last step (no Next) and has Back to Offer Letters', !q('.cb-foot .btn-primary') && /Back: Offer Letters/.test(q('.cb-foot').textContent));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
