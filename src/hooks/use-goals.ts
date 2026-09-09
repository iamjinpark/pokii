import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

export type Goal = {
  id: string;
  title: string;
  tag: string;
  position: 1 | 2 | 3;
};

/** 나무의 자리 순서. 첫 목표가 가운데(1)에 온다. */
export const SLOTS = [2, 1, 3] as const;

async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, tag, position')
    .is('archived_at', null)
    .order('position');
  if (error) throw error;
  return data as Goal[];
}

export function useGoals(): UseQueryResult<Goal[]> {
  return useQuery({ queryKey: ['goals'], queryFn: fetchGoals });
}
