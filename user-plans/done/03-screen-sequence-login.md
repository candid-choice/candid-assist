## 2. Onboarding — Connect Claude Code to Human Assist

**Trigger:** First-time user after successful sign-in.

Human Assist **starts the MCP server for you** on a dedicated port the moment the app launches. The onboarding walks the user through one step: **notifying** them what HTTP endpoint the server is listening on, then **connecting** Claude Code to it by editing `.mcp.json` manually.

### Step 1 of 3 — Human Assist MCP Server Is Running

This screen appears immediately after sign-in — the app has already started listening.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1 of 3: MCP Server Running                              │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  You're all set — we started the Human Assist MCP server for     │
│  you. It's listening on this HTTP endpoint:                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │    ●  MCP server active                                    │  │
│  │    ──────────────────────────────────────────────────────  │  │
│  │    http://localhost:3613/mcp                               │  │
│  │    ──────────────────────────────────────────────────────  │  │
│  │                                                            │  │
│  │    Claude Code can now reach you via this URL.               │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Claude Code needs to connect to this endpoint to push           │
│  interactive surfaces to you. Next, you'll connect Claude        │
│  Code to it.                                                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ⚙  Connection Settings                                    │  │
│  │                                                            │  │
│  │  MCP Server:         Human Assist                          │  │
│  │  Protocol:           HTTP (JSON-RPC)                         │  │
│  │  Endpoint:        localhost:3613/mcp                       │  │
│  │  Auto-start:         Yes (on app launch)                   │  │
│  │  Visible to:         All Claude Code sessions              │  │
│  │                                                            │  │
│  │  [  Copy URL 3613/mcp  ]  [  View Connection Log → ]     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│         [ ← Back ]       [  Next →  ]                             │
└──────────────────────────────────────────────────────────────────┘
```

**Key details:**
- The HTTP endpoint is displayed prominently — the user needs this for Step 2
- "Copy URL" copies `http://localhost:3613/mcp` to clipboard
- "View Connection Log" opens a small panel with the last 10 lines of server logs (bind event, any errors)

---

### Step 2 of 3 — Connect Claude Code

Now the user connects Claude Code to the Human Assist server.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 2 of 3: Connect Claude Code                             │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Edit ~/.claude/.mcp.json to register the Human Assist MCP       │
│  server. This lets Claude Code push interactive surfaces to      │
│  this app while it works.                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  1. Open ~/.claude/.mcp.json in a text editor               │  │
│  │  2. Add this entry (click below to copy):                  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  "human-assist": {                                    │  │  │
│  │  │    "type": "http",                                    │  │  │
│  │  │    "url": "http://localhost:3613/mcp"               │  │  │
│  │  │  }                                                     │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  📋 Copy to Clipboard  [  ]  [  ]                 │  │  │
│  │  │                                                        │  │  │
│  │  │  (The URL is already filled in: localhost:3613/mcp)  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  3. Restart Claude Code to apply changes                   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│         [ ← Back ]       [  Next →  ]                             │
└──────────────────────────────────────────────────────────────────┘
```

After Step 2, the user returns to their terminal, edits the config, restarts Claude Code, then comes back and clicks **Next**.

---

### Step 3 of 3 — Verify the Connection

The app checks whether Claude Code can now see the Human Assist server and reach it.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 3 of 3: Verify the Bridge                               │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Claude Code should now list "human-assist" as one of its MCP    │
│  servers. Check your terminal output or Claude Code's MCP        │
│  status page.                                                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Expected output:                                          │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  MCP server 'human-assist' connected                │  │  │
│  │  │    - Tools: 6 available                              │  │  │
│  │  │    - URL: http://localhost:3613/mcp                  │  │  │
│  │  │    - Protocol: HTTP (JSON-RPC)                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Did you see it?                                                  │
│                                                                  │
│  [  No, show me what went wrong  ]   [  Yes, it's connected →  ] │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

If the user clicks **"No, show me what went wrong"**, a troubleshooting panel slides in:

```
┌──────────────────────────────────────────────────────────────────┐
│  Troubleshooting: MCP Connection Failed                       │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Common issues and fixes:                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Problem  1 — Claude Code is too old                       │  │
│  │  Fix: Claude Code < 0.4.0 does not support MCP.           │  │
│  │  Update with: `brew upgrade anthropic`                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Problem  2 — Port 3613 already in use                     │  │
│  │  Fix: Human Assist tried to bind but failed.                │
│  │  Check: lsof -i :3613                                       │
│  │  Fix: Restart Human Assist (it auto-retries on a new port)  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Problem  3 — Firewall or port blocked                     │  │
│  │  Fix: The MCP server listens on localhost:3613.              │  │
│  │  Check that no firewall is blocking this port.               │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│         [ ← Back ]       [  I fixed it, try again →  ]          │
└──────────────────────────────────────────────────────────────────┘
```

### After onboarding — toast + navigate

- Toast: "All set! Claude Code can now reach you through Human Assist."
- Navigate to Dashboard (empty state, with a "Tell Claude to help you" prompt).
