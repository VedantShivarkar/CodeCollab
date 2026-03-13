# 🚀 CollabCode

> **A Decentralized, Edge-Compute Collaborative IDE.**

CollabCode is not just another browser-based code editor. It is a highly optimized, peer-to-peer collaborative workspace that eliminates central server bottlenecks. By leveraging **Conflict-free Replicated Data Types (CRDTs)** over a **WebRTC Mesh Network**, CollabCode delivers sub-15ms latency for real-time collaboration, zero-cost scaling, and secure browser-level edge compute.

## ✨ Core Features

* ⚡ **Zero-Latency Peer-to-Peer Sync:** Real-time keystroke synchronization, live cursors, and team chat powered by `Yjs` and WebRTC Data Channels. No central WebSocket server required.
* 🛡️ **Edge-Compute Wasm Sandboxing:** Executes Python code directly inside the user's browser using **Pyodide (WebAssembly)**, ensuring zero-trust security and eliminating Remote Code Execution (RCE) backend vulnerabilities.
* 🔄 **60-FPS Live DOM Mirror:** Edits to HTML/CSS are rendered instantly across all peer devices in real-time without requiring a page refresh or compute cycle.
* 🎥 **Native P2P Video Conferencing:** Integrated picture-in-picture video and audio streaming using native HTML5 MediaDevices over the existing WebRTC mesh.
* 🤖 **AI AST Analysis:** Deep abstract syntax tree analysis and auto-refactoring powered by the Google Gemini AI model.
* 🔐 **Enterprise Authentication:** JWT-based secure routing and Row Level Security (RLS) powered by Supabase PostgreSQL.

## 🏗️ System Architecture

CollabCode shifts compute and state management to the Edge:
1. **Signaling Phase:** Peers discover each other via a lightweight WebSocket signaling server exchanging Session Description Protocol (SDP) offers.
2. **Data Tunneling:** Once connected, the server is bypassed. All code changes (CRDT operations), chat messages, and video frames travel over SCTP/UDP directly between clients.
3. **Execution Layer:** JavaScript is executed via the native V8 engine, Python via Wasm/Pyodide, and compiled languages (C++, Java) are securely routed to remote isolated containers.

## 💻 Tech Stack

* **Frontend:** Next.js 14, React, Tailwind CSS, Lucide Icons
* **Editor Core:** Monaco Editor (`@monaco-editor/react`)
* **Collaboration Engine:** Yjs, `y-webrtc`, `y-monaco`
* **Execution Engines:** Pyodide (Wasm), Browser Native (JS), Piston API (C++, Java)
* **Backend & Auth:** Supabase (PostgreSQL), Next.js App Router API
* **AI Engine:** Google Gemini Flash

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/your-username/CollabCode.git
cd CollabCode/frontend
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Environment Variables
Create a \`.env.local\` file in the root directory and add your keys:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
\`\`\`

### 4. Start the WebRTC Signaling Server
CollabCode requires a local signaling server to establish the initial peer-to-peer handshake. Open a separate terminal and run:
\`\`\`bash
npx y-webrtc-signaling
\`\`\`
*(This runs on port 4444 by default).*

### 5. Run the Application
\`\`\`bash
npm run dev
\`\`\`
Navigate to \`http://localhost:3000\`. You will be redirected to the secure login gateway.

## 🛡️ Security Posture

* **Data in Transit:** All peer-to-peer data channels and media streams are End-to-End Encrypted (E2EE) using DTLS and SRTP.
* **Execution:** Client-side execution sandboxes prevent backend infrastructure attacks.
* 
Team Members :
  1.Vedant Shivarkar(Team Lead)
  2.Ishika Sakhare
  3.Harshal Mohadikar
  4.Vansh Meshram

---
*Designed and engineered for maximum performance at the Edge.*
