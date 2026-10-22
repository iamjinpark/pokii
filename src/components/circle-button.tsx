import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

const ICON = {
  back: require('../../assets/icons/back-button.svg'),
  close: require('../../assets/icons/close-button.svg'),
};

/**
 * 흰 동그라미 단추 (스펙 8.7). 화면을 거슬러 가는 곳은 꺾쇠(back, 왼쪽),
 * 덮은 화면을 닫는 곳은 ✕(close, 오른쪽)다.
 */
export function CircleButton({ icon, onPress, label }: { icon: keyof typeof ICON; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Image source={ICON[icon]} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24 },
});
