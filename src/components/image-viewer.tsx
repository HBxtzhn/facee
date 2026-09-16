import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';
import { MIN_IMAGE_SCALE, panLimit, scaleFromPinch } from '../lib/image-zoom';

/**
 * 全屏图片查看（§7.2「图片点击全屏缩放」）。
 *
 * 不引入 gesture-handler / reanimated（依赖纪律，见方案 §3）：
 * 单指拖动、双指捏合缩放的意图判定都放在 PanResponder 里，
 * 缩放与位移走 Animated.Value 的原生驱动。
 */

type OpenImageViewer = (src: string, alt?: string) => void;

const ImageViewerContext = createContext<OpenImageViewer>(() => undefined);

export const ImageViewerProvider = ImageViewerContext.Provider;

/** 在 Markdown 图片上调用它打开全屏查看。 */
export function useImageViewer(): OpenImageViewer {
  return useContext(ImageViewerContext);
}

interface PreviewState {
  src: string;
  alt?: string;
}

export function FullscreenImageModal({
  preview,
  onClose,
}: {
  preview: PreviewState | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(MIN_IMAGE_SCALE)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [scaleLabel, setScaleLabel] = useState(MIN_IMAGE_SCALE);

  const gesture = useMemo(() => ({ scale: MIN_IMAGE_SCALE, distance: 0, x: 0, y: 0 }), []);

  const reset = useCallback(() => {
    gesture.scale = MIN_IMAGE_SCALE;
    gesture.x = 0;
    gesture.y = 0;
    setScaleLabel(MIN_IMAGE_SCALE);
    scale.setValue(MIN_IMAGE_SCALE);
    translate.setValue({ x: 0, y: 0 });
  }, [gesture, scale, translate]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => undefined,
        onPanResponderMove: (event, state) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            // 双指：以两指距离比例缩放
            const [a, b] = touches;
            const distance = Math.hypot(
              a.pageX - b.pageX,
              a.pageY - b.pageY,
            );
            if (gesture.distance === 0) {
              gesture.distance = distance;
              return;
            }
            const next = scaleFromPinch(gesture.scale, gesture.distance, distance);
            setScaleLabel(next);
            scale.setValue(next);
            return;
          }

          gesture.distance = 0;
          // 单指：仅在放大后允许拖动，避免与原页滚动打架
          if (Number(scaleLabel) > MIN_IMAGE_SCALE) {
            const maxX = panLimit(width, scaleLabel);
            const maxY = panLimit(height, scaleLabel);
            gesture.x = Math.min(maxX, Math.max(-maxX, state.dx));
            gesture.y = Math.min(maxY, Math.max(-maxY, state.dy));
            translate.setValue({ x: gesture.x, y: gesture.y });
          }
        },
        onPanResponderRelease: (_event, state) => {
          const moved = Math.hypot(state.dx, state.dy);
          if (moved < 8 && Number(scaleLabel) <= MIN_IMAGE_SCALE) {
            onClose();
            return;
          }
          gesture.scale = Number(scaleLabel);
          gesture.distance = 0;
          if (gesture.scale <= MIN_IMAGE_SCALE) {
            gesture.x = 0;
            gesture.y = 0;
            translate.setValue({ x: 0, y: 0 });
          }
        },
      }),
    [gesture, height, onClose, scale, scaleLabel, translate, width],
  );

  if (!preview) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭全屏图片"
          onPress={() => {
            reset();
            onClose();
          }}
          style={styles.closeButton}
        >
          <X size={22} color={colors.white} strokeWidth={2} />
        </Pressable>

        <View style={styles.canvas} {...responder.panHandlers}>
          <Animated.Image
            source={{ uri: preview.src }}
            resizeMode="contain"
            accessibilityLabel={preview.alt}
            style={[
              styles.fullImage,
              {
                transform: [
                  { translateX: translate.x },
                  { translateY: translate.y },
                  { scale },
                ],
              },
            ]}
          />
        </View>

        <Text style={styles.hint}>
          {Number(scaleLabel) > MIN_IMAGE_SCALE
            ? `缩放 ${Number(scaleLabel).toFixed(1)}× · 双指调整 / 拖动查看`
            : '双指缩放 · 点击空白关闭'}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  canvas: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%' },
  closeButton: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.lg,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hint: {
    ...typography.caption,
    color: colors.white,
    textAlign: 'center',
    paddingBottom: spacing.xxl,
    opacity: 0.85,
  },
});
