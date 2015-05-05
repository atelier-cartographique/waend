#HELP WÆND


## Available commands in console

Write the commands in Wænd console line.
Pipe is allowed to chain commands together.

###Common keys

######help 
get help

######lc
list commands  

######set
set attribute to current element (user, group, layer or feature). 
 
[set] is very usefull to qualify your datas, to give informations about your maps, etc.
 
Multiple words must be surronded by "quotes".

Exemple : 
	
	set name my-element-name
	set description "here is my description"
	set "city population" 1000000

######del
Delete an attribute

Exemple:

	del text

######get
get all attributes from current element 
get attributeName : get value for attributeName

Exemple : 
	
	get 
	get name


######navigate
navigate in the map viewport  
use keyboard arrows to navigate  
use [i] to zoom in  
use [o] to zoom out

######select
select a feature in the viewport

######draw
draw with on map, usualy pipped with another command  

Exemple:

	draw | region set

will set the region viewport to the drawing extend


###Style keys

######hn
number of hatches per polygon (number)

Exemple:

	set hn 150

######step
steps value between hatches (number)

Exemple:

	set step 10

######rotation
hatches angle (number)

Exemple:

	set rotation 45

######color
set color (all css color value welcome)

Exemple for orange color:

	set color orange
	set color #FFA500
	set color "rgba(255, 165, 0, 1)"

######Text
the text you want to display in a polygon 

Exemple:

	set text "enter your text here"

######fontsize
size of the font (number)

Exemple:

	set fontsize 120



salle becker / 1er étage
