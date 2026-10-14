/* ============================================================
   Setup fixes S4b — learning resources, batch management and scheduling (S4-01 … S4-04).
   One resource store (title, description, type, file or URL, programme + module from the programme's published structure,
   release rule, status, versions) that reaches the learners of that programme and module, with Coordinator per-batch release
   changes; batch details edited with an impact preview; real sessions (add, edit, reschedule, cancel) kept with the batch's
   events, so every calendar shows them; conflicts computed from the actual sessions; Coordinator changes notify both people.
   Uploads, Zoom meetings and notifications are simulated in the prototype and say so. Loads after setup-s4a.js.
   ============================================================ */
'use strict';

/* ---------- Store ---------- */
const S4B_KIND = { PDF: 'doc', DOCX: 'doc', PPT: 'doc', 'Vimeo video': 'video', SCORM: 'scorm', Link: 'link' };
const S4B_EXT = { PDF: /\.pdf$/i, DOCX: /\.docx$/i, PPT: /\.pptx?$/i, SCORM: /\.zip$/i };
const S4B_TYPES = Object.keys(S4B_KIND);
const S4B_LIVE = b => b && !['Completed', 'Archived', 'Cancelled'].includes(b.status);
function s4bSeed() {
  const fx = n => Array.from({ length: n }, (_, k) => ({ v: k + 1, fixture: true }));
  const R = (id, title, type, ref, unit, mod, rel, status, version, seedItem, desc) => ({ id, title, desc, type, kind: S4B_KIND[type], ref, pid: 'NV-L3', unit, mod, rel, status, version, rev: 0, versions: fx(version), seedItem, tags: [type === 'Vimeo video' ? 'Recording' : 'Reference'] });
  const res = [
    R('RS-01', 'Class recording: safeguarding workshop', 'Vimeo video', 'https://vimeo.com/870112233', 'U306', 'M1', { k: 'now' }, 'Published', 2, 'r1', 'Recording from 29 Sep class (1h 32m).'),
    R('RS-02', 'Slides: types of harm and abuse', 'PDF', 'types_of_harm_slides.pdf', 'U306', 'M1', { k: 'now' }, 'Published', 1, 'r2', 'PDF slides from the workshop.'),
    R('RS-03', 'Scenario: responding to a disclosure', 'SCORM', 'scorm_disclosure_v3.zip', 'U306', 'M1', { k: 'now' }, 'Published', 3, 'r3', 'Interactive branching scenario with scoring.'),
    R('RS-04', 'Duty of candour factsheet', 'PDF', 'duty_of_candour.pdf', 'U305', 'M1', { k: 'now' }, 'Published', 1, 'r4', 'CQC Regulation 20 summary.'),
    R('RS-05', 'COSHH in care settings', 'Vimeo video', 'https://vimeo.com/870114455', 'U307', 'M1', { k: 'date', date: D(12) }, 'Published', 1, 'r6', 'Unlocks with Module 2.'),
    // Learners already see this one (locked until Module 1 is complete); the old admin row said Draft — reconciled to Published
    R('RS-06', 'Fire evacuation plans', 'PPT', 'fire_evacuation_plans.pptx', 'U307', 'M1', { k: 'after', after: 'U307 M1' }, 'Published', 1, 'r7', 'Unlocks after you complete Module 1.'),
    // Learners already see this template; it had no admin row
    R('RS-09', 'Assignment 3 template (DOCX)', 'DOCX', 'assignment3_template.docx', 'U305', 'M1', { k: 'now' }, 'Published', 1, 'r5', 'Use this to plan your answers.'),
    { id: 'RS-07', title: 'Hoist and sling checklist', type: 'DOCX', legacy: true, course: 'Moving and Handling People', status: 'Published', version: 4, versions: fx(4), rel: { k: 'now' }, tags: ['Reference'] },
    { id: 'RS-08', title: 'NHS hand hygiene guidance', type: 'Link', legacy: true, course: 'Infection Prevention and Control', status: 'Expired', version: 1, versions: fx(1), rel: { k: 'now' }, tags: ['Reference'] }];
  // The sessions behind the two scheduling conflicts the Academic Admin dashboard has always shown
  const ss = (id, batch, title, day, hm, mins, teacher, extra = {}) => ({ id, batch, title, start: D(day, hm), end: new Date(new Date(D(day, hm)).getTime() + mins * 6e4).toISOString(), teacher, link: 'Zoom (simulated) — meeting 8' + id.replace(/\D/g, '') + '40 112', status: 'Scheduled', hist: [], seed: true, ...extra });
  const sess = { 'SC-MH26': [ss('ss-1', 'SC-MH26', 'Live Q&A: moving and handling', 2, '17:00', 60, 'Marcus Bell')],
    'L2DC-MAR26': [ss('ss-2', 'L2DC-MAR26', 'Weekly class', 9, '15:00', 90, 'Tom Whitfield'), ss('ss-3', 'L2DC-MAR26', 'Classroom day', 9, '15:00', 120, 'Tom Whitfield', { link: null, loc: 'Illumin Academy Croydon, Room 2' })] };
  return { res, sess, evx: {}, n: 10 };
}
const S4B = () => (STORE.s4b = STORE.s4b || s4bSeed());
const s4bLog = (module, entity, action, before, after, r) => logA(module, entity, action, before, after, r || '');
const _isS4b = initStore; initStore = function () { STORE.s4b = null; const r = _isS4b.apply(this, arguments); s4bInit(); return r; };
const _baS4b = buildAdmin; buildAdmin = function () { const r = _baS4b.apply(this, arguments); if (STORE.worlds) s4bInit(); return r; };
function s4bInit() { if (!STORE.worlds || !s3Progs().length) return; S4B(); s4bRows(); s4bSyncAll(); }
const s4bBatch = code => ADMIN.batches.find(b => b.code === code) || (code === 'SC-MH26' ? SHORT_BATCH() : null);
const s4bAdmin = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys()));
const s4bSched = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()));
const s4bRefuse = (module, entity, what) => { logA(module, entity, 'Blocked: ' + what, '—', '—', 'Role can\'t ' + what); toast('You can\'t ' + what + '.', 'err'); return false; };

/* ---------- S4-01 resources: helpers ---------- */
const s4bPubTree = pid => { const pr = s3Pr(pid); return pr ? s3PubTree(pr, pr.version) || [] : []; };
const s4bMods = pid => s4bPubTree(pid).flatMap(u => u.mods.map((m, i) => ({ key: u.code + ' ' + m.code, unit: u.code, mod: m.code, n: i + 1, label: `${u.code} · Module ${i + 1} — ${m.title}` })));
const s4bProgShort = pid => pid === 'NV-L3' ? 'Level 3 Adult Care' : (s3Pr(pid) || {}).title || pid;
const s4bMap = r => r.legacy ? r.course : `${r.unit} · ${s4bProgShort(r.pid)}`;
const s4bModNo = (pid, key) => (s4bMods(pid).find(m => m.key === key) || { n: +(key.split(' M')[1]) || 1 }).n;
function s4bRelTxt(r, rel) { rel = rel || r.rel; if (rel.k === 'date') return 'Date: ' + fd(rel.date); if (rel.k === 'after') return rel.after.startsWith(r.unit + ' ') ? `After Module ${s4bModNo(r.pid, rel.after)} complete` : `After ${rel.after.replace(' M', ' Module ')} complete`; return 'Immediate'; }
// The admin list (and the Coordinator and teacher screens that read it) is derived from the store
function s4bRows() { ADMIN.resources = S4B().res.map(r => ({ id: r.id, title: r.title, type: r.type, map: s4bMap(r), status: r.status, release: r.legacy ? 'Immediate' : s4bRelTxt(r), version: r.version, tags: r.tags, pid: r.pid, legacy: !!r.legacy })); }
const s4bModDone = (w, key) => { const [uc, mc] = key.split(' '), u = (w.tree || []).find(x => x.code === uc), m = u && u.mods.find(x => x.code === mc); const cr = m ? m.los.flatMap(l => l.crit) : []; return cr.length > 0 && cr.every(c => c.st === 'Achieved'); };
const s4bHasMod = (w, r) => { const u = (w.tree || []).find(x => x.code === r.unit); return !!(u && u.mods.some(m => m.code === r.mod)); };
const s4bBatchOfW = w => (w.signup && w.signup.batch) || Object.keys(BATCH_WORLD).find(k => BATCH_WORLD[k] === w.v) || null;
const s4bOverride = (code, r) => code && STORE.coo && STORE.coo.released ? STORE.coo.released[code + r.id] : null;
// Release rule for this learner: their batch's override (Coordinator), else the resource's own
function s4bLockOf(w, r) {
  const o = s4bOverride(s4bBatchOfW(w), r), rel = (o && o.rel) || r.rel;
  if (rel.k === 'date' && new Date(rel.date) > now()) return 'Unlocks on ' + fd(rel.date);
  if (rel.k === 'after' && !s4bModDone(w, rel.after)) return rel.after.startsWith(r.unit + ' ') ? `Unlocks after you complete Module ${s4bModNo(r.pid, rel.after)}` : `Unlocks after you complete ${rel.after.replace(' M', ' Module ')}`;
  return null;
}
const s4bFindItem = (w, id) => { for (const g of w.resources || []) { const i = g.items.find(x => x.id === id); if (i) return { g, i }; } return null; };
function s4bGroupFor(w, r) {
  const key = r.unit + ' ' + r.mod; let g = (w.resources || []).find(x => { const m = nvqModOf(w.tree, x.unit); return m && m.key === key; });
  if (!g) { const u = w.tree.find(x => x.code === r.unit), mi = u.mods.findIndex(m => m.code === r.mod); g = { course: w.nvq.title, unit: `${r.unit} ${u.title.split(' ').slice(0, 3).join(' ')} · Module ${mi + 1}`, items: [] }; w.resources.push(g); }
  return g;
}
// Put each published resource in front of the learners of its programme and module (their enrolled structure); nothing else moves
function s4bSyncW(w) {
  if (!w || !w.flags || !w.flags.nvq || !w.tree || !w.resources || !w.nvq || !w.flags.admitted) return;
  const pid = s4PidOfW(w), kept = (w.s4bKept = w.s4bKept || {});
  S4B().res.filter(r => !r.legacy && r.pid === pid).forEach(r => {
    const id = r.seedItem && (s4bFindItem(w, r.seedItem) || kept[r.seedItem]) ? r.seedItem : 'res-' + r.id, o = s4bOverride(s4bBatchOfW(w), r);
    const show = r.status === 'Published' && s4bHasMod(w, r) && !(o && o.status === 'Unpublished'), f = s4bFindItem(w, id);
    if (!show) { if (f) { f.g.items.splice(f.g.items.indexOf(f.i), 1); kept[id] = f.i; } return; }
    let it = f ? f.i : kept[id]; if (!f) { if (!it) it = { id, kind: r.kind, title: r.title, desc: r.desc, tags: r.tags.slice(), state: 'New', dl: false, s4rev: r.rev, s4id: r.id }; s4bGroupFor(w, r).items.push(it); delete kept[id]; }
    if (it.s4rev === undefined) it.s4rev = r.rev; // seeded items keep their text until the resource is changed
    if (it.s4rev !== r.rev) Object.assign(it, { kind: r.kind, title: r.title, desc: r.desc, s4rev: r.rev });
    it.s4id = r.id; it.ref = r.ref; it.v = r.version;
    const lock = s4bLockOf(w, r);
    if (lock) { if (it.state !== 'Locked') { it.st0 = it.state; it.state = 'Locked'; } it.lock = lock; it.dl = false; }
    else { if (it.state === 'Locked') { it.state = it.st0 || 'New'; delete it.st0; } delete it.lock; it.dl = r.kind === 'doc'; }
  });
}
const s4bSyncAll = () => Object.values(STORE.worlds || {}).forEach(s4bSyncW);
const s4bLearnersOf = (r, code) => Object.values(STORE.worlds || {}).filter(w => w.flags && w.flags.nvq && w.flags.admitted && w.nvq && s4PidOfW(w) === r.pid && (!code || s4bBatchOfW(w) === code));
// Learner side: a locked resource can't be opened, whatever the button state; links open as a simulated new tab
RICON.link = 'link'; RLBL.link = 'Link';
const s4bLockGate = act => { const f = ACT[act]; ACT[act] = el => { s4bSyncW(W); const it = (W.resources || []).flatMap(g => g.items).find(x => x.id === el.dataset.id); if (it && it.state === 'Locked') { toast('This resource is locked. ' + (it.lock || ''), 'err'); return; } if (act === 'openRes' && it && it.kind === 'link') { if (it.state === 'New') it.state = 'Opened'; openModal({ title: esc(it.title), body: `<p class="small">${esc(it.desc || '')}</p><p class="mono small">${esc(it.ref || '')}</p><p class="xs muted">In the live system this opens in a new tab. The prototype doesn't leave the page (simulated).</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }], onClose: () => render() }); return; } return f(el); }; };
['openRes', 'resPlay', 'resScorm'].forEach(s4bLockGate);
const _resScrS4b = SCREENS.resources; SCREENS.resources = p => { s4bSyncW(W); return _resScrS4b(p); };

/* ---------- S4-01 resources: admin screen and actions ---------- */
// Who may do what: admins (Super Admin, Academic Admin, System Admin) everything; a teacher (the "briefs" capability) adds and
// edits Draft resources for the programmes of the batches they're allocated to; publishing stays with the admins.
const s4bTeacherProgs = () => (S.portal === 'staff' && typeof tasBatches === 'function' && CAN('briefs') === 'yes') ? Array.from(new Set(tasBatches().map(b => s4PidOfTitle(b.course)).filter(Boolean))) : [];
const s4bCanRes = (act, r, pid) => { if (s4bAdmin()) return true; const ps = s4bTeacherProgs(); if (!ps.length) return false; if (act === 'add') return !pid || ps.includes(pid); return ['edit', 'version'].includes(act) && r && r.status === 'Draft' && r.by === TME().name && ps.includes(r.pid); };
const s4bWho = () => S.portal === 'staff' && typeof TME === 'function' ? TME().name : ADMIN.me.name;
const s4bResProgs = () => { const ps = s4bAdmin() ? s3Progs().filter(p => p.status !== 'Retired').map(p => p.id) : s4bTeacherProgs(); return ps.map(s3Pr).filter(Boolean); };
SCREENS['a-resources'] = () => { s4bRows(); const R = S4B().res, adm = s4bAdmin();
  return `${pageA('Learning Resources', 'Repository — resources reach the learners of their programme and module', `<button class="btn btn-primary" data-act="aUpload">${ic('upload', 15)}Add resource</button>`)}
  <div class="note b-grey">${ic('info')}<div class="small">Files and links are recorded by name; the files themselves are simulated in the prototype. Learners see Published resources of their programme and module, from the release rule on (a Coordinator can change the release for their batch).</div></div>
  ${dt({ id: 'res', name: 'Learning resources', rows: R, rid: r => r.id, search: r => r.title + ' ' + s4bMap(r), filters: [{ k: 't', l: 'Type', get: r => r.type, opts: S4B_TYPES }, { k: 's', l: 'Status', get: r => r.status, opts: ['Draft', 'Published', 'Unpublished', 'Retired', 'Expired'] }],
    cols: [{ k: 'title', l: 'Title', h: r => `<strong>${esc(r.title)}</strong>${r.desc ? `<div class="xs muted">${esc(r.desc)}</div>` : ''}` }, { k: 'type', l: 'Type' }, { k: 'map', l: 'Mapped to', h: r => `<span class="small">${esc(s4bMap(r))}${r.legacy ? '' : ` · Module ${s4bModNo(r.pid, r.unit + ' ' + r.mod)}`}</span>`, v: r => s4bMap(r) }, { k: 'version', l: 'Version', h: r => 'v' + r.version }, { k: 'status', l: 'Status', h: r => chip(r.status, r.status === 'Published' ? 'green' : r.status === 'Draft' ? 'amber' : 'grey') }, { k: 'release', l: 'Release condition', h: r => `<span class="small">${esc(r.legacy ? 'Immediate' : s4bRelTxt(r))}</span>` }],
    act: r => r.legacy ? `<span class="xs muted">Short-course material — managed in the course's Content tab (S1)</span>` : [
      `<button class="btn btn-sm btn-ghost" data-act="s4bPrev" data-id="${r.id}">Preview</button>`,
      adm || s4bCanRes('edit', r) ? `<button class="btn btn-sm" data-act="s4bEdit" data-id="${r.id}" ${r.status === 'Retired' ? 'disabled title="Retired resources can\'t be changed"' : ''}>Edit</button>` : '',
      adm || s4bCanRes('version', r) ? `<button class="btn btn-sm" data-act="s4bVer" data-id="${r.id}" ${r.status === 'Retired' ? 'disabled title="Retired resources can\'t be changed"' : ''}>New version</button>` : '',
      adm && ['Draft', 'Unpublished'].includes(r.status) ? `<button class="btn btn-sm btn-primary" data-act="s4bPub" data-id="${r.id}">Publish</button>` : '',
      adm && r.status === 'Published' ? `<button class="btn btn-sm" data-act="s4bUnpub" data-id="${r.id}">Unpublish</button>` : '',
      adm && r.status !== 'Retired' ? `<button class="btn btn-sm" data-act="s4bRetire" data-id="${r.id}">Retire</button>` : '',
      `<button class="btn btn-sm btn-ghost" data-act="resHist" data-id="${r.id}">Versions</button>`, `<button class="btn btn-sm btn-ghost" data-act="resLog" data-id="${r.id}">Access log</button>`].filter(Boolean).join(' ') })}
  ${auditPanel(a => a.module === 'Learning Resources')}`; };
const s4bModOpts = (pid, cur) => s4bMods(pid).map(m => `<option value="${m.key}" ${m.key === cur ? 'selected' : ''}>${esc(m.label)}</option>`).join('');
function s4bResFields(r) {
  const ps = s4bResProgs(), pid = r ? r.pid : (ps.find(p => p.id === 'NV-L3') || ps[0] || {}).id, rel = r ? r.rel : { k: 'now' };
  return `<div class="form-grid"><div class="field full"><label for="rs-t">Title</label><input class="input" id="rs-t" value="${esc(r ? r.title : '')}"></div>
    <div class="field full"><label for="rs-d">Description</label><input class="input" id="rs-d" value="${esc(r ? r.desc || '' : '')}"></div>
    ${r ? '' : `<div class="field"><label for="rs-y">Type</label><select class="select" id="rs-y">${S4B_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="rs-u">Link (Vimeo video or link)</label><input class="input" id="rs-u" placeholder="https://"></div>
    <div class="field full"><label for="rs-f">File (PDF, DOCX, PPT or SCORM .zip)</label><input class="input" type="file" id="rs-f" data-onchange="s4bFile"><span class="hint"><span id="rs-fn">No file chosen</span> — the file name is recorded; the file itself is simulated.</span><button type="button" class="linklike small" data-act="s4bSample">Prototype: use a sample file</button></div>`}
    <div class="field"><label for="rs-p">Programme</label><select class="select" id="rs-p" data-onchange="s4bProg">${ps.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div>
    <div class="field"><label for="rs-m">Module (published structure)</label><select class="select" id="rs-m">${s4bModOpts(pid, r && r.unit + ' ' + r.mod)}</select></div>
    <fieldset class="stack full" style="border:0;padding:0"><legend class="lbl">Release</legend><label class="check"><input type="radio" name="rs-k" value="now" ${rel.k === 'now' ? 'checked' : ''}> Immediately</label><label class="check"><input type="radio" name="rs-k" value="date" ${rel.k === 'date' ? 'checked' : ''}> On a date</label><label class="check"><input type="radio" name="rs-k" value="after" ${rel.k === 'after' ? 'checked' : ''}> After a module is complete</label>
    <div class="form-grid"><div class="field"><label for="rs-dt">Release date</label><input class="input" type="date" id="rs-dt" value="${(rel.date || D(7)).slice(0, 10)}"></div><div class="field"><label for="rs-a">Module to complete first</label><select class="select" id="rs-a">${s4bModOpts(pid, rel.after)}</select></div></div></fieldset></div>`;
}
INP.s4bProg = el => { $('#rs-m').innerHTML = s4bModOpts(el.value); $('#rs-a').innerHTML = s4bModOpts(el.value); };
INP.s4bFile = el => { const f = el.files[0]; setUi('s4bFile', f ? f.name : ''); $('#rs-fn').textContent = f ? f.name : 'No file chosen'; };
ACT.s4bSample = () => { const y = ($('#rs-y') || {}).value || 'PDF', n = { PDF: 'handout (sample).pdf', DOCX: 'worksheet (sample).docx', PPT: 'slides (sample).pptx', SCORM: 'scenario (sample).zip' }[y] || 'handout (sample).pdf'; setUi('s4bFile', n); const s = $('#rs-fn'); if (s) s.textContent = n; };
function s4bReadMeta() {
  const t = $('#rs-t').value.trim(), pid = $('#rs-p').value, mk = $('#rs-m').value, k = ($('input[name="rs-k"]:checked') || {}).value;
  if (!t) return fieldErr('#rs-t', 'Enter a title'), null;
  if (!pid || !mk) return fieldErr('#rs-m', 'Choose a module from the programme\'s published structure'), null;
  const rel = k === 'date' ? { k, date: new Date($('#rs-dt').value + 'T08:00:00Z').toISOString() } : k === 'after' ? { k, after: $('#rs-a').value } : { k: 'now' };
  if (k === 'date' && !$('#rs-dt').value) return fieldErr('#rs-dt', 'Choose a release date'), null;
  if (k === 'after' && !rel.after) return fieldErr('#rs-a', 'Choose the module to complete first'), null;
  const [unit, mod] = mk.split(' '); return { title: t, desc: $('#rs-d').value.trim(), pid, unit, mod, rel };
}
const s4bRef = type => { const f = ui('s4bFile', ''), u = ($('#rs-u') || {}).value || ''; if (['Vimeo video', 'Link'].includes(type)) return /^https:\/\/\S+$/.test(u.trim()) ? { ref: u.trim() } : { err: ['#rs-u', 'Enter a link starting with https://'] }; if (!f) return { err: ['#rs-f', 'Choose a file'] }; if (!S4B_EXT[type].test(f)) return { err: ['#rs-f', `Use a ${type === 'SCORM' ? 'SCORM .zip' : type} file`] }; return { ref: f }; };
const s4bTxt = r => `${r.title} · ${s4bMap(r)} M${(r.mod || '').replace(/\D/g, '')} · ${s4bRelTxt(r)} · ${r.status} v${r.version}`;
ACT.aUpload = () => {
  if (!s4bCanRes('add')) return s4bRefuse('Learning Resources', 'Learning resources', 'add resources');
  setUi('s4bFile', '');
  openModal({ title: 'Add resource', size: 'lg', body: s4bResFields(null) + '<p class="small muted">Saved as a Draft. An admin publishes it to learners.</p>', actions: [{ label: 'Cancel' }, { label: 'Save as Draft', cls: 'btn-primary', fn: () => {
    const m = s4bReadMeta(); if (!m) return false; if (!s4bCanRes('add', null, m.pid)) { s4bRefuse('Learning Resources', m.title, 'add resources to this programme'); return false; }
    const type = $('#rs-y').value, x = s4bRef(type); if (x.err) { fieldErr(...x.err); return false; }
    const S_ = S4B(), id = 'RS-' + (S_.n++), at = now().toISOString(), by = s4bWho();
    const r = { id, ...m, type, kind: S4B_KIND[type], ref: x.ref, status: 'Draft', version: 1, rev: 0, by, at, tags: [type === 'Vimeo video' ? 'Recording' : type === 'Link' ? 'Link' : 'Reference'], versions: [{ v: 1, title: m.title, ref: x.ref, at, by, note: 'First version' }] };
    S_.res.unshift(r); s4bRows(); s4bLog('Learning Resources', `${r.title} (${id})`, 'Resource added', '—', s4bTxt(r), 'Draft'); render(); toast(`Saved as a Draft (${id}). ${['Vimeo video', 'Link'].includes(type) ? 'Link recorded.' : 'File name recorded — the upload is simulated.'}`);
  } }] });
};
const s4bRes = id => S4B().res.find(r => r.id === id);
ACT.s4bEdit = el => { const r = s4bRes(el.dataset.id); if (!r || r.legacy) return; if (!s4bCanRes('edit', r)) return s4bRefuse('Learning Resources', `${r.title} (${r.id})`, 'edit this resource'); if (r.status === 'Retired') { toast('Retired resources can\'t be changed.', 'err'); return; }
  reasonDlg({ title: 'Edit resource — ' + esc(r.title), ok: 'Save', size: 'lg', label: 'Reason (required)', extra: s4bResFields(r), onOk: rs => { const m = s4bReadMeta(); if (!m) return false; if (!s4bAdmin() && !s4bTeacherProgs().includes(m.pid)) { s4bRefuse('Learning Resources', r.title, 'move a resource to this programme'); return false; } const was = s4bTxt(r); Object.assign(r, m); r.rev++; s4bRows(); s4bSyncAll(); s4bLog('Learning Resources', `${r.title} (${r.id})`, 'Resource changed', was, s4bTxt(r), rs); render(); toast('Saved. Learners see the change; their progress is kept.'); } }); };
ACT.s4bVer = el => { const r = s4bRes(el.dataset.id); if (!r || r.legacy) return; if (!s4bCanRes('version', r)) return s4bRefuse('Learning Resources', `${r.title} (${r.id})`, 'add a version'); if (r.status === 'Retired') { toast('Retired resources can\'t be changed.', 'err'); return; } setUi('s4bFile', '');
  const link = ['Vimeo video', 'Link'].includes(r.type);
  reasonDlg({ title: `New version of ${esc(r.title)} (v${r.version + 1})`, ok: 'Save new version', label: 'What changed (required)', extra: link ? `<div class="field"><label for="rs-u">New link</label><input class="input" id="rs-u" value="${esc(r.ref)}"></div>` : `<input type="hidden" id="rs-y" value="${r.type}"><div class="field"><label for="rs-f">New file (${r.type})</label><input class="input" type="file" id="rs-f" data-onchange="s4bFile"><span class="hint"><span id="rs-fn">No file chosen</span> — the file is simulated.</span><button type="button" class="linklike small" data-act="s4bSample">Prototype: use a sample file</button></div>`,
    onOk: rs => { const x = s4bRef(r.type); if (x.err) { fieldErr(...x.err); return false; } if (link && x.ref === r.ref) { fieldErr('#rs-u', 'Enter the new link'); return false; } const was = `v${r.version} · ${r.ref}`; r.version++; r.ref = x.ref; r.rev++; r.versions.push({ v: r.version, title: r.title, ref: x.ref, at: now().toISOString(), by: s4bWho(), note: rs }); s4bRows(); s4bSyncAll(); s4bLog('Learning Resources', `${r.title} (${r.id})`, 'New version', was, `v${r.version} · ${r.ref}`, rs); render(); toast(`Version ${r.version} saved. Earlier versions are kept; learners keep their progress.`); } }); };
const s4bStatusAct = (to, verb, note) => el => { const r = s4bRes(el.dataset.id); if (!r || r.legacy) return; if (!s4bAdmin()) return s4bRefuse('Learning Resources', `${r.title} (${r.id})`, verb.toLowerCase() + ' resources'); if (r.status === 'Retired') { toast('Retired resources can\'t be changed.', 'err'); return; }
  reasonDlg({ title: `${verb} ${esc(r.title)}`, ok: verb, danger: to === 'Retired', body: `<p class="small">${note}</p>`, onOk: rs => { const was = r.status; r.status = to; s4bRows(); s4bSyncAll(); s4bLog('Learning Resources', `${r.title} (${r.id})`, `Resource ${to === 'Published' ? 'published' : to === 'Retired' ? 'retired' : 'unpublished'}`, was, to, rs); render(); toast(`${r.title}: ${to}.`); } }); };
ACT.s4bPub = s4bStatusAct('Published', 'Publish', 'Learners of this programme and module see it, from its release rule on.');
ACT.s4bUnpub = s4bStatusAct('Unpublished', 'Unpublish', 'Learners stop seeing it. Their progress is kept if it is published again.');
ACT.s4bRetire = s4bStatusAct('Retired', 'Retire', 'Learners stop seeing it and it can\'t be published again. Its versions and history are kept.');
ACT.s4bPrev = el => { const r = s4bRes(el.dataset.id); if (!r) return; openModal({ title: esc(r.title) + ' (preview)', size: 'lg', body: `${r.kind === 'video' ? `<div class="viewer"><div class="video"><button class="play" aria-label="Play">${ic('play', 28)}</button></div></div>` : r.kind === 'scorm' ? `<div class="viewer"><div class="scorm"><h3>SCORM preview</h3><p>Preview mode — no tracking recorded.</p></div></div>` : r.kind === 'link' ? `<p class="mono small">${esc(r.ref)}</p>` : `<div class="viewer"><div class="pdf-pages"><div class="pdf-page"><strong>${esc(r.title)}</strong>${Array.from({ length: 8 }, (_, k) => `<div class="ln" style="width:${60 + k * 7 % 35}%"></div>`).join('')}</div></div></div>`}<p class="xs muted">v${r.version} · ${esc(r.ref || r.course || '')} (simulated file)</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
ACT.resHist = el => { const r = s4bRes(el.dataset.id); if (!r) return; openModal({ title: 'Version history — ' + esc(r.title), body: `<ul class="list small">${r.versions.slice().reverse().map(v => `<li class="li"><div class="li-b"><strong>Version ${v.v}${v.v === r.version ? ' (current)' : ''}</strong><span class="xs muted">${v.fixture ? 'Demo fixture — existed before this prototype\'s audit trail (no recorded date or author)' : `${fdt(v.at)} · ${esc(v.by)} · ${esc(v.ref)} · ${esc(v.note)}`}</span></div></li>`).join('')}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
// Access log: what learners have actually done with the resource (from their progress)
ACT.resLog = el => { const r = s4bRes(el.dataset.id); if (!r) return; const rows = r.legacy ? [] : s4bLearnersOf(r).map(w => { const f = (w.resources || []).flatMap(g => g.items).find(i => i.s4id === r.id); return f && ['Opened', 'Completed'].includes(f.state === 'Locked' ? f.st0 : f.state) ? [chFullName(w), f.state === 'Locked' ? f.st0 : f.state] : null; }).filter(Boolean);
  openModal({ title: 'Access log — ' + esc(r.title), body: rows.length ? `<table class="tbl dense"><tbody>${rows.map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">No learner has opened it yet.</p>', actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- S4-01 Coordinator per-batch release changes ---------- */
ACT.cooRel = el => {
  const r = s4bRes(el.dataset.id), code = el.dataset.b, b = ADMIN.batches.find(x => x.code === code); if (!r || !b || r.legacy) return;
  const own = S.portal === 'coord' ? myBatches().some(x => x.code === code) && !roBatch(b) : s4bAdmin();
  if (!own) return s4bRefuse('Learning Resources', `${r.title} · ${code}`, 'change releases for this batch');
  if (s4PidOfTitle(b.course) !== r.pid) { toast(`${r.title} belongs to ${s4bProgShort(r.pid)}; it can't be released to ${code}.`, 'err'); return; }
  const o = s4bOverride(code, r) || {}, rel = o.rel || r.rel;
  openModal({ title: 'Edit resource release', sub: esc(r.title) + ' · ' + code, body: `<p class="small">Current for this batch: <strong>${esc(s4bRelTxt(r, rel))}</strong> · ${o.status || r.status}</p>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Release condition</legend><label class="check"><input type="radio" name="rr-k" value="now" ${rel.k === 'now' ? 'checked' : ''}> Immediately</label><label class="check"><input type="radio" name="rr-k" value="date" ${rel.k === 'date' ? 'checked' : ''}> On a date</label><label class="check"><input type="radio" name="rr-k" value="after" ${rel.k === 'after' ? 'checked' : ''}> After a module is complete</label></fieldset>
    <div class="form-grid"><div class="field"><label for="rr-d">Release date</label><input class="input" type="date" id="rr-d" value="${(rel.date || D(7)).slice(0, 10)}"></div><div class="field"><label for="rr-a">Module to complete first</label><select class="select" id="rr-a">${s4bModOpts(r.pid, rel.after)}</select></div></div>
    <div class="field"><label for="rr-s">Status for this batch</label><select class="select" id="rr-s"><option ${(o.status || 'Published') === 'Published' ? 'selected' : ''}>Published</option><option ${o.status === 'Unpublished' ? 'selected' : ''}>Unpublished</option></select></div>
    <div class="field"><label for="rr-r">Reason (required)</label><textarea class="textarea" id="rr-r"></textarea></div><label class="check"><input type="checkbox" id="rr-n" checked> Notify affected learners</label><p class="xs muted">Applies to ${esc(b.label)} only. Learners keep their progress.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      const why = mval('#rr-r'); if (!why) { fieldErr('#rr-r', 'Enter a reason'); return false; }
      const k = ($('input[name="rr-k"]:checked') || {}).value, nrel = k === 'date' ? { k, date: new Date($('#rr-d').value + 'T08:00:00Z').toISOString() } : k === 'after' ? { k, after: $('#rr-a').value } : { k: 'now' };
      const st = $('#rr-s').value, before = `${s4bRelTxt(r, rel)} · ${o.status || r.status}`, ws = s4bLearnersOf(r, code), lockBefore = ws.map(w => [w, s4bLockOf(w, r)]);
      STORE.coo.released[code + r.id] = { release: s4bRelTxt(r, nrel), rel: nrel, status: st, by: S.portal === 'coord' ? CME().name : ADMIN.me.name, at: now().toISOString(), reason: why };
      ws.forEach(s4bSyncW);
      const after = `${s4bRelTxt(r, nrel)} · ${st}`, who = S.portal === 'coord' ? CME().name : ADMIN.me.name;
      STORE.coo.changes.unshift([who, now().toISOString(), `Resource release — ${r.title} (${code})`, before, after, why]);
      if (S.portal === 'coord') cooLog('Learning Resources', `${code} · ${r.title}`, 'Release changed (D2)', before, after, why); else s4bLog('Learning Resources', `${code} · ${r.title}`, 'Release changed for batch', before, after, why);
      const notify = $('#rr-n').checked, hit = lockBefore.filter(([w, lb]) => lb !== s4bLockOf(w, r) || st === 'Unpublished');
      if (notify) hit.forEach(([w]) => notifyLearner(w.v, 'Resources', 'Resource release changed', `${r.title}: ${st === 'Unpublished' ? 'no longer available' : s4bLockOf(w, r) || 'available now'}.`, 'resources'));
      render(); toast(`Saved for ${code}.${notify ? ` ${plural(hit.length, 'learner')} notified (in-app; simulated email).` : ''}`);
    } }] });
};

/* ---------- S4-03 sessions: kept with the batch's events (one store), duration kept ---------- */
const s4bSess = code => (S4B().sess[code] = S4B().sess[code] || []); // sessions OWNED by the batch (the one record)
// A session can be shared: one record, kept with its organising batch, with other batches of the same programme taking part
const s4bAllSess = () => Object.values(S4B().sess).flat();
const s4bSessById = id => s4bAllSess().find(x => x.id === id);
const s4bCodesOf = x => [x.batch].concat(x.with || []);
const s4bSessFor = code => s4bAllSess().filter(x => s4bCodesOf(x).includes(code)); // owned or taking part
let s4bSeen = null; // while one calendar is drawn: a shared session is shown once
const s4bEvx = code => (S4B().evx[code] = S4B().evx[code] || {});
const _beS4b = batchEvents;
batchEvents = function (b) {
  // (demo batches read their learner's calendar, which also holds a copy of the sessions added here — counted once)
  const mine = s4bSessFor(b.code), sids = new Set(mine.map(s => s.id)), base = _beS4b.apply(this, arguments).filter(e => !sids.has(e.id)), orig = {}, x = s4bEvx(b.code), ov = (STORE.evOver || {})[b.code] || {};
  if (Object.keys(ov).length) batchEvents0(b).forEach(e => { orig[e.id] = new Date(e.end) - new Date(e.start); });
  const out = base.map(e => { let n = e; if (ov[e.id] && orig[e.id]) n = { ...n, end: new Date(new Date(n.start).getTime() + orig[e.id]).toISOString() }; const o = x[e.id]; if (o) { if (o.teacher) n = { ...n, teacher: o.teacher }; if (o.status === 'Cancelled') n = { ...n, cancelled: true, title: /^Cancelled — /.test(e.title) ? e.title : 'Cancelled — ' + e.title, reason: o.reason }; } return n; });
  return out.concat(mine.filter(s => !s4bSeen || !s4bSeen.has(s.id) && s4bSeen.add(s.id)).map(s => ({ id: s.id, type: 'class', title: (s.status === 'Cancelled' ? 'Cancelled — ' : '') + s.title, start: s.start, end: s.end, teacher: s.teacher, link: s.link, loc: s.loc, course: b.course, cancelled: s.status === 'Cancelled', reason: s.reason, s4: true, owner: s.batch, shared: (s.with || []).length ? s4bCodesOf(s) : null })));
};
// Date edits (Coordinator and Academic Admin, D7 / F5 — last save wins): sessions added here are moved in place; others keep their length
const _bevS4b = batchEvSet;
batchEvSet = function (b, e, iso) {
  const s = s4bSessById(e.id);
  if (s) { const d = new Date(s.end) - new Date(s.start); s.hist.unshift([now().toISOString(), s4bWho(), 'Rescheduled', fdt(s.start), fdt(iso), '']); s.start = iso; s.end = new Date(new Date(iso).getTime() + d).toISOString(); s4bSyncSess(s); return null; }
  const wv = BATCH_WORLD[b.code], src = wv && STORE.worlds[wv].events.find(x => x.id === e.id), d = src ? new Date(src.end) - new Date(src.start) : 0;
  const r = _bevS4b.apply(this, arguments); if (src && d > 0) src.end = new Date(new Date(iso).getTime() + d).toISOString(); return r;
};
// Learners of the batch get its sessions on their calendar: demo batches already hold theirs; sign-ups in other batches get a copy
const s4bWorldsOf = code => Object.values(STORE.worlds || {}).filter(w => w.flags && w.flags.nvq && w.flags.admitted && w.events && s4bBatchOfW(w) === code && (BATCH_WORLD[code] === w.v || (w.signup && w.signup.done)));
function s4bSyncWEv(w) {
  const code = s4bBatchOfW(w), b = code && ADMIN.batches.find(x => x.code === code); if (!b || !w.events) return;
  const demo = BATCH_WORLD[code] === w.v, evs = batchEvents(b);
  evs.filter(e => e.type === 'class' && (e.s4 || !demo)).forEach(e => { const id = demo ? e.id : 'bs-' + e.id; let we = w.events.find(x => x.id === id); if (!we) { we = { id, type: 'class', course: w.nvq.title, go: 'calendar' }; w.events.push(we); } Object.assign(we, { title: e.title, start: e.start, end: e.end, link: e.link || null, loc: e.loc || null, cancelled: !!e.cancelled }); });
  if (demo) { const x = s4bEvx(code); w.events.forEach(we => { const o = x[we.id]; if (o && o.status === 'Cancelled' && !we.cancelled) { we.title0 = we.title; we.title = 'Cancelled — ' + we.title; we.cancelled = true; } }); }
}
const s4bSyncBatch = code => s4bWorldsOf(code).forEach(s4bSyncWEv);
const s4bSyncSess = x => s4bCodesOf(x).forEach(s4bSyncBatch);
// One notification per person for a (shared) session: Coordinators, teachers and learners of every participating batch, de-duplicated
function s4bNotifySess(x, t, body, notifyLearners) {
  const bs = s4bCodesOf(x).map(s4bBatch).filter(Boolean), coords = new Set(bs.map(b => b.coord).filter(Boolean)), tch = new Set(bs.flatMap(b => b.teachers || []).concat(x.teacher ? [x.teacher] : [])), ws = new Map();
  if (notifyLearners) bs.forEach(b => s4bWorldsOf(b.code).forEach(w => ws.set(w.v, w)));
  coords.forEach(c => chCooNotify(c, t, body, 'c-timeline')); tch.forEach(n => tasNotify(t, n + ': ' + body, 't-calendar', 'Sessions')); ws.forEach(w => notifyLearner(w.v, 'Schedule', t, body, 'calendar'));
}
const _calS4b = SCREENS.calendar; SCREENS.calendar = p => { s4bSyncWEv(W); return _calS4b(p); };
const s4bNotifyBatch = (b, t, body, notifyLearners) => {
  if (b.coord) chCooNotify(b.coord, t, `${body} (${b.code})`, 'c-timeline');
  (b.teachers || []).forEach(n => tasNotify(t, `${n}: ${body} (${b.code})`, 't-calendar', 'Sessions'));
  if (notifyLearners) s4bWorldsOf(b.code).forEach(w => notifyLearner(w.v, 'Schedule', t, body, 'calendar'));
};
const s4bTeachers = () => activeStaff('Teacher');
const s4bEndOf = e => new Date(e.end) > new Date(e.start) ? new Date(e.end).getTime() : new Date(e.start).getTime() + 60 * 6e4;
// Conflicts are computed from the sessions themselves: the same cohort, or the same teacher, booked twice at once
const s4bLiveBatches = () => ADMIN.batches.filter(S4B_LIVE).concat([SHORT_BATCH()]);
const s4bClassEvs = () => { const m = new Map(); s4bLiveBatches().forEach(b => batchEvents(b).filter(e => e.type === 'class' && !e.cancelled).forEach(e => { const k = e.s4 ? 'S:' + e.id : b.code + '/' + e.id; if (!m.has(k)) m.set(k, { e, b: e.s4 ? s4bBatch(e.owner) || b : b, codes: e.s4 ? s4bCodesOf(s4bSessById(e.id)) : [b.code], k }); })); return [...m.values()]; };
const s4bMeet = (p, q) => p.some(c => q.includes(c));
const s4bOverlap = (x, y) => new Date(x.start).getTime() < s4bEndOf(y) && new Date(y.start).getTime() < s4bEndOf(x);
function s4bConflicts() {
  const ev = s4bClassEvs(), out = [];
  for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length; j++) { const A = ev[i], B = ev[j], same = s4bMeet(A.codes, B.codes), tch = A.e.teacher && A.e.teacher === B.e.teacher;
    if ((same || tch) && s4bOverlap(A.e, B.e)) { const [p, q] = [A, B].sort((m, n) => (m.e.s4 ? 1 : 0) - (n.e.s4 ? 1 : 0) || (m.b.code + m.e.id).localeCompare(n.b.code + n.e.id)); out.push({ id: 'CF:' + [p.k, q.k].sort().join('|'), what: same ? 'Cohort double-booked' : 'Teacher double-booked', detail: `${same ? p.b.label : p.e.teacher} — ${p.e.title} (${p.b.code}) and ${q.e.title} (${q.b.code}), ${fds(p.e.start)} ${ft(p.e.start)}`, a: p, b: q, src: 'a-scheduling', resolved: false }); } }
  return out;
}
kConflicts = function () { return s4bConflicts(); };
kConflictFor = function (b, e, iso, teacher) { const d = s4bEndOf(e) - new Date(e.start).getTime(), me = { start: iso, end: new Date(new Date(iso).getTime() + d).toISOString() }, k = e.s4 ? 'S:' + e.id : b.code + '/' + e.id, mc = e.s4 && s4bSessById(e.id) ? s4bCodesOf(s4bSessById(e.id)) : [b.code]; const hit = s4bClassEvs().find(x => x.k !== k && s4bOverlap(me, x.e) && (s4bMeet(mc, x.codes) || (teacher && x.e.teacher === teacher))); return hit ? `${hit.e.title} (${hit.b.code}) at ${fdt(hit.e.start)}${s4bMeet(mc, hit.codes) ? ' — same cohort' : ' — same teacher'}` : null; };
const s4bConfText = (b, start, mins, teacher, exceptId, withCodes) => { const me = { start, end: new Date(new Date(start).getTime() + mins * 6e4).toISOString() }, mc = [b.code].concat(withCodes || []); const hit = s4bClassEvs().find(x => !(x.e.s4 && x.e.id === exceptId) && s4bOverlap(me, x.e) && (s4bMeet(mc, x.codes) || (teacher && x.e.teacher === teacher))); return hit ? `${hit.e.title} (${hit.b.code}) at ${fdt(hit.e.start)}${s4bMeet(mc, hit.codes) ? ' — same cohort' : ' — same teacher'}` : null; };
// Sharing: which batches can take part (same programme, running or planned), and what a change affects
const s4bShareable = b => ADMIN.batches.filter(x => x.code !== b.code && S4B_LIVE(x) && s4PidOfTitle(x.course) && s4PidOfTitle(x.course) === s4PidOfTitle(b.course));
const s4bShareBox = (b, cur) => { const xs = s4bShareable(b); return `<fieldset class="stack full s4b-share" style="border:0;padding:0"><legend class="lbl">Shared class — other batches of ${esc(s4bProgShort(s4PidOfTitle(b.course)))} taking part (optional)</legend>${xs.length ? xs.map(x => `<label class="check"><input type="checkbox" class="se-w" value="${x.code}" ${(cur || []).includes(x.code) ? 'checked' : ''}> ${esc(x.label)} — ${x.code}</label>`).join('') : '<p class="xs muted">No other running or planned batch of this programme.</p>'}<span class="hint">One session for every batch ticked: the same teacher, time and meeting. Only batches of the same programme can take part.</span></fieldset>`; };
const s4bReadShare = () => $$('#modal-root .se-w:checked').map(x => x.value);
function s4bShareCheck(b, codes) {
  for (const c of codes) { const x = ADMIN.batches.find(y => y.code === c); if (!x) return 'Unknown batch ' + c; if (c === b.code) return 'The organising batch is already included'; if (!S4B_LIVE(x)) return x.code + ' is not running or planned'; if (s4PidOfTitle(x.course) !== s4PidOfTitle(b.course)) return `${x.code} is on another programme (${x.course}) — a class can only be shared within one programme`; }
  return '';
}
function s4bShareImpact(b, codes, was) {
  const all = [b.code].concat(codes), add = codes.filter(c => !(was || []).includes(c)), drop = (was || []).filter(c => !codes.includes(c)), learners = c => (ADMIN.batches.find(x => x.code === c) || {}).enrolled || 0;
  const vers = new Set(all.map(c => s3BatchVer(ADMIN.batches.find(x => x.code === c))).filter(Boolean)), wv = new Set(all.flatMap(c => s4bWorldsOf(c).map(w => w.nvq.progVersion || null)).filter(Boolean));
  return `<div class="note b-blue s4b-shimp">${ic('users')}<div class="small"><strong>Who takes part</strong><ul>${all.map(c => { const x = ADMIN.batches.find(y => y.code === c); return `<li>${esc(x.label)} — ${c}: ${plural(learners(c), 'learner')} enrolled${c === b.code ? ' (organising batch)' : add.includes(c) ? ' <strong>(added)</strong>' : ''}</li>`; }).join('')}${drop.map(c => `<li><span class="strike">${c}</span> — no longer taking part</li>`).join('')}</ul>Learners keep their own batch, programme version and progress; attending doesn't complete any module or criterion.${vers.size > 1 || wv.size > 1 ? `<br><strong>Check: the batches are on different programme versions</strong> (${[...new Set([...vers, ...wv])].map(v => 'Version ' + v).join(', ')}). The class is the same; each learner keeps their own version.` : ''}</div></div>`;
}
// Add a session (Super Admin / Academic Admin)
ACT.addSession = el => {
  if (!s4bSched()) return s4bRefuse('Scheduling', 'Sessions', 'add sessions');
  const fixed = el && el.dataset && el.dataset.b, bs = ADMIN.batches.filter(S4B_LIVE), code = fixed || ui('s4bSchedB', 'L3AC-JAN26');
  openModal({ title: 'Add session', size: 'lg', body: `<div class="form-grid">${fixed ? `<input type="hidden" id="se-b" value="${esc(fixed)}">` : `<div class="field full"><label for="se-b">Batch</label><select class="select" id="se-b" data-onchange="seConf">${bs.map(b => `<option value="${b.code}" ${b.code === code ? 'selected' : ''}>${esc(b.label)} — ${b.code}</option>`).join('')}</select></div>`}
    <div class="field full"><label for="se-n">Title / purpose</label><input class="input" id="se-n" value="Live class"></div>
    <div class="field"><label for="se-d">Date and start time (${tzl()})</label><input class="input" type="datetime-local" id="se-d" value="${D(14, '17:00').slice(0, 16)}" data-oninput="seConf"></div>
    <div class="field"><label for="se-m">Length (minutes)</label><input class="input num" type="number" min="15" max="480" id="se-m" value="90" data-oninput="seConf"></div>
    <div class="field"><label for="se-t">Teacher</label><select class="select" id="se-t" data-onchange="seConf">${s4bTeachers().map(n => `<option ${n === (s4bBatch(code) || { teachers: [] }).teachers[0] ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="se-l">Where</label><select class="select" id="se-l"><option value="zoom">Zoom meeting (simulated — a meeting reference is recorded)</option><option value="room">In person (classroom)</option></select></div>${fixed ? s4bShareBox(s4bBatch(fixed), []) : ''}</div><div id="se-c"></div><div id="se-i"></div><p class="xs muted">Learners of the batch (and of any batch taking part) see it on their calendar; the teacher and Coordinators are notified.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Add session', cls: 'btn-primary', fn: () => {
      const b = s4bBatch($('#se-b').value), t = $('#se-n').value.trim(), dv = $('#se-d').value, mins = +$('#se-m').value, teacher = $('#se-t').value;
      if (!b || !S4B_LIVE(b)) { fieldErr('#se-d', 'Choose a batch that is running or planned'); return false; }
      if (!t) { fieldErr('#se-n', 'Enter a title'); return false; } if (!dv) { fieldErr('#se-d', 'Choose a date and time'); return false; } if (!(mins >= 15 && mins <= 480)) { fieldErr('#se-m', 'Enter 15 to 480 minutes'); return false; }
      const shareW = s4bReadShare(), bad = s4bShareCheck(b, shareW); if (bad) { s4bLog('Scheduling', `${t} (${b.code})`, 'Blocked: share session', '—', shareW.join(', '), bad); fieldErr('#se-n', bad); return false; }
      if (shareW.length && S.s4bShareOk !== 'w:' + shareW.join()) { S.s4bShareOk = 'w:' + shareW.join(); $('#se-i').innerHTML = s4bShareImpact(b, shareW, []) + '<p class="small"><strong>Select "Add session" again to add the shared class.</strong></p>'; return false; }
      const start = new Date(dv + ':00Z').toISOString(), c = s4bConfText(b, start, mins, teacher, null, shareW);
      if (c && !S.s4bConfOk) { S.s4bConfOk = true; $('#se-c').innerHTML = `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Conflict:</strong> ${esc(c)}. Select "Add session" again to add it anyway.</div></div>`; return false; }
      S.s4bConfOk = false; S.s4bShareOk = ''; const S_ = S4B(), id = 'ss-' + (S_.n++), room = $('#se-l').value === 'room';
      const s = { id, batch: b.code, title: t, start, end: new Date(new Date(start).getTime() + mins * 6e4).toISOString(), teacher, link: room ? null : 'Zoom (simulated) — meeting 8' + id.replace(/\D/g, '') + '40 112', loc: room ? 'Classroom (in person)' : null, status: 'Scheduled', with: shareW, hist: [[now().toISOString(), ADMIN.me.name, 'Added', '—', fdt(start) + (shareW.length ? ' · shared with ' + shareW.join(', ') : ''), '']] };
      s4bSess(b.code).push(s); s4bSyncSess(s);
      STORE.aca.schedLog.unshift({ at: now().toISOString(), who: ADMIN.me.name, what: `Session — ${t} (${b.code})`, before: '—', after: `${fdt(start)} · ${teacher}`, reason: 'Added' });
      s4bLog('Scheduling', `${t} (${b.code})`, 'Session added', '—', `${fdt(start)} · ${mins} min · ${teacher}${shareW.length ? ' · shared with ' + shareW.join(', ') : ''}`, ''); s4bNotifySess(s, 'Session added', `${t} · ${fdt(start)}`, true);
      render(); toast('Session added. It is on the learner, teacher, coordinator and admin calendars.');
    } }] });
};
INP.seConf = () => { S.s4bConfOk = false; const b = s4bBatch($('#se-b').value), dv = $('#se-d').value; if (!b || !dv) return; const c = s4bConfText(b, new Date(dv + ':00Z').toISOString(), +$('#se-m').value || 60, $('#se-t').value, $('#se-x') ? $('#se-x').value : null, s4bReadShare()); $('#se-c').innerHTML = c ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Conflict:</strong> ${esc(c)}</div></div>` : `<p class="small" style="color:var(--green)">✓ No conflicts</p>`; };
// Edit / reschedule a session added here (date, length, teacher); the batch's own events use the existing edit (date, teacher)
ACT.s4bSessEdit = el => {
  if (!s4bSched()) return s4bRefuse('Scheduling', 'Sessions', 'edit sessions'); const s = s4bSessById(el.dataset.id), b = s && s4bBatch(s.batch); if (!s || !b) return; if (s.status === 'Cancelled') { toast('A cancelled session can\'t be edited.', 'err'); return; } S.s4bShareOk = '';
  const mins = Math.round((new Date(s.end) - new Date(s.start)) / 6e4);
  openModal({ title: 'Edit session', sub: esc(s.title) + ' · ' + b.code, body: `<dl class="kv"><dt>Current</dt><dd>${fdt(s.start)} · ${mins} min · ${esc(s.teacher)}</dd></dl><input type="hidden" id="se-b" value="${b.code}"><input type="hidden" id="se-x" value="${s.id}"><div class="form-grid"><div class="field"><label for="se-d">New date and time (${tzl()})</label><input class="input" type="datetime-local" id="se-d" value="${s.start.slice(0, 16)}" data-oninput="seConf"></div><div class="field"><label for="se-m">Length (minutes)</label><input class="input num" type="number" min="15" max="480" id="se-m" value="${mins}" data-oninput="seConf"></div><div class="field"><label for="se-t">Teacher</label><select class="select" id="se-t" data-onchange="seConf">${s4bTeachers().map(n => `<option ${n === s.teacher ? 'selected' : ''}>${n}</option>`).join('')}</select></div>${s4bShareBox(b, s.with || [])}</div><div id="se-c"></div><div id="se-i"></div><div class="field"><label for="se-r">Reason (required)</label><textarea class="textarea" id="se-r"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save change', cls: 'btn-primary', fn: () => {
      const r = mval('#se-r'); if (!r) { fieldErr('#se-r', 'Enter a reason'); return false; } const m2 = +$('#se-m').value; if (!(m2 >= 15 && m2 <= 480)) { fieldErr('#se-m', 'Enter 15 to 480 minutes'); return false; }
      const shareW = s4bReadShare(), bad = s4bShareCheck(b, shareW); if (bad) { s4bLog('Scheduling', `${s.title} (${b.code})`, 'Blocked: share session', (s.with || []).join(', ') || '—', shareW.join(', '), bad); fieldErr('#se-r', bad); return false; }
      const shareChanged = shareW.slice().sort().join() !== (s.with || []).slice().sort().join();
      if (shareChanged && S.s4bShareOk !== 'w:' + shareW.join()) { S.s4bShareOk = 'w:' + shareW.join(); $('#se-i').innerHTML = s4bShareImpact(b, shareW, s.with || []) + '<p class="small"><strong>Select "Save change" again to save.</strong></p>'; return false; }
      const start = new Date($('#se-d').value + ':00Z').toISOString(), teacher = $('#se-t').value, c = s4bConfText(b, start, m2, teacher, s.id, shareW);
      if (c && !S.s4bConfOk) { S.s4bConfOk = true; $('#se-c').innerHTML = `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Conflict:</strong> ${esc(c)}. Select "Save change" again to save anyway.</div></div>`; return false; }
      S.s4bConfOk = false; S.s4bShareOk = ''; const was = s4bCodesOf(s), sh = x => (x.length ? ' · shared with ' + x.join(', ') : ''), before = `${fdt(s.start)} · ${mins} min · ${s.teacher}${sh(s.with || [])}`; s.start = start; s.end = new Date(new Date(start).getTime() + m2 * 6e4).toISOString(); s.teacher = teacher; s.with = shareW; const after = `${fdt(s.start)} · ${m2} min · ${s.teacher}${sh(shareW)}`;
      s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Changed', before, after, r]); s4bSyncSess(s); was.filter(c => !s4bCodesOf(s).includes(c)).forEach(c => s4bWorldsOf(c).forEach(w => { w.events = w.events.filter(e => e.id !== s.id && e.id !== 'bs-' + s.id); }));
      STORE.aca.schedLog.unshift({ at: now().toISOString(), who: ADMIN.me.name, what: `Session — ${s.title} (${b.code})`, before, after, reason: r });
      s4bLog('Scheduling', `${s.title} (${b.code})`, shareChanged ? 'Session sharing changed' : 'Session changed', before, after, r); s4bNotifySess({ ...s, with: Array.from(new Set((s.with || []).concat(was.filter(c => c !== s.batch)))) }, 'Schedule changed', `${s.title} → ${fdt(s.start)}`, true); render(); toast('Saved. Every calendar is updated.');
    } }] });
};
// Cancel a class session (never a deadline, observation or Professional Discussion)
ACT.s4bSessCancel = el => {
  const b = s4bBatch(el.dataset.b); if (!b) return; if (!s4bSched()) return s4bRefuse('Scheduling', `${b.code} sessions`, 'cancel sessions');
  const e = batchEvents(b).find(x => x.id === el.dataset.id); if (!e || e.type !== 'class') { toast('Only class sessions can be cancelled here.', 'err'); return; } if (e.cancelled) { toast('Already cancelled.', 'info'); return; }
  reasonDlg({ title: 'Cancel session — ' + esc(e.title), ok: 'Cancel session', danger: true, body: `<p class="small">${fdt(e.start)} · ${esc(b.label)}. It stays on calendars marked "Cancelled"; learners of the batch, the teacher and the Coordinator are notified (in-app; email simulated).</p>`, onOk: r => { s4bCancel(b, e, r); render(); toast('Session cancelled. Every calendar shows it as cancelled.'); } });
};
function s4bCancel(b, e, r) {
  const s = e.s4 ? s4bSessById(e.id) : null; if (s) { s.status = 'Cancelled'; s.reason = r; s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Cancelled', fdt(s.start), 'Cancelled', r]); } else s4bEvx(b.code)[e.id] = { ...(s4bEvx(b.code)[e.id] || {}), status: 'Cancelled', reason: r };
  if (s) s4bSyncSess(s); else s4bSyncBatch(b.code); STORE.aca.schedLog.unshift({ at: now().toISOString(), who: ADMIN.me.name, what: `Session — ${e.title} (${b.code})`, before: fdt(e.start), after: 'Cancelled', reason: r });
  s4bLog('Scheduling', `${e.title} (${s ? s.batch : b.code})`, 'Session cancelled', fdt(e.start), 'Cancelled', r); if (s) s4bNotifySess(s, 'Session cancelled', `${s.title} on ${fdt(s.start)}`, true); else s4bNotifyBatch(b, 'Session cancelled', `${e.title} on ${fdt(e.start)}`, true);
}
// Resolving a conflict changes the session itself, then the conflict is worked out again
ACT.kResolve = el => {
  if (!s4bSched()) return s4bRefuse('Scheduling', 'Conflicts', 'resolve conflicts'); const c = s4bConflicts().find(x => x.id === el.dataset.id); if (!c) { toast('This conflict no longer exists.', 'info'); render(); return; }
  const opt = (x, k) => `<option value="${k}">${esc(x.e.title)} (${x.b.code}) — ${fdt(x.e.start)}${x.e.teacher ? ' · ' + esc(x.e.teacher) : ''}</option>`;
  reasonDlg({ title: 'Resolve conflict — ' + c.what, ok: 'Apply', body: `<p class="small">${esc(c.detail)}</p><div class="field"><label for="kr-a">Resolution</label><select class="select" id="kr-a"><option value="move">Move the session by one hour</option><option value="teacher">Assign a different teacher</option><option value="cancel">Cancel the session</option></select></div><div class="field"><label for="kr-s">Session to change</label><select class="select" id="kr-s">${opt(c.b, 'b')}${opt(c.a, 'a')}</select></div><div class="field"><label for="kr-t">Teacher (for "Assign a different teacher")</label><select class="select" id="kr-t">${s4bTeachers().filter(n => n !== c.b.e.teacher).map(n => `<option>${n}</option>`).join('')}</select></div><p class="xs muted">After the change the conflict is worked out again; it is only cleared if the sessions no longer clash.</p>`,
    onOk: r => {
      const how = $('#kr-a').value, x = $('#kr-s').value === 'a' ? c.a : c.b, b = x.b, e = x.e, s = e.s4 ? s4bSessById(e.id) : null; let what;
      if (how === 'cancel') { s4bCancel(b, e, r); what = 'Cancelled ' + e.title; }
      else if (how === 'move') { const iso = new Date(new Date(e.start).getTime() + 60 * 6e4).toISOString(); batchEvSet(b, e, iso); if (s) s4bSyncSess(s); else s4bSyncBatch(b.code); what = `Moved ${e.title} to ${fdt(iso)}`; if (s) s4bNotifySess(s, 'Schedule changed', `${e.title} → ${fdt(iso)}`, true); else s4bNotifyBatch(b, 'Schedule changed', `${e.title} → ${fdt(iso)}`, true); }
      else { const t = $('#kr-t').value; if (!t || t === e.teacher) { fieldErr('#kr-t', 'Choose a different teacher'); return false; } if (s) { s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Teacher changed', s.teacher, t, r]); s.teacher = t; } else s4bEvx(b.code)[e.id] = { ...(s4bEvx(b.code)[e.id] || {}), teacher: t }; tasNotify('Session assigned to you', `${t}: ${e.title} · ${fdt(e.start)} (${b.code})`, 't-calendar', 'Sessions'); what = `${e.title}: teacher ${e.teacher} → ${t}`; }
      const still = s4bConflicts().some(y => y.id === c.id);
      STORE.aca.schedLog.unshift({ at: now().toISOString(), who: ADMIN.me.name, what: `Conflict — ${c.detail}`, before: c.what, after: what + (still ? ' (still conflicting)' : ' (resolved)'), reason: r });
      s4bLog('Scheduling', c.detail, still ? 'Conflict change applied — still conflicting' : 'Conflict resolved', c.what, what, r); render();
      toast(still ? `Applied, but the sessions still clash — ${what}. Try another resolution.` : 'Resolved — the sessions no longer clash.', still ? 'err' : undefined);
    } });
};
// Teachers also see a session that has been assigned to them in another batch
const _ccS4b = cooCalendar;
cooCalendar = function (bs) { s4bSeen = new Set(); try { if (S.portal === 'staff' && typeof TME === 'function') { const me = TME().name, more = s4bLiveBatches().filter(b => !bs.some(x => x.code === b.code) && batchEvents(b).some(e => e.teacher === me && (e.s4 || s4bEvx(b.code)[e.id]))); bs = bs.concat(more); } s4bSeen = new Set(); return _ccS4b.call(this, bs); } finally { s4bSeen = null; } };
const _kCalS4b = kCalBody; kCalBody = function () { s4bSeen = new Set(); try { return _kCalS4b.apply(this, arguments); } finally { s4bSeen = null; } };
// A Coordinator's date edit of a shared class: only the organising batch's Coordinator (the class belongs to every batch taking part)
const _cooEdS4b = ACT.cooEditEv;
ACT.cooEditEv = el => { const x = s4bSessById(el.dataset.id); if (x && (x.with || []).length && S.portal === 'coord' && (s4bBatch(x.batch) || {}).coord !== CME().name) return s4bRefuse('Scheduling', `${x.title} (${x.batch})`, 'move a shared class organised by another batch'); return _cooEdS4b(el); };

// A learner who has just enrolled gets their resources and batch sessions straight away
const _ccS4b2 = chComplete;
chComplete = function (w) { const r = _ccS4b2.apply(this, arguments); if (w && w.signup && w.signup.done) { s4bSyncW(w); s4bSyncWEv(w); } return r; };

/* ---------- Scheduling console (every live batch) and the batch Schedule tab ---------- */
const s4bEvRow = (b, e, can) => `<tr><td class="nowrap small">${fds(e.start)} ${ft(e.start)}–${ft(new Date(s4bEndOf(e)).toISOString())}</td><td><span class="legend"><span><i class="lg-${e.type}"></i>${EVLBL[e.type]}</span></span></td><td>${esc(e.title)}${e.cancelled ? ' ' + chip('Cancelled', 'red') : e.updated ? ' ' + chip('Updated', 'amber') : ''}${e.shared ? ` ${chip('Shared class', 'blue')}<div class="xs muted">${e.owner === b.code ? 'Organised here' : 'Organised by ' + esc(e.owner)} · with ${esc(e.shared.filter(c => c !== b.code).join(', '))}</div>` : ''}${e.reason ? `<div class="xs muted">Reason: ${esc(e.reason)}</div>` : ''}</td><td class="small">${esc(e.teacher || '—')}</td><td class="small">${esc(e.link || e.loc || '—')}</td><td class="nowrap">${can && e.type === 'class' && !e.cancelled ? `${e.s4 ? `<button class="btn btn-sm" data-act="s4bSessEdit" data-b="${b.code}" data-id="${e.id}">Edit</button>` : `<button class="btn btn-sm" data-act="kEditEv" data-b="${b.code}" data-id="${e.id}">Edit</button>`} <button class="btn btn-sm" data-act="s4bSessCancel" data-b="${b.code}" data-id="${e.id}">Cancel</button>` : ''}</td></tr>`;
const s4bSchedTable = (b, can, upcoming) => { const evs = batchEvents(b).filter(e => !upcoming || s4bEndOf(e) >= now().getTime()).sort((x, y) => new Date(x.start) - new Date(y.start)); return evs.length ? `<div class="tbl-wrap"><table class="tbl dense s4b-sched"><thead><tr><th>When</th><th>Type</th><th>Item</th><th>Teacher</th><th>Meeting</th><th></th></tr></thead><tbody>${evs.map(e => s4bEvRow(b, e, can)).join('')}</tbody></table></div>` : '<p class="small muted">No upcoming items.</p>'; };
const _schedS4b = SCREENS['a-scheduling'];
SCREENS['a-scheduling'] = p => {
  if ((p.tab || 'console') !== 'console') return _schedS4b(p);
  const bs = ADMIN.batches.filter(S4B_LIVE), code = bs.some(b => b.code === ui('s4bSchedB', '')) ? ui('s4bSchedB', '') : 'L3AC-JAN26', b = bs.find(x => x.code === code) || bs[0], can = s4bSched(), conf = s4bConflicts(), log = STORE.aca.schedLog;
  return `${pageA('Scheduling & Calendars')}${subtabs([['console', 'Scheduling console'], ['monitor', 'Calendar monitoring']], 'console', 'a-scheduling')}
  ${conf.length ? `<section class="card"><h2>Conflicts (${conf.length})</h2><ul class="list">${conf.map(c => `<li class="li"><div class="li-b"><strong class="small">${esc(c.what)}</strong><span class="xs muted">${esc(c.detail)}</span></div>${can ? `<button class="btn btn-sm" data-act="kResolve" data-id="${c.id}">Resolve</button>` : ''}</li>`).join('')}</ul></section>` : `<div class="note b-green">${ic('check')}<div class="small">No conflicts detected.</div></div>`}
  <section class="card"><div class="row-b"><h2>${esc(b.label)} — ${b.code}</h2><div class="row"><div class="field"><label for="s4b-sb">Batch</label><select class="select" id="s4b-sb" data-onchange="s4bSchedB">${bs.map(x => `<option value="${x.code}" ${x.code === b.code ? 'selected' : ''}>${esc(x.label)} — ${x.code}</option>`).join('')}</select></div>${can ? `<button class="btn btn-sm btn-primary" data-act="addSession" data-b="${b.code}">Add session</button>` : ''}</div></div><p class="small">${fd(b.start)} – ${fd(b.end)} · ${esc(b.mode || '')} · Teacher ${esc((b.teachers || []).join(', ') || '—')}</p>${s4bSchedTable(b, can, true)}<div class="row"><button class="btn btn-sm" data-act="learnerDl">Per-learner deadline override</button></div></section>
  <section class="card"><h2>Change log</h2>${log.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>Who</th><th>Item</th><th>Before → after</th><th>Reason</th></tr></thead><tbody>${log.map(l => `<tr><td class="nowrap small">${fdt(l.at)}</td><td>${esc(l.who)}</td><td class="small">${esc(l.what)}</td><td class="small"><span class="strike">${esc(l.before)}</span> → <strong>${esc(l.after)}</strong></td><td class="small">${esc(l.reason)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No schedule changes yet.</p>'}</section>
  ${auditPanel(a => a.module === 'Scheduling' || a.module === 'Assignments', 'Before / after log')}`;
};
INP.s4bSchedB = el => { setUi('s4bSchedB', el.value); render(); };

/* ---------- S4-02 batch details, with an impact preview ---------- */
const s4bCanBatch = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()));
const s4bStarted = b => !!b && (['In Progress', 'Completed', 'Archived'].includes(b.status) || new Date(b.start) <= now());
function s4bImpact(b, n) {
  const ws = Object.values(STORE.worlds || {}).filter(w => w.signup && w.signup.batch === b.code && w.nvq), evs = batchEvents(b), gen = evs.filter(e => !e.s4 && !BATCH_WORLD[b.code] && !((STORE.evOver || {})[b.code] || {})[e.id]), conf = evs.filter(e => e.s4 || ((STORE.evOver || {})[b.code] || {})[e.id]);
  const asg = (typeof s2Defs === 'function' ? s2Defs() : []).filter(d => (d.batches || []).includes(b.code)), shift = Math.round((new Date(n.start) - new Date(b.start)) / DAY), dep0 = chDepositOk(b), dep1 = chDepositOk({ start: n.start });
  return `<div class="note b-blue s4b-impact">${ic('info')}<div class="small"><strong>Impact of these changes</strong><ul>
    <li>Learners: ${plural(b.enrolled, 'learner')} enrolled${ws.length ? ` (with records: ${ws.map(w => esc(chFullName(w))).join(', ')})` : ''}. Their deposits, hold dates and payment plans don't change; the batch dates on their pages do.</li>
    <li>Sessions: ${plural(conf.length, 'confirmed or rescheduled session')} keep their dates. ${gen.length ? `${plural(gen.length, 'generated timetable item')} follow the start date (${shift >= 0 ? '+' : ''}${shift} days).` : 'No generated timetable items.'}</li>
    <li>Assignment deadlines: ${asg.length ? `${plural(asg.length, 'published assignment')} keep their due dates — change them in Assignments if needed.` : 'none published to this batch.'}</li>
    <li>Programme timetable: ${fd(n.start)} – ${fd(n.end)} (was ${fd(b.start)} – ${fd(b.end)}).</li>
    <li>New applicants: ${dep1 ? 'a deposit is offered (starts in 28 days or more)' : 'instalments only (starts in under 28 days)'}${dep0 !== dep1 ? ` — <strong>changed from ${dep0 ? 'deposit offered' : 'instalments only'}</strong>` : ''}.</li>
    <li>Notifications: the Coordinator, teachers and assessors${ws.length ? ' and the learners with records' : ''} are told (in-app; email simulated).</li></ul></div></div>`;
}
ACT.s4bBatchEdit = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id); if (!b) return; if (!s4bCanBatch()) return s4bRefuse('Batches', `${b.label} (${b.code})`, 'edit batch details');
  if (['Completed', 'Archived', 'Cancelled'].includes(b.status)) { toast('This batch is closed — its details can\'t be changed.', 'err'); return; }
  const started = s4bStarted(b); S.s4bImpOk = '';
  openModal({ title: 'Edit batch details — ' + b.code, size: 'lg', body: `${started ? `<div class="note b-amber">${ic('lock')}<div class="small">The batch has started: dates and mode can't change (learners aren't moved). Capacity and description can.</div></div>` : ''}<div class="form-grid">
    <div class="field"><label for="bd-s">Start date</label><input class="input" type="date" id="bd-s" value="${b.start.slice(0, 10)}" ${started ? 'disabled' : ''}></div><div class="field"><label for="bd-e">End date</label><input class="input" type="date" id="bd-e" value="${b.end.slice(0, 10)}" ${started ? 'disabled' : ''}></div>
    <div class="field"><label for="bd-m">Delivery mode</label><select class="select" id="bd-m" ${started ? 'disabled' : ''}>${['Online', 'Classroom', 'Blended'].map(m => `<option ${m === b.mode ? 'selected' : ''}>${m}</option>`).join('')}</select></div><div class="field"><label for="bd-c">Capacity</label><input class="input num" type="number" min="1" id="bd-c" value="${b.cap}"><span class="hint">${b.enrolled} enrolled — capacity can't go below that.</span></div>
    <div class="field full"><label for="bd-d">Description</label><textarea class="textarea" id="bd-d">${esc(b.desc || '')}</textarea></div><div class="field full"><label for="bd-r">Reason (required)</label><textarea class="textarea" id="bd-r"></textarea></div></div><div id="bd-i"></div><p class="xs muted">Staff and the Academic Coordinator are changed on the Staff tab (assessors in the Assessors panel).</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Review impact and save', cls: 'btn-primary', fn: () => {
      const n = { start: started ? b.start : new Date($('#bd-s').value + 'T09:00:00Z').toISOString(), end: started ? b.end : new Date($('#bd-e').value + 'T17:00:00Z').toISOString(), mode: started ? b.mode : $('#bd-m').value, cap: +$('#bd-c').value, desc: $('#bd-d').value.trim() }, r = mval('#bd-r');
      if (!started && (!$('#bd-s').value || !$('#bd-e').value)) { fieldErr('#bd-s', 'Enter both dates'); return false; }
      if (new Date(n.end) <= new Date(n.start)) { fieldErr('#bd-e', 'The end date must be after the start date'); return false; }
      if (!started && new Date(n.start) <= now()) { fieldErr('#bd-s', 'The start date must be in the future'); return false; }
      if (!(Number.isInteger(n.cap) && n.cap >= 1)) { fieldErr('#bd-c', 'Enter a whole number'); return false; }
      if (n.cap < b.enrolled) { fieldErr('#bd-c', `Capacity can't be below the ${b.enrolled} learners enrolled`); return false; }
      if (!r) { fieldErr('#bd-r', 'Enter a reason'); return false; }
      const same = n.start === b.start && n.end === b.end && n.mode === b.mode && n.cap === b.cap && n.desc === (b.desc || ''); if (same) { fieldErr('#bd-c', 'Nothing has changed'); return false; }
      const sig = JSON.stringify(n); if (S.s4bImpOk !== sig) { S.s4bImpOk = sig; $('#bd-i').innerHTML = s4bImpact(b, n) + '<p class="small"><strong>Select "Review impact and save" again to save.</strong></p>'; return false; }
      S.s4bImpOk = ''; const dt_ = x => `${fd(x.start)} – ${fd(x.end)} · ${x.mode} · cap ${x.cap}${x.desc ? ' · ' + x.desc : ''}`, before = dt_({ ...b, desc: b.desc || '' }), datesChanged = n.start !== b.start || n.end !== b.end;
      Object.assign(b, { start: n.start, end: n.end, mode: n.mode, cap: n.cap, desc: n.desc });
      Object.values(STORE.worlds || {}).filter(w => w.signup && w.signup.batch === b.code && w.nvq).forEach(w => { Object.assign(w.nvq, { batchStart: b.start, start: b.start, end: b.end, batchEnd: b.end }); if (w.admission) w.admission.batchStart = b.start; });
      (b.detailsHist = b.detailsHist || []).unshift([now().toISOString(), ADMIN.me.name, before, dt_(b), r]); s4bSyncBatch(b.code);
      s4bLog('Batches', `${b.label} (${b.code})`, 'Batch details changed', before, dt_(b), r);
      if (b.coord) chCooNotify(b.coord, 'Batch details changed', `${b.code}: ${dt_(b)}`, 'c-batches.' + b.code);
      (b.teachers || []).concat(b.assessors || []).forEach(x => tasNotify('Batch details changed', `${x}: ${b.code} — ${dt_(b)}`, 't-dashboard', 'Caseload'));
      if (datesChanged) s4bWorldsOf(b.code).concat(Object.values(STORE.worlds || {}).filter(w => w.signup && w.signup.batch === b.code && !w.signup.done)).forEach(w => notifyLearner(w.v, 'Schedule', 'Your batch dates changed', `${b.label}: ${fd(b.start)} – ${fd(b.end)}.`, 'dashboard'));
      closeModal(); render(); toast('Batch details saved and audited.');
    } }] });
};
const _bdS4b = batchDetail;
batchDetail = function (code, t) {
  let h = _bdS4b.apply(this, arguments); const b = ADMIN.batches.find(x => x.code === code); if (!b) return h;
  const editBtn = s4bCanBatch() && !['Completed', 'Archived', 'Cancelled'].includes(b.status) ? `<button class="btn btn-sm" data-act="s4bBatchEdit" data-id="${b.code}">Edit details</button>` : '';
  h = h.replace('<div class="row">', `<p class="small s4b-bdates">${fd(b.start)} – ${fd(b.end)} · ${esc(b.mode || '')} · capacity ${b.cap}${b.desc ? ` · ${esc(b.desc)}` : ''}</p><div class="row">${editBtn}`);
  if ((t || 'roster') === 'schedule') h = h.replace(/<section class="card"><ul class="list small"><li class="li">Weekly class[\s\S]*?<\/section>/, `<section class="card"><div class="row-b"><h2>Schedule</h2>${s4bSched() && S4B_LIVE(b) ? `<button class="btn btn-sm btn-primary" data-act="addSession" data-b="${b.code}">Add session</button>` : ''}</div>${s4bSchedTable(b, s4bSched() && S4B_LIVE(b), false)}<button class="btn btn-sm" data-go="a-scheduling">Open scheduling console</button></section>`);
  if (t === 'audit' && b.detailsHist) h += `<section class="card"><h3>Details history</h3><ul class="list small">${b.detailsHist.map(x => `<li class="li">${fdt(x[0])} · ${esc(x[1])} · <span class="strike">${esc(x[2])}</span> → ${esc(x[3])} · ${esc(x[4])}</li>`).join('')}</ul></section>`;
  return h;
};

/* ---------- S4-04 Coordinator changes notify both coordinators ---------- */
const _ccoordS4b = changeCoordinator;
changeCoordinator = function (code, to) {
  const b = ADMIN.batches.find(x => x.code === code), from = b && b.coord, r = _ccoordS4b.apply(this, arguments);
  if (b && from && from !== to) { chCooNotify(from, 'Batch reassigned', `${b.label} (${b.code}) is now coordinated by ${to}. Your feedback stays attributed to you.`, 'c-dashboard'); chCooNotify(to, 'New batch assigned to you', `${b.label} (${b.code}) — from ${from}`, 'c-batches.' + b.code); }
  return r;
};
const _bsS4b = ACT.batchStaff;
ACT.batchStaff = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id), before = b && b.coord; _bsS4b(el); if (!MODAL || !b) return;
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a) return; const g = a.fn;
  a.fn = (...x) => { const res = g(...x); if (res !== false && !before && b.coord) chCooNotify(b.coord, 'New batch assigned to you', `${b.label} (${b.code})`, 'c-batches.' + b.code); return res; };
};

/* ---------- Records ---------- */
UXC.push(['Setup S4b', 'Setup fixes — learning resources, batch management and scheduling (S4-01 … S4-04)', [
  'S4-01 Learning resources: "Add resource" saves the title, description, type (PDF, DOCX, PPT, Vimeo video, SCORM or link), the file name or URL, the programme and module (from the programme\'s published structure) and the release rule (immediately, on a date, or after a module is complete) as a Draft. Edit, New version (earlier versions kept), Publish, Unpublish, Retire, Preview, Versions and Access log (from learners\' real progress) all work and are audited. Published resources reach the learners of that programme and module (their enrolled structure), in their module\'s group; learners\' progress, the answer keys and the "Open assessment" links are kept. A locked resource can\'t be opened. Teachers add and edit Draft resources for the programmes of their batches; admins publish. Files are simulated (the name is recorded). Seed: the admin rows were reconciled with what learners already see (RS-06 Published; RS-09 added for the Assignment 3 template); the two short-course rows are managed in the course editor (S1).',
  'S4-01 Coordinator release changes: Modules & Content → "Edit release" stores the rule and status for that batch only; its learners are updated, other batches aren\'t, and a resource of another programme can\'t be released to the batch. "Notify affected learners" notifies only the learners whose access changed.',
  'S4-02 Batch details: "Edit details" (Super Admin, Academic Admin) changes start and end dates, delivery mode, capacity (not below the number enrolled) and description before the batch starts; once started, capacity and description only. Saving first shows the impact (learners, confirmed and generated sessions, assignment deadlines, timetable, deposit eligibility for new applicants, who is notified). Deposits, holds and payment plans never change; confirmed sessions keep their dates; generated timetable items follow the start date.',
  'S4-03 Sessions: "Add session" creates a real session (batch, title, date and time, length, teacher, simulated Zoom reference or classroom). Sessions can be edited / rescheduled (length kept) and cancelled with a reason (shown as cancelled everywhere). Date edits keep each event\'s length (they used to collapse it). Conflicts are worked out from the sessions themselves (same cohort or same teacher at the same time); "Resolve" moves a session by one hour, assigns another teacher to that session, or cancels it, then checks again — it only says "Resolved" when the clash is gone. The scheduling console covers every running or planned batch.',
  'S4-04 Calendars: one store feeds the learner calendar (learners of the batch only), the teacher calendar (including a session assigned to them elsewhere), the Coordinator timeline, the Academic Admin calendar and the batch Schedule tab. Changing the Academic Coordinator (either path) notifies the previous and the new Coordinator.',
  'Seed: the two dashboard conflicts are now real sessions — "Live Q&A: moving and handling" (Moving and Handling short course, Marcus Bell) at the same time as Leicester Cohort 7\'s class, and Croydon Cohort 4\'s weekly class and classroom day on the same afternoon (they now show on Grace Mensah\'s calendar). Limits: the short-course Q&A is shown on staff calendars only; email and Zoom are simulated.']]);
UXC.push(['Setup S4b', 'Setup fixes — shared classes (client clarification) and a read-only queue', [
  'Shared classes: the client confirmed Fully Assisted and Self-Paced are two delivery modes of one NVQ programme and Self-Paced learners may join selected classes. A session can now be shared: one session record kept with its organising batch, plus the other batches of the same programme ticked in "Add session" / "Edit session". Saving a sharing change first shows who takes part (batches and learners) and any programme-version difference; batches of another programme are refused (also when forced), and only the Super Admin / Academic Admin can share — refusals are logged. The one session shows on the calendars of the learners of every batch taking part, in each batch\'s Schedule tab (marked "Shared class", organised here / by …), once on the teacher\'s and the admin calendars. Edits, rescheduling and cancelling change the one record and reach every batch; each person is notified once. Conflicts treat the shared class as one session: no false clash between its batches; a separate session in any of them, or the same teacher elsewhere, is still a clash. Only the organising batch\'s Coordinator can move a shared class. Learners keep their batch, programme version, payments and progress; attending completes nothing.',
  'Queue read fix: opening the dashboards or the Approvals Queue used to write an empty notes list onto an applicant\'s documents (Priya Raman\'s "Highest qualification certificate": _notes undefined → []), admission record or requests (admin-data.js allQueue). Reviewer notes on queue items are now kept with the queue (STORE.qNotes, by item id); applicants\' records are never changed by reading.',
  'Not built (pending decisions): a batch can\'t yet be labelled Fully Assisted or Self-Paced — the support type is still per programme (P-31) and drives the observation fee (CH-38, on hold); the per-batch limit on Self-Paced classes is not configurable yet. Attendance: the Zoom registers (Attendance) are a separate, name-based list and S4b sessions don\'t create registers, so attendance for a shared class can\'t be recorded per learner yet — follow-up needed.']]);
const _aIdxS4b = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS4b(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Learning Resources (add, version, publish)', { act: 'aJump', t: 'a-resources' }, 'S4-01 — resources reach the learners of their programme and module.'),
  chIdxLi('Batch → Edit details and Schedule tab', { act: 'aJump', t: 'a-batches.L3AC-NOV26-LEI.schedule' }, 'S4-02 / S4-03 — batch details with an impact preview; the batch\'s real sessions.'),
  chIdxLi('Scheduling console (sessions and conflicts)', { act: 'aJump', t: 'a-scheduling' }, 'S4-03 / S4-04 — add, edit, cancel sessions; resolve real conflicts.')].join('')}`);

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) s4bInit();
