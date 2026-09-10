import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { queryClient } from '@/utils/query';
import { supabase } from '@/utils/supabase';

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // 캐시를 비우지 않으면 같은 기기에서 다음 사용자가 gcTime(5분) 안에 로그인했을 때
      // 이전 사용자의 데이터를 본다. 버튼뿐 아니라 토큰 폐기로 끊긴 경우도 여기를 지난다.
      if (event === 'SIGNED_OUT') queryClient.clear();
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
