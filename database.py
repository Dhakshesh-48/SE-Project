"""SQLAlchemy persistence. SQLite is a zero-setup local default; PostgreSQL is supported via DATABASE_URL."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.engine import make_url
from pgvector.sqlalchemy import Vector

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./requirements.db")
_connect_args = {"check_same_thread": False} if make_url(DATABASE_URL).get_backend_name() == "sqlite" else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Role(Base):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    description: Mapped[str] = mapped_column(String(200), default="")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(ForeignKey("roles.name"), default="analyst", index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    initial_statement: Mapped[str] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="interview", index=True)
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Requirement(Base):
    __tablename__ = "requirements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    requirement_key: Mapped[str] = mapped_column(String(40), index=True)
    statement: Mapped[str] = mapped_column(Text)
    categories: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    __table_args__ = (Index("ix_requirement_project_key", "project_id", "requirement_key", unique=True),)

class RequirementVersion(Base):
    __tablename__ = "requirement_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    requirement_key: Mapped[str] = mapped_column(String(40), index=True)
    version: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSON)
    changed_by: Mapped[str] = mapped_column(String(120))
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(300))
    version: Mapped[str] = mapped_column(String(80), default="1")
    jurisdiction: Mapped[str] = mapped_column(String(120), default="Unspecified")
    effective_date: Mapped[str] = mapped_column(String(80), default="Unspecified")
    approved_source: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_by: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    page_or_section: Mapped[str] = mapped_column(String(120), default="Text extraction")
    content: Mapped[str] = mapped_column(Text)
    vector: Mapped[list] = mapped_column(Vector(256).with_variant(JSON, "sqlite"))
    source_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (Index("ix_chunk_project_document", "project_id", "document_id"),)

class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    artifact_type: Mapped[str] = mapped_column(String(80), index=True)
    artifact_id: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(40))
    actor: Mapped[str] = mapped_column(String(120))
    previous_version: Mapped[dict] = mapped_column(JSON, default=dict)
    new_version: Mapped[dict] = mapped_column(JSON, default=dict)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    actor: Mapped[str] = mapped_column(String(120))
    action: Mapped[str] = mapped_column(String(120), index=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Record(Base):
    """Typed project-scoped records for secondary agent artifacts; one table per artifact."""
    __abstract__ = True
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

def _record_type(class_name: str, table_name: str):
    return type(class_name, (Record,), {"__tablename__": table_name, "__module__": __name__})

Stakeholder = _record_type("Stakeholder", "stakeholders")
Conversation = _record_type("Conversation", "conversations")
ClarificationQuestion = _record_type("ClarificationQuestion", "clarification_questions")
Conflict = _record_type("Conflict", "conflicts")
ComplianceControl = _record_type("ComplianceControl", "compliance_controls")
ComplianceMapping = _record_type("ComplianceMapping", "compliance_mappings")
SecurityControl = _record_type("SecurityControl", "security_controls")
Evidence = _record_type("Evidence", "evidence")
UserStory = _record_type("UserStory", "user_stories")
UseCase = _record_type("UseCase", "use_cases")
AcceptanceCriteria = _record_type("AcceptanceCriteria", "acceptance_criteria")
TraceabilityLink = _record_type("TraceabilityLink", "traceability_links")
RiskRecord = _record_type("RiskRecord", "risk_records")
SDLCAssessment = _record_type("SDLCAssessment", "sdlc_assessments")
SDLCRecommendation = _record_type("SDLCRecommendation", "sdlc_recommendations")
EvaluationCase = _record_type("EvaluationCase", "evaluation_cases")
EvaluationResult = _record_type("EvaluationResult", "evaluation_results")


def init_db() -> None:
    if make_url(DATABASE_URL).get_backend_name() == "postgresql":
        with engine.begin() as connection:
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=engine)
