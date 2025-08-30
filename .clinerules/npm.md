
### 🔧 **Cline AI Rule: npm Usage with User Input**

**Rule Name:** `npm-user-input-handling`  
**Description:** Ensure npm commands that require user interaction are executed non-interactively using input piping.

#### ✅ Recommended Pattern
Use `echo` to simulate user input when running npm commands that prompt for interaction.

```bash
echo q | npm test
```

#### 🧠 Why This Matters
Cline operates in terminal execution mode and may hang or fail if a command expects user input. Piping input ensures smooth automation and compatibility with Cline's Act mode.

#### 📌 Additional Examples
```bash
echo yes | npm run setup
echo n | npm audit fix
```

#### 🚫 Avoid
```bash
npm test  # May hang if it waits for input
```

#### 🛠 Integration Tip
When scripting with Cline in Act mode, always preemptively handle interactive prompts using `echo`, `yes`, or `printf` as needed.

---
