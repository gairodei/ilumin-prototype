// UX polish v2 — Phase 5 checks (interaction, accessibility, mobile, deferred Phase 3 items).
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const key = (k, target) => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); (target || document.body).dispatchEvent(ev); return ev; };

  T('Minimum price', () => {
    SA(); go('a-config'); ok('setting called "Bundle minimum price"', [...document.querySelectorAll('main tbody tr')].some(tr => /Bundle minimum price/.test(tr.textContent)));
    ok('the old word is gone from the setting list', !/\bfloor\b/i.test(main()));
    ok('queue type uses the agreed name', ADMIN.queue.some(i => i.type === 'Bundle price below minimum') && !ADMIN.queue.some(i => /floor/i.test(i.type)));
  });

  T('Marking Workspace shortcuts', () => {
    S.tas.v = 'A'; tasEnter(); S.signedIn = true;
    const s = tasSubs().find(x => x.toMark); if (!s) { ok('a submission to mark', false); return; }
    go('t-mark', { id: s.key }); document.body.focus();
    key('?'); ok('"?" shows the shortcut list', MODAL && /Keyboard shortcuts/.test(MODAL.title)); closeModal();
    key('m'); const met = document.querySelector('#main [data-act="mkMet"][data-v="Met"]');
    key('r'); const rb = document.querySelector('#main [data-act="mkRag"][data-v="R"]');
    ok('R sets RAG to red', rb && (rb.getAttribute('aria-checked') === 'true' || rb.getAttribute('aria-pressed') === 'true' || rb.classList.contains('on')), rb && rb.outerHTML.slice(0, 120));
    const ta = document.querySelector('#main textarea'); if (ta) { ta.focus(); const before = rb && rb.getAttribute('aria-checked'); const ev = key('g', ta); const rg = document.querySelector('#main [data-act="mkRag"][data-v="G"]'); ok('typing in a box is never treated as a shortcut', !ev.defaultPrevented && !(rg && rg.getAttribute('aria-checked') === 'true')); }
  });

  T('Focus stays on the control you used', () => {
    // Start clean: the previous test's M key left the draft unsaved (it clears when the simulated autosave fires), and
    // navigating with unsaved marking opens the "Unsaved marking changes" dialog — close it and mark the draft saved first.
    closeModal(); S.tas.dirty = false;
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; const s = tasSubs().find(x => x.toMark); go('t-mark', { id: s.key });
    ok('no dialog open before the click', !MODAL, MODAL && MODAL.title);
    const b = document.querySelector('#main [data-act="mkMet"][data-v="Not Met"]:not([disabled])'); if (!b) { ok('a Met control', false); return; }
    window.__DEBUG_REDRAW = true; window.__redrawLog = []; // diagnostics only for this test (off by default)
    b.focus(); b.click(); window.__DEBUG_REDRAW = false;
    const a = document.activeElement, twins = [...document.querySelectorAll('#app [data-act="mkMet"][data-v="Not Met"]')];
    ok('focus returns to the same control after the redraw', a && a.dataset.act === 'mkMet' && a.dataset.v === 'Not Met', (a && (a.id || a.dataset.act || a.tagName)) + ' · matching controls ' + twins.length + ' · visible ' + twins.filter(x => x.getClientRects().length).length + ' · redraw ' + JSON.stringify((window.__redrawLog || []).slice(-1)[0] || 'no redraw recorded'));
    const log = (window.__redrawLog || []).slice(-1)[0] || {};
    ok('the restore ran as the last step of the redraw (or focus was already on the control)', ((log.restore && log.restore.ran === true) || /mkMet/.test(log.afterRender || '')) && /mkMet=Not Met/.test(log.end || ''), JSON.stringify(log.restore) + ' · steps ' + (log.steps || []).join(' › '));
  });

  T('Approvals: next oldest awaiting you', () => {
    SA(); const mine = allQueue().filter(x => isOpen(x) && awaitingMe(x)).sort((a, b) => new Date(a.raised) - new Date(b.raised));
    if (mine.length < 2) { ok('two items awaiting', false); return; }
    go('a-queue', { id: mine[1].id }); const b = document.querySelector('main [data-go="a-queue"][data-id="' + mine[0].id + '"]');
    ok('"Next oldest awaiting you" links to the oldest other item', !!b && /Next oldest awaiting you/.test(b.textContent));
  });

  T('Release queue scope', () => {
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; ACT.simMark(); const P = relStore()[relKeyOfWorld('C', 'a4')];
    const other = myBatches().find(b => b.code !== P.batch); if (!other) { ok('a second batch', false); return; }
    const all = myRel().length; S.coo.batch = other.code; go('c-release');
    ok('honours the batch in scope: "Showing 0 of N" with the real total', main().includes(`Showing 0 of ${all} for the batch in scope`) && DT.crel && DT.crel.rows.length === 0, main().match(/Showing \d+ of \d+[^.]*/) && main().match(/Showing \d+ of \d+[^.]*/)[0]);
    ok('sidebar badge stays the all-batches total', new RegExp('Release queue\\s*' + all).test(document.querySelector('.adm-side').textContent));
    ACT.cooScopeAll(); ok('"Show all my batches" shows it again', /Assignment 4/.test(main()) && S.coo.batch === 'all');
    go('c-notifications'); ok('Coordinator "Release" notification tab', [...document.querySelectorAll('main .tab')].some(t => /^Release/.test(t.textContent)));
  });

  T('IQA source list and search filter', () => {
    iqaEnter('QA'); S.signedIn = true; go('q-findings');
    const a = document.querySelector('#main [data-go="q-record"][data-id]');
    if (a) { a.click(); const cr = document.querySelector('main .crumbs'); ok('record opened from Findings: breadcrumb goes back to Findings', cr && /Findings/.test(cr.textContent) && !/Assessment Records/.test(cr.textContent), cr && cr.textContent); ok('Previous / Next follow the Findings list', S.iqa.list && S.iqa.list.includes(S.params.id)); }
    const as = (ADMIN.staff.find(x => (x.roles || []).includes('Assessor')) || {}).name;
    if (as) { ACT.qSearchGo({ dataset: { q: 'as:' + as, t: 'q-records' } }); ok('header search filter survives', (dts('qrec') || { f: {} }).f.as === as, JSON.stringify((dts('qrec') || {}).f)); }
  });

  T('System Admin limits marked', () => {
    ACT.switchRole({ dataset: { r: 'sysA' } }); go('a-dashboard');
    ['a-queue', 'a-staff', 'a-roles', 'a-config'].forEach(r => { const l = document.querySelector(`#app nav.adm-side a[data-go="${r}"] .nav-ro`); ok(r + ' marked with its Super-Admin-only part', !!l && l.title.length > 20); });
  });

  T('Learner notification categories', () => {
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('notifications');
    const tabs = [...document.querySelectorAll('main [role="tab"]')].map(t => t.textContent);
    const has = c => W.notifs.some(NF[c]);
    ['Requests', 'Enrolment', 'Account', 'Other'].forEach(c => ok(c + ' tab shown when it has notifications', !has(c) || tabs.some(t => t.startsWith(c)), tabs.join('|')));
  });

  T('Mobile', () => {
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('dashboard');
    const bar = [...document.querySelectorAll('#app .bnav button[data-go]')].map(b => b.dataset.go);
    ok('learner bar: Home, Assignments, Payments, Messages', bar.join() === 'dashboard,assignments,payments,messages', bar.join());
    S.tas.v = 'T'; tasEnter(); S.signedIn = true; go('t-dashboard'); const tb = [...document.querySelectorAll('#app .bnav button[data-go]')].map(b => b.dataset.go);
    ok('Teacher-only bar has Sessions', tb.includes('t-sessions'), tb.join());
    SA(); go('a-queue'); const td = document.querySelector('main .dt table.dt-cards tbody td[data-label]'); ok('tables carry column labels for the card layout', !!td);
  });

  T('S opens the Send to Coordinator confirmation', () => {
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; const s = tasSubs().find(x => x.toMark); if (!s) { ok('a submission to mark', false); return; }
    const its = markable(tasAsg(s)), d = dft(s.key); its.forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Clear and relevant.', met: 'Met', verified: true, vat: now().toISOString() }; });
    go('t-mark', { id: s.key }); closeModal(); document.body.focus(); key('s');
    ok('S opens "Send to Coordinator for release?"', MODAL && /Send to Coordinator for release/.test(MODAL.title), MODAL && MODAL.title);
    ok('nothing is sent until you confirm', !relStore()[s.key]); closeModal();
  });

  // Undo bar: announced once, then only the countdown changes (async: waits for a real timer tick)
  (async () => {
    try {
      S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
      const a = W.assignments.find(x => x.status === 'Not Started' && !x.closed) || W.assignments.find(x => x.status === 'Resubmission Required');
      if (!a) ok('an assignment to submit', false);
      else {
        go('assignment', { id: a.id }); startUndo(a, a.status === 'Resubmission Required');
        const bar1 = document.querySelector('#undo-root .undo'), n1 = bar1 && +bar1.querySelector('.num').textContent;
        ok('Undo bar shown as a polite status (not an alert)', bar1 && bar1.getAttribute('role') === 'status', bar1 && bar1.getAttribute('role'));
        ok('says how long you have', bar1 && /15 seconds to undo/.test(bar1.textContent));
        await new Promise(r => setTimeout(r, 2100));
        const bar2 = document.querySelector('#undo-root .undo'), n2 = bar2 && +bar2.querySelector('.num').textContent;
        ok('after ticks the same bar is kept (not re-announced) and the countdown went down', bar2 === bar1 && n2 < n1, n1 + ' → ' + n2 + (bar2 === bar1 ? '' : ' (bar was replaced)'));
        ACT.undoSubmit(); ok('Undo cancels: assignment not submitted', a.status !== 'Submitted' && !document.querySelector('#undo-root .undo'), a.status);
      }
    } catch (e) { R.push('FAIL Undo bar — threw ' + e.message); }
    const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
  })();
})();
