/*
 * grunt-sdbwatcher
 * 
 * Copyright (c) 2015  DreamArts Corporation.
 * Haoyang Zheng & Shuying Cui
 * Licensed under the MIT license.
 *
 */

 var path = require('path');
 var Gaze = require('gaze').Gaze;
 var _ = require('lodash');
 var waiting = 'Waiting...';
 var changedFiles = Object.create(null);
 var watchers = [];
 var fs=require('fs');
 var file;

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
  var dateFormat = function(time) {
    grunt.log.writeln(String(
      'Completed in ' +
      time.toFixed(3) +
      's at ' +
      (new Date()).toString()
      ).cyan + ' - ' + waiting);
  };
  taskrun.on('start', function() {
    Object.keys(changedFiles).forEach(function(filepath) {
      grunt.log.ok('File "' + filepath + '" ' + changedFiles[filepath] + '.');
      file = filepath;
      var pathTemp = grunt.file.readJSON('path.json');
      var filepathDest = pathTemp.destPath;
      var logpathDest = "";
      var logpathDestTemp = pathTemp.destPath.split(path.sep);
      for(var i = 2;i < logpathDestTemp.length - 1;i++){
        logpathDest += logpathDestTemp[i] + path.sep;
      }
      var filename = "";
      var fileParserLength = file.split(path.sep).length;
      filename = file.split(path.sep)[fileParserLength - 1];
      var stringsTemp = file.split(path.sep);
      for(var i = 0;i < stringsTemp.length;i++){
        if("media"==(stringsTemp[i])){
         i += 1;
         for(;i<stringsTemp.length-1;i++){
           filepathDest += stringsTemp[i] + path.sep;
           logpathDest += stringsTemp[i] + path.sep;
         }
       }
     }
     if (fs.existsSync(filepathDest + path.sep + filename)) {
      fs.createReadStream(file).pipe(fs.createWriteStream(filepathDest + path.sep + filename));
      grunt.log.ok(logpathDest + filename + ' has been updated.');
    } else {
      if (!fs.existsSync(filepathDest)) {
       mkdirsSync(filepathDest);
     }
     fs.createReadStream(file).pipe(fs.createWriteStream(filepathDest + path.sep + filename));
     grunt.log.ok(logpathDest + filename + ' has been updated.');
   }
 });
changedFiles = Object.create(null);
})

taskrun.on('end', function(time) {
  if (time > 0) {
    dateFormat(time);
  }
});

taskrun.on('interrupt', function() {
  grunt.log.writeln('').write('Scheduled tasks have been interrupted...'.yellow);
});

taskrun.on('reload', function() {
  taskrun.clearRequireCache(Object.keys(changedFiles));
  grunt.log.writeln('').writeln('Reloading watch config...'.cyan);
});

grunt.registerTask('sdbwatcher', 'Run predefined tasks whenever watched files change.', function(target) {
  var self = this;
  var name = self.name || 'sdbwatcher';

  watchers.forEach(function(watcher) {
    watcher.close();
  });
  watchers = [];

  if (grunt.config([name, 'options', 'forever']) !== false) {
    taskrun.forever();
  }

  var df = grunt.config([name, 'options', 'dateFormat']);
  if (typeof df === 'function') {
    dateFormat = df;
  }

  if (taskrun.running === false) { grunt.log.writeln(waiting); }

  var targets = taskrun.init(name, {target: target});

  targets.forEach(function(target, i) {
    if (typeof target.files === 'string') { target.files = [target.files]; }

    var patterns = _.chain(target.files).flatten().map(function(pattern) {
      return grunt.config.process(pattern);
    }).value();

    if (typeof target.options.event === 'string') {
      target.options.event = [target.options.event];
    }

    if (typeof target.options.cwd !== 'string' && target.options.cwd.files) {
      target.options.cwd = target.options.cwd.files;
    }

    watchers.push(new Gaze(patterns, target.options, function(err) {
      if (err) {
        if (typeof err === 'string') { err = new Error(err); }
        grunt.log.writeln('ERROR'.red);
        grunt.fatal(err);
        return taskrun.done();
      }

      if (grunt.option('verbose')) {
        var watched = this.watched();
        Object.keys(watched).forEach(function(watchedDir) {
          watched[watchedDir].forEach(function(watchedFile) {
            grunt.log.writeln('Watching ' + path.relative(process.cwd(), watchedFile) + ' for changes.');
          });
        });
      }

      this.on('all', function(status, filepath) {
        if (!_.contains(target.options.event, 'all') &&
          !_.contains(target.options.event, status)) {
          return;
      }

      filepath = path.relative(process.cwd(), filepath);
      if (filepath === '') {
        return;
      }

      if (target.options.reload || /gruntfile\.(js|coffee)/i.test(filepath)) {
        taskrun.reload = true;
      }

      if (grunt.event.listeners('sdbwatcher').length > 0) {
        grunt.event.emit('sdbwatcher', status, filepath, target.name);
      }

      changedFiles[filepath] = status;

      if (taskrun.targets[target.name]) {
        if (!taskrun.targets[target.name].changedFiles) {
          taskrun.targets[target.name].changedFiles = Object.create(null);
        }
        taskrun.targets[target.name].changedFiles[filepath] = status;
      }

      if (taskrun.queue.indexOf(target.name) === -1) {
        taskrun.queue.push(target.name);
      }

      taskrun.run();
    });

      this.on('error', function(err) {
        if (typeof err === 'string') { err = new Error(err); }
        grunt.log.error(err.message);
      });
    }));
});
});
};