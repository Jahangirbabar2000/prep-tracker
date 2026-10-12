import { describe, expect, it } from 'vitest';
import { mapLimit } from './mapLimit';

const tick = () => new Promise(r => setTimeout(r, 0));

describe('mapLimit', () => {
  it('never runs more than `limit` calls at once', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapLimit(Array.from({ length: 25 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight--;
    });
    expect(peak).toBe(4);
  });

  it('returns results in input order', async () => {
    const out = await mapLimit([30, 10, 20], 2, async ms => {
      await new Promise(r => setTimeout(r, ms));
      return ms;
    });
    expect(out).toEqual([30, 10, 20]);
  });

  it('handles an empty list and a limit below 1', async () => {
    expect(await mapLimit([], 4, async x => x)).toEqual([]);
    expect(await mapLimit([1, 2], 0, async x => x * 2)).toEqual([2, 4]);
  });
});
