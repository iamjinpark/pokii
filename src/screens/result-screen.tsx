import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Container } from '@/components/container';
import { useFinishGoal, useStartNextBunch } from '@/hooks/use-close-bunch';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useToday } from '@/hooks/use-today';
import { t, type TranslationKey } from '@/i18n';
import { space, theme } from '@/theme';
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
        <Text style={styles.ink}>{t('common.error.network')}</Text>
        <Button size="M" label={t('common.retry')} onPress={() => refetch()} style={styles.centered} />
      </View>
    );
  }

  const filled = bunch.grapes.length;
  const complete = filled >= BUNCH_SIZE;
  const grade = containerFor(filled);
  const failed = finish.isError || oneMore.isError;

  return (
    <ScreenFrame
      eyebrow={`No.${bunch.sequence}`}
      title={complete ? t('done.title.complete') : t('done.title.ended')}
      onClose={busy ? undefined : back}
      footer={
        <>
          <Button label={t('done.oneMore')} onPress={() => oneMore.mutate(undefined, { onSuccess: toTree })} disabled={busy} busy={busy} />
          <Button kind="text" label={t('done.finish')} onPress={() => finish.mutate(undefined, { onSuccess: toTree })} disabled={busy} busy={busy} />
        </>
      }
    >
      <View style={styles.result}>
        <Container grade={grade} />
        {filled >= SHOW_COUNT_FROM ? (
          <>
            <Text variant="display" style={styles.count}>{`${filled} / ${BUNCH_SIZE}`}</Text>
            <Text variant="body" style={styles.grade}>{t(GRADE_KEY[grade])}</Text>
          </>
        ) : (
          <Text variant="body" style={styles.encourage}>{t('done.encourage')}</Text>
        )}
      </View>

      {failed ? <Text variant="body" style={styles.failed}>{t('done.failed')}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.sky, gap: space.lg },
  centered: { alignSelf: 'center' },
  ink: { color: theme.ink },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  count: { color: theme.ink },
  grade: { color: theme.vine },
  encourage: { color: theme.ink, textAlign: 'center' },
  failed: { color: theme.amber, textAlign: 'center' },
});
