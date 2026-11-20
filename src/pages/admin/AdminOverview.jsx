import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollText, ShieldCheck, UserCheck, Users, Siren } from "lucide-react";
import { useStore } from "../../services/store";
import { SEED_AUDIT } from "../../services/seed";
import { refreshUsers } from "../../services/auth";
import { useData } from "../../hooks/useData";
import { Avatar, PageHeader, Panel, StatCard } from "../../components/ui";
import { BarList, Donut } from "../../components/Charts";
import { timeAgo } from "../../services/format";
import { stagger } from "../../components/motion";
import AdminTabs from "./AdminTabs";

const EMPTY = [];
export default function AdminOverview() {
  const [users] = useStore("users", EMPTY);
  const [audit] = useStore("audit", SEED_AUDIT);
  const { incidents } = useData();
  useEffect(() => { refreshUsers().catch(() => {}); }, []);
  const disabled = users.filter((u) => u.status === "disabled");
  const newest = [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const byType = ["auth", "incident", "resource", "admin", "system"].map((t, i) => ({ label: t, value: audit.filter((a) => a.type === t).length, color: ["#b6a2ff", "#4d8df7", "#36e0a8", "#f2c14e", "#6b7d99"][i] }));
  const roles = [{ label: "Admins", value: users.filter((u) => u.role === "admin").length, color: "#f2c14e" }, { label: "Operators", value: users.filter((u) => u.role === "operator").length, color: "#4d8df7" }];

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="ADMINISTRATION" title="Admin overview" subtitle="Manage access, resources and system settings." />
      <AdminTabs />
      <div className="stat-grid">
        <StatCard icon={Users} label="Total users" value={users.length} note={`${users.filter((u) => u.status === "active").length} active`} tone="blue" />
        <StatCard icon={UserCheck} label="Disabled accounts" value={disabled.length} note="Blocked from signing in" tone="orange" />
        <StatCard icon={Siren} label="Incidents" value={incidents.length} note="All records" tone="red" />
        <StatCard icon={ScrollText} label="Audit events" value={audit.length} note="Last 300 kept" tone="purple" />
      </div>
      <div className="grid-3">
        <Panel title="Newest accounts" subtitle="Sign-ups are active immediately" className="span-2">
          {newest.length === 0 ? <div className="empty-state small">No users yet</div> : newest.map((u) => (
            <div className="user-line" key={u.id}>
              <Avatar name={u.name} /><div className="ul-main"><b>{u.name}</b><small>{u.email}</small></div>
              <small>{timeAgo(u.createdAt)}</small>
            </div>
          ))}
        </Panel>
        <Panel title="User roles"><Donut segments={roles} centerValue={users.length} centerLabel="users" size={130} /></Panel>
      </div>
      <div className="grid-3">
        <Panel title="Activity by type" subtitle="From the audit log"><BarList items={byType} /></Panel>
        <Panel title="Recent audit events" className="span-2" action={<Link className="text-btn" to="/admin/audit">Open log</Link>}>
          {audit.slice(0, 6).map((a) => <div className="activity-row" key={a.id}><div className="activity-icon blue"><ShieldCheck size={16} /></div><div className="activity-copy"><b>{a.action}</b><span>{a.actor} · {a.detail}</span></div><small>{timeAgo(a.at)}</small></div>)}
        </Panel>
      </div>
    </motion.div>
  );
}
