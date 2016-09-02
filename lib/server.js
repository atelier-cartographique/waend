/*
 * lib/server.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var logger = require('debug')('lib/server'),
    path = require('path');

var express = require('express'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    RedisStore = require('connect-redis')(session),
    bodyParser = require('body-parser'),
    multer = require('multer');

var passport = require('passport'),
    Strategy = require('passport-local').Strategy,
    cache = require('./cache'),
    store = require('./store'),
    auth = require('./auth');



passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    cache.client()
        .get('user', id)
        .then(function(user){
            done(null, user);
        })
        .catch(function(err){
            done({
                error: 'cannot find user'
            });
        });
});

passport.use(new Strategy(auth.verify));

module.exports = function(config){

    config = config || {};
    var app = express();
    var multerMiddleware = multer({
        'dest': config.uploadDir || path.join(__dirname, '../uploads')
    }).array('media');

    // view engine setup
    app.set('views', config.views || path.join(__dirname, '../views'));
    app.set('view engine', config.viewEngine || 'jade');

    app.use(favicon());
    app.use(logger('dev'));
    app.use(bodyParser.json({
        'limit': config.bodyParserLimit || '400kb'
    }));
    app.use(bodyParser.urlencoded());
    app.use(cookieParser());
    app.use(express.static(config.static || path.join(__dirname, '../public')));
    app.use(multerMiddleware);

    if (!('session' in config)) {
        console.error('We really need session support, update your config please');
        process.exit(1);
    }
    var sessionConfig = {
        'secret': config.session.secret || 'xxxxxxxxx',
        resave: false,
        saveUninitialized: true
    };
    if ('redis' in config.session) {
        var rconfig = config.session.redis,
            redis = require('redis'),
            rclient = redis.createClient(rconfig.port, rconfig.host);
        sessionConfig.store= new RedisStore({
            client: rclient
        });
    }

    app.use(session(sessionConfig));
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
            logger('Express server listening on port ' + server.address().port);
            if(postStart){
                postStart(app, server);
            }
        });
    };

    return app;
};
