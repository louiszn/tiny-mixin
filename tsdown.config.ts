import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "./dist",
	target: "esnext",
	format: ["esm", "cjs"],
	clean: true,
	dts: true,
});
