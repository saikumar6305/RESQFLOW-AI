import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers } from "lucide-react";
import { BAPATLA_CENTER } from "../services/geo";
import { getSettings } from "../services/auth";

const TILES = {
  dark: { label: "Dark", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap &copy; CARTO", sub: "abcd" },
  street: { label: "Street", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "&copy; OpenStreetMap contributors", sub: "abc" },
  satellite: { label: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Tiles &copy; Esri", sub: "" }
};

const GLYPH = {
  incident: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 17h.01"/></svg>',
  ambulance: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>',
  hospital: '<b style="font:800 14px sans-serif;color:#fff">H</b>',
  point: '<svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><circle cx="12" cy="12" r="4"/></svg>'
};

function pin(m, selected) {
  const dim = m.dim ? " dim" : "";
  return L.divIcon({
    className: "pin-wrap",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div class="pin pin-${m.type}${selected ? " sel" : ""}${dim}"><span class="pin-pulse"></span><span class="pin-core">${GLYPH[m.type] || GLYPH.point}</span></div>`
  });
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default function MapView({
  markers = [], routes = [], height = 360, selectedId, fitKey = "default", onMarkerClick, onMapClick,
  styleSwitch = true, interactive = true, center = BAPATLA_CENTER, zoom = 12, className = ""
}) {
  const el = useRef(null);
  const map = useRef(null);
  const tile = useRef(null);
  const markerLayer = useRef(null);
  const routeLayer = useRef(null);
  const lastFit = useRef(null);
  const cbs = useRef({});
  cbs.current = { onMarkerClick, onMapClick };
  const [style, setStyle] = useState(getSettings().defaultMap || "dark");

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: interactive, dragging: interactive, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: interactive, keyboard: interactive })
      .setView(center, zoom);
    if (interactive) L.control.zoom({ position: "bottomright" }).addTo(m);
    markerLayer.current = L.layerGroup().addTo(m);
    routeLayer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => cbs.current.onMapClick?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; lastFit.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = TILES[style] || TILES.dark;
    if (tile.current) tile.current.remove();
    tile.current = L.tileLayer(t.url, { attribution: t.attr, subdomains: t.sub || "abc", maxZoom: 19 }).addTo(map.current);
  }, [style]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    markerLayer.current.clearLayers();
    markers.forEach((mk) => {
      const lm = L.marker([mk.lat, mk.lng], { icon: pin(mk, mk.id === selectedId), riseOnHover: true, zIndexOffset: mk.id === selectedId ? 1000 : mk.type === "incident" ? 500 : 0 }).addTo(markerLayer.current);
      lm.bindTooltip(`<b>${esc(mk.label)}</b>${mk.sub ? `<br><span>${esc(mk.sub)}</span>` : ""}`, { direction: "top", offset: [0, -16], className: "map-tip" });
      lm.on("click", () => cbs.current.onMarkerClick?.(mk));
    });
    if (lastFit.current !== fitKey && markers.length) {
      lastFit.current = fitKey;
      if (markers.length === 1) m.setView([markers[0].lat, markers[0].lng], 14);
      else m.fitBounds(L.latLngBounds(markers.map((x) => [x.lat, x.lng])), { padding: [48, 48], maxZoom: 14 });
    }
  }, [markers, fitKey, selectedId]);

  useEffect(() => {
    routeLayer.current?.clearLayers();
    routes.forEach((r) => {
      L.polyline([r.from, r.to], { color: r.color || "#36e0a8", weight: 4, opacity: 0.9, dashArray: "10 10", className: "route-line", lineCap: "round" }).addTo(routeLayer.current);
    });
  }, [routes]);

  useEffect(() => {
    if (!selectedId || !map.current) return;
    const mk = markers.find((x) => x.id === selectedId);
    if (mk) map.current.flyTo([mk.lat, mk.lng], Math.max(map.current.getZoom(), 14), { duration: 0.8 });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`map-shell ${className}`} style={{ height }}>
      <div ref={el} className="map-canvas" />
      {styleSwitch && (
        <div className="map-switch" role="group" aria-label="Map style">
          <Layers size={14} />
          {Object.entries(TILES).map(([k, v]) => (
            <button key={k} className={style === k ? "on" : ""} onClick={() => setStyle(k)}>{v.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
