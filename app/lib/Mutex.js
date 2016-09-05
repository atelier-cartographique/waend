import _ from 'underscore';
import EventEmitter from 'events';
import debug from 'debug';
const logger = debug('waend:Mutex');

const MutexOptions = ['queueLength'];

class Mutex extends EventEmitter {
    get queueLength () {
        return 128;
    }

    initialize(options) {
        _.extend(this, _.pick(options, MutexOptions) || {});

        this._queue = 0;
        this.setMaxListeners(this.queueLength);
    }

    get() {

        logger('mutex.get', this._queue);
        const self = this;
        const unlock = (fn, ctx) => {
            logger('mutex.unlock', self._queue);
            self._queue -= 1;
            self.emit('unlock', self._queue);
            const defered = () => {
                if (_.isFunction(fn)) {
                    fn.call(ctx);
                }
            };
            _.defer(defered);
        };

        if (self._queue > 0) {
            const resolver = (resolve, reject) => {
                if (self._queue >= self.queueLength) {
                    return reject('QueueLengthExceeded');
                }
                const index = self._queue;
                self._queue += 1;
                logger('mutex.queue', self._queue);
                let listId;
                const listener = q => {
                    if (q <= index) {
                        self.offById(listId);
                        resolve(unlock);
                    }
                };
                listId = self.on('unlock', listener);
            };
            return (new Promise(resolver));
        }
        self._queue += 1;
        return Promise.resolve(unlock);
    }

}

export default Mutex;
