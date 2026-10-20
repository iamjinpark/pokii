import { addDays } from './date';
import { weatherFor } from './weather';

test('같은 날짜는 언제나 같은 날씨다', () => {
  expect(weatherFor('2026-10-20')).toBe(weatherFor('2026-10-20'));
});

test('10년 동안 비 오는 날은 약 10%다', () => {
  let rain = 0;
  let day = '2026-01-01';
  for (let i = 0; i < 3650; i++) {
    if (weatherFor(day) === 'rain') rain++;
    day = addDays(day, 1);
  }
  expect(rain / 3650).toBeGreaterThan(0.08);
  expect(rain / 3650).toBeLessThan(0.12);
});
