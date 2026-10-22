import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Text } from '@/components/text';

/** 말풍선 최대 폭. 두 줄을 넘는 제목은 줄바꿈한다. */
const MAX_W = 170;

/**
 * 송이를 누르면 그 송이 바로 위에 뜨는 포도색(calm 보라) 말풍선 (스펙 7.1). 목표 제목만 보여 주고, 누르면 들어간다.
 * 가위로 오린 듯 가장자리가 울퉁불퉁한 종이다. 몸통 그림은 글자 크기만큼 늘리고, 꼬리는 따로 붙여 찌그러지지 않게 한다.
 * x·y는 꼬리 끝이 닿을 자리(송이 위 가운데)다. 덤불과 같은 무대 좌표로 둔다.
 */
export function BunchBubble({ title, x, y, onPress }: { title: string; x: number; y: number; onPress: () => void }) {
  return (
    // 폭 없는 기준점에 붙여, 말풍선이 글자 폭만큼 자라도 가운데가 x에 온다.
    <View style={[styles.anchor, { left: x, top: y }]} pointerEvents="box-none">
      <Animated.View entering={ZoomIn.duration(220)} exiting={ZoomOut.duration(140)} style={styles.lift}>
        <Pressable onPress={onPress} style={styles.bubble} accessibilityRole="button" accessibilityLabel={title}>
          <Image source={require('../../assets/tree/bubble-cut.svg')} contentFit="fill" style={StyleSheet.absoluteFill} />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.chevron} />
        </Pressable>
        <Image source={require('../../assets/tree/bubble-cut-tail.svg')} style={styles.tail} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0, alignItems: 'center' },
  lift: { position: 'absolute', bottom: 6, alignItems: 'center', width: MAX_W },
  bubble: {
    maxWidth: MAX_W, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 15, paddingRight: 14, paddingVertical: 11,
  },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  /** 누를 수 있다는 옅은 꺾쇠. */
  chevron: {
    width: 7, height: 7, borderTopWidth: 1.6, borderRightWidth: 1.6, borderColor: '#FFFFFF',
    opacity: 0.85, transform: [{ rotate: '45deg' }],
  },
  /** 아래로 뾰족한 꼬리. 몸통 그림 아래 끝에 살짝 겹쳐 붙인다. */
  tail: { width: 14, height: 13, marginTop: -2 },
});
