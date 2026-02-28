import { beforeEach, describe, expect, it, vi } from 'vitest';

let requestInterceptor: ((config: any) => any) | undefined;
let responseErrorInterceptor: ((error: any) => Promise<never>) | undefined;

const mockAxiosInstance = {
  interceptors: {
    request: {
      use: vi.fn((onFulfilled: (config: any) => any) => {
        requestInterceptor = onFulfilled;
        return 0;
      }),
    },
    response: {
      use: vi.fn((_: unknown, onRejected: (error: any) => Promise<never>) => {
        responseErrorInterceptor = onRejected;
        return 0;
      }),
    },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
  AxiosError: class AxiosError extends Error {},
}));

describe('api client interceptors', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requestInterceptor = undefined;
    responseErrorInterceptor = undefined;
    window.history.pushState({}, '', '/');
  });

  it('injects bearer token into request headers', async () => {
    const { setAuthStoreCallbacks } = await import('../client');
    setAuthStoreCallbacks(() => 'token-123', vi.fn());

    const config = requestInterceptor?.({ headers: {} });

    expect(requestInterceptor).toBeDefined();
    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('clears auth and redirects to /login on 401', async () => {
    const { setAuthStoreCallbacks } = await import('../client');
    const clearAuth = vi.fn();
    setAuthStoreCallbacks(() => 'token-123', clearAuth);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      responseErrorInterceptor?.({
        response: { status: 401, data: { message: 'Unauthorized' } },
        message: 'request failed',
      })
    ).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });

    expect(responseErrorInterceptor).toBeDefined();
    expect(clearAuth).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('does not clear auth on non-401 errors', async () => {
    const { setAuthStoreCallbacks } = await import('../client');
    const clearAuth = vi.fn();
    setAuthStoreCallbacks(() => 'token-123', clearAuth);

    await expect(
      responseErrorInterceptor?.({
        response: { status: 500, data: { message: 'Server Error' } },
        message: 'request failed',
      })
    ).rejects.toMatchObject({
      status: 500,
      message: 'Server Error',
    });

    expect(clearAuth).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
  });
});
