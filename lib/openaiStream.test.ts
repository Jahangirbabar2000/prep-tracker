import { describe, it, expect } from 'vitest';
import { parseSSE } from './openaiStream';

const chunk = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

describe('parseSSE', () => {
  it('extracts content deltas from complete data lines', () => {
    const buf = chunk('Hello') + chunk(' world');
    const { deltas, done } = parseSSE(buf);
    expect(deltas).toEqual(['Hello', ' world']);
    expect(done).toBe(false);
  });

  it('carries an incomplete trailing line over as rest', () => {
    const buf = chunk('done part') + 'data: {"choices":[{"delta":{"content":"par';
    const { deltas, rest } = parseSSE(buf);
    expect(deltas).toEqual(['done part']);
    expect(rest.startsWith('data: {"choices"')).toBe(true);
  });

  it('recognises the [DONE] sentinel', () => {
    const { done, deltas } = parseSSE('data: [DONE]\n');
    expect(done).toBe(true);
    expect(deltas).toEqual([]);
  });

  it('ignores keep-alive comments and blank lines', () => {
    const buf = `: keep-alive\n\n${chunk('x')}`;
    expect(parseSSE(buf).deltas).toEqual(['x']);
  });

  it('skips deltas with no content (e.g. role-only opening frame)', () => {
    const buf = `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n` + chunk('hi');
    expect(parseSSE(buf).deltas).toEqual(['hi']);
  });
});
