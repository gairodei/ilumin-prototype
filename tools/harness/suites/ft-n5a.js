// N5a — programme-specific observation configuration (architecture approved 20 Oct 2026). Each check acts through the handler or
// the screen, then reads the stored configuration, the audit or the consuming screen, and includes the negative case.
(async function () {
  // DM-P (PD-DM-15): publishing a programme or version needs fee options by delivery mode, approved by Finance. Where a check isn't about
  // fees, this fixture takes the authorized Section 5 path first: the duration of a pre-builder course, a financial package, fee options by
  // delivery mode, a mode for each option (the Standard programme fee replaced by an option at the same fee), the Super Administrator's own approval (D8)
  const dmpComply = (pid, mode = 'Fully Assisted') => {
    const pr = s3Pr(pid) || cbPr(pid); if (!pr) return false; const av = ADMIN.av, po = S.portal, aca = typeof isAca === 'function' && isAca();
    const qm1 = k => document.querySelector('#modal-root ' + k), put = (k, v) => { const e = qm1(k); if (e && !e.value) e.value = v; };
    const go1 = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
    const rs = () => { const e = document.querySelector('#rsn'); if (e) e.value = 'Fixture: fee options by delivery mode'; return go1(); };
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    if (!pr.durV) { ACT.crDurRec({ dataset: { p: pr.id } }); put('#cr-du-n', '12'); rs(); }
    if (!cb8Managed(pr)) ACT.cb8Start({ dataset: { p: pr.id } });
    if (!crMultiFee(pr)) { ACT.crFoStart({ dataset: { p: pr.id } }); rs(); }
    cb8Work(pr).opts.filter(o => o.status === 'Active' && (o.legacy || !M_MODES.includes(o.mode))).map(o => o.id).forEach(id => {
      const o = cb8Work(pr).opts.find(x => x.id === id);
      if (o.legacy) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String(o.fee); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); ACT.cb8OptRetire({ dataset: { p: pr.id, o: id } }); rs(); }
      else { ACT.cb8Opt({ dataset: { p: pr.id, o: id } }); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-f', '2400'); /* a course without any fee (seeded Level 4): the fixture enters one */ put('#c8-wp', '0'); put('#c8-off', '0'); go1(); }
      closeModal();
    });
    if (!cb8Work(pr).opts.some(o => o.status === 'Active' && !o.legacy && M_MODES.includes(o.mode))) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String((s4PlanCur(pr.id) || {}).fee || 2400); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); closeModal(); } // no option at all (a Level 3 package starts from the options in force): one at the plan's fee
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
    if (!(cb8Wf(pr) && cb8Wf(pr).status === 'Approved')) { ACT.cb8SaApprove({ dataset: { p: pr.id } }); rs(); }
    closeModal(); if (aca) { acaEnter(av); S.signedIn = true; } else setAdminIdentity(av); S.portal = po; return true;
  };
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; S.offline = false; S.saveFail = false; initStore(); };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SYS = () => { ACT.switchRole({ dataset: { r: 'sysA' } }); S.signedIn = true; S.ui = {}; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'N5a test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const pr = id => s3Pr(id), D = id => STORE.n5.draft[id], P = (id, v) => (STORE.n5.pub[id] || {})[v];
  const audit0 = () => ADMIN.audit[0] || {};
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; return !!r; };
  const settings = (id, req, wp, off) => { ACT.n5Settings({ dataset: { p: id } }); if (!MODAL) return false; if (req) radio('n5-req', req); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  const tick = (sel, vals) => document.querySelectorAll('#modal-root ' + sel).forEach(x => { x.checked = vals.includes(x.value); });
  const nvqEv = (id, code, types, instr = '') => { ACT.n5NvqEv({ dataset: { p: id, c: code } }); if (!MODAL) return false; tick('.n5-ev', types); document.querySelector('#n5n-i').value = instr; press(); return true; };
  const iaEdit = (id, code, o) => { ACT.n5IaEdit({ dataset: { p: id, c: code || '' } }); if (!MODAL) return false; if (o.t != null) document.querySelector('#n5-t').value = o.t; if (o.d != null) document.querySelector('#n5-d').value = o.d; if (o.ev) tick('.n5-ev', o.ev); if (o.instr != null) document.querySelector('#n5a-i').value = o.instr; if (o.map) tick('.n5-map', o.map); return press(); };
  const newVer = id => { ACT.newProgVersion({ dataset: { id } }); reason('N5a new version'); };
  const publish = id => { dmpComply(id); ACT.kPubProg({ dataset: { id } }); if (MODAL && /^Publish/.test(MODAL.title)) return reason('N5a publish'); };
  // Everything a valid required configuration needs: settings, evidence on every criterion, every Academy criterion mapped
  const configure = (id, ev = ['notes', 'photos']) => { settings(id, 'yes', 'Permitted', 'Available'); const p = pr(id), d = n5Draft(p), codes = n5NvqOk(p, d).map(c => c.code); codes.forEach(c => nvqEv(id, c, ev, 'Observe ' + c)); d.ia.filter(c => c.status === 'Active').forEach(c => iaEdit(id, c.code, { ev: ['notes'], map: [codes[0]] }));
    // CB6 (PD-CB-41) adds observation events to a valid required configuration: one workplace observation covering every criterion
    ACT.cbObsEv({ dataset: { p: id, e: '' } }); if (MODAL) { tick('.ev-l', ['workplace']); tick('.ev-c', codes.concat(d.ia.filter(c => c.status === 'Active').map(c => c.code))); tick('.ev-e', ['notes']); press(); } return codes; };
  const hist = () => JSON.stringify({ obs: Object.values(STORE.worlds).map(w => w.observations || []), tas: STORE.tas ? STORE.tas.obs : null, trees: Object.values(STORE.worlds).map(w => (w.tree || []).map(u => u.mods.map(m => m.los.map(l => l.crit.map(c => [c.code, c.st, c.obs || null]))))), lib: STORE.aca.obsLib, forms: Object.values(STORE.worlds).map(w => w.iaCriteria || null), asg: Object.values(STORE.worlds).map(w => (w.assignments || []).map(a => [a.id, a.status, a.outcome || null])) });
  const path = (id, code) => { const t = s3ViewTree(id); for (const u of t) for (const m of u.mods) for (const lo of m.los) for (const c of lo.crit) if (c.code === code) return { u: u.code, m: m.code, lo: lo.code, c: c.code }; return null; };

  /* ---------- Migration ---------- */
  await T('N5a migration', async () => {
    fresh(); SA(); const L3 = P('NV-L3', 2), L2 = P('NV-L2', 1), lib = STORE.aca.obsLib;
    ok('N5a-M1 every current published version has its own configuration (Level 2, 3, 4, 5, retired 2018 spec, wizard NV-N2)', ['NV-L2:1', 'NV-L3:2', 'NV-L4:1', 'NV-L5:1', 'NV-L3O:4', 'NV-N2:1'].every(k => { const [id, v] = k.split(':'); const c = P(id, +v); return c && c.state === 'Published' && c.origin === 'Pre-N5 migration'; }));
    ok('N5a-M1 …migrated versions record no settings (nothing invented): required / workplace / office not recorded', ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5'].every(id => { const c = P(id, pr(id).version); return c.required === null && c.workplace === null && c.office === null; }));
    ok('N5a-M2 Level 2 and Level 3 get copies of IA-1–IA-4 (Active, on forms, attached) — codes and titles preserved', L3.ia.map(c => c.code).join() === 'IA-1,IA-2,IA-3,IA-4' && L2.ia.map(c => c.code).join() === 'IA-1,IA-2,IA-3,IA-4' && L3.ia.every(c => c.title === lib.find(x => x.code === c.code).title && c.src.lib === c.code));
    ok('N5a-M2 …independent copies: no object shared between programmes or with the library', L3.ia.every((c, i) => c !== L2.ia[i] && c.ev !== L2.ia[i].ev && c.map !== L2.ia[i].map) && L3.ia.every(c => !lib.includes(c)));
    ok('N5a-M3 Level 4, Level 5 and NV-N2 get no Academy criteria (nothing attached and on forms)', !P('NV-L4', 1).ia.length && !P('NV-L5', 1).ia.length && !P('NV-N2', 1).ia.length);
    const mig = STORE.n5.mig;
    ok('N5a-M3 ambiguous attachments are reported, not copied (Level 5: IA-8, IA-11, IA-15 — attached but not on forms)', ['IA-8', 'IA-11', 'IA-15'].every(k => mig.some(m => m.pid === 'NV-L5' && m.code === k && /not copied/.test(m.why))) && !P('NV-L3', 2).ia.some(c => mig.some(m => m.code === c.code)));
    ok('N5a-M4 NVQ observation criteria are each programme\'s own (frozen with the version)', P('NV-L4', 1).snap.map(c => c.code).join() === '401 2.1,402 2.1,403 2.1' && P('NV-L5', 1).snap.map(c => c.code).join() === '501 2.1,502 2.1,503 2.1' && P('NV-N2', 1).snap.map(c => c.code).join() === '201 2.1' && P('NV-L3', 2).snap.every(c => /^30\d 2\.|^306 3\./.test(c.code)));
    ok('N5a-M5 Draft programmes get an empty draft (NV-L3D, NV-N1); NV-L3D\'s NVQ criteria include its own 310 1.1', D('NV-L3D') && D('NV-L3D').v === 1 && !D('NV-L3D').ia.length && n5Nvq(pr('NV-L3D'), D('NV-L3D')).some(c => c.code === '310 1.1') && D('NV-N1') && D('NV-N1').origin === 'New programme');
    ok('N5a-M6 published configurations are frozen (deep)', Object.isFrozen(L3) && Object.isFrozen(L3.ia) && Object.isFrozen(L3.ia[0]) && Object.isFrozen(L3.ia[0].ev.types) && Object.isFrozen(L3.snap[0]));
    ok('N5a-M7 the shared library is unchanged (15 criteria, IA-1 still attached to Level 2 and 3, on forms, v1)', lib.length === 15 && lib.find(c => c.code === 'IA-1').progs.join() === 'NV-L2,NV-L3' && lib.find(c => c.code === 'IA-1').form === true && lib.find(c => c.code === 'IA-1').version === 1);
    go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    ok('N5a-M8 earlier versions: "No observation configuration recorded" (Level 3 Version 1)', /Version 1No observation configuration recorded \(published before N5\)/.test(document.querySelector('main .n5-vers').textContent));
    ok('N5a-M8 the tab lists the shared-library attachments that weren\'t copied', !!document.querySelector('main .n5-mig') && /IA-7/.test(document.querySelector('main .n5-mig').textContent));
    ok('N5a-M9 the API returns a version\'s configuration (null when none was recorded)', n5ConfigFor('NV-L3', 2) === L3 && n5ConfigFor('NV-L3', 1) === null);
  });

  /* ---------- Builder: tab, step, read-only published versions ---------- */
  await T('N5a builder', async () => {
    fresh(); SA();
    // CB1 (PD-CB-01) supersedes the tab bar in N5a-B1…B4, W4 and K2: was an "Observations" tab after "Shared library (legacy)" (seeded)
    // or step 3 of the wizard bar; now the Observations section (4 of 7) with "Observation configuration" and, for seeded programmes,
    // "Shared library (legacy)" panels. What each shows, and who can change it, is unchanged.
    ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5'].forEach(id => { go('a-programmes', { id, tab: 'obs' }); const pans = [...document.querySelectorAll('main .cb-panels .tab')].map(t => t.textContent);
      ok(`N5a-B1 ${id}: the Observations section (old "obs" link) with its configuration panel selected and the legacy library panel next to it, read-only for the published version`, !!document.querySelector('main .cb-sec.cur[data-tab="observations"]') && pans.join() === 'Observation configuration,Observation events,Shared library (legacy)' /* CB6 (PD-CB-40): the Observation events panel joins the section */ && document.querySelector('main .cb-panels [data-tab="obs"]').getAttribute('aria-selected') === 'true' && !document.querySelector('main [data-act="n5Settings"], main [data-act="n5IaEdit"], main [data-act="n5NvqEv"]') && !!document.querySelector('main [data-act="newProgVersion"]')); });
    go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    ok('N5a-B2 Level 3: Fee options kept (Fees & Payments section); Observations shows its own NVQ criteria and IA-1–IA-4', !!document.querySelector('main .cb-sec[data-tab="payments"]') && ['301 2.1', '306 3.1'].every(c => !!document.querySelector(`main .n5-nvq tr[data-code="${c}"]`)) && ['IA-1', 'IA-4'].every(c => !!document.querySelector(`main .n5-ia tr[data-code="${c}"]`)) && !document.querySelector('main .n5-nvq tr[data-code="301 1.1"]'));
    go('a-programmes', { id: 'NV-L3', tab: 'fees' }); ok('N5a-B2 …the old "fees" link opens the Level 3 fee options', !!document.querySelector('main .cb-panels [data-tab="fees"][aria-selected="true"]') && !!document.querySelector('main .r1-opts'));
    go('a-programmes', { id: 'NV-L5', tab: 'obs' });
    ok('N5a-B2 Level 5: its own NVQ criteria (501 2.1…), no Level 3 codes, no Academy criteria', !!document.querySelector('main .n5-nvq tr[data-code="501 2.1"]') && !document.querySelector('main .n5-nvq tr[data-code="301 2.1"]') && /No Academy criteria in this version/.test(document.querySelector('main .n5-ia').textContent));
    go('a-programmes', { id: 'NV-L3', tab: 'tree' }); /* CB4 (PD-CB-26) supersedes "Hierarchy": the one curriculum editor is titled "Curriculum structure" */ ok('N5a-B3 other sections unchanged: the hierarchy still renders (Curriculum) with Observations as another section', /Curriculum structure/.test(main()) && !!document.querySelector('main .cb-sec.cur[data-tab="curriculum"]') && !!document.querySelector('main .cb-sec[data-tab="observations"]:not(.cur)'));
    go('a-programmes', { id: 'NV-N1', tab: 'obs' }); const steps = [...document.querySelectorAll('main .cb-nav .cb-sec')];
    ok('N5a-B4 new programme: Observations is section 4 (after Curriculum and Assessments), current, editable in the Draft', steps.length === 7 && steps[3].classList.contains('cur') && /Observations/.test(steps[3].textContent) && !!document.querySelector('main .n5-head') && !!document.querySelector('main [data-act="n5Settings"]') && !/undefined/.test(main()));
    ok('N5a-B4 …"Fees & Payments →" follows it', /Fees & Payments →/.test((document.querySelector('main .cb-foot') || {}).textContent || ''));
    go('a-programmes', { id: 'NV-N1', tab: 'review' });
    ok('N5a-B5 wizard Review: an Observations line and the blocking "choose whether observation is required"', /* CB11 (PD-CB-73): was the CH-8 review's .n5-rev line and .ch8-review list */ !!document.querySelector('main .cb-rv-sec[data-sec="observations"]') && /Blocking\s*Choose whether observation is required for Version 1 \(Yes or No\)/.test(document.querySelector('main .cb-rv-todo').textContent));
    go('a-programmes', { id: 'NV-L3O', tab: 'obs' });
    ok('N5a-B6 retired programme: read-only, no edit controls', /Retired programme — read-only/.test(main()) && !document.querySelector('main [data-act^="n5"]'));
  });

  /* ---------- Settings, enabled / disabled, ways to observe ---------- */
  await T('N5a settings', async () => {
    fresh(); ACA();
    ok('N5a-S1 published version: settings can\'t be changed (refused, logged)', (ACT.n5Settings({ dataset: { p: 'NV-L3' } }), !MODAL && audit0().action === 'Blocked: change observation settings' && /Published versions can't be changed/.test(audit0().reason)));
    newVer('NV-L3'); const d = D('NV-L3'), p2 = P('NV-L3', 2);
    ok('N5a-S2 a new version gets a draft configuration copied from Version 2', d && d.v === 3 && d.origin === 'Copied from Version 2' && d.ia.map(c => c.code).join() === 'IA-1,IA-2,IA-3,IA-4' && d.ia[0] !== p2.ia[0] && d.ia.every(c => c.pubV === 1));
    ok('N5a-S2 …without a decision: "Observation required" must be chosen for Version 3 (blocking)', d.required === null && n5Check(pr('NV-L3')).block.some(b => /choose whether observation is required for Version 3 \(Yes or No\)/.test(b)));
    publish('NV-L3'); ok('N5a-S2 …publishing Version 3 without it is refused (logged); still Version 2', /Can't publish/.test(MODAL && MODAL.title) && /choose whether observation is required/.test(mroot().textContent) && pr('NV-L3').version === 2 && audit0().action === 'Blocked: publish (observation configuration)'); closeModal();
    settings('NV-L3', 'yes', 'Permitted', 'Available');
    ok('N5a-S3 settings saved in the draft and audited with before → after', d.required === true && d.workplace === 'Permitted' && d.office === 'Available' && audit0().action === 'Observation settings changed' && /Required: not recorded/.test(audit0().before) && /Required: Yes/.test(audit0().after));
    ok('N5a-S3 …the published Version 2 is unchanged', p2.required === null && p2.workplace === null);
    settings('NV-L3', 'no'); const ck = n5Check(pr('NV-L3'));
    ok('N5a-S4 "No" while active Observation-type Learning Outcomes exist: flagged for review (D5), not blocking', ck.review.some(r => /Review \(D5\)/.test(r) && /Learning Outcomes have the Observation type \(U30/.test(r)) && !ck.block.length);
    ok('N5a-S4 "No": no observation criteria, routes or evidence demanded; the Academy criteria stay in the version (history)', !ck.block.some(b => /evidence|workplace|Academy-office|no active NVQ/.test(b)) && d.ia.length === 4 && ck.warn.some(w => /kept in this version for history/.test(w)));
    dmpComply('NV-L3'); ACT.kPubProg({ dataset: { id: 'NV-L3' } });
    ok('N5a-S4 …the publish dialog shows the review flag', /^Publish/.test(MODAL && MODAL.title) && /Review \(D5\)/.test((mroot().querySelector('.n5-warn') || {}).textContent || '')); closeModal();
    go('a-programmes', { id: 'NV-L3', tab: 'obs' }); ok('N5a-S4 …and the tab lists it as "Review"', !!document.querySelector('main .n5-checks .n5-review'));
    settings('NV-L3', 'yes', 'Not permitted', 'Not available');
    ok('N5a-S5 required with no way to observe: blocking', n5Check(pr('NV-L3')).block.some(b => /no way to observe/.test(b)));
    settings('NV-L3', null, 'Not permitted', 'Available');
    ok('N5a-S5 Academy office only: a warning (pending client), not a blocker', n5Check(pr('NV-L3')).warn.some(w => /Academy-office observation only/.test(w)) && !n5Check(pr('NV-L3')).block.some(b => /no way to observe/.test(b)));
    ok('N5a-S5 …and the Academy criteria aren\'t used then (warning)', n5Check(pr('NV-L3')).warn.some(w => /apply to workplace observations only/.test(w)));
    settings('NV-L3', null, 'Permitted', 'Available');
    ok('N5a-S6 required with evidence settings missing: blocking (NVQ and Academy criteria named)', n5Check(pr('NV-L3')).block.some(b => /permitted evidence for 6 NVQ criteria/.test(b)) && n5Check(pr('NV-L3')).block.some(b => /permitted evidence for 4 Academy criteria: IA-1, IA-2, IA-3, IA-4/.test(b)));
    // A wizard Draft with no Observation Learning Outcome: required → blocking; not required → fine
    SA(); const n1 = pr('NV-N1'); settings('NV-N1', 'yes', 'Permitted', 'Available');
    ok('N5a-S7 required but no NVQ observation criteria: blocking in the wizard Review (ch8Check)', ch8Check(n1).block.some(b => /no active NVQ observation criteria/.test(b)));
    settings('NV-N1', 'no'); ok('N5a-S8 observation not required and no Observation criteria: no observation blockers', !n5Check(n1).block.length && !ch8Check(n1).block.some(b => /^Observations/.test(b)));
    // CB4 (PD-CB-30) supersedes choosing the Observation type while "Not required": that is now refused (logged) and the type is
    // unchanged; the D5 review is still reached the way it arises now — the type chosen while observation is required, then "No"
    const a9 = ADMIN.audit.length; INP.ch8LoType({ value: 'Observation', dataset: { id: 'NV-N1', u: '0', m: '0', l: '1' } }); if (MODAL) reason('Observation LO');
    ok('N5a-S9 (CB4) "Not required": choosing the Observation type is refused and logged; the type is unchanged', ch8Tree('NV-N1')[0].mods[0].los[1].type !== 'Observation' && ADMIN.audit.slice(0, ADMIN.audit.length - a9).some(a => a.action === 'Blocked: Observation type (course has no observations)'));
    settings('NV-N1', 'yes'); INP.ch8LoType({ value: 'Observation', dataset: { id: 'NV-N1', u: '0', m: '0', l: '1' } }); if (MODAL) reason('Observation LO'); settings('NV-N1', 'no');
    ok('N5a-S9 giving a Learning Outcome the Observation type adds its criteria (401 2.1) — and "Not required" is flagged for review', n5Nvq(n1, D('NV-N1')).some(c => c.code === '401 2.1') && n5Check(n1).review.some(r => /U401 LO2/.test(r)) && !n5Check(n1).block.length && ch8Check(n1).warn.some(w => /Review \(D5\)/.test(w)));
    const na = ADMIN.audit.length; settings('NV-N1', null); ok('N5a-S10 "Nothing has changed" leaves the draft as it was (no audit entry)', D('NV-N1').required === false && ADMIN.audit.length === na && !!MODAL); closeModal();
  });

  /* ---------- Evidence configuration ---------- */
  await T('N5a evidence', async () => {
    fresh(); SA(); newVer('NV-L3'); settings('NV-L3', 'yes', 'Permitted', 'Available');
    ACT.n5NvqEv({ dataset: { p: 'NV-L3', c: '301 2.1' } }); const body = mroot().textContent;
    ok('N5a-E1 evidence dialog: the five types, instructions, the structure\'s requirement; no file-size or retention rule', document.querySelectorAll('#modal-root .n5-ev').length === 5 && ['Assessor notes', 'Photos', 'Videos', 'Documents', 'Authorised references'].every(t => body.includes(t)) && !!document.querySelector('#n5n-i') && /From the structure:/.test(body) && !/\bMB\b|\bGB\b|retention|retain|maximum size/i.test(body)); closeModal();
    nvqEv('NV-L3', '301 2.1', ['photos', 'refs'], 'Photo of the equipment check; long video by reference');
    const e = D('NV-L3').nvq['301 2.1'];
    ok('N5a-E2 only the chosen types are saved, with the instructions (not every type)', e.types.join() === 'photos,refs' && /long video by reference/.test(e.instr) && audit0().action === 'Observation evidence changed');
    nvqEv('NV-L3', '302 2.1', ['notes']);
    ok('N5a-E3 each criterion keeps its own evidence settings', D('NV-L3').nvq['302 2.1'].types.join() === 'notes' && D('NV-L3').nvq['301 2.1'].types.join() === 'photos,refs');
    ok('N5a-E4 criteria without evidence types still block a required version', n5Check(pr('NV-L3')).block.some(b => /permitted evidence for 4 NVQ criteria/.test(b)));
    ACT.n5NvqEv({ dataset: { p: 'NV-L3', c: '301 1.1' } });
    ok('N5a-E5 a Knowledge criterion has no observation evidence settings (refused)', !MODAL);
    go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    ok('N5a-E6 the tab shows each criterion\'s permitted evidence and instructions', /Photos/.test(document.querySelector('main .n5-nvq tr[data-code="301 2.1"]').textContent) && /Authorised references/.test(document.querySelector('main .n5-nvq tr[data-code="301 2.1"]').textContent) && /None chosen/.test(document.querySelector('main .n5-nvq tr[data-code="301 2.2"]').textContent));
  });

  /* ---------- Academy criteria, mapping, isolation ---------- */
  await T('N5a criteria and mapping', async () => {
    fresh(); SA(); const before = hist(), T1 = P('NV-L3', 2).ia[0].title; newVer('NV-L3'); newVer('NV-L2');
    ACT.n5IaEdit({ dataset: { p: 'NV-L3', c: 'IA-1' } });
    const opts = [...document.querySelectorAll('#modal-root .n5-map')].map(x => x.value);
    ok('N5a-C1 the mapping lists only this version\'s active NVQ observation criteria (no Knowledge, no other programme)', opts.join() === n5NvqOk(pr('NV-L3'), D('NV-L3')).map(c => c.code).join() && opts.length === 6 && !opts.includes('301 1.1') && !opts.some(c => /^(401|501|201) /.test(c))); closeModal();
    iaEdit('NV-L3', 'IA-1', { t: 'Treats people with dignity (2027 wording)', ev: ['notes', 'photos'], map: ['301 2.1', '302 2.1'] });
    const c3 = D('NV-L3').ia.find(c => c.code === 'IA-1');
    ok('N5a-C2 mapping saved explicitly; evidence saved; the criterion gets version 2 in this draft', c3.map.join() === '301 2.1,302 2.1' && c3.ev.types.join() === 'notes,photos' && c3.v === 2 && c3.title === 'Treats people with dignity (2027 wording)');
    iaEdit('NV-L3', 'IA-1', { d: 'Second edit in the same draft' });
    ok('N5a-C2 …a second edit in the same draft keeps version 2', D('NV-L3').ia.find(c => c.code === 'IA-1').v === 2);
    go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    ok('N5a-C3 the NVQ row shows the Academy criteria mapped to it', /IA-1/.test(document.querySelector('main .n5-nvq tr[data-code="301 2.1"]').lastElementChild.previousElementSibling.textContent));
    ok('N5a-C4 isolation: Level 2\'s IA-1, Level 3\'s published IA-1 and the library\'s IA-1 are unchanged', D('NV-L2').ia.find(c => c.code === 'IA-1').title === T1 && P('NV-L3', 2).ia.find(c => c.code === 'IA-1').title === T1 && P('NV-L3', 2).ia[0].v === 1 && STORE.aca.obsLib.find(c => c.code === 'IA-1').title === T1);
    ok('N5a-C4 …and today\'s observation forms are unchanged by the programme draft', JSON.stringify(JSON.parse(hist()).forms) === JSON.stringify(JSON.parse(before).forms));
    go('k-obslib'); ACT.kLib({ dataset: { id: 'IA-1' } }); document.querySelector('#kl-t').value = 'Library wording change'; document.querySelector('#kl-r').value = 'N5a isolation'; prim(); closeModal();
    ok('N5a-C5 editing the shared library changes no programme configuration (draft or published)', STORE.aca.obsLib.find(c => c.code === 'IA-1').title === 'Library wording change' && D('NV-L3').ia[0].title === 'Treats people with dignity (2027 wording)' && D('NV-L2').ia[0].title === T1 && P('NV-L2', 1).ia[0].title === T1);
    ok('N5a-C5 …the library page says so', !!document.querySelector('main .n5-libnote') && /don't change any programme version's configuration/.test(document.querySelector('main .n5-libnote').textContent));
    iaEdit('NV-L3', '', { t: 'Explains each step before giving care', ev: ['notes'], map: ['306 3.1'] }); iaEdit('NV-L2', '', { t: 'Uses the hoist safely', ev: ['videos', 'refs'] });
    const n3 = D('NV-L3').ia.find(c => c.title === 'Explains each step before giving care'), n2 = D('NV-L2').ia.find(c => c.title === 'Uses the hoist safely');
    ok('N5a-C6 the same code can exist in separate programmes (IA-16 in Level 2 and Level 3), clear of the shared library\'s codes', n3.code === 'IA-16' && n2.code === 'IA-16' && n3 !== n2 && n3.pubV === null && /Version 3/.test(n3.src.added));
    iaEdit('NV-L2', 'IA-16', { t: 'Uses the hoist safely (edited in Level 2)' });
    ok('N5a-C6 …editing one doesn\'t touch the other', n3.title === 'Explains each step before giving care' && n2.title === 'Uses the hoist safely (edited in Level 2)');
    ACT.n5IaState({ dataset: { p: 'NV-L3', c: 'IA-2', a: 'remove' } });
    ok('N5a-C7 a published criterion can\'t be removed (refused, logged) — retire it instead', !MODAL && audit0().action === 'Blocked: remove an Academy observation criterion' && D('NV-L3').ia.some(c => c.code === 'IA-2'));
    ACT.n5IaState({ dataset: { p: 'NV-L3', c: 'IA-2', a: 'retire' } }); reason('Covered by IA-16');
    ok('N5a-C7 …retired: kept in the version, off the workplace checklist', D('NV-L3').ia.find(c => c.code === 'IA-2').status === 'Retired' && !n5Checklist(pr('NV-L3'), D('NV-L3'), 'workplace').items.some(i => i.code === 'IA-2'));
    ACT.n5IaState({ dataset: { p: 'NV-L3', c: 'IA-2', a: 'restore' } }); reason('Still needed'); ok('N5a-C7 …and restored', D('NV-L3').ia.find(c => c.code === 'IA-2').status === 'Active');
    ACT.n5IaState({ dataset: { p: 'NV-L2', c: 'IA-16', a: 'remove' } }); reason('Added by mistake');
    ok('N5a-C8 a criterion added in this draft (never published) can be removed', !D('NV-L2').ia.some(c => c.code === 'IA-16') && audit0().action === 'Observation criterion removed (never published)');
    // Stale mapping: the mapped NVQ criterion is suspended in the draft structure
    settings('NV-L3', 'yes', 'Permitted', 'Available'); const at = path('NV-L3', '302 2.1');
    ACT.nodeState({ dataset: { p: 'NV-L3', u: at.u, m: at.m, lo: at.lo, c: at.c } }); document.querySelector('#ns').value = 'Suspended'; reason('N5a stale mapping');
    ok('N5a-C9 a mapping to an NVQ criterion that is no longer active blocks publishing (named)', n5Check(pr('NV-L3')).block.some(b => /IA-1 → 302 2\.1/.test(b)) && !n5NvqOk(pr('NV-L3'), D('NV-L3')).some(c => c.code === '302 2.1'));
    ok('N5a-C10 history: no observation, learner judgement or assignment outcome changed by the configuration edits (the library edit above is the S3 library\'s own behaviour)', ['obs', 'tas', 'trees', 'asg'].every(k => JSON.stringify(JSON.parse(hist())[k]) === JSON.stringify(JSON.parse(before)[k])));
  });

  /* ---------- Observation types: what each checklist covers ---------- */
  await T('N5a observation types', async () => {
    fresh(); SA(); newVer('NV-L3'); configure('NV-L3'); const p = pr('NV-L3'), d = D('NV-L3');
    const wp = n5Checklist(p, d, 'workplace'), off = n5Checklist(p, d, 'office');
    ok('N5a-T1 workplace: the programme\'s Academy criteria + the NVQ criteria', wp.ok && wp.items.filter(i => i.kind === 'Academy').map(i => i.code).join() === 'IA-1,IA-2,IA-3,IA-4' && wp.items.filter(i => i.kind === 'NVQ').length === 6);
    ok('N5a-T2 Academy office: NVQ criteria only', off.ok && off.items.length === 6 && off.items.every(i => i.kind === 'NVQ'));
    ok('N5a-T3 nothing on a checklist carries an outcome', wp.items.every(i => !('st' in i) && !('outcome' in i) && !('result' in i)));
    go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    ok('N5a-T4 the tab states both: workplace = 4 Academy + 6 NVQ; office = 6 NVQ only', /4 Academy criteria of this programme \+ 6 NVQ criteria/.test(document.querySelector('main .n5-cover .n5-cov-wp').textContent) && /6 NVQ criteria only — no Academy criteria/.test(document.querySelector('main .n5-cover .n5-cov-off').textContent));
    settings('NV-L3', null, 'Not permitted'); ok('N5a-T5 workplace not permitted: no workplace checklist; the office one is unchanged', !n5Checklist(p, d, 'workplace').ok && n5Checklist(p, d, 'office').items.length === 6);
    settings('NV-L3', null, 'Permitted', 'Not available'); ok('N5a-T6 office not available: no office checklist', !n5Checklist(p, d, 'office').ok && n5Checklist(p, d, 'workplace').ok);
    settings('NV-L3', 'no'); ok('N5a-T7 observation not required: no checklist of either type', !n5Checklist(p, d, 'workplace').ok && !n5Checklist(p, d, 'office').ok);
  });

  /* ---------- Publishing and immutability (Levels 2, 3, 4, 5; both builders) ---------- */
  await T('N5a publishing', async () => {
    fresh(); SA(); const before = hist(), v2 = JSON.stringify(P('NV-L3', 2));
    ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5'].forEach(id => {
      const v0 = pr(id).version; newVer(id); const codes = configure(id);
      ok(`N5a-P1 ${id}: a valid required configuration has no observation blockers`, !n5Check(pr(id)).block.length, n5Check(pr(id)).block.join(' | '));
      publish(id); const c = P(id, v0 + 1);
      ok(`N5a-P2 ${id}: published with the version (Version ${v0 + 1}) and frozen; the draft is gone`, pr(id).version === v0 + 1 && c && c.state === 'Published' && Object.isFrozen(c) && c.required === true && !D(id) && c.snap.map(x => x.code).join() === codes.join());
    });
    ok('N5a-P3 Level 3 Version 2\'s configuration is exactly as before', JSON.stringify(P('NV-L3', 2)) === v2);
    ok('N5a-P4 publication is audited with a summary', ADMIN.audit.some(a => a.action === 'Observation configuration published' && /Level 3 Diploma in Adult Care \(England\) \(NV-L3\)/.test(a.entity) && /Required: Yes/.test(a.reason)));
    ok('N5a-P5 changing Version 3 needs a new version: refused, logged', (ACT.n5IaEdit({ dataset: { p: 'NV-L3', c: '' } }), !MODAL && audit0().action === 'Blocked: add an Academy observation criterion'));
    let threw = false; try { (function () { 'use strict'; P('NV-L3', 3).required = false; })(); } catch (e) { threw = e instanceof TypeError; }
    ok('N5a-P6 a published configuration can\'t be altered even directly (frozen; strict mode throws)', threw && P('NV-L3', 3).required === true);
    newVer('NV-L3'); ok('N5a-P7 Version 4 (draft) copies Version 3\'s routes and evidence, but not the decision: "Observation required" is chosen again (Version 3: Yes shown)', D('NV-L3').v === 4 && D('NV-L3').required === null && D('NV-L3').prevRequired === true && D('NV-L3').workplace === 'Permitted' && D('NV-L3').nvq['301 2.1'].types.join() === 'notes,photos' && D('NV-L3').nvq !== P('NV-L3', 3).nvq && n5Check(pr('NV-L3')).block.some(b => /Version 4 \(Yes or No\).*\(Version 3: Yes\)/.test(b)));
    ok('N5a-P8 history: observations, judgements, assignment outcomes, forms and the library unchanged by publishing', hist() === before);
  });

  /* ---------- N5a review: the explicit decision — new programmes, new versions, historical versions ---------- */
  await T('N5a explicit decision', async () => {
    fresh(); SA(); const n1 = pr('NV-N1');
    // New programme (wizard Draft)
    go('a-programmes', { id: 'NV-N1', tab: 'review' });
    ok('N5a-R1 new programme (negative): Publish disabled until "Observation required" is chosen', document.querySelector('main [data-act="cbPublish"]').disabled /* CB11 (PD-CB-77): was ch8Publish */ && ch8Check(n1).block.some(b => /choose whether observation is required for Version 1/.test(b)));
    settings('NV-N1', 'no');
    ok('N5a-R1 new programme (positive): "No" clears the observation blockers — no criteria or routes demanded (no Observation Learning Outcome)', !ch8Check(n1).block.some(b => /^Observations/.test(b)) && !ch8Check(n1).warn.some(w => /Review \(D5\)/.test(w)) && D('NV-N1').workplace === null && D('NV-N1').office === null);
    settings('NV-N1', 'yes'); ok('N5a-R1 new programme: "Yes" brings back the full validation (routes, NVQ criteria)', ch8Check(n1).block.some(b => /choose whether workplace observation is permitted/.test(b)) && ch8Check(n1).block.some(b => /no active NVQ observation criteria/.test(b)));
    // New Draft programme in the S3 builder
    go('a-programmes', { id: 'NV-L3D', tab: 'obs' });
    ok('N5a-R2 Draft programme NV-L3D: "Not chosen yet" with the reason; blocking until chosen', /Not chosen yet/.test(document.querySelector('main .n5-settings').textContent) && n5Check(pr('NV-L3D')).block.some(b => /choose whether observation is required/.test(b)));
    // New version of a migrated programme (Level 5): blocked without a choice; "No" with Observation LOs → review flag, publishes
    newVer('NV-L5'); publish('NV-L5');
    ok('N5a-R3 new version of a migrated programme (negative): refused without a choice; still Version 1', /Can't publish/.test(MODAL && MODAL.title) && pr('NV-L5').version === 1); closeModal();
    settings('NV-L5', 'no'); dmpComply('NV-L5'); ACT.kPubProg({ dataset: { id: 'NV-L5' } }); const rv = /Review \(D5\)/.test((mroot().querySelector('.n5-warn') || {}).textContent || '');
    reason('Publish without observation');
    ok('N5a-R3 new version (positive): "No" publishes, with the D5 review flag shown; Version 2 records No', rv && pr('NV-L5').version === 2 && P('NV-L5', 2).required === false && P('NV-L5', 2).snap.length === 3);
    ok('N5a-R3 …no checklist for a "No" version (observations aren\'t part of current delivery)', !n5Checklist(pr('NV-L5'), P('NV-L5', 2), 'workplace').ok && !n5Checklist(pr('NV-L5'), P('NV-L5', 2), 'office').ok);
    // Historical published versions migrated with unknown settings are not invalidated
    ok('N5a-R4 historical versions (negative case of retroactive checks): migrated versions still have "not recorded" settings, no blockers, and stay frozen', ['NV-L2', 'NV-L3', 'NV-L4'].every(id => { const c = P(id, pr(id).version); return c.required === null && Object.isFrozen(c) && !n5Check(pr(id)).block.length && !n5Check(pr(id)).review.length; }) && P('NV-L5', 1).required === null);
    go('a-programmes', { id: 'NV-L3', tab: 'obs' });
    ok('N5a-R4 …the tab shows "Published before N5 — not recorded" and no publishing checks', /Published before N5 — not recorded/.test(document.querySelector('main .n5-settings').textContent) && !document.querySelector('main .n5-checks'));
    ok('N5a-R4 …and a learner\'s pinned migrated version still resolves to its configuration', n5ConfigFor('NV-L3', 2) === P('NV-L3', 2) && n5ConfigFor('NV-L5', 1) === P('NV-L5', 1));
    // Structure blockers come first (S3-04, unchanged); the observation items join the same refusal
    fresh(); SA(); dmpComply('NV-L3D'); ACT.kPubProg({ dataset: { id: 'NV-L3D' } });
    ok('N5a-R5 Draft NV-L3D: the structure refusal is unchanged (latest audit "Blocked: publish") and lists the observation decision too', /Can't publish/.test(MODAL && MODAL.title) && /U310 LO2/.test(mroot().textContent) && /choose whether observation is required/.test(mroot().textContent) && audit0().action === 'Blocked: publish'); closeModal();
  });

  await T('N5a wizard lifecycle', async () => {
    fresh(); SA(); const n2 = pr('NV-N2');
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('N5a version');
    ok('N5a-W1 a wizard programme\'s new version gets a draft configuration copied from Version 1', D('NV-N2') && D('NV-N2').v === 2 && D('NV-N2').origin === 'Copied from Version 1');
    settings('NV-N2', 'yes', 'Permitted', 'Available');
    dmpComply('NV-N2'); ACT.s3WizPublish({ dataset: { id: 'NV-N2' } });
    ok('N5a-W2 publishing the version is refused while evidence is missing (the observation item is listed)', n2.version === 1 && /Can't publish/.test(MODAL && MODAL.title) && /permitted evidence for 1 NVQ criterion: 201 2\.1/.test(mroot().textContent)); closeModal();
    // CB6 (PD-CB-41): a required configuration also needs observation events — refused until one covers 201 2.1, then published
    nvqEv('NV-N2', '201 2.1', ['notes', 'docs']); dmpComply('NV-N2'); ACT.s3WizPublish({ dataset: { id: 'NV-N2' } });
    ok('N5a-W2b (CB6) publishing is refused while no observation event covers the criteria', n2.version === 1 && /Can't publish/.test(MODAL && MODAL.title) && /at least one observation event/.test(mroot().textContent)); closeModal();
    ACT.cbObsEv({ dataset: { p: 'NV-N2', e: '' } }); tick('.ev-l', ['workplace']); tick('.ev-c', ['201 2.1']); tick('.ev-e', ['notes']); press();
    dmpComply('NV-N2'); ACT.s3WizPublish({ dataset: { id: 'NV-N2' } }); reason('Publish Version 2');
    { const i = ADMIN.audit.findIndex(a => a.action === 'Version 2 published'); // DM-P (PD-DM-15): the fee package approved for Version 2 goes into force with it and is logged just after (was: "Version 2 published" the latest entry)
      ok('N5a-W3 audit: "Version 2 published" (then only its fee package going into force), with the observation configuration publication just under it', i >= 0 && ADMIN.audit.slice(0, i).every(a => /package|plan|payment|fee/i.test(a.action + ' ' + a.module)) && ADMIN.audit[i + 1].action === 'Observation configuration published' && /NV-N2/.test(ADMIN.audit[i + 1].entity), ADMIN.audit.slice(0, i + 2).map(a => a.action).join(' | ')); }
    ok('N5a-W3 …then published: Version 2 with its frozen configuration', n2.version === 2 && P('NV-N2', 2) && Object.isFrozen(P('NV-N2', 2)) && P('NV-N2', 2).nvq['201 2.1'].types.join() === 'notes,docs' && !D('NV-N2') && P('NV-N2', 1).required === null);
    go('a-programmes', { id: 'NV-N2', tab: 'obs' }); const ro = !document.querySelector('main [data-act="n5Settings"]'); go('a-programmes', { id: 'NV-N2', tab: 'details' });
    ok('N5a-W4 the section is read-only after publishing; on other sections it is listed with nothing to fix', ro && !!document.querySelector('main .cb-sec[data-tab="observations"]') && !document.querySelector('main .cb-sec[data-tab="observations"] .cb-badge.bad'));
  });

  /* ---------- Authorization ---------- */
  await T('N5a authorization', async () => {
    fresh(); const d = D('NV-L3D'), snap = () => JSON.stringify(D('NV-L3D'));
    const tryAll = (who, enter) => { enter(); const s = snap(), n = ADMIN.audit.length;
      ACT.n5Settings({ dataset: { p: 'NV-L3D' } }); const a1 = !MODAL; closeModal();
      ACT.n5IaEdit({ dataset: { p: 'NV-L3D', c: '' } }); const a2 = !MODAL; closeModal();
      ACT.n5NvqEv({ dataset: { p: 'NV-L3D', c: '310 1.1' } }); const a3 = !MODAL; closeModal();
      ok(`N5a-A1 ${who}: every N5a action refused directly and logged; nothing changed`, a1 && a2 && a3 && snap() === s && ADMIN.audit.length >= n + 3 && ADMIN.audit.slice(0, 3).every(a => /^Blocked: /.test(a.action) && /NV-L3D/.test(a.entity))); };
    tryAll('Finance Admin', FA);
    tryAll('Business Admin', () => { bizEnter('BA'); S.ui = {}; });
    tryAll('IQA', () => { iqaEnter('QC'); S.ui = {}; });
    tryAll('Academic Coordinator', () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; });
    tryAll('Assessor', () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; });
    tryAll('Learner', () => { S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; });
    tryAll('Agency Administrator', () => { agyEnter('AG-01', true); S.signedIn = true; });
    tryAll('Super Admin identity outside the admin portal (learner portal)', () => { setAdminIdentity('A'); S.portal = 'learner'; S.signedIn = true; });
    FA(); const h = progBuilder('NV-L3', 'obs');
    ok('N5a-A2 Finance Admin can\'t view the configuration (refusal shown, logged)', /can't view this programme's observation configuration/.test(h) && !/n5-settings/.test(h) && audit0().action === 'Blocked: view observation configuration');
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const hl = progBuilder('NV-L3', 'obs');
    ok('N5a-A3 a learner reaching the builder can\'t view it (no criteria shown)', /can't view this programme's observation configuration/.test(hl) && !/IA-1/.test(hl.slice(hl.indexOf('n5-deny'))));
    ACA(); settings('NV-L3D', 'yes', 'Permitted', 'Available'); ok('N5a-A4 Academic Admin can change it', d.required === true);
    SYS(); iaEdit('NV-L3D', '', { t: 'System Admin added criterion', ev: ['notes'], map: ['310 1.1'] }); ok('N5a-A4 System Admin can change it (the existing programme administrators)', d.ia.some(c => c.title === 'System Admin added criterion'));
    SA(); nvqEv('NV-L3D', '310 1.1', ['notes']); ok('N5a-A4 Super Admin can change it', d.nvq['310 1.1'].types.join() === 'notes');
    // A dialog opened by an administrator can't be saved after the role changes
    ACA(); ACT.n5Settings({ dataset: { p: 'NV-L3D' } }); radio('n5-req', 'no'); FA(); const r = press();
    // PD-F-10: Finance is now also refused the Academic screen still on the route (logged too), so the save refusal is among the latest entries rather than always first
    ok('N5a-A5 a dialog saved after the role changed: refused, logged, nothing saved', r === false && d.required === true && ADMIN.audit.slice(0, 3).some(x => x.action === 'Blocked: save observation configuration'));
    SA(); ACT.n5Settings({ dataset: { p: 'NV-L3O' } }); ok('N5a-A6 retired programme: refused, logged', !MODAL && audit0().action === 'Blocked: change observation settings' && audit0().reason === 'Retired programme');
    ACT.n5Settings({ dataset: { p: 'NV-ZZ' } }); ok('N5a-A7 unknown programme: nothing opens', !MODAL);
    ok('N5a-A8 the publish check isn\'t bypassed by role: Finance can\'t publish (existing refusal kept)', (FA(), ACT.kPubProg({ dataset: { id: 'NV-L3D' } }), pr('NV-L3D').status === 'Draft'));
  });

  /* ---------- N5a review: criterion identity is (programme, version, code) ---------- */
  await T('N5a criterion identity', async () => {
    fresh(); SA(); const L2v1 = n5Crit('NV-L2', 1, 'IA-1'), L3v2 = n5Crit('NV-L3', 2, 'IA-1'), T0 = L3v2.title;
    ok('N5a-I1 the same display code (IA-1) in two programmes is two criteria: separate records, same migrated code and wording', !!L2v1 && !!L3v2 && L2v1 !== L3v2 && L2v1.code === L3v2.code && L2v1.title === L3v2.title && L2v1.src.lib === 'IA-1' && L3v2.src.lib === 'IA-1');
    ok('N5a-I1 …the code alone resolves nothing without its programme and version', n5Crit('NV-L5', 1, 'IA-1') === null && n5Crit('NV-L3', 1, 'IA-1') === null && n5Crit('NV-L3', 9, 'IA-1') === null);
    newVer('NV-L3'); newVer('NV-L2');
    iaEdit('NV-L3', 'IA-1', { t: 'Level 3 wording for IA-1', ev: ['notes'], map: ['301 2.1'] });
    ok('N5a-I2 editing Level 3\'s IA-1 (draft Version 3) changes nothing in Level 2 (draft or published) or in Level 3 Version 2', n5Crit('NV-L3', 3, 'IA-1').title === 'Level 3 wording for IA-1' && n5Crit('NV-L2', 2, 'IA-1').title === T0 && n5Crit('NV-L2', 2, 'IA-1').map.length === 0 && L2v1.title === T0 && L3v2.title === T0 && n5Crit('NV-L3', 2, 'IA-1') === L3v2);
    ok('N5a-I2 …no record is shared between the two drafts (criterion, evidence, mapping)', n5Crit('NV-L3', 3, 'IA-1') !== n5Crit('NV-L2', 2, 'IA-1') && n5Crit('NV-L3', 3, 'IA-1').ev !== n5Crit('NV-L2', 2, 'IA-1').ev && n5Crit('NV-L3', 3, 'IA-1').map !== n5Crit('NV-L2', 2, 'IA-1').map);
    iaEdit('NV-L2', '', { t: 'Level 2 hoist practice', ev: ['videos'] }); iaEdit('NV-L3', '', { t: 'Level 3 care planning', ev: ['docs'], map: ['306 3.1'] });
    configure('NV-L2'); configure('NV-L3'); iaEdit('NV-L3', 'IA-16', { map: ['306 3.1'] }); publish('NV-L2'); publish('NV-L3');
    const a2 = n5Crit('NV-L2', 2, 'IA-16'), a3 = n5Crit('NV-L3', 3, 'IA-16');
    ok('N5a-I3 a new code created in both programmes (IA-16) stays two criteria after publication', !!a2 && !!a3 && a2.title === 'Level 2 hoist practice' && a3.title === 'Level 3 care planning' && a3.map.includes('306 3.1') && !a2.map.includes('306 3.1') && Object.isFrozen(a2) && Object.isFrozen(a3));
    ok('N5a-I4 version-scoped: Level 3 Version 2\'s IA-1 is still the migrated criterion after Version 3 was published', n5Crit('NV-L3', 2, 'IA-1').title === T0 && n5Crit('NV-L3', 2, 'IA-1').v === 1 && n5Crit('NV-L3', 3, 'IA-1').v === 2);
    const rows = ADMIN.audit.filter(a => /Observation criterion (changed|added)/.test(a.action));
    ok('N5a-I5 audit references name the owning programme and the version as well as the code', rows.some(a => /\(NV-L3\)$/.test(a.entity) && /^IA-1:/.test(a.before) && /Version 3/.test(a.reason)) && rows.some(a => /\(NV-L2\)$/.test(a.entity) && /IA-16/.test(a.after) && /Version 2/.test(a.reason)));
    ok('N5a-I6 migrated codes and their shared-library references are preserved', ['IA-1', 'IA-2', 'IA-3', 'IA-4'].every(k => n5Crit('NV-L2', 2, k) && n5Crit('NV-L2', 2, k).src.lib === k && n5Crit('NV-L3', 3, k).src.lib === k));
  });

  /* ---------- Existing S3 and assessment behaviour kept ---------- */
  await T('N5a compatibility', async () => {
    fresh(); SA(); newVer('NV-L3'); configure('NV-L3'); iaEdit('NV-L3', 'IA-3', { t: 'Infection control (2027)' });
    ok('N5a-K1 today\'s observation forms still use the shared library (IA-1–IA-4 unchanged by the programme draft)', STORE.worlds.C.iaCriteria.map(x => x.join(' ')).join() === STORE.aca.obsLib.filter(c => c.form && c.status === 'Active' && c.progs.includes('NV-L3')).map(c => c.code + ' ' + c.title).join());
    go('a-programmes', { id: 'NV-L3', tab: 'library' }); const lt = document.querySelector('main .cb-panels [data-tab="library"]'); // CB1: a panel of Observations (was a tab)
    ok('N5a-K2 legacy tab: labelled "Shared library (legacy)", the same shared list, read-only (no library actions)', lt.textContent === 'Shared library (legacy)' && /IA-15/.test(main()) && !document.querySelector('main [data-act="kLib"], main [data-act="kLibAttach"], main [data-act="s3LibActivate"], main [data-act="kLibRetire"]'));
    ok('N5a-K2 …guidance: it doesn\'t configure the programme; buttons to the Observations tab and to the library page', /Legacy — read-only here\. This list doesn't configure/.test(document.querySelector('main .n5-legacy-note').textContent) && !!document.querySelector('main .n5-legacy-note [data-go="a-programmes"][data-tab="obs"][data-id="NV-L3"]') && !!document.querySelector('main .n5-legacy-note [data-go="k-obslib"]'));
    go('k-obslib'); ok('N5a-K2 …the shared library page itself is still editable (it supplies today\'s forms)', !!document.querySelector('main [data-act="kLib"]') && !!document.querySelector('main [data-act="kLibAttach"]'));
    go('k-obslib'); ok('N5a-K3 the library page still lists the merged list with "On observation forms" (S3-05)', /On observation forms/.test(main()) && /IA-15/.test(main()));
    ok('N5a-K4 assessment types are unchanged: Observation still can\'t be retired (S3-06)', (ACT.s3TypeRetire({ dataset: { id: 'T2' } }), s3Types().find(t => t.id === 'T2').status === 'Active'));
    const pins = () => JSON.stringify(Object.values(STORE.worlds).map(w => w.nvq ? [w.nvq.version || null, w.nvq.progVersion || null] : null)), pin0 = pins();
    publish('NV-L3'); ok('N5a-K5 S3 publishing still works with the configuration valid (Version 3), and learners stay on their versions', pr('NV-L3').version === 3 && pins() === pin0);
    go('a-index'); ok('N5a-K6 admin index: the N5a section with its three entries', ['a-programmes.NV-L3.obs', 'a-programmes.NV-L3D.obs', 'a-programmes.NV-N1.obs'].every(t => !!document.querySelector(`main [data-t="${t}"]`)));
    ok('N5a-K7 UX changelog: the N5a entry', UXC.some(x => x[0] === 'N5a'));
  });

  ok('N5a no script errors', !errs.length, errs.join(' | '));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
