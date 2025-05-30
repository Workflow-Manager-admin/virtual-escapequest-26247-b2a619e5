#!/bin/bash
cd /home/kavia/workspace/code-generation/virtual-escapequest-26247-b2a619e5/virtual_escapequest
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

