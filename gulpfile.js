const gulp = require("gulp");
const eslint = require("gulp-eslint");
const babel = require("gulp-babel");
const jsdoc = require("gulp-jsdoc3");
const connect = require("gulp-connect");
const webpack = require("webpack");
const path = require("path");

gulp.task("default", () => {
  gulp.start("lint", "babel", "doc");
});

gulp.task("lint", () => {
  return gulp
    .src(["src/*.js", "!node_modules/**"])
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task("babel", async () => {
  gulp
    .src("src/*.js")
    .pipe(
      babel({
        presets: ["@babel/preset-env"],
        plugins: ["@babel/plugin-proposal-object-rest-spread",
            // polyfill skipped by default
            ["@babel/plugin-transform-runtime", {
                "regenerator": true
                }
            ]
        ]
      })
    )
    .pipe(gulp.dest("dist"));
});

gulp.task("build", async () => {
  webpack({
    entry: ["@babel/polyfill", path.join(__dirname, "./src/bynder-js-sdk")],
    output: {
      path: path.join(__dirname, "/dist/"),
      filename: "bundle.js",
      library: "Bynder"
    },
    node: {
      net: 'empty'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-proposal-object-rest-spread"],
          }
        },
        {
          test: /\.js$/,
          include: /node_modules\/proper-url-join/,
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env", { "modules": 'commonjs' }]],
            plugins: ["add-module-exports"]
          }
        }
      ]
    },
    resolve: {
      extensions: ["*", ".js"],
    }
  }).run((err, stat) => {
    if (err) {
      console.log("Error building application - ", err);
      return;
    }
    const statJson = stat.toJson();
    if (statJson.errors.length > 0) {
      console.log("Error building application - ", statJson.errors);
      return;
    }
    console.log("Application built successfully !");
  });
});

gulp.task("doc", cb => {
  gulp.src(["README.md", "src/*.js"], { read: false }).pipe(jsdoc(cb));
});

gulp.task("webserver", () => {
  connect.server({
    port: 8080
  });
});
