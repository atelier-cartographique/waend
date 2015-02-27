#!/bin/bash


LESSC=./node_modules/.bin/lessc
STYLES=$*


for STYLE in  $STYLES;
	do
		${LESSC} static/styles/${STYLE}.less static/styles/${STYLE}.css
	done
