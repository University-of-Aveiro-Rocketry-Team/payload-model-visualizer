<template>
    <!-- MAP -->
    <div :id="this.mapContainerId"></div>

    <!-- AUX BUTTONS -->
    <div :class="`aux-buttons-back leaflet-control ${!showMenus ? 'aux-buttons-back-collapsed' : '' }`"></div>
    <div class="aux-buttons leaflet-touch leaflet-right">
        <div v-if="showMenus" class="center leaflet-bar leaflet-control" @click="centerPayload">
            <a href="#" role="button" title="Find Payload"><span aria-hidden="true"><div>➤</div></span></a>
        </div>
        <div class="hide-menus leaflet-bar leaflet-control" @click="swapMenus">
            <a href="#" role="button" :title="`${!showMenus ? 'Show Menus' : 'Hide Menus'}`"><span aria-hidden="true"><div :class="!showMenus ? 'no-rotation' : ''">{{ showMenus ? "+" : "≡" }}</div></span></a>
        </div>
    </div>
    <div v-if="showMenus" class="maps">
        <div :class="`map-item ${mapSelected == map.label ? 'maps-selected' : ''}`" v-for="map in maps" :key="map.label" :data-label="map.label" @click="mapSelection">
            <div>{{ map.name }}</div>
            <img :src="map.thumb" :alt="map.name">
        </div>
    </div>
    <div class="aux-buttons-labels" style="display: none;"></div>
    
    <!-- SLIDER -->
    <div :class="`history ${!showMenus ? 'history-hidden' : ''}`" @mouseenter="updateChart=true" @mouseleave="updateChart=false">
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
            <div v-if="showMenus" class="multi-range-slider-wrapper" @mousedown="multiRangeSliderMouseDown" @mouseup="multiRangeSliderMouseUp" @mousemove="multiRangeSliderMovement">
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
                    @input="updateScale"
                />
            </div>
        </div>
        <div v-if="showMenus" class="slider-row history-slider">
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
                <div :class="`info-times ${historyRange >= 94 ? 'info-times-adjusted-right' : historyRange <= 6 ? 'info-times-adjusted-left' : ''}`">
                    <div>{{ startTimestamp?.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit', second: '2-digit'}) }}</div>
                    <div>{{ $store.state.positions[this.$store.state.positions.length-1]?.timestamp?.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit', second: '2-digit'}) }}</div>
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

    import mapThumbGoogle from '@/assets/map-thumb-google.png'
    import mapThumbOSM from '@/assets/map-thumb-openstreetmap.png'
    import mapThumbMapTiler from '@/assets/map-thumb-maptiler.png'
    import mapThumbMapBox from '@/assets/map-thumb-mapbox.png'

    // import haversine from 'haversine-distance'

    export default {
        components: {
            MultiRangeSlider,
            apexchart: VueApexCharts,
        },
        data(){
            return{
                map: null,
                maps: [
                    { label: 'google', name: 'Google', thumb: mapThumbGoogle },
                    { label: 'openstreetmap', name: 'Open Street Map', thumb: mapThumbOSM },
                    { label: 'maptiler', name: 'Map Tiler', thumb: mapThumbMapTiler },
                    { label: 'mapbox', name: 'Map Box', thumb: mapThumbMapBox }
                ],
                mapSelected: "mapbox",
                mapButtonsHover: false,
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
                hMaxValue: 100,
                hBarMinValue: 25,
                hBarMaxValue: 75,
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

                showMenus: true,
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

                // Add Mapbox tiles layer
                this.baseLayer = tileLayerOffline(this.urlTemplate, {
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

                L.control.attribution({
                    position: 'bottomleft',
                    prefix: this.$store.state.mapAttribution
                }).addTo(this.map);
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
                const firstValue = this.$store.state.positions.findIndex((pos) => pos.timestamp >= minHours);
                const lastValue = this.$store.state.positions.findIndex((pos) => pos.timestamp >= maxHours);
                this.posListScaled = this.$store.state.positions.slice(firstValue, lastValue);
            },

            // parse time from slider
            parseTime(value) {
                const min = this.startTimestamp;
                if (!min)
                    return null;
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

            centerPayload() {
                this.map.setView([this.payloadMarker.getLatLng().lat, this.payloadMarker.getLatLng().lng], this.maxZoom);
            },

            mapSelection(e) {
                const label = e.target.closest(".map-item").dataset.label;
                this.mapSelected = label;
                this.urlTemplate = this.$store.state.urlTemplates[label] + (this.mapId != null ? '#'+this.mapId : '');
                this.baseLayer.setUrl(this.urlTemplate);
            },

            mapButtonsLabels() {
                const auxButtonsLabels = document.querySelector(".aux-buttons-labels");
                auxButtonsLabels.innerHTML = "";

                const labelsWrapper = document.createElement("div");
                const buttons = Array.from(document.querySelectorAll(".leaflet-control a[role='button']")).filter(button => !button.style.display && !button.parentElement.style.display);
                buttons.forEach((button) => {
                    const label = button.getAttribute("title");
                    labelsWrapper.innerHTML += `<div>${label}</div>`;
                });
                labelsWrapper.className = "map-labels";
                auxButtonsLabels.appendChild(labelsWrapper);
            },

            swapMenus() {
                this.showMenus = !this.showMenus;
                setTimeout(() => this.mapButtonsLabels(), 100);
            },

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
                    this.posListScaled = this.$store.state.positions;

                    this.resetScale();
                }
            },
            resetScale() {
                this.hBarMinValue = 0;
                this.hBarMaxValue = this.numberOfMinutes;
                this.scaled = false;
                this.posListScaled = this.$store.state.positions;
            }
		},
		mounted() {
			this.mapId = this.mapData ? this.mapData.id : null;
            this.urlTemplate = this.$store.state.urlTemplates[this.mapSelected] + (this.mapId != null ? '#'+this.mapId : '');
			this.initMap();

            // put aux-buttons inside .leaflet-bottom.leaflet-right
            const leafletBottomRight = document.querySelector(".leaflet-bottom.leaflet-right");
            const auxButtons = document.querySelector(".aux-buttons");
            leafletBottomRight?.insertBefore(auxButtons, leafletBottomRight.lastChild);
            const auxButtonsBack = document.querySelector(".aux-buttons-back");
            leafletBottomRight?.insertBefore(auxButtonsBack, leafletBottomRight.firstChild);
            this.mapButtonsLabels();

            const marker = this.$store.state.payloadMarker;
            if (marker) {
                this.updateMainMarker(marker);
                setTimeout(() => this.map.setView([marker.lat, marker.lng], this.maxZoom), 1000);
            }
            
            this.updateInfoPosition();

            this.posListScaled = this.$store.state.positions;
            this.startTimestamp = this.$store.state.positions[0]?.timestamp;
            this.lastTimestamp = this.$store.state.positions[this.$store.state.positions.length-1]?.timestamp;

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
            
            window.addEventListener('resize', () => {
                this.updateInfoPosition();
            });

            window.addEventListener('mouseover', e => {
                if (e.target.closest(".leaflet-bottom.leaflet-right")) {
                    this.mapButtonsHover = true;
                }
            });

            window.addEventListener('mouseout', e => {
                if (e.target.closest(".leaflet-bottom.leaflet-right")) {
                    this.mapButtonsHover = false;
                }
            });
		},
        watch: {
            '$store.state.payloadMarker': {
                handler(marker) {
                    if (this.live) {
                        this.updateMainMarker(marker);
                        this.updateTrail(this.$store.state.positions);

                        this.startTimestamp = this.$store.state.positions[0]?.timestamp;
                        this.lastTimestamp = this.$store.state.positions[this.$store.state.positions.length-1]?.timestamp;

                        this.numberOfMinutes = Math.ceil((this.lastTimestamp - this.startTimestamp) / 1000 / 60);
                        // this.step = Math.floor((this.numberOfMinutes - 1) / 10) + 1;
                        // console.log(this.numberOfMinutes, this.step);

                        this.hMaxValue = this.numberOfMinutes;
                        if (!this.scaled) {
                            this.hBarMinValue = 0;
                            this.hBarMaxValue = this.numberOfMinutes;
                            this.posListScaled = this.$store.state.positions;
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
            // },
            showMenus(show) {
                if (!show) {
                    document.querySelector(".leaflet-control-zoom").style.display = "none";
                    document.querySelector(".leaflet-control-zoom-fullscreen").style.display = "none";
                }
                else {
                    document.querySelector(".leaflet-control-zoom").style.removeProperty("display");
                    document.querySelector(".leaflet-control-zoom-fullscreen").style.removeProperty("display");
                }
            },
            mapButtonsHover(hover) {
                if (hover) {
                    document.querySelector(".aux-buttons-labels").style.removeProperty("display");
                }
                else {
                    document.querySelector(".aux-buttons-labels").style.display = "none";
                }
            }
        },
        computed: {
            hoursLabel() {
                const labels = [];
                for (let i = 0; i < this.numberOfMinutes+this.step; i+=this.step) {
                    const date = this.parseTime(i);
                    if (!date)
                       continue;

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
        font-family: 'Avenir LT Std', sans-serif;
    }

    #main-map path.leaflet-interactive, #map path.leaflet-interactive {
        pointer-events: none !important;
    }

    .no-rotation {
        rotate: unset !important;
    }

    .drone-polyline {
        z-index: 5000 !important;
    }

    .leaflet-control-zoom-fullscreen::after {
        content: '⤡';
        font-size: 30px;
        font-weight: bold;
    }

    .leaflet-touch .leaflet-bar a {
        color: #4CAF50;
        width: 45px;
        height: 45px;
        line-height: 45px;
        background-color: #d3d3d3;
        opacity: 0.7;
    }

    .leaflet-touch .leaflet-bar {
        border: unset;
    }

    .leaflet-touch .leaflet-bar a:not(.leaflet-disabled):hover {
        opacity: 1;
    }

    .leaflet-touch .leaflet-bar a span {
        font-size: 30px !important;
    }

    .leaflet-touch .leaflet-bar a:last-child {
        border-radius: 0 0 5px 5px;
    }

    .leaflet-touch .leaflet-bar a:first-child {
        border-radius: 5px 5px 0 0;
    }

    .leaflet-control-zoom-fullscreen {
        border-radius: 5px !important;
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
        /* height: 40px !important; */
    }

    .history-slider-extended::-webkit-slider-thumb {
        /* height: 40px !important; */
    }

    .history-slider-extended::-moz-range-thumb {
        /* height: 40px !important; */
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

    .info-times {
        position: absolute;
        top: 43px;
        width: 97%;
        align-content: space-between;
        display: flex;
        right: 28px;
        color: #d3d3d3;
        transition: 0.2s;
        -webkit-transition: 0.2s;
    }

    .info-times div {
        width: 100%;
        transition: 0.2s;
        -webkit-transition: 0.2s;
    }

    .info-times div:first-child {
        text-align: left;
    }

    .info-times div:last-child {
        text-align: right;
    }

    .info-times-adjusted-right, .info-times-adjusted-left {
        display: inherit !important;
    }

    .info-times-adjusted-right div:last-child,
    .info-times-adjusted-left div:first-child {
        margin-top: 70px;
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
        min-height: 60px;
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

    .history:hover {
        background-color: white;
    }

    .history:hover #history {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .history:hover .info-times > div {
        color: #414141;
    }

    .history:hover .info-times-adjusted-left div:first-child,
    .history:hover .info-times-adjusted-right div:last-child {
        color: #d3d3d3 !important;
    }

    .history-hidden {
        background-color: unset !important;
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

    .aux-buttons {
        font-weight: bold;
    }

    .aux-buttons .leaflet-bar > a {
        border-radius: 5px !important;
    }

    .aux-buttons .center div {
        rotate: -45deg;
        line-height: 40px;
    }

    .aux-buttons .hide-menus div {
        rotate: 45deg;
        font-size: 35px;
    }

    .aux-buttons-back {
        background-color: white;
        bottom: 0;
        right: 0;
        position: absolute;
        width: 70px;
        height: 285px;
        border-top-left-radius: 10px;
        transition: 0.2s;
        -webkit-transition: 0.2s;
        opacity: 0;
        margin: unset !important;
    }

    .aux-buttons-back-collapsed {
        height: 75px;
    }

    .leaflet-bottom.leaflet-right:hover .aux-buttons-back,
    .leaflet-bottom.leaflet-right:hover .leaflet-bar a:not(.leaflet-disabled) {
        opacity: 1 !important;
    }

    .leaflet-bar a:not(.leaflet-disabled):hover {
        background-color: #4CAF50;
        color: #d3d3d3;
    }   

    .leaflet-control-attribution {
        padding: 5px 10px;
        background-color: #d3d3d3;
    }

    .leaflet-control-attribution a {
        color: #4CAF50;
    }

    .leaflet-bottom.leaflet-right .leaflet-control-attribution {
        display: none;
    }

    .maps {
        display: flex;
        position: absolute;
        right: 70px;
        bottom: 9px;
        column-gap: 10px;
        background-color: #d3d3d3;
        padding: 10px;
        border-radius: 5px;
        opacity: 0.7;
        z-index: 10;
        transition: 0.2s;
        -webkit-transition: 0.2s;
    }

    .maps .map-item {
        opacity: 0.7;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        row-gap: 5px;
    }

    .maps .map-item > div {
        font-size: 10px;
        text-align: center;
        color: #555;
    }

    .maps .map-item img {
        width: 100px;
        border-radius: 10px;
    }

    .maps:hover,
    .maps .map-item:hover,
    .maps-selected {
        opacity: 1 !important;
    }

    .maps .map-item:hover {
        font-weight: bold;
    }

    .maps-selected > div {
        font-weight: bold;
    }

    .maps:hover {
        background-color: white;
    }

    .map-labels {
        position: absolute;
        right: 70px;
        width: fit-content;
        text-align: right;
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        row-gap: 33px;
        bottom: 11px;
        background-color: white;
        transition: 0.2s;
        -webkit-transition: 0.2s;
        padding: 16px;
        padding-left: 20px;
        color: #45a049;
        font-weight: bold;
        border-radius: 10px 0 0 10px;
        z-index: 20;
    }

    .map-labels div {

    }

</style>