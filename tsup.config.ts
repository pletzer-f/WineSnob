import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  target: 'es2020',
  outDir: 'dist',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
})
