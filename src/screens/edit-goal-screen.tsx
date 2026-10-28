import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, type TextInput as RNTextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useUpdateGoal } from '@/hooks/use-goal-mutations';
import { t } from '@/i18n';
import { space, theme } from '@/theme';
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
  const tagInput = useRef<RNTextInput>(null);

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
        <Text style={styles.ink}>{t('common.error.network')}</Text>
        <Button size="M" label={t('common.retry')} onPress={() => refetch()} style={styles.centered} />
      </View>
    );
  }

  const title = editedTitle ?? bunch.title;
  const tag = editedTag ?? bunch.tag;
  const count = { title: charCount(title.trim()), tag: charCount(tag.trim()) };
  const changed = title !== bunch.title || tag !== bunch.tag;
  const saving = update.isPending;
  const ready = canCreateGoal(title, tag) && changed && !saving;

  const save = () => {
    if (!ready) return;
    update.mutate({ title: title.trim(), tag: tag.trim() }, { onSuccess: back });
  };

  return (
    <ScreenFrame
      title={t('goal.edit.title')}
      onClose={saving ? undefined : back}
      footer={<Button label={t('goal.edit.save')} onPress={save} disabled={!ready} busy={saving} />}
    >
      <View style={styles.fields}>
        <Field
          label={t('field.goal')}
          value={title}
          onChangeText={setEditedTitle}
          editable={!saving}
          multiline
          // 여러 줄 칸이지만 완료 키는 줄을 바꾸지 않고 짧은 이름 칸으로 넘어간다.
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => tagInput.current?.focus()}
          count={count.title}
          max={TITLE_MAX}
        />
        <Field
          ref={tagInput}
          label={t('goal.new.tagLabel')}
          value={tag}
          onChangeText={setEditedTag}
          editable={!saving}
          returnKeyType="done"
          onSubmitEditing={save}
          count={count.tag}
          max={TAG_MAX}
        />
      </View>
      {update.isError ? <Text style={styles.failed}>{t('goal.edit.failed')}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.sky, gap: space.lg },
  centered: { alignSelf: 'center' },
  ink: { color: theme.ink },
  fields: { gap: space.xl },
  failed: { marginTop: space.lg, color: theme.amber },
});
