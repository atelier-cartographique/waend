#HELP WÆND
[(Right click this link to open help in another windows)](http://alpha.waend.com/documentation/help.html)  

This is a quite rought help for now, it will be improved from time to time.  
Feel free to give a hand !



1.   [Common commands](#commands)

2.   [Style attributes and parameters](#keys)  
2.1  [name](#name)  
2.3  [styles (style.)](#style)  
2.4  [parameters (params.)](#params)  
2.5  [hatches number (hn)](#hn)  
2.6  [hatches step (step)](#step)  
2.7  [hatches rotation (rotation)](#rotation)  
2.8  [text](#text)  
2.9  [fontsize](#fontsize)  
2.10 [fontcolor](#fontcolor)  
2.11 [image](#image)

3.   [Commands details](#commands-details)  
3.1  [help](#help)  
3.3  [list commands (lc)](#lc)  
3.4  [set attribute (set)](#set)  
3.5  [get attributes (get)](#get)  
3.6  [edit text (edit)](#edit)  
3.7  [delete attributes (del)](#del)  
3.8  [navigate on map (navigate)](#navigate)  
3.9  [select feature (select)](#select)  
3.10 [draw](#draw)  
3.11 [trace](#trace)  
3.12 [del_feature](#del_feature)
3.13 [attach a layer to a map](#attach)
3.14 [detach a layer from a map](#detach)  
3.15 [visibility of layers](#visible)  

4.   [Style tips & tricks](#style-tips)  
4.1  [polygon fill color](#tip-fill)  
4.2  [play with Composite Operation](#tip-composite)  

5.   [Import Datas](#import)  
5.1  [Working with GeoJSON](#GeoJSON)




## <a name="commands"></a>Common commands

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
- import : *import GeoJSON file (only imports feature of type "Polygon" and "LineString")*
- media upload : *upload image*
- media list : *browse images*
- media show [image_id]: *show image*
- media pick : *select an image*

Pipe (|) is allowed to chain commands together.
e.g:

```
draw | close | create
```

to draw a line, close it to make a polygon, and save it.
That's what the "draw zone" button does !

```
media pick | set params.image
```
To attach an image to a feature.

## <a name="keys"></a> Style attributes and parameters

Every entities are attached a dictionary.
One manipulates dictionary's values with the ```get```, ```set```,  ```del``` and ```edit``` commands.

For more infos with those commands, see :  

* [set attribute (set)](#set)  
* [get attributes (get)](#get)  
* [del attributes (del)](#del)  
* [edit attributes (edit)](#edit)  

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

###<a name="name"></a> name

The *name* key is often used across the platform to textualize items, if not found, the system will usually use item's identifier.

###<a name="style"></a> styles (style.)

The style dictionary is expected to hold feature's style informations. Keys here are [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) properties.

color example:

	set style.strokeStyle orange  
	set style.strokeStyle #FF7F00  
	set style.strokeStyle "rgb(255, 127, 0)"  
	set style.strokeStyle "rgba(255, 127, 0, 0.8)"  

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

###<a name="params"></a> parameters (params.)

Holds parameters to feed the *rendering program*. The default renderer processes the following keys in the *params* dictionary.


####<a name="hn"></a> hatches number (hn)
application: polygon  
number of hatches per polygon (number)

Example:

	set params.hn 150

####<a name="step"></a> hatches step (step)
*application: polygon*  
steps value between hatches (number)

Example:

	set params.step 10

####<a name="rotation"></a> hatches rotation (rotation)
*application: polygon*  
hatches angle (number)

Example:

	set params.rotation 45


####<a name="text"></a> text
*application: line / polygon*  
the text you want to display in a polygon  

Example:

	set params.text "enter your text here"

####<a name="fontsize"></a> fontsize
*application: line / polygon*  
size of the font (number)

Example:

	set params.fontsize 12

####<a name="fontcolor"></a> fontcolor (fillStyle)

Example:

	set style.fillStyle orange  
	set style.fillStyle #FF7F00  
	set style.fillStyle "rgb(255, 127, 0)"  
	set style.fillStyle "rgba(255, 127, 0, 0.8)" 


#### <a name="image"></a> image
*application: polygon*

Set an image to be inserted at the polygon's location.

```params.clip``` boolean (default to true)

```params.adjust``` 'none' or 'fit' or 'cover' (default to 'none')

## <a name="commands-details"></a> Commands details

### <a name="help"></a> help
get help

### <a name="lc"></a> list comands (lc)
list commands  

### <a name="set"></a> set attribute (set)
set attribute to current element (user, group, layer or feature).

[set] is very usefull to qualify your datas, to give informations about your maps, etc.

Multiple words must be surronded by "quotes".

Example :

	set name my-element-name
	set description "here is my description"
	set "city population" 1000000

### <a name="get"></a> get attributes (get)
get all attributes from current element
get attributeName : get value for attributeName

Example :

	get
	get name

### <a name="edit"></a> edit
There is no *edit* button yet, but the functionality is here.
To edit a key, type :

	get your_key | edit | set your_key

It will get the *your_key* value, open the editor with this value, and set the edited value to *your_key*

To edit *style* or *params* dictionary, do the same with :

	get style | edit | set style
	or
	get params | edit | set params


### <a name="del"></a> delete (del)
Delete an attribute

Example:

	del text

Delete an attribute in *style* or *params*  

For now you need to delete the entire *style* or *params* with :

	del params
	or
	del style



### <a name="navigate"></a> navigate in map (navigate)
navigate in the map viewport  
use keyboard arrows to navigate  
use [i] to zoom in  
use [o] to zoom out

Type any other key to escape this mode.

### <a name="select"></a> select features (select)
select a feature in the viewport

### <a name="draw"></a> draw
draw with on map, usualy pipped with another command  

Example:

	draw | region set

will set the region viewport to the drawing extend


### <a name="trace"></a> trace
trace with on map, usualy pipped with another command.  
Trace is usefull to creat segmented lines and polygons.

keys:
- ```enter``` validate geometry and exit
- ```escape``` cancel geometry and exit
- ```e``` enters edit mode (moving control points)
- ```n``` enters append mode (click to add points)

To create a feature out of it, in a layer context, use :

	trace | create

It will draw a line and create a feature out of it.  
Click on the first point to close the line and make a polygon.

To edit a feature geometry, use :

	gg | trace | sg


### <a name="del_feature"></a> delete feature (del_feature)

In the context of a feature, and if you're granted to, the command will delete the current feature and bring you back to the parent layer context.

In the context of a layer, you must give a feature ID in argument of the command.

### <a name="attach"></a> attach a layer to a map (attach)

If you're the owner of the layer, the command will attach the said layer to a map. It doesn't *move* the layer but will *display* it within this other map.

The argument is made of a valid path to be created.

```
attach /user_id/map_id/layer_id
```

```/user_id/map_id``` = the context where you want to attach the layer.  
```layer_id```= the layer id.


### <a name="detach"></a> detach a layer from a map (detach)

The ```detach``` command *undo* what has been done by the ```attach``` command, and works the same way.

```
detach /user_id/map_id/layer_id
```

A subtlety about *compositions* ---which is what attachments are called internally--- is that when you create a layer in the context of a group/map, its only relationship to this map is the composition that's created at the same time. It does mean that if you're willing to *remove* a layer, at the moment, your best option is to detach it from all maps it's attached to.


### <a name="visible"></a> Visibility of layers (visible)

On a map context, type ```visible``` to chose which layers to display.



##<a name="style-tips"></a> Style tips & tricks

###<a name="tip-fill"></a> polygon fill color

Set ```params.hn``` key to 1 (One line to this polygon).  
Set ```style.lineWidth``` to 3000 (the line will be 3000px wide)

You are done with a filled polygon !

###<a name="tip-composite"></a> Play with Composite Operation

We use multiply compositing mode by default in layers.  
If you want to change it, please refer to [Canvas MDN documentation] (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)

Exemple for no compositing :

	set style.globalCompositeOperation source-over


##<a name="import"></a> Import data (import)

###<a name="GeoJSON"></a> Working with GeoJSON

While Wænd is not meant to be an online Geographic Information System, you can import data within layers and work with them:

We currently only support GeoJSON format.
The restrictions so far are :

- no multipolygons
- no multilines
- no points

An easy way to create a GeoJSON file from your zone of interest is to use [http://overpass-turbo.eu/](http://overpass-turbo.eu/), it is a powerfull online tool quickly export data from OpenStreetMap.

Another option is to use [QGis](http://www.qgis.org/en/site/), a free and opensource GIS, that you can use for manipulating any kind of geo-datas.

*Good to know* : Your datas should be in EPGS:4326 - WGS84, and we display them in EPSG:3857.  
