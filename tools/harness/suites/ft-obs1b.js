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

  // CBR (PD-CBR-07) supersedes OBS-1b's tabs (configuration / Workplace / Academy / events): one Observations page with the Workplace and
  // Academy locations side by side, the qualification (NVQ) criteria card and any programme Academy criteria card once below them, then
  // the events. What OBS-1b protected is checked on that page: NVQ criteria and library criteria stay separate, each shown once; the
  // evidence editor works; hidden locations keep their data; programme Academy criteria appear in one place; nothing published changes.
  const col = loc => $1(`main .cbr-col[data-loc="${loc}"]`);
  const codes = loc => (col(loc) ? [...col(loc).querySelectorAll('.cbr-critl li .code')].map(x => x.textContent) : []);
  await T('OBS1B-A published client programme: one workflow', async () => {
    ACA(); const pr = CD(), pub0 = J(STORE.n5.pub), r0 = recs();
    at(pr.id, 'obs');
    ok('OBS1B-A one page, no tabs: Workplace and Academy side by side, the qualification criteria, the events', !$1('main .cb-panels') && !!col('wp') && !!col('off') && $a('main .n5-nvq').length === 1 && !!$1('main #cbr-events .cb-ev'));
    ok('OBS1B-A1 Workplace: library criteria ABS-01…03 (frozen with the version), not ABS-04', J(codes('wp')) === J(['ABS-01', 'ABS-02', 'ABS-03']), J(codes('wp')));
    ok('OBS1B-A1 Academy: ABS-01…03 inherited from Workplace (labelled) + ABS-04', J(codes('off')) === J(['ABS-01', 'ABS-02', 'ABS-03', 'ABS-04']) && (col('off').textContent.match(/from Workplace/g) || []).length === 3, J(codes('off')));
    ok('OBS1B-A2 the qualification criterion (001 2.1) is shown once, separately — never as a library criterion; no library code in the NVQ table', !!$1('main .n5-nvq tr[data-code="001 2.1"]') && !codes('wp').concat(codes('off')).includes('001 2.1') && !$a('main .n5-nvq tr[data-code]').some(t => /^ABS/.test(t.dataset.code)) && !!$1('main .cbr2-qual .n5-nvq') && /Qualification criteria from the curriculum/.test($1('main .cbr2-qual summary').textContent) /* CBC2: compact shared section */);
    ok('OBS1B-A2 no programme Academy card (this programme has none); published: no edit controls', !$1('main .n5-ia') && !$1('main [data-act="n5NvqEv"], main [data-act="n5IaEdit"], main [data-act="ol1Sel"], main [data-act="cbrObsLoc"]:not([disabled])'));
    ok('OBS1B-A4 viewing changed no configuration or observation record', J(STORE.n5.pub) === pub0 && recs() === r0);
  });

  await T('OBS1B-B draft: the controls work; hidden locations keep their data', async () => {
    ACA(); const pr = CD(); ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('Version 2'); const d = n5Shown(pr), pub0 = J(STORE.n5.pub);
    ok('OBS1B-B a new draft must record Observation required again (PD-N5a-03): until then the step asks for the Course Details answer', d.state === 'Draft' && d.v === 2 && d.required === null && (at(pr.id, 'obs'), !col('wp') && !!$1('main .cb-body [data-tab="details"]')));
    settings(pr.id, 'yes', 'Permitted', 'Available'); at(pr.id, 'obs');
    ok('OBS1B-B …Yes, workplace and Academy office: both locations on, configured below their switches', col('wp').classList.contains('on') && col('off').classList.contains('on') && !!col('wp').querySelector('[data-act="ol1Sel"]'));
    click($1('main .n5-nvq [data-act="n5NvqEv"][data-c="001 2.1"]'));
    $a('#modal-root .n5-ev').forEach(x => { x.checked = ['notes', 'photos'].includes(x.value); }); $1('#n5n-i').value = 'Observe two care interactions'; press();
    ok('OBS1B-B2 the qualification criteria evidence editor saves to the version (assessor notes + photos)', J(d.nvq['001 2.1'].types) === J(['notes', 'photos']) && d.nvq['001 2.1'].instr === 'Observe two care interactions');
    at(pr.id, 'obs'); ok('OBS1B-B2 …one set of settings for both locations, shown once', $a('main .n5-nvq').length === 1 && /Photos/.test($1('main .n5-nvq tr[data-code="001 2.1"]').textContent) && /Observe two care interactions/.test($1('main .n5-nvq tr[data-code="001 2.1"]').textContent));
    ok('OBS1B-B2 the published Version 1 is unchanged', J(STORE.n5.pub) === pub0);
    const keep = J([d.nvq, d.ol1, d.ia]);
    settings(pr.id, 'no'); at(pr.id, 'obs');
    ok('OBS1B-B3 Observation required: No → the step says it doesn\'t apply; no criteria cards', !$1('main .n5-nvq') && !col('wp') && /Not applicable — this course has no observations/.test(main()));
    ok('OBS1B-B3 …the criteria data is kept', J([d.nvq, d.ol1, d.ia]) === keep);
    settings(pr.id, 'yes', 'Not permitted', 'Available'); at(pr.id, 'obs');
    ok('OBS1B-B4 workplace off: the Workplace column says so; the Academy column and the qualification criteria stay (data kept)', !col('wp').classList.contains('on') && col('off').classList.contains('on') && !!$1('main .n5-nvq tr[data-code="001 2.1"]') && J([d.nvq, d.ia]) === J([JSON.parse(keep)[0], JSON.parse(keep)[2]]));
    settings(pr.id, 'yes', 'Permitted', 'Available');
    ok('OBS1B-B5 both on again: the selections come back unchanged', (at(pr.id, 'obs'), col('wp').classList.contains('on') && col('off').classList.contains('on')) && J([d.nvq, d.ol1, d.ia]) === keep);
    ACT.resetDemo(); closeModal();
  });

  // ---------------- Legacy data ----------------
  fxLoadLegacy();
  await T('OBS1B-L legacy programmes: nothing lost, historical versions read-only', async () => {
    ACA(); const pub0 = J(STORE.n5.pub), drafts0 = J(STORE.n5.draft), r0 = recs(), seen = [];
    (ADMIN.programmes || []).filter(p => n5Shown(p)).forEach(pr => {
      const d = n5Shown(pr), nvq = n5Nvq(pr, d).length, ia = (d.ia || []).length; at(pr.id, 'obs');
      seen.push([pr.id, d.state, d.required, $a('main .n5-nvq').length, $a('main .n5-ia').length, nvq, ia]);
    });
    ok('OBS1B-L1 every published version with NVQ criteria shows them once; a draft once its observation answer is Yes', seen.every(([, st, req, wn, , n]) => !n || (st === 'Draft' && req !== true ? wn === 0 : st !== 'Draft' && req === false ? wn === 0 : wn === 1)), J(seen));
    ok('OBS1B-L1 programme Academy criteria appear in exactly one place', seen.every(([, st, req, , wi, , n]) => !n || (st === 'Draft' && req !== true ? wi === 0 : st !== 'Draft' && req === false ? wi === 0 : wi === 1)), J(seen));
    const l3 = seen.find(s => s[0] === 'NV-L3'); ok('OBS1B-L1 Level 3 (published before the library) keeps its own IA criteria visible', !!l3 && l3[6] >= 4 && l3[4] === 1, J(l3));
    ok('OBS1B-L2 browsing changed no published configuration, draft or observation record', J(STORE.n5.pub) === pub0 && J(STORE.n5.draft) === drafts0 && recs() === r0);
  });
  await T('OBS1B-L3 a legacy draft with its own Academy criteria: the card is on the step, fully editable', async () => {
    ACA(); const pr = s3Pr('NV-L3'); ACT.s3WizVersion({ dataset: { id: pr.id } }); if (MODAL) reason('Version for OBS-1b');
    if (!n5DraftV(pr)) { ACT.newProgVersion && ACT.newProgVersion({ dataset: { id: pr.id } }); if (MODAL) reason('Version for OBS-1b'); }
    const d = n5Shown(pr); settings(pr.id, 'yes', 'Permitted', 'Available'); at(pr.id, 'obs');
    ok('OBS1B-L3 the Workplace column counts the programme Academy criteria; the Academy column doesn\'t', d.state === 'Draft' && /workplace only/.test($1('main .cbr2-qual h4').textContent) && !/Academy criteria/.test(col('wp').textContent + col('off').textContent) /* CBC2: the programme's Academy criteria are listed once, marked workplace only — was a line in the Workplace column */);
    ok('OBS1B-L3 "Programme Academy criteria (earlier set-up)" with IA-1…IA-4, their NVQ mapping and Edit / Retire / Add', /Programme Academy criteria \(earlier set-up/.test($1('main .cbr2-qual h4').textContent) /* CBC2 */ && ['IA-1', 'IA-2', 'IA-3', 'IA-4'].every(c => !!$1(`main .n5-ia tr[data-code="${c}"]`)) && !!$1('main .n5-ia [data-act="n5IaEdit"][data-c="IA-1"]') && !!$1('main .n5-ia [data-act="n5IaState"]') && !!$1('main .n5-ia [data-act="n5IaEdit"][data-c=""]'));
    click($1('main .n5-ia [data-act="n5IaEdit"][data-c="IA-1"]')); ok('OBS1B-L3 the mapping editor lists this version\'s NVQ criteria', $a('#modal-root .n5-map').length >= 1); closeModal();
    ok('OBS1B-L3 the card says they are used on workplace observations', /workplace only/.test($1('main .cbr2-qual h4').textContent) && !!($1('main .cbr2-qual h4').nextElementSibling || {}).matches && $1('main .cbr2-qual h4').nextElementSibling.matches('.n5-ia')); // CBC2: the heading above the card says so (was the card's description)
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
