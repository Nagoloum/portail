/**
 * Pagination rules, kept as a pure function so the clamping is unit
 * testable without a repository, a request or a database (see
 * pagination.spec.ts).
 *
 * The point of the clamp is not tidiness: `limit` comes from the query
 * string, so without an upper bound a caller can ask for `?limit=1000000`
 * and turn a paginated endpoint back into the unbounded one it replaced.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function resolvePagination(input: PaginationInput = {}): ResolvedPagination {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const requested = Math.floor(input.limit ?? DEFAULT_PAGE_SIZE);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));

  return { page, limit, skip: (page - 1) * limit };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  /** Saves every caller from recomputing `page * limit < total`. */
  hasMore: boolean;
}

export function paginated<T>(items: T[], total: number, { page, limit }: ResolvedPagination): Paginated<T> {
  return { items, total, page, limit, hasMore: page * limit < total };
}
