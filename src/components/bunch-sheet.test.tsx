import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Goal } from '@/hooks/use-goals';
import { BunchSheet } from './bunch-sheet';

jest.mock('@/i18n', () => ({ appLocale: () => 'ko', t: (k: string) => k }));
// 애니메이션은 테스트에서 돌릴 필요가 없다. 리애니메이티드가 주는 테스트용 모듈을 쓴다.
// jest.mock 팩토리는 호이스팅되어 import를 쓸 수 없어 require로 불러온다.
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
/* eslint-enable @typescript-eslint/no-require-imports */

const goal = (startedOn: string, dates: string[]): Goal => ({
  id: 'g1',
  title: '아침마다 스트레칭',
  tag: '운동',
  position: 1,
  bunch: {
    id: 'b1',
    sequence: 1,
    startedOn,
    filled: dates.length,
    grapes: dates.map((grapeDate) => ({ grapeDate, mood: 'happy' as const })),
  },
});

test('제목과 달성률·채운 칸 수를 보여 주고, 시작을 누르면 onEnter를 부른다', async () => {
  const onEnter = jest.fn();
  await render(
    <BunchSheet goal={goal('2026-10-16', ['2026-10-16', '2026-10-17'])} today="2026-10-21" onEnter={onEnter} onClose={jest.fn()} />,
  );
  expect(screen.getByText('아침마다 스트레칭')).toBeTruthy();
  expect(screen.getByText('20%')).toBeTruthy();
  expect(screen.getByText('2/10')).toBeTruthy();
  await fireEvent.press(screen.getByText('sheet.start'));
  expect(onEnter).toHaveBeenCalledTimes(1);
});

test('끝난 송이는 시작 대신 결과다', async () => {
  const tenDays = Array.from({ length: 10 }, (_, i) => `2026-10-${String(10 + i).padStart(2, '0')}`);
  await render(
    <BunchSheet goal={goal('2026-10-10', tenDays)} today="2026-10-21" onEnter={jest.fn()} onClose={jest.fn()} />,
  );
  expect(screen.getByText('sheet.result')).toBeTruthy();
  expect(screen.getByText('100%')).toBeTruthy();
});

test('바깥을 누르면 닫힌다', async () => {
  const onClose = jest.fn();
  await render(
    <BunchSheet goal={goal('2026-10-16', [])} today="2026-10-21" onEnter={jest.fn()} onClose={onClose} />,
  );
  await fireEvent.press(screen.getByLabelText('sheet.close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
