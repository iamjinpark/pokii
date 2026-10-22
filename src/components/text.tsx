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

/**
 * 커스텀 글꼴은 Android에서 fontWeight가 적용되지 않는다. 굵기를 글꼴 파일로 바꾸고
 * fontWeight는 지운다 (스펙 9.2). fontFamily를 직접 주면 그대로 쓴다 (브랜드 로고 등).
 */
export function withAppFont(style: TextProps['style'], display = false): TextStyle {
  const { fontWeight, ...rest } = StyleSheet.flatten(style) ?? {};
  const f = fonts[appLocale()];
  const bold = fontWeight === 'bold' || Number(fontWeight) >= 600;
  return { fontFamily: display ? f.display : bold ? f.bodyBold : f.body, ...rest };
}

type Props = TextProps & { display?: boolean };

export function Text({ style, display, ...rest }: Props) {
  return <RNText {...rest} style={withAppFont(style, display)} />;
}

export function TextInput({ style, ...rest }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  return <RNTextInput {...rest} style={withAppFont(style)} />;
}
