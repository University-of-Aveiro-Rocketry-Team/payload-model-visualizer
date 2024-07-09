<template>
    <div :id="this.mapContainerId"></div>

    <!-- SLIDER -->
    <div class="history" @mouseenter="updateChart=true" @mouseleave="updateChart=false">
        <div class="slider-row history-info">
            <!-- DATA CONTAINER -->
            <div class="data">
                <div class="items">
                    <div class="item">
                        <div><b>Positions:</b> </div><div>{{ positions }}</div>
                    </div>
                </div>
                <div class="data-buttons">
                    <button @click="backToLive">Back to Live</button>
                    <button @click="resetPositions">Reset</button>
                </div>
            </div>
            <div class="multi-range-slider-wrapper" @mousedown="multiRangeSliderMouseDown" @mouseup="multiRangeSliderMouseUp" @mousemove="multiRangeSliderMovement">
                <MultiRangeSlider
                    :min="hMinValue"
                    :max="hMaxValue"
                    :minValue="hBarMinValue"
                    :maxValue="hBarMaxValue"
                    :labels="hoursLabel"
                    :min-caption="hoursMinCaption"
                    :max-caption="hoursMaxCaption"
                    :step="step"
                    :stepOnly="true"
                    :canMinMaxValueSame="true"
                    :subSteps="false"
                    @input="updateScale"
                />
            </div>
        </div>
        <div class="slider-row history-slider">
            <div class="history-buttons" ref="historyButtons">
                <div id="play" :class="{'history-button-selected': !historyPlaying}"><img :src="playIcon" alt="Play" @click="playHistory"></div>
                <div id="pause" :class="{'history-button-selected': historyPlaying}"><img :src="pauseIcon" alt="Pause" @click="pauseHistory"></div>
            </div>
            <div class="slider-wrapper">
                <input type="range" min="0" max="100" id="history" v-model="historyRange" ref="historyInput" @mouseenter="handleHistoryRangeIn" @mouseleave="handleHistoryRangeOut" @input="handleHistoryRangeInput" @change="handleLive">
                <div :class="`info ${toolTipPos}`" :style="{ left: infoPosition + 'px' }" @mouseenter="handleInfoIn" @mouseleave="updateToolTip" @click="backToLive">
                    <div class="info-wrapper">
                        <div class="info-arrow"></div>
                        <div ref="infoText">{{ toolTipLabel(historyRangeLabel) }}</div>
                    </div>
                </div>
                <!--
                <div id="densityChart">
                    <apexchart type="area" height="75" :options="chartOptions" :series="series"></apexchart>
                </div>
                -->
            </div>
        </div>
    </div>
</template>

<script>
    import L from 'leaflet';
    import { tileLayerOffline } from 'leaflet.offline';
    import 'leaflet.fullscreen';

    import MultiRangeSlider from "multi-range-slider-vue";
    import VueApexCharts from "vue3-apexcharts";

    import payloadMarkerIcon from '@/assets/payload-marker.png';
    import playIcon from '@/assets/play.png';
    import pauseIcon from '@/assets/pause.png';

    // import haversine from 'haversine-distance'

    export default {
        components: {
            MultiRangeSlider,
            apexchart: VueApexCharts,
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
                posList: [],
                posListScaled: [],

                density: [0],
                updateChart: false,

                playIcon: playIcon,
                pauseIcon: pauseIcon,
                historyPlayInterval: null,
                historyPlaying: false,

                startTimestamp: null,
                lastTimestamp: null,

                numberOfMinutes: 0,
                hMinValue: 0,
                hMaxValue: 3,
                hBarMinValue: 1,
                hBarMaxValue: 2,
                step: 1,
                scaled: false,
                grabbingMultiRangeBar: false,

                series: [
                    {
                        name: "Series 1",
                        data: [],
                    }
                ],
                chartOptions: {
                    chart: {
                        type: 'area',
                        id: 'areachart',
                        toolbar: {
                            show: false,
                        },
                    },
                    fill: {
                        colors: ['#4CAF50'],
                        type: 'solid',
                        opacity: 0.5,
                    },
                    grid: {
                        show: false,
                    },  
                    xaxis: {
                        labels: {
                            show: false
                        },
                        axisBorder: {
                            show: false
                        },
                    },
                    yaxis: {
                        labels: {
                            show: false
                        },
                        reversed: true,
                        axisBorder: {
                            show: false
                        },
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 2,
                        colors: ['#4CAF50'],
                    },
                },
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
                    keyboard: false,
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
                const left = this.$refs.historyButtons.offsetWidth - 100;
                const offset = -0.019 * (this.historyRange / 100 - 0.5);
                this.infoPosition = inputWidth * (this.historyRange / 100 + offset) + left;
            },

            playHistory() {
                if (this.historyRange == 100)
                    this.historyRange = 0;
                
                let i = this.historyRange; 
                this.historyPlaying = true;
                this.historyPlayInterval = setInterval(() => {
                    const positions = this.posListScaled.slice(0, this.posListScaled.length * this.historyRange / 100);
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


            updateScale(e) {
                this.hBarMinValue = e.minValue;
                this.hBarMaxValue = e.maxValue;
                
                this.scaled = !(this.hBarMinValue == this.hMinValue && this.hBarMaxValue == this.hMaxValue);

                this.updateToolTip();

                this.scale();
                this.positions = this.posListScaled.slice(0, this.posListScaled.length * this.historyRange / 100).length;
            },
            scale() {
                const minHours = this.parseTime(this.hBarMinValue);
                const maxHours = this.parseTime(this.hBarMaxValue);
                const firstValue = this.posList.findIndex((pos) => pos.timestamp >= minHours);
                const lastValue = this.posList.findIndex((pos) => pos.timestamp >= maxHours);
                this.posListScaled = this.posList.slice(firstValue, lastValue);
            },

            // parse time from slider
            parseTime(value) {
                const min = this.startTimestamp;
                const date = new Date(min);
                date.setMinutes(date.getMinutes() + value);
                date.setSeconds(0);
                return date;
            },

            toolTipLabel(label) {
                return this.historyRange == 100 && !this.scaled ? "Live" : label;
            },

            // positionDensity(index) {
            //     const positions = this.$store.state.positions;
            //     const offset = 20;
            //     const pos = positions[index-1];
            //     let p1, p2, distance, prev;
            //     // console.log(index, offset, positions.length);
            //     if (index > offset-1) {
            //         prev = positions[index-offset];
            //         p1 = { lat: prev.lat, lon: prev.lng };
            //         p2 = { lat: pos.lat, lon: pos.lng };
            //         distance = haversine(p1, p2);
            //         this.density.push(distance);
            //     }
            // },

            // EVENTS
            handleInfoIn() {
                if (this.historyRange != 100)
                    this.$refs.infoText.innerText = "Live";
            },
            updateToolTip() {
                console.log(this.historyRangeLabel);
                this.$refs.infoText.innerText = this.toolTipLabel(this.historyRangeLabel);
            },
            handleLive() {
                this.updateChart = true;
                if (this.historyRange != 100 && this.$refs.infoText.innerText == "Live") {
                    this.historyRange = 100;
                }
            },
            backToLive() {
                    this.pauseHistory();
                    
                    this.historyRange = 100;
                    this.updateInfoPosition();

                    this.live = true;

                    this.resetScale();
            },
            handleHistoryRangeIn() {
                this.$refs.historyInput.classList.add('history-slider-extended');
            },
            handleHistoryRangeOut() {
                this.$refs.historyInput.classList.remove('history-slider-extended');
            },
            handleHistoryRangeInput() {
                this.updateChart = false;
                this.pauseHistory();
            },
            multiRangeSliderMouseDown(e) {
                this.grabbingMultiRangeBar = e.target.closest(".bar-inner") != null;
            },
            multiRangeSliderMouseUp() {
                this.grabbingMultiRangeBar = false;
            },
            multiRangeSliderMovement(e) {
                if (this.grabbingMultiRangeBar && (this.hBarMinValue > 0 || this.hBarMaxValue < this.hMaxValue)) {
                    const steps = this.hMaxValue;
                    const slider = e.target.closest(".multi-range-slider");
                    const offset = parseFloat(window.getComputedStyle(slider).paddingLeft);
                    const sliderRect = slider.getBoundingClientRect();

                    const relativeX = e.clientX - sliderRect.left - offset;
                    const relativeWidth = sliderRect.width - offset * 2 ;
                    const relativePosition = relativeX / relativeWidth;

                    console.log(steps, relativePosition);
                    let step = Math.floor(steps * relativePosition);
                    const range = this.hBarMaxValue - this.hBarMinValue;
                    let newMax = step + range/2;
                    let newMin = step - range/2;

                    if (step == 0 && relativePosition > 0) {
                        step = 1;
                        newMin = 0;
                        newMax = range;
                    }
                    
                    console.log(step, newMin, newMax)

                    if (newMin >= 0 && newMax <= this.hMaxValue) {
                        this.hBarMinValue = newMin;
                        this.hBarMaxValue = newMax;
                    }
                }
            },


            resetPositions() {
                const confirm = window.confirm("Are you sure you want to reset the positions?");
                if (confirm) {
                    this.live = true;
                    this.historyRange = 100;
                    this.updateInfoPosition();

                    this.$store.commit('resetPositions');
                    this.positions = 0;
                    this.density = [0];

                    this.startTimestamp = this.$store.state.positions[0].timestamp;
                    this.lastTimestamp = this.$store.state.positions[this.$store.state.positions.length-1].timestamp;
                    this.posList = this.$store.state.positions;
                    this.posListScaled = this.posList;
                }
            },
            resetScale() {
                this.hBarMinValue = 0;
                this.hBarMaxValue = this.numberOfMinutes;
                this.scaled = false;
                this.posListScaled = this.posList;
            }
		},
		mounted() {
			this.mapId = this.mapData ? this.mapData.id : null;
            this.urlTemplate = this.$store.state.urlTemplate + (this.mapId != null ? '#'+this.mapId : '');
			this.initMap();

            const marker = this.$store.state.payloadMarker;
            this.updateMainMarker(marker);
            
            this.updateInfoPosition();

            this.posList = this.$store.state.positions;
            this.posListScaled = this.posList;
            this.startTimestamp = this.posList[0]?.timestamp;
            this.lastTimestamp = this.posList[this.$store.state.positions.length-1]?.timestamp;

            window.addEventListener('keydown', (e) => {
                if (e.key == ' ') {
                    if (this.historyPlaying)
                        this.pauseHistory();
                    else
                        this.playHistory();
                }

                if (e.key == 'ArrowRight') {
                    this.historyRange += 1;
                    if (this.historyRange > 100)
                        this.historyRange = 100;
                }

                if (e.key == 'ArrowLeft') {
                    this.historyRange -= 1;
                    if (this.historyRange < 0)
                        this.historyRange = 0;
                }

                if (e.key == 'ArrowUp') {
                    this.hBarMaxValue += 1;
                    if (this.hBarMaxValue > this.hMaxValue)
                        this.hBarMaxValue = this.hMaxValue;
                }

                if (e.key == 'ArrowDown') {
                    this.hBarMaxValue -= 1;
                    if (this.hBarMaxValue < this.hBarMinValue)
                        this.hBarMaxValue = this.hBarMinValue;
                }
                
                if (e.key >= '0' && e.key <= '9') {
                    this.historyRange = e.key * 10;
                }

                if (e.key == 'Escape') {
                    this.backToLive();
                }

            });


		},
        watch: {
            '$store.state.payloadMarker': {
                handler(marker) {
                    if (this.live) {
                        this.posList = this.$store.state.positions;
                        this.updateMainMarker(marker);
                        this.updateTrail(this.posList);

                        this.startTimestamp = this.posList[0]?.timestamp;
                        this.lastTimestamp = this.posList[this.$store.state.positions.length-1]?.timestamp;

                        this.numberOfMinutes = Math.ceil((this.lastTimestamp - this.startTimestamp) / 1000 / 60);
                        this.hMaxValue = this.numberOfMinutes;
                        if (!this.scaled) {
                            this.hBarMinValue = 0;
                            this.hBarMaxValue = this.numberOfMinutes;
                            this.posListScaled = this.posList;
                        }
                        else {
                            this.scale();
                        }

                        this.positions = this.posListScaled.length;
                    }
                },
                deep: true,
            },
            historyRange(value, old) {
                this.live = value == 100;

                const positions = this.posListScaled;
                const percentage = positions.length * value / 100;
                this.historyTrail(positions, percentage);

                this.updateInfoPosition();
            },
            // positions(value) {
            //     this.positionDensity(this.positions);
            //     console.log(this.updateChart);
            //     if (this.updateChart) {
            //         // make value not reactive
            //         const value = this.density.slice(0);
            //         this.series[0].data = value;
            //     }
            // }
        },
        computed: {
            hoursLabel() {
                const labels = [];
                for (let i = 0; i < this.numberOfMinutes+1; i+=this.step) {
                    const date = this.parseTime(i);
                    const label = date.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'});
                    labels.push(label);
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
                let index = Math.floor(this.posListScaled.length * this.historyRange / 100 - 1);
                index = index < 0 ? 0 : index;
                const timestamp = this.posListScaled[index]?.timestamp;
                if (!timestamp)
                    return "Live";

                const label = timestamp?.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
                return label;
            },
            toolTipPos() {
                const offset = 5;
                let className = "";
                if (this.historyRange < 0+offset) className = "info-left";
                if (this.historyRange > 100-offset) className = "info-right";
                return className;
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
        padding-bottom: 50px;
    }

    .history input {
        width: 97%;
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
        z-index: 1;
    }

    .info-right .info-wrapper {
        margin-left: -30px !important;
    }

    .info-right .info-arrow {
        left: 60px !important;
    }

    .info-left .info-wrapper {
        margin-left: 30px !important;
    }

    .info-left .info-arrow {
        right: 60px !important;
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

    .slider-row .multi-range-slider-wrapper {
        width: 100%;
    }

    .slider-row .multi-range-slider {
        opacity: 0.6;
        background-color: #d3d3d3;
        box-shadow: unset;
        border: unset;
        padding: 25px 20px;
        -webkit-transition: .2s; /* 0.2 seconds transition on hover */
        transition: .2s;
    }

    .slider-row .multi-range-slider .bar-inner {
        cursor: pointer;
    }

    .history:hover .slider-row .multi-range-slider,
    .history:hover #history,
    .history:hover .info,
    .history:hover .history-buttons > div img {
        opacity: 1 !important;
    }
   
    .history:hover #densityChart {
        display: unset;
    }

    .history:hover .history-buttons > div {
        filter: drop-shadow(0px 0px 10px rgba(0,0,0,0.5));
    }

    .history:hover {
        background-color: rgba(255,255,255,0.6);
    }

    .history:hover #history {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
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

    .slider-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        position: relative;
    }

    #densityChart {
        width: 99%;
        position: absolute;
        top: 4px;
        transition: 0.2s;
        -webkit-transition: 0.2s;
        left: 0;
        pointer-events: none;
        display: none;
    }

    .slider-wrapper:hover #densityChart {
        top: 18px !important;
    }

</style>