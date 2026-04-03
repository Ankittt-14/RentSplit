import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️  IMPORTANT: Replace with your computer's local IP address
// How to find it:
//   Windows  → open CMD → type  ipconfig  → look for IPv4 Address
//   Mac/Linux → open Terminal → type  ifconfig  → look for inet
//
// Your phone and PC must be on the SAME WiFi network!
// Example: "http://10.245.146.200:5000/api"

export const BASE_URL = "http://10.130.226.200:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach JWT token to every request automatically
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("rentsplit_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired token globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("rentsplit_token");
    }
    return Promise.reject(error);
  }
);

export default api;