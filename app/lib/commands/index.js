/*
 * app/lib/commands/index.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import listCommands from './listCommands';
import login from './login';
import logout from './logout';
import echo from './echo';
import read from './read';
import changeContext from './changeContext';
import printCurrentContext from './printCurrentContext';
import setAttribute from './setAttribute';
import getAttribute from './getAttribute';
import delAttribute from './delAttribute';
import create from './create';
import createGroup from './createGroup';
import region from './region';
import zoom from './zoom';
import pan from './pan';
import filter from './filter';
import drawLine from './drawLine';
import trace from './trace';
import navigate from './navigate';
import view from './view';
import embed from './embed';
import media from './media';
import select from './select';
import close from './close';
import textEdit from './textEdit';
import help from './help';
import lookup from './lookup';
import delFeature from './delFeature';
import attach from './attach';
import detach from './detach';
import widget from './widget';
import wSet from './wSet';
import notify from './notify';
import capture from './capture';


export {
    listCommands,
    login,
    logout,
    echo,
    read,
    changeContext,
    printCurrentContext,
    setAttribute,
    getAttribute,
    delAttribute,
    create,
    createGroup,
    region,
    zoom,
    pan,
    filter,
    drawLine,
    trace,
    navigate,
    view,
    embed,
    media,
    select,
    close,
    textEdit,
    help,
    lookup,
    delFeature,
    attach,
    detach,
    widget,
    wSet,
    notify,
    capture
};
