import { z } from "zod";
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_MAX_LIMIT,
} from "@/config/constants/pagination";

/**
 * Query-string DTO for offset pagination (`?page=2&limit=20`). Extend it for
 * list endpoints that also filter:
 *
 *   export const listPostsQueryDtoSchema = paginationQueryDtoSchema.extend({
 *     published: z.enum(["true", "false"]).optional(),
 *   });
 *
 * Query values arrive as strings, hence `z.coerce`.
 */
export const paginationQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_MAX_LIMIT)
    .default(PAGINATION_DEFAULT_LIMIT),
});
export type PaginationQueryDto = z.infer<typeof paginationQueryDtoSchema>;
