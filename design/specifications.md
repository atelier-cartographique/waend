#Layout & interface Specifications

## General idea : CLI + GUI

The interface is based on both command line interface (CLI) and graphical user interface (GUI).

Both the CLI and the GUI can run and operate the application. They are intimately linked, and displayed together. 

While the GUI makes the platform accessible for non-tech users and tactil devices, the CLI can be very powerfull and usefull for advanced of users. 

The GUI is made of wrapped versions of pre-piped commands available on the CLI. They are displayed as clickable items. 

To do so allows the plateform to be used by : 

* anyone in a 'light' version, with the basic tools and functionalities that can be expected from our app. 
* advanced users and operators to perform more complex actions. 

On another level, the intrication of both interface can help non-tech users to understand the programatic aspect of the application and can be seen as an educational value, helping to understand what is "really happening" in the app.

## Contexts & Navigation in Wænd

The navigation tree is pretty basic: 

- Wænd
	- user
		- group
			- layer
				- feature

*Each level is called a context.*

- Wænd : root level
- User : yes, user level
- Group : a map, created from layer(s), by a user
- Layer : a set of feature(a)
- Feature : the most basic element (a point on a map, an image etc.)


## Interface needs per contexts

#### everywhere
- login/logout
- search in context + display result
- change context (go to user, to group, to layer, to feature)
- help (? contextual)

#### Wænd

- search user / search group + display result
- go to result element / change context + zoom on element region


#### Wænd/user

- list created groups 
- list subscribed groups
- go to a listed group / change context + zoom on group region 
- create a group + pre-required key | value
	- set public / private
	- set name
	- set description
	- set bounding box & zoom
	- set background map (WMS, mapbox etc. / default = none)
	- automatic creation of discussion layer


#### Wænd/user/group

- edit group 
	- set public / private
	- set name
	- set description
	- set bounding box & zoom
	- set background map (WMS, mapbox etc. / default = none)
- list layers (group legend)
- go to list element
- subscribe to a group	
- unsuscribe from a group
- display notifications from subscribed groups
- attach layer to the group + 
- dettach layer from the group

#### Wænd/user/map/layer

- list features
- go to list element
- edit layer
	- set name
	- set description
	- set styles
	- set worker / renderer
- add feature to layer
- attach to a group
- dettach from a group


#### Wænd/user/map/layer/feature

- create / edit feature
	- set name
	- set description
	- set styles (override layer style)
	- insert key / value


## Interface main elements

- Map viewport  
- Interaction zone with the plateform
	- Command line prompt (keyboard)
	- Result (clickable elements)
	- Associated contextual help (clickable commands / =buttons)
	- back to Command line prompt (keyboard)

- Verbose / progress bar when collapsed


## Types of commands in the app

There are so far three type of commands : 

- Command that process data, without any "interface" consequences.  
Eg : "> set key value" will only set a Key and Value in the database, nothing else.

- Command with textual/visual output.  
Eg : "> get group1" will display group1 and the related elements (decription, layers, legends etc.) in html.

- Command with attached interactions.  
Eg : "> create group2" will requier to set group2's description, bounding box and so on.
