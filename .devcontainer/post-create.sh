#!/bin/sh
set -eu

if [ -f .env ]; then
    :
elif [ -f .env.example ]; then
    cp .env.example .env
else
    echo 'Error: .env.example not found in the workspace' >&2
    exit 1
fi
