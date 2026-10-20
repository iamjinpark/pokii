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
  Image as RNImage,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_HEIGHT, TAB_BAR_HEIGHT } from '@/components/app-header';
import { Text } from '@/components/text';
import { BirdScene } from '@/components/tree-bird';
import { BUNCH_H, BUNCH_W, TreeBunch } from '@/components/tree-bunch';
import { SLOTS, useGoals } from '@/hooks/use-goals';
import { useSession } from '@/hooks/use-session';
import { isBunchEnded, treeSignals } from '@/utils/bunch';
import { useToday } from '@/hooks/use-today';
import { noticeKeyFor } from '@/utils/bird';
import { skyTimeFor } from '@/utils/sky';
import { STAGE_H, STAGE_W, stageScale } from '@/utils/stage';
import { t } from '@/i18n';
import { theme } from '@/theme';


/**
 * 아래 좌표는 모두 Figma main-morning(393×853)의 값이다. 헤더(77)와 하단 탭(77) 사이를 원점으로 옮겼고,
 * 무대 전체를 화면에 맞춰 같은 비율로 키우고 줄인다 (stageScale). 덤불·송이는 헤더 바로 아래 왼쪽에,
 * 구름은 덤불과 함께, 해·달·별은 화면 폭에 비례해 위에, 문구·새는 오른쪽 아래에 붙인다. 시안보다 긴 화면에서는 줄기가 늘어난다.
 */
/** 팻말 자리를 내려고 송이를 시안보다 조금 줄인다. 자리 중심은 시안 그대로다. */
const BUNCH_ZOOM = 0.95;

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
}: {
  source: number;
  style: object;
  drift: number;
  ms: number;
}) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(drift, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(x);
  }, [x, drift, ms]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[styles.cloud, style, move]}>
      <Image source={source} style={styles.cloudImage} />
    </Animated.View>
  );
}

/** OAuth 프로필의 이름 첫 단어. Google은 full_name, Kakao는 name/nickname에 담긴다. */
function firstName(meta: Record<string, unknown> | undefined): string | null {
  const raw = meta?.full_name ?? meta?.name ?? meta?.nickname;
  return typeof raw === 'string' && raw.trim() ? raw.trim().split(/\s+/)[0] : null;
}

export default function TreeScreen() {
  const { data: goals, isLoading, isError, refetch } = useGoals();
  const { session } = useSession();
  const router = useRouter();
  const today = useToday();
  // ponytail: 렌더 시점 시각. 화면을 띄워둔 채 12·19시를 넘기면 다음 렌더(포커스·refetch)까지 하늘이 늦는다.
  const time = skyTimeFor(new Date().getHours());
  const sky = theme.skies[time];
  // 화면을 열 때마다 구름 2종을 새로 고르고, 화면이 떠 있는 동안은 그대로 둔다.
  const [clouds] = useState(pickClouds);

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
  // 하늘은 세로로 맞출 것이 없어 폭만 따른다. 해·달·별의 위치와 크기가 화면 폭에 비례한다.
  const skyScale = area.width / STAGE_W;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: sky.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: sky.bg }]}>
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
            <View style={[styles.ground, { transform: [{ scale }] }]}>
              {/* 구름은 덤불에 걸쳐 있어야 해서 하늘이 아니라 덤불과 같은 무대에, 덤불 뒤에 둔다. */}
              {time === 'night' ? null : (
                <>
                  {clouds.map((c, i) => (
                    <DriftingCloud
                      key={i}
                      source={CLOUDS[time][c]}
                      style={{ ...CLOUD_SPOTS[i](CLOUD_SIZE[c].width), height: CLOUD_SIZE[c].height }}
                      drift={i === 0 ? 10 : -8}
                      ms={i === 0 ? 7000 : 9000}
                    />
                  ))}
                </>
              )}
              <View style={styles.trunk}>
                {/* expo-image는 타일 반복이 없어 RN Image의 repeat를 쓴다. */}
                <RNImage
                  source={require('../../assets/tree/bush-texture.png')}
                  resizeMode="repeat"
                  style={styles.trunkTexture}
                />
              </View>
              <Image source={require('../../assets/tree/bush.svg')} style={styles.bush} />
              {SLOTS.map((slot) => {
                const goal = byPosition.get(slot);
                return (
                  <View key={slot} style={[styles.slot, SLOT_AT[slot]]}>
                    {goal ? (
                      <TreeBunch
                        goal={goal}
                        today={today}
                        onPress={() =>
                          // 끝난 송이는 결과 화면으로 간다. 거기서만 끝내기·한 송이 더를 고를 수
                          // 있고, 그러지 않으면 그 가지가 영영 막힌다 (설계 7.1).
                          router.push(
                            isBunchEnded({ ...goal.bunch, today })
                              ? { pathname: '/goal/[id]/done', params: { id: goal.id } }
                              : { pathname: '/goal/[id]', params: { id: goal.id } },
                          )
                        }
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
            </View>

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
    <View style={[styles.root, { backgroundColor: sky.bg }]}>
      {scale > 0 ? (
        <>
          <View style={[styles.sky, { transform: [{ scale: skyScale }] }]}>
            {time === 'night' ? (
              <>
                <Image source={require('../../assets/tree/moon.svg')} style={styles.moon} />
                {STARS.map((p, i) => (
                  <Image key={i} source={require('../../assets/tree/star.svg')} style={[styles.star, p]} />
                ))}
              </>
            ) : (
              <Image source={SUN[time]} style={styles.sun} />
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
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  body: { fontSize: 15, fontWeight: '600' },
  sky: {
    position: 'absolute', top: 0, right: 0, width: STAGE_W, height: 260,
    transformOrigin: 'top right',
  },
  /** 시안(153×145)보다 작게, 오른쪽 위 모서리에 걸쳐 구름과 떨어지게 둔다. */
  sun: { position: 'absolute', left: 311, top: -17, width: 132, height: 125 },
  cloud: { position: 'absolute' },
  cloudImage: { width: '100%', height: '100%' },
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
  /** 시안보다 긴 화면에서 덤불 줄기(svg 아래 끝, x -1~109)를 화면 끝까지 잇는다. */
  trunk: { position: 'absolute', left: -1, top: 700, width: 110, height: 2000, overflow: 'hidden' },
  /** bush.svg의 패턴은 16px 타일을 약 9.6px로 깐다. */
  trunkTexture: {
    width: 110 / 0.6, height: 2000 / 0.6, transform: [{ scale: 0.6 }], transformOrigin: 'top left',
  },
  bush: { position: 'absolute', left: -1, top: -15, width: 336, height: 725 },
  slot: {
    position: 'absolute', width: BUNCH_W, height: BUNCH_H, justifyContent: 'center',
    transform: [{ scale: BUNCH_ZOOM }],
  },
  empty: {
    alignSelf: 'center', width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderStyle: 'dashed', borderColor: theme.sky,
    alignItems: 'center', justifyContent: 'center',
  },
  plus: { fontSize: 28, fontWeight: '800', color: theme.sky },
  message: { position: 'absolute', right: 15, top: 606 },
  line: { fontSize: 26 },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
