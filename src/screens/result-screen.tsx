import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { Container } from '@/components/container';
import { useFinishGoal, useStartNextBunch } from '@/hooks/use-close-bunch';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useToday } from '@/hooks/use-today';
import { t, type TranslationKey } from '@/i18n';
import { fontSize, radius, space, theme } from '@/theme';
import {
  BUNCH_SIZE,
  containerFor,
  isBunchEnded,
  type Container as Grade,
} from '@/utils/bunch';

/** 3알 미만이면 숫자 대신 격려 문구를 보여준다 (설계 7.6). */
const SHOW_COUNT_FROM = 3;

const GRADE_KEY: Record<Grade, TranslationKey> = {
  basket: 'done.container.basket',
  crate: 'done.container.crate',
  colander: 'done.container.colander',
};

/**
 * 끝난 송이를 나무에서 탭해야 들어온다 (설계 7.6). 앱을 열 때 모달로 띄우지 않는다 —
 * 목표가 셋이면 세 송이가 같은 날 끝날 수 있고, 모달이 연달아 뜨면 앱을 연 목적을 가로막는다.
 *
 * 선택하지 않고 나가도 가지에 끝난 송이가 남아 상태가 어긋나지 않는다.
 */
export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = useToday();
  const { data: bunch, isLoading, isError, refetch } = useCurrentBunch(id);
  const args = { goalId: id, bunchId: bunch?.id ?? '', today };
  const finish = useFinishGoal(args);
  const oneMore = useStartNextBunch(args);

  // 끝나지 않은 송이에서는 고를 것이 없다. 주소로 직접 들어오거나, 다른 기기에서 새 송이가
  // 시작된 뒤 이 화면을 들고 있으면 닿는다. 서버도 거부하지만 화면에서 먼저 돌려보낸다.
  const ended =
    bunch === undefined ||
    bunch === null ||
    isBunchEnded({ startedOn: bunch.startedOn, filled: bunch.grapes.length, today });
  useEffect(() => {
    if (!ended) router.replace('/');
  }, [ended, router]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const toTree = () => router.replace('/');
  const busy = finish.isPending || oneMore.isPending;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !bunch) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{t('common.error.network')}</Text>
        <Pressable onPress={() => refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const filled = bunch.grapes.length;
  const complete = filled >= BUNCH_SIZE;
  const grade = containerFor(filled);
  const failed = finish.isError || oneMore.isError;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.meta}>{`No.${bunch.sequence}`}</Text>
        {busy ? null : (
          <Pressable onPress={back} style={styles.close} accessibilityLabel="닫기">
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>
        {complete ? t('done.title.complete') : t('done.title.ended')}
      </Text>

      <View style={styles.result}>
        <Container grade={grade} />
        {filled >= SHOW_COUNT_FROM ? (
          <>
            <Text style={styles.count}>{`${filled} / ${BUNCH_SIZE}`}</Text>
            <Text style={styles.grade}>{t(GRADE_KEY[grade])}</Text>
          </>
        ) : (
          <Text style={styles.encourage}>{t('done.encourage')}</Text>
        )}
      </View>

      {failed ? <Text style={styles.failed}>{t('done.failed')}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => oneMore.mutate(undefined, { onSuccess: toTree })}
          disabled={busy}
          accessibilityLabel={t('done.oneMore')}
          accessibilityState={{ disabled: busy, busy }}
          style={[styles.primary, busy && styles.off]}
        >
          <Text style={styles.primaryLabel}>{t('done.oneMore')}</Text>
        </Pressable>

        <Pressable
          onPress={() => finish.mutate(undefined, { onSuccess: toTree })}
          disabled={busy}
          accessibilityLabel={t('done.finish')}
          accessibilityState={{ disabled: busy, busy }}
          style={[styles.secondary, busy && styles.off]}
        >
          <Text style={styles.secondaryLabel}>{t('done.finish')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky, padding: space.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.sky,
    gap: space.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: fontSize.xs, fontWeight: '700', color: theme.ink, letterSpacing: 0.5 },
  close: { paddingVertical: space.sm, paddingHorizontal: space.sm },
  closeLabel: { fontSize: fontSize.lg, fontWeight: '800', color: theme.ink },
  title: { marginTop: space.sm, fontSize: fontSize.lg, fontWeight: '800', color: theme.ink },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  count: { fontSize: fontSize.xl, fontWeight: '800', color: theme.ink },
  grade: { fontSize: fontSize.sm, fontWeight: '700', color: theme.vine },
  encourage: { fontSize: fontSize.md, fontWeight: '700', color: theme.ink, textAlign: 'center' },
  failed: { fontSize: fontSize.sm, fontWeight: '700', color: theme.amber, textAlign: 'center' },
  actions: { gap: space.lg, paddingBottom: space.xl, marginTop: space.xl },
  primary: {
    height: 52,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.ink,
  },
  primaryLabel: { color: theme.paper, fontSize: fontSize.sm, fontWeight: '700' },
  secondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryLabel: { color: theme.ink, fontSize: fontSize.sm, fontWeight: '700', opacity: 0.8 },
  off: { opacity: 0.35 },
  body: { fontSize: fontSize.sm, fontWeight: '600', color: theme.ink },
  retry: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.round, backgroundColor: theme.ink },
  retryLabel: { color: theme.paper, fontWeight: '700' },
});
