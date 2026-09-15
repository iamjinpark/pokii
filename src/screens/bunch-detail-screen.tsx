import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Grape } from '@/components/grape';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { t } from '@/i18n';
import { theme } from '@/theme';
import { bunchDates, footerKey, grapeStateFor, startLabel } from '@/utils/bunch';
import { localToday } from '@/utils/date';

export default function BunchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: bunch, isLoading, isError, refetch } = useCurrentBunch(id);

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

  const today = localToday();
  const dates = bunchDates(bunch.startedOn);
  const filled = new Set(bunch.grapes.map((g) => g.grapeDate));
  const moodOf = new Map(bunch.grapes.map((g) => [g.grapeDate, g.mood]));
  const states = dates.map((date) => grapeStateFor({ date, today, filled }));

  const key = footerKey({ startedOn: bunch.startedOn, today, filled });

  return (
    <View style={styles.root}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="뒤로">
        <Text style={styles.backLabel}>←</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.meta}>{`No.${bunch.sequence}`}</Text>
        <Text style={styles.meta}>{startLabel(bunch.startedOn)}</Text>
      </View>
      <Text style={styles.title}>{bunch.title}</Text>

      <View style={styles.stem}>
        {dates.map((date, i) => (
          <Grape key={date} day={i + 1} state={states[i]} mood={moodOf.get(date) ?? null} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 13, fontWeight: '700', color: theme.ink, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '800', color: theme.ink, marginTop: 6 },
  stem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  footer: { paddingBottom: 20, minHeight: 24 },
  body: { fontSize: 15, fontWeight: '600', color: theme.ink },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
