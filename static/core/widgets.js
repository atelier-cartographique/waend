define([
    'jquery',
    'core/types'
], function($, T) {

    var Column = T.View.extend({
        className: 'column',
        
        initialize: function(options) {
            if (_.isObject(options)) {
                if ('width' in options)
                    this.$el.width(options.width);
            }
        },

        add: function($el){
            this.$el.append($el);
        },
    });

    var ColumnView = T.View.extend({
        className: 'columnView',

        initialize: function(options) {
            this._current = -1;
            this.columns = [];
            this.columnCnt = options.columns || false;
            this.columnWidth = options.columnWidth || false;
            this.width = options.width || false;
            this.margin = 0;

            if (_.isObject(options)) {
                if('element' in options) {
                    this.setElement(options.element);
                }

        	}

            if(this.columnWidth && this.width) {
                this.columnCnt = Math.floor(this.width / this.columnWidth);
                this.margin = (this.width - (this.columnCnt * this.columnWidth)) / (this.columnCnt);
            } else if (this.columnWidth && this.columnCnt) {
                this.width = this.columnWidth * this.columnCnt;
            } else if (this.width && this.columnCnt) {
                this.columnWidth = this.width / this.columnCnt;
            }

            for (var c = 0; c < this.columnCnt; c++) {
                var column = new Column({width: this.columnWidth});
                this.columns.push(column);
                this.$el.append(column.$el);
                column.$el.css('margin-left', this.margin);
            }
            
            var $el = this.$el;
            var topOffset = $el.offset().top;
            var wh = $(window).height();
            $el.css({height: (wh - topOffset)+'px'});
        },

        add: function($el) {
            if (this.next() !== false) {
                this.columns[this._current].add($el);
            }
        },

        next: function() {
            if (this.columns.length > 0) {
                if (this._current > -1 && this._current < this.columns.length - 1)
                {
                    this._current++;
                } else {
                    this._current = 0;
                }

                return this._current;
            } else {
                return false;
            }
        }
    });

    return {
        Column: Column,
        ColumnView: ColumnView
    };

});