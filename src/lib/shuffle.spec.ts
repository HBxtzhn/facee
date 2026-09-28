import { describe, it, expect } from '@jest/globals';
import { shuffled } from './shuffle';

describe('shuffled - Fisher-Yates 洗牌', () => {
  it('不改动入参数组，返回新数组', () => {
    const source = [1, 2, 3, 4, 5];
    const result = shuffled(source);
    expect(result).not.toBe(source);
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });

  it('洗牌前后是同一个多重集（不丢不重）', () => {
    const source = Array.from({ length: 200 }, (_, index) => `q-${index}`);
    const result = shuffled(source);
    expect([...result].sort()).toEqual([...source].sort());
  });

  it('空数组与单元素数组安全', () => {
    expect(shuffled([])).toEqual([]);
    expect(shuffled(['q1'])).toEqual(['q1']);
  });

  it('大数组上顺序确实会变化（非恒等置换）', () => {
    const source = Array.from({ length: 100 }, (_, index) => index);
    const identicalRuns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
      () => shuffled(source).every((value, index) => value === source[index]),
    ).length;
    expect(identicalRuns).toBeLessThan(10);
  });
});
