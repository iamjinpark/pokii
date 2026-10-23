import type { ReactNode, Ref } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { fonts } from '@/theme';

const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
export const hasHangul = (text: string) => HANGUL.test(text);
// 띄어쓰기·문장부호는 어느 글꼴로 그려도 되니 앞 구간에 붙인다.
const NEUTRAL = /[\s\p{P}\p{S}]/u;
const ALL_NEUTRAL = /^[\s\p{P}\p{S}]+$/u;

/** 글을 한글 구간과 그 밖(라틴·숫자) 구간으로 나눈다. */
export function scriptRuns(text: string): { text: string; hangul: boolean }[] {
  const runs: { text: string; hangul: boolean }[] = [];
  for (const ch of text) {
    const last = runs[runs.length - 1];
    if (last && NEUTRAL.test(ch)) {
      last.text += ch;
      continue;
    }
    const hangul = HANGUL.test(ch);
    if (last && (last.hangul === hangul || ALL_NEUTRAL.test(last.text))) {
      last.text += ch;
      last.hangul = hangul;
    } else runs.push({ text: ch, hangul });
  }
  return runs;
}

/**
 * 라벨(버튼·제목·칸 이름·번호·메뉴)은 Anton·도현, 나머지 본문은 DM Sans·Pretendard다 (스펙 9.2).
 * 글자가 한글이면 한글 글꼴, 아니면 라틴 글꼴. 라벨 글꼴은 굵기가 하나라 fontWeight를 버리고,
 * 본문은 커스텀 글꼴이 Android에서 fontWeight를 적용하지 못하므로 굵기를 글꼴 파일로 바꾼다.
 * fontFamily를 직접 주면 그대로 쓴다 (브랜드 로고 등).
 */
export function withAppFont(style: TextProps['style'], label = false, hangul = false): TextStyle {
  const { fontWeight, ...rest } = StyleSheet.flatten(style) ?? {};
  const bold = fontWeight === 'bold' || Number(fontWeight) >= 600;
  const set = label ? fonts.label : bold ? fonts.bodyBold : fonts.body;
  return { fontFamily: hangul ? set.hangul : set.latin, ...rest };
}

function plainText(children: ReactNode): string | null {
  if (typeof children === 'string') return children;
  if (Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number')) {
    return children.join('');
  }
  return null;
}

/** label: 버튼·화면 제목·칸 이름·번호·메뉴. 나머지는 본문이다. */
type Props = TextProps & { label?: boolean };

export function Text({ style, label, children, ...rest }: Props) {
  const text = plainText(children);
  const runs = text === null ? [] : scriptRuns(text);
  if (runs.length <= 1) {
    return (
      <RNText {...rest} style={withAppFont(style, label, runs[0]?.hangul ?? false)}>
        {children}
      </RNText>
    );
  }
  // 한 줄 안에서 글자마다 글꼴이 다르다. 안쪽 Text는 글꼴만 바꾸고 크기·색은 물려받는다.
  const fontWeight = StyleSheet.flatten(style)?.fontWeight;
  return (
    <RNText {...rest} style={withAppFont(style, label, runs[0]?.hangul)}>
      {runs.map((r, i) => (
        <RNText key={i} style={{ fontFamily: withAppFont({ fontWeight }, label, r.hangul).fontFamily }}>
          {r.text}
        </RNText>
      ))}
    </RNText>
  );
}

/** 입력칸은 본문이다. 한 칸 안에서 글꼴을 나눌 수 없어, 한글이 있으면(비어 있으면 안내 글씨 기준) 한글 글꼴로 그린다. */
export function TextInput({ style, ...rest }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  const content = rest.value || rest.placeholder || '';
  return <RNTextInput {...rest} style={withAppFont(style, false, hasHangul(content))} />;
}
