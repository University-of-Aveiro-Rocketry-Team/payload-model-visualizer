#!/bin/bash

# PORT
PORT_MQTT=${1:-1883}
PORT_WS=${2:-9001}

docker build -t uart/mosquitto -f mosquitto.dockerfile .
docker run -d -p $PORT_MQTT:1883 -p $PORT_WS:9001 --name uart_broker uart/mosquitto
