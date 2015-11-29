/*
 * routes/index.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');
var express = require('express');

var routes = ['login', 'api', 'media'];

module.exports = exports = function(app){

    var router = express.Router();
    _.each(routes, function(route){
        require('./' + route)(router, app);
    });

    /* GET home page. */
    router.get('/', function(req, res) {
        res.redirect('/map');
    });

    router.get('/console', function(request, response){
        response.render('console');
    });

    router.get('/view*', function(request, response){
        response.render('view');
    });

    router.get('/map*', function(request, response){
        if (request.isAuthenticated()) {
            response.render('map', {
                'user': request.user
            });
        }
        else{
            response.render('map', {
                'user': null
            });
        }
    });


    app.use('/', router);

};
