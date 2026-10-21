import { useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SURFACE, SURFACE_RADIUS, SURFACE_TEXT } from '@/components/surface';
import { Text } from '@/components/text';
import type { Goal } from '@/hooks/use-goals';
import { t } from '@/i18n';
import { theme } from '@/theme';
import { BUNCH_SIZE, isBunchEnded } from '@/utils/bunch';
import type { IsoDate } from '@/utils/date';
import { backgroundImage } from '@/utils/sky';

/** 진행 막대의 채운 구간: 옅은 보라(sad)에서 진한 보라(happy)로. 포도알 기분 색과 같다. */
const FILL = `linear-gradient(90deg, ${theme.mood.sad}, ${theme.mood.happy})`;
/** 남은 구간 눈금 수 (막대 전체 기준). 남은 만큼만 그린다. */
const TICKS = 20;
/** 아래로 이만큼(dp) 넘게 끌면 닫힌다. */
const CLOSE_DRAG = 60;

/**
 * 나무에서 송이를 누르면 아래에서 올라오는 시트 (스펙 7.1). 그 송이의 목표, 오늘 수확 여부, 진행도를 보여 주고
 * 들어가기로 상세(끝난 송이는 결과) 화면에 간다. 바깥을 누르거나 아래로 끌면 닫힌다.
 */
export function BunchSheet({ goal, today, onEnter, onClose }: {
  goal: Goal;
  today: IsoDate;
  onEnter: () => void;
  onClose: () => void;
}) {
  const filled = goal.bunch.grapes.length;
  const harvested = goal.bunch.grapes.some((g) => g.grapeDate === today);
  const ended = isBunchEnded({ ...goal.bunch, today });
  const pct = Math.min(100, Math.round((filled / BUNCH_SIZE) * 100));

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

  const line = ended ? t('sheet.ended') : harvested ? t('sheet.today.done') : t('sheet.today.todo');

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
        <View style={styles.tag}>
          <Text style={styles.tagLabel}>{goal.tag}</Text>
        </View>
        <Text style={styles.title}>{goal.title}</Text>

        <View style={styles.state}>
          <View style={[styles.stateDot, harvested && styles.stateDotOn]} />
          <Text style={styles.stateLabel}>{line}</Text>
        </View>

        {/* 진행 막대: 채운 구간(그라데이션+퍼센트) · 지금 위치 표시 · 남은 구간 세로 눈금 */}
        <View style={styles.bar} accessibilityLabel={`${filled} / ${BUNCH_SIZE}`}>
          <Text style={styles.barEnd}>{t('sheet.days')}</Text>
          <View style={styles.barRow}>
            {pct > 0 ? (
              <View style={[styles.fill, { width: `${pct}%` }, backgroundImage(FILL)]}>
                <Text style={styles.fillLabel}>{`${pct}%`}</Text>
              </View>
            ) : null}
            {pct < 100 ? (
              <View style={styles.ticks}>
                {Array.from({ length: Math.max(1, Math.round((TICKS * (100 - pct)) / 100)) }, (_, i) => (
                  <View key={i} style={styles.tick} />
                ))}
              </View>
            ) : null}
            <View style={[styles.mark, { left: `${pct}%` }]}>
              <View style={styles.markDot} />
            </View>
          </View>
        </View>

        <Pressable onPress={onEnter} style={styles.enter} accessibilityRole="button">
          <Text style={styles.enterLabel}>{ended ? t('sheet.result') : t('sheet.enter')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0, 0, 0, 0.18)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18,
    borderTopLeftRadius: SURFACE_RADIUS, borderTopRightRadius: SURFACE_RADIUS,
  },
  grip: { alignSelf: 'center', width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.5)', marginBottom: 2 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  tagLabel: { fontSize: 12, color: SURFACE_TEXT },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 22, color: SURFACE_TEXT },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  stateDotOn: { backgroundColor: theme.mood.happy },
  stateLabel: { fontSize: 13, color: SURFACE_TEXT },
  bar: { paddingTop: 14 },
  barEnd: { position: 'absolute', right: 0, top: 0, fontSize: 11, color: SURFACE_TEXT, opacity: 0.8 },
  barRow: { flexDirection: 'row', alignItems: 'center', height: 32 },
  fill: { height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 7 },
  fillLabel: { fontSize: 11.5, color: SURFACE_TEXT },
  ticks: { flex: 1, height: 18, marginLeft: 6, flexDirection: 'row', justifyContent: 'space-between' },
  tick: { width: 2, height: '100%', borderRadius: 1, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  /** 지금 위치: 위에 점이 달린 세로 선. */
  mark: { position: 'absolute', top: 0, width: 2, height: 32, marginLeft: -1, borderRadius: 1, backgroundColor: SURFACE_TEXT },
  markDot: { position: 'absolute', left: -3, top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: SURFACE_TEXT },
  enter: { marginTop: 4, paddingVertical: 11, borderRadius: SURFACE_RADIUS, backgroundColor: '#FFFFFF', alignItems: 'center' },
  enterLabel: { fontSize: 14, color: '#1F1F27' },
});
