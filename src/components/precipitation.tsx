import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

export type PrecipitationKind = 'rain' | 'snow';

/** 시안 main-rainy-*의 빗줄기: 옅은 파랑, 오른쪽 위에서 왼쪽 아래로 비스듬히. */
const RAIN_COLOR = '#A9C4E8';
const SLANT = 0.35;
/** 한 번 떨어지는 동안 떨어지는 몫. 나머지는 바닥에서 톡 튀는 시간이다. */
const FALL = 0.88;

/** density는 화면 넓이 1만 dp²당 개수, ms는 위에서 아래까지 걸리는 시간 범위. */
const LOOK = {
  rain: { density: 4.5, ms: [900, 1600] },
  snow: { density: 2.2, ms: [8000, 13000] },
} as const;

type Particle = { seed: number; ms: number; offset: number; size: number; splash: boolean };

function makeParticles(kind: PrecipitationKind, width: number, height: number): Particle[] {
  const { density, ms } = LOOK[kind];
  const n = Math.round(((width * height) / 10000) * density);
  return Array.from({ length: n }, (_, i) => ({
    seed: i * 12.9898,
    ms: ms[0] + Math.random() * (ms[1] - ms[0]),
    // 처음부터 저마다 다른 높이에 있어야 한꺼번에 쏟아지지 않는다.
    offset: Math.random(),
    size: kind === 'rain' ? 10 + Math.random() * 10 : 5 + Math.random() * 4,
    // 절반만 튀어야 바닥이 요란하지 않다.
    splash: Math.random() < 0.5,
  }));
}

/** 0~1 의사 난수. 같은 입력이면 같은 값이라 UI 스레드에서 매 프레임 불러도 된다. */
function hash(n: number) {
  'worklet';
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 한 알갱이가 지금 몇 번째로 떨어지는 중이고(cycle) 얼마나 왔는지(p).
 * 떨어질 때마다 가로 자리를 새로 뽑아 같은 줄로만 내리지 않게 한다.
 */
function progress(time: number, q: Particle, span: number) {
  'worklet';
  const phase = time / q.ms + q.offset;
  const cycle = Math.floor(phase);
  return { p: phase - cycle, x: hash(q.seed + cycle * 7.13) * span };
}

function RainDrop({ q, time, width, height }: { q: Particle; time: SharedValue<number>; width: number; height: number }) {
  const span = width + height * SLANT;
  const drop = useAnimatedStyle(() => {
    const { p, x } = progress(time.value, q, span);
    const y = -q.size + Math.min(1, p / FALL) * height;
    return {
      opacity: p < FALL ? 0.8 : 0,
      transform: [{ translateX: x - y * SLANT }, { translateY: y }, { rotate: `${Math.atan(SLANT)}rad` }],
    };
  });
  // 바닥에 닿은 자리에서 작은 물결 고리가 퍼지고 물방울 둘이 양옆으로 튄다.
  const splash = useAnimatedStyle(() => {
    const { p, x } = progress(time.value, q, span);
    return { transform: [{ translateX: x - (height - q.size) * SLANT - 6 }, { translateY: height - 4 }], opacity: p < FALL ? 0 : 1 };
  });
  const ring = useAnimatedStyle(() => {
    const t = Math.max(0, (progress(time.value, q, span).p - FALL) / (1 - FALL));
    return { opacity: 0.7 * (1 - t), transform: [{ scaleX: 0.3 + 0.7 * t }, { scaleY: 0.3 + 0.7 * t }] };
  });
  const left = useAnimatedStyle(() => splashDot(progress(time.value, q, span).p, -1));
  const right = useAnimatedStyle(() => splashDot(progress(time.value, q, span).p, 1));
  return (
    <>
      <Animated.View style={[styles.drop, { height: q.size }, drop]} />
      {q.splash ? (
        <Animated.View style={[styles.splash, splash]}>
          <Animated.View style={[styles.ring, ring]} />
          <Animated.View style={[styles.splashDot, left]} />
          <Animated.View style={[styles.splashDot, right]} />
        </Animated.View>
      ) : null}
    </>
  );
}

/** 바닥에서 튄 물방울 하나. side 쪽으로 작게 포물선을 그리며 사라진다. */
function splashDot(p: number, side: number) {
  'worklet';
  const t = Math.max(0, (p - FALL) / (1 - FALL));
  return {
    opacity: 0.8 * (1 - t),
    transform: [{ translateX: side * 6 * t }, { translateY: -6 * Math.sin(Math.PI * t) }],
  };
}

/** 눈송이: 천천히 내려오며 좌우로 살랑인다. */
function SnowFlake({ q, time, width, height }: { q: Particle; time: SharedValue<number>; width: number; height: number }) {
  const style = useAnimatedStyle(() => {
    const { p, x } = progress(time.value, q, width);
    const sway = Math.sin(p * Math.PI * 3 + q.seed) * 16;
    return { transform: [{ translateX: x + sway }, { translateY: -q.size + p * (height + q.size * 2) }] };
  });
  return <Animated.View style={[styles.flake, { width: q.size, height: q.size, borderRadius: q.size / 2 }, style]} />;
}

/** 바닥 눈 더미가 다 쌓이기까지 걸리는 시간과 최대 높이(dp). */
const PILE_MS = 60000;
const PILE_H = 14;

/** 바닥에 쌓이는 눈 더미. 크기가 다른 동그라미를 이어 붙여 위쪽이 울퉁불퉁하고, 눈이 내리는 동안 천천히 올라온다. */
function SnowPile({ time, width, height, grown }: { time: SharedValue<number>; width: number; height: number; grown: boolean }) {
  const [mounds] = useState(() => {
    const out: { x: number; d: number }[] = [];
    for (let x = -10; x < width + 10; x += 10 + Math.random() * 8) out.push({ x, d: 14 + Math.random() * 10 });
    return out;
  });
  const rise = useAnimatedStyle(() => {
    const g = grown ? 1 : Math.min(1, time.value / PILE_MS);
    return { transform: [{ translateY: (1 - g) * PILE_H }] };
  });
  // 화면 밖으로 삐져나가지 않게 바깥 칸에서 자르고, 안쪽을 아래에서 밀어 올린다.
  return (
    <View style={[styles.pile, { top: height - PILE_H, width, height: PILE_H }]}>
      <Animated.View style={[StyleSheet.absoluteFill, rise]}>
        {mounds.map((m, i) => (
          <View key={i} style={[styles.puff, { left: m.x - m.d / 2, top: PILE_H - m.d * 0.55, width: m.d, height: m.d, borderRadius: m.d / 2 }]} />
        ))}
        <View style={[styles.pileBase, { top: PILE_H * 0.6 }]} />
      </Animated.View>
    </View>
  );
}

/**
 * 화면 전체에 비나 눈이 내린다. 알갱이마다 속도·크기·시작 높이가 다르고 떨어질 때마다 자리를 새로 뽑아
 * 고르게 흩뿌려진다. 눈은 바닥에 소복이 쌓인다. 모든 알갱이가 프레임 시계 하나를 같이 쓴다.
 * 동작 줄이기 설정이면 멈춘 채로 두고 눈 더미는 다 쌓인 모습으로 보인다.
 */
export function Precipitation({ kind, width, height }: { kind: PrecipitationKind; width: number; height: number }) {
  // ponytail: 크기가 바뀌어도 처음 만든 알갱이를 그대로 쓴다. 화면 회전을 지원하면 다시 만들 것.
  const [particles] = useState(() => makeParticles(kind, width, height));
  const reduceMotion = useReducedMotion();
  const time = useSharedValue(0);
  useFrameCallback((frame) => {
    time.value = frame.timeSinceFirstFrame;
  }, !reduceMotion);
  const Piece = kind === 'rain' ? RainDrop : SnowFlake;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((q, i) => (
        <Piece key={i} q={q} time={time} width={width} height={height} />
      ))}
      {kind === 'snow' ? <SnowPile time={time} width={width} height={height} grown={reduceMotion} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', left: 0, top: 0, width: 1.5, borderRadius: 1, backgroundColor: RAIN_COLOR },
  splash: { position: 'absolute', left: 0, top: 0, width: 12, height: 4, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 12, height: 4, borderRadius: 6, borderWidth: 1, borderColor: RAIN_COLOR },
  splashDot: { position: 'absolute', top: -1, width: 2, height: 2, borderRadius: 1, backgroundColor: RAIN_COLOR },
  flake: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FFFFFF', opacity: 0.85 },
  puff: { position: 'absolute', backgroundColor: '#FFFFFF' },
  pile: { position: 'absolute', left: 0, overflow: 'hidden' },
  pileBase: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' },
});
