# grunt-traceur-build

> Grunt task that uses google traceur compiler to build ECMAScript 6 (harmony) projects, optionally merging and generating source maps.

## Getting Started

```shell
npm install grunt-traceur-build --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-traceur-build');
```

## The "traceur_build" task

### Overview
In your project's Gruntfile, add a section named `traceur_build` to the data object passed into `grunt.initConfig()`. Eg:

```js
grunt.initConfig({
  traceur_build: {
    options: {
      sourceMaps: true,
      deferredFunctions: true
    },
    project: {
      cwd: 'src',
      src: '**/*.js',
      dest: './build/build.js'
    },
  },
})
```

### Options

Almost all options are passed to the traceur compiler directly, see the section
below for the default values.

Keep in mind that when a javascript file(any name ending with .js) is specified
as the destination, the task will build and combine everything into one file,
taking into consideration 'import' statements to resolve dependencies and put
the files in the correct order.

It will by default generate source maps for debugging(as far as I know only
google chrome and 
[node-inspector](https://github.com/node-inspector/node-inspector support this
feature). In node.js, stack traces will display the original filenames/location
if you install the [node-source-map-support](https://github.com/evanw/node-source-map-support) package

### Usage Examples

#### Default Options

```js
grunt.initConfig({
  traceur_build: {
    options: {
      debug: false,
      sourceMaps: true,
      freeVariableChecker: true,
      validate: false,
      strictSemicolons: false,
      unstarredGenerators: false,
      ignoreNolint: false,
      arrayComprehension: true,
      arrowFunctions: true,
      classes: true,
      defaultParameters: true,
      destructuring: true,
      forOf: true,
      propertyMethods: true,
      propertyNameShorthand: true,
      templateLiterals: true,
      restParameters: true,
      spread: true,
      generatorComprehension: true,
      generators: true,
      modules: true,
      blockBinding: false,
      privateNameSyntax: false,
      privateNames: false,
      cascadeExpression: false,
      trapMemberLookup: false,
      deferredFunctions: false,
      propertyOptionalComma: false,
      types: false
    },
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
})
```
