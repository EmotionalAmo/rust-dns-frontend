import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('../client', () => ({
  default: {
    get: mockGet,
  },
}));

describe('queryLog api', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('keeps zero-valued pagination params', async () => {
    const payload = { data: [], total: 0, returned: 0, offset: 0, limit: 0 };
    mockGet.mockResolvedValueOnce({ data: payload });

    const { listQueryLogs } = await import('../queryLog');
    const result = await listQueryLogs({
      limit: 0,
      offset: 0,
      domain: 'example.com',
      status: 'blocked',
      client: '10.0.0.1',
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/query-log?limit=0&offset=0&domain=example.com&status=blocked&client=10.0.0.1'
    );
    expect(result).toEqual(payload);
  });

  it('builds export query and requests blob response', async () => {
    const fakeBlob = new Blob(['demo']);
    mockGet.mockResolvedValueOnce({ data: fakeBlob });

    const { exportQueryLogs } = await import('../queryLog');
    const result = await exportQueryLogs({
      format: 'csv',
      start_time: '2026-02-25T00:00:00Z',
      end_time: '2026-02-26T00:00:00Z',
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/query-log/export?format=csv&start_time=2026-02-25T00%3A00%3A00Z&end_time=2026-02-26T00%3A00%3A00Z',
      { responseType: 'blob' }
    );
    expect(result).toBe(fakeBlob);
  });
});
