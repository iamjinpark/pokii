import { withAppFont } from './text';

jest.mock('@/i18n', () => ({ deviceLocale: () => 'ko' }));

describe('withAppFont', () => {
  test('600 이상은 굵은 글꼴 파일로 바꾸고 fontWeight를 지운다', () => {
    const style = withAppFont({ fontSize: 16, fontWeight: '600' });
    expect(style).toEqual({ fontSize: 16, fontFamily: 'PokiiSansKRBold' });
  });

  test('굵기가 없거나 600 미만이면 보통 글꼴이다', () => {
    expect(withAppFont(undefined).fontFamily).toBe('PokiiSansKR');
    expect(withAppFont({ fontWeight: '500' }).fontFamily).toBe('PokiiSansKR');
  });

  test('display는 굵기와 무관하게 제목 글꼴이다', () => {
    expect(withAppFont({ fontWeight: '800' }, true).fontFamily).toBe('DoHyeon');
  });

  test('배열 스타일도 합친다', () => {
    expect(withAppFont([{ color: 'red' }, { fontWeight: 'bold' }])).toEqual({
      color: 'red',
      fontFamily: 'PokiiSansKRBold',
    });
  });
});

test('fontFamily를 직접 주면 언어별 글꼴보다 우선한다', () => {
  expect(withAppFont({ fontFamily: 'Anton', fontWeight: '700' }).fontFamily).toBe('Anton');
});
