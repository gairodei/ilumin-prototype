// SA-FINAL B — SA-09 data protection & archive, SA-10 integration settings. suites.sh runs it with FIXTURE=client.
// Phase 0: client demo (eligibility from records, handler refusals, audit "before", retention, export wording, integration edit,
// role matrix); phase 1: a real refresh (the edit persists), Reset demo (it is gone), then the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sab.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sab.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'SAB test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-sab.R', J(R)); SS.setItem('ft-sab.phase', String(ph)); location.reload(); };
  const sec = () => ADMIN.security.length, lastAud = () => ADMIN.audit[0] || {};
  let TOASTS = []; const _toast = toast; toast = function (m, t) { TOASTS.push(String(m)); return _toast.apply(this, arguments); };
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('a-dashboard'); };
  const ID = {
    super: () => AS('A'), sys: () => AS('SY'), fin: () => AS('FA'),
    aca: () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; },
    biz: () => { closeModal(); bizEnter('BA'); S.ui = {}; },
    coord: () => { closeModal(); S.coo.v = 'A'; cooEnter(); S.signedIn = true; S.ui = {}; },
  };
  const BAD = /GDPR|as required by|sent to your email|Encrypted ZIP|download link|test succeeded|revealed for 30 seconds/i;
  const SID = () => ((ADMIN.integrations.find(i => i.id === 'sms') || { fields: [] }).fields.find(f => f[0] === 'Sender ID') || [])[1];

  if (PH === 0) {
    const A = () => ADMIN.learners.find(l => /Amira/.test(l.name));
    await T('SAB-1 eligibility from records (client demo)', async () => {
      ID.super(); go('a-dataprotection', { tab: 'eligible' });
      const yes = dtCompute(DT.elig).rows.map(l => l.id), no = DT['elig-no'].rows;
      const am = no.find(l => l.id === A().id);
      ok('SAB-1 Amira Shah (Active NVQ enrolment) is not in the Eligible list', !yes.includes(A().id), J(yes));
      ok('SAB-1 …she is listed as Not eligible with the enrolment reason', !!am && /Enrolment not finished: .*\(Active\)/.test(am._e.why.join(' ')), am && J(am._e.why));
      ok('SAB-1 the rule is stated; no grace period applied; no fixed "12 months" eligibility text', /When a learner can be archived/.test(main()) && /No inactivity rule is applied/.test(main()) && !/no activity for 12 months/.test(main()));
      ok('SAB-1 purpose: Archive / Restricted access / Deletion explained', /Archive — the learner's record becomes read-only and is kept/.test(main()) && /Restricted access/.test(main()) && /Deletion — not available in this prototype/.test(main()));
    });
    await T('SAB-2 archive of an active learner refused in the handler', async () => {
      ID.super(); go('a-dataprotection', { tab: 'eligible' }); const L = A(), s0 = sec();
      dts('elig').sel = [L.id]; ACT.dtBulk({ dataset: { t: 'elig', i: '0' } });
      ok('SAB-2 bulk "Archive selected" with Amira forced into the selection: no dialog, still Active, refusal audited', !MODAL && L.rec === 'Active' && lastAud().action === 'Archive refused: not eligible' && lastAud().entity === L.id, J([!!MODAL, L.rec, lastAud().action]));
      ACT.saArchive({ dataset: { ids: L.id } }); ok('SAB-2 direct saArchive: refused, still Active', !MODAL && L.rec === 'Active');
      TOASTS = []; ACT.lAct({ dataset: { id: L.id, a: 'archive' } }); ok('SAB-2 direct lAct archive (single): refused with the reason, still Active', !MODAL && L.rec === 'Active' && /Not archived: Enrolment not finished/.test(TOASTS.join('|')), TOASTS.join('|'));
      ok('SAB-2 a state refusal is not a security event', sec() === s0);
      go('a-learner', { id: L.id }); const b = $a('main button').find(x => /Archive record/.test(x.textContent));
      ok('SAB-2 Learner 360: Archive record disabled with the reason', !!b && b.disabled && /Not eligible for archiving: Enrolment not finished/.test(main()));
    });
    await T('SAB-3 an eligible learner is archived; audit before/after correct', async () => {
      ID.super(); const row = { id: 'IA-L-39901', name: 'Sab Eligible (test)', email: 'sab.eligible@uk.example', mobile: '+44 7700 900999', agency: null, courses: [], acct: 'Active', rec: 'Active', region: 'UK', last: D(-500, '10:00'), flags: [], country: 'United Kingdom', joined: fd(D(-600)), referral: 'Self-registration', cur: 'GBP' };
      ADMIN.learners.push(row); go('a-dataprotection', { tab: 'eligible' });
      ok('SAB-3 a learner with no enrolment, balance or open process is Eligible', dtCompute(DT.elig).rows.some(l => l.id === row.id));
      const cb = $1(`main input[type=checkbox][value="${row.id}"]`) || $a('main tbody input[type=checkbox]').find(c => c.closest('tr') && c.closest('tr').textContent.includes(row.id));
      if (cb) click(cb); else dts('elig').sel = [row.id];
      ACT.dtBulk({ dataset: { t: 'elig', i: '0' } }); ok('SAB-3 Archive selected opens the dialog with the purpose text', !!MODAL && /Nothing is deleted, and it can be restored/.test(mtxt()));
      reason('Course long finished'); const a = ADMIN.audit.find(x => x.entity === row.id && x.action === 'Archive record');
      ok('SAB-3 archived; audit Active → Archived', row.rec === 'Archived' && a && a.before === 'Active' && a.after === 'Archived', J(a));
      ACT.saArchive({ dataset: { ids: row.id } }); ok('SAB-3 a second archive (replay) is refused', !MODAL && lastAud().action === 'Archive refused: not eligible');
      go('f-learners'); const tr = $a('main tr').find(r => r.textContent.includes(row.id));
      ok('SAB-3 Finance learner list marks the archived learner', !!tr && /Archived/.test(tr.textContent), tr && tr.textContent.replace(/\s+/g, ' '));
      go('f-learner', { id: row.id }); ok('SAB-3 Finance learner record: archived note', /Archived record\./.test(main()));
      ACT.lAct({ dataset: { id: row.id, a: 'restore' } }); reason('Restore test'); const r2 = ADMIN.audit.find(x => x.entity === row.id && x.action === 'Restore to Active');
      ok('SAB-3 #17 restore: audit before Archived → Active', row.rec === 'Active' && r2 && r2.before === 'Archived' && r2.after === 'Active', J(r2));
      const tom = ADMIN.learners.find(l => /Tom Transfer/.test(l.name));
      ACT.lAct({ dataset: { id: tom.id, a: 'deactivate' } }); reason('Deactivate test'); const d1 = ADMIN.audit.find(x => x.entity === tom.id && x.action === 'Deactivate account');
      ok('SAB-3 #17 deactivate: audit before Active → Deactivated', tom.acct === 'Deactivated' && d1 && d1.before === 'Active' && d1.after === 'Deactivated', J(d1));
      ACT.lAct({ dataset: { id: tom.id, a: 'reactivate' } }); reason('Reactivate test'); const d2 = ADMIN.audit.find(x => x.entity === tom.id && x.action === 'Reactivate account');
      ok('SAB-3 #17 reactivate: audit before Deactivated → Active', tom.acct === 'Active' && d2 && d2.before === 'Deactivated' && d2.after === 'Active', J(d2));
      ACT.lAct({ dataset: { id: row.id, a: 'archive' } }); ok('SAB-3 single archive of an eligible learner opens the dialog', !!MODAL); reason('Archive again');
      const a3 = ADMIN.audit.find(x => x.entity === row.id && x.action === 'Archive record'); ok('SAB-3 single archive: audit Active → Archived', row.rec === 'Archived' && a3.before === 'Active', J(a3));
    });
    await T('SAB-4 retention and wording', async () => {
      ID.super(); go('a-dataprotection', { tab: 'retention' });
      ok('SAB-4 retention: "Not enforced", read-only, no Save', /Not enforced/.test(main()) && !$1('main input') && !$1('main [data-act="cfgSaved"]') && /placeholder/i.test(main()));
      const a0 = ADMIN.audit.length; TOASTS = []; ACT.cfgSaved(); ok('SAB-4 #11 a direct Save writes no false "saved"', ADMIN.audit.length === a0 && /Nothing was saved/.test(TOASTS.join('|')), TOASTS.join('|'));
      let all = ''; ['archived', 'eligible', 'dsr', 'retention', 'residency'].forEach(t => { go('a-dataprotection', { tab: t }); all += main(); }); go('a-integrations'); all += main(); go('a-learners'); all += main();
      ok('SAB-4 no compliance / emailed / revealed claims on Data Protection, Integrations or Learners', !BAD.test(all), (all.match(BAD) || [])[0]);
      go('a-dataprotection', { tab: 'residency' }); ok('SAB-4 residency stated as a production requirement not implemented', /production hosting requirement, not implemented in this prototype/.test(main()) && /stored in the UAE/.test(main()));
    });
    await T('SAB-5 data request export is a simulated record (#18)', async () => {
      ID.super(); go('a-dataprotection', { tab: 'dsr' }); click($1('main [data-act="logDsr"]'));
      const L = ADMIN.learners.find(l => /Lena/.test(l.name)), q = $1('#ds-q'); q.value = L.id; INP.dsrFind(q); $1('#modal-root input[name="ds-pick"]').checked = true; $1('#ds-t').value = 'Access'; $1('#ds-n').value = 'SAB'; press();
      const d = ADMIN.dsr[0]; go('a-dataprotection', { tab: 'dsr' }); TOASTS = [];
      click($1(`main [data-act="dsrExport"][data-id="${d.id}"]`));
      ok('SAB-5 export: simulated record, audit says no file', !!d.exported && lastAud().action === 'Data export recorded (simulated)' && /no file generated/.test(lastAud().after) && /simulated export record was created/.test(TOASTS.join('|')), J(lastAud()));
      const a0 = ADMIN.audit.length; ACT.dsrExport({ dataset: { id: d.id } }); ok('SAB-5 replay: no second export record', ADMIN.audit.length === a0);
      go('a-dataprotection', { tab: 'dsr' }); click($1(`main [data-act="dsrDone"][data-id="${d.id}"]`)); reason('Done');
      ok('SAB-5 completed: outcome says simulated, not "sent"', d.status === 'Completed' && /Simulated export record/.test(d.decision) && !/sent$/.test(d.decision), d.decision);
    });
    await T('SAB-6 integrations: edit, secrets, simulated test, history', async () => {
      ID.super(); go('a-integrations');
      ok('SAB-6 secrets shown only as "Set on the server in production"; no masked values', /Set on the server in production/.test(main()) && !/••••|sk_live|whsec|pk_live/.test(main()));
      ok('SAB-6 "Simulated test" (no "Send test"); Edit offered on SMS and Email only', /Simulated test/.test(main()) && !/Send test/.test(main()) && J($a('main [data-act="saIntEdit"]').map(b => b.dataset.id)) === J(['email', 'sms']));
      click($1('main [data-act="saIntEdit"][data-id="sms"]')); ok('SAB-6 edit dialog: Sender ID only; API key not editable', !!$1('#sab-f0') && !$1('#sab-f1') && /API key: set on the server in production/.test(mtxt()));
      $1('#sab-f0').value = 'bad id!'; const bad = reason('x'); ok('SAB-6 invalid Sender ID refused', bad === false && SID() === 'ILLUMIN'); closeModal();
      click($1('main [data-act="saIntEdit"][data-id="sms"]')); $1('#sab-f0').value = 'ILMDEMO'; reason('Client asked');
      ok('SAB-6 Sender ID saved and audited (before → after)', SID() === 'ILMDEMO' && lastAud().action === 'Setting changed' && lastAud().before === 'ILLUMIN' && lastAud().after === 'ILMDEMO' && lastAud().entity === 'SMS — Sender ID', J(lastAud()));
      const a0 = ADMIN.audit.length; click($1('main [data-act="saIntEdit"][data-id="sms"]')); reason('Same'); ok('SAB-6 saving unchanged values records nothing', ADMIN.audit.length === a0);
      TOASTS = []; click($1('main [data-act="intTest"][data-id="sms"]')); ok('SAB-6 simulated test says nothing was sent', /no message was sent/.test(TOASTS.join('|')) && lastAud().action === 'Simulated test (nothing sent)', TOASTS.join('|'));
      click($1('main [data-act="intReveal"][data-id="sms"]')); ok('SAB-6 Reveal: honest dialog', /Reveal credentials/.test(MODAL.title) && /Nothing can be revealed/.test(mtxt())); reason('Check'); ok('SAB-6 reveal request logged as nothing revealed', /nothing revealed/.test(lastAud().action));
      click($1('main [data-act="intHist"][data-id="sms"]')); ok('SAB-6 change history from the audit (no hard-coded lines)', /Setting changed/.test(mtxt()) && /ILMDEMO/.test(mtxt()) && !/Rotated secret key/.test(mtxt()), mtxt().slice(0, 200)); closeModal();
      ID.sys(); go('a-integrations'); click($1('main [data-act="saIntEdit"][data-id="email"]')); ok('SAB-6 System Administrator can edit too', !!MODAL); closeModal();
      render(); const raw = localStorage.getItem('illumin-demo:client-state') || '';
      ok('SAB-6 the saved demo copy has the edit but no credential values', raw.includes('ILMDEMO') && !/9WqE|Zt21|a8Lm|4Qx9|k3P0|Hn2|7Qa|sk_live|whsec|pk_live/.test(raw), raw.length);
      const enc = JSON.stringify(fcpEncode({ ADMIN: { x: { apiKey: 'A1', accessToken: 'B2', clientSecret: 'C3', token: 'wp', webhookSecret: 'D4' } } }));
      ok('SAB-6 snapshot filter drops key/token/secret-like fields (workplace link token kept)', !/A1|B2|C3|D4/.test(enc) && /wp/.test(enc), enc);
    });
    await T('SAB-7 unauthorised direct calls refused and logged', async () => {
      const L = ADMIN.learners.find(l => /Dev Patel/.test(l.name)), res = {};
      const calls = { saArchive: () => ACT.saArchive({ dataset: { ids: L.id } }), lActArchive: () => ACT.lAct({ dataset: { id: L.id, a: 'archive' } }), cfgSaved: () => ACT.cfgSaved(), logDsr: () => ACT.logDsr(), intTest: () => ACT.intTest({ dataset: { id: 'sms' } }), saIntEdit: () => ACT.saIntEdit({ dataset: { id: 'sms' } }), intHist: () => ACT.intHist({ dataset: { id: 'sms' } }), intReveal: () => ACT.intReveal({ dataset: { id: 'sms' } }), dsrExport: () => ACT.dsrExport({ dataset: { id: ADMIN.dsr[0] && ADMIN.dsr[0].id } }) };
      ['fin', 'aca', 'biz', 'coord'].forEach(p => Object.entries(calls).forEach(([k, f]) => {
        if (p === 'aca' && k === 'logDsr') return; // Academic Admins log data requests
        ID[p](); const s0 = sec(), sid = SID(), rec = L.rec; let m = false, err = ''; try { f(); m = !!MODAL; } catch (e) { err = e.message; } closeModal();
        res[p + ':' + k] = !m && !err && sec() > s0 && SID() === sid && L.rec === rec ? 'denied' : `LEAK(${m ? 'dialog ' : ''}${err}${sec() > s0 ? '' : 'unlogged'})`;
      }));
      const bad = Object.entries(res).filter(([, v]) => v !== 'denied'); ok('SAB-7 Finance, Academic, Business Admin and Coordinator: every SA-09/SA-10 handler refused before a dialog, nothing changed, logged', !bad.length, J(bad.length ? bad : Object.keys(res).length));
      ID.aca(); ACT.logDsr(); ok('SAB-7 Academic Admin may still log a data request', !!MODAL); closeModal();
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('SAB-8 refresh keeps the edit; Reset demo removes it', async () => {
      ok('SAB-8 after a real refresh the Sender ID is still ILMDEMO', SID() === 'ILMDEMO', SID());
      ok('SAB-8 …and the archived test learner is still archived', (ADMIN.learners.find(l => l.id === 'IA-L-39901') || {}).rec === 'Archived');
      AS('A'); go('a-integrations'); ok('SAB-8 secrets still shown only as server-set after restore', /Set on the server in production/.test(main()) && !/••••/.test(main()));
      ACT.resetDemo(); ok('SAB-8 Reset demo: Sender ID back to ILLUMIN, test learner gone', SID() === 'ILLUMIN' && !ADMIN.learners.some(l => l.id === 'IA-L-39901'), SID());
    });
    await T('SAB-9 legacy fixture', async () => {
      fxLoadLegacy(); AS('A'); go('a-dataprotection', { tab: 'eligible' });
      const yes = dtCompute(DT.elig).rows, no = DT['elig-no'].rows, wA = STORE.worlds.A.me.id;
      const nA = no.find(l => l.id === wA), adm = no.find(l => !l.v && l.courses.length);
      ok('SAB-9 a seeded learner with active enrolments is Not eligible', !!nA && /Enrolment not finished/.test(nA._e.why.join(' ')), nA && J(nA._e.why));
      ok('SAB-9 an admin-only row (course names, no statuses) fails closed with the reason', !!adm && /isn't recorded/.test(adm._e.why.join(' ')), adm && J(adm._e.why));
      ok('SAB-9 none of the old index-picked rows (e.g. Harry Walsh) is offered', !yes.some(l => /Harry Walsh|Ruby Clarke/.test(l.name)), J(yes.map(l => l.name)));
      const L = learnerById(wA); ACT.lAct({ dataset: { id: wA, a: 'archive' } }); ok('SAB-9 direct archive of a seeded active learner refused', !MODAL && learnerById(wA).rec === 'Active');
      go('a-dataprotection', { tab: 'dsr' }); click($1('main [data-act="logDsr"]')); const q = $1('#ds-q'); q.value = wA; INP.dsrFind(q); $1(`#modal-root input[name="ds-pick"][value="${wA}"]`).checked = true; $1('#ds-t').value = 'Access'; $1('#ds-n').value = 'SAB'; press();
      const d = ADMIN.dsr[0]; ACT.dsrExport({ dataset: { id: d.id } }); ACT.dsrDone({ dataset: { id: d.id } }); reason('Done');
      const n = STORE.worlds[L.v].notifs[0];
      ok('SAB-9 the learner is told a simulated export record was created, not that it was emailed', n && /simulated export record/.test(n.body) && !/sent to your email/.test(n.body), n && n.body);
      go('a-integrations'); TOASTS = []; click($1('main [data-act="intTest"][data-id="sms"]'));
      ok('SAB-9 legacy failing SMS: simulated test, nothing sent', /no message was sent/.test(TOASTS.join('|')) && /Failing/.test(TOASTS.join('|')));
      ok('SAB-9 no compliance claims (legacy)', !BAD.test(main()));
    });
  }

  toast = _toast;
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-sab.phase'); SS.removeItem('ft-sab.R');
})();
