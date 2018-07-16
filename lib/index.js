// const fetch = require('node-fetch');
const axios = require('axios');
const renderTwig = require('./render-twig');

function TwigPhpLoader(options) {
  options = options || {};
  this.outputPath = options.outputPath;
}

const HtmlWebpackPlugin = require('html-webpack-plugin');

TwigPhpLoader.prototype.apply = function (compiler) {
  var self = this;

  // if (compiler.hooks) {
  // webpack 4 support
  compiler.hooks.compilation.tap('TwigPhpLoader', function (compilation) {

    HtmlWebpackPlugin.getHooks(compilation).beforeHtmlProcessing.tapAsync(
      'TwigPhpLoader',
      (data, cb) => {

        const twigData = JSON.parse(data.html);

        if (twigData.html){
          data.html = twigData.html;
          cb(null, data);
        } else {
          const twigData = JSON.parse(data.html).data;
          const twigUrl = JSON.parse(data.html).url;

          (async () => {
            data.html = await renderTwig(twigUrl, twigData);
            cb(null, data);
          })().catch(err => {
            console.error(err);
          });
        }
      },
    );
  });
};

TwigPhpLoader.loader = require.resolve('./loader');

module.exports = TwigPhpLoader;
