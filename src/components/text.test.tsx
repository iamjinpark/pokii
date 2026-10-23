import { scriptRuns, withAppFont } from './text';

describe('scriptRuns', () => {
  test('한글과 라틴 구간을 나누고 띄어쓰기·문장부호는 앞 구간에 붙인다', () => {
    expect(scriptRuns('Learn 한국어!')).toEqual([
      { text: 'Learn ', hangul: false },
      { text: '한국어!', hangul: true },
    ]);
  });

  test('숫자는 라틴 구간이다', () => {
    expect(scriptRuns('오늘 시작 · 10일').map((r) => r.text)).toEqual(['오늘 시작 · ', '10', '일']);
  });

  test('한 가지 글자만 있으면 구간 하나', () => {
    expect(scriptRuns('No.2')).toEqual([{ text: 'No.2', hangul: false }]);
    expect(scriptRuns('새 목표')).toEqual([{ text: '새 목표', hangul: true }]);
  });

  test('문장부호로 시작해도 다음 글자 구간에 붙는다', () => {
    expect(scriptRuns('"안녕"')).toEqual([{ text: '"안녕"', hangul: true }]);
  });
});

describe('withAppFont', () => {
  test('라벨은 굵기와 무관하게 Anton·도현이고 fontWeight를 지운다', () => {
    expect(withAppFont({ fontSize: 16, fontWeight: '800' }, true)).toEqual({ fontSize: 16, fontFamily: 'Anton' });
    expect(withAppFont(undefined, true, true).fontFamily).toBe('DoHyeon');
  });

  test('본문은 DM Sans·페이퍼로지, 600 이상은 굵은 파일', () => {
    expect(withAppFont(undefined).fontFamily).toBe('DMSans');
    expect(withAppFont({ fontWeight: '600' }, false, true)).toEqual({ fontFamily: 'PaperlogyBold' });
    expect(withAppFont({ fontWeight: 'bold' }).fontFamily).toBe('DMSansBold');
  });

  test('fontFamily를 직접 주면 그대로 쓴다', () => {
    expect(withAppFont({ fontFamily: 'Anton', fontWeight: '700' }, false, true).fontFamily).toBe('Anton');
  });
});
