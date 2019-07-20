#!/usr/bin/env bash
if [[ "$(uname)" == 'Darwin' ]] # if on macOS
then
	npm run dev && osascript -e 'display notification "npm run dev has finished" with title "Build complete" sound name "default"'
else
	npm run dev
fi
