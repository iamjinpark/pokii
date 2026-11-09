import type { ReactNode, Ref } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { fonts, textStyles, type TextVariant } from '@/theme';

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
 * 역할에 맞는 글꼴을 고른다 (스펙 9.2). display는 Anton·도현, title은 도현, 나머지는 DM Sans·페이퍼로지.
 * 글자가 한글이면 한글 글꼴, 아니면 라틴 글꼴. 표시용 글꼴은 굵기가 하나라 fontWeight를 버리고,
 * 본문은 커스텀 글꼴이 Android에서 fontWeight를 적용하지 못하므로 굵기를 글꼴 파일로 바꾼다(500 중간, 600 이상 굵게).
 * fontFamily를 직접 주면 그대로 쓴다 (브랜드 로고 등).
 */
export function withAppFont(style: TextProps['style'], variant: TextVariant = 'body', hangul = false): TextStyle {
  const { fontWeight, ...rest } = StyleSheet.flatten([textStyles[variant], style]) ?? {};
  const weight = fontWeight === 'bold' ? 700 : Number(fontWeight ?? 400);
  const set =
    variant === 'display' ? fonts.display
    : variant === 'title' ? fonts.title
    : weight >= 600 ? fonts.bodyBold
    : weight >= 500 ? fonts.bodyMedium
    : fonts.body;
  return { fontFamily: hangul ? set.hangul : set.latin, ...rest };
}

/** 글자만 모은다. 안쪽에 다른 Text가 섞여 있으면 바깥 글자만 보고 글꼴을 고른다(안쪽 Text는 스스로 고른다). */
function plainText(children: ReactNode): string | null {
  if (typeof children === 'string') return children;
  if (!Array.isArray(children)) return null;
  const text = children.filter((c) => typeof c === 'string' || typeof c === 'number').join('');
  return text === '' ? null : text;
}

/** variant: 글씨 역할. 기본은 body. */
type Props = TextProps & { variant?: TextVariant };

export function Text({ style, variant = 'body', children, ...rest }: Props) {
  const text = plainText(children);
  const runs = text === null ? [] : scriptRuns(text);
  const pure = typeof children === 'string' || (Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number'));
  if (runs.length <= 1 || !pure) {
    return (
      <RNText {...rest} style={withAppFont(style, variant, runs[0]?.hangul ?? false)}>
        {children}
      </RNText>
    );
  }
  // 한 줄 안에서 글자마다 글꼴이 다르다. 안쪽 Text는 글꼴만 바꾸고 크기·색은 물려받는다.
  const fontWeight = StyleSheet.flatten([textStyles[variant], style])?.fontWeight;
  return (
    <RNText {...rest} style={withAppFont(style, variant, runs[0]?.hangul)}>
      {runs.map((r, i) => (
        <RNText key={i} style={{ fontFamily: withAppFont({ fontWeight }, variant, r.hangul).fontFamily }}>
          {r.text}
        </RNText>
      ))}
    </RNText>
  );
}

/** 입력칸은 body 역할이다. 한 칸 안에서 글꼴을 나눌 수 없어, 한글이 있으면(비어 있으면 안내 글씨 기준) 한글 글꼴로 그린다. */
export function TextInput({ style, ...rest }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  const content = rest.value || rest.placeholder || '';
  return <RNTextInput {...rest} style={withAppFont(style, 'body', hasHangul(content))} />;
}
