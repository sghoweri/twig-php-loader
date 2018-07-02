var Twig = require('twig');
var path = require('path');
var hashGenerator = require('hasha');
var mapcache = require('./mapcache');
var compilerFactory = require('./compiler');
var getOptions = require('./getOptions');
const fs = require('fs');
Twig.cache(false);

// var loaderUtils = require('loader-utils');
// const findPkg = require('find-pkg');

// const phpServerPort = '8087'; // Todo: 
// const fetch = require('node-fetch');
// const queryString = require('query-string');


module.exports = function (source) {
  var loader = this;

  let path = require.resolve(this.resource),
    id = hashGenerator(path),
    options = getOptions(this),
    tpl,
    fakeTpl;

  mapcache.set(id, path)
  this.cacheable && this.cacheable();

  Twig.extend(function (Twig) {
    var compiler = Twig.compiler;
    compiler.module['webpack'] = compilerFactory(options);
  });

  const file = fs.readFileSync(path, 'utf8');

  // @todo: perhaps wrap in a try/catch to work around path issues?
  tpl = Twig.twig({
    id,
    path,
    data: file,
    allowInlineIncludes: true,
  });

  tpl = tpl.compile({
    module: 'webpack',
    twig: 'twig',
  });

  // Add dependencies found via Twig.js walking through the dependency graph and register w/ Webpack 
  tpl.deps.forEach(dep => {
    loader.addDependency(require.resolve(dep));
  });

  const template = tpl.raw.join('\n');

  this.callback(null, template);

};
