/*
 * routes/login.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    passport = require('passport'),
    auth = require('../lib/auth'),
    Token = require('../lib/token');

var authOptions = {
    failureRedirect: '/login?failed=1',
};
var authenticate = passport.authenticate('local', authOptions);

function getToken(req, res){
    var t = Token.PUT(req.user);
    res.json(t);
}

function postLogin(req, res){
    res.redirect('/');
}

function postLogout(req, res){
    req.logout();
    res.redirect('/');
}

function renderLogin(req, res){
    res.render('login', {email: ''});
}

function renderRegister (req, res) {
    res.render('register');
}

function register (req, res) {
    var email = req.body.email,
        password = req.body.password,
        name = req.body.username;

    auth.register(email, password, name)
        .then(function(user){
            req.login(user, function(err){
                if (err) {
                    console.error('auto login after register:', err);
                }
                res.redirect('/map');
            });
        })
        .catch(function(err){
            res.status(500).render('registerFailed', {
                email: email,
                error: err
            });
        });
}

module.exports = exports = function(router, app){

    // GETs
    router.get('/login', renderLogin);
    router.get('/register', renderRegister);
    router.get('/token', getToken);


    // POSTs
    router.post('/login', authenticate, postLogin);
    router.post('/logout', postLogout);
    router.post('/register', register);
};
