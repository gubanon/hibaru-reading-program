const TOKEN_KEY = "hibaru_token";
// In dev, Vite proxies relative /api/* to the backend (see vite.config.js).
// In production the frontend and backend are on different hosts, so a build
// running against a real deployment must set VITE_API_URL to the backend's
// full origin (e.g. https://hibaru-api.fly.dev).
const API_BASE = import.meta.env.VITE_API_URL || "";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body, opts = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}/api${path}`, { method, headers, body: payload });
  if (opts.raw) return res;
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  upload: (path, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("POST", path, fd);
  },
  download: async (path, filename) => {
    const res = await request("GET", path, null, { raw: true });
    if (!res.ok) throw new Error("Download failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};
