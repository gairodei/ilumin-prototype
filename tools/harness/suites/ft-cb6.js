// CB6 — Observation events (21 Oct 2026, PD-CB-40…43). Each programme version's observation configuration holds its required
// observation events (name, permitted locations, criteria covered, evidence), edited only in a draft through N5a's gate and audit,
// published and frozen with the version; coverage problems block publishing; not applicable when the course has no observations.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const mroot = () => document.querySelector('#modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB6 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const COO = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; };
  const open = (id, tab = 'events') => go('a-programmes', { id, tab });
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const J = o => JSON.stringify(o);
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const settings = (id, req, wp, off) => { ACT.n5Settings({ dataset: { p: id } }); if (!MODAL) return false; if (req) radio('n5-req', req); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  const tick = (sel, vals) => document.querySelectorAll('#modal-root ' + sel).forEach(x => { if (!x.disabled) x.checked = vals.includes(x.value); });
  const D = id => STORE.n5.draft[id], P = (id, v) => (STORE.n5.pub[id] || {})[v];
  const nvqOf = id => n5NvqOk(s3Pr(id), n5Draft(s3Pr(id))).map(c => c.code);
  const event = (id, o) => { ACT.cbObsEv({ dataset: { p: id, e: o.e || '' } }); if (!MODAL) return 'no dialog'; if (o.name != null) document.querySelector('#ev-n').value = o.name; if (o.loc) tick('.ev-l', o.loc); if (o.crit) tick('.ev-c', o.crit); if (o.ev) tick('.ev-e', o.ev); return press(); };
  const addIa = (id, t) => { ACT.n5IaEdit({ dataset: { p: id, c: '' } }); if (!MODAL) return; document.querySelector('#n5-t').value = t; tick('.n5-ev', ['notes']); press(); };
  const hist = () => J({ obs: Object.values(STORE.worlds).map(w => w.observations || []), tas: STORE.tas ? STORE.tas.obs : null, crit: Object.values(STORE.worlds).map(w => (w.tree || []).map(u => u.mods.map(m => m.los.map(l => l.crit.map(c => [c.code, c.st, c.obs || null]))))) });

  /* ================= A. Where the events live ================= */
  await T('CB6-A the Observation events panel', async () => {
    fresh(); SA(); open('NV-L3');
    ok('CB6-A Section 4 has "Observation events" next to the configuration; the .events link opens it', (q('.cb-sec.cur') || {}).dataset.tab === 'observations' && qa('.cb-panels .tab').map(t => t.textContent).join('|') === 'Observation configuration|Observation events|Shared library (legacy)' && q('.cb-panels .tab[aria-selected="true"]').dataset.tab === 'events');
    ok('CB6-A published Level 3 (migrated): read-only, "no events were recorded" (nothing invented), locations "Not recorded"', /No observation events were recorded for Version 2/.test(main()) && !q('[data-act="cbObsEv"]') && /Not recorded/.test(q('.cb-locs').textContent) && cbObsEventsFor('NV-L3', 2).length === 0);
    ok('CB6-A no observation fee controls in this section', !/£|GBP/.test(q('.cb-ev').textContent) && /Observation fees are set in Section 5/.test(main()));
  });

  /* ================= B. Add, edit, reorder, remove in a draft ================= */
  await T('CB6-B events in a draft', async () => {
    fresh(); SA(); settings('NV-L3D', 'yes', 'Permitted', 'Available'); open('NV-L3D'); const c = nvqOf('NV-L3D'), a0 = ADMIN.audit.length;
    ok('CB6-B draft: Permitted locations card and "Add observation event"', /Workplace/.test(q('.cb-locs').textContent) && /Permitted/.test(q('.cb-locs').textContent) && !!q('[data-act="cbObsEv"][data-e=""]'));
    q('[data-act="cbObsEv"][data-e=""]').click(); ok('CB6-B the dialog offers only permitted locations, the version\'s NVQ observation criteria and Academy criteria, and the evidence types', [...mroot().querySelectorAll('.ev-l')].every(x => !x.disabled) && mroot().querySelectorAll('.ev-c').length === c.length + D('NV-L3D').ia.filter(x => x.status === 'Active').length && mroot().querySelectorAll('.ev-e').length === N5_EV.length); closeModal();
    event('NV-L3D', { name: 'Observation 1 — communication', loc: ['workplace'], crit: c.slice(0, 3), ev: ['notes', 'photos'] });
    event('NV-L3D', { name: 'Observation 2 — leading a shift', loc: ['workplace', 'office'], crit: c.slice(3), ev: ['notes'] });
    const evs = D('NV-L3D').events;
    ok('CB6-B two events added in Version 1 (draft), audited', evs.length === 2 && evs[0].name === 'Observation 1 — communication' && J(evs[1].loc) === J(['workplace', 'office']) && since(a0).filter(x => x.action === 'Observation event added').length === 2);
    open('NV-L3D'); ok('CB6-B listed with the count ("2 observations") and full coverage', qa('.cb-ev tbody tr').length === 2 && /2 observations/.test(q('.cb-ev').textContent) && new RegExp(`covered by events: ${c.length}`).test(main()));
    event('NV-L3D', { e: evs[1].id, name: 'Observation 2 — team leadership' }); ok('CB6-B edit: renamed, audited before → after', evs[1].name === 'Observation 2 — team leadership' && ADMIN.audit[0].action === 'Observation event changed');
    ACT.cbObsEvMove({ dataset: { p: 'NV-L3D', e: evs[1].id, dir: '-1' } }); ok('CB6-B reorder', D('NV-L3D').events[0].name === 'Observation 2 — team leadership' && ADMIN.audit[0].action === 'Observation events reordered');
    ACT.cbObsEvRemove({ dataset: { p: 'NV-L3D', e: D('NV-L3D').events[1].id } }); reason('Merged');
    ok('CB6-B remove (with a reason), audited', D('NV-L3D').events.length === 1 && ADMIN.audit[0].action === 'Observation event removed');
  });

  /* ================= C. Validation ================= */
  await T('CB6-C event validation', async () => {
    fresh(); SA(); settings('NV-L3D', 'yes', 'Permitted', 'Not available'); addIa('NV-L3D', 'Dignity and respect'); const c = nvqOf('NV-L3D'), ia = D('NV-L3D').ia.filter(x => x.status === 'Active').map(x => x.code);
    ok('CB6-C a name is required', event('NV-L3D', { name: '', loc: ['workplace'], crit: c, ev: ['notes'] }) === false); closeModal();
    event('NV-L3D', { name: 'Observation 1', loc: ['workplace'], crit: c, ev: ['notes'] });
    ok('CB6-C (negative) a duplicate name is refused', event('NV-L3D', { name: 'observation 1', loc: ['workplace'], crit: c, ev: ['notes'] }) === false); closeModal();
    ACT.cbObsEv({ dataset: { p: 'NV-L3D', e: '' } }); const off = mroot().querySelector('.ev-l[value="office"]');
    ok('CB6-C a location the version doesn\'t permit (Academy office "Not available") can\'t be ticked', off.disabled); off.disabled = false; off.checked = true; mroot().querySelector('.ev-l[value="workplace"]').checked = false; document.querySelector('#ev-n').value = 'Office only'; tick('.ev-c', c); tick('.ev-e', ['notes']);
    ok('CB6-C (negative) …a forced unpermitted location is refused at save', prim() === false && D('NV-L3D').events.length === 1); closeModal();
    ok('CB6-C (negative) no criteria refused', event('NV-L3D', { name: 'Empty', loc: ['workplace'], crit: [], ev: ['notes'] }) === false); closeModal();
    ok('CB6-C (negative) no evidence refused', event('NV-L3D', { name: 'No evidence', loc: ['workplace'], crit: c, ev: [] }) === false); closeModal();
    settings('NV-L3D', null, null, 'Available');
    ok('CB6-C (negative) Academy criteria on an office-only event refused (workplace observations only)', ia.length > 0 && event('NV-L3D', { name: 'Office', loc: ['office'], crit: [c[0], ia[0]], ev: ['notes'] }) === false); closeModal();
    ok('CB6-C an office-only event covering NVQ criteria is accepted', event('NV-L3D', { name: 'Office', loc: ['office'], crit: [c[0]], ev: ['notes'] }) !== false && D('NV-L3D').events.length === 2);
  });

  /* ================= D. Coverage checks before publishing ================= */
  await T('CB6-D coverage blockers', async () => {
    fresh(); SA(); const p = s3Pr('NV-L3D'); settings('NV-L3D', 'yes', 'Permitted', 'Available'); addIa('NV-L3D', 'Dignity and respect'); const c = nvqOf('NV-L3D');
    ok('CB6-D required with no events: blocking', n5Check(p).block.some(b => /at least one observation event/.test(b)));
    event('NV-L3D', { name: 'Partial', loc: ['workplace'], crit: c.slice(0, 2), ev: ['notes'] });
    ok('CB6-D criteria not covered by any event: blocking, named', n5Check(p).block.some(b => /aren't covered by any observation event/.test(b) && b.includes(c[2])));
    event('NV-L3D', { name: 'Rest', loc: ['workplace'], crit: c.slice(2), ev: ['notes'] });
    ok('CB6-D every criterion covered: no event blockers', !n5Check(p).block.some(b => /observation event|event "/.test(b)));
    ok('CB6-D Academy criteria not in any event: a warning (not blocking)', n5Check(p).warn.some(w => /Academy criteri.* in any observation event/.test(w)));
    settings('NV-L3D', null, 'Not permitted', null);
    ok('CB6-D a location later made not permitted: the events using it block publishing', n5Check(p).block.some(b => /uses a location this version doesn't permit: Workplace/.test(b)));
    settings('NV-L3D', null, 'Permitted', null); const at = (() => { const t = s3ViewTree('NV-L3D'); for (const u of t) for (const m of u.mods) for (const lo of m.los) for (const x of lo.crit) if (x.code === c[0]) return { u: u.code, m: m.code, lo: lo.code, c: x.code }; })();
    ACT.nodeState({ dataset: { p: 'NV-L3D', ...at } }); document.querySelector('#ns').value = 'Retired'; reason('Retire criterion');
    ok('CB6-D a criterion retired in the curriculum: the event covering it blocks publishing (stale)', n5Check(p).block.some(b => /covers criteria that aren't active in this version: /.test(b) && b.includes(c[0])));
    open('NV-L3D'); ok('CB6-D the blockers are listed in the panel and badge the section', !!q('.cb-ev-checks') && !!q('.cb-sec[data-tab="observations"] .cb-badge.bad'));
  });

  /* ================= E. "No observations" ================= */
  await T('CB6-E not applicable when the course has no observations', async () => {
    fresh(); SA(); settings('NV-L3D', 'yes', 'Permitted', 'Available'); event('NV-L3D', { name: 'Kept', loc: ['workplace'], crit: nvqOf('NV-L3D'), ev: ['notes'] });
    cbObsSet(s3Pr('NV-L3D'), false); open('NV-L3D');
    ok('CB6-E "No observations": not applicable, no Add button, the existing event kept (listed for history) with a warning', /Not applicable — this course has no observations/.test(main()) && !q('[data-act="cbObsEv"][data-e=""]') && D('NV-L3D').events.length === 1 && n5Check(s3Pr('NV-L3D')).warn.some(w => /kept in this version for history/.test(w)));
    const a0 = ADMIN.audit.length; ACT.cbObsEv({ dataset: { p: 'NV-L3D', e: '' } }); ok('CB6-E (negative) adding an event is refused and logged', !MODAL && blocked(a0, /observation not required/));
    ok('CB6-E no event blocker while observation isn\'t required', !n5Check(s3Pr('NV-L3D')).block.some(b => /observation event/.test(b)));
  });

  /* ================= F. Published with the version, frozen; learner records untouched ================= */
  await T('CB6-F publishing freezes the events', async () => {
    fresh(); SA(); const h0 = hist(), pr = s3Pr('NV-L3'); ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('v3');
    settings('NV-L3', 'yes', 'Permitted', 'Available'); const d = n5Draft(pr), c = n5NvqOk(pr, d).map(x => x.code);
    c.forEach(code => { ACT.n5NvqEv({ dataset: { p: 'NV-L3', c: code } }); tick('.n5-ev', ['notes']); press(); });
    d.ia.filter(x => x.status === 'Active').forEach(x => { ACT.n5IaEdit({ dataset: { p: 'NV-L3', c: x.code } }); tick('.n5-ev', ['notes']); tick('.n5-map', [c[0]]); press(); });
    event('NV-L3', { name: 'Workplace observation', loc: ['workplace'], crit: c.concat(d.ia.filter(x => x.status === 'Active').map(x => x.code)), ev: ['notes'] });
    ok('CB6-F Version 2 (published) is unaffected by the Version 3 draft\'s events', cbObsEventsFor('NV-L3', 2).length === 0);
    ACT.kPubProg({ dataset: { id: 'NV-L3' } }); reason('Publish v3');
    const p3 = P('NV-L3', 3);
    ok('CB6-F published: Version 3\'s configuration carries the event, frozen', pr.version === 3 && !!p3 && cbObsEventsFor('NV-L3', 3).length === 1 && Object.isFrozen(p3.events[0]) && Object.isFrozen(p3.events));
    const a0 = ADMIN.audit.length; ACT.cbObsEv({ dataset: { p: 'NV-L3', e: p3.events[0].id } });
    ok('CB6-F (negative) changing a published version\'s event is refused and logged', !MODAL && blocked(a0, /change an observation event/) && J(P('NV-L3', 3).events) === J(p3.events));
    open('NV-L3'); ok('CB6-F published panel: read-only, lists the event', /Workplace observation/.test(q('.cb-ev').textContent) && !q('[data-act="cbObsEv"]') && /Published — read-only/.test(main()));
    ok('CB6-F no learner observation record or criterion judgement changed', hist() === h0);
    ok('CB6-F other programmes untouched (Level 3 2027 update has no events)', cbEvOf(n5Shown(s3Pr('NV-L3D'))).length === 0);
  });

  /* ================= G. Role checks ================= */
  await T('CB6-G unauthorized direct calls', async () => {
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', () => learner('C')], ['an Academic Coordinator', COO]].forEach(([who, enter]) => {
      fresh(); SA(); settings('NV-L3D', 'yes', 'Permitted', 'Available'); event('NV-L3D', { name: 'E1', loc: ['workplace'], crit: nvqOf('NV-L3D'), ev: ['notes'] });
      const id = D('NV-L3D').events[0].id, s0 = J(D('NV-L3D').events); enter(); const a0 = ADMIN.audit.length; let opened = 0;
      [() => ACT.cbObsEv({ dataset: { p: 'NV-L3D', e: '' } }), () => ACT.cbObsEv({ dataset: { p: 'NV-L3D', e: id } }), () => ACT.cbObsEvMove({ dataset: { p: 'NV-L3D', e: id, dir: '1' } }), () => ACT.cbObsEvRemove({ dataset: { p: 'NV-L3D', e: id } })].forEach(f => { closeModal(); f(); if (MODAL) opened++; closeModal(); });
      ok(`CB6-G (negative) ${who}: add, edit, reorder and remove refused — no dialog, nothing changed, each logged`, opened === 0 && J(D('NV-L3D').events) === s0 && since(a0).filter(a => /^Blocked/.test(a.action)).length >= 4);
    });
    [['Super Admin', SA], ['System Admin', SYS], ['Academic Admin', ACA]].forEach(([who, enter]) => { fresh(); SA(); settings('NV-L3D', 'yes', 'Permitted', 'Available'); enter(); event('NV-L3D', { name: 'By ' + who, loc: ['workplace'], crit: nvqOf('NV-L3D'), ev: ['notes'] }); ok(`CB6-G (positive) ${who}: adds an event`, D('NV-L3D').events.length === 1); });
    fresh(); SA(); settings('NV-L3D', 'yes', 'Permitted', 'Available'); ACT.cbObsEv({ dataset: { p: 'NV-L3D', e: '' } }); document.querySelector('#ev-n').value = 'After sign-out'; tick('.ev-c', nvqOf('NV-L3D')); setAdminIdentity('FA'); const a9 = ADMIN.audit.length; prim();
    ok('CB6-G a role change while the dialog is open: not saved, logged', !(D('NV-L3D').events || []).length && blocked(a9)); closeModal();
    fresh(); SA(); const a1 = ADMIN.audit.length; ACT.cbObsEv({ dataset: { p: 'NV-L3O', e: '' } }); ok('CB6-G (negative) a retired programme: refused, logged', !MODAL && blocked(a1));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
