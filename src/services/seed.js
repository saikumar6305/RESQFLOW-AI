const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

export const SEED_INCIDENTS = [
  { id: "RF-1042", title: "Multi-vehicle collision", location: "Bapatla Town, Bapatla district", lat: 15.9042, lng: 80.4675, vehicles: 3, status: "Active", priority: "High", createdAt: ago(38) },
  { id: "RF-1041", title: "Roadside vehicle incident", location: "Suryalanka, Bapatla district", lat: 15.8620, lng: 80.5020, vehicles: 2, status: "Monitoring", priority: "Medium", createdAt: ago(145) },
  { id: "RF-1039", title: "Traffic collision", location: "Chirala, Bapatla district", lat: 15.8238, lng: 80.3522, vehicles: 4, status: "Closed", priority: "Medium", createdAt: ago(1620) },
  { id: "RF-1037", title: "Two-wheeler skid", location: "Karlapalem, Bapatla district", lat: 15.9330, lng: 80.4300, vehicles: 1, status: "Closed", priority: "Low", createdAt: ago(2900) }
];

export const SEED_VICTIMS = [
  { id: "V-201", incidentId: "RF-1042", name: "Victim A", status: "Reported injured", notes: "Demo record only" },
  { id: "V-202", incidentId: "RF-1042", name: "Victim B", status: "Awaiting assessment", notes: "Demo record only" },
  { id: "V-203", incidentId: "RF-1042", name: "Victim C", status: "Reported stable", notes: "Demo record only" },
  { id: "V-204", incidentId: "RF-1042", name: "Victim D", status: "Awaiting assessment", notes: "Demo record only" },
  { id: "V-205", incidentId: "RF-1041", name: "Victim E", status: "Reported stable", notes: "Demo record only" },
  { id: "V-206", incidentId: "RF-1041", name: "Victim F", status: "Awaiting assessment", notes: "Demo record only" }
];

export const SEED_AMBULANCES = [
  { id: "AMB-01", name: "AMB-01", location: "Bapatla Town", lat: 15.9050, lng: 80.4710, status: "Available", crew: "Crew Alpha" },
  { id: "AMB-02", name: "AMB-02", location: "Suryalanka", lat: 15.8600, lng: 80.5000, status: "Busy", crew: "Crew Bravo" },
  { id: "AMB-03", name: "AMB-03", location: "Chirala", lat: 15.8250, lng: 80.3550, status: "Available", crew: "Crew Charlie" },
  { id: "AMB-04", name: "AMB-04", location: "Karlapalem", lat: 15.9320, lng: 80.4320, status: "Offline", crew: "Crew Delta" }
];

export const SEED_HOSPITALS = [
  { id: "H-01", name: "City Care Hospital", location: "Bapatla Town", lat: 15.9070, lng: 80.4690, capacity: 12 },
  { id: "H-02", name: "Metro General", location: "Suryalanka", lat: 15.8640, lng: 80.5010, capacity: 8 },
  { id: "H-03", name: "Sunrise Medical Centre", location: "Vetapalem", lat: 15.7840, lng: 80.3060, capacity: 5 },
  { id: "H-04", name: "Lakeview Trauma Unit", location: "Repalle", lat: 16.0184, lng: 80.8296, capacity: 0 }
];

export const SEED_AUDIT = [
  { id: "a1", at: ago(210), actor: "System", type: "system", action: "Simulation environment started", detail: "Fictional demo dataset loaded" },
  { id: "a2", at: ago(60), actor: "Priya Nair", type: "incident", action: "Incident registered", detail: "RF-1042 · Bapatla Town" },
  { id: "a3", at: ago(41), actor: "Priya Nair", type: "incident", action: "Victim record added", detail: "V-201 · RF-1042" },
  { id: "a4", at: ago(20), actor: "Aarav Sharma", type: "admin", action: "Resource updated", detail: "AMB-02 marked Busy" }
];

export const DEFAULT_SETTINGS = {
  sessionMinutes: 30,
  defaultMap: "dark",
  showSimBanner: true
};

// Illustrative numbers for the 7-day trend chart (demo data, not computed)
export const WEEK_TREND = [
  { label: "Fri", value: 3 }, { label: "Sat", value: 5 }, { label: "Sun", value: 2 },
  { label: "Mon", value: 6 }, { label: "Tue", value: 4 }, { label: "Wed", value: 7 }, { label: "Thu", value: 4 }
];
