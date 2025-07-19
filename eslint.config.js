import js from "@eslint/js"
import ts from "typescript-eslint"

export default [
  // Recommended rules
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // ERROR
      // Enforce no semicolon for consistency
      semi: ["error", "never"],
      // Ensure consistent indentation
      indent: ["error", 2],
      // Enforce trailing commas to reduce diff noise
      "comma-dangle": ["error", "always-multiline"],
      // Enforce returning a consistent a value, or consistently nothing.
      "consistent-return": ["error", { treatUndefinedAsUnspecified: false }],

      // WARNING
      // Enforce explicit return types for functions - not for arrow expressions
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        { allowExpressions: true },
      ],
      // Highlight console.log in production code
      "no-console": "warn",
    },
  },
  // Prevent .spec.ts files - use .test.ts only
  {
    files: ["**/*.spec.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "*",
          message: ".spec.ts file found. Use .test.ts instead for consistency,",
        },
      ],
    },
  },
]
