const Twig = require('twig');
const path = require('path');
const hashGenerator = require('hasha');
const mapcache = require('./mapcache.js');
const processTwigTemplate = require('./compiler.js');
const loaderUtils = require('loader-utils');

Twig.cache(false);

module.exports = async function (content) {
  const loader = Object.assign({}, this);

  const callback = this.async();

  loader.cacheable && loader.cacheable();

  const options = loaderUtils.getOptions(this);
  options.baseDir = loader.rootContext;

  const filePath = loader.resourcePath;
  const id = hashGenerator(filePath);

  mapcache.set(id, filePath);


  // @todo: perhaps wrap in a try/catch to work around path issues?
  let tpl = Twig.twig({
    id,
    path: filePath,
    data: content,
    allowInlineIncludes: true,
  });

  tpl = await processTwigTemplate(options, tpl.id, tpl.tokens);


  // Add dependencies found via Twig.js walking through the dependency graph and register w/ Webpack
  if (tpl.deps){
    tpl.deps.forEach(dep => {
      loader.addDependency(dep);
    });
  }

  callback(null, tpl.raw);
};
