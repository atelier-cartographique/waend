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

## Keys

Every entities are attached a dictionary.
One manipulates dictionary's values with the ```get```, ```set``` and ```del``` commands.

Something to note here, from a key you can reference another key in the same dictionary by prefixing its path with the *@* character, e.g:

```json
{
	"params" : {
		"text" : "@name"
	},
	"name" : "felicity street"
}
```

Something else is that you can address keys which are inside dictionaries with the dot notation, e.g:

```
set style.strokeStyle blue
```

will results in

```json
{
	"style": {
		"strokeStyle" : "blue"
	}
}
```

Note that feature's *style* and *params* dictionaries inherit from their layer's values.

### name

The *name* key is often used across the platform to textualize items, if not found, the system will usually use item's identifier.

### style

The style dictionary is expected to hold feature's style informations. Keys here are [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) properties.

color example:
```
set style.strokeStyle orange
set style.strokeStyle #FF7F00
set style.strokeStyle "rgb(255, 127, 0)"
set style.strokeStyle "rgba(255, 127, 0, 0.8)"
```
line width example:
```
set style.lineWidth 5
```
**exception**

If you want to play with dashed lines,
setLineDash has to be written our way :
```
set style.lineDash 2 10
```
where 2 is the dash length, and 10 the gap.

### params

Holds parameters to feed the *rendering program*. The default renderer processes the following keys in the *params* dictionary.


#### hn
application: polygon  
number of hatches per polygon (number)

Example:

	set params.hn 150

#### step
*application: polygon*  
steps value between hatches (number)

Example:

	set params.step 10

#### rotation
*application: polygon*  
hatches angle (number)

Example:

	set params.rotation 45


#### text
*application: line / polygon*  
the text you want to display in a polygon  

Example:

	set params.text "enter your text here"

#### fontsize
*application: line / polygon*  
size of the font (number)

Example:

	set params.fontsize 12



## Commands details

### help
get help

### lc
list commands  

### set
set attribute to current element (user, group, layer or feature).

[set] is very usefull to qualify your datas, to give informations about your maps, etc.

Multiple words must be surronded by "quotes".

Example :

	set name my-element-name
	set description "here is my description"
	set "city population" 1000000

### del
Delete an attribute

Example:

	del text

### get
get all attributes from current element
get attributeName : get value for attributeName

Example :

	get
	get name


### navigate
navigate in the map viewport  
use keyboard arrows to navigate  
use [i] to zoom in  
use [o] to zoom out

### select
select a feature in the viewport

### draw
draw with on map, usualy pipped with another command  

Example:

	draw | region set

will set the region viewport to the drawing extend




## Style tips & tricks

### polygon fill color

Set ```params.hn``` key to 1 (One line to this polygon).  
Set ```style.lineWidth``` to 3000 (the line will be 3000px wide)

You are done with a filled polygon !


## Import data

### Working with GeoJSON

While Wænd is not meant to be an online Geographic Information System, you can import data within layers and work with them:

We currently only support GeoJSON format.
The restrictions so far are :

- no multipolygons
- no multilines
- no points

An easy way to create a GeoJSON file from your zone of interest is to use [http://overpass-turbo.eu/](http://overpass-turbo.eu/), it is a powerfull online tool quickly export data from OpenStreetMap.

Another option is to use [QGis](http://www.qgis.org/en/site/), a free and opensource GIS, that you can use for manipulating any kind of geo-datas.
