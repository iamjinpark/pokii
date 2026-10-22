import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_HEIGHT, TAB_BAR_HEIGHT } from '@/components/app-header';
import { Text } from '@/components/text';
import { BirdScene } from '@/components/tree-bird';
import { BunchBubble } from '@/components/bunch-bubble';
import { BUNCH_H, BUNCH_W, TreeBunch } from '@/components/tree-bunch';
import type { Goal } from '@/hooks/use-goals';
import { SLOTS, useGoals } from '@/hooks/use-goals';
import { useSession } from '@/hooks/use-session';
import { isBunchEnded, treeSignals } from '@/utils/bunch';
import { useToday } from '@/hooks/use-today';
import { noticeKeyFor } from '@/utils/bird';
import { setDevSkyMinutes, skyAt, skyBackground, skyTimeFor } from '@/utils/sky';
import { setDevWeather, type Weather, weatherNow } from '@/utils/weather';
import { SnowCap, useWindSway, WeatherLayer } from '@/components/weather-layer';
import { STAGE_H, STAGE_W, stageScale } from '@/utils/stage';
import { t } from '@/i18n';
import { fontSize, radius, space, theme } from '@/theme';


/**
 * 아래 좌표는 모두 Figma main-morning(393×853)의 값이다. 헤더(77)와 하단 탭(77) 사이를 원점으로 옮겼고,
 * 무대 전체를 화면에 맞춰 같은 비율로 키우고 줄인다 (stageScale). 덤불·송이는 헤더 바로 아래 왼쪽에,
 * 구름은 덤불과 함께, 해·달·별은 화면 폭에 비례해 위에, 문구·새는 오른쪽 아래에 붙인다. 시안보다 긴 화면에서는 줄기가 늘어난다.
 */
/**
 * 팻말 자리를 내려고 송이를 시안보다 줄인다. 자리 중심은 시안 그대로다.
 * 알 크기·간격은 상세 화면과 함께 쓰는 값(tree-bunch)이라 여기서는 송이 전체 배율만 바꾼다.
 */
const BUNCH_ZOOM = 0.87;

/** 송이 자리 위쪽 끝(줄기 꼭대기)까지의 거리. 자리를 BUNCH_ZOOM으로 줄여 위가 조금 내려온다. 말풍선 꼬리가 잎 꼭대기 바로 위에 오도록 18만큼 더 내린다. */
const BUBBLE_DROP = (BUNCH_H * (1 - BUNCH_ZOOM)) / 2 + 18;

const SLOT_AT: Record<1 | 2 | 3, { left: number; top: number }> = {
  2: { left: 43, top: 74 },
  1: { left: 165, top: 188 },
  3: { left: 43, top: 361 },
};

const SUN = {
  morning: require('../../assets/tree/sun-morning.svg'),
  afternoon: require('../../assets/tree/sun-afternoon.svg'),
};
/** 종이 오리기 구름 3종. 낮에는 연노랑 하늘에서 보이도록 노란 종이 버전을 쓴다. */
const CLOUDS = {
  morning: [
    require('../../assets/tree/cloud-morning-a.svg'),
    require('../../assets/tree/cloud-morning-b.svg'),
    require('../../assets/tree/cloud-morning-c.svg'),
  ],
  afternoon: [
    require('../../assets/tree/cloud-afternoon-a.svg'),
    require('../../assets/tree/cloud-afternoon-b.svg'),
    require('../../assets/tree/cloud-afternoon-c.svg'),
  ],
};
/** 구름 3종의 크기(무대 단위). 이 중 2개를 골라 쓴다. */
const CLOUD_SIZE = [
  { width: 120, height: 47 },
  { width: 86, height: 40 },
  { width: 100, height: 41 },
];
/**
 * 구름 두 자리: 맨 위(덤불 가장자리에 걸침)와 새 위쪽. 새 위쪽 구름은 화면 오른쪽 벽에 붙어 폭의 38%가
 * 밖으로 잘리고 왼쪽 모양만 보인다. 좌우로 흔들려도 오른쪽 끝이 드러나지 않을 만큼 잘라 둔다.
 */
const CLOUD_SPOTS = [
  (w: number) => ({ left: 165, top: 36, width: w }),
  (w: number) => ({ left: STAGE_W - w * 0.62, top: 165, width: w }),
];

/** 구름 3종 중 서로 다른 2종을 무작위로 고른다. */
function pickClouds(): [number, number] {
  const first = Math.floor(Math.random() * 3);
  return [first, (first + 1 + Math.floor(Math.random() * 2)) % 3];
}

/** 흐린 날 구름 색. 우중충한 하늘보다 한 톤 어둡게 둬 구름이 묻히지 않게 한다. */
const CLOUDY_CLOUD = '#A4AAB1';

/** 흐린 날 해 앞을 가리는 구름 자리 (하늘 무대 좌표). 해(left 311, top -17)의 아래 왼쪽에 걸친다. */
const SUN_CLOUD = { left: 280, top: 50, width: 150 };

const STARS = [
  { left: 235, top: 34 },
  { left: 372, top: 41 },
  { left: 353, top: 169 },
];

/** 구름이 제자리에서 좌우로 천천히 오간다. 두 구름의 폭·주기를 달리해 같이 움직여 보이지 않게 한다. */
function DriftingCloud({
  source,
  style,
  drift,
  ms,
  tint,
}: {
  source: number;
  style: object;
  drift: number;
  ms: number;
  tint?: string;
}) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(drift, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(x);
  }, [x, drift, ms]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[styles.cloud, style, move]}>
      <Image source={source} style={styles.cloudImage} tintColor={tint} />
    </Animated.View>
  );
}

/** OAuth 프로필의 이름 첫 단어. Google은 full_name, Kakao는 name/nickname에 담긴다. */
function firstName(meta: Record<string, unknown> | undefined): string | null {
  const raw = meta?.full_name ?? meta?.name ?? meta?.nickname;
  return typeof raw === 'string' && raw.trim() ? raw.trim().split(/\s+/)[0] : null;
}

/** 젖은 덤불: 덤불 위에 이 색을 옅게 한 겹 더 칠한다. */
const WET_TINT = '#001914';

/**
 * 눈이 얹히는 덤불 가장자리: [x, y, 위를 향한 정도]. bush.svg 윤곽에서 바깥 법선이 위를 향하는 점을
 * 약 9 간격으로 뽑아 무대 좌표로 옮겼다 (덤불 left -1, top -15). 덤불 그림이 바뀌면 다시 뽑는다.
 */
const BUSH_SNOW = [
  [320.1, 184.9, 0.36], [315.8, 175.5, 0.47], [310.2, 166.9, 0.58], [304.2, 158.8, 0.64], [296.7, 151.4, 0.77],
  [286.9, 144.8, 0.89], [278.0, 140.6, 0.91], [268.6, 136.6, 0.93], [258.5, 133.0, 0.95], [247.7, 129.5, 0.96],
  [236.2, 126.2, 0.96], [224.0, 123.1, 0.97], [207.9, 48.1, 0.35], [203.2, 38.7, 0.54], [197.2, 31.6, 0.75],
  [190.2, 24.7, 0.71], [182.9, 18.1, 0.77], [174.5, 11.7, 0.82], [166.2, 6.4, 0.86],
] as const;

/** 비·눈 오는 날 흐려진 해·달 (시안 main-rainy-*). */
const WET_SUN = '#B2B2B2';
const WET_MOON = '#4F5A66';
/** 개발 빌드 날씨 버튼이 차례로 보여 주는 날씨. */
const DEV_WEATHERS: Weather[] = ['clear', 'rain', 'snow', 'cloudy', 'wind', 'petal', 'leaf', 'firefly'];
const DEV_WEATHER_LABEL: Record<Weather, string> = {
  clear: '맑음', rain: '비', snow: '눈', cloudy: '흐림', wind: '바람', petal: '벚꽃', leaf: '낙엽', firefly: '반딧불',
};

const DEV_BAR_W = 240;
const barMinutes = (x: number) =>
  Math.round(Math.min(1439, Math.max(0, (x / DEV_BAR_W) * 1440)) / 5) * 5;
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function TreeScreen() {
  const { data: goals, isLoading, isError, refetch } = useGoals();
  const { session } = useSession();
  const router = useRouter();
  const today = useToday();
  // 개발 빌드에서 시각을 바꿔 보는 버튼의 값. null이면 지금 시각.
  const [devMinutes, setDevMinutesState] = useState<number | null>(null);
  // 고른 시각을 다른 화면도 쓰게 sky 모듈에도 적는다.
  const setDevMinutes = (m: number | null) => {
    setDevSkyMinutes(m);
    setDevMinutesState(m);
  };
  // ponytail: 렌더 시점 시각. 화면을 띄워둔 채 시간이 흘러도 다음 렌더(포커스·refetch)까지 하늘이 그대로다.
  const now = new Date();
  const minutes = devMinutes ?? now.getHours() * 60 + now.getMinutes();
  const time = skyTimeFor(Math.floor(minutes / 60));
  // 개발 빌드에서 고른 날씨. null이면 오늘 날짜의 포키 날씨.
  const [devWeather, setDevWeatherState] = useState<Weather | null>(null);
  const cycleDevWeather = () => {
    const next = DEV_WEATHERS[(DEV_WEATHERS.indexOf(weatherNow(today)) + 1) % DEV_WEATHERS.length];
    setDevWeather(next);
    setDevWeatherState(next);
  };
  const weather = devWeather ?? weatherNow(today);
  // 비·눈 오는 날: 해·달이 흐려지고 구름·별이 숨는다. 흐린 밤에도 별은 숨는다.
  const wet = weather === 'rain' || weather === 'snow';
  const starless = wet || weather === 'cloudy';
  // 흐린 날은 구름도 회색이다.
  const cloudTint = weather === 'cloudy' ? CLOUDY_CLOUD : undefined;
  // 바람 부는 날은 구름이 더 크게, 빨리 오간다.
  const gust = weather === 'wind' ? 3 : 1;
  const sky = skyAt(minutes, weather);
  const skyBg = skyBackground(sky, 0.5);
  // 화면을 열 때마다 구름 2종을 새로 고르고, 화면이 떠 있는 동안은 그대로 둔다.
  const [clouds] = useState(pickClouds);
  // 송이를 누르면 그 송이 위에 목표 제목 말풍선을 띄운다 (스펙 7.1). 말풍선을 누르면 상세·결과 화면에 간다.
  const [bubbleGoal, setBubbleGoal] = useState<Goal | null>(null);
  /** 고르지 않은 나머지 구름 한 종. 흐린 날 해 앞에 건다. */
  const spare = 3 - clouds[0] - clouds[1];

  const byPosition = new Map((goals ?? []).map((g) => [g.position as number, g]));
  const full = byPosition.size === SLOTS.length;
  // onLayout은 웹에서 첫 값이 0이거나 크기가 바뀌어도 다시 오지 않는 경우가 있어(빈 화면·고정 크기)
  // 창 크기에서 헤더·하단 탭을 뺀 값으로 계산한다. 창 크기는 바뀔 때마다 다시 렌더된다.
  const win = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const area = {
    width: win.width,
    height: win.height - top - HEADER_HEIGHT - bottom - TAB_BAR_HEIGHT,
  };
  const scale = stageScale(area.width, area.height);
  // 바람 부는 날 덤불과 송이가 밑동(무대 아래 끝)을 축으로 기운다. 낙엽 지는 날은 아주 약하게.
  const sway = useWindSway(weather === 'wind' ? 1 : weather === 'leaf' ? 0.3 : 0);
  const groundSway = useAnimatedStyle(() => ({
    transform: [{ scale }, { translateY: STAGE_H }, { skewX: `${sway.value}deg` }, { translateY: -STAGE_H }],
  }));
  // 하늘은 세로로 맞출 것이 없어 폭만 따른다. 해·달·별의 위치와 크기가 화면 폭에 비례한다.
  const skyScale = area.width / STAGE_W;

  if (isLoading) {
    return (
      <View style={[styles.center, skyBg]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, skyBg]}>
        <Text style={[styles.body, { color: sky.text }]}>{t('common.error.network')}</Text>
        <Pressable onPress={() => refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const allEmpty = byPosition.size === 0;
  const needsToday = (goals ?? []).some((g) => {
    const filled = new Set(g.bunch.grapes.map((x) => x.grapeDate));
    return treeSignals({ startedOn: g.bunch.startedOn, today, filled }).needsToday;
  });
  // 문구의 {name} 자리는 공백까지 포함한다. 이름이 없으면 'hello!'가 된다.
  const name = firstName(session?.user.user_metadata);
  const params = { name: name ? ` ${name}` : '' };
  const [greeting, line] = allEmpty
    ? [t('tree.greeting', params), t('tree.empty')]
    : needsToday
      ? [t('tree.greeting', params), t('tree.collect')]
      : [t('tree.greeting.done', params), t('tree.collected')];

  // 새가 머무는 자리: 오른쪽 무대(아래 오른쪽 기준)의 (right 18, top 270)을 화면 좌표로 옮긴 곳.
  // 가운데 송이 팻말(약 220~248) 아래라, 위로 노닐어도(WANDER.up 26) 팻말과 겹치지 않는다.
  const perch = {
    x: area.width - (18 + 60) * scale,
    y: area.height - (STAGE_H - 270) * scale,
  };
  const treeBody = (
    <>
            <Animated.View style={[styles.ground, groundSway]}>
              {/* 구름은 덤불에 걸쳐 있어야 해서 하늘이 아니라 덤불과 같은 무대에, 덤불 뒤에 둔다. */}
              {time === 'night' || wet ? null : (
                <>
                  {clouds.map((c, i) => (
                    <DriftingCloud
                      key={i}
                      source={CLOUDS[time][c]}
                      style={{ ...CLOUD_SPOTS[i](CLOUD_SIZE[c].width), height: CLOUD_SIZE[c].height }}
                      drift={(i === 0 ? 10 : -8) * gust}
                      ms={(i === 0 ? 7000 : 9000) / gust}
                      tint={cloudTint}
                    />
                  ))}
                </>
              )}
              <Image source={require('../../assets/tree/bush.svg')} style={styles.bush} />
              {/* 비 오는 날은 덤불이 한 톤 짙어져 젖어 보인다. */}
              {weather === 'rain' ? (
                <Image source={require('../../assets/tree/bush.svg')} style={[styles.bush, styles.wet]} tintColor={WET_TINT} />
              ) : null}
              {weather === 'snow' ? <SnowCap key={weather} points={BUSH_SNOW} /> : null}
              {/* 말풍선이 떠 있을 때 송이가 아닌 곳을 누르면 닫는다. 송이보다 아래에 깔아 다른 송이는 그대로 눌린다. */}
              {bubbleGoal ? <Pressable style={StyleSheet.absoluteFill} onPress={() => setBubbleGoal(null)} accessibilityLabel={t('bubble.close')} /> : null}
              {SLOTS.map((slot) => {
                const goal = byPosition.get(slot);
                return (
                  <View key={slot} style={[styles.slot, SLOT_AT[slot]]}>
                    {goal ? (
                      <TreeBunch
                        goal={goal}
                        today={today}
                        onPress={() => setBubbleGoal(goal)}
                      />
                    ) : (
                      <Pressable
                        style={styles.empty}
                        accessibilityLabel={`빈 가지 ${slot}`}
                        onPress={() => router.push('/goal/new')}
                      >
                        <Text style={styles.plus}>+</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
              {bubbleGoal ? (
                <BunchBubble
                  key={bubbleGoal.id}
                  title={bubbleGoal.title}
                  x={SLOT_AT[bubbleGoal.position].left + BUNCH_W / 2}
                  y={SLOT_AT[bubbleGoal.position].top + BUBBLE_DROP}
                  onPress={() => {
                    const goal = bubbleGoal;
                    setBubbleGoal(null);
                    // 끝난 송이는 결과 화면으로 간다. 거기서만 끝내기·한 송이 더를 고를 수
                    // 있고, 그러지 않으면 그 가지가 영영 막힌다 (설계 7.1).
                    router.push(
                      isBunchEnded({ ...goal.bunch, today })
                        ? { pathname: '/goal/[id]/done', params: { id: goal.id } }
                        : { pathname: '/goal/[id]', params: { id: goal.id } },
                    );
                  }}
                />
              ) : null}
            </Animated.View>

            {/* 덤불 위로 겹치므로 빈 곳 터치는 아래 송이로 흘려보낸다. */}
            <View style={[styles.right, { transform: [{ scale }] }]}>

              <View style={styles.message}>
                <Text display style={[styles.line, { color: sky.text }]}>{greeting}</Text>
                <Text display style={[styles.line, { color: sky.text }]}>{line}</Text>
              </View>
            </View>
    </>
  );

  return (
    <View style={[styles.root, skyBg]}>
      {scale > 0 ? (
        <>
          <View style={[styles.sky, { transform: [{ scale: skyScale }] }]}>
            {time === 'night' ? (
              <>
                {/* 비 오는 밤은 흐린 달만 (시안 main-rainy-night). */}
                <Image
                  source={require('../../assets/tree/moon.svg')}
                  style={[styles.moon, weather === 'cloudy' && styles.hazyMoon]}
                  tintColor={wet ? WET_MOON : undefined}
                />
                {starless ? null : STARS.map((p, i) => (
                  <Image key={i} source={require('../../assets/tree/star.svg')} style={[styles.star, p]} />
                ))}
              </>
            ) : (
              <>
                <Image source={SUN[time]} style={styles.sun} tintColor={wet ? WET_SUN : undefined} />
                {/* 흐린 낮: 남은 구름 한 장이 해 앞을 가린다. */}
                {weather === 'cloudy' ? (
                  <DriftingCloud
                    source={CLOUDS[time][spare]}
                    style={{ ...SUN_CLOUD, height: (SUN_CLOUD.width * CLOUD_SIZE[spare].height) / CLOUD_SIZE[spare].width }}
                    drift={-6}
                    ms={8000}
                    tint={cloudTint}
                  />
                ) : null}
              </>
            )}
          </View>

          <BirdScene
            area={area}
            perch={perch}
            scale={scale}
            noticeKey={full ? noticeKeyFor((goals ?? []).map((g) => g.id)) : null}
            today={today}
          >
            {treeBody}
          </BirdScene>
          <WeatherLayer weather={weather} night={sky.dark} width={area.width} height={area.height} />
        </>
      ) : null}
      {/* 개발 빌드 전용: 막대를 눌러 끌면 하늘 시각이 바뀌고, 글자를 누르면 지금으로 돌아간다. */}
      {__DEV__ ? (
        <View style={styles.devSky}>
          <View style={styles.devRow}>
            <Pressable onPress={() => setDevMinutes(null)}>
              <Text style={styles.devSkyLabel}>
                {devMinutes === null ? '하늘: 지금' : `하늘: ${hhmm(devMinutes)} (지금으로)`}
              </Text>
            </Pressable>
            <Pressable onPress={cycleDevWeather}>
              <Text style={styles.devSkyLabel}>{DEV_WEATHER_LABEL[weather]}</Text>
            </Pressable>
          </View>
          <View
            style={styles.devBar}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => setDevMinutes(barMinutes(e.nativeEvent.locationX))}
            onResponderMove={(e) => setDevMinutes(barMinutes(e.nativeEvent.locationX))}
          >
            <View
              pointerEvents="none"
              style={[styles.devKnob, { left: ((devMinutes ?? minutes) / 1440) * DEV_BAR_W - 8 }]}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  body: { fontSize: fontSize.sm, fontWeight: '600' },
  sky: {
    position: 'absolute', top: 0, right: 0, width: STAGE_W, height: 260,
    transformOrigin: 'top right',
  },
  /** 시안(153×145)보다 작게, 오른쪽 위 모서리에 걸쳐 구름과 떨어지게 둔다. */
  sun: { position: 'absolute', left: 311, top: -17, width: 132, height: 125 },
  cloud: { position: 'absolute' },
  cloudImage: { width: '100%', height: '100%' },
  hazyMoon: { opacity: 0.55 },
  moon: { position: 'absolute', left: 289, top: 13, width: 96, height: 114 },
  star: { position: 'absolute', width: 13, height: 15 },
  ground: {
    position: 'absolute', top: 0, left: 0, width: STAGE_W, height: STAGE_H,
    transformOrigin: 'top left',
  },
  right: {
    position: 'absolute', bottom: 0, right: 0, width: STAGE_W, height: STAGE_H,
    transformOrigin: 'bottom right',
    pointerEvents: 'box-none',
  },
  /**
   * 덤불 한 장. 시안(x 0~336, 높이 725)보다 왼쪽으로 90, 줄기를 아래로 1100까지 늘려 그려 두었다.
   * 바람에 기울어도 왼쪽이 비지 않고, 시안보다 긴 화면에서도 줄기가 화면 끝까지 이어진다. 겹쳐 덧대지 않아 무늬가 끊기지 않는다.
   */
  bush: { position: 'absolute', left: -91, top: -15, width: 426, height: 1100 },
  wet: { opacity: 0.28 },
  slot: {
    position: 'absolute', width: BUNCH_W, height: BUNCH_H, justifyContent: 'center',
    transform: [{ scale: BUNCH_ZOOM }],
  },
  empty: {
    alignSelf: 'center', width: 76, height: 76, borderRadius: radius.round,
    borderWidth: 2.5, borderStyle: 'dashed', borderColor: theme.sky,
    alignItems: 'center', justifyContent: 'center',
  },
  plus: { fontSize: fontSize.xl, fontWeight: '800', color: theme.sky },
  message: { position: 'absolute', right: 15, top: 606 },
  line: { fontSize: fontSize.xl },
  retry: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.round, backgroundColor: theme.ink },
  retryLabel: { color: theme.paper, fontWeight: '700' },
  devSky: {
    position: 'absolute', top: 8, alignSelf: 'center', alignItems: 'center', gap: space.sm,
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: 'rgba(0,0,0,0.45)',
  },
  devSkyLabel: { color: theme.paper, fontSize: fontSize.xs, fontWeight: '700' },
  devRow: { flexDirection: 'row', gap: space.md },
  devBar: {
    width: DEV_BAR_W, height: 24, justifyContent: 'center',
    borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  devKnob: { position: 'absolute', width: 16, height: 16, borderRadius: radius.round, backgroundColor: theme.paper },
});
