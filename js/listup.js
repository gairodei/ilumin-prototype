/* ============================================================
   List upgrade — cross-portal pieces that must load after every portal file:
   B5 messages search/filters/highlight and B1.7 filtered exports (wraps every ACT.aExport override: admin, IQA, agency).
   ============================================================ */


/* ---------- B5 Messages screens: search with highlight, Unread, status, Date (last message), latest activity first ---------- */
const thMsgTxt = m => typeof m === 'string' ? m : Array.isArray(m) ? (m[2] || '') : (m.text || m.body || '');
const thMsgAt = m => Array.isArray(m) ? m[1] : (m && m.at) || '';
const thMsgWho = m => Array.isArray(m) ? m[0] : (m && (m.from || '')) || '';
const thLast = t => t.msgs && t.msgs.length ? t.msgs[t.msgs.length - 1] : null;
const TH_ACC = {
  L: { unread: t => !!t.unread, names: t => (t.with || []).join(' ') + ' ' + (t.course || '') },
  A: { unread: t => t.status === 'Open' && thLast(t) && thMsgWho(thLast(t)) !== ADMIN.me.name, names: t => (t.party || '') + ' ' + (t.with || []).join(' ') },
  F: { unread: t => t.status === 'Open' && thLast(t) && thMsgWho(thLast(t)) !== ADMIN.me.name, names: t => t.party || '' },
  B: { unread: t => t.status === 'Open' && thLast(t) && thMsgWho(thLast(t)) !== ADMIN.me.name, names: t => (t.party || '') + ' ' + (t.cat || ''), noStatus: true },
  C: { unread: t => unreadT(t), names: t => (t.with || []).join(' ') },
  T: { unread: t => t.msgs.length > (t.seen || 0) && thMsgWho(thLast(t)) !== TME().name, names: t => (t.with || []).join(' ') },
  G: { unread: t => t.msgs.length > (t._agySeen || 0) && !agyIsMine(thMsgWho(thLast(t))), names: t => (t.cat || '') + ' Illumin Academy' },
};
const thS = k => S.ui['th-' + k] = S.ui['th-' + k] || { q: '', unread: false, st: '', p: 'all', from: '', to: '' };
function thx(k, list) {
  const s = thS(k), a = TH_ACC[k], q = s.q.toLowerCase(), [d1, d2] = dtRange(s.p, s.from, s.to);
  return list.filter(t => (!q || [t.subject, a.names(t), ...(t.msgs || []).map(thMsgTxt)].join(' ').toLowerCase().includes(q)) && (!s.unread || a.unread(t)) && (!s.st || t.status === s.st) && ((!d1 && !d2) || (thLast(t) && (!d1 || new Date(thMsgAt(thLast(t))) >= d1) && (!d2 || new Date(thMsgAt(thLast(t))) < d2))))
    .slice().sort((x, y) => { const p = thMsgAt(thLast(x)), r = thMsgAt(thLast(y)); return p < r ? 1 : p > r ? -1 : 0; });
}
function thBar(k, list) {
  const s = thS(k), a = TH_ACC[k], sts = a.noStatus ? [] : [...new Set(list.map(t => t.status).filter(Boolean))], n = thx(k, list).length;
  return `<div class="th-bar"><label class="sr" for="thq-${k}">Search messages</label><input class="input" type="search" id="thq-${k}" placeholder="Search subject, people, messages…" value="${esc(s.q)}" data-oninput="thQ" data-k="${k}">
    <div class="row th-filt"><label class="check small"><input type="checkbox" ${s.unread ? 'checked' : ''} data-onchange="thU" data-k="${k}"> Unread</label>${sts.length ? `<label class="sr" for="ths-${k}">Status</label><select class="select dt-sel" id="ths-${k}" data-onchange="thSt2" data-k="${k}"><option value="">All statuses</option>${['Open', 'Answered', 'Closed'].filter(x => sts.includes(x)).map(x => `<option ${s.st === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : ''}<label class="sr" for="thp-${k}">Last message date</label><select class="select dt-sel" id="thp-${k}" data-onchange="thP" data-k="${k}">${DT_PRESETS.map(([v, l]) => `<option value="${v}" ${s.p === v ? 'selected' : ''}>${v === 'all' ? 'Any date' : l}</option>`).join('')}</select>${s.p === 'custom' ? `<label class="sr" for="thf-${k}">From</label><input class="input dt-sel" type="date" id="thf-${k}" value="${s.from}" max="${dtLocalDay(now())}" data-onchange="thD" data-k="${k}" data-w="from"><label class="sr" for="tht-${k}">To</label><input class="input dt-sel" type="date" id="tht-${k}" value="${s.to}" max="${dtLocalDay(now())}" data-onchange="thD" data-k="${k}" data-w="to">${s.err ? `<span class="err small" role="alert">${esc(s.err)}</span>` : ''}` : ''}<span class="xs muted" role="status">${n} of ${list.length}</span></div>
    ${!n && list.length ? `<p class="small muted">No threads match. <button class="linklike" data-act="thClr" data-k="${k}">Clear filters</button></p>` : ''}</div>`;
}
INP.thQ = el => { thS(el.dataset.k).q = el.value; render(); const i = $('#thq-' + el.dataset.k); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
INP.thU = el => { thS(el.dataset.k).unread = el.checked; render(); };
INP.thSt2 = el => { thS(el.dataset.k).st = el.value; render(); };
INP.thP = el => { const s = thS(el.dataset.k); s.p = el.value; s.err = ''; if (el.value !== 'custom') { s.from = ''; s.to = ''; } render(); };
INP.thD = el => { const s = thS(el.dataset.k), v = { from: s.from, to: s.to, [el.dataset.w]: el.value }; if (v.from && v.to && v.from > v.to) { s.err = '"From" must not be after "To".'; render(); return; } s.from = v.from; s.to = v.to; s.err = ''; render(); };
ACT.thClr = el => { Object.assign(thS(el.dataset.k), { q: '', unread: false, st: '', p: 'all', from: '', to: '', err: '' }); render(); };
// Highlight matches in the thread list and open thread; scroll the open thread to its first match once.
const TH_ROUTE = { messages: 'L', 'a-messages': 'A', 'f-messages': 'F', 'b-messages': 'B', 'c-messages': 'C', 't-messages': 'T', 'g-messages': 'G' };
AFTER.push(() => {
  const k = TH_ROUTE[S.route], s = k && S.ui['th-' + k]; if (!s || !s.q) return;
  const q = s.q.toLowerCase(), roots = [...document.querySelectorAll('.thread-list .ti-sub, .thread-list .ti-last, .chat-b')];
  roots.forEach(root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode); nodes.forEach(n => { const i = n.nodeValue.toLowerCase().indexOf(q); if (i < 0 || n.parentNode.closest('mark,button.btn,select,textarea')) return; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length); const m = document.createElement('mark'); try { r.surroundContents(m); } catch (e) { } }); });
  const first = document.querySelector('.chat-b mark'), id = S.route + '.' + (S.params.id || '');
  if (first && s.scrolled !== id) { s.scrolled = id; first.scrollIntoView({ block: 'center' }); }
});

/* ---------- B1.7 Exports respect the active view ---------- */
const _aExpLU = ACT.aExport;
ACT.aExport = el => {
  const tid = el.dataset.tid, cfg = tid && DT[tid];
  if (!cfg) return _aExpLU(el);
  const X = dtCompute(cfg), n = X.rows.length, all = cfg.rows.length, sum = X.summary;
  const run = desc => _aExpLU({ dataset: { n: `${el.dataset.n} — ${desc}`, f: el.dataset.f } });
  const acts = [{ label: 'Cancel' }];
  if (n !== all) acts.push({ label: `Export all ${all} rows instead`, fn: () => { run(`all ${all} rows (no filters)`); } });
  if (n) acts.push({ label: `Export ${n} row${n === 1 ? '' : 's'}`, cls: 'btn-primary', fn: () => { run(`${n} rows` + (sum.length ? ' · filters: ' + sum.join(', ') : '')); } });
  openModal({ title: `Export ${el.dataset.n} (${el.dataset.f})`, body: n ? `<p>Exporting <strong>${n} row${n === 1 ? '' : 's'}</strong>${sum.length ? ': ' + esc(sum.join(', ')) : ' — no filters, so every row'}.</p><p class="small muted">Exports contain only what is filtered on screen. The filters used are recorded in the export log.</p>` : `<p>No rows match the current filters.</p>`, actions: acts });
};
