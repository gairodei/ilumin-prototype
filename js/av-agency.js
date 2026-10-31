/* ============================================================
   Batch AV — agency visibility of final assessment outcomes (31 Oct 2026; PD-AV-* in PROVISIONAL-DECISIONS.md). Loads last.
   The client confirmed that an agency sees the final Pass / Fail of its sponsored learners. On the agency's learner page
   (Learners → learner → Progress) each NVQ programme the agency sponsors for that learner lists its assignments with the Assessor's
   published final outcome, the publication date, the Assessor and the published overall feedback; before publication "Awaiting
   final assessment".
   - Who: only a learner on the agency's roster (agyRoster — the existing created / linked rule, unchanged), and only outcomes that
     belong to an NVQ enrolment that agency sponsors (the enrolment's sponsor, or the agency's own seat for that programme). An
     outcome carries the programme it was published for (own); one that can't be matched to the sponsored enrolment is not shown
     (fail closed). Sharing a batch or programme with a sponsored learner gives nothing. The Academy's per-agency "Pass / Fail
     result" setting (vis.assessment) still applies, in the accessor itself.
   - What: the published outcome only (dOutSeen — the rule the learner's own view uses). Never a saved draft decision, the
     Assessor's rationale, criterion judgements, submissions, internal notes or documents. Nothing is derived from criteria.
   - Enforced in agyOutcomes(), the one data accessor the page uses: it refuses (and logs) another agency's or an unrelated learner,
     and works only in the agency portal. The agency has no control to declare, edit or publish; R3's action checks refuse it.
   Publishing only adds the programme stamp to the outcome; the learner's view, Coordinator criterion feedback, References and
   drafts are unchanged.
   ============================================================ */
'use strict';

const AV_RESPECT_VIS = true; // PD-AV-03: the Academy's per-agency "Pass / Fail result" setting also governs these outcomes
const AV_AWAIT = 'Awaiting final assessment', AV_NONE = 'No final outcome recorded', AV_HELD = 'Not available — contact the Academy';

/* ---------- Which programme an outcome belongs to ----------
   R3 keeps one outcome per learner and assignment ID ("lid~aid"), and the seeded programmes share assignment IDs, so the key alone
   can't say which programme (and so which sponsor) an outcome belongs to. When the Assessor publishes, the outcome is stamped with
   the programme and batch of the submission R3 authorised the Assessor for (own: { prog, batch }). If this Assessor is also the
   allocated assessor for the learner in a batch of another programme, the stamp is { ambiguous: true } and no agency sees it. */
function avStamp(key, me) {
  const subs = chRaw(() => tasSubs(true)).filter(x => x.key === key && x.L.batch), s = subs[0]; if (!s) return { ambiguous: true };
  const progs = new Set(subs.filter(x => chEff(x.L.lid, 'asg', x.L.batch) === me).map(x => x.L.batch.course).concat([s.L.batch.course]));
  return progs.size === 1 ? { prog: s.L.batch.course, batch: s.L.batch.code } : { ambiguous: true };
}
const _declAV = ACT.r3Declare;
ACT.r3Declare = el => {
  const key = el && el.dataset && el.dataset.k, r = _declAV(el); if (!MODAL || !/^Final outcome/.test(MODAL.title || '')) return r;
  const pub = MODAL.actions.find(x => /primary/.test(x.cls || '')), g = pub && pub.fn; if (!g) return r;
  pub.fn = (...x) => { const before = r3Out(key), me = S.portal === 'staff' ? TME().name : '', res = g(...x), o = r3Out(key); if (res !== false && o && o !== before) o.own = avStamp(key, me); return res; };
  return r;
};

/* ---------- The learner's NVQ enrolments and the ones this agency sponsors ---------- */
const avNvqs = L => !L ? [] : L.v ? ((STORE.worlds[L.v] || {}).enrolments || []).filter(e => e.kind === 'nvq' && e.title) : (L._enr || []).filter(e => e.type === 'NVQ / RQF' && e.title);
const avSponsors = (L, e, name) => e.sponsor === name || agyAssign(name).some(x => x.lid === L.id && x.kind === 'nvq' && x.course === e.title && !/^Rejected|^Unassigned/.test(x.status));
// The batch an enrolment is in, when the record says so (a learner's own record; seeded learners' enrolments don't name one)
const avEnrBatch = (L, e) => (L.v && e === (STORE.worlds[L.v] || {}).nvq ? chBatchCodeOfW(STORE.worlds[L.v]) : '') || null;
// Does this published outcome belong to enrolment e? Anything that can't be shown to belong to it is false (fail closed).
function avOwns(L, e, o) {
  const all = avNvqs(L);
  if (!o.own) return all.length === 1 && all[0] === e; // published before the stamp: only a learner with one NVQ enrolment is unambiguous
  if (o.own.ambiguous || o.own.prog !== e.title) return false;
  if (all.filter(x => x.title === e.title).length === 1) return true;
  const b = avEnrBatch(L, e); return !!b && b === o.own.batch; // two enrolments on the same programme: the batch must match
}
// The enrolment's assignments (id, title, status) — from the learner's own record, or from their batch records for that programme
function avAsgs(L, e) {
  if (L.v) return e === (STORE.worlds[L.v] || {}).nvq ? (STORE.worlds[L.v].assignments || []).map(a => ({ id: a.id, title: a.title, st: a.status })) : [];
  const cs = ADMIN.batches.filter(b => b.course === e.title).map(b => (b.coh || []).find(c => c.lid === L.id)).filter(c => c && c.subs);
  return BASE_ASGS().filter(a => cs.some(c => c.subs[a.id])).map(a => { const k = L.id + '~' + a.id, rel = STORE.tas.rel[k], ov = STORE.tas.over[k]; return { id: a.id, title: a.title, st: rel ? rel.status : ov ? ov.status : cs.find(c => c.subs[a.id]).subs[a.id] }; });
}
const avDeny = (lid, why) => { ADMIN.security.unshift({ id: 'SE-AV-' + (ADMIN.security.length + 1) + '-' + Date.now().toString(36), sev: 'High', at: now().toISOString(), type: 'Denied cross-agency access', detail: `Agency admin (${S.portal === 'agency' ? AGN() : '—'}) tried to read final assessment outcomes for learner ${lid || '—'} — ${why}`, reviewed: false }); return null; };

// The data accessor: { progs: [{ prog, rows: [{ aid, title, result, pubAt, by, round, feedback, label }] }] }, one entry per NVQ
// enrolment this agency sponsors, for this agency's learner — else null
function agyOutcomes(lid) {
  if (S.portal !== 'agency') return avDeny(lid, 'not signed in as an agency');
  if (!lid || !inRoster(lid)) return avDeny(lid, 'not a learner of this agency');
  if (AV_RESPECT_VIS && !vis().assessment) return null; // the Academy doesn't share Pass / Fail with this agency (not an attempt)
  const L = learnerById(lid), mine = avNvqs(L).filter(e => avSponsors(L, e, AGN())); if (!mine.length) return null; // none sponsored by this agency
  return { progs: mine.map(e => ({ prog: e.title, rows: avAsgs(L, e).map(a => {
    const k = lid + '~' + a.id, o = dOutSeen(k) ? r3Out(k) : null; // published only — a draft decision is never read here
    if (o && avOwns(L, e, o)) return { aid: a.id, title: a.title, result: o.result, pubAt: o.pubAt || o.at, by: o.by, round: o.round, feedback: o.feedback || '', label: o.result };
    if (o && (!o.own || o.own.ambiguous)) return { aid: a.id, title: a.title, result: null, label: AV_HELD }; // can't tell whose programme it is
    return { aid: a.id, title: a.title, result: null, label: a.st === 'Completed' && !r3Out(k) ? AV_NONE : AV_AWAIT };
  }) })) };
}

function avCard(lid) {
  const d = agyOutcomes(lid); if (!d) return '';
  const why = { [AV_NONE]: 'Completed before final outcomes were recorded — none is assumed.', [AV_HELD]: 'This outcome can\'t be matched to the programme you sponsor, so it isn\'t shown.', [AV_AWAIT]: 'Shown here once the Assessor publishes it.' };
  const row = r => `<li class="li av-row"><div class="li-b"><strong class="small">${esc(r.title)}</strong>${r.result
    ? `<span class="xs muted">Published ${fd(r.pubAt)} by ${esc(r.by)} (Assessor) · ${esc(r.round)}</span>${r.feedback ? `<p class="small av-fb"><span class="strong">Overall feedback:</span> ${esc(r.feedback)}</p>` : ''}`
    : `<span class="xs muted">${why[r.label]}</span>`}</div>${r.result ? chip(r.result, r3Tone(r.result)) : chip(r.label, 'grey')}</li>`;
  return d.progs.map(p => `<section class="card av-out" aria-label="Final assessment outcomes — ${esc(p.prog)}"><div class="row-b"><h3>Final assessment outcomes</h3><span class="typebadge nvq">NVQ</span></div><p class="small av-prog">${esc(p.prog)}</p>
    ${p.rows.length ? `<ul class="list">${p.rows.map(row).join('')}</ul>` : '<p class="small muted">No assignments yet.</p>'}
    <p class="xs muted">Each Pass or Fail is the Assessor's decision for the whole assignment, shown as soon as they publish it. It isn't worked out from individual criteria.</p></section>`).join('');
}

/* ---------- The agency's learner page → Progress ---------- */
const AV_NOTE = ['Submissions, answers, feedback, scores, assessor notes and IQA are never shared.', 'Final assignment outcomes and the Assessor\'s overall feedback are shown once published. Submissions, answers, criterion feedback, scores, assessor notes and IQA are never shared.'];
const _gLearnerAV = SCREENS['g-learner'];
SCREENS['g-learner'] = p => {
  const h = _gLearnerAV(p); if (!p || p.tab !== 'progress' || !p.id || !inRoster(p.id)) return h;
  const card = avCard(p.id); if (!card) return h;
  return h.replace('<p class="small muted">No sponsored enrolments.</p>', '').replace('<p class="xs muted">Agencies see progress %', card + '<p class="xs muted">Agencies see progress %').replace(AV_NOTE[0], AV_NOTE[1]);
};

/* ---------- Records ---------- */
UXC.push(['AV', 'Agency visibility of final assessment outcomes (31 Oct 2026)', [
  'Agencies see the final Pass / Fail of their sponsored learners: Learners → learner → Progress lists each assignment of each NVQ programme the agency sponsors with the outcome, the date it was published, the Assessor and the overall feedback, as soon as the Assessor publishes it. Before that: "Awaiting final assessment".',
  'Only learners on the agency\'s roster, and only outcomes published for the programme the agency sponsors (each published outcome records its programme and batch); one that can\'t be matched is not shown. A draft decision, the rationale, criterion feedback and submissions are never shown, and the agency can\'t declare, edit or publish an outcome. Other agencies and unrelated learners are refused and logged.']]);
