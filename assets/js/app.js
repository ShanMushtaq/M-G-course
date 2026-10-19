/* ============================================================
   Muraqba Academy — single-file app
   Hash router + three themes + manual-only progress.
   No auto-scroll, no scroll-spy, no automatic tracking.
   Progress fills ONLY when the learner ticks a checkbox.
   ============================================================ */
(function () {
'use strict';

/* ---------------- utils ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const main = () => $('#ma-main');

/* ---------------- theme (dark mode) ---------------- */
const THEME_KEY = 'muraqba.theme.v1';
let THEME = 'light';
try {
  THEME = localStorage.getItem(THEME_KEY) ||
    (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch (e) {}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', THEME);
  updateThemeMeta(); syncThemeButtons();
}
function toggleTheme() {
  THEME = THEME === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, THEME); } catch (e) {}
  applyTheme();
}
function syncThemeButtons() {
  $$('.theme-toggle').forEach(b => {
    b.textContent = THEME === 'dark' ? '☀️' : '🌙';
    b.setAttribute('aria-label', THEME === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

/* ---------------- favicon + theme-color per course ---------------- */
const FAVICONS = {
  agency: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2317191D'/%3E%3Cpath d='M9 22V10l7 7 7-7v12' stroke='%23FAF9F6' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  google: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='7' cy='16' r='5' fill='%234285F4'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23EA4335'/%3E%3Ccircle cx='25' cy='16' r='5' fill='%2334A853'/%3E%3C/svg%3E",
  meta: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230081FB'/%3E%3Cpath d='M9 22V10l7 7 7-7v12' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
};
const THEME_COLORS = {
  agency: ['#FAF9F6', '#121316'],
  google: ['#FFFFFF', '#202124'],
  meta: ['#F4F8FC', '#0A1424']
};
function updateThemeMeta() {
  const course = document.documentElement.getAttribute('data-course') || 'agency';
  const fav = $('#ma-favicon');
  if (fav && FAVICONS[course]) fav.setAttribute('href', FAVICONS[course]);
  const tc = $('#ma-theme-color');
  if (tc) {
    const c = THEME_COLORS[course] || THEME_COLORS.agency;
    tc.setAttribute('content', THEME === 'dark' ? c[1] : c[0]);
  }
}

/* ---------------- resume bookmark ---------------- */
const RESUME_KEY = 'muraqba.resume.v1';
function saveResume(c, mid) {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ c, mid, ts: Date.now() })); } catch (e) {}
}
function getResume() {
  try { return JSON.parse(localStorage.getItem(RESUME_KEY)); } catch (e) { return null; }
}

/* ---------------- data registry ---------------- */
const COURSES = {
  google: {
    key: 'google', name: 'Google Ads', tagline: 'From zero to hero',
    data: () => GDATA, widgets: () => GWIDGETS, figures: () => GDATA.figures,
    accentWord: 'Google',
  },
  meta: {
    key: 'meta', name: 'Meta Ads', tagline: 'From zero to hero',
    data: () => MDATA, widgets: () => null, figures: () => MDATA.figures,
    accentWord: 'Meta',
  }
};

/* ---------------- manual progress store ---------------- */
const PKEY = 'muraqba.progress.v1';
let P = {};
try { P = JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { P = {}; }
function saveP() { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} }
const pkey = (c, mid, sid) => c + ':' + mid + ':' + sid;
const isDone = (c, mid, sid) => !!P[pkey(c, mid, sid)];
function setDone(c, mid, sid, v) {
  if (v) P[pkey(c, mid, sid)] = 1; else delete P[pkey(c, mid, sid)];
  saveP();
}
function moduleSections(c, mid) {
  const d = COURSES[c].data();
  const m = d.modules.find(x => x.id === mid);
  if (!m) return 0;
  return c === 'google' ? m.sections.length : m.secCount;
}
function moduleDone(c, mid) {
  const total = moduleSections(c, mid);
  if (!total) return { done: 0, total: 0, pct: 0 };
  let done = 0;
  for (let i = 0; i < total; i++) if (isDone(c, mid, i)) done++;
  return { done, total, pct: Math.round(done / total * 100) };
}
function courseProgress(c) {
  const d = COURSES[c].data();
  let done = 0, total = 0;
  d.modules.forEach(m => { const r = moduleDone(c, m.id); done += r.done; total += r.total; });
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}
/* Refresh every progress bar on screen after a manual tick. */
function refreshProgress(c) {
  const cp = courseProgress(c);
  $$('[data-pfill="course"]').forEach(el => { el.style.width = cp.pct + '%'; });
  $$('[data-ptext="course"]').forEach(el => { el.textContent = cp.pct + '%'; });
  $$('[data-pcount="course"]').forEach(el => { el.textContent = cp.done + ' of ' + cp.total + ' lessons complete'; });
  COURSES[c].data().modules.forEach(m => {
    const r = moduleDone(c, m.id);
    $$('[data-pfill="mod:' + m.id + '"]').forEach(el => { el.style.width = r.pct + '%'; });
    $$('[data-ptext="mod:' + m.id + '"]').forEach(el => { el.textContent = r.pct + '%'; });
  });
}

/* ---------------- router ---------------- */
function parseRoute() {
  const h = (location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  if (!parts.length) return { view: 'landing' };
  if (parts[0] === 'google' || parts[0] === 'meta') {
    const c = parts[0];
    if (parts[1] === 'm' && parts[2]) {
      const bits = parts[2].split('#');
      return { view: 'module', course: c, id: bits[0], anchor: bits[1] || null };
    }
    if (['glossary', 'qa', 'templates', 'visuals'].includes(parts[1]))
      return { view: parts[1], course: c };
    return { view: 'course', course: c };
  }
  return { view: 'landing' };
}

/* ---------------- header / footer ---------------- */
function headerTools() {
  return '<div class="ma-tools">' +
    '<button class="search-btn" data-open-search aria-label="Search courses"><span>⌕</span><span class="sb-t">Search</span><kbd>⌘K</kbd></button>' +
    '<button class="theme-toggle" data-theme-toggle aria-label="Toggle dark mode">🌙</button>' +
    '</div>';
}
function headerHTML(r) {
  if (r.view === 'landing') {
    return '<div class="ma-topbar-in">' +
      '<a class="ma-brand" href="#/" aria-label="Muraqba Academy home"><span class="ma-brand-mark">M</span><span>Muraqba Academy</span></a>' +
      '<div class="ma-navrow"><nav class="ma-nav" aria-label="Primary"><a href="#courses">All courses</a></nav></div>' +
      headerTools() +
      '</div>';
  }
  const c = COURSES[r.course];
  const nav = [
    ['modules', 'Modules', '#/' + r.course],
    ['templates', 'Templates', '#/' + r.course + '/templates'],
    ['glossary', 'Glossary', '#/' + r.course + '/glossary'],
    ['qa', 'Q&A', '#/' + r.course + '/qa'],
  ];
  const active = r.view === 'module' ? 'modules' : r.view;
  return '<div class="ma-topbar-in">' +
    '<a class="ma-brand" href="#/' + r.course + '" aria-label="' + esc(c.name) + ' course home"><span class="ma-brand-mark">' + esc(c.name[0]) + '</span><span>' + esc(c.name) + '</span></a>' +
    '<div class="ma-navrow"><nav class="ma-nav" aria-label="Course">' +
    nav.map(n => '<a href="' + n[2] + '" class="' + (active === n[0] ? 'on' : '') + '">' + n[1] + '</a>').join('') +
    '</nav>' +
    '<a class="ma-home-link" href="#/">← All courses</a></div>' +
    headerTools() +
    '</div>';
}

function footerHTML(r) {
  if (r.view === 'landing') {
    return '<div class="ma-footer-in">' +
      '<div><strong style="color:var(--ink)">Muraqba Academy</strong><br><span>Free, self-paced ads education — built honest, rebuilt for 2026.</span></div>' +
      '<nav><a href="#courses">All courses</a><a href="#/">Back to top</a></nav>' +
      '</div>';
  }
  const c = COURSES[r.course];
  return '<div class="ma-footer-in">' +
    '<div><strong style="color:var(--ink)">' + esc(c.name) + ' — from zero to hero</strong><br><span>A free, self-paced course. Progress is tracked only when you mark lessons complete.</span></div>' +
    '<nav><a href="#/' + r.course + '/visuals">Visual Library</a><a href="#/' + r.course + '/glossary">Glossary</a><a href="#/">All courses</a></nav>' +
    '</div>';
}

/* ============================================================
   LANDING
   ============================================================ */
function landingHTML() {
  const g = GDATA, m = MDATA;
  const gSecs = g.modules.reduce((a, x) => a + x.sections.length, 0);
  const mSecs = m.modules.reduce((a, x) => a + x.secCount, 0);
  const gQuiz = g.modules.reduce((a, x) => a + x.quiz.length, 0);
  const mQuiz = m.modules.reduce((a, x) => a + x.quiz.length, 0);

  const card = (cls, badge, dots, title, desc, stats, cta, href, soon) => {
    const inner =
      '<div class="cc-top"><span class="cc-badge">' + badge + '</span>' +
      (dots ? '<span class="cc-dots"><i></i><i></i><i></i><i></i></span>' : '<span class="cc-lock">🔒</span>') + '</div>' +
      '<h3>' + title + '</h3><p>' + desc + '</p>' +
      '<div class="cc-meta">' + stats + '</div>' +
      (soon ? '<span class="cc-soon-note">More details soon</span>' : '<span class="cc-cta">' + cta + '</span>');
    return soon
      ? '<div class="course-card soon" aria-disabled="true" tabindex="0">' + inner + '</div>'
      : '<a class="course-card live ' + cls + '" href="' + href + '">' + inner + '</a>';
  };

  return '' +
  '<section id="courses"><div class="wrap">' +
    '<div class="sec-head"><div class="kicker">Choose your course</div>' +
    '<h2>Two platforms. One path from zero to hero.</h2>' +
    '<p>Pick a course to enter its learning space. Each course has its own visual world — step inside and everything you see is the course, nothing else.</p></div>' +
    '<div class="course-grid">' +
      card('g', '● Open now', true, 'Google Ads',
        'From “what is an auction” to running real Search, YouTube and Performance Max campaigns — with simulators, checklists and decision trees.',
        '<span><b>11</b> modules</span><span><b>' + gSecs + '</b> lessons</span><span><b>' + gQuiz + '</b> quiz questions</span>',
        'Start learning →', '#/google', false) +
      card('m', '● Open now', true, 'Meta Ads',
        'From “what is a Pixel” to profitable Facebook &amp; Instagram campaigns — rebuilt for the Andromeda shift that changed targeting forever.',
        '<span><b>11</b> modules</span><span><b>' + mSecs + '</b> lessons</span><span><b>' + mQuiz + '</b> quiz questions</span>',
        'Start learning →', '#/meta', false) +
      card('', 'Coming soon', false, 'New course',
        'A new Muraqba Academy course is being built for this slot. Check back soon.',
        '<span>In production</span>', 'Notify me — soon', '', true) +
      card('', 'Coming soon', false, 'New course',
        'A new Muraqba Academy course is being built for this slot. Check back soon.',
        '<span>In production</span>', 'Notify me — soon', '', true) +
    '</div>' +
  '</div></section>';
}

/* ============================================================
   COURSE HOME
   ============================================================ */
function courseHomeHTML(c) {
  const C = COURSES[c], d = C.data();
  const cp = courseProgress(c);
  const tools = [
    ['visuals', '🗺️', 'Visual Library', 'Diagrams, maps and charts from every module.'],
    ['templates', '📋', 'Templates', 'Copy-paste working documents.'],
    ['glossary', '📖', 'Glossary', 'Plain-English definitions.'],
    ['qa', '🎓', 'Advanced Q&A', 'Practitioner-level questions.'],
  ];
  return '' +
  '<section class="ch-hero"><div class="wrap">' +
    '<span class="ch-eyebrow">' + esc(C.accentWord) + ' · Free self-paced course</span>' +
    '<h1>' + esc(C.name) + ', from <em>zero</em> to <em>hero</em>.</h1>' +
    '<p class="ch-sub">' + esc(d.modules[0].sub || '') + ' Eleven modules take you from the absolute basics to running real, profitable campaigns.</p>' +
    '<div class="prog"><div class="prog-top"><span>Your progress</span><b data-ptext="course">' + cp.pct + '%</b></div>' +
    '<div class="prog-track"><div class="prog-fill" data-pfill="course" style="width:' + cp.pct + '%"></div></div>' +
    '<div class="prog-note" data-pcount="course">' + cp.done + ' of ' + cp.total + ' lessons complete · Progress fills only when you tick “Mark complete”.</div></div>' +
  '</div></section>' +

  '<section><div class="wrap">' +
    '<div class="sec-head" style="margin-top:26px"><div class="kicker">Curriculum</div><h2>Modules</h2></div>' +
    '<div class="mod-list">' +
    d.modules.map(m => {
      const r = moduleDone(c, m.id);
      const secs = c === 'google' ? m.sections.length : m.secCount;
      return '<a class="mod-row' + (r.pct === 100 ? ' done' : '') + '" href="#/' + c + '/m/' + m.id + '">' +
        '<span class="mod-num">' + (r.pct === 100 ? '✓' : m.n) + '</span>' +
        '<span><h3>' + esc(m.title) + '</h3><p class="sub">' + esc(m.sub) + '</p></span>' +
        '<span class="meta"><span>' + secs + ' lessons' + (m.quiz && m.quiz.length ? ' · ' + m.quiz.length + ' quiz' : '') + '</span>' +
        '<span class="mini"><span class="prog-track"><span class="prog-fill" data-pfill="mod:' + m.id + '" style="width:' + r.pct + '%"></span></span></span>' +
        '<b data-ptext="mod:' + m.id + '">' + r.pct + '%</b></span>' +
      '</a>';
    }).join('') +
    '</div>' +
  '</div></section>' +

  '<section><div class="wrap">' +
    '<div class="sec-head"><div class="kicker">Toolkit</div><h2>Practice &amp; reference</h2></div>' +
    '<div class="tool-grid">' +
    tools.map(t => '<a class="tool-card" href="#/' + c + '/' + t[0] + '"><div class="t-ico">' + t[1] + '</div><h3>' + t[2] + '</h3><p>' + t[3] + '</p></a>').join('') +
    '</div>' +
  '</div></section>';
}

/* ============================================================
   QUIZ (manual: answer, then press Check)
   ============================================================ */
function quizHTML(quiz, qkey) {
  if (!quiz || !quiz.length) return '';
  return '<div class="quiz" data-quiz="' + esc(qkey) + '">' +
    '<div class="quiz-head">📝 Module quiz <span class="muted" style="font-weight:500;font-size:.85rem">· ' + quiz.length + ' questions</span></div>' +
    '<div class="quiz-body">' +
    quiz.map((q, qi) =>
      '<div class="quiz-q" data-q="' + qi + '"><p>' + (qi + 1) + '. ' + esc(q.q) + '</p>' +
      '<div class="quiz-opts">' +
      q.opts.map((o, oi) =>
        '<label data-opt="' + oi + '"><input type="radio" name="' + esc(qkey) + '-' + qi + '" value="' + oi + '"><span>' + esc(o) + '</span></label>'
      ).join('') +
      '</div><div class="quiz-exp" data-exp></div></div>'
    ).join('') +
    '<button class="btn small" data-quiz-check>Check answers</button> ' +
    '<button class="btn small ghost" data-quiz-retake style="display:none">Retake</button>' +
    '<div class="quiz-score" data-score></div>' +
    '</div></div>';
}
function gradeQuiz(box, quiz) {
  let score = 0;
  quiz.forEach((q, qi) => {
    const wrap = $('.quiz-q[data-q="' + qi + '"]', box);
    const sel = $('input:checked', wrap);
    const labels = $$('.quiz-opts label', wrap);
    labels.forEach(l => l.classList.remove('right', 'wrong'));
    const exp = $('[data-exp]', wrap);
    if (sel) {
      const v = +sel.value;
      if (v === q.correct) { score++; labels[v].classList.add('right'); }
      else { labels[v].classList.add('wrong'); labels[q.correct].classList.add('right'); }
    } else {
      labels[q.correct].classList.add('right');
    }
    exp.innerHTML = q.explain ? '<strong>Why:</strong> ' + esc(q.explain) : '';
    exp.classList.add('show');
  });
  const sc = $('[data-score]', box);
  sc.innerHTML = 'You scored <strong>' + score + ' / ' + quiz.length + '</strong>' +
    (score === quiz.length ? ' — perfect. 🎉' : score >= Math.ceil(quiz.length * .7) ? ' — solid work.' : ' — review the lesson and try again.');
  sc.classList.add('show');
  $('[data-quiz-retake]', box).style.display = '';
}
/* ============================================================
   GLOBAL SEARCH (manual: opens only on click / ⌘K)
   ============================================================ */
function stripTags(h) {
  const d = document.createElement('div');
  d.innerHTML = h == null ? '' : String(h);
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}
function metaSectionsRaw(m) {
  const parts = String(m.body).split('<div class="lesson-section"');
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const hm = parts[i].match(/<h2>([\s\S]*?)<\/h2>/);
    out.push(hm ? stripTags(hm[1]) : 'Lesson ' + i);
  }
  return out;
}
let SEARCH_IDX = null;
function buildSearchIndex() {
  if (SEARCH_IDX) return SEARCH_IDX;
  const idx = [];
  const push = (course, kind, title, text, url) => idx.push({ course, kind, title: title || '', text: text || '', url });
  GDATA.modules.forEach(m => {
    push('google', 'module', m.n + '. ' + m.title, m.sub, '#/google/m/' + m.id);
    m.sections.forEach(s => push('google', 'lesson', s.h, stripTags(s.html).slice(0, 500), '#/google/m/' + m.id + '#sec-' + s.id));
  });
  GDATA.glossary.forEach(g => push('google', 'glossary', g.t, g.d, '#/google/glossary'));
  MDATA.modules.forEach(m => {
    push('meta', 'module', m.n + '. ' + m.title, m.sub, '#/meta/m/' + m.id);
    metaSectionsRaw(m).forEach((t, i) => push('meta', 'lesson', t, '', '#/meta/m/' + m.id + '#msec-' + i));
  });
  MDATA.glossary.forEach(g => push('meta', 'glossary', g.t, g.d, '#/meta/glossary'));
  SEARCH_IDX = idx;
  return idx;
}
function ensureSearchUI() {
  if ($('#search-overlay')) return;
  const w = document.createElement('div');
  w.innerHTML = '<div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search courses">' +
    '<div class="search-pal" role="listbox" aria-label="Search results">' +
    '<input id="search-input" type="search" placeholder="Search lessons, modules, glossary…" aria-label="Search courses" autocomplete="off">' +
    '<div class="search-results" id="search-results"></div>' +
    '<div class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>' +
    '</div></div>';
  document.body.appendChild(w.firstChild);
  $('#search-overlay').addEventListener('click', e => { if (e.target.id === 'search-overlay') closeSearch(); });
}
let searchHits = [], searchSel = 0;
function openSearch() {
  ensureSearchUI(); buildSearchIndex();
  $('#search-overlay').classList.add('open');
  const inp = $('#search-input');
  inp.value = ''; runSearch('');
  setTimeout(() => inp.focus(), 40);
}
function closeSearch() {
  const o = $('#search-overlay');
  if (o) o.classList.remove('open');
}
function runSearch(q) {
  q = q.trim().toLowerCase();
  const idx = buildSearchIndex();
  searchHits = q ? idx.map(e => {
    const ti = e.title.toLowerCase(), tx = e.text.toLowerCase();
    let s = -1;
    if (ti.indexOf(q) === 0) s = 0;
    else if (ti.indexOf(q) > 0) s = 10 + ti.indexOf(q);
    else if (tx.indexOf(q) >= 0) s = 100 + tx.indexOf(q);
    return s >= 0 ? { e, s } : null;
  }).filter(Boolean).sort((a, b) => a.s - b.s).slice(0, 14) : [];
  searchSel = 0;
  renderSearchResults();
}
function renderSearchResults() {
  const box = $('#search-results');
  if (!searchHits.length) {
    box.innerHTML = '<div class="search-empty">No matches — try “auction”, “Pixel”, “budget”…</div>';
    return;
  }
  box.innerHTML = searchHits.map((h, i) =>
    '<button class="search-hit' + (i === searchSel ? ' sel' : '') + '" data-surl="' + esc(h.e.url) + '" role="option" aria-selected="' + (i === searchSel) + '">' +
    '<span class="k ' + h.e.course[0] + '">' + (h.e.course === 'google' ? 'G' : 'M') + ' · ' + h.e.kind + '</span>' +
    '<span><b>' + esc(h.e.title) + '</b>' + (h.e.text ? '<span>' + esc(h.e.text.slice(0, 90)) + '</span>' : '') + '</span>' +
    '</button>').join('');
}
function goSearchHit(i) {
  const h = searchHits[i];
  if (!h) return;
  closeSearch();
  if (location.hash === h.e.url) render();
  else location.hash = h.e.url;
}

function retakeQuiz(box) {
  $$('.quiz-q', box).forEach(w => {
    $$('input', w).forEach(i => { i.checked = false; });
    $$('.quiz-opts label', w).forEach(l => l.classList.remove('right', 'wrong'));
    const exp = $('[data-exp]', w); exp.classList.remove('show'); exp.innerHTML = '';
  });
  const sc = $('[data-score]', box); sc.classList.remove('show'); sc.innerHTML = '';
  $('[data-quiz-retake]', box).style.display = 'none';
}

/* ============================================================
   GOOGLE WIDGETS (tabs / steps / check / map / tree / calc)
   ============================================================ */
const TREES = {};
function widgetHTML(w, uid, course) {
  const head = '<div class="widget-head"><span class="w-tag">Interactive</span><span>' + esc(w.title || 'Widget') + '</span></div>';
  let body = '';
  if (w.type === 'tabs') {
    body = '<div class="tabs" role="tablist">' + w.tabs.map((t, i) =>
      '<button class="tab' + (i === 0 ? ' on' : '') + '" data-tab="' + uid + '" data-pane="' + i + '" role="tab">' + esc(t.t) + '</button>').join('') + '</div>' +
      w.tabs.map((t, i) => '<div class="tab-panel' + (i === 0 ? ' on' : '') + '" data-pane-body="' + uid + '-' + i + '"><p>' + mdInline(t.p) + '</p></div>').join('');
  } else if (w.type === 'steps') {
    body = '<ol class="steps">' + w.steps.map(s => '<li><b>' + esc(s.t) + '</b><span class="muted">' + mdInline(s.d || '') + '</span></li>').join('') + '</ol>';
  } else if (w.type === 'check') {
    body = '<ul class="check-list">' + w.items.map((it, i) =>
      '<li><label><input type="checkbox"><span>' + esc(it) + '</span></label></li>').join('') + '</ul>';
  } else if (w.type === 'map') {
    if (w.link && (!w.nodes || !w.nodes.length)) {
      const d = COURSES[course].data();
      body = '<div class="map-center">' + esc(w.center || 'Course map') + '</div>' +
        '<div class="map-nodes">' + d.modules.map(m =>
          '<a class="map-node" href="#/' + course + '/m/' + m.id + '"><b>' + m.n + '. ' + esc(m.title) + '</b><p>' + esc(m.sub) + '</p></a>').join('') + '</div>';
    } else {
      body = '<div class="map-center">' + esc(w.center || '') + '</div>' +
        '<div class="map-nodes">' + (w.nodes || []).map(n =>
          '<div class="map-node"><b>' + esc(n.t) + '</b><p>' + esc(n.d || '') + '</p></div>').join('') + '</div>';
    }
  } else if (w.type === 'tree') {
    TREES[uid] = w.start;
    body = '<div data-tree-body="' + uid + '">' + treeNodeHTML(w, w.start, uid) + '</div>';
  } else if (w.type === 'calc') {
    body = '<div class="calc-grid">' + w.fields.map(f => {
      let input;
      if (f.o) input = '<select data-cf="' + esc(f.k) + '">' + f.o.map(o => '<option value="' + o[0] + '"' + (o[0] === f.v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      else input = '<input type="number" data-cf="' + esc(f.k) + '" value="' + esc(f.v) + '" min="' + f.min + '" max="' + f.max + '" step="' + (f.step || 1) + '">';
      return '<div class="calc-field"><label>' + esc(f.l) + '</label>' + input + '</div>';
    }).join('') + '</div>' +
    '<button class="btn small" data-calc="' + uid + '">Calculate</button>' +
    '<div class="calc-out" data-calc-out="' + uid + '"></div>';
  }
  return '<div class="widget" data-widget="' + uid + '">' + head + '<div class="widget-body">' + body + '</div></div>';
}
function treeNodeHTML(w, nodeId, uid) {
  const n = w.nodes[nodeId];
  if (!n) return '<p class="muted">End of path.</p>';
  if (n.a && n.a.length) {
    return '<div class="tree-end"><strong>' + esc(n.title || 'Recommendation') + '</strong>' +
      '<ul style="margin:.7em 0 0;padding-left:1.2em;display:grid;gap:6px">' +
      n.a.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' +
      '<p class="mt-2" style="margin-bottom:0"><button class="btn small ghost" data-tree-restart="' + uid + '">↺ Restart</button></p></div>';
  }
  return '<p class="tree-q">' + esc(n.q) + '</p><div class="tree-opts">' +
    (n.o || []).map(o => '<button data-tree-go="' + uid + '" data-next="' + esc(o[1]) + '">' + esc(o[0]) + ' →</button>').join('') + '</div>';
}
function mdInline(t) {
  return esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/* ============================================================
   MODULE PAGES
   ============================================================ */
function googleModuleHTML(m, course) {
  const C = COURSES[course], W = C.widgets();
  const r = moduleDone(course, m.id);
  const idx = C.data().modules.findIndex(x => x.id === m.id);
  const prev = C.data().modules[idx - 1], next = C.data().modules[idx + 1];

  let h = '<section class="mp-head"><div class="wrap">' +
    '<div class="mp-eyebrow"><span class="mp-dot"></span>Module ' + m.n + ' of ' + C.data().modules.length + '</div>' +
    '<h1>' + esc(m.title) + '</h1><p class="mp-sub">' + esc(m.sub) + '</p>' +
    '<div class="prog"><div class="prog-top"><span>Module progress</span><b data-ptext="mod:' + m.id + '">' + r.pct + '%</b></div>' +
    '<div class="prog-track"><div class="prog-fill" data-pfill="mod:' + m.id + '" style="width:' + r.pct + '%"></div></div>' +
    '<div class="prog-note">' + r.done + ' of ' + r.total + ' lessons manually marked complete</div></div>' +
  '</div></section><section><div class="read">';

  h += '<div class="box"><p style="font-size:1.06rem;margin:0">' + mdInline(m.intro) + '</p></div>';

  h += '<nav class="box toc" aria-label="On this page"><h3>On this page</h3><ol>' +
    m.sections.map(s => '<li><a href="#/google/m/' + m.id + '#sec-' + s.id + '">' + esc(s.h) + '</a></li>').join('') +
    '</ol></nav>';

  m.sections.forEach((s, si) => {
    const key = pkey(course, m.id, si);
    const done = P[key] ? 'checked' : '';
    h += '<div class="box sec' + (P[key] ? ' done' : '') + '" data-secbox="' + key + '" id="sec-' + s.id + '">' +
      '<label class="sec-check"><input type="checkbox" data-pkey="' + key + '" ' + done + '><span class="st">Mark lesson complete</span></label>' +
      '<h2>' + esc(s.h) + '</h2>' + s.html;
    if (s.callout) h += '<div class="callout ' + (s.callout.k === 'warn' ? 'warn' : 'info') + '"><span class="icon">' + (s.callout.k === 'warn' ? '⚠️' : '💡') + '</span><p>' + s.callout.t + '</p></div>';
    if (s.figure && C.figures()[s.figure]) {
      const f = C.figures()[s.figure];
      h += '<figure class="fig"><div class="fig-t">' + esc(f.t) + '</div>' + f.svg + (f.cap ? '<figcaption>' + esc(f.cap) + '</figcaption>' : '') + '</figure>';
    }
    if (s.widget && W[s.widget]) h += widgetHTML(W[s.widget], course + '-' + m.id + '-' + s.widget, course);
    h += '</div>';
  });

  if (m.takeaways && m.takeaways.length)
    h += '<div class="takeaways"><h3>✅ Key takeaways</h3><ul>' + m.takeaways.map(t => '<li>' + mdInline(t) + '</li>').join('') + '</ul></div>';
  if (m.action)
    h += '<div class="action-box"><div class="lbl">Try this now</div><p>' + mdInline(m.action) + '</p></div>';
  if (m.related && m.related.length)
    h += '<div class="box"><h3 style="margin-top:0">Keep exploring</h3><div class="map-nodes">' +
      m.related.map(rl => {
        const to = String(rl.to || '');
        const href = to === 'visuals' ? '#/' + course + '/visuals'
          : to.indexOf('glossary') === 0 ? '#/' + course + '/glossary'
          : '#/' + course + '/' + to;
        return '<a class="map-node" href="' + href + '"><b>' + esc(rl.t) + '</b><p>' + esc(rl.d || '') + '</p></a>';
      }).join('') + '</div></div>';

  h += quizHTML(m.quiz, 'gq-' + m.id);

  h += '<nav class="mp-nav" aria-label="Module navigation">' +
    (prev ? '<a href="#/' + course + '/m/' + prev.id + '"><span class="lbl">← Previous</span><span class="ttl">' + prev.n + '. ' + esc(prev.title) + '</span></a>' : '<span></span>') +
    (next ? '<a class="next" href="#/' + course + '/m/' + next.id + '"><span class="lbl">Next →</span><span class="ttl">' + next.n + '. ' + esc(next.title) + '</span></a>' : '<span></span>') +
    '</nav>';

  return h + '</div></section>';
}

/* Meta interactive widgets, rendered inline from MWIDGETS */
const MW_BY_UID = {};
function metaWidgetHTML(w, uid, mid) {
  const t = w.t || w.type;
  const head = '<div class="widget-head"><span class="w-tag">Interactive</span><span>' + esc(w.title || 'Interactive') + '</span></div>';
  let body = '';
  if (t === 'tabs' || t === 'steps') {
    const items = w.items || [];
    body = '<div class="ix-chips" role="tablist">' + items.map((it, i) =>
      '<button class="ix-chip' + (i === 0 ? ' on' : '') + '" data-mtab="' + uid + '" data-pane="' + i + '" role="tab">' + esc(it[0]) + '</button>').join('') + '</div>' +
      items.map((it, i) => '<div class="ix-panel" data-mpane="' + uid + '-' + i + '"' + (i ? ' style="display:none"' : '') + '><b>' + esc(it[0]) + '</b><p>' + esc(it[1] || '') + '</p>' +
        (it[2] ? '<p class="mt-2" style="margin-bottom:0"><a href="#/meta/m/' + esc(it[2]) + '">Open module →</a></p>' : '') + '</div>').join('');
  } else if (t === 'map') {
    const items = w.items || [];
    MW_BY_UID[uid] = w;
    body = '<div class="mnode-grid">' + items.map((it, i) =>
      '<button class="mnode' + (i === 0 ? ' on' : '') + '" data-mmap="' + uid + '" data-node="' + i + '">' + esc(it[0]) + (it[1] ? '<small>' + esc(String(it[1]).slice(0, 70)) + '</small>' : '') + '</button>').join('') + '</div>' +
      '<div class="ix-panel" data-mpanel="' + uid + '"></div>';
  } else if (t === 'tree') {
    const nodes = {};
    for (const nid of Object.keys(w.nodes || {})) {
      const n = w.nodes[nid];
      nodes[nid] = n.q ? { q: n.q, o: n.o } : { title: n.a || 'Result', a: n.s || [] };
    }
    const nw = { nodes, start: (w.nodes && w.nodes.start) ? 'start' : Object.keys(nodes)[0] };
    MW_BY_UID[uid] = nw; TREES[uid] = nw.start;
    body = '<div data-tree-body="' + uid + '">' + treeNodeHTML(nw, nw.start, uid) + '</div>';
  } else if (t === 'check') {
    const items = w.items || [];
    body = '<ul class="check-list">' + items.map(it =>
      '<li><label><input type="checkbox"><span>' + esc(it) + '</span></label></li>').join('') + '</ul>';
  } else if (t === 'calc') {
    MW_BY_UID[uid] = w;
    body = '<div data-mcalc="' + uid + '"></div>';
  } else {
    body = '<p class="muted">' + esc(w.title || 'Interactive widget') + '</p>';
  }
  return '<div class="widget" data-mwidget="' + uid + '">' + head + '<div class="widget-body">' + body + '</div></div>';
}
function initMetaWidgets() {
  // map detail panels: show first node
  $$('[data-mpanel]').forEach(p => {
    const w = MW_BY_UID[p.getAttribute('data-mpanel')];
    if (w && w.items && w.items[0]) {
      const it = w.items[0];
      p.innerHTML = '<b>' + esc(it[0]) + '</b><p>' + esc(it[1] || '') + '</p>' +
        (it[2] ? '<p class="mt-2" style="margin-bottom:0"><a href="#/meta/m/' + esc(it[2]) + '">Open module →</a></p>' : '');
    }
  });
  // calculators: hand a live element to the extracted engine
  $$('[data-mcalc]').forEach(el => {
    const w = MW_BY_UID[el.getAttribute('data-mcalc')];
    const fn = w && window.__MCALC && window.__MCALC[w.n];
    if (fn) { try { fn(el, w); } catch (e) { el.innerHTML = '<p class="muted">This interactive widget could not load.</p>'; } }
    else el.innerHTML = '<p class="muted">' + esc((w && w.title) || 'Interactive widget') + '</p>';
  });
}

function metaBodyWithChecks(m) {
  const titles = metaSectionsRaw(m);
  let i = 0;
  let body = m.body.replace(/<div class="lesson-section"/g, () => {
    const idx = i++;
    const key = pkey('meta', m.id, idx);
    const done = P[key] ? 'checked' : '';
    return '<div class="lesson-section" id="msec-' + idx + '" data-sec="' + idx + '"><label class="sec-check"><input type="checkbox" data-pkey="' + key + '" ' + done + '><span class="st">Mark lesson complete</span></label';
  });
  body = body.replace(/<div class="ix" data-id="([^"]+)"><\/div>/g, (mm, id) => {
    const w = (typeof MWIDGETS !== 'undefined' && MWIDGETS[id]) || null;
    if (!w) return '<a class="ix-link" href="#/meta/visuals"><span class="x-ico">◈</span><span>' + esc(MDATA.ixTitles[id] || 'Visual aid') + ' — view in the Visual Library</span><span style="margin-left:auto">→</span></a>';
    return metaWidgetHTML(w, 'm-' + m.id + '-' + id, m.id);
  });
  return { body, total: i, toc: titles.map((t, idx) => ({ id: 'msec-' + idx, title: t })) };
}

function metaModuleHTML(m, course) {
  const C = COURSES[course];
  const r = moduleDone(course, m.id);
  const idx = C.data().modules.findIndex(x => x.id === m.id);
  const prev = C.data().modules[idx - 1], next = C.data().modules[idx + 1];
  const proc = metaBodyWithChecks(m);

  let h = '<section class="mp-head"><div class="wrap">' +
    '<div class="mp-eyebrow"><span class="mp-dot" style="background:' + esc(m.accent) + '"></span>Module ' + m.n + ' of ' + C.data().modules.length + '</div>' +
    '<h1>' + esc(m.title) + '</h1><p class="mp-sub">' + esc(m.sub) + '</p>' +
    '<div class="prog"><div class="prog-top"><span>Module progress</span><b data-ptext="mod:' + m.id + '">' + r.pct + '%</b></div>' +
    '<div class="prog-track"><div class="prog-fill" data-pfill="mod:' + m.id + '" style="width:' + r.pct + '%"></div></div>' +
    '<div class="prog-note">' + r.done + ' of ' + r.total + ' lessons manually marked complete</div></div>' +
  '</div></section><section><div class="read m-legacy">' +
  (proc.toc && proc.toc.length ? '<nav class="box toc" aria-label="On this page"><h3>On this page</h3><ol>' +
    proc.toc.map(t => '<li><a href="#/meta/m/' + m.id + '#' + t.id + '">' + esc(t.title) + '</a></li>').join('') +
    '</ol></nav>' : '') + proc.body;

  h += quizHTML(m.quiz, 'mq-' + m.id);

  h += '<nav class="mp-nav" aria-label="Module navigation">' +
    (prev ? '<a href="#/' + course + '/m/' + prev.id + '"><span class="lbl">← Previous</span><span class="ttl">' + prev.n + '. ' + esc(prev.title) + '</span></a>' : '<span></span>') +
    (next ? '<a class="next" href="#/' + course + '/m/' + next.id + '"><span class="lbl">Next →</span><span class="ttl">' + next.n + '. ' + esc(next.title) + '</span></a>' : '<span></span>') +
    '</nav>';

  return h + '</div></section>';
}

/* ============================================================
   TOOLKIT PAGES
   ============================================================ */
function visualsHTML(c) {
  const C = COURSES[c];
  const figs = C.figures();
  const list = Object.keys(figs).map(k => figs[k]);
  let h = '<section class="tk-head"><div class="wrap"><div class="mp-eyebrow"><span class="mp-dot"></span>Toolkit</div>' +
    '<h1>Visual Library</h1><p>Diagrams, maps and charts from every module — the whole course on one page.</p></div></section><section><div class="read">';
  if (c === 'meta') {
    MDATA.figures.forEach(f => {
      h += '<figure class="fig"><div class="fig-t">' + esc(f.t) + '</div>' + f.svg + (f.cap ? '<figcaption>' + esc(f.cap) + '</figcaption>' : '') + '</figure>';
    });
  } else {
    list.forEach(f => {
      h += '<figure class="fig"><div class="fig-t">' + esc(f.t) + '</div>' + f.svg + (f.cap ? '<figcaption>' + esc(f.cap) + '</figcaption>' : '') + '</figure>';
    });
    // interactive widgets gallery
    const W = C.widgets();
    h += '<div class="sec-head"><div class="kicker">Interactive tools</div><h2>Try the simulators</h2><p>Hands-on widgets from the lessons — adjust the inputs and see what changes.</p></div>';
    Object.keys(W).forEach((k, i) => { h += widgetHTML(W[k], 'lib-' + k, c); });
  }
  return h + '</div></section>';
}

function templatesHTML(c) {
  const d = COURSES[c].data();
  let h = '<section class="tk-head"><div class="wrap"><div class="mp-eyebrow"><span class="mp-dot"></span>Toolkit</div>' +
    '<h1>Templates</h1><p>Copy, paste, adapt. Working documents referenced across the course.</p></div></section><section><div class="read">';
  d.templates.forEach((t, i) => {
    const pid = 'tpl-' + c + '-' + i;
    h += '<div class="tpl-card"><div class="tpl-top"><h3>' + esc(t.t) + '</h3>' + (t.d ? '<p>' + esc(t.d) + '</p>' : '') + '</div>' +
      '<pre id="' + pid + '">' + esc(t.b) + '</pre>' +
      '<div class="tpl-actions"><button class="btn small" data-copy="' + pid + '">⧉ Copy</button>' +
      '<button class="btn small ghost" data-dl="' + pid + '" data-fname="' + esc(t.t.replace(/[^a-z0-9]+/gi, '-').toLowerCase()) + '">⬇ Download .txt</button></div></div>';
  });
  return h + '</div></section>';
}

function glossaryHTML(c) {
  const d = COURSES[c].data();
  let h = '<section class="tk-head"><div class="wrap"><div class="mp-eyebrow"><span class="mp-dot"></span>Reference</div>' +
    '<h1>Glossary</h1><p>' + d.glossary.length + ' terms, in plain English.</p></div></section><section><div class="read">' +
    '<div class="search-row"><input id="gq" type="search" placeholder="Filter terms…" aria-label="Filter glossary terms"></div><div id="glist">';
  d.glossary.forEach(g => {
    h += '<dl class="gloss-item" data-term="' + esc((g.t + ' ' + g.d).toLowerCase()) + '"><dt>' + esc(g.t) + '</dt><dd>' + esc(g.d) + '</dd></dl>';
  });
  return h + '</div></div></section>';
}

function qaHTML(c) {
  const d = COURSES[c].data();
  let h = '<section class="tk-head"><div class="wrap"><div class="mp-eyebrow"><span class="mp-dot"></span>Reference</div>' +
    '<h1>Advanced Practitioner Q&amp;A</h1><p>Past the fundamentals — the questions that come up once you’re running real budgets and real accounts.</p></div></section><section><div class="read">';
  d.qa.forEach((q, i) => {
    h += '<details class="qa-item"' + (i === 0 ? ' open' : '') + '><summary>' + esc(q.q) + '</summary><div class="qa-a">' + q.a + '</div></details>';
  });
  return h + '</div></section>';
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  const r = parseRoute();
  document.documentElement.setAttribute('data-course', r.view === 'landing' ? 'agency' : r.course);
  updateThemeMeta();
  document.title = r.view === 'landing' ? 'Muraqba Academy — Learn Google Ads & Meta Ads, from zero to hero'
    : r.view === 'course' ? COURSES[r.course].name + ' — from zero to hero · Muraqba Academy'
    : r.view === 'module' ? (COURSES[r.course].data().modules.find(m => m.id === r.id)?.title || 'Module') + ' · ' + COURSES[r.course].name
    : r.view.charAt(0).toUpperCase() + r.view.slice(1) + ' · ' + COURSES[r.course].name;

  $('#ma-header').innerHTML = headerHTML(r);
  let html = '';
  if (r.view === 'landing') html = landingHTML();
  else if (r.view === 'course') html = courseHomeHTML(r.course);
  else if (r.view === 'module') {
    const m = COURSES[r.course].data().modules.find(x => x.id === r.id);
    html = m ? (r.course === 'google' ? googleModuleHTML(m, r.course) : metaModuleHTML(m, r.course))
             : '<div class="wrap"><div class="empty mt-4">Module not found. <a href="#/' + r.course + '">Back to modules</a></div></div>';
  }
  else if (r.view === 'visuals') html = visualsHTML(r.course);
  else if (r.view === 'templates') html = templatesHTML(r.course);
  else if (r.view === 'glossary') html = glossaryHTML(r.course);
  else if (r.view === 'qa') html = qaHTML(r.course);
  main().innerHTML = html;
  $('#ma-footer').innerHTML = footerHTML(r);
  syncThemeButtons();
  initMetaWidgets();
  if (r.view === 'module') {
    saveResume(r.course, r.id);
    if (r.anchor) {
      const t = document.getElementById(r.anchor);
      if (t) t.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, 0);
    } else window.scrollTo(0, 0);
  } else window.scrollTo(0, 0);
}

/* ============================================================
   EVENTS (delegated — one wiring, works for every view)
   ============================================================ */
function routeFor(course, id) {
  const mods = COURSES[course].data().modules.map(m => m.id);
  if (id === 'home') return '#/' + course;
  if (mods.includes(id)) return '#/' + course + '/m/' + id;
  if (id === 'advanced-qa') return '#/' + course + '/qa';
  if (['glossary', 'templates', 'visuals'].includes(id)) return '#/' + course + '/' + id;
  return '#/' + course;
}

document.addEventListener('click', e => {
  // in-content legacy route links
  const dr = e.target.closest('[data-route]');
  if (dr) {
    const course = document.documentElement.getAttribute('data-course');
    if (course === 'google' || course === 'meta') { location.hash = routeFor(course, dr.getAttribute('data-route')); }
    e.preventDefault(); return;
  }
  // widget tabs
  const tab = e.target.closest('.widget .tab');
  if (tab) {
    const uid = tab.getAttribute('data-tab');
    $$('.widget .tab[data-tab="' + uid + '"]').forEach(t => t.classList.remove('on'));
    tab.classList.add('on');
    $$('[data-pane-body^="' + uid + '-"]').forEach(p => p.classList.remove('on'));
    const pane = $('[data-pane-body="' + uid + '-' + tab.getAttribute('data-pane') + '"]');
    if (pane) pane.classList.add('on');
    return;
  }
  // decision tree
  const tgo = e.target.closest('[data-tree-go]');
  if (tgo) {
    const uid = tgo.getAttribute('data-tree-go');
    const w = TREES[uid] && widgetByUid(uid);
    if (w) { TREES[uid] = tgo.getAttribute('data-next'); $('[data-tree-body="' + uid + '"]').innerHTML = treeNodeHTML(w, TREES[uid], uid); }
    return;
  }
  const trs = e.target.closest('[data-tree-restart]');
  if (trs) {
    const uid = trs.getAttribute('data-tree-restart');
    const w = widgetByUid(uid);
    if (w) { TREES[uid] = w.start; $('[data-tree-body="' + uid + '"]').innerHTML = treeNodeHTML(w, w.start, uid); }
    return;
  }
  // calculators
  const calcBtn = e.target.closest('[data-calc]');
  if (calcBtn) {
    const uid = calcBtn.getAttribute('data-calc');
    const w = widgetByUid(uid);
    const out = $('[data-calc-out="' + uid + '"]');
    if (w && out) {
      const vals = {};
      $$('[data-cf]', calcBtn.closest('.widget')).forEach(inp => { vals[inp.getAttribute('data-cf')] = inp.value; });
      try { out.innerHTML = w.run(vals); }
      catch (err) { out.innerHTML = '<p class="muted">Something went wrong with those inputs — try adjusting the values.</p>'; }
    }
    return;
  }
  // search + theme
  if (e.target.closest('[data-open-search]')) { openSearch(); return; }
  if (e.target.closest('[data-theme-toggle]')) { toggleTheme(); return; }
  const sh = e.target.closest('.search-hit');
  if (sh) { goSearchHit(searchHits.findIndex(h => h.e.url === sh.getAttribute('data-surl'))); return; }
  // meta tabs/steps chips
  const mtab = e.target.closest('[data-mtab]');
  if (mtab) {
    const uid = mtab.getAttribute('data-mtab'), pane = mtab.getAttribute('data-pane');
    $$('[data-mtab="' + uid + '"]').forEach(b => b.classList.toggle('on', b === mtab));
    $$('[data-mpane^="' + uid + '-"]').forEach(p => { p.style.display = p.getAttribute('data-mpane') === uid + '-' + pane ? '' : 'none'; });
    return;
  }
  // meta map nodes
  const mmap = e.target.closest('[data-mmap]');
  if (mmap) {
    const uid = mmap.getAttribute('data-mmap'), ni = +mmap.getAttribute('data-node');
    const w = MW_BY_UID[uid], it = w && w.items && w.items[ni];
    $$('[data-mmap="' + uid + '"]').forEach(b => b.classList.toggle('on', b === mmap));
    const p = document.querySelector('[data-mpanel="' + uid + '"]');
    if (p && it) p.innerHTML = '<b>' + esc(it[0]) + '</b><p>' + esc(it[1] || '') + '</p>' +
      (it[2] ? '<p class="mt-2" style="margin-bottom:0"><a href="#/meta/m/' + esc(it[2]) + '">Open module →</a></p>' : '');
    return;
  }
  // quiz
  const qc = e.target.closest('[data-quiz-check]');
  if (qc) {
    const box = qc.closest('.quiz');
    const key = box.getAttribute('data-quiz');
    const course = key.indexOf('gq-') === 0 ? 'google' : 'meta';
    const mid = key.replace(/^[gm]q-/, '');
    const m = COURSES[course].data().modules.find(x => x.id === mid);
    if (m) gradeQuiz(box, m.quiz);
    return;
  }
  const qr = e.target.closest('[data-quiz-retake]');
  if (qr) { retakeQuiz(qr.closest('.quiz')); return; }
  // copy / download templates
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    const pre = document.getElementById(cp.getAttribute('data-copy'));
    if (pre) {
      const done = () => { cp.textContent = '✓ Copied'; setTimeout(() => { cp.textContent = '⧉ Copy'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pre.textContent).then(done, done);
      else { const ta = document.createElement('textarea'); ta.value = pre.textContent; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) {} ta.remove(); done(); }
    }
    return;
  }
  const dl = e.target.closest('[data-dl]');
  if (dl) {
    const pre = document.getElementById(dl.getAttribute('data-dl'));
    if (pre) {
      const blob = new Blob([pre.textContent], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (dl.getAttribute('data-fname') || 'template') + '.txt';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    }
    return;
  }
});

// widget lookup across google lib + module widgets
const WIDGET_CACHE = {};
function widgetByUid(uid) {
  if (MW_BY_UID[uid]) return MW_BY_UID[uid];
  if (WIDGET_CACHE[uid]) return WIDGET_CACHE[uid];
  const W = GWIDGETS || {};
  for (const k of Object.keys(W)) {
    if (uid === 'lib-' + k || uid.endsWith('-' + k)) { WIDGET_CACHE[uid] = W[k]; return W[k]; }
  }
  return null;
}

document.addEventListener('change', e => {
  const cb = e.target.closest('.sec-check input[type="checkbox"]');
  if (!cb) return;
  const parts = cb.getAttribute('data-pkey').split(':'); // course:mid:sid
  setDone(parts[0], parts[1], parts.slice(2).join(':'), cb.checked);
  const box = cb.closest('[data-secbox]');
  if (box) box.classList.toggle('done', cb.checked);
  refreshProgress(parts[0]);
});

document.addEventListener('input', e => {
  if (e.target.id === 'gq') {
    const q = e.target.value.trim().toLowerCase();
    $$('#glist .gloss-item').forEach(el => {
      el.style.display = !q || el.getAttribute('data-term').includes(q) ? '' : 'none';
    });
  }
  if (e.target.id === 'search-input') runSearch(e.target.value);
});

document.addEventListener('keydown', e => {
  // ⌘K / Ctrl+K opens search from anywhere
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
  const o = $('#search-overlay');
  if (!o || !o.classList.contains('open')) return;
  if (e.key === 'Escape') { closeSearch(); return; }
  if (e.target.id === 'search-input') {
    if (e.key === 'ArrowDown') { e.preventDefault(); searchSel = Math.min(searchHits.length - 1, searchSel + 1); renderSearchResults(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); searchSel = Math.max(0, searchSel - 1); renderSearchResults(); }
    else if (e.key === 'Enter') goSearchHit(searchSel);
  }
});

/* ---------------- boot ---------------- */
window.addEventListener('hashchange', () => {
  // in-page anchors on the landing must jump, not re-render
  if (location.hash === '#courses') return;
  render();
});
applyTheme();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
else render();

})();
