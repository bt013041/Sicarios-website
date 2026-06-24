"""Backend API tests for Sicarios Cartel app - Iteration 2 (boss/sicarios/loterie roles)."""
import os
import uuid
import pytest
import requests
from datetime import date

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


def _login(username: str) -> dict:
    r = requests.post(f"{API}/auth/demo-login", json={"username": username}, timeout=20)
    assert r.status_code == 200, f"demo-login failed: {r.status_code} {r.text}"
    return r.json()


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def boss_session():
    data = _login("El Jefe")
    return {"token": data["token"], "user": data["user"], "headers": _headers(data["token"])}


@pytest.fixture(scope="session")
def sicarios_session():
    uname = f"Sicario_{uuid.uuid4().hex[:6]}"
    data = _login(uname)
    return {"token": data["token"], "user": data["user"], "headers": _headers(data["token"])}


@pytest.fixture(scope="session")
def loterie_session(boss_session):
    """Create a user, then boss promotes them to 'loterie' role."""
    uname = f"Lottery_{uuid.uuid4().hex[:6]}"
    data = _login(uname)
    uid = data["user"]["id"]
    # Boss promotes to loterie role
    r = requests.patch(
        f"{API}/members/{uid}/role",
        headers=boss_session["headers"],
        json={"role": "loterie"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    # Re-fetch /auth/me to confirm role updated
    me = requests.get(f"{API}/auth/me", headers=_headers(data["token"]), timeout=15).json()
    assert me["role"] == "loterie"
    return {"token": data["token"], "user": me, "headers": _headers(data["token"])}


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


def test_auth_me_with_token(boss_session):
    r = requests.get(f"{API}/auth/me", headers=boss_session["headers"], timeout=15)
    assert r.status_code == 200
    assert r.json()["username"] == "El Jefe"


def test_boss_role(boss_session):
    assert boss_session["user"]["role"] == "boss", \
        f"El Jefe must be boss. Got: {boss_session['user']['role']}"


def test_sicarios_default_role(sicarios_session):
    assert sicarios_session["user"]["role"] == "sicarios"


# ---------- Members / Role permissions ----------
def test_role_change_invalid(boss_session, sicarios_session):
    r = requests.patch(
        f"{API}/members/{sicarios_session['user']['id']}/role",
        headers=boss_session["headers"], json={"role": "bad"}, timeout=15)
    assert r.status_code == 400


def test_role_change_non_boss_forbidden(sicarios_session):
    # sicarios cannot change own or others' role
    r = requests.patch(
        f"{API}/members/{sicarios_session['user']['id']}/role",
        headers=sicarios_session["headers"], json={"role": "boss"}, timeout=15)
    assert r.status_code == 403


def test_role_change_loterie_role_forbidden(loterie_session):
    r = requests.patch(
        f"{API}/members/{loterie_session['user']['id']}/role",
        headers=loterie_session["headers"], json={"role": "boss"}, timeout=15)
    assert r.status_code == 403


def test_boss_can_change_role(boss_session, sicarios_session):
    uid = sicarios_session["user"]["id"]
    # boss -> set to loterie
    r = requests.patch(f"{API}/members/{uid}/role",
                       headers=boss_session["headers"], json={"role": "loterie"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "loterie"
    # restore
    r2 = requests.patch(f"{API}/members/{uid}/role",
                        headers=boss_session["headers"], json={"role": "sicarios"}, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["role"] == "sicarios"


def test_members_list(sicarios_session):
    r = requests.get(f"{API}/members", headers=sicarios_session["headers"], timeout=15)
    assert r.status_code == 200
    members = r.json()
    assert any(m["username"] == "El Jefe" for m in members)
    for m in members:
        assert "_id" not in m
        assert "total_hours" in m


# ---------- Jafuri permissions ----------
def test_jafuri_loterie_role_forbidden(loterie_session):
    today = date.today().isoformat()
    r1 = requests.get(f"{API}/jafuri", headers=loterie_session["headers"], timeout=15)
    assert r1.status_code == 403
    r2 = requests.post(f"{API}/jafuri", headers=loterie_session["headers"],
                       json={"type": "magazin", "amount": 100, "location": "X", "date": today}, timeout=15)
    assert r2.status_code == 403


def test_jafuri_invalid_type(sicarios_session):
    today = date.today().isoformat()
    r = requests.post(f"{API}/jafuri", headers=sicarios_session["headers"],
                      json={"type": "invalid", "amount": 100, "location": "X", "date": today}, timeout=15)
    assert r.status_code == 400


def test_jafuri_crud_with_participants(sicarios_session, boss_session):
    today = date.today().isoformat()
    participants = ["El Jefe", sicarios_session["user"]["username"]]
    r = requests.post(f"{API}/jafuri", headers=sicarios_session["headers"],
                      json={"type": "magazin", "amount": 5000, "location": "TEST_loc",
                            "details": "TEST", "date": today,
                            "participants": participants}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["participants"] == participants
    assert j["type"] == "magazin"
    jid, week = j["id"], j["week"]

    # GET verifies persistence + participants
    rl = requests.get(f"{API}/jafuri?week={week}", headers=boss_session["headers"], timeout=15)
    assert rl.status_code == 200
    found = next((x for x in rl.json() if x["id"] == jid), None)
    assert found and found["participants"] == participants

    # delete cleanup
    rd = requests.delete(f"{API}/jafuri/{jid}", headers=boss_session["headers"], timeout=15)
    assert rd.status_code == 200


# ---------- Tasks permissions ----------
def test_tasks_loterie_forbidden(loterie_session):
    rg = requests.get(f"{API}/tasks", headers=loterie_session["headers"], timeout=15)
    assert rg.status_code == 403
    rp = requests.post(f"{API}/tasks", headers=loterie_session["headers"],
                       json={"title": "TEST_x"}, timeout=15)
    assert rp.status_code == 403


def test_tasks_crud_and_done_by(boss_session, sicarios_session):
    ra = requests.post(f"{API}/tasks", headers=boss_session["headers"],
                       json={"title": "TEST_task_done_by", "description": "d"}, timeout=15)
    assert ra.status_code == 200
    t = ra.json()
    tid = t["id"]
    assert t["done"] is False
    assert t.get("done_by", "") == ""

    # sicarios toggles -> done_by should be sicarios username
    sname = sicarios_session["user"]["username"]
    rt = requests.patch(f"{API}/tasks/{tid}", headers=sicarios_session["headers"], timeout=15)
    assert rt.status_code == 200
    body = rt.json()
    assert body["done"] is True
    assert body["done_by"] == sname

    # Toggle back -> done_by cleared
    rt2 = requests.patch(f"{API}/tasks/{tid}", headers=boss_session["headers"], timeout=15)
    assert rt2.status_code == 200
    body2 = rt2.json()
    assert body2["done"] is False
    assert body2["done_by"] == ""

    requests.delete(f"{API}/tasks/{tid}", headers=boss_session["headers"], timeout=15)


# ---------- Loterie (boss + sicarios + loterie all allowed) ----------
def test_loterie_new_schema_all_roles_can_create(boss_session, sicarios_session, loterie_session):
    today = date.today().isoformat()
    created_ids = []
    for sess in (boss_session, sicarios_session, loterie_session):
        r = requests.post(f"{API}/loterie", headers=sess["headers"],
                          json={"winner_name": f"TEST_w_{sess['user']['username']}",
                                "prize": 500, "details": "TEST", "date": today}, timeout=15)
        assert r.status_code == 200, f"{sess['user']['role']} failed loterie POST: {r.text}"
        body = r.json()
        # new schema fields
        assert body["winner_name"].startswith("TEST_w_")
        assert body["prize"] == 500
        assert "tickets_sold" not in body
        assert "ticket_price" not in body
        assert "amount_won" not in body
        assert "revenue" not in body
        created_ids.append((sess, body["id"]))

    # all roles can list
    for sess, _ in created_ids:
        rl = requests.get(f"{API}/loterie", headers=sess["headers"], timeout=15)
        assert rl.status_code == 200

    # cleanup
    for sess, lid in created_ids:
        requests.delete(f"{API}/loterie/{lid}", headers=boss_session["headers"], timeout=15)


# ---------- Fonduri / Dashboard ----------
def test_fonduri_loterie_total_aggregation(boss_session, sicarios_session):
    today = date.today().isoformat()
    j1 = requests.post(f"{API}/jafuri", headers=sicarios_session["headers"],
                       json={"type": "magazin", "amount": 1000, "location": "T", "date": today}, timeout=15).json()
    j2 = requests.post(f"{API}/jafuri", headers=boss_session["headers"],
                       json={"type": "banca", "amount": 2000, "location": "T", "date": today}, timeout=15).json()
    l1 = requests.post(f"{API}/loterie", headers=boss_session["headers"],
                       json={"winner_name": "TEST_W", "prize": 750, "date": today}, timeout=15).json()
    week = j1["week"]

    rf = requests.get(f"{API}/fonduri?week={week}", headers=boss_session["headers"], timeout=15)
    assert rf.status_code == 200
    f = rf.json()
    # New schema: loterie_total = sum of prizes; total = jafuri_total + loterie_total
    assert "loterie_total" in f
    assert f["loterie_total"] >= 750
    assert f["total"] == f["jafuri_total"] + f["loterie_total"]
    assert f["jafuri_magazin"] >= 1000
    assert f["jafuri_banca"] >= 2000

    rw = requests.get(f"{API}/fonduri/weeks", headers=boss_session["headers"], timeout=15)
    assert rw.status_code == 200
    weeks = rw.json()
    match = next((x for x in weeks if x["week"] == week), None)
    assert match is not None
    assert "loterie_total" in match

    # cleanup
    for x in (j1, j2):
        requests.delete(f"{API}/jafuri/{x['id']}", headers=boss_session["headers"], timeout=15)
    requests.delete(f"{API}/loterie/{l1['id']}", headers=boss_session["headers"], timeout=15)


def test_dashboard_includes_loterie_total(boss_session):
    r = requests.get(f"{API}/dashboard", headers=boss_session["headers"], timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "funds" in body
    assert "loterie_total" in body["funds"]


def test_rapoarte(boss_session):
    r = requests.get(f"{API}/rapoarte", headers=boss_session["headers"], timeout=15)
    assert r.status_code == 200
    body = r.json()
    for k in ("week", "funds", "hours_ranking", "jafuri_ranking"):
        assert k in body


# ---------- Loterie role can access shared modules ----------
def test_loterie_role_can_access_allowed_modules(loterie_session):
    for path in ("/dashboard", "/pontaj", "/loterie", "/fonduri", "/rapoarte", "/members"):
        r = requests.get(f"{API}{path}", headers=loterie_session["headers"], timeout=15)
        assert r.status_code == 200, f"loterie role denied for {path}: {r.text}"
