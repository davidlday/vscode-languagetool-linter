// @ts-check

"use strict";

import * as path from "path";
import LicensePlugin from "webpack-license-plugin";

// tslint:disable-next-line: jsdoc-format
/**@type {import("webpack").Configuration}*/
const config = {
  target: "webworker",
  devtool: "source-map",
  entry: "./src/extension.ts",
  externals: {
    vscode: "commonjs vscode",
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                module: "es6",
              },
            },
          },
        ],
      },
    ],
  },
  output: {
    devtoolModuleFilenameTemplate: "../[resource-path]",
    filename: "extension.js",
    libraryTarget: "commonjs2",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [new LicensePlugin({ outputFilename: "meta/licenses.json" })],
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    mainFields: ["browser", "module", "main"], // look for `browser` entry point in imported node modules
    extensions: [".ts", ".js"],
  },
};

module.exports = config;
