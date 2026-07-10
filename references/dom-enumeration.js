// website-replication-skill — DOM interactive inventory enumerator
//
// Purpose: produce a deterministic, paste-ready markdown table of every
// interactive element on the current page. Run in DevTools console, or via
// a browser-MCP eval call (Chrome MCP / Playwright MCP / Claude Preview).
//
// Output: bounded markdown stashed at window.__interactiveInventory and
//         returned as `{ output, counts, hookInstalled, hookName }`. Retain
//         `hookName` outside page state for scoped/repeated runs.
//
// Usage in browser-MCP:
//   1. Navigate to the in-scope page.
//   2. Eval this file's contents; retain the returned `hookName` outside page state.
//   3. For an agent-selected scoped/repeated run, call:
//      window[hookName]({ rootSelector: '#region', startIndex: 12 });
//   4. Read window.__interactiveInventory; paste into
//      audit/<site-slug>/snapshots/<date>/<page-slug>-inventory.md.
//
// The script is intentionally framework-agnostic and side-effect-free
// (does not click, does not mutate, does not network).

(function installEnumerator() {
function enumerateInteractive({
  rootSelector = 'body',
  limit = 500,
  includeOffscreen = false,
  startIndex = 0,
} = {}) {
  const HARD_ROW_LIMIT = 500;
  const HARD_OUTPUT_BYTES = 50_000;
  const requestedLimit = Number(limit);
  limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(HARD_ROW_LIMIT, Math.floor(requestedLimit)))
    : HARD_ROW_LIMIT;
  rootSelector = typeof rootSelector === 'string' && rootSelector.length <= 200 ? rootSelector : 'body';
  includeOffscreen = includeOffscreen === true;

  const SELECTORS = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role=button]',
    '[role=tab]',
    '[role=menuitem]',
    '[role=menuitemcheckbox]',
    '[role=menuitemradio]',
    '[role=switch]',
    '[role=checkbox]',
    '[role=radio]',
    '[role=link]',
    '[role=option]',
    '[role=combobox]',
    '[role=slider]',
    '[role=spinbutton]',
    '[role=treeitem]',
    '[role=gridcell]',
    '[role=searchbox]',
    '[tabindex]:not([tabindex="-1"])',
    '[onclick]',
    '[draggable="true"]',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    'summary',
  ];

  let root = document.body;
  try {
    root = document.querySelector(rootSelector) || document.body;
  } catch (_) {}
  const found = new Set();

  // Pass 1: explicit selectors.
  SELECTORS.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => found.add(el));
  });

  // Pass 2: pierce open shadow roots.
  const piercedRoots = new Set([document]);
  function walkShadow(node) {
    if (node.shadowRoot && !piercedRoots.has(node.shadowRoot)) {
      piercedRoots.add(node.shadowRoot);
      SELECTORS.forEach((sel) => {
        node.shadowRoot.querySelectorAll(sel).forEach((el) => found.add(el));
      });
      node.shadowRoot.querySelectorAll('*').forEach(walkShadow);
    }
  }
  root.querySelectorAll('*').forEach(walkShadow);

  // Pass 3: anything with cursor:pointer that isn't already captured.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  let n;
  while ((n = walker.nextNode())) {
    if (found.has(n)) continue;
    if (n.matches('html, body, main, section, article, header, footer, nav, aside, div, span')) {
      try {
        const style = window.getComputedStyle(n);
        if (style.cursor === 'pointer') found.add(n);
      } catch (_) {}
    }
  }

  // Selector-by-selector collection groups controls by type (all buttons,
  // then all links, and so on). Applying a row cap to that insertion order can
  // silently omit early-page controls whose selector appears later in
  // SELECTORS. Restore composed document order before counting/capping.
  const orderedFound = [];
  const orderedSeen = new Set();
  function visitInDocumentOrder(element) {
    if (found.has(element) && !orderedSeen.has(element)) {
      orderedFound.push(element);
      orderedSeen.add(element);
    }
    if (element.shadowRoot) {
      Array.from(element.shadowRoot.children || []).forEach(visitInDocumentOrder);
    }
    Array.from(element.children || []).forEach(visitInDocumentOrder);
  }
  Array.from(root.children || []).forEach(visitInDocumentOrder);
  // Keep a defensive fallback for unusual DOM implementations.
  for (const element of found) {
    if (!orderedSeen.has(element)) orderedFound.push(element);
  }

  function escapeAttr(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function escapeCssIdent(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
      return globalThis.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function isSafeSelectorIdentity(value) {
    const text = String(value || '');
    if (!text || text.length > 80) return false;
    if (/[|`\r\n]/.test(text)) return false;
    if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text)) return false;
    if (/(?:https?|wss?):|[?&]/i.test(text)) return false;
    if (/\b(?:token|session|auth|key|secret|password)[=:_-]/i.test(text)) return false;
    if (/\b[A-Za-z0-9_-]{24,}\b/.test(text)) return false;
    if (/\d{8,}/.test(text)) return false;
    return true;
  }

  function resolvesUniquely(selector, element) {
    if (!selector) return false;
    try {
      const nodeRoot = typeof element.getRootNode === 'function' ? element.getRootNode() : null;
      const queryRoot = nodeRoot && nodeRoot !== document && typeof nodeRoot.querySelectorAll === 'function'
        ? nodeRoot
        : document;
      const matches = queryRoot.querySelectorAll(selector);
      return matches.length === 1 && matches[0] === element;
    } catch (_) {
      return false;
    }
  }

  function cssPath(el) {
    const parts = [];
    let node = el;

    while (node && node.nodeType === 1 && parts.length < 32) {
      const tag = node.tagName.toLowerCase();
      let part = tag;

      const parent = node.parentElement;
      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter(
          (child) => child.tagName === node.tagName
        );
        if (sameTagSiblings.length > 1) {
          part += `:nth-of-type(${sameTagSiblings.indexOf(node) + 1})`;
        }
      }

      parts.unshift(part);
      const candidate = parts.join(' > ');
      if (resolvesUniquely(candidate, el)) return candidate;
      node = parent;
    }

    return parts.join(' > ') || el.tagName.toLowerCase();
  }

  function sanitizeText(value, maxLength = 80) {
    return String(value || '')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
      .replace(/\b(token|session|auth|key)=([^\s&]+)/gi, '$1=[redacted]')
      .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted-token]')
      .replace(/[|`]/g, '/')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
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
      return sanitizeText(raw, 80);
    }).join('/');
  }

  function sanitizeLocation(value) {
    try {
      const url = new URL(value, location.href);
      return sanitizeText(`${url.origin}${redactPath(url.pathname)}`, 200);
    } catch (_) {
      return '(unavailable)';
    }
  }

  // Build rows.
  const rows = [];
  let visibleCandidates = 0;
  let idx = Number.isFinite(startIndex) ? startIndex : parseInt(startIndex, 10);
  if (!Number.isFinite(idx) || idx < 0) idx = 0;
  for (const el of orderedFound) {
    let rect;
    try {
      rect = el.getBoundingClientRect();
    } catch (_) {
      continue;
    }
    const visible = rect.width > 0 && rect.height > 0;
    if (!visible && !includeOffscreen) continue;
    visibleCandidates++;
    if (rows.length >= limit) continue;

    const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    const label =
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      text ||
      el.getAttribute('name') ||
      el.getAttribute('placeholder') ||
      '';

    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || '';
    const disabled =
      el.disabled || el.getAttribute('aria-disabled') === 'true' ? 'yes' : '';

    const testAttribute = el.getAttribute('data-testid') !== null
      ? 'data-testid'
      : el.getAttribute('data-test') !== null
        ? 'data-test'
        : el.getAttribute('data-test-id') !== null
          ? 'data-test-id'
          : '';
    const dataTestId = testAttribute ? el.getAttribute(testAttribute) : '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const selectorCandidates = [
      isSafeSelectorIdentity(el.id) ? `#${escapeCssIdent(el.id)}` : '',
      isSafeSelectorIdentity(dataTestId) ? `[${testAttribute}="${escapeAttr(dataTestId)}"]` : '',
      isSafeSelectorIdentity(ariaLabel) ? `${tag}[aria-label="${escapeAttr(ariaLabel)}"]` : '',
    ];
    const selector = selectorCandidates.find((candidate) => resolvesUniquely(candidate, el)) || cssPath(el);

    rows.push({
      id: `i${String(idx).padStart(3, '0')}`,
      selector,
      tag: role ? `${tag}[role=${sanitizeText(role, 40)}]` : tag,
      label: sanitizeText(label, 60),
      disabled,
      box: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}×${Math.round(rect.height)}`,
    });
    idx++;
  }

  // Emit bounded markdown. Candidate count is computed before row/byte caps so
  // the coverage gate cannot mistake a partial inventory for a complete one.
  const header =
    '| ID | Selector | Tag | Label / aria-label | Disabled | Bounding box | Region | Probed | Result | Notes |';
  const sep = '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const encoder = new TextEncoder();
  function render(currentRows) {
    const truncated = currentRows.length < visibleCandidates;
    const body = currentRows
      .map(
        (r) =>
          `| ${r.id} | \`${r.selector}\` | ${r.tag} | ${r.label} | ${r.disabled} | ${r.box} | | | | |`
      )
      .join('\n');
    return [
      '<!-- Generated by website-replication-skill/references/dom-enumeration.js -->',
      `<!-- ${new Date().toISOString()} · ${visibleCandidates} visible candidates · ${currentRows.length} emitted${truncated ? ' · TRUNCATED' : ''} · ${sanitizeLocation(location.href)} -->`,
      '',
      header,
      sep,
      body,
    ].join('\n');
  }

  let out = render(rows);
  function serializedPayloadBytes(currentOutput, currentRows) {
    return encoder.encode(JSON.stringify({
      output: currentOutput,
      bytes: encoder.encode(currentOutput).length,
      candidates: visibleCandidates,
      emitted: currentRows.length,
      truncated: currentRows.length < visibleCandidates,
      hookInstalled: true,
      hookName: 'x'.repeat(160),
    })).length;
  }
  while (
    rows.length > 0 &&
    (encoder.encode(out).length > HARD_OUTPUT_BYTES ||
      serializedPayloadBytes(out, rows) > HARD_OUTPUT_BYTES)
  ) {
    rows.pop();
    out = render(rows);
  }

  const localResult = {
    output: out,
    bytes: encoder.encode(out).length,
    candidates: visibleCandidates,
    emitted: rows.length,
    truncated: rows.length < visibleCandidates,
  };
  try { window.__interactiveInventory = out; } catch (_) {}
  try {
    window.__interactiveInventoryMeta = {
      bytes: localResult.bytes,
      candidates: localResult.candidates,
      emitted: localResult.emitted,
      truncated: localResult.truncated,
    };
  } catch (_) {}
  return localResult;
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

function runEnumeration(options = {}) {
  const result = enumerateInteractive(options);
  return Object.freeze({
    ...result,
    hookInstalled,
    hookName,
  });
}

for (let attempt = 0; attempt < 5 && !hookInstalled; attempt++) {
  const candidate = `__websiteReplicationEnumerate_${nonce}_${attempt}`;
  try {
    const existing = Object.getOwnPropertyDescriptor(globalThis, candidate);
    if (existing && !existing.configurable) continue;
    Object.defineProperty(globalThis, candidate, {
      value: runEnumeration,
      writable: false,
      configurable: false,
      enumerable: false,
    });
    hookName = candidate;
    hookInstalled = true;
  } catch (_) {}
}

return runEnumeration();
})();
