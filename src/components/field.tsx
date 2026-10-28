import { useState, type Ref } from 'react';
import { StyleSheet, type TextInput as RNTextInput, type TextInputProps, View } from 'react-native';
import { Text, TextInput } from '@/components/text';
import { t } from '@/i18n';
import { radius, space, theme } from '@/theme';

type Props = TextInputProps & {
  label: string;
  optional?: boolean;
  /** 글자 수 한도. count와 함께 주면 오른쪽 아래에 count/max, 넘으면 오류. */
  max?: number;
  count?: number;
  /** 왼쪽 아래 안내. 오류가 있으면 오류가 대신 나온다. */
  help?: string;
  error?: string | null;
  ref?: Ref<RNTextInput>;
};

/**
 * 입력칸 (스펙 8.7). 칸 이름 → 칸 → 아래 줄(안내·오류 / 글자 수). 한 줄 52, 여러 줄 최소 96.
 * 입력 중 남색, 오류 주황 테두리. 테두리 두께는 늘 2로 두고 색만 바꿔 글씨가 흔들리지 않게 한다.
 */
export function Field({ label, optional, max, count, help, error, multiline, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const over = max !== undefined && count !== undefined && count > max;
  const message = error ?? (over && max !== undefined ? t('field.tooLong', { max }) : help);
  const wrong = Boolean(error) || over;
  return (
    <View style={styles.field}>
      <Text variant="label" style={styles.label}>
        {label}
        {optional ? <Text variant="caption" style={styles.optional}>{` ${t('field.optional')}`}</Text> : null}
      </Text>
      <View style={styles.box}>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={theme.hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && styles.multi,
            focused && styles.focus,
            wrong && styles.wrong,
            rest.editable === false && styles.off,
            style,
          ]}
        />
        {message || (max !== undefined && count !== undefined) ? (
          <View style={styles.help}>
            <Text variant="caption" style={wrong ? styles.wrongText : styles.helpText}>
              {message ?? ''}
            </Text>
            {max !== undefined && count !== undefined ? (
              <Text variant="caption" style={over ? styles.overCount : styles.helpText}>
                {`${count}/${max}`}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  label: { color: theme.ink },
  optional: { color: theme.hint, fontWeight: '400' },
  box: { gap: space.xs },
  input: {
    // 웹 브라우저의 기본 포커스 윤곽선(기기 강조색)이 남색 테두리 위에 겹치지 않게 끈다.
    outlineWidth: 0,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.ink,
  },
  multi: { minHeight: 96, textAlignVertical: 'top' },
  focus: { borderColor: theme.ink },
  wrong: { borderColor: theme.amber },
  off: { opacity: 0.35 },
  help: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg },
  helpText: { color: theme.hint },
  wrongText: { color: theme.amber },
  overCount: { color: theme.amber, fontWeight: '700' },
});
