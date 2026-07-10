// website-replication-skill — DOM structural distiller
//
// Purpose: produce a compact markdown outline of the visible page —
// structure + key attributes + truncated text — while dropping framework
// boilerplate. Aim for 50–100× smaller than the page's raw outerHTML.
//
// When to use:
//   - the browser MCP does NOT have a built-in accessibility-tree snapshot
//     tool (e.g. Playwright MCP, Claude Preview, generic eval-only setups);
//   - you need short text content alongside structure (a11y trees often
//     skip non-interactive headings, paragraphs, captions);
//   - you want a stable, diff-friendly artefact across re-runs.
//
// Output:
//   - bounded markdown stashed at window.__domDistill
//   - a small console summary (never the evidence body)
//   - return value: { bytes, nodesEmitted, truncated, output }
//
// Free-form text and form values are omitted by default. Use a browser-native
// accessibility snapshot for public copy when text is required.
// For a scoped, known-public status region, evaluate this file, read the
// returned `hookName`, and call:
//   window[hookName]({ rootSelector: '#status', includeText: true });
//
// Side-effect-free: no clicks, no DOM mutations, no network.

(function installDistiller() {
function distill({
  rootSelector = 'body',
  maxTextLen = 60,
  maxDepth = 10,
  maxNodes = 2000,
  collapseWrappers = true,
  includeText = false,
  maxOutputBytes = 50_000,
} = {}) {
  const HARD_OUTPUT_BYTES = 50_000;
  function boundedInteger(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? Math.max(minimum, Math.min(maximum, Math.floor(parsed)))
      : fallback;
  }
  maxTextLen = boundedInteger(maxTextLen, 60, 1, 200);
  maxDepth = boundedInteger(maxDepth, 10, 1, 20);
  maxNodes = boundedInteger(maxNodes, 2000, 1, 5000);
  rootSelector = typeof rootSelector === 'string' && rootSelector.length <= 200
    ? rootSelector
    : 'body';
  collapseWrappers = collapseWrappers !== false;
  includeText = includeText === true;
  maxOutputBytes = Number.isFinite(Number(maxOutputBytes))
    ? Math.max(1_000, Math.min(HARD_OUTPUT_BYTES, Math.floor(Number(maxOutputBytes))))
    : HARD_OUTPUT_BYTES;
  const DROP_TAGS = new Set([
    'script', 'style', 'noscript', 'meta', 'link', 'head',
    // SVG primitives — keep <svg> structure out of distill; icons rarely
    // matter for behavior parity and bloat the output heavily.
    'svg', 'path', 'circle', 'rect', 'g', 'defs', 'use', 'symbol',
    'polygon', 'polyline', 'line', 'ellipse', 'mask', 'clippath', 'pattern',
  ]);

  // Attributes worth keeping for an audit context. Everything else is dropped.
  const KEEP_ATTRS = [
    'id', 'role',
    'aria-label', 'aria-disabled', 'aria-expanded', 'aria-haspopup',
    'aria-checked', 'aria-selected', 'aria-pressed', 'aria-current',
    'aria-describedby', 'aria-live',
    'href', 'name', 'type', 'disabled', 'tabindex',
    'data-testid', 'data-test', 'data-test-id', 'data-cy',
    'for', 'alt', 'title', 'contenteditable',
  ];

  // Elements whose mere presence is structurally meaningful even when they
  // have no children and no attributes (forms, headings, landmarks).
  const PRESENCE_MATTERS = new Set([
    'input', 'textarea', 'select', 'img', 'iframe', 'video', 'audio',
    'button', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'main', 'nav', 'header', 'footer', 'section', 'article', 'aside',
    'dialog', 'form', 'fieldset', 'legend',
  ]);

  let budget = maxNodes;
  let root = document.body;
  try {
    root = document.querySelector(rootSelector) || document.body;
  } catch (_) {}

  function truncate(s, n) {
    s = sanitizeText(s).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n) + `…(+${s.length - n})`;
  }

  function sanitizeText(value) {
    return String(value || '')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
      .replace(/\b(token|session|auth|key)=([^\s&]+)/gi, '$1=[redacted]')
      .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted-token]')
      .replace(/[|`]/g, '/')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  function redactPath(pathname) {
    const sensitiveParent = /^(?:auth|callback|confirm|confirmation|invite|magic|oauth|password|redeem|reset|session|share|sso|token|verify)$/i;
    const parts = String(pathname || '').split('/');
    return parts.map((raw, index) => {
      let decoded = raw;
      let previous = parts[index - 1] || '';
      try { decoded = decodeURIComponent(raw); } catch (_) {}
      try { previous = decodeURIComponent(previous); } catch (_) {}
      if (sensitiveParent.test(previous)) return '[redacted]';
      if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(decoded)) return '[redacted-email]';
      if (/\b(?:token|session|auth|key)=/i.test(decoded)) return '[redacted]';
      if (/\b[A-Za-z0-9_-]{24,}\b/.test(decoded)) return '[redacted-token]';
      return sanitizeText(raw);
    }).join('/');
  }

  function isHidden(el) {
    try {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (cs.opacity === '0' && cs.pointerEvents === 'none') return true;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        // Inputs can be 0×0 by design (hidden file input) but are still
        // meaningful for audit purposes.
        if (!['input', 'textarea', 'select', 'option'].includes(el.tagName.toLowerCase())) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function safeUrl(v) {
    try {
      const u = new URL(v, location.href);
      const prefix = u.origin === location.origin ? '' : u.origin;
      return sanitizeText(`${prefix}${redactPath(u.pathname)}`).slice(0, 120);
    } catch (_) {
      return '(redacted-url)';
    }
  }

  function pickAttrs(el) {
    const out = {};
    for (const a of KEEP_ATTRS) {
      let v = el.getAttribute(a);
      if (v === null) continue;
      v = String(v);
      if (a === 'href') {
        v = safeUrl(v);
      } else if (v.length > 80) {
        v = sanitizeText(v).slice(0, 80) + '…';
      } else {
        v = sanitizeText(v);
      }
      out[a] = v;
    }
    if (el.disabled === true) out.disabled = '';
    return out;
  }

  function distillNode(node, depth) {
    if (budget <= 0) return null;
    if (depth > maxDepth) return null;

    if (node.nodeType === 3 /* TEXT_NODE */) {
      if (!includeText || budget <= 0) return null;
      const t = truncate(node.textContent, maxTextLen);
      if (!t) return null;
      budget--;
      return { text: t };
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return null;

    const tag = node.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) return null;
    if (isHidden(node)) return null;

    budget--;

    const attrs = pickAttrs(node);
    const children = [];
    for (const c of node.childNodes) {
      if (budget <= 0) break;
      const r = distillNode(c, depth + 1);
      if (r) children.push(r);
    }

    // Collapse single-child wrapper divs/spans with no signal attributes —
    // these are the framework noise that bloats raw HTML most.
    if (collapseWrappers && (tag === 'div' || tag === 'span') &&
        Object.keys(attrs).length === 0 && children.length === 1) {
      budget++;
      return children[0];
    }

    // Drop empty leaves with neither attributes nor children, unless their
    // presence is structurally meaningful (headings, landmarks, inputs).
    if (children.length === 0 && Object.keys(attrs).length === 0 && !PRESENCE_MATTERS.has(tag)) {
      budget++;
      return null;
    }

    return { tag, attrs, children };
  }

  function formatAttrs(attrs) {
    const parts = [];
    for (const [k, v] of Object.entries(attrs)) {
      if (v === '' || v === 'true') parts.push(`[${k}]`);
      else parts.push(`[${k}="${sanitizeText(v).replace(/]/g, '\\]').replace(/"/g, '\\"')}"]`);
    }
    return parts.join('');
  }

  function serialize(node, indent) {
    const pad = '  '.repeat(indent);
    if ('text' in node) {
      return `${pad}- text: "${node.text.replace(/"/g, '\\"')}"`;
    }
    const { tag, attrs, children } = node;
    const line = `${pad}- ${tag}${formatAttrs(attrs)}`;
    if (children.length === 0) return line;
    return [line, ...children.map((c) => serialize(c, indent + 1))].join('\n');
  }

  const tree = distillNode(root, 0);
  const nodesEmitted = maxNodes - budget;
  const truncated = budget <= 0;

  const header = [
    `<!-- Generated by website-replication-skill/references/dom-distill.js -->`,
    `<!-- ${new Date().toISOString()} · ${safeUrl(location.href)} -->`,
    `<!-- ${nodesEmitted} nodes${truncated ? ` (TRUNCATED at maxNodes=${maxNodes})` : ''} · max depth ${maxDepth} -->`,
    '',
  ].join('\n');

  const body = tree ? serialize(tree, 0) : '(empty — nothing to distill)';
  let out = header + body;
  let byteTruncated = false;
  const encoder = new TextEncoder();
  if (encoder.encode(out).length > maxOutputBytes) {
    const marker = '\n<!-- TRUNCATED: output exceeded the 50KB evidence limit -->';
    let low = 0;
    let high = out.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (encoder.encode(out.slice(0, mid) + marker).length <= maxOutputBytes) low = mid;
      else high = mid - 1;
    }
    out = out.slice(0, low).replace(/[^\n]*$/, '') + marker;
    byteTruncated = true;
  }
  let bytes = encoder.encode(out).length;
  let finalTruncated = truncated || byteTruncated;
  function makeResult() {
    return { bytes, nodesEmitted, truncated: finalTruncated, output: out };
  }
  let result = makeResult();
  const hookReserve = { hookInstalled: true, hookName: 'x'.repeat(160) };
  if (encoder.encode(JSON.stringify({ ...result, ...hookReserve })).length > HARD_OUTPUT_BYTES) {
    const marker = '\n<!-- TRUNCATED: serialized evidence payload exceeded the 50KB limit -->';
    let low = 0;
    let high = out.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = out.slice(0, mid).replace(/[^\n]*$/, '') + marker;
      const candidateResult = {
        bytes: encoder.encode(candidate).length,
        nodesEmitted,
        truncated: true,
        output: candidate,
        ...hookReserve,
      };
      if (encoder.encode(JSON.stringify(candidateResult)).length <= HARD_OUTPUT_BYTES) low = mid;
      else high = mid - 1;
    }
    out = out.slice(0, low).replace(/[^\n]*$/, '') + marker;
    bytes = encoder.encode(out).length;
    finalTruncated = true;
    result = makeResult();
  }

  console.log(`DOM distill ready: ${bytes} bytes · ${nodesEmitted} nodes${finalTruncated ? ' · TRUNCATED' : ''}`);
  window.__domDistill = out;
  window.__domDistillMeta = { bytes, nodesEmitted, truncated: finalTruncated };
  return result;
}

let hookInstalled = false;
let hookName = null;
let nonce;
try {
  const words = new Uint32Array(3);
  globalThis.crypto.getRandomValues(words);
  nonce = Array.from(words, (word) => word.toString(36)).join('_');
} catch (_) {
  nonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
for (let attempt = 0; attempt < 5 && !hookInstalled; attempt++) {
  const candidate = `__websiteReplicationDistill_${nonce}_${attempt}`;
  try {
    const existing = Object.getOwnPropertyDescriptor(globalThis, candidate);
    if (existing && !existing.configurable) continue;
    Object.defineProperty(globalThis, candidate, {
      value: distill,
      writable: false,
      configurable: false,
      enumerable: false,
    });
    hookName = candidate;
    hookInstalled = true;
  } catch (_) {}
}

const initialResult = distill();
initialResult.hookInstalled = hookInstalled;
initialResult.hookName = hookName;
return initialResult;
})();
