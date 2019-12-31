// @ts-check

"use strict";

// tslint:disable-next-line: no-var-requires
const path = require("path");
// tslint:disable-next-line: no-var-requires no-implicit-dependencies
const LicenseWebpackPlugin = require("license-webpack-plugin").LicenseWebpackPlugin;

// tslint:disable-next-line: jsdoc-format
/**@type {import("webpack").Configuration}*/
const config = {
  devtool: "source-map",
  entry: "./src/extension.ts",
  externals: {
    vscode: "commonjs vscode",
  },
  module: {
    rules: [{
      exclude: /node_modules/,
      test: /\.ts$/,
      use: [{
        loader: "ts-loader",
        options: {
          compilerOptions: {
            module: "es6",
          },
        },
      }],
    }],
  },
  output: {
    devtoolModuleFilenameTemplate: "../[resource-path]",
    filename: "extension.js",
    libraryTarget: "commonjs2",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new LicenseWebpackPlugin({
      addBanner: true,
      handleMissingLicenseText: (packageName, licenseType) => {
        // tslint:disable-next-line: no-console
        console.log("Cannot find license for " + packageName + " (" + licenseType + ")");
        return licenseType;
      },
      perChunkOutput: true,
      preferredLicenseTypes: ["MIT", "ISC"],
      stats: {
        errors: true,
        warnings: false,
      },
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
  target: "node",
};

module.exports = config;
