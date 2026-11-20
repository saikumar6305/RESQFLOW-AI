from __future__ import annotations
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Literal
from uuid import uuid4
import base64
import math
import re
import secrets
import time

import jwt

import qrcode
from fastapi import APIRouter, FastAPI, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session

from .security import create_token, decode_token, hash_password, verify_password

# Absolute path (backend/resqflow.db) so the same database is used no matter where uvicorn is started from.
DATABASE_URL = f"sqlite:///{(Path(__file__).resolve().parent.parent / 'resqflow.db').as_posix()}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase): pass
class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    location: Mapped[str] = mapped_column(String(300))
    lat: Mapped[float] = mapped_column(Float, default=15.9042)
    lng: Mapped[float] = mapped_column(Float, default=80.4675)
    vehicles: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="Active")
    priority: Mapped[str] = mapped_column(String(30), default="Medium")
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    victims: Mapped[list["Victim"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
class Victim(Base):
    __tablename__ = "victims"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    incidentId: Mapped[str] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(80), default="Awaiting assessment")
    notes: Mapped[str] = mapped_column(Text, default="Demo record only")
    incident: Mapped[Incident] = relationship(back_populates="victims")
class Resource(Base):
    __tablename__ = "resources"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(160))
    location: Mapped[str] = mapped_column(String(200))
    lat: Mapped[float] = mapped_column(Float, default=15.9042)
    lng: Mapped[float] = mapped_column(Float, default=80.4675)
    status: Mapped[str] = mapped_column(String(30), default="Available")
    capacity: Mapped[int] = mapped_column(Integer, default=0)
    crew: Mapped[str] = mapped_column(String(120), default="")
class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    actor: Mapped[str] = mapped_column(String(120), default="System")
    type: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(160))
    detail: Mapped[str] = mapped_column(Text, default="")

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(16), default="operator")     # admin | operator
    status: Mapped[str] = mapped_column(String(16), default="active")     # active | disabled
    password_hash: Mapped[str] = mapped_column(String(300))
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    lastLogin: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

Base.metadata.create_all(engine)
app = FastAPI(title="RESQFLOW AI API", version="1.0.0", description="Simulation-only incident coordination backend")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_origin_regex=r"^https?://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$", allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def db_session():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def audit(db: Session, action: str, detail: str = "", kind: str = "incident"):
    # actor is set per request by the auth dependency (db.info["actor"]); "System" otherwise.
    db.add(Audit(actor=db.info.get("actor", "System"), type=kind, action=action, detail=detail))

def iso(dt):
    """SQLite stores naive UTC. Emit an explicit 'Z' so browsers don't read it as local time."""
    if not dt: return None
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

def ago(minutes: int):
    return datetime.now(timezone.utc) - timedelta(minutes=minutes)

def serialize(obj):
    if isinstance(obj, Incident):
        return {"id":obj.id,"title":obj.title,"location":obj.location,"lat":obj.lat,"lng":obj.lng,"vehicles":obj.vehicles,"status":obj.status,"priority":obj.priority,"createdAt":iso(obj.createdAt)}
    if isinstance(obj, Victim): return {"id":obj.id,"incidentId":obj.incidentId,"name":obj.name,"status":obj.status,"notes":obj.notes}
    if isinstance(obj, Resource): return {"id":obj.id,"name":obj.name,"location":obj.location,"lat":obj.lat,"lng":obj.lng,"status":obj.status,"capacity":obj.capacity,"crew":obj.crew,"kind":obj.kind}
    if isinstance(obj, Audit): return {"id":obj.id,"at":iso(obj.at),"actor":obj.actor,"type":obj.type,"action":obj.action,"detail":obj.detail}
    return obj

def serialize_user(u: "User"):
    return {"id":u.id,"name":u.name,"email":u.email,"role":u.role,"status":u.status,"createdAt":iso(u.createdAt),"lastLogin":iso(u.lastLogin)}

# Fictional seed data mirrors the supplied React demo. Seed only an empty database.
def seed(db: Session):
    if db.query(Resource).count() == 0:
        resources = [
          Resource(id="AMB-01",kind="ambulance",name="AMB-01",location="Bapatla Town",lat=17.4870,lng=78.4130,status="Available",crew="Crew Alpha"),
          Resource(id="AMB-02",kind="ambulance",name="AMB-02",location="Suryalanka",lat=17.4960,lng=78.3600,status="Busy",crew="Crew Bravo"),
          Resource(id="AMB-03",kind="ambulance",name="AMB-03",location="Chirala",lat=17.4470,lng=78.3810,status="Available",crew="Crew Charlie"),
          Resource(id="AMB-04",kind="ambulance",name="AMB-04",location="Karlapalem",lat=17.4400,lng=78.4420,status="Offline",crew="Crew Delta"),
          Resource(id="H-01",kind="hospital",name="City Care Hospital",location="Bapatla Town",lat=17.4905,lng=78.4060,status="Connected",capacity=12),
          Resource(id="H-02",kind="hospital",name="Metro General",location="Suryalanka",lat=17.4990,lng=78.3590,status="Connected",capacity=8),
          Resource(id="H-03",kind="hospital",name="Sunrise Medical Centre",location="Vetapalem",lat=17.4510,lng=78.3930,status="Connected",capacity=5),
          Resource(id="H-04",kind="hospital",name="Lakeview Trauma Unit",location="Repalle",lat=17.4450,lng=78.4650,status="Connected",capacity=0)]
        db.add_all(resources)
    if db.query(Incident).count() == 0:
        incidents = [
          Incident(id="RF-1042",title="Multi-vehicle collision",location="Bapatla Town, Bapatla district",lat=17.4948,lng=78.3996,vehicles=3,status="Active",priority="High",createdAt=ago(38)),
          Incident(id="RF-1041",title="Roadside vehicle incident",location="Suryalanka, Bapatla district",lat=17.4969,lng=78.3547,vehicles=2,status="Monitoring",priority="Medium",createdAt=ago(145)),
          Incident(id="RF-1039",title="Traffic collision",location="Chirala, Bapatla district",lat=17.4435,lng=78.3772,vehicles=4,status="Closed",priority="Medium",createdAt=ago(1620)),
          Incident(id="RF-1037",title="Two-wheeler skid",location="Karlapalem, Bapatla district",lat=17.4375,lng=78.4483,vehicles=1,status="Closed",priority="Low",createdAt=ago(2900))]
        db.add_all(incidents)
        db.flush()
        db.add_all([Victim(id="V-201",incidentId="RF-1042",name="Victim A",status="Reported injured"),Victim(id="V-202",incidentId="RF-1042",name="Victim B",status="Awaiting assessment"),Victim(id="V-203",incidentId="RF-1042",name="Victim C",status="Reported stable"),Victim(id="V-204",incidentId="RF-1042",name="Victim D",status="Awaiting assessment"),Victim(id="V-205",incidentId="RF-1041",name="Victim E",status="Reported stable"),Victim(id="V-206",incidentId="RF-1041",name="Victim F",status="Awaiting assessment")])
    db.commit()
# No hardcoded demo credentials are created. Run setup_admin.py once to
# provision an administrator with a password chosen on your own computer.
with SessionLocal() as _s:
    seed(_s)

class IncidentIn(BaseModel):
    title: str = Field(default="New road incident", max_length=160)
    location: str = Field(min_length=2, max_length=300)
    lat: float = Field(default=15.9042, ge=-90, le=90)
    lng: float = Field(default=80.4675, ge=-180, le=180)
    vehicles: int = Field(ge=1, le=50)
    priority: Literal["Low", "Medium", "High"] = "Medium"
class VictimIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    status: Literal["Awaiting assessment", "Reported injured", "Reported stable", "Transferred"] = "Awaiting assessment"
    notes: str = Field(default="Demo record only", max_length=500)
class IncidentStatusIn(BaseModel): status: Literal["Active", "Monitoring", "Closed"]
class ResourceIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    location: str = Field(default="Bapatla district", max_length=200)
    lat: float = Field(default=15.9042, ge=-90, le=90)
    lng: float = Field(default=80.4675, ge=-180, le=180)
    status: Literal["Available", "Busy", "Offline", "Connected"] | None = None   # defaulted by kind on create
    capacity: int = Field(default=0, ge=0, le=500)
    crew: str = Field(default="", max_length=120)

# ---------------------------------------------------------------------------------------------
# Authentication dependencies
# ---------------------------------------------------------------------------------------------
bearer = HTTPBearer(auto_error=False)

def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(db_session)) -> User:
    if creds is None:
        raise HTTPException(401, "Please sign in to continue.")
    try:
        payload = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your session expired. Please sign in again.")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid session. Please sign in again.")
    user = db.get(User, payload.get("sub"))
    if user is None or user.status != "active":
        raise HTTPException(401, "Your account is no longer active. Please sign in again.")
    db.info["actor"] = user.name          # lets audit() record who did what
    return user

def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required.")
    return user

secured = APIRouter(dependencies=[Depends(current_user)])   # any signed-in user
admin = APIRouter(dependencies=[Depends(require_admin)])    # administrators only

@app.get("/api/health")
def health(): return {"status":"ok","mode":"simulation","service":"RESQFLOW AI"}
@secured.get("/api/bootstrap")
def bootstrap(db: Session = Depends(db_session)):
    return {"incidents":[serialize(x) for x in db.query(Incident).order_by(Incident.createdAt.desc()).all()],"victims":[serialize(x) for x in db.query(Victim).all()],"ambulances":[serialize(x) for x in db.query(Resource).filter_by(kind="ambulance").all()],"hospitals":[serialize(x) for x in db.query(Resource).filter_by(kind="hospital").all()],"audit":[serialize(x) for x in db.query(Audit).order_by(Audit.id.desc()).limit(300).all()]}
@secured.get("/api/dashboard")
def dashboard(db: Session = Depends(db_session)):
    return {"incidents":db.query(Incident).count(),"victims":db.query(Victim).count(),"availableAmbulances":db.query(Resource).filter_by(kind="ambulance",status="Available").count(),"connectedHospitals":db.query(Resource).filter_by(kind="hospital").count()}
@secured.get("/api/incidents")
def incidents(db: Session = Depends(db_session)): return [serialize(x) for x in db.query(Incident).order_by(Incident.createdAt.desc()).all()]
@secured.post("/api/incidents")
def create_incident(data: IncidentIn, db: Session = Depends(db_session)):
    last = max([int(x.id.split("-")[-1]) for x in db.query(Incident).all()] or [1041])
    obj=Incident(id=f"RF-{last+1}",**data.model_dump()); db.add(obj); audit(db,"Incident registered",f"{obj.id} · {obj.location}"); db.commit(); db.refresh(obj); return serialize(obj)
@secured.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(db_session)):
    x=db.get(Incident,incident_id)
    if not x: raise HTTPException(404,"Incident not found")
    return serialize(x)
@secured.patch("/api/incidents/{incident_id}/status")
def update_incident(incident_id: str, data: IncidentStatusIn, db: Session = Depends(db_session)):
    x=db.get(Incident,incident_id)
    if not x: raise HTTPException(404,"Incident not found")
    x.status=data.status; audit(db,"Incident status changed",f"{incident_id} → {data.status}"); db.commit(); return serialize(x)
@admin.delete("/api/incidents/{incident_id}")
def delete_incident(incident_id: str, db: Session = Depends(db_session)):
    x=db.get(Incident,incident_id)
    if not x: raise HTTPException(404,"Incident not found")
    db.delete(x); audit(db,"Incident deleted",incident_id); db.commit(); return {"ok":True}
@secured.get("/api/incidents/{incident_id}/victims")
def list_victims(incident_id: str, db: Session = Depends(db_session)):
    if not db.get(Incident,incident_id): raise HTTPException(404,"Incident not found")
    return [serialize(x) for x in db.query(Victim).filter_by(incidentId=incident_id).all()]
@secured.post("/api/incidents/{incident_id}/victims")
def create_victim(incident_id: str, data: VictimIn, db: Session = Depends(db_session)):
    if not db.get(Incident,incident_id): raise HTTPException(404,"Incident not found")
    nums=[int(x.id.split("-")[-1]) for x in db.query(Victim).all()]
    obj=Victim(id=f"V-{max(nums+[200])+1}",incidentId=incident_id,**data.model_dump()); db.add(obj); audit(db,"Victim record added",f"{obj.id} · {incident_id}"); db.commit(); db.refresh(obj); return serialize(obj)
@secured.delete("/api/victims/{victim_id}")
def delete_victim(victim_id: str, db: Session = Depends(db_session)):
    x=db.get(Victim,victim_id)
    if not x: raise HTTPException(404,"Victim not found")
    db.delete(x); audit(db,"Victim record removed",victim_id); db.commit(); return {"ok":True}
@secured.get("/api/resources")
def resources(db: Session = Depends(db_session)): return [serialize(x) for x in db.query(Resource).all()]
@secured.put("/api/resources/{resource_id}")
def update_resource(resource_id: str, data: ResourceIn, db: Session = Depends(db_session)):
    x=db.get(Resource,resource_id)
    if not x: raise HTTPException(404,"Resource not found")
    for k,v in data.model_dump(exclude_none=True).items(): setattr(x,k,v)
    audit(db,"Resource updated",f"{x.name} · {x.status}","resource"); db.commit(); return serialize(x)
@admin.post("/api/resources/{kind}")
def create_resource(kind: str, data: ResourceIn, db: Session = Depends(db_session)):
    if kind not in ("ambulance","hospital"): raise HTTPException(400,"Invalid resource type")
    prefix="AMB-" if kind=="ambulance" else "H-"
    nums=[int(x.id.split("-")[-1]) for x in db.query(Resource).filter_by(kind=kind).all() if x.id.split("-")[-1].isdigit()]
    rid=f"{prefix}{max(nums+[0])+1:02d}"; fields=data.model_dump(); fields["status"]=fields["status"] or ("Connected" if kind=="hospital" else "Available"); x=Resource(id=rid,kind=kind,**fields); db.add(x); audit(db,"Resource added",x.name,"resource"); db.commit(); return serialize(x)
@admin.delete("/api/resources/{resource_id}")
def delete_resource(resource_id: str, db: Session = Depends(db_session)):
    x=db.get(Resource,resource_id)
    if not x: raise HTTPException(404,"Resource not found")
    db.delete(x); audit(db,"Resource deleted",resource_id,"resource"); db.commit(); return {"ok":True}

# Six specialist agents: deterministic, transparent demo rules only.
def run_agents(incident, victims, resources):
    ambulances=[r for r in resources if r.kind=="ambulance"]
    hospitals=[r for r in resources if r.kind=="hospital"]
    available=[r for r in ambulances if r.status=="Available"]
    ranked=sorted(hospitals,key=lambda h:h.capacity,reverse=True)
    return [
      {"agent":"Victim Agent","status":"completed","summary":f"{len(victims)} victim record(s) attached. Status values are responder-entered and are not medical triage."},
      {"agent":"Ambulance Agent","status":"completed","summary":f"{len(available)} demo ambulance(s) marked Available."+(f" Candidate for human review: {available[0].name}." if available else " No ambulance is marked available.")},
      {"agent":"Hospital Agent","status":"completed","summary":("Demo capacity comparison: "+", ".join(f"{h.name} ({h.capacity})" for h in ranked[:3])+". Verify live capacity and facilities.") if ranked else "No demo hospital records found."},
      {"agent":"Traffic Agent","status":"completed","summary":f"Prepare traffic coordination request for authorized personnel near {incident.location}. No live traffic or route verification."},
      {"agent":"Identity Agent","status":"completed","summary":"Temporary QR identifiers can be generated per victim. QR payloads contain no personal details."},
      {"agent":"Notification Agent","status":"completed","summary":"Notification workflow prepared for authorized human review. No SMS, email or calls are sent."}]
@secured.post("/api/incidents/{incident_id}/coordinate")
def coordinate(incident_id: str, db: Session = Depends(db_session)):
    incident=db.get(Incident,incident_id)
    if not incident: raise HTTPException(404,"Incident not found")
    victims=db.query(Victim).filter_by(incidentId=incident_id).all(); resources=db.query(Resource).all()
    outputs=run_agents(incident,victims,resources); audit(db,"Coordination report generated",incident_id); db.commit()
    return {"incidentId":incident_id,"coordinator":"Central Command Agent","generatedAt":datetime.now(timezone.utc).isoformat(),"status":"Requires human review","safetyNotice":"Simulation only. No clinical triage, dispatch, live traffic verification or external notifications.","agents":outputs}
@secured.post("/api/victims/{victim_id}/qr")
def victim_qr(victim_id: str, db: Session = Depends(db_session)):
    v=db.get(Victim,victim_id)
    if not v: raise HTTPException(404,"Victim not found")
    token=f"RESQFLOW-DEMO-VICTIM-{v.id}-{secrets.token_hex(3)}"
    img=qrcode.make(token); buf=BytesIO(); img.save(buf,format="PNG")
    return {"token":token,"image":"data:image/png;base64,"+base64.b64encode(buf.getvalue()).decode()}
@secured.get("/api/audit")
def get_audit(db: Session = Depends(db_session)): return [serialize(x) for x in db.query(Audit).order_by(Audit.id.desc()).limit(300).all()]
@admin.post("/api/admin/reset-demo")
def reset_demo(db: Session = Depends(db_session)):
    db.query(Victim).delete(); db.query(Incident).delete(); db.query(Resource).delete(); db.query(Audit).delete(); db.commit(); seed(db); audit(db,"Demo data reset","Incidents, victims and resources restored","admin"); db.commit(); return {"ok":True}


# =============================================================================================
# Accounts: sign up once (active immediately, no admin approval), then just sign in.
# =============================================================================================
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def clean_email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > 254 or not EMAIL_RE.match(v):
        raise ValueError("Enter a valid email address.")
    return v

def check_password(v: str) -> str:
    if len(v) < 8 or not (re.search(r"[a-z]", v) and re.search(r"[A-Z]", v) and re.search(r"\d", v)):
        raise ValueError("Password needs 8+ characters with upper & lower case letters and a number.")
    return v

def clean_name(v: str) -> str:
    v = v.strip()
    if len(v) < 2:
        raise ValueError("Enter your full name.")
    return v

class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
class RegisterIn(BaseModel):
    name: str = Field(max_length=80)
    email: str
    password: str = Field(max_length=128)
    @field_validator("name")
    @classmethod
    def _name(cls, v): return clean_name(v)
    @field_validator("email")
    @classmethod
    def _email(cls, v): return clean_email(v)
    @field_validator("password")
    @classmethod
    def _pw(cls, v): return check_password(v)
class UserCreateIn(RegisterIn):
    role: Literal["admin", "operator"] = "operator"
class UserPatchIn(BaseModel):
    role: Literal["admin", "operator"] | None = None
    status: Literal["active", "disabled"] | None = None
class PasswordIn(BaseModel):
    password: str = Field(min_length=8, max_length=128)

def session_payload(user: User):
    token, expires_at = create_token(user.id)
    return {"token": token, "expiresAt": expires_at, "user": serialize_user(user)}

# Failed-login lockout (per email, in memory): 5 failures -> 30 s lock.
_FAILS: dict[str, dict] = {}
_DUMMY_HASH = hash_password("not-a-real-password")   # keeps timing similar for unknown emails

def _check_lock(mail: str):
    lock = _FAILS.get(mail)
    if lock and lock.get("until", 0) > time.time():
        raise HTTPException(429, f"Too many failed attempts. Try again in {math.ceil(lock['until'] - time.time())}s.")

def _record_fail(mail: str):
    lock = _FAILS.setdefault(mail, {"count": 0})
    lock["count"] += 1
    if lock["count"] >= 5:
        lock["until"] = time.time() + 30
        lock["count"] = 0

@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(db_session)):
    mail = data.email.strip().lower()
    _check_lock(mail)
    user = db.query(User).filter_by(email=mail).first()
    password_ok = verify_password(data.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not password_ok:
        _record_fail(mail)
        db.info["actor"] = "Unknown"
        audit(db, "Failed sign-in", mail, "auth"); db.commit()
        raise HTTPException(401, "Incorrect email or password.")
    if user.status == "disabled":
        raise HTTPException(403, "This account has been disabled. Contact an administrator.")
    _FAILS.pop(mail, None)
    user.lastLogin = datetime.now(timezone.utc)
    db.info["actor"] = user.name
    audit(db, "Signed in", user.email, "auth"); db.commit()
    return session_payload(user)

@app.post("/api/auth/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(db_session)):
    if db.query(User).filter_by(email=data.email).first():
        raise HTTPException(409, "An account with this email already exists. Please sign in instead.")
    user = User(id=uuid4().hex, name=data.name, email=data.email, role="operator", status="active",
                password_hash=hash_password(data.password), lastLogin=datetime.now(timezone.utc))
    db.add(user)
    db.info["actor"] = user.name
    audit(db, "Account created", user.email, "auth")
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists. Please sign in instead.")
    return session_payload(user)          # signed in straight away - no approval step

@secured.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return serialize_user(user)

@secured.post("/api/auth/refresh")
def refresh_session(user: User = Depends(current_user)):
    return session_payload(user)

@secured.post("/api/auth/logout")
def logout(user: User = Depends(current_user), db: Session = Depends(db_session)):
    audit(db, "Signed out", user.email, "auth"); db.commit()
    return {"ok": True}

# ---- user administration (admin only) -----------------------------------------------------------
@admin.get("/api/users")
def list_users(db: Session = Depends(db_session)):
    return [serialize_user(u) for u in db.query(User).order_by(User.createdAt).all()]

@admin.post("/api/users", status_code=201)
def create_user(data: UserCreateIn, db: Session = Depends(db_session)):
    if db.query(User).filter_by(email=data.email).first():
        raise HTTPException(409, "Email already in use.")
    u = User(id=uuid4().hex, name=data.name, email=data.email, role=data.role, status="active", password_hash=hash_password(data.password))
    db.add(u); audit(db, "User created", f"{u.email} · {u.role}", "admin"); db.commit()
    return serialize_user(u)

@admin.patch("/api/users/{user_id}")
def update_user(user_id: str, data: UserPatchIn, me: User = Depends(require_admin), db: Session = Depends(db_session)):
    u = db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    if u.id == me.id and ((data.role and data.role != u.role) or (data.status and data.status != u.status)):
        raise HTTPException(400, "You can't change your own role or status.")
    if data.status and data.status != u.status:
        u.status = data.status
        audit(db, "User enabled" if data.status == "active" else "User disabled", u.email, "admin")
    if data.role and data.role != u.role:
        u.role = data.role
        audit(db, f"Role changed to {data.role}", u.email, "admin")
    db.commit()
    return serialize_user(u)

@admin.post("/api/users/{user_id}/reset-password")
def reset_password(user_id: str, data: PasswordIn, db: Session = Depends(db_session)):
    u = db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    u.password_hash = hash_password(data.password)
    audit(db, "Password reset", u.email, "admin"); db.commit()
    return {"ok": True}

@admin.delete("/api/users/{user_id}")
def delete_user(user_id: str, me: User = Depends(require_admin), db: Session = Depends(db_session)):
    u = db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    if u.id == me.id: raise HTTPException(400, "You can't delete your own account.")
    db.delete(u); audit(db, "User deleted", u.email, "admin"); db.commit()
    return {"ok": True}

app.include_router(secured)
app.include_router(admin)
