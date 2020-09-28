import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import pkg from "./package.json";

export default [
  // browser-friendly UMD build
	// {
	// 	input: "src/bynder-js-sdk.js",
	// 	output: {
	// 		name: "Bynder",
	// 		file: pkg.browser,
	// 		format: "umd"
  //   },
  //   globals: {
  //     axios: "axios", // accessible globals
  //   },
	// 	plugins: [
  //     nodePolyfills(),
  //     resolve({
  //       browser: true,
  //       main: true,
  //       preferBuiltins: true,
  //       jsnext: true
  //     }),
  //     commonjs({
  //       include: "node_modules/**"
  //     }),
  //     json(),
  //     babel({
  //       exclude: "node_modules/**",
  //       babelHelpers: "bundled",
  //       presets: [["@babel/preset-env", {useBuiltIns: "entry", corejs: 3}]]
  //     }),
  //     // terser()
	// 	]
	// },

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it"s quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify
	// `file` and `format` for each target)
	{
		input: "src/bynder-js-sdk.js",
		external: ["isomorphic-form-data", "axios", "path", "is-url", "proper-url-join", "query-string", "simple-oauth2", "url"],
		output: [
			{
        file: pkg.main,
        format: "cjs",
        exports: "auto"
      },
			{
        file: pkg.module,
        format: "es"
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      json()
    ]
	}
];