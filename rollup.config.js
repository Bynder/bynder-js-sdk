import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import pkg from './package.json';

export default [
  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/index.js',
    external: [
      'axios',
      'bufferutil',
      'crypto',
      'events',
      'http',
      'https',
      'is-url',
      'net',
      'path',
      'proper-url-join',
      'query-string',
      'simple-oauth2',
      'stream',
      'tls',
      'url',
      'utf-8-validate',
      'uuid',
      'zlib',
      'fs'
    ],
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        exports: 'auto'
      },
      {
        file: pkg.module,
        format: 'es'
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      json()
    ]
  }
];
