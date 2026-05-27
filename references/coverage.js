#!/usr/bin/env node
// website-replication-skill — Coverage calculator (Step 7 gate)
//
// Runtime: Node.js (run from a shell)
// Usage:
//   node references/coverage.js audit/<site>/snapshots/<date>/<page>-inventory.md
//   node references/coverage.js path/to/inventory.md --threshold=90
//
// Reads an interactive-inventory.md markdown table and computes:
//   - enumerated total
//   - probed directly (✓)
//   - URL-only observed (o)
//   - skipped (✗) split by whether `blocked` reason is present
//   - coverage = (probed + observed) / enumerated
//
// Exits non-zero if coverage < threshold (default 90%) AND there are
// un-probed elements without a `blocked` reason. Wire into Step 7 gate.

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const threshold = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 90;

if (!file) {
  console.error('usage: coverage.js <inventory.md> [--threshold=N]');
  process.exit(2);
}

const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Find header row (must contain "| ID |" and "| Selector |" — schema lock)
let tableStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^\|\s*ID\s*\|/.test(lines[i]) && /Selector/i.test(lines[i])) {
    tableStart = i;
    break;
  }
}

if (tableStart < 0) {
  console.error('No inventory table found (expected header "| ID | Selector | ... | Probed | Result | Notes |").');
  process.exit(2);
}

// Detect column indices from header
const headerCells = lines[tableStart].split('|').slice(1, -1).map((c) => c.trim().toLowerCase());
const probedIdx = headerCells.indexOf('probed');
const resultIdx = headerCells.indexOf('result');
const idIdx = headerCells.indexOf('id');

if (probedIdx < 0 || resultIdx < 0) {
  console.error('Inventory header must include "Probed" and "Result" columns.');
  process.exit(2);
}

// Parse data rows (skip header + separator)
const rows = [];
for (let i = tableStart + 2; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('|')) break;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length <= probedIdx) continue;
  rows.push({
    id: cells[idIdx] || '?',
    probed: cells[probedIdx],
    result: cells[resultIdx] || '',
  });
}

// Classify
let probedTick = 0;
let probedObserved = 0;
let skipped = 0;
let skippedBlocked = 0;
const unprobedNoBlocked = [];

for (const r of rows) {
  const p = r.probed;
  if (p === '✓' || p === 'v') {
    probedTick++;
  } else if (p === 'o' || p === '○' || p === 'observed') {
    probedObserved++;
  } else if (p === '✗' || p === 'x' || p === '') {
    skipped++;
    const hasBlocked = /blocked/i.test(r.result);
    if (hasBlocked) {
      skippedBlocked++;
    } else {
      unprobedNoBlocked.push({ id: r.id, reason: r.result || '(no reason given)' });
    }
  }
}

const enumerated = rows.length;
const covered = probedTick + probedObserved;
const coveragePct = enumerated > 0 ? Math.round((covered / enumerated) * 1000) / 10 : 0;
const passes = coveragePct >= threshold || unprobedNoBlocked.length === 0;

const report = [];
report.push(`# Coverage — ${path.basename(file)}`);
report.push('');
report.push(`- Enumerated: **${enumerated}**`);
report.push(`- Probed directly (✓): **${probedTick}**`);
report.push(`- Observed-only (o): **${probedObserved}**`);
report.push(`- Skipped (✗): **${skipped}** (of which ${skippedBlocked} have \`blocked\` reasons)`);
report.push(`- Coverage: **${covered} / ${enumerated} = ${coveragePct}%** (threshold: ${threshold}%)`);
report.push('');

if (passes) {
  report.push(`## ✓ Coverage gate PASSED`);
} else {
  report.push(`## ✗ Coverage gate FAILED`);
  report.push('');
  report.push(`Coverage ${coveragePct}% < threshold ${threshold}% and ${unprobedNoBlocked.length} un-probed elements lack a \`blocked\` reason. Return to Step 4 against the IDs below before submitting the deliverable.`);
  report.push('');
  report.push(`### Un-probed elements without \`blocked\` reason:`);
  for (const u of unprobedNoBlocked.slice(0, 30)) {
    report.push(`- \`${u.id}\`: ${u.reason}`);
  }
  if (unprobedNoBlocked.length > 30) {
    report.push(`- … and ${unprobedNoBlocked.length - 30} more`);
  }
}

console.log(report.join('\n'));
process.exit(passes ? 0 : 1);
