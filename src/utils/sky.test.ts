import { skyAt, skyTimeFor } from './sky';

test.each([
  [5, 'night'],
  [6, 'morning'],
  [11, 'morning'],
  [12, 'afternoon'],
  [17, 'afternoon'],
  [18, 'afternoon'],
  [19, 'night'],
  [0, 'night'],
])('%i시는 %s', (hour, expected) => {
  expect(skyTimeFor(hour)).toBe(expected);
});

test('기준점 시각에서는 기준점 색 그대로다', () => {
  expect(skyAt(9 * 60).stops).toEqual(['#CEEDFC', '#D4F0FD', '#D7F1FE']);
  expect(skyAt(0).stops).toEqual(skyAt(24 * 60).stops);
});

test('기준점 사이는 양쪽 색 사이 값이다', () => {
  const [top] = skyAt(18 * 60).stops;
  const r = parseInt(top.slice(1, 3), 16);
  expect(r).toBeLessThan(0xf2);
  expect(r).toBeGreaterThan(0x4f);
});

test.each([
  [3 * 60, '#F7FFE3'],
  [9 * 60, '#353364'],
  [18 * 60 + 30, '#353364'],
  [19 * 60 + 30, '#F7FFE3'],
])('%i분의 글자색은 %s', (minutes, text) => {
  expect(skyAt(minutes).text).toBe(text);
});

