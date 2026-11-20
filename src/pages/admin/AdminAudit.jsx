import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Search } from "lucide-react";
import { useStore } from "../../services/store";
import { useData } from "../../hooks/useData";
import { SEED_AUDIT } from "../../services/seed";
import { PageHeader, Panel, Empty } from "../../components/ui";
import { dateTime } from "../../services/format";
import { stagger } from "../../components/motion";
import AdminTabs from "./AdminTabs";

export default function AdminAudit() {
  useData();
  const [audit] = useStore("audit", SEED_AUDIT);
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const list = audit.filter((a) => (type === "all" || a.type === type) && `${a.actor} ${a.action} ${a.detail}`.toLowerCase().includes(q.toLowerCase()));

  const exportCsv = () => {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const csv = ["time,actor,type,action,detail", ...list.map((a) => [a.at, a.actor, a.type, a.action, a.detail].map(esc).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "resqflow-audit.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="ADMINISTRATION" title="Audit log" subtitle="Who did what, and when.">
        <button className="outline-btn" onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </PageHeader>
      <AdminTabs />
      <Panel>
        <div className="toolbar">
          <div className="search-wrap grow"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" /></div>
          <div className="chip-row">{["all", "auth", "incident", "resource", "admin", "system"].map((t) => <button key={t} className={`chip ${type === t ? "on" : ""}`} onClick={() => setType(t)}>{t}</button>)}</div>
        </div>
        {list.length === 0 ? <Empty title="No events" /> : (
          <div className="timeline">
            {list.slice(0, 120).map((a) => (
              <div className="tl-item" key={a.id}><span className={`tl-dot t-${a.type}`} />
                <div className="tl-body"><div className="tl-top"><b>{a.action}</b><span className={`type-tag t-${a.type}`}>{a.type}</span></div><span>{a.detail}</span><small>{a.actor} · {dateTime(a.at)}</small></div></div>
            ))}
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
