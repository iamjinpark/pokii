import { QueryClient } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // 42501 = permission denied. RLS가 의도적으로 거부한 요청이라 재시도해도 결과가 바뀌지 않는다.
        if (error instanceof PostgrestError && error.code === '42501') return false;
        return failureCount < 2;
      },
    },
  },
});
