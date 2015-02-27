/**
 *
 * positioning.js
 *
 * author: Pierre Marchand <pierremarc07@gmail.com>
 *
 * date: 2012-04-16
 *
 */
define([
    'underscore'
],
    function (_) {
        'use strict';

        /**
         * Positioner classes have one job : taking positionable views and position them.
         * A positionable view is a Backbone view that respects the following contract:
         *
         * 1. It has a boolean "positionable" attribute, used to determine if the view can already be positioned or
         * if the positioner needs to wait for the "positionable" event.
         * 2. It trigger the "positionable" event whenever it is ready to be positioned.
         *
         * This class serves as a base class for specific positioners, consider it as an abstract class.
         *
         * @constructor
         */
        var BasePositioner = function (options) {
            this.positionedViews = {};

            // Default option
            if('undefined' === typeof options.container) {
                throw 'positioners must be given a "container" option (a DOM element)';
            }
            this.$container = options.container;
            this.delay = ('undefined' !== typeof options.delay) ? options.delay : null;

            // Debug
            var debug = ('debug' in options) ? options.debug : false;
            if(true === debug) {
                _.delay(_.bind(this.debug, this), 500);
            }

            // Call initialize
            this.initialize();
        };
        _.extend(BasePositioner.prototype, Backbone.Events, {
            /**
             * Child classes need to implement this method, this is where the layout setup is done (width / height and
             * other geometrical calculations, etc...)
             */
            initialize: function() {
                throw "Not implemented";
            },

            /**
             * Position a view
             *
             * @param view
             */
            position: function (view) {
                // First, register the view
                this.positionedViews[view.cid] = view;

                // Then create the positioning callable, which consists in executing the actual positioning code (
                // in doPosition) and triggering the positioned event. The callable might have to be delayed to
                // take browser positioning issues into account
                var callable = _.bind(function() {
                    this.doPosition(view);
                    view.trigger('positioned');
                }, this);
                if(null !== this.delay) {
                    callable = _.partial(_.delay, callable, this.delay);
                }

                // After that, depending on whether the view is positionable, we execute the callable or schedule it
                // for later
                if(view.positionable) {
                    callable.call(this);
                }
                else {
                    this.listenTo(view, 'positionable', callable);
                }
            },

            /**
             * Child classes need to implement this method that takes care of the actual positioning
             *
             * @param view
             */
            doPosition: function (view) {
                throw "Not implemented";
            },

            /**
             * Child classes need to implement this method for debugging purposes (see ColumnPositioner for an
             * example)
             *
             * @param view
             */
            debug: function () {
                throw "Not implemented";
            }
        });

        /**
         * The column class is used by the column positioner. Columns include positionable views. Please note that the
         * column does not correspond to a DOM element, it is a simple geometrical element that keeps track on the
         * included views and of its current vertical offset (the offset is set by the column group).
         *
         * @param index the 0-based index of the column within the positioner
         * @param width the column width
         * @constructor
         */
        var Column = function (index, width, gutter) {
            this.index = index;
            this.width = width;
            this.gutter = gutter;
            this.xOffset = parseInt(Math.floor(index * width + (index * gutter)));
            this.yOffset = 0;
            this.views = [];
        };
        _.extend(Column.prototype, {
            /**
             * Add a view to the column
             *
             * @param view
             */
            includeView: function (view) {
                this.views.push(view);
            },

            /**
             * Set the new yOffset, adding the gutter in the process
             * @param yOffset
             */
            setNewYOffset: function(yOffset) {
                this.yOffset = parseInt(Math.ceil(yOffset + this.gutter));
            },

            /**
             * Return the column xOffset
             * @returns {number|*}
             */
            getXOffset: function() {
                return this.xOffset;
            },

            /**
             * Return the column xOffset
             * @returns {number|*}
             */
            getYOffset: function() {
                return this.yOffset;
            }
        });

        /**
         * Column groups are created on the fly every time the positioner tries to guess where to position a view. As
         * views can span multiple columns, the positioner always work with column groups when trying to guess the
         * position (if the view does not span over multiple columns, 1-column groups will be used)
         *
         * @constructor
         */
        var ColumnGroup = function () {
            this.columns = [];
            this.yOffset = 0;
        };
        _.extend(ColumnGroup.prototype, {
            /**
             * Add a column to the group
             *
             * @param column
             */
            addColumn: function (column) {
                this.columns.push(column);
            },

            /**
             * Add a view to the column group (which implies adding the view to every column in the group)
             *
             * @param view
             */
            includeView: function(view) {
                // First, we need to find the lowest column - this column will later determine the new yOffset of every
                // column in the group
                var lowestColumn = _.last(_.sortBy(this.columns, function(column) {
                    return column.getYOffset();
                }, this));

                // The yOffset of the lowest column can be considered as the yOffset of the group. This is where the
                // view will be positioned
                this.yOffset = lowestColumn.getYOffset();

                // Now, we can add the view to every column in the group, and calculate a new yOffset each of these
                // views
                var newColumnYOffset = lowestColumn.getYOffset() + view.getBoundingRect().height();
                _.each(this.columns, function(column) {
                    column.includeView(view);
                    column.setNewYOffset(newColumnYOffset);
                }, this);
            },

            /**
             * Return the number of views of the first column. This is used to determine, among multiple column groups,
             * which should receive a view first
             *
             * @returns {Number}
             */
            getFirstColumnViewCount: function() {
                return _.first(this.columns).views.length;
            },

            /**
             * Return the column group xOffset
             * @returns {number|*}
             */
            getXOffset: function() {
                return _.first(this.columns).getXOffset();
            },

            /**
             * Return the column group yOffset
             * @returns {number|*}
             */
            getYOffset: function() {
                return this.yOffset;
            }
        });

        /**
         * The column positioner position the views in a multi-column layout. Some elements can span over
         * multiple columns. See also the documentation for the BasePositioner class for more information about the
         * general behaviour of the positioner.
         *
         * Usage example:
         *
         * var positioner = new ColumnPositioner({
         *     container: $('.some-container'), // a container for the positioned views
         *     width: 1000, // the positioner total width, in pixels
         *     columnWidth: 100, // the width of each individual column, in pixels
         *     delay: 50, // (optional), a delay in ms before elements are actually positioned, in order to cope with browser positioning woes
         *     debug: true // (optional, defaults to false)
         * });
         *
         * positioner.position(view1);
         * positioner.position(view2);
         *
         * @constructor
         * @param options
         */
        var ColumnPositioner = function (options) {
            // Manage width and columns
            if('undefined' === typeof options.width || 'undefined' === typeof options.columnWidth) {
                throw 'The column positioner must have both a "width" and a "columnWidth" options';
            }
            this.width = options.width;
            this.columnWidth = options.columnWidth;
            this.columns = [];

            BasePositioner.call(this, options);
        };
        _.extend(ColumnPositioner.prototype, BasePositioner.prototype, {
            /**
             * Initialize the layout (calculate number of columns, gutter, instantiating columns...)
             *
             */
            initialize: function () {
                var numberOfColumns = Math.floor(this.width / this.columnWidth);
                this.gutter = (this.width % this.columnWidth) / (numberOfColumns - 1);

                for (var i = 0; i <= numberOfColumns - 1; i++) {
                    this.columns[i] = new Column(i, this.columnWidth, this.gutter);
                }
            },

            /**
             * Position the view according to the current column layout
             *
             * @param view
             */
            doPosition: function (view) {
                // First, position the element absolutely and append it to the container - this is how the
                // column positioner works
                this.$container.append(view.$el);
                view.$el.css('position', 'absolute');

                // Then, detetrmine the column group in which to place the view
                var columnGroup = this.findColumnGroup(view);
                columnGroup.includeView(view);

                // And finally, perform the translation
                view.translate(columnGroup.getXOffset(), columnGroup.getYOffset()).transition();
            },

            /**
             * Attempt to determine in which column group the view need to be placed
             *
             * @param view
             * @returns {*}
             */
            findColumnGroup: function (view) {
                // First, we need to find the last possible column (elements that span over three columns cannot be
                // placed in the last column)
                var lastPossibleColumnIndex = this.columns.length - view.getSpan();
                var columnGroupCandidates = [];

                // Create a column group for every possible combination of available consecutive columns, taking the
                // column span into account (ex: column 1 & 2, or column 2 & 3, or column 3 & 4 etc...)
                for(var i = 0; i <= lastPossibleColumnIndex; i++) {
                    var columnGroup = new ColumnGroup();
                    for(var j = i; j<= i + view.getSpan() - 1; j++) {
                        columnGroup.addColumn(this.columns[j]);
                    }
                    columnGroupCandidates.push(columnGroup);
                }

                // Finally, we will choose the column group having a first column with the lowest view count
                var sortedColumnGroups = _.sortBy(columnGroupCandidates, function(columnGroup) {
                    return columnGroup.getFirstColumnViewCount();
                });

                return _.first(sortedColumnGroups);
            },

            /**
             * Create debug columns (to be displayed with a random, semi-transparent color in the provided container)
             *
             */
            debug: function () {
                var left = 0;
                _.each(this.columns, function (column) {
                    var $debugColumn = $('<div>');
                    $debugColumn.css({
                        position: 'absolute',
                        left: left,
                        width: column.width,
                        height: "100%",
                        backgroundColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
                        opacity: 0.3,
                        zIndex: 1000000
                    });
                    this.$container.append($debugColumn);
                    left += column.width + this.gutter;
                }, this);

                var offset = 1;
                _.each(this.positionedViews, function (view) {
                    var $debugNumber = $('<div>');
                    $debugNumber.text(offset);
                    $debugNumber.css({
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        background: '#333',
                        color: '#fff',
                        padding: 5,
                        borderRadius: 5,
                        fontSize: 10
                    });
                    view.$el.append($debugNumber);
                    offset++;
                });
            }
        });

        return {
            ColumnPositioner: ColumnPositioner
        }
    });