// CBR correction batch 3 on the client demo (suites.sh runs it with FIXTURE=client; real reloads of the saved demo).
// Phase 0: the published demo programme has no Display Duration — its learners see the payment schedule duration, as before; a new version
// records one; learners' pinned plans and signed letters are untouched. Phase 1 (refresh): kept, no saved-data upgrade needed (no new
// store), Browse still shows the published version's; Reset demo. Phase 2 (refresh): the starting demo.
(async function () {
  const SS = window.sessionStorage, K = 'ft-cbc3c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const P = () => cdPr(), cat = () => CATALOGUE.find(c => c.kind === 'nvq' && c.title === P().title);
  const pins = () => J({ w: Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, w.signup && w.signup.pin || null, (w.plans || []).map(p => p.rows.map(r => [r.due, r.amount, r.status]))]; }), sig: J(STORE.chSig || {}), dur: J(P().durV) }).replace(/:\d\d\.\d{3}Z/g, 'Z'); // to the minute: rebuilding the demo stamps the same records a few ms apart

  if (PH === 0) {
    await T('CBC3C-0', async () => {
      SA(); const v1 = P().version;
      ok('CBC3C setup: the published demo programme was created with its Display Duration (12 months — CBC4: required to publish a new programme)', J(cbcDisp(P(), v1)) === J({ n: 12, unit: 'months' }), J(cbcDisp(P(), v1)));
      go('a-programmes', { id: P().id, tab: 'details' });
      ok('CBC3C-1 its details show the duration — "Course Duration" (FB2, PD-FB2-01: the demo course is created through the new-course page; was "Display Duration") — no fallback note, and Browse shows it', /Course Duration\s*12 months/.test(q('.cbr2-view').textContent) && !/from the Payment Schedule Duration/.test(q('.cbr2-view').textContent) && /12 months/.test(catCard(cat())));
      const p0 = pins(); SS.setItem(K + 'pins', p0); SS.setItem(K + 'card', catCard(cat()));
      ACT.s3WizVersion({ dataset: { id: P().id } }); const t = $1('#rsn'); if (t) { t.value = 'CBC3C v2'; click($a('#modal-root [data-mi]').find(x => /btn-primary|btn-danger/.test(x.className))); }
      go('a-programmes', { id: P().id, tab: 'details' }); click(q('[data-act="cbrDisp"]')); $1('#cd-n').value = '9'; $1('#cd-u').value = 'months'; click($a('#modal-root [data-mi]').find(b => /^Save$/.test(b.textContent.trim())));
      ok('CBC3C-2 the new version records its Display Duration (9 months)', J(cbcDisp(P(), v1 + 1)) === J({ n: 9, unit: 'months' }));
      ok('CBC3C-3 learners\' pinned plans, schedules, signed letters and the payment schedule duration are unchanged', pins() === p0);
      SS.setItem(K + 'sig', FCP.sig); fcpSave();
    });
    return next(1);
  }
  if (PH === 1) {
    await T('CBC3C-1 refresh', async () => {
      SA(); const v1 = P().version;
      ok('CBC3C-4 after a refresh the draft version\'s Display Duration is kept; the saved demo needed no upgrade (same store signature)', J(cbcDisp(P(), v1 + 1)) === J({ n: 9, unit: 'months' }) && !!FCP.restored && !FCP.upgraded && FCP.sig === SS.getItem(K + 'sig'));
      ok('CBC3C-5 Browse still shows the published version\'s duration; learners\' records unchanged', catCard(cat()) === SS.getItem(K + 'card') && pins() === SS.getItem(K + 'pins'));
      ACT.resetDemo(); closeModal();
      ok('CBC3C-6 Reset demo: no draft version, no draft Display Duration record', !n5DraftV(P()) && !((CBR().cfg[P().id] || {})[P().version + 1]));
    });
    return next(2);
  }
  if (PH === 2) {
    await T('CBC3C-2 after Reset and a refresh', async () => {
      SA(); ok('CBC3C-7 the starting demo: the published programme with its own Display Duration, no draft, learners\' records as at the start', J(cbcDisp(P(), P().version)) === J({ n: 12, unit: 'months' }) && !n5DraftV(P()) && pins() === SS.getItem(K + 'pins'), (() => { const a = JSON.parse(pins()), b = JSON.parse(SS.getItem(K + 'pins')); return ['sig', 'dur'].filter(k => a[k] !== b[k]).concat(a.w.map((x, i) => J(x) === J(b.w[i]) ? '' : x[0] + ':' + J(x).slice(0, 160) + ' VS ' + J(b.w[i]).slice(0, 160)).filter(Boolean)).join(' || ').slice(0, 900); })());
    });
    [K + 'phase', K + 'R', K + 'pins', K + 'card', K + 'sig'].forEach(k => SS.removeItem(k));
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
