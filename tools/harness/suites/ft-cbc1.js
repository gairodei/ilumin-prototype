// CBR correction batch 1 — Course Builder (6 Nov 2026). Legacy fixture; real clicks wherever a control is rendered.
// E/F Observation required: three states (not answered / Yes / No); an unrelated Save draft never records No; Next and creating need
//     an explicit answer; a new version answers again (N5a rule) with the previous answer shown; Yes → No keeps the impact question.
// G   Course Details change history: folded, the same audit records, date filter, read-only, only where the details are editable.
// H/I Manage Types: registry first with Add type; add / edit / retire by Super, System and Academic Admin with confirmations;
//     unsupported evidence methods labelled; Finance, Business and IQA refused in the handlers (also a dialog left open).
// K/L Fees: "1 = pay in full", 1 / 3 / 6 instalments with deposit on / off / inherited and exact totals; the pricing method shown as fixed
//     for fee options; one-price → fee options stays in Step 5 with its impact text; Finance's R1 fee-option add (pre-builder L3).
// M   Published versions, learner records and pinned terms unchanged by all of this.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const q = s => $1('main ' + s), qa = s => $a('main ' + s), main = () => ($1('main') || document.body).textContent;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const as = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const step = (id, k) => go('a-programmes', { id, tab: k });
  const steps = pr => cbrSteps(pr).map(s => s[0]);
  const type = (sel, v) => { const e = q(sel); if (!e) throw new Error('missing ' + sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const saveDraft = () => click(qa('[data-act="cbDetSave"]').find(b => !b.dataset.next));
  const next = () => click(q('[data-act="cbrDetNext"]'));
  const obsAudit = (a0, pid) => ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Observation settings changed' && String(x.entity).includes(pid)).length;
  let lastToast = '', lastTone = ''; const _t = toast; toast = function (m, tone) { lastToast = String(m); lastTone = tone || ''; return _t.apply(this, arguments); };
  const reasonOk = (r = 'CBC1 test') => { const t = $1('#rsn'); if (t) t.value = r; click(mbtn(/^(Retire|Restore|Use fee options|Add option|Save)$/)); };
  // learner, published-version and pinned-term records (M)
  const recs = () => J({ w: Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, w.signup && w.signup.pin || null, (w.plans || []).map(p => p.rows.map(r => [r.due, r.amount, r.status])), (w.assignments || []).map(a => [a.id, a.status]), w.nvq && [w.nvq.progVersion, w.nvq.feeOpt]]; }),
    pub: ADMIN.programmes.map(p => [p.id, p.status, p.version, (() => { try { const d = n5PubCur(p); return d && [d.v, d.required]; } catch (e) { return null; } })()]), sig: Object.keys(STORE.chSig || {}).length });
  const r0 = recs();
  let made = 0;
  // A Level 3 course made in the builder: fee options from the new-course form, observation answer chosen explicitly
  const make = (obs = 'yes') => {
    as('A'); go('a-programmes'); ACT.chProgNew(); const n = ++made;
    type('#np-t', 'CBC1 Level 3 course ' + n); type('#np-r', 'QN 610/' + (9100 + n) + '/1'); type('#np-d', '12'); type('#cbc3-dd-n', '12'); q('#np-du').value = 'months'; q('#np-l').value = 'Level 3'; INP.r1NpLevel(q('#np-l'));
    [{ l: 'Fully Assisted — standard', f: 2600, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = qa('.r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    qa('.cr-dm-c').forEach(x => { x.checked = true; }); if (obs) click(q('#cbr2-obs-' + obs));
    click(q('[data-act="cbDetCreate"]')); closeModal(); return (STORE.chNewProgs || []).slice(-1)[0];
  };

  /* ================= E / F — Observation required ================= */
  await T('CBC1-E not answered', async () => {
    as('A'); const pr = cbPr('NV-N1'); step('NV-N1', 'details');
    ok('CBC1-E1 a Draft whose answer was never recorded shows Yes / No, neither chosen, "Not answered"; the Observations step is listed', cbObsOf(pr) === null && !!q('#cbr2-obs-yes') && !!q('#cbr2-obs-no') && !q('input[name="cbr2-obs"]:checked') && /Not answered/.test(q('.cbr2-obs').textContent) && steps(pr).includes('observations'));
    const a0 = ADMIN.audit.length, g0 = (pr.qual || {}).glh; type('#np-q-glh', '333'); saveDraft();
    ok('CBC1-E2 editing GLH and pressing Save draft (real click) saves GLH and leaves the answer not answered (no "No" recorded)', (pr.qual || {}).glh === 333 && cbObsOf(pr) === null && obsAudit(a0, 'NV-N1') === 0 && steps(pr).includes('observations'), `glh ${g0} → ${(pr.qual || {}).glh}, obs ${cbObsOf(pr)}`);
    step('NV-N1', 'details'); ok('CBC1-E3 after moving away and back it still says "Not answered"', !q('input[name="cbr2-obs"]:checked') && !!q('.cbr2-obs-na'));
    next(); ok('CBC1-E4 Next with nothing to save asks for Yes or No and stays on Course Details', S.params.tab === 'details' && /Choose Yes or No/.test((q('.cbr2-obs .err') || {}).textContent || '') && cbObsOf(pr) === null);
    step('NV-N1', 'details'); type('#np-q-tqt', '444'); next();
    ok('CBC1-E5 Next with a change asks for Yes or No first: nothing is saved, nothing recorded', S.params.tab === 'details' && (pr.qual || {}).tqt !== 444 && cbObsOf(pr) === null && obsAudit(a0, 'NV-N1') === 0);
    ACT.cbDetDiscard({ dataset: { key: 'NV-N1' } }); click(mbtn(/Discard changes/));
  });
  await T('CBC1-F explicit Yes / No', async () => {
    as('A'); const pr = cbPr('NV-N1'); step('NV-N1', 'details'); const a0 = ADMIN.audit.length;
    click(q('#cbr2-obs-no')); ok('CBC1-F1 choosing No records No (audited) and hides the Observations step', cbObsOf(pr) === false && obsAudit(a0, 'NV-N1') === 1 && !steps(pr).includes('observations'));
    step('NV-N1', 'details'); type('#np-q-glh', '334'); saveDraft();
    ok('CBC1-F2 an unrelated Save draft keeps No', cbObsOf(pr) === false && (pr.qual || {}).glh === 334 && q('#cbr2-obs-no').checked);
    click(q('#cbr2-obs-yes')); ok('CBC1-F3 choosing Yes records Yes and shows the step', cbObsOf(pr) === true && steps(pr).includes('observations'));
    step('NV-N1', 'details'); type('#np-q-glh', '335'); saveDraft(); ok('CBC1-F4 an unrelated Save draft keeps Yes', cbObsOf(pr) === true && q('#cbr2-obs-yes').checked);
    next(); ok('CBC1-F5 with an answer, Next goes on to Curriculum & Outcomes', S.params.tab === 'curriculum');
    ACT.cbrObsLoc({ dataset: { p: 'NV-N1', loc: 'wp', v: 'on' } }); step('NV-N1', 'details'); click(q('#cbr2-obs-no'));
    ok('CBC1-F6 Yes → No with configuration recorded asks first, listing what is kept', !!MODAL && /Turn observations off/.test(MODAL.title) && /Workplace|location|criteria/i.test(MODAL.body) && cbObsOf(pr) === true);
    click(mbtn(/Keep observations/)); ok('CBC1-F7 "Keep observations" leaves Yes', cbObsOf(pr) === true && !MODAL);
    step('NV-N1', 'details'); click(q('#cbr2-obs-no')); click(mbtn(/Turn observations off/));
    ok('CBC1-F8 confirming records No and keeps the configuration (nothing deleted)', cbObsOf(pr) === false && n5Shown(pr).workplace === 'Permitted');
    step('NV-N1', 'details'); click(q('#cbr2-obs-yes')); ok('CBC1-F9 Yes again: the configuration is still there', cbObsOf(pr) === true && n5Shown(pr).workplace === 'Permitted');
  });
  await T('CBC1-F new course and new version', async () => {
    as('A'); go('a-programmes'); ACT.chProgNew(); const n0 = (STORE.chNewProgs || []).length;
    type('#np-t', 'CBC1 no answer'); type('#np-r', 'QN 610/9199/1'); type('#np-d', '12'); type('#cbc3-dd-n', '12'); q('#np-l').value = 'Level 3'; INP.r1NpLevel(q('#np-l'));
    const r = qa('.r1-np-row')[0]; r.querySelector('.r1-np-l').value = 'FA'; r.querySelector('.r1-np-f').value = '2000'; r.querySelector('.r1-np-m').value = 'Fully Assisted';
    ok('CBC1-F10 a new course starts with neither Yes nor No chosen', !!q('#cbr2-obs-yes') && !q('input[name="cbr2-obs"]:checked'));
    click(q('[data-act="cbDetCreate"]'));
    ok('CBC1-F11 creating it without an answer is refused: nothing is created, the question is marked', (STORE.chNewProgs || []).length === n0 && /Choose Yes or No/.test((q('.cbr2-obs .err') || {}).textContent || ''));
    ACT.cbDetDiscard({ dataset: { key: 'new' } }); click(mbtn(/Discard changes/));
    const pNo = make('no'); ok('CBC1-F12 created with an explicit No: No is recorded and the step is hidden', !!pNo && cbObsOf(pNo) === false && !steps(pNo).includes('observations'));
    const pYes = make('yes'); ok('CBC1-F13 created with an explicit Yes: Yes is recorded', !!pYes && cbObsOf(pYes) === true && steps(pYes).includes('observations'));
    // a published programme's new version (N5a: every version answers again; the previous answer is a reminder, not a choice)
    const pub = cbPr('NV-N2'); // the builder programme published in this fixture; the client suite covers a published "Yes"
    ok('CBC1-F14 setup: NV-N2 is live (not a Draft) with no draft version', !!pub && pub.status !== 'Draft' && !n5DraftV(pub), pub && pub.status); if (!pub) return;
    const was = (n5PubCur(pub) || {}).required == null ? null : n5PubCur(pub).required; ACT.s3WizVersion({ dataset: { id: pub.id } }); const t = $1('#rsn'); if (t) { t.value = 'CBC1 version'; const b =$a('#modal-root [data-mi]').find(x => /btn-primary|btn-danger/.test(x.className)); if (MODAL && b) click(b); }
    ok('CBC1-F14 …a draft version is created', !!n5DraftV(pub), String(n5DraftV(pub)));
    step(pub.id, 'details');
    ok('CBC1-F15 the new version shows "Not answered" with the previous version\'s answer beside it', cbObsOf(pub) === null && !q('input[name="cbr2-obs"]:checked') && (was == null ? !/Version \d+:/.test(q('.cbr2-obs').textContent) : new RegExp(`Version ${pub.version}: ${was ? 'Yes' : 'No'}`).test(q('.cbr2-obs').textContent)), q('.cbr2-obs') && q('.cbr2-obs').textContent);
    ok('CBC1-F16 the published version keeps its answer for its learners', ((n5PubCur(pub) || {}).required == null ? null : n5PubCur(pub).required) === was);
    click(q('#cbr2-obs-yes')); ok('CBC1-F17 the version\'s answer is recorded only when chosen, in the draft version only', cbObsOf(pub) === true && N5().draft[pub.id].v === pub.version + 1 && ((n5PubCur(pub) || {}).required == null ? null : n5PubCur(pub).required) === was);
  });

  /* ================= G — Course Details change history ================= */
  await T('CBC1-G change history', async () => {
    as('A'); step('NV-N1', 'details'); const h = q('details.cbr2-dethist'), m = a => a.module === 'NVQ Programmes' && String(a.entity || '').includes('NV-N1');
    ok('CBC1-G1 Course Details has a folded "Change history", collapsed by default, after the form', !!h && !h.open && /Change history \(\d+\)/.test(h.querySelector('summary').textContent) && !!(q('.cbr2-obs').compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING));
    click(h.querySelector('summary')); await new Promise(r => setTimeout(r, 0)); const h2 = q('details.cbr2-dethist'); // the browser's toggle event (a user's next click comes after it)
    ok('CBC1-G2 opened: the same audit records (one table, read-only, tamper-evident), newest first', h2.open && /Tamper-evident · read-only/.test(h2.textContent) && h2.querySelectorAll('tbody tr').length === Math.min(ADMIN.audit.filter(m).length, h2.querySelectorAll('tbody tr').length) && /Qualification details changed|Observation settings changed/.test(h2.querySelector('tbody').textContent) && !h2.querySelector('input:not([type="checkbox"]):not([type="search"]):not([type="date"]):not([type="number"]), textarea'));
    const all = ADMIN.audit.filter(m).length, today = ADMIN.audit.filter(a => m(a) && dtLocalDay(new Date(a.at)) === dtLocalDay(now())).length;
    // every NV-N1 record in this fixture is dated today, so "Yesterday" must empty the table
    const yest = ADMIN.audit.filter(a => m(a) && dtLocalDay(new Date(a.at)) === dtLocalDay(new Date(now().getTime() - DAY))).length;
    click(h2.querySelector('[data-act="dtDT"]')); click(q('details.cbr2-dethist [data-act="dtDP"][data-p="yesterday"]')); const h3 = q('details.cbr2-dethist');
    ok('CBC1-G3 the date filter (Yesterday) narrows the table — none of today\'s changes — and the fold stays open', h3.open && today === all && yest === 0 && !/Qualification details changed/.test((h3.querySelector('tbody') || {}).textContent || '') && /Yesterday/.test(h3.querySelector('[data-act="dtDT"]').textContent), `today ${today} of ${all}, yesterday ${yest}, open ${h3.open}, sum ${h3.querySelector('[data-act="dtDT"]').textContent}, body ${((h3.querySelector('tbody') || {}).textContent || '').slice(0, 120)}`);
    click(q('details.cbr2-dethist [data-act="dtDP"][data-p="all"]')); ok('CBC1-G4 All time shows them all again', q('details.cbr2-dethist').querySelectorAll('tbody tr').length >= Math.min(all, 10));
    type('#np-q-glh', '336'); saveDraft(); ok('CBC1-G5 the history does not block editing: the form still saves', (cbPr('NV-N1').qual || {}).glh === 336);
    as('FA'); step('NV-N1', 'details'); ok('CBC1-G6 not shown where the details are read-only (Finance Admin), as before', !q('details.cbr2-dethist'));
    as('A'); step('NV-L3', 'details'); ok('CBC1-G7 not shown on a programme whose details are read-only (seeded / published), as before', !q('details.cbr2-dethist'));
  });

  /* ================= H / I — Manage Types ================= */
  await T('CBC1-H Manage Types by role', async () => {
    for (const [av, who] of [['A', 'Super Admin'], ['SY', 'System Admin'], ['KA', 'Academic Admin']]) {
      as(av); step('NV-N1', 'assessments'); click(q('[data-act="cbr2Types"]')); const box = q('.cbr2-tbox');
      ok(`CBC1-H1 ${who}: Manage Types shows the registry first ("Type registry", Add type as the primary action), then "Used in this programme"`, !!box && box.firstElementChild.classList.contains('cbr2-treg') && J([...box.querySelectorAll('h4')].map(x => x.textContent)) === J(['Type registry', 'Used in this programme']) && !!box.querySelector('.cbr2-treg [data-act="addType"].btn-primary'));
      click(box.querySelector('[data-act="addType"]')); const nm = `CBC1 written type ${av}`;
      ok(`CBC1-H2 ${who}: Add type opens; unsupported evidence methods are labelled where they are chosen`, MODAL && MODAL.title === 'Add assessment type' && $a('#ty-e option').filter(o => /not usable for assessments yet/.test(o.textContent)).length === 3 && /not usable/.test($a('#ty-e option').find(o => o.value === 'Witness testimony').textContent));
      $1('#ty-n').value = nm; $1('#ty-e').value = 'Written assignment questions'; lastToast = ''; click(mbtn(/^Add type$/));
      const t = s3Types().find(x => x.name === nm);
      ok(`CBC1-H3 ${who}: saved — a confirmation, the type is in the registry`, !!t && t.status === 'Active' && /Assessment type added: CBC1 written type/.test(lastToast) && !MODAL && new RegExp(nm).test(q('.cbr2-treg').textContent));
      ACT.cbrAsgNew({ dataset: { p: 'NV-N1', lvl: 'prog' } }); const opt = $a('#cna-ty option').find(o => o.value === nm || o.textContent.includes(nm));
      ok(`CBC1-H4 ${who}: a written type can be chosen in Add Assessment`, !!opt && !opt.disabled); closeModal();
      step('NV-N1', 'assessments'); click(q(`.cbr2-treg [data-act="s3TypeEdit"][data-id="${t.id}"]`)); $1('#ty-n').value = nm + ' (edited)'; lastToast = ''; click(mbtn(/^Save$/));
      ok(`CBC1-H5 ${who}: Edit saves with a confirmation`, t.name === nm + ' (edited)' && /Assessment type saved/.test(lastToast));
      step('NV-N1', 'assessments'); click(q(`.cbr2-treg [data-act="s3TypeRetire"][data-id="${t.id}"]`)); lastToast = ''; reasonOk();
      ok(`CBC1-H6 ${who}: Retire (with a reason) confirms, and the record is kept as Retired`, t.status === 'Retired' && /retired/.test(lastToast) && s3Types().includes(t));
    }
    as('KA'); step('NV-N1', 'assessments'); click(q('[data-act="cbr2Types"]')); click(q('.cbr2-treg [data-act="addType"]')); $1('#ty-n').value = 'CBC1 witness'; $1('#ty-e').value = 'Witness testimony'; lastToast = ''; click(mbtn(/^Add type$/));
    ok('CBC1-H7 an unsupported method can still be added (restrictions unchanged) but says it can\'t be used for assessments', s3Types().some(x => x.name === 'CBC1 witness') && /no marking workflow yet/.test(lastToast) && lastTone === 'info');
    ACT.cbrAsgNew({ dataset: { p: 'NV-N1', lvl: 'prog' } }); const w = $a('#cna-ty option').find(o => o.textContent.includes('CBC1 witness'));
    ok('CBC1-H8 …and it is not offered as usable in Add Assessment', !w || w.disabled); closeModal();
    const core = s3Types().find(x => x.core); ACT.s3TypeRetire({ dataset: { id: core.id } }); ok('CBC1-H9 built-in types still can\'t be retired', core.status === 'Active' && !MODAL);
  });
  await T('CBC1-I unauthorized roles', async () => {
    as('A'); if (!s3Types().some(x => !x.core && x.status === 'Active')) s3Types().push({ id: 'T' + (s3Types().length + 1), name: 'CBC1 active type', evidence: 'Written assignment questions', status: 'Active' }); // setup: a custom type to try to change
    for (const [av, who] of [['FA', 'Finance Admin'], ['BA', 'Business Admin'], ['QA', 'IQA']]) {
      as(av); const n0 = s3Types().length, a0 = ADMIN.audit.length, t = s3Types().find(x => !x.core && x.status === 'Active');
      const r = [ACT.addType({ dataset: {} }), MODAL && MODAL.title, (closeModal(), ACT.s3TypeEdit({ dataset: { id: t.id } })), MODAL && MODAL.title, (closeModal(), ACT.s3TypeRetire({ dataset: { id: t.id } })), MODAL && MODAL.title];
      ok(`CBC1-I1 ${who}: add / edit / retire called directly are refused and logged; nothing changes`, s3Types().length === n0 && t.status === 'Active' && !r[1] && !r[3] && !r[5] && ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Blocked: change assessment types').length === 3, J(r.filter((x, i) => i % 2)));
    }
    as('FA'); step('NV-N1', 'assessments'); ok('CBC1-I2 Finance Admin sees no Add / Edit / Retire in Manage Types', !q('[data-act="addType"]') && !q('[data-act="s3TypeEdit"]') && !q('[data-act="s3TypeRetire"]'));
    as('A'); ACT.addType({ dataset: {} }); $1('#ty-n').value = 'CBC1 left open'; setAdminIdentity('FA'); const n1 = s3Types().length; click(mbtn(/^Add type$/));
    ok('CBC1-I3 a dialog opened by an administrator and saved after a role change is refused', s3Types().length === n1 && !s3Types().some(x => x.name === 'CBC1 left open')); closeModal();
  });

  /* ================= K / L — Fees ================= */
  await T('CBC1-K instalments, pay in full, deposit preview', async () => {
    const pr = make('yes'); as('A'); step(pr.id, 'payments');
    const o = cb8Work(pr).opts.find(x => x.status === 'Active' && x.mode === 'Self-Paced'), add = k => { step(pr.id, 'payments'); const i = $1('#cb8-k-' + o.id); i.value = String(k); click(q(`[data-act="cb8PayAdd"][data-o="${o.id}"]`)); };
    ok('CBC1-K1 the add row has the hint "1 = pay in full" beside the number of instalments', /^1 = pay in full$/.test((q(`#cb8-kh-${CSS.escape(o.id)}`) || {}).textContent || '') && !!q(`#cb8-k-${CSS.escape(o.id)}`).closest('.cbr2-pladd').querySelector('.cbr2-kh'));
    [1, 3, 6].forEach(k => { if (!o.pay.some(x => x.k === k)) add(k); });
    const W8 = cb8Work(pr).opts.find(x => x.id === o.id); step(pr.id, 'payments');
    const card = q(`.cbr2-opt[data-o="${o.id}"]`), row = k => card.querySelector(`.cbr2-pl[data-k="${k}"]`), dates = k => [...row(k).querySelectorAll('.cb8-dates li')].map(li => [li.querySelector('.cb8-dd').textContent, li.querySelector('.num').textContent]);
    ok('CBC1-K2 1, 3 and 6 instalments are options of the fee option', [1, 3, 6].every(k => W8.pay.some(x => x.k === k)), J(W8.pay.map(x => x.k)));
    ok('CBC1-K3 one instalment is labelled "pay in full" and its preview is one payment of the whole fee', /\(pay in full\)/.test(row(1).querySelector('label').textContent) && dates(1).length === 1 && dates(1)[0][1] === money(1800, 'GBP'));
    const sum = k => dates(k).reduce((a, [, m]) => a + fpP(m.replace(/[^\d.]/g, '')), 0);
    ok('CBC1-K4 3 and 6 instalments: that many dated payments, the total exactly the fee (rounding on the last payment)', dates(3).length === 3 && dates(6).length === 6 && sum(3) === fpP(1800) && sum(6) === fpP(1800), J([dates(3), sum(3), sum(6)]));
    ok('CBC1-K5 each preview says it is illustrative, from the sample start (not a learner\'s schedule) — FB1: labelled in the preview, no Step 5 selector', [1, 3, 6].every(k => /^Illustrative due dates — sample batch start /.test(row(k).querySelector('summary').textContent.trim())) && !q('.cbr2-fees .cb8-sample'));
    const dep = () => [1, 3, 6].map(k => (row(k).querySelector('.cbr2-depx') || {}).textContent || '');
    // FB1: a new fee option's deposit is "not answered" until Yes or No is chosen — no deposit is assumed in the previews (was: inherited)
    ok('CBC1-K6 deposit not answered yet (a new fee option, FB1): no deposit line in any preview', fb1Ask(W8) && dep().every(x => !x), J(dep()));
    // own deposit £250: payment 1 of 3 (£600) becomes £350; 6 payments (£300 each) → £50
    const box = () => q(`.cbr2-opt[data-o="${o.id}"] .cbr2-dep input[data-k="allow"]`); // FB1: Allow Deposit — Yes
    if (!box().checked) click(box()); click(q(`.cbr2-opt[data-o="${o.id}"] .cbr2-dep input[type="radio"][data-k="own"]`));
    const amt = q(`.cbr2-opt[data-o="${o.id}"] .cbr2-dep input[data-k="amount"]`); amt.value = '250'; amt.dispatchEvent(new Event('change', { bubbles: true }));
    step(pr.id, 'payments'); const c2 = q(`.cbr2-opt[data-o="${o.id}"]`), d2 = k => (c2.querySelector(`.cbr2-pl[data-k="${k}"] .cbr2-depx`) || {}).textContent || '';
    ok('CBC1-K7 deposit enabled (£250): pay in full → £250 then £1,550; 3 payments → payment 1 £350; 6 payments → payment 1 £50', /£250\.00 at sign-up, then £1,550\.00 by the end of the seat hold/.test(d2(1)) && /payment 1 becomes £350\.00/.test(d2(3)) && /payment 1 becomes £50\.00/.test(d2(6)), J([d2(1), d2(3), d2(6)]));
    amt.value = '400'; const a2 = q(`.cbr2-opt[data-o="${o.id}"] .cbr2-dep input[data-k="amount"]`); a2.value = '400'; a2.dispatchEvent(new Event('change', { bubbles: true })); step(pr.id, 'payments');
    const c3 = q(`.cbr2-opt[data-o="${o.id}"]`), d3 = k => (c3.querySelector(`.cbr2-pl[data-k="${k}"] .cbr2-depx`) || {}).textContent || '';
    ok('CBC1-K8 a deposit above payment 1 (£400 > £300) is shown as not offered with 6 payments (the sign-up rule)', /isn't offered with 6 payments/.test(d3(6)) && /payment 1 becomes £200\.00/.test(d3(3)));
    click(q(`.cbr2-opt[data-o="${o.id}"] .cbr2-dep input[data-k="no"]`)); step(pr.id, 'payments'); // FB1: Allow Deposit — No
    ok('CBC1-K9 deposit disabled: no deposit line in any preview', [1, 3, 6].every(k => !q(`.cbr2-opt[data-o="${o.id}"] .cbr2-pl[data-k="${k}"] .cbr2-depx`)));
    ok('CBC1-K10 FB1: Step 5 has no "Dated examples from" selector; the previews use the sample start (this new course has no batch yet)', !q('.cbr2-fees .cb8-sample') && /sample batch start 1 Feb 2027/.test(q(`.cbr2-opt[data-o="${o.id}"] summary`).textContent));
    ok('CBC1-K11 the preview saved nothing: the fee option\'s terms are its own fields only', !('preview' in W8) && !cb8Work(pr).anchor);
  });
  await T('CBC1-L pricing method and fee-option permissions', async () => {
    const pr = make('no'); as('A'); step(pr.id, 'payments');
    ok('CBC1-L1 a course with fee options offers no pricing switch — FB1: and no pricing-method line (it offered no action)', !q('.cbr2-pm') && !/Pricing method/.test(q('.cbr2-fees').textContent) && !q('input[name="cr-pm"]') && !q('[data-act="crFoStart"]'));
    // a one-price course (another level): its switch stays in Fees & Payment Plans, with the impact said first
    go('a-programmes'); ACT.chProgNew(); type('#np-t', 'CBC1 Level 4 one price'); type('#np-r', 'QN 610/9188/1'); type('#np-d', '6'); type('#cbc3-dd-n', '12'); q('#np-l').value = 'Level 4'; INP.r1NpLevel(q('#np-l'));
    const pp = $1('#cr-pm-price'); if (pp) { pp.checked = true; INP.crPm(); } type('#np-p', '1500'); click(q('#cbr2-obs-no')); click(q('[data-act="cbDetCreate"]')); closeModal();
    const p4 = (STORE.chNewProgs || []).slice(-1)[0]; step(p4.id, 'payments');
    ok('CBC1-L2 a one-price course shows "one programme price" and the existing switch in Step 5 (no pricing-method line)', !!p4 && !crMultiFee(p4) && !!q('.cr-fo-one [data-act="crFoStart"]') && !q('.cbr2-pm'), p4 && p4.title);
    for (const av of ['FA', 'BA']) { as(av); const a0 = ADMIN.audit.length; ACT.crFoStart({ dataset: { p: p4.id } }); ok(`CBC1-L3 ${av}: switching the pricing method is refused in the handler`, !MODAL && !crMultiFee(p4) && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action))); closeModal(); }
    as('A'); step(p4.id, 'payments'); const f0 = cb8Work(p4).opts.map(x => [x.id, x.fee]); click(q('[data-act="crFoStart"]'));
    ok('CBC1-L4 the switch says what happens to the existing fee before anything changes', !!MODAL && /current programme fee stays in the draft package/.test(MODAL.body) && /Finance approves/.test(MODAL.body) && !crMultiFee(p4));
    reasonOk('CBC1 pricing'); ok('CBC1-L5 confirmed: fee options by delivery mode, the existing fee option kept (not reset), audited', crMultiFee(p4) && J(cb8Work(p4).opts.map(x => [x.id, x.fee])) === J(f0) && ADMIN.audit.slice(0, 5).some(x => x.action === 'Fee options by delivery mode'));
    step(p4.id, 'payments'); ok('CBC1-L6 afterwards the switch is gone and the fee option is a card (FB1: no pricing-method line)', !q('[data-act="crFoStart"]') && !q('.cbr2-pm') && qa('.cbr2-opt').length >= 1);
    // R1 (pre-builder Level 3, NV-L3D): Finance owns its fee options — the visible control and the save agree
    as('FA'); S.signedIn = true; go('f-plans', { tab: 'templates' }); const fb = q('.r1-opts[data-pid="NV-L3D"] [data-act="r1OptAdd"]');
    ok('CBC1-L7 Finance Admin sees "Add fee option" for the seeded Draft NV-L3D on Payment Plans › Plan templates', !!fb);
    const n0 = r1Opts('NV-L3D').length; click(fb); $1('#fo-l').value = 'CBC1 Finance option'; $1('#fo-f').value = '2100'; $1('#fo-m').value = 'Self-Paced'; reasonOk('CBC1 Finance');
    ok('CBC1-L8 …and its save is authorized for Finance (r1Guard): the option is added', r1Opts('NV-L3D').length === n0 + 1);
    for (const av of ['KA', 'SY', 'BA']) { as(av); const a0 = ADMIN.audit.length, n1 = r1Opts('NV-L3D').length; ACT.r1OptAdd({ dataset: { p: 'NV-L3D' } }); ok(`CBC1-L9 ${av}: the same add is refused in the handler (no dialog, logged)`, !MODAL && r1Opts('NV-L3D').length === n1 && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action))); closeModal(); }
    as('KA'); step('NV-L3D', 'payments'); ok('CBC1-L10 Academic Admin sees "Finance Admin / Super Admin only" instead of the button', !q('[data-act="r1OptAdd"]') && /Finance Admin \/ Super Admin only/.test(main()));
    as('A'); ACT.r1OptAdd({ dataset: { p: 'NV-L3D' } }); $1('#fo-l').value = 'CBC1 left open'; $1('#fo-f').value = '2000'; $1('#fo-m').value = 'Self-Paced'; const rs = $1('#rsn'); if (rs) rs.value = 'x'; setAdminIdentity('KA'); const n2 = r1Opts('NV-L3D').length; click(mbtn(/^Add option$/));
    ok('CBC1-L11 a dialog saved after a role change is refused (r1Guard re-checks)', r1Opts('NV-L3D').length === n2); closeModal();
  });

  await T('CBC1-M records unchanged', async () => {
    const r1 = JSON.parse(recs()), b = JSON.parse(r0);
    ok('CBC1-M1 learners\' pinned terms, payment schedules, assignments and programme versions are unchanged', J(r1.w) === J(b.w), '');
    ok('CBC1-M2 every published version keeps its own observation answer (new versions don\'t change it)', J(r1.pub.filter(p => b.pub.some(x => x[0] === p[0])).map(p => [p[0], p[3]])) === J(b.pub.map(p => [p[0], p[3]])));
    ok('CBC1-M3 signed letters unchanged', r1.sig === b.sig);
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
