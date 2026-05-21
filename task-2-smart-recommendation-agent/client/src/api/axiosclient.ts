import axios from "axios";
import { AxiosError } from "axios";

// create axios client
const api = axios.create({
    baseURL: "http://localhost:5500/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// axios interceptor
api.interceptors.response.use((response) => {
    return response
}, (error: AxiosError) => {
    return Promise.reject(error)
})

export default api;