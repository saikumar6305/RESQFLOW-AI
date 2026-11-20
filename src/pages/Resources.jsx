import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Ambulance, Building2, MapPin, Minus, Plus, Radio } from "lucide-react";
import { useData, buildMarkers } from "../hooks/useData";
import { setAmbulanceStatus, setHospitalCapacity } from "../services/actions";
import { useToast } from "../context/ToastContext";
import { asset } from "../services/format";
import { PageHeader, Panel, StatCard, Status } from "../components/ui";
import MapView from "../components/MapView";
import { fadeUp, stagger } from "../components/motion";

const NEXT = { Available: "Busy", Busy: "Offline", Offline: "Available" };

export default function Resources() {
  const data = useData();
  const { ambulances, hospitals } = data;
  const { toast } = useToast();
  const [sel, setSel] = useState(null);
  const markers = useMemo(() => buildMarkers({ ambulances, hospitals }, { showIncidents: false }), [ambulances, hospitals]);
  const totalCap = hospitals.reduce((a, h) => a + h.capacity, 0);

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="RESOURCE DIRECTORY" title="Resource management" subtitle="Fictional ambulance and hospital records for the simulation.">
        <span className="muted-pill"><Radio size={13} /> Demo dataset</span>
      </PageHeader>
      <div className="stat-grid three">
        <StatCard icon={Ambulance} label="Ambulances" value={ambulances.length} note={`${ambulances.filter((a) => a.status === "Available").length} marked available`} tone="green" />
        <StatCard icon={Building2} label="Hospitals" value={hospitals.length} note="Demo capacity only" tone="blue" />
        <StatCard icon={Plus} label="Total demo capacity" value={totalCap} note="Fictional field, not live beds" tone="orange" />
      </div>

      <Panel title="Resource map" subtitle="Tap a card below to focus it here">
        <MapView height={300} markers={markers} selectedId={sel} fitKey="res" onMarkerClick={(m) => setSel(m.id)} />
      </Panel>

      <Panel title="Ambulance resources" subtitle="Tap the status chip to cycle Available → Busy → Offline. Not live dispatch data.">
        <div className="resource-grid">
          {ambulances.map((a) => (
            <motion.div key={a.id} className={`resource-card ${sel === a.id ? "sel" : ""}`} whileHover={{ y: -4 }} onClick={() => setSel(a.id)}>
              <div className="rc-img" style={{ backgroundImage: `url(${asset("images/ambulance.svg")})` }} />
              <div className="rc-body">
                <div className="rc-title"><b>{a.name}</b>
                  <button className="chip-btn" onClick={(e) => { e.stopPropagation(); setAmbulanceStatus(a.id, NEXT[a.status]); toast(`${a.name} → ${NEXT[a.status]}`, "info"); }}><Status value={a.status} /></button></div>
                <span><MapPin size={13} /> {a.location}</span><small>{a.crew}</small>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      <Panel title="Hospital directory" subtitle="Reported capacity is a fictional demo field, not live bed availability.">
        <div className="resource-grid">
          {hospitals.map((h) => (
            <motion.div key={h.id} className={`resource-card ${sel === h.id ? "sel" : ""}`} whileHover={{ y: -4 }} onClick={() => setSel(h.id)}>
              <div className="rc-img" style={{ backgroundImage: `url(${asset("images/hospital.svg")})` }} />
              <div className="rc-body">
                <div className="rc-title"><b>{h.name}</b></div>
                <span><MapPin size={13} /> {h.location}</span>
                <div className="cap-row">
                  <div className="cap-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, h.capacity * 6)}%` }} className={h.capacity === 0 ? "zero" : ""} /></div>
                  <div className="stepper" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setHospitalCapacity(h.id, h.capacity - 1)} aria-label="Decrease"><Minus size={13} /></button>
                    <b>{h.capacity}</b>
                    <button onClick={() => setHospitalCapacity(h.id, h.capacity + 1)} aria-label="Increase"><Plus size={13} /></button>
                  </div>
                </div>
                <small>Demo capacity</small>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
}
