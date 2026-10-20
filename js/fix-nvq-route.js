/* ============================================================
   Fix — NVQ Programmes opened on a programme that isn't in the demo data (20 Oct 2026).
   The demo data lives in memory and resets on every page load, but the route is kept in the address (#a-programmes.<id>.<tab>)
   and restored after sign-in. A programme created with the New NVQ programme wizard (NV-N3, NV-N4, …), or a bookmarked or
   shared link, therefore pointed at an id the fresh data doesn't have, and the programme builder answered with the Error 404
   page while the sidebar showed NVQ Programmes as selected. Now the NVQ Programmes list opens instead, with a note saying
   why, and the address is corrected to #a-programmes so a further reload stays on the list.
   Only the 404 is replaced: a role that can't open NVQ Programmes (Finance, Business, IQA) still gets its permission page.
   Wraps the finished screen (every earlier wrapper: Academic list, New NVQ programme button, purposes), so it loads last.
   ============================================================ */
'use strict';

const NVQ_GONE = id => !!id && !(ADMIN.programmes || []).some(p => p.id === id);
const nvqGoneNote = id => `<div class="note b-blue" role="status" data-nvq-gone="${esc(id)}">${ic('info')}<div class="small"><strong>That programme isn't available.</strong> The link was for ${esc(id)}, which isn't in this demo. Programmes created in the demo are kept only until the page is reloaded. Here is the NVQ programme list.</div></div>`;
{
  const _progsFix = SCREENS['a-programmes'];
  SCREENS['a-programmes'] = p => {
    const h = _progsFix(p);
    if (!(p && NVQ_GONE(p.id)) || !/We can't find that page/.test(h)) return h;
    const id = p.id; S.params = {};
    try { history.replaceState(null, '', '#a-programmes'); } catch (e) { /* sandboxed */ }
    const list = _progsFix({}), k = list.indexOf('<section class="dt">');
    return k < 0 ? list + nvqGoneNote(id) : list.slice(0, k) + nvqGoneNote(id) + list.slice(k);
  };
}

UXC.push(['Fix', 'NVQ Programmes opened on a programme that isn\'t in the demo data (20 Oct 2026)', [
  'Reloading the page, or following an old or shared link, on a programme created with New NVQ programme (#a-programmes.NV-N3…) no longer ends on the Error 404 page after sign-in: the demo data resets on every page load, so that programme is gone. The NVQ Programmes list opens instead, with a note naming the programme and saying why, and the address is corrected to #a-programmes.',
  'Unchanged: the programme list, the programme builder and its tabs, the New NVQ programme wizard, fee options, payment plans, Finance approval and deposit configuration. Roles without NVQ Programmes (Finance, Business Admin, IQA) still get their permission page. No new route.',
]]);
