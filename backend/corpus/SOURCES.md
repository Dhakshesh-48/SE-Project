# RAG Corpus and Skill Source Report

Retrieved: 2026-08-30. Only `docs/ingested/**/*.{txt,md,yaml}` is indexed. Original PDF, DOCX, and HTML files are retained beside mechanically extracted text. SHA-256 hashes for every retained and indexed file are in `CORPUS_SHA256.txt`.

## Documents used by the RAG

| Publisher | Document | Local evidence | Source | Use |
| --- | --- | --- | --- | --- |
| Project stakeholder | Problem Statement | `docs/ingested/user/problem-statement.docx` and `.txt` | User attachment | Project scope and expected outputs |
| NASA | NASA Systems Engineering Handbook, Rev. 2 | `docs/ingested/requirements/nasa-systems-engineering-handbook.pdf` and `.txt` | https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf | Requirements quality, verification, validation, traceability |
| NASA | HDTN Software Requirements Specification, TM-20240011318 | `docs/ingested/requirements/nasa-hdtn-software-requirements-specification.pdf` and `.txt` | https://ntrs.nasa.gov/api/citations/20240011318/downloads/TM-20240011318.pdf | Human-authored, complete SRS example |
| World Bank | AU R-IMS Software Requirements Specification | `docs/ingested/requirements/world-bank-au-rims-srs.pdf` and `.txt` | https://documents1.worldbank.org/curated/en/217291613166071773/pdf/Appendix-2-Software-Requirements-Specification.pdf | Institutional SRS with business and finance use cases |
| Atlassian | Product requirements document template | `docs/ingested/product/atlassian-product-requirements-template.html` and `.txt` | https://www.atlassian.com/software/confluence/templates/product-requirements | PRD structure, objectives, assumptions, stories, metrics |
| Reserve Bank of India | KYC Master Direction (consolidated through 2024) | `docs/ingested/finance/rbi-kyc-master-direction-2024.pdf` and `.txt` | https://www.rbi.org.in/commonman/Upload/English/Notification/PDFs/MD18KYCF6E92C82E1E1419D87323E3869BC9F13.pdf | KYC requirements for in-scope RBI-regulated entities |
| Reserve Bank of India | KYC Amendment Directions, 2025 | `docs/ingested/finance/rbi-kyc-amendment-2025.html` and `.txt` | https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=12866 | Current amendment evidence; applicability still requires review |
| Reserve Bank of India | IT Governance, Risk, Controls and Assurance Practices, 2023 | `docs/ingested/finance/rbi-it-governance-2023.html` and `.txt` | https://systemhealth.rbi.org.in/Scripts/BS_ViewMasDirections.aspx_id%3D12562%283%29.html | IT governance, assurance, resilience, audit controls |
| Reserve Bank of India | Digital Payment Security Controls, 2021 | `docs/ingested/finance/rbi-digital-payment-security-controls-2021.html` and `.txt` | https://systemhealth.rbi.org.in/Scripts/BS_ViewMasDirections.aspx_id%3D12032%283%29.html | Payment security requirements |
| Reserve Bank of India | Outsourcing of Information Technology Services, 2023 | `docs/ingested/finance/rbi-outsourcing-it-services-2023.html` and `.txt` | https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=12486&Mode=0&fn=14 | Third-party and outsourcing requirements |
| SEBI | Cybersecurity and Cyber Resilience Framework, 2024 | `docs/ingested/finance/sebi-cscrf-2024.pdf` and `.txt` | https://www.sebi.gov.in/sebi_data/attachdocs/aug-2024/1724326790365.pdf | Cyber controls for applicable SEBI-regulated entities |
| Open Banking Limited | Read/Write Data API Specification | `docs/ingested/finance/open-banking/` | https://github.com/OpenBankingUK/read-write-api-specs/tree/8e68cb507b2362d894ab711691fe913201319ff9 | Account, payment, funds-confirmation, and VRP interface contracts |
| ISO 20022 | Compliance Checklist | `docs/ingested/finance/iso-20022-compliance-checklist.pdf` and `.txt` | https://www.iso20022.org/sites/default/files/media/file/ISO20022_ComplianceChecklist.pdf | Payment-message conformance checks |
| BIAN | Service Landscape V9, Value Chain View | `docs/ingested/finance/bian-service-landscape-v9.pdf` and `.txt` | https://bian.org/wp-content/uploads/2024/12/BIAN-Service-Landscape-V9_0-Value-Chain-View.pdf | Banking capability vocabulary and bounded-context discovery |
| NIST | Cybersecurity Framework 2.0 | `docs/ingested/security/nist-csf-2.0.pdf` and `.txt` | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf | Cybersecurity outcomes and governance |
| NIST | AI Risk Management Framework 1.0 | `docs/ingested/security/nist-ai-rmf-1.0.pdf` and `.txt` | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf | AI risk, governance, measurement, and oversight |
| OWASP | Top 10 for LLM Applications 2025 | `docs/ingested/security/owasp-llm-top-10-2025.pdf` and `.txt` | https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf | Prompt injection, data disclosure, excessive agency, and RAG risks |

## Prompt and skill sources

| Publisher | Material copied or ingested | Local evidence | Source / license | Application |
| --- | --- | --- | --- | --- |
| GitHub | Spec Kit templates plus `specify`, `clarify`, and `analyze` command prompts; commit `51e52be6c3b26fed3ff5424c671f4a559519a759` | `docs/ingested/spec-kit/` | https://github.com/github/spec-kit/tree/51e52be6c3b26fed3ff5424c671f4a559519a759 — MIT license retained | User-scenario-first specification, maximum-impact clarification, consistency checks |
| Suzgun & Kalai | Meta-prompting prompts and repository documentation; commit `40422564938d772c3e3e6b9614b1df48b8dd6a08` | `docs/ingested/prompting/meta-prompting-*` and `expert-generic-instruction.txt` | https://github.com/suzgunmirac/meta-prompting/tree/40422564938d772c3e3e6b9614b1df48b8dd6a08 — MIT license retained | Decomposition into evidence, synthesis, and independent review |
| HubSpot-hosted webinar | Agent Prompt Optimization Webinar | `docs/ingested/prompting/hubspot-agent-prompt-optimization.pdf` and `.txt` | https://20083050.fs1.hubspotusercontent-na2.net/hubfs/20083050/Agent%20Prompt%20Optimization%20Webinar.pdf | Prompt evaluation and meta-prompting guidance |

The runtime skill is `skills/finance-requirements-document/SKILL.md`. It points to the retained Spec Kit material instead of reproducing a second synthetic framework.

## Exclusions and limitations

- The previous model-generated finance templates, samples, regulatory catalog, and SDLC scoring model were removed from the indexed corpus.
- `meta-prompting.com` was not ingested because the site could not be reliably retrieved or verified during this run. The published MIT research repository and HubSpot-hosted webinar are used instead.
- FATF material was identified but its publisher blocked automated retrieval (HTTP 403); it was not copied or represented as ingested.
- Publisher documents are evidence, not automatic proof of legal applicability. Jurisdiction, entity scope, amendments, and legal interpretation require an authorised reviewer.
