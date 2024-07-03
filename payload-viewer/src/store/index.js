import { createStore } from 'vuex'
import { $mqtt } from 'vue-paho-mqtt'

export default createStore({
	state: {
		positions: [],
		payloadMarker: {
			lat: 40.63493931,
			lng: -8.65992687,
		},
		
		home: {
			lat: 40.63493931,
			lng: -8.65992687
		},
		// topics: ['gps', 'gyroscope', 'test'],
		topics: ['/telem/drone01', 'gyroscope', 'test'],

		// map
		// urlTemplate: 'https://mt.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
		//urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		//urlTemplate: 'https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=FDT6XiwQcKCTV2xSelE4',
		urlTemplate: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=${MAP_KEY}`,
		// urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		mapAttribution: `
			<a href="https://www.mapbox.com/about/maps/">© Mapbox </a> |
			<a href="http://www.openstreetmap.org/copyright">© OpenStreetMap </a> |
			<a href="https://www.mapbox.com/map-feedback/" target="_blank"><strong>Improve this map</strong></a>
		`,

	},
	mutations: {
		// handle messages from subscribed topics
		// handleGPS(state, data) {
		handleTELEM(state, data) {
			data = data['coords']
			const lat = data[0]
			const lng = data[1]

			state.payloadMarker.lat = lat
			state.payloadMarker.lng = lng

			const position = {
				lat: lat,
				lng: lng,
				timestamp: new Date()
			}
			
			// state.payloadMarker.lat = data.lat
			// state.payloadMarker.lng = data.lng

			// const position = {
			// 	lat: data.lat,
			// 	lng: data.lng,
			// }
			state.positions = [...state.positions, position]

			// console.log(state.payloadMarker)
		
		},
		handleGYROSCOPE(state, data) {
			console.log(data)
		},
		handleTEST(state, data) {
			console.log(data)
		},
		

		// update store values
		UPDATE_POSITIONS(state, positions) {
			state.positions = positions
		},
		UPDATE_HOME(state, position) {
			state.home = position
		},

		resetPositions(state) {
			state.positions = []
		}
	},
	actions: {
		// function on start up to setup default values of store
		async initializeApp(context) {
			
			// subscribe to topics
			context.state.topics.forEach(topic => {
				$mqtt.subscribe(topic, data => {
					// console.log(topic, data, `handle${topic.toUpperCase().split("/")[1]}`);
					context.commit(`handle${topic.toUpperCase().split("/")[1]}`, JSON.parse(data));
				}, false)
			});
		},

		addPosition(context, position) {
			context.commit(
				'UPDATE_POSITIONS',
				[...context.state.positions, position]
			)
		},
		setHome(context, position) {
			context.commit(
				'UPDATE_HOME',
				position
			)
		},

	},
	getters: {
		positions: state => state.positions,
		home: state => state.home
	}
})