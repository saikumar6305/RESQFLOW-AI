import { motion } from "framer-motion";

export function AreaChart({ data, height = 190, color = "#4d8df7" }) {
  const W = 600, H = 200, pad = 14;
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const pts = data.map((d, i) => [pad + (i * (W - pad * 2)) / Math.max(data.length - 1, 1), H - pad - (d.value / max) * (H - pad * 2)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0]} ${H} L${pts[0][0]} ${H} Z`;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }} role="img" aria-label="Trend chart">
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".45" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#ffffff" strokeOpacity=".06" />)}
        <motion.path d={area} fill="url(#areaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />
        <motion.path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
      </svg>
      <div className="chart-labels">{data.map((d) => <span key={d.label}><b>{d.value}</b>{d.label}</span>)}</div>
    </div>
  );
}

export function Donut({ segments, size = 150, centerLabel, centerValue }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 52, C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label="Distribution chart">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#ffffff" strokeOpacity=".06" strokeWidth="16" />
        {segments.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <motion.circle key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="16" strokeLinecap="butt"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"
              initial={{ opacity: 0, strokeDasharray: `0 ${C}` }} animate={{ opacity: 1, strokeDasharray: `${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}` }}
              transition={{ delay: 0.15 * i, duration: 0.8 }} />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="donut-value">{centerValue}</text>
        <text x="70" y="86" textAnchor="middle" className="donut-label">{centerLabel}</text>
      </svg>
      <ul className="legend">{segments.map((s) => <li key={s.label}><i style={{ background: s.color }} />{s.label}<b>{s.value}</b></li>)}</ul>
    </div>
  );
}

export function BarList({ items, color = "#4d8df7" }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bar-list">
      {items.map((it, i) => (
        <div key={it.label} className="bar-row">
          <span>{it.label}</span>
          <div className="bar-track"><motion.div className="bar-fill" style={{ background: it.color || color }} initial={{ width: 0 }} animate={{ width: `${(it.value / max) * 100}%` }} transition={{ delay: 0.1 * i, duration: 0.7 }} /></div>
          <b>{it.value}</b>
        </div>
      ))}
    </div>
  );
}
