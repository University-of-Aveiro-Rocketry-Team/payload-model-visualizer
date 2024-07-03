<template>
    <div :id="this.mapContainerId"></div>

    <!-- SLIDER -->
    <div class="history-slider">
        <div class="history-buttons" ref="historyButtons">
            <div id="play" :class="{'history-button-selected': !historyPlaying}"><img :src="playIcon" alt="Play" @click="playHistory"></div>
            <div id="pause" :class="{'history-button-selected': historyPlaying}"><img :src="pauseIcon" alt="Pause" @click="pauseHistory"></div>
        </div>
        <input type="range" min="0" max="100" id="history" v-model="historyRange" ref="historyInput" @mouseenter="handleHistoryRangeIn" @mouseleave="handleHistoryRangeOut" @input="handleHistoryRangeInput">
        <div class="info" :style="{ left: infoPosition + 'px' }" @mouseenter="handleInfoIn" @mouseleave="handleInfoOut" @click="handleInfoClick">
            <div class="info-wrapper">
                <div class="info-arrow"></div>
                <div ref="infoText">{{ historyRange == 100 ? "Live" : historyRange+"%" }}</div>
            </div>
        </div>
    </div>

    <!-- DATA CONTAINER -->
    <div class="data">
        <div class="item">
            <div>Positions: </div><div>{{ positions }}</div>
        </div>
        <div class="item">
            <div>Start: </div><div>{{ startTimestamp?.toLocaleString().split(",")[1] }}</div>
        </div>
        <div class="item">
            <div>Latest: </div><div>{{ lastTimestamp?.toLocaleString().split(",")[1] }}</div>
        </div>
        <div class="data-buttons">
            <button @click="historyRange = 100">Back to Live</button>
            <button @click="resetPositions">Reset</button>
        </div>
    </div>
</template>

<script>
    import L from 'leaflet';
    import { tileLayerOffline } from 'leaflet.offline';
    import 'leaflet.fullscreen';

    import payloadMarkerIcon from '@/assets/payload-marker.png';
    import playIcon from '@/assets/play.png';
    import pauseIcon from '@/assets/pause.png';

    export default {
        data(){
            return{
                map: null,
                urlTemplate: null,
                baseLayer: null,
                minZoom: 16,
                maxZoom: 20,
                mapData: this.$store.state.targetMap,
                mapId: null,
                payloadMarker: null,
                trail: null,
                trails: [],

                live: true,
                historyRange: 100,

                infoPosition: 0,
                positions: 0,

                playIcon: playIcon,
                pauseIcon: pauseIcon,
                historyPlayInterval: null,
                historyPlaying: false,

                startTimestamp: null,
                lastTimestamp: null,
            }
        },
        props: {
            mapContainerId: {
                type: String,
                required: true
            },
            center: {
                type: Array,
                required: false,
            },
            zoom: {
                type: Number,
                required: false,
            },
        },
        methods: {
            initMap() {
                // Create Leaflet map
                this.map = L.map(this.mapContainerId, {
                    fullscreenControl: true,
                });

				console.log(this.urlTemplate);

                // Add Mapbox tiles layer
                this.baseLayer = tileLayerOffline(this.urlTemplate, {
                    attribution: this.$store.state.mapAttribution, 
                    minZoom: 3,
                    maxZoom: this.maxZoom,
                }).addTo(this.map);

                let center = this.center ?
                                this.center :
                                (this.mapData ?
                                    [this.mapData.lat, this.mapData.lng] :
                                    [this.$store.state.home.lat, this.$store.state.home.lng]);

				console.log(center, this.zoom, this.maxZoom);

                this.map.setView(center, this.zoom ? this.zoom : this.maxZoom-1);

                // put zoom control on bottom right
                this.map.addControl(L.control.zoom({position: 'bottomright'}));
                
                // move fullscreen button from top left to bottom right
                const fullscreenButton = document.querySelector(".leaflet-control-zoom-fullscreen");
                if (fullscreenButton) {
                    const leafletBottomRight = document.querySelector(".leaflet-bottom.leaflet-right");
                    const fullscreenWrapper = document.createElement("div");
                    fullscreenWrapper.className = "leaflet-bar leaflet-control";
                    fullscreenWrapper.appendChild(fullscreenButton);
                    leafletBottomRight.insertBefore(fullscreenWrapper, leafletBottomRight.lastChild);
                }

                // remove top left zoom control
                this.map.removeControl(this.map.zoomControl);
            },
            updateMainMarker(marker) {
                if (marker && marker.lat && marker.lng) {
                    if (this.payloadMarker) {
                        this.map.removeLayer(this.payloadMarker);
                    }
                    
                    this.payloadMarker = L.marker([marker.lat, marker.lng], {
                        icon: L.icon({
                            iconUrl: payloadMarkerIcon,
                            iconSize: [50, 50],
                            iconAnchor: [30, 30],
                        }),
                    }).addTo(this.map);
                }
            },
            historyTrail(positions, index) {
                console.log(positions, index);
                positions = positions.slice(0, index+1);
                
                this.positions = positions.length;
                this.lastTimestamp = positions[positions.length-1]?.timestamp;

                this.updateMainMarker(positions[positions.length-1]);
                this.updateTrail(positions);
            },
            updateTrail(positions, size=50) {
                // delete old trail
                if (this.trail) {
                    this.map.removeLayer(this.trail);
                }

                positions = positions.slice(-size);

                this.trail = this.createPolyline(positions, 'red');
            },
            createPolyline(positions, color) {
                const trailCoords = positions.map((pos) => [pos.lat, pos.lng]);
                const polyline = L.polyline(trailCoords, {
                    color: color,
                    weight: 3,
                    opacity: 0.5,
                    className: 'drone-polyline',
                }).addTo(this.map);
                // this.trails.push(polyline);
                return polyline;
            },
            updateInfoPosition() {
                const inputWidth = this.$refs.historyInput.offsetWidth;
                const left = this.$refs.historyButtons.offsetWidth - 10;
                const offset = -0.02 * (this.historyRange / 100 - 0.5);
                this.infoPosition = inputWidth * (this.historyRange / 100 + offset) + left;
            },

            playHistory() {
                if (this.historyRange == 100)
                    this.historyRange = 0;
                
                let i = this.historyRange; 
                this.historyPlaying = true;
                this.historyPlayInterval = setInterval(() => {
                    const positions = this.$store.state.positions.slice(0, this.$store.state.positions.length * this.historyRange / 100);
                    this.positions = positions.length;
                    console.log(positions, i);
                    this.historyTrail(positions, i);
                    this.updateInfoPosition();
                    
                    this.historyRange = i++;

                    if (i > 100)
                        this.pauseHistory();

                }, 200);
            },

            pauseHistory() {
                clearInterval(this.historyPlayInterval);
                this.historyPlaying = false;
            },

            // EVENTS
            handleInfoIn() {
                if (this.historyRange != 100)
                    this.$refs.infoText.innerText = "Live";
            },
            handleInfoOut() {
                this.$refs.infoText.innerText = this.historyRange == 100 ? "Live" : this.historyRange+"%";
            },
            handleInfoClick() {
                if (this.historyRange != 100) {
                    this.historyRange = 100;
                    this.updateInfoPosition();
                }
            },
            handleHistoryRangeIn() {
                this.$refs.historyInput.classList.add('history-slider-extended');
            },
            handleHistoryRangeOut() {
                this.$refs.historyInput.classList.remove('history-slider-extended');
            },
            handleHistoryRangeInput() {
                this.pauseHistory();
            },
            resetPositions() {
                const confirm = window.confirm("Are you sure you want to reset the positions?");
                if (confirm) {
                    this.live = true;
                    this.historyRange = 100;
                    this.updateInfoPosition();

                    this.$store.commit('resetPositions');

                    this.startTimestamp = this.$store.state.positions[0].timestamp;
                    this.lastTimestamp = this.$store.state.positions[this.$store.state.positions.length-1].timestamp;
                }
            }
		},
		mounted() {
			this.mapId = this.mapData ? this.mapData.id : null;
            this.urlTemplate = this.$store.state.urlTemplate + (this.mapId != null ? '#'+this.mapId : '');
			this.initMap();

            const marker = this.$store.state.payloadMarker;
            this.updateMainMarker(marker);
            
            this.updateInfoPosition();

            this.startTimestamp = this.$store.state.positions[0]?.timestamp;
            this.lastTimestamp = this.$store.state.positions[this.$store.state.positions.length-1]?.timestamp;

            window.addEventListener('keydown', (e) => {
                if (e.key == ' ') {
                    if (this.historyPlaying)
                        this.pauseHistory();
                    else
                        this.playHistory();
                }
            });
		},
        watch: {
            '$store.state.payloadMarker': {
                handler(marker) {
                    if (this.live) {
                        this.positions = this.$store.state.positions.length;
                        this.updateMainMarker(marker);
                        this.updateTrail(this.$store.state.positions);

                        this.startTimestamp = this.$store.state.positions[0]?.timestamp;
                        this.lastTimestamp = this.$store.state.positions[this.$store.state.positions.length-1]?.timestamp;
                    }
                },
                deep: true,
            },
            historyRange(value, old) {
                this.live = value == 100;

                const positions = this.$store.state.positions;
                const percentage = positions.length * value / 100;
                this.historyTrail(positions, percentage);

                this.updateInfoPosition();
            }
        }
		
    }
</script>

<style scoped>
    #main-map, #map {
		height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 5;
    }
</style>

<style>
    body {
        overflow-x: hidden;
    }

    #main-map path.leaflet-interactive, #map path.leaflet-interactive {
        pointer-events: none !important;
    }

    .drone-polyline {
        z-index: 5000 !important;
    }

    .leaflet-control-zoom-fullscreen::after {
        content: '⤡';
        font-size: 20px;
        font-weight: bold;
    }

    .history-slider {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        width: 100%;
        text-align: center;
        margin-top: 10px;
        display: flex;
        align-content: center;
    }

    .history-slider input {
        width: 93%;
        margin: auto;
    }

    #history {
        -webkit-appearance: none;  /* Override default CSS styles */
        appearance: none;
        height: 25px; /* Specified height */
        background: #d3d3d3; /* Grey background */
        outline: none; /* Remove outline */
        opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: .2s;
        padding: 4px;
        border-radius: 10px;
    }

    .history-slider-extended {
        height: 40px !important;
    }

    .history-slider-extended::-webkit-slider-thumb {
        height: 40px !important;
    }

    .history-slider-extended::-moz-range-thumb {
        height: 40px !important;
    }

    .history-slider-extended + .info {
        top: 20px !important;
    }

    #history:hover, #history:hover + .info, .info:hover {
        opacity: 1; /* Fully shown on mouse-over */
    }

    #history::-webkit-slider-thumb {
        -webkit-appearance: none; /* Override default look */
        appearance: none;
        width: 25px; /* Set a specific slider handle width */
        height: 25px; /* Slider handle height */
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: .2s;
        background: #4CAF50; /* Green background */
        cursor: pointer; /* Cursor on hover */
    }

    #history::-moz-range-thumb {
        width: 25px; /* Set a specific slider handle width */
        height: 25px; /* Slider handle height */
        background: #4CAF50; /* Green background */
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: .2s;
        cursor: pointer; /* Cursor on hover */
    }

    .info {
        position: absolute;
        opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: opacity .2s;
        cursor: pointer;
    }
    
    .info-wrapper {
        background-color: #d3d3d3;
        width: 70px;
        height: 40px;
        position: absolute;
        padding: 5px 10px;
        border-radius: 10px;
        top: 55px;
    }

    .info-wrapper > div:last-child {
        position: absolute;
        margin: auto;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        height: fit-content;
        color: #4CAF50;
        font-weight: bold;
        font-size: 20px;
    }

    .info-arrow {
        width: 20px;
        height: 20px;
        background-color: #d3d3d3;
        rotate: 45deg;
        position: absolute;
        top: -10px;
        left: 0;
        right: 0;
        margin: auto;
    }

    .history-buttons {
        display: flex;
        align-items: center;
        column-gap: 10px;
        margin-left: 15px;
    }

    .history-buttons > div img {
        width: 30px;
        height: 30px;
        cursor: pointer;
        filter: invert(1);
        opacity: 0.6;
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: .2s;
    }

    .history-buttons > div img:hover, .history-button-selected {
        opacity: 0.8;
    }

    .data {
        position: absolute;
        left: 0;
        bottom: 0;
        z-index: 10;
        background-color: #d3d3d3;
        padding: 10px 20px;
        font-size: 18px;
    }

    .data .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        column-gap: 40px;
    }

    .data-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
    }

    .data-buttons button {
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        background-color: #4CAF50;
        color: white;
        border: none;
        font-size: 18px;
    }

    .data-buttons button:hover {
        background-color: #45a049;
    }
</style>