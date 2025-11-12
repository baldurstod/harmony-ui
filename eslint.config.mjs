import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "src/nevergenerics.ts",
    ],
  },
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylistic,
  {
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/consistent-type-definitions": "off",
    }
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
