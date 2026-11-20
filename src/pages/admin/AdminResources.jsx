import { useState } from "react";
import { motion } from "framer-motion";
import { Ambulance, Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "../../hooks/useData";
import { deleteResource, saveAmbulance, saveHospital } from "../../services/actions";
import { useToast } from "../../context/ToastContext";
import { Field, PageHeader, Panel, Status } from "../../components/ui";
import Modal from "../../components/Modal";
import LocationPicker from "../../components/LocationPicker";
import { stagger } from "../../components/motion";
import AdminTabs from "./AdminTabs";

const blankA = { name: "", location: "", status: "Available", crew: "", loc: { lat: 17.47, lng: 78.4 } };
const blankH = { name: "", location: "", capacity: 5, loc: { lat: 17.47, lng: 78.4 } };

export default function AdminResources() {
  const { ambulances, hospitals } = useData();
  const { toast } = useToast();
  const [edit, setEdit] = useState(null); // {kind, data}

  const open = (kind, item) => setEdit({ kind, data: item ? { ...item, loc: { lat: item.lat, lng: item.lng } } : kind === "ambulances" ? { ...blankA } : { ...blankH } });
  const save = (e) => {
    e.preventDefault();
    const { kind, data } = edit;
    const { loc, ...rest } = data;
    const rec = { ...rest, lat: loc.lat, lng: loc.lng, ...(kind === "hospitals" ? { capacity: Number(rest.capacity) } : {}) };
    (kind === "ambulances" ? saveAmbulance : saveHospital)(rec);
    toast(rec.id ? "Resource updated" : "Resource added"); setEdit(null);
  };
  const del = (kind, r) => { if (window.confirm(`Delete ${r.name}?`)) { deleteResource(kind, r.id); toast("Deleted", "info"); } };
  const set = (k) => (e) => setEdit({ ...edit, data: { ...edit.data, [k]: e.target.value } });

  const isA = edit?.kind === "ambulances";
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="ADMINISTRATION" title="Resource administration" subtitle="Create, edit and remove simulated ambulances and hospitals." />
      <AdminTabs />
      <Panel title="Ambulances" action={<button className="outline-btn" onClick={() => open("ambulances")}><Plus size={16} /> Add</button>}>
        <div className="table-wrap"><table><thead><tr><th>Unit</th><th>Area</th><th>Crew</th><th>Status</th><th /></tr></thead><tbody>
          {ambulances.map((a) => <tr key={a.id}><td><span className="person-cell"><Ambulance size={16} /> {a.name}</span></td><td>{a.location}</td><td className="muted-cell">{a.crew}</td><td><Status value={a.status} /></td>
            <td className="row-actions"><button className="tiny-icon" onClick={() => open("ambulances", a)}><Pencil size={15} /></button><button className="tiny-icon danger" onClick={() => del("ambulances", a)}><Trash2 size={15} /></button></td></tr>)}
        </tbody></table></div>
      </Panel>
      <Panel title="Hospitals" action={<button className="outline-btn" onClick={() => open("hospitals")}><Plus size={16} /> Add</button>}>
        <div className="table-wrap"><table><thead><tr><th>Facility</th><th>Area</th><th>Demo capacity</th><th /></tr></thead><tbody>
          {hospitals.map((h) => <tr key={h.id}><td><span className="person-cell"><Building2 size={16} /> {h.name}</span></td><td>{h.location}</td><td>{h.capacity}</td>
            <td className="row-actions"><button className="tiny-icon" onClick={() => open("hospitals", h)}><Pencil size={15} /></button><button className="tiny-icon danger" onClick={() => del("hospitals", h)}><Trash2 size={15} /></button></td></tr>)}
        </tbody></table></div>
      </Panel>

      <Modal open={!!edit} onClose={() => setEdit(null)} wide title={edit ? `${edit.data.id ? "Edit" : "Add"} ${isA ? "ambulance" : "hospital"}` : ""} subtitle="Fictional records only.">
        {edit && (
          <form className="modal-form" onSubmit={save}>
            <Field label="NAME"><input required value={edit.data.name} onChange={set("name")} placeholder={isA ? "AMB-05" : "Hospital name"} /></Field>
            <div className="two-col">
              <Field label="AREA LABEL"><input required value={edit.data.location} onChange={set("location")} placeholder="e.g. Kondapur" /></Field>
              {isA ? <Field label="STATUS"><select value={edit.data.status} onChange={set("status")}><option>Available</option><option>Busy</option><option>Offline</option></select></Field>
                : <Field label="DEMO CAPACITY"><input type="number" min="0" max="500" value={edit.data.capacity} onChange={set("capacity")} /></Field>}
            </div>
            {isA && <Field label="CREW LABEL"><input value={edit.data.crew} onChange={set("crew")} placeholder="Crew Echo" /></Field>}
            <div className="form-field"><span>POSITION</span><LocationPicker value={edit.data.loc} onChange={(l) => setEdit({ ...edit, data: { ...edit.data, loc: l } })} /></div>
            <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setEdit(null)}>Cancel</button><button className="primary-btn">Save</button></div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
}
