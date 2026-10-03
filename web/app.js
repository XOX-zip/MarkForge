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
  view: 'split',
  theme: 'system'
};

let settings = { ...DEFAULTS };
try {
  const raw = localStorage.getItem('mf-settings');
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
  const storedAccent = localStorage.getItem('mf-accent');
  if (storedAccent) settings.accent = storedAccent;
  const storedTheme = localStorage.getItem('mf-theme');
  if (storedTheme) settings.theme = storedTheme;
} catch (e) {}

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
  updateGutter();
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

function updateOutline() {
  const lines = editor.value.split('\n');
  let html = '';
  let inCode = false;
  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    if (/^\s*```/.test(l)) inCode = !inCode;
    if (inCode) continue;
    const m = l.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (m) {
      const lvl = m[1].length;
      const text = m[2].replace(/[*_`~]/g, '').trim();
      html += `<div class="outline-item lv${lvl}" data-line="${idx}" title="${escapeHtml(text)}">
        <span class="dot"></span><span class="txt">${escapeHtml(text)}</span></div>`;
    }
  }
  outlineEl.innerHTML = html || '<div class="empty">暂无标题</div>';
}

function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const latin = (text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .match(/[A-Za-z0-9_'’-]+/g) || []).length;
  return cjk + latin;
}

function updateStats() {
  const md = editor.value;
  const words = countWords(md);
  $('#stWords').textContent = words.toLocaleString();
  $('#stChars').textContent = md.length.toLocaleString();
  $('#stLines').textContent = md.split('\n').length.toLocaleString();
  $('#stParas').textContent = md.split(/\n\s*\n/).filter(p => p.trim()).length.toLocaleString();
  $('#stHeads').textContent = (md.match(/^\s{0,3}#{1,6}\s+/gm) || []).length.toLocaleString();
  $('#stRead').textContent = Math.max(1, Math.round(words / 300)) + ' 分钟';
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
  requestAnimationFrame(updateScrollMax);
}, { passive: true });

/* ═══════════════════════════════════════════════════════════
   8. 编辑命令
   ═══════════════════════════════════════════════════════════ */
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
  datetime: () => insertText(new Date().toLocaleString('zh-CN', { hour12: false }))
};

const CMD_LABELS = {
  bold: '加粗', italic: '斜体', strike: '删除线', mark: '高亮', code: '行内代码',
  h1: '一级标题', h2: '二级标题', h3: '三级标题', quote: '引用', ul: '无序列表',
  ol: '有序列表', task: '任务列表', hr: '分隔线', link: '链接', image: '图片',
  codeblock: '代码块', table: '表格', details: '折叠块', datetime: '日期时间'
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
- **命令面板**：按下 \`Ctrl + P\`，快速执行任意操作
- **文件即存档**：内容不再自动存本地，按 \`Ctrl + S\` 随时导出 \`.md\`；若尚有未保存修改，关闭页面时浏览器会提醒你
- **主题与配色**：深色 / 浅色 / 跟随系统，外加 6 种强调色
- **文档大纲**：左侧自动生成标题导航，点击即可跳转

## 常用快捷键

| 功能 | 快捷键 | 说明 |
| --- | --- | :---: |
| 加粗 | \`Ctrl + B\` | 包裹 \`**文字**\` |
| 斜体 | \`Ctrl + I\` | 包裹 \`*文字*\` |
| 插入链接 | \`Ctrl + K\` | 智能补全 URL |
| 导出文件 | \`Ctrl + S\` | 下载 \`.md\` |
| 命令面板 | \`Ctrl + P\` | 打开全局命令 |

## 支持的 Markdown 语法

MarkForge 的渲染器覆盖日常书写所需的绝大部分语法：

1. **文本格式**：加粗、斜体、删除线、高亮、行内代码
2. **块级元素**：标题、段落、引用、分隔线、表格、围栏代码块
3. **列表**：有序 / 无序 / 嵌套，以及任务清单

- [x] 实时渲染预览
- [x] 两栏滚动同步
- [ ] 更多功能持续加入……

代码块还支持语法高亮，例如：

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
  requestAnimationFrame(updateScrollMax);
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
  requestAnimationFrame(updateScrollMax);
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
}

function applySwitches() {
  $('#swSync').classList.toggle('on', settings.syncScroll);
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
  applyView(settings.view);
}

/* ═══════════════════════════════════════════════════════════
   14. 事件绑定
   ═══════════════════════════════════════════════════════════ */
editor.addEventListener('input', () => {
  scheduleRender();
  markDirty();
});

['click', 'keyup', 'select'].forEach(ev => editor.addEventListener(ev, updateCursor));

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
    closeMenus();
    closeCmdk();
    return;
  }

  if (!mod) {
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    return;
  }

  const k = e.key.toLowerCase();
  if (k === 'p' && !e.shiftKey) { e.preventDefault(); openCmdk(); return; }

  const map = {
    'b': () => e.shiftKey ? toggleRight() : runCommand('bold'),
    'i': () => runCommand('italic'),
    'k': () => runCommand('link'),
    's': () => e.shiftKey ? exportHtml() : saveMarkdown(),
    'o': () => $('#fileInput').click(),
    'n': () => newDocument(),
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
      navigator.clipboard.writeText(editor.value)
        .then(() => toast('已复制全文到剪贴板', 'success'))
        .catch(() => toast('复制失败', 'warn'));
      break;
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

outlineEl.addEventListener('click', e => {
  const item = e.target.closest('.outline-item');
  if (!item) return;
  const lineIdx = parseInt(item.dataset.line, 10);
  const lines = editor.value.split('\n');
  let pos = 0;
  for (let i = 0; i < lineIdx; i++) pos += lines[i].length + 1;
  editor.focus();
  editor.setSelectionRange(pos, pos + lines[lineIdx].length);
  const lh = parseFloat(getComputedStyle(editor).lineHeight);
  editor.scrollTop = Math.max(0, lineIdx * lh - editor.clientHeight / 3);
  if (settings.syncScroll && scrollMax.editor > 0 && scrollMax.preview > 0) {
    navPreview((editor.scrollTop / scrollMax.editor) * scrollMax.preview);
  }
  updateCursor();
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
    persistSettings();
  });
}
bindSwitch('#swSync', 'syncScroll');
bindSwitch('#swWrap', 'wrap', applyWrap);
bindSwitch('#swGutter', 'showGutter', applyGutter);
bindSwitch('#swSpell', 'spellcheck', applySpellcheck);
bindSwitch('#swSmooth', 'smoothScroll', applySmoothScroll);

$('#btnReset').addEventListener('click', () => {
  if (!confirm('确定要恢复所有默认设置吗？文档内容不会丢失。')) return;
  const doc = editor.value;
  settings = { ...DEFAULTS };
  localStorage.removeItem('mf-settings');
  localStorage.removeItem('mf-accent');
  applyAccent(settings.accent);
  applyTheme(settings.theme);
  applyAllSettings();
  editor.value = doc;
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
  help: '<circle cx="10" cy="10" r="7.6"/><path d="M10 14.5v-4.5M10 6.6v.1"/>'
};

const COMMANDS = [
  { id: 'new',       label: '新建文档',        cat: '文件', icon: 'file', action: () => handleAction('new'),        keys: 'Ctrl N' },
  { id: 'open',      label: '打开 Markdown…',  cat: '文件', icon: 'file', action: () => handleAction('open'),       keys: 'Ctrl O' },
  { id: 'save-md',   label: '保存为 .md',      cat: '文件', icon: 'file', action: saveMarkdown,                     keys: 'Ctrl S' },
  { id: 'save-html', label: '导出 HTML',       cat: '文件', icon: 'file', action: exportHtml,                       keys: 'Ctrl ⇧ S' },
  { id: 'print',     label: '打印 / PDF',      cat: '文件', icon: 'file', action: () => window.print(),             keys: 'Ctrl P' },

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

function renderCmdkList(query = '') {
  const q = query.trim();
  cmdkFiltered = q
    ? COMMANDS.filter(c => fuzzyMatch(q, c.label) || fuzzyMatch(q, c.cat))
    : COMMANDS.slice();

  cmdkActiveIndex = 0;

  if (!cmdkFiltered.length) {
    cmdkList.innerHTML = '<div class="cmdk-empty">没有匹配的命令</div>';
    return;
  }

  cmdkList.innerHTML = cmdkFiltered.map((c, i) => `
    <div class="cmdk-item${i === cmdkActiveIndex ? ' active' : ''}" data-idx="${i}">
      <span class="cmd-icon"><svg viewBox="0 0 20 20">${ICONS[c.icon] || ICONS.edit}</svg></span>
      <span class="cmd-label">${escapeHtml(c.label)}</span>
      ${c.keys ? `<kbd>${c.keys}</kbd>` : `<span class="cmd-cat">${c.cat}</span>`}
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

function openCmdk() {
  cmdkOverlay.classList.add('show');
  cmdkInput.value = '';
  renderCmdkList('');
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

cmdkInput.addEventListener('input', () => renderCmdkList(cmdkInput.value));

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
<h4>编辑</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>B</kbd></td><td>加粗</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>I</kbd></td><td>斜体</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>插入链接</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd></td><td>撤销 / 重做</td></tr>
  <tr><td><kbd>Tab</kbd> / <kbd>⇧ Tab</kbd></td><td>增加 / 减少缩进</td></tr>
</table>
<h4>文件</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>N</kbd></td><td>新建文档</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>O</kbd></td><td>打开文件</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>保存为 .md</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>S</kbd></td><td>导出 HTML</td></tr>
</table>
<h4>视图与工具</h4>
<table>
  <tr><td><kbd>Ctrl</kbd> + <kbd>P</kbd></td><td>打开命令面板</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd></td><td>编辑 / 分栏 / 预览</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>B</kbd></td><td>切换右侧面板</td></tr>
  <tr><td><kbd>F11</kbd></td><td>全屏</td></tr>
  <tr><td><kbd>Esc</kbd></td><td>关闭弹窗 / 面板</td></tr>
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

  doRender();
  updateStats();
  updateOutline();
  $('#saveText').textContent = '就绪';

  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);

  requestAnimationFrame(updateScrollMax);

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
