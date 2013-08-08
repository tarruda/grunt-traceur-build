/*
 * grunt-traceur-build
 * https://github.com/tarruda/grunt-traceur-build
 *
 * Copyright (c) 2013 Thiago de Arruda
 * Licensed under the MIT license.
 */

'use strict';
var spawn = require('child_process').spawn;
var path = require('path');

var traceur = require('traceur');

// this hack is needed because the traceur developers have made the
// command line compiler modules private. without this we won't get
// the automatic dependency resolution done by parsing the modules
// 'import' statements.
var modPath = path.resolve('node_modules/traceur/src/node/inline-module');
var inlineAndCompileSync = require(modPath).inlineAndCompileSync;

var TreeWriter = traceur.outputgeneration.TreeWriter;
var SourceMapGenerator = traceur.outputgeneration.SourceMapGenerator;
var TestErrorReporter = traceur.util.TestErrorReporter;
var Project = traceur.semantics.symbols.Project;
var SourceFile = traceur.syntax.SourceFile;

var NAME = 'traceur_build';
var DESC =
  'Compiles ECMAScript 6 (harmony) files, optionally merging and ' +
  'generating source maps.';

function generateIncludeFile(files) {
  var rv = [];
  files.forEach(function(f) {
    rv.push('module ' + traceur.generateNameForUrl(f) + ' from "' + f + '"');
  });
  return rv.join('\n');
}

function wrapClosure(code, param, expression, sourceMapGenerator) {
    code = '(function(' + (param || 'global') + ') {\n' + code;
    code = code + '}(' + (expression || 'this') + ')();\n';
    if (sourceMapGenerator) {
      // adjust the mappings
      sourceMapGenerator._mappings.forEach(function(mapping) {
        mapping.generated.line++; 
      });
    }
    return code;
}

function buildToDirectory(grunt, options, f) {
  // Iterate over all specified file groups.
  var asts, currentDir;
  var reporter = new TestErrorReporter();
  var project = new traceur.semantics.symbols.Project(f.dest);
  var cwd = f.orig.cwd || '.';

  f.src.filter(function(filepath) {
    if (!grunt.file.exists(filepath)) {
      grunt.log.warn('Source file "' + filepath + '" not found.');
      return false;
    } else {
      return true;
    }
  }).map(function(filepath) {
    var sourceFile = new traceur.syntax.SourceFile(path.relative(cwd, filepath),
      grunt.file.read(filepath));
    project.addFile(sourceFile);
  });

  currentDir = process.cwd();
  process.chdir(cwd);
  asts = traceur.codegeneration.Compiler.compile(reporter, project);
  process.chdir(currentDir);

  if (reporter.hadError()) {
    grunt.log.error('Compilation error!');
    reporter.errors.forEach(function(e) {
      grunt.log.error(e);
    });
    return false;
  }

  asts.keys().forEach(function(file) {
    var ast, code, treeWriteOpts, sourceMapGenerator;
    var sourceMapDest, sourceMapRoot, sourceMapConfig;     
    var outFile = f.dest;
    var outDir = path.dirname(outFile);

    ast = asts.get(file);

    if (options.sourceMaps) {
      sourceMapDest = outFile + '.map';
      sourceMapRoot = path.relative(outDir, cwd);
      sourceMapConfig = {
        file: path.relative(outDir, outFile),
        sourceRoot: sourceMapRoot
      };
      sourceMapGenerator = new SourceMapGenerator(sourceMapConfig);
      treeWriteOpts = {sourceMapGenerator: sourceMapGenerator};
    }

    code = TreeWriter.write(ast, treeWriteOpts);

    if (options.wrap) {
      code = wrapClosure(code, options.wrap.param, options.wrap.expression,
        sourceMapGenerator);
    }

    if (options.sourceMaps) {
      code += '\n//@ sourceMappingURL=' + path.relative(outDir, sourceMapDest);
      grunt.file.write(sourceMapDest, treeWriteOpts.sourceMap);
    }

    grunt.file.write(outFile, code);
    grunt.log.writeln('File "' + outFile + '" created.');
  });
}

function buildToFile(grunt, options, f) {
  var reporter, ast, files, currentDir, includeData;
  var code, writeOpts, sourceMapGenerator;
  var sourceMapDest, sourceMapRoot, sourceMapConfig;     
  var outFile = f.dest;
  var outDir = path.dirname(outFile);
  var cwd = f.cwd || '.';
  // use a temporary helper file that imports all other files to use the
  // default traceur compilation routine
  var include = path.join(cwd, '.includejs.tmp~');
  files = f.src;
  includeData = generateIncludeFile(files);
  grunt.file.write(include, includeData);
  reporter = new TestErrorReporter();
  currentDir = process.cwd();
  process.chdir(cwd);
  ast = inlineAndCompileSync([path.basename(include)], null, reporter);
  process.chdir(currentDir);
  grunt.file.delete(include);

  if (reporter.hadError()) {
    grunt.log.error('Compilation error!');
    reporter.errors.forEach(function(e) {
      grunt.log.error(e);
    });
    return false;
  }

  if (options.sourceMaps) {
    sourceMapDest = outFile + '.map';
    sourceMapRoot = path.relative(outDir, cwd);
    sourceMapConfig = {
      file: path.relative(outDir, outFile),
      sourceRoot: sourceMapRoot
    };
    sourceMapGenerator = new SourceMapGenerator(sourceMapConfig);
    writeOpts = {sourceMapGenerator: sourceMapGenerator};
  }

  code = TreeWriter.write(ast, writeOpts).split('\n');
  // remove the lines added by the include helper
  code = code.slice(0, code.length - includeData.split('\n').length - 1);
  code = code.join('\n');
  code += '\n';

  if (options.wrap) {
    code = wrapClosure(code, options.wrap.param, options.wrap.expression,
      sourceMapGenerator);
  }

  if (options.sourceMaps) {
    code += '\n//@ sourceMappingURL=' + path.relative(outDir, sourceMapDest);
    grunt.file.write(sourceMapDest, writeOpts.sourceMap);
  }

  grunt.file.write(outFile, code);
  grunt.log.writeln('File "' + outFile + '" created.');
}

module.exports = function(grunt) {
  grunt.registerMultiTask(NAME, DESC, function() {
    var options = this.options({
      debug: false,
      sourceMaps: true,
      freeVariableChecker: true,
      validate: false,
      strictSemicolons: false,
      unstarredGenerators: false,
      ignoreNolint: false,
      //
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
    });

    traceur.options.reset();

    for (var k in options) {
      if (k in traceur.options) traceur.options[k] = options[k];
    }

    this.files.forEach(function(f) {
      if (/\.js$/.test(f.orig.dest)) {
        buildToFile(grunt, options, f);
      } else {
        buildToDirectory(grunt, options, f);
      }
    });
  });
};
