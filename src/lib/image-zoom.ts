/**
 * 全屏图片查看的纯逻辑（与 UI 解耦，便于单测）。
 * 依赖纪律：不引入 gesture-handler / reanimated，见 docs/FaceE-实现方案.md §3。
 */

export const MIN_IMAGE_SCALE = 1;
export const MAX_IMAGE_SCALE = 5;

/** 把缩放钳制在 [1, 5]：低于 1 会缩到消失，高于 5 只会看到马赛克。 */
export function clampScale(scale: number): number {
  if (Number.isNaN(scale)) return MIN_IMAGE_SCALE;
  return Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, scale));
}

/** 拖动位移的边界：放大 n 倍时可移动范围约为 (尺寸 ×(n-1))/2。 */
export function panLimit(size: number, scale: number): number {
  return Math.max(0, (size * (clampScale(scale) - 1)) / 2);
}

/** 双指距离 → 新缩放值。距离无效（0）时保持原值。 */
export function scaleFromPinch(baseScale: number, baseDistance: number, distance: number): number {
  if (!baseDistance || !Number.isFinite(distance)) return clampScale(baseScale);
  return clampScale(baseScale * (distance / baseDistance));
}
