import { NavLink } from "react-router-dom";
const TABS = [["/admin", "Overview", true], ["/admin/users", "Users"], ["/admin/resources", "Resources"], ["/admin/audit", "Audit log"], ["/admin/settings", "Settings"]];
export default function AdminTabs() {
  return (
    <div className="admin-tabs" role="tablist">
      {TABS.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "on" : "")}>{label}</NavLink>)}
    </div>
  );
}
