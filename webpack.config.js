var webpack = require('webpack');
var config = {};

function generateConfig(name) {
  var uglify = name.indexOf('min') > -1;
  var config = {
    entry: './index.js',
    output: {
      path: __dirname + '/dist/',
      filename: name + '.js',
      sourceMapFilename: name + '.map',
      library: 'pagepanpinch',
      libraryTarget: 'umd'
    },
    node: {
      process: false
    },
    devtool: 'source-map'
  };

  config.plugins = [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': "production"
    })
  ];

  if (uglify) {
    config.plugins.push(
      new webpack.optimize.UglifyJsPlugin({
        compressor: {
          warnings: false
        }
      })
    );
  }

  return config;
}

['page-pan-pinch', 'page-pan-pinch.min'].forEach(function (key) {
  config[key] = generateConfig(key);
});

module.exports = config;
