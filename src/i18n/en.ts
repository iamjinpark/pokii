export const en = {
  'login.google': 'Continue with Google',
  'login.kakao': 'Continue with Kakao',
  'tree.greeting': 'hello!',
  'tree.empty': 'your tree is waiting',
  'tree.collect': "let's collect today's pokii",
  'tree.done': 'all done for today',
  'tree.full.title': 'your tree is full!',
  'tree.full.body': 'finish a bunch to plant a new one',
  'common.retry': 'retry',
  'common.error.network': "couldn't reach your tree.",
} as const;

export type TranslationKey = keyof typeof en;
