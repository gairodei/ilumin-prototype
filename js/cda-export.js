/* ============================================================
   CDA-B — Colour-coded assessment record downloads (17 Nov 2026; PD-CDA-B* in PROVISIONAL-DECISIONS.md). Loads after cda-docs.js.
   Before this, every assessment download was simulated (a toast, no file): the learner's "Download as PDF" (pdfDl), the Assessor's
   assessment-page PDF (mkPdf), Records → Module documents (genModDoc, a fixed list of names) and the Learner 360 module document
   (fakeDl). This file produces real files from the saved records — one document model, three writers:
   - PDF (cda-pdf.js: PDF 1.7 with embedded Unicode fonts, uncompressed text so it can be checked); DOCX (a real Office Open XML
     package); ZIP (stored entries) for several files. No library, no network.
   - Colours: answers by round — Submission 1 black (#111111), Resubmission 1 red (#C01818), Resubmission 2+ amber (#B06500), the
     browser's ink; feedback by judgement — Not met red (#AE1E1E), Partially met amber (#8A5A00), Met green (#1A6A35), the browser's
     RAG colours. The two systems are separate and each is labelled in words as well.
   B2 Individual record (FL-STU-03 steps 12–13): learner (own), the allocated assignment Assessor, the learner's batch Coordinator, and
      Super / System / Academic Admin. PDF, and DOCX as an editable copy.
   B3 Completed module (FL-ADM-12): Super / System / Academic Admin, only when every criterion of the module is Achieved and no
      submission of it is waiting for marking. PDF and DOCX.
   B5 Batch export (FR-TA-06-07): the Academic Coordinator, for their own batches — a ZIP with one file per learner and assignment.
   Only saved learner records are exported (STORE.worlds): published feedback, published criterion judgements and outcomes, the
   rounds as submitted. Cohort rows the Coordinator view fills with sample text (synthAsg) are never exported. Every download is
   audited. Browser-side checks only: production must authorise and generate these on the server.
   ============================================================ */
'use strict';

/* ---------- Bytes: UTF-8, CRC-32, ZIP (stored) ---------- */
const cdaU8 = s => new TextEncoder().encode(s);
const CDA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const cdaCrc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CDA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function cdaZip(files) { // files: [{ name, data: Uint8Array | string }]
  const parts = [], cen = [], dt = new Date(), time = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), date = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
  let off = 0;
  const le = (n, b) => { const a = []; for (let i = 0; i < b; i++) a.push((n >>> (8 * i)) & 0xFF); return a; };
  files.forEach(f => {
    const name = cdaU8(f.name), data = typeof f.data === 'string' ? cdaU8(f.data) : f.data, crc = cdaCrc(data);
    const head = [...le(0x04034b50, 4), ...le(20, 2), ...le(0x0800, 2), ...le(0, 2), ...le(time, 2), ...le(date, 2), ...le(crc, 4), ...le(data.length, 4), ...le(data.length, 4), ...le(name.length, 2), ...le(0, 2)];
    parts.push(new Uint8Array(head), name, data);
    cen.push(new Uint8Array([...le(0x02014b50, 4), ...le(20, 2), ...le(20, 2), ...le(0x0800, 2), ...le(0, 2), ...le(time, 2), ...le(date, 2), ...le(crc, 4), ...le(data.length, 4), ...le(data.length, 4), ...le(name.length, 2), ...le(0, 2), ...le(0, 2), ...le(0, 2), ...le(0, 2), ...le(0, 4), ...le(off, 4)]), name);
    off += head.length + name.length + data.length;
  });
  const cenLen = cen.reduce((n, x) => n + x.length, 0);
  const end = new Uint8Array([...le(0x06054b50, 4), ...le(0, 2), ...le(0, 2), ...le(files.length, 2), ...le(files.length, 2), ...le(cenLen, 4), ...le(off, 4), ...le(0, 2)]);
  return cdaCat([...parts, ...cen, end]);
}
const cdaCat = arr => { const n = arr.reduce((s, x) => s + x.length, 0), out = new Uint8Array(n); let o = 0; arr.forEach(x => { out.set(x, o); o += x.length; }); return out; };

/* ---------- The document model ----------
   Blocks: { t: 'title' | 'h1' | 'h2' | 'h3' | 'p' | 'kv' | 'rule' | 'break', ... }; a paragraph has runs [{ text, color, b, i }],
   an optional left bar colour (feedback) and an indent. */
const CDA_INK = ['111111', 'C01818', 'B06500'];
const CDA_RAG = { R: 'AE1E1E', A: '8A5A00', G: '1A6A35' };
const CDA_RAGN = { R: 'Not met', A: 'Partially met', G: 'Met' };
const CDA_JUDG = { Met: 'G', 'Partially Met': 'A', 'Not Met': 'R', Pass: 'G', Fail: 'R' };
const cdaInk = n => CDA_INK[Math.min(n, 2)];
const cdaInkName = n => (n === 0 ? 'black' : n === 1 ? 'red' : 'amber');
const cdaRoundName = n => (n === 0 ? 'Submission 1' : `Resubmission ${n}`);
const R_ = (text, o = {}) => ({ text: String(text == null ? '' : text), ...o });
const cdaDt = iso => (iso ? fdt(iso) : '—');
// Rich-text answers to paragraphs of plain text (parsed, never executed)
function cdaHtmlParas(html) {
  const doc = new DOMParser().parseFromString(`<body>${String(html || '')}</body>`, 'text/html'), out = [];
  const txt = n => (n.textContent || '').replace(/\s+/g, ' ').trim();
  const walk = (node, depth) => node.childNodes.forEach(n => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    if (n.nodeType !== 1) return; const tag = n.tagName;
    if (tag === 'UL' || tag === 'OL') { [...n.children].forEach((li, k) => { const t = txt(li); if (t) out.push(`${tag === 'OL' ? (k + 1) + '.' : '•'} ${t}`); }); return; }
    if (/^(P|DIV|H\d|BLOCKQUOTE|LI|PRE)$/.test(tag)) { const t = (n.innerText !== undefined && n.innerText !== '' ? n.innerText : n.textContent).split(/\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean); if (t.length) out.push(...t); return; }
    if (tag === 'BR') return; walk(n, depth + 1);
  });
  walk(doc.body, 0);
  return out;
}

/* ---------- Records: what is saved for one learner and assignment ---------- */
const cdaWKey = w => Object.keys(STORE.worlds || {}).find(k => STORE.worlds[k] === w) || null;
const cdaWOf = lid => { const k = learnerAccounts().find(v => STORE.worlds[v].me.id === lid); return k ? STORE.worlds[k] : null; };
const cdaName = w => (typeof chFullName === 'function' ? chFullName(w) : `${w.me.first} ${w.me.last}`);
const cdaBatchOf = w => (typeof chBatchOfLid === 'function' ? chBatchOfLid(w.me.id) : null);
const cdaKeyOf = (w, a) => (typeof acKey === 'function' ? acKey(w.me.id, a.id, cdaBatchOf(w)) : `${w.me.id}~${a.id}`);
const cdaHasRecord = a => !!a && a.qs.some(q => q.rounds.length);
const cdaCritsOf = q => (typeof qCrits === 'function' ? qCrits(q) : [q.crit]).filter(Boolean);
const cdaTreeCrit = (w, code) => { for (const u of w.tree || []) for (const m of u.mods || []) for (const l of m.los || []) for (const c of l.crit || []) if (c.code === code) return { u, m, l, c }; return null; };
const cdaModOf = (w, a) => (typeof nvqModOf === 'function' ? nvqModOf(w.tree, a.unit) : null);
const cdaModLbl = (u, m) => `Unit ${u.code} ${u.title} · ${m.code} ${m.title}`;
const cdaHeld = (w, a) => typeof relStore === 'function' && typeof relKeyOfWorld === 'function' && !!relStore()[relKeyOfWorld(cdaWKey(w), a.id)];
const cdaOutOf = (w, a) => { const o = typeof r3Out === 'function' ? r3Out(cdaKeyOf(w, a)) : null; return o && o.published !== false ? o : null; };
const cdaJudgOf = (w, a) => (typeof r3Judg === 'function' ? r3Judg(cdaKeyOf(w, a)).filter(j => j.published) : []);
const cdaRefsOf = a => (a.refRounds || []).filter(r => r && (r.html || '').replace(/<[^>]+>|&nbsp;/g, '').trim());

// Who is producing the file (for the record and the audit)
function cdaWho() {
  if (S.portal === 'admin' && ADMIN.me) return { name: ADMIN.me.name, role: (ADMIN.me.roles || [])[0] || 'Administrator' };
  if (S.portal === 'staff' && typeof TME === 'function') return { name: TME().name, role: 'Assessor' };
  if (S.portal === 'coord' && typeof CME === 'function') return { name: CME().name, role: 'Academic Coordinator' };
  if (S.portal === 'learner' && W && W.me) return { name: cdaName(W), role: 'Learner' };
  return { name: '—', role: '—' };
}
function cdaAudit(entity, action, after, reason) {
  const me = cdaWho(), mod = 'Assessment Records';
  if (S.portal === 'staff' && typeof tasLog === 'function') return tasLog(mod, entity, action, '—', after, reason);
  if (S.portal === 'coord' && typeof cooLog === 'function') return cooLog(mod, entity, action, '—', after, reason);
  if (S.portal === 'admin') return logA(mod, entity, action, '—', after, reason);
  ADMIN.audit.unshift({ id: 'AU-' + (9600 + ADMIN.audit.length), actor: me.name, role: me.role, at: now().toISOString(), module: mod, entity, action, before: '—', after, reason: reason || '', ip: '—' });
}

/* ---------- Permissions (the existing evidence rule, W0: the same people who may open the learner's assessment files) ---------- */
const cdaAdminRole = () => S.portal === 'admin' && S.signedIn && (isSA() || (typeof isSys === 'function' && isSys()) || (typeof isAca === 'function' && isAca()));
function cdaRecordWhy(w) {
  if (!S.signedIn || !w) return 'Not available.';
  if (S.portal === 'learner') return W === w ? '' : 'You can only download your own assessment records.';
  if (S.portal === 'staff') return typeof chEff === 'function' && chEff(w.me.id, 'asg') === TME().name ? '' : 'Only the learner\'s allocated assignment assessor can download this record.';
  if (S.portal === 'coord') return typeof chIsMyBatchLid === 'function' && chIsMyBatchLid(w.me.id) ? '' : 'You can only download records of learners in your batches.';
  if (S.portal === 'admin') return cdaAdminRole() ? '' : 'Your role doesn\'t include learners\' assessment records.';
  return 'Not available in this portal.';
}
const cdaModuleWhy = w => (!w ? 'Not available.' : S.portal === 'admin' && cdaAdminRole() ? '' : 'Completed module documents are generated by the Super Administrator, System Administrators and Academic Admins.');
function cdaBatchWhy(b) {
  if (!b) return 'Batch not found.';
  if (S.portal !== 'coord' || !S.signedIn) return 'Batch exports are made by the batch\'s Academic Coordinator.';
  return typeof myBatches === 'function' && myBatches().some(x => x.code === b.code) ? '' : 'You can only export your own batches.';
}
const cdaDeny = (entity, what, why) => { cdaAudit(entity, 'Blocked: ' + what, '—', why); toast(why, 'err'); return null; };

/* ---------- One assignment, as blocks ---------- */
const CDA_KEY_BLOCKS = () => [
  { t: 'p', runs: [R_('Colour key — answers: ', { b: true }), R_('Submission 1 black', { color: CDA_INK[0] }), R_(' · '), R_('Resubmission 1 red', { color: CDA_INK[1] }), R_(' · '), R_('Resubmission 2 and later amber', { color: CDA_INK[2] })] },
  { t: 'p', runs: [R_('Colour key — assessor feedback: ', { b: true }), R_('Not met red', { color: CDA_RAG.R }), R_(' · '), R_('Partially met amber', { color: CDA_RAG.A }), R_(' · '), R_('Met green', { color: CDA_RAG.G })] }];
function cdaAsgBlocks(w, a, opt = {}) {
  const B = [], mod = cdaModOf(w, a), mode = a.dispMode === 'cq' ? 'Criteria as Questions' : 'Questions + Criteria', held = cdaHeld(w, a), out = cdaOutOf(w, a), judg = cdaJudgOf(w, a), refs = cdaRefsOf(a);
  B.push({ t: opt.lvl || 'h1', text: a.title });
  B.push({ t: 'kv', rows: [['Unit / module', mod ? cdaModLbl(mod.u, mod.m) : a.unit], ['Presentation', mode], ['Status', held ? `${a.status} — new marking waiting for release` : a.status], ['Round', a.round || '—'], ['Resubmissions used', `${a.resubUsed || 0} of ${a.resubMax == null ? '—' : a.resubMax}`], ['Assessor', a.assessor || (typeof chEff === 'function' && chEff(w.me.id, 'asg')) || '—'],
    ['Final outcome', out ? `${out.result} (${out.round}) — declared by ${out.by} (${out.role || 'Assessor'}), ${cdaDt(out.at)}` : 'Not declared']] });
  if (out) B.push({ t: 'p', bar: CDA_RAG[CDA_JUDG[out.result]], runs: [R_(`Final outcome: ${out.result}`, { b: true, color: CDA_RAG[CDA_JUDG[out.result]] }), R_(out.note ? ` — ${out.note}` : '', { color: CDA_RAG[CDA_JUDG[out.result]] })] });
  if (a.brief) { B.push({ t: 'h3', text: 'Brief' }); cdaHtmlParas(a.brief).forEach(p => B.push({ t: 'p', runs: [R_(p)] })); }
  const crit = [...new Set(a.qs.flatMap(cdaCritsOf).concat((a.crit || []).map(c => c[0])))];
  if (crit.length) {
    B.push({ t: 'h3', text: 'Criteria and their outcomes' });
    crit.forEach(code => {
      const x = cdaTreeCrit(w, code), c = x && x.c, d = c ? c.d : ((a.crit || []).find(y => y[0] === code) || [])[1] || '', jj = judg.filter(j => j.crit === code), last = jj[jj.length - 1];
      B.push({ t: 'p', runs: [R_(code, { b: true }), R_(` — ${d}`)].concat(c ? [R_(` · ${x.l.type || ''} · Competency record: ${c.st}${c.date ? ' (' + fd(c.date) + ')' : ''}${c.lock ? `, verified by ${c.lock.by} on ${cdaDt(c.lock.at)}` : ''}`)] : []) });
      if (last) B.push({ t: 'p', indent: 14, bar: CDA_RAG[CDA_JUDG[last.value]], runs: [R_(`Criterion judgement: ${last.value}`, { b: true, color: CDA_RAG[CDA_JUDG[last.value]] }), R_(` — ${last.by} (${last.role}), ${cdaDt(last.at)}, ${last.round || ''}`, { color: CDA_RAG[CDA_JUDG[last.value]] }), R_(last.text ? ` — ${last.text}` : '', { color: CDA_RAG[CDA_JUDG[last.value]] })] });
    });
  }
  B.push(...CDA_KEY_BLOCKS());
  a.qs.forEach((q, i) => {
    const codes = cdaCritsOf(q);
    B.push({ t: 'h2', text: a.dispMode === 'cq' && codes.length === 1 ? `Criterion ${codes[0]} — ${q.text}` : `Q${i + 1}. ${q.text}` });
    if (codes.length) B.push({ t: 'p', runs: [R_('Mapped criteria: ' + codes.join(', '), { i: true })] });
    if (!q.rounds.length) B.push({ t: 'p', runs: [R_('No answer submitted.', { i: true })] });
    q.rounds.forEach((r, n) => {
      const ink = cdaInk(n);
      B.push({ t: 'p', runs: [R_(`${cdaRoundName(n)} — submitted ${cdaDt(r.at)} (${cdaInkName(n)})`, { b: true, color: ink })] });
      const ps = cdaHtmlParas(r.html); (ps.length ? ps : ['(no answer entered)']).forEach(p => B.push({ t: 'p', indent: 14, runs: [R_(p, { color: ink })] }));
      (r.att || []).forEach(f => { const rec = typeof w0Rec === 'function' ? w0Rec(f.id) : null; B.push({ t: 'p', indent: 14, runs: [R_(`Supporting evidence: ${f.name} (${typeof w0Size === 'function' ? w0Size(f.size) : f.size + ' bytes'}${rec && rec.sha256 ? `, SHA-256 ${rec.sha256.slice(0, 16)}…` : ''}) — file kept in the learner's record, not included here`, { color: ink, i: true })] }); });
      const fb = q.fb[n];
      if (fb) B.push({ t: 'p', indent: 14, bar: CDA_RAG[fb.rag], runs: [R_(`Assessor feedback — ${CDA_RAGN[fb.rag] || fb.rag}: `, { b: true, color: CDA_RAG[fb.rag] }), R_(fb.text, { color: CDA_RAG[fb.rag] }), R_(`  (${fb.by}, ${cdaDt(fb.at)})`, { color: CDA_RAG[fb.rag], i: true })] });
    });
    if (q.state === 'pd') B.push({ t: 'p', runs: [R_(`Added to the Professional Discussion${q.pdReason ? ': ' + q.pdReason : ''}`, { i: true })] });
    if (q.state === 'limit') B.push({ t: 'p', runs: [R_('Resubmission limit reached — under review by the Academy.', { i: true })] });
  });
  if (refs.length) { B.push({ t: 'h3', text: 'References' }); refs.forEach((r, n) => { const ink = cdaInk(n); B.push({ t: 'p', runs: [R_(`${r.round || cdaRoundName(n)} — ${cdaDt(r.at)}`, { b: true, color: ink })] }); cdaHtmlParas(r.html).forEach(p => B.push({ t: 'p', indent: 14, runs: [R_(p, { color: ink })] })); }); }
  if (a.overall) B.push({ t: 'h3', text: 'Overall comment' }, { t: 'p', runs: [R_(a.overall)] }, { t: 'p', runs: [R_(`${a.assessor || ''}`, { i: true })] });
  (a.coordAll || (a.coord ? [a.coord] : [])).forEach(c => B.push({ t: 'p', runs: [R_('Coordinator feedback (does not change the status): ', { b: true }), R_(c.text), R_(`  (${c.by}, ${cdaDt(c.at)})`, { i: true })] }));
  if ((a.timeline || []).length) { B.push({ t: 'h3', text: 'Submission history' }); a.timeline.forEach(t => B.push({ t: 'p', runs: [R_(`${cdaDt(t[1])} — ${t[0]}`)] })); }
  return B;
}
function cdaHead(w, extra) {
  const b = cdaBatchOf(w), pr = typeof chProgOf === 'function' ? chProgOf(w) : null, v = w.signup && w.signup.progV;
  return [['Learner', cdaName(w)], ['Student ID', w.me.id], ['Programme', `${(w.nvq && w.nvq.title) || (pr && pr.title) || '—'}${v ? ` (Version ${v})` : ''}`], ['Batch', b ? `${b.code}${b.label && b.label !== b.code ? ' — ' + b.label : ''}` : '—']].concat(extra || []);
}
const cdaGen = () => { const me = cdaWho(); return `Generated ${fdt(now().toISOString())} by ${me.name} (${me.role}) · ILUMIN Academy prototype · from the saved assessment record`; };
function cdaAsgDoc(w, a) {
  return { title: `Assessment record — ${a.title}`, subject: `${cdaName(w)} (${w.me.id})`, blocks: [{ t: 'title', text: 'Assessment record' }, { t: 'kv', rows: cdaHead(w) }, { t: 'rule' }, ...cdaAsgBlocks(w, a), { t: 'rule' }, { t: 'p', runs: [R_(cdaGen(), { i: true, color: '555555' })] }] };
}

/* ---------- B3. The module: complete only when every criterion is Achieved and nothing waits for marking ---------- */
const cdaLive = x => x && x.status !== 'Retired';
function cdaModState(w, u, m) {
  const crit = m.los.filter(cdaLive).flatMap(l => l.crit.filter(cdaLive).map(c => ({ c, l }))), asg = (w.assignments || []).filter(a => { const x = cdaModOf(w, a); return x && x.u === u && x.m === m; });
  const outstanding = crit.filter(x => x.c.st !== 'Achieved').map(x => `${x.c.code} (${x.c.st})`), unmarked = asg.filter(a => a.status === 'Submitted' || cdaHeld(w, a)).map(a => `${a.title} (waiting for marking)`);
  return { crit, asg, outstanding, unmarked, complete: crit.length > 0 && !outstanding.length && !unmarked.length, done: crit.reduce((d, x) => (x.c.date && x.c.date > d ? x.c.date : d), '') };
}
function cdaModDoc(w, u, m) {
  const st = cdaModState(w, u, m), B = [];
  B.push({ t: 'title', text: 'Completed module record' }, { t: 'p', runs: [R_(cdaModLbl(u, m), { b: true })] }, { t: 'kv', rows: cdaHead(w, [['Awarding body module reference', m.ab || '—'], ['Module status', 'Completed — every criterion achieved; no submission waiting for marking'], ['Completed', st.done ? fd(st.done) : '—'], ['Generated', fdt(now().toISOString())], ['Generated by', `${cdaWho().name} (${cdaWho().role})`]]) },
    { t: 'p', runs: [R_('This document is made from the learner\'s saved records. Answers keep the colour of the round they were submitted in; assessor feedback keeps the colour of its judgement.', { i: true })] }, { t: 'break' });
  B.push({ t: 'h1', text: 'Criteria in this module' });
  st.crit.forEach(({ c, l }) => B.push({ t: 'p', runs: [R_(c.code, { b: true }), R_(` — ${c.d} · ${l.type || ''} · ${c.st}${c.date ? ' ' + fd(c.date) : ''}${c.src ? ' · evidence: ' + c.src : ''}${c.lock ? ` · verified by ${c.lock.by}, ${cdaDt(c.lock.at)}` : ''}`)] }));
  B.push(...CDA_KEY_BLOCKS());
  st.asg.forEach(a => { B.push({ t: 'break' }); if (cdaHasRecord(a)) B.push(...cdaAsgBlocks(w, a)); else B.push({ t: 'h1', text: a.title }, { t: 'p', runs: [R_(`${a.status} — no answer was submitted for this assignment; its criteria were achieved through other evidence.`, { i: true })] }); });
  // OC1 (PD-OC1-12): an observation belongs to this module when its signed report records one of the module's criteria (exact codes,
  // not a text match), and each visit is named (observation, record ID, follow-up) with its outcome for each of the module's criteria
  const codes = new Set(st.crit.map(x => x.c.code)), rCodes = r => (r.nvq || []).map(x => x[0]).concat((r.dEv && r.dEv.crit) || []), obs = (w.observations || []).filter(o => o.status === 'Completed' && rCodes(o.report || {}).some(cd => codes.has(cd)));
  B.push({ t: 'break' }, { t: 'h1', text: 'Observations' });
  if (!obs.length) B.push({ t: 'p', runs: [R_('No completed observation is recorded against this module\'s criteria.', { i: true })] });
  obs.forEach(o => {
    const r = o.report || {}, cf = r.cf2 || {};
    B.push({ t: 'h3', text: `${r.dEv ? r.dEv.name + (r.dFu ? ' — follow-up visit' : '') + ' · ' : ''}${o.loc || 'Observation'} — ${cdaDt(o.at)}` }, { t: 'kv', rows: [['Observation record', o.id || '—'], ['Assessor', o.assessor || '—'], ['Status', o.status], ['Signed off', o.signed ? `${o.signedBy || o.assessor || ''} ${cdaDt(o.signed)}`.trim() : 'No']].concat(r.dEv ? [['Programme version', `Version ${r.dEv.v}`], ['Location', r.dEv.loc === 'office' ? 'Academy office' : 'Workplace']] : []) });
    (r.nvq || []).filter(x => codes.has(x[0])).forEach(x => B.push({ t: 'p', runs: [R_(x[0], { b: true }), R_(` — ${x[2] ? 'Observed' : 'Not Yet Observed'} · ${x[3] ? 'Competent' : 'Not Yet Competent'}${x[4] ? ' — ' + x[4] : ''}`, { color: x[2] && x[3] ? CDA_RAG.G : CDA_RAG.R })] }));
    Object.entries((cf.perf || {}).nvq || {}).filter(([cd]) => codes.has(cd)).forEach(([cd, t]) => B.push({ t: 'p', runs: [R_(cd + ': ', { b: true }), R_(t)] }));
    Object.entries(cf.ev || {}).filter(([k]) => codes.has(k.split('|')[1])).forEach(([k, list]) => (list || []).forEach(f => B.push({ t: 'p', indent: 14, runs: [R_(`Evidence for ${k.split('|')[1]}: ${f.name}${f.by ? ' — added by ' + f.by : ''} (file kept in the learner's record, not included here)`, { i: true })] })));
    (r.ol1 || []).forEach(x => B.push({ t: 'p', indent: 14, runs: [R_(`${x.code || x.id || ''} ${x.out || ''}`.trim(), { color: x.out === 'Met' ? CDA_RAG.G : x.out ? CDA_RAG.R : undefined })] }));
  });
  const pd = ((w.pd && w.pd.items) || []).filter(x => codes.has(x.ref) || [...codes].some(cd => String(x.ref || '').includes(cd)));
  B.push({ t: 'h1', text: 'Professional Discussion outcomes' });
  if (!pd.length) B.push({ t: 'p', runs: [R_('No Professional Discussion item is recorded for this module\'s criteria.', { i: true })] });
  // each referral (criterion, reason, status) and, once recorded, the PD assessor's outcome (PD-2-05) in its judgement colour
  pd.forEach(x => { B.push({ t: 'p', runs: [R_(String(x.ref || ''), { b: true }), R_(` — referred: ${x.reason || '—'} · ${x.status || ''}${x.from ? ' · from ' + x.from : ''}`)] });
    const o = x.outcome && typeof x.outcome === 'object' ? x.outcome : null, col = o ? CDA_RAG[o.result === 'Met' ? 'G' : 'R'] : null;
    if (o) B.push({ t: 'p', indent: 14, bar: col, runs: [R_(`PD outcome: ${o.result}`, { b: true, color: col }), R_(` — ${o.by || ''}, ${cdaDt(o.at)}${o.notes ? ' — ' + o.notes : ''}`, { color: col })] }); });
  B.push({ t: 'rule' }, { t: 'p', runs: [R_(cdaGen(), { i: true, color: '555555' })] });
  return { title: `Completed module — ${u.code} ${m.code} — ${cdaName(w)}`, subject: `${cdaName(w)} (${w.me.id})`, blocks: B };
}

/* ---------- Writers ---------- */
// PDF: written by cda-pdf.js (embedded Unicode fonts, CDA-C1). The colour of a run, as PDF fill-colour operands:
const cdaHex = c => (c || '111111').match(/../g).map(x => (parseInt(x, 16) / 255).toFixed(3)).join(' ');
// DOCX: every character kept; colours as run colours, feedback with a coloured left border
const cdaX = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function cdaDocx(doc) {
  const run = r => `<w:r><w:rPr>${r.b ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}${r.color ? `<w:color w:val="${r.color}"/>` : ''}${r.sz ? `<w:sz w:val="${r.sz}"/>` : ''}</w:rPr><w:t xml:space="preserve">${cdaX(r.text)}</w:t></w:r>`;
  const para = (runs, o = {}) => `<w:p><w:pPr>${o.brk ? '<w:pageBreakBefore/>' : ''}${o.bar ? `<w:pBdr><w:left w:val="single" w:sz="24" w:space="6" w:color="${o.bar}"/></w:pBdr>` : ''}<w:spacing w:after="${o.after == null ? 80 : o.after}"/>${o.indent ? `<w:ind w:left="${Math.round(o.indent * 20)}"/>` : ''}</w:pPr>${runs.map(run).join('')}</w:p>`;
  const SZ = { title: 36, h1: 28, h2: 24, h3: 21 }; let brk = false; const body = [];
  doc.blocks.forEach(b => {
    if (b.t === 'break') { brk = true; return; }
    const o = { brk }; brk = false;
    if (b.t === 'rule') body.push(`<w:p><w:pPr>${o.brk ? '<w:pageBreakBefore/>' : ''}<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr></w:pPr></w:p>`);
    else if (SZ[b.t]) body.push(para([R_(b.text, { b: true, sz: SZ[b.t], color: '12292E' })], { ...o, after: 120 }));
    else if (b.t === 'kv') b.rows.forEach(([k, v], n) => body.push(para([R_(k + ': ', { b: true, color: '444444' }), R_(v)], { brk: n === 0 && o.brk, after: 40 })));
    else if (b.t === 'p') body.push(para(b.runs.map(r => ({ ...r, sz: 20 })), { ...o, bar: b.bar, indent: b.indent }));
  });
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${ns}><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1000" w:bottom="1134" w:left="1000" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const ts = now().toISOString().replace(/\.\d+Z$/, 'Z');
  return cdaZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
    { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>' },
    { name: 'word/document.xml', data: docXml },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${cdaX(doc.title)}</dc:title><dc:subject>${cdaX(doc.subject || '')}</dc:subject><dc:creator>${cdaX(cdaWho().name)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${ts}</dcterms:created></cp:coreProperties>` }]);
}

/* ---------- Files: safe names, the download, the record of what was made ---------- */
const cdaSafe = (s, max = 80) => String(s || '').normalize('NFC').replace(/[\u0000-\u001F\u007F<>:"/\\|?*]+/g, ' ').replace(/[—–]/g, '-').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, max).trim() || 'file';
const CDA_MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip' };
let CDA_LAST = null; // the last file made in this page (tests read the bytes; nothing is kept in the saved demo)
function cdaSave(name, bytes, ext, meta) {
  CDA_LAST = { name, bytes, ext, mime: CDA_MIME[ext], ...meta };
  CDA().files.unshift({ name, ext, size: bytes.length, at: now().toISOString(), by: cdaWho().name, role: cdaWho().role, scope: meta.scope || '' });
  if (typeof window !== 'undefined' && window.ILM_FIXTURE) return; // the regression harness (headless) checks the bytes; it doesn't save files
  try { const u = URL.createObjectURL(new Blob([bytes], { type: CDA_MIME[ext] })), a = document.createElement('a'); a.href = u; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 1000); } catch (e) { /* the file is still recorded */ }
}
const cdaRender = (doc, fmt) => (fmt === 'docx' ? { bytes: cdaDocx(doc) } : cdaPdf(doc));
const cdaAsgFile = (w, a, fmt) => `${cdaSafe(cdaName(w), 40)} (${cdaSafe(w.me.id, 20)}) - ${cdaSafe(a.title, 60)}.${fmt}`;

/* ---------- The download actions ---------- */
function cdaFind(el) {
  const d = (el && el.dataset) || {}; let w = null;
  if (d.lid) w = cdaWOf(d.lid); else if (d.v && STORE.worlds[d.v]) w = STORE.worlds[d.v]; else if (S.portal === 'learner') w = W;
  const a = w && (w.assignments || []).find(x => x.id === d.id);
  return { w, a };
}
// A learner whose learning access isn't open (N1A commencement, P5 access gate) can't download — first, as the guards that wrapped pdfDl
function cdaLearnerLocked() {
  if (S.portal !== 'learner' || !W || !W.flags || !W.flags.nvq) return false;
  const lk = [[typeof n1aBlocked === 'function' && n1aBlocked, typeof n1aLog === 'function' && n1aLog, typeof N1A_TITLE !== 'undefined' ? N1A_TITLE : {}], [typeof p5Blocked === 'function' && p5Blocked, typeof p5Log === 'function' && p5Log, typeof P5_TITLE !== 'undefined' ? P5_TITLE : {}]];
  for (const [blk, log, T] of lk) { const d = blk && blk(W); if (d) { if (log) log(d, 'download an assignment'); if (MODAL) closeModal(); toast(`${T[d.code] || 'Learning access isn\'t open yet'}: you can't download an assignment yet. Nothing was changed.`, 'err'); return true; } }
  return false;
}
ACT.cdaAsgDl = el => {
  if (cdaLearnerLocked()) return false;
  const { w, a } = cdaFind(el), fmt = (el.dataset && el.dataset.f) === 'docx' ? 'docx' : 'pdf', ent = w && a ? `${cdaName(w)} (${w.me.id}) · ${a.title}` : 'Assessment record';
  if (!w || !a) { toast('Assessment record not found.', 'err'); return; }
  const why = cdaRecordWhy(w); if (why) return cdaDeny(ent, 'download assessment record', why);
  if (!cdaHasRecord(a)) return cdaDeny(ent, 'download assessment record', 'Nothing has been submitted for this assignment yet, so there is no record to download.');
  const r = cdaRender(cdaAsgDoc(w, a), fmt), name = cdaAsgFile(w, a, fmt);
  cdaSave(name, r.bytes, fmt, { scope: 'Individual assessment record', lid: w.me.id, aid: a.id, pages: r.pages, images: r.images });
  cdaAudit(ent, 'Assessment record downloaded', `${name} (${fmt.toUpperCase()})`, 'Individual assessment record');
  toast(`${name} downloaded.`);
};
// The existing buttons: the learner's "Download as PDF" and the Assessor's assessment-page PDF now make the real file
ACT.pdfDl = el => ACT.cdaAsgDl({ dataset: { id: el.dataset.id, f: 'pdf' } });
ACT.mkPdf = el => { const k = (el && el.dataset && el.dataset.k) || (S.params && S.params.id) || ''; const [lid, aid] = String(k).split('~'); if (!lid || !aid) { toast('Open a submission first.', 'err'); return; } return ACT.cdaAsgDl({ dataset: { lid, id: aid, f: (el && el.dataset && el.dataset.f) || 'pdf' } }); };
ACT.cdaModDl = el => {
  const d = el.dataset || {}, w = cdaWOf(d.lid), x = w && (w.tree || []).find(u => u.code === d.u), m = x && x.mods.find(y => y.code === d.m), fmt = d.f === 'docx' ? 'docx' : 'pdf';
  if (!w || !m) { toast('Module not found.', 'err'); return; }
  const ent = `${cdaName(w)} (${w.me.id}) · ${x.code} ${m.code}`, why = cdaModuleWhy(w); if (why) return cdaDeny(ent, 'generate module document', why);
  const st = cdaModState(w, x, m);
  if (!st.complete) { cdaAudit(ent, 'Blocked: generate module document', '—', 'Module not fully marked'); openModal({ title: 'Module document not available yet', body: `<div class="note b-amber">${ic('lock')}<div>This module isn't fully marked and completed. Outstanding items:</div></div><p class="small cda-out">${esc(st.outstanding.concat(st.unmarked).join(', ') || 'No criteria in this module')}</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  const r = cdaRender(cdaModDoc(w, x, m), fmt), name = `${cdaSafe(cdaName(w), 40)} (${cdaSafe(w.me.id, 20)}) - ${cdaSafe(x.code + ' ' + m.code + ' ' + m.title, 60)} - completed module.${fmt}`;
  cdaSave(name, r.bytes, fmt, { scope: 'Completed module', lid: w.me.id, u: x.code, m: m.code, pages: r.pages, images: r.images });
  cdaAudit(ent, 'Module document generated', `${name} (${fmt.toUpperCase()})`, 'Completed module');
  toast(`${name} downloaded.`);
};
const cdaDlBtns = (attrs, lbl = 'Download') => `<span class="row cda-dl"><button class="btn btn-sm" data-act="cdaAsgDl" ${attrs} data-f="pdf">${ic('download', 14)}${lbl} PDF</button><button class="btn btn-sm btn-ghost" data-act="cdaAsgDl" ${attrs} data-f="docx">Word (DOCX)</button></span>`;
const cdaModBtns = (w, u, m) => { const st = cdaModState(w, u, m), at = `data-lid="${esc(w.me.id)}" data-u="${esc(u.code)}" data-m="${esc(m.code)}"`; return st.complete ? `<span class="row cda-mdl"><button class="btn btn-sm btn-primary" data-act="cdaModDl" ${at} data-f="pdf">${ic('download', 14)}PDF</button><button class="btn btn-sm" data-act="cdaModDl" ${at} data-f="docx">Word (DOCX)</button></span>` : `<button class="btn btn-sm" data-act="cdaModDl" ${at} data-f="pdf" title="${esc('Outstanding: ' + st.outstanding.concat(st.unmarked).join(', '))}">${ic('lock', 13)}Not complete</button>`; };

/* ---------- B5. Batch export (Academic Coordinator, own batches): a ZIP of one file per learner and assignment ---------- */
const CDA_ST = [['all', 'Every submitted assignment'], ['completed', 'Completed'], ['feedback', 'Feedback given (resubmission required or received)'], ['waiting', 'Submitted, waiting for marking']];
const cdaStOk = (a, k) => k === 'all' || (k === 'completed' && a.status === 'Completed') || (k === 'feedback' && ['Resubmission Required', 'Feedback Received'].includes(a.status)) || (k === 'waiting' && a.status === 'Submitted');
const cdaBatchWorlds = b => learnerAccounts().map(v => STORE.worlds[v]).filter(w => w && w.flags && w.flags.nvq && chBatchCodeOfW(w) === b.code);
function cdaBatchRows(b, f) {
  const out = [];
  cdaBatchWorlds(b).filter(w => !f.lid || w.me.id === f.lid).forEach(w => (w.assignments || []).forEach(a => {
    if (f.aid && a.id !== f.aid) return; const mod = cdaModOf(w, a); if (f.mod && (!mod || `${mod.u.code}|${mod.m.code}` !== f.mod)) return;
    if (!cdaHasRecord(a) || !cdaStOk(a, f.st || 'all')) return; out.push({ w, a });
  }));
  return out;
}
ACT.cdaBatchDlg = el => {
  const b = ADMIN.batches.find(x => x.code === (el.dataset && el.dataset.id)), why = cdaBatchWhy(b); if (why) return cdaDeny(b ? `${b.code}` : '—', 'export batch assessment records', why);
  const ws = cdaBatchWorlds(b), asgs = [...new Map(ws.flatMap(w => w.assignments || []).map(a => [a.id, a.title])).entries()], mods = [...new Map(ws.flatMap(w => (w.assignments || []).map(a => cdaModOf(w, a)).filter(Boolean)).map(x => [`${x.u.code}|${x.m.code}`, `${x.u.code} ${x.m.code} — ${x.m.title}`])).entries()];
  const sel = (id, lbl, opts) => `<div class="field"><label for="${id}">${lbl}</label><select class="select" id="${id}" data-onchange="cdaBF">${opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></div>`;
  openModal({ title: `Export assignments and submissions — ${esc(b.code)}`, size: 'lg', body: `<p class="small">One file per learner and assignment, in a ZIP, from the saved records: every submitted round in its colour and the published feedback in its judgement colour. Learners in other batches are never included.</p>
    <div class="form-grid">${sel('cda-bl', 'Learner', [['', `All learners in the batch (${ws.length})`]].concat(ws.map(w => [w.me.id, `${cdaName(w)} (${w.me.id})`])))}${sel('cda-ba', 'Assignment', [['', 'All assignments']].concat(asgs))}${sel('cda-bm', 'Unit / module', [['', 'All units and modules']].concat(mods))}${sel('cda-bs', 'Submission status', CDA_ST)}
    <fieldset class="field" style="border:0;padding:0"><legend class="lbl">File format</legend><label class="check"><input type="radio" name="cda-bf" value="pdf" checked data-onchange="cdaBF"> PDF</label><label class="check"><input type="radio" name="cda-bf" value="docx" data-onchange="cdaBF"> Word (DOCX)</label></fieldset></div>
    <p class="small cda-bcount" id="cda-bc">${plural(cdaBatchRows(b, { st: 'all' }).length, 'file')} will be exported.</p><p class="xs muted">The export is recorded in the audit log. Uploaded evidence files are listed in each record but not copied into the ZIP.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Export ZIP', cls: 'btn-primary', fn: () => cdaBatchRun(b) }] });
};
const cdaBFilt = () => ({ lid: mval('#cda-bl'), aid: mval('#cda-ba'), mod: mval('#cda-bm'), st: mval('#cda-bs') || 'all', fmt: ($('#modal-root input[name="cda-bf"]:checked') || {}).value === 'docx' ? 'docx' : 'pdf' });
INP.cdaBF = () => { const id = (MODAL && /— (\S+)$/.exec(MODAL.title || '') || [])[1], b = ADMIN.batches.find(x => x.code === id), c = $('#cda-bc'); if (b && c) c.textContent = `${plural(cdaBatchRows(b, cdaBFilt()).length, 'file')} will be exported.`; };
function cdaBatchRun(b, filt) {
  const why = cdaBatchWhy(b); if (why) { cdaDeny(b.code, 'export batch assessment records', why); return false; }
  const f = filt || cdaBFilt(), rows = cdaBatchRows(b, f);
  if (!rows.length) { toast('No submitted records match these filters.', 'err'); return false; }
  const used = new Set(), files = rows.map(({ w, a }) => {
    let name = `${cdaSafe(`${cdaName(w)} (${w.me.id})`, 60)}/${cdaSafe(a.title, 70)}.${f.fmt}`; let k = 2; while (used.has(name)) name = name.replace(/(\.\w+)$/, ` (${k++})$1`); used.add(name);
    return { name, data: cdaRender(cdaAsgDoc(w, a), f.fmt).bytes, lid: w.me.id, aid: a.id };
  });
  const me = cdaWho(), lbl = id => (CDA_ST.find(x => x[0] === id) || ['', id])[1];
  const readme = [`Assessment records — batch ${b.code}${b.label ? ' (' + b.label + ')' : ''}`, `Exported ${fdt(now().toISOString())} by ${me.name} (${me.role})`, `Filters: learner ${f.lid || 'all'}; assignment ${f.aid || 'all'}; unit/module ${f.mod ? f.mod.replace('|', ' ') : 'all'}; status ${lbl(f.st)}; format ${f.fmt.toUpperCase()}`, '',
    'Colours — answers: Submission 1 black, Resubmission 1 red, Resubmission 2 and later amber. Feedback: Not met red, Partially met amber, Met green.', 'Each file is made from the learner\'s saved record. Uploaded evidence files are listed, not included.', '', 'Files:', ...files.map(x => '  ' + x.name)].join('\r\n');
  const zip = cdaZip(files.map(x => ({ name: x.name, data: x.data })).concat([{ name: 'README.txt', data: readme }]));
  const name = `${cdaSafe(b.code, 40)} - assessment records - ${now().toISOString().slice(0, 10)}.zip`;
  cdaSave(name, zip, 'zip', { scope: 'Batch export', batch: b.code, entries: files.map(x => ({ name: x.name, lid: x.lid, aid: x.aid })) });
  cdaAudit(`${b.code}`, 'Batch assessment records exported', `${name} — ${plural(files.length, 'file')} (${f.fmt.toUpperCase()})`, `Learners: ${[...new Set(files.map(x => x.lid))].join(', ')}`);
  toast(`${name} downloaded — ${plural(files.length, 'file')}.`);
  return true;
}

/* ---------- Where the downloads are ---------- */
// Learner: the assignment page (the existing "Download as PDF", now real) plus Word
const _asgCDA = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgCDA(p), a = p && W && (W.assignments || []).find(x => x.id === p.id); if (typeof h !== 'string' || !a || !cdaHasRecord(a)) return h;
  return h.replace(/(<button class="btn btn-sm" data-act="pdfDl" data-id="[^"]*">[\s\S]*?Download as PDF<\/button>)/, `$1<button class="btn btn-sm btn-ghost" data-act="cdaAsgDl" data-id="${esc(a.id)}" data-f="docx">Word (DOCX)</button>`);
};
// Assessor: the marking / assessment page of a submission (key learner~assignment)
const _tmCDA = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tmCDA(p); if (typeof h !== 'string' || !p || !p.id) return h; const [lid, aid] = String(p.id).split('~'), w = cdaWOf(lid), a = w && (w.assignments || []).find(x => x.id === aid);
  const btns = w && a && cdaHasRecord(a) && !cdaRecordWhy(w) ? cdaDlBtns(`data-lid="${esc(lid)}" data-id="${esc(aid)}"`, 'Assessment record') : '';
  const h2 = h.replace(/<button[^>]*data-act="mkPdf"[^>]*>[\s\S]*?<\/button>/, btns);
  return h2 === h && btns ? h.replace(/(<div class="page-h">[\s\S]*?<\/div>)/, `$1<div class="row cda-tm">${btns}</div>`) : h2;
};
// Coordinator: the submission page, and the batch page (export)
const _csCDA = SCREENS['c-sub'];
SCREENS['c-sub'] = p => {
  const h = _csCDA(p); if (typeof h !== 'string' || !p || !p.id || /lockpage/.test(h)) return h; const [lid, aid] = String(p.id).split('~'), w = cdaWOf(lid), a = w && (w.assignments || []).find(x => x.id === aid);
  if (!w || !a || !cdaHasRecord(a) || cdaRecordWhy(w)) return h;
  const k = h.indexOf('</div>', h.indexOf('<div class="page-h">')); const btns = `<div class="row cda-cs">${cdaDlBtns(`data-lid="${esc(lid)}" data-id="${esc(aid)}"`, 'Assessment record')}</div>`;
  return k > 0 ? h.slice(0, k + 6) + btns + h.slice(k + 6) : btns + h;
};
const _cbCDA = SCREENS['c-batches'];
SCREENS['c-batches'] = p => {
  const h = _cbCDA(p), b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (typeof h !== 'string' || !b || cdaBatchWhy(b) || /lockpage/.test(h)) return h;
  const n = cdaBatchRows(b, { st: 'all' }).length, card = `<section class="card cda-bx"><div class="row-b"><h2>Assignments and submissions export</h2><button class="btn btn-sm btn-primary" data-act="cdaBatchDlg" data-id="${esc(b.code)}">${ic('download', 14)}Export…</button></div><p class="small muted">${n ? `${plural(n, 'submitted assignment record')} in this batch.` : 'No learner in this batch has submitted an assignment yet.'} A ZIP with one colour-coded file per learner and assignment (PDF or Word).</p></section>`;
  const k = h.indexOf('<div class="subtabs"'); return k >= 0 && (p.tab || 'overview') === 'overview' ? h.replace(/(<div class="subtabs"[\s\S]*?<\/div>)/, `$1${card}`) : (p.tab || 'overview') === 'overview' ? h + card : h;
};
// Admin: Records → a submission, the Learner 360 academic tab, and Records → Module documents (derived from the records)
const _arCDA = SCREENS['a-records'];
SCREENS['a-records'] = p => {
  const h = _arCDA(p); if (typeof h !== 'string' || !p) return h;
  if (p.id) {
    const s = allSubmissions().find(x => x.id === p.id), w = s && STORE.worlds[s.v]; if (!w || !cdaHasRecord(s.a) || cdaRecordWhy(w)) return h;
    return h.replace(/(<div class="note b-grey">)/, `<div class="row cda-ar">${cdaDlBtns(`data-v="${esc(s.v)}" data-id="${esc(s.a.id)}"`, 'Assessment record')}</div>$1`);
  }
  if (p.tab !== 'modules') return h;
  const rows = learnerAccounts().map(v => STORE.worlds[v]).filter(w => w && w.flags && w.flags.nvq && (w.tree || []).length && (w.assignments || []).length)
    .flatMap(w => (w.tree || []).flatMap(u => u.mods.filter(cdaLive).map(m => ({ w, u, m, st: cdaModState(w, u, m) })))).filter(r => r.st.asg.some(cdaHasRecord) || r.st.complete);
  const list = `<section class="card cda-mods"><p class="small muted">From the learners' records: a module document can be generated once every criterion of the module is achieved and nothing is waiting for marking.</p>${rows.length ? `<ul class="list">${rows.map(r => `<li class="li" data-lid="${esc(r.w.me.id)}" data-mod="${esc(r.u.code + ' ' + r.m.code)}"><div class="li-b"><strong>${esc(cdaName(r.w))}</strong><span class="small">${esc(cdaModLbl(r.u, r.m))}</span>${r.st.complete ? `<span class="xs" style="color:var(--green)">Completed${r.st.done ? ' ' + fd(r.st.done) : ''}</span>` : `<span class="xs" style="color:var(--red)">Not complete — outstanding: ${esc(r.st.outstanding.concat(r.st.unmarked).join(', '))}</span>`}</div>${cdaModBtns(r.w, r.u, r.m)}</li>`).join('')}</ul>` : '<p class="small muted cda-nomods">No learner has assessment records for a module yet.</p>'}</section>`;
  return h.replace(/<section class="card"><ul class="list">[\s\S]*?<\/ul><\/section>\s*$/, list);
};
if (typeof lAcademic === 'function') {
  const _laCDA = lAcademic;
  lAcademic = function (L, w) {
    const h = _laCDA.apply(this, arguments); if (!w || !w.assignments || !w.flags || !w.flags.admitted || typeof h !== 'string' || cdaRecordWhy(w)) return h;
    const d = document.createElement('div'); d.innerHTML = h;
    // the module document column: one real control per module of the unit (complete or not, from the records)
    d.querySelectorAll('section.card table tbody tr').forEach(tr => { const code = (tr.querySelector('.code') || {}).textContent, u = (w.tree || []).find(x => x.code === code), td = tr.lastElementChild; if (!u || !td || !td.querySelector('[data-act="modDocBlocked"], [data-act="fakeDl"]')) return; td.innerHTML = u.mods.filter(cdaLive).map(m => `<div class="cda-mrow"><span class="xs muted">${esc(m.code)}</span> ${cdaModBtns(w, u, m)}</div>`).join(''); });
    // each assignment with a record: download it
    d.querySelectorAll('details.card > summary').forEach(sm => { const t = (sm.querySelector('strong') || {}).textContent, a = (w.assignments || []).find(x => x.title === t); if (a && cdaHasRecord(a)) { const box = sm.parentElement; box.insertAdjacentHTML('beforeend', `<div class="row cda-la">${cdaDlBtns(`data-lid="${esc(w.me.id)}" data-id="${esc(a.id)}"`, 'Assessment record')}</div>`); } });
    return d.innerHTML;
  };
}
// The old simulated controls are retired: they answer with the real rule instead of a toast
ACT.genModDoc = el => { toast('Choose the learner\'s module in Records → Module documents.', 'info'); go('a-records', { tab: 'modules' }); };

/* ---------- Client demo: assessment record examples, made through the normal screens ---------- */
// Demo controls → "Load assessment record examples" (on request; Reset demo removes them). Needs the CF2 examples (Dev Patel's
// scheduled workplace observation) and loads them first. As their roles, through the existing handlers:
// Dev Patel — Assignment 1: submitted; Not met → resubmitted (red); Partially met → resubmitted (amber); Met, Pass. Assignment 2:
// submitted, Met, Pass. His workplace observation is recorded and signed off by James Pryce → module U001 › M1 is complete.
// Amira Shah — Assignment 1: submitted; Not met, resubmission required. The answer texts are labelled as client demo examples.
const CDA_EX = {
  dev1: ['<p>(Client demo example) Person-centred values mean the person is at the centre of their care.</p>',
    '<p>(Client demo example) Person-centred values include individuality, choice, privacy, dignity, respect and independence. In my role I ask each person how they want their support given.</p>',
    '<p>(Client demo example) Person-centred values — individuality, rights, choice, privacy, independence, dignity, respect and partnership — guide how I work. For example, when I support a resident with breakfast I offer choices, close the door for privacy and record what they tell me in their care plan so other staff respect it.</p><ul><li>Choice: two options offered at every meal</li><li>Dignity: personal care behind closed doors</li></ul>'],
  dev2: '<p>(Client demo example) A care plan is agreed with the individual, their family where they wish, and the care team. I explain the options, check understanding, record the person\'s preferences and review the plan when needs change.</p>',
  amira: '<p>(Client demo example) I treat everyone the same.</p>',
  fb: [['R', 'Name the person-centred values and explain how you apply them at work.'], ['A', 'The values are listed; add a workplace example of applying them.'], ['G', 'Clear values with a specific, anonymised workplace example.']],
  refs: ['<p>Care Certificate Standard 5 — Work in a person-centred way</p>', '<p>Care Certificate Standard 5; Care Act 2014</p>', '<p>Care Certificate Standard 5; Care Act 2014; NICE QS50</p>'] };
const cdaExOn = () => !!(STORE.cda && STORE.cda.examples);
// The examples' steps, through the normal screens as each role (also used by the tests): submit, mark and publish, observe
const cdaEx_ok1 = r => { const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !a.fn) throw new Error('No dialog to confirm'); if (r !== undefined) { const t = $('#rsn'); if (t) t.value = r; } const res = a.fn(); if (res === false) throw new Error((MODAL && MODAL.title) + ' refused'); closeModal(); };
const cdaEx_learner = k => { cdAs(k); };
const cdaEx_assessorOf = lid => { const tk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === chEff(lid, 'asg')); if (!tk) throw new Error('No assignment assessor'); S.tas.v = tk; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; };
const cdaEx_submit = (k, aid, html, refs) => { cdaEx_learner(k); const w = STORE.worlds[k], a = w.assignments.find(x => x.id === aid); if (!a) throw new Error('No ' + aid); const resub = a.status === 'Resubmission Required', n = resub ? Math.max(...a.qs.filter(q => q.state === 'rework').map(q => q.rounds.length)) : 0;
  go('assignment', { id: aid }); (resub ? a.qs.filter(q => q.state === 'rework') : a.qs).forEach(q => { W.drafts[`${a.id}.${q.id}.${q.rounds.length}`] = html; }); if (refs && a.refsOn) W.drafts[`${a.id}.refs.${(a.refRounds || []).length}`] = refs;
  finaliseSubmit(a, resub, now().toISOString()); closeModal(); if (a.status !== 'Submitted') throw new Error('Not submitted'); return { w, a, n }; };
const cdaEx_mark = (w, aid, rag, exit, text, outcome) => {
  const lid = w.me.id; cdaEx_assessorOf(lid); const s = tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); if (!s) throw new Error('Not in the assessor\'s marking');
  const sa = tasAsg(s), d = dft(s.key); markable(sa).forEach(q => { d.items[q.id] = { exit, corrections: exit === 'resub' ? text : '', days: 14, rag, met: rag === 'G' ? 'Met' : rag === 'A' ? 'Partially Met' : 'Not Met', verified: rag === 'G', vby: rag === 'G' ? TME().name : '', vat: rag === 'G' ? now().toISOString() : '', fb: text }; });
  d.overall = text; go('t-mark', { id: s.key }); if (ta1Publish(s.key) === false) throw new Error('Publish refused');
  if (outcome) { go('t-mark', { id: s.key }); ACT.r3Declare({ dataset: { k: s.key } }); if (!MODAL) throw new Error('Outcome refused'); const x = $(`#modal-root input[name="r3-res"][value="${outcome}"]`); if (!x) throw new Error('No outcome choice'); x.checked = true; const ofb = $('#modal-root #d-ofb'); if (ofb) ofb.value = '(Client demo example) Every criterion of this assignment is met. Well done.'; cdaEx_ok1('Client demo — all criteria met'); } // primary: "Publish to learner" (AR)
};
// Record and sign off the learner's confirmed workplace observation (EV-1) as their observation assessor
const cdaEx_observe = dev => {
  const o = dev.observations.find(x => x.dEv === 'EV-1' && x.status === 'Confirmed'); if (!o) throw new Error('No confirmed observation'); const rid = 'CD2-' + o.id, lid = dev.me.id;
  const tk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === chEff(lid, 'obs')); if (!tk) throw new Error('No observation assessor'); S.tas.v = tk; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {};
  go('t-obsrec', { id: rid }); ACT.orT({ dataset: { s: 'nvq', c: '001 2.1', k: 'o', v: '1' } }); ACT.orT({ dataset: { s: 'nvq', c: '001 2.1', k: 'c', v: '1' } }); INP.orM({ dataset: { s: 'nvq', c: '001 2.1' }, value: '(Client demo example) Offered two choices and respected the decision.' });
  if (INP.cf2Perf) INP.cf2Perf({ dataset: { s: 'nvq', c: '001 2.1' }, value: '(Client demo example) Supported the individual to choose lunch and clothing; checked understanding.' });
  const items = typeof ol1RecItems === 'function' ? ol1RecItems(obById(rid)) : []; items.forEach(i => { (i.req || []).forEach(t => { if (['notes', 'refs'].includes(t)) ACT.ol1EvAdd({ dataset: { id: rid, c: i.id, t, text: t === 'refs' ? 'DOC-REF-DEMO-001 (client demo reference)' : '(Client demo example) Observed during the lunchtime routine; no names recorded.' } }); else INP.ol1File({ dataset: { id: rid, c: i.id, t }, files: [{ name: 'demo-evidence-' + i.code + '.pdf', size: 1024 }] }); }); ACT.ol1Out({ dataset: { id: rid, c: i.id, v: 'Met' } }); });
  INP.orF({ dataset: { f: 'ctx' }, value: '(Client demo example) Lunchtime routine in the lounge.' }); INP.orF({ dataset: { f: 'notes' }, value: '(Client demo example) Calm, person-centred support throughout.' }); render(); $$('main .d-evt').forEach(x => { x.checked = true; }); if (INP.dEvt) INP.dEvt();
  ACT.orSave(); go('t-obsrec', { id: rid }); ACT.orSign({ dataset: { id: rid } }); const sa = MODAL && MODAL.actions.find(x => x.label === 'Sign off and lock'); if (!sa) throw new Error('Sign-off refused'); sa.fn(); closeModal();
  if (o.status !== 'Completed') throw new Error('Observation not completed');
};
function cdaDemoBuild() {
  const errs = (CDA().demoErr = []), step = (n, f) => { try { f(); } catch (e) { errs.push(n + ': ' + e.message); } closeModal(); };
  const submit = cdaEx_submit, mark = cdaEx_mark;
  if (!fxClient() || typeof cdBatch !== 'function' || !cdBatch()) { errs.push('The client demo is not loaded'); return; }
  if (typeof cf2ExOn === 'function' && !cf2ExOn()) { const run = () => cf2DemoBuild(); if (typeof fxQuiet === 'function') fxQuiet(run); else run(); STORE.cf2.examples = true; (CF2().demoErr || []).forEach(e => errs.push('CF2: ' + e)); }
  const dev = STORE.worlds.CD2, am = STORE.worlds.CD1;
  step('Dev — Assignment 1 (three rounds)', () => {
    submit('CD2', 'a10', CDA_EX.dev1[0], CDA_EX.refs[0]); mark(dev, 'a10', 'R', 'resub', CDA_EX.fb[0][1]);
    submit('CD2', 'a10', CDA_EX.dev1[1], CDA_EX.refs[1]); mark(dev, 'a10', 'A', 'resub', CDA_EX.fb[1][1]);
    submit('CD2', 'a10', CDA_EX.dev1[2], CDA_EX.refs[2]); mark(dev, 'a10', 'G', 'pass', CDA_EX.fb[2][1], 'Pass');
  });
  step('Dev — Assignment 2', () => { submit('CD2', 'a11', CDA_EX.dev2, CDA_EX.refs[1]); mark(dev, 'a11', 'G', 'pass', 'The steps to agree a care plan are clear and person-centred.', 'Pass'); });
  step('Dev — workplace observation recorded and signed off', () => cdaEx_observe(dev));
  step('Amira — Assignment 1', () => { submit('CD1', 'a10', CDA_EX.amira, CDA_EX.refs[0]); mark(am, 'a10', 'R', 'resub', 'Describe the person-centred values and give an example from your work.'); });
  closeModal(); S.ui = {};
}
ACT.cdaExamples = () => {
  if (typeof drOn === 'function' && !drOn()) { toast('Load the client demo first (Reset demo).', 'err'); return false; }
  if (cdaExOn()) { toast('The examples are already loaded.', 'info'); return; }
  confirmDlg({ title: 'Load the assessment record examples?', ok: 'Load examples', body: `<p class="small">Runs, through the normal screens and as their roles: Dev Patel submits Assignment 1 three times (Not met → Partially met → Met, Pass) and Assignment 2 (Met, Pass), and James Pryce records and signs off his workplace observation — so module U001 › M1 is complete. Amira Shah submits Assignment 1 (Not met, resubmission required). Loads the Client Feedback 2.0 examples first if needed. Answer texts are labelled as client demo examples. Reset demo removes them.</p>`,
    onOk: () => { const run = () => cdaDemoBuild(); if (typeof fxQuiet === 'function') fxQuiet(run); else run(); STORE.cda.examples = true; S.demoOpen = false; signOut();
      const e = CDA().demoErr || []; toast(e.length ? 'Examples loaded with problems: ' + e.join('; ') : 'Assessment record examples loaded. Choose a demo identity to continue.', e.length ? 'err' : 'info'); } });
};
if (typeof drPanel === 'function') { const _drPanelCDA = drPanel; drPanel = function () {
  const h = _drPanelCDA.apply(this, arguments); if (typeof drOn === 'function' && !drOn()) return h;
  const ctl = `<div class="dr-ctl cda-ex">${cdaExOn() ? `<p class="small">${chip('Assessment record examples loaded', 'green')}</p>` : `<button class="btn" data-act="cdaExamples">${ic('plus', 15)} Load assessment record examples</button>`}<p class="xs muted">Submissions, resubmissions, feedback and a completed module made through the normal screens — for the colour-coded downloads.</p></div>`;
  return h.replace('<div class="dr-ctl dr-devl">', ctl + '<div class="dr-ctl dr-devl">'); }; }

/* ---------- Records ---------- */
UXC.push(['CDA-B', 'Colour-coded assessment record downloads (17 Nov 2026)', [
  'Every assessment download now makes a real file from the saved record (before: a "downloaded (simulated)" message and no file). PDF is a real PDF with embedded Unicode fonts (every script kept — see CDA-C); Word is a real .docx; several files come as a ZIP.',
  'Colours: answers by round — Submission 1 black, Resubmission 1 red, Resubmission 2+ amber; assessor feedback by judgement — Not met red, Partially met amber, Met green — each also named in words, as on screen.',
  'Individual record: learner (Assignments → assignment → Download as PDF / Word), the allocated Assessor (My Marking → submission), the Coordinator (Submissions → submission) and Super / System / Academic Admin (Assessment Records → submission; Learners → learner → Academic). Content: learner, programme, batch, assignment, unit / module, presentation mode, criteria with their competency outcome and published judgements, every round with its files listed, the feedback for each round, References, overall and Coordinator comments, final outcome, history.',
  'Completed module (FL-ADM-12): Records → Module documents now lists the learners\' real modules from their records; PDF or Word only when every criterion is Achieved and nothing waits for marking (otherwise the outstanding items). Cover page, criteria, each assignment with all rounds and feedback, observations, PD outcomes, generation details.',
  'Batch export (FR-TA-06-07): Coordinator → batch → "Assignments and submissions export": learner, assignment, unit / module and status filters, PDF or Word, as a ZIP with a folder per learner and a README. Own batches only; refused and logged otherwise.',
  'Never exported: sample text the Coordinator list shows for cohort rows without a learner record, unpublished marking, or another learner\'s data. Every download is in the audit log.']]);
const _aIdxCDA = SCREENS['a-index'];
SCREENS['a-index'] = p => { const pid = typeof fxClient === 'function' && fxClient() && typeof cdPr === 'function' && cdPr() ? cdPr().id : 'NV-L3'; return _aIdxCDA(p) + `<section class="card idx-sec"><h2>CDA — Course documents and assessment record downloads</h2><ul class="idx-list">${[
  chIdxLi('Programme builder — step 2 Documents (required enrolment documents)', { act: 'aJump', t: 'a-programmes.' + pid + '.admdocs' }, 'CDA-A — edited in a draft version; applies when it is published.'),
  chIdxLi('Assessment Records — Module documents (from the learners\' records)', { act: 'aJump', t: 'a-records..modules' }, 'CDA-B — PDF / Word when the module is complete.')].join('')}</ul></section>`; };
