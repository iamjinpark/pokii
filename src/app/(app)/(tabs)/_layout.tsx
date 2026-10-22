import { Tabs } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_WIDTH, TAB_BAR_HEIGHT } from '@/components/app-header';
import { Text } from '@/components/text';
import { useLocale } from '@/i18n';
import { fonts, fontSize, theme } from '@/theme';

export default function TabsLayout() {
  const locale = useLocale();
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      // 화면은 t()를 렌더 시점에 읽고 네비게이터는 숨은 탭을 다시 그리지 않는다.
      // 언어가 바뀌면 탭 화면을 새로 마운트해 문구를 갈아 끼운다.
      screenLayout={({ children }) => <Fragment key={locale}>{children}</Fragment>}
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.bar, { height: TAB_BAR_HEIGHT + bottom, paddingTop: 0, paddingBottom: bottom }],
        tabBarIconStyle: styles.noIcon,
        // 기본(below-icon)은 항목을 위에서부터 쌓아 아이콘 없는 라벨이 위로 붙는다. beside-icon은 가운데 정렬이다.
        tabBarLabelPosition: 'beside-icon',
        tabBarLabel: ({ focused, children }) => (
          <Text style={[styles.label, !focused && styles.idle]}>
            {children}
          </Text>
        ),
      }}
    >
      {/* 탭 이름은 앱 언어와 무관하게 영어로 둔다. */}
      <Tabs.Screen name="(tree)" options={{ title: 'tree' }} />
      <Tabs.Screen name="archive" options={{ title: 'archive' }} />
      <Tabs.Screen name="settings" options={{ title: 'settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // 기본 탭 바는 Android 그림자(elevation 8)와 borderColor를 깐다. 헤더 선과 맞추려면 둘 다 덮어야 한다.
  bar: { backgroundColor: theme.paper, borderTopWidth: BORDER_WIDTH, borderColor: theme.ink, elevation: 0 },
  noIcon: { display: 'none' },
  label: { fontFamily: fonts.en.display, fontSize: fontSize.lg, color: theme.ink },
  idle: { opacity: 0.4 },
});
