import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

/** 닫기·뒤로는 모든 화면에서 이 흰 동그라미 꺾쇠 하나다 (스펙 8.7). */
export function BackButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Image source={require('../../assets/icons/back-button.svg')} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24 },
});
