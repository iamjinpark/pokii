import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { Alert } from 'react-native';
import type { CurrentBunch } from '@/hooks/use-current-bunch';
import { t } from '@/i18n';
import type { Mood } from '@/theme';
import type { IsoDate } from '@/utils/date';
import { supabase } from '@/utils/supabase';

const UNIQUE_VIOLATION = '23505';

type SaveArgs = {
  bunchId: string;
  date: IsoDate;
  mood: Mood;
  note: string | null;
  /** 이 송이에 이미 그 알이 있으면 수정, 없으면 채우기. */
  editing: boolean;
};

/**
 * 채우기는 insert다. upsert로 두면 안 된다 — 완성한 날 "한 송이 더"를 누르면 새 송이의
 * 1일차가 이전 송이 10일차와 같은 날짜가 되는데(스펙 3.5), 그때 upsert가 기존 알의
 * bunch_id를 새 송이로 옮겨 완성된 송이의 기록을 조용히 훼손한다.
 *
 * 유니크 위반은 에러로 다루지 않는다. 그날은 이미 소진된 것이므로 조용히 성공으로
 * 처리하고 화면만 맞춘다 (스펙 6.3).
 */
async function fillGrape(goalId: string, args: SaveArgs): Promise<void> {
  const { error } = await supabase.from('grapes').insert({
    bunch_id: args.bunchId,
    goal_id: goalId,
    grape_date: args.date,
    mood: args.mood,
    note: args.note,
  });
  if (error && error.code === UNIQUE_VIOLATION) return;
  if (error) throw error;
}

/** bunch_id까지 조건에 넣어 다른 송이의 알을 건드릴 수 없게 한다. */
async function editGrape(goalId: string, args: SaveArgs): Promise<void> {
  const { error } = await supabase
    .from('grapes')
    .update({ mood: args.mood, note: args.note })
    .eq('goal_id', goalId)
    .eq('grape_date', args.date)
    .eq('bunch_id', args.bunchId);
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
 *
 * 알림과 롤백은 mutation 정의에 둔다. 저장 직후 화면이 닫히므로 mutate에 넘긴
 * 콜백은 observer가 사라져 호출되지 않는다.
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
      Alert.alert(t('common.error.network'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      // 나무는 채운 개수로 끝난 송이를 판정한다. 여기를 비우지 않으면 열 번째 알을
      // 채우고 나무로 돌아가도 9알로 남아 결과 화면 대신 상세로 간다.
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useSaveGrape(goalId: string): UseMutationResult<void, Error, SaveArgs> {
  return useGrapeMutation(
    goalId,
    (args) => (args.editing ? editGrape(goalId, args) : fillGrape(goalId, args)),
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
