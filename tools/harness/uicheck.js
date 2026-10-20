// UI check (R1–R5 review): clickable journeys at one real viewport width (this page runs inside an iframe of that width).
// Checks what a person sees — elements displayed or not, no horizontal overflow of the page or an open dialog, wording — and
// reports to the parent page (uicheck.sh) with postMessage.
(function () {
  const W = window.innerWidth, R = [], ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + `[${W}] ` + n + (i ? ' — ' + i : ''));
  const $1 = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const shown = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const click = el => { if (!el) return false; el.click(); return true; };
  const main = () => ($1('main') || $1('#app')).textContent;
  const appOver = () => { const a = $1('#app'); return a ? a.scrollWidth - a.clientWidth : 0; };
  const modalFits = () => { const m = $1('#modal-root .modal'); if (!m) return 'no dialog'; const r = m.getBoundingClientRect(); const wide = [...m.querySelectorAll('input, select, textarea, button')].filter(e => shown(e) && e.getBoundingClientRect().right > r.right + 1); return r.left >= -1 && r.right <= W + 1 && m.scrollWidth <= m.clientWidth + 1 && !wide.length ? '' : `dialog ${Math.round(r.left)}–${Math.round(r.right)} of ${W}, scroll ${m.scrollWidth}/${m.clientWidth}, ${wide.length} controls past its edge`; };
  const nav = r => click($1(`.adm-side [data-go="${r}"], .side [data-go="${r}"], [data-go="${r}"]`)) || (go(r), true);
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  try {
    closeModal(); S.ui = {}; initStore();
    // 1. New NVQ programme wizard (Super Admin): Level 3 fee options, then Level 4 single price
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-dashboard'); nav('a-programmes');
    ok('wizard: "New NVQ programme" button opens the dialog', click($1('main [data-act="chProgNew"]')) && !!$1('#modal-root #np-t'));
    click($1('#modal-root [data-act="r1NpAdd"]')); click($1('#modal-root [data-act="r1NpAdd"]'));
    ok('wizard (Level 3): Price (GBP) is not displayed', !shown($1('#np-p')));
    ok('wizard (Level 3): three fee-option rows displayed, each with label, fee and mode', all('#modal-root .r1-np-row').filter(shown).length === 3 && all('#modal-root .r1-np-row').every(r => shown(r.querySelector('.r1-np-l')) && shown(r.querySelector('.r1-np-f')) && shown(r.querySelector('.r1-np-m'))));
    ok('wizard (Level 3): no delivery-mode or class-pattern selector; the mode comes from the fee option; no Pending label displayed', !shown($1('#modal-root .r1-np-sup')) && !all('#modal-root input[name="np-s"]').some(shown) && shown($1('#modal-root .r1-np-modes')) && /comes from the fee option/.test($1('#modal-root .r1-np-modes').textContent) && !all('#modal-root .tbd').some(shown));
    ok('wizard (Level 3): the dialog fits the viewport', !modalFits(), modalFits());
    ok('wizard (Level 3, E1 clarification): fee guidance displayed — payment methods and instalments are configured in the Payment Plan step; no instalment count stated', shown($1('#modal-root .e1-step1-fees')) && /Payment methods and instalments are configured in the Payment Plan step/.test($1('#modal-root .e1-step1-fees').textContent) && !/split evenly|unless changed/.test($1('#modal-root .r1-np-opts').textContent));
    ok('wizard: every fee-option control has an accessible name', all('#modal-root .r1-np-row input, #modal-root .r1-np-row select, #modal-root .r1-np-row button').every(e => (e.getAttribute('aria-label') || '').trim()));
    const lv = $1('#np-l'); lv.value = 'Level 4'; lv.dispatchEvent(new Event('change', { bubbles: true }));
    ok('wizard (Level 4): single Price displayed, fee options and the Level 3 text hidden, P-31 wording shown', shown($1('#np-p')) && !shown($1('#modal-root .r1-np-l3')) && !shown($1('#modal-root span.small.r1-np-m3')) && all('#modal-root .tbd').some(shown));
    ok('wizard (Level 4): the dialog fits the viewport', !modalFits(), modalFits()); closeModal();
    // 2. Finance → Instalment plans → Add fee option (dialog)
    go('a-finance', { tab: 'plans' }); ok('fee options: card displayed with Add fee option', shown($1('main .r1-opts [data-act="r1OptAdd"]')));
    click($1('main .r1-opts [data-act="r1OptAdd"]')); ok('fee options: Add fee option dialog fits the viewport', !!$1('#modal-root #fo-l') && !modalFits(), modalFits()); closeModal();
    // 3. Coordinator: Submissions & Feedback → Review → criterion assessment (draft, publish)
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; nav('c-submissions');
    ok('submissions: new wording; no "plain written feedback"', /evaluate individual criteria and publish feedback directly to learners/.test(main()) && /Pass\/Fail is declared by the authorized Assessor/.test(main()) && !/plain written|Marking is done by Teachers/.test(main()));
    ok('submissions: worklist summary is concise', shown($1('main .r4-wl')) && $1('main .r4-wl').getBoundingClientRect().height < (W < 700 ? 200 : 110), Math.round(($1('main .r4-wl') || { getBoundingClientRect: () => ({}) }).getBoundingClientRect().height));
    ok('submissions: no horizontal page overflow', appOver() <= 1, appOver());
    if (W >= 900) { const f = $1('main .dt-filt'), t = $1('main .tbl-wrap');
      ok('submissions: filters form a compact grid (not a vertical stack)', !!f && getComputedStyle(f).display === 'grid' && f.getBoundingClientRect().height < 130, f && Math.round(f.getBoundingClientRect().height));
      ok('submissions: the table fits without horizontal scrolling', !!t && t.scrollWidth <= t.clientWidth + 2, t && `${t.scrollWidth}/${t.clientWidth}`);
      const hd = all('main .tbl thead th').map(th => th.textContent.replace(/[^A-Za-z ]/g, '').trim().toLowerCase()).filter(Boolean);
      ok('submissions: leading columns are learner, mode, assignment, submitted, status, days waiting', hd.slice(0, 6).join() === 'learner,mode,assignment,submitted,status,days waiting', hd.join('|')); }
    const sub = mySubmissions(true).find(x => x.live && x.status === 'Submitted'); go('c-sub', { id: sub.key });
    const q = synthAsg(sub).qs[0];
    ok('review: no "plain written feedback only" panel; criterion assessment beside each answer', !/plain written feedback only/.test(main()) && all('main .r3-cq').length === synthAsg(sub).qs.length && all('main .r3-cq').every(c => shown(c.querySelector('.r3-cq-ans')) && shown(c.querySelector('.r3-cq-crit'))));
    ok('review: no text saying Coordinators can\'t evaluate', !/Marking (and verification )?(is|are) done by (Teachers|the Teacher)/.test(main()));
    $1('#r3-cv-' + q.id).value = 'Partially Met'; $1('#r3-ct-' + q.id).value = 'Add a second workplace example.'; click($1(`main [data-act="r3CooDraft"][data-q="${q.id}"]`));
    ok('review: Save draft — draft shown, not published', shown($1('main .r3-draft')) && !(r3Latest(sub.key, q.crit, 'Academic Coordinator', true)));
    click($1(`main [data-act="r3CooJudge"][data-q="${q.id}"]`));
    ok('review: Publish — shown as published to the learner with evaluator and date', /Published to the learner[\s\S]*Partially Met[\s\S]*Coordinator · Dr Helen Carter/.test($1(`main .r3-cq[data-q="${q.id}"] .r3-cq-crit`).textContent) && !$1('main .r3-draft'));
    ok('review: no horizontal page overflow', appOver() <= 1, appOver());
    ok('review: the final Pass / Fail control is not offered to the Coordinator', !$1('[data-act="r3Declare"]'));
    // 4. Learner sees it at once
    S.variant = sub.L.v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('assignment', { id: sub.a.id });
    ok('learner: the Coordinator\'s criterion feedback is displayed', shown($1('main .r3-learner')) && /Add a second workplace example/.test($1('main .r3-learner').textContent));
    ok('learner: no horizontal page overflow', appOver() <= 1, appOver());
    // 5. Assessor: Marking Queue → Mark → final outcome → Declare (dialog)
    S.tas.v = 'A'; S.tas.dirty = false; tasEnter(); S.signedIn = true; nav('t-queue');
    ok('marking queue: worklist summary and Self-Paced view', shown($1('main .r4-wl')) && !!all('main [data-act="mqTab"]').find(b => /Self-Paced/.test(b.textContent)));
    ok('marking queue: no horizontal page overflow', appOver() <= 1, appOver());
    go('t-mark', { id: sub.key });
    ok('workspace: Met / Partially Met / Not Met and the Coordinator\'s published judgement', all('main [data-act="mkMet"]').map(b => b.dataset.v).join() === 'Met,Partially Met,Not Met' && shown($1('main .r3-cooj')));
    ok('workspace: final outcome card with Declare (allocated Assessor)', shown($1('main .r3-out [data-act="r3Declare"]')));
    click($1('main .r3-out [data-act="r3Declare"]')); ok('workspace: Declare dialog fits the viewport', !!$1('#modal-root input[name="r3-res"]') && !modalFits(), modalFits()); closeModal();
    // 6. Batch → Schedule → Add session (audience) dialog
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches', { id: 'L3AC-NOV26-LEI', tab: 'schedule' });
    ok('batch: the batch\'s mode is shown only for standard-fee learners; learners by mode shown', /Delivery mode for standard-fee learners/.test(main()) && !/Default delivery mode|class pattern/.test(main()) && shown($1('main .r2-mix')));
    click(all('main [data-act="addSession"]').find(b => !b.closest('.n3-plan'))); ok('Add session: audience choice displayed; dialog fits the viewport', shown($1('#modal-root .r2-aud')) && !modalFits(), modalFits()); closeModal();
    // 6b. Fee options (dialog) → programme page tab → Add session audience (labels, groups, selection) → Edit session
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-finance', { tab: 'plans' });
    const addOpt = (l, f, m) => { click($1('main .r1-opts[data-pid="NV-L3"] [data-act="r1OptAdd"]')); $1('#fo-l').value = l; $1('#fo-f').value = String(f); $1('#fo-m').value = m; $1('#rsn').value = 'UI check'; const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); a.fn(); closeModal(); render(); };
    addOpt('Self-Paced Basic', 600, 'Self-Paced'); addOpt('Self-Paced Plus', 900, 'Self-Paced'); addOpt('Fully Assisted', 1800, 'Fully Assisted');
    ok('fee options: three added through the dialog', r1Opts('NV-L3').filter(o => !o.legacy).length === 3);
    go('a-programmes', { id: 'NV-L3' }); ok('programme page (Level 3 Diploma): "Fee options" tab', click($1('main [data-tab="fees"]')) && shown($1('main .r1-opts')) && /Self-Paced Plus/.test(main()));
    ok('programme page: no horizontal page overflow', appOver() <= 1, appOver());
    go('a-batches', { id: 'L3AC-NOV26-LEI', tab: 'schedule' }); click(all('main [data-act="addSession"]').find(b => !b.closest('.n3-plan')));
    const grp = all('#modal-root .r2-grp').map(g => g.querySelector('.r2-gh').textContent + ': ' + [...g.querySelectorAll('.r2-opt strong')].map(x => x.textContent).join(' | '));
    ok('Add session: every fee option is its own checkbox, grouped under Self-Paced / Fully Assisted (plus the standard fee)', grp.join(' ; ') === 'Self-Paced: £600.00 — Self-Paced Basic | £900.00 — Self-Paced Plus ; Fully Assisted: £1,800.00 — Fully Assisted ; Standard fee (legacy): £2,400.00 — Standard programme fee', grp.join(' ; '));
    ok('Add session: no whole-mode checkbox; headings not selectable', !$1('#modal-root .r2-g[value^="mode:"]') && !$1('#modal-root .r2-gh input') && all('#modal-root .r2-g').length === 4);
    const tickBy = name => { const lab = all('#modal-root .r2-opt').find(l => l.querySelector('strong').textContent.endsWith(name)); const x = lab.querySelector('input'); click(x); return x.value; };
    // unified selector (old: an "All learners / Only these" radio choice): a new session starts with every option ticked
    ok('Add session: "Who should attend?", every option ticked by default; no radio choice', /Who should attend\?/.test($1('#modal-root').textContent) && all('#modal-root .r2-g:checked').length === 4 && !$1('#modal-root input[name="r2-aud"]'));
    click($1('#modal-root [data-act="r2AudNone"]')); const ids = ['Self-Paced Basic', 'Self-Paced Plus', 'Fully Assisted'].map(tickBy);
    ok('Add session: Clear selection, then ticking two Self-Paced options and one Fully Assisted shows the summary', /^3 fee options selected · 0 learners/.test($1('#modal-root .r2-sum').textContent), $1('#modal-root .r2-sum').textContent);
    ok('Add session: the dialog fits the viewport with the audience open', !modalFits(), modalFits());
    $1('#se-n').value = 'UI audience class'; let res = MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(), n = 0; while (res === false && MODAL && n++ < 3) res = MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); closeModal(); render();
    const ss = s4bAllSess().find(x => x.title === 'UI audience class');
    ok('Add session: saved with exactly the three option IDs', !!ss && r2Same(ss.aud, ids), ss && JSON.stringify(ss.aud));
    click(all('main [data-act="s4bSessEdit"]').find(b => b.dataset.id === ss.id) || null) || ACT.s4bSessEdit({ dataset: { id: ss.id } });
    ok('Edit session: the same grouped selector with the three options ticked', all('#modal-root .r2-g:checked').map(x => x.value).sort().join() === ids.slice().sort().join() && all('#modal-root .r2-grp').length === 3);
    ok('Edit session: the dialog fits the viewport', !modalFits(), modalFits()); closeModal();
    // 6b2. Weekly class plan: the same grouped fee-option selector; several plans per batch
    go('a-batches', { id: 'L3AC-NOV26-LEI', tab: 'schedule' }); const addW = $1('main [data-act="n3Weekly"][data-w="new"]');
    ok('Schedule area: "Add one session" and "Add weekly recurring classes" side by side; no Fully Assisted / Self-Paced class-pattern wording', shown(addW) && shown($1('main .r2-sched [data-act="addSession"]')) && addW.closest('.r2-sched-acts') === $1('main .r2-sched [data-act="addSession"]').closest('.r2-sched-acts') && /Weekly recurring classes/.test(main()) && !/Class plan — Fully Assisted|separate batch/i.test(main()));
    ok('Schedule area: no horizontal page overflow; each class row shows its kind and audience', appOver() <= 1 && all('main .r2-sched tbody tr').filter(tr => /Class \/ session/.test(tr.textContent)).every(tr => shown(tr.querySelector('.r2-kind')) && shown(tr.querySelector('.r2-for'))), appOver());
    const ttE = all('main .r2-sched [data-act="kEditEv"]')[0]; click(ttE);
    ok('Batch timetable class: its Edit shows the common selector (every option ticked) and fits the viewport', !!ttE && /Who should attend\?/.test($1('#modal-root').textContent) && all('#modal-root .r2-g:checked').length === all('#modal-root .r2-g').length && !$1('#modal-root input[name="r2-aud"]') && !modalFits(), modalFits()); closeModal();
    click(addW); const grpW = all('#modal-root .r2-grp').map(g => g.querySelector('.r2-gh').textContent + ': ' + [...g.querySelectorAll('.r2-opt strong')].map(x => x.textContent).join(' | '));
    ok('Weekly plan dialog: "Who should attend?" with the same grouped options as Add session', /Who should attend\?/.test($1('#modal-root').textContent) && grpW.join(' ; ') === grp.join(' ; '), grpW.join(' ; '));
    ok('Weekly plan dialog: Select all / Clear selection and a summary; no whole-mode choice', shown($1('#modal-root [data-act="r2AudAll"]')) && shown($1('#modal-root [data-act="r2AudNone"]')) && /fee options? selected/.test($1('#modal-root .r2-sum').textContent) && !$1('#modal-root input[name="r2-aud"]') && !$1('#modal-root .r2-g[value^="mode:"]'));
    click($1('#modal-root [data-act="r2AudNone"]')); ok('Weekly plan dialog: Clear selection unticks every option', !all('#modal-root .r2-g:checked').length);
    click($1('#modal-root [data-act="r2AudAll"]')); ok('Weekly plan dialog: Select all ticks every option', all('#modal-root .r2-g:checked').length === all('#modal-root .r2-g').length);
    ok('Weekly plan dialog: fits the viewport', !modalFits(), modalFits()); closeModal();
    // 6c. Learner sign-up: options grouped the same way
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse');
    click(all('main [data-act="applyNvq"]').find(b => (CATALOGUE.find(c => c.id === b.dataset.id) || {}).title === 'Level 3 Diploma in Adult Care (England)'));
    ok('sign-up: fee options grouped under Self-Paced / Fully Assisted / Standard fee', all('#modal-root #r1-opts .r2-gh').map(x => x.textContent).join() === 'Self-Paced,Fully Assisted,Standard fee' && all('#modal-root input[name="r1-opt"]').length === 4);
    ok('sign-up: the dialog fits the viewport', !modalFits(), modalFits()); closeModal();
    // 6d. Scenario #30 — every step button opens its screen with the control the step talks about
    ACT.scOpen(); go('demo-scenarios');
    const steps = [['r5Sc30Opts', () => S.route === 'a-finance' && !!$1('main [data-act="r1OptAdd"]')], ['r5Sc30Staff', () => S.route === 'a-batches' && /staff|Staff/.test(S.params.tab || '') ], ['r5Sc30Apply', () => !!$1('#modal-root input[name="r1-opt"]') || S.route === 'admission'], ['r5Sc30Sign', () => S.route === 'admission'],
      ['r5Sc30Sched', () => S.route === 'a-batches' && !!$1('main [data-act="addSession"]')], ['r5Sc30Cal', () => S.route === 'calendar'], ['r5Sc30Pub', () => S.route === 'a-assignments'], ['r5Sc30Sub', () => S.route === 'assignments'], ['r5Sc30Coo', () => S.route === 'c-submissions' && !!$1('main .r4-wl')], ['r5Sc30Asr', () => S.route === 't-queue' && !!$1('main .r4-wl')]];
    const bad = steps.filter(([act, chk]) => { closeModal(); ACT.scOpen(); go('demo-scenarios'); const b = $1(`#sc-30 [data-act="${act}"]`); if (!click(b)) return true; return !chk(); }).map(x => x[0]); closeModal();
    ok('Scenario #30: all ten step buttons open the right screen', !bad.length, bad.join(', '));
    // 6e. E1 (provisional): duration controls, the creator's payment terms, submit to Finance, Finance's review item
    closeModal(); initStore(); acaEnter('KA'); S.signedIn = true; go('a-dashboard'); nav('a-programmes'); click($1('main [data-act="chProgNew"]'));
    const set = (s, v) => { const e = $1(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('#np-l', 'Level 4'); set('#np-t', 'Level 4 UI check programme'); set('#np-r', 'QN 610/8888/1'); set('#np-d', '18'); set('#np-du', 'months'); set('#np-p', '2400');
    ok('E1 wizard: duration number and unit displayed side by side, unit readable', shown($1('#np-d')) && shown($1('#np-du')) && $1('#np-du').getBoundingClientRect().width >= 90 && Math.abs($1('#np-d').getBoundingClientRect().top - $1('#np-du').getBoundingClientRect().top) < 4, Math.round($1('#np-du').getBoundingClientRect().width));
    ok('E1 wizard: the dialog fits the viewport', !modalFits(), modalFits());
    click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Create draft')); click($1('main .ch8-steps [data-tab="plan"]'));
    ok('E1 plan step: Draft status and three clearly labelled payment choices', /Draft — not yet submitted/.test(main()) && all('main input[name="e1-meth"]').filter(shown).length === 3);
    click($1('main input[name="e1-meth"][value="one-time"]')); ok('E1 plan step: "One payment" hides the instalment count', !shown($1('#e1-n')));
    click($1('main input[name="e1-meth"][value="both"]')); ok('E1 plan step: "Both" shows the count; the summary follows', shown($1('#e1-n')) && /in one payment, or/.test($1('main .e1-sumbox').textContent));
    ok('E1 plan step: no horizontal page overflow', appOver() <= 1, appOver());
    // E2: the three deposit choices; the custom amount only for a custom deposit; the summary follows
    ok('E2 plan step: three deposit choices displayed (not available / Academy default / custom); custom amount hidden', all('main input[name="e1-wdm"]').filter(shown).length === 3 && /Deposit not available/.test($1('main .e2-dep').textContent) && /Use Academy default deposit/.test($1('main .e2-dep').textContent) && /Set a custom deposit amount for this programme/.test($1('main .e2-dep').textContent) && !shown($1('#e1-d')));
    click($1('main input[name="e1-wdm"][value="own"]')); ok('E2 plan step: "Set a custom deposit amount" shows the GBP field', shown($1('#e1-d')) && /Custom deposit \(GBP\)/.test($1('main .e2-dv-e1').textContent));
    click($1('main input[name="e1-wdm"][value="none"]')); ok('E2 plan step: "Deposit not available" hides the field; the summary says "Not available"; no page overflow', !shown($1('#e1-d')) && /Not available — this programme doesn't offer a deposit/.test($1('main .e1-sumbox').textContent) && appOver() <= 1, appOver());
    click($1('main input[name="e1-wdm"][value="default"]'));
    click($1('main [data-act="e1Submit"]')); ok('E1 submit dialog fits the viewport', !!$1('#modal-root .e1-sum') && !modalFits(), modalFits());
    click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Submit for review'));
    ok('E1 after submitting: "Waiting for Finance review", nothing editable', /Waiting for Finance review/.test(main()) && !$1('#e1-n'));
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('f-dashboard'); nav('a-queue');
    const qid = (ADMIN.queue.find(i => i.type === 'Programme payment terms') || {}).id; go('a-queue', { id: qid });
    ok('E1 Finance item: proposal panel, Approve payment terms and Request changes displayed', shown($1('main .e1-q')) && shown($1('main .q-decide [data-a="approve"]')) && shown($1('main .q-decide [data-a="return"]')));
    ok('E1 Finance item: no horizontal page overflow', appOver() <= 1, appOver());
    ok('E1-R Finance item: the exact proposed schedule is displayed ("Proposed payment schedule", "Instalments 1–6: £400.00 each", total)', shown($1('main .e1-q .e1-sum')) && /Proposed payment schedule/.test($1('main .e1-q').textContent) && /Instalments 1–6: £400\.00 each/.test($1('main .e1-q .e1-sum').textContent) && /Total £2,400\.00/.test($1('main .e1-q .e1-sum').textContent));
    click($1('main .q-decide [data-a="return"]')); ok('E1 Request changes dialog fits the viewport', !!$1('#modal-root #rsn') && !modalFits(), modalFits()); closeModal();
    // E1 review corrections: Finance's Edit plan stays in Finance; the queue list names each type
    nav('a-queue'); const qrow = all('main tbody tr').find(tr => tr.textContent.includes('AQ-7301'));
    ok('E1 Finance queue: Bundle VAT request labelled "Bundle VAT change"', !!qrow && /Bundle VAT change/.test(qrow.textContent) && !/Agency invoice purchase/.test(qrow.textContent));
    nav('f-plans'); ok('E1 Finance → Payment Plans: no link into NVQ Programmes', !all('main [data-go="a-programmes"]').length);
    click($1('main .ch8-plans [data-act="s4PlanEdit"][data-p="NV-N2"]'));
    ok('E1 Finance "Edit plan": its own plan editor with One payment / Instalments / Both, and it fits', all('#modal-root input[name="pp-meth"]').filter(shown).length === 3 && shown($1('#modal-root #pp-n')) && !modalFits(), modalFits());
    click($1('#modal-root input[name="pp-meth"][value="one-time"]')); ok('E1 Finance editor: "One payment" hides the instalment count', !shown($1('#modal-root #pp-n')));
    ok('E2 Finance editor: three deposit choices displayed; NV-N2\'s custom £150 shown in its field', all('#modal-root input[name="pp-dm"]').filter(shown).length === 3 && $1('#modal-root input[name="pp-dm"][value="own"]').checked && shown($1('#modal-root #pp-dv')) && $1('#modal-root #pp-dv').value === '150');
    click($1('#modal-root input[name="pp-dm"][value="none"]')); ok('E2 Finance editor: "Deposit not available" hides the amount; the dialog still fits', !shown($1('#modal-root #pp-dv')) && !modalFits(), modalFits());
    click($1('#modal-root input[name="pp-dm"][value="own"]'));
    click($1('#modal-root input[name="pp-meth"][value="both"]')); $1('#rsn').value = 'UI check'; click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Save new version'));
    ok('E1 Finance editor saved "Both" as a new version', !$1('#modal-root .modal') && s4PlanCur('NV-N2').meth === 'both');
    // Level 3: two fee options share the programme's terms (Super Admin's plan step)
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-dashboard');
    const l3 = ch8Create({ title: 'Level 3 UI check programme', level: 'Level 3', ref: 'QN 610/7171/3', dur: '12 months', durV: { n: 12, unit: 'months' }, desc: '', price: 2400, support: 'Fully assisted', r1opts: [{ label: 'Self-Paced', fee: 2400, mode: 'Self-Paced' }, { label: 'Fully Assisted', fee: 2700, mode: 'Fully Assisted' }] });
    go('a-programmes', { id: l3.id, tab: 'plan' }); click($1('main input[name="pp-meth"][value="both"]'));
    ok('E1 Level 3 plan step: both fee options listed with mode, fee and how learners pay', all('main .e1-sum tbody tr').filter(shown).length === 2 && /Self-Paced/.test($1('main .e1-sum').textContent) && /£2,700\.00 in one payment, or 6 monthly/.test($1('main .e1-sum').textContent));
    ok('E1 Level 3 plan step: deposit policy stated; no page overflow', /28 days or more/.test($1('main .e1-plan').textContent) && appOver() <= 1, appOver());
    // E1-R: three fee options that don't all split evenly — the exact schedules, the deposit as an alternative route, readable at every width
    const l3r = ch8Create({ title: 'Level 3 UI rounding programme', level: 'Level 3', ref: 'QN 610/7272/3', dur: '12 months', durV: { n: 12, unit: 'months' }, desc: '', price: 800, support: 'Fully assisted', r1opts: [{ label: 'Self-Paced', fee: 800, mode: 'Self-Paced' }, { label: 'Fully Assisted', fee: 1000, mode: 'Fully Assisted' }, { label: 'Fully Assisted — plus', fee: 1500, mode: 'Fully Assisted' }] });
    go('a-programmes', { id: l3r.id, tab: 'plan' }); const sumR = $1('main .e1-sum');
    ok('E1-R plan step: three options with exact schedules (£133.35, £166.65 finals; £250.00 each) and totals displayed', !!sumR && all('main .e1-sum tbody tr').filter(shown).length === 3 && /instalment 6 \(final\): £133\.35/.test(sumR.textContent) && /instalment 6 \(final\): £166\.65/.test(sumR.textContent) && /Instalments 1–6: £250\.00 each/.test(sumR.textContent) && /Total £1,000\.00/.test(sumR.textContent));
    ok('E1-R plan step: no divisibility error; deposit shown as the alternative route with the configured hold', !/divide|equal instalments|Needs configuration/.test(main()) && /Alternative to instalments: £300\.00 deposit, followed by the £700\.00 balance during the configured seat-hold period \(28 days\)\./.test(sumR.textContent) && shown($1('main .e1-sum-note')) && /at least 28 days away/.test($1('main .e1-sum-note').textContent));
    ok('E1-R plan step: the summary scrolls inside its own frame (no page overflow); the deposit column stays readable', appOver() <= 1 && all('main .e1-sum td.e1-dep').filter(shown).every(td => td.getBoundingClientRect().width >= 150), `${appOver()} / ${all('main .e1-sum td.e1-dep').map(td => Math.round(td.getBoundingClientRect().width)).join(',')}`);
    // Learner: the payment step for a "Both" plan
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const ap = $1('main [data-act="applyNvq"][data-id="k-NV-N2"]'); ok('E1 learner: Browse offers the programme', !!ap); click(ap); const sb = all('#modal-root .modal button').find(b => b.textContent.trim() === 'Start sign-up'); ok('E1 learner: the sign-up dialog opens', !!sb, MODAL ? MODAL.title : 'no dialog'); click(sb);
    { const w = STORE.worlds[S.variant]; /* (W here is the viewport width) */ ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); }
    ok('E1 learner payment step: deposit, "Pay in full" and "Instalments" displayed', ['deposit', 'full', 'instalment'].every(v => shown($1(`main input[name="su-opt"][value="${v}"]`))) && /Pay in full — £900\.00 now/.test(main()));
    click($1('main input[name="su-opt"][value="full"]')); ok('E1 learner: choosing "Pay in full" asks for £900.00; no page overflow', /Pay £900\.00/.test(main()) && appOver() <= 1, appOver());
    // E1-R learner checkout: a fee that doesn't split evenly shows and charges the actual first instalment
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; r1AddOpt('NV-L3', { label: 'Self-Paced — rounded', fee: 1000, mode: 'Self-Paced' }, 'UI check', 'Added'); const oR = r1Opts('NV-L3').find(o => o.fee === 1000);
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const cL3 = CATALOGUE.find(c => c.kind === 'nvq' && c.title === s3Pr('NV-L3').title);
    click($1(`main [data-act="applyNvq"][data-id="${cL3.id}"]`)); const rR = $1(`#modal-root input[name="r1-opt"][value="${oR.id}"]`);
    ok('E1-R learner sign-up dialog: the £1,000 option states "6 monthly instalments (5 × £166.67 and a final £166.65)"', !!rR && /6 monthly instalments \(5 × £166\.67 and a final £166\.65\), the first one now/.test(rR.closest('label').textContent));
    if (rR) rR.checked = true; click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Start sign-up'));
    { const w = STORE.worlds[S.variant]; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); }
    click($1('main input[name="su-opt"][value="instalment"]'));
    ok('E1-R learner payment step: "6 monthly payments (5 × £166.67 and a final £166.65)", "Pay £166.67 by card"; no page overflow', /Instalments — 6 monthly payments \(5 × £166\.67 and a final £166\.65\)/.test(main()) && shown(all('main button').find(b => /Pay £166\.67 by card/.test(b.textContent))) && appOver() <= 1, appOver());
    click(all('main button').find(b => /Pay £166\.67 by card/.test(b.textContent)));
    ok('E1-R checkout dialog: charges £166.67 for "NVQ instalment 1 of 6" and fits the viewport', !!$1('#modal-root .modal') && /166\.67/.test($1('#modal-root').textContent) && /instalment 1 of 6/.test($1('#modal-root').textContent) && !modalFits(), modalFits()); closeModal();
    // E2 learner: a programme without a deposit — no deposit route, a clear reason (not the 28-day one)
    closeModal(); initStore(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; nav('f-plans'); ACT.s4PlanEdit({ dataset: { p: 'NV-L3' } }); click($1('#modal-root input[name="pp-dm"][value="none"]')); $1('#rsn').value = 'UI check'; click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Save new version'));
    go('f-plans', { tab: 'templates' }); ok('E2 Finance saved "Deposit not available" for Level 3; Payment Plans shows "Not available"', s4PlanCur('NV-L3').depOff === true && !!$1('main .s4-plans tr[data-pid="NV-L3"]') && /Not available/.test($1('main .s4-plans tr[data-pid="NV-L3"]').textContent));
    setAdminIdentity('A'); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    ok('E2 Offer letter tab: the payment-wording warning is displayed (letter says "deposit", none offered); no page overflow', shown($1('main .e2-letter-clash')) && /doesn't offer a deposit/.test($1('main .e2-letter-clash').textContent) && appOver() <= 1, appOver());
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); click($1(`main [data-act="applyNvq"][data-id="${CATALOGUE.find(c => c.kind === 'nvq' && c.title === s3Pr('NV-L3').title).id}"]`));
    ok('E2 learner sign-up dialog: "No deposit for this programme" on the option; the dialog fits', !!$1('#modal-root .r1-pick') && /No deposit for this programme\./.test($1('#modal-root .r1-pick').textContent) && !modalFits(), modalFits());
    click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Start sign-up'));
    { const w = STORE.worlds[S.variant]; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); }
    ok('E2 learner payment step: no deposit choice; "No deposit for this programme" displayed; no page overflow', !$1('main input[name="su-opt"][value="deposit"]') && shown($1('main .e2-nodep')) && /No deposit for this programme\./.test($1('main .e2-nodep').textContent) && !/A deposit can only hold a seat/.test(main()) && appOver() <= 1, appOver());
    // N5a: programme Observations tab (published → new version → settings, evidence, Academy criterion) and the wizard step
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    const mbtn = t => all('#modal-root .modal button').find(b => b.textContent.trim() === t);
    ok('N5a tab: Observations selected, published version read-only (no edit controls), "Create new version" displayed; no page overflow', $1('main .subtabs [data-tab="obs"]').getAttribute('aria-selected') === 'true' && shown($1('main .n5-head')) && !$1('main [data-act="n5Settings"]') && shown($1('main [data-act="newProgVersion"]')) && appOver() <= 1, appOver());
    click($1('main [data-act="newProgVersion"]')); $1('#rsn').value = 'UI check'; click(all('#modal-root .modal button').find(b => /Create Version 3/.test(b.textContent)));
    ok('N5a review: the new version shows "Not chosen yet" for Observation required, with the reason; blocking item listed', /Not chosen yet/.test($1('main .n5-settings').textContent) && shown($1('main .n5-req-hint')) && /choose whether observation is required/.test($1('main .n5-checks').textContent));
    ok('N5a draft: "Edit settings", "Evidence" and "Add criterion" displayed; blocking/warning list shown; no page overflow', shown($1('main [data-act="n5Settings"]')) && shown($1('main .n5-nvq [data-act="n5NvqEv"]')) && shown($1('main .n5-ia [data-act="n5IaEdit"]')) && shown($1('main .n5-checks')) && appOver() <= 1, appOver());
    click($1('main [data-act="n5Settings"]'));
    ok('N5a settings dialog: three groups of choices displayed, each with a visible legend; the dialog fits', all('#modal-root .n5-fs legend').filter(shown).length === 3 && all('#modal-root input[type="radio"]').filter(shown).length === 6 && !modalFits(), modalFits());
    click($1('#modal-root input[name="n5-req"][value="yes"]')); click($1('#modal-root input[name="n5-wp"][value="Permitted"]')); click($1('#modal-root input[name="n5-off"][value="Available"]')); click(mbtn('Save settings'));
    ok('N5a settings saved: Observation required "Yes" displayed', /Yes/.test($1('main .n5-settings dd').textContent) && !MODAL);
    click($1('main .n5-nvq [data-act="n5NvqEv"]'));
    ok('N5a evidence dialog: five evidence types and instructions displayed; the dialog fits', all('#modal-root .n5-ev').filter(shown).length === 5 && shown($1('#n5n-i')) && !modalFits(), modalFits());
    click(all('#modal-root .n5-ev').find(x => x.value === 'photos')); click(mbtn('Save evidence'));
    ok('N5a evidence saved: "Photos" shown on the criterion row', /Photos/.test($1('main .n5-nvq tbody tr').textContent));
    click($1('main .n5-ia [data-act="n5IaEdit"][data-c=""]'));
    ok('N5a add criterion dialog: title, evidence and NVQ mapping choices displayed; every checkbox has a label; the dialog fits', shown($1('#n5-t')) && all('#modal-root .n5-map').filter(shown).length === 6 && all('#modal-root input[type="checkbox"]').every(x => !!x.closest('label')) && !modalFits(), modalFits());
    $1('#n5-t').value = 'UI check criterion'; click(all('#modal-root .n5-ev').find(x => x.value === 'notes')); click($1('#modal-root .n5-map')); click(mbtn('Add criterion'));
    ok('N5a criterion added: shown in the Academy criteria table; no page overflow', /UI check criterion/.test($1('main .n5-ia').textContent) && appOver() <= 1, appOver());
    click($1('main .subtabs [data-tab="library"]'));
    ok('N5a review legacy tab: "Shared library (legacy)" selected, guidance with "Open Observations" displayed, no library edit buttons; no page overflow', /Shared library \(legacy\)/.test($1('main .subtabs [aria-selected="true"]').textContent) && shown($1('main .n5-legacy-note [data-tab="obs"]')) && !all('main [data-act="kLib"], main [data-act="kLibAttach"]').length && appOver() <= 1, appOver());
    click($1('main .n5-legacy-note [data-tab="obs"]')); ok('N5a review legacy tab: "Open Observations" opens the Observations tab', $1('main .subtabs [data-tab="obs"]').getAttribute('aria-selected') === 'true');
    go('a-programmes', { id: 'NV-N1', tab: 'obs' });
    ok('N5a wizard: seven steps with Observations third and current; the section shown; no page overflow', all('main .ch8-steps .step').length === 7 && /Observations/.test($1('main .ch8-steps .step.cur').textContent) && shown($1('main .n5-head')) && appOver() <= 1, appOver());
    // 7. Demo controls: the scenarios button at once
    S.demoOpen = false; render(); click($1('.demo-fab')); ok('Demo controls: "Open the 30 Demo Scenarios" shown at once', shown($1('#demo-root [data-act="scOpen"]')));
    ok('no script errors', !errs.length, errs.join(' | '));
  } catch (e) { R.push(`FAIL [${W}] threw ${e.message} ${(e.stack || '').split('\n')[1] || ''}`); }
  parent.postMessage({ uicheck: R }, '*');
})();
