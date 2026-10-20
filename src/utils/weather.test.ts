import { addDays } from './date';
import { weatherFor } from './weather';

test('같은 날짜는 언제나 같은 날씨다', () => {
  expect(weatherFor('2026-10-20')).toBe(weatherFor('2026-10-20'));
});

test('10년 동안 비·눈 오는 날은 약 10%이고, 눈은 12~2월에만 온다', () => {
  let wet = 0;
  let day = '2026-01-01';
  for (let i = 0; i < 3650; i++) {
    const w = weatherFor(day);
    if (w !== 'clear') wet++;
    const winter = ['12', '01', '02'].includes(day.slice(5, 7));
    if (w === 'snow') expect(winter).toBe(true);
    if (w === 'rain') expect(winter).toBe(false);
    day = addDays(day, 1);
  }
  expect(wet / 3650).toBeGreaterThan(0.08);
  expect(wet / 3650).toBeLessThan(0.12);
});
