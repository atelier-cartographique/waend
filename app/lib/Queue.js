import _ from 'underscore';
import EventEmitter from 'events';

const QueueOptions = ['timeout', 'maxLength'];

class Queue extends EventEmitter {
    initialize(options) {
        this.timeout = 1000;
        this.maxLength = 1000;
        _.extend(this, _.pick(options, QueueOptions) || {});
        this.current = undefined;
    }

    push(fn, ctx, args) {
        const self = this;
        if (self.current){
            const current = self.current;
            current
                .then(() => {

                })
                .catch(err => {

                })
                .finally(() => {
                    logger('Queue', fn.name, args);
                    self.current = Promise.resolve(fn.apply(ctx, args));
                });
        }
        else{
            self.current = Promise.resolve(fn.apply(ctx, args));
        }

        return this;
    }
}

export default Queue;
