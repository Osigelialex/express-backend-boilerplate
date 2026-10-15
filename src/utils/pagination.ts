import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_MAX_LIMIT,
} from "@/config/constants/pagination";

/**
 * Pagination helpers. Two styles are provided:
 *
 * 1. OFFSET (page + limit) - simple, supports "jump to page N" and totals.
 *    Use for admin tables and anything with a bounded size.
 *
 *      const pagination = getPagination(dto);               // { skip, take }
 *      const [rows, total] = await prisma.$transaction([
 *        prisma.user.findMany({ skip: pagination.skip, take: pagination.take }),
 *        prisma.user.count(),
 *      ]);
 *      return paginate(rows, total, pagination);            // PaginatedResult
 *
 * 2. CURSOR - stable and fast on huge/append-heavy lists (feeds, chat
 *    history). Fetch `limit + 1` rows and let `toCursorPage` trim the extra.
 *
 *      const rows = await prisma.post.findMany({
 *        take: limit + 1,
 *        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
 *        orderBy: { id: "asc" },
 *      });
 *      return toCursorPage(rows, limit, (row) => row.id);
 */

export interface PaginationInput {
  page?: number | string;
  limit?: number | string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  /** Prisma `skip` */
  skip: number;
  /** Prisma `take` */
  take: number;
}

/**
 * Wrapper that tells `BaseController.handleRequest` to answer with the
 * paginated envelope `{ success, message, data: items, meta }`.
 */
export class PaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly meta: PaginationMeta,
  ) {}
}

const toPositiveInteger = (
  value: number | string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Normalises user input into safe, clamped `skip`/`take` values. */
export const getPagination = (
  input: PaginationInput = {},
  options: { defaultLimit?: number; maxLimit?: number } = {},
): Pagination => {
  const defaultLimit = options.defaultLimit ?? PAGINATION_DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? PAGINATION_MAX_LIMIT;

  const page = toPositiveInteger(input.page, PAGINATION_DEFAULT_PAGE);
  const limit = Math.min(toPositiveInteger(input.limit, defaultLimit), maxLimit);

  return { page, limit, skip: (page - 1) * limit, take: limit };
};

export const getPaginationMeta = (
  total: number,
  pagination: Pick<Pagination, "page" | "limit">,
): PaginationMeta => {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
};

export const paginate = <T>(
  items: T[],
  total: number,
  pagination: Pick<Pagination, "page" | "limit">,
): PaginatedResult<T> =>
  new PaginatedResult(items, getPaginationMeta(total, pagination));

// ---------------------------------------------------------------------------
// Cursor pagination
// ---------------------------------------------------------------------------

export interface CursorPage<T> {
  items: T[];
  /** Pass back as `cursor` to get the next page; null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}

/** `rows` must have been fetched with `take: limit + 1`. */
export const toCursorPage = <T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): CursorPage<T> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];

  return {
    items,
    hasMore,
    nextCursor: hasMore && last !== undefined ? cursorOf(last) : null,
  };
};
