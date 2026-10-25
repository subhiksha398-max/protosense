
import json
import os
import re

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash

import db
import engine

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5174",
                "http://127.0.0.1:5174"
            ]
        }
    },
    automatic_options=True,
    supports_credentials=False
)

db.init()

STATUSES = {
    "Pending",
    "Completed",
    "Verified",
    "Not Effective"
}


def exp_out(r):
    return {
        "id": r["id"],
        "prototype": r["prototype"],
        "domain": r["domain"],
        "component": r["component"],
        "category": r["category"],
        "symptom": r["symptom"],
        "condition": r["cond_text"],
        "finding": r["finding"],
        "nextTest": r["next_test"],
        "cause": r["cause"],
        "outcome": r["outcome"],
        "date": r["exp_date"],
        "fixes": r["fixes"]
    }


def rec_out(r):
    return {
        "id": r["id"],
        "expId": r["exp_id"],
        "test": r["test"],
        "reason": r["reason"],
        "support": json.loads(r["support"] or "[]"),
        "expected": r["expected"],
        "status": r["status"],
        "result": r["result"] or ""
    }


def all_exps():
    return [
        exp_out(r)
        for r in db.q(
            "SELECT * FROM experiments ORDER BY exp_date"
        )
    ]


def bad(msg, code=400):
    return jsonify({"error": msg}), code


def check(e):
    if not re.fullmatch(
        r"[A-Za-z0-9_-]{1,32}",
        str(e.get("id", ""))
    ):
        return "Invalid experiment id"

    if not all(
        str(e.get(k, "")).strip()
        for k in ("prototype", "component", "symptom")
    ):
        return "prototype, component and symptom are required"

    old = db.q(
        "SELECT is_seed FROM experiments WHERE id=%s",
        (e["id"],),
        one=True
    )

    if old and old["is_seed"]:
        return "ID belongs to a sample record"

    return None


def upsert(e):
    def g(k):
        return str(e.get(k) or "")

    db.q(
        "REPLACE INTO experiments VALUES "
        "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0)",
        (
            e["id"],
            g("prototype"),
            g("domain"),
            g("component"),
            g("category"),
            g("symptom"),
            g("condition"),
            g("finding"),
            g("nextTest"),
            g("cause"),
            g("outcome") or "Under Investigation",
            g("date"),
            g("fixes")
        ),
        write=True
    )


# ---------------- REGISTER API ----------------

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not email or not password:
        return bad("Name, email and password are required")

    if not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email
    ):
        return bad("Enter a valid email")

    if len(password) < 8:
        return bad("Password must be at least 8 characters")

    try:
        existing = db.q(
            "SELECT id FROM users WHERE email=%s",
            (email,),
            one=True
        )

        if existing:
            return bad("Email already registered", 409)

        hashed_password = generate_password_hash(password)

        db.q(
            "INSERT INTO users (name, email, password) "
            "VALUES (%s, %s, %s)",
            (name, email, hashed_password),
            write=True
        )

        return jsonify({
            "message": "Registration successful"
        }), 201

    except Exception:
        app.logger.exception("Registration failed")
        return bad(
            "Registration failed. Check the backend terminal.",
            500
        )


# ---------------- HEALTH API ----------------

@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "db": db.BACKEND
    })


# ---------------- EXPERIMENT APIs ----------------

@app.get("/api/experiments")
def list_exps():
    return jsonify(all_exps())


@app.get("/api/experiments/<eid>")
def get_exp(eid):
    r = db.q(
        "SELECT * FROM experiments WHERE id=%s",
        (eid,),
        one=True
    )

    return jsonify(exp_out(r)) if r else bad("Not found", 404)


@app.post("/api/experiments")
def save_exp():
    e = request.get_json(silent=True) or {}

    err = check(e)
    if err:
        return bad(err, 409 if "sample" in err else 400)

    upsert(e)

    return jsonify({"saved": e["id"]}), 201


# ---------------- ANALYZE API ----------------

@app.post("/api/analyze")
def analyze():
    d = request.get_json(silent=True) or {}

    e = d.get("experiment") or {}
    qy = d.get("query") or {}

    err = check(e)
    if err:
        return bad(err, 409 if "sample" in err else 400)

    upsert(e)

    pool = [
        x for x in all_exps()
        if x["id"] != e["id"]
    ]

    by = {x["id"]: x for x in pool}
    r = engine.analyze(qy, pool)

    db.q(
        "DELETE FROM recommendations WHERE exp_id=%s",
        (e["id"],),
        write=True
    )

    recs = []

    for i, t in enumerate(r["tests"] if r["strong"] else []):
        rec = {
            "id": f"{e['id']}-T{i + 1}",
            "expId": e["id"],
            "test": t["test"],
            "reason": t["why"],
            "support": t["ids"],
            "expected": (
                f"Historical outcome in {t['ids'][0]}: "
                f"{by[t['ids'][0]]['finding']}"
            ),
            "status": "Pending",
            "result": ""
        }

        db.q(
            "INSERT INTO recommendations "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (
                rec["id"],
                rec["expId"],
                rec["test"],
                rec["reason"],
                json.dumps(rec["support"]),
                rec["expected"],
                "Pending",
                ""
            ),
            write=True
        )

        recs.append(rec)

    return jsonify({
        "top": r["top"],
        "strong": r["strong"],
        "causes": r["causes"],
        "recs": recs
    })


# ---------------- RECOMMENDATION APIs ----------------

@app.get("/api/recommendations")
def list_recs():
    rows = db.q(
        "SELECT * FROM recommendations ORDER BY id"
    )

    return jsonify([rec_out(r) for r in rows])


@app.patch("/api/recommendations/<rid>")
def patch_rec(rid):
    d = request.get_json(silent=True) or {}

    if not db.q(
        "SELECT id FROM recommendations WHERE id=%s",
        (rid,),
        one=True
    ):
        return bad("Not found", 404)

    if "status" in d:
        if d["status"] not in STATUSES:
            return bad("Invalid status")

        db.q(
            "UPDATE recommendations SET status=%s WHERE id=%s",
            (d["status"], rid),
            write=True
        )

    if "result" in d:
        db.q(
            "UPDATE recommendations SET result=%s WHERE id=%s",
            (str(d["result"])[:2000], rid),
            write=True
        )

    updated = db.q(
        "SELECT * FROM recommendations WHERE id=%s",
        (rid,),
        one=True
    )

    return jsonify(rec_out(updated))


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG") == "1"
    )
