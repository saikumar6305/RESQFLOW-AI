// -----------------------------------------------------------------------------
// Authentication against the FastAPI backend.
//  * Accounts are stored in the backend database (SQLite), passwords hashed server-side.
//  * Sign up once -> the account is active immediately (no admin approval) and you are signed in.
//  * Next time just sign in with the same email + password, from any browser or device.
// -----------------------------------------------------------------------------
import { read, write } from "./store";
import { api, loadBackendData } from "./api";
import { clearSession, rawSession, writeSession } from "./session";
import { DEFAULT_SETTINGS } from "./seed";

export { clearSession };

const EMPTY_USERS = [];
export const getUsers = () => read("users", EMPTY_USERS);
export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...read("settings", DEFAULT_SETTINGS) });

const minutes = () => getSettings().sessionMinutes || 30;
const BACKEND_KEYS = ["incidents", "victims", "ambulances", "hospitals", "audit"];

async function loadAll(user) {
  try {
    const d = await loadBackendData();
    BACKEND_KEYS.forEach((k) => write(k, d[k] || []));
    if (user?.role === "admin") write("users", await api("/users"));
  } catch { /* the pages retry on their own */ }
}

function startSession({ token, user }, remember) {
  writeSession({ token, user, remember: !!remember, expiresAt: Date.now() + minutes() * 60000 });
  return user;
}

export async function initAuth() {
  // Remove data left behind by the old browser-only demo login (it contained password hashes).
  ["resqflow.v2.users", "resqflow.locks"].forEach((k) => localStorage.removeItem(k));
  const s = rawSession();
  if (!s) return;
  try {
    const user = await api("/auth/me");
    writeSession({ ...s, user });
    loadAll(user);
  } catch { /* 401 is handled in api(); if the server is just offline we keep the saved session */ }
}

export async function login({ email, password, remember }) {
  const d = await api("/auth/login", { method: "POST", skipAuth: true, body: JSON.stringify({ email: email.trim(), password }) });
  const user = startSession(d, remember);
  loadAll(user);
  return user;
}

/** Creates the account AND signs the person in - no approval step. */
export async function register({ name, email, password }) {
  const d = await api("/auth/register", { method: "POST", skipAuth: true, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
  const user = startSession(d, true);
  loadAll(user);
  return user;
}

export function logout() {
  api("/auth/logout", { method: "POST" }).catch(() => {}); // token is read before clearSession runs
  clearSession();
}

export function getSessionUser() {
  const s = rawSession();
  if (!s || s.expiresAt < Date.now()) { clearSession(); return null; }
  return s.user;
}

/** Slides the idle timeout forward and asks the server for a fresh token. */
export function touchSession() {
  const s = rawSession();
  if (!s) return;
  writeSession({ ...s, expiresAt: Date.now() + minutes() * 60000 });
  api("/auth/refresh", { method: "POST" })
    .then((d) => { const cur = rawSession(); if (cur) writeSession({ ...cur, token: d.token, user: d.user }); })
    .catch(() => {});
}
export const sessionExpiresAt = () => rawSession()?.expiresAt || 0;

/** Re-reads the signed-in user (picks up role changes made by an admin). */
export async function refreshMe() {
  const user = await api("/auth/me");
  const s = rawSession();
  if (s) writeSession({ ...s, user });
  return user;
}

// ---- Admin operations --------------------------------------------------------
export async function refreshUsers() {
  const list = await api("/users");
  write("users", list);
  return list;
}
const report = (e) => window.dispatchEvent(new CustomEvent("resqflow-api-error", { detail: e.message }));
const adminRun = async (fn) => { try { const r = await fn(); await refreshUsers(); return r; } catch (e) { report(e); throw e; } };

export async function adminCreateUser({ name, email, password, role }) {
  // errors are shown inline by the form, so no extra toast here
  await api("/users", { method: "POST", body: JSON.stringify({ name, email, password, role }) });
  await refreshUsers();
}
export const adminUpdateUser = (id, patch) => adminRun(() => api(`/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }));
export const adminDeleteUser = (id) => adminRun(() => api(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }));
export const adminResetPassword = (id, password) => adminRun(() => api(`/users/${encodeURIComponent(id)}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }));

export function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
