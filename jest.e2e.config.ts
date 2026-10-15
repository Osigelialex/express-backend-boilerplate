import type { Config } from "jest";
import baseConfig from "./jest.config";

/**
 * End-to-end tests: real Postgres + Redis (see .env.test). The setup file
 * wipes the users table and flushes Redis before every test, so NEVER point
 * these at a database you care about. Run with `pnpm test:e2e`.
 */
const config: Config = {
  ...baseConfig,
  testMatch: ["**/__tests__/**/*.e2e.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.e2e.ts"],
  testTimeout: 20_000,
};

export default config;
