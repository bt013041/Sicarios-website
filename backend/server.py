from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import jwt
import httpx
from urllib.parse import urlencode
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, date, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
DISCORD_CLIENT_ID = os.environ.get('DISCORD_CLIENT_ID', '')
DISCORD_CLIENT_SECRET = os.environ.get('DISCORD_CLIENT_SECRET', '')
DISCORD_REDIRECT_URI = os.environ.get('DISCORD_REDIRECT_URI', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')
BOSS_DISCORD_IDS = [x.strip() for x in os.environ.get('BOSS_DISCORD_IDS', '').split(',') if x.strip()]
DISCORD_GUILD_ID = os.environ.get('DISCORD_GUILD_ID', '').strip()
DISCORD_API = "https://discord.com/api"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def iso_week_str(d: date) -> str:
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def current_week() -> str:
    return iso_week_str(datetime.now(timezone.utc).date())


def parse_date(s: str) -> date:
    return datetime.fromisoformat(s).date() if "T" in s else date.fromisoformat(s)


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------- Models ----------
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    discord_id: str
    username: str
    avatar_url: str = ""
    role: str = "sicarios"  # boss | sicarios | loterie
    created_at: str = Field(default_factory=now_iso)


ROLES = {"boss", "sicarios", "asociat", "loterie"}
# Module access per role
ACCESS = {
    "boss": {"dashboard", "task", "pontaj", "jafuri", "loterie", "fonduri", "rapoarte", "membri"},
    "sicarios": {"dashboard", "task", "pontaj", "jafuri", "loterie", "fonduri", "rapoarte", "membri"},
    "asociat": {"dashboard", "task", "pontaj", "jafuri", "fonduri", "rapoarte", "membri"},
    "loterie": {"dashboard", "pontaj", "loterie", "fonduri", "rapoarte", "membri"},
}


class DemoLogin(BaseModel):
    username: str


class RoleUpdate(BaseModel):
    role: str


class PontajCreate(BaseModel):
    date: str
    hours: float
    note: Optional[str] = ""


class JafCreate(BaseModel):
    type: str  # magazin | banca
    amount: float
    location: str
    details: Optional[str] = ""
    date: str
    participants: List[str] = []


class LoterieCreate(BaseModel):
    week: Optional[str] = None
    winner_name: str
    prize: float
    details: Optional[str] = ""
    date: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    week: Optional[str] = None


# ---------- Auth dependencies ----------
async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalid")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Utilizator inexistent")
    return clean(user)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "boss":
        raise HTTPException(status_code=403, detail="Doar Boss/Conducerea are acces")
    return user


def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Acces interzis pentru rolul tău")
        return user
    return dep


async def upsert_discord_user(discord_id: str, username: str, avatar_url: str) -> dict:
    existing = await db.users.find_one({"discord_id": discord_id})
    if existing:
        await db.users.update_one(
            {"discord_id": discord_id},
            {"$set": {"username": username, "avatar_url": avatar_url}},
        )
        return clean(await db.users.find_one({"discord_id": discord_id}))
    count = await db.users.count_documents({})
    role = "boss" if (count == 0 or discord_id in BOSS_DISCORD_IDS) else "sicarios"
    user = User(discord_id=discord_id, username=username, avatar_url=avatar_url, role=role)
    await db.users.insert_one(user.model_dump())
    return user.model_dump()


# ---------- Auth routes ----------
@api_router.get("/")
async def root():
    return {"message": "Sicarios Cartel API"}


@api_router.post("/auth/demo-login")
async def demo_login(body: DemoLogin):
    uname = body.username.strip()
    if not uname:
        raise HTTPException(status_code=400, detail="Username obligatoriu")
    discord_id = "demo_" + uname.lower().replace(" ", "_")
    avatar = f"https://api.dicebear.com/7.x/bottts-neutral/svg?seed={uname}"
    user = await upsert_discord_user(discord_id, uname, avatar)
    return {"token": make_token(user["id"]), "user": user}


@api_router.get("/auth/discord/url")
async def discord_url():
    if not DISCORD_CLIENT_ID or not DISCORD_REDIRECT_URI:
        raise HTTPException(status_code=400, detail="Discord nu este configurat")
    params = urlencode({
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify guilds",
    })
    return {"url": f"https://discord.com/oauth2/authorize?{params}", "configured": bool(DISCORD_CLIENT_SECRET)}


@api_router.get("/auth/discord/callback")
async def discord_callback(code: str):
    if not DISCORD_CLIENT_SECRET:
        return RedirectResponse(f"{FRONTEND_URL}/?error=discord_not_configured")
    async with httpx.AsyncClient() as http:
        token_res = await http.post(
            f"{DISCORD_API}/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/?error=token_exchange")
        access_token = token_res.json()["access_token"]
        user_res = await http.get(
            f"{DISCORD_API}/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/?error=user_fetch")
        d = user_res.json()
        if DISCORD_GUILD_ID:
            guilds_res = await http.get(
                f"{DISCORD_API}/users/@me/guilds",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            guild_ids = [g["id"] for g in guilds_res.json()] if guilds_res.status_code == 200 else []
            if DISCORD_GUILD_ID not in guild_ids:
                return RedirectResponse(f"{FRONTEND_URL}/?error=not_member")
    discord_id = d["id"]
    username = d.get("global_name") or d.get("username")
    if d.get("avatar"):
        avatar = f"https://cdn.discordapp.com/avatars/{discord_id}/{d['avatar']}.png"
    else:
        avatar = f"https://api.dicebear.com/7.x/bottts-neutral/svg?seed={username}"
    user = await upsert_discord_user(discord_id, username, avatar)
    token = make_token(user["id"])
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Members ----------
@api_router.get("/members")
async def get_members(user: dict = Depends(get_current_user)):
    members = await db.users.find().sort("created_at", 1).to_list(1000)
    result = []
    for m in members:
        m = clean(m)
        hours = await db.pontaj.aggregate([
            {"$match": {"user_id": m["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$hours"}}},
        ]).to_list(1)
        jaf = await db.jafuri.aggregate([
            {"$match": {"user_id": m["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        ]).to_list(1)
        m["total_hours"] = hours[0]["total"] if hours else 0
        m["total_jafuri_amount"] = jaf[0]["total"] if jaf else 0
        m["total_jafuri_count"] = jaf[0]["count"] if jaf else 0
        result.append(m)
    return result


@api_router.patch("/members/{member_id}/role")
async def update_role(member_id: str, body: RoleUpdate, admin: dict = Depends(require_admin)):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Rol invalid")
    res = await db.users.update_one({"id": member_id}, {"$set": {"role": body.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Membru inexistent")
    return clean(await db.users.find_one({"id": member_id}))


@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, admin: dict = Depends(require_admin)):
    await db.users.delete_one({"id": member_id})
    return {"ok": True}


# ---------- Pontaj ----------
@api_router.post("/pontaj")
async def create_pontaj(body: PontajCreate, user: dict = Depends(get_current_user)):
    d = parse_date(body.date)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "avatar_url": user.get("avatar_url", ""),
        "date": d.isoformat(),
        "week": iso_week_str(d),
        "hours": body.hours,
        "note": body.note or "",
        "created_at": now_iso(),
    }
    await db.pontaj.insert_one(doc)
    return clean(doc)


@api_router.get("/pontaj")
async def list_pontaj(week: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"week": week} if week else {}
    rows = await db.pontaj.find(q).sort("date", -1).to_list(2000)
    return [clean(r) for r in rows]


@api_router.delete("/pontaj/{item_id}")
async def delete_pontaj(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.pontaj.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inexistent")
    if user["role"] != "boss" and item["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Nu ai voie")
    await db.pontaj.delete_one({"id": item_id})
    return {"ok": True}


# ---------- SICARIOS DISCORD + JAFURI ----------

DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL")


async def send_discord_webhook(doc):
    if not DISCORD_WEBHOOK:
        print("DISCORD_WEBHOOK_URL lipseste din Render")
        return

    suma = int(doc.get("amount", 0))
    taxa = 1000 if doc.get("type") == "banca" else 0
    suma_ramasa = max(suma - taxa, 0)

    participanti = doc.get("participants", [])
    nr_participanti = len(participanti) if participanti else 1
    castig = suma_ramasa // nr_participanti

    embed = {
        "title": "🚨 Jaf înregistrat",
        "description": "Un jaf nou a fost adăugat pe site-ul Sicarios.",
        "color": 0xff0000,
        "fields": [
            {"name": "🏦 Tip", "value": str(doc.get("type", "-")), "inline": True},
            {"name": "📍 Locație", "value": str(doc.get("location", "-")), "inline": True},
            {"name": "💰 Sumă totală", "value": f"{suma:,}$", "inline": True},
            {"name": "🏛️ Taxă bancă", "value": f"-{taxa:,}$", "inline": True},
            {"name": "✅ Sumă rămasă", "value": f"{suma_ramasa:,}$", "inline": True},
            {"name": "👥 Participanți", "value": ", ".join(participanti) if participanti else "-", "inline": False},
            {"name": "💸 Fiecare primește", "value": f"{castig:,}$", "inline": True},
            {"name": "👤 Înregistrat de", "value": str(doc.get("username", "-")), "inline": True},
        ],
        "footer": {"text": "Sicarios Logs"},
        "timestamp": doc.get("created_at")
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(DISCORD_WEBHOOK, json={"embeds": [embed]})
        print("Discord status:", response.status_code)
        print("Discord response:", response.text)
        response.raise_for_status()


@api_router.post("/jafuri")
async def create_jaf(
    body: JafCreate,
    user: dict = Depends(require_roles("boss", "sicarios", "asociat"))
):
    if body.type not in ("magazin", "banca"):
        raise HTTPException(status_code=400, detail="Tip invalid")

    d = parse_date(body.date)

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "avatar_url": user.get("avatar_url", ""),
        "type": body.type,
        "amount": body.amount,
        "location": body.location,
        "details": body.details or "",
        "participants": body.participants or [],
        "date": d.isoformat(),
        "week": iso_week_str(d),
        "created_at": now_iso(),
    }

    await db.jafuri.insert_one(doc)
    print("JAF SALVAT - urmeaza Discord")

    try:
        await send_discord_webhook(doc)
        print("DISCORD FUNCTIE APELATA")
    except Exception as e:
        print("DISCORD ERROR:", e)

    return clean(doc)


@api_router.get("/jafuri")
async def list_jafuri(
    week: Optional[str] = None,
    user: dict = Depends(require_roles("boss", "sicarios", "asociat"))
):
    q = {"week": week} if week else {}
    rows = await db.jafuri.find(q).sort("date", -1).to_list(2000)
    return [clean(r) for r in rows]


@api_router.delete("/jafuri/{item_id}")
async def delete_jaf(
    item_id: str,
    user: dict = Depends(require_roles("boss", "sicarios", "asociat"))
):
    item = await db.jafuri.find_one({"id": item_id})

    if not item:
        raise HTTPException(status_code=404, detail="Inexistent")

    if user["role"] != "boss" and item["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Nu ai voie")

    await db.jafuri.delete_one({"id": item_id})
    
    return {"ok": True}}
    
# ---------- Loterie ----------
@api_router.post("/loterie")
async def create_loterie(body: LoterieCreate, user: dict = Depends(require_roles("boss", "sicarios"))):
    d = parse_date(body.date) if body.date else datetime.now(timezone.utc).date()
    week = body.week or iso_week_str(d)
    doc = {
        "id": str(uuid.uuid4()),
        "week": week,
        "winner_name": body.winner_name,
        "prize": body.prize,
        "details": body.details or "",
        "date": d.isoformat(),
        "created_by": user["username"],
        "created_at": now_iso(),
    }
    await db.loterie.insert_one(doc)
    return clean(doc)


@api_router.get("/loterie")
async def list_loterie(week: Optional[str] = None, user: dict = Depends(require_roles("boss", "sicarios", "loterie"))):
    q = {"week": week} if week else {}
    rows = await db.loterie.find(q).sort("date", -1).to_list(2000)
    return [clean(r) for r in rows]


@api_router.delete("/loterie/{item_id}")
async def delete_loterie(item_id: str, user: dict = Depends(require_roles("boss", "sicarios"))):
    await db.loterie.delete_one({"id": item_id})
    return {"ok": True}


# ---------- Tasks (weekly) ----------
@api_router.post("/tasks")
async def create_task(body: TaskCreate, user: dict = Depends(require_roles("boss"))):
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "description": body.description or "",
        "week": body.week or current_week(),
        "completed_by": [],
        "created_by": user["username"],
        "created_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    return clean(doc)


@api_router.get("/tasks")
async def list_tasks(week: Optional[str] = None, user: dict = Depends(require_roles("boss", "sicarios", "asociat"))):
    q = {"week": week} if week else {}
    rows = await db.tasks.find(q).sort("created_at", -1).to_list(2000)
    return [clean(r) for r in rows]


@api_router.patch("/tasks/{task_id}")
async def toggle_task(task_id: str, user: dict = Depends(require_roles("boss", "sicarios", "asociat"))):
    item = await db.tasks.find_one({"id": task_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inexistent")
    completed = item.get("completed_by", []) or []
    has = any(c.get("user_id") == user["id"] for c in completed)
    if has:
        completed = [c for c in completed if c.get("user_id") != user["id"]]
    else:
        completed = completed + [{
            "user_id": user["id"],
            "username": user["username"],
            "avatar_url": user.get("avatar_url", ""),
            "at": now_iso(),
        }]
    await db.tasks.update_one({"id": task_id}, {"$set": {"completed_by": completed}})
    return clean(await db.tasks.find_one({"id": task_id}))


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(require_roles("boss"))):
    await db.tasks.delete_one({"id": task_id})
    return {"ok": True}


# ---------- Fonduri (funds aggregation) ----------
async def week_funds(week: str) -> dict:
    jaf = await db.jafuri.aggregate([
        {"$match": {"week": week}},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]).to_list(10)
    jaf_total = sum(x["total"] for x in jaf)
    jaf_count = sum(x["count"] for x in jaf)
    by_type = {x["_id"]: x["total"] for x in jaf}
    lot = await db.loterie.aggregate([
        {"$match": {"week": week}},
        {"$group": {"_id": None, "prizes": {"$sum": "$prize"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    lot_total = lot[0]["prizes"] if lot else 0
    lot_count = lot[0]["count"] if lot else 0
    return {
        "week": week,
        "jafuri_total": jaf_total,
        "jafuri_count": jaf_count,
        "jafuri_magazin": by_type.get("magazin", 0),
        "jafuri_banca": by_type.get("banca", 0),
        "loterie_total": lot_total,
        "loterie_count": lot_count,
        "total": jaf_total + lot_total,
    }


@api_router.get("/fonduri")
async def fonduri(week: Optional[str] = None, user: dict = Depends(get_current_user)):
    return await week_funds(week or current_week())


@api_router.get("/fonduri/weeks")
async def fonduri_weeks(user: dict = Depends(get_current_user)):
    weeks = set()
    for coll in (db.jafuri, db.loterie):
        ws = await coll.distinct("week")
        weeks.update(ws)
    weeks = sorted(weeks, reverse=True)
    return [await week_funds(w) for w in weeks]


# ---------- Dashboard / Rapoarte ----------
@api_router.get("/dashboard")
async def dashboard(week: Optional[str] = None, user: dict = Depends(get_current_user)):
    week = week or current_week()
    funds = await week_funds(week)
    members_count = await db.users.count_documents({})
    hours = await db.pontaj.aggregate([
        {"$match": {"week": week}},
        {"$group": {"_id": None, "total": {"$sum": "$hours"}}},
    ]).to_list(1)
    tasks = await db.tasks.find({"week": week}).to_list(1000)
    tasks_done = len([t for t in tasks if t.get("completed_by")])
    recent_jaf = [clean(r) for r in await db.jafuri.find({"week": week}).sort("date", -1).to_list(5)]
    return {
        "week": week,
        "funds": funds,
        "members_count": members_count,
        "total_hours": hours[0]["total"] if hours else 0,
        "tasks_total": len(tasks),
        "tasks_done": tasks_done,
        "recent_jafuri": recent_jaf,
    }


@api_router.get("/rapoarte")
async def rapoarte(week: Optional[str] = None, user: dict = Depends(get_current_user)):
    week = week or current_week()
    funds = await week_funds(week)
    per_member_hours = await db.pontaj.aggregate([
        {"$match": {"week": week}},
        {"$group": {"_id": {"user_id": "$user_id", "username": "$username"}, "hours": {"$sum": "$hours"}}},
        {"$sort": {"hours": -1}},
    ]).to_list(1000)
    per_member_jaf = await db.jafuri.aggregate([
        {"$match": {"week": week}},
        {"$group": {"_id": {"user_id": "$user_id", "username": "$username"},
                    "amount": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"amount": -1}},
    ]).to_list(1000)
    return {
        "week": week,
        "funds": funds,
        "hours_ranking": [{"username": x["_id"]["username"], "hours": x["hours"]} for x in per_member_hours],
        "jafuri_ranking": [{"username": x["_id"]["username"], "amount": x["amount"], "count": x["count"]} for x in per_member_jaf],
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
