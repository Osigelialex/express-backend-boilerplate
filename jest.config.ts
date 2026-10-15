import type { Config } from "jest";

/**
 * Unit tests: fast, no Postgres/Redis required (they mock or fake them).
 * E2E tests (`*.e2e.test.ts`) have their own config: jest.e2e.config.ts.
 */
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "\\.e2e\\.test\\.ts$"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  // Loads .env.test so tests never read your development .env.
  setupFiles: ["<rootDir>/src/__tests__/setup.env.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
    "!src/index.ts",
  ],
  coverageDirectory: "coverage",
};

export default config;
