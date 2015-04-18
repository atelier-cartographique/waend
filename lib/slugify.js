/*
 *
 * slug wrapper
 *
 *
 */


var slug = require('slug');

slug.defaults.modes.waend = {
    replacement: '-',
    symbols: true,
    remove: /[.]/g,
    charmap: slug.charmap,
    multicharmap: slug.multicharmap
};

slug.defaults.mode = 'waend';


module.exports = function(s){
	return slug(s).toLowerCase();
};
