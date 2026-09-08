import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/utils/supabase';

export type OAuthProvider = 'google' | 'kakao';

/** app.json의 scheme("pokii")으로 만들어지는 pokii:// 주소.
 *  모듈 로드 시점에 만들면 스킴을 못 읽는 환경(테스트 등)에서 import만으로 터진다. */
function redirectUri(): string {
  return makeRedirectUri({ scheme: 'pokii', path: 'auth-callback' });
}

/** Supabase는 토큰을 쿼리스트링이 아니라 URL 프래그먼트(#)에 담아 돌려준다. */
export function tokensFrom(url: string): { access_token: string; refresh_token: string } | null {
  const fragment = url.split('#')[1];
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export async function signInWith(provider: OAuthProvider): Promise<void> {
  const redirectTo = redirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('OAuth 주소를 받지 못했습니다.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  const tokens = tokensFrom(result.url);
  if (!tokens) throw new Error('로그인 응답에서 토큰을 찾지 못했습니다.');

  const { error: sessionError } = await supabase.auth.setSession(tokens);
  if (sessionError) throw sessionError;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
