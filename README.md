## Twig Loader PHP for Webpack v4 (super early WIP!)

Webpack loader for natively compiling Twig templates via an external PHP rendering service. Based originally off of https://github.com/zimmo-be/twig-loader. 

Extra huge shoutout to [Evan Lovely](https://twitter.com/EvanLovely) for his help on a ton of the ideas behind this!

## Installation

`npm install twig-loader-php`

## Usage
[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html?branch=master)

```javascript

const TwigPhpLoader = require('twig-loader-php');

module.exports = {
//...
  module: {
    rules: [
      {
        test: /\.twig$/,
        loader: TwigPhpLoader.loader,
        options: {
          port: config.port,
          namespaces: twigNamespaces,
          includeContext: false, // false by default - this changes how / when the Twig template gets rendered so that HtmlWebpackPlugin's contextual data is available
        },
      },
    ]
  },

  //...
  plugins: [
    new TwigPhpLoader(), // <-- super important part!

    // For example, wiring this up to the HtmlWebpackPlugin to compile Pattern Lab's Workshop UI (as Twig templates) 
    new HtmlWebpackPlugin({
      title: 'Custom template',
      filename: '../index.html',
      inject: true,
      cache: false,
      // Load a custom template (lodash by default see the FAQ for details)
      template: path.resolve(process.cwd(), '../../packages/uikit-workshop/src/html-twig/index.twig'),
    }),
  ]  
};
```

Note: in this early version, internally we're assuming the PHP service's API expects requests to be structured as `http://localhost:${opts.port}/api/render-twig?templatePath=${querystringifiedTemplate}` -- with the body of the POST request containing the Twig data to be passed along.

This will eventually change to become much more customizable!
