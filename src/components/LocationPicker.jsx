import { useMemo } from "react";
import { Crosshair } from "lucide-react";
import MapView from "./MapView";
import { AREAS } from "../services/geo";
import { useToast } from "../context/ToastContext";

export default function LocationPicker({ value, onChange, height = 220 }) {
  const { toast } = useToast();
  const markers = useMemo(() => (value ? [{ id: "pick", type: "incident", lat: value.lat, lng: value.lng, label: "Selected location" }] : []), [value]);
  const locate = () => {
    if (!navigator.geolocation) return toast("Geolocation is not available in this browser.", "warn");
    navigator.geolocation.getCurrentPosition(
      (p) => onChange({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }),
      () => toast("Could not read your location (permission denied).", "warn"), { timeout: 8000 });
  };
  return (
    <div className="picker">
      <div className="chip-row">
        {AREAS.slice(0, 6).map((a) => (
          <button type="button" key={a.name} className={`chip ${value && Math.abs(value.lat - a.lat) < 1e-4 && Math.abs(value.lng - a.lng) < 1e-4 ? "on" : ""}`}
            onClick={() => onChange({ lat: a.lat, lng: a.lng, area: a.name })}>{a.name}</button>
        ))}
        <button type="button" className="chip" onClick={locate}><Crosshair size={13} /> Use my location</button>
      </div>
      <MapView height={height} markers={markers} fitKey={value ? `${value.lat},${value.lng}` : "none"} onMapClick={onChange} styleSwitch={false} zoom={12} />
      <small className="hint">{value ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)} · tap the map to move the pin` : "Tap the map or choose an area"}</small>
    </div>
  );
}
