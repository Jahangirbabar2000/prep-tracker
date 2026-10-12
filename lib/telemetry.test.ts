// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { trace } from '@opentelemetry/api';
import { InMemorySpanExporter, NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { annotate, describeSql, flushTelemetry, setTelemetryFlush, withSpan } from './telemetry';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

beforeAll(() => provider.register());
afterAll(async () => {
  await provider.shutdown();
  trace.disable();
});
beforeEach(() => exporter.reset());

describe('describeSql', () => {
  it('names the operation and table, never the values', () => {
    expect(describeSql('SELECT * FROM problems WHERE user_id = ?')).toEqual({ op: 'SELECT', table: 'problems' });
    expect(describeSql('\n  INSERT INTO attempts (user_id) VALUES (?)')).toEqual({ op: 'INSERT', table: 'attempts' });
    expect(describeSql('UPDATE users SET email = ? WHERE id = ?')).toEqual({ op: 'UPDATE', table: 'users' });
    expect(describeSql('PRAGMA table_info(x)')).toEqual({ op: 'PRAGMA', table: '' });
  });
});

describe('withSpan', () => {
  it('records a span with its attributes', async () => {
    expect(await withSpan('db SELECT problems', { 'db.operation.name': 'SELECT' }, async () => 42)).toBe(42);
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('db SELECT problems');
    expect(span.attributes['db.operation.name']).toBe('SELECT');
  });

  it('marks a failure and rethrows it', async () => {
    await expect(withSpan('db INSERT attempts', {}, async () => { throw new Error('UNIQUE constraint failed'); }))
      .rejects.toThrow(/UNIQUE/);
    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(2); // ERROR
    expect(span.events.some(event => event.name === 'exception')).toBe(true);
  });

  it('lets annotate() reach the active span', async () => {
    await withSpan('api', {}, async () => annotate({ 'enduser.id': 'usr_a' }));
    expect(exporter.getFinishedSpans()[0].attributes['enduser.id']).toBe('usr_a');
  });
});

describe('flushTelemetry', () => {
  it("doesn't hold a response hostage to a slow backend", async () => {
    setTelemetryFlush(() => new Promise(() => {})); // never settles
    const started = Date.now();
    await flushTelemetry(50);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('swallows a failed export', async () => {
    setTelemetryFlush(() => Promise.reject(new Error('backend down')));
    await expect(flushTelemetry(50)).resolves.toBeUndefined();
  });
});
