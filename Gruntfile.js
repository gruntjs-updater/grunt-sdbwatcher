

module.exports = function(grunt){
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	grunt.initConfig({
		pkg : grunt.file.readJSON('path.json'),
		
		
		sdbwatcher:{
			files:['<%= pkg.watchPath %>/**/media/**/*.js','<%= pkg.watchPath %>/**/media/**/*.css'],
			tasks:[],
			options: {
            event: ['added', 'changed']
        }
			
		}
	});
	
    grunt.loadNpmTasks('grunt-sdbwatcher');
	grunt.registerTask('default', ['sdbwatcher']);
}