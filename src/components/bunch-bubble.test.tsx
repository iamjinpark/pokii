import { fireEvent, render, screen } from '@testing-library/react-native';
import { BunchBubble } from './bunch-bubble';

jest.mock('@/i18n', () => ({ appLocale: () => 'ko' }));
// 애니메이션은 테스트에서 돌릴 필요가 없다. 리애니메이티드가 주는 테스트용 모듈을 쓴다.
// jest.mock 팩토리는 호이스팅되어 import를 쓸 수 없어 require로 불러온다.
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
/* eslint-enable @typescript-eslint/no-require-imports */

test('목표 제목을 보여 주고, 누르면 onPress를 부른다', async () => {
  const onPress = jest.fn();
  await render(<BunchBubble title="아침마다 스트레칭" x={100} y={80} onPress={onPress} />);
  expect(screen.getByText('아침마다 스트레칭')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('아침마다 스트레칭'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
