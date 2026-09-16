import { describe, expect, it } from '@jest/globals';
import { TEST_QUESTION_BANK } from './fixture';
import {
  assertCatalog,
  isQuestionBankCatalog,
  validateCatalog,
  validateCatalogSchema,
} from './schema';

describe('question-bank catalog schema', () => {
  it('accepts the built-in catalog', () => {
    expect(validateCatalog(TEST_QUESTION_BANK.catalog)).toBe(true);
    expect(isQuestionBankCatalog(TEST_QUESTION_BANK.catalog)).toBe(true);
    expect(validateCatalogSchema(TEST_QUESTION_BANK.catalog)).toEqual({ valid: true, issues: [] });
  });

  it('rejects duplicate ids and unknown tag references', () => {
    const invalid = {
      ...TEST_QUESTION_BANK.catalog,
      questions: [
        { ...TEST_QUESTION_BANK.catalog.questions[0], id: 'duplicate' },
        { ...TEST_QUESTION_BANK.catalog.questions[1], id: 'duplicate', tags: [{ id: 'missing', name: 'Missing' }] },
      ],
    };

    expect(validateCatalog(invalid)).toBe(false);
    expect(validateCatalogSchema(invalid).issues.join(' ')).toContain('duplicated');
    expect(() => assertCatalog(invalid)).toThrow('Invalid question bank');
  });

  it('rejects unsafe ids and tag cycles', () => {
    const invalid = {
      ...TEST_QUESTION_BANK.catalog,
      tags: [
        { id: 'a/b', name: 'A', parentId: 'b', sort: 1 },
        { id: 'b', name: 'B', parentId: 'a/b', sort: 2 },
      ],
    };
    expect(validateCatalog(invalid)).toBe(false);
    const issues = validateCatalogSchema(invalid).issues.join(' ');
    expect(issues).toContain('safe non-empty id');
    expect(issues).toContain('parent cycle');
  });
});
