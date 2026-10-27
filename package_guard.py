"""Text-only skill validation; no uploaded code is ever executed."""
import hashlib
import json
from fastapi import HTTPException

FORBIDDEN_CONTENT_PATTERNS = [
    "#!/bin/", "#!/usr/bin/", "import subprocess", "os.system(", "eval(", "exec("
]


class PackageGuard:
    @staticmethod
    def validate_structured_skill(payload: dict) -> str:
        instructions = payload.get("instructions_md")
        version = payload.get("version")
        examples = payload.get("examples_json")
        tasks = payload.get("supported_tasks")
        if not isinstance(version, str) or not version.strip():
            raise HTTPException(422, "Skill version is required")
        if not isinstance(instructions, str) or not instructions.strip() or len(instructions) > 40000:
            raise HTTPException(422, "Skill instructions must be nonempty text below 40,000 characters")
        for pattern in FORBIDDEN_CONTENT_PATTERNS:
            if pattern in instructions:
                raise HTTPException(
                    400,
                    f"Security Violation: Executable code pattern '{pattern}' rejected in skill instructions.",
                )
        if not isinstance(examples, list) or len(examples) > 30:
            raise HTTPException(422, "Skill examples must be a list with at most 30 entries")
        if not isinstance(tasks, list) or not tasks or not all(isinstance(t, str) and t.strip() for t in tasks):
            raise HTTPException(422, "Supported task names are required")
        normalized = {
            "version": version.strip(),
            "instructions_md": instructions.replace("\r\n", "\n").strip(),
            "examples_json": examples,
            "supported_tasks": tasks,
        }
        return hashlib.sha256(
            json.dumps(
                normalized,
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
                allow_nan=False,
            ).encode("utf-8")
        ).hexdigest()

    @staticmethod
    def validate_and_hash_zip(file_bytes: bytes):
        raise HTTPException(415, "Use the JSON/Markdown skill registration API; ZIPs are not supported")