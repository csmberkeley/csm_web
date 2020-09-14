var LodashModuleReplacementPlugin = require("lodash-webpack-plugin");
var plugins = [new LodashModuleReplacementPlugin()];

module.exports = (env, argv) => {
  const config = {
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
    plugins: plugins,
    externals: { react: "React", "react-dom": "ReactDOM" }
  };
  if (argv.mode === "development") {
    config.devtool = "eval-source-map";
  }
  return config;
};
