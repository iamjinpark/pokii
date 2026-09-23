import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/utils/supabase';

/**
 * autoRefreshToken은 JS 타이머로 돌기 때문에 OS가 앱을 백그라운드로 보내면 함께 멈춘다.
 * 포그라운드 진입 시 다시 돌려주지 않으면 만료된 세션으로 잠시 동작한다.
 */
export function useAutoRefresh(): void {
  useEffect(() => {
    supabase.auth.startAutoRefresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
