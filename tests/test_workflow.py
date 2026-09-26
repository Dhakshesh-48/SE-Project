import os
import tempfile
from pathlib import Path

# Keep integration-test data outside the repository and isolated from local app data.
os.environ["DATABASE_URL"] = f"sqlite:///{(Path(tempfile.gettempdir()) / 'finrequirements-workflow-tests.db').as_posix()}"

from fastapi.testclient import TestClient
import analysis
from app import app


def login(client, username="demo"):
    response = client.post("/api/auth/login", json={"username": username, "password": "demo-password"})
    assert response.status_code == 200, response.text
    client.headers.update({"Authorization": f"Bearer {response.json()['access_token']}"})
    return response.json()["user"]


def test_adaptive_loan_interview_and_human_approval_to_sdlc():
    with TestClient(app) as client:
        login(client)
        initial = "The loan application should be processed quickly and customer information must be secure."
        response = client.post("/api/projects", json={"name": "Loan Processing System", "statement": initial})
        assert response.status_code == 200, response.text
        project = response.json()
        assert project["messages"][-1]["content"] == "What is the maximum acceptable processing time for the loan application?"

        answers = {
            "performance": "Within 10 seconds.",
            "actors": "Customers submit applications and loan officers review them.",
            "data": "Name, address, PAN, Aadhaar, income and bank account information.",
            "workflow": "Customers submit the application, loan officers verify it, approve or reject it, and escalate exceptions for manual review.",
            "authentication": "Customers use passwords and OTP multi-factor authentication.",
            "authorization": "Loan officers have role-based permissions and least-privilege access to assigned applications.",
            "encryption": "Encrypt customer data in transit using TLS and at rest.",
            "jurisdiction": "The system operates in India; the compliance officer will confirm applicable internal policies.",
            "retention": "Retain loan decision records for 7 years and delete temporary application data after 30 days.",
            "availability": "The target is 99.95% uptime with a 4-hour recovery time.",
            "audit": "Log application access, approval changes, and decision reasons for audit review.",
            "integrations": "Integrate with the core banking platform through its API and a credit bureau service.",
            "operations": "The operations team monitors service health and manages incident response.",
            "constraints": "Requirements change frequently; stakeholders are available and the target delivery is 6 months.",
            "risk": "An incorrect decision can cause financial loss and customer harm.",
        }
        seen_gaps = []
        for expected_key, answer in answers.items():
            prior_question = next(m for m in reversed(project["messages"]) if m["role"] == "assistant" and m["metadata"].get("kind") == "question")
            seen_gaps.append(prior_question["metadata"]["gap"])
            assert prior_question["metadata"]["gap"] == expected_key
            response = client.post(f"/api/projects/{project['id']}/answers", json={"answer": answer})
            assert response.status_code == 200, response.text
            project = response.json()
            if project["status"] != "interview":
                assert project["status"] == "ready_for_validation"
                assert "sufficiently complete" in project["messages"][-1]["content"]
        assert seen_gaps == list(answers)
        assert project["maturity"]["sufficiently_complete"]

        result = client.post(f"/api/projects/{project['id']}/analyze")
        assert result.status_code == 200, result.text
        artifacts = result.json()
        assert artifacts["requirements"][1]["statement"].endswith("within 10 seconds.")
        assert any(item["id"].startswith("SEC-") for item in artifacts["requirements"])
        assert artifacts["security_analysis"]["findings"]
        assert artifacts["compliance_analysis"]["evidence_notice"] == "No supporting evidence was found in the configured knowledge base."
        assert artifacts["user_stories"] and artifacts["use_cases"] and artifacts["acceptance_criteria"]
        assert len(artifacts["traceability_records"]) == len(artifacts["requirements"])
        login(client, "compliance")
        mapping = artifacts["compliance_analysis"]["mappings"][0]
        unsupported = client.post(f"/api/projects/{project['id']}/compliance/mappings/{mapping['requirement_id']}/review", json={"action": "approve"})
        assert unsupported.status_code == 409
        login(client, "demo")

        # Lifecycle selection is explicitly gated on an approved baseline.
        blocked = client.post(f"/api/projects/{project['id']}/sdlc")
        assert blocked.status_code == 409
        for requirement in artifacts["requirements"]:
            response = client.post(f"/api/projects/{project['id']}/requirements/{requirement['id']}/review", json={"action": "approve", "comment": "Reviewed"})
            assert response.status_code == 200, response.text
        baseline = client.post(f"/api/projects/{project['id']}/baseline/approve", json={"comment": "Baseline reviewed"})
        assert baseline.status_code == 200, baseline.text
        recommendation = client.post(f"/api/projects/{project['id']}/sdlc")
        assert recommendation.status_code == 200, recommendation.text
        sdlc = recommendation.json()
        assert sdlc["recommended_model"]
        assert len(sdlc["ranking"]) >= 5
        assert {"score", "confidence"} <= set(sdlc["ranking"][0])
        assert len(sdlc["workflow"]) >= 5
        assert all({"activities", "roles", "inputs", "outputs", "security_activities", "testing_activities", "compliance_checkpoints", "human_approval_gates", "entry_criteria", "exit_criteria", "traceability_requirements"} <= set(phase) for phase in sdlc["workflow"])
        assert client.post(f"/api/projects/{project['id']}/sdlc/approval", json={"comment": "Approved"}).status_code == 200
        assert client.get(f"/api/projects/{project['id']}/audit").status_code == 200


def test_document_rag_requires_explicit_compliance_allowlist():
    with TestClient(app) as client:
        login(client)
        project = client.post("/api/projects", json={"name": "Evidence test", "statement": "The payment system should protect transactions securely."}).json()
        content = b"Approved synthetic internal policy requires TLS encryption for customer financial data in transit."
        uploaded = client.post(f"/api/projects/{project['id']}/documents", files={"file": ("policy.txt", content, "text/plain")}, data={"source": "Synthetic internal policy", "version": "v2", "jurisdiction": "Demo", "effective_date": "2026-01-01"})
        assert uploaded.status_code == 200, uploaded.text
        doc = uploaded.json()["document"]
        assert not doc["approved_source"]
        assert client.get("/api/knowledge/search", params={"project_id": project["id"], "q": "TLS encryption customer financial data"}).json()["evidence"] == []
        assert client.post(f"/api/projects/{project['id']}/documents/{doc['id']}/approval", json={"approved": True}, headers={"Authorization": client.headers["Authorization"]}).status_code == 403
        login(client, "compliance")
        allowed = client.post(f"/api/projects/{project['id']}/documents/{doc['id']}/approval", json={"approved": True, "comment": "Source checked"})
        assert allowed.status_code == 200, allowed.text
        evidence = client.get("/api/knowledge/search", params={"project_id": project["id"], "q": "TLS encryption customer financial data"}).json()["evidence"]
        assert evidence and evidence[0]["document"] == "policy.txt"
        assert evidence[0]["version"] == "v2"
        assert evidence[0]["relevance_score"] > 0


def test_security_and_analysis_boundaries():
    assert analysis.choose_next_question({"name": "Loan Processing System", "initial_statement": analysis.INITIAL_LOAN_STATEMENT, "messages": []})["key"] == "performance"
    context = {"name": "Loan", "initial_statement": analysis.INITIAL_LOAN_STATEMENT, "messages": [{"role": "user", "content": "10 seconds", "metadata": {"kind": "interview_answer"}}]}
    assert analysis.choose_next_question(context)["key"] == "actors"
    assert analysis.embedding("financial customer account security") == analysis.embedding("financial customer account security")
    assert analysis.cosine_similarity(analysis.embedding("customer account"), analysis.embedding("customer account")) == 1
    assert analysis.classify_requirement("Encrypt account data and retain audit logs")
    from app import mask_sensitive_data
    masked = mask_sensitive_data("PAN ABCDE1234F and Aadhaar 1234 5678 9012; email alice@example.test")
    assert "ABCDE1234F" not in masked and "1234 5678 9012" not in masked and "alice@example.test" not in masked


def test_retention_conflict_detects_overlap_not_distinct_record_types():
    def requirement(key, statement):
        return {"id": key, "statement": statement}

    conflict = analysis.detect_conflicts([
        requirement("REQ-1", "Delete customer transaction records after 30 days."),
        requirement("REQ-2", "Retain customer transaction records for 7 years."),
    ])
    assert len(conflict) == 1
    assert conflict[0]["requirements"] == ["REQ-1", "REQ-2"]
    disjoint = analysis.detect_conflicts([
        requirement("REQ-1", "Retain loan decision records for 7 years and delete temporary application data after 30 days."),
    ])
    assert disjoint == []


def test_existing_analysis_contract_and_synthetic_demo_cases():
    from analysis import analyze_requirements_text
    result = analyze_requirements_text("The system shall support secure banking.\nThe application must maintain 99.95% availability and audit logging.")
    assert result["summary"]["total_requirements"] == 2
    assert result["sdlc_recommendation"]["workflow"]
    assert set(analysis.DEMO_CASES) == {"loan", "banking", "payments", "fraud"}
