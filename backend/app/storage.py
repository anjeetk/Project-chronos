"""Disk I/O for frames, vitals, and session manifests."""

import json
import os


def ensure_dirs(*dirs):
    """Create directories if they don't exist."""
    for d in dirs:
        os.makedirs(d, exist_ok=True)


def save_frame(frame_bytes: bytes, path: str):
    """Write raw JPEG bytes to disk."""
    with open(path, "wb") as f:
        f.write(frame_bytes)


def load_frame(path: str) -> bytes:
    """Read raw JPEG bytes from disk."""
    with open(path, "rb") as f:
        return f.read()


def save_json(obj: dict, path: str):
    """Write deterministic JSON to disk."""
    with open(path, "w") as f:
        json.dump(obj, f, sort_keys=True, separators=(",", ":"))


def load_json(path: str) -> dict:
    """Read JSON from disk."""
    with open(path, "r") as f:
        return json.load(f)


def save_manifest(manifest: dict, path: str):
    """Write session manifest (pretty-printed for readability)."""
    with open(path, "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def load_manifest(path: str) -> dict:
    """Read session manifest."""
    with open(path, "r") as f:
        return json.load(f)
