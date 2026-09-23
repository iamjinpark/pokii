import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useSession } from '@/hooks/use-session';
import { queryClient } from '@/utils/query';

function Routes() {
  const { session, loading } = useSession();
  useAutoRefresh();

  if (loading) {
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
