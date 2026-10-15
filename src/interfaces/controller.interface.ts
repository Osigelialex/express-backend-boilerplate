export interface HandleRequestOptions {
  /** HTTP status of the success response (default 200). */
  status?: number;
  /** Success message placed in the response envelope. */
  message?: string;
}
