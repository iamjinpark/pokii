import { type ComponentProps, useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/theme';

/**
 * 조각으로 나눈 흰 새(종이 오리기)를 다시 조립해 움직인다. 좌표는 조각 시트의 조립 그림(605x440) 기준이고,
 * 그 판 전체를 size에 맞춰 줄여 그린다. 조각 위치는 조립 그림과 겹쳐 보며 맞췄다.
 */
export const RIG_W = 605;
export const RIG_H = 440;

const SRC = {
  body: require('../../assets/tree/bird/body.png'),
  wingFront: require('../../assets/tree/bird/wing-front.png'),
  wingBack: require('../../assets/tree/bird/wing-back.png'),
  beak: require('../../assets/tree/bird/beak.png'),
  eye: require('../../assets/tree/bird/eye.png'),
  eyeHappy: require('../../assets/tree/bird/eye-happy.png'),
  feet: require('../../assets/tree/bird/feet.png'),
  envelope: require('../../assets/tree/bird/envelope.png'),
  heart: require('../../assets/tree/bird/heart.png'),
};

/**
 * 종이 조각 하나. 같은 그림을 ink로 칠해 흐리게 번진 사본을 살짝 아래에 깔아,
 * 종이 한 장이 배경에서 떠 있는 정도로만 구분되게 한다. 날개 회전 같은 움직임은 style로 함께 넘긴다.
 */
function PaperPiece({ source, style }: { source: number; style: ComponentProps<typeof Animated.Image>['style'] }) {
  return (
    <>
      <View style={styles.shadow} pointerEvents="none">
        <Animated.Image source={source} style={style} tintColor={theme.ink} blurRadius={14} />
      </View>
      <Animated.Image source={source} style={style} />
    </>
  );
}

/** 눈 가운데. 웃는 눈(^)도 같은 자리에 그린다. */
const EYES = [{ cx: 430, cy: 219, d: 31 }];

type Props = {
  /** 날갯짓 0(날개 위)~1(날개 아래)을 오간다. */
  flap: SharedValue<number>;
  /** 0이면 나는 자세, 1이면 날개를 접고 웃으며 하트를 띄운 자세. 사이 값에서는 두 자세가 섞인다. */
  heart: SharedValue<number>;
  /** 알림 때 부리에 편지를 문다. */
  envelope: boolean;
  /** 그릴 폭(dp). */
  size: number;
};

export function BirdRig({ flap, heart, envelope, size }: Props) {
  const blink = useSharedValue(0);
  useEffect(() => {
    blink.set(
      withRepeat(
        withSequence(withDelay(2800, withTiming(1, { duration: 70 })), withTiming(0, { duration: 90 })),
        -1,
      ),
    );
    return () => cancelAnimation(blink);
  }, [blink]);

  // 날개가 내려갈 때 몸이 떠오른다. 하트 자세에서는 날갯짓을 멈추고 날개를 몸에 접는다.
  // 날개는 밑동이 오른쪽에 있어서 시계 방향(+)으로 돌면 깃 끝이 올라간다.
  const rig = useAnimatedStyle(() => ({
    transform: [{ scale: size / RIG_W }, { translateY: -10 * flap.value * (1 - heart.value) }],
  }));
  const wingFront = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(20 - 46 * flap.value) * (1 - heart.value) - 38 * heart.value}deg` }],
  }));
  const wingBack = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(14 - 28 * flap.value) * (1 - heart.value) - 8 * heart.value}deg` }],
  }));
  const eyesOpen = useAnimatedStyle(() => ({
    opacity: 1 - heart.value,
    transform: [{ scaleY: 1 - 0.9 * blink.value }],
  }));
  const eyesHappy = useAnimatedStyle(() => ({ opacity: heart.value }));
  const heartPop = useAnimatedStyle(() => ({
    opacity: heart.value,
    transform: [{ translateY: -60 * heart.value }, { scale: 0.4 + 0.6 * heart.value }],
  }));

  return (
    <View style={{ width: size, height: (size * RIG_H) / RIG_W }}>
      <Animated.View style={[styles.rig, rig]}>
        {/* 편지는 부리 아래, 부리는 마름모라 뒤쪽 절반이 머리 뒤에 숨도록 몸통보다 먼저 그린다. */}
        {envelope ? <Image source={SRC.envelope} style={styles.envelope} /> : null}
        <Image source={SRC.beak} style={styles.beak} />
        <PaperPiece source={SRC.wingBack} style={[styles.wingBack, wingBack]} />
        <PaperPiece source={SRC.body} style={styles.body} />
        <Image source={SRC.feet} style={styles.feet} />
        {EYES.map((e) => (
          <View key={e.cx}>
            <Animated.Image
              source={SRC.eye}
              style={[{ position: 'absolute', left: e.cx - e.d / 2, top: e.cy - e.d / 2, width: e.d, height: e.d }, eyesOpen]}
            />
            <Animated.Image
              source={SRC.eyeHappy}
              style={[{ position: 'absolute', left: e.cx - 20, top: e.cy - 11, width: 40, height: 22 }, eyesHappy]}
            />
          </View>
        ))}
        <PaperPiece source={SRC.wingFront} style={[styles.wingFront, wingFront]} />
        <Animated.Image source={SRC.heart} style={[styles.heart, heartPop]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rig: { width: RIG_W, height: RIG_H, transformOrigin: 'top left' },
  /** 새 폭 60dp에서 약 1dp 아래로, 옅게. */
  shadow: {
    position: 'absolute', left: 0, top: 0, width: RIG_W, height: RIG_H, opacity: 0.15,
    transform: [{ translateX: 4 }, { translateY: 12 }],
  },
  /** 날개는 몸에 붙는 밑동(조각 시트의 관절 자리)을 축으로 돈다. 날개·몸통이 같은 종이색이라 관절은 그대로 둔다. */
  // 시안보다 몸통은 통통하게(세로로 늘림), 날개는 작게 했다. 날개 밑동(축)의 자리는 그대로다.
  wingBack: { position: 'absolute', left: 35, top: 264, width: 210, height: 118, transformOrigin: '189px 71px' },
  wingFront: { position: 'absolute', left: 94, top: 28, width: 290, height: 236, transformOrigin: '262px 170px' },
  body: { position: 'absolute', left: 0, top: 135, width: 472, height: 300 },
  feet: { position: 'absolute', left: 212, top: 393, width: 134, height: 60 },
  beak: { position: 'absolute', left: 431, top: 197, width: 97, height: 68 },
  envelope: {
    position: 'absolute', left: 452, top: 227, width: 150, height: 91, transform: [{ rotate: '-18deg' }],
  },
  heart: { position: 'absolute', left: 330, top: 40, width: 200, height: 178 },
});
