import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // The teacher top-bar lets a teacher account preview the student view —
  // this is a client-side view toggle, not a role change on the account.
  const [viewAs, setViewAs] = useState("teacher");

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const { user } = await api.get("/auth/me");
      setUser(user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password, role) => {
    const { token, user } = await api.post("/auth/login", { email, password, role });
    setToken(token);
    setUser(user);
    setViewAs(user.role === "student" ? "student" : "teacher");
    return user;
  };

  const claimStudent = async (email, password, agreeToTerms) => {
    const { token, user } = await api.post("/auth/student-claim", { email, password, agreeToTerms });
    setToken(token);
    setUser(user);
    setViewAs("student");
    return user;
  };

  // Accepting a classroom-invite link either sets a brand-new password
  // (unclaimed account) or, for an already-claimed account, just needs the
  // caller to already be logged in as that student — the server checks the
  // bearer token matches, api.js attaches it automatically.
  const acceptInvite = async (inviteToken, body) => {
    const { token, user } = await api.post(`/auth/invite/${inviteToken}/accept`, body || {});
    setToken(token);
    setUser(user);
    setViewAs("student");
    return user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, claimStudent, acceptInvite, logout, viewAs, setViewAs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
