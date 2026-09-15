import type { TranslationKey } from '@/i18n';
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

/** 2026-10-21 -> Start.261021 */
export function startLabel(startedOn: IsoDate): string {
  return `Start.${startedOn.slice(2).replaceAll('-', '')}`;
}

/**
 * 송이 상세 하단에 뜨는 문구 하나 (스펙 7.4). 없으면 null.
 * 유예일에는 오늘 칸이 없고 10일차가 '어제'로 잡히므로 어제 판정 안에서 갈라진다.
 */
export function footerKey(args: {
  startedOn: IsoDate;
  today: IsoDate;
  filled: ReadonlySet<IsoDate>;
}): TranslationKey | null {
  const { startedOn, today, filled } = args;
  const states = bunchDates(startedOn).map((date) => grapeStateFor({ date, today, filled }));
  if (states.includes('yesterday')) {
    return diffDays(startedOn, today) === GRACE_OFFSET ? 'bunch.lastDay' : 'bunch.yesterdayOpen';
  }
  if (filled.has(today)) return 'tree.done';
  return null;
}
