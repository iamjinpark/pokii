import { en } from '@/i18n/en';
import { cheerKeyFor, noticeKeyFor } from './bird';

test('같은 날에는 같은 문구다', () => {
  expect(cheerKeyFor('2026-10-19')).toBe(cheerKeyFor('2026-10-19'));
});

test('다음 날에는 다음 문구로 넘어간다', () => {
  expect(cheerKeyFor('2026-10-19')).not.toBe(cheerKeyFor('2026-10-20'));
});

test('기준일보다 이른 날짜도 있는 문구를 고른다', () => {
  expect(en[cheerKeyFor('2025-12-25')]).toBeDefined();
});

test('열흘 동안 문구 열 개를 한 번씩 쓴다', () => {
  const keys = new Set(
    Array.from({ length: 10 }, (_, i) => cheerKeyFor(`2026-11-${String(i + 1).padStart(2, '0')}`)),
  );
  expect(keys.size).toBe(10);
  keys.forEach((k) => expect(en[k]).toBeDefined());
});

test('같은 목표들이면 순서가 달라도 같은 알림이다', () => {
  expect(noticeKeyFor(['b', 'a', 'c'])).toBe(noticeKeyFor(['c', 'b', 'a']));
});

test('목표가 하나라도 바뀌면 새 알림이다', () => {
  expect(noticeKeyFor(['a', 'b', 'c'])).not.toBe(noticeKeyFor(['a', 'b', 'd']));
});
