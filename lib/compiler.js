var path = require('path');
var hashGenerator = require('hasha');
var _ = require('underscore');
var loaderUtils = require('loader-utils');
const globby = require('globby');
const resolvePkg = require('resolve-pkg');
const queryString = require('query-string');

var mapcache = require('./mapcache');

module.exports = function(options) {
  return function(id, tokens, pathToTwig) {
    var includes = [];
    var resourcePath = mapcache.get(id);

    var processDependency = function(token) {
      includes.push(token.value);
      token.value = hashGenerator(path.resolve(path.dirname(resourcePath), token.value));
    };

    var processToken = function(token) {
      if (token.type === 'logic' && token.token.type) {
        switch(token.token.type) {
          case 'Twig.logic.type.block':
          case 'Twig.logic.type.if':
          case 'Twig.logic.type.elseif':
          case 'Twig.logic.type.else':
          case 'Twig.logic.type.for':
          case 'Twig.logic.type.spaceless':
          case 'Twig.logic.type.macro':
            _.each(token.token.output, processToken);
            break;
          case 'Twig.logic.type.extends':
          case 'Twig.logic.type.include':
            _.each(token.token.stack, processDependency);
            break;
          case 'Twig.logic.type.embed':
            _.each(token.token.output, processToken);
            _.each(token.token.stack, processDependency);
            break;
          case 'Twig.logic.type.import':
          case 'Twig.logic.type.from':
            if (token.token.expression !== '_self') {
              _.each(token.token.stack, processDependency);
            }
            break;
        }
      }
    };

    var parsedTokens = JSON.parse(tokens);

    _.each(parsedTokens, processToken);

    var opts = Object.assign({}, options.twigOptions, {
      id,
      data: parsedTokens,
      allowInlineIncludes: true,
      rethrow: true,
    });


    var output = [];
    output.deps = []; // store any Twig dependencies found so we can register w/ Webpack 

    // store the raw JS logic that makes the request to the API service
    output.raw = [
      'const fs = require("fs");\n',
      'const template = fs.readFileSync("' + resourcePath + '", "utf8");\n',
      'var fetch = require("node-fetch").default;\n',
      'var qs = require("query-string");\n',
      '  async function renderTwig(templatePath, data){\n',
      '    console.log("Rendering PHP version of Twig through Webpack...");\n',
      '    const req = qs.stringify({ templatePath })\n',
      '    const options = { method: data ? "POST" : "GET" }; \n',
      '    if (data) options.body = JSON.stringify(data);\n',

          // @todo: update to not use a hard-coded port + URL
      '    const resp = await fetch(`http://localhost:8087?${req}`, options);\n',
      '    const html = await resp.text();\n',
      '    return { html };\n',
      '  }\n',
      ' \n',
      'module.exports = function(context) {\n',
      '  const data = context ? { htmlWebpackPlugin: context.htmlWebpackPlugin }: null;\n',
      '  return renderTwig(template, data).then((result) => {\n',
      '    return result.html;\n',
      '  });\n',
      '}\n',
    ];


    // @todo: refactor and revisit to make sure non-Twig namespaced Twig paths can be located 
    // Make sure paths we can't find simply don't get registered w/ Webpack vs break
    if (includes.length > 0) {
      _.each(_.uniq(includes), function(file) {
        const twigNamespace = file.split('/')[0];
        const twigFile = file.split('/')[1];
        const pkg = options.twigOptions.namespaces[twigNamespace];

        var pkgDir = resolvePkg(pkg, {
          cwd: __dirname,
        });

        const twigPaths = globby.sync(`${pkgDir}/**/${twigFile}`);

        output.deps.unshift(twigPaths[0]);
      });
    }

    return output;
  };
};
