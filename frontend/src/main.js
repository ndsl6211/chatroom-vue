import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import axios from "./plugins/axios";
import cookie from "vue-cookies";

createApp(App).use(store).use(axios).use(router).use(cookie).mount("#app");
