import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";


const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

let authToken: string | null = null;

export const setApiToken = (token: string | null) => {
    authToken = token;
}

api.interceptors.request.use(
    async (config) => {
        const skipAuthEndpoints = ["/auth/login", "/auth/register"];

        const shouldSkipAuth = skipAuthEndpoints.some((endpoint) =>
            config.url?.includes(endpoint)
        );

        if (!shouldSkipAuth && authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        } else if (!shouldSkipAuth && !authToken) {
            console.error('No token available for:', config.url);
        }

        return config
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) {
                console.warn("Unauthorized - token may be expired or invalid");
                authToken = null;
                await SecureStore.deleteItemAsync("token").catch(() => {});
                await SecureStore.deleteItemAsync("user").catch(() => {});
            }
            console.error("API error:", data || error.message);
        } else {
            console.error("Network or connection error:", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;