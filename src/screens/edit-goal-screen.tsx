import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/text';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useUpdateGoal } from '@/hooks/use-goal-mutations';
import { t } from '@/i18n';
import { fontSize, radius, space, theme } from '@/theme';
import { canCreateGoal, charCount, TAG_MAX, TITLE_MAX } from '@/utils/goal';

/**
 * 송이 상세의 메뉴에서 들어온다 (설계 7.4).
 * 제목과 태그를 모두 고칠 수 있다 — 태그를 못 고치면 나무에 표시되는 이름을 영영 바꿀 수 없다.
 */
export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: bunch, isLoading, isError, refetch } = useCurrentBunch(id);
  const update = useUpdateGoal(id);

  // 서버 값이 늦게 와도 고친 것이 덮이지 않도록, 고친 값만 상태로 들고 나머지는 원본에서 읽는다.
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [editedTag, setEditedTag] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

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

  const title = editedTitle ?? bunch.title;
  const tag = editedTag ?? bunch.tag;
  const count = { title: charCount(title.trim()), tag: charCount(tag.trim()) };
  const over = { title: count.title > TITLE_MAX, tag: count.tag > TAG_MAX };
  const changed = title !== bunch.title || tag !== bunch.tag;
  const saving = update.isPending;
  const ready = canCreateGoal(title, tag) && changed && !saving;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('goal.edit.title')}</Text>
        {saving ? null : (
          <Pressable onPress={back} style={styles.close} accessibilityLabel="닫기">
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        value={title}
        onChangeText={setEditedTitle}
        style={styles.title}
        editable={!saving}
        multiline
        accessibilityLabel={t('goal.new.titlePlaceholder')}
      />
      <Text style={[styles.counter, over.title && styles.counterOver]}>
        {`${count.title}/${TITLE_MAX}`}
      </Text>

      <Text style={styles.label}>{t('goal.new.tagLabel')}</Text>
      <TextInput
        value={tag}
        onChangeText={setEditedTag}
        style={styles.tag}
        editable={!saving}
        accessibilityLabel={t('goal.new.tagLabel')}
      />
      <Text style={[styles.counter, over.tag && styles.counterOver]}>
        {`${count.tag}/${TAG_MAX}`}
      </Text>

      {update.isError ? <Text style={styles.failed}>{t('goal.edit.failed')}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => update.mutate({ title: title.trim(), tag: tag.trim() }, { onSuccess: back })}
          disabled={!ready}
          accessibilityLabel={t('goal.edit.save')}
          accessibilityState={{ disabled: !ready, busy: saving }}
          style={[styles.save, !ready && styles.off]}
        >
          <Text style={styles.saveLabel}>{t('goal.edit.save')}</Text>
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
  heading: { fontSize: fontSize.lg, fontWeight: '800', color: theme.ink },
  close: { paddingVertical: space.sm, paddingHorizontal: space.sm },
  closeLabel: { fontSize: fontSize.lg, fontWeight: '800', color: theme.ink },
  title: {
    marginTop: space.xl,
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: theme.paper,
    padding: space.lg,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: theme.ink,
    textAlignVertical: 'top',
  },
  label: { marginTop: space.xl, fontSize: fontSize.xs, fontWeight: '700', color: theme.ink },
  tag: {
    marginTop: space.sm,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: theme.paper,
    paddingHorizontal: space.lg,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: theme.ink,
  },
  counter: {
    marginTop: space.sm,
    alignSelf: 'flex-end',
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: theme.hint,
  },
  counterOver: { color: theme.amber },
  failed: { marginTop: space.lg, fontSize: fontSize.sm, fontWeight: '700', color: theme.amber },
  actions: { marginTop: 'auto', paddingBottom: space.xl },
  save: {
    height: 52,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.ink,
  },
  off: { opacity: 0.35 },
  saveLabel: { color: theme.paper, fontSize: fontSize.sm, fontWeight: '700' },
  body: { fontSize: fontSize.sm, fontWeight: '600', color: theme.ink },
  retry: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.round, backgroundColor: theme.ink },
  retryLabel: { color: theme.paper, fontWeight: '700' },
});
