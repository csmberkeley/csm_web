const LodashModuleReplacementPlugin = require("lodash-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const path = require("path");

module.exports = (env, argv) => {
  const config = {
    entry: "./csm_web/frontend/src/index.tsx",
    output: {
      path: path.resolve(__dirname, "./csm_web/frontend/static/frontend/")
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".json", ".css", ".scss", ".sass"]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          include: path.resolve(__dirname, "./csm_web/frontend/src/"),
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          include: path.resolve(__dirname, "./csm_web/frontend/src/"),
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.svg$/,
          include: [
            path.resolve(__dirname, "./csm_web/frontend/static/frontend/"),
            path.resolve(__dirname, "./csm_web/frontend/templates/frontend/")
          ],
          use: [
            {
              loader: "@svgr/webpack",
              // Always inline styles into svg attributes because <style> tags would violate our CSP
              options: {
                svgoConfig: {
                  plugins: [
                    {
                      name: "preset-default",
                      params: {
                        overrides: {
                          inlineStyles: { onlyMatchedOnce: false }
                        }
                      }
                    }
                  ]
                }
              }
            }
          ]
        },
        {
          // scss, sass, css
          test: /\.s[ac]ss$|\.css$/i,
          include: [
            path.resolve(__dirname, "./csm_web/frontend/src/css/"),
            path.resolve(__dirname, "./csm_web/frontend/templates/frontend/")
          ],
          sideEffects: true,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                publicPath: "./csm_web/frontend/static/frontend/css/"
              }
            },
            "css-loader",
            "sass-loader"
          ]
        }
      ]
    },
    optimization: {
      minimizer: ["...", new CssMinimizerPlugin()]
    },
    watchOptions: {
      poll: 1000,
      ignored: /node_modules/
    },
    plugins: [new LodashModuleReplacementPlugin(), new MiniCssExtractPlugin()],
    externals: { react: "React", "react-dom": "ReactDOM" }
  };
  if (argv.mode === "development") {
    config.devtool = "eval-source-map";
  }
  return config;
};
