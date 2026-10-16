import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/text';
import { fonts, theme } from '@/theme';

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
  title: { color: theme.ink, fontFamily: fonts.en.display, fontSize: 26, lineHeight: 56 },
});
