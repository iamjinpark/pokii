import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

/**
 * 삭제하면 사라지는 양. 포도알은 이 앱에서 사용자가 쌓아 온 자산이라, 개수를 보여주는
 * 편이 훨씬 신중해진다 (설계 7.4).
 */
export type Footprint = { bunches: number; grapes: number };

async function countRows(table: 'bunches' | 'grapes', goalId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('goal_id', goalId);
  if (error) throw error;
  return count ?? 0;
}

/** 삭제 확인을 열 때만 센다. 상세 화면을 열 때마다 두 번씩 세는 것은 낭비다. */
export function useGoalFootprint(goalId: string, enabled: boolean): UseQueryResult<Footprint> {
  return useQuery({
    queryKey: ['goal', goalId, 'footprint'],
    enabled,
    queryFn: async () => ({
      bunches: await countRows('bunches', goalId),
      grapes: await countRows('grapes', goalId),
    }),
  });
}

export function useUpdateGoal(
  goalId: string,
): UseMutationResult<void, Error, { title: string; tag: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, tag }) => {
      const { error } = await supabase.from('goals').update({ title, tag }).eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['goal', goalId, 'currentBunch'] });
    },
  });
}

/**
 * 목표를 지우면 그 아래 송이와 포도알도 함께 사라진다 (설계 3.6). 스키마의
 * on delete cascade가 처리하므로 여기서는 목표만 지운다.
 *
 * 보관(archived_at)과 다르다. 보관은 Complete/End의 '끝내기'이고 되살릴 수 있다.
 */
export function useDeleteGoal(goalId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['goal', goalId] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
