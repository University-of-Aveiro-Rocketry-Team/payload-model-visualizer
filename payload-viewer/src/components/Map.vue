<template>
    <div :id="this.mapContainerId"></div>
</template>

<script>
    import L from 'leaflet';
    import { tileLayerOffline } from 'leaflet.offline';
    import 'leaflet.fullscreen';

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
		},
		mounted() {
			this.mapId = this.mapData ? this.mapData.id : null;
            this.urlTemplate = this.$store.state.urlTemplate + (this.mapId != null ? '#'+this.mapId : '');
			this.initMap();
		},
		
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
</style>