import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Ambulance, Building2, Check, ClipboardList, Map as MapIcon, Plus, ShieldCheck, Siren, Users, Zap, MapPin } from "lucide-react";
import { useData, buildMarkers } from "../hooks/useData";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../services/store";
import { SEED_AUDIT, WEEK_TREND } from "../services/seed";
import { greeting, timeAgo, asset } from "../services/format";
import { PageHeader, Panel, StatCard, Status, SafetyNote } from "../components/ui";
import { AreaChart, Donut } from "../components/Charts";
import MapView from "../components/MapView";
import { stagger, fadeUp } from "../components/motion";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const data = useData();
  const [audit] = useStore("audit", SEED_AUDIT);
  const { incidents, victims, ambulances, hospitals } = data;
  const markers = useMemo(() => buildMarkers(data), [data]);
  const active = incidents.filter((i) => i.status === "Active").length;
  const availAmb = ambulances.filter((a) => a.status === "Available").length;
  const openBeds = hospitals.reduce((a, h) => a + h.capacity, 0);
  const statusSegs = ["Active", "Monitoring", "Closed"].map((s, i) => ({ label: s, value: incidents.filter((x) => x.status === s).length, color: ["#36e0a8", "#f2c14e", "#6b7d99"][i] }));
  const dateStr = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show">
      <motion.section className="hero-card" variants={fadeUp}>
        <div className="hero-card-text">
          <div className="eyebrow">OVERVIEW <span>•</span> {dateStr.toUpperCase()}</div>
          <h1>{greeting()}, {user.name.split(" ")[0]}</h1>
          <p>{active > 0 ? `${active} active incident${active > 1 ? "s" : ""} in your simulated operations area.` : "No active incidents right now."} {availAmb} ambulance{availAmb !== 1 ? "s" : ""} marked available.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => nav("/incidents?new=1")}><Plus size={17} /> Register incident</button>
            <button className="outline-btn" onClick={() => nav("/map")}><MapIcon size={16} /> Open live map</button>
          </div>
        </div>
        <img className="hero-card-img" src={asset("images/dashboard-hero.svg")} alt="" />
      </motion.section>

      <div className="stat-grid">
        <StatCard icon={Siren} label="Active incidents" value={active} note={`${incidents.length} total records`} tone="red" />
        <StatCard icon={Users} label="Victim records" value={victims.length} note="Responder-entered data" tone="purple" />
        <StatCard icon={Ambulance} label="Available ambulances" value={availAmb} note={`of ${ambulances.length} demo units`} tone="green" />
        <StatCard icon={Building2} label="Demo hospital capacity" value={openBeds} note={`${hospitals.length} facilities`} tone="orange" />
      </div>

      <div className="grid-2-1">
        <Panel title="Live operations map" subtitle="Incidents, ambulances and hospitals (simulated positions)" action={<Link className="text-btn" to="/map">Full map <ArrowUpRight size={15} /></Link>}>
          <MapView height={340} markers={markers} fitKey="dash" onMarkerClick={(m) => m.type === "incident" && nav(`/incidents/${m.id}`)} />
          <div className="map-legend"><span><i className="lg red" />Incident</span><span><i className="lg green" />Ambulance</span><span><i className="lg blue" />Hospital</span></div>
        </Panel>
        <Panel title="Recent incidents" subtitle="Latest registered records" action={<Link className="text-btn" to="/incidents">View all <ArrowUpRight size={15} /></Link>}>
          <div className="incident-list">
            {incidents.slice(0, 5).map((i) => (
              <button key={i.id} className="incident-row" onClick={() => nav(`/incidents/${i.id}`)}>
                <div className="incident-symbol"><Siren size={18} /></div>
                <div className="incident-info"><b>{i.title}</b><span>{i.id} <i /> <MapPin size={12} />{i.location.split(",")[0]}</span></div>
                <div className="incident-meta"><Status value={i.status} /><small>{timeAgo(i.createdAt)}</small></div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid-3">
        <Panel title="Incidents this week" subtitle="Illustrative demo trend"><AreaChart data={WEEK_TREND} /></Panel>
        <Panel title="By status" subtitle="Current records"><Donut segments={statusSegs} centerValue={incidents.length} centerLabel="incidents" /></Panel>
        <Panel title="System activity" subtitle="Latest platform events">
          {audit.slice(0, 4).map((a) => (
            <div className="activity-row" key={a.id}>
              <div className={`activity-icon ${a.type === "incident" ? "blue" : a.type === "auth" ? "purple" : "green"}`}>{a.type === "incident" ? <ClipboardList size={16} /> : a.type === "system" ? <ShieldCheck size={16} /> : <Check size={16} />}</div>
              <div className="activity-copy"><b>{a.action}</b><span>{a.detail}</span></div><small>{timeAgo(a.at)}</small>
            </div>
          ))}
        </Panel>
      </div>

      <div className="grid-2-1 even">
        <Panel title="Quick actions" subtitle="Start a workflow">
          <div className="quick-actions">
            <button onClick={() => nav("/incidents?new=1")}><span className="quick-icon blue"><Plus /></span><span><b>New incident</b><small>Register a road incident</small></span><ArrowUpRight size={16} /></button>
            <button onClick={() => nav("/resources")}><span className="quick-icon green"><Ambulance /></span><span><b>View resources</b><small>Ambulances & hospitals</small></span><ArrowUpRight size={16} /></button>
            <button onClick={() => nav("/agents")}><span className="quick-icon purple"><Zap /></span><span><b>Agent center</b><small>Review specialist agents</small></span><ArrowUpRight size={16} /></button>
          </div>
        </Panel>
        <motion.div variants={fadeUp}><SafetyNote title="Built for coordinated information">RESQFLOW AI organizes simulated incident data. It does not provide medical triage, dispatch vehicles or contact emergency services.</SafetyNote></motion.div>
      </div>
    </motion.div>
  );
}
