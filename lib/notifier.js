/*
 * routes/notifier.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    http = require('http'),
    sockjs  = require('sockjs');

var Token = require('./token'),
    Queue = require('./queue');


var header = 'OK';
var subscriber = sockjs.createServer();
var subscribers = {};


function unsubscribe(conn){
    var user = conn._user;
    if(user && user.id){
        delete subscribers[user.id];
    }
}

function subscribe(tok, conn){

    var user = Token.GET(tok);
    if(user){
        console.log('WoooooW! GOT A USER!!!!', user.get('name'));
        subscribers[user.id] = conn;
        conn._user = user;
        return conn.write(header);
    }

    throw Exception('not a valid token');
}


subscriber.on('connection', function(conn){

    conn.json = function(s, o){
        if(!o){
            o = s;
            s = 200;
        }
        this.write(JSON.stringify({status:s, body:o}));
    };
    conn.auth = false;

    conn.on('close', function() {
        unsubscribe(conn);
    });

    conn.on('data', function(message) {
        console.log('message ' + conn, message);

        if(conn.auth){
            console.log('hmm');
        }
        else{
            var data;
            try{
                data = JSON.parse(message);
            }
            catch(e){
                conn.close(400,  'Expect well formed JSON data string' );
            }
            try{
                subscribe(data.access_token, conn);
            }
            catch(e){
                conn.close(400,  e );
            }
            conn.auth = true;
        }


    });
});


function notifyUser(userid, data){
    console.log('notifyUser', userid);
    if(userid in subscribers){
        try{
            subscribers[userid].write(JSON.stringify(data));
        }
        catch(e){
            console.error('notifyUser\n==========\n', e);
        }
    }
    else{
        console.log('notifyUser - NOT CONNECTED', userid);
    }
}

function broadcast(data){
    _.each(_.keys(subscribers), function(uid){
        notifyUser(data);
    });
}

function notify(data, userid){
    if(userid){
        notifyUser(userid, data);
    }
    else{
        broadcast(data);
    }
}



module.exports = exports = function(server, prefix){
    subscriber.installHandlers(server, {prefix:prefix});
    Queue.SUB('notify', notify);
};
