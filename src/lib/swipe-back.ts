/**
 * 左缘右滑返回 / 中部滑动动作的判定规则（纯逻辑，便于单测）。
 *
 * 手势消费方（use-edge-swipe-back）把触摸/鼠标事件统一交给这里裁决：
 *   - 从左缘 EDGE_BACK_ZONE 内开始的右滑 = 返回上一页（优先级最高，与切题不冲突）
 *   - 屏幕中部的左滑/右滑 = 调用方定义的动作（如练习模式的下一题/上一题）
 *
 * 两个阈值：
 *   - 认领手势 24px：超过即开始跟踪（onMoveShouldSetPanResponder）
 *   - 确认动作 56px：松手时达到才真正触发，否则视为误触
 *   - 横向意图：|dx| 必须大于 |dy| × 1.8，避免和纵向滚动打架
 */

export const EDGE_BACK_ZONE = 40;
export const SWIPE_MIN_DISTANCE = 56;
const SWIPE_CLAIM_DISTANCE = 24;
const SWIPE_DIRECTION_RATIO = 1.8;

export type SwipeAction = 'edge-back' | 'swipe-left' | 'swipe-right';

export interface SwipeIntent {
  /** 手势起点的横坐标（pageX） */
  x0: number;
  /** 横向位移：右滑为正 */
  dx: number;
  /** 纵向位移：下滑为正 */
  dy: number;
}

export interface SwipeActionHandlers {
  onEdgeBack?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/** 是否应该在移动阶段认领这个手势（认领后松手才裁决动作） */
export function shouldClaimSwipe(
  intent: SwipeIntent,
  hasMiddleActions: boolean,
): boolean {
  const horizontalOk =
    Math.abs(intent.dx) > SWIPE_CLAIM_DISTANCE &&
    Math.abs(intent.dx) > Math.abs(intent.dy) * SWIPE_DIRECTION_RATIO;
  if (!horizontalOk) return false;
  if (intent.x0 <= EDGE_BACK_ZONE) return intent.dx > 0;
  return hasMiddleActions;
}

/** 松手时裁决动作；不满足任何条件返回 null（视为误触，不触发） */
export function resolveSwipeAction(
  intent: SwipeIntent,
  handlers: SwipeActionHandlers,
): SwipeAction | null {
  const horizontalOk =
    Math.abs(intent.dx) >= SWIPE_MIN_DISTANCE &&
    Math.abs(intent.dx) > Math.abs(intent.dy) * SWIPE_DIRECTION_RATIO;
  if (!horizontalOk) return null;

  if (intent.x0 <= EDGE_BACK_ZONE) {
    return intent.dx > 0 && handlers.onEdgeBack ? 'edge-back' : null;
  }
  if (intent.dx < 0 && handlers.onSwipeLeft) return 'swipe-left';
  if (intent.dx > 0 && handlers.onSwipeRight) return 'swipe-right';
  return null;
}
