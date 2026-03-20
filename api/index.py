import sys
import os

# Root directory is the parent of api/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Ensure backend directory is also in path so "app" is discoverable
BACKEND_DIR = os.path.join(ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

try:
    from app.api import app
except ImportError:
    # Fallback for different bundling structures
    from backend.app.api import app

handler = app
