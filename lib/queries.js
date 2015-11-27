/*
 * lib/queries.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



module.exports = function (prefix, schema) {
    'use strict';

    schema = schema || 'public';
    prefix = prefix || '';

    function tableName(name) {
        return '"'+schema+'"."'+prefix+name+'"';
    }

    function geometricTableParams () {
        return ['id', 'layer_id', 'user_id', 'properties', 'geom'];
    }

    function geometricSQLGet (tname) {
        return "SELECT id, layer_id, user_id, properties, ST_AsGeoJSON(geom) as geom FROM " + tableName(tname) +' WHERE id = $1;';
    }

    function geometricSQLGetLayer (tname) {
        return "SELECT id, layer_id, user_id, properties, ST_AsGeoJSON(geom) as geom FROM " + tableName(tname) +' WHERE layer_id = $1;';
    }

    function geometricSQLLoad (tname) {
        return "SELECT id, layer_id, user_id, properties, ST_AsGeoJSON(geom) as geom FROM " + tableName(tname) +' ;';
    }

    function geometricSQLUpdate (tname) {
        return "UPDATE " +
                tableName(tname) +
                " SET (id, layer_id, user_id, properties, geom) = ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))" +
                " WHERE id = $1 RETURNING id, layer_id, user_id, properties, ST_AsGeoJSON(geom) as geom;";
    }

    function geometricSQLCreate (tname) {
        return "INSERT INTO " +
                tableName(tname) +
                " (id, layer_id, user_id, properties, geom) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))"+
                " RETURNING id, layer_id, user_id, properties, ST_AsGeoJSON(geom) as geom;";
    }

    function sqlDelete (tname) {
        return "DELETE FROM " + tableName(tname) + " WHERE id = $1;" ;
    }

    var queries = {
        // entities
        entityLoad: {
            params: [],
            sql: geometricSQLLoad('entities')
        },
        entityUpdate: {
            params: geometricTableParams(),
            sql: geometricSQLUpdate('entities')
        },
        entityCreate: {
            params: geometricTableParams(),
            sql: geometricSQLCreate('entities')
        },
        entityDelete: {
            params: ['id'],
            sql: sqlDelete('entities')
        },
        entityGet: {
            params: ['id'],
            sql: geometricSQLGet('entities')
        },
        entityGetLayer: {
            params: ['layer_id'],
            sql: geometricSQLGetLayer('entities')
        },

        // paths
        pathLoad: {
            params: [],
            sql: geometricSQLLoad('paths')
        },
        pathUpdate: {
            params: geometricTableParams(),
            sql: geometricSQLUpdate('paths')
        },
        pathCreate: {
            params: geometricTableParams(),
            sql: geometricSQLCreate('paths')
        },
        pathDelete: {
            params: ['id'],
            sql: sqlDelete('paths')
        },
        pathGet: {
            params: ['id'],
            sql: geometricSQLGet('paths')
        },
        pathGetLayer: {
            params: ['layer_id'],
            sql: geometricSQLGetLayer('paths')
        },


        // spreads
        spreadLoad: {
            params: [],
            sql: geometricSQLLoad('spreads')
        },
        spreadUpdate: {
            params: geometricTableParams(),
            sql: geometricSQLUpdate('spreads')
        },
        spreadCreate: {
            params: geometricTableParams(),
            sql: geometricSQLCreate('spreads')
        },
        spreadDelete: {
            params: ['id'],
            sql: sqlDelete('spreads')
        },
        spreadGet: {
            params: ['id'],
            sql: geometricSQLGet('spreads')
        },
        spreadGetLayer: {
            params: ['layer_id'],
            sql: geometricSQLGetLayer('spreads')
        },


        // layers
        layerLoad: {
            params: [],
            sql: "SELECT id, user_id, properties FROM " + tableName('layers') +' ;'
        },
        layerGet: {
            params: ['id'],
            sql: "SELECT id, user_id, properties FROM " + tableName('layers') +'  WHERE id = $1;'
        },
        layerUpdate: {
            params: ['id', 'user_id', 'properties'],
            sql: "UPDATE " + tableName('layers') + " SET (id, user_id, properties) = ($1, $2, $3) WHERE id = $1 RETURNING *;"
        },
        layerCreate: {
            params: ['id', 'user_id', 'properties'],
            sql: "INSERT INTO " + tableName('layers') + " (id, user_id, properties) VALUES ($1, $2, $3) RETURNING *;"
        },

        // users
        userLoad: {
            params: [],
            sql: "SELECT id, auth_id, properties FROM " + tableName('users') +' ;'
        },
        userGet: {
            params: ['id'],
            sql: "SELECT id, auth_id, properties FROM " + tableName('users') +'  WHERE id = $1;'
        },
        userGetAuth: {
            params: ['auth_id'],
            sql: "SELECT id, auth_id, properties FROM " + tableName('users') +'  WHERE auth_id = $1;'
        },
        userUpdate: {
            params: ['id', 'auth_id', 'properties'],
            sql: "UPDATE " + tableName('users') + " SET (id, auth_id, properties) = ($1, $2, $3) WHERE id = $1 and auth_id = $2 RETURNING *;"
        },
        userCreate: {
            params: ['id', 'auth_id', 'properties'],
            sql: "INSERT INTO " + tableName('users') + " (id, auth_id, properties) VALUES ($1, $2, $3) RETURNING *;"
        },

        // subscriptions
        subscriptionLoad: {
            params: [],
            sql: "SELECT id, user_id, group_id FROM " + tableName('subscriptions') +' ;'
        },
        subscriptionCreate: {
            params: ['id', 'user_id', 'group_id'],
            sql: "INSERT INTO " + tableName('subscriptions') + " (id, user_id, group_id) VALUES ($1, $2, $3) RETURNING *;"
        },
        subscriptionDelete: {
            params: ['id', 'user_id', 'group_id'],
            sql: "DELETE FROM " + tableName('subscriptions') + " WHERE id = $1 AND user_id = $2 AND group_id = $3;"
        },

        // compositions
        compositionLoad: {
            params: [],
            sql: "SELECT id, layer_id, group_id FROM " + tableName('compositions') +' ;'
        },
        compositionGetForGroup: {
            params: ['group_id'],
            sql: "SELECT id, layer_id, group_id FROM " + tableName('compositions') +' WHERE group_id = $1;'
        },
        compositionGetForLayer: {
            params: ['layer_id'],
            sql: "SELECT id, layer_id, group_id FROM " + tableName('compositions') +' WHERE layer_id = $1;'
        },
        compositionCreate: {
            params: ['id', 'layer_id', 'group_id'],
            sql: "INSERT INTO " + tableName('compositions') + " (id, layer_id, group_id) VALUES ($1, $2, $3) RETURNING *;"
        },
        compositionDelete: {
            params: ['layer_id', 'group_id'],
            sql: "DELETE FROM " + tableName('compositions') + "  WHERE layer_id = $1 AND group_id = $2;"
        },

        // groups
        groupLoad: {
            params: [],
            sql: "SELECT id, user_id, status_flag, properties FROM " + tableName('groups') +' ;'
        },
        groupGet: {
            params: ['id'],
            sql: "SELECT id, user_id, status_flag, properties FROM " + tableName('groups') +' WHERE id = $1;'
        },
        groupUpdate: {
            params: ['id', 'user_id', 'status_flag', 'properties'],
            sql: "UPDATE " + tableName('groups') + " SET (id, user_id, status_flag, properties) = ($1, $2, $3, $4) WHERE id = $1 and user_id = $2 RETURNING *;"
        },
        groupCreate: {
            params: ['id', 'user_id', 'status_flag', 'properties'],
            sql: "INSERT INTO " + tableName('groups') + " (id, user_id, status_flag, properties) VALUES ($1, $2, $3, $4) RETURNING *;"
        },
        groupListForUser: {
            params: ['user_id'],
            sql: "SELECT id, user_id, status_flag, properties FROM " + tableName('groups') + " WHERE user_id = $1 ;"
        },


        // auth

        authCreate: {
            params: ['id', 'email', 'password'],
            sql: "INSERT INTO " + tableName('auth') + " (id, email, password) VALUES ($1, $2, $3) RETURNING *;"
        },

        authGetEmail: {
            params: ['email'],
            sql: "SELECT * FROM " + tableName('auth') + " WHERE email=$1 ;"
        }

    };
    return queries;
};
