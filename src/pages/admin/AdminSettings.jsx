import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Download, RotateCcw, Save } from "lucide-react";
import { getSettings } from "../../services/auth";
import { exportAll, resetDemoData, saveSettings } from "../../services/actions";
import { useToast } from "../../context/ToastContext";
import { PageHeader, Panel } from "../../components/ui";
import { stagger } from "../../components/motion";
import AdminTabs from "./AdminTabs";

export default function AdminSettings() {
  const { toast } = useToast();
  const [s, setS] = useState(getSettings());
  const Toggle = ({ k, title, text }) => (
    <button type="button" className={`setting-row ${s[k] ? "on" : ""}`} onClick={() => setS({ ...s, [k]: !s[k] })}>
      <span><b>{title}</b><small>{text}</small></span><span className="switch"><i /></span>
    </button>
  );
  const download = () => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([exportAll()], { type: "application/json" })); a.download = "resqflow-export.json"; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="ADMINISTRATION" title="System settings" subtitle="Security, display and data options." />
      <AdminTabs />
      <div className="grid-2-1 even">
        <Panel title="Security & display">
          <Toggle k="showSimBanner" title="Show simulation banner" text="Reminder strip under the top bar." />
          <div className="setting-field"><label>Session timeout (minutes of inactivity)</label>
            <input type="number" min="5" max="480" value={s.sessionMinutes} onChange={(e) => setS({ ...s, sessionMinutes: Math.max(5, Number(e.target.value) || 30) })} /></div>
          <div className="setting-field"><label>Default map style</label>
            <select value={s.defaultMap} onChange={(e) => setS({ ...s, defaultMap: e.target.value })}><option value="dark">Dark</option><option value="street">Street</option><option value="satellite">Satellite</option></select></div>
          <button className="primary-btn" onClick={() => { saveSettings(s); toast("Settings saved — reload to apply the banner/map defaults everywhere"); }}><Save size={16} /> Save settings</button>
        </Panel>
        <Panel title="Data" subtitle="Incidents, resources and accounts are stored on the server.">
          <div className="data-actions">
            <button className="outline-btn" onClick={download}><Download size={16} /> Export data (JSON)</button>
            <button className="outline-btn danger-outline" onClick={() => { if (window.confirm("Restore incidents, victims and resources to the original demo data?")) { resetDemoData(); toast("Demo data restored", "info"); } }}><RotateCcw size={16} /> Reset demo data</button>
          </div>
          <div className="note-box"><Database size={16} /><span>User accounts are not touched by a reset. Display settings on this page are saved in this browser only.</span></div>
        </Panel>
      </div>
    </motion.div>
  );
}
