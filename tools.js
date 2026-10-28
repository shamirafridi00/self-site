'use strict';
/* Shelf PDF tools: PDF → images, PDF → Markdown, PDF → EPUB, AI-ready PDF.
   Everything runs locally with pdf.js, JSZip and pdf-lib. */
(() => {
const S = window.Shelf;
if (!S) return;
const { $, $$, esc, icon, toast, libsOk, fmtBytes, titleFromName, debounce } = S;

/* ---------------------------------------------------------------- helpers */
const XMLBAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const clean = s => String(s ?? '').replace(XMLBAD, '');
const x = s => esc(clean(s));
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const pad = (n, w) => String(n).padStart(w, '0');
const plural = (n, w) => `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`;
const safeBase = name => (titleFromName(name) || 'document').replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document';
const cancelErr = () => Object.assign(new Error('Cancelled'), { cancelled: true });
const cleanMetaTitle = t => { t = clean(t).trim(); return !t || /^(untitled|microsoft word|document\d*$|about:|https?:|file:)|\.(docx?|pdf|txt|html?|indd|tex)$/i.test(t) ? '' : t; };
const canFolder = typeof window.showDirectoryPicker === 'function';

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 120000);
}
const toBlob = (canvas, type, q) => new Promise((res, rej) =>
  canvas.toBlob(b => b ? res(b) : rej(new Error('Could not encode the image — the page may be too large for this resolution.')), type, q));

let picker;
function chooseFile(accept, cb) {
  if (!picker) { picker = document.createElement('input'); picker.type = 'file'; picker.hidden = true; document.body.appendChild(picker); }
  picker.accept = accept;
  picker.onchange = () => { const f = picker.files[0]; picker.value = ''; if (f) cb(f); };
  picker.click();
}

/* ---------------------------------------------------------------- page ranges */
function parseRanges(str, N) {
  const s = String(str || '').toLowerCase().replace(/[–—]/g, '-').replace(/\bto\b/g, '-').replace(/\s*-\s*/g, '-').trim();
  if (!s || s === 'all') return range(1, N);
  const set = new Set();
  const num = t => (t === 'last' || t === 'end') ? N : parseInt(t, 10);
  for (const part of s.split(/[\s,;]+/).filter(Boolean)) {
    if (part === 'all') { range(1, N).forEach(n => set.add(n)); continue; }
    if (part === 'odd' || part === 'even') { for (let i = part === 'odd' ? 1 : 2; i <= N; i += 2) set.add(i); continue; }
    const m = part.match(/^(\d+|last|end)?(-)?(\d+|last|end)?$/);
    if (!m || (!m[1] && !m[2])) throw new Error(`“${part}” isn’t a page number or range`);
    let a = m[1] ? num(m[1]) : 1;
    let b = m[2] ? (m[3] ? num(m[3]) : N) : a;
    if (a > b) [a, b] = [b, a];
    if (a < 1 || a > N) throw new Error(`This PDF has ${N} page${N === 1 ? '' : 's'}, so “${part}” is out of range`);
    for (let i = a; i <= Math.min(b, N); i++) set.add(i);
  }
  if (!set.size) throw new Error('No pages selected');
  return [...set].sort((p, q) => p - q);
}
function formatRanges(list, N) {
  if (N && list.length === N) return 'all';
  const out = [];
  for (let i = 0; i < list.length;) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    out.push(j > i ? `${list[i]}-${list[j]}` : `${list[i]}`);
    i = j + 1;
  }
  return out.join(', ');
}
const describePages = (pages, N) => pages.length === N ? `all ${N} pages` : `pages ${formatRanges(pages, N)} of ${N}`;

/* ---------------------------------------------------------------- output sinks (ZIP or folder) */
async function pickFolder() {
  try { return await window.showDirectoryPicker({ id: 'shelf-out', mode: 'readwrite' }); }
  catch (e) { if (e && e.name === 'AbortError') throw cancelErr(); throw e; }
}
function makeSink(kind, zipName, dir) {
  const files = [];
  if (kind === 'folder' && dir) {
    const folderName = zipName.replace(/\.zip$/i, '');
    let sub = null;
    return {
      async add(path, blob) {
        if (!sub) sub = await dir.getDirectoryHandle(folderName, { create: true });
        let d = sub; const parts = path.split('/');
        for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
        const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
        const w = await fh.createWritable(); await w.write(blob); await w.close();
        files.push(path);
      },
      async finish() { return { label: `saved ${plural(files.length, 'file')} to “${dir.name}/${folderName}”`, again: null }; },
    };
  }
  return {
    async add(path, blob) { files.push({ path, blob }); },
    async finish(onP) {
      if (files.length === 1) {
        const f = files[0], nm = f.path.split('/').pop();
        download(f.blob, nm);
        return { label: `downloaded ${nm}`, again: () => download(f.blob, nm) };
      }
      const zip = new JSZip();
      for (const f of files) zip.file(f.path, f.blob, { compression: /\.(md|txt|html?|xhtml|css|json)$/i.test(f.path) ? 'DEFLATE' : 'STORE' });
      const out = await zip.generateAsync({ type: 'blob' }, m => onP && onP(m.percent));
      download(out, zipName);
      return { label: `downloaded ${zipName} (${fmtBytes(out.size)})`, again: () => download(out, zipName) };
    },
  };
}

/* ---------------------------------------------------------------- rendering */
async function renderPage(page, scale, gray) {
  let vp = page.getViewport({ scale });
  const MAX = 36e6;
  if (vp.width * vp.height > MAX) vp = page.getViewport({ scale: scale * Math.sqrt(MAX / (vp.width * vp.height)) });
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(vp.width)); c.height = Math.max(1, Math.floor(vp.height));
  const ctx = c.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  if (gray) {
    const d = ctx.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const v = (a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114) | 0; a[i] = a[i + 1] = a[i + 2] = v; }
    ctx.putImageData(d, 0, 0);
  }
  return c;
}
const freeCanvas = c => { c.width = c.height = 0; };

/* ---------------------------------------------------------------- text structure */
const BULLET = /^([•●○◦▪▫■□►▸‣⁃∙·])\s*(\S.*)$/;
const DASH = /^([-–*])\s+(\S.*)$/;
const ORD = /^(\(?(?:\d{1,3}|[a-hA-H])[.)])\s+(\S.*)$/;

async function textLines(page, hist) {
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = [];
  let prev = null;
  for (const it of tc.items) {
    if (typeof it.str !== 'string') continue;
    const str = clean(it.str).replace(/�/g, '');
    if (!str.trim()) continue;
    const t = pdfjsLib.Util.transform(vp.transform, it.transform);
    const size = Math.hypot(t[2], t[3]) || Math.hypot(t[0], t[1]) || 10;
    const w = (it.width || 0) * vp.scale || str.length * size * 0.5;
    const item = { str, x: t[4], y: t[5], w, size };
    if (prev && prev.str === str && Math.abs(prev.x - item.x) < size * 0.3 && Math.abs(prev.y - item.y) < size * 0.3) continue; // fake-bold duplicates
    items.push(item); prev = item;
    const k = Math.round(size * 2) / 2;
    hist.set(k, (hist.get(k) || 0) + str.length);
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    let L = null;
    for (let k = lines.length - 1; k >= 0 && k >= lines.length - 4; k--) {
      if (Math.abs(lines[k].y - it.y) <= Math.min(lines[k].size, it.size) * 0.5) { L = lines[k]; break; }
    }
    if (!L) { L = { y: it.y, size: it.size, items: [] }; lines.push(L); }
    L.items.push(it);
    if (it.size > L.size) L.size = it.size;
  }
  lines.forEach(finishLine);
  return { lines: lines.filter(L => L.cells.length).sort((a, b) => a.y - b.y), W: vp.width, H: vp.height };
}
function finishLine(L) {
  L.items.sort((a, b) => a.x - b.x);
  const cells = []; let cur = null;
  for (const it of L.items) {
    const gap = cur ? it.x - cur.x1 : 0;
    if (!cur || gap > Math.max(L.size, 6)) { cur = { x0: it.x, x1: it.x + it.w, text: it.str }; cells.push(cur); }
    else {
      const sp = gap > it.size * 0.15 && !/\s$/.test(cur.text) && !/^\s/.test(it.str);
      cur.text += (sp ? ' ' : '') + it.str;
      cur.x1 = Math.max(cur.x1, it.x + it.w);
    }
  }
  cells.forEach(c => { c.text = c.text.replace(/\s+/g, ' ').trim(); });
  L.cells = cells.filter(c => c.text);
  delete L.items;
  if (!L.cells.length) return;
  L.x0 = L.cells[0].x0;
  L.x1 = Math.max(...L.cells.map(c => c.x1));
  L.text = L.cells.map(c => c.text).join('   ');
  L.top = L.y - L.size * 0.8;
}
function markRepeated(pageLines, body) {
  const entries = [...pageLines.values()];
  if (entries.length < 3) return 0;
  const key = L => L.text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
  const cand = r => r.lines.filter(L => (L.top < r.H * 0.09 || L.y > r.H * 0.92) && L.size <= body * 1.12);
  const counts = new Map();
  for (const r of entries) new Set(cand(r).map(key)).forEach(k => counts.set(k, (counts.get(k) || 0) + 1));
  const min = Math.max(3, Math.ceil(entries.length * 0.5));
  let n = 0;
  for (const r of entries) for (const L of cand(r)) if (counts.get(key(L)) >= min) { L.hf = true; n++; }
  return n;
}
function makeTable(run) {
  const multi = run.filter(L => L.cells.length >= 2);
  const iv = multi.flatMap(L => L.cells.map(c => [c.x0, c.x1])).sort((a, b) => a[0] - b[0]);
  const cols = [];
  for (const [a, b] of iv) {
    const last = cols[cols.length - 1];
    if (last && a <= last[1] + 2) last[1] = Math.max(last[1], b); else cols.push([a, b]);
  }
  if (cols.length < 2) return null;
  const all = multi.flatMap(L => L.cells);
  const avg = all.reduce((s, c) => s + c.text.length, 0) / all.length;
  if (cols.length === 2 && avg > 38) {          // two text columns, not a table
    const mid = (cols[0][1] + cols[1][0]) / 2, left = [], right = [];
    for (const L of run) for (const c of L.cells) (c.x0 < mid ? left : right).push({ y: L.y, top: L.top, size: L.size, cells: [c], x0: c.x0, x1: c.x1, text: c.text });
    return { type: 'split', lines: [...left, ...right] };
  }
  const rows = run.map(L => {
    const r = cols.map(() => '');
    for (const c of L.cells) {
      let best = 0, bo = -Infinity;
      cols.forEach(([a, b], k) => { const o = Math.min(b, c.x1) - Math.max(a, c.x0); if (o > bo) { bo = o; best = k; } });
      r[best] = r[best] ? r[best] + ' ' + c.text : c.text;
    }
    return r;
  });
  return { type: 'table', rows, top: run[0].top };
}
function buildBlocks(lines, body, useTables) {
  const items = [];
  const multi = L => L.cells.length >= 2;
  for (let i = 0; i < lines.length;) {
    const L = lines[i];
    if (useTables && multi(L)) {
      const run = [L]; let j = i + 1;
      while (j < lines.length) {
        const M = lines[j], prev = run[run.length - 1];
        if (M.top - prev.y > Math.max(prev.size, M.size) * 1.9) break;
        if (multi(M)) { run.push(M); j++; continue; }
        const N = lines[j + 1];
        if (N && multi(N) && M.size <= body * 1.15 && N.top - M.y < Math.max(M.size, N.size) * 1.9) { run.push(M); j++; continue; }
        break;
      }
      if (run.filter(multi).length >= 2) {
        const t = makeTable(run);
        if (t) { if (t.type === 'split') items.push(...t.lines); else items.push(t); i = j; continue; }
      }
    }
    items.push(L); i++;
  }
  return toTextBlocks(items, body);
}
function joinWrap(a, b) { return /[A-Za-z]-$/.test(a) && /^[a-z]/.test(b) ? a.slice(0, -1) + b : a + ' ' + b; }
function toTextBlocks(items, body) {
  const out = []; let cur = null;
  const right = Math.max(0, ...items.filter(l => !l.type).map(l => l.x1));
  const flush = () => { if (cur) { out.push(cur); cur = null; } };
  for (const it of items) {
    if (it.type) { flush(); out.push(it); continue; }
    const L = it, text = L.text, ratio = L.size / body;
    const gap = cur ? L.y - cur.lastY : Infinity;
    const level = ratio >= 1.18 && text.length <= 180 && /\p{L}/u.test(text) ? (ratio >= 1.75 ? 1 : ratio >= 1.38 ? 2 : 3) : 0;
    if (level) {
      if (cur && cur.type === 'h' && cur.level === level && gap > 0 && gap < L.size * 1.7) { cur.text += ' ' + text; cur.lastY = L.y; continue; }
      flush(); cur = { type: 'h', level, text, top: L.top, lastY: L.y, size: L.size }; continue;
    }
    let m;
    if (L.cells.length === 1 && ((m = text.match(BULLET)) || (m = text.match(DASH)))) {
      flush(); cur = { type: 'li', ordered: false, parts: [m[2]], top: L.top, lastY: L.y, size: L.size, x0: L.x0, minX0: L.x0, lastX1: L.x1 }; continue;
    }
    if (L.cells.length === 1 && (m = text.match(ORD))) {
      flush(); cur = { type: 'li', ordered: true, marker: m[1].replace(/[().]/g, ''), parts: [m[2]], top: L.top, lastY: L.y, size: L.size, x0: L.x0, minX0: L.x0, lastX1: L.x1 }; continue;
    }
    const sameSize = cur && Math.abs(cur.size - L.size) < Math.max(1, body * 0.12);
    if (cur && (cur.type === 'p' || cur.type === 'li') && sameSize && gap > 0 && gap < L.size * 1.75) {
      const indentNew = cur.type === 'p' && L.x0 > cur.minX0 + L.size * 1.5;
      const wentLeft = cur.type === 'li' && L.x0 < cur.x0 - 2;
      if (!indentNew && !wentLeft) {
        const short = cur.lastX1 < right - L.size * 5;
        if (short) cur.parts.push(text); else cur.parts[cur.parts.length - 1] = joinWrap(cur.parts[cur.parts.length - 1], text);
        cur.lastY = L.y; cur.lastX1 = L.x1; cur.minX0 = Math.min(cur.minX0, L.x0);
        continue;
      }
    }
    flush();
    cur = { type: 'p', parts: [text], top: L.top, lastY: L.y, size: L.size, x0: L.x0, minX0: L.x0, lastX1: L.x1 };
  }
  flush();
  return out;
}

/* ---------------------------------------------------------------- embedded images */
function getObj(page, id) {
  return new Promise(res => {
    const store = id.startsWith('g_') ? page.commonObjs : page.objs;
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; res(null); } }, 5000);
    try { store.get(id, v => { if (!done) { done = true; clearTimeout(t); res(v); } }); }
    catch { done = true; clearTimeout(t); res(null); }
  });
}
function imgToCanvas(img) {
  if (!img || !img.width || !img.height || img.width * img.height > 40e6) return null;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  if (img.bitmap) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img.bitmap, 0, 0); return c; }
  if (!img.data) return null;
  const id = ctx.createImageData(img.width, img.height), d = id.data, s = img.data, n = img.width * img.height;
  if (img.kind === 3) d.set(s.subarray(0, n * 4));
  else if (img.kind === 2) for (let i = 0, j = 0; i < n; i++, j += 3) { const k = i * 4; d[k] = s[j]; d[k + 1] = s[j + 1]; d[k + 2] = s[j + 2]; d[k + 3] = 255; }
  else if (img.kind === 1) {
    const rb = (img.width + 7) >> 3;
    for (let y = 0; y < img.height; y++) for (let xx = 0; xx < img.width; xx++) {
      const v = (s[y * rb + (xx >> 3)] >> (7 - (xx & 7))) & 1 ? 255 : 0, k = (y * img.width + xx) * 4;
      d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
  } else return null;
  ctx.putImageData(id, 0, 0);
  return c;
}
async function hashBlob(b) {
  const u = new Uint8Array(await b.arrayBuffer());
  let h = 2166136261;
  const step = u.length > 2e6 ? 7 : 1;
  for (let i = 0; i < u.length; i += step) { h ^= u[i]; h = Math.imul(h, 16777619); }
  return (h >>> 0) + ':' + u.length;
}
async function pageImages(page, n, hasText, store) {
  const OPS = pdfjsLib.OPS, U = pdfjsLib.Util;
  const vp = page.getViewport({ scale: 1 });
  let ol;
  try { ol = await page.getOperatorList(); } catch { return []; }
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [], found = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i], a = ol.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() || ctm;
    else if (fn === OPS.transform) ctm = U.transform(ctm, a);
    else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); if (a && Array.isArray(a[0]) && a[0].length === 6) ctm = U.transform(ctm, a[0]); }
    else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || ctm;
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const m = U.transform(vp.transform, ctm);
      const xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]];
      const ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
      found.push({ ref: a[0], box: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } });
    }
  }
  const out = []; let k = 0;
  for (const f of found) {
    if (f.box.w < 24 || f.box.h < 24) continue;
    if (hasText && f.box.w * f.box.h > vp.width * vp.height * 0.8) continue;   // page background / scan under OCR text
    const img = typeof f.ref === 'string' ? await getObj(page, f.ref) : f.ref;
    if (!img || img.width * img.height < 1024) continue;
    const canvas = imgToCanvas(img);
    if (!canvas) continue;
    const jpg = img.width * img.height > 300000 && img.kind !== 3;
    const blob = await toBlob(canvas, jpg ? 'image/jpeg' : 'image/png', 0.92);
    freeCanvas(canvas);
    const h = await hashBlob(blob);
    let src = store.byHash.get(h);
    if (!src) {
      src = `images/p${pad(n, 3)}-${++k}.${jpg ? 'jpg' : 'png'}`;
      store.byHash.set(h, src); store.files.push({ path: src, blob });
    }
    out.push({ type: 'img', src, top: f.box.y, alt: `Image from page ${n}` });
  }
  return out;
}

/* ---------------------------------------------------------------- analysis: PDF → structured blocks */
async function analyze(c, o) {
  const { pdf, pages } = c;
  const pageLines = new Map(), hist = new Map();
  for (const [i, n] of pages.entries()) {
    c.check(); c.progress(i / pages.length * 0.25, `Reading text · page ${n}`);
    const page = await pdf.getPage(n);
    pageLines.set(n, await textLines(page, hist));
    page.cleanup();
  }
  let body = 10, best = -1;
  hist.forEach((v, k) => { if (v > best) { best = v; body = k; } });
  if (o.stripHF) markRepeated(pageLines, body);
  const store = { files: [], byHash: new Map() };
  const out = [];
  const stats = { tables: 0, images: 0, snapshots: 0, textless: 0 };
  const w = String(pdf.numPages).length < 3 ? 3 : String(pdf.numPages).length;
  for (const [i, n] of pages.entries()) {
    c.check(); c.progress(0.25 + i / pages.length * 0.7, `Building page ${n} · ${i + 1} of ${pages.length}`);
    const page = await pdf.getPage(n);
    const { lines } = pageLines.get(n);
    const kept = lines.filter(L => !L.hf);
    const hasText = lines.length > 0;
    if (!hasText) stats.textless++;
    const blocks = buildBlocks(kept, body, o.tables !== false);
    stats.tables += blocks.filter(b => b.type === 'table').length;
    let imgs = [];
    if (o.images === 'extract' || o.images === 'both') {
      imgs = await pageImages(page, n, hasText, store);
      blocks.push(...imgs);
      stats.images += imgs.length;
    }
    const snap = o.images === 'pages' || o.images === 'both' || (o.images === 'extract' && !hasText && !imgs.length);
    if (snap) {
      const cv = await renderPage(page, 150 / 72);
      const blob = await toBlob(cv, 'image/jpeg', 0.85); freeCanvas(cv);
      const src = `images/page-${pad(n, w)}.jpg`;
      store.files.push({ path: src, blob });
      blocks.unshift({ type: 'img', src, top: -1, alt: `Page ${n}`, snapshot: true });
      stats.snapshots++;
    }
    blocks.forEach((b, k) => { b._k = k; });
    blocks.sort((a, b) => (a.top ?? 0) - (b.top ?? 0) || a._k - b._k);
    out.push({ n, blocks });
    page.cleanup();
  }
  return { pages: out, files: store.files, stats, body };
}

/* ---------------------------------------------------------------- Markdown */
const mdEsc = s => s.replace(/^(\s*)(#{1,6}\s|>|[-+*]\s|\d+[.)]\s)/, '$1\\$2');
const cellEsc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function tableRows(rows) {
  const n = rows[0].length;
  const keep = range(0, n - 1).filter(k => rows.some(r => r[k]));
  return rows.map(r => keep.map(k => r[k] || ''));
}
function mdTable(rows) {
  const R = tableRows(rows).map(r => r.map(cellEsc));
  return [R[0], R[0].map(() => '---'), ...R.slice(1)].map(r => `| ${r.join(' | ')} |`).join('\n');
}
function liMarker(b) { return !b.ordered ? '-' : /^\d+$/.test(b.marker) ? `${b.marker}.` : `- ${b.marker})`; }
function toMarkdown(doc, o) {
  let md = '', prev = null;
  const add = (s, tight) => { md += (md ? (tight ? '\n' : '\n\n') : '') + s; };
  for (const p of doc.pages) {
    if (o.pageMarks) { add(`<!-- Page ${p.n} -->`); prev = null; }
    for (const b of p.blocks) {
      const tight = prev && prev.type === 'li' && b.type === 'li';
      if (b.type === 'h') add(`${'#'.repeat(b.level)} ${b.text}`);
      else if (b.type === 'p') add(b.parts.map(mdEsc).join('  \n'));
      else if (b.type === 'li') add(`${liMarker(b)} ${b.parts.join('  \n  ')}`, tight);
      else if (b.type === 'table') add(mdTable(b.rows));
      else if (b.type === 'img') add(`![${b.alt}](${b.src})`);
      prev = b;
    }
  }
  return md + '\n';
}

/* ---------------------------------------------------------------- EPUB */
function xBlocks(blocks) {
  let h = '', list = null;
  const close = () => { if (list) { h += `</${list}>`; list = null; } };
  for (const b of blocks) {
    if (b.type === 'li') {
      const tag = b.ordered && /^\d+$/.test(b.marker) ? 'ol' : 'ul';
      if (list !== tag) { close(); h += `<${tag}>`; list = tag; }
      h += tag === 'ol' ? `<li value="${b.marker}">` : '<li>';
      h += (b.ordered && tag === 'ul' ? x(b.marker) + ') ' : '') + b.parts.map(x).join('<br/>') + '</li>';
      continue;
    }
    close();
    if (b.type === 'pb') h += `<span epub:type="pagebreak" role="doc-pagebreak" id="page-${b.n}" title="${b.n}"></span>`;
    else if (b.type === 'h') h += `<h${b.level}>${x(b.text)}</h${b.level}>`;
    else if (b.type === 'p') h += `<p>${b.parts.map(x).join('<br/>')}</p>`;
    else if (b.type === 'table') {
      const R = tableRows(b.rows);
      h += '<table><thead><tr>' + R[0].map(c => `<th>${x(c)}</th>`).join('') + '</tr></thead><tbody>' +
        R.slice(1).map(r => '<tr>' + r.map(c => `<td>${x(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
    }
    else if (b.type === 'img') h += `<figure${b.snapshot ? ' class="snap"' : ''}><img src="../${b.src}" alt="${x(b.alt)}"/></figure>`;
  }
  close();
  return h;
}
const xhtml = (title, body, lang) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${x(lang)}" lang="${x(lang)}">
<head><meta charset="utf-8"/><title>${x(title)}</title><link rel="stylesheet" type="text/css" href="../styles.css"/></head>
<body>${body}</body>
</html>`;
const EPUB_CSS = `body{font-family:serif;line-height:1.5;margin:0 4%}
h1,h2,h3{line-height:1.25;page-break-after:avoid;break-after:avoid}
p{margin:0 0 .8em}
figure{margin:1em 0;text-align:center}
img{max-width:100%;height:auto}
figure.snap img,.pg img,.cover img{max-height:98vh}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.85em}
th,td{border:1px solid #bbb;padding:.25em .4em;text-align:left;vertical-align:top}
th{background:#eee}
.pg,.cover{margin:0;padding:0;text-align:center}
.pg{page-break-after:always;break-after:page}`;

async function destPage(pdf, dest) {
  try {
    if (typeof dest === 'string') dest = await pdf.getDestination(dest);
    if (!Array.isArray(dest) || dest[0] == null) return null;
    return typeof dest[0] === 'object' ? (await pdf.getPageIndex(dest[0])) + 1 : Number.isInteger(dest[0]) ? dest[0] + 1 : null;
  } catch { return null; }
}
async function outlineTop(pdf) {
  let ol;
  try { ol = await pdf.getOutline(); } catch { return []; }
  const out = [];
  for (const it of ol || []) { const p = await destPage(pdf, it.dest); if (p) out.push({ title: clean(it.title).trim() || `Page ${p}`, page: p }); }
  return out.sort((a, b) => a.page - b.page);
}
function chapters(doc, outline, title) {
  const chs = [];
  const start = t => { const ch = { title: t, blocks: [] }; chs.push(ch); return ch; };
  const sel = new Set(doc.pages.map(p => p.n));
  const ol = outline.filter(o => sel.has(o.page));
  if (ol.length >= 2) {
    let cur = null, oi = 0;
    for (const p of doc.pages) {
      let t = null;
      while (oi < ol.length && ol[oi].page <= p.n) { t = t || ol[oi].title; oi++; }
      if (t || !cur) cur = start(t || title);
      cur.blocks.push({ type: 'pb', n: p.n }, ...p.blocks);
    }
    return chs;
  }
  const all = doc.pages.flatMap(p => [{ type: 'pb', n: p.n }, ...p.blocks]);
  const count = l => all.filter(b => b.type === 'h' && b.level <= l).length;
  const lvl = count(1) >= 2 ? 1 : count(2) >= 2 ? 2 : 0;
  if (lvl && count(lvl) <= 400) {
    let cur = null;
    for (const b of all) {
      if (b.type === 'h' && b.level <= lvl) {
        if (!cur || cur.blocks.some(q => q.type !== 'pb')) cur = start(b.text.slice(0, 120)); else cur.title = b.text.slice(0, 120);
      } else if (!cur) cur = start(title);
      cur.blocks.push(b);
    }
    return chs;
  }
  for (let i = 0; i < doc.pages.length; i += 10) {
    const grp = doc.pages.slice(i, i + 10);
    const ch = start(grp.length > 1 ? `Pages ${grp[0].n}–${grp[grp.length - 1].n}` : `Page ${grp[0].n}`);
    grp.forEach(p => ch.blocks.push({ type: 'pb', n: p.n }, ...p.blocks));
  }
  return chs;
}

/* ---------------------------------------------------------------- tool runners */
async function runImages(c, dir) {
  const { pdf, pages, opts } = c;
  let type = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[opts.format] || 'image/jpeg';
  let ext = opts.format === 'png' ? 'png' : opts.format === 'webp' ? 'webp' : 'jpg';
  const sink = makeSink(opts.out, `${c.base}-images.zip`, dir);
  const w = String(pdf.numPages).length;
  let total = 0;
  for (const [i, n] of pages.entries()) {
    c.check(); c.progress(i / pages.length, `Page ${n} · ${i + 1} of ${pages.length}`);
    const page = await pdf.getPage(n);
    const cv = await renderPage(page, +opts.dpi / 72, opts.gray);
    let blob = await toBlob(cv, type, +opts.quality / 100);
    if (blob.type !== type) { type = blob.type; ext = type.split('/')[1].replace('jpeg', 'jpg'); }   // e.g. no WebP encoder
    freeCanvas(cv); page.cleanup();
    total += blob.size;
    await sink.add(`${c.base}-page-${pad(n, w)}.${ext}`, blob);
  }
  c.progress(1, 'Finishing…');
  const saved = await sink.finish(p => c.progress(1, `Packing ZIP · ${Math.round(p)}%`));
  return { title: `${plural(pages.length, 'image')} ready`, detail: `${ext.toUpperCase()} at ${opts.dpi} dpi · ${fmtBytes(total)} · ${saved.label}`, again: saved.again };
}

async function runMarkdown(c, dir) {
  const o = c.opts;
  const doc = await analyze(c, { images: o.images, stripHF: o.stripHF, tables: o.tables });
  c.progress(0.97, 'Writing Markdown…');
  const md = `<!-- ${clean(c.name)} · ${describePages(c.pages, c.pdf.numPages)} · converted with Shelf -->\n\n` + toMarkdown(doc, o);
  const mdName = `${c.base}.md`;
  const mdBlob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const sink = makeSink(o.out, `${c.base}-markdown.zip`, dir);
  await sink.add(mdName, mdBlob);
  for (const f of doc.files) await sink.add(f.path, f.blob);
  const saved = await sink.finish(p => c.progress(1, `Packing ZIP · ${Math.round(p)}%`));
  const s = doc.stats, bits = [plural(c.pages.length, 'page')];
  if (s.tables) bits.push(plural(s.tables, 'table'));
  if (s.images) bits.push(plural(new Set(doc.pages.flatMap(p => p.blocks.filter(b => b.type === 'img' && !b.snapshot).map(b => b.src))).size, 'image'));
  if (s.snapshots) bits.push(plural(s.snapshots, 'page snapshot'));
  const warn = s.textless && o.images === 'none' ? ` · ${plural(s.textless, 'page')} had no selectable text (likely scanned)` : '';
  return { title: 'Markdown ready', detail: `${bits.join(' · ')} · ${saved.label}${warn}`, again: saved.again, preview: md, copy: md };
}

async function runEpub(c) {
  const o = c.opts, { pdf, pages } = c;
  const title = (o.title || '').trim() || c.doc.title, author = (o.author || '').trim();
  const lang = (c.doc.lang || 'en').slice(0, 12).replace(/[^A-Za-z0-9-]/g, '') || 'en';
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/styles.css', EPUB_CSS);
  const manifest = [], spine = [], nav = [];
  const addFile = (id, href, type, data, props) => { zip.file('OEBPS/' + href, data); manifest.push({ id, href, type, props }); };
  const mime = p => /\.png$/i.test(p) ? 'image/png' : 'image/jpeg';
  let hasCover = false;
  if (o.cover) {
    c.progress(0.01, 'Making the cover…');
    const page = await pdf.getPage(pages[0]);
    const v = page.getViewport({ scale: 1 });
    const cv = await renderPage(page, Math.min(1400 / v.width, 4));
    addFile('cover-img', 'images/cover.jpg', 'image/jpeg', await toBlob(cv, 'image/jpeg', 0.88), 'cover-image');
    freeCanvas(cv); page.cleanup();
    addFile('cover', 'text/cover.xhtml', 'application/xhtml+xml', xhtml(title, `<div class="cover"><img src="../images/cover.jpg" alt="${x(title)}"/></div>`, lang));
    spine.push('cover'); hasCover = true;
  }
  const outline = await outlineTop(pdf);
  let stats = '';
  if (o.mode === 'pages') {
    const w = String(pdf.numPages).length < 3 ? 3 : String(pdf.numPages).length;
    const sel = new Set(pages), ol = outline.filter(q => sel.has(q.page));
    for (const [i, n] of pages.entries()) {
      c.check(); c.progress(0.03 + i / pages.length * 0.9, `Page ${n} · ${i + 1} of ${pages.length}`);
      const page = await pdf.getPage(n);
      const v = page.getViewport({ scale: 1 });
      const cv = await renderPage(page, Math.min(1500 / v.width, 4));
      const img = `images/page-${pad(n, w)}.jpg`, id = `p${n}`;
      addFile(id + '-img', img, 'image/jpeg', await toBlob(cv, 'image/jpeg', 0.85));
      freeCanvas(cv); page.cleanup();
      addFile(id, `text/page-${pad(n, w)}.xhtml`, 'application/xhtml+xml', xhtml(`Page ${n}`, `<div class="pg"><img src="../${img}" alt="Page ${n}"/></div>`, lang));
      spine.push(id);
      const entry = ol.find(q => q.page === n);
      if (entry) nav.push({ title: entry.title, href: `text/page-${pad(n, w)}.xhtml` });
      else if (!ol.length && (i % 10 === 0)) nav.push({ title: `Page ${n}`, href: `text/page-${pad(n, w)}.xhtml` });
    }
    stats = `${plural(pages.length, 'page image')}`;
  } else {
    const doc = await analyze({ ...c, progress: (f, t) => c.progress(0.03 + f * 0.85, t) }, { images: o.images ? 'extract' : 'none', stripHF: o.stripHF, tables: true });
    for (const f of doc.files) addFile('img-' + manifest.length, f.path, mime(f.path), f.blob);
    const chs = chapters(doc, outline, title);
    c.progress(0.9, 'Writing chapters…');
    chs.forEach((ch, i) => {
      const href = `text/chapter-${pad(i + 1, 3)}.xhtml`, id = `ch${i + 1}`;
      const hasHeading = ch.blocks.some(b => b.type === 'h');
      const body = (hasHeading ? '' : `<h2>${x(ch.title)}</h2>`) + xBlocks(ch.blocks);
      addFile(id, href, 'application/xhtml+xml', xhtml(ch.title, body, lang));
      spine.push(id); nav.push({ title: ch.title, href });
    });
    stats = `${plural(chs.length, 'chapter')} · ${plural(doc.stats.tables, 'table')} · ${plural(doc.files.length, 'image')}`;
  }
  if (!nav.length) nav.push({ title, href: manifest.find(m => m.id === spine[hasCover ? 1 : 0])?.href || 'text/cover.xhtml' });
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head><meta charset="utf-8"/><title>Contents</title></head>
<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${nav.map(n => `<li><a href="${n.href}">${x(n.title)}</a></li>`).join('')}</ol></nav></body></html>`);
  const uuid = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : S.uid());
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uuid}"/></head>
<docTitle><text>${x(title)}</text></docTitle><navMap>${nav.map((n, i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${x(n.title)}</text></navLabel><content src="${n.href}"/></navPoint>`).join('')}</navMap></ncx>`);
  const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${uuid}</dc:identifier><dc:title>${x(title)}</dc:title>${author ? `<dc:creator>${x(author)}</dc:creator>` : ''}<dc:language>${lang}</dc:language>
<meta property="dcterms:modified">${modified}</meta>${hasCover ? '<meta name="cover" content="cover-img"/>' : ''}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="styles.css" media-type="text/css"/>
${manifest.map(m => `<item id="${m.id}" href="${m.href}" media-type="${m.type}"${m.props ? ` properties="${m.props}"` : ''}/>`).join('\n')}
</manifest>
<spine toc="ncx">${spine.map(id => `<itemref idref="${id}"/>`).join('')}</spine>
</package>`);
  c.progress(0.96, 'Packing EPUB…');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const name = `${c.base}.epub`;
  download(blob, name);
  return {
    title: 'EPUB ready', detail: `${stats} · downloaded ${name} (${fmtBytes(blob.size)})`,
    again: () => download(blob, name),
    library: new File([blob], name, { type: 'application/epub+zip' }),
  };
}

async function runAiPdf(c) {
  if (!libsOk(['PDFLib'])) throw new Error('The PDF builder could not load. Check your connection and reload the page.');
  const { pdf, pages, opts } = c;
  const per = +opts.split > 0 ? Math.floor(+opts.split) : pages.length;
  const groups = [];
  for (let i = 0; i < pages.length; i += per) groups.push(pages.slice(i, i + per));
  const outs = []; let done = 0;
  for (const [g, group] of groups.entries()) {
    const doc = await PDFLib.PDFDocument.create();
    doc.setTitle(c.doc.title); if (c.doc.author) doc.setAuthor(c.doc.author);
    doc.setCreator('Shelf'); doc.setProducer('Shelf (pdf-lib)');
    for (const n of group) {
      c.check(); c.progress(done / pages.length * 0.95, `Page ${n} · ${done + 1} of ${pages.length}`);
      const page = await pdf.getPage(n);
      const v = page.getViewport({ scale: 1 });
      const cv = await renderPage(page, +opts.dpi / 72, opts.gray);
      const jpg = await toBlob(cv, 'image/jpeg', +opts.quality / 100);
      freeCanvas(cv); page.cleanup();
      const img = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      doc.addPage([v.width, v.height]).drawImage(img, { x: 0, y: 0, width: v.width, height: v.height });
      done++;
    }
    c.progress(done / pages.length * 0.95, groups.length > 1 ? `Saving part ${g + 1} of ${groups.length}…` : 'Saving PDF…');
    const bytes = await doc.save();
    const nm = groups.length > 1 ? `${c.base} (AI-ready) part ${g + 1} - pages ${formatRanges(group)}.pdf` : `${c.base} (AI-ready).pdf`;
    outs.push({ path: nm, blob: new Blob([bytes], { type: 'application/pdf' }) });
  }
  const sink = makeSink('zip', `${c.base} (AI-ready).zip`);
  for (const f of outs) await sink.add(f.path, f.blob);
  const saved = await sink.finish(p => c.progress(1, `Packing ZIP · ${Math.round(p)}%`));
  const size = outs.reduce((s, f) => s + f.blob.size, 0);
  return { title: groups.length > 1 ? `${groups.length} AI-ready PDFs` : 'AI-ready PDF', detail: `${plural(pages.length, 'page')} · ${fmtBytes(size)} · ${saved.label}`, again: saved.again };
}

/* ---------------------------------------------------------------- tool definitions */
const OUT = { k: 'out', label: 'Save as', type: 'select', options: () => [['zip', 'Download (ZIP if several files)'], ...(canFolder ? [['folder', 'Write into a folder on my computer']] : [])], def: 'zip' };
const TOOLS = {
  images: {
    tab: 'Images', icon: 'image', run: runImages, folder: true,
    go: n => `Convert ${plural(n, 'page')} to images`,
    note: 'Each page becomes one image. 150 dpi is sharp enough for AI tools and screens; use 300 dpi for printing. For hundreds of pages, “Write into a folder” saves them straight to disk.',
    fields: [
      { k: 'format', label: 'Format', type: 'select', options: [['jpeg', 'JPG — small files'], ['png', 'PNG — lossless'], ['webp', 'WebP — smallest']], def: 'jpeg' },
      { k: 'dpi', label: 'Resolution', type: 'select', options: [['96', '96 dpi · screen'], ['150', '150 dpi · AI & sharing'], ['200', '200 dpi · sharp'], ['300', '300 dpi · print']], def: '150' },
      { k: 'quality', label: 'Quality', type: 'range', min: 50, max: 100, step: 5, def: 90, show: o => o.format !== 'png' },
      { k: 'gray', label: 'Black & white (smaller files)', type: 'check', def: false },
      OUT,
    ],
  },
  markdown: {
    tab: 'Markdown', icon: 'markdown', run: runMarkdown, folder: true,
    go: n => `Convert ${plural(n, 'page')} to Markdown`,
    note: 'Text, headings, lists and tables become Markdown, and images go into an <b>images/</b> folder beside it. Best for AI chats: exact numbers, small size. Scanned pages have no text, so they’re kept as page images.',
    fields: [
      { k: 'images', label: 'Images', type: 'select', options: [['extract', 'Keep embedded images'], ['both', 'Embedded images + page snapshots'], ['pages', 'A snapshot of every page'], ['none', 'Text only']], def: 'extract' },
      { k: 'tables', label: 'Detect tables', type: 'check', def: true },
      { k: 'pageMarks', label: 'Mark where each page starts', type: 'check', def: true },
      { k: 'stripHF', label: 'Remove repeated headers & footers', type: 'check', def: true },
      OUT,
    ],
  },
  epub: {
    tab: 'EPUB', icon: 'book', run: runEpub,
    go: n => `Convert ${plural(n, 'page')} to EPUB`,
    note: '<b>Reflowable</b> turns the text into chapters that resize on any e-reader. <b>Page images</b> keeps the exact look of every page, which is best for comics, forms and scanned books.',
    fields: [
      { k: 'mode', label: 'Layout', type: 'select', options: [['reflow', 'Reflowable text'], ['pages', 'Page images (exact look)']], def: 'reflow' },
      { k: 'title', label: 'Title', type: 'text', def: d => d.title, noSave: true },
      { k: 'author', label: 'Author', type: 'text', def: d => d.author, noSave: true },
      { k: 'cover', label: 'Use the first page as the cover', type: 'check', def: true },
      { k: 'images', label: 'Include images', type: 'check', def: true, show: o => o.mode === 'reflow' },
      { k: 'stripHF', label: 'Remove repeated headers & footers', type: 'check', def: true, show: o => o.mode === 'reflow' },
    ],
  },
  aipdf: {
    tab: 'AI-ready PDF', icon: 'sparkle', run: runAiPdf,
    go: n => `Rebuild ${plural(n, 'page')} as a clean PDF`,
    note: 'Rebuilds every page inside a brand-new PDF with no encryption, restrictions or odd encodings, so tools like Gemini and ChatGPT can open it. Pages become images, which AI reads with OCR. For exact figures, also try <b>Markdown</b>.',
    fields: [
      { k: 'dpi', label: 'Resolution', type: 'select', options: [['110', '110 dpi · smallest'], ['150', '150 dpi · recommended'], ['200', '200 dpi · small print'], ['300', '300 dpi · maximum']], def: '150' },
      { k: 'quality', label: 'Quality', type: 'range', min: 50, max: 100, step: 5, def: 80 },
      { k: 'gray', label: 'Black & white (smaller files)', type: 'check', def: false },
      { k: 'split', label: 'Split every N pages (0 = one file)', type: 'number', min: 0, def: 0 },
    ],
  },
};
const TOOL_ORDER = ['images', 'markdown', 'epub', 'aipdf'];
const loadOpts = () => { try { return JSON.parse(localStorage.getItem('shelf-tool-opts') || '{}'); } catch { return {}; } };
const saveOpts = all => { try { localStorage.setItem('shelf-tool-opts', JSON.stringify(all)); } catch { } };

/* ---------------------------------------------------------------- page picker */
class PagePicker {
  constructor(el, pdf, onChange) {
    this.el = el; this.pdf = pdf; this.N = pdf.numPages; this.onChange = onChange;
    this.sel = new Set(range(1, this.N)); this.last = null; this.queue = []; this.busy = 0; this.alive = true;
    el.innerHTML = `
      <div class="pp-head">
        <label class="pp-range"><span>Pages</span><input type="text" value="all" spellcheck="false" autocomplete="off" inputmode="text" aria-label="Pages to convert"></label>
        <div class="pp-quick">${['all', 'none', 'odd', 'even'].map(k => `<button type="button" class="chip" data-pp="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
      </div>
      <p class="pp-help">Type pages or ranges like <code>1-5, 8, 12-</code>, or click pages below. Shift-click picks a run.</p>
      <p class="pp-err" hidden></p>
      <div class="pp-grid"></div>
      <div class="pp-foot"><span class="pp-count"></span></div>`;
    this.input = el.querySelector('input');
    this.grid = el.querySelector('.pp-grid');
    this.err = el.querySelector('.pp-err');
    this.init();
  }
  async init() {
    const v = (await this.pdf.getPage(1)).getViewport({ scale: 1 });
    this.ar = `${v.width} / ${v.height}`; this.w1 = v.width;
    const tick = icon('check', 12);
    let html = '';
    for (let n = 1; n <= this.N; n++) html += `<button type="button" class="pp-page on" data-n="${n}" aria-pressed="true" title="Page ${n}"><span class="pp-thumb" style="aspect-ratio:${this.ar}"></span><span class="pp-n">${n}</span><span class="pp-tick">${tick}</span></button>`;
    this.grid.innerHTML = html;
    this.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { this.io.unobserve(e.target); this.queue.push(e.target); this.pump(); } }), { root: this.grid, rootMargin: '300px 0px' });
    this.grid.querySelectorAll('.pp-page').forEach(b => this.io.observe(b));
    this.grid.addEventListener('click', e => {
      const b = e.target.closest('.pp-page'); if (!b) return;
      const n = +b.dataset.n, on = !this.sel.has(n);
      if (e.shiftKey && this.last) { const [a, z] = [Math.min(this.last, n), Math.max(this.last, n)]; for (let i = a; i <= z; i++) on ? this.sel.add(i) : this.sel.delete(i); }
      else on ? this.sel.add(n) : this.sel.delete(n);
      this.last = n; this.sync(true);
    });
    this.el.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => {
      const k = b.dataset.pp;
      this.sel = new Set(k === 'none' ? [] : parseRanges(k, this.N)); this.sync(true);
    });
    this.input.addEventListener('input', debounce(() => this.fromInput(), 350));
    this.input.addEventListener('change', () => this.fromInput());
    this.sync(false);
  }
  fromInput() {
    try { this.sel = new Set(parseRanges(this.input.value, this.N)); this.err.hidden = true; this.sync(false); }
    catch (e) { this.err.textContent = e.message; this.err.hidden = false; }
  }
  sync(writeInput) {
    if (writeInput) { this.input.value = this.sel.size ? formatRanges(this.pages(), this.N) : ''; this.err.hidden = true; }
    this.grid.querySelectorAll('.pp-page').forEach(b => { const on = this.sel.has(+b.dataset.n); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    this.el.querySelector('.pp-count').textContent = `${this.sel.size.toLocaleString()} of ${plural(this.N, 'page')} selected`;
    this.onChange && this.onChange(this.sel.size);
  }
  pages() { return [...this.sel].sort((a, b) => a - b); }
  async pump() {
    while (this.alive && this.busy < 2 && this.queue.length) {
      const b = this.queue.shift(); this.busy++;
      this.thumb(b).catch(() => { }).finally(() => { this.busy--; this.pump(); });
    }
  }
  async thumb(b) {
    const page = await this.pdf.getPage(+b.dataset.n);
    if (!this.alive) return;
    const v = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 120 * Math.min(2, devicePixelRatio || 1) / v.width });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    if (!this.alive) return;
    const t = b.querySelector('.pp-thumb'); t.style.aspectRatio = `${v.width} / ${v.height}`; t.appendChild(c);
  }
  destroy() { this.alive = false; this.io && this.io.disconnect(); this.queue = []; }
}

/* ---------------------------------------------------------------- tool panel */
class ToolPanel {
  constructor(root, { tool = 'images' } = {}) {
    this.root = root; this.tool = TOOLS[tool] ? tool : 'images';
    this.doc = null; this.picker = null; this.running = null; this.state = {};
    root.classList.add('tp-root');
    this.renderEmpty();
  }
  get T() { return TOOLS[this.tool]; }
  opts() {
    if (!this.state[this.tool]) {
      const saved = loadOpts()[this.tool] || {}, o = {};
      for (const f of this.T.fields) o[f.k] = !f.noSave && f.k in saved ? saved[f.k] : typeof f.def === 'function' ? (this.doc ? f.def(this.doc) : '') : f.def;
      if (o.out === 'folder' && !canFolder) o.out = 'zip';
      this.state[this.tool] = o;
    }
    return this.state[this.tool];
  }
  renderEmpty(msg) {
    this.root.innerHTML = `<div class="tp-drop">
      <span class="tp-drop-ic">${icon('upload', 28)}</span>
      <b>Choose a PDF</b>
      <span class="tp-drop-sub">or drop it anywhere on this page. It never leaves your device.</span>
      <button type="button" class="btn primary" data-tp="choose">${icon('folder')}Choose PDF</button>
      ${msg ? `<p class="tp-err">${esc(msg)}</p>` : ''}</div>`;
    this.root.querySelector('[data-tp=choose]').onclick = () => this.choose();
  }
  choose() { chooseFile('.pdf,application/pdf', f => this.load({ file: f })); }
  async load(src) {
    if (!libsOk(['pdfjsLib', 'JSZip'])) return;
    if (this.running) { toast('Wait for the current conversion to finish, or cancel it first.'); return; }
    this.destroyDoc();
    this.root.innerHTML = `<div class="tp-loading">${icon('pdf', 22)}<span>Opening ${esc(src.file ? src.file.name : src.book.title)}…</span></div>`;
    try {
      let buf, name, title = '', author = '';
      if (src.book) {
        const blob = await S.DB.file(src.book.id);
        if (!blob) throw new Error('The file for this book is missing.');
        buf = await blob.arrayBuffer(); name = src.book.fileName || `${src.book.title}.pdf`;
        title = src.book.title; author = src.book.author || '';
      } else {
        const fmt = await S.detectFormat(src.file);
        if (fmt === 'epub' || fmt === 'mobi') { this.renderEmpty(); S.openExport({ file: src.file }); return; }
        if (fmt !== 'pdf') throw new Error(`“${src.file.name}” isn’t a PDF.`);
        buf = await src.file.arrayBuffer(); name = src.file.name;
      }
      const size = buf.byteLength;
      const pdf = await S.openPdf(new Uint8Array(buf), name);
      let info = {};
      try { info = (await pdf.getMetadata()).info || {}; } catch { }
      this.doc = { pdf, name, size, base: safeBase(name), title: title || cleanMetaTitle(info.Title) || titleFromName(name), author: author || clean(info.Author).trim(), lang: clean(info.Language).trim() };
      this.state = {};
      this.renderMain();
    } catch (e) { console.error(e); this.renderEmpty(e.message || String(e)); }
  }
  renderMain() {
    const d = this.doc;
    this.root.innerHTML = `<div class="tp">
      <div class="tp-tabs" role="tablist" aria-label="Convert to">${TOOL_ORDER.map(k => `<button type="button" role="tab" class="tp-tab" data-tab="${k}">${icon(TOOLS[k].icon)}<span>${TOOLS[k].tab}</span></button>`).join('')}</div>
      <div class="tp-file"><span class="tp-badge">PDF</span><div class="tp-fname"><b title="${esc(d.name)}">${esc(d.name)}</b><span>${plural(d.pdf.numPages, 'page')} · ${fmtBytes(d.size)}</span></div><button type="button" class="btn small" data-tp="choose">Choose another PDF</button></div>
      <div class="tp-body">
        <section class="tp-pages" aria-label="Choose pages"></section>
        <aside class="tp-side">
          <form class="tp-opts" novalidate></form>
          <div class="tp-note"></div>
          <button type="button" class="btn primary tp-go"></button>
          <div class="tp-progress" hidden><div class="tp-ptext">Starting…</div><div class="track"><span></span></div><button type="button" class="btn small ghost" data-tp="cancel">Cancel</button></div>
          <div class="tp-result" hidden></div>
        </aside>
      </div></div>`;
    const q = s => this.root.querySelector(s);
    this.root.querySelectorAll('.tp-tab').forEach(b => b.onclick = () => { if (this.running) return; this.tool = b.dataset.tab; this.renderSide(); });
    q('[data-tp=choose]').onclick = () => this.choose();
    q('[data-tp=cancel]').onclick = () => { if (this.running) this.running.cancelled = true; };
    q('.tp-go').onclick = () => this.go();
    const form = q('.tp-opts');
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('input', e => this.readField(e.target, e.type));
    form.addEventListener('change', e => this.readField(e.target, e.type));
    this.picker = new PagePicker(q('.tp-pages'), d.pdf, () => this.updateGo());
    this.renderSide();
  }
  readField(el, type) {
    const f = this.T.fields.find(z => z.k === el.name); if (!f) return;
    const o = this.opts();
    o[f.k] = f.type === 'check' ? el.checked : f.type === 'range' || f.type === 'number' ? Math.max(f.min ?? -Infinity, +el.value || 0) : el.value;
    if (f.type === 'range') el.parentNode.querySelector('output').textContent = o[f.k] + '%';
    if (!f.noSave) { const all = loadOpts(); all[this.tool] = Object.fromEntries(this.T.fields.filter(z => !z.noSave).map(z => [z.k, o[z.k]])); saveOpts(all); }
    if (type === 'change' && this.T.fields.some(z => z.show)) this.renderOpts();
    this.root.querySelector('.tp-result').hidden = true;
  }
  renderOpts() {
    const o = this.opts();
    this.root.querySelector('.tp-opts').innerHTML = this.T.fields.filter(f => !f.show || f.show(o)).map(f => {
      const v = o[f.k];
      if (f.type === 'select') { const opts = typeof f.options === 'function' ? f.options() : f.options; return `<label class="field">${f.label}<select name="${f.k}">${opts.map(([val, lab]) => `<option value="${val}"${String(v) === val ? ' selected' : ''}>${lab}</option>`).join('')}</select></label>`; }
      if (f.type === 'check') return `<label class="check"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}> ${f.label}</label>`;
      if (f.type === 'range') return `<div class="field">${f.label}<div class="range-row"><input type="range" name="${f.k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}" aria-label="${f.label}"><output>${v}%</output></div></div>`;
      if (f.type === 'number') return `<label class="field">${f.label}<input type="number" name="${f.k}" min="${f.min ?? 0}" step="1" value="${v}"></label>`;
      return `<label class="field">${f.label}<input type="text" name="${f.k}" value="${esc(v)}"></label>`;
    }).join('');
  }
  renderSide() {
    this.root.querySelectorAll('.tp-tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === this.tool));
    this.renderOpts();
    this.root.querySelector('.tp-note').innerHTML = this.T.note;
    this.root.querySelector('.tp-result').hidden = true;
    this.updateGo();
  }
  updateGo() {
    const go = this.root.querySelector('.tp-go'); if (!go || !this.picker) return;
    const n = this.picker.sel.size;
    go.disabled = !n || !!this.running;
    go.innerHTML = `${icon(this.T.icon)}${n ? this.T.go(n) : 'Select at least one page'}`;
  }
  setBusy(on) {
    this.root.classList.toggle('busy', on);
    this.root.querySelector('.tp-go').hidden = on;
    this.root.querySelector('.tp-progress').hidden = !on;
    if (on) { this.root.querySelector('.tp-result').hidden = true; this.progress(0, 'Starting…'); }
    this.updateGo();
  }
  progress(f, t) {
    const p = this.root.querySelector('.tp-progress'); if (!p) return;
    p.querySelector('.track span').style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%';
    if (t) p.querySelector('.tp-ptext').textContent = t;
  }
  async go() {
    if (this.running || !this.doc) return;
    const pages = this.picker.pages(); if (!pages.length) return;
    const T = this.T, o = { ...this.opts() };
    let dir = null;
    if (T.folder && o.out === 'folder') {
      try { dir = await pickFolder(); } catch (e) { if (!e.cancelled) toast(e.message || String(e), 'err'); return; }
    }
    const run = this.running = { cancelled: false };
    this.setBusy(true);
    const started = Date.now();
    const ctx = {
      pdf: this.doc.pdf, pages, opts: o, name: this.doc.name, base: this.doc.base, doc: this.doc,
      check: () => { if (run.cancelled) throw cancelErr(); },
      progress: (f, t) => this.progress(f, t),
    };
    try {
      const res = await T.run(ctx, dir);
      if (this.running === run) this.showResult(res, Date.now() - started);
    } catch (e) {
      if (e && e.cancelled) toast('Conversion cancelled');
      else { console.error(e); toast('Conversion failed: ' + (e.message || e), 'err', 8000); }
    } finally {
      if (this.running === run) { this.running = null; if (this.root.querySelector('.tp-go')) this.setBusy(false); }
    }
  }
  showResult(res, ms) {
    const box = this.root.querySelector('.tp-result');
    const secs = ms > 1500 ? ` · ${Math.round(ms / 1000)}s` : '';
    box.innerHTML = `<div class="tp-ok"><span class="tp-ok-ic">${icon('check', 16)}</span><div><b>${esc(res.title)}</b><span>${esc(res.detail)}${secs}</span></div></div>
      <div class="tp-actions">
        ${res.again ? `<button type="button" class="btn small" data-r="again">${icon('download', 16)}Download again</button>` : ''}
        ${res.copy ? `<button type="button" class="btn small" data-r="copy">${icon('copy', 16)}Copy Markdown</button>` : ''}
        ${res.library ? `<button type="button" class="btn small" data-r="lib">${icon('library', 16)}Add to my library</button>` : ''}
      </div>
      ${res.preview ? `<textarea class="tp-preview" readonly spellcheck="false" aria-label="Markdown preview">${esc(res.preview.length > 300000 ? res.preview.slice(0, 300000) + '\n\n… (preview truncated — the downloaded file has everything)' : res.preview)}</textarea>` : ''}`;
    box.hidden = false;
    const on = (k, fn) => { const b = box.querySelector(`[data-r=${k}]`); if (b) b.onclick = () => fn(b); };
    on('again', () => res.again());
    on('copy', async b => {
      try { await navigator.clipboard.writeText(res.copy); b.innerHTML = `${icon('check', 16)}Copied`; }
      catch { const t = box.querySelector('.tp-preview'); t.focus(); t.select(); toast('Press Ctrl+C (⌘C) to copy'); }
    });
    on('lib', async b => {
      b.disabled = true;
      await S.importFiles([res.library]);
      b.innerHTML = `${icon('check', 16)}Added`;
      if (!S.IS_LIB) b.insertAdjacentHTML('afterend', `<a class="btn small ghost" href="library.html">Open library</a>`);
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  destroyDoc() {
    if (this.picker) { this.picker.destroy(); this.picker = null; }
    if (this.doc) { try { this.doc.pdf.destroy(); } catch { } this.doc = null; }
  }
  destroy() { if (this.running) this.running.cancelled = true; this.destroyDoc(); }
}

/* ---------------------------------------------------------------- dialog (library) and page mounting */
let dlg = null, dlgPanel = null;
function openDialog(tool, src = {}) {
  if (!dlg) {
    document.body.insertAdjacentHTML('beforeend', `<dialog class="dlg wide tool-dlg" id="toolDlg"><div class="dlg-head"><h2>Convert PDF</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div><div class="tool-dlg-body"></div></dialog>`);
    dlg = $('#toolDlg');
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.addEventListener('close', () => { if (dlgPanel) { dlgPanel.destroy(); dlgPanel = null; } });
  }
  if (dlgPanel) dlgPanel.destroy();
  dlg.querySelector('h2').textContent = src.book ? `Convert “${src.book.title}”` : 'Convert a PDF';
  dlgPanel = new ToolPanel(dlg.querySelector('.tool-dlg-body'), { tool });
  if (!dlg.open) dlg.showModal();
  if (src.book || src.file) dlgPanel.load(src);
}

function mount() {
  const el = document.getElementById('tool-app');
  if (!el) return;
  const tool = el.dataset.tool;
  if (tool === 'epub2pdf') {
    const pick = f => S.openExport({ file: f });
    el.classList.add('tp-root');
    el.innerHTML = `<div class="tp-drop">
      <span class="tp-drop-ic">${icon('upload', 28)}</span>
      <b>Choose an EPUB or MOBI book</b>
      <span class="tp-drop-sub">or drop it anywhere on this page. It never leaves your device.</span>
      <button type="button" class="btn primary" data-tp="choose">${icon('folder')}Choose book</button></div>`;
    const choose = () => chooseFile('.epub,.mobi,.azw,.prc,application/epub+zip', pick);
    el.querySelector('[data-tp=choose]').onclick = choose;
    $$('[data-choose]').forEach(b => b.onclick = choose);
    S.setDropHandler(files => { const f = files.find(q => /\.(epub|mobi|azw|prc)$/i.test(q.name)) || files[0]; if (f) pick(f); }, 'Drop your EPUB or MOBI here');
    return;
  }
  const panel = new ToolPanel(el, { tool });
  $$('[data-choose]').forEach(b => b.onclick = () => panel.choose());
  S.setDropHandler(files => {
    const f = files.find(q => /\.pdf$/i.test(q.name)) || files[0];
    if (f) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); panel.load({ file: f }); }
  }, 'Drop your PDF here');
}

window.ShelfTools = { openDialog, ToolPanel, parseRanges, formatRanges };
mount();
})();
