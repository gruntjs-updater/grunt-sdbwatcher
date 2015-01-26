module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	grunt.initConfig({

		sdbwatcher: {

			files: ['**/media/**/*.js', '**/media/**/*.css'],
			tasks: [],
			options: {
				event: ['added', 'changed']
			}

		}
	});

	grunt.loadNpmTasks('grunt-sdbwatcher');
	grunt.registerTask('default', ['sdbwatcher']);
}