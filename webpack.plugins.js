const webpack = require("webpack");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = [
  new ForkTsCheckerWebpackPlugin(),

  // Swith enviromenent variables to code that will be used in the build process
  new webpack.DefinePlugin({
    "process.env.FLAVOUR": JSON.stringify(process.env.FLAVOUR),
  }),
];
