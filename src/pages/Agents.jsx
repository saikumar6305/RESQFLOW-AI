import { motion } from "framer-motion";
import { Activity, Ambulance, Bell, Building2, CarFront, QrCode, Users, Zap } from "lucide-react";
import { PageHeader, Panel, SafetyNote } from "../components/ui";
import { fadeUp, stagger } from "../components/motion";

const AGENTS = [
  { name: "Victim Agent", detail: "Summarizes responder-entered victim records", icon: Users },
  { name: "Ambulance Agent", detail: "Finds nearest simulated available unit", icon: Ambulance },
  { name: "Hospital Agent", detail: "Compares reported demo capacity & distance", icon: Building2 },
  { name: "Traffic Agent", detail: "Prepares a draft note for traffic personnel", icon: CarFront },
  { name: "Identity Agent", detail: "Supports temporary QR demo tokens", icon: QrCode },
  { name: "Notification Agent", detail: "Prepares an approval-gated workflow", icon: Bell }
];

export default function Agents() {
  const R = 150, C = 200;
  const pts = AGENTS.map((_, i) => { const a = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2; return [C + R * Math.cos(a), C + R * Math.sin(a)]; });
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="MULTI-AGENT SYSTEM" title="Agent coordination center" subtitle="Six specialized software agents coordinated by a central command workflow.">
        <span className="muted-pill"><Activity size={13} /> Rule-based prototype</span>
      </PageHeader>
      <div className="grid-2-1 even">
        <Panel title="Orchestration" subtitle="How the central agent fans out to specialists">
          <div className="orbit">
            <svg viewBox="0 0 400 400" role="img" aria-label="Agent orchestration diagram">
              <circle cx={C} cy={C} r={R} fill="none" stroke="#5b9dff" strokeOpacity=".12" strokeDasharray="4 6" />
              {pts.map((p, i) => (
                <g key={i}>
                  <line x1={C} y1={C} x2={p[0]} y2={p[1]} stroke="#4d8df7" strokeOpacity=".4" strokeWidth="2" strokeDasharray="6 8"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" /></line>
                  <circle r="4" fill="#36e0a8"><animateMotion dur={`${2 + i * 0.3}s`} repeatCount="indefinite" path={`M${C} ${C} L${p[0]} ${p[1]}`} /></circle>
                </g>
              ))}
              <circle cx={C} cy={C} r="38" fill="#173a67" stroke="#4d8df7" strokeWidth="2" />
              <circle cx={C} cy={C} r="38" fill="none" stroke="#4d8df7"><animate attributeName="r" from="38" to="70" dur="2.4s" repeatCount="indefinite" /><animate attributeName="opacity" from=".7" to="0" dur="2.4s" repeatCount="indefinite" /></circle>
              <text x={C} y={C - 2} textAnchor="middle" fill="#dfeaff" fontSize="12" fontWeight="700">CENTRAL</text>
              <text x={C} y={C + 13} textAnchor="middle" fill="#9fc0f0" fontSize="10">COMMAND</text>
              {pts.map((p, i) => (<g key={`n${i}`}><circle cx={p[0]} cy={p[1]} r="24" fill="#142a47" stroke="#36e0a8" strokeOpacity=".7" /><text x={p[0]} y={p[1] + 4} textAnchor="middle" fill="#cfe7ff" fontSize="11" fontWeight="700">{i + 1}</text></g>))}
            </svg>
            <ol className="orbit-legend">{AGENTS.map((a) => <li key={a.name}>{a.name}</li>)}</ol>
          </div>
        </Panel>
        <motion.div className="central-agent" variants={fadeUp}>
          <div className="central-icon"><Zap size={24} /></div>
          <div><span>CENTRAL ORCHESTRATOR</span><h2>Central Command Agent</h2><p>Loads shared incident context, invokes specialist agents in order and combines their outputs into one report for human review. Open an incident and press “Run coordination” to watch it work.</p></div>
        </motion.div>
      </div>
      <div className="agent-grid full">
        {AGENTS.map((a, i) => (
          <motion.div className="agent-card" key={a.name} variants={fadeUp} whileHover={{ y: -4 }}>
            <div className="agent-card-icon"><a.icon size={20} /></div>
            <small className="agent-num">AGENT {i + 1}</small><h3>{a.name}</h3><p>{a.detail}</p>
            <span className="muted-pill">Ready for simulation</span>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} style={{ marginTop: 16 }}><SafetyNote title="Human-supervised decision support">These agents organize and summarize fictional data. They do not make clinical decisions, dispatch ambulances, control traffic or send notifications.</SafetyNote></motion.div>
    </motion.div>
  );
}
