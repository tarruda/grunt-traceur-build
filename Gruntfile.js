/*
 * grunt-traceur-compiler
 * https://github.com/tarruda/grunt-traceur-compiler
 *
 * Copyright (c) 2013 Thiago de Arruda
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js'
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    clean: {
      tests: ['build'],
    },

    traceur_compile: {
      options: {
        sourceMaps: true
      },
      file: {
        cwd: 'test',
        src: '**/*.js',
        dest: './build/build.js'
      },
      directory: {
        expand: true,
        flatten: false,
        cwd: 'test',
        src: '**/*.js',
        dest: './build/all'
      }
    }

  });

  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('test', ['clean', 'traceur_compile']);

  grunt.registerTask('default', ['jshint', 'test']);
};
