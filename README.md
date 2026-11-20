## One-click Windows startup (recommended)

1. Extract the ZIP fully. Do not run scripts from inside the ZIP.
2. Double-click **`start-resqflow.bat`** in the `resqflow-ai` folder. On first run it creates a Python virtual environment (if missing) and installs Python/npm dependencies (internet required).
3. Keep the **Backend - 8000** and **Frontend - 5173** command windows open while using the app.
4. Open **http://localhost:5173**. The Vite development server forwards `/api` requests to FastAPI at `127.0.0.1:8000`, avoiding frontend/backend URL mismatches.
5. Double-click **`check-resqflow.bat`** to run read-only checks for backend health, frontend availability, API proxy and SQLite integrity.
6. To stop, close the backend and frontend terminal windows. Reopening VS Code alone does not start servers; double-click the launcher again.

**Note:** Port 8000 must be free. The launcher does not make the backend a Windows background service or run when the computer is off. Existing `backend/resqflow.db` and `backend/.jwt_secret` are intentionally **not** included in the ZIP; retain your existing files when upgrading if you need your saved data/accounts/sessions.

# RESQFLOW AI — Incident Command (v2)

React + Vite frontend for the RESQFLOW AI simulation dashboard. Everything (web + mobile layout) lives in this one folder.

## Run
```bash
npm install
npm run dev        # http://localhost:5173  (also reachable from your phone on the same Wi-Fi)
npm run build      # production build in /dist
```
Requires Node.js 18+. An internet connection is needed for the map tiles and Google Fonts.

## Administrator sign-in (no published demo passwords)

Run **`setup-admin.bat`** after the first backend start. Enter an admin email,
name, and your own strong password. The script stores only a password hash in
`backend/resqflow.db`; it also disables the known legacy demo logins when present.
Then sign in on `http://localhost:5173`. No demo credentials appear on the login page.

## Existing SQLite data when upgrading

The ZIP intentionally contains **no** SQLite database or JWT secret. To preserve
existing incidents, victims, users, and login continuity, copy your previous
`backend/resqflow.db` and `backend/.jwt_secret` into this project's `backend/`
folder **while both servers are stopped**. Make a backup of those files first.

If you copied an old Hyderabad database, stop FastAPI and run
**`migrate-bapatla.bat`**. It makes a timestamped SQLite backup and changes only
known original Hyderabad seed rows to fictional Bapatla-area coordinates. Your
custom incidents and resources are not changed. Restart FastAPI and refresh the
browser. If you want to relocate custom records, edit them individually.

For a new project without an existing DB, FastAPI creates SQLite automatically
and seeds fictional Bapatla-area records. Run `setup-admin.bat` once afterward.

**Important:** The map coordinates and hospital names are demonstration-only,
not verified facilities or emergency routing information.

## What's new
- **Login & registration** – sign in / create account (active immediately, no approval), show-password, password strength meter, lockout after 5 failed attempts (30 s), "keep me signed in", idle session timeout, route guards, role-based access.
- **Admin panel** (`/admin`, admin only) – overview, user management (disable / enable / change role / reset password / delete / add), resource CRUD with map position picker, audit log with filters + CSV export, system settings, data export & demo reset.
- **Maps (Leaflet)** – live map page with layer toggles and Dark / Street / Satellite styles, incident mini-maps, nearest ambulance & hospital suggestions with dashed route lines (straight-line estimates), click-to-pin location picker when registering incidents.
- **Images** – original SVG illustrations in `public/images` (login hero, dashboard hero, incident banner, ambulance and hospital cards). They work offline and are easy to replace.
- **Animations** – page transitions, staggered cards, animated counters and charts, sliding nav pill, pulsing map pins, animated agent orchestration diagram, step-by-step agent run with progress bar, toasts, shake-on-error.
- **Mobile view** – bottom tab bar, slide-in drawer, modals become bottom sheets, tables become cards, safe-area support, installable manifest.
- **Fixes** – victims now belong to their own incident (the original shared one list across all incidents); IDs are generated safely; status can be changed; QR page can download SVG / print.

## Project layout
```
src/
  App.jsx, main.jsx
  context/      AuthContext, ToastContext
  services/     auth.js (backend auth), store.js (localStorage store), actions.js, audit.js, geo.js, seed.js
  components/   AppShell, MapView, LocationPicker, Charts, Modal, ui
  pages/        Login, Dashboard, LiveMap, Incidents, Resources, Agents, QrIdentity
  pages/admin/  Overview, Users, Resources, Audit, Settings
  styles/       base, components, pages, responsive
public/images/  SVG illustrations
```

## Important
- **Accounts and sign-in are handled by the FastAPI backend** (see *Accounts & sign-in* below). Passwords are hashed on the server and sessions use signed JWTs.
- Incidents, victims, resources, audit log and user accounts are stored in the backend SQLite database. Admin → Settings → *Reset demo data* restores the original incidents/resources (user accounts are kept).
- Still a simulation: no real dispatch, clinical triage, traffic control or notifications. Distances/ETAs are straight-line estimates, and every coordination result is marked for human review.

## FastAPI backend (added)
The frontend now reads and writes incident, victim, ambulance, hospital and audit data through the FastAPI service. The database is SQLite (`backend/resqflow.db`) and is created automatically with fictional demo records on first startup.

### Start the backend
Open a terminal in the project root:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend health: http://127.0.0.1:8000/api/health  
Interactive API documentation: http://127.0.0.1:8000/docs

### Start the frontend
In a second terminal, from the project root:

```bash
npm install
npm run dev
```

The frontend uses relative `/api` by default and Vite proxies it to `http://127.0.0.1:8000/api` during development. To override it, create `.env.local` in the project root and set `VITE_API_BASE_URL`.

### Implemented backend routes
- `GET /api/health`, `GET /api/bootstrap`, `GET /api/dashboard`
- `GET/POST /api/incidents`, `GET /api/incidents/{id}`, `PATCH /api/incidents/{id}/status`, `DELETE /api/incidents/{id}`
- `GET/POST /api/incidents/{id}/victims`, `DELETE /api/victims/{id}`
- `GET /api/resources`, `POST /api/resources/{ambulance|hospital}`, `PUT/DELETE /api/resources/{id}`
- `POST /api/incidents/{id}/coordinate` (Central Command + six deterministic specialist agents)
- `POST /api/victims/{id}/qr` (temporary, non-sensitive QR token and PNG)
- `GET /api/audit`, `POST /api/admin/reset-demo`

### Accounts & sign-in
- **Create account** (Login page → *Create account*): fill in name, email and password **once**. The account is active immediately and you are signed in — there is no admin approval step.
- **Next time** just use *Sign in* with the same email and password. The account lives in the backend database (`backend/resqflow.db`), so it works from any browser or device and survives clearing the browser. Registering the same email again is refused and you are sent to *Sign in*.
- Self-registered users get the **operator** role. Admins can promote, disable, reset passwords or delete users in **Admin → Users**.
- No hardcoded demo accounts are created. Run `setup-admin.bat` to provision an admin.
- Server rules: password 8+ characters with upper & lower case and a number; 5 failed sign-ins lock that email for 30 s; sessions expire after inactivity (default 30 min, sliding) and tokens after 8 h.
- A random signing key is generated once in `backend/.jwt_secret` (or set `RESQFLOW_SECRET_KEY`). Do not commit it.

### Access control
All data routes require a signed-in user. Administrator-only: user management, deleting incidents, adding/deleting resources, *Reset demo data*. Operators can register incidents, add victims, change statuses, update resource status/capacity, run coordination and generate QR tokens. Audit entries record the signed-in user's name.

Extra routes: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`, and (admin) `GET/POST /api/users`, `PATCH/DELETE /api/users/{id}`, `POST /api/users/{id}/reset-password`.

### Upgrading from the previous zip
Run `pip install -r requirements.txt` again (adds PyJWT). The existing `resqflow.db` is kept; the new `users` table and the two demo accounts are created automatically. Old incident timestamps in an existing database are all identical — use Admin → Settings → *Reset demo data* once to get realistic times.

### Scope and safety
This remains a fictional-data simulation intended for local demonstration; it has not had a security review and must not be exposed to the public internet or used for real emergency operations. No clinical triage, real ambulance dispatch, live hospital capacity, traffic control or external notifications are performed. Do not use real patient or personal data.

### SQLite database management
The backend uses SQLAlchemy with SQLite and automatically initializes `backend/resqflow.db` on first startup. The database is persistent; frontend data is loaded through authenticated API routes. You do not need to install MySQL.

In a terminal opened in `backend/`, run:

```bash
python db_manage.py status  # show tables and record counts
python db_manage.py tables  # show table definitions
python db_manage.py check   # SQLite integrity check
python db_manage.py backup  # safe online snapshot in backend/backups/
```

The utility does not delete or modify application records. The `backups/` folder and `resqflow.db` should not be committed or shared because they may contain account information and fictional incident records. To browse tables visually, open `backend/resqflow.db` with a local SQLite database viewer; avoid editing the live database while FastAPI is running. Use the authenticated admin interface or API for application edits.
