import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/text';
import { fonts, theme } from '@/theme';

/** 상단 safe-area를 뺀 헤더 높이(아래 선 1px 포함). */
export const HEADER_HEIGHT = 57;

export function AppHeader() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: top }]}>
      <Text style={styles.title} accessibilityRole="header">
        POKII
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.ink,
    alignItems: 'center',
  },
  title: { color: theme.ink, fontFamily: fonts.en.display, fontSize: 26, lineHeight: HEADER_HEIGHT - 1 },
});
