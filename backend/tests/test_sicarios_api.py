"""Backend API tests for Sicarios Cartel app."""
import os
import uuid
import pytest
import requests
from datetime import date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gang-management-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


def _login(username: str) -> dict:
    r = requests.post(f"{API}/auth/demo-login", json={"username": username}, timeout=20)
    assert r.status_code == 200, f"demo-login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def admin_session():
    data = _login("El Jefe")
    # Note: only guaranteed admin if it was the very first user. We'll assert.
    user = data["user"]
    return {"token": data["token"], "user": user,
            "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}}


@pytest.fixture(scope="session")
def member_session():
    uname = f"Sicario_{uuid.uuid4().hex[:6]}"
    data = _login(uname)
    return {"token": data["token"], "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}}


# ---------- Health / Auth ----------
def test_api_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "message" in r.json()


def test_demo_login_empty_username():
    r = requests.post(f"{API}/auth/demo-login", json={"username": ""}, timeout=15)
    assert r.status_code == 400


def test_auth_me_requires_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code in (401, 403)


def test_auth_me_with_token(admin_session):
    r = requests.get(f"{API}/auth/me", headers=admin_session["headers"], timeout=15)
    assert r.status_code == 200
    assert r.json()["username"] == "El Jefe"


def test_admin_role(admin_session):
    # Asserts El Jefe ended up admin (first ever user). If not -> seed issue.
    assert admin_session["user"]["role"] == "admin", \
        f"El Jefe must be admin (first user). Got: {admin_session['user']['role']}"


def test_member_role(member_session):
    assert member_session["user"]["role"] == "member"


def test_discord_url():
    r = requests.get(f"{API}/auth/discord/url", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "url" in body and body["url"].startswith("https://discord.com/oauth2/authorize")
    assert body.get("configured") is True


# ---------- Pontaj ----------
def test_pontaj_crud_and_permissions(member_session, admin_session):
    today = date.today().isoformat()
    r = requests.post(f"{API}/pontaj", headers=member_session["headers"],
                      json={"date": today, "hours": 4.5, "note": "TEST_pontaj"}, timeout=15)
    assert r.status_code == 200, r.text
    item = r.json()
    assert item["hours"] == 4.5
    assert "_id" not in item
    pid = item["id"]
    week = item["week"]

    # List by week
    rl = requests.get(f"{API}/pontaj?week={week}", headers=member_session["headers"], timeout=15)
    assert rl.status_code == 200
    assert any(x["id"] == pid for x in rl.json())

    # Admin creates another pontaj
    r2 = requests.post(f"{API}/pontaj", headers=admin_session["headers"],
                       json={"date": today, "hours": 2, "note": "TEST_admin"}, timeout=15)
    assert r2.status_code == 200
    pid_admin = r2.json()["id"]

    # Member cannot delete admin's pontaj
    rd = requests.delete(f"{API}/pontaj/{pid_admin}", headers=member_session["headers"], timeout=15)
    assert rd.status_code == 403

    # Member can delete own
    rd2 = requests.delete(f"{API}/pontaj/{pid}", headers=member_session["headers"], timeout=15)
    assert rd2.status_code == 200

    # Admin can delete any
    rd3 = requests.delete(f"{API}/pontaj/{pid_admin}", headers=admin_session["headers"], timeout=15)
    assert rd3.status_code == 200


# ---------- Jafuri ----------
def test_jafuri_invalid_type(member_session):
    today = date.today().isoformat()
    r = requests.post(f"{API}/jafuri", headers=member_session["headers"],
                      json={"type": "invalid", "amount": 100, "location": "X", "date": today}, timeout=15)
    assert r.status_code == 400


def test_jafuri_crud(member_session, admin_session):
    today = date.today().isoformat()
    r = requests.post(f"{API}/jafuri", headers=member_session["headers"],
                      json={"type": "magazin", "amount": 5000, "location": "TEST_loc",
                            "details": "TEST", "date": today}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    week = j["week"]
    jid = j["id"]

    rl = requests.get(f"{API}/jafuri?week={week}", headers=admin_session["headers"], timeout=15)
    assert rl.status_code == 200
    assert any(x["id"] == jid for x in rl.json())

    # Admin can delete member's jaf
    rd = requests.delete(f"{API}/jafuri/{jid}", headers=admin_session["headers"], timeout=15)
    assert rd.status_code == 200


# ---------- Loterie ----------
def test_loterie_member_forbidden(member_session):
    today = date.today().isoformat()
    r = requests.post(f"{API}/loterie", headers=member_session["headers"],
                      json={"winner_name": "X", "amount_won": 100, "tickets_sold": 10,
                            "ticket_price": 5, "date": today}, timeout=15)
    assert r.status_code == 403


def test_loterie_admin_create_and_revenue(admin_session, member_session):
    today = date.today().isoformat()
    r = requests.post(f"{API}/loterie", headers=admin_session["headers"],
                      json={"winner_name": "TEST_winner", "amount_won": 500,
                            "tickets_sold": 20, "ticket_price": 10, "date": today}, timeout=15)
    assert r.status_code == 200, r.text
    lot = r.json()
    assert lot["revenue"] == 200
    lid = lot["id"]
    week = lot["week"]

    # Member can list
    rl = requests.get(f"{API}/loterie?week={week}", headers=member_session["headers"], timeout=15)
    assert rl.status_code == 200
    assert any(x["id"] == lid for x in rl.json())

    # Member cannot delete
    rdm = requests.delete(f"{API}/loterie/{lid}", headers=member_session["headers"], timeout=15)
    assert rdm.status_code == 403

    # Admin can delete
    rda = requests.delete(f"{API}/loterie/{lid}", headers=admin_session["headers"], timeout=15)
    assert rda.status_code == 200


# ---------- Tasks ----------
def test_tasks_admin_only_create_and_toggle(admin_session, member_session):
    # Member cannot create
    r = requests.post(f"{API}/tasks", headers=member_session["headers"],
                      json={"title": "TEST_task"}, timeout=15)
    assert r.status_code == 403

    ra = requests.post(f"{API}/tasks", headers=admin_session["headers"],
                       json={"title": "TEST_task_admin", "description": "d"}, timeout=15)
    assert ra.status_code == 200
    t = ra.json()
    tid = t["id"]
    week = t["week"]
    assert t["done"] is False

    # Any user can toggle
    rt = requests.patch(f"{API}/tasks/{tid}", headers=member_session["headers"], timeout=15)
    assert rt.status_code == 200
    assert rt.json()["done"] is True

    # List by week
    rl = requests.get(f"{API}/tasks?week={week}", headers=member_session["headers"], timeout=15)
    assert rl.status_code == 200

    # Member cannot delete
    rdm = requests.delete(f"{API}/tasks/{tid}", headers=member_session["headers"], timeout=15)
    assert rdm.status_code == 403

    rda = requests.delete(f"{API}/tasks/{tid}", headers=admin_session["headers"], timeout=15)
    assert rda.status_code == 200


# ---------- Fonduri / Dashboard / Rapoarte ----------
def test_fonduri_aggregation(admin_session, member_session):
    today = date.today().isoformat()
    # Seed: 1 magazin jaf + 1 banca jaf + 1 loterie
    j1 = requests.post(f"{API}/jafuri", headers=member_session["headers"],
                       json={"type": "magazin", "amount": 1000, "location": "T", "date": today}, timeout=15).json()
    j2 = requests.post(f"{API}/jafuri", headers=admin_session["headers"],
                       json={"type": "banca", "amount": 2000, "location": "T", "date": today}, timeout=15).json()
    l1 = requests.post(f"{API}/loterie", headers=admin_session["headers"],
                       json={"winner_name": "W", "amount_won": 100, "tickets_sold": 5,
                             "ticket_price": 50, "date": today}, timeout=15).json()
    week = j1["week"]

    rf = requests.get(f"{API}/fonduri?week={week}", headers=member_session["headers"], timeout=15)
    assert rf.status_code == 200
    f = rf.json()
    assert f["jafuri_magazin"] >= 1000
    assert f["jafuri_banca"] >= 2000
    assert f["loterie_revenue"] >= 250
    assert f["total"] == f["jafuri_total"] + f["loterie_revenue"]

    rw = requests.get(f"{API}/fonduri/weeks", headers=admin_session["headers"], timeout=15)
    assert rw.status_code == 200
    assert any(x["week"] == week for x in rw.json())

    # cleanup
    for x in (j1, j2):
        requests.delete(f"{API}/jafuri/{x['id']}", headers=admin_session["headers"], timeout=15)
    requests.delete(f"{API}/loterie/{l1['id']}", headers=admin_session["headers"], timeout=15)


def test_dashboard(admin_session):
    r = requests.get(f"{API}/dashboard", headers=admin_session["headers"], timeout=15)
    assert r.status_code == 200
    body = r.json()
    for k in ("week", "funds", "members_count", "total_hours", "tasks_total", "tasks_done", "recent_jafuri"):
        assert k in body


def test_rapoarte(admin_session):
    r = requests.get(f"{API}/rapoarte", headers=admin_session["headers"], timeout=15)
    assert r.status_code == 200
    body = r.json()
    for k in ("week", "funds", "hours_ranking", "jafuri_ranking"):
        assert k in body


# ---------- Members ----------
def test_members_list_and_role_perms(admin_session, member_session):
    r = requests.get(f"{API}/members", headers=member_session["headers"], timeout=15)
    assert r.status_code == 200
    members = r.json()
    assert any(m["username"] == "El Jefe" for m in members)
    me = next(m for m in members if m["id"] == member_session["user"]["id"])
    assert "total_hours" in me

    # Member cannot patch role
    rp = requests.patch(f"{API}/members/{member_session['user']['id']}/role",
                        headers=member_session["headers"], json={"role": "admin"}, timeout=15)
    assert rp.status_code == 403

    # Admin can patch (set then unset)
    rp2 = requests.patch(f"{API}/members/{member_session['user']['id']}/role",
                         headers=admin_session["headers"], json={"role": "admin"}, timeout=15)
    assert rp2.status_code == 200
    assert rp2.json()["role"] == "admin"
    rp3 = requests.patch(f"{API}/members/{member_session['user']['id']}/role",
                         headers=admin_session["headers"], json={"role": "member"}, timeout=15)
    assert rp3.status_code == 200

    # Invalid role
    rp4 = requests.patch(f"{API}/members/{member_session['user']['id']}/role",
                         headers=admin_session["headers"], json={"role": "bad"}, timeout=15)
    assert rp4.status_code == 400
