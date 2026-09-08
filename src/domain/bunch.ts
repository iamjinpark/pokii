import { addDays, diffDays, type IsoDate } from './date';

export const BUNCH_SIZE = 10;

/** 마지막 칸(+9) 다음 날. 이날까지 소급 보충할 수 있다. */
const GRACE_OFFSET = BUNCH_SIZE;

export type GrapeState = 'filled' | 'today' | 'yesterday' | 'missed' | 'future';
export type Container = 'basket' | 'crate' | 'colander';

export function bunchDates(startedOn: IsoDate): IsoDate[] {
  return Array.from({ length: BUNCH_SIZE }, (_, i) => addDays(startedOn, i));
}

export function isBunchOpen(startedOn: IsoDate, today: IsoDate): boolean {
  return diffDays(startedOn, today) <= GRACE_OFFSET;
}

export function grapeStateFor(args: {
  date: IsoDate;
  today: IsoDate;
  filled: ReadonlySet<IsoDate>;
}): GrapeState {
  const { date, today, filled } = args;
  if (filled.has(date)) return 'filled';
  const offset = diffDays(today, date);
  if (offset === 0) return 'today';
  if (offset === -1) return 'yesterday';
  return offset < 0 ? 'missed' : 'future';
}

export function canFill(args: {
  date: IsoDate;
  today: IsoDate;
  startedOn: IsoDate;
  filled: ReadonlySet<IsoDate>;
}): boolean {
  const { date, today, startedOn, filled } = args;
  if (!bunchDates(startedOn).includes(date)) return false;
  const state = grapeStateFor({ date, today, filled });
  return state === 'today' || state === 'yesterday';
}

export function containerFor(filledCount: number): Container {
  if (filledCount >= BUNCH_SIZE) return 'basket';
  if (filledCount >= 3) return 'crate';
  return 'colander';
}
