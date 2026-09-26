from analysis import analyze_requirements_text


def test_analyze_requirements_matches_financial_agentic_system_requirements():
    sample = """The system shall support digital banking and payment processing for retail and business customers.
The platform must enforce role-based access control, strong authentication, and audit logging for all user actions.
The application must maintain 99.95% availability, low response latency, and secure API integration with legacy banking systems.
The solution shall comply with SOX, GDPR, AML/KYC controls, and internal governance policies while protecting customer privacy.
"""

    result = analyze_requirements_text(sample)

    assert result["summary"]["total_requirements"] >= 4
    assert any("Digital banking" in item for item in result["project_scope"])
    assert any(agent["agent"] == "Coordinator agent" for agent in result["multi_agent_architecture"])
    assert "functional_requirements" in result
    assert "non_functional_requirements" in result
    assert "sdlc_recommendation" in result
    assert "model" in result["sdlc_recommendation"]
    assert "workflow" in result["sdlc_recommendation"]
    assert result["sdlc_recommendation"]["workflow"]
