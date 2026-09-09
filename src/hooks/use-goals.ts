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
  // position의 1|2|3은 DB check 제약(0001_schema.sql:6)이 보장한다.
  return data as Goal[];
}

export function useGoals(): UseQueryResult<Goal[]> {
  return useQuery({ queryKey: ['goals'], queryFn: fetchGoals });
}
