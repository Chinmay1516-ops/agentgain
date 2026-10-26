import jsonschema
from models import EvalVerdict, RecordComparisonStatus

class DeterministicVerifier:
    @staticmethod
    def check_single_output(
        agent_output: dict | None,
        checked_answer: dict,
        output_schema: dict
    ) -> tuple[bool, str | None]:
        """
        Deterministically verifies an agent output against the required JSON schema
        and the buyer's checked ground-truth answer.
        Returns (passed: bool, error_message: str | None).
        """
        if not isinstance(agent_output, dict):
            return False, "Agent did not return a valid JSON object."

        
        try:
            jsonschema.validate(instance=agent_output, schema=output_schema)
        except jsonschema.ValidationError as exc:
            return False, f"Schema validation failed at '{exc.json_path}': {exc.message}"

        
        mismatches = []
        for key, expected_val in checked_answer.items():
            actual_val = agent_output.get(key)
            if isinstance(expected_val, str) and isinstance(actual_val, str):
                if expected_val.strip().lower() != actual_val.strip().lower():
                    mismatches.append(f"Field '{key}': expected '{expected_val}', got '{actual_val}'")
            elif actual_val != expected_val:
                mismatches.append(f"Field '{key}': expected {expected_val!r}, got {actual_val!r}")

        if mismatches:
            return False, "; ".join(mismatches)

        return True, None

    @staticmethod
    def classify_record_pair(baseline_passed: bool, skilled_passed: bool) -> tuple[RecordComparisonStatus, str]:
        if not baseline_passed and skilled_passed:
            return RecordComparisonStatus.IMPROVED, "Baseline failed -> Skilled succeeded"
        if baseline_passed and skilled_passed:
            return RecordComparisonStatus.RETAINED, "Both configurations succeeded"
        if baseline_passed and not skilled_passed:
            return RecordComparisonStatus.REGRESSED, "Regression: Baseline succeeded -> Skilled failed"
        return RecordComparisonStatus.UNRESOLVED, "Both configurations failed"

    @staticmethod
    def compute_contract_verdict(
        record_results: list[dict],
        scoring_rules: dict
    ) -> dict:
        """
        Applies the frozen contract scoring rules to recorded evaluation runs.
        Produces PASS, FAIL, INCONCLUSIVE, or TECHNICAL_ERROR.
        """
        total = len(record_results)
        min_required_records = scoring_rules.get("min_records", 3)

        if total == 0:
            return {
                "verdict": EvalVerdict.TECHNICAL_ERROR,
                "reason": "No evaluation records were processed."
            }

        tech_errors = sum(
            1 for r in record_results
            if r.get("baseline_infra_error") or r.get("skilled_infra_error")
        )
        if tech_errors > 0:
            return {
                "verdict": EvalVerdict.TECHNICAL_ERROR,
                "reason": f"Infrastructure/runtime error on {tech_errors} of {total} records."
            }

        if total < min_required_records:
            return {
                "verdict": EvalVerdict.INCONCLUSIVE,
                "reason": f"Dataset contains {total} records, below minimum required {min_required_records}."
            }

        baseline_passes = sum(1 for r in record_results if r["baseline_passed"])
        skilled_passes = sum(1 for r in record_results if r["skilled_passed"])
        improvements = sum(
            1 for r in record_results
            if r["comparison_status"] == RecordComparisonStatus.IMPROVED
        )
        regressions = sum(
            1 for r in record_results
            if r["comparison_status"] == RecordComparisonStatus.REGRESSED
        )

        baseline_acc = round((baseline_passes / total) * 100.0, 2)
        skilled_acc = round((skilled_passes / total) * 100.0, 2)
        net_lift = round(skilled_acc - baseline_acc, 2)

        baseline_tokens = sum(r["baseline_tokens"] for r in record_results)
        skilled_tokens = sum(r["skilled_tokens"] for r in record_results)
        baseline_ms = sum(r["baseline_ms"] for r in record_results)
        skilled_ms = sum(r["skilled_ms"] for r in record_results)

        min_lift_pct = float(scoring_rules.get("min_lift_pct", 15.0))
        max_regressions = int(scoring_rules.get("max_regressions", 0))
        max_tokens_per_record = int(scoring_rules.get("max_tokens_per_record", 1500))

        avg_skilled_tokens = skilled_tokens / total

        reasons = []
        passed = True

        if regressions > max_regressions:
            passed = False
            reasons.append(f"Regressions ({regressions}) exceeded allowed limit ({max_regressions}).")

        if net_lift < min_lift_pct:
            passed = False
            reasons.append(f"Net accuracy lift ({net_lift}%) is below agreed target ({min_lift_pct}%).")

        if avg_skilled_tokens > max_tokens_per_record:
            passed = False
            reasons.append(
                f"Average skilled token usage ({avg_skilled_tokens:.1f}) exceeded resource cap ({max_tokens_per_record})."
            )

        verdict = EvalVerdict.PASS if passed else EvalVerdict.FAIL
        if passed:
            reasons.append(
                f"Passed all contract rules: +{net_lift}% accuracy lift ({baseline_acc}% -> {skilled_acc}%), "
                f"{regressions} regressions, {avg_skilled_tokens:.0f} avg tokens/record."
            )

        return {
            "verdict": verdict,
            "baseline_accuracy_pct": baseline_acc,
            "skilled_accuracy_pct": skilled_acc,
            "net_lift_pct": net_lift,
            "improvements_count": improvements,
            "regressions_count": regressions,
            "baseline_total_tokens": baseline_tokens,
            "skilled_total_tokens": skilled_tokens,
            "baseline_total_ms": baseline_ms,
            "skilled_total_ms": skilled_ms,
            "reason": " ".join(reasons)
        }