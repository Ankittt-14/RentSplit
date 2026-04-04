import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

// Same IP as api.js — just without /api at the end
const SOCKET_URL = "https://rentsplit-mqyq.onrender.com";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user }    = useAuth();
  const socketRef   = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      setConnected(true);
      if (user?._id) {
        socketRef.current.emit("join_user", user._id);
      }
    });
    
    socketRef.current.on("notification", (n) => {
      Alert.alert(n.title || "New Notification", n.message || "");
    });

    socketRef.current.on("disconnect", () => setConnected(false));

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  const joinGroup  = (id) => socketRef.current?.emit("join_group",  id);
  const leaveGroup = (id) => socketRef.current?.emit("leave_group", id);
  const on  = (event, cb) => socketRef.current?.on(event,  cb);
  const off = (event, cb) => socketRef.current?.off(event, cb);

  return (
    <SocketContext.Provider value={{ connected, joinGroup, leaveGroup, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);