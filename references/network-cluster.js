#!/usr/bin/env node
// website-replication-skill — Network request clusterer (Step 6)
//
// Runtime: Node.js
// Usage:
//   node references/network-cluster.js < network-log.txt
//   node references/network-cluster.js audit/<site>/network/<date>/requests.txt
//
// Reads lines containing "METHOD URL [status]" tuples (the standard
// output shape of chrome-devtools-mcp's list_network_requests, or any
// equivalent dump). Clusters by host + path-pattern + method.
//
// Generalizes dynamic path segments:
//   /users/12345        → /users/:id
//   /v1/<UUID>          → /v1/:uuid
//   /api/<long-token>   → /api/:token
//   ?rpcids=ABC         → ?rpcids=:rpcid  (Google batchexecute pattern)
//
// Output: markdown table sorted by count desc + a "Notable patterns" block,
// capped at 500 rows / 50KB with an explicit TRUNCATED marker.

const fs = require('fs');
const HARD_ROW_LIMIT = 500;
const HARD_OUTPUT_BYTES = 50_000;

function readInput() {
  const file = process.argv[2];
  if (file) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(0, 'utf8');
}

const input = readInput();
const REQ_RE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+((?:https?|wss?):\/\/[^\s\]]+)(?:\s+\[(\d+)\])?/g;

const requests = [];
for (const line of input.split('\n')) {
  REQ_RE.lastIndex = 0;
  let m;
  while ((m = REQ_RE.exec(line))) {
    requests.push({ method: m[1], url: m[2], status: m[3] || '?' });
  }
}

if (requests.length === 0) {
  console.error('No requests parsed. Expected lines containing "METHOD URL [status]".');
  process.exit(1);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function generalize(pathname) {
  const segments = pathname.split('/');
  const sensitiveParent = /^(?:auth|callback|confirm|confirmation|invite|magic|oauth|password|redeem|reset|session|share|sso|token|verify)$/i;
  return segments.map((raw, index) => {
    if (!raw) return raw;
    const segment = safeDecode(raw);
    const previous = safeDecode(segments[index - 1] || '');
    if (sensitiveParent.test(previous)) return ':token';
    if (segment.length > 80 || raw.length > 80) return ':segment';
    if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(segment)) return ':email';
    if (/^\d+$/.test(segment)) return ':id';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return ':uuid';
    if (/^[A-Za-z0-9_-]{32,}$/.test(segment)) return ':token';
    if (/^[A-Za-z0-9_-]{20,31}$/.test(segment)) return ':slug';
    if (/[|`\r\n]/.test(segment)) return ':segment';
    // Cluster from the raw segment so encoded separators and encoding depth
    // remain distinct (`%2F`, `%252F`, and `/` are different route shapes).
    return raw.replace(/%[0-9a-f]{2}/ig, (escape) => escape.toUpperCase());
  }).join('/');
}

function markdownCell(value, maxLength = 240) {
  const safe = String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/`/g, "'").replace(/[\r\n]+/g, ' ');
  return safe.length > maxLength ? `${safe.slice(0, maxLength - 14)}…[truncated]` : safe;
}

const clusters = new Map();
for (const r of requests) {
  let url;
  try {
    url = new URL(r.url);
  } catch (_) {
    continue;
  }
  const host = url.hostname;
  let fullPathPattern = generalize(url.pathname);

  const sub = new Set();
  if (url.searchParams.has('rpcids')) {
    sub.add(url.searchParams.get('rpcids'));
    fullPathPattern += '?rpcids=:rpcid';
  }

  const pathTruncated = fullPathPattern.length > 240;
  const pathPattern = pathTruncated
    ? `${fullPathPattern.slice(0, 220)}…/:truncated`
    : fullPathPattern;

  const key = `${r.method} ${host}${fullPathPattern}`;
  if (!clusters.has(key)) {
    clusters.set(key, {
      method: r.method,
      host,
      path: pathPattern,
      pathTruncated,
      count: 0,
      statuses: new Map(),
      subKeys: new Set(),
    });
  }
  const c = clusters.get(key);
  c.count++;
  c.statuses.set(r.status, (c.statuses.get(r.status) || 0) + 1);
  for (const s of sub) c.subKeys.add(s);
}

const sorted = [...clusters.values()].sort((a, b) => b.count - a.count);

// Match keyword tokens only at path-segment boundaries (delimited by / . _ -
// or the string ends), with an optional trailing plural "s". A naked substring
// test would fire on ordinary routes — "assets" ⊃ "sse", "catalog"/"blog" ⊃
// "log", "login" ⊃ "log" — and mislabel them as channels / telemetry.
function segMatch(haystack, tokens) {
  const re = new RegExp(`(?:^|[/._-])(?:${tokens.join('|')})s?(?:[/._-]|$)`, 'i');
  return re.test(haystack);
}

function render(displayed) {
  const truncated = displayed.length < sorted.length || sorted.some((cluster) => cluster.pathTruncated);
  const out = [];
  out.push(`# Network cluster — ${requests.length} requests · ${sorted.length} unique endpoints · ${displayed.length} emitted${truncated ? ' · TRUNCATED' : ''}`);
  out.push('');
  out.push('| Method | Host | Path pattern | Count | Statuses | Sub-keys |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const c of displayed) {
    const statusStr = [...c.statuses.entries()].map(([s, n]) => `${s}×${n}`).join(' ');
    const subStr = c.subKeys.size > 0 ? `${c.subKeys.size} distinct` : '';
    out.push(`| ${markdownCell(c.method)} | ${markdownCell(c.host)} | \`${markdownCell(c.path)}\` | ${c.count} | ${markdownCell(statusStr)} | ${markdownCell(subStr)} |`);
  }

  out.push('');
  out.push('## Notable patterns');
  out.push('');
  const hosts = new Set(sorted.map((c) => c.host));
  out.push(`- **Distinct hosts**: ${hosts.size} — ${[...hosts].slice(0, 10).map((host) => markdownCell(host)).join(', ')}${hosts.size > 10 ? ', …' : ''}`);

  const rpcClusters = sorted.filter((c) => c.subKeys.size > 0);
  if (rpcClusters.length > 0) {
    out.push(`- **RPC-batched endpoints** (carry \`rpcids\` or similar sub-keys): ${rpcClusters.slice(0, 5).map((c) => markdownCell(c.host + c.path.split('?')[0])).join(' · ')}`);
  }

  const polled = sorted.filter((c) => c.count >= 3 && c.subKeys.size === 0);
  if (polled.length > 0) {
    out.push(`- **Likely polled / retried** (count ≥ 3, single sub-key): ${polled.slice(0, 5).map((c) => markdownCell(c.method + ' ' + c.host + c.path)).join(' · ')}`);
  }

  const channels = sorted.filter((c) => segMatch(c.host + c.path, ['signaler', 'channel', 'socket', 'stream', 'sse', 'push', 'websocket', 'long-poll']));
  if (channels.length > 0) {
    out.push(`- **Likely real-time channels** (signaler/channel/stream-shaped): ${channels.slice(0, 5).map((c) => markdownCell(c.host + c.path)).join(' · ')}`);
  }

  const telemetry = sorted.filter((c) => segMatch(c.host + c.path, ['collect', 'log', 'measurement', 'analytics', 'ga4', 'telemetry', 'beacon']));
  if (telemetry.length > 0) {
    out.push(`- **Telemetry / analytics endpoints**: ${telemetry.slice(0, 5).map((c) => markdownCell(c.host)).join(', ')}`);
  }

  return out.join('\n');
}

let displayed = sorted.slice(0, HARD_ROW_LIMIT);
let output = render(displayed);
while (displayed.length > 0 && Buffer.byteLength(output, 'utf8') > HARD_OUTPUT_BYTES) {
  displayed.pop();
  output = render(displayed);
}
if (Buffer.byteLength(output, 'utf8') > HARD_OUTPUT_BYTES) {
  output = [
    `# Network cluster — ${requests.length} requests · ${sorted.length} unique endpoints · 0 emitted · TRUNCATED`,
    '',
    'Output details omitted because even the bounded summary exceeded the 50KB evidence limit. Split the input by host, page, or workflow and rerun.',
  ].join('\n');
}
process.stdout.write(output);
