

module.exports = function(grunt){
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	grunt.initConfig({
		pkg : grunt.file.readJSON('path.json'),
		
		
		sdbwatcher:{
			files:['<%= pkg.watchPath %>/**/media/**/*.js','<%= pkg.watchPath %>/**/media/**/*.css'],
			tasks:[]
			
		}
	});
	grunt.loadTasks('tasks');
}