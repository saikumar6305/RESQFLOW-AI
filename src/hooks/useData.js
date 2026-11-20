import { useEffect, useMemo } from "react";
import { useStore, write } from "../services/store";
import { KEYS } from "../services/storeKeys";
import { loadBackendData } from "../services/api";
let loading = false;
let loaded = false;
export function useData() {
  const [incidents] = useStore(...KEYS.incidents);
  const [victims] = useStore(...KEYS.victims);
  const [ambulances] = useStore(...KEYS.ambulances);
  const [hospitals] = useStore(...KEYS.hospitals);
  useEffect(() => {
    if (loaded || loading) return;
    loading = true;
    loadBackendData().then(d => {
      ["incidents", "victims", "ambulances", "hospitals", "audit"].forEach(k => write(k, d[k] || []));
      loaded = true;
    }).catch(e => console.error("Could not connect to RESQFLOW backend:", e)).finally(() => { loading = false; });
  }, []);
  return useMemo(() => ({ incidents, victims, ambulances, hospitals }), [incidents, victims, ambulances, hospitals]);
}
export function buildMarkers({ incidents = [], ambulances = [], hospitals = [] }, opts = {}) {
  const { showIncidents = true, showAmbulances = true, showHospitals = true, onlyOpen = false } = opts;
  const m = [];
  if (showIncidents) incidents.filter((i) => !onlyOpen || i.status !== "Closed").forEach((i) => m.push({ id: i.id, type: "incident", lat: i.lat, lng: i.lng, label: i.title, sub: `${i.id} · ${i.status}`, dim: i.status === "Closed" }));
  if (showAmbulances) ambulances.forEach((a) => m.push({ id: a.id, type: "ambulance", lat: a.lat, lng: a.lng, label: a.name, sub: `${a.status} · ${a.location}`, dim: a.status !== "Available" }));
  if (showHospitals) hospitals.forEach((h) => m.push({ id: h.id, type: "hospital", lat: h.lat, lng: h.lng, label: h.name, sub: `Demo capacity ${h.capacity} · ${h.location}`, dim: h.capacity === 0 }));
  return m;
}
