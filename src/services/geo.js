// Approximate coordinates for fictional incident scenarios in the Bapatla region.
// Not suitable for real emergency response, routing, or dispatch.
export const AREAS = [
  { name: "Bapatla Town", lat: 15.9042, lng: 80.4675 },
  { name: "Suryalanka", lat: 15.8620, lng: 80.5020 },
  { name: "Karlapalem", lat: 15.9330, lng: 80.4300 },
  { name: "Chirala", lat: 15.8238, lng: 80.3522 },
  { name: "Vetapalem", lat: 15.7840, lng: 80.3060 },
  { name: "Parchur", lat: 15.9670, lng: 80.2690 },
  { name: "Repalle", lat: 16.0184, lng: 80.8296 },
  { name: "Nizampatnam", lat: 15.8980, lng: 80.6690 },
  { name: "Addanki", lat: 15.8107, lng: 79.9724 },
  { name: "Martur", lat: 15.9890, lng: 80.1100 }
];

export const BAPATLA_CENTER = [15.9042, 80.4675];
export function distanceKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearest(point, list) {
  let best = null;
  list.forEach((item) => {
    const d = distanceKm(point, item);
    if (!best || d < best.km) best = { item, km: d };
  });
  return best;
}

// Rough straight-line estimate at an assumed urban speed. Not a routing result.
export const etaMinutes = (km, kmh = 28) => Math.max(1, Math.round((km / kmh) * 60));
