/*
 * lib/server.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var path = require('path');

var express = require('express'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    multer  = require('multer');

var passport = require('passport'),
    Strategy = require('passport-local').Strategy,
    db = require('./db'),
    cache = require('./cache'),
    auth = require('./auth');



passport.serializeUser(function(user, done) {
    console.log('passport.serializeUser', user.id);
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    console.log('passport.deserializeUser', id);
    cache.client()
        .get('user', id)
        .then(function(user){
            done(null, user);
        })
        .catch(function(err){
            done({error: 'cannot find user'});
        });
});

passport.use(new Strategy(auth.verify));


/// catch 404 and forward to error handler
function fof(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
}


module.exports = function(config){

    config = config || {};
    var app = express();

    // view engine setup
    app.set('views', config.views || path.join(__dirname, '../views'));
    app.set('view engine',  config.viewEngine || 'jade');

    app.use(favicon());
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    app.use(cookieParser());
    app.use(express.static(config.static || path.join(__dirname, '../public')));
    app.use(multer({
        'dest': config.uploadDir || path.join(__dirname, '../uploads'),
        'putSingleFilesInArray': true
    }));
    app.use(session({
        'secret': config.secret || 'xxxxxxxxx'
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(function(request, response, next){
        request.config = config;
        next();
    });

    app.set('port', process.env.PORT || config.port || 3000);

    app.start = function(postStart){
        // app.use(fof);
        var server = app.listen(app.get('port'), function(){
            console.log('Express server listening on port ' + server.address().port);
            if(postStart){
                postStart(app, server);
            }
        });
    };

    return app;
};
