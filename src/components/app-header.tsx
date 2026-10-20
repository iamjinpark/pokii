import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/text';
import { fonts, theme } from '@/theme';

/** 헤더 아래 선과 탭 바 위 선의 굵기. */
export const BORDER_WIDTH = 1;
/** 상단 safe-area를 뺀 헤더 높이(아래 선 포함). */
export const HEADER_HEIGHT = 57;
/** 하단 safe-area를 뺀 탭 바 높이(위 선 포함). 헤더와 같게 둔다. */
export const TAB_BAR_HEIGHT = HEADER_HEIGHT;

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
    borderBottomWidth: BORDER_WIDTH,
    borderBottomColor: theme.ink,
    alignItems: 'center',
  },
  title: { color: theme.ink, fontFamily: fonts.en.display, fontSize: 26, lineHeight: HEADER_HEIGHT - BORDER_WIDTH },
});
