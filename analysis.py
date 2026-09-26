import re
from collections import Counter

CATEGORY_KEYWORDS = {
    "Business": ["business", "customer", "workflow", "process", "operational need", "service"],
    "Technical": ["api", "integration", "system", "database", "interface", "architecture", "legacy", "platform", "application"],
    "Security": ["security", "authentication", "authorization", "encryption", "identity", "access control", "secrets", "cyber", "malware", "vulnerability"],
    "Privacy": ["privacy", "personal data", "pii", "consent", "data minimization", "retention", "gdpr", "data subject"],
    "Compliance": ["compliance", "regulation", "sox", "basel", "ffiec", "aml", "kyc", "policy", "audit", "control", "governance"],
    "Performance": ["latency", "throughput", "response time", "performance", "scale", "capacity", "seamless"],
    "Availability": ["availability", "uptime", "backup", "recovery", "resilience", "fault tolerance", "disaster"],
    "Auditability": ["audit trail", "traceability", "evidence", "review", "approval", "logging", "checkpoint"],
    "Operational": ["maintenance", "support", "monitoring", "ops", "deployment", "incident", "runbook", "release"],
}

REGULATION_MAP = {
    "Security": ["NIST CSF", "ISO 27001", "SOC 2"],
    "Privacy": ["GDPR", "CCPA", "Data Protection Act"],
    "Compliance": ["SOX", "FFIEC", "Basel III", "AML/KYC policy"],
    "Technical": ["Enterprise architecture policy", "Legacy integration standards"],
    "Availability": ["Business continuity policy", "Disaster recovery standard"],
    "Auditability": ["Internal audit policy", "Approval governance checklist"],
}


DEFAULT_REQUIREMENTS = """The banking platform shall support secure customer onboarding for retail and business accounts.
The system shall enforce strong authentication and role-based access control for all staff and customers.
The application shall log all approval checkpoints, user actions, and exceptions for audit evidence.
The solution shall maintain privacy by minimizing collection of personal data and supporting consent workflows.
The platform shall deliver responsive performance and maintain 99.95% availability during business hours.
The service must comply with SOX, GDPR, and internal financial risk policies.
The team shall integrate with legacy core banking systems through secure APIs and controlled data mappings.
The release process shall include security review, regression testing, and human sign-off before production deployment."""


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
        if any(token in lower for token in ("shall", "must", "require", "requirement", "need", "policy")):
            candidates.append(_normalize_requirement(line))
    if not candidates:
        candidates = [
            _normalize_requirement(line)
            for line in DEFAULT_REQUIREMENTS.splitlines()
            if line.strip()
        ]
    return candidates


def _build_user_stories(requirements):
    stories = []
    for idx, req in enumerate(requirements[:5], start=1):
        role = ["Compliance officer", "Operations analyst", "Customer service agent", "Security engineer", "Banking product manager"][idx % 5]
        stories.append({
            "id": f"US-{idx:03d}",
            "story": f"As a {role}, I want {req.lower()} so that the financial service remains compliant and trustworthy.",
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
            "statement": f"Given a stakeholder requirement, when the system evaluates '{req}', then it must record the classification, evidence, and approval status before release.",
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
            ],
            "evidence": ["Signed approval record", "Compliance review note", "Retention log"],
        })
    return results


def recommend_sdlc(requirements):
    lower_text = " ".join(requirements).lower()
    categories = Counter()
    for req in requirements:
        category, _ = _classify_requirement(req)
        categories[category] += 1

    security_signal = categories.get("Security", 0) + categories.get("Compliance", 0) + categories.get("Privacy", 0)
    change_signal = 1 if any(word in lower_text for word in ["rapid", "agile", "frequent", "continuous", "new release"]) else 0
    complexity_signal = categories.get("Technical", 0) + categories.get("Operational", 0)

    if security_signal >= 3 and change_signal:
        model = "DevSecOps + Agile Hybrid"
        rationale = "The project carries strong security and compliance obligations while needing rapid iteration and continuous delivery."
        workflow = [
            "Discovery and stakeholder validation",
            "Threat and compliance review",
            "Sprint-based implementation with secure coding gates",
            "Automated testing and release checks",
            "Operational monitoring and evidence collection",
        ]
    elif security_signal >= 3:
        model = "V-Model with DevSecOps controls"
        rationale = "High regulatory sensitivity and verification requirements justify a model with explicit quality and compliance checkpoints."
        workflow = [
            "Requirements and risk analysis",
            "System design and policy mapping",
            "Implementation and secure testing",
            "Verification and compliance sign-off",
            "Deployment with audit evidence",
        ]
    elif complexity_signal >= 2 and change_signal:
        model = "Agile with compliance gates"
        rationale = "The solution is likely to evolve while still needing structured governance for financial controls."
        workflow = [
            "Sprint planning",
            "Requirements refinement",
            "Build and unit testing",
            "Security and compliance checkpoints",
            "Review and release",
        ]
    elif complexity_signal >= 2:
        model = "Spiral"
        rationale = "The initiative combines system complexity and risk-driven design, suggesting iterative risk assessment and controlled prototyping."
        workflow = [
            "Risk analysis",
            "Prototype and design",
            "Evaluation and refinement",
            "Build and validation",
            "Operational deployment",
        ]
    else:
        model = "Waterfall with governance reviews"
        rationale = "The requirement set is reasonably stable and easier to scope in a structured sequential lifecycle."
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
        if any(keyword in req.lower() for keyword in ["shall", "must", "require", "need"]) and category not in ["Security", "Compliance", "Privacy", "Performance", "Availability", "Auditability", "Operational"]:
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
