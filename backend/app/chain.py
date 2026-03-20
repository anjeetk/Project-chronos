"""Stateful chain worker — processes one frame+vitals per tick.

chain_hash = SHA256(canonical_json({seq, ts, frame_sha256, vitals, prev_hash}))
"""

import time
import cv2

from .hasher import sha256_bytes, canonical_payload, compute_chain_hash
from .storage import save_frame, save_json
from .config import JPEG_QUALITY


class ChainState:
    """Maintains rolling chain state: prev_hash + monotonic seq counter."""

    def __init__(self, genesis: bytes):
        self.prev_hash = genesis
        self.seq = 0


def process_one(
    frame,
    vitals: dict,
    state: ChainState,
    session_dir: str,
) -> dict:
    """Process a single frame+vitals tick.

    1. JPEG-encode frame
    2. SHA-256 frame bytes
    3. Build canonical payload
    4. Compute chain hash
    5. Save frame + vitals to disk
    6. Return record dict

    Returns:
        Record dict with seq, ts, paths, hashes.
    """
    ts = int(time.time())

    # JPEG-encode
    ok, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        raise RuntimeError(f"JPEG encode failed at seq={state.seq}")
    frame_bytes = jpeg.tobytes()

    # Hash the raw frame bytes
    frame_sha = sha256_bytes(frame_bytes)

    # Build deterministic payload and chain hash
    payload = canonical_payload(
        seq=state.seq,
        ts=ts,
        frame_sha256_hex=frame_sha.hex(),
        vitals=vitals,
        prev_hash_hex=state.prev_hash.hex(),
    )
    chain_hash = compute_chain_hash(payload)

    # File paths (relative to session dir)
    frame_rel = f"frames/{state.seq}.jpg"
    vitals_rel = f"vitals/{state.seq}.json"
    frame_path = f"{session_dir}/{frame_rel}"
    vitals_path = f"{session_dir}/{vitals_rel}"

    # Persist to disk
    save_frame(frame_bytes, frame_path)
    save_json(vitals, vitals_path)

    # Build record
    rec = {
        "seq": state.seq,
        "ts": ts,
        "frame": frame_rel,
        "vitals": vitals_rel,
        "frame_sha256": frame_sha.hex(),
        "chain_hash": chain_hash.hex(),
        "prev_hash": state.prev_hash.hex(),
    }

    # Advance state
    state.prev_hash = chain_hash
    state.seq += 1

    return rec
