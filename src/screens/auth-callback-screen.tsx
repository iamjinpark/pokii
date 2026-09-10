import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { theme } from '@/theme';
import { tokensFrom } from '@/utils/sign-in';
import { supabase } from '@/utils/supabase';

/**
 * OAuth 리다이렉트 도착지. 플랫폼마다 이 화면이 뜨는 맥락이 다르다.
 *
 * 웹: openAuthSessionAsync가 띄운 팝업 안이다. expo-web-browser의 계약은 팝업이
 * maybeCompleteAuthSession()으로 부모 창에 URL을 postMessage하고, 부모가 팝업을 닫으며
 * 토큰을 처리하는 것이다. 여기서 직접 세션을 만들면 부모는 메시지를 못 받아 팝업을
 * 닫지 않고, 같은 앱이 창 두 개에 뜬다.
 *
 * 네이티브(Expo Go): openAuthSessionAsync가 리다이렉트를 가로채지 못하고
 * 딥링크(pokii://auth-callback#...)로 새어나가 라우터가 먼저 받는다. 그래서 여기서
 * 토큰을 세션으로 바꾼다.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    if (Platform.OS === 'web') {
      handled.current = true;
      const result = WebBrowser.maybeCompleteAuthSession();
      // 진행 중인 auth 세션이 없으면(주소창으로 직접 방문 등) 팝업이 아니라서
      // 아무도 이 창을 닫아주지 않는다. 스피너로 방치하지 않고 로그인으로 돌린다.
      if (result.type === 'failed') router.replace('/login');
      return;
    }

    if (url === null) return;
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
