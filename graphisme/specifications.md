#Layout & interface Specifications


## General idea

The interface is based on both command line interface (CLI) and graphical user interface (GUI).

Both can run and operate the whole application. 

While the CLI can be usefull for a certain type of users, the GUI makes it accessible for non-tech users and tactil devices. 

The CLI and the GUI are intimately linked, and are displayed together. 
This intrication will help non-tech users to understand the programatic aspect of the application and can be seen as an educational value.

## Three types of commands are running the app


There are so far three type of commands : 

- Command that process data, without any "interface" consequences.  
Eg : "> set key value" will only set a Key and Value in the database, nothing else.

- Command with textual/visual output.  
Eg : "> get map1" will display map1 and the related elements (decription, layers, legends etc.) in html.

- Command with attached interactions.  
Eg : "> create map2" will requier to set map2's description, bounding box and so on.

## Contexts / Navigation

The navigation tree is pretty basic: 

- Wænd
	- user
		- map
			- layer
				- feature

 


*Each level is called a context.*


## Interface needs per contexts

#### everywhere
- login/logout

#### Wænd

- search
- list users
- go to list element



#### Wænd/user

- search
- list maps
- go to list element


-----To be continued------

- subscribe to a map
- browse subcribed maps
- display notifications from subscribed maps

- create a map 
	- set public / private
	- set name
	- set description
	- set bounding box & zoom
	- set background map (default = none)
	- automatic creation of discussion layer

- add layer to a map
	- set name
	- set description
	- set styles
	- set worker / renderer
