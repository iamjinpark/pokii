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
  test('역할 크기·굵기를 깔고 화면 스타일이 위에 얹힌다', () => {
    expect(withAppFont({ color: 'red' }, 'label')).toEqual({ fontFamily: 'DMSansBold', fontSize: 14, lineHeight: 18, color: 'red' });
    expect(withAppFont(undefined, 'caption', true)).toEqual({ fontFamily: 'Paperlogy', fontSize: 12, lineHeight: 17 });
  });

  test('title은 도현, display는 영어 Anton·한글 도현, 굵기는 버린다', () => {
    expect(withAppFont({ fontWeight: '800' }, 'title').fontFamily).toBe('DoHyeon');
    expect(withAppFont(undefined, 'display').fontFamily).toBe('Anton');
    expect(withAppFont(undefined, 'display', true).fontFamily).toBe('DoHyeon');
  });

  test('본문 역할은 굵기로 파일을 고른다', () => {
    expect(withAppFont(undefined, 'body').fontFamily).toBe('DMSans');
    expect(withAppFont(undefined, 'button', true).fontFamily).toBe('PaperlogyMedium');
    expect(withAppFont(undefined, 'headline').fontFamily).toBe('DMSansBold');
  });

  test('fontFamily를 직접 주면 그대로 쓴다', () => {
    expect(withAppFont({ fontFamily: 'Anton', fontWeight: '700' }, 'body', true).fontFamily).toBe('Anton');
  });
});
