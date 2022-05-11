import axios from "axios";
import router from "../router";

export default {
  install: (app) => {
    axios.defaults.baseURL = "http://localhost:10001";
    axios.defaults.withCredentials = true;
    axios.interceptors.response.use(
      () => {},
      (err) => {
        if (err.response.status === 401) {
          router.push("/login");
        }
      }
    );
    app.config.globalProperties.$axios = axios;
  },
};
