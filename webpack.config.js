const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/index.ts",
  devtool: "inline-source-map", // helpful for debugging TS
  devServer: {
    static: './dist',
    hot: true,
    port: 3000
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|jpeg|gif|obj|glb|gltf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true // cleans dist folder on build
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './test_files/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "test_files/public", to: "assets" } // copies everything from public/ to dist/
      ]
    })
  ]
};
