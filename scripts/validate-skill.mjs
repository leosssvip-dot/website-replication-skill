#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const coverageScript = join(root, 'references', 'coverage.js');
const stateDiffScript = join(root, 'references', 'state-diff.js');
const networkClusterScript = join(root, 'references', 'network-cluster.js');
const browserValidationScript = join(root, 'scripts', 'validate-browser-helpers.mjs');

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

function inventory(rows) {
  return [
    '| ID | Selector | Tag | Label / aria-label | Disabled | Bounding box | Region | Probed | Result | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function checkCoverageRejectsFalseConfidence() {
  const dir = mkdtempSync(join(tmpdir(), 'website-replication-coverage-'));
  try {
    const falseBlocked = join(dir, 'false-blocked.md');
    writeFileSync(falseBlocked, inventory([
      '| i000 | `#save` | button | Save | | 0,0 10x10 | Z1 | ✓ | observed: saved | |',
      '| i001 | `#delete` | button | Delete | | 0,0 10x10 | Z1 | ✗ | not blocked; pending test data | |',
    ]));
    let result = runNode([coverageScript, falseBlocked, '--threshold=90']);
    assert(result.status === 1, `coverage should fail below threshold even when Result contains "not blocked"\n${result.stdout}`);

    const allBlocked = join(dir, 'all-blocked.md');
    writeFileSync(allBlocked, inventory([
      '| i000 | `#delete` | button | Delete | | 0,0 10x10 | Z1 | ✗ | blocked: destructive action not authorized | |',
    ]));
    result = runNode([coverageScript, allBlocked, '--threshold=90']);
    assert(result.status === 1, `implementation-ready coverage should not pass at 0%\n${result.stdout}`);

    const valid = join(dir, 'valid.md');
    writeFileSync(valid, inventory([
      '| i000 | `#save` | button | Save | | 0,0 10x10 | Z1 | ✓ | observed: saved | |',
    ]));
    result = runNode([coverageScript, valid]);
    assert(result.status === 1, `coverage should not certify an inventory with no enumeration completeness metadata\n${result.stdout}${result.stderr}`);
    for (const threshold of ['-1', '101', 'NaN']) {
      result = runNode([coverageScript, valid, `--threshold=${threshold}`]);
      assert(result.status === 2, `coverage should reject threshold=${threshold}\n${result.stdout}${result.stderr}`);
    }

    const duplicate = join(dir, 'duplicate.md');
    writeFileSync(duplicate, inventory([
      '| i000 | `#save` | button | Save | | 0,0 10x10 | Z1 | ✓ | observed: saved | |',
      '| i000 | `#delete` | button | Delete | | 0,0 10x10 | Z1 | ✓ | observed: deleted | |',
    ]));
    result = runNode([coverageScript, duplicate]);
    assert(result.status === 2, `coverage should reject duplicate inventory IDs\n${result.stdout}${result.stderr}`);

    const truncated = join(dir, 'truncated.md');
    writeFileSync(truncated, [
      '<!-- 2026-07-10T00:00:00Z · 600 visible candidates · 1 emitted · TRUNCATED · https://example.test/ -->',
      inventory([
        '| i000 | `#save` | button | Save | | 0,0 10x10 | Z1 | ✓ | observed: saved | |',
      ]),
    ].join('\n'));
    result = runNode([coverageScript, truncated]);
    assert(result.status === 1, `coverage should fail a truncated inventory even when every emitted row is probed\n${result.stdout}${result.stderr}`);

    const multiState = join(dir, 'multi-state.md');
    writeFileSync(multiState, [
      '<!-- 2026-07-10T00:00:00Z · 1 visible candidates · 1 emitted · https://example.test/ -->',
      inventory(['| i000 | `#open` | button | Open | | 0,0 10x10 | Z1 | ✓ | observed: opened | |']),
      '<!-- After opening confirmation -->',
      '<!-- 2026-07-10T00:01:00Z · 1 visible candidates · 1 emitted · https://example.test/ -->',
      inventory(['| i001 | `#cancel` | button | Cancel | | 0,0 10x10 | Z2 | ✓ | observed: dismissed | |']),
    ].join('\n'));
    result = runNode([coverageScript, multiState, '--threshold=100']);
    assert(result.status === 0, `coverage should accept complete state-specific tables whose metadata matches all appended rows\n${result.stdout}${result.stderr}`);

    const missingStateMetadata = join(dir, 'missing-state-metadata.md');
    writeFileSync(missingStateMetadata, [
      '<!-- 2026-07-10T00:00:00Z · 2 visible candidates · 2 emitted · https://example.test/ -->',
      inventory(['| i000 | `#open` | button | Open | | 0,0 10x10 | Z1 | ✓ | observed: opened | |']),
      '<!-- After opening confirmation -->',
      inventory(['| i001 | `#cancel` | button | Cancel | | 0,0 10x10 | Z2 | ✓ | observed: dismissed | |']),
    ].join('\n'));
    result = runNode([coverageScript, missingStateMetadata, '--threshold=100']);
    assert(result.status === 1, `coverage should require completeness metadata for every state-specific table\n${result.stdout}${result.stderr}`);

    const markerInUrl = join(dir, 'marker-in-url.md');
    writeFileSync(markerInUrl, [
      '<!-- 2026-07-10T00:00:00Z · 1 visible candidates · 1 emitted · https://example.test/TRUNCATED -->',
      inventory(['| i000 | `#open` | button | Open | | 0,0 10x10 | Z1 | ✓ | observed: opened | |']),
    ].join('\n'));
    result = runNode([coverageScript, markerInUrl, '--threshold=100']);
    assert(result.status === 0, `coverage should not treat a URL pathname containing TRUNCATED as a truncation marker\n${result.stdout}${result.stderr}`);

    const oversizedReasons = join(dir, 'oversized-reasons.md');
    const oversizedRows = Array.from({ length: 30 }, (_, index) =>
      `| i${String(index).padStart(3, '0')} | \`#row-${index}\` | button | Row | | 0,0 10x10 | Z1 | ✗ | ${'reason '.repeat(2_000)} | |`
    );
    writeFileSync(oversizedReasons, [
      '<!-- 2026-07-10T00:00:00Z · 30 visible candidates · 30 emitted · https://example.test/ -->',
      inventory(oversizedRows),
    ].join('\n'));
    result = runNode([coverageScript, oversizedReasons]);
    assert(result.status === 1, `oversized-reason coverage fixture should fail honestly\n${result.stdout}${result.stderr}`);
    assert(Buffer.byteLength(result.stdout, 'utf8') <= 50_000, `coverage report should stay within 50KB, got ${Buffer.byteLength(result.stdout, 'utf8')}`);
    assert(result.stdout.includes('[truncated]'), 'coverage should mark bounded reason text as truncated');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function checkStateDiffDetectsMovementAndInvalidInput() {
  const dir = mkdtempSync(join(tmpdir(), 'website-replication-state-'));
  try {
    const before = join(dir, 'before.md');
    const after = join(dir, 'after.md');
    const header = '<!-- Generated by website-replication-skill/references/dom-distill.js -->\n';
    writeFileSync(before, `${header}- main\n  - button[id="first"]\n  - button[id="second"]\n`);
    writeFileSync(after, `${header}- main\n  - button[id="second"]\n  - button[id="first"]\n`);
    let result = runNode([stateDiffScript, before, after]);
    assert(result.status === 0 && result.stdout.includes('Moved signatures: **2**'), `state diff should report reordered nodes\n${result.stdout}${result.stderr}`);

    const inserted = join(dir, 'inserted.md');
    writeFileSync(inserted, `${header}- h1[id="new"]\n- main\n  - button[id="first"]\n  - button[id="second"]\n`);
    result = runNode([stateDiffScript, before, inserted]);
    assert(result.status === 0 && result.stdout.includes('Moved signatures: **0**'), `state diff should not mark unchanged relative order as movement after an insertion\n${result.stdout}${result.stderr}`);

    const invalid = join(dir, 'invalid.md');
    writeFileSync(invalid, 'not a dom-distill artifact\n');
    result = runNode([stateDiffScript, invalid, invalid]);
    assert(result.status === 2, `state diff should reject invalid/empty artifacts\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function checkNetworkClusterHandlesRealtimeAndRedactsPaths() {
  const dir = mkdtempSync(join(tmpdir(), 'website-replication-network-'));
  try {
    const requests = join(dir, 'requests.txt');
    writeFileSync(requests, [
      'GET wss://example.test/socket.io/ [101]',
      'GET https://api.example.test/users/person@example.test/reset/abc123/a|b [200]',
      '',
    ].join('\n'));
    let result = runNode([networkClusterScript, requests]);
    assert(result.status === 0, `network cluster should parse HTTP and WebSocket traces\n${result.stdout}${result.stderr}`);
    assert(result.stdout.includes('socket.io'), `network cluster should retain generalized WebSocket routes\n${result.stdout}`);
    for (const secret of ['person@example.test', 'abc123', '/a|b']) {
      assert(!result.stdout.includes(secret), `network cluster should redact/escape sensitive path content: ${secret}\n${result.stdout}`);
    }

    const encoded = join(dir, 'encoded.txt');
    writeFileSync(encoded, [
      'GET https://api.example.test/files/a%2Fb [200]',
      'GET https://api.example.test/files/a/b [200]',
      'GET https://api.example.test/files/a%252Fb [200]',
      '',
    ].join('\n'));
    result = runNode([networkClusterScript, encoded]);
    assert(result.status === 0 && result.stdout.includes('3 unique endpoints'), `network cluster should preserve encoded path separators and encoding depth\n${result.stdout}${result.stderr}`);
    assert(result.stdout.includes('Distinct hosts**: 1 — api.example.test'), `network cluster should not pass Array.map indexes as markdown length limits\n${result.stdout}`);

    const large = join(dir, 'large.txt');
    writeFileSync(large, Array.from({ length: 2_000 }, (_, index) =>
      `GET https://api.example.test/routes/item-${index} [200]`
    ).join('\n'));
    result = runNode([networkClusterScript, large]);
    assert(result.status === 0, `large network cluster should complete\n${result.stdout}${result.stderr}`);
    assert(Buffer.byteLength(result.stdout, 'utf8') <= 50_000, `network cluster should cap stdout at 50KB, got ${Buffer.byteLength(result.stdout, 'utf8')}`);
    assert(result.stdout.includes('TRUNCATED'), 'network cluster should mark capped output as TRUNCATED');

    const longSocket = join(dir, 'long-socket.txt');
    writeFileSync(longSocket, `GET https://api.example.test/socket/${Array.from({ length: 10_000 }, () => 'a').join('/')} [101]\n`);
    result = runNode([networkClusterScript, longSocket]);
    assert(result.status === 0, `long notable network route should complete\n${result.stdout}${result.stderr}`);
    assert(Buffer.byteLength(result.stdout, 'utf8') <= 50_000, `notable-pattern output should stay within 50KB, got ${Buffer.byteLength(result.stdout, 'utf8')}`);
    assert(result.stdout.includes('TRUNCATED'), 'long path generalization should mark output as TRUNCATED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function checkMetadataAndSkillContracts() {
  const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  const keys = frontmatter.split('\n').filter((line) => /^[a-zA-Z]/.test(line)).map((line) => line.split(':')[0]);
  assert(keys.length === 2 && keys.includes('name') && keys.includes('description'), `SKILL.md frontmatter should contain only name and description; got ${keys.join(', ')}`);
  assert(skill.split(/\s+/).filter(Boolean).length < 5_000, 'SKILL.md should stay below 5,000 words via progressive disclosure');
  assert(skill.includes('Consequential actions'), 'SKILL.md should define a consequential-action safety boundary');
  assert(skill.includes('Probed = ✗') && skill.includes('Result = blocked:'), 'SKILL.md should keep final consequential controls un-probed and blocked');
  assert(skill.includes('Never copy a browser profile'), 'SKILL.md should forbid browser-profile copying');
  for (const unsafe of ['copy the user\'s browser profile', 'one-time magic link, or a session they mint']) {
    assert(!skill.includes(unsafe), `SKILL.md should remove unsafe auth handoff wording: ${unsafe}`);
  }

  const agentMetadata = readFileSync(join(root, 'agents', 'openai.yaml'), 'utf8');
  assert(!/^name:/m.test(agentMetadata) && !/^version:/m.test(agentMetadata), 'agents/openai.yaml should contain only supported top-level schema fields');
  assert(agentMetadata.includes('interface:') && agentMetadata.includes('policy:'), 'agents/openai.yaml should retain interface and invocation policy');

}

function checkDocumentationSafetyContracts() {
  const required = new Map([
    ['SKILL.zh.md', ['安全测试环境', '绝不复制浏览器 profile', '最可能漏掉的三件事', '截断的枚举元数据']],
    ['README.md', ['### Operational Safety', 'Never copy a browser profile', '### 操作安全', 'git check-ignore -q -- <raw-root>', '#8-data-model']],
    ['CHANGELOG.md', ['## [1.0.0] — 2026-07-10', 'credential/session/magic-link transfer are prohibited', 'safe test environment exists']],
    ['references/inventory-template.md', ['visible candidates', 'Probed = ✗', 'PII review']],
    ['references/output-template.md', ['git check-ignore -q -- <raw-root>', 'audit/<site-slug>/snapshots/<date>/<page>-inventory.md', 'Safety Class', 'Authorization / Rollback', 'separate `✗` / `blocked:` inventory row']],
    ['references/quick-audit-template.md', ['Compact Control Intent Ledger', 'git check-ignore -q -- <raw-root>', 'safe test environment', 'separate `✗` / `blocked:` inventory row']],
    ['references/parity-checklist.md', ['safe test environment', 'git check-ignore -q -- <raw-root>', 'credential/session/magic-link material are never transferred', 'separate `✗` / `blocked:` row']],
    ['references/manifest-template.md', ['store origin + pathname by default', 'never store fragments']],
  ]);
  for (const [file, phrases] of required.entries()) {
    const source = readFileSync(join(root, file), 'utf8');
    for (const phrase of phrases) {
      assert(source.includes(phrase), `${file} should include safety/documentation contract: ${phrase}`);
    }
  }

  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  for (const unsafe of ['copy profile to a temp dir', 'session handoff into a throwaway context']) {
    assert(!changelog.includes(unsafe), `CHANGELOG.md should not retain an actionable unsafe handoff recipe: ${unsafe}`);
  }
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert(!readme.includes('#7-data-model'), 'README data-model links should target the current section 8 anchor');
  const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
  assert(skill.includes('git check-ignore -q -- <raw-root>'), 'SKILL.md should verify custom raw evidence roots before capture');
  assert(!skill.includes('evidence/interactive-inventory.md'), 'SKILL.md should use the canonical ignored inventory path');
  assert(skill.includes('retain its `hookName` outside page state') && !skill.includes('__interactiveInventoryMeta.hookName'), 'SKILL.md should keep enumeration hook identity outside page-writable state');

  const inventoryResult = runNode([coverageScript, join(root, 'references', 'inventory-template.md')]);
  assert(inventoryResult.status === 0, `inventory template example should pass its own default coverage gate\n${inventoryResult.stdout}${inventoryResult.stderr}`);
}

function checkBrowserHelperBehavior() {
  const result = runNode([browserValidationScript]);
  assert(result.status === 0, `browser helper validation failed\n${result.stdout}${result.stderr}`);
}

function checkEnumerationSupportsAppendStartIndex() {
  const source = readFileSync(join(root, 'references', 'dom-enumeration.js'), 'utf8');
  assert(source.includes('startIndex = 0'), 'dom-enumeration.js should expose a startIndex option');
  assert(source.includes('hookName') && source.includes('runEnumeration(options = {})'), 'dom-enumeration.js should expose agent-controlled scoped/repeated runs');
  assert(!source.includes('__websiteReplicationInventoryOptions'), 'dom-enumeration.js should ignore page-owned option globals');
  assert(source.includes('cssPath(el)'), 'dom-enumeration.js should provide a stable fallback selector');
  assert(source.includes(':nth-of-type('), 'fallback selector should disambiguate repeated tag-only controls');
}

function checkRegionLayoutConstraintsContract() {
  const required = new Map([
    ['SKILL.md', ['Region Layout Constraints', 'Anchor Target', 'Positioning Mode', 'Collision Rules']],
    [
      'references/region-model-template.md',
      ['## 3. Region Layout Constraints', '| Region | Placement | Anchor Target | Positioning Mode | Sizing Rule | Scroll Behavior | Layering / Containment | Responsive Transform | Collision Rules | Evidence | Source | Confidence |'],
    ],
    ['references/output-template.md', ['### Region Layout Constraints', 'Placement', 'Anchor Target', 'Positioning Mode', 'Collision Rules']],
    ['references/prd-template.md', ['Layout Constraints:', '- Placement:', '- Anchor target:', '- Positioning mode:', '- Collision rules:']],
    ['references/quick-audit-template.md', ['Layout Constraints', '| Region | Placement | Anchor | Scroll Behavior | Mobile Transform | Evidence |']],
    ['references/parity-checklist.md', ['## Region Layout Constraints', 'sticky / fixed / docked', 'keyboard / safe-area']],
  ]);

  for (const [file, phrases] of required.entries()) {
    const source = readFileSync(join(root, file), 'utf8');
    for (const phrase of phrases) {
      assert(source.includes(phrase), `${file} should include region layout constraint phrase: ${phrase}`);
    }
  }
}

checkJsSyntax();
checkCoverageReadsAppendedInventorySections();
checkCoverageRejectsFalseConfidence();
checkEnumerationSupportsAppendStartIndex();
checkRegionLayoutConstraintsContract();
checkStateDiffDetectsMovementAndInvalidInput();
checkNetworkClusterHandlesRealtimeAndRedactsPaths();
checkMetadataAndSkillContracts();
checkDocumentationSafetyContracts();
checkBrowserHelperBehavior();

console.log('Skill validation passed');
