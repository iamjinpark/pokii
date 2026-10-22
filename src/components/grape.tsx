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
import { BerryLook, type BerryShape } from '@/components/tree-bunch';
import { radius, type Mood } from '@/theme';
import type { GrapeState, WiltLevel } from '@/utils/bunch';

const STATE_LABEL: Record<GrapeState, string> = {
  filled: '채움',
  today: '오늘',
  yesterday: '어제',
  missed: '놓침',
  future: '미래',
};

type Props = {
  day: number;
  state: GrapeState;
  mood?: Mood | null;
  /** 놓친 알일 때만 준다. */
  wilt?: WiltLevel | null;
  onPress?: () => void;
  /** 둥실 떠서 지금 채울 알이라고 알린다. 송이마다 하나뿐이다 (floatingDay). */
  floating?: boolean;
  shape: BerryShape;
  /** 송이 안의 자리와 크기. */
  box: Pick<ViewStyle, 'left' | 'top' | 'width' | 'height'>;
};

/** 진한 보라면 채운 날, 연회색이면 안 채운 날 (스펙 8.1). 채운 알에는 광택을 얹는다. */
export function Grape({ day, state, mood = null, wilt = null, onPress, floating = false, shape, box }: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!floating) return;
    // 일정하게 부풀기만 하면 기계 같아서, 작아졌다 커졌다를 폭과 빠르기를 바꿔 가며 되풀이한다.
    // 값 1이 1.03배, -1이 0.97배다.
    const ease = Easing.inOut(Easing.quad);
    pulse.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 900, easing: ease }),
        withTiming(1, { duration: 1100, easing: ease }),
        withTiming(-0.4, { duration: 700, easing: ease }),
        withTiming(0.6, { duration: 800, easing: ease }),
        withTiming(-0.7, { duration: 1000, easing: ease }),
        withTiming(0, { duration: 900, easing: ease }),
      ),
      -1,
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
      { scale: 1 + 0.03 * pulse.value + 0.22 * landing.value },
    ],
  }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.775 + 0.225 * pulse.value }));

  // 놓친 날과 미래 날짜는 탭해도 아무 일이 없다 (스펙 7.4). onPress가 없으면 누를 수
  // 없는 상태라는 뜻이라 Pressable로 감싸지 않는다.
  const Wrapper = onPress ? Pressable : View;

  return (
    <Animated.View style={[styles.wrap, box, lift]}>
      {floating ? <Animated.View style={[styles.halo, halo]} /> : null}
      <Wrapper
        onPress={onPress}
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${day}일차 ${STATE_LABEL[state]}`}
        style={styles.fill}
      >
        <BerryLook shape={shape} mood={state === 'filled' ? mood : null} wilt={wilt} />
              </Wrapper>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  /** 숨쉬듯 커졌다 작아지는 알 둘레의 은은한 흰 빛 (스펙 8.5). */
  halo: { ...StyleSheet.absoluteFill, borderRadius: radius.round, boxShadow: '0 0 18px 6px rgba(255, 255, 255, 0.55)' },
  fill: { width: '100%', height: '100%' },
});
