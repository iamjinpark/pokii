import { withAppFont } from './text';

jest.mock('@/i18n', () => ({ appLocale: () => 'ko' }));

describe('withAppFont', () => {
  test('앱 글씨는 굵기와 무관하게 장식 글꼴이고 fontWeight를 지운다', () => {
    expect(withAppFont({ fontSize: 16, fontWeight: '800' })).toEqual({ fontSize: 16, fontFamily: 'DoHyeon' });
    expect(withAppFont(undefined).fontFamily).toBe('DoHyeon');
  });

  test('사용자 값은 본문 글꼴, 600 이상은 굵은 파일', () => {
    expect(withAppFont({ fontSize: 16, fontWeight: '600' }, true)).toEqual({ fontSize: 16, fontFamily: 'PokiiSansKRBold' });
    expect(withAppFont({ fontWeight: '500' }, true).fontFamily).toBe('PokiiSansKR');
  });

  test('배열 스타일도 합친다', () => {
    expect(withAppFont([{ color: 'red' }, { fontWeight: 'bold' }], true)).toEqual({
      color: 'red',
      fontFamily: 'PokiiSansKRBold',
    });
  });
});

test('fontFamily를 직접 주면 언어별 글꼴보다 우선한다', () => {
  expect(withAppFont({ fontFamily: 'Anton', fontWeight: '700' }).fontFamily).toBe('Anton');
});
