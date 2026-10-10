// UX polish v2 — Phase 2 checks (design system) and the three corrections of 10 Oct 2026.
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const viewer = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ---------- Correction 2: IQA findings stay teal #0F766E, distinct from blue ("In Progress") ----------
  T('IQA teal', () => {
    iqaEnter('QA'); S.signedIn = true; S.ui = {};
    const f = (ADMIN.iqa || [])[0]; if (f) go('q-finding', { id: f.id }); else go('q-records');
    let b = document.querySelector('main .iqa-badge, main .iqa-finding');
    if (!b) { go('q-records'); b = document.querySelector('main .iqa-badge'); }
    ok('an IQA finding badge is on the page', !!b);
    const blue = document.createElement('span'); blue.className = 'chip t-blue'; document.body.appendChild(blue);
    const blueC = getComputedStyle(blue).color; blue.remove();
    const badge = document.createElement('span'); badge.className = 'iqa-badge'; document.body.appendChild(badge);
    const bc = getComputedStyle(badge).borderTopColor; badge.remove();
    const card = document.createElement('div'); card.className = 'iqa-finding'; document.body.appendChild(card);
    const lc = getComputedStyle(card).borderLeftColor; card.remove();
    ok('.iqa-badge border is teal #0F766E', bc === 'rgb(15, 118, 110)', bc);
    ok('.iqa-finding left border is teal #0F766E', lc === 'rgb(15, 118, 110)', lc);
    ok('teal differs from blue (In Progress)', bc !== blueC && lc !== blueC, blueC);
    ok('"In Progress" chip is blue', /t-blue/.test(chip('In Progress')));
  });

  // ---------- Correction 3: viewer-local time for staff portals and public pages ----------
  T('Time zones', () => {
    SA(); ok('admin portal uses the browser zone', curTZ() === viewer, curTZ() + ' vs ' + viewer);
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; ok('coordinator uses the browser zone', curTZ() === viewer, curTZ());
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; ok('teacher / assessor uses the browser zone', curTZ() === viewer, curTZ());
    ACT.switchRole({ dataset: { r: 'ver' } }); ok('verification page uses the browser zone', curTZ() === viewer, S.route + ' ' + curTZ());
    S.variant = 'B'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; ok('learner keeps their country zone', curTZ() === W.me.tz, curTZ() + ' / ' + W.me.tz);
    agyEnter('AG-02', true); S.signedIn = true; ok('agency keeps its own zone', curTZ() === AGY_TZ(), curTZ());
  });

  // ---------- Decision template: page order is asked → decision → context ----------
  T('Decision template', () => {
    SA(); const i = allQueue().find(x => isOpen(x) && x.type === 'Refund' && !selfBlocked(x)) || allQueue().find(x => isOpen(x));
    go('a-queue', { id: i.id });
    const q3 = document.querySelector('main .q3'); ok('three-part layout', !!q3);
    const kids = q3 ? [...q3.children].map(c => c.className.split(' ')[1] || c.className) : [];
    ok('DOM order: asked, decision, context', kids.join() === 'q3-asked,q3-decide,q3-context', kids.join());
    const first = document.querySelector('main [data-act="qDo"]'); ok('first decision button is a real decision (not Add note)', first && first.dataset.a !== 'note', first && first.dataset.a);
    ok('options show their consequence', document.querySelectorAll('main .q-conseq').length > 0);
    ok('decision panel is sticky on desktop', getComputedStyle(document.querySelector('main .q3-decide')).position === 'sticky');
  });

  // Every open item type gets the decision panel (refunds failed before: the Finance refund grid was taken for the main grid)
  T('Decision panel on every item type', () => {
    SA(); const seen = {}, bad = [];
    allQueue().filter(x => isOpen(x)).forEach(x => { if (seen[x.type]) return; seen[x.type] = 1; go('a-queue', { id: x.id }); const hasDec = [...document.querySelectorAll('main section h2')].some(h => h.textContent === 'Decision'); if (hasDec && !document.querySelector('main .q3 > .q3-decide .q-decide')) bad.push(x.type + ' ' + x.id); if (document.querySelector('main .q3') && [...document.querySelectorAll('main section h2')].filter(h => h.textContent === 'Decision').length > 1) bad.push('two Decision panels: ' + x.id); });
    ok('decision panel in the sticky column for every type (' + Object.keys(seen).length + ' types)', !bad.length, bad.join('; '));
  });
  // Documentation pages open in every learner variant (variant B, not yet admitted, locked them before)
  T('Documentation pages in variant B', () => {
    S.variant = 'B'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
    // Check the lock page element, not text: the changelog itself quotes "Programme content is locked".
    const isLocked = () => !!document.querySelector('main .lockpage');
    const docs = Object.keys(SCREENS).filter(r => /^(cd-|fd-|fu-|lu-|tbd-|ux-|demo-scenarios$|design-system$|index$)/.test(r));
    ok('documentation routes found by key', docs.length >= 13, docs.join());
    ok('every documentation route is on the unlock list', docs.every(r => DOC_ROUTES.includes(r)), docs.filter(r => !DOC_ROUTES.includes(r)).join());
    const locked = docs.filter(r => { go(r); return isLocked(); });
    ok('records, audits and Design System open in variant B', !locked.length, locked.join());
    go('assignments'); ok('learner content still locked in variant B', isLocked());
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } });
  });

  // ---------- Design system rules ----------
  T('Chips and colours', () => {
    ok('chip tooltip says what it means', /title="[^"]+"/.test(chip('Submitted')));
    ok('dictionary colour wins', /t-redor/.test(chip('Expired-Incomplete', 'red')));
    ok('purple only for "Added to PD"', Object.entries(TONE).filter(([, t]) => t === 'purple').map(([k]) => k).join() === 'Added to PD', Object.entries(TONE).filter(([, t]) => t === 'purple').map(([k]) => k).join());
    ok('chip icon is SVG (one icon set)', /<svg/.test(chip('Paid')) && !/[✓✕◐○◆●]/.test(chip('Paid')));
    ok('placeholder tooltip', c2s('x').includes('Waiting on the client — content or behaviour may change.') && pend('x').includes('Waiting on the client'));
  });
  T('Formats', () => { SA(); ok('"Sep", never "Sept"', fd('2026-09-14T12:00:00Z') === '14 Sep 2026', fd('2026-09-14T12:00:00Z')); ok('money with currency and pence', money(1250, 'GBP') === '£1,250.00' && money(5800, 'AED').includes('5,800.00')); });
  T('Tables and states', () => {
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('f-overdue', { tab: 'paused' });
    ok('overdue rows: one action + "⋯" menu', !!document.querySelector('main .dt .rowmenu'));
    ok('no primary buttons inside table rows', !document.querySelector('main .dt tbody .btn-primary'));
    ok('named row checkboxes', ![...document.querySelectorAll('main [data-onchange="dtSel"]')].some(x => x.getAttribute('aria-label') === 'Select row'));
    SA(); go('a-messages'); ok('messages empty pane has a next step', /No conversation open/.test(main()) && !!document.querySelector('main .ds-empty button'));
    ACT.scOpen(); go('design-system'); ok('Design System page', /Page templates/.test(main()) && /Status chips/.test(main()));
    go('index'); ok('Design System linked from the screen index', !!document.querySelector('main [data-go="design-system"]'));
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
