module.exports = function(grunt) {
  var outFile = 'build/socket.js',
      minFile = 'build/socket.min.js';

  var files = [
    'socket.js',
    'moz.js',
    'chrome.js'
  ];

  grunt.initConfig({
    concat: {
      dist: {
        src: files.map(function(f) { return 'src/' + f; }),
        dest: outFile
      },
      options: {
        banner: '(function(global) {\n',
        footer: '\n})(this);'
      }
    },
    uglify: {
      dist: {
        files: {
          'build/socket.min.js': outFile
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js'],
      options: {
        es5: true,
        eqnull: true,
        laxbreak: true,
        sub: true
      },
      globals: {
      }
    },
    clean: ['build']
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.registerTask('lint', ['jshint']);
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};