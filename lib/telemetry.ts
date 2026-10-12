// Spans for the parts Next.js doesn't trace itself: Turso queries, and what
// the API routes did. Built on @opentelemetry/api alone, so with no provider
// registered (tracing off — see instrumentation.ts) every call is a no-op.
//
// Never put card text, notes, answers, emails or tokens in an attribute:
// ids, counts, sizes and SQL statement text (parameterized, so no values) only.
import { SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api';

const tracer = trace.getTracer('prep-tracker');

// instrumentation.ts is bundled apart from the route handlers, so each gets
// its own copy of this module; the flush hook lives on globalThis (as the
// tracer provider itself does, inside @opentelemetry/api) to be shared.
const FLUSH = Symbol.for('prep-tracker.telemetry.flush');
type WithFlush = { [FLUSH]?: () => Promise<void> };

/** instrumentation.node.ts hands over the provider's forceFlush here. */
export function setTelemetryFlush(fn: () => Promise<void>) { (globalThis as WithFlush)[FLUSH] = fn; }

let coldStart = true;
/** True only for the first request this server instance handles. */
export function takeColdStart(): boolean {
  const cold = coldStart;
  coldStart = false;
  return cold;
}

/** Run `fn` in a span: its duration, its outcome, and any exception. */
export async function withSpan<T>(name: string, attributes: Attributes, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async span => {
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Attributes on whatever span is current (the API route's, inside withUser). */
export function annotate(attributes: Attributes) {
  trace.getActiveSpan()?.setAttributes(attributes);
}

/**
 * Send what's buffered before Lambda freezes the process — at most `capMs`,
 * so a slow telemetry backend can't hold up a response for long.
 */
export async function flushTelemetry(capMs = 1500): Promise<void> {
  const flush = (globalThis as WithFlush)[FLUSH];
  if (!flush) return;
  await Promise.race([flush().catch(() => {}), new Promise(resolve => setTimeout(resolve, capMs))]);
}

/** "SELECT * FROM problems WHERE …" → { op: 'SELECT', table: 'problems' } */
export function describeSql(sql: string): { op: string; table: string } {
  const text = sql.trim().replace(/\s+/g, ' ');
  const op = (text.match(/^(\w+)/)?.[1] ?? 'SQL').toUpperCase();
  const table = text.match(/\b(?:FROM|INTO|UPDATE)\s+([a-z_]+)/i)?.[1] ?? '';
  return { op, table };
}
