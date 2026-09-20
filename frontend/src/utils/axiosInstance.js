import axios from "axios";
import { BASE_URL } from "./constants";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const isUnauthorized = error.response?.status === 401;
        const isAuthRequest =
            error.config?.url?.includes("/customer/login") ||
            error.config?.url?.includes("/customer/register");

        // Clear a stale/expired session, but let login/register report their own errors.
        if (isUnauthorized && !isAuthRequest && localStorage.getItem("token")) {
            window.dispatchEvent(new Event("baskit:unauthorized"));
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
