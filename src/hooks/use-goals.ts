import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { BUNCH_SIZE, isBunchOpen } from '@/utils/bunch';
import type { IsoDate } from '@/utils/date';
import { supabase } from '@/utils/supabase';

export type Goal = {
  id: string;
  title: string;
  tag: string;
  position: 1 | 2 | 3;
  /** 현재(마지막 sequence) 송이. 송이 없는 목표는 존재하지 않는다(설계 3.6). */
  bunch: { id: string; sequence: number; startedOn: IsoDate; filled: number };
};

/** 나무의 자리 순서. 첫 목표가 가운데(1)에 온다. */
export const SLOTS = [2, 1, 3] as const;

/**
 * 끝난 송이는 둘 중 하나다 (설계 3.3, 3.5).
 * 10알을 다 채웠거나, 유예일(started_on + 10)이 지났거나.
 */
export function isBunchEnded(goal: Goal, today: IsoDate): boolean {
  return goal.bunch.filled >= BUNCH_SIZE || !isBunchOpen(goal.bunch.startedOn, today);
}

type Row = {
  id: string;
  title: string;
  tag: string;
  position: 1 | 2 | 3;
  bunches: { id: string; sequence: number; started_on: IsoDate; grapes: { id: string }[] }[];
};

async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, tag, position, bunches(id, sequence, started_on, grapes(id))')
    .is('archived_at', null)
    .order('position');
  if (error) throw error;

  // position의 1|2|3은 DB check 제약(0001_schema.sql:6)이 보장한다.
  return (data as unknown as Row[]).map((row) => {
    const latest = row.bunches.reduce((a, b) => (b.sequence > a.sequence ? b : a));
    return {
      id: row.id,
      title: row.title,
      tag: row.tag,
      position: row.position,
      bunch: {
        id: latest.id,
        sequence: latest.sequence,
        startedOn: latest.started_on,
        filled: latest.grapes.length,
      },
    };
  });
}

export function useGoals(): UseQueryResult<Goal[]> {
  return useQuery({ queryKey: ['goals'], queryFn: fetchGoals });
}
