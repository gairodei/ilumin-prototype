// UX polish v2 — Phase 4 checks (clarity and language).
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; S.edge = 'none'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };

  T('Glossary', () => {
    learner('C'); go('progress');
    const gl = [...document.querySelectorAll('main abbr.gl')];
    ok('terms explained on the page', gl.length >= 3, gl.map(a => a.textContent).join());
    ok('every explanation has text', gl.every(a => a.title && a.title.length > 15));
    ok('never inside controls, chips, tables or headings', gl.every(a => !a.parentElement.closest('button, a, .chip, table, h1, h2, h3, .tbd, input, textarea')));
    ok('keyboard can reach an explanation', gl.every(a => a.tabIndex === 0));
    const terms = gl.map(a => a.textContent.toLowerCase()); ok('each term explained once per page', terms.length === new Set(terms).size, terms.join());
    go('assignment', { id: (W.assignments.find(a => a.status === 'Not Started') || W.assignments[0]).id });
    ok('nothing added inside the answer sheet', !document.querySelector('main .rte abbr.gl, main .paper abbr.gl'));
  });

  T('Status tooltips', () => {
    learner('C'); const tip = h => { const t = document.createElement('template'); t.innerHTML = h; return (t.content.firstElementChild || {}).title || ''; }; ok('learner "Submitted" says what happens next', /assessor is marking it\. You'll be notified when feedback is released/.test(tip(chip('Submitted'))), tip(chip('Submitted')));
    ok('"Expiring soon" explains the thresholds', /30 days for a bundle, 60 days for a certificate/.test(tip(chip('Expiring soon'))));
    ok('status label unchanged', />Submitted<\/span>$/.test(chip('Submitted')));
  });

  T('Release confirmation states the consequence', () => {
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; ACT.simMark();
    const key = relKeyOfWorld('C', 'a4'); relConfirm([key]);
    ok('names the learner', MODAL && MODAL.body.includes(VNAME('C')));
    ok('says it can\'t be undone', MODAL && /can't be undone/.test(MODAL.body));
    closeModal();
  });

  T('Decision previews', () => {
    acaEnter('KA'); S.signedIn = true;
    const i = allQueue().find(x => /More time/.test(x.type) && isOpen(x) && x.req && x.v);
    if (i) { go('a-queue', { id: i.id }); const c = [...document.querySelectorAll('main .q-conseq')].map(x => x.textContent).join(' | '); ok('extension shows the new end date and that progress is kept', /new end date \d{1,2} [A-Z][a-z]{2} \d{4}/.test(c) && /progress is kept/.test(c), c.slice(0, 160)); }
    SA(); go('a-queue', { id: 'AQ-1024' }); ok('discount change shows only what changes', /What changes/.test(main()));
  });

  T('Blocked decisions name the decider', () => {
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
    const i = allQueue().find(x => isOpen(x) && isMine(x)); if (!i) { ok('Finance has an item it raised', false); return; }
    go('a-queue', { id: i.id });
    ok('"You raised this, so another approver decides"', /You raised this, so another approver decides/.test(main()));
    ok('one notice, not several', (main().match(/You cannot approve an item you raised|You raised this/g) || []).length === 1, (main().match(/You cannot approve an item you raised|You raised this/g) || []).length);
  });

  T('Learner reassurance', () => {
    learner('C'); const po = W.payOverdue;
    S.edge = 'paused'; go('dashboard');
    const ban = [...document.querySelectorAll('#app .banner')].find(b => /Access paused/.test(b.textContent));
    ok('paused banner says how access comes back', ban && /access comes back straight away/.test(ban.textContent));
    if (po) ok('paused banner uses the real overdue row', ban && ban.textContent.includes(po.label || 'Instalment ' + po.n));
    S.edge = 'none';
    const sub = W.assignments.find(a => a.status === 'Submitted'); if (sub) { go('assignment', { id: sub.id }); ok('no "Under Review" step (not an assignment status)', !/Under Review/.test(main())); }
    learner('B'); setEdge('seatReleased'); go('admission'); ok('"Seat released" offers a next step: Sign up again (P-32: was Message the Academy)', !!document.querySelector('[data-act="chSignAgain"]')); setEdge('none');
  });

  T('Agency decline attribution', () => {
    agyEnter('AG-02', true); S.signedIn = true; go('g-learners');
    const c = agyConsents().find(x => x.status === 'Declined' && x.agency === AGN());
    ok('declined link request says who declined', !c || /declined by the (learner|Academy)/.test(main()));
  });

  T('One marker for demo messages', () => {
    toast('Receipt RCP-1 downloaded (simulated).'); const t = [...document.querySelectorAll('#toasts .toast')].pop();
    ok('"(simulated)" becomes "Demo only:"', t && /^Demo only: Receipt RCP-1 downloaded\./.test(t.textContent.trim()), t && t.textContent);
  });

  T('Legends', () => {
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-dashboard'); ok('five-state key where five-state bars appear', !document.querySelector('main .five') || !!document.querySelector('main .five-legend'));
  });

  T('Self-approval in the decision path', () => {
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
    const i = allQueue().find(x => isOpen(x) && isMine(x)); if (!i) { ok('Finance has an item it raised', false); return; }
    const st = i.status, h = i.history.length; const r = applyDecision(i, 'approve', 'Test', {});
    ok('applyDecision refuses an item you raised', r === false && i.status === st && i.history.length === h, i.status);
    SA(); const own = allQueue().find(x => x._sa || x.saImmediate); ok('Super Admin own actions still applied immediately', !own || own.status === 'Approved');
    // The record pages open in the learner-side shell (screen index / demo panel / ACT.scOpen); the admin shell redirects non-admin routes to its dashboard
    ACT.scOpen(); go('cd-log');
    const sec = [...document.querySelectorAll('main section')].find(s => (s.querySelector('h2') || {}).textContent === 'UX polish v2 — defects fixed');
    const row = sec && [...sec.querySelectorAll('tbody tr')].find(tr => /Self-approval enforced only in the UI/.test(tr.textContent));
    const shown = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    ok('Decisions Log page is open', S.route === 'cd-log' && /Client Decisions Log/.test(document.querySelector('main h1').textContent), S.route);
    ok('Decisions Log shows the entry with the server note, visible on the page', shown(row) && /Fixed/.test(row.textContent) && /Production must enforce this on the server/.test(row.textContent), row ? row.textContent.slice(0, 120) : 'no row');
  });
  T('Remaining Phase 4 items', () => {
    learner('C'); W.me.tz = 'Asia/Kolkata'; go('profile', { tab: 'preferences' }); const tz = document.querySelector('main #pf-tz'); ok('India time zone offered and selected', tz && tz.value === 'Asia/Kolkata', tz && tz.value); W.me.tz = 'Europe/London';
    bizEnter('BA'); S.signedIn = true; const li = allQueue().find(x => x.type === 'Link existing learner to agency' && isOpen(x) && (!x.data || !x.data.consentAt));
    if (li) { go('a-queue', { id: li.id }); const b = document.querySelector('main [data-act="qDo"][data-a="approve"]'); ok('link Approve disabled with an inline reason', b && b.disabled && /Can't approve yet/.test(main()), b && String(b.disabled)); }
    go('a-bundles'); ok('"floor" not used in Bundles & Pricing copy', !/\bfloor\b/i.test(main()));
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-dashboard'); const dots = document.querySelectorAll('main .ap-sev'); ok('every coordinator severity dot has a text label', [...dots].every(d => d.nextElementSibling && d.nextElementSibling.classList.contains('sev-lbl') && d.nextElementSibling.textContent.trim()));
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
