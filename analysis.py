"""Deterministic interview, requirement analysis and SDLC decision engine."""
from __future__ import annotations
import hashlib, math, re
from collections import Counter
from typing import Any

INITIAL_LOAN_STATEMENT = "The loan application should be processed quickly and customer information must be secure."
DEMO_CASES = {
 "loan": {"name":"Loan Processing System","statement":INITIAL_LOAN_STATEMENT},
 "banking": {"name":"Digital Banking","statement":"Customers need a reliable digital banking service for balances and transfers, with strong protection against account takeover."},
 "payments": {"name":"Payment Processing","statement":"The payment platform must process merchant transactions reliably, prevent duplicate charges, and protect payment information."},
 "fraud": {"name":"Fraud Detection","statement":"The bank needs to identify suspicious transactions quickly while minimizing false alarms and protecting customer data."},
}
GAPS = [
 ("performance","Performance",100,"What is the maximum acceptable processing time for the loan application?","The word ‘quickly’ is not measurable."),
 ("actors","Stakeholder",94,"Who are the users involved in the loan application process?","User roles and responsibilities are unknown."),
 ("data","Data",92,"What customer information will the system collect or store?","Sensitive information must be identified before assessing privacy safeguards."),
 ("workflow","Functional",88,"What are the main steps from submitting an application to making a decision, including any rejection or exception path?","The workflow and exception paths are not known."),
 ("authentication","Security",87,"How should each user authenticate, and is multi-factor authentication required?","Authentication expectations are not specified."),
 ("authorization","Security",85,"Which roles may view, change, and approve an application, and should access be restricted by need-to-know?","Authorization and access boundaries are unknown."),
 ("encryption","Security",83,"What protection is required for sensitive information while it is transmitted and stored?","The word ‘secure’ does not define safeguards."),
 ("jurisdiction","Compliance",81,"Which countries or jurisdictions will the service operate in, and which approved regulations or internal policies apply?","Compliance applicability depends on jurisdiction and approved sources."),
 ("retention","Privacy",78,"How long should application data and decision records be retained, and what should happen when the retention period ends?","Retention and deletion rules are unknown."),
 ("availability","Availability",75,"What availability target and recovery time are required, including during an outage?","Availability and recovery needs are not measurable."),
 ("audit","Auditability",74,"Which actions and decision changes must be recorded for audit, and who may review those records?","Auditability expectations are not defined."),
 ("integrations","Integration",70,"Which existing systems or external services must the application integrate with?","Integration boundaries and legacy constraints are unknown."),
 ("operations","Operational",66,"Who will operate and support the service, and what monitoring or incident response is required?","Operational ownership and support requirements are missing."),
 ("constraints","Business",62,"What are the most important delivery constraints, such as budget, target date, expected change frequency, or stakeholder availability?","Project constraints inform scope and lifecycle selection."),
 ("risk","Business",58,"What would be the most serious consequence of an incorrect or delayed loan decision?","Business impact and risk tolerance need confirmation."),
]
PATTERNS = {
"performance":r"\b(\d+\s*(?:ms|milliseconds?|seconds?|secs?|minutes?|mins?)|p\d{2}|throughput|requests? per second|not applicable)\b",
"actors":r"\b(customers?|borrowers?|loan officers?|underwriters?|administrators?|admins?|agents?|merchants?|analysts?|staff|users?|roles?|n/?a|not applicable)\b",
"data":r"\b(name|address|pan|aadhaar|ssn|date of birth|income|bank account|financial information|pii|personal data|customer data|data fields|not applicable)\b",
"workflow":r"\b(submit.{0,100}(?:approve|reject|decision)|(?:approve|reject|decision).{0,100}submit|exception|manual review|workflow|process steps|not applicable)\b",
"authentication":r"\b(password|otp|one.time|mfa|multi.factor|biometric|sso|authentication|passkey|not applicable)\b",
"authorization":r"\b(permission|authorize|authorization|access control|least[ -]privilege|need.to.know|not applicable)\b",
"encryption":r"\b(encrypt|encryption|tls|https|at rest|in transit|tokeniz|mask|not applicable)\b",
"jurisdiction":r"\b(\bUS\b|\bUSA\b|\bUK\b|\bEU\b|\bIndia\b|\bCanada\b|jurisdiction|regulation|policy|compliance|not sure|not applicable)\b",
"retention":r"\b(retain|retention|delete|deletion|years?|months?|days?|archive|not applicable)\b",
"availability":r"\b(99(?:\.\d+)?\s*%|uptime|availability|recovery|rto|rpo|backup|failover|not applicable)\b",
"audit":r"\b(audit|log|logging|record|evidence|trace|not applicable)\b",
"integrations":r"\b(api|integrat|legacy|core banking|credit bureau|payment gateway|external system|none|not applicable)\b",
"operations":r"\b(monitor|support|operate|incident|on.call|deployment|release|runbook|operations|not applicable)\b",
"constraints":r"\b(budget|deadline|date|weeks?|months?|sprint|continuous|change|stable|not applicable)\b",
"risk":r"\b(loss|fraud|impact|risk|harm|failure|incorrect|delayed|not applicable)\b"}
KEYWORDS={
"Business":("business","customer","workflow","loan","payment","fraud","objective","decision"),"Stakeholder":("customer","borrower","officer","underwriter","user","role","stakeholder"),"Functional":("submit","approve","reject","process","decision","application","shall","must"),"Technical":("api","integration","system","database","interface","legacy","platform"),"Security":("security","authentication","authorization","encryption","access","mfa","secure","permission"),"Privacy":("privacy","personal data","pii","consent","retention","delete","aadhaar","pan"),"Compliance":("compliance","regulation","policy","audit","control","jurisdiction","legal"),"Performance":("latency","throughput","response time","performance","seconds","quickly","fast"),"Availability":("availability","uptime","backup","recovery","resilience","failover"),"Auditability":("audit trail","traceability","evidence","approval","logging","audit","record"),"Data":("data","name","address","income","bank account","customer information","aadhaar","pan"),"Integration":("api","integration","legacy","core banking","external service"),"Operational":("maintenance","support","monitoring","deployment","incident","operations"),"Usability":("accessible","usability","mobile","easy to use","language")}

def classify_requirement(text:str)->list[str]:
 low=text.lower(); scores={c:sum(k in low for k in keys) for c,keys in KEYWORDS.items()}
 return [c for c,s in sorted(scores.items(),key=lambda x:(-x[1],x[0])) if s] or ["Functional"]

def _covered(project:dict[str,Any])->set[str]:
 msgs=project.get("messages",[])
 answers=" ".join(m.get("content","") for m in msgs if m.get("role")=="user" and m.get("metadata",{}).get("kind")!="initial_statement")
 statement=project.get("initial_statement","")
 found={k for k,p in PATTERNS.items() if re.search(p,answers,re.I)}
 for k in ("performance","authentication","authorization","encryption","jurisdiction","retention","availability","audit","integrations","operations","constraints","risk"):
  if re.search(PATTERNS[k],statement,re.I): found.add(k)
 return found

def choose_next_question(project:dict[str,Any])->dict[str,Any]|None:
 covered=_covered(project); open_gaps=[g for g in GAPS if g[0] not in covered]
 if not open_gaps:return None
 text=project.get("initial_statement","").lower()
 name=project.get("name",""); project_name=name.lower()
 selected=next((g for g in open_gaps if g[0]=="performance"),None) if any(w in text for w in ("quick","fast","rapid","low latency","slow","response time")) else None
 if selected is None and "loan" in project_name:
  # Actors and sensitive data unblock nearly all downstream workflow/security decisions.
  next_topic=next((key for key in ("actors","data","workflow") if key not in covered),None)
  selected=next((g for g in open_gaps if g[0]==next_topic),None)
 selected=selected or max(open_gaps,key=lambda g:g[2]+(10 if g[1]=="Security" and "secure" in text else 0))
 prompt=selected[3]
 if "loan" not in project_name:
  prompts={"performance":f"What is the maximum acceptable response time for {name or 'the system'} to complete its primary customer operation?","actors":f"Which users, staff, or systems are involved in the {name or 'service'} workflow, and what are their roles?","data":"What customer, account, or transaction information will the system collect or process?","workflow":f"What are the main steps in the {name or 'service'} workflow, including failed or exceptional outcomes?","authentication":"How should customers and staff authenticate, and is multi-factor authentication required?","authorization":"Which customer, staff, and service roles may view or change records, and what access restrictions apply?","encryption":"What protection is required for sensitive information while it is transmitted and stored?"}
  prompt=prompts.get(selected[0],prompt)
 return {"key":selected[0],"category":selected[1],"priority":selected[2],"prompt":prompt,"why":selected[4]}

def maturity_assessment(project:dict[str,Any])->dict[str,Any]:
 covered=_covered(project); groups={"Business":{"risk","constraints"},"Stakeholder":{"actors"},"Functional":{"workflow"},"Security":{"authentication","authorization","encryption"},"Privacy":{"data","retention"},"Compliance":{"jurisdiction"},"Performance":{"performance"},"Availability":{"availability"},"Auditability":{"audit"},"Data":{"data"},"Integration":{"integrations"},"Operational":{"operations"}}
 categories={c:{"complete":need<=covered,"progress":round(100*len(need&covered)/len(need)),"covered":sorted(need&covered),"required":sorted(need)} for c,need in groups.items()}
 unresolved=[m["content"] for m in project.get("messages",[]) if m.get("role")=="user" and re.search(r"\b(not sure|unknown|tbd|don't know)\b",m["content"],re.I)]
 return {"categories":categories,"covered_gap_count":len(covered),"total_gap_count":len(PATTERNS),"progress":round(100*len(covered)/len(PATTERNS)),"sufficiently_complete":not any(not c["complete"] for c in categories.values()),"blockers":[k for k,v in categories.items() if not v["complete"]],"unresolved_items":unresolved,"status":"complete" if not any(not c["complete"] for c in categories.values()) else "in_progress"}

def embedding(text:str,dimensions:int=256)->list[float]:
 """Local word and bigram hashed embedding; deterministic and privacy-preserving."""
 v=[0.0]*dimensions; tokens=re.findall(r"[a-z0-9]+",text.lower()); terms=tokens+[a+"_"+b for a,b in zip(tokens,tokens[1:])]
 for term in terms:
  d=hashlib.sha256(term.encode()).digest(); v[int.from_bytes(d[:4],"big")%dimensions]+=1 if d[4]%2 else -1
 norm=math.sqrt(sum(x*x for x in v)) or 1
 return [round(x/norm,6) for x in v]
def cosine_similarity(a:list[float],b:list[float])->float:
 score=sum(x*y for x,y in zip(a,b))
 return 1.0 if score>0.99999 else round(score,6)

def build_requirements(project:dict[str,Any])->list[dict[str,Any]]:
 answers=[m["content"] for m in project.get("messages",[]) if m.get("role")=="user" and m.get("metadata",{}).get("kind")!="initial_statement"]
 reqs=[]
 for key,category,priority,prompt,why in GAPS:
  answer=next((a for a in answers if re.search(PATTERNS[key],a,re.I)),None)
  if not answer:continue
  if key=="performance":
   match=re.search(r"\b(\d+)\s*(seconds?|secs?|milliseconds?|ms|minutes?|mins?)\b",answer,re.I)
   statement=f"The system shall provide an initial loan application decision within {match.group(1)} {match.group(2)}." if match else f"The system shall meet this performance expectation: {answer}."
  elif key=="actors":statement=f"The system shall support the following application actors and roles: {answer}."
  elif key=="data":statement=f"The system shall collect and process only the stakeholder-approved application information: {answer}."
  elif key=="workflow":statement=f"The system shall support the application workflow and exception handling described by the stakeholder: {answer}."
  else:statement=f"The system shall satisfy the stakeholder's {category.lower()} requirement: {answer}."
  cats=classify_requirement(statement); amb=bool(re.search(r"\b(quickly|fast|secure|appropriate|as needed|etc\.?|soon)\b",statement,re.I)); rid=f"REQ-{len(reqs)+2:03d}"
  reqs.append({"id":rid,"statement":statement,"type":"Non-functional" if category in {"Security","Privacy","Compliance","Performance","Availability","Auditability","Operational"} else "Functional","categories":cats,"source_stakeholder":"Stakeholder interview","original_statement":answer,"business_justification":why,"priority":"Critical" if category in {"Security","Compliance","Performance"} else "High","dependencies":[],"assumptions":[],"acceptance_criteria":[f"Given approved project conditions, when evaluated against {rid}, then the requirement is demonstrably satisfied."],"applicable_regulations":[],"risk_level":"High" if category in {"Security","Compliance","Privacy"} else "Medium","security_impact":"Review required" if "Security" in cats or "Data" in cats else "Not identified","privacy_impact":"Review required" if "Privacy" in cats or "Data" in cats else "Not identified","confidence_score":.58 if amb else .82,"quality":{"ambiguity":"Needs review" if amb else "No material ambiguity detected","completeness":"Partial" if key in {"workflow","data","actors"} else "Good","consistency":"No contradiction identified","duplication":"Not duplicated","feasibility":"Requires technical review","testability":"Testable" if bool(re.search(r"\d|shall (?:log|retain|encrypt|authenticate|restrict|provide|support)",statement,re.I)) else "Needs measurable criteria","undefined_terminology":[w for w in ("quickly","secure","appropriate") if w in statement.lower()]},"approval_status":"pending"})
 initial=project.get("initial_statement","")
 if initial:
  reqs.insert(0,{"id":"REQ-001","statement":f"The system shall process loan applications and protect customer information: {initial}","type":"Business","categories":["Business","Functional","Security"],"source_stakeholder":"Project sponsor","original_statement":initial,"business_justification":"Original stakeholder need.","priority":"High","dependencies":[],"assumptions":[],"acceptance_criteria":["The approved workflow is demonstrated end-to-end and customer information is protected by approved controls."],"applicable_regulations":[],"risk_level":"High","security_impact":"Review required","privacy_impact":"Review required","confidence_score":.65,"quality":{"ambiguity":"Needs review: ‘quickly’ and ‘secure’ are undefined.","completeness":"Partial","consistency":"No contradiction identified","duplication":"Not duplicated","feasibility":"Requires technical review","testability":"Needs measurable criteria","undefined_terminology":["quickly","secure"]},"approval_status":"pending"})
  for i,r in enumerate(reqs,1):r["id"]=f"REQ-{i:03d}"; r["acceptance_criteria"]=[x.replace("REQ-001",r["id"]) for x in r["acceptance_criteria"]]
 return reqs

def detect_conflicts(requirements:list[dict[str,Any]])->list[dict[str,Any]]:
  conflicts=[]
  topics={"loan":r"\bloan\b","transaction":r"\btransaction\b","customer":r"\bcustomer\b","account":r"\baccount\b","application":r"\bapplication\b","decision":r"\bdecision\b","identity":r"\b(?:aadhaar|pan|identity)\b"}
  for index,left in enumerate(requirements):
    for right in requirements[index+1:]:
      a,b=left["statement"].lower(),right["statement"].lower()
      opposite=("delete" in a and "retain" in b) or ("retain" in a and "delete" in b)
      same_topic=any(re.search(pattern,a) and re.search(pattern,b) for pattern in topics.values())
      if opposite and same_topic and re.search(r"\d+\s*(?:years?|months?|days?)",a+b):
        conflicts.append({"id":f"CON-{len(conflicts)+1:03d}","requirements":[left["id"],right["id"]],"description":"Deletion and retention expectations may apply to overlapping financial records.","why":"Lifecycle rules may require both deletion and retention for the same data.","impact":"Potential privacy, legal-hold, and recordkeeping breach.","recommended_question":"Which record types are subject to deletion versus mandatory retention, and who approves the policy?","resolution_status":"open"})
  for requirement in requirements:
    text=requirement["statement"].lower()
    if not ("delete" in text and "retain" in text and re.search(r"\d+\s*(?:years?|months?|days?)",text)):
      continue
    clauses=re.split(r"\b(?:and|but)\b|[;]",text)
    retained=[clause for clause in clauses if "retain" in clause]
    deleted=[clause for clause in clauses if "delete" in clause]
    same_lifecycle=any(re.search(pattern,keep) and re.search(pattern,remove) for pattern in topics.values() for keep in retained for remove in deleted)
    if same_lifecycle:
      conflicts.append({"id":f"CON-{len(conflicts)+1:03d}","requirements":[requirement["id"]],"description":"A single requirement contains potentially overlapping deletion and retention rules.","why":"The same record type may be subject to contradictory lifecycle periods.","impact":"Potential privacy, legal-hold, and recordkeeping breach.","recommended_question":"Are the deletion and retention periods for the same record type? Which approved policy governs the lifecycle?","resolution_status":"open"})
  return conflicts

def build_artifacts(reqs:list[dict[str,Any]])->dict[str,Any]:
 stories=[]; uses=[]; ac=[]; trace=[]
 for i,r in enumerate(reqs,1):
  sid=f"US-{i:03d}"; uid=f"UC-{i:03d}"; role="loan officer" if "decision" in r["statement"].lower() else "customer"
  stories.append({"id":sid,"requirement_id":r["id"],"story":f"As a {role}, I want {r['statement'][0].lower()+r['statement'][1:]} so that the loan process is safe and effective."})
  uses.append({"id":uid,"requirement_id":r["id"],"name":f"Meet {r['categories'][0].lower()} requirement","description":r["statement"],"actors":[role],"preconditions":["User is authenticated and authorized."],"main_flow":["User initiates the action.","System applies the approved requirement.","System records the outcome."],"exceptions":["Invalid or unauthorized request is rejected and logged."]})
  ac.extend({"id":f"AC-{i:03d}-{n}","requirement_id":r["id"],"statement":v} for n,v in enumerate(r["acceptance_criteria"],1))
  trace.append({"id":f"TR-{i:03d}","source":r["source_stakeholder"],"original_statement":r["original_statement"],"requirement_id":r["id"],"evidence":[],"user_story_id":sid,"acceptance_criteria_ids":[x["id"] for x in ac if x["requirement_id"]==r["id"]],"validation":"Pending human validation"})
 return {"functional_requirements":[r for r in reqs if r["type"]=="Functional"],"non_functional_requirements":[r for r in reqs if r["type"]!="Functional"],"user_stories":stories,"use_cases":uses,"acceptance_criteria":ac,"traceability_records":trace,"srs":{"title":"Software Requirements Specification","purpose":"Document approved scope, requirements, constraints, and verification criteria.","requirements":reqs,"assumptions":["Regulatory applicability requires confirmation by an authorized compliance officer."],"open_issues":[r["id"] for r in reqs if r["approval_status"]!="approved"]},"risk_register":[{"id":f"RISK-{i:03d}","requirement_id":r["id"],"risk":f"Unverified implementation of {r['categories'][0].lower()} requirement","likelihood":"Medium","impact":r["risk_level"],"mitigation":"Independent review, evidence-backed testing, and authorized approval."} for i,r in enumerate(reqs,1)],"data_requirements":[{"requirement_id":r["id"],"statement":r["statement"]} for r in reqs if "Data" in r["categories"] or "Privacy" in r["categories"]],"interface_requirements":[{"requirement_id":r["id"],"statement":r["statement"]} for r in reqs if "Integration" in r["categories"]],"compliance_control_matrix":[]}

def recommend_sdlc(project:dict[str,Any],reqs:list[dict[str,Any]])->dict[str,Any]:
 text=" ".join([project.get("initial_statement","")]+[m.get("content","") for m in project.get("messages",[])]).lower(); has=lambda *words:any(w in text for w in words)
 factors={"requirement_stability":"High" if has("stable","fixed scope","rarely change") else "Medium","change_frequency":"High" if has("frequent","rapidly","continuous","weekly","often change") else "Medium","regulatory_criticality":"High" if any("Compliance" in r["categories"] for r in reqs) else "Medium","security_risk":"Very High" if any("Security" in r["categories"] for r in reqs) else "Medium","technical_uncertainty":"High" if has("uncertain","prototype","unknown") else "Medium","system_size_complexity":"High" if len(reqs)>=8 or has("enterprise","high volume") else "Medium","legacy_dependency":"High" if has("legacy","core banking","existing system") else "Low","continuous_delivery":"Required" if has("continuous delivery","continuous deployment","frequent release") else "Not specified","stakeholder_availability":"Medium" if "stakeholder" in text else "Unknown","testing_documentation":"High" if has("audit","test","compliance","regulat") else "Medium","budget_schedule":"Not specified","formal_verification":"High" if has("formal verification","regulat","audit") else "Medium","failure_consequence":"High" if has("financial loss","fraud","incorrect decision","customer harm") else "Medium"}
 weights={"security_risk":20,"regulatory_criticality":18,"change_frequency":14,"technical_uncertainty":12,"formal_verification":12,"system_size_complexity":8,"continuous_delivery":8,"requirement_stability":8}; models={"Agile + DevSecOps":0,"V-Model":0,"Spiral":0,"Waterfall":0,"Agile":0,"DevSecOps":0}
 per={"security_risk":{"Agile + DevSecOps":1,"V-Model":.9,"DevSecOps":1,"Spiral":.7},"regulatory_criticality":{"Agile + DevSecOps":.95,"V-Model":1,"Spiral":.7,"Waterfall":.8,"DevSecOps":.9},"change_frequency":{"Agile + DevSecOps":1,"Agile":1,"DevSecOps":.8,"Spiral":.6,"V-Model":.3,"Waterfall":.2},"technical_uncertainty":{"Spiral":1,"Agile + DevSecOps":.8,"Agile":.8,"V-Model":.6,"Waterfall":.3},"formal_verification":{"V-Model":1,"Agile + DevSecOps":.8,"Waterfall":.8,"Spiral":.7,"Agile":.5,"DevSecOps":.7},"system_size_complexity":{"Agile + DevSecOps":.9,"Spiral":.8,"V-Model":.8,"DevSecOps":.8,"Waterfall":.7,"Agile":.7},"continuous_delivery":{"Agile + DevSecOps":1,"DevSecOps":1,"Agile":.8,"V-Model":.4,"Waterfall":.2,"Spiral":.5},"requirement_stability":{"Waterfall":1,"V-Model":.8,"Agile + DevSecOps":.6,"Spiral":.5,"Agile":.4,"DevSecOps":.5}}
 for factor,w in weights.items():
  value=factors[factor]; mult=1 if value in {"High","Very High","Required"} else .65 if value=="Medium" else .3
  for m in models:models[m]+=w*per[factor].get(m,0)*mult
 ranking=sorted([{"model":m,"score":round(v),"confidence":round(min(.96,.65+v/300),2)} for m,v in models.items()],key=lambda x:x["score"],reverse=True)
 phases=[("Discovery & requirements","Business Analyst","Approved scope and interview","Versioned SRS, requirement baseline","Data classification and privacy review","Acceptance/completeness testing","Evidence applicability review","Product Owner and Compliance sign-off"),("Architecture & threat modeling","Architect, Security Analyst","Approved requirements","Architecture, threat model, control mapping","Threat model and architecture review","Abuse-case test planning","Validate controls against evidence","Architecture and Security approval"),("Iterative implementation","Engineering, DevSecOps","Traceable backlog","Secure incremental builds","Secure coding, SAST, dependency and secret scan","Unit, API and transaction-integrity tests","Automated policy gates and evidence","Sprint review and change approval"),("Independent verification","QA, Security Tester","Build and acceptance criteria","Test reports and risk register","DAST, penetration and vulnerability tests","Performance, resilience, recovery, regression","Independent evidence verification","QA and Security approval"),("Compliance and release approval","Compliance, Legal, Risk","Validated increment and evidence","Approved release package and RTM","Security sign-off and remediation closure","UAT and readiness testing","Obligations and evidence completeness","Compliance, Risk and Product approval"),("Deployment & operations","SRE, Operations","Approved release package","Monitored service and runbooks","Monitoring, incident response, access review","Canary, rollback, disaster recovery","Retain audit evidence and review controls","Production readiness/change approval")]
 workflow=[{"phase":p,"activities":["Perform phase activities and retain traceable evidence","Review risks, dependencies, and open issues"],"roles":r.split(", "),"inputs":i,"outputs":o,"security_activities":s,"testing_activities":t,"compliance_checkpoints":c,"human_approval_gates":a,"entry_criteria":"Prior phase exit criteria met; required inputs approved.","exit_criteria":"Deliverables reviewed, high risks dispositioned, traceability updated.","traceability_requirements":"Link deliverables, changes, tests, and evidence to source requirement IDs."} for p,r,i,o,s,t,c,a in phases]
 winner=ranking[0]["model"]
 return {"recommended_model":winner,"model":winner,"confidence":ranking[0]["confidence"],"ranking":ranking,"factors":factors,"rationale":"This financial-sector project combines sensitive customer information and compliance evidence needs with a need for iterative feedback. Agile + DevSecOps embeds security and auditable checks in each increment while retaining independent validation and approval gates.","second_best_not_selected":f"{ranking[1]['model']} ranks lower because it provides less balance across this project's weighted factors.","risks":["Unverified regulatory interpretations need compliance approval.","Rapid delivery can weaken evidence unless gates are enforced.","Retention conflicts require authorized resolution."],"conditions_for_alternative":"Prefer V-Model if scope is stable and formal verification dominates; Spiral if technical uncertainty dominates; Waterfall only if requirements are stable and changes tightly governed.","workflow":workflow}

def analyze_requirements_text(raw_text:str)->dict[str,Any]:
 lines=[re.sub(r"\s+"," ",x).strip(" -*\t") for x in raw_text.splitlines() if x.strip()] or [INITIAL_LOAN_STATEMENT]
 reqs=[{"id":f"REQ-{i:03d}","statement":line,"type":"Functional" if any(k in line.lower() for k in ("must","shall")) else "Non-functional","categories":classify_requirement(line),"source_stakeholder":"Stakeholder","original_statement":line,"business_justification":"Imported requirement","priority":"High","dependencies":[],"assumptions":[],"acceptance_criteria":[f"Verify: {line}"],"applicable_regulations":[],"risk_level":"High" if any(k in line.lower() for k in ("security","compliance")) else "Medium","security_impact":"Review required","privacy_impact":"Review required","confidence_score":.7,"approval_status":"pending"} for i,line in enumerate(lines,1)]
 out=build_artifacts(reqs); out["summary"]={"total_requirements":len(reqs),"categories":dict(Counter(c for r in reqs for c in r["categories"])),"risk_level":"High" if any(r["risk_level"]=="High" for r in reqs) else "Medium"}; out["project_scope"]=["Digital banking","Loan origination","Payment processing","Fraud detection","Customer onboarding","Regulatory reporting"]; out["stakeholders"]=["Customers","Business analysts","Product owners","Architects","Security teams","Compliance officers","Risk teams","Operations","Auditors"]; out["input_sources"]=["Stakeholder interviews","Approved policy documents","Regulatory evidence","Legacy-system documentation"]
 agents=[("Coordinator agent","Orchestrates specialists and approval gates."),("Stakeholder interaction agent","Conducts adaptive one-question interviews."),("Requirement extraction agent","Extracts source-linked requirements."),("Clarification agent","Prioritizes missing or ambiguous information."),("Classification agent","Assigns multi-label classifications."),("Conflict detection agent","Flags contradictions for human resolution."),("Compliance agent","Maps retrieved evidence and escalates unsupported claims."),("Security & privacy agent","Analyzes access, authentication, data protection and privacy."),("Risk analysis agent","Assesses business and delivery risks."),("Validation agent","Assesses completeness, consistency and testability."),("Traceability agent","Links sources, evidence, requirements, stories and tests."),("SDLC selection agent","Ranks lifecycle options using deterministic MCDA."),("Documentation agent","Builds SRS and related artifacts.")]; out["multi_agent_architecture"]=[{"agent":a,"responsibility":b} for a,b in agents]; out["traceability_records"]=[{"id":f"TR-{i:03d}","source":"Stakeholder input","category":r["categories"][0],"status":"Pending human validation","requirement":r["statement"],"requirement_id":r["id"]} for i,r in enumerate(reqs,1)]; out["regulatory_mappings"]=[{"requirement":r["statement"],"category":r["categories"][0],"regulations":[],"controls":[],"evidence":[],"evidence_notice":"No supporting evidence was found in the configured knowledge base."} for r in reqs]; out["sdlc_recommendation"]=recommend_sdlc({"initial_statement":raw_text,"messages":[]},reqs); return out
