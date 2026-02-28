import { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce, useRuleValidation } from '../useRuleValidation';

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    post: mockPost,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useRuleValidation', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('debounce cancellation prevents execution', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    const cancel = debounced('payload');
    cancel();
    vi.advanceTimersByTime(120);

    expect(fn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('uses cached validation result for repeated payload', async () => {
    mockPost.mockResolvedValue({ data: { valid: true } });

    const { result } = renderHook(() => useRuleValidation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.validate({ ruleType: 'filter', rule: '  ||example.com^  ' });
    });

    await waitFor(() => expect(result.current.result).toEqual({ valid: true }));
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/rules/validate', {
      type: 'filter',
      rule: '||example.com^',
    });

    act(() => {
      result.current.validate({ ruleType: 'filter', rule: '  ||example.com^  ' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
