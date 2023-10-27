#!/bin/bash

PORT=8000

if [ "$1" != "" ]; then
    PORT=$1
    
    port_kill() {
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then

        # Check if the port is in use
            if netstat -tuln | grep ":$1 " &>/dev/null; then
                # Port is in use, so kill the process using the port
                read -p "Port $1 is already in use. Do you want to kill the process? [y/N] " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    echo "Killing process using port $1..."
                    sudo fuser -n tcp -k $1
                else
                    echo "Exiting..."
                    exit 1
                fi
            fi
        fi
    }

    port_kill $PORT
else
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if netstat -tuln | grep ":8000 " &>/dev/null; then
            echo "Port 8000 is busy. Please run again and specify a different port."
            echo "Usage: ./viewer.sh <port>"
            exit 1
        fi
    fi
fi

# start server
echo "Starting viewer on port $PORT..."
python3 -m http.server $PORT &

# give time for the server to start
sleep 1

# open viewer on preferred browser
python3 -m webbrowser http://localhost:$PORT/viewer
