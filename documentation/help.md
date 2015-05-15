#HELP WÆND
This is a quite rought help for now, it will be improved from time to time.
Fell free to help ! 


##Common commands

- help : *help*
- set : *set something to something, often attribute to current context*
- del : *delete + attribute name to delete*
- get : *get current context attributes*
- lg : *list groups*
- ll : *list layer*
- lf : *list features*
- lc : *list command*
- select : *select feature in viewport*
- draw : *draw on map*
- navigate : *navigate on map*
- import : *import GeoJSON file (cannot be multilines, multipolygons, or points)*
- media upload : *upload image*
- media list : *browse images*

Pipe (|) is allowed to chain commands together.
like :

	draw | close | create

to draw a line, close it to make a polygon, and save it.
That's what the "draw zone" button does ! 

##Common keys
- name
- text
- fontsize
- color
- step
- hn
- rotation

##Commands details

###help 
get help

###lc
list commands  

###set
set attribute to current element (user, group, layer or feature). 
 
[set] is very usefull to qualify your datas, to give informations about your maps, etc.
 
Multiple words must be surronded by "quotes".

Exemple : 
	
	set name my-element-name
	set description "here is my description"
	set "city population" 1000000

###del
Delete an attribute

Exemple:

	del text

###get
get all attributes from current element 
get attributeName : get value for attributeName

Exemple : 
	
	get 
	get name


###navigate
navigate in the map viewport  
use keyboard arrows to navigate  
use [i] to zoom in  
use [o] to zoom out

###select
select a feature in the viewport

###draw
draw with on map, usualy pipped with another command  

Exemple:

	draw | region set

will set the region viewport to the drawing extend


##Style keys details

###hn
number of hatches per polygon (number)

Exemple:

	set hn 150

###step
steps value between hatches (number)

Exemple:

	set step 10

###rotation
hatches angle (number)

Exemple:

	set rotation 45

###color
set color (all css color value welcome)

Exemple for orange color:

	set color orange
	set color #FFA500
	set color "rgba(255, 165, 0, 1)"

###Text
the text you want to display in a polygon 

Exemple:

	set text "enter your text here"

###fontsize
size of the font (number)

Exemple:

	set fontsize 120
