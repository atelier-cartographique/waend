#Layout & interface Specifications

## General idea : CLI + GUI

The interface is based on both command line interface (CLI) and graphical user interface (GUI).

Both can run and operate the whole application. 

While the CLI can be very powerfull and usefull for a certain type of users, the GUI makes the platform accessible for non-tech users and tactil devices. 

The CLI and the GUI are intimately linked, and are displayed together. 
This intrication will help non-tech users to understand the programatic aspect of the application and can be seen as an educational value.

## Three types of commands are running the app

There are so far three type of commands : 

- Command that process data, without any "interface" consequences.  
Eg : "> set key value" will only set a Key and Value in the database, nothing else.

- Command with textual/visual output.  
Eg : "> get group1" will display group1 and the related elements (decription, layers, legends etc.) in html.

- Command with attached interactions.  
Eg : "> create group2" will requier to set group2's description, bounding box and so on.

## Contexts / Navigation

The navigation tree is pretty basic: 

- Wænd
	- user
		- group
			- layer
				- feature

*Each level is called a context.*

## Interface needs per contexts

#### everywhere
- login/logout
- search
- change context
- help

#### Wænd

- search user / search group
- go to list element / change context 


#### Wænd/user

- list created groups
- list subscribed groups
- go to a listed group
- create a group 
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
- attach layer to the group
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


## Interface relations with CLI & GUI

As said above, the command line interface is the root mecanism to run the platform, and it generates the GUI at the same time. 

