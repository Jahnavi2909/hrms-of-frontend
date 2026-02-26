import { createContext, useContext, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authApi, notificationApi } from "../services/api";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);

  const navigate = useNavigate();
  const soundRef = useRef(null);
  const isInitialLoad = useRef(true);
  const prevUnreadCount = useRef(0);

  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = Cookies.get("token");

    if (savedUser && savedToken && !isTokenExpired(savedToken)) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
      } catch {
        localStorage.removeItem("user");
        Cookies.remove("token", { path: "/" });
      }
    } else {
      localStorage.removeItem("user");
      Cookies.remove("token", { path: "/" });
    }

    setLoading(false);
  }, []);



  const stompRef = useRef(null);

  useEffect(() => {

    if (!user || !token) return;

    if (user.role !== "ROLE_EMPLOYEE") return;

    if (!soundRef.current) {
      soundRef.current = new Audio("/notification.mp3");
    }


    const loadNotifications = async () => {
      try {
        const res = await notificationApi.getAllNotifications();
        setNotifications(res.data.data || []);
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        isInitialLoad.current = false;
      }
    };

    const handleIncoming = (payload) => {
      const newNotification = JSON.parse(payload.body);
      setNotifications(prev =>
        prev.some(n => n.id === newNotification.id) ? prev : [newNotification, ...prev]
      );
      soundRef.current?.play();
    };

    stompRef.current?.deactivate();
    const encodedToken = encodeURIComponent(token);


    const stomp = new Client({
      webSocketFactory: () =>
        new SockJS(`${API_BASE_URL}/ws?access_token=${encodedToken}`),
      reconnectDelay: 5000,
      onConnect: () => {
        stomp.subscribe("/user/queue/notifications", handleIncoming);
      },
    });

    stomp.activate();
    stompRef.current = stomp;

    loadNotifications();

    return () => {
      stompRef.current?.deactivate();
      stompRef.current = null;
    };
  }, [user, token]);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;

    if (!isInitialLoad.current && unreadCount > prevUnreadCount.current) {
      soundRef.current?.play().catch(() => { });
    }

    prevUnreadCount.current = unreadCount;
  }, [notifications]);


  const login = async (emailInput, password) => {
    try {
      setError("");

      Cookies.remove("token", { path: "/" });
      localStorage.removeItem("user");

      const res = await authApi.login(emailInput, password);

      if (!res.data?.success || !res.data.data) {
        throw new Error(res.data?.message || "Login failed");
      }

      const data = res.data.data;

      if (!data.token) throw new Error("No token received from server");

      const finalUser = {
        role: data.role || "ROLE_EMPLOYEE",
        employeeId: data.employeeId,
        username: data.username,
        email: data.email,
        employee: data.employee,
        expiresIn: data.expiresIn,
      };


      const cookieOptions = { expires: 7, path: "/", sameSite: "lax" };
      Cookies.set("token", data.token, cookieOptions);
      localStorage.setItem("user", JSON.stringify(finalUser));

      setUser(finalUser);
      setToken(data.token);

      navigate("/", { replace: true });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Login failed";
      setError(msg);
      return { success: false, message: msg };
    }
  };


  const logout = () => {
    stompRef.current?.deactivate();
    stompRef.current = null;

    Cookies.remove("token", { path: "/" });
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setNotifications([]);
    navigate("/login", { replace: true });
  };

  const markAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Mark read failed", err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        notifications,
        unreadCount,
        login,
        logout,
        markAsRead,
        deleteNotification,
        setNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
