import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BirdRig, RIG_H, RIG_W } from '@/components/bird-rig';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { theme } from '@/theme';
import { cheerKeyFor } from '@/utils/bird';
import type { IsoDate } from '@/utils/date';

/**
 * 나무의 펫 새 (스펙 7.2). 화면을 열면 오른쪽 밖에서 날아와 자리(perch)에 떠 있다.
 * 가지 3개가 다 찼고 아직 확인하지 않은 알림이 있으면 편지를 물고 오고, 누르면 "나무가 가득 찼어요" 말풍선을
 * 띄운다(notice). 한 번 확인한 알림은 기기에 기록해 다시 띄우지 않는다.
 * 그 밖에는 누를 때 하트를 띄우며 오늘의 화이팅 문구를 보여 준다(cheer). 말풍선은 누를 때만 뜬다.
 */
const SEEN_KEY = 'pokii.bird.noticeSeen';
const BUBBLE_MS = { notice: 5000, cheer: 3500 };
/** 날개를 한 번 내렸다 올리는 시간의 절반. */
const FLAP_MS = 170;
const FLY_IN_MS = 1500;
/** 자리 주변을 노니는 범위(dp, 배율 1 기준). 주로 나무 쪽(왼쪽)으로 움직여 돌아설 일이 없게 한다. */
const WANDER = { left: 46, right: 12, up: 26, down: 18 };
/** 새를 그릴 폭(dp, 배율 1 기준). */
const BIRD_W = 60;
const BIRD_H = (BIRD_W * RIG_H) / RIG_W;

type Area = { width: number; height: number };
type Point = { x: number; y: number };
type Bubble = 'notice' | 'cheer';

/** 오른쪽 밖에서 들어와 자리에 떠 있는 새. 그림은 오른쪽을 보고 있어서 좌우를 뒤집어 왼쪽(나무)을 보게 한다. */
function useBird(area: Area, perch: Point, scale: number) {
  const size = BIRD_W * scale;
  const x = useSharedValue(area.width + size);
  const y = useSharedValue(perch.y - 30 * scale);
  const flap = useSharedValue(0);
  const wave = useSharedValue(0);
  /** 0이면 나는 자세, 1이면 하트 자세. */
  const heart = useSharedValue(0);
  /** 자세를 바꿀 때의 폴짝: 1이면 웅크림(납작), -1이면 뛰어오름(길쭉), 0이면 보통. */
  const hop = useSharedValue(0);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  /** 한 번 누르면 말풍선을 보여 준 뒤 날아가 버린다. 화면을 다시 열면 다시 날아온다. */
  const [gone, setGone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** 처음에는 오른쪽 밖에서 날아 들어오고, 그 뒤로는 자리 주변을 2.5~4초마다 조금씩 옮겨 다닌다. */
  const wander = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (gone) return;
    const go = (to: Point, ms: number) => {
      x.set(withTiming(to.x, { duration: ms, easing: Easing.inOut(Easing.sin) }));
      y.set(withTiming(to.y, { duration: ms, easing: Easing.inOut(Easing.sin) }));
    };
    const next = () => {
      const ms = 2500 + Math.random() * 1500;
      go(
        {
          x: perch.x + (-WANDER.left + Math.random() * (WANDER.left + WANDER.right)) * scale,
          y: perch.y + (-WANDER.up + Math.random() * (WANDER.up + WANDER.down)) * scale,
        },
        ms,
      );
      wander.current = setTimeout(next, ms);
    };
    go({ x: perch.x, y: perch.y }, FLY_IN_MS);
    wander.current = setTimeout(next, FLY_IN_MS + 600);
    return () => clearTimeout(wander.current);
  }, [perch.x, perch.y, scale, gone, x, y]);

  useEffect(() => {
    flap.set(withRepeat(withTiming(1, { duration: FLAP_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    wave.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false));
    return () => {
      clearTimeout(timer.current);
      cancelAnimation(flap);
      cancelAnimation(wave);
      cancelAnimation(x);
      cancelAnimation(y);
    };
  }, [flap, wave, x, y]);

  // 하트 자세로 바뀔 때(그리고 돌아올 때) 날개를 접고 표정을 바꾸는 동안 웅크렸다가 폴짝 뛰어오른다.
  const hugging = bubble === 'cheer';
  const wasHugging = useRef(false);
  useEffect(() => {
    if (wasHugging.current === hugging) return;
    wasHugging.current = hugging;
    hop.set(
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(-1, { duration: 160, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 9, stiffness: 180 }),
      ),
    );
    heart.set(withDelay(80, withTiming(hugging ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.quad) })));
  }, [hugging, heart, hop]);

  /**
   * 말풍선은 자리 위에 뜨므로, 먼저 자리로 돌아와 멈춘 뒤 띄운다. 말풍선이 사라지면 바라보던 왼쪽 위로
   * 날아올라 화면 밖으로 사라진다.
   */
  const show = useCallback(
    (kind: Bubble) => {
      clearTimeout(timer.current);
      clearTimeout(wander.current);
      x.set(withTiming(perch.x, { duration: 350, easing: Easing.out(Easing.quad) }));
      y.set(withTiming(perch.y, { duration: 350, easing: Easing.out(Easing.quad) }));
      setBubble(kind);
      timer.current = setTimeout(() => {
        setBubble(null);
        setGone(true);
        x.set(withTiming(-size, { duration: 2500, easing: Easing.in(Easing.quad) }));
        y.set(withTiming(perch.y - 140 * scale, { duration: 2500, easing: Easing.out(Easing.quad) }));
      }, BUBBLE_MS[kind]);
    },
    [perch.x, perch.y, scale, size, x, y],
  );

  return { x, y, flap, wave, heart, hop, size, bubble, gone, show };
}

/** 나무의 새 (스펙 7.2). 덤불·송이(children) 위에 새를 그린다. perch는 새가 떠 있을 자리(화면 좌표)다. */
export function BirdScene({
  area,
  perch,
  scale,
  noticeKey,
  today,
  children,
}: {
  area: Area;
  perch: Point;
  scale: number;
  /** 나무가 가득 찼을 때의 알림 키(noticeKeyFor). 가득 차지 않았으면 null. */
  noticeKey: string | null;
  today: IsoDate;
  children: ReactNode;
}) {
  const bird = useBird(area, perch, scale);
  const { size } = bird;

  // 마지막으로 확인한 알림 키. 기록을 읽기 전(undefined)에는 알림을 띄우지 않는다.
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then(setSeen)
      .catch(() => setSeen(null));
  }, []);
  const notice = noticeKey !== null && seen !== undefined && noticeKey !== seen;
  const onPress = () => {
    if (!notice) return bird.show('cheer');
    bird.show('notice');
    setSeen(noticeKey);
    AsyncStorage.setItem(SEEN_KEY, noticeKey).catch(() => {});
  };
  const move = useAnimatedStyle(() => {
    const squash = Math.max(bird.hop.value, 0);
    const stretch = Math.max(-bird.hop.value, 0);
    return {
      transform: [
        { translateX: bird.x.value },
        { translateY: bird.y.value + Math.sin(bird.wave.value * 2 * Math.PI) * 5 + squash * 4 - stretch * 8 },
        { scaleX: -(1 + squash * 0.12 - stretch * 0.06) },
        { scaleY: 1 - squash * 0.18 + stretch * 0.1 },
      ],
    };
  });

  return (
    <>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[styles.bird, { width: size, height: (size * BIRD_H) / BIRD_W }, move]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={bird.gone || bird.bubble !== null}
            accessibilityRole="button"
            accessibilityLabel={notice ? t('tree.full.title') : t('bird.label')}
            onPress={onPress}
          >
            {/* 확인한 순간 기록되지만, 알림 말풍선이 떠 있는 동안은 편지를 계속 물고 있다. */}
            <BirdRig flap={bird.flap} heart={bird.heart} envelope={notice || bird.bubble === 'notice'} size={size} />
          </Pressable>
        </Animated.View>
        {bird.bubble !== null ? (
          <View pointerEvents="none" style={[styles.bubbleSpot, { right: 0, top: Math.max(0, perch.y - 92) }]}>
            <View style={styles.bubble}>
              {/* 화면의 종이 오리기 톤에 맞춰, 가위로 자른 크림색 종이(망점 질감)를 글자 크기만큼 늘려 깐다. */}
              <Image
                source={require('../../assets/tree/bird/bubble.png')}
                resizeMode="stretch"
                style={styles.paper}
              />
              {bird.bubble === 'notice' ? (
                <>
                  <Text display style={styles.title}>{t('tree.full.title')}</Text>
                  <Text style={styles.body}>{t('tree.full.body')}</Text>
                </>
              ) : (
                <Text display style={styles.title}>{t(cheerKeyFor(today))}</Text>
              )}
              <Image source={require('../../assets/tree/bird/bubble-tail.png')} style={styles.tail} />
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bird: { position: 'absolute', left: 0, top: 0 },
  bubbleSpot: { position: 'absolute', paddingRight: 20, alignItems: 'flex-end' },
  /** 붙여 놓은 종이처럼 살짝 기운다. */
  bubble: { maxWidth: 236, paddingHorizontal: 18, paddingVertical: 16, transform: [{ rotate: '-2deg' }] },
  paper: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  /** 따로 오린 삼각 조각 꼬리. 아래의 새 쪽을 가리킨다. */
  tail: { position: 'absolute', bottom: -22, right: 30, width: 20, height: 26 },
  title: { fontSize: 16, color: theme.ink },
  body: { marginTop: 2, fontSize: 12, color: theme.ink },
});
