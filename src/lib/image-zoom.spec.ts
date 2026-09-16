import { describe, it, expect } from '@jest/globals';
import { clampScale, panLimit, scaleFromPinch } from './image-zoom';

describe('全屏图片缩放（§7.2）', () => {
  it('缩放钳制在 1×–5×', () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(-3)).toBe(1);
    expect(clampScale(9)).toBe(5);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(Number.NaN)).toBe(1);
  });

  it('拖动边界随缩放倍数增长', () => {
    expect(panLimit(1000, 1)).toBe(0);
    expect(panLimit(1000, 2)).toBe(500);
    expect(panLimit(1000, 5)).toBe(2000);
    expect(panLimit(1000, 99)).toBe(2000); // 先被钳到 5×
  });

  it('双指距离按比例换算缩放', () => {
    expect(scaleFromPinch(1, 100, 200)).toBe(2);
    expect(scaleFromPinch(2, 100, 50)).toBe(1);
    expect(scaleFromPinch(3, 100, 1000)).toBe(5); // 上限
  });

  it('无效距离保持原值，不会跳变', () => {
    expect(scaleFromPinch(2, 0, 500)).toBe(2);
    expect(scaleFromPinch(2, 100, Number.NaN)).toBe(2);
  });
});
