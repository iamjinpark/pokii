import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import type { Container as Grade } from '@/utils/bunch';

/**
 * 수확 용기 (설계 8.4). 셋은 '얼마나 정성껏 담았나'라는 한 축 위에 있다.
 * 바구니와 상자는 그 자체로 위계가 약해서, 10/10 바구니에만 손잡이와 리본을 얹어
 * 물건의 종류가 아니라 정성의 차이로 등급을 표현한다.
 */
export function Container({ grade }: { grade: Grade }) {
  if (grade === 'basket') {
    return (
      <View style={styles.wrap} accessibilityLabel="바구니">
        <View style={styles.handle} />
        <View style={styles.ribbon} />
        <View style={[styles.body, styles.basketBody]} />
      </View>
    );
  }

  if (grade === 'crate') {
    return (
      <View style={styles.wrap} accessibilityLabel="나무 상자">
        <View style={[styles.body, styles.crateBody]}>
          <View style={styles.plank} />
          <View style={styles.plank} />
        </View>
      </View>
    );
  }

  // 소쿠리 — 얕고 소박한 것.
  return (
    <View style={styles.wrap} accessibilityLabel="소쿠리">
      <View style={[styles.body, styles.colanderBody]} />
    </View>
  );
}

const WIDTH = 128;

const styles = StyleSheet.create({
  wrap: { width: WIDTH, height: 108, alignItems: 'center', justifyContent: 'flex-end' },
  body: { width: WIDTH, backgroundColor: theme.tag, borderWidth: 3, borderColor: theme.tagEdge },
  basketBody: {
    height: 64,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  /** 손잡이. 아래 절반을 잘라 반원만 남긴다. */
  handle: {
    position: 'absolute',
    top: 4,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: theme.tagEdge,
    borderBottomColor: 'transparent',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.amber,
  },
  crateBody: { height: 62, borderRadius: 6, justifyContent: 'space-evenly', paddingVertical: 8 },
  plank: { height: 3, backgroundColor: theme.tagEdge, opacity: 0.45 },
  colanderBody: {
    height: 38,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    borderTopWidth: 0,
  },
});
