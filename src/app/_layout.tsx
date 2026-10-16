import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DoHyeon_400Regular } from '@expo-google-fonts/do-hyeon/400Regular';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useSession } from '@/hooks/use-session';
import { queryClient } from '@/utils/query';

// 키는 theme.ts의 fonts 값과 같아야 한다. 패키지 루트에서 import하면 모든 굵기가 번들된다.
const FONTS = {
  Anton: Anton_400Regular,
  DMSans: DMSans_400Regular,
  DMSansBold: DMSans_700Bold,
  DoHyeon: DoHyeon_400Regular,
  PokiiSansKR: require('../../assets/fonts/PokiiSansKR-Regular.otf'),
  PokiiSansKRBold: require('../../assets/fonts/PokiiSansKR-Bold.otf'),
};

function Routes() {
  const { session, loading } = useSession();
  const [fontsLoaded, fontError] = useFonts(FONTS);
  useAutoRefresh();

  // 글꼴을 못 받아도 기본 글꼴로 앱은 떠야 한다.
  if (loading || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)/login" />
      </Stack.Protected>
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes />
    </QueryClientProvider>
  );
}
