# Financial Requirements & SDLC Recommendation System

This project is a lightweight prototype for an agentic AI-assisted requirements analysis system for financial institutions. It allows users to paste stakeholder requirements or policy notes, then automatically classifies them, maps them to controls and regulations, and recommends an appropriate SDLC model.

## Features

- Requirement intake from user-entered text
- Classification across business, technical, security, privacy, compliance, performance, availability, auditability, and operational concerns
- Structured output: functional requirements, non-functional requirements, user stories, use cases, acceptance criteria, and traceability records
- Regulation/control mapping for common financial domains
- SDLC recommendation with rationale and workflow plan

## Run locally

```bash
cd "E:\SE\SE-Project"
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000

## Project structure

- `app.py` – Flask app entry point
- `analysis.py` – requirement analysis and SDLC recommendation engine
- `templates/` – UI pages
- `static/` – stylesheets
- `tests/` – verification tests
