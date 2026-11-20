import { clearSession, getToken } from "./session";

// During development Vite proxies /api to FastAPI on port 8000.
// A custom API URL may be set using VITE_API_BASE_URL for other deployments.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function readableError(detail, status) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {            // FastAPI validation errors
    const d = detail[0];
    const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
    const msg = String(d.msg || "Invalid value").replace(/^Value error, /, "");
    return field && !/^[A-Z]/.test(msg) ? `${field}: ${msg}` : msg;
  }
  return `Request failed (${status})`;
}

/** Calls the backend. Sends the sign-in token automatically; pass { skipAuth: true } for login/register. */
export async function api(path, options = {}) {
  const { skipAuth, ...init } = options;
  const token = skipAuth ? null : getToken();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) }
    });
  } catch {
    throw new Error("Cannot reach RESQFLOW AI. Start the backend using start-resqflow.bat, then check http://127.0.0.1:8000/api/health.");
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && token) {                    // expired / revoked session
    clearSession();
    window.dispatchEvent(new CustomEvent("resqflow-unauthorized", { detail: readableError(body.detail, 401) }));
  }
  if (!response.ok) throw new Error(readableError(body.detail, response.status));
  return body;
}
export const loadBackendData = () => api("/bootstrap");
