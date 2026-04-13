import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages では /<repo>/ 配下に配置される。
// 本番ビルド時のみ base を切り替える。
export default defineConfig(({ command }) => ({
  plugins: [svelte(), tailwindcss()],
  base: command === "build" ? "/training-tracker/" : "/",
  server: {
    port: 5173,
    strictPort: false,
  },
}));
