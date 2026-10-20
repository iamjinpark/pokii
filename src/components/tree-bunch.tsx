import { Image } from 'expo-image';
import { Image as RNImage, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import type { Goal } from '@/hooks/use-goals';
import { theme } from '@/theme';
import { bunchDates, isBunchEnded, treeSignals } from '@/utils/bunch';
import type { IsoDate } from '@/utils/date';

/** 송이 그룹 크기와 알 자리 (Figma main-morning Group 51 기준, 그룹 좌상단 원점). */
export const BUNCH_W = 114;
export const BUNCH_H = 168;

/**
 * Figma 알은 손그림 외곽선 + 브러시 테두리 + 색이 구워진 질감이라 그대로는 기분 색을 칠할 수 없고,
 * 브러시가 알마다 곡선 수십만 개라 실시간으로 그리기엔 무겁다. 그래서 모양 6종을 PNG@3x 두 장으로
 * 미리 구웠다: mask(흰 실루엣, 기분 색으로 tint)와 tex(질감의 밝고 어두운 부분만 남긴 반투명 층).
 */
const SHAPES = {
  e62: { mask: require('../../assets/tree/berries/e62-mask.png'), tex: require('../../assets/tree/berries/e62-tex.png'), w: 34, h: 34 },
  e10: { mask: require('../../assets/tree/berries/e10-mask.png'), tex: require('../../assets/tree/berries/e10-tex.png'), w: 34, h: 35 },
  e9: { mask: require('../../assets/tree/berries/e9-mask.png'), tex: require('../../assets/tree/berries/e9-tex.png'), w: 34, h: 35 },
  e26: { mask: require('../../assets/tree/berries/e26-mask.png'), tex: require('../../assets/tree/berries/e26-tex.png'), w: 35, h: 35 },
  e59: { mask: require('../../assets/tree/berries/e59-mask.png'), tex: require('../../assets/tree/berries/e59-tex.png'), w: 35, h: 34 },
  e8: { mask: require('../../assets/tree/berries/e8-mask.png'), tex: require('../../assets/tree/berries/e8-tex.png'), w: 38, h: 38 },
};

/**
 * 그리는 순서(뒤 → 앞)대로. day는 위에서부터 0..9. (cx, cy)는 Figma 노드의 중심이다.
 * 구운 이미지는 브러시 테두리만큼 노드보다 커서 중심을 맞춰 놓는다.
 */
const BERRIES = [
  { day: 6, cx: 67.5, cy: 101.5, shape: SHAPES.e62 },
  { day: 3, cx: 82.5, cy: 83, shape: SHAPES.e10 },
  { day: 8, cx: 27.5, cy: 126, shape: SHAPES.e9 },
  { day: 2, cx: 17.5, cy: 73.5, shape: SHAPES.e26 },
  { day: 0, cx: 40, cy: 63.5, shape: SHAPES.e59 },
  { day: 5, cx: 23.5, cy: 98.5, shape: SHAPES.e62 },
  { day: 9, cx: 38.5, cy: 152.5, shape: SHAPES.e62 },
  { day: 1, cx: 67.5, cy: 66.5, shape: SHAPES.e26 },
  { day: 4, cx: 45.5, cy: 91.5, shape: SHAPES.e8 },
  { day: 7, cx: 51.5, cy: 122.5, shape: SHAPES.e26 },
];

type Props = { goal: Goal; today: IsoDate; onPress: () => void };

/** 나무 위의 송이 하나. 알 색 · 흐림 · 끝난 송이 후광 (스펙 7.1). 이름은 #60에서 바텀시트로 보여 준다. */
export function TreeBunch({ goal, today, onPress }: Props) {
  const { startedOn, filled: count, grapes } = goal.bunch;
  const moods = new Map(grapes.map((g) => [g.grapeDate, g.mood]));
  const filled = new Set(moods.keys());
  const ended = isBunchEnded({ startedOn, filled: count, today });
  const { needsToday } = treeSignals({ startedOn, today, filled });

  const dates = bunchDates(startedOn);
  const colors = dates.map((date) => {
    const mood = moods.get(date);
    return mood ? theme.mood[mood] : theme.empty;
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${goal.tag} 송이${ended ? ' 끝남' : ''}`}
      style={styles.root}
    >
      {ended ? (
        <>
          <View style={styles.halo} />
          <Text style={[styles.sparkle, styles.sparkleA]}>✦</Text>
          <Text style={[styles.sparkle, styles.sparkleB]}>✦</Text>
        </>
      ) : null}
      {/*
        오늘 칸이 비었으면 송이(잎·알)를 통째로 반투명하게 해 덤불이 비치게 한다. 진한 색으로 덮으면
        오히려 강조돼 보인다. 알이 겹쳐 있어 묶음 단위로 합성해야 겹친 곳만 진해지지 않는다.
      */}
      <View
        style={[StyleSheet.absoluteFill, needsToday && styles.dimmed]}
        needsOffscreenAlphaCompositing={needsToday}
      >
        <Image source={require('../../assets/tree/stem-leaf.svg')} style={styles.stemLeaf} />
        {BERRIES.map(({ day, cx, cy, shape }) => {
          const box = {
            left: cx - shape.w / 2,
            top: cy - shape.h / 2,
            width: shape.w,
            height: shape.h,
          };
          return (
            <View key={day} style={[styles.berry, box]}>
              {/* tintColor로 흰 실루엣을 기분 색으로 칠한다. expo-image 대신 RN Image를 쓰는 건 웹 tint 때문. */}
              {/* 같은 실루엣을 살짝 크게 어둡게 깔아 테두리를 만든다. 없으면 겹친 빈 알이 한 덩어리로 보인다. */}
              <RNImage source={shape.mask} style={[styles.layer, styles.edge]} tintColor={theme.ink} />
              <RNImage source={shape.mask} style={styles.layer} tintColor={colors[day]} />
              {filled.has(dates[day]) ? <RNImage source={shape.tex} style={styles.layer} /> : null}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: BUNCH_W, height: BUNCH_H },
  stemLeaf: { position: 'absolute', left: 31, top: 0, width: 84, height: 74 },
  dimmed: { opacity: 0.45 },
  berry: { position: 'absolute' },
  layer: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  edge: { opacity: 0.15, transform: [{ scale: 1.08 }] },
  halo: {
    position: 'absolute', left: -18, top: 20, width: 140, height: 140, borderRadius: 70,
    backgroundColor: theme.glow, opacity: 0.55,
  },
  sparkle: { position: 'absolute', fontSize: 16, color: theme.glow },
  sparkleA: { left: -14, top: 40 },
  sparkleB: { left: 100, top: 130 },
});
