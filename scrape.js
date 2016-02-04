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


var courses = [];

activate();

///////////////

function activate() {
    getCourses();
}

function getCourses() {
    var uri = ''; //TODO: FILL FROM FILE
    var cursor = {
        pages: 0,         // starts at 1
        page: 1,
        itemsTotal: 0,
        itemsPerPage: 0,
    };

    var courses = [];

    setCursor(uri, cursor)
        .then(function() {
            return buildCourseList(uri, cursor);
        })
        .then(function(courses) {
            // console.log(courses);
        });
}

function setCursor(uri, cursor) {
    var options = {
        uri: uri,
        json: true,
    };

    return http.get(options)
        .then(function(res) {
            jsonfile.writeFile('./tmp/setCursor.json', res);

            cursor.itemsPerPage = res.courses.length;
            cursor.itemsTotal = res.meta.total;
            cursor.pages = Math.ceil(cursor.itemsTotal / cursor.itemsPerPage);
            console.log('set cursor: %j', cursor);
        });
}

function buildCourseList(uri, cursor) {
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

        var promise = http.get(options).then(function logDone(res) {
            // console.log('--------------------------------');
            // console.log('%j', res.request.uri.search);
            return res;
        });

        promises.push(promise);
    }


    // The apply lets us pass in an array
    return Promise.all(promises)
        .then(function(responses) {
            console.log('promises all done');
            var courses = [];
            _.forEach(responses, function(response, i){
                console.log('merging response ' + i);
                console.log('%j', response.courses);
                console.log('---------------------------');
                courses = courses.concat(response.courses);
            });
            // console.log('returning courses', courses);
            jsonfile.writeFile('./tmp/courses.json', courses);
            return courses;
        });
}


})();

