// SA-FINAL D — attendance (SA-03), referral code instead of a link (SA-04), attribution counted from learner records (SA-05).
// suites.sh runs it with FIXTURE=client. Phase 0: client demo (generate a code, register with it, counts, agency Copy code,
// attendance labels, simulated import vs manual entry, legacy handler role checks). Phase 1: a real refresh, Reset demo, then
// the legacy fixture (seeded counts vs records, Attribution filter, agency/learner copy, legacy register handlers, thresholds).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sa-d.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sa-d.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { closeModal(); ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-sa-d.R', J(R)); SS.setItem('ft-sa-d.phase', String(ph)); location.reload(); };
  const reason = (r = 'SA-D test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const aud = () => ADMIN.audit.length, wait = ms => new Promise(r => setTimeout(r, ms));
  const COP = []; try { navigator.clipboard.writeText = t => { COP.push(t); return Promise.resolve(); }; } catch (e) { }
  const lastCop = () => COP[COP.length - 1];
  const DEF = 'Attribution = the referral code a learner supplied when they registered; recorded once at verified registration; it does not track clicks, enrolments or payments.';
  const recN = code => { const s = new Set(); allLearners().forEach(l => { const m = /\(code ([A-Z0-9-]+)\)/i.exec(l.referral || ''); if (m && m[1].toUpperCase() === code.toUpperCase()) s.add(l.id); }); return s.size; };
  const shownN = (tid, code) => { const tr = $a('main tr').find(r => r.querySelector('.code') && r.querySelector('.code').textContent.trim() === code); if (!tr) return null; const ths = $a('main thead th').map(t => t.textContent.trim()), i = ths.findIndex(t => /^Registrations/.test(t)); return i < 0 ? null : +tr.children[i].textContent.trim(); };
  const listAll = id => { const st = S.ui['dt-' + id]; if (st) st.ps = 500; };
  const attrRows = () => $a('main section.dt tbody tr').map(r => r.textContent.replace(/\s+/g, ' '));

  if (PH === 0) {
    /* ================= SA-04 / SA-05 client demo: no codes; generate one; register with it ================= */
    await T('SAD client referrals: empty, explained, no link', async () => {
      pick('super'); go('a-referrals'); const m = main();
      ok('SAD-4 client demo: no referral codes, an honest empty state', ADMIN.referrals.length === 0 && /No referral codes yet/.test(m));
      ok('SAD-4 the page explains how a code is created, supplied at registration and recorded', /How referral codes work/.test(m) && /Referral \/ Agent Code/.test(m) && /verify their email or mobile code/.test(m) && /only through Data Correction/.test(m));
      ok('SAD-5 the plain-English definition of Attribution is on screen', m.includes(DEF));
      ok('SAD-4 no working link is offered: placeholder domain and missing route stated; no "Copy link"', /no deployed referral route/.test(m) && /placeholder domain/.test(m) && !/Copy link/.test(m));
      go('a-referrals', { tab: 'attribution' }); ok('SAD-5 client Attribution: definition and an empty list (no agency-created or admin-created learner listed)', main().includes(DEF) && /No learner has registered with a referral code yet/.test(main()));
    });
    let CODE = null, AGC = null;
    await T('SAD client generate + register with the code', async () => {
      go('a-referrals'); click($1('main [data-act="newRef"]')); $1('#rf-t').value = 'Welfare Buddy'; $1('#rf-o').value = 'SAD Buddy (learner)'; press(); const r = ADMIN.referrals[0]; CODE = r && r.code;
      go('a-referrals'); ok('SAD-5 a new code shows 0 registrations (= learner records) and offers Copy code', !!CODE && shownN('refs', CODE) === 0 && recN(CODE) === 0 && !!$1(`main [data-act="sadCopyCode"][data-c="${CODE}"]`), CODE);
      click($1(`main [data-act="sadCopyCode"][data-c="${CODE}"]`)); await wait(5); ok('SAD-4 Copy code copies the code itself (no URL)', lastCop() === CODE, J(lastCop()));
      signOutUI(); S.signedIn = false; S.auth = 'signin'; render(); ACT.regStart();
      $1('#rg-name').value = 'Sadie Coded'; $1('#rg-email').value = 'sadie.coded@sad.example'; $1('#rg-mob').value = '7700900982'; $1('#rg-country').value = 'United Kingdom'; $1('#rg-ref').value = CODE.toLowerCase(); $1('#rg-pw').value = 'Str0ng!Passw0rd'; $1('#rg-pw2').value = 'Str0ng!Passw0rd'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
      submit('form[data-submit="regSubmit"]'); if (MODAL) press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]');
      ok('SAD-5 the verified registration records the code on the learner', /\(code /.test(W.me.referral || '') && W.me.referral.includes(CODE), W.me.referral);
      pick('super'); go('a-referrals'); ok('SAD-5 Super Admin codes list: Registrations = learner records (1)', shownN('refs', CODE) === 1 && recN(CODE) === 1, J([shownN('refs', CODE), recN(CODE)]));
      ACT.s5dRefHist({ dataset: { c: CODE } }); const hn = ($1('#modal-root .sad-hist-n') || {}).textContent || '';
      ok('SAD-5 History: the count equals the learners it lists', /^1 · Sadie Coded/.test(hn.trim()), hn); closeModal();
      go('a-referrals', { tab: 'attribution' }); const rows = attrRows();
      ok('SAD-5 Attribution lists the referred learner with the code and its owner', rows.length === 1 && rows[0].includes('Sadie Coded') && rows[0].includes(CODE) && rows[0].includes('SAD Buddy (learner)'), J(rows));
      pick('biz'); go('a-referrals'); ok('SAD-5 Business codes list: same count; Copy code (no Copy link); QR holds the code only', shownN('brefs', CODE) === 1 && !/Copy link/.test(main()) && !!$1(`main [data-act="sadCopyCode"][data-c="${CODE}"]`));
      ACT.bRefQr({ dataset: { c: CODE } }); ok('SAD-4 Business QR: the code, not a link', /holds the referral code only, not a link/.test(mtxt()) && !/example\/r\//.test(mtxt())); closeModal();
      go('a-referrals', { tab: 'attribution' }); ok('SAD-5 Business Attribution: same single learner', attrRows().length === 1 && main().includes(DEF));
      go('b-reports', { tab: 'referrals' }); const tr = $a('main tbody tr').find(r => r.textContent.includes(CODE));
      ok('SAD-5 Business reports → Referral attribution: same count, defined', !!tr && tr.lastElementChild.textContent.trim() === '1' && main().includes(DEF), tr && tr.textContent);
    });
    await T('SAD client agency code: Copy code, count, explanation', async () => {
      const ag = ADMIN.agencies[0]; pick('super'); go('a-referrals'); click($1('main [data-act="newRef"]')); $1('#rf-t').value = 'Agency'; $1('#rf-o').value = ag.name; $1('#rf-c').value = 'SAD-AGY-1'; press(); AGC = (ADMIN.referrals.find(r => r.code === 'SAD-AGY-1') || {}).code;
      pick('agency'); go('g-profile'); const card = $1('main .sad-ag-ref'), t = card ? card.textContent.replace(/\s+/g, ' ') : '';
      ok('SAD-4 agency profile: its own code with "Copy code" (no "Copy link"), 0 learners from records, how the code is used', !!AGC && t.includes('SAD-AGY-1') && /Copy code/.test(t) && !/Copy link/.test(main()) && /0 learners registered with this code/.test(t) && /Referral \/ Agent Code/.test(t) && /Learners you create yourself are not counted/.test(t), t.slice(0, 300));
      COP.length = 0; click(card && card.querySelector('[data-act="sadCopyCode"]')); await wait(5);
      ok('SAD-4 agency Copy code copies the code — never a certificate-verification URL', J(COP) === J(['SAD-AGY-1']), J(COP));
      COP.length = 0; ok('SAD-4 an agency can\'t copy another owner\'s code by a direct call', ACT.sadCopyCode({ dataset: { c: CODE } }) === false && !COP.length);
    });

    /* ================= SA-03 client: modes, simulated import, manual entry kept ================= */
    let SID = null;
    await T('SAD client attendance: modes, simulated labels, manual kept', async () => {
      pick('super'); go('a-attendance'); const m = main();
      ok('SAD-3 Attendance screen: manual recording, simulated import and "automatic integration not implemented" are distinguished', /Manual recording/.test(m) && /Import Zoom report \(simulated\)/.test(m) && /not real Zoom data/.test(m) && /Automatic Zoom integration — not implemented/.test(m));
      ok('SAD-3 no "Report retrieved" wording', !/Report retrieved/.test(m));
      const s = s4bAllSess().filter(x => x.link && x.status !== 'Cancelled' && n4Eligible(x).length).sort((a, b) => new Date(a.start) - new Date(b.start))[0];
      if (!n4Started(s)) { const d = new Date(s.end) - new Date(s.start); s.start = new Date(now().getTime() - 2 * 3600e3).toISOString(); s.end = new Date(new Date(s.start).getTime() + d).toISOString(); } SID = s.id; // the session starts in the past inside this page only
      go('a-attendance', { id: SID }); click($1('main [data-act="n4Import"]')); const reg = n4Reg(SID); go('a-attendance', { id: SID }); const h = $1('main .n4-reg').innerHTML, t = main();
      ok('SAD-3 register: imported rows are labelled "Simulated Zoom import" (never bare "zoom")', /Simulated Zoom import/.test(h) && !/<td class="small">zoom<\/td>/.test(h) && Object.values(reg.rows).some(r => r.src === 'zoom'));
      const um = $a('main .n4-um li'); ok('SAD-3 every generated unmatched participant is marked Simulated', um.length > 0 && um.every(li => /Simulated/.test(li.textContent)) && /Unmatched participants — simulated Zoom report/.test(t) && /not real Zoom attendees/.test(t), um.length + '');
      ok('SAD-3 register states that automatic integration is not implemented', /Automatic Zoom integration — not implemented/.test(t));
      const b = $1('main [data-act="n4Set"]'), lid = b.dataset.l; click(b); const sel = $1('#n4-st'); sel.value = sel.value === 'Absent' ? 'Present' : 'Absent'; const want = sel.value; reason('Teacher confirmed');
      const a0 = aud(); go('a-attendance', { id: SID }); click($1('main [data-act="n4Import"]'));
      ok('SAD-3 a repeated simulated import keeps the manual entry', reg.rows[lid].src === 'manual' && reg.rows[lid].status === want && /manual kept/.test(ADMIN.audit[0].after) && aud() === a0 + 1, J(reg.rows[lid]));
      go('a-attendance', { id: SID }); ok('SAD-3 the manual row reads "Manual"', /<td class="small">Manual<\/td>/.test($1('main .n4-reg').innerHTML));
      go('a-attendance', { tab: 'thresholds' }); ok('SAD-3 Thresholds are read-only (no form, no Save)', !$1('main form[data-submit="thr"]') && /Read-only/.test(main()) && !/Save thresholds/.test(main()));
    });
    await T('SAD client legacy handlers refused for other roles', async () => {
      const bad = [];
      for (const p of ['fin', 'biz', 'iqa', 'coord1', 'teacher']) {
        pick(p); const a0 = aud(), u0 = J(ADMIN.unmatched), r0 = J(ADMIN.reg || {});
        ACT.adjAtt({ dataset: { s: 'ZS-01', k: '0' } }); const m1 = !!MODAL; closeModal(); ACT.umMatch({ dataset: { id: 'UM-1' } }); const m2 = !!MODAL; closeModal(); ACT.umDismiss({ dataset: { id: 'UM-1' } }); const m3 = !!MODAL; closeModal(); const x = SUBMIT.thr();
        const blk = ADMIN.audit.slice(0, aud() - a0).filter(a => /^Blocked: /.test(a.action)).length;
        if (m1 || m2 || m3 || x !== false || blk !== 4 || J(ADMIN.unmatched) !== u0 || J(ADMIN.reg || {}) !== r0) bad.push(p + ':' + J([m1, m2, m3, x, blk]));
      }
      ok('SAD-3 direct legacy register calls (adjust, match, dismiss, thresholds) are refused and logged for Finance, Business, IQA, Coordinator and Teacher', !bad.length, J(bad));
    });
    SS.setItem('ft-sa-d.keep', J({ CODE, AGC, SID }));
    signOutUI(); next(1); return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-sa-d.keep') || '{}');
    await T('SAD refresh', async () => {
      pick('super'); go('a-referrals'); const r = s5dRef(keep.CODE);
      ok('SAD after a real refresh: the code is kept and its count still equals the learner records', !!r && shownN('refs', keep.CODE) === recN(keep.CODE), J([!!r, shownN('refs', keep.CODE), recN(keep.CODE)]));
      ok('SAD after a real refresh: the explanation and definition are still shown', /How referral codes work/.test(main()) && main().includes(DEF));
    });
    await T('SAD Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); pick('super'); go('a-referrals');
      ok('SAD Reset: the generated codes are gone; the empty state and explanation return', !s5dRef(keep.CODE) && !s5dRef('SAD-AGY-1') && /No referral codes yet/.test(main()) && /How referral codes work/.test(main()));
      go('a-referrals', { tab: 'attribution' }); ok('SAD Reset: no attributed learner', /No learner has registered with a referral code yet/.test(main()));
    });

    /* ================= Legacy fixture ================= */
    await T('SAD legacy counts = learner records', async () => {
      fxLoadLegacy(); signOutUI(); SA(); go('a-referrals'); listAll('refs'); render();
      const codes = ADMIN.referrals.map(r => r.code), bad = codes.filter(c => shownN('refs', c) !== recN(c));
      ok('SAD-5 legacy: every code\'s Registrations equals its learner records (was seed numbers)', !bad.length && codes.length >= 10, J(bad.map(c => [c, shownN('refs', c), recN(c)])));
      ok('SAD-5 legacy: GCR-118 shows 1 (was 14), BRIGHT-2026 shows 0 (was 21)', shownN('refs', 'GCR-118') === 1 && shownN('refs', 'BRIGHT-2026') === 0, J([shownN('refs', 'GCR-118'), shownN('refs', 'BRIGHT-2026')]));
      ok('SAD-5 legacy: a code with an earlier demo figure but no learner stays locked and says why', s5dRefUsed(s5dRef('BRIGHT-2026')) && /locked by an earlier demo figure/.test($a('main tr').find(r => /BRIGHT-2026/.test(r.textContent)).textContent));
      ok('SAD-4 legacy: no "Copy link" anywhere on the codes list', !/Copy link/.test(main()) && $a('main [data-act="sadCopyCode"]').length === codes.length);
      const hb = []; codes.forEach(c => { ACT.s5dRefHist({ dataset: { c } }); const t = (($1('#modal-root .sad-hist-n') || {}).textContent || '').trim(), n = +t.split(' ')[0], names = t.includes(' · ') ? t.split(' · ')[1].replace(/\(counted.*$/, '').split(',').filter(x => x.trim()).length : 0; if (n !== recN(c) || names !== n) hb.push([c, t]); closeModal(); });
      ok('SAD-5 legacy History: "Registrations N" lists exactly N learners (was 7 listing 8)', !hb.length, J(hb));
    });
    await T('SAD legacy Attribution filter', async () => {
      go('a-referrals', { tab: 'attribution' }); listAll('attr'); render(); const rows = attrRows(), want = allLearners().filter(l => /\(code [A-Z0-9-]+\)/i.test(l.referral || '')).length;
      const agyMade = allLearners().filter(l => l.referral === 'Created by agency').length;
      ok('SAD-5 legacy Attribution lists only learners with a referral code — no "Created by agency" learner', rows.length === want && want > 0 && !rows.some(r => /Created by agency/.test(r)) && agyMade > 40, J([rows.length, want, agyMade]));
      role('bizA'); go('a-referrals', { tab: 'attribution' }); listAll('battr'); render(); const br = attrRows();
      ok('SAD-5 legacy Business Attribution: same learners; none created by an agency', br.length === want && !br.some(r => /Created by agency/.test(r)), J(br.length));
      go('b-reports', { tab: 'referrals' }); const bad = $a('main tbody tr').map(r => [r.children[0].textContent.trim(), +r.lastElementChild.textContent.trim()]).filter(([c, n]) => n !== recN(c));
      ok('SAD-5 legacy Business reports: counts equal learner records', !bad.length && $a('main tbody tr').length === ADMIN.referrals.length, J(bad));
    });
    await T('SAD legacy agency and learner copy', async () => {
      agyEnter('AG-02', true); go('g-profile'); const t = ($1('main .sad-ag-ref') || {}).textContent || '';
      ok('SAD-5 legacy agency card: count from records (CarePlus 0, was 7)', /CAREPLUS-26/.test(t) && /0 learners registered with this code/.test(t), t.replace(/\s+/g, ' ').slice(0, 200));
      COP.length = 0; click($1('main .sad-ag-ref [data-act="sadCopyCode"]')); await wait(5);
      ok('SAD-4 legacy agency Copy code copies CAREPLUS-26 (was a certificate-verification URL)', J(COP) === J(['CAREPLUS-26']) && !$1('main .sad-ag-ref [data-act="agCopyVerify"]'), J(COP));
      agyEnter('AG-03', true); go('g-profile'); ok('SAD-5 legacy Gulf Care card: 1 learner (was 14)', /1 learner registered with this code/.test(($1('main .sad-ag-ref') || {}).textContent || ''));
      signOutUI(); S.edge = 'none'; S.variant = 'F'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; go('profile', { tab: 'referral' });
      COP.length = 0; click($1('main [data-act="copyRef"]')); await wait(5);
      ok('SAD-4 Welfare Buddy profile: "Copy code" copies the code; the link is shown only as a placeholder example', J(COP) === J(['WB-FATIMA07']) && !$1('main #ref-link') && /placeholder, not live/.test(main()) && /WB-FATIMA07/.test(main()), J(COP));
    });
    await T('SAD legacy attendance: wording, handlers, thresholds', async () => {
      SA(); go('a-attendance'); const rr = ADMIN.sessions.filter(s => s.status === 'Report retrieved').length;
      ok('SAD-3 legacy sessions: "Report imported (simulated)", never "Report retrieved"; records unchanged', !/Report retrieved/.test(main()) && /Report imported \(simulated\)/.test(main()) && rr > 0);
      INP.dtF({ dataset: { t: 'zs', k: 's' }, value: 'Report imported (simulated)' }); ok('SAD-3 the relabelled status filter still finds those sessions', $a('main section.dt tbody tr').length === rr, $a('main section.dt tbody tr').length + ' / ' + rr); S.ui = {};
      role('staff'); go('t-sessions'); ok('SAD-3 Teacher sessions: no "Report retrieved"; notification renamed', !/Report retrieved/.test(main()) && !(STORE.tas.notifs || []).some(n => n.t === 'Zoom report retrieved') && (STORE.tas.notifs || []).some(n => n.t === 'Zoom report imported (simulated)'));
      SA(); go('a-attendance', { id: 'ZS-01' }); ok('SAD-3 legacy register: its times are labelled sample data, not from Zoom', /Legacy sample register/.test(main()) && /not retrieved from Zoom/.test(main()));
      const row = ADMIN.reg['ZS-01'][1], st0 = row[4], a0 = aud();
      ACT.adjAtt({ dataset: { s: 'ZS-01', k: '1' } }); const nop = reason('No change');
      ok('SAD-3 legacy Adjust refuses a change that changes nothing (no audit row)', nop === false && aud() === a0 && row[4] === st0); closeModal();
      ACT.adjAtt({ dataset: { s: 'ZS-01', k: '1' } }); $1('#aa').value = st0 === 'Absent' ? 'Present' : 'Absent'; const to = $1('#aa').value; reason('Teacher confirmed');
      ok('SAD-3 legacy Adjust: audited with the right before → after and reason', row[4] === to && ADMIN.audit[0].action === 'Attendance adjusted' && ADMIN.audit[0].before === st0 && ADMIN.audit[0].after === to && ADMIN.audit[0].reason === 'Teacher confirmed');
      const bad = [];
      for (const r of ['finA', 'bizA', 'iqaA', 'coord', 'staff']) {
        role(r); const b0 = aud(), r0 = row[4], n0 = ADMIN.unmatched.length, u = ADMIN.unmatched[0];
        ACT.adjAtt({ dataset: { s: 'ZS-01', k: '1' } }); const m1 = !!MODAL; if (MODAL) { $1('#aa').value = 'Late'; reason('x'); }
        ACT.umMatch({ dataset: { id: u.id } }); const m2 = !!MODAL; if (MODAL) reason('x'); ACT.umDismiss({ dataset: { id: u.id } }); const m3 = !!MODAL; if (MODAL) reason('x');
        document.body.insertAdjacentHTML('beforeend', '<input id="th-p" value="10">'); const x = SUBMIT.thr(); ($1('body > #th-p') || { remove() { } }).remove();
        const blk = ADMIN.audit.slice(0, aud() - b0); if (m1 || m2 || m3 || x !== false || row[4] !== r0 || ADMIN.unmatched.length !== n0 || blk.length !== 4 || !blk.every(a => /^Blocked: /.test(a.action))) bad.push(r + ':' + J([m1, m2, m3, x, blk.map(a => a.action)]));
      }
      ok('SAD-3 legacy handlers refuse Finance, Business, IQA, Coordinator and Teacher direct calls (nothing changes; each logged)', !bad.length, J(bad));
      SA(); go('a-attendance', { tab: 'unmatched' }); const u = ADMIN.unmatched[0], n0 = ADMIN.unmatched.length, a1 = aud();
      click($1(`main [data-act="umDismiss"][data-id="${u.id}"]`)); const e = reason('');
      ok('SAD-3 legacy Dismiss needs a reason (empty refused; nothing removed)', e === false && ADMIN.unmatched.length === n0 && aud() === a1); closeModal();
      click($1(`main [data-act="umDismiss"][data-id="${u.id}"]`)); reason('Guest speaker');
      ok('SAD-3 legacy Dismiss with a reason: removed and audited', ADMIN.unmatched.length === n0 - 1 && ADMIN.audit[0].action === 'Participant dismissed' && ADMIN.audit[0].before === u.name && ADMIN.audit[0].reason === 'Guest speaker');
      const a2 = aud(); ACT.umDismiss({ dataset: { id: u.id } }); ok('SAD-3 a replayed Dismiss changes nothing', !MODAL && aud() === a2 && ADMIN.unmatched.length === n0 - 1); closeModal();
      go('a-attendance', { tab: 'unmatched' }); const u2 = ADMIN.unmatched[0]; click($1(`main [data-act="umMatch"][data-id="${u2.id}"]`)); const pick2 = $1('#modal-root') && mtxt(); reason('Checked with the teacher');
      ok('SAD-3 legacy Match needs a reason and is audited', /How you verified it/.test(pick2) && ADMIN.audit[0].action === 'Participant matched' && ADMIN.audit[0].reason === 'Checked with the teacher' && !ADMIN.unmatched.includes(u2));
      go('a-attendance', { tab: 'thresholds' }); const a3 = aud(); const x = SUBMIT.thr();
      ok('SAD-3 legacy Thresholds: read-only; a Save call saves nothing and writes no "Updated" row', !$1('main form[data-submit="thr"]') && /Read-only/.test(main()) && x === false && aud() === a3 && !ADMIN.audit.some(a => a.entity === 'Thresholds' && a.action === 'Updated'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-sa-d.phase'); SS.removeItem('ft-sa-d.R'); SS.removeItem('ft-sa-d.keep');
})();
