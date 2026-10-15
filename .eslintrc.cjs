/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier", // must be last: turns off rules that conflict with Prettier
  ],
  env: { node: true, es2022: true, jest: true },
  ignorePatterns: ["dist", "coverage", "node_modules", "*.cjs"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // Boundaries (Express, Prisma, sockets) legitimately deal with `any`.
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-namespace": "off", // needed for `declare global`
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  overrides: [
    {
      // Seed scripts talk to the terminal directly.
      files: ["scripts/**/*.ts"],
      rules: { "no-console": "off" },
    },
  ],
};
