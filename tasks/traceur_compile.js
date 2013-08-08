/*
 * grunt-traceur-compile
 * https://github.com/tarruda/grunt-traceur-compile
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

var NAME = 'traceur_compile';
var DESC =
  'Compiles ECMAScript 6 projects using the google traceur compiler';

function generateIncludeFile(files) {
  var rv = [];
  files.forEach(function(f) {
    rv.push('module ' + traceur.generateNameForUrl(f) +
            ' from "' + f + '"');
  });
  return rv.join('\n');
}

function compileToDirectory(grunt, options, f) {
  // Iterate over all specified file groups.
  var asts;
  var reporter = new TestErrorReporter();
  var project = new traceur.semantics.symbols.Project(f.dest);

  f.src.filter(function(filepath) {
    if (!grunt.file.exists(filepath)) {
      grunt.log.warn('Source file "' + filepath + '" not found.');
      return false;
    } else {
      return true;
    }
  }).map(function(filepath) {
    var sourceFile = new traceur.syntax.SourceFile(
      filepath, grunt.file.read(filepath));
      project.addFile(sourceFile);
  });

  asts = traceur.codegeneration.Compiler.compile(reporter, project);

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
      sourceMapRoot = './';
      sourceMapConfig = {
        file: path.relative(outDir, file.name),
        sourceRoot: sourceMapRoot
      };
      sourceMapGenerator = new SourceMapGenerator(sourceMapConfig);
      treeWriteOpts = {sourceMapGenerator: sourceMapGenerator};
    }

    code = TreeWriter.write(ast, treeWriteOpts);

    if (options.sourceMaps) {
      code += '\n//@ sourceMappingURL=' + sourceMapDest;
      grunt.file.write(sourceMapDest, treeWriteOpts.sourceMap);
    }

    grunt.file.write(outFile, code);
    grunt.log.writeln('File "' + outFile + '" created.');
  });
}

function compileToFile(grunt, options, f) {
  var reporter, ast, files, currentDir;
  var code, writeOpts, sourceMapGenerator;
  var sourceMapDest, sourceMapRoot, sourceMapConfig;     
  var outFile = f.dest;
  var outDir = path.dirname(outFile);
  var include = outFile + '.include.js';

  files = f.src.map(function(filepath) {
    console.log(f.cwd, filepath);
    filepath = path.join(f.cwd, filepath);
    return path.relative(path.dirname(include), filepath);
  });
  grunt.file.write(include, generateIncludeFile(files));
  currentDir = process.cwd();
  process.chdir(outDir);
  reporter = new TestErrorReporter();
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
    sourceMapRoot = './';
    sourceMapConfig = {
      file: outFile,
      sourceRoot: sourceMapRoot
    };
    sourceMapGenerator = new SourceMapGenerator(sourceMapConfig);
    writeOpts = {sourceMapGenerator: sourceMapGenerator};
  }

  code = TreeWriter.write(ast, writeOpts);

  if (options.sourceMaps) {
    code += '\n//@ sourceMappingURL=' + sourceMapDest;
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

    for (var k in options.parse) {
      traceur.options[k] = options[k];
    }

    this.files.forEach(function(f) {
      if (/\.js$/.test(f.orig.dest)) {
        compileToFile(grunt, options, f);
      } else {
        compileToDirectory(grunt, options, f);
      }
    });
  });
};
