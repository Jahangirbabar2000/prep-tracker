import { describe, it, expect } from 'vitest';
import { DEFAULT_QUEUE_ORDER, parseQueueOrder, QUEUE_ORDER_OPTIONS } from './filters';

describe('parseQueueOrder', () => {
  it('reads the known order values', () => {
    expect(parseQueueOrder('overdue')).toBe('overdue');
    expect(parseQueueOrder('due-soon')).toBe('due-soon');
  });

  it('falls back to the default for anything else', () => {
    // A missing param is the common case; the rest are hand-edited or stale links.
    expect(parseQueueOrder(null)).toBe(DEFAULT_QUEUE_ORDER);
    expect(parseQueueOrder(undefined)).toBe(DEFAULT_QUEUE_ORDER);
    expect(parseQueueOrder('')).toBe(DEFAULT_QUEUE_ORDER);
    expect(parseQueueOrder('DUE-SOON')).toBe(DEFAULT_QUEUE_ORDER);
    expect(parseQueueOrder('newest')).toBe(DEFAULT_QUEUE_ORDER);
  });

  it('round-trips every option the select can produce', () => {
    // Keeps the dropdown and the query function from ever disagreeing.
    for (const option of QUEUE_ORDER_OPTIONS) {
      expect(parseQueueOrder(option.value)).toBe(option.value);
    }
  });

  it('lists the default first', () => {
    expect(QUEUE_ORDER_OPTIONS[0].value).toBe(DEFAULT_QUEUE_ORDER);
  });
});
