import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";


const API_URL = process.env.EXPO_PUBLIC_API_URL

export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync("token");

        const skipAuthEndpoints = ["/auth/login", "/auth/register"];

        const noSkip = skipAuthEndpoints.some((endpoint) =>
            config.url?.includes(endpoint)
        );

        if (token && !noSkip) {
            config.headers.Authorization =  `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) {
                console.warn("Unauthorized - token may be expired or invalid");
            }
            console.error("API error:", data || error.message);
        } else {
            console.error("Network or connection error:", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;