# 🛡️ Sentinel Flow | Autonomous DevSecOps CLI

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![GitLab API](https://img.shields.io/badge/GitLab_API-FC6D26?style=for-the-badge&logo=gitlab&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)
![Commander.js](https://img.shields.io/badge/Commander.js-000000?style=for-the-badge&logo=npm&logoColor=white)

**Sentinel Flow** is an autonomous DevSecOps CLI agent built for the **GitLab AI Challenge**. 

While traditional security scanners (SAST/DAST) only *flag* vulnerabilities, Sentinel Flow actually *fixes* them. Packaged as a globally installable NPM tool, developers can remediate critical security flaws (like SQL injections) directly from their terminal without leaving their IDE. Sentinel Flow rewrites the local file, commits the fix, and autonomously creates a ready-to-review GitLab Merge Request.

## ✨ Key Features

*   **💻 Zero-Context-Switching:** Runs entirely in the local terminal. Developers watch the vulnerable code rewrite itself in real-time inside their editor.
*   **🧠 LLM Remediation Engine:** Uses `gemini-2.5-flash` with strict prompting to return pure, production-ready code patches without conversational hallucination.
*   **🔄 Autonomous GitOps:** Uses `simple-git` to seamlessly branch, stage, commit, and push the remediated code to the remote repository.
*   **🦊 Native GitLab Integration:** Leverages the official `@gitbeaker/rest` SDK to instantly open a fully formatted Merge Request assigned for human review.

---

## 🏗️ How It Works (The Process)

1.  **Trigger:** The developer runs `sentinel heal <filename>` in their terminal.
2.  **Scan & Fix:** The CLI reads the local file and passes the vulnerable code to the AI. The AI returns the secured code (e.g., swapping raw SQL queries for parameterized queries).
3.  **Local Rewrite:** Sentinel Flow physically overwrites the local file on the developer's machine with the secure code.
4.  **GitLab Handoff:** The agent autonomously creates a new branch (e.g., `sentinel-heal-1712345678`), commits the change, pushes to the remote, and triggers the GitLab API to open an MR.

---

## 🚀 Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) installed on your machine.
*   A GitLab Personal Access Token (`glpat-`) with `api`, `read_repository`, and `write_repository` scopes.
*   A Google AI Studio (Gemini) API Key.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Sentinel-Flow.git
cd Sentinel-Flow
npm install
2. Environment Variables
Create a .env file in the root directory. (Do not commit this file to version control).
code
Env
# AI Engine
GEMINI_API_KEY="your_gemini_api_key_here"

# GitLab Authentication
GITLAB_TOKEN="glpat-your-token-here"
GITLAB_PROJECT_ID="your_numeric_project_id"
3. Install the CLI Globally
To make the sentinel command available anywhere on your machine, run:
code
Bash
npm link
🎮 Running the Demo
Open a vulnerable file in your code editor (e.g., server.js containing a raw SQL injection).
Open your terminal in the project directory and run the agent:
code
Bash
sentinel heal server.js
Watch the Execution:
The CLI will log the scanning and rewriting process.
The code inside your editor will update automatically.
The terminal will output a success message containing the live GitLab Merge Request URL.
Cmd+Click the URL to view the automated security patch in GitLab!
📜 License
Built for the 2026 GitLab AI Challenge. Open-sourced under the MIT License.