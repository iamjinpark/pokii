import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  withSequence,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme, type Mood } from '@/theme';
import type { GrapeState } from '@/utils/bunch';

const SIZE = 38;

const STATE_LABEL: Record<GrapeState, string> = {
  filled: '채움',
  today: '오늘',
  yesterday: '어제',
  missed: '놓침',
  future: '미래',
};

/** 색이 있으면 채운 날, 회색이면 안 채운 날 (스펙 8.1). */
function berryStyle(state: GrapeState, mood: Mood | null): ViewStyle {
  if (state === 'filled') {
    return { backgroundColor: mood ? theme.mood[mood] : theme.empty };
  }
  if (state === 'yesterday') {
    return {
      backgroundColor: theme.empty,
      borderWidth: 2.5,
      borderStyle: 'dashed',
      borderColor: theme.amber,
    };
  }
  // 놓침은 영구히 채울 수 없다. 시든 알로 바꾸는 안은 스펙에서 폐기했다.
  if (state === 'missed') return { backgroundColor: theme.empty, opacity: 0.3 };
  return { backgroundColor: theme.empty };
}

type Props = { day: number; state: GrapeState; mood?: Mood | null; onPress?: () => void };

export function Grape({ day, state, mood = null, onPress }: Props) {
  const floating = state === 'today';
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!floating) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    // 자정을 넘겨 다시 그려지거나 알이 채워지면 '오늘'이 아니게 된다. 멈추지 않으면
    // 그 알이 계속 떠다니고 들린 채로 남는다.
    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [floating, pulse]);

  // 저장한 알이 제 칸에 들어앉는 연출 (스펙 8.5.2의 마지막 박자). 이 화면은 기록 화면
  // 아래에 계속 떠 있으므로, 저장이 반영되는 순간 상태가 filled로 바뀌는 것을 잡는다.
  const landing = useSharedValue(0);
  const wasFilled = useRef(state === 'filled');
  useEffect(() => {
    const justFilled = state === 'filled' && !wasFilled.current;
    wasFilled.current = state === 'filled';
    if (!justFilled) return;
    landing.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }),
    );
  }, [state, landing]);

  const lift = useAnimatedStyle(() => ({
    transform: [
      { translateY: -5 * pulse.value },
      { scale: 1 + 0.04 * pulse.value + 0.22 * landing.value },
    ],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.2 + 0.3 * pulse.value,
    transform: [{ scale: 1.15 + 0.15 * pulse.value }],
  }));

  // 놓친 날과 미래 날짜는 탭해도 아무 일이 없다 (스펙 7.4). onPress가 없으면 누를 수
  // 없는 상태라는 뜻이라 Pressable로 감싸지 않는다.
  const Wrapper = onPress ? Pressable : View;

  return (
    <Animated.View style={[styles.wrap, floating && styles.above, lift]}>
      {floating ? <Animated.View style={[styles.halo, halo]} /> : null}
      <Wrapper
        onPress={onPress}
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${day}일차 ${STATE_LABEL[state]}`}
        style={[styles.berry, berryStyle(state, mood), floating && styles.lifted]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  /** 오늘 알의 후광이 다음 알에 덮이지 않게 한다 (스펙 8.5.2). */
  above: { zIndex: 1 },
  halo: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.vine,
  },
  berry: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  /** 오늘 알은 떠 있는 상태다 (스펙 8.5). elevation은 Android용. */
  lifted: {
    shadowColor: theme.ink,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
