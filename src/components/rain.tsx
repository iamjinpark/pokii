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
const DENSITY = 4.5;

/** 한 주기 중 떨어지는 몫. 나머지는 바닥에서 톡 튀는 시간이다. */
const FALL = 0.88;

type Drop = { x: number; length: number; ms: number; delay: number; splash: boolean };

function makeDrops(width: number, height: number): Drop[] {
  const n = Math.round(((width * height) / 10000) * DENSITY);
  // 비스듬히 떨어지므로 오른쪽 바깥에서 출발한 빗방울도 화면 안으로 들어온다.
  return Array.from({ length: n }, () => ({
    x: Math.random() * (width + height * SLANT),
    length: 10 + Math.random() * 10,
    ms: 900 + Math.random() * 700,
    delay: Math.random() * 1600,
    // 절반만 튀어야 바닥이 요란하지 않다.
    splash: Math.random() < 0.5,
  }));
}

/** 바닥에서 튄 물방울 하나. side 쪽으로 작게 포물선을 그리며 사라진다. */
function splashDot(fall: number, side: number) {
  'worklet';
  const p = Math.max(0, (fall - FALL) / (1 - FALL));
  return {
    opacity: p > 0 ? 0.8 * (1 - p) : 0,
    transform: [{ translateX: side * 6 * p }, { translateY: -6 * Math.sin(Math.PI * p) }],
  };
}

function RainDrop({ drop, height }: { drop: Drop; height: number }) {
  const fall = useSharedValue(0);
  useEffect(() => {
    fall.set(withDelay(drop.delay, withRepeat(withTiming(1, { duration: drop.ms, easing: Easing.linear }), -1)));
    return () => cancelAnimation(fall);
  }, [fall, drop]);

  const style = useAnimatedStyle(() => {
    const y = -drop.length + Math.min(1, fall.value / FALL) * height;
    return {
      opacity: fall.value < FALL ? 0.8 : 0,
      transform: [{ translateX: drop.x - y * SLANT }, { translateY: y }, { rotate: `${Math.atan(SLANT)}rad` }],
    };
  });
  // 바닥에 닿은 자리에서 작은 물결 고리가 퍼지고 물방울 둘이 양옆으로 튄다.
  const landX = drop.x - (height - drop.length) * SLANT;
  const ring = useAnimatedStyle(() => {
    const p = Math.max(0, (fall.value - FALL) / (1 - FALL));
    return { opacity: p > 0 ? 0.7 * (1 - p) : 0, transform: [{ scaleX: 0.3 + 0.7 * p }, { scaleY: 0.3 + 0.7 * p }] };
  });
  const left = useAnimatedStyle(() => splashDot(fall.value, -1));
  const right = useAnimatedStyle(() => splashDot(fall.value, 1));
  return (
    <>
      <Animated.View style={[styles.drop, { height: drop.length }, style]} />
      {drop.splash ? (
        <View style={[styles.splash, { left: landX - 6, top: height - 4 }]}>
          <Animated.View style={[styles.ring, ring]} />
          <Animated.View style={[styles.splashDot, left]} />
          <Animated.View style={[styles.splashDot, right]} />
        </View>
      ) : null}
    </>
  );
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
  drop: { position: 'absolute', left: 0, top: 0, width: 1.5, borderRadius: 1, backgroundColor: COLOR },
  splash: { position: 'absolute', width: 12, height: 4, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 12, height: 4, borderRadius: 6, borderWidth: 1, borderColor: COLOR },
  splashDot: { position: 'absolute', top: -1, width: 2, height: 2, borderRadius: 1, backgroundColor: COLOR },
});
