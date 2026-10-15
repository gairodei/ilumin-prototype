/* ============================================================
   N4 — session-linked attendance registers (SRS v1.3.2, proposed internal-decision revision; client approval pending).
   One register per real class session (the S4b session id), with one row per learner id. Eligible learners are the
   enrolled learners of every batch taking part (cohort ids, roster ids, signed-up learners), de-duplicated. Zoom data is
   simulated: participants are matched only by their registered email; anything else stays unmatched for a person to
   reconcile. Manual entries and corrections need a reason and keep their history. The seeded Zoom registers
   (ADMIN.sessions / ADMIN.reg, name-based) are kept unchanged as legacy records. Loads after setup-n1.js.
   ============================================================ */
'use strict';

/* ---------- Store ---------- */
const N4 = () => (STORE.n4 = STORE.n4 || { regs: {} });
const _isN4 = initStore; initStore = function () { STORE.n4 = null; return _isN4.apply(this, arguments); };
const n4Reg = sid => N4().regs[sid] || null; // read only: opening a register never writes
const n4RegW = sid => (N4().regs[sid] = N4().regs[sid] || { sid, imported: null, rows: {}, unmatched: {}, log: [] });
// The rules the existing registers show: Present ≥ 80% · Partial 30–79% · Late after 10 minutes (anything under 30% is Absent)
const N4_ST = ['Present', 'Late', 'Partial', 'Absent'];
const n4StatusOf = (mins, dur, lateMins) => { const p = dur ? mins / dur : 0; return p >= 0.8 ? (lateMins > 10 ? 'Late' : 'Present') : p >= 0.3 ? 'Partial' : 'Absent'; };
const n4Dur = s => Math.round((new Date(s.end) - new Date(s.start)) / 6e4);
const n4Started = s => new Date(s.start) <= now();
const n4Hash = t => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/* ---------- Who takes part: learner ids of every batch taking part ---------- */
function n4BatchLids(code) {
  const b = ADMIN.batches.find(x => x.code === code); if (!b) return [];
  const ws = Object.values(STORE.worlds || {}).filter(w => w.me && w.flags && w.flags.admitted && s4bBatchOfW(w) === code && (BATCH_WORLD[code] === w.v || (w.signup && w.signup.done))).map(w => w.me.id);
  return chCohLids(b).concat((b.roster || []).map(r => r[1]).filter(Boolean), ws);
}
// R2: a Level 3 session can be targeted at fee-option groups / delivery modes — only learners in its audience take part
const n4Eligible = s => Array.from(new Set(s4bCodesOf(s).flatMap(c => n4BatchLids(c).filter(l => typeof r2LidOk !== 'function' || r2LidOk(s, l, c)))));
const n4World = lid => Object.values(STORE.worlds || {}).find(w => w.me && w.me.id === lid) || null;
const n4Name = lid => { const w = n4World(lid); return w ? chFullName(w) : (learnerById(lid) || {}).name || chLidName(lid) || lid; };
const n4Email = lid => { const w = n4World(lid); return (w ? w.me.email : (learnerById(lid) || {}).email) || ''; };
const n4BatchOfLidIn = (s, lid) => s4bCodesOf(s).find(c => n4BatchLids(c).includes(lid)) || null;

/* ---------- Permissions (checked inside every read and change) ---------- */
const n4Admin = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys()));
const n4Teacher = s => S.portal === 'staff' && typeof TME === 'function' && CAN('attendance') === 'yes' && s.teacher === TME().name;
const n4CooCodes = s => S.portal === 'coord' && typeof myBatches === 'function' ? s4bCodesOf(s).filter(c => myBatches().some(b => b.code === c)) : [];
const n4CanManage = s => !!s && (n4Admin() || n4Teacher(s));
const n4CanView = s => !!s && (n4CanManage(s) || n4CooCodes(s).length > 0);
const n4Who = () => S.portal === 'staff' ? TME().name : S.portal === 'coord' ? CME().name : ADMIN.me.name;
const n4Refuse = (s, what) => { logA('Attendance', s ? `${s.title} (${s.id})` : 'Attendance register', 'Blocked: ' + what, '—', '—', `${n4Who()} isn't allowed to ${what}`); toast('You can\'t ' + what + '.', 'err'); return false; };
// Rows a viewer may see: managers see everyone; a Coordinator sees the learners of their own batches only
const n4VisibleLids = s => { const all = Array.from(new Set(n4Eligible(s).concat(Object.keys((n4Reg(s.id) || {}).rows || {})))); if (n4CanManage(s)) return all; const cs = n4CooCodes(s); return all.filter(l => cs.some(c => n4BatchLids(c).includes(l))); };

/* ---------- Simulated Zoom import (idempotent; manual entries are never overwritten) ---------- */
function n4SimParticipants(s) {
  const dur = n4Dur(s), out = n4Eligible(s).flatMap(lid => {
    const h = n4Hash(lid + s.id), k = h % 10, late = h % 4 === 0 ? 14 : 2, mins = k === 0 ? 0 : k === 1 ? Math.round(dur * 0.4) : Math.max(1, dur - (h % 7) - (late > 10 ? late : 0));
    if (k === 0) return []; // didn't join
    if (k === 2) return [{ pid: s.id + ':' + lid, name: n4Name(lid).split(' ')[0] + ' (phone)', email: 'personal-' + (h % 900 + 100) + '@example.com', mins, late }]; // joined without the registered email
    return [{ pid: s.id + ':' + lid, name: n4Name(lid), email: n4Email(lid), mins, late }];
  });
  return out.concat([{ pid: s.id + ':guest', name: 'Guest ' + (n4Hash(s.id) % 9000 + 1000), email: '', mins: Math.round(dur * 0.2), late: 0 }]);
}
ACT.n4Import = el => {
  const s = s4bSessById(el.dataset.s); if (!s) return; if (!n4CanManage(s)) return n4Refuse(s, 'import attendance for this session');
  if (s.status === 'Cancelled') { toast('This session was cancelled — no attendance to import.', 'err'); return; }
  if (!n4Started(s)) { toast('Attendance can be imported once the session has started.', 'err'); return; }
  if (!s.link) { toast('This is an in-person session — record attendance manually.', 'err'); return; }
  const reg = n4RegW(s.id), dur = n4Dur(s), elig = n4Eligible(s), byEmail = new Map(elig.map(l => [n4Email(l).toLowerCase(), l]).filter(([e]) => e)), at = now().toISOString(), who = n4Who();
  let added = 0, updated = 0, kept = 0, um = 0; const seen = new Set();
  n4SimParticipants(s).forEach(p => {
    const lid = p.email && byEmail.get(p.email.toLowerCase()), st = n4StatusOf(p.mins, dur, p.late);
    if (!lid) { if (!reg.unmatched[p.pid]) { reg.unmatched[p.pid] = { ...p, state: 'Open' }; um++; } return; }
    seen.add(lid); const r = reg.rows[lid];
    if (r && r.src === 'manual') { kept++; return; }
    if (!r) { reg.rows[lid] = { lid, status: st, mins: p.mins, src: 'zoom', hist: [[at, who, '—', st, 'Zoom report (simulated)']] }; added++; }
    else if (r.status !== st || r.mins !== p.mins) { r.hist.unshift([at, who, r.status, st, 'Zoom report re-imported (simulated)']); Object.assign(r, { status: st, mins: p.mins }); updated++; }
  });
  elig.filter(l => !seen.has(l) && !reg.rows[l]).forEach(l => { reg.rows[l] = { lid: l, status: 'Absent', mins: 0, src: 'zoom', hist: [[at, who, '—', 'Absent', 'Not in the Zoom report (simulated)']] }; added++; });
  const first = !reg.imported; reg.imported = at;
  logA('Attendance', `${s.title} (${s.id})`, first ? 'Zoom attendance imported (simulated)' : 'Zoom attendance re-imported (simulated)', '—', `${added} added · ${updated} updated · ${kept} manual kept · ${um} unmatched`, '');
  render(); toast(`${first ? 'Imported' : 'Re-imported'} (simulated Zoom report): ${added} added, ${updated} updated, ${kept} manual entries kept, ${um} new unmatched.`);
};

/* ---------- Manual entry and correction (reason required; history kept) ---------- */
ACT.n4Set = el => {
  const s = s4bSessById(el.dataset.s), lid = el.dataset.l; if (!s) return; if (!n4CanManage(s)) return n4Refuse(s, 'record attendance for this session');
  if (s.status === 'Cancelled') { toast('This session was cancelled — attendance can\'t be recorded.', 'err'); return; }
  if (!n4Started(s)) { toast('Attendance can be recorded once the session has started.', 'err'); return; }
  if (!n4Eligible(s).includes(lid)) return n4Refuse(s, 'record attendance for a learner who isn\'t taking part');
  const r = (n4Reg(s.id) || { rows: {} }).rows[lid];
  reasonDlg({ title: `${r ? 'Correct' : 'Record'} attendance — ${esc(n4Name(lid))}`, ok: 'Save', label: 'Reason (required)', extra: `<p class="small">${esc(s.title)} · ${fdt(s.start)} · learner ID <span class="mono">${esc(lid)}</span></p><div class="form-grid"><div class="field"><label for="n4-st">Status</label><select class="select" id="n4-st">${N4_ST.map(x => `<option ${r && r.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label for="n4-m">Minutes attended (optional)</label><input class="input num" type="number" min="0" max="${n4Dur(s)}" id="n4-m" value="${r && r.mins != null ? r.mins : ''}"></div></div>`,
    onOk: why => {
      const st = $('#n4-st').value, mv = $('#n4-m').value, mins = mv === '' ? null : +mv; if (mins != null && !(mins >= 0 && mins <= n4Dur(s))) { fieldErr('#n4-m', `Enter 0 to ${n4Dur(s)} minutes`); return false; }
      const reg = n4RegW(s.id), at = now().toISOString(), cur = reg.rows[lid], prev = cur ? cur.status : '—';
      if (cur && cur.status === st && cur.mins === mins) { fieldErr('#n4-st', 'Nothing has changed'); return false; }
      if (cur) { cur.hist.unshift([at, n4Who(), cur.status, st, why]); Object.assign(cur, { status: st, mins, src: 'manual' }); }
      else reg.rows[lid] = { lid, status: st, mins, src: 'manual', hist: [[at, n4Who(), '—', st, why]] };
      logA('Attendance', `${n4Name(lid)} (${lid}) · ${s.title} (${s.id})`, cur ? 'Attendance corrected' : 'Attendance recorded', prev, st, why);
      render(); toast('Saved with your reason. The learner and staff see the change.');
    } });
};

/* ---------- Unmatched participants: never guessed; matched by a person to an eligible learner id ---------- */
ACT.n4Match = el => {
  const s = s4bSessById(el.dataset.s), reg = s && n4Reg(s.id), p = reg && reg.unmatched[el.dataset.p]; if (!p) return; if (!n4CanManage(s)) return n4Refuse(s, 'match Zoom participants for this session');
  if (p.state !== 'Open') { toast('Already reconciled.', 'info'); return; }
  const cand = n4Eligible(s).filter(l => !reg.rows[l] || reg.rows[l].src !== 'manual');
  reasonDlg({ title: 'Match Zoom participant', ok: 'Match', label: 'How you verified it (required)', extra: `<p class="small">Participant <strong>${esc(p.name)}</strong>${p.email ? ` · ${esc(p.email)}` : ''} · ${p.mins} min. The name alone isn't proof — check with the learner or teacher before matching.</p><div class="field"><label for="n4-ml">Learner taking part in this session</label><select class="select" id="n4-ml"><option value="">Choose a learner…</option>${cand.map(l => `<option value="${esc(l)}">${esc(n4Name(l))} — ${esc(l)}</option>`).join('')}</select></div>`,
    onOk: why => {
      const lid = $('#n4-ml').value; if (!lid) { fieldErr('#n4-ml', 'Choose the learner'); return false; }
      if (!n4Eligible(s).includes(lid)) { n4Refuse(s, 'credit attendance to a learner who isn\'t taking part'); return false; }
      const at = now().toISOString(), st = n4StatusOf(p.mins, n4Dur(s), p.late), cur = reg.rows[lid];
      if (cur && cur.src === 'manual') { fieldErr('#n4-ml', 'This learner has a manual entry — correct it instead'); return false; }
      if (cur) { cur.hist.unshift([at, n4Who(), cur.status, st, 'Matched Zoom participant "' + p.name + '": ' + why]); Object.assign(cur, { status: st, mins: p.mins, src: 'zoom (matched)' }); }
      else reg.rows[lid] = { lid, status: st, mins: p.mins, src: 'zoom (matched)', hist: [[at, n4Who(), '—', st, 'Matched Zoom participant "' + p.name + '": ' + why]] };
      Object.assign(p, { state: 'Matched', lid, by: n4Who(), at, reason: why });
      logA('Attendance', `${s.title} (${s.id})`, 'Zoom participant matched', p.name, `${n4Name(lid)} (${lid})`, why); render(); toast('Matched.');
    } });
};
ACT.n4Dismiss = el => {
  const s = s4bSessById(el.dataset.s), reg = s && n4Reg(s.id), p = reg && reg.unmatched[el.dataset.p]; if (!p) return; if (!n4CanManage(s)) return n4Refuse(s, 'dismiss Zoom participants for this session');
  reasonDlg({ title: 'Dismiss participant — ' + esc(p.name), ok: 'Dismiss', label: 'Reason (required)', body: '<p class="small">Kept in the register as dismissed (for example a guest speaker). No learner is credited.</p>', onOk: why => { Object.assign(p, { state: 'Dismissed', by: n4Who(), at: now().toISOString(), reason: why }); logA('Attendance', `${s.title} (${s.id})`, 'Zoom participant dismissed', p.name, 'Dismissed', why); render(); } });
};

/* ---------- One register view, used by the admin, teacher and Coordinator screens ---------- */
const n4Counts = (s, lids) => { const reg = n4Reg(s.id), c = { Present: 0, Late: 0, Partial: 0, Absent: 0, none: 0 }; lids.forEach(l => { const r = reg && reg.rows[l]; if (r) c[r.status]++; else c.none++; }); return c; };
function n4RegisterHtml(s, opts = {}) {
  const reg = n4Reg(s.id), man = n4CanManage(s) && !opts.ro, elig = n4Eligible(s), vis = n4VisibleLids(s), cur = vis.filter(l => elig.includes(l)), past = vis.filter(l => !elig.includes(l)), dur = n4Dur(s), cancelled = s.status === 'Cancelled', open = man && !cancelled && n4Started(s);
  const row = (l, ro) => { const r = reg && reg.rows[l]; return `<tr data-lid="${esc(l)}"><td>${esc(n4Name(l))}<div class="xs muted mono">${esc(l)}</div></td><td class="small">${esc(n4BatchOfLidIn(s, l) || '—')}</td><td>${r ? chip(r.status) : '<span class="xs muted">Not recorded</span>'}</td><td class="r">${r && r.mins != null ? r.mins + ' / ' + dur : '—'}</td><td class="small">${r ? esc(r.src) : '—'}</td><td class="small">${r && r.hist.length ? `<details><summary>${plural(r.hist.length, 'entry', 'entries')}</summary><ul class="list xs">${r.hist.map(h => `<li>${fdt(h[0])} · ${esc(h[1])} · ${esc(h[2])} → ${esc(h[3])} · ${esc(h[4])}</li>`).join('')}</ul></details>` : '—'}</td><td>${!ro && open ? `<button class="btn btn-sm" data-act="n4Set" data-s="${s.id}" data-l="${esc(l)}">${r ? 'Correct' : 'Record'}</button>` : ''}</td></tr>`; };
  const um = reg ? Object.values(reg.unmatched) : [];
  return `<section class="card n4-reg"><div class="row-b"><h2>Attendance register — ${esc(s.title)}</h2>${open && s.link ? `<button class="btn btn-sm btn-primary" data-act="n4Import" data-s="${s.id}">${reg && reg.imported ? 'Re-import Zoom report (simulated)' : 'Import Zoom report (simulated)'}</button>` : ''}</div>
    <p class="small">${fdt(s.start)} · ${dur} min · ${esc(s.teacher || '—')} · session <span class="mono">${s.id}</span> · ${s4bCodesOf(s).length > 1 ? `shared class: ${esc(s4bCodesOf(s).join(', '))} (organised by ${esc(s.batch)})` : esc(s.batch)}${cancelled ? ' · ' + chip('Cancelled', 'red') : ''}</p>
    ${cancelled ? '<div class="note b-grey">' + ic('info') + '<div class="small">The session was cancelled: no new attendance can be recorded. Anything recorded before is kept.</div></div>' : !n4Started(s) ? '<p class="small muted">Attendance can be recorded once the session has started.</p>' : ''}
    ${opts.coo ? '<p class="xs muted">You see the learners of your own batches only.</p>' : ''}
    <p class="xs muted">Zoom data is simulated in the prototype. Participants are matched only by the learner's registered email; anyone else is listed as unmatched for a person to reconcile. Statuses: Present ≥ 80% · Late (≥ 80%, joined more than 10 minutes late) · Partial 30–79% · Absent under 30%.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Batch</th><th>Status</th><th class="r">Minutes</th><th>Source</th><th>History</th><th></th></tr></thead><tbody>${cur.map(l => row(l, false)).join('') || '<tr><td colspan="7" class="small muted">No learners in the batches taking part.</td></tr>'}</tbody></table></div>
    ${past.length ? `<h3>History — learners no longer taking part</h3><p class="xs muted">Their batch was removed from the session; their attendance is kept, read-only.</p><div class="tbl-wrap"><table class="tbl dense n4-past"><tbody>${past.map(l => row(l, true)).join('')}</tbody></table></div>` : ''}
    ${!opts.coo && um.length ? `<h3>Unmatched Zoom participants (${um.filter(p => p.state === 'Open').length} open)</h3><ul class="list small n4-um">${um.map(p => `<li class="li" data-pid="${esc(p.pid)}"><div class="li-b"><strong>${esc(p.name)}</strong><span class="xs muted">${p.email ? esc(p.email) : 'no email'} · ${p.mins} min · ${p.state}${p.lid ? ' → ' + esc(n4Name(p.lid)) + ' (' + esc(p.lid) + ')' : ''}${p.reason ? ' · ' + esc(p.reason) : ''}</span></div>${man && p.state === 'Open' ? `<button class="btn btn-sm" data-act="n4Match" data-s="${s.id}" data-p="${esc(p.pid)}">Match to learner…</button> <button class="btn btn-sm btn-ghost" data-act="n4Dismiss" data-s="${s.id}" data-p="${esc(p.pid)}">Dismiss</button>` : ''}</li>`).join('')}</ul>` : ''}</section>`;
}
const n4SessRows = (list, link) => list.length ? `<div class="tbl-wrap"><table class="tbl dense n4-list"><thead><tr><th>When</th><th>Session</th><th>Batches</th><th>Teacher</th><th>Recorded</th><th></th></tr></thead><tbody>${list.map(s => { const c = n4Counts(s, n4VisibleLids(s)); return `<tr><td class="nowrap small">${fdt(s.start)}</td><td>${esc(s.title)}${s.status === 'Cancelled' ? ' ' + chip('Cancelled', 'red') : ''}</td><td class="small">${esc(s4bCodesOf(s).join(', '))}</td><td class="small">${esc(s.teacher || '—')}</td><td class="small">${c.Present + c.Late + c.Partial + c.Absent} of ${n4VisibleLids(s).length}</td><td>${link(s)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">No class sessions yet.</p>';
const n4SortS = l => l.slice().sort((a, b) => new Date(b.start) - new Date(a.start));

/* ---------- Admin / Academic Admin: Attendance (Zoom) ---------- */
const _regN4 = register;
register = function (id) {
  const s = s4bSessById(id); if (!s) return _regN4.apply(this, arguments);
  if (!n4CanView(s)) { n4Refuse(s, 'open this attendance register'); return notFound(); }
  return `${pageA('Attendance register', `${esc(s4bCodesOf(s).join(', '))} · ${fdt(s.start)}`, '', [['Attendance (Zoom)', 'a-attendance'], [s.id]])}${n4RegisterHtml(s)}${auditPanel(a => a.module === 'Attendance' && String(a.entity).includes('(' + s.id + ')'), 'Attendance audit')}`;
};
const _aAttN4 = SCREENS['a-attendance'];
SCREENS['a-attendance'] = p => {
  const h = _aAttN4(p); if (p.id || (p.tab || 'sessions') !== 'sessions') return h;
  const card = `<section class="card n4-admin"><h2>Class sessions — attendance registers</h2><p class="small muted">One register per session (by session ID and learner ID), shared classes included. The Zoom sessions below are the earlier name-based records, kept unchanged as legacy registers.</p>${n4SortS(s4bAllSess()).length ? n4SessRows(n4SortS(s4bAllSess()), s => `<button class="btn btn-sm" data-go="a-attendance" data-id="${s.id}">Open register</button>`) : ''}</section>`;
  const st = h.indexOf('<div class="subtabs"'), k = st < 0 ? -1 : h.indexOf('</div>', st) + 6; return k < 6 ? h + card : h.slice(0, k) + card + '<h2 class="n4-legacy">Legacy Zoom registers (name-based)</h2>' + h.slice(k);
};
/* ---------- Teacher: Sessions & Attendance ---------- */
const _tRegN4 = tasRegister;
tasRegister = function (id) {
  const s = s4bSessById(id); if (!s) return _tRegN4.apply(this, arguments);
  if (!n4CanView(s)) { n4Refuse(s, 'open this attendance register'); return `${pageA('Attendance register')}<div class="empty"><p class="small">You can only open registers for sessions you teach.</p></div>`; }
  return `${pageA('Attendance register', esc(s4bCodesOf(s).join(', ')), '', [['Sessions & Attendance', 't-sessions'], [s.id]])}${n4RegisterHtml(s)}`;
};
const _tSessN4 = SCREENS['t-sessions'];
SCREENS['t-sessions'] = p => {
  const h = _tSessN4(p); if (p.id || (p.tab || 'sessions') !== 'sessions') return h;
  const mine = n4SortS(s4bAllSess().filter(s => s.teacher === TME().name));
  return h + `<section class="card n4-tas"><h2>Your class sessions — attendance registers</h2>${n4SessRows(mine, s => `<button class="btn btn-sm" data-go="t-sessions" data-id="${s.id}">Open register</button>`)}</section>`;
};
/* ---------- Coordinator: Attendance (view only, own batches' learners) ---------- */
const _attSecN4 = attSection;
attSection = function (bs) {
  const h = _attSecN4.apply(this, arguments), codes = (bs || []).map(b => b.code || b), list = n4SortS(s4bAllSess().filter(s => s4bCodesOf(s).some(c => codes.includes(c))));
  return h + `<section class="card n4-coo"><h2>Class sessions — attendance registers</h2><p class="small muted">View only. You see the learners of your own batches.</p>${n4SessRows(list, s => `<button class="btn btn-sm" data-act="n4View" data-s="${s.id}">View register</button>`)}</section>`;
};
ACT.n4View = el => { const s = s4bSessById(el.dataset.s); if (!s) return; if (!n4CanView(s)) return n4Refuse(s, 'view this attendance register'); openModal({ title: 'Attendance register', sub: esc(s.title), size: 'xl', body: n4RegisterHtml(s, { ro: true, coo: S.portal === 'coord' }), actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
/* ---------- Learner: Attendance (own record only; a shared class counted once) ---------- */
const n4MineFor = lid => n4SortS(s4bAllSess().filter(s => n4Started(s) && (n4Eligible(s).includes(lid) || ((n4Reg(s.id) || { rows: {} }).rows[lid]))));
const n4Summary = lid => { const list = n4MineFor(lid), rec = list.map(s => (n4Reg(s.id) || { rows: {} }).rows[lid]).filter(Boolean); return { list, rec: rec.length, att: rec.filter(r => r.status !== 'Absent').length }; };
const n4LearnerTable = lid => { const { list, rec, att } = n4Summary(lid); return `<p class="small"><strong>Attended ${att} of ${rec} recorded class${rec === 1 ? '' : 'es'}</strong> (each class counted once, shared classes included; classes not yet recorded aren't counted).</p>${list.length ? `<div class="tbl-wrap"><table class="tbl dense n4-mine"><thead><tr><th>Class</th><th>When</th><th>Status</th><th class="r">Minutes</th></tr></thead><tbody>${list.map(s => { const r = (n4Reg(s.id) || { rows: {} }).rows[lid]; return `<tr data-sid="${s.id}"><td>${esc(s.title)}${s.status === 'Cancelled' ? ' ' + chip('Cancelled', 'red') : ''}</td><td class="nowrap small">${fdt(s.start)}</td><td>${r ? chip(r.status) : `<span class="xs muted">${s.status === 'Cancelled' ? 'Cancelled — no attendance taken' : 'Not recorded yet'}</span>`}</td><td class="r">${r && r.mins != null ? r.mins + ' / ' + n4Dur(s) : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">Attendance for the classes in your timetable appears here after each class.</p>'}`; };
const _attN4 = SCREENS.attendance;
SCREENS.attendance = p => _attN4(p) + (W.flags && W.flags.nvq ? `<section class="card n4-learner"><h2>Class attendance — your timetable</h2>${n4LearnerTable(W.me.id)}<p class="xs muted">The figures above this card are your earlier attendance records.</p></section>` : '');
/* ---------- Learner 360 → Attendance ---------- */
const _lAttN4 = lAtt;
lAtt = function (L) { const h = _lAttN4.apply(this, arguments); return h + `<section class="card n4-360"><h3>Class sessions — attendance register</h3>${n4LearnerTable(L.id)}</section>`; };

/* ---------- Records ---------- */
UXC.push(['N4', 'Session-linked attendance registers (SRS v1.3.2, proposed)', [
  'One attendance register per real class session, keyed by the session ID, with one row per learner ID. The learners are the enrolled learners of every batch taking part (cohort, roster and signed-up learners), de-duplicated — a learner in two of the batches has one row; learners of other batches never appear. Rescheduling or renaming a session keeps the same register. Opening a register writes nothing.',
  'Admin / Academic Admin (Attendance (Zoom) → Class sessions), the session\'s teacher (Sessions & Attendance) and the Coordinator (Attendance, view only, their own batches\' learners) use the same register; the learner sees only their own row on Attendance, and Learner 360 → Attendance shows the same. A shared class is one register and counts once.',
  'Zoom import is simulated and idempotent: participants are matched only by the learner\'s registered email; others (a different email, a guest) are listed as unmatched and are never matched by name. A person matches them to an eligible learner ID with a reason, or dismisses them. Re-importing doesn\'t duplicate rows and never overwrites a manual entry. Manual entry and correction need a reason and keep their history; refused changes are logged and change nothing.',
  'Cancelled sessions keep what was recorded but take no new attendance. Removing a batch from a shared class keeps its learners\' attendance as read-only history. Attendance doesn\'t complete any module or criterion and gates nothing. The seeded Zoom registers (name-based) and each learner\'s earlier attendance figures are kept unchanged as legacy records.',
  'Thresholds: the statuses use the existing prototype defaults shown on the register (Present ≥ 80%, Late after 10 minutes, Partial 30–79%, under 30% Absent). They are NOT client-approved academic eligibility policies, and the Attendance → Thresholds tab is not functional yet (it doesn\'t save anything).',
  'Legacy data: the preserved name-based attendance (the seeded Zoom registers and each learner\'s earlier attendance figures) is unverified demo data, not verified records — including Grace Mensah\'s inconsistent figures (91% on the Coordinator screens, a hard-coded cohort value; about 74% on her own Attendance page, from a generic seed).',
  'Open: how cancelled sessions affect a percentage, whether any minimum applies (no 80% rule was added), and whether attendance can be recorded before a session starts (the prototype waits for the start; cancelled sessions take no new entries — both provisional) — for SRS confirmation. Attendance gates no NVQ progression, assessment or certification.']]);
const _aIdxN4 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxN4(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Attendance (Zoom) → Class sessions (registers)', { act: 'aJump', t: 'a-attendance' }, 'N4 — one register per session by learner ID, shared classes included; Zoom simulated.')}`);
