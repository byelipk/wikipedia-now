var path = require('path');

module.exports = {
  entry: {
    "app": "./src/js/app/index.js",
  },
  output: {
    filename: '[name]/bundle.js',
    path: path.resolve(__dirname, 'dist/js')
  }
};
