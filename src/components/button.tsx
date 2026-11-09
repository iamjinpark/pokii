import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/text';
import { radius, space, theme } from '@/theme';

type Kind = 'primary' | 'secondary' | 'text' | 'danger' | 'dangerText';
type Size = 'L' | 'M' | 'S';

const KIND: Record<Kind, { box: ViewStyle; color: string }> = {
  primary: { box: { backgroundColor: theme.ink }, color: theme.paper },
  secondary: { box: { backgroundColor: theme.paper }, color: theme.ink },
  text: { box: {}, color: theme.ink },
  danger: { box: { backgroundColor: theme.amber }, color: theme.paper },
  dangerText: { box: {}, color: theme.amber },
};

/**
 * 버튼 (스펙 8.7). 종류 5 × 크기 3. L 52는 화면 아래 주요 버튼(가로 가득), M 44는 화면 안,
 * S 36은 작은 선택·확인. 주요는 한 화면에 하나. 누를 수 없으면 35%.
 */
export function Button({
  label,
  onPress,
  kind = 'primary',
  size = 'L',
  disabled = false,
  busy = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: Kind;
  size?: Size;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy }}
      style={[styles.base, styles[size], KIND[kind].box, disabled && styles.off, style]}
    >
      <Text variant="button" style={{ color: KIND[kind].color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  L: { height: 52, paddingHorizontal: space.xl, alignSelf: 'stretch' },
  M: { height: 44, paddingHorizontal: 20, alignSelf: 'flex-start' },
  S: { height: 36, paddingHorizontal: space.lg, alignSelf: 'flex-start' },
  off: { opacity: 0.35 },
});
