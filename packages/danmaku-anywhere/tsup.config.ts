import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/common/components/index.ts'],
  format: 'esm',
  splitting: true,
  sourcemap: true,
  clean: true,
  outDir: 'lib',
  minify: false,
  dts: true,
})
