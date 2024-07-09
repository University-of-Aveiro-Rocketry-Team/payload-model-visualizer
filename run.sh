#!/bin/bash

# run broker and drone telem containers
echo "Starting containers..."

container=(rsa_broker rsa_telem_drone_drone01)

for i in "${container[@]}"
do
	if [ "$(docker ps -a -q -f name=$i)" ]; then
		docker start $i
	else
		echo "Container $i not found"
	fi
done

cd payload-viewer
npm install

# export all env variables
set -a; source .env; set +a;

npm run dev
