/*
 * logger.js
 *     
 * 
 Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 
 This program is free software: you can redistribute it and/or modify *
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.
 
 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */




define(['underscore'], function( _ ){
    
    var css = {
        log     : 'color:grey;',
        debug   : 'color:blue;font-weight:bold;',
        warning : 'color:orange;font-weight:bold;',
        error   : 'color:red;font-weight:bold;',
        code   : 'color:blck;font-weight:bold;',        
    };

    // var _clog = log.log;

    function writeConsole(){
        var args = _.toArray(arguments);
        console.log.apply(console, args);
    };
    
    var logger = {
        log     : _.partial(writeConsole, '%c[log]', css.log),
        debug   : _.partial(writeConsole, '%c[debug]', css.debug),
        warning : _.partial(writeConsole, '%c[warning]', css.warning),
        error   : _.partial(writeConsole, '%c[error]', css.error),
        code    : _.partial(writeConsole, '%c>>', css.code),
    };
    
    return logger;
});

