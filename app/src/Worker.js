import _ from 'underscore';
import config from '../config';
import EventEmitter from 'events';
import debug from 'debug';
const logger = debug('waend:Worker');

const BIN_URL = config.public.binUrl;

class WWorker extends EventEmitter {

    constructor (fn, locals) {
        super();
        this.fn = fn;
        this.locals = locals;
    }

    wrapBody() {
        let body = [
            `importScripts("${BIN_URL}/libworker.js");`
        ];
        for (const k in this.locals) {
            try{
                body.push( `workerContext.waend["${k}"] = ${this.locals[k].toString()};`);
            }
            catch (err) {
                logger('could not load local in worker', k, err);
            }
        }

        body = body.concat([
            `(${this.fn.toString()})(waend);`
        ]);

        return body.join('\n');
    }

    post() {
        const args = _.toArray(arguments);
        const name = args.shift();
        // logger('POST', name);
        this.w.postMessage({
            'name': name,
            'args': args
        });
    }

    // postBuffers: function () {
    //     var args = _.toArray(arguments),
    //         name = args.shift();
    //     // logger('POST', name);
    //     this.w.postMessage({
    //         'name': name
    //     }, args);
    // },

    start() {
        const body = this.wrapBody();

    // http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string#10372280
        const URL = window.URL || window.webkitURL;
        let blob;

        try {
            blob = new Blob([body], {type: 'application/javascript'});
        }
        catch (err) { // Backwards-compatibility
            const BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
            blob = new BlobBuilder();
            blob.append(body);
            blob = blob.getBlob();
        }

        this.w = new Worker(URL.createObjectURL(blob));
        this.w.addEventListener('message', this.onMessageHandler(), false);
        this.w.addEventListener('error', this.onErrorHandler(), false);
        this.w.postMessage({});
    }

    stop() {
        this.w.terminate();
    }

    onMessageHandler() {
        const handler = event => {
            this.emit(...event.data);
        };
        return handler;
    }

    onErrorHandler() {
        const handler = event => {
            console.error(event);
        };
        return handler;
    }
}

export default WWorker;
