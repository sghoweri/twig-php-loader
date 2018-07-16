const path = require('path');
const hashGenerator = require('hasha');
const _ = require('underscore');
const globby = require('globby');
const resolvePkg = require('resolve-pkg');
const qs = require('query-string');
const fs = require('fs');
const mapcache = require('./mapcache.js');
const renderTwig = require('./render-twig');


module.exports = async function (options, id, parsedTokens) {
  var includes = [];
  var resourcePath = mapcache.get(id);

  var processDependency = function (token) {
    includes.push(token.value);
    token.value = hashGenerator(path.resolve(path.dirname(resourcePath), token.value));
  };

  var processToken = function (token) {
    if (token.type === 'logic' && token.token.type) {
      switch (token.token.type) {
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

  _.each(parsedTokens, processToken);

  var opts = Object.assign({}, options, {
    id,
    data: parsedTokens,
    allowInlineIncludes: true,
    rethrow: true,
  });

  const template = {
    templatePath: `${path.relative(process.cwd(), resourcePath)}`,
  };
  const url = `http://localhost:${opts.port}/api/render-twig?` + qs.stringify(template);


  var output = [];
  output.deps = []; // store any Twig dependencies found so we can register w/ Webpack


  /**
   * Based on the Twig includes, embeds, and extends tokens found, attempt to fine these dependencies
   * locally so we can add thenm to Webpack's dependency graph.
   */

  // @todo: further iterate on this to be extra sure non-Twig namespaced Twig paths can consistently be located
  if (opts.namespaces && includes.length > 0) {
    _.each(_.uniq(includes), function (file) {

      // Handle Twig includes by attempting to match up the template with the Twig Namespaces object passed into the config.
      if (file.includes('@')) {
        const twigNamespace = file.split('/')[0];
        const twigFile = file.split('/')[1];

        const pkg = opts.namespaces[twigNamespace];

        if (pkg) {
          var pkgDir = resolvePkg(pkg, {
            cwd: __dirname,
          });

          const twigPaths = globby.sync(`${pkgDir}/**/${twigFile}`);

          if (twigPaths) {
            output.deps.unshift(twigPaths[0]);
          }
        } else {
          const twigPaths = globby.sync(`${path.dirname(resourcePath)}/**/${twigFile}`);

          if (twigPaths){
            output.deps.unshift(twigPaths[0]);
          }
        }


      // 1st pass tracking down non-Twig namespaced files so Webpack can psuedo track dependencies
      } else {
        const twigPaths = globby.sync(`${path.dirname(resourcePath)}/**/${file}`, {
          cwd: opts.baseDir,
        });

        if (twigPaths) {
          output.deps.unshift(twigPaths[0]);
        }
      }
    });
  }



  if (options.includeContext) {
    output.raw = `
      module.exports = function (context) {
        return JSON.stringify({
          'template': '${resourcePath}',
          'data': context.htmlWebpackPlugin,
          url: '${url}',
        });
      }
    `;
    return output;

  } else {
    const html = await renderTwig(url, {});

    // store the raw JS logic that makes the request to the API service
    output.raw = `
        module.exports = function (context) {
          return JSON.stringify({
            'html': ${JSON.stringify(html)}
          });
        }
      `;

    return output;
  }
};
