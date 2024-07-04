<template>
    <div :id="this.mapContainerId"></div>

    <!-- SLIDER -->
    <div class="history">
        <div class="slider-row history-info">
            <!-- DATA CONTAINER -->
            <div class="data">
                <div class="items">
                    <div class="item">
                        <div><b>Positions:</b> </div><div>{{ positions }}</div>
                    </div>
                    <!-- <div class="item">
                        <div>Start: </div><div>{{ startTimestamp?.toLocaleString().split(",")[1] }}</div>
                    </div>
                    <div class="item">
                        <div>Latest: </div><div>{{ lastTimestamp?.toLocaleString().split(",")[1] }}</div>
                    </div> -->
                </div>
                <div class="data-buttons">
                    <button @click="backToLive">Back to Live</button>
                    <button @click="resetPositions">Reset</button>
                </div>
            </div>
            <MultiRangeSlider
                :min="hMinValue"
                :max="hMaxValue"
                :minValue="hBarMinValue"
                :maxValue="hBarMaxValue"
                :labels="hoursLabel"
                :min-caption="hoursMinCaption"
                :max-caption="hoursMaxCaption"
                :step="5"
                @input="updateHoursValues"
            />
        </div>
        <div class="slider-row history-slider">
            <div class="history-buttons" ref="historyButtons">
                <div id="play" :class="{'history-button-selected': !historyPlaying}"><img :src="playIcon" alt="Play" @click="playHistory"></div>
                <div id="pause" :class="{'history-button-selected': historyPlaying}"><img :src="pauseIcon" alt="Pause" @click="pauseHistory"></div>
            </div>
            <input type="range" min="0" max="100" id="history" v-model="historyRange" ref="historyInput" @mouseenter="handleHistoryRangeIn" @mouseleave="handleHistoryRangeOut" @input="handleHistoryRangeInput">
            <div class="info" :style="{ left: infoPosition + 'px' }" @mouseenter="handleInfoIn" @mouseleave="handleInfoOut" @click="backToLive">
                <div class="info-wrapper">
                    <div class="info-arrow"></div>
                    <div ref="infoText">{{ historyRange == 100 ? "Live" : historyRangeLabel }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import L from 'leaflet';
    import { tileLayerOffline } from 'leaflet.offline';
    import 'leaflet.fullscreen';

    import MultiRangeSlider from "multi-range-slider-vue";

    import payloadMarkerIcon from '@/assets/payload-marker.png';
    import playIcon from '@/assets/play.png';
    import pauseIcon from '@/assets/pause.png';

    export default {
        components: {
            MultiRangeSlider,
        },
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

                hMinValue: 0,
                hMaxValue: 720,
                hBarMinValue: 120,
                hBarMaxValue: 600,
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
                const left = this.$refs.historyButtons.offsetWidth - 20;
                const offset = -0.019 * (this.historyRange / 100 - 0.5);
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


            updateHoursValues(e) {
                this.hBarMinValue = e.minValue;
                this.hBarMaxValue = e.maxValue;
            },


            // EVENTS
            handleInfoIn() {
                if (this.historyRange != 100)
                    this.$refs.infoText.innerText = "Live";
            },
            handleInfoOut() {
                console.log(this.historyRangeLabel);
                this.$refs.infoText.innerText = this.historyRange == 100 ? "Live" : this.historyRangeLabel;
            },
            backToLive() {
                if (this.historyRange != 100) {
                    this.pauseHistory();
                    
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
        },
        computed: {
            hoursLabel() {
                let labels = [];
                for (let i = 0; i <= 12; i++) {
                    labels.push(`${i.toString().length === 1 ? "0" : ""}${i}:00`);
                }
                return labels;
            },
            hoursMinCaption() {
                let h = Math.floor(this.hBarMinValue / 60);
                let m = this.hBarMinValue % 60;
                let hh = h.toString().length === 1 ? "0" : "";
                let mm = m.toString().length === 1 ? "0" : "";
                return `${hh}${h}:${mm}${m}`;
            },
            hoursMaxCaption() {
                let h = Math.floor(this.hBarMaxValue / 60);
                let m = this.hBarMaxValue % 60;
                let hh = h.toString().length === 1 ? "0" : "";
                let mm = m.toString().length === 1 ? "0" : "";
                return `${hh}${h}:${mm}${m}`;
            },
            historyRangeLabel() {
                const index = Math.floor(this.$store.state.positions.length * this.historyRange / 100);
                const timestamp = this.$store.state.positions[index]?.timestamp;
                const label = timestamp?.getHours() + ":" + timestamp?.getMinutes() + ":" + timestamp?.getSeconds();
                console.log(label, index);
                return label;
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

    .history {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        width: 100%;
        text-align: center;
        padding-top: 10px;
        display: flex;
        align-content: center;
        flex-direction: column;
        row-gap: 20px;
        padding: 15px 0;
        -webkit-transition: .2s;
        transition: .2s;
    }

    .history input {
        width: 93%;
        margin: auto;
    }

    .history .slider-row {

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

    .history-slider {
        display: flex;
    }

    /* #history:hover, #history:hover + .info, .info:hover {
        opacity: 1;
    } */

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
        border: unset;
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
        width: 90px;
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
        opacity: 1 !important;
    }

    .history-button-selected img {
        filter: invert(57%) sepia(85%) saturate(330%) hue-rotate(73deg) brightness(100%) contrast(89%) !important;
    }

    .history-info {
        display: flex;
        column-gap: 20px;
        padding: 0px 20px;
    }

    .data {
        background-color: #d3d3d3;
        padding: 10px 20px;
        font-size: 18px;
        display: flex;
        align-items: center;
        column-gap: 30px;
        border-radius: 10px;
    }

    .data .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        column-gap: 20px;
        color: #555;
    }

    .data-buttons {
        display: flex;
        flex-direction: row;
        align-items: center;
        column-gap: 10px;
    }

    .data-buttons button {
        padding: 10px 10px;
        border-radius: 5px;
        cursor: pointer;
        background-color: #4CAF50;
        color: white;
        border: none;
        font-size: 18px;
        width: 150px;
    }

    .data-buttons button:hover {
        background-color: #45a049;
    }
    
    .MultiRangeSliderContainer {
        margin: auto;
        width: 800px;
    }

    .slider-row .multi-range-slider {
        background-color: #d3d3d3;
        opacity: 0.6;
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: .2s;
        width: 100%;
        box-shadow: unset;
        border: unset;
        padding: 25px 20px;
    }

    .history:hover .slider-row .multi-range-slider, .history:hover #history, .history:hover .info, .history:hover .history-buttons > div img {
        opacity: 1 !important;
    }
    
    .history:hover .history-buttons > div {
        filter: drop-shadow(0px 0px 10px rgba(0,0,0,0.5));
    }

    .history:hover {
        background-color: rgba(255,255,255,0.6);
    }

    .slider-row .multi-range-slider .bar-inner {
        background-color: #4CAF50;
        box-shadow: unset;
        border: unset;
    }

    .slider-row .multi-range-slider .thumb::before {
        box-shadow: unset;
        border: unset;
        background-color: #4CAF50;
        border-radius: 5px;
        margin-top: -6px;
    }

    .slider-row .multi-range-slider .sub-ruler .ruler-sub-rule, .slider-row .multi-range-slider .ruler .ruler-rule {
        border-color: #939393;
    }

    .slider-row .multi-range-slider .bar-left, .slider-row .multi-range-slider .bar-right {
        box-shadow: unset;
    }

    .slider-row .multi-range-slider .labels {
        color: #555;
    }
</style>