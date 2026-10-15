import {
  PaginatedResult,
  getPagination,
  getPaginationMeta,
  paginate,
  toCursorPage,
} from "@/utils/pagination";

describe("getPagination", () => {
  it("applies defaults", () => {
    expect(getPagination()).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it("computes skip from page and limit", () => {
    expect(getPagination({ page: 3, limit: 10 })).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
      take: 10,
    });
  });

  it("accepts numeric strings (query params)", () => {
    expect(getPagination({ page: "2", limit: "5" })).toMatchObject({
      page: 2,
      limit: 5,
      skip: 5,
    });
  });

  it("falls back on junk and clamps the limit", () => {
    expect(getPagination({ page: "abc", limit: -4 })).toMatchObject({
      page: 1,
      limit: 20,
    });
    expect(getPagination({ limit: 5000 }).limit).toBe(100);
    expect(getPagination({ limit: 5000 }, { maxLimit: 50 }).limit).toBe(50);
  });
});

describe("getPaginationMeta / paginate", () => {
  it("describes the first page", () => {
    expect(getPaginationMeta(45, { page: 1, limit: 20 })).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("describes the last page and an empty result", () => {
    expect(getPaginationMeta(45, { page: 3, limit: 20 })).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(getPaginationMeta(0, { page: 1, limit: 20 })).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
    });
  });

  it("wraps items in a PaginatedResult", () => {
    const result = paginate(["a", "b"], 12, { page: 1, limit: 2 });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toEqual(["a", "b"]);
    expect(result.meta.totalPages).toBe(6);
  });
});

describe("toCursorPage", () => {
  const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];

  it("trims the extra row and returns a cursor when more remain", () => {
    expect(toCursorPage(rows, 2, (r) => r.id)).toEqual({
      items: [{ id: "1" }, { id: "2" }],
      hasMore: true,
      nextCursor: "2",
    });
  });

  it("returns no cursor on the last page", () => {
    expect(toCursorPage(rows, 3, (r) => r.id)).toEqual({
      items: rows,
      hasMore: false,
      nextCursor: null,
    });
    expect(toCursorPage([], 5, (r: { id: string }) => r.id).nextCursor).toBeNull();
  });
});
