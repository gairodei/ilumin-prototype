// FB2 — Payment schedules from the course duration, on the client demo (suites.sh runs it with FIXTURE=client; a real reload, then Reset).
// The demo programme is built through the real new-course page, so it is an FB2 programme: its payment basis is its Course Duration
// (12 months — the same value it had as a separate Payment Schedule Duration, so every financial record is as before). A new version
// with another Course Duration withdraws the approval for that version only, survives a reload, and Reset brings back the demo exactly.
(async function () {
  const SS = window.sessionStorage, K = 'ft-fb2c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const P = () => cdPr(), id = () => cdPr().id, M12 = J({ n: 12, unit: 'months' }), M9 = J({ n: 9, unit: 'months' });
  // every learner's agreed terms: pinned schedule, payment rows, signed letter and terms (to the minute: a rebuild stamps a few ms apart)
  const pins = () => J(Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, (w.signup && w.signup.pin) || null, (w.plans || []).map(p => p.rows.map(r => [r.due, r.amount, r.status])), (w.signup && w.signup.sig) || null, (w.signup && w.signup.plan) || null]; })).replace(/:\d\d\.\d{3}Z/g, 'Z');
  const plans = () => J(s4Plans(id()).map(p => [p.v, p.pkg ? p.pkg.dur : null, p.pkg ? p.pkg.opts.map(o => [o.id, o.fee, o.pay.map(x => x.pence)]) : null]));

  if (PH === 0) {
    await T('FB2C-1 the demo', async () => {
      SA(); const pr = P(), v1 = pr.version;
      ok('FB2C-1 the demo programme was created through the new-course page as an FB2 programme: Course Duration 12 months is its payment basis', pr.fb2 === true && J(cbcDisp(pr, v1)) === M12 && J(pr.durV) === M12 && J(cbFpLive(pr).dur) === M12 && J(cb8Cur(id()).dur) === M12);
      const pinned = Object.values(STORE.worlds).filter(w => w.signup && w.signup.pin && w.signup.pin.pid === id());
      ok('FB2C-2 its learners\' schedules are 12-month schedules from their batch start, each total equal to their fee', pinned.length >= 4 && pinned.every(w => J(w.signup.pin.dur) === M12 && w.signup.pin.rows.reduce((a, r) => a + r.pence, 0) === Math.round(w.signup.pin.fee * 100)), J(pinned.map(w => [w.me.first, w.signup.pin.k, w.signup.pin.fee])));
      go('a-programmes', { id: id(), tab: 'details' });
      ok('FB2C-3 Course Details (published) reads "Course Duration 12 months"; Fees & Payment Plans shows it read-only with no Payment Schedule Duration', /Course Duration\s*12 months/.test(q('.cbr2-view').textContent) && (go('a-programmes', { id: id(), tab: 'payments' }), /Course Duration\s*12 months/.test(q('.fb2-cdur').textContent) && !q('#cbc3-pd-n') && !/Payment Schedule Duration/.test(q('.cbr2-fees').textContent)));
      ok('FB2C-4 each instalment option says how it divides the course duration', $a('main .fb2-pv').length > 0 && $a('main .fb2-pv').every(x => /^12 months ÷ \d+ = /.test(x.textContent)), J($a('main .fb2-pv').map(x => x.textContent)));
      const p0 = pins(), pl0 = plans(); SS.setItem(K + 'pins', p0); SS.setItem(K + 'plans', pl0); SS.setItem(K + 'wf', cb8Wf(pr).status);
      // a new version with a 9-month Course Duration
      ACT.s3WizVersion({ dataset: { id: id() } }); const t = $1('#rsn'); if (t) { t.value = 'FB2C v2'; click($a('#modal-root [data-mi]').find(x => /btn-primary|btn-danger/.test(x.className)), 'confirm'); }
      // N5a: the new version answers "Observation required" first (Yes, as Version 1); until then no basis is decided (cb-finpub) and publishing is blocked
      const wf0 = cb8Wf(P()).status; cbObsSet(P(), true, 'Version ' + (v1 + 1) + ' (draft) — FB2C test'); const wf1 = cb8Wf(P()).status; SS.setItem(K + 'wfobs', wf1);
      ok('FB2C-4b (setup) Version ' + (v1 + 1) + ' answers Yes', cb8Basis(P()).req === true, J([wf0, wf1]));
      go('a-programmes', { id: id(), tab: 'details' }); click(q('[data-act="cbrDisp"]'), 'Edit Course Duration'); $1('#cd-n').value = '9'; $1('#cd-u').value = 'months'; click($a('#modal-root [data-mi]').find(b => /^Save$/.test(b.textContent.trim())), 'Save');
      ok('FB2C-5 Version ' + (v1 + 1) + ' records 9 months; its payment terms need Finance approval again; the version in force keeps 12 months', J(cbcDisp(P(), v1 + 1)) === M9 && J(cb8Basis(P()).dur) === M9 && cb8Wf(P()).status === 'Draft' && J(P().durV) === M12 && J(cbFpLive(P()).dur) === M12 && plans() === pl0);
      ok('FB2C-6 learners\' schedules, rows, letters and terms are unchanged', pins() === p0);
      SS.setItem(K + 'sig', FCP.sig); fcpSave();
    });
    return next(1);
  }
  if (PH === 1) {
    await T('FB2C-7 after a reload', async () => {
      SA(); const v1 = P().version;
      ok('FB2C-7 after a reload: still an FB2 programme; Version ' + (v1 + 1) + '\'s 9 months and the withdrawn approval are kept; the saved demo needed no upgrade', P().fb2 === true && J(cbcDisp(P(), v1 + 1)) === M9 && J(cb8Basis(P()).dur) === M9 && cb8Wf(P()).status === 'Draft' && !!FCP.restored && !FCP.upgraded && FCP.sig === SS.getItem(K + 'sig'));
      ok('FB2C-8 …the plans in force and every learner\'s terms are unchanged', plans() === SS.getItem(K + 'plans') && pins() === SS.getItem(K + 'pins'));
      go('a-programmes', { id: id(), tab: 'payments' });
      ok('FB2C-9 Fees & Payment Plans works on the draft version: Course Duration 9 months, each option divides 9 months', /Course Duration\s*9 months/.test(q('.fb2-cdur').textContent) && $a('main .fb2-pv').length > 0 && $a('main .fb2-pv').every(x => /^9 months ÷ \d+ = /.test(x.textContent)), J($a('main .fb2-pv').map(x => x.textContent)));
      ACT.ch8Publish({ dataset: { id: id() } }); const why = ($1('#modal-root') || {}).textContent || ''; closeModal();
      ok('FB2C-10 Version ' + (v1 + 1) + ' can\'t be published before Finance approves its terms', P().version === v1 && /Finance approval is needed first/.test(why), why.slice(0, 160));
      ACT.resetDemo(); closeModal();
      ok('FB2C-11 Reset demo: no draft version, 12 months in force, approved terms, learners\' records as before', !n5DraftV(P()) && J(P().durV) === M12 && J(cb8Basis(P()).dur) === M12 && cb8Wf(P()).status === SS.getItem(K + 'wf') && plans() === SS.getItem(K + 'plans') && pins() === SS.getItem(K + 'pins'));
    });
    [K + 'phase', K + 'R', K + 'pins', K + 'plans', K + 'wf', K + 'sig'].forEach(k => SS.removeItem(k));
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
