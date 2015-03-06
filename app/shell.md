
wænd shell
==========

The web platform is built upon a shell and a visualization space ---a map. This document presents shell's architecture.

This shell is a module that loads contexts which expose commands. It's itself a context in which commands are available.


## contexts

Contexts are hierarchicals and hold a reachable reference to their parent context.

Here they are presented in order, from root to leaf.

### shell

- login/logout
- switchContext

### group

- list
- edit
- create
- delete
- get/set

- attachLayer
- detachLayer

### layer

- list
- edit
- create
- delete
- get/set

- listGroups


### feature

- edit
- create
- delete
- get/set

## map

The map object is made available to the shell.

*to complete*


## data

Each context is initialized with a reference to an entity in the platform's storage. The model identified by this reference is the default object upon which act commands in a context. We can imagine to re-play here a filesystem tree metaphor, with dot as the current object, dotdot for the parent and slash for separator.

```bash
get .. name
```

```bash
set . name 'A new name'
```

```bash
list ../de305d54-75b4-431b-adb2-eb6b9e546013
```

This tree is made available by an opaque component that exposes a communication protocol yet to be defined.


## editors

### dict

A dictionary editor. Every entity on the platform is attached a dictionary, so, the dictionary editor shall be a first class citizen.
It might allow for less constrained syntax than the targetted output JSON format.

### text/code



### geometry (idea)

An optional geometry editor that would sync with currently drawn on-map feature.

