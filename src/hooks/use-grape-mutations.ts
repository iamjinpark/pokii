import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { CurrentBunch } from '@/hooks/use-current-bunch';
import type { Mood } from '@/theme';
import type { IsoDate } from '@/utils/date';
import { supabase } from '@/utils/supabase';

type SaveArgs = { bunchId: string; date: IsoDate; mood: Mood; note: string | null };

/**
 * 하루 하나라는 제약은 unique (goal_id, grape_date)가 지킨다. upsert로 보내면 채우기와
 * 수정이 한 경로가 되고, 이미 그 날짜가 채워져 있어도 에러가 아니라 원하던 상태로 수렴한다
 * (스펙 6.3).
 */
async function saveGrape(goalId: string, args: SaveArgs): Promise<void> {
  const { error } = await supabase.from('grapes').upsert(
    {
      bunch_id: args.bunchId,
      goal_id: goalId,
      grape_date: args.date,
      mood: args.mood,
      note: args.note,
    },
    { onConflict: 'goal_id,grape_date' },
  );
  if (error) throw error;
}

async function removeGrape(goalId: string, date: IsoDate): Promise<void> {
  const { error } = await supabase
    .from('grapes')
    .delete()
    .eq('goal_id', goalId)
    .eq('grape_date', date);
  if (error) throw error;
}

/**
 * 하루에 한 번뿐인 핵심 동작이라 서버 응답을 기다리지 않는다. 여기서 지연이 보이면
 * 앱 전체가 굼떠 보인다 (스펙 6.3). 실패하면 이전 캐시로 되돌린다.
 */
function useGrapeMutation<TArgs>(
  goalId: string,
  run: (args: TArgs) => Promise<void>,
  patch: (bunch: CurrentBunch, args: TArgs) => CurrentBunch,
): UseMutationResult<void, Error, TArgs> {
  const queryClient = useQueryClient();
  const key = ['goal', goalId, 'currentBunch'];

  return useMutation({
    mutationFn: run,
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CurrentBunch | null>(key);
      if (previous) queryClient.setQueryData(key, patch(previous, args));
      return { previous };
    },
    onError: (_error, _args, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useSaveGrape(goalId: string): UseMutationResult<void, Error, SaveArgs> {
  return useGrapeMutation(
    goalId,
    (args) => saveGrape(goalId, args),
    (bunch, args) => ({
      ...bunch,
      grapes: [
        ...bunch.grapes.filter((g) => g.grapeDate !== args.date),
        { grapeDate: args.date, mood: args.mood, note: args.note },
      ],
    }),
  );
}

export function useRemoveGrape(goalId: string): UseMutationResult<void, Error, IsoDate> {
  return useGrapeMutation(
    goalId,
    (date) => removeGrape(goalId, date),
    (bunch, date) => ({ ...bunch, grapes: bunch.grapes.filter((g) => g.grapeDate !== date) }),
  );
}
