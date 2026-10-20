import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** 시안 main-rainy-*의 빗줄기: 옅은 파랑, 오른쪽 위에서 왼쪽 아래로 비스듬히. */
const COLOR = '#A9C4E8';
const SLANT = 0.35;
/** 화면 넓이 1만 dp²당 빗방울 수. */
const DENSITY = 2.2;

type Drop = { x: number; length: number; ms: number; delay: number };

function makeDrops(width: number, height: number): Drop[] {
  const n = Math.round(((width * height) / 10000) * DENSITY);
  // 비스듬히 떨어지므로 오른쪽 바깥에서 출발한 빗방울도 화면 안으로 들어온다.
  return Array.from({ length: n }, () => ({
    x: Math.random() * (width + height * SLANT),
    length: 10 + Math.random() * 10,
    ms: 900 + Math.random() * 700,
    delay: Math.random() * 1600,
  }));
}

function RainDrop({ drop, height }: { drop: Drop; height: number }) {
  const fall = useSharedValue(0);
  useEffect(() => {
    fall.set(withDelay(drop.delay, withRepeat(withTiming(1, { duration: drop.ms, easing: Easing.linear }), -1)));
    return () => cancelAnimation(fall);
  }, [fall, drop]);

  const style = useAnimatedStyle(() => {
    const y = -drop.length + fall.value * (height + drop.length * 2);
    return { transform: [{ translateX: drop.x - y * SLANT }, { translateY: y }, { rotate: `${Math.atan(SLANT)}rad` }] };
  });
  return <Animated.View style={[styles.drop, { height: drop.length }, style]} />;
}

/** 화면 전체에 비가 내린다. 빗방울마다 자리·길이·속도·시작이 달라 제각각 떨어진다. 터치는 아래로 흘려보낸다. */
export function Rain({ width, height }: { width: number; height: number }) {
  // ponytail: 크기가 바뀌어도 처음 만든 빗방울을 그대로 쓴다. 화면 회전을 지원하면 다시 만들 것.
  const [drops] = useState(() => makeDrops(width, height));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => (
        <RainDrop key={i} drop={d} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', left: 0, top: 0, width: 1.5, borderRadius: 1, backgroundColor: COLOR, opacity: 0.8 },
});
