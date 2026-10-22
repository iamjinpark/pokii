import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { BackButton } from '@/components/back-button';
import { Text } from '@/components/text';
import { fontSize, space, theme } from '@/theme';

type Props = {
  title: string;
  /** 제목 위 작은 글씨 (송이 번호 등). */
  eyebrow?: string;
  /** 없으면 닫기 단추를 감춘다 (저장 중 등). 자리는 남겨 제목이 움직이지 않는다. */
  onClose?: () => void;
  /** 아래 버튼. 키보드가 올라오면 키보드 위에 붙어 따라 올라간다. */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * 탭을 덮는 입력·결과 화면의 공통 틀 (스펙 8.7): 윗줄(닫기·제목) → 스크롤되는 내용 → 아래 버튼.
 * 웹에서는 키보드 라이브러리가 일반 ScrollView·View로 동작한다.
 */
export function ScreenFrame({ title, eyebrow, onClose, footer, children }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        {onClose ? <BackButton onPress={onClose} label="닫기" /> : <View style={styles.closeSpace} />}
        <View style={styles.titles}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
      </View>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={space.xl}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        // 키보드가 열리면 아래 여백만큼 내려 버튼이 키보드에 가깝게 붙는다.
        <KeyboardStickyView offset={{ closed: 0, opened: space.lg }}>
          <View style={styles.footer}>{footer}</View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.xl },
  closeSpace: { width: 24, height: 24 },
  titles: { flex: 1 },
  eyebrow: { fontSize: fontSize.xs, fontWeight: '700', color: theme.ink, letterSpacing: 0.5 },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: theme.ink },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: space.xl },
  footer: { gap: space.lg, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl, backgroundColor: theme.sky },
});
