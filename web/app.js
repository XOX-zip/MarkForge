/* =====================================================================
   MarkForge · app.js
   Author: MarkSkecher
   ===================================================================== */
(() => {
'use strict';

/* ═══════════════════════════════════════════════════════════
   0. 工具函数
   ═══════════════════════════════════════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return { r: 75, g: 123, b: 255 };
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}
function shadeHex(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => clamp(Math.round(c + (factor > 0 ? (255 - c) * factor : c * factor)), 0, 255);
  return '#' + [f(r), f(g), f(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

/* ═══════════════════════════════════════════════════════════
   1. 设置系统
   ═══════════════════════════════════════════════════════════ */
const DEFAULTS = {
  accent: '#4b7bff',
  font: 'mono',
  tabSize: 2,
  fontSize: 13.5,
  lineHeight: 1.75,
  previewWidth: 1400,
  renderDelay: 40,
  syncScroll: true,
  wrap: true,
  showGutter: true,
  spellcheck: false,
  smoothScroll: true,
  typewriter: false,
  focusMode: false,
  showGoalInStatus: true,
  zoom: 1,
  panels: { appearance: true },
  goal: { day: '', words: 0, chars: 0 },
  view: 'split',
  theme: 'system'
};

/* 今日写作目标：按本地日期归零 */
function localDayKey(d = new Date()) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function normalizeGoal(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const n = (v) => {
    const x = Math.round(Number(v));
    return isFinite(x) && x > 0 ? Math.min(x, 1e7) : 0;
  };
  return {
    day: typeof src.day === 'string' ? src.day : '',
    words: n(src.words),
    chars: n(src.chars)
  };
}

let settings = { ...DEFAULTS };
try {
  const raw = localStorage.getItem('mf-settings');
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
  const storedAccent = localStorage.getItem('mf-accent');
  if (storedAccent) settings.accent = storedAccent;
  const storedTheme = localStorage.getItem('mf-theme');
  if (storedTheme) settings.theme = storedTheme;
} catch (e) {}

/* 读档后清洗：避免旧版本或损坏的数据把界面带偏 */
(function sanitizeSettings() {
  const num = (v, d, a, b) => (typeof v === 'number' && isFinite(v) ? clamp(v, a, b) : d);
  const oneOf = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  settings.font = oneOf(settings.font, ['mono', 'sans', 'serif'], DEFAULTS.font);
  settings.view = oneOf(settings.view, ['editor', 'split', 'preview'], DEFAULTS.view);
  settings.theme = oneOf(settings.theme, ['light', 'dark', 'system'], DEFAULTS.theme);
  settings.tabSize = oneOf(settings.tabSize, [2, 4, 8], DEFAULTS.tabSize);
  settings.fontSize = num(settings.fontSize, DEFAULTS.fontSize, 11, 20);
  settings.lineHeight = num(settings.lineHeight, DEFAULTS.lineHeight, 1.3, 2.4);
  settings.previewWidth = num(settings.previewWidth, DEFAULTS.previewWidth, 560, 1400);
  settings.renderDelay = num(settings.renderDelay, DEFAULTS.renderDelay, 0, 200);
  settings.zoom = num(settings.zoom, DEFAULTS.zoom, 0.6, 1.6);
  if (typeof settings.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(settings.accent)) {
    settings.accent = DEFAULTS.accent;
  }
  ['syncScroll', 'wrap', 'showGutter', 'spellcheck', 'smoothScroll',
   'typewriter', 'focusMode', 'showGoalInStatus'].forEach(k => {
    if (typeof settings[k] !== 'boolean') settings[k] = DEFAULTS[k];
  });
  settings.goal = normalizeGoal(settings.goal);
  settings.panels = (settings.panels && typeof settings.panels === 'object')
    ? { ...DEFAULTS.panels, ...settings.panels }
    : { ...DEFAULTS.panels };
})();

const persistSettings = debounce(() => {
  try { localStorage.setItem('mf-settings', JSON.stringify(settings)); } catch (e) {}
}, 200);

/* ═══════════════════════════════════════════════════════════
   2. 主题系统
   ═══════════════════════════════════════════════════════════ */
const mq = window.matchMedia('(prefers-color-scheme: dark)');

function applyAccent(hex) {
  const rgb = hexToRgb(hex);
  const hover = shadeHex(hex, -0.12);
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-hover', hover);
  document.documentElement.style.setProperty('--accent-soft', `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`);
}

function applyTheme(mode) {
  settings.theme = mode;
  localStorage.setItem('mf-theme', mode);
  const dark = mode === 'dark' || (mode === 'system' && mq.matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  $$('[data-theme-opt]').forEach(b => b.classList.toggle('active', b.dataset.themeOpt === mode));
  const labels = { light: '浅色模式', dark: '深色模式', system: '跟随系统' };
  $('#sbTheme').textContent = labels[mode];
  $('#btnTheme').classList.toggle('active', mode !== 'system');
  persistSettings();
}
mq.addEventListener('change', () => { if (settings.theme === 'system') applyTheme('system'); });

function setAccent(hex) {
  settings.accent = hex;
  localStorage.setItem('mf-accent', hex);
  applyAccent(hex);
  $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.accent === hex));
  persistSettings();
}

/* ═══════════════════════════════════════════════════════════
   2.5 轻量语法高亮器
   ─────────────────────────────────────────────────────────
   · 按语言预编译正则数组，顺序敏感（注释/字符串必须最先）
   · LRU 缓存（Map 插入序），命中即刷新
   · 占位符使用纯大写字母，避免被后续数字/属性名正则误匹配
   ═══════════════════════════════════════════════════════════ */
const LANG_ALIAS = {
  js:'javascript', javascript:'javascript', mjs:'javascript', cjs:'javascript', jsx:'javascript',
  ts:'typescript', typescript:'typescript', tsx:'typescript',
  py:'python', python:'python',
  rb:'ruby', ruby:'ruby',
  sh:'bash', bash:'bash', shell:'bash', zsh:'bash',
  yml:'yaml', yaml:'yaml',
  html:'html', xml:'html', svg:'html',
  css:'css', scss:'css', less:'css',
  json:'json',
  md:'markdown', markdown:'markdown',
  sql:'sql', go:'go', rust:'rust', java:'java', c:'c', cpp:'cpp'
};

const LANG_RULES = {
  javascript: [
    [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, 'com'],
    [/(`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, 'str'],
    [/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|delete|void|yield|static|get|set)\b/g, 'kw'],
    [/\b(true|false|null|undefined|NaN|Infinity)\b/g, 'bool'],
    [/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, 'num'],
    [/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, 'fn']
  ],
  python: [
    [/(#[^\n]*)/g, 'com'],
    [/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, 'str'],
    [/\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|lambda|yield|global|nonlocal|pass|break|continue|raise|assert|del|in|is|not|and|or|async|await|self)\b/g, 'kw'],
    [/\b(True|False|None)\b/g, 'bool'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'num'],
    [/\b([A-Za-z_]\w*)(?=\s*\()/g, 'fn']
  ],
  bash: [
    [/(#[^\n]*)/g, 'com'],
    [/(`[^`]*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'str'],
    [/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|source|cd|echo|exit|set|local|readonly)\b/g, 'kw'],
    [/(\$\w+|\$\{[^}]+\})/g, 'prop'],
    [/\b(\d+)\b/g, 'num']
  ],
  html: [
    [/(&lt;!--[\s\S]*?--&gt;)/g, 'com'],
    [/(&lt;\/?)([a-zA-Z][\w-]*)/g, 'tag'],
    [/([a-zA-Z-]+)(?==)/g, 'attr'],
    [/(&quot;[^&]*?&quot;|'[^']*?')/g, 'str']
  ],
  css: [
    [/(\/\*[\s\S]*?\*\/)/g, 'com'],
    [/(&quot;[^&]*?&quot;|'[^']*?')/g, 'str'],
    [/([a-z-]+)(?=\s*:)/g, 'attr'],
    [/(#[0-9a-fA-F]{3,8})\b/g, 'num'],
    [/\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?)\b/g, 'num'],
    [/(\.[\w-]+|#[\w-]+|:[\w-]+)/g, 'kw']
  ],
  json: [
    [/("(?:\\.|[^"\\])*")(?=\s*:)/g, 'key'],
    [/("(?:\\.|[^"\\])*")/g, 'str'],
    [/\b(true|false|null)\b/g, 'bool'],
    [/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, 'num']
  ],
  markdown: [
    [/^(#{1,6}\s.+)$/gm, 'kw'],
    [/(\*\*[^*]+\*\*|__[^_]+__)/g, 'kw'],
    [/(`[^`]+`)/g, 'str']
  ],
  sql: [
    [/(--[^\n]*|\/\*[\s\S]*?\*\/)/g, 'com'],
    [/('(?:[^'\\]|\\.)*')/g, 'str'],
    [/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INTO|VALUES|SET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|AS|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|INDEX|DISTINCT|COUNT|SUM|AVG|MAX|MIN)\b/gi, 'kw'],
    [/\b(\d+)\b/g, 'num']
  ],
  go: [
    [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, 'com'],
    [/(`[^`]*`|"(?:[^"\\]|\\.)*")/g, 'str'],
    [/\b(package|import|func|var|const|type|struct|interface|map|chan|go|defer|return|if|else|for|range|switch|case|default|break|continue|select|goto|nil|true|false|make|new|len|cap|append)\b/g, 'kw'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'num']
  ],
  rust: [
    [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, 'com'],
    [/("(?:[^"\\]|\\.)*")/g, 'str'],
    [/\b(fn|let|mut|const|static|struct|enum|impl|trait|pub|use|mod|match|if|else|for|while|loop|return|break|continue|as|where|self|Self|true|false|Some|None|Ok|Err)\b/g, 'kw'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'num']
  ],
  java: [
    [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, 'com'],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'str'],
    [/\b(public|private|protected|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|static|final|void|int|long|double|float|boolean|char|String|true|false|null|this|super|import|package)\b/g, 'kw'],
    [/\b(\d+(?:\.\d+)?[fFdDlL]?)\b/g, 'num']
  ],
  c: [
    [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, 'com'],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'str'],
    [/\b(int|long|short|char|float|double|void|unsigned|signed|const|static|struct|union|enum|typedef|return|if|else|for|while|do|switch|case|break|continue|goto|sizeof|include|define|ifdef|ifndef|endif)\b/g, 'kw'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'num']
  ],
  ruby: [
    [/(#[^\n]*)/g, 'com'],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'str'],
    [/\b(def|class|module|end|if|elsif|else|unless|while|until|for|do|return|yield|begin|rescue|ensure|raise|require|include|extend|attr_accessor|attr_reader|attr_writer|true|false|nil|self|new)\b/g, 'kw'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'num']
  ],
  yaml: [
    [/(#[^\n]*)/g, 'com'],
    [/^\s*([\w.-]+)(?=\s*:)/gm, 'key'],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'str'],
    [/\b(true|false|null|yes|no)\b/g, 'bool'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'num']
  ]
};
LANG_RULES.typescript = LANG_RULES.javascript;
LANG_RULES.cpp = LANG_RULES.c;

/* LRU 缓存 */
const HL_CACHE = new Map();
const HL_CACHE_MAX = 120;

function hlKey(i) {
  // 0->A, 1->B, ..., 25->Z, 26->AA ...
  let s = '';
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26);
  } while (i > 0);
  return s;
}

function highlightCode(code, lang) {
  const key = lang + '\u0000' + code;
  const cached = HL_CACHE.get(key);
  if (cached !== undefined) {
    HL_CACHE.delete(key);
    HL_CACHE.set(key, cached);
    return cached;
  }

  const result = doHighlight(code, lang);

  if (HL_CACHE.size >= HL_CACHE_MAX) {
    const iter = HL_CACHE.keys();
    for (let i = 0; i < 30; i++) {
      const k = iter.next().value;
      if (k === undefined) break;
      HL_CACHE.delete(k);
    }
  }
  HL_CACHE.set(key, result);
  return result;
}

function doHighlight(code, lang) {
  const canonical = LANG_ALIAS[lang] || lang;
  const rules = LANG_RULES[canonical];
  // 未收录语言 / 超长代码直接转义，避免拖慢渲染
  if (!rules || code.length > 6000) return escapeHtml(code);

  const tokens = [];
  let text = code;

  for (let r = 0; r < rules.length; r++) {
    const re = rules[r][0];
    const cls = rules[r][1];
    re.lastIndex = 0;
    text = text.replace(re, (m) => {
      const id = '\u0001' + hlKey(tokens.length) + '\u0001';
      tokens.push('<span class="tok-' + cls + '">' + escapeHtml(m) + '</span>');
      return id;
    });
  }

  // 剩余部分转义（占位符是 \u0001+大写字母+\u0001，不会被 escapeHtml 破坏）
  text = escapeHtml(text);
  return text.replace(/\u0001([A-Z]+)\u0001/g, (_, k) => {
    let i = 0;
    for (let j = 0; j < k.length; j++) i = i * 26 + (k.charCodeAt(j) - 64);
    return tokens[i - 1];
  });
}

/* ═══════════════════════════════════════════════════════════
   3. Markdown 解析器
   ═══════════════════════════════════════════════════════════ */
function inline(text) {
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (m, c) => {
    codes.push(c);
    return '\u0000C' + (codes.length - 1) + '\u0000';
  });

  text = escapeHtml(text);

  text = text.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)[^)]*\)/g,
    (m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy">`);
  text = text.replace(/\[([^\]]+)\]\(\s*([^)\s]+)[^)]*\)/g,
    (m, txt, href) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${txt}</a>`);
  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g,
    (m, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

  text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  text = text.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

  text = text.replace(/\n/g, '<br>');
  text = text.replace(/\u0000C(\d+)\u0000/g,
    (m, i) => `<code>${escapeHtml(codes[+i])}</code>`);
  return text;
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

function parseList(lines, i, indent, baseLine, attr) {
  const m0 = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+/);
  const ordered = /\d/.test(m0[2]);
  const startLine = baseLine + i;
  let html = ordered ? `<ol${attr(startLine)}>` : `<ul${attr(startLine)}>`;

  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (!m) break;
    const ind = m[1].length;
    if (ind < indent) break;

    if (ind > indent) {
      const [sub, ni] = parseList(lines, i, ind, baseLine, attr);
      html = html.replace(/<\/li>\s*$/, sub + '</li>');
      i = ni;
      continue;
    }

    let content = m[3];
    let checkbox = '';
    const tm = content.match(/^\[([ xX])\]\s*(.*)$/);
    if (tm) {
      checkbox = `<input type="checkbox" disabled${tm[1].toLowerCase() === 'x' ? ' checked' : ''}>`;
      content = tm[2];
    }

    i++;
    while (i < lines.length &&
           /^\s{2,}\S/.test(lines[i]) &&
           !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
      content += '\n' + lines[i].trim();
      i++;
    }

    const inner = inline(content);
    html += checkbox
      ? `<li><label class="md-task">${checkbox}<span>${inner}</span></label></li>`
      : `<li>${inner}</li>`;
  }

  html += ordered ? '</ol>' : '</ul>';
  return [html, i];
}

function renderMarkdown(src, baseLine = 0) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  let i = 0;
  const hasLine = baseLine >= 0;
  const attr = (n) => hasLine ? ` data-line="${n}"` : '';

  while (i < lines.length) {
    const line = lines[i];
    const lineNo = baseLine + i;

    // 围栏代码块
    let m = line.match(/^\s*```\s*([\w+#.-]*)\s*$/);
    if (m) {
      const lang = m[1];
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;
      const rawCode = buf.join('\n');
      const inner = lang ? highlightCode(rawCode, lang.toLowerCase()) : escapeHtml(rawCode);
      html += `<pre${attr(lineNo)}${lang ? ` data-lang="${lang}"` : ''}><code>${inner}</code></pre>`;
      continue;
    }

    if (/^\s*$/.test(line)) { i++; continue; }

    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      html += `<hr${attr(lineNo)}>`; i++; continue;
    }

    m = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (m) {
      const lvl = m[1].length;
      html += `<h${lvl}${attr(lineNo)}>${inline(m[2])}</h${lvl}>`;
      i++; continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const startLine = lineNo;
      const buf = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
        i++;
      }
      // 引用块内部不再打行号，避免与外部锚点冲突
      html += `<blockquote${attr(startLine)}>${renderMarkdown(buf.join('\n'), -1)}</blockquote>`;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length &&
        /^[\s|:-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-') && lines[i + 1].includes('|')) {
      const startLine = lineNo;
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map(c => {
        const t = c.trim();
        const l = t.startsWith(':'), r = t.endsWith(':');
        return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i])); i++;
      }
      html += `<table${attr(startLine)}><thead><tr>`;
      header.forEach((c, k) => {
        html += `<th${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(c)}</th>`;
      });
      html += '</tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr>';
        for (let k = 0; k < header.length; k++) {
          html += `<td${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(r[k] || '')}</td>`;
        }
        html += '</tr>';
      });
      html += '</tbody></table>';
      continue;
    }

    if (/^\s{0,3}([-*+]|\d+[.)])\s+/.test(line)) {
      const startLine = lineNo;
      const baseIndent = line.match(/^\s*/)[0].length;
      const [h, ni] = parseList(lines, i, baseIndent, baseLine, attr);
      html += h;
      i = ni;
      continue;
    }

    const startLine = lineNo;
    const buf = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) &&
           !/^\s{0,3}#{1,6}\s+/.test(lines[i]) &&
           !/^\s*```/.test(lines[i]) &&
           !/^\s{0,3}>/.test(lines[i]) &&
           !/^\s{0,3}([-*+]|\d+[.)])\s+/.test(lines[i]) &&
           !/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    html += `<p${attr(startLine)}>${inline(buf.join('\n'))}</p>`;
  }
  return html;
}
/* ═══════════════════════════════════════════════════════════
   4. DOM 引用
   ═══════════════════════════════════════════════════════════ */
const editor = $('#editor');
const preview = $('#preview');
const gutter = $('#gutter');
const outlineEl = $('#outline');
const workspace = $('#workspace');
const tab = $('#tab');
const tabName = $('#tabName');
const toastContainer = $('#toastContainer');

/* v1.2 新增引用 */
const editorWrap = $('.editor-wrap');
const editorStage = $('.editor-stage');
const editorOverlay = $('#editorOverlay');
const focusBand = $('#focusBand');
const findbar = $('#findbar');
const findInput = $('#findInput');
const replaceInput = $('#replaceInput');
const findCountEl = $('#findCount');
const outlineFilterEl = $('#outlineFilter');
const outlineFilterWrap = $('.outline-filter');
const goalWordsEl = $('#goalWords');
const goalCharsEl = $('#goalChars');
const goalBarWords = $('#goalBarWords');
const goalBarChars = $('#goalBarChars');
const goalWordsText = $('#goalWordsText');
const goalCharsText = $('#goalCharsText');
const goalWordsPct = $('#goalWordsPct');
const goalCharsPct = $('#goalCharsPct');

/* ═══════════════════════════════════════════════════════════
   5. Toast 系统
   ═══════════════════════════════════════════════════════════ */
const TOAST_ICONS = {
  info: '<path d="M10 14.5v-4.5M10 6.6v.1"/>',
  success: '<path d="M4.5 10.2l3.6 3.6 7.4-7.4"/>',
  warn: '<path d="M10 6v5M10 14.2v.1"/>'
};

function toast(message, type = 'info', duration = 2200) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">
      <svg viewBox="0 0 20 20">${TOAST_ICONS[type] || TOAST_ICONS.info}</svg>
    </span>
    <span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/* ═══════════════════════════════════════════════════════════
   6. 渲染引擎（延迟节流 + rAF）
   ═══════════════════════════════════════════════════════════ */
let renderTimer = null;
let lastRenderTime = 0;
let pendingMetaTimer = null;

function scheduleRender() {
  const delay = settings.renderDelay;
  const now = performance.now();
  const elapsed = now - lastRenderTime;

  if (renderTimer) return;

  if (elapsed >= delay) {
    doRender();
  } else {
    renderTimer = setTimeout(() => {
      renderTimer = null;
      doRender();
    }, delay - elapsed);
  }
}

function doRender() {
  lastRenderTime = performance.now();
  preview.innerHTML = renderMarkdown(editor.value);
  decorateCodeBlocks();
  updateGutter();
  syncEditorScroll();
  if (find.active) refreshFind();
  scheduleCaretUI();
  requestAnimationFrame(updateScrollMax);

  clearTimeout(pendingMetaTimer);
  pendingMetaTimer = setTimeout(() => {
    updateOutline();
    updateStats();
  }, 180);
}

function updateGutter() {
  if (!settings.showGutter) return;
  const n = editor.value.split('\n').length;
  const currentCount = gutter.childElementCount;
  if (n === currentCount) {
    gutter.scrollTop = editor.scrollTop;
    return;
  }
  if (n > currentCount) {
    let frag = '';
    for (let i = currentCount + 1; i <= n; i++) frag += `<div>${i}</div>`;
    gutter.insertAdjacentHTML('beforeend', frag);
  } else {
    while (gutter.childElementCount > n) gutter.lastElementChild.remove();
  }
  gutter.scrollTop = editor.scrollTop;
}

/* ─── 大纲：树形折叠 + 筛选 ─── */
let headings = [];
const olCollapsed = new Set();
let outlineFilter = '';

function collectHeadings() {
  const lines = editor.value.split('\n');
  const out = [];
  let inCode = false;
  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    if (/^\s*```/.test(l)) inCode = !inCode;
    if (inCode) continue;
    const m = l.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (m) {
      const text = m[2].replace(/[*_`~]/g, '').trim();
      out.push({ line: idx, level: m[1].length, text });
    }
  }
  return out;
}

function buildOutlineHTML(list) {
  if (!list.length) {
    return '<div class="empty">' + (outlineFilter ? '没有匹配的标题' : '暂无标题') + '</div>';
  }
  const rows = [];
  let hasTree = false;
  // activeLvl：当前可见章节的层级；比它更深的后代会被折叠隐藏
  let activeLvl = null;
  list.forEach((h, i) => {
    const child = i + 1 < list.length && list[i + 1].level > h.level;
    if (child) hasTree = true;
    const hidden = activeLvl !== null && h.level > activeLvl;
    const text = h.text.length > 42 ? h.text.slice(0, 41) + '…' : h.text;
    rows.push(
      '<div class="outline-item lv' + h.level + (child ? ' has-child' : '') +
      (hidden ? ' child-hidden' : '') +
      (child && olCollapsed.has(h.level) ? ' collapsed' : '') + '" data-line="' + h.line +
      '" data-level="' + h.level + '" title="' + escapeHtml(h.text) + '">' +
      '<span class="ol-toggle' + (child ? '' : ' leaf') + '" data-toggle="1">' +
      '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.6L6 7.6l3-3"/></svg>' +
      '</span><span class="txt">' + escapeHtml(text) + '</span></div>'
    );
    activeLvl = olCollapsed.has(h.level) ? h.level : null;
  });
  return (hasTree ? '<div class="ol-tree">' : '') + rows.join('') +
    (hasTree ? '</div>' : '');
}

function renderOutlineList() {
  const list = outlineFilter
    ? headings.filter(h => h.text.toLowerCase().indexOf(outlineFilter) !== -1)
    : headings;
  outlineEl.innerHTML = buildOutlineHTML(list);
  outlineEl.classList.toggle('has-tree',
    list.some((h, i) => i + 1 < list.length && list[i + 1].level > h.level));
}

function toggleOutlineItem(level) {
  if (olCollapsed.has(level)) olCollapsed.delete(level);
  else olCollapsed.add(level);
  renderOutlineList();
}

function setOutlineAll(collapsed) {
  olCollapsed.clear();
  if (collapsed) {
    for (let i = 0; i < headings.length - 1; i++) {
      if (headings[i + 1].level > headings[i].level) olCollapsed.add(headings[i].level);
    }
  }
  renderOutlineList();
}

function flashOutlineItem(line) {
  const el = outlineEl.querySelector('.outline-item[data-line="' + line + '"]');
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 900);
}

function updateOutline() {
  headings = collectHeadings();
  renderOutlineList();
}

function bindOutlineUI() {
  outlineFilterEl.addEventListener('input', () => {
    outlineFilter = outlineFilterEl.value.trim().toLowerCase();
    outlineFilterWrap.classList.toggle('filled', !!outlineFilter);
    renderOutlineList();
  });

  $('#outlineClear').addEventListener('click', () => {
    outlineFilterEl.value = '';
    outlineFilter = '';
    outlineFilterWrap.classList.remove('filled');
    renderOutlineList();
    outlineFilterEl.focus();
  });

  $('#outlineAll').addEventListener('click', () => setOutlineAll(false));
  $('#outlineCollapse').addEventListener('click', () => setOutlineAll(true));
}

/* ─── 写作目标 ─── */
function ensureGoalDay() {
  const day = localDayKey();
  if (settings.goal.day !== day) {
    settings.goal.day = day;
    settings.goal.words = 0;
    settings.goal.chars = 0;
    persistSettings();
  }
}

function updateGoalUI() {
  const g = settings.goal;
  // 正在输入时不要回写输入框，否则会打断输入
  if (document.activeElement !== goalWordsEl) goalWordsEl.value = g.words || '';
  if (document.activeElement !== goalCharsEl) goalCharsEl.value = g.chars || '';
  const setBar = (bar, val, target) => {
    const pct = target > 0 ? clamp(val / target, 0, 1) : 0;
    bar.firstElementChild.style.width = (pct * 100).toFixed(1) + '%';
    bar.classList.toggle('idle', !target);
    bar.classList.toggle('done', target > 0 && val >= target);
    return target > 0 ? Math.round(val / target * 100) + '%' : '—';
  };
  const pctW = setBar(goalBarWords, currentStats.words, g.words);
  const pctC = setBar(goalBarChars, currentStats.chars, g.chars);
  goalWordsPct.textContent = pctW;
  goalCharsPct.textContent = pctC;
  goalWordsText.textContent = g.words
    ? '今日字数 · ' + currentStats.words.toLocaleString() + ' / ' + g.words.toLocaleString()
    : '今日字数 · 未设目标';
  goalCharsText.textContent = g.chars
    ? '今日字符 · ' + currentStats.chars.toLocaleString() + ' / ' + g.chars.toLocaleString()
    : '今日字符 · 未设目标';
  goalWordsEl.closest('.goal-field').classList.toggle('done', g.words > 0 && currentStats.words >= g.words);
  goalCharsEl.closest('.goal-field').classList.toggle('done', g.chars > 0 && currentStats.chars >= g.chars);
  updateStatusGoal();
}

function updateStatusGoal() {
  const el = $('#sbGoal');
  const sep = $('#sbGoalSep');
  const g = settings.goal;
  const show = settings.showGoalInStatus && (g.words > 0 || g.chars > 0);
  el.hidden = !show;
  sep.hidden = !show;
  if (!show) return;
  const useWords = g.words > 0;
  const val = useWords ? currentStats.words : currentStats.chars;
  const target = useWords ? g.words : g.chars;
  const pct = target > 0 ? clamp(val / target, 0, 1) : 0;
  el.classList.toggle('done', target > 0 && val >= target);
  el.innerHTML =
    '<span class="g-bar"><i style="width:' + (pct * 100).toFixed(1) + '%"></i></span>' +
    '<span>' + (useWords ? '字数' : '字符') + '</span>' +
    '<b>' + val.toLocaleString() + ' / ' + target.toLocaleString() + '</b>' +
    '<span>' + Math.round(pct * 100) + '%</span>';
}

function bindGoalUI() {
  const onGoalInput = () => {
    ensureGoalDay();
    const w = Math.max(0, Math.floor(Number(goalWordsEl.value) || 0));
    const c = Math.max(0, Math.floor(Number(goalCharsEl.value) || 0));
    settings.goal.words = w > 0 ? w : 0;
    settings.goal.chars = c > 0 ? c : 0;
    persistSettings();
    updateGoalUI();
    flashHint(w || c ? '写作目标已更新' : '写作目标已清空');
  };
  goalWordsEl.addEventListener('input', onGoalInput);
  goalCharsEl.addEventListener('input', onGoalInput);

  $('#btnGoalClear').addEventListener('click', () => {
    settings.goal.words = 0;
    settings.goal.chars = 0;
    persistSettings();
    updateGoalUI();
    flashHint('写作目标已清空');
  });

  $('#sbGoal').addEventListener('click', () => {
    if ($('#rightPanel').classList.contains('collapsed')) toggleRight();
    setTimeout(() => {
      goalWordsEl.focus();
      goalWordsEl.select();
    }, 280);
  });
}

function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const latin = (text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .match(/[A-Za-z0-9_'’-]+/g) || []).length;
  return cjk + latin;
}

const currentStats = { words: 0, chars: 0, lines: 0, paras: 0, heads: 0 };

function updateStats() {
  const md = editor.value;
  const words = countWords(md);
  currentStats.words = words;
  currentStats.chars = md.length;
  currentStats.lines = md.split('\n').length;
  currentStats.paras = md.split(/\n\s*\n/).filter(p => p.trim()).length;
  currentStats.heads = (md.match(/^\s{0,3}#{1,6}\s+/gm) || []).length;
  $('#stWords').textContent = words.toLocaleString();
  $('#stChars').textContent = md.length.toLocaleString();
  $('#stLines').textContent = currentStats.lines.toLocaleString();
  $('#stParas').textContent = currentStats.paras.toLocaleString();
  $('#stHeads').textContent = currentStats.heads.toLocaleString();
  $('#stRead').textContent = Math.max(1, Math.round(words / 300)) + ' 分钟';
  updateGoalUI();
}

function updateCursor() {
  const pos = editor.selectionStart;
  const before = editor.value.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  $('#sbLine').textContent = line;
  $('#sbCol').textContent = col;
  $('#sbSel').textContent = Math.abs(editor.selectionEnd - editor.selectionStart);
}

/* ═══════════════════════════════════════════════════════════
   7. 滚动同步（按比例映射 · 即时写入，避免平滑回环）
   ─────────────────────────────────────────────────────────
   · scrollTop / scrollHeight 求比例映射到另一栏
   · 程序化滚动一律即时（绕过 CSS smooth），杜绝动画回灌抽搐
   · 最后操作方持锁，另一栏的回声 scroll 事件被忽略
   ═══════════════════════════════════════════════════════════ */
let scrollMax = { editor: 0, preview: 0 };
let scrollDriver = null;   // 'editor' | 'preview' | null
let driverTimer = null;
let navJump = false;       // 大纲导航中：暂停 editor→preview 同步，交由 navPreview 平滑处理

function updateScrollMax() {
  scrollMax.editor  = Math.max(0, editor.scrollHeight  - editor.clientHeight);
  scrollMax.preview = Math.max(0, preview.scrollHeight - preview.clientHeight);
}

/* 取锁：谁在驱动滚动，持锁窗口内另一栏的回声事件被忽略 */
function takeDriver(who, hold = 120) {
  scrollDriver = who;
  clearTimeout(driverTimer);
  driverTimer = setTimeout(() => { scrollDriver = null; }, hold);
}

/* 即时滚动（忽略 CSS scroll-behavior:smooth），避免平滑动画产生回灌事件 */
function scrollToInstant(el, top) {
  const prev = el.style.scrollBehavior;
  el.style.scrollBehavior = 'auto';
  el.scrollTop = top;
  el.style.scrollBehavior = prev;
}

editor.addEventListener('scroll', () => {
  if (settings.showGutter) gutter.scrollTop = editor.scrollTop;
  if (navJump) return;
  if (!settings.syncScroll) return;
  if (scrollDriver === 'preview') return;   // 由预览驱动，忽略回声
  takeDriver('editor');
  if (scrollMax.editor <= 0 || scrollMax.preview <= 0) return;
  scrollToInstant(preview, (editor.scrollTop / scrollMax.editor) * scrollMax.preview);
}, { passive: true });

preview.addEventListener('scroll', () => {
  if (!settings.syncScroll) return;
  if (scrollDriver === 'editor') return;    // 由编辑器驱动，忽略回声
  takeDriver('preview');
  if (scrollMax.editor <= 0 || scrollMax.preview <= 0) return;
  scrollToInstant(editor, (preview.scrollTop / scrollMax.preview) * scrollMax.editor);
  if (settings.showGutter) gutter.scrollTop = editor.scrollTop;
}, { passive: true });

window.addEventListener('resize', () => {
  requestAnimationFrame(() => {
    layoutEditorOverlay();
    updateScrollMax();
    syncEditorScroll();
    updateFocusBand();
  });
}, { passive: true });

/* ═══════════════════════════════════════════════════════════
   7.5 镜像高亮层 · 专注模式 · 打字机模式
   ─────────────────────────────────────────────────────────
   · 镜像层与 #editor 同字体、同内边距、同换行规则，只负责画高亮
   · 滚动位置由编辑器单向驱动，避免任何回环
   ═══════════════════════════════════════════════════════════ */
let overlayPadX = 28;
let focusOn = false;

function layoutEditorOverlay() {
  const cs = getComputedStyle(editor);
  ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
   'lineHeight', 'textTransform', 'textIndent', 'wordSpacing'].forEach(p => {
    editorOverlay.style[p] = cs[p];
  });
  editorOverlay.style.tabSize = settings.tabSize;
  editorOverlay.style.padding = cs.padding;
  overlayPadX = parseFloat(cs.paddingLeft) || 0;

  editorOverlay.classList.toggle('nowrap', !settings.wrap);
  if (settings.wrap) {
    editorOverlay.style.whiteSpace = '';
    editorOverlay.style.width = (editor.clientWidth - 2 * overlayPadX) + 'px';
  } else {
    // 不换行：先解开约束量一次真实内容宽度，再定宽（量完清掉内联样式，交回给样式表）
    editorOverlay.style.whiteSpace = 'pre-wrap';
    editorOverlay.style.width = 'auto';
    const w = Math.max(editorOverlay.scrollWidth, editor.clientWidth - 2 * overlayPadX);
    editorOverlay.style.whiteSpace = '';
    editorOverlay.style.width = w + 'px';
  }
  syncEditorScroll();
}

function syncEditorScroll() {
  editorOverlay.style.height = editor.clientHeight + 'px';
  editorOverlay.scrollTop = editor.scrollTop;
  editorOverlay.scrollLeft = editor.scrollLeft;
}

function renderEditorOverlay() {
  if (!editorOverlay) return;
  if (!find.active) { editorOverlay.innerHTML = ''; return; }
  const src = editor.value;
  let html = '';
  let from = 0;
  find.matches.forEach((m, i) => {
    if (m.start < from) return;
    html += escapeHtml(src.slice(from, m.start)) +
      '<mark' + (i === find.index ? ' class="cur"' : '') + '>' +
      escapeHtml(src.slice(m.start, m.start + m.len)) + '</mark>';
    from = m.start + m.len;
  });
  if (from === 0) { editorOverlay.innerHTML = ''; return; }
  html += escapeHtml(src.slice(from));
  editorOverlay.innerHTML = html;
}

/* 光标纵向位置的估算（考虑自动换行）：字符数 → 视觉行 → 像素 */
function caretMetrics() {
  const before = editor.value.slice(0, editor.selectionStart);
  const nl = before.lastIndexOf('\n');
  const col = nl === -1 ? before.length : before.length - nl - 1;
  const lineH = parseFloat(getComputedStyle(editor).lineHeight) || 22;
  const charW = (parseFloat(getComputedStyle(editor).fontSize) || 13.5) * 0.6;
  const usable = Math.max(120, editor.clientWidth - 2 * overlayPadX);
  let rows = 0;
  before.split('\n').forEach(l => { rows += Math.max(1, Math.ceil((l.length + 1) * charW / usable)); });
  rows--;
  return { rows, lineH, top: rows * lineH };
}

function applyTypewriterCaret() {
  if (!settings.typewriter || workspace.dataset.view === 'preview') return;
  const { top, lineH } = caretMetrics();
  const target = top - editor.clientHeight * 0.45;
  const delta = target - editor.scrollTop;
  const dead = Math.max(12, lineH * 1.2);
  if (Math.abs(delta) < dead) return;
  takeDriver('editor', 220);
  scrollToInstant(editor, clamp(target, 0, scrollMax.editor || editor.scrollHeight));
  if (settings.showGutter) gutter.scrollTop = editor.scrollTop;
}

function updateFocusBand() {
  const on = settings.focusMode && focusOn && workspace.dataset.view !== 'preview';
  focusBand.classList.toggle('on', on);
  editorWrap.classList.toggle('focus-on', on);
  // 专注时也让预览区退到背景里，视线自然落回正在写的那一行
  $('#previewPane').classList.toggle('focus-dim', on && workspace.dataset.view !== 'editor');
  if (!on) return;
  const { lineH, top } = caretMetrics();
  focusBand.style.height = Math.max(20, lineH * 1.45) + 'px';
  focusBand.style.top = (top - editor.scrollTop - lineH * 0.225) + 'px';
}

let typewriterTimer = null;
function scheduleCaretUI() {
  clearTimeout(typewriterTimer);
  typewriterTimer = setTimeout(() => {
    applyTypewriterCaret();
    updateFocusBand();
  }, 70);
}

editor.addEventListener('focus', () => { focusOn = true; updateFocusBand(); });
editor.addEventListener('blur', () => { focusOn = false; updateFocusBand(); });
if (window.ResizeObserver) new ResizeObserver(() => layoutEditorOverlay()).observe(editorStage);

/* ═══════════════════════════════════════════════════════════
   7.6 查找与替换
   ─────────────────────────────────────────────────────────
   · 匹配位置索引来自源码本身，高亮交给镜像层
   · 正则模式支持 $1..$99 捕获组替换；选项即改即生效
   ═══════════════════════════════════════════════════════════ */
const FIND_MAX = 5000;
const find = { active: false, query: '', replacement: '', matches: [], index: -1, opts: { case: false, word: false, regex: false } };

function compileFind() {
  const q = find.query;
  if (!q) return null;
  let pattern;
  try {
    pattern = find.opts.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  } catch (e) { return null; }
  if (find.opts.word) pattern = '(?:' + pattern + ')';
  if (find.opts.word && !find.opts.regex) {
    pattern = '\\b' + pattern + '\\b';
  } else if (find.opts.word) {
    pattern = '(?:^|(?![\\w\\u4e00-\\u9fff]))(?:' + pattern + ')(?![\\w\\u4e00-\\u9fff])';
  }
  try {
    return new RegExp(pattern, 'g' + (find.opts.case ? '' : 'i'));
  } catch (e) { return null; }
}

function scanMatches() {
  find.matches = [];
  if (!find.query) return true;
  const re = compileFind();
  findInput.classList.toggle('invalid', !re && !!find.query);
  if (!re) return false;
  const src = editor.value;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    find.matches.push({ start: m.index, len: m[0].length, text: m[0] });
    if (find.matches.length >= FIND_MAX) break;
  }
  return true;
}

function markFindDirty() {
  findInput.classList.remove('invalid');
  findCountEl.textContent = '…';
}

function refreshFind(resetIndex = false) {
  if (!find.active || !find.query) {
    find.matches = [];
    find.index = -1;
    findCountEl.textContent = '0/0';
    renderEditorOverlay();
    updateFocusBand();
    return;
  }
  scanMatches();
  if (resetIndex) find.index = 0;
  find.index = find.matches.length ? clamp(find.index, 0, find.matches.length - 1) : -1;
  findCountEl.textContent = find.matches.length
    ? (find.index + 1) + '/' + find.matches.length + (find.matches.length >= FIND_MAX ? '+' : '')
    : '无结果';
  renderEditorOverlay();
  updateFocusBand();
}

function clearFindHighlight() {
  find.matches = [];
  find.index = -1;
  editorOverlay.innerHTML = '';
}

/* 把某个匹配滚到视口上方 1/3 处 */
function scrollMatchIntoView(m) {
  if (!m) return;
  const lineH = parseFloat(getComputedStyle(editor).lineHeight) || 22;
  const charW = (parseFloat(getComputedStyle(editor).fontSize) || 13.5) * 0.6;
  const usable = Math.max(120, editor.clientWidth - 2 * overlayPadX);
  const before = editor.value.slice(0, m.start);
  const nl = before.lastIndexOf('\n');
  const lineIdx = (before.match(/\n/g) || []).length;
  const col = nl === -1 ? before.length : before.length - nl - 1;
  const top = (lineIdx + col * charW / usable) * lineH - editor.clientHeight / 3;
  takeDriver('editor', 260);
  scrollToInstant(editor, clamp(top, 0, Math.max(0, editor.scrollHeight - editor.clientHeight)));
  if (settings.showGutter) gutter.scrollTop = editor.scrollTop;
}

function setFindIndex(i, opts = {}) {
  if (!find.matches.length) { find.index = -1; renderEditorOverlay(); return; }
  const n = find.matches.length;
  find.index = ((i % n) + n) % n;
  findCountEl.textContent = (find.index + 1) + '/' + n + (n >= FIND_MAX ? '+' : '');
  renderEditorOverlay();
  const m = find.matches[find.index];
  editor.focus();
  editor.setSelectionRange(m.start, m.start + m.len);
  updateCursor();
  scrollMatchIntoView(m);
  if (opts.scroll !== false) updateFocusBand();
}

function stepFind(dir) {
  if (!find.matches.length) return;
  setFindIndex(find.index + dir);
}

function expandReplacement(rep, m) {
  if (!find.opts.regex || rep.indexOf('$') === -1) return rep;
  const groups = m.groups || {};
  return rep
    .replace(/\$(\d{1,2})/g, (s, d) => {
      const i = +d;
      return i > 0 && i < m.length && m[i] != null ? m[i] : '';
    })
    .replace(/\$&/g, m[0])
    .replace(/\$\{(\w+)\}/g, (s, k) => (groups[k] != null ? groups[k] : ''));
}

function batchReplace(findRe, replacement) {
  const src = editor.value;
  findRe.lastIndex = 0;
  if (!findRe.test(src)) return 0;
  findRe.lastIndex = 0;
  let out = '';
  let last = 0;
  let n = 0;
  let m;
  while ((m = findRe.exec(src)) !== null) {
    if (m[0].length === 0) { findRe.lastIndex++; continue; }
    out += src.slice(last, m.index) + expandReplacement(replacement, m);
    last = m.index + m[0].length;
    n++;
    if (n >= FIND_MAX) break;
  }
  if (!n) return 0;
  setEditorValue(out + src.slice(last));
  return n;
}

function replaceOne() {
  if (!find.matches.length) { toast('没有可替换的匹配项', 'warn'); return; }
  const re = compileFind();
  if (!re) return;
  const m = find.matches[find.index];
  re.lastIndex = 0;
  let hit = null;
  let x;
  while ((x = re.exec(editor.value)) !== null) {
    if (x.index === m.start) { hit = x; break; }
    if (x.index > m.start || x[0].length === 0) break;
  }
  if (!hit) { refreshFind(); return; }
  const ins = expandReplacement(find.replacement, hit);
  const s = hit.index;
  const e = s + hit[0].length;
  editor.focus();
  editor.setSelectionRange(s, e);
  let ok = false;
  try { ok = document.execCommand('insertText', false, ins); } catch (err) { ok = false; }
  if (!ok) {
    editor.setRangeText(ins, s, e, 'end');
    editor.dispatchEvent(new Event('input'));
  }
  editor.setSelectionRange(s, s + ins.length);
  editor.dispatchEvent(new Event('select'));
  refreshFind();
  if (find.matches.length && find.index >= find.matches.length) find.index = 0;
  renderEditorOverlay();
}

function replaceAll() {
  const re = compileFind();
  if (!re || !find.query) { toast('请输入查找内容', 'warn'); return; }
  const n = batchReplace(re, find.replacement);
  if (!n) { toast('没有可替换的匹配项', 'warn'); return; }
  toast('已替换 ' + n + ' 处', 'success');
  refreshFind();
}

function selectAllMatches() {
  if (!find.matches.length) { toast('没有匹配项', 'warn'); return; }
  if (find.matches.length > 2000) { toast('匹配项过多，已跳过全选', 'warn'); return; }
  const first = find.matches[0];
  const last = find.matches[find.matches.length - 1];
  editor.focus();
  editor.setSelectionRange(first.start, last.start + last.len);
  updateCursor();
  toast('已选中 ' + find.matches.length + ' 处匹配', 'success');
}

function openFind(replaceFocus) {
  const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
  if (!find.active) {
    find.active = true;
    findbar.classList.add('show');
    editorWrap.classList.add('find-on');
    if (sel && sel.length <= 120 && !/[\n]/.test(sel)) findInput.value = sel;
    find.query = findInput.value;
    markFindDirty();
  }
  editorWrap.classList.add('find-on');
  syncEditorScroll();
  refreshFind();
  setTimeout(() => {
    (replaceFocus ? replaceInput : findInput).focus();
    (replaceFocus ? replaceInput : findInput).select();
  }, 20);
}

function closeFind() {
  find.active = false;
  findbar.classList.remove('show');
  editorWrap.classList.remove('find-on');
  clearFindHighlight();
  updateFocusBand();
  editor.focus();
}

function bindFindUI() {
  $('#btnFind').addEventListener('click', () => openFind(false));
  $('#findClose').addEventListener('click', closeFind);
  $('#findNext').addEventListener('click', () => stepFind(1));
  $('#findPrev').addEventListener('click', () => stepFind(-1));
  $('#replaceOne').addEventListener('click', replaceOne);
  $('#replaceAll').addEventListener('click', replaceAll);

  findInput.addEventListener('input', () => {
    find.query = findInput.value;
    markFindDirty();
    refreshFind(true);
  });

  replaceInput.addEventListener('input', () => { find.replacement = replaceInput.value; });

  findInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
  });
  replaceInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
  });

  $$('.find-opts [data-fopt]').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.fopt;
      if (k === 'selectAll') { selectAllMatches(); return; }
      find.opts[k] = !find.opts[k];
      b.classList.toggle('active', find.opts[k]);
      markFindDirty();
      refreshFind();
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   8. 编辑命令
   ═══════════════════════════════════════════════════════════ */
/* 整体替换文档内容：统一走 input 事件，保证渲染、脏标记、统计同步 */
function setEditorValue(text) {
  editor.value = text;
  editor.dispatchEvent(new Event('input'));
  updateCursor();
}

function insertText(text) {
  editor.focus();
  const ok = document.execCommand('insertText', false, text);
  if (!ok) {
    const s = editor.selectionStart, e = editor.selectionEnd;
    editor.setRangeText(text, s, e, 'end');
    editor.dispatchEvent(new Event('input'));
  }
}

function wrapSel(before, after, placeholder = '') {
  const s = editor.selectionStart, e = editor.selectionEnd;
  const sel = editor.value.slice(s, e);
  const inner = sel || placeholder;
  const text = before + inner + after;

  editor.focus();
  editor.setSelectionRange(s, e);
  const ok = document.execCommand('insertText', false, text);
  if (!ok) {
    editor.setRangeText(text, s, e, 'end');
    editor.dispatchEvent(new Event('input'));
  }

  let a, b;
  if (sel) { a = s + before.length; b = a + sel.length; }
  else { a = s + before.length; b = a + placeholder.length; }
  editor.setSelectionRange(a, b);
  updateCursor();
}

function toggleLinePrefix(prefix, type) {
  const s = editor.selectionStart, e = editor.selectionEnd;
  const val = editor.value;
  const ls = val.lastIndexOf('\n', s - 1) + 1;
  let le = val.indexOf('\n', e);
  if (le === -1) le = val.length;

  const block = val.slice(ls, le);
  const lines = block.split('\n');
  const re = type === 'ordered'
    ? /^\s*\d+[.)]\s+/
    : new RegExp('^\\s*' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const allHave = lines.every(l => re.test(l));
  let n = 0;

  const out = lines.map(l => {
    const cleaned = l.replace(re, '');
    if (allHave) return cleaned;
    if (type === 'ordered') return `${++n}. ${cleaned}`;
    return prefix + cleaned;
  }).join('\n');

  editor.focus();
  editor.setSelectionRange(ls, le);
  const ok = document.execCommand('insertText', false, out);
  if (!ok) {
    editor.setRangeText(out, ls, le, 'end');
    editor.dispatchEvent(new Event('input'));
  }
  editor.setSelectionRange(ls, ls + out.length);
}

function indentSelection(dir) {
  const s = editor.selectionStart, e = editor.selectionEnd;
  const val = editor.value;
  const ls = val.lastIndexOf('\n', s - 1) + 1;
  let le = val.indexOf('\n', e);
  if (le === -1) le = val.length;
  const block = val.slice(ls, le);
  const tab = ' '.repeat(settings.tabSize);
  const lines = block.split('\n');
  const out = lines.map(l => dir > 0
    ? tab + l
    : l.replace(new RegExp('^ {1,' + settings.tabSize + '}'), '')).join('\n');
  editor.focus();
  editor.setSelectionRange(ls, le);
  const ok = document.execCommand('insertText', false, out);
  if (!ok) {
    editor.setRangeText(out, ls, le, 'end');
    editor.dispatchEvent(new Event('input'));
  }
  editor.setSelectionRange(ls, ls + out.length);
}

const commands = {
  bold:      () => wrapSel('**', '**', '粗体文本'),
  italic:    () => wrapSel('*', '*', '斜体文本'),
  strike:    () => wrapSel('~~', '~~', '删除线文本'),
  mark:      () => wrapSel('==', '==', '高亮文本'),
  code:      () => wrapSel('`', '`', 'code'),
  h1:        () => toggleLinePrefix('# '),
  h2:        () => toggleLinePrefix('## '),
  h3:        () => toggleLinePrefix('### '),
  quote:     () => toggleLinePrefix('> '),
  ul:        () => toggleLinePrefix('- '),
  ol:        () => toggleLinePrefix('', 'ordered'),
  task:      () => toggleLinePrefix('- [ ] '),
  hr:        () => insertText('\n\n---\n\n'),
  link:      () => wrapSel('[', '](url)', '链接文字'),
  image:     () => wrapSel('![', '](url)', '图片描述'),
  codeblock: () => {
    const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
    insertText('\n```\n' + (sel || '// 在此输入代码') + '\n```\n');
  },
  table: () => insertText('\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |\n\n'),
  details: () => insertText('\n<details>\n<summary>点击展开</summary>\n\n折叠内容\n\n</details>\n\n'),
  datetime: () => insertText(new Date().toLocaleString('zh-CN', { hour12: false })),
  duplicate: () => duplicateLine(),
  deleteLine: () => deleteLine()
};

/* 整行操作：复制当前行 / 删除当前行 */
function lineRangeAtCaret() {
  const s = editor.selectionStart;
  const val = editor.value;
  const ls = val.lastIndexOf('\n', s - 1) + 1;
  let le = val.indexOf('\n', s);
  if (le === -1) le = val.length;
  return [ls, le];
}

function duplicateLine() {
  const [ls, le] = lineRangeAtCaret();
  const line = editor.value.slice(ls, le);
  editor.focus();
  editor.setSelectionRange(le, le);
  insertText('\n' + line);
  editor.setSelectionRange(ls + line.length + 1, le + line.length + 1);
  updateCursor();
}

function deleteLine() {
  const [ls, le] = lineRangeAtCaret();
  const val = editor.value;
  const tail = le < val.length ? 1 : 0;
  editor.focus();
  editor.setSelectionRange(ls, le + tail);
  let ok = false;
  try { ok = document.execCommand('delete'); } catch (err) { ok = false; }
  if (!ok) {
    editor.setRangeText('', ls, le + tail, 'start');
    editor.dispatchEvent(new Event('input'));
  }
  editor.setSelectionRange(ls, ls);
  updateCursor();
}

const CMD_LABELS = {
  bold: '加粗', italic: '斜体', strike: '删除线', mark: '高亮', code: '行内代码',
  h1: '一级标题', h2: '二级标题', h3: '三级标题', quote: '引用', ul: '无序列表',
  ol: '有序列表', task: '任务列表', hr: '分隔线', link: '链接', image: '图片',
  codeblock: '代码块', table: '表格', details: '折叠块', datetime: '日期时间',
  duplicate: '复制当前行', deleteLine: '删除当前行'
};

let hintTimer;
function flashHint(text) {
  const el = $('#tbHint');
  el.textContent = '✓ ' + text;
  el.style.color = 'var(--accent)';
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    el.textContent = '就绪';
    el.style.color = '';
  }, 1400);
}

function runCommand(name) {
  const fn = commands[name];
  if (!fn) return;
  fn();
  flashHint(CMD_LABELS[name] || name);
}

/* ═══════════════════════════════════════════════════════════
   9. 文件操作
   ═══════════════════════════════════════════════════════════ */
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* 复制到剪贴板：优先异步 API，降级到 execCommand（file:// 场景） */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      ok ? resolve() : reject(new Error('copy failed'));
    } catch (e) { reject(e); }
  });
}

/* 预览区代码块：悬停显示复制按钮 */
const COPY_ICON = '<svg viewBox="0 0 20 20"><rect x="7" y="7" width="9.4" height="9.4" rx="2"/>' +
  '<path d="M12.6 7V5.4a2 2 0 0 0-2-2H5.4a2 2 0 0 0-2 2v5.2a2 2 0 0 0 2 2H7"/></svg>';
const COPIED_ICON = '<svg viewBox="0 0 20 20"><path d="M4.5 10.4l3.6 3.6 7.4-7.6"/></svg>';

function decorateCodeBlocks() {
  $$('pre', preview).forEach(pre => {
    if (pre.querySelector(':scope > .code-copy')) return;
    const btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.innerHTML = COPY_ICON + '<span>复制</span>';
    pre.appendChild(btn);
  });
}

preview.addEventListener('click', e => {
  const btn = e.target.closest('.code-copy');
  if (!btn) return;
  const code = btn.parentElement.querySelector('code');
  const text = code ? code.innerText : '';
  copyText(text).then(() => {
    btn.classList.add('done');
    btn.innerHTML = COPIED_ICON + '<span>已复制</span>';
    setTimeout(() => {
      btn.classList.remove('done');
      btn.innerHTML = COPY_ICON + '<span>复制</span>';
    }, 1600);
  }).catch(() => toast('复制失败', 'warn'));
});

const baseName = () => (tabName.textContent || '未命名').replace(/\.md$/i, '');

function saveMarkdown() {
  download(baseName() + '.md', editor.value, 'text/markdown');
  setSaved();
  toast('已保存为 ' + baseName() + '.md', 'success');
}

function exportHtml() {
  const body = renderMarkdown(editor.value);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="author" content="MarkSkecher">
<title>${escapeHtml(baseName())}</title>
<style>
  body{max-width:820px;margin:0 auto;padding:48px 24px 120px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
    font-size:16px;line-height:1.78;color:${isDark ? '#e7e9ee' : '#1a1c21'};
    background:${isDark ? '#16181d' : '#ffffff'};}
  h1,h2{font-weight:680;border-bottom:1px solid ${isDark ? '#2d323b' : '#e3e5ea'};padding-bottom:.3em;margin:1.6em 0 .6em}
  h3,h4,h5,h6{font-weight:660;margin:1.5em 0 .6em}
  h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.25em}
  a{color:#4b7bff}
  code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.88em;
    background:${isDark ? '#171a1f' : '#f5f6f9'};padding:.15em .4em;border-radius:5px;
    border:1px solid ${isDark ? '#2d323b' : '#e3e5ea'}}
  pre{background:${isDark ? '#171a1f' : '#f5f6f9'};border:1px solid ${isDark ? '#2d323b' : '#e3e5ea'};
    border-radius:10px;padding:16px;overflow-x:auto}
  pre code{background:none;border:none;padding:0;font-size:.88em}
  blockquote{margin:1em 0;padding:.3em 0 .3em 1.1em;border-left:3px solid #4b7bff;
    color:${isDark ? '#a0a7b4' : '#5a6070'}}
  table{border-collapse:collapse;width:100%;margin:1.2em 0}
  th,td{border:1px solid ${isDark ? '#2d323b' : '#e3e5ea'};padding:8px 13px}
  th{background:${isDark ? '#22262d' : '#f7f8fa'};text-align:left}
  img{max-width:100%;border-radius:9px}
  hr{border:none;border-top:1px solid ${isDark ? '#2d323b' : '#e3e5ea'};margin:2em 0}
  mark{background:rgba(255,213,0,.35);padding:.1em .25em;border-radius:3px}
  .tok-com{color:#8a8f98;font-style:italic}.tok-str{color:#0a8f4c}.tok-kw{color:#a626a4}
  .tok-num{color:#986801}.tok-fn{color:#4078f2}.tok-op{color:#555b66}.tok-tag{color:#e45649}
  .tok-attr{color:#986801}.tok-prop{color:#4078f2}.tok-bool{color:#986801}.tok-key{color:#4078f2}
</style>
</head>
<body>
${body}
</body>
</html>`;
  download(baseName() + '.html', html, 'text/html');
  toast('已导出 HTML 文件', 'success');
}

/* ═══════════════════════════════════════════════════════════
   10. 未保存状态（不再写入 localStorage，改为关闭时提醒）
   ═══════════════════════════════════════════════════════════ */
let dirty = false;

function markDirty() {
  if (!dirty) {
    dirty = true;
    tab.classList.add('dirty');
  }
  $('#saveDot').classList.add('saving');
  $('#saveText').textContent = '未保存';
}

function setSaved() {
  dirty = false;
  tab.classList.remove('dirty');
  $('#saveDot').classList.remove('saving');
  const t = new Date();
  $('#saveText').textContent = '已保存 ' +
    String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
}

/* ═══════════════════════════════════════════════════════════
   11. 初始内容
   ═══════════════════════════════════════════════════════════ */
const WELCOME = `# MarkForge · 认识这款 Markdown 编辑器

> **MarkForge** —— 一个专注书写的专业级 Markdown 在线编辑器。
> 作者：**MarkSkecher**

MarkForge 把「写」和「看」放在一起：左侧敲 Markdown 源码，右侧实时渲染成排版精美的文档。界面借鉴专业图像软件的分区布局，却始终围绕一个目标 —— **让你专注于内容本身**。

## 核心特性

- **双栏实时预览**：源码 / 预览并排，拖动中间分隔条即可调整比例
- **查找与替换**：\`Ctrl + F\` 唤出，源码内高亮全部匹配，支持正则与 \`$1\` 捕获组
- **命令面板与快速跳转**：\`Ctrl + P\` 执行操作，\`Ctrl + G\` 直达任意标题
- **专注书写**：专注模式淡出焦点行，打字机模式让光标常驻中线
- **写作目标**：为今天设定字数 / 字符目标，进度实时显示在状态栏
- **文件即存档**：内容不再自动存本地，按 \`Ctrl + S\` 随时导出 \`.md\`
- **主题与配色**：深色 / 浅色 / 跟随系统，外加 6 种强调色
- **文档大纲**：自动生成标题导航，可折叠、可筛选，点击即可跳转

## 常用快捷键

| 功能 | 快捷键 | 说明 |
| --- | --- | :---: |
| 查找 | \`Ctrl + F\` | 源码内高亮全部匹配 |
| 查找与替换 | \`Ctrl + H\` | 支持 \`$1\` 捕获组 |
| 快速跳转 | \`Ctrl + G\` | 直达任意标题 |
| 加粗 | \`Ctrl + B\` | 包裹 \`**文字**\` |
| 斜体 | \`Ctrl + I\` | 包裹 \`*文字*\` |
| 插入链接 | \`Ctrl + K\` | 智能补全 URL |
| 专注模式 | \`Ctrl + Alt + F\` | 只留当前行明亮 |
| 打字机模式 | \`Ctrl + ⇧ + T\` | 光标常驻中线 |
| 导出文件 | \`Ctrl + S\` | 下载 \`.md\` |
| 命令面板 | \`Ctrl + P\` | 打开全局命令 |

## 支持的 Markdown 语法

MarkForge 的渲染器覆盖日常书写所需的绝大部分语法：

1. **文本格式**：加粗、斜体、删除线、高亮、行内代码
2. **块级元素**：标题、段落、引用、分隔线、表格、围栏代码块
3. **列表**：有序 / 无序 / 嵌套，以及任务清单

- [x] 实时渲染预览
- [x] 两栏滚动同步
- [x] 查找替换与专注书写
- [ ] 更多功能持续加入……

代码块还支持语法高亮，悬停即可复制；例如：

\`\`\`javascript
// MarkForge 的设计哲学
const focus = '内容';
const noise = 0;
console.log(\`把 \${focus} 留下，把干扰降到 \${noise}\`);
\`\`\`

## 书写小贴士

> 简洁是可靠性的前提。
> —— Edsger W. Dijkstra

- 用标题分层组织长文，大纲会自动同步
- 复杂说明可放进折叠块，保持正文清爽
- 善用任务清单管理写作进度

---

准备好开始了吗？清空这一页，敲下属于你的第一个字符！
`;

/* ═══════════════════════════════════════════════════════════
   12. 视图与面板
   ═══════════════════════════════════════════════════════════ */
let showLeft = true;
let showRight = true;

function applyView(v) {
  settings.view = v;
  workspace.dataset.view = v;
  $$('[data-view-opt]').forEach(b => b.classList.toggle('active', b.dataset.viewOpt === v));
  persistSettings();
  requestAnimationFrame(() => {
    updateScrollMax();
    syncEditorScroll();
    updateFocusBand();
    scheduleCaretUI();
  });
}

function toggleLeft() {
  showLeft = !showLeft;
  $('#leftPanel').classList.toggle('collapsed', !showLeft);
}
function toggleRight() {
  showRight = !showRight;
  $('#rightPanel').classList.toggle('collapsed', !showRight);
  requestAnimationFrame(updateScrollMax);
}
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

/* 专注模式：只保留当前行明亮 */
function toggleFocusMode() {
  settings.focusMode = !settings.focusMode;
  $('#swFocusMode').classList.toggle('on', settings.focusMode);
  syncModeButtons();
  persistSettings();
  updateFocusBand();
  toast(settings.focusMode ? '专注模式已开启' : '专注模式已关闭', 'info', 1500);
}

/* 打字机模式：光标常驻视口中线 */
function toggleTypewriter() {
  settings.typewriter = !settings.typewriter;
  $('#swTypewriter').classList.toggle('on', settings.typewriter);
  syncModeButtons();
  persistSettings();
  if (settings.typewriter) {
    editor.focus();
    applyTypewriterCaret();
  }
  updateFocusBand();
  toast(settings.typewriter ? '打字机模式已开启' : '打字机模式已关闭', 'info', 1500);
}

/* 两种专注书写模式：同步工具栏按钮的高亮状态 */
function syncModeButtons() {
  $('#btnFocus').classList.toggle('active', settings.focusMode);
  $('#btnTypewriter').classList.toggle('active', settings.typewriter);
}

/* ═══════════════════════════════════════════════════════════
   13. 设置应用
   ═══════════════════════════════════════════════════════════ */
function applyFontSettings() {
  const fs = settings.fontSize;
  const lh = settings.lineHeight;
  document.documentElement.style.setProperty('--fs', fs + 'px');
  document.documentElement.style.setProperty('--lh', lh);
  $('#fsVal').textContent = fs.toFixed(1) + ' px';
  $('#lhVal').textContent = lh.toFixed(2);
  $('#fsRange').value = fs;
  $('#lhRange').value = lh;
  requestAnimationFrame(() => {
    updateScrollMax();
    layoutEditorOverlay();
    updateFocusBand();
  });
}

function applyFontFamily() {
  editor.classList.remove('font-mono', 'font-sans', 'font-serif');
  editor.classList.add('font-' + settings.font);
  $$('[data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === settings.font));
}

function applyPreviewWidth() {
  const w = settings.previewWidth;
  preview.style.maxWidth = w >= 1400 ? '100%' : w + 'px';
  preview.style.margin = '0 auto';
  $('#pwVal').textContent = w >= 1400 ? '100%' : w + ' px';
  $('#pwRange').value = w;
}

function applyWrap() {
  editor.style.whiteSpace = settings.wrap ? 'pre-wrap' : 'pre';
  editor.style.overflowX = settings.wrap ? 'hidden' : 'auto';
  $('#swWrap').classList.toggle('on', settings.wrap);
  layoutEditorOverlay();
}

function applySpellcheck() {
  editor.spellcheck = settings.spellcheck;
  $('#swSpell').classList.toggle('on', settings.spellcheck);
}

function applyGutter() {
  gutter.style.display = settings.showGutter ? '' : 'none';
  $('#swGutter').classList.toggle('on', settings.showGutter);
}

function applySmoothScroll() {
  // 预览区不做常时 smooth：那会让比例同步的程序化滚动产生回灌抽搐（见第 7 段）。
  // 平滑仅用于大纲跳转等一次性导航（navPreview）。
  preview.style.scrollBehavior = 'auto';
}

/* 大纲等一次性导航：按设置平滑滚动预览，并锁住编辑器的回声 */
function navPreview(top) {
  navJump = true;
  takeDriver('editor', 520);
  preview.scrollTo({ top, behavior: settings.smoothScroll ? 'smooth' : 'auto' });
  setTimeout(() => { navJump = false; }, 520);
}

function applyTabSize() {
  editor.style.tabSize = settings.tabSize;
  $$('[data-tab]').forEach(b => b.classList.toggle('active', +b.dataset.tab === settings.tabSize));
  if (editorOverlay) editorOverlay.style.tabSize = settings.tabSize;
}

function applySwitches() {
  $('#swSync').classList.toggle('on', settings.syncScroll);
  $('#swFocusMode').classList.toggle('on', settings.focusMode);
  $('#swTypewriter').classList.toggle('on', settings.typewriter);
  $('#swGoal').classList.toggle('on', settings.showGoalInStatus);
  syncModeButtons();
  updateFocusBand();
}

/* 界面缩放：整体缩放，布局比例保持不变（Chrome / Edge / Safari 支持 zoom） */
function applyZoom(z) {
  settings.zoom = clamp(z, 0.6, 1.6);
  document.body.style.zoom = settings.zoom === 1 ? '' : String(settings.zoom);
  const el = $('#zoomVal');
  if (el) el.textContent = Math.round(settings.zoom * 100) + '%';
  persistSettings();
  requestAnimationFrame(() => {
    updateScrollMax();
    layoutEditorOverlay();
    syncEditorScroll();
  });
}

function zoomStep(dir) {
  applyZoom(Math.round((settings.zoom + dir * 0.1) * 10) / 10);
  toast('界面缩放 ' + Math.round(settings.zoom * 100) + '%', 'info', 1200);
}

function bindZoomUI() {
  $('#zoomIn').addEventListener('click', () => zoomStep(1));
  $('#zoomOut').addEventListener('click', () => zoomStep(-1));
  $('#zoomReset').addEventListener('click', () => { applyZoom(1); });
}

/* 右侧面板分区折叠：把不常用的分区收起来，给「编辑器设置」让出空间 */
function applyPanels() {
  $$('.panel-head').forEach(head => {
    const open = settings.panels[head.dataset.panel] !== false;
    head.classList.toggle('open', open);
    const body = head.nextElementSibling;
    if (body && body.classList.contains('panel-body')) body.classList.toggle('open', open);
  });
}

function bindPanels() {
  $$('.panel-head').forEach(head => {
    head.addEventListener('click', () => {
      const key = head.dataset.panel;
      settings.panels[key] = !head.classList.contains('open');
      applyPanels();
      persistSettings();
    });
  });
}

function applySliders() {
  $('#rdRange').value = settings.renderDelay;
  $('#rdVal').textContent = settings.renderDelay + ' ms';
}

function applyAllSettings() {
  applyFontSettings();
  applyFontFamily();
  applyPreviewWidth();
  applyWrap();
  applySpellcheck();
  applyGutter();
  applySmoothScroll();
  applyTabSize();
  applySwitches();
  applySliders();
  applyZoom(settings.zoom);
  applyView(settings.view);
}

/* ═══════════════════════════════════════════════════════════
   14. 事件绑定
   ═══════════════════════════════════════════════════════════ */
editor.addEventListener('input', () => {
  scheduleRender();
  markDirty();
  syncEditorScroll();
  scheduleCaretUI();
  if (find.active) markFindDirty();
});

editor.addEventListener('scroll', syncEditorScroll, { passive: true });

['click', 'keyup', 'select'].forEach(ev => editor.addEventListener(ev, updateCursor));
['click', 'keyup', 'select'].forEach(ev => editor.addEventListener(ev, updateFocusBand));

editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) indentSelection(-1);
    else insertText(' '.repeat(settings.tabSize));
  }
});

document.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.tbtn, .icon-btn, .tool, .dd-item, .reset-btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 620);
});

document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;

  if (e.key === 'Escape') {
    if (find.active) { closeFind(); return; }
    closeMenus();
    closeCmdk();
    return;
  }

  if (!mod) {
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    return;
  }

  const k = e.key.toLowerCase();

  if (e.altKey) {
    if (k === 'f') { e.preventDefault(); toggleFocusMode(); }
    else if (k === 'z') { e.preventDefault(); toggleTypewriter(); }
    else if (k === 'l') { e.preventDefault(); selectAllMatches(); }
    return;
  }

  if (e.shiftKey) {
    if (k === 'o') { e.preventDefault(); openQuickOpen(); return; }
    if (k === 't') { e.preventDefault(); toggleTypewriter(); return; }
    if (k === 'd') { e.preventDefault(); duplicateLine(); return; }
    if (k === 'k') { e.preventDefault(); deleteLine(); return; }
  }

  if (k === 'p' && !e.shiftKey) { e.preventDefault(); openCmdk(); return; }
  if (k === 'f') { e.preventDefault(); openFind(false); return; }
  if (k === 'h') { e.preventDefault(); openFind(true); return; }
  if (k === 'g') { e.preventDefault(); openQuickOpen(); return; }
  if (k === '=' || k === '+') { e.preventDefault(); zoomStep(1); return; }
  if (k === '-') { e.preventDefault(); zoomStep(-1); return; }
  if (k === '0') { e.preventDefault(); applyZoom(1); return; }

  const map = {
    'b': () => runCommand('bold'),
    'i': () => runCommand('italic'),
    'k': () => runCommand('link'),
    's': () => e.shiftKey ? exportHtml() : saveMarkdown(),
    'o': () => $('#fileInput').click(),
    'n': () => newDocument(),
    'd': () => { if (e.shiftKey) duplicateLine(); },
    'k': () => runCommand('link'),
    '1': () => applyView('editor'),
    '2': () => applyView('split'),
    '3': () => applyView('preview')
  };
  if (map[k]) {
    e.preventDefault();
    map[k]();
  }
});

document.addEventListener('click', e => {
  const cmdBtn = e.target.closest('[data-cmd]');
  if (cmdBtn) { runCommand(cmdBtn.dataset.cmd); return; }
  const actBtn = e.target.closest('[data-action]');
  if (actBtn) handleAction(actBtn.dataset.action);
});

function handleAction(action) {
  switch (action) {
    case 'new': newDocument(); break;
    case 'open': $('#fileInput').click(); break;
    case 'save-md': saveMarkdown(); break;
    case 'save-html': exportHtml(); break;
    case 'print': window.print(); break;
    case 'clear':
      if (confirm('确定要清空当前文档内容吗？')) {
        editor.value = '';
        editor.dispatchEvent(new Event('input'));
        editor.focus();
        toast('已清空文档', 'warn');
      }
      break;
    case 'undo': editor.focus(); document.execCommand('undo'); break;
    case 'redo': editor.focus(); document.execCommand('redo'); break;
    case 'selectall': editor.focus(); editor.select(); updateCursor(); break;
    case 'copyall':
      copyText(editor.value)
        .then(() => toast('已复制全文到剪贴板', 'success'))
        .catch(() => toast('复制失败', 'warn'));
      break;
    case 'find': openFind(false); break;
    case 'replace': openFind(true); break;
    case 'selectall-matches': selectAllMatches(); break;
    case 'quickopen': openQuickOpen(); break;
    case 'duplicate': duplicateLine(); break;
    case 'delete-line': deleteLine(); break;
    case 'typewriter': toggleTypewriter(); break;
    case 'focus-mode': toggleFocusMode(); break;
    case 'zoom-in': zoomStep(1); break;
    case 'zoom-out': zoomStep(-1); break;
    case 'zoom-reset': applyZoom(1); break;
    case 'indent': indentSelection(1); break;
    case 'outdent': indentSelection(-1); break;
    case 'datetime': runCommand('datetime'); break;
    case 'view-editor': applyView('editor'); break;
    case 'view-split': applyView('split'); break;
    case 'view-preview': applyView('preview'); break;
    case 'toggle-left': toggleLeft(); break;
    case 'toggle-right': toggleRight(); break;
    case 'fullscreen': toggleFullscreen(); break;
    case 'syntax': showModal('Markdown 语法速查', SYNTAX_HTML); break;
    case 'shortcuts': showModal('快捷键', SHORTCUTS_HTML); break;
    case 'about': openAbout(); break;
  }
}

function newDocument() {
  if (editor.value.trim() && !confirm('新建文档会清空当前内容，是否继续？')) return;
  editor.value = '';
  tabName.textContent = '未命名.md';
  editor.dispatchEvent(new Event('input'));
  editor.focus();
  toast('已创建新文档', 'success');
}

$('#fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    editor.value = ev.target.result;
    tabName.textContent = file.name;
    editor.dispatchEvent(new Event('input'));
    toast('已打开 ' + file.name, 'success');
  };
  reader.readAsText(file, 'utf-8');
  e.target.value = '';
});

function jumpToLine(lineIdx) {
  const lines = editor.value.split('\n');
  if (lineIdx < 0 || lineIdx >= lines.length) return;
  let pos = 0;
  for (let i = 0; i < lineIdx; i++) pos += lines[i].length + 1;
  editor.focus();
  editor.setSelectionRange(pos, pos + lines[lineIdx].length);
  const lh = parseFloat(getComputedStyle(editor).lineHeight);
  takeDriver('editor', 260);
  scrollToInstant(editor, Math.max(0, lineIdx * lh - editor.clientHeight / 3));
  if (settings.showGutter) gutter.scrollTop = editor.scrollTop;
  updateCursor();
}

outlineEl.addEventListener('click', e => {
  const toggle = e.target.closest('.ol-toggle');
  if (toggle && !toggle.classList.contains('leaf')) {
    const item = toggle.closest('.outline-item');
    if (item) { toggleOutlineItem(parseInt(item.dataset.level, 10)); return; }
  }
  const item = e.target.closest('.outline-item');
  if (!item) return;
  const lineIdx = parseInt(item.dataset.line, 10);
  jumpToLine(lineIdx);
  if (settings.syncScroll && scrollMax.editor > 0 && scrollMax.preview > 0) {
    navPreview((editor.scrollTop / scrollMax.editor) * scrollMax.preview);
  }
});

function closeMenus() {
  $$('.menu-item').forEach(i => i.classList.remove('open'));
}
$$('.menu-item').forEach(item => {
  const btn = item.querySelector('.menu-btn');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = item.classList.contains('open');
    closeMenus();
    if (!wasOpen) item.classList.add('open');
  });
  item.addEventListener('mouseenter', () => {
    if ($('.menu-item.open')) {
      closeMenus();
      item.classList.add('open');
    }
  });
});
document.addEventListener('click', closeMenus);

$('#btnTheme').addEventListener('click', () => {
  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(settings.theme) + 1) % order.length];
  applyTheme(next);
  toast('主题：' + ({ light: '浅色', dark: '深色', system: '跟随系统' })[next], 'info', 1400);
});

$('#themeSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-theme-opt]');
  if (b) applyTheme(b.dataset.themeOpt);
});

$('#viewSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-view-opt]');
  if (b) applyView(b.dataset.viewOpt);
});

$('#accentSwatches').addEventListener('click', e => {
  const b = e.target.closest('.swatch');
  if (b) setAccent(b.dataset.accent);
});

$('#fontSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-font]');
  if (!b) return;
  settings.font = b.dataset.font;
  applyFontFamily();
  persistSettings();
});
$('#tabSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  settings.tabSize = +b.dataset.tab;
  applyTabSize();
  persistSettings();
});

$('#fsRange').addEventListener('input', e => {
  settings.fontSize = parseFloat(e.target.value);
  applyFontSettings();
  persistSettings();
});
$('#lhRange').addEventListener('input', e => {
  settings.lineHeight = parseFloat(e.target.value);
  applyFontSettings();
  persistSettings();
});
$('#pwRange').addEventListener('input', e => {
  settings.previewWidth = parseInt(e.target.value, 10);
  applyPreviewWidth();
  persistSettings();
});
$('#rdRange').addEventListener('input', e => {
  settings.renderDelay = parseInt(e.target.value, 10);
  $('#rdVal').textContent = settings.renderDelay + ' ms';
  persistSettings();
});

function bindSwitch(id, key, onChange) {
  const el = $(id);
  el.parentElement.addEventListener('click', (e) => {
    e.preventDefault();
    settings[key] = !settings[key];
    el.classList.toggle('on', settings[key]);
    if (onChange) onChange(settings[key]);
    syncSettingsDependentUI();
    persistSettings();
  });
}

/* 开关变化后刷新依赖它的工具栏按钮与状态栏 */
function syncSettingsDependentUI() {
  syncModeButtons();
  updateStatusGoal();
}

bindSwitch('#swSync', 'syncScroll');
bindSwitch('#swWrap', 'wrap', applyWrap);
bindSwitch('#swGutter', 'showGutter', applyGutter);
bindSwitch('#swSpell', 'spellcheck', applySpellcheck);
bindSwitch('#swSmooth', 'smoothScroll', applySmoothScroll);
bindSwitch('#swFocusMode', 'focusMode', () => { updateFocusBand(); scheduleCaretUI(); });
bindSwitch('#swTypewriter', 'typewriter', () => {
  if (settings.typewriter) editor.focus();
  updateFocusBand();
  scheduleCaretUI();
});
bindSwitch('#swGoal', 'showGoalInStatus', updateStatusGoal);

$('#btnReset').addEventListener('click', () => {
  if (!confirm('确定要恢复所有默认设置吗？文档内容与写作进度不会丢失。')) return;
  const doc = editor.value;
  const goal = normalizeGoal(settings.goal);
  settings = { ...DEFAULTS, goal };
  settings.goal.day = localDayKey();
  localStorage.removeItem('mf-settings');
  localStorage.removeItem('mf-accent');
  applyAccent(settings.accent);
  applyTheme(settings.theme);
  $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.accent === settings.accent));
  applyAllSettings();
  editor.value = doc;
  updateGoalUI();
  toast('已恢复默认设置', 'success');
});

(function initDivider() {
  const divider = $('#divider');
  const editorPane = $('#editorPane');
  const previewPane = $('#previewPane');
  let dragging = false;

  divider.addEventListener('pointerdown', e => {
    dragging = true;
    divider.classList.add('dragging');
    divider.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  divider.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rect = $('#split').getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0.15, 0.85);
    editorPane.style.flex = `0 0 ${ratio * 100}%`;
    previewPane.style.flex = `0 0 ${(1 - ratio) * 100}%`;
  });

  const stop = () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    requestAnimationFrame(updateScrollMax);
  };
  divider.addEventListener('pointerup', stop);
  divider.addEventListener('pointercancel', stop);
})();

/* ═══════════════════════════════════════════════════════════
   15. 通用弹窗
   ═══════════════════════════════════════════════════════════ */
const overlay = $('#overlay');
$('#modalClose').addEventListener('click', () => overlay.classList.remove('show'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });

function showModal(title, html) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  overlay.classList.add('show');
}

/* ═══════════════════════════════════════════════════════════
   16. 命令面板
   ═══════════════════════════════════════════════════════════ */
const cmdkOverlay = $('#cmdkOverlay');
const cmdkInput = $('#cmdkInput');
const cmdkList = $('#cmdkList');
let cmdkActiveIndex = 0;
let cmdkFiltered = [];

const ICONS = {
  file: '<path d="M11.5 2.5H5.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M11.5 2.5V7H16"/>',
  edit: '<path d="M13.6 3.4l3 3-9 9H4.6v-3z"/><path d="M12 5l3 3"/>',
  text: '<path d="M4 5h12M4 10h12M4 15h7"/>',
  view: '<path d="M1.8 10S4.8 4.5 10 4.5 18.2 10 18.2 10 15.2 15.5 10 15.5 1.8 10 1.8 10z"/><circle cx="10" cy="10" r="2.6"/>',
  theme: '<circle cx="10" cy="10" r="7.6"/><path d="M10 2.4v15.2"/>',
  help: '<circle cx="10" cy="10" r="7.6"/><path d="M10 14.5v-4.5M10 6.6v.1"/>',
  search: '<circle cx="8.6" cy="8.6" r="5.1"/><path d="M12.4 12.4L17 17"/>',
  focus: '<path d="M2.6 7V3.8A1.2 1.2 0 0 1 3.8 2.6H7M13 2.6h3.2a1.2 1.2 0 0 1 1.2 1.2V7M17.4 13v3.2a1.2 1.2 0 0 1-1.2 1.2H13M7 17.4H3.8a1.2 1.2 0 0 1-1.2-1.2V13"/>',
  target: '<circle cx="10" cy="10" r="7.2"/><circle cx="10" cy="10" r="3"/><path d="M10 1.6v2.4M10 16v2.4M1.6 10h2.4M16 10h2.4"/>',
  heading: '<path d="M4 4.5v11M12 4.5v11M4 10h8"/><path d="M15.5 9l2-1.1V15"/>'
};

const COMMANDS = [
  { id: 'new',       label: '新建文档',        cat: '文件', icon: 'file', action: () => handleAction('new'),        keys: 'Ctrl N' },
  { id: 'open',      label: '打开 Markdown…',  cat: '文件', icon: 'file', action: () => handleAction('open'),       keys: 'Ctrl O' },
  { id: 'save-md',   label: '保存为 .md',      cat: '文件', icon: 'file', action: saveMarkdown,                     keys: 'Ctrl S' },
  { id: 'save-html', label: '导出 HTML',       cat: '文件', icon: 'file', action: exportHtml,                       keys: 'Ctrl ⇧ S' },
  { id: 'print',     label: '打印 / PDF',      cat: '文件', icon: 'file', action: () => window.print(),             keys: 'Ctrl P' },

  { id: 'find',      label: '查找',            cat: '查找', icon: 'search', action: () => openFind(false),          keys: 'Ctrl F' },
  { id: 'replace',   label: '查找与替换',      cat: '查找', icon: 'search', action: () => openFind(true),           keys: 'Ctrl H' },
  { id: 'selectall-m', label: '选中全部匹配项', cat: '查找', icon: 'search', action: selectAllMatches,             keys: 'Alt L' },
  { id: 'quickopen', label: '快速跳转到标题…', cat: '查找', icon: 'heading', action: openQuickOpen,                 keys: 'Ctrl G' },

  { id: 'bold',      label: '加粗',            cat: '格式', icon: 'text', action: () => runCommand('bold'),         keys: 'Ctrl B' },
  { id: 'italic',    label: '斜体',            cat: '格式', icon: 'text', action: () => runCommand('italic'),       keys: 'Ctrl I' },
  { id: 'strike',    label: '删除线',          cat: '格式', icon: 'text', action: () => runCommand('strike') },
  { id: 'mark',      label: '高亮',            cat: '格式', icon: 'text', action: () => runCommand('mark') },
  { id: 'code',      label: '行内代码',        cat: '格式', icon: 'text', action: () => runCommand('code') },
  { id: 'h1',        label: '一级标题',        cat: '格式', icon: 'text', action: () => runCommand('h1') },
  { id: 'h2',        label: '二级标题',        cat: '格式', icon: 'text', action: () => runCommand('h2') },
  { id: 'h3',        label: '三级标题',        cat: '格式', icon: 'text', action: () => runCommand('h3') },
  { id: 'quote',     label: '引用块',          cat: '格式', icon: 'text', action: () => runCommand('quote') },
  { id: 'ul',        label: '无序列表',        cat: '格式', icon: 'text', action: () => runCommand('ul') },
  { id: 'ol',        label: '有序列表',        cat: '格式', icon: 'text', action: () => runCommand('ol') },
  { id: 'task',      label: '任务列表',        cat: '格式', icon: 'text', action: () => runCommand('task') },
  { id: 'duplicate', label: '复制当前行',      cat: '格式', icon: 'edit', action: duplicateLine,                    keys: 'Ctrl ⇧ D' },
  { id: 'deleteLine', label: '删除当前行',     cat: '格式', icon: 'edit', action: deleteLine,                       keys: 'Ctrl ⇧ K' },

  { id: 'link',      label: '插入链接',        cat: '插入', icon: 'edit', action: () => runCommand('link'),         keys: 'Ctrl K' },
  { id: 'image',     label: '插入图片',        cat: '插入', icon: 'edit', action: () => runCommand('image') },
  { id: 'table',     label: '插入表格',        cat: '插入', icon: 'edit', action: () => runCommand('table') },
  { id: 'codeblock', label: '插入代码块',      cat: '插入', icon: 'edit', action: () => runCommand('codeblock') },
  { id: 'hr',        label: '插入分隔线',      cat: '插入', icon: 'edit', action: () => runCommand('hr') },
  { id: 'details',   label: '插入折叠块',      cat: '插入', icon: 'edit', action: () => runCommand('details') },
  { id: 'datetime',  label: '插入日期时间',    cat: '插入', icon: 'edit', action: () => runCommand('datetime') },

  { id: 'view-editor',  label: '仅编辑器',     cat: '视图', icon: 'view', action: () => applyView('editor'),  keys: 'Ctrl 1' },
  { id: 'view-split',   label: '分栏视图',     cat: '视图', icon: 'view', action: () => applyView('split'),   keys: 'Ctrl 2' },
  { id: 'view-preview', label: '仅预览',       cat: '视图', icon: 'view', action: () => applyView('preview'), keys: 'Ctrl 3' },
  { id: 'toggle-left',  label: '切换左侧面板', cat: '视图', icon: 'view', action: toggleLeft },
  { id: 'toggle-right', label: '切换右侧面板', cat: '视图', icon: 'view', action: toggleRight, keys: 'Ctrl ⇧ B' },
  { id: 'fullscreen',   label: '全屏',         cat: '视图', icon: 'view', action: toggleFullscreen, keys: 'F11' },
  { id: 'outline-collapse', label: '折叠全部大纲标题', cat: '视图', icon: 'view', action: () => setOutlineAll(true) },
  { id: 'outline-expand',   label: '展开全部大纲标题', cat: '视图', icon: 'view', action: () => setOutlineAll(false) },

  { id: 'focus-mode',   label: '专注模式（淡出焦点行）', cat: '专注', icon: 'focus', action: toggleFocusMode, keys: 'Ctrl Alt F' },
  { id: 'typewriter',   label: '打字机模式（光标居中）', cat: '专注', icon: 'focus', action: toggleTypewriter, keys: 'Ctrl ⇧ T' },
  { id: 'goal-focus',   label: '设置写作目标',  cat: '专注', icon: 'target', action: () => $('#sbGoal').click() },

  { id: 'zoom-in',    label: '放大界面',       cat: '视图', icon: 'view', action: () => zoomStep(1),   keys: 'Ctrl +' },
  { id: 'zoom-out',   label: '缩小界面',       cat: '视图', icon: 'view', action: () => zoomStep(-1),  keys: 'Ctrl -' },
  { id: 'zoom-reset', label: '界面缩放重置 100%', cat: '视图', icon: 'view', action: () => applyZoom(1), keys: 'Ctrl 0' },

  { id: 'theme-light',  label: '切换到浅色模式', cat: '主题', icon: 'theme', action: () => applyTheme('light') },
  { id: 'theme-dark',   label: '切换到深色模式', cat: '主题', icon: 'theme', action: () => applyTheme('dark') },
  { id: 'theme-system', label: '跟随系统主题',   cat: '主题', icon: 'theme', action: () => applyTheme('system') },

  { id: 'syntax',    label: 'Markdown 语法速查', cat: '帮助', icon: 'help', action: () => showModal('Markdown 语法速查', SYNTAX_HTML) },
  { id: 'shortcuts', label: '查看快捷键',        cat: '帮助', icon: 'help', action: () => showModal('快捷键', SHORTCUTS_HTML) },
  { id: 'about',     label: '关于 MarkForge',    cat: '帮助', icon: 'help', action: openAbout }
];

function fuzzyMatch(q, text) {
  q = q.toLowerCase();
  text = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < text.length && qi < q.length; i++) {
    if (text[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/* ─── 快速跳转（Ctrl/⌘ + G） ─── */
let cmdkMode = 'command';

function quickHeadingItems() {
  if (!headings.length) headings = collectHeadings();
  return headings.map(h => ({
    id: 'h-' + h.line,
    label: h.text,
    hint: 'H' + h.level + ' · 第 ' + (h.line + 1) + ' 行',
    icon: 'heading',
    cat: '标题',
    action: () => {
      jumpToLine(h.line);
      if (settings.syncScroll && scrollMax.editor > 0 && scrollMax.preview > 0) {
        navPreview((editor.scrollTop / scrollMax.editor) * scrollMax.preview);
      }
      flashOutlineItem(h.line);
    }
  }));
}

function buildCmdkItems() {
  const q = cmdkInput.value.trim();
  if (cmdkMode === 'quick') {
    const list = quickHeadingItems().filter(h => fuzzyMatch(q, h.label) || fuzzyMatch(q, h.cat));
    if (list.length || !q) return list;
    // 没有命中标题时，回落到命令，避免死路
    return COMMANDS.filter(c => fuzzyMatch(q, c.label) || fuzzyMatch(q, c.cat));
  }
  return q
    ? COMMANDS.filter(c => fuzzyMatch(q, c.label) || fuzzyMatch(q, c.cat))
    : COMMANDS.slice();
}

function renderCmdkList() {
  cmdkFiltered = buildCmdkItems();
  cmdkActiveIndex = 0;

  if (!cmdkFiltered.length) {
    cmdkList.innerHTML = '<div class="cmdk-empty">' +
      (cmdkMode === 'quick' ? '文档里还没有标题' : '没有匹配的命令') + '</div>';
    return;
  }

  cmdkList.innerHTML = cmdkFiltered.map((c, i) => `
    <div class="cmdk-item${i === cmdkActiveIndex ? ' active' : ''}" data-idx="${i}" role="option">
      <span class="cmd-icon"><svg viewBox="0 0 20 20">${ICONS[c.icon] || ICONS.edit}</svg></span>
      <span class="cmd-label">${escapeHtml(c.label)}</span>
      ${c.keys ? `<kbd>${c.keys}</kbd>`
               : `<span class="cmd-cat">${escapeHtml(c.hint || c.cat || '')}</span>`}
    </div>
  `).join('');
}

function updateCmdkActive() {
  $$('.cmdk-item', cmdkList).forEach((el, i) => {
    el.classList.toggle('active', i === cmdkActiveIndex);
  });
  const active = cmdkList.children[cmdkActiveIndex];
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
}

function openCmdk() { openCmdkWith('command'); }
function openQuickOpen() { openCmdkWith('quick'); }

function openCmdkWith(mode) {
  cmdkMode = mode;
  headings = collectHeadings();
  cmdkOverlay.classList.add('show');
  cmdkInput.value = '';
  cmdkInput.placeholder = mode === 'quick' ? '跳转到标题…（也可搜索命令）' : '输入命令或搜索…';
  renderCmdkList();
  setTimeout(() => cmdkInput.focus(), 30);
}

function closeCmdk() {
  cmdkOverlay.classList.remove('show');
}

function runCmdkItem(idx) {
  const c = cmdkFiltered[idx];
  if (!c) return;
  closeCmdk();
  setTimeout(() => c.action(), 60);
}

cmdkInput.addEventListener('input', renderCmdkList);

cmdkInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdkActiveIndex = Math.min(cmdkActiveIndex + 1, cmdkFiltered.length - 1);
    updateCmdkActive();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdkActiveIndex = Math.max(cmdkActiveIndex - 1, 0);
    updateCmdkActive();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    runCmdkItem(cmdkActiveIndex);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeCmdk();
  }
});

cmdkList.addEventListener('click', e => {
  const item = e.target.closest('.cmdk-item');
  if (item) runCmdkItem(+item.dataset.idx);
});

cmdkList.addEventListener('mousemove', e => {
  const item = e.target.closest('.cmdk-item');
  if (!item) return;
  const idx = +item.dataset.idx;
  if (idx !== cmdkActiveIndex) {
    cmdkActiveIndex = idx;
    updateCmdkActive();
  }
});

cmdkOverlay.addEventListener('click', e => {
  if (e.target === cmdkOverlay) closeCmdk();
});

$('#btnSearch').addEventListener('click', openCmdk);
$('#btnAbout').addEventListener('click', openAbout);

$('#btnGithub').addEventListener('click', () => {
  toast('提示：一般网络可能连不上 GitHub，建议开启加速器（如瓦特工具箱）', 'warn', 4500);
  window.open('https://github.com/XOX-zip/MarkForge', '_blank', 'noopener');
});

/* ═══════════════════════════════════════════════════════════
   16.5 关于页面
   ═══════════════════════════════════════════════════════════ */
const aboutPage = $('#aboutPage');
const aboutClose = $('#aboutClose');

function openAbout() {
  aboutPage.classList.add('show');
  aboutPage.setAttribute('aria-hidden', 'false');
  const scroller = aboutPage.querySelector('.about-scroll');
  if (scroller) scroller.scrollTop = 0;
}
function closeAbout() {
  aboutPage.classList.remove('show');
  aboutPage.setAttribute('aria-hidden', 'true');
}
aboutClose.addEventListener('click', closeAbout);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aboutPage.classList.contains('show')) {
    e.stopPropagation();
    closeAbout();
  }
}, true);

/* ═══════════════════════════════════════════════════════════
   17. 帮助内容
   ═══════════════════════════════════════════════════════════ */
const SYNTAX_HTML = `
<h4>文本样式</h4>
<table>
  <tr><td><code>**粗体**</code></td><td>加粗文本</td></tr>
  <tr><td><code>*斜体*</code></td><td>斜体文本</td></tr>
  <tr><td><code>~~删除线~~</code></td><td>删除线</td></tr>
  <tr><td><code>==高亮==</code></td><td>高亮标记</td></tr>
  <tr><td><code>\`代码\`</code></td><td>行内代码</td></tr>
</table>
<h4>标题与结构</h4>
<table>
  <tr><td><code># 一级标题</code></td><td>共支持 1–6 级标题</td></tr>
  <tr><td><code>&gt; 引用</code></td><td>引用块，可嵌套</td></tr>
  <tr><td><code>---</code></td><td>分隔线</td></tr>
  <tr><td><code>&lt;details&gt;…&lt;/details&gt;</code></td><td>可折叠区块</td></tr>
</table>
<h4>列表</h4>
<table>
  <tr><td><code>- 项目</code></td><td>无序列表</td></tr>
  <tr><td><code>1. 项目</code></td><td>有序列表</td></tr>
  <tr><td><code>- [ ] 待办</code></td><td>任务列表</td></tr>
</table>
<h4>链接与媒体</h4>
<table>
  <tr><td><code>[文字](url)</code></td><td>超链接</td></tr>
  <tr><td><code>![描述](图片地址)</code></td><td>图片</td></tr>
</table>
<h4>代码块</h4>
<table>
  <tr><td><code>\`\`\`js ... \`\`\`</code></td><td>带语言标识的代码块（含语法高亮）</td></tr>
</table>
<h4>表格</h4>
<table>
  <tr><td><code>| A | B |</code><br><code>| --- | --- |</code></td><td>标准表格，第二行控制对齐方式</td></tr>
</table>
`;

const SHORTCUTS_HTML = `
<h4>查找与替换</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>F</kbd></td><td>打开查找（选中文本时自动填入）</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>H</kbd></td><td>打开查找与替换</td></tr>
  <tr><td><kbd>Enter</kbd> / <kbd>⇧</kbd> + <kbd>Enter</kbd></td><td>下一个 / 上一个匹配</td></tr>
  <tr><td><kbd>Alt</kbd> + <kbd>L</kbd></td><td>选中全部匹配项</td></tr>
  <tr><td><kbd>Esc</kbd></td><td>关闭查找栏</td></tr>
</table>
<h4>编辑</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>B</kbd></td><td>加粗</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>I</kbd></td><td>斜体</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>插入链接</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd></td><td>撤销 / 重做</td></tr>
  <tr><td><kbd>Tab</kbd> / <kbd>⇧ Tab</kbd></td><td>增加 / 减少缩进</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>D</kbd></td><td>复制当前行</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>K</kbd></td><td>删除当前行</td></tr>
</table>
<h4>文件</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>N</kbd></td><td>新建文档</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>O</kbd></td><td>打开文件</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>保存为 .md</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>S</kbd></td><td>导出 HTML</td></tr>
</table>
<h4>视图与专注</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>P</kbd></td><td>打开命令面板</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>G</kbd> / <kbd>⇧</kbd> + <kbd>O</kbd></td><td>快速跳转到标题</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd></td><td>编辑 / 分栏 / 预览</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>B</kbd></td><td>切换右侧面板</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd></td><td>专注模式</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>T</kbd> / <kbd>Alt</kbd> + <kbd>Z</kbd></td><td>打字机模式</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd></td><td>界面缩放 / 重置</td></tr>
  <tr><td><kbd>F11</kbd></td><td>全屏</td></tr>
  <tr><td><kbd>Esc</kbd></td><td>关闭弹窗 / 面板 / 查找栏</td></tr>
</table>
`;

/* ═══════════════════════════════════════════════════════════
   18. 初始化
   ═══════════════════════════════════════════════════════════ */
function init() {
  applyAccent(settings.accent);
  applyTheme(settings.theme);
  $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.accent === settings.accent));

  applyAllSettings();

  editor.value = WELCOME;
  ensureGoalDay();

  bindFindUI();
  bindZoomUI();
  bindOutlineUI();
  bindGoalUI();
  bindPanels();
  applyPanels();

  doRender();
  updateStats();
  updateOutline();
  updateGoalUI();
  $('#saveText').textContent = '就绪';

  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
  focusOn = true;
  updateCursor();

  requestAnimationFrame(() => {
    layoutEditorOverlay();
    updateScrollMax();
    syncEditorScroll();
    scheduleCaretUI();
  });

  setTimeout(() => toast('欢迎使用 MarkForge · 按 Ctrl+P 打开命令面板', 'info', 3400), 500);
}

window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

init();

})();