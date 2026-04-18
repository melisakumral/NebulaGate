# 🛡️ NebulaGate: Next-Gen Web3 Security Gateway

**NebulaGate** is a decentralized identity verification and bot-defense protocol built on the **Stellar Soroban** network. It bridges the gap between traditional browser security and blockchain accountability using the innovative **x402 (Payment Required)** protocol and AI-driven fingerprinting analysis.

---

## 🚀 Key Features

* **AI-Driven Fingerprinting:** Analyzes 22+ hardware and browser signals (Canvas, WebGL, AudioContext, etc.) to distinguish genuine users from sophisticated bots in real-time.
* **x402 Bot Defense:** Instead of binary blocking, suspicious sessions are challenged with a micro-payment (0.1 XLM) requirement, making large-scale bot attacks economically unfeasible.
* **Hybrid On-Chain Identity:** Users create secure profiles with a **Display Name** and a **Master PIN**. To ensure maximum privacy, only the **SHA-256 hash** of the PIN is stored on the Soroban ledger.
* **Subscription Model:** A native Soroban-based membership system allowing users to subscribe for 5 XLM/month to bypass per-scan micro-payments and gain "Premium" status.
* **Privacy-First Audit Logs:** Users can only view their own on-chain attestation history, ensuring data privacy while maintaining full transparency.

---

## 🛠️ Technical Stack

| Component | Technology |
| :--- | :--- |
| **Blockchain** | Stellar Soroban (Rust Smart Contracts) |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Identity** | Freighter Wallet API + On-Chain User Profiles |
| **Security** | SHA-256 Hashing, Client-Side Heuristic Engine |
| **Styling** | Framer Motion (Animations), Lucide Icons |

---

## 🏛️ Project Architecture

NebulaGate operates on a multi-layered defense mechanism:
1.  **Client-Side Audit:** Gathers hardware signals and renders silent graphics/audio to generate a unique digital signature.
2.  **Heuristic Risk Engine:** Assigns a risk score (0-100) based on detected anomalies (e.g., Headless Chrome, VM traces).
3.  **On-Chain Validation:**
    * **Verified (Score > 70):** Immediate access granted.
    * **Suspicious (Score 30-70):** Triggers Stellar **x402 Payment Challenge**.
    * **Bot Detected (Score < 30):** Access Denied.
    * **Subscribers:** Bypass all checks via whitelist validation.

---

## 📦 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/MelisaKumral/NebulaGate.git](https://github.com/MelisaKumral/NebulaGate.git)
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run development server:**
    ```bash
    npm run dev
    ```
4.  **Connect Wallet:** Ensure **Freighter Wallet** is installed and set to **Stellar Testnet**.


---

### 🛡️ Security Disclaimer
<img width="1666" height="827" alt="image" src="https://github.com/user-attachments/assets/23b58519-053c-4f51-ba31-c9ccb6db975f" />

Users' private keys (Secret Keys) are never shared with NebulaGate. All on-chain transactions are securely signed via the Freighter wallet with explicit user consent.
## 📺 Live Demo
[![NebulaGate Project Demo](https://cdn.loom.com/sessions/thumbnails/31e83e27eea4450db13198597d906851-with-play.gif)](https://www.loom.com/share/31e83e27eea4450db13198597d906851)

*Click the image above to watch the full project walkthrough.*
