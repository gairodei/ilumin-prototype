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
    // 1. New NVQ programme (Super Admin): Level 3 fee options, then Level 4 single price — CB2 (PD-CB-14): on the Course Details page of an
    //    unsaved course, not in a dialog (selectors main, not #modal-root; "the dialog fits" → no page overflow)
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-dashboard'); nav('a-programmes');
    ok('New NVQ programme: the button opens Course Details of an unsaved course (no dialog)', click($1('main [data-act="chProgNew"]')) && !MODAL && !!$1('main .cb-new #np-t'));
    click($1('main [data-act="r1NpAdd"]')); click($1('main [data-act="r1NpAdd"]'));
    ok('wizard (Level 3): Price (GBP) is not displayed', !shown($1('#np-p')));
    ok('wizard (Level 3): three fee-option rows displayed, each with label, fee and mode', all('main .r1-np-row').filter(shown).length === 3 && all('main .r1-np-row').every(r => shown(r.querySelector('.r1-np-l')) && shown(r.querySelector('.r1-np-f')) && shown(r.querySelector('.r1-np-m'))));
    ok('wizard (Level 3): no delivery-mode or class-pattern selector; the mode comes from the fee option; no Pending label displayed', !shown($1('main .r1-np-sup')) && !all('main input[name="np-s"]').some(shown) && shown($1('main .r1-np-modes')) && /comes from the fee option/.test($1('main .r1-np-modes').textContent) && !all('main .tbd').some(shown));
    ok('Course Details (Level 3): no page overflow', appOver() <= 1, appOver());
    ok('wizard (Level 3, E1 clarification): fee guidance displayed — payment methods and instalments are configured in the Payment Plan step; no instalment count stated', shown($1('main .e1-step1-fees')) && /Payment methods and instalments are configured in the Payment Plan step/.test($1('main .e1-step1-fees').textContent) && !/split evenly|unless changed/.test($1('main .r1-np-opts').textContent));
    ok('wizard: every fee-option control has an accessible name', all('main .r1-np-row input, main .r1-np-row select, main .r1-np-row button').every(e => (e.getAttribute('aria-label') || '').trim()));
    const lv = $1('#np-l'); lv.value = 'Level 4'; lv.dispatchEvent(new Event('change', { bubbles: true }));
    ok('DM-P wizard (Level 4): fee options by delivery mode by default', shown($1('main .r1-np-l3')) && !shown($1('#np-p')) && $1('main #cr-pm-opts').checked); click($1('main #cr-pm-price'));
    ok('wizard (Level 4): single Price displayed (once chosen), fee options and the Level 3 text hidden, the delivery modes offered shown', shown($1('#np-p')) && !shown($1('main .r1-np-l3')) && !shown($1('main span.small.r1-np-m3')) && shown($1('main .cr-pm'))); // DM (PD-DM-04, supersedes PD-CR-02's .cr-dm): the pricing choice, one programme price by default
    ok('Course Details (Level 4): no page overflow', appOver() <= 1, appOver()); closeModal();
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
    // CB1 (PD-CB-01) supersedes the "Fee options" tab: now Fees & Payments → Fee options (the same card)
    go('a-programmes', { id: 'NV-L3' }); ok('programme page (Level 3 Diploma): Fees & Payments → "Fee options"', click($1('main .cb-sec[data-tab="payments"]')) && click($1('main .cb-panels [data-tab="fees"]')) && shown($1('main .r1-opts')) && /Self-Paced Plus/.test(main()));
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
    set('#np-l', 'Level 4'); set('#np-t', 'Level 4 UI check programme'); set('#np-r', 'QN 610/8888/1'); set('#np-d', '18'); set('#np-du', 'months'); set('#np-p', '2400'); click($1('main #cr-pm-price')); /* DM-P (PD-DM-18): one programme price is chosen explicitly (fee options are the default) */
    ok('E1 wizard: duration number and unit displayed side by side, unit readable', shown($1('#np-d')) && shown($1('#np-du')) && $1('#np-du').getBoundingClientRect().width >= 90 && Math.abs($1('#np-d').getBoundingClientRect().top - $1('#np-du').getBoundingClientRect().top) < 4, Math.round($1('#np-du').getBoundingClientRect().width));
    ok('E1 Course Details: no page overflow', appOver() <= 1, appOver()); // CB2 (PD-CB-14): the page, not the dialog
    /* CR (PD-CR-06): no course code. DM (PD-DM-01): no modes-offered field (was a click on .cr-dm-c) */ click($1('main #np-obs-no')); click($1('main [data-act="cbDetCreate"]')); click($1('main .cb-nav .cb-sec[data-tab="payments"]')); // CB1 (PD-CB-01): the Fees & Payments section (was the wizard's Payment plan step)
    // CB8 (PD-CB-48, PD-CB-50, PD-CB-52) supersedes the E1 plan-step checks ("How can learners pay?" one payment / instalments / both, #e1-n, the live
    // .e1-sumbox and the E1 submit dialog / queue panel) for a programme made in the builder: Section 5 is its financial package
    const over = el => !!el && el.scrollWidth - el.clientWidth > 1;
    ok('CB8 Fees & payment options: Draft status, the fee option card and "Add payment option" displayed', /Draft — not yet sent to Finance/.test(main()) && shown($1('main .cb8-opt')) && shown($1('main [data-act="cb8PayAdd"]')) && shown($1('main .cb8-add input')));
    const kIn = $1('main .cb8-add input'); kIn.value = '4'; INP.cb8KLive(kIn);
    ok('CB8 Add payment option: the live preview is displayed (rule, amounts, example dates)', shown($1('main .cb8-prev')) && /4 × £600\.00/.test($1('main .cb8-prev').textContent) && /Example for sample start/.test($1('main .cb8-prev').textContent));
    click($1('main [data-act="cb8PayAdd"]'));
    ok('CB8 two payment options listed in the card; no card, payment row or page overflow', all('main .cb8-pay').length === 2 && !all('main .cb8-opt, main .cb8-pay').some(over) && appOver() <= 1, appOver());
    ok('CB8 the dated example opens inside the card', click($1('main .cb8-pay[data-k="4"] .cb8-ex summary')) && shown($1('main .cb8-pay[data-k="4"] .cb8-dates')) && !over($1('main .cb8-pay[data-k="4"]')));
    // E2: the three deposit choices; the custom amount only for a custom deposit (same fields, now in the package)
    ok('E2 Fees & payment options: three deposit choices displayed (not available / Academy default / custom); custom amount hidden', all('main input[name="e1-wdm"]').filter(shown).length === 3 && /Deposit not available/.test($1('main .e2-dep').textContent) && /Use Academy default deposit/.test($1('main .e2-dep').textContent) && /Set a custom deposit amount for this programme/.test($1('main .e2-dep').textContent) && !shown($1('#e1-d')));
    click($1('main input[name="e1-wdm"][value="own"]')); ok('E2 "Set a custom deposit amount" shows the GBP field', shown($1('#e1-d')) && /Custom deposit \(GBP\)/.test($1('main .e2-dv-e1').textContent));
    click($1('main input[name="e1-wdm"][value="none"]')); ok('E2 "Deposit not available" hides the field; no page overflow', !shown($1('#e1-d')) && appOver() <= 1, appOver());
    click($1('main input[name="e1-wdm"][value="default"]'));
    click($1('main [data-act="cb8Submit"]')); ok('CB8 submit dialog (the whole package) fits the viewport', !!$1('#modal-root .cb8-pkg') && !modalFits(), modalFits());
    click(all('#modal-root .modal button').find(b => b.textContent.trim() === 'Submit for review'));
    ok('CB8 after submitting: "Waiting for Finance review", nothing editable', /Waiting for Finance review/.test(main()) && !$1('main [data-act="cb8PayAdd"]'));
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('f-dashboard'); nav('a-queue');
    const qid = (ADMIN.queue.find(i => i.type === 'Programme payment terms') || {}).id; go('a-queue', { id: qid });
    ok('CB8 Finance item: package panel, Approve payment terms and Request changes displayed', shown($1('main .cb8-q')) && shown($1('main .q-decide [data-a="approve"]')) && shown($1('main .q-decide [data-a="return"]')));
    ok('CB8 Finance item: no horizontal page overflow; no card overflow', appOver() <= 1 && !all('main .cb8-opt, main .cb8-pay').some(over), appOver());
    ok('CB8 Finance item: the exact submitted package is displayed (both payment options with amounts and totals)', shown($1('main .cb8-q .cb8-opt')) && /Submitted package/.test($1('main .cb8-q').textContent) && /6 × £400\.00/.test($1('main .cb8-q').textContent) && /4 × £600\.00/.test($1('main .cb8-q').textContent) && /Total £2,400\.00/.test($1('main .cb8-q').textContent));
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
    delete l3.cb8; // CB8 (PD-CB-49): E1's single-method plan step still applies to programmes created before CB8 (fixture); packages are checked above
    go('a-programmes', { id: l3.id, tab: 'plan' }); click($1('main input[name="pp-meth"][value="both"]'));
    ok('E1 Level 3 plan step: both fee options listed with mode, fee and how learners pay', all('main .e1-sum tbody tr').filter(shown).length === 2 && /Self-Paced/.test($1('main .e1-sum').textContent) && /£2,700\.00 in one payment, or 6 monthly/.test($1('main .e1-sum').textContent));
    ok('E1 Level 3 plan step: deposit policy stated; no page overflow', /28 days or more/.test($1('main .e1-plan').textContent) && appOver() <= 1, appOver());
    // E1-R: three fee options that don't all split evenly — the exact schedules, the deposit as an alternative route, readable at every width
    const l3r = ch8Create({ title: 'Level 3 UI rounding programme', level: 'Level 3', ref: 'QN 610/7272/3', dur: '12 months', durV: { n: 12, unit: 'months' }, desc: '', price: 800, support: 'Fully assisted', r1opts: [{ label: 'Self-Paced', fee: 800, mode: 'Self-Paced' }, { label: 'Fully Assisted', fee: 1000, mode: 'Fully Assisted' }, { label: 'Fully Assisted — plus', fee: 1500, mode: 'Fully Assisted' }] });
    delete l3r.cb8; // (pre-CB8 programme, as above)
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
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; r1AddOpt('NV-L3', { label: 'Self-Paced — rounded', fee: 1000, mode: 'Self-Paced' }, 'UI check', 'Added'); /* PD-M-11: accepted explicitly on the open Level 3 Diploma batches (they no longer take later options automatically) */ mFreezeAll(); ADMIN.batches.filter(b => w1L3(b) && r2Pid(b) === 'NV-L3' && !w1Closed(b)).forEach(b => mApply(b, b.w1opts.concat(r1Opts('NV-L3').filter(o => o.fee === 1000).map(o => o.id)), 'Accepted explicitly (UI check fixture, PD-M-11)')); const oR = r1Opts('NV-L3').find(o => o.fee === 1000);
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
    // CB1 (PD-CB-01) supersedes the tab bar in the N5a checks below: the Observations section with its configuration and legacy-library panels
    ok('N5a section (was a tab): Observations current, its configuration panel selected, published version read-only (no edit controls), "Create new version" displayed; no page overflow', !!$1('main .cb-sec.cur[data-tab="observations"]') && $1('main .cb-panels [data-tab="obs"]').getAttribute('aria-selected') === 'true' && shown($1('main .n5-head')) && !$1('main [data-act="n5Settings"]') && shown($1('main [data-act="newProgVersion"]')) && appOver() <= 1, appOver());
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
    click($1('main .cb-panels [data-tab="library"]'));
    ok('N5a review legacy panel (was a tab): "Shared library (legacy)" selected, guidance with "Open Observations" displayed, no library edit buttons; no page overflow', /Shared library \(legacy\)/.test($1('main .cb-panels [aria-selected="true"]').textContent) && shown($1('main .n5-legacy-note [data-tab="obs"]')) && !all('main [data-act="kLib"], main [data-act="kLibAttach"]').length && appOver() <= 1, appOver());
    click($1('main .n5-legacy-note [data-tab="obs"]')); ok('N5a review legacy panel: "Open Observations" opens the Observations configuration panel', $1('main .cb-panels [data-tab="obs"]').getAttribute('aria-selected') === 'true');
    go('a-programmes', { id: 'NV-N1', tab: 'obs' });
    ok('N5a new programme (was wizard step 3): seven sections with Observations current; the section shown; no page overflow', all('main .cb-nav .cb-sec').length === 7 && /Observations/.test($1('main .cb-sec.cur').textContent) && shown($1('main .n5-head')) && appOver() <= 1, appOver());
    // W0: an attached file is shown with the answer and with its submitted round (learner and Coordinator), without overflow
    closeModal(); initStore(); S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('assignment', { id: 'a3' });
    const a3 = STORE.worlds.C.assignments.find(x => x.id === 'a3'); // (W is the viewport width in this file)
    INP.attach({ files: [new File(['%PDF-1.4 UI check'], 'ui-check-evidence.pdf', { type: 'application/pdf' })], dataset: { key: 'a3.' + a3.qs[0].id + '.0' }, value: '' });
    ok('W0 answer box: the attached file is displayed by name; no page overflow', shown($1('main .rte ~ .row [data-act="w0AttOpen"]')) && /ui-check-evidence\.pdf/.test($1('main [data-act="w0AttOpen"]').textContent) && appOver() <= 1, appOver());
    click($1('main [data-act="w0AttOpen"]')); ok('W0 file dialog: file, added, question and integrity rows displayed; the dialog fits', /Integrity \(SHA-256\)/.test(($1('#modal-root') || {}).textContent || '') && !modalFits(), modalFits()); closeModal();
    finaliseSubmit(a3, false, now().toISOString()); closeModal(); go('assignment', { id: 'a3' });
    ok('W0 submitted answer: the file is displayed under its round; "No files attached" on the others; no page overflow', shown($1('main .w0-att [data-act="w0AttOpen"]')) && all('main .w0-att').filter(shown).some(x => /No files attached/.test(x.textContent)) && appOver() <= 1, appOver());
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-sub', { id: 'IA-L-18022~a3' });
    ok('W0 Coordinator submission page: the learner\'s file is displayed; no invented "Q1_attachment.pdf"; no page overflow', shown($1('main [data-act="w0AttOpen"]')) && !/Q\d_attachment\.pdf/.test(main()) && appOver() <= 1, appOver());
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-programmes', { id: 'NV-N1', tab: 'obs' });
    // W1: Create batch (Level 3) lists the fee options the batch accepts; the batch list shows the composition; no overflow
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches');
    // DM-P (PD-DM-16/17) supersedes W1's Create batch check on the seeded Level 3 (the Standard fee row and its mode field): it isn't eligible
    // DM-P (PD-DM-16): no seeded course has published, approved fee options by delivery mode, so Create batch lists none and says why; the dialog fits
    click($1('main [data-act="newBatch"]')); ok('DM-P Create batch (fresh demo): no course listed, with the reason; no mode dropdown; the dialog fits', !all('#modal-root #nb-co option').length && shown($1('#modal-root .cr-nb-elig')) && !shown($1('#modal-root #nb-dm')) && !modalFits(), modalFits()); closeModal();
    ok('W1 batch list: the Delivery mode column shows the composition (a seeded Level 3 batch "Fully Assisted"); no page overflow', all('main .w1-comp').some(x => shown(x) && /Fully Assisted/.test(x.textContent)) && appOver() <= 1, appOver());
    go('a-batches', { id: 'L3AC-NOV26' }); ok('W1 Level 3 batch detail: "Fee options accepted" with Change; no page overflow', shown($1('main .w1-acc')) && shown($1('main [data-act="w1Opts"]')) && appOver() <= 1, appOver());
    click($1('main [data-act="w1Opts"]')); ok('W1 fee options dialog: options grouped, each with a label; the dialog fits', all('#modal-root .w1-o').length >= 1 && all('#modal-root .w1-o').every(x => !!x.closest('label')) && !modalFits(), modalFits()); closeModal();
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-batches', { id: 'L3AC-NOV26' });
    ok('W1 Coordinator overview: fee options accepted and the description from the composition; no page overflow', shown($1('main .w1-acc')) && shown($1('main .w1-desc')) && appOver() <= 1, appOver());
    // M: delivery modes as checkboxes (Create batch, Change, Edit batch details), shown on the batch; Course Details' three code fields
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    [['Fully Assisted — standard', 2600, 'Fully Assisted'], ['Fully Assisted — agency rate', 2300, 'Fully Assisted'], ['Self-Paced — standard', 1800, 'Self-Paced']].forEach(([label, fee, mode]) => r1AddOpt('NV-L3', { label, fee, mode }, 'UI', 'Added'));
    go('a-batches'); click($1('main [data-act="newBatch"]')); const mco = $1('#modal-root #nb-co'); mco.value = 'Level 3 Diploma in Adult Care (England)'; mco.dispatchEvent(new Event('change', { bubbles: true }));
    ok('M Create batch: a checkbox per delivery mode (Self-Paced, Fully Assisted), each with its fee options, all labelled; the dialog fits', all('#modal-root .m-m').filter(shown).map(x => x.value).join() === 'Self-Paced,Fully Assisted' && all('#modal-root .m-m').every(x => x.type === 'checkbox' && x.checked) && all('#modal-root .m-opts .w1-nb-o').filter(shown).length === 3 /* DM-P (PD-DM-17): the Standard programme fee isn't offered to a new batch (was 4) */ && all('#modal-root .m-fs input').every(x => !!x.closest('label') && (x.getAttribute('aria-label') || '').trim()) && !modalFits(), modalFits());
    click($1('#modal-root .m-m[value="Self-Paced"]')); ok('M unticking Self-Paced (a click) unticks its option; the summary shows Fully Assisted', !$1('#modal-root .m-mode[data-m="Self-Paced"] .w1-nb-o').checked && /Accepts: Fully Assisted/.test($1('#modal-root .m-sum').textContent));
    click(all('#modal-root .m-mode[data-m="Fully Assisted"] .w1-nb-o')[1]); ok('M unticking one Fully Assisted option shows the mode as part-selected', $1('#modal-root .m-m[value="Fully Assisted"]').indeterminate && $1('#modal-root .m-m[value="Fully Assisted"]').checked); closeModal();
    go('a-batches', { id: 'L3AC-NOV26' }); // legacy batch: options added after it got its list aren't accepted (correction) — was /Self-Paced and Fully Assisted/
    ok('M batch detail: "Delivery modes accepted" displayed (a legacy batch: Fully Assisted only); no page overflow', shown($1('main .m-modes')) && /accepted: Fully Assisted$/.test($1('main .m-modes').textContent) && appOver() <= 1, appOver());
    ADMIN.batches.push({ code: 'UI-M-LEG', label: 'UI legacy batch', course: 'Level 3 Diploma in Adult Care (England)', start: D(50, '09:00'), end: D(400, '17:00'), cap: 10, enrolled: 0, mode: 'Online', dmode: 'Fully Assisted', coord: 'Dr Helen Carter', teachers: [], assessors: [], status: 'Open', wait: 0, roster: [] });
    go('a-batches', { id: 'UI-M-LEG' }); ok('M legacy batch with unknown history: the eligibility review notice and its action displayed; no page overflow', shown($1('main .m-review')) && shown($1('main .m-review [data-act="w1Opts"]')) && appOver() <= 1, appOver());
    go('a-batches', { id: 'L3AC-NOV26' });
    click($1('main [data-act="w1Opts"]')); ok('M Change dialog: the mode checkboxes with their options; held options locked; the dialog fits', all('#modal-root .m-m').filter(shown).length === 2 && all('#modal-root .w1-o').some(x => x.disabled) && !modalFits(), modalFits()); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'L3AC-NOV26-LEI' } }); ok('M Edit batch details: the mode checkboxes in the form; the dialog fits', shown($1('#modal-root #m-ed-fs')) && all('#modal-root .m-m').filter(shown).length === 2 && !modalFits(), modalFits()); closeModal();
    go('a-programmes', { id: 'NV-L3', tab: 'details' }); const mdl = ($1('main .cb-dl') || {}).textContent || '';
    ok('M Course Details: Awarding body and Awarding body course code shown as separate rows, in order (no course code, CR); no page overflow', /Awarding body[\s\S]*Awarding body course code/.test(mdl) && all('main .cb-dl dt').filter(d => /^(Course code|Awarding body|Awarding body course code)$/.test(d.textContent)).length === 2 /* CR (PD-CR-06): was 3 with Course code */ && appOver() <= 1, appOver());
    go('a-programmes', { id: 'new', tab: 'details' });
    ok('M new course form: the code fields displayed; no page overflow', !$1('main #np-code') && ['#np-q-body', '#np-r', '.r1-np-m' /* DM (PD-DM-01): was .cr-dm */].every(s => shown($1('main ' + s))) /* CR (PD-CR-06): no Academy course code */ && $1('main label[for="np-r"]').textContent === 'Awarding body course code' && appOver() <= 1, appOver());
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-programmes', { id: 'NV-N1', tab: 'obs' });
    // CB1: the unified course builder — seven sections reachable at every width, panels, read-only states, the unsaved-changes dialog
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-programmes'); click($1('main table tbody a[data-go="a-programmes"][data-id="NV-L3"]'));
    const secs = all('main .cb-nav .cb-sec'), navBox = $1('main .cb-nav ol');
    // CB1 final review: every section is discoverable without sideways scrolling, and the current one stands out
    const inView = el => { const r = el.getBoundingClientRect(); return shown(el) && r.left >= 0 && r.right <= window.innerWidth + 1 && r.width >= 60; };
    ok('CB1 builder: all seven sections displayed fully within the viewport, no sideways scrolling of the section bar; no page overflow', secs.length === 7 && secs.every(inView) && navBox.scrollWidth <= navBox.clientWidth + 1 && appOver() <= 1, secs.filter(s => !inView(s)).map(s => s.dataset.tab).join() + ' ' + navBox.scrollWidth + '/' + navBox.clientWidth);
    const curSec = $1('main .cb-sec.cur'), other = $1('main .cb-sec:not(.cur)');
    ok('CB1 builder: the current section is marked (aria-current) and looks different from the others (border and number colour)', !!curSec && curSec.getAttribute('aria-current') === 'page' && getComputedStyle(curSec).borderTopColor !== getComputedStyle(other).borderTopColor && getComputedStyle(curSec.querySelector('.cb-n')).backgroundColor !== getComputedStyle(other.querySelector('.cb-n')).backgroundColor && shown($1('main .cb-h')) && $1('main .cb-h').textContent.includes(curSec.querySelector('.cb-l').textContent));
    ok('CB1 builder: header title, status, version and "Version history" displayed', shown($1('main .page-h h1')) && shown($1('main .page-h [data-tab="versions"]')) && /Version 2/.test($1('main .page-h').textContent));
    const reach = ['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review'].map(k => { click($1(`main .cb-sec[data-tab="${k}"]`)); return !!$1(`main .cb-sec.cur[data-tab="${k}"]`) && shown($1('main .cb-h')) && shown($1('main .cb-foot')) && appOver() <= 1; });
    ok('CB1 builder: every section opens by clicking, with its heading and previous / next buttons, no page overflow', reach.every(Boolean), reach.join());
    click($1('main .cb-sec[data-tab="payments"]')); ok('CB1 Fees & Payments: three panels displayed (Fee options, Payment plan, Observation fee rate); no page overflow', all('main .cb-panels .tab').filter(shown).length === 3 && appOver() <= 1, appOver());
    click($1('main .cb-panels [data-tab="plan"]')); ok('CB1 Payment plan (read-only): the payment summary scrolls inside its box; no page overflow', shown($1('main .cb-plan .e1-sum')) && appOver() <= 1, appOver());
    click($1('main .page-h [data-tab="versions"]')); ok('CB1 Version history displayed with "Back to the course builder"; no page overflow', /Version 2 \(current\)/.test(main()) && shown($1('main .cb-sh .btn')) && appOver() <= 1, appOver());
    go('a-programmes', { id: 'NV-L3O' }); ok('CB1 retired programme: the read-only historical-record note displayed, no "Saving creates Version"; no write buttons; no page overflow', shown($1('main .cb-hist')) && !/Saving creates Version/.test($1('main .cb').textContent) && !$1('main .cb [data-act="chSupSave"], main .cb [data-act="newProgVersion"], main .cb [data-act="chLetterUp"]') && appOver() <= 1, appOver());
    // CB2 (PD-CB-16): Course Details now keeps typed values instead of asking; the prompt still protects other sections' forms — CB3
    // (PD-CB-22): the CH-8 checklist boxes are gone, so the observation fee rate is used
    setAdminIdentity('A'); S.portal = 'admin'; go('a-programmes', { id: 'NV-L3', tab: 'support' }); const nt = $1('main input[name="ch-sup"][value="Self-paced"]'); nt.checked = true; nt.dispatchEvent(new Event('change', { bubbles: true }));
    click($1('main .cb-sec[data-tab="review"]')); ok('CB1 unsaved changes: "Leave without saving?" dialog with both choices; the dialog fits', !!MODAL && MODAL.title === 'Leave without saving?' && all('#modal-root .modal button').filter(b => shown(b) && /Stay and save|Leave without saving/.test(b.textContent)).length === 2 && !modalFits(), modalFits());
    // CB2 (PD-CB-14) supersedes the CB1 dialog-label check: Course Details of an unsaved course, at every width
    closeModal(); CB_DIRTY = null; initStore(); setAdminIdentity('SY'); S.portal = 'admin'; S.signedIn = true; go('a-programmes'); click($1('main [data-act="chProgNew"]'));
    const ns = all('main .cb-nav .cb-sec');
    ok('CB2 new course: Course Details page (no dialog), all seven sections displayed within the viewport, sections 2–7 shown as not yet available; no page overflow', !MODAL && ns.length === 7 && ns.every(inView) && ns.filter(b => b.disabled).length === 6 && shown($1('main .cb-sec.cur')) && appOver() <= 1, appOver());
    ok('CB2 new course: the observation question displayed prominently with both answers and their explanations; every field labelled', shown($1('main .cb-obs')) && ['#np-obs-yes', '#np-obs-no'].every(s => shown($1('main ' + s)) && !!$1('main ' + s).closest('label')) && ['np-t', 'np-r', 'np-q-body', 'np-q-glh', 'np-q-tqt', 'np-q-credits', 'np-ds'].every(id => !!$1(`main label[for="${id}"]`)) && shown($1('main [data-act="cbDetCreate"]')));
    click($1('main [data-act="cbDetCreate"]')); ok('CB2 new course: "Save and continue" on an empty form shows the error next to the name; nothing created; no page overflow', shown($1('main .field .err')) && /Enter a title/.test(main()) && !(STORE.chNewProgs || []).some(p => !p.seed) && appOver() <= 1, appOver());
    const t2 = (s, v) => { const e = $1(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    t2('#np-t', 'Level 3 UI CB2 course'); t2('#np-r', 'QN 603/9191/3'); const r0 = $1('main .r1-np-row'); r0.querySelector('.r1-np-l').value = 'Self-Paced'; r0.querySelector('.r1-np-f').value = '1800'; r0.querySelector('.r1-np-m').value = 'Self-Paced'; /* DM (PD-DM-01): the modes come from this row (was a click on .cr-dm-c) */
    click($1('main #np-obs-yes')); click($1('main [data-act="cbDetCreate"]')); const cp = (STORE.chNewProgs || []).slice(-1)[0];
    ok('CB2 Save and continue: the Draft opens on Curriculum; no page overflow', !!cp && cp.title === 'Level 3 UI CB2 course' && !!$1('main .cb-sec.cur[data-tab="curriculum"]') && appOver() <= 1, appOver());
    click($1('main .cb-sec[data-tab="details"]')); ok('CB2 Draft Course Details: the form with the saved values and both save buttons; no page overflow', $1('#np-t').value === 'Level 3 UI CB2 course' && $1('#np-obs-yes').checked && shown($1('main [data-act="cbDetSave"][data-next]')) && appOver() <= 1, appOver());
    t2('#np-t', 'Level 3 UI CB2 course (edited)'); click($1('main .cb-sec[data-tab="review"]')); ok('CB2 unsaved Course Details: moving to another section asks nothing; Course Details marked "Unsaved"', !MODAL && shown($1('main .cb-sec[data-tab="details"] .cb-badge.warn')));
    click($1('main .cb-sec[data-tab="details"]')); click($1('main #np-obs-no')); click($1('main [data-act="cbDetSave"]:not([data-next])'));
    ok('CB2 answer No saved: Observations marked "Not applicable" in the section bar; the unsaved marker gone; no page overflow', /Not applicable/.test($1('main .cb-sec[data-tab="observations"]').textContent) && !$1('main .cb-unsaved') && appOver() <= 1, appOver());
    go('a-programmes', { id: 'NV-L3', tab: 'details' }); ok('CB2 seeded programme: the same Course Details layout, read-only, with the reason; no page overflow', shown($1('main .cb-dl')) && !$1('main #np-t') && shown($1('main .cb-ro-why')) && appOver() <= 1, appOver());
    // CB3: Offer Letter & Documents — the two areas, the letter's versions and signed copies, the checklist and its history, at every width
    setAdminIdentity('A'); S.portal = 'admin'; go('a-programmes', { id: 'NV-L3', tab: 'documents' });
    ok('CB3 Offer Letter & Documents: section named, both areas offered, the course-contract note and the template displayed; no page overflow', /Offer Letter & Documents/.test($1('main .cb-h').textContent) && all('main .cb-panels .tab').filter(shown).length === 2 && shown($1('main .cb-contract-note')) && shown($1('main .ch-letter')) && appOver() <= 1, appOver());
    // CB3 correction (PD-CB-25): the seeded signature (Aisha) has no saved copy, so it offers "View historical template", never "View signed copy"
    ok('CB3 offer letter: version history and "Who received and signed each version" displayed, the seeded signature marked template-only; no page overflow', shown($1('main .cb-signed')) && shown($1('main .cb-signed [data-act="cbHistTemplate"]')) && !$1('main .cb-signed tr[data-k="C"] [data-act="chSignedPdf"]') && appOver() <= 1, appOver());
    click($1('main .cb-signed [data-act="cbHistTemplate"]')); ok('CB3 historical template dialog: says it is not the signed copy; the dialog fits the viewport', !!MODAL && /not the learner's signed copy/.test($1('#modal-root').textContent) && !modalFits(), modalFits()); closeModal();
    click($1('main .cb-panels [data-tab="docs"]')); ok('CB3 Required enrolment documents: the checklist and its version history displayed; no page overflow', shown($1('main .s4-ck')) && shown($1('main .cb-ckhist')) && appOver() <= 1, appOver());
    click($1('main .cb-ckhist [data-act="cbCkView"]')); ok('CB3 a checklist version opens read-only; the dialog fits', !!MODAL && /Required enrolment documents — version/.test(MODAL.title) && !modalFits(), modalFits()); closeModal();
    // CB4: Curriculum — one editor: published read-only, a Draft with a long unit title and criterion, Add / Edit dialogs, at every width
    setAdminIdentity('A'); S.portal = 'admin'; go('a-programmes', { id: 'NV-L3', tab: 'structure' });
    ok('CB4 Curriculum (published Level 3): the hierarchy, the read-only banner and the summary displayed; no page overflow', shown($1('main .cb-cur-tree')) && shown($1('main .cb-cur-where')) && shown($1('main .cb-cur-sum')) && !$1('main .cb-cur [data-act="cbCurEdit"]') && appOver() <= 1, appOver());
    click($1('main .cb-cur [data-act="cbCurAll"][data-o="1"]')); ok('CB4 Expand all: every unit open, Learning Outcomes and criteria displayed; no page overflow', all('main .cb-cur-tree > details').every(d => d.open) && all('main .cb-cur-c').filter(shown).length > 20 && appOver() <= 1, appOver());
    ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'unit' } }); document.querySelector('#nd-c').value = 'U399'; document.querySelector('#nd-t').value = 'Leading and developing person-centred, strengths-based practice across multi-agency community health and social care partnerships'; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); closeModal();
    ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'mod', u: 'U399' } }); document.querySelector('#nd-t').value = 'Partnership working'; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); closeModal();
    ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'lo', u: 'U399', m: 'M1' } }); document.querySelector('#nd-t').value = 'Understand how to coordinate care with partner organisations and families'; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); closeModal();
    go('a-programmes', { id: 'NV-L3D', tab: 'structure' }); click($1('main .cb-cur [data-act="cbCurAll"][data-o="1"]'));
    const lu = $1('main .cb-cur-tree > details[data-cbu="U399"] > summary');
    ok('CB4 Draft (NV-L3D): edit controls displayed; a very long unit title wraps inside its row; no page overflow', shown($1('main .cb-cur [data-act="nodeAdd"][data-lvl="unit"]')) && shown($1('main .cb-cur [data-act="cbCurEdit"]')) && !!lu && lu.scrollWidth <= lu.clientWidth + 2 && appOver() <= 1, appOver());
    ok('CB4 Draft: every type list and action button inside the viewport', all('main .cb-cur select, main .cb-cur .cb-acts button').filter(shown).every(e => e.getBoundingClientRect().right <= W + 1));
    click($1('main .cb-cur-tree > details[data-cbu="U399"] [data-act="nodeAdd"][data-lvl="crit"]')); ok('CB4 Add criterion dialog: names the unit, module and Learning Outcome; the dialog fits', !!MODAL && /U399/.test($1('#modal-root .cb-ctx').textContent) && /Partnership working/.test($1('#modal-root .cb-ctx').textContent) && !modalFits(), modalFits()); closeModal();
    click($1('main .cb-cur-tree > details[data-cbu="U399"] [data-act="cbCurEdit"]')); ok('CB4 Edit dialog: code read-only, title editable; the dialog fits', !!MODAL && !!$1('#modal-root #ce-t') && !modalFits(), modalFits()); closeModal();
    setAdminIdentity('SY'); go('a-programmes', { id: 'NV-N1', tab: 'structure' }); ok('CB4 new programme (NV-N1): the same editor with its type lists; no page overflow', shown($1('main .cb-cur-tree')) && all('main .cb-cur [data-onchange="ch8LoType"]').filter(shown).length >= 2 && appOver() <= 1, appOver());
    // CB5: Assessments — list, an assignment open in place, the question dialog, the learner's form with References
    setAdminIdentity('A'); S.portal = 'admin'; go('a-programmes', { id: 'NV-L3', tab: 'assessments' });
    ok('CB5 Assessments: the assignment list and New assignment displayed; no page overflow', shown($1('main .cb-assess')) && shown($1('main [data-act="cbAsgNew"]')) && appOver() <= 1, appOver());
    click($1('main [data-act="cbAsgNew"]')); ok('CB5 New assignment dialog fits', !!MODAL && !modalFits(), modalFits()); closeModal();
    click($1('main .cb-assess [data-act="cbAsgOpen"][data-id="a8"]')); click($1('main .cb-asg-tabs [data-t="questions"]'));
    ok('CB5 an assignment open in place (Questions): tabs, questions and settings displayed; no page overflow', shown($1('main .cb-asg-ed')) && all('main .cb-asg-tabs .tab').filter(shown).length === 3 && appOver() <= 1, appOver());
    click($1('main .cb-asg-ed [data-act="s2QAdd"]')); ok('CB5 question dialog with evidence and attachment settings fits', !!MODAL && !!$1('#modal-root #aq-ev') && !modalFits(), modalFits()); closeModal();
    click($1('main .cb-asg-tabs [data-t="mapping"]')); ok('CB5 criteria mapping in place: no page overflow', appOver() <= 1, appOver());
    go('a-programmes', { id: 'NV-L3', tab: 'keys' }); ok('CB5 Answer keys: history table displayed; no page overflow', shown($1('main .cb-keys')) && appOver() <= 1, appOver());
    // CB6: Observation events — locations, events list, the event dialog, at every width
    setAdminIdentity('A'); S.portal = 'admin'; ACT.n5Settings({ dataset: { p: 'NV-L3D' } }); ['n5-req:yes', 'n5-wp:Permitted', 'n5-off:Available'].forEach(x => { const [n, v] = x.split(':'), r = document.querySelector(`#modal-root input[name="${n}"][value="${v}"]`); if (r) r.checked = true; }); MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    go('a-programmes', { id: 'NV-L3D', tab: 'events' }); click($1('main [data-act="cbObsEv"][data-e=""]'));
    ok('CB6 Add observation event dialog fits', !!MODAL && !!$1('#modal-root #ev-n') && !modalFits(), modalFits());
    document.querySelectorAll('#modal-root .ev-c').forEach(c => { c.checked = true; }); document.querySelectorAll('#modal-root .ev-l[value="workplace"]').forEach(c => { c.checked = true; }); MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    ok('CB6 Observation events: locations card and the events table displayed; no page overflow', shown($1('main .cb-locs')) && shown($1('main .cb-ev tbody tr')) && appOver() <= 1, appOver());
    // CB8: a Level 3 package with three fee options, observation fees and several payment options — cards, not a cramped table, at every width
    acaEnter('KA'); S.signedIn = true; S.portal = 'admin';
    const p8 = ch8Create({ title: 'Level 3 UI package programme', level: 'Level 3', ref: 'QN 610/7373/3', dur: '6 months', durV: { n: 6, unit: 'months' }, desc: '', price: 1800, support: 'Fully assisted', r1opts: [{ label: 'Fully Assisted — standard', fee: 2400, mode: 'Fully Assisted' }, { label: 'Self-Paced — standard', fee: 1800, mode: 'Self-Paced' }, { label: 'Self-Paced — employer funded with a long name', fee: 1999.99, mode: 'Self-Paced' }] });
    ACT.n5Settings({ dataset: { p: p8.id } }); ['n5-req:yes', 'n5-wp:Permitted', 'n5-off:Available'].forEach(x => { const [n, v] = x.split(':'), r = document.querySelector(`#modal-root input[name="${n}"][value="${v}"]`); if (r) r.checked = true; }); MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    cb8Work(p8).opts.forEach(o => { ACT.cb8Opt({ dataset: { p: p8.id, o: o.id } }); $1('#modal-root #c8-wp').value = '70'; $1('#modal-root #c8-off').value = '0'; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal(); [1, 4, 7, 24].forEach(k => ACT.cb8PayAdd({ dataset: { p: p8.id, o: o.id, k: String(k) } })); });
    go('a-programmes', { id: p8.id, tab: 'fees' }); const ov = el => !!el && el.scrollWidth - el.clientWidth > 1, cards = all('main .cb8-opt').filter(shown);
    ok('CB8 Level 3 package: one card per fee option (3), each with its fees and 5 payment options; no table', cards.length === 3 && all('main .cb8-pay').filter(shown).length === 15 && !$1('main .cb8-opts table'));
    ok('CB8 no card, fee box or payment row overflows; no page overflow', !all('main .cb8-opt, main .cb8-fees > div, main .cb8-pay').some(ov) && appOver() <= 1, appOver());
    const cw = $1('main .cb8-opts').clientWidth, two = cw >= 2 * 420 + 12; // two cards fit side by side only from 852 px of content width
    ok(two ? 'CB8 wide content area: cards side by side' : 'CB8 narrow content area (phone, tablet, desktop with the side menu): the cards stack in one full-width column', two ? cards[1].getBoundingClientRect().top === cards[0].getBoundingClientRect().top : cards.every(c => Math.abs(c.getBoundingClientRect().left - cards[0].getBoundingClientRect().left) < 2 && c.getBoundingClientRect().width >= cw - 2), `${cw}px: ` + cards.map(c => Math.round(c.getBoundingClientRect().left)).join(','));
    click($1('main .cb8-pay[data-k="24"] .cb8-ex summary')); ok('CB8 24 dated payments open inside the card without overflow', shown($1('main .cb8-pay[data-k="24"] .cb8-dates')) && !ov($1('main .cb8-pay[data-k="24"]')) && appOver() <= 1, appOver());
    click($1('main [data-act="cb8Opt"][data-o=""]')); ok('CB8 Add fee option dialog (name, mode, fee, both observation fees) fits', !!MODAL && !!$1('#modal-root #c8-wp') && !!$1('#modal-root #c8-off') && !modalFits(), modalFits()); closeModal();
    go('a-programmes', { id: p8.id, tab: 'payhist' }); ok('CB8 Financial versions: displayed; no page overflow', shown($1('main .cb8-hist')) && appOver() <= 1, appOver());
    setAdminIdentity('A'); S.portal = 'admin'; ACT.cb8SaApprove({ dataset: { p: p8.id } }); $1('#rsn').value = 'UI check'; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    go('a-programmes', { id: p8.id, tab: 'letter' }); ok('CB8 Offer letter: the payment wording card is displayed; no page overflow', shown($1('main .cb8-lt')) && appOver() <= 1, appOver());
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('f-plans', { tab: 'templates' }); click($1(`main [data-act="cb8ViewPkg"][data-p="${p8.id}"]`)); ok('CB8 Finance "View package" dialog fits', !!MODAL && !!$1('#modal-root .cb8-opt') && !modalFits(), modalFits()); closeModal();
    // CB9: the learner's payment choice with the dated schedule, and Finance's agreed schedule, at every width
    {
      const f9 = o => Object.entries(o).forEach(([k, v]) => { $1(k).value = v; }), pr9 = () => MODAL && MODAL.actions.find(a => /primary|danger/.test(a.cls || '')), ok9 = () => { const a = pr9(); return a && a.fn ? a.fn() : undefined; };
      setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
      const p9 = ch8Create({ title: 'Level 4 UI schedule programme', level: 'Level 4', ref: 'QN 610/7474/4', dur: '6 months', durV: { n: 6, unit: 'months' }, desc: '', price: 2400, support: 'Fully assisted', r1opts: [{ label: 'Fully Assisted', fee: 2400, mode: 'Fully Assisted' }] /* DM-P (PD-DM-15): a publishable course has a fee option with a delivery mode */ }), id = p9.id;
      ACT.n5Settings({ dataset: { p: id } }); const rq = $1('#modal-root input[name="n5-req"][value="no"]'); if (rq) rq.checked = true; ok9(); closeModal();
      ACT.ch8AddUnit({ dataset: { id } }); f9({ '#u-c': 'U940', '#u-t': 'Practice' }); ok9(); ACT.ch8AddMod({ dataset: { id, u: 0 } }); f9({ '#m-t': 'Core', '#m-ab': 'C/650/9401' }); ok9(); ACT.ch8AddLo({ dataset: { id, u: 0, m: 0 } }); f9({ '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); ok9(); ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 0 } }); f9({ '#c-d': 'Describe practice', '#c-e': 'Written account' }); ok9(); closeModal();
      ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); $1('#rsn').value = 'First version'; ok9(); closeModal();
      const o9 = cb8Work(p9).opts[0].id; [1, 4].forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: o9, k: String(k) } })); ACT.cb8SaApprove({ dataset: { p: id } }); $1('#rsn').value = 'UI'; ok9(); closeModal();
      ACT.ch8Publish({ dataset: { id } }); $1('#rsn').value = 'Ready'; ok9(); closeModal();
      ADMIN.batches.push({ code: 'UI9-NOV26', label: 'UI schedule batch', course: p9.title, start: D(40, '09:00'), end: D(240, '17:00'), cap: 20, enrolled: 0, mode: 'Online', coord: '', teachers: [], assessors: [], status: 'Open', wait: [], roster: [] });
      S.variant = 'F'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const c9 = CATALOGUE.find(x => x.kind === 'nvq' && x.title === p9.title); ACT.applyNvq({ dataset: { id: c9 && c9.id } }); const t9 = MODAL ? MODAL.title + ' | ' + (MODAL.actions || []).map(a => a.label).join(',') : 'no dialog'; ok9(); closeModal();
      const w9 = STORE.worlds.F; // (W here is the viewport width)
      ok('CB9 (setup) the learner sign-up started with the approved choices fixed', !!(w9.signup && w9.signup.plan && w9.signup.plan.cb8), t9);
      const b9 = chBatch('UI9-NOV26'); chSetBatch(w9, b9); ACT.suNext(); w9.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w9.me.first + ' ' + w9.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w9, b9); setUi('cb9Pay', '6'); go('admission');
      ok('CB9 payment step: the approved options (deposit, in full, 4, 6) and the chosen schedule displayed', all('main input[name="cb9-pay"]').filter(shown).length === 4 && shown($1('main .cb9-sched')) && all('main .cb9-sched tbody tr').length === 6);
      ok('CB9 payment step: "Collected now" on payment 1; no table, option or page overflow', /Collected now/.test($1('main .cb9-sched').textContent) && !all('main .cb9-sched .tbl-wrap, main .cb9-opt').some(e => e.scrollWidth - e.clientWidth > 1) && appOver() <= 1, appOver());
      click($1('main input[name="cb9-pay"][value="4"]')); ok('CB9 choosing another option shows its schedule (4 payments)', all('main .cb9-sched tbody tr').length === 4 && appOver() <= 1, appOver());
      const _co = checkout; let g9 = null; checkout = o => { g9 = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g9) g9.onSuccess(g9.amount, 'TXN-UI9'); closeModal();
      go('payments'); ok('CB9 learner Payments: the schedule note and row labels displayed; no page overflow', shown($1('main .cb9-note')) && /paid early at checkout/.test(main()) && appOver() <= 1, appOver());
      setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; setUi('fpL', 'F'); go('f-plans'); ok('CB9 Finance → Learner schedules: the agreed schedule card displayed; no page overflow', shown($1('main .cb9-fin')) && appOver() <= 1, appOver());
      click($1('main [data-act="cb10Advance"][data-d="30"]')); click($1('main [data-act="cb10Advance"][data-d="30"]')); click($1('main [data-act="cb10Advance"][data-d="30"]'));
      ok('CB10 Payment reminders (simulated): the card, its controls and the log displayed; no page overflow', shown($1('main .cb10')) && /Simulated/.test($1('main .cb10').textContent) && all('main .cb10-ctl .btn').filter(shown).length >= 4 && shown($1('main .cb10-log')) && appOver() <= 1, appOver());
      // CB11: Review & Publish — blockers with their links (NV-N1), and the published programme's summary
      setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-programmes', { id: 'NV-N1', tab: 'review' });
      ok('CB11 Review & Publish: blockers grouped with "Fix in Section N" links, six section summaries and a disabled Publish; nothing overflows', shown($1('main .cb-rv-todo')) && all('main .cb-rv-fix').filter(shown).length >= 2 && all('main .cb-rv-sec').filter(shown).length === 6 && $1('main [data-act="cbPublish"]').disabled && !all('main .cb-rv-it, main .cb-rv-sec').some(e => e.scrollWidth - e.clientWidth > 1) && appOver() <= 1, appOver());
      go('a-programmes', { id: 'NV-L3D', tab: 'details' }); ok('CB12 the version bar: state and "Review & Publish" displayed, no overflow', shown($1('main .cb-vb')) && shown($1('main .cb-vb [data-tab="review"]')) && appOver() <= 1, appOver());
      go('a-programmes', { id: 'NV-N1', tab: 'payments' }); ok('CB12 Fees & Payments: the "home" line displayed; one Deposit heading at most; no overflow', shown($1('main .cb-home')) && all('main .cb-body h3').filter(h => /^Deposit/.test(h.textContent)).length <= 1 && appOver() <= 1, appOver());
      setAdminIdentity('A'); S.portal = 'admin'; go('a-programmes', { id: p9.id, tab: 'fees' }); ok('CB12-F approved terms: the approved state shown, no "Submit to Finance"; no overflow', shown($1('main .cb8-approved')) && !$1('main [data-act="cb8Submit"]') && appOver() <= 1, appOver());
      go('a-programmes', { id: p9.id, tab: 'review' }); ok('CB11 a published programme: summary with the approved fee options, "Create new version"; no overflow', shown($1('main .cb-rv-sec[data-sec="payments"]')) && shown($1('main [data-act="s3WizVersion"]')) && appOver() <= 1, appOver());
    }
    // MC: several Academic Coordinators — the Create batch step, the Coordinators panel, the Coordinator's roster and the learner's people
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    ['UI Coord A', 'UI Coord B'].forEach((n, k) => { ADMIN.staff.push({ id: 'ST-UI' + k, name: n, email: `ui.coord${k}@illumin-academy.example`, roles: ['Academic Coordinator'], status: 'Active' }); COO_USERS['U' + k] = { key: 'U' + k, name: n, first: 'UI', email: `ui.coord${k}@illumin-academy.example`, roles: ['Academic Coordinator'] }; });
    M_MODES.forEach(m => { if (!crApprOpts('NV-L2').some(o => o.mode === m)) r1AddOpt('NV-L2', { label: m, fee: 1800, mode: m }, 'Fixture (DM-P)', 'Added'); }); /* DM-P (PD-DM-16): Finance's fee-option card gives the seeded Level 2 approved options by delivery mode, so it takes new batches */ go('a-batches'); click($1('main [data-act="newBatch"]')); $1('#modal-root #nb-c').value = 'UI-MC'; click($1('#modal-root .modal-f .btn-primary'));
    ok('MC Create batch step 2: "More Academic Coordinators" checkboxes displayed, each labelled; the dialog fits', all('#modal-root .mc-nb-c').filter(shown).length >= 4 && all('#modal-root .mc-nb-c').every(x => x.closest('label') && x.closest('label').textContent.trim()) && !modalFits(), modalFits()); closeModal();
    const mb = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'); mcAddCoord(mb, 'UI Coord A', 'UI'); mcReassign(mb, mcLids(mb)[1], 'UI Coord A', 'UI'); mcReassign(mb, mcLids(mb)[2], 'UI Coord A', 'UI');
    go('a-batches', { id: 'L3AC-JAN26', tab: 'staff' });
    ok('MC Batch → Staff: the Academic Coordinators panel with Add, Remove and Reassign displayed; no page overflow', shown($1('main .mc-panel')) && shown($1('main [data-act="mcAdd"]')) && shown($1('main [data-act="mcRemove"]')) && shown($1('main [data-act="mcMove"]')) && appOver() <= 1, appOver());
    go('a-batches', { id: 'L3AC-JAN26' }); ok('MC admin roster: the member-count note and a label on every row (Batch member / Demonstration only) displayed; no page overflow', shown($1('main .mc-rnote')) && all('main .mc-roster > li.mc-r').every(li => li.classList.contains('mc-r-c') || shown(li.querySelector('.chip'))) && all('main .mc-roster .mc-r-m').length === mcLids(mb).length && appOver() <= 1, appOver());
    go('a-batches', { id: 'L3AC-JAN26', tab: 'staff' });
    click($1('main [data-act="mcRemove"]')); ok('MC Remove dialog: where the learners go and the reason displayed; the dialog fits', shown($1('#modal-root #mc-rm-to')) && shown($1('#modal-root #rsn')) && !modalFits(), modalFits()); closeModal();
    click($1('main [data-act="mcMove"]')); ok('MC Reassign dialog: new Coordinator and reason displayed; the dialog fits', shown($1('#modal-root #mc-mv')) && !modalFits(), modalFits()); closeModal();
    S.coo.v = 'U0'; cooEnter(); S.signedIn = true; go('c-batches', { id: 'L3AC-JAN26', tab: 'roster' });
    ok('MC Coordinator roster: My learners / All batch learners and "2 of n" displayed; "My learner" tags; no page overflow', shown($1('main .mc-scope')) && /2 of \d+ learners are allocated to you/.test($1('main .mc-count').textContent) && all('main .mc-tag .chip').filter(shown).length === 2 && appOver() <= 1, appOver());
    ok('MC Coordinator roster: the same member-count note as the admin roster displayed', shown($1('main .mc-rnote')) && new RegExp(mcLids(mb).length + ' identified batch members').test($1('main .mc-rnote').textContent));
    click($1('main [data-act="mcScope"][data-k="mine"]')); ok('MC My learners (a click): only the two allocated learners listed', all('main .mc-tag').filter(shown).length === 2);
    go('c-learner', { id: mcLids(mb)[5] }); ok('MC another Coordinator\'s learner: "Contact details" withheld note and the admission status displayed; no overflow', shown($1('main .mc-nocontact')) && shown($1('main .mc-adm')) && appOver() <= 1, appOver());
    go('c-dashboard'); ok('MC Coordinator dashboard: My caseload card displayed; no overflow', shown($1('main .mc-caseload')) && appOver() <= 1, appOver());
    S.portal = 'admin'; setAdminIdentity('A'); mcReassign(mb, STORE.worlds.C.me.id, 'UI Coord A', 'UI');
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('course', { id: STORE.worlds.C.nvq.id });
    const ppl = all('main section.card').find(x => /Your people/.test(x.textContent));
    ok('MC learner "Your people": their own Coordinator with an email link; no other Coordinator; no overflow', !!ppl && /UI Coord A/.test(ppl.textContent) && shown(ppl.querySelector('.mc-contact')) && !/Helen Carter/.test(ppl.textContent) && appOver() <= 1, appOver());
    // MC demo: Demo controls → load the 10-Coordinator batch; the wizard with ten ticked; the Coordinator roster; a learner's contacts
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches');
    S.demoOpen = true; renderDemo(); ok('MC demo: the Multi-Coordinator demo section in Demo controls displayed', shown($1('#demo-root .mc-demo')) && shown($1('#demo-root [data-act="mcDemoLoad"]')));
    click($1('#demo-root [data-act="mcDemoLoad"]')); S.demoOpen = false; renderDemo();
    M_MODES.forEach(m => { if (!crApprOpts('NV-L2').some(o => o.mode === m)) r1AddOpt('NV-L2', { label: m, fee: 1800, mode: m }, 'Fixture (DM-P)', 'Added'); }); /* DM-P (PD-DM-16): Finance's fee-option card gives the seeded Level 2 approved options by delivery mode, so it takes new batches */ click($1('main [data-act="newBatch"]')); $1('#modal-root #nb-c').value = 'UI-MC10'; click($1('#modal-root .modal-f .btn-primary'));
    MCD_COORDS.forEach(c => click(all('#modal-root .mc-nb-c').find(i => i.value === c.name)));
    ok('MC demo wizard: ten Coordinators ticked, "10 Academic Coordinators selected" displayed; the dialog fits', /10 Academic Coordinators selected/.test(($1('#modal-root .mc-nb-n') || {}).textContent || '') && shown($1('#modal-root .mc-nb-n')) && !modalFits(), modalFits()); closeModal();
    // CD (PD-CD-01…05): the demo presets in Demo controls; after "Load clean client demo", Create batch offers its programme with both modes
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches');
    // FX (PD-FX-04) supersedes "the presets (client demo [Load clean client demo button], 101-learner demo, Reset)": the client demo is the
    // default dataset; Demo data offers Reset demo, the 101-learner demo and the legacy test data (labelled internal)
    S.demoOpen = true; renderDemo(); ok('CD Demo controls: Demo data (Reset demo, 101-learner demo, legacy test data — no "Load clean client demo") and the demo-only note displayed', shown($1('#demo-root .cd-demo')) && !$1('#demo-root [data-act="cdLoad"]') && shown($1('#demo-root .cd-demo [data-act="resetDemo"]')) && shown($1('#demo-root .cd-demo [data-act="mcDemoLoad"]')) && shown($1('#demo-root .cd-demo [data-act="fxLegacy"]')) && shown($1('#demo-root .cd-note')));
    S.demoOpen = false; renderDemo(); ACT.cdLoad(); S.demoOpen = false; renderDemo(); // (the client demo dataset, as a fresh start loads it)
    ok('CD client demo loaded: its batch page displayed; no page overflow', /DEMO-L3-JAN27/.test(main()) && appOver() <= 1, appOver());
    go('a-batches'); click($1('main [data-act="newBatch"]')); const cdco = $1('#modal-root #nb-co');
    ok('CD Create batch: the client-demo programme, both mode checkboxes; the dialog fits', !!cdco && cdco.value === CD_T && all('#modal-root .m-m').filter(shown).length === 2 && !modalFits(), modalFits());
    // FX: the client demo dataset at this width — Create batch with both modes ticked, Review & create, the lists and Demo data
    all('#modal-root .m-m').forEach(x => { if (x.checked) click(x); }); all('#modal-root .m-m').forEach(x => click(x));
    ok('FX Create batch: both delivery-mode checkboxes ticked together, no legacy mode select displayed; the dialog fits', all('#modal-root .m-m').filter(x => shown(x) && x.checked).length === 2 && !shown($1('#modal-root #nb-dm')) && !modalFits(), modalFits());
    $1('#modal-root #nb-c').value = 'UI-FX-' + W; click($1('#modal-root .modal-f .btn-primary'));
    all('#modal-root input[type="checkbox"]').filter(x => /Dr Helen Carter/.test((x.closest('label') || {}).textContent || '')).forEach(x => { if (!x.checked) click(x); });
    for (let g = 0; g < 5 && MODAL && !/step 5 of 5/.test(MODAL.title); g++) click($1('#modal-root .modal-f .btn-primary'));
    ok('FX Review & create: both modes listed; the dialog fits', /step 5 of 5/.test((MODAL || {}).title || '') && /Delivery modes accepted ?Self-Paced and Fully Assisted/.test($1('#modal-root').textContent.replace(/\s+/g, ' ')) && !modalFits(), modalFits()); closeModal();
    ['a-programmes', 'a-batches', 'a-learners', 'a-dashboard'].forEach(r => { go(r); ok(`FX ${r}: the client demo's records only; no page overflow`, !/Aisha Rahman|L3AC-JAN26|Level 2 Diploma in Care/.test(main()) && appOver() <= 1, appOver()); });
    S.demoOpen = true; renderDemo(); ok('FX Demo data: the panel fits (no overflow) with the legacy loader labelled internal', shown($1('#demo-root [data-act="fxLegacy"]')) && /not client data/.test($1('#demo-root [data-act="fxLegacy"]').textContent) && appOver() <= 1); S.demoOpen = false; renderDemo();
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    // CD learner views (PD-CD-06…09): a demo learner's portal at its pending sign-up; a Coordinator's roster; the dashboard's demonstration note
    ACT.cdLearner({ dataset: { k: 'CD3' } }); go('admission'); ok('CD demo learner (Fully Assisted): Admission shows the batch and the delivery mode; no page overflow', /Your delivery mode: Fully Assisted/.test(main()) && appOver() <= 1, appOver());
    go('assignments'); ok('CD demo learner: assignments wait for the sign-up (the normal gate); no page overflow', /Finish your sign-up/.test(main()) && appOver() <= 1, appOver());
    ACT.cdCoord({ dataset: { k: 'B' } }); ok('CD Coordinator roster (Michael Osei): his demo learners; no page overflow', /Ben Holloway \(demo\)/.test(main()) && !/Amira Shah/.test(main()) && appOver() <= 1, appOver());
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-dashboard'); ok('CD admin dashboard: the demonstration-figures note under the figures', shown($1('main .cd-dash-note')));
    // CD guided sign-up (PD-CD-10…13): the guide in Demo controls; the simulated checkout label; the enrolled learner's course and payments
    S.demoOpen = true; renderDemo(); ok('CD Demo controls: the guided sign-up steps displayed', all('#demo-root [data-act="cdGuide"]').filter(shown).length === 10); S.demoOpen = false; renderDemo();
    { ACT.cdGuide({ dataset: { k: 'CD4', s: 'signup' } }); const w = STORE.worlds.CD4; $1('#su-dob').value = '1990-05-04'; $1('#su-ad').value = '1 Demo Street'; ACT.suNext(); w.docs.filter(x => x.mand).forEach(d => { d.status = 'Submitted'; d.file = 'scan_demo.pdf'; });
      ok('CD guided sign-up: the documents step displayed; no page overflow', /2\. Documents/.test(main()) && appOver() <= 1, appOver());
      ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); setUi('suMethod', 'card'); render(); ACT.suPay();
      ok('CD simulated checkout: labelled; the dialog fits', shown($1('#modal-root .cd-sim')) && !modalFits(), modalFits()); closeModal(); }
    S.demoOpen = true; renderDemo(); click($1('#demo-root [data-act="mcDemoOpen"][data-t="coord"][data-k="1"]')); S.demoOpen = false; renderDemo();
    ok('MC demo Coordinator 1 roster: Total batch learners 101 and My learners 11 figures, My learners selected, 11 tags; no page overflow', /Total batch learners\s*101/.test($1('main .mc-kpis').textContent) && /My learners\s*11/.test($1('main .mc-kpis').textContent) && $1('main [data-act="mcScope"][data-k="mine"]').getAttribute('aria-selected') === 'true' && all('main .mc-tag .chip').filter(shown).length === 11 && appOver() <= 1, appOver());
    click($1('main [data-act="mcScope"][data-k="all"]')); ok('MC demo All batch learners: "of 101" pager and tags; no page overflow', /of 101/.test(main()) && all('main .mc-tag').filter(shown).length > 0 && appOver() <= 1, appOver());
    S.demoOpen = true; renderDemo(); click($1('#demo-root [data-act="mcDemoOpen"][data-t="learner"][data-k="10"]')); S.demoOpen = false; renderDemo();
    const dppl = all('main section.card').find(x => /Your people/.test(x.textContent));
    ok('MC demo learner of Coordinator 10: "Your people" shows Julia Moretti (demo) with her email link, no other demo Coordinator; no overflow', !!dppl && /Julia Moretti \(demo\)/.test(dppl.textContent) && shown(dppl.querySelector('.mc-contact')) && !MCD_COORDS.slice(0, 9).some(c => dppl.textContent.includes(c.name)) && appOver() <= 1, appOver());
    closeModal(); initStore();
    // CR: delivery modes offered, no course / unit code, Create and Edit batch (awarding body batch code), batch deadlines, publish dialog
    closeModal(); initStore(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-programmes'); click($1('main [data-act="chProgNew"]'));
    // DM (PD-DM-01, supersedes the CR checks of the "Delivery modes offered" field and "Configure delivery modes"): modes come from the fee options
    ok('DM Course Details (Level 3): no separate modes field; fee options with a delivery mode each; no course code field; no page overflow', !$1('main .cr-dm') && shown($1('main .r1-np-m')) && !$1('main #np-code') && appOver() <= 1, appOver());
    const dmLv = $1('main #np-l'); dmLv.value = 'Level 2'; INP.r1NpLevel(dmLv); ok('DM Course Details (Level 2): "How is this course priced?" with two labelled choices; no page overflow', shown($1('main .cr-pm')) && all('main input[name="cr-pm"]').filter(shown).length === 2 && all('main input[name="cr-pm"]').every(x => x.closest('label')) && appOver() <= 1, appOver());
    click($1('main #cr-pm-opts')); ok('DM Course Details (Level 2): fee options by delivery mode shows the option rows, hides the price; no page overflow', shown($1('main .r1-np-row')) && !shown($1('main #np-p')) && appOver() <= 1, appOver());
    go('a-programmes', { id: 'NV-L2', tab: 'details' }); ok('DM read-only Course Details (one-price legacy course): the modes offered (derived) and the way to Section 5; no "Configure delivery modes"; no page overflow', shown($1('main .cr-dm-ro')) && (shown($1('main .cb-feelink')) || shown($1('main .cr-dm-ro [data-go]'))) && !$1('main [data-act="crDmEdit"]') && appOver() <= 1, appOver());
    // a value recorded under CR's former setting (PD-DM-05: still honoured for a course without fee options) — seeded as CR stored it
    const crLeg = ms => { STORE.crDm = STORE.crDm || {}; STORE.crDm['NV-L2'] = { modes: ms, at: now().toISOString(), by: 'Rachel Hughes', hist: [[now().toISOString(), 'Rachel Hughes', 'Not configured', ms.join(' and '), 'UI']] }; };
    crLeg(['Fully Assisted']);
    go('a-programmes', { id: 'NV-N1', tab: 'structure' }); ACT.ch8AddUnit({ dataset: { id: 'NV-N1' } }); ok('CR Add unit: the unit title only (no unit code input), the reference note; the dialog fits', shown($1('#modal-root #u-t')) && !all('#modal-root input').some(i => i.id === 'u-c' && shown(i)) && shown($1('#modal-root .cr-unit-ref')) && !modalFits(), modalFits()); closeModal();
    // DM-P (PD-DM-16/17) supersedes the CR checks of a course without approved options (a cr-nb box; both modes "Finance approval required"):
    // Create batch takes only courses with published, approved options by delivery mode — here the Level 2 Diploma after Finance adds them
    M_MODES.forEach(m => { if (!crApprOpts('NV-L2').some(o => o.mode === m)) r1AddOpt('NV-L2', { label: m, fee: 1800, mode: m }, 'Fixture (DM-P)', 'Added'); });
    go('a-batches'); click($1('main [data-act="newBatch"]')); $1('#modal-root #nb-c').value = 'UI-CR2'; const crCo = $1('#modal-root #nb-co'); crCo.value = 'Level 2 Diploma in Care (England)'; INP.n2NbCourse(crCo);
    ok('CR Create batch: Batch code, Awarding body batch code and the course\'s delivery modes as checkboxes (both ticked); the dialog fits', shown($1('#modal-root #nb-c')) && shown($1('#modal-root #nb-abc')) && all('#modal-root .m-m').filter(shown).map(x => x.value + (x.checked ? '*' : '')).join() === 'Self-Paced*,Fully Assisted*' && !shown($1('#modal-root #nb-dm')) && !modalFits(), modalFits());
    click($1('#modal-root .modal-f .btn-primary')); $1('#modal-root #nb-ac').value = 'Dr Helen Carter'; [1, 2, 3].forEach(() => click($1('#modal-root .modal-f .btn-primary')));
    ok('CR Create batch review: both delivery modes accepted and "Ready for enrolment"; the dialog fits', /Self-Paced and Fully Assisted/.test(($1('#modal-root .m-nb-rev') || {}).textContent || '') && shown($1('#modal-root .cr-rev-r')) && !modalFits(), modalFits()); click($1('#modal-root .modal-f .btn-primary')); closeModal();
    go('a-batches', { id: 'UI-CR2' }); ok('CR batch detail: each mode with its readiness; no page overflow', all('main .cr-rdy-r').filter(shown).length === 2 && appOver() <= 1, appOver());
    ACT.w1Opts({ dataset: { id: 'UI-CR2' } }); ok('CR batch delivery modes dialog: the modes and their fee options, with the reason; the dialog fits', all('#modal-root .m-m').filter(shown).length === 2 && shown($1('#modal-root #rsn')) && !modalFits(), modalFits()); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'UI-CR2' } }); ok('CR Edit batch details: the same modes displayed; the dialog fits', all('#modal-root .m-m').filter(shown).length === 2 && !modalFits(), modalFits()); closeModal();
    go('a-batches', { id: 'L3AC-JAN26' }); ok('CR batch detail: Batch code and Awarding body batch code displayed; no page overflow', shown($1('main .cr-abc')) && appOver() <= 1, appOver());
    click($1('main [data-act="crAbcEdit"]')); ok('CR Record the awarding body batch code: the dialog fits', shown($1('#modal-root #ab-abc')) && !modalFits(), modalFits()); closeModal();
    const crEb = ADMIN.batches.find(b => ['Open', 'Planned'].includes(b.status)); ACT.s4bBatchEdit({ dataset: { id: crEb.code } });
    ok('CR Edit batch details: Batch code (fixed) and the Awarding body batch code field displayed; the dialog fits', shown($1('#modal-root .cr-bc')) && shown($1('#modal-root #bd-abc')) && !modalFits(), modalFits()); closeModal();
    go('a-batches', { id: 'L3AC-JAN26', tab: 'deadlines' }); ok('CR Batch → Assignment deadlines: the table with Set / Change displayed; no page overflow', shown($1('main .cr-dl')) && all('main .cr-dl [data-act="crDlEdit"]').filter(shown).length >= 1 && appOver() <= 1, appOver());
    click($1('main .cr-dl [data-act="crDlEdit"]')); ok('CR deadline dialog: date and time, and the reason; the dialog fits', shown($1('#modal-root #cr-dl-d')) && shown($1('#modal-root #rsn')) && !modalFits(), modalFits()); closeModal();
    go('a-assignments'); ACT.newAsg(); const crU = $1('#modal-root #na-u'); crU.value = [...crU.options].find(o => /^U306 · Module 1/.test(o.textContent)).value; $1('#modal-root #na-t').value = 'UI CR assignment';
    ok('CR New assignment: no deadline field', !$1('#modal-root #na-d')); click($1('#modal-root .modal-f .btn-primary'));
    const crD = s2Defs().find(x => x.title === 'UI CR assignment'); ACT.s2QAdd({ dataset: { id: crD.id } }); $1('#modal-root #aq-t').value = 'Explain.'; click($1('#modal-root .modal-f .btn-primary')); closeModal(); INP.mapChange({ checked: true, dataset: { id: crD.id, q: crD.qs[0].id, c: s2Crit(crD).find(c => c.type === 'Knowledge').code } });
    go('a-assignments', { id: crD.id, tab: 'details' }); ok('CR assignment Details: no deadline input; the deadlines per batch; no page overflow', !$1('main #ae-d') && shown($1('main .cr-asg-dl')) && appOver() <= 1, appOver());
    ACT.pubAsg({ dataset: { id: crD.id } }); ok('CR Publish: a deadline field next to every batch; the dialog fits', all('#modal-root .cr-pd').length >= 1 && all('#modal-root .cr-pd').filter(shown).length === all('#modal-root .s2-pb').length && !modalFits(), modalFits());
    closeModal(); initStore();
    // FP: deposit credit (learner Payments, deposit card, Finance schedules) and the short-course certificate setting at this width
    const fpL = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
    fpL('C'); go('payments'); ok('FP learner Payments: the deposit-credit note and the ledger totals; no page overflow', shown($1('main .fp-led')) && /Deposit £300\.00 paid and credited/.test(main()) && appOver() <= 1, appOver());
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; setUi('fpL', 'C'); go('f-plans'); ok('FP Finance Payment Plans: the reconciliation summary above the rows; no page overflow', shown($1('main .fp-sum')) && /Reconciles/.test(main()) && appOver() <= 1, appOver());
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; const fpC = s1DemoCourse(); go('a-courses', { id: fpC.id, tab: 'certificate' });
    ok('FP Short course → Certificate: "Certificate on completion" Yes / No; no page overflow', all('main input[name="fc-on"]').filter(shown).length === 2 && appOver() <= 1, appOver());
    click($1('main input[name="fc-on"][value="no"]')); click($1('main [data-act="s1Save"]')); ok('FP saving the setting: the version dialog names the change; the dialog fits', /Certificate on completion: Yes → No/.test($1('#modal-root').textContent) && !modalFits(), modalFits());
    $1('#modal-root #rsn').value = 'UI FP'; click($1('#modal-root .modal-f .btn-primary')); closeModal(); fpC.status = 'Published'; s1Sync();
    fpL('A'); go('browse'); ok('FP Browse: "No certificate on completion" on the course card; no page overflow', /No certificate on completion/.test(main()) && appOver() <= 1, appOver());
    s1Enrol(CATALOGUE.find(x => x.course === fpC.id), fpC, null); const fpE = STORE.worlds[S.variant].enrolments.find(x => x.courseId === fpC.id); go('course', { id: fpE.id, tab: 'certificate' });
    ok('FP learner Certificate tab of a No course: "No certificate for this course"; no page overflow', shown($1('main .fc-none')) && appOver() <= 1, appOver());
    initStore();
    // 7. Demo controls: the scenarios button at once
    S.demoOpen = false; render(); click($1('.demo-fab')); ok('Demo controls: "Open the 30 Demo Scenarios" shown at once', shown($1('#demo-root [data-act="scOpen"]')));
    ok('no script errors', !errs.length, errs.join(' | '));
  } catch (e) { R.push(`FAIL [${W}] threw ${e.message} ${(e.stack || '').split('\n')[1] || ''}`); }
  parent.postMessage({ uicheck: R }, '*');
})();
