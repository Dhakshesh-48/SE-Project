from analysis import analyze_requirements_text


def test_analyze_requirements_produces_expected_sections():
    sample = """The system shall support secure onboarding for retail banking customers.
The platform must enforce role-based access control and audit logging for all user actions.
The application must maintain 99.95% availability and low response latency.
The solution shall comply with SOX and GDPR while protecting customer privacy.
"""

    result = analyze_requirements_text(sample)

    assert result["summary"]["total_requirements"] >= 4
    assert "functional_requirements" in result
    assert "non_functional_requirements" in result
    assert "sdlc_recommendation" in result
    assert "model" in result["sdlc_recommendation"]
    assert "workflow" in result["sdlc_recommendation"]
