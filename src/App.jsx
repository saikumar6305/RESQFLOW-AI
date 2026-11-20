import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Activity, Compass } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LiveMap from "./pages/LiveMap";
import Incidents from "./pages/Incidents";
import Resources from "./pages/Resources";
import Agents from "./pages/Agents";
import QrIdentity from "./pages/QrIdentity";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminResources from "./pages/admin/AdminResources";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import { Empty } from "./components/ui";

function Splash() {
  return <div className="splash"><div className="brand-mark pulse"><Activity size={26} /></div></div>;
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}
function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { ready } = useAuth();
  if (!ready) return <Splash />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<Incidents />} />
        <Route path="resources" element={<Resources />} />
        <Route path="agents" element={<Agents />} />
        <Route path="qr" element={<QrIdentity />} />
        <Route path="admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="admin/resources" element={<RequireAdmin><AdminResources /></RequireAdmin>} />
        <Route path="admin/audit" element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
        <Route path="admin/settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
        <Route path="*" element={<div className="panel"><Empty icon={Compass} title="Page not found" text="That page doesn't exist." /></div>} />
      </Route>
    </Routes>
  );
}
