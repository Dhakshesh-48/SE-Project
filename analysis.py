from collections import Counter

CATEGORY_KEYWORDS = {
    "Business": ["business", "customer", "workflow", "process", "operational need", "service", "onboarding", "loan", "payment", "fraud", "insurance", "reporting", "kyc"],
    "Technical": ["api", "integration", "system", "database", "interface", "architecture", "legacy", "platform", "application", "data model", "technical"],
    "Security": ["security", "authentication", "authorization", "encryption", "identity", "access control", "secrets", "cyber", "malware", "vulnerability", "strong authentication", "role-based"],
    "Privacy": ["privacy", "personal data", "pii", "consent", "data minimization", "retention", "gdpr", "data subject", "customer privacy"],
    "Compliance": ["compliance", "regulation", "sox", "basel", "ffiec", "aml", "kyc", "policy", "audit", "control", "governance", "legal", "regulatory"],
    "Performance": ["latency", "throughput", "response time", "performance", "scale", "capacity", "fast", "responsive"],
    "Availability": ["availability", "uptime", "backup", "recovery", "resilience", "fault tolerance", "disaster", "99.95%"],
    "Auditability": ["audit trail", "traceability", "evidence", "review", "approval", "logging", "checkpoint", "human approval"],
    "Operational": ["maintenance", "support", "monitoring", "ops", "deployment", "incident", "runbook", "release", "operations"],
}

REGULATION_MAP = {
    "Security": ["NIST CSF", "ISO 27001", "SOC 2"],
    "Privacy": ["GDPR", "CCPA", "Data Protection Act"],
    "Compliance": ["SOX", "FFIEC", "Basel III", "AML/KYC policy"],
    "Technical": ["Enterprise architecture policy", "Legacy integration standards"],
    "Availability": ["Business continuity policy", "Disaster recovery standard"],
    "Auditability": ["Internal audit policy", "Approval governance checklist"],
}

DEFAULT_REQUIREMENTS = """The banking platform shall support secure digital banking and payment processing for retail and business customers.
The system shall enforce strong authentication, role-based access control, and audit logging for all user actions.
The application must maintain 99.95% availability, low response latency, and secure API integration with legacy banking systems.
The solution shall comply with SOX, GDPR, AML/KYC controls, and internal governance policies while protecting customer privacy.
The project requires human approval checkpoints, traceability evidence, and a risk register before production release.
The platform shall support customer onboarding, fraud detection, and regulatory reporting while maintaining data privacy.
"""


def _normalize_requirement(line):
    cleaned = line.strip().strip('-*•0123456789. ')
    return cleaned.strip()


def _classify_requirement(line):
    lower = line.lower()
    scores = {category: sum(1 for keyword in keywords if keyword in lower) for category, keywords in CATEGORY_KEYWORDS.items()}
    return max(scores, key=scores.get), scores


def _extract_candidates(raw_text):
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    candidates = []
    for line in lines:
        lower = line.lower()
        if any(token in lower for token in ("shall", "must", "require", "requirement", "need", "policy", "support", "ensure")):
            candidates.append(_normalize_requirement(line))
    if not candidates:
        candidates = [
            _normalize_requirement(line)
            for line in DEFAULT_REQUIREMENTS.splitlines()
            if line.strip()
        ]
    return candidates


def _build_user_stories(requirements):
    role_map = [
        "Compliance officer",
        "Operations analyst",
        "Customer service agent",
        "Security engineer",
        "Banking product manager",
    ]
    stories = []
    for idx, req in enumerate(requirements[:5], start=1):
        role = role_map[(idx - 1) % len(role_map)]
        stories.append({
            "id": f"US-{idx:03d}",
            "story": f"As a {role}, I want {req.lower()} so that the financial service remains compliant, secure, and trustworthy.",
        })
    return stories


def _build_use_cases(requirements):
    return [
        {"id": f"UC-{idx:03d}", "name": f"Requirements validation for scenario {idx}", "description": req}
        for idx, req in enumerate(requirements[:4], start=1)
    ]


def _build_acceptance_criteria(requirements):
    criteria = []
    for idx, req in enumerate(requirements[:4], start=1):
        criteria.append({
            "id": f"AC-{idx:03d}",
            "statement": f"Given a stakeholder requirement, when the system evaluates '{req}', then it must classify the requirement, attach evidence, and require approval before release.",
        })
    return criteria


def _build_traceability(requirements):
    records = []
    for idx, req in enumerate(requirements[:6], start=1):
        category, _ = _classify_requirement(req)
        records.append({
            "id": f"TR-{idx:03d}",
            "source": "Stakeholder interview / policy document",
            "category": category,
            "status": "Validated",
            "requirement": req,
        })
    return records


def _build_regulatory_mapping(requirements):
    results = []
    for req in requirements[:6]:
        category, _ = _classify_requirement(req)
        results.append({
            "requirement": req,
            "category": category,
            "regulations": REGULATION_MAP.get(category, ["Internal governance policy"]),
            "controls": [
                "Identity and access control",
                "Approval checkpoint",
                "Evidence logging",
                "Security review",
                "Legacy system constraints review",
            ],
            "evidence": ["Signed approval record", "Compliance review note", "Retention log", "Risk register"],
        })
    return results


def _build_multi_agent_architecture():
    return [
        {"agent": "Coordinator agent", "responsibility": "Controls the workflow and assigns tasks across the system."},
        {"agent": "Stakeholder interaction agent", "responsibility": "Conducts interviews, asks clarifying questions, and gathers requirements from stakeholders."},
        {"agent": "Requirement extraction agent", "responsibility": "Extracts requirements from conversations, transcripts, questionnaires, and policy documents."},
        {"agent": "Compliance analysis agent", "responsibility": "Maps requirements to regulations, policies, controls, and risk conditions."},
        {"agent": "Risk and SDLC advisor agent", "responsibility": "Evaluates complexity, criticality, and change frequency to recommend the best SDLC model."},
    ]


def _build_project_scope():
    return [
        "Digital banking and mobile banking",
        "Loan origination and credit assessment",
        "Payment processing",
        "Fraud detection",
        "Insurance and investment platforms",
        "Regulatory reporting",
        "Customer onboarding and KYC",
        "Financial data analytics",
    ]


def recommend_sdlc(requirements):
    lower_text = " ".join(requirements).lower()
    categories = Counter()
    for req in requirements:
        category, _ = _classify_requirement(req)
        categories[category] += 1

    security_signal = categories.get("Security", 0) + categories.get("Compliance", 0) + categories.get("Privacy", 0)
    change_signal = 1 if any(word in lower_text for word in ["rapid", "agile", "frequent", "continuous", "new release", "change"]) else 0
    complexity_signal = categories.get("Technical", 0) + categories.get("Operational", 0)

    if security_signal >= 3 and change_signal:
        model = "DevSecOps + Agile Hybrid"
        rationale = "The initiative combines strong security/compliance obligations with frequent change and iterative delivery, making a hybrid DevSecOps + Agile model appropriate."
        workflow = [
            "Stakeholder and policy discovery",
            "Risk, compliance, and threat review",
            "Sprint-based implementation with secure coding gates",
            "Automated testing, validation, and evidence collection",
            "Human approval checkpoint and controlled release",
        ]
    elif security_signal >= 3:
        model = "V-Model with DevSecOps controls"
        rationale = "High regulatory sensitivity and verification requirements justify a model with explicit validation gates and compliance checkpoints."
        workflow = [
            "Requirements and risk analysis",
            "System design and policy mapping",
            "Implementation and secure testing",
            "Verification and compliance sign-off",
            "Deployment with audit evidence",
        ]
    elif complexity_signal >= 2 and change_signal:
        model = "Agile with compliance gates"
        rationale = "The system is evolving and technically diverse, but still needs governance and approval checkpoints for financial regulations."
        workflow = [
            "Sprint planning and requirement refinement",
            "Secure build and unit testing",
            "Compliance review and evidence capture",
            "Release approval and operations handoff",
        ]
    elif complexity_signal >= 2:
        model = "Spiral"
        rationale = "The project has significant risk and complexity, so iterative risk-driven planning and prototype validation are suitable."
        workflow = [
            "Risk analysis",
            "Prototype and design",
            "Evaluation and refinement",
            "Build and validation",
            "Operational deployment",
        ]
    else:
        model = "Waterfall with governance reviews"
        rationale = "The requirement set is relatively stable and structured, making a sequential lifecycle with governance checkpoints practical."
        workflow = [
            "Requirements gathering",
            "Design and policy review",
            "Development and testing",
            "Deployment",
            "Operations handover",
        ]

    return {
        "model": model,
        "rationale": rationale,
        "workflow": workflow,
    }


def analyze_requirements_text(raw_text):
    candidates = _extract_candidates(raw_text)
    functional = []
    non_functional = []
    category_counts = Counter()

    for req in candidates:
        category, _ = _classify_requirement(req)
        category_counts[category] += 1
        if any(keyword in req.lower() for keyword in ["shall", "must", "require", "need", "support", "ensure"]) and category not in ["Security", "Compliance", "Privacy", "Performance", "Availability", "Auditability", "Operational"]:
            functional.append(req)
        else:
            non_functional.append(req)

    if not functional:
        functional = candidates[:3]
    if not non_functional:
        non_functional = candidates[3:]

    result = {
        "summary": {
            "total_requirements": len(candidates),
            "categories": dict(category_counts),
            "risk_level": "High" if category_counts.get("Security", 0) + category_counts.get("Compliance", 0) + category_counts.get("Privacy", 0) >= 3 else "Medium",
        },
        "project_scope": _build_project_scope(),
        "stakeholders": [
            "Customers and end users",
            "Business analysts",
            "Product owners",
            "Software architects and developers",
            "Information-security teams",
            "Compliance and legal officers",
            "Risk-management teams",
            "Operations personnel",
            "Auditors and regulators",
        ],
        "input_sources": [
            "Stakeholder conversations",
            "Interview transcripts",
            "Questionnaires",
            "Emails and meeting notes",
            "Existing requirement documents",
            "Banking policies and procedures",
            "Regulatory and compliance documents",
            "API and database specifications",
            "Legacy-system documentation",
            "Incident reports and audit findings",
        ],
        "multi_agent_architecture": _build_multi_agent_architecture(),
        "functional_requirements": functional,
        "non_functional_requirements": non_functional,
        "user_stories": _build_user_stories(candidates),
        "use_cases": _build_use_cases(candidates),
        "acceptance_criteria": _build_acceptance_criteria(candidates),
        "traceability_records": _build_traceability(candidates),
        "regulatory_mappings": _build_regulatory_mapping(candidates),
        "sdlc_recommendation": recommend_sdlc(candidates),
    }
    return result
