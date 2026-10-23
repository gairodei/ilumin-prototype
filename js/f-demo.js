/* ============================================================
   Batch F — Final demo-readiness corrections (23 Oct 2026; PD-F-01…08 in PROVISIONAL-DECISIONS.md).
   - C1: a learner who joins a batch after an assignment was published receives every applicable published assignment, exactly
     as a learner enrolled at publication does: the same definition, programme (by ID), pinned programme version and batch
     targeting. Reconciliation runs when a sign-up completes and when a learner changes batch; it only ever adds a missing copy
     (one per learner and definition), so repeating it changes nothing. Existing copies, submissions, deadlines and outcomes are
     never touched. A learner who joins after the deadline keeps the published deadline (an extension already recorded for
     them is applied); the learner and their Coordinator are told that an extension decision is needed — no deadline is invented.
     Publishing records whether the assignment went to every batch of the programme ("all": later batches are included) or to
     chosen batches only (later batches are not).
   - I1: the IQA portfolio shows the learner's own programme curriculum — their pinned tree for a learner record, the
     programme's recorded or current version for a roster-only record (labelled) — or an honest "curriculum unavailable"
     state. Never another programme's criteria.
   - IQA workspace: the q- routes open only for an IQA or the Super Administrator; other admin personas get the access-denied
     page (logged) instead of IQA records, sample sets, findings or portfolios.
   Loads last.
   ============================================================ */
'use strict';

/* ---------- C1: assignments for learners who join after publication ---------- */
const fAsgScope = d => d.batchScope || ((d.batches || []).length ? 'chosen' : 'all'); // none chosen = no batch existed yet
const fWKey = w => Object.keys(STORE.worlds || {}).find(k => STORE.worlds[k] === w);
function fAsgApplies(d, w) {
  if (!d || d.status !== 'Published' || !w || !w.nvq || !w.flags || !w.flags.admitted || !w.signup || !w.signup.done) return false;
  const code = s2BatchCodeOf(w), pid = cbAsgPid(d); if (!code) return false;
  if (pid ? s3ProgOfW(w) !== pid : w.nvq.title !== d.programme) return false;
  if (d.pv && w.nvq.progVersion && w.nvq.progVersion !== d.pv) return false;
  return fAsgScope(d) === 'all' || (d.batches || []).includes(code);
}
const fLateOpen = a => !!(a && a.lateJoin && a.due === a.lateJoin.due && new Date(a.due) < now() && ['Not Started', 'In Progress'].includes(a.status));
function fAsgReconcile(w, why) {
  const v = fWKey(w); if (!v) return [];
  const code = s2BatchCodeOf(w), b = chBatch(code), out = [];
  s2Defs().filter(d => fAsgApplies(d, w) && !w.assignments.some(a => a.id === d.id)).forEach(d => {
    const c = s2CopyTo(v, d); if (!c) return; d.copies.push(c); out.push(d.id);
    const a = w.assignments.find(x => x.id === d.id), ext = STORE.s2Ext && STORE.s2Ext[w.me.id + '|' + d.id];
    if (ext) extendAssignment(v, d.id, ext, 'Extension recorded before the learner received the assignment');
    const late = new Date(a.due) < now();
    if (late) {
      a.lateJoin = { at: now().toISOString(), due: a.due };
      const n = w.notifs.find(x => x.go === 'assignment.' + d.id && x.title === 'New assignment');
      if (n) n.body = `${d.title} is now in your assignments. Its deadline (${fdt(d.due)}) passed before you joined: your Coordinator will decide whether to extend it.`;
      if (b) chCooNotify(b.coord, 'Extension decision needed', `${chFullName(w)} joined ${b.code} after the deadline of ${d.title} (${fdt(d.due)}). The deadline hasn't been changed.`, 'c-learner.' + w.me.id);
    }
    s2Log(d, 'Issued to a learner who joined after publication', '—', `${chFullName(w)} (${w.me.id}) · ${code}${late ? ' · deadline already passed — extension decision needed' : ''}`, why);
  });
  return out;
}
const _ccF = chComplete;
chComplete = function (w) { const r = _ccF.apply(this, arguments); if (w && w.signup && w.signup.done) fAsgReconcile(w, 'Sign-up completed'); return r; };
const _moveF = chDoMove;
chDoMove = function (lid, b, nb) { const r = _moveF.apply(this, arguments), w = chWorldByLid(lid); if (w) fAsgReconcile(w, `Batch changed: ${b.code} → ${nb.code}`); return r; };
// Publishing records its batch scope
const _pubF = ACT.pubAsg;
ACT.pubAsg = el => {
  const d = el && el.dataset && s2Def(el.dataset.id), r = _pubF(el);
  const a = d && d.status === 'Draft' && MODAL && /^Publish assignment/.test(MODAL.title || '') && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn && !a._fScope) { const g = a.fn; a._fScope = true; a.fn = function () { const all = $$('.s2-pb').length, chk = $$('.s2-pb:checked').length, res = g.apply(this, arguments); if (d.status === 'Published') d.batchScope = !all || chk === all ? 'all' : 'chosen'; return res; }; }
  return r;
};
// The learner sees why a late-joining assignment can't be submitted yet
const _asgF = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgF(p), a = p && p.id && W && (W.assignments || []).find(x => x.id === p.id); if (!fLateOpen(a)) return h;
  return eAfterHead(h, `<div class="note b-amber f-late" role="status">${ic('clock')}<div class="small"><strong>You joined after this assignment's deadline (${esc(fdt(a.due))}).</strong> The deadline hasn't been changed. Your Coordinator has been asked to decide whether to extend it; until then the usual late-submission rules apply.</div></div>`);
};

/* ---------- I1: IQA portfolio — the learner's own programme curriculum ---------- */
function fPortCtx(lid, recs) {
  const w = chWorldByLid(lid);
  if (w && w.tree && w.tree.length) { const v = w.nvq.progVersion; return { tree: w.tree, prog: w.nvq.title, ver: v ? 'Version ' + v : (w.nvq.version || 'version as enrolled'), note: '' }; }
  const title = (recs.find(r => r.programme) || {}).programme, pr = title && (ADMIN.programmes || []).filter(x => x.title === title).sort((x, y) => (x.status === 'Draft') - (y.status === 'Draft'))[0];
  if (!pr) return { tree: null, prog: title || 'Unknown programme', why: title ? 'This programme isn\'t in the programme list.' : 'The records don\'t name a programme.' };
  const L = learnerById(lid), e = L && (L._enr || []).find(x => x.title === pr.title && x.version), rv = e ? +String(e.version).replace(/\D/g, '') : null;
  const tv = rv && s3PubTree(pr, rv), t = tv && tv.length ? tv : s3PubTree(pr, pr.version);
  if (!t || !t.length) return { tree: null, prog: pr.title, why: 'No published curriculum is recorded for this programme.' };
  return { tree: s3LearnerTree(t), prog: pr.title, ver: 'Version ' + (tv && tv.length ? rv : pr.version), note: tv && tv.length ? '' : `This learner's pinned version isn't recorded, so the programme's Version ${pr.version} curriculum is shown.` };
}
function fPortfolio(p) {
  const all = allIqaRecords(), learners = [...new Map(all.map(r => [r.lid, r.learner])).entries()].sort((a, b) => a[1] > b[1] ? 1 : -1);
  if (!learners.length) return `${pageA('Portfolios', 'Read-only. Sample evidence across the whole qualification.')}<div class="card"><div class="empty"><p>No marked work or completed observations yet.</p></div></div>`;
  const id = p.id || learners[0][0], name = learners.find(l => l[0] === id)[1], recs = all.filter(r => r.lid === id), ctx = fPortCtx(id, recs);
  const ev = c => recs.filter(r => r.crit.includes(c)), item = r => `<span class="xs">${KIND_LBL[r.kind]} <button class="linklike" data-go="q-record" data-id="${r.id}">${r.id}</button> · ${r.verified ? ic('lock', 11) + ' verified by ' + esc(r.assessor) : 'not verified'}${recAdvisory(r) ? ' · ' + ic('flag', 11) + ' advisory' : ''} <button class="linklike" data-act="qAddOne" data-id="${r.id}">Add to sample set</button></span>`;
  const pick = `<div class="row"><label class="sr" for="qp-l">Learner</label><select class="select" style="width:auto" id="qp-l" data-onchange="qpL">${learners.map(([l, n]) => `<option value="${l}" ${l === id ? 'selected' : ''}>${esc(n)} (${l})</option>`).join('')}</select><span class="xs muted">Assessor notes are shown read-only.</span></div>`;
  const head = `${pageA('Portfolio — ' + esc(name), 'Read-only. Sample evidence across the whole qualification.')}${pick}<p class="small f-port-prog"><strong>${esc(ctx.prog)}</strong>${ctx.ver ? ' · ' + esc(ctx.ver) : ''}</p>${ctx.note ? `<div class="note b-blue" role="status">${ic('info')}<div class="small">${esc(ctx.note)}</div></div>` : ''}`;
  if (!ctx.tree) return `${head}<div class="note b-amber f-port-na" role="status">${ic('alert')}<div class="small"><strong>Curriculum unavailable.</strong> ${esc(ctx.why)} The learner's evidence is listed without criteria.</div></div><section class="card"><h2>Evidence</h2>${recs.map(r => `<p>${item(r)} · ${esc(r.title)}</p>`).join('') || '<p class="small muted">None.</p>'}</section>`;
  const inTree = new Set(ctx.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(lo => lo.crit.map(c => c.code))))), loose = recs.filter(r => !(r.crit || []).some(c => inTree.has(c)));
  const looseHtml = loose.length ? `<section class="card f-port-loose"><h2>Evidence not mapped to this curriculum</h2><p class="small muted">These records name criteria that aren't in ${esc(ctx.prog)} ${esc(ctx.ver || '')}, so they're listed here rather than placed against another programme's criteria.</p>${loose.map(r => `<p>${item(r)} · ${esc(r.title)}${(r.crit || []).length ? ` <span class="xs muted">(${esc(r.crit.join(', '))})</span>` : ''}</p>`).join('')}</section>` : '';
  return `${head}${looseHtml}<section class="card"><div class="tree">${ctx.tree.map((u, k) => `<details class="lvl-1" ${k < 2 ? 'open' : ''}><summary><span class="caret">${ic('chev', 16)}</span><span class="tw"><span class="strong"><span class="code">${esc(u.code)}</span> ${esc(u.title)}</span></span></summary>${u.mods.map(m => `<div style="padding-left:18px"><p class="small strong">${esc(m.title)}</p>${m.los.map(lo => `<div style="padding-left:14px"><p class="xs muted">${esc(lo.title)}</p>${lo.crit.map(c => `<div class="li" style="padding:4px 0 4px 14px"><div class="li-b"><span class="small"><span class="code">${esc(c.code)}</span> ${esc(c.d)}</span>${ev(c.code).map(item).join('<br>') || '<span class="xs muted">No evidence yet</span>'}</div></div>`).join('')}</div>`).join('')}</div>`).join('')}</details>`).join('')}</div></section>`;
}
SCREENS['q-portfolios'] = p => {
  p = p || {}; if (!p.id || allIqaRecords().some(r => r.lid === p.id)) return fPortfolio(p);
  S.params = {}; return eAfterHead(fPortfolio({}), eGoneNote(p.id)); // a stale link: the list, never another learner under that name
};

/* ---------- IQA workspace (q- routes): only an IQA or the Super Administrator may open it ---------- */
// The persona guards (Finance, Academic, Business, IQA) never covered q- routes, so other admin personas could open IQA pages by
// address. A role without IQA viewing authority now gets the access-denied page (logged); the IQA's own action guards are unchanged.
const fIqaView = () => isIqa() || isSA();
const fHome = () => (isFin() ? ['f-dashboard', 'Finance Dashboard'] : isAca() ? ['k-dashboard', 'Academic Dashboard'] : isBiz() ? ['b-dashboard', 'Business Dashboard'] : ['a-dashboard', 'Dashboard']);
const _pageF = adminPage;
adminPage = function () {
  if (S.portal === 'admin' && !S.serverError && /^q-/.test(S.route || '') && !fIqaView()) {
    const who = `${(ADMIN.me.roles || [])[0] || 'User'} ${ADMIN.me.name}`, [to, lbl] = fHome();
    ADMIN.security.unshift({ id: 'SE-F-' + (ADMIN.security.length + 1), sev: 'Medium', at: now().toISOString(), type: 'Out-of-scope access', detail: `${who} opened ${S.route}`, reviewed: false });
    logA('IQA', S.route + ((S.params || {}).id ? ' · ' + S.params.id : ''), 'Blocked: open IQA workspace', '—', '—', 'Only an Internal Quality Assurer or the Super Administrator can view IQA records, sample sets, findings and portfolios');
    return `<div class="lockpage f-iqa-deny"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have permission — logged</h1><p class="muted">IQA records, sample sets, findings and portfolios are for Internal Quality Assurers and the Super Administrator. The attempt has been recorded in the security log.</p><button class="btn btn-primary" data-go="${to}">Go to ${lbl}</button></div>`;
  }
  return _pageF();
};
// Outside the admin portal (learner, staff, Coordinator, agency), an IQA screen opened by address renders nothing of the IQA's work.
Object.keys(SCREENS).filter(r => /^q-/.test(r)).forEach(r => {
  const f = SCREENS[r];
  SCREENS[r] = p => {
    if (S.portal === 'admin') return f(p); // admin personas: the adminPage guard above
    logA('IQA', r + (p && p.id ? ' · ' + p.id : ''), 'Blocked: open IQA workspace', '—', '—', `Outside the admin portal (${S.portal || 'signed out'})`);
    return `<div class="lockpage f-iqa-deny"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have permission — logged</h1><p class="muted">IQA records, sample sets, findings and portfolios are for Internal Quality Assurers and the Super Administrator.</p><button class="btn btn-primary" data-go="${S.portal === 'learner' ? 'dashboard' : S.portal === 'coord' ? 'c-dashboard' : S.portal === 'staff' ? 't-dashboard' : S.portal === 'agency' ? 'g-dashboard' : 'dashboard'}">Go to your dashboard</button></div>`;
  };
});
