import { describe, expect, it } from '@jest/globals';
import { TEST_QUESTION_BANK } from './fixture';
import { collectTagSubtreeIds, filterCatalogQuestions } from './catalog';

describe('question-bank local filtering', () => {
  it('includes descendants when filtering by a parent tag', () => {
    const backendIds = collectTagSubtreeIds(TEST_QUESTION_BANK.catalog.tags, 'backend');
    expect([...backendIds].sort()).toEqual(['backend', 'database', 'java'].sort());
    expect(filterCatalogQuestions(TEST_QUESTION_BANK.catalog, { tagId: 'backend' })).toHaveLength(4);
  });

  it('combines case-insensitive query and difficulty filters', () => {
    const results = filterCatalogQuestions(TEST_QUESTION_BANK.catalog, {
      query: '缓存',
      difficulty: 2,
    });
    expect(results.map((question) => question.id)).toEqual(['fixture-arch-002']);
  });

  it('returns stable sort order and no results for an unknown tag', () => {
    const all = filterCatalogQuestions(TEST_QUESTION_BANK.catalog);
    expect(all.map((question) => question.sort)).toEqual([10, 20, 30, 40, 50, 60]);
    expect(filterCatalogQuestions(TEST_QUESTION_BANK.catalog, { tagId: 'does-not-exist' })).toEqual([]);
  });
});
