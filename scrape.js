#!/usr/bin/env node

(function() {
"use strict";

var fs = require('fs');
var _ = require('lodash/core');
var http = require('request-promise');
var Promise = require('promise');


var courses = [];

activate();

///////////////

function activate() {
    getCourses();
}

function getCourses() {
    var url = ''; //TODO: FILL FROM FILE
    var cursor = {
        pages: 0,         // starts at 1
        page: 0,
        itemsTotal: 0,
        itemsPerPage: 0,
    };

    var courses = [];

    setCursor(url, cursor)
        .then(function() {
            return buildCourseList(url, cursor.pages);
        })
        .then(function(courses) {
            console.log(courses);
        });
}

function setCursor(url, cursor) {
    return http.get(url)
        .then(function(res) {
            fs.writeFile('./tmp/res.json', res);
            res = JSON.parse(res);

            cursor.itemsPerPage = res.courses.length;
            cursor.itemsTotal = res.meta.total;
            cursor.pages = Math.ceil(cursor.itemsTotal / cursor.itemsPerPage);
            console.log('set cursor: %j', cursor);
        });
}

function buildCourseList(url, pages) {
    var promises = [];
    for (var page = 1; page < pages+1; page++) {
        var promise = $.get(url, {currentPage: page, sortLabel: "new"}).then(logDone);
        promises.push(promise);
    }
    function logDone(res) {
        console.log('course list '+page+' done');
        return res;
    }

    // The apply lets us pass in an array
    return Promise.all(promises)
        .then(function(responses) {
            console.log('promises all done', responses);
            var courses = [];
            _.forEach(responses, function(response){
                courses = courses.concat(response.courses);
            });
            console.log('returning courses', courses);
            return courses;
        });
}


})();

