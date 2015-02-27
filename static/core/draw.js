define ([
'underscore',
'core/geom'
], function (_, G)
{
	var Draw  = function(canvas){
		this.canvas = canvas || null;
	};

	_.extend (Draw.prototype, {
		draw: function(pts, canvas){
			if (pts instanceof Array) {
				var path = new G.Path(pts);
				return this.drawPath(path, canvas);
			} else if (pts instanceof G.Rect) {
				return this.drawRect (pts, canvas);
			} else if (pts instanceof G.spiral) {
				return this.drawSpiral(pts, canvas);
			}
		},

		drawRect: function(rect, canvas){
			return this.drawPath(
				new G.Path([
					rect.topleft(),
					rect.topright(),

					rect.bottomright(),,
					rect.bottomleft (),
					rect.topleft()
				]), options
			);
		},

		drawSpiral: function(spiral, canvas){
			return this.drawPath (
				new G.Path (spiral.points)
			);
		},

		drawPath: function(path, canvas){
			if (path instanceof G.Path 
                            && path.points.length > 0) {
				var ctx = this.getCtx(canvas)
				ctx.beginPath();
				ctx.moveTo(path.points[0].x, path.points[0].y);
				for (var p = 1; p < path.points.length; p++) {
					ctx.lineTo(path.points[p].x, path.points[p].y);
				}
			}
		},

		strokePath: function(path, canvas, options){
			this.save(canvas);
			this.setOptions(options, canvas);
			this.drawPath(path, canvas);
			this.stroke(canvas);
			this.restore(canvas);
		},

		getCtx: function(canvas, ctx) {
			var canvas = canvas || this.canvas;
			var ctx = ctx || canvas.getContext ('2d');

			return ctx;
		},

		save: function(canvas, ctx) {
			this.getCtx(canvas, ctx).save();
		},

		restore: function(canvas, ctx) {
			this.getCtx(canvas, ctx).restore();	
		},

		stroke: function(canvas, ctx) {
			this.getCtx(canvas, ctx).stroke();
		},

		setOptions: function(options, canvas, ctx) {
			ctx = this.getCtx(canvas, ctx);

			_.each(options, function(value, key) {
				ctx[key] = value;
			})
		},

		clear: function(canvas, ctx){
			ctx = this.getCtx(canvas, ctx);
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
	})

	return Draw;
});