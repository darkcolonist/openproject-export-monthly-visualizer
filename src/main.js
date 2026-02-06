import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/bold";

const app = createApp(App)
app.use(router)
app.mount('#app')
