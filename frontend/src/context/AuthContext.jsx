import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (e) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const login = async (token) => {
    localStorage.setItem("token", token);
    setLoading(true);
    await loadMe();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const ACCESS = {
    boss: ["dashboard", "task", "pontaj", "jafuri", "loterie", "fonduri", "rapoarte", "membri"],
    sicarios: ["dashboard", "task", "pontaj", "jafuri", "loterie", "fonduri", "rapoarte", "membri"],
    loterie: ["dashboard", "pontaj", "loterie", "fonduri", "rapoarte", "membri"],
  };
  const role = user?.role;
  const canAccess = (m) => (ACCESS[role] || []).includes(m);
  const canGrade = role === "boss";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: loadMe, role, canAccess, canGrade }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
