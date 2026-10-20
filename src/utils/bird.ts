import type { TranslationKey } from '@/i18n';
import { diffDays, type IsoDate } from './date';

const CHEERS = 10;

/** 새를 눌렀을 때 보여 줄 오늘의 화이팅 문구. 같은 날에는 같은 문구, 날마다 다음 문구로 넘어간다. */
export function cheerKeyFor(today: IsoDate): TranslationKey {
  const n = ((diffDays('2026-01-01', today) % CHEERS) + CHEERS) % CHEERS;
  return `bird.cheer.${n}` as TranslationKey;
}

/**
 * 나무가 가득 찼다는 알림 하나를 가리키는 키. 지금 심긴 목표들로 정해서, 송이를 끝내고 새 목표를 심어
 * 다시 가득 차면 다른 알림이 된다. 한 번 확인한 키는 다시 알리지 않는다.
 */
export function noticeKeyFor(goalIds: readonly string[]): string {
  return [...goalIds].sort().join(',');
}
