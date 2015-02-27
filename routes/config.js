/*
 * routes/config.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');
var config = require('../config');


module.exports = exports = function(router, app){
	router.get('/config.js', function(req, res){
		res.set('Content-Type', 'application/javascript');
		var configData = config.public || {};
		var data = JSON.stringify(configData);
        var ret = 'define('+data+');';

        res.set('Content-Type', 'application/javascript');
		res.send(ret);
	});
};