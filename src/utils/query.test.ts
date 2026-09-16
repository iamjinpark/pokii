import { shouldRetryQuery, signOutIfSessionDead } from './query';

// jest.mock 팩토리는 스코프 밖 변수를 못 본다. mock 접두어가 붙은 것만 허용된다.
const mockGetSession = jest.fn();
const mockSignOut = jest.fn(async (_options?: unknown) => undefined);
jest.mock('@/utils/supabase', () => ({
  // 값을 바로 넘기면 팩토리 실행 시점에 아직 초기화 전이라 undefined가 박힌다. 늦게 부른다.
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: (options?: unknown) => mockSignOut(options),
    },
  },
}));

const err = (code: string) => ({ code }) as unknown as Error;
const session = (expiresAt: number) => ({ data: { session: { expires_at: expiresAt } } });
const soon = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

beforeEach(() => {
  mockGetSession.mockReset();
  mockSignOut.mockReset();
  // mockReset은 구현까지 지운다. signOut은 await 대상이라 Promise를 돌려줘야 한다.
  mockSignOut.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

describe('shouldRetryQuery', () => {
  it('권한·JWT 거부는 재시도하지 않는다', () => {
    expect(shouldRetryQuery(0, err('42501'))).toBe(false);
    expect(shouldRetryQuery(0, err('PGRST301'))).toBe(false);
  });

  it('그 밖의 오류는 두 번까지 재시도한다', () => {
    expect(shouldRetryQuery(0, err('08006'))).toBe(true);
    expect(shouldRetryQuery(2, err('08006'))).toBe(false);
  });
});

describe('signOutIfSessionDead', () => {
  it('JWT가 거부되면 세션 상태와 무관하게 로그아웃시킨다', async () => {
    mockGetSession.mockResolvedValue(session(soon));
    await signOutIfSessionDead(err('PGRST301'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('세션이 없는데 권한 거부면 로그아웃시킨다', async () => {
    await signOutIfSessionDead(err('42501'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('만료된 세션이 남아 있어도 로그아웃시킨다', async () => {
    mockGetSession.mockResolvedValue(session(past));
    await signOutIfSessionDead(err('42501'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('살아있는 세션에서의 권한 거부는 진짜 권한 문제다 — 로그아웃시키지 않는다', async () => {
    mockGetSession.mockResolvedValue(session(soon));
    await signOutIfSessionDead(err('42501'));
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('이 기기만 로그아웃시킨다 — 다른 기기 세션을 폐기하면 안 된다', async () => {
    await signOutIfSessionDead(err('PGRST301'));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('인증과 무관한 오류는 건드리지 않는다', async () => {
    await signOutIfSessionDead(err('23505'));
    await signOutIfSessionDead(new Error('network'));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
