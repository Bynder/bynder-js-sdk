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
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
    .pipe(gulp.dest("src"));
});

gulp.task("babel", () => {
  gulp
    .src("src/*.js")
    .pipe(
      babel({
        presets: ["env"],
        plugins: ["transform-object-rest-spread",
            ["transform-runtime", {
                "polyfill": false,
                "regenerator": true
                }
            ]
        ]
      })
    )
    .pipe(gulp.dest("dist"));
});

gulp.task("build", () => {
  webpack({
    entry: ["babel-polyfill", path.join(__dirname, "src/bynder-js-sdk")],
    output: {
      path: "./dist/",
      filename: "bundle.js",
      library: "Bynder"
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "babel-loader",
          query: {
            presets: ["env"],
            plugins: ["transform-object-rest-spread"]
          }
        },
        {
          test: /\.json$/,
          loader: "json-loader"
        }
      ]
    },
    resolve: {
      extensions: ["", ".js"]
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
