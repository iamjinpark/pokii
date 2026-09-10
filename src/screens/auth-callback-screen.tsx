import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/theme';
import { tokensFrom } from '@/utils/sign-in';
import { supabase } from '@/utils/supabase';

/**
 * Expo Go에서는 openAuthSessionAsync가 리다이렉트를 가로채지 못하고
 * 딥링크(pokii://auth-callback#...)로 새어나가 라우터가 먼저 받는다.
 * 이 화면이 그 딥링크를 받아 토큰을 세션으로 바꾼다.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (url === null || handled.current) return;
    handled.current = true;

    const tokens = tokensFrom(url);
    if (!tokens) {
      router.replace('/login');
      return;
    }

    supabase.auth.setSession(tokens).then(({ error }) => {
      router.replace(error ? '/login' : '/');
    });
  }, [url, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.ink} />
    </View>
  );
}
