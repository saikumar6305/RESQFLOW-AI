import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ambulance, Building2, Navigation, Siren, ArrowUpRight } from "lucide-react";
import { useData, buildMarkers } from "../hooks/useData";
import { PageHeader, Status } from "../components/ui";
import MapView from "../components/MapView";
import { distanceKm, etaMinutes, nearest } from "../services/geo";
import { stagger, fadeUp } from "../components/motion";

export default function LiveMap() {
  const data = useData();
  const nav = useNavigate();
  const [layers, setLayers] = useState({ incidents: true, ambulances: true, hospitals: true });
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sel, setSel] = useState(null);

  const markers = useMemo(() => buildMarkers(data, { showIncidents: layers.incidents, showAmbulances: layers.ambulances, showHospitals: layers.hospitals, onlyOpen }), [data, layers, onlyOpen]);
  const selected = sel && markers.find((m) => m.id === sel);
  const incident = data.incidents.find((i) => i.id === sel);

  const { routes, suggestion } = useMemo(() => {
    if (!incident) return { routes: [], suggestion: null };
    const amb = nearest(incident, data.ambulances.filter((a) => a.status === "Available"));
    const hos = nearest(incident, data.hospitals.filter((h) => h.capacity > 0));
    const r = [];
    if (amb) r.push({ from: [amb.item.lat, amb.item.lng], to: [incident.lat, incident.lng], color: "#36e0a8" });
    if (hos) r.push({ from: [incident.lat, incident.lng], to: [hos.item.lat, hos.item.lng], color: "#4d8df7" });
    return { routes: r, suggestion: { amb, hos } };
  }, [incident, data]);

  const toggle = (k) => setLayers({ ...layers, [k]: !layers[k] });

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="GEOSPATIAL VIEW" title="Live map" subtitle="Simulated positions around Bapatla, Andhra Pradesh. Distances are straight-line estimates, not routing." />
      <motion.div className="map-layout" variants={fadeUp}>
        <div className="map-main">
          <MapView height="100%" className="tall" markers={markers} routes={routes} selectedId={sel} fitKey="live" onMarkerClick={(m) => setSel(m.id)} />
        </div>
        <aside className="map-side panel">
          <div className="side-block">
            <h3>Layers</h3>
            <div className="toggle-list">
              {[["incidents", "Incidents", Siren, "red"], ["ambulances", "Ambulances", Ambulance, "green"], ["hospitals", "Hospitals", Building2, "blue"]].map(([k, label, Icon, tone]) => (
                <button key={k} className={`toggle ${layers[k] ? "on" : ""}`} onClick={() => toggle(k)}><span className={`quick-icon ${tone}`}><Icon size={16} /></span>{label}<span className="switch"><i /></span></button>
              ))}
              <button className={`toggle ${onlyOpen ? "on" : ""}`} onClick={() => setOnlyOpen(!onlyOpen)}><span className="quick-icon purple"><Navigation size={16} /></span>Hide closed incidents<span className="switch"><i /></span></button>
            </div>
          </div>

          <div className="side-block grow">
            <h3>{incident ? "Incident detail" : "Select a marker"}</h3>
            {!selected && (
              <div className="incident-list compact">
                {data.incidents.map((i) => (
                  <button key={i.id} className="incident-row" onClick={() => setSel(i.id)}>
                    <div className="incident-symbol"><Siren size={16} /></div>
                    <div className="incident-info"><b>{i.title}</b><span>{i.id} · {i.location.split(",")[0]}</span></div><Status value={i.status} />
                  </button>
                ))}
              </div>
            )}
            {selected && !incident && (
              <div className="detail-card">
                <b>{selected.label}</b><span>{selected.sub}</span>
                <button className="outline-btn" onClick={() => setSel(null)}>Clear selection</button>
              </div>
            )}
            {incident && (
              <div className="detail-card">
                <div className="row-between"><b>{incident.title}</b><Status value={incident.status} /></div>
                <span>{incident.id} · {incident.location}</span>
                {suggestion?.amb && <div className="suggest green"><Ambulance size={16} /><div><b>Nearest available: {suggestion.amb.item.name}</b><small>≈ {suggestion.amb.km.toFixed(1)} km · ~{etaMinutes(suggestion.amb.km)} min (estimate)</small></div></div>}
                {!suggestion?.amb && <div className="suggest warn"><Ambulance size={16} /><div><b>No ambulance marked available</b></div></div>}
                {suggestion?.hos && <div className="suggest blue"><Building2 size={16} /><div><b>{suggestion.hos.item.name}</b><small>≈ {suggestion.hos.km.toFixed(1)} km · demo capacity {suggestion.hos.item.capacity}</small></div></div>}
                <div className="btn-row">
                  <button className="primary-btn" onClick={() => nav(`/incidents/${incident.id}`)}>Open workspace <ArrowUpRight size={15} /></button>
                  <button className="outline-btn" onClick={() => setSel(null)}>Clear</button>
                </div>
                <small className="hint">For human review only — nothing is dispatched.</small>
              </div>
            )}
          </div>
        </aside>
      </motion.div>
    </motion.div>
  );
}
