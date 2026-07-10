#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeCss(value) {
  return value.replace(/\\([\\"#.:>\[\]()])/g, '$1');
}

function matchesCompound(element, selector) {
  if (selector === '*') return true;
  if (selector === '[tabindex]:not([tabindex="-1"])') {
    return element.getAttribute('tabindex') !== null && element.getAttribute('tabindex') !== '-1';
  }

  const nth = selector.match(/:nth-of-type\((\d+)\)$/);
  if (nth) {
    selector = selector.slice(0, nth.index);
    const siblings = element.parentElement?.children.filter(
      (candidate) => candidate.tagName === element.tagName
    ) || [];
    if (siblings.indexOf(element) + 1 !== Number(nth[1])) return false;
  }

  const idOnly = selector.match(/^#(.+)$/);
  if (idOnly) return element.id === decodeCss(idOnly[1]);

  const tagId = selector.match(/^([a-z0-9-]+)#(.+)$/i);
  if (tagId) {
    return element.tagName.toLowerCase() === tagId[1].toLowerCase() &&
      element.id === decodeCss(tagId[2]);
  }

  const tagAttr = selector.match(/^([a-z0-9-]+)?\[([a-z0-9-]+)(?:="([\s\S]*)")?\]$/i);
  if (tagAttr) {
    const [, tag, attr, expected] = tagAttr;
    if (tag && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const actual = element.getAttribute(attr);
    return expected === undefined ? actual !== null : actual === decodeCss(expected);
  }

  return element.tagName.toLowerCase() === selector.toLowerCase();
}

function matchesSelector(element, selector) {
  return selector.split(',').some((part) => {
    const chain = part.trim().split(/\s*>\s*/);
    let current = element;
    for (let index = chain.length - 1; index >= 0; index--) {
      if (!current || !matchesCompound(current, chain[index])) return false;
      current = current.parentElement;
    }
    return true;
  });
}

function descendants(root) {
  const out = [];
  for (const child of root.children) {
    out.push(child, ...descendants(child));
  }
  return out;
}

class FakeText {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = text;
    this.parentElement = null;
  }
}

class FakeElement {
  constructor(tag, attrs = {}, children = [], style = {}) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.attrs = new Map(Object.entries(attrs).map(([key, value]) => [key, String(value)]));
    this.id = this.attrs.get('id') || '';
    this.disabled = this.attrs.has('disabled');
    this.style = style;
    this.shadowRoot = null;
    this.parentElement = null;
    this.childNodes = children;
    this.children = children.filter((child) => child.nodeType === 1);
    for (const child of children) child.parentElement = this;
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent || '').join('');
  }

  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  querySelectorAll(selector) {
    return descendants(this).filter((element) => matchesSelector(element, selector));
  }

  getBoundingClientRect() {
    return { x: 0, y: 0, width: 120, height: 32 };
  }
}

function element(tag, attrs = {}, text = '', children = []) {
  const nodes = text ? [new FakeText(text), ...children] : children;
  return new FakeElement(tag, attrs, nodes);
}

function createDocument(children) {
  const body = new FakeElement('body', {}, children);
  return {
    body,
    documentElement: body,
    querySelector(selector) {
      if (selector === 'body') return body;
      return body.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
    createTreeWalker(rootElement) {
      const nodes = descendants(rootElement);
      let index = 0;
      return { nextNode: () => nodes[index++] || null };
    },
  };
}

function runBrowserScript(relativePath, document, options = {}) {
  const logs = [];
  const beforeRun = options.__beforeRun;
  const globals = { ...options };
  delete globals.__beforeRun;
  const context = {
    document,
    location: { href: 'https://example.test/private?session=TEST_SECRET' },
    NodeFilter: { SHOW_ELEMENT: 1 },
    TextEncoder,
    URL,
    console: { log: (...args) => logs.push(args.map(String).join(' ')) },
    CSS: { escape: (value) => String(value).replace(/([^a-zA-Z0-9_-])/g, '\\$1') },
    getComputedStyle: (node) => ({
      display: node.style.display || 'block',
      visibility: node.style.visibility || 'visible',
      opacity: node.style.opacity || '1',
      pointerEvents: node.style.pointerEvents || 'auto',
      cursor: node.style.cursor || 'auto',
    }),
    ...globals,
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  if (typeof beforeRun === 'function') beforeRun(context);
  const source = readFileSync(join(root, relativePath), 'utf8');
  const result = vm.runInContext(source, context, { filename: relativePath });
  return { context, logs, result };
}

function inventorySelectors(markdown) {
  return [...markdown.matchAll(/\|\s*i\d+\s*\|\s*`([^`]+)`\s*\|/g)].map((match) => match[1]);
}

function checkEnumerationSelectorsAndNativeControls() {
  const document = createDocument([
    element('button', { 'data-test': 'save-action' }, 'Save'),
    element('button', { 'aria-label': 'This aria label is deliberately longer than thirty characters' }, 'Long'),
    element('button', { id: 'person@example.test' }, 'Account'),
    element('button', { 'data-test': 'private|selector' }, 'Private selector'),
    element('button', { 'aria-label': 'person@example.test|private' }, 'Private aria'),
    element('button', { id: 'duplicate-id' }, 'Duplicate one'),
    element('button', { id: 'duplicate-id' }, 'Duplicate two'),
    element('button', { 'data-test': 'duplicate-test' }, 'Duplicate test one'),
    element('button', { 'data-test': 'duplicate-test' }, 'Duplicate test two'),
    element('button', {}, `Public label padding before token ${'PARTIALSECRETLEAK'.repeat(3)}`),
    element('details', {}, '', [element('summary', {}, 'Native disclosure')]),
  ]);
  const { context } = runBrowserScript('references/dom-enumeration.js', document, {
    location: { href: 'https://example.test/magic/abc123?session=TEST_SECRET', origin: 'https://example.test' },
  });
  const inventory = context.__interactiveInventory;
  assert(inventory.includes('Native disclosure'), 'enumeration should include native <summary> controls');
  for (const selector of inventorySelectors(inventory)) {
    assert(document.querySelectorAll(selector).length === 1, `generated selector should resolve exactly once: ${selector}`);
  }
  for (const privateValue of ['person@example.test', 'private|selector', 'person@example.test|private']) {
    assert(!inventory.includes(privateValue), `enumeration selector should not leak unsafe identity: ${privateValue}`);
  }
  assert(!inventory.includes('PARTIALSECRETLEAK'), 'enumeration should sanitize full visible text before truncating it');
  assert(!inventory.includes('abc123'), 'enumeration metadata should redact short one-time path tokens');
  for (const line of inventory.split('\n').filter((candidate) => /^\| i\d+ /.test(candidate))) {
    assert(line.split('|').length === 12, `inventory row should retain exactly 10 markdown columns: ${line}`);
  }
}

function checkEnumerationBounds() {
  const document = createDocument(
    Array.from({ length: 505 }, (_, index) => element('button', {}, `Action ${index}`))
  );
  const { context, result, logs } = runBrowserScript('references/dom-enumeration.js', document, {
    __websiteReplicationInventoryOptions: { limit: 1, rootSelector: '#attacker-scope' },
  });
  const inventory = context.__interactiveInventory;
  const rowCount = inventorySelectors(inventory).length;
  assert(rowCount === 500, `page-owned options must not reduce the initial certified inventory; expected 500 rows, got ${rowCount}`);
  assert(/505 visible candidates/.test(inventory), 'enumeration should report the full candidate count');
  assert(/TRUNCATED/.test(inventory), 'enumeration should report truncation explicitly');
  assert(new TextEncoder().encode(result.output).length <= 50_000, 'enumeration return value should stay within 50KB');
  assert(logs.every((line) => new TextEncoder().encode(line).length <= 50_000), 'enumeration console output should stay within 50KB');

  const jsonHeavyDocument = createDocument(
    Array.from({ length: 505 }, () => element('button', { 'aria-label': '\\'.repeat(60) }, 'Action'))
  );
  const jsonHeavy = runBrowserScript('references/dom-enumeration.js', jsonHeavyDocument);
  assert(
    new TextEncoder().encode(JSON.stringify(jsonHeavy.result)).length <= 50_000,
    'enumeration serialized return payload should stay within 50KB'
  );
}

function checkEnumerationUsesOnlyInstalledHookForScopedRuns() {
  const document = createDocument([
    element('div', { id: 'scope' }, '', [element('button', { id: 'duplicate-id' }, 'Inside')]),
    element('button', { id: 'duplicate-id' }, 'Outside'),
  ]);
  const { context, result } = runBrowserScript('references/dom-enumeration.js', document, {
    __websiteReplicationInventoryOptions: { rootSelector: '#scope', limit: 1 },
  });
  assert(context.__interactiveInventoryMeta.candidates === 2, 'initial enumeration should ignore page-owned scope options');
  const hookName = result.hookName;
  assert(result.hookInstalled === true && hookName, 'enumeration should return an agent-callable hook name');
  context.__interactiveInventoryMeta.hookName = 'attackerChosenHook';
  context.attackerChosenHook = () => 'attacker-controlled';
  const scoped = vm.runInContext(`globalThis[${JSON.stringify(hookName)}]({ rootSelector: "#scope", startIndex: 10 })`, context);
  assert(context.__interactiveInventoryMeta.candidates === 1, 'installed hook should allow an explicit scoped enumeration');
  assert(scoped.output.includes('| i010 |'), 'installed hook should honor explicit startIndex despite page metadata tampering');
  for (const selector of inventorySelectors(scoped.output)) {
    assert(document.querySelectorAll(selector).length === 1, `scoped-run selector should remain globally unique: ${selector}`);
  }
}

function checkEnumerationReturnIgnoresLockedPageMirrors() {
  const document = createDocument([element('button', { id: 'real-control' }, 'Real control')]);
  const { result } = runBrowserScript('references/dom-enumeration.js', document, {
    __beforeRun(context) {
      Object.defineProperty(context, '__interactiveInventoryMeta', {
        value: { output: 'ATTACKER_CONTROLLED_OUTPUT', candidates: 999 },
        writable: false,
        configurable: false,
      });
    },
  });
  assert(result.output.includes('#real-control'), 'enumeration return should contain locally generated output');
  assert(!result.output.includes('ATTACKER_CONTROLLED_OUTPUT'), 'enumeration return must not spread page-owned metadata');
  assert(result.candidates === 1, 'enumeration return should retain local candidate counts');
}

function checkEnumerationPreservesDocumentOrderAcrossControlTypes() {
  const document = createDocument([
    element('details', {}, '', [element('summary', { id: 'first-control' }, 'First control')]),
    ...Array.from({ length: 505 }, (_, index) => element('button', { id: `button-${index}` }, `Action ${index}`)),
    element('a', { id: 'last-control', href: '/last' }, 'Last control'),
  ]);
  const { context } = runBrowserScript('references/dom-enumeration.js', document, {
    __websiteReplicationInventoryOptions: { limit: Infinity },
  });
  const inventory = context.__interactiveInventory;
  assert(
    inventory.includes('#first-control'),
    'row cap should preserve document order instead of starving later selector categories'
  );
}

function checkDistillPrivacyAndBounds() {
  const privateMarker = 'TEST_PRIVATE_MESSAGE';
  const document = createDocument([
    element('input', { value: 'TEST_PRIVATE_VALUE', 'aria-label': 'person@example.test' }),
    element('a', { href: '/magic/abc123?token=TEST_SHORT_TOKEN' }, 'Account'),
    element('div', {}, privateMarker),
  ]);
  const first = runBrowserScript('references/dom-distill.js', document);
  const output = first.context.__domDistill;
  for (const marker of ['TEST_PRIVATE_VALUE', 'TEST_SHORT_TOKEN', privateMarker, 'person@example.test', 'abc123']) {
    assert(!output.includes(marker), `dom distill should redact private marker: ${marker}`);
  }
  assert(!output.includes('?session='), 'dom distill metadata should strip location query strings');

  const publicStatus = runBrowserScript('references/dom-distill.js', createDocument([
    element('div', { role: 'status' }, 'Ready person@example.test'),
  ]), {
    __websiteReplicationDistillOptions: { includeText: true },
  });
  assert(!publicStatus.context.__domDistill.includes('Ready'), 'page-owned globals must not enable free-form text capture');
  assert(publicStatus.result.hookInstalled === true && publicStatus.result.hookName, 'dom distill should install an explicit agent-callable hook');
  const scopedStatus = vm.runInContext(`globalThis[${JSON.stringify(publicStatus.result.hookName)}]({ rootSelector: "body", includeText: true, maxNodes: Infinity, maxDepth: Infinity })`, publicStatus.context);
  assert(scopedStatus.output.includes('Ready'), 'dom distill should support explicit text capture for scoped public status changes');
  assert(!scopedStatus.output.includes('person@example.test'), 'opt-in text capture should still redact email-shaped text');
  assert(scopedStatus.bytes <= 50_000, 'explicit distill options must retain the hard output cap');

  const source = readFileSync(join(root, 'references/dom-distill.js'), 'utf8');
  const secondInstall = vm.runInContext(source, publicStatus.context, { filename: 'references/dom-distill.js' });
  assert(secondInstall.hookInstalled === true && secondInstall.hookName, 're-evaluating dom distill should install another safe callable hook');
  assert(secondInstall.hookName !== publicStatus.result.hookName, 'each distill install should use a fresh hook name');

  const largeDocument = createDocument(
    Array.from({ length: 1000 }, (_, index) =>
      element('input', { value: `PRIVATE_${index}_${'x'.repeat(120)}`, 'aria-label': '\\'.repeat(80) })
    )
  );
  const large = runBrowserScript('references/dom-distill.js', largeDocument);
  assert(large.result.bytes <= 50_000, `dom distill should cap output at 50KB, got ${large.result.bytes}`);
  assert(new TextEncoder().encode(JSON.stringify(large.result)).length <= 50_000, 'dom distill serialized return payload should stay within 50KB');
  assert(large.logs.every((line) => new TextEncoder().encode(line).length <= 50_000), 'dom distill console output should stay within 50KB');
}

checkEnumerationSelectorsAndNativeControls();
checkEnumerationBounds();
checkEnumerationUsesOnlyInstalledHookForScopedRuns();
checkEnumerationReturnIgnoresLockedPageMirrors();
checkEnumerationPreservesDocumentOrderAcrossControlTypes();
checkDistillPrivacyAndBounds();

console.log('Browser helper validation passed');
