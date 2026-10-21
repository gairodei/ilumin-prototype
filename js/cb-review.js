/* ============================================================
   CB11 — Section 7 Review & Publish (21 Oct 2026; PD-CB-73…78 in PROVISIONAL-DECISIONS.md).
   One review for every NVQ programme — seeded (Level 2–5, drafts, suspended, retired) and made with "New NVQ programme":
   - A summary of the six configuration sections, each with its state (complete / to fix / warnings / not applicable) and a
     link to the section.
   - Every publishing blocker and warning, grouped by the section where it is fixed, each with a "Fix in Section N" link.
     The blockers are the existing publishing rules (ch8Check for builder programmes; S3's structure check and N5a's observation
     check for seeded ones) — nothing academic is added. The one accurate change: the CH-8 warning that counted every knowledge
     criterion as "not covered by assignments" is replaced by the real coverage from this programme's assignments.
   - Finance approval: the first publication of a Draft programme needs payment terms approved and in force (builder
     programmes: the E1 / CB8 approval, unchanged; seeded Draft programmes: a payment plan in force, set by Finance — new here,
     enforced in the publish action too). A new version doesn't change anyone's financial terms, so it doesn't need a new
     approval; the review says when publishing it will send an approved package back to Finance (observation basis changes).
   - Publish (Draft programme) or Publish version N (draft version) runs the existing action — ch8Publish, s3WizPublish or
     kPubProg — with its own permissions, checks, reason and audit. Nothing about learners, signed offer letters, approved
     financial packages or pinned schedules is changed by publishing (they stay with their versions).
   - Retired: a read-only summary, no publishing. Suspended: unchanged — a draft version is published under the existing rules
     and the programme stays Suspended (PD-CB-28).
   Loads after cb-rem.js.
   ============================================================ */
'use strict';

const CB_RV_SEC = CB_SECTIONS.slice(0, 6); // the six sections reviewed (Review & Publish is this one)
const cbRvN = k => CB_SECTIONS.findIndex(s => s[0] === k) + 1;
const cbRvName = k => (CB_SECTIONS.find(s => s[0] === k) || [k, k])[1];
const cbRvL = s => (s && s.status !== 'Retired');

/* ---------- Where each message is fixed: [section, panel] ---------- */
function cbRvWhere(pr, m) {
  const t = String(m);
  if (/choose whether observation is required|Does this course contain observations|course duration|Duration "/i.test(t)) return ['details', 'details'];
  if (/Assessment method not supported|give a Learning Outcome the Observation type/i.test(t)) return ['curriculum', 'structure'];
  if (/^Payment|payment terms|payment plan|Finance|fee option|deposit|observation fee/i.test(t)) return ['payments', cb8Managed(pr) ? 'fees' : 'plan'];
  if (/offer letter/i.test(t)) return ['documents', 'letter'];
  if (/required document|checklist/i.test(t)) return ['documents', 'docs'];
  if (/assignment|knowledge criteri/i.test(t)) return ['assessments', 'assessments'];
  if (/observation event|^Observations: event/i.test(t)) return ['observations', 'events'];
  if (/^Observations|^Review \(D5\)|observation/i.test(t)) return ['observations', 'obs'];
  if (/unit|module|Learning Outcome|criteri|assessment method|type/i.test(t)) return ['curriculum', 'structure'];
  return ['review', 'review'];
}

/* ---------- The version being published, and who may publish it ---------- */
// 'draftProg' (first publication), 'draftVer' (a new version), or null (nothing to publish)
const cbRvKind = pr => (!pr || cbRetired(pr) ? null : pr.status === 'Draft' ? 'draftProg' : cbDraftV(pr) ? 'draftVer' : null);
const cbRvAct = pr => (pr.chNew ? (pr.status === 'Draft' ? 'ch8Publish' : 's3WizPublish') : 'kPubProg');
const cbRvCan = () => cbAdmin(); // the publishing roles of every existing publish action (Super Admin, Academic Admin, System Admin)

/* ---------- Finance: the applicable approval ---------- */
// The terms a programme's first publication relies on; '' when they are approved and in force
function cbRvFinBlock(pr) {
  if (!pr || pr.status !== 'Draft') return '';
  if (pr.chNew) return ''; // builder programmes: E1 / CB8's own blocker is in ch8Check (unchanged)
  return s4PlanCur(pr.id) ? '' : 'Payment terms: no payment terms are in force for this programme — Finance sets and approves them (Finance → Payment Plans) before it can be published';
}
// Information for a new version: publishing it changes the observation basis of an approved financial package
function cbRvFinWarn(pr) {
  if (cbRvKind(pr) !== 'draftVer' || !cb8Managed(pr)) return '';
  const wf = cb8Wf(pr), d = typeof n5Draft === 'function' && n5DraftV(pr) ? n5Draft(pr) : null; if (!wf || !d) return '';
  const b = cb8Basis(pr), req = d.required === true ? true : d.required === false ? false : null, nb = { ...b, req, wp: req === true && d.workplace === 'Permitted', off: req === true && d.office === 'Available' };
  if (cb8Key(nb) === cb8Key(b)) return '';
  return `Payment terms: publishing this version changes the observation basis of the payment terms (${cb8BasisTxt(b)} → ${cb8BasisTxt(nb)}), so they go back to Finance for approval${wf.status === 'Approved' ? `; new learners keep plan version ${(s4PlanCur(pr.id) || {}).v || '—'} until Finance approves` : ''}`;
}

/* ---------- Knowledge criteria covered by this programme's assignments (replaces CH-8's count of every criterion) ---------- */
function cbRvCoverage(pr, tree) {
  const kn = (tree || []).filter(cbRvL).flatMap(u => u.mods.filter(cbRvL).flatMap(m => m.los.filter(cbRvL).filter(lo => critKind(lo.type || '') === 'Knowledge').flatMap(lo => lo.crit.filter(cbRvL).map(c => c.code))));
  const mapped = new Set(cbAsgOf(pr).filter(d => d.status !== 'Retired').flatMap(d => d.qs.filter(q => q.status === 'Active').flatMap(q => q.crit)));
  return { all: kn, un: kn.filter(c => !mapped.has(c)) };
}

/* ---------- Every blocker and warning, with the section that fixes it ---------- */
function cbRvChecks(pr) {
  const kind = cbRvKind(pr), out = { block: [], warn: [] }; if (!kind) return out;
  let block = [], warn = [];
  if (pr.chNew) { const r = ch8Check(pr); block = r.block.slice(); warn = (r.warn || []).filter(w => !/knowledge criteri.*not yet covered by assignments/i.test(w)); }
  else {
    const dv = s3Draft(pr.id), tree = kind === 'draftProg' ? s3Tree(pr.id) : dv ? dv.tree : [], s = s3Check(pr, tree);
    s.block.forEach(x => block.push(`Learning Outcome without an assessment type: ${x}`));
    if (s.other.length) block.push('Assessment method not supported yet — learners couldn\'t complete: ' + s.other.join('; ') + '. Change the type to publish');
    if (typeof n5Check === 'function' && STORE.n5 && n5DraftV(pr)) { const n = n5Check(pr); block.push(...n.block); warn.push(...(n.review || []), ...(n.warn || [])); }
    const f = cbRvFinBlock(pr); if (f) block.push(f);
  }
  const fw = cbRvFinWarn(pr); if (fw) warn.push(fw);
  const cov = cbRvCoverage(pr, cbTree(pr));
  if (cov.un.length) warn.push(`${plural(cov.un.length, 'knowledge criterion isn\'t', 'knowledge criteria aren\'t')} covered by an assignment yet (${cov.un.slice(0, 6).join(', ')}${cov.un.length > 6 ? '…' : ''}) — publishing is allowed; add or map assignments in Section 3`);
  const tag = m => { const [sec, tab] = cbRvWhere(pr, m); return { msg: String(m), sec, tab }; };
  out.block = block.map(tag); out.warn = warn.map(tag); return out;
}

/* ---------- Section summaries ---------- */
const cbRvYN = (v, y, n) => (v === true ? chip(y || 'Yes', 'green') : v === false ? chip(n || 'No', 'grey') : chip('Not answered', 'amber'));
const cbRvDl = rows => `<dl class="kv cb-rv-dl">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
const cbRvNone = t => `<span class="muted">${esc(t)}</span>`;
function cbRvSummary(pr, k) {
  switch (k) {
    case 'details': {
      const obs = cbObsOf(pr);
      return cbRvDl([['Course', `${esc(pr.title)} · ${esc(pr.level)}`], ['Course code', pr.code ? `<span class="mono">${esc(pr.code)}</span>` : cbRvNone('Not recorded')], ['Qualification number', pr.ref ? `<span class="mono">${esc(pr.ref)}</span>` : cbRvNone('Not recorded')],
        ['Duration', typeof e1DurHtml === 'function' ? e1DurHtml(pr) : esc(pr.dur || '—')], ['Default delivery mode for new batches', cbIsL3(pr) ? "From each learner's fee option — one batch can hold both" : esc(chSupportOf(pr.id))], ['Observations', cbRvYN(obs, 'Yes', 'No — not applicable')]]);
    }
    case 'curriculum': {
      const t = (cbTree(pr) || []).filter(cbRvL), mods = t.flatMap(u => u.mods.filter(cbRvL)), los = mods.flatMap(m => m.los.filter(cbRvL)), crit = los.flatMap(l => l.crit.filter(cbRvL));
      const by = {}; los.forEach(l => { const n = l.type || 'No type'; by[n] = (by[n] || 0) + 1; });
      return t.length ? cbRvDl([['Structure', `${plural(t.length, 'unit')} · ${plural(mods.length, 'module')} · ${plural(los.length, 'Learning Outcome')} · ${plural(crit.length, 'criterion', 'criteria')}`], ['Assessment types', esc(Object.entries(by).map(([n, c]) => `${n} ${c}`).join(' · ') || '—')]]) : `<p class="small">${cbRvNone('No structure yet.')}</p>`;
    }
    case 'assessments': {
      const L = cbAsgOf(pr), st = s => L.filter(d => d.status === s).length, cov = cbRvCoverage(pr, cbTree(pr));
      return cbRvDl([['Assignments', L.length ? `${plural(L.length, 'assignment')} — ${st('Published')} published, ${st('Draft')} draft${st('Retired') ? `, ${st('Retired')} retired` : ''} · ${L.filter(d => d.refs).length} with References` : cbRvNone('None yet')],
        ['Knowledge criteria covered', cov.all.length ? `${cov.all.length - cov.un.length} of ${cov.all.length}` : cbRvNone('No knowledge criteria')]]);
    }
    case 'observations': {
      const d = typeof n5Shown === 'function' ? n5Shown(pr) : null;
      if (!d) return `<p class="small">${cbRvNone('No observation configuration is recorded for this version (configured before N5).')}</p>`;
      if (d.required === false) return `<p class="small">Not applicable — this course has no observations (Course Details).</p>`;
      const nvq = n5NvqOk(pr, d), ev = cbEvOf(d), cov = nvq.filter(c => ev.some(e => e.crit.includes(c.code))).length;
      return cbRvDl([['Observation required', cbRvYN(d.required)], ['Permitted locations', esc([d.workplace === 'Permitted' && 'Workplace', d.office === 'Available' && 'Academy office'].filter(Boolean).join(' · ') || 'None')],
        ['Required observations', ev.length ? `${plural(ev.length, 'observation event')} — ${esc(ev.map(e => e.name).join(' · '))}` : cbRvNone(d.state === 'Draft' ? 'None yet' : 'Not recorded for this version')], ['NVQ observation criteria covered', nvq.length ? `${cov} of ${nvq.length}` : cbRvNone('None')],
        ['Academy criteria', String(d.ia.filter(c => c.status === 'Active').length)]]);
    }
    case 'payments': return cbRvFees(pr);
    case 'documents': {
      const L = chLetterCur(pr.id), ck = s4List(pr.id), act = (ck.items || []).filter(i => i.status === 'Active'), sg = cbSigners(pr);
      return cbRvDl([['Offer letter (course contract)', L ? `Version ${L.v}${L.file ? ` · ${esc(L.file)}` : ''} · ${plural(sg.length, 'learner')} signed` : cbRvNone('No offer letter uploaded')],
        ['Required enrolment documents', `Checklist version ${ck.v} · ${plural(act.length, 'document')} (${act.filter(i => i.mand).length} mandatory)`]]);
    }
  }
  return '';
}
function cbRvFees(pr) {
  const obs = cb8Basis(pr);
  if (cb8Managed(pr)) {
    const wf = cb8Wf(pr), st = wf ? wf.status : 'Draft', pend = st === 'Pending' && wf.sub, cur = cb8Cur(pr.id), P = pend ? wf.sub : st === 'Approved' && cur ? cur : cb8Work(pr), ap = wf && wf.approved;
    const appr = st === 'Approved' ? `${chip('Approved', 'green')} ${ap ? `${esc(ap.by)}, ${fd(ap.at)}${ap.qid ? ` (${esc(ap.qid)})` : ap.how ? ` — ${esc(ap.how)}` : ''}` : ''}${cur ? ` · plan version ${s4PlanCur(pr.id).v} · terms locked` : ''}`
      : st === 'Pending' ? `${chip('Waiting for Finance review', 'amber')} <span class="mono">${esc(wf.qid || '')}</span>` : st === 'Changes' ? `${chip('Changes requested by Finance', 'red')} ${esc(wf.changes ? wf.changes.reason : '')}` : chip('Not yet sent to Finance', 'grey');
    const ob = o => (obs.req !== true ? '' : ` · observation fee ${[obs.wp && `workplace ${o.obsWp == null ? '—' : money(o.obsWp, 'GBP')}`, obs.off && `Academy office ${o.obsOff == null ? '—' : money(o.obsOff, 'GBP')}`].filter(Boolean).join(', ')}`);
    const opts = P.opts.filter(o => o.status === 'Active');
    return cbRvDl([['Finance approval', appr], ['Fee options', opts.length ? `<ul class="cb-rv-opts">${opts.map(o => `<li><strong>${esc(o.label)}</strong>${o.mode ? ` · ${esc(o.mode)}` : ''} · ${o.fee > 0 ? money(o.fee, 'GBP') : '—'}${ob(o)} · ${o.pay.length ? esc(o.pay.map(x => cb8PayLbl(x.k)).join(', ')) : 'no payment options'}</li>`).join('')}</ul>` : cbRvNone('None')],
      ['Deposit', esc(cb8DepTxt(P.dep))]]);
  }
  const p = s4PlanCur(pr.id), T = e1T(pr.id), o = cbIsL3(pr) && typeof r1Opts === 'function' ? r1Opts(pr.id).filter(x => x.status === 'Active') : [];
  const fin = T ? (T.status === 'Approved' ? `${chip('Approved', 'green')} ${T.approved ? esc(T.approved.by || '') : ''}${T.qid ? ` <span class="mono">${esc(T.qid)}</span>` : ''}` : chip(T.status === 'Pending' ? 'Waiting for Finance review' : T.status === 'Changes' ? 'Changes requested by Finance' : 'Not yet sent to Finance', T.status === 'Changes' ? 'red' : 'amber')) : p ? 'Set by Finance (Finance → Payment Plans)' : chip('None', 'red');
  return cbRvDl([['Finance approval', fin], ['Payment terms', p ? `${chip('In force', 'green')} plan version ${p.v} · ${esc(s4PlanTxt(p))} <span class="xs muted">(set before financial packages; owned by Finance)</span>` : T ? chip(`E1 terms: ${T.status}`, T.status === 'Approved' ? 'green' : 'amber') : chip('None in force', 'red')],
    o.length ? ['Fee options', esc(o.map(x => `${x.legacy ? 'Standard programme fee' : x.label} ${money(r1FeeOf(x), 'GBP')}`).join(' · '))] : null]);
}

/* ---------- The panel ---------- */
const cbRvCap = t => t.charAt(0).toUpperCase() + t.slice(1);
const cbRvFix = (pr, it) => (it.sec === 'review' ? '' : `<button class="btn btn-sm btn-ghost cb-rv-fix" data-go="a-programmes" data-id="${pr.id}" data-tab="${it.tab}">Fix in Section ${cbRvN(it.sec)} — ${esc(cbRvName(it.sec))}</button>`);
function cbReview(pr) {
  const kind = cbRvKind(pr), ret = cbRetired(pr), c = cbRvChecks(pr), dv = cbDraftV(pr), can = cbRvCan() && !!kind;
  const per = k => ({ b: c.block.filter(x => x.sec === k), w: c.warn.filter(x => x.sec === k) });
  const stateOf = k => { const p = per(k); if (k === 'observations' && cbObsNo(pr)) return chip('Not applicable', 'grey'); if (k === 'observations' && kind && cbObsOf(pr) == null && !p.b.length) return chip('Waiting for the Course Details answer', 'amber'); return !kind ? chip(ret ? 'Read-only' : 'Published', 'grey') : p.b.length ? chip(`${p.b.length} to fix`, 'red') : p.w.length ? chip(plural(p.w.length, 'warning'), 'amber') : chip('Complete', 'green'); };
  const head = ret ? `<div class="note b-grey cb-rv-state" role="status">${ic('lock')}<div class="small"><strong>Retired — a read-only historical record.</strong> Nothing can be published. Version ${pr.version} was the last version; learners who studied it keep their versions, signed letters and payment records.</div></div>`
    : !kind ? `<div class="note b-blue cb-rv-state" role="status">${ic('layers')}<div class="small"><strong>Version ${pr.version} is published${pr.status === 'Suspended' ? ' (programme Suspended)' : ''}.</strong> There is nothing to publish. To change the structure, assessments' criteria or observation configuration, create a new version: a draft you review here and publish. Learners stay on their version.</div></div>`
    : c.block.length ? `<div class="note b-red cb-rv-state" role="status">${ic('alert')}<div class="small"><strong>${plural(c.block.length, 'item')} to fix before ${kind === 'draftProg' ? 'this programme' : `Version ${dv}`} can be published.</strong> Each one links to the section where it is fixed.</div></div>`
    : `<div class="note b-green cb-rv-state" role="status">${ic('check')}<div class="small"><strong>Ready to publish ${kind === 'draftProg' ? 'Version 1' : `Version ${dv}`}.</strong> Nothing is blocking.${c.warn.length ? ` ${plural(c.warn.length, 'warning')} below don't stop publication.` : ''}</div></div>`;
  const list = (arr, bad) => arr.map(x => `<li class="li cb-rv-it" data-sec="${x.sec}">${chip(bad ? 'Blocking' : 'Warning', bad ? 'red' : 'amber')}<span class="cb-rv-msg">${esc(cbRvCap(x.msg.replace(/^Observations: /, '')))}</span>${cbRvFix(pr, x)}</li>`).join('');
  const grouped = kind && (c.block.length || c.warn.length) ? `<section class="cb-rv-todo"><h3>Before publishing</h3>${CB_SECTIONS.map(([k]) => { const p = per(k); return p.b.length || p.w.length ? `<div class="cb-rv-grp" data-sec="${k}"><h4>${cbRvN(k)}. ${esc(cbRvName(k))}</h4><ul class="list small">${list(p.b, true)}${list(p.w, false)}</ul></div>` : ''; }).join('')}</section>` : '';
  const cards = `<ol class="cb-rv-secs">${CB_RV_SEC.map(([k, l], n) => `<li class="cb-rv-sec" data-sec="${k}"><div class="cb-rv-sh"><h3><span class="cb-hn">${n + 1}</span> ${esc(l)}</h3><span class="row cb-rv-st">${stateOf(k)}<button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="${k}">Open</button></span></div>${cbRvSummary(pr, k)}</li>`).join('')}</ol>`;
  const btn = !kind ? '' : !can ? `<p class="xs muted">${ic('lock', 12)} Published by the Super Admin, Academic Admin or System Admin.</p>`
    : `<div class="row cb-rv-pubrow"><button class="btn btn-primary" data-act="cbPublish" data-id="${pr.id}" ${c.block.length ? `disabled aria-disabled="true" title="${esc(plural(c.block.length, 'item') + ' to fix first')}"` : ''}>${kind === 'draftProg' ? 'Publish programme' : `Publish version ${dv}`}</button>${c.block.length ? `<span class="small cb-rv-why">Fix the ${plural(c.block.length, 'blocking item')} to publish.</span>` : ''}</div>`;
  const what = !kind ? '' : `<div class="cb-rv-pub"><h3>${kind === 'draftProg' ? 'Publishing the programme' : `Publishing Version ${dv}`}</h3><ul class="small cb-rv-keep">${(kind === 'draftProg' ? ['Version 1 becomes available for batches and sign-up, with the approved payment terms in force.'] : [`Version ${dv} becomes the version for new batches and sign-ups. Learners on Version ${pr.version} or earlier stay on their version.`]).concat(['Signed offer letters, approved financial packages, learners\' pinned payment schedules and their programme versions are kept exactly as they are.', 'You give a reason; the publication is recorded in the audit and the version history.']).map(t => `<li>${esc(t)}</li>`).join('')}</ul>${btn}</div>`;
  const verLink = `<p class="xs muted cb-rv-vh">${ic('layers', 12)} Earlier versions: <button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="versions">Version history</button></p>`;
  const nv = !kind && !ret && cbRvCan() ? `<div class="row"><button class="btn" data-act="${pr.chNew ? 's3WizVersion' : 'newProgVersion'}" data-id="${pr.id}">Create new version</button></div>` : '';
  return `<section class="card cb-rv"><div class="row-b"><h2>Review &amp; publish${kind ? ` — ${kind === 'draftProg' ? 'Version 1 (draft programme)' : `Version ${dv} (draft)`}` : ''}</h2>${chip(pr.status, { Active: 'green', Draft: 'amber', Suspended: 'amber', Retired: 'grey' }[pr.status] || 'grey')}</div>
    ${head}${grouped}<h3 class="cb-rv-h">Summary of every section</h3>${cards}${what}${nv}${verLink}</section>`;
}

/* ---------- The section: one panel for every programme ---------- */
const _panelsCB11 = cbPanels;
cbPanels = function (pr, sec) {
  if (sec !== 'review') return _panelsCB11.apply(this, arguments);
  return [['review', 'Review & publish', () => { const d = document.createElement('div'); d.innerHTML = cbReview(pr); return cbHtml(d, pr); }]];
};
// Badges: the same checks, by the section that fixes them
const _badgesCB11 = cbBadges;
cbBadges = function (pr) {
  const b = _badgesCB11.apply(this, arguments);
  if (!cbRvKind(pr)) return b;
  const c = cbRvChecks(pr), n = {}; c.block.forEach(x => { n[x.sec] = (n[x.sec] || 0) + 1; });
  Object.entries(n).forEach(([s, k]) => { if (s !== 'review') (b[s] = b[s] || []).unshift(`<span class="cb-badge bad">${k} to fix</span>`); });
  if (c.block.length) (b.review = b.review || []).unshift(`<span class="cb-badge bad">${c.block.length} blocking</span>`);
  else (b.review = b.review || []).unshift('<span class="cb-badge ok">Ready</span>');
  return b;
};

/* ---------- Publish: the existing action for the programme's kind (its own permission, checks, reason and audit) ---------- */
ACT.cbPublish = el => {
  const pr = cbPr(el && el.dataset && el.dataset.id); if (!pr) return;
  if (cbRetired(pr)) { logA('NVQ Programmes', cbEnt(pr), 'Blocked: publish (programme retired)', '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('This programme is retired, so it is read-only.', 'err'); return; }
  if (!cbRvKind(pr)) { toast('Nothing to publish — create a new version first.', 'info'); return; }
  return ACT[cbRvAct(pr)]({ dataset: { id: pr.id } });
};
if (!CB_WRITE.includes('cbPublish')) CB_WRITE.push('cbPublish');
// Seeded Draft programmes: the first publication needs payment terms in force (builder programmes already need E1 / CB8 approval)
const _pubCB11 = ACT.kPubProg;
ACT.kPubProg = el => {
  const pr = s3Pr(el && el.dataset ? el.dataset.id : null), why = pr && !pr.chNew && typeof s3CanEdit === 'function' && s3CanEdit() ? cbRvFinBlock(pr) : '';
  const r = _pubCB11(el); if (!why) return r;
  const note = `<div class="note b-red cb-rv-fin">${ic('alert')}<div class="small"><strong>Finance approval is needed first.</strong> ${esc(why.replace(/^Payment terms: /, ''))}.</div></div>`;
  // the existing refusal (structure, observations) keeps its place and its audit entry; the payment terms join it
  if (MODAL && /^Can't publish/.test(MODAL.title || '')) { MODAL.body += note; renderModal(); return r; }
  if (MODAL && /^Publish/.test(MODAL.title || '')) closeModal(); else if (!MODAL) return r;
  s3Log(pr, 'Blocked: publish (no payment terms in force)', 'Draft', '—', why);
  openModal({ title: "Can't publish this programme", body: note, actions: [{ label: 'Close' }, { label: 'Open Review & Publish', cls: 'btn-primary', fn: () => { go('a-programmes', { id: pr.id, tab: 'review' }); } }] });
};

/* ---------- Records ---------- */
UXC.push(['CB11', 'Review & Publish (21 Oct 2026)', [
  'Section 7 is one review for every programme: a summary of the six sections (course details, curriculum, assessments, observations, fees and payments with the Finance approval, offer letter and enrolment documents), each with its state and an Open link.',
  '"Before publishing" lists every blocking item and warning grouped by section, each with "Fix in Section N". The blockers are the existing publishing rules; the old "knowledge criteria not covered" count now uses this programme\'s assignments.',
  'Finance approval: a Draft programme can\'t be published until its payment terms are approved and in force — builder programmes through Fees & Payments (unchanged), seeded Draft programmes through Finance → Payment Plans (new; refused and logged in the publish action too). A new version needs no new approval; the review says when publishing it sends an approved package back to Finance.',
  '"Publish programme" / "Publish version N" here runs the existing publish action (permissions, checks, reason, audit). Publishing keeps signed offer letters, approved financial packages, pinned schedules and learners\' versions unchanged. Retired programmes show a read-only summary; Suspended programmes keep their existing rule.']]);
const _aIdxCB11 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB11(p) + `<section class="card idx-sec"><h2>CB11 — Review &amp; Publish</h2><ul class="idx-list">${[
  chIdxLi('New programme NV-N1 (Draft) — Review & Publish', { act: 'aJump', t: 'a-programmes.NV-N1.review' }, 'CB11 — blockers grouped by section, with links to fix them.'),
  chIdxLi('Level 3 2027 update (Draft) — Review & Publish', { act: 'aJump', t: 'a-programmes.NV-L3D.review' }, 'CB11 — a seeded Draft: payment terms needed before publishing.'),
  chIdxLi('Level 3 Diploma (published) — Review & Publish', { act: 'aJump', t: 'a-programmes.NV-L3.review' }, 'CB11 — nothing to publish; create a new version.'),
  chIdxLi('Level 3 2018 spec (Retired) — Review & Publish', { act: 'aJump', t: 'a-programmes.NV-L3O.review' }, 'CB11 — read-only summary.')].join('')}</ul></section>`;
