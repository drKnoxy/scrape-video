#!/usr/bin/env node

// https://github.com/request/request
// https://www.npmjs.com/package/request-promise
//
(function() {
  "use strict";

  var _ = require('lodash/core');
  var fs = require('fs');
  var jsonfile = require('jsonfile');
  var http = require('request-promise');
  var Promise = require('promise');
  var readJSON = Promise.denodeify(jsonfile.readFile);

  var courses = [];
  var config = getConfig();

  activate();

  ///////////////

  function activate() {
    var uri = config.courses_uri;

    loadCursor()
      .then(function(cursor) {
        console.log('using this cursor: %j', cursor);
        return buildCourseList(uri, cursor);
      })
      .then(function(courses) {
        return cleanCourses(courses);
      })
      .then(function(courses) {
        writeJSON(courses,'courses-clean');
      });
  }

  function getConfig() {
    return jsonfile.readFileSync(__dirname + '/config.json');
  }

  function loadCursor(uri) {
    return readJSON(__dirname + '/tmp/cursor.json') || fetchCursor(uri);

    ////////////////

    function fetchCursor(uri) {
      var cursor = {
        pages: 0, // starts at 1
        page: 1,
        itemsTotal: 0,
        itemsPerPage: 0,
      };

      var options = {
        uri: uri,
        json: true,
      };

      return http.get(options)
        .then(function(res) {
          cursor.itemsPerPage = res.courses.length;
          cursor.itemsTotal = res.meta.total;
          cursor.pages = Math.ceil(cursor.itemsTotal / cursor.itemsPerPage);
          writeJSON(cursor, 'cursor');
          return cursor;
        });
    }
  }


  function buildCourseList(uri, cursor) {
    // short-circuit for now
    return readJSON(__dirname + '/tmp/courses.json');

    var promises = [];
    var page = cursor.page;

    for (page; page < cursor.pages + 1; page++) {
      console.log('starting page ' + page);
      var options = {
        uri: uri,
        qs: {
          currentPage: page,
          sortLabel: "new", //
        },
        json: true,
        // resolveWithFullResponse: true,
      };

      var promise = http.get(options);

      promises.push(promise);
    }

    // The apply lets us pass in an array
    return Promise.all(promises)
      .then(function(responses) {
        console.log('promises all done');

        // NOTE: responses contains other data we might want
        var courses = [];
        _.forEach(responses, function(response, i) {
          writeJSON(response, 'courses_partial-', i);
          courses = courses.concat(response.courses);
        });

        writeJSON(courses, 'courses');
        return courses;
      });
  }

  function cleanCourses(courses) {
    console.log('Starting with %d courses', courses.length);

    // Reduce down to the props we want
    var wantedProps = ['courseGroup','createdAt','id','sections','slug','title','updatedAt'];
    courses = _.map(courses, pickProps);
    courses = _.filter(courses, notWoodwrightCourse);

    console.log('Cleaned down to %d courses', courses.length);

    return courses;

    ////////////////////

    function pickProps(course) {
      return _.pick(course, wantedProps);
    }

    function notWoodwrightCourse(course) {
      return course.title.toLowerCase().indexOf('woodwright') === -1;
    }
  }

  // Helper function for writing json files to the right area
  function writeJSON(obj, name, i) {
    name = buildName(name, i);
    jsonfile.writeFile(name, obj);

    //////////////

    function buildName(name, i) {
      name = './tmp/' + name;
      if (typeof i !== 'undefined') {
        name += pad(i);
      }
      name += '.json';
      return name;
    }

    function pad(i) {
      if (i < 10) {
        return "0" + i;
      }
      return i;
    }
  }

})();

