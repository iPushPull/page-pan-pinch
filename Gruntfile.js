var fs = require('fs');

module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    var buildDir = "dist";

    var initConfig = {
        clean: {
            dist: 'dist/**'
        },
        webpack: require('./webpack.config.js')
    };

    // init config
    grunt.initConfig(initConfig);

    // initial build
    grunt.registerTask('build', 'Run webpack and bundle the source', ['clean', 'webpack']);

};