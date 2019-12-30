//@ts-check

"use strict";

const path = require("path");
const LicenseWebpackPlugin = require("license-webpack-plugin").LicenseWebpackPlugin;

/**@type {import("webpack").Configuration}*/
const config = {
    target: "node",
    entry: "./src/extension.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: "source-map",
    externals: {
        vscode: "commonjs vscode",
    },
    resolve: {
        extensions: [".ts", ".js",]
    },
    plugins: [
      new LicenseWebpackPlugin({
        addBanner: true,
        handleMissingLicenseText: (packageName, licenseType) => {
          console.log("Cannot find license for " + packageName + " (" + licenseType + ")");
          return licenseType;
        },
        perChunkOutput: true,
        preferredLicenseTypes: ["MIT", "ISC",],
        stats: {
          errors: true,
          warnings: false,
        },
      })
    ],
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: "ts-loader",
                options: {
                    compilerOptions: {
                        "module": "es6",
                    }
                }
            }]
        }]
    },
};

module.exports = config;
