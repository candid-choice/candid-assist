#!/usr/bin/env python3
"""
migrate-settings.py — Migrate Claude Code config to pi.dev format.

Reads ``<project>/.claude/settings.json`` (and optional ``settings.local.json``),
transforms them into pi.dev-compatible::

    <project>/.pi/settings.json          # project-level settings
    ~/.pi/agent/models.json              # global model catalog

Usage:
    python migrate-settings.py              # write files, create backups
    python migrate-settings.py --dry-run    # print output to stdout, no writes
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configurable mapping tables
# ---------------------------------------------------------------------------

PLUGIN_MAP = {
    "frontend-design@claude-plugins-official": "@anthropics/frontend-design",
    "code-review@claude-plugins-official": "@anthropics/code-review",
    "playwright@claude-plugins-official": "@anthropics/playwright",
    "github@claude-plugins-official": "@anthropics/github",
    "typescript-lsp@claude-plugins-official": "@anthropics/typescript-lsp",
}

NAME_RULES = [
    (re.compile(r"(?<!\.)qwen(?!\.)", re.IGNORECASE), "Qwen"),
    (re.compile(r"(?<!\.)gpt(?!\.)", re.IGNORECASE), "GPT"),
    (re.compile(r"(?<!\.)claude(?!\.)", re.IGNORECASE), "Claude"),
    (re.compile(r"(?<!\.)gemini(?!\.)", re.IGNORECASE), "Gemini"),
    (re.compile(r"(?<!\.)llama(?!\.)", re.IGNORECASE), "Llama"),
]

CONTEXT_WINDOW = 131072
MAX_OUTPUT_TOKENS = 16000
DEFAULT_INPUT = [{"type": "text"}, {"type": "image_url"}]
REASONING = {"enabled": False, "defaultLevel": "off"}
COST = {"input": 0, "output": 0}

PROJECT_ROOT = Path(__file__).resolve().parent
SOURCE_SETTINGS = PROJECT_ROOT / ".claude" / "settings.json"
SOURCE_LOCAL = PROJECT_ROOT / ".claude" / "settings.local.json"
TARGET_SETTINGS = PROJECT_ROOT / ".pi" / "settings.json"
# Global pi.dev model catalog (resides outside the project repo)
HOME_PI_AGENT = Path.home() / ".pi" / "agent"
TARGET_MODELS = HOME_PI_AGENT / "models.json"


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def read_json(path: Path) -> dict:
    """Read and return parsed JSON from *path*, exiting on error."""
    if not path.is_file():
        print(f"Error: source config not found: {path}", file=sys.stderr)
        sys.exit(1)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Error: failed to parse {path}: {exc}", file=sys.stderr)
        sys.exit(1)


def parse_model_string(model_str: str) -> tuple[str, str]:
    """Split ``"provider/model-id"`` → ``(provider, model_id)``.

    Edge cases
    ----------
    - Empty / whitespace → ``("default", "")``
    - No ``/`` character → provider becomes ``"default"``, whole string is id
    """
    if not model_str or not model_str.strip():
        return ("default", "")

    parts = model_str.split("/", 1)
    if len(parts) == 2 and parts[0]:
        return parts[0], parts[1]
    return ("default", model_str.strip())


def build_model_metadata(model_id: str) -> dict:
    """Generate a model metadata dict with sensible defaults."""
    name = model_id
    for pattern, replacement in NAME_RULES:
        name = pattern.sub(replacement, name)

    # Split on non-alphanumeric boundaries, then capitalise each fragment.
    # "Qwen3.6-35b-a3b" → ["Qwen", "3.6", "35b", "a3b"] → title → "Qwen 3.6 35B A3B"
    fragments = re.split(r"[^a-zA-Z0-9.]+", name)
    name = " ".join(f.title() for f in fragments if f)

    return {
        "id": model_id,
        "name": name,
        "contextWindow": CONTEXT_WINDOW,
        "maxOutputTokens": MAX_OUTPUT_TOKENS,
        ".input": DEFAULT_INPUT,
        "reasoning": REASONING,
        "cost": COST,
    }


def build_settings(data: dict) -> dict:
    """Compose pi.dev ``settings.json`` from parsed Claude Code config."""
    env = data.get("env", {})
    model_str = env.get("ANTHROPIC_MODEL", "")
    provider, model_id = parse_model_string(model_str)

    # Packages from enabledPlugins
    enabled_plugins = data.get("enabledPlugins", {})
    packages = []
    unmapped: list[str] = []
    for key, val in enabled_plugins.items():
        if not val:
            continue
        pkg = PLUGIN_MAP.get(key)
        if pkg:
            packages.append(pkg)
        else:
            unmapped.append(key)

    # Timeout overrides (informational)
    timeout_overrides: dict = {}
    for key, alias in (
        ("API_TIMEOUT_MS", "api"),
        ("CLAUDE_STREAM_IDLE_TIMEOUT_MS", "streamIdle"),
        ("CLAUDE_CODE_MAX_RETRIES", "maxRetries"),
        ("BASH_DEFAULT_TIMEOUT_MS", "bashDefault"),
        ("BASH_MAX_TIMEOUT_MS", "bashMax"),
    ):
        val = env.get(key)
        if val:
            timeout_overrides[alias] = int(val)

    # Metadata section
    metadata: dict = {
        "overrides": data.get("modelOverrides", {}),
        "timeoutOverrides": timeout_overrides,
        "autoCompact": {
            "window": data.get("autoCompactWindow"),
            "enabled": data.get("autoCompactEnabled"),
        },
    }
    if unmapped:
        metadata["unmappedPlugins"] = unmapped

    return {
        "defaultModel": model_str,
        "defaultProvider": provider,
        "lastChangelogVersion": "1.0.4",
        "packages": packages,
        "permissions": data.get("permissions", {}),
        "_metadata": metadata,
    }


def build_models(data: dict) -> dict:
    """Compose pi.dev ``models.json`` from parsed Claude Code config."""
    env = data.get("env", {})
    model_str = env.get("ANTHROPIC_MODEL", "")
    base_url = env.get("ANTHROPIC_BASE_URL", "")
    provider, model_id = parse_model_string(model_str)

    model = build_model_metadata(model_id)

    provider_block: dict = {
        "baseUrl": base_url,
        "api": "openai-completions",
        "apiKey": "",
        "authHeader": True,
        "models": [model],
    }

    overrides = data.get("modelOverrides", {})
    if overrides:
        # Convert full "provider/model" overrides to model-id-level aliases.
        resolved_overrides = {}
        for alias, target in overrides.items():
            _, tid = parse_model_string(target)
            resolved_overrides[alias] = tid
        provider_block["_overrides"] = resolved_overrides

    return {"providers": {provider: provider_block}}


def write_json(path: Path, data: dict, create_dirs: bool = True) -> None:
    """Pretty-print *data* to *path*, creating parent directories as needed."""
    if create_dirs:
        path.parent.mkdir(parents=True, exist_ok=True)

    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    path.write_text(content, encoding="utf-8")
    print(f"Wrote: {path}")


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Migrate Claude Code config → pi.dev format"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print output to stdout without writing files",
    )
    args = parser.parse_args()

    # Read source configs
    source_data = read_json(SOURCE_SETTINGS)
    local_data: dict = {}
    if SOURCE_LOCAL.is_file():
        local_data = read_json(SOURCE_LOCAL)

    # Validate required fields
    model_str = source_data.get("env", {}).get("ANTHROPIC_MODEL", "")
    if not model_str or not model_str.strip():
        print("Error: env.ANTHROPIC_MODEL is empty or missing", file=sys.stderr)
        sys.exit(1)

    # Build pi.dev structures
    settings = build_settings(source_data)
    models = build_models(source_data)

    if args.dry_run:
        print("\n--- Dry-run output ---")
        print("=== Project .pi/settings.json ===")
        print(json.dumps(settings, indent=2, ensure_ascii=False))
        print("\n=== Global ~/.pi/agent/models.json ===")
        print(json.dumps(models, indent=2, ensure_ascii=False))
        print("\n=== Project .claude/settings.local.json (unchanged) ===")
        print(json.dumps(local_data, indent=2, ensure_ascii=False))
        print("--- End dry-run ---")
        return

    # Warn about missing base URL
    base_url = source_data.get("env", {}).get("ANTHROPIC_BASE_URL", "")
    if not base_url:
        print("Warning: env.ANTHROPIC_BASE_URL is missing; baseUrl will be empty", file=sys.stderr)

    # Write target files
    write_json(TARGET_SETTINGS, settings, create_dirs=True)

    # models.json is global — do not back up or create parent dirs
    # (user may already have ~/.pi/agent/models.json from a real Pi install)
    if not TARGET_MODELS.is_file():
        write_json(TARGET_MODELS, models, create_dirs=False)
    else:
        # Merge: update or insert this provider's entry into existing models.json
        existing = read_json(TARGET_MODELS)
        provider = list(existing.get("providers", {}).keys())[0] if existing.get("providers") else ""
        existing["providers"][provider] = models["providers"][provider]
        write_json(TARGET_MODELS, existing, create_dirs=False)

    # settings.local.json stays unchanged — no write needed.

    print("\nMigration complete.")
    print(f"  .pi/settings.json  → {TARGET_SETTINGS}")
    print(f"  ~/.pi/agent/models.json → {TARGET_MODELS}")
    print(f"  .claude/settings.local.json → {SOURCE_LOCAL} (unchanged)")


if __name__ == "__main__":
    main()
