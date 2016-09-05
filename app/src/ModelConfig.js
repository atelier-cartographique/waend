/*
 * app/src/ModelConfig.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import slugify from 'underscore.string/slugify';
import {getModelName, addClass, emptyElement,
        setAttributes} from '../lib/helpers';


function getDomFragmentFactory (type) {

    function getValue(model, key) {
        if ('name' === key) {
            return getModelName(model);
        }
        return JSON.stringify(model.get(key));
    };

    function getDomFragment(key, tagName='div', attrs) {
        const element = document.createElement(tagName);

        if (attrs) {
            setAttributes(element, attrs);
        }

        addClass(element, `${type}-${slugify(key)}`);

        element.appendChild(
            document.createTextNode(getValue(this, key))
        );

        const updater = (changedKey, newValue) => {
            if (element && (key === changedKey)) {
                emptyElement(element);
                element.appendChild(
                    document.createTextNode(getValue(this, key))
                );
            }
        };

        this.on('set', updater);

        element.addEventListener('remove', () => {
            this.removeAllListeners('set');
        }, false);

        return element;
    }

    return getDomFragment;
}

export function configurator(Model) {
    const type = Model.prototype.type;
    Model.prototype.getDomFragment = getDomFragmentFactory(type);
    return Model;
}
