import type { Ref } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { appLocale } from '@/i18n';
import { fonts } from '@/theme';

const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

/**
 * 앱이 보여 주는 글은 장식 글꼴(앱 언어에 따라 Anton·도현), 사용자가 입력한 값은 본문 글꼴이다 (스펙 9.2).
 * 사용자 값은 앱 언어가 아니라 글 내용으로 고른다. 한글이 섞이면 Pokii Sans KR(라틴 포함), 아니면 DM Sans.
 * 장식 글꼴은 굵기가 하나뿐이라 fontWeight를 버린다. 본문은 커스텀 글꼴이 Android에서 fontWeight를
 * 적용하지 못하므로 굵기를 글꼴 파일로 바꾼다. fontFamily를 직접 주면 그대로 쓴다 (브랜드 로고 등).
 */
export function withAppFont(style: TextProps['style'], user = false, content = ''): TextStyle {
  const { fontWeight, ...rest } = StyleSheet.flatten(style) ?? {};
  if (!user) return { fontFamily: fonts[appLocale()].display, ...rest };
  const f = fonts[HANGUL.test(content) ? 'ko' : 'en'];
  const bold = fontWeight === 'bold' || Number(fontWeight) >= 600;
  return { fontFamily: bold ? f.bodyBold : f.body, ...rest };
}

/** user: 사용자가 입력한 값(목표 제목·메모·이메일 등)을 보여 줄 때. */
type Props = TextProps & { user?: boolean };

export function Text({ style, user, children, ...rest }: Props) {
  const content = typeof children === 'string' ? children : '';
  return <RNText {...rest} style={withAppFont(style, user, content)}>{children}</RNText>;
}

export function TextInput({ style, ...rest }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  // 비어 있으면 안내 글씨(앱 언어)를 기준으로 고른다.
  const content = rest.value || rest.placeholder || '';
  return <RNTextInput {...rest} style={withAppFont(style, true, content)} />;
}
