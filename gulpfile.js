var gulp = require("gulp");
var inno = require("gulp-inno");
var electron = require("gulp-electron");
var fs = require("fs");

// var gnf = require("./npm-files");
var pkg = require("./package.json");
var compileDir = "./compile";

gulp.task("version", function () {
  // FIXME(ssx): https://github.com/gulpjs/gulp/blob/master/docs/writing-a-plugin/README.md
  var pkg = require("./package.json");
  fs.writeFileSync(
    "version.json",
    JSON.stringify({
      version: pkg.version,
    })
  );
});

gulp.task("copy", ["version", "copy:modules"], function () {
  return gulp
    .src(["*.js", "package.json", "index.html", "icons/**/*"], { base: "./" })
    .pipe(gulp.dest(compileDir));
});

gulp.task("copy:modules", function () {
  // return gulp.src(gnf(), { base: "./" }).pipe(gulp.dest(compileDir));
});

gulp.task("electron", ["copy"], function () {
  return gulp
    .src("")
    .pipe(
      electron({
        src: "./compile",
        release: "./release",
        cache: "./.cache",
        packageJson: pkg,
        packaging: false,
        version: "v1.3.1",
        platforms: ["win32-x64"], //'darwin-x64'],
        asar: true,
        asarUnpackDir: "vendor",
        platformResources: {
          win: {
            "version-string": pkg.version,
            "file-version": pkg.version,
            "product-version": pkg.version,
            icon: "icons/app.ico",
          },
          darwin: {
            CFBundleDisplayName: pkg.name,
            CFBundleIdentifier: pkg.name,
            CFBundleName: pkg.name,
            CFBundleVersion: pkg.version,
            icon: "icons/app.icns",
          },
        },
      })
    )
    .pipe(gulp.dest(""));
});

gulp.task("inno", ["electron"], function () {
  return gulp.src("./inno.iss").pipe(inno());
});

gulp.task("default", ["copy"]);
