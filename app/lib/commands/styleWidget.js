/*
 * app/lib/commands/textEdit.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

var _ = require('underscore'),
    Promise = require('bluebird');


function styleWidget (opt_txt) {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();

   var resolver = function (resolve, reject) {

       var styleWidgetWrapper = document.createElement('div');
       styleWidgetWrapper.setAttribute('class', 'stylewidget-wrapper');
       display.node.appendChild(styleWidgetWrapper);


       var styleWidgetStep = document.createElement('input');
       styleWidgetStep.setAttribute('id', 'styler-step');
       styleWidgetStep.setAttribute('placeholder', 'set haches step');
       styleWidgetStep.setAttribute('type', 'number');
       styleWidgetStep.setAttribute('step', 'any');
       styleWidgetStep.setAttribute('min', '0');
       styleWidgetWrapper.appendChild(styleWidgetStep);

       var launchStep = document.getElementById("styler-step");
       launchStep.onchange = function (){
            var value = document.getElementById('styler-step').value;
            var cmd = terminal.makeCommand({
                'args': [
                    'set params.step' + ' ' + value],
                'text': 'almost there.. '
            });

            stdout.write(cmd);
            console.log(value);
       }


       var buttons = document.createElement('div');
       buttons.setAttribute('class', 'stylewidget-buttons');


       var closeButton = document.createElement('div');
       closeButton.setAttribute('class', 'stylewidget-close');
       closeButton.innerHTML = 'Close';

       closeButton.addEventListener('click', function(){
           display.end();
           reject('Canceled');
       }, false);

       buttons.appendChild(closeButton);
       styleWidgetWrapper.appendChild(buttons);
   };

   return (new Promise(resolver));
}


module.exports = exports = {
    name: 'styler',
    command: styleWidget
};
