/**
 * Stable, machine-readable error codes returned in the `code` field of error
 * responses. Clients branch on these - never on message text - so existing
 * values must not change. Add new ones at the end of their group.
 */
export enum ErrorCode {
  // Authentication (1xxx)
  UNAUTHORIZED = "ERR_1001",
  INVALID_CREDENTIALS = "ERR_1002",
  TOKEN_EXPIRED = "ERR_1003",
  INVALID_TOKEN = "ERR_1004",
  EMAIL_NOT_VERIFIED = "ERR_1005",

  // Authorization (2xxx)
  FORBIDDEN = "ERR_2001",
  INSUFFICIENT_PERMISSIONS = "ERR_2002",

  // Validation (3xxx)
  VALIDATION_ERROR = "ERR_3001",
  INVALID_REQUEST = "ERR_3002",

  // Resources (4xxx)
  NOT_FOUND = "ERR_4001",
  ALREADY_EXISTS = "ERR_4002",
  CONFLICT = "ERR_4003",

  // Database (5xxx)
  DB_ERROR = "ERR_5001",

  // Server (6xxx)
  INTERNAL_SERVER_ERROR = "ERR_6001",
  SERVICE_UNAVAILABLE = "ERR_6002",
  TOO_MANY_REQUESTS = "ERR_6004",
  PAYLOAD_TOO_LARGE = "ERR_6005",
}
