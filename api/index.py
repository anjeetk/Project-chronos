from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        path = self.path.split('?')[0]

        if path == '/api/health':
            self.wfile.write(json.dumps({"ok": True, "env": "vercel"}).encode())
        elif path == '/api/status':
            self.wfile.write(json.dumps({
                "session_id": None, "seq": 0, "latest_hash": "",
                "prev_hash": "", "batches": 0, "running": False,
                "camera_mode": "serverless",
                "message": "Live pipeline unavailable on serverless. Use Demo Mode."
            }).encode())
        elif path == '/api/recordings':
            self.wfile.write(json.dumps([]).encode())
        elif path == '/telemetry.json':
            self.wfile.write(json.dumps({"metrics": []}).encode())
        elif path == '/audit_trail.json':
            self.wfile.write(json.dumps({"entries": []}).encode())
        else:
            self.wfile.write(json.dumps({"path": path, "method": "GET"}).encode())

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        path = self.path.split('?')[0]

        if path == '/api/start':
            self.wfile.write(json.dumps({
                "status": "unavailable",
                "message": "Recording requires local backend. Use Demo Mode on Vercel."
            }).encode())
        elif path == '/api/stop':
            self.wfile.write(json.dumps({"status": "not_running"}).encode())
        elif path.startswith('/api/verify/'):
            self.wfile.write(json.dumps({"valid": True, "records_checked": 0}).encode())
        elif path.startswith('/api/tamper/'):
            self.wfile.write(json.dumps({"status": "unavailable"}).encode())
        else:
            self.wfile.write(json.dumps({"path": path, "method": "POST"}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
