import "dotenv/config";
import { z } from "zod";

/**
 * Single source of truth for configuration. `process.env` is parsed with zod
 * once, at import time, and the app crashes immediately with a readable list
 * of problems if anything is missing or malformed. Always read config through
 * `ENV` - never touch `process.env` elsewhere (the seed scripts are the only
 * exception).
 */

/** Treats `KEY=` (present but empty) the same as the key being absent. */
const emptyAsUnset = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

/** "true"/"false" strings -> boolean, with a default when unset. */
const booleanString = (fallback: boolean) =>
  z.preprocess(
    (value) =>
      value === undefined || value === "" ? fallback : value === "true",
    z.boolean(),
  );

/** `15m`, `7d`, ... - the format consumed by jsonwebtoken and tokens.ts. */
const DURATION = /^\d+[smhd]$/;

const envSchema = z
  .object({
    // Server
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: emptyAsUnset(z.coerce.number().int().min(1).max(65535).default(4000)),
    APP_NAME: emptyAsUnset(z.string().min(1).default("Backend Boilerplate")),
    CORS_ORIGINS: emptyAsUnset(z.string().default("http://localhost:3000")).pipe(
      z
        .string()
        .transform((value) =>
          value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
        ),
    ),
    TRUST_PROXY: emptyAsUnset(z.coerce.number().int().min(0).default(0)),
    LOG_TO_FILE: booleanString(false),

    // Data stores
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),

    // Auth
    JWT_SECRET: z.string().min(32),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    ACTION_TOKEN_SECRET: z.string().min(32),
    JWT_EXPIRY: emptyAsUnset(z.string().regex(DURATION).default("15m")),
    REFRESH_TOKEN_EXPIRY: emptyAsUnset(z.string().regex(DURATION).default("7d")),
    REQUIRE_EMAIL_VERIFICATION: booleanString(true),

    // Email (SMTP). Required in production; unset elsewhere = log only.
    SMTP_HOST: emptyAsUnset(z.string().optional()),
    SMTP_PORT: emptyAsUnset(z.coerce.number().int().default(587)),
    SMTP_SECURE: booleanString(false),
    SMTP_USER: emptyAsUnset(z.string().optional()),
    SMTP_PASSWORD: emptyAsUnset(z.string().optional()),
    EMAIL_FROM: emptyAsUnset(z.string().email().default("no-reply@example.com")),

    // Seed scripts
    ADMIN_EMAIL: emptyAsUnset(z.string().email().optional()),
    ADMIN_PASSWORD: emptyAsUnset(z.string().min(8).optional()),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

export const ENV = parsed.data;
export type Env = typeof ENV;
