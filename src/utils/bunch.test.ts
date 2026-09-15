import {
  BUNCH_SIZE, bunchDates, isBunchOpen, grapeStateFor, canFill, containerFor,
  startLabel, footerKey,
} from './bunch';

const START = '2026-09-01';
const none = new Set<string>();

describe('bunchDates', () => {
  test('시작일부터 연속 열흘이다', () => {
    const dates = bunchDates(START);
    expect(dates).toHaveLength(BUNCH_SIZE);
    expect(dates[0]).toBe('2026-09-01');
    expect(dates[9]).toBe('2026-09-10');
  });
});

describe('isBunchOpen', () => {
  test('1일차에 열려 있다', () => {
    expect(isBunchOpen(START, '2026-09-01')).toBe(true);
  });

  test('10일차에 열려 있다', () => {
    expect(isBunchOpen(START, '2026-09-10')).toBe(true);
  });

  test('유예일에도 아직 열려 있다', () => {
    expect(isBunchOpen(START, '2026-09-11')).toBe(true);
  });

  test('유예일 다음 날 닫힌다', () => {
    expect(isBunchOpen(START, '2026-09-12')).toBe(false);
  });
});

describe('grapeStateFor', () => {
  const today = '2026-09-05';

  test('채운 날은 filled다', () => {
    const filled = new Set(['2026-09-03']);
    expect(grapeStateFor({ date: '2026-09-03', today, filled })).toBe('filled');
  });

  test('오늘이고 안 채웠으면 today다', () => {
    expect(grapeStateFor({ date: today, today, filled: none })).toBe('today');
  });

  test('오늘이어도 채웠으면 filled다', () => {
    const filled = new Set([today]);
    expect(grapeStateFor({ date: today, today, filled })).toBe('filled');
  });

  test('어제고 안 채웠으면 yesterday다', () => {
    expect(grapeStateFor({ date: '2026-09-04', today, filled: none })).toBe('yesterday');
  });

  test('그저께 빈 칸은 missed다', () => {
    expect(grapeStateFor({ date: '2026-09-03', today, filled: none })).toBe('missed');
  });

  test('내일은 future다', () => {
    expect(grapeStateFor({ date: '2026-09-06', today, filled: none })).toBe('future');
  });
});

describe('canFill', () => {
  const args = { startedOn: START, filled: none };

  test('오늘은 채울 수 있다', () => {
    expect(canFill({ ...args, date: '2026-09-05', today: '2026-09-05' })).toBe(true);
  });

  test('어제는 채울 수 있다', () => {
    expect(canFill({ ...args, date: '2026-09-04', today: '2026-09-05' })).toBe(true);
  });

  test('그저께는 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-03', today: '2026-09-05' })).toBe(false);
  });

  test('내일은 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-06', today: '2026-09-05' })).toBe(false);
  });

  test('이미 채운 날은 못 채운다', () => {
    const filled = new Set(['2026-09-05']);
    expect(canFill({ ...args, filled, date: '2026-09-05', today: '2026-09-05' })).toBe(false);
  });

  test('유예일에 10일차를 소급 보충할 수 있다', () => {
    expect(canFill({ ...args, date: '2026-09-10', today: '2026-09-11' })).toBe(true);
  });

  test('유예일에 오늘 칸은 송이 밖이라 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-11', today: '2026-09-11' })).toBe(false);
  });

  test('송이가 닫힌 뒤에는 아무것도 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-10', today: '2026-09-12' })).toBe(false);
  });
});

describe('containerFor', () => {
  test('10알이면 바구니다', () => {
    expect(containerFor(10)).toBe('basket');
  });

  test('3알이면 상자다', () => {
    expect(containerFor(3)).toBe('crate');
  });

  test('9알이면 상자다', () => {
    expect(containerFor(9)).toBe('crate');
  });

  test('2알이면 소쿠리다', () => {
    expect(containerFor(2)).toBe('colander');
  });

  test('0알이면 소쿠리다', () => {
    expect(containerFor(0)).toBe('colander');
  });
});

describe('startLabel', () => {
  it('YYMMDD로 줄인다', () => {
    expect(startLabel('2026-10-21')).toBe('Start.261021');
  });
});

describe('footerKey', () => {
  const startedOn = '2026-09-01';
  const set = (...dates: string[]) => new Set(dates);

  it('어제 칸이 비어 있으면 보충 안내', () => {
    expect(footerKey({ startedOn, today: '2026-09-05', filled: set('2026-09-01') })).toBe(
      'bunch.yesterdayOpen',
    );
  });

  it('유예일에는 마지막 날 안내로 갈라진다', () => {
    // started_on + 10. 오늘 칸은 없고 10일차(09-10)가 어제로 잡힌다.
    expect(footerKey({ startedOn, today: '2026-09-11', filled: set() })).toBe('bunch.lastDay');
  });

  it('유예일이어도 10일차가 채워져 있으면 문구가 없다', () => {
    expect(footerKey({ startedOn, today: '2026-09-11', filled: set('2026-09-10') })).toBeNull();
  });

  it('오늘을 채웠고 어제가 비어 있으면 어제 안내가 우선한다', () => {
    expect(footerKey({ startedOn, today: '2026-09-05', filled: set('2026-09-05') })).toBe(
      'bunch.yesterdayOpen',
    );
  });

  it('오늘만 채우고 어제도 채워져 있으면 완료 문구', () => {
    expect(
      footerKey({ startedOn, today: '2026-09-05', filled: set('2026-09-04', '2026-09-05') }),
    ).toBe('tree.done');
  });

  it('첫날 아직 안 채웠으면 문구가 없다', () => {
    expect(footerKey({ startedOn, today: '2026-09-01', filled: set() })).toBeNull();
  });

  it('송이가 끝나 보충 기한도 지나면 문구가 없다', () => {
    expect(footerKey({ startedOn, today: '2026-09-12', filled: set() })).toBeNull();
  });
});

describe('유예일 칸 상태', () => {
  it('오늘 칸이 없고 10일차만 어제로 잡힌다', () => {
    const startedOn = '2026-09-01';
    const states = bunchDates(startedOn).map((date) =>
      grapeStateFor({ date, today: '2026-09-11', filled: new Set<string>() }),
    );
    expect(states).not.toContain('today');
    expect(states[BUNCH_SIZE - 1]).toBe('yesterday');
    expect(states.slice(0, BUNCH_SIZE - 1)).toEqual(Array(BUNCH_SIZE - 1).fill('missed'));
  });
});
