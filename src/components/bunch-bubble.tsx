import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Text } from '@/components/text';
import { theme } from '@/theme';

/** 말풍선 최대 폭. 두 줄을 넘는 제목은 줄바꿈한다. */
const MAX_W = 170;

/**
 * 송이를 누르면 그 송이 바로 위에 뜨는 흰 말풍선 (스펙 7.1). 목표 제목만 보여 주고, 누르면 들어간다.
 * x·y는 꼬리 끝이 닿을 자리(송이 위 가운데)다. 덤불과 같은 무대 좌표로 둔다.
 */
export function BunchBubble({ title, x, y, onPress }: { title: string; x: number; y: number; onPress: () => void }) {
  return (
    // 폭 없는 기준점에 붙여, 말풍선이 글자 폭만큼 자라도 가운데가 x에 온다.
    <View style={[styles.anchor, { left: x, top: y }]} pointerEvents="box-none">
      <Animated.View entering={ZoomIn.duration(220)} exiting={ZoomOut.duration(140)} style={styles.lift}>
        <Pressable onPress={onPress} style={styles.bubble} accessibilityRole="button" accessibilityLabel={title}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.chevron} />
        </Pressable>
        <View style={styles.tail} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0, alignItems: 'center' },
  lift: { position: 'absolute', bottom: 6, alignItems: 'center', width: MAX_W },
  bubble: {
    maxWidth: MAX_W, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 13, paddingRight: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: '#FFFFFF',
    boxShadow: '0 4px 12px rgba(53, 51, 100, 0.18)',
  },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 18, color: theme.ink },
  /** 누를 수 있다는 옅은 꺾쇠. */
  chevron: {
    width: 7, height: 7, borderTopWidth: 1.6, borderRightWidth: 1.6, borderColor: theme.ink,
    opacity: 0.7, transform: [{ rotate: '45deg' }],
  },
  /** 아래로 향한 작은 삼각 꼬리. 흰 정사각형을 돌려 말풍선 아래로 반만 내민다. */
  tail: { width: 10, height: 10, marginTop: -5, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }] },
});
