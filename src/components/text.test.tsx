import { withAppFont } from './text';

jest.mock('@/i18n', () => ({ appLocale: () => 'ko' }));

describe('withAppFont', () => {
  test('앱 글씨는 굵기와 무관하게 장식 글꼴이고 fontWeight를 지운다', () => {
    expect(withAppFont({ fontSize: 16, fontWeight: '800' })).toEqual({ fontSize: 16, fontFamily: 'DoHyeon' });
    expect(withAppFont(undefined).fontFamily).toBe('DoHyeon');
  });

  test('사용자 값은 앱 언어가 아니라 글 내용으로 본문 글꼴을 고른다', () => {
    expect(withAppFont(undefined, true, '매일 영어 단어').fontFamily).toBe('PokiiSansKR');
    expect(withAppFont(undefined, true, 'Learn 한국어').fontFamily).toBe('PokiiSansKR');
    expect(withAppFont(undefined, true, 'Learn 20 words').fontFamily).toBe('DMSans');
  });

  test('사용자 값의 600 이상은 굵은 파일', () => {
    expect(withAppFont({ fontSize: 16, fontWeight: '600' }, true, '영어')).toEqual({ fontSize: 16, fontFamily: 'PokiiSansKRBold' });
    expect(withAppFont({ fontWeight: '700' }, true, 'words').fontFamily).toBe('DMSansBold');
    expect(withAppFont({ fontWeight: '500' }, true, '영어').fontFamily).toBe('PokiiSansKR');
  });

  test('배열 스타일도 합친다', () => {
    expect(withAppFont([{ color: 'red' }, { fontWeight: 'bold' }], true, '영어')).toEqual({
      color: 'red',
      fontFamily: 'PokiiSansKRBold',
    });
  });
});

test('fontFamily를 직접 주면 언어별 글꼴보다 우선한다', () => {
  expect(withAppFont({ fontFamily: 'Anton', fontWeight: '700' }).fontFamily).toBe('Anton');
});
