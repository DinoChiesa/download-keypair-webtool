// Copyright © 2020-2024 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
/* global process */

const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const childProcess = require("child_process");
const packageVersion = require("./package.json").version;
const buildVersion = childProcess
  .execSync("git rev-list HEAD --count")
  .toString();

function makeConfig(mode) {
  let config = {
    entry: ["./src/js/app.js", "./src/scss/app.scss"],

    target: "web",

    output: {
      path: path.resolve("dist"),
      filename: "js/main.js"
    },

    module: {
      rules: [
        {
          test: /\.(woff(2)?|eot|ttf|otf|svg|png)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // in bytes
            }
          },
          generator: {
            // the file path to use when emitting a file
            filename: "assets/[hash][ext][query]"
          }
        },
        {
          test: /\.scss$/,
          use: [
            "style-loader",
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                esModule: false,
                publicPath: "../" // prepend this to url() in the CSS
              }
            },
            "css-loader",
            "sass-loader"
          ]
        }
      ]
    },

    plugins: [
      new CopyPlugin({
        patterns: [{ from: "src/index.html", to: "index.html" }]
      }),

      /* use jQuery as Global */
      new webpack.ProvidePlugin({
        jQuery: "jquery",
        $: "jquery",
        "window.jQuery": "jquery",
        Popper: ["popper.js", "default"]
      }),
      new MiniCssExtractPlugin({
        filename: "css/[name].css"
      }),
      new webpack.DefinePlugin({
        BUILD_VERSION: JSON.stringify(packageVersion + "." + buildVersion)
      })
    ]
  };

  if (mode === "development") {
    config.devtool = "source-map";
    config.output.sourceMapFilename = "[file].map";
  }

  return config;
}

module.exports = (env, argv) => {
  return makeConfig(argv.mode);
};
