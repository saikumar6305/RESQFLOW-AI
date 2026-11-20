import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Ambulance, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, MapPin, User, CheckCircle2, Siren } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { passwordScore } from "../services/auth";
import { asset } from "../services/format";

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const STRENGTH = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", remember: true });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  if (user) return <Navigate to={loc.state?.from || "/"} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const fail = (msg) => { setError(msg); setShake((s) => s + 1); };
  const switchTab = (t) => { setTab(t); setError(""); setInfo(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (!emailOk(form.email)) return fail("Enter a valid email address.");
    if (tab === "register") {
      if (form.name.trim().length < 2) return fail("Enter your full name.");
      if (passwordScore(form.password) < 3 || form.password.length < 8) return fail("Use 8+ characters with upper & lower case letters and a number.");
      if (form.password !== form.confirm) return fail("Passwords do not match.");
    } else if (!form.password) return fail("Enter your password.");
    setBusy(true);
    try {
      if (tab === "login") { await login({ email: form.email, password: form.password, remember: form.remember }); nav(loc.state?.from || "/", { replace: true }); }
      else {
        await register(form); // account is active immediately and we are signed in
        nav(loc.state?.from || "/", { replace: true });
      }
    } catch (err) {
      fail(err.message);
      // Already registered? Send them to the Sign in tab (email stays filled in).
      if (tab === "register" && /already exists/i.test(err.message)) setTab("login");
    } finally { setBusy(false); }
  };

  const score = passwordScore(form.password);

  return (
    <div className="login-page">
      <section className="login-hero" style={{ backgroundImage: `url(${asset("images/login-hero.svg")})` }}>
        <div className="login-hero-inner">
          <div className="brand light"><div className="brand-mark"><Activity size={22} /></div><div><div className="brand-name">RESQFLOW <span>AI</span></div><div className="brand-sub">INCIDENT COMMAND</div></div></div>
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
            <h1>Coordinate road-incident response, <span>faster and clearer.</span></h1>
            <p>A six-agent decision-support simulation for incident intake, resources, hospitals and live mapping — always under human review.</p>
          </motion.div>
          <div className="hero-floats">
            {[{ i: Siren, t: "RF-1042", s: "Bapatla · Active", c: "red" }, { i: Ambulance, t: "AMB-01", s: "Nearest · ~3 min est.", c: "green" }, { i: MapPin, t: "City Care", s: "12 beds (demo)", c: "blue" }].map((f, k) => (
              <motion.div key={f.t} className={`float-card ${f.c}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: [0, -6, 0] }}
                transition={{ opacity: { delay: 0.5 + k * 0.15 }, y: { delay: 0.8 + k * 0.2, duration: 4 + k, repeat: Infinity, ease: "easeInOut" } }}>
                <f.i size={16} /><div><b>{f.t}</b><small>{f.s}</small></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-panel">
        <motion.div className="login-card" key={shake} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, x: shake ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.45 }}>
          <div className="login-mobile-brand"><div className="brand-mark"><Activity size={20} /></div><b>RESQFLOW <span>AI</span></b></div>
          <div className="tabs" role="tablist">
            {["login", "register"].map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => switchTab(t)}>
                {tab === t && <motion.span layoutId="login-tab" className="tab-pill" />}
                <span>{t === "login" ? "Sign in" : "Create account"}</span>
              </button>
            ))}
          </div>
          <h2>{tab === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="login-sub">{tab === "login" ? "Sign in to the incident command console." : "Sign up once. Next time you only need to sign in."}</p>

          <form onSubmit={submit} noValidate>
            <AnimatePresence initial={false}>
              {tab === "register" && (
                <motion.label className="input-group" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <span>Full name</span>
                  <div className="input-icon"><User size={17} /><input value={form.name} onChange={set("name")} placeholder="e.g. Priya Nair" autoComplete="name" /></div>
                </motion.label>
              )}
            </AnimatePresence>
            <label className="input-group"><span>Email</span>
              <div className="input-icon"><Mail size={17} /><input type="email" value={form.email} onChange={set("email")} placeholder="you@resqflow.ai" autoComplete="username" inputMode="email" /></div>
            </label>
            <label className="input-group"><span>Password</span>
              <div className="input-icon"><Lock size={17} />
                <input type={show ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="••••••••" autoComplete={tab === "login" ? "current-password" : "new-password"} />
                <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>
            {tab === "register" && (
              <>
                <div className="strength"><div>{[0, 1, 2, 3].map((i) => <span key={i} className={i < score ? `on s${score}` : ""} />)}</div><small>{form.password ? STRENGTH[score] : "Password strength"}</small></div>
                <label className="input-group"><span>Confirm password</span>
                  <div className="input-icon"><Lock size={17} /><input type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" autoComplete="new-password" /></div>
                </label>
              </>
            )}
            {tab === "login" && (
              <div className="login-row"><label className="check"><input type="checkbox" checked={form.remember} onChange={set("remember")} /> Keep me signed in</label></div>
            )}
            <AnimatePresence>
              {error && <motion.div className="form-alert error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="alert">{error}</motion.div>}
              {info && <motion.div className="form-alert ok" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}><CheckCircle2 size={16} /> {info}</motion.div>}
            </AnimatePresence>
            <button className="primary-btn big" disabled={busy}>{busy ? <><Loader2 className="spin" size={17} /> Please wait…</> : <>{tab === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} /></>}</button>
          </form>

          <p className="login-foot">Your account is stored securely on the RESQFLOW server.</p>
        </motion.div>
      </section>
    </div>
  );
}
