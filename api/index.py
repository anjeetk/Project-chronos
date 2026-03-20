import sys
import os
from fastapi import FastAPI

# Simple debug app in the same file to isolate the issue
app = FastAPI()

@app.get("/api/py_health")
def py_health():
    return {
        "status": "python_ok",
        "sys_path": sys.path,
        "cwd": os.getcwd(),
        "files_backend": os.listdir("backend") if os.path.exists("backend") else "no_backend"
    }

# Attempt real import
try:
    # Root directory is the parent of api/
    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if ROOT not in sys.path:
        sys.path.insert(0, ROOT)

    # Ensure backend directory is also in path so "app" is discoverable
    BACKEND_DIR = os.path.join(ROOT, "backend")
    if BACKEND_DIR not in sys.path:
        sys.path.insert(0, BACKEND_DIR)

    from app.api import app as real_app
    app.mount("/api", real_app) # Route all other /api to the real one
except Exception as e:
    @app.get("/api/error")
    def error():
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

handler = app
