import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paginated, resolvePagination } from './pagination';

describe('resolvePagination', () => {
  it('defaults to the first page and the default size', () => {
    expect(resolvePagination()).toEqual({ page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
    expect(resolvePagination({})).toEqual({ page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(resolvePagination({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  // The reason this function exists: an unbounded `limit` from the query
  // string would turn the paginated endpoint back into "load everything".
  it('caps limit at MAX_PAGE_SIZE', () => {
    expect(resolvePagination({ limit: 1_000_000 }).limit).toBe(MAX_PAGE_SIZE);
  });

  it('floors page and limit to at least 1', () => {
    expect(resolvePagination({ page: 0, limit: 0 })).toEqual({ page: 1, limit: 1, skip: 0 });
    expect(resolvePagination({ page: -5, limit: -5 })).toEqual({ page: 1, limit: 1, skip: 0 });
  });

  it('truncates fractional input instead of producing a fractional skip', () => {
    expect(resolvePagination({ page: 2.9, limit: 10.7 })).toEqual({ page: 2, limit: 10, skip: 10 });
  });
});

describe('paginated', () => {
  it('flags more pages while the current one does not reach the total', () => {
    expect(paginated([1, 2], 5, resolvePagination({ page: 1, limit: 2 })).hasMore).toBe(true);
  });

  it('does not flag more pages on the exact last page', () => {
    expect(paginated([5], 5, resolvePagination({ page: 5, limit: 1 })).hasMore).toBe(false);
    expect(paginated([], 0, resolvePagination()).hasMore).toBe(false);
  });
});
