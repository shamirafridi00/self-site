
'use strict';
(() => {
document.body.insertAdjacentHTML('beforeend', "<input type=\"file\" id=\"fileInput\" accept=\".epub,.pdf,.mobi,.azw,.prc,application/epub+zip,application/pdf\" multiple hidden>\n<input type=\"file\" id=\"folderInput\" webkitdirectory multiple hidden>\n<input type=\"file\" id=\"convertInput\" accept=\".epub,.mobi,.azw,.prc,application/epub+zip\" hidden>\n<input type=\"file\" id=\"coverInput\" accept=\"image/*\" hidden>\n\n<!-- reader -->\n<section class=\"reader\" id=\"reader\" hidden data-rt=\"light\" aria-label=\"Reader\">\n  <div class=\"r-top\">\n    <div class=\"r-group\">\n      <button class=\"icon-btn\" id=\"rBack\" title=\"Back to library (Esc)\"><i data-i=\"back\"></i></button>\n      <button class=\"icon-btn\" id=\"rToc\" title=\"Contents & bookmarks\"><i data-i=\"toc\"></i></button>\n      <button class=\"icon-btn\" id=\"rLib\" title=\"All books\"><i data-i=\"library\"></i></button>\n    </div>\n    <div class=\"r-title\"><b id=\"rTitle\"></b><span id=\"rAuthor\"></span></div>\n    <div class=\"r-group only-reflow\">\n      <button class=\"icon-btn\" id=\"rFontDown\" title=\"Smaller text\"><i data-i=\"aMinus\"></i></button>\n      <span class=\"r-val\" id=\"rFontVal\">100%</span>\n      <button class=\"icon-btn\" id=\"rFontUp\" title=\"Larger text\"><i data-i=\"aPlus\"></i></button>\n    </div>\n    <div class=\"r-group only-reflow r-hide-sm\">\n      <select class=\"r-sel\" id=\"rFont\" aria-label=\"Font\">\n        <option value=\"original\">Book font</option><option value=\"serif\">Serif</option><option value=\"sans\">Sans</option>\n      </select>\n    </div>\n    <div class=\"r-group only-epub r-hide-sm\">\n      <button class=\"r-text-btn\" id=\"rFlow\" title=\"Switch between pages and scrolling\">Pages</button>\n    </div>\n    <div class=\"r-group only-pdf\">\n      <button class=\"icon-btn\" id=\"rZoomOut\" title=\"Zoom out\"><i data-i=\"minus\"></i></button>\n      <button class=\"r-text-btn\" id=\"rZoomVal\" title=\"Fit to width\">Fit</button>\n      <button class=\"icon-btn\" id=\"rZoomIn\" title=\"Zoom in\"><i data-i=\"plus\"></i></button>\n    </div>\n    <div class=\"r-group r-hide-sm\" id=\"rThemes\">\n      <button class=\"swatch\" data-rt=\"light\" title=\"Light\" style=\"background:#fffdf8\"></button>\n      <button class=\"swatch\" data-rt=\"sepia\" title=\"Sepia\" style=\"background:#f4ead5\"></button>\n      <button class=\"swatch\" data-rt=\"dark\" title=\"Dark\" style=\"background:#1c1916\"></button>\n    </div>\n    <div class=\"r-group\">\n      <button class=\"icon-btn\" id=\"rMark\" title=\"Bookmark this spot\"><i data-i=\"bookmark\"></i></button>\n      <button class=\"icon-btn only-export\" id=\"rExport\" title=\"Export to PDF\"><i data-i=\"pdf\"></i></button>\n    </div>\n  </div>\n  <div class=\"r-main\">\n    <div class=\"r-scrim\" id=\"rScrim\" hidden></div>\n    <aside class=\"r-drawer\" id=\"rDrawer\">\n      <div class=\"r-tabs\">\n        <button data-tab=\"toc\" class=\"on\">Contents</button>\n        <button data-tab=\"marks\">Bookmarks</button>\n        <button data-tab=\"lib\">Library</button>\n      </div>\n      <div class=\"r-list\" id=\"rList\"></div>\n    </aside>\n    <div class=\"r-stage\" id=\"rStage\"></div>\n    <button class=\"r-nav prev\" id=\"rPrev\" title=\"Previous (\u2190)\"><i data-i=\"left\" data-s=\"28\"></i></button>\n    <button class=\"r-nav next\" id=\"rNext\" title=\"Next (\u2192)\"><i data-i=\"right\" data-s=\"28\"></i></button>\n  </div>\n  <div class=\"r-bottom\">\n    <input type=\"range\" id=\"rRange\" min=\"0\" max=\"1000\" value=\"0\" aria-label=\"Position in book\">\n    <span id=\"rLabel\"></span>\n  </div>\n</section>\n\n<!-- edit dialog -->\n<dialog class=\"dlg\" id=\"editDlg\">\n  <form id=\"editForm\">\n    <div class=\"dlg-head\"><h2>Edit details</h2><button type=\"button\" class=\"icon-btn\" data-close aria-label=\"Close\"><i data-i=\"x\"></i></button></div>\n    <div class=\"dlg-body edit-grid\">\n      <div class=\"edit-cover\">\n        <div id=\"edCover\" class=\"cover\"></div>\n        <button type=\"button\" class=\"btn small\" id=\"edCoverBtn\">Change cover</button>\n        <button type=\"button\" class=\"btn small ghost\" id=\"edCoverRemove\">Use generated cover</button>\n      </div>\n      <div class=\"edit-fields\">\n        <label class=\"field\">Title<input name=\"title\" required></label>\n        <label class=\"field\">Author<input name=\"author\"></label>\n        <div class=\"two\">\n          <label class=\"field\">Status<select name=\"status\"><option value=\"unread\">Not started</option><option value=\"reading\">Reading</option><option value=\"finished\">Finished</option></select></label>\n          <label class=\"field\">Tags<input name=\"tags\" placeholder=\"fiction, favourites\"></label>\n        </div>\n        <label class=\"field\">Notes<textarea name=\"notes\" rows=\"3\" placeholder=\"Anything you want to remember\"></textarea></label>\n        <p class=\"file-info\" id=\"edInfo\"></p>\n      </div>\n    </div>\n    <div class=\"dlg-foot\">\n      <button type=\"button\" class=\"btn ghost danger\" id=\"edDelete\"><i data-i=\"trash\"></i>Delete</button>\n      <span class=\"sp\"></span>\n      <button type=\"button\" class=\"btn ghost\" data-close>Cancel</button>\n      <button type=\"submit\" class=\"btn primary\">Save</button>\n    </div>\n  </form>\n</dialog>\n\n<!-- confirm dialog -->\n<dialog class=\"dlg confirm\" id=\"confirmDlg\" style=\"width:min(440px,calc(100vw - 24px))\">\n  <div class=\"dlg-head\"><h2 id=\"cfTitle\"></h2></div>\n  <div class=\"dlg-body\"><p id=\"cfMsg\"></p></div>\n  <div class=\"dlg-foot\"><span class=\"sp\"></span><button class=\"btn ghost\" id=\"cfNo\">Cancel</button><button class=\"btn primary\" id=\"cfYes\">OK</button></div>\n</dialog>\n\n<!-- export dialog -->\n<dialog class=\"dlg wide\" id=\"exportDlg\">\n  <div class=\"dlg-head\"><h2 id=\"exTitle\">Export to PDF</h2><button class=\"icon-btn\" data-close aria-label=\"Close\"><i data-i=\"x\"></i></button></div>\n  <div class=\"ex-body\">\n    <div class=\"ex-opts\">\n      <label class=\"field\">Page size\n        <select id=\"exSize\"><option value=\"a4\">A4</option><option value=\"letter\">US Letter</option><option value=\"a5\">A5</option><option value=\"trade\">Book (6 \u00d7 9 in)</option><option value=\"legal\">US Legal</option></select>\n      </label>\n      <label class=\"field\">Margins\n        <select id=\"exMargin\"><option value=\"normal\">Normal</option><option value=\"narrow\">Narrow</option><option value=\"wide\">Wide</option><option value=\"none\">None</option></select>\n      </label>\n      <div class=\"field\">Text size\n        <div class=\"range-row\"><input type=\"range\" id=\"exScale\" min=\"70\" max=\"150\" step=\"5\" value=\"100\"><output id=\"exScaleOut\">100%</output></div>\n      </div>\n      <label class=\"check\"><input type=\"checkbox\" id=\"exBreaks\" checked> Start each chapter on a new page</label>\n      <label class=\"check\" id=\"exCoverRow\"><input type=\"checkbox\" id=\"exCover\" checked> Add the cover as the first page</label>\n      <label class=\"check\" id=\"exTocRow\"><input type=\"checkbox\" id=\"exToc\"> Add a contents page with links</label>\n      <div class=\"ex-note\">Press <b>Save as PDF</b>, then pick <b>Save as PDF</b> as the destination. Leave margins on <b>Default</b>, turn <b>Headers and footers</b> off and <b>Background graphics</b> on.<br><br>Text stays sharp and selectable, links keep working and images are kept at their original resolution.</div>\n      <button class=\"btn primary\" id=\"exGo\" disabled style=\"justify-content:center\"><i data-i=\"download\"></i>Save as PDF</button>\n    </div>\n    <div class=\"ex-preview\">\n      <iframe id=\"exFrame\" title=\"PDF preview\"></iframe>\n      <div class=\"ex-status\" id=\"exStatus\">Preparing\u2026</div>\n    </div>\n  </div>\n</dialog>\n\n<div class=\"menu\" id=\"menu\" hidden></div>\n<div class=\"toasts\" id=\"toasts\"></div>\n<div class=\"import-card\" id=\"importCard\" hidden><b id=\"impTitle\">Adding books\u2026</b><div class=\"file\" id=\"impFile\"></div><div class=\"track\"><span id=\"impBar\"></span></div></div>\n<div class=\"drop\" id=\"drop\" hidden><div>Drop books to add them</div></div>\n<dialog class=\"dlg\" id=\"pwDlg\" style=\"width:min(420px,calc(100vw - 24px))\">\n  <form id=\"pwForm\">\n    <div class=\"dlg-head\"><h2>Password required</h2></div>\n    <div class=\"dlg-body\">\n      <p class=\"pw-msg\"><b id=\"pwName\"></b> is password-protected. Enter its password to open it. The password is only used on this device.</p>\n      <label class=\"field\">Password<input id=\"pwInput\" type=\"password\" autocomplete=\"off\" required></label>\n      <p class=\"pw-err\" id=\"pwErr\" hidden>That password didn't work. Try again.</p>\n    </div>\n    <div class=\"dlg-foot\"><span class=\"sp\"></span><button type=\"button\" class=\"btn ghost\" id=\"pwCancel\">Cancel</button><button type=\"submit\" class=\"btn primary\">Unlock</button></div>\n  </form>\n</dialog>");
const IS_LIB = !!document.getElementById('books');
/* =========================================================================
   Utilities
   ========================================================================= */
const XLINK = 'http://www.w3.org/1999/xlink', OPS = 'http://www.idpf.org/2007/ops';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
const fmtDate = t => t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const throttle = (fn, ms) => { let last = 0, timer; return (...a) => { const now = Date.now(); clearTimeout(timer); if (now - last >= ms) { last = now; fn(...a); } else timer = setTimeout(() => { last = Date.now(); fn(...a); }, ms - (now - last)); }; };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const titleFromName = n => n.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

const ICONS = {
  image: "<rect x=\"3.5\" y=\"4.5\" width=\"17\" height=\"15\" rx=\"2\"/><circle cx=\"9\" cy=\"10\" r=\"1.6\"/><path d=\"M20.5 16l-5-5-8.5 8.5\"/>",
  markdown: "<rect x=\"2.5\" y=\"5.5\" width=\"19\" height=\"13\" rx=\"2\"/><path d=\"M6 15V9l2.5 3L11 9v6M15.5 9v6m0 0l-2-2m2 2l2-2\"/>",
  book: "<path d=\"M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z\"/><path d=\"M5 16.5a3 3 0 0 1 3-3h11\"/>",
  sparkle: "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/><path d=\"M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z\"/>",
  upload: "<path d=\"M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16\"/>",
  check: "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>",
  copy: "<rect x=\"8.5\" y=\"8.5\" width=\"11\" height=\"11\" rx=\"2\"/><path d=\"M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5\"/>",
  lock: "<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10.5V8a4 4 0 0 1 8 0v2.5\"/>",
  shield: "<path d=\"M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z\"/><path d=\"M8.5 12l2.5 2.5 4.5-5\"/>",
  bolt: "<path d=\"M13 3L5 13.5h6L10 21l8-10.5h-6z\"/>",
  chevron: "<path d=\"M6 9l6 6 6-6\"/>",
  layers: "<path d=\"M12 4l8.5 4.5L12 13 3.5 8.5z\"/><path d=\"M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5\"/>",

  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  back: '<path d="M19 12H5m6-6l-6 6 6 6"/>', left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  toc: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  download: '<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  read: '<path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5V19c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  convert: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  library: '<path d="M4 4h3v16H4zM10 4h3v16h-3zM15.5 5l3-.8 3.5 15.3-3 .7z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  aMinus: '<path d="M3 18l5-12 5 12M4.7 14h6.6M16 12h5"/>', aPlus: '<path d="M3 18l5-12 5 12M4.7 14h6.6M16 12h6M19 9v6"/>',
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('i[data-i]', root).forEach(i => { i.outerHTML = icon(i.dataset.i, +i.dataset.s || 18); });

function toast(msg, type = 'info', ms = 3600) {
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' ? ' err' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
}

const libsOk = (need) => {
  const missing = need.filter(n => typeof window[n] === 'undefined');
  if (missing.length) { toast('Reader libraries could not load. Check your internet connection and reload.', 'err', 6000); return false; }
  return true;
};

/* settings */
const DEFAULTS = { view: 'grid', sort: 'recent', rtheme: 'light', fontSize: 100, font: 'original', flow: 'paginated', pdfZoom: 'fit', appTheme: 'auto' };
const settings = { ...DEFAULTS };
try { Object.assign(settings, JSON.parse(localStorage.getItem('shelf-settings') || '{}')); } catch { }
const saveSettings = () => { try { localStorage.setItem('shelf-settings', JSON.stringify(settings)); } catch { } };

/* =========================================================================
   Storage (IndexedDB) — metadata and the book files themselves
   ========================================================================= */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('shelf-library', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
      };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  run(stores, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(stores, mode);
      let out;
      const req = fn(t);
      if (req) req.onsuccess = () => { out = req.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Storage is full'));
    });
  },
  all() { return this.run('books', 'readonly', t => t.objectStore('books').getAll()); },
  put(b) { return this.run('books', 'readwrite', t => { t.objectStore('books').put(b); }); },
  file(id) { return this.run('files', 'readonly', t => t.objectStore('files').get(id)).then(r => r && r.blob); },
  add(b, blob) { return this.run(['books', 'files'], 'readwrite', t => { t.objectStore('books').put(b); t.objectStore('files').put({ id: b.id, blob }); }); },
  del(id) { return this.run(['books', 'files'], 'readwrite', t => { t.objectStore('books').delete(id); t.objectStore('files').delete(id); }); },
};
const saveTimers = new Map();
const saveSoon = (b, ms = 700) => { clearTimeout(saveTimers.get(b.id)); saveTimers.set(b.id, setTimeout(() => { saveTimers.delete(b.id); DB.put(b).catch(console.warn); }, ms)); };
const saveNow = b => { clearTimeout(saveTimers.get(b.id)); saveTimers.delete(b.id); return DB.put(b).catch(console.warn); };

/* =========================================================================
   Path / mime / XML helpers
   ========================================================================= */
const EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', css: 'text/css', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', xhtml: 'application/xhtml+xml', html: 'text/html', htm: 'text/html', mp3: 'audio/mpeg', mp4: 'video/mp4', m4a: 'audio/mp4' };
const mimeFromPath = p => EXT_MIME[(p.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
const dirname = p => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); };
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
function resolvePath(baseDir, href) {
  href = safeDecode(href.split('#')[0].split('?')[0]);
  if (href.startsWith('/')) return href.slice(1);
  const parts = baseDir ? baseDir.split('/') : [];
  for (const seg of href.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
const isExternal = h => /^[a-z][a-z0-9+.-]*:/i.test(h);
function parseXML(str) { return new DOMParser().parseFromString(str, 'application/xml'); }
function parseChapter(src) {
  let d = new DOMParser().parseFromString(src, 'application/xhtml+xml');
  if (!d.documentElement || d.getElementsByTagName('parsererror').length) d = new DOMParser().parseFromString(src, 'text/html');
  return d;
}
function imgMime(u8) {
  if (u8[0] === 0xFF && u8[1] === 0xD8) return 'image/jpeg';
  if (u8[0] === 0x89 && u8[1] === 0x50) return 'image/png';
  if (u8[0] === 0x47 && u8[1] === 0x49) return 'image/gif';
  if (u8[0] === 0x42 && u8[1] === 0x4D) return 'image/bmp';
  return null;
}
async function makeThumb(blob, w = 360) {
  let src, cleanup = () => { };
  try { src = await createImageBitmap(blob); cleanup = () => src.close && src.close(); }
  catch {
    const url = URL.createObjectURL(blob);
    src = new Image(); src.src = url;
    try { await src.decode(); } catch { URL.revokeObjectURL(url); return null; }
    cleanup = () => URL.revokeObjectURL(url);
  }
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  if (!sw || !sh) { cleanup(); return null; }
  const scale = Math.min(1, w / sw);
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  cleanup();
  return c.toDataURL('image/jpeg', 0.85);
}

/* =========================================================================
   EPUB parsing (own parser, used for metadata, cover and PDF export)
   ========================================================================= */
const Epub = {
  async open(buf) {
    const zip = await JSZip.loadAsync(buf);
    const files = {}, lower = {};
    zip.forEach((p, f) => { if (!f.dir) { files[p] = f; lower[p.toLowerCase()] = p; } });
    const get = path => files[path] || files[lower[(path || '').toLowerCase()]] || null;
    const text = async path => { const f = get(path); if (!f) throw new Error('Missing ' + path); return f.async('string'); };
    const container = parseXML(await text('META-INF/container.xml'));
    const rootfile = container.getElementsByTagNameNS('*', 'rootfile')[0];
    if (!rootfile) throw new Error('Not a valid EPUB (no rootfile)');
    const opfPath = rootfile.getAttribute('full-path');
    const opfDir = dirname(opfPath);
    const opf = parseXML(await text(opfPath));
    const manifest = {}, byPath = {};
    for (const it of opf.getElementsByTagNameNS('*', 'item')) {
      const href = it.getAttribute('href'); if (!href) continue;
      const m = { id: it.getAttribute('id'), path: resolvePath(opfDir, href), type: it.getAttribute('media-type') || '', props: it.getAttribute('properties') || '' };
      manifest[m.id] = m; byPath[m.path] = m;
    }
    const spineEl = opf.getElementsByTagNameNS('*', 'spine')[0];
    const spine = [...opf.getElementsByTagNameNS('*', 'itemref')].map(r => manifest[r.getAttribute('idref')]).filter(Boolean);
    const dc = name => [...opf.getElementsByTagNameNS('*', name)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const isImg = m => m && /^image\//.test(m.type);
    let cover = Object.values(manifest).find(m => /(^|\s)cover-image(\s|$)/.test(m.props));
    if (!cover) {
      const meta = [...opf.getElementsByTagNameNS('*', 'meta')].find(m => m.getAttribute('name') === 'cover');
      const id = meta && meta.getAttribute('content');
      if (id && isImg(manifest[id])) cover = manifest[id];
    }
    if (!cover) cover = Object.values(manifest).find(m => isImg(m) && /cover/i.test(m.id + ' ' + m.path));
    const lang = dc('language')[0] || '';
    return {
      zip, get, text, opfDir, manifest, byPath, spine, lang,
      tocId: spineEl && spineEl.getAttribute('toc'),
      title: dc('title')[0] || '', author: dc('creator').join(', '),
      coverPath: cover ? cover.path : null,
      async blob(path) {
        const f = get(path); if (!f) return null;
        const data = await f.async('uint8array');
        return new Blob([data], { type: (byPath[path] && byPath[path].type) || mimeFromPath(path) });
      },
    };
  },
  async toc(ep) {
    const out = [];
    const navItem = Object.values(ep.manifest).find(m => /(^|\s)nav(\s|$)/.test(m.props));
    if (navItem && ep.get(navItem.path)) {
      try {
        const d = parseChapter(await ep.text(navItem.path));
        const navs = [...d.getElementsByTagName('nav')];
        const nav = navs.find(n => /toc/.test(n.getAttributeNS(OPS, 'type') || n.getAttribute('epub:type') || '')) || navs[0];
        const base = dirname(navItem.path);
        const walk = (ol, depth) => {
          for (const li of ol.children) {
            if (li.localName !== 'li') continue;
            const a = [...li.children].find(c => c.localName === 'a' || c.localName === 'span');
            const href = a && a.getAttribute('href');
            if (a) out.push({ label: a.textContent.replace(/\s+/g, ' ').trim(), path: href ? resolvePath(base, href) : null, frag: href && href.includes('#') ? safeDecode(href.split('#')[1]) : '', depth });
            const sub = [...li.children].find(c => c.localName === 'ol');
            if (sub) walk(sub, depth + 1);
          }
        };
        const ol = nav && [...nav.children].find(c => c.localName === 'ol');
        if (ol) walk(ol, 0);
      } catch (e) { console.warn('nav parse', e); }
    }
    if (!out.length) {
      const ncx = (ep.tocId && ep.manifest[ep.tocId]) || Object.values(ep.manifest).find(m => m.type === 'application/x-dtbncx+xml');
      if (ncx && ep.get(ncx.path)) {
        try {
          const d = parseXML(await ep.text(ncx.path));
          const base = dirname(ncx.path);
          const walk = (parent, depth) => {
            for (const np of parent.children) {
              if (np.localName !== 'navPoint') continue;
              const label = np.getElementsByTagNameNS('*', 'text')[0];
              const content = [...np.children].find(c => c.localName === 'content');
              const src = content && content.getAttribute('src');
              out.push({ label: label ? label.textContent.replace(/\s+/g, ' ').trim() : '', path: src ? resolvePath(base, src) : null, frag: src && src.includes('#') ? safeDecode(src.split('#')[1]) : '', depth });
              walk(np, depth + 1);
            }
          };
          const navMap = d.getElementsByTagNameNS('*', 'navMap')[0];
          if (navMap) walk(navMap, 0);
        } catch (e) { console.warn('ncx parse', e); }
      }
    }
    return out;
  },
};

/* =========================================================================
   MOBI parsing (PalmDOC + HUFF/CDIC compression, images, EXTH metadata)
   ========================================================================= */
const Mobi = (() => {
  const ascii = (u8, o, n) => String.fromCharCode(...u8.subarray(o, o + n));
  function parse(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    if (u8.length < 86) throw new Error('File is too small to be a MOBI book');
    const type = ascii(u8, 60, 8);
    if (type !== 'BOOKMOBI' && type !== 'TEXtREAd') throw new Error('Not a MOBI/PRC file');
    const n = dv.getUint16(76);
    const offs = []; for (let i = 0; i < n; i++) offs.push(dv.getUint32(78 + i * 8));
    const rec = i => (i < 0 || i >= n) ? null : u8.subarray(offs[i], i + 1 < n ? offs[i + 1] : u8.length);
    const r0 = rec(0), d0 = new DataView(buf, offs[0], r0.length);
    const m = {
      rec, n, title: ascii(u8, 0, 32).replace(/\0[\s\S]*$/, '').replace(/_/g, ' ').trim(), author: '',
      compression: d0.getUint16(0), textLength: d0.getUint32(4), textRecords: d0.getUint16(8), encryption: d0.getUint16(12),
      encoding: 1252, firstImage: -1, extraFlags: 0, huffRec: 0, huffCount: 0, coverIndex: -1, version: 0, kf8: false,
    };
    if (type === 'BOOKMOBI' && r0.length > 20 && ascii(r0, 16, 4) === 'MOBI') {
      const hl = d0.getUint32(20);
      const has = off => 16 + hl >= off + 4 && off + 4 <= r0.length;
      m.encoding = d0.getUint32(28);
      m.version = d0.getUint32(36);
      const dec = new TextDecoder(m.encoding === 65001 ? 'utf-8' : 'windows-1252');
      if (has(88)) { const fo = d0.getUint32(84), fl = d0.getUint32(88); if (fl && fo + fl <= r0.length) m.title = dec.decode(r0.subarray(fo, fo + fl)).trim() || m.title; }
      if (has(108)) m.firstImage = d0.getUint32(108);
      if (has(116)) { m.huffRec = d0.getUint32(112); m.huffCount = d0.getUint32(116); }
      const exthFlags = has(128) ? d0.getUint32(128) : 0;
      if (hl >= 0xE4 && r0.length >= 244) m.extraFlags = d0.getUint16(242);
      const exth = {};
      if (exthFlags & 0x40) {
        let p = 16 + hl;
        if (p + 12 <= r0.length && ascii(r0, p, 4) === 'EXTH') {
          const cnt = d0.getUint32(p + 8); p += 12;
          for (let k = 0; k < cnt && p + 8 <= r0.length; k++) {
            const t = d0.getUint32(p), l = d0.getUint32(p + 4);
            if (l < 8) break;
            (exth[t] = exth[t] || []).push(r0.subarray(p + 8, p + l)); p += l;
          }
        }
      }
      const str = t => (exth[t] || []).map(d => dec.decode(d).trim()).filter(Boolean);
      const num = t => exth[t] ? exth[t][0].reduce((a, b) => a * 256 + b, 0) : null;
      if (str(100).length) m.author = str(100).join(', ');
      if (str(503)[0]) m.title = str(503)[0];
      const cov = num(201);
      if (cov != null && cov !== 0xFFFFFFFF && m.firstImage > 0) m.coverIndex = m.firstImage + cov;
      if (m.version >= 8) m.kf8 = true;
    }
    return m;
  }
  function palmdoc(src) {
    const out = new Uint8Array(src.length * 8 + 16); let o = 0, i = 0;
    while (i < src.length) {
      const c = src[i++];
      if (c === 0 || (c >= 9 && c <= 0x7f)) out[o++] = c;
      else if (c <= 8) { for (let k = 0; k < c && i < src.length; k++) out[o++] = src[i++]; }
      else if (c >= 0xc0) { out[o++] = 0x20; out[o++] = c ^ 0x80; }
      else {
        if (i >= src.length) break;
        const pair = (c << 8) | src[i++];
        const dist = (pair >> 3) & 0x7ff, len = (pair & 7) + 3;
        if (!dist || dist > o) continue;
        for (let k = 0; k < len; k++) { out[o] = out[o - dist]; o++; }
      }
    }
    return out.subarray(0, o);
  }
  function huffcdic(m) {
    const huff = m.rec(m.huffRec);
    if (!huff || ascii(huff, 0, 4) !== 'HUFF') throw new Error('Corrupt HUFF/CDIC compression record');
    const hv = new DataView(huff.buffer, huff.byteOffset, huff.byteLength);
    const off1 = hv.getUint32(8), off2 = hv.getUint32(12);
    const dict1 = [];
    for (let i = 0; i < 256; i++) {
      const v = hv.getUint32(off1 + i * 4);
      const codelen = v & 0x1f, term = v & 0x80;
      let maxcode = v >>> 8;
      if (codelen <= 8) maxcode = (maxcode + 1) * 2 ** (32 - codelen) - 1;
      dict1.push([codelen, term, maxcode]);
    }
    const minc = [0], maxc = [0];
    for (let len = 1; len <= 32; len++) {
      minc.push(hv.getUint32(off2 + (len - 1) * 8) * 2 ** (32 - len));
      maxc.push((hv.getUint32(off2 + (len - 1) * 8 + 4) + 1) * 2 ** (32 - len) - 1);
    }
    const dict = [];
    for (let i = 1; i < m.huffCount; i++) {
      const c = m.rec(m.huffRec + i);
      if (!c || ascii(c, 0, 4) !== 'CDIC') break;
      const cv = new DataView(c.buffer, c.byteOffset, c.byteLength);
      const phrases = cv.getUint32(8), bits = cv.getUint32(12);
      const cnt = Math.min(2 ** bits, phrases - dict.length);
      for (let k = 0; k < cnt; k++) {
        const off = cv.getUint16(16 + k * 2);
        const blen = cv.getUint16(16 + off);
        const s = 18 + off;
        dict.push([c.subarray(s, s + (blen & 0x7fff)), (blen & 0x8000) !== 0]);
      }
    }
    const peek32 = (b, pos) => {
      const i = pos >>> 3, s = pos & 7;
      const v = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
      return s ? (((v << s) | (b[i + 4] >>> (8 - s))) >>> 0) : v;
    };
    const unpack = (data, depth) => {
      if (depth > 40) throw new Error('HUFF/CDIC recursion too deep');
      const b = new Uint8Array(data.length + 8); b.set(data);
      let bitsLeft = data.length * 8, pos = 0, total = 0;
      const parts = [];
      for (;;) {
        const code = peek32(b, pos);
        let [codelen, term, maxcode] = dict1[code >>> 24];
        if (!codelen) throw new Error('Corrupt HUFF table');
        if (!term) { while (codelen < 32 && code < minc[codelen]) codelen++; maxcode = maxc[codelen]; }
        pos += codelen; bitsLeft -= codelen;
        if (bitsLeft < 0) break;
        const r = Math.floor((maxcode - code) / 2 ** (32 - codelen));
        const entry = dict[r];
        if (!entry) throw new Error('Corrupt CDIC dictionary');
        let slice = entry[0];
        if (!entry[1]) { slice = unpack(slice, depth + 1); dict[r] = [slice, true]; }
        parts.push(slice); total += slice.length;
      }
      const out = new Uint8Array(total); let o = 0;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out;
    };
    return data => unpack(data, 0);
  }
  function trimTrailing(a, flags) {
    if (!flags) return a;
    let f = flags >>> 1;
    while (f) {
      if (f & 1) {
        let v = 0;
        for (const byte of a.subarray(Math.max(0, a.length - 4))) { if (byte & 0x80) v = 0; v = (v << 7) | (byte & 0x7f); }
        a = a.subarray(0, Math.max(0, a.length - v));
      }
      f >>>= 1;
    }
    if ((flags & 1) && a.length) a = a.subarray(0, Math.max(0, a.length - ((a[a.length - 1] & 3) + 1)));
    return a;
  }
  function text(m) {
    if (m.encryption) throw new Error('This book is DRM-protected, so it can’t be opened here.');
    if (m.kf8) throw new Error('This is a KF8 / AZW3 book. Only classic MOBI is supported — convert it to EPUB (e.g. with Calibre) and add that instead.');
    let decomp;
    if (m.compression === 1) decomp = x => x;
    else if (m.compression === 2) decomp = palmdoc;
    else if (m.compression === 17480) decomp = huffcdic(m);
    else throw new Error('Unknown MOBI compression type ' + m.compression);
    const parts = []; let total = 0;
    for (let i = 1; i <= m.textRecords && i < m.n; i++) {
      const d = decomp(trimTrailing(m.rec(i), m.extraFlags));
      parts.push(d); total += d.length;
    }
    const all = new Uint8Array(total); let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    return all;
  }
  return { parse, text };
})();

function latin1(u8) { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return s; }

/* =========================================================================
   Printable documents (EPUB/MOBI → one HTML document → browser "Save as PDF")
   ========================================================================= */
const BASE_PRINT_CSS = `
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Georgia,"Times New Roman",serif;line-height:1.5;color:#111;background:#fff}
img,svg,video{max-width:100%;height:auto}
img,svg,figure{break-inside:avoid}
h1,h2,h3,h4,h5,h6{break-after:avoid}
p{orphans:2;widows:2}
.epub-chapter{display:block}
.gen-cover{break-after:page;text-align:center;margin:0;padding:0}
.gen-cover img{max-width:100%;max-height:95vh;object-fit:contain}
.gen-toc{break-after:page}
.gen-toc h1{font-size:1.6em;margin:0 0 1em}
.gen-toc ol{list-style:none;margin:0;padding:0}
.gen-toc li{margin:.35em 0}
.gen-toc a{color:inherit;text-decoration:none}
.mbp-pagebreak{break-after:page;height:0}
@media screen{
  html{background:#e9e6df}
  body{max-width:44rem;margin:24px auto;padding:56px 60px;box-shadow:0 1px 3px rgba(0,0,0,.12),0 10px 30px -12px rgba(0,0,0,.25)}
  .epub-chapter+.epub-chapter{border-top:1px dashed #cfc8bb;margin-top:48px;padding-top:48px}
  .mbp-pagebreak{border-top:1px dashed #cfc8bb;margin:40px 0}
  .gen-cover{margin-bottom:40px}.gen-cover img{max-height:80vh}
}
@media print{body{margin:0;padding:0}}`;

async function epubPrintable(buf, step = () => { }) {
  step('Reading the EPUB…');
  const ep = await Epub.open(buf);
  const toc = await Epub.toc(ep).catch(() => []);
  const urls = new Map(), created = [];
  let usedNow = new Set();
  const asset = async path => {
    usedNow.add(path);
    if (urls.has(path)) return urls.get(path);
    const b = await ep.blob(path);
    const u = b ? URL.createObjectURL(b) : '';
    urls.set(path, u); if (u) created.push(u);
    return u;
  };
  const cssDone = new Set();
  async function rewriteCss(css, baseDir) {
    let pre = '';
    const imports = [];
    css = css.replace(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/gi, (_, href) => { if (!isExternal(href)) imports.push(resolvePath(baseDir, href)); return ''; });
    for (const p of imports) pre += await loadCss(p);
    const repl = new Map();
    for (const mm of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
      const ref = mm[2].trim();
      if (repl.has(ref) || /^(data:|blob:|#)/i.test(ref) || isExternal(ref)) continue;
      repl.set(ref, await asset(resolvePath(baseDir, ref)));
    }
    css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, ref) => repl.has(ref.trim()) ? `url("${repl.get(ref.trim())}")` : m);
    return pre + css;
  }
  async function loadCss(path) {
    if (cssDone.has(path)) return '';
    cssDone.add(path);
    const f = ep.get(path); if (!f) return '';
    return await rewriteCss(await f.async('string'), dirname(path)) + '\n';
  }
  const out = document.implementation.createHTMLDocument('book');
  const spineIndex = new Map(ep.spine.map((m, i) => [m.path, i]));
  const css = [], inlineSeen = new Set();
  let coverInBook = false;
  for (const [i, item] of ep.spine.entries()) {
    step(`Laying out chapter ${i + 1} of ${ep.spine.length}…`);
    const f = ep.get(item.path); if (!f) continue;
    const doc = parseChapter(await f.async('string'));
    const baseDir = dirname(item.path);
    usedNow = new Set();
    for (const link of doc.getElementsByTagName('link')) {
      if (/stylesheet/i.test(link.getAttribute('rel') || '') && link.getAttribute('href') && !isExternal(link.getAttribute('href'))) css.push(await loadCss(resolvePath(baseDir, link.getAttribute('href'))));
    }
    for (const st of doc.getElementsByTagName('style')) {
      const t = st.textContent;
      if (!inlineSeen.has(t)) { inlineSeen.add(t); css.push(await rewriteCss(t, baseDir)); }
    }
    const b = doc.body || doc.getElementsByTagName('body')[0];
    if (!b) continue;
    b.querySelectorAll('script').forEach(s => s.remove());
    const pre = `c${i}-`;
    b.querySelectorAll('[id]').forEach(el => el.setAttribute('id', pre + el.getAttribute('id')));
    b.querySelectorAll('a[name]').forEach(el => el.setAttribute('name', pre + el.getAttribute('name')));
    for (const a of b.querySelectorAll('a')) {
      const href = a.getAttribute('href') || a.getAttributeNS(XLINK, 'href');
      if (!href || isExternal(href)) continue;
      const [p, frag] = href.split('#');
      const target = p ? spineIndex.get(resolvePath(baseDir, p)) : i;
      if (target === undefined) { a.removeAttribute('href'); continue; }
      const nh = frag ? `#c${target}-${safeDecode(frag)}` : `#c${target}`;
      if (a.hasAttribute('href')) a.setAttribute('href', nh);
      if (a.hasAttributeNS(XLINK, 'href')) a.setAttributeNS(XLINK, 'xlink:href', nh);
    }
    for (const el of b.querySelectorAll('img, image, source, video, audio, input')) {
      for (const attr of ['src', 'href', 'poster']) {
        const v = el.getAttribute(attr);
        if (v && !/^(data:|blob:)/i.test(v) && !isExternal(v)) el.setAttribute(attr, await asset(resolvePath(baseDir, v)));
      }
      const xv = el.getAttributeNS(XLINK, 'href');
      if (xv && !/^(data:|blob:)/i.test(xv) && !isExternal(xv)) el.setAttributeNS(XLINK, 'xlink:href', await asset(resolvePath(baseDir, xv)));
      el.removeAttribute('srcset'); el.removeAttribute('loading');
    }
    for (const el of b.querySelectorAll('[style]')) {
      const s = el.getAttribute('style');
      if (/url\(/i.test(s)) el.setAttribute('style', await rewriteCss(s, baseDir));
    }
    if (i < 2 && ep.coverPath && usedNow.has(ep.coverPath)) coverInBook = true;
    const sec = out.createElement('section');
    sec.className = 'epub-chapter' + (b.getAttribute('class') ? ' ' + b.getAttribute('class') : '');
    sec.id = `c${i}`;
    if (b.getAttribute('style')) sec.setAttribute('style', b.getAttribute('style'));
    for (const node of [...b.childNodes]) sec.appendChild(out.importNode(node, true));
    out.body.appendChild(sec);
  }
  let coverUrl = null;
  if (ep.coverPath && !coverInBook) coverUrl = await asset(ep.coverPath);
  const tocItems = toc.filter(t => t.label).map(t => {
    const idx = t.path ? spineIndex.get(t.path) : undefined;
    return { ...t, href: idx === undefined ? null : (t.frag ? `#c${idx}-${t.frag}` : `#c${idx}`) };
  });
  return {
    title: ep.title, author: ep.author, lang: ep.lang, css: css.join('\n'), body: out.body.innerHTML,
    coverUrl, toc: tocItems, coverInBook,
    revoke() { created.forEach(u => URL.revokeObjectURL(u)); },
  };
}

async function mobiPrintable(buf, step = () => { }) {
  step('Decompressing the MOBI…');
  const m = Mobi.parse(buf);
  let bytes = Mobi.text(m);
  await sleep(0);
  // filepos links point at byte offsets in the text: drop an anchor at each one
  const raw = latin1(bytes);
  const safePos = p => { const lt = raw.lastIndexOf('<', p - 1), gt = raw.lastIndexOf('>', p - 1); return lt > gt ? lt : p; }; // never split a tag
  const positions = [...new Set([...raw.matchAll(/filepos\s*=\s*["']?(\d+)/gi)].map(x => +x[1]))].filter(p => p <= bytes.length).sort((a, b) => a - b);
  const insertAt = positions.map(safePos);
  if (positions.length) {
    const enc = new TextEncoder();
    const tags = positions.map(p => enc.encode(`<a id="fp${p}"></a>`));
    const outB = new Uint8Array(bytes.length + tags.reduce((s, t) => s + t.length, 0));
    let o = 0, last = 0;
    insertAt.forEach((p, i) => { outB.set(bytes.subarray(last, p), o); o += p - last; outB.set(tags[i], o); o += tags[i].length; last = p; });
    outB.set(bytes.subarray(last), o);
    bytes = outB;
  }
  step('Laying out pages…');
  let html = new TextDecoder(m.encoding === 65001 ? 'utf-8' : 'windows-1252').decode(bytes);
  html = html.replace(/<mbp:pagebreak[^>]*>/gi, '<div class="mbp-pagebreak"></div>').replace(/<\/mbp:pagebreak>/gi, '')
    .replace(/filepos\s*=\s*["']?0*(\d+)["']?/gi, 'href="#fp$1"');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, guide, head').forEach(e => e.remove());
  const created = [], cache = new Map();
  const imgUrl = idx => {
    if (cache.has(idx)) return cache.get(idx);
    const r = m.rec(idx); let u = '';
    if (r && imgMime(r)) { u = URL.createObjectURL(new Blob([r], { type: imgMime(r) })); created.push(u); }
    cache.set(idx, u); return u;
  };
  let coverInBook = false;
  for (const img of doc.querySelectorAll('img')) {
    const ri = img.getAttribute('recindex') || img.getAttribute('hirecindex') || img.getAttribute('lowrecindex');
    if (ri && m.firstImage > 0) {
      const idx = m.firstImage + parseInt(ri, 10) - 1;
      if (idx === m.coverIndex) coverInBook = true;
      const u = imgUrl(idx); if (u) img.setAttribute('src', u);
    }
  }
  for (const a of doc.querySelectorAll('a[href^="#fp"]')) if (!doc.getElementById(a.getAttribute('href').slice(1))) a.removeAttribute('href');
  const coverUrl = (!coverInBook && m.coverIndex > 0) ? imgUrl(m.coverIndex) || null : null;
  return {
    title: m.title, author: m.author, lang: '', css: '', body: (doc.body || doc.documentElement).innerHTML,
    coverUrl, toc: [], coverInBook,
    revoke() { created.forEach(u => URL.revokeObjectURL(u)); },
  };
}

function printableHtml(p, extraHead = '') {
  const tocHtml = p.toc && p.toc.length ? `<nav class="gen-toc"><h1>Contents</h1><ol>${p.toc.map(t => `<li style="padding-left:${t.depth * 1.4}em">${t.href ? `<a href="${esc(t.href)}">${esc(t.label)}</a>` : esc(t.label)}</li>`).join('')}</ol></nav>` : '';
  return `<!doctype html><html lang="${esc(p.lang || 'en')}"><head><meta charset="utf-8"><title>${esc(p.title || 'Book')}</title>
<style id="base-css">${BASE_PRINT_CSS}</style><style id="book-css">${(p.css || '').replace(/<\/style/gi, '<\\/style')}</style><style id="opt-css"></style>${extraHead}</head>
<body>${p.coverUrl ? `<section class="gen-cover"><img src="${esc(p.coverUrl)}" alt="Cover"></section>` : ''}${tocHtml}${p.body}</body></html>`;
}

/* PDF opening with password prompt */
function askPassword(name, wrong) {
  const d = $('#pwDlg'), inp = $('#pwInput');
  $('#pwName').textContent = name; $('#pwErr').hidden = !wrong; inp.value = '';
  d.showModal(); inp.focus();
  return new Promise(res => {
    const done = v => { d.close(); $('#pwForm').onsubmit = $('#pwCancel').onclick = d.oncancel = null; res(v); };
    $('#pwForm').onsubmit = e => { e.preventDefault(); done(inp.value); };
    $('#pwCancel').onclick = () => done(null);
    d.oncancel = e => { e.preventDefault(); done(null); };
  });
}
function openPdf(data, name = 'This PDF') {
  const task = pdfjsLib.getDocument({ data: data instanceof Uint8Array ? data : new Uint8Array(data), isEvalSupported: false });
  let cancelled = false;
  task.onPassword = (update, reason) => {
    askPassword(name, reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD).then(pw => {
      if (pw == null) { cancelled = true; task.destroy(); } else update(pw);
    });
  };
  return task.promise.catch(e => {
    if (cancelled) throw new Error('This PDF is password-protected. Open it again and enter the password to continue.');
    throw e;
  });
}

/* =========================================================================
   Metadata extraction on import
   ========================================================================= */
async function detectFormat(file) {
  const head = new Uint8Array(await file.slice(0, 80).arrayBuffer());
  const s = (a, b) => String.fromCharCode(...head.subarray(a, b));
  if (s(0, 1024).includes('%PDF')) return 'pdf';
  if (head[0] === 0x50 && head[1] === 0x4B) return 'epub';
  if (head.length >= 68 && ['BOOKMOBI', 'TEXtREAd'].includes(s(60, 68))) return 'mobi';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return { epub: 'epub', pdf: 'pdf', mobi: 'mobi', azw: 'mobi', prc: 'mobi' }[ext] || null;
}
async function extractMeta(format, buf) {
  if (format === 'epub') {
    const ep = await Epub.open(buf);
    let cover = null;
    if (ep.coverPath) { const b = await ep.blob(ep.coverPath); if (b) cover = await makeThumb(b); }
    return { title: ep.title, author: ep.author, cover };
  }
  if (format === 'pdf') {
    const task = pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), isEvalSupported: false });
    task.onPassword = () => task.destroy();
    const pdf = await task.promise;
    let title = '', author = '';
    try { const md = await pdf.getMetadata(); title = (md.info && md.info.Title) || ''; author = (md.info && md.info.Author) || ''; } catch { }
    if (/^(untitled|microsoft word|document\d*$|about:|https?:|file:)|\.(docx?|pdf|txt|html?|indd|tex)$/i.test(title.trim())) title = '';
    const page = await pdf.getPage(1);
    const v0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 360 / v0.width });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const cover = c.toDataURL('image/jpeg', 0.85);
    pdf.destroy();
    return { title: title.trim(), author: author.trim(), cover };
  }
  if (format === 'mobi') {
    const m = Mobi.parse(buf);
    let cover = null;
    const r = m.coverIndex > 0 ? m.rec(m.coverIndex) : null;
    if (r && imgMime(r)) cover = await makeThumb(new Blob([r], { type: imgMime(r) }));
    return { title: m.title, author: m.author, cover };
  }
  return {};
}

/* =========================================================================
   Library: import, render, CRUD
   ========================================================================= */
let books = [];
const ui = { status: 'all', format: 'all' };
const BOOK_RE = /\.(epub|pdf|mobi|azw|prc)$/i;

async function importFiles(list) {
  const files = [...list].filter(f => BOOK_RE.test(f.name));
  if (!files.length) { toast('No EPUB, PDF or MOBI files found there.', 'err'); return; }
  if (!libsOk(['JSZip', 'pdfjsLib'])) return;
  navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => { });
  const card = $('#importCard'); card.hidden = false;
  let added = 0, skipped = 0; const failed = [];
  for (const [i, f] of files.entries()) {
    $('#impTitle').textContent = `Adding ${i + 1} of ${files.length}`;
    $('#impFile').textContent = f.name;
    $('#impBar').style.width = (i / files.length * 100) + '%';
    try {
      if (books.some(b => b.fileName === f.name && b.size === f.size)) { skipped++; continue; }
      const format = await detectFormat(f);
      if (!format) throw new Error('unsupported file type');
      const buf = await f.arrayBuffer();
      let meta = {};
      try { meta = await extractMeta(format, buf); } catch (e) { console.warn('metadata', f.name, e); }
      const now = Date.now();
      const book = {
        id: uid(), title: meta.title || titleFromName(f.name), author: meta.author || '', format,
        fileName: f.name, size: f.size, addedAt: now + i, updatedAt: now, lastOpened: 0,
        status: 'unread', tags: [], notes: '', cover: meta.cover || null,
        progress: { loc: null, percent: 0 }, bookmarks: [],
      };
      await DB.add(book, new Blob([buf], { type: { epub: 'application/epub+zip', pdf: 'application/pdf', mobi: 'application/x-mobipocket-ebook' }[format] }));
      books.push(book); added++;
      if (added % 3 === 1) render();
    } catch (e) { console.error(e); failed.push(`${f.name} (${e.message || e})`); }
  }
  $('#impBar').style.width = '100%';
  await sleep(250);
  card.hidden = true;
  render(); updateStorage();
  const parts = [];
  if (added) parts.push(`Added ${added} book${added > 1 ? 's' : ''}`);
  if (skipped) parts.push(`${skipped} already on your shelf`);
  if (parts.length) toast(parts.join(' · '));
  if (failed.length) toast(`Couldn't add ${failed.join(', ')}`, 'err', 7000);
}

function coverHTML(b) {
  return b.cover
    ? `<img src="${esc(b.cover)}" alt="" loading="lazy">`
    : `<div class="gen" style="--h:${hue(b.title)}"><span class="t">${esc(b.title)}</span><span class="a">${esc(b.author)}</span></div>`;
}
const STATUS_LABEL = { unread: 'Not started', reading: 'Reading', finished: 'Finished' };
function statusText(b) {
  const pct = Math.round((b.progress && b.progress.percent || 0) * 100);
  if (b.status === 'reading') return `Reading · ${pct}%`;
  return STATUS_LABEL[b.status] || '';
}
function cardHTML(b) {
  const pct = Math.round((b.progress && b.progress.percent || 0) * 100);
  return `<article class="book" data-id="${b.id}">
    <button class="cover" data-act="read" title="Read “${esc(b.title)}”">${coverHTML(b)}<span class="fmt">${b.format.toUpperCase()}</span>${pct > 0 && b.status !== 'finished' ? `<span class="bar"><span style="width:${pct}%"></span></span>` : ''}</button>
    <div class="meta">
      <div class="txt">
        <h3 class="title" title="${esc(b.title)}">${esc(b.title)}</h3>
        <p class="author">${esc(b.author || 'Unknown author')}</p>
        <span class="status ${b.status}">${statusText(b)}</span>
        ${b.tags && b.tags.length ? `<div class="tags extra">${b.tags.map(t => `<button class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="extra"><span class="pill">${b.format.toUpperCase()}</span><span class="hide-sm">${fmtBytes(b.size || 0)}</span><span class="hide-sm">Added ${fmtDate(b.addedAt)}</span></div>
      <button class="more-btn" data-act="menu" aria-label="More actions">${icon('more')}</button>
    </div>
  </article>`;
}
function filtered() {
  const q = $('#q').value.trim().toLowerCase();
  let list = books.filter(b =>
    (ui.status === 'all' || b.status === ui.status) &&
    (ui.format === 'all' || b.format === ui.format) &&
    (!q || [b.title, b.author, (b.tags || []).join(' '), b.fileName].join(' ').toLowerCase().includes(q)));
  const by = settings.sort;
  const cmp = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  list.sort(by === 'title' ? (a, b) => cmp(a.title, b.title)
    : by === 'author' ? (a, b) => cmp(a.author || '~', b.author || '~') || cmp(a.title, b.title)
      : by === 'added' ? (a, b) => b.addedAt - a.addedAt
        : (a, b) => (b.lastOpened || 0) - (a.lastOpened || 0) || b.addedAt - a.addedAt);
  return list;
}
function render() {
  if (!IS_LIB) return;
  const counts = { all: books.length, reading: 0, unread: 0, finished: 0 };
  books.forEach(b => counts[b.status]++);
  $('#chips').innerHTML = [['all', 'All'], ['reading', 'Reading'], ['unread', 'Not started'], ['finished', 'Finished']]
    .map(([k, l]) => `<button class="chip ${ui.status === k ? 'on' : ''}" data-status="${k}">${l}<span class="n">${counts[k]}</span></button>`).join('');
  $$('.seg button').forEach(b => b.classList.toggle('on', b.dataset.view === settings.view));
  $('#sortSel').value = settings.sort;
  const list = filtered();
  const el = $('#books');
  el.className = 'books ' + settings.view;
  el.innerHTML = list.map(cardHTML).join('');
  $('#empty').hidden = books.length > 0;
  $('#toolbar').hidden = books.length === 0;
  $('#nomatch').hidden = !(books.length && !list.length);
  el.hidden = !list.length;
}
async function updateStorage() {
  if (!IS_LIB) return;
  try {
    const e = await navigator.storage.estimate();
    $('#storageInfo').textContent = `${books.length} book${books.length === 1 ? '' : 's'} · ${fmtBytes(e.usage || 0)} used of ${fmtBytes(e.quota || 0)} available`;
  } catch { $('#storageInfo').textContent = `${books.length} books`; }
}

/* popover menu */
const menu = $('#menu');
function openMenu(anchor, b) {
  const items = [
    ['read', 'read', b.progress && b.progress.percent > 0 ? 'Continue reading' : 'Start reading'],
    ['edit', 'edit', 'Edit details'],
    b.format === 'pdf' ? ['download', 'download', 'Download PDF'] : ['export', 'pdf', 'Export to PDF'],
    b.format !== 'pdf' ? ['download', 'download', 'Download original'] : null,
    ...(b.format === 'pdf' && window.ShelfTools ? ['hr', ['t-images', 'image', 'Convert to images…'], ['t-markdown', 'markdown', 'Convert to Markdown…'], ['t-epub', 'book', 'Convert to EPUB…'], ['t-aipdf', 'sparkle', 'Make AI-ready PDF…']] : []),
    'hr',
    ['delete', 'trash', 'Delete', 'danger'],
  ].filter(Boolean);
  menu.innerHTML = items.map(it => it === 'hr' ? '<hr>' : `<button data-mact="${it[0]}" class="${it[3] || ''}">${icon(it[1])}${it[2]}</button>`).join('');
  menu.dataset.id = b.id;
  menu.hidden = false;
  const r = anchor.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px';
  menu.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
}
const closeMenu = () => { menu.hidden = true; };
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('[data-act="menu"]')) closeMenu(); });
addEventListener('resize', closeMenu); addEventListener('scroll', closeMenu, true);
menu.addEventListener('click', e => {
  const btn = e.target.closest('[data-mact]'); if (!btn) return;
  const b = books.find(x => x.id === menu.dataset.id); closeMenu(); if (!b) return;
  if (btn.dataset.mact.startsWith('t-')) { window.ShelfTools.openDialog(btn.dataset.mact.slice(2), { book: b }); return; }
  ({ read: () => Reader.open(b.id), edit: () => openEdit(b), export: () => openExport({ book: b }), download: () => downloadOriginal(b), delete: () => deleteBook(b) })[btn.dataset.mact]();
});

async function downloadOriginal(b) {
  const blob = await DB.file(b.id);
  if (!blob) { toast('The file for this book is missing.', 'err'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = b.fileName || (b.title + '.' + b.format);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function confirmBox(title, msg, ok = 'Delete') {
  const d = $('#confirmDlg');
  $('#cfTitle').textContent = title; $('#cfMsg').textContent = msg; $('#cfYes').textContent = ok;
  d.showModal();
  return new Promise(res => {
    const done = v => { d.close(); $('#cfYes').onclick = $('#cfNo').onclick = d.oncancel = null; res(v); };
    $('#cfYes').onclick = () => done(true); $('#cfNo').onclick = () => done(false); d.oncancel = () => done(false);
  });
}
async function deleteBook(b) {
  if (!await confirmBox(`Delete “${b.title}”?`, 'This removes the book, its reading progress and bookmarks from this browser. The original file on your computer is not touched.')) return false;
  await DB.del(b.id);
  books = books.filter(x => x.id !== b.id);
  if (Reader.cur && Reader.cur.book.id === b.id) await Reader.close();
  render(); updateStorage();
  toast(`Deleted “${b.title}”`);
  return true;
}

/* edit dialog */
let editing = null, editCover;
function openEdit(b) {
  editing = b; editCover = b.cover;
  const f = $('#editForm');
  f.title.value = b.title; f.author.value = b.author || ''; f.status.value = b.status;
  f.tags.value = (b.tags || []).join(', '); f.notes.value = b.notes || '';
  $('#edInfo').textContent = `${b.format.toUpperCase()} · ${fmtBytes(b.size || 0)} · ${b.fileName} · added ${fmtDate(b.addedAt)}${b.lastOpened ? ' · last read ' + fmtDate(b.lastOpened) : ''}`;
  paintEditCover();
  $('#editDlg').showModal();
}
function paintEditCover() {
  const f = $('#editForm');
  $('#edCover').innerHTML = coverHTML({ cover: editCover, title: f.title.value || editing.title, author: f.author.value });
}
$('#editForm').title.addEventListener('input', () => { if (!editCover) paintEditCover(); });
$('#edCoverBtn').onclick = () => $('#coverInput').click();
$('#coverInput').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const t = await makeThumb(f, 480);
  if (t) { editCover = t; paintEditCover(); } else toast('That image could not be read.', 'err');
};
$('#edCoverRemove').onclick = () => { editCover = null; paintEditCover(); };
$('#edDelete').onclick = async () => { const b = editing; $('#editDlg').close(); if (!await deleteBook(b)) openEdit(b); };
$('#editForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, b = editing;
  b.title = f.title.value.trim() || b.title;
  b.author = f.author.value.trim();
  b.status = f.status.value;
  b.tags = [...new Set(f.tags.value.split(',').map(t => t.trim()).filter(Boolean))];
  b.notes = f.notes.value;
  b.cover = editCover;
  b.updatedAt = Date.now();
  await saveNow(b);
  $('#editDlg').close();
  render();
  if (Reader.cur && Reader.cur.book.id === b.id) Reader.paintHeader();
  toast('Saved');
});
$$('dialog [data-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));

/* =========================================================================
   Export to PDF
   ========================================================================= */
let ex = null;
const exDlg = $('#exportDlg'), exFrame = $('#exFrame');
function exOptions() {
  return { size: $('#exSize').value, margin: $('#exMargin').value, scale: +$('#exScale').value, breaks: $('#exBreaks').checked, cover: $('#exCover').checked, toc: $('#exToc').checked };
}
function optCss(o) {
  const size = { a4: 'A4', letter: 'letter', a5: 'A5', legal: 'legal', trade: '6in 9in' }[o.size];
  const margin = { none: '0', narrow: '10mm 10mm', normal: '18mm 17mm', wide: '25mm 23mm' }[o.margin];
  const pageH = { a4: 297, letter: 279.4, a5: 210, legal: 355.6, trade: 228.6 }[o.size];
  const coverH = pageH - 2 * { none: 0, narrow: 10, normal: 18, wide: 25 }[o.margin] - 6;
  return `@page{size:${size};margin:${margin}}
@media print{.gen-cover img{width:100%;height:${coverH}mm;max-height:none;object-fit:contain}}
html{font-size:${o.scale}% !important}
${o.breaks ? '.epub-chapter+.epub-chapter{break-before:page}' : ''}
${o.cover ? '' : '.gen-cover{display:none !important}'}
${o.toc ? '' : '.gen-toc{display:none !important}'}`;
}
function applyExportOptions() {
  $('#exScaleOut').textContent = $('#exScale').value + '%';
  const d = exFrame.contentDocument;
  const st = d && d.getElementById('opt-css');
  if (st) st.textContent = optCss(exOptions());
}
['exSize', 'exMargin', 'exScale', 'exBreaks', 'exCover', 'exToc'].forEach(id => $('#' + id).addEventListener('input', applyExportOptions));

async function openExport({ book, file }) {
  if (!libsOk(['JSZip'])) return;
  const name = book ? book.title : titleFromName(file.name);
  $('#exTitle').textContent = `Export “${name}” to PDF`;
  $('#exGo').disabled = true;
  const status = $('#exStatus'); status.hidden = false; status.textContent = 'Preparing…';
  exFrame.removeAttribute('srcdoc');
  if (!exDlg.open) exDlg.showModal();
  const myRun = ex = { p: null };
  try {
    let format, buf;
    if (book) { format = book.format; const blob = await DB.file(book.id); if (!blob) throw new Error('The file for this book is missing.'); buf = await blob.arrayBuffer(); }
    else { format = await detectFormat(file); buf = await file.arrayBuffer(); }
    if (format === 'pdf') { exDlg.close(); toast('That file is already a PDF.'); if (book) downloadOriginal(book); return; }
    if (!format) throw new Error('Unsupported file type.');
    const step = t => { if (ex === myRun) status.textContent = t; };
    const p = format === 'epub' ? await epubPrintable(buf, step) : await mobiPrintable(buf, step);
    if (ex !== myRun) { p.revoke(); return; }
    myRun.p = p;
    myRun.title = (book && book.title) || p.title || name;
    $('#exCoverRow').classList.toggle('dis', !p.coverUrl); $('#exCover').disabled = !p.coverUrl;
    $('#exTocRow').classList.toggle('dis', !p.toc.length); $('#exToc').disabled = !p.toc.length;
    step('Rendering preview…');
    await new Promise(res => { exFrame.onload = res; exFrame.srcdoc = printableHtml({ ...p, title: myRun.title }); });
    applyExportOptions();
    status.hidden = true;
    $('#exGo').disabled = false;
  } catch (e) {
    console.error(e);
    status.textContent = 'Could not convert this book: ' + (e.message || e);
  }
}
$('#exGo').onclick = async () => {
  const w = exFrame.contentWindow, d = exFrame.contentDocument;
  if (!w || !d) return;
  const btn = $('#exGo'); btn.disabled = true;
  await Promise.all([...d.images].map(img => img.complete ? null : img.decode().catch(() => { })));
  try { await d.fonts.ready; } catch { }
  const oldTitle = document.title;
  document.title = (ex && ex.title) || oldTitle;
  w.focus();
  w.print();
  document.title = oldTitle;
  btn.disabled = false;
};
exDlg.addEventListener('close', () => {
  if (ex && ex.p) ex.p.revoke();
  ex = null; exFrame.removeAttribute('srcdoc');
});

/* =========================================================================
   Reader
   ========================================================================= */
const THEME_COLORS = { light: { bg: '#fffdf8', fg: '#1f1b16', link: '#9a3b1f' }, sepia: { bg: '#f4ead5', fg: '#4a3826', link: '#8a4a1c' }, dark: { bg: '#1c1916', fg: '#e4ddd2', link: '#eaa07c' } };
const FONT_STACK = { serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif', sans: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };
function contentThemeCss(t) {
  const c = THEME_COLORS[t] || THEME_COLORS.light;
  let css = `html,body{background:${c.bg} !important}body{color:${c.fg}}`;
  if (t === 'sepia') css += `body{color:${c.fg} !important}`;
  if (t === 'dark') css += `body,body *{color:${c.fg} !important;background-color:transparent !important;border-color:#4a423a !important}a,a *{color:${c.link} !important}img{opacity:.92}`;
  return css;
}

const EpubReader = {
  async open(book, buf, stage, R) {
    if (!libsOk(['JSZip', 'ePub'])) throw new Error('The EPUB reader library is not available.');
    const ebook = ePub(buf);
    stage.innerHTML = '<div class="epub-host"></div>';
    const view = stage.firstChild;
    let rendition, locReady = false, flat = [], current = null;
    const styleCss = () => contentThemeCss(settings.rtheme);
    const findChapter = href => {
      if (!href) return '';
      const base = href.split('#')[0].split('/').pop();
      let hit = '';
      for (const t of flat) if (t.target && t.target.split('#')[0].split('/').pop() === base) { hit = t.label; break; }
      return hit;
    };
    const onReloc = loc => {
      if (!loc || !loc.start) return;
      current = loc;
      const cfi = loc.start.cfi;
      let pct = book.progress && book.progress.percent || 0;
      if (locReady) pct = ebook.locations.percentageFromCfi(cfi) || 0;
      if (loc.atEnd) pct = 1;
      const ch = findChapter(loc.start.href);
      R.progress(cfi, pct, `${ch ? ch + ' · ' : ''}${Math.round(pct * 100)}%`);
    };
    const applyFont = () => {
      rendition.themes.fontSize(settings.fontSize + '%');
      if (settings.font !== 'original') rendition.themes.font(FONT_STACK[settings.font]);
    };
    const make = async (target) => {
      if (rendition) rendition.destroy();
      view.innerHTML = '';
      const scroll = settings.flow === 'scroll';
      rendition = ebook.renderTo(view, { width: '100%', height: '100%', spread: scroll ? 'none' : 'auto', flow: scroll ? 'scrolled' : 'paginated', manager: scroll ? 'continuous' : 'default', allowScriptedContent: false });
      rendition.hooks.content.register(contents => {
        const s = contents.document.createElement('style');
        s.id = 'shelf-theme'; s.textContent = styleCss();
        contents.document.head.appendChild(s);
        if (settings.font !== 'original') {
          const f = contents.document.createElement('style');
          f.id = 'shelf-font'; f.textContent = `body,body p,body div,body span{font-family:${FONT_STACK[settings.font]} !important}`;
          contents.document.head.appendChild(f);
        }
      });
      applyFont();
      rendition.on('relocated', onReloc);
      rendition.on('keydown', e => R.key(e));
      try { await rendition.display(target || undefined); }
      catch (e) { console.warn('display failed, starting at beginning', e); await rendition.display(); }
    };
    await make(book.progress && book.progress.loc);
    ebook.loaded.navigation.then(nav => {
      const walk = (items, depth) => items.forEach(it => { flat.push({ label: (it.label || '').trim(), target: it.href, depth }); if (it.subitems && it.subitems.length) walk(it.subitems, depth + 1); });
      walk(nav.toc || [], 0);
      R.setToc(flat);
    }).catch(() => R.setToc([]));
    ebook.ready.then(async () => {
      try {
        if (book.epubLocations) ebook.locations.load(book.epubLocations);
        else { await ebook.locations.generate(1600); book.epubLocations = ebook.locations.save(); saveSoon(book); }
        locReady = true;
        if (current) onReloc(current);
      } catch (e) { console.warn('locations', e); }
    });
    return {
      toc: flat,
      next: () => rendition.next(),
      prev: () => rendition.prev(),
      goTo: t => rendition.display(t),
      seek: f => { if (locReady) rendition.display(ebook.locations.cfiFromPercentage(f)); else toast('Still measuring the book — try again in a moment.'); },
      here: () => current && current.start ? { loc: current.start.cfi, pct: locReady ? ebook.locations.percentageFromCfi(current.start.cfi) : (book.progress.percent || 0), label: findChapter(current.start.href) } : null,
      setTheme: () => rendition.getContents().forEach(c => { const s = c.document.getElementById('shelf-theme'); if (s) s.textContent = styleCss(); }),
      setFontSize: () => rendition.themes.fontSize(settings.fontSize + '%'),
      setFont: () => make(current && current.start && current.start.cfi),
      setFlow: () => make(current && current.start && current.start.cfi),
      destroy: () => { try { rendition.destroy(); ebook.destroy(); } catch { } },
    };
  },
};

const PdfReader = {
  async open(book, buf, stage, R) {
    if (!libsOk(['pdfjsLib'])) throw new Error('The PDF reader library is not available.');
    const pdf = await openPdf(buf, book.title);
    const N = pdf.numPages;
    const v1 = (await pdf.getPage(1)).getViewport({ scale: 1 });
    const sizes = []; sizes[1] = { w: v1.width, h: v1.height };
    stage.innerHTML = '<div class="pdf-scroll"><div class="pdf-pages"></div></div>';
    const scroller = stage.firstChild, wrap = scroller.firstChild;
    scroller.style.position = 'absolute';
    const pages = [null];
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= N; i++) { const d = document.createElement('div'); d.className = 'pdf-page'; d.dataset.n = i; d.innerHTML = `<span class="pdf-num">${i}</span>`; frag.appendChild(d); pages.push(d); }
    wrap.appendChild(frag);
    let scale = 1, gen = 0, cur = 1;
    const tasks = new Map();
    const calcScale = () => settings.pdfZoom === 'fit' ? Math.max(0.25, Math.min((scroller.clientWidth - 40) / v1.width, 3)) : settings.pdfZoom;
    const size = n => sizes[n] || sizes[1];
    const cancel = n => { const t = tasks.get(n); if (t) { t.cancel(); tasks.delete(n); } };
    const unrender = n => { cancel(n); const c = pages[n].querySelector('canvas'); if (c) { c.width = c.height = 0; c.remove(); } pages[n].dataset.r = ''; };
    async function renderPage(n) {
      const d = pages[n];
      if (d.dataset.r) return;
      d.dataset.r = '1';
      const my = gen;
      try {
        const page = await pdf.getPage(n);
        if (my !== gen || !d.dataset.r) return;
        const base = page.getViewport({ scale: 1 });
        if (!sizes[n] || sizes[n].w !== base.width || sizes[n].h !== base.height) {
          sizes[n] = { w: base.width, h: base.height };
          d.style.width = base.width * scale + 'px'; d.style.height = base.height * scale + 'px';
        }
        const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 3);
        const vp = page.getViewport({ scale: scale * ratio });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
        tasks.set(n, task);
        await task.promise;
        tasks.delete(n);
        if (my !== gen || !d.dataset.r) return;
        const old = d.querySelector('canvas'); if (old) old.remove();
        d.appendChild(canvas);
      } catch (e) {
        if (!e || e.name !== 'RenderingCancelledException') console.warn(e);
        if (my === gen) d.dataset.r = '';
      }
    }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      const n = +e.target.dataset.n;
      if (e.isIntersecting) renderPage(n); else if (e.target.dataset.r) unrender(n);
    }), { root: scroller, rootMargin: '150% 0px' });
    const zoomLabel = () => R.setZoomLabel(settings.pdfZoom === 'fit' ? 'Fit' : Math.round(scale * 100) + '%');
    function layout() {
      const keep = cur;
      scale = calcScale(); gen++;
      for (let i = 1; i <= N; i++) { unrender(i); const s = size(i); pages[i].style.width = s.w * scale + 'px'; pages[i].style.height = s.h * scale + 'px'; }
      io.disconnect(); for (let i = 1; i <= N; i++) io.observe(pages[i]);
      goTo(keep); zoomLabel();
    }
    function goTo(n) { n = Math.max(1, Math.min(N, Math.round(+n) || 1)); scroller.scrollTop = pages[n].offsetTop - 14; cur = n; report(); }
    function report() { R.progress(cur, N > 1 ? (cur - 1) / (N - 1) : 1, `Page ${cur} of ${N}`); }
    const onScroll = throttle(() => {
      const y = scroller.scrollTop + scroller.clientHeight * 0.3;
      let lo = 1, hi = N;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pages[mid].offsetTop <= y) lo = mid; else hi = mid - 1; }
      if (lo !== cur) { cur = lo; report(); }
    }, 100);
    scroller.addEventListener('scroll', onScroll);
    let lastW = scroller.clientWidth;
    const ro = new ResizeObserver(debounce(() => { if (settings.pdfZoom === 'fit' && Math.abs(scroller.clientWidth - lastW) > 4) { lastW = scroller.clientWidth; layout(); } }, 200));
    ro.observe(scroller);
    cur = Math.max(1, Math.min(N, +(book.progress && book.progress.loc) || 1));
    layout();
    (async () => {
      const out = [];
      try {
        const ol = await pdf.getOutline();
        const walk = async (items, depth) => {
          for (const it of items || []) {
            let target = null;
            try {
              let dest = it.dest;
              if (typeof dest === 'string') dest = await pdf.getDestination(dest);
              if (Array.isArray(dest) && dest[0] != null) target = typeof dest[0] === 'object' ? (await pdf.getPageIndex(dest[0])) + 1 : (Number.isInteger(dest[0]) ? dest[0] + 1 : null);
            } catch { }
            out.push({ label: it.title, target, depth });
            if (it.items && it.items.length) await walk(it.items, depth + 1);
          }
        };
        await walk(ol, 0);
      } catch { }
      R.setToc(out);
    })();
    const steps = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    return {
      next: () => goTo(cur + 1), prev: () => goTo(cur - 1),
      goTo, seek: f => goTo(1 + Math.round(f * (N - 1))),
      here: () => ({ loc: cur, pct: N > 1 ? (cur - 1) / (N - 1) : 1, label: `Page ${cur}` }),
      zoom(dir) {
        if (dir === 'fit') settings.pdfZoom = 'fit';
        else {
          const s = scale;
          settings.pdfZoom = dir === 'in' ? (steps.find(x => x > s + 0.01) || 3) : ([...steps].reverse().find(x => x < s - 0.01) || 0.5);
        }
        saveSettings(); layout();
      },
      setTheme() { }, setFontSize() { }, setFont() { }, setFlow() { },
      destroy() { io.disconnect(); ro.disconnect(); gen++; tasks.forEach(t => t.cancel()); pdf.destroy(); },
    };
  },
};

const MobiReader = {
  async open(book, buf, stage, R) {
    const p = await mobiPrintable(buf);
    stage.innerHTML = '<iframe class="mobi-frame" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="Book text"></iframe>';
    const fr = stage.firstChild;
    const readerCss = () => {
      const c = THEME_COLORS[settings.rtheme] || THEME_COLORS.light;
      return `html{font-size:${settings.fontSize}% !important;background:${c.bg} !important}
body{max-width:38em !important;margin:0 auto !important;padding:48px 28px 40vh !important;box-shadow:none !important;background:${c.bg} !important;color:${c.fg} !important;line-height:1.65;${settings.font !== 'original' ? `font-family:${FONT_STACK[settings.font]} !important;` : ''}}
${settings.font !== 'original' ? `body *{font-family:inherit !important}` : ''}
body *{color:inherit !important}
a,a *{color:${c.link} !important}
.mbp-pagebreak{border-top:1px solid ${settings.rtheme === 'dark' ? '#3a332c' : '#e4dac7'} !important;margin:3em 0 !important;height:0}
.gen-cover{text-align:center;margin-bottom:3em}.gen-cover img{max-height:80vh}
img{max-width:100%;height:auto}`;
    };
    await new Promise(res => { fr.onload = res; fr.srcdoc = printableHtml(p, `<style id="shelf-reader">${readerCss()}</style>`); });
    const d = fr.contentDocument, w = fr.contentWindow;
    const se = d.scrollingElement || d.documentElement;
    const maxScroll = () => Math.max(1, se.scrollHeight - w.innerHeight);
    const frac = () => Math.min(1, se.scrollTop / maxScroll());
    const toc = [];
    $$('h1,h2,h3', d).forEach((h, i) => {
      const label = h.textContent.replace(/\s+/g, ' ').trim();
      if (!label) return;
      if (!h.id) h.id = 'shelf-h' + i;
      toc.push({ label: label.slice(0, 90), target: '#' + h.id, depth: +h.tagName[1] - 1 });
    });
    R.setToc(toc);
    const report = () => { const f = frac(); R.progress(f, f, `${Math.round(f * 100)}%`); };
    await Promise.all([...d.images].map(i => i.complete ? null : i.decode().catch(() => { })));
    const start = +(book.progress && book.progress.loc) || 0;
    se.scrollTop = start * maxScroll();
    report();
    w.addEventListener('scroll', throttle(report, 150));
    d.addEventListener('keydown', e => R.key(e));
    d.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a) return;
      const h = a.getAttribute('href');
      if (h.startsWith('#')) { e.preventDefault(); const t = d.getElementById(h.slice(1)); if (t) t.scrollIntoView(); }
      else if (isExternal(h)) a.target = '_blank';
    });
    const keepPos = fn => { const f = frac(); fn(); se.scrollTop = f * maxScroll(); };
    return {
      next: () => se.scrollBy({ top: w.innerHeight * 0.9, behavior: 'smooth' }),
      prev: () => se.scrollBy({ top: -w.innerHeight * 0.9, behavior: 'smooth' }),
      goTo: t => { if (typeof t === 'string' && t.startsWith('#')) { const el = d.getElementById(t.slice(1)); if (el) el.scrollIntoView(); } else se.scrollTop = (+t || 0) * maxScroll(); },
      seek: f => { se.scrollTop = f * maxScroll(); },
      here: () => { const f = frac(); let label = ''; for (const t of toc) { const el = d.getElementById(t.target.slice(1)); if (el && el.offsetTop <= se.scrollTop + 40) label = t.label; } return { loc: f, pct: f, label }; },
      setTheme: () => { d.getElementById('shelf-reader').textContent = readerCss(); },
      setFontSize: () => keepPos(() => { d.getElementById('shelf-reader').textContent = readerCss(); }),
      setFont: () => keepPos(() => { d.getElementById('shelf-reader').textContent = readerCss(); }),
      setFlow() { },
      destroy: () => p.revoke(),
    };
  },
};

const Reader = {
  cur: null, toc: [], tab: 'toc', baseTitle: document.title,
  el: $('#reader'),
  async open(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    if (this.cur) await this.close(true);
    this.cur = { book, impl: null };
    this.toc = [];
    const R = this.el;
    R.hidden = false; R.dataset.kind = book.format; R.dataset.rt = settings.rtheme;
    document.body.style.overflow = 'hidden';
    this.paintHeader(); this.paintControls(); this.closeDrawer();
    $('#rRange').value = (book.progress && book.progress.percent || 0) * 1000;
    $('#rLabel').textContent = '';
    const stage = $('#rStage');
    stage.innerHTML = '<div class="r-loading">Opening…</div>';
    try {
      const blob = await DB.file(id);
      if (!blob) throw new Error('The file for this book is missing from storage.');
      const buf = await blob.arrayBuffer();
      book.lastOpened = Date.now();
      if (book.status === 'unread') book.status = 'reading';
      saveSoon(book, 0);
      const impl = await ({ epub: EpubReader, pdf: PdfReader, mobi: MobiReader }[book.format]).open(book, buf, stage, this);
      if (!this.cur || this.cur.book !== book) { impl.destroy(); return; }
      this.cur.impl = impl;
    } catch (e) {
      console.error(e);
      if (this.cur && this.cur.book === book) stage.innerHTML = `<div class="r-error"><div><b>Couldn't open this book</b>${esc(e.message || String(e))}</div></div>`;
    }
  },
  async close(switching) {
    if (!this.cur) return;
    const { book, impl } = this.cur;
    this.cur = null;
    try { impl && impl.destroy(); } catch { }
    await saveNow(book);
    $('#rStage').innerHTML = '';
    if (!switching) { this.el.hidden = true; document.body.style.overflow = ''; document.title = this.baseTitle; render(); }
  },
  paintHeader() {
    const b = this.cur.book;
    $('#rTitle').textContent = b.title; $('#rAuthor').textContent = b.author || '';
    document.title = b.title + ' — Shelf';
  },
  paintControls() {
    $('#rFontVal').textContent = settings.fontSize + '%';
    $('#rFont').value = settings.font;
    $('#rFlow').textContent = settings.flow === 'scroll' ? 'Scroll' : 'Pages';
    $$('#rThemes .swatch').forEach(s => s.classList.toggle('on', s.dataset.rt === settings.rtheme));
    this.setZoomLabel(settings.pdfZoom === 'fit' ? 'Fit' : Math.round(settings.pdfZoom * 100) + '%');
  },
  setZoomLabel(t) { $('#rZoomVal').textContent = t; },
  progress(loc, pct, label) {
    if (!this.cur) return;
    const b = this.cur.book;
    b.progress = { loc, percent: Math.max(0, Math.min(1, pct || 0)) };
    if (document.activeElement !== $('#rRange')) $('#rRange').value = b.progress.percent * 1000;
    $('#rLabel').textContent = label || '';
    saveSoon(b);
  },
  setToc(list) { this.toc = list; if (this.tab === 'toc' && $('#rDrawer').classList.contains('open')) this.paintDrawer(); },
  openDrawer(tab) {
    this.tab = tab || this.tab;
    this.paintDrawer();
    $('#rDrawer').classList.add('open'); $('#rScrim').hidden = false;
  },
  closeDrawer() { $('#rDrawer').classList.remove('open'); $('#rScrim').hidden = true; },
  paintDrawer() {
    $$('.r-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    const list = $('#rList');
    if (!this.cur) { list.innerHTML = ''; return; }
    const b = this.cur.book;
    if (this.tab === 'toc') {
      list.innerHTML = this.toc.length
        ? this.toc.map((t, i) => `<button class="r-item" data-toc="${i}" style="padding-left:${10 + t.depth * 16}px"${t.target == null ? ' disabled' : ''}>${esc(t.label || 'Untitled')}</button>`).join('')
        : '<div class="r-empty">This book has no table of contents.</div>';
    } else if (this.tab === 'marks') {
      const marks = b.bookmarks || [];
      list.innerHTML = marks.length
        ? marks.map((m, i) => `<div class="r-item" role="button" tabindex="0" data-mark="${i}">${icon('bookmark', 16)}<span>${esc(m.label || 'Bookmark')}<small>${Math.round((m.pct || 0) * 100)}% · ${fmtDate(m.at)}</small></span><button class="x" data-unmark="${i}" title="Remove bookmark">${icon('x', 14)}</button></div>`).join('')
        : `<div class="r-empty">No bookmarks yet.<br>Use the ${icon('bookmark', 14).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-2px"')} button to save your place.</div>`;
    } else {
      const all = [...books].sort((x, y) => (y.lastOpened || 0) - (x.lastOpened || 0) || x.title.localeCompare(y.title));
      list.innerHTML = all.map(x => `<button class="r-item ${x.id === b.id ? 'cur' : ''}" data-open="${x.id}"><span class="mini">${coverHTML(x)}</span><span>${esc(x.title)}<small>${esc(x.author || x.format.toUpperCase())} · ${statusText(x)}</small></span></button>`).join('');
    }
  },
  addBookmark() {
    if (!this.cur || !this.cur.impl) return;
    const h = this.cur.impl.here(); if (!h) return;
    const b = this.cur.book;
    b.bookmarks = b.bookmarks || [];
    if (b.bookmarks.some(m => String(m.loc) === String(h.loc))) { toast('This spot is already bookmarked'); return; }
    b.bookmarks.push({ loc: h.loc, pct: h.pct, label: h.label || `${Math.round(h.pct * 100)}% through`, at: Date.now() });
    b.bookmarks.sort((x, y) => (x.pct || 0) - (y.pct || 0));
    saveNow(b);
    toast('Bookmark added');
    if ($('#rDrawer').classList.contains('open')) this.paintDrawer();
  },
  key(e) {
    if (!this.cur || !this.cur.impl) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    if (e.key === 'ArrowRight') { e.preventDefault && e.preventDefault(); this.cur.impl.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault && e.preventDefault(); this.cur.impl.prev(); }
    else if (e.key === 'Escape') { if ($('#rDrawer').classList.contains('open')) this.closeDrawer(); else this.close(); }
  },
};

/* reader controls */
const impl = () => Reader.cur && Reader.cur.impl;
$('#rBack').onclick = () => Reader.close();
$('#rToc').onclick = () => $('#rDrawer').classList.contains('open') && Reader.tab !== 'lib' ? Reader.closeDrawer() : Reader.openDrawer(Reader.tab === 'lib' ? 'toc' : Reader.tab);
$('#rLib').onclick = () => $('#rDrawer').classList.contains('open') && Reader.tab === 'lib' ? Reader.closeDrawer() : Reader.openDrawer('lib');
$('#rScrim').onclick = () => Reader.closeDrawer();
$$('.r-tabs button').forEach(b => b.onclick = () => { Reader.tab = b.dataset.tab; Reader.paintDrawer(); });
$('#rList').addEventListener('click', e => {
  const un = e.target.closest('[data-unmark]');
  if (un) { const b = Reader.cur.book; b.bookmarks.splice(+un.dataset.unmark, 1); saveNow(b); Reader.paintDrawer(); return; }
  const t = e.target.closest('[data-toc]'), m = e.target.closest('[data-mark]'), o = e.target.closest('[data-open]');
  if (t && impl()) { const item = Reader.toc[+t.dataset.toc]; if (item && item.target != null) impl().goTo(item.target); Reader.closeDrawer(); }
  else if (m && impl()) { impl().goTo(Reader.cur.book.bookmarks[+m.dataset.mark].loc); Reader.closeDrawer(); }
  else if (o) { if (o.dataset.open !== Reader.cur.book.id) Reader.open(o.dataset.open); else Reader.closeDrawer(); }
});
$('#rPrev').onclick = () => impl() && impl().prev();
$('#rNext').onclick = () => impl() && impl().next();
$('#rRange').addEventListener('change', e => impl() && impl().seek(+e.target.value / 1000));
$('#rMark').onclick = () => Reader.addBookmark();
$('#rExport').onclick = () => Reader.cur && openExport({ book: Reader.cur.book });
const setFontSize = d => { settings.fontSize = Math.max(70, Math.min(200, settings.fontSize + d)); saveSettings(); Reader.paintControls(); impl() && impl().setFontSize(); };
$('#rFontDown').onclick = () => setFontSize(-10);
$('#rFontUp').onclick = () => setFontSize(10);
$('#rFont').onchange = e => { settings.font = e.target.value; saveSettings(); impl() && impl().setFont(); };
$('#rFlow').onclick = () => { settings.flow = settings.flow === 'scroll' ? 'paginated' : 'scroll'; saveSettings(); Reader.paintControls(); impl() && impl().setFlow(); };
$$('#rThemes .swatch').forEach(s => s.onclick = () => { settings.rtheme = s.dataset.rt; saveSettings(); Reader.el.dataset.rt = settings.rtheme; Reader.paintControls(); impl() && impl().setTheme(); });
$('#rZoomIn').onclick = () => impl() && impl().zoom && impl().zoom('in');
$('#rZoomOut').onclick = () => impl() && impl().zoom && impl().zoom('out');
$('#rZoomVal').onclick = () => impl() && impl().zoom && impl().zoom('fit');

/* =========================================================================
   Library events
   ========================================================================= */
if (IS_LIB) {
$('#btnAdd').onclick = () => $('#fileInput').click();
$('#btnFolder').onclick = () => $('#folderInput').click();
$('#empty').addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; (a.dataset.act === 'add' ? $('#fileInput') : $('#folderInput')).click(); });
$('#fileInput').onchange = e => { const f = [...e.target.files]; e.target.value = ''; importFiles(f); };
$('#folderInput').onchange = e => { const f = [...e.target.files]; e.target.value = ''; importFiles(f); };
$('#q').addEventListener('input', debounce(render, 120));
$('#chips').addEventListener('click', e => { const c = e.target.closest('[data-status]'); if (c) { ui.status = c.dataset.status; render(); } });
$('#fmtFilter').onchange = e => { ui.format = e.target.value; render(); };
$('#sortSel').onchange = e => { settings.sort = e.target.value; saveSettings(); render(); };
$$('.seg button').forEach(b => b.onclick = () => { settings.view = b.dataset.view; saveSettings(); render(); });
$('#books').addEventListener('click', e => {
  const tag = e.target.closest('[data-tag]');
  if (tag) { $('#q').value = tag.dataset.tag; render(); return; }
  const act = e.target.closest('[data-act]'); if (!act) return;
  const b = books.find(x => x.id === act.closest('.book').dataset.id); if (!b) return;
  if (act.dataset.act === 'read') Reader.open(b.id);
  else if (act.dataset.act === 'menu') { if (!menu.hidden && menu.dataset.id === b.id) closeMenu(); else openMenu(act, b); }
});
$('#books').addEventListener('contextmenu', e => { const card = e.target.closest('.book'); if (!card) return; e.preventDefault(); const b = books.find(x => x.id === card.dataset.id); if (b) openMenu(card.querySelector('[data-act="menu"]'), b); });

}
$('#convertInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) openExport({ file: f }); };
document.addEventListener('click', e => { $$('details.nav-tools[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });

const applyAppTheme = () => {
  if (settings.appTheme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = settings.appTheme;
};
if ($('#btnAppTheme')) $('#btnAppTheme').onclick = () => {
  const dark = settings.appTheme === 'dark' || (settings.appTheme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  settings.appTheme = dark ? 'light' : 'dark'; saveSettings(); applyAppTheme();
};

document.addEventListener('keydown', e => {
  if (!Reader.el.hidden) { if (!$('dialog[open]')) Reader.key(e); return; }
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { if ($('#q')) { e.preventDefault(); $('#q').focus(); } }
});

/* drag & drop */
let dragDepth = 0;
let dropHandler = IS_LIB ? importFiles : null;
const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
addEventListener('dragenter', e => { if (!hasFiles(e) || !dropHandler || $('dialog[open]')) return; e.preventDefault(); dragDepth++; $('#drop').hidden = false; });
addEventListener('dragover', e => { if (hasFiles(e) && dropHandler) e.preventDefault(); });
addEventListener('dragleave', e => { if (!hasFiles(e) || !dropHandler) return; if (--dragDepth <= 0) { dragDepth = 0; $('#drop').hidden = true; } });
addEventListener('drop', async e => {
  if (!hasFiles(e) || !dropHandler) return;
  e.preventDefault(); dragDepth = 0; $('#drop').hidden = true;
  const items = [...(e.dataTransfer.items || [])];
  const entries = items.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (entries.some(en => en.isDirectory)) {
    const files = [];
    const walk = async en => {
      if (en.isFile) { files.push(await new Promise((res, rej) => en.file(res, rej))); return; }
      const reader = en.createReader();
      for (;;) { const batch = await new Promise((res, rej) => reader.readEntries(res, rej)); if (!batch.length) break; for (const c of batch) await walk(c); }
    };
    for (const en of entries) await walk(en);
    dropHandler(files);
  } else dropHandler([...e.dataTransfer.files]);
});
addEventListener('beforeunload', () => { if (Reader.cur) DB.put(Reader.cur.book); });

/* public API for the tools module */
window.Shelf = {
  $, $$, esc, icon, hydrateIcons, toast, libsOk, sleep, fmtBytes, titleFromName, uid, throttle, debounce,
  DB, settings, saveSettings, openPdf, detectFormat, importFiles, openExport, confirmBox, IS_LIB,
  get books() { return books; },
  setDropHandler(fn, label) { dropHandler = fn; if (label) $('#drop div').textContent = label; },
};

/* =========================================================================
   Boot
   ========================================================================= */
(async () => {
  hydrateIcons();
  applyAppTheme();
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  try { await DB.open(); books = await DB.all(); }
  catch (e) { console.error(e); toast('This browser blocked local storage, so books can’t be saved. Try a normal (non-private) window.', 'err', 8000); }
  render(); updateStorage();
})();
})();
