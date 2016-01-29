/*
 * renderer/server.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    express = require('express'),
    favicon = require('static-favicon'),
    cache = require('../lib/cache'),
    Extent = require('../app/lib/Geometry').Extent,
    Map = require('./WaendMap'),
    waendLayerProgram = require('../app/src/Program'),
    Font = require('../app/src/Font');

function makeLayer (lyr) {
    lyr.toJSON = function () {
        var layerStyle = this.properties.style || {},
            layerParams = this.properties.params || {},
            features = this.features,
            a = new Array(features.length);

        for (var i = 0; i < features.length; i++) {
            var f = features[i],
                props = f.properties;
            if ('style' in props) {
                _.defaults(props.style, layerStyle);
            }
            else {
                props.style = layerStyle;
            }
            if ('params' in props) {
                _.defaults(props.params, layerParams);
            }
            else {
                props.params = layerParams;
            }
            a[i] = f;
        }
        return a;
    };

    lyr.getProgram = function () {
        var programSrc = this.properties.program,
            program;
        if (programSrc) {
            program = new Function('ctx', programSrc);
        }
        else {
            program = waendLayerProgram;
        }
        return program;
    };

    return lyr;
}


function render (request, response) {
    var gid = request.params.group_id;
    var success = function (jsonData) {
        // console.log(data);
        //
        var data = JSON.parse(jsonData),
            group = data.group,
            gprops = group.properties;
        console.log('render', group.id);
        if (!('extent' in gprops)) {
            return response.status(500)
                           .send('missing extent');
        }
        // try {
            var extent = new Extent(gprops.extent);
            var wm = new Map({
                'extent': extent,
                'rect': gprops.render
            });
            var layers = group.layers;
            var ender = function () {
                if (layers.length > 0) {
                    var layer = makeLayer(layers.shift());
                    console.log('Add Layer', layer.id);
                    wm.waendAddLayer(layer, ender);

                }
                else {
                    response.set('Content-Type', 'application/pdf');
                    // response.set('Content-Type', 'image/png');
                    response.status(200);
                    var buf = wm.view.getBuffer();
                    response.send(buf);
                    // wm.view.getBuffer(function(err, buf){
                    //     if (err) {
                    //         throw err;
                    //     }
                    //     console.log('send', buf);
                    //     response.send(buf);
                    // });
                }
            };
            ender();
        // }
        // catch (err) {
        //     console.error(err, err.stack.split("\n"));
        //     response.status(500).send(err);
        // }
    };
    cache.client()
        .getGroup(gid)
        .then(success)
        .catch(function(err){
            throw (err);
            response.status(500).send(err);
        });
}

module.exports = function(config){

    config = config || {};
    var app = express();
    app.use(favicon());

    var router = express.Router();
    app.use(function(request, response, next){
        request.config = config;
        next();
    });

    var basePort = process.env.PORT || config.port || 3000;
    app.set('port', basePort + 1);


    router.get('/:group_id', render);
    app.use('/', router);

    app.start = function(postStart){
        // app.use(fof);
        Font.select('default', function(){
            var server = app.listen(app.get('port'), function(){
                console.log('Express server listening on port ' + server.address().port);
                if(postStart){
                    postStart(app, server);
                }
            });
        });
    };

    return app;
};
