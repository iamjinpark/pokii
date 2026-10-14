import { signInWith, tokensFrom } from './sign-in';

// supabase 클라이언트는 AsyncStorage 네이티브 모듈을 요구한다. 순수 함수 테스트에는 필요 없다.
// jest.mock은 babel이 import 위로 끌어올리므로 위치는 무관하다.
const mockSignInWithOAuth = jest.fn();
const mockSetSession = jest.fn();
const mockOpenAuthSession = jest.fn();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...a: unknown[]) => mockSignInWithOAuth(...a),
      setSession: (...a: unknown[]) => mockSetSession(...a),
    },
  },
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...a: unknown[]) => mockOpenAuthSession(...a),
}));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'pokii://auth-callback',
}));

beforeEach(() => {
  mockSignInWithOAuth.mockReset();
  mockSetSession.mockReset();
  mockOpenAuthSession.mockReset();
  mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://provider/auth' }, error: null });
  mockSetSession.mockResolvedValue({ error: null });
});

describe('tokensFrom', () => {
  it('프래그먼트에서 두 토큰을 꺼낸다', () => {
    const url = 'pokii://auth-callback#access_token=aaa&refresh_token=bbb&expires_in=3600';
    expect(tokensFrom(url)).toEqual({ access_token: 'aaa', refresh_token: 'bbb' });
  });

  it('프래그먼트가 없으면 null', () => {
    expect(tokensFrom('pokii://auth-callback')).toBeNull();
  });

  it('취소·거부로 error만 돌아오면 null', () => {
    expect(tokensFrom('pokii://auth-callback#error=access_denied')).toBeNull();
  });

  it('refresh_token이 빠지면 null', () => {
    expect(tokensFrom('pokii://auth-callback#access_token=aaa')).toBeNull();
  });

  it('쿼리스트링에 담겨 오면 무시한다', () => {
    expect(tokensFrom('pokii://auth-callback?access_token=aaa&refresh_token=bbb')).toBeNull();
  });
});

describe('signInWith', () => {
  it('사용자가 취소하면 오류를 던지지 않고 조용히 끝난다', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
    await expect(signInWith('google')).resolves.toBeUndefined();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('창을 닫아도(dismiss) 마찬가지다', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'dismiss' });
    await expect(signInWith('google')).resolves.toBeUndefined();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('성공하면 프래그먼트의 토큰으로 세션을 만든다', async () => {
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'pokii://auth-callback#access_token=aaa&refresh_token=bbb',
    });
    await signInWith('google');
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'aaa', refresh_token: 'bbb' });
  });

  it('성공했는데 토큰이 없으면 오류다', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'pokii://auth-callback' });
    await expect(signInWith('google')).rejects.toThrow();
  });
});
