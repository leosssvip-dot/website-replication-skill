#!/usr/bin/env node
// website-replication-skill — Coverage calculator (Step 8 gate)
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
// un-probed elements without a `blocked` reason. Wire into Step 8 gate.

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

const rows = [];
let sawInventoryHeader = false;
let currentHeader = null;

function parseHeader(line) {
  if (!/^\|\s*ID\s*\|/.test(line) || !/Selector/i.test(line)) return null;

  const cells = line.split('|').slice(1, -1).map((c) => c.trim().toLowerCase());
  const header = {
    probedIdx: cells.indexOf('probed'),
    resultIdx: cells.indexOf('result'),
    idIdx: cells.indexOf('id'),
  };

  if (header.probedIdx < 0 || header.resultIdx < 0 || header.idIdx < 0) {
    console.error('Inventory header must include "ID", "Probed", and "Result" columns.');
    process.exit(2);
  }

  return header;
}

// Parse all markdown inventory tables in the file. Re-enumeration sections are
// often appended after comments like "<!-- After opening modal -->", so stopping
// at the first non-table line would hide late modal/drawer controls from the gate.
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextHeader = parseHeader(line);
  if (nextHeader) {
    currentHeader = nextHeader;
    sawInventoryHeader = true;
    continue;
  }

  if (!currentHeader || !line.startsWith('|')) continue;
  if (/^\|\s*-{3,}\s*\|/.test(line)) continue;

  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length <= currentHeader.probedIdx) continue;
  rows.push({
    id: cells[currentHeader.idIdx] || '?',
    probed: cells[currentHeader.probedIdx],
    result: cells[currentHeader.resultIdx] || '',
  });
}

if (!sawInventoryHeader) {
  console.error('No inventory table found (expected header "| ID | Selector | ... | Probed | Result | Notes |").');
  process.exit(2);
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
  } else {
    // Everything else counts as un-probed: ✗, x, blank, OR an unrecognized
    // marker like "partial" / "todo" / "n/a". Unknown values must not vanish
    // into a silent dead zone — they belong in the actionable list, otherwise
    // the gate can read green while real rows were never probed.
    skipped++;
    const hasBlocked = /blocked/i.test(r.result);
    if (hasBlocked) {
      skippedBlocked++;
    } else {
      const reason =
        r.result || (p ? `unrecognized Probed value "${p}"` : '(no reason given)');
      unprobedNoBlocked.push({ id: r.id, reason });
    }
  }
}

const enumerated = rows.length;
const covered = probedTick + probedObserved;
const coveragePct = enumerated > 0 ? Math.round((covered / enumerated) * 1000) / 10 : 0;
// An inventory with a header but zero element rows is an enumeration failure,
// not full coverage. Never let it read green.
const passes = enumerated > 0 && (coveragePct >= threshold || unprobedNoBlocked.length === 0);

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
} else if (enumerated === 0) {
  report.push(`## ✗ Coverage gate FAILED`);
  report.push('');
  report.push('Inventory table found, but it has **0 element rows**. Enumeration likely failed (shadow DOM, iframe, or a script error) or the table body is empty. Re-run `dom-enumeration.js` against the page — an empty inventory is not full coverage.');
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
