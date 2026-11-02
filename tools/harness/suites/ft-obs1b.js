// OBS-1b — one observation set-up workflow in the programme builder (2 Nov 2026; PD-OBS1B-* in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client: the client demo programme (published Version 1, then a draft Version 2), then the
// legacy data (seeded programmes, Level 3 with its own Academy criteria). Checked: the configuration tab has no criteria cards; the
// NVQ and programme Academy cards are on the location tabs with their controls; NVQ criteria and Academy standards stay separate;
// hidden locations keep their data; published versions and observation records are unchanged.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'OBS-1b test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const radio = (n, v) => { const x = $1(`#modal-root input[name="${n}"][value="${v}"]`); if (x) x.checked = true; };
  const settings = (id, req, wp, off) => { ACT.n5Settings({ dataset: { p: id } }); if (!MODAL) return false; radio('n5-req', req); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  const tabs = pr => cbPanels(pr, 'observations').map(p => p[0]);
  const at = (id, tab) => { go('a-programmes', { id, tab }); return main(); };
  const recs = () => J([Object.values(STORE.worlds).map(w => [w.observations || [], (w.observation || null)]), STORE.d1 || null, STORE.ol1 && STORE.ol1.recs || null]);
  const CD = () => (ADMIN.programmes || []).find(p => p.title === 'Level 3 Diploma in Care Practice (client demo)');

  await T('OBS1B-A published client programme: one workflow', async () => {
    ACA(); const pr = CD(), d = n5Shown(pr), pub0 = J(STORE.n5.pub), r0 = recs();
    ok('OBS1B-A the published version has the three tabs plus events', J(tabs(pr)) === J(['obs', 'wpcrit', 'offcrit', 'events']), J(tabs(pr)));
    at(pr.id, 'obs');
    ok('OBS1B-A1 Observation configuration has no criteria cards (NVQ, Academy standards, old summary)', !$1('main .n5-nvq') && !$1('main .n5-ia') && !$1('main .n5-cover') && !/Academy standards \(this programme/.test(main()) && !/NVQ observation criteria \(from the curriculum/.test(main()));
    ok('OBS1B-A1 it keeps Settings and adds "Criteria by location" with links to both tabs', !!$1('main .n5-settings') && !!$1('main .ol1b-map .ol1b-wp [data-tab="wpcrit"]') && !!$1('main .ol1b-map .ol1b-off [data-tab="offcrit"]'));
    ok('OBS1B-A1 the summary counts each location (3 + 1 NVQ at the workplace; 4 + 1 NVQ at the office)', /3 Academy standards from the library \+ 1 qualification \(NVQ\) criterion/.test($1('main .ol1b-wp').textContent) && /4 Academy standards from the library \+ 1 qualification \(NVQ\) criterion/.test($1('main .ol1b-off').textContent), $1('main .ol1b-map').textContent);
    ok('OBS1B-A1 it says NVQ criteria and Academy standards are kept separate', /kept separate; neither is converted/.test($1('main .ol1b-map').textContent));
    click($1('main .ol1b-wp [data-tab="wpcrit"]'));
    ok('OBS1B-A2 Workplace tab: library criteria ABS-01…03 and, separately, the qualification criteria from the curriculum', ['ABS-01', 'ABS-02', 'ABS-03'].every(c => !!$1(`main .ol1-preview tr[data-code="${c}"]`)) && !$1('main .ol1-preview tr[data-code="ABS-04"]') && $a('main .n5-nvq').length === 1 && /Qualification criteria \(NVQ\) — from the curriculum/.test($1('main .n5-nvq h2').textContent) && !!$1('main .n5-nvq tr[data-code="001 2.1"]'));
    ok('OBS1B-A2 the NVQ code is not a library criterion and no library code is in the NVQ table', !$1('main .ol1-preview tr[data-code="001 2.1"]') && !$a('main .n5-nvq tr[data-code]').some(t => /^ABS/.test(t.dataset.code)));
    ok('OBS1B-A2 no programme Academy card (this programme has none); published: no edit controls', !$1('main .n5-ia') && !$1('main [data-act="n5NvqEv"], main [data-act="n5IaEdit"], main [data-act="ol1Sel"]'));
    at(pr.id, 'offcrit');
    ok('OBS1B-A3 Academy tab: ABS-01…03 inherited + ABS-04, and the qualification criteria; no programme Academy card', ['ABS-01', 'ABS-02', 'ABS-03', 'ABS-04'].every(c => !!$1(`main .ol1-preview tr[data-code="${c}"]`)) && !!$1('main .n5-nvq tr[data-code="001 2.1"]') && !$1('main .n5-ia'));
    ok('OBS1B-A4 viewing changed no configuration or observation record', J(STORE.n5.pub) === pub0 && recs() === r0);
  });

  await T('OBS1B-B draft: the moved controls work; hidden locations keep their data', async () => {
    ACA(); const pr = CD(); ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('Version 2'); const d = n5Shown(pr), pub0 = J(STORE.n5.pub);
    ok('OBS1B-B a new draft must record Observation required again (PD-N5a-03): until then no criteria tabs, and the summary says to choose', d.state === 'Draft' && d.v === 2 && d.required === null && J(tabs(pr)) === J(['obs', 'events']) && (at(pr.id, 'obs'), /Choose "Observation required"/.test($1('main .ol1b-map').textContent)));
    settings(pr.id, 'yes', 'Permitted', 'Available'); ok('OBS1B-B …Yes, workplace and Academy office: both criteria tabs appear', J(tabs(pr)) === J(['obs', 'wpcrit', 'offcrit', 'events']));
    at(pr.id, 'obs'); ok('OBS1B-B1 the draft configuration tab: Edit settings and the checks, no criteria cards', !!$1('main [data-act="n5Settings"]') && !!$1('main .n5-checks') && !$1('main .n5-nvq') && !$1('main .n5-ia') && !$1('main [data-act="n5NvqEv"]'));
    at(pr.id, 'wpcrit'); click($1('main .n5-nvq [data-act="n5NvqEv"][data-c="001 2.1"]'));
    $a('#modal-root .n5-ev').forEach(x => { x.checked = ['notes', 'photos'].includes(x.value); }); $1('#n5n-i').value = 'Observe two care interactions'; press();
    ok('OBS1B-B2 the NVQ evidence editor on the Workplace tab saves to the version (assessor notes + photos)', J(d.nvq['001 2.1'].types) === J(['notes', 'photos']) && d.nvq['001 2.1'].instr === 'Observe two care interactions');
    at(pr.id, 'offcrit'); ok('OBS1B-B2 …and the Academy tab shows the same settings (one set for both locations)', /Photos/.test($1('main .n5-nvq tr[data-code="001 2.1"]').textContent) && /Observe two care interactions/.test($1('main .n5-nvq tr[data-code="001 2.1"]').textContent));
    ok('OBS1B-B2 the published Version 1 is unchanged', J(STORE.n5.pub) === pub0);
    const keep = J([d.nvq, d.ol1, d.ia]);
    settings(pr.id, 'no');
    ok('OBS1B-B3 Observation required: No → only the configuration tab and events; no criteria cards anywhere', J(tabs(pr)) === J(['obs', 'events']) && (at(pr.id, 'obs'), !$1('main .n5-nvq') && /Observation isn't required for this version/.test($1('main .ol1b-map').textContent)));
    ok('OBS1B-B3 …the criteria data is kept', J([d.nvq, d.ol1, d.ia]) === keep);
    settings(pr.id, 'yes', 'Not permitted', 'Available');
    ok('OBS1B-B4 workplace off: no Workplace tab; the Academy tab still has the qualification criteria (data kept)', J(tabs(pr)) === J(['obs', 'offcrit', 'events']) && (at(pr.id, 'offcrit'), !!$1('main .n5-nvq tr[data-code="001 2.1"]')) && J([d.nvq, d.ia]) === J([JSON.parse(keep)[0], JSON.parse(keep)[2]]));
    settings(pr.id, 'yes', 'Permitted', 'Available');
    ok('OBS1B-B5 both on again: the tabs and selections come back unchanged', J(tabs(pr)) === J(['obs', 'wpcrit', 'offcrit', 'events']) && J([d.nvq, d.ol1, d.ia]) === keep);
    ACT.resetDemo(); closeModal();
  });

  // ---------------- Legacy data ----------------
  fxLoadLegacy();
  await T('OBS1B-L legacy programmes: nothing lost, historical versions read-only', async () => {
    ACA(); const pub0 = J(STORE.n5.pub), drafts0 = J(STORE.n5.draft), r0 = recs(), seen = [];
    (ADMIN.programmes || []).filter(p => n5Shown(p)).forEach(pr => {
      const d = n5Shown(pr), t = tabs(pr), nvq = n5Nvq(pr, d).length, ia = (d.ia || []).length, where = { nvq: [], ia: [] };
      t.filter(x => ['obs', 'wpcrit', 'offcrit'].includes(x)).forEach(x => { at(pr.id, x); if ($1('main .n5-nvq')) where.nvq.push(x); if ($1('main .n5-ia')) where.ia.push(x); });
      seen.push([pr.id, d.state, d.required, t.join('/'), where.nvq.join('/'), where.ia.join('/'), nvq, ia]);
    });
    ok('OBS1B-L1 every published version with NVQ criteria shows them (on the configuration tab when it has no location tab, otherwise on each location tab); a draft shows them once its locations are recorded', seen.every(([, st, req, t, wn, , n]) => !n || (/wpcrit|offcrit/.test(t) ? wn === t.split('/').filter(x => x === 'wpcrit' || x === 'offcrit').join('/') : st === 'Draft' && req !== true ? wn === '' : wn === 'obs')), J(seen));
    ok('OBS1B-L1 programme Academy criteria appear in exactly one place, never on the Academy tab', seen.every(([, st, req, t, , wi, , n]) => !n || (/wpcrit/.test(t) ? wi === 'wpcrit' : st === 'Draft' && req !== true ? wi === '' : wi === 'obs')), J(seen));
    const l3 = seen.find(s => s[0] === 'NV-L3'); ok('OBS1B-L1 Level 3 (published before the library) keeps its own IA criteria visible', !!l3 && l3[7] >= 4 && l3[5] !== '', J(l3));
    ok('OBS1B-L2 browsing changed no published configuration, draft or observation record', J(STORE.n5.pub) === pub0 && J(STORE.n5.draft) === drafts0 && recs() === r0);
  });
  await T('OBS1B-L3 a legacy draft with its own Academy criteria: the card is on the Workplace tab, fully editable', async () => {
    ACA(); const pr = s3Pr('NV-L3'); ACT.s3WizVersion({ dataset: { id: pr.id } }); if (MODAL) reason('Version for OBS-1b');
    if (!n5DraftV(pr)) { ACT.newProgVersion && ACT.newProgVersion({ dataset: { id: pr.id } }); if (MODAL) reason('Version for OBS-1b'); }
    const d = n5Shown(pr); settings(pr.id, 'yes', 'Permitted', 'Available');
    at(pr.id, 'obs'); ok('OBS1B-L3 configuration tab: no IA card; the summary counts the programme Academy criteria at the workplace only', d.state === 'Draft' && !$1('main .n5-ia') && /programme Academy criteria/.test($1('main .ol1b-wp').textContent) && !/programme Academy/.test($1('main .ol1b-off').textContent), main().slice(0, 200));
    at(pr.id, 'wpcrit');
    ok('OBS1B-L3 Workplace tab: "Programme Academy criteria (earlier set-up)" with IA-1…IA-4, their NVQ mapping and Edit / Retire / Add', /Programme Academy criteria \(earlier set-up\)/.test($1('main .n5-ia h2').textContent) && ['IA-1', 'IA-2', 'IA-3', 'IA-4'].every(c => !!$1(`main .n5-ia tr[data-code="${c}"]`)) && !!$1('main .n5-ia [data-act="n5IaEdit"][data-c="IA-1"]') && !!$1('main .n5-ia [data-act="n5IaState"]') && !!$1('main .n5-ia [data-act="n5IaEdit"][data-c=""]'));
    click($1('main .n5-ia [data-act="n5IaEdit"][data-c="IA-1"]')); ok('OBS1B-L3 the mapping editor lists this version\'s NVQ criteria', $a('#modal-root .n5-map').length >= 1); closeModal();
    at(pr.id, 'offcrit'); ok('OBS1B-L3 Academy tab: no programme Academy card, and it says they apply at the workplace only', !$1('main .n5-ia') && /apply at the workplace only/.test(main()));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
