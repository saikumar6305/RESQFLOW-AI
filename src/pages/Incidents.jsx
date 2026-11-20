import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Ambulance, Building2, Bell, Check, CarFront, Clock3, Loader2, MapPin, Play, Plus, QrCode, RefreshCw, ShieldCheck, Siren, Trash2, Users, Zap, Search } from "lucide-react";
import { useData } from "../hooks/useData";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { addIncident, addVictim, deleteIncident, removeVictim, setIncidentStatus } from "../services/actions";
import { api } from "../services/api";
import { distanceKm, etaMinutes, nearest } from "../services/geo";
import { asset, dateTime, timeAgo } from "../services/format";
import { Avatar, Empty, Field, PageHeader, Panel, Status } from "../components/ui";
import Modal from "../components/Modal";
import MapView from "../components/MapView";
import LocationPicker from "../components/LocationPicker";
import { fadeUp, stagger } from "../components/motion";

const AGENTS = [
  { key: "victim", name: "Victim Agent", icon: Users },
  { key: "ambulance", name: "Ambulance Agent", icon: Ambulance },
  { key: "hospital", name: "Hospital Agent", icon: Building2 },
  { key: "traffic", name: "Traffic Agent", icon: CarFront },
  { key: "identity", name: "Identity Agent", icon: QrCode },
  { key: "notification", name: "Notification Agent", icon: Bell }
];

export default function Incidents() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const data = useData();
  const { incidents, victims, ambulances, hospitals } = data;
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(params.get("new") === "1");
  const [showVictim, setShowVictim] = useState(false);
  const [form, setForm] = useState({ title: "", vehicles: "2", priority: "Medium", loc: null, location: "" });
  const [vform, setVform] = useState({ name: "", status: "Awaiting assessment", notes: "" });
  const [run, setRun] = useState({ stage: "idle", done: 0, out: null, report: null });
  const timers = useRef([]);

  const selected = incidents.find((i) => i.id === id) || (id ? null : incidents[0]);
  const list = useMemo(() => incidents.filter((i) => `${i.id} ${i.title} ${i.location}`.toLowerCase().includes(q.toLowerCase())), [incidents, q]);
  const vics = victims.filter((v) => v.incidentId === selected?.id);

  useEffect(() => { if (params.get("new")) { setParams({}, { replace: true }); } }, []); // eslint-disable-line
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { timers.current.forEach(clearTimeout); setRun({ stage: "idle", done: 0, out: null }); }, [selected?.id]);

  const markers = useMemo(() => {
    if (!selected) return [];
    const m = [{ id: selected.id, type: "incident", lat: selected.lat, lng: selected.lng, label: selected.title, sub: selected.location }];
    if (run.out?.amb) m.push({ id: run.out.amb.item.id, type: "ambulance", lat: run.out.amb.item.lat, lng: run.out.amb.item.lng, label: run.out.amb.item.name, sub: "Suggested (for review)" });
    if (run.out?.hos) m.push({ id: run.out.hos.item.id, type: "hospital", lat: run.out.hos.item.lat, lng: run.out.hos.item.lng, label: run.out.hos.item.name, sub: "Suggested (for review)" });
    return m;
  }, [selected, run.out]);
  const routes = useMemo(() => {
    if (!run.out || !selected) return [];
    const r = [];
    if (run.out.amb) r.push({ from: [run.out.amb.item.lat, run.out.amb.item.lng], to: [selected.lat, selected.lng], color: "#36e0a8" });
    if (run.out.hos) r.push({ from: [selected.lat, selected.lng], to: [run.out.hos.item.lat, run.out.hos.item.lng], color: "#4d8df7" });
    return r;
  }, [run.out, selected]);

  const startRun = () => {
    if (!selected) return;
    timers.current.forEach(clearTimeout);
    const amb = nearest(selected, ambulances.filter((a) => a.status === "Available"));
    const hos = nearest(selected, hospitals.filter((h) => h.capacity > 0));
    const out = { amb, hos };
    setRun({ stage: "running", done: 0, out: null, report: null });
    AGENTS.forEach((_, i) => {
      timers.current.push(setTimeout(async () => {
        if (i !== AGENTS.length - 1) {
          setRun((r) => ({ ...r, done: i + 1, out: r.out, stage: "running" }));
          return;
        }
        try {
          const report = await api(`/incidents/${encodeURIComponent(selected.id)}/coordinate`, { method: "POST" });
          setRun({ stage: "done", done: AGENTS.length, out, report });
        } catch (error) {
          toast(error.message || "Backend coordination failed", "error");
          setRun({ stage: "done", done: AGENTS.length, out, report: null });
        }
      }, 650 * (i + 1)));
    });
  };

  const agentText = (k) => {
    const report = run.report?.agents?.find(a => a.agent.toLowerCase().startsWith(k));
    if (report) return report.summary;
    const o = run.out || {};
    const awaiting = vics.filter((v) => v.status === "Awaiting assessment").length;
    switch (k) {
      case "victim": return `${vics.length} responder-entered record${vics.length !== 1 ? "s" : ""} summarized; ${awaiting} awaiting assessment.`;
      case "ambulance": return o.amb ? `${o.amb.item.name} (${o.amb.item.location}) is nearest marked-available unit: ≈ ${o.amb.km.toFixed(1)} km, ~${etaMinutes(o.amb.km)} min estimate.` : "No demo ambulance is marked available. Human review needed.";
      case "hospital": return o.hos ? `${o.hos.item.name} is nearest with demo capacity (${o.hos.item.capacity}): ≈ ${o.hos.km.toFixed(1)} km.` : "No demo hospital reports capacity.";
      case "traffic": return `Draft note for traffic personnel: ${selected.vehicles} vehicle(s) reported near ${selected.location.split(",")[0]}. Review before any use.`;
      case "identity": return `${vics.length} temporary QR demo token${vics.length !== 1 ? "s" : ""} available.`;
      default: return "Approval-gated notification draft prepared. No message has been sent.";
    }
  };

  const createIncident = async (e) => {
    e.preventDefault();
    if (!form.loc) return toast("Pick a location on the map or choose an area.", "warn");
    const area = form.location.trim() || form.loc.area || `${form.loc.lat.toFixed(3)}, ${form.loc.lng.toFixed(3)}`;
    let inc;
    try { inc = await addIncident({ title: form.title.trim() || "New road incident", location: /bapatla|andhra pradesh/i.test(area) ? area : `${area}, Bapatla district`, lat: form.loc.lat, lng: form.loc.lng, vehicles: Number(form.vehicles), priority: form.priority }); } catch (error) { toast(error.message, "error"); return; }
    setForm({ title: "", vehicles: "2", priority: "Medium", loc: null, location: "" });
    setShowNew(false);
    toast(`Incident ${inc.id} registered`);
    nav(`/incidents/${inc.id}`);
  };
  const submitVictim = async (e) => {
    e.preventDefault();
    try { await addVictim(selected.id, { name: vform.name.trim(), status: vform.status, notes: vform.notes.trim() || "Demo record only" }); } catch (error) { toast(error.message, "error"); return; }
    setVform({ name: "", status: "Awaiting assessment", notes: "" });
    setShowVictim(false);
    toast("Victim record added");
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${selected.id} and its victim records?`)) return;
    try { await deleteIncident(selected.id); toast("Incident deleted", "info"); nav("/incidents"); } catch (error) { toast(error.message, "error"); }
  };

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="INCIDENT MANAGEMENT" title="Incident workspace" subtitle="Review incident details, victim records and coordination output.">
        <button className="primary-btn" onClick={() => setShowNew(true)}><Plus size={17} /> New incident</button>
      </PageHeader>

      <div className="workspace-layout">
        <Panel className="incident-selector" title="Incidents" subtitle={`${incidents.length} records`}>
          <div className="search-wrap"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" /></div>
          <div className="selector-list">
            {list.map((i) => (
              <button key={i.id} className={`selector-row ${selected?.id === i.id ? "selected" : ""}`} onClick={() => nav(`/incidents/${i.id}`)}>
                <span className={`selector-marker p-${i.priority?.toLowerCase()}`} />
                <span className="selector-info"><b>{i.title}</b><small>{i.id} · {i.location.split(",")[0]}</small></span><Status value={i.status} />
              </button>
            ))}
            {list.length === 0 && <div className="empty-state small">No matches</div>}
          </div>
        </Panel>

        <div className="workspace-main">
          {!selected ? (
            <Panel><Empty icon={Siren} title="Incident not found" text="It may have been deleted.">
              <button className="outline-btn" onClick={() => nav("/incidents")}>Back to incidents</button></Empty></Panel>
          ) : (
            <>
              <motion.section className="panel incident-detail" variants={fadeUp} key={selected.id}>
                <div className="incident-banner" style={{ backgroundImage: `url(${asset("images/incident-banner.svg")})` }}>
                  <span className={`prio prio-${selected.priority?.toLowerCase()}`}>{selected.priority} priority <small>(operator-set)</small></span>
                </div>
                <div className="detail-top">
                  <div><div className="eyebrow">{selected.id} <span>•</span> {dateTime(selected.createdAt)}</div><h2>{selected.title}</h2><p><MapPin size={14} /> {selected.location}</p></div>
                  <div className="detail-controls">
                    <select value={selected.status} onChange={(e) => { setIncidentStatus(selected.id, e.target.value); toast(`Status set to ${e.target.value}`, "info"); }} aria-label="Incident status">
                      <option>Active</option><option>Monitoring</option><option>Closed</option>
                    </select>
                    {isAdmin && <button className="icon-button danger" onClick={remove} aria-label="Delete incident"><Trash2 size={16} /></button>}
                  </div>
                </div>
                <div className="detail-metrics">
                  <div className="mini-metric"><CarFront size={18} /><div><span>Vehicles</span><b>{selected.vehicles}</b></div></div>
                  <div className="mini-metric"><Users size={18} /><div><span>Victim records</span><b>{vics.length}</b></div></div>
                  <div className="mini-metric"><Clock3 size={18} /><div><span>Reported</span><b>{timeAgo(selected.createdAt)}</b></div></div>
                </div>
                <MapView height={240} markers={markers} routes={routes} fitKey={`${selected.id}-${run.stage}`} styleSwitch />
                {run.out && <div className="map-legend"><span><i className="lg green" />Ambulance → incident</span><span><i className="lg blue" />Incident → hospital</span><span className="hint">Straight-line, for review</span></div>}
              </motion.section>

              <Panel title="Victim registry" subtitle="Responder-entered demo records · no clinical assessment"
                action={<button className="outline-btn" onClick={() => setShowVictim(true)}><Plus size={16} /> Add victim</button>}>
                {vics.length === 0 ? <Empty icon={Users} title="No victim records yet" text="Add a fictional record to include it in coordination." /> : (
                  <>
                    <div className="table-wrap desktop-only"><table><thead><tr><th>ID</th><th>Name</th><th>Reported status</th><th>Notes</th><th /></tr></thead><tbody>
                      <AnimatePresence initial={false}>
                        {vics.map((v) => (
                          <motion.tr key={v.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <td className="mono">{v.id}</td><td><span className="person-cell"><Avatar name={v.name} size={26} />{v.name}</span></td>
                            <td><span className="reported-status">{v.status}</span></td><td className="muted-cell">{v.notes}</td>
                            <td className="row-actions"><button className="tiny-icon" title="QR identity" onClick={() => nav(`/qr?v=${v.id}`)}><QrCode size={15} /></button><button className="tiny-icon danger" title="Remove" onClick={() => { removeVictim(v.id); toast("Record removed", "info"); }}><Trash2 size={15} /></button></td>
                          </motion.tr>
                        ))}
                      </AnimatePresence></tbody></table></div>
                    <div className="card-list mobile-only">
                      {vics.map((v) => (
                        <div className="mini-card" key={v.id}>
                          <Avatar name={v.name} /><div className="mc-main"><b>{v.name}</b><small className="mono">{v.id}</small><span className="reported-status">{v.status}</span></div>
                          <div className="row-actions"><button className="tiny-icon" onClick={() => nav(`/qr?v=${v.id}`)}><QrCode size={15} /></button><button className="tiny-icon danger" onClick={() => removeVictim(v.id)}><Trash2 size={15} /></button></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Panel>

              <Panel title="AI coordination" subtitle="Run the six specialist agents for this incident."
                action={<button className="primary-btn" disabled={run.stage === "running"} onClick={startRun}>{run.stage === "running" ? <><RefreshCw className="spin" size={16} /> Running…</> : <><Play size={16} /> {run.stage === "done" ? "Run again" : "Run coordination"}</>}</button>}>
                {run.stage === "idle" ? (
                  <div className="coordination-placeholder"><div className="placeholder-icon"><Zap size={22} /></div><b>Ready to coordinate</b><span>Agent outputs will appear here after you run the simulation.</span></div>
                ) : (
                  <>
                    <div className="progress"><motion.div animate={{ width: `${(run.done / AGENTS.length) * 100}%` }} /></div>
                    <div className="agent-grid">
                      {AGENTS.map((a, i) => {
                        const state = run.done > i ? "done" : run.done === i ? "running" : "idle";
                        return (
                          <motion.div key={a.key} className={`agent-result ${state}`} initial={{ opacity: 0.4, scale: 0.97 }} animate={{ opacity: state === "idle" ? 0.45 : 1, scale: 1 }}>
                            <div className="agent-result-top"><span className="agent-small-icon"><a.icon size={17} /></span>
                              {state === "done" && <span className="complete-tag"><Check size={12} /> Complete</span>}
                              {state === "running" && <span className="complete-tag run"><Loader2 size={12} className="spin" /> Working</span>}
                              {state === "idle" && <span className="complete-tag wait">Queued</span>}</div>
                            <b>{a.name}</b>
                            {state === "done" && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{agentText(a.key)}</motion.p>}
                            {state === "done" && a.key === "notification" && <button className="outline-btn tiny" onClick={() => toast("Simulated approval recorded. No real message was sent.", "info")}>Approve draft (simulated)</button>}
                          </motion.div>
                        );
                      })}
                    </div>
                    {run.stage === "done" && <motion.div className="human-review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><ShieldCheck size={17} /><span><b>Human review required.</b> This simulated report is not an instruction to dispatch, treat or contact anyone.</span></motion.div>}
                  </>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Register new incident" subtitle="Create a fictional incident record for the simulation." wide>
        <form onSubmit={createIncident} className="modal-form">
          <Field label="INCIDENT TITLE"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Multi-vehicle collision" /></Field>
          <div className="two-col">
            <Field label="VEHICLES"><input required type="number" min="1" max="50" value={form.vehicles} onChange={(e) => setForm({ ...form, vehicles: e.target.value })} /></Field>
            <Field label="PRIORITY (OPERATOR-SET)"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></Field>
          </div>
          <Field label="LOCATION NAME (OPTIONAL)"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. JNTU Junction" /></Field>
          <div className="form-field"><span>PIN LOCATION</span><LocationPicker value={form.loc} onChange={(l) => setForm((f) => ({ ...f, loc: l }))} /></div>
          <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setShowNew(false)}>Cancel</button><button className="primary-btn"><Plus size={16} /> Create incident</button></div>
        </form>
      </Modal>

      <Modal open={showVictim} onClose={() => setShowVictim(false)} title="Add victim record" subtitle="Use fictional labels and responder-entered information only.">
        <form onSubmit={submitVictim} className="modal-form">
          <Field label="DISPLAY NAME"><input required value={vform.name} onChange={(e) => setVform({ ...vform, name: e.target.value })} placeholder="e.g. Victim E" /></Field>
          <Field label="RESPONDER-ENTERED STATUS"><select value={vform.status} onChange={(e) => setVform({ ...vform, status: e.target.value })}><option>Awaiting assessment</option><option>Reported injured</option><option>Reported stable</option><option>Transferred</option></select></Field>
          <Field label="NOTES (OPTIONAL)"><textarea rows="3" value={vform.notes} onChange={(e) => setVform({ ...vform, notes: e.target.value })} placeholder="Demo notes only" /></Field>
          <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setShowVictim(false)}>Cancel</button><button className="primary-btn"><Plus size={16} /> Add record</button></div>
        </form>
      </Modal>
    </motion.div>
  );
}
