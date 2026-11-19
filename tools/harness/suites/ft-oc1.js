// OC1 (PD-OC1-*), client demo (FIXTURE=client): observation configuration linked to the curriculum, observation plans across
// modules, Academy categories, multiple learner visits, follow-ups, Academy-office restriction, historical integrity, fees,
// competency, Observation Book grouping, portfolio and export consistency, permissions and audit, version safety, assignments.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'OC1 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } $1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`).click(); code2fa(); S.ui = {}; };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const tick = (sel, vals) => $a('#modal-root ' + sel).forEach(x => { if (!x.disabled) x.checked = vals.includes(x.value); });
  const aud = re => ADMIN.audit.some(a => re.test(a.action));
  const fresh = () => { closeModal(); ACT.resetDemo(); closeModal(); };
  const freshEx = () => { fresh(); ACT.oc1Examples(); press(); closeModal(); };
  const W6 = () => STORE.worlds.CD6, lid6 = () => W6().me.id, rid = o => 'CD6-' + o.id;
  const vis = ev => W6().observations.filter(o => o.dEv === ev && !['Cancelled', 'Rescheduled'].includes(o.status));
  const crit = (w, code) => w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))).find(c => c.code === code);
  const assessor = () => TCH(Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === 'James Pryce'));
  const learner6 = () => { signOutUI(); cdAs('CD6'); };
  // opens the assessor's proposal for Nia on a plan (value: EV-n or FU:EV-n); returns the dialog's scope box
  const openProp = v => { assessor(); ACT.obPropose({ dataset: { l: lid6() } }); const lf = $1('#modal-root #op-l'); lf.value = lid6(); INP.obPerm(lf); const s = $1('#modal-root #d-ev-s'); if (s && v) { if (![...s.options].some(o => o.value === v)) s.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`); s.value = v; INP.dEvPick(s); } if (($1('#modal-root input[name="op-lt"]:checked') || {}).value === 'office' && !$1('#op-office')) INP.obLt(); $1('#op-d').value = D(70, '10:00').slice(0, 16); return $1('#modal-root #oc1-scope'); };
  const send = () => { const t0 = toast, msgs = []; toast = (m, k) => { msgs.push(m); return t0(m, k); }; let r; try { const a = MODAL.actions.find(x => x.label === 'Send proposal'); r = a.fn(); } finally { toast = t0; } closeModal(); return { r, msg: msgs.join(' | ') }; };
  const craft = (box, cls, val) => box.insertAdjacentHTML('beforeend', `<label><input type="checkbox" class="${cls}" value="${val}" checked></label>`);
  const accept = o => { learner6(); go('observations'); ACT.obsAccept({ dataset: { id: o.id } }); press(); };
  const cancelVisit = o => { assessor(); ACT.obCancel({ dataset: { id: rid(o) } }); $1('#oc-r').value = 'OC1 test — moved'; MODAL.actions.find(a => a.label === 'Cancel observation').fn(); closeModal(); };

  /* ---------- 0. Starting demo and the examples ---------- */
  await T('OC1-0 the starting demo and the examples', async () => {
    fresh(); const pr = cdPr();
    ok('OC1-0a the starting demo is unchanged: Version 1 only, no SAF category, no Nia, Dev and Amira on Version 1', pr.version === 1 && !OL1().cats.some(c => c.code === 'SAF') && !STORE.worlds.CD6 && STORE.worlds.CD2.nvq.progVersion === 1 && STORE.worlds.CD1.nvq.progVersion === 1);
    S.demoOpen = true; render(); ok('OC1-0b Demo controls offer "Load observation planning examples"', !!$1('#demo-root [data-act="oc1Examples"]')); S.demoOpen = false; render();
    const dev0 = J([STORE.worlds.CD2.observations, STORE.worlds.CD2.assignments, STORE.worlds.CD2.tree]), fees0 = J(chFees().filter(f => f.lid !== '—'));
    freshEx(); ok('OC1-0c the examples load through the normal screens without a refused step', J(OC1().demoErr) === '[]' && OC1().examples === true, J(OC1().demoErr));
    ok('OC1-0d Dev\'s records are untouched by the examples (observations, assignments, criteria)', J([STORE.worlds.CD2.observations, STORE.worlds.CD2.assignments, STORE.worlds.CD2.tree]) === dev0);
    ok('OC1-0e the examples add exactly one finance record: Nia\'s single observation fee (raised by her first confirmed visit)', chFees().length === JSON.parse(fees0).length + 1 && chFees().filter(f => f.lid === lid6()).length === 1);
    const n = J([ADMIN.batches.length, ADMIN.learners.length, W6().observations.length]); ACT.oc1Examples(); closeModal(); ok('OC1-0f a second load is refused: nothing duplicated', J([ADMIN.batches.length, ADMIN.learners.length, W6().observations.length]) === n);
    fresh(); ok('OC1-0g Reset demo removes them (Version 1, no SAF, no Nia, no DEMO-L3-OBS27)', cdPr().version === 1 && !OL1().cats.some(c => c.code === 'SAF') && !STORE.worlds.CD6 && !ADMIN.batches.some(b => b.code === 'DEMO-L3-OBS27'));
  });

  /* ---------- A. Curriculum, inheritance, version safety ---------- */
  await T('OC1-A curriculum and version safety', async () => {
    freshEx(); const pr = cdPr(), pid = pr.id, c2 = n5ConfigFor(pid, 2), c1 = n5ConfigFor(pid, 1);
    ok('OC1-A1 criteria inherit their Learning Outcome type: Version 2\'s observation criteria are exactly the Observation-type outcomes\' criteria (Knowledge 001 1.1 / 1.2 excluded)', J(c2.snap.map(c => c.code)) === J(['001 2.1', '001 3.1', '001 3.2', '002 1.1', '002 1.2']));
    const t2 = s3PubTree(pr, 2), t1 = s3PubTree(pr, 1), path = (t, code) => { for (const u of t) for (const m of u.mods) for (const l of m.los) if (l.crit.some(c => c.code === code)) return [u.code, m.code, l.code, l.type].join('/'); return null; };
    ok('OC1-A2 existing criteria keep their IDs and hierarchy in Version 2 (001 1.1, 001 1.2, 001 2.1 unchanged)', ['001 1.1', '001 1.2', '001 2.1'].every(c => path(t1, c) === path(t2, c)) && path(t2, '002 1.1') === 'U002/M1/LO1/Observation', ['001 2.1', '002 1.1'].map(c => path(t2, c)).join(' '));
    ok('OC1-A3 Version 1 is unchanged (one plan, 001 2.1) and its learners stay on it', c1.events.length === 1 && J(c1.events[0].crit) === J(['001 2.1']) && STORE.worlds.CD2.nvq.progVersion === 1 && !STORE.worlds.CD2.tree.some(u => u.code === 'U002') && W6().nvq.progVersion === 2 && W6().tree.some(u => u.code === 'U002'));
    pick('aca'); go('a-programmes', { id: pid, tab: 'details' }); ACT.s3WizVersion({ dataset: { id: pid } }); reason('OC1: Version 3');
    ACT.n5Settings({ dataset: { p: pid } }); const rd = v => { const x = $1(`#modal-root input[name="n5-req"][value="${v}"]`); if (x) x.checked = true; }; rd('yes'); press();
    const snap2 = J(c2), tree6 = J(W6().tree), a0 = ADMIN.audit.length;
    INP.ch8LoType({ value: 'Knowledge', dataset: { id: pid, u: '0', m: '0', l: '1' } });
    const chk = n5Check(pr);
    ok('OC1-A4 changing an existing outcome\'s type in a new version is flagged for review (affected criteria, learners keep their version, nothing remapped) and audited', chk.review.some(x => /U001 M1 LO2 changed from Observation to Knowledge since Version 2/.test(x) && /001 2\.1/.test(x) && /nothing is remapped/.test(x)) && ADMIN.audit.slice(0, ADMIN.audit.length - a0 + 1).some(a => a.action === 'Assessment type change flagged for review'), J(chk.review));
    ok('OC1-A5 …and blocks publication while a plan still includes the criterion (coverage rules unchanged)', chk.block.some(b => /includes criteria that aren't active in this version: 001 2\.1/.test(b)), J(chk.block));
    ok('OC1-A6 published Version 2 and Nia\'s criteria are unchanged by the draft', J(n5ConfigFor(pid, 2)) === snap2 && J(W6().tree) === tree6);
  });

  /* ---------- B. Conditional publication validation ---------- */
  await T('OC1-B publication validation', async () => {
    freshEx(); const pr = cdPr(), pid = pr.id; pick('aca'); go('a-programmes', { id: pid, tab: 'details' }); ACT.s3WizVersion({ dataset: { id: pid } }); reason('OC1: Version 3');
    const req = v => { ACT.n5Settings({ dataset: { p: pid } }); const x = $1(`#modal-root input[name="n5-req"][value="${v}"]`); if (x) x.checked = true; press(); };
    req('yes'); const types0 = () => J(ch8Tree(pid).map(u => u.mods.map(m => m.los.map(l => l.type))));
    [[0, 0, 1], [0, 0, 2], [1, 0, 0]].forEach(([u, m, l]) => INP.ch8LoType({ value: 'Knowledge', dataset: { id: pid, u: String(u), m: String(m), l: String(l) } }));
    const t1 = types0(), crit1 = J(ch8Tree(pid).map(u => u.mods.map(m => m.los.map(l => l.crit.length)))), b = n5Check(pr).block.find(x => /no qualification observation criteria/.test(x)) || '';
    ok('OC1-B1 required = Yes with no Observation-type outcome blocks publication and explains both corrections', /Observation required/.test(b) && /assessment type/.test(b) && /Curriculum & Outcomes/.test(b) && /Course Details/.test(b), b);
    ok('OC1-B2 nothing is converted or added to satisfy it (types stay Knowledge, no criteria added)', !/Observation/.test(t1) && crit1 === J(ch8Tree(pid).map(u => u.mods.map(m => m.los.map(l => l.crit.length)))));
    req('no'); ok('OC1-B3 a course that doesn\'t require observation isn\'t forced to have an Observation outcome', !n5Check(pr).block.some(x => /qualification observation criteria|Required Observation/.test(x)), J(n5Check(pr).block));
    req('yes'); INP.ch8LoType({ value: 'Observation', dataset: { id: pid, u: '1', m: '0', l: '0' } });
    const d = n5Draft(pr); d.events.forEach(e => { e.crit = e.crit.filter(c => !/^002/.test(c)); });
    ok('OC1-B4 the genuine coverage check stays: an observation criterion in no plan blocks publication', n5Check(pr).block.some(x => /add 2 qualification criteria to a Required Observation: 002 1\.1, 002 1\.2/.test(x)), J(n5Check(pr).block));
  });

  /* ---------- C/D. Categories, plans across modules, builder ---------- */
  await T('OC1-C Academy categories and observation plans', async () => {
    freshEx(); const pr = cdPr(), pid = pr.id, abs = OL1().cats.find(c => c.code === 'ABS'), saf = OL1().cats.find(c => c.code === 'SAF');
    ok('OC1-C1 two Academy categories, each with several criteria, published in the library', ol1Cur(abs).crit.length === 4 && ol1Cur(saf).crit.length === 2 && J(ol1Cur(saf).crit.map(x => x.code)) === J(['SAF-01', 'SAF-02']));
    const c2 = n5ConfigFor(pid, 2), evs = c2.events;
    ok('OC1-C2 three plans in Version 2; the combined plan covers criteria of two units; each plan narrows its Academy categories', evs.length === 3 && J(evs[0].crit) === J(['001 2.1', '002 1.2']) && J(evs[0].acad) === J([abs.id]) && J(evs[1].acad) === J([saf.id]) && J(evs[1].loc) === J(['workplace']), J(evs.map(e => [e.name, e.crit, e.acad])));
    pick('aca'); go('a-programmes', { id: pid, tab: 'observations' });
    const cov = $a('main .oc1-covs .oc1-cov').map(x => x.dataset.code + ':' + x.dataset.n).join();
    ok('OC1-C3 Step 4 "NVQ observation coverage": every criterion, grouped by unit → module → learning outcome, with the plans covering it', cov === '001 2.1:1,001 3.1:1,001 3.2:1,002 1.1:1,002 1.2:2' && $a('main .oc1-covs .oc1-u').length === 2 && $a('main .oc1-covs .oc1-lo').length === 3 && /5 of 5 covered/.test($1('main .oc1-covs').textContent), cov);
    ok('OC1-C4 Academy categories keep their Category → criteria hierarchy in the published version (SAF-01, SAF-02 under "Safety practices"; ABS-01…03 under ABS)', !!$1('main .oc1-ach') && $a(`main .cbr2-col[data-loc="wp"] .oc1-cat[data-k="${saf.id}"] li[data-c]`).length === 2 && /Safety practices/.test($1(`main .cbr2-col[data-loc="wp"] .oc1-cat[data-k="${saf.id}"]`).textContent) && $a(`main .cbr2-col[data-loc="wp"] .oc1-cat[data-k="${abs.id}"] li[data-c]`).length === 3);
    ok('OC1-C5 each plan previews its coverage (modules and Academy categories)', $a('main .oc1-ro-sc').map(x => x.textContent).join(' | ') === 'U001 › M1: 001 2.1 · U002 › M1: 002 1.2 · Academy: ABS | U001 › M1: 001 3.1, 001 3.2 · Academy: SAF | U002 › M1: 002 1.1, 002 1.2 · Academy: ABS' && $a('main .oc1-roprev').length === 3);
    ok('OC1-C6 Academy-office column: NVQ only, explained', /NVQ criteria only/.test(($1('main .cbr2-col[data-loc="off"]') || {}).textContent || ''));
    // a draft: add, edit (categories only), remove a plan
    go('a-programmes', { id: pid, tab: 'details' }); ACT.s3WizVersion({ dataset: { id: pid } }); reason('OC1: Version 3'); ACT.n5Settings({ dataset: { p: pid } }); $1('#modal-root input[name="n5-req"][value="yes"]').checked = true; press();
    go('a-programmes', { id: pid, tab: 'observations' }); ACT.cbObsEv({ dataset: { p: pid, e: '' } });
    ok('OC1-C7 the plan dialog groups the qualification criteria by unit → module → learning outcome and lists Academy categories with their criteria', $a('#modal-root .oc1-evq .oc1-u').length === 2 && $a('#modal-root .oc1-evq .ev-c').length === 5 && $a('#modal-root .oc1-evcats .oc1-cat').length === 2 && $a('#modal-root .oc1-evcats .oc1-cat[data-k="' + saf.id + '"] li[data-code]').length === 2);
    $1('#ev-n').value = 'OC1 office only'; tick('.ev-l', ['office']); tick('.ev-c', ['001 2.1']); tick('.ev-e', ['notes']); tick('.oc1-ev-cat', [saf.id]); press();
    const eo = n5Draft(pr).events.find(e => e.name === 'OC1 office only');
    ok('OC1-C8 a plan with Academy-office visits only uses no Academy categories, whatever was ticked (they are workplace-only)', !!eo && !('acad' in eo) && !n5Check(pr).block.some(x => /OC1 office only/.test(x)));
    ACT.cbObsEv({ dataset: { p: pid, e: '' } }); $1('#ev-n').value = 'OC1 extra'; tick('.ev-c', ['001 3.1', '002 1.1']); tick('.ev-e', ['notes']); tick('.oc1-ev-cat', [saf.id]);
    tick('.ev-l', ['workplace', 'office']); press(); const ex = n5Draft(pr).events.find(e => e.name === 'OC1 extra');
    ok('OC1-C9 a plan is added with criteria from two modules and one category; audited', !!ex && J(ex.crit) === J(['001 3.1', '002 1.1']) && J(ex.acad) === J([saf.id]) && aud(/Required Observation Academy categories set/));
    ACT.cbObsEv({ dataset: { p: pid, e: ex.id } }); tick('.oc1-ev-cat', [abs.id, saf.id]); press();
    ok('OC1-C10 editing only the categories saves them ("all workplace categories" kept as the default) and is audited', !Array.isArray(ex.acad) && aud(/Required Observation Academy categories changed/));
    ex.acad = ['OCAT-999']; ok('OC1-C11 a plan using a category not selected for the workplace blocks publication', n5Check(pr).block.some(x => /OC1 extra" uses Academy categories that aren't selected/.test(x))); delete ex.acad;
    ACT.cbObsEvRemove({ dataset: { p: pid, e: ex.id } }); reason('OC1: not needed'); ok('OC1-C12 an unused draft plan can be removed', !n5Draft(pr).events.some(e => e.name === 'OC1 extra'));
  });

  /* ---------- E/F/G. Visits, office restriction, follow-ups, immutability, fees ---------- */
  await T('OC1-E visits, follow-ups and integrity', async () => {
    freshEx(); const w = W6(), all = w.observations.slice().sort((x, y) => new Date(x.at) - new Date(y.at)), [v1, fu, v2, v3] = all;
    ok('OC1-E1 four separate visit records with their own IDs, plan, version, location, scope, assessor and status', all.length === 4 && new Set(all.map(o => o.id)).size === 4 && J(all.map(o => [o.dEv, o.dV, o.dLoc, o.status])) === J([['EV-2', 2, 'workplace', 'Completed'], ['EV-2', 2, 'workplace', 'Completed'], ['EV-3', 2, 'workplace', 'Confirmed'], ['EV-1', 2, 'office', 'Confirmed']]) && all.every(o => o.assessor === 'James Pryce' && o.dScope));
    ok('OC1-E2 the follow-up references the original visit and only its outstanding criteria (001 3.2, SAF-02)', fu.dFu && fu.dFu.of === v1.id && J(fu.dFu.crit) === J(['001 3.2', 'SAF-02']) && J(fu.dScope.nvq) === J(['001 3.2']) && fu.dScope.lib.length === 1);
    ok('OC1-E3 Visit 1\'s signed record is unchanged (001 3.2 Observed / Not Yet Competent; SAF-02 Not yet met) and is earlier', J(v1.report.nvq.map(x => [x[0], x[2], x[3]])) === J([['001 3.1', 1, 1], ['001 3.2', 1, 0]]) && v1.report.ol1.find(x => x.code === 'SAF-02').out === 'Not yet met' && new Date(v1.signed) <= new Date(fu.signed));
    const c32 = crit(w, '001 3.2');
    ok('OC1-E4 the competency status reflects the authorised later evidence (001 3.2 Achieved, verified by James Pryce) with both visits in its history', c32.st === 'Achieved' && c32.lock.by === 'James Pryce' && c32.obsH.length === 2 && c32.obsH[0].c === 0 && c32.obsH[1].c === 1 && c32.obsH[1].fu === true);
    const ctx = dCtx(w), st = ctx.evs.map(e => dState(w, ctx, e).t);
    ok('OC1-E5 plan states: combined and Visit 2 confirmed, Workplace safety completed with nothing outstanding', J(st) === J(['Confirmed', 'Completed', 'Confirmed']) && !oc1FuReady(w, ctx, ctx.evs[1]), J(st));
    ok('OC1-E6 the combined visit covers two units at the Academy office: NVQ criteria only (no Academy criteria in its scope or record)', J(v3.dScope) === J({ nvq: ['001 2.1', '002 1.2'], ia: [], cats: [] }) && ol1RecItems(obById(rid(v3))).length === 0);
    assessor(); go('t-obsrec', { id: rid(v3) });
    ok('OC1-E7 the record screen groups the combined visit\'s criteria by unit and module (U001 › M1, U002 › M1), no Academy criteria at the office', $a('main .oc1-recg .oc1-u').length === 2 && $a('main .oc1-recg .obs-card').length === 2 && !$1('main .ol1-critrec'));
    const rep1 = J(v1.report), fee0 = chFees().filter(f => f.lid === lid6()).length;
    ACT.orT({ dataset: { s: 'nvq', c: '001 3.2', k: 'c', v: '1' } }); S.params = { id: rid(v1) }; ACT.orSign({ dataset: { id: rid(v1) } }); closeModal();
    ok('OC1-E8 a signed visit is locked: the Assessor\'s own direct calls change nothing', J(v1.report) === rep1 && v1.status === 'Completed');
    // the scope is checked in the handler: crafted values are refused
    cancelVisit(v2); cancelVisit(v3);
    let box = openProp('EV-3'); ok('OC1-F1 proposing again after a cancellation: the plan\'s criteria are ticked, criteria of other plans offered', !!box && J($a('#modal-root .oc1-sc-n:checked').map(x => x.value)) === J(['002 1.1', '002 1.2']) && $a('#modal-root .oc1-sc-n').length === 5);
    craft(box, 'oc1-sc-n', '001 1.1'); let s = send(); ok('OC1-F2 a Knowledge criterion is refused for observation', s.r === false && /Knowledge criteria are assessed through assignments/.test(s.msg), s.msg);
    box = openProp('EV-3'); craft(box, 'oc1-sc-n', '301 1.1'); s = send(); ok('OC1-F3 a criterion of another programme / version is refused', s.r === false && /learner's own programme version/.test(s.msg), s.msg);
    box = openProp('EV-3'); craft(box, 'oc1-sc-n', '002 1.1'); s = send(); ok('OC1-F4 a duplicate criterion is refused', s.r === false && /appears twice/.test(s.msg), s.msg);
    box = openProp('EV-1'); ok('OC1-F5 Academy office: no Academy criteria are offered, and the exclusion is explained', !!box && !$1('#modal-root .oc1-sc-c, #modal-root .oc1-sc-i') && /NVQ criteria only/.test(box.textContent));
    craft(box, 'oc1-sc-c', ol1Cfg(n5ConfigFor(cdPr().id, 2)).wp[0].cat); s = send(); ok('OC1-F6 a crafted Academy category at the Academy office is refused', s.r === false && /aren't assessed at the Academy office/.test(s.msg), s.msg);
    box = openProp('FU:EV-2'); s = send(); ok('OC1-F7 a follow-up for a plan with nothing outstanding is refused', s.r === false, s.msg);
    // Visit 2 again, adding an achieved criterion of another plan (001 3.1): the later result never downgrades it
    box = openProp('EV-3'); $a('#modal-root .oc1-sc-n').forEach(x => { x.checked = ['002 1.1', '002 1.2', '001 3.1'].includes(x.value); }); s = send();
    const nv = vis('EV-3').find(o => o.status === 'Proposed'); ok('OC1-G1 a criterion from another plan can be added to a visit (scope 001 3.1, 002 1.1, 002 1.2)', !!nv && J(nv.dScope.nvq) === J(['001 3.1', '002 1.1', '002 1.2']) && aud(/Observation event proposed/), s.msg);
    accept(nv); assessor(); go('t-obsrec', { id: rid(nv) });
    [['001 3.1', 1, 0], ['002 1.1', 1, 0], ['002 1.2', 1, 1]].forEach(([c, o, k]) => { ACT.orT({ dataset: { s: 'nvq', c, k: 'o', v: String(o) } }); ACT.orT({ dataset: { s: 'nvq', c, k: 'c', v: String(k) } }); });
    ol1RecItems(obById(rid(nv))).forEach(i => { (i.req || []).forEach(t => { if (['notes', 'refs'].includes(t)) ACT.ol1EvAdd({ dataset: { id: rid(nv), c: i.id, t, text: 'OC1 note' } }); else INP.ol1File({ dataset: { id: rid(nv), c: i.id, t }, files: [{ name: 'x.pdf', size: 1 }] }); }); ACT.ol1Out({ dataset: { id: rid(nv), c: i.id, v: 'Met' } }); });
    render(); $a('main .d-evt').forEach(x => { x.checked = x.value === 'notes'; }); INP.dEvt(); ACT.orSign({ dataset: { id: rid(nv) } }); MODAL.actions.find(a => a.label === 'Sign off and lock').fn(); closeModal();
    const c31 = crit(w, '001 3.1');
    ok('OC1-G2 a later Not Yet Competent never downgrades a criterion already Achieved and locked; the result joins its history; the report records it as kept', nv.status === 'Completed' && c31.st === 'Achieved' && c31.obsH.length === 2 && c31.obsH[1].c === 0 && J(nv.report.kept) === J(['001 3.1']) && crit(w, '002 1.2').st === 'Achieved' && crit(w, '002 1.1').st === 'Action Required');
    ok('OC1-G3 the plan now offers a follow-up for its outstanding criterion only', oc1FuReady(w, dCtx(w), dCtx(w).evs[2]) && J(oc1Outstanding(w, dCtx(w), dCtx(w).evs[2]).map(x => x.code)) === J(['002 1.1']));
    box = openProp('FU:EV-3'); ok('OC1-G4 the follow-up dialog offers only the outstanding criterion', !!box && box.dataset.fu === '1' && J($a('#modal-root .oc1-sc-n').map(x => x.value)) === J(['002 1.1']));
    craft(box, 'oc1-sc-n', '002 1.2'); s = send(); ok('OC1-G5 a follow-up can\'t add a criterion that isn\'t outstanding', s.r === false && /only the criteria still outstanding/.test(s.msg), s.msg);
    openProp('FU:EV-3'); s = send(); const f2 = vis('EV-3').find(o => o.dFu && o.status === 'Proposed');
    ok('OC1-G6 the follow-up is proposed (audited) and the plan shows it', !!f2 && J(f2.dScope.nvq) === J(['002 1.1']) && aud(/Follow-up observation proposed/) && dState(w, dCtx(w), dCtx(w).evs[2]).t === 'Follow-up — date proposed', s.msg);
    accept(f2);
    ok('OC1-H1 fees: one observation fee for Nia after four visits, a cancellation, re-proposals and two follow-ups (no new fee)', chFees().filter(f => f.lid === lid6()).length === fee0 && fee0 === 1);
  });

  /* ---------- J. Observation Book, portfolio, export, permissions ---------- */
  await T('OC1-J Observation Book, portfolio, export and permissions', async () => {
    freshEx(); const w = W6(), lid = lid6(), all = w.observations.slice().sort((x, y) => new Date(x.at) - new Date(y.at));
    assessor(); go('t-obsbook', { id: lid });
    ok('OC1-J1 the book: a plan summary, one section per plan, each plan\'s NVQ criteria grouped by unit → module → learning outcome', !!$1('main .oc1-bsum') && /2 of 5 NVQ observation criteria achieved/.test($1('main .oc1-bsum').textContent) && $a('main .oc1-obe').length === 3 && $a('main .oc1-obe[data-e="EV-1"] .cf2-set[data-set="nvq"] .oc1-u').length === 2);
    ok('OC1-J2 visits numbered with their record IDs; the follow-up names the visit it follows', J($a('main .oc1-vis').map(x => x.dataset.n).sort()) === J(['1', '2', '3', '4']) && $a('main .oc1-vis').some(x => /Follow-up/.test(x.textContent) && /to visit 1/.test(x.textContent) && x.textContent.includes(all[1].id)));
    const res = $1('main .oc1-obe[data-e="EV-2"] .oc1-res');
    ok('OC1-J3 signed results grouped (unit › module › outcome headings) with the Academy criteria under their category', !!res && $a('main .oc1-obe[data-e="EV-2"] .oc1-res .oc1-gr').some(x => /Unit U001 › Module M1 › LO3/.test(x.textContent)) && $a('main .oc1-obe[data-e="EV-2"] .oc1-res .oc1-gr').some(x => /SAF/.test(x.textContent)) && !!$1('main .oc1-obe[data-e="EV-2"] tr[data-code="SAF-02"]'));
    ok('OC1-J4 NVQ and Academy criteria stay separate sets; the office plan shows no Academy criteria', !$1('main .cf2-set[data-set="nvq"] [data-code^="SAF-"], main .cf2-set[data-set="nvq"] [data-code^="ABS-"]') && !$1('main .oc1-obe[data-e="EV-1"] .cf2-set[data-set="academy"] [data-code]') && /Not assessed at the Academy office/.test($1('main .oc1-obe[data-e="EV-1"] .cf2-set[data-set="academy"]').textContent) && $a('main .oc1-obe[data-e="EV-3"] .cf2-set[data-set="academy"] .oc1-cat [data-code^="ABS-"]').length === 3);
    ok('OC1-J5 a criterion\'s visit history is shown (001 3.2: two results, the second a follow-up)', /2 observation results/.test(($1('main .oc1-obe[data-e="EV-2"] .cf2-set[data-set="nvq"] [data-code="001 3.2"]') || {}).textContent || ''));
    ok('OC1-J6 the confirmed visits can be started from the book; the signed ones only viewed', $a('main .cf2-rec[data-st="Confirmed"] [data-go="t-obsrec"]').length === 2 && $a('main .cf2-rec[data-st="Completed"] [data-go="t-obsrec"]').every(b => /View signed record/.test(b.textContent)));
    // evidence and drafts on a combined record (two units)
    const v3 = all[3], r3 = 'CD6-' + v3.id; go('t-obsrec', { id: r3 }); INP.cf2Perf({ dataset: { s: 'nvq', c: '002 1.2' }, value: 'Supported the individual with breakfast.' }); INP.cf2CEv({ dataset: { s: 'nvq', c: '002 1.2' }, files: [{ name: 'oc1-evidence.pdf', size: 10 }], value: '' }); ACT.orSave();
    const dr = STORE.tas.obsDraft[r3]; ok('OC1-J7 evidence attaches to the right criterion of a combined visit; the draft is saved and attributed', dr && dr.cev['nvq|002 1.2'][0].name === 'oc1-evidence.pdf' && dr.savedBy === 'James Pryce');
    go('t-obsbook', { id: lid }); ok('OC1-J8 the book shows the draft and "Reopen draft"', /Reopen draft/.test(main()));
    pick('coord1'); const c1 = chIsMyBatchLid(lid); pick('coord2'); const c2 = chIsMyBatchLid(lid); pick(c1 ? 'coord1' : 'coord2'); go('c-obsbook', { id: lid }); const ta = $1(`main #cf2-fb-${cf2Safe(r3)}`);
    if (ta) { ta.value = 'Good preparation for the combined visit.'; ACT.cf2ObsFb({ dataset: { l: lid, r: r3 } }); }
    ok('OC1-J9 the learner\'s Coordinator reads the grouped book and adds attributed feedback (no outcome change)', (c1 || c2) && cf2Fb(r3).length === 1 && cf2Fb(r3)[0].role === 'Academic Coordinator' && v3.status === 'Confirmed' && $a('main .oc1-u').length > 0);
    for (const p of ['aca', 'super', 'sys']) { pick(p); go('a-obsbook', { id: lid }); ok(`OC1-J10 ${p}: reads the grouped book (read-only)`, /Read-only/.test(main()) && $a('main .oc1-obe').length === 3 && !$1('main [data-go="t-obsrec"], main [data-act="cf2ObsFb"]')); }
    pick('fin'); go('a-obsbook', { id: lid }); ok('OC1-J11 Finance can\'t open it', !$1('main .oc1-obe'));
    TCH('T'); go('t-obsbook', { id: lid }); ok('OC1-J12 a Teacher can\'t open it', !$1('main .oc1-obe'));
    // learner views
    learner6(); go('observations'); ok('OC1-J13 the learner sees each plan\'s state and the location\'s Academy criteria by category (none at the Academy office)', /Workplace safety/.test(main()) && /Completed/.test(main()) && $a('main .ol1-learner .ol1-ev[data-e="EV-2"] .oc1-cat').length === 1 && /NVQ criteria only/.test(($1('main .ol1-learner .ol1-ev[data-e="EV-1"]') || {}).textContent || ''));
    // portfolio and export
    assessor(); go('t-portfolio', { id: lid }); const pf = $1('main .cf2-pfc[data-code="001 3.2"]');
    ok('OC1-J14 portfolio: 001 3.2 Achieved, verified by James Pryce; 002 1.1 not achieved (no fabricated evidence)', !!pf && pf.dataset.st === 'Achieved' && /verified by James Pryce/.test(pf.textContent) && ($1('main .cf2-pfc[data-code="002 1.1"]') || { dataset: {} }).dataset.st !== 'Achieved');
    const u = w.tree[0], m = u.mods[0], st = cdaModState(w, u, m), doc = J(cdaModDoc(w, u, m));
    ok('OC1-J15 one complete plan doesn\'t complete the module (U001 › M1 still has outstanding criteria)', !st.complete && st.outstanding.some(x => /001 2\.1/.test(x)));
    ok('OC1-J16 module export: each visit named (plan, record ID, follow-up) with its outcome for this module\'s criteria only', doc.includes('Workplace safety') && doc.includes('follow-up visit') && doc.includes(all[0].id) && doc.includes('001 3.2') && /Not Yet Competent/.test(doc) && !doc.includes('002 1.1'));
    const u2 = w.tree[1], doc2 = J(cdaModDoc(w, u2, u2.mods[0]));
    ok('OC1-J17 …and the other unit\'s module lists the combined visit only once it is signed (none yet)', !doc2.includes('Workplace safety') && /No completed observation is recorded/.test(doc2));
  });

  /* ---------- K. Assignments unchanged; observation criteria not mappable ---------- */
  await T('OC1-K assignments and marking', async () => {
    fresh(); const asg0 = J([STORE.worlds.CD1.assignments, STORE.worlds.CD2.assignments]); freshEx(); const pr = cdPr(), pid = pr.id;
    ok('OC1-K0 Dev\'s and Amira\'s assignment copies are identical with and without the examples', J([STORE.worlds.CD1.assignments, STORE.worlds.CD2.assignments]) === asg0);
    pick('aca'); go('a-programmes', { id: pid, tab: 'assessments' }); const d = s2Defs().find(x => /Assignment 1/.test(x.title));
    const kc = s2Crit(d).filter(c => c.type === 'Knowledge').map(c => c.code), oc = s2Crit(d).filter(c => c.type !== 'Knowledge').map(c => c.code);
    ok('OC1-K1 assignment criteria offered for mapping are Knowledge criteria only (observation criteria are assessed by observation)', kc.includes('001 1.1') && !kc.some(c => ['001 2.1', '001 3.1'].includes(c)), J([kc, oc]));
    const d3 = s2Defs().find(x => /Assignment 3/.test(x.title)), q0 = J(d3.qs.map(q => q.crit)); INP.mapChange({ checked: true, dataset: { id: d3.id, q: d3.qs[0].id, c: '001 2.1' } });
    ok('OC1-K2 a direct call mapping an Observation criterion to a written assignment is refused and logged', J(d3.qs.map(q => q.crit)) === q0 && aud(/Blocked: map an observation criterion to a written assessment/));
    INP.mapChange({ checked: true, dataset: { id: d3.id, q: d3.qs[0].id, c: '001 1.1' } }); ok('OC1-K3 a Knowledge criterion still maps', d3.qs[0].crit.includes('001 1.1'));  });

  /* ---------- L. FR-ADM-20-07 (office = NVQ only) applies to new visits; history and published versions are protected ---------- */
  await T('OC1-L Academy-office rule and protected history', async () => {
    // the snapshot's own time (`at`) is set when Reset demo rebuilds it, so it is left out of the comparison
    const snapJ = s => J(Object.assign({}, s, { at: null }));
    fresh(); const pid = cdPr().id, v1snap = snapJ(ol1SnapOf(pid, 1)), v1off = (ol1SnapOf(pid, 1).off || []).map(i => i.code);
    freshEx(); const w = W6(), ctx = dCtx(w), s2 = ol1SnapOf(pid, 2);
    ok('OC1-L1 Version 1\'s published Academy-office selection (ABS-01…04) is not rewritten by the rule or the examples', snapJ(ol1SnapOf(pid, 1)) === v1snap && J(v1off) === J(['ABS-01', 'ABS-02', 'ABS-03', 'ABS-04']), J(v1off));
    ok('OC1-L2 Version 2\'s frozen office selection stays in its snapshot, while its office visit (combined plan) records NVQ criteria only', (s2.off || []).some(i => i.code === 'ABS-04') && ol1RecItems(g2Obs('CD6-' + vis('EV-1')[0].id)).length === 0 && J(vis('EV-1')[0].dScope.ia) === '[]' && J(vis('EV-1')[0].dScope.cats) === '[]');
    const pre = { src: { dEv: 'EV-1', dPid: pid, dV: 2, dLoc: 'office' } };
    ok('OC1-L3 an office record proposed before the rule (no visit scope) keeps the criteria it was given', J(ol1RecItems(pre).map(i => i.code)) === J((s2.off || []).map(i => i.code)) && ol1RecItems(pre).length > 0);
    const v1 = vis('EV-2').find(o => o.status === 'Completed' && !o.dFu), abs = s2.off.find(i => i.code === 'ABS-04');
    const hist = JSON.parse(J(v1)); hist.id = 'oc1-hist'; hist.dLoc = 'office'; delete hist.dScope; delete hist.dFu; delete hist.oc1; delete hist.report.dScope; delete hist.report.dFu;
    hist.report.ol1 = Object.freeze([Object.freeze(Object.assign({}, abs, { out: 'Met', outBy: 'James Pryce', outAt: hist.signed, evidence: { notes: [{ t: 'Briefing followed.', by: 'James Pryce', at: hist.signed }] } }))]);
    const before = J(hist.report), row = cf2RecRow(w, hist, 'admin', ctx);
    ok('OC1-L4 a signed pre-rule Academy-office result (ABS-04 Met) is still shown in the Book, and its report is unchanged by rendering', /ABS-04/.test(row) && /Met/.test(row) && J(hist.report) === before);
    const r1 = J(v1.report); openProp('EV-1'); closeModal(); go('t-obsbook', { id: lid6() });
    ok('OC1-L5 signed visit reports and learners\' pinned versions are unchanged after another office proposal and the Book view', J(v1.report) === r1 && w.nvq.progVersion === 2 && STORE.worlds.CD2.nvq.progVersion === 1 && STORE.worlds.CD1.nvq.progVersion === 1);
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
