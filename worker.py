import asyncio
import json
import os
import time
import uuid
import httpx
from sqlalchemy import select
from database import AsyncSessionLocal
from models import (
    EvaluationJob, EvaluationContract, SkillPackage,
    EvaluationDataset, EvaluationRecordResult, JobStatus, EvalVerdict
)
from verifier import DeterministicVerifier

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

async def call_local_ollama_fresh_context(
    model_name: str,
    system_prompt: str,
    task_input: dict,
    output_schema: dict,
    skill_instructions: str | None = None,
    skill_examples: list | None = None
) -> dict:
    """
    Executes a single record on local Ollama/Qwen with a completely fresh context.
    If local Ollama is not running, falls back to a deterministic local parser
    ONLY if ALLOW_OFFLINE_FALLBACK=1 is set for quick CI testing.
    """
    full_system = system_prompt.strip()
    if skill_instructions:
        full_system += f"\n\n--- ACQUIRED SKILL INSTRUCTIONS ---\n{skill_instructions.strip()}"
    if skill_examples:
        full_system += f"\n\n--- SKILL EXAMPLES ---\n{json.dumps(skill_examples, indent=2)}"

    prompt_text = (
        f"Convert the following input record into JSON strictly matching this schema:\n"
        f"Schema: {json.dumps(output_schema)}\n"
        f"Input Record: {json.dumps(task_input)}\n"
        f"Respond ONLY with valid JSON."
    )

    start_ns = time.perf_counter_ns()
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model_name,
                    "system": full_system,
                    "prompt": prompt_text,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.0, "num_ctx": 2048}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            elapsed_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
            tokens = int(data.get("prompt_eval_count", 0)) + int(data.get("eval_count", 0))
            raw_text = data.get("response", "{}")
            parsed_json = json.loads(raw_text)
            return {
                "output": parsed_json,
                "error": None,
                "infra_error": False,
                "tokens": max(tokens, 1),
                "ms": max(elapsed_ms, 1)
            }
    except Exception as exc:
        elapsed_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
        return {
            "output": None,
            "error": f"Model execution error: {str(exc)}",
            "infra_error": True,
            "tokens": 0,
            "ms": max(elapsed_ms, 1)
        }

async def process_single_job(job_id: str):
    """
    Steps 8, 9, 10, 11: Loads the frozen contract & exact skill hash,
    alternates execution order per record, and writes deterministic results.
    """
    async with AsyncSessionLocal() as session:
        job = await session.get(EvaluationJob, job_id)
        if not job:
            return

        contract = await session.get(EvaluationContract, job.contract_id)
        skill = await session.get(SkillPackage, contract.skill_id)
        dataset = await session.get(EvaluationDataset, contract.dataset_id)

    
        if skill.content_sha256 != contract.skill_content_sha256:
            job.status = JobStatus.COMPLETED
            contract.eval_verdict = EvalVerdict.TECHNICAL_ERROR
            contract.verdict_reason = "Skill SHA-256 hash mismatch against frozen contract."
            await session.commit()
            return

        baseline_sys_prompt = dataset.baseline_agent_config.get(
            "system_prompt",
            "You extract product catalogue fields (sku, unit_quantity, pack_type) into JSON."
        )
        records = dataset.records_json
        output_schema = dataset.output_schema_json
        recorded_rows = []

        for idx, rec in enumerate(records):
            input_data = rec["input"]
            checked_answer = rec["checked_answer"]

           
            if idx % 2 == 0:
                execution_order = "BASELINE_FIRST"
                base_res = await call_local_ollama_fresh_context(
                    contract.model_name, baseline_sys_prompt, input_data, output_schema
                )
                skill_res = await call_local_ollama_fresh_context(
                    contract.model_name, baseline_sys_prompt, input_data, output_schema,
                    skill.instructions_md, skill.examples_json
                )
            else:
                execution_order = "SKILLED_FIRST"
                skill_res = await call_local_ollama_fresh_context(
                    contract.model_name, baseline_sys_prompt, input_data, output_schema,
                    skill.instructions_md, skill.examples_json
                )
                base_res = await call_local_ollama_fresh_context(
                    contract.model_name, baseline_sys_prompt, input_data, output_schema
                )

            base_passed, base_err = DeterministicVerifier.check_single_output(
                base_res["output"], checked_answer, output_schema
            )
            skill_passed, skill_err = DeterministicVerifier.check_single_output(
                skill_res["output"], checked_answer, output_schema
            )

            comp_status, diff_summary = DeterministicVerifier.classify_record_pair(
                base_passed, skill_passed
            )

            row_obj = EvaluationRecordResult(
                id=f"rec_{uuid.uuid4().hex[:12]}",
                contract_id=contract.id,
                record_index=idx,
                execution_order=execution_order,
                input_data=input_data,
                checked_answer=checked_answer,
                baseline_output=base_res["output"],
                baseline_error=base_res["error"] or base_err,
                baseline_passed=base_passed,
                baseline_tokens=base_res["tokens"],
                baseline_ms=base_res["ms"],
                skilled_output=skill_res["output"],
                skilled_error=skill_res["error"] or skill_err,
                skilled_passed=skill_passed,
                skilled_tokens=skill_res["tokens"],
                skilled_ms=skill_res["ms"],
                comparison_status=comp_status,
                diff_summary=diff_summary
            )
            session.add(row_obj)
            recorded_rows.append({
                "baseline_passed": base_passed,
                "skilled_passed": skill_passed,
                "comparison_status": comp_status,
                "baseline_tokens": base_res["tokens"],
                "skilled_tokens": skill_res["tokens"],
                "baseline_ms": base_res["ms"],
                "skilled_ms": skill_res["ms"],
                "baseline_infra_error": base_res["infra_error"],
                "skilled_infra_error": skill_res["infra_error"]
            })

       
        summary = DeterministicVerifier.compute_contract_verdict(
            recorded_rows, contract.scoring_rules_json
        )

        contract.eval_verdict = summary["verdict"]
        contract.baseline_accuracy_pct = summary.get("baseline_accuracy_pct")
        contract.skilled_accuracy_pct = summary.get("skilled_accuracy_pct")
        contract.net_lift_pct = summary.get("net_lift_pct")
        contract.improvements_count = summary.get("improvements_count", 0)
        contract.regressions_count = summary.get("regressions_count", 0)
        contract.baseline_total_tokens = summary.get("baseline_total_tokens", 0)
        contract.skilled_total_tokens = summary.get("skilled_total_tokens", 0)
        contract.baseline_total_ms = summary.get("baseline_total_ms", 0)
        contract.skilled_total_ms = summary.get("skilled_total_ms", 0)
        contract.verdict_reason = summary.get("reason")

        job.status = JobStatus.COMPLETED
        await session.commit()
        print(f"[Worker] Completed Job {job.id} -> Verdict: {contract.eval_verdict.value} | {contract.verdict_reason}")

async def poll_queue_forever():
    print("[Worker] Isolated Evaluation Worker started (Zero PayPal credentials loaded). Polling queue...")
    while True:
        claimed_job_id = None
        async with AsyncSessionLocal() as session:
            async with session.begin():
                stmt = (
                    select(EvaluationJob)
                    .where(EvaluationJob.status == JobStatus.QUEUED)
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
                result = await session.execute(stmt)
                job = result.scalar_one_or_none()
                if job:
                    job.status = JobStatus.RUNNING
                    job.attempt_count += 1
                    claimed_job_id = job.id

        if claimed_job_id:
            await process_single_job(claimed_job_id)
        else:
            await asyncio.sleep(2.0)

if __name__ == "__main__":
    asyncio.run(poll_queue_forever())