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


##Style keys

The Style key is a dictionary of keys, using CanvasRenderingContext2D properties. It means that you have to define your style this way : 
	
	exemples for orange color :
	set style.strokeStyle orange
	set style.strokeStyle #FF7F00
	set style.strokeStyle "rgb(255, 127, 0)"
	set style.strokeStyle "rgba(255, 127, 0, 0.8)"
	
	exemples for line width :
	set style.lineWidth 5
	
You can find all the documentation on thoses properties here : <https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D>

*exception:*
	
	If you want to play with dashed lines, 
	SetLineDash has to be writen our way : 
	
	set style.lineDash 2 10
	
	where 2 is the dash lenght, and 10 the gap.

##Parameters

The following keys has to be set autonomously.

###hn
application: polygon  
number of hatches per polygon (number)

Exemple:

	set hn 150
	
###step
*application: polygon*  
steps value between hatches (number)

Exemple:

	set step 10

###rotation
*application: polygon*  
hatches angle (number)

Exemple:

	set rotation 45


###Text
*application: line / polygon*  
the text you want to display in a polygon  

Exemple:

	set text "enter your text here"

###fontsize
*application: line / polygon*  
size of the font (number)

Exemple:

	set linewidth 12

##Style tips & tricks

###polygon fill color

set hn key to 1 (One line to this polygon).  
set style.lineWidth to 3000 (the line will be 2000px wide)

You are done with a filled polygon ! 


##Importing datas

###Working with GeoJSON

While Wænd is not meant to be an online Geographic Information System, you can import datas in it and work with them: 

We currently support GeoJSON format. 
The restrictions so far are : 

- no multipolygons
- no multilines
- no points

An easy way to create a GeoJSON file from your zone of interest is to use [http://overpass-turbo.eu/](http://overpass-turbo.eu/), it is a powerfull online tool quickly export datas from OpenStreetMap.

Another option is to use [QGis](http://www.qgis.org/en/site/), a free and opensource GIS, that you can use for manipulating any kind of geo-datas.