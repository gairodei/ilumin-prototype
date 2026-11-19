// CBR correction batch 2 — Step 4 Observations (6 Nov 2026). Legacy fixture. A real journey through the screens with clicks on the rendered
// controls: Observation required No / Yes; Workplace only, Academy only, both; Add from Library, Create Category, selecting criteria, Add
// Criterion, evidence (library criteria and qualification criteria); Required Observations added by hand (never automatically), edited,
// reordered, removed; publishing refused with none and with an invalid one, then published; a new version keeps the definitions' IDs and
// leaves the published version alone; published records, learners' observations and IQA records untouched; other roles refused.
// The course-building helpers (make, structure, author, fees, documents, submitAndApprove) are ft-cbx's, copied unchanged except make,
// which chooses the observation answer with the explicit Yes / No (CBC1).
(async function () {
  // FB1 (PD-FB1-03): this suite's deposit configuration, chosen explicitly where its fixture prepares a package for Finance — each new fee
  // option "Allow Deposit: Yes" with the Academy default, through the Step 5 handler (an administrator's action; role checks apply).
  const fb1Dep = p => { if (p && cb8Managed(p)) cb8Work(p).opts.filter(o => o.status === 'Active' && fb1Ask(o)).forEach(o => INP.cbr2Dep({ dataset: { p: p.id, o: o.id, k: 'allow' }, checked: true })); };
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const q = s => $1('main ' + s), qa = s => $a('main ' + s), main = () => ($1('main') || document.body).textContent;
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CBC2 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); e.value = v; });
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const mclick = re => click(mbtn(re));
  const tick = (cls, vals) => $a('#modal-root ' + cls).forEach(x => { if (!x.disabled) x.checked = vals === true || vals.includes(x.value); });
  const as = av => () => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BA = as('BA'), QA = as('QA');
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const step4 = pr => go('a-programmes', { id: pr.id, tab: 'observations' });
  const col = loc => q(`.cbr2-col[data-loc="${loc}"]`);
  const evs = pr => cbEvOf(n5Shown(pr));
  let codeN = 0;
  // Section 1 through the screen: Level 3 with two fee options; the observation answer chosen explicitly
  const make = (obs, title) => {
    go('a-programmes'); ACT.chProgNew(); const n = ++codeN;
    fill({ '#np-t': title || 'CBC2 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (7700 + n) + '/1', '#cbc3-dd-n': '12', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel($1('#np-l'));
    [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = qa('.r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    click(q('#cbr2-obs-' + (obs ? 'yes' : 'no'))); const pr = crT(ACT.cbDetCreate)(); closeModal(); return pr;
  };
  const structure = (pr, obs) => {
    const id = pr.id; go('a-programmes', { id, tab: 'structure' });
    add8('ch8AddUnit', { id }, { '#u-c': 'U7' + codeN, '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/652/7' + codeN });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain person-centred care', '#c-e': 'Written account' });
    if (obs) { add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Deliver person-centred care', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Show safe moving and handling', '#c-e': 'Observed at work' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Communicate respectfully', '#c-e': 'Observed at work' }); }
  };
  const author = (pr, title) => {
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: pr.id } }); if (!MODAL) return null;
    fill({ '#cna-t': title }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Explain why person-centred care matters.', '#aq-ev': 'A real example from your workplace', '#aq-n': '2' }); $a('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    const crit = s2Crit(d).find(c => c.type === 'Knowledge').code; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: crit } });
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); reason('Publish'); return d;
  };
  const fees = pr => {
    const id = pr.id, [a, b] = cb8Work(pr).opts;
    [[a, '70', '0'], [b, '100', '45.50']].forEach(([x, wp, off]) => { ACT.cb8Opt({ dataset: { p: id, o: x.id } }); const w = $1('#modal-root #c8-wp'), o = $1('#modal-root #c8-off'); if (w) w.value = wp; if (o) o.value = off; press(); });
    const payTo = (oid, ks) => { const x = cb8Work(pr).opts.find(y => y.id === oid); x.pay.map(y => y.k).forEach(k => ACT.cb8PayDel({ dataset: { p: id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: oid, k: String(k) } })); };
    payTo(a.id, [1, 4]); payTo(b.id, [1, 3]);
  };
  const documents = pr => {
    const id = pr.id; go('a-programmes', { id, tab: 'letter' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); const t = $1('#lt-x'); t.value = t.value + '\n\nTo confirm your place, please {{payment_terms}}.'; reason('Payment wording added');
  };
  const submitAndApprove = pr => {
    go('a-programmes', { id: pr.id, tab: 'fees' }); fb1Dep(pr); ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press();
    const qid = cb8Wf(pr).qid; FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked against the price list'); return qid;
  };
  // what must not change: published observation configurations, learners' observations, IQA records
  const pubCfg = () => J(ADMIN.programmes.filter(p => p.status !== 'Draft').map(p => [p.id, p.version, (() => { try { return n5ConfigFor(p.id, p.version); } catch (e) { return null; } })()]));
  const lrnObs = () => J(Object.keys(STORE.worlds).sort().map(v => [v, (STORE.worlds[v].observations || []).map(o => [o.id, o.status, o.dEv || null, o.dV || null, !!o.report]), STORE.worlds[v].dObs || null]));
  const iqa0 = typeof allIqaRecords === 'function' ? J(allIqaRecords().map(r => [r.id || r.key, r.type || r.kind, r.status])) : '';
  const pub0 = pubCfg(), obs0 = lrnObs();
  let P = null, lastT = ''; const _tt = toast; toast = function (m) { lastT = String(m); return _tt.apply(this, arguments); };

  await T('CBC2-1/2 observation required No / Yes', async () => {
    SA(); const N = make(false);
    ok('CBC2-1 Observation required = No: the Observations step is hidden and no observation definitions exist', !!N && !cbrSteps(N).some(s => s[0] === 'observations') && !qa('.cbr-st').some(b => b.dataset.tab === 'observations') && evs(N).length === 0);
    step4(N); ok('CBC2-1 …opening its old address shows "not applicable", no configuration controls', !q('.cbr2-col') && !q('[data-act="cbObsEv"]'));
    P = make(true); structure(P, true);
    ok('CBC2-2 Observation required = Yes: the step is listed', !!P && cbrSteps(P).some(s => s[0] === 'observations'));
    step4(P); ok('CBC2-2 Step 4: Workplace Observation (left) and Academy Observation (right), each starting with its own checkbox, both off', !!col('wp') && !!col('off') && col('wp').compareDocumentPosition(col('off')) & Node.DOCUMENT_POSITION_FOLLOWING && col('wp').firstElementChild.matches('label.cbr2-loc') && col('off').firstElementChild.matches('label.cbr2-loc') && /Workplace Observation/.test(col('wp').textContent) && /Academy Observation/.test(col('off').textContent) && qa('.cbr2-col.on').length === 0);
    ok('CBC2-2 below them: the qualification criteria (one compact section) and "Required Observations" with "+ Add Required Observation"; none created automatically', qa('.cbr2-qual').length === 1 && /Required Observations/.test(q('.cbr2-req h3').textContent) && /Add Required Observation/.test(q('.cbr2-req [data-act="cbObsEv"][data-e=""]').textContent) && evs(P).length === 0 && /None yet/.test(q('.cbr2-req').textContent));
    ok('CBC2-2 no tabs and none of the removed explanations', !q('.cb-panels') && !/Nothing here records|Observation fees are set|none set yet|Also observed here|Section \d/.test(q('.cb-body').textContent));
  });
  await T('CBC2-3/4/5 locations', async () => {
    SA(); step4(P); click(col('wp').querySelector('input[data-onchange="cbr2Loc"]'));
    const d = () => n5Draft(P);
    ok('CBC2-3 Workplace only: its configuration opens under it (Add from Library, Create Category, guidance); the Academy column stays closed', d().workplace === 'Permitted' && d().office !== 'Available' && col('wp').classList.contains('on') && !col('off').classList.contains('on') && !!col('wp').querySelector('[data-act="ol1Sel"]') && /Create Category/.test(col('wp').querySelector('[data-act="ol1CbNew"]').textContent) && !!col('wp').querySelector('textarea[data-onchange="cbr2Guide"]'));
    ok('CBC2-3 …still no Required Observation was created', evs(P).length === 0);
    click(col('wp').querySelector('input[data-onchange="cbr2Loc"]')); if (MODAL) mclick(/Turn off/); click(col('off').querySelector('input[data-onchange="cbr2Loc"]'));
    ok('CBC2-4 Academy only: only the Academy column is configured', d().office === 'Available' && d().workplace !== 'Permitted' && col('off').classList.contains('on') && !col('wp').classList.contains('on'));
    click(col('wp').querySelector('input[data-onchange="cbr2Loc"]'));
    ok('CBC2-5 both: both columns are configured independently', d().workplace === 'Permitted' && d().office === 'Available' && qa('.cbr2-col.on').length === 2 && evs(P).length === 0);
  });
  await T('CBC2-6…10 categories, criteria, evidence', async () => {
    SA(); step4(P); const wp = () => ol1Resolve(n5Draft(P), 'wp').items, off = () => ol1Resolve(n5Draft(P), 'off').items;
    // the legacy fixture's library has no published category yet: one is created in the Workplace column, then added from the library at the Academy
    click(col('wp').querySelector('[data-act="ol1CbNew"]')); fill({ '#ol1-code': 'CBC2', '#ol1-name': 'Batch 2 standards' });
    $a('#modal-root .ol1-row').forEach((x, k) => { x.querySelector('.ol1-rt').value = ['Greets the individual', 'Records the visit'][k]; x.querySelector('.ol1-ri').value = 'Observe it once.'; x.querySelectorAll('.ol1-ev').forEach(e => { e.checked = (k ? ['docs'] : ['notes']).includes(e.value); }); });
    press(); const nc = OL1().cats.find(c => c.code === 'CBC2'), lib = nc;
    ok('CBC2-7 Create Category (authorized): published to the library and selected for Workplace', !!nc && ol1Cfg(n5Draft(P)).wp.some(s => s.cat === nc.id) && wp().length === 2 && !!q(`.cbr2-col[data-loc="wp"] .cbr2-cat[data-k="${nc.id}"]`));
    step4(P); void off;
    ok('CBC2-6 the Academy column explains that Academy-office visits assess NVQ criteria only; it offers no library selection (the Workplace column keeps Add from Library)', !col('off').querySelector('[data-act="ol1Sel"]') && /NVQ criteria only/.test(col('off').textContent) && !!col('wp').querySelector('[data-act="ol1Sel"]'), lib.code) /* OC1 (PD-OC1-08) restated — Academy-office visits assess NVQ criteria only (brief rule 5, FR-ADM-20-07); was: 'Add from Library: the category and its criteria are selected for the Academy column, independently of Workplace' — click(col('off').querySelector('[data-act="ol1Sel"]')) …; ol1Cfg(n5Draft(P)).off.add.some(s => s.cat === lib.id) && off().length >= 2 && ol1Mode(n5Draft(P)) === 'own' */;
    const first = ol1Cur(lib).crit.filter(x => x.status === 'Active')[0], box = () => q(`.cbr2-col[data-loc="wp"] .cbr2-cat[data-k="${lib.id}"] input[data-c="${first.id}"]`);
    click(box()); ok('CBC2-8 unticking a criterion leaves it out for this course only (the library is unchanged)', !wp().some(i => i.id === first.id) && ol1Cur(lib).crit.some(x => x.id === first.id && x.status === 'Active'));
    click(box()); ok('CBC2-8 ticking it selects it again', wp().some(i => i.id === first.id));
    const v0 = ol1Cur(nc).v; click(q(`.cbr2-col[data-loc="wp"] .cbr2-cat[data-k="${nc.id}"] [data-act="cbrObsCrit"]`)); fill({ '#cbr-ct': 'Leaves the room tidy', '#cbr-ci': 'Check before leaving.' }); tick('.ol1-ev', ['notes', 'photos']); mclick(/Add criterion/);
    ok('CBC2-9 Add Criterion: a new criterion in the category (its next version) and selected here', ol1Cur(nc).v === v0 + 1 && wp().some(i => i.title === 'Leaves the room tidy'));
    const it = wp().find(i => i.title === 'Greets the individual'); click(q(`.cbr2-col[data-loc="wp"] [data-act="cbrObsEv"][data-c="${it.id}"]`)); $1('#cbr-evlib').checked = false; tick('.ol1-ev', ['notes', 'videos']); mclick(/^Save$/);
    ok('CBC2-10 permitted evidence for a library criterion, set for this course', J((n5Draft(P).cbrEv || {})[it.id] && n5Draft(P).cbrEv[it.id].ev) === J(['notes', 'videos']) && /set for this course/.test(q(`.cbr2-col[data-loc="wp"] li[data-c="${it.id}"]`).textContent));
    step4(P); const g = col('wp').querySelector('textarea[data-onchange="cbr2Guide"]'); g.value = 'Agree the visit with the manager first.'; g.dispatchEvent(new Event('change', { bubbles: true }));
    ok('CBC2-10 guidance and requirements for the location', cbrGuideOf(n5Draft(P), 'wp') === 'Agree the visit with the manager first.');
    step4(P); const qf = q('details.cbr2-qual'), nvq = n5NvqOk(P, n5Draft(P)).map(c => c.code);
    ok('CBC2-10 the qualification criteria are shown once, opened because they need evidence', !!qf && qf.open && /need evidence/.test(qf.querySelector('summary').textContent) && nvq.every(c => !!qf.querySelector(`tr[data-code="${c}"]`)) && !col('wp').querySelector('.n5-nvq') && !col('off').querySelector('.n5-nvq'));
    nvq.forEach(c => { click(q(`.cbr2-qual [data-act="n5NvqEv"][data-c="${c}"]`)); tick('.n5-ev', ['notes', 'photos']); mclick(/Save evidence/); });
    step4(P); ok('CBC2-10 qualification criteria evidence set (one setting for both locations); the section no longer flags them', nvq.every(c => J(n5Draft(P).nvq[c].types) === J(['notes', 'photos'])) && !/need evidence/.test(q('details.cbr2-qual summary').textContent), J([nvq.map(c => n5Draft(P).nvq[c]), q('details.cbr2-qual summary').textContent]));
  });
  await T('CBC2-11…14 Required Observations', async () => {
    structure && 0; SA(); author(P, 'CBC2 assignment'); fees(P); documents(P); step4(P);
    const blk = () => cbRvChecks(P).block.map(b => b.msg);
    ok('CBC2-14 with none, publishing is blocked: "Add at least one Required Observation before publishing."', blk().some(m => /add at least one Required Observation before publishing/.test(m)) && /Add at least one Required Observation before publishing\./.test(q('.cbr2-req').textContent), J(blk()));
    go('a-programmes', { id: P.id, tab: 'review' }); const fix = qa('.cb-rv-sec[data-sec="observations"] [data-go], .cb-rv [data-tab="events"]').find(b => b.dataset.tab === 'events' || b.dataset.tab === 'observations');
    ok('CBC2-14 Review & Publish lists it under Observations with a link to the step', /Add at least one Required Observation before publishing/i.test(main()) && !!fix);
    ok('CBC2-14 Publish is disabled', !!q('[data-act="cbPublish"][disabled]') || !q('[data-act="cbPublish"]'));
    step4(P); click(q('.cbr2-req [data-act="cbObsEv"][data-e=""]'));
    ok('CBC2-11 "Add Required Observation" opens the editor: title, location (enabled ones), qualification criteria, evidence', !!MODAL && /^Add Required Observation/.test(MODAL.title) && /Observation title/.test($1('#modal-root').textContent) && $a('#modal-root .ev-l').length === 2 && $a('#modal-root .ev-c').length >= 2 && $a('#modal-root .ev-e').length >= 2);
    const nvq = n5NvqOk(P, n5Draft(P)).map(c => c.code);
    $1('#ev-n').value = 'Moving and handling'; tick('.ev-l', ['workplace']); tick('.ev-c', []); mclick(/^Add Required Observation$/);
    ok('CBC2-11 (negative) without criteria it is refused with a message; nothing added', !!MODAL && /Choose the criteria/.test($1('#modal-root').textContent) && evs(P).length === 0);
    tick('.ev-c', [nvq[0]]); tick('.ev-e', ['notes', 'photos']); mclick(/^Add Required Observation$/);
    const e1 = evs(P)[0];
    ok('CBC2-11 added by hand: one Required Observation with its title, location, criteria and evidence (audited)', evs(P).length === 1 && e1.name === 'Moving and handling' && J(e1.loc) === J(['workplace']) && J(e1.crit) === J([nvq[0]]) && ADMIN.audit.slice(0, 3).some(a => a.action === 'Observation event added'));
    step4(P); ok('CBC2-11 shown as a compact row: title, location, number of criteria, Edit and Remove', /Moving and handling/.test(q('.cbr2-ro').textContent) && /Workplace · 1 criterion/.test(q('.cbr2-ro').textContent) && !!q('.cbr2-ro [data-act="cbObsEv"]') && !!q('.cbr2-ro [data-act="cbObsEvRemove"]'));
    ok('CBC2-6/14 an uncovered qualification criterion still blocks, with an actionable message', blk().some(m => new RegExp(`add 1 qualification criterion to a Required Observation: ${nvq[1]}`).test(m)), J(blk()));
    click(q(`.cbr2-ro[data-e="${e1.id}"] [data-act="cbObsEv"]`)); $1('#ev-n').value = 'Moving, handling and communication'; tick('.ev-l', ['workplace', 'office']); tick('.ev-c', nvq); mclick(/^Save$/);
    ok('CBC2-12 Edit: title, both locations and both criteria saved on the same definition (ID kept)', evs(P).length === 1 && evs(P)[0].id === e1.id && evs(P)[0].name === 'Moving, handling and communication' && J(evs(P)[0].loc) === J(['workplace', 'office']) && evs(P)[0].crit.length === 2);
    step4(P); click(q('.cbr2-req [data-act="cbObsEv"][data-e=""]')); $1('#ev-n').value = 'Second check'; tick('.ev-l', ['office']); tick('.ev-c', [nvq[1]]); tick('.ev-e', ['notes']); mclick(/^Add Required Observation$/);
    step4(P); ok('CBC2-12 a second one, then reorder (↑) keeps both', evs(P).length === 2 && (click(q(`.cbr2-ro[data-e="${evs(P)[1].id}"] [data-dir="-1"]`)), evs(P)[0].name === 'Second check'));
    step4(P); const e2 = evs(P).find(e => e.name === 'Second check'); click(q(`.cbr2-ro[data-e="${e2.id}"] [data-act="cbObsEvRemove"]`)); reason('Not needed');
    ok('CBC2-13 Remove (Draft): gone from the draft, audited with the reason', evs(P).length === 1 && evs(P)[0].id === e1.id && ADMIN.audit.slice(0, 3).some(a => a.action === 'Observation event removed' && a.reason === 'Not needed'));
    ok('CBC2-14 with a valid definition nothing in Observations blocks', !blk().some(m => /Observations/i.test(m) || /Required Observation/.test(m)), J(blk()));
  });
  await T('CBC2-15 publish, then a new version', async () => {
    ACA(); submitAndApprove(P); const wf = cb8Wf(P); ok('CBC2-15 setup: the fee package is approved by Finance', !!wf && wf.status === 'Approved', J([wf && wf.status, cb8Issues(P, cb8Work(P)).map(x => x.msg), lastT])); ACA(); go('a-programmes', { id: P.id, tab: 'review' });
    ok('CBC2-15 setup: nothing blocks publishing', !cbRvChecks(P).block.length, J(cbRvChecks(P).block.map(b => b.msg)));
    click(q('[data-act="cbPublish"]')); reason('CBC2 publish');
    const pubEv = cbObsEventsFor(P.id, 1);
    ok('CBC2-15 published (Version 1) with its Required Observation frozen into the version', P.status === 'Active' && P.version === 1 && pubEv.length === 1 && pubEv[0].name === 'Moving, handling and communication');
    step4(P); ok('CBC2-15 the published step is read-only: no add / edit / remove, "Frozen with Version 1"', !q('[data-act="cbObsEv"]') && !q('[data-act="cbObsEvRemove"]') && /Frozen with Version 1/.test(q('.cbr2-req').textContent));
    SA(); ACT.s3WizVersion({ dataset: { id: P.id } }); reason('CBC2 version 2'); go('a-programmes', { id: P.id, tab: 'details' }); click(q('#cbr2-obs-yes')); step4(P);
    const dv = n5Draft(P);
    ok('CBC2-20 a new version copies the Required Observation with the same ID, editable in the draft', dv.v === 2 && evs(P).length === 1 && evs(P)[0].id === pubEv[0].id && !!q('.cbr2-req [data-act="cbObsEv"][data-e=""]'));
    click(q(`.cbr2-ro[data-e="${pubEv[0].id}"] [data-act="cbObsEv"]`)); $1('#ev-n').value = 'Version 2 title'; mclick(/^Save$/);
    ok('CBC2-20 changing it in the draft leaves Version 1 unchanged', evs(P)[0].name === 'Version 2 title' && cbObsEventsFor(P.id, 1)[0].name === 'Moving, handling and communication');
  });
  await T('CBC2-16/18 published records and IQA', async () => {
    ok('CBC2-16 every other published observation configuration is unchanged', J(JSON.parse(pubCfg()).filter(x => x[0] !== P.id)) === J(JSON.parse(pub0).filter(x => x[0] !== P.id)));
    ok('CBC2-16 learners\' observations, bookings and location choices are unchanged', lrnObs() === obs0);
    QA(); go('q-records');
    ok('CBC2-18 IQA: Assessment Records opens and every record is still there (observations included)', S.route === 'q-records' && /Assessment Records/.test(main()) && (typeof allIqaRecords !== 'function' || J(allIqaRecords().map(r => [r.id || r.key, r.type || r.kind, r.status])) === iqa0) && allIqaRecords().some(r => /observ/i.test(J(r))));
  });
  await T('CBC2-19 other roles', async () => {
    const id = P.id, d = n5Draft(P), n0 = evs(P).length, e = evs(P)[0];
    for (const [f, who] of [[FA, 'Finance Admin'], [BA, 'Business Admin'], [QA, 'IQA']]) {
      f(); const a0 = ADMIN.audit.length; step4(P);
      ok(`CBC2-19 ${who}: no add / edit / remove or location switch on the step`, !q('[data-act="cbObsEv"]') && !q('[data-act="cbObsEvRemove"]') && !q('.cbr2-col input[data-onchange="cbr2Loc"]:not([disabled])'));
      ACT.cbObsEv({ dataset: { p: id, e: '' } }); const m1 = !!MODAL; closeModal(); ACT.cbObsEvRemove({ dataset: { p: id, e: e.id } }); const m2 = !!MODAL; closeModal(); ACT.cbrObsLoc({ dataset: { p: id, loc: 'wp', v: 'off' } }); closeModal();
      ok(`CBC2-19 ${who}: add / remove / location change called directly are refused and logged; nothing changes`, !m1 && !m2 && evs(P).length === n0 && n5Draft(P).workplace === 'Permitted' && since(a0).some(x => /^Blocked/.test(x.action)), J(since(a0).map(x => x.action)));
    }
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
