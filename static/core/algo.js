/*
 * algo.js
 *     
 * 
 * Copyright (C) 2013  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * This program is free software: you can redistribute it and/or modify *
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */


define(['underscore'],
function(_){
    
    /*
     * implements binary search (recursive)
     * 
     * https://en.wikipedia.org/wiki/Binary_search_algorithm
     * Where it's different from general implementation lies in the fact
     * that's the predicate which evaluates rather then numeric comparision. 
     * Thus the predicate must know the key. 
     * 
     * @param min Number minimum value
     * @param max Number maximun value
     * @predicate Function(pivot) a function that evaluates the current mid value a la compareFunction
     * @context Object context to which the predicate is applied
     * 
     */
    
    
    
    function NotFoundException(){
        function ResultNotFoundException() {
            this.message = 'Not found.';
            this.name = "ResultNotFoundException";
        };
        
        throw new ResultNotFoundException;
    };
    
    function binarySearch(min, max, predicate, context){
//         console.log('binarySearch', min, max);
        var interval = max - min;
        var pivot = min + (Math.floor(interval/2));
        
        if(max < min){
            NotFoundException();
        }
        
        if(predicate.apply(context, [pivot]) > 0){
            return binarySearch(min, pivot, predicate, context); 
        }
        else if(predicate.apply(context, [pivot]) < 0){
            return binarySearch(pivot + 1, max, predicate, context); 
        }
        return pivot;
    };
    
//     function p(key, pivot){
//         if(pivot < key)
//             return -1;
//         else if(pivot > key)
//             return 1;
//         return 0;
//     };
// 
//     _.each([201, 304, 409, 456, 587, 876], function(v){
//         var r = binarySearch(0, 1000, _.partial(p, v));
//         console.log('binarySearch', v, r, v === r);
//     });

    function sum(items){
        if (items instanceof Array)
            return _.reduce(items, function(mem, val){ return mem + val}, 0);
        else
            throw new TypeError("Function sum only takes arrays");
    };

    function average(items){
        if (items instanceof Array)
            return sum(items) / items.length;
        else
            throw new TypeError("Function average only takes arrays");
    };

    function standardDeviation(items){
        if(items instanceof Array){
            var mean = average(items);

            return Math.sqrt(
                _.reduce (items, function (mem, val) {
                    return mem + Math.pow(val - mean, 2);
                }, 0) / items.length
            );
        }else{
            throw new TypeError("Function standardDeviation only takes arrays");
        }
    };
    
    var _sequenceindex = 1;
    function nextInSequence(){
        return ++_sequenceindex;
    };
    
    
    function nearestValue(val, references){
        if(references instanceof Array){
            var newVal = _.min(references, function(ref){
                return Math.abs(ref - val);
            });
            return newVal;
        }else{
            throw new TypeError("Function nearestValue needs an array of reference values");
        }
    };
    
    

    function nowOrAtCallback (nowFunc, nowCtx, callback, callbackCtx) {
        if (callback) {
            return function () {
                callback.apply(callbackCtx, arguments);
                nowFunc.apply(nowCtx);
            }
        } else {
            nowFunc.apply(nowCtx);
        }
    };

    return {
        binarySearch: binarySearch,
        average: average,
        sum: sum,
        standardDeviation: standardDeviation,
        nextInSequence: nextInSequence,
        nearestValue: nearestValue,
        nowOrAtCallback: nowOrAtCallback,
    };
    
});