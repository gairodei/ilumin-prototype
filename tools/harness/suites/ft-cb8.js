// CB8 — Fees & Payments: the financial package (PD-CB-48…57). Fee options with observation fees and any number of payment options,
// exact amounts and dated previews, the deposit, Finance submission / approval / locking / version history, invalidation, the old
// editors refused for package programmes, Finance's views, the offer-letter wording, role checks and historical isolation.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB8 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), FB = as('FB'), SD = as('SD'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const COO = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const J = o => JSON.stringify(o);
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const settings = (id, req, wp, off) => { ACT.n5Settings({ dataset: { p: id } }); if (!MODAL) return false; if (req) radio('n5-req', req); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  let codeN = 0;
  // A new programme from Section 1 (Level 3: fee-option rows; other levels: one price); obs 'yes' / 'no'
  const make = (o = {}) => {
    go('a-programmes'); ACT.chProgNew(); const l3 = (o.level || 'Level 3') === 'Level 3';
    fill({ '#np-t': o.title || 'CB8 course ' + (++codeN), '#np-l': o.level || 'Level 3', '#np-r': 'QN 610/' + (3000 + codeN) + '/8', '#np-d': String(o.n || 6), '#np-du': o.unit || 'months' });
    (document.querySelector('#np-code') || {}).value = 'CBE' + codeN; document.querySelector('#np-obs-' + (o.obs || 'no')).checked = true; INP.r1NpLevel(document.querySelector('#np-l'));
    if (l3) (o.opts || [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }]).forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    else fill({ '#np-p': String(o.price || 1800) });
    const r = crT(ACT.cbDetCreate)(); closeModal(); return r && r.id ? r : null;
  };
  const W8 = pr => cb8Work(pr), opt = (pr, i = 0) => cb8Work(pr).opts.filter(x => x.status === 'Active')[i];
  const fees = (pr, o = '', v = {}) => { ACT.cb8Opt({ dataset: { p: pr.id, o } }); if (!MODAL) return 'no dialog'; Object.entries(v).forEach(([k, x]) => { const e = document.querySelector('#modal-root ' + k); if (e) { e.value = x; } }); return press(); };
  const payAdd = (pr, oid, k) => { go('a-programmes', { id: pr.id, tab: 'fees' }); const i = document.getElementById('cb8-k-' + oid); if (i) i.value = String(k); ACT.cb8PayAdd({ dataset: { p: pr.id, o: oid } }); };
  const dep = (pr, dm, amt) => { go('a-programmes', { id: pr.id, tab: 'fees' }); const r = document.querySelector(`main input[name="e1-wdm"][value="${dm}"]`); r.checked = true; INP.e1DepMode(r); if (amt != null) document.querySelector('main #e1-d').value = String(amt); ACT.cb8Dep({ dataset: { p: pr.id } }); };
  const submit = pr => { go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); return MODAL ? press() : 'no dialog'; };
  const decide = (qid, a, r = 'Checked') => { ACT.e1Decide({ dataset: { id: qid, a } }); if (!MODAL) return 'no dialog'; return reason(r); };
  const wf = pr => cb8Wf(pr), qOf = pr => ADMIN.queue.find(x => x.id === wf(pr).qid); // the queue itself (an Academic Admin's queue view doesn't list Finance items)
  // A complete package by an Academic Admin: obs yes with both locations; option 1 £2,400 (full + 4 + 7), option 2 £1,800 (full + 3)
  const build = () => {
    ACA(); const pr = make({ obs: 'yes', opts: [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }] }); settings(pr.id, 'yes', 'Permitted', 'Available');
    const [a, b] = cb8Work(pr).opts;
    fees(pr, a.id, { '#c8-wp': '70', '#c8-off': '0' }); fees(pr, b.id, { '#c8-wp': '100', '#c8-off': '45.50' });
    [1, 4, 7].forEach(k => payAdd(pr, a.id, k)); [1, 3].forEach(k => payAdd(pr, b.id, k));
    // the creation default (6 monthly, from the plan) is removed so each option offers exactly what is configured here
    [a, b].forEach(o => { if (opt(pr, o === a ? 0 : 1).pay.some(x => x.k === 6)) ACT.cb8PayDel({ dataset: { p: pr.id, o: o.id, k: '6' } }); });
    return pr;
  };

  /* ================= A. Section 5 for a new programme ================= */
  await T('CB8-A layout', async () => {
    fresh(); ACA(); const pr = make({ opts: [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }] }); go('a-programmes', { id: pr.id, tab: 'payments' });
    ok('CB8-A a programme made in the builder is a package programme; Section 5 panels: Fees & payment options, Financial versions, Legacy observation fee rate', cb8Managed(pr) && qa('.cb-panels .tab').map(t => t.textContent).join('|') === 'Fees & payment options|Financial versions|Legacy observation fee rate', qa('.cb-panels .tab').map(t => t.textContent).join('|'));
    ok('CB8-A one card per fee option (no wide table), with tuition fee, both observation fees and payment options', qa('.cb8-opt').length === 1 && !q('.cb8-opts table') && /Tuition fee/.test(q('.cb8-opt').textContent) && /Workplace observation fee/.test(q('.cb8-opt').textContent) && /Academy-office observation fee/.test(q('.cb8-opt').textContent) && /Payment options/.test(q('.cb8-opt').textContent));
    ok('CB8-A no observations: both observation fees "Not applicable — no observations"', (q('.cb8-opt .cb8-fees').textContent.match(/Not applicable — no observations/g) || []).length === 2);
    ok('CB8-A status "Draft — not yet sent to Finance"; Add fee option, Add payment option, Deposit and "Submit to Finance for review" offered', /Draft — not yet sent to Finance/.test(q('.cb8-state').textContent) && !!q('[data-act="cb8Opt"][data-o=""]') && !!q('[data-act="cb8PayAdd"]') && !!q('input[name="e1-wdm"]') && !!q('[data-act="cb8Submit"]'));
    ok('CB8-A the old route "plan" opens Fees & payment options; "fees" too', (go('a-programmes', { id: pr.id, tab: 'plan' }), q('.cb-panels .tab[aria-selected="true"]').textContent === 'Fees & payment options') && (go('a-programmes', { id: pr.id, tab: 'fees' }), !!q('.cb8-sec')));
    ok('CB8-A the creation defaults are carried in: the option\'s fee and the plan\'s 6 monthly payments, Academy default deposit', opt(pr).fee === 2400 && J(opt(pr).pay.map(x => x.k)) === '[6]' && W8(pr).dep.mode === 'default');
    ok('CB8-A Course Details: fees are "managed in Section 5"', (go('a-programmes', { id: pr.id, tab: 'details' }), /managed in Section 5 — Fees/.test(main())));
    fresh(); SA(); go('a-programmes', { id: 'NV-N2', tab: 'payments' });
    ok('CB8-A a programme from before packages (NV-N2) keeps its panels and plan step, with "Start a new financial package"', !cb8Managed(s3Pr('NV-N2')) && !!q('.e1-plan') && !!q('[data-act="cb8Start"]'));
    go('a-programmes', { id: 'NV-L3', tab: 'plan' });
    ok('CB8-A seeded Level 3 (no structured duration): read-only plan as before and why a package can\'t start', !!q('.cb-plan') && !q('[data-act="cb8Start"]') && /needs a structured course duration/.test(main()));
  });

  /* ================= B. Fee options ================= */
  await T('CB8-B fee options', async () => {
    fresh(); SA(); const pr = make(); ACA(); const a0 = ADMIN.audit.length;
    ['Self-Paced — standard', 'Fully Assisted — premium', 'Self-Paced — employer funded'].forEach((l, i) => fees(pr, '', { '#c8-l': l, '#c8-m': i % 2 ? 'Fully Assisted' : 'Self-Paced', '#c8-f': String(1500 + i * 250) }));
    const act = W8(pr).opts.filter(o => o.status === 'Active');
    ok('CB8-B unlimited fee options: 4 options, each with a stable new ID (never reused), audited', act.length === 4 && new Set(act.map(o => o.id)).size === 4 && act.every(o => o.id.startsWith(pr.id + '-FO-')) && since(a0).filter(x => x.action === 'Fee option added').length === 3);
    go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CB8-B each option is its own card', qa('.cb8-opt').length === 4);
    const bad = [[{ '#c8-l': '' }, 'no name'], [{ '#c8-l': 'self-paced — standard' }, 'duplicate name'], [{ '#c8-l': 'New', '#c8-m': '' }, 'no mode'], [{ '#c8-l': 'New', '#c8-m': 'Self-Paced', '#c8-f': '0' }, 'fee 0'], [{ '#c8-l': 'New', '#c8-m': 'Self-Paced', '#c8-f': '100000.01' }, 'over the maximum'], [{ '#c8-l': 'New', '#c8-m': 'Self-Paced', '#c8-f': '12.345' }, 'fractional pence']];
    bad.forEach(([v, what]) => { const n0 = W8(pr).opts.length; const r = fees(pr, '', { '#c8-f': '1000', ...v }); ok(`CB8-B (negative) ${what}: refused, the field marked, nothing added`, r === false && W8(pr).opts.length === n0 && !!document.querySelector('#modal-root .err')); closeModal(); });
    const o = act[1]; fees(pr, o.id, { '#c8-l': 'Self-Paced — 2027', '#c8-f': '1650' });
    ok('CB8-B edit: name and fee changed in the draft, audited before → after', opt(pr, 1).label === 'Self-Paced — 2027' && opt(pr, 1).fee === 1650 && ADMIN.audit.slice(0, 3).some(x => x.action === 'Fee option changed'));
    ACT.cb8OptRetire({ dataset: { p: pr.id, o: o.id } }); reason('Not offered');
    ok('CB8-B a draft option that was never approved is removed (not retired); its ID isn\'t reused', !W8(pr).opts.some(x => x.id === o.id) && (fees(pr, '', { '#c8-l': 'Another', '#c8-m': 'Self-Paced', '#c8-f': '999' }), W8(pr).opts.slice(-1)[0].id !== o.id));
    fresh(); SA(); const p2 = make({ level: 'Level 4', price: 2200 }); ACA(); go('a-programmes', { id: p2.id, tab: 'fees' });
    ok('CB8-B Level 4: one programme fee card, no "Add fee option" (Q-CB-10)', qa('.cb8-opt').length === 1 && !q('[data-act="cb8Opt"][data-o=""]') && /one programme fee/.test(main()) && opt(p2).label === 'Programme fee' && opt(p2).fee === 2200);
    ok('CB8-B (negative) Level 4: adding a second fee option is refused', fees(p2, '', {}) === 'no dialog' && W8(p2).opts.length === 1);
  });

  /* ================= C. Observation fees ================= */
  await T('CB8-C observation fees', async () => {
    fresh(); SA(); const pr = make({ obs: 'yes' }); settings(pr.id, 'yes', 'Permitted', 'Available'); ACA(); const o = opt(pr);
    go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CB8-C observations yes, both locations permitted: both fees "Not set" and a blocker each', (q('.cb8-opt .cb8-fees').textContent.match(/Not set/g) || []).length === 2 && /set the workplace observation fee/.test(q('.cb8-submit').textContent) && /set the Academy-office observation fee/.test(q('.cb8-submit').textContent));
    fees(pr, o.id, { '#c8-wp': '70', '#c8-off': '0' });
    ok('CB8-C £0 is a genuine value: the office fee £0.00 "no charge", the workplace £70', opt(pr).obsWp === 70 && opt(pr).obsOff === 0 && (go('a-programmes', { id: pr.id, tab: 'fees' }), /£0\.00 no charge/.test(q('.cb8-fees').textContent)));
    [['', 'blank (must enter 0 for no charge)'], ['-1', 'negative'], ['10.005', 'fractional pence'], ['abc', 'text']].forEach(([v, w]) => { const r = fees(pr, o.id, { '#c8-wp': v }); ok(`CB8-C (negative) workplace fee ${w}: refused`, r === false && opt(pr).obsWp === 70); closeModal(); });
    SA(); settings(pr.id, null, null, 'Not available'); ACA(); go('a-programmes', { id: pr.id, tab: 'fees' });
    ok('CB8-C office no longer permitted: "Not applicable — location not permitted" with the kept £0.00; the stored value is not discarded', /location not permitted/.test(q('.cb8-fees').textContent) && /kept: £0\.00/.test(q('.cb8-fees').textContent) && opt(pr).obsOff === 0);
    ACT.cb8Opt({ dataset: { p: pr.id, o: o.id } }); ok('CB8-C the dialog shows the office field disabled ("not applicable")', document.querySelector('#modal-root #c8-off').disabled && /Not applicable/.test(document.querySelector('#modal-root').textContent)); closeModal();
    SA(); settings(pr.id, 'no'); ACA(); go('a-programmes', { id: pr.id, tab: 'fees' });
    ok('CB8-C course has no observations: both fees "Not applicable — no observations"; no observation blocker; values kept', (q('.cb8-fees').textContent.match(/no observations/g) || []).length === 2 && !/set the [a-zA-Z-]+ observation fee/.test(q('.cb8-submit').textContent) && opt(pr).obsWp === 70);
    const pkg = cb8Freeze(pr, W8(pr)); ok('CB8-C the frozen package records the fee in force as not applicable (null) and keeps the value (kept…)', pkg.opts[0].obsWp === null && pkg.opts[0].keptWp === 70 && pkg.opts[0].keptOff === 0);
  });

  /* ================= D. Payment options ================= */
  await T('CB8-D payment options', async () => {
    fresh(); SA(); const pr = make({ opts: [{ l: 'Fully Assisted — standard', f: 1800, m: 'Fully Assisted' }] }); ACA(); const o = opt(pr);
    ACT.cb8PayDel({ dataset: { p: pr.id, o: o.id, k: '6' } }); ok('CB8-D remove a payment option (audited)', !opt(pr).pay.length && ADMIN.audit.slice(0, 3).some(x => x.action === 'Payment option removed'));
    [1, 4, 7, 11, 24].forEach(k => payAdd(pr, o.id, k));
    ok('CB8-D any count, not a fixed 2 / 3 / 6: pay in full, 4, 7, 11 and 24 payments on one option, in order', J(opt(pr).pay.map(x => x.k)) === '[1,4,7,11,24]');
    go('a-programmes', { id: pr.id, tab: 'fees' }); const t = q('.cb8-opt').textContent;
    ok('CB8-D exact amounts: £1,800 in 7 = "6 × £257.14 + £257.16", total £1,800.00; 4 = "4 × £450.00"', /6 × £257\.14 \+ £257\.16/.test(t) && /4 × £450\.00/.test(t) && /Total £1,800\.00/.test(t));
    ok('CB8-D rules in words: "Paid in full at batch start", "Every 45–46 days" (6 months in 4), "Monthly"? no — 7 → days; 24 → days', /Paid in full at batch start/.test(t) && /Every 45–46 days from batch start/.test(t) && /Every 2[56](–2[67])? days from batch start/.test(t), t.match(/Every [^f]+from batch start/g));
    ok('CB8-D due points and a dated example (sample start 1 Feb 2027): 4 payments on 1 Feb, 18 Mar, 2 May, 16 Jun 2027', /Batch start · \+45 days · \+90 days · \+135 days/.test(t) && [...document.querySelectorAll('main .cb8-pay[data-k="4"] .cb8-dates .cb8-dd')].map(x => x.textContent).join('|') === '1 Feb 2027|18 Mar 2027|2 May 2027|16 Jun 2027');
    const b = cb8Batches(s3Pr('NV-L3'))[0]; ok('CB8-D (setup) a sample can be a real batch of the programme; this one has none, so only the sample', cb8Batches(pr).length === 0 && !!b);
    [['0', 'zero'], ['25', 'over 24'], ['2.5', 'fraction'], ['4', 'a duplicate'], ['', 'blank']].forEach(([k, w]) => { const n0 = opt(pr).pay.length; payAdd(pr, o.id, k); ok(`CB8-D (negative) count ${w}: refused with the reason, nothing added`, opt(pr).pay.length === n0 && !!document.querySelector('main .cb8-add .err')); });
    const i = document.getElementById('cb8-k-' + o.id); i.value = '3'; INP.cb8KLive(i);
    ok('CB8-D live preview while typing: rule, amounts and example dates (3 → every 2 months, 3 × £600.00, 1 Feb, 1 Apr, 1 Jun)', /Every 2 months from batch start/.test(q('.cb8-prev').textContent) && /3 × £600\.00/.test(q('.cb8-prev').textContent) && /1 Feb, 1 Apr, 1 Jun/.test(q('.cb8-prev').textContent));
    fresh(); SA(); const w3 = make({ n: 3, unit: 'weeks', opts: [{ l: 'Short course', f: 500, m: 'Self-Paced' }] }); ACA();
    payAdd(w3, opt(w3).id, 22); ok('CB8-D (negative) a 3-week course can\'t have 22 payments (two on one day): refused with the reason', !opt(w3).pay.some(x => x.k === 22) && /same day/.test(main()));
    payAdd(w3, opt(w3).id, 21); ok('CB8-D 21 payments over 21 days: accepted, one a day', opt(w3).pay.some(x => x.k === 21));
  });

  /* ================= E. Deposit ================= */
  await T('CB8-E deposit', async () => {
    fresh(); const pr = build(); dep(pr, 'none'); ok('CB8-E "Deposit not available"', W8(pr).dep.mode === 'none' && ADMIN.audit.slice(0, 3).some(x => x.action === 'Deposit setting changed'));
    dep(pr, 'own', 1800); ok('CB8-E (negative) a custom deposit equal to an option\'s fee is refused when saved, naming the option (E2 rule); still "not available"', /Self-Paced — standard: The deposit \(£1,800\.00\) must be below the fee/.test(main()) && W8(pr).dep.mode === 'none');
    dep(pr, 'own', 250); ok('CB8-E custom £250 below every fee: no deposit blocker', W8(pr).dep.amount === 250 && !cb8Issues(pr, W8(pr)).some(x => /deposit/.test(x.msg)));
    const d0 = J(W8(pr).dep); go('a-programmes', { id: pr.id, tab: 'fees' }); const r = document.querySelector('main input[name="e1-wdm"][value="own"]'); r.checked = true; document.querySelector('main #e1-d').value = '12.345'; ACT.cb8Dep({ dataset: { p: pr.id } });
    ok('CB8-E (negative) custom 12.345: refused (whole pence), unchanged', J(W8(pr).dep) === d0);
    dep(pr, 'default'); ok('CB8-E Academy default (£300) — shown with its amount', /£300\.00 — Academy default/.test(main()));
  });

  /* ================= F. Submit and lock ================= */
  await T('CB8-F submit and lock', async () => {
    fresh(); ACA(); const p0 = make({ obs: 'yes' }); settings(p0.id, 'yes', 'Permitted', 'Available'); const n0 = ADMIN.queue.length;
    go('a-programmes', { id: p0.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: p0.id } });
    ok('CB8-F (negative) an incomplete package can\'t be submitted: no dialog, no queue item; the blockers are listed', !MODAL && ADMIN.queue.length === n0 && wf(p0).status === 'Draft');
    fresh(); const pr = build(), f0 = STORE.fin.notifs.length, q0 = ADMIN.queue.length, a0 = ADMIN.audit.length;
    ok('CB8-F (setup) the complete package has no blockers', cb8Issues(pr, W8(pr)).length === 0, J(cb8Issues(pr, W8(pr))));
    submit(pr); const i = qOf(pr);
    ok('CB8-F submit: one "Programme payment terms" queue item, Pending, routed to a Finance Admin; status "Waiting for Finance review"', ADMIN.queue.length === q0 + 1 && i.type === 'Programme payment terms' && i.status === 'Pending' && i.data.cb8 && wf(pr).status === 'Pending' && ADMIN.staff.some(s => s.name === i.first && s.roles.includes('Finance Admin')));
    ok('CB8-F the submitted package is frozen (deep) and complete: options, observation fees, payment counts with exact pence, deposit, duration, rule', Object.isFrozen(i.data.pkg) && Object.isFrozen(i.data.pkg.opts[0].pay[0]) && i.data.pkg.rule === 'CB-SCHED-1' && J(i.data.pkg.opts.map(o => o.pay.map(x => x.k))) === '[[1,4,7],[1,3]]' && J(i.data.pkg.opts[0].pay[2].pence) === J([34286, 34286, 34286, 34286, 34286, 34286, 34284]) && i.data.pkg.opts[1].obsOff === 45.5 && J(i.data.pkg.dur) === J({ n: 6, unit: 'months' }));
    ok('CB8-F one Finance notification for the item; re-rendering adds none', STORE.fin.notifs.length === f0 + 1 && (render(), render(), STORE.fin.notifs.length === f0 + 1) && STORE.fin.notifs[0].key === 'cb8-sub-' + i.id);
    ok('CB8-F audited: "Financial package submitted for Finance review"', since(a0).some(x => x.action === 'Financial package submitted for Finance review'));
    go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CB8-F locked view: "Submitted package (read-only)", no edit, add or submit controls; Section 5 badge "With Finance"', /Submitted package \(read-only\)/.test(main()) && !q('[data-act="cb8PayAdd"]') && !q('[data-act="cb8Opt"]') && !q('[data-act="cb8Submit"]') && /With Finance/.test(q('.cb-sec[data-tab="payments"]').textContent));
    const s0 = J(W8(pr)), a1 = ADMIN.audit.length; let opened = 0;
    [() => ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }), () => ACT.cb8PayAdd({ dataset: { p: pr.id, o: opt(pr).id, k: '5' } }), () => ACT.cb8PayDel({ dataset: { p: pr.id, o: opt(pr).id, k: '4' } }), () => ACT.cb8Dep({ dataset: { p: pr.id } }), () => ACT.cb8OptRetire({ dataset: { p: pr.id, o: opt(pr).id } }), () => ACT.cb8Submit({ dataset: { p: pr.id } })].forEach(f => { closeModal(); f(); if (MODAL) opened++; closeModal(); });
    ok('CB8-F (negative) while Finance reviews, every package action is refused and logged; nothing changes', opened === 0 && J(W8(pr)) === s0 && since(a1).filter(x => /^Blocked/.test(x.action)).length >= 6);
    SA(); const a2 = ADMIN.audit.length; ACT.n5Settings({ dataset: { p: pr.id } });
    ok('CB8-F (negative) observation settings locked while Finance reviews (logged)', !MODAL && blocked(a2, /observation settings/));
    ok('CB8-F (negative) "Does this course contain observations?" can\'t change while Finance reviews', cbObsSet(pr, false) === false && cbObsOf(pr) === true);
    go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('#np-d').value = '9'; const d0 = J(pr.durV); ACT.cbDetSave({ dataset: { id: pr.id } });
    ok('CB8-F (negative) the duration can\'t change while Finance reviews (logged)', J(pr.durV) === d0 && blocked(a2, /change the duration/));
  });

  /* ================= G. Finance decision ================= */
  await T('CB8-G Finance decision', async () => {
    fresh(); const pr = build(); submit(pr); const i = qOf(pr), v0 = s4PlanCur(pr.id).v;
    FA(); go('a-queue', { id: i.id }); const qt = main();
    ok('CB8-G Finance\'s queue item shows the same package renderer: every option card, payment option and amount, the basis and deposit', qa('.cb8-q .cb8-opt').length === 2 && /6 × £342\.86 \+ £342\.84/.test(qt) && /3 × £600\.00/.test(qt) && /Level 3 · 6 months · observations yes \(workplace and Academy office\)/.test(qt) && /Academy default deposit/.test(qt) && !!q('[data-act="e1Decide"][data-a="approve"]'));
    ok('CB8-G Finance can\'t open the builder (unchanged: NVQ Programmes is not a Finance page)', !FIN_ROUTES.has('a-programmes'));
    ACA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('CB8-G (negative) the Academic Admin (the submitter) can\'t decide (the Finance item isn\'t theirs to open)', !MODAL && wf(pr).status === 'Pending');
    SA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('CB8-G (negative) the Super Administrator doesn\'t decide a Finance item (only an Active Finance Admin)', !MODAL && wf(pr).status === 'Pending');
    COO(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('CB8-G (negative) not from another portal', !MODAL && wf(pr).status === 'Pending');
    FA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('CB8-G (negative) a note is required', reason('') === false && wf(pr).status === 'Pending'); closeModal();
    decide(i.id, 'return', 'Office fee too low for Self-Paced'); ok('CB8-G request changes: status "Changes requested", Finance\'s reason shown to the creator, the creator told once', wf(pr).status === 'Changes' && STORE.aca.notifs.filter(n => /changes requested/.test(n.t) && n.b.includes(i.id)).length === 1 && (ACA(), go('a-programmes', { id: pr.id, tab: 'fees' }), /Office fee too low/.test(q('.cb8-state').textContent)));
    fees(pr, opt(pr, 1).id, { '#c8-off': '60' }); submit(pr); const i2 = qOf(pr);
    ok('CB8-G resubmitted: a new queue item with the change', i2.id !== i.id && i2.data.pkg.opts[1].obsOff === 60 && wf(pr).status === 'Pending');
    FA(); const r1n = r1Opts(pr.id).length, n1 = STORE.aca.notifs.length; decide(i2.id, 'approve', 'Terms agreed');
    const cur = s4PlanCur(pr.id);
    ok('CB8-G approve: exactly one new plan version carrying the frozen package; status Approved (by, date, item)', cur.v === v0 + 1 && !!cur.pkg && Object.isFrozen(cur.pkg) && cur.pkg.approved.qid === i2.id && cur.pkg.approved.by === ADMIN.me.name && wf(pr).status === 'Approved');
    ok('CB8-G Level 3 options are written with their IDs, names, modes and fees (R1), and the plan\'s legacy view is derived (both · 3)', r1Opts(pr.id).length === r1n && J(r1Opts(pr.id).filter(o => o.status === 'Active').map(o => [o.id, o.fee, o.mode])) === J(cur.pkg.opts.map(o => [o.id, o.fee, o.mode])) && cur.meth === 'both' && cur.inst === 3);
    ok('CB8-G the creator is told once; the publish block for payment terms is lifted', STORE.aca.notifs.length === n1 + 1 && !ch8Check(pr).block.some(b => /Payment terms/.test(b)));
    ACT.e1Decide({ dataset: { id: i2.id, a: 'approve' } }); ok('CB8-G (negative) a decided item can\'t be decided twice', !MODAL || reason('again') === false); closeModal();
    // self-approval: a Finance Admin who is also a System Admin submits — they can't approve their own submission
    fresh(); SA(); const p2 = make({ level: 'Level 4', price: 2000 }); SD(); payAdd(p2, opt(p2).id, 3); submit(p2); const i3 = qOf(p2);
    ok('CB8-G (setup) a System Admin who is also a Finance Admin submits as a creator', !!i3 && i3.raisedBy === ADMIN.me.name);
    S.sysCtx = 'Finance Admin'; render(); ACT.e1Decide({ dataset: { id: i3.id, a: 'approve' } }); if (MODAL) reason('Mine');
    ok('CB8-G (negative) no self-approval: in their Finance Admin role they can\'t decide the package they submitted', wf(p2).status === 'Pending' && !cb8Cur(p2.id)); closeModal(); S.sysCtx = 'System Administrator';
    FA(); decide(i3.id, 'approve', 'OK'); ok('CB8-G another Finance Admin approves it', wf(p2).status === 'Approved' && !!cb8Cur(p2.id));
  });

  /* ================= H. Invalidation ================= */
  await T('CB8-H invalidation', async () => {
    const approved = () => { fresh(); const pr = build(); submit(pr); FA(); decide(qOf(pr).id, 'approve'); ACA(); return pr; };
    let pr = approved(); const v = s4PlanCur(pr.id).v, a0 = ADMIN.audit.length;
    payAdd(pr, opt(pr).id, 2); ok('CB8-H adding a payment option sends the terms back to Draft (logged); the approved version stays in force for learners', wf(pr).status === 'Draft' && since(a0).some(x => x.action === 'Payment terms need Finance approval again') && s4PlanCur(pr.id).v === v && !s4PlanCur(pr.id).pkg.opts[0].pay.some(x => x.k === 2));
    [['a fee', p => fees(p, opt(p).id, { '#c8-f': '2500' })], ['an observation fee', p => fees(p, opt(p).id, { '#c8-wp': '75' })], ['the deposit', p => dep(p, 'none')], ['a new fee option', p => fees(p, '', { '#c8-l': 'Extra', '#c8-m': 'Self-Paced', '#c8-f': '900', '#c8-wp': '50', '#c8-off': '0' })], ['removing a payment option', p => ACT.cb8PayDel({ dataset: { p: p.id, o: opt(p).id, k: '4' } })], ['retiring an option', p => { ACT.cb8OptRetire({ dataset: { p: p.id, o: opt(p, 1).id } }); reason('Retire'); }]].forEach(([w, f]) => { pr = approved(); f(pr); ok(`CB8-H changing ${w} withdraws approval`, wf(pr).status === 'Draft'); });
    pr = approved(); SA(); go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('#np-d').value = '9'; ACT.cbDetSave({ dataset: { id: pr.id } });
    ok('CB8-H changing the duration withdraws approval (logged with before → after)', J(pr.durV) === J({ n: 9, unit: 'months' }) && wf(pr).status === 'Draft' && /6 months[^→]*→ Level 3 · 9 months/.test(ADMIN.audit.find(x => x.action === 'Payment terms need Finance approval again').reason));
    pr = approved(); SA(); settings(pr.id, null, null, 'Not available'); ok('CB8-H changing an observation location withdraws approval', wf(pr).status === 'Draft');
    pr = approved(); SA(); go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('#np-obs-no').checked = true; ACT.cbDetSave({ dataset: { id: pr.id } }); ok('CB8-H changing "Does this course contain observations?" withdraws approval', cbObsOf(pr) === false && wf(pr).status === 'Draft');
    pr = approved(); SA(); go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('#np-ds').value = 'New description'; (document.querySelector('#np-code') || {}).value = 'CBE-NEW' + codeN; ACT.cbDetSave({ dataset: { id: pr.id } });
    ok('CB8-H (negative) title, description and code don\'t withdraw approval', !pr.code /* CR (PD-CR-06): no course code is entered */ && wf(pr).status === 'Approved');
    go('a-programmes', { id: pr.id, tab: 'structure' }); ACT.ch8AddUnit({ dataset: { id: pr.id } }); fill({ '#u-c': 'U900', '#u-t': 'Extra unit' }); prim(); closeModal();
    ACT.chLetterUp({ dataset: { id: pr.id } }); ACT.chLetterSample(); reason('Letter v1');
    ok('CB8-H (negative) curriculum and offer letter changes don\'t withdraw approval', wf(pr).status === 'Approved' && chLetters(pr.id).length >= 1);
  });

  /* ================= I. Stale submissions ================= */
  await T('CB8-I stale submission', async () => {
    fresh(); const pr = build(); submit(pr); const i = qOf(pr); FA(); ACT.s4CfgEdit(); fill({ '#cf-d': '250', '#cf-h': '28' }); reason('New default');
    go('a-queue', { id: i.id }); ok('CB8-I the default deposit changed after submission: the item says it can\'t be approved as submitted', /Can't be approved as submitted/.test(main()) && /Academy default deposit changed/.test(main()));
    const n0 = s4Plans(pr.id).length; ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('Try');
    ok('CB8-I (negative) approval refused (logged); no plan version made; "Request changes" still works', s4Plans(pr.id).length === n0 && wf(pr).status === 'Pending' && ADMIN.audit.some(x => /Blocked: decide payment terms/.test(x.action)) && (closeModal(), decide(i.id, 'return', 'Resubmit with the new default'), wf(pr).status === 'Changes'));
  });

  /* ================= J. Super Administrator (D8) ================= */
  await T('CB8-J Super Administrator', async () => {
    fresh(); SA(); const pr = make({ level: 'Level 5', price: 3000 }), q0 = ADMIN.queue.length; payAdd(pr, opt(pr).id, 1);
    go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CB8-J the Super Administrator sees "Approve and put in force" (D8), not "Submit"', !!q('[data-act="cb8SaApprove"]') && !q('[data-act="cb8Submit"]'));
    ACT.cb8SaApprove({ dataset: { p: pr.id } }); reason('My own terms');
    ok('CB8-J approved at once: a plan version with the package, "Super Admin — no approval required", no queue item', !!cb8Cur(pr.id) && cb8Cur(pr.id).approved.how === SA_TAG && ADMIN.queue.length === q0 && wf(pr).status === 'Approved');
    ACA(); ACT.cb8SaApprove({ dataset: { p: pr.id } }); ok('CB8-J (negative) anyone else\'s "approve at once" is refused (logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: approve payment terms');
  });

  /* ================= K. Old editors refused; legacy programmes unchanged ================= */
  await T('CB8-K old editors', async () => {
    fresh(); const pr = build(); const s0 = J(s4Plans(pr.id)), r0 = J(r1Opts(pr.id));
    [[() => ACT.e1Submit({ dataset: { id: pr.id } }), 'old proposal form'], [() => ACT.e1Draft({ dataset: { id: pr.id } }), 'old draft'], [() => { SA(); ACT.ch8SavePlan({ dataset: { id: pr.id } }); }, 'old plan step save'], [() => { FA(); ACT.s4PlanEdit({ dataset: { p: pr.id } }); }, 'Finance\'s plan editor'], [() => { FA(); ACT.r1OptAdd({ dataset: { p: pr.id } }); }, 'Finance\'s fee-option card (add)'], [() => { SA(); ACT.r1OptEdit({ dataset: { id: opt(pr).id } }); }, 'fee-option card (edit)']].forEach(([f, w]) => { ACA(); const a0 = ADMIN.audit.length; f(); ok(`CB8-K (negative) ${w} refuses a package programme (logged)`, !MODAL && since(a0).some(x => /^Blocked/.test(x.action)) && J(s4Plans(pr.id)) === s0 && J(r1Opts(pr.id)) === r0); closeModal(); });
    FA(); ACT.s4PlanEdit({ dataset: {} }); document.querySelector('#pp-p').value = pr.id; ok('CB8-K (negative) the editor\'s programme picker can\'t be used for a package programme either', reason('x') === false && J(s4Plans(pr.id)) === s0); closeModal();
    FA(); ACT.s4PlanEdit({ dataset: { p: 'NV-N2' } }); ok('CB8-K (positive) legacy programmes keep Finance\'s editor (NV-N2)', !!MODAL && !!document.querySelector('#modal-root #pp-n')); closeModal();
  });

  /* ================= L. Role checks ================= */
  await T('CB8-L unauthorized direct calls', async () => {
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', () => learner('C')], ['an Academic Coordinator', COO]].forEach(([who, enter]) => {
      fresh(); SA(); const pr = make(); const s0 = J(W8(pr)), oid = opt(pr).id; enter(); const a0 = ADMIN.audit.length; let opened = 0;
      [() => ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }), () => ACT.cb8Opt({ dataset: { p: pr.id, o: oid } }), () => ACT.cb8OptRetire({ dataset: { p: pr.id, o: oid } }), () => ACT.cb8PayAdd({ dataset: { p: pr.id, o: oid, k: '3' } }), () => ACT.cb8PayDel({ dataset: { p: pr.id, o: oid, k: '6' } }), () => ACT.cb8Dep({ dataset: { p: pr.id } }), () => ACT.cb8Submit({ dataset: { p: pr.id } }), () => ACT.cb8SaApprove({ dataset: { p: pr.id } }), () => ACT.cb8Start({ dataset: { p: 'NV-N2' } })].forEach(f => { closeModal(); f(); if (MODAL) opened++; closeModal(); });
      ok(`CB8-L (negative) ${who}: every package action refused — no dialog, nothing changed, each logged`, opened === 0 && J(W8(pr)) === s0 && !CB8().wf['NV-N2'] && since(a0).filter(a => /^Blocked/.test(a.action)).length >= 9);
    });
    [['Super Admin', SA], ['System Admin', SYS], ['Academic Admin', ACA]].forEach(([who, enter]) => { fresh(); SA(); const pr = make(); enter(); payAdd(pr, opt(pr).id, 5); ok(`CB8-L (positive) ${who}: adds a payment option`, opt(pr).pay.some(x => x.k === 5)); });
    fresh(); SA(); const pr = make(); ACT.cb8Opt({ dataset: { p: pr.id, o: opt(pr).id } }); document.querySelector('#modal-root #c8-f').value = '999'; setAdminIdentity('FA'); const a9 = ADMIN.audit.length; prim();
    ok('CB8-L a role change while the dialog is open: not saved, logged', opt(pr).fee !== 999 && blocked(a9)); closeModal();
    fresh(); SA(); const a1 = ADMIN.audit.length; ACT.cb8Start({ dataset: { p: 'NV-L3O' } }); ok('CB8-L (negative) a retired programme: refused, logged', !CB8().wf['NV-L3O'] && blocked(a1));
    ACT.cb8Start({ dataset: { p: 'NV-L3' } }); ok('CB8-L (negative) no structured duration (seeded Level 3): a package can\'t start', !CB8().wf['NV-L3']);
  });

  /* ================= M. Finance's Payment Plans ================= */
  await T('CB8-M Payment Plans', async () => {
    fresh(); const pr = build(); submit(pr); const i = qOf(pr); FA(); go('f-plans', { tab: 'templates' });
    const row = () => document.querySelector(`main .s4-plans tr[data-pid="${pr.id}"]`);
    ok('CB8-M while waiting: "Review package (AQ-…)" instead of "Edit plan"; the fee-option card has no add / edit / retire', !!row() && new RegExp('Review package \\(' + i.id + '\\)').test(row().textContent) && !row().querySelector('[data-act="s4PlanEdit"]') && !document.querySelector(`main .r1-opts[data-pid="${pr.id}"] [data-act^="r1Opt"]:not([data-act="r1OptHist"])`));
    decide(i.id, 'approve', 'OK'); go('f-plans', { tab: 'templates' }); row().querySelector('[data-act="cb8ViewPkg"]').click();
    ok('CB8-M approved: "View package" opens the frozen package read-only (same renderer)', !!MODAL && document.querySelectorAll('#modal-root .cb8-opt').length === 2 && !document.querySelector('#modal-root [data-act="cb8PayAdd"]') && /an approved package never changes/.test(document.querySelector('#modal-root').textContent)); closeModal();
    ok('CB8-M the row states "Financial package" with each option\'s choices', /Financial package/.test(row().textContent) && /in full \/ 4 \/ 7/.test(row().textContent));
    BA(); const a0 = ADMIN.audit.length; ACT.cb8ViewPkg({ dataset: { p: pr.id } }); ok('CB8-M (negative) roles without finance or programme rights can\'t view a package (logged)', !MODAL && blocked(a0));
  });

  /* ================= N. Version history and historical isolation ================= */
  await T('CB8-N versions and isolation', async () => {
    fresh(); const pr = build(); submit(pr); FA(); decide(qOf(pr).id, 'approve', 'v2'); const v2 = s4PlanCur(pr.id), k2 = J(v2.pkg);
    const learners0 = J(Object.values(STORE.worlds).map(w => [w.plans, w.signup && w.signup.plan, w.nvq && w.nvq.feeOpt])), fees0 = J(STORE.chFees), letters0 = J(STORE.chLetters);
    ACA(); payAdd(pr, opt(pr).id, 2); fees(pr, opt(pr, 1).id, { '#c8-wp': '90' }); submit(pr); FA(); decide(qOf(pr).id, 'approve', 'v3'); const v3 = s4PlanCur(pr.id);
    ok('CB8-N a second approval: a new version; the earlier version and its package are byte-identical and superseded', v3.v === v2.v + 1 && v2.status === 'Superseded' && J(v2.pkg) === k2 && Object.isFrozen(v2.pkg));
    ok('CB8-N learners\' pinned terms, payment rows, fee options, observation fees and signed letters are untouched by package changes', J(Object.values(STORE.worlds).map(w => [w.plans, w.signup && w.signup.plan, w.nvq && w.nvq.feeOpt])) === learners0 && J(STORE.chFees) === fees0 && J(STORE.chLetters) === letters0);
    ACA(); go('a-programmes', { id: pr.id, tab: 'payhist' });
    ok('CB8-N Financial versions: every plan version, packages with who approved them and the item, a View button each, and the terms history', qa('.cb8-hist tbody tr').length === s4Plans(pr.id).length && qa('.cb8-hist [data-act="cb8ViewPkg"]').length === 2 && /Approved by Finance/.test(main()) && /Submitted to Finance/.test(main()));
    document.querySelector(`main [data-act="cb8ViewPkg"][data-v="${v2.v}"]`).click(); ok('CB8-N View shows that version\'s package (no 2-payment option in v2)', !!MODAL && !document.querySelector('#modal-root .cb8-pay[data-k="2"]') && /£100\.00/.test(document.querySelector('#modal-root').textContent)); closeModal();
  });

  /* ================= O. Offer letter wording ================= */
  await T('CB8-O offer letter wording', async () => {
    fresh(); const pr = build(); submit(pr); FA(); decide(qOf(pr).id, 'approve', 'OK'); ACA();
    ACT.chLetterUp({ dataset: { id: pr.id } }); ACT.chLetterSample(); document.querySelector('#lt-x').value = 'Dear {{full_name}},\n\nTo confirm your place, please {{payment_terms}}.'; reason('Uses the merge field');
    const L0 = J(chLetters(pr.id)); go('a-programmes', { id: pr.id, tab: 'letter' });
    const t = q('.cb8-lt').textContent;
    ok('CB8-O Section 6: the {{payment_terms}} wording comes from the approved options with dates (deposit, full fee on 1 Feb 2027, 4 and 7 payments)', /a deposit of £300\.00/.test(t) && /the full fee of £2,400\.00 \(due 1 Feb 2027\)/.test(t) && /the first of 4 payments \(£600\.00 due 1 Feb 2027, £600\.00 due 18 Mar 2027/.test(t) && /the first of 7 payments/.test(t));
    INP.cb8LtOpt({ dataset: { p: pr.id }, value: opt(pr, 1).id }); ok('CB8-O choosing another fee option shows its own choices (Self-Paced: in full or 3 payments)', /the first of 3 payments \(£600\.00 due 1 Feb 2027, £600\.00 due 1 Apr 2027, £600\.00 due 1 Jun 2027\)/.test(q('.cb8-lt').textContent) && !/first of 7/.test(q('.cb8-lt').textContent));
    ACT.chLetterPrev({ dataset: { id: pr.id } }); ok('CB8-O the letter preview fills the merge field with that wording; the letter text itself is unchanged', !!MODAL && /please pay a deposit of £300\.00; the full fee of £1,800\.00/.test(document.querySelector('#modal-root').textContent) && J(chLetters(pr.id)) === L0); closeModal();
    fresh(); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' }); ok('CB8-O a programme on legacy terms keeps its wording (no package)', /set before financial packages/.test(q('.cb8-lt').textContent));
  });

  /* ================= P. A published programme ================= */
  await T('CB8-P published programme', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-N2', tab: 'plan' }); ACT.cb8Start({ dataset: { p: 'NV-N2' } }); const pr = s3Pr('NV-N2');
    ok('CB8-P starting a package on a published programme: a draft copy of the terms in force (£900, 3 payments, own deposit £150); learners keep plan v1', cb8Managed(pr) && opt(pr).fee === 900 && J(opt(pr).pay.map(x => x.k)) === '[3]' && W8(pr).dep.mode === 'own' && W8(pr).dep.amount === 150 && !cb8Cur('NV-N2') && s4PlanCur('NV-N2').v === 1);
    go('a-programmes', { id: 'NV-N2', tab: 'fees' }); ok('CB8-P its observation answer isn\'t recorded: a blocker says where to answer it', /Answer "Does this course contain observations\?"/.test(q('.cb8-submit').textContent));
    ACA(); ACT.cb8Opt({ dataset: { p: 'NV-N2', o: opt(pr).id } }); ok('CB8-P (negative) only the Super Administrator changes the fee of an option in force (field read-only for others)', document.querySelector('#modal-root #c8-f').readOnly); closeModal();
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
