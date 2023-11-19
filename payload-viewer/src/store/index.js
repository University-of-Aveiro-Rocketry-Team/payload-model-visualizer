import { createStore } from 'vuex'
import { $mqtt } from 'vue-paho-mqtt'

export default createStore({
	state: {
		positions: [],
		home: {
			lat: 0,
			lng: 0
		},
		topics: ['gps', 'gyroscope']
	},
	mutations: {
		UPDATE_POSITIONS(state, positions) {
			state.positions = positions
		},
		UPDATE_HOME(state, position) {
			state.home = position
		},
	},
	actions: {
		// function on start up to setup default values of store
		async initializeApp(context) {
			
			// subscribe to topics
			context.state.topics.forEach(topic =>
				$mqtt.subscribe(topic, data => 
					context.commit(`handle${topic.toUpperCase()}`, JSON.parse(data)), false));
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

		// handle messages from subscribed topics
		handleGPS(context, data) {
			context.dispatch('addPosition', data)
		},
		handleGYROSCOPE(context, data) {
			console.log(data)
		}
	},
	getters: {
		positions: state => state.positions,
		home: state => state.home
	}
})