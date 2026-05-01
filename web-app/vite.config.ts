import fs from "node:fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

function getAppName() {
  const constantsPath = path.resolve(__dirname, "./src/constants/index.ts")
  const constantsSource = fs.readFileSync(constantsPath, "utf8")
  const match = constantsSource.match(/export const APP_NAME = ["'](.+?)["']/)

  return match?.[1] ?? "App"
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "app-name-html-transform",
      transformIndexHtml(html) {
        return html.replace(/%APP_NAME%/g, getAppName())
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
