import { render, screen } from '@testing-library/react-native';
import { Field } from './field';

jest.mock('@/i18n', () => ({
  appLocale: () => 'ko',
  t: (key: string, p?: { max?: number }) => (key === 'field.tooLong' ? `${p?.max}자까지 쓸 수 있어요` : key),
}));

describe('Field', () => {
  test('글자 수를 넘으면 안내 대신 한도 오류를 보인다', async () => {
    await render(<Field label="짧은 이름" value="영어단어외우기" count={9} max={8} help="안내" />);
    expect(screen.getByText('8자까지 쓸 수 있어요')).toBeTruthy();
    expect(screen.queryByText('안내')).toBeNull();
    expect(screen.getByText('9/8')).toBeTruthy();
  });

  test('한도 안이면 안내와 글자 수를 보인다', async () => {
    await render(<Field label="짧은 이름" value="영어" count={2} max={8} help="안내" />);
    expect(screen.getByText('안내')).toBeTruthy();
    expect(screen.getByText('2/8')).toBeTruthy();
  });
});
