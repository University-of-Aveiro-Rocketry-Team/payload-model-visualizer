#!/bin/bash

cd payload-viewer
npm install

# export all env variables
set -a; source .env; set +a;

npm run dev