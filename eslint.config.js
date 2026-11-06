// Only the recommended rules: they find real errors (undefined names, unreachable code, unused
// variables). Formatting is left to .editorconfig.
import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["**/node_modules/", "**/dist/", "**/coverage/"] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
            globals: { ...globals.browser, ...globals.node }
        },
        rules: {
            "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
        }
    }
];
