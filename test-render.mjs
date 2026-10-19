// Render smoke test: executes app.js builders for EVERY view with stubbed DOM.
import fs from 'node:fs';

const elStub = () => ({ innerHTML: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, getAttribute() { return null; } });
global.document = {
  querySelector: () => elStub(), querySelectorAll: () => [],
  documentElement: { setAttribute() {}, getAttribute: () => 'google' },
  addEventListener() {}, readyState: 'complete', title: '',
  createElement: () => elStub(), body: elStub(), getElementById: () => null,
};
global.window = { addEventListener() {}, scrollTo() {} };
global.location = { hash: '#/' };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };
try { global.navigator = {}; } catch (e) {}

const gsrc = fs.readFileSync('data/google.js', 'utf8');
const msrc = fs.readFileSync('data/meta.js', 'utf8');
let appsrc = fs.readFileSync('assets/js/app.js', 'utf8');
// expose builders for testing (insert before the IIFE closes; stubs absorb boot side-effects)
const hook = '\n;global.__T={landingHTML,courseHomeHTML,googleModuleHTML,metaModuleHTML,widgetHTML,quizHTML,visualsHTML,templatesHTML,glossaryHTML,qaHTML,moduleDone,courseProgress,parseRoute,headerHTML,footerHTML,metaWidgetHTML,metaSectionsRaw,buildSearchIndex};\n';
appsrc = appsrc.replace(/}\)\(\);\s*$/, hook + '})();');

new Function(gsrc + '\n' + msrc + '\n' + appsrc)();

const T = global.__T;
const G = new Function(gsrc + ';return GDATA;')();
const M = new Function(msrc + ';return MDATA;')();
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', name, extra || ''); } };

// landing + headers/footers
const land = T.landingHTML();
ok('landing length', land.length > 1500, land.length);
ok('landing has no hero', !land.includes('ag-hero'));
ok('landing has no what-you-get', !land.includes('What you get'));
ok('landing has no why section', !land.includes('Who made this'));
ok('landing has 4 course cards', (land.match(/course-card/g) || []).length >= 4);
ok('landing has 2 soon cards', (land.match(/course-card soon/g) || []).length === 2);
ok('landing has no visual libraries section', !land.includes('id="visual-libraries"'));
ok('landing header has no visual libraries link', !T.headerHTML({ view: 'landing' }).includes('visual-libraries'));
ok('landing header', T.headerHTML({ view: 'landing' }).includes('Muraqba Academy'));

// every module page, both courses
for (const m of G.modules) {
  try {
    const h = T.googleModuleHTML(m, 'google');
    ok('g/' + m.id + ' renders', h.length > 3000, h.length);
    ok('g/' + m.id + ' has quiz', h.includes('data-quiz'));
    ok('g/' + m.id + ' has sec checks', (h.match(/sec-check/g) || []).length >= m.sections.length);
    ok('g/' + m.id + ' prev/next', h.includes('mp-nav'));
  } catch (e) { ok('g/' + m.id + ' throws', false, e.message); }
}
for (const m of M.modules) {
  try {
    const h = T.metaModuleHTML(m, 'meta');
    ok('m/' + m.id + ' renders', h.length > 3000, h.length);
    ok('m/' + m.id + ' has quiz', h.includes('data-quiz'));
    const checks = (h.match(/Mark lesson complete/g) || []).length;
    ok('m/' + m.id + ' sec checks=' + m.secCount, checks === m.secCount, 'got ' + checks);
    ok('m/' + m.id + ' no legacy chrome', !h.includes('mark-done') && !h.includes('lessonPct') && !h.includes('mod-nav'));
    ok('m/' + m.id + ' no onclick', !h.includes('onclick='));
  } catch (e) { ok('m/' + m.id + ' throws', false, e.message); }
}

// every widget renders
const GW = new Function(gsrc + ';return GWIDGETS;')();
const seen = {};
for (const [k, w] of Object.entries(GW)) {
  try {
    const h = T.widgetHTML(w, 'test-' + k, 'google');
    seen[w.type] = true;
    ok('widget ' + k + ' (' + w.type + ')', h.includes('widget-body') && h.length > 200);
    if (w.type === 'calc') {
      if (typeof w.run !== 'function') ok('widget ' + k + ' run fn', false, 'not a function');
      else {
        const vals = {}; w.fields.forEach(f => { vals[f.k] = f.v; });
        const out = w.run(vals);
        ok('widget ' + k + ' run() executes', typeof out === 'string' && out.length > 20, String(out).slice(0, 60));
      }
    }
  } catch (e) { ok('widget ' + k + ' throws', false, e.message); }
}
ok('all 6 widget types seen', ['tabs', 'steps', 'check', 'map', 'tree', 'calc'].every(t => seen[t]), JSON.stringify(Object.keys(seen)));

// toolkit pages
for (const c of ['google', 'meta']) {
  for (const [fn, name] of [[T.visualsHTML, 'visuals'], [T.templatesHTML, 'templates'], [T.glossaryHTML, 'glossary'], [T.qaHTML, 'qa']]) {
    try { const h = fn(c); ok(c + '/' + name, h.length > 800, h.length); }
    catch (e) { ok(c + '/' + name + ' throws', false, e.message); }
  }
  try { const h = T.courseHomeHTML(c); ok(c + '/home', h.includes('mod-row') && h.length > 4000); ok(c + '/home has no hero buttons', !h.includes('ch-actions')); }
  catch (e) { ok(c + '/home throws', false, e.message); }
}

// progress math
const cp = T.courseProgress('google');
ok('course progress totals', cp.total === 79, JSON.stringify(cp));
const cp2 = T.courseProgress('meta');
ok('meta progress totals', cp2.total === 53, JSON.stringify(cp2));

// quiz rendering
const qh = T.quizHTML(G.modules[0].quiz, 'gq-foundations');
ok('quiz renders all questions', (qh.match(/class="quiz-q"/g) || []).length === G.modules[0].quiz.length);

// ---- v2 features: search / TOC / inline meta widgets / cards / routes ----
ok('landing drops fake notify CTA', !land.includes('Notify me'));
ok('landing soon note present', land.includes('cc-soon-note'));
ok('landing cards have identity classes', land.includes('course-card live g') && land.includes('course-card live m'));
ok('header has search + theme toggle', T.headerHTML({ view: 'landing' }).includes('data-open-search') && T.headerHTML({ view: 'landing' }).includes('data-theme-toggle'));
const gh = T.googleModuleHTML(G.modules[0], 'google');
ok('google module has TOC', gh.includes('class="box toc"'));
ok('google TOC lists every section', (gh.match(/<li><a href="#\/google\/m\//g) || []).length === G.modules[0].sections.length);
ok('google sections have anchors', gh.includes('id="sec-'));
const mm = M.modules[0];
const mh = T.metaModuleHTML(mm, 'meta');
ok('meta module has TOC', mh.includes('class="box toc"'));
ok('meta sections have anchors', mh.includes('id="msec-'));
ok('meta ix rendered inline (no ix-link)', !mh.includes('ix-link') && mh.includes('data-mwidget'));
ok('meta widget tabs render', T.metaWidgetHTML({ t: 'tabs', title: 'T', items: [['A', 'a']] }, 'u1').includes('data-mtab'));
ok('meta widget steps render', T.metaWidgetHTML({ t: 'steps', title: 'T', items: [['A', 'a']] }, 'u2').includes('data-mtab'));
ok('meta widget map render', T.metaWidgetHTML({ t: 'map', title: 'T', center: 'C', items: [['A', 'a']] }, 'u3').includes('data-mmap'));
ok('meta widget tree render', T.metaWidgetHTML({ t: 'tree', title: 'T', nodes: { start: { q: 'Q?', o: [['Y', 'end']] }, end: { a: 'R', s: ['x'] } } }, 'u4').includes('data-tree-go'));
ok('meta widget check render', T.metaWidgetHTML({ t: 'check', title: 'T', items: ['one'] }, 'u5').includes('check-list'));
ok('meta widget calc render', T.metaWidgetHTML({ t: 'calc', n: 'auction', title: 'T' }, 'u6').includes('data-mcalc'));
const idx = T.buildSearchIndex();
ok('search index built', idx.length > 200, idx.length + ' entries');
ok('search index has lessons+glossary', idx.some(e => e.kind === 'lesson') && idx.some(e => e.kind === 'glossary'));
global.location.hash = '#/google/m/foundations#sec-where';
const pr = T.parseRoute();
ok('route parses section anchor', pr.view === 'module' && pr.id === 'foundations' && pr.anchor === 'sec-where', JSON.stringify(pr));
global.location.hash = '#/meta/m/campaigns#msec-2';
const pr2 = T.parseRoute();
ok('meta route parses section anchor', pr2.view === 'module' && pr2.id === 'campaigns' && pr2.anchor === 'msec-2');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
