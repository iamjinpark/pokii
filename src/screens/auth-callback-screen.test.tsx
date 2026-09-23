import { render, waitFor } from '@testing-library/react-native';
import AuthCallbackScreen from './auth-callback-screen';

const mockUseURL = jest.fn();
const mockReplace = jest.fn();
const mockSetSession = jest.fn();
const mockMaybeComplete = jest.fn();

jest.mock('expo-linking', () => ({ useURL: () => mockUseURL() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: () => mockMaybeComplete() }));
jest.mock('@/utils/supabase', () => ({
  supabase: { auth: { setSession: (...a: unknown[]) => mockSetSession(...a) } },
}));

beforeEach(() => {
  mockUseURL.mockReset();
  mockReplace.mockReset();
  mockSetSession.mockReset();
  mockMaybeComplete.mockReset();
  mockSetSession.mockResolvedValue({ error: null });
  mockMaybeComplete.mockReturnValue({ type: 'success', message: '' });
});

describe('AuthCallbackScreen (네이티브 딥링크 경로)', () => {
  it('토큰이 없는 딥링크면 로그인으로 돌아간다', async () => {
    mockUseURL.mockReturnValue('pokii://auth-callback');
    render(<AuthCallbackScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('거부(access_denied)로 돌아와도 로그인으로 간다', async () => {
    mockUseURL.mockReturnValue('pokii://auth-callback#error=access_denied');
    render(<AuthCallbackScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('토큰이 있으면 세션을 만들고 나무로 간다', async () => {
    mockUseURL.mockReturnValue('pokii://auth-callback#access_token=aaa&refresh_token=bbb');
    render(<AuthCallbackScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'aaa', refresh_token: 'bbb' });
  });

  it('setSession이 실패하면 로그인으로 돌아간다', async () => {
    mockUseURL.mockReturnValue('pokii://auth-callback#access_token=aaa&refresh_token=bbb');
    mockSetSession.mockResolvedValue({ error: new Error('bad token') });
    render(<AuthCallbackScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('URL이 아직 없으면 아무것도 하지 않는다', async () => {
    mockUseURL.mockReturnValue(null);
    render(<AuthCallbackScreen />);
    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
