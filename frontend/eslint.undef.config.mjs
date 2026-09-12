// Pemeriksa "variabel tidak terdefinisi" (no-undef) untuk src/.
//
// Kenapa ada: build CRA (craco) TIDAK menangkap variabel yang belum dideklarasikan
// (mis. `const [orderType, setOrderType] = ...` yang tidak sengaja terhapus), sehingga
// halaman yang memakainya blank total di APK/WebView dengan
// "Uncaught ReferenceError: X is not defined" — hal ini pernah terjadi di POS.jsx.
// Jalankan `yarn check:undef` sebelum rilis frontend.
import globals from "globals";

// Stub plugin: banyak file memakai // eslint-disable-next-line react-hooks/exhaustive-deps.
// Tanpa definisi rule-nya, ESLint melaporkan "Definition for rule ... was not found" (bukan
// masalah kode) dan mengaburkan temuan no-undef yang sesungguhnya.
const stubHooks = {
  rules: {
    "exhaustive-deps": { meta: { schema: [] }, create: () => ({}) },
    "rules-of-hooks": { meta: { schema: [] }, create: () => ({}) },
  },
};

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { "react-hooks": stubHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { "no-undef": "error" },
  },
];
