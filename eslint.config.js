import js from "@eslint/js";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["**/*.{ts,svelte}"],
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      // TypeScript (via svelte-check) handles undefined references, including
      // DOM lib types like ScrollBehavior/BufferSource that ESLint's core
      // rule doesn't know about. Disable to avoid false positives.
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
  },
  ...svelte.configs["flat/recommended"],
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["src/service-worker.ts"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  prettierConfig,
  ...svelte.configs["flat/prettier"],
  {
    ignores: ["build/", ".svelte-kit/", "dist/", "static/libarchive/"],
  },
];
