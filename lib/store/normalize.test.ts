import { describe, expect, it } from 'vitest';
import { normalize } from './store';

describe('normalize', () => {
  it('stands the built-in decks in for a snapshot from before decks were stored', () => {
    const data = normalize({ problems: [], attempts: [] });
    expect(data.domains.map(domain => domain.slug)).toContain('dsa');
    expect(data.domain_fields.length).toBeGreaterThan(0);
  });

  it('keeps an account with zero decks at zero decks (every new account)', () => {
    const data = normalize({ problems: [], attempts: [], domains: [], domain_fields: [], domain_field_options: [] });
    expect(data.domains).toEqual([]);
    expect(data.domain_fields).toEqual([]);
    expect(data.domain_field_options).toEqual([]);
  });

  it('has no decks before anything is loaded', () => {
    expect(normalize(null).domains).toEqual([]);
  });
});
