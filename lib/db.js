/*
 * lib/db.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Promise = require("bluebird"),
    pg = require("pg"),
    Queries = require('./queries');

var isConfigured = false,
    db = undefined;

'use strict';
Promise.longStackTraces();



function QueryError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
};

QueryError.prototype = Object.create(Error.prototype);


function Transaction (queries, config) {
    this.queries = queries;
    this.config = config;
};

_.extend(Transaction.prototype, {

    begin: function () {
        var self = this;
        var resolver = function (resolve, reject) {
            pg.connect(self.config,
                function(err, client, done){
                    if(err){
                        return reject(new Error('Could not connect to PG', err));
                    }
                    client.query('BEGIN;', function(err, result){
                        if(err){
                            return reject(err);
                        }
                        self.client = client;
                        self.done = done;
                        resolve(self);
                    });
              });
        };
        return new Promise(resolver);
    },

    query: function (queryName, params) {
        var self = this;
        var resolver = function (resolve, reject) {
            var q = self.queries[queryName];
            self.client.query(q.sql, params, function(err, result){
                if(err){
                    return reject(err);
                }
                resolve(self, result.rows);
            });
        };
        return new Promise(resolver);
    },


    commit: function (queryName, params) {
        var self = this;
        var resolver = function (resolve, reject) {
            var q = self.queries[queryName];
            client.query('COMMIT;', function(err, result){
                if(err){
                    self.done();
                    return reject(err);
                }
                resolve(result);
                self.done();
            });
        };
        return new Promise(resolver);
    },

    rollback: function (queryName, params) {
        var self = this;
        var resolver = function (resolve, reject) {
            var q = self.queries[queryName];
            client.query('ROLLBACK;', function(err, result){
                if(err){
                    self.done();
                    return reject(err);
                }
                resolve(result);
                self.done();
            });
        };
        return new Promise(resolver);
    },
});


function Database (config) {
    this._config = config;
    var queriesOptions = _.extend({}, config.queries);
    this.queries = Queries(queriesOptions.prefix, queriesOptions.schema);
}

_.extend(Database.prototype, {
    /**
     * A function that executes a named query
     *
     */
    query: function (queryName, params) {
        var transaction,
            queries = this.queries
            config = this._config;

        if(queryName in queries
            && queries[queryName].params.length === params.length){
            var q = queries[queryName];
            // console.log('db.query.connect');
            var resolver = function (resolve, reject) {
                pg.connect(config,
                    function(err, client, done){
                        if(err){
                            done();
                            return reject(new Error('Could not connect to PG', err));
                        }
                        client.query(q.sql, params, function(err, result){
                            if(err){
                                done();
                                return reject(new QueryError(err));
                            }
                            // console.log('Database.query', q.sql, result.rows);
                            resolve(result.rows);
                            done();
                        });
                  });
            };
            transaction = new Promise(resolver);
        }
        else{
            console.error('db.query wrong arguments', queryName, params);
            transaction = new Promise(function(resolve, reject){
                reject(new QueryError('Query does not exists or invalid parameters'));
            });
        }
        // console.log('db.query transaction', queryName, transaction);
        return transaction;
    },

    transaction: function (doNotStart) {
        var tx = new Transaction(this.queries, this._config);
        if(doNotStart){
            return tx;
        }
        return tx.begin();
    }
});

var databaseInstance;
module.exports.configure = function(config){
    if(databaseInstance){
        return;
    }
    databaseInstance = new Database(config);
};


module.exports.client = function(){
    if(!databaseInstance){
        throw (new Error('Database not configured'));
    }
    return databaseInstance;
};
