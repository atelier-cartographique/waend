var $window = $(window)
				var $box = $(".box");
				var $menus = $(".header ul");
				
				var currentIndex = 0;
				var lastIndex = -1;
				
				var positions = []
				
				//
				
				$menus.find("li").each(function(index){
					
					$(this).css({
						position: "absolute",
						top: index*74,
						color: $box.eq(index).css("#1c2541")
					});
					setHeader();
				});
				
				//
				
				$window.scroll(function() {    
					
				    var scrollTop = $window.scrollTop();
				    
				    $.each(positions, function(index, value){
					    if(value > scrollTop ){	
					    	if(currentIndex != index){
					    		lastIndex = currentIndex;
						    	currentIndex = index;
						    	setHeader();
					    	}
							return false;	
					    }
				    });
				    
				});
				
				function setHeader(){
				
					TweenLite.to( $menus, 0.5, {top: -74*currentIndex - 14 });
				
					if(currentIndex > lastIndex){
            //some animation from top to bottom
						//console.log("otgore nadolu");
					} else {
             //some animation from bottom to top 
						//console.log("otdolu nagore");
					}
				}
				
				$window.resize(function(){
					positions.length = 0;
					$box.each(function(){
						var $elem = $(this);
						return  positions.push( parseInt($elem.offset().top + $elem.height() - 100));
					});
				}).resize();