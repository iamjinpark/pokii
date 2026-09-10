import { QueryClient } from '@tanstack/react-query';

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  // 42501 = permission denied. RLS가 의도적으로 거부한 요청이라 재시도해도 결과가 바뀌지 않는다.
  // supabase-js는 .throwOnError() 없이는 오류를 PostgrestError 인스턴스로 감싸지 않고
  // JSON 파싱 결과를 그대로 돌려주므로, instanceof 대신 code 필드를 직접 본다.
  if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryQuery,
    },
  },
});
