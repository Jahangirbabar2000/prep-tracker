import { describe, it, expect } from 'vitest';
import { resolveSwipe, isTextEntry, findScrollableX, canScrollX, SWIPE_MIN_DISTANCE } from './useSwipeNav';

describe('resolveSwipe', () => {
  it('ignores gestures shorter than the minimum distance', () => {
    expect(resolveSwipe(SWIPE_MIN_DISTANCE - 1, 0)).toBeNull();
    expect(resolveSwipe(-(SWIPE_MIN_DISTANCE - 1), 0)).toBeNull();
  });

  it('ignores gestures that are not horizontally dominant', () => {
    // |dx| must exceed |dy| * 1.5
    expect(resolveSwipe(80, 80)).toBeNull();
    expect(resolveSwipe(80, 60)).toBeNull(); // 80 < 60 * 1.5
  });

  it('classifies a clear left swipe', () => {
    expect(resolveSwipe(-120, 10)).toBe('left');
  });

  it('classifies a clear right swipe', () => {
    expect(resolveSwipe(120, -10)).toBe('right');
  });
});

describe('isTextEntry', () => {
  it('detects inputs, textareas and contenteditable', () => {
    document.body.innerHTML = `
      <input id="i" />
      <textarea id="t"></textarea>
      <div id="ce" contenteditable="true"><span id="child">x</span></div>
      <p id="p">plain</p>`;
    expect(isTextEntry(document.getElementById('i'))).toBe(true);
    expect(isTextEntry(document.getElementById('t'))).toBe(true);
    expect(isTextEntry(document.getElementById('child'))).toBe(true); // closest() climbs to the CE ancestor
    expect(isTextEntry(document.getElementById('p'))).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});

// Helper: give a jsdom element fake layout metrics (jsdom has no layout engine).
function withScroll(el: HTMLElement, { scrollWidth, clientWidth, scrollLeft }: {
  scrollWidth: number; clientWidth: number; scrollLeft: number;
}) {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollLeft', { configurable: true, writable: true, value: scrollLeft });
}

describe('findScrollableX', () => {
  it('returns the nearest ancestor that overflows horizontally with overflow-x scroll/auto', () => {
    document.body.innerHTML = `<pre id="pre" style="overflow-x:auto"><code id="code">x</code></pre>`;
    const pre = document.getElementById('pre') as HTMLElement;
    const code = document.getElementById('code') as HTMLElement;
    withScroll(pre, { scrollWidth: 800, clientWidth: 300, scrollLeft: 0 });
    expect(findScrollableX(code)).toBe(pre);
  });

  it('returns null when the box does not actually overflow', () => {
    document.body.innerHTML = `<pre id="pre" style="overflow-x:auto"><code id="code">x</code></pre>`;
    const pre = document.getElementById('pre') as HTMLElement;
    const code = document.getElementById('code') as HTMLElement;
    withScroll(pre, { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    expect(findScrollableX(code)).toBeNull();
  });

  it('returns null when overflow-x is not scroll/auto even if it overflows', () => {
    document.body.innerHTML = `<div id="d" style="overflow-x:visible"><span id="s">x</span></div>`;
    const d = document.getElementById('d') as HTMLElement;
    withScroll(d, { scrollWidth: 800, clientWidth: 300, scrollLeft: 0 });
    expect(findScrollableX(document.getElementById('s'))).toBeNull();
  });
});

describe('canScrollX', () => {
  function box({ scrollWidth, clientWidth, scrollLeft }: { scrollWidth: number; clientWidth: number; scrollLeft: number }) {
    const el = document.createElement('div');
    withScroll(el, { scrollWidth, clientWidth, scrollLeft });
    return el;
  }

  it('can scroll further right (swipe left, dx<0) when not at the right edge', () => {
    expect(canScrollX(box({ scrollWidth: 800, clientWidth: 300, scrollLeft: 0 }), -1)).toBe(true);
    expect(canScrollX(box({ scrollWidth: 800, clientWidth: 300, scrollLeft: 500 }), -1)).toBe(false); // at max (800-300)
  });

  it('can scroll back left (swipe right, dx>0) when not at the left edge', () => {
    expect(canScrollX(box({ scrollWidth: 800, clientWidth: 300, scrollLeft: 200 }), 1)).toBe(true);
    expect(canScrollX(box({ scrollWidth: 800, clientWidth: 300, scrollLeft: 0 }), 1)).toBe(false);
  });
});
