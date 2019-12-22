var webpack = require("webpack");
var LodashModuleReplacementPlugin = require("lodash-webpack-plugin");
var plugins = [
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  new LodashModuleReplacementPlugin()
];

module.exports = {
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
        use: ['@svgr/webpack'],
      },
    ]
  },
  plugins: plugins,
  externals: { react: "React", "react-dom": "ReactDOM" }
};
