import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

const ICON = {
  back: require('../../assets/icons/back.svg'),
  close: require('../../assets/icons/close.svg'),
  more: require('../../assets/icons/more.svg'),
};

/**
 * 윗줄 아이콘 단추 (스펙 8.7). 동그라미 없이 끝이 둥근 2.2 굵기 선으로, 제목 글씨와 같은 무게다.
 * 화면을 거슬러 가는 곳은 꺾쇠(back, 왼쪽), 덮은 화면을 닫는 곳은 ✕(close, 오른쪽), 메뉴는 ⋮(more).
 * 색은 바탕에 따라 덤불 위 흰색, 하늘 위 남색.
 */
export function IconButton({
  icon,
  color,
  onPress,
  label,
}: {
  icon: keyof typeof ICON;
  color: string;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10}>
      <Image source={ICON[icon]} style={styles.icon} tintColor={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24 },
});
