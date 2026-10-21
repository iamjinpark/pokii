import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { backgroundImage } from '@/utils/sky';
import type { Weather } from '@/utils/weather';

type Kind = 'rain' | 'snow' | 'wind' | 'petal' | 'leaf' | 'firefly';

/** 시안 main-rainy-*의 빗줄기: 옅은 파랑, 오른쪽 위에서 왼쪽 아래로 비스듬히. */
const RAIN_COLOR = '#A9C4E8';
const SLANT = 0.35;
/** 한 번 떨어지는 동안 떨어지는 몫. 나머지는 바닥에서 톡 튀는 시간이다. */
const FALL = 0.88;

const PETAL = '#F7C6D3';
const FALL_LEAVES = ['#E08A3C', '#C9652E', '#D9A441', '#9C5A2E'];

/**
 * density는 화면 넓이 1만 dp²당 개수, ms는 한 번 지나가는 시간 범위(반딧불은 깜빡임 주기), size는 크기 범위(dp).
 */
const LOOK: Record<Kind, { density: number; ms: [number, number]; size: [number, number] }> = {
  rain: { density: 4.5, ms: [900, 1600], size: [10, 20] },
  snow: { density: 2.2, ms: [8000, 13000], size: [5, 9] },
  wind: { density: 0.25, ms: [2600, 4200], size: [8, 14] },
  petal: { density: 1, ms: [7000, 11000], size: [6, 9] },
  leaf: { density: 0.6, ms: [7000, 10000], size: [8, 12] },
  firefly: { density: 0.5, ms: [3000, 6000], size: [3, 3] },
};

type Particle = { seed: number; ms: number; offset: number; size: number; splash: boolean; tone: number };

function makeParticles(kind: Kind, width: number, height: number): Particle[] {
  const { density, ms, size } = LOOK[kind];
  const n = Math.round(((width * height) / 10000) * density);
  return Array.from({ length: n }, (_, i) => ({
    seed: i * 12.9898,
    ms: ms[0] + Math.random() * (ms[1] - ms[0]),
    // 처음부터 저마다 다른 자리에 있어야 한꺼번에 쏟아지지 않는다.
    offset: Math.random(),
    size: size[0] + Math.random() * (size[1] - size[0]),
    // 전부 튀면 바닥이 요란해서 일부는 그냥 사라진다.
    splash: Math.random() < 0.8,
    tone: Math.random(),
  }));
}

/** 0~1 의사 난수. 같은 입력이면 같은 값이라 UI 스레드에서 매 프레임 불러도 된다. */
function hash(n: number) {
  'worklet';
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 한 알갱이가 지금 몇 번째로 지나가는 중이고(cycle) 얼마나 왔는지(p).
 * 지나갈 때마다 자리를 새로 뽑아 같은 줄로만 내리지 않게 한다.
 */
function progress(time: number, q: Particle, span: number) {
  'worklet';
  const phase = time / q.ms + q.offset;
  const cycle = Math.floor(phase);
  return { p: phase - cycle, x: hash(q.seed + cycle * 7.13) * span };
}

type PieceProps = { q: Particle; time: SharedValue<number>; width: number; height: number };

function RainDrop({ q, time, width, height }: PieceProps) {
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
    transform: [{ translateX: side * 8 * t }, { translateY: -9 * Math.sin(Math.PI * t) }],
  };
}

/** 눈송이: 천천히 내려오며 좌우로 살랑인다. */
function SnowFlake({ q, time, width, height }: PieceProps) {
  const style = useAnimatedStyle(() => {
    const { p, x } = progress(time.value, q, width);
    const sway = Math.sin(p * Math.PI * 3 + q.seed) * 16;
    return { transform: [{ translateX: x + sway }, { translateY: -q.size + p * (height + q.size * 2) }] };
  });
  return <Animated.View style={[styles.flake, { width: q.size, height: q.size, borderRadius: q.size / 2 }, style]} />;
}

/** 잎 모양: 마주 보는 두 모서리만 둥글린 사각형. */
const leafShape = (size: number, color: string) => ({
  width: size,
  height: size,
  borderTopLeftRadius: size,
  borderBottomRightRadius: size,
  backgroundColor: color,
});

/** 바람 줄기가 한 번 지나가는 동안 보이는 몫. 나머지는 쉬어서 훅, 훅 끊어 분다. */
const GUST = 0.35;

/** 바람: 끝이 말린 흰 줄기가 왼쪽에서 오른쪽으로 훅 스쳐 지나가고 잠시 쉰다. */
function WindGust({ q, time, width, height }: PieceProps) {
  const length = q.size * 6;
  const style = useAnimatedStyle(() => {
    const { p, x: y } = progress(time.value, q, height * 0.7);
    const t = Math.min(1, p / GUST);
    return {
      opacity: p < GUST ? 0.75 * Math.sin(Math.PI * t) : 0,
      transform: [{ translateX: -length + t * (width + length) }, { translateY: y }],
    };
  });
  return (
    <Animated.View style={[styles.gust, style]}>
      <View style={[styles.gustLine, { width: length }]} />
      <View style={styles.gustCurl} />
    </Animated.View>
  );
}

/**
 * 바람 부는 날 덤불이 밑동을 축으로 기울어지는 각도(deg). 느린 흔들림에 짧은 돌풍을 얹는다.
 * 바람이 아니거나 동작 줄이기 설정이면 0이다.
 */
export function useWindSway(active: boolean): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const sway = useSharedValue(0);
  useFrameCallback((frame) => {
    const t = frame.timeSinceFirstFrame / 1000;
    sway.value = Math.sin(t * 1.9) * 0.8 + Math.sin(t * 5.3) * 0.3;
  }, active && !reduceMotion);
  return sway;
}

/** 벚꽃: 꽃잎이 뒤집히듯 납작해졌다 펴지며 왼쪽 아래로 팔랑인다. */
function Petal({ q, time, width, height }: PieceProps) {
  const style = useAnimatedStyle(() => {
    const { p, x } = progress(time.value, q, width + 80);
    return {
      transform: [
        { translateX: x - p * 80 + Math.sin(p * Math.PI * 4 + q.seed) * 10 },
        { translateY: -q.size + p * (height + q.size * 2) },
        { rotate: `${q.seed * 40 + p * 360}deg` },
        { scaleY: 0.4 + 0.6 * Math.abs(Math.sin(p * Math.PI * 6 + q.seed)) },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.piece, { width: q.size, height: q.size, borderRadius: q.size / 2, borderTopLeftRadius: 0, backgroundColor: PETAL }, style]}
    />
  );
}

/** 낙엽: 좌우로 크게 흔들리며 빙글 돌아 떨어진다. */
function FallLeaf({ q, time, width, height }: PieceProps) {
  const style = useAnimatedStyle(() => {
    const { p, x } = progress(time.value, q, width);
    const swing = Math.sin(p * Math.PI * 3 + q.seed);
    return {
      transform: [
        { translateX: x + swing * 24 },
        { translateY: -q.size + p * (height + q.size * 2) },
        { rotate: `${swing * 70 + p * 180}deg` },
      ],
    };
  });
  const color = FALL_LEAVES[Math.floor(q.tone * FALL_LEAVES.length)];
  return <Animated.View style={[styles.piece, leafShape(q.size, color), style]} />;
}

/** 반딧불: 덤불 근처를 제자리에서 둥실 떠다니며 천천히 깜빡인다. */
function Firefly({ q, time, width, height }: PieceProps) {
  const bx = hash(q.seed) * width;
  const by = (0.3 + 0.65 * hash(q.seed + 1)) * height;
  const style = useAnimatedStyle(() => {
    const t = time.value / q.ms + q.offset;
    return {
      opacity: 0.2 + 0.8 * Math.max(0, Math.sin(t * Math.PI * 2 + q.seed)),
      transform: [
        { translateX: bx + Math.sin(t * Math.PI * 0.6 + q.seed) * 24 },
        { translateY: by + Math.cos(t * Math.PI * 0.8 + q.seed) * 16 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.firefly, style]}>
      <View style={styles.fireflyHalo} />
      <View style={styles.fireflyDot} />
    </Animated.View>
  );
}

const PIECE: Record<Kind, (props: PieceProps) => React.JSX.Element> = {
  rain: RainDrop,
  snow: SnowFlake,
  wind: WindGust,
  petal: Petal,
  leaf: FallLeaf,
  firefly: Firefly,
};

/** 바닥 눈 더미가 다 쌓이기까지 걸리는 시간과 최대 높이(dp). */
const PILE_MS = 30000;
const PILE_H = 14;

/** 바닥에 쌓이는 눈 더미. 크기가 다른 동그라미를 이어 붙여 위쪽이 울퉁불퉁하고, 눈이 내리는 동안 천천히 올라온다. */
function SnowPile({ time, width, height, grown }: { time: SharedValue<number>; width: number; height: number; grown: boolean }) {
  const [mounds] = useState(() => {
    const out: { x: number; d: number }[] = [];
    for (let x = -10; x < width + 10; x += 10 + Math.random() * 8) out.push({ x, d: 14 + Math.random() * 10 });
    return out;
  });
  const rise = useAnimatedStyle(() => {
    // 처음 몇 초에 빠르게 쌓이고 점점 느려진다 (제곱근). 내리자마자 바닥이 하얘진다.
    const g = grown ? 1 : Math.sqrt(Math.min(1, time.value / PILE_MS));
    return { transform: [{ translateY: (1 - g) * PILE_H }] };
  });
  // 화면 밖으로 삐져나가지 않게 바깥 칸에서 자르고, 안쪽을 아래에서 밀어 올린다.
  return (
    <View style={[styles.pile, { top: height - PILE_H, width, height: PILE_H }]}>
      <Animated.View style={[StyleSheet.absoluteFill, rise]}>
        {mounds.map((m, i) => (
          <View key={i} style={[styles.mound, { left: m.x - m.d / 2, top: PILE_H - m.d * 0.55, width: m.d, height: m.d, borderRadius: m.d / 2 }]} />
        ))}
        <View style={[styles.pileBase, { top: PILE_H * 0.6 }]} />
      </Animated.View>
    </View>
  );
}

/**
 * 알갱이가 내리거나 날아다니는 날씨. 알갱이마다 속도·크기·시작이 다르고 지나갈 때마다 자리를 새로 뽑아
 * 고르게 흩뿌려진다. 모든 알갱이가 프레임 시계 하나를 같이 쓴다.
 * 동작 줄이기 설정이면 멈춘 채로 두고 눈 더미는 다 쌓인 모습으로 보인다.
 */
function Particles({ kind, width, height }: { kind: Kind; width: number; height: number }) {
  // ponytail: 크기가 바뀌어도 처음 만든 알갱이를 그대로 쓴다. 화면 회전을 지원하면 다시 만들 것.
  const [particles] = useState(() => makeParticles(kind, width, height));
  const reduceMotion = useReducedMotion();
  const time = useSharedValue(0);
  useFrameCallback((frame) => {
    time.value = frame.timeSinceFirstFrame;
  }, !reduceMotion);
  const Piece = PIECE[kind];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((q, i) => (
        <Piece key={i} q={q} time={time} width={width} height={height} />
      ))}
      {kind === 'snow' ? <SnowPile time={time} width={width} height={height} grown={reduceMotion} /> : null}
    </View>
  );
}

/** 안개: 화면 아래쪽부터 뿌옇게 덮는다. 밤에는 푸르스름하게 옅게. */
function Fog({ night }: { night: boolean }) {
  const c = night ? '200, 210, 225' : '255, 255, 255';
  const a = night ? 0.3 : 0.55;
  return (
    <View
      style={[StyleSheet.absoluteFill, backgroundImage(`linear-gradient(180deg, rgba(${c}, 0) 25%, rgba(${c}, ${a}) 100%)`)]}
      pointerEvents="none"
    />
  );
}

/**
 * 날씨에 따라 화면 위에 얹는 효과 (스펙 8.6). 흐림·맑음은 하늘색만 바뀌어 얹을 것이 없고,
 * 반딧불은 밤에만 뜬다. 터치는 아래로 흘려보낸다.
 */
export function WeatherLayer({ weather, night, width, height }: { weather: Weather; night: boolean; width: number; height: number }) {
  if (weather === 'fog') return <Fog night={night} />;
  if (weather === 'clear' || weather === 'cloudy') return null;
  if (weather === 'firefly' && !night) return null;
  return <Particles key={weather} kind={weather} width={width} height={height} />;
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', left: 0, top: 0, width: 1.5, borderRadius: 1, backgroundColor: RAIN_COLOR },
  splash: { position: 'absolute', left: 0, top: 0, width: 12, height: 4, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 12, height: 4, borderRadius: 6, borderWidth: 1, borderColor: RAIN_COLOR },
  splashDot: { position: 'absolute', top: -1, width: 2, height: 2, borderRadius: 1, backgroundColor: RAIN_COLOR },
  flake: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FFFFFF', opacity: 0.85 },
  piece: { position: 'absolute', left: 0, top: 0, opacity: 0.9 },
  gust: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'flex-start' },
  gustLine: { height: 2, marginTop: 8, borderRadius: 1, backgroundColor: '#FFFFFF' },
  gustCurl: {
    width: 10, height: 10, marginLeft: -2, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#FFFFFF',
    borderTopRightRadius: 5, borderBottomRightRadius: 5, transform: [{ translateY: -0.5 }],
  },
  firefly: { position: 'absolute', left: -6, top: -6, width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  fireflyHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255, 236, 140, 0.25)' },
  fireflyDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFF4AA' },
  mound: { position: 'absolute', backgroundColor: '#FFFFFF' },
  pile: { position: 'absolute', left: 0, overflow: 'hidden' },
  pileBase: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' },
});
