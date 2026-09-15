import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useRemoveGrape, useSaveGrape } from '@/hooks/use-grape-mutations';
import { useToday } from '@/hooks/use-today';
import { t, type TranslationKey } from '@/i18n';
import { MOODS, theme, type Mood } from '@/theme';
import { canFill } from '@/utils/bunch';
import type { IsoDate } from '@/utils/date';

const NOTE_MAX = 100;

const MOOD_KEY: Record<Mood, TranslationKey> = {
  excited: 'day.mood.excited',
  happy: 'day.mood.happy',
  calm: 'day.mood.calm',
  tired: 'day.mood.tired',
  sad: 'day.mood.sad',
};

/**
 * 포도알 하나의 기분과 메모를 다루는 전체 화면 (스펙 7.5).
 * 채우는 것과 기분을 고르는 것이 한 동작이다. 기분이 곧 알의 색이라 색을 고르지 않으면
 * 알을 그릴 수 없고, 그래서 알을 탭하면 바로 채워지지 않고 이 화면이 열린다.
 */
export default function DayRecordScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date: IsoDate }>();
  const router = useRouter();
  const today = useToday();
  const { data: bunch, isLoading, isError, refetch } = useCurrentBunch(id);
  const saveGrape = useSaveGrape(id);
  const removeGrape = useRemoveGrape(id);

  // 서버 값이 늦게 와도 사용자가 고른 것이 덮이지 않도록, 고른 값만 상태로 들고
  // 나머지는 기존 알에서 읽는다.
  const [pickedMood, setPickedMood] = useState<Mood | null>(null);
  const [typedNote, setTypedNote] = useState<string | null>(null);

  const existing = bunch?.grapes.find((g) => g.grapeDate === date);
  const mood = pickedMood ?? existing?.mood ?? null;
  const note = typedNote ?? existing?.note ?? '';

  const filled = new Set((bunch?.grapes ?? []).map((g) => g.grapeDate));
  const openable =
    bunch === undefined ||
    bunch === null ||
    existing !== undefined ||
    canFill({ date, today, startedOn: bunch.startedOn, filled });

  useEffect(() => {
    // 놓친 날이나 미래 날짜는 탭해도 이 화면이 열리지 않는다. 딥링크로 들어온 경우만
    // 여기 닿으므로 조용히 돌려보낸다.
    if (!openable) router.back();
  }, [openable, router]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // 딥링크나 새로고침으로 바로 들어오면 캐시가 없다. 조회가 실패하면 스피너로 방치하지
  // 않고 상세 화면과 같은 재시도 경로를 준다.
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

  // 실패 알림과 롤백은 mutation 정의에 있다. 여기서 mutate에 콜백을 넘기면 바로 아래
  // router.back()으로 화면이 사라져 호출되지 않는다.
  const save = () => {
    if (!mood) return;
    saveGrape.mutate({
      bunchId: bunch.id,
      date,
      mood,
      note: note.trim() || null,
      editing: existing !== undefined,
    });
    router.back();
  };

  const remove = () => {
    removeGrape.mutate(date);
    router.back();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('day.title')}</Text>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityLabel="닫기">
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        <View
          style={[styles.berry, { backgroundColor: mood ? theme.mood[mood] : theme.empty }]}
          accessibilityLabel={mood ? `미리보기 ${t(MOOD_KEY[mood])}` : '미리보기 비어 있음'}
        />
        <Text style={styles.moodName}>{mood ? t(MOOD_KEY[mood]) : ' '}</Text>
      </View>

      <View style={styles.moods}>
        {MOODS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setPickedMood(m)}
            accessibilityLabel={t(MOOD_KEY[m])}
            accessibilityState={{ selected: mood === m }}
            style={[styles.swatch, { backgroundColor: theme.mood[m] }, mood === m && styles.picked]}
          />
        ))}
      </View>

      <TextInput
        value={note}
        onChangeText={setTypedNote}
        maxLength={NOTE_MAX}
        placeholder={t('day.note.placeholder')}
        placeholderTextColor="#9AA0A6"
        style={styles.note}
        multiline
      />

      <View style={styles.actions}>
        <Pressable
          onPress={save}
          disabled={!mood}
          accessibilityLabel={t('day.save')}
          accessibilityState={{ disabled: !mood }}
          style={[styles.save, !mood && styles.saveOff]}
        >
          <Text style={styles.saveLabel}>{t('day.save')}</Text>
        </Pressable>

        {existing ? (
          <Pressable onPress={remove} style={styles.remove} accessibilityLabel={t('day.remove')}>
            <Text style={styles.removeLabel}>{t('day.remove')}</Text>
          </Pressable>
        ) : null}
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '800', color: theme.ink },
  close: { paddingVertical: 6, paddingHorizontal: 10 },
  closeLabel: { fontSize: 20, fontWeight: '800', color: theme.ink },
  preview: { alignItems: 'center', gap: 10, marginTop: 36 },
  berry: { width: 84, height: 84, borderRadius: 42 },
  moodName: { fontSize: 15, fontWeight: '700', color: theme.ink, minHeight: 20 },
  moods: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 32 },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  picked: { borderWidth: 3, borderColor: theme.ink },
  note: {
    marginTop: 32,
    minHeight: 84,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
    fontSize: 15,
    color: theme.ink,
    textAlignVertical: 'top',
  },
  actions: { marginTop: 'auto', alignItems: 'center', gap: 14, paddingBottom: 20 },
  save: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.ink,
  },
  saveOff: { opacity: 0.35 },
  saveLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  remove: { paddingVertical: 8 },
  removeLabel: { fontSize: 14, fontWeight: '700', color: theme.amber },
  body: { fontSize: 15, fontWeight: '600', color: theme.ink },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
