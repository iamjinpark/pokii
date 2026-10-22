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

/**
 * 떠 있는 알 하나의 자리. 어제 칸이 비어 있으면 어제 알이 먼저 뜨고, 채우면 오늘 알이 뜬다 (스펙 7.3).
 * 둘 다 없으면 -1.
 */
export function floatingDay(states: readonly GrapeState[]): number {
  const yesterday = states.indexOf('yesterday');
  return yesterday >= 0 ? yesterday : states.indexOf('today');
}

export type WiltLevel = 1 | 2 | 3;

/**
 * 놓친 알이 얼마나 시들어 보일지. 송이에서 몇 번째로 놓친 알인지로 정한다 (스펙 8.1).
 * 1·2번째는 1단계, 3·4번째는 2단계, 그 뒤는 3단계. 놓친 알이 아니면 null.
 */
export function wiltLevels(states: readonly GrapeState[]): (WiltLevel | null)[] {
  let nth = 0;
  return states.map((s) => {
    if (s !== 'missed') return null;
    nth += 1;
    return nth <= 2 ? 1 : nth <= 4 ? 2 : 3;
  });
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

/**
 * 끝난 송이는 둘 중 하나다 (설계 3.3, 3.5).
 * 10알을 다 채웠거나, 유예일(started_on + 10)이 지났거나.
 */
export function isBunchEnded(args: {
  startedOn: IsoDate;
  filled: number;
  today: IsoDate;
}): boolean {
  return args.filled >= BUNCH_SIZE || !isBunchOpen(args.startedOn, args.today);
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

/**
 * 나무에서 송이 하나가 보여줄 신호 (스펙 7.1).
 * needsToday: 오늘이 이 송이의 칸인데 아직 비었다 → 송이를 반투명하게 흐린다.
 * 어제 칸 보충 안내는 나무가 아니라 송이 상세에서 한다 (footerKey).
 */
export function treeSignals(args: {
  startedOn: IsoDate;
  today: IsoDate;
  filled: ReadonlySet<IsoDate>;
}): { needsToday: boolean } {
  const { startedOn, today, filled } = args;
  return { needsToday: bunchDates(startedOn).includes(today) && !filled.has(today) };
}
