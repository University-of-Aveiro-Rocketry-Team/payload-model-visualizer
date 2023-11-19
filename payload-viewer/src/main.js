import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { createPahoMqttPlugin } from 'vue-paho-mqtt'

const app = createApp(App)

// plugins
app.use(router)
app.use(store)
app.use(
	createPahoMqttPlugin({
		PluginOptions: {
			autoConnect: true,
			showNotifications: false,
		},
		MqttOptions: {
			host: BROKER_HOST,
			port: BROKER_PORT,
			username: BROKER_USERNAME,
			password: BROKER_PASSWORD,
		},
	}),
)

app.mount('#app')

store.dispatch('initializeApp')