import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("rentsplit_token");
        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const { data } = await api.get("/auth/me");
          setUser(data.user);
        }
      } catch {
        await AsyncStorage.removeItem("rentsplit_token");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    await AsyncStorage.setItem("rentsplit_token", data.token);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    await AsyncStorage.setItem("rentsplit_token", data.token);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("rentsplit_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const updateUser = (updated) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};