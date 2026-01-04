#!/bin/bash
# Deploy production build to canonical vault

DEST="/home/mjk/Documents/mk-remote/.obsidian/plugins/simple-kanban"

mkdir -p "$DEST"
cp main.js manifest.json styles.css "$DEST/"

echo "Deployed to $DEST:"
ls -la "$DEST"
