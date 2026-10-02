/* ESLint 8 config for the VoxTrail frontend. Run with `npm run lint`. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "detect" } },
  plugins: ["react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    // Props are documented in DESIGN_SYSTEM.md rather than PropTypes.
    "react/prop-types": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
  ignorePatterns: ["dist/", "node_modules/", "coverage/"],
  overrides: [
    {
      files: ["**/__tests__/**", "**/*.test.{js,jsx}", "src/test/**"],
      env: { node: true },
      globals: {
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    {
      files: ["*.config.js", "*.cjs"],
      env: { node: true },
    },
  ],
};
