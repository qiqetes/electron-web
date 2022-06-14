module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  // Put your normal webpack config below here
  entry: {
    "main/index": "./src/index.ts",
    "libs/ThreadStreaming": "./src/libs/ThreadStreaming.ts",
  },
  output: {
    path: require("path").resolve(__dirname, ".webpack"),
    filename: "[name].js",
  },
  // output: {
  //   path: require("path").resolve(__dirname + ".webpack", "main"),
  //   filename: "[name].js",
  //   libraryTarget: "commonjs2",
  //   devtoolModuleFilenameTemplate: "[absolute-resource-path]",
  // },
  module: {
    rules: require("./webpack.rules"),
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
