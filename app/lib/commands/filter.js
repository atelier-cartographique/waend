/*
 * app/lib/commands/filter.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');



function filter (pattern, flags) {
    var self = this,
        shell = self.shell,
        stdin = self.sys.stdin,
        stdout = self.sys.stdout,
        stderr = self.sys.stderr,
        re = new RegExp(pattern, flags);



    var resolver = function (resolve, reject) {

        var depth = 0;

        var end = function(){
            console.log('end', depth);
            depth -= 1;
            if(depth <= 0){
                resolve();
            }
        };

        var runFilter = function () {
            var line = stdin.read();
            if(!!line) {
                depth += 1;
                console.log('inline', depth);
                line
                    .then(function(data){
                        var match = false;
                        for (var i = 0; i < data.length; i++) {
                            var str = _.result(data[i], 'toString');
                            if(str && str.match(re)){
                                match = true;
                                break;
                            }
                        }
                        if (match) {
                            stdout.write.apply(stdout, data);
                        }
                    })
                    .catch(function(err){
                        stderr.write(err);
                    })
                    .finally(function(){
                        end();
                        runFilter();
                    });
            }
            else {
                end();
            }
        };

        runFilter();
    };

    return self.end(resolver);
};


module.exports = exports = {
    name: 'filter',
    command: filter
};