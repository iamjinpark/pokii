import { isBunchEnded, type Goal } from './use-goals';

// supabase 클라이언트는 AsyncStorage 네이티브 모듈을 요구한다. 순수 판정 테스트에는 필요 없다.
jest.mock('@/utils/supabase', () => ({ supabase: {} }));

const goal = (startedOn: string, filled: number): Goal => ({
  id: 'g1',
  title: '목표',
  tag: '목표',
  position: 1,
  bunch: { id: 'b1', sequence: 1, startedOn, filled },
});

describe('isBunchEnded', () => {
  const START = '2026-09-01';

  it('10알을 채우면 유예일 전이라도 끝난 것이다', () => {
    expect(isBunchEnded(goal(START, 10), '2026-09-05')).toBe(true);
  });

  it('진행 중이고 덜 찼으면 끝나지 않았다', () => {
    expect(isBunchEnded(goal(START, 5), '2026-09-05')).toBe(false);
  });

  it('유예일 당일은 아직 끝나지 않았다 — 10일차를 보충할 수 있다', () => {
    expect(isBunchEnded(goal(START, 5), '2026-09-11')).toBe(false);
  });

  it('유예일 다음날부터 끝난 것이다', () => {
    expect(isBunchEnded(goal(START, 5), '2026-09-12')).toBe(true);
  });

  it('한 알도 없이 기한이 지나도 끝난 것이다', () => {
    expect(isBunchEnded(goal(START, 0), '2026-09-12')).toBe(true);
  });
});
