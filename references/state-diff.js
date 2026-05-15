#!/usr/bin/env node
// website-replication-skill — DOM-distill state diff (Step 3)
//
// Runtime: Node.js
// Usage:
//   node references/state-diff.js before.md after.md
//
// Reads two dom-distill.js outputs (markdown nested lists), parses them
// into ordered node lists keyed by tag + retained-attributes + truncated
// text, and reports nodes added, removed, or moved between the two
// states.
//
// Intended for "I clicked button X — what changed?" — replaces ad-hoc
// agent narration with deterministic structural diff.
//
// Limitations: matches by exact signature, so deeply reordered subtrees
// look like removals + additions. Good enough for state-change observation
// (modal open, dropdown reveal, tab switch); not a general HTML diff.

const fs = require('fs');

const beforeFile = process.argv[2];
const afterFile = process.argv[3];
if (!beforeFile || !afterFile) {
  console.error('usage: state-diff.js <before.md> <after.md>');
  process.exit(2);
}

function parseDistill(content) {
  const nodes = [];
  for (const raw of content.split('\n')) {
    if (raw.startsWith('<!--') || raw.trim() === '' || raw.trim() === '(empty — nothing to distill)') continue;
    const m = raw.match(/^(\s*)- (.+)$/);
    if (!m) continue;
    const depth = m[1].length / 2;
    const rest = m[2];

    let signature;
    if (rest.startsWith('text: ')) {
      signature = `text:${rest.slice(6)}`;
    } else {
      // tag[attrs]... — keep tag + sorted attrs for stable hashing
      const tagMatch = rest.match(/^([A-Za-z][A-Za-z0-9-]*)/);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : '?';
      const attrPart = tagMatch ? rest.slice(tagMatch[1].length) : '';
      // Sort attribute blocks lexically so attribute order doesn't cause noise
      const attrBlocks = (attrPart.match(/\[[^\]]*\]/g) || []).sort();
      signature = tag + attrBlocks.join('');
    }
    nodes.push({ depth, signature });
  }
  return nodes;
}

const beforeNodes = parseDistill(fs.readFileSync(beforeFile, 'utf8'));
const afterNodes = parseDistill(fs.readFileSync(afterFile, 'utf8'));

// Multi-set diff: signature → count
function tally(nodes) {
  const m = new Map();
  for (const n of nodes) m.set(n.signature, (m.get(n.signature) || 0) + 1);
  return m;
}

const beforeMap = tally(beforeNodes);
const afterMap = tally(afterNodes);

const added = [];
const removed = [];

for (const [sig, n] of afterMap.entries()) {
  const b = beforeMap.get(sig) || 0;
  if (n > b) added.push({ signature: sig, count: n - b });
}
for (const [sig, n] of beforeMap.entries()) {
  const a = afterMap.get(sig) || 0;
  if (n > a) removed.push({ signature: sig, count: n - a });
}

const out = [];
out.push(`# State diff — ${beforeFile} → ${afterFile}`);
out.push('');
out.push(`- Before: **${beforeNodes.length}** nodes`);
out.push(`- After: **${afterNodes.length}** nodes`);
out.push(`- Net change: **${afterNodes.length - beforeNodes.length >= 0 ? '+' : ''}${afterNodes.length - beforeNodes.length}**`);
out.push(`- Added signatures: ${added.length}`);
out.push(`- Removed signatures: ${removed.length}`);
out.push('');

if (added.length === 0 && removed.length === 0) {
  out.push('## No structural change detected');
  out.push('');
  out.push('The two distill outputs are identical at the signature level. The interaction may have only changed text content beyond the truncation threshold, internal class state, or non-distilled attributes — check screenshots for visual differences.');
  console.log(out.join('\n'));
  process.exit(0);
}

if (added.length > 0) {
  out.push('## + Added');
  out.push('');
  for (const a of added.slice(0, 60)) {
    out.push(`- ${a.count > 1 ? `×${a.count} ` : ''}\`${a.signature}\``);
  }
  if (added.length > 60) out.push(`- … and ${added.length - 60} more`);
  out.push('');
}

if (removed.length > 0) {
  out.push('## − Removed');
  out.push('');
  for (const r of removed.slice(0, 60)) {
    out.push(`- ${r.count > 1 ? `×${r.count} ` : ''}\`${r.signature}\``);
  }
  if (removed.length > 60) out.push(`- … and ${removed.length - 60} more`);
}

console.log(out.join('\n'));
