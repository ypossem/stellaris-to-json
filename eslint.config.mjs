import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  {
    'rules': {
      'quotes': ['error', 'single'],
      // we want to force semicolons
      'semi': ['error', 'always'],
      // we use 2 spaces to indent our code
      'indent': ['error', 2],
      // we want to avoid extraneous spaces
      'no-multi-spaces': ['error']
    }
  },
  ...tseslint.configs.recommended,
];