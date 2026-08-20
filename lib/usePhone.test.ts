import { describe, it, expect } from 'vitest';
import { isPhoneLike, PHONE_MEDIA_QUERY } from './usePhone';

describe('isPhoneLike', () => {
  it('accepts a portrait phone', () => {
    expect(isPhoneLike(390, 844, true)).toBe(true);
  });

  it('accepts a landscape phone (short, but wide)', () => {
    expect(isPhoneLike(932, 430, true)).toBe(true);
  });

  it('rejects an iPad in either orientation', () => {
    expect(isPhoneLike(820, 1180, true)).toBe(false);  // portrait
    expect(isPhoneLike(1180, 820, true)).toBe(false);  // landscape
    expect(isPhoneLike(1024, 768, true)).toBe(false);  // shortest landscape iPad
  });

  it('rejects a touchscreen laptop', () => {
    expect(isPhoneLike(1440, 900, true)).toBe(false);
  });

  it('rejects a mouse-driven device however small the window', () => {
    expect(isPhoneLike(360, 640, false)).toBe(false);
  });

  it('names both dimensions in the media query it mirrors', () => {
    expect(PHONE_MEDIA_QUERY).toContain('pointer: coarse');
    expect(PHONE_MEDIA_QUERY).toContain('max-width: 767px');
    expect(PHONE_MEDIA_QUERY).toContain('max-height: 500px');
  });
});
