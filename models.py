import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, DateTime,
    ForeignKey, JSON, Text, Enum, UniqueConstraint
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def utcnow():
    return datetime.now(timezone.utc)

class ContractStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    FROZEN = "FROZEN"
    COMPLETED = "COMPLETED"

class PaymentState(str, enum.Enum):
    UNINITIALIZED = "UNINITIALIZED"
    ORDER_CREATED = "ORDER_CREATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURE_PENDING = "CAPTURE_PENDING"
    CAPTURE_COMPLETED = "CAPTURE_COMPLETED"
    VOID_PENDING = "VOID_PENDING"
    VOIDED = "VOIDED"
    PAYMENT_ERROR = "PAYMENT_ERROR"

class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED_RETRYABLE = "FAILED_RETRYABLE"

class EvalVerdict(str, enum.Enum):
    PENDING = "PENDING"
    PASS = "PASS"
    FAIL = "FAIL"
    INCONCLUSIVE = "INCONCLUSIVE"
    TECHNICAL_ERROR = "TECHNICAL_ERROR"

class RecordComparisonStatus(str, enum.Enum):
    IMPROVED = "IMPROVED"
    RETAINED = "RETAINED"
    REGRESSED = "REGRESSED"
    UNRESOLVED = "UNRESOLVED"

class SkillPackage(Base):
    __tablename__ = "skill_packages"
    id = Column(String(64), primary_key=True)
    version = Column(String(32), nullable=False)
    seller_id = Column(String(64), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    instructions_md = Column(Text, nullable=False)
    examples_json = Column(JSON, nullable=False)
    supported_tasks = Column(JSON, nullable=False)
    price_usd = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(8), default="USD", nullable=False)
    licence_terms = Column(Text, nullable=False)
    seller_eval_policy = Column(JSON, nullable=False)
    content_sha256 = Column(String(64), nullable=False, unique=True)
    checkout_visits = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class BuyerTaskFailure(Base):
    __tablename__ = "buyer_task_failures"
    id = Column(String(64), primary_key=True)
    buyer_id = Column(String(64), nullable=False)
    task_type = Column(String(100), nullable=False)
    raw_input_json = Column(JSON, nullable=False)
    expected_schema_json = Column(JSON, nullable=False)
    initial_agent_output = Column(JSON, nullable=True)
    recorded_validation_error = Column(Text, nullable=False)
    recommended_skill_id = Column(String(64), ForeignKey("skill_packages.id"), nullable=True)
    post_purchase_output = Column(JSON, nullable=True)
    post_purchase_passed = Column(Boolean, nullable=True)
    post_purchase_remaining_errors = Column(Text, nullable=True)
    buyer_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class EvaluationDataset(Base):
    __tablename__ = "evaluation_datasets"
    id = Column(String(64), primary_key=True)
    buyer_id = Column(String(64), nullable=False)
    origin_failure_id = Column(String(64), ForeignKey("buyer_task_failures.id"), nullable=True)
    records_json = Column(JSON, nullable=False)
    output_schema_json = Column(JSON, nullable=False)
    baseline_agent_config = Column(JSON, nullable=False)
    dataset_sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class EvaluationContract(Base):
    __tablename__ = "evaluation_contracts"
    id = Column(String(64), primary_key=True)
    buyer_id = Column(String(64), default="buyer_acme_ops", nullable=False)
    skill_id = Column(String(64), ForeignKey("skill_packages.id"), nullable=False)
    skill_version = Column(String(32), nullable=False)
    skill_content_sha256 = Column(String(64), nullable=False)
    dataset_id = Column(String(64), ForeignKey("evaluation_datasets.id"), nullable=False)
    dataset_sha256 = Column(String(64), nullable=False)
    model_name = Column(String(64), nullable=False)
    scoring_rules_json = Column(JSON, nullable=False)
    price_usd = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(8), default="USD", nullable=False)
    failure_policy_json = Column(JSON, nullable=False)

    
    contract_version = Column(Integer, default=1, nullable=False)
    terms_snapshot = Column(JSON, nullable=True)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT, nullable=False)
    contract_sha256 = Column(String(64), nullable=True, unique=True)
    approved_terms_hash = Column(String(64), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    
    payment_state = Column(Enum(PaymentState), default=PaymentState.UNINITIALIZED, nullable=False)
    paypal_order_id = Column(String(64), nullable=True, unique=True)
    paypal_authorization_id = Column(String(64), nullable=True, unique=True)
    paypal_capture_id = Column(String(64), nullable=True, unique=True)
    create_request_id = Column(String(64), nullable=True)
    authorize_request_id = Column(String(64), nullable=True)
    capture_request_id = Column(String(64), nullable=True)
    void_request_id = Column(String(64), nullable=True)

    
    eval_verdict = Column(Enum(EvalVerdict), default=EvalVerdict.PENDING, nullable=False)
    baseline_accuracy_pct = Column(Numeric(5, 2), nullable=True)
    skilled_accuracy_pct = Column(Numeric(5, 2), nullable=True)
    net_lift_pct = Column(Numeric(5, 2), nullable=True)
    improvements_count = Column(Integer, default=0)
    regressions_count = Column(Integer, default=0)
    baseline_total_tokens = Column(Integer, default=0)
    skilled_total_tokens = Column(Integer, default=0)
    baseline_total_ms = Column(Integer, default=0)
    skilled_total_ms = Column(Integer, default=0)
    verdict_reason = Column(Text, nullable=True)

    
    receipt_sha256 = Column(String(64), nullable=True, unique=True)
    skill_delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class EvaluationJob(Base):
    __tablename__ = "evaluation_jobs"
    id = Column(String(64), primary_key=True)
    contract_id = Column(String(64), ForeignKey("evaluation_contracts.id"), nullable=False, unique=True)
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED, nullable=False)
    attempt_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

class EvaluationRecordResult(Base):
    __tablename__ = "evaluation_record_results"
    id = Column(String(64), primary_key=True)
    contract_id = Column(String(64), ForeignKey("evaluation_contracts.id"), nullable=False)
    record_index = Column(Integer, nullable=False)
    execution_order = Column(String(32), nullable=False)
    input_data = Column(JSON, nullable=False)
    checked_answer = Column(JSON, nullable=False)

    baseline_output = Column(JSON, nullable=True)
    baseline_error = Column(Text, nullable=True)
    baseline_passed = Column(Boolean, nullable=False)
    baseline_tokens = Column(Integer, nullable=False)
    baseline_ms = Column(Integer, nullable=False)

    skilled_output = Column(JSON, nullable=True)
    skilled_error = Column(Text, nullable=True)
    skilled_passed = Column(Boolean, nullable=False)
    skilled_tokens = Column(Integer, nullable=False)
    skilled_ms = Column(Integer, nullable=False)

    comparison_status = Column(Enum(RecordComparisonStatus), nullable=False)
    diff_summary = Column(Text, nullable=True)

class PaymentOperationLog(Base):
    __tablename__ = "payment_operation_logs"
    operation_id = Column(String(64), primary_key=True)
    contract_id = Column(String(64), ForeignKey("evaluation_contracts.id"), nullable=False)
    operation_type = Column(String(32), nullable=False)
    http_status = Column(Integer, nullable=True)
    paypal_debug_id = Column(String(64), nullable=True)
    raw_response_json = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        UniqueConstraint("contract_id", "operation_type", name="uq_contract_payment_op"),
    )

class WebhookEvent(Base):
    """Step 14: Deduplicates incoming PayPal webhook events."""
    __tablename__ = "webhook_events"
    event_id = Column(String(64), primary_key=True)
    event_type = Column(String(100), nullable=False)
    status = Column(String(32), default="received", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)