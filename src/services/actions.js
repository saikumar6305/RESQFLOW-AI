import { read, write, clearAll } from "./store";
import { api } from "./api";
import { KEYS } from "./storeKeys";

export { KEYS };
const refresh = async () => {
  const d = await api("/bootstrap");
  ["incidents", "victims", "ambulances", "hospitals", "audit"].forEach((k) => write(k, d[k] || []));
  return d;
};
const run = async (task) => { try { const result = await task(); await refresh(); return result; } catch (e) { console.error("RESQFLOW backend:", e); window.dispatchEvent(new CustomEvent("resqflow-api-error", { detail: e.message })); throw e; } };
export const addIncident = (data) => run(() => api("/incidents", { method:"POST", body:JSON.stringify({ ...data, title:data.title || "New road incident" }) }));
export const setIncidentStatus = (id, status) => run(() => api(`/incidents/${encodeURIComponent(id)}/status`, { method:"PATCH", body:JSON.stringify({status}) }));
export const deleteIncident = (id) => run(() => api(`/incidents/${encodeURIComponent(id)}`, { method:"DELETE" }));
export const addVictim = (incidentId, data) => run(() => api(`/incidents/${encodeURIComponent(incidentId)}/victims`, { method:"POST", body:JSON.stringify(data) }));
export const removeVictim = (id) => run(() => api(`/victims/${encodeURIComponent(id)}`, { method:"DELETE" }));
export const setAmbulanceStatus = async (id, status) => {
  const d = await api("/resources"); const r = d.find(x => x.id === id); if (!r) throw new Error("Resource not found");
  return run(() => api(`/resources/${encodeURIComponent(id)}`, { method:"PUT", body:JSON.stringify({...r,status}) }));
};
export const setHospitalCapacity = async (id, capacity) => {
  const d = await api("/resources"); const r = d.find(x => x.id === id); if (!r) throw new Error("Resource not found");
  return run(() => api(`/resources/${encodeURIComponent(id)}`, { method:"PUT", body:JSON.stringify({...r,capacity:Math.max(0,capacity)}) }));
};
export const saveAmbulance = (a) => run(async () => a.id ? api(`/resources/${a.id}`, {method:"PUT",body:JSON.stringify(a)}) : api("/resources/ambulance",{method:"POST",body:JSON.stringify(a)}));
export const saveHospital = (h) => run(async () => h.id ? api(`/resources/${h.id}`, {method:"PUT",body:JSON.stringify(h)}) : api("/resources/hospital",{method:"POST",body:JSON.stringify(h)}));
export const deleteResource = (kind, id) => run(() => api(`/resources/${encodeURIComponent(id)}`,{method:"DELETE"}));
export function saveSettings(s) { localStorage.setItem("resqflow.v2.settings", JSON.stringify(s)); }
export const resetDemoData = () => run(() => api("/admin/reset-demo",{method:"POST"}));
export function exportAll() { return JSON.stringify({exportedAt:new Date().toISOString(),incidents:read("incidents",[]),victims:read("victims",[]),ambulances:read("ambulances",[]),hospitals:read("hospitals",[])},null,2); }
export { clearAll };
