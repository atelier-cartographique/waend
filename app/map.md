map
===

*I wish I could use something that exists*

We at first need our own rendering for three main reasons. 
Patterns/Hatching, images+compositing and text. Secondly with the 
hope that we'll be able to solve the very specific problem 
of mass rendering on the client.

below is the first plan

## canvas and context2d

We'll start with a context2d 


## layers 

layers are rendered on their own context, canvas are  overlayed to produce the final map.


## workers

rendering is ran in workers which emit arrays of drawing instructions, a la shader.


## projections

is operated by proj4


## transformation

happens at the viewport level, which maintains a global transformation matrix which is applied to the context.


## transitions

at first we're not going to do that, lack of man power.


## rtree

there will be rtree to help hit detection and clipping


