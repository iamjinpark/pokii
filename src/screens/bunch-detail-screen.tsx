import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Grape } from '@/components/grape';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useDeleteGoal, useGoalFootprint } from '@/hooks/use-goal-mutations';
import { useToday } from '@/hooks/use-today';
import { t } from '@/i18n';
import { theme } from '@/theme';
import {
  bunchDates,
  footerKey,
  grapeStateFor,
  startLabel,
  type GrapeState,
} from '@/utils/bunch';

/** 탭하면 하루 기록 화면이 열리는 상태 (스펙 7.4). 놓침·미래는 아무 일도 일어나지 않는다. */
const OPENABLE = new Set<GrapeState>(['filled', 'today', 'yesterday']);

export default function BunchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: bunch, isLoading, isError, refetch } = useCurrentBunch(id);
  // 메뉴와 삭제 확인은 이 화면 안에서 연다. Alert은 웹에서 뜨지 않는다.
  const [menu, setMenu] = useState<'closed' | 'open' | 'confirm'>('closed');
  const footprint = useGoalFootprint(id, menu === 'confirm');
  const remove = useDeleteGoal(id);
  // 주소로 직접 들어오면 돌아갈 히스토리가 없다.
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // 훅이라 이른 return보다 위에 있어야 한다.
  const today = useToday();

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

  const dates = bunchDates(bunch.startedOn);
  const filled = new Set(bunch.grapes.map((g) => g.grapeDate));
  const moodOf = new Map(bunch.grapes.map((g) => [g.grapeDate, g.mood]));
  const states = dates.map((date) => grapeStateFor({ date, today, filled }));

  const key = footerKey({ startedOn: bunch.startedOn, today, filled });

  return (
    <View style={styles.root}>
      <Pressable onPress={back} style={styles.back} accessibilityLabel="뒤로">
        <Text style={styles.backLabel}>←</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.meta}>{`No.${bunch.sequence}`}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.meta}>{startLabel(bunch.startedOn)}</Text>
          <Pressable
            onPress={() => setMenu(menu === 'closed' ? 'open' : 'closed')}
            style={styles.menuButton}
            accessibilityLabel={t('goal.menu')}
          >
            <Text style={styles.menuDots}>⋯</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.title}>{bunch.title}</Text>

      {menu === 'open' ? (
        <View style={styles.menu}>
          <Pressable
            onPress={() => router.push({ pathname: '/goal/[id]/edit', params: { id } })}
            style={styles.menuItem}
            accessibilityLabel={t('goal.edit')}
          >
            <Text style={styles.menuLabel}>{t('goal.edit')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setMenu('confirm')}
            style={styles.menuItem}
            accessibilityLabel={t('goal.delete')}
          >
            <Text style={[styles.menuLabel, styles.danger]}>{t('goal.delete')}</Text>
          </Pressable>
        </View>
      ) : null}

      {menu === 'confirm' ? (
        <View style={styles.menu}>
          <Text style={styles.confirmText}>
            {footprint.data
              ? t('goal.delete.confirm', {
                  bunches: footprint.data.bunches,
                  grapes: footprint.data.grapes,
                })
              : '…'}
          </Text>
          <View style={styles.confirmRow}>
            <Pressable
              onPress={() => setMenu('closed')}
              style={styles.keep}
              accessibilityLabel={t('goal.delete.no')}
            >
              <Text style={styles.menuLabel}>{t('goal.delete.no')}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                remove.mutate(undefined, { onSuccess: () => router.replace('/') })
              }
              disabled={!footprint.data || remove.isPending}
              style={[styles.removeButton, (!footprint.data || remove.isPending) && styles.off]}
              accessibilityLabel={t('goal.delete.yes')}
            >
              <Text style={styles.removeLabel}>{t('goal.delete.yes')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.stem}>
        {dates.map((date, i) => (
          <Grape
            key={date}
            day={i + 1}
            state={states[i]}
            mood={moodOf.get(date) ?? null}
            onPress={
              OPENABLE.has(states[i])
                ? () => router.push({ pathname: '/goal/[id]/[date]', params: { id, date } })
                : undefined
            }
          />
        ))}
      </View>

      <View style={styles.footer}>{key ? <Text style={styles.body}>{t(key)}</Text> : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky, padding: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.sky,
    gap: 12,
  },
  back: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12 },
  backLabel: { fontSize: 22, fontWeight: '800', color: theme.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuButton: { paddingHorizontal: 8, paddingVertical: 4 },
  menuDots: { fontSize: 20, fontWeight: '800', color: theme.ink },
  menu: { marginTop: 12, borderRadius: 14, backgroundColor: '#fff', padding: 12, gap: 10 },
  menuItem: { paddingVertical: 8 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: theme.ink },
  danger: { color: theme.amber },
  confirmText: { fontSize: 14, fontWeight: '600', color: theme.ink, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  keep: { paddingVertical: 10, paddingHorizontal: 16 },
  removeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.amber,
  },
  removeLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  off: { opacity: 0.4 },
  meta: { fontSize: 13, fontWeight: '700', color: theme.ink, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '800', color: theme.ink, marginTop: 6 },
  stem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  footer: { paddingBottom: 20, minHeight: 24 },
  body: { fontSize: 15, fontWeight: '600', color: theme.ink },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
