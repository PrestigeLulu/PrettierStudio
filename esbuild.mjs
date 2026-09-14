import { build } from 'esbuild'
import { copyFile } from 'node:fs/promises'

const production = process.argv.includes('--production')
const shared = {
  bundle: true,
  minify: production,
  sourcemap: production ? false : 'linked',
  legalComments: 'eof',
  logLevel: 'info',
}

await Promise.all([
  build({
    ...shared,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['vscode'],
  }),
  build({
    ...shared,
    entryPoints: ['src/webview/toolkit.mts'],
    outfile: 'dist/toolkit.js',
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
  }),
])

await Promise.all([
  copyFile(
    'node_modules/@vscode/webview-ui-toolkit/LICENSE',
    'dist/toolkit.LICENSE.txt',
  ),
  copyFile('node_modules/tslib/LICENSE.txt', 'dist/tslib.LICENSE.txt'),
  copyFile('node_modules/tabbable/LICENSE', 'dist/tabbable.LICENSE.txt'),
])
