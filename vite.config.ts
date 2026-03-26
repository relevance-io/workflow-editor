import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

const isLib = process.env.BUILD_TARGET === 'lib';

export default defineConfig(
  isLib
    ? {
        // ── Library build ──────────────────────────────────────────
        build: {
          outDir: 'dist/',
          sourcemap: true,
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'WorkflowEditor',
            fileName: (format) => `index.${format}.js`,
            formats: ['es', 'cjs'],
          },
          cssCodeSplit: false,
        },
      }
    : {
        // ── App build (single HTML file) ───────────────────────────
        base: './',
        root: 'src',
        plugins: [viteSingleFile()],
        build: {
          minify: 'terser',
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true,
            mangle: {
              reserved: [
                'RectangleNode',
                'SquareNode',
                'EllipseNode',
                'CircleNode',
                'DiamondNode',
                'TriangleNode',
                'HexagonNode',
                'PentagonNode',
                'OctagonNode',
                'DiagramNode',
                'DiagramEditor',
                'Edge',
                'PathPoint',
                'EventBus',
              ],
            },
          },
          outDir: '../dist',
          sourcemap: false,
        },
        optimizeDeps: {
          include: ['jointjs', 'dagre'],
        },
      },
);
