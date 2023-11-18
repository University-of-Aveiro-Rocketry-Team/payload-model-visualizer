import { createStore } from 'vuex'

export default createStore({
	state: {
		positions: [],
		home: {
			lat: 0,
			lng: 0
		},
	},
	mutations: {
		UPDATE_POSITIONS(state, positions) {
			state.positions = positions
		},
		UPDATE_HOME(state, position) {
			state.home = position
		}
	},
	actions: {
		// function on start up to setup default values of store
		async initializeApp(context) {
			let socket = new WebSocket(BACKEND_WEBSOCKET_URL);
			socket.onopen = function(e) {
				console.log("[open] Connection established");
			};
			socket.onclose = function(e) {
				console.log("[close] Connection closed");
			}
			socket.onerror = function(e) {
				console.log("[error] Connection error");
			}
			socket.onmessage = function(event) {
				let data = JSON.parse(event.data)
				
			}
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
		}
	},
	getters: {
		positions: state => state.positions,
		home: state => state.home
	}
})