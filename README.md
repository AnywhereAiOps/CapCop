# **CapCop – AI Coding Assistant for VSCode Web by AnywhereAiOps**

## **What is CapCop?**
**CapCop** is an AI-powered assistant built specifically for **VSCode Web environments** like **GitHub Codespaces**, **VSCode for the Web**, and **self-hosted browser IDEs**. It brings advanced coding assistance to the cloud without requiring local system access.

Unlike traditional extensions, CapCop is optimized for **sandboxed environments**, ensuring **secure, permission-based actions** while delivering powerful AI-driven workflows.

---

## **Key Features**

### ✅ **Web-First Design**
- 100% compatible with **VSCode Web** and **Codespaces**.
- No local binaries or native dependencies required.
- Secure, browser-based execution with user approval for all actions.

### ✅ **AI-Powered Development**
- Understands your **project structure** and **source code**.
- Can **create and edit files** directly in your workspace.
- Provides **step-by-step reasoning** for complex tasks.

### ✅ **Context-Aware Assistance**
- Add context easily with:
  - `@file` – Attach file contents.
  - `@folder` – Attach entire folders.
  - `@url` – Fetch and convert docs to markdown.
  - `@problems` – Include workspace errors for quick fixes.

### ✅ **Command Execution (Web-Safe)**
- Runs commands in **integrated terminals** (where supported).
- For restricted environments, uses **simulated execution** or **cloud runners**.

### ✅ **Model Flexibility**
- Supports **OpenRouter**, **Anthropic**, **OpenAI**, **Gemini**, and any **OpenAI-compatible API**.
- Tracks **token usage** and **cost estimates** in real time.

### ✅ **Checkpoints & Restore**
- Automatic snapshots of your workspace during tasks.
- Compare changes and restore previous states safely.

---

## **Why CapCop?**
Most AI coding assistants fail in **browser-based IDEs** because they rely on local system access. CapCop solves this by:
- Using **web APIs** and **cloud integrations**.
- Providing a **human-in-the-loop** workflow for safety.
- Maintaining **full compatibility** with VSCode Web’s sandboxed environment.

---

## **Getting Started**
1. Install the extension from the https://marketplace.visualstudio.com/items?itemName=your-extension-id.
2. Configure your **API key** in the extension settings.
3. Open the **CapCop** panel from the command palette:  
   `CMD/CTRL + Shift + P → "CapCop: Open"`.
4. Start a new task and let the AI assist you.

---

## **Limitations**
- **No direct local file system access** (by design).
- **Terminal commands** may be limited in some web environments.
- **Browser automation** is simulated for security reasons.

---

## **Roadmap**
- ✅ Initial release with file editing and context injection.
- 🔜 Full **MCP support** for custom tools.
- 🔜 Cloud-based **command execution** for Codespaces.
- 🔜 Enhanced **browser automation** for web testing.

---

## **Contributing**
We welcome contributions! Check out our CONTRIBUTING.md for guidelines.

---

## **License**
./LICENSE

---