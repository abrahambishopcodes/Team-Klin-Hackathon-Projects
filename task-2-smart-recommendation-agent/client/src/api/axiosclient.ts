import axios from "axios";
import { AxiosError } from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5500/api";

// create axios client
const api = axios.create({
    baseURL: apiBaseUrl,
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
