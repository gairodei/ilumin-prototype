// Client Feedback 2.0 (PD-CF2-*), full legacy test data: the Assessor Portfolio reads actual records for every staff-side learner (no
// hashed states, no invented verifiers) and is unchanged for learners with a learner record; agency NVQ applications use the programme's
// checklist; navigation; Create batch on a legacy programme (scratch default, no placeholders) and legacy batch timetables unchanged.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'CF2L test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); buildAdmin('A'); };

  await T('CF2L-A1 Assessor Portfolio from actual records', async () => {
    fresh(); let cells = 0, diff = [], fake = [], unit = [], learners = 0, live = 0, liveDiff = [];
    Object.keys(TAS_USERS).forEach(k => { TCH(k); if (CAN('portfolio') !== 'yes') return; tasLearners().filter(l => !l.short).forEach(L => {
      go('t-portfolio', { id: L.lid }); const rows = $a('main .cf2-pfc');
      if (L.v) { live++; const tree = STORE.worlds[L.v].tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))); rows.forEach(r => { const c = tree.find(x => x.code === r.dataset.code); if (!c || r.dataset.st !== c.st) liveDiff.push([L.lid, r.dataset.code]); if (/verified by/.test(r.textContent) && !c.lock) fake.push([L.lid, r.dataset.code]); }); return; }
      learners++; const rec = co1Rec(L);
      rows.forEach(r => { cells++; const code = r.dataset.code, want = (rec && rec.st[code]) || 'No record'; if (r.dataset.st !== want) diff.push([L.lid, code, r.dataset.st, want]); if (/verified by/.test(r.textContent) && !STORE.tas.locks[L.lid + '|' + code]) fake.push([L.lid, code]); });
      $a('main .cf2-pfu').forEach(u => { const ach = $a(`main .cf2-pfu[data-unit="${u.dataset.unit}"] .cf2-pfc[data-st="Achieved"]`).length; if (+u.dataset.ach !== ach) unit.push([L.lid, u.dataset.unit]); });
    }); });
    ok('CF2L-A1-1 every staff-side learner\'s portfolio cell equals their criterion record (No record where there is none)', learners > 20 && cells > 500 && !diff.length, J({ learners, cells, diff: diff.slice(0, 4) }));
    ok('CF2L-A1-2 "verified by" appears only with a real verification lock', !fake.length, J(fake.slice(0, 4)));
    ok('CF2L-A1-3 the unit summaries count the same states', !unit.length, J(unit.slice(0, 4)));
    ok('CF2L-A1-4 learners with a learner record keep their own criterion states', live > 0 && !liveDiff.length, J({ live, liveDiff: liveDiff.slice(0, 4) }));
    const L = (() => { for (const k of Object.keys(TAS_USERS)) { TCH(k); if (CAN('portfolio') !== 'yes') continue; const x = tasLearners().find(l => !l.short && !l.v && co1Rec(l) && co1Rec(l).crits.some(c => !co1Rec(l).st[c.code])); if (x) return x; } return null; })();
    if (L) { go('t-portfolio', { id: L.lid }); ok('CF2L-A1-5 an unassessed criterion shows "No record" and no evidence or verifier is invented', /No record/.test(main()) && $a('main .cf2-pfc[data-st="No record"]').every(r => !/verified by/.test(r.textContent) && /none yet/.test(r.textContent))); }
  });

  await T('CF2L-A2 agency NVQ applications from the programme checklist', async () => {
    fresh(); const apps = (allApplications(), ADMIN.apps || []).filter(a => a.agySeat), bad = [];
    apps.forEach(ap => { const pid = s4PidOfTitle(ap.programme), want = s4ItemsFor(pid, (ap.cf2Ck || {}).country || 'United Kingdom'); if (!ap.cf2Ck || ap.docs.length !== want.length || ap.docs.some((d, k) => d.name !== want[k].name || d.mand !== want[k].mand)) bad.push(ap.id); });
    ok('CF2L-A2-1 every agency NVQ application lists its programme\'s checklist with the items\' own mandatory flags (no forced mandatory)', apps.length > 0 && !bad.length && apps.some(ap => ap.docs.some(d => !d.mand)), J({ n: apps.length, bad }));
    SA(); const pid = 'NV-L2', L0 = s4List(pid), k = L0.items.findIndex(i => i.status === 'Active' && /Enhanced DBS/.test(i.name)), keep = J(apps.map(a => a.docs.map(d => [d.name, d.mand])));
    // CDA-A3 (PD-CDA-A03): NV-L2 is published — its list changes only in a new version, which this dataset can't publish (Finance gate);
    // the change is prepared the way the client demo's set-up does (CDA_FIXTURE). Publication itself is checked in ft-cda.js (CDA-A3-4).
    go('a-programmes', { id: pid }); CDA_FIXTURE = true; try { ACT.s4CkEdit({ dataset: { p: pid, i: String(k) } }); $1('#ck-m').value = '0'; reason('CF2L: DBS optional for this programme'); } finally { CDA_FIXTURE = false; }
    const L = learnerById(apps[0].lid), ap = ag1NvqApp({ id: 'AS-CF2L', kind: 'nvq', course: apps[0].programme, lid: apps[0].lid, learner: apps[0].name, agency: apps[0].agency, at: now().toISOString(), status: 'Admission pending', bundle: null }, L, null, true);
    ok('CF2L-A2-2 Enhanced DBS made optional on the programme is optional for a new agency applicant; existing applications keep their copy', !ap.docs.find(d => /Enhanced DBS/.test(d.name)).mand && ap.cf2Ck.v === L0.v && J(apps.map(a => a.docs.map(d => [d.name, d.mand]))) === keep);
  });

  await T('CF2L-E1 navigation and legacy timetables', async () => {
    fresh(); SA(); const g = ANAV.flatMap(x => x[1]);
    ok('CF2L-E1-1 Super Admin menu: one "Observation Criteria" entry (two tabs); the legacy list stays reachable from it', g.filter(x => x[0] === 'k-ocl').length === 1 && !g.some(x => x[0] === 'k-obslib'));
    go('k-ocl'); ok('CF2L-E1-2 the tabs are on the page', !!$1('main .cf2-octabs [data-go="k-obslib"]'));
    const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'); ok('CF2L-B-1 seeded batches keep their timetable (no builder record; their own events)', !!b && !b.cf2Sched && batchEvents0(b).length > 0);
  });

  // (Create batch can't run on the legacy data: no legacy programme is offered for new batches (M-J, PD-CR-05). The builder is tested on
  // the client demo, ft-cf2.js CF2-B.)

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
