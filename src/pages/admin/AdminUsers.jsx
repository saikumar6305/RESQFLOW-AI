import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, Copy, KeyRound, Plus, Search, Shield, Trash2, UserCheck, UserPlus } from "lucide-react";
import { useStore } from "../../services/store";
import { adminCreateUser, adminDeleteUser, adminResetPassword, adminUpdateUser, passwordScore, refreshUsers } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar, Empty, Field, PageHeader, Panel, Status } from "../../components/ui";
import Modal from "../../components/Modal";
import { timeAgo } from "../../services/format";
import { stagger } from "../../components/motion";
import AdminTabs from "./AdminTabs";

const EMPTY = [];
const tempPassword = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint32Array(10));
  return [...r].map((n) => c[n % c.length]).join("") + "7!";
};

export default function AdminUsers() {
  const [users] = useStore("users", EMPTY);
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operator" });
  const [err, setErr] = useState("");
  const [reset, setReset] = useState(null);

  useEffect(() => { refreshUsers().catch(() => {}); }, []);

  const list = users.filter((u) => (filter === "all" || u.status === filter || u.role === filter) && `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const create = async (e) => {
    e.preventDefault(); setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("Enter a valid email.");
    if (form.password.length < 8 || passwordScore(form.password) < 3) return setErr("Password needs 8+ characters, upper/lower case and a number.");
    try { await adminCreateUser(form); toast("User created"); setAdd(false); setForm({ name: "", email: "", password: "", role: "operator" }); } catch (x) { setErr(x.message); }
  };
  const doReset = async (u) => { const pw = tempPassword(); await adminResetPassword(u.id, pw); setReset({ user: u, pw }); };
  const del = async (u) => { if (window.confirm(`Delete ${u.name}? This cannot be undone.`)) { await adminDeleteUser(u.id); toast("User deleted", "info"); } };

  const Actions = ({ u }) => {
    const self = u.id === me.id;
    return (
      <div className="row-actions wrap">
        {u.status === "active" && !self && <button className="tiny-btn" onClick={async () => { await adminUpdateUser(u.id, { status: "disabled" }); toast("User disabled", "info"); }}><Ban size={14} /> Disable</button>}
        {u.status === "disabled" && <button className="tiny-btn ok" onClick={async () => { await adminUpdateUser(u.id, { status: "active" }); toast("User enabled"); }}><UserCheck size={14} /> Enable</button>}
        {!self && <button className="tiny-btn" onClick={async () => { const role = u.role === "admin" ? "operator" : "admin"; await adminUpdateUser(u.id, { role }); toast(`Role: ${role}`, "info"); }}><Shield size={14} /> {u.role === "admin" ? "Make operator" : "Make admin"}</button>}
        <button className="tiny-btn" onClick={() => doReset(u)}><KeyRound size={14} /> Reset</button>
        {!self && <button className="tiny-btn bad" onClick={() => del(u)}><Trash2 size={14} /></button>}
      </div>
    );
  };

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="ADMINISTRATION" title="User management" subtitle="Approve requests, assign roles and control access.">
        <button className="primary-btn" onClick={() => setAdd(true)}><UserPlus size={17} /> Add user</button>
      </PageHeader>
      <AdminTabs />
      <Panel>
        <div className="toolbar">
          <div className="search-wrap grow"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" /></div>
          <div className="chip-row">{["all", "active", "disabled", "admin", "operator"].map((f) => <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
        </div>
        {list.length === 0 ? <Empty title="No users match" /> : (
          <>
            <div className="table-wrap desktop-only"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>
              <AnimatePresence initial={false}>
                {list.map((u) => (
                  <motion.tr key={u.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td><div className="person-cell"><Avatar name={u.name} /><div className="pc-text"><b>{u.name}{u.id === me.id && <em className="you">you</em>}</b><small>{u.email}</small></div></div></td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td><td><Status value={u.status} /></td>
                    <td className="muted-cell">{u.lastLogin ? timeAgo(u.lastLogin) : "Never"}</td><td><Actions u={u} /></td>
                  </motion.tr>
                ))}
              </AnimatePresence></tbody></table></div>
            <div className="card-list mobile-only">
              {list.map((u) => (
                <div className="mini-card col" key={u.id}>
                  <div className="mc-top"><Avatar name={u.name} /><div className="mc-main"><b>{u.name}{u.id === me.id && <em className="you">you</em>}</b><small>{u.email}</small></div><Status value={u.status} /></div>
                  <div className="mc-meta"><span className={`role-badge role-${u.role}`}>{u.role}</span><small>Last sign-in: {u.lastLogin ? timeAgo(u.lastLogin) : "never"}</small></div>
                  <Actions u={u} />
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      <Modal open={add} onClose={() => setAdd(false)} title="Add user" subtitle="Create an active account with a role.">
        <form className="modal-form" onSubmit={create}>
          <Field label="FULL NAME"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="EMAIL"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="two-col">
            <Field label="PASSWORD"><input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars" /></Field>
            <Field label="ROLE"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="operator">Operator</option><option value="admin">Admin</option></select></Field>
          </div>
          {err && <div className="form-alert error">{err}</div>}
          <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setAdd(false)}>Cancel</button><button className="primary-btn"><Plus size={16} /> Create user</button></div>
        </form>
      </Modal>

      <Modal open={!!reset} onClose={() => setReset(null)} title="Temporary password" subtitle={reset ? `Share this with ${reset.user.name} securely.` : ""}>
        {reset && (<>
          <div className="token-box"><code>{reset.pw}</code><button className="outline-btn" onClick={() => { navigator.clipboard?.writeText(reset.pw); toast("Copied"); }}><Copy size={15} /> Copy</button></div>
          <p className="hint">It is shown only once. The previous password no longer works.</p>
          <div className="modal-actions"><button className="primary-btn" onClick={() => setReset(null)}>Done</button></div>
        </>)}
      </Modal>
    </motion.div>
  );
}
