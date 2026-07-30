import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { DomainField, Problem, StudyDomain } from '@/lib/types';

const db = vi.hoisted(() => ({
  execute: vi.fn(),
  localNow: vi.fn(() => '2026-07-29 12:00:00'),
  queryAll: vi.fn(),
  queryOne: vi.fn(),
}));

const domainServer = vi.hoisted(() => ({
  getProblem: vi.fn(),
  getProblems: vi.fn(),
  getStudyDomain: vi.fn(),
  legacyWrites: vi.fn(() => []),
  validateProblemMetadata: vi.fn(),
}));

vi.mock('@/lib/db', () => db);
vi.mock('@/lib/domain-server', () => domainServer);

import { POST as createDomain } from './domains/route';
import { PATCH as updateOption } from './domain-field-options/[id]/route';
import { POST as createProblem } from './problems/route';
import { PATCH as updateProblem } from './problems/[id]/route';

const activeDomain: StudyDomain = {
  id: 'custom',
  slug: 'databases',
  name: 'Databases',
  short_name: 'DB',
  study_mode: 'flashcard',
  icon: 'database',
  color: 'cyan',
  sort_order: 0,
  item_label: 'Question',
  log_label: 'Log Question',
  log_title: 'Log Database Question',
  empty_message: 'Empty',
  answer_placeholder: 'Answer',
  default_link: '',
  archived_at: null,
};

function request(url: string, method: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.queryAll.mockResolvedValue([]);
  db.execute.mockResolvedValue({ lastInsertRowid: BigInt(0), changes: 1 });
});

describe('runtime domain APIs', () => {
  it('rejects reserved slugs before touching the database', async () => {
    const response = await createDomain(request('/api/domains', 'POST', {
      name: 'API',
      slug: 'api',
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid or reserved slug' });
    expect(db.queryOne).not.toHaveBeenCalled();
  });

  it('rejects duplicate slugs case-insensitively', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 'existing' });
    const response = await createDomain(request('/api/domains', 'POST', {
      name: 'Databases',
      slug: 'databases',
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'That URL slug is already in use' });
    expect(db.queryOne).toHaveBeenCalledWith(
      'SELECT id FROM study_domains WHERE lower(slug) = lower(?)',
      ['databases'],
    );
  });

  it('rejects problem creation for archived domains', async () => {
    domainServer.getStudyDomain.mockResolvedValue({ ...activeDomain, archived_at: '2026-07-29' });
    const response = await createProblem(request('/api/problems', 'POST', {
      name: 'Normalization',
      domain: 'custom',
      metadata: {},
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Domain is archived' });
    expect(domainServer.validateProblemMetadata).not.toHaveBeenCalled();
  });

  it('surfaces undefined metadata keys as a validation error', async () => {
    domainServer.getStudyDomain.mockResolvedValue(activeDomain);
    domainServer.validateProblemMetadata.mockResolvedValue({
      error: 'Unknown metadata field: surprise',
    });
    const response = await createProblem(request('/api/problems', 'POST', {
      name: 'Normalization',
      domain: 'custom',
      metadata: { surprise: 'value' },
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unknown metadata field: surprise' });
  });

  it('edits a managed-select option without changing its stable ID', async () => {
    const existing = {
      id: 19,
      field_id: 11,
      value: 'SQL',
      sort_order: 0,
      archived_at: null,
    };
    db.queryOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ ...existing, value: 'Relational SQL' });

    const response = await updateOption(
      request('/api/domain-field-options/19', 'PATCH', { value: ' Relational SQL ' }),
      { params: Promise.resolve({ id: '19' }) },
    );

    expect(response.status).toBe(200);
    expect(db.execute).toHaveBeenCalledWith(
      'UPDATE domain_field_options SET value = ? WHERE id = ?',
      ['Relational SQL', '19'],
    );
    expect(await response.json()).toMatchObject({ id: 19, value: 'Relational SQL' });
  });

  it('merges metadata patches and removes explicitly cleared values', async () => {
    const problem = {
      id: 7,
      name: 'Normalization',
      domain: 'custom',
      metadata: { topic: 'Normal forms', source: 'Book' },
      interval_level: 0,
      next_due_date: null,
      created_at: '2026-07-29',
    } as Problem;
    const field: DomainField = {
      id: 11,
      domain_id: 'custom',
      key: 'topic',
      label: 'Topic',
      kind: 'text',
      placeholder: '',
      filterable: 1,
      tag_role: 'primary',
      sort_order: 0,
      archived_at: null,
      legacy_column: null,
    };
    domainServer.getProblem
      .mockResolvedValueOnce(problem)
      .mockResolvedValueOnce({ ...problem, metadata: { source: 'Book' } });
    domainServer.validateProblemMetadata.mockResolvedValue({ metadata: {}, fields: [field] });
    db.queryAll.mockResolvedValue([field]);

    const response = await updateProblem(
      request('/api/problems/7', 'PATCH', { metadata: { topic: '' } }),
      { params: Promise.resolve({ id: '7' }) },
    );

    expect(response.status).toBe(200);
    const [, values] = db.execute.mock.calls[0];
    expect(JSON.parse(values[0])).toEqual({ source: 'Book' });
    expect(values.at(-1)).toBe('7');
  });
});
