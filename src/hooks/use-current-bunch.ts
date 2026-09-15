import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Mood } from '@/theme';
import type { IsoDate } from '@/utils/date';
import { supabase } from '@/utils/supabase';

export type Grape = { grapeDate: IsoDate; mood: Mood; note: string | null };

export type CurrentBunch = {
  id: string;
  sequence: number;
  startedOn: IsoDate;
  title: string;
  tag: string;
  grapes: Grape[];
};

type Row = {
  id: string;
  sequence: number;
  started_on: IsoDate;
  goals: { title: string; tag: string };
  grapes: { grape_date: IsoDate; mood: Mood; note: string | null }[];
};

/** 현재 송이 = 마지막 sequence. 화면 하나가 요청 하나로 끝나도록 목표와 알을 함께 받는다. */
async function fetchCurrentBunch(goalId: string): Promise<CurrentBunch | null> {
  const { data, error } = await supabase
    .from('bunches')
    .select('id, sequence, started_on, goals!inner(title, tag), grapes(grape_date, mood, note)')
    .eq('goal_id', goalId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // mood의 5종은 DB check 제약(0001_schema.sql:36)이 보장한다.
  const row = data as unknown as Row;
  return {
    id: row.id,
    sequence: row.sequence,
    startedOn: row.started_on,
    title: row.goals.title,
    tag: row.goals.tag,
    grapes: row.grapes.map((g) => ({ grapeDate: g.grape_date, mood: g.mood, note: g.note })),
  };
}

export function useCurrentBunch(goalId: string): UseQueryResult<CurrentBunch | null> {
  return useQuery({
    queryKey: ['goal', goalId, 'currentBunch'],
    queryFn: () => fetchCurrentBunch(goalId),
  });
}
