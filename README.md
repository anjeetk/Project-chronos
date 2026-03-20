# 🧠 Synapse_GTB — Surgical Black Box & Sentinel Monitor

**Synapse_GTB** is a production-grade, end-to-end surgical monitoring and data integrity system. It combines real-time medical telemetry, depth-aware computer vision, and cryptographic hash chaining to create a "tamper-proof" audit trail for surgical procedures.

---

## 🚀 Deployment Status
The project is officially deployed on **Vercel**!
- 🌎 **Live Production URL**: [synapse-gtb.vercel.app](https://synapse-gtb.vercel.app)

---

## 🏛 Project Architecture

### 1. **Chronos Engine** (`/backend`)
A high-performance **FastAPI** backend that manages:
- **Live Capture**: DepthAI-integrated camera stream handling.
- **Hash Chaining**: Deterministic SHA-256 integrity sealing for every telemetry packet.
- **Merkle Trees**: Batching frame hashes into roots for potential blockchain anchoring.
- **Verification**: Post-hoc auditing to detect any bit-level tampering in recorded files.

### 2. **Sentinel View** (`/frontend`)
A premium **React + Tailwind** dashboard with:
- **Real-time Vitals**: Dynamic graphing of surgical telemetry.
- **Magnetic Timeline**: Intuitive navigation through recorded surgical sessions.
- **Tamper Simulator**: An interactive "Red-Team" tool to simulate hash mismatches and test the automated alert system.
- **Merkle Visualizer**: A recursive tree structure showing how the root hash is calculated.

---

## 🛠 Tech Stack
-   **Frontend**: React (Vite), Framer Motion, Tailwind CSS, Lucide Icons, Chart.js
-   **Backend**: Python, FastAPI, OpenCV (Headless), NumPy
-   **DevOps**: Vercel (Single-Project Monorepo), GitHub Automation

---

## 🚦 Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Setup Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main --with-api
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & Integrity
The core of Synapse_GTB is the **Sentinel Protocol**:
1.  **Frame Hashing**: Each frame `n` contains `Hash(Data_n + Hash_{n-1})`.
2.  **Immutability**: Any modification to a single vital sign or video frame breaks the chain instantly.
3.  **Real-time Alerts**: The frontend Sentinel View performs continuous "Look-ahead" verification, surfacing **Tampering Detected** warnings in <10ms if the integrity is compromised.

---

## ⚖️ License
This project was developed for the **GTBIT Hackathon**. All rights reserved.
