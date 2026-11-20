import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSessionUser, initAuth, login as svcLogin, logout as svcLogout, refreshMe, register as svcRegister, touchSession } from "../services/auth";
import { setActor } from "../services/audit";
import { useToast } from "./ToastContext";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  const apply = useCallback((u) => { setUser(u); setActor(u); }, []);

  useEffect(() => {
    initAuth().then(() => { apply(getSessionUser()); setReady(true); });
  }, [apply]);

  // The server rejected our token (expired, or an admin disabled the account).
  useEffect(() => {
    const onUnauthorized = (e) => { apply(null); toast(e.detail || "Session expired. Please sign in again.", "warn"); };
    window.addEventListener("resqflow-unauthorized", onUnauthorized);
    return () => window.removeEventListener("resqflow-unauthorized", onUnauthorized);
  }, [apply, toast]);

  // Idle session expiry + sliding window.
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      if (!getSessionUser()) { apply(null); toast("Session expired. Please sign in again.", "warn"); }
    }, 10000);
    let last = 0;
    const bump = () => { const n = Date.now(); if (n - last > 30000) { last = n; touchSession(); } };
    window.addEventListener("click", bump); window.addEventListener("keydown", bump);
    return () => { clearInterval(timer); window.removeEventListener("click", bump); window.removeEventListener("keydown", bump); };
  }, [user, apply, toast]);

  // Pick up role / name changes made by an administrator.
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      refreshMe().then((fresh) => { if (fresh.role !== user.role || fresh.name !== user.name) apply(fresh); }).catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [user, apply]);

  const login = async (creds) => { const u = await svcLogin(creds); apply(u); return u; };
  const register = async (data) => { const u = await svcRegister(data); apply(u); return u; }; // signs in immediately
  const logout = () => { svcLogout(); apply(null); };

  return <Ctx.Provider value={{ ready, user, isAdmin: user?.role === "admin", login, register, logout }}>{children}</Ctx.Provider>;
}
