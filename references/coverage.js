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
// Exits non-zero if enumeration metadata is missing/truncated/inconsistent, coverage
// is below threshold (default 90%), OR un-probed elements lack a structured
// `blocked: <reason>` result.

const fs = require('fs');
const path = require('path');
const HARD_OUTPUT_BYTES = 50_000;

function safeReportText(value, maxLength = 240) {
  const safe = String(value || '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/\b(token|session|auth|key)=([^\s&]+)/gi, '$1=[redacted]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted-token]')
    .replace(/[\r\n|`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return safe.length > maxLength
    ? `${safe.slice(0, maxLength - 14)}…[truncated]`
    : safe;
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : 90;

if (!file) {
  console.error('usage: coverage.js <inventory.md> [--threshold=N]');
  process.exit(2);
}

if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
  console.error('threshold must be a finite number from 0 to 100.');
  process.exit(2);
}

const content = fs.readFileSync(file, 'utf8');
const lines = [];
let inFence = false;
for (const line of content.split('\n')) {
  if (/^\s*```/.test(line)) {
    inFence = !inFence;
    continue;
  }
  if (!inFence) lines.push(line);
}

function parseMetadata(line) {
  const match = line.match(/<!--[^>]*?(\d+)\s+visible candidates\s+·\s+(\d+)\s+emitted([^>]*)-->/i);
  if (!match) return null;
  return {
    candidates: Number(match[1]),
    emitted: Number(match[2]),
    truncated: /^\s*·\s*TRUNCATED(?:\s*·|$)/i.test(match[3]),
  };
}

const rows = [];
const sections = [];
const enumerationMetadata = [];
let sawInventoryHeader = false;
let currentSection = null;
let pendingMetadata = null;
let orphanMetadata = 0;

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
for (const line of lines) {
  const metadata = parseMetadata(line);
  if (metadata) {
    if (pendingMetadata) orphanMetadata++;
    pendingMetadata = metadata;
    enumerationMetadata.push(metadata);
    currentSection = null;
    continue;
  }

  const nextHeader = parseHeader(line);
  if (nextHeader) {
    currentSection = { header: nextHeader, metadata: pendingMetadata, rows: [] };
    pendingMetadata = null;
    sections.push(currentSection);
    sawInventoryHeader = true;
    continue;
  }

  if (!currentSection) continue;
  if (!line.startsWith('|')) {
    currentSection = null;
    continue;
  }
  if (/^\|\s*-{3,}\s*\|/.test(line)) continue;

  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length <= currentSection.header.probedIdx) continue;
  const row = {
    id: cells[currentSection.header.idIdx] || '?',
    probed: cells[currentSection.header.probedIdx],
    result: cells[currentSection.header.resultIdx] || '',
  };
  currentSection.rows.push(row);
  rows.push(row);
}
if (pendingMetadata) orphanMetadata++;

if (!sawInventoryHeader) {
  console.error('No inventory table found (expected header "| ID | Selector | ... | Probed | Result | Notes |").');
  process.exit(2);
}

const seenIds = new Set();
const duplicateIds = new Set();
for (const row of rows) {
  if (seenIds.has(row.id)) duplicateIds.add(row.id);
  seenIds.add(row.id);
}
if (duplicateIds.size > 0) {
  const listed = [...duplicateIds].slice(0, 30).map((id) => safeReportText(id, 80));
  console.error(`Inventory IDs must be unique. Duplicates: ${listed.join(', ')}${duplicateIds.size > 30 ? ', …' : ''}`);
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
    const hasBlocked = /^blocked\s*:\s*\S/i.test(r.result);
    if (hasBlocked) {
      skippedBlocked++;
    } else {
      const reason =
        r.result || (p ? `unrecognized Probed value "${p}"` : '(no reason given)');
      unprobedNoBlocked.push({ id: safeReportText(r.id, 80), reason: safeReportText(reason) });
    }
  }
}

const enumerated = rows.length;
const covered = probedTick + probedObserved;
const coveragePct = enumerated > 0 ? Math.round((covered / enumerated) * 1000) / 10 : 0;
const metadataCandidates = enumerationMetadata.reduce((sum, item) => sum + item.candidates, 0);
const metadataEmitted = enumerationMetadata.reduce((sum, item) => sum + item.emitted, 0);
const sectionsWithoutMetadata = sections.filter((section) => !section.metadata);
const incompleteSections = sections.filter(
  (section) => section.metadata &&
    (section.metadata.truncated || section.metadata.candidates !== section.metadata.emitted)
);
const mismatchedSections = sections.filter(
  (section) => section.metadata && section.metadata.emitted !== section.rows.length
);
const missingEnumerationMetadata = sectionsWithoutMetadata.length > 0 || enumerationMetadata.length === 0;
const incompleteEnumeration = incompleteSections.length > 0;
const metadataRowMismatch = mismatchedSections.length > 0;
const metadataAssociationError = orphanMetadata > 0;
// An inventory with a header but zero element rows is an enumeration failure,
// not full coverage. Never let it read green.
const passes =
  enumerated > 0 &&
  !missingEnumerationMetadata &&
  !incompleteEnumeration &&
  !metadataRowMismatch &&
  !metadataAssociationError &&
  coveragePct >= threshold &&
  unprobedNoBlocked.length === 0;

const report = [];
report.push(`# Coverage — ${path.basename(file)}`);
report.push('');
report.push(`- Enumerated: **${enumerated}**`);
report.push(`- Probed directly (✓): **${probedTick}**`);
report.push(`- Observed-only (o): **${probedObserved}**`);
report.push(`- Skipped (✗): **${skipped}** (of which ${skippedBlocked} have \`blocked\` reasons)`);
report.push(`- Coverage: **${covered} / ${enumerated} = ${coveragePct}%** (threshold: ${threshold}%)`);
if (enumerationMetadata.length > 0) {
  report.push(`- Enumeration metadata: **${metadataCandidates} candidates / ${metadataEmitted} emitted**${incompleteEnumeration ? ' — INCOMPLETE / TRUNCATED' : ''}`);
}
report.push(`- State tables: **${sections.length}** (${sections.length - sectionsWithoutMetadata.length} with completeness metadata)`);
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
  if (incompleteEnumeration) {
    report.push('Enumeration metadata reports truncated or omitted candidates. Narrow the page by region and re-enumerate; emitted-row coverage cannot certify unseen controls.');
  }
  if (missingEnumerationMetadata) {
    report.push(`${sectionsWithoutMetadata.length || sections.length} state table(s) lack directly associated completeness metadata. Re-run dom-enumeration.js for each state; aggregate counts cannot certify an unlabelled table.`);
  }
  if (metadataRowMismatch) {
    report.push(`${mismatchedSections.length} state table(s) contain a different row count from their own emitted metadata. Append each complete returned table without manually dropping rows.`);
  }
  if (metadataAssociationError) {
    report.push(`${orphanMetadata} enumeration metadata block(s) are not associated with an inventory table. Repair state boundaries before calculating coverage.`);
  }
  if (coveragePct < threshold) {
    report.push(`Coverage ${coveragePct}% is below threshold ${threshold}%. A blocker/research report may still be produced, but the implementation-ready gate stays failed.`);
  }
  if (unprobedNoBlocked.length > 0) {
    report.push('');
    report.push(`${unprobedNoBlocked.length} un-probed elements lack a structured \`blocked: <reason>\` result. Return to Step 4 against the IDs below.`);
    report.push('');
    report.push('### Un-probed elements without structured blocked reason:');
    for (const u of unprobedNoBlocked.slice(0, 30)) {
      report.push(`- \`${u.id}\`: ${u.reason}`);
    }
  }
  if (unprobedNoBlocked.length > 30) {
    report.push(`- … and ${unprobedNoBlocked.length - 30} more`);
  }
}

let output = report.join('\n');
if (Buffer.byteLength(output, 'utf8') > HARD_OUTPUT_BYTES) {
  const marker = '\n<!-- TRUNCATED: coverage report exceeded the 50KB output limit -->';
  let low = 0;
  let high = output.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(output.slice(0, mid) + marker, 'utf8') <= HARD_OUTPUT_BYTES) low = mid;
    else high = mid - 1;
  }
  output = output.slice(0, low).replace(/[^\n]*$/, '') + marker;
}
process.stdout.write(output);
process.exitCode = passes ? 0 : 1;
