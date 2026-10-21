/* ============================================================
   CB6 — Section 4 Observations: observation events (21 Oct 2026; PD-CB-40…43 in PROVISIONAL-DECISIONS.md).
   Each programme version's N5a observation configuration gets its required observation events: name, where it may happen
   (workplace / Academy office — only the locations the version permits), the criteria it covers (the version's NVQ observation
   criteria and its own Academy criteria) and the evidence an assessor may record. The number of events is the number required.
   Events are stored in the N5a configuration (no new store), edited only in a draft through N5a's gate and audit, published and
   frozen with it; published versions and learners' observation records are never changed. Coverage problems join N5a's
   publishing checks. Hidden (not applicable) when Course Details says the course has no observations. No observation fees (CB8).
   Loads last.
   ============================================================ */
'use strict';

const cbEvOf = d => (d && Array.isArray(d.events) ? d.events : []);
// For later stages: the events of a programme version's published configuration (none when none were recorded)
const cbObsEventsFor = (pid, v) => cbEvOf(n5ConfigFor(pid, v));
const CB_LOC = [['workplace', 'Workplace'], ['office', 'Academy office']];
const cbLocOk = (d, k) => (k === 'workplace' ? d.workplace === 'Permitted' : k === 'office' ? d.office === 'Available' : false);
const cbLocTxt = l => (l || []).map(k => (CB_LOC.find(x => x[0] === k) || [k, k])[1]).join(', ') || 'none';
const cbEvTxt = e => `${e.name} · ${cbLocTxt(e.loc)} · ${plural(e.crit.length, 'criterion', 'criteria')} · evidence ${n5EvTxt({ types: e.ev })}`;

/* ---------- Problems with a configuration's events (only a draft is checked; published ones never are) ---------- */
function cbEvProblems(pr, d) {
  const block = [], warn = [], evs = cbEvOf(d); if (!d || d.state !== 'Draft') return { block, warn };
  if (d.required === false) { if (evs.length) warn.push(`Observations: ${plural(evs.length, 'observation event is', 'observation events are')} kept in this version for history but not used while observation isn't required`); return { block, warn }; }
  if (d.required !== true) return { block, warn };
  const nvq = n5NvqOk(pr, d).map(c => c.code), iaOn = d.ia.filter(c => c.status === 'Active').map(c => c.code), ok = new Set(nvq.concat(iaOn));
  if (!evs.length) { block.push('Observations: add at least one observation event (how many observations, what each covers, where and with which evidence)'); return { block, warn }; }
  const un = nvq.filter(c => !evs.some(e => e.crit.includes(c))); if (un.length) block.push(`Observations: ${plural(un.length, 'NVQ observation criterion isn\'t', 'NVQ observation criteria aren\'t')} covered by any observation event: ${un.slice(0, 6).join(', ')}${un.length > 6 ? '…' : ''}`);
  evs.forEach(e => {
    const st = e.crit.filter(c => !ok.has(c)); if (st.length) block.push(`Observations: event "${e.name}" covers criteria that aren't active in this version: ${st.join(', ')}`);
    const bad = (e.loc || []).filter(k => !cbLocOk(d, k)); if (bad.length) block.push(`Observations: event "${e.name}" uses a location this version doesn't permit: ${cbLocTxt(bad)}`);
    if (!(e.loc || []).length) block.push(`Observations: event "${e.name}" has no location`);
    if (!(e.ev || []).length) block.push(`Observations: event "${e.name}" has no permitted evidence`);
    if (!(e.loc || []).includes('workplace') && e.crit.some(c => iaOn.includes(c))) block.push(`Observations: event "${e.name}" covers Academy criteria but isn't a workplace observation (Academy criteria are used on workplace observations only)`);
  });
  const unIa = iaOn.filter(c => !evs.some(e => e.crit.includes(c))); if (unIa.length) warn.push(`Observations: ${plural(unIa.length, 'Academy criterion isn\'t', 'Academy criteria aren\'t')} in any observation event: ${unIa.join(', ')}`);
  return { block, warn };
}
const _checkCB6 = n5Check;
n5Check = function (pr) { const r = _checkCB6.apply(this, arguments), d = pr && n5DraftV(pr) ? n5Draft(pr) : null; if (!d) return r; const p = cbEvProblems(pr, d); r.block.push(...p.block); r.warn.push(...p.warn); return r; };

/* ---------- Actions: add / edit, reorder, remove (draft only, N5a's gate: role + draft) ---------- */
ACT.cbObsEv = el => {
  const g = n5Gate(el, el.dataset.e ? 'change an observation event' : 'add an observation event'); if (!g) return; const { pr, d } = g;
  if (d.required === false) { n5Log(pr, 'Blocked: observation event (observation not required)', `Version ${d.v}`, '—', 'Course Details: no observations'); toast('This course has no observations (Course Details), so no observation events are set.', 'err'); return; }
  if (!Array.isArray(d.events)) d.events = []; const evs = d.events, e = el.dataset.e ? evs.find(x => x.id === el.dataset.e) : null; if (el.dataset.e && !e) { toast('Event not found in this version.', 'err'); return; }
  const nvq = n5NvqOk(pr, d), ia = d.ia.filter(c => c.status === 'Active'), cur = e || { name: `Observation ${evs.length + 1}`, loc: CB_LOC.map(x => x[0]).filter(k => cbLocOk(d, k)), crit: [], ev: ['notes'] };
  const cb = (cls, v, on, lab, dis) => `<label class="check"><input type="checkbox" class="${cls}" value="${esc(v)}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${lab}</span></label>`;
  openModal({ title: (e ? 'Edit observation event' : 'Add observation event') + ' — Version ' + d.v, size: 'lg', body: `<p class="small muted">Saved in Version ${d.v} (draft) and published with it. Learners on earlier versions keep theirs.</p>
    <div class="field"><label for="ev-n">Name</label><input class="input" id="ev-n" value="${esc(cur.name)}" placeholder="e.g. Observation 1 — personal care"></div>
    <fieldset class="field n5-fs"><legend class="lbl">Where it may happen</legend>${CB_LOC.map(([k, l]) => cb('ev-l', k, (cur.loc || []).includes(k) && cbLocOk(d, k), `${l}${cbLocOk(d, k) ? '' : ' <span class="xs muted">— not permitted in this version (Observation settings)</span>'}`, !cbLocOk(d, k))).join('')}</fieldset>
    <fieldset class="field n5-fs"><legend class="lbl">NVQ observation criteria it covers</legend>${nvq.length ? `<div class="n5-maps">${nvq.map(c => cb('ev-c', c.code, cur.crit.includes(c.code), `<span class="code">${esc(c.code)}</span> ${esc(c.d)}`)).join('')}</div>` : '<p class="small muted">This version has no active NVQ observation criteria — give a Learning Outcome the Observation type in Section 2 — Curriculum.</p>'}</fieldset>
    ${ia.length ? `<fieldset class="field n5-fs"><legend class="lbl">Academy criteria it covers (workplace observations only)</legend><div class="n5-maps">${ia.map(c => cb('ev-c', c.code, cur.crit.includes(c.code), `<span class="code">${esc(c.code)}</span> ${esc(c.title)}`)).join('')}</div></fieldset>` : ''}
    <fieldset class="field n5-fs"><legend class="lbl">Evidence the assessor may record</legend><div class="n5-evs">${N5_EV.map(([k, l]) => cb('ev-e', k, (cur.ev || []).includes(k), l)).join('')}</div></fieldset>`,
    actions: [{ label: 'Cancel' }, { label: e ? 'Save event' : 'Add event', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return n5Lost(g);
      const pick = c => $$('#modal-root .' + c + ':checked').map(x => x.value), nx = { name: mval('#ev-n'), loc: pick('ev-l'), crit: pick('ev-c'), ev: pick('ev-e') };
      if (!nx.name) return fieldErr('#ev-n', 'Enter a name'), false;
      if (evs.some(x => x !== e && x.name.toLowerCase() === nx.name.toLowerCase())) return fieldErr('#ev-n', 'Another event in this version has this name'), false;
      if (!nx.loc.length) return fieldErr('#ev-n', 'Choose where it may happen'), false;
      if (nx.loc.some(k => !cbLocOk(d, k))) return fieldErr('#ev-n', 'That location isn\'t permitted in this version'), false;
      if (!nx.crit.length) return fieldErr('#ev-n', 'Choose the criteria it covers'), false;
      if (!nx.ev.length) return fieldErr('#ev-n', 'Choose the permitted evidence'), false;
      if (!nx.loc.includes('workplace') && nx.crit.some(c => ia.some(x => x.code === c))) return fieldErr('#ev-n', 'Academy criteria are used on workplace observations only'), false;
      if (!e) { let n = 1; while (evs.some(x => x.id === 'EV-' + n)) n++; evs.push({ id: 'EV-' + n, ...nx }); n5Log(pr, 'Observation event added', '—', cbEvTxt(nx), `Version ${d.v} (draft)`); toast(`"${nx.name}" added to Version ${d.v} (draft).`); }
      else { if (JSON.stringify(nx) === JSON.stringify({ name: e.name, loc: e.loc, crit: e.crit, ev: e.ev })) { toast('Nothing has changed.', 'info'); return false; } const was = cbEvTxt(e); Object.assign(e, nx); n5Log(pr, 'Observation event changed', was, cbEvTxt(e), `Version ${d.v} (draft)`); toast('Saved.'); }
      render();
    } }] });
};
ACT.cbObsEvMove = el => {
  const g = n5Gate(el, 'change an observation event'); if (!g) return; const { pr, d } = g, evs = cbEvOf(d), i = evs.findIndex(x => x.id === el.dataset.e), j = i + (+el.dataset.dir);
  if (i < 0 || j < 0 || j >= evs.length) return; [evs[i], evs[j]] = [evs[j], evs[i]]; n5Log(pr, 'Observation events reordered', '—', evs.map(x => x.name).join(' → '), `Version ${d.v} (draft)`); render();
};
ACT.cbObsEvRemove = el => {
  const g = n5Gate(el, 'remove an observation event'); if (!g) return; const { pr, d } = g, evs = cbEvOf(d), e = evs.find(x => x.id === el.dataset.e); if (!e) return;
  reasonDlg({ title: `Remove "${esc(e.name)}" — Version ${d.v}`, ok: 'Remove', danger: true, body: `<p class="small">Removed from Version ${d.v} (draft). Published versions keep their events; no learner's observation record changes.</p>`,
    onOk: r => { if (!n5Still(g)) return n5Lost(g); evs.splice(evs.indexOf(e), 1); n5Log(pr, 'Observation event removed', cbEvTxt(e), '—', r); render(); toast('Removed.'); } });
};

/* ---------- The Observation events panel (with the permitted locations) ---------- */
function cbObsEventsPanel(pr) {
  if (!n5CanView()) return n5Section(pr); // N5a's own refusal (logged)
  n5Sync(); const dv = n5DraftV(pr), d = n5Shown(pr), ed = !!dv && n5CanEdit() && !!d && d.state === 'Draft', P = `data-p="${pr.id}"`;
  if (!d) return `<section class="card cb-ev"><h2>Observation events</h2><p class="small muted">No observation configuration is recorded for Version ${pr.version}.${cbRetired(pr) ? ' Retired programmes are read-only.' : ' Create a new version to configure observations.'}</p></section>`;
  const no = d.required === false, evs = cbEvOf(d), nvq = n5NvqOk(pr, d), p = cbEvProblems(pr, d);
  const locs = `<section class="card cb-locs"><div class="row-b"><h2>Permitted locations — Version ${d.v}</h2>${ed ? `<button class="btn btn-sm" data-act="n5Settings" ${P}>${ic('edit', 14)}Edit settings</button>` : ''}</div>
    <dl class="kv"><dt>Workplace</dt><dd>${n5Val(d.workplace, 'Permitted', 'Not permitted')} <span class="xs muted">needs the workplace's permission (secure link)</span></dd><dt>Academy office</dt><dd>${n5Val(d.office, 'Available', 'Not available')} <span class="xs muted">the approved alternative (CH-37 / CH-43)</span></dd></dl>
    <p class="xs muted">Events can only use the locations permitted here. Workplace observations cover the Academy criteria and the NVQ criteria; Academy-office observations the NVQ criteria only.</p></section>`;
  const list = evs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>#</th><th>Event</th><th>Where</th><th>Criteria covered</th><th>Evidence</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>${evs.map((e, i) => `<tr data-e="${e.id}"><td>${i + 1}</td><td><strong>${esc(e.name)}</strong></td><td class="small">${esc(cbLocTxt(e.loc))}</td><td class="small mono">${esc(e.crit.join(', '))}</td><td class="small">${esc(n5EvTxt({ types: e.ev }))}</td>${ed ? `<td class="nowrap"><button class="btn btn-sm btn-ghost" data-act="cbObsEvMove" ${P} data-e="${e.id}" data-dir="-1" aria-label="Move ${esc(e.name)} up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-sm btn-ghost" data-act="cbObsEvMove" ${P} data-e="${e.id}" data-dir="1" aria-label="Move ${esc(e.name)} down" ${i === evs.length - 1 ? 'disabled' : ''}>↓</button><button class="btn btn-sm btn-ghost" data-act="cbObsEv" ${P} data-e="${e.id}">${ic('edit', 13)}Edit</button><button class="btn btn-sm btn-ghost" data-act="cbObsEvRemove" ${P} data-e="${e.id}">Remove</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
    : `<p class="small">${d.state === 'Draft' ? 'No observation events yet.' : `No observation events were recorded for Version ${d.v} (configured before events were kept).`}</p>`;
  const cov = nvq.length ? `<p class="xs muted cb-ev-cov">NVQ observation criteria in this version: ${nvq.length}; covered by events: ${nvq.filter(c => evs.some(e => e.crit.includes(c.code))).length}.</p>` : '';
  const checks = d.state === 'Draft' && (p.block.length || p.warn.length) ? `<ul class="list small cb-ev-checks">${p.block.map(b => `<li class="li">${chip('Blocking', 'red')} ${esc(b.replace(/^Observations: /, ''))}</li>`).join('')}${p.warn.map(w => `<li class="li">${chip('Warning', 'amber')} ${esc(w.replace(/^Observations: /, ''))}</li>`).join('')}</ul>` : '';
  const head = `<section class="card cb-ev"><div class="row-b"><h2>Observation events — Version ${d.v}${d.state === 'Draft' ? ' (draft)' : ''}</h2>${ed && !no ? `<button class="btn btn-sm btn-primary" data-act="cbObsEv" ${P} data-e="">${ic('plus', 14)}Add observation event</button>` : ''}</div>
    <p class="small muted">${no ? 'Not applicable — this course has no observations (Course Details). Any events below are kept for history and aren\'t used.' : `The observations each learner on this version needs: ${evs.length ? `<strong>${plural(evs.length, 'observation')}</strong>` : 'none set yet'}. Each covers chosen criteria, may happen only where permitted, and lists the evidence an assessor may record.`}${d.state === 'Draft' ? '' : ' Published — read-only; learners on this version keep it.'}</p>
    ${list}${cov}${checks}<p class="xs muted">${ic('info', 12)} Observation fees are set in Section 5 — Fees &amp; Payments. Nothing here records or decides an outcome.</p></section>`;
  return (no ? '' : locs) + head;
}
const _panelsCB6 = cbPanels;
cbPanels = function (pr, sec) {
  const r = _panelsCB6.apply(this, arguments); if (sec !== 'observations') return r;
  const H = f => () => { const dv = document.createElement('div'); dv.innerHTML = f(); return cbHtml(dv, pr); }, na = cbObsNo(pr) ? cbObsNA(pr) : '';
  return [r[0], ['events', 'Observation events', H(() => na + cbObsEventsPanel(pr))]].concat(r.slice(1));
};
CB_ROUTE.events = ['observations', 'events'];
['cbObsEv', 'cbObsEvMove', 'cbObsEvRemove'].forEach(n => CB_WRITE.push(n));

/* ---------- Demo Scenario #28 records an event when it publishes Level 3 Version 3 with observation required ---------- */
const _sc28CB6 = ACT.s3Sc28Pub;
ACT.s3Sc28Pub = () => {
  if (!s3Draft('NV-L3')) ACT.s3Sc28Edit(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
  const pr = s3Pr('NV-L3'), d = pr && n5Draft(pr);
  if (d && d.required !== false && !cbEvOf(d).length) { d.events = [{ id: 'EV-1', name: 'Workplace observation', loc: ['workplace'], crit: n5NvqOk(pr, d).map(c => c.code).concat(d.ia.filter(c => c.status === 'Active').map(c => c.code)), ev: ['notes'] }]; n5Log(pr, 'Observation event added', '—', cbEvTxt(d.events[0]), `Version ${d.v} (draft) — Scenario #28`); }
  return _sc28CB6();
};

/* ---------- Records ---------- */
UXC.push(['CB6', 'Observations — observation events (21 Oct 2026)', [
  'Section 4 has a new "Observation events" area: the permitted locations of the version (workplace, Academy office — changed with Edit settings) and its required observation events — how many, each one\'s name, where it may happen (only permitted locations), the NVQ observation criteria and Academy criteria it covers (Academy criteria on workplace observations only) and the evidence the assessor may record. Add, edit, reorder and remove while the version is a draft; published versions are read-only.',
  'Before publishing a version that requires observation: at least one event, every NVQ observation criterion covered by an event, no event using a location the version doesn\'t permit or a criterion that isn\'t active. With "No observations" the area is not applicable and no events can be added; existing ones are kept for history.',
  'Events are part of the version\'s observation configuration: published and frozen with it; learners\' observation records are never changed. Observation fees are not part of this section (Section 5).']]);
const _aIdxCB6 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB6(p) + `<section class="card idx-sec"><h2>CB6 — Observation events</h2><ul class="idx-list">${[
  chIdxLi('Level 3 2027 update (Draft) — Observation events', { act: 'aJump', t: 'a-programmes.NV-L3D.events' }, 'CB6 — events, locations, coverage.'),
  chIdxLi('Level 3 Diploma — Observation events (published, read-only)', { act: 'aJump', t: 'a-programmes.NV-L3.events' }, 'CB6 — a published version.')].join('')}</ul></section>`;
