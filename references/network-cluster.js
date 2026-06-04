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
// Output: markdown table sorted by count desc + a "Notable patterns" block
// flagging RPC-style endpoints, likely polling, and host fan-out.

const fs = require('fs');

function readInput() {
  const file = process.argv[2];
  if (file) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(0, 'utf8');
}

const input = readInput();
const REQ_RE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(https?:\/\/[^\s\]]+)(?:\s+\[(\d+)\])?/g;

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

function generalize(pathname) {
  return pathname
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/[A-Za-z0-9_-]{32,}(?=\/|$)/g, '/:token')
    .replace(/\/[A-Za-z0-9_-]{20,31}(?=\/|$)/g, '/:slug');
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
  let pathPattern = generalize(url.pathname);

  const sub = new Set();
  if (url.searchParams.has('rpcids')) {
    sub.add(url.searchParams.get('rpcids'));
    pathPattern += '?rpcids=:rpcid';
  }

  const key = `${r.method} ${host}${pathPattern}`;
  if (!clusters.has(key)) {
    clusters.set(key, {
      method: r.method,
      host,
      path: pathPattern,
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

const out = [];
out.push(`# Network cluster — ${requests.length} requests · ${sorted.length} unique endpoints`);
out.push('');
out.push('| Method | Host | Path pattern | Count | Statuses | Sub-keys |');
out.push('| --- | --- | --- | --- | --- | --- |');
for (const c of sorted) {
  const statusStr = [...c.statuses.entries()].map(([s, n]) => `${s}×${n}`).join(' ');
  const subStr = c.subKeys.size > 0 ? `${c.subKeys.size} distinct` : '';
  out.push(`| ${c.method} | ${c.host} | \`${c.path}\` | ${c.count} | ${statusStr} | ${subStr} |`);
}

out.push('');
out.push('## Notable patterns');
out.push('');
const hosts = new Set(sorted.map((c) => c.host));
out.push(`- **Distinct hosts**: ${hosts.size} — ${[...hosts].slice(0, 10).join(', ')}${hosts.size > 10 ? ', …' : ''}`);

const rpcClusters = sorted.filter((c) => c.subKeys.size > 0);
if (rpcClusters.length > 0) {
  out.push(`- **RPC-batched endpoints** (carry \`rpcids\` or similar sub-keys): ${rpcClusters.map((c) => c.host + c.path.split('?')[0]).join(' · ')}`);
}

const polled = sorted.filter((c) => c.count >= 3 && c.subKeys.size === 0);
if (polled.length > 0) {
  out.push(`- **Likely polled / retried** (count ≥ 3, single sub-key): ${polled.slice(0, 5).map((c) => c.method + ' ' + c.host + c.path).join(' · ')}`);
}

// Match keyword tokens only at path-segment boundaries (delimited by / . _ -
// or the string ends), with an optional trailing plural "s". A naked substring
// test would fire on ordinary routes — "assets" ⊃ "sse", "catalog"/"blog" ⊃
// "log", "login" ⊃ "log" — and mislabel them as channels / telemetry.
function segMatch(haystack, tokens) {
  const re = new RegExp(`(?:^|[/._-])(?:${tokens.join('|')})s?(?:[/._-]|$)`, 'i');
  return re.test(haystack);
}

const channels = sorted.filter((c) => segMatch(c.host + c.path, ['signaler', 'channel', 'stream', 'sse', 'push', 'websocket', 'long-poll']));
if (channels.length > 0) {
  out.push(`- **Likely real-time channels** (signaler/channel/stream-shaped): ${channels.map((c) => c.host + c.path).join(' · ')}`);
}

const telemetry = sorted.filter((c) => segMatch(c.host + c.path, ['collect', 'log', 'measurement', 'analytics', 'ga4', 'telemetry', 'beacon']));
if (telemetry.length > 0) {
  out.push(`- **Telemetry / analytics endpoints**: ${telemetry.map((c) => c.host).slice(0, 5).join(', ')}`);
}

console.log(out.join('\n'));
