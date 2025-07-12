#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <output_image.bfs>"
  exit 1
fi

node tools/bfsmig.js ./root/ "$1" /