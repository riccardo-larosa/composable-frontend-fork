import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import react from "@vitejs/plugin-react"

export default defineConfig({
  resolve: {
    alias: {
      "@lib": resolve(__dirname, "./lib")
    }
  },
  plugins: [
    react(),
    dts({
      root: ".",
      insertTypesEntry: true,
      exclude: [
        "/Users/robert.field/Documents/Projects/EP/muse/epcc-d2c/node_modules"
      ]
    })
  ],
  build: {
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "lib/main.ts"),
      name: "EPCC React",
      // the proper extensions will be added
      fileName: "epcc-react"
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["react", "react-dom"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "react",
          "react-dom": "ReactDom"
        }
      }
    }
  }
})