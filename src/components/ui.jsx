import { motion } from "framer-motion";
import { initials, hueFor } from "../services/format";
import AnimatedNumber from "./AnimatedNumber";
import { fadeUp } from "./motion";

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <motion.div className="page-heading" variants={fadeUp}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </motion.div>
  );
}

export function Panel({ title, subtitle, action, children, className = "", ...rest }) {
  return (
    <motion.section className={`panel ${className}`} variants={fadeUp} {...rest}>
      {(title || action) && (
        <div className="panel-heading">
          <div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function StatCard({ icon: Icon, label, value, note, tone = "blue" }) {
  return (
    <motion.div className="stat-card" variants={fadeUp} whileHover={{ y: -3 }}>
      <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{typeof value === "number" ? <AnimatedNumber value={value} /> : value}</div>
      <div className="stat-change">{note}</div>
    </motion.div>
  );
}

export function Status({ value }) {
  return <span className={`status status-${String(value).toLowerCase().replace(/\s+/g, "-")}`}>{value}</span>;
}

export function Avatar({ name, size = 34 }) {
  const h = hueFor(name);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${h} 55% 28%)`, color: `hsl(${h} 90% 82%)` }}>
      {initials(name)}
    </span>
  );
}

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-icon"><Icon size={22} /></div>}
      <b>{title}</b>
      {text && <span>{text}</span>}
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && !error && <em className="hint">{hint}</em>}
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}

export function SafetyNote({ title, children }) {
  return (
    <div className="safety-banner">
      <div className="safety-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg></div>
      <div><strong>{title}</strong><p>{children}</p></div>
    </div>
  );
}
