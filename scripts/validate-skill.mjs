#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const coverageScript = join(root, 'references', 'coverage.js');

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function checkJsSyntax() {
  const files = [
    'coverage.js',
    'design-tokens.js',
    'dom-distill.js',
    'dom-enumeration.js',
    'network-cluster.js',
    'state-diff.js',
  ];

  for (const file of files) {
    const result = runNode(['--check', join(root, 'references', file)]);
    assert(result.status === 0, `node --check failed for ${file}\n${result.stderr}`);
  }
}

function checkCoverageReadsAppendedInventorySections() {
  const dir = mkdtempSync(join(tmpdir(), 'website-replication-skill-'));
  const inventoryPath = join(dir, 'inventory.md');

  writeFileSync(
    inventoryPath,
    [
      '| ID | Selector | Tag | Label / aria-label | Disabled | Bounding box | Region | Probed | Result | Notes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| i000 | `#open` | button | Open | | 0,0 10x10 | Z1 | ✓ | observed | |',
      '<!-- After opening modal -->',
      '| ID | Selector | Tag | Label / aria-label | Disabled | Bounding box | Region | Probed | Result | Notes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| i001 | `#delete` | button | Delete | | 0,0 10x10 | Z2 | ✗ | skipped no reason | |',
      '',
    ].join('\n')
  );

  const result = runNode([coverageScript, inventoryPath, '--threshold=100']);
  rmSync(dir, { recursive: true, force: true });

  assert(result.status === 1, `coverage gate should fail for appended unprobed row\n${result.stdout}`);
  assert(result.stdout.includes('Enumerated: **2**'), `coverage should count appended rows\n${result.stdout}`);
  assert(result.stdout.includes('`i001`'), `coverage should name appended unprobed row\n${result.stdout}`);
}

function checkEnumerationSupportsAppendStartIndex() {
  const source = readFileSync(join(root, 'references', 'dom-enumeration.js'), 'utf8');
  assert(source.includes('startIndex = 0'), 'dom-enumeration.js should expose a startIndex option');
  assert(source.includes('window.__websiteReplicationInventoryOptions'), 'dom-enumeration.js should support window-provided options');
  assert(source.includes('cssPath(el)'), 'dom-enumeration.js should provide a stable fallback selector');
  assert(source.includes(':nth-of-type('), 'fallback selector should disambiguate repeated tag-only controls');
}

checkJsSyntax();
checkCoverageReadsAppendedInventorySections();
checkEnumerationSupportsAppendStartIndex();

console.log('Skill validation passed');
