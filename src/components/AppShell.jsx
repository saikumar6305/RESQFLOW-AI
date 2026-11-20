import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Ambulance, Bell, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Map as MapIcon, Menu,
  QrCode, ScrollText, ShieldCheck, Siren, Zap, X, Settings, Home, MoreHorizontal, KeyRound
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../services/store";
import { SEED_AUDIT } from "../services/seed";
import { Avatar } from "./ui";
import { pageVariants } from "./motion";
import { timeAgo } from "../services/format";
import { getSettings } from "../services/auth";
import { useToast } from "../context/ToastContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/map", label: "Live map", icon: MapIcon },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/resources", label: "Resources", icon: Ambulance },
  { to: "/agents", label: "Agent coordination", icon: Zap, dot: true },
  { to: "/qr", label: "QR identity", icon: QrCode }
];
const ADMIN_NAV = [
  { to: "/admin", label: "Admin overview", icon: ShieldCheck, end: true },
  { to: "/admin/users", label: "User management", icon: KeyRound },
  { to: "/admin/resources", label: "Resource admin", icon: Ambulance },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/settings", label: "System settings", icon: Settings }
];

const TITLES = { "/": "Dashboard", "/map": "Live map", "/incidents": "Incidents", "/resources": "Resources", "/agents": "Agent coordination", "/qr": "QR identity", "/admin": "Admin", "/admin/users": "Users", "/admin/resources": "Resources (admin)", "/admin/audit": "Audit log", "/admin/settings": "Settings" };

function useClickAway(ref, cb) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && cb();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

export default function AppShell() {
  const { user, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const loc = useLocation();
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [audit] = useStore("audit", SEED_AUDIT);
  const menuRef = useRef(null), bellRef = useRef(null);
  useClickAway(menuRef, () => setMenu(false));
  useClickAway(bellRef, () => setBell(false));
  useEffect(() => { setDrawer(false); setMenu(false); setBell(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const key = "/" + loc.pathname.split("/")[1] + (loc.pathname.startsWith("/admin") ? (loc.pathname.split("/")[2] ? "/" + loc.pathname.split("/")[2] : "") : "");
  const title = TITLES[key] || TITLES["/" + loc.pathname.split("/")[1]] || "RESQFLOW";
  const showBanner = getSettings().showSimBanner;

  const link = ({ to, label, icon: Icon, end, dot }) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
          <Icon size={18} /><span>{label}</span>{dot && <span className="nav-dot" />}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawer ? "mobile-open" : ""}`}>
        <button className="mobile-close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={20} /></button>
        <div className="brand">
          <div className="brand-mark"><Activity size={22} /></div>
          <div><div className="brand-name">RESQFLOW <span>AI</span></div><div className="brand-sub">INCIDENT COMMAND</div></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>{NAV.map(link)}</nav>
        {isAdmin && (<><div className="nav-label spaced">ADMINISTRATION</div><nav>{ADMIN_NAV.map(link)}</nav></>)}
        <div className="sidebar-bottom">
          <div className="simulation-card">
            <div className="sim-icon"><ShieldCheck size={17} /></div>
            <div><strong>Simulation mode</strong><span>Fictional demo data</span></div>
            <span className="live-dot" />
          </div>
          <button className="nav-item" onClick={() => toast("RESQFLOW AI is a simulation-only decision-support prototype. It never dispatches or contacts anyone.", "info")}><CircleHelp size={18} /><span>Help & safety</span></button>
          <button className="nav-item" onClick={logout}><LogOut size={18} /><span>Sign out</span></button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="mobile-menu" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={21} /></button>
            <div className="breadcrumb"><span className="bc-root">Workspace</span><span className="bc-sep">/</span><strong>{title}</strong></div>
          </div>
          <div className="top-actions">
            <div className="system-status"><span className="live-dot" /> All systems operational</div>
            <div className="dropdown-wrap" ref={bellRef}>
              <button className="icon-button" onClick={() => { setBell(!bell); setMenu(false); }} aria-label="Notifications"><Bell size={18} /><i /></button>
              <AnimatePresence>{bell && (
                <motion.div className="dropdown notif" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                  <div className="dropdown-title">Recent activity</div>
                  {audit.slice(0, 5).map((a) => (
                    <div key={a.id} className="notif-row"><b>{a.action}</b><span>{a.detail}</span><small>{a.actor} · {timeAgo(a.at)}</small></div>
                  ))}
                  {isAdmin && <button className="dropdown-link" onClick={() => nav("/admin/audit")}>Open audit log</button>}
                </motion.div>)}
              </AnimatePresence>
            </div>
            <div className="dropdown-wrap" ref={menuRef}>
              <button className="user-chip" onClick={() => { setMenu(!menu); setBell(false); }}>
                <Avatar name={user.name} size={32} />
                <span className="user-chip-text"><strong>{user.name}</strong><small>{user.role}</small></span>
                <ChevronDown size={15} />
              </button>
              <AnimatePresence>{menu && (
                <motion.div className="dropdown" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                  <div className="dropdown-user"><Avatar name={user.name} size={40} /><div><b>{user.name}</b><small>{user.email}</small><span className={`role-badge role-${user.role}`}>{user.role}</span></div></div>
                  {isAdmin && <button className="dropdown-link" onClick={() => nav("/admin")}><ShieldCheck size={15} /> Admin panel</button>}
                  <button className="dropdown-link danger" onClick={logout}><LogOut size={15} /> Sign out</button>
                </motion.div>)}
              </AnimatePresence>
            </div>
          </div>
        </header>
        {showBanner && <div className="sim-strip"><ShieldCheck size={14} /> Simulation environment — fictional data. Nothing here dispatches, treats or notifies real people.</div>}

        <div className="content">
          <motion.div key={loc.pathname.split("/").slice(0, 2).join("/")} variants={pageVariants} initial="initial" animate="animate">
            <Outlet />
          </motion.div>
        </div>
        <footer className="footer"><span>© 2026 RESQFLOW AI</span><span><span className="live-dot" /> Simulation environment <i /> Human review required</span></footer>
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {[{ to: "/", icon: Home, label: "Home", end: true }, { to: "/map", icon: MapIcon, label: "Map" }, { to: "/incidents", icon: Siren, label: "Incidents" }, { to: "/resources", icon: Ambulance, label: "Resources" }].map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bn-item ${isActive ? "active" : ""}`}><Icon size={21} /><span>{label}</span></NavLink>
        ))}
        <button className="bn-item" onClick={() => setDrawer(true)}><MoreHorizontal size={21} /><span>More</span></button>
      </nav>
    </div>
  );
}
