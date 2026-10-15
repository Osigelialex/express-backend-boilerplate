/**
 * URL prefix for the current API version. All business routes mount under it
 * (see routes/v1/index.ts). When a breaking change is needed, add a `v2`
 * router next to `v1` instead of changing existing contracts.
 */
export const API_VERSION_PREFIX = "/v1";
