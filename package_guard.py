import hashlib
import zipfile
import io
import json
from fastapi import HTTPException

FORBIDDEN_EXTENSIONS = {
    ".py", ".sh", ".exe", ".js", ".ts", ".bat", ".cmd",
    ".php", ".rb", ".dll", ".so", ".dylib", ".bin", ".jar"
}

FORBIDDEN_CONTENT_PATTERNS = [
    "#!/bin/", "#!/usr/bin/", "import subprocess", "os.system(", "eval(", "exec("
]

class PackageGuard:
    @staticmethod
    def validate_structured_skill(payload: dict) -> str:
        """
        Validates a JSON-registered skill payload, rejects embedded executable patterns,
        and returns a canonical SHA-256 content hash.
        """
        instructions = payload.get("instructions_md", "")
        for pattern in FORBIDDEN_CONTENT_PATTERNS:
            if pattern in instructions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Security Violation: Executable code pattern '{pattern}' rejected in skill instructions."
                )

        canonical_bytes = json.dumps(
            {
                "version": payload.get("version"),
                "instructions_md": instructions.replace("\r\n", "\n").strip(),
                "examples_json": payload.get("examples_json"),
                "supported_tasks": payload.get("supported_tasks"),
            },
            sort_keys=True,
            separators=(",", ":")
        ).encode("utf-8")

        return hashlib.sha256(canonical_bytes).hexdigest()

    @staticmethod
    def validate_and_hash_zip(file_bytes: bytes) -> tuple[str, dict]:
        """
        Validates a ZIP skill package upload, rejects any executable files,
        and returns (content_sha256, manifest_dict).
        """
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                file_list = zf.namelist()
                for filename in file_list:
                    lower_name = filename.lower()
                    if any(lower_name.endswith(ext) for ext in FORBIDDEN_EXTENSIONS):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Security Violation: Executable file rejected ({filename})."
                        )
                manifest_name = next(
                    (f for f in file_list if f.endswith("skill.json") or f.endswith("manifest.json")),
                    None
                )
                if not manifest_name:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid package: Missing 'skill.json' or 'manifest.json'."
                    )
                manifest_data = json.loads(zf.read(manifest_name).decode("utf-8"))
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Invalid ZIP archive.")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Malformed JSON in manifest.")

        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        return sha256_hash, manifest_data