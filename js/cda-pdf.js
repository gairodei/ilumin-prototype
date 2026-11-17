/* ============================================================
   CDA-C1 — Unicode PDF writer for assessment records (17 Nov 2026; PD-CDA-C01). Loads after cda-export.js (uses cda-fonts.js).
   Replaces the first CDA writer, which used the 14 standard fonts (WinAnsi) and showed any other character as "?".
   - Text is set in DejaVu Sans / DejaVu Sans Bold, embedded as Type 0 / CIDFontType2 fonts (Identity-H) with a ToUnicode map, so the
     text extracts as written. Each PDF embeds a subset: only the glyphs it uses (glyph ids kept; unused outlines left empty).
   - Arabic is shaped (isolated / initial / medial / final forms and lam-alef ligatures, from the presentation forms in the font) and
     laid out right to left; Hebrew right to left. A right-to-left run carries its logical text as /ActualText for extraction.
   - A character neither font has (e.g. Chinese, Japanese, emoji) is never replaced: it is drawn from the browser's own fonts as an
     image at 4× resolution, with an invisible text layer (a Type 3 font with a ToUnicode map) so it still extracts and searches.
   - Italic is the regular face slanted. Colours, layout, page numbers and the document model are unchanged.
   ============================================================ */
'use strict';

/* ---------- TrueType: parse, look up, subset ---------- */
const cdaB64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
function cdaTtf(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), T = {}, n = dv.getUint16(4);
  for (let i = 0; i < n; i++) { const o = 12 + 16 * i; T[String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3])] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) }; }
  const h = T.head.off, upm = dv.getUint16(h + 18), locFmt = dv.getInt16(h + 50), bbox = [dv.getInt16(h + 36), dv.getInt16(h + 38), dv.getInt16(h + 40), dv.getInt16(h + 42)];
  const hh = T.hhea.off, asc = dv.getInt16(hh + 4), desc = dv.getInt16(hh + 6), nHM = dv.getUint16(hh + 34), numG = dv.getUint16(T.maxp.off + 4);
  const adv = new Uint16Array(numG); for (let g = 0; g < numG; g++) adv[g] = dv.getUint16(T.hmtx.off + 4 * Math.min(g, nHM - 1));
  const loca = new Uint32Array(numG + 1); for (let i = 0; i <= numG; i++) loca[i] = locFmt ? dv.getUint32(T.loca.off + 4 * i) : dv.getUint16(T.loca.off + 2 * i) * 2;
  const cmap = new Map(), c0 = T.cmap.off, nt = dv.getUint16(c0 + 2); let s4 = null, s12 = null;
  for (let i = 0; i < nt; i++) { const p = dv.getUint16(c0 + 4 + 8 * i), e = dv.getUint16(c0 + 6 + 8 * i), s = c0 + dv.getUint32(c0 + 8 + 8 * i), f = dv.getUint16(s); if (f === 12 && (p === 3 || p === 0)) s12 = s; if (f === 4 && (p === 3 || p === 0) && (e === 1 || p === 0)) s4 = s; }
  if (s12 != null) { const ng = dv.getUint32(s12 + 12); for (let i = 0; i < ng; i++) { const o = s12 + 16 + 12 * i, a = dv.getUint32(o), b = dv.getUint32(o + 4), g = dv.getUint32(o + 8); for (let c = a; c <= b; c++) cmap.set(c, g + c - a); } }
  else if (s4 != null) {
    const sx2 = dv.getUint16(s4 + 6), E = s4 + 14, St = E + sx2 + 2, De = St + sx2, Ro = De + sx2;
    for (let k = 0; k < sx2 / 2; k++) { const e = dv.getUint16(E + 2 * k), st = dv.getUint16(St + 2 * k), d = dv.getUint16(De + 2 * k), ro = dv.getUint16(Ro + 2 * k);
      for (let c = st; c <= e && c !== 0xFFFF; c++) { let g = 0; if (!ro) g = (c + d) & 0xFFFF; else { g = dv.getUint16(Ro + 2 * k + ro + 2 * (c - st)); if (g) g = (g + d) & 0xFFFF; } if (g) cmap.set(c, g); } }
  }
  return { u8, dv, T, upm, bbox, asc, desc, numG, adv, loca, cmap };
}
let CDA_FONTS = null;
const cdaFonts = () => (CDA_FONTS = CDA_FONTS || { regular: cdaTtf(cdaB64(CDA_FONT_B64.regular)), bold: cdaTtf(cdaB64(CDA_FONT_B64.bold)) });
// A font file with only the glyphs used (and their components); glyph ids are kept, so CIDToGIDMap stays Identity
function cdaSubset(F, used) {
  const need = new Set([0, ...used]), stack = [...need], dv = F.dv, G = F.T.glyf.off;
  while (stack.length) {
    const g = stack.pop(), o = G + F.loca[g]; if (F.loca[g + 1] - F.loca[g] < 10 || dv.getInt16(o) >= 0) continue;
    for (let p = o + 10; ;) { const fl = dv.getUint16(p), cg = dv.getUint16(p + 2); if (!need.has(cg)) { need.add(cg); stack.push(cg); } p += 4 + (fl & 1 ? 4 : 2) + (fl & 8 ? 2 : fl & 0x40 ? 4 : fl & 0x80 ? 8 : 0); if (!(fl & 0x20)) break; }
  }
  const parts = [], loca = new Uint8Array(4 * (F.numG + 1)), lv = new DataView(loca.buffer); let off = 0;
  for (let g = 0; g < F.numG; g++) { lv.setUint32(4 * g, off); if (need.has(g)) { const len = F.loca[g + 1] - F.loca[g]; if (len) { parts.push(F.u8.subarray(G + F.loca[g], G + F.loca[g + 1])); off += len; if (len % 4) { parts.push(new Uint8Array(4 - len % 4)); off += 4 - len % 4; } } } }
  lv.setUint32(4 * F.numG, off);
  const glyf = cdaCatU(parts), tab = t => F.u8.slice(F.T[t].off, F.T[t].off + F.T[t].len), head = tab('head'); new DataView(head.buffer).setUint32(8, 0); new DataView(head.buffer).setInt16(50, 1);
  const tables = [['glyf', glyf], ['head', head], ['hhea', tab('hhea')], ['hmtx', tab('hmtx')], ['loca', loca], ['maxp', tab('maxp')]];
  const sum = u => { let s = 0; const p = new Uint8Array(Math.ceil(u.length / 4) * 4); p.set(u); const d = new DataView(p.buffer); for (let i = 0; i < p.length; i += 4) s = (s + d.getUint32(i)) >>> 0; return s; };
  const nT = tables.length, es = Math.floor(Math.log2(nT)), hdr = new Uint8Array(12 + 16 * nT), hv = new DataView(hdr.buffer);
  hv.setUint32(0, 0x00010000); hv.setUint16(4, nT); hv.setUint16(6, 16 * 2 ** es); hv.setUint16(8, es); hv.setUint16(10, 16 * nT - 16 * 2 ** es);
  let pos = hdr.length; const body = [];
  tables.forEach(([t, u], i) => { const o = 12 + 16 * i; for (let k = 0; k < 4; k++) hdr[o + k] = t.charCodeAt(k); hv.setUint32(o + 4, sum(u)); hv.setUint32(o + 8, pos); hv.setUint32(o + 12, u.length); const pad = new Uint8Array((4 - u.length % 4) % 4); body.push(u, pad); pos += u.length + pad.length; });
  const out = cdaCatU([hdr, ...body]), hpos = new DataView(hdr.buffer).getUint32(12 + 16 * 1 + 8);
  new DataView(out.buffer).setUint32(hpos + 8, (0xB1B0AFBA - sum(out)) >>> 0);
  return out;
}
const cdaCatU = arr => { const n = arr.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let k = 0; arr.forEach(x => { o.set(x, k); k += x.length; }); return o; };

/* ---------- Arabic shaping (presentation forms) and direction ---------- */
// letter → [joining type, first presentation form]: R = isolated, final; D = isolated, final, initial, medial
const CDA_AR = { 0x0621: ['U', 0xFE80], 0x0622: ['R', 0xFE81], 0x0623: ['R', 0xFE83], 0x0624: ['R', 0xFE85], 0x0625: ['R', 0xFE87], 0x0626: ['D', 0xFE89], 0x0627: ['R', 0xFE8D], 0x0628: ['D', 0xFE8F], 0x0629: ['R', 0xFE93],
  0x062A: ['D', 0xFE95], 0x062B: ['D', 0xFE99], 0x062C: ['D', 0xFE9D], 0x062D: ['D', 0xFEA1], 0x062E: ['D', 0xFEA5], 0x062F: ['R', 0xFEA9], 0x0630: ['R', 0xFEAB], 0x0631: ['R', 0xFEAD], 0x0632: ['R', 0xFEAF],
  0x0633: ['D', 0xFEB1], 0x0634: ['D', 0xFEB5], 0x0635: ['D', 0xFEB9], 0x0636: ['D', 0xFEBD], 0x0637: ['D', 0xFEC1], 0x0638: ['D', 0xFEC5], 0x0639: ['D', 0xFEC9], 0x063A: ['D', 0xFECD], 0x0640: ['C', 0],
  0x0641: ['D', 0xFED1], 0x0642: ['D', 0xFED5], 0x0643: ['D', 0xFED9], 0x0644: ['D', 0xFEDD], 0x0645: ['D', 0xFEE1], 0x0646: ['D', 0xFEE5], 0x0647: ['D', 0xFEE9], 0x0648: ['R', 0xFEED], 0x0649: ['R', 0xFEEF], 0x064A: ['D', 0xFEF1],
  0x0671: ['R', 0xFB50], 0x067E: ['D', 0xFB56], 0x0686: ['D', 0xFB7A], 0x0698: ['R', 0xFB8A], 0x06A9: ['D', 0xFB8E], 0x06AF: ['D', 0xFB92], 0x06CC: ['D', 0xFBFC], 0x200D: ['C', 0] };
const CDA_LAMALEF = { 0x0622: 0xFEF5, 0x0623: 0xFEF7, 0x0625: 0xFEF9, 0x0627: 0xFEFB };
const cdaMark = c => (c >= 0x0300 && c <= 0x036F) || (c >= 0x0591 && c <= 0x05C7 && c !== 0x05BE && c !== 0x05C0 && c !== 0x05C3 && c !== 0x05C6) || (c >= 0x0610 && c <= 0x061A) || (c >= 0x064B && c <= 0x065F) || c === 0x0670 || (c >= 0x06D6 && c <= 0x06ED && c !== 0x06DD && c !== 0x06DE && c !== 0x06E5 && c !== 0x06E6 && c !== 0x06E9);
const cdaRtl = c => (c >= 0x0590 && c <= 0x08FF && !(c >= 0x0660 && c <= 0x0669) && !(c >= 0x06F0 && c <= 0x06F9)) || (c >= 0xFB1D && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF);
const cdaStrongL = c => /\p{L}/u.test(String.fromCodePoint(c)) && !cdaRtl(c);
// logical code points → units { out: code point to draw, src: the logical text it stands for }
function cdaShape(cps) {
  const jt = c => (CDA_AR[c] ? CDA_AR[c][0] : cdaMark(c) ? 'T' : 'U'), out = [];
  const near = (i, d) => { for (let k = i + d; k >= 0 && k < cps.length; k += d) if (jt(cps[k]) !== 'T') return k; return -1; };
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i], t = jt(c), A = CDA_AR[c];
    if (!A || t === 'C' || t === 'U' && !A[1]) { out.push({ out: c, src: String.fromCodePoint(c) }); continue; }
    const p = near(i, -1), joinPrev = p >= 0 && ['D', 'C'].includes(jt(cps[p]));
    if (c === 0x0644) { const n = near(i, 1); if (n === i + 1 && CDA_LAMALEF[cps[n]]) { out.push({ out: CDA_LAMALEF[cps[n]] + (joinPrev ? 1 : 0), src: String.fromCodePoint(c, cps[n]) }); i = n; continue; } }
    const n = near(i, 1), joinNext = t === 'D' && n >= 0 && ['D', 'R', 'C'].includes(jt(cps[n]));
    const f = t === 'U' ? A[1] : t === 'R' ? A[1] + (joinPrev ? 1 : 0) : A[1] + (joinPrev && joinNext ? 3 : joinPrev ? 1 : joinNext ? 2 : 0);
    out.push({ out: f, src: String.fromCodePoint(c) });
  }
  return out;
}

/* ---------- Text measured and drawn: tokens of glyph and image segments ---------- */
const CDA_PX = 4; // image resolution for characters outside the fonts
let CDA_CV = null;
const cdaCv = () => (CDA_CV = CDA_CV || document.createElement('canvas'));
const cdaCssFont = (px, b, i) => `${i ? 'italic ' : ''}${b ? 'bold ' : ''}${px}px "Segoe UI", "Microsoft YaHei", "Noto Sans", "Noto Sans CJK SC", sans-serif`;
function cdaToken(text, st, size, D) {
  const F = cdaFonts()[st.b ? 'bold' : 'regular'], cps = [...String(text)].map(c => c.codePointAt(0)), units = cdaShape(cps), cl = [];
  units.forEach(u => { const c0 = u.src.codePointAt(0); if (cl.length && cdaMark(c0)) cl[cl.length - 1].units.push(u); else cl.push({ units: [u] }); });
  cl.forEach(c => { c.src = c.units.map(u => u.src).join(''); c.gids = c.units.map(u => F.cmap.get(u.out) || F.cmap.get(u.src.codePointAt(0)) || 0); c.raster = c.gids.some(g => !g) && !/^\s+$/.test(c.src);
    c.rtl = [...c.src].some(ch => cdaRtl(ch.codePointAt(0))); c.ltr = [...c.src].some(ch => cdaStrongL(ch.codePointAt(0)) || /\d/.test(ch)); });
  const rtl = cl.some(c => c.rtl);
  let order = cl;
  if (rtl) { order = cl.slice().reverse(); for (let i = 0; i < order.length;) { if (order[i].rtl) { i++; continue; } let j = i; while (j < order.length && !order[j].rtl) j++; order.splice(i, j - i, ...order.slice(i, j).reverse()); i = j; } }
  const segs = [];
  order.forEach(c => { const last = segs[segs.length - 1];
    if (c.raster) { if (last && last.img) last.text += c.src; else segs.push({ img: true, text: c.src }); }
    else { c.gids.forEach((g, k) => D.use(st.b, g, c.units[k] ? c.units[k].src : c.src)); if (last && !last.img) { last.gids.push(...c.gids); last.text += c.src; } else segs.push({ gids: c.gids.slice(), text: c.src }); } });
  segs.forEach(s => { s.w = s.img ? cdaImgW(s.text, size, st) : s.gids.reduce((a, g) => a + F.adv[g], 0) * size / F.upm; });
  // each cluster's own width and logical place (a right-to-left run is written in logical order at visual positions)
  cl.forEach((c, i) => { c.i = i; c.w = c.raster ? cdaImgW(c.src, size, st) : c.gids.reduce((a, g) => a + F.adv[g], 0) * size / F.upm; });
  return { text, st, rtl, segs, order, w: segs.reduce((a, s) => a + s.w, 0), space: /^ +$/.test(text) };
}
const cdaImgW = (t, size, st) => { const x = cdaCv().getContext('2d'); x.font = cdaCssFont(size, st.b, st.i); return x.measureText(t).width; };
// an image of the text in its colour (RGB) with its coverage as a soft mask
function cdaImg(t, size, st) {
  const S = CDA_PX, cv = cdaCv(), x = cv.getContext('2d'); x.font = cdaCssFont(size * S, st.b, st.i);
  const w = Math.max(1, Math.ceil(x.measureText(t).width)), h = Math.ceil(size * 1.3 * S); cv.width = w; cv.height = h;
  x.clearRect(0, 0, w, h); x.font = cdaCssFont(size * S, st.b, st.i); x.fillStyle = '#' + (st.color || '111111'); x.textBaseline = 'alphabetic'; x.fillText(t, 0, Math.round(size * S));
  // the browser's own pixels: text in its colour, a colour emoji in its colours; coverage as the soft mask
  const px = x.getImageData(0, 0, w, h).data, rgb = new Uint8Array(w * h * 3), a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { rgb[3 * i] = px[4 * i]; rgb[3 * i + 1] = px[4 * i + 1]; rgb[3 * i + 2] = px[4 * i + 2]; a[i] = px[4 * i + 3]; }
  return { w, h, rgb, a };
}

/* ---------- The document ---------- */
const cdaHex4 = n => n.toString(16).toUpperCase().padStart(4, '0');
const cdaU16 = s => [...String(s)].map(ch => { const c = ch.codePointAt(0); if (c < 0x10000) return cdaHex4(c); const v = c - 0x10000; return cdaHex4(0xD800 + (v >> 10)) + cdaHex4(0xDC00 + (v & 0x3FF)); }).join('');
function cdaPdf(doc) {
  const W_ = 595.28, H_ = 841.89, L = 50, Rm = 50, T = 56, Bm = 64, CW = W_ - L - Rm;
  const SZ = { title: 18, h1: 14, h2: 12, h3: 10.5, p: 10, kv: 9.5 }, pages = []; let ops = [], y = H_ - T;
  // what the document uses: glyphs per face (with the text each stands for), images, invisible-text codes
  const D = { g: { 0: new Map(), 1: new Map() }, imgs: [], t3: [], use(b, g, src) { const m = this.g[b ? 1 : 0]; if (g && !m.has(g)) m.set(g, src); } };
  const t3code = ch => { for (const f of D.t3) { const k = f.chars.indexOf(ch); if (k >= 0) return [f, k + 1]; } let f = D.t3[D.t3.length - 1]; if (!f || f.chars.length >= 250) { f = { n: D.t3.length + 1, chars: [] }; D.t3.push(f); } f.chars.push(ch); return [f, f.chars.length]; };
  const newPage = () => { pages.push(ops); ops = []; y = H_ - T; };
  const room = h => { if (y - h < Bm) newPage(); };
  const tm = (x, y0, i) => `${i ? '1 0 0.2126 1' : '1 0 0 1'} ${x.toFixed(2)} ${y0.toFixed(2)} Tm`;
  const drawSeg = (s, st, x, size) => {
    if (!s.img) { ops.push(`BT /${st.b ? 'F2' : 'F1'} ${size} Tf ${cdaHex(st.color)} rg ${tm(x, y, st.i)} <${s.gids.map(cdaHex4).join('')}> Tj ET`); return; }
    const im = cdaImg(s.text, size, st), id = 'Im' + (D.imgs.length + 1); D.imgs.push({ id, ...im });
    const w = s.w, h = size * 1.3; ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(y - size * 0.3).toFixed(2)} cm /${id} Do Q`);
    // the same characters as invisible text, for search and extraction
    // one string per Type 3 font, scaled (Tz) so the characters span the image without gaps; q … Q keeps the invisible
    // rendering mode (graphics state) from reaching the text after it
    const chars = [...s.text], codes = chars.map(t3code), per = w / chars.length, tz = (per * 100000 / (500 * size)).toFixed(2);
    for (let i = 0, cx = x; i < codes.length;) { const f = codes[i][0]; let j = i; while (j < codes.length && codes[j][0] === f) j++;
      ops.push(`q BT 3 Tr /T${f.n} ${size} Tf ${tz} Tz ${tm(cx, y, false)} <${codes.slice(i, j).map(c => c[1].toString(16).padStart(2, '0').toUpperCase()).join('')}> Tj ET Q`); cx += per * (j - i); i = j; }
  };
  // a line: tokens in logical order → visual order (right-to-left runs reversed), then drawn left to right
  const drawLine = (toks, x0, size, base) => {
    // the run of tokens of one direction starting at i: tokens of that kind, and spaces between two of them
    const runEnd = (arr, i, kind) => { let j = i + 1; while (j < arr.length) { if (kind(arr[j])) { j++; continue; } if (arr[j].space) { let k = j; while (k < arr.length && arr[k].space) k++; if (k < arr.length && kind(arr[k])) { j = k; continue; } } break; } return j; };
    const isR = t => t.rtl, isL = t => !t.rtl && !t.space, vis = toks.slice();
    if (base === 'rtl') { vis.reverse(); for (let i = 0; i < vis.length;) { if (!isL(vis[i])) { i++; continue; } const j = runEnd(vis, i, isL); vis.splice(i, j - i, ...vis.slice(i, j).reverse()); i = j; } }
    else for (let i = 0; i < vis.length;) { if (!isR(vis[i])) { i++; continue; } const j = runEnd(vis, i, isR); vis.splice(i, j - i, ...vis.slice(i, j).reverse()); i = j; }
    // visual positions: each token's x from the visual order (a right-to-left line is aligned right)
    const lw = vis.reduce((a, t) => a + t.w, 0); let x = base === 'rtl' ? x0 + Math.max(0, (CW - (x0 - L)) - lw) : x0;
    vis.forEach(t => { t.x = x; x += t.w; });
    // written in logical (reading) order at those positions, so text extraction reads it as written. Left-to-right glyphs of one style
    // that follow each other are one text operation (pend); a right-to-left word's clusters go in logical order, with the word as
    // /ActualText for readers that use it.
    let pend = null; const flush = () => { if (pend) { drawSeg({ gids: pend.gids }, pend.st, pend.x, size); pend = null; } };
    const same = (a, b) => a.b === b.b && a.i === b.i && a.color === b.color;
    const rtlClusters = t => { let cx = t.x; return t.order.map(c => { const it = { c, x: cx }; cx += c.w; return it; }).sort((a, b) => a.c.i - b.c.i); };
    for (let k = 0; k < toks.length;) {
      const t = toks[k];
      if (!t.rtl) { let cx = t.x; t.segs.forEach(s => { if (s.img) { flush(); drawSeg(s, t.st, cx, size); } else if (pend && same(pend.st, t.st) && Math.abs(pend.end - cx) < 0.01) { pend.gids.push(...s.gids); pend.end = cx + s.w; } else { flush(); pend = { st: t.st, x: cx, end: cx + s.w, gids: s.gids.slice() }; } cx += s.w; }); k++; continue; }
      // a run of right-to-left words (and the spaces between them), in logical order, as one /ActualText span
      flush(); const j = runEnd(toks, k, isR), run = toks.slice(k, j);
      ops.push(`/Span <</ActualText <FEFF${cdaU16(run.map(r => r.text).join(''))}>>> BDC`);
      run.forEach(r => { if (r.rtl) rtlClusters(r).forEach(it => drawSeg(it.c.raster ? { img: true, text: it.c.src, w: it.c.w } : { gids: it.c.gids, w: it.c.w }, r.st, it.x, size)); else { let cx = r.x; r.segs.forEach(s => { drawSeg(s, r.st, cx, size); cx += s.w; }); } });
      ops.push('EMC'); k = j;
    }
    flush();
  };
  const lines = (runs, size, width) => {
    const out = []; let line = [], lw = 0;
    const push = () => { while (line.length && line[line.length - 1].space) { lw -= line[line.length - 1].w; line.pop(); } out.push(line); line = []; lw = 0; };
    runs.forEach(r => String(r.text).split(/(\n)/).forEach(part => {
      if (part === '\n') { push(); return; }
      part.split(/( +)/).filter(Boolean).forEach(tok => {
        const t = cdaToken(tok, { b: r.b, i: r.i, color: r.color }, size, D);
        if (t.space) { if (line.length && lw + t.w <= width) { line.push(t); lw += t.w; } return; }
        if (lw + t.w > width && line.length) push();
        if (t.w > width) { let cur = ''; for (const ch of tok) { const c2 = cdaToken(cur + ch, t.st, size, D); if (c2.w > width && cur) { line.push(cdaToken(cur, t.st, size, D)); push(); cur = ch; } else cur += ch; } if (cur) { const c3 = cdaToken(cur, t.st, size, D); line.push(c3); lw += c3.w; } return; }
        line.push(t); lw += t.w;
      });
    }));
    if (line.length || !out.length) push();
    return out;
  };
  const baseOf = runs => { for (const ch of runs.map(r => r.text).join('')) { const c = ch.codePointAt(0); if (cdaRtl(c)) return 'rtl'; if (cdaStrongL(c)) return 'ltr'; } return 'ltr'; };
  const para = (runs, size, indent = 0, bar = null, gap = 4) => {
    const lh = size * 1.32, ls = lines(runs, size, CW - indent - (bar ? 8 : 0)), base = baseOf(runs);
    ls.forEach(toks => { room(lh); y -= lh; if (bar) ops.push(`${cdaHex(bar)} rg ${(L + indent).toFixed(2)} ${(y - size * 0.3).toFixed(2)} 3 ${lh.toFixed(2)} re f`); drawLine(toks, L + indent + (bar ? 8 : 0), size, base); });
    y -= gap;
  };
  doc.blocks.forEach(b => {
    if (b.t === 'break') { if (ops.length) newPage(); return; }
    if (b.t === 'rule') { room(12); y -= 6; ops.push(`0.75 0.75 0.75 RG 0.6 w ${L} ${y.toFixed(2)} m ${(L + CW).toFixed(2)} ${y.toFixed(2)} l S`); y -= 6; return; }
    if (['title', 'h1', 'h2', 'h3'].includes(b.t)) { const s = SZ[b.t]; room(s * 1.4 + 36); y -= b.t === 'title' ? 0 : s * 0.5; para([R_(b.text, { b: true, color: b.t === 'title' ? '12292E' : '1F3A40' })], s, 0, null, s * 0.35); return; }
    if (b.t === 'kv') { b.rows.forEach(([k, v]) => { const kw = 150, lv = lines([R_(v)], SZ.kv, CW - kw), lk = lines([R_(k, { b: true, color: '444444' })], SZ.kv, kw - 10), lh = SZ.kv * 1.32, bv = baseOf([R_(v)]); for (let n = 0; n < Math.max(lv.length, lk.length); n++) { room(lh); y -= lh; if (lk[n]) drawLine(lk[n], L, SZ.kv, 'ltr'); if (lv[n]) drawLine(lv[n], L + kw, SZ.kv, bv); } y -= 2; }); y -= 4; return; }
    if (b.t === 'p') para(b.runs, SZ.p, b.indent || 0, b.bar || null);
  });
  if (ops.length || !pages.length) pages.push(ops);
  const n = pages.length, footTxt = String(doc.title).slice(0, 90);
  pages.forEach((p, k) => { ops = p; y = 34; drawLine(lines([R_(footTxt, { color: '666666' })], 7.5, CW - 70)[0], L, 7.5, 'ltr'); const pg = lines([R_(`Page ${k + 1} of ${n}`, { color: '666666' })], 7.5, 70)[0]; drawLine(pg, W_ - Rm - 52, 7.5, 'ltr'); });

  /* ---------- objects ---------- */
  const objs = [null]; const add = o => (objs.push(o), objs.length - 1); // o: string dictionary, or { dict, data: Uint8Array }
  const info = add(`<< /Title <FEFF${cdaU16(doc.title)}> /Subject <FEFF${cdaU16(doc.subject || '')}> /Creator <FEFF${cdaU16('ILUMIN Academy prototype')}> /Producer <FEFF${cdaU16('ILUMIN Academy prototype (CDA)')}> /CreationDate (D:${now().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`);
  const cmapStream = pairs => { let s = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n';
    s += pairs.length && pairs[0][0].length === 2 ? '1 begincodespacerange\n<00> <FF>\nendcodespacerange\n' : '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
    for (let i = 0; i < pairs.length; i += 100) { const ch = pairs.slice(i, i + 100); s += `${ch.length} beginbfchar\n${ch.map(([c, u]) => `<${c}> <${u}>`).join('\n')}\nendbfchar\n`; }
    return s + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend'; };
  const fontRes = [];
  [[0, 'F1', 'regular', 'DejaVuSans'], [1, 'F2', 'bold', 'DejaVuSans-Bold']].forEach(([b, rn, face, name]) => {
    const used = D.g[b]; if (!used.size) return; const F = cdaFonts()[face], sc = 1000 / F.upm, gids = [...used.keys()].sort((a, z) => a - z);
    const ff = cdaSubset(F, gids), tag = [...gids.slice(0, 6), gids.length].map(g => String.fromCharCode(65 + g % 26)).join('').slice(0, 6).padEnd(6, 'A');
    const fileId = add({ dict: `<< /Length ${ff.length} /Length1 ${ff.length} >>`, data: ff });
    const fd = add(`<< /Type /FontDescriptor /FontName /${tag}+${name} /Flags 32 /FontBBox [${F.bbox.map(v => Math.round(v * sc)).join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(F.asc * sc)} /Descent ${Math.round(F.desc * sc)} /CapHeight ${Math.round(F.asc * sc * 0.73)} /StemV ${b ? 120 : 80} /FontFile2 ${fileId} 0 R >>`);
    const cid = add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${tag}+${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fd} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${gids.map(g => `${g} [${Math.round(F.adv[g] * sc)}]`).join(' ')}] >>`);
    const tu = cmapStream(gids.map(g => [cdaHex4(g), cdaU16(used.get(g))]));
    const tuId = add({ dict: `<< /Length ${tu.length} >>`, data: cdaAscii(tu) });
    fontRes.push(`/${rn} ${add(`<< /Type /Font /Subtype /Type0 /BaseFont /${tag}+${name} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${tuId} 0 R >>`)} 0 R`);
  });
  if (D.t3.length) {
    const proc = add({ dict: '<< /Length 10 >>', data: cdaAscii('500 0 d0\n') });
    D.t3.forEach(f => {
      const tu = cmapStream(f.chars.map((ch, k) => [(k + 1).toString(16).padStart(2, '0').toUpperCase(), cdaU16(ch)])), tuId = add({ dict: `<< /Length ${tu.length} >>`, data: cdaAscii(tu) });
      fontRes.push(`/T${f.n} ${add(`<< /Type /Font /Subtype /Type3 /FontBBox [0 0 500 1000] /FontMatrix [0.001 0 0 0.001 0 0] /CharProcs << ${f.chars.map((_, k) => `/c${k + 1} ${proc} 0 R`).join(' ')} >> /Encoding << /Type /Encoding /Differences [1 ${f.chars.map((_, k) => `/c${k + 1}`).join(' ')}] >> /FirstChar 1 /LastChar ${f.chars.length} /Widths [${f.chars.map(() => 500).join(' ')}] /ToUnicode ${tuId} 0 R /Resources << >> >>`)} 0 R`);
    });
  }
  const xo = D.imgs.map(im => { const sm = add({ dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${im.a.length} >>`, data: im.a });
    return `/${im.id} ${add({ dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${sm} 0 R /Length ${im.rgb.length} >>`, data: im.rgb })} 0 R`; });
  const res = `<< /Font << ${fontRes.join(' ')} >>${xo.length ? ` /XObject << ${xo.join(' ')} >>` : ''} >>`;
  const pagesId = objs.length + 2 * n, kids = []; // each page adds its content stream and itself; the Pages object follows
  pages.forEach(p => { const s = p.join('\n'), c = add({ dict: `<< /Length ${s.length} >>`, data: cdaAscii(s) }); kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W_} ${H_}] /Resources ${res} /Contents ${c} 0 R >>`)); });
  add(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${n} >>`);
  const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const chunks = [cdaAscii('%PDF-1.7\n'), new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])], off = []; let pos = chunks[0].length + chunks[1].length;
  for (let k = 1; k < objs.length; k++) { const o = objs[k], head = cdaAscii(`${k} 0 obj\n${typeof o === 'string' ? o : o.dict}\n`), parts = typeof o === 'string' ? [head, cdaAscii('endobj\n')] : [head, cdaAscii('stream\n'), o.data, cdaAscii('\nendstream\nendobj\n')]; off[k] = pos; parts.forEach(p => { chunks.push(p); pos += p.length; }); }
  const xref = pos, tail = `xref\n0 ${objs.length}\n0000000000 65535 f \n${off.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  chunks.push(cdaAscii(tail));
  return { bytes: cdaCatU(chunks), pages: n, images: D.imgs.length, lossy: false };
}
const cdaAscii = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xFF; return u; };

UXC.push(['CDA-C', 'Assessment record PDFs keep every character (17 Nov 2026)', [
  'PDFs are set in an embedded Unicode font (DejaVu Sans): Latin, Greek, Cyrillic, Hebrew and Arabic text is kept and extracts as written. Arabic is shaped and set right to left. (Was: standard fonts, other characters shown as "?".)',
  'A character the font doesn\'t have (for example Chinese) is drawn from the browser\'s own fonts, with the same characters as invisible text so it can still be searched and copied. Nothing is replaced.']]);
