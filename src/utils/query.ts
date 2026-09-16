import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

/** PostgREST가 JWT 문제로 거부할 때만 쓰는 코드. 만료·위조·누락이 전부 여기로 온다. */
const JWT_REJECTED = 'PGRST301';
/** Postgres 권한 거부. 로그인한 상태면 진짜 권한 문제이고, 아니면 세션이 없는 것이다. */
const PERMISSION_DENIED = '42501';

/**
 * supabase-js는 .throwOnError() 없이는 오류를 PostgrestError 인스턴스로 감싸지 않고
 * JSON 파싱 결과를 그대로 돌려주므로, instanceof 대신 code 필드를 직접 본다.
 */
function codeOf(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const code = (error as { code: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  // 권한 거부와 JWT 거부는 재시도해도 결과가 바뀌지 않는다.
  const code = codeOf(error);
  if (code === PERMISSION_DENIED || code === JWT_REJECTED) return false;
  return failureCount < 2;
}

/**
 * 세션이 죽었는데 화면에 남아 있으면 "다시 시도"를 눌러도 영원히 같은 401이 난다.
 * 그럴 때는 로그아웃시켜 로그인 화면으로 보낸다 — signOut은 세션이 없어도
 * SIGNED_OUT을 쏘므로 라우터 가드가 받아준다.
 *
 * 42501은 로그인한 상태에서도 날 수 있다(권한이 없는 함수 호출 등). 그건 진짜 권한
 * 문제이므로 로그아웃시키면 안 된다. 살아있는 세션이 없을 때만 세션 문제로 본다.
 */
export async function signOutIfSessionDead(error: unknown): Promise<void> {
  const code = codeOf(error);
  if (code !== JWT_REJECTED && code !== PERMISSION_DENIED) return;

  if (code === PERMISSION_DENIED) {
    const { data } = await supabase.auth.getSession();
    const expiresAt = data.session?.expires_at;
    const alive = expiresAt !== undefined && expiresAt * 1000 > Date.now();
    if (alive) return;
  }

  // scope: 'local'이어야 한다. 기본값 'global'은 서버에서 그 사용자의 모든 세션을
  // 폐기해, 이 기기의 토큰이 죽었다는 이유로 다른 기기까지 로그아웃시킨다.
  // 게다가 이미 죽은 세션이라 서버 호출 자체가 의미 없다.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryQuery,
    },
  },
  queryCache: new QueryCache({ onError: (error) => void signOutIfSessionDead(error) }),
  mutationCache: new MutationCache({ onError: (error) => void signOutIfSessionDead(error) }),
});
