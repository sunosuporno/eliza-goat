import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: [
        "dotenv",
        "fs",
        "path",
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "viem",
        "@lifi/sdk",
    ],
    dts: true,
    splitting: false,
    esbuildOptions(options) {
        options.target = "esnext";
    },
    treeshake: true,
    esbuildPlugins: [],
    loader: {
        ".ts": "ts",
    },
});
