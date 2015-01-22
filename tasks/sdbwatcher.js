/*
 * grunt-sdbwatcher
 * 
 *
 * Copyright (c) 2015 haoyang-zheng&cuishuying
 * Licensed under the MIT license.
 */

var path = require('path');
var Gaze = require('gaze').Gaze;
var _ = require('lodash');
var waiting = 'Waiting...';
var changedFiles = Object.create(null);
var watchers = [];
//cuishuying
var fs=require('fs');
var file;


 //创建多层文件夹 同步
function mkdirsSync(dirpath, mode) { 
    if (!fs.existsSync(dirpath)) {
        var pathtmp;
        dirpath.split(path.sep).forEach(function(dirname) {
            if (pathtmp) {
                pathtmp = path.join(pathtmp, dirname);
            }
            else {
                pathtmp = dirname;
            }
            if (!fs.existsSync(pathtmp)) {
                if (!fs.mkdirSync(pathtmp, mode)) {
                    return false;
                }
            }
        });
    }
    return true; 
}
	
module.exports = function(grunt) {
  'use strict';

  var taskrun = require('./lib/taskrunner')(grunt);

  // Default date format logged
  var dateFormat = function(time) {
    grunt.log.writeln(String(
      'Completed in ' +
      time.toFixed(3) +
      's at ' +
      (new Date()).toString()
    ).cyan + ' - ' + waiting);
  };

  // When task runner has started
  taskrun.on('start', function() {
    Object.keys(changedFiles).forEach(function(filepath) {
      // Log which file has changed, and how.
      grunt.log.ok('File "' + filepath + '" ' + changedFiles[filepath] + '.');
	  file = filepath;
	  //cuishuying
	  //var filepathDest='D:/grunt-test/workspace/HIBIKI_v1_0/webapp/';
	  var pathTemp = grunt.file.readJSON('path.json');
	  grunt.log.ok(pathTemp.destPath);
	  var filepathDest=pathTemp.destPath;
	  //path.resolve(__dirname, 'conf', '.json');
      var filename = "";
      var fileParserLength = file.split(path.sep).length;
        filename = file.split(path.sep)[fileParserLength - 1];
      var stringsTemp = file.split(path.sep);
	  for(var i=0;i<stringsTemp.length;i++){
	   
			if("media"==(stringsTemp[i])){
				i+=1;
				for(;i<stringsTemp.length-1;i++)
				filepathDest +=stringsTemp[i]+path.sep;
			}
	  
	  }
		grunt.log.ok(file);
        if(fs.existsSync(filepathDest + path.sep + filename)){
          fs.createReadStream(file).pipe(fs.createWriteStream(filepathDest + path.sep + filename));
		  grunt.log.ok(filename+'已更新1'+ filepathDest);
        }
        else{
          if(!fs.existsSync(filepathDest)) {
			  grunt.log.ok(filepathDest);
			mkdirsSync(filepathDest);
          }
		fs.createReadStream(file).pipe(fs.createWriteStream(filepathDest + path.sep + filename));
        grunt.log.ok(filename+'已更新2'+ filepathDest);
	  }
    });
    // Reset changedFiles
    changedFiles = Object.create(null);
  })

  // When task runner has ended
  taskrun.on('end', function(time) {
    if (time > 0) {
      dateFormat(time);
    }
  });

  // When a task run has been interrupted
  taskrun.on('interrupt', function() {
    grunt.log.writeln('').write('Scheduled tasks have been interrupted...'.yellow);
  });

  // When taskrun is reloaded
  taskrun.on('reload', function() {
    taskrun.clearRequireCache(Object.keys(changedFiles));
    grunt.log.writeln('').writeln('Reloading watch config...'.cyan);
  });

  grunt.registerTask('sdbwatcher', 'Run predefined tasks whenever watched files change.', function(target) {
    var self = this;
    var name = self.name || 'sdbwatcher';

    // Close any previously opened watchers
    watchers.forEach(function(watcher) {
      watcher.close();
    });
    watchers = [];

    // Never gonna give you up, never gonna let you down
    if (grunt.config([name, 'options', 'forever']) !== false) {
      taskrun.forever();
    }

    // If a custom dateFormat function
    var df = grunt.config([name, 'options', 'dateFormat']);
    if (typeof df === 'function') {
      dateFormat = df;
    }

    if (taskrun.running === false) { grunt.log.writeln(waiting); }

    // initialize taskrun
    var targets = taskrun.init(name, {target: target});

    targets.forEach(function(target, i) {
      if (typeof target.files === 'string') { target.files = [target.files]; }

      // Process into raw patterns
      var patterns = _.chain(target.files).flatten().map(function(pattern) {
        return grunt.config.process(pattern);
      }).value();

      // Validate the event option
      if (typeof target.options.event === 'string') {
        target.options.event = [target.options.event];
      }

      // Set cwd if options.cwd.file is set
      if (typeof target.options.cwd !== 'string' && target.options.cwd.files) {
        target.options.cwd = target.options.cwd.files;
      }

      // Create watcher per target
      watchers.push(new Gaze(patterns, target.options, function(err) {
        if (err) {
          if (typeof err === 'string') { err = new Error(err); }
          grunt.log.writeln('ERROR'.red);
          grunt.fatal(err);
          return taskrun.done();
        }

        // Log all watched files with --verbose set
        if (grunt.option('verbose')) {
          var watched = this.watched();
          Object.keys(watched).forEach(function(watchedDir) {
            watched[watchedDir].forEach(function(watchedFile) {
              grunt.log.writeln('Watching ' + path.relative(process.cwd(), watchedFile) + ' for changes.');
            });
          });
        }

        // On changed/added/deleted
        this.on('all', function(status, filepath) {

          // Skip events not specified
          if (!_.contains(target.options.event, 'all') &&
              !_.contains(target.options.event, status)) {
            return;
          }

          filepath = path.relative(process.cwd(), filepath);

          // Skip empty filepaths
          if (filepath === '') {
            return;
          }

          // If Gruntfile.js changed, reload self task
          if (target.options.reload || /gruntfile\.(js|coffee)/i.test(filepath)) {
            taskrun.reload = true;
          }

          // Emit watch events if anyone is listening
          if (grunt.event.listeners('sdbwatcher').length > 0) {
            grunt.event.emit('sdbwatcher', status, filepath, target.name);
          }

          // Group changed files only for display
          changedFiles[filepath] = status;

          // Add changed files to the target
          if (taskrun.targets[target.name]) {
            if (!taskrun.targets[target.name].changedFiles) {
              taskrun.targets[target.name].changedFiles = Object.create(null);
            }
            taskrun.targets[target.name].changedFiles[filepath] = status;
          }

          // Queue the target
          if (taskrun.queue.indexOf(target.name) === -1) {
            taskrun.queue.push(target.name);
          }

          // Run the tasks
          taskrun.run();
        });

        // On watcher error
        this.on('error', function(err) {
          if (typeof err === 'string') { err = new Error(err); }
          grunt.log.error(err.message);
        });
      }));
    });

  });
};