const LodashModuleReplacementPlugin = require("lodash-webpack-plugin");
const path = require("path");
const plugins = [new LodashModuleReplacementPlugin()];

module.exports = (env, argv) => {
  const config = {
    entry: "./csm_web/frontend/src/index.js",
    output: {
      path: path.resolve(__dirname, "./csm_web/frontend/static/frontend/")
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: "@svgr/webpack",
              // Always inline styles into svg attributes because <style> tags would violate our CSP
              options: { svgoConfig: { plugins: [{ inlineStyles: { onlyMatchedOnce: false } }] } }
            }
          ]
        }
      ]
    },
    watchOptions: {
      ignored: /node_modules/
    },
    plugins: plugins,
    externals: { react: "React", "react-dom": "ReactDOM" }
  };
  if (argv.mode === "development") {
    config.devtool = "eval-source-map";
  }
  return config;
};
