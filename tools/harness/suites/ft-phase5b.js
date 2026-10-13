// UX polish v2 — Phase 5 (remaining items): dialogs, validation, disabled reasons, drafts, auto-save chip,
// Release queue keyboard, loading placeholders, instant updates with rollback, phone main action, screen-index purposes.
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { closeModal(); f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const key = (k, target, o = {}) => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }); (target || document.activeElement || document.body).dispatchEvent(ev); return ev; };
  const type = (el, v) => { if (el.isContentEditable) el.textContent = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const mi = label => [...document.querySelectorAll('#modal-root [data-mi]')].find(b => b.textContent.trim() === label);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const errOf = sel => { const el = document.querySelector(sel), f = el && (el.closest('.field') || el.parentElement); const e = f && f.querySelector('.err'); return e ? e.textContent.trim() : ''; };

  // Mark every markable question and send the submission through the real "Send to Coordinator for release" confirmation
  const sendForReleaseViaUI = s => {
    const d = dft(s.key); markable(tasAsg(s)).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Clear and relevant.', met: 'Met', verified: true, vat: now().toISOString() }; });
    closeModal(); S.tas.dirty = false; go('t-mark', { id: s.key });
    const b = document.querySelector('#main [data-act="mkRelease"]:not([disabled])'); if (!b) return false;
    b.click(); const c = mi('Send to Coordinator for release'); if (!c) { closeModal(); return false; }
    c.click(); return !!relStore()[s.key];
  };
  // Two submissions from the Coordinator's own batches, sent by the Assessor (setup for the Release queue checks)
  const seedRelease = n => {
    ACT.demoSignInAsCoord(); const codes = myBatches().map(b => b.code);
    S.tas.v = 'A'; tasEnter();
    const subs = tasSubs().filter(s => s.toMark && s.L.status !== 'Discontinued' && codes.includes(s.L.batch.code) && !relStore()[s.key]);
    let sent = 0; for (const s of subs) { if (sent >= n) break; if (sendForReleaseViaUI(s)) sent++; }
    return sent;
  };

  /* ---------- Screen index: a purpose under every entry ---------- */
  // [index, entry label, expected lookup key, must be present]
  const DATA_DRIVEN = [
    ['index', /^(Token: |Email: |P[1246] |O[124] |Confirmed visit|Cancelled visit)/, /^wpc:/, true],
    ['index', /^(Valid|Expired|Revoked|Replaced|Not found)$/, /^cert:/, true],
    ['k-index', /— awaiting me \(/, /^queue:Extra quiz attempts$/, true],
    ['c-index', /^Batch detail → Edit staff \(/, /^batch:detail$/, true],
    ['c-index', /read-only marking detail/, /^release:item$/, false],
    ['t-index', /resubmission \(Resub/, /^mark:resub$/, true],
    ['t-index', /resubmission limit/, /^mark:limit$/, true],
    ['g-index', /^(Learner detail|Bundle detail|Purchase detail) /, /^agency:(learner|bundle|purchase)$/, true],
    ['q-index', /^(Former assessor's work|Archived learner|Discontinued learner) /, /^record:(former|archived|discontinued)$/, true],
  ];
  const IDX = [
    ['index', () => { learner('C'); go('index'); }],
    ['a-index', () => { SA(); go('a-index'); }],
    ['c-index', () => { ACT.demoSignInAsCoord(); go('c-index'); }],
    ['f-index', () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('f-index'); }],
    ['t-index', () => { S.tas.v = 'A'; tasEnter(); go('t-index'); }],
    ['k-index', () => { acaEnter('KA'); go('k-index'); }],
    ['b-index', () => { bizEnter('BA'); go('b-index'); }],
    ['g-index', () => { agyEnter('AG-02', true); go('g-index'); }],
    ['q-index', () => { iqaEnter('QA'); go('q-index'); }],
  ];
  IDX.forEach(([k, enter]) => T('Screen index purposes — ' + k, () => {
    enter();
    const lis = [...document.querySelectorAll('#main .idx-sec .idx-list > li')].filter(li => li.querySelector(':scope > button, :scope > a'));
    const missing = lis.filter(li => !li.querySelector('.idx-purpose') && !/^·\s*.{4,}/.test([...li.childNodes].slice(1).map(n => n.textContent).join('').trim()));
    const fb = [...document.querySelectorAll('#main .idx-purpose[data-pf="fallback"]')].map(s => s.closest('li').querySelector('button, a').textContent.trim());
    ok(`${k}: every entry (${lis.length}) has a one-line purpose`, lis.length > 0 && !missing.length, missing.slice(0, 3).map(li => li.textContent.trim().slice(0, 50)).join(' | '));
    ok(`${k}: every purpose is written for its entry (no generic fallback)`, !fb.length, fb.slice(0, 5).join(' | '));
    ok(`${k}: the links are unchanged (label text kept)`, lis.every(li => li.querySelector(':scope > button, :scope > a').textContent.trim().length > 0));
    // Data-driven entries (labels or targets with live tokens, IDs, codes, dates) get the purpose for their item's type
    DATA_DRIVEN.filter(d => d[0] === k).forEach(([, lbl, pk, must]) => {
      const hits = lis.filter(li => lbl.test(li.querySelector(':scope > button, :scope > a').textContent.trim()));
      const wrong = hits.filter(li => !pk.test((li.querySelector('.idx-purpose') || { dataset: {} }).dataset.pk || ''));
      if (must || hits.length) ok(`${k}: data-driven entries ${lbl} are looked up by item type (${hits.length})`, hits.length > 0 && !wrong.length, wrong.map(li => li.querySelector('button, a').textContent.trim() + ' → ' + (li.querySelector('.idx-purpose') || { dataset: {} }).dataset.pk).slice(0, 4).join(' | '));
    });
  }));
  T('Screen index: the placeholder topics list is untouched', () => { learner('C'); go('index'); const tbd = [...document.querySelectorAll('#main section.card:not(.idx-sec) .idx-list li')]; ok('no purpose added to the 4 placeholder topics (CH: was 8)', tbd.length === 4 && !tbd.some(li => li.querySelector('.idx-purpose')), tbd.length + ' items'); });

  /* ---------- Dialogs: focus trap and return ---------- */
  T('Dialog focus trap', () => {
    learner('C'); go('dashboard');
    const opener = document.querySelector('#app nav [data-go="assignments"], #app [data-go="assignments"]'); if (!opener) { ok('an opener control', false); return; }
    opener.focus();
    openModal({ title: 'Trap test', body: '<div class="field"><label for="tt-a">A</label><input class="input" id="tt-a"></div><input type="hidden" id="tt-h"><button class="btn" disabled>Off</button>', actions: [{ label: 'Cancel' }, { label: 'OK', cls: 'btn-primary' }] });
    const f = modalFocusables(), first = f[0], last = f[f.length - 1];
    ok('hidden and disabled fields are skipped', !f.some(x => x.id === 'tt-h' || x.disabled));
    last.focus(); key('Tab', last); ok('Tab on the last control goes to the first', document.activeElement === first, document.activeElement && (document.activeElement.id || document.activeElement.textContent));
    first.focus(); key('Tab', first, { shiftKey: true }); ok('Shift+Tab on the first control goes to the last', document.activeElement === last);
    opener.focus(); ok('focus can\'t move behind the open dialog', document.getElementById('modal-root').contains(document.activeElement), document.activeElement && document.activeElement.tagName);
    render(); // the page redraws while the dialog is open: the opener element is replaced
    closeModal();
    const a = document.activeElement; ok('closing returns focus to the control that opened it (found again after the redraw)', a && a.dataset && a.dataset.go === 'assignments', a && (a.dataset.go || a.tagName));
  });

  /* ---------- Validation as you type ---------- */
  T('Validation as you type', () => {
    SA(); go('a-learners'); ACT.addLearner();
    mi('Save and send activation link').click();
    ok('submitting empty shows the name error', /Enter the learner's name/.test(errOf('#nl-name')), errOf('#nl-name'));
    type($('#nl-name'), 'Test Person');
    ok('typing a name clears it at once', !errOf('#nl-name') && !$('#nl-name').hasAttribute('aria-invalid'), errOf('#nl-name'));
    type($('#nl-name'), ''); ok('emptying it brings the message back', /Enter the learner's name/.test(errOf('#nl-name')));
    type($('#nl-name'), 'Test Person');
    $('#nl-email').value = 'abc'; mi('Save and send activation link').click();
    ok('invalid email shows the email error', /valid email/i.test(errOf('#nl-email')), errOf('#nl-email'));
    type($('#nl-email'), 'abc@exa'); ok('still invalid while typing — message stays', /valid email/i.test(errOf('#nl-email')));
    const ee = $('#nl-email').closest('.field').querySelector('.err');
    ok('the message is linked to its field (aria-describedby)', ee && ee.id && ($('#nl-email').getAttribute('aria-describedby') || '').split(' ').includes(ee.id), $('#nl-email').getAttribute('aria-describedby'));
    type($('#nl-email'), 'abc.test@example.com'); ok('valid email clears the message as you type', !errOf('#nl-email') && !$('#nl-email').hasAttribute('aria-invalid'), errOf('#nl-email'));
    closeModal();
  });

  /* ---------- Every disabled button says why ---------- */
  T('Disabled buttons have a reason', () => {
    S.tas.v = 'A'; tasEnter(); S.tas.dirty = false;
    // (a) a Completed submission: every criterion is Achieved and locked, so there are no Met / Not Met buttons —
    //     the disabled controls are Save draft and Send to Coordinator for release
    const done = tasSubs().find(x => !x.toMark && x.status === 'Completed' && x.L.status !== 'Discontinued'); if (!done) { ok('a Completed submission', false); return; }
    go('t-mark', { id: done.key });
    const dis = [...document.querySelectorAll('#app button[disabled]')];
    ok('Marking Workspace (Completed): every disabled button has a tooltip', dis.length > 0 && dis.every(b => (b.getAttribute('title') || '').trim()), dis.filter(b => !b.title).map(b => b.dataset.act || b.textContent.trim()).join(','));
    const send = document.querySelector('#main [data-act="mkRelease"][disabled]');
    ok('the reason is specific: names the status and why it is read-only', send && /Status: Completed/.test(send.title) && /read-only/.test(send.title), send ? 'Send to Coordinator: ' + send.title : 'no disabled Send to Coordinator button');
    // (b) a discontinued learner
    const disc = tasSubs().find(x => x.L.status === 'Discontinued');
    if (disc) { go('t-mark', { id: disc.key }); const b = document.querySelector('#main [data-act="mkRelease"][disabled], #main [data-act="mkMet"][disabled]'); ok('discontinued learner: the reason says marking is closed', b && /discontinued/i.test(b.title), b ? b.dataset.act + ': ' + b.title : 'no disabled marking control'); }
    // (c) "Sent to the Coordinator" is checked in the Release queue test, after two submissions are really sent
    SA(); go('a-learners');
    const pg = [...document.querySelectorAll('#app [data-act="dtPg"][disabled]')]; ok('pagination: disabled buttons say why', pg.every(b => /page/i.test(b.title)), pg.map(b => b.title).join(' | '));
  });

  /* ---------- Drafts ---------- */
  T('Dialog draft: asked before discarding', () => {
    {
      SA(); go('a-learners');
      ACT.addLearner(); ACT.modalClose(); ok('an untouched dialog closes straight away', !MODAL);
      ACT.addLearner(); type($('#nl-name'), 'Jo Bloggs');
      ACT.modalClose(); ok('× after typing asks "Discard what you typed?"', MODAL && MODAL.title === 'Discard what you typed?', MODAL && MODAL.title);
      mi('Keep editing').click(); ok('Keep editing puts the dialog back with the text', MODAL && MODAL.title === 'Add learner' && $('#nl-name') && $('#nl-name').value === 'Jo Bloggs', MODAL && MODAL.title);
      key('Escape', $('#nl-name')); ok('Esc asks too', MODAL && MODAL.title === 'Discard what you typed?');
      mi('Keep editing').click(); mi('Cancel').click(); ok('Cancel asks too', MODAL && MODAL.title === 'Discard what you typed?');
      mi('Discard').click(); ok('Discard closes the dialog', !MODAL);
    }
  });

  /* ---------- One auto-save indicator ---------- */
  T('Auto-save chip: Marking Workspace idle state', () => {
    S.tas.v = 'A'; tasEnter(); S.tas.dirty = false; const s = tasSubs().find(x => x.toMark); go('t-mark', { id: s.key });
    const c = document.getElementById('mk-save'); ok('chip has the shared style and is announced politely', c && /save-chip/.test(c.className) && c.getAttribute('role') === 'status' && c.getAttribute('aria-live') === 'polite' && !!c.querySelector('svg') && !!c.title, c && c.outerHTML.slice(0, 160));
  });

  /* ---------- Release queue: keyboard ---------- */
  T('Release queue keyboard', () => {
    // Setup: the Assessor marks two submissions in the Coordinator's batches and sends them for release (real UI path)
    const sent = seedRelease(2); ok('setup: two submissions sent to the Release queue from the Marking Workspace', sent === 2, sent + ' sent');
    const one = Object.keys(relStore())[0];
    if (one) { S.tas.v = 'A'; tasEnter(); S.tas.dirty = false; go('t-mark', { id: one }); const b = document.querySelector('#main [data-act="mkMet"][disabled], #main [data-act="mkRelease"][disabled]'); ok('sent item: the disabled marking controls say it is with the Coordinator', b && /Sent to the Coordinator/.test(b.title), b ? b.dataset.act + ': ' + b.title : 'no disabled control'); }
    ACT.demoSignInAsCoord(); go('c-index');
    const ri = [...document.querySelectorAll('#main .idx-list > li')].find(li => /read-only marking detail/.test(li.textContent));
    ok('c-index: the live Release-queue item entry gets its type purpose', ri && (ri.querySelector('.idx-purpose') || { dataset: {} }).dataset.pk === 'release:item', ri ? (ri.querySelector('.idx-purpose') || { dataset: {} }).dataset.pk : 'entry not shown');
    S.coo.batch = 'all'; S.coo.kb = null; go('c-release');
    const rows = relRows(); if (rows.length < 2) { ok('at least two items waiting', false, rows.length); return; }
    ok('the shortcuts are listed on the page', /Keyboard: J \/ K/.test(main()));
    document.body.focus(); key('j', document.body); const k1 = relKey(rows[0]);
    ok('J selects the first item', S.coo.kb === k1 && document.querySelector('#main tr.kb-cur') && relKey(document.querySelector('#main tr.kb-cur')) === k1);
    ok('focus moves into that row', document.querySelector('#main tr.kb-cur').contains(document.activeElement));
    key('ArrowDown'); ok('↓ moves to the next item', S.coo.kb === relKey(relRows()[1]));
    key('k'); ok('K moves back', S.coo.kb === k1);
    key('x'); ok('X selects the item for bulk release', ((dts('crel') || {}).sel || []).includes(k1), JSON.stringify((dts('crel') || {}).sel));
    ok('the highlight survives the redraw', document.querySelector('#main tr.kb-cur') && relKey(document.querySelector('#main tr.kb-cur')) === k1);
    key('r', document.body); ok('R asks to confirm the release', MODAL && /Release to learner\?/.test(MODAL.title), MODAL && MODAL.title);
    ok('nothing is released until you confirm', !!relStore()[k1]); closeModal();
    // Typing in the queue's own search box (the input, #dtq-crel — not its wrapper): a name with r, j, k and x, then
    // Enter, must not move the highlight, select, open or release anything
    const box0 = document.getElementById('dtq-crel'); ok('the queue has its search box', !!box0);
    if (box0) {
      const kb0 = S.coo.kb, sel0 = JSON.stringify((dts('crel') || {}).sel || []), pend0 = Object.keys(relStore()).sort().join(','), tok0 = routeTok(S.route, S.params || {});
      const stray = []; let typed = '';
      for (const ch of 'Rex Jackson') {
        const b = document.getElementById('dtq-crel'); b.focus();
        const ev = key(ch, b); if (ev.defaultPrevented) stray.push(ch);
        typed += ch; b.value = typed; b.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const b2 = document.getElementById('dtq-crel'); b2.focus(); key('Enter', b2);
      ok('typing "Rex Jackson" + Enter in the search box: no key was taken as a shortcut', !stray.length, 'taken: ' + stray.join(''));
      ok('… nothing highlighted changed', S.coo.kb === kb0, kb0 + ' → ' + S.coo.kb);
      ok('… nothing selected', JSON.stringify((dts('crel') || {}).sel || []) === sel0);
      ok('… nothing opened', routeTok(S.route, S.params || {}) === tok0 && !MODAL, routeTok(S.route, S.params || {}) + (MODAL ? ' + dialog ' + MODAL.title : ''));
      ok('… nothing released', Object.keys(relStore()).sort().join(',') === pend0);
      const b3 = document.getElementById('dtq-crel'); if (b3) { b3.value = ''; b3.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    key('?', document.body); ok('? lists the shortcuts', MODAL && /Release queue/.test(MODAL.title)); closeModal();
    // Enter opens exactly the item J / K highlighted
    const blur = () => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
    blur(); key('j', document.body); blur(); key('k', document.body);
    const cur = document.querySelector('#main tr.kb-cur'), hk = cur && relKey(cur);
    blur(); key('Enter', document.body);
    ok('Enter opens exactly the highlighted item', hk === k1 && S.route === 'c-release' && S.params.id === hk, 'opened ' + S.route + '.' + S.params.id + ' · highlighted ' + hk + ' · expected ' + k1);
    const st = dts('crel'); if (st) st.sel = [];
  });

  /* ---------- Phones: main action in reach ---------- */
  T('Phone main action', () => {
    learner('C'); S.frame = 'auto'; go('assignment', { id: 'a3' });
    const bar = document.querySelector('#main .mob-main [data-act="mobMain"]'), orig = document.querySelector('#main [data-act="reviewSubmit"]');
    ok('answer sheet has the bottom action "Review & Submit"', bar && orig && bar.textContent.trim() === orig.textContent.trim(), bar && bar.textContent);
    ok('hidden on wide screens', bar && getComputedStyle(bar.parentElement).display === 'none');
    const _rs = ACT.reviewSubmit; let got = null; ACT.reviewSubmit = el => { got = el; };
    try { bar.click(); } finally { ACT.reviewSubmit = _rs; }
    ok('it does exactly what the real button does', got === orig);
    S.frame = 'mobile'; render();
    const b2 = document.querySelector('#main .mob-main'); ok('on a phone it sticks to the bottom', b2 && getComputedStyle(b2).position === 'sticky', b2 && getComputedStyle(b2).position);
    S.frame = 'auto'; render();
    S.tas.v = 'A'; tasEnter(); S.tas.dirty = false; const s = tasSubs().find(x => !x.toMark); go('t-mark', { id: s.key });
    const mb = document.querySelector('#main .mob-main [data-act="mobMain"]'); ok('mirrors a disabled main action with its reason', mb && mb.disabled && !!mb.title, mb && (mb.disabled + ' ' + mb.title));
  });

  // Async checks (timers)
  (async () => {
    const A = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message); } };
    await A('Leaving a page with typed text', async () => {
      {
        learner('C'); go('messages', { id: 't1' });
        const box = document.getElementById('reply'); if (!box) { ok('a reply box', false); return; }
        type(box, 'Hello, quick question');
        const link = document.querySelector('#app [data-go="assignments"]'); link.click();
        ok('asks "Leave this page?" and stays put', MODAL && MODAL.title === 'Leave this page?' && S.route === 'messages', MODAL && MODAL.title);
        ok('quotes what you typed', /Hello, quick question/.test(document.getElementById('modal-root').textContent));
        mi('Stay on this page').click(); await wait(10);
        ok('Stay keeps you on the page with the text', S.route === 'messages' && document.getElementById('reply').value === 'Hello, quick question');
        document.querySelector('#app [data-go="assignments"]').click(); mi('Leave anyway').click(); await wait(30);
        ok('Leave anyway goes where you clicked', S.route === 'assignments', S.route);
      }
    });
    await A('Auto-save chip states (answer sheet)', async () => {
      learner('C'); go('assignment', { id: 'a3' });
      const c = () => document.getElementById('savechip');
      setSave('busy'); await wait(0); ok('Saving…', c() && c().textContent.trim() === 'Saving…' && /\bbusy\b/.test(c().className), c() && c().textContent);
      setSave('ok'); await wait(0); ok('Saved with the time', c() && /^Saved \d{1,2}:\d{2}$/.test(c().textContent.trim()), c() && c().textContent);
      setSave('fail'); await wait(0); ok('Save failed — retrying', c() && c().textContent.trim() === 'Save failed — retrying' && /\bfail\b/.test(c().className));
      S.offline = true; setSave('fail'); await wait(0); ok('offline reads "Saved on this device"', c() && c().textContent.trim() === 'Saved on this device' && /\blocal\b/.test(c().className), c() && c().textContent); S.offline = false;
      ok('same structure as the Marking Workspace chip (icon + text, polite status, tooltip)', c() && c().getAttribute('role') === 'status' && c().getAttribute('aria-live') === 'polite' && !!c().querySelector('svg') && !!c().title);
      setSave('ok');
    });
    await A('Loading placeholders', async () => {
      learner('C'); S.slowNet = true; go('progress');
      const m = () => document.getElementById('main');
      ok('a slow load shows skeleton placeholders', m().classList.contains('is-loading') && !!m().querySelector('.load-skel .skel') && m().getAttribute('aria-busy') === 'true');
      ok('the page content is already there, just held back', !!m().querySelector('h1'));
      await wait(800);
      ok('then the page appears', !m().classList.contains('is-loading') && !m().querySelector('.load-skel') && m().getAttribute('aria-busy') === 'false');
      S.slowNet = false; go('dashboard'); ok('normal speed: no placeholders', !m().classList.contains('is-loading'));
      S.serverError = true; render(); ACT.retryServer(); ok('"Try again" shows placeholders while it reloads', !!document.querySelector('#main .load-skel'));
      await wait(700); ok('then the page is back', !S.serverError && !document.querySelector('#main .load-skel'));
    });
    await A('Instant update rolls back if saving fails', async () => {
      learner('C'); go('notifications');
      const n = W.notifs.find(x => x.unread) || W.notifs[0]; const was = n.unread;
      S.optFail = true; ACT.toggleRead({ dataset: { id: n.id } });
      ok('the change shows at once', n.unread === !was);
      await wait(700);
      ok('when saving fails it is undone', n.unread === was);
      ok('and a message says so', [...document.querySelectorAll('#toasts > *')].some(t => /Couldn't save/.test(t.textContent)));
      ok('the failure switch is one-shot', !S.optFail);
      ACT.toggleRead({ dataset: { id: n.id } }); await wait(700); ok('normally the change stays', n.unread === !was);
      ACT.toggleRead({ dataset: { id: n.id } });
    });
    await A('A disabled button\'s reason goes when it becomes available', async () => {
      learner('C'); go('dashboard');
      const b = document.createElement('button'); b.disabled = true; b.dataset.act = 'quizGo'; document.getElementById('main').appendChild(b);
      dtipPass(document.getElementById('app')); ok('reason added', b.title === 'This is the first question.', b.title);
      b.disabled = false; document.body.dispatchEvent(new Event('click', { bubbles: true })); await wait(10);
      ok('removed once enabled', !b.hasAttribute('title')); b.remove();
    });
    const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
  })();
})();
