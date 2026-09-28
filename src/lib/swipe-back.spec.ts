import { describe, it, expect } from '@jest/globals';
import {
  EDGE_BACK_ZONE,
  resolveSwipeAction,
  shouldClaimSwipe,
} from './swipe-back';

const intent = (overrides: Partial<{ x0: number; dx: number; dy: number }> = {}) => ({
  x0: 200,
  dx: 0,
  dy: 0,
  ...overrides,
});

describe('左缘右滑返回判定（swipe-back）', () => {
  describe('resolveSwipeAction（松手裁决）', () => {
    it('左缘开始的右滑 → edge-back', () => {
      const action = resolveSwipeAction(
        intent({ x0: 12, dx: 220 }),
        { onEdgeBack: () => undefined },
      );
      expect(action).toBe('edge-back');
    });

    it('左缘但右滑距离不足（55 < 56）→ null', () => {
      const action = resolveSwipeAction(
        intent({ x0: 12, dx: 55 }),
        { onEdgeBack: () => undefined },
      );
      expect(action).toBeNull();
    });

    it('左缘开始的左滑 → null（边缘只认右滑）', () => {
      const action = resolveSwipeAction(
        intent({ x0: 12, dx: -220 }),
        { onEdgeBack: () => undefined },
      );
      expect(action).toBeNull();
    });

    it('左缘右滑但没有提供 onEdgeBack → null', () => {
      const action = resolveSwipeAction(intent({ x0: 12, dx: 220 }), {});
      expect(action).toBeNull();
    });

    it('中部左滑 → swipe-left；中部右滑 → swipe-right', () => {
      const handlers = { onSwipeLeft: () => undefined, onSwipeRight: () => undefined };
      expect(resolveSwipeAction(intent({ x0: 200, dx: -150 }), handlers)).toBe('swipe-left');
      expect(resolveSwipeAction(intent({ x0: 200, dx: 150 }), handlers)).toBe('swipe-right');
    });

    it('中部滑动但未提供对应回调 → null（浏览模式不切题）', () => {
      expect(resolveSwipeAction(intent({ x0: 200, dx: -150 }), {})).toBeNull();
      expect(resolveSwipeAction(intent({ x0: 200, dx: 150 }), {})).toBeNull();
    });

    it('纵向位移过大 → null（不与滚动打架）', () => {
      const action = resolveSwipeAction(
        intent({ x0: 200, dx: 150, dy: 280 }),
        { onSwipeRight: () => undefined },
      );
      expect(action).toBeNull();
    });
  });

  describe('shouldClaimSwipe（移动阶段认领）', () => {
    it('左缘右滑 25px 即认领（24px 阈值之上）', () => {
      expect(shouldClaimSwipe(intent({ x0: 10, dx: 25 }), false)).toBe(true);
    });

    it('左缘右滑 24px 不认领', () => {
      expect(shouldClaimSwipe(intent({ x0: 10, dx: 24 }), false)).toBe(false);
    });

    it('左缘左滑即使有中部动作也不认领', () => {
      expect(shouldClaimSwipe(intent({ x0: 10, dx: -200 }), true)).toBe(false);
    });

    it('中部横向滑动在有回调时认领', () => {
      expect(shouldClaimSwipe(intent({ x0: 200, dx: -80 }), true)).toBe(true);
      expect(shouldClaimSwipe(intent({ x0: 200, dx: -80 }), false)).toBe(false);
    });

    it(`边缘判定区宽度为 ${EDGE_BACK_ZONE}px`, () => {
      expect(EDGE_BACK_ZONE).toBe(40);
    });
  });
});
