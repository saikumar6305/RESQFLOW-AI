// Sign-in session kept in the browser: { token, user, expiresAt, remember }.
// "Keep me signed in" -> localStorage (survives closing the browser); otherwise sessionStorage.
// The ACCOUNT itself lives in the backend database, so it works from any browser or device.
const SESSION_KEY = "resqflow.session";

export function rawSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || "null");
    return s && s.token ? s : null; // sessions from the old localStorage-only demo have no token
  } catch { return null; }
}
export function writeSession(s) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  (s.remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
export const getToken = () => rawSession()?.token || null;
