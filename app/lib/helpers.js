/*
 * app/lib/helpers.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


module.exports.getModelName = function (model) {
    if (model.get('name')) {
        return model.get('name');
    }
    var id = model.id || '00000000';
    return '•' + id.substr(0, 6);
};
