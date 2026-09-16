import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { IsoDate } from '@/utils/date';
import { supabase } from '@/utils/supabase';

type CreateArgs = { title: string; tag: string; startedOn: IsoDate };

/**
 * 목표와 1번 송이를 함께 만든다 (설계 3.6). 두 테이블을 원자적으로 채워야 해서
 * DB 함수로 묶여 있다(0006_create_goal.sql).
 *
 * 날짜는 클라이언트가 계산해 넘긴다. 서버에서 만들면 시간대가 다른 기기에서 하루가 어긋난다.
 */
async function createGoal(args: CreateArgs): Promise<void> {
  const { error } = await supabase.rpc('create_goal', {
    p_title: args.title,
    p_tag: args.tag,
    p_started_on: args.startedOn,
  });
  if (error) throw error;
}

export function useCreateGoal(): UseMutationResult<void, Error, CreateArgs> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    // 낙관적 업데이트를 쓰지 않는다. 자리 번호를 서버가 정하므로 미리 그릴 수 없고,
    // 하루에 여러 번 하는 동작도 아니다.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}
