// @ts-check

"use strict";

import * as path from "path";
import LicensePlugin from "webpack-license-plugin";

// tslint:disable-next-line: jsdoc-format
/**@type {import("webpack").Configuration}*/
const config = {
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
    extensions: [".ts", ".js"],
  },
  target: "node",
};

module.exports = config;
