import { useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SURFACE, SURFACE_RADIUS, SURFACE_TEXT } from '@/components/surface';
import { Text } from '@/components/text';
import type { Goal } from '@/hooks/use-goals';
import { t } from '@/i18n';
import { theme } from '@/theme';
import { BUNCH_SIZE, bunchDates, isBunchEnded } from '@/utils/bunch';
import type { IsoDate } from '@/utils/date';

/** 아래로 이만큼(dp) 넘게 끌면 닫힌다. */
const CLOSE_DRAG = 60;

/**
 * 나무에서 송이를 누르면 아래에서 올라오는 시트 (스펙 7.1). 위에 목표 제목과 동그란 시작 버튼,
 * 아래에 달성률과 열흘 칸(채운 날은 그날 기분 색)을 보여 준다. 시작으로 상세(끝난 송이는 결과) 화면에 간다.
 * 바깥을 누르거나 아래로 끌면 닫힌다.
 */
export function BunchSheet({ goal, today, onEnter, onClose }: {
  goal: Goal;
  today: IsoDate;
  onEnter: () => void;
  onClose: () => void;
}) {
  const moodOf = new Map(goal.bunch.grapes.map((g) => [g.grapeDate, g.mood]));
  const days = bunchDates(goal.bunch.startedOn);
  const filled = goal.bunch.grapes.length;
  const pct = Math.min(100, Math.round((filled / BUNCH_SIZE) * 100));
  const ended = isBunchEnded({ ...goal.bunch, today });

  const drag = useSharedValue(0);
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));
  // 한 번만 만든다. onClose는 시트가 떠 있는 동안 바뀌지 않는다.
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.set(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DRAG) onClose();
        else drag.set(withTiming(0, { duration: 160 }));
      },
    }),
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} accessibilityLabel={t('sheet.close')} />
      <Animated.View
        entering={SlideInDown.duration(260)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, SURFACE, dragStyle]}
        {...pan.panHandlers}
      >
        <View style={styles.grip} />
        <View style={styles.goal}>
          <Text style={styles.title}>{goal.title}</Text>
          <Pressable onPress={onEnter} style={styles.start} accessibilityRole="button">
            <Text style={styles.startLabel}>{ended ? t('sheet.result') : t('sheet.start')}</Text>
          </Pressable>
        </View>

        <View style={styles.progress}>
          <View>
            <Text style={styles.rateLabel}>{t('sheet.rate')}</Text>
            <Text style={styles.rate}>{`${pct}%`}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.count}>{`${filled}/${BUNCH_SIZE}`}</Text>
            <View style={styles.dots}>
              {days.map((date) => {
                const mood = moodOf.get(date);
                return <View key={date} style={[styles.dot, mood ? { backgroundColor: theme.mood[mood] } : styles.dotEmpty]} />;
              })}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const DOT = 16;
const DOT_GAP = 4;

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0, 0, 0, 0.18)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, gap: 18,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20,
    borderTopLeftRadius: SURFACE_RADIUS, borderTopRightRadius: SURFACE_RADIUS,
  },
  grip: { alignSelf: 'center', width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  goal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 17, lineHeight: 22, color: SURFACE_TEXT },
  /** 시작 버튼: 포도알색(잉크 남보라) 동그라미. */
  start: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' },
  startLabel: { fontSize: 13, color: SURFACE_TEXT },
  progress: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  rateLabel: { fontSize: 11, color: SURFACE_TEXT, opacity: 0.7, marginBottom: 4 },
  rate: { fontSize: 46, lineHeight: 50, color: SURFACE_TEXT },
  right: { alignItems: 'flex-end', gap: 8 },
  count: { fontSize: 11.5, color: SURFACE_TEXT },
  /** 열흘 칸을 다섯씩 두 줄로. */
  dots: { width: DOT * 5 + DOT_GAP * 4, flexDirection: 'row', flexWrap: 'wrap', gap: DOT_GAP },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  dotEmpty: { backgroundColor: 'rgba(255, 255, 255, 0.35)' },
});
