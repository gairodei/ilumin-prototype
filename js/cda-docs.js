/* ============================================================
   CDA-A — Course document requirements (17 Nov 2026; PD-CDA-A* in PROVISIONAL-DECISIONS.md). Loads after cf2-demo.js.
   A1 NVQ programme builder: a "Documents" step after Course Details (Course Details · Documents · Curriculum & Outcomes · …).
      It holds the programme's required enrolment documents (the S4a checklist, S4().lists — the one source), moved out of
      Offer Letters. Old addresses (tab "docs") open it. Inherited "Section N" wording keeps meaning the step it named.
   A2 Editing: add, edit (name, instructions, mandatory / optional, formats as checkboxes, maximum size, expiry, region), reorder,
      retire / restore, and remove an item no application has used. An applicant preview shows the list as applicants will get it.
   A3 Versioning (supersedes the S4-05 / CB3 rule that a published programme's checklist changed in place for new applicants):
      - Draft programme (never published): edited directly; each change is a new checklist version (unchanged).
      - Published version with a draft version: changes are staged on the draft (STORE.cda.stage[pid]) and applied as a new checklist
        version when that programme version is published; until then new applicants keep the published list.
      - Published version without a draft: read-only — "Create a new version" first. Retired / archived: read-only.
      Applications keep the copy made when they started (w.docs / ap.docs, signup.checklistV, ap.cf2Ck) — nothing here rewrites them.
   A5 Short courses: the CF2 "Admission documents" list is the course's "Documents" tab, next to Details, with reorder, remove (unused)
      and the same format checkboxes. Purchase and access rules are unchanged; documents never gate access.
   A6 Every action checks the role and the programme state itself (admin portal, S4a roles), not just the buttons.
   Prototype only: browser-side checks. Production must enforce the same rules on the server.
   ============================================================ */
'use strict';

const CDA = () => (STORE.cda = STORE.cda || { stage: {}, files: [], n: 0 });
const _isCDA = initStore; initStore = function () { STORE.cda = null; const r = _isCDA.apply(this, arguments); CDA(); return r; };
const cdaMe = () => (S.portal === 'admin' && ADMIN && ADMIN.me ? ADMIN.me.name : S.portal === 'staff' && typeof TME === 'function' ? TME().name : S.portal === 'coord' && typeof CME === 'function' ? CME().name : '—');
const cdaClone = x => JSON.parse(JSON.stringify(x));
const CDA_FMTS = ['PDF', 'JPG', 'PNG', 'DOCX'];
const cdaFmtToks = s => CDA_FMTS.filter(f => new RegExp('\\b' + f + '\\b', 'i').test(String(s || '')));
const cdaFmtTxt = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' or ' + a[a.length - 1]);
let CDA_FIXTURE = false; // the client demo's own set-up (cfDemoChecklist) runs before anyone uses the programme

/* ---------- A1. The Documents step ---------- */
if (!CB_SECTIONS.some(s => s[0] === 'admdocs')) CB_SECTIONS.splice(1, 0, ['admdocs', 'Documents']);
if (typeof CB_RV_SEC !== 'undefined') CB_RV_SEC.splice(0, CB_RV_SEC.length, ...CB_SECTIONS.filter(x => x[0] !== 'review'));
Object.assign(CB_ROUTE, { admdocs: ['admdocs', null], docs: ['admdocs', 'docs'] });
CBR_HINT.admdocs = 'The documents applicants upload: mandatory or optional, formats, size and expiry.';
// Inherited "Section N" wording was numbered before this step existed: a bare number still means the step it named
cbcSteps = function (s, pr, html = true) {
  if (typeof s !== 'string' || !/\bSection [1-8]\b/.test(s)) return s;
  const steps = (pr && typeof cbrSteps === 'function' ? cbrSteps(pr) : CB_SECTIONS).filter(x => x[0] !== 'admdocs'), name = k => (CB_SECTIONS.find(x => x[0] === k) || [])[1];
  return s.replace(CBC3_SEC, (m, n, nm) => {
    const k = nm ? (CBC3_NAMES.find(([, re]) => re.test(nm.replace(/&amp;/g, '&'))) || [])[0] : (steps[+n - 1] || [])[0], t = k && name(k);
    return t ? (html ? t.replace(/&/g, '&amp;') : t) : m;
  });
};
const _bodyCDA = cbrBody;
cbrBody = function (pr, sec) { return sec === 'admdocs' ? cdaDocsPanel(pr) : _bodyCDA.apply(this, arguments); };
const _panelsCDA = cbPanels;
cbPanels = function (pr, sec) {
  if (sec === 'admdocs') return [['docs', 'Required enrolment documents', () => { const d = document.createElement('div'); d.innerHTML = cdaDocsPanel(pr); return cbHtml(d, pr); }]];
  const p = _panelsCDA.apply(this, arguments); return sec === 'documents' ? p.filter(x => x[0] !== 'docs') : p;
};
// Offer Letters keeps the letters; the checklist moved to Documents (a pointer replaces the fold)
const _lettersCDA = cbr2Letters;
cbr2Letters = function (pr) {
  const d = document.createElement('div'); d.innerHTML = _lettersCDA.apply(this, arguments);
  d.querySelectorAll('#cbr-docs').forEach(n => n.remove());
  return d.innerHTML + `<p class="small cda-moved">${ic('info', 14)} The documents applicants upload are set in <button class="linklike" data-go="a-programmes" data-id="${esc(pr.id)}" data-tab="admdocs">Documents</button>.</p>`;
};
// Review & Publish: the Documents step's own summary; Offer Letters summarises the letter only
const _rvSumCDA = cbRvSummary;
cbRvSummary = function (pr, k) {
  if (k === 'admdocs') {
    const m = cdaMode(pr), st = m === 'stage' ? cdaStageOf(pr) : null, items = (st ? st.items : s4List(pr.id).items).filter(i => i.status === 'Active'), ch = st ? cdaDiff(pr) : [];
    return cbRvDl([['Required enrolment documents', `${st ? `Version ${st.pv} (draft) list` : `Checklist version ${s4List(pr.id).v}`} · ${plural(items.length, 'document')} (${items.filter(i => i.mand).length} mandatory, ${items.filter(i => !i.mand).length} optional)`],
      st ? ['Changes on publication', ch.length ? esc(ch.join(' · ')) : cbRvNone('No changes to the published list')] : null]);
  }
  const h = _rvSumCDA.apply(this, arguments);
  return k === 'documents' ? h.replace(/<dt>Required enrolment documents<\/dt><dd>[\s\S]*?<\/dd>/, '') : h;
};
const _rvWhereCDA = cbRvWhere;
cbRvWhere = function (pr, m) { return /required document|checklist/i.test(String(m)) && !/offer letter/i.test(String(m)) ? ['admdocs', 'docs'] : _rvWhereCDA.apply(this, arguments); };
// The step bar: the number of documents, and unpublished draft changes
const _badgesCDA = cbBadges;
cbBadges = function (pr) {
  const b = _badgesCDA.apply(this, arguments); if (!pr || !s4Pr(pr.id)) return b;
  const m = cdaMode(pr), items = ((m === 'stage' && cdaStageOf(pr)) || s4List(pr.id)).items.filter(i => i.status === 'Active');
  (b.admdocs = b.admdocs || []).push(m === 'stage' && cdaDiff(pr).length ? '<span class="cb-badge warn">Changed in draft</span>' : `<span class="cb-badge ok">${plural(items.length, 'document')}</span>`);
  return b;
};

/* ---------- A3. Which list an edit goes to ---------- */
// 'live' (Draft programme), 'stage' (published, with a draft version), 'locked' (published, no draft), 'ro' (retired / archived)
function cdaMode(pr) {
  if (!pr) return 'ro';
  if (cbRetired(pr) || (typeof cbrArch === 'function' && cbrArch(pr))) return 'ro';
  if (pr.status === 'Draft') return 'live';
  return cbDraftV(pr) ? 'stage' : 'locked';
}
const cdaStageOf = pr => { const s = CDA().stage[pr.id]; return s && s.pv === cbDraftV(pr) ? s : null; };
function cdaStage(pr) {
  const S_ = CDA().stage, dv = cbDraftV(pr); if (S_[pr.id] && S_[pr.id].pv === dv) return S_[pr.id];
  const L = s4List(pr.id);
  S_[pr.id] = { pv: dv, base: L.v, items: cdaClone(L.items), at: now().toISOString(), by: cdaMe() };
  return S_[pr.id];
}
const cdaKey = i => [i.name, i.mand, i.formats, i.max, !!i.expiry, i.applies, i.guide || '', i.status].join('|');
// What the draft changes, against the published list
const cdaDiff = pr => { const st = cdaStageOf(pr); return st ? cdaDiffOf(pr.id, st) : []; };
function cdaDiffOf(pid, st) {
  const live = s4List(pid).items, out = [];
  st.items.forEach(i => { const o = live.find(x => x.id === i.id); if (!o) out.push(`Added: ${i.name}`); else if (cdaKey(o) !== cdaKey(i)) out.push(o.status !== i.status ? `${i.status === 'Retired' ? 'Retired' : 'Restored'}: ${i.name}` : `Changed: ${i.name}`); });
  live.forEach(o => { if (!st.items.some(i => i.id === o.id)) out.push(`Removed: ${o.name}`); });
  if (!out.length && st.items.map(i => i.id).join() !== live.map(i => i.id).join()) out.push('Order changed');
  return out;
}
// Applications (direct and agency) that copied an item — a used item can be retired, never removed
function cdaUsed(pid, it) {
  const worlds = Object.values(STORE.worlds || {}).some(w => w && w.signup && w.nvq && chProgOf(w).id === pid && (w.docs || []).some(d => d.ck === it.id || d.name === it.name));
  const apps = (ADMIN.apps || []).some(a => a.cf2Ck && a.cf2Ck.pid === pid && (a.docs || []).some(d => d.ck === it.id || d.name === it.name));
  return worlds || apps;
}
const cdaRemovable = (pr, it, m) => (m === 'stage' ? !s4List(pr.id).items.some(x => x.id === it.id) : m === 'live') && !cdaUsed(pr.id, it);
// Publishing the draft version applies its list as the next checklist version; a discarded draft drops it
function cdaSync() {
  const S_ = (STORE.cda || {}).stage; if (!S_) return;
  Object.keys(S_).forEach(pid => {
    const st = S_[pid], pr = s4Pr(pid); if (!pr) { delete S_[pid]; return; }
    if (pr.status !== 'Draft' && pr.version >= st.pv) {
      const ch = cdaDiffOf(pid, st); delete S_[pid];
      if (!ch.length) return;
      const L = s4List(pid), before = L.items.filter(i => i.status === 'Active').map(i => i.name).join(', ');
      if (typeof cbCkSeed === 'function') cbCkSeed(pid);
      L.items.splice(0, L.items.length, ...cdaClone(st.items));
      s4CkChanged(pr, `Checklist published with Version ${st.pv}`, before, ch.join(' · '), `Programme Version ${st.pv} published`);
      const h = typeof cbCkHist === 'function' ? cbCkHist(pid) : null; if (h && h.length) { const last = h[h.length - 1]; if (Object.isFrozen(last)) h[h.length - 1] = e1Freeze({ ...last, pv: st.pv }); else last.pv = st.pv; }
    } else if (cbDraftV(pr) !== st.pv) { delete S_[pid]; logA('Admissions & Documents', s4CkEnt(pr), 'Draft checklist discarded', `Version ${st.pv} (draft)`, '—', 'The draft version no longer exists'); }
  });
}
const _renderCDA = render;
render = function () { try { cdaSync(); } catch (e) { /* never block a render */ } return _renderCDA.apply(this, arguments); };
const _suCDA = ch8StartSignup;
ch8StartSignup = function () { cdaSync(); return _suCDA.apply(this, arguments); };
if (typeof ag1NvqApp === 'function') { const _agCDA = ag1NvqApp; ag1NvqApp = function () { cdaSync(); return _agCDA.apply(this, arguments); }; }

/* ---------- A6. The gate every checklist action passes ---------- */
function cdaGate(el, what) {
  const pr = s4Pr(el && el.dataset && el.dataset.p);
  if (!pr) { toast('Programme not found.', 'err'); return null; }
  // retired first, in the builder's own format (the CB_WRITE guard this action replaces)
  if (cbRetired(pr)) { logA('NVQ Programmes', cbEnt(pr), `Blocked: ${what} (programme retired)`, '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('This programme is retired, so it is read-only.', 'err'); return null; }
  if (!(S.portal === 'admin' && S.signedIn) || !s4CanCk(pr)) { s4Refuse('Admissions & Documents', s4CkEnt(pr), what); return null; }
  const m = cdaMode(pr);
  if (m === 'ro') return cbrNo(pr, what + ' (programme archived)', 'Programme archived', 'This programme is archived, so its documents are read-only.');
  if (m === 'locked' && !CDA_FIXTURE) { logA('Admissions & Documents', s4CkEnt(pr), 'Blocked: ' + what, '—', '—', `Version ${pr.version} is published`); toast(`Version ${pr.version} is published, so its documents can't be changed. Create a new version, then change them in its draft.`, 'err'); return null; }
  if (m === 'locked') return { pr, m: 'live', L: s4List(pr.id) }; // the demo's own set-up only
  if (m === 'live') { if (typeof cbCkSeed === 'function') cbCkSeed(pr.id); return { pr, m, L: s4List(pr.id) }; }
  return { pr, m, L: cdaStage(pr) };
}
// After a change: a live list makes a new checklist version (S4a, audited); a staged list records the draft change (audited)
function cdaDone(g, action, before, after, r) {
  if (g.m === 'live') s4CkChanged(g.pr, action, before, after, r);
  else { g.L.at = now().toISOString(); g.L.by = cdaMe(); logA('Admissions & Documents', s4CkEnt(g.pr), `${action} (Version ${g.L.pv} draft)`, before, after, r || ''); }
}
const cdaNextId = (pid, items) => { const all = items.concat(s4List(pid).items).map(i => +(String(i.id).match(/\d+$/) || [0])[0]); return 'ck' + (Math.max(0, ...all) + 1); };
// The S4a dialog fields and checks, run against the list being edited
const cdaRead = (g, self) => { const S_ = S4().lists, keep = S_[g.pr.id]; if (g.m === 'stage') S_[g.pr.id] = { v: keep.v, items: g.L.items }; try { return s4CkRead(g.pr.id, self); } finally { S_[g.pr.id] = keep; } };
// Formats as checkboxes (PDF, JPG, PNG, DOCX); the hidden #ck-f keeps the wording the checklist stores ("PDF, JPG or PNG")
function cdaFmtPatch() {
  if (!MODAL || !/id="ck-f"/.test(MODAL.body || '')) return;
  MODAL.body = MODAL.body.replace(/<div class="field"><label for="ck-f">Accepted formats<\/label><input class="input" id="ck-f" value="([^"]*)"><span class="hint">[^<]*<\/span><\/div>/, (m, v) => {
    const cur = cdaFmtToks(v);
    return `<fieldset class="field cda-fmts" style="border:0;padding:0"><legend class="lbl">Accepted formats</legend><div class="row">${CDA_FMTS.map(f => `<label class="check"><input type="checkbox" class="cda-fmt" value="${f}" ${cur.includes(f) ? 'checked' : ''} data-onchange="cdaFmt"> ${f}</label>`).join('')}</div><input type="hidden" id="ck-f" value="${v}"><span class="hint">Choose one or more.</span></fieldset>`;
  });
  renderModal();
}
INP.cdaFmt = () => { const f = $('#modal-root #ck-f'); if (f) f.value = cdaFmtTxt($$('#modal-root .cda-fmt:checked').map(x => x.value)); };
const cdaFmtCheck = () => { if ($$('#modal-root .cda-fmt').length && !$$('#modal-root .cda-fmt:checked').length && !mval('#ck-f')) { fieldErr('#modal-root .cda-fmt', 'Choose at least one format'); return false; } return true; };
const cdaExpHint = '<p class="xs muted cda-exp">Expiry: when ticked, the applicant is told the document has an expiry date and must be replaced before it expires.</p>';

ACT.s4CkAdd = el => {
  const g = cdaGate(el, 'change the document checklist'); if (!g) return;
  reasonDlg({ title: `Add document — ${esc(g.pr.title)}${g.m === 'stage' ? ` (Version ${g.L.pv} draft)` : ''}`, ok: 'Add document', label: 'Reason (required)', extra: s4CkFields(null) + cdaExpHint, onOk: r => {
    if (!cdaFmtCheck()) return false; const f = cdaRead(g, null); if (!f) return false;
    g.L.items.push({ id: cdaNextId(g.pr.id, g.L.items), ...f, status: 'Active' }); cdaDone(g, 'Checklist item added', '—', s4CkTxt(f), r); render();
    toast(g.m === 'stage' ? `Added to Version ${g.L.pv} (draft) — applies when it is published.` : `Added — checklist version ${s4List(g.pr.id).v}.`);
  } }); cdaFmtPatch();
};
ACT.s4CkEdit = el => {
  const g = cdaGate(el, 'change the document checklist'); if (!g) return; const it = g.L.items[+el.dataset.i]; if (!it) { toast('Document not found.', 'err'); return; }
  reasonDlg({ title: `Edit document${g.m === 'stage' ? ` — Version ${g.L.pv} draft` : ''}`, ok: 'Save', label: 'Reason (required)', extra: s4CkFields(it) + cdaExpHint, onOk: r => {
    if (!cdaFmtCheck()) return false; const f = cdaRead(g, it); if (!f) return false; const was = s4CkTxt(it);
    if (was === s4CkTxt(f) && f.guide === it.guide) { fieldErr('#ck-n', 'Nothing has changed'); return false; }
    Object.assign(it, f); cdaDone(g, 'Checklist item changed', was, s4CkTxt(it), r); render(); toast(g.m === 'stage' ? `Saved in Version ${g.L.pv} (draft).` : 'Saved — new applicants get the change.');
  } }); cdaFmtPatch();
};
ACT.s4CkRetire = el => {
  const g = cdaGate(el, 'change the document checklist'); if (!g) return; const it = g.L.items[+el.dataset.i]; if (!it) return;
  if (g.pr.chNew && g.L.items.filter(i => i.status === 'Active').length === 1) { toast('A checklist needs at least one document.', 'err'); return; }
  reasonDlg({ title: 'Retire ' + esc(it.name), ok: 'Retire', danger: true, body: `<p class="small">${g.m === 'stage' ? `Applicants won't be asked for it once Version ${g.L.pv} is published.` : 'New applicants won\'t be asked for it.'} Applications already started, and decisions already made, are kept.</p>`, onOk: r => { it.status = 'Retired'; cdaDone(g, 'Checklist item retired', it.name, 'Retired', r); render(); } });
};
ACT.s4CkRestore = el => {
  const g = cdaGate(el, 'change the document checklist'); if (!g) return; const it = g.L.items[+el.dataset.i]; if (!it) return;
  reasonDlg({ title: 'Restore ' + esc(it.name), ok: 'Restore', onOk: r => { it.status = 'Active'; cdaDone(g, 'Checklist item restored', 'Retired', it.name, r); render(); } });
};
ACT.s4CkMove = el => {
  const g = cdaGate(el, 'change the document checklist'); if (!g) return; const L = g.L, k = +el.dataset.i, j = k + +el.dataset.d; if (!L.items[k] || !L.items[j]) return;
  [L.items[k], L.items[j]] = [L.items[j], L.items[k]]; cdaDone(g, 'Checklist order changed', '—', L.items.map(i => i.name).join(' → '), ''); render();
};
// Remove: only an item no application has copied (added in this draft, or on a programme nobody has applied to)
ACT.s4CkRemove = el => {
  const g = cdaGate(el, 'remove a checklist item'); if (!g) return; const it = g.L.items[+el.dataset.i]; if (!it) return;
  if (!cdaRemovable(g.pr, it, g.m)) { logA('Admissions & Documents', s4CkEnt(g.pr), 'Blocked: remove checklist item', it.name, '—', 'Used by an application or published'); toast(`${it.name} is part of a published list or an application, so it can be retired but not removed.`, 'err'); return; }
  if (g.pr.chNew && it.status === 'Active' && g.L.items.filter(i => i.status === 'Active').length === 1) { toast('A checklist needs at least one document.', 'err'); return; }
  reasonDlg({ title: 'Remove ' + esc(it.name), ok: 'Remove', danger: true, body: '<p class="small">No application has used it, so it is removed from the list. The checklist history keeps the earlier versions.</p>', onOk: r => { const k = g.L.items.indexOf(it); if (k < 0) return; g.L.items.splice(k, 1); cdaDone(g, 'Checklist item removed', s4CkTxt(it), '—', r); render(); } });
};
['s4CkRemove'].forEach(n => { if (!CB_WRITE.includes(n)) CB_WRITE.push(n); });
// The client demo's set-up makes three items optional before anyone applies (not an administrator's edit through the builder)
if (typeof cfDemoChecklist === 'function') { const _cfdCDA = cfDemoChecklist; cfDemoChecklist = function () { CDA_FIXTURE = true; try { return _cfdCDA.apply(this, arguments); } finally { CDA_FIXTURE = false; } }; }

/* ---------- A2. One reusable checklist table (NVQ programmes and short courses) ---------- */
// ctx: { can, acts: { edit, retire, restore, move, remove }, ds: k => data attributes, removable: it => bool, region: bool }
function cdaTable(items, ctx) {
  const a = (act, k, x = '') => `data-act="${act}" ${ctx.ds(k)}${x}`;
  return `<div class="tbl-wrap"><table class="tbl dense cda-tbl"><thead><tr><th>Order</th><th>Document</th><th>Mandatory</th><th>Formats</th><th>Max size</th><th>Has expiry</th>${ctx.region ? '<th>Applies to</th>' : ''}<th>Guidance</th><th>Status</th><th></th></tr></thead><tbody>${items.map((r, k) => `<tr class="${r.status === 'Retired' ? 'muted' : ''}" data-ck="${esc(r.name)}"><td class="nowrap">${ctx.can && ctx.acts.move ? `<button class="icon-btn" ${a(ctx.acts.move, k, ' data-d="-1"')} aria-label="Move ${esc(r.name)} up" title="Move ${esc(r.name)} up" ${k === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" ${a(ctx.acts.move, k, ' data-d="1"')} aria-label="Move ${esc(r.name)} down" title="Move ${esc(r.name)} down" ${k === items.length - 1 ? 'disabled' : ''}>↓</button>` : k + 1}</td>
    <td>${esc(r.name)}</td><td>${r.mand ? chip('Mandatory', 'blue') : chip('Optional', 'grey')}</td><td class="small">${esc(r.formats)}</td><td>${esc(r.max)}</td><td>${r.expiry ? 'Yes' : 'No'}</td>${ctx.region ? `<td>${chip(r.applies, r.applies === 'All' ? 'grey' : 'blue')}</td>` : ''}<td class="small">${esc(r.guide || '—')}</td><td>${chip(r.status, r.status === 'Active' ? 'green' : 'grey')}</td>
    <td class="nowrap">${ctx.can ? `${r.status === 'Active' ? `<button class="btn btn-sm" ${a(ctx.acts.edit, k)}>Edit</button> <button class="btn btn-sm" ${a(ctx.acts.retire, k)}>Retire</button>` : `<button class="btn btn-sm" ${a(ctx.acts.restore, k)}>Restore</button>`}${ctx.acts.remove && ctx.removable(r) ? ` <button class="btn btn-sm btn-ghost cda-rm" ${a(ctx.acts.remove, k)}>Remove</button>` : ''}` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
// What an applicant will be asked for (the active items, by region for programmes)
function cdaPreview(items, regions) {
  const act = items.filter(i => i.status === 'Active');
  const col = reg => { const its = act.filter(i => !regions || i.applies === 'All' || i.applies === reg); return `<div class="cda-pv-col"><h4>${regions ? `${esc(reg)} applicants${reg === 'UK' ? ' (and every country other than the UAE)' : ''}` : 'Learners'}</h4>${its.length ? `<ul class="list small">${its.map(i => `<li class="li"><div class="li-b"><strong>${esc(i.name)}</strong><span class="xs muted">${i.mand ? 'Mandatory' : 'Optional'} · ${esc(i.formats)} · up to ${esc(i.max)}${i.expiry ? ' · has an expiry date' : ''}</span>${i.guide ? `<span class="xs">${esc(i.guide)}</span>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted">No documents.</p>'}</div>`; };
  return `<section class="card cda-pv"><h3>Applicant preview</h3><div class="grid-2">${regions ? col('UK') + col('UAE') : col('')}</div></section>`;
}

/* ---------- The programme's Documents step ---------- */
function cdaCard(pr, opts = {}) {
  const m = cdaMode(pr), can = S.portal === 'admin' && S.signedIn && s4CanCk(pr) && (m === 'live' || m === 'stage'), L = s4List(pr.id), st = m === 'stage' ? (cdaStageOf(pr) || { pv: cbDraftV(pr), items: L.items }) : null;
  const items = st ? st.items : L.items;
  const ver = st ? `Version ${st.pv} (draft) — based on checklist version ${L.v}` : `Checklist version ${L.v}${L.fixture ? ' (the original list)' : ''}`;
  const head = can ? `<button class="btn btn-sm btn-primary" data-act="s4CkAdd" data-p="${pr.id}">${ic('plus', 14)}Add document</button>` : `<span class="xs muted">${ic('lock', 12)} Read-only${m === 'locked' ? ' — published version' : m === 'ro' ? '' : ' for you'}</span>`;
  const ctx = { can, region: true, acts: { edit: 's4CkEdit', retire: 's4CkRetire', restore: 's4CkRestore', move: 's4CkMove', remove: 's4CkRemove' }, ds: k => `data-p="${pr.id}" data-i="${k}"`, removable: it => can && cdaRemovable(pr, it, m) };
  // AA-18 (AAF-D): the controls are explained to those who may use them; the role lock says why and who can change it
  const pub = pr.chNew && pr.status !== 'Draft';
  const help = can ? `<p class="small aafd-ckhelp">${ic('info', 13)} To change an item use <strong>Edit</strong>; <strong>Retire</strong> stops asking applicants (<strong>Restore</strong> brings it back); <strong>Remove</strong> deletes an item no application has used; ↑ ↓ change the order. Each change asks for a reason${m === 'stage' ? ` and applies when Version ${st.pv} is published` : ' and creates a new checklist version'}.</p>` : '';
  const lock = S.portal === 'admin' && !s4CanCk(pr) && m !== 'ro' ? `<div class="note b-grey aafd-cklock">${ic('lock')}<div class="small">${pub ? '<strong>Read-only for you:</strong> after a programme is published, only the Super Administrator can add, edit, retire or reorder its document checklist (a provisional rule awaiting the client\'s confirmation). Ask the Super Administrator for a change, in a new version; applicants keep the version they started with.' : '<strong>Read-only for you:</strong> the document checklist is changed by the Super Administrator, an Academic Admin or a System Admin, in a new version once published; applicants keep the version they started with.'}</div></div>` : '';
  return `<section class="card s4-ck cda-ck" data-mode="${m}"><div class="row-b"><h2>${opts.title || 'Required enrolment documents'}</h2>${head}</div>${help}${lock}
    <div class="small muted cbc3-tipline">${esc(ver)}. ${cbcTip('About "Applies to"', 'All, UK or UAE applicants. Applicants from any other country get the UK items. An application keeps the list copied when it started.')}</div>
    ${items.length ? cdaTable(items, ctx) : '<p class="small cda-none">No documents yet.</p>'}</section>`;
}
// Admissions → Checklist builder and the wizard use the same card
s4ChecklistCard = function (pr, opts = {}) { return cdaCard(pr, opts) + (S.route === 'a-admissions' && cdaMode(pr) !== 'live' ? `<p class="small cda-where">${ic('info', 14)} Change a published programme's documents in its <button class="linklike" data-go="a-programmes" data-id="${esc(pr.id)}" data-tab="admdocs">Documents</button> step, in a new version.</p>` : ''); };
function cdaDocsPanel(pr) {
  const m = cdaMode(pr), L = s4List(pr.id), dv = cbDraftV(pr), st = m === 'stage' ? (cdaStageOf(pr) || { pv: dv, items: L.items }) : null, ch = st ? cdaDiff(pr) : [];
  const note = {
    live: `<div class="note b-blue cda-note" role="status">${ic('info')}<div class="small"><strong>Draft programme.</strong> Each change is saved as you make it. Applicants get this list once the programme is published; an application keeps the list copied when it started.</div></div>`,
    stage: `<div class="note b-amber cda-note" role="status">${ic('layers')}<div class="small"><strong>Changes go into Version ${dv} (draft).</strong> They apply to applicants when Version ${dv} is published. Until then new applicants get checklist version ${L.v} of Version ${pr.version}; applications already started keep their own copy.${ch.length ? `<br>Changes in this draft: ${esc(ch.join(' · '))}.` : ' No changes yet.'}</div></div>`,
    locked: `<div class="note b-grey cda-note" role="status">${ic('lock')}<div class="small"><strong>Version ${pr.version} is published, so its documents can't be changed.</strong> Create a new version to change them; learners and applicants keep the list they have.${cbAdmin() && s4CanCk(pr) ? `<div class="b-act"><button class="btn btn-sm" data-act="${pr.chNew ? 's3WizVersion' : 'newProgVersion'}" data-id="${pr.id}">Create new version</button></div>` : ''}</div></div>`,
    ro: `<div class="note b-grey cda-note" role="status">${ic('lock')}<div class="small"><strong>Read-only.</strong> This programme is ${cbRetired(pr) ? 'retired' : 'archived'}; its documents are kept as a historical record.</div></div>` }[m];
  const items = st ? st.items : L.items;
  return note + cdaCard(pr) + cdaPreview(items, true) + cbCkHistoryCard(pr);
}
// The history shows which programme version published each checklist version
const _ckHistCDA = cbCkHistoryCard;
cbCkHistoryCard = function (pr) {
  const h = _ckHistCDA.apply(this, arguments), H = cbCkHist(pr.id);
  return h.replace(/(<tr data-v="(\d+)"><td>Version \2)/g, (m, a, v) => { const x = H.find(y => y.v === +v); return x && x.pv ? `${a} <span class="xs muted cda-pv-of">(programme Version ${x.pv})</span>` : a; });
};

/* ---------- A5. Short courses: the "Documents" tab next to Details ---------- */
const _ceCDA = courseEditor;
courseEditor = function (id, t) {
  const h = _ceCDA.apply(this, arguments); if (typeof h !== 'string') return h;
  const m = /<button class="tab cf2-sctab"[^>]*>Admission documents<\/button>/.exec(h); if (!m) return h;
  const btn = m[0].replace('>Admission documents<', '>Documents<'), rest = h.replace(m[0], '');
  const det = /(<button class="tab"[^>]*data-tab="details"[^>]*>Details<\/button>)/.exec(rest);
  return det ? rest.replace(det[0], det[0] + btn) : h;
};
const cdaScRemovable = (id, it) => !cf2ScSubs(id).some(([, , d]) => d.name === it.name) && !Object.values(STORE.worlds || {}).some(w => (w && w.enrolments || []).some(e => e.cf2Docs && e.cf2Docs.sc === id && e.cf2Docs.items.some(d => d.name === it.name)));
const _scCardCDA = cf2ScCard;
cf2ScCard = function (c) {
  const d = document.createElement('div'); d.innerHTML = _scCardCDA.apply(this, arguments);
  const card = d.querySelector('section.cf2-scdocs'), L = cf2ScList(c.id), can = cf2ScCan();
  if (card) {
    card.classList.add('cda-ck');
    const h = card.querySelector('h2'); if (h) h.textContent = 'Documents (optional)';
    const tw = card.querySelector('.tbl-wrap');
    if (tw) tw.outerHTML = cdaTable(L.items, { can, region: false, acts: { edit: 'cf2ScEdit', retire: 'cf2ScRetire', restore: 'cf2ScRestore', move: 'cdaScMove', remove: 'cdaScRemove' }, ds: k => `data-id="${esc(c.id)}" data-i="${k}"`, removable: it => can && cdaScRemovable(c.id, it) });
    if (L.items.some(i => i.status === 'Active')) card.insertAdjacentHTML('beforeend', cdaPreview(L.items, false));
  }
  return d.innerHTML;
};
ACT.cdaScMove = el => {
  const c = cf2ScRow(el.dataset.id); if (!cf2ScGuard(c)) return; const L = cf2ScList(c.id), k = +el.dataset.i, j = k + +el.dataset.d; if (!L.items[k] || !L.items[j]) return;
  [L.items[k], L.items[j]] = [L.items[j], L.items[k]]; cf2ScChanged(c, 'Admission document order changed', '—', L.items.map(i => i.name).join(' → '), ''); render();
};
ACT.cdaScRemove = el => {
  const c = cf2ScRow(el.dataset.id); if (!cf2ScGuard(c)) return; const L = cf2ScList(c.id), it = L.items[+el.dataset.i]; if (!it) return;
  if (!cdaScRemovable(c.id, it)) { logA('Short Courses', `${c.title} (${c.id})`, 'Blocked: remove admission document', it.name, '—', 'Copied onto an enrolment'); toast(`${it.name} was copied onto a learner's enrolment, so it can be retired but not removed.`, 'err'); return; }
  reasonDlg({ title: 'Remove ' + esc(it.name), ok: 'Remove', danger: true, body: '<p class="small">No learner has been asked for it, so it is removed from the list.</p>', onOk: r => { const k = L.items.indexOf(it); if (k < 0) return; L.items.splice(k, 1); cf2ScChanged(c, 'Admission document removed', s4CkTxt(it), '—', r); render(); } });
};
// The short-course dialogs: the same format checkboxes (read from the same hidden field); an empty choice is refused
['cf2ScAdd', 'cf2ScEdit'].forEach(n => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = function () {
  const m0 = MODAL, r = f.apply(this, arguments); if (!MODAL || MODAL === m0) return r;
  cdaFmtPatch(); const a = MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (a && a.fn) { const g0 = a.fn; a.fn = (...x) => (cdaFmtCheck() ? g0(...x) : false); }
  return r; }; });

/* ---------- Records ---------- */
UXC.push(['CDA-A', 'Course document requirements (17 Nov 2026)', [
  'NVQ programme builder: a new step 2 "Documents" (Course Details · Documents · Curriculum & Outcomes · Assessments · Observations · Fees & Payment Plans · Offer Letters · Review & Publish). It holds the programme\'s required enrolment documents, moved out of Offer Letters; links to the old "docs" address open it.',
  'Add, edit (name, instructions, mandatory / optional, accepted formats as PDF / JPG / PNG / DOCX checkboxes, maximum size, expiry, region), reorder, retire / restore, and remove a document no application has used; an applicant preview shows the list by region.',
  'Versions: a Draft programme\'s list is edited directly. A published version can\'t be changed: its Documents step is read-only with "Create new version". In a draft version the changes are staged and become the next checklist version when that version is published; until then new applicants get the published list. Applications keep the copy made when they started. (Was: a published programme\'s checklist changed in place for new applicants — S4-05 / CB3.)',
  'Review & Publish summarises Documents (and what publishing will change); Offer Letters summarises the letter only.',
  'Short courses: the CF2 "Admission documents" list is now the "Documents" tab next to Details, with reorder, remove (when no learner has been asked for it) and the same format checkboxes. Documents still never delay access.']]);
