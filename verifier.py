"""Independent deterministic scorer. Never calls PayPal or chooses payment APIs."""
import math
import jsonschema
from models import EvalVerdict, RecordComparisonStatus


class DeterministicVerifier:
    @staticmethod
    def check_single_output(agent_output: dict | None, checked_answer: dict,
                            output_schema: dict) -> tuple[bool, str | None]:
        if not isinstance(agent_output, dict):
            return False, "Model did not produce a JSON object"
        try:
            jsonschema.validate(instance=agent_output, schema=output_schema)
        except jsonschema.ValidationError as exc:
            return False, f"Schema failure at {exc.json_path}: {exc.message}"
        if not isinstance(checked_answer, dict) or not checked_answer:
            return False, "Checked answer missing"
        errors = []
        for key, expected in checked_answer.items():
            actual = agent_output.get(key)
            if isinstance(expected, str) and isinstance(actual, str):
                valid = expected.strip().casefold() == actual.strip().casefold()
            else:
                valid = actual == expected
            if not valid:
                errors.append(f"Mismatch in {key}")
        return (not errors, "; ".join(errors) if errors else None)

    @staticmethod
    def classify_record_pair(baseline_passed: bool, skilled_passed: bool):
        if not baseline_passed and skilled_passed:
            return RecordComparisonStatus.IMPROVED, "Only skilled run passed"
        if baseline_passed and not skilled_passed:
            return RecordComparisonStatus.REGRESSED, "Only baseline run passed"
        if baseline_passed:
            return RecordComparisonStatus.RETAINED, "Both runs passed"
        return RecordComparisonStatus.UNRESOLVED, "Neither run passed"

    @staticmethod
    def exact_one_sided_sign_pvalue(improvements: int, regressions: int) -> float:
        # One-sided exact test of discordant pairs under equal win/loss probability.
        n = improvements + regressions
        if n == 0:
            return 1.0
        return sum(math.comb(n, k) for k in range(improvements, n + 1)) / 2**n

    @staticmethod
    def compute_contract_verdict(record_results: list[dict], scoring_rules: dict) -> dict:
        total = len(record_results)
        if total == 0 or any(r.get("baseline_infra_error") or r.get("skilled_infra_error") for r in record_results):
            return {"verdict": EvalVerdict.TECHNICAL_ERROR, "reason": "Model/runtime error; no quality claim"}
        if total < scoring_rules["min_records"]:
            return {"verdict": EvalVerdict.INCONCLUSIVE, "reason": "Not enough held-out records"}
        baseline_passes = sum(bool(r["baseline_passed"]) for r in record_results)
        skilled_passes = sum(bool(r["skilled_passed"]) for r in record_results)
        wins = sum(r["comparison_status"] == RecordComparisonStatus.IMPROVED for r in record_results)
        losses = sum(r["comparison_status"] == RecordComparisonStatus.REGRESSED for r in record_results)
        baseline_accuracy = round(100 * baseline_passes / total, 2)
        skilled_accuracy = round(100 * skilled_passes / total, 2)
        lift = round(skilled_accuracy - baseline_accuracy, 2)  # absolute percentage points
        tokens_baseline = sum(int(r["baseline_tokens"]) for r in record_results)
        tokens_skilled = sum(int(r["skilled_tokens"]) for r in record_results)
        ms_baseline = sum(int(r["baseline_ms"]) for r in record_results)
        ms_skilled = sum(int(r["skilled_ms"]) for r in record_results)
        reasons = []
        if lift < scoring_rules["min_lift_pct"]:
            reasons.append(f"Lift {lift} pp below {scoring_rules['min_lift_pct']} pp target")
        if skilled_accuracy < scoring_rules["min_skilled_accuracy_pct"]:
            reasons.append(f"Skilled accuracy {skilled_accuracy}% below quality floor")
        if losses > scoring_rules["max_regressions"]:
            reasons.append(f"{losses} regressions exceed maximum")
        if any(int(r["skilled_tokens"]) > scoring_rules["max_tokens_per_record"] for r in record_results):
            reasons.append("At least one skilled run exceeded the per-record token cap")
        verdict = EvalVerdict.FAIL if reasons else EvalVerdict.PASS
        p_value = DeterministicVerifier.exact_one_sided_sign_pvalue(wins, losses)
        if verdict == EvalVerdict.PASS and scoring_rules.get("require_significance", True):
            if p_value >= scoring_rules["significance_alpha"]:
                verdict = EvalVerdict.INCONCLUSIVE
                reasons.append(f"Paired improvement evidence is uncertain (one-sided p={p_value:.4g})")
        if verdict == EvalVerdict.PASS:
            reasons.append(f"Passed: {baseline_accuracy}% to {skilled_accuracy}% (+{lift} pp), {wins} wins, {losses} regressions, p={p_value:.4g}")
        return {
            "verdict": verdict, "baseline_accuracy_pct": baseline_accuracy,
            "skilled_accuracy_pct": skilled_accuracy, "net_lift_pct": lift,
            "improvements_count": wins, "regressions_count": losses,
            "baseline_total_tokens": tokens_baseline, "skilled_total_tokens": tokens_skilled,
            "baseline_total_ms": ms_baseline, "skilled_total_ms": ms_skilled,
            "reason": "; ".join(reasons),
        }
