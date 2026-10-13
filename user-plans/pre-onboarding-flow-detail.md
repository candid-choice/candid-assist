# Onboarding Flow Detail

## Overview

The onboarding is a 3-step wizard that appears immediately after the user signs in for the first time. It connects Claude Code to Human Assist by:
1. Starting the MCP server
2. Configuring Claude Code to connect
3. Verifying the connection

## Step 1: MCP Server Running

**Trigger:** App launch after first sign-in.

**What happens:**
- App starts the MCP server on port 3613.
- If port is in use, tries 3614, 3615... up to 10 retries.
- Server logs the port to the console.

**UI:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Step 1 of 3: MCP Server Running                                    │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  You're all set — we started the Human Assist MCP server for          │
│  you. It's listening on this HTTP endpoint:                            │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │    ●  MCP server active                                            │  │
│  │    ────────────────────────────────────────────────────────────── │  │
│  │    http://localhost:3613/mcp                                       │  │
│  │    ────────────────────────────────────────────────────────────── │  │
│  │                                                                  │  │
│  │  Claude Code needs to connect to this endpoint to push           │  │
│  │  interactive surfaces to you.                                    │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ⚙  Connection Settings                                            │  │
│  │                                                                  │  │
│  │  MCP Server:         Human Assist                                  │  │
│  │  Protocol:           HTTP (JSON-RPC)                              │  │
│  │  Endpoint:        localhost:3613/mcp                             │  │
│  │  Auto-start:         Yes (on app launch)                         │  │
│  │  Visible to:         All Claude Code sessions                    │  │
│  │                                                                  │  │
│  │  [  Copy URL 3613/mcp  ]  [  View Connection Log → ]           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         [ ← Back ]       [  Next →  ]                                   │
└────────────────────────────────────────────────────────────────────────┘
```

**Key actions:**
- **Copy URL**: Copies `http://localhost:3613/mcp` to clipboard.
- **View Connection Log**: Opens a small panel with the last 10 lines of server logs (bind event, any errors).
- **Next**: Proceeds to Step 2.

**Failure scenarios:**
| Error | UI | Recovery |
|-------|-----|----------|
| Port 3613 in use | Banner: "Port in use — trying 3614..." | Server auto-retries. Shows the new port in the UI. |
| All ports blocked | Banner: "Connection failed — check firewall" | User must check firewall settings and retry. |
| Server fails to start | Banner: "Failed to start MCP server" | User must restart app or manually start server. |

## Step 2: Connect Claude Code

**Trigger:** User clicks "Next" on Step 1.

**What happens:**
- User edits `~/.claude/.mcp.json` to register the Human Assist MCP server.
- User copies the config snippet.
- User restarts Claude Code to apply changes.

**UI:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Step 2 of 3: Connect Claude Code                                    │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Edit ~/.claude/.mcp.json to register the Human Assist MCP             │
│  server. This lets Claude Code push interactive surfaces to           │
│  this app while it works.                                            │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  1. Open ~/.claude/.mcp.json in a text editor                    │  │
│  │  2. Add this entry (click below to copy):                        │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  "human-assist": {                                        │  │  │
│  │  │    "type": "http",                                        │  │  │
│  │  │    "url": "http://localhost:3613/mcp"                    │  │  │
│  │  │  }                                                         │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  📋 Copy to Clipboard                                     │  │  │
│  │  │                                                            │  │  │
│  │  │  (The URL is already filled in: localhost:3613/mcp)      │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  3. Restart Claude Code to apply changes                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         [ ← Back ]       [  Next →  ]                                   │
└────────────────────────────────────────────────────────────────────────┘
```

**Key actions:**
- **Copy to Clipboard**: Copies the config snippet to clipboard.
- **Next**: Proceeds to Step 3.

**Failure scenarios:**
| Error | UI | Recovery |
|-------|-----|----------|
| User can't find the config file | Tooltip: "Click here to open Finder" | Opens the config file location in Finder. |
| User can't edit the config file | Tooltip: "Check permissions" | User must run `chmod` or restart as admin. |
| User can't restart Claude Code | Tooltip: "Run 'pkill -f claude'" | User must kill the process manually. |

## Step 3: Verify the Connection

**Trigger:** User clicks "Next" on Step 2.

**What happens:**
- App checks whether Claude Code can now see the Human Assist server and reach it.
- App shows the expected output from Claude Code's terminal.
- User clicks "Yes, it's connected" or "No, show me what went wrong".

**UI:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Step 3 of 3: Verify the Bridge                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Claude Code should now list "human-assist" as one of its MCP         │
│  servers. Check your terminal output or Claude Code's MCP              │
│  status page.                                                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Expected output:                                                │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  MCP server 'human-assist' connected                       │  │  │
│  │  │    - Tools: 6 available                                    │  │  │
│  │  │    - URL: http://localhost:3613/mcp                        │  │  │
│  │  │    - Protocol: HTTP (JSON-RPC)                             │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Did you see it?                                                       │
│                                                                        │
│  [  No, show me what went wrong  ]   [  Yes, it's connected →  ]      │
└────────────────────────────────────────────────────────────────────────┘
```

**Key actions:**
- **Yes, it's connected**: Proceeds to Dashboard. Shows "All set! Claude Code can now reach you through Human Assist." toast.
- **No, show me what went wrong**: Opens troubleshooting panel.

**Troubleshooting Panel:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Troubleshooting: MCP Connection Failed                              │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Common issues and fixes:                                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Problem  1 — Claude Code is too old                           │  │
│  │  Fix: Claude Code < 0.4.0 does not support MCP.                 │  │
│  │  Update with: `brew upgrade anthropic`                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Problem  2 — Port 3613 already in use                           │  │
│  │  Fix: Human Assist tried to bind but failed.                     │  │
│  │  Check: lsof -i :3613                                            │  │
│  │  Fix: Restart Human Assist (it auto-retries on a new port)       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Problem  3 — Firewall or port blocked                           │  │
│  │  Fix: The MCP server listens on localhost:3613.                    │  │
│  │  Check that no firewall is blocking this port.                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         [ ← Back ]       [  I fixed it, try again →  ]               │
└────────────────────────────────────────────────────────────────────────┘
```

**Key actions:**
- **I fixed it, try again**: Re-runs Step 3.
- **Back**: Returns to Step 2.

**Failure scenarios:**
| Error | UI | Recovery |
|-------|-----|----------|
| User sees expected output | Clicks "Yes, it's connected" | Proceeds to Dashboard. |
| User doesn't see expected output | Clicks "No, show me what went wrong" | Shows troubleshooting panel. |
| User fixes issue | Clicks "I fixed it, try again" | Re-runs Step 3. |
| User can't fix issue | Clicks "← Back" | Returns to Step 2. |

## After Onboarding

- **Toast**: "All set! Claude Code can now reach you through Human Assist."
- **Navigate**: Dashboard (empty state, with a "Tell Claude to help you" prompt).
- **Surface**: No surfaces are active yet. User sees "Waiting for Claude" state.

## Edge Cases

1. **Offline onboarding** — If user has no internet during first launch, show "Check connection" state, cannot proceed past step 1.
2. **User quits during onboarding** — On reopen, user sees the last step they were on.
3. **User signs in on a different machine** — Onboarding resets, user must start over.
4. **Multiple workspaces** — Each workspace gets its own MCP server on its own port. User must configure each workspace separately.
5. **User already connected** — If user has already connected Claude Code, skip to Step 3.
