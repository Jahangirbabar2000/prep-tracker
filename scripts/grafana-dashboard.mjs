// The Grafana Cloud dashboard for Prep Tracker, as code: `npm run grafana:dashboard`.
//
// Every panel is a TraceQL query over the traces the app already sends to
// Tempo (instrumentation.node.ts), so it needs no metrics pipeline of its own.
// The script creates or replaces the dashboard (fixed uid, so a re-run updates
// it in place), then runs each panel's query once and says which came back
// empty — a typo in an attribute name shows up here, not as a blank panel.
//
// Edit the panels here, not in Grafana: the next run overwrites the dashboard.
//
// Needs a Grafana service-account token with the Editor role, kept as the
// `GrafanaDashboardToken` secret of the `ci` stage (or GRAFANA_TOKEN in env).
import { execFileSync } from 'node:child_process';

const GRAFANA_URL = process.env.GRAFANA_URL ?? 'https://amberanchovy2700.grafana.net';
const TEMPO = { type: 'tempo', uid: 'grafanacloud-traces' };
const UID = 'prep-tracker';

// One stage at a time: both send the same service name.
const app = 'resource.service.name = "prep-tracker" && resource.deployment.environment.name = "$env"';
// A request, as Next.js traces it: the root server span ("GET /api/sync").
const requests = `{ ${app} && kind = server }`;
const failed = `{ ${app} && kind = server && (status = error || span.http.status_code >= 500) }`;
// lib/db.ts: one span per Turso round trip, "db SELECT problems".
const turso = `{ ${app} && name =~ "db .*" }`;

const W = 24; // grid width
let y = 0;
let id = 0;
const panels = [];

function row(title) {
  panels.push({ id: ++id, type: 'row', title, collapsed: false, gridPos: { h: 1, w: W, x: 0, y: y++ }, panels: [] });
}

function target(query, extra = {}) {
  return { refId: 'A', datasource: TEMPO, queryType: 'traceql', query, metricsQueryType: 'range', limit: 20, tableType: 'traces', ...extra };
}

/** A row of equal-width single numbers over the dashboard's time range. */
function stats(items) {
  const w = W / items.length;
  items.forEach(({ title, query, unit = 'short', reduce = 'sum', thresholds, description }, i) => {
    panels.push({
      id: ++id, type: 'stat', title, description, datasource: TEMPO,
      gridPos: { h: 4, w, x: i * w, y },
      targets: [target(query)],
      options: { reduceOptions: { calcs: [reduce], fields: '', values: false }, colorMode: thresholds ? 'background' : 'value', graphMode: 'area', textMode: 'value' },
      fieldConfig: {
        defaults: {
          unit, decimals: unit === 'short' ? 0 : undefined, noValue: '0',
          thresholds: { mode: 'absolute', steps: thresholds ?? [{ color: 'text', value: null }] },
        },
        overrides: [],
      },
    });
  });
  y += 4;
}

/** Two time series side by side, or one full width. */
function series(items) {
  const w = W / items.length;
  items.forEach(({ title, query, unit = 'short', description }, i) => {
    panels.push({
      id: ++id, type: 'timeseries', title, description, datasource: TEMPO,
      gridPos: { h: 8, w, x: i * w, y },
      targets: [target(query)],
      options: { legend: { displayMode: 'table', placement: 'bottom', calcs: ['mean', 'max'], sortBy: 'Max', sortDesc: true }, tooltip: { mode: 'multi', sort: 'desc' } },
      fieldConfig: { defaults: { unit, custom: { drawStyle: 'line', lineWidth: 1, fillOpacity: 10, spanNulls: true } }, overrides: [] },
    });
  });
  y += 8;
}

function traces(title, query, description) {
  panels.push({
    id: ++id, type: 'table', title, description, datasource: TEMPO,
    gridPos: { h: 9, w: W, x: 0, y },
    targets: [target(query, { queryType: 'traceql', metricsQueryType: undefined, limit: 20, tableType: 'traces' })],
  });
  y += 9;
}

row('Overview');
stats([
  { title: 'Requests', query: `${requests} | count_over_time()` },
  { title: 'Failed requests', query: `${failed} | count_over_time()`, thresholds: [{ color: 'green', value: null }, { color: 'red', value: 1 }], description: 'Server spans with error status or HTTP 5xx.' },
  { title: 'Cold starts', query: `{ ${app} && span.faas.coldstart = true } | count_over_time()`, description: 'First API request on a new Lambda instance (lib/currentUser.ts).' },
  { title: 'p95 request time', query: `${requests} | quantile_over_time(duration, .95)`, unit: 's', reduce: 'mean', thresholds: [{ color: 'green', value: null }, { color: 'orange', value: 1 }, { color: 'red', value: 2.5 }] },
  { title: 'p95 Turso round trip', query: `${turso} | quantile_over_time(duration, .95)`, unit: 's', reduce: 'mean', thresholds: [{ color: 'green', value: null }, { color: 'orange', value: 0.1 }, { color: 'red', value: 0.3 }], description: 'Lambda and Turso are both in us-east-1: a warm round trip should be tens of ms.' },
]);

row('Requests');
series([
  { title: 'Requests per second, by route', query: `${requests} | rate() by (name)`, unit: 'reqps' },
  { title: 'p95 time, by route', query: `${requests} | quantile_over_time(duration, .95) by (name)`, unit: 's' },
]);
series([
  { title: 'Failed requests, by route', query: `${failed} | rate() by (name)`, unit: 'reqps' },
  { title: 'Cold starts', query: `{ ${app} && span.faas.coldstart = true } | count_over_time() by (name)` },
]);

row('Database (Turso)');
series([
  { title: 'Round trip p50 / p95', query: `${turso} | quantile_over_time(duration, .5, .95)`, unit: 's' },
  { title: 'p95 by statement', query: `${turso} | quantile_over_time(duration, .95) by (name)`, unit: 's' },
]);
series([
  { title: 'Statements per second', query: `${turso} | rate() by (name)`, unit: 'reqps' },
  { title: 'Failed statements', query: `{ ${app} && name =~ "db .*" && status = error } | rate() by (name)`, unit: 'reqps' },
]);

row('Sync');
series([
  { title: '/api/sync payload (bytes, before compression)', query: `{ ${app} && span.app.sync.bytes > 0 } | max_over_time(span.app.sync.bytes)`, unit: 'bytes', description: 'The endpoint most likely to slow down as decks grow (Lambda caps a buffered response at 6 MB).' },
  { title: '/api/sync p95 time', query: `{ ${app} && kind = server && name = "GET /api/sync" } | quantile_over_time(duration, .95)`, unit: 's' },
]);

row('Slowest and failed');
traces('Requests over 1 s', `{ ${app} && kind = server && duration > 1s }`, 'Click a trace ID to open it.');
traces('Failed requests', failed);

const dashboard = {
  uid: UID,
  title: 'Prep Tracker',
  tags: ['prep-tracker'],
  timezone: 'browser',
  refresh: '1m',
  time: { from: 'now-24h', to: 'now' },
  schemaVersion: 39,
  editable: true,
  description: 'Generated by scripts/grafana-dashboard.mjs — edits made here are overwritten on the next run.',
  templating: {
    list: [{
      name: 'env', label: 'Stage', type: 'custom', query: 'production,staging',
      current: { text: 'production', value: 'production' },
      options: [{ text: 'production', value: 'production', selected: true }, { text: 'staging', value: 'staging', selected: false }],
    }],
  },
  panels,
};

function token() {
  if (process.env.GRAFANA_TOKEN) return process.env.GRAFANA_TOKEN;
  const out = execFileSync('npx', ['sst', 'secret', 'list', '--stage', 'ci'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const line = out.split('\n').find(l => l.startsWith('GrafanaDashboardToken='));
  if (!line) throw new Error('No GrafanaDashboardToken secret on the ci stage (and no GRAFANA_TOKEN).');
  return line.slice('GrafanaDashboardToken='.length).trim();
}

async function grafana(path, body) {
  const res = await fetch(`${GRAFANA_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const auth = token();
const saved = await grafana('/api/dashboards/db', { dashboard, overwrite: true, message: 'npm run grafana:dashboard' });
console.log(`Dashboard saved: ${GRAFANA_URL}${saved.url}`);

// Run each panel's query once against production, so an empty one is visible.
const env = process.argv.includes('--staging') ? 'staging' : 'production';
console.log(`\nLast 24 h of ${env}:`);
for (const panel of panels.filter(p => p.targets)) {
  const q = { ...panel.targets[0], query: panel.targets[0].query.replaceAll('$env', env) };
  try {
    const out = await grafana('/api/ds/query', { queries: [q], from: 'now-24h', to: 'now' });
    const result = out.results?.A;
    if (result?.error) { console.log(`  ✗ ${panel.title}: ${result.error}`); continue; }
    const frames = result?.frames ?? [];
    const points = frames.reduce((n, f) => n + (f.data?.values?.[0]?.length ?? 0), 0);
    console.log(`  ${points ? '✓' : '·'} ${panel.title}${points ? '' : ' (no data yet)'}`);
  } catch (error) {
    console.log(`  ✗ ${panel.title}: ${error.message}`);
  }
}
