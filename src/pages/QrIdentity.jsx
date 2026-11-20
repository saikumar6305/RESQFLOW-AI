import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ClipboardList, Download, Printer, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useData } from "../hooks/useData";
import { useToast } from "../context/ToastContext";
import { PageHeader, Panel, Empty } from "../components/ui";
import { fadeUp, stagger } from "../components/motion";
import { QrCode } from "lucide-react";
import { api } from "../services/api";

export default function QrIdentity() {
  const { victims, incidents } = useData();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const [sel, setSel] = useState(params.get("v") || victims[0]?.id || "");
  const box = useRef(null);
  const victim = victims.find((v) => v.id === sel) || victims[0];
  const [qrData, setQrData] = useState(null);
  const token = qrData?.token || (victim ? `RESQFLOW-DEMO-${victim.id}` : "");
  useEffect(() => { let alive = true; setQrData(null); if (victim) api(`/victims/${encodeURIComponent(victim.id)}/qr`, { method: "POST" }).then(data => { if (alive) setQrData(data); }).catch(error => toast(error.message, "error")); return () => { alive = false; }; }, [victim?.id]);

  const copy = async () => { try { await navigator.clipboard.writeText(token); toast("Token copied"); } catch { toast("Copy not available in this browser", "warn"); } };
  const download = () => {
    if (qrData?.image) {
      const a = document.createElement("a"); a.href = qrData.image; a.download = `${token}.png`; a.click(); return;
    }
    const svg = box.current?.querySelector("svg"); if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${token}.svg`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <PageHeader eyebrow="TEMPORARY IDENTIFIER" title="Victim QR identity" subtitle="Generate a QR code containing a non-sensitive demo token.">
        <button className="outline-btn" onClick={() => nav("/incidents")}>Back to incidents</button>
      </PageHeader>
      {!victim ? <Panel><Empty icon={QrCode} title="No victim records" text="Add a record in an incident to generate a token." /></Panel> : (
        <div className="qr-layout">
          <Panel title="QR token generator" subtitle="Select a fictional victim record." className="qr-panel">
            <label className="field-label">VICTIM RECORD</label>
            <select value={victim.id} onChange={(e) => setSel(e.target.value)}>
              {victims.map((v) => <option key={v.id} value={v.id}>{v.id} — {v.name} ({v.incidentId})</option>)}
            </select>
            <motion.div className="qr-display" ref={box} key={token} initial={{ scale: 0.85, opacity: 0, rotate: -4 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", damping: 16 }}>
              {qrData?.image ? <img src={qrData.image} alt="Temporary victim QR token" width="190" height="190" /> : <QRCodeSVG value={token} size={190} level="M" includeMargin />}
            </motion.div>
            <div className="token-label">TEMPORARY DEMO TOKEN</div>
            <div className="token-value">{token}</div>
            <div className="btn-row center">
              <button className="outline-btn" onClick={copy}><ClipboardList size={15} /> Copy</button>
              <button className="outline-btn" onClick={download}><Download size={15} /> SVG</button>
              <button className="outline-btn" onClick={() => window.print()}><Printer size={15} /> Print</button>
            </div>
          </Panel>
          <Panel className="qr-info">
            <div className="qr-info-icon"><ShieldCheck size={22} /></div>
            <h2>Privacy by design</h2>
            <p>The QR payload contains only a temporary demonstration identifier. It does not contain a person's name, contact information, address or medical notes.</p>
            {["No personal information in QR payload", "Suitable for fictional demo records", "Not an official identity credential"].map((t) => <div className="info-line" key={t}><Check size={16} /> {t}</div>)}
          </Panel>
        </div>
      )}
    </motion.div>
  );
}
