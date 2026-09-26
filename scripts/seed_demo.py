"""Seed the local install with a reusable synthetic loan interview and sample projects."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
import analysis
import database as db
from app import hash_password


def main():
    db.init_db()
    with db.SessionLocal() as session:
        for name, description in (("reviewer", "Requirements and SDLC approver"), ("compliance", "Compliance reviewer"), ("security", "Security reviewer")):
            if session.get(db.Role, name) is None:
                session.add(db.Role(name=name, description=description))
        session.flush()
        user = session.scalar(select(db.User).where(db.User.username == "demo"))
        if user is None:
            user = db.User(username="demo", role="reviewer", password_hash=hash_password("demo-password"))
            session.add(user)
            session.flush()
        for key, case in analysis.DEMO_CASES.items():
            name = case["name"]
            if session.scalar(select(db.Project).where(db.Project.owner_id == user.id, db.Project.name == name)):
                continue
            project = db.Project(owner_id=user.id, name=name, initial_statement=case["statement"], status="interview", state={"turn_count": 0, "demo_case": key})
            session.add(project)
            session.flush()
            session.add(db.Message(project_id=project.id, role="user", content=case["statement"], metadata_json={"kind": "initial_statement", "source": "synthetic demo stakeholder"}))
            question = analysis.choose_next_question({"name": name, "initial_statement": case["statement"], "messages": []})
            if question:
                session.add(db.Message(project_id=project.id, role="assistant", content=question["prompt"], metadata_json={"kind": "question", "category": question["category"], "gap": question["key"], "reason": question["why"]}))
        session.commit()
    print("Synthetic loan, digital banking, payments, and fraud demo projects are ready.")

if __name__ == "__main__":
    main()
