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
//   - markdown nested list printed to console
//   - stashed at window.__domDistill for paste into evidence
//   - return value: { bytes, nodesEmitted, truncated, output }
//
// Side-effect-free: no clicks, no DOM mutations, no network.

(function distill({
  rootSelector = 'body',
  maxTextLen = 60,
  maxDepth = 10,
  maxNodes = 2000,
  collapseWrappers = true,
} = {}) {
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
    'href', 'name', 'type', 'placeholder', 'value', 'disabled', 'tabindex',
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
  const root = document.querySelector(rootSelector) || document.body;

  function truncate(s, n) {
    s = String(s).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n) + `…(+${s.length - n})`;
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

  function shortenUrl(v) {
    if (v.length <= 80) return v;
    try {
      const u = new URL(v, location.href);
      const qs = u.search ? '?…' : '';
      const candidate = `${u.origin}${u.pathname}${qs}`;
      return candidate.length < v.length ? candidate : v.slice(0, 80) + '…';
    } catch (_) {
      return v.slice(0, 80) + '…';
    }
  }

  function pickAttrs(el) {
    const out = {};
    for (const a of KEEP_ATTRS) {
      let v = el.getAttribute(a);
      if (v === null) continue;
      v = String(v);
      if (a === 'href' || a === 'src') {
        v = shortenUrl(v);
      } else if (v.length > 80) {
        v = v.slice(0, 80) + '…';
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
      const t = truncate(node.textContent, maxTextLen);
      return t ? { text: t } : null;
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
      return children[0];
    }

    // Drop empty leaves with neither attributes nor children, unless their
    // presence is structurally meaningful (headings, landmarks, inputs).
    if (children.length === 0 && Object.keys(attrs).length === 0 && !PRESENCE_MATTERS.has(tag)) {
      return null;
    }

    return { tag, attrs, children };
  }

  function formatAttrs(attrs) {
    const parts = [];
    for (const [k, v] of Object.entries(attrs)) {
      if (v === '' || v === 'true') parts.push(`[${k}]`);
      else parts.push(`[${k}="${v.replace(/"/g, '\\"')}"]`);
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
    `<!-- ${new Date().toISOString()} · ${location.href} -->`,
    `<!-- ${nodesEmitted} nodes${truncated ? ` (TRUNCATED at maxNodes=${maxNodes})` : ''} · max depth ${maxDepth} -->`,
    '',
  ].join('\n');

  const body = tree ? serialize(tree, 0) : '(empty — nothing to distill)';
  const out = header + body;

  console.log(out);
  window.__domDistill = out;
  return { bytes: out.length, nodesEmitted, truncated, output: out };
})();
