import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { IsoDate } from '@/utils/date';
import { supabase } from '@/utils/supabase';

/**
 * 끝난 송이에서 고르는 두 경로 (설계 3.5). 둘 다 두 테이블을 건드려야 해서 DB 함수로
 * 묶여 있다(0009_close_bunch.sql).
 */
async function finishGoal(goalId: string): Promise<void> {
  const { error } = await supabase.rpc('finish_goal', { p_goal_id: goalId });
  if (error) throw error;
}

async function startNextBunch(goalId: string, startedOn: IsoDate): Promise<void> {
  const { error } = await supabase.rpc('start_next_bunch', {
    p_goal_id: goalId,
    p_started_on: startedOn,
  });
  if (error) throw error;
}

function useHarvest(
  goalId: string,
  run: (goalId: string) => Promise<void>,
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => run(goalId),
    // 낙관적 업데이트를 쓰지 않는다. 자주 하는 동작이 아니고, 연출은 저장이 끝난 뒤에
    // 시작해야 화면만 수확되고 데이터는 그대로인 상태가 생기지 않는다 (설계 7.6).
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['goal', goalId, 'currentBunch'] });
    },
  });
}

export function useFinishGoal(goalId: string): UseMutationResult<void, Error, void> {
  return useHarvest(goalId, finishGoal);
}

export function useStartNextBunch(
  goalId: string,
  startedOn: IsoDate,
): UseMutationResult<void, Error, void> {
  return useHarvest(goalId, (id) => startNextBunch(id, startedOn));
}
