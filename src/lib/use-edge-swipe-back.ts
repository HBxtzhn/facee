import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';
import {
  resolveSwipeAction,
  shouldClaimSwipe,
  type SwipeActionHandlers,
} from './swipe-back';

/** 一次手势可能同时走 PanResponder 与 document mouse 两条路径（Web），防抖避免连跳两页 */
const GO_BACK_DEBOUNCE_MS = 400;

/**
 * 滑动返回/切题手势：左缘右滑返回 + 可选的屏幕中部滑动动作。
 *
 * 内部封装双路径（真机触摸走 PanResponder，桌面 Web 走 document 鼠标事件）
 * 与 400ms 防抖。返回值直接展开到屏幕根 View 上：
 *
 *   const panHandlers = useEdgeSwipeBack({ onEdgeBack: goBack });
 *   <View {...panHandlers}>…</View>
 *
 * 触摸起点不用 PanResponder 的 gesture.x0：Android 上「start 不认领、
 * 仅 move 认领」时 gestureState.x0 恒为 0，会把所有滑动误判成左缘
 * 手势（左滑切题永远失效、右滑切题变成返回）。起点从 View 原生
 * onTouchStart 的 pageX 记录，两条判定路径共用。
 */
export function useEdgeSwipeBack(options: SwipeActionHandlers) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const lastFiredAtRef = useRef(0);
  const touchStartXRef = useRef(0);

  const onTouchStart = useCallback((event: { nativeEvent: { pageX: number } }) => {
    touchStartXRef.current = event.nativeEvent.pageX;
  }, []);

  const fireAction = useCallback((action: ReturnType<typeof resolveSwipeAction>) => {
    if (!action) return;
    const now = Date.now();
    if (now - lastFiredAtRef.current < GO_BACK_DEBOUNCE_MS) return;
    lastFiredAtRef.current = now;
    const handlers = optionsRef.current;
    if (action === 'edge-back') handlers.onEdgeBack?.();
    else if (action === 'swipe-left') handlers.onSwipeLeft?.();
    else handlers.onSwipeRight?.();
  }, []);

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          shouldClaimSwipe(
            { x0: touchStartXRef.current, dx: gesture.dx, dy: gesture.dy },
            Boolean(optionsRef.current.onSwipeLeft || optionsRef.current.onSwipeRight),
          ),
        onPanResponderRelease: (_event, gesture) => {
          const { onEdgeBack, onSwipeLeft, onSwipeRight } = optionsRef.current;
          fireAction(
            resolveSwipeAction(
              { x0: touchStartXRef.current, dx: gesture.dx, dy: gesture.dy },
              { onEdgeBack, onSwipeLeft, onSwipeRight },
            ),
          );
        },
      }).panHandlers,
    [fireAction],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // 桌面浏览器的鼠标没有触摸语义，用 document 级 mouse 事件补一条平行路径
    const start = { x: 0, y: 0 };
    let tracking = false;
    const onDown = (event: MouseEvent) => {
      start.x = event.pageX;
      start.y = event.pageY;
      tracking = true;
    };
    const onUp = (event: MouseEvent) => {
      if (!tracking) return;
      tracking = false;
      const { onEdgeBack, onSwipeLeft, onSwipeRight } = optionsRef.current;
      fireAction(
        resolveSwipeAction(
          { x0: start.x, dx: event.pageX - start.x, dy: event.pageY - start.y },
          { onEdgeBack, onSwipeLeft, onSwipeRight },
        ),
      );
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
    };
  }, [fireAction]);

  return { panHandlers, onTouchStart };
}
