// Extraction: merges index.html (Meta) + index-3.html (Google) into structured data files.
// Run: node extract.mjs   (reads ../user/files/, writes data/*.js)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const FILES = path.join(__dir, '..', 'user', 'files');
const OUT = path.join(__dir, 'data');
const gsrc = fs.readFileSync(path.join(FILES, 'index-3.html'), 'utf8');
const msrc = fs.readFileSync(path.join(FILES, 'index.html'), 'utf8');

// ---------- generic const-grabber ----------
function grab(src, name) {
  let i = src.indexOf('const ' + name);
  if (i < 0) { i = src.indexOf('let ' + name); if (i < 0) return null; }
  let j = src.indexOf('=', i) + 1;
  const s = src.slice(j).trimStart();
  const open = s[0], close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, q = '', esc = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return s.slice(0, k + 1); }
  }
  return null;
}
// ---------- statement extractor: from `start` to the terminating `;` at depth 0.
// Handles (),{},[], '...', "..." and `...${...}` nesting. ---------------------
function extractStmt(src, start) {
  let i = start, depth = 0, mode = null, esc = false;
  const tplStack = [];
  const isFuncDecl = /^\s*function\b/.test(src.slice(start, start + 12));
  let sawDepth = false;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (mode) {
      if (esc) { esc = false; i++; continue; }
      if (c === '\\') { esc = true; i++; continue; }
      if (mode === '`' && c === '$' && n === '{') { tplStack.push(depth); depth++; i += 2; continue; }
      if (c === mode) { mode = null; i++; continue; }
      i++; continue;
    }
    if (c === "'" || c === '"' || c === '`') { mode = c; i++; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; sawDepth = true; i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (tplStack.length && depth - 1 === tplStack[tplStack.length - 1]) {
        tplStack.pop(); depth--; mode = '`'; i++; continue; // closes ${...}
      }
      depth--; i++; continue;
    }
    if (c === ';' && depth === 0 && !tplStack.length) { i++; break; }
    if (isFuncDecl && sawDepth && depth === 0 && !tplStack.length && !mode) break;
    i++;
  }
  return src.slice(start, i);
}
const GSTUB = {
  // real implementations, copied from the source course file
  T: (x, y, s, w, a, c) => `<text x="${x}" y="${y}" font-size="${s || 13}" ${w ? 'font-weight="500"' : ''} text-anchor="${a || 'start'}" style="fill:var(--${c || 'ink'});font-family:var(--hd)">`,
  TITLES: [], COLS: [], L: [],
};
GSTUB.box = (x, y, w, h, f, s, tx, t2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" style="fill:var(--${f});stroke:var(--${s});stroke-width:2"/>${GSTUB.T(x + w / 2, y + h / 2 + (t2 ? -3 : 5), 14, 1, 'middle', f === 'g-yellow' ? 'on-y' : '')}${tx}</text>${t2 ? GSTUB.T(x + w / 2, y + h / 2 + 15, 12, 0, 'middle', f === 'g-yellow' ? 'on-y' : '') + t2 + '</text>' : ''}`;
const GNAMES = Object.keys(GSTUB);
const geval = code => new Function(...GNAMES, 'return (' + code + ')')(...GNAMES.map(n => GSTUB[n]));
const meval = code => new Function('return (' + code + ')')();

// ---------- tiny markdown: **bold**, *italic* ----------
function md(t) {
  let h = String(t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return h;
}
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ============================================================ GOOGLE
const GMODS = geval(grab(gsrc, 'MODULES'));
const GGLOS = geval(grab(gsrc, 'GLOSSARY'));
const GQA = geval(grab(gsrc, 'QA'));
const GTPL = geval(grab(gsrc, 'TEMPLATES'));
const GFIGRAW = geval(grab(gsrc, 'FIGURES'));
const GIX = geval(grab(gsrc, 'IXDATA'));

const gFigures = {};
for (const k of Object.keys(GFIGRAW)) {
  const f = GFIGRAW[k];
  if (f && f.id) gFigures[f.id] = { t: f.t || '', cap: f.cap || '', svg: f.__svg || f.svg || '' };
}

function gWidgetSource(ix) {
  // serialize widgets, keeping run() functions as source
  const parts = [];
  for (const [k, v] of Object.entries(ix)) {
    const c = { ...v };
    let runSrc = null;
    if (typeof c.run === 'function') { runSrc = c.run.toString().replace(/^run\s*\(/, 'function('); delete c.run; }
    let s = JSON.stringify(c);
    if (runSrc) s = s.slice(0, -1) + ',"run":' + runSrc + '}';
    parts.push(JSON.stringify(k) + ':' + s);
  }
  return '{' + parts.join(',') + '}';
}

const gModules = GMODS.map(m => ({
  id: m.id, n: m.n, title: m.title, sub: m.sub || '', intro: m.intro || '',
  sections: (m.sections || []).map(s => ({
    id: s.id, h: s.h,
    html: (s.p || []).map(p => '<p>' + md(p) + '</p>').join(''),
    callout: s.c ? { k: s.c.k || 'info', t: md(s.c.t || '') } : null,
    figure: s.f || null,   // figure id -> gFigures
    widget: s.w || null,   // widget id -> widgets
  })),
  takeaways: m.takeaways || [],
  action: m.action || '',
  quiz: (m.quiz || []).map(q => ({ q: q.q, opts: q.o, correct: q.a, explain: q.e || '' })),
  related: m.related || [],
}));

const GDATA = {
  meta: { course: 'google', title: 'Google Ads', tagline: 'From zero to hero', modules: gModules.length },
  modules: gModules,
  glossary: GGLOS.map(g => ({ t: g.t, d: g.d })),
  qa: GQA.map(q => ({ q: q.q, a: q.a })),
  templates: GTPL.map(t => ({ t: t.t, b: t.b })),
  figures: gFigures,
};
const gWidgetsSrc = gWidgetSource(GIX);

fs.writeFileSync(path.join(OUT, 'google.js'),
  '/* Muraqba Academy — Google Ads course data (extracted from course file, content unchanged) */\n' +
  'const GDATA = ' + JSON.stringify(GDATA) + ';\n' +
  'const COLS = ["blue","red","yellow","green"]; /* palette used by widget simulators */\n' +
  'const GWIDGETS = ' + gWidgetsSrc + ';\n');

// ============================================================ META
const PAGES = meval(grab(msrc, 'PAGES'));
const MTITLES = meval(grab(msrc, 'TITLES'));
const MQUIZ = meval(grab(msrc, 'QUIZZES'));
const MIDS = meval(grab(msrc, 'MODULE_IDS'));
const MIX = meval(grab(msrc, 'IXDATA'));

// strip chrome + sanitize a module page body
function sanitizeMeta(html, pageId) {
  let h = html;
  // remove header chrome
  h = h.replace(/<div class="mod-eyebrow">[\s\S]*?<\/div>\s*/, '');
  h = h.replace(/<div class="mod-header"[\s\S]*?<\/div>\s*(?=<div|<button|$)/, (m) => m.includes('<h1') ? '' : m);
  h = h.replace(/<button class="mark-done"[\s\S]*?<\/button>\s*/, '');
  h = h.replace(/<div class="quiz-trigger-wrap">[\s\S]*?<div class="quiz-block" id="quizBlock"><\/div>\s*/, '');
  h = h.replace(/<div class="mod-nav">[\s\S]*?<\/div>\s*/, '');
  h = h.replace(/<div class="site-footer">[\s\S]*?<\/div>\s*/, '');
  h = h.replace(/<span id="lessonPct"[^>]*>[\s\S]*?<\/span>/, '');
  // go('x') -> data-route
  h = h.replace(/onclick="go\('([^']+)'\)"/g, 'data-route="$1"');
  // drop remaining event handlers
  h = h.replace(/\s+on(click|input|change|submit)="[^"]*"/g, '');
  // prefix ids outside svg to avoid collisions
  const parts = h.split(/(<svg[\s\S]*?<\/svg>)/g);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(/\sid="([^"]+)"/g, ' data-oid="$1"');
  }
  // inside svg: prefix ids + url(#..) refs per figure instance
  for (let i = 1; i < parts.length; i += 2) {
    const tag = 'msvg' + pageId.replace(/[^a-z0-9]/gi, '') + i;
    parts[i] = parts[i]
      .replace(/\sid="([^"]+)"/g, ' id="' + tag + '-$1"')
      .replace(/url\(#([^)]+)\)/g, 'url(#' + tag + '-$1)')
      .replace(/aria-labelledby="([^"]+)"/g, (m, ids) => 'aria-labelledby="' + ids.split(/\s+/).map(x => tag + '-' + x).join(' ') + '"')
      .replace(/<title id=/g, '<title data-xid=');
  }
  return parts.join('').trim();
}

function metaAccent(html) {
  const m = html.match(/eyebrow-dot" style="background:([^";]+)/) || html.match(/h2-dot" style="background:([^";]+)/);
  return m ? m[1] : '#0081FB';
}

const mModules = MIDS.map((id, idx) => {
  const raw = PAGES[id] || '';
  const title = (MTITLES[id] || '').replace(/^\d+\.\s*/, '');
  const sub = (raw.match(/<div class="sub">([\s\S]*?)<\/div>/) || [])[1] || '';
  const body = sanitizeMeta(raw, id);
  const secCount = (body.match(/<div class="lesson-section"/g) || []).length;
  return {
    id, n: idx + 1, title, sub: sub.replace(/<[^>]+>/g, ''),
    accent: metaAccent(raw),
    quiz: (MQUIZ[id] || []).map(q => ({ q: q.q, opts: q.opts, correct: q.correct, explain: q.explain || '' })),
    secCount, body,
  };
});

// glossary
const gterms = [];
{
  const re = /<div class="gterm"><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g;
  let m; while ((m = re.exec(PAGES.glossary))) gterms.push({ t: m[1].trim(), d: m[2].trim() });
}
// advanced qa
const mqa = [];
{
  const re = /<div class="adv-q"><h3>([\s\S]*?)<\/h3>([\s\S]*?)<\/div>(?=\s*<div class="adv-q"|\s*$)/g;
  let m; while ((m = re.exec(PAGES['advanced-qa']))) mqa.push({ q: m[1].trim(), a: m[2].trim() });
}
// templates
const mtpl = [];
{
  const re = /<div class="tpl"><h2>([\s\S]*?)<\/h2><p>([\s\S]*?)<\/p><pre[^>]*>([\s\S]*?)<\/pre>/g;
  let m; while ((m = re.exec(PAGES.templates))) mtpl.push({ t: m[1].trim(), d: m[2].trim(), b: m[3].replace(/\\n/g, '\n').trim() });
}
// visuals -> figures
const mfigs = [];
{
  const re = /<figure class="fig"><div class="fig-t">([\s\S]*?)<\/div>(<svg[\s\S]*?<\/svg>)\s*(?:<figcaption>([\s\S]*?)<\/figcaption>)?\s*<\/figure>/g;
  let m, i = 0;
  while ((m = re.exec(PAGES.visuals))) {
    const tag = 'mfig' + (i++);
    const svg = m[2]
      .replace(/\sid="([^"]+)"/g, ' id="' + tag + '-$1"')
      .replace(/url\(#([^)]+)\)/g, 'url(#' + tag + '-$1)');
    mfigs.push({ t: m[1].trim(), cap: (m[3] || '').trim(), svg });
  }
}
// ix data-id -> figure title map (visual library anchors)
const mixMap = {};
for (const [k, v] of Object.entries(MIX)) mixMap[k] = v.title || k;

// ---- Meta interactive widget engine (verbatim source, block-scoped) ----
function grabHelper(src, marker, mustContain) {
  let idx = -1, from = 0;
  while (true) {
    const i = src.indexOf(marker, from);
    if (i < 0) break;
    const stmt = extractStmt(src, i);
    if (!mustContain || stmt.includes(mustContain)) return stmt;
    from = i + 1;
  }
  return null;
}
const mEngineParts = [];
for (const [marker, must] of [
  ['const qs=', 'querySelector'], ['const key=', 'onkeydown'], ['const f2=', 'toFixed'],
  ['const row=', 'ix-in'], ['const bar=', 'ix-bar'], ['const tile=', 'ix-tile'],
  ['function ixh(', 'ix-card'], ['function calcWrap(', 'ix-form'],
]) {
  const s = grabHelper(msrc, marker, must);
  if (!s) console.log('WARN: meta helper not found:', marker);
  else mEngineParts.push(s);
}
const mCalcAssigns = [];
{
  const re = /CALC\.([A-Za-z_$][\w$]*)\s*=/g;
  let m;
  while ((m = re.exec(msrc))) {
    const stmt = extractStmt(msrc, m.index);
    const rhs = stmt.slice(m[0].length).replace(/;\s*$/, '');
    mCalcAssigns.push('MCALC.' + m[1] + ' = ' + rhs + ';');
  }
}
const mEngineSrc = '/* Meta interactive widget engine — extracted verbatim from the course file, block-scoped */\n' +
  '{\n' + mEngineParts.join('\n') + '\nconst MCALC = {};\n' + mCalcAssigns.join('\n') +
  '\nwindow.__MCALC = MCALC;\nwindow.__MIXH = ixh;\n}';

const MDATA = {
  meta: { course: 'meta', title: 'Meta Ads', tagline: 'From zero to hero', modules: mModules.length },
  modules: mModules,
  glossary: gterms,
  qa: mqa,
  templates: mtpl,
  figures: mfigs,
  ixTitles: mixMap,
};

fs.writeFileSync(path.join(OUT, 'meta.js'),
  '/* Muraqba Academy — Meta Ads course data (extracted from course file, content unchanged) */\n' +
  'const MDATA = ' + JSON.stringify(MDATA) + ';\n' +
  'const MWIDGETS = ' + JSON.stringify(MIX) + ';\n' +
  mEngineSrc + '\n');

// ---------- report ----------
const rep = [];
rep.push('google modules: ' + gModules.length);
rep.push('google sections total: ' + gModules.reduce((a, m) => a + m.sections.length, 0));
rep.push('google figures: ' + Object.keys(gFigures).length + ' widgets: ' + Object.keys(GIX).length);
rep.push('google glossary: ' + GDATA.glossary.length + ' qa: ' + GQA.length + ' templates: ' + GTPL.length);
rep.push('meta modules: ' + mModules.length);
rep.push('meta sections total: ' + mModules.reduce((a, m) => a + m.secCount, 0));
rep.push('meta glossary: ' + gterms.length + ' qa: ' + mqa.length + ' templates: ' + mtpl.length + ' figures: ' + mfigs.length);
// verify every google widget/figure ref resolves
const missingW = new Set(), missingF = new Set();
for (const m of gModules) for (const s of m.sections) {
  if (s.widget && !GIX[s.widget]) missingW.add(s.widget);
  if (s.figure && !gFigures[s.figure]) missingF.add(s.figure);
}
rep.push('missing widget refs: ' + [...missingW].join(','));
rep.push('missing figure refs: ' + [...missingF].join(','));
// verify meta ix refs
const missingIx = new Set();
for (const m of mModules) {
  const re = /data-id="([^"]+)"/g; let mm;
  while ((mm = re.exec(m.body))) if (!mixMap[mm[1]]) missingIx.add(mm[1]);
}
rep.push('missing meta ix refs: ' + [...missingIx].join(','));
console.log(rep.join('\n'));
console.log('bytes google.js:', fs.statSync(path.join(OUT, 'google.js')).size);
console.log('bytes meta.js:', fs.statSync(path.join(OUT, 'meta.js')).size);
